// lib/damage/ffxiv/jobs/shared.ts
//
// Building blocks for the job checks (docs/archive/damage-analysis-plan.md,
// Layer 3): a job's own burst window, a job damage buff's uptime, and a
// job gauge simulated from casts. Each returns findings in the engine's
// shape and states its basis.
//
// ── Burst windows ──────────────────────────────────────────────────────
// Modelled on xivanalysis's BuffWindow + ExpectedGcdCount/ExpectedActions
// evaluators (src/parser/core/modules/ActionWindow). A window is the
// status on the player (apply → remove, from the player-buff stream).
// GCDs count when they start inside it; actions when cast inside it, the
// removal's own timestamp included (xivanalysis's 'SAME-TIMESTAMP' mode:
// Delirium's last stack goes at the same instant as the GCD using it), but
// nothing after it. A
// window still open at the end of the analysis is skipped (xivanalysis's
// "rushed end of pull"). One that overlaps forced time by 1.5s+ is shown
// as forced.
//
// ── Gauges ─────────────────────────────────────────────────────────────
// Simulated from casts, which docs/dps-analysis.md warns can be wrong.
// So the simulation checks itself: a spender that would take the gauge
// below zero means the model or the log is off (gauge carried in from
// before the log, an unlogged combo). Then every overcap finding from that
// gauge is marked inference and says how many times it happened.
//
// ── Casts that did no damage ───────────────────────────────────────────
// Every job gets this (game.ts jobChecks). An action is a damage action
// when at least NO_DAMAGE_MIN_CASTS casts were followed by a direct hit
// of the same name or id within NO_DAMAGE_HIT_MS, for NO_DAMAGE_SHARE of
// its casts. (Name, because the cast and the damage can log under
// different ids: Salt and Darkness 25755 casts, 25756 hits.) A cast of
// it with no hit (target invulnerable, out of the area, already dead) is
// lost, at the action's average per cast. Same-name casts within 50ms
// are one press: FFLogs also logs the damage id as a "cast" when it hits
// nothing. From xivanalysis's Salt and Darkness check, on jN3XDrf2z8PmLgRJ
// Vamp pull 8 (8:39, no hit while Salted Earth stopped ticking). Marked
// inference: the cooldown may have come back in time to use anyway. A
// cast in forced time is forced: Standard Finish is pressed in downtime
// for its buff. Seen across the samples: spells finishing on a target
// that went invulnerable (Fall Malefic on Charnel Cell hit for 0), Circle
// of Scorn out of range, single-target GCDs on a dead add.
//
//   Copyright (c) 2018 Saxon Landers & contributors (the window model)
//   MIT License; full text in THIRD_PARTY_NOTICES.md.

import type { PlayerEvent } from "@/types/PlayerInfo";
import type { DamageFinding, JobCheck, Moment } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { forcedPart, inWindows, mergeWindows, overlapMs, type Window } from "../../timeline";

// The removal's own timestamp, no later. A 100ms allowance counted a
// Paladin's Sepulchre cast 40ms after Fight or Flight fell off
// (jN3XDrf2z8PmLgRJ Vamp pull 8, 5:38), whose hit logged ×1.00. Every
// cast 40-90ms after a Fight or Flight, Divination or Lance Charge
// removal on jN3XDrf2z8PmLgRJ and dQ8wmb1VhKt6yBXk (about 30) hit
// without the status in its snapshot.
const SAME_TIMESTAMP_MS = 0;

export const s = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
export const k = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : `${Math.round(n / 1000)}k`);
const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

/** Windows where a status is on the player, from the player-buff stream. */
export function statusWindows(ctx: PlayerCheckContext, statusId: number): Window[] {
  const out: Window[] = [];
  let open: number | undefined;
  for (const e of [...(ctx.player.buffs ?? [])].sort((a, b) => a.timestamp - b.timestamp)) {
    if (e.abilityId !== statusId) continue;
    if (e.buffStatus === "removed") {
      if (open !== undefined) { out.push({ startMs: open, endMs: e.timestamp }); open = undefined; }
    } else if (e.buffStatus === "applied" && open === undefined) {
      open = e.timestamp;
    }
  }
  if (open !== undefined) out.push({ startMs: open, endMs: ctx.endMs + 1 });
  return out;
}

export function castsIn(ctx: PlayerCheckContext, ids: number[], startMs: number, endMs: number): PlayerEvent[] {
  const set = new Set(ids);
  return ctx.player.casts.filter((c) => set.has(c.abilityId) && c.timestamp >= startMs && c.timestamp < endMs);
}

/** The first hit of each cast of an ability (multi-target casts count once). */
export function castHits(ctx: PlayerCheckContext, abilityId: number): PlayerEvent[] {
  const out: PlayerEvent[] = [];
  for (const e of ctx.player.damageDone) {
    if (e.abilityId !== abilityId || e.isDoT) continue;
    const last = out[out.length - 1];
    if (last && e.timestamp - last.timestamp < 500) continue;
    out.push(e);
  }
  return out;
}

// ── Burst windows ──────────────────────────────────────────────────────

export type ExpectedAction = {
  ids:    number[];
  count:  number;
  name:   string;
  // How a missing one is valued; default = its average × the window bonus
  // (it was used outside the window instead).
  value?: (ctx: PlayerCheckContext) => number;
  // Whether it could have been used in this window. Default: an action on
  // a longer cooldown than the window's own cycle (one charge) is expected
  // only if it came off cooldown by the window's end. A 60s Lance Charge
  // can't hold a 120s Dragonfire Dive every time (jN3XDrf2z8PmLgRJ Vamp
  // pull 8: every odd-minute window "missed" it; xivanalysis expects it
  // every other window). Actions on the window's cycle or shorter (a 60s
  // Double Down in a 60s No Mercy) are always expected: pressed early,
  // they're misaligned, not unavailable.
  availableIf?: (ctx: PlayerCheckContext, w: Window, cycleMs: number) => boolean;
};

// Pressed this soon before the window, it could have been held for it.
const HOLDABLE_MS = 10_000;

/**
 * Whether any of these actions was off cooldown at some point in the window
 * (or pressed just before it, when it could have been held). Only actions
 * on a cooldown longer than cycleMs are ever unavailable.
 */
export function offCooldownIn(ctx: PlayerCheckContext, ids: number[], w: Window, cycleMs: number): boolean {
  return ids.some((id) => {
    const a = ctx.game.action(id);
    if (!a || a.charges > 1 || a.cooldownMs <= cycleMs * 1.1) return true;
    const last = ctx.player.casts.filter((c) => c.abilityId === id && c.timestamp < w.startMs).pop();
    return !last || last.timestamp + a.cooldownMs <= w.endMs || w.startMs - last.timestamp <= HOLDABLE_MS;
  });
}

export type BurstWindowSpec = {
  statusId:      number;
  name:          string;
  // The window's damage bonus, 0.2 = +20%. "observed": measured per window
  // from FFLogs' multiplier, the player's average inside the window over
  // their median outside raid buffs, for windows that line up with the
  // party's buffs (Starry Muse). Crit/DH buffs aren't in it, so it's a floor.
  bonus:         number | "observed";
  bonusBasis:    string;      // where the bonus value comes from
  expectedGcds?: (ctx: PlayerCheckContext) => number;
  expected:      (ctx: PlayerCheckContext, casts: PlayerEvent[]) => ExpectedAction[];
  // The status is a debuff the player puts on the enemy (Kunai's Bane),
  // read from Pull.bossDebuffs instead of the player-buff stream.
  onEnemy?:      boolean;
  inference?:    boolean;
};

/** Windows where the player's own debuff is on any enemy. */
export function enemyStatusWindows(ctx: PlayerCheckContext, statusId: number): Window[] {
  const out: Window[] = [];
  const open = new Map<string, number>();
  for (const e of (ctx.pull.bossDebuffs ?? []).filter((x) => x.statusId === statusId && x.sourceName === ctx.player.name)) {
    const key = `${e.targetActorId}.${e.targetInstance ?? 1}`;
    if (e.status === "removed") {
      const start = open.get(key);
      if (start !== undefined) { out.push({ startMs: start, endMs: e.timestamp }); open.delete(key); }
    } else if (e.status === "applied" && !open.has(key)) {
      open.set(key, e.timestamp);
    }
  }
  for (const start of open.values()) out.push({ startMs: start, endMs: ctx.endMs + 1 });
  return mergeWindows(out);
}

/** The player's average hit multiplier in a window over their median outside raid buffs, minus 1. */
export function observedBonus(ctx: PlayerCheckContext, w: Window): number {
  const hits = ctx.player.damageDone.filter((e) => !e.isDoT && e.multiplier !== undefined && (e.amount ?? 0) > 0);
  const inside = hits.filter((e) => e.timestamp >= w.startMs && e.timestamp <= w.endMs).map((e) => e.multiplier!);
  const outside = hits.filter((e) => !inWindows(e.timestamp, ctx.buffWindows)).map((e) => e.multiplier!).sort((a, b) => a - b);
  if (inside.length === 0 || outside.length === 0) return 0;
  const base = outside[Math.floor(outside.length / 2)];
  return Math.max(0, inside.reduce((a, m) => a + m, 0) / inside.length / base - 1);
}

export function burstWindowFindings(ctx: PlayerCheckContext, specIn: BurstWindowSpec): DamageFinding[] {
  const out: DamageFinding[] = [];
  const windows = specIn.onEnemy ? enemyStatusWindows(ctx, specIn.statusId) : statusWindows(ctx, specIn.statusId);
  // The window's own cycle: the shortest gap between window starts (its
  // recast, give or take drift). With one window, nothing is unavailable.
  const starts = windows.map((w) => w.startMs);
  const cycleMs = starts.length > 1 ? Math.min(...starts.slice(1).map((t, i) => t - starts[i])) : Infinity;
  for (const w of windows) {
    if (w.endMs > ctx.endMs) continue;
    const spec = { ...specIn, bonus: specIn.bonus === "observed" ? observedBonus(ctx, w) : specIn.bonus };
    // Inclusive end: a stack-consumed buff (Delirium) loses its last stack
    // at the same timestamp as the cast that used it.
    const end = w.endMs + SAME_TIMESTAMP_MS;
    const gcds = ctx.uses.filter((u) => u.startMs >= w.startMs && u.startMs <= end);
    const casts = ctx.player.casts.filter((c) => c.timestamp >= w.startMs && c.timestamp <= end);
    const expectedGcds = spec.expectedGcds?.(ctx);
    const missingGcds = expectedGcds !== undefined ? Math.max(0, expectedGcds - gcds.length) : 0;
    const missing: { name: string; n: number; value: number }[] = [];
    for (const e of spec.expected(ctx, casts)) {
      if (!(e.availableIf ? e.availableIf(ctx, w, cycleMs) : offCooldownIn(ctx, e.ids, w, cycleMs))) continue;
      const got = casts.filter((c) => e.ids.includes(c.abilityId)).length;
      const n = Math.max(0, e.count - got);
      if (n === 0) continue;
      const each = e.value ? e.value(ctx) : Math.max(...e.ids.map((id) => ctx.values.perUse(id))) * spec.bonus;
      missing.push({ name: e.name, n, value: n * each });
    }
    if (missingGcds === 0 && missing.length === 0) continue;

    const phaseId = ctx.phaseOf(w.startMs);
    const gcdValue = ctx.values.gcdValue(phaseId, inWindows(w.startMs, ctx.buffWindows));
    const lostGcds = missingGcds * gcdValue * spec.bonus;
    const forced = forcedPart(w.startMs, w.endMs, ctx.forced);
    const parts = [
      // Only a shortfall is worth saying ("9/8" read as an error).
      missingGcds > 0 ? `${gcds.length}/${expectedGcds} GCDs` : undefined,
      missing.length ? `missing ${missing.map((m) => (m.n > 1 ? `${m.name} ×${m.n}` : m.name)).join(", ")}` : undefined,
    ].filter(Boolean);
    out.push(finding(ctx, {
      kind: "burst-window", startMs: w.startMs, endMs: w.endMs,
      forced: forced.ms >= 1_500, cause: forced.ms >= 1_500 ? forced.cause : undefined,
      label: `${spec.name} window`,
      lostDamage: lostGcds + missing.reduce((a, m) => a + m.value, 0),
      inference: spec.inference,
      basis: [
        missingGcds ? `${missingGcds} GCD${missingGcds > 1 ? "s" : ""} × ${k(gcdValue)} average × ${Math.round(spec.bonus * 100)}%` : undefined,
        missing.length ? `each missing action × its average × ${Math.round(spec.bonus * 100)}% (used outside the window instead; a never-used one shows as drift)` : undefined,
        spec.bonusBasis,
      ].filter(Boolean).join("; "),
      detail: `${spec.name} at ${clock(w.startMs)}: ${parts.join("; ")}`,
    }));
  }
  return out;
}

// ── Buff uptime ────────────────────────────────────────────────────────

export type UptimeSpec = {
  name:       string;
  bonus:      number;
  bonusBasis: string;
  active:     Window[];
  fromMs:     number;     // when the buff should first be up
  graceMs:    number;     // drops shorter than this are ignored
  inference?: boolean;    // the windows are simulated, not logged
};

export function uptimeFindings(ctx: PlayerCheckContext, spec: UptimeSpec): DamageFinding[] {
  const out: DamageFinding[] = [];
  const active = mergeWindows(spec.active);
  const forced = mergeWindows(ctx.forced);
  let cursor = spec.fromMs;
  const gaps: Window[] = [];
  for (const w of active) {
    if (w.startMs > cursor) gaps.push({ startMs: cursor, endMs: Math.min(w.startMs, ctx.endMs) });
    cursor = Math.max(cursor, w.endMs);
  }
  if (cursor < ctx.endMs) gaps.push({ startMs: cursor, endMs: ctx.endMs });
  for (const g of gaps) {
    const len = g.endMs - g.startMs;
    const forcedMs = overlapMs(g.startMs, g.endMs, forced);
    if (len - forcedMs < spec.graceMs) continue;
    // Only what was dealt outside forced time: past a phase's HP check the
    // damage was wasted anyway (2T1HzdPKgbhM43am fight 10, Power Surge
    // down from 6:11 into P2's 0% stretch).
    const dealt = ctx.values.damageIn(g.startMs, g.endMs) - forced
      .filter((f) => f.endMs > g.startMs && f.startMs < g.endMs)
      .reduce((a, f) => a + ctx.values.damageIn(Math.max(f.startMs, g.startMs), Math.min(f.endMs, g.endMs)), 0);
    out.push(finding(ctx, {
      kind: "buff-uptime", startMs: g.startMs, endMs: g.endMs, forced: false,
      label: `${spec.name} down`,
      lostDamage: dealt * spec.bonus,
      inference: spec.inference,
      basis: `${k(dealt)} dealt while it was down × ${Math.round(spec.bonus * 100)}% (${spec.bonusBasis})`,
      detail: `${spec.name} down for ${s(len - forcedMs)}${forcedMs > 0 ? ` (plus ${s(forcedMs)} forced)` : ""}`,
    }));
  }
  return out;
}

// ── DoTs ───────────────────────────────────────────────────────────────
// Modelled on xivanalysis's core DoTs module: uptime and clipping of the
// player's own DoT, read from Pull.bossDebuffs (the statuses players put
// on enemies). Uptime counts the DoT on ANY enemy (P3 has two bosses), from
// its first application, less forced time, ignoring gaps under one GCD +
// 1s (time to reapply). Clipping: a refresh with time left overwrites it.
// Lost damage is in the player's own average tick (ticks every 3s).
//
// With a filler (healers), each application is valued against the filler
// at the same buff state (in or out of raid buffs), two ways:
// - The DoT ran its course on a live enemy: an early refresh didn't lose
//   ticks (the new one ticks at the same rate), it made the next refresh
//   come sooner. L seconds early = L ÷ duration of an extra DoT cast in
//   place of a filler. Summed per phase ("refreshed early").
// - It was cut short (the status came off, the enemy took no ticks for
//   4.5s+, or a kill ended): no later refresh was coming, so the choice was
//   this DoT or a filler. What it added = its direct hit + its ticks after
//   the previous application would have run out; below the filler, it
//   loses the difference. On jN3XDrf2z8PmLgRJ Vamp pull 8 the AST's
//   Combust III at 0:57 added 3 ticks (25k) before the boss left for 20s,
//   against a 30k Fall Malefic (xivanalysis's 20s "invulnerable").
// Ticks for 0 (an invulnerable enemy) don't count. An application whose
// run reaches the end of a wipe's analysis is skipped (unknowable); on a
// kill it counts. The DoTs are instants: when moving, no filler was
// possible, which the basis says.

export type DotSpec = {
  statusIds:   number[];
  name:        string;
  durationMs:  number;
  fillerId?:   (ctx: PlayerCheckContext) => { id: number; name: string } | undefined;
};

const DOT_CAST_MS = 1_500;   // cast → status applied
const DOT_HIT_MS = 2_000;    // cast → its direct hit
const DOT_SILENT_MS = 4_500; // no tick for longer than a tick and a half
const DOT_MIN_SHORTFALL = 0.05; // under 5% of a filler is noise (crit variance)

function dotApplicationFindings(ctx: PlayerCheckContext, spec: DotSpec, filler: { id: number; name: string }): DamageFinding[] {
  const out: DamageFinding[] = [];
  const ids = new Set(spec.statusIds);
  const events = (ctx.pull.bossDebuffs ?? [])
    .filter((e) => ids.has(e.statusId) && e.sourceName === ctx.player.name)
    .sort((a, b) => a.timestamp - b.timestamp);
  const keyOf = (e: { targetActorId?: number; targetInstance?: number }) => `${e.targetActorId}.${e.targetInstance ?? 1}`;
  // An invulnerable enemy still logs ticks, for 0 (Chaos on dQ8wmb1VhKt6yBXk
  // P3): those aren't ticks the DoT got.
  const ticks = ctx.player.damageDone.filter((e) => ids.has(e.abilityId) && (e.amount ?? 0) > 0);
  const fillerHits = ctx.player.damageDone.filter((e) => e.abilityId === filler.id && !e.isDoT);
  const fillerAvg = (buffed: boolean) => {
    const own = fillerHits.filter((e) => inWindows(e.timestamp, ctx.buffWindows) === buffed);
    const pool = own.length >= 3 ? own : fillerHits;
    return pool.length ? pool.reduce((a, e) => a + (e.amount ?? 0), 0) / pool.length : 0;
  };
  const dotCasts = ctx.player.casts.filter((c) => ctx.game.action(c.abilityId)?.appliesStatusIds.some((id) => ids.has(id)));
  const lastApply = new Map<string, number>();
  const steady = new Map<number | undefined, { ms: number; lost: number; n: number; start: number; end: number; moments: Moment[] }>();
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const key = keyOf(e);
    if (e.status === "removed") { lastApply.delete(key); continue; }
    const prev = lastApply.get(key);
    lastApply.set(key, e.timestamp);
    if (e.timestamp >= ctx.endMs) continue;
    const from = prev === undefined ? e.timestamp : Math.max(e.timestamp, prev + spec.durationMs);
    const removal = events.slice(i + 1).find((x) => x.status === "removed" && keyOf(x) === key)?.timestamp ?? Infinity;
    const runsOut = e.timestamp + spec.durationMs;
    const until = Math.min(runsOut, removal, ctx.endMs);
    if (until === ctx.endMs && ctx.pull.result !== "Kill") continue;
    const added = ticks.filter((t) => keyOf(t) === key && t.timestamp > from && t.timestamp <= until + 500);
    const cast = [...dotCasts].reverse().find((c) => c.timestamp <= e.timestamp && e.timestamp - c.timestamp <= DOT_CAST_MS);
    const direct = cast ? ctx.player.damageDone.filter((h) => h.abilityId === cast.abilityId && !h.isDoT &&
      !ctx.game.isTickAbility(h.abilityId) && keyOf(h) === key && h.timestamp >= cast.timestamp && h.timestamp <= cast.timestamp + DOT_HIT_MS) : [];
    const gained = [...added, ...direct].reduce((a, h) => a + (h.amount ?? 0), 0);
    const castAt = cast?.timestamp ?? e.timestamp;
    const buffed = inWindows(castAt, ctx.buffWindows);
    const fill = fillerAvg(buffed);
    if (fill <= 0) continue;
    const forced = forcedPart(castAt - 1, castAt + 1, ctx.forced);
    const lastTick = ticks.filter((t) => keyOf(t) === key && t.timestamp > e.timestamp && t.timestamp <= until + 500).pop()?.timestamp ?? e.timestamp;
    const silent = until - lastTick;
    const left = prev !== undefined ? prev + spec.durationMs - e.timestamp : 0;
    const cut = runsOut - until;

    // The DoT ran its course: an early refresh only brought the next one
    // closer. Summed per phase below.
    if (cut < DOT_TICK_MS && silent < DOT_SILENT_MS) {
      if (left <= 0 || forced.ms > 0) continue;
      const hit = direct.reduce((a, h) => a + (h.amount ?? 0), 0);
      const phaseId = ctx.phaseOf(castAt);
      const b = steady.get(phaseId) ?? { ms: 0, lost: 0, n: 0, start: castAt, end: castAt, moments: [] };
      const cost = (left / spec.durationMs) * Math.max(0, fill - hit);
      b.ms += left; b.n++; b.end = castAt;
      b.lost += cost;
      b.moments.push({ startMs: castAt, endMs: castAt, lostDamage: cost,
        detail: `${spec.name} refreshed with ${s(left)} left on ${e.targetName}` });
      steady.set(phaseId, b);
      continue;
    }

    // Cut short: no later refresh was coming, so the choice was this DoT or
    // a filler.
    if (fill - gained < fill * DOT_MIN_SHORTFALL) continue;
    const n = `${added.length} new tick${added.length === 1 ? "" : "s"}`;
    const why = [
      left > 0 ? `refreshed with ${s(left)} left` : undefined,
      silent >= DOT_SILENT_MS && cut < 1_000 ? `${e.targetName} took no ticks for the last ${s(silent)} (out of reach or invulnerable)` : undefined,
      cut >= 1_000 ? (until === ctx.endMs || removal >= ctx.endMs - 1_000 ? `the pull ended ${s(cut)} before it ran out`
        : `it came off ${e.targetName} ${s(cut)} before it ran out (the enemy died or left)`) : undefined,
    ].filter(Boolean).join("; ") || "few ticks";
    out.push(finding(ctx, {
      kind: "dot-clip", startMs: castAt, endMs: until, forced: forced.ms > 0,
      cause: forced.ms > 0 ? forced.cause : undefined,
      label: `${spec.name} worth less than ${filler.name}`,
      lostDamage: fill - gained,
      basis: `${k(fill)} average ${filler.name}${buffed ? " in raid buffs" : ""} − ${k(gained)} the ${spec.name} added ` +
        `(its ticks after the previous one would have run out${direct.length ? ", plus its hit" : ""}); ` +
        `${spec.name} is instant, so if you were moving no ${filler.name} was possible`,
      detail: `${spec.name} added ${k(gained)} (${n}), less than a ${filler.name}: ${why}`,
    }));
  }
  for (const [phaseId, b] of steady) {
    if (b.ms < DOT_CLIP_FINDING_MS) continue;
    out.push(finding(ctx, {
      kind: "dot-clip", startMs: b.start, endMs: b.end, forced: false, moments: b.moments,
      label: `${spec.name} refreshed early`,
      lostDamage: b.lost,
      basis: `each refresh made the next one come that much sooner: ${s(b.ms)} ÷ ${s(spec.durationMs)} = ` +
        `${(b.ms / spec.durationMs).toFixed(1)} extra ${spec.name} casts, each in place of a ${filler.name} ` +
        `(${k(fillerAvg(false))} average${b.n ? ", less the DoT's own hit" : ""})`,
      detail: `${spec.name} refreshed early ${b.n} time${b.n > 1 ? "s" : ""} in ${ctx.phaseName(phaseId) ?? "the pull"}, ${s(b.ms)} clipped`,
    }));
  }
  return out;
}

const DOT_TICK_MS = 3_000;

export function dotFindings(ctx: PlayerCheckContext, spec: DotSpec): DamageFinding[] {
  const out: DamageFinding[] = [];
  const ids = new Set(spec.statusIds);
  const events = (ctx.pull.bossDebuffs ?? [])
    .filter((e) => ids.has(e.statusId) && e.sourceName === ctx.player.name && e.timestamp < ctx.endMs)
    .sort((a, b) => a.timestamp - b.timestamp);
  if (events.length === 0) return out;
  const ticks = ctx.player.damageDone.filter((e) => ids.has(e.abilityId));
  const avgTick = ticks.length ? ticks.reduce((a, e) => a + (e.amount ?? 0), 0) / ticks.length : 0;

  const windows: Window[] = [];
  const open = new Map<string, { start: number; lastApply: number }>();
  const clips = new Map<number | undefined, { ms: number; n: number; start: number; end: number; moments: Moment[] }>();
  for (const e of events) {
    const key = `${e.targetActorId}.${e.targetInstance ?? 1}`;
    const o = open.get(key);
    if (e.status === "removed") {
      if (o) { windows.push({ startMs: o.start, endMs: e.timestamp }); open.delete(key); }
      continue;
    }
    // Ran out with no removal logged: close it at its expiry.
    if (o && e.timestamp > o.lastApply + spec.durationMs) {
      windows.push({ startMs: o.start, endMs: o.lastApply + spec.durationMs });
      open.set(key, { start: e.timestamp, lastApply: e.timestamp });
      continue;
    }
    if (o) {
      const left = spec.durationMs - (e.timestamp - o.lastApply);
      if (left > 0) {
        const phaseId = ctx.phaseOf(e.timestamp);
        const c = clips.get(phaseId) ?? { ms: 0, n: 0, start: e.timestamp, end: e.timestamp, moments: [] };
        c.ms += left; c.n++; c.end = e.timestamp;
        c.moments.push({ startMs: e.timestamp, endMs: e.timestamp, lostDamage: (left / DOT_TICK_MS) * avgTick,
          detail: `${spec.name} refreshed with ${s(left)} left on ${e.targetName}` });
        clips.set(phaseId, c);
      }
      o.lastApply = e.timestamp;
    } else {
      open.set(key, { start: e.timestamp, lastApply: e.timestamp });
    }
  }
  // No removal logged (the enemy left at a phase change, 2T1HzdPKgbhM43am
  // fight 10's Exdeath at 11:55): it ran at most its duration, not to the
  // end of the pull, which hid every later gap.
  for (const o of open.values()) windows.push({ startMs: o.start, endMs: Math.min(ctx.endMs, o.lastApply + spec.durationMs) });

  const active = mergeWindows(windows);
  const forced = mergeWindows(ctx.forced);
  const grace = ctx.baseGcdMs + 1_000;
  let cursor = active[0].startMs;
  for (const w of [...active, { startMs: ctx.endMs, endMs: ctx.endMs }]) {
    if (w.startMs > cursor) {
      const len = w.startMs - cursor - overlapMs(cursor, w.startMs, forced);
      if (len >= grace) {
        out.push(finding(ctx, {
          kind: "dot-uptime", startMs: cursor, endMs: w.startMs, forced: false,
          label: `${spec.name} off the boss`,
          lostDamage: (len / DOT_TICK_MS) * avgTick,
          basis: `${s(len)} ÷ 3s ticks × ${k(avgTick)} average tick`,
          detail: `${spec.name} wasn't on the boss for ${s(len)}`,
        }));
      }
    }
    cursor = Math.max(cursor, w.endMs);
  }
  const filler = spec.fillerId?.(ctx);
  if (filler) return [...out, ...dotApplicationFindings(ctx, spec, filler)];
  for (const [phaseId, c] of clips) {
    if (c.ms < DOT_CLIP_FINDING_MS) continue;
    out.push(finding(ctx, {
      kind: "dot-clip", startMs: c.start, endMs: c.end, forced: false, moments: c.moments,
      label: `${spec.name} refreshed early`,
      lostDamage: (c.ms / DOT_TICK_MS) * avgTick,
      basis: `${s(c.ms)} of remaining DoT overwritten ÷ 3s ticks × ${k(avgTick)} average tick`,
      detail: `${spec.name} refreshed early ${c.n} time${c.n > 1 ? "s" : ""} in ${ctx.phaseName(phaseId) ?? "the pull"}, ${s(c.ms)} of ticks overwritten`,
    }));
  }
  return out;
}

// xivanalysis's healer DoT modules start flagging clipping at 6s per minute.
const DOT_CLIP_FINDING_MS = 6_000;

// ── Gauges ─────────────────────────────────────────────────────────────

export type GaugeEvent =
  | { t: number; type: "gain"; amount: number; label: string }
  | { t: number; type: "spend"; amount: number; label: string }
  | { t: number; type: "cap"; cap: number; label: string }   // cap change; excess above it is lost
  | { t: number; type: "reset"; label: string };             // death

export type GaugeSpec = {
  name:      string;       // "Cartridge"
  unit:      string;       // "cartridge" / "Blood"
  cap:       number;       // starting cap
  unitValue: number;       // damage per unit
  valueBasis: string;
  events:    GaugeEvent[];
};

export function gaugeFindings(ctx: PlayerCheckContext, spec: GaugeSpec): DamageFinding[] {
  const events = [...spec.events].filter((e) => e.t < ctx.endMs).sort((a, b) => a.t - b.t);
  let value = 0, cap = spec.cap, negatives = 0;
  const waste: { t: number; amount: number; label: string }[] = [];
  for (const e of events) {
    if (e.type === "gain") {
      const over = Math.max(0, value + e.amount - cap);
      if (over > 0) waste.push({ t: e.t, amount: over, label: e.label });
      value = Math.min(cap, value + e.amount);
    } else if (e.type === "spend") {
      if (value - e.amount < 0) { negatives++; value = 0; } else value -= e.amount;
    } else if (e.type === "cap") {
      cap = e.cap;
      if (value > cap) { waste.push({ t: e.t, amount: value - cap, label: e.label }); value = cap; }
    } else {
      value = 0;
    }
  }
  const forced = mergeWindows(ctx.forced);
  return waste.map((w) => finding(ctx, {
    kind: "gauge-overcap", startMs: w.t, endMs: w.t,
    forced: inWindows(w.t, forced), cause: inWindows(w.t, forced) ? forcedPart(w.t - 1, w.t + 1, ctx.forced).cause : undefined,
    label: `${spec.name} overcap (${w.label})`,
    lostDamage: w.amount * spec.unitValue,
    inference: negatives > 0 ? true : undefined,
    basis: `${w.amount} ${spec.unit} × ${spec.valueBasis}` +
      (negatives > 0 ? `; the gauge simulation went below zero ${negatives} time${negatives > 1 ? "s" : ""}, so treat this as inference` : ""),
    detail: `${w.amount} ${spec.unit} lost: ${w.label}`,
  }));
}

// ── AoE GCDs on one target ─────────────────────────────────────────────

const AOE_HIT_MS = 1_500;

/**
 * An AoE GCD that hit one enemy and dealt less than the single-target GCD
 * it stood in for (`against`: the healer's filler, a tank's combo step).
 * One pressed in forced time is shown, not counted: past a phase's HP
 * check a tank builds gauge with the AoE combo before downtime
 * (2T1HzdPKgbhM43am fight 10, Dark Knight at 6:20 and 14:22).
 */
export function aoeOnOneTargetFindings(
  ctx: PlayerCheckContext,
  aoeIds: number[],
  against: (aoeId: number) => { name: string; value: number } | undefined,
): DamageFinding[] {
  const out: DamageFinding[] = [];
  const aoe = new Set(aoeIds);
  const uses = ctx.uses.filter((u) => u.startMs < ctx.endMs);
  uses.forEach((u, i) => {
    if (!aoe.has(u.action.id)) return;
    const alt = against(u.action.id);
    if (!alt || alt.value <= 0) return;
    const landed = u.startMs + u.castMs;
    const until = Math.min(uses[i + 1]?.startMs ?? Infinity, landed + AOE_HIT_MS);
    const hits = ctx.player.damageDone.filter((e) => e.abilityId === u.action.id && e.timestamp >= u.startMs && e.timestamp < until);
    const targets = new Set(hits.map((e) => `${e.targetActorId ?? e.target}.${e.targetInstance ?? 1}`));
    if (targets.size !== 1) return;
    const dealt = hits.reduce((a, e) => a + (e.amount ?? 0), 0);
    if (dealt >= alt.value) return;
    const during = forcedPart(u.startMs - 1, u.startMs + 1, ctx.forced);
    out.push(finding(ctx, {
      kind: "aoe-single", startMs: u.startMs, endMs: landed,
      forced: during.ms > 0, cause: during.ms > 0 ? during.cause : undefined,
      label: `${u.abilityName} on one target`,
      lostDamage: alt.value - dealt,
      basis: `${k(alt.value)} average ${alt.name} − ${k(dealt)} this ${u.abilityName} dealt`,
      detail: `${u.abilityName} hit only ${hits[0].target ?? "one enemy"}`,
    }));
  });
  return out;
}

/**
 * A tank's AoE combo on one target, each step against the single-target
 * step it replaces ([AoE id, single-target id] pairs), at the player's own
 * average for it. From xivanalysis's AoE-usage check (Unleash and Stalwart
 * Soul on one target).
 */
export const aoeComboOnOneTarget = (pairs: [number, number][]): JobCheck => (ctx) => {
  const st = new Map(pairs);
  return aoeOnOneTargetFindings(ctx, pairs.map(([a]) => a), (aoeId) => {
    const id = st.get(aoeId)!;
    return { name: ctx.game.action(id)?.name ?? "single-target GCD", value: ctx.values.perUse(id) };
  });
};

// ── Casts that did no damage ───────────────────────────────────────────

const NO_DAMAGE_HIT_MS = 3_000;
const NO_DAMAGE_MIN_CASTS = 3;
const NO_DAMAGE_SHARE = 0.8;
const SAME_PRESS_MS = 50;
// Technical Finish logs 16196 and then 33218 about 0.7s later.
const SAME_NAME_OTHER_ID_MS = 1_000;

export const noDamageCasts: JobCheck = (ctx) => {
  const out: DamageFinding[] = [];
  // Ticks share the action's name (Eukrasian Dosis III) and older samples
  // don't mark them isDoT, so tick ids are left out too.
  const hits = ctx.player.damageDone.filter((e) => !e.isDoT && !ctx.game.isTickAbility(e.abilityId) && (e.amount ?? 0) > 0);
  const presses = new Map<string, PlayerEvent[]>();
  for (const c of ctx.player.casts) {
    const list = presses.get(c.abilityName) ?? [];
    const last = list[list.length - 1];
    if (last && (c.timestamp - last.timestamp <= SAME_PRESS_MS ||
      (c.abilityId !== last.abilityId && c.timestamp - last.timestamp <= SAME_NAME_OTHER_ID_MS))) continue;
    list.push(c);
    presses.set(c.abilityName, list);
  }
  for (const [name, casts] of presses) {
    const ids = new Set(casts.map((c) => c.abilityId));
    const dealt = casts.map((c) => hits
      .filter((e) => (e.abilityName === name || ids.has(e.abilityId)) &&
        e.timestamp >= c.timestamp && e.timestamp <= c.timestamp + NO_DAMAGE_HIT_MS)
      .reduce((a, e) => a + (e.amount ?? 0), 0));
    const landed = dealt.filter((d) => d > 0);
    if (landed.length < NO_DAMAGE_MIN_CASTS || landed.length < casts.length * NO_DAMAGE_SHARE) continue;
    const average = landed.reduce((a, d) => a + d, 0) / landed.length;
    casts.forEach((c, i) => {
      if (dealt[i] > 0 || c.timestamp >= ctx.endMs || inWindows(c.timestamp, ctx.dead)) return;
      // Pressed during forced time (boss untargetable): shown, not
      // counted. Dancers refresh Standard Finish there for its buff.
      const during = forcedPart(c.timestamp - 1, c.timestamp + 1, ctx.forced);
      out.push(finding(ctx, {
        kind: "no-damage", startMs: c.timestamp, endMs: c.timestamp, forced: during.ms > 0, inference: true,
        cause: during.ms > 0 ? during.cause : undefined,
        label: `${name} did no damage`,
        lostDamage: average,
        basis: `${k(average)} average ${name} (${landed.length} of ${casts.length} casts hit something)`,
        detail: `${name} hit nothing`,
      }));
    });
  }
  return out;
};
