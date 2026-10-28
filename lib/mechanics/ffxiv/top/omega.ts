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
//   a player the user asked (2026-10-14, A46; from the strat, no VOD) one
//   of them should have crossed to the other group; it isn't the whole
//   group. No ruling: nobody has checked it on VOD.
// - Group A's slots (user, 2026-10-14, TOP only): WAR MT, DRK OT, WHM H1,
//   SCH H2, PCT R1, DNC R2, RDM M1, DRG M2 ("may have been": the data
//   agrees). The Pantokrator groups follow NAUR's conga, H1 R1 M1 MT OT M2
//   R2 H2: for each In Line number the earlier player goes to one side,
//   the later to the other. It fits all 49 pulls with known groups, and no
//   other order of the eight slots fits. By it,
//   A46 +1:21.5's DRG and A55 +1:21.5's PCT didn't cross. Built as a
//   cross-pull pass (pantokrator-conga.ts; app/page.tsx and validate.js's
//   omega run): the report's conga is learned over player names from its
//   own splits (A: one order fits 55 of 55), so slots aren't needed.
// - Missile-knockback deaths and Doom deaths log with no killing blow in
//   some pulls; neither counts toward a called wipe.
// - Diffuse on non-tanks (A8 +1:48.2, A24, A36 ...): the cone goes to the
//   farthest; one non-tank stood outside the tanks.
// Cutoffs (first Raid error): collapse 50, empty tower 26, called wipe 17,
// enrage 4; the 14 P1 clears have none. Every wipe has a mechanic error
// before its generic cutoff.
// Replay (2026-10-18, bNcrLh7Y4dkHxM9q fight 17, a kill): the tower
// helpers log a sample at each tower's resolution, where the tower stood;
// Blaster tethers (89) form at each take (three at once at +0:21.1 for two
// holders); Ballistic Impact's helpers log only the boss's spot; Diffuse
// fits 120° aimed at the tanks it hit (10 of 10). Storage Violation 31492
// returns at 11:07.5 in that pull. Built in replay.ts.
// Report B = 2qgaAkxVypGWv9CN (the user's static, day 1 of prog, 73
// pulls, no P1 clear; GNB DRK, SCH SGE, MNK SAM, DNC RDM; NAUR strats):
// - Program Loop layout: each round's towers sit on two cardinals (+-14
//   degrees) and the two holders take the other two, by priority: a
//   clockwise scan from north, the earlier holder in the NAUR conga (SCH
//   DNC MNK DRK GNB SAM RDM SGE) on the first free cardinal (170 of 175
//   clean rounds; pantokrator-conga.ts). Clean holders stood 0-28 degrees
//   off their cardinal; waiting players stand by the towers.
// - The tower helpers' cast positions can repeat the previous round's
//   spots (B12 +0:38.1: round 1's N/W for towers soaked at E/S); the
//   soaker's own hit is the tower's place.
// - Diffuse: the DRK takes all five volleys alone with Living Dead (cast
//   1:43-1:47 every pull that got there); the GNB is clipped for 0 each
//   volley. B51: no Living Dead, the DRK died to the first pair and the
//   cones then killed six.
// - Pull 64 (0:15, all eight dead by 0:05, no killing blow) was a reset to
//   get a cooldown back (user): not a pull, left without a cutoff.
// VOD review 2026-10-23 (user): report B Pulls 1, 3, 7, 12, 44, 51, 56,
// then 2, 4, 6, 13, 22, 23, 25, 30 (and P2's 66, 68, 71, 72 in
// omega-mf.ts); rulings in expectations/rulings.json. Pull 14 1:18.9
// (many on the wrong side, the group's first talk about it) stays
// unruled.
// Tether takes (2026-10-23): the Blaster tether (89) logs an event at
// every take, source = the taker, fetched with the head markers. Round 1's
// first tethers form on three players at once (~0:21, random). Clean
// rounds show the two In Line holders taking once each; failures show
// late takes by the wrong player: Pull 4 the DRK 0.8s before the Blaster,
// Pull 6 the MNK 1.1s before (after the SGE had taken), Pull 12 the SCH
// 5.2s before (after the SAM), Pull 15 the MNK 6.1s before (the SGE never
// took). Holders at the Blaster = the two latest takers the round's
// Blasters hit; that matched every one of these user calls.
// Report C = LG64YVQy2KZbtpN8 (the user's static, day 2, 48 pulls, same
// roster; conga SGE RDM SAM GNB DRK MNK DNC SCH, user). VOD review
// 2026-10-24 (user): Pulls 12, 20, 23, 28, 34, 37, 38, 45 here (11, 29, 31,
// 40 in omega-mf.ts, 48 in omega-reconfiguredd.ts); rulings in
// expectations/rulings.json. Findings:
// - Pulls 20, 21, 32: silent deaths at 0:04-0:19, before the first towers,
//   were a reset after a cooldown was burned (Pull 21: only four died and
//   the rest played on into an empty tower; confirmed). Not pulls.
// - C28 1:57.8: the GNB died at the wall still holding Flame Thrower's
//   Damage Down (20.2s after it) and was raised: deliberate, "the correct
//   thing to do".
// - C34 0:28.8 and C38 0:28.5: the MNK clipped by a round-1 Blaster died
//   at their own round-2 tower / tether to Doom (Ruin still up): Minor for
//   the clip, Major for the death. C12, C13, C48's round-4 tower deaths
//   (In Line 4 left low after HP Penalty) are healing and fallout: none.
// - C37 1:21.1: the MNK took their line alone, the GNB and RDM 1.9y apart
//   in no line: the MNK went to the wrong side (2qgaAkxVypGWv9CN Pulls 27
//   and 50 show the same shape, unreviewed).
// - C45 0:46.9: the SCH and DNC (In Line 1) took the same tether, the DNC
//   last (0.5s before), while the GNB kept theirs: the DNC should have
//   flexed to the GNB's.
// - C23 0:56.1: both holders together, both at an intercardinal: both named.
// Report D = hjgk42MDf81arFVY (the user's static, day 3, 47 pulls, same
// roster and conga). VOD review 2026-10-28 (user): Pulls 1, 2, 8, 36 here
// (5, 6, 15, 17, 18, 22, 32, 33, 37, 42, 45 in omega-mf.ts); rulings in
// expectations/rulings.json. Findings:
// - Diffuse is now taken by both tanks under invulns (the GNB's Superbolide
//   ~0.9s before the first cone lands, the DRK's Living Dead): D1 1:47.6 and
//   D8 1:48.0 the Superbolide went up 0.5s before and didn't apply, and the
//   GNB died (LG64YVQy2KZbtpN8 Pull 17: 0.4s).
// - Pantokrator deaths: a player dead at set 1, 2 or 3 leaves their group
//   short, and the later lines kill the two sharing (or a dead carrier's
//   missile lands on someone; both of D47's set-3 missiles went to the
//   DRK). "If it's on the fourth one, it's recoverable" (user, D2). With a
//   raise in time, or the short sets killing nobody, raids carried on (D26,
//   D45, C26, C42, C46 all cleared P1).
// - Tether hand-offs pair by the conga: the earlier new holder takes the
//   earlier previous holder's tether (247 of 254 clean hand-offs over B, C
//   and D). D36 0:38.1: the MNK took the DNC's, the SCH's by the pairing,
//   leaving the RDM's; the SCH then took it from the MNK. User: the MNK.
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
//   alive: a Blaster hitting both holders (both named; the cross-pull
//   holder priority keeps the one off their assigned cardinal, "Wrong
//   Tether Spot"); a round's tower player with Looper in a Blaster instead
//   of a tower; a holder hitting a tower soaker or two+ others; else the
//   one player hit when the holder stood on a free cardinal (user, B1
//   0:29.2), the holder when they didn't and that player waited by a
//   tower, else both; no holder in the hit (the non-soakers hit). Rounds
//   2-4, a tether on another number: the In Line player with no tether
//   didn't take it (and the holder, unless they held it the round before);
//   an In Line player no Blaster hit took no tether, and the previous
//   round's holders still holding one aren't named for what it hits
//   (user, B7, B12); not when a tower owner of the round stood in a
//   Blaster instead (they took it: user, B4). With tether takes, when an
//   In Line player took none or no Blaster hit them: holders are the two
//   latest takers the Blasters hit; a holder who took after an In Line
//   player's own take took theirs ("Took Another's Tether"; a tower owner
//   is left to the tower rules), and the victim is excused when the thief
//   had no tether duty or took within LATE_STEAL_MS of the Blaster (user,
//   B4, B6, B12, B15). A holder who kept last round's tether isn't named.
//   Both In Line players in one Blaster while another stayed on last
//   round's holder (no take): the later taker ("Took Another's Tether";
//   user, C45); pantokrator-conga.ts moves it to the first taker when the
//   conga pairing gave them the tether left behind (user, D36). "Died From a Blaster Clip" (Major): a player named for
//   standing in a Blaster who died at their own next tower/tether within
//   Ruin's 11s, unless that round already names them (user, C34, C38).
// ffxiv-top1-tower "Tower Out of Turn" skips a player with no duty that
//   round who covered for a tower owner stuck in a Blaster (user, B44).
// ffxiv-top1-missile (Major on death, else Minor): a missile hitting
//   others (the carrier; with one other, both), or the carrier in a line.
//   One per carrier and set (a dead carrier's missile can land on the other).
// ffxiv-top1-line "Pantokrator One Short" (Raid, player-less): a player
//   alive at Pantokrator but dead at set 1, 2 or 3, when a later set's line
//   or missile then killed someone, not in a P1 clear; at their fatal hit
//   (user, D2).
// ffxiv-top1-line, groups broken: a group holding both players of an In
//   Line number (Major, both named; the conga keeps the one who didn't
//   flex) plus a Raid cutoff at the first set, and no line errors after
//   (user, B3 1:21.4: "not resolvable").
// ffxiv-top1-line (Major on death, else Minor), all eight alive: both
//   line-marked players inside one line (both named, nobody else that
//   set; the cross-pull conga then keeps only the one who belonged on the
//   other side, "Didn't Cross"); else a group member in neither line or the other group's
//   (groups read from the pull's lines), the aimed player taking the line
//   to the other group, a player in both lines; the aimed player alone in
//   their line while the two missing members stood within 5y in no line:
//   the aimed player ("Left the Group"; user, C37).
// ffxiv-top1-diffuse (Major on death, else Minor), both tanks alive: the
//   farthest non-tank a cone hit, and a tank no cone reached. A tank the
//   cones killed had no invuln ("Tank Cones Without Invuln", Major; Raid
//   when the next cones killed 3+; user, B51); an invuln cast up to 3s
//   before their first cone is named as too late (user, D1).
// ffxiv-top1-wave-cannon: a line hitting 2+ players, all six non-tanks
//   alive (everyone it hit named: the log can't say who moved).
// ffxiv-top1-wall (Major): a silent death no Doom, missile, reset or own
//   Damage Down explains (applied within 20s, or still held at the fatal
//   moment: user, C28).
// A pull with 3+ silent deaths before the first towers is a reset: no
// errors at all (user, C20; also 2qgaAkxVypGWv9CN Pull 64).
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
import type { Tether } from "@/types/Pull";
import { interpolatePlayerPosition } from "@/lib/mechanics/player-position";
import { kFmt, yd, joinNames, playerError, raidMarker, clusterByGap, RAID_MARKER_SORT_OFFSET_MS } from "@/lib/mechanics/wow/common";
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
const BLASTER_TETHER = 89;  // tether event at each take (source = the taker)
// A tether taken from its holder this close to the Blaster left them no
// time to take another (user, 2026-10-23: Pull 4 0.8s and Pull 6 1.1s
// before, the victim "was correct"; Pull 12 5.2s before, the victim
// "should have adjusted").
const LATE_STEAL_MS = 3000;
const PANTOKRATOR  = 31499;
const BALLISTIC    = 31500;
const MISSILE      = 31502; // Guided Missile Kyrios (cast target = its carrier)
const LINE         = 31503; // Condensed Wave Cannon Kyrios, a three-player shared line
const LINE_MARKS   = [1003507, 1003508, 1003509, 1003510]; // the line's aimed player, per set
const DIFFUSE      = 31504;
// Tank invulns, for when one went up too late for the first cone
// (Superbolide, Living Dead, Holmgang, Hallowed Ground).
const INVULNS: Record<number, string> = { 16152: "Superbolide", 3638: "Living Dead", 43: "Holmgang", 30: "Hallowed Ground" };
const WAVE_CANNON  = 31505;
const ATOMIC_RAY   = 31480;
// Phase 2's opening casts (Party Synergy, Firewall, Solar Ray). Every
// actor in both phases is named "Omega", so the phase ends at these.
const P2_CASTS     = [31550, 31551, 31552, 31553, 32362, 32363];

type Avoidable = { name: string; hit: string; why: string };
const FLAME_WHY = "Move with the safe sector, against the two cones' rotation.";
const AVOIDABLE: Record<number, Avoidable> = {
  31501: { name: "Flame Thrower", hit: "Hit by Flame Thrower", why: FLAME_WHY },
  32368: { name: "Flame Thrower", hit: "Hit by Flame Thrower", why: FLAME_WHY },
  [BALLISTIC]: { name: "Ballistic Impact", hit: "Stood in a Ballistic Impact puddle",
    why: "Drop the puddle with the group and step just clear." },
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
// Twice-come Ruin lasts 11s; a second Ruin-giver inside it is Doom.
const RUIN_MS             = 11_000;
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

/** Program Loop's In Line numbers by name, for the cross-pull tether pairing (pantokrator-conga.ts). */
export function readLoopNumbers(players: PlayerInfo[], enemyCasts: EnemyEvent[]): Map<string, number> | undefined {
  const loop = castsOf(enemyCasts, PROGRAM_LOOP, Infinity)[0];
  if (!loop) return undefined;
  return new Map([...numbersIn(players, loop.timestamp, loop.timestamp + 10_000)].map(([p, n]) => [p.name, n]));
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
/**
 * "A and B got Doom and died; C died; D got Doom" for a description;
 * "All 4" / "All but X" when a clause covers every player just `named`
 * (or all but one of three or more).
 */
function fateOf(named: PlayerInfo[], doomed: PlayerInfo[], died: PlayerInfo[]): string {
  const both = died.filter((p) => doomed.includes(p));
  const clause = (xs: PlayerInfo[], verb: string) => {
    if (!xs.length) return "";
    const missing = named.filter((p) => !xs.includes(p));
    const extra = xs.filter((p) => !named.includes(p));
    if (named.length < 2 || missing.length > 1 || (missing.length && (extra.length || named.length < 3))) return `${namesOf(xs)} ${verb}`;
    return `${missing.length ? `All but ${missing[0].name}` : named.length === 2 ? "Both" : `All ${named.length}`}${extra.length ? ` and ${namesOf(extra)}` : ""} ${verb}`;
  };
  return [
    clause(both, "got Doom and died"),
    clause(died.filter((p) => !both.includes(p)), "died"),
    clause(doomed.filter((p) => !both.includes(p)), "got Doom"),
  ].filter(Boolean).join("; ");
}
/** Died from a hit at `t`: a killing blow within 3s, or Doom from it running out. */
function diedOf(p: PlayerInfo, life: Life, deaths: DeathEvent[], t: number): boolean {
  return !!life.diedFrom(p, t) || (doomedAt(p, t) && deaths.some((d) => d.player === p.name && d.timestamp > t && d.timestamp - t <= DOOM_DEATH_MS));
}

/** m:ss from the pull start, as the user reads a VOD. */
const mmssOf = (t: number) => `${Math.floor(t / 60_000)}:${((t % 60_000) / 1000).toFixed(1).padStart(4, "0")}`;

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

/**
 * The round's two tower cardinals and the two free ones the holders take.
 * A tower's spot is read from its soaker's hit: the helpers' cast positions
 * can repeat the previous round's (A12 +0:38.1 logged round 1's spots for
 * towers soaked at E and S). An unsoaked tower falls back to its cast.
 */
function roundCardinals(players: PlayerInfo[], life: Life, rd: Round): { towers: number[]; free: number[] } | undefined {
  const towers = uniq(rd.casts.filter((c) => c.abilityId === TOWER || c.abilityId === OBLITERATION).flatMap((c) => {
    const e = instanceHits(players, life, c).find((x) => x.e.x !== undefined)?.e;
    const x = e?.x ?? c.x, y = e?.y ?? c.y;
    return x === undefined || y === undefined ? [] : [cardinalOf(compassOf(x, y))];
  }));
  if (towers.length !== 2) return undefined;
  return { towers, free: [0, 1, 2, 3].filter((c) => !towers.includes(c)) };
}

/** The four Program Loop rounds: two towers and two Blasters each, ~9s apart. */
function loopRounds(casts: EnemyEvent[], end: number): Round[] {
  return clusterByGap(castsOf(casts, [TOWER, OBLITERATION, BLASTER], end), (c) => c.timestamp, ROUND_GAP_MS)
    .slice(0, 4).map((g, i) => ({ r: i + 1, t: g[0].timestamp, casts: g }));
}

const TOWER_WHY = "Each In Line n player takes one round n tower while holding Looper.";
const BLASTER_WHY = "Holders take Blaster to the free cardinals, away from all; a 2nd hit in 11s is Doom.";

// TOP's arena is centred on (100, 100); positions are in hundredths of a yalm.
const ARENA_X = 10000, ARENA_Y = 10000;
/** Compass bearing from the arena centre (0 = north, clockwise; y grows south). */
export function compassOf(x: number, y: number): number {
  return (Math.atan2(x - ARENA_X, -(y - ARENA_Y)) * 180 / Math.PI + 360) % 360;
}
/** The nearest cardinal: 0 N, 1 E, 2 S, 3 W. */
export const cardinalOf = (bearing: number) => Math.round(bearing / 90) % 4;
/** Degrees between a bearing and a cardinal. */
export const offCardinal = (bearing: number, c: number) => Math.abs(((bearing - c * 90) % 360 + 540) % 360 - 180);
// A tether holder within this of a free cardinal stood on their spot. Clean
// holders (2qgaAkxVypGWv9CN, 160 clean holds): 0-28 degrees; the holders
// whose Blaster clipped one waiting player: 0-14, one 88 (A42 +0:46.6).
const HOLDER_SPOT_DEG = 30;
// A waiting player within this of a tower's cardinal stood by the tower.
// Victims of a holder on their spot stood 21-135 off (A1 +0:29.2's SCH at
// 21 was out of place: user, 2026-10-23).
const WAITER_SPOT_DEG = 20;

/**
 * Program Loop. Each round's two towers need the two In Line players for
 * that round, still holding Looper. A tower nobody with Looper took casts
 * Storage Violation Obliteration: Doom (and Damage Down) on the whole raid,
 * so the pull is over (Raid) and the round's numbered players who still had
 * Looper and stood in no tower are named. Later rounds are fallout.
 * Blaster: an instance that hit anyone but its holder, with all eight alive.
 */
function detectProgramLoop(
  players: PlayerInfo[], life: Life, deaths: DeathEvent[], casts: EnemyEvent[], end: number, occurrences?: ReportedOccurrence[], tethers: Tether[] = [],
): PullError[] {
  const loop = castsOf(casts, PROGRAM_LOOP, end)[0];
  if (!loop) return [];
  const num = numbersIn(players, loop.timestamp, loop.timestamp + 10_000);
  const errors: PullError[] = [];
  let failedAt = Infinity;
  // Blaster tether (89) takes: the log marks each one, source = the taker.
  const takes = tethers.filter((x) => x.tetherId === BLASTER_TETHER)
    .flatMap((x) => { const p = players.find((q) => q.name === x.source); return p ? [{ t: x.timestamp, p }] : []; });
  let prevT = loop.timestamp;
  for (const rd of loopRounds(casts, end)) {
    const roundStart = prevT;
    prevT = rd.t;
    const owners = players.filter((p) => num.get(p) === rd.r);
    occurrences?.push({ mechanicKey: TOP1_TOWER_RULE_ID, timestamp: rd.t, players: owners.map((p) => p.name) });
    if (failedAt < rd.t) continue;
    const looped = (p: PlayerInfo) => holdsAt(p, LOOPER, rd.t - 300);
    const towers = rd.casts.filter((c) => c.abilityId === TOWER).map((c) => ({ c, soak: instanceHits(players, life, c).map((h) => h.p) }));
    const soaked = new Set(towers.flatMap((x) => x.soak));
    const failed = rd.casts.filter((c) => c.abilityId === OBLITERATION);

    // A Looper holder of another number soaking now spends their Looper early.
    // Not a player with no duty this round covering for an owner stuck in a
    // Blaster (user, 2026-10-23, Pull 44 0:28.9: the DRK covered for the
    // GNB, whose tether nobody took). A tether holder taking a tower instead
    // still counts (Pull 30 0:37.7, Pull 18 0:38.1).
    const h = ((rd.r + 1) % 4) + 1;
    const blasted = new Set(rd.casts.filter((c) => c.abilityId === BLASTER).flatMap((c) => instanceHits(players, life, c).map((x) => x.p)));
    const ownerStuck = owners.some((p) => looped(p) && !soaked.has(p) && blasted.has(p));
    for (const p of players.filter((x) => soaked.has(x) && looped(x) && num.get(x) !== rd.r && life.alive(x, rd.t - 500) && !(ownerStuck && num.get(x) !== h))) {
      errors.push(playerError(p, {
        ruleId: TOP1_TOWER_RULE_ID, severity: "Major", name: "Tower Out of Turn",
        description: `Soaked a round ${rd.r} tower as In Line ${num.get(p)}, spending their Looper early: their own round ${num.get(p)} tower is a soaker short. ${TOWER_WHY}`,
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
          description: `In Line ${rd.r} with Looper but in no round ${rd.r} tower: it was left empty and Obliteration gave the raid Doom. ${TOWER_WHY}`,
          timestamp: rd.t, abilityId: OBLITERATION, abilityName: "Storage Violation Obliteration",
        }));
      }
      for (const p of doubled) {
        errors.push(playerError(p, {
          ruleId: TOP1_TOWER_RULE_ID, severity: "Major", name: "Same Tower",
          description: `Both In Line ${rd.r} players (${namesOf(doubled)}) stood in one round ${rd.r} tower, leaving the other empty: Obliteration gave the raid Doom. Either could have moved.`,
          timestamp: rd.t, abilityId: OBLITERATION, abilityName: "Storage Violation Obliteration",
        }));
      }
      const dead = owners.filter((p) => !alive.includes(p));
      const spent = alive.filter((p) => !looped(p));
      const why = [
        dead.length ? `${namesOf(dead)} ${dead.length === 1 ? "was" : "were"} already dead` : "",
        spent.length ? `${namesOf(spent)} had used their Looper` : "",
        absent.length || doubled.length ? `the In Line ${rd.r} ${absent.length + doubled.length === 1 ? "player" : "players"} with Looper ${absent.length ? "stood in no tower" : "shared one tower"}` : "",
      ].filter(Boolean).join("; ");
      errors.push(raidMarker(TOP1_TOWER_RULE_ID, "Tower Left Empty",
        `A round ${rd.r} tower had nobody with Looper${why ? ` (${why})` : ""}. Obliteration gives everyone Doom and Damage Down; treated as the cutoff point.`,
        rd.t, OBLITERATION, "Storage Violation Obliteration"));
      failedAt = rd.t;
    }

    errors.push(...blasterClips(players, life, deaths, rd, num, soaked, failed.length > 0, takes, roundStart));
  }
  return [...errors, ...clipDooms(players, life, deaths, errors)];
}

/**
 * A player named for standing in a Blaster who then died to Doom at their
 * own next tower or tether, still under that hit's Twice-come Ruin: Major on
 * the death, besides the Minor clip (user, 2026-10-24, LG64YVQy2KZbtpN8 Pull
 * 34 0:38.4 and Pull 38 0:38.1: the MNK). Not when that round already
 * names them (2qgaAkxVypGWv9CN Pull 1 0:38.2: the SCH grabbed a tether
 * that wasn't theirs).
 */
function clipDooms(players: PlayerInfo[], life: Life, deaths: DeathEvent[], errors: PullError[]): PullError[] {
  const out: PullError[] = [];
  for (const e of errors.filter((x) => x.name === "Stood in a Blaster")) {
    const p = players.find((x) => x.name === e.player);
    const next = p?.damageTaken.find((x) => (x.abilityId === TOWER || x.abilityId === BLASTER) && x.timestamp > e.timestamp + ROUND_GAP_MS && x.timestamp - e.timestamp <= RUIN_MS);
    if (!p || !next || !diedOf(p, life, deaths, next.timestamp)) continue;
    if (errors.some((x) => x.player === p.name && Math.abs(x.timestamp - next.timestamp) <= ROUND_GAP_MS)) continue;
    out.push(playerError(p, {
      ruleId: TOP1_BLASTER_RULE_ID, severity: "Major", name: "Died From a Blaster Clip",
      description: `Still had Twice-come Ruin from the Blaster at ${mmssOf(e.timestamp)}, so their own ${next.abilityName} ${((next.timestamp - e.timestamp) / 1000).toFixed(1)}s later gave Doom and they died.`,
      timestamp: next.timestamp, abilityId: next.abilityId, abilityName: next.abilityName,
    }));
  }
  return out;
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
 * - otherwise the one player hit when the holder stood on a free cardinal
 *   (user, 2026-10-23, 2qgaAkxVypGWv9CN Pull 1 0:29.2: the SCH waited away
 *   from the towers), the holder when they didn't and the player hit
 *   waited by a tower, else both.
 * A tether nobody of the round's number took is theirs, not the previous
 * holder's who still has it (user, 2026-10-23: "if a tether is not taken,
 * it is the fault of the person who was supposed to take it"); that
 * holder isn't named for what the stuck tether hits (Pull 12 0:38.2).
 * Major when someone it hit got Doom or died, else Minor.
 */
function blasterClips(
  players: PlayerInfo[], life: Life, deaths: DeathEvent[], rd: Round, num: Map<PlayerInfo, number>, soaked: Set<PlayerInfo>, towerFailed: boolean,
  takes: { t: number; p: PlayerInfo }[] = [], roundStart = 0,
): PullError[] {
  if (!allAlive(players, life, rd.t - 500)) return [];
  const h = ((rd.r + 1) % 4) + 1; // tethers go 3-4-1-2
  const hPrev = (rd.r % 4) + 1;   // the previous round's tether number
  const errors: PullError[] = [];
  const roundHit = new Set(rd.casts.filter((x) => x.abilityId === BLASTER).flatMap((c) => instanceHits(players, life, c).map((x) => x.p)));
  const roundDoomed = [...roundHit].some((p) => doomedAt(p, rd.t) || diedOf(p, life, deaths, rd.t));

  // With the tether takes (captures since 2026-10-23), when an In Line h
  // player took no tether this round or no Blaster hit them: the holders
  // are the two latest takers the round's Blasters hit, and a holder who
  // took after them took theirs. Pull 4, 6, 12, 15 (user, 2026-10-23).
  // Not when both took and both were hit: Pull 1 0:38.2's SGE took after
  // both and was hit, yet the user had the SCH and RDM holding.
  const lastTake = (p: PlayerInfo) => takes.filter((x) => x.p === p && x.t > roundStart && x.t < rd.t).reduce((m, x) => Math.max(m, x.t), -Infinity);
  const hPlayers = players.filter((p) => num.get(p) === h);
  const tetherMode = rd.r > 1 && takes.length > 0 && hPlayers.some((p) => !roundHit.has(p) || lastTake(p) === -Infinity);
  let held: Set<PlayerInfo> | undefined;
  if (tetherMode) {
    const recent = uniq(takes.filter((x) => x.t < rd.t).sort((a, b) => b.t - a.t).map((x) => x.p)).filter((p) => roundHit.has(p)).slice(0, 2);
    if (recent.length === 2) held = new Set(recent);
  }
  // Holders who never took this round kept last round's tether.
  const kept = new Set(held ? [...held].filter((p) => num.get(p) !== h && lastTake(p) === -Infinity) : []);

  const blasts = rd.casts.filter((x) => x.abilityId === BLASTER).map((c) => {
    const hits = instanceHits(players, life, c);
    const hit = hits.map((x) => x.p);
    // A kept holder inside another holder's Blaster isn't that Blaster's.
    const inHeld = held ? hit.filter((p) => held!.has(p)) : [];
    const fresh = inHeld.filter((p) => !kept.has(p));
    const holders = held ? (fresh.length ? fresh : inHeld) : hit.filter((p) => num.get(p) === h);
    return { c, hits, hit, holders, holder: hit.find((p) => p.name === c.target) ?? (holders.length === 1 ? holders[0] : undefined) };
  });
  const cards = roundCardinals(players, life, rd);

  // Both In Line h players in one Blaster while another stayed on last
  // round's holder, whom nobody took it from: the later taker took the
  // tether the other already had instead of the one left over (user,
  // 2026-10-24, LG64YVQy2KZbtpN8 Pull 45 0:46.9: the DNC should have flexed
  // to the GNB's; the SCH was right). Neither Blaster is anyone else's.
  const flexed = new Set<(typeof blasts)[number]>();
  if (!held && takes.length && hPlayers.length === 2 && hPlayers.every((p) => lastTake(p) > -Infinity)) {
    const both = blasts.find((b) => hPlayers.every((p) => b.hit.includes(p)));
    const left = blasts.find((b) => b !== both && !b.hit.some((p) => num.get(p) === h) && b.hit.some((p) => num.get(p) === hPrev && lastTake(p) === -Infinity));
    if (both && left) {
      const [first, later] = [...hPlayers].sort((a, b) => lastTake(a) - lastTake(b));
      const stuckOn = left.hit.find((p) => num.get(p) === hPrev)!;
      // pantokrator-conga.ts moves it to the first taker when the conga
      // says theirs was the tether left behind (user, Pull 36).
      errors.push(playerError(later, {
        ruleId: TOP1_BLASTER_RULE_ID, severity: roundDoomed ? "Major" : "Minor", name: TOOK_ANOTHERS_NAME,
        description: `Round ${rd.r}: took ${first.name}'s tether ${((rd.t - lastTake(later)) / 1000).toFixed(1)}s before the Blaster instead of ${stuckOn.name}'s, which ${STAYED_PUT}.${roundDoomed ? " Doom followed." : ""} ${BLASTER_WHY}`,
        timestamp: rd.t, abilityId: BLASTER, abilityName: "Blaster",
      }));
      flexed.add(both);
      flexed.add(left);
    }
  }

  if (held) {
    for (const v of hPlayers.filter((p) => !held!.has(p))) {
      // Someone who took after them took theirs. One who never took was
      // robbed only by a player of another number: the other In Line h
      // player taking a tether is their own (Pull 7 0:55.8: the SCH's).
      const since = Math.max(roundStart, lastTake(v));
      const thief = [...held].filter((p) => p !== v && lastTake(p) > since && (lastTake(v) > -Infinity || num.get(p) !== h))
        .sort((a, b) => lastTake(b) - lastTake(a))[0];
      const late = thief !== undefined && rd.t - lastTake(thief) <= LATE_STEAL_MS;
      // A tower owner who took a tether is named by the tower rules.
      if (thief && num.get(thief) !== rd.r) {
        errors.push(playerError(thief, {
          ruleId: TOP1_BLASTER_RULE_ID, severity: roundDoomed ? "Major" : "Minor", name: "Took Another's Tether",
          description: `Round ${rd.r}: took the tether ${lastTake(v) > -Infinity ? `${v.name} had taken` : `${v.name} was due to take`}, ${((rd.t - lastTake(thief)) / 1000).toFixed(1)}s before the Blaster.${roundDoomed ? " Doom followed." : ""} ${BLASTER_WHY}`,
          timestamp: rd.t, abilityId: BLASTER, abilityName: "Blaster",
        }));
      }
      // The victim is excused when the tether went to someone with no
      // business taking it, or too late to take another.
      if (thief && (num.get(thief) !== h || late)) continue;
      errors.push(playerError(v, {
        ruleId: TOP1_BLASTER_RULE_ID, severity: roundDoomed ? "Major" : "Minor", name: "Tether Not Taken",
        description: thief
          ? `Round ${rd.r}: In Line ${h}, but ${thief.name} took their tether ${((rd.t - lastTake(thief)) / 1000).toFixed(1)}s before the Blaster and they didn't take the other.${roundDoomed ? " Doom followed." : ""} ${BLASTER_WHY}`
          : `Round ${rd.r}: In Line ${h} but took no tether, so one stayed on its previous holder.${roundDoomed ? " Doom followed." : ""} ${BLASTER_WHY}`,
        timestamp: rd.t, abilityId: BLASTER, abilityName: "Blaster",
      }));
    }
  }
  // A tether still on the wrong number: the In Line h player with no tether
  // this round didn't take it (A66 +47.1: the previous holder kept it and
  // got Doom). Not round 1, where the first holder is random.
  // Two holders inside one Blaster both count as holding (A37 +38.2).
  const holding = new Set(blasts.flatMap((b) => (b.holder ? [b.holder] : b.holders.length >= 2 ? b.holders : [])));
  for (const b of blasts) {
    if (held || !b.holder || num.get(b.holder) === h || rd.r === 1) continue;
    const owed = players.filter((p) => num.get(p) === h && !holding.has(p));
    const doomed = doomedAt(b.holder, b.c.timestamp) || diedOf(b.holder, life, deaths, b.c.timestamp);
    const kept = num.get(b.holder) === hPrev;
    for (const p of [...owed, ...(kept ? [] : [b.holder])]) {
      errors.push(playerError(p, {
        ruleId: TOP1_BLASTER_RULE_ID, severity: doomed ? "Major" : "Minor", name: p === b.holder ? "Took Another's Tether" : "Tether Not Taken",
        description: `Round ${rd.r}: a Blaster tether was on ${b.holder.name} (In Line ${num.get(b.holder)}) instead of an In Line ${h} player${kept ? ", kept from the round before" : ""}${owed.length ? `; ${namesOf(owed)} had no tether` : ""}.${doomed ? ` ${b.holder.name} got Doom.` : ""} ${BLASTER_WHY}`,
        timestamp: b.c.timestamp, abilityId: BLASTER, abilityName: "Blaster",
      }));
    }
  }
  // An In Line h player no Blaster hit took no tether, wherever the cast
  // targets went (Pull 12 0:38.2: the SAM; both Blasters lost their
  // targets). The previous round's holders it hit still had theirs.
  // Not when a tower owner of this round stood in a Blaster instead of a
  // tower: they took the tether (user, 2026-10-23, Pull 4 0:38.1: the DRK
  // crossed through the boss and took the RDM's at the last second).
  // This is the fallback for captures without tether takes (before
  // 2026-10-23); with them, the tether-mode block above decides. Hits alone
  // can't show a steal: each Blaster's centre (the hit player whose 15y
  // covers every hit and no miss) fit two or three players in Pull 6 and
  // Pull 15.
  const towerTakers = players.filter((p) => num.get(p) === rd.r && holdsAt(p, LOOPER, rd.t - 300) && !soaked.has(p) && blasts.some((b) => b.hit.includes(p)));
  const missing = rd.r === 1 || held ? [] : players.filter((p) => num.get(p) === h && !blasts.some((b) => b.hit.includes(p)));
  const untaken = towerTakers.length ? [] : missing;
  for (const p of untaken) {
    errors.push(playerError(p, {
      ruleId: TOP1_BLASTER_RULE_ID, severity: roundDoomed ? "Major" : "Minor", name: "Tether Not Taken",
      description: `Round ${rd.r}: In Line ${h} but no Blaster hit them: they took no tether, so one stayed on its previous holder.${roundDoomed ? " Doom followed." : ""} ${BLASTER_WHY}`,
      timestamp: rd.t, abilityId: BLASTER, abilityName: "Blaster",
    }));
  }
  const stuck = held ? kept : new Set(missing.length ? players.filter((p) => num.get(p) === hPrev) : []);
  const bearingOf = (b: (typeof blasts)[number], p: PlayerInfo) => {
    const e = b.hits.find((x) => x.p === p)?.e;
    return e?.x === undefined || e.y === undefined ? undefined : compassOf(e.x, e.y);
  };
  for (const b of blasts) {
    const { c, holders, holder } = b;
    // A tether nobody took: its holder's Blaster is the taker's error.
    if ((holder && kept.has(holder)) || flexed.has(b)) continue;
    const hit = b.hit.filter((p) => !stuck.has(p) || p === holder);
    if (hit.length <= 1) continue;
    const doomed = hit.filter((p) => doomedAt(p, c.timestamp));
    const died = hit.filter((p) => diedOf(p, life, deaths, c.timestamp));
    const severity = doomed.length || died.length ? "Major" : "Minor";
    const tailFor = (named: PlayerInfo[], rule = true) => {
      const o = fateOf(named, doomed, died);
      return `${o ? ` ${o}.` : ""}${rule ? ` ${BLASTER_WHY}` : ""}`;
    };
    const outcome = fateOf(hit, doomed, died);
    const tail = tailFor([]);
    const push = (p: PlayerInfo, name: string, description: string) => errors.push(playerError(p, {
      ruleId: TOP1_BLASTER_RULE_ID, severity, name, description, timestamp: c.timestamp, abilityId: BLASTER, abilityName: "Blaster",
    }));
    if (!holder) {
      if (holders.length >= 2) {
        for (const p of holders) {
          // A tower owner holding a tether (from the takes) belonged in a tower.
          if (num.get(p) === rd.r && holdsAt(p, LOOPER, rd.t - 300) && !soaked.has(p) && !towerFailed) {
            push(p, "In a Tether, Not a Tower", `Round ${rd.r}: In Line ${rd.r} with Looper, took a Blaster tether instead of a tower.${tail}`);
            continue;
          }
          push(p, HOLDERS_TOGETHER_NAME, `Round ${rd.r}: holders ${namesOf(holders)} stood in each other's Blaster${hit.length > holders.length ? `, also hitting ${namesOf(hit.filter((x) => !holders.includes(x)))}` : ""}.${outcome ? ` ${outcome}.` : ""}`);
        }
      } else {
        // Nobody of the round's tether number: the soakers in their towers
        // are where they belong (A48 +47.1).
        const named = hit.filter((p) => !soaked.has(p));
        for (const p of named) push(p, "Blaster Hit Several", `Round ${rd.r}: a Blaster hit ${namesOf(hit)}, none of them In Line ${h}; whose tether it was is unknown.${tailFor(hit)}`);
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
    let blamed = rest.some((p) => soaked.has(p)) || rest.length >= 2 ? [holder] : [holder, rest[0]];
    let why = blamed.length > 1 ? "; either could have moved" : "";
    if (blamed.length === 2 && cards) {
      const hb = bearingOf(b, holder), vb = bearingOf(b, rest[0]);
      if (hb !== undefined && Math.min(...cards.free.map((f) => offCardinal(hb, f))) <= HOLDER_SPOT_DEG) {
        blamed = [rest[0]];
        why = `; the holder was on a free cardinal, so ${rest[0].name} wasn't waiting by a tower`;
      } else if (vb !== undefined && Math.min(...cards.towers.map((f) => offCardinal(vb, f))) <= WAITER_SPOT_DEG) {
        blamed = [holder];
        why = `; ${rest[0].name} was waiting by a tower, the holder wasn't on a free cardinal`;
      }
    }
    // A placed verdict or a Blaster in a tower already says the rule; skip
    // the generic tail.
    const placed = (blamed.length === 1 && why !== "") || rest.some((x) => soaked.has(x));
    for (const p of blamed) {
      push(p, p === holder ? "Blaster Hit Others" : "Stood in a Blaster",
        `Round ${rd.r}: ${holder.name}'s Blaster (In Line ${h}) also hit ${namesOf(rest)}${rest.some((x) => soaked.has(x)) ? ", in a tower" : ""}${why}.${tailFor([holder, ...rest], !placed)}`);
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

// Two group members this close (centi-yalms) stood together at the line.
const GROUP_TOGETHER = 500;
const POS_WINDOW_MS = 3000;
const POS_SPAN_MS   = 6000;
const LINE_WHY = "Each group's three non-carriers share its line; two alone take a lethal share.";
const MISSILE_WHY = "The carrier drops the missile at the hitbox edge, away from everyone, then rejoins.";

type PantoSet = {
  k: number; t: number;
  lines: { c: EnemyEvent; hit: PlayerInfo[] }[];
  missiles: { c: EnemyEvent; hit: PlayerInfo[] }[];
};
type PantoRead = { num: Map<PlayerInfo, number>; sets: PantoSet[]; groups?: PlayerInfo[][] };

/** Pantokrator's In Line numbers, its four missile/line sets and the two groups (when the lines show them). */
function pantokratorSets(players: PlayerInfo[], life: Life, casts: EnemyEvent[], end: number): PantoRead | undefined {
  const panto = castsOf(casts, PANTOKRATOR, end)[0];
  if (!panto) return undefined;
  const num = numbersIn(players, panto.timestamp, panto.timestamp + 10_000);
  const sets = clusterByGap(castsOf(casts, [MISSILE, LINE], end), (c) => c.timestamp, ROUND_GAP_MS).slice(0, 4).map((g, k) => ({
    k: k + 1, t: g[0].timestamp,
    lines: g.filter((c) => c.abilityId === LINE).map((c) => ({ c, hit: instanceHits(players, life, c).map((x) => x.p) })),
    missiles: g.filter((c) => c.abilityId === MISSILE).map((c) => ({ c, hit: instanceHits(players, life, c).map((x) => x.p) })),
  }));
  return { num, sets, groups: lineGroups(players, sets.map((s) => ({ lines: s.lines.map((l) => l.hit) }))) };
}

/**
 * The pull's Pantokrator as names, for the cross-pull conga
 * (pantokrator-conga.ts): each player's In Line number, the two groups
 * when the lines show them, and per set who stood in each line.
 */
export function readPantokrator(players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[]): {
  num: Map<string, number>; groups?: string[][]; sets: { t: number; lines: string[][] }[];
} | undefined {
  if (!enemyCasts.some((c) => c.abilityId === PROGRAM_LOOP)) return undefined;
  const p2 = phase1End(enemyCasts);
  const life = buildLife(players, deathEvents.filter((d) => d.timestamp <= p2));
  const read = pantokratorSets(players, life, enemyCasts, p2);
  if (!read) return undefined;
  return {
    num: new Map([...read.num].map(([p, n]) => [p.name, n])),
    groups: read.groups?.map((g) => g.map((p) => p.name)),
    sets: read.sets.map((s) => ({ t: s.t, lines: s.lines.map((l) => l.hit.map((p) => p.name)) })),
  };
}

/** The error both Blaster holders of one round get (pantokrator-conga.ts narrows it to one). */
export const HOLDERS_TOGETHER_NAME = "Tether Holders Together";

/**
 * The pull's Program Loop holds as names, for the cross-pull holder
 * priority (pantokrator-conga.ts): per round, the free cardinals and where
 * each of the round's In Line holders stood when their Blaster went off.
 * `clean`: each Blaster hit only its own holder, all eight alive.
 */
export function readProgramLoop(players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[]): {
  t: number; free: number[]; holders: { name: string; bearing: number }[]; clean: boolean;
}[] | undefined {
  const loop = castsOf(enemyCasts, PROGRAM_LOOP, Infinity)[0];
  if (!loop) return undefined;
  const p2 = phase1End(enemyCasts);
  const life = buildLife(players, deathEvents.filter((d) => d.timestamp <= p2));
  const num = numbersIn(players, loop.timestamp, loop.timestamp + 10_000);
  return loopRounds(enemyCasts, p2).flatMap((rd) => {
    const cards = roundCardinals(players, life, rd);
    if (!cards) return [];
    const h = ((rd.r + 1) % 4) + 1;
    const blasts = rd.casts.filter((c) => c.abilityId === BLASTER).map((c) => instanceHits(players, life, c));
    const holders = uniq(blasts.flat().filter((x) => num.get(x.p) === h && x.e.x !== undefined && x.e.y !== undefined).map((x) => x.p))
      .map((p) => {
        const e = blasts.flat().find((x) => x.p === p)!.e;
        return { name: p.name, bearing: compassOf(e.x!, e.y!) };
      });
    const clean = allAlive(players, life, rd.t - 500) && blasts.length === 2 && blasts.every((b) => b.length === 1 && num.get(b[0].p) === h);
    return [{ t: rd.t, free: cards.free, holders, clean }];
  });
}

/** Both holders on one tether, the other left behind (pantokrator-conga.ts picks who by the conga). */
export const TOOK_ANOTHERS_NAME = "Took Another's Tether";
export const STAYED_PUT = "stayed put";

/** The error both players of a same-number pair get (pantokrator-conga.ts narrows it to one). */
export const SAME_SIDE_NAME = "Same Number, Same Side";

function detectPantokrator(players: PlayerInfo[], life: Life, deaths: DeathEvent[], casts: EnemyEvent[], end: number): PullError[] {
  const read = pantokratorSets(players, life, casts, end);
  if (!read) return [];
  const { num, sets, groups } = read;
  const errors: PullError[] = [];
  // A group holding both players of a number: each group needs one of each,
  // so one of the pair didn't flex to the other side and neither group can
  // resolve its lines (user, 2026-10-23, 2qgaAkxVypGWv9CN Pull 3 1:21.4:
  // both In Line 1 and both In Line 4 on one side, "not resolvable").
  // pantokrator-conga.ts keeps the one who belonged on the other side.
  const doubled = num.size === 8 && sets.length ? (groups ?? []).flatMap((g) =>
    [1, 2, 3, 4].map((k) => g.filter((p) => num.get(p) === k)).filter((pair) => pair.length === 2)) : [];
  if (doubled.length) {
    const t = sets[0].t;
    for (const pair of doubled) {
      for (const p of pair) {
        const other = pair.find((x) => x !== p)!;
        errors.push(playerError(p, {
          ruleId: TOP1_LINE_RULE_ID, severity: "Major", name: SAME_SIDE_NAME,
          description: `Pantokrator: In Line ${num.get(p)} like ${other.name}, and both joined one group, so neither group had one of each number. One should have flexed; the log can't say which.`,
          timestamp: t, abilityId: LINE, abilityName: "Condensed Wave Cannon Kyrios",
        }));
      }
    }
    errors.push(raidMarker(TOP1_LINE_RULE_ID, "Pantokrator Groups Broken",
      `Both players of In Line ${uniq(doubled.map((pair) => num.get(pair[0]))).join(" and ")} ended up in one group, so the groups couldn't share lines or place missiles; treated as the cutoff point.`,
      t, LINE, "Condensed Wave Cannon Kyrios"));
  }
  for (const s of sets) {
    const inLine = (p: PlayerInfo) => s.lines.some((l) => l.hit.includes(p));
    const carriers = players.filter((p) => num.get(p) === s.k);

    // A dead carrier's missile goes off on someone else, sometimes the other
    // carrier (hjgk42MDf81arFVY Pull 47 1:33.4: both cast at the DRK): one
    // error per carrier and set.
    const named = new Set<PlayerInfo>();
    for (const m of s.missiles) {
      const carrier = m.hit.find((p) => p.name === m.c.target) ?? carriers.find((p) => m.hit.includes(p));
      if (!carrier || !life.alive(carrier, s.t - 500) || named.has(carrier)) continue;
      named.add(carrier);
      const others = m.hit.filter((p) => p !== carrier);
      const stayed = inLine(carrier);
      // Still in the line stack with the missile: a share of the line plus
      // the missile under Magic Vulnerability Up (A100 +1:21.5, died).
      if (!others.length) {
        if (!stayed) continue;
        const died = diedOf(carrier, life, deaths, s.t);
        errors.push(playerError(carrier, {
          ruleId: TOP1_MISSILE_RULE_ID, severity: died ? "Major" : "Minor", name: "Missile in the Stack",
          description: `Set ${s.k}: stayed in a line stack while their missile (In Line ${s.k}) went off, taking both${died ? " and dying" : ""}. ${MISSILE_WHY}`,
          timestamp: s.t, abilityId: MISSILE, abilityName: "Guided Missile Kyrios",
        }));
        continue;
      }
      const died = m.hit.filter((p) => diedOf(p, life, deaths, s.t) || deaths.some((d) => d.player === p.name && !d.killingAbilityGameId && d.timestamp > s.t && d.timestamp - s.t <= KNOCK_DEATH_MS));
      const blamed = stayed || others.length >= 2 ? [carrier] : [carrier, ...others];
      for (const p of blamed) {
        errors.push(playerError(p, {
          ruleId: TOP1_MISSILE_RULE_ID, severity: died.length ? "Major" : "Minor", name: p === carrier ? "Missile on Others" : "Stood by a Missile",
          description: `Set ${s.k}: ${carrier.name}'s missile (In Line ${s.k}) also hit ${namesOf(others)}${stayed ? "; the carrier was still in the line stack" : ""}${blamed.length > 1 ? "; either could have moved" : ""}.${died.length ? ` ${fateOf([carrier, ...others], [], died)}.` : ""} ${MISSILE_WHY}`,
          timestamp: s.t, abilityId: MISSILE, abilityName: "Guided Missile Kyrios",
        }));
      }
    }

    // Lines: with everyone alive (a death leaves a group short through no
    // one's fault at the line), and groups of one of each number.
    if (doubled.length || !allAlive(players, life, s.t - 500)) continue;
    const lineErrors: PullError[] = [];
    const targets = players.filter((p) => p.debuffs.some((e) => LINE_MARKS.includes(e.abilityId) && e.debuffStatus === "removed" && Math.abs(e.timestamp - s.t) <= 1000));
    // Both lines aim at the set's two players of one In Line number, one per
    // group. Both of them inside one line means they stood on the same side:
    // one should have crossed to the other group (a player the user asked,
    // 2026-10-14, A46 +1:21.5; also A55). The rest of that stack is fallout.
    const paired = targets.length === 2 && s.lines.some((l) => targets.every((p) => l.hit.includes(p)));
    if (paired) {
      const hit = uniq(s.lines.flatMap((l) => l.hit));
      const died = hit.filter((p) => life.diedFrom(p, s.t));
      for (const p of targets) {
        const other = targets.find((x) => x !== p)!;
        lineErrors.push(playerError(p, {
          ruleId: TOP1_LINE_RULE_ID, severity: died.length ? "Major" : "Minor", name: SAME_SIDE_NAME,
          description: `Set ${s.k}: In Line ${num.get(p) ?? "?"} like ${other.name} and on the same side, so both lines hit one stack (${namesOf(hit)})${died.length ? `; ${died.length === hit.length ? "all" : namesOf(died)} died` : ""}. One should have crossed; the log can't say which.`,
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
      // The aimed player alone in their line while the rest of their group
      // stood together in no line: the aimed player left the group and the
      // others are excused (user, 2026-10-24, LG64YVQy2KZbtpN8 Pull 37
      // 1:21.1: the MNK went to the wrong side; the GNB and RDM 1.9y apart).
      if (target && own.hit.length === 1 && own.hit[0] === target && missing.length === 2 && missing.every((p) => !inLine(p))) {
        const [a, b] = missing.map((p) => interpolatePlayerPosition(p, s.t, { windowMs: POS_WINDOW_MS, maxSpanMs: POS_SPAN_MS }));
        if (a && b && Math.hypot(a.x - b.x, a.y - b.y) <= GROUP_TOGETHER) {
          lineErrors.push(playerError(target, {
            ruleId: TOP1_LINE_RULE_ID, severity, name: "Left the Group",
            description: `Set ${s.k}: took their line away from ${namesOf(missing)}, who stood together, so they took it alone${died.length ? " and died" : ""}. ${LINE_WHY}`,
            timestamp: s.t, abilityId: LINE, abilityName: "Condensed Wave Cannon Kyrios",
          }));
          continue;
        }
      }
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

  // A player dead at any set but the fourth leaves their group short for
  // the rest: the lines then kill the two left sharing them, or a dead
  // carrier's missile lands on someone (user, 2026-10-28, hjgk42MDf81arFVY
  // Pull 2 1:25.8: "it depends on what set it's on. If it's on the fourth
  // one, it's recoverable"). Gated on the outcome: a later set killed
  // someone. Raised in time, or the short sets killing nobody, the raid
  // carried on (Pulls 26 and 45 there, LG64YVQy2KZbtpN8 Pulls 26, 42 and 46
  // all reached P2). The death is the cutoff. Not in a P1 clear
  // (LG64YVQy2KZbtpN8 Pull 42: the RDM missed sets 3-4, the set-4 line
  // killed the SGE, both were raised and P1 cleared).
  const pantoT = castsOf(casts, PANTOKRATOR, end)[0]?.timestamp;
  const present = pantoT === undefined ? [] : players.filter((p) => life.alive(p, pantoT));
  const cleared = casts.some((c) => P2_CASTS.includes(c.abilityId));
  if (present.length === players.length && !doubled.length && !cleared) {
    for (const [k, s] of sets.slice(0, 3).entries()) {
      const missing = present.filter((p) => !life.alive(p, s.t - 500));
      if (!missing.length) continue;
      const victims = uniq(sets.slice(k).flatMap((x) => [...x.lines, ...x.missiles]
        .flatMap((l) => l.hit.filter((p) => !missing.includes(p) && life.diedFrom(p, x.t)))));
      if (victims.length) {
        const fatal = Math.min(...missing.map((p) => fatalHitT(p, life, s.t)));
        errors.push(raidMarker(TOP1_LINE_RULE_ID, "Pantokrator One Short",
          `${namesOf(missing)} died before set ${s.k}, so their group was short for the rest of Pantokrator; ${namesOf(victims)} died to the later sets. A set short before the fourth is unrecoverable; treated as the cutoff.`,
          fatal + RAID_MARKER_SORT_OFFSET_MS, LINE, "Condensed Wave Cannon Kyrios"));
      }
      break;
    }
  }
  return errors;
}

/** When the hit that killed `p` (dead at `t`) landed: their last real hit before that death, else the death minus the log's lag. */
function fatalHitT(p: PlayerInfo, life: Life, t: number): number {
  const w = life.outIntervals.find((x) => x.p === p && t >= x.start && t < x.end);
  const deathT = w ? w.start + 100 + DEATH_EVENT_LAG_MS : t;
  const hit = p.damageTaken.filter((e) => !bodyHit(e) && e.timestamp <= deathT && deathT - e.timestamp <= DEATH_EVENT_LAG_MS + 1500)
    .sort((a, b) => b.timestamp - a.timestamp)[0];
  return hit?.timestamp ?? deathT - DEATH_EVENT_LAG_MS;
}

// ── the final volley: Diffuse and Wave Cannon Kyrios ────────────────────────

const DIFFUSE_WHY = "The two farthest from Omega take all five cones: tanks, farthest out under invuln.";

/**
 * Diffuse Wave Cannon Kyrios on a non-tank with both tanks alive: the
 * non-tank farthest from Omega among those hit baited it, and a tank no cone
 * reached wasn't farthest. One error per player for the whole volley.
 * A tank the cones killed had no invuln up (2qgaAkxVypGWv9CN Pull 51
 * 1:48.6: the DRK, who takes all five alone with Living Dead at
 * 1:43-1:47 in every other pull, cast none and died to the first pair;
 * user, 2026-10-23: "He should have hit invuln"). Raid when the cones then
 * killed 3+ others (Pull 51: six).
 */
function detectDiffuse(players: PlayerInfo[], life: Life, deaths: DeathEvent[], casts: EnemyEvent[], end: number): PullError[] {
  const tanks = players.filter(isTank);
  if (tanks.length !== 2) return [];
  const errors: PullError[] = [];
  const volleys = clusterByGap(castsOf(casts, DIFFUSE, end), (c) => c.timestamp, 1000);
  for (const v of volleys) {
    const t = v[0].timestamp;
    if (!tanks.every((p) => life.alive(p, t - 500))) break;
    const hits = v.flatMap((c) => instanceHits(players, life, c, 1000));
    const fallen = uniq(hits.filter((x) => isTank(x.p) && life.diedFrom(x.p, t)).map((x) => x.p));
    if (fallen.length) {
      // Everyone else the remaining volleys killed.
      const later = volleys.filter((w) => w[0].timestamp > t).flatMap((w) => w.flatMap((c) => instanceHits(players, life, c, 1000)));
      const victims = uniq(later.filter((x) => !fallen.includes(x.p) && life.diedFrom(x.p, x.e.timestamp)).map((x) => x.p));
      for (const p of fallen) {
        // An invuln pressed just before the cone didn't apply in time
        // (user, 2026-10-28, hjgk42MDf81arFVY Pull 1 1:47.6: the GNB's
        // Superbolide 0.5s before the first cone landed; Pull 8 the same;
        // 0.9s before in the clean pulls, which took 0).
        const firstHit = hits.filter((x) => x.p === p).reduce((m, x) => Math.min(m, x.e.timestamp), Infinity);
        const late = p.casts.filter((c) => INVULNS[c.abilityId] && c.timestamp <= firstHit && firstHit - c.timestamp <= 3000).pop();
        const why = late
          ? `${INVULNS[late.abilityId]} went up ${((firstHit - late.timestamp) / 1000).toFixed(1)}s before the first cone landed, too late to apply.`
          : "Died to Diffuse Wave Cannon Kyrios with no invuln up.";
        errors.push(playerError(p, {
          ruleId: TOP1_DIFFUSE_RULE_ID, severity: victims.length >= 3 ? "Raid" : "Major", name: "Tank Cones Without Invuln",
          description: `${why}${victims.length ? ` The later cones went to the party and killed ${namesOf(victims)}.` : ""}`,
          timestamp: t, abilityId: DIFFUSE, abilityName: "Diffuse Wave Cannon Kyrios",
        }));
      }
      break;
    }
    const nonTanks = uniq(hits.filter((x) => !isTank(x.p)));
    if (!nonTanks.length) continue;
    const ox = v[0].x, oy = v[0].y;
    const dist = (e: PlayerEvent) => (ox === undefined || oy === undefined || e.x === undefined || e.y === undefined ? -1 : Math.hypot(e.x - ox, e.y - oy));
    const far = [...nonTanks].sort((a, b) => dist(b.e) - dist(a.e))[0];
    const idle = tanks.filter((p) => !hits.some((x) => x.p === p));
    const caught = uniq(nonTanks.map((x) => x.p));
    const died = caught.filter((p) => life.diedFrom(p, t));
    const severity = died.length ? "Major" : "Minor";
    const tail = `${caught.length > 1 ? ` It hit ${namesOf(caught)}${died.length ? `; ${died.length === caught.length ? "all" : namesOf(died)} died` : ""}.` : died.length ? ` ${namesOf(died)} died.` : ""} ${DIFFUSE_WHY}`;
    errors.push(playerError(far.p, {
      ruleId: TOP1_DIFFUSE_RULE_ID, severity, name: "Baited a Tank Cone",
      description: `Stood farther from Omega than a tank${dist(far.e) >= 0 ? ` (~${yd(dist(far.e))} yalms)` : ""}, so Diffuse Wave Cannon Kyrios went to them.${tail}`,
      timestamp: t, abilityId: DIFFUSE, abilityName: "Diffuse Wave Cannon Kyrios",
    }));
    for (const p of idle) {
      errors.push(playerError(p, {
        ruleId: TOP1_DIFFUSE_RULE_ID, severity, name: "Didn't Bait the Tank Cone",
        description: `No Diffuse Wave Cannon Kyrios cone reached them: a non-tank was farther out, so it went to ${far.p.name}.${tail}`,
        timestamp: t, abilityId: DIFFUSE, abilityName: "Diffuse Wave Cannon Kyrios",
      }));
    }
  }
  return firstPer(errors, (e) => `${e.player}`);
}

const WAVE_WHY = "Marked players spread to distinct angles inside the hitbox; each line leaves Magic Vulnerability Up.";

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
          description: `One Wave Cannon Kyrios line hit ${namesOf(hit)}${c.target ? ` (aimed at ${c.target})` : ""}${died.length ? `; ${namesOf(died)} died` : ""}. Whoever stood on another's line is at fault. ${WAVE_WHY}`,
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
    // Still holding Damage Down at the fatal moment: a deliberate death to
    // drop it, raised after (user, 2026-10-24, LG64YVQy2KZbtpN8 Pull 28
    // 1:57.8: the GNB, 20.2s after the Flame Thrower; "the correct thing").
    if (holdsAt(p, DAMAGE_DOWN, d.timestamp - DEATH_EVENT_LAG_MS - 500)) continue;
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
  players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], occurrences?: ReportedOccurrence[], tethers: Tether[] = [],
): PullError[] {
  if (!enemyCasts.some((c) => c.abilityId === PROGRAM_LOOP)) return [];
  const p2 = phase1End(enemyCasts);
  const deaths = deathEvents.filter((d) => d.timestamp <= p2);
  const life = buildLife(players, deaths);
  const lastEvent = Math.max(0, ...players.flatMap((p) => [...p.damageTaken, ...p.casts].map((e) => e.timestamp)), ...deathEvents.map((d) => d.timestamp));
  const end = Math.min(p2, lastEvent);
  const called = calledWipeDeaths(players, deaths, p2 === Infinity ? lastEvent : Infinity);
  // Three or more silent deaths before the first towers: a reset to get a
  // cooldown back, not a pull (user: 2qgaAkxVypGWv9CN Pull 64;
  // LG64YVQy2KZbtpN8 Pull 20, "someone burned a cooldown"; Pulls 21 and 32).
  const firstRound = loopRounds(enemyCasts, end)[0]?.t ?? Infinity;
  if (deaths.filter((d) => !d.killingAbilityGameId && d.timestamp - DEATH_EVENT_LAG_MS < firstRound).length >= CALLED_WIPE_COUNT) return [];

  const errors = [
    ...detectAvoidable(players, life, end),
    ...detectProgramLoop(players, life, deaths, enemyCasts, end, occurrences, tethers),
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
