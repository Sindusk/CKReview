// lib/mechanics/ffxiv/dancingmad/graven-image.ts
//
// Cross-pull detection for Phase 1's Graven Image spread mechanic (~0:38,
// boss cast "Graven Image", 48370). Split out from phase1.ts — unlike
// everything there, "the ideal position" here can't be a hardcoded
// constant table, for the same reason blackhole-strategy.ts is split from
// blackhole.ts: it has to be LEARNED from the report at hand, not assumed
// universal.
//
// ── THE MECHANIC ─────────────────────────────────────────────────────────
//
// The raid resolves either a 4-player stack or an 8-player spread (random
// per pull; only spread is modeled here — no stack example seen yet). For
// a spread, DPS and Supports (Tank+Healer) occupy opposite halves of the
// arena, split N/S — which half is DPS-safe vs Support-safe is random per
// pull (a boss telegraph the raid reads live). Standing on the wrong HALF
// entirely is already caught by the generic `ffxiv-phase1-blizzard3-
// silent-kill` rule in phase1.ts (Blizzard III Blowout punishes that).
// This module instead catches standing on the CORRECT half but too close
// to center: each of the 8 players has their own fixed personal spot
// within their half, and the spread's resolving AoE (Flagrant Fire III,
// 47778) hits everyone at their own position, with FFLogs' sourceInstance
// distinguishing each player's own explosion from a neighbor's — same
// signal Wave Cannon uses.
//
// ── WHY THIS IS LEARNED, NOT HARDCODED (found via cross-report testing) ────
//
// Two things are true here that AREN'T true for Wave Cannon's per-job
// table: which JOB stands at which physical spot is a raid's own strategy
// choice, not a game-mechanic constant (confirmed: report VtdBqhLQkWJXMvDg
// had Sage/Dark Knight support-side supports; a different report's
// White Mage/Paladin stood somewhere else entirely — consistently, across
// 7 of 9 spread pulls, by a near-identical margin each time, the
// signature of a genuinely different but equally VALID layout, not 7
// coincidental near-identical mistakes). And per the user: MT/OT (and
// which specific healer takes which support slot) can swap between
// reports even for the same job — there's no way to resolve "the" ideal
// slot from job identity alone across different raid teams.
//
// So instead: `learnGravenImageLayout(pulls)` builds a canonical per-job,
// per-half position table FRESH from the SAME report's own clean pulls
// (median of every uncompromised single-hit sample, matching the earlier
// per-job-table technique but scoped to one report instead of hardcoded
// game-wide). Within one report a raid doesn't swap tank/healer
// assignments pull to pull, so this correctly captures whatever THAT
// team's own strategy actually is.
//
// ── GATING ON OUTCOME, PER THE USER'S EXPLICIT CALL ─────────────────────
//
// Per the user: "as long as nobody dies, no error needs to be thrown...
// only when there's an overlap do we need to detect how far off the
// 'ideal' position they were." So `detectGravenImageSpreadErrors` never
// even computes a deviation unless (a) the player was hit by 2+ distinct
// sourceInstances this volley (the overlap signature) AND (b) someone in
// that same overlap died to Flagrant Fire III. Learned-position deviation
// is used ONLY for attribution among the already-confirmed-bad
// overlap/death, root-causing to whichever compromised player deviates
// furthest from their own learned spot (a flat 400-centi-yalm/4-yalm
// floor below which nobody gets blamed even if technically "furthest" —
// confirmed case deviated ~440; the correctly-positioned neighbor in the
// same confirmed case deviated ~120).

import type { Pull } from "@/types/Pull";
import type { PlayerInfo } from "@/types/PlayerInfo";
import type { PullError } from "@/types/PullError";

export const GRAVEN_IMAGE_SPREAD_RULE_ID = "ffxiv-phase1-graven-image-spread-misplaced";

const FLAGRANT_FIRE_III_ABILITY_ID = 47778;

// Graven Image casts multiple times across Phase 1 (confirmed: up to 3 in
// a single pull) reusing the same Flagrant Fire III ability ID each time.
// Only the FIRST (the ~0:38 one) is modeled — nothing here confirms later
// occurrences share the same physical layout. This window is fight-
// relative-time based rather than anchored to the actual Graven Image
// cast (simpler — no need to thread enemy-cast data through Pull) and is
// safely inside the gap before the second occurrence (~76-91s observed
// across every sampled pull).
const FIRST_OCCURRENCE_WINDOW_START_MS = 20_000;
const FIRST_OCCURRENCE_WINDOW_END_MS   = 60_000;

// Below this, a "furthest of the compromised pair" call isn't trusted —
// see module header.
const OUT_OF_POSITION_FLOOR_CENTIYALMS = 400;

type Half = "north" | "south";
type Point = { x: number; y: number };

type RawHit = {
  actorId: number;
  player: PlayerInfo;
  timestamp: number;
  sourceInstance?: number;
  x: number;
  y: number;
};

function extractFirstOccurrenceHits(pull: Pull): RawHit[] {
  const hits: RawHit[] = [];
  for (const player of pull.players) {
    for (const e of player.damageTaken) {
      if (e.abilityId !== FLAGRANT_FIRE_III_ABILITY_ID || e.x === undefined || e.y === undefined) continue;
      if (e.timestamp < FIRST_OCCURRENCE_WINDOW_START_MS || e.timestamp > FIRST_OCCURRENCE_WINDOW_END_MS) continue;
      hits.push({ actorId: player.actorId, player, timestamp: e.timestamp, sourceInstance: e.sourceInstance, x: e.x, y: e.y });
    }
  }
  return hits;
}

// One entry per player: earliest hit this volley (their own position — a
// later, second hit from a neighbor's overlap lands within ~50ms at
// essentially the same spot), plus the full set of sourceInstances that
// hit them (1 = clean, 2+ = compromised/overlapping).
function groupByPlayer(hits: RawHit[]) {
  const byPlayer = new Map<number, { player: PlayerInfo; timestamp: number; x: number; y: number; instances: Set<number> }>();
  for (const h of hits.sort((a, b) => a.timestamp - b.timestamp)) {
    const entry = byPlayer.get(h.actorId);
    if (!entry) {
      byPlayer.set(h.actorId, { player: h.player, timestamp: h.timestamp, x: h.x, y: h.y, instances: new Set(h.sourceInstance !== undefined ? [h.sourceInstance] : []) });
    } else if (h.sourceInstance !== undefined) {
      entry.instances.add(h.sourceInstance);
    }
  }
  return [...byPlayer.values()];
}

export type GravenImageLayout = Readonly<Record<string, { north: Point | null; south: Point | null }>>;

/**
 * Learns each job's fixed spread spot (both halves) from every pull in
 * this SAME report — median of uncompromised (single-sourceInstance)
 * samples only, so a report with only 1-2 spread pulls (or none) simply
 * yields sparse/empty entries rather than a wrong guess; callers must
 * treat a missing half as "can't attribute," not "zero deviation."
 */
export function learnGravenImageLayout(pulls: Pull[]): GravenImageLayout {
  const samplesByClass = new Map<string, { north: Point[]; south: Point[] }>();

  for (const pull of pulls) {
    const grouped = groupByPlayer(extractFirstOccurrenceHits(pull));
    for (const { player, x, y, instances } of grouped) {
      if (instances.size >= 2) continue; // compromised this pull — not a clean sample
      const entry = samplesByClass.get(player.className) ?? { north: [], south: [] };
      (y < 10000 ? entry.north : entry.south).push({ x, y });
      samplesByClass.set(player.className, entry);
    }
  }

  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  const centroid = (points: Point[]): Point | null =>
    points.length === 0 ? null : { x: median(points.map((p) => p.x)), y: median(points.map((p) => p.y)) };

  const layout: Record<string, { north: Point | null; south: Point | null }> = {};
  for (const [className, { north, south }] of samplesByClass) {
    layout[className] = { north: centroid(north), south: centroid(south) };
  }
  return layout;
}

function nearestHalf(spot: { north: Point | null; south: Point | null }, x: number, y: number): { half: Half; point: Point; distance: number } | null {
  const distNorth = spot.north ? Math.hypot(x - spot.north.x, y - spot.north.y) : null;
  const distSouth = spot.south ? Math.hypot(x - spot.south.x, y - spot.south.y) : null;
  if (distNorth === null && distSouth === null) return null;
  if (distSouth === null || (distNorth !== null && distNorth <= distSouth)) return { half: "north", point: spot.north!, distance: distNorth! };
  return { half: "south", point: spot.south!, distance: distSouth! };
}

/**
 * Per-pull: only ever flags a player when they were hit by 2+ distinct
 * Flagrant Fire III instances (overlapping a neighbor's explosion) AND
 * that overlap killed someone — see module header. Position deviation
 * (from `layout`, built once across the report by learnGravenImageLayout)
 * is used purely to attribute root cause among the compromised group, not
 * to gate whether an error fires at all.
 */
export function detectGravenImageSpreadErrors(pull: Pull, layout: GravenImageLayout): PullError[] {
  const grouped = groupByPlayer(extractFirstOccurrenceHits(pull));
  if (grouped.length === 0) return [];

  const compromised = grouped.filter((g) => g.instances.size >= 2);
  if (compromised.length === 0) return [];

  const diedToFlagrantFire = (playerName: string, aroundMs: number) =>
    pull.deathEvents.some(
      (d) =>
        d.player === playerName &&
        d.killingAbilityGameId === FLAGRANT_FIRE_III_ABILITY_ID &&
        Math.abs(d.timestamp - aroundMs) <= 5000
    );

  // Only compromised players whose overlap actually killed someone (in
  // the same shared-instance group) are even candidates — no death, no
  // error, regardless of deviation.
  const lethalGroup = compromised.filter((c) =>
    compromised.some((other) => [...other.instances].some((i) => c.instances.has(i)) && diedToFlagrantFire(other.player.name, other.timestamp))
  );
  if (lethalGroup.length === 0) return [];

  const withDeviation = lethalGroup.map((c) => {
    const spot = layout[c.player.className];
    const nearest = spot ? nearestHalf(spot, c.x, c.y) : null;
    return { ...c, distance: nearest?.distance ?? null };
  });

  const maxKnownDistance = Math.max(...withDeviation.map((c) => c.distance ?? -1));
  if (maxKnownDistance < OUT_OF_POSITION_FLOOR_CENTIYALMS) return []; // can't confidently single anyone out

  const errors: PullError[] = [];
  for (const c of withDeviation) {
    if (c.distance === null || c.distance < maxKnownDistance) continue; // spared — not the furthest
    if (c.distance < OUT_OF_POSITION_FLOOR_CENTIYALMS) continue;

    const others = lethalGroup
      .filter((o) => o.player.actorId !== c.player.actorId && [...o.instances].some((i) => c.instances.has(i)))
      .map((o) => o.player.name);
    const deadOthers = others.filter((name) => diedToFlagrantFire(name, c.timestamp));
    const selfDied = diedToFlagrantFire(c.player.name, c.timestamp);

    let overlapNote = "";
    if (others.length > 0) {
      overlapNote = ` Overlapped with ${others.join(" and ")}'s explosion`;
      if (selfDied && deadOthers.length > 0) overlapNote += `, killing them both`;
      else if (deadOthers.length > 0) overlapNote += `, killing ${deadOthers.join(" and ")}`;
      overlapNote += ".";
    }

    errors.push({
      ruleId:      GRAVEN_IMAGE_SPREAD_RULE_ID,
      severity:    "Major",
      name:        "Graven Image Spread Misplaced",
      description: `Was roughly ${(c.distance / 100).toFixed(1)} yalms from their assigned spread location.${overlapNote}`,
      timestamp:   c.timestamp,
      player:      c.player.name,
      class:       c.player.className,
      specId:      c.player.specId,
      role:        c.player.role,
      abilityId:   FLAGRANT_FIRE_III_ABILITY_ID,
      abilityName: "Flagrant Fire III",
    });
  }

  return errors;
}
