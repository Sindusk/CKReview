// lib/damage/wow/context-helpers.ts
//
// Building blocks for the WoW bosses' damage contexts (lib/mechanics/wow/
// va/*-damage-context.ts; docs/archive/damage-analysis-plan.md, "WoW build order"
// step 4). Each turns a log signal into forced windows: time a player (or
// the raid) can't be expected to press GCDs, so the engine shows a gap
// there as forced instead of counting it.
//
// The signals are the ones the encounter modules already key on: debuffs
// on players (Pull.players[].debuffs), the boss's casts (Pull.enemyCasts)
// and buffs on enemies (Pull.enemyBuffs / enemyBuffRemovals). Pulls saved
// before 2026-10-06 have no enemy casts or buffs, so those windows come out
// empty there.

import type { Pull } from "@/types/Pull";
import type { PlayerInfo } from "@/types/PlayerInfo";
import type { ForcedWindow } from "../types";

export type PlayerFilter = (p: PlayerInfo) => boolean;

/** Tanks and melee DPS: they lose uptime when the boss or they move. */
export const isMelee: PlayerFilter = (p) => p.role === "Tank" || p.rangeType === "Melee";

/**
 * Per player: from a debuff's application to its removal (capped at maxMs),
 * extended by tailMs (time to get back to the boss). Stack changes keep a
 * window open.
 */
export function debuffWindows(
  pull: Pull,
  statusIds: number[],
  cause: string,
  opts: { tailMs?: number; maxMs?: number; who?: PlayerFilter; within?: { startMs: number; endMs: number }[] } = {},
): ForcedWindow[] {
  const ids = new Set(statusIds);
  const out: ForcedWindow[] = [];
  for (const p of pull.players) {
    if (opts.who && !opts.who(p)) continue;
    let open: number | undefined;
    const close = (t: number) => {
      if (open === undefined) return;
      const end = Math.min(t, opts.maxMs !== undefined ? open + opts.maxMs : Infinity) + (opts.tailMs ?? 0);
      const start = open;
      if (!opts.within || opts.within.some((w) => start >= w.startMs && start < w.endMs)) {
        out.push({ startMs: start, endMs: end, cause, players: [p.name] });
      }
      open = undefined;
    };
    for (const e of p.debuffs) {
      if (!ids.has(e.abilityId)) continue;
      if (e.debuffStatus === "removed") close(e.timestamp);
      else if (e.debuffStatus === "applied" && open === undefined) open = e.timestamp;
    }
    close(pull.fightDuration);
  }
  return out;
}

/**
 * From each boss cast (casts of one ability within mergeMs are one
 * instance) for durationMs, starting offsetMs after the cast. For `who`,
 * or the whole raid when unset.
 */
export function castWindows(
  pull: Pull,
  abilityIds: number[],
  durationMs: number,
  cause: string,
  opts: { offsetMs?: number; who?: PlayerFilter; mergeMs?: number } = {},
): ForcedWindow[] {
  const ids = new Set(abilityIds);
  const players = opts.who ? pull.players.filter(opts.who).map((p) => p.name) : undefined;
  if (players && players.length === 0) return [];
  const out: ForcedWindow[] = [];
  let last = -Infinity;
  for (const c of pull.enemyCasts ?? []) {
    if (!ids.has(c.abilityId)) continue;
    if (c.timestamp - last < (opts.mergeMs ?? 3_000)) continue;
    last = c.timestamp;
    const start = c.timestamp + (opts.offsetMs ?? 0);
    out.push({ startMs: start, endMs: start + durationMs, cause, players });
  }
  return out;
}

/** The pull's segments of one log phase id. */
export function phaseSpans(pull: Pull, phaseId: number): { startMs: number; endMs: number }[] {
  return (pull.phaseSegments ?? []).filter((s) => s.phase === phaseId).map((s) => ({ startMs: s.startMs, endMs: s.endMs }));
}

/**
 * Raid-wide: while any enemy has one of `buffIds` (an untargetable or
 * immunity aura), from its gain to its loss.
 */
export function enemyBuffWindows(pull: Pull, buffIds: number[], cause: string, opts: { who?: PlayerFilter } = {}): ForcedWindow[] {
  const ids = new Set(buffIds);
  const players = opts.who ? pull.players.filter(opts.who).map((p) => p.name) : undefined;
  const events = [
    ...(pull.enemyBuffs ?? []).filter((e) => ids.has(e.abilityId)).map((e) => ({ t: e.timestamp, on: true, key: `${e.actorId}:${e.abilityId}` })),
    ...(pull.enemyBuffRemovals ?? []).filter((e) => ids.has(e.abilityId)).map((e) => ({ t: e.timestamp, on: false, key: `${e.actorId}:${e.abilityId}` })),
  ].sort((a, b) => a.t - b.t);
  const open = new Map<string, number>();
  const out: ForcedWindow[] = [];
  for (const e of events) {
    if (e.on) { if (!open.has(e.key)) open.set(e.key, e.t); continue; }
    const s = open.get(e.key);
    if (s === undefined) continue;
    out.push({ startMs: s, endMs: e.t, cause, players });
    open.delete(e.key);
  }
  for (const s of open.values()) out.push({ startMs: s, endMs: pull.fightDuration, cause, players });
  return out;
}
