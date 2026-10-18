// The Omega Protocol (Ultimate) -- Phase 3: Omega Reconfigured.
// Filename deliberately follows the requested omega-reconfiguredd.ts.
// Entry point: detectOmegaReconfiguredErrors. Self-gates on the transition's
// first cast (31561) and runs to Phase 4's first cast (31559).
//
// -- VERIFIED AGAINST LOGS (2026-10-14) --
// Four reports of one static (not the user's; no VOD; NAUR strats; omega.ts
// group A's eight jobs: WAR MT, DRK OT, WHM H1, SCH H2, PCT R1, DNC R2, RDM
// M1, DRG M2, with a stand-in OT in some C pulls and a stand-in H1 in some D
// pulls). Only the pulls that reached P3 (A/B/C refetched with
// --from-minutes 2.0 --to-minutes 8.0, which keeps their P2 span; D/E
// --min-minutes 5 --from-minutes 4.0 --to-minutes 8.0). Letters follow
// omega-mf.ts. Cited as D36 +109.2 (report letter, the report's own pull
// number, seconds from the 31561 cast):
//   A = BKQ92ndywPaLtbMm: 4 P3 pulls (A37 A41 A46 A50), no P3 clear.
//   B = 8hnVr24MtBqNvRAb: 9 P3 pulls, P3 clear B66.
//   C = ZPpBNMGyrnzJ2LRC: 9 P3 pulls, P3 clears C19 C23 C28.
//   D = VbczXNA7m3RJHjdx: 12 P3 pulls, P3 clears D5 D13 D24 D26 D30 D42.
//   E = 8tLjB2zVD1mvwdWX: 8 P3 pulls, P3 clears E19 E20 E27.
//   No full kill; the 13 P3 clears (all wiped in P4) are the baseline.
// Clock, from 31561 (4:29-4:45 into the pull), every pull within ~0.3s:
// Wave Repeater rings +5 to +20; Colossal Blow +17.0/+19.5 (its cast is
// logged only when it hits someone); Sniper markers (19s) at -0.1, cannons
// at +18.5-19.8; Hello World +32.2 (Code Smells, 3s), duties at +35.2;
// Latent Defect +55.4 / +76.4 / +97.5 / +118.5, its towers, defamations and
// stacks cast 1.0-1.1s later and hitting 0.6s after that; Critical Error
// +140.7; Oversampled Wave Cannon +162.1-162.4; Ion Efflux begins +178.2
// (hits ~+179) unless Omega Reconfigured died first; Phase 4's 31559 ~+177.6.
// Log IDs: rings 31567-31570, Colossal Blow 31566, the lethal centre is
// "Bleeding" 1003078 from Environment (B66 +22.0, the MT; raised in time),
// Sniper / High-powered 31571 / 31572 with markers 1003425 / 1003426. Hello
// World: Code Smells 1003436-1003439, 1003503 (Local), 1003441 (Remote);
// Critical Synchronization (stack) 1003524, Overflow (defamation) 1003525,
// Underflow (red rot) 1003526, Performance (blue rot) 1003429, Local /
// Remote Regression 1003529 / 1003530 (10s tethers); Latent Defect
// (defamation requirement, 27s, the first Local pair) 1003527, Latent
// Synchronization Bug (stack requirement, 69s, everyone else) 1003434;
// Debuggers 1003430-1003433 (permanent); towers red 31583 / blue 31584 with
// defects 1003528 / 1003435 (10s); stack hit 31574, defamation hit 31575;
// rot explosions 31578 / 31579; penalties: empty tower 31585 / 31586,
// uncleansed defect 31581 / 31582, tether timeout 32505, missed stack
// requirement 31576 (31577 never seen); Patch 31587 with Thrice-come Ruin
// 1002530 and Magic Vulnerability Up 1003516 (two stacks per break, 0.96s);
// the resolution's Magic Vulnerability Up 1002941. Oversampled Wave Cannon:
// boss 31595 (right) / 31596 (left), one 31597 cast per picked player,
// monitors' Loading 1003452 / 1003453. Ion Efflux 31560.
// There is NO Damage Down in Phase 3: avoidables are Minor unless they kill.
// Findings:
// - Transition: rings hit A37 (four), A50 (two), B29, B35, D17, D32, E12;
//   arms A37, A41, A46, C9, C11 (after the cannon left them low), E12; all
//   died. A marked Sniper player's death fires their cannon at a random
//   player at once (B35 +9.8 onto the MT; A37, A50, A46, C9, D17 onto a
//   share pair or spread, who then died): fallout. Spreads overlapped in
//   C24 (MT and R1 died); both shares landed together in B23 (four in one,
//   three in the other; three died). A46 and C9 had a player dead at Hello
//   World (no duties: a slot empty all rotation); everyone else killed in
//   the transition was raised in time.
// - Hello World works as the model says. Each player goes Defamation + rot
//   -> Remote -> Stack + rot -> Local; the rot color stays with the duty
//   all pull (defamation red or blue at random). The tower's cast target is
//   its soaker. Each owner hands its rot to the partner who shared its hit
//   (defamation -> Local, stack -> Remote) 0.6-4.0s after the resolution in
//   every clean cycle; the old carriers' rots run out together 27s after
//   they got them and cleanse their defects. A rot's expiry does no damage
//   to its holder; 31578/31579 damage means it clipped someone (B56 +128.0,
//   D10 +107.5, D17 +63.0: each victim died). Fourth cycle: stacks hold
//   three (owner, Remote, Local), defamations only their owner.
// - Uncleansed defects (10 cutoffs), three causes: the holder died before
//   their rot ran out (a dead holder's defect runs its full 10s: A41, B18
//   and D32 to Patch with correct timing, B29 and C11 alone in their stack, C21
//   in a defamation); a late hand-off (B36 4.9s, D10 5.5s, D36 7.1s: the rot
//   ran out after the defect); no hand-off (B56: OT never got the rot).
// - Empty towers (5): both carriers stacked away from their towers (C24),
//   a duty player who never got the rot (C25, D55), the carrier in the
//   other color's tower (E2), both carriers in one tower (E17).
// - Tethers: clean Remote breaks came 1.1-3.5s after the casts, at least
//   0.13s after the resolution's Magic Vulnerability Up ended; Local 1.8-3.5s
//   after Remote; fourth cycle Local at -1.2/-1.3 and Remote +2.2 to +4.5.
//   A Remote pair already apart when the tether appeared broke it before the
//   towers and the whole party died at the resolution (B23 C1, E12 C2, E16
//   C1); B35 broke 0.09s before the vulnerability ended (five died); B45
//   broke Remote with Local in the fourth cycle (eight died); E15's Local
//   pair closed before Remote. Both timeouts (B35, D17) came after deaths.
// - Missed stacks: a Remote player in no stack left its owner alone (B29,
//   C11, C25, D17); the owner died each time.
// - Rots by contact outside a hand-off: D17 +50.3 and E15 +72.1 (swaps),
//   E2 +38.4; none in any clear.
// - Critical Error consumed every Overflow Debugger at the cast (open
//   question 1) and applied no fresh Overflow in any of the 15 pulls that
//   reached it: nothing to detect.
// - Oversampled Wave Cannon (open question 3): one cast per picked player;
//   clean = all eight once (C19 C28 D13 D26 E20). A player picked twice died
//   in 10 of 11 pulls, and 8 of those still cleared. A living player no
//   cannon picked (B66, C17, D24, D42, E27) or a circle over two players
//   (D30, E19) explains the double; B63 C23 D5 had nine casts with nobody
//   left out.
// - Ion Efflux killed B63 (2.5% HP left) and C17 (0.1%).
// Cutoffs (first Raid error) over the 29 P3 wipes: uncleansed defect 10,
// empty tower 5, Patch overlapped 5, collapse 3 (A37 and A50 in the rings,
// B23 after the shares' three deaths and the H1 to Hello World's raidwide),
// resolution killed 3+ 2 (D17, D20), enrage 2, dead at Hello World 2 (A46,
// C9). Every wipe has one; the 13 clears have none.
// Their Majors: the centre (B66) and the Oversampled Wave Cannon doubles.
// Replay (2026-10-18, bNcrLh7Y4dkHxM9q fight 17, a kill; 31561 at 4:36.8):
// players log every 3s through the transition, with an 11s gap over the
// rings (4:44.8-4:55.8), so ring and arm positions can't be checked there.
// Tethers: 224 Local / 225 Remote, 200 / 201 their preparation from the
// Code Smells; the Regression statuses end at the breaks. Tower helpers
// log their spot at the resolution. Loading 1003452 right / 1003453 left.
// Built in replay.ts.
//
// -- RULES IMPLEMENTED --
// ffxiv-top3-avoidable (Major on death, else Minor): rings, arms, centre.
// ffxiv-top3-sniper: at the markers' expiry, all eight alive: a spread over
//   2+ (all named), the two shares together (both holders), an unmarked
//   player in no share.
// ffxiv-top3-tower (targeted: each cycle's four carriers): an empty tower
//   names its color's carrier who didn't take it, or both carriers in one
//   tower; a tower taken without its rot (Wrong Tower).
// ffxiv-top3-rot-pass: the receiver and the owner whose hit they shared,
//   when an empty tower or uncleansed defect traces back to a missing or
//   late hand-off.
// ffxiv-top3-stack (targeted: Remote players, cycles 1-3): in no stack.
// ffxiv-top3-defamation: an extra player in a defamation (the extras; the
//   owner when it hit 3+; both owners when they hit each other).
// ffxiv-top3-patch (targeted: the four tethered players): a Remote break
//   before the towers or before the resolution's vulnerability ended, a Local
//   break within 1s of the Remote one, a fourth-cycle Remote break with the
//   Local pair (both partners named); a timeout with both alive.
// ffxiv-top3-rot-clip: a rot explosion on someone else (victim and the
//   carrier near them). ffxiv-top3-rot-contact: a rot gained outside a
//   hand-off (receiver and giver: the swap partner or nearest holder).
// ffxiv-top3-monitor: a player picked twice, all alive: a circle over two
//   (both), else the living players no cannon picked, else player-less.
// ffxiv-top3-hello-world (Raid): empty tower, uncleansed defect, timeout,
//   missed requirement, an early break that killed 3+, a resolution that
//   killed 3+. ffxiv-top3-transition (Raid): dead when Hello World handed out
//   the duties. Only the earliest mechanic Raid is kept.
// ffxiv-top3-wall, -enrage (Ion Efflux hits that killed), -called-wipe,
//   -collapse (4 dead, pull over within 20s): the earliest, only before the
//   mechanic Raid.
// Not built: Critical Error (never failed); raw-damage deaths (Hello
// World's raidwide, Patch with correct timing, autos); which partner of a
// pair moved (positions not modeled); the monitor layout and facing (no
// NAUR slot model yet, so the nine-cast doubles stay player-less).
//
// -- GUIDE-DERIVED MODEL (2026-10-14) --
// Written before any report was analyzed; VERIFIED AGAINST LOGS above wins.
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

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import type { ReportedOccurrence } from "@/lib/mechanics/occurrences";
import { interpolatePlayerPosition } from "@/lib/mechanics/player-position";
import { kFmt, joinNames, playerError, raidMarker, playerlessMinor, clusterByGap, debuffIntervals, type Interval } from "@/lib/mechanics/wow/common";
import { DEATH_EVENT_LAG_MS, PREVIEW_AMOUNT, type Life, bodyHit, buildLife, castsOf, uniq, realAmount, allAlive, resetCluster } from "../fru/common";

export const TOP3_AVOIDABLE_RULE_ID   = "ffxiv-top3-avoidable";
export const TOP3_SNIPER_RULE_ID      = "ffxiv-top3-sniper";
export const TOP3_TRANSITION_RULE_ID  = "ffxiv-top3-transition";
export const TOP3_TOWER_RULE_ID       = "ffxiv-top3-tower";
export const TOP3_ROT_PASS_RULE_ID    = "ffxiv-top3-rot-pass";
export const TOP3_ROT_CONTACT_RULE_ID = "ffxiv-top3-rot-contact";
export const TOP3_ROT_CLIP_RULE_ID    = "ffxiv-top3-rot-clip";
export const TOP3_DEFAMATION_RULE_ID  = "ffxiv-top3-defamation";
export const TOP3_STACK_RULE_ID       = "ffxiv-top3-stack";
export const TOP3_PATCH_RULE_ID       = "ffxiv-top3-patch";
export const TOP3_HELLO_WORLD_RULE_ID = "ffxiv-top3-hello-world";
export const TOP3_MONITOR_RULE_ID     = "ffxiv-top3-monitor";
export const TOP3_WALL_RULE_ID        = "ffxiv-top3-wall";
export const TOP3_ENRAGE_RULE_ID      = "ffxiv-top3-enrage";
export const TOP3_CALLED_WIPE_RULE_ID = "ffxiv-top3-called-wipe";
export const TOP3_COLLAPSE_RULE_ID    = "ffxiv-top3-collapse";

const MERGE          = 31561; // the transition's first cast: Phase 3 starts here
const P4_START       = 31559; // Phase 4's opening cast, after Omega Reconfigured dies
const HELLO_WORLD    = 31573;
const LATENT_DEFECT  = 31599; // each Hello World cycle's cast, ~1.1s before the towers
const RINGS          = [31567, 31568, 31569, 31570]; // Wave Repeater's four rings
const COLOSSAL_BLOW  = 31566; // the arms
const CENTER_BLEED   = 1003078; // "Bleeding" from Environment: the lethal centre
const SNIPER         = 31571;
const HP_SNIPER      = 31572;
const SNIPER_FODDER  = 1003425;
const HP_FODDER      = 1003426;
const STACK_HIT      = 31574; // Critical Synchronization Bug
const DEFAM_HIT      = 31575; // Critical Overflow Bug
const MISSED_REQ     = [31576, 31577]; // a latent stack / defamation requirement ran out
const PATCH          = 31587;
const PATCH_TIMEOUT  = 32505;
const STACK_BUG      = 1003524;
const DEFAM_BUG      = 1003525;
const LOCAL          = 1003529;
const REMOTE         = 1003530;
const HW_AURAS       = [1003436, 1003437, 1003438, 1003439, 1003503, 1003441]; // the six Code Smells
const OWC            = 31597; // Oversampled Wave Cannon, one cast per selected player
const OWC_BOSS       = [31595, 31596];
const ION_EFFLUX     = 31560;

type Color = "red" | "blue";
const COLORS: Color[] = ["red", "blue"];
const COL: Record<Color, { rot: number; defect: number; tower: number; empty: number; uncleansed: number; rotHit: number }> = {
  red:  { rot: 1003526, defect: 1003528, tower: 31583, empty: 31585, uncleansed: 31581, rotHit: 31578 },
  blue: { rot: 1003429, defect: 1003435, tower: 31584, empty: 31586, uncleansed: 31582, rotHit: 31579 },
};
const ROT_NAME: Record<Color, string> = { red: "Critical Underflow Bug (red rot)", blue: "Critical Performance Bug (blue rot)" };

const EPISODE_MS          = 3000;
const RESOLUTION_MS       = 1500;
// A rot handed over later than this after the resolution runs out after the
// next tower's 10s defect (27s rot, 21s cycle, defect at +0.6): clean passes
// 0.6-4.0s; 4.8s (B36), 5.4s (D10) and 6.9s (D36) each left the next defect
// uncleansed. Used only to describe; the failure itself is the penalty.
const LATE_PASS_MS        = 4600;
const PASS_WINDOW_MS      = 8000;
// Cycles 1-3: the Remote pair breaks first, once the resolution's Magic
// Vulnerability Up (1002941, ~0.9s from the hits) is gone. Clean breaks came
// 0.13s (E19 C1, D5 C2) to ~1.5s after it ended, +1.1s to +3.5s after the
// casts; failures: before the towers (B23 C1, E12 C2, E16 C1: the party died
// at the resolution) and 0.09s before it ended (B35 C1, +0.8s: five died to
// the Patch).
const RESOLUTION_VULN     = 1002941;
// Cycle 4: Local breaks first (-1.2/-1.3 in every clear), Remote after:
// clean +2.2 (C17) to +4.5; B45 broke both at -1.3 (six died to Patch).
const REMOTE4_EARLY_MS    = 1000;
// Local after Remote, cycles 1-3: clean gap 1.8s (B56 C3) to 3.5s. Two
// breaks inside one Patch lockout (~1s) stack its Ruin and vulnerability.
const BREAK_GAP_MS        = 1000;
const RAID_DEATHS         = 3;
const CALLED_WIPE_END_MS  = 12_000;
const CALLED_WIPE_COUNT   = 3;
const CALLED_WIPE_WINDOW  = 10_000;
const COLLAPSE_DEAD_COUNT = 4;
const COLLAPSE_END_MS     = 20_000;
const RESET_AFTER_DEATH_MS = 10_000;
const SILENT_HIT_MS       = 3500;
const CONTACT_RANGE       = 800; // centi-yalms: the nearest holder of a jumped rot
const CLIP_RANGE          = 800; // a rot explosion is 5y; positions are interpolated
const ORDINAL = ["first", "second", "third", "fourth"];

const sec = (ms: number) => (ms / 1000).toFixed(1);
const heldAt = (ivs: Interval[], t: number) => ivs.some((i) => i.start <= t && i.end > t);
const names = (ns: string[]) => joinNames(uniq(ns));

/** Phase 3: the transition's first cast to Phase 4's first (or the pull's end). */
function phase3Window(casts: EnemyEvent[]): { start: number; end: number } {
  const start = casts.find((c) => c.abilityId === MERGE)?.timestamp ?? Infinity;
  const end = casts.filter((c) => c.abilityId === P4_START && c.timestamp > start).reduce((m, c) => Math.min(m, c.timestamp), Infinity);
  return { start, end };
}

/** Hits by `ids` on living players in [from, to], grouped by caster and instance. */
function groupsOf(players: PlayerInfo[], life: Life, ids: number[], from: number, to: number): Map<string, { players: PlayerInfo[]; hits: PlayerEvent[] }> {
  const out = new Map<string, { players: PlayerInfo[]; hits: PlayerEvent[] }>();
  for (const p of players) {
    for (const e of p.damageTaken) {
      if (!ids.includes(e.abilityId) || e.timestamp < from || e.timestamp > to || bodyHit(e) || !life.hitAlive(p, e.timestamp)) continue;
      const k = `${e.abilityId}:${e.source ?? "?"}#${e.sourceInstance ?? -1}`;
      const g = out.get(k) ?? { players: [], hits: [] };
      if (!g.players.includes(p)) g.players.push(p);
      g.hits.push(e);
      out.set(k, g);
    }
  }
  return out;
}


// ── Transition ──────────────────────────────────────────────────────────────

type Avoidable = { name: string; hit: string; why: string };
const RING_WHY = "Wave Repeater pulses outward from the centre in two sets of four rings: start outside, step into each ring just after it goes off, and never return to the centre.";
const AVOIDABLE: Record<number, Avoidable> = {
  ...Object.fromEntries(RINGS.map((id) => [id, { name: "Wave Repeater", hit: "Hit by a Wave Repeater ring", why: RING_WHY }])),
  [COLOSSAL_BLOW]: { name: "Colossal Blow", hit: "Hit by an arm's Colossal Blow",
    why: "The six arms explode in two sets of three (11y each): dodge the first set, then move into its cleared area for the second." },
  [CENTER_BLEED]: { name: "Centre Hazard", hit: "Stepped into the lethal centre",
    why: "The arena's centre stays lethal through the whole transition, after the rings are done." },
};

/** Avoidable hits: no Damage Down in Phase 3, so Major only when it killed. */
function detectAvoidable(players: PlayerInfo[], life: Life, from: number, to: number): PullError[] {
  const errors: PullError[] = [];
  const ids = Object.keys(AVOIDABLE).map(Number);
  for (const p of players) {
    const hits = p.damageTaken.filter((e) => ids.includes(e.abilityId) && e.timestamp >= from && e.timestamp <= to && !bodyHit(e) &&
      life.hitAlive(p, e.timestamp) && (realAmount(e) > 0 || (e.amount ?? 0) >= PREVIEW_AMOUNT));
    for (const g of clusterByGap(hits, (e) => e.timestamp, EPISODE_MS)) {
      const kinds = uniq(g.map((e) => AVOIDABLE[e.abilityId]));
      const total = g.reduce((s, e) => s + realAmount(e), 0);
      const death = life.diedFrom(p, g[g.length - 1].timestamp);
      errors.push(playerError(p, {
        ruleId: TOP3_AVOIDABLE_RULE_ID, severity: death ? "Major" : "Minor", name: `Hit by ${uniq(kinds.map((k) => k.name)).join(" / ")}`,
        description: `${kinds.map((k, i) => (i === 0 ? k.hit : k.hit.charAt(0).toLowerCase() + k.hit.slice(1))).join(", and ")} (${g.length > 1 ? `${g.length} hits, ` : ""}${total > 0 ? kFmt(total) : "lethal"}).${death ? " They died." : ""} ${uniq(kinds.map((k) => k.why)).join(" ")}`,
        timestamp: g[0].timestamp, abilityId: g[0].abilityId, abilityName: g[0].abilityName,
      }));
    }
  }
  return errors;
}

const SNIPER_WHY = "The four Sniper Cannon players spread apart; each High-powered Sniper Cannon is shared by its holder and one unmarked player, away from the spreads and from the other share.";

/**
 * Sniper Cannon at the markers' expiry, with all eight alive (a marked
 * player's death fires their cannon at a random player at once: B35 +9.8,
 * C9, D17, all fallout): a spread that hit two or more names every player
 * in it (C24: MT and R1, both died); two shares on top of each other name
 * both holders (B23: four in one, three in the other, three died); an
 * unmarked player in no share names them.
 */
function detectSniper(players: PlayerInfo[], life: Life, from: number, to: number): PullError[] {
  const expiry = players.flatMap((p) => p.debuffs.filter((e) => (e.abilityId === SNIPER_FODDER || e.abilityId === HP_FODDER) && e.debuffStatus === "removed" && e.timestamp >= from && e.timestamp <= to))
    .map((e) => e.timestamp).sort((a, b) => b - a)[0];
  if (expiry === undefined || !allAlive(players, life, expiry - 500)) return [];
  const holders = (id: number) => players.filter((p) => debuffIntervals(p, id).some((i) => Math.abs(i.end - expiry) <= 500));
  const hp = holders(HP_FODDER), marked = new Set([...hp, ...holders(SNIPER_FODDER)]);
  const spreads = [...groupsOf(players, life, [SNIPER], expiry - 500, expiry + RESOLUTION_MS).values()];
  const shares = [...groupsOf(players, life, [HP_SNIPER], expiry - 500, expiry + RESOLUTION_MS).values()];
  const died = players.filter((p) => p.damageTaken.some((e) => (e.abilityId === SNIPER || e.abilityId === HP_SNIPER) &&
    e.timestamp >= expiry - 500 && e.timestamp <= expiry + RESOLUTION_MS && !bodyHit(e) && life.diedFrom(p, e.timestamp)));
  const outcome = died.length ? ` ${names(died.map((p) => p.name))} died.` : "";
  const sev = died.length ? "Major" : "Minor";
  const errors: PullError[] = [];
  for (const g of spreads.filter((s) => s.players.length >= 2)) {
    for (const p of g.players) {
      errors.push(playerError(p, {
        ruleId: TOP3_SNIPER_RULE_ID, severity: sev, name: "Sniper Cannon Overlap",
        description: `One Sniper Cannon spread hit ${names(g.players.map((q) => q.name))} together; either could have been off their spot.${outcome} ${SNIPER_WHY}`,
        timestamp: g.hits[0].timestamp, abilityId: SNIPER, abilityName: "Sniper Cannon",
      }));
    }
  }
  const inShares = (p: PlayerInfo) => shares.filter((g) => g.players.includes(p)).length;
  const together = hp.filter((p) => inShares(p) >= 2);
  if (together.length >= 2) {
    for (const p of together) {
      errors.push(playerError(p, {
        ruleId: TOP3_SNIPER_RULE_ID, severity: sev, name: "Shares Together",
        description: `Both High-powered Sniper Cannon holders (${names(together.map((q) => q.name))}) stood together, so the two shares landed on the same players.${outcome} ${SNIPER_WHY}`,
        timestamp: expiry, abilityId: HP_SNIPER, abilityName: "High-Powered Sniper Cannon",
      }));
    }
  }
  for (const p of players.filter((q) => !marked.has(q) && !inShares(q))) {
    if (!shares.length) break;
    errors.push(playerError(p, {
      ruleId: TOP3_SNIPER_RULE_ID, severity: sev, name: "Missed the Share",
      description: `Unmarked for Sniper Cannon but in no High-powered share, so a holder took theirs without a partner.${outcome} ${SNIPER_WHY}`,
      timestamp: expiry, abilityId: HP_SNIPER, abilityName: "High-Powered Sniper Cannon",
    }));
  }
  // C24: the two spreads each hit both players; one error each.
  return firstPer(errors, (e) => `${e.player}|${e.name}`);
}


// ── Hello World ─────────────────────────────────────────────────────────────

/** One Hello World cycle as names. */
type Cycle = {
  k: number;                       // 1..4
  res: number;                     // the tower / defamation / stack casts
  defam: string[]; stack: string[]; // the cycle's owners
  local: string[]; remote: string[]; // tethered this cycle
  rot: Map<string, Color[]>;       // rot held at the casts
  towers: { color: Color; players: PlayerInfo[] }[];
  defams: { owner?: string; players: PlayerInfo[]; hits: PlayerEvent[] }[];
  stacks: { owner?: string; players: PlayerInfo[]; hits: PlayerEvent[] }[];
};

function readCycles(players: PlayerInfo[], life: Life, casts: EnemyEvent[], start: number, end: number): Cycle[] {
  const lds = castsOf(casts, LATENT_DEFECT, end).filter((c) => c.timestamp > start);
  const rots = new Map(players.map((p) => [p.name, { red: debuffIntervals(p, COL.red.rot), blue: debuffIntervals(p, COL.blue.rot) }]));
  return lds.map((ld, i) => {
    const res = casts.find((c) => [COL.red.tower, COL.blue.tower, STACK_HIT, DEFAM_HIT].includes(c.abilityId) && c.timestamp > ld.timestamp && c.timestamp - ld.timestamp <= 2500)?.timestamp ?? ld.timestamp + 1100;
    const holding = (id: number) => players.filter((p) => heldAt(debuffIntervals(p, id), res - 1000)).map((p) => p.name);
    const tethered = (id: number) => players.filter((p) => debuffIntervals(p, id).some((iv) => iv.start >= ld.timestamp - 2000 && iv.start <= res + 500)).map((p) => p.name);
    const rot = new Map<string, Color[]>();
    for (const p of players) {
      const r = rots.get(p.name)!;
      const held = COLORS.filter((c) => heldAt(r[c], res));
      if (held.length) rot.set(p.name, held);
    }
    const owned = (id: number, bug: number) => [...groupsOf(players, life, [id], res - 300, res + RESOLUTION_MS).values()].map((g) => ({
      ...g, owner: g.players.find((p) => heldAt(debuffIntervals(p, bug), res - 1000))?.name,
    }));
    const towers = COLORS.flatMap((c) => [...groupsOf(players, life, [COL[c].tower], res - 300, res + RESOLUTION_MS).values()].map((g) => ({ color: c, players: g.players })));
    return {
      k: i + 1, res, defam: holding(DEFAM_BUG), stack: holding(STACK_BUG), local: tethered(LOCAL), remote: tethered(REMOTE),
      rot, towers, defams: owned(DEFAM_HIT, DEFAM_BUG), stacks: owned(STACK_HIT, STACK_BUG),
    };
  });
}

const TOWER_WHY = "Each cycle the two rot carriers with a defamation and the two with a stack each take the tower of their rot's color; the tower's 10s defect is cleansed when that same rot runs out on them, alive.";
const PASS_WHY = "After the towers each defamation hands its rot to its Local partner and each stack to its Remote partner by touching within ~3s; a rot taken over more than ~4.6s after the resolution runs out after the next tower's defect and can't cleanse it.";
const STACK_WHY = "Each stack takes its Remote-tethered partner: the hit clears that partner's stack requirement and hands them the next cycle's stack.";
const DEFAM_WHY = "A defamation goes to the outer edge with only its Local partner inside its 20y (in the fourth cycle, nobody); everyone else stays clear of it.";
const PATCH_WHY = "Cycles 1-3: the Remote pair separates first, once the stacks' Magic Vulnerability Up wears off (~1s after the towers), and the Local pair closes in ~2s later; in the fourth cycle the Local pair goes first. Two tethers breaking within a second stack Patch's vulnerability and Ruin.";
const CLIP_WHY = "A rot explodes on its holder when it runs out (5y): after a hand-off the two players move apart before the old one expires.";
const CONTACT_WHY = "Rots jump on contact: outside the planned hand-offs, rot carriers keep their distance from everyone.";

/** The defamation's rot color in this pull, from the first cycle's owners. */
function defamColor(cycles: Cycle[]): Color | undefined {
  const c1 = cycles[0];
  if (!c1) return undefined;
  const held = c1.defam.flatMap((n) => c1.rot.get(n) ?? []);
  return COLORS.find((c) => held.filter((x) => x === c).length > held.length / 2);
}

/** Who should have passed `color` to `receiver` at the cycle before `cy`: the owner of the hit they shared. */
function passGiver(cycles: Cycle[], cy: Cycle, receiver: string, color: Color, dColor: Color | undefined): string | undefined {
  const prev = cycles[cy.k - 2];
  if (!prev || !dColor) return undefined;
  const groups = color === dColor ? prev.defams : prev.stacks;
  return groups.find((g) => g.owner && g.owner !== receiver && g.players.some((p) => p.name === receiver))?.owner
    // Missed the shared hit: the owner whose group lacked its partner.
    ?? groups.find((g) => g.owner && g.players.length === 1)?.owner;
}

type HWOut = { errors: PullError[]; raids: PullError[] };

function detectHelloWorld(players: PlayerInfo[], life: Life, deaths: DeathEvent[], casts: EnemyEvent[], cycles: Cycle[], start: number, end: number, occurrences?: ReportedOccurrence[]): HWOut {
  const errors: PullError[] = [];
  const raids: PullError[] = [];
  const byName = new Map(players.map((p) => [p.name, p]));
  const P = (n: string) => byName.get(n)!;
  const dColor = defamColor(cycles);
  const dutyColor = (cy: Cycle, n: string): Color | undefined => !dColor ? undefined : cy.defam.includes(n) ? dColor : cy.stack.includes(n) ? (dColor === "red" ? "blue" : "red") : undefined;
  const rotIv = (n: string, c: Color) => debuffIntervals(P(n), COL[c].rot);
  const passError = (cy: Cycle, receiver: string, color: Color, why: string, t: number) => {
    const giver = passGiver(cycles, cy, receiver, color, dColor);
    for (const n of uniq([receiver, ...(giver ? [giver] : [])])) {
      errors.push(playerError(P(n), {
        ruleId: TOP3_ROT_PASS_RULE_ID, severity: "Major", name: "Rot Hand-off Failed",
        description: `${why} The hand-off was between ${giver ? names([giver, receiver]) : receiver}; the log can't say which of them missed it. ${PASS_WHY}`,
        timestamp: t, abilityId: COL[color].rot, abilityName: ROT_NAME[color],
      }));
    }
  };

  for (const cy of cycles) {
    const nth = ORDINAL[cy.k - 1] ?? `${cy.k}th`;
    const aliveAt = (n: string) => life.alive(P(n), cy.res - 500);

    // Towers: who carried each color with a duty, and who was in each tower.
    for (const c of COLORS) {
      const expected = [...cy.rot].filter(([n, cs]) => cs.includes(c) && dutyColor(cy, n) === c).map(([n]) => n);
      occurrences?.push({ mechanicKey: TOP3_TOWER_RULE_ID, timestamp: cy.res, players: expected });
      const empty = casts.find((x) => x.abilityId === COL[c].empty && x.timestamp >= cy.res - 500 && x.timestamp <= cy.res + RESOLUTION_MS);
      if (!empty) continue;
      const inC = new Set(cy.towers.filter((t) => t.color === c).flatMap((t) => t.players.map((p) => p.name)));
      const missing = expected.filter((n) => aliveAt(n) && !inC.has(n));
      const shared = cy.towers.filter((t) => t.color === c && t.players.filter((p) => expected.includes(p.name)).length >= 2).flatMap((t) => t.players.map((p) => p.name)).filter((n) => expected.includes(n));
      const parts: string[] = [];
      if (missing.length) {
        for (const n of missing) {
          const other = cy.towers.find((t) => t.color !== c && t.players.some((p) => p.name === n));
          errors.push(playerError(P(n), {
            ruleId: TOP3_TOWER_RULE_ID, severity: "Major", name: `Missed the ${c === "red" ? "Red" : "Blue"} Tower`,
            description: `Carried the ${c} rot with a ${dutyColor(cy, n) === dColor ? "defamation" : "stack"} in the ${nth} cycle but ${other ? `stood in a ${other.color} tower` : "took no tower"}, so a ${c} tower went empty: its penalty is unresolvable. ${TOWER_WHY}`,
            timestamp: cy.res, abilityId: COL[c].tower, abilityName: c === "red" ? "Cascading Latent Defect" : "Latent Performance Defect",
          }));
        }
        parts.push(`${names(missing)} didn't take it`);
      } else if (shared.length >= 2) {
        for (const n of shared) {
          errors.push(playerError(P(n), {
            ruleId: TOP3_TOWER_RULE_ID, severity: "Major", name: "Shared a Tower",
            description: `Both ${c} carriers (${names(shared)}) stood in the same ${c} tower in the ${nth} cycle, so the other went empty; one of them belonged in it. ${TOWER_WHY}`,
            timestamp: cy.res, abilityId: COL[c].tower, abilityName: c === "red" ? "Cascading Latent Defect" : "Latent Performance Defect",
          }));
        }
        parts.push(`${names(shared)} both stood in the other one`);
      } else {
        // A duty player without the rot: the previous cycle's hand-off, unless
        // they were dead for it (or for Hello World itself).
        const dutyNoRot = [...cy.defam, ...cy.stack].filter((n) => dutyColor(cy, n) === c && !(cy.rot.get(n) ?? []).includes(c));
        for (const n of dutyNoRot) {
          const prev = cycles[cy.k - 2];
          if (prev && aliveAt(n) && life.alive(P(n), prev.res + 1000)) {
            passError(cy, n, c, `${n} had the ${nth} cycle's ${dutyColor(cy, n) === dColor ? "defamation" : "stack"} but never got the ${c} rot, so no one could take a ${c} tower.`, cy.res);
            parts.push(`${n} never got the ${c} rot`);
          } else parts.push(`${n} had no ${c} rot (dead for the hand-off)`);
        }
        const dead = expected.filter((n) => !aliveAt(n));
        if (dead.length) parts.push(`${names(dead)} ${dead.length > 1 ? "were" : "was"} dead`);
        if (expected.length + dutyNoRot.length < 2 && !dutyNoRot.length) parts.push("a carrier was missing (dead when Hello World handed out the duties)");
      }
      raids.push(raidMarker(TOP3_HELLO_WORLD_RULE_ID, `${c === "red" ? "Red" : "Blue"} Tower Empty`,
        `A ${c} tower went empty in Hello World's ${nth} cycle${parts.length ? ` (${parts.join("; ")})` : ""}. Unresolvable from here; treated as the cutoff point.`,
        cy.res, COL[c].empty, c === "red" ? "Cascading Latent Defect" : "Latent Performance Defect"));
    }

    // Stacks (cycles 1-3): a Remote player in no stack.
    if (cy.k <= 3) {
      occurrences?.push({ mechanicKey: TOP3_STACK_RULE_ID, timestamp: cy.res, players: cy.remote });
      const inStack = new Set(cy.stacks.flatMap((g) => g.players.map((p) => p.name)));
      const alone = cy.stacks.filter((g) => g.players.length === 1 && g.owner).map((g) => g.owner!);
      for (const n of cy.remote.filter((x) => aliveAt(x) && !inStack.has(x) && life.hitAlive(P(x), cy.res + 600))) {
        const ownerDied = alone.filter((o) => life.diedFrom(P(o), cy.res));
        errors.push(playerError(P(n), {
          ruleId: TOP3_STACK_RULE_ID, severity: "Major", name: "Missed the Stack",
          description: `Remote-tethered in the ${nth} cycle but in no stack${alone.length ? `: ${names(alone)} took theirs alone${ownerDied.length ? " and died" : ""}` : ""}. Without the hit their stack requirement stays and the next cycle's stack is missing. ${STACK_WHY}`,
          timestamp: cy.res, abilityId: STACK_HIT, abilityName: "Critical Synchronization Bug",
        }));
      }
    }

    // Defamations: anyone besides the owner and (cycles 1-3) one Local partner.
    const defamErrs: PullError[] = [];
    for (const g of cy.defams) {
      if (!g.owner) continue;
      const partner = cy.k <= 3 ? g.players.find((p) => cy.local.includes(p.name) && p.name !== g.owner) : undefined;
      const extra = g.players.filter((p) => p.name !== g.owner && p !== partner);
      if (!extra.length) continue;
      const died = uniq(cy.defams.flatMap((d) => d.players).filter((p) => life.diedFrom(p, cy.res)));
      const sev = died.length ? "Major" : "Minor";
      const outcome = died.length ? ` ${names(died.map((p) => p.name))} died.` : "";
      const owners = extra.filter((p) => cy.defam.includes(p.name));
      const blamed = owners.length ? [P(g.owner), ...owners] : extra.length >= RAID_DEATHS ? [P(g.owner)] : extra;
      for (const p of blamed) {
        const desc = owners.length
          ? `The ${nth} cycle's defamations (${names([g.owner, ...owners.map((q) => q.name)])}) stood together and hit each other${extra.length > owners.length ? ` and ${names(extra.filter((q) => !owners.includes(q)).map((q) => q.name))}` : ""}.`
          : extra.length >= RAID_DEATHS ? `Took their ${nth}-cycle defamation into the group: it hit ${names(extra.map((q) => q.name))}.`
          : `Stood in ${g.owner}'s ${nth}-cycle defamation${partner ? ` (only ${partner.name} belonged in it)` : ""}.`;
        defamErrs.push(playerError(p, {
          ruleId: TOP3_DEFAMATION_RULE_ID, severity: sev, name: owners.length ? "Defamations Together" : extra.length >= RAID_DEATHS ? "Defamation Into the Group" : "Stood in a Defamation",
          description: `${desc}${outcome} ${DEFAM_WHY}`,
          timestamp: cy.res, abilityId: DEFAM_HIT, abilityName: "Critical Overflow Bug",
        }));
      }
    }
    errors.push(...firstPer(defamErrs, (e) => `${e.player}`));

    // Tethers: breaks out of order.
    occurrences?.push({ mechanicKey: TOP3_PATCH_RULE_ID, timestamp: cy.res, players: [...cy.remote, ...cy.local] });
    const breakOf = (pair: string[], id: number) => {
      if (pair.length !== 2 || !pair.every(aliveAt)) return undefined;
      const ends = pair.map((n) => debuffIntervals(P(n), id).find((iv) => iv.start >= cy.res - 3500 && iv.start <= cy.res + 500)?.end ?? Infinity);
      const t = Math.min(...ends);
      // A tether that ended at a member's death broke because of it.
      if (pair.some((n) => deaths.some((d) => d.player === n && t >= d.timestamp - 1500 && t <= d.timestamp + 300))) return undefined;
      return t === Infinity ? undefined : t;
    };
    const rmT = breakOf(cy.remote, REMOTE), lT = breakOf(cy.local, LOCAL);
    const vulnUp = (t: number) => players.some((p) => debuffIntervals(p, RESOLUTION_VULN).some((iv) => iv.start <= cy.res + 700 && iv.end > cy.res && iv.end > t));
    const early: { pair: string[]; t: number; what: string }[] = [];
    if (cy.k <= 3) {
      if (rmT !== undefined && (rmT < cy.res || vulnUp(rmT))) {
        early.push({ pair: cy.remote, t: rmT, what: rmT < cy.res
          ? `broke the Remote tether ${sec(cy.res - rmT)}s before the ${nth} cycle's towers (they stood apart when it appeared), so Patch went off on top of the resolution`
          : `broke the Remote tether ${sec(rmT - cy.res)}s after the ${nth} cycle's towers, before the stacks' Magic Vulnerability Up wore off` });
      } else if (rmT !== undefined && lT !== undefined && lT - rmT < BREAK_GAP_MS) {
        early.push({ pair: cy.local, t: lT, what: `closed the Local tether ${lT < rmT ? "before" : `${sec(lT - rmT)}s after`} the Remote pair broke theirs in the ${nth} cycle, inside the first Patch's lockout` });
      }
    } else if (rmT !== undefined && rmT - cy.res < REMOTE4_EARLY_MS) {
      early.push({ pair: cy.remote, t: rmT, what: `broke the Remote tether ${rmT < cy.res ? `${sec(cy.res - rmT)}s before` : `${sec(rmT - cy.res)}s after`} the fourth cycle's towers, together with the Local pair (Remote goes second in the fourth cycle)` });
    }
    for (const x of early) {
      const killed = uniq(players.flatMap((p) => p.damageTaken.filter((e) => !bodyHit(e) && life.diedFrom(p, e.timestamp) && (
        (e.abilityId === PATCH && e.timestamp >= x.t && e.timestamp <= x.t + 3000) ||
        (x.t < cy.res && [COL.red.tower, COL.blue.tower, STACK_HIT, DEFAM_HIT].includes(e.abilityId) && e.timestamp >= cy.res && e.timestamp <= cy.res + RESOLUTION_MS))).map(() => p)));
      for (const n of x.pair) {
        errors.push(playerError(P(n), {
          ruleId: TOP3_PATCH_RULE_ID, severity: killed.length ? "Major" : "Minor", name: "Tether Broken Too Early",
          description: `${names(x.pair)} ${x.what}.${killed.length ? ` ${names(killed.map((p) => p.name))} died.` : ""} Either partner could have moved early; the log can't say which. ${PATCH_WHY}`,
          timestamp: x.t, abilityId: PATCH, abilityName: "Patch",
        }));
      }
      if (killed.length >= RAID_DEATHS) {
        raids.push(raidMarker(TOP3_HELLO_WORLD_RULE_ID, "Patch Overlapped",
          `The early tether break in Hello World's ${nth} cycle killed ${killed.length} (${names(killed.map((p) => p.name))}). Unresolvable from here; treated as the cutoff point.`,
          x.t, PATCH, "Patch"));
      }
    }

    // A resolution that killed several (defamations together, missing stack partners...).
    const resKilled = uniq(players.flatMap((p) => p.damageTaken.filter((e) => [COL.red.tower, COL.blue.tower, STACK_HIT, DEFAM_HIT].includes(e.abilityId) &&
      e.timestamp >= cy.res && e.timestamp <= cy.res + RESOLUTION_MS && !bodyHit(e) && life.diedFrom(p, e.timestamp)).map(() => p)));
    if (resKilled.length >= RAID_DEATHS) {
      raids.push(raidMarker(TOP3_HELLO_WORLD_RULE_ID, "Hello World Resolution Failed",
        `Hello World's ${nth} cycle killed ${resKilled.length} (${names(resKilled.map((p) => p.name))}) at the towers, defamations and stacks. Unresolvable from here; treated as the cutoff point.`,
        cy.res + 600, DEFAM_HIT, "Critical Overflow Bug"));
    }
  }

  // Uncleansed defects: whose defect ran its full 10s, and why.
  for (const c of COLORS) {
    const pens = castsOf(casts, COL[c].uncleansed, end).filter((x) => x.timestamp > start);
    for (const pen of clusterByGap(pens, (x) => x.timestamp, 2000).map((g) => g[0])) {
      const t = pen.timestamp;
      const cy = cycles.find((x) => t - x.res >= 9000 && t - x.res <= 12_000);
      const parts: string[] = [];
      for (const p of players) {
        const def = debuffIntervals(p, COL[c].defect).find((iv) => iv.start >= t - 11_000 && iv.start <= t - 9000 && iv.end >= t - 300);
        if (!def) continue;
        const rot = rotIv(p.name, c).find((iv) => iv.start <= def.start + 500 && iv.end > def.start - 500);
        const until = Math.min(rot?.end ?? t, t);
        if (!life.alive(p, until - 100)) { parts.push(`${p.name} died before their ${c} rot ran out`); continue; }
        if (!rot) {
          if (cy && dutyColor(cy, p.name) === c && cy.k > 1) {
            passError(cy, p.name, c, `${p.name} took a ${c} tower in the ${ORDINAL[cy.k - 1]} cycle without ever getting the ${c} rot, so nothing could cleanse its defect.`, cy.res);
            parts.push(`${p.name} never got the ${c} rot`);
          } else {
            errors.push(playerError(p, {
              ruleId: TOP3_TOWER_RULE_ID, severity: "Major", name: "Wrong Tower",
              description: `Took a ${c} tower${cy ? ` in the ${ORDINAL[cy.k - 1]} cycle` : ""} without a ${c} rot, so nothing could cleanse its defect. ${TOWER_WHY}`,
              timestamp: def.start, abilityId: COL[c].tower, abilityName: c === "red" ? "Cascading Latent Defect" : "Latent Performance Defect",
            }));
            parts.push(`${p.name} took a ${c} tower without the ${c} rot`);
          }
        } else if (rot.end > t - 300 && cy && cy.k > 1) {
          const prev = cycles[cy.k - 2];
          passError(cy, p.name, c, `${p.name} got the ${c} rot ${sec(rot.start - prev.res)}s after the ${ORDINAL[cy.k - 2]} cycle's resolution (clean hand-offs 0.6-4.0s), so it ran out after their next tower's defect.`, rot.start);
          parts.push(`${p.name}'s ${c} rot came ${sec(rot.start - prev.res)}s after the hand-off cue`);
        } else parts.push(`${p.name}'s defect stayed`);
      }
      raids.push(raidMarker(TOP3_HELLO_WORLD_RULE_ID, `${c === "red" ? "Red" : "Blue"} Defect Uncleansed`,
        `A ${c} tower's defect ran out uncleansed${cy ? ` after Hello World's ${ORDINAL[cy.k - 1]} cycle` : ""}${parts.length ? ` (${parts.join("; ")})` : ""}: a raid-wide penalty. Treated as the cutoff point.`,
        t, COL[c].uncleansed, pen.abilityName));
    }
  }

  // Tethers that timed out, and latent requirements that ran out.
  for (const pen of clusterByGap(castsOf(casts, PATCH_TIMEOUT, end).filter((x) => x.timestamp > start), (x) => x.timestamp, 2000).map((g) => g[0])) {
    const pair = players.filter((p) => [LOCAL, REMOTE].some((id) => debuffIntervals(p, id).some((iv) => Math.abs(iv.end - pen.timestamp) <= 1000)));
    const alive = pair.filter((p) => life.alive(p, pen.timestamp - 500));
    if (alive.length === pair.length) {
      for (const p of pair) {
        errors.push(playerError(p, {
          ruleId: TOP3_PATCH_RULE_ID, severity: "Major", name: "Tether Timed Out",
          description: `${names(pair.map((q) => q.name))} never broke their tether, so it ran out into the raid-wide Patch. ${PATCH_WHY}`,
          timestamp: pen.timestamp, abilityId: PATCH_TIMEOUT, abilityName: "Patch",
        }));
      }
    }
    raids.push(raidMarker(TOP3_HELLO_WORLD_RULE_ID, "Tether Timed Out",
      `A Hello World tether ran out${pair.length ? ` (${names(pair.map((p) => p.name))}${alive.length < pair.length ? `; ${names(pair.filter((p) => !alive.includes(p)).map((p) => p.name))} dead` : ""})` : ""}: the raid-wide Patch. Treated as the cutoff point.`,
      pen.timestamp, PATCH_TIMEOUT, "Patch"));
  }
  for (const pen of clusterByGap(castsOf(casts, MISSED_REQ, end).filter((x) => x.timestamp > start), (x) => x.timestamp, 2000).map((g) => g[0])) {
    raids.push(raidMarker(TOP3_HELLO_WORLD_RULE_ID, "Latent Requirement Unmet",
      `${pen.abilityName}: a player's stack or defamation requirement ran out without the matching hit. Treated as the cutoff point.`,
      pen.timestamp, pen.abilityId, pen.abilityName));
  }

  errors.push(...detectRotClips(players, life, start, end), ...detectRotContact(players, cycles, casts, start, end));
  return { errors, raids };
}

/** A rot explosion on someone other than its holder: both named. */
function detectRotClips(players: PlayerInfo[], life: Life, start: number, end: number): PullError[] {
  const errors: PullError[] = [];
  for (const c of COLORS) {
    for (const v of players) {
      for (const e of v.damageTaken) {
        if (e.abilityId !== COL[c].rotHit || e.timestamp < start || e.timestamp > end || bodyHit(e) || !life.hitAlive(v, e.timestamp)) continue;
        // Both original carriers' rots run out in the same millisecond: keep
        // the ones standing near the victim when there's a position.
        const expiring = players.filter((p) => p !== v && debuffIntervals(p, COL[c].rot).some((iv) => iv.end >= e.timestamp - 1000 && iv.end <= e.timestamp + 300));
        const at = e.x !== undefined && e.y !== undefined ? { x: e.x, y: e.y } : interpolatePlayerPosition(v, e.timestamp, { windowMs: 2000, maxSpanMs: 3000 });
        const close = at ? expiring.filter((p) => { const q = interpolatePlayerPosition(p, e.timestamp, { windowMs: 2000, maxSpanMs: 3000 }); return q && Math.hypot(q.x - at.x, q.y - at.y) <= CLIP_RANGE; }) : [];
        const carriers = close.length ? close : expiring;
        if (!carriers.length) continue;
        const died = !!life.diedFrom(v, e.timestamp);
        for (const p of [v, ...carriers]) {
          errors.push(playerError(p, {
            ruleId: TOP3_ROT_CLIP_RULE_ID, severity: died ? "Major" : "Minor", name: "Rot Explosion Clipped",
            description: `${names(carriers.map((q) => q.name))}'s ${c} rot ran out next to ${v.name} and hit them (${realAmount(e) > 0 ? kFmt(realAmount(e)) : "lethal"})${died ? `; ${v.name} died` : ""}. Either could have moved. ${CLIP_WHY}`,
            timestamp: e.timestamp, abilityId: e.abilityId, abilityName: e.abilityName,
          }));
        }
      }
    }
  }
  return firstPer(errors, (e) => `${e.player}@${Math.round(e.timestamp / 1000)}`);
}

/**
 * A rot gained outside the hand-offs (clears: none): the receiver and the
 * giver, a player who gained the receiver's color at the same moment (a
 * swap, D17 +50.3, E15 +72.1) or else the nearest holder of the color.
 */
function detectRotContact(players: PlayerInfo[], cycles: Cycle[], casts: EnemyEvent[], start: number, end: number): PullError[] {
  const hw = castsOf(casts, HELLO_WORLD, end).find((c) => c.timestamp > start);
  if (!hw) return [];
  const gains = players.flatMap((p) => COLORS.flatMap((c) => debuffIntervals(p, COL[c].rot).filter((iv) => iv.start > hw.timestamp + 5000 && iv.start <= end &&
    !cycles.some((cy) => iv.start >= cy.res - 200 && iv.start <= cy.res + PASS_WINDOW_MS)).map((iv) => ({ p, c, t: iv.start }))));
  const errors: PullError[] = [];
  const done = new Set<PlayerInfo>();
  for (const g of gains) {
    if (done.has(g.p)) continue;
    const swap = gains.find((x) => x.p !== g.p && x.c !== g.c && Math.abs(x.t - g.t) <= 200 && heldAt(debuffIntervals(g.p, COL[x.c].rot), x.t - 300));
    let giver = swap?.p;
    if (!giver) {
      const at = interpolatePlayerPosition(g.p, g.t, { windowMs: 2000, maxSpanMs: 3000 });
      const holders = players.filter((p) => p !== g.p && heldAt(debuffIntervals(p, COL[g.c].rot), g.t - 300));
      const near = at && holders.map((p) => ({ p, q: interpolatePlayerPosition(p, g.t, { windowMs: 2000, maxSpanMs: 3000 }) }))
        .filter((x) => x.q).map((x) => ({ p: x.p, d: Math.hypot(x.q!.x - at.x, x.q!.y - at.y) })).sort((a, b) => a.d - b.d)[0];
      if (near && near.d <= CONTACT_RANGE) giver = near.p;
    }
    const who = giver ? [g.p, giver] : [g.p];
    who.forEach((p) => done.add(p));
    for (const p of who) {
      errors.push(playerError(p, {
        ruleId: TOP3_ROT_CONTACT_RULE_ID, severity: "Major", name: "Rot Spread by Contact",
        description: `${swap ? `${names(who.map((q) => q.name))} touched and swapped rots` : `${g.p.name} picked up the ${g.c} rot${giver ? ` from ${giver.name}` : ""}`} outside a hand-off, leaving the rotation with the wrong carriers. ${CONTACT_WHY}`,
        timestamp: g.t, abilityId: COL[g.c].rot, abilityName: ROT_NAME[g.c],
      }));
    }
  }
  return errors;
}

/** One error per key: the first wins. */
function firstPer(errors: PullError[], key: (e: PullError) => string): PullError[] {
  const seen = new Set<string>();
  return errors.filter((e) => { const k = key(e); if (seen.has(k)) return false; seen.add(k); return true; });
}


// ── Oversampled Wave Cannon ─────────────────────────────────────────────────

const MONITOR_WHY = "Oversampled Wave Cannon picks players on each monitor's side and the boss's: with the layout's two per side everyone takes exactly one, while a player outside it leaves a side short and the spare cannon lands on someone already picked.";

/**
 * A player picked twice, all eight alive. Living players no cannon picked
 * stood outside the layout (B66 R2, D24 H2, C17 H1, E27 H2, D42 H1): named.
 * Two players who took each other's circle (D30, 6y apart): both named.
 * Otherwise player-less (B63, C23, D5: nine cannons, nobody left out).
 */
function detectMonitors(players: PlayerInfo[], life: Life, casts: EnemyEvent[], start: number, end: number): PullError[] {
  const boss = castsOf(casts, OWC_BOSS, end).find((c) => c.timestamp > start);
  if (!boss) return [];
  const shots = casts.filter((c) => c.abilityId === OWC && Math.abs(c.timestamp - boss.timestamp) <= 3000);
  const t = shots[0]?.timestamp ?? boss.timestamp;
  if (!allAlive(players, life, t - 500)) return [];
  const hits = players.map((p) => ({ p, hits: p.damageTaken.filter((e) => e.abilityId === OWC && Math.abs(e.timestamp - t) <= 2500 && !bodyHit(e)) }));
  const doubled = hits.filter((h) => uniq(h.hits.map((e) => e.sourceInstance)).length >= 2);
  if (!doubled.length) return [];
  const died = doubled.filter((h) => h.hits.some((e) => life.diedFrom(h.p, e.timestamp))).map((h) => h.p);
  const sev = died.length ? "Major" : "Minor";
  const outcome = `${names(doubled.map((h) => h.p.name))} took two cannons${died.length ? ` (${names(died.map((p) => p.name))} died)` : ""}`;
  // One cannon that hit two or more: those players stood inside each
  // other's 7y circle (D30: the tanks 6y apart; E19).
  const byShot = new Map<number, PlayerInfo[]>();
  for (const h of hits) for (const e of h.hits) byShot.set(e.sourceInstance ?? -1, uniq([...(byShot.get(e.sourceInstance ?? -1) ?? []), h.p]));
  const crossed = uniq([...byShot.values()].filter((ps) => ps.length >= 2).flat());
  if (crossed.length >= 2) {
    // E19: the pair under one circle wasn't the doubled player; only one of
    // the two was picked, which left a side short.
    const short = !crossed.some((p) => doubled.some((h) => h.p === p));
    return crossed.map((p) => playerError(p, {
      ruleId: TOP3_MONITOR_RULE_ID, severity: sev, name: "Monitor Circles Overlapped",
      description: `Stood within 7y of ${names(crossed.filter((x) => x !== p).map((x) => x.name))}, so one Oversampled Wave Cannon circle hit them both${short ? ` and only one of them was picked, leaving a side short` : ""}: ${outcome}. Either could have been off their spot. ${MONITOR_WHY}`,
      timestamp: t, abilityId: OWC, abilityName: "Oversampled Wave Cannon",
    }));
  }
  const left = hits.filter((h) => !h.hits.length).map((h) => h.p);
  if (left.length) {
    return left.map((p) => playerError(p, {
      ruleId: TOP3_MONITOR_RULE_ID, severity: sev, name: "Outside the Monitor Layout",
      description: `No Oversampled Wave Cannon picked them, so a side came up short: ${outcome}. ${MONITOR_WHY}`,
      timestamp: t, abilityId: OWC, abilityName: "Oversampled Wave Cannon",
    }));
  }
  return [playerlessMinor(TOP3_MONITOR_RULE_ID, "Monitor Picked Twice",
    `${outcome}, with nobody left out (${shots.length} cannons): someone stood on the wrong side, but the log can't say who. ${MONITOR_WHY}`,
    t, OWC, "Oversampled Wave Cannon")];
}


// ── Cutoffs ─────────────────────────────────────────────────────────────────

function calledWipeDeaths(deaths: DeathEvent[], pullEnd: number): Set<DeathEvent> {
  const silent = deaths.filter((d) => !d.killingAbilityGameId);
  const out = new Set<DeathEvent>();
  for (const d of silent) {
    if (pullEnd - d.timestamp <= CALLED_WIPE_END_MS) out.add(d);
    const near = resetCluster(silent.filter((x) => Math.abs(x.timestamp - d.timestamp) <= CALLED_WIPE_WINDOW), deaths);
    if (near.length >= CALLED_WIPE_COUNT) near.forEach((x) => out.add(x));
  }
  return new Set(resetCluster([...out], deaths));
}

/** A silent death mid-phase, not right after another death and with no hit just before: the deathwall. */
function detectWallDeaths(players: PlayerInfo[], deaths: DeathEvent[], called: Set<DeathEvent>): PullError[] {
  const errors: PullError[] = [];
  for (const d of deaths) {
    if (d.killingAbilityGameId || called.has(d)) continue;
    const p = players.find((x) => x.name === d.player);
    if (!p) continue;
    if (deaths.some((k) => k !== d && k.timestamp <= d.timestamp && d.timestamp - k.timestamp <= RESET_AFTER_DEATH_MS)) continue;
    if (p.damageTaken.some((e) => (e.amount ?? 0) > 0 && e.timestamp <= d.timestamp && d.timestamp - e.timestamp <= SILENT_HIT_MS)) continue;
    errors.push(playerError(p, {
      ruleId: TOP3_WALL_RULE_ID, severity: "Major", name: "Walked Into the Wall",
      description: "Died with no killing blow mid-phase, with nothing before it: walked into the deathwall at the arena's edge.",
      timestamp: d.timestamp - DEATH_EVENT_LAG_MS, abilityId: 0, abilityName: "Deathwall",
    }));
  }
  return errors;
}


/**
 * The Omega Protocol Phase 3 (Omega Reconfigured) errors. Self-gates on the
 * transition's first cast (31561, which no other fight casts) and runs to
 * Phase 4's first cast. Only the earliest mechanic Raid is kept (one
 * failure, one cutoff); a generic cutoff only before it.
 */
export function detectOmegaReconfiguredErrors(
  players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], occurrences?: ReportedOccurrence[],
): PullError[] {
  const { start, end: p4 } = phase3Window(enemyCasts);
  if (start === Infinity) return [];
  const lastEvent = Math.max(0, ...players.flatMap((p) => [...p.damageTaken, ...p.casts].map((e) => e.timestamp)), ...enemyCasts.map((c) => c.timestamp));
  const end = Math.min(p4, lastEvent);
  const deaths = deathEvents.filter((d) => d.timestamp <= p4);
  const life = buildLife(players, deaths);
  const p3Deaths = deaths.filter((d) => d.timestamp >= start - 1000);
  const called = calledWipeDeaths(p3Deaths, p4 === Infinity ? lastEvent : Infinity);
  const hw = castsOf(enemyCasts, HELLO_WORLD, end).find((c) => c.timestamp > start);
  const transitionEnd = hw?.timestamp ?? end;

  const raids: PullError[] = [];
  const errors: PullError[] = [
    ...detectAvoidable(players, life, start, end),
    ...detectSniper(players, life, start, transitionEnd),
  ];
  // A player dead when Hello World hands out the duties leaves a slot empty (C9).
  if (hw) {
    const missing = players.filter((p) => !p.debuffs.some((e) => HW_AURAS.includes(e.abilityId) && Math.abs(e.timestamp - hw.timestamp) <= 1500));
    if (missing.length && missing.length < players.length) {
      raids.push(raidMarker(TOP3_TRANSITION_RULE_ID, "Dead at Hello World",
        `${names(missing.map((p) => p.name))} ${missing.length > 1 ? "were" : "was"} dead when Hello World handed out its duties, so ${missing.length > 1 ? "their slots go" : "a slot goes"} unfilled for the whole rotation. Unresolvable from here; treated as the cutoff point.`,
        hw.timestamp, HELLO_WORLD, "Hello, World"));
    }
    const cycles = readCycles(players, life, enemyCasts, start, end);
    const out = detectHelloWorld(players, life, deaths, enemyCasts, cycles, start, end, occurrences);
    errors.push(...out.errors);
    raids.push(...out.raids);
  }
  errors.push(...detectMonitors(players, life, enemyCasts, start, end));
  errors.push(...detectWallDeaths(players, p3Deaths.filter((d) => d.timestamp >= start), called));

  const firstMech = raids.sort((a, b) => a.timestamp - b.timestamp)[0];
  if (firstMech) errors.push(firstMech);

  // Generic cutoffs, only the earliest and only before the mechanic Raid.
  const generic: PullError[] = [];
  const efflux = players.flatMap((p) => p.damageTaken.filter((e) => e.abilityId === ION_EFFLUX && e.timestamp >= start && e.timestamp <= end && !bodyHit(e) && life.diedFrom(p, e.timestamp)))
    .sort((a, b) => a.timestamp - b.timestamp);
  if (efflux.length) {
    const cast = castsOf(enemyCasts, ION_EFFLUX, end).filter((c) => c.timestamp > start).pop();
    const left = cast?.hitPoints !== undefined && cast.maxHitPoints ? ` Omega still had ${(100 * cast.hitPoints / cast.maxHitPoints).toFixed(1)}% HP left.` : "";
    generic.push(raidMarker(TOP3_ENRAGE_RULE_ID, "Ion Efflux (Enrage)",
      `Ion Efflux, Phase 3's enrage, went off: Omega Reconfigured wasn't down in time.${left}`, efflux[0].timestamp, ION_EFFLUX, "Ion Efflux"));
  }
  const calledList = p3Deaths.filter((d) => called.has(d)).sort((a, b) => a.timestamp - b.timestamp);
  if (calledList.length >= CALLED_WIPE_COUNT) {
    generic.push(raidMarker(TOP3_CALLED_WIPE_RULE_ID, "Wipe Called",
      `${calledList.length} players died with no killing blow (${joinNames(uniq(calledList.map((d) => d.player)))}): the wipe was called and the raid reset into the deathwall.`,
      calledList[0].timestamp - DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  if (p4 === Infinity) {
    const outAt = (t: number) => players.filter((p) => !life.alive(p, t));
    const collapseT = life.outIntervals.map((w) => w.start).filter((t) => t >= start).sort((a, b) => a - b)
      .find((t) => outAt(t).length >= COLLAPSE_DEAD_COUNT && lastEvent - t <= COLLAPSE_END_MS);
    if (collapseT !== undefined) {
      const who = outAt(collapseT).map((p) => p.name);
      generic.push(raidMarker(TOP3_COLLAPSE_RULE_ID, "Party Collapse",
        `${who.length} players were dead at once (${joinNames(who)}). Treated as the cutoff point.`,
        collapseT + DEATH_EVENT_LAG_MS, 0, "Deaths"));
    }
  }
  const marker = generic.sort((a, b) => a.timestamp - b.timestamp)[0];
  if (marker && marker.timestamp < (firstMech?.timestamp ?? Infinity)) errors.push(marker);
  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
