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
// ── MIRRORED, NOT INDEPENDENTLY LEARNED (confirmed 2026-07-29, same ────────
// ── report, pull 17) ────────────────────────────────────────────────────
//
// `learnGravenImageLayout` used to learn each job's north spot and south
// spot as two fully independent medians. That's wrong: the arena split
// is symmetric (confirmed across every OTHER job's learned pair — Dancer
// -1293/+1263, Reaper -645/+570, Gunbreaker -869/+763, all within ~15% of
// each other), so a job's two halves should always be near-mirror images
// through center. White Mage's learned pair was NOT — north sat only
// -151.5 off center while south sat +683 off, a 4.5x mismatch. Confirmed
// failure (pull 17): Azura Salus (White Mage) stood at essentially that
// same under-shot "north" spot — only ~120 units north of center, when
// she needed to be ~683 units north (this pull's telegraph was
// north-safe-for-Support) — and overlapped into Sayacissa Morsaelth's
// spot, killing them both. Per the user directly: that position IS close
// to correct for the OPPOSITE (south-safe) permutation, just mirrored
// onto the wrong side — meaning the "north" LEARNED VALUE ITSELF was
// contaminated by this exact under-shoot recurring across other clean
// pulls that just never happened to overlap anyone fatally, silently
// baking the mistake in as "normal."
//
// Fixed by `mirrorHalves`: instead of trusting each half's own median
// independently, take the LARGER of the two halves' offset-from-center
// magnitudes and mirror that single canonical offset onto both sides. A
// habitual under-shoot only ever shrinks the observed offset relative to
// the true one, never inflates it past true — so between two mirrored
// samples, the smaller one is the (possibly) contaminated one and the
// larger is trustworthy. (An average-based compromise was tried first —
// it corrects the systemic skew but only pulls Azura's own pull-17
// deviation to ~3.0 yalms, short of the 4-yalm floor; taking the larger
// magnitude reaches ~5.7 yalms, comfortably past it.) A job with real
// samples on only one half still mirrors it entirely (nothing to compare
// against).
//
// ── SNAPSHOT POSITION (confirmed 2026-07-29, same report, pull 12) ─────────
//
// FFXIV AoE hit resolution "snapshots" who's in radius roughly half a
// second before the visual explosion/damage log entry — a player who
// dodges in that final half-second can still take the hit (or, as here,
// still cause someone ELSE to get overlapped) even though their FINAL,
// logged position looks fine. Confirmed failure (pull 12): Azura Salus
// was flagged, then un-flagged by the mirrorHalves fix above (her hit-
// time position read as only ~2.9y off, under the floor) — but per the
// user directly, she was standing on top of Archidel Del'archi and only
// juked away at the last instant; the damage log's x/y already reflects
// the POST-juke position, hiding the mistake that actually caused the
// overlap. Her nearest self-heal tick ~1.9s before the hit (8398, 9974)
// sits ~7.9y from her true spot and only ~2.15y from Archidel's own
// position — a far more consistent picture of "standing on top of him."
//
// `detectGravenImageSpreadErrors` now checks both the hit-time position
// AND a pre-hit position (self-heal/self-cast samples only, back to
// PRIOR_SNAPSHOT_WINDOW_MS — damageTaken is deliberately excluded so this
// can't just re-find the same hit being evaluated) and uses whichever
// shows the LARGER deviation — a late dodge only ever shrinks the visible
// deviation relative to the one that actually caused the overlap, never
// inflates it, same principle as mirrorHalves' larger-of-two-magnitudes
// choice above. A player with no usable earlier sample just falls back to
// their hit-time position, unchanged from before.
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
//
// ── BOTH findPlayerPosition CALLS WERE MISSING healingReceived (fixed ──────
// ── 2026-07-31, found while auditing wave-cannon.ts's identical bug) ───────
//
// This module's last substantive edit predates `player.healingReceived`
// (heals landing on a player from ANY source — added to player-position.ts
// 2026-07-29 for the Confetti Knockback work), so both position lookups
// here — the spread check's "prior position" fallback and the stack
// check's missing-player lookup — only ever had `healing: "self"` (+
// `casts: "self"`) to bracket from. Same category of gap as
// wave-cannon.ts's confirmed bug (see that module's own header): a sparse
// self-heal-only stream can leave a stale, far-apart bracket where a much
// closer sample from an actual healer would have existed. Wired in
// `healingReceived: "any"` at both call sites — same as every phase1.ts
// call site already does. Verified against the full sample set: zero
// existing ruling violations, only description-level distance corrections
// plus a handful of new/removed flags on previously-unconfirmed pulls.
//
// Per the user (same date): every position lookup, everywhere, should
// always draw from every stream that could carry real data — no
// deliberately-narrowed stream selection, ever. The spread check's "prior
// position" fallback also had an explicit `damageTaken: false` left over
// (worry: re-finding the SAME hit it's meant to be an independent
// cross-check against) — but its query is already `atOrBefore` a
// timestamp 1ms before that hit, so the hit itself was never actually
// reachable through this option regardless. Enabled it anyway; verified
// zero ruling violations.
//
// Stream selection was removed from `findPlayerPosition`'s options
// entirely shortly after (same date) — every stream is now always
// checked, so both call sites below only ever pass `windowMs`/`direction`
// now. See player-position.ts's own header for the full reasoning.
//
// ── WRONG HALF, NOT JUST WRONG SPOT (confirmed 2026-07-31, pull 15) ────────
//
// Confirmed failure: Salty Dango (Gunbreaker, Support) stood NORTH this
// pull when south was the support-safe half, overlapping Sonder Dreams'
// spread and killing them both — but `nearestHalf` reported a clean ~3.0y
// deviation, not the ~12.4y that actually caused the death. The reason:
// `nearestHalf` just picks whichever of a job's two LEARNED spots (north
// or south) is physically closer, with no idea which one was actually
// safe this pull. Dango's true position happened to closely reproduce
// Gunbreaker's learned NORTH pattern — the correct spot for a support
// standing north on a pull where north is support-safe — so the check
// scored him as "basically home," when he was actually on the wrong half
// of the ENTIRE ARENA for this pull's telegraph.
//
// Fixed with `determineSupportSafeHalf`: read which half is actually
// support-safe THIS pull straight from the pull's own data (majority vote
// of every support's own hit position — a single misplaced support like
// Dango is outvoted 3-1 by the others who went to the correct side), then
// measure each player's deviation against the learned spot for their
// EXPECTED half (derived from their own role) specifically, not nearest-
// of-either. Falls back to the old nearest-of-either behavior only when
// the vote can't be resolved (no support samples, or an exact tie).

import type { Pull } from "@/types/Pull";
import type { PlayerInfo } from "@/types/PlayerInfo";
import type { PullError } from "@/types/PullError";
import type { DeathEvent } from "@/types/DeathEvent";
import { findPlayerPosition } from "@/lib/mechanics/player-position";
import { ARENA_CENTER } from "@/lib/mechanics/geometry";

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

const SUPPORT_ROLES = new Set(["Tank", "Healer"]);

// How far back to look for a pre-snapshot position (self-heal/self-cast
// only) when a compromised player's own hit-time position reads clean —
// see "SNAPSHOT POSITION" in the module header. Generous: the confirmed
// case's nearest usable self-heal tick landed ~1.9s before the hit
// (natural regen ticks roughly every 3s per player-position.ts), so this
// needs enough room to actually reach one, not just the ~0.5s the
// underlying game mechanic itself snapshots on.
const PRIOR_SNAPSHOT_WINDOW_MS = 3000;

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
      (y < ARENA_CENTER ? entry.north : entry.south).push({ x, y });
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
    layout[className] = mirrorHalves(centroid(north), centroid(south));
  }
  return layout;
}

/**
 * Combines a job's two independently-learned halves into one mirror-
 * symmetric pair — see module header's "MIRRORED, NOT INDEPENDENTLY
 * LEARNED" section. When both halves have samples, the canonical X is
 * their average and the canonical Y-offset-from-center is the LARGER of
 * the two halves' own offset magnitudes (a habitual under-shoot only ever
 * SHRINKS the observed offset relative to true, never inflates it past
 * true — so the smaller of the two is the contaminated one, never the
 * larger), then mirrored onto both sides. A job with samples on only one
 * half mirrors that half entirely (nothing to compare against); a job
 * with neither stays null, unchanged from before.
 */
function mirrorHalves(north: Point | null, south: Point | null): { north: Point | null; south: Point | null } {
  if (!north && !south) return { north: null, south: null };
  if (!north) return { north: { x: south!.x, y: ARENA_CENTER - (south!.y - ARENA_CENTER) }, south };
  if (!south) return { north, south: { x: north.x, y: ARENA_CENTER + (ARENA_CENTER - north.y) } };

  const x = (north.x + south.x) / 2;
  const offset = Math.max(ARENA_CENTER - north.y, south.y - ARENA_CENTER);
  return { north: { x, y: ARENA_CENTER - offset }, south: { x, y: ARENA_CENTER + offset } };
}

function nearestHalf(spot: { north: Point | null; south: Point | null }, x: number, y: number): { half: Half; point: Point; distance: number } | null {
  const distNorth = spot.north ? Math.hypot(x - spot.north.x, y - spot.north.y) : null;
  const distSouth = spot.south ? Math.hypot(x - spot.south.x, y - spot.south.y) : null;
  if (distNorth === null && distSouth === null) return null;
  if (distSouth === null || (distNorth !== null && distNorth <= distSouth)) return { half: "north", point: spot.north!, distance: distNorth! };
  return { half: "south", point: spot.south!, distance: distSouth! };
}

// Which half (N/S) is actually SUPPORT-safe this pull, read from the pull's
// own data instead of assumed — the split flips pull to pull (see module
// header). Majority vote across every support's OWN single-instance hit
// this volley: a single misplaced support (the exact failure mode this
// exists to catch) is outvoted by the other 3 who did go to the correct
// side. Returns null only if there's no support sample at all, or an exact
// tie (never happens with the normal 4-support roster, but a report could
// theoretically be missing combatants).
function determineSupportSafeHalf(grouped: ReturnType<typeof groupByPlayer>): Half | null {
  let north = 0;
  let south = 0;
  for (const g of grouped) {
    if (!SUPPORT_ROLES.has(g.player.role)) continue;
    if (g.y < ARENA_CENTER) north++;
    else south++;
  }
  if (north === south) return null;
  return north > south ? "north" : "south";
}

function expectedHalfForRole(role: string, supportSafeHalf: Half | null): Half | null {
  if (!supportSafeHalf) return null;
  const isSupport = SUPPORT_ROLES.has(role);
  if (supportSafeHalf === "north") return isSupport ? "north" : "south";
  return isSupport ? "south" : "north";
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

  // Which half is actually support-safe THIS pull (flips pull to pull —
  // see module header), read from the pull's own support positions rather
  // than assumed. Needed below because `nearestHalf` alone can't tell a
  // player "close to their job's spot on the WRONG half" apart from
  // "correctly positioned" — see "WRONG HALF, NOT JUST WRONG SPOT" in the
  // module header.
  const supportSafeHalf = determineSupportSafeHalf(grouped);

  const withDeviation = lethalGroup.map((c) => {
    const spot = layout[c.player.className];
    if (!spot) return { ...c, distance: null };

    // A learned job spot is symmetric (mirrorHalves) but which physical
    // N/S half is correct for THIS player's role flips pull to pull.
    // `nearestHalf` just picks whichever of the two learned points is
    // closer — which silently hides a player standing on the WRONG half
    // entirely if their position happens to reproduce their job's
    // characteristic offset pattern for the OTHER (unsafe-this-pull) half.
    // When the pull's own data can tell us which half was actually correct
    // for this role, measure against THAT half specifically instead; only
    // fall back to nearest-of-either when it can't be determined.
    const expectedHalf = expectedHalfForRole(c.player.role, supportSafeHalf);
    const halfDistance = (x: number, y: number): { half: Half; distance: number } | null => {
      if (expectedHalf) {
        const point = spot[expectedHalf];
        return point ? { half: expectedHalf, distance: Math.hypot(x - point.x, y - point.y) } : nearestHalf(spot, x, y);
      }
      return nearestHalf(spot, x, y);
    };

    // The hit's OWN x/y is where this player ended up by the time the
    // damage log entry was written — which can already reflect a
    // last-second dodge AFTER the game snapshotted position for hit
    // resolution (see module header's "SNAPSHOT POSITION" section). Also
    // check a position from shortly BEFORE the hit (self-heal/self-cast
    // only — damageTaken is excluded so this can't just re-find the same
    // hit) and take whichever of the two shows the LARGER deviation, same
    // "never trust the smaller of two readings" principle as
    // mirrorHalves above: a late dodge only ever SHRINKS the visible
    // deviation relative to what actually caused the overlap, never
    // inflates it.
    const current = halfDistance(c.x, c.y);
    const priorPos = findPlayerPosition(c.player, c.timestamp - 1, {
      windowMs:  PRIOR_SNAPSHOT_WINDOW_MS,
      direction: "atOrBefore",
    });
    const prior = priorPos ? halfDistance(priorPos.x, priorPos.y) : null;

    const distance = Math.max(current?.distance ?? -1, prior?.distance ?? -1);
    if (distance < 0) return { ...c, distance: null };
    return prior && (prior.distance > (current?.distance ?? -1))
      ? { ...c, x: priorPos!.x, y: priorPos!.y, distance: prior.distance }
      : { ...c, distance: current!.distance };
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
      const pos = findPlayerPosition(player, anchorTimestamp, { windowMs: STACK_POSITION_WINDOW_MS });
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
