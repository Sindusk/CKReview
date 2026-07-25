// lib/mechanics/player-position.ts
//
// THE shared "where was this player standing at time T" lookup, used by
// every mechanic module (FFXIV and WoW). Replaces four near-identical
// per-module implementations (forsaken's findNearestPosition, limitcut's
// findOwnPositionNear, stompies' and midnightfalls' nearestPosition) that
// had drifted into small variations — the variations were real, though
// (each module's streams/direction/window are tuned to validated behavior),
// so they're expressed here as options and each module passes its own.
//
// ── WHICH EVENT STREAMS CARRY A PLAYER'S OWN POSITION (the whole reason
//    this is subtle — see lib/mechanics/README.md's position-semantics
//    table for the full background) ─────────────────────────────────────────
//
// Logs only attach coordinates to an event's TARGET. So:
//
// - `player.damageTaken` — always this player's own position (they're the
//   target). The safest stream, but requires something to have HIT them.
// - `player.healing` — the x/y belongs to whoever RECEIVED the heal, and
//   the two PlayerInfo builders orient this stream OPPOSITE ways: the real
//   app's is heals CAST BY this player (target === player.name marks a
//   self-heal), the validation harness's is heals RECEIVED BY this player
//   (source === player.name marks the same thing). A SELF-heal is the one
//   entry safe to read as "this player's own position" under EITHER
//   orientation, which is why `healing: "self"` checks BOTH target and
//   source against the player's name. This dual-check exists because the
//   single-sided version passed every harness run clean and still produced
//   scrambled results in the real app (wrong players flagged on report
//   LF2yJZabVprjXYvm pull 1) — the harness's orientation made ANY healing
//   entry a valid self-position sample, hiding the bug.
//   Natural HP regen (ability 1302, ~every 3s in FFXIV) makes self-heals a
//   dependable passive position source even for idle players.
// - `positionSamples` — positions from something the player DID (landed a
//   hit on the boss), via FFLogs' hostilityType:Enemies + DamageTaken
//   stream (fflBuildPlayerPositionSamples). ~GCD-density for anyone
//   actively attacking; the only stream that stays live through a pure
//   repositioning window where nothing happens TO the player. FFXIV-only.
// - `healing: "all"` — trusts every healing entry's x/y as this player's
//   position. Only correct under the harness's received-heals orientation;
//   under the app's cast-heals orientation it can return a heal RECIPIENT's
//   position instead. Grandfathered for forsaken.ts, whose validated
//   behavior was tuned with this fallback — do NOT use it in new code; use
//   "self" (the default).
//
// Always give `windowMs` a deliberate value: a position sample that's too
// old can predate the player's final, fatal move (a real case had a heal 8s
// out sitting near arena center, nowhere near the bait ring the player died
// on). Fail closed — returning undefined is better than trusting a stale
// position.

import type { PlayerInfo } from "@/types/PlayerInfo";

export interface Position {
  x: number;
  y: number;
}

/** One "player X stood at (x,y) at time t" sample from an external stream (FFXIV: fflBuildPlayerPositionSamples). */
export interface PositionSample {
  timestamp: number;
  playerName: string;
  x: number;
  y: number;
}

export interface FindPlayerPositionOptions {
  /**
   * Max distance in ms between `timestamp` and the sample used
   * ("nearest" mode: |delta| both sides; "atOrBefore" mode: staleness).
   */
  windowMs: number;
  /**
   * "nearest" (default): closest sample on either side of `timestamp`.
   * "atOrBefore": latest sample at or before `timestamp` — for moments
   * where a later position would already reflect the mechanic's outcome
   * (e.g. where someone stood BEFORE a dash resolved).
   */
  direction?: "nearest" | "atOrBefore";
  /**
   * Which healing entries to trust as this player's own position:
   * "self" (default) — only self-heals, via the target-AND-source dual
   * check (see header); "all" — every entry (grandfathered, forsaken only);
   * "none" — ignore healing entirely (WoW midnightfalls' convention).
   */
  healing?: "self" | "all" | "none";
  /** Include `player.damageTaken` (default true). */
  damageTaken?: boolean;
  /** External per-player samples (FFXIV boss-hit stream); filtered to this player by name. */
  positionSamples?: PositionSample[];
}

/**
 * This player's own position closest to `timestamp`, from every stream the
 * options enable, or undefined if nothing lands within `windowMs`.
 * Streams are considered in order (damageTaken, healing, positionSamples)
 * and ties keep the earliest-considered sample, preserving each original
 * implementation's tie-breaking.
 */
export function findPlayerPosition(
  player: PlayerInfo,
  timestamp: number,
  options: FindPlayerPositionOptions
): Position | undefined {
  const { windowMs, direction = "nearest", healing = "self", damageTaken = true, positionSamples } = options;

  let best: Position | undefined;
  let bestScore = Infinity;
  const consider = (t: number, x: number | undefined, y: number | undefined) => {
    if (x === undefined || y === undefined) return;
    const score = direction === "nearest" ? Math.abs(t - timestamp) : timestamp - t;
    if (score < 0 || score > windowMs) return; // score < 0: future sample in atOrBefore mode
    if (score < bestScore) { bestScore = score; best = { x, y }; }
  };

  if (damageTaken) {
    for (const e of player.damageTaken) consider(e.timestamp, e.x, e.y);
  }
  if (healing !== "none") {
    for (const e of player.healing) {
      if (healing === "self" && e.target !== player.name && e.source !== player.name) continue;
      consider(e.timestamp, e.x, e.y);
    }
  }
  if (positionSamples) {
    for (const s of positionSamples) {
      if (s.playerName !== player.name) continue;
      consider(s.timestamp, s.x, s.y);
    }
  }
  return best;
}

// Distance/angle/bearing math lives in lib/mechanics/geometry.ts.
