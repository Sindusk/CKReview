// lib/mechanics/ffxiv/trials/necron.ts
//
// ── DIGEST (read first; detail in the sections it names) ─────────────────
// What: FFXIV Necron (trial) detection, whole fight (~9:40 kill clock, one
//   report A kill + one B with two kills). Per-player avoidable hits, hands,
//   spreads/towers, Blue Shockwave cones, Mass Macabre, abyss, plus Raid
//   cutoffs. Role-gated rules skip pulls where jobs swap (>2 tanks etc.).
// Rules (ffxiv-necron-*; ids NC_*_RULE_ID 416-435):
//   avoidable Minor (Major if it killed; no Damage Down exists); mori
//   center Bleeding (Major if tick killed); hands (Fear of Death hand baits:
//   2 names whoever baited none, 4+ baiting none = player-less); spread
//   (Smite/End's Embrace overlaps); grand-cross (Shock towers + spreads);
//   empty-tower (Electrify); shockwave (in two cones or none); blue-swap
//   (tank took both cones; targeted at tanks); blue-cleave (3+ non-tanks in
//   a cone names the aiming tank); enmity (cone on non-tank, player-less);
//   big-hand (non-tank in Muted Struggle); macabre (Spreading Fear
//   player-less; soak under last soak's Magic Vuln); abyss (died in abyss,
//   Major); invitation (pulled back in; Major if died); fall (off Grand
//   Cross circle, Major; lone silent deaths player-less).
//   Exposure is everyone except blue-swap.
// Cutoffs (Raid): adds (Darkness of Eternity with party adds alive), mass-
//   deaths (4+ non-raidwide deaths in 2.5s, pull over within 60s), enrage,
//   called-wipe (3 deaths in 10s, over within 12s), collapse (5 dead, pull
//   over within 45s).
// Key thresholds: DEATH_EVENT_LAG_MS 2000 (death logs ~2s after fatal hit);
//   EPISODE_MS 3000; RAISE_GRACE_MS 10000; DOOMED_DEAD 3 (spreads/shares
//   with 3+ dead are fallout, skipped); HANDS_UNPLANNED 4; MASS_* 4/2500/
//   60000 (clean: kill B10 lost five to Spreading Fear and recovered;
//   failing: A17, B7 six dead); COLLAPSE 5 dead/45000 (A15, A16, A18
//   carried on 88-100s; B2, B7 ended 55s; others within 31s).
// Strategy/assumptions: nobody remembers the plan, no VOD; kills end before
//   Mori #2, so Grand Cross #2 and the enrage (44613) were never seen.
//   Not built: missed portal identity, abyss role failures, Grand Cross
//   proximity/Neutron Ring deaths, Relentless Reaping order, Invitation lane
//   vs donut blame.
// Sections: "VERIFIED AGAINST LOGS (2026-10-14)" (reports, fight clock, IDs);
//   "RULES IMPLEMENTED"; "GUIDE-DERIVED MODEL: NECRON"; "SOURCES AND
//   CONFIDENCE"; "LOG VOCABULARY AND SEVERITY"; "SHAPE, CHRONOLOGY AND
//   RESOURCES"; "ASSIGNMENTS AND STRATEGY VARIANCE"; per-mechanic
//   "BLUE SHOCKWAVE [BM, DATA]", "FEAR OF DEATH / CHOKING GRASP / THE END'S
//   EMBRACE", "COLD GRIP / EXISTENTIAL DREAD [BM]", "MEMENTO MORI / SMITE OF
//   GLOOM [BM, JP]", "SOUL REAPING / AETHERBLIGHT / TWO-FOLD OR FOUR-FOLD
//   STACKS", "GRAND CROSS / SHOCK / ELECTRIFY / NEUTRON RING [BM]", "PARTY
//   ADD WAVES / DARKNESS OF ETERNITY [BM, IV]", "INDIVIDUAL ABYSS / DOOM /
//   ROLE-SPECIFIC HANDS [BM, IV]", "SPECTER OF DEATH / INVITATION / CIRCLE
//   OF LIVES [BM]", "RELENTLESS REAPING / CROP ROTATION / SEASONS [BM]",
//   "MASS MACABRE / MACABRE MARK / SPREADING FEAR [BM, JP]"; then "WHAT ENDS
//   A PULL / OPEN QUESTIONS FOR LOG VERIFICATION" (raid deadlines, 6 open
//   questions).
// Open items: action/status ID confirmation, add gauge gains and wave
//   clock, queued marks when a player dies, penalty scope and portal
//   deadline, Mori center contact event, party routes/hand-bait formation
//   and Blue swap/invuln plan (all under the last section).
// ── END DIGEST ───────────────────────────────────────────────────────────
//
// -- VERIFIED AGAINST LOGS (2026-10-14) --
// A = L9BzKkD2nxcVgHTC: 22 pulls, kill A6 (9:40), wipes A1-A5 A7-A22.
// B = pG319BgHTnPJc6Ft: 19 pulls, kills B3 (9:42) and B10 (9:36).
// Both the user's static's, early progression (2025-08-22/23); nobody
// remembers the plan and there's no VOD. A7-A22 swap jobs pull to pull
// (A7-A9 ran five or six tanks), so role-gated rules skip those pulls.
//
// Clock (A6; every pull within ~1s): Blue Shockwave 0:15/0:19, Fear of
// Death 0:32, hands 0:35, Cold Grip 0:40/0:42, Memento Mori 0:52, hand lines
// 0:59, Smite 1:00, Soul Reaping 1:10/1:25, Fourfold 1:19, Fear 1:36, hands
// 1:39, Embrace 1:43, hand lines 1:50, Blue 1:55/1:59, Twofold 2:06, Grand
// Cross 2:21, towers 2:35/2:46, proximity 2:55, Neutron Ring 3:07, add
// waves 3:20-3:56, Darkness of Eternity 4:11 (hit 4:17), abyss ~4:25-5:15.
// Finale: Specter 5:26, Embrace 5:34, Cold Grip 5:42, Relentless Reaping
// 6:05 (four AOEs 6:24-6:33), Circle of Lives 6:43 (donuts 6:53-7:13),
// Soul Reaping 7:05, Fourfold 7:20, Mass Macabre 7:32 (portals to ~7:56),
// Mori 7:39, hands 7:46, Blue 7:51/7:55, Cold Grip 8:01, Relentless 8:24
// (AOEs 8:42-8:51), Fear 8:58, Circle 9:09 (donuts 9:19-9:34). All three
// kills ended at 9:36-9:42, before Mori #2: Grand Cross #2 and the enrage
// (44613) were never seen.
//
// IDs (the model's BM candidates held):
// - NO DAMAGE DOWN in this fight. Avoidables give Vulnerability Up
//   1001789; shared hits Magic Vulnerability Up 1002941; hand lines
//   Physical Vulnerability Up 1002940. So a survived avoidable is Minor.
// - Avoidables (all give Vulnerability Up): Fear of Death circles 44551 and
//   add-wave 44577, Existential Dread 44555, Cold Grip 44612, Memento Mori
//   44565/44566, delayed Choking Grasp 44567, add-wave lines 44579, Grand
//   Cross laser 44569 and puddles 44571, Circle of Lives 44600, Aetherblight
//   44608/45183/45184/45185.
// - Memento Mori's center: Bleeding 1003077 (Environment) on contact,
//   turning into the lethal 1003078 tick ~1.5s later (A3 +0:56, 2 died).
// - Fear of Death hands: Choking Grasp 44552, each cast-targeted at its
//   baiter. Smite of Gloom 44602, End's Embrace 44598, Grand Cross spread
//   44572 and Shock tower 44573: all cast-targeted, one per player.
//   Electrify 44574 = an empty tower (A4 +2:48, B5 +2:37, B6 +2:48).
// - Shockwave 44559 = Twofold's two light-party cones, 44560 = Fourfold's
//   four partner cones. Blue Shockwave 44593 is cast-targeted at the top
//   of enmity; Muted Struggle 44578 is the big hand's tank line.
// - Mass Macabre: Macabre Mark 44819 per soak, Spreading Fear 44596 = a
//   portal left unsoaked (raid hit plus Sustained Damage 1004149).
// - Darkness of Eternity: 44581 = success (to the abyss), 44582 = party
//   adds still alive (lethal to all, A9 A15 A16 A18 at 4:24).
// - Abyss: Doom 1004683 on everyone at 4:25-4:32, removed on escape. The
//   log shows only the logger's island: the other players' hands and
//   their deaths there have no events (killing blow 0). A second Doom later
//   = Invitation pulled them back in (also unnamed status 1004619 from the
//   Looming Specter): A6, A20, B9, B11, B18.
//
// Findings:
// - Blue Shockwave: the static swapped tanks in every kill. Failures: one
//   tank taking both (A19, B16), and the cone hitting the party: A17 +0:19
//   (six died, the second cone on the first tank), A21 +1:59, and clips of
//   one or two players, B3 +7:55 in a kill.
// - Hands: every kill resolution had all eight targeted once. One player
//   drawing two hands took the second line under Physical Vuln and usually
//   died (A2 +0:36, A3, A9, A12, A18, B1).
// - Shockwave cones: all eight in one cone in every kill resolution except
//   where the aiming healer was caught by Aetherblight (B10 +6:30, +8:48),
//   which left their partners out of the cone as fallout. Doubles kill.
// - Grand Cross: overlaps were mostly a spread-marked player in a tower or
//   two players sharing a tower (A4 A5 A9 A15 B2 B4 B9 B18), the second hit
//   under Magic Vuln lethal.
// - Abyss: deaths inside before escape (A20, B2 x2, B18). Invitation
//   re-jails ended in death 9-11s later every time but A20.
// - Mass Macabre: Spreading Fear in six B pulls and A5/A20. It killed five
//   in the kill B10 (7:58), which recovered. B11 +7:43 one player soaked
//   again under Magic Vuln.
// - Silent deaths: Grand Cross shrinks the arena to a 9y circle; B4 +2:52
//   and B6 +2:57 died off it. Other lone ones are unexplained (falls off
//   the main arena or lethal hits FFLogs dropped) and stay player-less.
//
// Cutoffs (every wipe but one has one): A 7 collapse, 6 mass deaths (A17's
// Blue Shockwave), 4 called wipes, 3 adds not killed; B 7 collapse, 7 mass
// deaths, 3 called wipes. A22 (0:40, four deaths) is unexplained: the user
// can Call Wipe it. Kills carry real avoidables, the Invitation death (A6),
// Blue Shockwave clips (B3: two died) and B10's unsoaked portal.
//
// -- RULES IMPLEMENTED --
// - ffxiv-necron-avoidable: the avoidables above, per player episode.
//   Minor; Major when it killed (no Damage Down exists).
// - ffxiv-necron-mori: Mori's center Bleeding; Major when its tick killed.
// - ffxiv-necron-hands: Fear of Death hands. With all eight alive, a player
//   drawing two names whoever baited none (4+ baiting none: player-less);
//   a line through another player names the baiter and the victim.
// - ffxiv-necron-spread: Smite of Gloom / End's Embrace overlaps (owner +
//   victim). ffxiv-necron-grand-cross: the same for Shock towers and Grand
//   Cross spreads together. ffxiv-necron-empty-tower: Electrify names the
//   tower-group player (not marked, no tower) when 1-2 are left, else
//   player-less.
// - ffxiv-necron-shockwave: a player in two cones, or in none (skipped when
//   the aimer took an Aetherblight hit: fallout).
// - ffxiv-necron-blue-swap (targeted: tanks): the same tank took both
//   cones, second not invulned; names the other tank (no Provoke).
//   ffxiv-necron-blue-cleave: 3+ non-tanks in a cone names the tank who
//   aimed it (player-less when the cast has no target); 1-2 names them.
//   ffxiv-necron-enmity: a cone on a non-tank with both tanks healthy,
//   player-less. Skipped unless there are exactly two tanks, both healthy.
// - ffxiv-necron-big-hand: a non-tank in Muted Struggle.
// - ffxiv-necron-macabre: Spreading Fear (player-less: no portal identity);
//   a soak under the last soak's Magic Vuln (the entrant).
// - ffxiv-necron-abyss: died in the abyss before escaping (Major, own
//   island). ffxiv-necron-invitation: pulled back in; Major if they died.
// - ffxiv-necron-fall: off the Grand Cross circle (Major); Walking Dead and
//   other lone silent deaths (player-less).
// - Raid: ffxiv-necron-adds, ffxiv-necron-mass-deaths (4+ non-raidwide
//   deaths within 2.5s, pull over within 60s), ffxiv-necron-enrage,
//   ffxiv-necron-called-wipe, ffxiv-necron-collapse (5 dead, over in 45s).
// Spreads and shares skip resolutions with 3+ dead (fallout). Exposure is
// everyone except blue-swap.
// Not built: which portal was missed or by whom (no portal identity in the
// log), abyss role failures (other islands invisible), Grand Cross
// proximity and Neutron Ring deaths (raw damage, mitigation), Relentless
// Reaping order, Invitation lane vs. donut blame, Grand Cross #2 and the
// enrage (never reached).
//
// -- GUIDE-DERIVED MODEL: NECRON --
// The Minstrel's Ballad: Necron's Embrace, Dawntrail 7.3; Extreme only.
// Research checked 2026-10-14. Comment-only; no Necron report analyzed,
// no observed failures, no detector/registration. LOG SIGNALS are predicted.
//
// -- SOURCES AND CONFIDENCE --
// [BM] awgil/BossMod's firsthand encounter data: Enums, States, ChokingGrasp,
// ColdGrip, GrandCross, Jail, MacabreMark, MementoMori and Shockwave.
// Last encounter change 799524b33be594900dbad984ebb4d2ef8325d47a,
// 2026-09-30. Candidate game IDs/geometry, not FFLogs verification:
// https://github.com/awgil/ffxiv_bossmod/tree/799524b33be594900dbad984ebb4d2ef8325d47a/BossMod.Modules/Dawntrail/Extreme/Ex5Necron
// [DATA] XIVAPI Action names checked for all IDs below; status names too:
// https://v2.xivapi.com/api/sheet/Action/44589?fields=Name
// https://v2.xivapi.com/api/sheet/Status/2941?fields=Name,Description
// [IV] Lyra's original guide, updated 2025-08-11; role-specific abyss,
// add counts and standard/uptime Mass Macabre:
// https://www.icy-veins.com/ffxiv/necrons-embrace-extreme-trial-guide
// [G8] Game8/Lucrezia original explanation, macro and mixed-action timeline:
// https://game8.jp/ff14/709448
// [JP] Published English translation of Lucrezia's macro, exact tower routes:
// https://xivjpraids.com/7.0_dawntrail/extreme_trials/necron/
// [NA] Current Hector/Sauce + uptime MM2 (melees right) PF conventions:
// https://naurffxiv.com/extreme/ageless-necropolis
// [SE] Patch 7.4 (2025-12-16): wipe-earned Echo +5%, max 25%, after >=3m
// combat. HP/damage thresholds and add-clear times differ from launch:
// https://na.finalfantasyxiv.com/lodestone/topics/detail/06944d892fd98cc00b2a28ff77edbafa4f7eef54/
// No mechanic-count/geometry hotfix established by researched sources.
// Thaliak's Necron page is unfinished, so supplies no usable timeline.
//
// -- LOG VOCABULARY AND SEVERITY --
// Controller casts, helper damage and penalties often share displayed names.
// IDs below are unverified candidates for their labeled event types. Game
// status 2941 -> candidate FFLogs 1002941; 2940 -> 1002940. These statuses
// are reused across encounters. Generic Vuln, Doom, Slow and Bleed IDs unknown.
// No source establishes Damage Down here: survived avoidable hits without
// it are Minor; attributable death/wipe causes Major. Verified Damage Down
// invokes README's Major exception. Raid is an inevitable-wipe cutoff.
// Name root causes, not clipped victims; assigned slots are absent from logs.
// Correctly executed damage deaths are mitigation issues; death-driven
// retargets/missing soakers and an abducted player's recovery are fallout.
// Icons, glowing arms, ring order, portals and arena changes may be absent
// from captured FFLogs streams. Victim position alone does not identify bait.
//
// -- SHAPE, CHRONOLOGY AND RESOURCES --
// Wall boss N; main arena center (100,100), 36y W/E x30y N/S [BM], fallable
// edges. Grand Cross reduces it to a 9y-radius central circle, then restores
// rectangle. Abyss is eight separate arenas; BM models each radius 9y.
// Opening -> Grand Cross #1 -> party adds -> individual abyss -> finale:
// Specter/Embrace/Cold Grip -> Reaping #1 -> Circle #1 -> Mass Macabre ->
// Cold Grip -> Reaping #2 -> Fear -> Circle #2 -> Mori/Smite/Cold Grip ->
// Grand Cross #2 -> Darkness of Eternity hard enrage. No boss-HP push found.
// Adds duty gauge reaches 100 -> wipe [G8]; gain/reset rate unknown. Killing
// all party adds permits return [IV]; BM budgets ~60s for that section.
// Solo Doom gives 50s to kill personal adds AND take jump pads to escape.
// No stacking boss resource or later soft enrage established.
// Approximate BM clock, accumulated from its state delays, NOT measured:
// +14/+18 Blue hits; +28 Fear, +31 puddles, +34 hand baits, +39/+41 Cold;
// +52 Mori, +58 hands, +59 Smite; +65/+80 Soul stores, +78/+125 resolves;
// +93 Fear, +103 Embrace, +109 hand lines, +114/+118 Blue; +140 Grand
// raidwide, +154/+165 towers, +174 proximity, +187 Neutron Ring;
// +201 party adds, reference +261 return, +278 Darkness hit/abyss entry.
// T = boss targetable after abyss; BM-derived finale offsets from T:
// +18 Invitation, +19 Embrace, +27/+29 Cold; +35 Reaping store,
// +53 Crop, +69/+72/+74/+77 four AOEs; +98/+103/+108/+113/+118 donuts,
// +125 Soul+stack; +132 Mass, +144 Mori, +170 hands, +175/+179 Blue;
// +186/+187 Cold; +193 Reaping, +211 Crop, +226/+229/+232/+235 AOEs;
// +242 Fear, +263/+268/+273/+278 donuts; +285 Mori/+292 Smite;
// +301/+302 Cold; +314 Grand, +328/+339 towers, +348 proximity,
// +360 Neutron Ring; enrage cast T+370, resolution T+380 (~6m20s later).
// G8 lists final Darkness at 11:17 without distinguishing cast/resolution;
// its later timeline is inconsistent with BM's accumulated offsets. Neither
// is a verified absolute enrage. Add-clear/abyss timing dependencies remain
// provisional; early individual returns need not start the boss clock.
//
// -- ASSIGNMENTS AND STRATEGY VARIANCE --
// No static/roster supplied. Examples are community plans, not user duties.
// Standard G1=MT/H1/M1/R1 west, G2=OT/H2/M2/R2 east; partners T+M, H+R.
// Fear's horizontal formation: north W->E MT/M1/M2/OT, south R1/H1/H2/R2
// [IV]. G8 also shows a vertical formation: adapt the assigned hand map.
// JP's generic spread macro instead gives south H1/R1/R2/H2; it is not the
// same hand-bait convention. Bait away from party, close to assigned hand.
// Mori: both tanks dark; six others light, M1/M2 front, H1/H2 middle,
// R1/R2 rear. Slide W/E with light/dark, preserve within-side order [JP].
// Grand Cross JP color pairs MT/M1 NW->N, OT/M2 NE->E, H2/R2 SE->S,
// H1/R1 SW->W; marked player out, unmarked player soaks. Other color maps
// are valid. Reaping positions depend on the stored AOE, not one clock map.
// Blue: swap between hits or invuln both; neither plan itself is an error.
// Mass Macabre standard [IV]: first north4 tanks+melees, south4 healers+
// ranged; then T/M north pairs, H/R south pairs; west non-tanks take rear
// then front triples, east front then rear, avoiding the current tank cone.
// Uptime MM2 [NA/JP]: both melees E, both ranged W; healers bridge groups.
// JP tower labels: 1 north4, 2 south4, 3/5 W upper/lower pairs,
// 4/6 E upper/lower pairs; triples 9 NW, 7 NE, 8 SW, 10 SE.
// MT 1->5->buster NW; OT 1->6->buster NE;
// H1 2->5->8->10; H2 2->6->7->9;
// M1+M2 1->4->7->9; R1+R2 2->3->8->10. Order = 4,2,3,3 per non-tank.
// These routes intentionally cross sides; standard light-party deviations
// are not errors under uptime. Waymark layouts also vary [NA].
//
// -- BLUE SHOCKWAVE [BM, DATA] --
// Candidates: controller cast 44592 (6s), repeat controller 44594,
// damage 44593 TWICE ~4.1s apart, 100y/100-degree full-angle magic cones.
// Correct play: target tanks aim from NW/NE edge away from center party;
// OT provokes during cast for swap plan. First victim gets Magic Vuln.
// Failure: both hits without protection -> LOG SIGNAL: repeated damage on
// same tank under Magic Vuln, lethal second hit; FAULT: swap duty only if
// plan/target history proves it; CONSEQUENCE: Major. Clip -> extra victims;
// tank aim vs wandering party needs positions; Minor/Major by consequence.
// Removal: vuln expires; no cleanse resolution. Not errors: tank damage,
// invuln double hits, or raw mitigation death with correct execution.
//
// -- FEAR OF DEATH / CHOKING GRASP / THE END'S EMBRACE --
// Candidates [BM]: Fear raid cast/damage 44550 (5s), spawn-circle damage
// 44551 (3s); bait damage Choking Grasp 44552 (instant); Embrace controller
// 44597 (4s), personal damage 44598; delayed Grasp cast/damage 44567 (3s).
// What happens: eight 3y spawn circles -> eight untargetable hands -> each
// hits nearest player with a 24y x6y physical line ~2.7s after spawn.
// Correct play: bait one line outward, take own hit. Embrace drops eight
// 3y personal hits/hands; nearest bait locks ~2.3s after hand animation,
// then three-second telegraph permits dodge. Reuse safe outer drop spots.
// Failure: wrong bait/double line -> LOG SIGNAL: multiple Grasp hits under
// Physical Vuln; FAULT: baiter vs bystander needs assigned-hand/source link;
// CONSEQUENCE: Minor if survived, Major if death/wipe caused. Delayed line
// or spawn-circle contact -> own avoidable hit, same consequence scale.
// Removal: hands attack once; G8 says hand locations are traversable after
// spawning, not permanent damaging pools. Drop/death retarget unresolved.
// Not errors: Fear raidwide, own INSTANT bait, own Embrace drop/brief vuln.
//
// -- COLD GRIP / EXISTENTIAL DREAD [BM] --
// Candidates: controllers 44553 left safe / 44554 right safe (5s);
// side cast/damage 44612 (6s), widened follow-up 44555 (1s helper cast).
// What happens: two 12y-wide side strips -> ~1.6s later dark/glowing side
// widens to 24y. BM highlights a ~2y strip centered x=95 or105 for start.
// Correct play: dodge first strips near middle on safe side, then move
// farther into non-glowing side before follow-up. No player aims these.
// Failure: hit -> LOG SIGNAL: Cold Grip/Existential Dread damage/penalty;
// FAULT: hit player if avoidable; CONSEQUENCE: Minor, Major if lethal/wipe.
// Removal: scripted hits. Not errors: crossing first strip after it resolves.
//
// -- MEMENTO MORI / SMITE OF GLOOM [BM, JP] --
// Candidates: Mori cast/damage 44565 dark R /44566 dark L (5s), fixed hand
// lines 44567; Smite controller 44601, damage 44602 (4s), radius 10y.
// What happens: center 12y strip persists ~16s; hands face outward from it.
// Light has one line, dark four, leaving six light/two dark spread spots.
// Correct play: assigned 6:2 split, dodge fixed 6y-wide hand lines, isolate
// personal Smite. Mass Macabre reuses center/hand lines without eight Smites.
// Failure: center/hand hit -> LOG SIGNAL: Mori/Grasp damage; FAULT: hit
// player; Minor/Major. Smite overlap -> extra hits under Magic Vuln;
// FAULT: misplaced carrier only with slot evidence; Minor/Major by outcome.
// Removal: center zone disappears via arena effect; no dispel objective.
// Not errors: own Smite/Magic Vuln, or dark-side tank positioning.
//
// -- SOUL REAPING / AETHERBLIGHT / TWO-FOLD OR FOUR-FOLD STACKS --
// Candidates [BM]: store 44556 (4s), Twofold 44557/Fourfold 44558 (5s);
// Aetherblight controllers 44561/44562/44563/44607; helper cast/damage
// sides 44608, middle 45185, circle 45183, donut 45184 (1s each);
// shared Shockwave damage 44559 parties /44560 pairs, NOT Blue Shockwave.
// What happens: store a visual shape, later resolve it alongside unmarked
// shared 100y/20-degree full-angle cones. Twofold: healers aim two 4-player
// splits; Fourfold: four supports or four DPS aim two-player splits.
// Opening guides show middle/sides; all four shapes appear in later Reaping.
// Correct play: circle radius20 -> out; donut safe inside16 -> in; middle
// strip width12 -> sides; side strips centered x88/112 width12 -> center.
// Keep cones distinct, stand with partner/light party in actual safe shape.
// Failure: Aetherblight hit -> damage/penalty on avoider; FAULT: hit player;
// Minor/Major. Wrong share/overlap -> excess Shockwave hits under Magic
// Vuln or lethal split damage; FAULT: misplaced aimer/soaker with evidence;
// Minor/Major. No distinct under-soak penalty name established.
// Removal: stored shape consumed by hit; no dispellable player storage aura.
// Not errors: own shared Shockwave/Magic Vuln or later resolution of storage.
//
// -- GRAND CROSS / SHOCK / ELECTRIFY / NEUTRON RING [BM] --
// Candidates: Grand raid cast/damage 44568 (7s), arena helper 44604 (blank
// DATA name); laser 44569 (0.5s, width4), proximity 44570 (4s), bait puddle
// 44571 (3s, radius3), personal spread 44572 (5s, radius3); Shock tower
// 44573 (5s, radius3); EMPTY-TOWER PENALTY Electrify damage 44574;
// Neutron Ring controller 44575 (7s), damage 44576 ~2.6s after cast end.
// What happens: circle arena; two batches of four one-player towers plus
// four spreads on opposite role group. Roles and cardinal/intercardinal
// tower positions alternate.
// Correct play: bait puddles away from future safe edges; dodge two laser
// sweeps before moving to tower/spread; marked players cannot soak. Finish
// by escaping proximity axes to intercardinal rim; then heal Ring [G8].
// Failure: empty tower -> LOG SIGNAL: Electrify raid damage; FAULT: assigned
// living soaker only with tower identity; Minor if recoverable without DD,
// Major attributable death/wipe, Raid only if unresolvable. Wrong-role soak
// /overlap -> extra magic hits under vuln; same fault/consequence rule.
// Laser/puddle/too-near proximity -> their distinct Grand Cross hit IDs;
// FAULT: avoider absent misplaced-bait evidence; Minor/Major by outcome.
// Removal: Ring restores floor; death off removed edges may lack an ability.
// Not errors: Grand raidwide, own Shock/spread, surviving proximity, Ring.
//
// -- PARTY ADD WAVES / DARKNESS OF ETERNITY [BM, IV] --
// Candidates: Fear spawn-circle 44577; Icy Hands OID0x4911, Grasp44579;
// Beckoning Hands OID0x4912, Muted Struggle44578 (both 3s, 24y x6y);
// Darkness controller44580 (10s), success damage44581 ~6.4s after end,
// FAILED-ADD-CHECK penalty damage44582. Same name, distinct outcomes.
// What happens: four waves of THREE small hands; one big hand in waves2/3
// =12 small+2 big total. Big hand busters its enmity target; no revival or
// on-death explosion described. Kill all before gauge100; tank big adds,
// face busters outward, dodge small-hand lines and spawn circles.
// Failure: unfinished adds -> LOG SIGNAL:44582/mass deaths; FAULT: collective,
// CONSEQUENCE:Raid. Avoidable line hit ->44579 damage, Minor/Major. Big-hand
// clip ->44578 extra victims, fault depends on aimer/position, Minor/Major.
// Removal: add death removes its attacks; success hit still occurs and
// transfers players to abyss. Not errors: intended busters/success raidwide.
//
// -- INDIVIDUAL ABYSS / DOOM / ROLE-SPECIFIC HANDS [BM, IV] --
// Candidates: transfer Inevitability44583; DPS hands OID0x490D, avoidable
// Grasp44584 (3s), Spreading Fear44585 (10s enrage); tank hand OID0x490F,
// Spreading Fear44586 (5s INTERRUPTIBLE), targeted Grasp44587 (5s);
// healer hand OID0x490E, Necrotic Pulse44588 (Bleed), Chilling Fingers44589
// (5s Slow), unavoidable Grasp44590 (4s). Player aura/tick IDs unknown.
// Correct play: tank interrupts own hand and mitigates; healer heals self
// through Bleed/Grasp, Esunas own Slow and damages hand; DPS dodges lines,
// damages BOTH hands and kills the one casting enrage first. Tanks/healers
// get one hand, DPS two. After kills, use pads/exit light before 50s Doom.
// Failure: missed interrupt/completed enrage ->44586/44585 cast and damage;
// FAULT: isolated tank/DPS, Major if it kills. Miss escape -> Doom expires
// beside personal death; FAULT: player only if actual avoidable delay known,
// not automatically individual DPS blame; Major attributable, not Raid alone.
// Removal: escape clears Doom; expiry kills. Slow cleansable, Bleed handled
// by healing; exact expiry/death effects unknown. Not errors: own Necrotic
// Pulse/Grasp damage or variable escape times; no cross-island blame.
//
// -- SPECTER OF DEATH / INVITATION / CIRCLE OF LIVES [BM] --
// Candidates: Specter controller44606 (5s), Invitation visual44591,
// helper cast/damage44818 (5s, 36y x10y); Circle controller44599 (4s),
// Azure Aether donut44600 (7s, safe radius3 / danger to50), OID0x49B0.
// What happens: Invitation lanes abduct hit players back to individual
// abyss [IV]. First post-abyss pattern leaves one safe row for Embrace.
// Circle #1: five sequential donuts, center+four outer locations, ~5s apart;
// Invitation between donuts2/3. Circle #2: four inner intercardinal donuts,
// Invitation restricts donut safe spots during donuts2/4.
// Correct play: enter next donut's 3y safe center after prior hit, dodge
// Invitation too; never rush into next safe circle through an active lane.
// Failure: donut/lane hit ->44600/44818 damage and for lane, displacement
// /Doom reapplication; FAULT: avoider; Minor/Major by consequence. Forced
// re-jail can cost long uptime even if survived, but alone is not Raid.
// Removal: waves finish once. IV's recovery is deliberate death for return
// and raise: fallout of Invitation, not a second error. Not errors: recovery.
//
// -- RELENTLESS REAPING / CROP ROTATION / SEASONS [BM] --
// Candidates: Relentless44564 (15s), Crop44610 (3s), Second Season45167
// /Fourth Season45168 (8s); resolves same Aetherblight/ Shockwave IDs above.
// What happens: store all FOUR shapes, each numbered; rotation changes
// starting number, preserves cyclic order. Start at bottom indicator, go
// clockwise. First AOE ~1.2s after Season, then ~2.8s apart; fourth shares
// light parties for Second or partners for Fourth. TWO full sets in finale.
// Correct play: remember shapes/order and resolve final share in its safe
// zone. Failure: wrong shape/share -> associated hit IDs/vuln/extra hits;
// FAULT: mover vs misplaced cone aimer as above; Minor/Major by outcome.
// Removal: four shapes consumed in order. Not errors: waiting/moving out
// for geometry, or different chosen start markers/memory aids.
//
// -- MASS MACABRE / MACABRE MARK / SPREADING FEAR [BM, JP] --
// Candidates: controller44595 (4s), correct soak damage44819; MISSED-PORTAL
// penalty Spreading Fear44596. Player Magic Vuln2941 /1002941 lasts ~5s[IV].
// What happens: TEN 3y portals: two4-person at (100,94)/(100,106), four
// 2-person at (85/115,97/103), four3-person at (91/109,88/112) [BM].
// Exact simultaneous count triggers clearing, not a cumulative headcount.
// BM predicts ~30s deadline from portal spawn; overlap Mori hands/Blue.
// Correct play: execute chosen 4->2->3->3 route, wait out Magic Vuln before
// next soak; both tanks stop after two-person portal to aim Blue away.
// Failure: leftover portal ->44596 cast/damage, FAULT: missing live assigned
// member only if portal/order identified; Major if attributable death/wipe,
// Raid if unresolvable. Wrong count may leave portal pending, not immediate
// penalty. Premature repeat ->44819 damage under vuln, FAULT: early entrant,
// Minor/Major by consequence. Removal: correct count consumes portal;
// unresolved portal spawns its hand/penalty. Not errors:44819 own soak,
// intentional vuln, waiting for expiry, crossover under uptime plan.
//
// -- WHAT ENDS A PULL / OPEN QUESTIONS FOR LOG VERIFICATION --
// Raid deadlines: party adds gauge100/44582; final Darkness44613 (10s cast,
// distinct from success44581), BM predicts T+380. Missed Macabre/Grand towers
// can end a pull but exact survivability/penalty debuffs unverified. Solo
// failure or one Invitation is recoverable; no automatic Raid classification.
// 1. Confirm action/status IDs, generic Vuln vs any Damage Down, Doom/Slow/
//    Bleed duration and tick IDs, all damage types and split damage scaling.
// 2. Settle add gauge gains, wave spawn clock, kill-vs-timer return, solo
//    reappearance trigger, and conflicting published absolute enrage times.
// 3. What happens to queued marks/hands when their player dies? Does re-jail
//    repeat full role encounter/Doom; how does death return/raise appear?
// 4. Confirm 44574/44596/44582 penalty scope and portal deadline, wrong-count
//    behavior, and whether all portal failures merit a Raid cutoff in practice.
// 5. Is Mori center contact a distinct damage/DoT event? Are hand spawn spots
//    harmless after spawn as G8 states; what marks each instant bait's owner?
// 6. Can captured events identify storage/rotation, Invitation source/lane,
//    tower position and personal-island escape? Pin actual party routes,
//    hand-bait formation, slot map and Blue swap/invuln plan before attribution.

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import type { ReportedOccurrence } from "@/lib/mechanics/occurrences";
import { kFmt, sec, joinNames, playerError, playerlessMinor, raidMarker, rezzedAt, clusterByGap, debuffIntervals, RAID_MARKER_SORT_OFFSET_MS } from "@/lib/mechanics/wow/common";

export const NC_AVOIDABLE_RULE_ID   = "ffxiv-necron-avoidable";
export const NC_MORI_RULE_ID        = "ffxiv-necron-mori";        // Memento Mori's center (Bleeding)
export const NC_HANDS_RULE_ID       = "ffxiv-necron-hands";       // Fear of Death hand baits
export const NC_SPREAD_RULE_ID      = "ffxiv-necron-spread";      // Smite of Gloom / End's Embrace overlaps
export const NC_CROSS_RULE_ID       = "ffxiv-necron-grand-cross"; // Shock towers + Grand Cross spreads
export const NC_EMPTY_TOWER_RULE_ID = "ffxiv-necron-empty-tower"; // Electrify
export const NC_SHARE_RULE_ID       = "ffxiv-necron-shockwave";   // Twofold / Fourfold shared cones
export const NC_BLUE_SWAP_RULE_ID   = "ffxiv-necron-blue-swap";   // Blue Shockwave tank swap
export const NC_BLUE_CLEAVE_RULE_ID = "ffxiv-necron-blue-cleave"; // Blue Shockwave on non-targets
export const NC_BIG_HAND_RULE_ID    = "ffxiv-necron-big-hand";    // Muted Struggle bystanders
export const NC_ENMITY_RULE_ID      = "ffxiv-necron-enmity";      // a tank attack on a non-tank
export const NC_MACABRE_RULE_ID     = "ffxiv-necron-macabre";     // Mass Macabre portals
export const NC_ABYSS_RULE_ID       = "ffxiv-necron-abyss";       // died in the individual abyss
export const NC_INVITATION_RULE_ID  = "ffxiv-necron-invitation";  // pulled back into the abyss
export const NC_FALL_RULE_ID        = "ffxiv-necron-fall";
export const NC_ADDS_RULE_ID        = "ffxiv-necron-adds";        // party adds alive at Darkness of Eternity
export const NC_MASS_DEATHS_RULE_ID = "ffxiv-necron-mass-deaths";
export const NC_ENRAGE_RULE_ID      = "ffxiv-necron-enrage";
export const NC_CALLED_WIPE_RULE_ID = "ffxiv-necron-called-wipe";
export const NC_COLLAPSE_RULE_ID    = "ffxiv-necron-collapse";

// Blue Shockwave, Fear of Death, Soul Reaping: every pull opens with them.
const SIGNATURE        = [44592, 44550, 44556];
const WALKING_DEAD     = 1000811; // Dark Knight's Living Dead follow-up
const WALKING_DEAD_FULL_MS = 9500;
const BLUE_SHOCKWAVE   = 44593;
const GRASP_BAIT       = 44552;   // Fear of Death's hands, cast-targeted at their baiter
const SMITE            = 44602;
const EMBRACE          = 44598;
const CROSS_SPREAD     = 44572;
const SHOCK            = 44573;
const ELECTRIFY        = 44574;
const GRAND_CROSS      = 44568;
const NEUTRON_RING     = 44576;
const SHOCKWAVE_PARTY  = 44559;   // Twofold Blight: two light-party cones
const SHOCKWAVE_PAIR   = 44560;   // Fourfold Blight: four partner cones
const MUTED_STRUGGLE   = 44578;
const MACABRE_MARK     = 44819;
const SPREADING_FEAR   = 44596;   // a Mass Macabre portal left unsoaked
const ADD_FAIL         = 44582;   // Darkness of Eternity with party adds alive
const ENRAGE           = 44613;
const DOOM             = 1004683; // the individual abyss's 50s timer
const MAGIC_VULN       = 1002941;
const MORI_BLEED       = 1003077; // standing in Memento Mori's center
const MORI_BLEED_LETHAL = 1003078;
// Raid-wide or tank damage: deaths to these are mitigation, never part of a
// mass-death cutoff.
const RAIDWIDE = [44550, GRAND_CROSS, 44570, NEUTRON_RING, 44581, ADD_FAIL, 44615, MUTED_STRUGGLE];

// Avoidable hits. The fight hands out no Damage Down (Vulnerability Up
// 1001789 instead), so a survived hit is Minor and a lethal one Major.
type Avoidable = { name: string; why: string };
const AVOIDABLE: Record<number, Avoidable> = {
  44551: { name: "Fear of Death", why: "Fear of Death's eight circles mark where the hands rise; step out of the circles before they go off." },
  44577: { name: "Fear of Death", why: "Each add wave rises from Fear of Death circles; step out of the circles before they go off." },
  44555: { name: "Existential Dread", why: "Cold Grip's first strips widen into Existential Dread on the glowing side; move further into the dark side after the first hit." },
  44612: { name: "Cold Grip", why: "Cold Grip hits both sides of the arena; stand in the middle strip on the safe side, then move away from the glowing side." },
  44565: { name: "Memento Mori", why: "Memento Mori's line runs down the middle of the arena; stand clear of it on your side." },
  44566: { name: "Memento Mori", why: "Memento Mori's line runs down the middle of the arena; stand clear of it on your side." },
  44567: { name: "Choking Grasp", why: "The hands left by The End's Embrace and Memento Mori fire their lines a few seconds later; get out of every hand's line." },
  44579: { name: "Choking Grasp", why: "The small Icy Hands of the add waves fire lines; get out of their lines while killing them." },
  44569: { name: "Grand Cross", why: "Grand Cross's two lasers sweep the circle; dodge both sweeps before going to your tower or spread spot." },
  44571: { name: "Grand Cross", why: "Grand Cross drops puddles under each player; move off your spot as soon as they're baited." },
  44600: { name: "Circle of Lives", why: "Each Circle of Lives donut is safe only in its small center; step into the next center after the previous one goes off." },
  44608: { name: "Aetherblight", why: "Soul Reaping stores the shape Aetherblight hits; the side strips mean stand in the middle." },
  45185: { name: "Aetherblight", why: "Soul Reaping stores the shape Aetherblight hits; the middle strip means go to the sides." },
  45183: { name: "Aetherblight", why: "Soul Reaping stores the shape Aetherblight hits; the circle means get out." },
  45184: { name: "Aetherblight", why: "Soul Reaping stores the shape Aetherblight hits; the donut means get in close." },
  44584: { name: "Choking Grasp", why: "In the abyss, dodge your hands' lines while killing them." },
};

// One instance per player: a player hit by another player's instance, or by
// two at once, is an overlap (both named; README philosophy 3).
type Spread = { name: string; ids: number[]; what: string; why: string; ruleId: string };
const SPREADS: Spread[] = [
  { name: "Smite of Gloom", ids: [SMITE], what: "spread", ruleId: NC_SPREAD_RULE_ID,
    why: "Memento Mori's Smite of Gloom marks all eight players; spread to your own spot on your side, away from the hand lines." },
  { name: "The End's Embrace", ids: [EMBRACE], what: "drop", ruleId: NC_SPREAD_RULE_ID,
    why: "The End's Embrace drops a circle and a hand on every player; drop yours away from the others." },
  { name: "Grand Cross", ids: [CROSS_SPREAD, SHOCK], what: "spread or tower", ruleId: NC_CROSS_RULE_ID,
    why: "Grand Cross gives one group the towers and the other the spreads; each tower takes one player and the marked players stay out of the towers." },
];

// Split cones: each player takes exactly one; every living player belongs in one.
type Share = { name: string; ids: number[]; what: string; why: string; ruleId: string };
const SHARES: Share[] = [
  { name: "Shockwave", ids: [SHOCKWAVE_PARTY], what: "light-party cone", ruleId: NC_SHARE_RULE_ID,
    why: "Twofold Blight aims two cones at the healers; each light party stacks in its own cone, in the stored safe zone." },
  { name: "Shockwave", ids: [SHOCKWAVE_PAIR], what: "partner cone", ruleId: NC_SHARE_RULE_ID,
    why: "Fourfold Blight aims four cones at one role; pair up so every player shares exactly one, in the stored safe zone." },
];

// FFLogs logs the death event ~2.0s after the fatal hit (README).
const DEATH_EVENT_LAG_MS = 2000;
const DIED_FROM_HIT_MS   = 3000;
const EPISODE_MS         = 3000;
const RAISE_GRACE_MS     = 10_000;
const TANK_ENMITY_LOST_MS = 30_000;
// With this many dead, a share's or spread's layout is fallout.
const DOOMED_DEAD        = 3;
// So many players baiting no hand is no plan at all, not one player's slip.
const HANDS_UNPLANNED    = 4;
// Deaths to one moment's mechanics that end the pull: 4+ within
// MASS_WINDOW_MS and the pull over within a minute (A17 Blue Shockwave 6,
// B7 Shockwave 6). The kill B10 lost five to Spreading Fear at 7:58 and
// recovered: the pull-end window is what keeps it out.
const MASS_DEATHS        = 4;
const MASS_WINDOW_MS     = 2500;
const MASS_END_MS        = 60_000;
const CALLED_WIPE_END_MS = 12_000;
const CALLED_WIPE_COUNT  = 3;
const CALLED_WIPE_WINDOW = 10_000;
const CALLED_WIPE_PAIR_MS = 5_000;
// 5 dead with the pull over within 45s. A15, A16 and A18 carried on 88-100s
// with 5 dead (into the add check); B2 and B7 ended 55s after (mass deaths
// covers both); every other 5-dead moment ended within 31s.
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
const byName = (players: PlayerInfo[], name?: string) => (name ? players.find((p) => p.name === name) : undefined);

function tankOutRecently(life: Life, p: PlayerInfo, t: number): boolean {
  return !life.hitAlive(p, t) || life.outIntervals.some((w) => w.p === p && w.start <= t && w.end >= t - TANK_ENMITY_LOST_MS);
}

/** Exactly two tanks, both alive and holding enmity at `t` (otherwise targets move as fallout). */
function tanksHealthy(players: PlayerInfo[], life: Life, t: number): boolean {
  const tanks = players.filter(isTank);
  return tanks.length === 2 && tanks.every((p) => !tankOutRecently(life, p, t));
}

/** Raised within RAISE_GRACE_MS before `t` (or still out at `t`). */
function inRaiseGrace(life: Life, p: PlayerInfo, t: number): boolean {
  return !life.hitAlive(p, t) || life.outIntervals.some((w) => w.p === p && w.end <= t && t - w.end < RAISE_GRACE_MS);
}

/** Took a listed avoidable hit within 2s of `t`: already flagged for it. */
function inAvoidable(p: PlayerInfo, t: number): boolean {
  return p.damageTaken.some((e) => AVOIDABLE[e.abilityId] && Math.abs(e.timestamp - t) <= 2000 && (e.amount ?? 0) > 0);
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
      const names = uniq(kinds.map((k) => k.name));
      errors.push(playerError(p, {
        ruleId: NC_AVOIDABLE_RULE_ID, severity: death ? "Major" : "Minor", name: `Hit by ${names.join(" / ")}`,
        description: `Hit by ${joinNames(names)} (${g.length > 1 ? `${g.length} hits, ` : ""}${amountText(g)}), with Vulnerability Up.${death ? " They died." : ""} ${uniq(kinds.map((k) => k.why)).join(" ")}`,
        timestamp: g[0].timestamp, abilityId: g[0].abilityId, abilityName: g[0].abilityName,
      }));
    }
  }
  return errors;
}

/**
 * Memento Mori leaves its center strip for ~16s. Standing in it gives
 * Bleeding 1003077, which turns into the lethal 1003078 tick ~1.5s later
 * (A3 +0:56: two players died to it).
 */
function detectMori(players: PlayerInfo[], life: Life): PullError[] {
  const errors: PullError[] = [];
  for (const p of players) {
    const applies = p.debuffs.filter((e) => e.abilityId === MORI_BLEED && e.debuffStatus === "applied" && life.hitAlive(p, e.timestamp));
    for (const g of clusterByGap(applies, (e) => e.timestamp, 20_000)) {
      const t = g[0].timestamp;
      const lethal = p.damageTaken.find((e) => e.abilityId === MORI_BLEED_LETHAL && e.timestamp >= t && e.timestamp <= t + 8000);
      const death = lethal ? life.diedFrom(p, lethal.timestamp) : undefined;
      errors.push(playerError(p, {
        ruleId: NC_MORI_RULE_ID, severity: death ? "Major" : "Minor", name: "Stood in Memento Mori",
        description: `Stood in the center strip Memento Mori leaves behind and got its Bleeding${death ? ", and died to it" : ""}. The center stays deadly for ~16s after Memento Mori; stay on your side of it.`,
        timestamp: t, abilityId: MORI_BLEED, abilityName: "Bleeding",
      }));
    }
  }
  return errors;
}

// ── Fear of Death hands ─────────────────────────────────────────────────────

/**
 * Fear of Death's eight hands each target the nearest player (the cast
 * target) and fire a line at them. Every kill resolution had all eight
 * players targeted once. A player who drew two hands took the second line
 * under Physical Vulnerability Up, usually lethally (A2 +0:36, A10 +0:36);
 * the root cause is whoever baited no hand (PITFALLS: name whoever baited
 * nothing). A player hit by another player's line is an overlap: both are
 * named. Skipped unless all eight are alive (the hands retarget).
 */
function detectHands(players: PlayerInfo[], life: Life, casts: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const g of clusterByGap(castsOf(casts, GRASP_BAIT), (c) => c.timestamp, 1000)) {
    const t = g[0].timestamp;
    const alive = players.filter((p) => life.hitAlive(p, t));
    if (alive.length < players.length) continue;
    const owner = new Map<string, PlayerInfo>();
    const drawn = new Map<PlayerInfo, number>();
    for (const c of g) {
      const p = byName(players, c.target);
      if (!p) continue;
      owner.set(`${c.actorName}#${c.sourceInstance}`, p);
      drawn.set(p, (drawn.get(p) ?? 0) + 1);
    }
    const res = hitsOf(players, life, GRASP_BAIT).filter((h) => h.e.timestamp >= t - 500 && h.e.timestamp <= t + 3000);
    // A hand logged without its target: the one player it hit who no other
    // hand hit (A15 +0:36).
    for (const k of uniq(res.map((h) => `${h.e.source}#${h.e.sourceInstance}`))) {
      if (owner.has(k)) continue;
      const hit = uniq(res.filter((h) => `${h.e.source}#${h.e.sourceInstance}` === k).map((h) => h.p));
      const only = hit.filter((p) => !res.some((h) => h.p === p && `${h.e.source}#${h.e.sourceInstance}` !== k));
      if (only.length === 1) {
        owner.set(k, only[0]);
        drawn.set(only[0], (drawn.get(only[0]) ?? 0) + 1);
      }
    }
    const multi = [...drawn].filter(([, n]) => n >= 2).map(([p]) => p);
    if (multi.length) {
      const none = alive.filter((p) => !drawn.has(p) && !inRaiseGrace(life, p, t));
      const killed = multi.filter((p) => killedBy(life, res, p, [GRASP_BAIT]));
      const drewText = multi.map((p) => `${p.name} drew ${drawn.get(p)}`).join(", ");
      const deathText = killed.length ? ` ${namesOf(killed)} died.` : "";
      const why = "Each player stands by their own Fear of Death circle so its hand targets them, and baits the line outward.";
      if (none.length >= HANDS_UNPLANNED) {
        errors.push(playerlessMinor(NC_HANDS_RULE_ID, "Hands Not Spread",
          `${none.length} players baited no Fear of Death hand (${drewText}).${deathText} ${why}`, t, GRASP_BAIT, "Choking Grasp"));
      } else {
        for (const p of none) {
          errors.push(playerError(p, {
            ruleId: NC_HANDS_RULE_ID, severity: killed.length ? "Major" : "Minor", name: "Baited No Hand",
            description: `No Fear of Death hand targeted them, so ${drewText} hands and took the extra line under Physical Vulnerability Up.${deathText} ${why}`,
            timestamp: t, abilityId: GRASP_BAIT, abilityName: "Choking Grasp",
          }));
        }
      }
    }
    // Lines through other players.
    const pairs = new Map<string, { victim: PlayerInfo; baiter: PlayerInfo; h: Hit }>();
    for (const h of res) {
      const o = owner.get(`${h.e.source}#${h.e.sourceInstance}`);
      if (!o || o === h.p || inRaiseGrace(life, h.p, t) || (h.e.amount ?? 0) <= 0) continue;
      pairs.set(`${h.p.name}|${o.name}`, { victim: h.p, baiter: o, h });
    }
    for (const { victim, baiter, h } of pairs.values()) {
      const d = life.diedFrom(victim, h.e.timestamp);
      const sev = d ? "Major" : "Minor";
      const why = "Bait your hand's line away from the party, and keep out of the other hands' lines.";
      errors.push(playerError(victim, {
        ruleId: NC_HANDS_RULE_ID, severity: sev, name: "Hit by Another Hand's Line",
        description: `Hit by the Choking Grasp line of ${baiter.name}'s hand (${amountText([h.e])}).${d ? " They died." : ""} ${why}`,
        timestamp: t, abilityId: GRASP_BAIT, abilityName: "Choking Grasp",
      }));
      errors.push(playerError(baiter, {
        ruleId: NC_HANDS_RULE_ID, severity: sev, name: "Hand Line Hit Another Player",
        description: `Their Fear of Death hand's line also hit ${victim.name} (${amountText([h.e])}).${d ? ` ${victim.name} died.` : ""} ${why}`,
        timestamp: t, abilityId: GRASP_BAIT, abilityName: "Choking Grasp",
      }));
    }
  }
  return errors;
}

// ── overlapping spreads ─────────────────────────────────────────────────────

/**
 * Smite of Gloom, The End's Embrace and Grand Cross (towers plus spreads):
 * one instance per player. The owner of an instance is its cast target, else
 * the only player it hit, or the one player it hit who took nothing else. A
 * player hit by an instance that isn't theirs, or by two, overlapped; the
 * owner and the victim are both named. The second hit comes under Magic
 * Vulnerability Up and usually kills.
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
        const p = byName(players, c.target);
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
          const what = (k: string) => (k.startsWith(`${SHOCK}|`) ? "Shock tower" : k.startsWith(`${CROSS_SPREAD}|`) ? "Grand Cross spread" : `${fam.name} ${fam.what}`);
          const kinds = [...(byPlayer.get(p) ?? [])].map((k) => `${owners.get(k) === p ? "their own" : owners.get(k) ? `${owners.get(k)!.name}'s` : "a"} ${what(k)}`);
          const description = victim
            ? `Hit by ${joinNames(kinds)}${others.length ? ` (with ${namesOf(others)})` : ""}.`
            : `Their ${what([...(byPlayer.get(p) ?? [])][0] ?? "")} also hit ${namesOf(others)}.`;
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

/**
 * Grand Cross's Electrify: a Shock tower nobody stood in hits the raid. The
 * tower group is every living player not marked for a spread in that batch;
 * the one of them no tower took was missing (A4 +2:48).
 */
function detectEmptyTowers(players: PlayerInfo[], life: Life, casts: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const res of clusterByGap(hitsOf(players, life, ELECTRIFY), (h) => h.e.timestamp, 1500)) {
    const t = res[0].e.timestamp;
    const batch = casts.filter((c) => (c.abilityId === SHOCK || c.abilityId === CROSS_SPREAD) && c.timestamp >= t - 6000 && c.timestamp <= t);
    const marked = new Set(batch.filter((c) => c.abilityId === CROSS_SPREAD).map((c) => c.target));
    const soaked = new Set(batch.filter((c) => c.abilityId === SHOCK).map((c) => c.target));
    const missing = players.filter((p) => !marked.has(p.name) && !soaked.has(p.name) && life.hitAlive(p, t - 2500) && !inRaiseGrace(life, p, t - 2500));
    const died = uniq(res.filter((h) => life.diedFrom(h.p, t)).map((h) => h.p));
    const deathText = died.length ? ` ${namesOf(died)} died.` : "";
    const why = "Every Shock tower needs one player from the tower group; a tower left empty electrifies the whole party.";
    if (missing.length && missing.length <= 2) {
      for (const p of missing) {
        errors.push(playerError(p, {
          ruleId: NC_EMPTY_TOWER_RULE_ID, severity: died.length ? "Major" : "Minor", name: "Missed a Shock Tower",
          description: `Wasn't marked for a spread and took no Shock tower, so a tower stayed empty and Electrify hit the party (${res.length} hit).${deathText} ${why}`,
          timestamp: t, abilityId: ELECTRIFY, abilityName: "Electrify",
        }));
      }
    } else {
      errors.push(playerlessMinor(NC_EMPTY_TOWER_RULE_ID, "Shock Tower Left Empty",
        `A Shock tower stayed empty and Electrify hit the party (${res.length} hit).${deathText} ${why}`, t, ELECTRIFY, "Electrify"));
    }
  }
  return errors;
}

// ── split cones ─────────────────────────────────────────────────────────────

/**
 * Twofold and Fourfold Blight's Shockwave cones: each player takes exactly
 * one. Every kill resolution had all eight in exactly one. A player in two
 * took the second under Magic Vulnerability Up (A2 +1:22, A11 +1:22: four
 * died). A living player in none left the others to take it short.
 */
function detectShares(players: PlayerInfo[], life: Life, casts: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const fam of SHARES) {
    for (const res of clusterByGap(hitsOf(players, life, fam.ids), (h) => h.e.timestamp, 1500)) {
      const t = res[0].e.timestamp;
      // An aimer caught by Aetherblight takes their cone into the wrong zone;
      // the partners who stayed in the safe zone missed it as fallout (B10
      // +6:30 and +8:48, the healer in the donut both times).
      // The aimer is the cast target; when the target isn't logged, any cone
      // taker caught by Aetherblight may be the aimer.
      const aimers = castsOf(casts, fam.ids).filter((c) => c.timestamp >= t - 2000 && c.timestamp <= t + 200).map((c) => byName(players, c.target));
      const aimerOff = aimers.some((p) => p && inAvoidable(p, t)) || (!aimers.some(Boolean) && res.some((h) => inAvoidable(h.p, t)));
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
      if (aimerOff) continue;
      const absent = players.filter((p) => !byPlayer.has(p) && life.hitAlive(p, t) && !inRaiseGrace(life, p, t) && !inAvoidable(p, t));
      for (const p of absent) {
        const sizes = uniq(res.map((h) => instanceKey(h.e))).map((k) => res.filter((h) => instanceKey(h.e) === k).length);
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

// ── Blue Shockwave ──────────────────────────────────────────────────────────

/**
 * Two cones at the top of the enmity list, ~4.1s apart. The static swapped
 * tanks between them in every kill. The same tank taking both (second hit
 * not invulned) means the other tank didn't Provoke. A non-tank cast target
 * with both tanks healthy is an enmity loss (player-less). A non-target hit:
 * three or more at once is the tank aiming the cone into the party (A1, A17,
 * A21); one or two stood in the cone.
 */
function detectBlueShockwave(players: PlayerInfo[], life: Life, casts: EnemyEvent[], occurrences?: ReportedOccurrence[]): PullError[] {
  const errors: PullError[] = [];
  const blue = castsOf(casts, BLUE_SHOCKWAVE);
  const hits = hitsOf(players, life, BLUE_SHOCKWAVE);
  for (const pair of clusterByGap(blue, (c) => c.timestamp, 6000)) {
    const t = pair[0].timestamp;
    const healthy = tanksHealthy(players, life, t - DIED_FROM_HIT_MS);
    if (healthy) occurrences?.push({ mechanicKey: NC_BLUE_SWAP_RULE_ID, timestamp: t, players: players.filter(isTank).map((p) => p.name) });
    const resolutions = pair.map((c) => {
      const hs = hits.filter((h) => h.e.timestamp >= c.timestamp - 200 && h.e.timestamp <= c.timestamp + 1500);
      // A cast logged without its target: the one tank it hit (A17 +0:19).
      const tanksHit = uniq(hs.filter((h) => isTank(h.p)).map((h) => h.p));
      return { c, hs, target: byName(players, c.target) ?? (tanksHit.length === 1 ? tanksHit[0] : undefined) };
    });
    if (!healthy) continue;
    // Enmity: a cone on a non-tank.
    const wrong = uniq(resolutions.map((r) => r.target).filter((p): p is PlayerInfo => !!p && !isTank(p)));
    if (wrong.length) {
      errors.push(playerlessMinor(NC_ENMITY_RULE_ID, "Blue Shockwave on a Non-Tank",
        `Blue Shockwave went to ${namesOf(wrong)} with both tanks alive: a tank wasn't top of the enmity list. The tanks hold enmity (tank stance) and take both cones.`,
        t, BLUE_SHOCKWAVE, "Blue Shockwave"));
    }
    // Swap.
    const [a, b] = resolutions;
    if (a && b && a.target && a.target === b.target && isTank(a.target)) {
      const second = b.hs.find((h) => h.p === a.target);
      if (second && (second.e.amount ?? 0) > 0) {
        const other = players.find((p) => isTank(p) && p !== a.target)!;
        const d = life.diedFrom(a.target, second.e.timestamp);
        errors.push(playerError(other, {
          ruleId: NC_BLUE_SWAP_RULE_ID, severity: d ? "Major" : "Minor", name: "Blue Shockwave Not Swapped",
          description: `${a.target.name} took both Blue Shockwaves, the second under Magic Vulnerability Up (${amountText([second.e])}).${d ? ` ${a.target.name} died.` : ""} Provoke during the cast so the second cone goes to you (or the first tank invulns both).`,
          timestamp: b.c.timestamp, abilityId: BLUE_SHOCKWAVE, abilityName: "Blue Shockwave",
        }));
      }
    }
    // Cleaves.
    for (const r of resolutions) {
      if (!r.target) {
        // No target and both tanks hit: whose cone it was is unknown (A1 +0:15).
        const victims = uniq(r.hs.filter((h) => !isTank(h.p) && (h.e.amount ?? 0) > 0).map((h) => h.p));
        if (victims.length >= 3) {
          const died = victims.filter((p) => life.diedFrom(p, r.c.timestamp)?.killingAbilityGameId === BLUE_SHOCKWAVE);
          errors.push(playerlessMinor(NC_BLUE_CLEAVE_RULE_ID, "Blue Shockwave Into the Party",
            `Blue Shockwave hit ${victims.length} non-tanks (${namesOf(victims)})${died.length ? `; ${namesOf(died)} died` : ""}. The log doesn't say which tank it was aimed at. Take Blue Shockwave at the north-west or north-east edge, facing the cone away from the party.`,
            r.c.timestamp, BLUE_SHOCKWAVE, "Blue Shockwave"));
        }
        continue;
      }
      if (!isTank(r.target)) continue;
      const victims = uniq(r.hs.filter((h) => h.p !== r.target && (h.e.amount ?? 0) > 0 && !inRaiseGrace(life, h.p, h.e.timestamp)).map((h) => h.p));
      if (!victims.length) continue;
      const died = victims.filter((p) => life.diedFrom(p, r.c.timestamp)?.killingAbilityGameId === BLUE_SHOCKWAVE);
      const deathText = died.length ? ` ${namesOf(died)} died.` : "";
      if (victims.length >= 3) {
        errors.push(playerError(r.target, {
          ruleId: NC_BLUE_CLEAVE_RULE_ID, severity: died.length ? "Major" : "Minor", name: "Blue Shockwave Into the Party",
          description: `Their Blue Shockwave cone hit ${victims.length} other players (${namesOf(victims)}).${deathText} Take Blue Shockwave at the north-west or north-east edge, facing the cone away from the party.`,
          timestamp: r.c.timestamp, abilityId: BLUE_SHOCKWAVE, abilityName: "Blue Shockwave",
        }));
      } else {
        for (const p of victims) {
          const h = r.hs.find((x) => x.p === p)!;
          const d = life.diedFrom(p, h.e.timestamp);
          errors.push(playerError(p, {
            ruleId: NC_BLUE_CLEAVE_RULE_ID, severity: d ? "Major" : "Minor", name: "In Blue Shockwave",
            description: `Stood in ${r.target.name}'s Blue Shockwave cone (${amountText([h.e])}).${d ? " They died." : ""} The cones are wide (100 degrees); stay behind the boss, away from the tank's edge.`,
            timestamp: r.c.timestamp, abilityId: BLUE_SHOCKWAVE, abilityName: "Blue Shockwave",
          }));
        }
      }
    }
  }
  return errors;
}

/** The big hands' Muted Struggle is a buster on its tank; anyone else in it stood in the line. */
function detectBigHands(players: PlayerInfo[], life: Life, casts: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const res of clusterByGap(hitsOf(players, life, MUTED_STRUGGLE), (h) => h.e.timestamp, 1500)) {
    const t = res[0].e.timestamp;
    const targets = castsOf(casts, MUTED_STRUGGLE).filter((c) => c.timestamp >= t - 2000 && c.timestamp <= t + 200).map((c) => byName(players, c.target)).filter((p): p is PlayerInfo => !!p);
    if (!targets.length) continue;
    for (const h of res) {
      if (targets.includes(h.p) || isTank(h.p) || (h.e.amount ?? 0) <= 0 || inRaiseGrace(life, h.p, t)) continue;
      const d = life.diedFrom(h.p, t);
      errors.push(playerError(h.p, {
        ruleId: NC_BIG_HAND_RULE_ID, severity: d ? "Major" : "Minor", name: "In Muted Struggle",
        description: `Stood in the Beckoning Hand's Muted Struggle aimed at ${namesOf(targets)} (${amountText([h.e])}).${d ? " They died." : ""} The big hand's line goes to its tank; keep out of it.`,
        timestamp: t, abilityId: MUTED_STRUGGLE, abilityName: "Muted Struggle",
      }));
    }
  }
  return errors;
}

// ── Mass Macabre ────────────────────────────────────────────────────────────

/**
 * Each portal clears when exactly its count stands in it. A portal left
 * unsoaked casts Spreading Fear on the party; the log can't say which portal
 * or whose (player-less). Entering a portal again while the last one's Magic
 * Vulnerability Up holds is the entrant's error.
 */
function detectMacabre(players: PlayerInfo[], life: Life, casts: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const g of clusterByGap(castsOf(casts, SPREADING_FEAR), (c) => c.timestamp, 2000)) {
    const t = g[0].timestamp;
    const hit = hitsOf(players, life, SPREADING_FEAR).filter((h) => h.e.timestamp >= t - 500 && h.e.timestamp <= t + 3000);
    const died = uniq(hit.filter((h) => life.diedFrom(h.p, h.e.timestamp)?.killingAbilityGameId === SPREADING_FEAR).map((h) => h.p));
    errors.push(playerlessMinor(NC_MACABRE_RULE_ID, "Portal Left Unsoaked",
      `${g.length > 1 ? `${g.length} Mass Macabre portals were` : "A Mass Macabre portal was"} left unsoaked, so Spreading Fear hit the party (${uniq(hit.map((h) => h.p)).length} hit, with a DoT).${died.length ? ` ${namesOf(died)} died.` : ""} Each portal needs exactly its number of players at once: 4, 2, 3, 3 per route.`,
      t, SPREADING_FEAR, "Spreading Fear"));
  }
  for (const h of hitsOf(players, life, MACABRE_MARK)) {
    const held = h.p.debuffs.some((e) => e.abilityId === MAGIC_VULN && e.debuffStatus === "applied" && e.causeAbilityId === MACABRE_MARK &&
      e.timestamp < h.e.timestamp - 500 && h.e.timestamp - e.timestamp < 6000 &&
      !h.p.debuffs.some((r) => r.abilityId === MAGIC_VULN && r.debuffStatus === "removed" && r.timestamp > e.timestamp && r.timestamp < h.e.timestamp - 100));
    if (!held || inRaiseGrace(life, h.p, h.e.timestamp)) continue;
    const d = life.diedFrom(h.p, h.e.timestamp);
    errors.push(playerError(h.p, {
      ruleId: NC_MACABRE_RULE_ID, severity: d ? "Major" : "Minor", name: "Soaked a Portal Too Soon",
      description: `Entered a Mass Macabre portal while the last one's Magic Vulnerability Up still held (${amountText([h.e])}).${d ? " They died." : ""} Wait for the vulnerability to fall off (~5s) before the next portal.`,
      timestamp: h.e.timestamp, abilityId: MACABRE_MARK, abilityName: "Macabre Mark",
    }));
  }
  return errors;
}

// ── individual abyss, Invitation ────────────────────────────────────────────

/**
 * Darkness of Eternity sends everyone to their own abyss with Doom (50s).
 * The log only shows the logger's own island, so an abyss death has no
 * killing blow; its cause is the player's own island (missed interrupt,
 * hand enrage, healing through Bleeding, or no escape). A Doom applied again
 * later is Invitation pulling the player back in (A6, A20, B9, B11, B18),
 * and every one of those but A20 ended in the player's death ~9-11s later.
 */
function detectAbyss(players: PlayerInfo[], life: Life, deaths: DeathEvent[]): { errors: PullError[]; handled: Set<DeathEvent> } {
  const errors: PullError[] = [];
  const handled = new Set<DeathEvent>();
  for (const p of players) {
    const dooms = debuffIntervals(p, DOOM);
    dooms.forEach((w, i) => {
      const d = deaths.find((x) => x.player === p.name && x.timestamp - DEATH_EVENT_LAG_MS >= w.start && x.timestamp - DEATH_EVENT_LAG_MS <= w.end + 500);
      if (d) handled.add(d);
      if (i === 0) {
        if (!d) return;
        errors.push(playerError(p, {
          ruleId: NC_ABYSS_RULE_ID, severity: "Major", name: "Died in the Abyss",
          description: `Died alone in their abyss ${sec(d.timestamp - DEATH_EVENT_LAG_MS - w.start)}s after Darkness of Eternity, before escaping (the log can't see inside their island). Tanks interrupt their hand, healers heal themselves through the Bleeding, DPS kill both hands before the enrage, then everyone takes the exit before Doom runs out.`,
          timestamp: d.timestamp - DEATH_EVENT_LAG_MS, abilityId: DOOM, abilityName: "Doom",
        }));
        return;
      }
      errors.push(playerError(p, {
        ruleId: NC_INVITATION_RULE_ID, severity: d ? "Major" : "Minor", name: "Caught by Invitation",
        description: `Was hit by a Specter of Death's Invitation lane and pulled back into the abyss${d ? `, and died there ${sec(d.timestamp - DEATH_EVENT_LAG_MS - w.start)}s later` : ""}. Watch for the Invitation lanes and never cross one, even while moving to the next safe spot.`,
        timestamp: w.start, abilityId: DOOM, abilityName: "Invitation",
      }));
    });
  }
  return { errors, handled };
}

// ── deaths with no killing blow ─────────────────────────────────────────────

function walkingDeadRanOut(p: PlayerInfo, d: DeathEvent): boolean {
  const hitT = d.timestamp - DEATH_EVENT_LAG_MS;
  return debuffIntervals(p, WALKING_DEAD).some((w) => Math.abs(w.end - hitT) <= 1500 && w.end - w.start >= WALKING_DEAD_FULL_MS);
}

/** No-killing-blow deaths that are the wipe being called, not mistakes. */
function calledWipeDeaths(players: PlayerInfo[], deaths: DeathEvent[], skip: Set<DeathEvent>, pullEnd: number): Set<DeathEvent> {
  const out = new Set<DeathEvent>();
  const silent = deaths.filter((d) => {
    if (d.killingAbilityGameId || skip.has(d)) return false;
    const p = byName(players, d.player);
    return !(p && walkingDeadRanOut(p, d));
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
 * Lone silent deaths: Walking Dead running out (player-less), a fall off the
 * 9y Grand Cross circle (Major), or anything else (player-less, so the review
 * sees it: a fall off the main arena's edge or a lethal hit FFLogs dropped).
 */
function detectSilentDeaths(players: PlayerInfo[], deaths: DeathEvent[], casts: EnemyEvent[], skip: Set<DeathEvent>): PullError[] {
  const errors: PullError[] = [];
  const cross = castsOf(casts, GRAND_CROSS).map((c) => ({ start: c.timestamp, end: (castsOf(casts, NEUTRON_RING).find((r) => r.timestamp > c.timestamp)?.timestamp ?? c.timestamp + 50_000) + 3000 }));
  for (const d of deaths) {
    if (d.killingAbilityGameId || skip.has(d)) continue;
    const p = byName(players, d.player);
    if (!p) continue;
    const hitT = d.timestamp - DEATH_EVENT_LAG_MS;
    if (walkingDeadRanOut(p, d)) {
      errors.push(playerlessMinor(NC_FALL_RULE_ID, "Walking Dead Ran Out",
        `${p.name}'s Walking Dead (from Living Dead) expired before they were healed back to full, and they died. The healers have to heal the Walking Dead tank to full within its 10s.`,
        hitT, WALKING_DEAD, "Walking Dead"));
      continue;
    }
    // A death right after an avoidable or bait hit is that hit's error.
    if (p.damageTaken.some((e) => (AVOIDABLE[e.abilityId] || e.abilityId === GRASP_BAIT || e.abilityId === BLUE_SHOCKWAVE) && e.timestamp <= d.timestamp && e.timestamp >= d.timestamp - DIED_FROM_HIT_MS - 1000)) continue;
    if (cross.some((w) => hitT >= w.start && hitT <= w.end)) {
      errors.push(playerError(p, {
        ruleId: NC_FALL_RULE_ID, severity: "Major", name: "Fell Off the Grand Cross Arena",
        description: "Died with no killing blow while Grand Cross had shrunk the arena to its small circle: walked off the edge. Stay inside the circle until Neutron Ring restores the floor.",
        timestamp: hitT, abilityId: 0, abilityName: "Fall",
      }));
      continue;
    }
    errors.push(playerlessMinor(NC_FALL_RULE_ID, "Died With No Killing Blow",
      `${p.name} died mid-pull with no killing blow: a fall off the arena's edge, or a lethal hit the log didn't record.`,
      hitT, 0, "Fall"));
  }
  return errors;
}

// ── cutoffs ─────────────────────────────────────────────────────────────────

/** Darkness of Eternity with party adds still alive: the raid-wide failure version. */
function detectAddFail(players: PlayerInfo[], life: Life): PullError[] {
  const hits = hitsOf(players, life, ADD_FAIL);
  if (!hits.length) return [];
  const t = hits[0].e.timestamp;
  const died = uniq(hits.filter((h) => life.diedFrom(h.p, h.e.timestamp)).map((h) => h.p));
  return [raidMarker(NC_ADDS_RULE_ID, "Party Adds Not Killed",
    `Darkness of Eternity went off with party adds still alive, so it hit for lethal damage${died.length ? ` (${namesOf(died)} died)` : ""} instead of sending the party to the abyss. All four add waves have to die before the gauge fills. Treated as the cutoff point.`,
    t, ADD_FAIL, "Darkness of Eternity")];
}

/** 4+ deaths to one moment's mechanics (raidwides excluded), with the pull over within a minute. */
function detectMassDeaths(deaths: DeathEvent[], pullEnd: number): PullError[] {
  const fatal = deaths.filter((d) => d.killingAbilityGameId && !RAIDWIDE.includes(d.killingAbilityGameId));
  for (const g of clusterByGap(fatal, (d) => d.timestamp, MASS_WINDOW_MS)) {
    if (uniq(g.map((d) => d.player)).length < MASS_DEATHS || pullEnd - g[0].timestamp > MASS_END_MS) continue;
    const kinds = uniq(g.map((d) => d.cause));
    return [raidMarker(NC_MASS_DEATHS_RULE_ID, "Mass Deaths",
      `${g.length} players died together to ${joinNames(kinds)} (${joinNames(uniq(g.map((d) => d.player)))}), and the pull ended soon after. Treated as the cutoff point.`,
      g[0].timestamp - DEATH_EVENT_LAG_MS + RAID_MARKER_SORT_OFFSET_MS, g[0].killingAbilityGameId, kinds[0])];
  }
  return [];
}

// ── entry point ─────────────────────────────────────────────────────────────

/** Necron (The Minstrel's Ballad: Necron's Embrace, Extreme) errors. Self-gates on the boss's signature casts. */
export function detectNecronErrors(
  players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], occurrences?: ReportedOccurrence[],
): PullError[] {
  if (!enemyCasts.some((c) => SIGNATURE.includes(c.abilityId))) return [];
  const life = buildLife(players, deathEvents);
  const pullEnd = Math.max(0, ...players.flatMap((p) => [...p.damageTaken, ...p.casts].map((e) => e.timestamp)), ...deathEvents.map((d) => d.timestamp));
  const abyss = detectAbyss(players, life, deathEvents);
  const called = calledWipeDeaths(players, deathEvents, abyss.handled, pullEnd);
  const skip = new Set([...abyss.handled, ...called]);

  const errors = [
    ...detectAvoidable(players, life),
    ...detectMori(players, life),
    ...detectHands(players, life, enemyCasts),
    ...detectSpreads(players, life, enemyCasts),
    ...detectEmptyTowers(players, life, enemyCasts),
    ...detectShares(players, life, enemyCasts),
    ...detectBlueShockwave(players, life, enemyCasts, occurrences),
    ...detectBigHands(players, life, enemyCasts),
    ...detectMacabre(players, life, enemyCasts),
    ...abyss.errors,
    ...detectSilentDeaths(players, deathEvents, enemyCasts, skip),
    ...detectAddFail(players, life),
  ];
  const firstRaid = () => Math.min(...errors.filter((e) => e.severity === "Raid").map((e) => e.timestamp));
  for (const m of detectMassDeaths(deathEvents, pullEnd)) if (m.timestamp < firstRaid()) errors.push(m);

  const enrage = castsOf(enemyCasts, ENRAGE)[0];
  if (enrage && enrage.timestamp < firstRaid()) {
    errors.push(raidMarker(NC_ENRAGE_RULE_ID, "Darkness of Eternity (Enrage)",
      "The final Darkness of Eternity went off: Necron wasn't brought down before the hard enrage.",
      enrage.timestamp, ENRAGE, "Darkness of Eternity"));
  }
  const calledList = deathEvents.filter((d) => called.has(d)).sort((a, b) => a.timestamp - b.timestamp);
  const calledPair = calledList.some((d, i) => i > 0 && d.timestamp - calledList[i - 1].timestamp <= CALLED_WIPE_PAIR_MS);
  if ((calledList.length >= CALLED_WIPE_COUNT || calledPair) && calledList[0].timestamp - DEATH_EVENT_LAG_MS < firstRaid()) {
    errors.push(raidMarker(NC_CALLED_WIPE_RULE_ID, "Wipe Called",
      `${calledList.length} players died with no killing blow together (${joinNames(uniq(calledList.map((d) => d.player)))}): the wipe was called and the raid reset.`,
      calledList[0].timestamp - DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  const outAt = (t: number) => players.filter((p) => !life.alive(p, t));
  const collapseT = life.outIntervals.map((w) => w.start).sort((a, b) => a - b)
    .find((t) => outAt(t).length >= COLLAPSE_DEAD_COUNT && pullEnd - t <= COLLAPSE_END_MS);
  if (collapseT !== undefined && collapseT + DEATH_EVENT_LAG_MS < firstRaid()) {
    const who = outAt(collapseT).map((p) => p.name);
    errors.push(raidMarker(NC_COLLAPSE_RULE_ID, "Party Collapse",
      `${who.length} players were dead at once (${joinNames(who)}). Treated as the cutoff point.`,
      collapseT + DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
