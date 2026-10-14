// lib/mechanics/ffxiv/trials/necron.ts
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
