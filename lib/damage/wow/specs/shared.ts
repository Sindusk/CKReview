// lib/damage/wow/specs/shared.ts
//
// Building blocks for the WoW spec checks (docs/archive/damage-analysis-plan.md,
// "WoW build order" step 6). Same role as lib/damage/ffxiv/jobs/shared.ts,
// whose game-neutral parts (statusWindows, castsIn, the number formats) are
// reused; these replace the parts that lean on FFLogs (the hit multiplier,
// fixed 3s DoT ticks). Every value is measured from the pull itself.
//
// ── Burst windows (burstGcdFindings) ───────────────────────────────────
// A window is the player's own buff (apply → remove, player-buff stream).
// GCDs that fit = the window's length ÷ the player's GCD at that time, less
// one (the window rarely starts on a GCD boundary). Each GCD short is
// valued at the player's average GCD × the window's bonus: only the bonus
// part, because the gap itself is already a GCD-gap finding. The bonus
// comes from the spec (measured per window where possible).
//
// ── DoT uptime (dotUptimeFindings) ─────────────────────────────────────
// The player's DoT on any enemy (Pull.bossDebuffs), from its first
// application, less forced time; gaps under one GCD + 1s are ignored (time
// to reapply). Lost = the gap × the DoT's own damage per second of uptime
// over the pull (WoW ticks are hasted, so no fixed tick length).
//
// ── Resource cap (resourceCapFindings) ─────────────────────────────────
// WCL logs a resource on a cast as its amount before the cast (types/
// PlayerInfo.ts `resources`). A cast that doesn't spend it, made at the
// resource's max, generated into a full bar: what it would have added is
// lost. Each ability's gain is measured from the pull: the amount on the
// next cast (within 3s) minus this cast's amount after its cost, median
// over casts that weren't near the cap. Lost = units wasted × the player's
// damage per unit from the resource's spenders.
// The measured gain includes regen between the two casts, so for Energy it
// runs high (Subtlety's Energy-cap estimate; from docs/open-items.md
// 2026-10-15).

import type { DamageFinding, Moment } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { forcedPart, gcdLockMs, inWindows, mergeWindows, overlapMs, type Window } from "../../timeline";
import { k, s, statusWindows } from "../../ffxiv/jobs/shared";

export { k, s, statusWindows };

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

// ── Burst windows ──────────────────────────────────────────────────────

export type BurstGcdSpec = {
  statusId:   number;
  name:       string;
  bonus(ctx: PlayerCheckContext, w: Window): number;  // 0.2 = +20%
  bonusBasis: string;
  inference?: boolean;
};

export function burstGcdFindings(ctx: PlayerCheckContext, spec: BurstGcdSpec): DamageFinding[] {
  const out: DamageFinding[] = [];
  for (const w of statusWindows(ctx, spec.statusId)) {
    if (w.endMs > ctx.endMs) continue;
    const gcdMs = ctx.baseGcdMs / ctx.factor * ctx.factorAt(w.startMs);
    // Time a channel, cast or flight held the player past one GCD isn't
    // room for another GCD: Devastation's Disintegrates lock 1.3–1.8s
    // against a 0.97s GCD, and Bragontix's 0:03 Dragonrage (qpZx3mWaG7gcDdYB
    // pull 3), with almost no idle, read 26 of 34.
    const inside = ctx.uses.filter((u) => u.startMs >= w.startMs && u.startMs <= w.endMs);
    const heldMs = inside.reduce((a, u) => {
      const g = ctx.baseGcdMs / ctx.factor * ctx.factorAt(u.startMs);
      return a + Math.max(0, Math.min(u.startMs + gcdLockMs(u, ctx.factorAt(u.startMs)), w.endMs) - u.startMs - g);
    }, 0);
    const fit = Math.max(0, Math.floor((w.endMs - w.startMs - heldMs) / gcdMs) - 1);
    const got = inside.length;
    const missing = fit - got;
    if (missing <= 0) continue;
    const bonus = spec.bonus(ctx, w);
    const value = ctx.values.gcdValue(ctx.phaseOf(w.startMs), inWindows(w.startMs, ctx.buffWindows));
    const forced = forcedPart(w.startMs, w.endMs, ctx.forced);
    out.push(finding(ctx, {
      kind: "burst-window", startMs: w.startMs, endMs: w.endMs,
      forced: forced.ms >= 1_500, cause: forced.ms >= 1_500 ? forced.cause : undefined,
      label: `${spec.name} window`,
      lostDamage: missing * value * bonus,
      inference: spec.inference,
      basis: `${missing} GCD${missing > 1 ? "s" : ""} short × ${k(value)} average GCD × ${Math.round(bonus * 100)}% (${spec.bonusBasis})`,
      detail: `${spec.name} at ${clock(w.startMs)}: ${got} of ${fit} GCDs that fit`,
    }));
  }
  return out;
}

/**
 * A window's damage bonus read from the hits themselves: for each ability
 * hit both inside and outside the window, the median unmitigatedAmount of
 * its non-crit hits inside ÷ outside, weighted by hits inside. 0 when there's
 * nothing to compare. Capped at OBSERVED_BONUS_CAP: everything lined up with
 * the window (trinkets, potions, lust-aligned procs) reads as its bonus too;
 * Sentinel measured +118% uncapped on nRGxQ1b8LdMvzC4D pull 6.
 */
export function observedWindowBonus(ctx: PlayerCheckContext, w: Window): number {
  const by = new Map<number, { inside: number[]; outside: number[] }>();
  for (const e of ctx.player.damageDone) {
    if (e.pet || e.isDoT || e.hitType !== 1 || !e.unmitigatedAmount) continue;
    const g = by.get(e.abilityId) ?? { inside: [], outside: [] };
    (e.timestamp >= w.startMs && e.timestamp <= w.endMs ? g.inside : g.outside).push(e.unmitigatedAmount);
    by.set(e.abilityId, g);
  }
  const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  let sum = 0, n = 0;
  for (const g of by.values()) {
    if (g.inside.length === 0 || g.outside.length < 3) continue;
    sum += (med(g.inside) / med(g.outside) - 1) * g.inside.length;
    n += g.inside.length;
  }
  return n > 0 ? Math.min(OBSERVED_BONUS_CAP, Math.max(0, sum / n)) : 0;
}

const OBSERVED_BONUS_CAP = 0.3;

// ── DoT uptime ─────────────────────────────────────────────────────────

export function dotUptimeFindings(ctx: PlayerCheckContext, spec: { statusIds: number[]; name: string }): DamageFinding[] {
  const ids = new Set(spec.statusIds);
  const events = (ctx.pull.bossDebuffs ?? [])
    .filter((e) => ids.has(e.statusId) && e.sourceName === ctx.player.name && e.timestamp < ctx.endMs)
    .sort((a, b) => a.timestamp - b.timestamp);
  if (events.length === 0) return [];
  const windows: Window[] = [];
  const open = new Map<string, number>();
  for (const e of events) {
    const key = `${e.targetActorId}.${e.targetInstance ?? 1}`;
    if (e.status === "removed") {
      const st = open.get(key);
      if (st !== undefined) { windows.push({ startMs: st, endMs: e.timestamp }); open.delete(key); }
    } else if (!open.has(key)) open.set(key, e.timestamp);
  }
  for (const st of open.values()) windows.push({ startMs: st, endMs: ctx.endMs });
  const active = mergeWindows(windows);
  const upMs = active.reduce((a, w) => a + Math.min(w.endMs, ctx.endMs) - w.startMs, 0);
  const dotDamage = ctx.player.damageDone.filter((e) => !e.pet && e.isDoT && ids.has(e.abilityId)).reduce((a, e) => a + (e.amount ?? 0), 0);
  const perMs = upMs > 0 ? dotDamage / upMs : 0;
  const forced = mergeWindows(ctx.forced);
  const grace = ctx.baseGcdMs + 1_000;
  const out: DamageFinding[] = [];
  let cursor = active[0].startMs;
  for (const w of [...active, { startMs: ctx.endMs, endMs: ctx.endMs }]) {
    if (w.startMs > cursor) {
      const len = w.startMs - cursor - overlapMs(cursor, w.startMs, forced);
      if (len >= grace) {
        out.push(finding(ctx, {
          kind: "dot-uptime", startMs: cursor, endMs: w.startMs, forced: false,
          label: `${spec.name} off the boss`,
          lostDamage: len * perMs,
          basis: `${s(len)} × ${k(perMs * 1000)}/s (${spec.name}'s damage per second of uptime this pull)`,
          detail: `${spec.name} wasn't on any enemy for ${s(len)}`,
        }));
      }
    }
    cursor = Math.max(cursor, w.endMs);
  }
  return out;
}

// ── Cast-time procs wasted ─────────────────────────────────────────────
// A stacking buff that shortens the next casts (Destruction's Backdraft:
// Conflagrate adds a stack, each Chaos Bolt / Incinerate / Soul Fire takes
// one). A stack is wasted when the generator is pressed at max stacks, or
// when the buff drops with no consumer landing beside it (outside forced
// time). Each wasted stack is worth the cast time it would have saved,
// measured from the player's own begin-casts (median with the buff − without,
// per consumer), × their damage per GCD-second. Inference: the saved time
// would have gone into more casts.
// Buff stack counts come from the events: WCL buffs carry no count on the
// PlayerEvent, so applied = 1, stack = +1, stackRemoved = −1.

export type CastTimeProcSpec = {
  statusId:     number;
  name:         string;
  maxStacks:    number;
  generatorIds: number[];
  consumerIds:  number[];
};

const PROC_PAIR_MS = 300;

export function castTimeProcFindings(ctx: PlayerCheckContext, spec: CastTimeProcSpec): DamageFinding[] {
  const buffs = (ctx.player.buffs ?? []).filter((e) => e.abilityId === spec.statusId && e.timestamp < ctx.endMs)
    .sort((a, b) => a.timestamp - b.timestamp);
  if (buffs.length === 0) return [];
  const consumers = new Set(spec.consumerIds), generators = new Set(spec.generatorIds);
  const consumeTimes = ctx.player.casts.filter((c) => consumers.has(c.abilityId)).map((c) => c.timestamp);
  const stacksBefore = (t: number) => {
    let st = 0;
    for (const e of buffs) {
      if (e.timestamp >= t) break;
      if (e.buffStatus === "applied") st = 1;
      else if (e.buffStatus === "stack") st = Math.min(spec.maxStacks, st + 1);
      else if (e.buffStatus === "stackRemoved") st = Math.max(0, st - 1);
      else if (e.buffStatus === "removed") st = 0;
    }
    return st;
  };
  const forced = mergeWindows(ctx.forced);

  // What one stack saves, measured.
  const begins = ctx.player.beginCasts ?? [];
  const savings: { saved: number; n: number }[] = [];
  for (const id of spec.consumerIds) {
    const withBuff: number[] = [], without: number[] = [];
    for (const b of begins) {
      if (b.abilityId !== id || !b.durationMs) continue;
      (stacksBefore(b.timestamp + 1) > 0 ? withBuff : without).push(b.durationMs);
    }
    if (withBuff.length < 3 || without.length < 3) continue;
    const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    const saved = med(without) - med(withBuff);
    if (saved > 0) savings.push({ saved, n: withBuff.length });
  }
  const totalN = savings.reduce((a, x) => a + x.n, 0);
  if (totalN === 0) return [];
  const savedMs = savings.reduce((a, x) => a + x.saved * x.n, 0) / totalN;

  const wasted: { t: number; stacks: number; how: string }[] = [];
  for (const c of ctx.player.casts) {
    if (!generators.has(c.abilityId) || c.timestamp >= ctx.endMs || inWindows(c.timestamp, forced)) continue;
    // A consumer landing at the same instant takes a stack first (Chaos Bolt
    // and a queued Conflagrate share a timestamp).
    const sameInstant = consumeTimes.filter((t) => Math.abs(t - c.timestamp) <= 50).length;
    if (stacksBefore(c.timestamp) - sameInstant >= spec.maxStacks) wasted.push({ t: c.timestamp, stacks: 1, how: "overcap" });
  }
  for (const e of buffs) {
    if (e.buffStatus !== "removed" || inWindows(e.timestamp, forced)) continue;
    if (consumeTimes.some((t) => Math.abs(t - e.timestamp) <= PROC_PAIR_MS)) continue;
    wasted.push({ t: e.timestamp, stacks: Math.max(1, stacksBefore(e.timestamp)), how: "expired" });
  }
  if (wasted.length === 0) return [];
  wasted.sort((a, b) => a.t - b.t);
  const stacks = wasted.reduce((a, w) => a + w.stacks, 0);
  const perMs = ctx.values.gcdValue(undefined, false) / ctx.baseGcdMs;
  const over = wasted.filter((w) => w.how === "overcap"), exp = wasted.filter((w) => w.how === "expired");
  const list = (ws: typeof wasted) => ws.map((w) => clock(w.t)).join(", ");
  return [finding(ctx, {
    kind: "proc-lost", startMs: wasted[0].t, endMs: wasted[wasted.length - 1].t, forced: false,
    label: `${spec.name} wasted`,
    lostDamage: stacks * savedMs * perMs,
    inference: true,
    basis: `${stacks} stack${stacks > 1 ? "s" : ""} × ${(savedMs / 1000).toFixed(2)}s cast time each (median with ${spec.name} − without, from the player's casts) × ${k(perMs * 1000)} per second of GCD time`,
    detail: [over.length ? `${over.length} overcapped (${list(over)})` : "", exp.length ? `${exp.length} expired (${list(exp)})` : ""].filter(Boolean).join(", "),
  })];
}

// ── Cooldowns recharged by spending a resource ─────────────────────────
// Arms' Avatar and Colossus Smash come back faster the more Rage is spent
// (measured on three Arms Warriors, qpZx3mWaG7gcDdYB / NK1hBtW9rckdjq36,
// 2026-10-13: Avatar 90s − 1s per 20 Rage, Colossus Smash 45s − 1s per 20;
// Eroka's Avatar after 650 Rage: 57.5s predicted, 57.5s actual). A fixed
// recast can't judge them (tracked-cooldowns.ts leaves them out), so after
// each cast the next ready time is simulated from the player's own spends:
// the first moment elapsed time + spent ÷ perUnit seconds reaches baseMs.
// Held = ready → next cast, less forced time and a short allowance; lost
// uses = held ÷ the player's average actual recharge. A use is worth the
// cooldown's window bonus read from the player's hits (observedWindowBonus,
// per window, averaged) × their damage rate outside the windows × the
// average window. Inference: the recharge rule and the window's value are
// both measured, not known.
// The same check takes a fixed reduction per event instead (`reduceOn`):
// Elemental's Stormkeeper is 60s less 3s per Ancestor summoned (Offering
// From Beyond; docs/wowa-audit/shaman-elemental.md, measured on seven top
// parses 2026-10-16: never back sooner, usually pressed ~1.8s after).
// Ready time inside the context's cooldownHoldWindows isn't held (Vashnik:
// the top players keep Stormkeeper for the Venom burst after Imbibe). A
// window buff seen before the first cast means it was cast before the pull.

export type SpentCooldownSpec = {
  name:          string;
  actionIds:     number[];
  baseMs:        number;
  // Recharged by spending a resource...
  resourceType?:  number;    // WCL classResources type (1 Rage)
  scale?:         number;    // logged units per displayed unit (Rage ×10)
  unitsPerSecond?: number;   // displayed units spent per 1s of recharge
  // ...or by a fixed amount each time the player's own buff is applied or stacks.
  reduceOn?:     { buffId: number; ms: number; label: string };
  firstUseOffsetMs: number;
  // The window buff before the first cast means a cast before the pull.
  prePullFromBuff?: boolean;
  // One use's worth when the window bonus can't read it (Stormkeeper's buff
  // is spent at the cast, so its hits don't carry it): overrides the window.
  valuePerUse?(ctx: PlayerCheckContext): { value: number; basis: string } | undefined;
  // The cooldown's effect window, for its value: the player's own buff,
  // or a debuff the player puts on enemies.
  window: { buffId: number } | { debuffId: number };
};

const SPENT_HOLD_MS = 3_000;

export function spentCooldownDrift(ctx: PlayerCheckContext, spec: SpentCooldownSpec): DamageFinding[] {
  const ids = new Set(spec.actionIds);
  const casts = ctx.player.casts.filter((c) => ids.has(c.abilityId) && c.timestamp < ctx.endMs).map((c) => c.timestamp).sort((a, b) => a - b);
  if (casts.length < 2) return [];
  const own = (ctx.player.buffs ?? []).filter((b) => b.source === ctx.player.name);
  const windowBuff = "buffId" in spec.window ? spec.window.buffId : undefined;
  const prePull = spec.prePullFromBuff === true && windowBuff !== undefined && own.some((b) => b.abilityId === windowBuff && b.timestamp < casts[0]);
  if (prePull) casts.unshift(0);
  // Each reduction: when it happened and how much recharge it's worth (ms).
  const reductions = spec.reduceOn
    ? own.filter((b) => b.abilityId === spec.reduceOn!.buffId && (b.buffStatus === "applied" || b.buffStatus === "stack"))
        .map((b) => ({ t: b.timestamp, ms: spec.reduceOn!.ms }))
    : ctx.player.casts
        .map((c) => ({ t: c.timestamp, ms: (c.resources?.find((r) => r.type === spec.resourceType)?.cost ?? 0) / spec.scale! * 1000 / spec.unitsPerSecond! }))
        .filter((x) => x.ms > 0);
  reductions.sort((a, b) => a.t - b.t);
  const readyAfter = (t: number) => {
    let reduced = 0;
    for (const s of reductions) {
      if (s.t <= t) continue;
      if (s.t - t + reduced >= spec.baseMs) break;
      reduced += s.ms;
    }
    return Math.max(t, t + spec.baseMs - reduced);
  };
  const forced = mergeWindows(ctx.forced);
  const notHeld = mergeWindows([...ctx.forced, ...(ctx.context?.cooldownHoldWindows?.(ctx.pull) ?? [])]);
  const stretches: Window[] = prePull ? [] : [{ startMs: spec.firstUseOffsetMs, endMs: casts[0] }];
  const recharges: number[] = [];
  for (let i = 0; i < casts.length; i++) {
    const ready = readyAfter(casts[i]);
    recharges.push(ready - casts[i]);
    stretches.push({ startMs: ready, endMs: casts[i + 1] ?? ctx.endMs });
  }
  let held = 0;
  let longest: Window | undefined, longestHeld = 0;
  for (const w of stretches) {
    if (w.endMs <= w.startMs) continue;
    const h = Math.max(0, w.endMs - w.startMs - overlapMs(w.startMs, w.endMs, notHeld) - SPENT_HOLD_MS);
    held += h;
    if (h > longestHeld) { longestHeld = h; longest = w; }
  }
  const avgRecharge = recharges.reduce((a, x) => a + x, 0) / recharges.length;
  const lost = Math.floor(held / avgRecharge);
  if (lost < 1 || !longest) return [];
  const detail = `${spec.name} sat ready for ${s(held)} in total (${casts.length} uses${prePull ? ", one before the pull" : ""}; recharge ${s(spec.baseMs)} − ${spec.reduceOn ? spec.reduceOn.label : `1s per ${spec.unitsPerSecond} spent`}, ${s(avgRecharge)} on average here): about ${lost} use${lost > 1 ? "s" : ""} lost`;
  if (spec.valuePerUse) {
    const v = spec.valuePerUse(ctx);
    if (!v || v.value <= 0) return [];
    return [finding(ctx, {
      kind: "cooldown-drift", startMs: longest.startMs, endMs: longest.endMs, forced: false,
      label: `${spec.name} drift`, lostDamage: lost * v.value, inference: true,
      basis: `${lost} use${lost > 1 ? "s" : ""} × ${v.basis}`, detail,
    })];
  }

  // What one use is worth.
  const wins: Window[] = "buffId" in spec.window
    ? statusWindows(ctx, spec.window.buffId)
    : mergeWindows((() => {
        const id = (spec.window as { debuffId: number }).debuffId;
        const out: Window[] = []; const open = new Map<string, number>();
        for (const e of (ctx.pull.bossDebuffs ?? []).filter((x) => x.statusId === id && x.sourceName === ctx.player.name).sort((a, b) => a.timestamp - b.timestamp)) {
          const key = `${e.targetActorId}.${e.targetInstance ?? 1}`;
          if (e.status === "removed") { const s0 = open.get(key); if (s0 !== undefined) { out.push({ startMs: s0, endMs: e.timestamp }); open.delete(key); } }
          else if (!open.has(key)) open.set(key, e.timestamp);
        }
        return out;
      })());
  const inside = wins.filter((w) => w.endMs <= ctx.endMs && w.endMs > w.startMs);
  if (inside.length === 0) return [];
  const bonus = inside.reduce((a, w) => a + observedWindowBonus(ctx, w), 0) / inside.length;
  const avgLen = inside.reduce((a, w) => a + w.endMs - w.startMs, 0) / inside.length;
  const excluded = mergeWindows([...forced, ...inside]);
  const outsideMs = ctx.endMs - overlapMs(0, ctx.endMs, excluded);
  const outsideDmg = ctx.player.damageDone
    .filter((e) => e.timestamp < ctx.endMs && !inWindows(e.timestamp, excluded))
    .reduce((a, e) => a + (e.amount ?? 0), 0);
  const perUse = bonus * avgLen * (outsideMs > 0 ? outsideDmg / outsideMs : 0);
  if (perUse <= 0) return [];
  return [finding(ctx, {
    kind: "cooldown-drift", startMs: longest.startMs, endMs: longest.endMs, forced: false,
    label: `${spec.name} drift`,
    lostDamage: lost * perUse,
    inference: true,
    basis: `${lost} use${lost > 1 ? "s" : ""} × ${s(avgLen)} window × ${Math.round(bonus * 100)}% bonus (read from the player's hits) × ${k(outsideDmg / outsideMs * 1000)}/s outside it`,
    detail,
  })];
}

// ── Resource logged on spenders only ───────────────────────────────────
// Holy Power (type 9) is logged only on the casts that spend it: the
// amount before the spend and the cost. Between two costed spends, the
// gain is known (next amount − what the last spend left); the builders
// pressed between say what it should have been. Gain per builder is fitted
// on the intervals that ended under the cap (nothing can be lost there),
// non-negative least squares, so untracked sources (Art of War procs,
// Crusading Strikes' every-other-swing) land in the fitted gains. In an
// interval that ended at the cap, predicted − observed was lost.
// Checked against WoWAnalyzer (2026-10-13): Polpo (qpZx3mWaG7gcDdYB) 33.5%
// vs its 41.9%, the 99th-percentile Yenvenger (ACmXHMFtaPLR9k8w) 10.4% vs
// 12.9%: ~80% of its figure for both, same order. Value: the units lost ×
// the player's damage per unit spent (spender damage × the costed share
// of spender casts, so free procs don't inflate it ÷ units spent).
// Inference. Needs MIN_FIT_INTERVALS uncapped intervals.

const MIN_FIT_INTERVALS = 15;

export function spenderSnapshotWaste(ctx: PlayerCheckContext, spec: { type: number; name: string }): DamageFinding[] {
  const casts = ctx.player.casts.filter((c) => !c.fake && c.timestamp < ctx.endMs).sort((a, b) => a.timestamp - b.timestamp);
  const res = (c: (typeof casts)[number]) => c.resources?.find((r) => r.type === spec.type);
  const spends = casts.filter((c) => (res(c)?.cost ?? 0) > 0);
  if (spends.length < 20) return [];
  const max = res(spends[0])!.max;
  const spenderNames = new Set(spends.map((c) => c.abilityName));
  const builders = [...new Set(casts.filter((c) => !spenderNames.has(c.abilityName)).map((c) => c.abilityName))];
  const rows = spends.slice(0, -1).map((a, i) => {
    const b = spends[i + 1];
    const between = casts.filter((c) => c.timestamp > a.timestamp && c.timestamp < b.timestamp);
    return {
      x: builders.map((n) => between.filter((c) => c.abilityName === n).length),
      gain: res(b)!.amount - (res(a)!.amount - res(a)!.cost!),
      capped: res(b)!.amount >= max, t: b.timestamp,
    };
  });
  const fitRows = rows.filter((r) => !r.capped);
  if (fitRows.length < MIN_FIT_INTERVALS) return [];
  const g = builders.map(() => 0.5);
  for (let it = 0; it < 300; it++) {
    for (let j = 0; j < g.length; j++) {
      let num = 0, den = 0;
      for (const r of fitRows) {
        if (!r.x[j]) continue;
        const rest = r.x.reduce((acc, v, k) => acc + (k === j ? 0 : v * g[k]), 0);
        num += r.x[j] * (r.gain - rest); den += r.x[j] * r.x[j];
      }
      g[j] = den > 0 ? Math.max(0, Math.min(max, num / den)) : 0;
    }
  }
  const forced = mergeWindows(ctx.forced);
  let generated = 0, lost = 0, n = 0, first = Infinity, last = 0;
  const wasted: { t: number; w: number }[] = [];
  for (const r of rows) {
    const pred = r.x.reduce((acc, v, k) => acc + v * g[k], 0);
    generated += Math.max(pred, r.gain);
    if (!r.capped || inWindows(r.t, forced)) continue;
    const w = pred - r.gain;
    if (w <= 0.5) continue;
    lost += w; n++; first = Math.min(first, r.t); last = Math.max(last, r.t);
    wasted.push({ t: r.t, w });
  }
  if (lost < 1) return [];
  const spentUnits = spends.reduce((a, c) => a + res(c)!.cost!, 0);
  const spenderCasts = casts.filter((c) => spenderNames.has(c.abilityName)).length;
  const spenderDamage = ctx.player.damageDone.filter((h) => !h.pet && spenderNames.has(h.abilityName) && h.timestamp < ctx.endMs)
    .reduce((a, h) => a + (h.amount ?? 0), 0);
  const perUnit = spentUnits > 0 && spenderCasts > 0 ? spenderDamage * (spends.length / spenderCasts) / spentUnits : 0;
  const top = builders.map((name, j) => ({ name, g: g[j] })).filter((b) => b.g >= 0.3).sort((a, b) => b.g - a.g).slice(0, 4);
  return [finding(ctx, {
    kind: "gauge-overcap", startMs: first, endMs: last, forced: false, inference: true,
    label: `${spec.name} capped`,
    lostDamage: lost * perUnit,
    basis: `~${Math.round(lost)} ${spec.name} lost at the cap of ~${Math.round(generated)} generated (rebuilt from spender snapshots; fitted gains: ` +
      `${top.map((b) => `${b.name} ${b.g.toFixed(1)}`).join(", ")}) × ${k(perUnit)} per ${spec.name} spent`,
    detail: `~${Math.round(lost)} of ~${Math.round(generated)} ${spec.name} (${Math.round(lost / generated * 100)}%) generated at the cap, over ${n} spends`,
    moments: wasted.map((x) => ({ startMs: x.t, endMs: x.t, lostDamage: x.w * perUnit,
      detail: `spent at the cap, ~${x.w.toFixed(1)} ${spec.name} lost before it` })),
  })];
}

// ── Resource cap ───────────────────────────────────────────────────────

export type ResourceCapSpec = {
  type:        number;     // WCL classResources type (6 Runic Power)
  name:        string;     // "Runic Power"
  scale:       number;     // logged units per displayed unit (Runic Power logs ×10)
  // Abilities that spend it (value per unit comes from these); "auto": every
  // cast that logged a cost of it.
  spenderIds:  number[] | "auto";
  // Generators whose cast at the cap isn't waste (their gain arrives later,
  // or they run on charges that must be spent): Beast Mastery's Barbed Shot.
  ignoreIds?:  number[];
};

// WCL classResources types logged on every cast (builders included) in the
// 2026-10-06 samples, and how they're scaled: Rage, Runic Power and Astral
// Power ×10 (max 1000 / 1250 / 1000–1400), Insanity ×100 (max 10000).
// Mana is left out (casters' only resource for Mages; not a damage
// resource), and Soul Shards, Holy Power, combo points and Essence are
// logged on their spenders only: spenderSnapshotWaste below rebuilds the
// waste from those snapshots instead.
export const PRIMARY_RESOURCES: Record<number, { name: string; scale: number }> = {
  1:  { name: "Rage", scale: 10 },
  2:  { name: "Focus", scale: 1 },
  3:  { name: "Energy", scale: 1 },
  6:  { name: "Runic Power", scale: 10 },
  8:  { name: "Astral Power", scale: 10 },
  11: { name: "Maelstrom", scale: 1 },
  13: { name: "Insanity", scale: 100 },
  17: { name: "Fury", scale: 1 },
};

/** The player's most-logged resource among PRIMARY_RESOURCES, capped (resourceCapFindings). */
export function primaryResourceCapFindings(ctx: PlayerCheckContext, ignoreIds?: number[]): DamageFinding[] {
  const counts = new Map<number, number>();
  for (const c of ctx.player.casts) for (const r of c.resources ?? []) if (PRIMARY_RESOURCES[r.type]) counts.set(r.type, (counts.get(r.type) ?? 0) + 1);
  const type = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (type === undefined) return [];
  return resourceCapFindings(ctx, { type, ...PRIMARY_RESOURCES[type], spenderIds: "auto", ignoreIds });
}

const GAIN_PAIR_MS = 3_000;

export function resourceCapFindings(ctx: PlayerCheckContext, spec: ResourceCapSpec): DamageFinding[] {
  const casts = ctx.player.casts
    .filter((c) => !c.fake && c.timestamp < ctx.endMs)
    .map((c) => ({ c, r: c.resources?.find((x) => x.type === spec.type) }))
    .filter((x): x is { c: typeof x.c; r: NonNullable<typeof x.r> } => x.r !== undefined);
  if (casts.length < 10) return [];
  const max = casts[0].r.max;

  // Gain per ability, measured.
  const gains = new Map<number, number[]>();
  for (let i = 0; i + 1 < casts.length; i++) {
    const a = casts[i], b = casts[i + 1];
    if (b.c.timestamp - a.c.timestamp > GAIN_PAIR_MS || a.r.amount > max * 0.75) continue;
    const g = b.r.amount - (a.r.amount - (a.r.cost ?? 0));
    if (g <= 0) continue;
    const list = gains.get(a.c.abilityId) ?? [];
    list.push(g);
    gains.set(a.c.abilityId, list);
  }
  const gainOf = (id: number) => {
    const xs = gains.get(id);
    return xs && xs.length >= 3 ? [...xs].sort((p, q) => p - q)[Math.floor(xs.length / 2)] : undefined;
  };

  // Damage per unit from the spenders. An ability is a spender if any of its
  // casts logged a cost (some casts of Mortal Strike log none). Its damage
  // is matched by name: Annihilation's hits log under another id than its
  // cast.
  const spenderIds = new Set(spec.spenderIds === "auto"
    ? casts.filter((x) => (x.r.cost ?? 0) > 0).map((x) => x.c.abilityId)
    : spec.spenderIds);
  const damageByName = new Map<string, number>();
  for (const e of ctx.player.damageDone) {
    if (e.pet || e.timestamp >= ctx.endMs) continue;
    damageByName.set(e.abilityName, (damageByName.get(e.abilityName) ?? 0) + (e.amount ?? 0));
  }
  let spentUnits = 0, spenderDamage = 0;
  const countedNames = new Set<string>();
  for (const x of casts) {
    if (!spenderIds.has(x.c.abilityId)) continue;
    spentUnits += x.r.cost ?? 0;
    if (!countedNames.has(x.c.abilityName)) { countedNames.add(x.c.abilityName); spenderDamage += damageByName.get(x.c.abilityName) ?? 0; }
  }
  const perUnit = spentUnits > 0 ? spenderDamage / spentUnits : 0;

  const forced = mergeWindows(ctx.forced);
  const byPhase = new Map<number | undefined, { units: number; n: number; start: number; end: number; names: Map<string, number>; moments: Moment[] }>();
  for (const x of casts) {
    if (spenderIds.has(x.c.abilityId) || x.r.amount < max || spec.ignoreIds?.includes(x.c.abilityId)) continue;
    const gain = gainOf(x.c.abilityId);
    if (!gain || inWindows(x.c.timestamp, forced)) continue;
    const ph = ctx.phaseOf(x.c.timestamp);
    const g = byPhase.get(ph) ?? { units: 0, n: 0, start: x.c.timestamp, end: x.c.timestamp, names: new Map(), moments: [] };
    g.units += gain; g.n++; g.end = x.c.timestamp;
    g.moments.push({ startMs: x.c.timestamp, endMs: x.c.timestamp, lostDamage: gain * perUnit,
      detail: `${x.c.abilityName} at full ${spec.name}, ~${Math.round(gain / spec.scale)} lost` });
    g.names.set(x.c.abilityName, (g.names.get(x.c.abilityName) ?? 0) + 1);
    byPhase.set(ph, g);
  }
  const out: DamageFinding[] = [];
  for (const [ph, g] of byPhase) {
    const shown = g.units / spec.scale;
    const names = [...g.names].sort((a, b) => b[1] - a[1]).map(([n, c]) => `${n} ×${c}`).join(", ");
    out.push(finding(ctx, {
      kind: "gauge-overcap", startMs: g.start, endMs: g.end, forced: false,
      label: `${spec.name} capped`,
      lostDamage: g.units * perUnit,
      basis: `${Math.round(shown)} ${spec.name} generated at the cap (each ability's gain measured from the pull) × ${k(perUnit * spec.scale)} per ${spec.name} from its spenders`,
      detail: `${g.n} casts at full ${spec.name} in ${ctx.phaseName(ph) ?? "the pull"}, ~${Math.round(shown)} lost: ${names}`,
      moments: g.moments,
    }));
  }
  return out;
}
