// lib/mechanics/geometry.ts
//
// Shared angle/bearing/distance math for mechanic modules, unified from
// per-module copies (limitcut's angleOf/angularDist, stompies' trueBearing/
// angleDiff/distanceFromCenter, blackhole-strategy's kefkaFacingToBearing).
//
// ── THE TWO ANGLE CONVENTIONS (do not mix them) ────────────────────────────
//
// Log coordinates put +x east and +y SOUTH (screen-style, y grows
// downward). Two different angle conventions are in use on top of that:
//
// 1. POLAR angle (`polarAngleDeg`) — raw math convention, atan2(dy, dx):
//    0° = east, 90° = SOUTH, growing clockwise on screen. Not a compass
//    reading. Used where a module fits positions against its own internal
//    slot layout and only ever compares these angles with each other
//    (limitcut's dash-slot fitting: slots at 22.5° + k*45°).
//
// 2. COMPASS bearing (`compassBearingOf`, `facingToCompassBearing`) —
//    0° = north, 90° = east, 180° = south, 270° = west. Used whenever a
//    direction is compared against strategy/VOD language ("group 1 goes
//    northwest") or against Kefka's facing.
//
// A polar angle and a compass bearing of the same point differ — never
// compare one against the other. `angularDistance` works within either
// convention (it's just circular distance).
//
// ── FFLOGS `facing` ────────────────────────────────────────────────────────
//
// An actor's `sourceResources.facing` is in CENTI-radians.
// `facingToCompassBearing` converts it to a compass bearing:
// bearing = (facing * 180/PI)/100 + 270 (mod 360) — derivation
// reverse-engineered from analyzer.wtfdig.info's bundle and validated
// against VOD review (report VtdBqhLQkWJXMvDg pull 22: reads N/NW/N across
// the three Black Hole tether-set facings, matching the user's own review
// exactly); see blackhole-strategy.ts's module comment for the full story.

import type { Position } from "@/lib/mechanics/player-position";

/**
 * Dancing Mad arena center (both axes), in raw log units (centi-yalms).
 * Every FFXIV Dancing Mad module measures from here. If a future fight's
 * arena has a different center, take it as a parameter — don't reuse this.
 */
export const ARENA_CENTER = 10000;

/** Distance between two positions in raw log units (FFXIV: centi-yalms — divide by 100 for yalms). */
export function distanceBetween(a: Position, b: Position): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Distance from the Dancing Mad arena center, in raw log units. */
export function distanceFromCenter(x: number, y: number): number {
  return Math.hypot(x - ARENA_CENTER, y - ARENA_CENTER);
}

/** POLAR angle of a point around arena center, degrees in [0, 360): 0°=east, 90°=south (math convention on screen-style axes — NOT a compass bearing; see header). */
export function polarAngleDeg(x: number, y: number): number {
  return (Math.atan2(y - ARENA_CENTER, x - ARENA_CENTER) * 180 / Math.PI + 360) % 360;
}

/** COMPASS bearing of a point around arena center, degrees in [0, 360): 0°=north, 90°=east, 180°=south, 270°=west. */
export function compassBearingOf(x: number, y: number): number {
  const dx = x - ARENA_CENTER, dy = y - ARENA_CENTER;
  return (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
}

/** Smallest circular distance between two angles, in [0, 180]. Convention-agnostic — but both inputs must use the SAME convention. */
export function angularDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** Converts an FFLogs `facing` value (centi-radians) into a compass bearing (0=N, 90=E, 180=S, 270=W) — see header for the derivation. */
export function facingToCompassBearing(facing: number): number {
  const deg = (facing * 180) / Math.PI / 100 + 270;
  return ((deg % 360) + 360) % 360;
}
