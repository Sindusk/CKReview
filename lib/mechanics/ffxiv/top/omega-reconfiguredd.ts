// The Omega Protocol (Ultimate) -- Phase 3: Omega Reconfigured.
// Filename deliberately follows the requested omega-reconfiguredd.ts.
//
// -- GUIDE-DERIVED MODEL (2026-10-14; NOT VERIFIED AGAINST LOGS) --
// Comment-only research, including P2->P3 transition. All failure signals
// are guide-inferred. No local reports were analyzed. Scope: 6.31
// Ultimate script, sync 635. Patch 6.35 (2023-03-07) corrected Omega
// autoattacking during Hello World's Magic Vulnerability Up; launch
// guides/pre-fix pulls can differ in dangerous autoattack overlaps.
// Avoid assuming all "Debugger" buffs have the same removal semantics.
//
// -- SOURCES CHECKED 2026-10-14 --
// [IV] Lavender/Meru: transition, Hello World and two monitor layouts:
// https://www.icy-veins.com/ffxiv/the-omega-protocol-ultimate-phase-3-guide
// [EL] Tuufless: transition death effects, Astoh monitors, debugger use:
// https://ffxiv.tuufless.com/elemental/top/03_omega_reconfigured/
// Author source: github.com/tuufless/FFXIV-Elemental-Raid-Macros,
// main/_elemental/top/03_omega_reconfigured.en.md.
// [TH] LPDU geometry and monitor duties:
// https://thaliak.com/ultimates/top/
// [OCE] North spreads, stack-in/defamation-out movement, own monitors:
// https://materiaraiding.com/resources/visitorsguide
// [SE] Official 6.35 Hello World autoattack correction:
// https://na.finalfantasyxiv.com/lodestone/topics/detail/549b10141c2add85f11595f5ba39127cc0433327
// [CB] Encounter action timeline (artificial phase anchors):
// https://github.com/quisquous/cactbot/blob/main/ui/raidboss/data/06-ew/ultimate/the_omega_protocol.txt
// [BM] Candidate game IDs, tower/monitor geometry and role rotation:
// https://github.com/awgil/ffxiv_bossmod/blob/master/BossMod.Ultimate/Endwalker/Ultimate/TOP/TOPEnums.cs
// Same directory P3HelloWorld.cs and P3OversampledWaveCannon.cs read.
// IDs are decimal game actions, not yet verified FFLogs abilities.
// Raw status IDs usually gain 1000000 in FFLogs; verify by name/stream.
//
// -- SHAPE AND CLOCK --
// Merge follows both P2 deaths; ~32-33s untargetable dodge, then Hello
// World's four iterations, Critical Error, monitors, Ion Efflux enrage.
// Reconfigured reaches 0 HP to advance; P4 reuses/revives this boss actor
// [IV], so an enemy death alone does not imply encounter completion.
// CB offsets from P3 merge anchor (400 is NOT a pull timestamp):
// +14.3/+16.4/+18.4/+20.4 first four-ring sequence;
// +22.4/+24.5/+26.6/+28.7 second sequence;
// +26.4/+28.9 arm sets; +27.3 high-powered/+28.4 sniper (approximate);
// +32.3 targetable, +41.3 Hello World; +64.4/+85.4/+106.5/+127.8
// Latent Defect resolves; Patch times depend on player movement;
// +150.1 Critical Error; +171.4 monitors; +177.4 enrage begins,
// +187.4 Ion Efflux impact (~155s after targetability, not after merge).
// P3 autos 31744 continue during Hello World; MT/ST swaps or sustained
// single-MT plans are both seen in guides. No separate swap debuff.
//
// -- TRANSITION: WAVE REPEATER / COLOSSAL BLOW / CENTER HAZARD --
// Candidates: Wave Repeater casts/damage 31567/31568/31569/31570;
// Colossal Blow cast/damage 31566; center event object 0x1EB821 [BM].
// What happens: lethal center zone; two sets of four outward pulses.
// BM radii: 0-6y circle, then 6-12y, 12-18y, 18-24y donuts.
// Arena radius ~20y, so final ring covers the edge. Floor markings do
// not exactly match the pulse radii [EL]. Three arms per wave, six
// total, positioned around the arena; first three and second three
// explode in order. Colossal Blow radius 11y with ~2s cast [BM].
// Correct play: start outside, enter the just-cleared inner annulus
// before final ring, exit back out; dodge first arms, then enter their
// cleared region for second arms while preserving cannon spots.
// Failure modes:
//   Ring/arm hit -> LOG SIGNAL: resolving damage plus Damage Down/death;
//     FAULT: dodger unless early cannon death forced the situation;
//     CONSEQUENCE: Major for death/Damage Down, else Minor.
//   Early center return -> LOG SIGNAL: center-hazard damage/status or
//     ability-less death while zone remains; FAULT: entrant if known;
//     CONSEQUENCE: Major. Exact hazard spell remains unresolved.
// Removal: hazards resolve/disappear by script; center lasts beyond
// cannon resolution. Guides do not give its exact removal event.
// Not errors: standing in a prior explosion after it resolves, stepping
// between pulses, different arm-gap starting sectors.
//
// -- TRANSITION: SNIPER / HIGH-POWERED SNIPER CANNON --
// Candidates: damage 31571/31572, both 6y circles [BM]; Fodder player
// statuses 3425/3426 respectively; Magic Vulnerability Up on shares.
// What happens: four solo Sniper marks, two High-powered marks, two
// unmarked players. Four spreads and two two-person shares at expiry,
// overlapping the second arm/ring sequence; all eight need shields.
// Correct play: unmarked partners share High-powered; everyone else
// stays clear. EL pairs north/spreads south; IV pairs SW/SE and spreads
// W/NW/NE/E; OCE north spreads. Positions depend on raid convention.
// Failure modes:
//   Spread/share overlap -> LOG SIGNAL: extra 31571/31572 hits and
//     vulnerability/death; FAULT: wrong assigned spot, not automatically
//     all victims; CONSEQUENCE: Major, potentially Raid on early cascade.
//   Missing share -> LOG SIGNAL: one 31572 recipient/high damage;
//     FAULT: absent assigned unmarked helper if known; CONSEQUENCE:
//     Major when lethal. Correctly paired low-HP death is not a mechanic
//     mistake; it belongs to shielding/healing review.
// Removal [EL]: solo mark expiry fires normally; solo carrier death
// immediately fires Sniper at a RANDOM other player. High-powered
// expiry OR death resolves its stack at the carrier. This death
// behavior is guide-derived, not confirmed from FFLogs.
// Not errors: one intended cannon per player, intended partner share,
// north versus south spread layouts, stationary shielding before dodge.
// Death-triggered retarget victims are fallout, not new culprits.
//
// -- HELLO, WORLD: STATUS KEY AND ROTATING DUTIES --
// Candidates: Hello World cast/raidwide 31573; Latent Defect cast 31599.
// Initial preparation auras (3s grace for rot/stack/defamation):
//   Synchronization Code Smell 3436 -> Critical Synchronization 3524;
//   Overflow Code Smell 3437 -> Critical Overflow 3525;
//   Underflow Code Smell 3438 -> Critical Underflow 3526 (red rot);
//   Performance Code Smell 3439 -> Critical Performance 3429 (blue rot);
//   Local Code Smell 3503 -> Local Regression 3529 (red/green tether);
//   Remote Code Smell 3441 -> Remote Regression 3530 (blue tether).
// Cleansing requirements: Latent Defect 3527 requires defamation;
// Latent Synchronization Bug 3434 requires stack (EL gives 70s timer).
// Debuggers: Synchronization 3430, Overflow 3431, Underflow 3432,
// Performance 3433. Distinguish requirement auras from active bugs.
// What happens: two red rot/two blue rot carriers; one color is paired
// with the two defamations, the other with two stacks. Four others form
// one Local pair and one Remote pair. Color-to-AOE pairing stays fixed.
// Four cycles; each has two red/two blue towers (16 towers total).
// Every player progresses through four duties, two players per duty:
//   Defamation+rot -> Remote tether -> Stack+rot -> Local tether
//   -> Defamation+rot (same cycle, different initial entry point).
// Correct play: match CURRENT duty and color, not initial role/job.
// Latent requirements are removed by intentionally receiving the right
// attack, not by a healer dispel. Death removal is not a successful clear.
// Not errors: initial raidwide, receiving the planned defamation/stack,
// gaining a rot from the intended predecessor, planned role changes.
//
// -- HELLO WORLD: COLORED TOWERS AND ROT EXPIRY --
// Candidates: red/blue tower cast/damage 31583/31584 (6y radius);
// empty red/blue penalties 31585/31586; tower player auras Cascading
// Latent Defect 3528 / Latent Performance Defect 3435; their expiry
// wipe actions 31581/31582. Red/blue rot expiry damage 31578/31579 (5y).
// What happens: each tower needs a carrier of matching rot. Soaking
// applies a 10s defect that must be cleansed by matching rot expiry
// while the holder is ALIVE. Rot lasts 27s [EL]; contact gives the next
// holder a fresh timer while the previous carrier still resolves theirs.
// Unlike a baton removed from the old player, transfer does not simply
// erase the old carrier's scheduled explosion. Opposite-color contact
// can overwrite rot unless the receiver has that color's debugger [EL].
// Correct play: carriers take matching-color tower; defamations outer
// edge, stacks inner edge. Tether players wait until carriers are set.
// After tower/stack/defamation hits, pass rot within ~3-4s. Next tower
// is ~21s later; new rot must expire before its tower defect at +31s.
// Original carriers remain isolated through their own expiry; no rot
// transfer on fourth towers, but final rot explosions still happen.
// Failure modes:
//   Empty tower -> LOG SIGNAL: 31585/31586 raid penalty, absent soak;
//     FAULT: matching assigned carrier if known; CONSEQUENCE: Raid
//     with Major for the proven missing carrier.
//   Wrong-color/late rot -> LOG SIGNAL: defect still present at expiry,
//     31581/31582 raid wipe, mismatched aura or rot timer too late;
//     FAULT: wrong soaker or delayed pass pair if reconstructable;
//     CONSEQUENCE: Major plus Raid. Correct tower hit alone is no proof.
//   Accidental transfer/overwrite -> LOG SIGNAL: unexpected rot apply,
//     old color removed before its deadline; FAULT: collision party by
//     movement lanes, ambiguous pair if unresolved; CONSEQUENCE: Major
//     if it breaks cleansing or gives Damage Down, Raid at actual penalty.
//   Rot explosion clips -> LOG SIGNAL: 31578/31579 on non-carrier;
//     FAULT: early movement/nearby player by plan; CONSEQUENCE: Major.
// Removal: expiry explodes, grants color debugger, clears matching
// defect; ordinary dispels are not a solution. EL explicitly requires
// a living carrier. Early-on-death rot detonation is still unverified.
// Not errors: intended rot damage, contact during planned pass, free
// contact once both relevant immunity buffs actually exist.
//
// -- HELLO WORLD: DEFAMATION / STACK AND DEBUGGERS --
// "Defamation" is Critical Overflow Bug, not a separate spell name.
// Candidates: Overflow damage 31575 (20y radius); Synchronization
// damage 31574 (5y shared circle); missed requirements 31577/31576
// (BM lists Damage Down, while guides describe lethal expiry).
// What happens: two defamations and two two-person stacks per cycle.
// Defamation covers its Local tether partner; stack covers its Remote
// tether partner. The hit clears that partner's latent requirement and
// grants them the corresponding active bug for the following cycle.
// Correct play: only the intended tether partner shares the attack;
// keep opposite sides out of the large defamations. Fourth cycle Local
// players AVOID defamations, join the stack area and break tether first.
// They already have Overflow Debugger and must preserve it for Critical
// Error. There is no obligatory rot pass after the fourth cycle.
// Failure modes:
//   Wrong/missed receiver -> LOG SIGNAL: unexpected next bug holder,
//     unresolved latent requirement, 31576/31577; FAULT: absent/misplaced
//     partner or bad aimer by plan; CONSEQUENCE: Major, likely Raid.
//   Extra defamation / overlapping stack -> LOG SIGNAL: multiple damage
//     hits, unexpected active bug or debugger removal; FAULT: position
//     error only when established; CONSEQUENCE: Major and eventual Raid.
// Removal: active bug expiry triggers attack and debugger; hit removes
// latent requirement. EL describes Overflow Debugger consumed by the
// NEXT would-be Overflow application; IV describes lasting immunity.
// Other debugger consumption is not assumed identical to Overflow.
// Not errors: intended split damage, intended defamation receiver,
// fourth-cycle extra stack-side players, preserved immunity.
//
// -- HELLO WORLD: REGRESSION / PATCH --
// Candidates: Patch normal raid damage 31587; failed tether wipe 32505;
// Local/Remote active tether game IDs 224/225 (prep 200/201).
// What happens: Local breaks by approaching; Remote by separating.
// Each break damages the party, with short vulnerability/Ruin lockout.
// Correct play cycles 1-3: transfer rot promptly, Remote pair breaks
// after stack vulnerability ends, Local breaks after Patch lockout ends.
// Fourth: Local breaks first at stack area; Remote waits then separates.
// Failure modes:
//   Too-early/overlapping break -> LOG SIGNAL: two Patch hits inside
//     vulnerability/Ruin interval, Doom/lethal damage; FAULT: initiating
//     pair/individual if movement identifies them; CONSEQUENCE: Major
//     plus Raid when lethal. Both pairs contribute to relative distance.
//   Tether times out -> LOG SIGNAL: 32505 raidwide rather than 31587;
//     FAULT: unresolved pair, callout duties not inherently in damage
//     log; CONSEQUENCE: Raid, Major only on evidenced pair members.
// Removal: proper distance change ends Regression and triggers Patch;
// timeout wipes. Death-triggered breaks and exact stack type unsettled.
// Not errors: repeated expected all-party Patch damage; one-second
// vulnerability/Ruin at each correct break; visible preparation tether.
//
// -- CRITICAL ERROR --
// Candidate cast/raidwide 31588. All players must retain Overflow
// Debugger; Critical Error attempts to apply fresh Overflow to everyone.
// Failure -> LOG SIGNAL: new 3525 after this cast, later 31575 during
// monitors; FAULT: fourth-cycle extra defamation recipient if known;
// CONSEQUENCE: Major plus Raid when overlap cannot be resolved.
// EL: death removes debugger, so raised players also get fresh Overflow;
// that is fallout from the death, not a second independent mechanic error.
// Removal: debugger blocks application and may be consumed; fresh
// Overflow lasts ~21s [EL], lining up with monitors. Not dispellable in
// any referenced plan. Raidwide damage itself is unavoidable/not error.
//
// -- OVERSAMPLED WAVE CANNON / MONITORS --
// Candidates: boss right/left casts 31595/31596; resolving damage 31597
// (7y victim-centered circles); player Loading right/left 3452/3453.
// What happens: one boss half-plane monitor plus three player monitors.
// Each selects TWO random eligible players on its firing side; if too
// few, missing selections are random elsewhere [EL/IV]. Eight intended
// hits total; every player, including each monitor holder, takes one.
// BM models side-selection as a 180-degree half-plane (40y search cone),
// not direct damaging half-room cleaves. Selected targets emit circles.
// Correct play: arrange exactly two eligible players for each monitor,
// spread >7y from other victims, respect left/right relative to facing.
// Monitor holder can be a target of someone else's monitor. Attacks can
// turn the holder at snapshot; controlled facing matters.
// IV same-side: boss takes non-monitor 2/3, all three monitors opposite.
// IV 1/2 split and EL Astoh: two monitors boss-side, one opposite;
// exact numbered positions/facings vary. TH/LPDU likewise has 2+1 split.
// EL conga N->S H1 H2 MT ST D1 D2 D3 D4; count separately among three
// monitors and five non-monitors. EL permits slight angle adjustments;
// OCE uses H1 D3 D1 MT ST D2 D4 H2 and different corner offsets.
// Failure modes:
//   Bad angle/position -> LOG SIGNAL: two monitor hits, extra circle
//     victims, Ruin/Doom/vulnerability or fallback random selection;
//     FAULT: incorrectly aimed holder or misplaced assigned recipient,
//     not merely every double-hit victim; CONSEQUENCE: Major plus Raid.
//   Circle overlap -> LOG SIGNAL: 31597 multiple victim circles;
//     FAULT: wrong spread spacing by layout; CONSEQUENCE: Major.
// Removal: Loading expiry fires monitor; death cleanup not proof of
// resolution. Monitor source owner may not survive into helper damage.
// Not errors: intended monitor damage/debuff, angled Astoh variants,
// same-side versus split layouts, brief GCD hold to preserve facing.
//
// -- STRATEGY AGREEMENT --
// IV/EL/TH agree on four spreads plus two shares in transition, four
// colored-tower rounds with alternating duties, early rot handoffs,
// sequential Patch breaks, final-cycle Local change and eight monitor
// recipients. North/south transition assignments, rot movement lanes,
// conga order and monitor layout differ. OCE keeps MT through Hello
// World while IV recommends a tank swap; neither is a mechanic error.
//
// -- WHAT ENDS A PULL --
// Ion Efflux 31560 completes ~+187.4 merge anchor: Raid DPS failure.
// Empty HW tower, uncleansed tower defect and timed-out tether are
// explicit early Raid penalties. Wrong rotation can doom future towers
// even before the penalty; distinguish confirmed impossibility from risk.
// Transition death can immediately reroute a cannon; monitor double hits
// and post-Critical Error defamations normally wipe. Wall/reset deaths
// after a cutoff are fallout. No player blame for raw healing/mit deaths.
//
// -- OPEN QUESTIONS / SOURCE DISAGREEMENTS FOR LOG VERIFICATION --
// 1. Overflow Debugger: EL single-use versus IV lasting immunity. Which
//    application consumes it? Do other Debuggers also consume on use?
// 2. Patch: IV says two Thrice-come Ruin stacks; EL says one; TH elsewhere
//    refers to Twice-come Ruin. Verify aura IDs, counts, scope and duration.
// 3. Monitors: IV says boss hits "all" on side, EL/TH/BM select two.
//    Confirm two targets plus splash, fallback selection and source owner.
//    EL also describes boss facing east/west later despite initially
//    saying north. Is this monitor direction rather than actor facing?
// 4. Verify solo cannon death retarget and high-powered death explosion;
//    any rot/defect/tether early-on-death effects and their raid fallout?
// 5. BM calls missed latent stack/defamation penalties Damage Down;
//    guides call them fatal. Check 31576/31577 survival and aura effects.
// 6. Exact transfer distance/timer reset, 27s rot / 10s defect / ~21s
//    cycles, final tower counts, fourth-cycle Patch order and grace times?
// 7. TH's monitor conga repeats M1/M2 and omits tanks: apparent typo,
//    not an eight-slot plan. Obtain actual slots, markers and chosen layout.
// 8. Identify center-hazard spell/removal, status namespace and Damage
//    Down on each avoidable, plus actor reuse/phase transition signals.
