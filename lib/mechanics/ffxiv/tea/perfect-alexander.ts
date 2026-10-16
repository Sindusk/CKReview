// The Epic of Alexander (Ultimate) -- Phase 4: Perfect Alexander.
//
// -- VERIFIED AGAINST LOGS (2026-10-16) --
// Same static as the other tea/ modules, NAUR plan (user), roles.ts slots
// accurate (user), no VODs. Pulls are cited by the app's Pull n with the
// whole report imported (= FFLogs fight id), as in alexander-prime.ts.
// Report A = AHw6VfLrZ97Gj1Dn (alexander-prime.ts's E): A10, A21, A27, A28,
//   A31 reached P4, no kill. Report B = Q9zqJb4VLmjhd1B6 (F): B3, B4, B11,
//   B12, B16; kills B4, B11, B16. All ten refetched --from-minutes 4.6 to
//   the end (Alexander Prime's capture had stopped 30s into P4).
// FFLogs phase 6 starts +10:42 to +11:03; The Final Word completes 7-15s
// later. Clock from The Final Word's cast completing (every pull within
// ~0.2s; B4's numbers): first check +7.1, march +10.7 to +15.7, second
// check +18.3; Optical Sights +28.4 / +34.5 (hits +30.5 / +36.6); Fate
// Projection α +49.5, Calibration α +74.7 (its own clock in the
// constants); Capital Punishment +100.2, Punishment +109.4; Fate Projection
// β +124.5, Calibration β +162.6; Capital +200.2; Almighty Judgment +219.5,
// Grace +235.7; Capital +245.8; Almighty Judgment +261.2, Grace +277.3;
// Temporal Interference begins +287.3. Every kill killed the boss in it (B4
// +289.8, B11 +296.8, B16 +301.4): no pull saw Temporal Prison.
// Log IDs: Final Word 18557; statuses 1002152 / 1002153 / 1002154 / 1002155
// (light follower / light beacon / dark follower / dark beacon), Ordained
// 1003055-1003058 (same order) for the march itself; Motion 18558 / 18859
// and Stillness 18559 / 18860 (Final Word / α controllers), success 19039 /
// 19040 (a 0-damage hit on everyone, with their position), failure 18560 /
// 18561 (lethal); Divine Retribution 18562 on a light follower (touched the
// beacon, or the beacon was dead), 18563 on a dark follower (escaped, or
// beacon dead). Optical Sight 18570 spread / 18571 stack (β: 18861 / 18862);
// Individual Reprobation 18572 (cast target = circle owner), Collective
// 18573. Fate Projection α 18555 / Calibration 18556, β 19219 / 19220.
// Projection clones are Perfect Alexander instances, and each clone's
// instance number carries from its preview to the real cast: preview
// Defamation 18596 #n -> Plaint of Obloquy 18528 #n (cast at the holder,
// target = holder unless it hit several), Assault 18597 -> Plaint of
// Severity 18529 (target = holder), Shared 18598 -> Plaint of Solidarity
// 18530, preview crosses 18591 -> Sacrament 18569. α's four clones stand at
// (78,91), (91,78), (109,78), (122,91); three fire. β logs the real roles
// on the players at +5.1: Ordained statuses, House Arrest 1001123 (close
// pair), Restraining Order 1001124 (far pair); Plaint of Surety 18531 (0
// damage when held), J Jump 18565, Radiant Sacrament 18566 (donut). Busters
// Ordained Capital Punishment 18579 (x3) / Ordained Punishment 18577;
// Almighty Judgment preview 18575 / explosion 18576; Irresistible Grace
// 18580; Faithlessness 19073 (B3: two players alone in the stacks, with
// Damage Down 1002092; TEA's Damage Down isn't the 1002911 the generic rule
// watches). Perfect Alexander auto 19083.
// Findings:
// - Motion / Stillness: 9 Stillness and 3 Motion failures, each lethal on
//   its own player (A10 three at once, A21, A27 two, A28, A31, B3, B16 in a
//   kill). Final Word's two checks were always opposite; α's can repeat
//   (A31, B16 Stillness twice).
// - Final Word (NAUR): light beacon at the north wall (y 82-94), dark beacon
//   at the south (y 114-116), everyone else just north of it. A31 and B3: the
//   light beacon (the same healer) stayed in the group and every light
//   follower took 18562; A10: both beacons died at the first check, so all
//   six followers took Retribution (fallout). B11 (kill): one dark follower
//   took 18563, the others fine. B3: a dark follower who started south of the
//   dark beacon marched into the wall (death, no killing blow, 2s after her
//   Ordained status ended early).
// - Optical Sight: eight spread circles every time, placed on the living:
//   with players dead the spare circles double onto survivors (A27, A31, B3,
//   B12 β; B16's sage in a kill, the dragoon dead since Final Word). No
//   spread or stack doubled with all eight up. Stacks 4/4 clean, 3/5
//   survived (A28).
// - Fate Calibration α: the non-firing clone sets the axis; Defamation
//   5.8-6.3y from it at the wall, the rest 34.1y+ from the Defamation at the
//   far side. A21: the shared group stood 10y west of the axis, five in the
//   crosses (six dead). A28: the PLD 8.3y off a lane's line was hit, the
//   party 9.7y+ (his hit event logged 10.6y: he moved after the snapshot,
//   so descriptions drop distances past the lane). B11 (kill): the Defamation holder 12.2y off its spot, in a
//   cross. A31: Obloquy hit a dancer 32.7y from the holder (on the spot).
//   A21, A31: an Assault in the shared stack. A21's and A28's Defamation
//   holders died at the first check: no Obloquy was cast. One unmarked player
//   (the same healer) often stood with the Assaults, unhit (A31, B12, B16):
//   the shared stack took three; never a failure.
// - Capital Punishment: tanks share the first (MT/OT ~10-14k each), the PLD
//   invulns the second, the WAR the third. Non-tank Capital deaths (A27,
//   A31) were with both tanks dead; A21's WAR died solo to Punishment.
// - Fate Calibration β (NAUR): after the march the light group stands north
//   (y 83-87), dark beacon east (114-118, 100), far dark south (y 116-119),
//   unlinked dark west (x 81-90). Far pairs 34.2-34.3y apart; B12's 29.9y
//   pair failed Surety (both died). A28: every light follower took 18562
//   (beacon misplaced); both tethers then failed because a partner was dead
//   (fallout). J Jumps one each on the three dark baiters in every clean
//   pull; doubled only with a baiter dead (A28, B12). Radiant Sacrament hit
//   B11's sage (kill) and B12's PLD (still north).
// - Trines and Grace: no explosion hit anyone; all six Graces took eight.
// Cutoffs (7 P4 wipes): mass death 4 (A28 β march, A31 α, B3 Final Word,
// B12 β tethers), party in Sacrament 1 (A21), both tanks dead 1 (A27),
// both healers dead in P3 1 (A10, ffxiv/common.ts). Kills: B4 clean, B11
// three Majors (dark follower escaped, Defamation in a cross, donut), B16
// one (Final Word Motion).
//
// -- RULES IMPLEMENTED --
// Self-gates on The Final Word; runs from 10s before it to the pull's end.
// ffxiv-pa-ordained (Major): a Motion / Stillness failure hit.
// ffxiv-pa-beacon (Major, the beacon): every living follower of one color
//   took Divine Retribution with their beacon alive. ffxiv-pa-march (Major,
//   the follower): only some did, or a follower died with no killing blow
//   during the march (the wall). A dead beacon's followers are fallout.
// ffxiv-pa-sacrament (Minor; Major if they died) and -sacrament-party (Raid,
//   4+ in α's crosses). ffxiv-pa-defamation-aim (holder 9y+ from the
//   non-firing clone, Obloquy hit others) / ffxiv-pa-defamation (holder on
//   the spot: the victims). ffxiv-pa-assault-shared (Severity holder in
//   Solidarity).
// ffxiv-pa-tether (Major, both: the log can't say who moved): Surety for
//   100+ damage with both partners alive. ffxiv-pa-jump (a J Jump on anyone
//   but its three dark baiters, or two on one, with all three alive).
//   ffxiv-pa-donut (Radiant Sacrament hit).
// ffxiv-pa-spread / -stack (doubled circles or both stacks, only with all
//   eight up and nobody raised in 10s). ffxiv-pa-capital (non-tank in a
//   buster while a tank lives). ffxiv-pa-trine, ffxiv-pa-grace (alive and
//   outside it). ffxiv-pa-enrage (Raid: Temporal Prison completed).
// Generic, with no mechanic Raid: ffxiv-pa-called-wipe, -mass-death (4+
//   players dead within 8s, stamped at the fourth's hit), -tanks-dead (both
//   tanks dead and neither back within 20s; A31 raised both after Final
//   Word), -collapse (6 dead, pull over within 35s). The earliest wins.
// Exposure: beacon (each march's two beacons), defamation-aim (the holder),
//   assault-shared (the three Assaults) and tether (the four tethered) are
//   targeted; the rest everyone.
// Not built: Temporal Prison order (never reached); shared stacks short of
//   players (only after deaths); Faithlessness (B3, after the cutoff).
// OPEN QUESTIONS (no VOD yet):
// 1. A31 / B3 / A28 light beacon in the group: did the beacon go north at
//    all, or did the followers start too far north?
// 2. A21: the shared group in α's crosses (each flagged plus a Raid): a
//    wrong call by one player, or the group's read?
// 3. B3: the dancer marched into the wall from south of a dark beacon that
//    stood ~1-2y north of its usual spot: beacon or follower?
// 4. B11 (kill): which dark follower start breaks Escape Prohibition, and
//    is the donut's safe circle smaller than ~6y?
//
// -- GUIDE-DERIVED MODEL (2026-10-15) --
// Comment-only research: no detector, sampled report or VOD ruling.
// Eight-player level-80 Ultimate (5.11), item-level sync 475. Starts after
// the successful Divine Judgment transition/cinematic; ends at boss defeat
// or Temporal Prison. A future VERIFIED AGAINST LOGS section wins.
// Every failure signal is source-derived and unobserved in local logs.
// Later job/gear patches change damage and prison order. Historical
// animation/forced-movement behavior is particularly patch sensitive;
// neither frame-perfect windows nor an Enigma exploit are assumed here.
//
// -- SOURCES CHECKED 2026-10-15 --
// [NA] NAUR directory, linked toolbox and its explicit FCB correction:
// https://naurffxiv.com/ultimate/tea
// https://ff14.toolboxgaming.space/?id=170875560147661&preview=1
// NAUR warns the linked video puts light beacon incorrectly: use the
// floor dot NORTHWEST of A, not a generic point directly north of A.
// [WD] Browser, NAUR/Elinabin Perfect Alexander tab and role view:
// https://wtfdig.info/ultimates/tea#naur
// [IV] Lyra, Fate patterns, opposite/identical movement checks and boxes:
// https://www.icy-veins.com/ffxiv/the-epic-of-alexander-ultimate-guides-perfect-alexander
// [US] Regional N/S Final Word, alternate FCA sides / trine conventions:
// https://ultistrats.com/guides/tea/
// [OCE] Written diagram/context cross-check:
// https://materiaraiding.com/ultimate/tea
// [BM] Primary definitions, master branch:
// https://github.com/awgil/ffxiv_bossmod/tree/master/BossMod.Ultimate/Shadowbringers/Ultimate/TEA
// Read TEAEnums.cs, TEAStates.cs, P4FinalWord.cs,
// P4ForcedMarchDebuffs.cs, P4FateProjection.cs, P4FateCalibrationAlpha.cs,
// P4FateCalibrationBeta.cs, P4OpticalSight.cs, P4OrdainedPunishment.cs,
// P4AlmightyJudgment.cs and P4TemporalPrison.cs. No code reproduced.
// [CB] Primary timeline and preview-vs-resolution trigger definitions:
// https://github.com/quisquous/cactbot/blob/main/ui/raidboss/data/05-shb/ultimate/the_epic_of_alexander.txt
// Same directory: the_epic_of_alexander.ts, main branch. CB confirms
// second FCA Stillness preview 18586 where BM leaves it unresolved.
//
// -- SHAPE, CLOCK, AND PHASE BOUNDARIES --
// Acquire enmity again after transition; P3's tank target is not proof of
// P4 ownership. Perfect Alexander actor 0x2C55, auto damage 19083.
// Phase is timed: Final Word -> two Optical Sights -> Projection/Calibration
// Alpha -> busters -> Projection/Calibration Beta -> busters -> Almighty
// Judgment/Grace -> busters -> Almighty Judgment/Grace -> prisons/enrage.
// Projection creates previews; Calibration displays them while the boss
// remains targetable, then temporarily removes the boss during playback.
// No HP thresholds choose movement orders, spread/stack, or safe clone.
// [CB] t=0 below is FIRST P4 AUTO (synthetic timeline 900), not pull time,
// targetability, or the preceding tank-LB hit. Approximate action resolves:
//   +9.1 Final Word; +16.1/+26.3 Motion/Stillness (opposite results);
//   +36.5/+42.7 Optical Sight controls, hits +38.6/+44.7;
//   +57.6 Projection Alpha; previews +66.8/+72.7/+74.9/+75.9;
//   +82.6 Calibration Alpha completes; +85.6 untargetable;
//   +89.8 check 1; +92.8 debuffs; +93.8 check 2 / three Sacraments;
//   +98.8 targetable; Capital hits +111.1/+112.2/+113.3, Punishment +117.2;
//   +132.3 Projection Beta; previews +147.7..161.5;
//   +170.3 Calibration Beta completes; +173.3 untargetable;
//   +181.5 debuffs; +182.5 jumps; +188.6 spread/stack;
//   +193.5 Radiant Sacrament; +198.5 targetable;
//   Capital hits +209.9/+211.0/+212.1, Punishment +216.0;
//   +226.2 Almighty Judgment; explosions +237.4/+239.4/+241.4;
//   +242.5 Grace; Capital +255.7/+256.8/+257.9, Punishment +261.8;
//   +271.7 Almighty Judgment; explosions +282.9/+284.9/+286.9;
//   +287.9 Grace; +302.8 Temporal Interference;
//   +316.4 first prison; further prisons ~5s apart;
//   +347.6 Temporal Prison enrage action, last prison around +349.8.
// There are THREE Capital/Punishment sets, TWO trine/Grace sets. Cactbot
// numbers include resync/animation assumptions and are not measured FFLogs
// thresholds; especially bracket prison cast finish vs last incarceration.
//
// -- IDs, EXPECTED EVENTS, AND CONSEQUENCES --
// Decimal action IDs below are candidate game IDs, not verified FFLogs
// mappings. Raw status IDs usually become 1000000 + raw ID in FFLogs.
// Clones use the same Perfect Alexander actor type as the real boss;
// Fate Projection players use actor 0x2C56. A source/target that is a
// clone is not a living player's damage/death event.
// Minor = surviving avoidable damage with no Damage Down. Named Major =
// root cause of death/wipe or confirmed avoidable Damage Down. Raid =
// unrecoverable state, not an arbitrary number of victims. Correct split
// or buster damage deaths belong to mitigation, not mechanic blame.
// A prior death's later missing helpers/clone assignments are fallout.
//
// -- FINAL WORD / FORCED MOVEMENT --
// Final Word control 18557 (4s). One Contact Regulation raw 2153 (large
// light/orange beacon), three Contact Prohibition 2152 (light followers);
// one Escape Detection 2155 (large dark/purple beacon), three Escape
// Prohibition 2154 (dark followers). Do not equate colors across guides:
// some call followers yellow/blue, others small orange/purple.
// Light followers march TOWARD light beacon; must not contact it. Dark
// followers march AWAY from dark beacon, must start close enough and
// march along a safe arena path. Beacon players do not make that march.
// BM provisionally models march ~20y, light start >=22y, dark start <=5y;
// all three numbers are marked TODO there, not verified pass/fail limits.
// Correct NAUR: light beacon A / slightly N of A; dark beacon center of
// C, everyone else tightly together just NORTH of dark beacon. This gives
// followers an inward route with distance to the far light beacon.
// Respect the first movement check while positioning, then forced march,
// then the opposite movement check. No personal facing adjustment can
// substitute for correct relative beacon-to-follower positions.
// Candidate active march statuses: Contact Prohibition Ordained 3055,
// Contact Regulation Ordained 3056, Escape Prohibition Ordained 3057,
// Escape Detection Ordained 3058. Old Word removal can be a phase change
// into march statuses, not premature expiry. No Esuna.
// Failure: beacon/follower contact or wrong starting separation -> LOG
// SIGNAL: Divine Retribution 18563 / death and march trajectory; FAULT:
// beacon or follower that broke the agreed setup, not every follower who
// dies from a misplaced beacon; CONSEQUENCE: Major, Raid when unrecoverable.
// Failure: march into lethal edge -> LOG SIGNAL: forced displacement /
// edge death, possibly no named killing blow; FAULT: misplaced beacon or
// follower if geometry settles it; CONSEQUENCE: Major/Raid.
// Removal: normal Word expiry starts forced movement; later march removal
// ends it. Death/raise retarget and beacon-death effects are unsettled.
// Not errors: forced movement, overlapping the other five followers at
// the valid starting point, opposite beacon positioning, valid prevention
// of unrelated knockbacks (not proof that forced march can be canceled).
//
// -- ORDAINED MOTION / ORDAINED STILLNESS --
// Normal casts: Motion 18558, Stillness 18559 (4s). Success effects:
// Motion 19039, Stillness 19040, reported as misses in BM. Distinct lethal
// failure effects: Motion 18560, Stillness 18561. These are better failure
// candidates than reconstructing animation from sparse position samples.
// Correct play: move continuously for white-sword Motion, stop movement
// AND actions/autoattacks early for black-sword Stillness. Late animation
// can fail a check even if a single snapshot shows no displacement. IV
// describes jumping in place as valid Motion; server confirmation needed.
// Final Word check 2 is the OPPOSITE of check 1. FCA has two independently
// previewed checks: they CAN BE THE SAME. Never apply Word's alternation
// rule to FCA. Forced march finishing does not authorize moving on Stillness.
// Failure: wrong activity -> LOG SIGNAL: distinct 18560/18561 on living
// player at actual resolution; FAULT: that player unless unavoidable
// prior failure forced the activity; CONSEQUENCE: Major (normally lethal).
// Removal: instantaneous checks, not a debuff to cleanse. A 19039/19040
// miss is evidence of success, not missing target/damage or failed Motion.
//
// -- OPTICAL SIGHT / REPROBATIONS --
// Normal control casts: spread 18570, stack 18571. Actual hits:
// Individual Reprobation 18572, Collective Reprobation 18573, 6y circles.
// Opening uses two opposite patterns (spread then stacks, or reverse).
// Spread marks all eight; stack marks two random players for two split
// groups, normal target four each. 5/3 can survive in some mitigation
// plans [IV], so four is a standard plan, not proven hard arithmetic gate.
// Correct play: loose clock spread with >=6y target separation, then
// distinct four-person groups; avoid double circles. Random stack targets
// can require adjusting away from fixed light parties.
// Failure: overlap -> LOG SIGNAL: more than own 18572, overlapping 18573
// groups / lethal double hit; FAULT: off-slot spread or stack mover if
// established, not every hit player; CONSEQUENCE: Minor/Major by outcome.
// Failure: missing helper -> LOG SIGNAL: small lethal 18573 split;
// FAULT: assigned missing player only if proven; CONSEQUENCE: Major.
// Removal: markers consumed by their hits; no cleanse. The hit itself
// is expected, not a penalty for being targeted. DD association unverified.
//
// -- FATE PROJECTION: WHAT IS PREVIEWED AND WHAT IS REAL --
// Alpha Projection 18555 (5s), Calibration 18556 (22s). Beta Projection
// 19219 (5s), Calibration 19220 (35s). Fate Projection tether game ID 98
// links each PLAYER to their own clone, sometimes before clone creation.
// Enigma Codex player buff raw 2146 from P3 makes the clues visible; Heart
// raw 2147 is not the player's buff. Loss/visibility after raise needs a
// report. Missing Codex limits normal visual solving; it is not itself
// an instant damage penalty or proof that a clear is mechanically barred.
// What happens to a player's clone predicts their real future duty.
// Clone deaths are scripted exposition and must never be counted as raid
// casualties, nor blamed on a real player before playback occurs.
// Preview effects usually occur during Calibration's cast; actual player
// resolution occurs AFTER its completion and boss disappearance.
// Assignments require clone ownership, not whichever player stood closest
// to an exploding visual. These signals may not be exported by FFLogs.
//
// -- FATE CALIBRATION ALPHA: MOVEMENT / DEBUFFS / SACRAMENTS --
// Preview first Motion/Stillness: 19213/19214. Preview second:
// Motion 18585 / Stillness 18586 (CB confirms 0x489A).
// Preview debuffs: Defamation visual 18596 near its clone; Assault 18597
// on three clones; Shared Sentence 18598 on one clone. Three other
// clones have nothing. Total: 1 Defamation + 3 Assault + 1 Shared + 3 None.
// Preview Sacrament effect 18591 comes from THREE of four northern
// Alexander clones. The nonfiring clone (inner second/third in guides)
// determines safe axis; it is not the real tanked boss's orientation.
// Actual checks: Motion 18859 / Stillness 18860 controller events;
// Plaint of Obloquy 18528 (Defamation, ~30y radius), Severity 18529,
// Solidarity 18530 (Shared, ~4y), then Sacraments 18569 (16y-wide crosses).
// Actual movement penalties still require verifying helper-hit mapping.
// NAUR: Defamation near wall directly in front of nonfiring north clone;
// remaining seven on the opposite safe side. Shared + three None form
// LEFT stack; three Assaults RIGHT, relative to the strategy diagram's
// safe axis. This left/right assignment must be oriented to the actual
// safe clone; it is not a universal west/east position.
// Defamation must remain ~30y from everyone else. Assaults cannot take
// Shared/Defamation damage; they can stand together if no shared AoE
// covers them. Normal Shared group is FOUR although underlying Solidarity
// is commonly modeled as a three-person minimum. Do both previewed
// movement checks while preserving safe positions for all three crosses.
// Failure: wrong movement -> LOG SIGNAL: real failure hit/death following
// 18859/18860, not preview clone deaths; FAULT: affected player if not
// forced by prior failure; CONSEQUENCE: Major.
// Failure: Defamation/Shared/Assault mixup -> LOG SIGNAL: 18528 clips
// party, 18530 wrong split or extra hit on Assault; FAULT: misplaced role
// if clone ownership and plan establish it; CONSEQUENCE: Major/Raid.
// Failure: unsafe Sacrament axis -> LOG SIGNAL: 18569 on living player;
// FAULT: entrant or party-wide misread without individual attribution;
// CONSEQUENCE: Major if lethal, Raid if no viable survivors remain.
// Removal: previews end with clone destruction; real temporary duties
// resolve during playback. They are not an Esuna/raise-to-clear mechanic.
// Not errors: the Defamation holder taking own Obloquy, successful
// Severity/Solidarity, three unmarked helpers, all scripted clone deaths.
//
// -- ORDAINED CAPITAL PUNISHMENT / ORDAINED PUNISHMENT --
// Capital controller 18578 (3s); shared hits 18579 (~4y) THREE times,
// ~1.1s apart, beginning ~3.1s after control finishes. Punishment 18577
// (5s/~5y) follows, giving Physical Vulnerability Up raw 695. Boss autos
// are physical: swap away from the vulnerable tank before more autos.
// Correct play: stack tanks to share Capital with mitigation, or use a
// planned solo invuln, then handle Punishment and swap. Other players
// stay outside the tank circles; invulns/cooldowns vary by composition.
// Failure: non-tank clipped / demonstrable missed swap -> LOG SIGNAL:
// 18579/18577 collateral or autos on 695 holder despite required swap;
// FAULT: tank aim/swap duty or entrant when proven; CONSEQUENCE: Major
// if lethal. Tank death while correctly executing a mitigation plan is
// not mechanic blame; solo Capital under invuln is not a missing helper.
// Removal: physical vulnerability expires, no cleanse/death explosion
// sourced. Capital multiple damage events are expected, not double-soak.
//
// -- FATE CALIBRATION BETA: COLOR, TETHERS AND FORCED ROUTES --
// Preview color raw status 2195 on clones uses extra 0x84 light / 0x85
// dark. Four light, four dark: one stationary beacon of each color and
// three marching followers each. Far tether pairs one light/one dark;
// close tether likewise; unlinked light follower gets Shared Sentence,
// remaining dark follower has no such debuff. These are NOT role-locked.
// Preview: tethered dark/light clone death actions 18587/18588; Shared
// uses 18598; jump 18589; stack/spread previews 18593/18592, beacon
// resolution effects 18595/18594; donut preview 18590.
// Actual march repeats the light-toward/dark-away behavior; resolve close
// and far pair plus Shared using Plaint family. Then THREE jumps 18565
// (~10y radius) are baited to dark beacon / dark far / dark nothing.
// Dark close goes with light group to satisfy House Arrest. Each jump's
// source selects its farthest player; preposition those three separately.
// NAUR setup using its standard markers:
//   light beacon NW of A on FLOOR DOT (NAUR correction, not A's center);
//   dark beacon center of 2 (E, around 14y from center);
//   dark far at SW corner of 2, route aimed toward C (S);
//   dark nothing W side of 2, route toward D (W);
//   remaining four at NW corner of 2, aimed toward A (N).
// Dark beacon remains E; the three intended jump baits finish E/S/W.
// After marching, dark players not at N move to their wall to isolate
// jumps; light beacon may join light Shared group once movement permits.
// Preserve close/far requirements until their check actually resolves.
// Failure: bad march / failed close/far / wrong Shared occupancy -> LOG
// SIGNAL: real Divine Retribution/Plaint death, not preview kill actions;
// FAULT: wrong role/beacon setup if clone mapping and plan establish it;
// CONSEQUENCE: Major/Raid. Beacon error can kill correctly placed followers.
// Failure: jump aimed through party -> LOG SIGNAL: 18565 extra victims /
// wrong farthest target; FAULT: missed farthest bait or entrant if proven;
// CONSEQUENCE: Major if lethal, otherwise Minor unless Damage Down found.
// Removal: preview markers belong to clones; ordained march statuses
// replace Word-like duties during real execution. Death/raise and missing
// beacon behavior remain unverified; downstream failures are not new blame.
//
// -- FATE CALIBRATION BETA: OPTICAL SIGHT / RADIANT SACRAMENT --
// Preview shows eight small balls (spread) or two large balls (stacks).
// Actual playback controls 18861 spread / 18862 stack; damage uses the
// same 18572/18573 as earlier. In stacks, marked targets are the beacons;
// NAUR light group N, dark group center, then all move to donut safe boss.
// For spreads, retain separation from other 6y target circles. Normal
// jump damage requires healing before these expected spread/stack hits.
// Radiant Sacrament 18566 is a DONUT, BM radius 8..60y. Safe INSIDE 8y
// of the particular Alexander clone seen using the donut in the preview,
// not under the real boss by default and not a cross-shaped Sacrament.
// Correct play: remember previewed safe clone/jump landing, finish optical
// resolution, then sprint into its small inner safe circle before donut.
// Failure: wrong spread/stack -> LOG SIGNAL: duplicate 18572 or bad
// 18573 split; FAULT: wrong role/mover when established; CONSEQUENCE:
// Minor/Major by outcome, Raid if later resolution is impossible.
// Failure: wrong donut location -> LOG SIGNAL: 18566; FAULT: entrant /
// late mover only if safe clone known; CONSEQUENCE: Major if lethal.
// Removal: actual stack/spread consumes markers; donut resolves once.
// Not errors: beacon stack hits, correctly split dark/light groups,
// three intended jumps, moving to a boss clone instead of arena center.
//
// -- ALMIGHTY JUDGMENT / IRRESISTIBLE GRACE --
// Almighty Judgment control 18574; helper preview casts 18575 (1.5s);
// actual explosion damage 18576. Three sets of ground circles reveal
// sequentially then explode in the SAME order, ~2s apart. BM says 8-9
// individual helper casts per set, each ~6y radius. Three time steps do
// not imply only three individual AoEs. Often called exatrines/trines.
// Correct NAUR: box route using center and markers 1/3/4 (E/S/SE interior
// points); start in the third explosion set, wait for first to explode,
// move into first's cleared area via orthogonal legs. No diagonal cut
// across an unresolved adjacent circle. All party use the same ending
// point for Irresistible Grace 18580 (5s cast, ~6y heavy split stack).
// Grace resolves ~1s after third set. Heal/mitigate and stack all eight.
// Repeat twice, with the third tank-buster set between the trine sets.
// Failure: explosion hit -> LOG SIGNAL: actual 18576 (not 18575 visual);
// FAULT: entrant unless earlier displacement forced it; CONSEQUENCE:
// Minor/Major by survival and any confirmed Damage Down.
// Failure: Grace split/overlap route -> LOG SIGNAL: too few 18580 victims
// / separated expected ending positions; FAULT: missing assigned player
// if proven; CONSEQUENCE: Major if lethal. Low HP/mitigation in a correctly
// stacked party belongs to mitigation analysis, not stack assignment.
// Removal: ground circles disappear as their own set explodes; Grace
// marker consumed. No dispellable player debuff or sourced death burst.
//
// -- TEMPORAL INTERFERENCE / TEMPORAL PRISON ENRAGE --
// Temporal Interference control 18582 (5s) starts final sequence;
// Temporal Prison 18583 (42s cast), incarceration player status raw 2165.
// Boss goes center, eight prison locations begin NE and progress clockwise.
// One assigned player enters each successive prison; first incarceration
// ~10s after Prison begins, next six ~5s apart. Final player can continue
// damage until the cast/last prison resolves. This is a declining-uptime
// soft enrage followed by the final hard enrage, not eight accidental CCs.
// Correct plan: sacrifice lowest remaining damage first, usually healers
// then tanks then DPS; actual individual order is a raid assignment and
// depends on jobs/resources. Spend final buffs/potions before imprisonment.
// Player stops acting once imprisoned; no Esuna/ordinary rescue required.
// Removal: imprisonment ends with victory/reset, not a planned cleanse.
// Its handling on death/raise during the sequence remains unverified.
// Failure: missed/multiple occupancy -> LOG SIGNAL: wrong/absent 2165
// application for the expected prison / lethal sequence outcome; FAULT:
// assigned entrant only if prison order known; CONSEQUENCE: Raid if the
// objective fails, named Major when established. Precise penalty unknown.
// Failure: final enrage -> LOG SIGNAL: completed 18583 / remaining party
// locked out while boss alive; FAULT: collective, not the final DPS by
// default; CONSEQUENCE: Raid. Cast BEGIN is expected burn time.
// Candidate Faithlessness 19073 is an incompletely identified wipe
// ability in BM; its relationship to empty prisons/other failures is OPEN,
// not an established universal mechanic-failure classifier.
// Not errors: eight intended imprisonments, zero late casts from an
// imprisoned healer, no healing after final stack when survival is secure,
// delaying a high-output player to the end, an earlier kill skipping rings.
//
// -- STRATEGY VARIANCE / WHAT ENDS A PULL --
// Final Word can rotate/mirror N/S into E/W if all beacon/follower geometry
// moves together. FCA stack-left/Assault-right can be reversed (US's
// lightning-right naming depends on viewpoint); safety and ownership must
// be judged against the actual plan. FCB beacon positions, jump sides
// and spread/stack layouts also vary; NAUR's A/2 setup is one complete
// prescription, not a marker-independent distance test.
// Box trines and alternate edge-following paths are valid if they respect
// actual reveal order and end together for Grace. Shared versus invuln
// Capital changes expected recipient counts. Prison order is not job-fixed.
// A single Motion/Stillness death can sometimes be raised; it is Major,
// not automatic Raid. Missing enough people for required replay groups,
// irrecoverable beacon routes, failed prison objectives or actual final
// enrage establish cutoffs. Do not count preview deaths as that state.
//
// -- OPEN QUESTIONS FOR LOG VERIFICATION --
// 1. FFLogs mapping for all success/penalty events, movement resolution,
//    Damage Down, Faithlessness, lethal arena edge and forced-motion deaths.
// 2. Availability of player->clone ownership, color extra fields, tethers,
//    preview actor positions and marker coordinates in the exported data.
//    Can every FCA/FCB assignment be recovered without a VOD/raid call?
// 3. Actual Stillness animation window (autos/abilities/turning/jumping),
//    whether 18560/18561 also serve calibration penalties, and input vs
//    position limitations; verify second FCA check independently of first.
// 4. Word/FCB march distances and triggers, close/far thresholds, beacon
//    death/raise handling, Codex persistence and status replacement order.
// 5. FCA actual split requirement, Defamation radius/safe-clone geometry,
//    FCB jump bait snapshots, Optical stack sizes and donut safe radius.
// 6. Buster enmity/swap timing, planned invulns, trine individual AoE count,
//    prison occupancy penalty/order and enrage cast vs final freeze timing.

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import type { ReportedOccurrence } from "@/lib/mechanics/occurrences";
import { joinNames, playerError, raidMarker } from "@/lib/mechanics/wow/common";
import { findPlayerPosition } from "@/lib/mechanics/player-position";
import {
  DEATH_EVENT_LAG_MS, type Life, bodyHit, buildLife, uniq, namesOf, isTank, resetCluster,
} from "@/lib/mechanics/ffxiv/fru/common";

export const PA_ORDAINED_RULE_ID       = "ffxiv-pa-ordained";
export const PA_BEACON_RULE_ID         = "ffxiv-pa-beacon";
export const PA_MARCH_RULE_ID          = "ffxiv-pa-march";
export const PA_SACRAMENT_RULE_ID      = "ffxiv-pa-sacrament";
export const PA_SACRAMENT_RAID_RULE_ID = "ffxiv-pa-sacrament-party";
export const PA_DEFAMATION_RULE_ID     = "ffxiv-pa-defamation";
export const PA_DEFAMATION_AIM_RULE_ID = "ffxiv-pa-defamation-aim";
export const PA_ASSAULT_RULE_ID        = "ffxiv-pa-assault-shared";
export const PA_SPREAD_RULE_ID         = "ffxiv-pa-spread";
export const PA_STACK_RULE_ID          = "ffxiv-pa-stack";
export const PA_CAPITAL_RULE_ID        = "ffxiv-pa-capital";
export const PA_TETHER_RULE_ID         = "ffxiv-pa-tether";
export const PA_JUMP_RULE_ID           = "ffxiv-pa-jump";
export const PA_DONUT_RULE_ID          = "ffxiv-pa-donut";
export const PA_TRINE_RULE_ID          = "ffxiv-pa-trine";
export const PA_GRACE_RULE_ID          = "ffxiv-pa-grace";
export const PA_ENRAGE_RULE_ID         = "ffxiv-pa-enrage";
export const PA_MASS_DEATH_RULE_ID     = "ffxiv-pa-mass-death";
export const PA_TANKS_DEAD_RULE_ID     = "ffxiv-pa-tanks-dead";
export const PA_COLLAPSE_RULE_ID       = "ffxiv-pa-collapse";
export const PA_CALLED_WIPE_RULE_ID    = "ffxiv-pa-called-wipe";

const FINAL_WORD      = 18557;
const MOTION_CHECKS   = [18558, 18859];  // Final Word / Fate Calibration α controllers
const STILL_CHECKS    = [18559, 18860];
const MOTION_FAIL     = 18560;
const STILL_FAIL      = 18561;
const RETRIBUTION_LIGHT = 18562;          // a light follower touched the light beacon (or lost it)
const RETRIBUTION_DARK  = 18563;          // a dark follower got away from the dark beacon (or lost it)
const CALIBRATION_A   = 18556;
const OBLOQUY         = 18528;
const SEVERITY        = 18529;
const SOLIDARITY      = 18530;
const SURETY          = 18531;
const SACRAMENT       = 18569;
const INDIVIDUAL      = 18572;
const COLLECTIVE      = 18573;
const OPTICAL_SIGHTS  = [18570, 18571, 18861, 18862];
const CAPITAL         = 18579;
const PUNISHMENT      = 18577;
const CALIBRATION_B   = 19220;
const J_JUMP          = 18565;
const RADIANT_SACRAMENT = 18566;
const ALMIGHTY_JUDGMENT = 18576;          // the explosions (18575 is the preview)
const IRRESISTIBLE_GRACE = 18580;
const TEMPORAL_PRISON = 18583;
const HOUSE_ARREST    = 1001123;
const RESTRAINING     = 1001124;

type Color = "light" | "dark";
type MarchRole = { color: Color; beacon: boolean };
// Final Word's statuses, then the Ordained ones the march runs on (Fate
// Calibration β applies the Ordained ones directly).
const MARCH_ROLE: Record<number, MarchRole> = {
  1002152: { color: "light", beacon: false }, 1002153: { color: "light", beacon: true },
  1002154: { color: "dark", beacon: false },  1002155: { color: "dark", beacon: true },
  1003055: { color: "light", beacon: false }, 1003056: { color: "light", beacon: true },
  1003057: { color: "dark", beacon: false },  1003058: { color: "dark", beacon: true },
};
const ORDAINED = [1003055, 1003056, 1003057, 1003058];

// Clock (from the cast completing; every pull within ~0.2s):
// Final Word +7.1 first check, +10.7 march (Ordained statuses), +15.7 march
// over, +18.3 second check. Fate Calibration α +7.2 / +11.3 checks, +10.2
// Obloquy, +10.7 Solidarity, +11.3 Severity and Sacraments (0.5s apart).
// Fate Calibration β +5.1 march, +10.1 over, +12.2 Surety / Solidarity,
// +13.2 J Jumps, +17.2 Optical Sight (hits +19.6), +24.2 Radiant Sacrament.
const FW_MARCH_AT = 10_700;
const FW_MARCH_END = 15_700;
const FCB_MARCH_AT = 5_100;
const FCB_MARCH_END = 10_100;

// The four clones north of the arena for Fate Calibration α's crosses; the
// one that doesn't fire sets the safe axis (all eight pulls).
const FCA_CLONES = [{ x: 7800, y: 9100 }, { x: 9100, y: 7800 }, { x: 10900, y: 7800 }, { x: 12200, y: 9100 }];
const CENTER = { x: 10000, y: 10000 };
// Each cross is two ~16-17y-wide lanes through its clone, one aimed at the
// center: A28 +11.8 the PLD was hit 8.3y off its center line, the rest of
// the party stood 9.7y+ off it.
// The Defamation holder's spot is the wall in front of the non-firing
// clone: 5.8-6.3y from it in the clean pulls (A27, A31, B4, B12, B16); B11's
// holder stood 12.2y off it, in a cross.
const DEFAM_SPOT_MAX_Y = 9;
// Restraining Order: clean pairs 34.2-34.3y apart (B4, B11, B16); B12's
// pair 29.7y apart failed (both died).
const SURETY_FAIL_MIN = 100;      // clean Plaint of Surety hits are 0 damage
const MASS_DEATH_COUNT = 4;
const MASS_DEATH_WINDOW = 8_000;
const COLLAPSE_DEAD = 6;
const COLLAPSE_END_MS = 35_000;
const CALLED_WIPE_COUNT = 3;
const CALLED_WIPE_WINDOW = 10_000;
const CALLED_WIPE_END_MS = 12_000;
const RAISE_GRACE_MS = 10_000;
const TANKS_RAISE_MS = 20_000;

const dist = (a: { x?: number; y?: number } | undefined, b: { x?: number; y?: number } | undefined) =>
  !a || !b || a.x === undefined || a.y === undefined || b.x === undefined || b.y === undefined ? NaN : Math.hypot(a.x - b.x, a.y - b.y) / 100;
const yd = (n: number) => `~${n.toFixed(1)}y`;
const posAt = (p: PlayerInfo, t: number) => findPlayerPosition(p, t, { windowMs: 1_500 });

type Ctx = {
  players: PlayerInfo[];
  deaths: DeathEvent[];
  life: Life;
  casts: EnemyEvent[];
  errors: PullError[];
  raids: PullError[];
  occurrences?: ReportedOccurrence[];
};

/** Hits of one or more abilities on living players in [a, b]. */
function hitsIn(c: Ctx, ids: number | number[], a: number, b: number): { p: PlayerInfo; e: PlayerEvent }[] {
  const set = new Set(Array.isArray(ids) ? ids : [ids]);
  const out: { p: PlayerInfo; e: PlayerEvent }[] = [];
  for (const p of c.players) for (const e of p.damageTaken) {
    if (!set.has(e.abilityId) || e.timestamp < a || e.timestamp > b || bodyHit(e)) continue;
    if (c.life.hitAlive(p, e.timestamp)) out.push({ p, e });
  }
  return out.sort((x, y) => x.e.timestamp - y.e.timestamp);
}

const diedAfter = (c: Ctx, p: PlayerInfo, t: number, ms = 3_000) =>
  c.deaths.some((d) => d.player === p.name && d.timestamp >= t && d.timestamp <= t + ms + DEATH_EVENT_LAG_MS);

/** Raised (came back from a death) in the `ms` before t. */
const raisedRecently = (c: Ctx, t: number, ms = RAISE_GRACE_MS) =>
  c.life.outIntervals.some((w) => w.end <= t && t - w.end <= ms);

const everyoneUp = (c: Ctx, t: number) => c.players.every((p) => c.life.alive(p, t)) && !raisedRecently(c, t);

/**
 * The Epic of Alexander, Phase 4: Perfect Alexander, from The Final Word to
 * the end of the pull. Self-gates on The Final Word (only this phase casts
 * it).
 */
export function detectPerfectAlexanderErrors(
  players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], occurrences?: ReportedOccurrence[],
): PullError[] {
  const fw = enemyCasts.find((x) => x.abilityId === FINAL_WORD);
  if (!fw) return [];
  const start = fw.timestamp - 10_000;   // the 4s cast, plus the autos before it
  const lastEvent = Math.max(0, ...players.flatMap((p) => [...p.damageTaken, ...p.casts].map((e) => e.timestamp)));
  const life = buildLife(players, deathEvents);
  const casts = enemyCasts.filter((x) => x.timestamp >= start);
  const c: Ctx = { players, deaths: deathEvents, life, casts, errors: [], raids: [], occurrences };

  detectOrdained(c, start);
  detectMarch(c, "Final Word", fw.timestamp, fw.timestamp + FW_MARCH_AT, fw.timestamp + FW_MARCH_END);
  const calA = casts.find((x) => x.abilityId === CALIBRATION_A);
  if (calA) detectCalibrationAlpha(c, calA.timestamp);
  const calB = casts.find((x) => x.abilityId === CALIBRATION_B);
  if (calB) detectCalibrationBeta(c, calB.timestamp);
  for (const o of casts.filter((x) => OPTICAL_SIGHTS.includes(x.abilityId))) detectOptical(c, o);
  detectBusters(c, start);
  detectTrines(c, start);
  const prison = casts.find((x) => x.abilityId === TEMPORAL_PRISON);
  if (prison) c.raids.push(raidMarker(PA_ENRAGE_RULE_ID, "Temporal Prison", "Perfect Alexander finished Temporal Prison: it wasn't killed in time. Treated as the cutoff point.", prison.timestamp, TEMPORAL_PRISON, "Temporal Prison"));

  const errors = c.errors;
  const firstRaid = c.raids.sort((a, b) => a.timestamp - b.timestamp)[0];
  if (firstRaid) errors.push(firstRaid);
  else {
    const marker = genericCutoff(c, start, lastEvent);
    if (marker) errors.push(marker);
  }
  return errors.sort((a, b) => a.timestamp - b.timestamp);
}

// ── Ordained Motion / Stillness ─────────────────────────────────────────────

/**
 * Every failed Motion or Stillness check is its own hit (18560 / 18561), on
 * the player who moved or stood still at the wrong time: Final Word's two
 * checks (always opposite) and Fate Calibration α's two (previewed; can be
 * the same).
 */
function detectOrdained(c: Ctx, start: number) {
  const checks = c.casts.filter((x) => MOTION_CHECKS.includes(x.abilityId) || STILL_CHECKS.includes(x.abilityId));
  for (const h of hitsIn(c, [MOTION_FAIL, STILL_FAIL], start, Infinity)) {
    const motion = h.e.abilityId === MOTION_FAIL;
    const check = [...checks].reverse().find((x) => x.timestamp <= h.e.timestamp + 200);
    const set = check && (check.abilityId === 18558 || check.abilityId === 18559) ? "Final Word" : "Fate Calibration α";
    const nth = check ? checks.filter((x) => x.timestamp <= check.timestamp && Math.abs(x.timestamp - check.timestamp) < 20_000 && ((x.abilityId === 18558 || x.abilityId === 18559) === (check.abilityId === 18558 || check.abilityId === 18559))).length : 0;
    const died = c.life.diedFrom(h.p, h.e.timestamp) !== undefined;
    c.errors.push(playerError(h.p, {
      ruleId: PA_ORDAINED_RULE_ID, severity: "Major", name: motion ? "Failed Ordained Motion" : "Failed Ordained Stillness",
      description: `${motion ? "Stood still through" : "Moved or acted during"} ${set}'s ${nth === 1 ? "first" : nth === 2 ? "second" : ""} ${motion ? "Ordained Motion" : "Ordained Stillness"} check${died ? " and died" : ""}. ${motion ? "Keep moving until the check resolves." : "Stop moving, casting and auto-attacking before the check resolves."}${set === "Final Word" ? " Final Word's second check is always the opposite of its first." : " Fate Calibration α's two checks are the ones its clones showed, and can be the same twice."}`,
      timestamp: h.e.timestamp, abilityId: h.e.abilityId, abilityName: h.e.abilityName,
    }));
  }
}

// ── Forced march (Final Word, Fate Calibration β) ───────────────────────────

/** Each player's march role (color, beacon or follower) given in [a, b]. */
function marchRoles(c: Ctx, a: number, b: number): Map<PlayerInfo, MarchRole> {
  const out = new Map<PlayerInfo, MarchRole>();
  for (const p of c.players) {
    const e = p.debuffs.find((x) => MARCH_ROLE[x.abilityId] && x.debuffStatus === "applied" && x.timestamp >= a && x.timestamp <= b);
    if (e) out.set(p, MARCH_ROLE[e.abilityId]);
  }
  return out;
}

/**
 * The march: light followers walk toward the light beacon and must not
 * touch it; dark followers walk away from the dark beacon and must not get
 * away from it. A broken rule is Divine Retribution on the follower (light
 * 18562, dark 18563); a follower whose beacon is dead takes it too (A10:
 * both beacons died at the first check), which is fallout. When every
 * living follower of one color took it, the beacon stood in the wrong place
 * (A31, B3: the light beacon stayed in the group; A28 Fate Calibration β);
 * otherwise the follower who took it started from the wrong spot (B11). A
 * follower dying with no killing blow during the march walked into the wall
 * (B3: the dancer started south of the dark beacon).
 */
function detectMarch(c: Ctx, label: string, cast: number, marchAt: number, marchEnd: number) {
  const roles = marchRoles(c, cast - 1_000, marchAt + 500);
  if (!roles.size) return;
  const beacons = [...roles].filter(([, r]) => r.beacon).map(([p]) => p);
  const aliveBeacons = beacons.filter((p) => c.life.alive(p, marchAt));
  if (aliveBeacons.length) c.occurrences?.push({ mechanicKey: PA_BEACON_RULE_ID, timestamp: marchAt, players: aliveBeacons.map((p) => p.name) });
  for (const color of ["light", "dark"] as Color[]) {
    const id = color === "light" ? RETRIBUTION_LIGHT : RETRIBUTION_DARK;
    const beacon = [...roles].find(([, r]) => r.beacon && r.color === color)?.[0];
    const followers = [...roles].filter(([, r]) => !r.beacon && r.color === color).map(([p]) => p);
    const hits = hitsIn(c, id, cast, marchEnd + 2_000).filter((h) => followers.includes(h.p));
    if (!hits.length) continue;
    const t = hits[0].e.timestamp;
    if (!beacon || !c.life.alive(beacon, t)) continue;   // a dead beacon takes its followers with it: fallout
    const living = followers.filter((p) => c.life.alive(p, marchAt - 300));
    const hitPlayers = uniq(hits.map((h) => h.p));
    const killed = hitPlayers.filter((p) => diedAfter(c, p, t, 5_000));
    if (hitPlayers.length >= 2 && living.every((p) => hitPlayers.includes(p))) {
      const bp = posAt(beacon, marchAt);
      const gap = hitPlayers.map((p) => dist(bp, posAt(p, marchAt))).filter((d) => !isNaN(d));
      const where = gap.length ? ` They started ${yd(Math.min(...gap))} from the beacon.` : "";
      c.errors.push(playerError(beacon, {
        ruleId: PA_BEACON_RULE_ID, severity: "Major", name: `Misplaced ${color === "light" ? "Light" : "Dark"} Beacon`,
        description: `${label}: as the ${color} beacon they weren't where the march needs them, so every ${color} follower (${namesOf(hitPlayers)}) took Divine Retribution${killed.length === hitPlayers.length ? ", all of them dying" : killed.length ? ` and ${namesOf(killed)} died` : ""}.${where} ${color === "light" ? "NAUR: the light beacon goes to the north wall (A) before the march; the followers walk toward it from the south group and must not reach it." : "NAUR: the dark beacon stands just south of the group, which marches north away from it."}`,
        timestamp: t, abilityId: id, abilityName: "Divine Retribution",
      }));
      continue;
    }
    for (const p of hitPlayers) {
      const h = hits.find((x) => x.p === p)!;
      const d = dist(posAt(beacon, marchAt), posAt(p, marchAt));
      c.errors.push(playerError(p, {
        ruleId: PA_MARCH_RULE_ID, severity: "Major", name: color === "light" ? "Touched the Light Beacon" : "Escaped the Dark Beacon",
        description: `${label}: as a ${color} follower they took Divine Retribution${diedAfter(c, p, h.e.timestamp) ? " and died" : ""}${isNaN(d) ? "" : ` (${yd(d)} from the ${color} beacon as the march began)`}, while the other ${color} followers were fine. ${color === "light" ? "Light followers march toward the light beacon: start far enough from it that the march stops short." : "Dark followers march away from the dark beacon: start close to it, with room to walk."}`,
        timestamp: h.e.timestamp, abilityId: id, abilityName: "Divine Retribution",
      }));
    }
  }
  // Walked into the wall: a follower's death with no killing blow during the march.
  for (const [p, r] of roles) {
    if (r.beacon) continue;
    const d = c.deaths.find((x) => x.player === p.name && !x.killingAbilityGameId && x.timestamp - DEATH_EVENT_LAG_MS >= marchAt && x.timestamp - DEATH_EVENT_LAG_MS <= marchEnd + 1_000);
    if (!d || !c.life.alive(p, marchAt - 300)) continue;
    const beacon = [...roles].find(([, q]) => q.beacon && q.color === r.color)?.[0];
    const bd = beacon ? dist(posAt(beacon, marchAt), posAt(p, marchAt)) : NaN;
    c.errors.push(playerError(p, {
      ruleId: PA_MARCH_RULE_ID, severity: "Major", name: "Marched Into the Wall",
      description: `${label}: died during the forced march with no killing blow, walked into the wall${isNaN(bd) ? "" : ` (${yd(bd)} from the ${r.color} beacon as it began)`}. ${r.color === "dark" ? "Dark followers start on the center side of the dark beacon, so they march into the arena." : "Light followers start on the far side of the arena from the light beacon."}`,
      timestamp: d.timestamp - DEATH_EVENT_LAG_MS, abilityId: 0, abilityName: "Forced March",
    }));
  }
}

// ── Fate Calibration α ──────────────────────────────────────────────────────

/** Distance from a point to the cross a clone casts (two 16y lanes through it, one aimed at the center). */
function crossDistance(clone: { x: number; y: number }, p: { x?: number; y?: number }): number {
  if (p.x === undefined || p.y === undefined) return NaN;
  const ax = CENTER.x - clone.x, ay = CENTER.y - clone.y;
  const len = Math.hypot(ax, ay);
  const ux = ax / len, uy = ay / len;
  const vx = p.x - clone.x, vy = p.y - clone.y;
  const along = Math.abs(vx * ux + vy * uy), across = Math.abs(vx * uy - vy * ux);
  return Math.min(along, across) / 100;
}

/**
 * Playback of the α projection: two movement checks (detectOrdained), the
 * Defamation (Plaint of Obloquy, cast at its holder), three Assaults (Plaint
 * of Severity, cast at each), the shared stack (Plaint of Solidarity) and
 * three of the four northern clones' Sacrament crosses. The non-firing
 * clone sets the safe axis: Defamation at the wall in front of it, the
 * other seven at the far side of the arena.
 */
function detectCalibrationAlpha(c: Ctx, cal: number) {
  const win = (ids: number | number[]) => c.casts.filter((x) => (Array.isArray(ids) ? ids : [ids]).includes(x.abilityId) && x.timestamp >= cal && x.timestamp <= cal + 15_000);
  const sacs = win(SACRAMENT);
  const firing = sacs.map((s) => FCA_CLONES.find((k) => dist(k, s) < 3)).filter((k): k is { x: number; y: number } => !!k);
  const safe = firing.length === 3 ? FCA_CLONES.find((k) => !firing.includes(k)) : undefined;

  // Sacrament: a 16y-wide cross from each firing clone.
  const sacHits = hitsIn(c, SACRAMENT, cal, cal + 15_000);
  const sacVictims = uniq(sacHits.map((h) => h.p));
  for (const p of sacVictims) {
    const h = sacHits.find((x) => x.p === p)!;
    const clone = FCA_CLONES.find((k) => sacs.some((s) => s.sourceInstance === h.e.sourceInstance && dist(k, s) < 3));
    const off = clone ? crossDistance(clone, h.e) : NaN;
    const died = diedAfter(c, p, h.e.timestamp);
    c.errors.push(playerError(p, {
      ruleId: PA_SACRAMENT_RULE_ID, severity: died ? "Major" : "Minor", name: "Hit by Sacrament",
      // A hit position past the lane's edge is a player who moved after the snapshot (A28: 10.6y).
      description: `Stood in a Fate Calibration α Sacrament cross${isNaN(off) || off > 8.5 ? "" : ` (${yd(off)} from its lane's center line; each lane is ~16y wide)`}${died ? " and died" : ""}. Three of the four northern clones fire; the one that doesn't is the safe axis: Defamation at the wall in front of it, everyone else on the far side of the arena.`,
      timestamp: h.e.timestamp, abilityId: SACRAMENT, abilityName: "Sacrament",
    }));
  }
  if (sacVictims.length >= 4) {
    c.raids.push(raidMarker(PA_SACRAMENT_RAID_RULE_ID, "Party in Sacrament",
      `${sacVictims.length} players (${namesOf(sacVictims)}) stood in Fate Calibration α's Sacrament crosses: a whole group on the wrong side of the safe axis. Unresolvable from here; treated as the cutoff point.`,
      sacHits[sacHits.length - 1].e.timestamp, SACRAMENT, "Sacrament"));
  }

  // Defamation: Plaint of Obloquy reaches ~30y around its holder.
  const obl = win(OBLOQUY)[0];
  const oblHits = obl ? hitsIn(c, OBLOQUY, obl.timestamp - 200, obl.timestamp + 2_000) : [];
  // The cast sits on its holder; it names them unless it hit several (A31).
  const holder = obl?.target ? c.players.find((p) => p.name === obl.target)
    : oblHits.map((h) => ({ p: h.p, d: dist(h.e, obl) })).filter((x) => x.d < 2).sort((a, b) => a.d - b.d)[0]?.p;
  if (obl && holder) {
    c.occurrences?.push({ mechanicKey: PA_DEFAMATION_AIM_RULE_ID, timestamp: obl.timestamp, players: [holder.name] });
    const own = oblHits.find((h) => h.p === holder)?.e ?? posAt(holder, obl.timestamp);
    const extra = oblHits.filter((h) => h.p !== holder);
    const off = safe ? dist(own, safe) : NaN;
    if (extra.length) {
      const killed = uniq(extra.filter((h) => diedAfter(c, h.p, h.e.timestamp)).map((h) => h.p));
      if (!isNaN(off) && off > DEFAM_SPOT_MAX_Y) {
        c.errors.push(playerError(holder, {
          ruleId: PA_DEFAMATION_AIM_RULE_ID, severity: killed.length ? "Major" : "Minor", name: "Defamation Off Its Spot",
          description: `Held the Defamation ${yd(off)} from the non-firing clone, and Plaint of Obloquy hit ${namesOf(extra.map((h) => h.p))}${killed.length ? ` (${namesOf(killed)} died)` : ""}. The Defamation goes to the wall in front of the clone that didn't fire (~6y from it), the rest of the party to the far side.`,
          timestamp: obl.timestamp, abilityId: OBLOQUY, abilityName: "Plaint of Obloquy",
        }));
      } else {
        for (const h of extra) {
          const d = dist(own, h.e);
          const died = diedAfter(c, h.p, h.e.timestamp);
          c.errors.push(playerError(h.p, {
            ruleId: PA_DEFAMATION_RULE_ID, severity: died ? "Major" : "Minor", name: "Hit by the Defamation",
            description: `Caught ${holder.name}'s Defamation (Plaint of Obloquy)${isNaN(d) ? "" : ` ${yd(d)} from them`}${died ? " and died" : ""}, with the holder on their spot. Its reach is ~33y: everyone else stands at the far side of the arena (34y+ away in the clean pulls).`,
            timestamp: h.e.timestamp, abilityId: OBLOQUY, abilityName: "Plaint of Obloquy",
          }));
        }
      }
    }
  }

  // Assaults (Severity targets) must stay out of the shared stack.
  const assaults = uniq(win(SEVERITY).map((x) => c.players.find((p) => p.name === x.target)).filter((p): p is PlayerInfo => !!p));
  if (assaults.length) c.occurrences?.push({ mechanicKey: PA_ASSAULT_RULE_ID, timestamp: cal + 10_700, players: assaults.map((p) => p.name) });
  for (const h of hitsIn(c, SOLIDARITY, cal, cal + 15_000).filter((x) => assaults.includes(x.p))) {
    const died = c.deaths.some((d) => d.player === h.p.name && d.timestamp >= h.e.timestamp && d.timestamp <= h.e.timestamp + 5_000);
    c.errors.push(playerError(h.p, {
      ruleId: PA_ASSAULT_RULE_ID, severity: died ? "Major" : "Minor", name: "Assault in the Shared Stack",
      description: `Held an Assault (Plaint of Severity) and stood in the shared stack (Plaint of Solidarity)${died ? " and died" : ""}. NAUR: the Assaults stand together on their own side, away from the shared group.`,
      timestamp: h.e.timestamp, abilityId: SOLIDARITY, abilityName: "Plaint of Solidarity",
    }));
  }
}

// ── Fate Calibration β ──────────────────────────────────────────────────────

/**
 * Playback of the β projection: the march (light toward, dark away), the
 * close (House Arrest) and far (Restraining Order) tethers checked by
 * Plaint of Surety, the shared stack, three J Jumps on the dark beacon, the
 * far dark and the unlinked dark, an Optical Sight, then Radiant Sacrament,
 * a donut safe only beside the clone that showed it.
 */
function detectCalibrationBeta(c: Ctx, cal: number) {
  detectMarch(c, "Fate Calibration β", cal, cal + FCB_MARCH_AT, cal + FCB_MARCH_END);
  const roles = marchRoles(c, cal, cal + FCB_MARCH_AT + 500);
  const tether = (id: number) => c.players.filter((p) => p.debuffs.some((e) => e.abilityId === id && e.debuffStatus === "applied" && e.timestamp >= cal && e.timestamp <= cal + 8_000));

  // Tethers: a pair that held the check takes 0 damage.
  const checkAt = cal + 12_200;
  for (const [id, kind] of [[HOUSE_ARREST, "close"], [RESTRAINING, "far"]] as [number, string][]) {
    const pair = tether(id);
    if (pair.length !== 2) continue;
    c.occurrences?.push({ mechanicKey: PA_TETHER_RULE_ID, timestamp: checkAt - 1_000, players: pair.map((p) => p.name) });
    const hits = hitsIn(c, SURETY, checkAt - 1_000, checkAt + 2_000).filter((h) => pair.includes(h.p) && ((h.e.amount ?? 0) >= SURETY_FAIL_MIN || diedAfter(c, h.p, h.e.timestamp)));
    if (!hits.length || !pair.every((p) => c.life.alive(p, checkAt - 500))) continue;   // a dead partner breaks it: fallout
    const [a, b] = pair;
    const d = dist(hits.find((h) => h.p === a)?.e ?? posAt(a, checkAt), hits.find((h) => h.p === b)?.e ?? posAt(b, checkAt));
    const killed = pair.filter((p) => hits.some((h) => h.p === p && diedAfter(c, p, h.e.timestamp)));
    for (const p of pair) {
      c.errors.push(playerError(p, {
        ruleId: PA_TETHER_RULE_ID, severity: "Major", name: kind === "close" ? "House Arrest Broken" : "Restraining Order Broken",
        description: `Their ${kind} tether (${kind === "close" ? "House Arrest" : "Restraining Order"}) with ${(p === a ? b : a).name} failed Plaint of Surety${isNaN(d) ? "" : ` at ${yd(d)} apart`}${killed.length ? `; ${namesOf(killed)} died` : ""}. ${kind === "close" ? "House Arrest partners stand together (the dark one goes with the light group, north)." : "Restraining Order partners stand at opposite walls, north and south: the clean pairs were 34y apart."} The log can't say which of the two moved.`,
        timestamp: hits[0].e.timestamp, abilityId: SURETY, abilityName: "Plaint of Surety",
      }));
    }
  }

  // J Jumps: one each on the dark beacon, the far dark and the unlinked dark.
  const far = tether(RESTRAINING), close = tether(HOUSE_ARREST);
  const baiters = [...roles].filter(([p, r]) => r.color === "dark" && (r.beacon || far.includes(p) || !close.includes(p))).map(([p]) => p);
  const jumpCast = c.casts.find((x) => x.abilityId === J_JUMP && x.timestamp >= cal && x.timestamp <= cal + 20_000);
  if (jumpCast && baiters.length === 3 && baiters.every((p) => c.life.alive(p, jumpCast.timestamp))) {
    const hits = hitsIn(c, J_JUMP, jumpCast.timestamp, jumpCast.timestamp + 2_500);
    const per = new Map<PlayerInfo, number>();
    for (const h of hits) per.set(h.p, (per.get(h.p) ?? 0) + 1);
    for (const [p, n] of per) {
      if (baiters.includes(p) && n === 1) continue;
      const h = hits.find((x) => x.p === p)!;
      const died = diedAfter(c, p, h.e.timestamp);
      c.errors.push(playerError(p, {
        ruleId: PA_JUMP_RULE_ID, severity: died ? "Major" : "Minor", name: "Hit by Another J Jump",
        description: `Took ${baiters.includes(p) ? `${n} J Jumps` : "a J Jump that wasn't theirs"}${died ? " and died" : ""}. Each jump goes to its farthest player: the dark beacon (east wall), the far dark (south) and the unlinked dark (west) take one each, everyone else waits north.`,
        timestamp: h.e.timestamp, abilityId: J_JUMP, abilityName: "J Jump",
      }));
    }
  }

  // Radiant Sacrament: a donut, safe only inside the clone that showed it.
  const donut = c.casts.find((x) => x.abilityId === RADIANT_SACRAMENT && x.timestamp >= cal && x.timestamp <= cal + 30_000);
  if (donut) {
    for (const h of hitsIn(c, RADIANT_SACRAMENT, donut.timestamp - 200, donut.timestamp + 2_500)) {
      const d = dist(h.e, donut);
      const died = diedAfter(c, h.p, h.e.timestamp);
      c.errors.push(playerError(h.p, {
        ruleId: PA_DONUT_RULE_ID, severity: died ? "Major" : "Minor", name: "Hit by Radiant Sacrament",
        description: `Outside the safe circle of Radiant Sacrament${isNaN(d) ? "" : ` (${yd(d)} from the clone that cast it)`}${died ? " and died" : ""}. It's a donut: after the Optical Sight everyone runs into the small circle under the clone the projection showed using it.`,
        timestamp: h.e.timestamp, abilityId: RADIANT_SACRAMENT, abilityName: "Radiant Sacrament",
      }));
    }
  }
}

// ── Optical Sight ───────────────────────────────────────────────────────────

/**
 * Spreads (Individual Reprobation, a circle on every player) and stacks
 * (Collective Reprobation, two). The game always places eight spread circles,
 * on the living: with anyone dead the extras double onto survivors (B3, A31,
 * B12, B16's sage), so overlaps count only with everyone up and nobody
 * raised in the last 10s. A clean round never doubled anyone (A21, A28, B4,
 * B11, B12, B16).
 */
function detectOptical(c: Ctx, cast: EnemyEvent) {
  const spread = cast.abilityId === 18570 || cast.abilityId === 18861;
  const id = spread ? INDIVIDUAL : COLLECTIVE;
  const hits = hitsIn(c, id, cast.timestamp, cast.timestamp + 4_000);
  if (!hits.length || !everyoneUp(c, hits[0].e.timestamp)) return;
  const owners = new Map<number, string>();
  for (const x of c.casts.filter((y) => y.abilityId === id && y.timestamp >= cast.timestamp && y.timestamp <= cast.timestamp + 4_000)) if (x.target && x.sourceInstance !== undefined) owners.set(x.sourceInstance, x.target);
  const per = new Map<PlayerInfo, Set<number>>();
  for (const h of hits) per.set(h.p, new Set([...(per.get(h.p) ?? []), h.e.sourceInstance ?? -1]));
  for (const [p, inst] of per) {
    if (inst.size < 2) continue;
    const h = hits.find((x) => x.p === p)!;
    const died = c.deaths.some((d) => d.player === p.name && d.timestamp >= h.e.timestamp && d.timestamp <= h.e.timestamp + 5_000);
    const others = [...inst].map((i) => owners.get(i)).filter((n): n is string => !!n && n !== p.name);
    c.errors.push(playerError(p, {
      ruleId: spread ? PA_SPREAD_RULE_ID : PA_STACK_RULE_ID, severity: died ? "Major" : "Minor", name: spread ? "Spread Overlap" : "In Both Stacks",
      description: spread
        ? `Took ${inst.size} Individual Reprobation circles${others.length ? ` (${joinNames(uniq(others))}'s too)` : ""}${died ? " and died" : ""}: the 6y spread circles need their own spot each.`
        : `Stood in both Collective Reprobation stacks${died ? " and died" : ""}: the party splits into two groups of four, one per marked player.`,
      timestamp: h.e.timestamp, abilityId: id, abilityName: h.e.abilityName,
    }));
  }
}

// ── Busters, trines, Irresistible Grace ─────────────────────────────────────

/** Ordained Capital Punishment / Punishment belong to the tanks: a non-tank in them, with a tank alive. */
function detectBusters(c: Ctx, start: number) {
  for (const h of hitsIn(c, [CAPITAL, PUNISHMENT], start, Infinity)) {
    // No tank up for the last 20s (dead, or raised without enmity: A31): the buster falls to the party.
    const t = h.e.timestamp;
    if (isTank(h.p) || !c.players.some((p) => isTank(p) && !c.life.outIntervals.some((w) => w.p === p && w.start <= t && w.end >= t - 20_000))) continue;
    const died = diedAfter(c, h.p, h.e.timestamp);
    c.errors.push(playerError(h.p, {
      ruleId: PA_CAPITAL_RULE_ID, severity: died ? "Major" : "Minor", name: "In the Tank Buster",
      description: `Stood in ${h.e.abilityName}, the tanks' buster${died ? ", and died" : ""}. Everyone else stays clear of the tanks.`,
      timestamp: h.e.timestamp, abilityId: h.e.abilityId, abilityName: h.e.abilityName,
    }));
  }
}

function detectTrines(c: Ctx, start: number) {
  for (const h of hitsIn(c, ALMIGHTY_JUDGMENT, start, Infinity)) {
    const died = diedAfter(c, h.p, h.e.timestamp);
    c.errors.push(playerError(h.p, {
      ruleId: PA_TRINE_RULE_ID, severity: died ? "Major" : "Minor", name: "Hit by Almighty Judgment",
      description: `Stood in an Almighty Judgment explosion${died ? " and died" : ""}. The three sets explode in the order they appeared: start in the third set's area and step into the first's once it has gone off.`,
      timestamp: h.e.timestamp, abilityId: ALMIGHTY_JUDGMENT, abilityName: "Almighty Judgment",
    }));
  }
  // Irresistible Grace: all eight share it (8 of 8 in all six clean ones).
  for (const g of c.casts.filter((x) => x.abilityId === IRRESISTIBLE_GRACE && x.timestamp >= start)) {
    const hits = hitsIn(c, IRRESISTIBLE_GRACE, g.timestamp - 200, g.timestamp + 2_500);
    if (!hits.length) continue;
    const t = hits[0].e.timestamp;
    const inStack = new Set(hits.map((h) => h.p));
    const killed = uniq(hits.filter((h) => c.life.diedFrom(h.p, h.e.timestamp)).map((h) => h.p));
    for (const p of c.players.filter((q) => !inStack.has(q) && c.life.alive(q, t) && c.life.alive(q, t - 5_000))) {
      c.errors.push(playerError(p, {
        ruleId: PA_GRACE_RULE_ID, severity: killed.length ? "Major" : "Minor", name: "Missed Irresistible Grace",
        description: `Alive but outside Irresistible Grace, which ${inStack.size} shared${killed.length ? `; ${namesOf(killed)} died` : ""}. All eight finish the trines on the same spot and take it together.`,
        timestamp: t, abilityId: IRRESISTIBLE_GRACE, abilityName: "Irresistible Grace",
      }));
    }
  }
}

// ── Cutoffs ─────────────────────────────────────────────────────────────────

/**
 * Generic cutoffs for wipes with no mechanic Raid, earliest first: a called
 * wipe (3+ no-killing-blow deaths in 10s, or any within 12s of the end;
 * march walls excluded), 4+ deaths within 8s (one mechanic going wrong:
 * A10, A21, A28, A31, B3, B12), both tanks dead (Capital Punishment and the
 * autos then go through the party: A27, A31), or six dead with the pull
 * over within 35s (P4 pulls kept going with five dead for a minute: A27,
 * A31).
 */
function genericCutoff(c: Ctx, start: number, lastEvent: number): PullError | undefined {
  const { players, deaths, life } = c;
  const inPhase = deaths.filter((d) => d.timestamp - DEATH_EVENT_LAG_MS >= start).sort((a, b) => a.timestamp - b.timestamp);
  const marchWall = new Set(c.errors.filter((e) => e.ruleId === PA_MARCH_RULE_ID && e.abilityId === 0).map((e) => `${e.player}@${e.timestamp + DEATH_EVENT_LAG_MS}`));
  const silent = inPhase.filter((d) => !d.killingAbilityGameId && !marchWall.has(`${d.player}@${d.timestamp}`));
  const out: PullError[] = [];

  const called = new Set<DeathEvent>();
  for (const d of silent) {
    if (lastEvent - d.timestamp <= CALLED_WIPE_END_MS) called.add(d);
    const near = resetCluster(silent.filter((x) => Math.abs(x.timestamp - d.timestamp) <= CALLED_WIPE_WINDOW), deaths);
    if (near.length >= CALLED_WIPE_COUNT) near.forEach((x) => called.add(x));
  }
  const calledList = resetCluster([...called], deaths).sort((a, b) => a.timestamp - b.timestamp);
  if (calledList.length >= CALLED_WIPE_COUNT || (calledList.length && lastEvent - calledList[0].timestamp <= CALLED_WIPE_END_MS)) {
    out.push(raidMarker(PA_CALLED_WIPE_RULE_ID, "Wipe Called",
      `${calledList.length} player${calledList.length > 1 ? "s" : ""} died with no killing blow (${joinNames(uniq(calledList.map((d) => d.player)))}) near the end: the wipe was called.`,
      calledList[0].timestamp - DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }

  for (let i = 0; i < inPhase.length; i++) {
    const group = inPhase.filter((d) => d.timestamp >= inPhase[i].timestamp && d.timestamp - inPhase[i].timestamp <= MASS_DEATH_WINDOW);
    if (uniq(group.map((d) => d.player)).length < MASS_DEATH_COUNT) continue;
    const causes = uniq(group.map((d) => d.cause || "no killing blow"));
    // Stamped at the fourth death's hit, so the failure that caused it
    // (B3's beacon, B12's tether) lists before the cutoff.
    const nth = group.filter((d, k) => group.findIndex((x) => x.player === d.player) === k)[MASS_DEATH_COUNT - 1];
    out.push(raidMarker(PA_MASS_DEATH_RULE_ID, "Mass Death",
      `${uniq(group.map((d) => d.player)).length} players died within ${Math.round((group[group.length - 1].timestamp - group[0].timestamp) / 1000)}s (${joinNames(uniq(group.map((d) => d.player)))}; ${joinNames(causes)}). Unresolvable from here; treated as the cutoff point.`,
      nth.timestamp - DEATH_EVENT_LAG_MS, nth.killingAbilityGameId, nth.cause));
    break;
  }

  const tanks = players.filter(isTank);
  const outAt = (t: number) => players.filter((p) => !life.alive(p, t));
  const starts = life.outIntervals.map((w) => w.start).filter((t) => t >= start).sort((a, b) => a - b);
  if (tanks.length === 2) {
    // A31 raised both tanks within ~16s of the Final Word march killing them and carried on.
    const t = starts.find((x) => tanks.every((p) => !life.alive(p, x + 1) && !life.alive(p, x + TANKS_RAISE_MS)));
    if (t !== undefined) {
      out.push(raidMarker(PA_TANKS_DEAD_RULE_ID, "Both Tanks Dead",
        `Both tanks were dead at once (${namesOf(tanks)}): Perfect Alexander's autos and Ordained Capital Punishment go through the party from here. Treated as the cutoff point.`,
        t + DEATH_EVENT_LAG_MS, 0, "Deaths"));
    }
  }
  const collapseT = starts.find((t) => outAt(t + 1).length >= COLLAPSE_DEAD && lastEvent - t <= COLLAPSE_END_MS);
  if (collapseT !== undefined) {
    const who = outAt(collapseT + 1).map((p) => p.name);
    out.push(raidMarker(PA_COLLAPSE_RULE_ID, "Party Collapse",
      `${who.length} players were dead at once (${joinNames(who)}). Treated as the cutoff point.`,
      collapseT + DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  return out.sort((a, b) => a.timestamp - b.timestamp)[0];
}
