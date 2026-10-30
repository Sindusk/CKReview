// lib/mechanics/ffxiv/trials/doomtrain.ts
//
// ── DIGEST (read first; detail in the sections it names) ──
// What: the Doomtrain trial (8 players, six cars, orb phase after car 3).
//   Per-pull errors from avoidable hits, plasma/orb/arcane/plummet
//   overlaps, Lightning Burst, Aetherial Ray, strandings, falls and
//   cutoffs. Entry point detectDoomtrainErrors. No Damage Down exists in
//   this fight, so a survived avoidable is Minor, a fatal one Major.
// Rules (exposure = everyone except those marked targeted):
//   ffxiv-dt-avoidable  Minor; Major when it killed.
//   ffxiv-dt-plasma     stored Plasma overlaps, doubled / unpaired players.
//   ffxiv-dt-orb-spread Aetherochar overlaps.
//   ffxiv-dt-orb-stack  Aetherosote doubled / missed (targeted: non-tanks).
//   ffxiv-dt-cone       non-tank hit by Aetherial Ray, both tanks healthy.
//   ffxiv-dt-arcane     Hyperconductive doubled / missed.
//   ffxiv-dt-plummet    player under two Plummets.
//   ffxiv-dt-buster     non-tank in another's Lightning Burst.
//   ffxiv-dt-enmity     buster on a non-tank, both tanks healthy; player-less Minor.
//   ffxiv-dt-stranded   left on the Derailed car (Major); 4+ = Raid.
//   ffxiv-dt-fall       falls (Major); Walking Dead running out (player-less).
// Cutoffs (Raid): ffxiv-dt-orb-timeout, ffxiv-dt-mass-deaths (4+ non-raidwide
//   deaths in 2.5s, pull over within 60s), ffxiv-dt-enrage (final Derail,
//   ~11:26), ffxiv-dt-called-wipe, ffxiv-dt-collapse (5 dead, over in 45s).
//   All 24 wipes in the two reports have one.
// Key thresholds: orb must die by ~4:15 or Runaway Train returns for
//   1.47M-3.22M per hit (clean 17.8k-189.7k); silent deaths 4.5s after a
//   Derail = stranded, 2.0-2.4s after the raised-platform aura = fall;
//   shares/spreads skip resolutions with 3+ dead; Burst and Ray rules skip
//   while a tank is dead or raised within 30s.
// Assumptions: Arcane 4:4 (tanks+melee / healers+ranged); Aetherosote 3+3
//   non-tanks; Plummet is a split stack hitting all 8 per set.
// Not built: Siege failures, wrong height as such, tank-side buster fault
//   (no enmity data), cone aim.
// Sections: "VERIFIED AGAINST LOGS (2026-10-14)" (clock, IDs, findings,
//   cutoffs); "RULES IMPLEMENTED"; "GUIDE-DERIVED MODEL: DOOMTRAIN";
//   "SOURCES AND PATCH SENSITIVITY"; "VOCABULARY, SEVERITY AND OBSERVABILITY";
//   "SHAPE, CLOCK AND RESOURCES"; "ASSIGNMENTS AND STRATEGY VARIANCE";
//   per-mechanic models from "STORED PLASMA: DEAD MAN'S OVERDRAUGHT [BM, DATA]"
//   to "PSYCHOKINESIS / PLUMMET [BM, IV]"; "WHAT ENDS A PULL";
//   "OPEN QUESTIONS FOR LOG VERIFICATION" (largest).
// Open items: empty-Siege penalty unverified; see "OPEN QUESTIONS FOR LOG VERIFICATION".
// ── END DIGEST ──
//
// -- VERIFIED AGAINST LOGS (2026-10-14) --
// A = r4qDkR9btJCXnKWd: 19 wipes, no kill, early progression (longest
//     10:15). Roster PLD/GNB, DRG, BLM/BRD/DNC, SGE/AST.
// B = rgTafHJ9MN47m3Vy: 10 pulls, kills B4 B5 B6 B9 B10 (9:33-10:27),
//     wipes B1-B3 B7 B8. Roster DRK/GNB, MNK/RPR, MCH/RDM, SGE/AST.
// Both are the user's static's, too old for anyone to remember the plan and
// with no VOD: everything below comes from the logs. Plans were inferred
// from B's clean kills only where noted.
//
// Clock (B5, every pull within ~1s up to the orb; after it, shifted by when
// the orb died). Car 1: stores 0:13/0:32, Express 0:21, Windpipe 0:40,
// Unlimited Express 0:52. Car 2: turrets 1:10 (volleys 1:20/1:36/1:48),
// busters 1:39, Express 1:49, Unlimited 2:01. Car 3: busters 2:17, Runaway
// Train 2:30, orb (Aether, 9.36M) targetable 2:41. Return R = Runaway
// Train 45645, 19.5s after the orb dies (3:53-4:13 in every pull past it).
// Then, R-relative: Shockwave +0:13, busters +0:28, Siege +0:36, Derail
// +0:45; Car 4 Third Rail +0:56, heights +1:09, Arcane +1:18, busters
// +2:28, Siege +2:38, Derail +2:49; Car 5 Plummets +3:06/+3:21/+3:37,
// busters +3:29, Siege +3:55, Derail +4:06; Car 6 turrets +4:25, heights
// +4:37, Plummet +4:54, Windpipe +5:10, busters +5:22, Arcane +5:34. The
// last car's Derail (45710 / 45712) is the hard enrage: B3 at 11:26
// (R+7:20), all 8 dead 4.5s later, no killing blow.
//
// IDs (the model's BM candidates held except where noted):
// - Stores: 45664 = partner stacks (Hyperexplosive Plasma 45676, 4 instances
//   x2 players), 45663 = spreads (Plasma 45675, 8 cast-targeted). Each
//   store resolves at the next Express/Windpipe, as modeled.
// - Express 45670 hits all 8 (unavoidable). Windpipe 45696 hits 1-4 in
//   every kill resolution: not an error. Blastpipe 45679, Plasma Beam
//   45671-45674, Electray 45681/45682/45683/45686 (turrets), Third Rail
//   45666, Thunderous Breath 45689, Headlight 45692, Hail of Thunder 45713
//   are the avoidables; each hit gives Vulnerability Up 1001789.
// - NO DAMAGE DOWN in this fight: Magic Vulnerability Up 1002941 (~1s,
//   every shared hit) and Physical Vulnerability Up 1002940 (Plummet) are
//   the only other penalties. So a survived avoidable is Minor.
// - Lightning Burst 45715: two cast-targeted 5y busters (controller 45660).
// - Orb phase: Aetherial Ray 45693 (Ghost Train#1/#2, cast target = its
//   tank), Aetherosote 45698 (two stacks, no target), Aetherochar 45697
//   (three cast-targeted spreads). Overdraught 45639 by "Aether" = the orb.
// - Arcane Revelation 47527; Hail controllers 45656/45657/45658; stacks
//   Hyperconductive Plasma 45714 on Designated Conductor 1004719 holders.
// - Plummet 45669 is a split stack, not a spread: every mark is shared,
//   all 8 players hit in each Car 5 set in every kill.
// - 1004721 (unnamed) = on a raised platform: applied going up, removed
//   coming down.
// - Derail 45711 destroys the car just left; Derailment Siege hits 45706/
//   45707, final 45649/45703/45704/45705.
// - 45716 (unnamed) = the boss's autos.
//
// Findings:
// - Plans seen in B's kills: Arcane is the normal 4:4 (tanks + melee on the
//   tank conductor, healers + ranged on the healer conductor; Hail never
//   meant to be taken); Aetherosote 3 + 3 non-tanks; Sieges 2-3 tank-solo
//   with invulns (B5: GNB at 6:32, DRK Living Dead at 7:49).
// - Stored plasma: the overlap's second hit, under Magic Vuln, kills
//   (A1 +0:45 BLM + SGE, A5 +0:45, A8 +0:44 BLM + PLD). A partner stack
//   left alone kills its holder: A1 +0:27 the PLD joined no pair and the
//   DNC died alone (202k).
// - Lightning Burst went to a non-tank with both tanks alive in A1 +1:39
//   (DRG); FFLogs has no enmity or stance toggles (stances are set before
//   the pull), so that can't be pinned on a tank. A7 +1:39: a DRG stood in
//   the PLD's buster and died.
// - Orb deadline: the orb lives 99.9% at 2:41 and must die by ~4:15. When
//   it doesn't, Runaway Train returns at 4:15 for 1.47M-3.22M per hit
//   (A11, A17, A18: 4.1%, 14.4%, 1.8% orb HP left), and the pull ends 2-4s
//   later. Clean returns did 17.8k-189.7k.
// - Aetherial Ray hits only its tank in every kill resolution. Non-tanks
//   in a lane died (A3 +2:56 four at once, A7, A12, B7, B9 +3:12).
// - Plummet: a player under two dies to the second under Physical Vuln
//   (B6 +8:48 MCH + SGE, B9 +7:34 RPR + MCH, both kills).
// - Silent deaths: 4.5s after a Derail cast = left on the destroyed car,
//   still standing in the Siege tower (A6 +4:50.9 five at once at y ~190-
//   192 yalms, the car's front; A19 x2, B10 4:51.6). A tank's Walking Dead
//   running out looked the same (B10 8:11.2, 2.6s after Derail; checked
//   first). Five lone silent deaths came 2.0-2.4s after the raised-platform
//   aura ended: stepped off the train (A14, A19, B2, B8, B10).
// - Derailment Siege: no empty-tower penalty in either report; deaths in
//   it are shared raw damage (mitigation, not a mechanic error).
// - Third Rail en masse: A13 +5:05 six died to old-spot puddles at once.
//
// Cutoffs (all 24 wipes have one): A 8 mass deaths (A3 A4 A7 A8 A9 A10 A13
// A15), 7 collapse (A1 A2 A12 A14 A16 A17 A19), 2 orb timeout (A11 A18), 1
// called wipe (A5), 1 party stranded (A6); B 2 mass deaths (B1 B7), 2
// collapse (B2 B8), 1 enrage (B3). No wipe is unexplained.
//
// -- RULES IMPLEMENTED --
// - ffxiv-dt-avoidable: the avoidables above, per player episode. Minor;
//   Major when it killed (no Damage Down exists).
// - ffxiv-dt-plasma: Plasma spread overlaps (owner + victim), Hyperexplosive
//   Plasma doubled players and players in no pair.
// - ffxiv-dt-orb-spread: Aetherochar overlaps. ffxiv-dt-orb-stack:
//   Aetherosote doubled / missed (targeted: non-tanks).
// - ffxiv-dt-cone: a non-tank hit by Aetherial Ray, both tanks healthy
//   (targeted: non-tanks).
// - ffxiv-dt-arcane: Hyperconductive doubled / missed. Hail is avoidable.
// - ffxiv-dt-plummet: a player under two Plummets.
// - ffxiv-dt-buster: a non-tank in another player's Lightning Burst
//   (targeted: non-tanks). ffxiv-dt-enmity: a buster on a non-tank with
//   both tanks healthy, player-less Minor.
// - ffxiv-dt-stranded: left on the Derailed car (Major); 4+ = Raid.
// - ffxiv-dt-fall: falls (Major), Walking Dead running out (player-less).
// - Raid: ffxiv-dt-orb-timeout, ffxiv-dt-mass-deaths (4+ non-raidwide
//   deaths within 2.5s, pull over within 60s), ffxiv-dt-enrage,
//   ffxiv-dt-called-wipe, ffxiv-dt-collapse (5 dead, over within 45s).
// Shares and spreads skip resolutions with 3+ dead (fallout); the
// Lightning Burst and Ray rules skip while a tank is dead or raised within
// 30s (targets move). Every rule's exposure is everyone except those marked
// targeted.
// Not built: Siege tower failures (none seen), wrong height as such (the
// height hits are avoidables), tank-side buster fault (no enmity data),
// cone aim vs. party position (no cone origin; the victim is named).
//
// -- GUIDE-DERIVED MODEL: DOOMTRAIN --
// Hell on Rails (Extreme), level 100, Dawntrail patch 7.4; Extreme only.
// Research checked 2026-10-14. Comment-only input to log verification;
// no Doomtrain report analyzed, no failure observed, no detector registered.
// All LOG SIGNAL statements below are predictions, not verified events.
//
// -- SOURCES AND PATCH SENSITIVITY --
// [BM] awgil/BossMod's firsthand encounter implementation: Enums, States,
//      Ex7Doomtrain, Geometry, PushPull, Intermission, ArcaneRevelation.
//      Last encounter change 799524b33be594900dbad984ebb4d2ef8325d47a
//      (2026-09-30); game IDs/geometry/timing, NOT an FFLogs verification:
//      https://github.com/awgil/ffxiv_bossmod/tree/799524b33be594900dbad984ebb4d2ef8325d47a/BossMod.Modules/Dawntrail/Extreme/Ex7Doomtrain
// [DATA] XIVAPI Action/Status sheets checked against BM's numeric IDs:
//      https://v2.xivapi.com/api/sheet/Action/45681?fields=Name
//      https://v2.xivapi.com/api/sheet/Status/4719?fields=Name,Description
// [TL] Thaliak's encounter timeline, approximate resolution times:
//      https://thaliak.com/extremes/hell-on-rails/
// [IV] Lyra's original guide; changelog includes PF update 2025-12-29:
//      https://www.icy-veins.com/ffxiv/hell-on-rails-extreme-trial-guide
// [JP] XIV JP Raids' published macro, train-relative intermission and
//      Nukemaru/Game8 2:6 plan:
//      https://xivjpraids.com/7.0_dawntrail/extreme_trials/doomtrain/
// [NA] NAUR's current PF strategy combinations (checked on research date):
//      https://naurffxiv.com/extreme/hell-on-rails
//      Hector's original guide (description/chapters checked, not watched):
//      https://www.youtube.com/watch?v=fGGI8MM-wKM
// [SE41] Patch 7.41 (2026-01-27) fixed Runaway Train sometimes doing no
//      damage. Pre-fix missing damage need not mean a successful dodge:
//      https://na.finalfantasyxiv.com/lodestone/topics/detail/0de7befbbcefe67d1af77dcbe1bae937b916b67e/
// [SE45] Patch 7.45 (2026-03-03) improved encounter sound effects:
//      https://na.finalfantasyxiv.com/lodestone/topics/detail/534af9c97992897890b8dd90aacabb77c6f51450
// [SE5] Patch 7.5 (2026-04-28) added wipe-earned Echo: +5% per eligible
//      restart, max 25%, only after >=3 minutes fighting. Damage, HP and
//      kill-dependent timing differ from launch progression:
//      https://na.finalfantasyxiv.com/lodestone/topics/detail/07320affa7e0fcd9685afcbe54fbf55405b6d822/
// Release dates: Lodestone maintenance news 2026-01-27/03-03/04-28.
// No researched source establishes changed target counts or geometry.
//
// -- VOCABULARY, SEVERITY AND OBSERVABILITY --
// Numeric action IDs are candidates for begincast/cast AND, where labeled,
// damage events. Controller actions are not necessarily damage actions.
// Status 4719 -> candidate FFLogs player aura 1004719; that +1,000,000
// convention is provisional. NPC object IDs are not FFLogs actor IDs.
// Sources describe generic Vulnerability Up on avoidables, Magic
// Vulnerability Up on shared/spread hits, Physical Vulnerability Up on
// Plummet. They do not establish Damage Down here. Therefore a survived
// avoidable without Damage Down is Minor; causing death or the wipe is
// Major if attributable. Verified Damage Down invokes the Major exception.
// Raid is an inevitable wipe/cutoff, potentially player-less. Major names
// the ROOT CAUSE, not a clipped victim. Properly executed damage deaths
// belong to mitigation analysis. Death-driven retargeting is fallout.
// Victim x/y alone cannot establish elevation; visual markers, whistles,
// map effects and train animation may be absent from captured FFLogs data.
// BM uses unnamed status 4721 for elevation; DATA confirms its name blank.
// System Lock 2578 prevents teleport reuse; Invincibility 1570 is protective.
// Neither is a penalty. Aura expiry/death is not evidence of correct play.
//
// -- SHAPE, CLOCK AND RESOURCES --
// Six cars: movement tutorial -> turrets -> orb intermission/first tower
// -> elevated platforms/Arcane -> crate maze/Plummet -> combined finale.
// Boss is a wall boss at the front, omnidirectional [IV]. Directions below
// face the boss: front=N, rear=S, left=W, right=E, irrespective of camera.
// BM car centers: (100,100/150/200/250/300/350); each ~20y wide x29.2y
// long, four 5y columns. Intermission center=(-400,-400), radius ~14.5y.
// Fences/crates obstruct movement; solid crates also block turret beams.
// All car transitions are scripted except the orb's death-ended section.
// No boss-HP push, interrupt assignment, dispel, revival or pickup system.
// Only duty resource: Doom-engine Power rises while the orb lives, 100 =
// failed DPS check. BM models ~75s from orb targetability to its deadline;
// exact gain rate/reset field unknown. No comparable car-phase resource.
// [TL] Reference pull clock, mm:ss, resolutions unless noted:
//   Car1: stores 0:12/0:31, movement 0:20/0:40, plasma 0:26/0:45,
//   Unlimited 0:52; Car2 targetable 0:58, stores 1:04/1:31, turrets
//   1:20, busters 1:38, movement 1:21/1:48, plasma 1:25/1:53,
//   Unlimited 2:01; Car3 targetable 2:07, busters 2:16,
//   Runaway entry 2:29, Overdraught 2:32, orb targetable 2:40.
//   Orb volleys ~2:54/3:11/3:24/3:39; return Runaway R=4:04 in TL.
//   Shockwave 4:23, busters 4:32, tower 4:41/4:42/4:44, Derail 4:49.
//   Car4: Third Rail 5:04/6:24, heights 5:15/5:17 and 6:15/6:18,
//   Arcane 5:37/5:51/6:02, busters 6:33, tower 6:43..6:47, Derail 6:53.
//   Car5: Plummet 7:12/7:27/7:43, Third Rail 7:17/7:48,
//   busters 7:33, tower 8:00..8:05, Derail 8:11.
//   Car6: store 8:25, turrets 8:40/9:13, heights 8:43/8:46,
//   Plummet 8:59, Third Rail 9:04, movement 9:14, plasma 9:19,
//   busters 9:27, store 9:34, Arcane 9:53/10:04, Third Rail 10:11,
//   movement 10:21, plasma 10:26, heights 10:35/10:37, busters 10:46,
//   Third Rail 10:52, tower 11:03..11:08, enrage Derail 11:24.
// After orb death, BM runs a separate scripted sequence; these absolute
// times are a reference, not a fixed enrage for every pull. Shift the
// post-intermission clock with R; reference enrage is roughly R+440s.
//
// -- ASSIGNMENTS AND STRATEGY VARIANCE --
// No user/static plan supplied. Community examples are not assignments.
// [JP] Train-facing spread rows: MT/OT, M1/M2, H1/H2, R1/R2 (W/E),
// from front to rear. Partners MT+M1, OT+M2, H1+R1, H2+R2; light parties
// G1=MT/H1/M1/R1, G2=OT/H2/M2/R2. Actual roster-to-slot mapping unknown.
// [IV] Spread spots are loose and change with car geometry. One macro's
// exact rows are not a universal rule or a clockspot plan for a wall boss.
// Intermission standard [JP]: rotate with the inner/ground train, treated
// as relative N: MT NW, OT NE, H1 N, M1 W, M2 E, H2 S, R1 SW, R2 SE.
// Stacks: H1+M1+M2 and H2+R1+R2; tanks remain outside both stacks.
// Static intermission [IV/NA]: healers/melees keep a box around the orb;
// tanks adjust sideways to the ground train, ranged near/far for spreads.
// DPS join their healer for stacks. Different intermission maps are valid.
// Normal Arcane: tanks+melees share tank mark, healers+ranged healer mark.
// 2:6 Arcane [JP]: tanks NW, other six NE, intentionally accept Hail;
// rotate party mitigation, third first-Arcane hit uses tank LB. MT invulns
// tower #2, OT tower #3. Planned Hail hits/vuln stacks/solo towers are normal.
// [NA] Lists static intermission+normal Arcane and normal intermission+
// Arcane cheese; these are independent choices, not mandatory pairings.
//
// -- STORED PLASMA: DEAD MAN'S OVERDRAUGHT [BM, DATA] --
// Candidates: store casts spread 45663 / pairs 45664 (4s); boss aura
// 4720 / FFLogs 1004720; damage Plasma 45675, Hyperexplosive Plasma 45676.
// What happens: eight visible orbs store eight 5y personal circles; four
// store four 5y split partner circles on a role category. Resolution follows
// Express/Windpipe, not the store cast; each car's second store is opposite.
// BM predicts supports as stack targets; guides allow supports OR DPS.
// Correct play: remember the stored mode, then separate or use partners.
// Failure: overlap -> LOG SIGNAL: extra Plasma/Hyperexplosive hits on one
// player, Magic Vulnerability Up (2941 / 1002941), possibly lethal second
// hit; FAULT: misplaced carrier/partner with assignment evidence;
// CONSEQUENCE: Minor if survived, Major if lethal and attributable.
// Failure: lone partner -> LOG SIGNAL: fewer recipients, elevated split
// damage; FAULT: missing live partner vs misplaced holder needs positions;
// CONSEQUENCE: same. Removal: stored boss aura consumed by resolution;
// no player bomb aura or death-triggered early explosion established.
// Not errors: each own spread or correct shared hit and its Magic Vuln.
//
// -- EXPRESS / WINDPIPE / BLASTPIPE / PLASMA BEAM [BM] --
// Candidates: Express cast/damage 45670 (6s); Windpipe controller 45677
// (6s), helper cast/damage 45696 (7s); Blastpipe controller 45678,
// helper cast/damage 45679 (3s); Beam cast/damage 45671..45674 (1s).
// What happens: ~30y rear knockback or front draw-in, stopping at obstacles.
// Windpipe's follow-up covers front 10y x20y (first two rows). Express
// signals beam each column at low/high elevation, width 5y; beam lengths
// vary with obstacles. Movement damage itself is unavoidable.
// Correct play: use fences/crates or knockback immunity; dodge ground
// beams/front Blastpipe; then resolve stored plasma. Safe elevation matters.
// Failure: bad movement/dodge -> LOG SIGNAL: Blastpipe/Beam damage + generic
// Vulnerability Up, or fall death potentially without ability; FAULT: mover
// if evidence excludes forced displacement by another mistake;
// CONSEQUENCE: Minor survived, Major attributable death. Removal: instant
// hits, no cleanse objective. Not errors: movement damage or immunity use.
//
// -- TURRET CROSSING / ELECTRAY [BM, DATA] --
// Candidates: controller 45628 (3s); Electray cast/damage 45681/45682/
// 45683/45686 (7s). Actual hit name is Electray, not Turret Crossing.
// What happens: side Kinematic Turrets (OID 0x4A39) fire 5y-wide lanes;
// Car2 has three volleys of five helper shots per BM. Length variants stop
// at solid crates; fences do not block beams. Car6 mixes high/low lasers
// and removes crates during the second volley, exposing previous shelter.
// Correct play: use intact crates/appropriate height; leave lost shelter.
// Failure: exposed -> LOG SIGNAL: Electray damage + Vulnerability Up;
// FAULT: hit player if avoidable; CONSEQUENCE: Minor, Major if lethal.
// Removal: each firing ends that telegraph; no killable turret objective
// or turret-death explosion established. Not errors: turret spawn/casts.
//
// -- LIGHTNING BURST [BM, IV] --
// Candidates: controller cast 45660 (5s), helper cast/damage 45715 (0.5s).
// What happens: two 5y magic buster circles on top TWO enmity players.
// Correct play: tanks hold top enmity, separate from each other/party,
// mitigate; no swap debuff or required tank stack established.
// Failure: clip/overlap -> LOG SIGNAL: unintended recipients or two hits
// on one player; FAULT: misplaced tank/bystander requires positional proof;
// CONSEQUENCE: Minor survived, Major if lethal. Wrong-enmity target -> same
// only with tank-duty evidence, never automatically blame the victim.
// Removal: instant resolution. Not errors: intended busters or their
// healing/mitigation deaths; targets redistributed after deaths are fallout.
//
// -- RUNAWAY TRAIN / ORB / AETHERIAL RAY / AETHEROSOTE / AETHEROCHAR --
// Candidates [BM]: entry cast Runaway Train 45638 (5s), transfer Overdraught
// 45639; return visual 45644, physical raid damage 45645; Ray damage 45693,
// Aetherosote damage 45698, Aetherochar damage 45697. Orb OID 0x4A3A;
// ground Ghost Train 0x4B81, outer Intermission Train 0x4B7F.
// What happens: ONE targetable central orb; TWO untargetable trains orbit.
// Inner train stops and aims two 50y, 35-degree full-angle cones at tanks.
// Ray ~9.7s after horn [BM]; cycles vary ~1s with train travel. Two outer
// smoke puffs mean two 6y healer stacks, normally three per stack; three
// puffs mean 6y spreads on THREE random non-tanks, so all six separate.
// Correct play: kill orb before gauge 100; tanks aim cones along opposite
// flanks from ground train, six others use space between them and execute
// the selected spread/stack map. Train location, not boss facing, sets cones.
// Failure: cone clips -> LOG SIGNAL: Ray hits non-targets; FAULT: tank aim
// vs party position needs cone origin/assignment; CONSEQUENCE: Minor/Major.
// Failure: double spread/stack or missed sharing -> LOG SIGNAL: extra hits
// under Magic Vuln / excessive split damage; FAULT: misplaced living player
// if established; CONSEQUENCE: Minor/Major. No separate penalty name found.
// Failure: live orb at deadline -> LOG SIGNAL: failed Runaway Train raid
// damage/mass deaths after unfinished orb; FAULT: collective; CONSEQUENCE:
// Raid. Orb death ends loop; return damage follows ~19.5s later in BM.
// Removal: no revival/on-death explosion described; successful return still
// damages everyone. Not errors: own stack/spread, both busters, return hit.
//
// -- SHOCKWAVE / UNLIMITED EXPRESS [BM] --
// Candidates: Shockwave visual 45646, damage 45699 (~5.7s later);
// Unlimited Express controller 45623 (5s), helper cast/damage 45680 (5.9s).
// What happens: Shockwave announces arms after intermission; Unlimited's
// physical raid damage transfers all players to next car after Cars1/2.
// Correct play: heal/mitigate. No avoidable component established.
// Failure signals: raw deaths alone prove no mechanic error. Removal:
// scripted transfer/instant hits. Not errors: damage, downtime, relocation.
//
// -- DERAILMENT SIEGE / DERAIL / LAUNCHPADS [BM, JP] --
// Candidates: Siege controller casts 45648/45700/45701/45702 (6s);
// damage 45706/45707, finals 45649/45703/45704/45705 (helper casts
// 10/11/12/13s). Derail controllers 45709/46489/46490 (5.1s), helper
// cast/damage 45711 (5s); enrage controller 45710 (15.1s), hit 45712 (15s).
// What happens: ONE front 5y split tower, 3/4/5/6 total hits across four
// Sieges, ~1s successive hits, final ~2s later and stronger. First three
// open a rear launchpad, then destroy abandoned car. Fourth has no exit.
// Correct play: share volley or assigned tank solo with invuln; then take
// rear pad promptly. BM pad center=(100,212.5/262.5/312.5), radius ~2y.
// Failure: empty tower -> LOG SIGNAL: raid-wide penalty damage/mass deaths
// at Siege resolution, distinct penalty name/ID unknown; FAULT: assigned
// surviving soaker only if plan known; CONSEQUENCE: Raid, plus attributable
// Major. Failure: leave early -> LOG SIGNAL: later volley loses living
// assigned soakers, lethal split damage; FAULT: early leaver with evidence;
// CONSEQUENCE: Major, Raid if unresolvable. Reduced counts alone are normal
// with an invuln plan. Failure: miss exit -> LOG SIGNAL: 45711/death on old
// car; FAULT: stranded player unless already fallout; CONSEQUENCE: Major.
// Removal: final hit ends tower; next car survives early Derail. Not errors:
// proper shares, solo invulns, invuln survival buff loss, use of launchpads.
//
// -- THIRD RAIL / HEAD-ON EMISSION [BM] --
// Candidates: Third Rail snap/controller 45665, puddle cast/damage 45666
// (3s helper cast, ~4s snap-to-hit). Thunderous Breath controllers
// 45687/45688, damage 45689; Headlight controllers 45690/45691,
// damage 45692. First height controller casts 6s; opposite hit ~2.5s later.
// What happens: snap baits eight invisible 4y circles at player positions,
// height-specific [BM]. Emission alternates ground then air, or air then
// ground: electric jaws = ground hit, headlamp = elevated hit.
// Correct play: bait together where feasible, move after snap; avoid any
// player's old spot on same height. Start on safe level, switch after hit.
// Failure: old-spot/wrong-height hit -> LOG SIGNAL: Third Rail/Thunderous
// Breath/Headlight damage + Vulnerability Up; FAULT: mover unless another
// player's misplaced bait removed agreed safe space; CONSEQUENCE: Minor
// survived, Major lethal. Removal: puddles detonate once, no persistent DoT
// established. Not errors: teleport lock/protection or safe height changes.
//
// -- ARCANE REVELATION / HAIL OF THUNDER / DESIGNATED CONDUCTOR [BM] --
// Candidates: Arcane cast 47527 (2s); Hail controller 45656/45657/45658,
// helper cast/damage 45713 (2.7s); Hyperconductive Plasma damage 45714;
// Conductor player aura 4719 / 1004719, Magic Vuln 2941 / 1002941.
// What happens: rotating indicator visits four diamond vertices; hands
// crackle before last step, clap resolves 16y Hail plus TWO 13y split stacks
// on one tank and one healer. Three resolutions on Car4, two on Car6.
// BM controller short/medium/long predicts 2/3/4 steps, resolution after
// ~7.5/10.5/13.4s; total first-Arcane movement eight steps [IV]. BM source
// offsets from car center: N/S 10y, W/E 4.8y; platforms allow extra routes.
// Correct play: normal 4:4 groups avoid Hail, separate stack circles;
// preposition elevated so a drop is faster than ascending late. Alternate
// 2:6 plan intentionally holds NW/NE and mitigates Hail [JP].
// Failure: accidental Hail -> LOG SIGNAL: Hail damage + Vulnerability Up;
// FAULT: player outside safe region if normal plan; CONSEQUENCE: Minor,
// Major if lethal. Failure: cross-stack/under-share -> LOG SIGNAL: two
// Plasma hits under Magic Vuln or lethal split damage; FAULT: displaced
// conductor/soaker with assignment evidence; CONSEQUENCE: Major if lethal.
// Removal: Conductor persists across its volleys, ends after sequence;
// death/expiry/retarget effects unresolved. Not errors: own split damage,
// brief Magic Vuln, deliberate Hail and 2:6 shares under declared plan.
//
// -- PSYCHOKINESIS / PLUMMET [BM, IV] --
// Candidates: Psychokinesis cast 45668 (7s), Plummet cast/damage 45669
// (5s), Physical Vulnerability Up 2940 / 1002940. Circle radius 8y.
// What happens: crates removed, opening maze routes; Car5 marks 2 then 3
// then 5 players, Car6 marks 4. First set support+DPS, second tank+healer+
// DPS, final-car set tank+healer+two DPS. Third Rail follows sets 1/3 and
// Car6's set; ordinary boss autos are magical [TL], Plummet physical.
// Correct play: carriers fan to outer areas; unmarked players may take ONE
// Plummet for space, never two. Common drops: supports W, DPS E, healer
// rear for three marks. Hold drops until snap, then move out of Third Rail.
// Failure: double overlap -> LOG SIGNAL: multiple Plummet hits, Physical
// Vuln making subsequent hit lethal; FAULT: overlapping carriers vs roaming
// bystander depends on agreed spots; CONSEQUENCE: Minor/Major by outcome.
// Removal: instant circles consume marks; Physical Vuln expires, cleanse
// or death-triggered detonation not established. No dropped persistent
// puddle/collision explosion described. Not errors: own hit or ONE planned
// unmarked soak and its Physical Vuln; movement through removed-crate space.
//
// -- WHAT ENDS A PULL --
// Orb timeout at gauge 100 -> failed Runaway Train, Raid DPS-check failure.
// Empty Siege is guide-described wipe; exact penalty is still unverified.
// Final Derail destroys last car after six-hit Siege and ~15s cast; Raid
// hard enrage. Approximate TL 11:24 depends on orb kill (roughly R+440s).
// No established stacking boss soft enrage; rising Siege hit counts are
// scheduled. Orb timer is local enrage; tank cooldown attrition can limit it.
// Early Derail/forced movement may cause deaths lacking a killing ability;
// not every blank-ability death is a reset. No special reset method found.
// Multiple deaths, overlap cascades or surviving with vuln stacks alone
// do not establish an inevitable wipe, especially with Echo/raise resources.
//
// -- OPEN QUESTIONS FOR LOG VERIFICATION --
// 1. Confirm cast/damage/status mappings, generic Vulnerability Up ID and
//    durations, damage types, any Damage Down, and unnamed height 1004721.
// 2. Is Doom-engine Power exposed, what is its net gain/reset, and is ~75s
//    deadline accurate? How early does orb death stop pending train volleys?
// 3. Confirm R-relative clock/enrage, cone cadence and minimum Aetherosote
//    sharing: BM accepts 2..3 but community plan uses three; no forced fail
//    on a two-person stack established. Which role gets partner plasma?
// 4. What exact penalty name/ID/target count marks an empty Siege? Does
//    each ordinary hit or only final require a soaker; exact final multiplier?
// 5. Does Conductor death cancel, transfer or trigger an early stack? Are
//    Plummet/Plasma/Aetherochar markers and carrier links present in capture?
// 6. Can logged coordinates/aura distinguish heights, train cone origins,
//    obstacles, launchpad transfer/protection and missing exit from a reset?
// 7. Confirm height interaction for Hail/Plummet/Plasma and minimum safe
//    margins; BM geometry is a candidate, not a measured FFLogs tolerance.
// 8. Establish the report's actual slot, intermission, Arcane and invuln
//    plans before assigning displaced-player fault or calling Hail an error.

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import type { ReportedOccurrence } from "@/lib/mechanics/occurrences";
import { kFmt, sec, joinNames, playerError, playerlessMinor, raidMarker, rezzedAt, clusterByGap, debuffIntervals, RAID_MARKER_SORT_OFFSET_MS } from "@/lib/mechanics/wow/common";

export const DT_AVOIDABLE_RULE_ID   = "ffxiv-dt-avoidable";
export const DT_PLASMA_RULE_ID      = "ffxiv-dt-plasma";       // stored spreads and partner stacks
export const DT_ORB_SPREAD_RULE_ID  = "ffxiv-dt-orb-spread";   // Aetherochar
export const DT_ORB_STACK_RULE_ID   = "ffxiv-dt-orb-stack";    // Aetherosote, the six non-tanks
export const DT_CONE_RULE_ID        = "ffxiv-dt-cone";         // Aetherial Ray on a non-tank
export const DT_ARCANE_RULE_ID      = "ffxiv-dt-arcane";       // Hyperconductive Plasma stacks
export const DT_PLUMMET_RULE_ID     = "ffxiv-dt-plummet";
export const DT_BUSTER_RULE_ID      = "ffxiv-dt-buster";       // the non-tanks' side of Lightning Burst
export const DT_ENMITY_RULE_ID      = "ffxiv-dt-enmity";       // Lightning Burst on a non-tank
export const DT_STRANDED_RULE_ID    = "ffxiv-dt-stranded";
export const DT_FALL_RULE_ID        = "ffxiv-dt-fall";
export const DT_ORB_TIMEOUT_RULE_ID = "ffxiv-dt-orb-timeout";
export const DT_MASS_DEATHS_RULE_ID = "ffxiv-dt-mass-deaths";
export const DT_ENRAGE_RULE_ID      = "ffxiv-dt-enrage";
export const DT_CALLED_WIPE_RULE_ID = "ffxiv-dt-called-wipe";
export const DT_COLLAPSE_RULE_ID    = "ffxiv-dt-collapse";

// Dead Man's Overdraught (both stores), Turret Crossing, Runaway Train.
const SIGNATURE        = [45663, 45664, 45628, 45638];
const WALKING_DEAD     = 1000811; // Dark Knight's Living Dead follow-up
const WALKING_DEAD_FULL_MS = 9500;
const ELEVATED         = 1004721; // unnamed status: on a raised platform
const LIGHTNING_BURST  = 45715;
const AETHERIAL_RAY    = 45693;
const RUNAWAY_TRAIN    = 45645;   // the return from the intermission, raid damage
const DERAIL           = 45711;   // destroys the car just left (Cars 3-5)
const DERAIL_ENRAGE    = 45712;   // the last car's Derail, the hard enrage
const PLASMA           = 45675;
const HYPEREXPLOSIVE   = 45676;
const AETHEROCHAR      = 45697;
const AETHEROSOTE      = 45698;
const HYPERCONDUCTIVE  = 45714;
const PLUMMET          = 45669;
// Raid-wide or tank damage: deaths to these are mitigation, never part of a
// mass-death cutoff.
const RAIDWIDE = [45670, 45680, 45699, RUNAWAY_TRAIN, 45716, 45706, 45707, 45649, 45703, 45704, 45705, 45696];

// Avoidable hits. The fight hands out no Damage Down (Vulnerability Up
// 1001789 instead), so a survived hit is Minor and a lethal one Major.
type Avoidable = { name: string; hit: string; why: string };
const AVOIDABLE: Record<number, Avoidable> = {
  45679: { name: "Dead Man's Blastpipe", hit: "Hit by Dead Man's Blastpipe",
    why: "After Windpipe's draw-in, Blastpipe blasts the front two rows; get out of the front as soon as the pull ends." },
  45671: { name: "Plasma Beam", hit: "Hit by a Plasma Beam", why: "Each Levin Signal fires a beam down its column at its height; stand in a column the signals leave clear." },
  45672: { name: "Plasma Beam", hit: "Hit by a Plasma Beam", why: "Each Levin Signal fires a beam down its column at its height; stand in a column the signals leave clear." },
  45673: { name: "Plasma Beam", hit: "Hit by a Plasma Beam", why: "Each Levin Signal fires a beam down its column at its height; stand in a column the signals leave clear." },
  45674: { name: "Plasma Beam", hit: "Hit by a Plasma Beam", why: "Each Levin Signal fires a beam down its column at its height; stand in a column the signals leave clear." },
  45681: { name: "Electray", hit: "Hit by a turret's Electray", why: "The Kinematic Turrets fire across the car; shelter behind an intact crate or at the safe height, and leave a crate the second volley removes." },
  45682: { name: "Electray", hit: "Hit by a turret's Electray", why: "The Kinematic Turrets fire across the car; shelter behind an intact crate or at the safe height, and leave a crate the second volley removes." },
  45683: { name: "Electray", hit: "Hit by a turret's Electray", why: "The Kinematic Turrets fire across the car; shelter behind an intact crate or at the safe height, and leave a crate the second volley removes." },
  45686: { name: "Electray", hit: "Hit by a turret's Electray", why: "The Kinematic Turrets fire across the car; shelter behind an intact crate or at the safe height, and leave a crate the second volley removes." },
  45666: { name: "Third Rail", hit: "Hit by a Third Rail puddle", why: "Third Rail drops a puddle where every player stood at the snap; move off your spot, and off everyone else's, right after it." },
  45689: { name: "Thunderous Breath", hit: "Hit by Thunderous Breath", why: "Electric jaws mean Thunderous Breath hits the ground level; be up on a platform, then switch after the hit." },
  45692: { name: "Headlight", hit: "Hit by Headlight", why: "A headlamp means Headlight hits the raised platforms; be on the ground, then switch after the hit." },
  45713: { name: "Hail of Thunder", hit: "Hit by Hail of Thunder", why: "Arcane Revelation's Hail of Thunder hits around the indicator's last stop; follow the rotation and stand in the half it leaves." },
};

// One bait per player: a player hit by another player's instance, or by
// two at once, is an overlap (both named; README philosophy 3).
type Spread = { name: string; ids: number[]; what: string; why: string; ruleId: string };
const SPREADS: Spread[] = [
  { name: "Plasma", ids: [PLASMA], what: "spread", ruleId: DT_PLASMA_RULE_ID,
    why: "Dead Man's Overdraught stored eight spreads; after the movement, each player takes theirs in a column of their own." },
  { name: "Aetherochar", ids: [AETHEROCHAR], what: "spread", ruleId: DT_ORB_SPREAD_RULE_ID,
    why: "Three puffs of smoke mean three Aetherochar spreads on non-tanks; all six non-tanks spread out between the tanks' cones." },
];

// Split stacks: each player takes exactly one. `full`: every eligible
// player belongs in one, so a living eligible player hit by none left the
// rest to take it short.
type Share = { name: string; ids: number[]; what: string; why: string; ruleId: string; full: boolean; nonTanksOnly?: boolean };
const SHARES: Share[] = [
  { name: "Hyperexplosive Plasma", ids: [HYPEREXPLOSIVE], what: "partner stack", ruleId: DT_PLASMA_RULE_ID, full: true,
    why: "Dead Man's Overdraught stored four partner stacks; pair up so every player shares exactly one." },
  { name: "Aetherosote", ids: [AETHEROSOTE], what: "stack", ruleId: DT_ORB_STACK_RULE_ID, full: true, nonTanksOnly: true,
    why: "Two puffs of smoke mean two Aetherosote stacks; the six non-tanks split three and three while the tanks hold their cones outside." },
  { name: "Hyperconductive Plasma", ids: [HYPERCONDUCTIVE], what: "stack", ruleId: DT_ARCANE_RULE_ID, full: true,
    why: "Arcane Revelation's two stacks land on the Designated Conductors: tanks and melee take the tank's, healers and ranged the healer's, never both." },
  { name: "Plummet", ids: [PLUMMET], what: "Plummet", ruleId: DT_PLUMMET_RULE_ID, full: false,
    why: "Each Plummet splits among the players under it and leaves Physical Vulnerability Up; take exactly one." },
];

// FFLogs logs the death event ~2.0s after the fatal hit (README).
const DEATH_EVENT_LAG_MS = 2000;
const DIED_FROM_HIT_MS   = 3000;
const EPISODE_MS         = 3000;
const RAISE_GRACE_MS     = 10_000;
const TANK_ENMITY_LOST_MS = 30_000;
// With this many dead, a share's or spread's layout is fallout.
const DOOMED_DEAD        = 3;
// The intermission's return at the orb's deadline: 1.47M-3.22M per hit
// (A11, A17, A18 at +4:15); a return after the orb's death 17.8k-189.7k.
const ORB_TIMEOUT_RAW    = 1_000_000;
// A silent death this long after a Derail cast was left on the destroyed
// car: +4.5s every time (A6 x5, A19 x2, B10), +2.6s for B10's tank, whose
// Walking Dead ran out instead (checked first).
const STRANDED_MIN_MS    = 1500;
const STRANDED_MAX_MS    = 6000;
const MASS_STRANDED      = 4;
// Deaths to one moment's mechanics that end the pull: 4+ within MASS_WINDOW_MS
// (A3 6, A4 5, A8 4, A9 4, A13 6, A15 7) and the pull over within a minute.
// No kill ever lost more than 2 at once.
const MASS_DEATHS        = 4;
const MASS_WINDOW_MS     = 2500;
const MASS_END_MS        = 60_000;
const CALLED_WIPE_END_MS = 12_000;
const CALLED_WIPE_COUNT  = 3;
const CALLED_WIPE_WINDOW = 10_000;
const CALLED_WIPE_PAIR_MS = 5_000;
// 5 dead with the pull over within 45s (collapse: A19's 5 dead at +9:10
// lasted 67s more and carried on; every other 5-dead moment ended in 32s).
const COLLAPSE_DEAD_COUNT = 5;
const COLLAPSE_END_MS     = 45_000;

// ── shared helpers ──────────────────────────────────────────────────────────

type Hit = { p: PlayerInfo; e: PlayerEvent };

type Life = {
  alive: (p: PlayerInfo, t: number) => boolean;
  hitAlive: (p: PlayerInfo, hitT: number) => boolean;
  diedFrom: (p: PlayerInfo, hitT: number) => DeathEvent | undefined;
  outIntervals: { p: PlayerInfo; start: number; end: number }[];
};

function buildLife(players: PlayerInfo[], deaths: DeathEvent[]): Life {
  const outIntervals: Life["outIntervals"] = [];
  for (const p of players) {
    const own = deaths.filter((d) => d.player === p.name).sort((a, b) => a.timestamp - b.timestamp);
    own.forEach((d, i) => {
      const next = own[i + 1]?.timestamp ?? Infinity;
      const end = rezzedAt(p, d.timestamp, next) ?? next - DEATH_EVENT_LAG_MS - 100;
      outIntervals.push({ p, start: d.timestamp - DEATH_EVENT_LAG_MS - 100, end });
    });
  }
  const alive = (p: PlayerInfo, t: number) => !outIntervals.some((w) => w.p === p && t >= w.start && t < w.end);
  return {
    outIntervals,
    alive,
    hitAlive: (p, hitT) => alive(p, hitT - 500),
    diedFrom: (p, hitT) => deaths.find((d) => d.player === p.name && d.timestamp >= hitT && d.timestamp <= hitT + DIED_FROM_HIT_MS),
  };
}

/** Hits on living players (a dead body still logs 0-damage hits). */
function hitsOf(players: PlayerInfo[], life: Life, ids: number | number[]): Hit[] {
  const set = new Set(Array.isArray(ids) ? ids : [ids]);
  const out: Hit[] = [];
  for (const p of players) {
    for (const e of p.damageTaken) {
      if (!set.has(e.abilityId) || e.healthBefore === 0) continue;
      if (life.hitAlive(p, e.timestamp)) out.push({ p, e });
    }
  }
  return out.sort((a, b) => a.e.timestamp - b.e.timestamp);
}

const castsOf = (casts: EnemyEvent[], ids: number | number[]) => {
  const set = new Set(Array.isArray(ids) ? ids : [ids]);
  return casts.filter((c) => set.has(c.abilityId)).sort((a, b) => a.timestamp - b.timestamp);
};

// Hits this large are FFLogs' unpaired previews of lethal hits (README).
const PREVIEW_AMOUNT = 1_500_000;
/** "~120k", or "lethal" when a hit in the set is a lethal preview. */
const amountText = (es: PlayerEvent[]) => es.some((e) => (e.amount ?? 0) >= PREVIEW_AMOUNT)
  ? "lethal" : kFmt(es.reduce((s, e) => s + (e.amount ?? 0), 0));

const uniq = <T,>(xs: T[]) => [...new Set(xs)];
const namesOf = (ps: PlayerInfo[]) => joinNames(uniq(ps).map((p) => p.name));
const isTank = (p: PlayerInfo) => p.role === "Tank";
const instanceKey = (e: PlayerEvent) => `${e.abilityId}|${e.source}#${e.sourceInstance}`;
const castKey = (c: EnemyEvent) => `${c.abilityId}|${c.actorName}#${c.sourceInstance}`;
const deadCount = (players: PlayerInfo[], life: Life, t: number) => players.filter((p) => !life.hitAlive(p, t)).length;

function tankOutRecently(life: Life, p: PlayerInfo, t: number): boolean {
  return !life.hitAlive(p, t) || life.outIntervals.some((w) => w.p === p && w.start <= t && w.end >= t - TANK_ENMITY_LOST_MS);
}

/** Both tanks alive and holding enmity at `t` (otherwise targets move as fallout). */
function tanksHealthy(players: PlayerInfo[], life: Life, t: number): boolean {
  const tanks = players.filter(isTank);
  return tanks.length >= 2 && tanks.every((p) => !tankOutRecently(life, p, t));
}

/** Raised within RAISE_GRACE_MS before `t` (or still out at `t`). */
function inRaiseGrace(life: Life, p: PlayerInfo, t: number): boolean {
  return !life.hitAlive(p, t) || life.outIntervals.some((w) => w.p === p && w.end <= t && t - w.end < RAISE_GRACE_MS);
}

/** Took a listed avoidable hit, a cone or a buster within 2s of `t`: already flagged for it. */
function inAvoidable(p: PlayerInfo, t: number): boolean {
  return p.damageTaken.some((e) => (AVOIDABLE[e.abilityId] || e.abilityId === AETHERIAL_RAY || e.abilityId === LIGHTNING_BURST) &&
    Math.abs(e.timestamp - t) <= 2000 && (e.amount ?? 0) > 0);
}

const killedBy = (life: Life, res: Hit[], p: PlayerInfo, ids: number[]) => {
  const last = res.filter((h) => h.p === p).pop()?.e.timestamp;
  const d = last !== undefined ? life.diedFrom(p, last) : undefined;
  return !!d && ids.includes(d.killingAbilityGameId);
};

// ── plain avoidable hits ────────────────────────────────────────────────────

function detectAvoidable(players: PlayerInfo[], life: Life): PullError[] {
  const errors: PullError[] = [];
  const ids = Object.keys(AVOIDABLE).map(Number);
  for (const p of players) {
    const hits = p.damageTaken.filter((e) => ids.includes(e.abilityId) && e.healthBefore !== 0 && life.hitAlive(p, e.timestamp) && (e.amount ?? 0) > 0);
    for (const g of clusterByGap(hits, (e) => e.timestamp, EPISODE_MS)) {
      const kinds = uniq(g.map((e) => AVOIDABLE[e.abilityId]));
      const death = life.diedFrom(p, g[g.length - 1].timestamp);
      const hit = kinds.map((k, i) => (i === 0 ? k.hit : k.hit.charAt(0).toLowerCase() + k.hit.slice(1))).join(", and ");
      errors.push(playerError(p, {
        ruleId: DT_AVOIDABLE_RULE_ID, severity: death ? "Major" : "Minor", name: `Hit by ${uniq(kinds.map((k) => k.name)).join(" / ")}`,
        description: `${hit} (${g.length > 1 ? `${g.length} hits, ` : ""}${amountText(g)}), with Vulnerability Up.${death ? " They died." : ""} ${uniq(kinds.map((k) => k.why)).join(" ")}`,
        timestamp: g[0].timestamp, abilityId: g[0].abilityId, abilityName: g[0].abilityName,
      }));
    }
  }
  return errors;
}

// ── overlapping spreads ─────────────────────────────────────────────────────

/**
 * Plasma (eight stored spreads) and Aetherochar (three spreads): the owner of
 * an instance is its cast target, else the only player it hit, or the one
 * player it hit who took nothing else. A player hit by an instance that isn't
 * theirs, or by two, overlapped; the owner and the victim are both named. In
 * the reports the second hit came under Magic Vulnerability Up and killed
 * (A1 +0:45, A5 +0:45, A8 +0:44).
 */
function detectSpreads(players: PlayerInfo[], life: Life, casts: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const fam of SPREADS) {
    for (const res of clusterByGap(hitsOf(players, life, fam.ids), (h) => h.e.timestamp, 1500)) {
      const t0 = res[0].e.timestamp, t1 = res[res.length - 1].e.timestamp;
      if (deadCount(players, life, t0) >= DOOMED_DEAD) continue;
      const byInst = new Map<string, Hit[]>();
      const byPlayer = new Map<PlayerInfo, Set<string>>();
      for (const h of res) {
        if (inRaiseGrace(life, h.p, h.e.timestamp)) continue;
        const k = instanceKey(h.e);
        byInst.set(k, [...(byInst.get(k) ?? []), h]);
        byPlayer.set(h.p, (byPlayer.get(h.p) ?? new Set()).add(k));
      }
      const owners = new Map<string, PlayerInfo>();
      for (const c of casts) {
        if (!fam.ids.includes(c.abilityId) || c.timestamp < t0 - 2000 || c.timestamp > t1 + 200 || c.sourceInstance === undefined || !c.target) continue;
        const p = players.find((x) => x.name === c.target);
        if (p) owners.set(castKey(c), p);
      }
      for (const [k, hs] of byInst) {
        if (owners.has(k)) continue;
        const hit = uniq(hs.map((h) => h.p));
        const only = hit.filter((p) => byPlayer.get(p)!.size === 1);
        if (hit.length === 1) owners.set(k, hit[0]);
        else if (only.length === 1) owners.set(k, only[0]);
      }
      const links = new Map<PlayerInfo, Set<PlayerInfo>>();
      const link = (a: PlayerInfo, b: PlayerInfo) => {
        links.set(a, (links.get(a) ?? new Set()).add(b));
        links.set(b, (links.get(b) ?? new Set()).add(a));
      };
      for (const [p, ks] of byPlayer) {
        const foreign = [...ks].filter((k) => owners.get(k) !== p);
        if (ks.size < 2 && foreign.length === 0) continue;
        if (!links.has(p)) links.set(p, new Set());
        for (const k of ks) {
          const o = owners.get(k);
          if (o) { if (o !== p) link(p, o); }
          else for (const h of byInst.get(k)!) if (h.p !== p) link(p, h.p);
        }
      }
      const seen = new Set<PlayerInfo>();
      for (const start of links.keys()) {
        if (seen.has(start)) continue;
        const group: PlayerInfo[] = [];
        const stack = [start];
        while (stack.length) {
          const p = stack.pop()!;
          if (seen.has(p)) continue;
          seen.add(p);
          group.push(p);
          for (const q of links.get(p) ?? []) stack.push(q);
        }
        const killed = group.filter((p) => killedBy(life, res, p, fam.ids));
        const deathText = killed.length ? ` ${namesOf(killed)} died.` : "";
        for (const p of group) {
          const others = [...(links.get(p) ?? [])];
          const n = byPlayer.get(p)?.size ?? 0;
          const victim = n > 1 || [...(byPlayer.get(p) ?? [])].some((k) => owners.get(k) !== p);
          const description = victim
            ? `Hit by ${n > 1 ? `${n} ${fam.name} ${fam.what}s at once` : `another player's ${fam.name} ${fam.what}`}${others.length ? ` (with ${namesOf(others)})` : ""}.`
            : `Their ${fam.name} ${fam.what} also hit ${namesOf(others)}.`;
          errors.push(playerError(p, {
            ruleId: fam.ruleId, severity: killed.length ? "Major" : "Minor", name: `${fam.name} Overlap`,
            description: `${description}${deathText} ${fam.why}`,
            timestamp: t0, abilityId: fam.ids[0], abilityName: fam.name,
          }));
        }
      }
    }
  }
  return errors;
}

// ── split stacks ────────────────────────────────────────────────────────────

/**
 * Each player takes exactly one share. A player hit by two instances of one
 * resolution doubled up (the extra share, under the first hit's Magic or
 * Physical Vulnerability Up, was what killed in the reports: A2 +1:53,
 * B6 +8:48, B10 +9:47). For a `full` share, a living eligible player hit by
 * none left the others to take it short. Every clean kill resolution had
 * all eligible players in exactly one (B4-B6, B9, B10), except one missed
 * Arcane share that nobody died to (B6 +5:35).
 */
function detectShares(players: PlayerInfo[], life: Life, occurrences?: ReportedOccurrence[]): PullError[] {
  const errors: PullError[] = [];
  for (const fam of SHARES) {
    for (const res of clusterByGap(hitsOf(players, life, fam.ids), (h) => h.e.timestamp, 1500)) {
      const t = res[0].e.timestamp;
      const eligible = (p: PlayerInfo) => !fam.nonTanksOnly || !isTank(p);
      if (fam.nonTanksOnly) occurrences?.push({ mechanicKey: fam.ruleId, timestamp: t, players: players.filter((p) => eligible(p) && life.hitAlive(p, t)).map((p) => p.name) });
      if (deadCount(players, life, t) >= DOOMED_DEAD) continue;
      const byPlayer = new Map<PlayerInfo, Set<string>>();
      for (const h of res) byPlayer.set(h.p, (byPlayer.get(h.p) ?? new Set()).add(instanceKey(h.e)));
      const killed = uniq(res.map((h) => h.p)).filter((p) => killedBy(life, res, p, fam.ids));
      const deathText = killed.length ? ` ${namesOf(killed)} died.` : "";
      const doubled = [...byPlayer].filter(([p, ks]) => ks.size >= 2 && !inRaiseGrace(life, p, t)).map(([p]) => p);
      for (const p of doubled) {
        const n = byPlayer.get(p)!.size;
        errors.push(playerError(p, {
          ruleId: fam.ruleId, severity: killed.length ? "Major" : "Minor", name: `Took Two ${fam.name}s`,
          description: `Stood in ${n} ${fam.name} ${fam.what}s at once${doubled.length > 1 ? ` (with ${namesOf(doubled.filter((x) => x !== p))})` : ""}.${deathText} ${fam.why}`,
          timestamp: t, abilityId: fam.ids[0], abilityName: fam.name,
        }));
      }
      if (!fam.full) continue;
      const absent = players.filter((p) => eligible(p) && !byPlayer.has(p) && life.hitAlive(p, t) && !inRaiseGrace(life, p, t) && !inAvoidable(p, t));
      for (const p of absent) {
        const sizes = [...new Set(res.map((h) => instanceKey(h.e)))].map((k) => res.filter((h) => instanceKey(h.e) === k).length);
        errors.push(playerError(p, {
          ruleId: fam.ruleId, severity: killed.length ? "Major" : "Minor", name: `Missed ${fam.name}`,
          description: `Took no ${fam.name} ${fam.what}, so the others shared ${sizes.length === 1 ? "it" : "them"} short (${sizes.join(" + ")} players).${deathText} ${fam.why}`,
          timestamp: t, abilityId: fam.ids[0], abilityName: fam.name,
        }));
      }
    }
  }
  return errors;
}

// ── Lightning Burst ─────────────────────────────────────────────────────────

/**
 * Two 5y busters on the top two on enmity, each cast-targeted. A player hit
 * by a buster aimed at someone else stood in it (the non-tanks' side). A
 * buster aimed at a non-tank with both tanks healthy means a tank lost
 * enmity; FFLogs carries no enmity or stance toggles, so that stays
 * player-less (A1 +1:39 a DRG, A2 +1:39 a SGE and a DNC).
 */
function detectBusters(players: PlayerInfo[], life: Life, casts: EnemyEvent[], occurrences?: ReportedOccurrence[]): PullError[] {
  const errors: PullError[] = [];
  for (const res of clusterByGap(hitsOf(players, life, LIGHTNING_BURST), (h) => h.e.timestamp, 1500)) {
    const t = res[0].e.timestamp;
    const healthy = tanksHealthy(players, life, t - DIED_FROM_HIT_MS);
    const owners = new Map<number, PlayerInfo>();
    for (const c of castsOf(casts, LIGHTNING_BURST).filter((c) => c.timestamp >= t - 2000 && c.timestamp <= t + 200 && c.target)) {
      const p = players.find((x) => x.name === c.target);
      if (p && c.sourceInstance !== undefined) owners.set(c.sourceInstance, p);
    }
    // A cast logged without its target: the one tank it hit (A7 +1:39).
    for (const inst of uniq(res.map((h) => h.e.sourceInstance))) {
      if (inst === undefined || owners.has(inst)) continue;
      const tanksHit = uniq(res.filter((h) => h.e.sourceInstance === inst && isTank(h.p)).map((h) => h.p));
      if (tanksHit.length === 1) owners.set(inst, tanksHit[0]);
    }
    if (!healthy) continue;
    occurrences?.push({ mechanicKey: DT_BUSTER_RULE_ID, timestamp: t, players: players.filter((p) => !isTank(p) && life.hitAlive(p, t)).map((p) => p.name) });
    const wrong = uniq([...owners.values()].filter((p) => !isTank(p)));
    if (wrong.length) {
      const died = wrong.filter((p) => life.diedFrom(p, t)?.killingAbilityGameId === LIGHTNING_BURST);
      errors.push(playerlessMinor(DT_ENMITY_RULE_ID, "Lightning Burst on a Non-Tank",
        `Lightning Burst went to ${namesOf(wrong)} with both tanks alive: a tank wasn't top two on enmity.${died.length ? ` ${namesOf(died)} died.` : ""} Both tanks hold the top of the enmity list (tank stance) so the busters go to them.`,
        t, LIGHTNING_BURST, "Lightning Burst"));
    }
    for (const h of res) {
      if (isTank(h.p) || inRaiseGrace(life, h.p, t)) continue;
      const o = h.e.sourceInstance !== undefined ? owners.get(h.e.sourceInstance) : undefined;
      if (!o || o === h.p) continue;
      const d = life.diedFrom(h.p, t);
      errors.push(playerError(h.p, {
        ruleId: DT_BUSTER_RULE_ID, severity: d ? "Major" : "Minor", name: "In Lightning Burst",
        description: `Stood in ${o.name}'s Lightning Burst (${amountText([h.e])}).${d ? " They died." : ""} The two busters are 5y circles on the tanks; keep clear of both.`,
        timestamp: t, abilityId: LIGHTNING_BURST, abilityName: "Lightning Burst",
      }));
    }
  }
  return errors;
}

// ── Aetherial Ray ───────────────────────────────────────────────────────────

/**
 * The two Ghost Trains each aim a cone at a tank (the cast target). A clean
 * kill resolution hits only the tanks (B4-B6, B9, B10). A non-tank hit by a
 * cone stood in the tank's lane. Skipped while a tank is dead or just raised:
 * the cones then retarget.
 */
function detectCones(players: PlayerInfo[], life: Life, casts: EnemyEvent[], occurrences?: ReportedOccurrence[]): PullError[] {
  const errors: PullError[] = [];
  for (const res of clusterByGap(hitsOf(players, life, AETHERIAL_RAY), (h) => h.e.timestamp, 1500)) {
    const t = res[0].e.timestamp;
    if (!tanksHealthy(players, life, t - DIED_FROM_HIT_MS)) continue;
    const targets = castsOf(casts, AETHERIAL_RAY).filter((c) => c.timestamp >= t - 2000 && c.timestamp <= t + 200 && c.target);
    if (targets.some((c) => !isTank(players.find((p) => p.name === c.target) ?? players[0]))) continue;
    occurrences?.push({ mechanicKey: DT_CONE_RULE_ID, timestamp: t, players: players.filter((p) => !isTank(p) && life.hitAlive(p, t)).map((p) => p.name) });
    for (const p of uniq(res.filter((h) => !isTank(h.p)).map((h) => h.p))) {
      if (inRaiseGrace(life, p, t)) continue;
      const hs = res.filter((h) => h.p === p);
      const toward = uniq(hs.map((h) => targets.find((c) => c.sourceInstance === h.e.sourceInstance)?.target).filter(Boolean) as string[]);
      const d = life.diedFrom(p, t);
      errors.push(playerError(p, {
        ruleId: DT_CONE_RULE_ID, severity: d ? "Major" : "Minor", name: "Hit by Aetherial Ray",
        description: `Hit by ${hs.length > 1 ? `${hs.length} Aetherial Ray cones` : "an Aetherial Ray cone"}${toward.length ? ` aimed at ${joinNames(toward)}` : ""} (${amountText(hs.map((h) => h.e))}).${d ? " They died." : ""} The Ghost Train's cones go from the train to each tank; the tanks hold opposite flanks and the party stays between the lanes.`,
        timestamp: t, abilityId: AETHERIAL_RAY, abilityName: "Aetherial Ray",
      }));
    }
  }
  return errors;
}

// ── deaths with no killing blow ─────────────────────────────────────────────

function walkingDeadRanOut(p: PlayerInfo, d: DeathEvent): boolean {
  const hitT = d.timestamp - DEATH_EVENT_LAG_MS;
  return debuffIntervals(p, WALKING_DEAD).some((w) => Math.abs(w.end - hitT) <= 1500 && w.end - w.start >= WALKING_DEAD_FULL_MS);
}

const derailBefore = (casts: EnemyEvent[], d: DeathEvent) =>
  castsOf(casts, DERAIL).filter((c) => d.timestamp - c.timestamp >= STRANDED_MIN_MS && d.timestamp - c.timestamp <= STRANDED_MAX_MS).pop();

const enrageBefore = (casts: EnemyEvent[], d: DeathEvent) =>
  castsOf(casts, DERAIL_ENRAGE).some((c) => c.timestamp <= d.timestamp && d.timestamp - c.timestamp <= STRANDED_MAX_MS + 10_000);

/** No-killing-blow deaths that are the wipe being called, not mistakes. */
function calledWipeDeaths(players: PlayerInfo[], deaths: DeathEvent[], casts: EnemyEvent[], pullEnd: number): Set<DeathEvent> {
  const out = new Set<DeathEvent>();
  const silent = deaths.filter((d) => {
    if (d.killingAbilityGameId) return false;
    const p = players.find((x) => x.name === d.player);
    return !(p && walkingDeadRanOut(p, d)) && !derailBefore(casts, d) && !enrageBefore(casts, d);
  });
  for (const d of silent) {
    if (pullEnd - d.timestamp <= CALLED_WIPE_END_MS) out.add(d);
    const near = silent.filter((x) => Math.abs(x.timestamp - d.timestamp) <= CALLED_WIPE_WINDOW);
    if (near.length >= CALLED_WIPE_COUNT) near.forEach((x) => out.add(x));
    const pair = silent.filter((x) => Math.abs(x.timestamp - d.timestamp) <= CALLED_WIPE_PAIR_MS);
    if (pair.length >= 2) pair.forEach((x) => out.add(x));
  }
  return out;
}

/**
 * Silent deaths: Walking Dead running out (player-less), a player left on the
 * car Derail destroys (stranded), the enrage Derail (handled by the entry
 * point), or a fall off the train.
 */
function detectSilentDeaths(players: PlayerInfo[], deaths: DeathEvent[], casts: EnemyEvent[], called: Set<DeathEvent>): PullError[] {
  const errors: PullError[] = [];
  const stranded: { d: DeathEvent; c: EnemyEvent }[] = [];
  for (const d of deaths) {
    if (d.killingAbilityGameId || called.has(d) || enrageBefore(casts, d)) continue;
    const p = players.find((x) => x.name === d.player);
    if (!p) continue;
    const hitT = d.timestamp - DEATH_EVENT_LAG_MS;
    if (walkingDeadRanOut(p, d)) {
      errors.push(playerlessMinor(DT_FALL_RULE_ID, "Walking Dead Ran Out",
        `${p.name}'s Walking Dead (from Living Dead) expired before they were healed back to full, and they died. The healers have to heal the Walking Dead tank to full within its 10s.`,
        hitT, WALKING_DEAD, "Walking Dead"));
      continue;
    }
    const c = derailBefore(casts, d);
    if (c) {
      stranded.push({ d, c });
      errors.push(playerError(p, {
        ruleId: DT_STRANDED_RULE_ID, severity: "Major", name: "Left on the Derailed Car",
        description: `Was still on the old car when Derail destroyed it (died ${sec(d.timestamp - c.timestamp)}s after the cast). After Derailment Siege's last hit, take the launchpad at the rear to the next car.`,
        timestamp: c.timestamp, abilityId: DERAIL, abilityName: "Derail",
      }));
      continue;
    }
    // A death right after an avoidable hit is that hit's error.
    if (p.damageTaken.some((e) => AVOIDABLE[e.abilityId] && e.timestamp <= d.timestamp && e.timestamp >= d.timestamp - DIED_FROM_HIT_MS)) continue;
    // Five of the eight lone silent deaths came 2.0-2.4s after the player's
    // raised-platform aura ended (A14 +5:36, A19 +9:59, B2 +5:52, B8 +5:48,
    // B10 +10:01): they stepped off a platform and off the train.
    const offPlatform = p.debuffs.find((e) => e.abilityId === ELEVATED && e.debuffStatus === "removed" &&
      d.timestamp - e.timestamp >= 1000 && d.timestamp - e.timestamp <= 3500);
    errors.push(playerError(p, {
      ruleId: DT_FALL_RULE_ID, severity: "Major", name: "Fell Off the Train",
      description: offPlatform
        ? `Stepped off a raised platform and fell off the train (died ${sec(d.timestamp - offPlatform.timestamp)}s after leaving the platform, no killing blow). Drop down onto the car, not over its side.`
        : "Died with no killing blow mid-pull: fell off the side of the car or the back of the train.",
      timestamp: hitT, abilityId: 0, abilityName: "Fall",
    }));
  }
  for (const g of clusterByGap(stranded, (s) => s.c.timestamp, 1000)) {
    if (g.length < MASS_STRANDED) continue;
    errors.push(raidMarker(DT_STRANDED_RULE_ID, "Party Left on the Derailed Car",
      `${g.length} players were still on the car when Derail destroyed it (${joinNames(g.map((s) => s.d.player))}). Treated as the cutoff point.`,
      g[0].c.timestamp + RAID_MARKER_SORT_OFFSET_MS, DERAIL, "Derail"));
  }
  return errors;
}

// ── intermission timeout, mass deaths ───────────────────────────────────────

/**
 * The orb's deadline: Runaway Train returns with lethal raid damage while the
 * orb lives (ORB_TIMEOUT_RAW). Clean returns, 19.5s after the orb died, did
 * 17.8k-189.7k.
 */
function detectOrbTimeout(players: PlayerInfo[], life: Life): PullError[] {
  const hits = hitsOf(players, life, RUNAWAY_TRAIN);
  const raw = (e: PlayerEvent) => (e.amount ?? 0) + (e.absorbed ?? 0) + (e.overkill ?? 0);
  const big = hits.filter((h) => raw(h.e) >= ORB_TIMEOUT_RAW);
  if (!big.length) return [];
  const t = big[0].e.timestamp;
  const died = uniq(hits.filter((h) => life.diedFrom(h.p, t)).map((h) => h.p));
  return [raidMarker(DT_ORB_TIMEOUT_RULE_ID, "Orb Not Killed in Time",
    `The Doom-engine orb was still alive when its power filled, so Runaway Train returned for lethal damage${died.length ? ` (${namesOf(died)} died)` : ""}. The raid needed to kill the orb during the intermission. Treated as the cutoff point.`,
    t, RUNAWAY_TRAIN, "Runaway Train")];
}

/** 4+ deaths to one moment's mechanics (raidwides excluded), with the pull over within a minute. */
function detectMassDeaths(deaths: DeathEvent[], pullEnd: number): PullError[] {
  const fatal = deaths.filter((d) => d.killingAbilityGameId && !RAIDWIDE.includes(d.killingAbilityGameId));
  for (const g of clusterByGap(fatal, (d) => d.timestamp, MASS_WINDOW_MS)) {
    if (uniq(g.map((d) => d.player)).length < MASS_DEATHS || pullEnd - g[0].timestamp > MASS_END_MS) continue;
    const kinds = uniq(g.map((d) => d.cause));
    return [raidMarker(DT_MASS_DEATHS_RULE_ID, "Mass Deaths",
      `${g.length} players died together to ${joinNames(kinds)} (${joinNames(uniq(g.map((d) => d.player)))}), and the pull ended soon after. Treated as the cutoff point.`,
      g[0].timestamp - DEATH_EVENT_LAG_MS + RAID_MARKER_SORT_OFFSET_MS, g[0].killingAbilityGameId, kinds[0])];
  }
  return [];
}

// ── entry point ─────────────────────────────────────────────────────────────

/** Doomtrain (Hell on Rails, Extreme) errors. Self-gates on the boss's signature casts. */
export function detectDoomtrainErrors(
  players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], occurrences?: ReportedOccurrence[],
): PullError[] {
  if (!enemyCasts.some((c) => SIGNATURE.includes(c.abilityId))) return [];
  const life = buildLife(players, deathEvents);
  const pullEnd = Math.max(0, ...players.flatMap((p) => [...p.damageTaken, ...p.casts].map((e) => e.timestamp)), ...deathEvents.map((d) => d.timestamp));
  const called = calledWipeDeaths(players, deathEvents, enemyCasts, pullEnd);

  const errors = [
    ...detectAvoidable(players, life),
    ...detectSpreads(players, life, enemyCasts),
    ...detectShares(players, life, occurrences),
    ...detectBusters(players, life, enemyCasts, occurrences),
    ...detectCones(players, life, enemyCasts, occurrences),
    ...detectSilentDeaths(players, deathEvents, enemyCasts, called),
    ...detectOrbTimeout(players, life),
  ];
  const firstRaid = () => Math.min(...errors.filter((e) => e.severity === "Raid").map((e) => e.timestamp));
  for (const m of detectMassDeaths(deathEvents, pullEnd)) if (m.timestamp < firstRaid()) errors.push(m);

  // The last car's Derail ends the pull at the hard enrage.
  const enrage = castsOf(enemyCasts, DERAIL_ENRAGE)[0];
  if (enrage && enrage.timestamp < firstRaid()) {
    const lost = deathEvents.filter((d) => d.timestamp >= enrage.timestamp && d.timestamp - enrage.timestamp <= STRANDED_MAX_MS + 10_000);
    errors.push(raidMarker(DT_ENRAGE_RULE_ID, "Derail (Enrage)",
      `The final Derail destroyed the last car${lost.length ? ` and killed ${lost.length}` : ""}: the boss wasn't brought down before the hard enrage.`,
      enrage.timestamp, DERAIL_ENRAGE, "Derail"));
  }
  const calledList = deathEvents.filter((d) => called.has(d)).sort((a, b) => a.timestamp - b.timestamp);
  const calledPair = calledList.some((d, i) => i > 0 && d.timestamp - calledList[i - 1].timestamp <= CALLED_WIPE_PAIR_MS);
  if ((calledList.length >= CALLED_WIPE_COUNT || calledPair) && calledList[0].timestamp - DEATH_EVENT_LAG_MS < firstRaid()) {
    errors.push(raidMarker(DT_CALLED_WIPE_RULE_ID, "Wipe Called",
      `${calledList.length} players died with no killing blow together (${joinNames(uniq(calledList.map((d) => d.player)))}): the wipe was called and the raid reset.`,
      calledList[0].timestamp - DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  const outAt = (t: number) => players.filter((p) => !life.alive(p, t));
  const collapseT = life.outIntervals.map((w) => w.start).sort((a, b) => a - b)
    .find((t) => outAt(t).length >= COLLAPSE_DEAD_COUNT && pullEnd - t <= COLLAPSE_END_MS);
  if (collapseT !== undefined && collapseT + DEATH_EVENT_LAG_MS < firstRaid()) {
    const who = outAt(collapseT).map((p) => p.name);
    errors.push(raidMarker(DT_COLLAPSE_RULE_ID, "Party Collapse",
      `${who.length} players were dead at once (${joinNames(who)}). Treated as the cutoff point.`,
      collapseT + DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
