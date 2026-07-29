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
// ── THE STACK VARIANT (confirmed 2026-07-29, report Q3GzJNZg64k1hLRm, ──────
// ── pull 5) ─────────────────────────────────────────────────────────────
//
// The OTHER permutation this module's header already anticipated: instead
// of an 8-player spread, the 4 Supports stack on one spot and the 4 DPS
// stack on another (which spot is Support-safe vs DPS-safe is the same
// random-per-pull telegraph as the spread). FFLogs signature: ALL stacked
// players share ONE sourceInstance (unlike the spread's overlap, which is
// always exactly 2 players sharing 2 DISTINCT instances) and the shared
// hit's damage divides by however many actually joined — confirmed failure
// (pull 5): Ayumi Emi didn't join the DPS stack, so the other 3 (Chauzey
// Solstice, Sonder Dreams, Kade Kansado) split what should have been a
// 4-way hit only 3 ways and died to the overkill.
//
// `detectGravenImageStackErrors` self-detects stack mode per pull (a
// shared instance with 3+ same-side members — a pair alone can't be
// distinguished from a spread overlap, see above) and, once confirmed,
// checks BOTH sides' full 4-person roster against that side's actual
// stack group, even a side whose own signature is ambiguous (e.g. only 2
// joined, or the anchor took it solo) — confirming stack mode from EITHER
// side is enough to trust the read on both. The anchor position is simply
// the centroid of whoever actually shares the group's instance; per the
// user's explicit call, this correctly handles the case that HASN'T been
// seen yet too — if nobody joins the anchor at all (the anchor takes the
// hit solo), the anchor is still functionally "the group" of one, and
// everyone else is checked against THEM, not the other way around. Anyone
// on that side who didn't join is a candidate; if they're not in the
// group's own hit list, their position has to come from somewhere else —
// see the self-target-cast position source added to player-position.ts
// for this (a player who avoided the stack often isn't hit by anything
// else nearby either, and isn't necessarily a healer with self-heals to
// fall back on).
//
// Gated on outcome like the spread check: only fires when the stack
// failure actually killed someone in the group. Threshold: 400 centi-
// yalms/4 yalms (same floor as the spread check) — comfortably above the
// tightest-stacked trio's own mutual jitter in the confirmed pull (~2.4y
// worst case) and comfortably below Ayumi's actual deviation (~9.3y, from
// her nearest self-target Pictomancer cast — she had no damageTaken or
// self-heal sample in the window at all, precisely the scenario the
// cast-based fallback exists for).
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
// overlap/death: EVERY compromised player whose deviation clears a flat
// 400-centi-yalm/4-yalm floor is named, not just whichever one deviates
// furthest — confirmed both ways: report VtdBqhLQkWJXMvDg pull 4 had one
// genuinely misplaced player (~440) and one correctly-positioned victim
// caught in the crossfire (~120, stays unflagged), but report
// Q3GzJNZg64k1hLRm pull 4 had TWO independently misplaced players whose
// spreads happened to collide (~531 and ~563 — both real mistakes, not
// one root cause and one bystander; confirmed by the user directly since
// both should flag). The floor alone is what separates "real mistake" from
// "normal jitter caught in someone else's overlap" — furthest-only was
// specific to the first case and didn't generalize.

import type { Pull } from "@/types/Pull";
import type { PlayerInfo } from "@/types/PlayerInfo";
import type { PullError } from "@/types/PullError";
import type { DeathEvent } from "@/types/DeathEvent";
import { findPlayerPosition } from "@/lib/mechanics/player-position";

export const GRAVEN_IMAGE_SPREAD_RULE_ID = "ffxiv-phase1-graven-image-spread-misplaced";
export const GRAVEN_IMAGE_STACK_RULE_ID  = "ffxiv-phase1-graven-image-stack-misplaced";

// Both confirmed variants of the "Flagrant Fire III" resolution tick — a
// pull uses exactly one of the two IDs throughout (confirmed:
// Q3GzJNZg64k1hLRm alone has pulls resolving via each), same 2-ID pattern
// phase1.ts's Mystery Magic death tracking already accounts for. An earlier
// version of this module only recognized 47778 — silently invisible to
// every 47779 pull (including learning samples), found while building the
// stack-variant check below since the confirmed pull (5) happened to use
// 47779.
const FLAGRANT_FIRE_III_ABILITY_IDS = new Set([47778, 47779]);

// Graven Image casts multiple times across Phase 1 (confirmed: up to 3 in
// a single pull) reusing the same Flagrant Fire III ability IDs each time.
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

// A role-group's shared instance needs at least this many distinct members
// hit together to unambiguously confirm STACK mode (not a spread overlap,
// which only ever pairs exactly 2 — see module header). Used both to keep
// stack pulls out of the spread layout (isStackPull) and to detect the
// stack variant itself (detectGravenImageStackErrors).
const STACK_GROUP_MIN_SIZE = 3;

type Half = "north" | "south";
type Point = { x: number; y: number };

type RawHit = {
  actorId: number;
  player: PlayerInfo;
  timestamp: number;
  sourceInstance?: number;
  abilityId: number;
  x: number;
  y: number;
};

function extractFirstOccurrenceHits(pull: Pull): RawHit[] {
  const hits: RawHit[] = [];
  for (const player of pull.players) {
    for (const e of player.damageTaken) {
      if (!FLAGRANT_FIRE_III_ABILITY_IDS.has(e.abilityId) || e.x === undefined || e.y === undefined) continue;
      if (e.timestamp < FIRST_OCCURRENCE_WINDOW_START_MS || e.timestamp > FIRST_OCCURRENCE_WINDOW_END_MS) continue;
      hits.push({ actorId: player.actorId, player, timestamp: e.timestamp, sourceInstance: e.sourceInstance, abilityId: e.abilityId, x: e.x, y: e.y });
    }
  }
  return hits;
}

// One entry per player: earliest hit this volley (their own position — a
// later, second hit from a neighbor's overlap lands within ~50ms at
// essentially the same spot), plus the full set of sourceInstances that
// hit them (1 = clean, 2+ = compromised/overlapping).
function groupByPlayer(hits: RawHit[]) {
  const byPlayer = new Map<number, { player: PlayerInfo; timestamp: number; x: number; y: number; abilityId: number; instances: Set<number> }>();
  for (const h of hits.sort((a, b) => a.timestamp - b.timestamp)) {
    const entry = byPlayer.get(h.actorId);
    if (!entry) {
      byPlayer.set(h.actorId, { player: h.player, timestamp: h.timestamp, x: h.x, y: h.y, abilityId: h.abilityId, instances: new Set(h.sourceInstance !== undefined ? [h.sourceInstance] : []) });
    } else if (h.sourceInstance !== undefined) {
      entry.instances.add(h.sourceInstance);
    }
  }
  return [...byPlayer.values()];
}

export type GravenImageLayout = Readonly<Record<string, { north: Point | null; south: Point | null }>>;

// True when this pull's first-occurrence resolution is the STACK variant
// (see module header) — an instance shared by 3+ players, the same
// unambiguous signature detectGravenImageStackErrors uses. A stack pull's
// positions (everyone clustered near center) are structurally incompatible
// with the spread's per-job table and must never feed it — confirmed bug
// (2026-07-29): widening FLAGRANT_FIRE_III_ABILITY_IDS to catch every
// spread pull also surfaced stack pulls that were silently contaminating
// the learned layout (every "single instance" sample from a stack pull
// looks clean to the spread learner otherwise, since each stacked player
// only ever has ONE instance in their OWN group).
function isStackPull(grouped: ReturnType<typeof groupByPlayer>): boolean {
  const countsByInstance = new Map<number, number>();
  for (const g of grouped) {
    for (const inst of g.instances) {
      countsByInstance.set(inst, (countsByInstance.get(inst) ?? 0) + 1);
    }
  }
  return [...countsByInstance.values()].some((count) => count >= STACK_GROUP_MIN_SIZE);
}

/**
 * Learns each job's fixed spread spot (both halves) from every SPREAD pull
 * in this SAME report — median of uncompromised (single-sourceInstance)
 * samples only, excluding stack pulls entirely (see isStackPull), so a
 * report with only 1-2 spread pulls (or none) simply yields sparse/empty
 * entries rather than a wrong guess; callers must treat a missing half as
 * "can't attribute," not "zero deviation."
 */
export function learnGravenImageLayout(pulls: Pull[]): GravenImageLayout {
  const samplesByClass = new Map<string, { north: Point[]; south: Point[] }>();

  for (const pull of pulls) {
    const grouped = groupByPlayer(extractFirstOccurrenceHits(pull));
    if (isStackPull(grouped)) continue;
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

function diedToFlagrantFireInPull(deathEvents: DeathEvent[], playerName: string, aroundMs: number): boolean {
  return deathEvents.some(
    (d) =>
      d.player === playerName &&
      FLAGRANT_FIRE_III_ABILITY_IDS.has(d.killingAbilityGameId) &&
      Math.abs(d.timestamp - aroundMs) <= 5000
  );
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
    diedToFlagrantFireInPull(pull.deathEvents, playerName, aroundMs);

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
    if (c.distance === null || c.distance < OUT_OF_POSITION_FLOOR_CENTIYALMS) continue; // within normal jitter

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
      abilityId:   c.abilityId,
      abilityName: "Flagrant Fire III",
    });
  }

  return errors;
}

const STACK_OUT_OF_POSITION_THRESHOLD_CENTIYALMS = 400;

// Generous enough to catch a self-target cast a couple seconds either side
// of the stack resolving (confirmed case used one ~1.9s prior) without
// risking a genuinely stale sample from earlier in the pull.
const STACK_POSITION_WINDOW_MS = 5000;

const SUPPORT_ROLES = new Set(["Tank", "Healer"]);

type StackGroupMember = ReturnType<typeof groupByPlayer>[number];

/**
 * Per-pull, no learned layout needed (the anchor is derived fresh each
 * time from whoever actually stacked — see module header for why that's
 * enough, including the not-yet-seen "anchor takes it solo" shape).
 */
export function detectGravenImageStackErrors(pull: Pull): PullError[] {
  const grouped = groupByPlayer(extractFirstOccurrenceHits(pull));
  if (grouped.length === 0) return [];

  const byInstance = new Map<number, StackGroupMember[]>();
  for (const g of grouped) {
    for (const inst of g.instances) {
      const list = byInstance.get(inst) ?? [];
      list.push(g);
      byInstance.set(inst, list);
    }
  }

  const sides = [
    { label: "Support", isMember: (p: PlayerInfo) => SUPPORT_ROLES.has(p.role) },
    { label: "DPS",      isMember: (p: PlayerInfo) => p.role === "DPS" },
  ] as const;

  const sideGroups = sides.map((side) => {
    const members = pull.players.filter((p) => side.isMember(p));
    let best: StackGroupMember[] | null = null;
    for (const participants of byInstance.values()) {
      const allThisSide = participants.every((p) => members.some((m) => m.actorId === p.player.actorId));
      if (!allThisSide) continue;
      if (best === null || participants.length > best.length) best = participants;
    }
    return { ...side, members, group: best };
  });

  // Stack mode is only trusted when at least one side shows the
  // unambiguous 3+ signature — a lone or paired instance elsewhere in the
  // pull could just as easily be a spread overlap.
  const stackConfirmed = sideGroups.some((s) => (s.group?.length ?? 0) >= STACK_GROUP_MIN_SIZE);
  if (!stackConfirmed) return [];

  const errors: PullError[] = [];

  for (const side of sideGroups) {
    const group = side.group;
    if (!group || group.length === 0) continue; // no anchor to compare anyone against

    const anyDied = group.some((g) => diedToFlagrantFireInPull(pull.deathEvents, g.player.name, g.timestamp));
    if (!anyDied) continue; // stack held up (or the miss wasn't lethal) — nothing to flag

    const anchorX = group.reduce((sum, g) => sum + g.x, 0) / group.length;
    const anchorY = group.reduce((sum, g) => sum + g.y, 0) / group.length;
    const anchorTimestamp = Math.max(...group.map((g) => g.timestamp));
    const groupNames = group.map((g) => g.player.name);

    const missing = side.members.filter((m) => !group.some((g) => g.player.actorId === m.actorId));

    for (const player of missing) {
      const pos = findPlayerPosition(player, anchorTimestamp, {
        windowMs: STACK_POSITION_WINDOW_MS,
        healing:  "self",
        casts:    "self",
      });
      if (!pos) continue; // can't confirm they were actually away — fail closed, don't guess

      const distance = Math.hypot(pos.x - anchorX, pos.y - anchorY);
      if (distance < STACK_OUT_OF_POSITION_THRESHOLD_CENTIYALMS) continue; // within normal jitter

      errors.push({
        ruleId:      GRAVEN_IMAGE_STACK_RULE_ID,
        severity:    "Major",
        name:        "Graven Image Stack Missed",
        description: `Was roughly ${(distance / 100).toFixed(1)} yalms from the ${side.label} stack, splitting the hit fewer ways and overkilling ${groupNames.join(", ")}.`,
        timestamp:   anchorTimestamp,
        player:      player.name,
        class:       player.className,
        specId:      player.specId,
        role:        player.role,
        abilityId:   group[0].abilityId,
        abilityName: "Flagrant Fire III",
      });
    }
  }

  return errors;
}
