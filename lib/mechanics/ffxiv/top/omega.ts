// The Omega Protocol (Ultimate) -- Phase 1: Omega / Beetle Omega.
// Entry point: detectOmegaErrors. Self-gates on Program Loop and stops at
// the first Phase 2 cast; the fallback model (fallback.ts MODULE_PHASES)
// covers the later phases and stays out of P1.
//
// -- VERIFIED AGAINST LOGS (2026-10-14) --
// One report, 111 pulls, 14 P1 clears, no full kill. Cited as A23 +0:38.2
// (pull number in the folder, m:ss from the pull start):
//   A = b9FcR6vxAPd3zhkH (not the user's static; no VOD; said to run NAUR
//       strats; fetched with --to-minutes 2.5). P1 clears: A31 A45 A64 A71
//       A75 A77 A79 A81 A87 A94 A101 A105 A108 A111 (all wiped in P2).
// Clock (every pull within ~0.5s): Program Loop cast +0:15.0, In Line and
// Looper ~+0:16; rounds at +0:29.1, +0:38.2, +0:47.2, +0:56.1; Pantokrator
// +1:09.3 (new In Line numbers); missile/line sets +1:21.4, +1:27.4,
// +1:33.4, +1:39.4; Diffuse volleys +1:48.1 (x5, 2.1s apart) with Wave
// Cannon Kyrios +1:48.1 and +1:57.2; Atomic Ray begins +2:03, lands +2:08.
// P1 clears: the Atomic Ray cast never finishes, P2 opens with Firewall
// (31552/31553) at +2:13.9. Every actor in both phases is named "Omega".
// Log IDs (BossMod's candidates were right):
// - In Line 1-4 1003004/1003005/1003006/1003451 (Lindwurm's IDs), handed
//   out twice: Program Loop and Pantokrator. Looper 1003456 (16/25/34/43s
//   by number), Twice-come Ruin 1002534 (11s), Doom 1002519 (3s, then a
//   death credited to the hit that gave it), HP Penalty 1003401 (9s, from
//   Blaster), Memory Loss 1001626 (4 in 111 pulls).
// - Towers: Storage Violation 31492 cast per tower with the soaker as its
//   target (lost when two stood in it); an already-cleansed player in a
//   later tower takes the damage harmlessly (A45 +0:38.1, the DRK in most
//   pulls). A tower nobody with Looper took casts Storage Violation
//   Obliteration 31494 instead: it hits everyone with Doom and Damage Down.
//   It came up in 40 pulls; none of them reached Pantokrator.
// - Blaster 31498: one cast per tether per round, target = holder; with
//   several hit the target is lost. Visual casts 31495/31496/31497. Hit
//   players get HP Penalty + Twice-come Ruin; a second Ruin-giver within
//   11s is Doom. Clean holders had nobody within 16.3y (A68 R2); victims
//   stood 1.6-22y from the holder, so a radius test can't name anyone.
// - Pantokrator 31499; Flame Thrower 31501 (first) / 32368 (repeats);
//   Ballistic Impact 31500. Both give Damage Down (11 pulls).
// - Guided Missile Kyrios 31502 (target = carrier, the set's In Line
//   number); Condensed Wave Cannon Kyrios 31503, no cast target, aimed at
//   the holder of 1003507-1003510 (one per set). Missile and line give
//   Magic Vulnerability Up (~2s), no Damage Down. Clean lines hit exactly
//   three (open question 1: three TOTAL), groups of four stay fixed all
//   pull. Two players in a line died to it every time but twice (A64,
//   A109: Minor).
// - Diffuse Wave Cannon Kyrios 31504 hits both tanks every volley in the
//   clears (stacked, invulns); Wave Cannon Kyrios 31505 one non-tank each.
// - Atomic Ray 31480: the cast completed in 8 pulls, never in a clear.
// Failure findings:
// - Program Loop ended 51 of 111 pulls. Kinds: an In Line player with
//   Looper in no tower (A1 +0:37.8: in a Blaster instead; A6 +0:47.2: hit
//   by nothing), both In Line players in one tower (A13, A21, A35), a
//   later number soaking early (A10 +0:38.1, A90, A98), a Blaster hitting
//   others (37 pulls; the two holders together 16 times), a tether left on
//   the previous holder (A66 +0:47.1, A97: Doom, then the empty tower).
// - Pantokrator: the line one short (a group member in no line: A7
//   +1:33.5, A8, A17, A22 ...), the carrier keeping the missile in the
//   stack (A58 +1:21.5, A100), puddles and Flame Thrower deaths.
// - Both lines in one stack (A46 +1:21.5, A55 +1:21.5): the two players
//   of the set's line number (In Line 3 both times) on the same side. Per
//   the user's VOD reviewer (2026-10-14, A46) one of them should have
//   crossed to the other group; it isn't the whole group. Which one isn't
//   settled (NAUR's P1 flex priority is Tanks > Melee > Ranged > Healer).
// - Missile-knockback deaths and Doom deaths log with no killing blow in
//   some pulls; neither counts toward a called wipe.
// - Diffuse on non-tanks (A8 +1:48.2, A24, A36 ...): the cone goes to the
//   farthest; one non-tank stood outside the tanks.
// Cutoffs (first Raid error): collapse 50, empty tower 26, called wipe 17,
// enrage 4; the 14 P1 clears have none. Every wipe has a mechanic error
// before its generic cutoff.
//
// -- RULES IMPLEMENTED --
// ffxiv-top1-avoidable (Major on Damage Down or death, else Minor): Flame
//   Thrower, Ballistic Impact.
// ffxiv-top1-tower (Raid + Major): the first round with Obliteration. The
//   round's In Line players still holding Looper in no tower, or both in
//   one tower; a Looper holder of another number soaking early (Major,
//   whether or not a tower failed). Later rounds are fallout. Targeted:
//   every round reports its two In Line players.
// ffxiv-top1-blaster (Major on Doom or death, else Minor), all eight
//   alive: a Blaster hitting both holders (both named); a round's tower
//   player with Looper in a Blaster instead of a tower; a holder hitting a
//   tower soaker or two+ others; else the holder and the one player hit; no
//   holder in the hit (the non-soakers hit). Rounds 2-4, a tether on
//   another number: the In Line player with no tether didn't take it (and
//   the holder, unless they held it the round before).
// ffxiv-top1-missile (Major on death, else Minor): a missile hitting
//   others (the carrier; with one other, both), or the carrier in a line.
// ffxiv-top1-line (Major on death, else Minor), all eight alive: both
//   line-marked players inside one line (both named, nobody else that
//   set); else a group member in neither line or the other group's
//   (groups read from the pull's lines), the aimed player taking the line
//   to the other group, a player in both lines.
// ffxiv-top1-diffuse (Major on death, else Minor), both tanks alive: the
//   farthest non-tank a cone hit, and a tank no cone reached.
// ffxiv-top1-wave-cannon: a line hitting 2+ players, all six non-tanks
//   alive (everyone it hit named: the log can't say who moved).
// ffxiv-top1-wall (Major): a silent death no Doom, missile, reset or own
//   Damage Down explains.
// ffxiv-top1-enrage / -called-wipe (3+ silent deaths within 10s or 12s of
//   the end, Doom and missile deaths excluded) / -collapse (4 dead, pull
//   over within 20s): Raid, only the earliest, only before any mechanic
//   Raid.
// Not built: who stood where in a Blaster clip beyond the cases above (no
// assignments, and the radius doesn't separate holder from victim), which
// group a merged line belonged to, tank invulns, healing deaths (tower
// damage at 1% HP, a lone line hit).
//
// -- GUIDE-DERIVED MODEL (2026-10-14) --
// Written before any report was analyzed; VERIFIED AGAINST LOGS above wins.
// Scope: level-90 Ultimate, introduced in 6.31, item-level sync 635.
// Later job/gear changes affect damage checks; launch DPS figures are not
// mechanic thresholds. Patch 6.48 (2023-08-08) fixed damage on reentry
// into towers after Looper was cleansed; older pulls can show that bug.
//
// -- SOURCES CHECKED 2026-10-14 --
// [IV] Lavender/Meru, P1; both front/back Pantokrator variants:
// https://www.icy-veins.com/ffxiv/the-omega-protocol-ultimate-phase-1-guide
// [EL] Tuufless, Elemental P1; HaruGlory movement and troubleshooting:
// https://ffxiv.tuufless.com/elemental/top/01_omega/
// Read author's source: github.com/tuufless/FFXIV-Elemental-Raid-Macros,
// main/_elemental/top/01_omega.en.md (the old /ultimates/top URL has moved).
// [TH] Thaliak, LPDU priorities and timeline:
// https://thaliak.com/ultimates/top/
// [OCE] Materia, regional differences (not a separate mechanic authority):
// https://materiaraiding.com/resources/visitorsguide
// [SE] Official 6.48 tower-reentry correction:
// https://na.finalfantasyxiv.com/lodestone/topics/detail/77ced00c8fc9b818f7a31b9925162a7007bf7882/
// [CB] cactbot, public encounter-event timeline, main branch:
// https://github.com/quisquous/cactbot/blob/main/ui/raidboss/data/06-ew/ultimate/the_omega_protocol.txt
// [BM] BossMod, primary encounter definitions and geometry, master branch:
// https://github.com/awgil/ffxiv_bossmod/blob/master/BossMod.Ultimate/Endwalker/Ultimate/TOP/TOPEnums.cs
// Same directory: P1ProgramLoop.cs, P1Pantokrator.cs. These are candidate
// game action/status IDs, NOT an FFLogs ability-table verification.
//
// -- SHAPE, CLOCK AND LOG VOCABULARY --
// One Program Loop, one Pantokrator, then a final ranged/tank volley.
// Omega reaching 0 HP advances to M/F; the script is otherwise timed.
// CB offsets from combat start (seconds; effect times, not cast starts):
// +15 Program Loop; +29.1/+38.1/+47.1/+56.1 towers and Blaster;
// +69.2 Pantokrator; +75.3 first Flame Thrower; +81.3/+87.3/+93.3/
// +99.3 simultaneous missile/line sets; +108..116 diffuse tank volleys;
// +108/+116.8 non-tank lines; +122.7 enrage begins, +127.7 Atomic Ray.
// TH rounds several events ~1s earlier and lists enrage at +130 rather
// than +127.7; independent timing claim, not proof of variable orders.
// Helpers execute much of the damage even when Omega owns the cast.
// BM IDs below are decimal. Status IDs are game IDs; FFLogs often exposes
// statuses as 1000000 + game ID. Names/stream need checking before use.
// Headmarkers, tethers and visual tower objects may be absent from the
// imported FFLogs streams; their game identifiers are not spell IDs.
//
// -- PROGRAM LOOP: TOWERS, TETHERS AND HP PENALTY --
// Candidates: Program Loop cast 31491; Blaster visual cast 31495,
// repeat/last visual 31496/31497; Blaster damage 31498;
// Storage Violation soak damage 31492; empty-tower penalty 31494.
// Related player statuses: Looper, First/Second/Third/Fourth in Line,
// Twice-come Ruin, Doom, Memory Loss, HP Penalty. Blaster game tether 89.
// What happens: all eight receive Looper plus a number; two of each
// number. Four rounds each contain two single-player towers and two
// transferable tethers from Omega. Eight tower soaks/eight tether hits.
// Correct sequence by numbered pair:
//   Round        1  2  3  4
//   Tower pair   1  2  3  4
//   Tether pair  3  4  1  2
// Tower removes Looper. Only players still carrying Looper participate;
// an already-cleansed player standing in a later tower is harmless.
// Both tower and Blaster add Twice-come Ruin (~10s); another application
// before it wears off gives Doom. There must be an idle round between
// one's tower and tether. Initial tether recipient is not an assignment.
// Geometry [BM]: tower radius 3y; Blaster radius 15y about its holder.
// Towers appear around cardinals, offset slightly to either side. Two
// towers in a round occupy different cardinal regions. Tether players
// use the empty cardinals, usually max melee; no fixed north/south pair.
// Tethers persist between hits and must be handed over for each round.
// Correct play: one numbered soaker per tower, designated numbered
// tether pair isolated; wait still for a handoff rather than crossing
// a moving holder. Non-holders avoid paths through the tether segment.
// HP Penalty reduces maximum HP to 1%, for ~9s. Its expiry restores the
// maximum, not the lost current HP. In-Line 3/4 need healing before
// their towers; taking the intended tether and becoming low HP is normal.
// Failure modes:
//   Empty tower -> LOG SIGNAL: Storage Violation penalty 31494 across
//     raid, no valid soak/Looper cleanse; FAULT: numbered assigned
//     soaker if the tower assignment is known, otherwise not in log;
//     CONSEQUENCE: Raid, plus Major on a proven responsible player.
//   Wrong turn/double hit -> LOG SIGNAL: premature Looper cleanse or
//     Twice-come Ruin reapplication followed by Doom; FAULT: wrong
//     soaker/holder, only when assignment and pre-hit state establish it;
//     CONSEQUENCE: Major, Raid if required later bodies are unavailable.
//   Tether clips others -> LOG SIGNAL: extra Blaster 31498 victims,
//     HP Penalty/Twice-come Ruin on a non-holder; FAULT: holder placed
//     incorrectly or victim entered its spot; assignments distinguish;
//     CONSEQUENCE: Minor if harmless, Major for death/Damage Down,
//     Raid if Doom/body-count failure makes the rotation impossible.
//   Looper expires -> LOG SIGNAL: Memory Loss instead of clean tower
//     removal, then uncontrolled movement/wall death; FAULT: uncleaned
//     player if alive and able to act; CONSEQUENCE: Major, likely Raid.
// Removal: intended tower consumes Looper/number; HP Penalty and Ruin
// expire naturally. Death removal is not proof of a successful tower.
// Guides do not settle dead-holder tether retargeting or Looper expiry
// on death. No dispel-based solution is described.
// Not errors: tower damage, holder Blaster, temporary 1% HP, unused
// towers occupied by players whose Looper is already gone, handoffs.
// A correct tower death from insufficient healing is not a soaker error.
//
// -- PANTOKRATOR: ROTATING CONES AND BAITED PUDDLES --
// Candidates: controller cast 31499; Ballistic Impact ground cast/damage
// 31500; Flame Thrower first/repeat 31501/32368.
// What happens: opposing 60-degree cones rotate together CW or CCW.
// Ballistic Impact repeatedly snapshots locations under every player.
// BM gives 5y puddles, 3s ground casts, cones range 65y. The large safe
// sectors rotate; moving with them still requires dodging one's puddles.
// Correct play: two groups of four, one of each number and one healer
// per group. Group movement follows the chosen missile/stack variant.
// Everyone drops each group of puddles together and steps just clear.
// Failure modes:
//   Cone/puddle hit -> LOG SIGNAL: Flame Thrower/Ballistic Impact
//     damage with ensuing Damage Down/death; FAULT: victim for a bad
//     dodge, puddle dropper only if their bait blocked the agreed route;
//     CONSEQUENCE: Major for Damage Down/death; Minor if no such effect.
//   Bad bait traps next player -> LOG SIGNAL: prior ground cast at the
//     route followed by a victim's hit; FAULT: bait source/position is
//     not necessarily recoverable from damage-only logs; CONSEQUENCE:
//     Major if attributable and lethal, otherwise no guessed culprit.
// Removal: ground AOEs resolve then vanish; rotation ends after the
// fourth missile/line set. No persistent puddle-cleanse duty.
// Not errors: standing in a future telegraph before its snapshot;
// opposite starting sectors or clockwise fallback into the safe sector.
//
// -- PANTOKRATOR: FOUR MISSILE / CONDENSED LINE SETS --
// Candidates: Guided Missile Kyrios damage 31502 (5y circle);
// Condensed Wave Cannon Kyrios damage 31503 (50y long, 6y wide line).
// Player auras: Guided Missile Kyrios Incoming, Condensed Wave Cannon
// Kyrios, numbered In-Line, Magic Vulnerability Up.
// What happens: missile pair follows 1/2/3/4 at 12/18/24/30s after
// Pantokrator. Condensed line targets follow 3/4/1/2 at the same times.
// Each light party therefore has one solo missile and three line soakers
// per set, eight missiles/eight separate shared lines in total.
// The missile damages its carrier normally; other victims are knocked
// back, typically into the wall. The line's damage is shared among the
// THREE players present, including its designated target [IV/EL/BM].
// Correct play: current missile exits before expiry, rejoins for the
// next line; everyone else shares their group's aimed line.
// Failure modes:
//   Missile overlaps -> LOG SIGNAL: one missile damages multiple
//     players, knockback/wall death; FAULT: carrier or encroaching player
//     by agreed spot, not automatically the killed player; CONSEQUENCE:
//     Major and Raid if following shares cannot be completed.
//   Missing/overlapping line -> LOG SIGNAL: wrong recipient count,
//     unusually high split damage, or two line hits with vulnerability;
//     FAULT: missing/out-of-position player or bad line aimer only when
//     established; CONSEQUENCE: Major for death/Damage Down, likely Raid.
// Removal: expiry triggers missile/line; death removes auras but guides
// do not establish early detonation or replacement-target behavior.
// Not errors: three-person rather than four-person line; solo missile
// damage; routine four damage instances per player across this sequence.
//
// -- DIFFUSE WAVE CANNON KYRIOS / WAVE CANNON KYRIOS --
// Candidates: diffuse tank damage 31504; marked non-tank line 31505.
// What happens: two furthest players bait tank cones, five volleys;
// three non-tanks get lines, then the other three. Each line adds magic
// vulnerability, so being hit by another line is dangerous.
// Correct play: tanks farther than everyone else; six non-tanks inside
// the hitbox at distinct angles. EL stacks invulnerable tanks north,
// spreading the others south. Separate tank cones with mitigation is
// also valid; stacked cones are expected under the double-invuln plan.
// EL calls the tank cones 120 degrees; BM deliberately leaves their
// angle unknown. Range ordering, not enmity, selects their victims.
// Failure modes:
//   Non-tank baits cone -> LOG SIGNAL: diffuse primary hit/cleave on
//     non-tank and relative distances at snapshot; FAULT: tank too close
//     or non-tank too far; CONSEQUENCE: Major, Raid for party cleave.
//   Line clips another -> LOG SIGNAL: extra 31505 hit and vulnerability
//     followed by second line/death; FAULT: aimer/victim by clock plan;
//     CONSEQUENCE: Major; death alone does not identify the aimer.
// Removal: line vulnerability expires; no cleansing mechanic. Tanks'
// invulnerability ending too early belongs to mitigation review unless
// positioning, rather than survivability, was the actual failure.
// Not errors: intended tank cones, one marked line per non-tank, double
// cone hits on deliberately stacked invulnerable tanks.
//
// -- STRATEGY VARIANCE AND AGREEMENT --
// EL: global H1 > MT > ST > D1 > D2 > D3 > D4 > H2, CW from NW;
// Pantokrator NW/SE, healer extremes anchor groups, missile front.
// TH/LPDU: Loop M1 > M2 > MT > OT > R1 > R2 > H1 > H2, N CW versus
// the opposite scan. Its table says W CCW while prose says N CCW.
// IV: fixed light parties with T > melee > ranged > healer flex;
// missile front OR missile back. OCE lists another global Loop priority.
// EL slow missile-front departure waits one extra puddle after the line;
// older Haru fast departure leaves immediately. Mixing the two can put
// unresolved puddles into the next missile's route without changing roles.
// Agreement: numbered turn order, one healer/unique numbers per group,
// three in each line, isolated missiles, tanks furthest for diffuse.
// Boss facing and scan origin are raid-plan data, not universal rules.
//
// -- WHAT ENDS A PULL --
// Atomic Ray 31480 completes ~+127.7 if Omega survives: Raid, no player
// singled out for the DPS check. Empty towers, Doom and missing bodies
// normally invalidate subsequent numbered assignments. A death need not
// be called an instantaneous wipe if an actual recovery is still possible.
// The deathwall is lethal throughout; no ability on a wall death is
// possible. Deliberate walls after a wipe call are not fresh mistakes.
//
// -- OPEN QUESTIONS / SOURCE DISAGREEMENTS FOR LOG VERIFICATION --
// 1. TH says share with "3 other players"; IV/EL show three TOTAL. Does
//    31503 split three ways in clean pulls, with exactly three victims?
// 2. What are FFLogs cast/damage IDs for visual Blaster versus 31498,
//    and does 31494 cover both empty and overfilled Looper towers?
// 3. EL only rules out repeating the immediately preceding tower spot;
//    TH rules out any reused spot. Is all-eight-unique actually invariant?
// 4. Measure Ruin/HP Penalty and how Doom and Memory Loss end. Is there
//    any dispel/heal removal, or only expiry/death? Dead-holder behavior?
// 5. Which avoidable attacks give Damage Down, and which only vuln/HP
//    Penalty? Confirm durations before assigning the FFXIV Major rule.
// 6. Does diffuse reselect furthest targets every hit? Cone angle 120
//    degrees [EL] versus unspecified [BM]; measure rather than assume.
// 7. Confirm +127.7 impact versus +122.7 cast, TH's +130 enrage,
//    actual tethers/headmarkers exposed by imports, and the raid's plan.

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import type { ReportedOccurrence } from "@/lib/mechanics/occurrences";
import { kFmt, yd, joinNames, playerError, raidMarker, clusterByGap } from "@/lib/mechanics/wow/common";
import {
  DAMAGE_DOWN, DEATH_EVENT_LAG_MS, PREVIEW_AMOUNT, type Hit, type Life,
  bodyHit, buildLife, castsOf, gotAura, uniq, namesOf, isTank, realAmount, allAlive, resetCluster,
} from "../fru/common";

export const TOP1_AVOIDABLE_RULE_ID   = "ffxiv-top1-avoidable";
export const TOP1_TOWER_RULE_ID       = "ffxiv-top1-tower";
export const TOP1_BLASTER_RULE_ID     = "ffxiv-top1-blaster";
export const TOP1_LINE_RULE_ID        = "ffxiv-top1-line";
export const TOP1_MISSILE_RULE_ID     = "ffxiv-top1-missile";
export const TOP1_DIFFUSE_RULE_ID     = "ffxiv-top1-diffuse";
export const TOP1_WAVE_CANNON_RULE_ID = "ffxiv-top1-wave-cannon";
export const TOP1_WALL_RULE_ID        = "ffxiv-top1-wall";
export const TOP1_ENRAGE_RULE_ID      = "ffxiv-top1-enrage";
export const TOP1_CALLED_WIPE_RULE_ID = "ffxiv-top1-called-wipe";
export const TOP1_COLLAPSE_RULE_ID    = "ffxiv-top1-collapse";

// ── log IDs (VERIFIED above) ────────────────────────────────────────────────

const PROGRAM_LOOP = 31491;
// In Line 1-4 (the same status IDs as Lindwurm's Act 2; the entry point
// self-gates on Program Loop).
const IN_LINE: Record<number, number> = { 1003004: 1, 1003005: 2, 1003006: 3, 1003451: 4 };
const LOOPER       = 1003456;
const DOOM         = 1002519;
const TOWER        = 31492; // Storage Violation: a soaked tower (cast target = its soaker)
const OBLITERATION = 31494; // Storage Violation Obliteration: a tower nobody with Looper soaked
const BLASTER      = 31498; // cast target = the tether holder (lost when it hit several)
const PANTOKRATOR  = 31499;
const BALLISTIC    = 31500;
const MISSILE      = 31502; // Guided Missile Kyrios (cast target = its carrier)
const LINE         = 31503; // Condensed Wave Cannon Kyrios, a three-player shared line
const LINE_MARKS   = [1003507, 1003508, 1003509, 1003510]; // the line's aimed player, per set
const DIFFUSE      = 31504;
const WAVE_CANNON  = 31505;
const ATOMIC_RAY   = 31480;
// Phase 2's opening casts (Party Synergy, Firewall, Solar Ray). Every
// actor in both phases is named "Omega", so the phase ends at these.
const P2_CASTS     = [31550, 31551, 31552, 31553, 32362, 32363];

type Avoidable = { name: string; hit: string; why: string };
const FLAME_WHY = "Two Flame Thrower cones rotate around the boss; move with the safe sector, the opposite way to the cones' sweep.";
const AVOIDABLE: Record<number, Avoidable> = {
  31501: { name: "Flame Thrower", hit: "Hit by Flame Thrower", why: FLAME_WHY },
  32368: { name: "Flame Thrower", hit: "Hit by Flame Thrower", why: FLAME_WHY },
  [BALLISTIC]: { name: "Ballistic Impact", hit: "Stood in a Ballistic Impact puddle",
    why: "Ballistic Impact drops a puddle under every player during Pantokrator; drop it with the group and step just clear before it goes off." },
};

const EPISODE_MS          = 3000;
// One Program Loop round's casts land within ~0.5s (A31: +29.0-29.2).
const ROUND_GAP_MS        = 2000;
// Doom kills when it runs out ~3s after it lands; the death event follows
// ~2s later with no killing blow (A2 +29.2 -> +34.2).
const DOOM_DEATH_MS       = 7000;
// A missile knockback into the deathwall: death event ~2.3s after the hit,
// no killing blow (A58 +81.5 -> +83.8).
const KNOCK_DEATH_MS      = 4000;
const DD_RESET_MS         = 20_000;
const CALLED_WIPE_END_MS  = 12_000;
const CALLED_WIPE_COUNT   = 3;
const CALLED_WIPE_WINDOW  = 10_000;
// 4 dead ended every P1 wipe within ~16s (collapse: worst P86 +90.1 -> 16s).
const COLLAPSE_DEAD_COUNT = 4;
const COLLAPSE_END_MS     = 20_000;
// A silent death right after another death is the raid resetting
// (A2 +34.8, 0.6s after a Doom death).
const RESET_AFTER_DEATH_MS = 10_000;
const SILENT_HIT_MS       = 3500;

// ── shared helpers ──────────────────────────────────────────────────────────

/** Holding the aura at `t` (applied before, not removed since). */
function holdsAt(p: PlayerInfo, id: number, t: number): boolean {
  let on = false;
  for (const e of p.debuffs) if (e.abilityId === id && e.timestamp <= t) on = e.debuffStatus !== "removed";
  return on;
}

/** Each player's In Line number handed out in [from, to] (Program Loop, then Pantokrator). */
function numbersIn(players: PlayerInfo[], from: number, to: number): Map<PlayerInfo, number> {
  const out = new Map<PlayerInfo, number>();
  for (const p of players) {
    for (const e of p.debuffs) {
      if (IN_LINE[e.abilityId] && e.debuffStatus === "applied" && e.timestamp >= from && e.timestamp <= to) out.set(p, IN_LINE[e.abilityId]);
    }
  }
  return out;
}

/** Living players hit by this cast's own instance (casts reuse instances across rounds). */
function instanceHits(players: PlayerInfo[], life: Life, c: EnemyEvent, ms = 1500): Hit[] {
  const out: Hit[] = [];
  for (const p of players) {
    const e = p.damageTaken.find((x) => x.abilityId === c.abilityId && x.sourceInstance === c.sourceInstance &&
      Math.abs(x.timestamp - c.timestamp) <= ms && !bodyHit(x));
    if (e && life.hitAlive(p, e.timestamp)) out.push({ p, e });
  }
  return out;
}

const doomedAt = (p: PlayerInfo, t: number) => gotAura(p, DOOM, t, 1500);
/** Died from a hit at `t`: a killing blow within 3s, or Doom from it running out. */
function diedOf(p: PlayerInfo, life: Life, deaths: DeathEvent[], t: number): boolean {
  return !!life.diedFrom(p, t) || (doomedAt(p, t) && deaths.some((d) => d.player === p.name && d.timestamp > t && d.timestamp - t <= DOOM_DEATH_MS));
}

/** One error per player per instance key: the first wins. */
function firstPer(errors: PullError[], key: (e: PullError) => string): PullError[] {
  const seen = new Set<string>();
  return errors.filter((e) => { const k = key(e); if (seen.has(k)) return false; seen.add(k); return true; });
}

/** When Phase 1 ends: the first Phase 2 cast (Infinity on a P1 wipe). */
function phase1End(casts: EnemyEvent[]): number {
  return casts.filter((c) => P2_CASTS.includes(c.abilityId)).reduce((m, c) => Math.min(m, c.timestamp), Infinity);
}

// ── plain avoidable hits ────────────────────────────────────────────────────

function detectAvoidable(players: PlayerInfo[], life: Life, end: number): PullError[] {
  const errors: PullError[] = [];
  const ids = Object.keys(AVOIDABLE).map(Number);
  for (const p of players) {
    const hits = p.damageTaken.filter((e) => ids.includes(e.abilityId) && e.timestamp <= end && !bodyHit(e) && life.hitAlive(p, e.timestamp) &&
      (realAmount(e) > 0 || (e.amount ?? 0) >= PREVIEW_AMOUNT || gotAura(p, DAMAGE_DOWN, e.timestamp)));
    for (const g of clusterByGap(hits, (e) => e.timestamp, EPISODE_MS)) {
      const kinds = uniq(g.map((e) => AVOIDABLE[e.abilityId]));
      const total = g.reduce((s, e) => s + realAmount(e), 0);
      const death = life.diedFrom(p, g[g.length - 1].timestamp);
      const dd = g.some((e) => gotAura(p, DAMAGE_DOWN, e.timestamp));
      const hit = kinds.map((k, i) => (i === 0 ? k.hit : k.hit.charAt(0).toLowerCase() + k.hit.slice(1))).join(", and ");
      const outcome = [dd ? "got Damage Down" : "", death ? "died" : ""].filter(Boolean).join(" and ");
      errors.push(playerError(p, {
        ruleId: TOP1_AVOIDABLE_RULE_ID, severity: dd || death ? "Major" : "Minor", name: `Hit by ${uniq(kinds.map((k) => k.name)).join(" / ")}`,
        description: `${hit} (${g.length > 1 ? `${g.length} hits, ` : ""}${total > 0 ? kFmt(total) : "lethal"}).${outcome ? ` They ${outcome}.` : ""} ${uniq(kinds.map((k) => k.why)).join(" ")}`,
        timestamp: g[0].timestamp, abilityId: g[0].abilityId, abilityName: g[0].abilityName,
      }));
    }
  }
  return errors;
}

// ── Program Loop: towers and Blaster tethers ────────────────────────────────

type Round = { r: number; t: number; casts: EnemyEvent[] };

/** The four Program Loop rounds: two towers and two Blasters each, ~9s apart. */
function loopRounds(casts: EnemyEvent[], end: number): Round[] {
  return clusterByGap(castsOf(casts, [TOWER, OBLITERATION, BLASTER], end), (c) => c.timestamp, ROUND_GAP_MS)
    .slice(0, 4).map((g, i) => ({ r: i + 1, t: g[0].timestamp, casts: g }));
}

const TOWER_WHY = "Round n's towers belong to the two In Line n players (towers 1-2-3-4, tethers 3-4-1-2); each takes one tower of their own while they still hold Looper.";
const BLASTER_WHY = "The tether holders (In Line 3, 4, 1, 2 in rounds 1-4) take Blaster to an empty cardinal, away from the towers, the other holder and the waiting players: it hits everyone near the holder, and a second hit before Twice-come Ruin wears off (11s) is Doom.";

/**
 * Program Loop. Each round's two towers need the two In Line players for
 * that round, still holding Looper. A tower nobody with Looper took casts
 * Storage Violation Obliteration: Doom (and Damage Down) on the whole raid,
 * so the pull is over (Raid) and the round's numbered players who still had
 * Looper and stood in no tower are named. Later rounds are fallout.
 * Blaster: an instance that hit anyone but its holder, with all eight alive.
 */
function detectProgramLoop(
  players: PlayerInfo[], life: Life, deaths: DeathEvent[], casts: EnemyEvent[], end: number, occurrences?: ReportedOccurrence[],
): PullError[] {
  const loop = castsOf(casts, PROGRAM_LOOP, end)[0];
  if (!loop) return [];
  const num = numbersIn(players, loop.timestamp, loop.timestamp + 10_000);
  const errors: PullError[] = [];
  let failedAt = Infinity;
  for (const rd of loopRounds(casts, end)) {
    const owners = players.filter((p) => num.get(p) === rd.r);
    occurrences?.push({ mechanicKey: TOP1_TOWER_RULE_ID, timestamp: rd.t, players: owners.map((p) => p.name) });
    if (failedAt < rd.t) continue;
    const looped = (p: PlayerInfo) => holdsAt(p, LOOPER, rd.t - 300);
    const towers = rd.casts.filter((c) => c.abilityId === TOWER).map((c) => ({ c, soak: instanceHits(players, life, c).map((h) => h.p) }));
    const soaked = new Set(towers.flatMap((x) => x.soak));
    const failed = rd.casts.filter((c) => c.abilityId === OBLITERATION);

    // A Looper holder of another number soaking now spends their Looper early.
    for (const p of players.filter((x) => soaked.has(x) && looped(x) && num.get(x) !== rd.r && life.alive(x, rd.t - 500))) {
      errors.push(playerError(p, {
        ruleId: TOP1_TOWER_RULE_ID, severity: "Major", name: "Tower Out of Turn",
        description: `Soaked a round ${rd.r} tower as In Line ${num.get(p)}: that spent their Looper early, so their own round ${num.get(p)} tower has one soaker short. ${TOWER_WHY}`,
        timestamp: rd.t, abilityId: TOWER, abilityName: "Storage Violation",
      }));
    }

    if (failed.length) {
      const alive = owners.filter((p) => life.alive(p, rd.t - 500));
      const absent = alive.filter((p) => looped(p) && !soaked.has(p));
      // Both owners in one tower leave the other empty: either could have moved.
      const doubled = absent.length ? [] : towers.filter((x) => x.soak.filter((p) => owners.includes(p) && looped(p)).length >= 2)
        .flatMap((x) => x.soak.filter((p) => owners.includes(p)));
      for (const p of absent) {
        errors.push(playerError(p, {
          ruleId: TOP1_TOWER_RULE_ID, severity: "Major", name: "Missed Tower",
          description: `In Line ${rd.r} with Looper, but stood in no tower in round ${rd.r}: the tower was left empty and Storage Violation Obliteration gave the whole raid Doom. ${TOWER_WHY}`,
          timestamp: rd.t, abilityId: OBLITERATION, abilityName: "Storage Violation Obliteration",
        }));
      }
      for (const p of doubled) {
        errors.push(playerError(p, {
          ruleId: TOP1_TOWER_RULE_ID, severity: "Major", name: "Same Tower",
          description: `Both In Line ${rd.r} players (${namesOf(doubled)}) stood in the same round ${rd.r} tower, so the other was left empty: Storage Violation Obliteration gave the whole raid Doom. ${TOWER_WHY}`,
          timestamp: rd.t, abilityId: OBLITERATION, abilityName: "Storage Violation Obliteration",
        }));
      }
      const dead = owners.filter((p) => !alive.includes(p));
      const spent = alive.filter((p) => !looped(p));
      const why = [
        dead.length ? `${namesOf(dead)} ${dead.length === 1 ? "was" : "were"} already dead` : "",
        spent.length ? `${namesOf(spent)} had already used up their Looper` : "",
        absent.length || doubled.length ? `the In Line ${rd.r} ${absent.length + doubled.length === 1 ? "player" : "players"} with Looper ${absent.length ? "stood in no tower" : "shared one tower"}` : "",
      ].filter(Boolean).join("; ");
      errors.push(raidMarker(TOP1_TOWER_RULE_ID, "Tower Left Empty",
        `A round ${rd.r} tower had nobody with Looper in it${why ? ` (${why})` : ""}. Storage Violation Obliteration gives everyone Doom and Damage Down; unresolvable from here, treated as the cutoff point.`,
        rd.t, OBLITERATION, "Storage Violation Obliteration"));
      failedAt = rd.t;
    }

    errors.push(...blasterClips(players, life, deaths, rd, num, soaked, failed.length > 0));
  }
  return errors;
}

/**
 * Blaster instances that hit anyone besides their holder, with all eight
 * alive (a death changes who carries which tether). The holder is the cast
 * target, or with the target lost, the one hit player of the round's tether
 * number. Who's named:
 * - both holders, when one Blaster hit both (they stood together);
 * - a round's tower player with Looper who stood in the tether instead of a
 *   tower (unless the empty tower already names them);
 * - the holder, when they hit a tower soaker or two or more players;
 * - otherwise the holder and the one player hit (either could have moved).
 * Major when someone it hit got Doom or died, else Minor.
 */
function blasterClips(
  players: PlayerInfo[], life: Life, deaths: DeathEvent[], rd: Round, num: Map<PlayerInfo, number>, soaked: Set<PlayerInfo>, towerFailed: boolean,
): PullError[] {
  if (!allAlive(players, life, rd.t - 500)) return [];
  const h = ((rd.r + 1) % 4) + 1; // tethers go 3-4-1-2
  const hPrev = (rd.r % 4) + 1;   // the previous round's tether number
  const errors: PullError[] = [];
  const blasts = rd.casts.filter((x) => x.abilityId === BLASTER).map((c) => {
    const hit = instanceHits(players, life, c).map((x) => x.p);
    const holders = hit.filter((p) => num.get(p) === h);
    return { c, hit, holders, holder: hit.find((p) => p.name === c.target) ?? (holders.length === 1 ? holders[0] : undefined) };
  });
  // A tether still on the wrong number: the In Line h player with no tether
  // this round didn't take it (A66 +47.1: the previous holder kept it and
  // got Doom). Not round 1, where the first holder is random.
  // Two holders inside one Blaster both count as holding (A37 +38.2).
  const holding = new Set(blasts.flatMap((b) => (b.holder ? [b.holder] : b.holders.length >= 2 ? b.holders : [])));
  for (const b of blasts) {
    if (!b.holder || num.get(b.holder) === h || rd.r === 1) continue;
    const owed = players.filter((p) => num.get(p) === h && !holding.has(p));
    const doomed = doomedAt(b.holder, b.c.timestamp) || diedOf(b.holder, life, deaths, b.c.timestamp);
    const kept = num.get(b.holder) === hPrev;
    for (const p of [...owed, ...(kept ? [] : [b.holder])]) {
      errors.push(playerError(p, {
        ruleId: TOP1_BLASTER_RULE_ID, severity: doomed ? "Major" : "Minor", name: p === b.holder ? "Took Another's Tether" : "Tether Not Taken",
        description: `Round ${rd.r}: a Blaster tether was on ${b.holder.name} (In Line ${num.get(b.holder)}) instead of an In Line ${h} player${kept ? ", still from the round before" : ""}${owed.length ? `; ${namesOf(owed)} had no tether` : ""}.${doomed ? ` ${b.holder.name} got Doom.` : ""} ${BLASTER_WHY}`,
        timestamp: b.c.timestamp, abilityId: BLASTER, abilityName: "Blaster",
      }));
    }
  }
  for (const { c, hit, holders, holder } of blasts) {
    if (hit.length <= 1) continue;
    const doomed = hit.filter((p) => doomedAt(p, c.timestamp));
    const died = hit.filter((p) => diedOf(p, life, deaths, c.timestamp));
    const severity = doomed.length || died.length ? "Major" : "Minor";
    const outcome = [
      doomed.length ? `Doom on ${namesOf(doomed)}` : "",
      died.length ? `${namesOf(died)} died` : "",
    ].filter(Boolean).join("; ");
    const tail = `${outcome ? ` ${outcome}.` : ""} ${BLASTER_WHY}`;
    const push = (p: PlayerInfo, name: string, description: string) => errors.push(playerError(p, {
      ruleId: TOP1_BLASTER_RULE_ID, severity, name, description, timestamp: c.timestamp, abilityId: BLASTER, abilityName: "Blaster",
    }));
    if (!holder) {
      if (holders.length >= 2) {
        for (const p of holders) push(p, "Tether Holders Together", `Round ${rd.r}: both Blaster holders (${namesOf(holders)}) stood within each other's Blaster${hit.length > holders.length ? `, which also hit ${namesOf(hit.filter((x) => !holders.includes(x)))}` : ""}.${tail}`);
      } else {
        // Nobody of the round's tether number: the soakers in their towers
        // are where they belong (A48 +47.1).
        const named = hit.filter((p) => !soaked.has(p));
        for (const p of named) push(p, "Blaster Hit Several", `Round ${rd.r}: a Blaster hit ${namesOf(hit)}, none of them In Line ${h}, and the log doesn't say whose tether it was.${tail}`);
      }
      continue;
    }
    const others = hit.filter((p) => p !== holder);
    const wrongJob = others.filter((p) => num.get(p) === rd.r && holdsAt(p, LOOPER, rd.t - 300) && !soaked.has(p));
    if (!towerFailed) {
      for (const p of wrongJob) push(p, "In a Tether, Not a Tower", `Round ${rd.r}: In Line ${rd.r} with Looper, stood in ${holder.name}'s Blaster instead of a tower.${tail}`);
    }
    const rest = others.filter((p) => !wrongJob.includes(p));
    if (!rest.length) continue;
    const blamed = rest.some((p) => soaked.has(p)) || rest.length >= 2 ? [holder] : [holder, rest[0]];
    for (const p of blamed) {
      push(p, p === holder ? "Blaster Hit Others" : "Stood in a Blaster",
        `Round ${rd.r}: ${holder.name}'s Blaster (In Line ${h}) also hit ${namesOf(rest)}${rest.some((x) => soaked.has(x)) ? ", in a tower" : ""}${blamed.length > 1 ? "; either the holder or the player hit was out of place" : ""}.${tail}`);
    }
  }
  return firstPer(errors, (e) => `${e.player}`);
}

// ── Pantokrator: missiles and shared lines ──────────────────────────────────

/**
 * The two fixed four-player groups (one carrier + three sharers per set),
 * from who shared a line: union the players of every line that hit two or
 * more when that set's two lines hit nobody in common. A component of four
 * is a whole group and the other is its complement (A43: set 1's lines
 * don't place the carriers; set 2's places one). A component over four
 * means a stray crossed groups: retry with the three-player lines only.
 */
function lineGroups(players: PlayerInfo[], sets: { lines: PlayerInfo[][] }[]): PlayerInfo[][] | undefined {
  const tryWith = (maxHits: number): PlayerInfo[][] | undefined => {
    const parent = new Map<PlayerInfo, PlayerInfo>();
    const find = (p: PlayerInfo): PlayerInfo => {
      if (!parent.has(p)) parent.set(p, p);
      const q = parent.get(p)!;
      if (q === p) return p;
      const r = find(q);
      parent.set(p, r);
      return r;
    };
    for (const s of sets) {
      if (s.lines.length !== 2 || s.lines[0].some((p) => s.lines[1].includes(p))) continue;
      for (const l of s.lines) {
        if (l.length < 2 || l.length > maxHits) continue;
        for (const p of l) { const a = find(p), b = find(l[0]); if (a !== b) parent.set(a, b); }
      }
    }
    const comps = new Map<PlayerInfo, PlayerInfo[]>();
    for (const p of parent.keys()) comps.set(find(p), [...(comps.get(find(p)) ?? []), p]);
    const all = [...comps.values()];
    if (all.some((g) => g.length > 4)) return undefined;
    const full = all.find((g) => g.length === 4);
    if (!full || players.length !== 8) return undefined;
    return [full, players.filter((p) => !full.includes(p))];
  };
  return tryWith(4) ?? tryWith(3);
}

const LINE_WHY = "Each group of four has one missile carrier and three players sharing the group's Condensed Wave Cannon Kyrios line; the line splits its damage over whoever stands in it, so two players take a lethal share.";
const MISSILE_WHY = "The In Line carrier leaves their group before Guided Missile Kyrios lands (drop it at the edge of the hitbox) and rejoins for the next line; anyone else it hits is knocked back toward the wall.";

function detectPantokrator(players: PlayerInfo[], life: Life, deaths: DeathEvent[], casts: EnemyEvent[], end: number): PullError[] {
  const panto = castsOf(casts, PANTOKRATOR, end)[0];
  if (!panto) return [];
  const num = numbersIn(players, panto.timestamp, panto.timestamp + 10_000);
  const sets = clusterByGap(castsOf(casts, [MISSILE, LINE], end), (c) => c.timestamp, ROUND_GAP_MS).slice(0, 4).map((g, k) => ({
    k: k + 1, t: g[0].timestamp,
    lines: g.filter((c) => c.abilityId === LINE).map((c) => ({ c, hit: instanceHits(players, life, c).map((x) => x.p) })),
    missiles: g.filter((c) => c.abilityId === MISSILE).map((c) => ({ c, hit: instanceHits(players, life, c).map((x) => x.p) })),
  }));
  const groups = lineGroups(players, sets.map((s) => ({ lines: s.lines.map((l) => l.hit) })));
  const errors: PullError[] = [];
  for (const s of sets) {
    const inLine = (p: PlayerInfo) => s.lines.some((l) => l.hit.includes(p));
    const carriers = players.filter((p) => num.get(p) === s.k);

    for (const m of s.missiles) {
      const carrier = m.hit.find((p) => p.name === m.c.target) ?? carriers.find((p) => m.hit.includes(p));
      if (!carrier || !life.alive(carrier, s.t - 500)) continue;
      const others = m.hit.filter((p) => p !== carrier);
      const stayed = inLine(carrier);
      // Still in the line stack with the missile: a share of the line plus
      // the missile under Magic Vulnerability Up (A100 +1:21.5, died).
      if (!others.length) {
        if (!stayed) continue;
        const died = diedOf(carrier, life, deaths, s.t);
        errors.push(playerError(carrier, {
          ruleId: TOP1_MISSILE_RULE_ID, severity: died ? "Major" : "Minor", name: "Missile in the Stack",
          description: `Set ${s.k}: stayed in a line stack while their Guided Missile Kyrios (In Line ${s.k}) went off, taking both${died ? " and dying" : ""}. ${MISSILE_WHY}`,
          timestamp: s.t, abilityId: MISSILE, abilityName: "Guided Missile Kyrios",
        }));
        continue;
      }
      const died = m.hit.filter((p) => diedOf(p, life, deaths, s.t) || deaths.some((d) => d.player === p.name && !d.killingAbilityGameId && d.timestamp > s.t && d.timestamp - s.t <= KNOCK_DEATH_MS));
      const blamed = stayed || others.length >= 2 ? [carrier] : [carrier, ...others];
      for (const p of blamed) {
        errors.push(playerError(p, {
          ruleId: TOP1_MISSILE_RULE_ID, severity: died.length ? "Major" : "Minor", name: p === carrier ? "Missile on Others" : "Stood by a Missile",
          description: `Set ${s.k}: ${carrier.name}'s Guided Missile Kyrios (In Line ${s.k}) also hit ${namesOf(others)}${stayed ? `; ${carrier.name} was still in the line stack` : ""}${blamed.length > 1 ? "; either the carrier or the player hit was out of place" : ""}.${died.length ? ` ${namesOf(died)} died.` : ""} ${MISSILE_WHY}`,
          timestamp: s.t, abilityId: MISSILE, abilityName: "Guided Missile Kyrios",
        }));
      }
    }

    // Lines: with everyone alive (a death leaves a group short through no
    // one's fault at the line).
    if (!allAlive(players, life, s.t - 500)) continue;
    const lineErrors: PullError[] = [];
    const targets = players.filter((p) => p.debuffs.some((e) => LINE_MARKS.includes(e.abilityId) && e.debuffStatus === "removed" && Math.abs(e.timestamp - s.t) <= 1000));
    // Both lines aim at the set's two players of one In Line number, one per
    // group. Both of them inside one line means they stood on the same side:
    // one should have crossed to the other group (user's VOD reviewer,
    // 2026-10-14, A46 +1:21.5; also A55). The rest of that stack is fallout.
    const paired = targets.length === 2 && s.lines.some((l) => targets.every((p) => l.hit.includes(p)));
    if (paired) {
      const hit = uniq(s.lines.flatMap((l) => l.hit));
      const died = hit.filter((p) => life.diedFrom(p, s.t));
      for (const p of targets) {
        const other = targets.find((x) => x !== p)!;
        lineErrors.push(playerError(p, {
          ruleId: TOP1_LINE_RULE_ID, severity: died.length ? "Major" : "Minor", name: "Same Number, Same Side",
          description: `Set ${s.k}: had In Line ${num.get(p) ?? "?"} like ${other.name} and stood on the same side, so both lines went into one stack (${namesOf(hit)})${died.length ? `; ${namesOf(died)} died` : ""}. One of the two should have crossed to the other group; the log can't say which. ${LINE_WHY}`,
          timestamp: s.t, abilityId: LINE, abilityName: "Condensed Wave Cannon Kyrios",
        }));
      }
      errors.push(...lineErrors);
      continue;
    }
    // Anyone in both lines took two shares under Magic Vulnerability Up.
    if (s.lines.length === 2) {
      const both = s.lines[0].hit.filter((p) => s.lines[1].hit.includes(p));
      for (const p of both) {
        const died = !!life.diedFrom(p, s.t);
        lineErrors.push(playerError(p, {
          ruleId: TOP1_LINE_RULE_ID, severity: died ? "Major" : "Minor", name: "In Both Lines",
          description: `Set ${s.k}: stood in both groups' lines (${namesOf(uniq(s.lines.flatMap((l) => l.hit)))} between them)${died ? " and died" : ""}. ${LINE_WHY}`,
          timestamp: s.t, abilityId: LINE, abilityName: "Condensed Wave Cannon Kyrios",
        }));
      }
    }
    const lineDied =(l: { hit: PlayerInfo[] }) => l.hit.filter((p) => life.diedFrom(p, s.t));
    for (const g of groups ?? []) {
      const carrier = g.find((p) => num.get(p) === s.k);
      const target = targets.find((p) => g.includes(p));
      const own = s.lines.find((l) => target && l.hit.includes(target))
        ?? [...s.lines].sort((a, b) => b.hit.filter((p) => g.includes(p)).length - a.hit.filter((p) => g.includes(p)).length)[0];
      if (!own) continue;
      const died = lineDied(own);
      const severity = died.length ? "Major" : "Minor";
      const outcome = `${own.hit.length} took the line${died.length ? ` and ${namesOf(died)} died` : ""}`;
      // The aimed player took the line to the other group.
      if (target && own.hit.includes(target) && own.hit.filter((p) => g.includes(p) && p !== target).length === 0 && own.hit.length >= 2) {
        lineErrors.push(playerError(target, {
          ruleId: TOP1_LINE_RULE_ID, severity, name: "Line Aimed at the Other Group",
          description: `Set ${s.k}: ${target.name}'s line went into the other group's stack (${namesOf(own.hit)}): ${outcome}. ${LINE_WHY}`,
          timestamp: s.t, abilityId: LINE, abilityName: "Condensed Wave Cannon Kyrios",
        }));
        continue;
      }
      const missing = g.filter((p) => p !== carrier && !own.hit.includes(p));
      for (const p of missing) {
        const elsewhere = inLine(p);
        lineErrors.push(playerError(p, {
          ruleId: TOP1_LINE_RULE_ID, severity, name: elsewhere ? "Wrong Line Stack" : "Missed Line Stack",
          description: `Set ${s.k}: wasn't in their group's line${elsewhere ? " (stood in the other group's)" : ""}; ${outcome} (${namesOf(own.hit)}). ${LINE_WHY}`,
          timestamp: s.t, abilityId: LINE, abilityName: "Condensed Wave Cannon Kyrios",
        }));
      }
    }
    errors.push(...firstPer(lineErrors, (e) => `${e.player}`));
  }
  return errors;
}

// ── the final volley: Diffuse and Wave Cannon Kyrios ────────────────────────

const DIFFUSE_WHY = "Diffuse Wave Cannon Kyrios fires at the two players farthest from Omega, five times: the tanks stand at max melee (north, invulns up) and everyone else stays inside the hitbox.";

/**
 * Diffuse Wave Cannon Kyrios on a non-tank with both tanks alive: the
 * non-tank farthest from Omega among those hit baited it, and a tank no cone
 * reached wasn't farthest. One error per player for the whole volley.
 */
function detectDiffuse(players: PlayerInfo[], life: Life, deaths: DeathEvent[], casts: EnemyEvent[], end: number): PullError[] {
  const tanks = players.filter(isTank);
  if (tanks.length !== 2) return [];
  const errors: PullError[] = [];
  for (const v of clusterByGap(castsOf(casts, DIFFUSE, end), (c) => c.timestamp, 1000)) {
    const t = v[0].timestamp;
    if (!tanks.every((p) => life.alive(p, t - 500))) break;
    const hits = v.flatMap((c) => instanceHits(players, life, c, 1000));
    const nonTanks = uniq(hits.filter((x) => !isTank(x.p)));
    if (!nonTanks.length) continue;
    const ox = v[0].x, oy = v[0].y;
    const dist = (e: PlayerEvent) => (ox === undefined || oy === undefined || e.x === undefined || e.y === undefined ? -1 : Math.hypot(e.x - ox, e.y - oy));
    const far = [...nonTanks].sort((a, b) => dist(b.e) - dist(a.e))[0];
    const idle = tanks.filter((p) => !hits.some((x) => x.p === p));
    const caught = uniq(nonTanks.map((x) => x.p));
    const died = caught.filter((p) => life.diedFrom(p, t));
    const severity = died.length ? "Major" : "Minor";
    const tail = `${caught.length > 1 ? ` It hit ${namesOf(caught)}.` : ""}${died.length ? ` ${namesOf(died)} died.` : ""} ${DIFFUSE_WHY}`;
    errors.push(playerError(far.p, {
      ruleId: TOP1_DIFFUSE_RULE_ID, severity, name: "Baited a Tank Cone",
      description: `Stood farther from Omega than a tank${dist(far.e) >= 0 ? ` (~${yd(dist(far.e))} yalms)` : ""}, so Diffuse Wave Cannon Kyrios went to them.${tail}`,
      timestamp: t, abilityId: DIFFUSE, abilityName: "Diffuse Wave Cannon Kyrios",
    }));
    for (const p of idle) {
      errors.push(playerError(p, {
        ruleId: TOP1_DIFFUSE_RULE_ID, severity, name: "Didn't Bait the Tank Cone",
        description: `No Diffuse Wave Cannon Kyrios cone reached them: a non-tank was farther from Omega, so the cone went to ${far.p.name}.${tail}`,
        timestamp: t, abilityId: DIFFUSE, abilityName: "Diffuse Wave Cannon Kyrios",
      }));
    }
  }
  return firstPer(errors, (e) => `${e.player}`);
}

const WAVE_WHY = "Wave Cannon Kyrios marks three non-tanks, then the other three; each line hits everyone along it and leaves Magic Vulnerability Up, so the marked players spread to distinct angles inside the hitbox.";

/** A Wave Cannon Kyrios line that hit more than one player, with all six non-tanks alive. */
function detectWaveCannon(players: PlayerInfo[], life: Life, casts: EnemyEvent[], end: number): PullError[] {
  const errors: PullError[] = [];
  const nonTanks = players.filter((p) => !isTank(p));
  for (const set of clusterByGap(castsOf(casts, WAVE_CANNON, end), (c) => c.timestamp, ROUND_GAP_MS)) {
    const t = set[0].timestamp;
    if (!nonTanks.every((p) => life.alive(p, t - 500))) continue;
    for (const c of set) {
      const hit = instanceHits(players, life, c, 1000).map((x) => x.p);
      if (hit.length <= 1) continue;
      const died = hit.filter((p) => life.diedFrom(p, t));
      for (const p of hit) {
        errors.push(playerError(p, {
          ruleId: TOP1_WAVE_CANNON_RULE_ID, severity: died.length ? "Major" : "Minor", name: "Wave Cannon Overlap",
          description: `One Wave Cannon Kyrios line hit ${namesOf(hit)}${c.target ? ` (aimed at ${c.target})` : ""}${died.length ? `; ${namesOf(died)} died` : ""}. Whoever stood on another's line is at fault; the log can't tell which. ${WAVE_WHY}`,
          timestamp: c.timestamp, abilityId: WAVE_CANNON, abilityName: "Wave Cannon Kyrios",
        }));
      }
    }
  }
  return firstPer(errors, (e) => `${e.player}@${Math.round(e.timestamp / 5000)}`);
}

// ── deaths with no killing blow ─────────────────────────────────────────────

/** A silent death that's a mechanic's: Doom running out, or a missile knockback into the wall. */
function mechanicSilentDeath(players: PlayerInfo[], d: DeathEvent): boolean {
  const p = players.find((x) => x.name === d.player);
  if (!p) return false;
  if (p.debuffs.some((e) => e.abilityId === DOOM && e.debuffStatus === "applied" && e.timestamp < d.timestamp && d.timestamp - e.timestamp <= DOOM_DEATH_MS)) return true;
  return p.damageTaken.some((e) => e.abilityId === MISSILE && e.timestamp < d.timestamp && d.timestamp - e.timestamp <= KNOCK_DEATH_MS);
}

function calledWipeDeaths(players: PlayerInfo[], deaths: DeathEvent[], pullEnd: number): Set<DeathEvent> {
  const silent = deaths.filter((d) => !d.killingAbilityGameId && !mechanicSilentDeath(players, d));
  const out = new Set<DeathEvent>();
  for (const d of silent) {
    if (pullEnd - d.timestamp <= CALLED_WIPE_END_MS) out.add(d);
    const near = resetCluster(silent.filter((x) => Math.abs(x.timestamp - d.timestamp) <= CALLED_WIPE_WINDOW), deaths);
    if (near.length >= CALLED_WIPE_COUNT) near.forEach((x) => out.add(x));
  }
  return new Set(resetCluster([...out], deaths));
}

/**
 * A silent death mid-pull that no mechanic explains walked into the
 * deathwall (Major). Not one right after another death or within 20s of the
 * player's own Damage Down (the raid resetting), nor with a big hit just
 * before (FFLogs dropped the killing blow).
 */
function detectWallDeaths(players: PlayerInfo[], deaths: DeathEvent[], called: Set<DeathEvent>): PullError[] {
  const errors: PullError[] = [];
  for (const d of deaths) {
    if (d.killingAbilityGameId || called.has(d) || mechanicSilentDeath(players, d)) continue;
    const p = players.find((x) => x.name === d.player);
    if (!p) continue;
    if (deaths.some((k) => k !== d && k.timestamp <= d.timestamp && d.timestamp - k.timestamp <= RESET_AFTER_DEATH_MS)) continue;
    if (p.debuffs.some((e) => e.abilityId === DAMAGE_DOWN && e.debuffStatus === "applied" && e.timestamp < d.timestamp && d.timestamp - e.timestamp <= DD_RESET_MS)) continue;
    if (p.damageTaken.some((e) => (e.amount ?? 0) > 0 && e.timestamp <= d.timestamp && d.timestamp - e.timestamp <= SILENT_HIT_MS)) continue;
    errors.push(playerError(p, {
      ruleId: TOP1_WALL_RULE_ID, severity: "Major", name: "Walked Into the Wall",
      description: "Died with no killing blow mid-pull, with no Doom or missile behind it: walked into the deathwall at the arena's edge.",
      timestamp: d.timestamp - DEATH_EVENT_LAG_MS, abilityId: 0, abilityName: "Deathwall",
    }));
  }
  return errors;
}

// ── entry point ─────────────────────────────────────────────────────────────

/**
 * The Omega Protocol Phase 1 (Omega) errors. Self-gates on Program Loop,
 * which no other fight casts, and stops at the first Phase 2 cast: later
 * phases belong to their own modules (and the fallback model until those
 * exist).
 */
export function detectOmegaErrors(
  players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], occurrences?: ReportedOccurrence[],
): PullError[] {
  if (!enemyCasts.some((c) => c.abilityId === PROGRAM_LOOP)) return [];
  const p2 = phase1End(enemyCasts);
  const deaths = deathEvents.filter((d) => d.timestamp <= p2);
  const life = buildLife(players, deaths);
  const lastEvent = Math.max(0, ...players.flatMap((p) => [...p.damageTaken, ...p.casts].map((e) => e.timestamp)), ...deathEvents.map((d) => d.timestamp));
  const end = Math.min(p2, lastEvent);
  const called = calledWipeDeaths(players, deaths, p2 === Infinity ? lastEvent : Infinity);

  const errors = [
    ...detectAvoidable(players, life, end),
    ...detectProgramLoop(players, life, deaths, enemyCasts, end, occurrences),
    ...detectPantokrator(players, life, deaths, enemyCasts, end),
    ...detectDiffuse(players, life, deaths, enemyCasts, end),
    ...detectWaveCannon(players, life, enemyCasts, end),
    ...detectWallDeaths(players, deaths, called),
  ];

  // Generic cutoffs, only the earliest and only before any mechanic Raid.
  const generic: PullError[] = [];
  const enrage = p2 === Infinity ? castsOf(enemyCasts, ATOMIC_RAY, end)[0] : undefined;
  if (enrage) {
    const left = enrage.hitPoints !== undefined && enrage.maxHitPoints
      ? ` Omega still had ${(100 * enrage.hitPoints / enrage.maxHitPoints).toFixed(1)}% HP left.` : "";
    generic.push(raidMarker(TOP1_ENRAGE_RULE_ID, "Atomic Ray (Enrage)",
      `Atomic Ray, Phase 1's enrage, went off: the DPS check wasn't met.${left}`, enrage.timestamp, ATOMIC_RAY, "Atomic Ray"));
  }
  const calledList = deaths.filter((d) => called.has(d)).sort((a, b) => a.timestamp - b.timestamp);
  if (calledList.length >= CALLED_WIPE_COUNT) {
    generic.push(raidMarker(TOP1_CALLED_WIPE_RULE_ID, "Wipe Called",
      `${calledList.length} players died with no killing blow (${joinNames(uniq(calledList.map((d) => d.player)))}): the wipe was called and the raid reset into the deathwall.`,
      calledList[0].timestamp - DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  if (p2 === Infinity) {
    const outAt = (t: number) => players.filter((p) => !life.alive(p, t));
    const collapseT = life.outIntervals.map((w) => w.start).sort((a, b) => a - b)
      .find((t) => outAt(t).length >= COLLAPSE_DEAD_COUNT && lastEvent - t <= COLLAPSE_END_MS);
    if (collapseT !== undefined) {
      const who = outAt(collapseT).map((p) => p.name);
      generic.push(raidMarker(TOP1_COLLAPSE_RULE_ID, "Party Collapse",
        `${who.length} players were dead at once (${joinNames(who)}). Treated as the cutoff point.`,
        collapseT + DEATH_EVENT_LAG_MS, 0, "Deaths"));
    }
  }
  const firstRaid = Math.min(...errors.filter((e) => e.severity === "Raid").map((e) => e.timestamp));
  const marker = generic.sort((a, b) => a.timestamp - b.timestamp)[0];
  if (marker && marker.timestamp < firstRaid) errors.push(marker);
  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
