// lib/mechanics/player-position.ts
//
// THE shared "where was this player standing at time T" lookup, used by
// every mechanic module (FFXIV and WoW). Replaces four near-identical
// per-module implementations (forsaken's findNearestPosition, limitcut's
// findOwnPositionNear, stompies' and midnightfalls' nearestPosition) that
// had drifted into small variations.
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
//   orientation — checked via BOTH target and source against the player's
//   name. This dual-check exists because the single-sided version passed
//   every harness run clean and still produced scrambled results in the
//   real app (wrong players flagged on report LF2yJZabVprjXYvm pull 1) —
//   the harness's orientation made ANY healing entry a valid self-position
//   sample, hiding the bug. Natural HP regen (ability 1302, ~every 3s in
//   FFXIV) makes self-heals a dependable passive position source even for
//   idle players.
// - `positionSamples` — positions from something the player DID (landed a
//   hit on the boss), via FFLogs' hostilityType:Enemies + DamageTaken
//   stream (fflBuildPlayerPositionSamples). ~GCD-density for anyone
//   actively attacking; the only stream that stays live through a pure
//   repositioning window where nothing happens TO the player. FFXIV-only,
//   and the only stream that isn't part of PlayerInfo itself — a mechanic
//   module builds this array separately and passes it in per call.
// - `player.casts` — same shape as healing: x/y belongs to whoever the cast
//   TARGETED, and only a genuine self-target cast (target === player.name,
//   e.g. a self-buff) is safe to read as this player's own position. Unlike
//   healing there's no orientation split to worry about — both the real
//   pipeline and the harness build `casts` as "cast BY this player", so
//   `target` always means the same thing. Useful as a last-resort position
//   source for a player who wasn't hit by anything and isn't a healer
//   (nothing to self-heal with) — e.g. graven-image.ts's stack-anchor check.
// - `player.healingReceived` — FFXIV only, heals landing ON this player
//   from ANY source (not just self-casts). Unlike `player.healing`, no
//   self/orientation caveat applies at all: targetResources always belongs
//   to the target, and the target here always IS this player, so every
//   entry is trustworthy unconditionally. Confirmed (2026-07-29, report
//   Q3GzJNZg64k1hLRm pull 18): a non-healer (tank/DPS) rarely self-heals,
//   starving `healing`-based lookups, but lands a raid heal from an actual
//   healer almost every GCD — by far the densest position source here
//   short of damageTaken. Empty for WoW (WCLHealEvent carries no position).
//
// Always give `windowMs` a deliberate value: a position sample that's too
// old can predate the player's final, fatal move (a real case had a heal 8s
// out sitting near arena center, nowhere near the bait ring the player died
// on). Fail closed — returning undefined is better than trusting a stale
// position.
//
// ── EVERY STREAM IS ALWAYS CHECKED — NOT CONFIGURABLE (2026-07-31) ────────
//
// This used to be a per-call-site choice (`healing: "self"|"all"|"none"`,
// `casts: "self"|"none"`, `healingReceived: "any"|"none"`, `damageTaken:
// boolean`) so each module could opt in gradually as streams were added.
// That configurability turned into a real bug: wave-cannon.ts's
// snapshot-offset interpolation only ever enabled `healing: "self"`, so a
// stale 1.3s-old self-heal bracket manufactured a "still walking" position
// for a player the user confirmed via VOD was already stationary —
// `healingReceived` (added 2026-07-29) would have supplied a bracket
// sample ~700ms closer to the truth the whole time, but nobody had gone
// back to wire it in. A full audit (2026-07-31) found every other module
// in the same state to varying degrees (forsaken.ts was even using the
// unsafe `healing: "all"` fallback). Per the user directly: there is no
// good reason a position lookup should ever deliberately ignore a stream
// that could carry real data, so the choice was removed rather than left
// as a footgun for the next mechanic to quietly under-use. `damageTaken`,
// `healing` (self dual-check), `casts` (self-target), and
// `healingReceived` are now ALWAYS checked — the only remaining knobs are
// `windowMs` (staleness bound, still genuinely per-call), `direction`
// (temporal semantics — "nearest" vs "atOrBefore" — not a stream choice),
// and `positionSamples` (an external array a caller must supply, not a
// toggle on data that already lives on PlayerInfo).
//
// If a future mechanic genuinely needs to exclude a stream (e.g. to avoid
// re-finding the exact same event it's independently cross-checking
// against — the shape graven-image.ts's "prior position" fallback used to
// worry about, though that case turned out to already be unreachable via
// its own `atOrBefore` timing), that's a deliberate, visible change to
// THIS shared function, not a quiet per-call-site opt-out — treat it as
// rare enough to warrant its own review, not a default anyone reaches for.

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
  /** External per-player samples (FFXIV boss-hit stream); filtered to this player by name. */
  positionSamples?: PositionSample[];
}

/**
 * This player's own position closest to `timestamp`, from every stream that
 * can carry one (damageTaken, self-heals, self-casts, healingReceived, plus
 * `positionSamples` if given), or undefined if nothing lands within
 * `windowMs`. Streams are considered in that order and ties keep the
 * earliest-considered sample.
 */
export function findPlayerPosition(
  player: PlayerInfo,
  timestamp: number,
  options: FindPlayerPositionOptions
): Position | undefined {
  const { windowMs, direction = "nearest", positionSamples } = options;

  let best: Position | undefined;
  let bestScore = Infinity;
  const consider = (t: number, x: number | undefined, y: number | undefined) => {
    if (x === undefined || y === undefined) return;
    const score = direction === "nearest" ? Math.abs(t - timestamp) : timestamp - t;
    if (score < 0 || score > windowMs) return; // score < 0: future sample in atOrBefore mode
    if (score < bestScore) { bestScore = score; best = { x, y }; }
  };

  for (const e of player.damageTaken) consider(e.timestamp, e.x, e.y);
  for (const e of player.healing) {
    if (e.target !== player.name && e.source !== player.name) continue;
    consider(e.timestamp, e.x, e.y);
  }
  for (const e of player.casts) {
    if (e.target !== player.name) continue;
    consider(e.timestamp, e.x, e.y);
  }
  for (const e of player.healingReceived) consider(e.timestamp, e.x, e.y);
  if (positionSamples) {
    for (const s of positionSamples) {
      if (s.playerName !== player.name) continue;
      consider(s.timestamp, s.x, s.y);
    }
  }
  return best;
}

function gatherPositionSamples(
  player:  PlayerInfo,
  options: Pick<FindPlayerPositionOptions, "positionSamples">
): { timestamp: number; x: number; y: number }[] {
  const { positionSamples } = options;
  const samples: { timestamp: number; x: number; y: number }[] = [];
  const add = (t: number, x: number | undefined, y: number | undefined) => {
    if (x !== undefined && y !== undefined) samples.push({ timestamp: t, x, y });
  };

  for (const e of player.damageTaken) add(e.timestamp, e.x, e.y);
  for (const e of player.healing) {
    if (e.target !== player.name && e.source !== player.name) continue;
    add(e.timestamp, e.x, e.y);
  }
  for (const e of player.casts) {
    if (e.target !== player.name) continue;
    add(e.timestamp, e.x, e.y);
  }
  for (const e of player.healingReceived) add(e.timestamp, e.x, e.y);
  if (positionSamples) {
    for (const s of positionSamples) {
      if (s.playerName !== player.name) continue;
      add(s.timestamp, s.x, s.y);
    }
  }
  return samples;
}

/**
 * Like findPlayerPosition, but INTERPOLATES between the nearest sample
 * before `timestamp` and the nearest sample after it, instead of just
 * snapping to whichever single sample is closest — see
 * lib/mechanics/ffxiv/dancingmad/graven-image.ts's "SNAPSHOT POSITION"
 * section and phase1.ts's Confetti knockback check for why this matters:
 * a player who's mid-repositioning between two real samples has no single
 * sample that reflects where they actually were at the moment in between,
 * but a straight line between the bracketing samples usually does (players
 * move at a roughly constant run speed between GCDs, not teleport).
 *
 * `windowMs` bounds the gap on EACH side independently (before AND after
 * must individually be within `windowMs` of `timestamp`) — a large gap on
 * either side means the interpolation is more guess than measurement, so
 * this fails closed (undefined) rather than stretch a stale pair across
 * it. Falls back to a single bracketing sample (the same job
 * findPlayerPosition does) when only one side has anything within window.
 *
 * `maxSpanMs` (optional) additionally bounds the bracket's TOTAL width:
 * two samples each individually inside `windowMs` can still sit seconds
 * apart from each other, and the straight-line assumption degrades fast
 * over that distance — a player who runs out and back covers a path the
 * interpolation reads as "stood in the middle the whole time". Confirmed
 * false positive (2026-08-03, report h2JvDkntZCaBgmLF pull 39): Ayumi Emi
 * was bracketed by samples 4.9s apart while crossing the arena, and the
 * midpoint landed her in the exact opposite quadrant from where the VOD
 * shows her planted. When the span is too wide this fails closed rather
 * than falling back to a single side — with the player demonstrably
 * moving, neither endpoint is evidence of where they ended up either.
 */
export function interpolatePlayerPosition(
  player:    PlayerInfo,
  timestamp: number,
  options:   Omit<FindPlayerPositionOptions, "direction"> & { maxSpanMs?: number }
): Position | undefined {
  const { windowMs, maxSpanMs } = options;
  const samples = gatherPositionSamples(player, options).sort((a, b) => a.timestamp - b.timestamp);

  let before: { timestamp: number; x: number; y: number } | undefined;
  let after:  { timestamp: number; x: number; y: number } | undefined;
  for (const s of samples) {
    if (s.timestamp <= timestamp) {
      if (!before || s.timestamp > before.timestamp) before = s;
    } else if (!after) {
      after = s; // samples are time-sorted — first one past `timestamp` is the nearest "after"
      break;
    }
  }

  const withinWindow = (s: { timestamp: number } | undefined, before_: boolean) =>
    s !== undefined && (before_ ? timestamp - s.timestamp : s.timestamp - timestamp) <= windowMs;

  if (withinWindow(before, true) && withinWindow(after, false)) {
    const span = after!.timestamp - before!.timestamp;
    if (maxSpanMs !== undefined && span > maxSpanMs) return undefined;
    const frac = span === 0 ? 0 : (timestamp - before!.timestamp) / span;
    return { x: before!.x + frac * (after!.x - before!.x), y: before!.y + frac * (after!.y - before!.y) };
  }
  if (withinWindow(before, true)) return { x: before!.x, y: before!.y };
  if (withinWindow(after, false)) return { x: after!.x, y: after!.y };
  return undefined;
}

// Distance/angle/bearing math lives in lib/mechanics/geometry.ts.
