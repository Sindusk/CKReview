// lib/mechanics/wow/common.ts
//
// Small helpers shared by WoW encounter modules (first used by
// va/entombed-sentinels.ts and va/vashnik.ts): debuff windows, formatting,
// player error construction, and battle-rez detection for the "pull was
// over" markers.

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError } from "@/types/PullError";

// A Raid marker usually shares its millisecond with the Major errors that
// caused it. AnalysisPanel lists raids before majors and then stable-sorts
// by timestamp, so an exact tie shows the marker FIRST; 1ms later orders it
// after its causes without affecting the cutoff (which keeps errors at or
// before the marker). Same fix as kefka-says.ts's DEATH_MARKER_SORT_OFFSET_MS.
export const RAID_MARKER_SORT_OFFSET_MS = 1;

export const yd   = (units: number) => (units / 100).toFixed(1);
export const kFmt = (n: number) => `~${Math.round(n / 1000)}k`;
export const sec  = (ms: number) => (ms / 1000).toFixed(1);

export type Interval = { start: number; end: number }; // end = Infinity while still active

/** Active windows of `abilityId` on `player` (refresh/stack events keep a window open). */
export function debuffIntervals(player: PlayerInfo, abilityId: number): Interval[] {
  const out: Interval[] = [];
  let open: number | null = null;
  for (const e of player.debuffs) {
    if (e.abilityId !== abilityId) continue;
    if (e.debuffStatus === "removed") {
      if (open !== null) out.push({ start: open, end: e.timestamp });
      open = null;
    } else if (open === null) {
      open = e.timestamp;
    }
  }
  if (open !== null) out.push({ start: open, end: Infinity });
  return out;
}

export function hitsOf(player: PlayerInfo, abilityId: number): PlayerEvent[] {
  return player.damageTaken.filter((e) => e.abilityId === abilityId);
}

export function deathOf(deaths: DeathEvent[], name: string): DeathEvent | undefined {
  return deaths.find((d) => d.player === name);
}

export function joinNames(names: string[]): string {
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function playerError(
  p: PlayerInfo,
  e: Omit<PullError, "player" | "class" | "specId" | "role">
): PullError {
  return { ...e, player: p.name, class: p.className, specId: p.specId, role: p.role };
}

/** When this player was next active (hit or casting) after dying — i.e. battle-rezzed — if ever. */
export function rezzedAt(p: PlayerInfo, deathT: number, nextDeathT: number): number | undefined {
  const t = [...p.damageTaken, ...p.casts]
    .map((e) => e.timestamp)
    .filter((x) => x > deathT + 2000 && x < nextDeathT)
    .sort((a, b) => a - b)[0];
  return t;
}

/** Last event timestamp across every player — a fallback pull length. */
export function lastPlayerEventMs(players: PlayerInfo[]): number {
  return players.reduce((m, p) =>
    [...p.damageTaken, ...p.casts].reduce((mm, e) => Math.max(mm, e.timestamp), m), 0);
}
