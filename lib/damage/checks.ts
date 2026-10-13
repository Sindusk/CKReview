// lib/damage/checks.ts
//
// The engine's generic checks (docs/archive/damage-analysis-plan.md, Layer 1).
// Each takes one player's context and returns findings. Lost damage is in
// the player's own observed damage (timeline.ts PlayerValues), not
// potency: the vendored xivanalysis tables carry potencies for only a few
// jobs, and observed values put every job on the same scale anyway. Every
// finding states its basis.
//
// ── GCD gaps ───────────────────────────────────────────────────────────
// idle = next GCD start − (this GCD start + its lock) − GCD_TOLERANCE_MS
// (xivanalysis's AlwaysBeCasting allowance for latency). The part of the
// idle time inside a forced window (dead, raid downtime, a context window,
// a phase whose damage doesn't count) is forced. Unforced idle of 1s+ is
// its own finding; shorter delays are summed per phase. Lost damage =
// idle ÷ the player's GCD × their average GCD value in that phase (the
// buffed value when the gap sits in a raid-buff window).
//
// ── Cooldown drift ─────────────────────────────────────────────────────
// Only the job's tracked cooldowns (lib/damage/ffxiv/tracked-cooldowns.ts):
// a first pass over every 20s+ action flagged gauge- and proc-gated ones
// (Mog of the Ages, Finishing Move, Guren) as hundreds of seconds of drift.
// Simulate charges (full at pull start, recharging one at a time) and sum
// the time spent at full charges, less COOLDOWN_HOLD_MS per stretch
// (xivanalysis's CooldownDowntime default; plus the opener's first-use
// offset for the first stretch) and less forced time. Holding a cooldown
// from an earlier phase into the phase that decides the enrage is forced
// ("held for the deciding phase"). A finding needs one whole lost use.
//
// ── Procs ──────────────────────────────────────────────────────────────
// A status of the player's own (source = target) is a consumable proc when
// one ability consumes it: at least PROC_MIN_REMOVALS removals and
// PROC_CONSUMED_SHARE of them within PROC_CONSUME_MS of a cast of that
// same ability. A looser rule (any cast near any removal) made timed buffs
// into "procs": healers press a GCD every ~2.4s, so No Mercy, True North
// and Opposition looked consumed by coincidence. A removal with no cast
// nearby, at apply + duration, is an expiry: up to PROC_EXPIRY_EARLY_MS
// before it, or PROC_EXPIRY_LATE_MS after (the removal can log late: a
// Dancer's Silken Symmetry on jN3XDrf2z8PmLgRJ Vamp pull 8 went 0.77s
// after its 30s ran out, and a symmetric 0.6s slack missed it, which
// xivanalysis caught). Overwrites (refresh while up)
// are left to the job modules: whether one loses anything depends on the
// job (a Dancer opener refreshes Last Dance Ready on purpose). Lost damage
// = the consumer's average damage (an upper bound: the GCD used instead did
// some damage too, so this is marked inference).

import type { Pull } from "@/types/Pull";
import type { PlayerEvent, PlayerInfo } from "@/types/PlayerInfo";
import type { DamageContext, DamageFinding, DamageGame, ForcedWindow, Moment, TrackedCooldown } from "./types";
import type { BuffLedger } from "./buffs";
import {
  forcedPart, gcdLockMs, inWindows, latestBegin, overlapMs, mergeWindows,
  type GcdUse, type PlayerValues, type Window,
} from "./timeline";

export const GCD_TOLERANCE_MS = 150;
export const GAP_FINDING_MS = 1_000;
export const COOLDOWN_HOLD_MS = 1_250;
// TrackedCooldown.openerUse: a first cast this much later than the opener's
// offset is a skipped opener use.
const OPENER_LATE_MS = 30_000;
export const PROC_CONSUME_MS = 200;
export const PROC_EXPIRY_EARLY_MS = 600;
export const PROC_EXPIRY_LATE_MS = 1_500;
export const PROC_MIN_REMOVALS = 3;
export const PROC_CONSUMED_SHARE = 0.6;
// A second consumer (Holy Circle beside Holy Spirit) that took this share of the status's removals.
export const PROC_CONSUMER_ALT_SHARE = 0.1;
// A double weave is normal; a third oGCD between two GCDs clips.
export const CLIP_WEAVES = 3;
export const CLIP_FINDING_MS = 500;
// Movement under this much per cause and phase isn't listed (still not counted).
export const MOVEMENT_FINDING_MS = 200;

/** Movement windows merged where they overlap; the causes of merged ones joined. */
function mergeMovement(ws: ForcedWindow[]): ForcedWindow[] {
  const out: ForcedWindow[] = [];
  for (const w of [...ws].sort((a, b) => a.startMs - b.startMs)) {
    const prev = out[out.length - 1];
    if (prev && w.startMs <= prev.endMs) {
      prev.endMs = Math.max(prev.endMs, w.endMs);
      if (!prev.cause.split(" + ").includes(w.cause)) prev.cause = `${prev.cause} + ${w.cause}`;
    } else out.push({ ...w });
  }
  return out;
}
export const COMBO_TIMEOUT_MS = 30_000;

export type PlayerCheckContext = {
  pull:        Pull;
  player:      PlayerInfo;
  game:        DamageGame;
  context?:    DamageContext;
  endMs:       number;
  uses:        GcdUse[];
  job:         string;          // DamageGame.jobOf, else className
  factor:      number;          // GCD speed factor (outside haste windows)
  factorAt(t: number): number;  // the factor for a GCD starting at t
  baseGcdMs:   number;
  forced:      ForcedWindow[];  // every forced window for this player
  movement?:   ForcedWindow[];  // DamageContext.movementWindows for this player
  dead:        Window[];
  buffWindows: Window[];
  values:      PlayerValues;
  phaseOf(t: number): number | undefined;
  phaseName(id: number | undefined): string | undefined;
  // What mechanic was happening around [startMs, endMs], for labelling.
  mechanicAround(startMs: number, endMs: number): string | undefined;
  decidingPhaseStart?: number;
  ledger?:     BuffLedger;      // party buffs across the pull (lib/damage/buffs.ts)
  patch?:      string;          // the patch the pull was played on (DamageGame.patchOf), if known
};

export function finding(ctx: PlayerCheckContext, f: Omit<DamageFinding, "player" | "job" | "phaseId" | "phase">): DamageFinding {
  const phaseId = ctx.phaseOf(f.startMs);
  return { player: ctx.player.name, job: ctx.job, phaseId, phase: ctx.phaseName(phaseId), ...f };
}

const s = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
const k = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : `${Math.round(n / 1000)}k`);

// ── GCD gaps ───────────────────────────────────────────────────────────

export function checkGcdGaps(ctx: PlayerCheckContext): DamageFinding[] {
  const out: DamageFinding[] = [];
  const uses = ctx.uses.filter((u) => u.startMs < ctx.endMs);
  if (uses.length === 0) return out;
  type Bucket = { ms: number; lost: number; start: number; end: number; n: number; defensives: Map<string, number>; moments: Moment[] };
  const small = new Map<number | undefined, Bucket>();
  const clipped = new Map<number | undefined, Bucket>();
  // One press per name per instant: FFLogs can log an action's damage id
  // as a second "cast" (Salt and Darkness 25755 + 25756 when it hit
  // nothing), which read as a double weave.
  const ogcds = ctx.player.casts.filter((c, i, all) => {
    const a = ctx.game.action(c.abilityId);
    const dup = all.slice(0, i).some((p) => p.abilityName === c.abilityName && c.timestamp - p.timestamp <= 50);
    return a !== undefined && !a.onGcd && !a.autoAttack && !dup;
  });

  // Every idle stretch the check considers: GCD lock end → next GCD start.
  const stretches: { gcdStart: number; from: number; to: number; after: string }[] = [];
  for (let i = 1; i < uses.length; i++) {
    const prev = uses[i - 1];
    stretches.push({ gcdStart: prev.startMs, from: prev.startMs + gcdLockMs(prev, ctx.factorAt(prev.startMs)), to: uses[i].startMs, after: prev.abilityName });
  }
  {
    const last = uses[uses.length - 1];
    stretches.push({ gcdStart: last.startMs, from: last.startMs + gcdLockMs(last, ctx.factorAt(last.startMs)), to: ctx.endMs + GCD_TOLERANCE_MS, after: `${last.abilityName} (to the end)` });
  }

  // Movement (DamageContext.movementWindows): idle inside a movement window
  // is the player's own up to their usual idle rate outside movement and
  // forced time, × the window's length; past that it's movement. Spent in
  // time order, so a window's first idle counts against the player.
  const forcedMerged = mergeWindows(ctx.forced);
  const moveWins = mergeMovement(ctx.movement ?? []).map((w) => {
    const len = w.endMs - w.startMs - overlapMs(w.startMs, w.endMs, forcedMerged);
    return { ...w, len, budget: 0 };
  }).filter((w) => w.len > 0);
  if (moveWins.length) {
    const excluded = mergeWindows([...ctx.forced, ...moveWins]);
    let idleOut = 0;
    for (const st of stretches) {
      const end = st.to - GCD_TOLERANCE_MS;
      if (end > st.from) idleOut += end - st.from - overlapMs(st.from, end, excluded);
    }
    const from = uses[0].startMs;
    const eligible = ctx.endMs - from - overlapMs(from, ctx.endMs, excluded);
    const rate = eligible > 0 ? Math.min(1, idleOut / eligible) : 0;
    for (const w of moveWins) w.budget = rate * w.len;
  }
  const usualRate = moveWins.length ? (moveWins[0].budget / moveWins[0].len) : 0;
  type MoveAcc = { ms: number; lost: number; start: number; end: number; moments: Moment[] };
  const moved = new Map<string, MoveAcc>();   // cause|phase → accumulated movement

  const consider = (gcdStart: number, from: number, to: number, after: string) => {
    const idle = to - from - GCD_TOLERANCE_MS;
    if (idle <= 0) return;
    const start = from, end = to - GCD_TOLERANCE_MS;
    const forced = forcedPart(start, end, ctx.forced);
    let moveMs = 0, moveCause: string | undefined, moveBest = 0;
    for (const w of moveWins) {
      if (w.endMs <= start || w.startMs >= end) continue;
      const s0 = Math.max(start, w.startMs), e0 = Math.min(end, w.endMs);
      const o = e0 - s0 - overlapMs(s0, e0, forcedMerged);
      if (o <= 0) continue;
      const own = Math.min(o, w.budget);
      w.budget -= own;
      moveMs += o - own;
      if (o - own > moveBest) { moveBest = o - own; moveCause = w.cause; }
    }
    const unforced = idle - forced.ms - moveMs;
    const mid = start + idle / 2;
    const phaseId = ctx.phaseOf(mid);
    const value = ctx.values.gcdValue(phaseId, inWindows(mid, ctx.buffWindows));
    const perMs = value / ctx.baseGcdMs;
    if (moveMs > 0 && moveCause) {
      const key = `${moveCause}|${phaseId}`;
      const acc = moved.get(key) ?? { ms: 0, lost: 0, start, end, moments: [] };
      acc.ms += moveMs; acc.lost += moveMs * perMs; acc.end = end;
      acc.moments.push({ startMs: start, endMs: end, lostDamage: moveMs * perMs, detail: `${s(moveMs)} moving (${moveCause}) after ${after}` });
      moved.set(key, acc);
    }
    const weaves = ogcds.filter((c) => c.timestamp > gcdStart && c.timestamp < to);
    const swap = weaves.find((c) => ctx.game.tankSwapActionIds.has(c.abilityId)) ??
      ctx.player.casts.find((c) => ctx.game.tankSwapActionIds.has(c.abilityId) && c.timestamp >= start - 3_000 && c.timestamp <= end);
    if (unforced >= GAP_FINDING_MS) {
      const during = ctx.mechanicAround(start, end);
      const cause = swap ? `tank swap (${swap.abilityName})` : during ? `during ${during}` : undefined;
      out.push(finding(ctx, {
        kind: "gcd-gap", startMs: start, endMs: end, forced: false,
        label: swap ? "GCD gap at a tank swap" : during ? `GCD gap during ${during}` : "GCD gap",
        lostDamage: unforced * perMs,
        cause,
        basis: `${s(unforced)} idle ÷ ${s(ctx.baseGcdMs)} GCD × ${k(value)} average GCD${inWindows(mid, ctx.buffWindows) ? " in raid buffs" : ""}`,
        detail: `No GCD for ${s(unforced)} after ${after}${forced.ms > 0 ? ` (plus ${s(forced.ms)} forced: ${forced.cause})` : ""}` +
          // A double weave that ran long is xivanalysis's "incorrect
          // weaving", so name the weaves from two up.
          (weaves.length >= 2 ? `; ${weaves.length} weaves: ${weaves.map((w) => w.abilityName).join(", ")}` : ""),
      }));
    } else if (unforced > 0) {
      // Three or more oGCDs between two GCDs: the delay is the weaving.
      const bucketMap = weaves.length >= CLIP_WEAVES ? clipped : small;
      const acc = bucketMap.get(phaseId) ?? { ms: 0, lost: 0, start, end, n: 0, defensives: new Map<string, number>(), moments: [] };
      acc.ms += unforced; acc.lost += unforced * perMs; acc.end = end; acc.n++;
      acc.moments.push({
        startMs: start, endMs: end, lostDamage: unforced * perMs,
        detail: `next GCD ${s(unforced)} late after ${after}` +
          (weaves.length >= 2 ? `; ${weaves.length} weaves: ${weaves.map((w) => w.abilityName).join(", ")}` : ""),
      });
      if (bucketMap === clipped) {
        for (const w of weaves) {
          if (ctx.game.isDefensive(w.abilityId)) acc.defensives.set(w.abilityName, (acc.defensives.get(w.abilityName) ?? 0) + 1);
        }
      }
      bucketMap.set(phaseId, acc);
    }
    if (forced.ms >= 2 * ctx.baseGcdMs && unforced < GAP_FINDING_MS) {
      out.push(finding(ctx, {
        kind: "gcd-gap", startMs: start, endMs: end, forced: true,
        label: `GCD gap (${forced.cause})`,
        lostDamage: forced.ms * perMs, cause: forced.cause,
        basis: `${s(forced.ms)} forced idle × ${k(value)} average GCD`,
        detail: `No GCD for ${s(idle)} after ${after}`,
      }));
    }
  };

  for (const st of stretches) consider(st.gcdStart, st.from, st.to, st.after);

  for (const [key, acc] of moved) {
    if (acc.ms < MOVEMENT_FINDING_MS) continue;
    const cause = key.slice(0, key.lastIndexOf("|"));
    const phaseId = ctx.phaseOf(acc.start);
    out.push({
      player: ctx.player.name, job: ctx.job, phaseId, phase: ctx.phaseName(phaseId),
      kind: "movement", startMs: acc.start, endMs: acc.end, forced: true, movement: true, cause,
      lostDamage: acc.lost, moments: acc.moments,
      label: `Movement: ${cause}`,
      basis: `${s(acc.ms)} idle inside ${cause} beyond this player's usual ${Math.round(usualRate * 100)}% idle, valued at their average GCD`,
      detail: `${s(acc.ms)} moving for ${cause} in ${ctx.phaseName(phaseId) ?? "the pull"} (${acc.moments.length} time${acc.moments.length === 1 ? "" : "s"})`,
    });
  }

  for (const [phaseId, acc] of small) {
    // A phase's delays are lost damage even under one GCD in total
    // (xivanalysis lists each; the dDar482XvFKBPJYh FRU kill's DRK had
    // 0.2-0.9s ones in five phases, all dropped at a one-GCD floor).
    if (acc.ms < CLIP_FINDING_MS) continue;
    out.push({
      player: ctx.player.name, job: ctx.job, phaseId, phase: ctx.phaseName(phaseId),
      kind: "gcd-delays", startMs: acc.start, endMs: acc.end, forced: false, lostDamage: acc.lost, moments: acc.moments,
      label: "Small GCD delays",
      basis: `${acc.n} delays under 1s, ${s(acc.ms)} in total, valued at the phase's average GCD`,
      detail: `${s(acc.ms)} of small GCD delays (${acc.n}) in ${ctx.phaseName(phaseId) ?? "the pull"}`,
    });
  }
  for (const [phaseId, acc] of clipped) {
    if (acc.ms < CLIP_FINDING_MS) continue;
    const defs = [...acc.defensives.entries()].sort((a, b) => b[1] - a[1]).map(([n, c]) => `${n} ×${c}`).join(", ");
    out.push({
      player: ctx.player.name, job: ctx.job, phaseId, phase: ctx.phaseName(phaseId),
      kind: "gcd-clipping", startMs: acc.start, endMs: acc.end, forced: false, lostDamage: acc.lost, moments: acc.moments,
      label: "GCD clipped by triple weaves",
      basis: `${acc.n} delays with ${CLIP_WEAVES}+ oGCDs between GCDs, ${s(acc.ms)} in total, valued at the phase's average GCD`,
      detail: `${s(acc.ms)} of GCD delay from triple weaves (${acc.n}) in ${ctx.phaseName(phaseId) ?? "the pull"}` +
        (defs ? `; defensives woven: ${defs}` : ""),
    });
  }
  return out;
}

// ── Disengage GCDs ─────────────────────────────────────────────────────
// A ranged filler (Lightning Shot, Unmend, Tomahawk, Shield Lob) pressed
// out of melee range. Lost = the player's average GCD in that phase minus
// the filler's own average. Labelled with the mechanic at the time.
// When another player also used a ranged filler within SHARED_DISENGAGE_MS,
// a mechanic moved the boss or the melee out of reach, so it's forced: on
// the Vamp Fatale kill (jN3XDrf2z8PmLgRJ) 13 of the DRK's 17 Unmends
// lined up with another melee's or tank's filler (bombs at 0:35, boss
// movement at 1:25, 3:17, 3:53, 5:48, 8:33).

const SHARED_DISENGAGE_MS = 3_000;
const disengageCache = new WeakMap<Pull, { player: string; t: number }[]>();

function disengagesOf(pull: Pull, game: DamageGame): { player: string; t: number }[] {
  let out = disengageCache.get(pull);
  if (!out) {
    out = pull.players.flatMap((p) => p.casts.filter((c) => game.disengageActionIds.has(c.abilityId)).map((c) => ({ player: p.name, t: c.timestamp })));
    disengageCache.set(pull, out);
  }
  return out;
}

export function checkDisengages(ctx: PlayerCheckContext): DamageFinding[] {
  const others = disengagesOf(ctx.pull, ctx.game).filter((d) => d.player !== ctx.player.name);
  return ctx.uses
    .filter((u) => u.startMs < ctx.endMs && ctx.game.disengageActionIds.has(u.action.id))
    .map((u) => {
      const phaseId = ctx.phaseOf(u.startMs);
      const value = ctx.values.gcdValue(phaseId, inWindows(u.startMs, ctx.buffWindows));
      const own = ctx.values.perUse(u.action.id);
      const window = forcedPart(u.startMs - 1, u.startMs + 1, ctx.forced);
      const shared = others.filter((d) => Math.abs(d.t - u.startMs) <= SHARED_DISENGAGE_MS);
      const forced = window.ms > 0 ? window
        : shared.length > 0 ? { ms: 1, cause: `${[...new Set(shared.map((d) => d.player))].join(", ")} out of reach too` }
        : window;
      const during = ctx.mechanicAround(u.startMs, u.startMs);
      return finding(ctx, {
        kind: "disengage", startMs: u.startMs, endMs: u.startMs,
        forced: forced.ms > 0, cause: forced.ms > 0 ? forced.cause : during ? `during ${during}` : undefined,
        label: during ? `${u.abilityName} during ${during}` : u.abilityName,
        lostDamage: Math.max(0, value - own),
        basis: `${k(value)} average GCD − ${k(own)} average ${u.abilityName}`,
        detail: `${u.abilityName} instead of a melee GCD`,
      });
    });
}

// ── Positionals ────────────────────────────────────────────────────────
// Ported from xivanalysis's core Positionals module: a positional action's
// first hit per cast missed when its bonusPercent is one the potency table
// gives without the positional (GameAction.positional). A combo step with
// no bonusPercent at all is left to the broken-combo check. Lost = the
// missed hit's own amount × the potency the positional would have added.
// One finding per action per phase.

export function checkPositionals(ctx: PlayerCheckContext): DamageFinding[] {
  const groups = new Map<string, { name: string; phaseId?: number; misses: number; casts: number; lost: number; start: number; end: number; cost: number; moments: Moment[] }>();
  let last: { id: number; t: number } | undefined;
  for (const e of ctx.player.damageDone) {
    if (e.timestamp >= ctx.endMs || e.isDoT) continue;
    const a = ctx.game.action(e.abilityId);
    if (!a?.positional) continue;
    if (last && last.id === e.abilityId && e.timestamp - last.t < 500) continue; // same cast, another target
    last = { id: e.abilityId, t: e.timestamp };
    const phaseId = ctx.phaseOf(e.timestamp);
    const key = `${e.abilityId}|${phaseId}`;
    const g = groups.get(key) ?? { name: e.abilityName, phaseId, misses: 0, casts: 0, lost: 0, start: e.timestamp, end: e.timestamp, cost: a.positional.missCost, moments: [] };
    g.casts++;
    groups.set(key, g);
    if (e.bonusPercent === undefined && a.comboFrom) continue;
    if (!a.positional.missedBonus.includes(e.bonusPercent ?? 0)) continue;
    g.misses++;
    g.lost += (e.amount ?? 0) * a.positional.missCost;
    g.end = e.timestamp;
    g.moments.push({
      startMs: e.timestamp, endMs: e.timestamp, lostDamage: (e.amount ?? 0) * a.positional.missCost,
      detail: `${e.abilityName} positional missed`,
    });
  }
  const out: DamageFinding[] = [];
  for (const g of groups.values()) {
    if (g.misses === 0) continue;
    out.push({
      player: ctx.player.name, job: ctx.job, phaseId: g.phaseId, phase: ctx.phaseName(g.phaseId),
      kind: "positional", startMs: g.start, endMs: g.end, forced: false, lostDamage: g.lost, moments: g.moments,
      label: `${g.name} positional missed`,
      basis: `each missed hit × ${Math.round(g.cost * 100)}% (the potency the positional adds)`,
      detail: `${g.name}: ${g.misses} of ${g.casts} positionals missed in ${ctx.phaseName(g.phaseId) ?? "the pull"}`,
    });
  }
  return out;
}

// ── Broken combos ──────────────────────────────────────────────────────
// A combo step's damage event carries `bonusPercent` (the share of its
// potency that came from the combo, plus any positional) only when the
// combo landed: on dQ8wmb1VhKt6yBXk pull 11 every Solid Barrel had 47 and
// every Souleater 45. So a combo step whose first hit has no bonusPercent,
// for an action that shows one elsewhere in the pull, landed without its
// combo. Lost = the action's average per cast × its smallest observed
// bonus share (the combo part alone). A break right after forced time
// (death, downtime, or 30s+ since the last GCD, when the combo timer ran
// out) is forced.
//
// A dropped combo never shows on a damage event: the step that would have
// carried the bonus is never pressed. So the chain is followed in the
// casts too. A combo action whose next action in the same chain (actions
// linked by comboFrom) isn't one of its follow-ups within COMBO_TIMEOUT_MS
// lost that follow-up's combo part, valued like a break (the best
// follow-up's average × its bonus share). A wrong step that lands is left
// to the bonusPercent check above, so only a restart (a chain starter),
// nothing, or a step after the timer counts here. The combo running into
// the end of the analysis is skipped; one whose timer ran through 1s+ of
// forced time is forced. Found by xivanalysis on jN3XDrf2z8PmLgRJ Vamp pull
// 8: the Dancer's Cascade before Technical Step had no Fountain left after
// the eight window GCDs.

export function checkCombos(ctx: PlayerCheckContext): DamageFinding[] {
  const out: DamageFinding[] = [];
  const hits = ctx.player.damageDone.filter((e) => !e.isDoT && (e.amount ?? 0) > 0);
  const minBonus = new Map<number, number>();
  for (const e of hits) {
    if (e.bonusPercent === undefined) continue;
    minBonus.set(e.abilityId, Math.min(minBonus.get(e.abilityId) ?? Infinity, e.bonusPercent));
  }
  const uses = ctx.uses;
  const broken = new Set<GcdUse>();
  for (let i = 0; i < uses.length; i++) {
    const u = uses[i];
    if (u.startMs >= ctx.endMs || !u.action.comboFrom) continue;
    const bonus = minBonus.get(u.action.id);
    if (bonus === undefined) continue;
    const hit = hits.find((e) => e.abilityId === u.action.id && e.timestamp >= u.startMs && e.timestamp <= u.startMs + u.castMs + 1_500);
    if (!hit || hit.bonusPercent !== undefined) continue;
    broken.add(u);
    const prev = uses[i - 1];
    const since = prev ? u.startMs - prev.startMs : Infinity;
    const forcedBefore = prev ? forcedPart(prev.startMs, u.startMs, ctx.forced) : { ms: 0 };
    const forced = since >= COMBO_TIMEOUT_MS || forcedBefore.ms >= GAP_FINDING_MS;
    const perUse = ctx.values.perUse(u.action.id);
    out.push(finding(ctx, {
      kind: "combo-broken", startMs: u.startMs, endMs: u.startMs, forced,
      cause: forced ? (since >= COMBO_TIMEOUT_MS ? "combo timed out" : forcedBefore.cause) : prev ? `after ${prev.abilityName}` : undefined,
      label: `${u.abilityName} without combo`,
      lostDamage: perUse * bonus / 100,
      basis: `${k(perUse)} average ${u.abilityName} × ${bonus}% combo share (its bonusPercent when combo'd)`,
      detail: `${u.abilityName} landed without its combo bonus`,
    }));
  }
  out.push(...droppedCombos(ctx, minBonus, broken));
  return out;
}

// `broken`: steps that landed without their combo. Those carried no combo
// forward, so they can't drop one.
function droppedCombos(ctx: PlayerCheckContext, minBonus: Map<number, number>, broken: Set<GcdUse>): DamageFinding[] {
  const out: DamageFinding[] = [];
  const uses = ctx.uses;
  const next = new Map<number, Set<number>>();
  const parent = new Map<number, number>();
  const root = (id: number): number => {
    const p = parent.get(id) ?? id;
    return p === id ? id : root(p);
  };
  for (const u of uses) {
    for (const from of u.action.comboFrom ?? []) {
      next.set(from, (next.get(from) ?? new Set<number>()).add(u.action.id));
      const a = root(from), b = root(u.action.id);
      if (!parent.has(a)) parent.set(a, a);
      if (!parent.has(b)) parent.set(b, b);
      if (a !== b) parent.set(b, a);
    }
  }
  const names = new Map(uses.map((u) => [u.action.id, u.abilityName]));
  for (let i = 0; i < uses.length; i++) {
    const u = uses[i];
    const follow = next.get(u.action.id);
    if (!follow || u.startMs >= ctx.endMs || broken.has(u)) continue;
    const expiry = u.startMs + COMBO_TIMEOUT_MS;
    if (expiry > ctx.endMs) continue;
    const chain = root(u.action.id);
    const after = uses.slice(i + 1).find((v) => parent.has(v.action.id) && root(v.action.id) === chain);
    const inTime = after !== undefined && after.startMs <= expiry;
    if (inTime && (follow.has(after.action.id) || after.action.comboFrom)) continue;
    const best = [...follow]
      .map((id) => ({ id, value: ctx.values.perUse(id) * (minBonus.get(id) ?? 0) / 100 }))
      .sort((a, b) => b.value - a.value)[0];
    if (!best || best.value <= 0) continue;
    const until = inTime ? after.startMs : expiry;
    const forcedBefore = forcedPart(u.startMs, until, ctx.forced);
    const forced = forcedBefore.ms >= GAP_FINDING_MS;
    const bonus = minBonus.get(best.id) ?? 0;
    const bestName = names.get(best.id) ?? "its follow-up";
    out.push(finding(ctx, {
      kind: "combo-broken", startMs: u.startMs, endMs: until, forced,
      cause: forced ? forcedBefore.cause : undefined,
      label: `${u.abilityName} combo dropped`,
      lostDamage: best.value,
      basis: `${k(ctx.values.perUse(best.id))} average ${bestName} × ${bonus}% combo share (its bonusPercent when combo'd)`,
      detail: inTime
        ? `${u.abilityName} wasn't followed up: the chain restarted with ${after.abilityName}`
        : `${u.abilityName}'s combo ran out before ${[...new Set([...follow].map((id) => names.get(id) ?? "?"))].join(" or ")}`,
    }));
  }
  return out;
}

// ── Cooldown drift ─────────────────────────────────────────────────────

export function checkCooldownDrift(ctx: PlayerCheckContext): DamageFinding[] {
  const out: DamageFinding[] = [];
  const forcedMerged = mergeWindows(ctx.forced);
  const withDeciding = ctx.decidingPhaseStart !== undefined
    ? mergeWindows([...ctx.forced, { startMs: 0, endMs: ctx.decidingPhaseStart, cause: "held for the deciding phase" }])
    : forcedMerged;

  for (const cd of ctx.game.trackedCooldowns(ctx.job)) {
    const ids = new Set(cd.actionIds);
    const casts = ctx.player.casts
      .filter((c) => ids.has(c.abilityId) && c.timestamp < ctx.endMs)
      .map((c) => c.timestamp)
      .sort((a, b) => a - b);
    // Used before the pull (Dancer's Standard Step, shown by a Standard
    // Finish before the first Step): still recharging until the first use.
    const evidence = new Set(cd.prePullEvidenceIds ?? []);
    const prePull = evidence.size > 0 && [...ctx.player.casts, ...ctx.player.damageDone]
      .some((c) => evidence.has(c.abilityId) && c.timestamp < (casts[0] ?? Infinity));
    const capped = cappedStretches(casts, cd.cooldownMs, cd.charges, ctx.endMs).filter((w) => !(prePull && w.startMs === 0));
    let unforced = 0, heldForDeciding = 0, stretchLost = 0, longest: Window | undefined, longestHeld = 0;
    for (const w of capped) {
      const len = w.endMs - w.startMs;
      // Capping inside downtime is a lost recharge when a charge was
      // already banked as the downtime began: spent before it (or drifted
      // less earlier), the recharge would have kept running
      // (dDar482XvFKBPJYh FRU kill: the Sage's Phlegma III came back at
      // 12:54, a second before P4's downtime, after 9s of opener drift and
      // small delays, and capped 13:34-14:13; xivanalysis's 28/29).
      const avoidable = cd.charges > 1
        ? forcedMerged.filter((f) => f.startMs < w.startMs && f.endMs > w.startMs &&
            chargesAt(casts, cd.cooldownMs, cd.charges, f.startMs) >= 1)
          .reduce((a, f) => a + Math.min(f.endMs, w.endMs) - w.startMs, 0)
        : 0;
      const plain = overlapMs(w.startMs, w.endMs, forcedMerged) - avoidable;
      // Holding into the deciding phase only counts when the use lands in it.
      const forced = ctx.decidingPhaseStart !== undefined && w.endMs >= ctx.decidingPhaseStart
        ? overlapMs(w.startMs, w.endMs, withDeciding) - avoidable : plain;
      heldForDeciding += forced - plain;
      const allowance = (cd.holdMs ?? COOLDOWN_HOLD_MS) + (w.startMs === 0 ? cd.firstUseOffsetMs : 0);
      const held = Math.max(0, len - forced - allowance);
      unforced += held;
      // Per stretch: from the first moment it could have been pressed to
      // when it was. A recast's worth or more lost a use, even when
      // downtime filled part of it (dDar482XvFKBPJYh FRU kill: Dream Within
      // a Dream ready 5:15 with 36s of targetable boss before P2's
      // downtime, used 6:20; ready 12:45 with 10s before P4's, used 14:22;
      // xivanalysis's 15/17).
      const blockers = ctx.decidingPhaseStart !== undefined && w.endMs >= ctx.decidingPhaseStart ? withDeciding : forcedMerged;
      const first = avoidable > 0 ? w.startMs : firstPressable(w.startMs, w.endMs, cd.landDelayMs ?? 0, blockers);
      const lost = first === undefined ? 0 : Math.floor(Math.max(0, w.endMs - first - allowance) / cd.cooldownMs);
      stretchLost += lost;
      // Anchored on the longest hold, not the longest stretch: a stretch
      // mostly in downtime (Aetherflow 6:40-7:18) isn't where it drifted.
      if ((held > 0 || lost > 0) && (!longest || held > longestHeld)) { longest = w; longestHeld = held; }
    }
    // Never more lost uses than the pull had room for: Vamp's Dancer used
    // Standard Step 19 times in 587s (room for 20), yet its ready time
    // summed to 163s, "5 lost", because each use came a few seconds late.
    const room = roomForUses(cd, ctx.endMs, forcedMerged, prePull);
    // A press whose effect can't land before the end isn't a use: the
    // qjCMx4bRfgNKwX9T fight 16 Scholar's last Aetherflow came back 0.2s
    // before the kill after 26s of drift in P5, and its stacks went unspent.
    // Room can come out below the casts (the fight-16 Bard: 67 Empyreal
    // Arrows, room for 66, 5 of them in forced time), which caps a real
    // drift to 0; see docs/open-items.md (cooldown room) before changing.
    const landed = casts.filter((t) => t + (cd.landDelayMs ?? 0) < ctx.endMs).length;
    const openerLost = cd.openerUse && !prePull && casts.length > 0 && casts[0] > cd.firstUseOffsetMs + OPENER_LATE_MS ? 1 : 0;
    const lostUses = Math.min(Math.max(stretchLost, Math.floor(unforced / cd.cooldownMs), openerLost),
      Math.max(0, room - landed - (prePull ? 1 : 0)));
    if (lostUses < 1 || !longest) continue;
    const custom = cd.valuePerUse?.(ctx.player, ctx.endMs);
    if (cd.valuePerUse) {
      if (!custom || custom.value <= 0) continue;
      const uses = (n: number) => `${n} use${n === 1 ? "" : "s"}`;
      out.push(finding(ctx, {
        kind: "cooldown-drift", startMs: longest.startMs, endMs: longest.endMs, forced: false, inference: true,
        label: `${cd.name} drift`,
        lostDamage: lostUses * custom.value,
        basis: `${uses(lostUses)} × ${custom.basis}; room for ${room} in the pull`,
        detail: `${cd.name} sat ready for ${s(unforced)} in total (${uses(casts.length)}): about ${uses(lostUses)} lost`,
      }));
      continue;
    }
    const damageIds = new Set(cd.damageIds ?? []);
    const perUse = damageIds.size > 0 || cd.petDamage
      ? ctx.player.damageDone.filter((e) => (cd.petDamage ? !!e.pet : damageIds.has(e.abilityId)) && e.timestamp < ctx.endMs)
        .reduce((a, e) => a + (e.amount ?? 0), 0) / Math.max(1, casts.length + (prePull ? 1 : 0))
      : cd.actionIds.reduce((a, id) => Math.max(a, ctx.values.perUse(id)), 0);
    // A cooldown that deals no damage itself (Devilment) has no estimate,
    // and a 0 line says nothing.
    if (perUse === 0) continue;
    // A lost GCD cooldown (Phlegma III, Gnashing Fang) still had its GCD:
    // the filler went there instead, so it costs the difference.
    const onGcd = cd.actionIds.some((id) => ctx.game.action(id)?.onGcd);
    const filler = onGcd ? ctx.values.gcdValue(undefined, false) : 0;
    const each = Math.max(0, perUse - filler);
    if (each === 0) continue;
    const uses = (n: number) => `${n} use${n === 1 ? "" : "s"}`;
    out.push(finding(ctx, {
      kind: "cooldown-drift", startMs: longest.startMs, endMs: longest.endMs, forced: false,
      label: `${cd.name} drift`,
      lostDamage: lostUses * each,
      basis: `${uses(lostUses)} × ${onGcd ? `(${k(perUse)} average ${cd.name} − ${k(filler)} average GCD in its place)` : `${k(perUse)} average per ${cd.name}`}` +
        `; room for ${room} in the pull`,
      detail: `${cd.name} sat ready for ${s(unforced)} in total (${uses(casts.length)}): about ${uses(lostUses)} lost` +
        (heldForDeciding > 0 ? `; ${s(heldForDeciding)} more held for the deciding phase is fine` : ""),
    }));
  }
  return out;
}

/**
 * How many uses the pull had room for: each use as soon as it's ready,
 * held only while its effect (landDelayMs after the press) would land in
 * forced time. The recast keeps running through downtime. Counting room as
 * (pull − forced time) ÷ recast didn't: on dDar482XvFKBPJYh's FRU kill it
 * gave Earthly Star room for 15 (the 14 casts plus the pre-pull one), when
 * 17 could have exploded on a target (xivanalysis: 4 lost, counting its
 * holds through downtime; the log: 2).
 */
export function roomForUses(cd: TrackedCooldown, endMs: number, forced: Window[], prePull: boolean): number {
  const land = cd.landDelayMs ?? 0;
  // Charges recharge one at a time, through downtime too; a charge is
  // spent as soon as there is one and its effect wouldn't land in forced
  // time, one per GCD.
  let charges = cd.charges, rechargeStart: number | null = null, n = 0;
  const spend = (t: number) => {
    n++;
    charges--;
    if (rechargeStart === null) rechargeStart = t;
  };
  const advance = (to: number) => {
    while (charges < cd.charges && rechargeStart !== null && to >= rechargeStart + cd.cooldownMs) {
      charges++;
      rechargeStart = charges === cd.charges ? null : rechargeStart + cd.cooldownMs;
    }
  };
  if (prePull) spend(0);
  let t = prePull ? 0 : cd.firstUseOffsetMs;
  for (let guard = 0; guard < 10_000 && t + land < endMs; guard++) {
    advance(t);
    const f = forced.find((w) => t + land >= w.startMs && t + land < w.endMs);
    if (f) { t = f.endMs - land; continue; }
    if (charges > 0) { spend(t); t += ROOM_SPEND_GAP_MS; continue; }
    t = rechargeStart! + cd.cooldownMs;
  }
  return n;
}

const ROOM_SPEND_GAP_MS = 2_500;

/** The first moment in [startMs, endMs) whose press would land (+landMs) outside forced time. */
function firstPressable(startMs: number, endMs: number, landMs: number, forced: Window[]): number | undefined {
  let t = startMs;
  for (let guard = 0; guard <= forced.length && t < endMs; guard++) {
    const f = forced.find((w) => t + landMs >= w.startMs && t + landMs < w.endMs);
    if (!f) return t;
    t = f.endMs - landMs;
  }
  return t < endMs ? t : undefined;
}

// A press logged up to this long before the simulated recast ends is on
// time: Vamp's Dancer pressed Standard Step a few ms short of every 30s,
// and dropping those as "no charge" turned each into 30s of drift.
const RECAST_SLACK_MS = 1_000;

/** Charges ready at t, from the same simulation as cappedStretches. */
export function chargesAt(casts: number[], cooldownMs: number, maxCharges: number, t: number): number {
  let charges = maxCharges, rechargeStart: number | null = null;
  const advance = (to: number, slack = 0) => {
    while (charges < maxCharges && rechargeStart !== null && to + slack >= rechargeStart + cooldownMs) {
      charges++;
      rechargeStart = charges === maxCharges ? null : rechargeStart + cooldownMs;
    }
  };
  for (const c of casts) {
    if (c > t) break;
    advance(c, RECAST_SLACK_MS);
    if (charges === 0) continue;
    charges--;
    if (rechargeStart === null) rechargeStart = c;
  }
  advance(t);
  return charges;
}

/** Stretches where every charge was ready, from pull start to endMs. */
export function cappedStretches(casts: number[], cooldownMs: number, maxCharges: number, endMs: number): Window[] {
  const out: Window[] = [];
  let charges = maxCharges, rechargeStart: number | null = null, cappedSince = 0;
  const advance = (t: number, slack = 0) => {
    while (charges < maxCharges && rechargeStart !== null && t + slack >= rechargeStart + cooldownMs) {
      charges++;
      rechargeStart += cooldownMs;
      if (charges === maxCharges) { cappedSince = rechargeStart; rechargeStart = null; }
    }
  };
  for (const t of casts) {
    advance(t, RECAST_SLACK_MS);
    if (charges === maxCharges) out.push({ startMs: cappedSince, endMs: t });
    if (charges === 0) continue; // the simulation says no charge: log noise
    charges--;
    if (rechargeStart === null) rechargeStart = t;
  }
  advance(endMs);
  if (charges === maxCharges) out.push({ startMs: cappedSince, endMs });
  return out.filter((w) => w.endMs > w.startMs);
}

// ── Deaths ─────────────────────────────────────────────────────────────

export function checkDeaths(ctx: PlayerCheckContext): DamageFinding[] {
  return ctx.dead.map((w) => {
    const death = ctx.pull.deathEvents.find((d) => d.player === ctx.player.name && d.timestamp === w.startMs);
    const phaseId = ctx.phaseOf(w.startMs);
    const rate = ctx.values.ratePerMs(phaseId);
    const forced = forcedPart(w.startMs, w.endMs, ctx.forced.filter((f) => f.cause.startsWith("phase damage")));
    return finding(ctx, {
      kind: "death", startMs: w.startMs, endMs: w.endMs,
      label: death ? `Death (${death.cause})` : "Death",
      forced: forced.ms >= (w.endMs - w.startMs) / 2, cause: death?.cause,
      lostDamage: (w.endMs - w.startMs) * rate,
      basis: `${s(w.endMs - w.startMs)} dead × ${k(rate * 1000)}/s (their damage per second alive in this phase); the Weakness after a raise is its own finding`,
      detail: `Dead for ${s(w.endMs - w.startMs)}${death ? ` (${death.cause})` : ""}${w.endMs >= ctx.endMs ? ", not raised before the end" : ""}`,
    });
  });
}

// ── Penalty debuffs ────────────────────────────────────────────────────
// What a penalty does differs by fight: Damage Down is ×0.10 in Dancing
// Mad but ×0.75 in Vamp Fatale (jN3XDrf2z8PmLgRJ, the kill: every player's
// hits under it), so the factor is measured per pull. For each player and
// ability with 2+ hits both with and without the status, the ratio of the
// median FFLogs multipliers; the factor is the median ratio over all of
// them. The game's table is the fallback when fewer than
// PENALTY_MIN_SAMPLES pairs exist. Vamp kill: Damage Down 0.75 (23 pairs),
// Weakness 0.75, Brink of Death 0.50.

const PENALTY_MIN_SAMPLES = 3;
// Weakness, Brink of Death: the price of being raised.
const RAISE_PENALTIES = new Set([1000043, 1000044]);
const penaltyCache = new WeakMap<Pull, Map<number, { factor: number; samples: number } | undefined>>();

export function measuredPenaltyFactor(pull: Pull, statusId: number): { factor: number; samples: number } | undefined {
  let cache = penaltyCache.get(pull);
  if (!cache) penaltyCache.set(pull, cache = new Map());
  if (cache.has(statusId)) return cache.get(statusId);
  const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const ratios: number[] = [];
  for (const player of pull.players) {
    const byAbility = new Map<number, { on: number[]; off: number[] }>();
    for (const e of player.damageDone) {
      if (e.multiplier === undefined || !(e.amount && e.amount > 0)) continue;
      const s = byAbility.get(e.abilityId) ?? { on: [], off: [] };
      (e.statusIds?.includes(statusId) ? s.on : s.off).push(e.multiplier);
      byAbility.set(e.abilityId, s);
    }
    for (const s of byAbility.values()) if (s.on.length >= 2 && s.off.length >= 2) ratios.push(med(s.on) / med(s.off));
  }
  const out = ratios.length >= PENALTY_MIN_SAMPLES ? { factor: med(ratios), samples: ratios.length } : undefined;
  cache.set(statusId, out);
  return out;
}

export function checkPenalties(ctx: PlayerCheckContext): DamageFinding[] {
  const out: DamageFinding[] = [];
  const { player, game } = ctx;
  const windows: { statusId: number; name: string; cause?: string; startMs: number; endMs: number }[] = [];
  const open = new Map<number, { startMs: number; name: string; cause?: string }>();
  for (const e of [...player.debuffs].sort((a, b) => a.timestamp - b.timestamp)) {
    if (game.penaltyFactor(e.abilityId) === undefined) continue;
    if (e.debuffStatus === "removed") {
      const o = open.get(e.abilityId);
      if (o) { windows.push({ statusId: e.abilityId, ...o, endMs: e.timestamp }); open.delete(e.abilityId); }
    } else if (!open.has(e.abilityId)) {
      open.set(e.abilityId, { startMs: e.timestamp, name: e.abilityName, cause: e.causeAbilityName });
    }
  }
  for (const [statusId, o] of open) windows.push({ statusId, ...o, endMs: ctx.endMs });

  // Hits in a phase whose damage doesn't count are the forced part.
  const noCount = mergeWindows(ctx.forced.filter((x) => x.cause.startsWith("phase damage")));
  for (const w of windows) {
    if (w.startMs >= ctx.endMs) continue;
    const measured = measuredPenaltyFactor(ctx.pull, w.statusId);
    const f = measured?.factor ?? game.penaltyFactor(w.statusId)!;
    // The snapshot says which hits it reduced (DoT ticks included, which
    // snapshot at application); allow for the snapshot lag at the edges.
    const hits = player.damageDone.filter((e) =>
      e.timestamp >= w.startMs && e.timestamp <= w.endMs + 1_000 && e.timestamp < ctx.endMs &&
      e.statusIds?.includes(w.statusId));
    const end = Math.min(w.endMs, ctx.endMs);
    for (const forced of [false, true]) {
      const part = hits.filter((e) => inWindows(e.timestamp, noCount) === forced);
      if (part.length === 0) continue;
      const dealt = part.reduce((a, e) => a + (e.amount ?? 0), 0);
      out.push(finding(ctx, {
        kind: "penalty", startMs: part[0].timestamp, endMs: Math.min(end, part[part.length - 1].timestamp),
        label: w.cause ? `${w.name} (${w.cause})` : w.name,
        forced,
        cause: forced ? forcedPart(part[0].timestamp - 1, part[0].timestamp + 1, ctx.forced).cause
          : RAISE_PENALTIES.has(w.statusId) ? "raised" : w.cause,
        lostDamage: dealt * (1 / f - 1),
        basis: `${k(dealt)} dealt under it (${part.length} hits) × (1 ÷ ${f.toFixed(2)} − 1); ` +
          (measured ? `×${f.toFixed(2)} measured in this pull from ${measured.samples} abilities' hits with and without it`
            : `×${f} assumed (too few hits in this pull to measure it)`),
        detail: `${w.name}${w.cause ? ` from ${w.cause}` : ""} for ${s(end - w.startMs)}`,
      }));
    }
  }
  return out;
}

// ── Procs ──────────────────────────────────────────────────────────────

export function checkProcs(ctx: PlayerCheckContext): DamageFinding[] {
  const out: DamageFinding[] = [];
  const { player } = ctx;
  if (!player.buffs) return out;
  const own = player.buffs
    .filter((e) => e.source === player.name && !ctx.game.jobProcStatusIds?.has(e.abilityId))
    .sort((a, b) => a.timestamp - b.timestamp);
  const casts = player.casts;
  const castNear = (t: number) => casts.find((c) => Math.abs(c.timestamp - t) <= PROC_CONSUME_MS);

  // Which statuses one ability consistently consumes.
  // A removal at the status's natural expiry isn't a consumption, even
  // with a cast beside it: timed buffs (Power Surge, Dissipation) ended
  // next to a High Jump or Broil often enough to pass as procs.
  const removals = new Map<number, number>();
  const consumedBy = new Map<number, Map<number, number>>();
  const expiry = new Map<number, number>();
  for (const e of own) {
    if (e.buffStatus === "applied" || e.buffStatus === "refreshed") {
      if (e.durationMs) expiry.set(e.abilityId, e.timestamp + e.durationMs);
      continue;
    }
    if (e.buffStatus !== "removed" && e.buffStatus !== "stackRemoved") continue;
    removals.set(e.abilityId, (removals.get(e.abilityId) ?? 0) + 1);
    const ends = expiry.get(e.abilityId);
    if (e.buffStatus === "removed" && ends !== undefined && e.timestamp >= ends - PROC_EXPIRY_EARLY_MS) continue;
    for (const c of casts.filter((x) => Math.abs(x.timestamp - e.timestamp) <= PROC_CONSUME_MS)) {
      const m = consumedBy.get(e.abilityId) ?? new Map<number, number>();
      m.set(c.abilityId, (m.get(c.abilityId) ?? 0) + 1);
      consumedBy.set(e.abilityId, m);
    }
  }
  const consumer = new Map<number, number>();
  for (const [statusId, n] of removals) {
    const top = [...(consumedBy.get(statusId) ?? new Map<number, number>()).entries()].sort((a, b) => b[1] - a[1])[0];
    if (n >= PROC_MIN_REMOVALS && top && top[1] >= n * PROC_CONSUMED_SHARE) consumer.set(statusId, top[0]);
  }

  const state = new Map<number, { expiresAt?: number; stacks: number }>();
  for (const e of own) {
    if (e.timestamp >= ctx.endMs) break;
    const consumerId = consumer.get(e.abilityId);
    if (consumerId === undefined) continue;
    const st = state.get(e.abilityId);
    const lose = (t: number, n: number, how: string) => {
      const consumerName = casts.find((c) => c.abilityId === consumerId)?.abilityName ?? "its consumer";
      // The GCD it takes the place of, when the game names one.
      const replacesId = ctx.game.procReplaces?.get(consumerId);
      const replaced = replacesId !== undefined ? ctx.values.perUse(replacesId) : 0;
      const replacedName = replacesId !== undefined ? ctx.game.action(replacesId)?.name ?? "the GCD it replaces" : undefined;
      const value = Math.max(0, ctx.values.perUse(consumerId) - replaced) * n;
      // A consumer with no damage of its own (Horoscope detonates at
      // expiry by design) loses nothing.
      if (value <= 0) return;
      const forced = inWindows(t, mergeWindows(ctx.forced));
      out.push(finding(ctx, {
        kind: "proc-lost", startMs: t, endMs: t, forced,
        label: `${e.abilityName} ${how}`,
        cause: forced ? forcedPart(t - 1, t + 1, ctx.forced).cause : undefined,
        lostDamage: value, inference: true,
        basis: replacedName
          ? `${n} × (${k(ctx.values.perUse(consumerId))} average ${consumerName} − ${k(replaced)} average ${replacedName}, the GCD it takes the place of)`
          : `${n} × ${k(ctx.values.perUse(consumerId))} average ${consumerName} (upper bound: the GCD used instead did some damage)`,
        detail: `${e.abilityName} ${how}${n > 1 ? ` with ${n} stacks` : ""}`,
      }));
    };
    if (e.buffStatus === "applied" || e.buffStatus === "refreshed") {
      state.set(e.abilityId, { expiresAt: e.durationMs ? e.timestamp + e.durationMs : undefined, stacks: e.stack ?? st?.stacks ?? 1 });
    } else if (e.buffStatus === "stack" || e.buffStatus === "stackRemoved") {
      if (st) st.stacks = e.stack ?? st.stacks;
    } else if (e.buffStatus === "removed") {
      // Only a consumer pressed beside the expiry used it: qjCMx4bRfgNKwX9T
      // fight 16's Paladin let Divine Might run out 0.17s before a Blade
      // of Valor, which read as consumed.
      const near = castNear(e.timestamp);
      const usedIt = near !== undefined && (near.abilityId === consumerId ||
        (consumedBy.get(e.abilityId)?.get(near.abilityId) ?? 0) >= (removals.get(e.abilityId) ?? 0) * PROC_CONSUMER_ALT_SHARE);
      if (st?.expiresAt !== undefined && !usedIt &&
          e.timestamp >= st.expiresAt - PROC_EXPIRY_EARLY_MS && e.timestamp <= st.expiresAt + PROC_EXPIRY_LATE_MS) {
        lose(e.timestamp, Math.max(1, st.stacks), "expired unused");
      }
      state.delete(e.abilityId);
    }
  }
  return out;
}

// ── Interrupted casts ──────────────────────────────────────────────────

// One finding per player for the whole pull, not one per cast: a caster
// moving through mechanics cancels a dozen (Vamp kill: 15 on the Red
// Mage), and a 0k line each buried everything else. Casts cut short by a
// death are left out; the death covers them.

export function checkInterrupts(ctx: PlayerCheckContext): DamageFinding[] {
  const cancelled: PlayerEvent[] = [];
  const begins = [...(ctx.player.beginCasts ?? [])].sort((a, b) => a.timestamp - b.timestamp);
  // Each completed cast completes only its latest begin-cast, so a cast
  // cancelled and restarted counts as cancelled.
  const completed = new Set(ctx.player.casts.map((c) => latestBegin(begins, c, 500)).filter((b) => b !== undefined));
  for (const b of begins) {
    if (b.timestamp >= ctx.endMs || !b.durationMs) continue;
    if (completed.has(b)) continue;
    const end = b.timestamp + b.durationMs;
    if (inWindows(end, ctx.dead) || overlapMs(b.timestamp, end + 500, ctx.dead) > 0) continue;
    cancelled.push(b);
  }
  if (cancelled.length === 0) return [];
  const byName = new Map<string, number>();
  for (const b of cancelled) byName.set(b.abilityName, (byName.get(b.abilityName) ?? 0) + 1);
  const names = [...byName].sort((a, b) => b[1] - a[1]).map(([n, c]) => (c > 1 ? `${n} ×${c}` : n)).join(", ");
  const first = cancelled[0], last = cancelled[cancelled.length - 1];
  return [finding(ctx, {
    kind: "interrupted-cast", startMs: first.timestamp, endMs: last.timestamp + (last.durationMs ?? 0),
    label: "Cancelled casts", forced: false,
    lostDamage: 0,
    basis: `the lost time is counted in the GCD gaps that follow; at ${cancelled.map((b) => clock(b.timestamp)).join(", ")}`,
    detail: `${cancelled.length} cast${cancelled.length === 1 ? "" : "s"} started and never went off: ${names}`,
  })];
}

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
