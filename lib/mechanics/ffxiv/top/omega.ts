// The Omega Protocol (Ultimate) -- Phase 1: Omega / Beetle Omega.
//
// -- GUIDE-DERIVED MODEL (2026-10-14; NOT VERIFIED AGAINST LOGS) --
// Research only: no imports, exports, rules or encounter registration.
// All failure signals below are guide-inferred, not observed in this repo.
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
