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
// Kefka casts "Stomp-a-Mole" (ability name — the real Boss-subtype actor's
// own cast, always the FIRST of that name in a pull; several NPC-ghost
// repeats of the same ability name immediately follow and are not this) as
// this mechanic's start marker. His FACING at that exact cast, run through
// the SAME kefkaFacingToBearing conversion already validated for Black Hole
// (imported from blackhole-strategy.ts), gives a
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
//   position samples instead (see nearestPosition), queried at the real
//   logged wave-2 "cast" (detonation) timestamp specifically — NOT the
//   estimated drop-time, which is too early for most players to have
//   arrived yet (confirmed: at the estimated drop-time, Kup'o Noodles'
//   nearest sample read as within tolerance of his WRONG tower purely
//   because he hadn't finished walking there). The detonation timestamp is
//   later than the true drop but empirically the only reliable moment
//   available; the error is still DISPLAYED at the estimated drop-time.
//
// ── PLAYER POSITION: THREE SOURCES, ONE OF THEM NEW ─────────────────────
//
// nearestPosition (used for wave 1's identity matching AND all of wave 2)
// draws from three streams, because none of them alone is dense enough to
// survive a quiet mechanic-transition window where a player isn't being
// hit, isn't healing themselves, and (for anyone not currently attacking,
// e.g. a healer mid-GCD-weave) isn't landing hits either:
//   1. player.damageTaken — their own position when THEY get hit.
//   2. player.healing, self-targeted only (target/source === player.name)
//      — their own position on a self-heal. Checking both target and
//      source covers both this app's real orientation (healing = cast BY
//      this player, x/y = recipient's) and the validation harness's
//      (received BY this player, x/y = always their own) — same pattern
//      limitcut.ts's findOwnPositionNear already established.
//   3. playerPositionSamples — their own position on a LANDED HIT against
//      the boss. This is the new one (2026-07-24, prompted directly by the
//      user pointing at Tomestone's replay viewer showing Ayumi Emi
//      correctly near center at the drop when neither of the above two
//      sources had any sample within several seconds of it): FFLogs'
//      public events API never returns a player's own position on
//      anything they DID (damageDone, casts both only ever carry
//      targetResources — confirmed empirically, 0 of several thousand
//      events checked had sourceResources) — EXCEPT when the same
//      underlying hits are queried from the boss's side instead
//      (hostilityType: Enemies + DamageTaken — "damage the enemy took" =
//      damage players dealt), which DOES carry the attacker's own
//      sourceResources. See lib/ffl-client.ts's FIGHT_EVENTS_QUERY comment
//      and log-transforms.ts's fflBuildPlayerPositionSamples. Roughly
//      GCD-frequency (~every 2.5s) for anyone actively attacking, though
//      still sparse for a healer weaving mostly heals (confirmed: Archidel
//      Del'archi had only 17 samples across the ENTIRE pull).
// All three are pooled and the single nearest-in-time sample wins (see
// nearestPosition), gated at MAX_POSITION_SAMPLE_AGE_MS.
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
// - Wave 1's bait-too-close check still doesn't recover Archidel Del'archi
//   on this pull even with all three position sources — his best available
//   sample is 3.5s stale and sits almost exactly equidistant (587 vs 547
//   units) between the correct puddle and a wrong one, a genuine coin-flip
//   this module declines to force either way. Two of the three confirmed
//   players are correctly flagged; the third is a false negative (silent),
//   not a false positive.
// - MATCH_DISTANCE_CEILING (wave 1's identity matching) and
//   MAX_POSITION_SAMPLE_AGE_MS are both first-pass estimates from this one
//   pull's data, not yet cross-validated against a second report.
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
import { findPlayerPosition } from "@/lib/mechanics/player-position";
import { compassBearingOf, angularDistance, distanceFromCenter, facingToCompassBearing as kefkaFacingToBearing } from "@/lib/mechanics/geometry";

export const STOMPIES_BAIT_TOO_CLOSE_RULE_ID = "ffxiv-stompies-bait-too-close-to-center";
export const STOMPIES_WRONG_TOWER_RULE_ID    = "ffxiv-stompies-wrong-tower";


const STOMP_A_MOLE_ABILITY_NAME  = "Stomp-a-Mole";
const BLIZZARD_III_ABILITY_NAME  = "Blizzard III";

// Multiple simultaneous Blizzard III ghost ticks (one per player) land
// within a few ms of each other; separate waves are several seconds apart —
// generous without risking merging two real waves.
const WAVE_CLUSTER_TOLERANCE_MS = 500;

// A position sample older than this (relative to the wave's own timestamp)
// is not trusted — see module header.
const MAX_POSITION_SAMPLE_AGE_MS = 4000;

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

// COMPASS-convention bearings (0°=N — see lib/mechanics/geometry.ts's
// header on the two conventions): everything here is compared against
// strategy/VOD language and Kefka's facing, both compass.
const trueBearing = compassBearingOf;
const angleDiff = angularDistance;

function expectedTowerBearing(kefkaBearing: number, isSupport: boolean, isGroup1: boolean): number {
  const offset = isSupport ? (isGroup1 ? -45 : 45) : (isGroup1 ? 225 : 135);
  return ((kefkaBearing + offset) % 360 + 360) % 360;
}

// The puddle drops (telegraphs) themselves have no logged signal at all —
// they're not an attack, just a ground marker appearing under each player,
// confirmed absent from both begincast (no sourceResources on it here) and
// "cast" (which only fires later, on DETONATION — see resolveDataWaveTime
// stamps below).
//
// Timing is anchored off dataWave1 (the real, already-disambiguated
// >=4-concurrent-cast Blizzard III wave 1 detonation — see
// resolveDataWaveTimestamps) with a fixed NEGATIVE lead, not off any Kefka
// cast: an earlier version anchored off the first "Earthquake" cast
// (ability 47866) attributed to a "Kefka"-named actor, on the assumption
// that name was this mechanic's unique start marker. It isn't — ability
// 47866 is ALSO Black Hole's unrelated Accretion-triggered ground effect,
// cast by a disposable 44-HP ghost instance that, depending on the pull,
// can itself be named "Kefka" in masterData (not always "Chaos"/"Exdeath" —
// which of Black Hole's phantom bodies gets the 5th tether set's Earthquake
// varies pull to pull). Taking the EARLIEST "Kefka"-attributed Earthquake
// cast in the whole pull then reads that unrelated Black Hole moment as the
// Stompies start, several minutes early — confirmed root cause of false
// "Bait Positioned Too Close To Center"/"Wrong Tower" errors on report
// xXV3mdnZvFJ8czBP pulls 1 and 7, and confirmed ABSENT on pulls 5/13/14 of
// the same report only because that pull's ghost happened to be sourced
// from "Chaos"/"Exdeath" instead — the underlying ambiguity was never
// pull-specific. Worse, on report rXBbzFV49hd1QPwf pull 11 no SECOND,
// correctly-timed "Kefka"-attributed Earthquake cast exists at all before
// the real wave 1 — the false one was the ONLY candidate, so no
// disambiguation of the "Earthquake" stream (e.g. "latest before wave1")
// could have recovered it. dataWave1 has no such ambiguity: it's derived
// straight from the real Blizzard III casts, gated at >=4 concurrent
// ticks, already proven correct for puddle-matching. Per the user's direct
// VOD timing (2026-07-24 session, cross-checked against dataWave1's own
// timestamp on report LF2yJZabVprjXYvm pull 1): the real drop lands ~3.4s
// BEFORE wave 1's detonation timestamp, drop 2 ~3s after drop 1 —
// best-available estimate, not yet independently re-confirmed against a
// second VOD.
const WAVE1_TO_FIRST_DROP_LEAD_MS = 3400;
const FIRST_TO_SECOND_DROP_MS     = 3000;

/**
 * Kefka's own facing bearing at his "Stomp-a-Mole" cast — the real,
 * Boss-subtype-actor-sourced mechanic-start cast (several NPC-ghost repeats
 * of the same ability name immediately follow; taking the EARLIEST sample
 * lands on the real Boss-sourced one every time, confirmed across reports
 * LF2yJZabVprjXYvm/xXV3mdnZvFJ8czBP/rXBbzFV49hd1QPwf). Used ONLY for
 * bearing now — see WAVE1_TO_FIRST_DROP_LEAD_MS above for why timing comes
 * from dataWave1 instead. Returns null if this pull never reaches it (or
 * blackHoleGeometry wasn't captured).
 */
function resolveKefkaBearing(geometry: BlackHoleGeometry | undefined): number | null {
  const sample = (geometry?.kefkaFacingSamples ?? [])
    .filter((s) => s.abilityName === STOMP_A_MOLE_ABILITY_NAME)
    .sort((a, b) => a.timestamp - b.timestamp)[0];
  return sample ? kefkaFacingToBearing(sample.facing) : null;
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
type PlayerPositionSample = { timestamp: number; playerName: string; x: number; y: number };

/**
 * Nearest damageTaken/self-heal/boss-hit position sample to `timestamp`,
 * or null if nothing is within MAX_POSITION_SAMPLE_AGE_MS (fails closed
 * rather than trust a stale position). Delegates to the shared lookup
 * (lib/mechanics/player-position.ts — the self-heal dual-check story and
 * stream semantics live in that module's header now; the LF2yJZabVprjXYvm
 * pull 1 scrambled-flags bug that motivated the dual check was found HERE).
 *
 * `playerPositionSamples` covers the gap damageTaken/self-heals leave —
 * both require something to have happened TO this player, which goes quiet
 * during a pure repositioning window (confirmed: Ayumi Emi had no such
 * sample within 4.7s of the real puddle-drop moment on report
 * LF2yJZabVprjXYvm pull 1, during which she covered ~1,650 units of
 * ground); the boss-hit stream stays ~GCD-dense through exactly that kind
 * of window.
 */
function nearestPosition(player: PlayerInfo, timestamp: number, playerPositionSamples: PlayerPositionSample[]): Position | null {
  return findPlayerPosition(player, timestamp, {
    windowMs:        MAX_POSITION_SAMPLE_AGE_MS,
    positionSamples: playerPositionSamples,
  }) ?? null;
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
 *
 * A match distance beyond MATCH_DISTANCE_CEILING is rejected outright
 * rather than accepted as "best available." Without this, a pull where
 * only some players have a usable approximate sample (e.g. a healer who
 * rarely lands hits on the boss, the only source dense enough for this
 * quiet mechanic-transition window — see nearestPosition) forces the
 * REMAINING players into whichever leftover puddle slots are still open,
 * even when none of them are actually a good fit — confirmed on report
 * LF2yJZabVprjXYvm pull 1: with only 6 of 8 players having a fresh-enough
 * sample, Kade Kansado and Chauzey Solstice got force-matched to puddles
 * 790/1177 units from their real approximate position (both wrong), while
 * every genuinely good match on the same pull landed under 590.
 */
const MATCH_DISTANCE_CEILING = 700;

function matchPuddlesToPlayers(
  players: PlayerInfo[],
  puddleSamples: Position[],
  waveTimestamp: number,
  playerPositionSamples: PlayerPositionSample[]
): Map<string, Position> {
  type Candidate = { playerName: string; puddleIndex: number; distance: number };
  const candidates: Candidate[] = [];

  for (const player of players) {
    const approx = nearestPosition(player, waveTimestamp, playerPositionSamples);
    if (!approx) continue;
    puddleSamples.forEach((puddle, puddleIndex) => {
      const distance = Math.hypot(puddle.x - approx.x, puddle.y - approx.y);
      if (distance <= MATCH_DISTANCE_CEILING) candidates.push({ playerName: player.name, puddleIndex, distance });
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
  puddleSamples: Position[],
  playerPositionSamples: PlayerPositionSample[]
): PullError[] {
  const errors: PullError[] = [];
  const positionByPlayer = matchPuddlesToPlayers(players, puddleSamples, dropTimestamp, playerPositionSamples);

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
  slotByName: Map<string, FFRoleSlot>,
  playerPositionSamples: PlayerPositionSample[]
): PullError[] {
  const errors: PullError[] = [];

  for (const player of players) {
    if (isDeadBefore(deathEvents, player.name, dropTimestamp)) continue;
    const slot = slotByName.get(player.name);
    if (!slot) continue;

    const pos = nearestPosition(player, sampleTimestamp, playerPositionSamples);
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
  players:               PlayerInfo[],
  deathEvents:           DeathEvent[],
  enemyCasts:            EnemyEvent[] | undefined,
  geometry:              BlackHoleGeometry | undefined,
  puddleSamples:         PuddleSample[] | undefined,
  playerPositionSamples: PlayerPositionSample[] | undefined
): PullError[] {
  const [dataWave1, dataWave2] = resolveDataWaveTimestamps(enemyCasts);
  if (dataWave1 === null) return [];

  const kefkaBearing = resolveKefkaBearing(geometry);
  if (kefkaBearing === null) return [];

  const dropTime1 = dataWave1 - WAVE1_TO_FIRST_DROP_LEAD_MS;
  const dropTime2 = dropTime1 + FIRST_TO_SECOND_DROP_MS;

  const slotByName = new Map<string, FFRoleSlot>();
  for (const assignment of detectFFRoles(players)) {
    if (assignment.player) slotByName.set(assignment.player.name, assignment.slot);
  }

  const wave1Puddles: Position[] = (puddleSamples ?? []).filter((p) => p.timestamp === dataWave1);
  const positionSamples = playerPositionSamples ?? [];

  const errors: PullError[] = [
    ...detectBaitTooCloseErrors(players, deathEvents, dropTime1, slotByName, wave1Puddles, positionSamples),
  ];
  if (dataWave2 !== null) {
    errors.push(...detectWrongTowerErrors(players, deathEvents, kefkaBearing, dropTime2, dataWave2, slotByName, positionSamples));
  }

  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
