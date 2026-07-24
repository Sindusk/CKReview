// lib/mechanics/ffxiv/dancingmad/stompies.ts
//
// "Earthquake" (user-nicknamed "Stompies" after Kefka's Stomp-a-Mole) — the
// raid-wide stack/spread/tower dance that immediately follows Black Hole in
// Dancing Mad's Phase 3, per the 7-slide raidplan in sampledata/ff/Stompies1-7
// .png. Reverse-engineered from report LF2yJZabVprjXYvm pull 1 (2026-07-24
// session) — the raid's first-ever look at this phase, which wiped in the
// opening ~10 seconds of it. Confirmed against the user's own VOD review
// (sampledata/ff/StompiesVOD11-37..50.jpg) plus the real combat log.
//
// ── THE MECHANIC, AS FAR AS THIS MODULE COVERS ──────────────────────────────
//
// Kefka casts "Earthquake" (ability name only — the underlying ID (47866) is
// shared with Black Hole's unrelated Accretion-triggered Earthquake, and is
// itself a sub-44-HP ground-effect ghost instance, not his own real actor;
// matched by name only, same convention blackhole-strategy.ts already uses
// for "Slap Happy") as this mechanic's start marker. His FACING at that
// exact cast, run through the SAME kefkaFacingToBearing conversion already
// validated for Black Hole (imported from blackhole-strategy.ts), gives a
// bearing K that — confirmed directly against the user's VOD review — reads
// as "relative north" ALREADY, with no further 180-degree flip needed in
// code: on report LF2yJZabVprjXYvm pull 1 the user watched Kefka visually
// facing northwest, called relative-north SOUTHEAST for raidplan purposes
// (the raidplan's own convention, not this module's), and K measured
// straight off the log came out ~135 degrees (SE) — i.e. K's numeric value
// IS the raidplan's "relative north," full stop.
//
// Two Blizzard III "waves" follow (Exdeath, ability name "Blizzard III",
// cast as 8 concurrent ghost ground-effect ticks — reuses the same personal-
// AoE-puddle pattern as Black Hole's tether ghosts, see blackhole-strategy.ts
// module comment): wave 1 is the initial spread ("move to the intercardinals
// in partners" — Support to relative-north's own octant, DPS to the
// opposite one), wave 2 is the move to the cardinal tower positions ("G1/G2
// relative W/E tower").
//
// ── GEOMETRY MODEL, CONFIRMED AGAINST THE USER'S ABSOLUTE-COMPASS REVIEW ────
//
// detectFFRoles' eight party slots (roles.ts) split cleanly into two raid
// halves per the user's explicit roster call for this pull:
//   G1 = MT, H1, M1, R1     G2 = OT, H2, M2, R2
// "Support" = Tank + Healer slots (MT/OT/H1/H2); "DPS" = M1/M2/R1/R2.
//
// Bearings are all expressed as compass degrees (0=N, 90=E, 180=S, 270=W),
// computed from raw x/y via the SAME unrotated dx/dy convention already
// validated for Black Hole's ghost spawn positions (dx = x-center east-
// positive, dy = y-center south-positive, no 45-degree correction — that
// correction belongs to a different, now-superseded early Black Hole
// investigation and does NOT apply here, confirmed by brute-force fitting
// against this pull's 5 real Stomp-a-Mole death positions).
//
// Wave 1 (bait) expected bearing, relative to K:
//   Support -> K           (same octant as K — confirmed: Sayacissa
//                            Morsaelth/Kup'o Noodles correctly baited SE)
//   DPS     -> K + 180     (opposite octant — confirmed: Chauzey Solstice/
//                            Sonder Dreams/Kade Kansado correctly baited NW)
//
// Wave 2 (tower) expected bearing — a fixed 45-degree rotation off the
// wave-1 spot, confirmed against all 8 players' real outcomes on this pull
// (5 from their own Stomp-a-Mole death position, 3 from the user's direct
// VOD call):
//   Support G1 -> K - 45      Support G2 -> K + 45
//   DPS G1     -> K + 225     DPS G2     -> K + 135
//
// ── TIMING: FIXED DROP-TIME OFFSETS, NOT A LOGGED SIGNAL ─────────────────
//
// A puddle's DROP (the ground telegraph appearing under a player, which is
// when position actually matters) has no logged signal at all — it isn't an
// attack, just a marker, confirmed absent from both "begincast" (no
// sourceResources on it in this data) and the later "cast" event (which
// only fires on DETONATION, several seconds after the drop, matching the
// raidplan's own "don't actually deal damage until a few seconds later").
// Checking position at the detonation timestamp instead of the drop
// genuinely produces a WRONG-time check (confirmed by the user directly
// against their VOD) — so both checks below are anchored on FIXED offsets
// from the mechanic-start "Earthquake" cast (EARTHQUAKE_TO_FIRST_DROP_MS,
// FIRST_TO_SECOND_DROP_MS) instead, per the user's own VOD timing estimate
// (2026-07-24 session: ~7s to the first drop, ~3s more to the second) —
// not yet confirmed against a second pull.
//
// The two waves need DIFFERENT position sources at that drop-time, though:
// - Wave 1's ghost puddle data (fflBuildStompiesPuddleSamples) is clean —
//   8 genuinely distinct positions, one per player, still usable even
//   though the logged event carrying them fires at detonation, not drop
//   (see matchPuddlesToPlayers: a ground puddle doesn't move after being
//   placed, so its position value is identical whether read at drop or
//   detonation — only the identity match needs a timestamp near the drop).
// - Wave 2's ghost puddle data is DEGENERATE — confirmed on this pull: all
//   8 simultaneous "cast" entries carry the IDENTICAL position (10000,
//   9000), Exdeath's own body snapshot rather than 8 personal ground
//   markers. Unusable for a per-player check. Falls back to player-side
//   damageTaken/healing position samples instead, queried at the real
//   logged wave-2 "cast" (detonation) timestamp specifically — NOT the
//   estimated drop-time, which is too early for most players to have
//   arrived yet (confirmed: at the estimated drop-time, Kup'o Noodles'
//   nearest sample read as within tolerance of his WRONG tower purely
//   because he hadn't finished walking there). The detonation timestamp is
//   later than the true drop but empirically the only reliable moment
//   available; the error is still DISPLAYED at the estimated drop-time.
//
// ── ERRORS DETECTED ──────────────────────────────────────────────────────
//
// 1. "Bait Positioned Too Close To Center" (Major) — wave 1: a player whose
//    position is within BAIT_TOO_CLOSE_DISTANCE of arena center. Confirmed
//    on Ayumi Emi, Archidel Del'archi, and Azura Salus this pull — the user
//    was explicit this is a pure distance failure (direction not checked),
//    unlike every other check in this module.
//
// 2. "Wrong Tower" (Major) — wave 2: a player whose position bearing is more
//    than WRONG_TOWER_ANGLE_TOLERANCE off their own expected tower bearing
//    (i.e. closer to a neighboring tower than their own). Confirmed on
//    Sayacissa Morsaelth, Kup'o Noodles, and Azura Salus this pull (the
//    first two swapped to the mirror-opposite tower; Azura was simply lost).
//
// ── KNOWN LIMITATIONS (first pass, single-pull validation) ─────────────────
//
// - Wave 2's player-side position sample can go stale (see
//   MAX_POSITION_SAMPLE_AGE_MS) and fails closed rather than risk a
//   misleading position — same posture as the rest of this module.
// - Only wave 1 (bait) and wave 2 (tower) are covered, per explicit user
//   scope ("if we can just get these first 2 steps detected, that would be
//   sufficient") — this pull never survived long enough to reach the later
//   stack-swap/mid/Big-Bang stages (slides 4-7), so there is no real data to
//   build or validate detection for them yet.
// - The 7s/3s drop-time offsets, the distance threshold for check 1, and
//   the angle tolerance for check 2 are all first-pass estimates from a
//   single pull's data, not yet cross-validated against a second report.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { PullError } from "@/types/PullError";
import type { DeathEvent } from "@/types/DeathEvent";
import type { EnemyEvent } from "@/types/PullError";
import type { BlackHoleGeometry } from "@/types/Pull";
import { detectFFRoles, type FFRoleSlot } from "@/lib/mechanics/ffxiv/roles";
import { kefkaFacingToBearing } from "./blackhole-strategy";

export const STOMPIES_BAIT_TOO_CLOSE_RULE_ID = "ffxiv-stompies-bait-too-close-to-center";
export const STOMPIES_WRONG_TOWER_RULE_ID    = "ffxiv-stompies-wrong-tower";

const ARENA_CENTER = 10000;

const EARTHQUAKE_ABILITY_NAME    = "Earthquake";
const BLIZZARD_III_ABILITY_NAME  = "Blizzard III";

// Multiple simultaneous Blizzard III ghost ticks (one per player) land
// within a few ms of each other; separate waves are several seconds apart —
// generous without risking merging two real waves.
const WAVE_CLUSTER_TOLERANCE_MS = 500;

// A position sample older than this (relative to the wave's own timestamp)
// is not trusted — see module header.
const MAX_POSITION_SAMPLE_AGE_MS = 1500;

// First-pass thresholds — see module header's "Known limitations."
const BAIT_TOO_CLOSE_DISTANCE       = 300;
// 45 degrees (halfway to a neighboring tower) is the theoretical boundary,
// but real players don't land on the mathematical point — confirmed-correct
// positions on this pull landed up to ~57 degrees off (Ayumi Emi, Archidel
// Del'archi), while every confirmed-wrong one was 90+ degrees off (a
// genuinely different tower, not just imprecise). 60 cleanly separates both
// groups on this pull's data; see module header's known-limitations note.
const WRONG_TOWER_ANGLE_TOLERANCE   = 60;

const SUPPORT_SLOTS: readonly FFRoleSlot[] = ["MT", "OT", "H1", "H2"];
const GROUP1_SLOTS:  readonly FFRoleSlot[] = ["MT", "H1", "M1", "R1"];

function trueBearing(x: number, y: number): number {
  const dx = x - ARENA_CENTER, dy = y - ARENA_CENTER;
  return (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
}

function distanceFromCenter(x: number, y: number): number {
  return Math.hypot(x - ARENA_CENTER, y - ARENA_CENTER);
}

function angleDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

function expectedTowerBearing(kefkaBearing: number, isSupport: boolean, isGroup1: boolean): number {
  const offset = isSupport ? (isGroup1 ? -45 : 45) : (isGroup1 ? 225 : 135);
  return ((kefkaBearing + offset) % 360 + 360) % 360;
}

// The puddle drops (telegraphs) themselves have no logged signal at all —
// they're not an attack, just a ground marker appearing under each player,
// confirmed absent from both begincast (no sourceResources on it here) and
// "cast" (which only fires later, on DETONATION — see resolveDataWaveTime
// stamps below). Per the user's direct VOD timing (2026-07-24 session):
// drop 1 lands ~7s after the mechanic-start "Earthquake" cast, drop 2 ~3s
// after drop 1 — best-available estimate, not yet confirmed against a
// second pull. These are what every check in this module is anchored to
// and displayed at, NOT the later detonation timestamps.
const EARTHQUAKE_TO_FIRST_DROP_MS = 7000;
const FIRST_TO_SECOND_DROP_MS     = 3000;

/** Kefka's own facing bearing + timestamp at the mechanic-start "Earthquake" cast — the whole sequence's reference. Returns null if this pull never reaches it (or blackHoleGeometry wasn't captured). */
function resolveKefkaReference(geometry: BlackHoleGeometry | undefined): { bearing: number; timestamp: number } | null {
  const sample = (geometry?.kefkaFacingSamples ?? [])
    .filter((s) => s.abilityName === EARTHQUAKE_ABILITY_NAME)
    .sort((a, b) => a.timestamp - b.timestamp)[0];
  return sample ? { bearing: kefkaFacingToBearing(sample.facing), timestamp: sample.timestamp } : null;
}

// A real wave is Exdeath spawning one personal ghost puddle per player
// (confirmed: 8 simultaneous "cast" entries per wave) — this excludes
// Exdeath's own solo self-targeted "Blizzard III" announcement cast that
// precedes each wave by a few seconds under the SAME ability name (a
// different ability ID sharing the display name, same multi-ID-per-name
// pattern as "Earthquake"/"Slap Happy" elsewhere in this fight). Without
// this floor, that solo announcement cast gets mistaken for wave 1 itself,
// shifting every wave index off by one — confirmed the hard way against
// report LF2yJZabVprjXYvm pull 1's "Wrong Tower" false positives on
// Chauzey Solstice/Ayumi Emi, both confirmed correct by the user.
const MIN_WAVE_CLUSTER_SIZE = 4;

/**
 * The "cast" (DETONATION, not drop) timestamps of the first two Blizzard III
 * waves, clustered from every simultaneous ghost tick — used ONLY to find
 * which timestamp the ghost puddles' own x/y data lives at (see
 * fflBuildStompiesPuddleSamples). A puddle's ground position is fixed the
 * instant it's placed and never moves again, so this detonation-time
 * snapshot is numerically identical to the real drop-time position — but
 * the actual CHECK timing (what gets displayed, what player positions get
 * sampled against) always uses the fixed drop-time offsets from
 * resolveKefkaReference, never this. Returns null entries for waves that
 * never happened.
 */
function resolveDataWaveTimestamps(enemyCasts: EnemyEvent[] | undefined): [number | null, number | null] {
  const timestamps = (enemyCasts ?? [])
    .filter((e) => e.abilityName === BLIZZARD_III_ABILITY_NAME)
    .map((e) => e.timestamp)
    .sort((a, b) => a - b);

  const clusters: number[][] = [];
  for (const t of timestamps) {
    const current = clusters[clusters.length - 1];
    if (current && t - current[current.length - 1] <= WAVE_CLUSTER_TOLERANCE_MS) current.push(t);
    else clusters.push([t]);
  }
  const waves = clusters.filter((c) => c.length >= MIN_WAVE_CLUSTER_SIZE).map((c) => c[0]);
  return [waves[0] ?? null, waves[1] ?? null];
}

type Position = { x: number; y: number };
type PuddleSample = { timestamp: number; x: number; y: number };

/**
 * Nearest damageTaken/self-targeted-healing position sample to `timestamp`,
 * or null if nothing is within MAX_POSITION_SAMPLE_AGE_MS (fails closed
 * rather than trust a stale position).
 *
 * `player.healing`'s x/y is only this player's OWN position on a self-heal
 * — same "check both target and source" pattern limitcut.ts's
 * findOwnPositionNear already established for exactly this ambiguity: the
 * real app's healing is CAST BY this player (target === player.name marks a
 * self-cast, x/y = recipient's position), the validation harness's is
 * RECEIVED BY this player (source === player.name marks the same thing,
 * x/y always their own already) — checking both covers whichever shape fed
 * this call. Confirmed the hard way: this bug passed every harness check
 * clean (harness's orientation made ANY healing entry a valid self-position
 * sample) but produced scrambled results in the real app (wrong players
 * flagged for "Bait Positioned Too Close To Center" on report
 * LF2yJZabVprjXYvm pull 1) until this filter was added.
 */
function nearestPosition(player: PlayerInfo, timestamp: number): Position | null {
  let best: Position | null = null;
  let bestDiff = Infinity;
  const selfHeals = player.healing.filter((e) => e.target === player.name || e.source === player.name);
  for (const stream of [player.damageTaken, selfHeals]) {
    for (const e of stream) {
      if (e.x === undefined || e.y === undefined) continue;
      const diff = Math.abs(e.timestamp - timestamp);
      if (diff < bestDiff) { bestDiff = diff; best = { x: e.x, y: e.y }; }
    }
  }
  return best !== null && bestDiff <= MAX_POSITION_SAMPLE_AGE_MS ? best : null;
}


function isDeadBefore(deathEvents: DeathEvent[], playerName: string, timestamp: number): boolean {
  return deathEvents.some((d) => d.player === playerName && d.timestamp < timestamp);
}

/**
 * Assigns each player to their nearest ghost puddle sample at the wave's
 * timestamp — precise ground-truth position (see fflBuildStompiesPuddle
 * Samples), just missing a player label. Identity only needs to survive a
 * rough approximate match here (the ghosts are typically hundreds to
 * thousands of units apart in practice — a much easier bar than getting a
 * bearing exactly right), via each player's own best-available damageTaken/
 * healing sample. Greedy nearest-first so a clearly-best pairing is locked
 * in before weaker ones compete for what's left; unmatched players (no
 * player-side sample, or more players than ghosts found) are simply
 * skipped — same fail-closed posture as the rest of this module.
 */
function matchPuddlesToPlayers(
  players: PlayerInfo[],
  puddleSamples: Position[],
  waveTimestamp: number
): Map<string, Position> {
  type Candidate = { playerName: string; puddleIndex: number; distance: number };
  const candidates: Candidate[] = [];

  for (const player of players) {
    const approx = nearestPosition(player, waveTimestamp);
    if (!approx) continue;
    puddleSamples.forEach((puddle, puddleIndex) => {
      const distance = Math.hypot(puddle.x - approx.x, puddle.y - approx.y);
      candidates.push({ playerName: player.name, puddleIndex, distance });
    });
  }
  candidates.sort((a, b) => a.distance - b.distance);

  const result = new Map<string, Position>();
  const usedPuddles = new Set<number>();
  for (const c of candidates) {
    if (result.has(c.playerName) || usedPuddles.has(c.puddleIndex)) continue;
    result.set(c.playerName, puddleSamples[c.puddleIndex]);
    usedPuddles.add(c.puddleIndex);
  }
  return result;
}

function detectBaitTooCloseErrors(
  players: PlayerInfo[],
  deathEvents: DeathEvent[],
  dropTimestamp: number,
  slotByName: Map<string, FFRoleSlot>,
  puddleSamples: Position[]
): PullError[] {
  const errors: PullError[] = [];
  const positionByPlayer = matchPuddlesToPlayers(players, puddleSamples, dropTimestamp);

  for (const player of players) {
    if (isDeadBefore(deathEvents, player.name, dropTimestamp)) continue;
    const slot = slotByName.get(player.name);
    if (!slot) continue;

    const pos = positionByPlayer.get(player.name);
    if (!pos) continue;

    const distance = distanceFromCenter(pos.x, pos.y);
    if (distance >= BAIT_TOO_CLOSE_DISTANCE) continue;

    errors.push({
      ruleId:      STOMPIES_BAIT_TOO_CLOSE_RULE_ID,
      severity:    "Major",
      name:        "Bait Positioned Too Close To Center",
      description: "Didn't move far enough from center when baiting the first Blizzard III puddle — standing too close to the middle strains the rest of the raid's spread.",
      timestamp:   dropTimestamp,
      player:      player.name,
      class:       player.className,
      specId:      player.specId,
      role:        player.role,
      abilityId:   0,
      abilityName: BLIZZARD_III_ABILITY_NAME,
    });
  }

  return errors;
}

function detectWrongTowerErrors(
  players: PlayerInfo[],
  deathEvents: DeathEvent[],
  kefkaBearing: number,
  dropTimestamp: number,
  sampleTimestamp: number,
  slotByName: Map<string, FFRoleSlot>
): PullError[] {
  const errors: PullError[] = [];

  for (const player of players) {
    if (isDeadBefore(deathEvents, player.name, dropTimestamp)) continue;
    const slot = slotByName.get(player.name);
    if (!slot) continue;

    const pos = nearestPosition(player, sampleTimestamp);
    if (!pos) continue;

    const isSupport = SUPPORT_SLOTS.includes(slot);
    const isGroup1  = GROUP1_SLOTS.includes(slot);
    const expected  = expectedTowerBearing(kefkaBearing, isSupport, isGroup1);
    const actual    = trueBearing(pos.x, pos.y);
    if (angleDiff(actual, expected) <= WRONG_TOWER_ANGLE_TOLERANCE) continue;

    errors.push({
      ruleId:      STOMPIES_WRONG_TOWER_RULE_ID,
      severity:    "Major",
      name:        "Wrong Tower",
      description: "Moved to the wrong tower for the second Blizzard III bait — not positioned where their role/group assignment required, leaving their intended tower unsoaked.",
      timestamp:   dropTimestamp,
      player:      player.name,
      class:       player.className,
      specId:      player.specId,
      role:        player.role,
      abilityId:   0,
      abilityName: BLIZZARD_III_ABILITY_NAME,
    });
  }

  return errors;
}

/**
 * Returns [] for any pull that never reaches this mechanic (no "Earthquake"
 * cast from the real Kefka, or fewer than 2 Blizzard III waves), or where
 * FFXIV role slots can't be resolved. See module header for full model +
 * known limitations.
 */
export function detectStompiesErrors(
  players:       PlayerInfo[],
  deathEvents:   DeathEvent[],
  enemyCasts:    EnemyEvent[] | undefined,
  geometry:      BlackHoleGeometry | undefined,
  puddleSamples: PuddleSample[] | undefined
): PullError[] {
  const kefkaRef = resolveKefkaReference(geometry);
  if (kefkaRef === null) return [];

  const [dataWave1, dataWave2] = resolveDataWaveTimestamps(enemyCasts);
  if (dataWave1 === null) return [];

  const dropTime1 = kefkaRef.timestamp + EARTHQUAKE_TO_FIRST_DROP_MS;
  const dropTime2 = dropTime1 + FIRST_TO_SECOND_DROP_MS;

  const slotByName = new Map<string, FFRoleSlot>();
  for (const assignment of detectFFRoles(players)) {
    if (assignment.player) slotByName.set(assignment.player.name, assignment.slot);
  }

  const wave1Puddles: Position[] = (puddleSamples ?? []).filter((p) => p.timestamp === dataWave1);

  const errors: PullError[] = [
    ...detectBaitTooCloseErrors(players, deathEvents, dropTime1, slotByName, wave1Puddles),
  ];
  if (dataWave2 !== null) {
    errors.push(...detectWrongTowerErrors(players, deathEvents, kefkaRef.bearing, dropTime2, dataWave2, slotByName));
  }

  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
