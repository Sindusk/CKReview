// lib/mechanics/ffxiv/dancingmad/stompies.ts
//
// ── DIGEST (read first; detail in the sections it names) ─────────────────
// What: P3 "Stompies" (Earthquake / Stomp-a-Mole), right after Black Hole:
//   Blizzard III wave 1 (bait spread to intercards), wave 2 (cardinal towers),
//   then the Stomp-a-Mole pair towers (47856). Relative north K comes from
//   Kefka's facing at the first Stomp-a-Mole cast (blackhole-strategy.ts's
//   kefkaPositionBearing). Later stages (slides 4-7) not covered.
// Rules (ruleId, severity: meaning):
//   ffxiv-stompies-bait-too-close-to-center  Major  wave 1: every own position
//     sample within +-1s of the first drop is < 3y from center (no sample: no call)
//   ffxiv-stompies-wrong-tower               Major  wave 2: bearing > 60 deg off
//     the player's expected tower; silent when every living player took a
//     Stomp-a-Mole hit (all towers covered)
//   ffxiv-stompies-mole-partner              Major  stood in a Stomp-a-Mole tower
//     already holding another complete pair while own partner was alive
//   ffxiv-stompies-death-unresolvable        Raid   a player still dead at the
//     first drop, and a Stomp-a-Mole tower hit then kills someone
// Cutoffs: ffxiv-stompies-death-unresolvable, anchored on the dead player's
//   lethal hit; this module's own errors after it are dropped as fallout.
// Key thresholds:
//   BAIT_TOO_CLOSE_DISTANCE = 300 (first-pass; no VOD-confirmed true positive
//     on disk), BAIT_POSITION_WINDOW_MS = 1000
//   WRONG_TOWER_ANGLE_TOLERANCE = 60 (correct up to ~57 deg / wrong 90+,
//     LF2yJZabVprjXYvm pull 1)
//   WAVE1_TO_FIRST_DROP_LEAD_MS = 3400 (drop 1 = wave-1 detonation - 3.4s;
//     the header's TIMING section still names Earthquake offsets, superseded
//     by the comment above this constant), FIRST_TO_SECOND_DROP_MS = 3000
//   MAX_POSITION_SAMPLE_AGE_MS = 4000 (first-pass); STOMP_A_MOLE_SOAK_WINDOW_MS
//     = 20000; solo soak 149-271k (lethal) vs pairs 56-188k
// Strategy/assumptions: G1 = MT/H1/M1/R1, G2 = OT/H2/M2/R2. Wave 1: supports
//   to K, DPS to K+180. Wave 2: Sup G1 K-45, Sup G2 K+45, DPS G1 K+225,
//   DPS G2 K+135. Mole pairs MT+H1, OT+H2, M1+R1, M2+R2.
// Sections (Grep the heading text):
//   "THE MECHANIC, AS FAR AS THIS MODULE COVERS"  Stomp-a-Mole cast, K bearing
//   "GEOMETRY MODEL, CONFIRMED"  groups, bearing convention, expected bearings
//   "TIMING: FIXED DROP-TIME OFFSETS"  drop vs detonation, unusable puddle data
//   "PLAYER POSITION: THREE SOURCES"  nearestPosition streams
//   "ERRORS DETECTED"  the four rules, VOD review dates
//   "KNOWN LIMITATIONS (first pass"  unvalidated thresholds, uncovered stages
//   "OPEN QUESTIONS (VOD needed"  unreviewed flags
//   "BAIT TOO CLOSE: THE BAITER'S OWN POSITION"  (code) rule 1 evidence
//   "EVERY TOWER SOAKED => NOBODY PICKED A WRONG TOWER"  (code) rule 2 gate
//   "STOMP-A-MOLE TOWER PARTNERS"  (code) rule 3 evidence
//   "DEAD AT THE FIRST DROP -> UNRESOLVABLE"  (code) rule 4 cutoff
// Open items: bait-too-close re-check on PM8HY9nJ7kTR4tdQ pull 3 if refetched;
//   qjCMx4bRfgNKwX9T pull 1 11:40 RPR flag not VOD-reviewed; rule 4 rests on
//   one firing pull (BpAdkacQh63VCrRM Pull 4); drop offsets and thresholds
//   from one pull.
// ── END DIGEST ───────────────────────────────────────────────────────────
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
// the SAME conversion already validated for Black Hole
// (blackhole-strategy.ts's kefkaPositionBearing: the direction BEHIND his
// facing; VOD 2T1HzdPKgbhM43am pull 9 shows him dead centre facing SW at
// this cast while K reads NE), gives a
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
// Neither wave's ghost "puddle" data is usable as a player position:
// - Wave 1's (fflBuildStompiesPuddleSamples) was first read as 8 distinct
//   per-player positions. It isn't (VERIFIED 2026-10-28, all 16 Stompies
//   attempts in the 9 Dancing Mad reports on disk): the wave-1 Blizzard III
//   "cast" (47885) positions are the ghost casters' fixed spawn points, the
//   same set every pull — (9010,9010), a pair 20-115 units from centre,
//   two or three at exactly (10000,10000), (10000,10400) and a pair ~1400
//   out — while the players stand 6-10y out. Wave 1 now reads the players'
//   own positions instead (see BAIT_TOO_CLOSE_DISTANCE).
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
//    own position samples within ±1s of the estimated drop are ALL within
//    BAIT_TOO_CLOSE_DISTANCE (3y) of arena center (no sample: no call).
//    Confirmed on Ayumi Emi, Archidel Del'archi, and Azura Salus this pull — the user
//    was explicit this is a pure distance failure (direction not checked),
//    unlike every other check in this module. Until 2026-10-28 the position
//    was the nearest wave-1 ghost "puddle", which proved to be fixed spawn
//    points (above); the user called one of the resulting flags wrong
//    (BpAdkacQh63VCrRM Pull 1 11:40). See BAIT_TOO_CLOSE_DISTANCE.
//
// 2. "Wrong Tower" (Major) — wave 2: a player whose position bearing is more
//    than WRONG_TOWER_ANGLE_TOLERANCE off their own expected tower bearing
//    (i.e. closer to a neighboring tower than their own). Confirmed on
//    Sayacissa Morsaelth, Kup'o Noodles, and Azura Salus this pull (the
//    first two swapped to the mirror-opposite tower; Azura was simply lost).
//
// 3. "Wrong Stomp-a-Mole Tower" (Major, ffxiv-stompies-mole-partner) — the
//    Stomp-a-Mole towers (47856) after wave 2 are soaked in pairs MT+H1,
//    OT+H2, M1+R1, M2+R2; a player in a tower already holding another
//    complete pair, while their own partner was alive, is flagged. See
//    detectMolePartnerErrors for the evidence.
//
// 4. "Stompies Unresolvable After Death" (Raid, ffxiv-stompies-death-
//    unresolvable) — a player still dead (not raised) at the first drop,
//    when a Stomp-a-Mole tower hit then kills someone: their partner soaked
//    alone. Anchored on the dead player's lethal hit; this module's own
//    errors after it are dropped as fallout. See
//    detectDeadAtStartUnresolvable (user, 2026-10-28, BpAdkacQh63VCrRM Pull 4).
//
// VOD review 2026-10-24 (user): report gTkMH91DWRmLbNCn pull 1, ruling in
// expectations/rulings.json. VOD review 2026-10-28 (user): report
// BpAdkacQh63VCrRM Pull 1 11:40 (rule 1) and Pull 4 11:36-11:50 (rule 4).
//
// ── KNOWN LIMITATIONS (first pass, single-pull validation) ─────────────────
//
// - Wave 1's bait-too-close check has no VOD-confirmed true positive on
//   disk: the confirmed ones (LF2yJZabVprjXYvm pull 1, PM8HY9nJ7kTR4tdQ
//   pull 3) aren't fetched, and were found with the old puddle match, so
//   whether the own-position check still catches them is unverified. Many
//   players have no own sample within ±1s of the drop and get no call.
// - MAX_POSITION_SAMPLE_AGE_MS is a first-pass estimate from one pull's
//   data, not yet cross-validated against a second report.
// - Only wave 1 (bait) and wave 2 (tower) are covered, per explicit user
//   scope ("if we can just get these first 2 steps detected, that would be
//   sufficient") — this pull never survived long enough to reach the later
//   stack-swap/mid/Big-Bang stages (slides 4-7), so there is no real data to
//   build or validate detection for them yet.
// - The 7s/3s drop-time offsets, the distance threshold for check 1, and
//   the angle tolerance for check 2 are all first-pass estimates from a
//   single pull's data, not yet cross-validated against a second report.
//
// ── OPEN QUESTIONS (VOD needed; moved from docs/open-items.md 2026-10-15) ──
//   - Bait-too-close on report PM8HY9nJ7kTR4tdQ pull 3: the puddle
//     positions were the ghosts' spawn points (fixed 2026-10-28 by reading
//     own positions). Re-check against the user's call there (two players
//     too close, per that pull's ruling note) if that report is refetched.
//   - qjCMx4bRfgNKwX9T pull 1 11:40: the RPR is flagged (all own samples
//     0.6y at -0.7s); not VOD-reviewed.
//   - Rule 4 rests on one firing pull (BpAdkacQh63VCrRM 4) plus the pair
//     structure; it isn't limited to tanks. A dead DPS or healer at the
//     drop with a lethal solo soak fires it too.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { PullError } from "@/types/PullError";
import type { DeathEvent } from "@/types/DeathEvent";
import type { EnemyEvent } from "@/types/PullError";
import type { BlackHoleGeometry } from "@/types/Pull";
import { detectFFRoles, type FFRoleSlot } from "@/lib/mechanics/ffxiv/roles";
import { findPlayerPosition } from "@/lib/mechanics/player-position";
import { compassBearingOf, angularDistance, distanceFromCenter } from "@/lib/mechanics/geometry";
import { kefkaPositionBearing } from "@/lib/mechanics/ffxiv/dancingmad/blackhole-strategy";
import { aliveAt } from "@/lib/mechanics/wow/common";

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

// BAIT TOO CLOSE: THE BAITER'S OWN POSITION, NOT THE "PUDDLE" (user,
// 2026-10-28, report BpAdkacQh63VCrRM Pull 1 11:40: "Detection is incorrect
// here. [The PCT] places the puddle reasonably in this pull. It's fairly well
// aligned with the rest of the group.").
//
// The wave-1 Blizzard III "cast" positions this check used to match players
// to are not the baits at all: they are the ghost casters' own spawn points,
// the SAME set in every pull on disk — (9010,9010), a pair 20-115 units from
// centre, two or three at exactly (10000,10000), (10000,10400) and a pair at
// ~1400 out (e.g. BpAdkacQh63VCrRM pull 1: (9010,9010) x2, (9982,10050) x2,
// (10000,10000) x3, (10000,10400)). Matching a player to the nearest one
// within 700 units flagged whoever stood closest to a centre ghost: 7 flags
// in BpAdkacQh63VCrRM (pulls 1, 3, 4, 5, 10), every one 6.0-8.3y out by the
// player's own samples. Same root cause as PM8HY9nJ7kTR4tdQ pull 3's
// unreconcilable flags (ruling note, 2026-08-10).
//
// So the check reads the player's own positions within
// ±BAIT_POSITION_WINDOW_MS of the estimated drop and compares the FARTHEST of
// them to the line. The window is tight because the raid is running out from
// centre right at the drop, ~200-400 units/s (qjCMx4bRfgNKwX9T pull 1 RPR
// 64 -> 681 units across 3.0s; its WAR MT 320 -> 600 across 0.7s): one
// second either side already moves a player most of the 300-unit line.
// Measured on all 16 Stompies attempts in the 9 Dancing Mad reports on disk:
//   clean extreme: the farthest own sample in the window is >= 597 units
//     (6.0y; BpAdkacQh63VCrRM pull 10 PCT) for every player who has one,
//     bar one; the pull 1 PCT the user called fine reads 6.95y. Many
//     players have no sample in the window and are skipped (fail closed).
//   flagged: qjCMx4bRfgNKwX9T pull 1 11:40, the RPR: three samples, all
//     64 units (0.6y) at -0.7s, then 681 at +2.3s. The old puddle match
//     flagged the same player; not yet VOD-reviewed.
//   no longer flagged (unreviewed, same root cause): qjCMx4bRfgNKwX9T pull 6
//     11:40 WAR (farthest 6.0y; 3.2y at -0.3s, 6.0y at +0.4s) and
//     yBKPqGwHparm7Tk4 pull 5 DRK (farthest 8.3y).
// No VOD-confirmed too-close bait is on disk (the confirmed ones, report
// LF2yJZabVprjXYvm pull 1 and PM8HY9nJ7kTR4tdQ pull 3, are not fetched), so
// the 300-unit line itself is still the first-pass value.
const BAIT_TOO_CLOSE_DISTANCE       = 300;
const BAIT_POSITION_WINDOW_MS       = 1000;
// 45 degrees (halfway to a neighboring tower) is the theoretical boundary,
// but real players don't land on the mathematical point — confirmed-correct
// positions on this pull landed up to ~57 degrees off (Ayumi Emi, Archidel
// Del'archi), while every confirmed-wrong one was 90+ degrees off (a
// genuinely different tower, not just imprecise). 60 cleanly separates both
// groups on this pull's data; see module header's known-limitations note.
const WRONG_TOWER_ANGLE_TOLERANCE   = 60;

// EVERY TOWER SOAKED => NOBODY PICKED A WRONG TOWER (2026-08-10, report
// PM8HY9nJ7kTR4tdQ pulls 3 and 16). There is one Stomp-a-Mole tower per
// player, so when every living player takes a Stomp-a-Mole hit the towers
// were all covered and the mechanic resolved — whatever a position sample
// says, no one can have been at the wrong one. This is the outcome gate
// lib/mechanics/README.md rule 4 calls for, and it is needed because the
// towers are preceded by a CENTER STACK: a sample taken from that stack (or
// a stale one that never left it) sits a few dozen units from arena center,
// where the bearing this check reads is pure noise — a hundred units of
// jitter swings it through 180°.
//
// Confirmed false positives: Archidel Del'archi flagged in both pulls,
// reading (10098,10056) — 112 units from center — and (9914,10030) — 91
// units — while the user confirmed from the VOD that he soaked the center
// stack and then moved out to his own tower with Sayacissa Morsaelth and
// soaked that too. Both pulls have all 8 players on Stomp-a-Mole. Every
// confirmed genuine failure keeps flagging, because those pulls left towers
// empty: LF2yJZabVprjXYvm pull 1 (5 of 8 soaked), pull 3 (5 of 8), and
// G7kTFVxjcAC6p1MN pull 7 (6 of 8).
const STOMP_A_MOLE_SOAK_WINDOW_MS = 20000;

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
  return sample ? kefkaPositionBearing(sample.facing) : null;
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
 * Every position this player's own events carry within ±BAIT_POSITION_WINDOW_MS
 * of `timestamp` — the same streams findPlayerPosition pools (damage taken,
 * self-heals, self-targeted casts, heals received, boss-hit samples), but all
 * of them rather than the single nearest.
 */
function ownPositionsNear(player: PlayerInfo, timestamp: number, playerPositionSamples: PlayerPositionSample[]): Position[] {
  const near = (t: number) => Math.abs(t - timestamp) <= BAIT_POSITION_WINDOW_MS;
  const out: Position[] = [];
  const add = (t: number, x: number | undefined, y: number | undefined) => {
    if (x !== undefined && y !== undefined && near(t)) out.push({ x, y });
  };
  for (const e of player.damageTaken) add(e.timestamp, e.x, e.y);
  for (const e of player.healing) if (e.target === player.name || e.source === player.name) add(e.timestamp, e.x, e.y);
  for (const e of player.casts) if (e.target === player.name) add(e.timestamp, e.x, e.y);
  for (const e of player.healingReceived) add(e.timestamp, e.x, e.y);
  for (const s of playerPositionSamples) if (s.playerName === player.name) add(s.timestamp, s.x, s.y);
  return out;
}

function detectBaitTooCloseErrors(
  players: PlayerInfo[],
  deathEvents: DeathEvent[],
  dropTimestamp: number,
  slotByName: Map<string, FFRoleSlot>,
  playerPositionSamples: PlayerPositionSample[]
): PullError[] {
  const errors: PullError[] = [];

  for (const player of players) {
    if (isDeadBefore(deathEvents, player.name, dropTimestamp)) continue;
    const slot = slotByName.get(player.name);
    if (!slot) continue;

    // Fail closed: no own sample near the drop, no call. Flag only when
    // EVERY sample in the window is inside the line (the farthest one is
    // what's compared), so a player caught mid-run-out isn't read as
    // standing at centre.
    const positions = ownPositionsNear(player, dropTimestamp, playerPositionSamples);
    if (positions.length === 0) continue;
    const distance = Math.max(...positions.map((p) => distanceFromCenter(p.x, p.y)));
    if (distance >= BAIT_TOO_CLOSE_DISTANCE) continue;

    errors.push({
      ruleId:      STOMPIES_BAIT_TOO_CLOSE_RULE_ID,
      severity:    "Major",
      name:        "Bait Positioned Too Close To Center",
      description: `Was ~${(distance / 100).toFixed(1)} yalms from center when the first Blizzard III puddle dropped — baits go out to the intercardinals, and standing in the middle strains the rest of the raid's spread.`,
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

  // See STOMP_A_MOLE_SOAK_WINDOW_MS: if every player still alive soaked a
  // tower, the mechanic resolved and nobody was at the wrong one.
  const living = players.filter((p) => !isDeadBefore(deathEvents, p.name, dropTimestamp));
  const soaked = living.filter((p) =>
    p.damageTaken.some(
      (e) => e.abilityName === STOMP_A_MOLE_ABILITY_NAME && Math.abs(e.timestamp - dropTimestamp) <= STOMP_A_MOLE_SOAK_WINDOW_MS
    )
  );
  if (living.length > 0 && soaked.length === living.length) return [];

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

// ── STOMP-A-MOLE TOWER PARTNERS (2026-10-24, gTkMH91DWRmLbNCn) ─────────────
// Each Stomp-a-Mole tower is soaked by a pair, the slots this module's wave-2
// model already puts at the same tower: MT+H1, OT+H2, M1+R1, M2+R2 (user,
// 2026-10-24). The four towers fire one after another ~1.3s apart (47856, one
// hit set each). All 10 clean resolutions on disk (gTkMH91DWRmLbNCn pulls
// 3/8/11, 2T1HzdPKgbhM43am 9, qjCMx4bRfgNKwX9T 1/6/9/16, yBKPqGwHparm7Tk4 5)
// hit exactly those pairs, ~56-175k each. gTkMH91DWRmLbNCn pull 1 11:47: H1
// soaked alone (205k, died) while the MT stood in the M1+R1 tower; the user
// called it a Major on the MT. So a player standing in a tower that already
// holds another complete pair, while their own partner was alive, is flagged.
const STOMP_A_MOLE_TOWER_ABILITY_ID = 47856;
const STOMP_TOWER_GAP_MS = 500;
export const STOMPIES_MOLE_PARTNER_RULE_ID = "ffxiv-stompies-mole-partner";
const STOMP_PARTNER: Readonly<Partial<Record<FFRoleSlot, FFRoleSlot>>> = {
  MT: "H1", H1: "MT", OT: "H2", H2: "OT", M1: "R1", R1: "M1", M2: "R2", R2: "M2",
};

function detectMolePartnerErrors(players: PlayerInfo[], deathEvents: DeathEvent[], slotByName: Map<string, FFRoleSlot>): PullError[] {
  type Hit = { player: PlayerInfo; slot: FFRoleSlot | undefined; timestamp: number; amount: number };
  const hits: Hit[] = players
    .flatMap((p) => p.damageTaken
      .filter((e) => e.abilityId === STOMP_A_MOLE_TOWER_ABILITY_ID)
      .map((e) => ({ player: p, slot: slotByName.get(p.name), timestamp: e.timestamp, amount: e.amount ?? 0 })))
    .sort((a, b) => a.timestamp - b.timestamp);
  if (hits.length === 0) return [];
  const first = hits[0].timestamp;
  const towers: Hit[][] = [];
  for (const h of hits.filter((x) => x.timestamp - first <= STOMP_A_MOLE_SOAK_WINDOW_MS)) {
    const last = towers[towers.length - 1];
    if (last && h.timestamp - last[last.length - 1].timestamp <= STOMP_TOWER_GAP_MS) last.push(h);
    else towers.push([h]);
  }

  const errors: PullError[] = [];
  for (const tower of towers) {
    const slots = new Set(tower.map((h) => h.slot));
    for (const h of tower) {
      const partner = h.slot && STOMP_PARTNER[h.slot];
      if (!partner || slots.has(partner)) continue;
      const otherPair = tower.find((o) => o !== h && o.slot && STOMP_PARTNER[o.slot] && slots.has(STOMP_PARTNER[o.slot]!));
      if (!otherPair) continue;
      const partnerName = [...slotByName].find(([, s]) => s === partner)?.[0];
      // Alive when the towers began (their solo soak may have killed them since).
      if (!partnerName || isDeadBefore(deathEvents, partnerName, first)) continue;
      const partnerTower = towers.find((t) => t.some((x) => x.player.name === partnerName));
      const alone = partnerTower && partnerTower.length === 1 ? partnerTower[0] : undefined;
      const others = tower.filter((o) => o !== h).map((o) => o.player.name).join(" and ");
      errors.push({
        ruleId:      STOMPIES_MOLE_PARTNER_RULE_ID,
        severity:    "Major",
        name:        "Wrong Stomp-a-Mole Tower",
        description: `Stood in ${others}'s Stomp-a-Mole tower instead of their own partner ${partnerName}'s` +
          (alone ? `, who soaked theirs alone (~${Math.round(alone.amount / 1000)}k).` : "."),
        timestamp:   h.timestamp,
        player:      h.player.name,
        class:       h.player.className,
        specId:      h.player.specId,
        role:        h.player.role,
        abilityId:   STOMP_A_MOLE_TOWER_ABILITY_ID,
        abilityName: STOMP_A_MOLE_ABILITY_NAME,
      });
    }
  }
  return errors;
}

// ── DEAD AT THE FIRST DROP -> UNRESOLVABLE (2026-10-28, BpAdkacQh63VCrRM) ──
// Stomp-a-Mole's four towers are soaked in pairs (above), so a player still
// dead when the Blizzard III baits drop leaves a partner to soak alone, and
// a solo soak kills: 149-271k solo (BpAdkacQh63VCrRM pull 4 DRG and PLD;
// gTkMH91DWRmLbNCn pull 1 WHM 205k, all three died) against 56-188k for
// the pairs in every clean resolution. User, 2026-10-28, Pull 4 11:36-11:50
// (the DRK died to a boss auto at 11:36, 4s before the first drop, and was
// raised only for the last tower): "[The DRK] being dead makes this mostly
// unrecoverable. The pull isn't really recoverable after that death. I
// think [the PCT] tried to help with the stack to prevent more deaths." So
// the death is the cutoff, and the PCT's wrong tower (11:43) and the solo
// soak deaths after it are its fallout.
//
// Gated on the outcome, as PITFALLS' "A death that leaves later shares
// short is a cutoff only if the shortfall killed": it fires only when a
// Stomp-a-Mole tower hit then kills someone. Checked on every Stompies
// attempt on disk (16, 9 reports): the only player dead at the drop is that
// DRK. gTkMH91DWRmLbNCn pull 11 had its DRK (6:19) and PCT (~11:18) die
// before Stompies and both raised in time: everyone alive at the drop, all
// four towers paired, and the pull went on to the Phase 3 enrage — so
// "alive at the drop" (lib/mechanics/wow/common.ts aliveAt: a hit or cast
// after the death) is what separates the two, not "died this phase".
export const STOMPIES_DEATH_UNRESOLVABLE_RULE_ID = "ffxiv-stompies-death-unresolvable";
const DEATH_EVENT_LAG_MS = 2000; // FFLogs' death event lands ~2s after the lethal hit
const RAID_MARKER_SORT_OFFSET_MS = 1;

function detectDeadAtStartUnresolvable(players: PlayerInfo[], deathEvents: DeathEvent[], dropTimestamp: number): PullError | null {
  const deadAtDrop = players.filter((p) => !aliveAt(p, deathEvents, dropTimestamp));
  if (deadAtDrop.length === 0) return null;
  const moleKill = deathEvents.some((d) => d.killingAbilityGameId === STOMP_A_MOLE_TOWER_ABILITY_ID && d.timestamp > dropTimestamp);
  if (!moleKill) return null;

  // The latest unraised death before the drop is the one that left the pair short.
  const deaths = deadAtDrop
    .map((p) => deathEvents.filter((d) => d.player === p.name && d.timestamp <= dropTimestamp).sort((a, b) => b.timestamp - a.timestamp)[0])
    .filter((d): d is DeathEvent => d !== undefined)
    .sort((a, b) => b.timestamp - a.timestamp);
  const death = deaths[0];
  if (!death) return null;
  const names = deadAtDrop.map((p) => p.name).join(" and ");
  return {
    ruleId:      STOMPIES_DEATH_UNRESOLVABLE_RULE_ID,
    severity:    "Raid",
    name:        "Stompies Unresolvable After Death",
    description: `${names} ${deadAtDrop.length > 1 ? "were" : "was"} dead when the first Blizzard III puddles dropped. Stomp-a-Mole's towers are soaked in pairs, so a partner had to soak alone and the solo soak killed — unresolvable from here; treated as a cutoff point for further per-player analysis this pull.`,
    timestamp:   Math.max(0, death.timestamp - DEATH_EVENT_LAG_MS) + RAID_MARKER_SORT_OFFSET_MS,
    abilityId:   death.killingAbilityGameId,
    abilityName: death.cause,
  };
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

  // puddleSamples is no longer read: the wave-1 "puddle" positions are the
  // ghost casters' fixed spawn points, not the baits (see BAIT_TOO_CLOSE_DISTANCE).
  void puddleSamples;
  const positionSamples = playerPositionSamples ?? [];

  const errors: PullError[] = [
    ...detectBaitTooCloseErrors(players, deathEvents, dropTime1, slotByName, positionSamples),
  ];
  if (dataWave2 !== null) {
    errors.push(...detectWrongTowerErrors(players, deathEvents, kefkaBearing, dropTime2, dataWave2, slotByName, positionSamples));
  }
  const wrongTower = new Set(errors.filter((e) => e.ruleId === STOMPIES_WRONG_TOWER_RULE_ID).map((e) => e.player));
  errors.push(...detectMolePartnerErrors(players, deathEvents, slotByName).filter((e) => !wrongTower.has(e.player)));

  // A player dead at the first drop: the pull's cutoff, and everything this
  // module would flag after it is that death's fallout (README rule 2).
  const unresolvable = detectDeadAtStartUnresolvable(players, deathEvents, dropTime1);
  if (unresolvable) {
    return [...errors.filter((e) => e.timestamp < unresolvable.timestamp), unresolvable]
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
