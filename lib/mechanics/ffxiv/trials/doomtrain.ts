// lib/mechanics/ffxiv/trials/doomtrain.ts
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
