// lib/damage/checks.ts
//
// The engine's generic checks (docs/damage-analysis-plan.md, Layer 1).
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
// nearby, at apply + duration, is an expiry. Overwrites (refresh while up)
// are left to the job modules: whether one loses anything depends on the
// job (a Dancer opener refreshes Last Dance Ready on purpose). Lost damage
// = the consumer's average damage (an upper bound: the GCD used instead did
// some damage too, so this is marked inference).

import type { Pull } from "@/types/Pull";
import type { PlayerInfo } from "@/types/PlayerInfo";
import type { DamageContext, DamageFinding, DamageGame, ForcedWindow } from "./types";
import {
  forcedPart, gcdLockMs, inWindows, overlapMs, mergeWindows,
  type GcdUse, type PlayerValues, type Window,
} from "./timeline";

export const GCD_TOLERANCE_MS = 150;
export const GAP_FINDING_MS = 1_000;
export const COOLDOWN_HOLD_MS = 1_250;
export const PROC_CONSUME_MS = 200;
export const PROC_EXPIRY_SLACK_MS = 600;
export const PROC_MIN_REMOVALS = 3;
export const PROC_CONSUMED_SHARE = 0.6;

export type PlayerCheckContext = {
  pull:        Pull;
  player:      PlayerInfo;
  game:        DamageGame;
  context?:    DamageContext;
  endMs:       number;
  uses:        GcdUse[];
  factor:      number;          // GCD speed factor
  baseGcdMs:   number;
  forced:      ForcedWindow[];  // every forced window for this player
  dead:        Window[];
  buffWindows: Window[];
  values:      PlayerValues;
  phaseOf(t: number): number | undefined;
  phaseName(id: number | undefined): string | undefined;
  // What mechanic was happening around [startMs, endMs], for labelling.
  mechanicAround(startMs: number, endMs: number): string | undefined;
  decidingPhaseStart?: number;
};

function finding(ctx: PlayerCheckContext, f: Omit<DamageFinding, "player" | "job" | "phaseId" | "phase">): DamageFinding {
  const phaseId = ctx.phaseOf(f.startMs);
  return { player: ctx.player.name, job: ctx.player.className, phaseId, phase: ctx.phaseName(phaseId), ...f };
}

const s = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
const k = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : `${Math.round(n / 1000)}k`);

// ── GCD gaps ───────────────────────────────────────────────────────────

export function checkGcdGaps(ctx: PlayerCheckContext): DamageFinding[] {
  const out: DamageFinding[] = [];
  const uses = ctx.uses.filter((u) => u.startMs < ctx.endMs);
  if (uses.length === 0) return out;
  const small = new Map<number | undefined, { ms: number; lost: number; start: number; end: number; n: number }>();

  const consider = (from: number, to: number, after: string) => {
    const idle = to - from - GCD_TOLERANCE_MS;
    if (idle <= 0) return;
    const start = from, end = to - GCD_TOLERANCE_MS;
    const forced = forcedPart(start, end, ctx.forced);
    const unforced = idle - forced.ms;
    const mid = start + idle / 2;
    const phaseId = ctx.phaseOf(mid);
    const value = ctx.values.gcdValue(phaseId, inWindows(mid, ctx.buffWindows));
    const perMs = value / ctx.baseGcdMs;
    if (unforced >= GAP_FINDING_MS) {
      const during = ctx.mechanicAround(start, end);
      out.push(finding(ctx, {
        kind: "gcd-gap", startMs: start, endMs: end, forced: false,
        lostDamage: unforced * perMs,
        cause: during ? `during ${during}` : undefined,
        basis: `${s(unforced)} idle ÷ ${s(ctx.baseGcdMs)} GCD × ${k(value)} average GCD${inWindows(mid, ctx.buffWindows) ? " in raid buffs" : ""}`,
        detail: `No GCD for ${s(unforced)} after ${after}${forced.ms > 0 ? ` (plus ${s(forced.ms)} forced: ${forced.cause})` : ""}`,
      }));
    } else if (unforced > 0) {
      const acc = small.get(phaseId) ?? { ms: 0, lost: 0, start, end, n: 0 };
      acc.ms += unforced; acc.lost += unforced * perMs; acc.end = end; acc.n++;
      small.set(phaseId, acc);
    }
    if (forced.ms >= 2 * ctx.baseGcdMs && unforced < GAP_FINDING_MS) {
      out.push(finding(ctx, {
        kind: "gcd-gap", startMs: start, endMs: end, forced: true,
        lostDamage: forced.ms * perMs, cause: forced.cause,
        basis: `${s(forced.ms)} forced idle × ${k(value)} average GCD`,
        detail: `No GCD for ${s(idle)} after ${after}`,
      }));
    }
  };

  for (let i = 1; i < uses.length; i++) {
    const prev = uses[i - 1];
    consider(prev.startMs + gcdLockMs(prev, ctx.factor), uses[i].startMs, prev.abilityName);
  }
  const last = uses[uses.length - 1];
  consider(last.startMs + gcdLockMs(last, ctx.factor), ctx.endMs + GCD_TOLERANCE_MS, `${last.abilityName} (to the end)`);

  for (const [phaseId, acc] of small) {
    if (acc.ms < ctx.baseGcdMs) continue;
    out.push({
      player: ctx.player.name, job: ctx.player.className, phaseId, phase: ctx.phaseName(phaseId),
      kind: "gcd-delays", startMs: acc.start, endMs: acc.end, forced: false, lostDamage: acc.lost,
      basis: `${acc.n} delays under 1s, ${s(acc.ms)} in total, valued at the phase's average GCD`,
      detail: `${s(acc.ms)} of small GCD delays (${acc.n}) in ${ctx.phaseName(phaseId) ?? "the pull"}`,
    });
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

  for (const cd of ctx.game.trackedCooldowns(ctx.player.className)) {
    const ids = new Set(cd.actionIds);
    const casts = ctx.player.casts
      .filter((c) => ids.has(c.abilityId) && c.timestamp < ctx.endMs)
      .map((c) => c.timestamp)
      .sort((a, b) => a - b);
    const capped = cappedStretches(casts, cd.cooldownMs, cd.charges, ctx.endMs);
    let unforced = 0, heldForDeciding = 0, longest: Window | undefined;
    for (const w of capped) {
      const len = w.endMs - w.startMs;
      const plain = overlapMs(w.startMs, w.endMs, forcedMerged);
      // Holding into the deciding phase only counts when the use lands in it.
      const forced = ctx.decidingPhaseStart !== undefined && w.endMs >= ctx.decidingPhaseStart
        ? overlapMs(w.startMs, w.endMs, withDeciding) : plain;
      heldForDeciding += forced - plain;
      const allowance = COOLDOWN_HOLD_MS + (w.startMs === 0 ? cd.firstUseOffsetMs : 0);
      const held = Math.max(0, len - forced - allowance);
      unforced += held;
      if (held > 0 && (!longest || len > longest.endMs - longest.startMs)) longest = w;
    }
    const lostUses = Math.floor(unforced / cd.cooldownMs);
    if (lostUses < 1 || !longest) continue;
    const perUse = cd.actionIds.reduce((a, id) => Math.max(a, ctx.values.perUse(id)), 0);
    const uses = (n: number) => `${n} use${n === 1 ? "" : "s"}`;
    out.push(finding(ctx, {
      kind: "cooldown-drift", startMs: longest.startMs, endMs: longest.endMs, forced: false,
      lostDamage: lostUses * perUse,
      basis: perUse > 0
        ? `${uses(lostUses)} × ${k(perUse)} average per ${cd.name}`
        : `${cd.name} deals no damage itself; its value isn't estimated yet`,
      inference: perUse === 0 ? true : undefined,
      detail: `${cd.name} sat ready for ${s(unforced)} in total (${uses(casts.length)}): about ${uses(lostUses)} lost` +
        (heldForDeciding > 0 ? `; ${s(heldForDeciding)} more held for the deciding phase is fine` : ""),
    }));
  }
  return out;
}

/** Stretches where every charge was ready, from pull start to endMs. */
export function cappedStretches(casts: number[], cooldownMs: number, maxCharges: number, endMs: number): Window[] {
  const out: Window[] = [];
  let charges = maxCharges, rechargeStart: number | null = null, cappedSince = 0;
  const advance = (t: number) => {
    while (charges < maxCharges && rechargeStart !== null && t >= rechargeStart + cooldownMs) {
      charges++;
      rechargeStart += cooldownMs;
      if (charges === maxCharges) { cappedSince = rechargeStart; rechargeStart = null; }
    }
  };
  for (const t of casts) {
    advance(t);
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
      forced: forced.ms >= (w.endMs - w.startMs) / 2, cause: death?.cause,
      lostDamage: (w.endMs - w.startMs) * rate,
      basis: `${s(w.endMs - w.startMs)} dead × ${k(rate * 1000)}/s (their damage per second alive in this phase); the Weakness after a raise is its own finding`,
      detail: `Dead for ${s(w.endMs - w.startMs)}${death ? ` (${death.cause})` : ""}${w.endMs >= ctx.endMs ? ", not raised before the end" : ""}`,
    });
  });
}

// ── Penalty debuffs ────────────────────────────────────────────────────

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
    const f = game.penaltyFactor(w.statusId)!;
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
        forced,
        cause: forced ? forcedPart(part[0].timestamp - 1, part[0].timestamp + 1, ctx.forced).cause
          : w.statusId === 1000043 ? "raised" : w.cause,
        lostDamage: dealt * (1 / f - 1),
        basis: `${k(dealt)} dealt under it (${part.length} hits) × (1 ÷ ${f} − 1)`,
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
  const own = player.buffs.filter((e) => e.source === player.name).sort((a, b) => a.timestamp - b.timestamp);
  const casts = player.casts;
  const castNear = (t: number) => casts.find((c) => Math.abs(c.timestamp - t) <= PROC_CONSUME_MS);

  // Which statuses one ability consistently consumes.
  const removals = new Map<number, number>();
  const consumedBy = new Map<number, Map<number, number>>();
  for (const e of own) {
    if (e.buffStatus !== "removed" && e.buffStatus !== "stackRemoved") continue;
    removals.set(e.abilityId, (removals.get(e.abilityId) ?? 0) + 1);
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
      const value = ctx.values.perUse(consumerId) * n;
      const forced = inWindows(t, mergeWindows(ctx.forced));
      out.push(finding(ctx, {
        kind: "proc-lost", startMs: t, endMs: t, forced,
        cause: forced ? forcedPart(t - 1, t + 1, ctx.forced).cause : undefined,
        lostDamage: value, inference: true,
        basis: `${n} × ${k(ctx.values.perUse(consumerId))} average ${consumerName} (upper bound: the GCD used instead did some damage)`,
        detail: `${e.abilityName} ${how}${n > 1 ? ` with ${n} stacks` : ""}`,
      }));
    };
    if (e.buffStatus === "applied" || e.buffStatus === "refreshed") {
      state.set(e.abilityId, { expiresAt: e.durationMs ? e.timestamp + e.durationMs : undefined, stacks: e.stack ?? st?.stacks ?? 1 });
    } else if (e.buffStatus === "stack" || e.buffStatus === "stackRemoved") {
      if (st) st.stacks = e.stack ?? st.stacks;
    } else if (e.buffStatus === "removed") {
      if (st?.expiresAt !== undefined && !castNear(e.timestamp) &&
          Math.abs(e.timestamp - st.expiresAt) <= PROC_EXPIRY_SLACK_MS) {
        lose(e.timestamp, Math.max(1, st.stacks), "expired unused");
      }
      state.delete(e.abilityId);
    }
  }
  return out;
}

// ── Interrupted casts ──────────────────────────────────────────────────

export function checkInterrupts(ctx: PlayerCheckContext): DamageFinding[] {
  const out: DamageFinding[] = [];
  for (const b of ctx.player.beginCasts ?? []) {
    if (b.timestamp >= ctx.endMs || !b.durationMs) continue;
    const done = ctx.player.casts.some((c) => c.abilityId === b.abilityId &&
      c.timestamp >= b.timestamp && c.timestamp <= b.timestamp + b.durationMs + 500);
    if (done) continue;
    const end = b.timestamp + b.durationMs;
    const dead = inWindows(end, ctx.dead) || overlapMs(b.timestamp, end + 500, ctx.dead) > 0;
    out.push(finding(ctx, {
      kind: "interrupted-cast", startMs: b.timestamp, endMs: end,
      forced: dead, cause: dead ? "died while casting" : ctx.mechanicAround(b.timestamp, end),
      lostDamage: 0,
      basis: "the lost time is counted in the GCD gap that follows",
      detail: `${b.abilityName} cast started and never went off`,
    }));
  }
  return out;
}
