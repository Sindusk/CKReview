// The Omega Protocol (Ultimate) -- Phase 5: Run: Dynamis.
//
// -- GUIDE-DERIVED MODEL (2026-10-14; NOT VERIFIED AGAINST LOGS) --
// Research only. Delta, Sigma, Omega researched in that order. This file
// is longer because P5 contains three trios and a four-chain resource
// puzzle. All log signals are guide-inferred, not observed locally.
// Scope: 6.31 Ultimate script, sync 635; no confirmed mechanic hotfix
// found. Original damage/buff/invuln advice is composition/patch-sensitive.
//
// -- SOURCES CHECKED 2026-10-14 --
// [IV-D/S/O] Meru, three independently read trio guides:
// https://www.icy-veins.com/ffxiv/the-omega-protocol-ultimate-phase-5-guide-delta
// https://www.icy-veins.com/ffxiv/the-omega-protocol-ultimate-phase-5-guide-sigma
// https://www.icy-veins.com/ffxiv/the-omega-protocol-ultimate-phase-5-guide-omega
// [EL-D/S/O] Tuufless/Elemental, Kinda Awk, tower macro, stack priorities:
// https://ffxiv.tuufless.com/elemental/top/05_run_dynamis_delta/
// https://ffxiv.tuufless.com/elemental/top/05_run_dynamis_sigma/
// https://ffxiv.tuufless.com/elemental/top/05_run_dynamis_omega/
// [GMT] Alternate mixed-tether Delta, with its own color adjustment:
// https://ffxiv.tuufless.com/elemental/top/run_dynamis_delta_gmt/
// EL/GMT author's markdown read in github.com/tuufless/FFXIV-Elemental-Raid-Macros,
// main/_elemental/top/05{a,b,c}_run_dynamis_{delta,sigma,omega}.en.md
// and run_dynamis_delta_gmt.en.md.
// [TH] LPDU trios and strategy invariants:
// https://thaliak.com/ultimates/top/
// [OCE] BPOG and marker conventions differ from Elemental:
// https://materiaraiding.com/resources/visitorsguide
// [CB] Public encounter-event timeline; phase anchors are artificial:
// https://github.com/quisquous/cactbot/blob/main/ui/raidboss/data/06-ew/ultimate/the_omega_protocol.txt
// [BM] Game IDs, geometry and primary target-selection definitions:
// https://github.com/awgil/ffxiv_bossmod/blob/master/BossMod.Ultimate/Endwalker/Ultimate/TOP/TOPEnums.cs
// Same directory P5Delta.cs, P5Sigma.cs, P5Omega.cs and
// P5NearDistantWorld.cs read. Candidate actions are decimal game IDs;
// raw aura IDs usually gain 1000000 in FFLogs. No mapping is verified.
//
// -- SHAPE, CLOCK AND RESOURCE ACCOUNTING --
// One active M actor transforms to F, with untargetable copies/helpers
// of Beetle, Reconfigured, M/F, eye, fists, arms and Rear Power Unit.
// Four two-hit Solar Rays: before Delta, Sigma, Omega and Blind Faith.
// Delta/Sigma are mostly untargetable; F remains targetable during
// Omega's initial two clone dodges and continues autoattacking the MT.
// HP must be below 20% at Blind Faith; timed script, not a kill trigger.
// CB offsets from successful P4 transition (700 anchor, NOT pull time):
// +15.6 targetable; Rays +23.6/+26.8; Delta raidwide +40;
// Delta eye +63.2, fist Explosion +66.4, Defense +68.5,
// Hyper Pulse +71.1..74, monitor +73.6, Pile Pitch +74;
// Swivel +86.4; World origins/bounces +87/+88/+89;
// +91.1 targetable; Rays +105.2/+108.5; Sigma raidwide +121.7;
// Sigma cannon/arms +143.8..144, knockback +152.4, towers +156.4;
// rear lasers +170.6..178.4, F clone AOE +173.7;
// Worlds/arm lasers +180.6, bounces +181.6/+182.6;
// +185.3 targetable; Rays +194.3/+197.4; Omega raidwide +210.7;
// clone/diffuse sets ~+227.8..228.8 and +231.9..232.7;
// first Worlds +245.4/+246.4/+247.4, monitor +245.8;
// Blaster +261.6; second Worlds +263.4/+264.4/+265.4;
// +267.7 targetable; Rays +276.8/+279.9;
// Blind Faith visual +298.5, failure +299.7. ~284s from targetability.
// Player-triggered Patch breaks are not invariant timestamps.
// Quickening Dynamis is a per-player buff, not party LB gauge. Each
// successful World impact adds ONE, capped at THREE [EL]; survives death
// [IV]. Four chains of six hits distribute 24 gains, exactly 8*3.
// Expected distribution at checkpoints:
//   Delta: 6 players at 1, 2 at 0 (sum 6).
//   Sigma: 4 at 2, 4 at 1 (sum 12).
//   Omega first: 2 at 3, 6 at 2 (sum 18); 3-stack pair has no next World.
//   Omega second: all 8 at 3 (sum 24).
// Two players sit out each World set; every player sits out exactly one
// across four sets. A hit at cap wastes a gain without a new explosion;
// someone else must then finish short. Later P6 needs all eight at three.
//
// -- SOLAR RAY / RUN: ****mi* RAIDWIDES --
// Candidates: M/F first Ray casts/damage 33196/33197, second hits
// 31489/31490; radius 5y. P5 autos M/F 31745/31746.
// Delta/Sigma/Omega raidwide casts/damage 31624/32788/32789.
// What happens: Ray hits twice ~3.2s apart, each giving magic vuln;
// three Run raidwides initiate trios and deal heavy unavoidable damage.
// Correct play: one invulnerable tank takes both hits OR swap between
// hits, buster separated from party. Tank jobs and elapsed P1-P3 affect
// invuln availability. EL has a fast-kill PLD/WAR fallback when Hallowed
// is unavailable at first Ray; no rigid "tank role X always invulns".
// Failure modes:
//   Missed swap/party clip -> LOG SIGNAL: non-invulnerable vuln holder
//     takes second hit, or extra 5y victims; FAULT: assigned tanks / bad
//     spacing by plan; CONSEQUENCE: Major if lethal/Damage Down.
// Removal: vulnerability times out; no dispel solution described.
// Not errors: two hits on invulnerable tank, expected Ray/Run damage,
// F's autos during clone movement, alternative cooldown schedules.
// Correct raw-damage deaths belong to mitigation/healing review.
//
// -- SHARED WORLD CHAIN MODEL (ALL FOUR SETS) --
// Candidates: Near player aura 3442, Distant 3443, Dynamis buff 3444;
// Near initial damage 31625 / bounces 31626;
// Distant initial damage 33040 / bounces 33041;
// distinct failed World raidwide 31627 [BM]. Magic Vulnerability Up.
// What happens: both marked auras expire together. Each origin emits
// 8y circle; ~1s later first jump, ~1s later second jump, 4y circles [BM].
// Near chooses nearest OTHER player to the current holder; Distant
// chooses furthest OTHER player. Next hop uses previous hop's position,
// not the original source or boss. Prior recipients remain eligible:
// a jump can return to the origin and kill through magic vuln [IV/EL].
// Each of six circles must hit only its own recipient. Splash onto
// another player causes failed World raid damage, not valid extra gains.
// Correct play: two origins isolated >8y; four intended bounce players
// isolated >4y and distance-ranked per hop; two sit-outs positioned to
// lose both nearest/furthest selections. Geometry changes each trio.
// Failure modes:
//   Circle overlaps -> LOG SIGNAL: extra World victims then 31627 raid
//     penalty; FAULT: bad origin/bounce spacing, by agreed spots;
//     CONSEQUENCE: Major plus Raid. A damage victim is not the culprit.
//   Wrong bounce -> LOG SIGNAL: unexpected 31626/33041 recipient and
//     Dynamis count, possibly repeat hit/vuln death; FAULT: intended
//     bait too far/near or interloper incorrectly ranked, if reconstructable;
//     CONSEQUENCE: Major; Raid if the resource puzzle is irreparable.
//   Wasted gain at cap -> LOG SIGNAL: hit on a 3-stack player without
//     stack increase, another finishes short; FAULT: assignment/position
//     error if known; CONSEQUENCE: Major plus Raid at confirmed deficit.
// Removal: expiry starts chain; death WHILE carrying unresolved World
// wipes [EL/TH]. Death after origin aura already resolves is different:
// IV says a return bounce may kill the former origin without immediate
// raid wipe. Exact distinction and death penalty timing need logs.
// Dynamis persists through death [IV]; no dispel-based solution.
// Not errors: intended World hits, intentional sit-out, persistent
// Dynamis on a raised player, conservative over-4/8y spacing.
//
// -- DELTA: ROCKET PUNCH PAIRING / EXPLOSION --
// Candidates: Peripheral Synthesis visual 31628, Archive Peripheral
// visual 32630; successful fist ground cast/damage Explosion 31482
// (3y, ~3s); failed Unmitigated Explosion 31483 (raidwide).
// Local/Remote Smell and Regression statuses/tethers reused from P3.
// What happens: two Local/red-green pairs, two Remote/blue pairs.
// Both World origins are among the blue four. Beetle/Final at opposite
// cardinals, eye on a remaining cardinal. Eight fists, four blue/four
// yellow, spawn near players then jump to their owners' new positions.
// TH gives two of each fist color within each four-player tether type.
// Opposite-color fists must meet at four pair positions; same colors or
// late/in-motion arrival give Unmitigated Explosion instead of puddles.
// Correct Kinda Awk: blues Beetle-side, Local Final-side. Pair across
// two SAME-type tethers, not automatically with own tether partner.
// Inner pair swaps sides if their fist matches adjacent outer fist.
// Keep one Remote long (break immediately on activation), other short;
// long pair then joins fist partners before snapshot, short pair later
// separates to break and enter center for Beyond Defense.
// Failure -> LOG SIGNAL: 31483 completed cast/damage, absent successful
// paired 31482 telegraph; FAULT: wrong-color/late fist pair if visual
// color/owner available, otherwise not in log; CONSEQUENCE: Raid plus
// Major on proven responsible player. No guess from surviving puddles.
// Removal: successful fists leave dodgeable ground explosions; they
// disappear after resolving. Failed fists finish their wipe cast.
// Not errors: designated early tether break; opposite-color pairing
// between different tether types under the separately planned GMT strat.
//
// -- DELTA: ARM BAITS / OPTICAL LASER --
// Candidates: Optical Laser 31521 (16y wide); Hyper Pulse first cast/
// damage 31600, repeats 31601 (8y wide, 100y lines [BM]).
// What happens: six arms, each CW/CCW visual indication. Nearest player
// locks first line; arm fires and rotates (~six pulses in CB sequence).
// Eye laser overlaps fist stage. Each bait's aim controls arena safety.
// Kinda Awk: four Local players bait side/Final-side arms, long Remote
// pair baits Beetle-side arms, short Remote pair baits center Defense.
// Correct play: hug assigned arm's proper side, aim spin out of arena;
// wait for line telegraph, not disappearing spin arrows, before leaving.
// Failure -> LOG SIGNAL: 31600/31601 or 31521 hits, unexpected line
// rotation/aim from arm; FAULT: early/wrong baiter or bad dodger if known;
// CONSEQUENCE: Major for death/Damage Down, Raid for party cleave.
// Removal: lines resolve by script; spin marker is visual, not a debuff.
// Not errors: standing close to an arm's visual spinner; transient early
// tether preparations; correct post-bait relocation across cleared lines.
//
// -- DELTA: MONITORS / BEYOND DEFENSE / PILE PITCH --
// Candidates: boss monitor casts 31638/31639; resolving monitor damage
// 31597/player Loading 3452/3453 reused; Defense cast/damage 31527/31528,
// Pile Pitch 31529. Ruin, Doom and Magic Vulnerability Up reused.
// What happens: one random blue player has Loading; Final has monitors.
// Four Local players receive the four monitor hits, two per source.
// Two short-Remote players bait Defense (random of closest two); the
// hit player leaves Pile Pitch, remaining three blue players share.
// Correct play: blue monitor points outward opposite Final's monitor,
// creating a safe corridor for blue stack. If monitor holder was hit by
// Defense, they still aim correctly while outside the three-player stack.
// Local monitor victims spread at edge. Normal Pile Pitch is three here,
// not P2's seven; IV says a mitigated two-player share can survive.
// Failure modes:
//   Bad monitor -> LOG SIGNAL: 31597 on blue/stack player or duplicated
//     victims; FAULT: angle/position error by plan; CONSEQUENCE: Major/Raid.
//   Defense holder shares -> LOG SIGNAL: 31529 with prior Ruin -> Doom;
//     FAULT: holder failing to leave if alive/able; CONSEQUENCE: Major.
//   Missing stack -> LOG SIGNAL: reduced count/high split damage; FAULT:
//     absent assigned blue sharer if known; CONSEQUENCE: Major if lethal.
// Removal: Loading expiry fires, temporary vulnerability/Ruin wear off.
// Not errors: intended monitor/jump/stack damage, valid two-stack plan,
// monitor holder absent from Pile Pitch when they had Defense.
//
// -- DELTA: PATCH BREAKS / SWIVEL / FIRST WORLDS --
// Candidates: Patch normal/fail 31587/32505; Swivel R/L casts/damage
// 31636/31637 (210-degree cone from Beetle [BM]); World's shared IDs.
// Correct play: do not break both Remote pairs together at activation.
// First Local break after ALL party Ruin from monitor/stack wears off;
// these lockouts need not have the same duration. EL cue ~15s left on
// Local timer; final Local break ~2s left, after World vuln ends.
// Safe World pattern, using Swivel's safe side: origins on cardinal
// between bosses, Near nearer cleave boundary, Distant at safe wall;
// first Local pair takes Near bounces, other takes Distant bounces;
// two unmarked blue players sit out at wall away from Beetle.
// EL uses wall/marker and three-notch offsets; IV's markers differ.
// Failure modes:
//   Early Patch -> LOG SIGNAL: Patch into active Ruin/vuln, Doom/deaths;
//     FAULT: initiating tether pair if movement proves it;
//     CONSEQUENCE: Major plus Raid for cascade.
//   Late Patch -> LOG SIGNAL: 32505 timeout; FAULT: unresolved pair if
//     assignment known; CONSEQUENCE: Raid (with attributable Majors).
//   Swivel hit -> LOG SIGNAL: 31636/31637 damage/death; FAULT: wrong
//     safe side if cue known; CONSEQUENCE: Major, World-holder death Raid.
// Removal: distance breaks trigger Patch, timeout fails; World expiry
// follows shared model. Dead-holder/tether break exact behavior unknown.
// Not errors: four scheduled Patch breaks, Swivel avoidance reducing
// usable arena, deliberate sit-outs and six one-stack survivors.
//
// -- DELTA STRATEGY VARIANTS / DISAGREEMENT --
// IV/EL Awk call OUTER blue the initial long/breaking pair; TH calls
// CENTER/inner blue long and gives remaining outer pair arm baits.
// The actual invariant is long pair's early break, four opposite-color
// fist pairs, six safe arm baits, separate remaining blue break.
// GMT intentionally pairs one Local with one Remote at box corners;
// choose the tether color whose partners have opposite-color fists to
// adjust, then form trapezium. Red-green bait boss-side arms, long blue
// bait middle arms. Tuufless GMT also reverses Sfia's later Local duties.
// TH says "never" mix tether types because fist colors can fail, while
// GMT explicitly supplies the compensating color-selection algorithm.
// Treat this as competing conditional plans, not a universal prohibition.
//
// -- SIGMA: SIX PREY BEAMS / TWO FARTHEST ARM BAITS --
// Candidates: Sigma controller 32788; Program Loop visual 31640;
// Wave Cannon visual 31603, damage 31604; Hyper Pulse 31602 (6y wide);
// Mid/Remote Glitch 3427/3428, partner tether 222, prey headmarker 244.
// What happens: four symbol pairs; six marks arranged as two double-
// marked pairs, two single-marked pairs. Two arms opposite M each
// dynamically target their FURTHEST player. Those must be the two
// unmarked players. This is different from Delta's NEAREST arm baits.
// Correct play: M relative north, arms SW/SE. Line up symbol pairs;
// EL circle/cross/triangle/square, TH/OCE BPOG. Read pairs top to bottom:
//   first double: left N / right S; second double: left W / right E;
//   first single: unmarked NW / marked SE;
//   second single: unmarked NE / marked SW.
// At hit satisfy glitch range (Mid 20-26y / Remote >=35y [EL]; BM's
// Remote bound is 34y, unresolved as in P2).
// Failure -> LOG SIGNAL: 31602 on a prey victim, overlapping 31604,
// glitch vulnerability at damage; FAULT: wrong furthest bait or spread
// position, not every clipped target; CONSEQUENCE: Major, likely Raid.
// Removal: prey resolves; glitch/Looper remain for towers. World origins
// can also be prey; that is normal and does not change initial duty.
// Not errors: transient glitch violation during travel, intentional arm
// hits on unmarked players, symbol orders from different conventions.
//
// -- SIGMA: KNOCKBACK / ONE- AND TWO-PERSON TOWERS --
// Candidates: Discharger 31534; one-person Storage Violation 31492,
// two-person 31493, failure 31494; Looper/Memory Loss reused from P1.
// What happens: Mid has six towers (four single/two double); Remote
// five (two single/three double), total eight soaker places [BM]. Towers
// radius 3y. Pattern faces original M or 180 degrees opposite [EL].
// Correct play: remember spread waymark, not current world direction;
// pattern's point is new north, four-tower side is south. EL mapping:
//   Mid: NW single 1; NE single 2; W double A+3; E double D+4;
//        SW single B; SE single C.
//   Remote: N double 1+2; W single A; E single D;
//           SW double B+3; SE double C+4.
// Align radially in front of assigned tower for center knockback, then
// satisfy glitch before tower damage. Remote co-soakers stand at tower
// edges away from their original symbol partners; tethers criss-cross.
// Failure modes:
//   Empty/wrong capacity -> LOG SIGNAL: 31494 raid penalty, no proper
//     Looper clear; FAULT: assigned missing/wrong tower player if known;
//     CONSEQUENCE: Major plus Raid. Capacity is not tower count alone.
//   Bad landing/distance -> LOG SIGNAL: wall death or vulnerability at
//     soak, Memory Loss after unresolved Looper; FAULT: wrong radial
//     setup/edge position if known; CONSEQUENCE: Major, likely Raid.
// Removal: tower cleans Looper; uncleaned expiry gives Memory Loss.
// Exact death/overfill and knockback-immunity behavior unverified.
// Not errors: two players in designated doubles, Remote edge soaking,
// 180-degree pattern flip, correct tower damage.
//
// -- SIGMA: REAR LASERS / F STANCE / SECOND WORLDS --
// Candidates: Rear Lasers first cast/damage 31631, repeats 31632
// (12y-wide line), fourteen pulses ~0.6s apart [BM]; F Steel/Blizzard
// 31530..31533 reused; two Hyper Pulse 31602, World's shared IDs.
// What happens: F becomes relative north at new cardinal/intercardinal;
// two arms SW/SE, rotating double-ended rear laser at center. F's staff
// or blade-legs AOE resolves during rotation, Worlds/arm hits after it.
// Correct play: two NON-World one-stack players sit out by baiting arms;
// all zero-stack players must receive a World gain. Split three toward
// F (two arms + one Distant bounce), five opposite. EL allows zero-stack
// north Distant bait if both arm sit-outs have one; IV says all northern
// three have one. Both work if zero-stacks get their gain.
// Staff: wait outside its cross before following laser. Legs: follow
// cleared laser promptly into central safe corridor. Trailing arm baiter
// waits for last laser before entering final intercardinal.
// IV final setup relative to starting south laser / rotation direction:
// Near origin advances 90 degrees, one ring inside marker; Near first
// at same cardinal wall, Near second a little behind on wall; Distant
// origin stays at starting cardinal one ring inside, Distant bounce
// players at its wall and F's north wall. Arm sit-outs at two opposite
// intercardinals must remain closer than intended farthest bounce.
// Failure -> LOG SIGNAL: Rear Laser/clone damage or wrong 31602/World
// recipient and resource deficit; FAULT: bad dodge/bait by plan if known;
// CONSEQUENCE: Major, Raid for 31627 or impossible remaining gains.
// Removal: lasers/stance resolve, World chains expire; glitch clears
// after tower section per normal script (exact removal to verify).
// Not errors: arm sit-outs staying at one stack, tank preference for
// these sit-outs to avoid later Blaster low HP, 3+5 positioning.
//
// -- OMEGA: DOUBLE CLONE COMBO / DIFFUSE WAVE CANNON --
// Candidates: Omega controller 32789; first diffuse visual 31643/31644,
// repeats 31607/31608; actual cone damage 31609 (120 degrees [BM]);
// P2 clone AOE IDs reused. First/Second in Line accompany four Worlds.
// What happens: two Near/two Distant origins, one of each per round;
// two successive opposite-intercardinal clone pairs, ring cleaves two
// opposite cardinals then turns 90 degrees. F remains attackable/autos.
// Correct play: derive candidate cardinals from clone weapon pair,
// eliminate one with center diffuse, then move 90 degrees CW or CCW:
//   staff+sword -> M-adjacent cardinal, far/wall;
//   staff+shield -> M-adjacent cardinal, mid/near waymark;
//   legs+sword -> F-adjacent cardinal, near/inside center hitbox;
//   legs+shield -> M-adjacent cardinal, near.
// IV says glowing ring axis is SAFE axis; EL describes lights as attacks.
// Weapon pairs cannot exactly repeat [IV], unverified invariant.
// Failure -> LOG SIGNAL: clone/31609 damage with Damage Down/death;
// FAULT: wrong cardinal/radius or late move, cue/callout owner not in
// logs; CONSEQUENCE: Major, Raid if unresolved World origin dies.
// Removal: AOEs end on each volley; no cleanse. Not errors: keeping
// uptime/healing MT, different close/mid/far callout terminology.
//
// -- OMEGA: FIRST WORLDS WITH MONITORS --
// Candidates: 31638/31639 boss monitors -> damage 31597; World's
// shared IDs; In-Line 1/2 game statuses 3004/3005.
// Correct play: First origins fixed. Select two monitor sit-outs from
// TWO-stack players excluding First origins; any TWO-stack Second
// origin MUST sit out this round, or their next guaranteed hit is wasted.
// Remaining six get World hits. Ends at two 3-stack/six 2-stack, with
// neither 3-stack player holding a Second World.
// Geometry: monitor firing side relative north; two sit-outs spread
// there >7y; all six chain players opposite, off half-plane boundary.
// Near origin south inside marker, Near bounces south wall separated;
// Distant origin E/W inside marker, Distant bounces opposite E/W walls.
// Failure -> LOG SIGNAL: monitor on chain player / wrong World gain,
// three-stack Second origin or one-stack player left after set;
// FAULT: wrong assignment or geometry by declared priority;
// CONSEQUENCE: Major and Raid when gains cannot reach all-eight-three.
// Removal: First World's expiry starts chain, monitor resolves normally.
// Not errors: Second origin standing in monitor area to sit out this
// World set; marker icon/left-right choices are external raid data.
//
// -- OMEGA: SECOND WORLDS WITH BLASTER --
// Candidates: Blaster cast 32374, visual 31641, actual damage 32373
// (15y circle); transferable tether 89; HP Penalty/Ruin reused.
// Correct play: two THREE-stack players take tethers and sit out;
// two Second origins plus four remaining 2-stack players form chains.
// Beetle is new relative north; same World layout mirrored from first
// set. Holders wall near Beetle intercardinals, away from origins/baits.
// Blaster resolves ~1.8s before World origin; holders may adjust after
// tether hit to avoid being accidental Distant bounces.
// Failure -> LOG SIGNAL: extra 32373 victims, unwanted World on capped
// holder, Ruin/Doom or 31627; FAULT: wrong holder/spot/bait geometry if
// known; CONSEQUENCE: Major plus Raid for unresolved puzzle/cascade.
// Removal: intended Blaster gives temporary 1% max HP then wears off;
// tanks may need topping before final Ray. A low-HP tank is not proof of
// bad tether choice; three-stack assignment can validly require a tank.
// Not errors: intended Blaster, all eight finishing at three, holders
// adjusting after hit, subsequent healer attention to tank current HP.
//
// -- BLIND FAITH / WHAT ENDS A PULL --
// Candidates: visual 10s cast 31623; success raidwide/knockback 32626;
// failed HP-check raidwide 32627. Success still needs healing/mitigation.
// At completion F below 20% -> long transition to Alpha Omega; above
// threshold -> Raid. Comparator/snapshot time unverified as in P4.
// Fist penalty 31483, failed World 31627, missed towers, Regression
// timeout 32505, unresolved World-holder death are explicit early wipes.
// Finishing with a permanent Dynamis deficit also dooms P6. Capped
// gains do not themselves deal a new penalty; record root cause once.
// IV explicitly describes deliberate late-P5 walls/unguarded Ray deaths
// AFTER World completion to remove -90% Damage Down before P6. Those
// recovery deaths are not new mechanic mistakes; Dynamis persists.
// Called wipes, cascades and retargeted attacks are not fresh culprits.
//
// -- OPEN QUESTIONS / SOURCE DISAGREEMENTS FOR LOG VERIFICATION --
// 1. Verify 31627 for splash versus unresolved-holder death; IV says
//    return-bounce death need not instant-wipe, EL broadly says carrier
//    death wipes. Does prior aura removal explain the difference?
// 2. Confirm Dynamis persists through death, caps at three, initial
//    origin contributes one, and every clean set is six distinct gains.
// 3. Delta: actual first long/short tether, fist ownership/color events,
//    Awk versus GMT plan; TH's no-mixed-tethers rule conflicts with GMT.
// 4. Are Final monitors two selected targets or "all" on side (IV-D)?
//    BM treats full half-plane as hazardous but does not prove all hit.
// 5. Patch stack type/count/durations and death/timeout effects; which
//    pair owns a raidwide break if no tether events are imported?
// 6. Sigma: tower failures/overfill, capacities, Looper timing, knockback
//    immunity, glitch range/removal. What penalty names/IDs actually log?
// 7. Sigma Near bounce spacing: IV says five wall notches; EL says four.
//    Different origin positions or true discrepancy? Measure distances.
//    IV sends three 1-stack north; EL needs only two. Check sit-out logic.
// 8. Omega ring-light safe/unsafe interpretation, weapon-repeat rule,
//    clone actual damage IDs, whether cardinal near/mid/far bounds differ.
// 9. Confirm monitor/Blaster resource assignment at both Omega sets,
//    HP Penalty duration, late recovery strategy, actual marker/role plan.
// 10. Blind Faith pass/fail IDs, exact 20% comparator and snapshot;
//     phase-relative clocks rather than CB's artificial 700/1100 anchors.
// 11. Which avoidables give Damage Down? Survived avoidable Damage Down
//     is Major per repository FFXIV rule; raw mit/healing deaths are not.
