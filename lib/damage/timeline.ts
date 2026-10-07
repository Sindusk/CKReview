// lib/damage/timeline.ts
//
// Per-pull and per-player building blocks for the damage checks: time
// windows, the wipe collapse, death windows, raid-wide downtime, GCD uses
// and the player's observed damage values. All times are ms into the pull.
//
// ── GCD uses ───────────────────────────────────────────────────────────
// A GCD starts at its begin-cast when it has one (the "cast" event lands
// ~0.5s before the cast bar ends, docs/archive/damage-analysis-plan.md "Data check
// findings"), else at the cast. It locks the next GCD for
// max(recast × speed factor, cast time). The speed factor is the player's
// most common interval between two plain 2.5s GCDs, ÷ 2.5s: their skill or
// spell speed plus any always-on haste (Fuka, Swiftscaled). Checked on
// dQ8wmb1VhKt6yBXk pull 11: the modes were 2.50 (tanks, PCT), 2.40
// (healers), 2.15 (SAM) and 2.10 (VPR) and matched their gear.
//
// WoW (DamageGame's optional hooks, lib/damage/wow/game.ts): `fake` casts
// are skipped; a channel's lock runs to its last tick (channelLocks); the
// base is the player's most common recast (1.5s hasted, or 1.0s fixed and
// never scaled); and GCDs inside haste windows (Bloodlust, Power Infusion)
// get their own factor (speedProfile). With the hooks unset, FFXIV's output
// is unchanged (checked byte for byte on dQ8wmb1VhKt6yBXk, 2026-10-06).
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
  target?:     string;      // the cast's target name, when it has one
};

export function gcdUses(player: PlayerInfo, game: DamageGame): GcdUse[] {
  const begins = [...(player.beginCasts ?? [])].sort((a, b) => a.timestamp - b.timestamp);
  const used = new Set<PlayerEvent>();
  const out: GcdUse[] = [];
  for (const c of player.casts) {
    if (c.fake) continue; // made by the log (WoW), not pressed
    const action = game.action(c.abilityId);
    if (!action?.onGcd) continue;
    const b = begins.find((x) => !used.has(x) && x.abilityId === c.abilityId &&
      c.timestamp >= x.timestamp && c.timestamp <= x.timestamp + (x.durationMs ?? 0) + 300);
    if (b) used.add(b);
    out.push({ startMs: b?.timestamp ?? c.timestamp, castMs: b?.durationMs ?? 0, action, abilityName: c.abilityName, target: c.target });
  }
  out.sort((a, b) => a.startMs - b.startMs);
  if (game.isChannel) channelLocks(player, game, out);
  return out;
}

/**
 * A channel logs its cast at the start and nothing at the end (WoW), so its
 * lock runs to the last tick of the same ability (damage or heal) before the
 * next GCD starts. Ticks are matched by ability name: they often log under
 * another id (Arcane Missiles 5143 → 7268, Eye Beam 198013 → 198030, Fists
 * of Fury 113656 → 117418 on kGVX7tafBT2pM1N3 pull 19). A channel with no
 * ticks keeps the plain GCD lock.
 */
function channelLocks(player: PlayerInfo, game: DamageGame, uses: GcdUse[]): void {
  const ticks = new Map<string, number[]>();
  for (const e of [...player.damageDone, ...player.healing]) {
    if (e.pet) continue;
    const list = ticks.get(e.abilityName) ?? [];
    list.push(e.timestamp);
    ticks.set(e.abilityName, list);
  }
  for (const list of ticks.values()) list.sort((a, b) => a - b);
  for (let i = 0; i < uses.length; i++) {
    const u = uses[i];
    if (!game.isChannel!(u.action.id)) continue;
    const until = uses[i + 1]?.startMs ?? Infinity;
    let last: number | undefined;
    for (const t of ticks.get(u.abilityName) ?? []) {
      if (t <= u.startMs) continue;
      if (t > until) break;
      last = t;
    }
    if (last !== undefined) u.castMs = Math.max(u.castMs, last - u.startMs);
  }
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
export function speedFactor(uses: GcdUse[], game?: DamageGame): number {
  return speedProfile(uses, game, []).factor;
}

export type SpeedProfile = {
  baseRecastMs: number;           // the plain GCD the factor scales (FFXIV 2.5s)
  factor:       number;           // outside haste windows
  at(t: number): number;          // the factor for a GCD starting at t
  hasteFactor?: number;           // inside haste windows, when there are any
};

// A haste window with too few GCDs to measure falls back to this (Bloodlust's
// +30%).
const FALLBACK_HASTE = 1.3;

/**
 * The player's GCD speed: the most common interval between two plain GCDs
 * (speed-scaled, recast = the base, not a hard cast longer than it), ÷ the
 * base. FFXIV's base is 2.5s; a game with `speed` set (WoW) uses the
 * player's most common speed-scaled recast instead. GCDs starting inside
 * `hasteWindows` (Bloodlust, Power Infusion) are measured apart, so a
 * pull's lust doesn't drag the normal factor down or the reverse.
 */
export function speedProfile(uses: GcdUse[], game: DamageGame | undefined, hasteWindows: Window[]): SpeedProfile {
  const minShare = game?.speed?.minIntervalShare ?? 0.6;
  const minFactor = game?.speed?.minFactor ?? 0.7;
  let base = 2500, baseScaled = true;
  if (game?.speed) {
    // The player's most common GCD recast. When it isn't speed-scaled
    // (WoW's fixed 1.0s specs), the factor stays 1: a Windwalker's
    // occasional hasted Vivify mustn't set their GCD.
    const recasts = new Map<string, { r: number; scaled: boolean; n: number }>();
    for (const u of uses) {
      const key = `${u.action.recastMs}|${u.action.speedScaled}`;
      const x = recasts.get(key) ?? { r: u.action.recastMs, scaled: u.action.speedScaled, n: 0 };
      x.n++;
      recasts.set(key, x);
    }
    let n = 0;
    for (const x of recasts.values()) if (x.n > n) { base = x.r; baseScaled = x.scaled; n = x.n; }
  }
  if (!baseScaled) return { baseRecastMs: base, factor: 1, at: () => 1 };
  const counts = [new Map<number, number>(), new Map<number, number>()]; // outside, inside haste
  for (let i = 1; i < uses.length; i++) {
    const prev = uses[i - 1];
    if (prev.action.recastMs !== base || !prev.action.speedScaled || prev.castMs > base) continue;
    const iv = uses[i].startMs - prev.startMs;
    if (iv < base * minShare || iv > base * 1.04) continue;
    const bucket = Math.round(iv / 10) * 10;
    const m = counts[inWindows(prev.startMs, hasteWindows) ? 1 : 0];
    m.set(bucket, (m.get(bucket) ?? 0) + 1);
  }
  const mode = (m: Map<number, number>, min: number) => {
    let best: number | undefined, bestN = 0;
    for (const [b, n] of m) if (n > bestN) { best = b; bestN = n; }
    return bestN >= min ? best : undefined;
  };
  const clamp = (f: number) => Math.min(1, Math.max(minFactor, f));
  const factor = clamp((mode(counts[0], 1) ?? base) / base);
  if (hasteWindows.length === 0) return { baseRecastMs: base, factor, at: () => factor };
  const inside = mode(counts[1], 5);
  const hasteFactor = inside !== undefined ? clamp(inside / base) : clamp(factor / FALLBACK_HASTE);
  return { baseRecastMs: base, factor, hasteFactor, at: (t) => (inWindows(t, hasteWindows) ? hasteFactor : factor) };
}

/** Windows where any of `statusIds` is on the player (player-buff stream). */
export function statusWindows(player: PlayerInfo, statusIds: Set<number> | undefined, endMs: number): Window[] {
  if (!statusIds || statusIds.size === 0) return [];
  const out: Window[] = [];
  const open = new Map<number, number>();
  for (const e of player.buffs ?? []) {
    if (!statusIds.has(e.abilityId)) continue;
    if (e.buffStatus === "removed") {
      const s = open.get(e.abilityId);
      if (s !== undefined) { out.push({ startMs: s, endMs: e.timestamp }); open.delete(e.abilityId); }
    } else if (!open.has(e.abilityId)) open.set(e.abilityId, e.timestamp);
  }
  for (const s of open.values()) out.push({ startMs: s, endMs });
  return mergeWindows(out);
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

// ── What each GCD did ──────────────────────────────────────────────────

export type GcdKind = "heal" | "damage" | "other";

/**
 * Per GCD ability: "damage" if it (or a DoT it applies) shows in the
 * player's damage done; else "heal" if it (or a HoT / shield it applies)
 * shows in their landed heals or anyone's shield absorbs; else "other"
 * (raises, Esuna). A GCD that does both counts as damage.
 */
export function gcdKinds(player: PlayerInfo, pull: Pull, uses: GcdUse[]): Map<number, GcdKind> {
  const damageIds = new Set(player.damageDone.map((e) => e.abilityId));
  const healIds = new Set(player.healing
    .filter((e) => (e.healType === undefined || e.healType === "heal") && ((e.amount ?? 0) > 0 || (e.overheal ?? 0) > 0))
    .map((e) => e.abilityId));
  const shieldIds = new Set(pull.players.flatMap((p) => p.shieldAbsorbs ?? [])
    .filter((a) => a.caster === player.name).map((a) => a.statusId));
  const out = new Map<number, GcdKind>();
  for (const u of uses) {
    const a = u.action;
    if (out.has(a.id)) continue;
    const ids = [a.id, ...a.appliesStatusIds];
    out.set(a.id,
      ids.some((id) => damageIds.has(id)) ? "damage"
        : ids.some((id) => healIds.has(id) || shieldIds.has(id)) ? "heal"
          : "other");
  }
  return out;
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
    const gcdDamage = game.isGcdDamage
      ? game.isGcdDamage(e)
      : game.isTickAbility(e.abilityId) || e.isDoT || game.action(e.abilityId)?.onGcd;
    if (gcdDamage) {
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
