// lib/damage/timeline.ts
//
// Per-pull and per-player building blocks for the damage checks: time
// windows, the wipe collapse, death windows, raid-wide downtime, GCD uses
// and the player's observed damage values. All times are ms into the pull.
//
// ── GCD uses ───────────────────────────────────────────────────────────
// A GCD starts at its begin-cast when it has one (the "cast" event lands
// ~0.5s before the cast bar ends, docs/damage-analysis-plan.md "Data check
// findings"), else at the cast. It locks the next GCD for
// max(recast × speed factor, cast time). The speed factor is the player's
// most common interval between two plain 2.5s GCDs, ÷ 2.5s: their skill or
// spell speed plus any always-on haste (Fuka, Swiftscaled). Checked on
// dQ8wmb1VhKt6yBXk pull 11: the modes were 2.50 (tanks, PCT), 2.40
// (healers), 2.15 (SAM) and 2.10 (VPR) and matched their gear.
//
// ── Raid downtime ──────────────────────────────────────────────────────
// Inferred from the log: any stretch of RAID_DOWNTIME_MIN_MS+ in which no
// player landed a direct hit on an enemy, plus the time before the first
// hit. With eight players attacking, a stretch like that means nothing was
// targetable (a transition, a jump). It is the fallback awareness every
// fight gets, with or without a DamageContext.

import type { Pull } from "@/types/Pull";
import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DamageGame, ForcedWindow, GameAction } from "./types";

export type Window = { startMs: number; endMs: number };

export const RAID_DOWNTIME_MIN_MS = 3_000;
// A wipe's log runs on with the raid dead; stop at the 6th death within
// 15s (docs/dps-analysis.md, method step 2).
export const COLLAPSE_DEATHS = 6;
export const COLLAPSE_WINDOW_MS = 15_000;

// ── Windows ────────────────────────────────────────────────────────────

export function mergeWindows<T extends Window>(windows: T[]): Window[] {
  const sorted = [...windows].filter((w) => w.endMs > w.startMs).sort((a, b) => a.startMs - b.startMs);
  const out: Window[] = [];
  for (const w of sorted) {
    const last = out[out.length - 1];
    if (last && w.startMs <= last.endMs) last.endMs = Math.max(last.endMs, w.endMs);
    else out.push({ startMs: w.startMs, endMs: w.endMs });
  }
  return out;
}

/** ms of [startMs, endMs] covered by `windows` (which must not overlap; merge first). */
export function overlapMs(startMs: number, endMs: number, windows: Window[]): number {
  let sum = 0;
  for (const w of windows) {
    const s = Math.max(startMs, w.startMs), e = Math.min(endMs, w.endMs);
    if (e > s) sum += e - s;
  }
  return sum;
}

export function inWindows(t: number, windows: Window[]): boolean {
  return windows.some((w) => t >= w.startMs && t < w.endMs);
}

/** How much of [startMs, endMs] is forced, and the cause covering most of it. */
export function forcedPart(startMs: number, endMs: number, forced: ForcedWindow[]): { ms: number; cause?: string } {
  const ms = overlapMs(startMs, endMs, mergeWindows(forced));
  if (ms <= 0) return { ms: 0 };
  let best: { cause: string; ms: number } | undefined;
  for (const w of forced) {
    const o = overlapMs(startMs, endMs, [w]);
    if (o > 0 && (!best || o > best.ms)) best = { cause: w.cause, ms: o };
  }
  return { ms, cause: best?.cause };
}

// ── Pull-wide ──────────────────────────────────────────────────────────

/** The 6th death within 15s, or undefined if the raid never collapsed. */
export function wipeCollapseMs(pull: Pull): number | undefined {
  if (pull.result === "Kill") return undefined;
  const times = pull.deathEvents.map((d) => d.timestamp).sort((a, b) => a - b);
  for (let i = COLLAPSE_DEATHS - 1; i < times.length; i++) {
    if (times[i] - times[i - (COLLAPSE_DEATHS - 1)] <= COLLAPSE_WINDOW_MS) return times[i];
  }
  return undefined;
}

export function raidDowntime(pull: Pull, endMs: number, game: DamageGame): ForcedWindow[] {
  const hits = pull.players
    .flatMap((p) => p.damageDone)
    .filter((e) => !e.isDoT && !game.isTickAbility(e.abilityId) && e.timestamp < endMs)
    .map((e) => e.timestamp)
    .sort((a, b) => a - b);
  if (hits.length === 0) return [{ startMs: 0, endMs, cause: "nothing to attack" }];
  const out: ForcedWindow[] = [{ startMs: 0, endMs: hits[0], cause: "before the first hit" }];
  for (let i = 1; i < hits.length; i++) {
    if (hits[i] - hits[i - 1] >= RAID_DOWNTIME_MIN_MS) {
      out.push({ startMs: hits[i - 1], endMs: hits[i], cause: "boss untargetable" });
    }
  }
  if (endMs - hits[hits.length - 1] >= RAID_DOWNTIME_MIN_MS) {
    out.push({ startMs: hits[hits.length - 1], endMs, cause: "boss untargetable" });
  }
  return out.filter((w) => w.endMs > w.startMs);
}

// ── Per player ─────────────────────────────────────────────────────────

/** Death → first sign of activity after it (there is no raise event). */
export function deadWindows(player: PlayerInfo, pull: Pull, endMs: number): Window[] {
  const activity = [...player.casts, ...player.damageDone, ...player.healing]
    .map((e) => e.timestamp)
    .sort((a, b) => a - b);
  const out: Window[] = [];
  for (const d of pull.deathEvents.filter((x) => x.player === player.name && x.timestamp < endMs)) {
    const back = activity.find((t) => t > d.timestamp);
    out.push({ startMs: d.timestamp, endMs: Math.min(back ?? endMs, endMs) });
  }
  return mergeWindows(out);
}

export type GcdUse = {
  startMs:     number;
  castMs:      number;      // cast time after speed; 0 for instants
  action:      GameAction;
  abilityName: string;
};

export function gcdUses(player: PlayerInfo, game: DamageGame): GcdUse[] {
  const begins = [...(player.beginCasts ?? [])].sort((a, b) => a.timestamp - b.timestamp);
  const used = new Set<PlayerEvent>();
  const out: GcdUse[] = [];
  for (const c of player.casts) {
    const action = game.action(c.abilityId);
    if (!action?.onGcd) continue;
    const b = begins.find((x) => !used.has(x) && x.abilityId === c.abilityId &&
      c.timestamp >= x.timestamp && c.timestamp <= x.timestamp + (x.durationMs ?? 0) + 300);
    if (b) used.add(b);
    out.push({ startMs: b?.timestamp ?? c.timestamp, castMs: b?.durationMs ?? 0, action, abilityName: c.abilityName });
  }
  return out.sort((a, b) => a.startMs - b.startMs);
}

// A limit break locks the player out for roughly this long after it goes
// off (tank and melee LB3 animations run ~3.5–4s; xivanalysis treats LBs
// as downtime too).
export const LIMIT_BREAK_LOCK_MS = 4_000;

export function limitBreakWindows(uses: GcdUse[]): ForcedWindow[] {
  return uses
    .filter((u) => u.action.limitBreak)
    .map((u) => ({ startMs: u.startMs, endMs: u.startMs + u.castMs + LIMIT_BREAK_LOCK_MS, cause: `limit break (${u.abilityName})` }));
}

/** Observed GCD ÷ 2.5s, from the most common interval between plain GCDs. */
export function speedFactor(uses: GcdUse[]): number {
  const counts = new Map<number, number>();
  for (let i = 1; i < uses.length; i++) {
    const prev = uses[i - 1];
    if (prev.action.recastMs !== 2500 || !prev.action.speedScaled || prev.castMs > 2500) continue;
    const iv = uses[i].startMs - prev.startMs;
    if (iv < 1500 || iv > 2600) continue;
    const bucket = Math.round(iv / 10) * 10;
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  let best = 2500, bestN = 0;
  for (const [b, n] of counts) if (n > bestN) { best = b; bestN = n; }
  return Math.min(1, Math.max(0.7, best / 2500));
}

/** How long a GCD use blocks the next one. */
export function gcdLockMs(use: GcdUse, factor: number): number {
  const recast = use.action.speedScaled ? use.action.recastMs * factor : use.action.recastMs;
  return Math.max(recast, use.castMs);
}

/**
 * Windows where any raid buff is on this player: from the player-buff
 * stream, plus the party's boss debuffs (Chain Stratagem, Dokumori, Mug)
 * on any target.
 */
export function raidBuffWindows(player: PlayerInfo, pull: Pull, game: DamageGame, endMs: number): Window[] {
  const out: Window[] = [];
  const open = new Map<string, number>();
  const events: { t: number; key: string; on: boolean }[] = [];
  for (const e of player.buffs ?? []) {
    if (!game.raidBuffStatusIds.has(e.abilityId)) continue;
    events.push({ t: e.timestamp, key: `p${e.abilityId}`, on: e.buffStatus !== "removed" });
  }
  for (const e of pull.bossDebuffs ?? []) {
    if (!game.raidBuffStatusIds.has(e.statusId)) continue;
    events.push({ t: e.timestamp, key: `b${e.statusId}:${e.targetActorId}`, on: e.status !== "removed" });
  }
  events.sort((a, b) => a.t - b.t);
  for (const ev of events) {
    if (ev.on) { if (!open.has(ev.key)) open.set(ev.key, ev.t); }
    else if (open.has(ev.key)) { out.push({ startMs: open.get(ev.key)!, endMs: ev.t }); open.delete(ev.key); }
  }
  for (const start of open.values()) out.push({ startMs: start, endMs });
  return mergeWindows(out);
}

// ── Observed damage values ─────────────────────────────────────────────

export type PlayerValues = {
  // Average damage of this player's GCDs (direct GCD hits plus DoT ticks,
  // ÷ GCDs used) in a phase, inside or outside raid buffs.
  gcdValue(phaseId: number | undefined, buffed: boolean): number;
  // Average direct damage per cast of an ability over the pull.
  perUse(abilityId: number): number;
  // Damage per ms alive, in a phase.
  ratePerMs(phaseId: number | undefined): number;
  damageIn(startMs: number, endMs: number): number;
  total: number;
};

export function playerValues(
  player: PlayerInfo,
  game: DamageGame,
  uses: GcdUse[],
  buffWindows: Window[],
  dead: Window[],
  phaseOf: (t: number) => number | undefined,
  phaseBounds: Map<number, Window>,
  endMs: number,
): PlayerValues {
  const hits = player.damageDone.filter((e) => e.timestamp < endMs);
  const key = (phase: number | undefined, buffed: boolean) => `${phase ?? "-"}:${buffed}`;
  const gcdDmg = new Map<string, number>(), gcdN = new Map<string, number>();
  const phaseDmg = new Map<number | undefined, number>();
  const perAbility = new Map<number, number>();
  let total = 0;
  for (const e of hits) {
    const amt = e.amount ?? 0;
    total += amt;
    const ph = phaseOf(e.timestamp);
    phaseDmg.set(ph, (phaseDmg.get(ph) ?? 0) + amt);
    perAbility.set(e.abilityId, (perAbility.get(e.abilityId) ?? 0) + amt);
    if (game.isTickAbility(e.abilityId) || e.isDoT || game.action(e.abilityId)?.onGcd) {
      for (const k of [key(ph, inWindows(e.timestamp, buffWindows)), key(ph, false) + "all", "all"]) {
        gcdDmg.set(k, (gcdDmg.get(k) ?? 0) + amt);
      }
    }
  }
  for (const u of uses) {
    if (u.startMs >= endMs) continue;
    const ph = phaseOf(u.startMs);
    for (const k of [key(ph, inWindows(u.startMs, buffWindows)), key(ph, false) + "all", "all"]) {
      gcdN.set(k, (gcdN.get(k) ?? 0) + 1);
    }
  }
  const casts = new Map<number, number>();
  for (const c of player.casts) if (c.timestamp < endMs) casts.set(c.abilityId, (casts.get(c.abilityId) ?? 0) + 1);
  const avg = (k: string) => ((gcdN.get(k) ?? 0) >= 5 ? (gcdDmg.get(k) ?? 0) / gcdN.get(k)! : undefined);

  return {
    gcdValue: (phase, buffed) =>
      avg(key(phase, buffed)) ?? avg(key(phase, false) + "all") ?? avg("all") ?? 0,
    perUse: (abilityId) => {
      const n = casts.get(abilityId) ?? 0;
      return n > 0 ? (perAbility.get(abilityId) ?? 0) / n : 0;
    },
    ratePerMs: (phase) => {
      const b = phase !== undefined ? phaseBounds.get(phase) : { startMs: 0, endMs };
      if (!b) return total / Math.max(1, endMs);
      const end = Math.min(b.endMs, endMs);
      const alive = end - b.startMs - overlapMs(b.startMs, end, dead);
      return alive > 0 ? (phaseDmg.get(phase) ?? 0) / alive : 0;
    },
    damageIn: (s, e) => hits.filter((h) => h.timestamp >= s && h.timestamp < e).reduce((a, h) => a + (h.amount ?? 0), 0),
    total,
  };
}
