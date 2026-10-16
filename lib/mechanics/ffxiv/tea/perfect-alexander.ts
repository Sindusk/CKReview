// The Epic of Alexander (Ultimate) -- Phase 4: Perfect Alexander.
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
