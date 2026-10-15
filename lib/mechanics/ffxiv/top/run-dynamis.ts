// The Omega Protocol (Ultimate) -- Phase 5: Run: Dynamis.
// Entry point: detectRunDynamisErrors. Self-gates on Phase 5's opening cast
// (31621, or 31622 from Omega-F) and runs to Blind Faith's result.
//
// -- VERIFIED AGAINST LOGS (2026-10-15) --
// The ten-report static of blue-screen.ts (not the user's; no VOD; NAUR
// strats, which the user confirmed). Every pull on disk that reached P5,
// refetched --refetch --min-phase 4 --from-minutes 6.8 --to-minutes 14.2
// (the P4 flags with a later end, so the P4 span is unchanged). Letters
// follow blue-screen.ts; cited as K12 +188.4 (report letter, the report's
// own pull number, seconds from the 31621 cast, which lands 8:28-8:45):
//   E = 8tLjB2zVD1mvwdWX: E20.
//   F = m7nq1PMNVkJTyhXC: F6 F18 F19.
//   G = AtNzJbpGVC2kMnFw: G9 G13 G17 G21 G22.
//   H = FqWyfQALBRhgcTkt: H5 H9 H11 H13 H15 H24 H30.
//   I = bhXTzwtAv3kmLHp9: I17 I25.
//   J = K9nqQw6ZRjWbgGMc: J7 J10 J14 J17 J18 J20.
//   K = C8bQAFtakJBYxM6n: K3 K4 K8 K10 K11 K12 K20 K21 K22 K30.
//   L = bNcrLh7Y4dkHxM9q: L2 L5 L6 L9 L12 L14 L15 L16; L16 is the kill.
//   42 P5 pulls: 14 wiped in Delta, 12 in Sigma, 7 in Omega, 9 reached
//   Blind Faith (H24 failed it; J7 J14 J17 J20 K22 L14 L15 passed and
//   wiped in P6, outside this module; L16 killed). The passes are the
//   baseline.
// Clock from 31621, every pull within ~1s: Solar Ray pairs (33196 / 31489,
// later 33197 / 31490) +17.4 / +20.6, +99.3, +188.5, +271.7. DELTA: Run
// (31624) +34.0; Code Smells (Local 1003440, Remote 1003504) and the World
// auras (Near 1003442, Distant 1003443) +37.0; Regression tethers (Local
// 1001672, Remote 1001673) +55.0; one Remote pair breaks at once (+55.2),
// the other +57.9-59.6; Loading (1003452 / 1003453) +57.4; Optical Laser
// 31521 +57.1; fists +60.3; Beyond Defense 31527 / 31528 +62.4 / +62.7;
// arms (Hyper Pulse 31600 then 31601) +65.0-68.0; monitors (one 31597
// cast per pick) +67.5; Pile Pitch 31529 +67.8; Local breaks +75.5-77.9
// and +88.9-89.6; Worlds +81.1 (origins 31625 Near / 33040 Distant),
// jumps (31626 / 33041) +82.2 / +83.2. SIGMA: Run (32788) +116; Mid /
// Remote Glitch (1003427 / 1003428) and World auras +119; Looper
// 1003456 +135.5; arms 31602 +138.0 and prey 31604 +138.3 (hits +139);
// Discharger 31534 +146.7; towers (31492 single, 31493 double; 31494
// empty) cast +150.6-151.6; Omega-F's stance (31530-31533) +168; Rear
// Lasers 31631 / 31632 (damage only; one pull logged the casts); arms
// +175.3, Worlds +175.6. OMEGA: Run (32789) +205.5; First / Second in
// Line (1003004 / 1003005) with the World auras +208.6; clone combo
// (31531 / 31532 / 31533, 31609, 31525 / 31526) +223.5-228.9; first
// Worlds +241 with the monitors; Blaster 32373 +257 (HP Penalty
// 1003401); second Worlds +259.4. Blind Faith 31623 +294.2, pass 32626 /
// fail 32627 1.2s later. Fist ground hits (31482) and Swivel / Rear Laser
// casts are mostly absent from the log; damage still shows.
// Damage Down only from avoidables (Hyper Pulse, Omega-F's stance and the
// clones, Obliteration) and the raid penalties (Patch fail, Hello World).
// Findings:
// - Hello World 31627 is the raid penalty for every World failure: a
//   second player in a circle (G13 K3 at Delta, G22 L9 at Sigma, K21 K30
//   L5 L6 at Omega's first set), or a holder dying before resolution
//   (F6 H9 walls, H13 Doom, H15 Rear Lasers, K20 an arm, L12 an arm on a
//   prey player), or a glitch player dying while the glitch is live
//   (F19, H11). A jump that comes back to its earlier player kills them
//   through the vulnerability without failing the chain (G22 Delta, K21
//   Sigma, J10 Omega).
// - Patch 32505 is the failed Patch: a tether ended by a death (F6 G21
//   H30 walls, F18 K8 arms, I25 Swivel) or run out (G17: the second Local
//   pair's 36.0s tether expired; clean second breaks came at +88.9-89.6).
//   No early break by two living partners on disk.
// - Silent deaths ~+60-62 are the deathwall while baiting Delta's arms;
//   a holder's or tethered player's wall death sets off Hello World or
//   the Patch failure in the same 0.1s.
// - Fists: Unmitigated Explosion 31483 hit all eight (I17, K10); the
//   fists' colours and owners aren't logged.
// - Delta monitors pick the four Local players in every pull with
//   everyone alive; the two exceptions picked the Beyond Defense target
//   (Remote) instead, who already had Ruin and got Doom (H5, H13). Pile
//   Pitch always held the other three Remote players.
// - Sigma: glitch partners share every Vulnerability Up (1003366) apply
//   and removal, on both at once while out of range. A pair still out of
//   range when the towers cast takes a lethal tower hit (unmitigated
//   6.7M+): H11 two pairs (33.7y and 0.2y apart under Mid Glitch), G22,
//   L2, and the overfilled towers of J18 / K11. Clean pairs cleared it
//   before the cast; everyone gets it briefly at +120 and +140.
// - Sigma arms pick the two unmarked players in every clean pull. An arm
//   on a prey-marked player (F19, L12) killed them with both hits; the
//   unmarked player wasn't farthest. Arm lines that hit two lose their
//   cast target (K4 K12 K20 K21 L9); the baiter is the one with no World
//   duty.
// - Towers: Obliteration 31494 (Damage Down and Doom on all): H5 two
//   players in no tower; J18 three in a double; K11 one in none and three
//   in a double.
// - Worlds: six distinct players per set in every clean pull, all eight
//   at three Dynamis by the end (from the World hits; the Dynamis buff
//   1003444 isn't in the fetched buff stream). H24's monitor sit-out took
//   a Distant jump in Omega's first set, went to four and left one player
//   at two; Blind Faith then failed at 30.2% anyway.
// - Omega's first monitors went to the two sit-outs; one also caught by a
//   World jump died (H24, K12: the Second origin). Blaster hit two players
//   with one circle once (J10); the extra then took a jump and died.
// - Every Blind Faith pull drops its Damage Downs with silent deaths after
//   Blaster (J7 J17 J20 K22 L14 L16 H24); K12's Sigma Damage Down holder
//   did the same at +188.4. Not errors.
// - Blind Faith checks Omega-M's HP at the 31623 cast: passes 13.3-19.4%
//   (J7), the fail 30.2% (H24).
// No wipe left unexplained. Cutoffs (first Raid error) over the 34 P5
// wipes: Hello World 18 (F6 G13 H9 H13 K3 F19 G22 H11 H15 K20 L9 L12 J10
// K12 K21 K30 L5 L6), Patch 6 (F18 G17 G21 H30 I25 K8), empty tower 3
// (H5 J18 K11), fists 2 (I17 K10), a Run raidwide killing 3+ 2 (E20 five
// in Delta, G9 four in Sigma), collapse 1 (K4: four dead), Dynamis short 1
// (H24), both healers dead 1 (L2, ffxiv/common.ts: the glitch towers
// killed the SCH, then the WHM walked into the wall). The passes have
// none; the kill's only P5 error is a Superliminal Steel Damage Down.
//
// -- RULES IMPLEMENTED --
// ffxiv-top5-avoidable (Major on Damage Down or death, else Minor): Delta's
//   arms, Optical Laser, Swivel Cannon, Rear Lasers, Omega-F's stance and
//   the clone combo.
// ffxiv-top5-wall (Major): a silent death no Doom, failure, called wipe or
//   Damage Down reset explains (a Damage Down holder's silent death counts
//   as a reset after Blaster, or before it while holding no World or
//   tether).
// ffxiv-top5-patch (targeted: each tether pair at its break): a failed
//   Patch with both partners alive (ran out or broke early), both named.
// ffxiv-top5-monitor: a Delta monitor on a non-Local player, everyone
//   alive; an Omega monitor sit-out also hit by that set's World.
// ffxiv-top5-world: a player in another World's origin circle (the extra,
//   not the holder); a jump over two (all); a jump back to a player
//   already hit that set; a hit at three Dynamis. Hits after the set's
//   Hello World are fallout.
// ffxiv-top5-prey: a Sigma arm on a prey-marked player: the unmarked
//   player not farthest (player-less when prey casts lost targets: F19).
// ffxiv-top5-arm: a Sigma arm line on a player it didn't target (Major on
//   death or a World holder); both when the baiter can't be told.
// ffxiv-top5-glitch: both partners of a pair out of range at the towers.
// ffxiv-top5-tower: an empty tower: players in no tower, and an
//   overfilled tower's players as candidates.
// ffxiv-top5-blaster: one Blaster circle over two players (both).
// Raid, the earliest kept: -hello-world, -patch (failed Patch), -fist,
//   -tower (empty), -dynamis (someone under three after the fourth set),
//   -raidwide (a Run raidwide killing 3+), -blind-faith (with Omega-M's
//   HP). -called-wipe and -collapse (4 dead at once, K4; never checked in
//   a pull that passed Blind Faith) only before them.
// Not built: who aimed a Delta arm or a fist pair (not in the log);
// Solar Ray tank deaths (raw damage; no non-tank was ever hit with both
// tanks alive); Pile Pitch with the Defense target (never seen); glitch
// range at the prey hit (no failure tied to it); which partner of a
// glitch pair or tether moved (positions alone don't say).
//
// -- GUIDE-DERIVED MODEL (2026-10-14) --
// Written before any report was analyzed; VERIFIED AGAINST LOGS above wins.
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

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import type { ReportedOccurrence } from "@/lib/mechanics/occurrences";
import { distanceBetween } from "@/lib/mechanics/geometry";
import { kFmt, joinNames, playerError, raidMarker, playerlessMinor, clusterByGap } from "@/lib/mechanics/wow/common";
import { DAMAGE_DOWN, DEATH_EVENT_LAG_MS, PREVIEW_AMOUNT, type Life, bodyHit, buildLife, uniq, realAmount, resetCluster } from "../fru/common";

export const TOP5_AVOIDABLE_RULE_ID   = "ffxiv-top5-avoidable";
export const TOP5_WALL_RULE_ID        = "ffxiv-top5-wall";
export const TOP5_PATCH_RULE_ID       = "ffxiv-top5-patch";
export const TOP5_MONITOR_RULE_ID     = "ffxiv-top5-monitor";
export const TOP5_WORLD_RULE_ID       = "ffxiv-top5-world";
export const TOP5_PREY_RULE_ID        = "ffxiv-top5-prey";
export const TOP5_ARM_RULE_ID         = "ffxiv-top5-arm";
export const TOP5_GLITCH_RULE_ID      = "ffxiv-top5-glitch";
export const TOP5_TOWER_RULE_ID       = "ffxiv-top5-tower";
export const TOP5_BLASTER_RULE_ID     = "ffxiv-top5-blaster";
export const TOP5_DYNAMIS_RULE_ID     = "ffxiv-top5-dynamis";
export const TOP5_HELLO_WORLD_RULE_ID = "ffxiv-top5-hello-world";
export const TOP5_FIST_RULE_ID        = "ffxiv-top5-fist";
export const TOP5_RAIDWIDE_RULE_ID    = "ffxiv-top5-raidwide";
export const TOP5_BLIND_FAITH_RULE_ID = "ffxiv-top5-blind-faith";
export const TOP5_CALLED_WIPE_RULE_ID = "ffxiv-top5-called-wipe";
export const TOP5_COLLAPSE_RULE_ID    = "ffxiv-top5-collapse";

const P5_START     = [31621, 31622]; // Phase 5's opening cast (Omega-M, or Omega-F in two pulls)
const RUNS         = [31624, 32788, 32789]; // Run: ****mi* Delta / Sigma / Omega, cast and raidwide
const BF_CAST      = 31623;
const BF_PASS      = 32626;
const BF_FAIL      = 32627;
const PATCH        = 31587;
const PATCH_FAIL   = 32505; // a tether broken by a death, or run out
const HELLO_WORLD  = 31627; // a World chain failed: splash, or a holder died
const UNMITIGATED  = 31483; // Delta's fists met wrong
const OBLITERATION = 31494; // an empty Sigma tower
const LOCAL_REG    = 1001672;
const REMOTE_REG   = 1001673;
const NEAR_AURA    = 1003442;
const DIST_AURA    = 1003443;
const ORIGIN_HITS  = [31625, 33040]; // Near / Distant World, the holder's own 8y circle
const BOUNCE_HITS  = [31626, 33041]; // the two jumps (4y circles)
const WORLD_HITS   = [...ORIGIN_HITS, ...BOUNCE_HITS];
const MONITOR      = 31597;
const DOOM         = 1002519;
const PREY         = 31604;
const SIGMA_ARM    = 31602;
const TOWER_1      = 31492;
const TOWER_2      = 31493;
const GLITCH_VULN  = 1003366; // both glitch partners, while out of range
const BLASTER      = 32373;
const AVOIDABLE: Record<number, string> = {
  31600: "Hyper Pulse", 31601: "Hyper Pulse", 31521: "Optical Laser",
  31636: "Swivel Cannon", 31637: "Swivel Cannon", 31631: "Rear Lasers", 31632: "Rear Lasers",
  31530: "Superliminal Steel", 31531: "Superliminal Steel", 31532: "Superliminal Steel", 31533: "Optimized Blizzard III",
  31609: "Diffuse Wave Cannon", 31525: "Beyond Strength", 31526: "Efficient Bladework",
};
const AVOID_WHY: Record<string, string> = {
  "Hyper Pulse": "Delta's arms fire their lines at the player nearest each one, then rotate: bait your own arm from its correct side and leave only once the line is telegraphed.",
  "Optical Laser": "the eye's laser crosses the arena during Delta: stand off its line.",
  "Swivel Cannon": "the Beetle's Swivel Cannon cleaves 210 degrees: take the World positions on its safe side.",
  "Rear Lasers": "Sigma's rear lasers rotate from the centre: follow behind the cleared laser.",
  "Superliminal Steel": "read Omega-F's (and the clones') weapon: blade-legs are safe in close, the staff's cross outside it.",
  "Optimized Blizzard III": "Omega-F's staff cross: wait outside its lines before moving.",
  "Diffuse Wave Cannon": "Omega's double clone combo: find the cardinal its two weapons leave safe, then move 90 degrees with the ring.",
  "Beyond Strength": "Omega's double clone combo: find the cardinal its two weapons leave safe, then move 90 degrees with the ring.",
  "Efficient Bladework": "Omega's double clone combo: find the cardinal its two weapons leave safe, then move 90 degrees with the ring.",
};
const FAILURE_CASTS = [HELLO_WORLD, PATCH_FAIL, UNMITIGATED, OBLITERATION, BF_FAIL];

// FFLogs logs a raidwide's deaths ~2.0s after the hit; a silent death whose
// fatal moment is this long after a failure cast is that failure's victim.
// The wall deaths that set off Hello World or a Patch failure come 0.0-0.1s
// before its cast (F6 +61.3, G21 +60.1, H30 +60.7).
const FAILURE_KILL_FROM_MS = 400;
const FAILURE_KILL_TO_MS   = 4000;
const RAIDWIDE_DEATHS      = 3; // E20 Delta (5), G9 Sigma (4), K4 Omega (4); no pass lost 1
const COLLAPSE_DEAD_COUNT  = 4;
const CALLED_WIPE_END_MS   = 12_000;
const CALLED_WIPE_COUNT    = 3;
const CALLED_WIPE_WINDOW   = 10_000;
const TETHER_TIMEOUT_MS    = 35_000; // Local Regression ran 36.0s (G17); clean second breaks at +33.9 to +34.5
const WORLD_SET_GAP_MS     = 4000;
const BF_THRESHOLD         = 20; // % HP at the 31623 cast: passes 13.3-19.4% (J7), the fail 30.2% (H24)

const sec = (ms: number) => (ms / 1000).toFixed(1);
const names = (ns: string[]) => joinNames(uniq(ns));
const byName = (players: PlayerInfo[], n: string) => players.find((p) => p.name === n);

type Window = { start: number; end: number; bfCast?: EnemyEvent; passed: boolean; failed: boolean };

/** Phase 5: its opening cast to Blind Faith's result (or the pull's end). */
function phase5Window(casts: EnemyEvent[], lastEvent: number): Window {
  const start = casts.find((c) => P5_START.includes(c.abilityId))?.timestamp ?? Infinity;
  const result = casts.find((c) => (c.abilityId === BF_PASS || c.abilityId === BF_FAIL) && c.timestamp > start);
  const bfCast = casts.find((c) => c.abilityId === BF_CAST && c.timestamp > start);
  return { start, end: result ? result.timestamp + 3000 : lastEvent, bfCast, passed: result?.abilityId === BF_PASS, failed: result?.abilityId === BF_FAIL };
}

const liveHits = (players: PlayerInfo[], life: Life, ids: number[], from: number, to: number) =>
  players.flatMap((p) => p.damageTaken.filter((e) => ids.includes(e.abilityId) && e.timestamp >= from && e.timestamp <= to && !bodyHit(e) && life.hitAlive(p, e.timestamp)).map((e) => ({ p, e })));

/** The aura's intervals on a player: [apply, removal), removal Infinity while held. */
function auraIntervals(p: PlayerInfo, id: number): { start: number; end: number }[] {
  const out: { start: number; end: number }[] = [];
  for (const d of [...p.debuffs].filter((x) => x.abilityId === id).sort((a, b) => a.timestamp - b.timestamp)) {
    const open = out.length && out[out.length - 1].end === Infinity;
    if (d.debuffStatus === "applied" || d.debuffStatus === "stack") { if (!open) out.push({ start: d.timestamp, end: Infinity }); }
    else if (d.debuffStatus === "removed" && open) out[out.length - 1].end = d.timestamp;
  }
  return out;
}
const holds = (p: PlayerInfo, id: number, t: number) => auraIntervals(p, id).some((w) => t >= w.start && t < w.end);

/** Holding a World or a tether: a death then fails the mechanic for everyone. */
const hasDuty = (p: PlayerInfo, t: number) => [NEAR_AURA, DIST_AURA, LOCAL_REG, REMOTE_REG].some((id) => holds(p, id, t - 200));

const gotDamageDown = (p: PlayerInfo, from: number, to: number) =>
  p.debuffs.some((d) => d.abilityId === DAMAGE_DOWN && d.debuffStatus === "applied" && d.timestamp >= from - 200 && d.timestamp <= to + 1500);


// ── Avoidable damage ────────────────────────────────────────────────────────

/** Avoidable hits: Major on Damage Down or death, else Minor. */
function detectAvoidable(players: PlayerInfo[], life: Life, from: number, to: number): PullError[] {
  const errors: PullError[] = [];
  const ids = Object.keys(AVOIDABLE).map(Number);
  for (const p of players) {
    const hits = p.damageTaken.filter((e) => ids.includes(e.abilityId) && e.timestamp >= from && e.timestamp <= to && !bodyHit(e) &&
      life.hitAlive(p, e.timestamp) && (realAmount(e) > 0 || (e.amount ?? 0) >= PREVIEW_AMOUNT));
    for (const g of clusterByGap(hits, (e) => e.timestamp, 3000)) {
      const last = g[g.length - 1].timestamp;
      const what = AVOIDABLE[g[0].abilityId];
      const died = life.diedFrom(p, last);
      const dd = gotDamageDown(p, g[0].timestamp, last);
      const total = g.reduce((s, e) => s + realAmount(e), 0);
      errors.push(playerError(p, {
        ruleId: TOP5_AVOIDABLE_RULE_ID, severity: died || dd ? "Major" : "Minor", name: `Hit by ${what}`,
        description: `Hit by ${what} (${g.length > 1 ? `${g.length} hits, ` : ""}${total > 0 ? kFmt(total) : "lethal"}).${died ? " They died." : dd ? " Got Damage Down." : ""} ${AVOID_WHY[what] ?? ""}`.trim(),
        timestamp: g[0].timestamp, abilityId: g[0].abilityId, abilityName: g[0].abilityName,
      }));
    }
  }
  return errors;
}


// ── Deaths with no killing blow ─────────────────────────────────────────────

function calledWipeDeaths(deaths: DeathEvent[], pullEnd: number): Set<DeathEvent> {
  const silent = deaths.filter((d) => !d.killingAbilityGameId);
  const out = new Set<DeathEvent>();
  for (const d of silent) {
    // A lone silent death right before a failure that kills the party is
    // that failure's cause, not a reset (F6, H9: the World holder).
    const mechAfter = deaths.some((k) => k.killingAbilityGameId && k.timestamp > d.timestamp);
    if (pullEnd - d.timestamp <= CALLED_WIPE_END_MS && !mechAfter) out.add(d);
    const near = resetCluster(silent.filter((x) => Math.abs(x.timestamp - d.timestamp) <= CALLED_WIPE_WINDOW), deaths);
    if (near.length >= CALLED_WIPE_COUNT) near.forEach((x) => out.add(x));
  }
  return new Set(resetCluster([...out], deaths));
}

/**
 * A silent death in Phase 5 that nothing else explains: the deathwall. Not
 * a called wipe, not a Doom running out (H13), not a failure's victim, and
 * not a Damage Down holder's deliberate reset: after Blaster (every Blind
 * Faith pull drops its Damage Downs that way: J7 J17 J20 K22 L14 L16 H24),
 * or earlier while holding no World or tether (K12 +188.4).
 */
function detectWallDeaths(players: PlayerInfo[], deaths: DeathEvent[], called: Set<DeathEvent>, casts: EnemyEvent[], start: number): PullError[] {
  const errors: PullError[] = [];
  const blaster = casts.find((c) => c.abilityId === BLASTER && c.timestamp > start)?.timestamp ?? Infinity;
  for (const d of deaths) {
    if (d.killingAbilityGameId || called.has(d) || d.timestamp < start) continue;
    const p = byName(players, d.player);
    if (!p) continue;
    const fatal = d.timestamp - DEATH_EVENT_LAG_MS;
    if (p.debuffs.some((x) => x.abilityId === DOOM && x.debuffStatus === "applied" && x.timestamp <= fatal && fatal - x.timestamp <= 15_000)) continue;
    if (casts.some((c) => FAILURE_CASTS.includes(c.abilityId) && fatal - c.timestamp >= FAILURE_KILL_FROM_MS && fatal - c.timestamp <= FAILURE_KILL_TO_MS)) continue;
    if (holds(p, DAMAGE_DOWN, fatal - 100) && (fatal > blaster || !hasDuty(p, fatal))) continue;
    // A hit that left them at 0 HP is the cause, not the wall (H30's WHM took
    // a 19k Patch 0.8s before, at 45k HP: still the wall).
    if (p.damageTaken.some((e) => e.timestamp <= fatal + 300 && fatal - e.timestamp <= 1500 && (e.healthAfter === 0 && (e.amount ?? 0) > 0 || (e.amount ?? 0) >= PREVIEW_AMOUNT))) continue;
    const duty = holds(p, NEAR_AURA, fatal - 200) || holds(p, DIST_AURA, fatal - 200) ? " They held a Hello World, so their death set off its raidwide."
      : holds(p, LOCAL_REG, fatal) || holds(p, REMOTE_REG, fatal) ? " They were tethered, so their death failed the Patch." : "";
    // The failure it set off is cast in the same instant: list the wall first.
    const setOff = casts.find((c) => FAILURE_CASTS.includes(c.abilityId) && Math.abs(c.timestamp - fatal) < FAILURE_KILL_FROM_MS);
    errors.push(playerError(p, {
      ruleId: TOP5_WALL_RULE_ID, severity: "Major", name: "Walked Into the Wall",
      description: `Died with no killing blow mid-phase, with nothing before it: walked into the deathwall at the arena's edge.${duty}`,
      timestamp: setOff ? Math.min(fatal, setOff.timestamp - 1) : fatal, abilityId: 0, abilityName: "Deathwall",
    }));
  }
  return errors;
}


// ── Delta: tethers and Patch ────────────────────────────────────────────────

type Tether = { kind: "Local" | "Remote"; pair: PlayerInfo[]; applied: number; broke: number; patch?: EnemyEvent };

/** Each Regression pair: both partners lose it in the same millisecond. */
function readTethers(players: PlayerInfo[], casts: EnemyEvent[], from: number, to: number): Tether[] {
  const out: Tether[] = [];
  for (const [id, kind] of [[LOCAL_REG, "Local"], [REMOTE_REG, "Remote"]] as const) {
    const ends = players.flatMap((p) => auraIntervals(p, id).filter((w) => w.start >= from && w.start <= to && w.end !== Infinity).map((w) => ({ p, w })));
    for (const g of clusterByGap(ends.sort((a, b) => a.w.end - b.w.end), (x) => x.w.end, 50)) {
      const broke = g[0].w.end;
      const patch = casts.find((c) => (c.abilityId === PATCH || c.abilityId === PATCH_FAIL) && c.timestamp >= broke - 50 && c.timestamp <= broke + 600);
      out.push({ kind, pair: g.map((x) => x.p), applied: g[0].w.start, broke, patch });
    }
  }
  return out.sort((a, b) => a.broke - b.broke);
}

const TETHER_WHY = "The long Remote pair breaks at once, the other Remote pair before Beyond Defense; the Local pairs break after the monitors' and Pile Pitch's Ruin has worn off, the second one with a few seconds left.";

/**
 * A failed Patch (32505) with both partners alive: a Local tether that ran
 * out (G17 +91.1, 36.0s after it appeared; clean second breaks +88.9 to
 * +89.6) or broke early. Both partners are named. A failed Patch because a
 * partner died (F6 G21 H30 walls, F18 K8 arms, I25 Swivel) is the death's
 * fallout: the death has its own error.
 */
function detectTethers(players: PlayerInfo[], life: Life, tethers: Tether[], occurrences?: ReportedOccurrence[]): PullError[] {
  const errors: PullError[] = [];
  for (const t of tethers) {
    occurrences?.push({ mechanicKey: TOP5_PATCH_RULE_ID, timestamp: t.broke, players: t.pair.map((p) => p.name) });
    if (t.patch?.abilityId !== PATCH_FAIL) continue;
    if (!t.pair.every((p) => life.alive(p, t.broke))) continue;
    const ran = t.broke - t.applied;
    const timeout = ran >= TETHER_TIMEOUT_MS;
    for (const p of t.pair) {
      errors.push(playerError(p, {
        ruleId: TOP5_PATCH_RULE_ID, severity: "Major", name: timeout ? "Tether Ran Out" : "Tether Broken Early",
        description: timeout
          ? `Their ${t.kind} tether with ${names(t.pair.filter((q) => q !== p).map((q) => q.name))} ran its full ${sec(ran)}s without being broken, so Patch failed on the party. ${TETHER_WHY}`
          : `Broke their ${t.kind} tether with ${names(t.pair.filter((q) => q !== p).map((q) => q.name))} ${sec(ran)}s after it appeared, while the party couldn't take another Patch. ${TETHER_WHY}`,
        timestamp: t.broke, abilityId: PATCH_FAIL, abilityName: "Patch",
      }));
    }
  }
  return errors;
}


// ── Delta / Omega: monitors and Beyond Defense ──────────────────────────────

/**
 * Delta's four monitor hits belong to the four Local players (every pull
 * with everyone alive). A Remote player picked instead was the Beyond
 * Defense target each time (H5, H13): Twice-come Ruin twice gave Doom.
 * Omega's first monitors are the two sit-outs; one also taken by a World
 * jump died to it (H24, K12).
 */
function detectMonitors(players: PlayerInfo[], life: Life, start: number, tethers: Tether[], sets: WorldSet[]): PullError[] {
  const errors: PullError[] = [];
  const local = uniq(tethers.filter((t) => t.kind === "Local").flatMap((t) => t.pair));
  const delta = liveHits(players, life, [MONITOR], start + 55_000, start + 80_000);
  if (delta.length && local.length === 4 && players.every((p) => life.alive(p, delta[0].e.timestamp - 3000))) {
    const picked = uniq(delta.map((h) => h.p));
    for (const p of picked.filter((x) => !local.includes(x))) {
      const t = delta.find((h) => h.p === p)!.e.timestamp;
      const doom = p.debuffs.some((d) => d.abilityId === DOOM && d.debuffStatus === "applied" && Math.abs(d.timestamp - t) <= 1500);
      const died = deathsAfter(p, life, t);
      const left = local.filter((q) => !picked.includes(q));
      errors.push(playerError(p, {
        ruleId: TOP5_MONITOR_RULE_ID, severity: doom || died ? "Major" : "Minor", name: "Took a Monitor",
        description: `Picked by an Oversampled Wave Cannon monitor although not a Local player${doom ? " and, with Ruin already on them, got Doom" : ""}${died ? "; they died" : ""}.${left.length ? ` ${names(left.map((q) => q.name))} (Local) went unpicked.` : ""} The four Local players take the monitors; the Remote players stack for Pile Pitch away from them, the Beyond Defense target alone.`,
        timestamp: t, abilityId: MONITOR, abilityName: "Oversampled Wave Cannon",
      }));
    }
  }
  const omega = liveHits(players, life, [MONITOR], start + 230_000, start + 250_000);
  const set = sets.find((s) => omega.length && s.t >= omega[0].e.timestamp - 3000 && s.t <= omega[0].e.timestamp + 3000);
  if (set) {
    for (const p of uniq(omega.map((h) => h.p))) {
      const w = set.hits.find((h) => h.p === p && (set.hw === undefined || h.e.timestamp < set.hw));
      if (!w) continue;
      const died = deathsAfter(p, life, w.e.timestamp);
      errors.push(playerError(p, {
        ruleId: TOP5_MONITOR_RULE_ID, severity: died ? "Major" : "Minor", name: "Monitor and World",
        description: `Sat out on the monitor side but a World jump (${w.e.abilityName}) still reached them${died ? ": the second hit killed them" : ""}, and its stack went to a player who should have sat out. The two monitor players spread on the firing side, well clear of every chain player, so neither Near nor Distant picks them.`,
        timestamp: w.e.timestamp, abilityId: w.e.abilityId, abilityName: w.e.abilityName,
      }));
    }
  }
  return errors;
}

const deathsAfter = (p: PlayerInfo, life: Life, t: number) => !!life.diedFrom(p, t) || !life.alive(p, t + 2500);


// ── Hello World chains and Dynamis ──────────────────────────────────────────

type WorldHit = { p: PlayerInfo; e: PlayerEvent };
type WorldSet = { n: number; t: number; hits: WorldHit[]; hw?: number };

/** The World sets (Delta, Sigma, Omega first and second): each origin, its two jumps. */
function readWorldSets(players: PlayerInfo[], life: Life, casts: EnemyEvent[], from: number, to: number): WorldSet[] {
  const hits = liveHits(players, life, WORLD_HITS, from, to).sort((a, b) => a.e.timestamp - b.e.timestamp);
  return clusterByGap(hits, (h) => h.e.timestamp, WORLD_SET_GAP_MS).map((g, i) => {
    const t = g[0].e.timestamp;
    const hw = casts.find((c) => c.abilityId === HELLO_WORLD && c.timestamp >= t - 1500 && c.timestamp <= g[g.length - 1].e.timestamp + 1000)?.timestamp;
    return { n: i + 1, t, hits: g, hw };
  });
}

const SET_NAME = ["Delta", "Sigma", "Omega's first", "Omega's second"];
const WORLD_WHY = "Each World's 8y origin and its two 4y jumps must hit only their own player: origins well apart, jump players spaced and ranked so Near picks the next-nearest and Distant the next-farthest, sit-outs out of both.";

/**
 * The chains, set by set (the kill: six distinct players each set, all
 * eight at three by the end):
 * - a player in someone else's origin circle (G13 K3 at Delta, G22 L9 at
 *   Sigma, K21 K30 L5 L6 at Omega's first): Hello World followed every one;
 * - a jump circle over two players (never seen): both;
 * - a player hit twice in one set, the jump coming back to them (G22 Delta,
 *   K21 Sigma, J10 Omega: each died through the vulnerability);
 * - a hit on a player already at three stacks (H24's fourth set), wasting
 *   it.
 * Hits after the set's Hello World are fallout.
 */
function detectWorlds(players: PlayerInfo[], life: Life, sets: WorldSet[], flagged: Set<string>): PullError[] {
  const errors: PullError[] = [];
  const stacks = new Map<PlayerInfo, number>();
  for (const s of sets) {
    const setName = SET_NAME[s.n - 1] ?? `#${s.n}`;
    const valid = s.hits.filter((h) => s.hw === undefined || h.e.timestamp <= s.hw + 300);
    const circles = clusterByGap(valid, (h) => h.e.timestamp, 400).flatMap((g) => {
      const by = new Map<string, WorldHit[]>();
      for (const h of g) { const k = `${h.e.abilityId}#${h.e.sourceInstance}`; by.set(k, [...(by.get(k) ?? []), h]); }
      return [...by.values()];
    });
    const named = new Set<PlayerInfo>();
    for (const c of circles.filter((x) => x.length > 1)) {
      const origin = ORIGIN_HITS.includes(c[0].e.abilityId);
      const holder = origin ? c.find((h) => holds(h.p, c[0].e.abilityId === 31625 ? NEAR_AURA : DIST_AURA, h.e.timestamp - 1500)) : undefined;
      const extras = holder ? c.filter((h) => h !== holder) : c;
      for (const h of extras) {
        named.add(h.p);
        const died = deathsAfter(h.p, life, h.e.timestamp);
        const at = holder ? distanceBetween(h.e as { x: number; y: number }, holder.e as { x: number; y: number }) : undefined;
        errors.push(playerError(h.p, {
          ruleId: TOP5_WORLD_RULE_ID, severity: "Major", name: holder ? "In Another World's Circle" : "World Jump Overlap",
          description: holder
            ? `Stood${at !== undefined && h.e.x !== undefined && holder.e.x !== undefined ? ` ~${(at / 100).toFixed(1)}y` : ""} from ${holder.p.name}, the ${c[0].e.abilityName.replace("Hello, ", "")} origin, inside its 8y circle in ${setName} Worlds${died ? "; they died" : ""}. The splash failed the chain (Hello World). ${WORLD_WHY}`
            : `${names(c.map((x) => x.p.name))} were all caught by one ${c[0].e.abilityName} jump in ${setName} Worlds${died ? "; they died" : ""}. ${WORLD_WHY}`,
          timestamp: h.e.timestamp, abilityId: h.e.abilityId, abilityName: h.e.abilityName,
        }));
      }
    }
    const per = new Map<PlayerInfo, WorldHit[]>();
    for (const h of valid) per.set(h.p, [...(per.get(h.p) ?? []), h]);
    for (const [p, hs] of per) {
      const before = stacks.get(p) ?? 0;
      stacks.set(p, Math.min(3, before + 1));
      if (named.has(p) || flagged.has(p.name)) continue;
      if (hs.length > 1) {
        const died = deathsAfter(p, life, hs[1].e.timestamp);
        errors.push(playerError(p, {
          ruleId: TOP5_WORLD_RULE_ID, severity: died ? "Major" : "Minor", name: "World Jumped Back",
          description: `Took ${hs.length} World hits in ${setName} Worlds (${hs.map((h) => h.e.abilityName.replace("Hello, ", "")).join(", then ")}): a jump came back to them through the vulnerability${died ? " and killed them" : ""}, and only one counts. ${WORLD_WHY}`,
          timestamp: hs[1].e.timestamp, abilityId: hs[1].e.abilityId, abilityName: hs[1].e.abilityName,
        }));
      } else if (before >= 3) {
        errors.push(playerError(p, {
          ruleId: TOP5_WORLD_RULE_ID, severity: "Major", name: "World at Three Stacks",
          description: `Took a World hit (${hs[0].e.abilityName}) in ${setName} Worlds already holding three Quickening Dynamis: the stack was wasted and someone else finishes short. A three-stack player sits out (monitor or Blaster) instead.`,
          timestamp: hs[0].e.timestamp, abilityId: hs[0].e.abilityId, abilityName: hs[0].e.abilityName,
        }));
      }
    }
  }
  return errors;
}

/** Dynamis per player after the fourth set, from the World hits (the buff itself isn't fetched). */
function dynamisShort(players: PlayerInfo[], sets: WorldSet[]): PullError | undefined {
  // A set that failed (Hello World) is already its own cutoff (J10).
  if (sets.length < 4 || sets.some((s) => s.hw !== undefined)) return undefined;
  const count = new Map<PlayerInfo, number>();
  for (const s of sets) for (const p of uniq(s.hits.filter((h) => s.hw === undefined || h.e.timestamp <= s.hw + 300).map((h) => h.p))) count.set(p, (count.get(p) ?? 0) + 1);
  const short = players.filter((p) => (count.get(p) ?? 0) < 3);
  if (!short.length) return undefined;
  const last = sets[3].hits[sets[3].hits.length - 1].e;
  return raidMarker(TOP5_DYNAMIS_RULE_ID, "Dynamis Short",
    `After the last World set ${short.map((p) => `${p.name} has ${count.get(p) ?? 0}`).join(", ")} Quickening Dynamis instead of three: Phase 6 needs all eight at three. Unresolvable from here; treated as the cutoff point.`,
    last.timestamp, last.abilityId, last.abilityName);
}


// ── Sigma: prey, arms, glitch towers ────────────────────────────────────────

/**
 * Sigma's two arms each pick the farthest player: in the kill, the two
 * players with no prey mark. An arm cast on a marked player (F19, L12: that
 * player took both and died) means an unmarked player wasn't the farthest;
 * they're named when all six prey casts kept their targets. Later arm lines
 * (and the second pair during the Worlds) that hit a player they didn't
 * target name the extra player (K4 K12 K20 K21 L9).
 */
function detectSigmaArms(players: PlayerInfo[], life: Life, casts: EnemyEvent[], from: number, to: number): PullError[] {
  const errors: PullError[] = [];
  const arms = casts.filter((c) => c.abilityId === SIGMA_ARM && c.timestamp >= from && c.timestamp <= to);
  const prey = casts.filter((c) => c.abilityId === PREY && c.timestamp >= from && c.timestamp <= to);
  for (const g of clusterByGap(arms, (c) => c.timestamp, 3000)) {
    const t = g[0].timestamp;
    if (!players.every((p) => life.alive(p, t))) continue;
    const marks = prey.filter((c) => Math.abs(c.timestamp - t) <= 2000);
    const marked = uniq(marks.map((c) => c.target).filter((n): n is string => !!n));
    for (const c of g) {
      if (c.target && marked.includes(c.target)) {
        const unmarked = marks.length === 6 && marked.length === 6 ? players.filter((p) => !marked.includes(p.name) && !g.some((x) => x.target === p.name)) : [];
        const victim = byName(players, c.target);
        const died = victim ? deathsAfter(victim, life, t) : false;
        const desc = `An arm's Hyper Pulse picked ${c.target}, who had a prey mark, as the farthest player${died ? "; with both hits they died" : ""}. The two unmarked players stand farthest from the arms (north-west and north-east of their pairs) so the arms take them.`;
        if (unmarked.length) for (const p of unmarked) errors.push(playerError(p, { ruleId: TOP5_PREY_RULE_ID, severity: died ? "Major" : "Minor", name: "Not Farthest From the Arm", description: `${desc} ${p.name} had no prey mark but wasn't farther.`, timestamp: t, abilityId: SIGMA_ARM, abilityName: "Hyper Pulse" }));
        else errors.push(playerlessMinor(TOP5_PREY_RULE_ID, "Arm on a Prey Player", `${desc} Some prey casts lost their targets, so the unmarked player can't be named.`, t, SIGMA_ARM, "Hyper Pulse"));
      }
      const hits = liveHits(players, life, [SIGMA_ARM], c.timestamp, c.timestamp + 1500).filter((h) => h.e.sourceInstance === c.sourceInstance);
      // A line over two players loses its cast target (K4 K12 K20 K21 L9).
      // Its baiter is then the one with no World duty: not holding a World
      // and not hit by the chain that follows (K20: the Distant origin).
      let baiter = c.target;
      if (!baiter && hits.length > 1) {
        const free = hits.filter((h) => !holds(h.p, NEAR_AURA, h.e.timestamp) && !holds(h.p, DIST_AURA, h.e.timestamp) &&
          !h.p.damageTaken.some((e) => WORLD_HITS.includes(e.abilityId) && e.timestamp >= h.e.timestamp - 1000 && e.timestamp <= h.e.timestamp + 4000));
        if (free.length === 1) baiter = free[0].p.name;
      }
      const extras = baiter ? hits.filter((x) => x.p.name !== baiter) : hits.length > 1 ? hits : [];
      for (const h of extras) {
        const died = deathsAfter(h.p, life, h.e.timestamp);
        const holder = holds(h.p, NEAR_AURA, h.e.timestamp) || holds(h.p, DIST_AURA, h.e.timestamp);
        errors.push(playerError(h.p, {
          ruleId: TOP5_ARM_RULE_ID, severity: died || holder ? "Major" : "Minor", name: "In an Arm's Line",
          description: baiter
            ? `Stood in the Hyper Pulse line aimed at ${baiter} (${realAmount(h.e) > 0 ? kFmt(realAmount(h.e)) : "lethal"})${died ? "; they died" : holder ? " while holding a Hello World" : ""}. Only the arm's baiter belongs in its line.`
            : `One Hyper Pulse line hit ${names(hits.map((x) => x.p.name))}${died ? `; ${h.p.name} died` : ""}. Neither had a World duty, so the baiter can't be told apart and both are named. Only the arm's baiter belongs in its line.`,
          timestamp: h.e.timestamp, abilityId: SIGMA_ARM, abilityName: "Hyper Pulse",
        }));
      }
    }
  }
  return errors;
}

/**
 * Glitch partners share every Vulnerability Up timing (it lands on both
 * while they're out of range). A pair still out of range when the towers
 * snapshot takes a lethal tower hit (unmitigated 6.7M+): H11 (two pairs),
 * G22, L2. Clean pairs cleared it 0.1s+ before the towers' cast.
 */
function detectGlitch(players: PlayerInfo[], life: Life, casts: EnemyEvent[], from: number, to: number): PullError[] {
  const errors: PullError[] = [];
  const tc = casts.filter((c) => [TOWER_1, TOWER_2, OBLITERATION].includes(c.abilityId) && c.timestamp >= from && c.timestamp <= to).sort((a, b) => a.timestamp - b.timestamp)[0];
  if (!tc) return errors;
  const t = tc.timestamp;
  const key = (p: PlayerInfo) => auraIntervals(p, GLITCH_VULN).filter((w) => w.start >= from && w.start <= t).map((w) => Math.round(w.start / 100)).join(",");
  const up = players.filter((p) => holds(p, GLITCH_VULN, t) && life.alive(p, t));
  const groups = new Map<string, PlayerInfo[]>();
  for (const p of up) groups.set(key(p), [...(groups.get(key(p)) ?? []), p]);
  for (const pair of groups.values()) {
    const tower = (p: PlayerInfo) => p.damageTaken.find((e) => (e.abilityId === TOWER_1 || e.abilityId === TOWER_2) && e.timestamp >= t && e.timestamp <= t + 2500);
    const died = pair.filter((p) => deathsAfter(p, life, tower(p)?.timestamp ?? t));
    const gap = pair.length === 2 ? (() => { const [a, b] = pair.map(tower); return a?.x !== undefined && b?.x !== undefined ? distanceBetween(a as { x: number; y: number }, b as { x: number; y: number }) : undefined; })() : undefined;
    const glitch = pair[0].debuffs.find((d) => (d.abilityId === 1003427 || d.abilityId === 1003428) && d.debuffStatus === "applied" && d.timestamp >= from - 5000 && d.timestamp <= t)?.abilityName ?? "glitch";
    for (const p of pair) {
      errors.push(playerError(p, {
        ruleId: TOP5_GLITCH_RULE_ID, severity: died.length ? "Major" : "Minor", name: "Glitch Range at the Towers",
        description: `Still out of ${glitch} range from ${names(pair.filter((q) => q !== p).map((q) => q.name)) || "their partner"}${gap !== undefined ? ` (~${(gap / 100).toFixed(1)}y apart)` : ""} when the towers went off, so the tower hit was lethal${died.length ? `: ${names(died.map((q) => q.name))} died` : ""}. Mid Glitch partners soak 20-26y apart, Remote Glitch 35y+; both partners are named.`,
        timestamp: tower(p)?.timestamp ?? t, abilityId: tower(p)?.abilityId ?? TOWER_1, abilityName: "Storage Violation",
      }));
    }
  }
  return errors;
}

/**
 * An empty tower (Obliteration: Damage Down and Doom on everyone). Names
 * the living players in no tower (H5 the two, K11 one), and the players of
 * an overfilled tower (a single with 2+, a double with 3+: J18 and K11 had
 * three in a double) as candidates.
 */
function detectTowers(players: PlayerInfo[], life: Life, casts: EnemyEvent[], from: number, to: number): PullError[] {
  const ob = casts.find((c) => c.abilityId === OBLITERATION && c.timestamp >= from && c.timestamp <= to);
  if (!ob) return [];
  const soaks = liveHits(players, life, [TOWER_1, TOWER_2], ob.timestamp - 1000, ob.timestamp + 2500);
  const by = new Map<number, WorldHit[]>();
  for (const h of soaks) by.set(h.e.sourceInstance ?? -1, [...(by.get(h.e.sourceInstance ?? -1) ?? []), h]);
  const over = [...by.values()].filter((g) => g.length > (g[0].e.abilityId === TOWER_2 ? 2 : 1)).flatMap((g) => g.map((h) => h.p));
  const none = players.filter((p) => life.alive(p, ob.timestamp) && !soaks.some((h) => h.p === p));
  const out: PullError[] = [];
  for (const p of none) out.push(playerError(p, { ruleId: TOP5_TOWER_RULE_ID, severity: "Major", name: "Missed a Tower", description: `In no Sigma tower when one stood empty: Storage Violation Obliteration gave everyone Damage Down and Doom.${over.length ? ` ${names(over.map((q) => q.name))} crowded one tower.` : ""} Every player soaks: Mid has four singles and two doubles, Remote two singles and three doubles.`, timestamp: ob.timestamp, abilityId: OBLITERATION, abilityName: "Storage Violation Obliteration" }));
  for (const p of uniq(over)) out.push(playerError(p, { ruleId: TOP5_TOWER_RULE_ID, severity: "Major", name: "Overfilled a Tower", description: `In a Sigma tower holding more players than it takes (${names(over.map((q) => q.name))}) while another stood empty: Storage Violation Obliteration gave everyone Damage Down and Doom. One of them belonged in the empty tower.`, timestamp: ob.timestamp, abilityId: OBLITERATION, abilityName: "Storage Violation Obliteration" }));
  return out;
}


// ── Omega: Blaster ──────────────────────────────────────────────────────────

/** Blaster tethers: each 15y circle should hit only its holder (J10: one hit two, and the extra died to the next World jump). */
function detectBlaster(players: PlayerInfo[], life: Life, from: number, to: number): PullError[] {
  const hits = liveHits(players, life, [BLASTER], from, to);
  const by = new Map<number, WorldHit[]>();
  for (const h of hits) by.set(h.e.sourceInstance ?? -1, [...(by.get(h.e.sourceInstance ?? -1) ?? []), h]);
  const out: PullError[] = [];
  for (const g of by.values()) {
    if (g.length < 2) continue;
    const died = g.filter((h) => !life.alive(h.p, h.e.timestamp + 10_000) || !!life.diedFrom(h.p, h.e.timestamp));
    for (const h of g) out.push(playerError(h.p, {
      ruleId: TOP5_BLASTER_RULE_ID, severity: died.length ? "Major" : "Minor", name: "Blaster Overlap",
      description: `One Blaster circle hit ${names(g.map((x) => x.p.name))}: HP Penalty on both${died.length ? `, and ${names(died.map((x) => x.p.name))} died soon after` : ""}. The two three-stack tether holders take Blaster at the walls near the Beetle, away from each other and every World player. Holder and neighbour can't be told apart, so both are named.`,
      timestamp: h.e.timestamp, abilityId: BLASTER, abilityName: "Blaster",
    }));
  }
  return out;
}


// ── Cutoffs ─────────────────────────────────────────────────────────────────

/** What a Hello World raidwide followed: a splash, or a holder's death. */
function helloWorldWhy(players: PlayerInfo[], life: Life, deaths: DeathEvent[], sets: WorldSet[], t: number): string {
  const s = sets.find((x) => x.hw === t);
  if (s) {
    const splash = clusterByGap(s.hits.filter((h) => h.e.timestamp <= t + 300), (h) => h.e.timestamp, 400)
      .flatMap((g) => { const k = new Map<string, number>(); for (const h of g) { const key = `${h.e.abilityId}#${h.e.sourceInstance}`; k.set(key, (k.get(key) ?? 0) + 1); } return [...k.values()]; }).some((n) => n > 1);
    if (splash) return "a World circle caught a second player";
  }
  const holder = deaths.find((d) => { const p = byName(players, d.player); const f = d.timestamp - DEATH_EVENT_LAG_MS; return p && Math.abs(f - t) <= 1500 && (holds(p, NEAR_AURA, f - 200) || holds(p, DIST_AURA, f - 200)); });
  if (holder) return `${holder.player} died holding a World`;
  const recent = deaths.filter((d) => { const f = d.timestamp - DEATH_EVENT_LAG_MS; return f <= t + 300 && t - f <= 2000; });
  if (recent.length) return `${names(recent.map((d) => d.player))} died just before it`;
  return "the chain failed";
}

/**
 * The Omega Protocol Phase 5 (Run: Dynamis) errors. Self-gates on Phase 5's
 * opening cast (31621 / 31622, which no other fight casts) and runs to Blind
 * Faith's result. Only the earliest mechanic Raid is kept; a generic cutoff
 * only before it.
 */
export function detectRunDynamisErrors(
  players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], occurrences?: ReportedOccurrence[],
): PullError[] {
  const lastEvent = Math.max(0, ...players.flatMap((p) => [...p.damageTaken, ...p.casts].map((e) => e.timestamp)), ...enemyCasts.map((c) => c.timestamp));
  const { start, end, bfCast, passed, failed } = phase5Window(enemyCasts, lastEvent);
  if (start === Infinity) return [];
  const deaths = deathEvents.filter((d) => d.timestamp <= end + DEATH_EVENT_LAG_MS);
  const life = buildLife(players, deaths);
  const p5Deaths = deaths.filter((d) => d.timestamp >= start);
  const casts = enemyCasts.filter((c) => c.timestamp >= start && c.timestamp <= end);
  const called = calledWipeDeaths(p5Deaths, lastEvent);

  const tethers = readTethers(players, casts, start + 40_000, start + 70_000);
  const sets = readWorldSets(players, life, casts, start, end);
  const errors: PullError[] = [
    ...detectAvoidable(players, life, start, end),
    ...detectWallDeaths(players, p5Deaths, called, casts, start),
    ...detectTethers(players, life, tethers, occurrences),
    ...detectSigmaArms(players, life, casts, start + 100_000, start + 200_000),
    ...detectGlitch(players, life, casts, start + 100_000, start + 170_000),
    ...detectTowers(players, life, casts, start + 100_000, start + 170_000),
    ...detectBlaster(players, life, start + 230_000, end),
  ];
  const monitors = detectMonitors(players, life, start, tethers, sets);
  errors.push(...monitors);
  errors.push(...detectWorlds(players, life, sets, new Set(monitors.map((e) => e.player!).filter(Boolean))));

  // Mechanic Raids: only the earliest is kept.
  const raids: PullError[] = [];
  for (const c of casts.filter((x) => x.abilityId === HELLO_WORLD)) {
    raids.push(raidMarker(TOP5_HELLO_WORLD_RULE_ID, "Hello World Failed",
      `Hello World's chain failed (${helloWorldWhy(players, life, p5Deaths, sets, c.timestamp)}) and its raidwide went off. Unresolvable from here; treated as the cutoff point.`,
      c.timestamp, HELLO_WORLD, "Hello, World"));
  }
  for (const c of casts.filter((x) => x.abilityId === PATCH_FAIL)) {
    const t = tethers.find((x) => x.patch === c);
    const dead = t?.pair.filter((p) => !life.alive(p, t.broke)) ?? [];
    raids.push(raidMarker(TOP5_PATCH_RULE_ID, "Patch Failed",
      `${t ? `${names(t.pair.map((p) => p.name))}'s ${t.kind} tether ${dead.length ? `broke when ${names(dead.map((p) => p.name))} died` : t.broke - t.applied >= TETHER_TIMEOUT_MS ? "ran out" : "broke at the wrong time"}` : "A tether failed"}: Patch failed on the whole party. Unresolvable from here; treated as the cutoff point.`,
      c.timestamp, PATCH_FAIL, "Patch"));
  }
  const fist = casts.find((x) => x.abilityId === UNMITIGATED);
  if (fist) raids.push(raidMarker(TOP5_FIST_RULE_ID, "Rocket Punches Failed",
    "Two Rocket Punch fists met wrong (same colours, or late), giving Unmitigated Explosion to everyone. The fists' colours and owners aren't in the log, so nobody is named: each opposite-colour pair meets at its spot in time.",
    fist.timestamp, UNMITIGATED, "Unmitigated Explosion"));
  const ob = casts.find((x) => x.abilityId === OBLITERATION);
  if (ob) raids.push(raidMarker(TOP5_TOWER_RULE_ID, "Sigma Tower Empty",
    "A Sigma tower stood empty: Storage Violation Obliteration put Damage Down and Doom on everyone. Unresolvable from here; treated as the cutoff point.",
    ob.timestamp, OBLITERATION, "Storage Violation Obliteration"));
  const short = dynamisShort(players, sets);
  if (short) raids.push(short);
  for (const run of casts.filter((x) => RUNS.includes(x.abilityId))) {
    const killed = liveHits(players, life, [run.abilityId], run.timestamp, run.timestamp + 3000).filter((h) => life.diedFrom(h.p, h.e.timestamp));
    if (uniq(killed.map((h) => h.p)).length >= RAIDWIDE_DEATHS) raids.push(raidMarker(TOP5_RAIDWIDE_RULE_ID, "Raidwide Killed Several",
      `${run.abilityName} killed ${uniq(killed.map((h) => h.p)).length} players (${names(killed.map((h) => h.p.name))}): not enough mitigation or HP for the trio's opening raidwide. Unresolvable from here; treated as the cutoff point.`,
      killed[0].e.timestamp, run.abilityId, run.abilityName));
  }
  if (failed && bfCast) {
    const hp = bfCast.hitPoints !== undefined && bfCast.maxHitPoints ? 100 * bfCast.hitPoints / bfCast.maxHitPoints : undefined;
    raids.push(raidMarker(TOP5_BLIND_FAITH_RULE_ID, "Blind Faith Failed",
      `Blind Faith's HP check failed: ${bfCast.actorName || "Omega"} was ${hp !== undefined ? `at ${hp.toFixed(1)}%` : "still too high"} at its cast and needs to be under ${BF_THRESHOLD}%. A raid DPS check, so nobody in particular is named.`,
      bfCast.timestamp, BF_CAST, "Blind Faith"));
  }
  const firstMech = raids.sort((a, b) => a.timestamp - b.timestamp)[0];
  if (firstMech) errors.push(firstMech);

  // Generic cutoffs, only the earliest and only before the mechanic Raid.
  if (!passed) {
    const generic: PullError[] = [];
    const calledList = p5Deaths.filter((d) => called.has(d)).sort((a, b) => a.timestamp - b.timestamp);
    if (calledList.length >= CALLED_WIPE_COUNT) {
      generic.push(raidMarker(TOP5_CALLED_WIPE_RULE_ID, "Wipe Called",
        `${calledList.length} players died with no killing blow (${names(calledList.map((d) => d.player))}): the wipe was called and the raid reset into the deathwall.`,
        calledList[0].timestamp - DEATH_EVENT_LAG_MS, 0, "Deaths"));
    }
    const outAt = (t: number) => players.filter((p) => !life.alive(p, t));
    const collapseT = life.outIntervals.map((w) => w.start).filter((t) => t >= start && t <= end).sort((a, b) => a - b)
      .find((t) => outAt(t).length >= COLLAPSE_DEAD_COUNT);
    if (collapseT !== undefined) {
      const who = outAt(collapseT).map((p) => p.name);
      generic.push(raidMarker(TOP5_COLLAPSE_RULE_ID, "Party Collapse",
        `${who.length} players were dead at once (${joinNames(who)}): too few left for Run: Dynamis's chains. Treated as the cutoff point.`,
        collapseT + DEATH_EVENT_LAG_MS, 0, "Deaths"));
    }
    const marker = generic.sort((a, b) => a.timestamp - b.timestamp)[0];
    if (marker && marker.timestamp < (firstMech?.timestamp ?? Infinity)) errors.push(marker);
  }
  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
