// lib/mechanics/ffxiv/fru/fatebreaker.ts
//
// Futures Rewritten Phase 1 (Fatebreaker) per-pull rules. Entry point:
// detectFatebreakerErrors. Self-gates on the opening casts and stops at the
// first Phase 2 cast; the fallback model (fallback.ts MODULE_PHASES) covers
// the later phases and stays out of P1.
//
// -- VERIFIED AGAINST LOGS (2026-10-12) --
// Three reports, 197 pulls, 18 P1 clears (no full kill). Cited as A12 +1:16
// (report letter, pull number in the folder, m:ss from the pull start):
//   A = FbxL2QZhG7df3Ry4 (the user's static, early prog, 70 pulls, 9 P1
//       clears: A20 A36 A37 A48 A51 A62 A68 A69 A70; VODs for every pull),
//   B = jvpZ2afn6hWykxKP (63 pulls, never cleared P1; mostly Utopian Sky),
//   C = T4gbMqNnBfYP7tzC (64 pulls, 9 P1 clears: C18 C27 C28 C31 C34 C51
//       C53 C58 C59).
// Clock (every pull within ~0.5s): Cyclonic Break +0:14.5 (cones +0:15,
// repeats +0:17/+0:19/+0:21, element +0:17), Powder Mark Trail +0:25, Burn
// Mark +0:41, Utopian Sky cast +0:35.6 (Blasting Zone and Sinbound +0:50.5),
// second Cyclonic Break +0:57 (element +0:59), Fated Burn Mark/Prey +1:05,
// lightning Burnt Strike + Burnout +1:06-1:08, fire Burnt Strike +1:12 +
// Blastburn knockback +1:13.3, Brightfire +1:16, tether Sinsmoke +1:19.5,
// Burnished Glory +1:27, Fall of Faith Prey +1:33-1:41 and hits +1:47,
// +1:50, +1:52.7, +1:55, Burnished Glory +2:02, Powder Mark +2:11, boss
// Burnt Strike +2:22.5 (Burnout or Blastburn +2:24), towers + Burn Mark
// +2:26.5, third Burnished Glory (40128) cast +2:41.6. P1 clears show the
// first Usurper of Frost cast at +2:49-2:58.
// Log IDs (cactbot's candidates were right wherever checked):
// - Cyclonic Break casts 40144 fire / 40148 lightning (boss), 40329/40330
//   (image, second set; often not logged). Initial cones 40145, one cast per
//   player with that player as target; follow-ups 40146 (Damage Down).
//   Elements: Sinsmoke 40147 (four pairs), Sinsmite 40149 (eight spreads).
//   Pairs in clean resolutions: MT/R1, OT/R2, H1/M1, H2/M2 (B, C).
// - Powder Mark Trail 40168 (cast target = holder, debuff 1004166 ~16s),
//   Burn Mark 40169 on the holder + nearest at expiry (two instances).
// - Utopian Sky 40154 fire / 40155 lightning; Blasting Zone 40157, Sinbound
//   Fire III 40159 (4 + 4), Sinbound Thunder III 40160 (8 spreads). The fog
//   clones' casts are logged only in some pulls (Concealed 1001621).
// - Turn of the Heavens 40150/40151: Brightfire 40152/40153 (halos), Burnt
//   Strike 40163 + Burnout 40164 (lightning), Burnt Strike 40161 + Blastburn
//   40162 (fire; no damage, a knockback). All of them give Damage Down.
// - Utopian tethers: Prey 1001051 + Fated Burn Mark 1004165 on two players;
//   their Sinsmoke 40167 stacks (4 + 4) at +1:19.5; a short stack gives
//   Mark of Mortality 1004372 to its members. A holder's death sets off
//   Fated Burn Mark 40331 ~0.7s later: Damage Down to everyone near
//   (27 pulls ended there).
// - Fall of Faith 40137/40140: Prey order = tether order, Floating Fetters
//   1002304 on the carrier ~4s before its hit (Solemn Charge 40138/40141/
//   40166). Fire = Sinblaze 40156 on four (fewer: Mark of Mortality);
//   lightning = Sinsmite 40142 on the carrier + Bow Shock 40143 on three.
//   Every clean resolution hits exactly its group's four, groups alternate
//   1/3 and 2/4 (all three groups).
// - Towers: Burnt Strike 40129 lightning / 40133 fire through the middle;
//   Explosion ID = soakers needed: lightning 40131/40122/40123/40124, fire
//   40135/40125/40126/40127 = 1/2/3/4. A short tower casts Unmitigated
//   Explosion 40132/40136 at its spot (Damage Down raid-wide). Towers sit at
//   y~9082 (N), 10000 (middle), 10918 (S) on x 8400-8689 (W) or 11311-11600
//   (E). Clean fills match NAUR (H1 N, R2 middle, H2 S, then M1/M2/R1) in C;
//   in A the middle anchor varies (R2 early, R1 later) and M1 fills first.
// - Third Burnished Glory 40128 is cast in clears too (boss <1% HP, A20
//   +2:41.5); only pulls that never reached P2 died to it (12).
// - Enemy auto-attacks: 40116.
// Failure findings:
// - Initial cones/spreads/stacks retarget onto the living after a death
//   (eight cones on one survivor, C21 +0:57): those resolutions are fallout.
// - The top first deaths in A and B: Blasting Zone (17), Burnt Strike
//   (11), Sinsmite overlaps (11); in A also Bow Shock double hits in Fall
//   of Faith (7).
// - Powder Mark: the holder killed by an auto ~5s after the buster (9
//   pulls; in most the Provoke/Shirk came 1-2s before the buster); killed
//   by the buster itself (14). Burn Mark: both explosions on one tank (5
//   pulls), on a non-tank (A17, A58, C38).
// - Deathwall: no-killing-blow deaths 2.8-3.5s after Blastburn are knocks
//   (44, up to four at once: C33 +1:13); 4.1-8.5s after the player's own
//   Damage Down are voluntary resets (A40, A42, A53, A57, A66 ...); a few
//   with a big hit just before are FFLogs dropping the killing blow (A19).
// - Pulls end fast: 4 dead ended every pull within 14s (C47 the worst).
// Cutoffs (first Raid error): collapse 76, called wipe 51, Fated Burn Mark
// 27, tower 13, enrage 12; the 18 P1 clears have none.
//
// -- RULES IMPLEMENTED --
// ffxiv-fb-avoidable (Major on Damage Down or death, else Minor): Cyclonic
//   Break follow-ups, Blasting Zone, Brightfire, Burnt Strike, Burnout.
// ffxiv-fb-overlap (Major if someone involved died, else Minor): with all
//   eight alive, a player hit by two or more initial cones, Sinsmite or
//   Sinbound Thunder III spreads; everyone sharing those instances named.
// ffxiv-fb-stack: with all eight alive, a player in two Sinsmoke / Sinbound
//   Fire III stacks, or in none (not if just hit by an avoidable).
// ffxiv-fb-powder-swap (Major, both tanks): Powder Mark holder killed by an
//   auto-attack. ffxiv-fb-powder-death (Major): a tank killed by the Powder
//   Mark buster or a single expiry Burn Mark.
// ffxiv-fb-burn-mark: both expiry explosions on one tank (both tanks named),
//   or one on a non-tank (that player and the other tank).
// ffxiv-fb-fated-burn-mark (Raid): a Fated Burn Mark explosion hitting 3+
//   others; the holder's death is flagged by what killed them.
// ffxiv-fb-tether-stack (all eight alive): both stacks overlapping (the two
//   tethered players), a player in both, a player in neither when a stack
//   was short, else a player-less Minor for an uneven split.
// ffxiv-fb-fall-of-faith: each resolution's group is read from the other
//   resolution on its side when that was clean; with the group alive: a
//   double hit, other-group players in it (3+: the carrier, by Floating
//   Fetters), a short Sinblaze's missing members (player-less if unknown).
// ffxiv-fb-tower (Raid + Major): a short tower; with the six non-tanks
//   alive, a non-tank in no tower, else the extras in an overfilled one.
//   Skipped with 3+ non-tanks dead.
// ffxiv-fb-knockback (Major): knocked into the wall by Blastburn, or walked
//   into it mid-pull (not a Damage Down reset, not a dropped killing blow).
// ffxiv-fb-enrage / -called-wipe (3+ no-killing-blow deaths within 10s or
//   within 12s of the end, knocks excluded) / -collapse (4 dead, pull over
//   within 20s): Raid, only the earliest, only before any mechanic Raid.
// Exposure: -powder-swap and -powder-death are targeted (both tanks at each
// Powder Mark); everything else counts everyone.
// The Damage Down causes are excluded from ffxiv-damage-down (error-rules.ts).
//
// Not built (questions for VOD review): who left their spot in an overlap
// (clock spots from positions), which tank missed the swap, the tether
// stacks' and towers' assigned members (groups differ per report), Bleeding
// / Burnished Glory deaths (healing), tank mitigation beyond deaths.
//
// -- GUIDE-DERIVED MODEL: FATEBREAKER (FRU PHASE 1) --
// Futures Rewritten (Ultimate), released patch 7.11; checked 2026-10-09.
// Research stage, before any report was analyzed: the log signals below are
// the researcher's hypotheses. VERIFIED AGAINST LOGS above wins.
// User baseline: WTFDIG NAUR. LPDU/MUR alternatives are recorded below.
// Five modules share ONE pull; wipes restart P1, with no phase checkpoint.
// usurper-of-frost.ts owns P2 and its crystal intermission.
//
// -- SOURCES --
// [W] Selected NAUR board; phase-one role diagrams inspected:
//     https://wtfdig.info/ultimates/fru#naur
// [N] Tvnariea Reksane's original mechanic explanation:
//     https://naurffxiv.com/ultimate/fru/guide/p1
// [NS] Original NAUR slides, including Role ONLY alternative:
//      https://docs.google.com/presentation/d/1Pm3BkfrJqjcm7688RrNDdh4oYuYS_VmHr6ALqjbZInE/htmlpresent
// [L] LPDU's own priorities and linked full-phase plan, both inspected:
//     https://lpdu.net/fru/p1/
//     https://raidplan.io/plan/VDACL8AfJQ485AxD
// [M] MUR's own guide and original assignment diagrams:
//     https://materiaraiding.com/ultimate/fru
//     https://raidplan.io/plan/WlRr-qtrUTEPiaJZ
// [MF] https://raidplan.io/plan/TOsL-pQk0vGJXBS7
// [MT] https://raidplan.io/plan/Gfbp6n3NgBHgNqI1
// [I] Tor's original phase-one explanation, 2024-11-28:
//     https://www.icy-veins.com/ffxiv/futures-rewritten-ultimate-guide-for-phase-1-fatebreaker
// [C] Cactbot's original timeline/action annotations, candidate IDs only:
//     https://github.com/OverlayPlugin/cactbot/blob/main/ui/raidboss/data/07-dt/ultimate/futures_rewritten.txt
// [K] Penalty explanation, not the unfinished Kitten phase-one pages:
//     https://kitten-erp-guides.moe/ultimates/fru
// No confirmed mechanic-changing hotfix identified. Archived strats and
// release guides can differ from current W/NS; current diagrams win for
// assignments, while actual logs must establish mechanics and timings.
//
// -- SHARED SEVERITY, STATUS AND STRATEGY CONTRACT --
// Damage Down and Mark of Mortality are severe output penalties; a proven
// player's mistake producing either is Major even if everyone survives.
// Major names the root cause, not all penalized helpers/victims. Healable
// avoidable damage without those penalties is Minor until death/pull loss.
// Raid marks first inevitable loss and may be player-less. A called reset,
// voluntary death after Damage Down, or later missing soak can be fallout.
// The regional preset is a bundle, not a mechanic property. A group can
// mix NAUR Utopia, LPDU Fall and MUR towers; choosing that is not an error.
// G1 = MT/H1/M1/R1, G2 = OT/H2/M2/R2. R1 physical ranged, R2 caster;
// LPDU labels H1 regen/H2 shield. MUR ST=OT, D1/D2=M1/M2, D3/D4=R1/R2.
// Standard modified clocks: MT N, OT E, H1 W, H2 S, M1 SW, M2 SE,
// R1 NW, R2 NE. Utopia swaps OT/R2 clocks to put the two tanks adjacent.
// Coordinates in hits belong to victims. Clones, halo element, tether
// endpoints/length and animation-only markers may be absent from captures.
// No geometric tolerance or damage threshold has been measured in a log.
// Named statuses: Powder Mark Trail, Physical/Magic Vulnerability Up,
// Prey, Fated Burn Mark, Floating Fetters, Bleeding, Damage Down,
// Mark of Mortality. Game status IDs and FFLogs mappings remain unknown.
//
// -- PHASE SHAPE AND CLOCK --
// Boss HP depletion advances to P2; enrage otherwise. Circular deathwall.
// One untargetable trio, then uptime tethers/towers. Clones and halos are
// temporary mechanic actors, not adds to kill; no energy/resource check.
// Approximate damage anchors from C, mm:ss from engage:
//   00:15 opening cones; 00:25 Powder; 00:35 Utopia; 00:41 Burn Mark;
//   00:50 fog resolves; 00:57 second cones; 01:19 tether stacks;
//   01:26 Glory; 01:45-53 four Fall hits; 02:01 Glory;
//   02:10 Powder; 02:25 towers; 02:27 Burn Mark; 02:40 enrage.
// Cast starts precede damage. Phase advance can truncate the final cast;
// a later phase's abilities, not a universal absolute offset, identify it.
//
// -- CYCLONIC BREAK, TWICE [I, NS] --
// What happens: eight narrow initial cone baits, then three avoidable
// follow-up sets. First repeat occupies the original lanes; later sets
// rotate into adjacent gaps. Fire gives four Sinsmoke two-player stacks;
// lightning gives eight Sinsmite spreads at the first repeat. Initial
// cones give Physical Vulnerability Up; elemental hits give magic vuln.
// Correct play: modified clocks centered on boss. Supports move CCW,
// DPS CW to pair/gap, with ranged outside for lightning; dodge back after
// the repeated cone. Partner pairs MT/R1, OT/R2, H1/M1, H2/M2.
// Failure: malformed initial bait -> LOG SIGNAL: doubled initial cones
//   or shifted repeat clipping neighbors; FAULT: misplaced bait if source
//   ray and own position establish it; CONSEQUENCE: Major on death/penalty.
// Failure: repeat hit -> LOG SIGNAL: follow-up Cyclonic Break damage and
//   Damage Down; FAULT: mover unless a bad initial ray caused the clip;
//   CONSEQUENCE: Major when attributable; otherwise player-less Minor/Raid.
// Failure: wrong pair/spread overlap -> LOG SIGNAL: doubled elemental
//   hits under magic vuln, small stack penalty/death; FAULT: displaced
//   carrier/helper with assignment evidence; CONSEQUENCE: Minor, escalates.
// Removal: short vulnerabilities expire; dead DPS can redirect fire marks
// to supports [N], making later overlaps fallout rather than a new error.
// Not errors: one initial cone per player, own spread or correct stack.
// Candidate C action IDs: cast anchors 40144/40148; damage initial 40145,
// repeat 40146; elemental damage 40147/40149. Not verified FFLogs mappings.
//
// -- POWDER MARK TRAIL, TWICE [I, N] --
// What happens: single-target physical buster, ~14s physical vuln and
// ~16s Powder Mark. Expiry OR marked tank death produces Burn Mark AoEs
// on that tank and its nearest ally. First overlaps fog, second towers.
// Correct play: swap enmity after initial hit; other tank is nearest at
// expiry, with separation so explosions do not overlap. In fog tanks
// move one wall-notch toward each other; at towers both use opposite side
// from the six soakers. Initial buster + later explosion need mitigation.
// Failure: no swap -> LOG SIGNAL: auto hit/death under physical vuln;
//   FAULT: tank responsible for established swap, otherwise unknown;
//   CONSEQUENCE: Major, Raid if the death explosion makes trio impossible.
// Failure: wrong nearest/overlap -> LOG SIGNAL: Burn Mark on non-tank or
//   multiple explosions on one player; FAULT: nearest-bait controller if
//   positions establish it, not automatic victim blame; CONSEQUENCE:
//   Minor, escalates; Raid on terminal multi-kill.
// Removal: expiry is intended resolution; death can resolve early and
// change the nearest target. A remove event alone cannot prove success.
// Not errors: initial buster, mitigated tank explosion, ordinary autos.
// Candidate C damage 40168 Powder, 40169 Burn Mark. C also has a conflicting
// "tower failure" annotation for Burn Mark; penalty mapping is unresolved.
//
// -- UTOPIAN SKY: FOG, ELEMENT AND HALOS [L, M, NS] --
// What happens: fog hides eight edge clones; three active Blasting Zone
// lines leave opposite safe wedges. Fire Sinbound Fire III LP stacks or
// lightning Sinbound Thunder III spreads resolve there. Second Cyclonic
// follows. Turn of the Heavens makes four fire/four lightning halos;
// matching element has larger Brightfire circles. Dodge W-E lightning
// Burnt Strike then expanded Burnout, followed by N-S fire line and its
// unresistable Blastburn knockback to the safe halo side.
// Correct play: check raised weapon at own clock and opposite player's
// signal; raised side/opposite move in. G1 chooses N through SW safe
// wedge, G2 NE through S. Fire stacks; lightning spreads within wedge.
// Use gaps between opposite-element halos, never stand on a halo itself.
// NAUR role distribution: supports north / DPS south. Default fixed
// tethers: short (safe-side source) south, long north; two DPS marked ->
// MT flex south, two supports marked -> M1 flex north. This preserves
// two four-player Bound of Faith/Sinsmoke stacks despite role imbalance.
// NAUR Role ONLY instead swaps highest-priority marked role with MT/M1;
// no short/long constraint. LPDU keeps G1 north/G2 south and tanks balance
// tethers. MUR uses G1 north/G2 south, marked swap priority T/M/R/H and
// opposite-group tank flex; those are valid different helper assignments.
// Failure: wrong fog/halo lane -> LOG SIGNAL: Blasting Zone, Brightfire,
//   Burnout damage/penalty/death; FAULT: mover unless callout unavailable;
//   CONSEQUENCE: Major on Damage Down/death, otherwise Minor.
// Failure: unequal tether stacks -> LOG SIGNAL: fewer than four living
//   Sinsmoke recipients plus Mark of Mortality; FAULT: assigned missing
//   helper/wrong tether controller if proven; CONSEQUENCE: Major or Raid
//   when unrecoverable. A different valid helper map is not failure.
// Failure: tether holder dies -> LOG SIGNAL: Fated Burn Mark death-time
//   removal/explosion or redirected stack; FAULT: preceding lethal cause;
//   CONSEQUENCE: Raid only if subsequent mechanic becomes impossible.
// Removal: Prey/Floating Fetters resolve with charge; Fated Burn Mark
// explicitly threatens death-triggered explosion. Damage ID/scope unknown.
// Not errors: forced lift/knockback, four-player tether stack, fog downtime.
//
// -- FALL OF FAITH: FOUR ORDERED TETHERS [N, MF, L] --
// What happens: boss then NW/N/NE clones mark four distinct players.
// Each independently rolls fire/lightning. Fire Sinblaze is carrier plus
// a 90-degree cone toward nearest helper, requiring four total players;
// lightning Sinsmite/Bow Shock is carrier plus three 120-degree cones.
// ~4s magic vuln prevents sharing consecutive hits ~2.5-3s apart.
// Correct play: groups alternate 1/3 and 2/4; current carrier sits inside
// three helpers. Fire helpers stack outward; lightning helpers spread as
// a T, other tether holder middle bait. Carriers exchange front/back when
// their second tether resolves. Four of each color is possible and valid.
// NAUR: 1/3 W, 2/4 E; conga W->E R1,H1,M1,MT,OT,M2,H2,R2. Remaining
// two fillers on each side: outer one north bait, inner one south bait.
// Alternate NAUR role conga H1,H2,MT,OT,M1,M2,R1,R2 is also documented.
// LPDU: 1/3 N, 2/4 S; untethered conga N->S H1,H2,MT,OT,M1,M2,R1,R2
// on west edge. First two fillers N, remaining S. Facing boss, northern
// filler takes left lightning bait, southern right. L's numbered fillers
// are not tether application order; both plans still alternate hits.
// MUR: 1/3 W, 2/4 E, conga H1,R1,M1,MT,OT,M2,R2,H2. Outer fillers N,
// inner S. Same geometry as NAUR, but different healer/ranged priorities.
// Failure: double lightning/consecutive hit -> LOG SIGNAL: multiple cone
//   hits or next tether hit under magic vuln; FAULT: wrong bait/carrier
//   position if established; CONSEQUENCE: Major on death/penalty.
// Failure: undersoaked fire -> LOG SIGNAL: Mark of Mortality after
//   Sinblaze; FAULT: missing assigned helper with living/window evidence;
//   CONSEQUENCE: Major, Raid if output penalty/remaining deaths lose pull.
// Removal: Prey resolves into charge/short Floating Fetters. Death may
// alter charge/closest-helper targeting; exact chain effects unverified.
// Not errors: four intended carrier resolutions, appropriate helper hits.
// Candidate C damage: Sinblaze 40156; Bow Shock helper cones 40143;
// Sinsmite carrier 40142. Same-name opening Sinsmite has a different ID.
//
// -- BURNT STRIKE TOWERS AND BURNISHED GLORY [MT, I] --
// What happens: three N/mid/S towers on E or W, six total required soaks:
// permutations of 1/1/4, 1/2/3, 2/2/2. N-S line followed by wider
// lightning cleave or fire knockback. Tower Explosion and delayed tank
// Burn Mark nearly coincide. Failed tower -> raid damage + Damage Down.
// Correct play: non-tanks meet individual tower count; tanks opposite.
// NAUR/LPDU anchors H1 N, R2 middle, H2 S; M1/M2/R1 fill missing spaces
// north-to-south. Lightning stays outside expanded line; fire rides into
// tower. MUR home pairs H1/M1 N, R2/M2 middle, H2/R1 S; singleton's DPS
// filters down, wrapping to an unsatisfied tower as needed. Example 1/2/3:
// MUR middle R2+M2, south H2+R1+M1; NAUR middle R2+M1, south H2+M2+R1.
// Failure: missing/wrong count -> LOG SIGNAL: tower penalty and Damage
//   Down, with insufficient living Explosion recipients; FAULT: assigned
//   missing player if tower demand known; CONSEQUENCE: Major or Raid.
// Failure: line/wall clip -> LOG SIGNAL: Burnt Strike/Burnout/deathwall;
//   FAULT: mover or bad knockback starting spot if proven; CONSEQUENCE:
//   Minor, escalates. Tank Burn Mark victims can be earlier bait fallout.
// Not errors: six tower soaks, fire knockback and separated tank busters.
// Burnished Glory occurs twice normally with heavy Bleeding. Third long
// cast is hard enrage, distinct from those two intended healing checks.
// Boss defeat/1 HP transition prevents enrage. Failed completion is Raid.
//
// -- STRATEGY OBSERVABILITY AND OPEN QUESTIONS --
// 1. Do successful Fall damage positions distinguish W/E vs N/S, while
//    untethered role positions establish NAUR/MUR/role-conga priorities?
//    Some pulls have identical allocations under multiple presets: can
//    Strategy retain compatible candidates/unknown rather than guess?
// 2. Can successful 1/2/3 tower examples distinguish serial fill from MUR
//    home pairs? Are demands/object positions logged? 2/2/2 is ambiguous.
// 3. Does Utopia expose clone endpoints for short/long tether choice, or
//    only Prey/stack recipients? Can role vs LP grouping be established
//    without labeling a failed pull's mistaken grouping as its strategy?
// 4. Verify all action/status/penalty IDs and distinct Sinsmoke sizes;
//    death-triggered Fated/Powder explosions, redirected targets, tower
//    penalty names, Mark of Mortality stack lethality, Damage Down duration.
// 5. What geometry/timing tolerances fit clean pulls? Do fog source casts
//    expose facing? Which victims were clipped by a controller rather than
//    mispositioned? Separate tethers, helper cones and charge damage.
// 6. Confirm HP advance, no checkpoint, actual phase clock/early kills and
//    deliberate reset signatures. A selected profile is evidence about
//    assignments, not permission to flag every off-plan but valid solution.

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import type { ReportedOccurrence } from "@/lib/mechanics/occurrences";
import { kFmt, sec, joinNames, playerError, playerlessMinor, raidMarker, rezzedAt, clusterByGap } from "@/lib/mechanics/wow/common";

export const FB_AVOIDABLE_RULE_ID    = "ffxiv-fb-avoidable";
export const FB_OVERLAP_RULE_ID      = "ffxiv-fb-overlap";
export const FB_STACK_RULE_ID        = "ffxiv-fb-stack";
export const FB_POWDER_SWAP_RULE_ID  = "ffxiv-fb-powder-swap";
export const FB_POWDER_DEATH_RULE_ID = "ffxiv-fb-powder-death";
export const FB_BURN_MARK_RULE_ID    = "ffxiv-fb-burn-mark";
export const FB_FATED_RULE_ID        = "ffxiv-fb-fated-burn-mark";
export const FB_TETHER_STACK_RULE_ID = "ffxiv-fb-tether-stack";
export const FB_FALL_RULE_ID         = "ffxiv-fb-fall-of-faith";
export const FB_TOWER_RULE_ID        = "ffxiv-fb-tower";
export const FB_KNOCKBACK_RULE_ID    = "ffxiv-fb-knockback";
export const FB_ENRAGE_RULE_ID       = "ffxiv-fb-enrage";
export const FB_CALLED_WIPE_RULE_ID  = "ffxiv-fb-called-wipe";
export const FB_COLLAPSE_RULE_ID     = "ffxiv-fb-collapse";

// ── log IDs (VERIFIED above) ────────────────────────────────────────────────

const SIGNATURE = [40144, 40148, 40168];      // opening Cyclonic Break (fire / lightning), Powder Mark Trail
const DAMAGE_DOWN = 1002911;
const MARK_OF_MORTALITY = 1004372;
const FATED_BURN_MARK = 1004165;
const POWDER_MARK = 1004166;
const FLOATING_FETTERS = 1002304;
const CYCLONIC_CONE = 40145;
const SINSMITE_SPREAD = 40149;
const SINSMOKE_PAIR = 40147;
const THUNDER_SPREAD = 40160;
const FIRE_STACK = 40159;
const TETHER_STACK = 40167;
const FATED_EXPLOSION = 40331;
const POWDER = 40168;
const BURN_MARK = 40169;
const AUTO = 40116;
const SINBLAZE = 40156;
const FALL_CARRIER = 40142;
const BOW_SHOCK = 40143;
const ENRAGE = 40128;
const BLASTBURN = [40162, 40130];
const UNMITIGATED = [40132, 40136];
// Tower Explosion IDs by required soakers (lightning set / fire set).
const TOWER_NEED: Record<number, number> = {
  40131: 1, 40122: 2, 40123: 3, 40124: 4,
  40135: 1, 40125: 2, 40126: 3, 40127: 4,
};
// The P1 actors; any other caster is Phase 2 (usurper-of-frost.ts).
const P1_ACTOR = /^(Fatebreaker|Fatebreaker's image|halo of (flame|levin))$/;

type Avoidable = { name: string; hit: string; why: string };
const LINE_WHY = "Burnt Strike is a line through the arena; stand clear of the clone's line.";
const BOSS_LINE_WHY = "The boss's Burnt Strike is a line through the middle at the towers; stay off it.";
const BURNOUT_WHY = "After a lightning Burnt Strike, Burnout widens the line; get well clear of it.";
const HALO_WHY = "Each halo explodes under itself; stand in a gap between halos of opposite elements, never on one.";
const AVOIDABLE: Record<number, Avoidable> = {
  40146: { name: "Cyclonic Break", hit: "Hit by a Cyclonic Break follow-up cone",
    why: "The cones fire three more times after the first set: the first repeat comes down on the same lines, the next two rotate into the gaps. Step into the gap after the first cones, then back out." },
  40157: { name: "Blasting Zone", hit: "Hit by Blasting Zone",
    why: "Three of the fog clones fire Blasting Zone lines across the arena; read the raised weapons and go to the open wedge." },
  40152: { name: "Brightfire", hit: "Stood on a halo (Brightfire)", why: HALO_WHY },
  40153: { name: "Brightfire", hit: "Stood on a halo (Brightfire)", why: HALO_WHY },
  40161: { name: "Burnt Strike", hit: "Hit by Burnt Strike", why: LINE_WHY },
  40163: { name: "Burnt Strike", hit: "Hit by Burnt Strike", why: LINE_WHY },
  40129: { name: "Burnt Strike", hit: "Hit by Burnt Strike", why: BOSS_LINE_WHY },
  40133: { name: "Burnt Strike", hit: "Hit by Burnt Strike", why: BOSS_LINE_WHY },
  40164: { name: "Burnout", hit: "Hit by Burnout", why: BURNOUT_WHY },
  40134: { name: "Burnout", hit: "Hit by Burnout", why: BURNOUT_WHY },
};

// FFLogs logs the death event ~2.0s after the fatal hit (README).
const DEATH_EVENT_LAG_MS = 2000;
const DIED_FROM_HIT_MS   = 3000;
// Hits this large are FFLogs' unpaired previews of lethal hits: counted as
// hits, never compared as amounts.
const PREVIEW_AMOUNT     = 1_500_000;
const EPISODE_MS         = 3000;
// A no-killing-blow death this long after a Blastburn cast was knocked into
// the deathwall: 2.8-3.5s in all 32 such deaths (A12 +1:16.4 ... C20 +2:27.5).
const KNOCKBACK_MIN_MS   = 2000;
const KNOCKBACK_MAX_MS   = 4500;
// A no-killing-blow death this soon after the player's own Damage Down is a
// voluntary reset into the wall (4.1-8.5s in every case, A40 ... C25): the
// Damage Down's cause is the error, not the death.
const DD_RESET_MS        = 15_000;
const CALLED_WIPE_END_MS = 12_000;
const CALLED_WIPE_COUNT  = 3;
const CALLED_WIPE_WINDOW = 10_000;
// 4 dead at once ended every pull within 14s (report C: worst 14s, C47).
const COLLAPSE_DEAD_COUNT = 4;
const COLLAPSE_END_MS     = 20_000;
// A Fated Burn Mark explosion that hit this many players besides its holder
// hands the whole raid Damage Down: the pull is lost.
const FATED_RAID_HITS    = 3;
// Fall of Faith: hits closer than this are one tether resolution (they come
// ~2.5s apart).
const FALL_GAP_MS        = 1200;
// Floating Fetters lands on the Fall of Faith carrier ~4s before its hit.
const FETTERS_BEFORE_MS  = [2500, 5500];
// This many players from the other group in one Fall of Faith resolution:
// the carrier brought the tether to the wrong group.
const FALL_WRONG_SIDE    = 3;
// This many non-tanks dead before the towers: no tower error (A10, A34).
const TOWER_OVER_DEAD    = 3;
// A no-killing-blow death with a damage hit this soon before its event died
// to that hit (FFLogs dropped the killing blow: A19 +1:49.5 after Sinblaze).
const SILENT_HIT_MS      = 3500;

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
function hitsOf(players: PlayerInfo[], life: Life, ids: number | number[], until: number): Hit[] {
  const set = new Set(Array.isArray(ids) ? ids : [ids]);
  const out: Hit[] = [];
  for (const p of players) {
    for (const e of p.damageTaken) {
      if (!set.has(e.abilityId) || e.timestamp > until || e.healthBefore === 0) continue;
      if (life.hitAlive(p, e.timestamp)) out.push({ p, e });
    }
  }
  return out.sort((a, b) => a.e.timestamp - b.e.timestamp);
}

const castsOf = (casts: EnemyEvent[], ids: number | number[], until: number) => {
  const set = new Set(Array.isArray(ids) ? ids : [ids]);
  return casts.filter((c) => set.has(c.abilityId) && c.timestamp <= until).sort((a, b) => a.timestamp - b.timestamp);
};

function gotAura(p: PlayerInfo, id: number, t: number, ms = 1500): boolean {
  return p.debuffs.some((e) => e.abilityId === id && e.debuffStatus === "applied" && Math.abs(e.timestamp - t) <= ms);
}

const uniq = <T,>(xs: T[]) => [...new Set(xs)];
const namesOf = (ps: PlayerInfo[]) => joinNames(uniq(ps).map((p) => p.name));
const isTank = (p: PlayerInfo) => p.role === "Tank";
const realAmount = (e: PlayerEvent) => ((e.amount ?? 0) >= PREVIEW_AMOUNT ? 0 : e.amount ?? 0);
const allAlive = (players: PlayerInfo[], life: Life, t: number) => players.every((p) => life.alive(p, t));
const byPlayer = (hits: Hit[]) => {
  const m = new Map<PlayerInfo, PlayerEvent[]>();
  for (const h of hits) m.set(h.p, [...(m.get(h.p) ?? []), h.e]);
  return m;
};

/** Took a listed avoidable hit within 2s of `t`: already flagged for it. */
function inAvoidable(p: PlayerInfo, t: number): boolean {
  return p.damageTaken.some((e) => AVOIDABLE[e.abilityId] && Math.abs(e.timestamp - t) <= 2000 && e.healthBefore !== 0);
}

/** When Phase 1 ends: the first cast by a Phase 2 actor (Infinity on a P1 wipe). */
function phase1End(casts: EnemyEvent[]): number {
  return casts.filter((c) => !P1_ACTOR.test(c.actorName)).reduce((m, c) => Math.min(m, c.timestamp), Infinity);
}

// ── plain avoidable hits ────────────────────────────────────────────────────

function detectAvoidable(players: PlayerInfo[], life: Life, end: number): PullError[] {
  const errors: PullError[] = [];
  const ids = Object.keys(AVOIDABLE).map(Number);
  for (const p of players) {
    const hits = p.damageTaken.filter((e) => ids.includes(e.abilityId) && e.timestamp <= end && e.healthBefore !== 0 && life.hitAlive(p, e.timestamp) &&
      (realAmount(e) > 0 || (e.amount ?? 0) >= PREVIEW_AMOUNT || gotAura(p, DAMAGE_DOWN, e.timestamp)));
    for (const g of clusterByGap(hits, (e) => e.timestamp, EPISODE_MS)) {
      const kinds = uniq(g.map((e) => AVOIDABLE[e.abilityId]));
      const total = g.reduce((s, e) => s + realAmount(e), 0);
      const death = life.diedFrom(p, g[g.length - 1].timestamp);
      const dd = g.some((e) => gotAura(p, DAMAGE_DOWN, e.timestamp));
      const hit = kinds.map((k, i) => (i === 0 ? k.hit : k.hit.charAt(0).toLowerCase() + k.hit.slice(1))).join(", and ");
      const outcome = [dd ? "got Damage Down" : "", death ? "died" : ""].filter(Boolean).join(" and ");
      errors.push(playerError(p, {
        ruleId: FB_AVOIDABLE_RULE_ID, severity: dd || death ? "Major" : "Minor", name: `Hit by ${uniq(kinds.map((k) => k.name)).join(" / ")}`,
        description: `${hit} (${g.length > 1 ? `${g.length} hits, ` : ""}${kFmt(total)}).${outcome ? ` They ${outcome}.` : ""} ${uniq(kinds.map((k) => k.why)).join(" ")}`,
        timestamp: g[0].timestamp, abilityId: g[0].abilityId, abilityName: g[0].abilityName,
      }));
    }
  }
  return errors;
}

// ── one bait per player: cones and spreads ──────────────────────────────────

type Personal = { ids: number[]; name: string; what: string; why: string };
const PERSONAL: Personal[] = [
  { ids: [CYCLONIC_CONE], name: "Cyclonic Break", what: "initial cone",
    why: "Each player baits one narrow Cyclonic Break cone from their own clock spot; two players on one line take both cones (Physical Vulnerability Up)." },
  { ids: [SINSMITE_SPREAD], name: "Sinsmite", what: "spread",
    why: "Lightning Cyclonic Break puts a Sinsmite spread on all eight: move into your own gap (ranged out), not onto your fire partner." },
  { ids: [THUNDER_SPREAD], name: "Sinbound Thunder III", what: "spread",
    why: "Lightning Utopian Sky gives everyone a Sinbound Thunder III spread: spread out inside the safe wedge." },
];

/**
 * With all eight alive, a player hit by two or more instances of a personal
 * bait stood on someone else's. Every player involved is named (README
 * philosophy 3): the log can't tell who left their spot. With anyone dead
 * the baits retarget onto the living (eight cones on one survivor, C21), so
 * those resolutions are fallout and skipped.
 */
function detectPersonalOverlaps(players: PlayerInfo[], life: Life, end: number): PullError[] {
  const errors: PullError[] = [];
  for (const fam of PERSONAL) {
    for (const res of clusterByGap(hitsOf(players, life, fam.ids, end), (h) => h.e.timestamp, 1500)) {
      const t0 = res[0].e.timestamp;
      if (!allAlive(players, life, t0 - 500)) continue;
      const doubled = [...byPlayer(res)].filter(([, es]) => es.length > 1);
      if (!doubled.length) continue;
      const killed = doubled.filter(([p, es]) => life.diedFrom(p, es[es.length - 1].timestamp)).map(([p]) => p);
      const instKey = (e: PlayerEvent) => `${e.source}#${e.sourceInstance}`;
      for (const [p, es] of doubled) {
        // Who shared an instance with them.
        const mine = new Set(es.map(instKey));
        const others = uniq(res.filter((h) => h.p !== p && mine.has(instKey(h.e))).map((h) => h.p));
        const death = killed.includes(p);
        errors.push(playerError(p, {
          ruleId: FB_OVERLAP_RULE_ID, severity: killed.length ? "Major" : "Minor", name: `${fam.name} Overlap`,
          description: `Took ${es.length} ${fam.name} ${fam.what}s (${kFmt(es.reduce((s, e) => s + realAmount(e), 0))})${others.length ? ` together with ${namesOf(others)}` : ""}${death ? " and died" : killed.length ? `; ${namesOf(killed)} died` : ""}. ${fam.why}`,
          timestamp: t0, abilityId: es[0].abilityId, abilityName: es[0].abilityName,
        }));
      }
    }
  }
  return errors;
}

// ── shared stacks ───────────────────────────────────────────────────────────

type Stack = { id: number; name: string; why: string };
const STACKS: Stack[] = [
  { id: SINSMOKE_PAIR, name: "Sinsmoke",
    why: "Fire Cyclonic Break puts four two-player Sinsmoke stacks out: pair with your partner (MT/R1, OT/R2, H1/M1, H2/M2), one pair per stack." },
  { id: FIRE_STACK, name: "Sinbound Fire III",
    why: "Fire Utopian Sky is two four-player Sinbound Fire III stacks: each light party stacks in its safe wedge." },
];

/**
 * With all eight alive: a player in two instances doubled up (named), and a
 * living player in none missed it (named; Major when the stack killed). The
 * Fall of Faith and tether stacks have their own rules below.
 */
function detectStacks(players: PlayerInfo[], life: Life, end: number): PullError[] {
  const errors: PullError[] = [];
  for (const st of STACKS) {
    for (const res of clusterByGap(hitsOf(players, life, st.id, end), (h) => h.e.timestamp, 1000)) {
      const t0 = res[0].e.timestamp;
      if (!allAlive(players, life, t0 - 500)) continue;
      const per = byPlayer(res);
      const killed = uniq(res.filter((h) => life.diedFrom(h.p, h.e.timestamp)).map((h) => h.p));
      const sev = killed.length ? "Major" : "Minor";
      const deathText = killed.length ? ` ${namesOf(killed)} died.` : "";
      for (const [p, es] of per) {
        if (es.length < 2) continue;
        errors.push(playerError(p, {
          ruleId: FB_STACK_RULE_ID, severity: sev, name: `Doubled ${st.name}`,
          description: `Stood in ${es.length} ${st.name} stacks at once (${kFmt(es.reduce((s, e) => s + realAmount(e), 0))}).${deathText} ${st.why}`,
          timestamp: t0, abilityId: st.id, abilityName: st.name,
        }));
      }
      // A player just hit by an avoidable (a follow-up cone) is flagged for that.
      for (const p of players.filter((x) => !per.has(x) && !inAvoidable(x, t0))) {
        errors.push(playerError(p, {
          ruleId: FB_STACK_RULE_ID, severity: sev, name: `Missed ${st.name}`,
          description: `Wasn't in any ${st.name} stack, so another stack was short a player.${deathText} ${st.why}`,
          timestamp: t0, abilityId: st.id, abilityName: st.name,
        }));
      }
    }
  }
  return errors;
}

// ── Powder Mark Trail and Burn Mark ─────────────────────────────────────────

/**
 * Powder Mark Trail: a buster on the top-enmity tank, then ~16s of Powder
 * Mark; at expiry (or the holder's death) Burn Mark hits the holder and the
 * player nearest them, who should be the other tank.
 * - The holder killed by an auto-attack under the buster's Physical
 *   Vulnerability Up: the swap failed. Both tanks are named (the log can't
 *   say who missed the Provoke/Shirk).
 * - The holder killed by the buster itself: their mitigation.
 * - An expiry Burn Mark hitting a non-tank with both tanks up: that player
 *   and the other tank (who should have been nearest) are named.
 * - A tank killed by an expiry Burn Mark (mitigation).
 * A death-triggered Burn Mark's victims are fallout of the holder's death.
 */
function detectPowderMark(players: PlayerInfo[], life: Life, casts: EnemyEvent[], deaths: DeathEvent[], end: number, occurrences?: ReportedOccurrence[]): PullError[] {
  const errors: PullError[] = [];
  const tanks = players.filter(isTank);
  for (const c of castsOf(casts, POWDER, end)) {
    const holder = players.find((p) => p.name === c.target);
    // With a tank dead the buster goes to someone else: fallout.
    if (!holder || !isTank(holder)) continue;
    const t = c.timestamp;
    for (const key of [FB_POWDER_SWAP_RULE_ID, FB_POWDER_DEATH_RULE_ID]) occurrences?.push({ mechanicKey: key, timestamp: t, players: tanks.map((p) => p.name) });
    const other = tanks.find((p) => p !== holder);
    const death = deaths.find((d) => d.player === holder.name && d.timestamp > t && d.timestamp <= t + 18_000);
    if (death?.killingAbilityGameId === AUTO) {
      for (const p of tanks) {
        errors.push(playerError(p, {
          ruleId: FB_POWDER_SWAP_RULE_ID, severity: "Major", name: "Powder Mark Swap Missed",
          description: `${holder.name} took an auto-attack under Powder Mark Trail's Physical Vulnerability Up and died (${sec(death.timestamp - t)}s after the buster). The other tank must Provoke right after the buster lands; ${holder.name}'s death then set off Burn Mark early.`,
          timestamp: death.timestamp - DEATH_EVENT_LAG_MS, abilityId: AUTO, abilityName: "Attack",
        }));
      }
    } else if (death?.killingAbilityGameId === POWDER) {
      errors.push(playerError(holder, {
        ruleId: FB_POWDER_DEATH_RULE_ID, severity: "Major", name: "Died to Powder Mark Trail",
        description: "Died to the Powder Mark Trail tank buster itself. It needs a mitigation cooldown; the death also set off Burn Mark early on the players nearest.",
        timestamp: t, abilityId: POWDER, abilityName: "Powder Mark Trail",
      }));
    }
    // The expiry Burn Mark (the holder still alive when the mark ran out).
    const expiry = holder.debuffs.find((e) => e.abilityId === POWDER_MARK && e.debuffStatus === "removed" && e.timestamp > t);
    if (!isTank(holder) || !expiry || !life.alive(holder, expiry.timestamp)) continue;
    const hits = hitsOf(players, life, BURN_MARK, end).filter((h) => h.e.timestamp >= expiry.timestamp - 500 && h.e.timestamp <= expiry.timestamp + 2500);
    const nonTanks = uniq(hits.filter((h) => !isTank(h.p)).map((h) => h.p));
    // Both explosions on one tank: the tanks stood together.
    const stacked = tanks.filter((p) => hits.filter((h) => h.p === p).length > 1);
    if (stacked.length && other && life.alive(other, expiry.timestamp)) {
      const killed = tanks.filter((p) => hits.some((h) => h.p === p && life.diedFrom(p, h.e.timestamp)));
      for (const p of tanks) {
        errors.push(playerError(p, {
          ruleId: FB_BURN_MARK_RULE_ID, severity: killed.length ? "Major" : "Minor", name: "Burn Marks Overlapped",
          description: `Both Burn Mark explosions hit ${namesOf(stacked)}: the tanks stood too close together when ${holder.name}'s Powder Mark ran out.${killed.length ? ` ${namesOf(killed)} died.` : ""} The other tank is the nearest player but far enough that the two explosions don't overlap.`,
          timestamp: hits[0].e.timestamp, abilityId: BURN_MARK, abilityName: "Burn Mark",
        }));
      }
      continue;
    }
    if (nonTanks.length && other && life.alive(other, expiry.timestamp)) {
      const killed = nonTanks.filter((p) => hits.some((h) => h.p === p && life.diedFrom(p, h.e.timestamp)));
      for (const p of [...nonTanks, other]) {
        errors.push(playerError(p, {
          ruleId: FB_BURN_MARK_RULE_ID, severity: killed.length ? "Major" : "Minor", name: "Burn Mark on a Non-Tank",
          description: `Burn Mark from ${holder.name}'s Powder Mark went to ${namesOf(nonTanks)} instead of ${other.name}: it hits the player nearest the marked tank.${killed.length ? ` ${namesOf(killed)} died.` : ""} The other tank stays closest to the marked tank; everyone else keeps away.`,
          timestamp: hits[0].e.timestamp, abilityId: BURN_MARK, abilityName: "Burn Mark",
        }));
      }
    }
    for (const h of hits.filter((x) => isTank(x.p))) {
      if (life.diedFrom(h.p, h.e.timestamp)?.killingAbilityGameId !== BURN_MARK) continue;
      errors.push(playerError(h.p, {
        ruleId: FB_POWDER_DEATH_RULE_ID, severity: "Major", name: "Died to Burn Mark",
        description: `Died to Burn Mark at the end of Powder Mark Trail (${kFmt(realAmount(h.e))}). Both tanks take it; it needs mitigation and the tanks topped up.`,
        timestamp: h.e.timestamp, abilityId: BURN_MARK, abilityName: "Burn Mark",
      }));
    }
  }
  return errors;
}

// ── Fated Burn Mark (Utopian Sky tethers) ───────────────────────────────────

/**
 * The two tethered players carry Fated Burn Mark from ~+1:05 to the tether
 * stacks at ~+1:20. If a holder dies, it explodes ~0.7s later on everyone
 * near (Damage Down to all, often lethal). The holder's own death is
 * flagged by whatever killed them; the explosion is the pull's cutoff when
 * it hit FATED_RAID_HITS+ others.
 */
function detectFatedBurnMark(players: PlayerInfo[], life: Life, deaths: DeathEvent[], end: number): PullError[] {
  const errors: PullError[] = [];
  for (const res of clusterByGap(hitsOf(players, life, FATED_EXPLOSION, end), (h) => h.e.timestamp, 1000)) {
    const t = res[0].e.timestamp;
    const holder = players.find((p) => p.debuffs.some((e) => e.abilityId === FATED_BURN_MARK && e.debuffStatus === "removed" && e.timestamp <= t + 200 && e.timestamp >= t - 1500));
    const hit = uniq(res.map((h) => h.p)).filter((p) => p !== holder);
    if (hit.length < FATED_RAID_HITS) continue;
    const d = holder ? deaths.find((x) => x.player === holder.name && Math.abs(x.timestamp - DEATH_EVENT_LAG_MS - t) <= 2500) : undefined;
    const killed = hit.filter((p) => life.diedFrom(p, t));
    const fatal = holder?.damageTaken.filter((e) => e.timestamp <= t && t - e.timestamp <= SILENT_HIT_MS && (e.amount ?? 0) > 0).pop();
    const cause = fatal ? ` (last hit by ${fatal.abilityName})` : d && !d.killingAbilityGameId ? " (no killing blow: the wall)" : "";
    errors.push(raidMarker(FB_FATED_RULE_ID, "Fated Burn Mark Exploded",
      `${holder ? `${holder.name} died holding Fated Burn Mark${cause}` : "A Fated Burn Mark holder died"}, and it exploded on ${hit.length} players: Damage Down for everyone it hit${killed.length ? `, and ${namesOf(killed)} died` : ""}. Unresolvable from here; treated as the cutoff point. The tethered players must stay alive until their stacks resolve.`,
      t, FATED_EXPLOSION, "Fated Burn Mark"));
  }
  return errors;
}

// ── Utopian Sky tether stacks (Sinsmoke ~+1:20) ─────────────────────────────

/**
 * Two four-player Sinsmoke stacks on the tethered players; one with fewer
 * than four hands Mark of Mortality to everyone in it. With all eight
 * alive: a living player in neither is named; both stacks on top of each
 * other names the two tethered players (their stacks overlapped); an
 * uneven split with nobody missing is player-less (who should have moved
 * depends on the group's flex). With anyone dead, a short stack is fallout.
 */
function detectTetherStacks(players: PlayerInfo[], life: Life, end: number): PullError[] {
  const errors: PullError[] = [];
  for (const res of clusterByGap(hitsOf(players, life, TETHER_STACK, end), (h) => h.e.timestamp, 1000)) {
    const t = res[0].e.timestamp;
    if (!allAlive(players, life, t - 500)) continue;
    const per = byPlayer(res);
    const insts = new Map<number | undefined, PlayerInfo[]>();
    for (const h of res) insts.set(h.e.sourceInstance, [...(insts.get(h.e.sourceInstance) ?? []), h.p]);
    const mom = players.filter((p) => gotAura(p, MARK_OF_MORTALITY, t));
    const killed = uniq(res.filter((h) => life.diedFrom(h.p, h.e.timestamp)).map((h) => h.p));
    const sev = mom.length || killed.length ? "Major" : "Minor";
    const outcome = `${mom.length ? ` ${namesOf(mom)} got Mark of Mortality.` : ""}${killed.length ? ` ${namesOf(killed)} died.` : ""}`;
    const why = "The two tethered players each lead a four-player Sinsmoke stack; four per stack, nobody in both.";
    const holders = players.filter((p) => p.debuffs.some((e) => e.abilityId === FATED_BURN_MARK && e.debuffStatus === "removed" && Math.abs(e.timestamp - t) <= 1500));
    const doubled = [...per].filter(([, es]) => es.length > 1).map(([p]) => p);
    if (doubled.length >= 3 && holders.length === 2) {
      for (const p of holders) {
        errors.push(playerError(p, {
          ruleId: FB_TETHER_STACK_RULE_ID, severity: sev, name: "Tether Stacks Overlapped",
          description: `The two tether stacks (${namesOf(holders)}) landed on top of each other: ${doubled.length} players took both.${outcome} ${why}`,
          timestamp: t, abilityId: TETHER_STACK, abilityName: "Sinsmoke",
        }));
      }
      continue;
    }
    for (const p of doubled) {
      errors.push(playerError(p, {
        ruleId: FB_TETHER_STACK_RULE_ID, severity: sev, name: "Doubled Tether Stack",
        description: `Stood in both tether stacks.${outcome} ${why}`,
        timestamp: t, abilityId: TETHER_STACK, abilityName: "Sinsmoke",
      }));
    }
    const short = [...insts.values()].filter((ps) => uniq(ps).length < 4);
    if (!short.length) continue;
    const absent = players.filter((p) => !per.has(p));
    for (const p of absent) {
      errors.push(playerError(p, {
        ruleId: FB_TETHER_STACK_RULE_ID, severity: sev, name: "Missed Tether Stack",
        description: `Wasn't in either tether stack, so ${namesOf(short.flat())} took theirs short.${outcome} ${why}`,
        timestamp: t, abilityId: TETHER_STACK, abilityName: "Sinsmoke",
      }));
    }
    if (!absent.length && !doubled.length) {
      const split = [...insts.values()].map((ps) => `${uniq(ps).length} (${namesOf(ps)})`).join(" and ");
      errors.push(playerlessMinor(FB_TETHER_STACK_RULE_ID, "Uneven Tether Stacks",
        `The tether stacks split ${split} instead of four and four.${outcome} ${why} Who should have moved depends on the group's flex.`,
        t, TETHER_STACK, "Sinsmoke"));
    }
  }
  return errors;
}

// ── Fall of Faith ───────────────────────────────────────────────────────────

/**
 * Four tethers resolve ~2.5s apart, alternating groups (1/3 one side, 2/4
 * the other). Each hits exactly its group's four players: fire Sinblaze
 * (carrier + three; fewer gives Mark of Mortality), lightning Sinsmite on
 * the carrier + three Bow Shock cones. A group is read from the other
 * resolution on its side when that one was clean (four players, one hit
 * each). With all eight alive:
 * - a player hit twice in one resolution (two cones, or cone + carrier);
 * - players from the other group in it (FALL_WRONG_SIDE+ of them: the
 *   carrier brought the tether over, so the carrier is named);
 * - a short Sinblaze: the missing members of that group.
 */
function detectFallOfFaith(players: PlayerInfo[], life: Life, end: number): PullError[] {
  const errors: PullError[] = [];
  const res = clusterByGap(hitsOf(players, life, [SINBLAZE, FALL_CARRIER, BOW_SHOCK], end), (h) => h.e.timestamp, FALL_GAP_MS);
  const clean = (r: Hit[]) => byPlayer(r).size === 4 && [...byPlayer(r).values()].every((es) => es.length === 1);
  res.forEach((r, k) => {
    const t = r[0].e.timestamp;
    const partner = [res[k - 2], res[k + 2]].find((x) => x && clean(x));
    const group = partner ? new Set(partner.map((h) => h.p)) : undefined;
    // A dead group member's share retargets onto whoever is near: fallout.
    // Without a known group, everyone must be alive.
    if (!(group ? [...group] : players).every((p) => life.alive(p, t - 500))) return;
    const fire = r.some((h) => h.e.abilityId === SINBLAZE);
    const label = fire ? "Sinblaze" : "Bow Shock";
    const per = byPlayer(r);
    const carrier = players.find((p) => p.debuffs.some((e) => e.abilityId === FLOATING_FETTERS && e.debuffStatus === "applied" &&
      t - e.timestamp >= FETTERS_BEFORE_MS[0] && t - e.timestamp <= FETTERS_BEFORE_MS[1]));
    const mom = players.filter((p) => gotAura(p, MARK_OF_MORTALITY, t));
    const killed = uniq(r.filter((h) => life.diedFrom(h.p, h.e.timestamp)).map((h) => h.p));
    const outcome = `${mom.length ? ` ${namesOf(mom)} got Mark of Mortality.` : ""}${killed.length ? ` ${namesOf(killed)} died.` : ""}`;
    const sev = mom.length || killed.length ? "Major" : "Minor";
    const nth = `tether ${k + 1}`;
    const base = { ruleId: FB_FALL_RULE_ID, severity: sev, timestamp: t, abilityId: r[0].e.abilityId, abilityName: r[0].e.abilityName } as const;
    for (const [p, es] of per) {
      if (es.length < 2) continue;
      errors.push(playerError(p, { ...base, name: "Fall of Faith Double Hit",
        description: `Took ${es.length} hits from Fall of Faith ${nth} (${kFmt(es.reduce((s, e) => s + realAmount(e), 0))}).${outcome} Each helper takes one: lightning helpers spread into their own Bow Shock cone, fire helpers stack behind the carrier.` }));
    }
    if (group) {
      const extras = [...per.keys()].filter((p) => !group.has(p));
      if (extras.length >= FALL_WRONG_SIDE && carrier) {
        errors.push(playerError(carrier, { ...base, name: "Fall of Faith Tether to the Wrong Group",
          description: `${label} from ${nth}, ${carrier.name}'s, hit ${extras.length} players of the other group (${namesOf(extras)}).${outcome} Tethers 1 and 3 resolve in one group, 2 and 4 in the other; the carrier stands inside their own group so the hit points at their own helpers.` }));
      } else {
        for (const p of extras) {
          errors.push(playerError(p, { ...base, name: "Fall of Faith Wrong Group",
            description: `Was hit by ${label} from ${nth}, which belongs to the other group (${namesOf([...group])}).${outcome} Tethers 1 and 3 resolve in one group, 2 and 4 in the other; stay with yours.` }));
        }
      }
    }
    if (fire && per.size < 4 && mom.length) {
      const missing = group ? [...group].filter((p) => !per.has(p)) : [];
      for (const p of missing) {
        errors.push(playerError(p, { ...base, severity: "Major", name: "Missed Sinblaze",
          description: `Wasn't in Sinblaze for ${nth}: only ${per.size} took it (${namesOf([...per.keys()])}), short of four.${outcome} The fire carrier's whole group of four takes Sinblaze together.` }));
      }
      if (!missing.length) {
        errors.push(playerlessMinor(FB_FALL_RULE_ID, "Sinblaze Short",
          `Only ${per.size} took Sinblaze for ${nth} (${namesOf([...per.keys()])}), short of four.${outcome} The group's other members couldn't be read from the log.`,
          t, SINBLAZE, "Sinblaze"));
      }
    }
  });
  return errors;
}

// ── Burnt Strike towers (~+2:26) ────────────────────────────────────────────

/**
 * Three towers on one side (N, middle, S) needing 1-4 soakers each, six in
 * all (the Explosion ID says how many). A short tower blows up the raid
 * (Unmitigated Explosion, Damage Down on everyone). With all six non-tanks
 * alive, the players named are a living non-tank in no tower, else the
 * extras in a tower that had more than it needed. Always a Raid marker.
 */
function detectTowers(players: PlayerInfo[], life: Life, casts: EnemyEvent[], end: number): PullError[] {
  const errors: PullError[] = [];
  const towerCasts = castsOf(casts, Object.keys(TOWER_NEED).map(Number), end);
  if (!towerCasts.length) return errors;
  const t = towerCasts[0].timestamp;
  const towers = uniq(towerCasts.filter((c) => c.timestamp - t < 2000).map((c) => `${c.x},${c.y}`)).map((key) => {
    const c = towerCasts.find((x) => `${x.x},${x.y}` === key)!;
    const soak = players.filter((p) => p.damageTaken.some((e) => TOWER_NEED[e.abilityId] && e.sourceInstance === c.sourceInstance &&
      Math.abs(e.timestamp - c.timestamp) <= 1500 && e.healthBefore !== 0));
    const blew = castsOf(casts, UNMITIGATED, end).some((u) => u.x === c.x && u.y === c.y && Math.abs(u.timestamp - c.timestamp) < 4000);
    const where = c.y === undefined ? "?" : c.y < 9500 ? "north" : c.y > 10500 ? "south" : "middle";
    return { c, need: TOWER_NEED[c.abilityId], soak, failed: blew || soak.length < TOWER_NEED[c.abilityId], where };
  });
  const bad = towers.filter((x) => x.failed);
  const nonTanks = players.filter((p) => !isTank(p));
  // Half the soakers already dead: the pull was over before the towers.
  if (!bad.length || nonTanks.filter((p) => !life.alive(p, t)).length >= TOWER_OVER_DEAD) return errors;
  const counts = towers.map((x) => `${x.where} ${x.soak.length}/${x.need}`).join(", ");
  const short = joinNames(bad.map((x) => `the ${x.where} tower (${x.soak.length} of ${x.need})`));
  if (nonTanks.every((p) => life.alive(p, t))) {
    const inTower = new Set(towers.flatMap((x) => x.soak));
    const absent = nonTanks.filter((p) => !inTower.has(p));
    const extras = towers.filter((x) => x.soak.length > x.need).flatMap((x) => x.soak.filter((p) => !isTank(p)));
    for (const p of absent.length ? absent : extras) {
      errors.push(playerError(p, {
        ruleId: FB_TOWER_RULE_ID, severity: "Major", name: "Missed Tower",
        description: `${absent.length ? "Wasn't in any tower" : "Was in a tower that already had enough"} while ${short} went short (${counts}): Unmitigated Explosion, Damage Down for the whole raid. The six non-tanks fill the towers' counts (NAUR: H1 north, R2 middle, H2 south, then M1, M2, R1 fill the gaps north to south).`,
        timestamp: t, abilityId: bad[0].c.abilityId, abilityName: "Explosion",
      }));
    }
  }
  const dead = nonTanks.filter((p) => !life.alive(p, t));
  errors.push(raidMarker(FB_TOWER_RULE_ID, "Tower Failed",
    `${short.charAt(0).toUpperCase() + short.slice(1)} didn't get enough soakers (${counts})${dead.length ? `; ${namesOf(dead)} ${dead.length === 1 ? "was" : "were"} already dead` : ""}. Unmitigated Explosion gives the raid Damage Down; treated as the cutoff point.`,
    t, bad[0].c.abilityId, "Explosion"));
  return errors;
}

// ── deaths with no killing blow ─────────────────────────────────────────────

/** The Blastburn cast that knocked this no-killing-blow death into the wall, if any. */
function knockbackOf(casts: EnemyEvent[], d: DeathEvent, end: number): EnemyEvent | undefined {
  return castsOf(casts, BLASTBURN, end).filter((c) => d.timestamp - c.timestamp >= KNOCKBACK_MIN_MS && d.timestamp - c.timestamp <= KNOCKBACK_MAX_MS).pop();
}

/**
 * No-killing-blow deaths that are the wipe being called, not mistakes.
 * Knockback deaths never count: four players knocked out together (B17
 * +1:16) were a misplaced group, not a reset.
 */
function calledWipeDeaths(deaths: DeathEvent[], casts: EnemyEvent[], pullEnd: number, end: number): Set<DeathEvent> {
  const silent = deaths.filter((d) => !d.killingAbilityGameId && !knockbackOf(casts, d, end));
  const out = new Set<DeathEvent>();
  for (const d of silent) {
    if (pullEnd - d.timestamp <= CALLED_WIPE_END_MS) out.add(d);
    const near = silent.filter((x) => Math.abs(x.timestamp - d.timestamp) <= CALLED_WIPE_WINDOW);
    if (near.length >= CALLED_WIPE_COUNT) near.forEach((x) => out.add(x));
  }
  return out;
}

/**
 * The arena edge is a deathwall. A no-killing-blow death 2-4.5s after a
 * Blastburn knockback was knocked into it (Major). One within DD_RESET_MS
 * of the player's own Damage Down is a voluntary reset (not flagged: the
 * Damage Down's cause is). Others mid-pull walked into it (Major).
 */
function detectWallDeaths(players: PlayerInfo[], casts: EnemyEvent[], deaths: DeathEvent[], called: Set<DeathEvent>, end: number): PullError[] {
  const errors: PullError[] = [];
  for (const d of deaths) {
    if (d.killingAbilityGameId || called.has(d)) continue;
    const p = players.find((x) => x.name === d.player);
    if (!p) continue;
    const kb = knockbackOf(casts, d, end);
    if (!kb && p.debuffs.some((e) => e.abilityId === DAMAGE_DOWN && e.debuffStatus === "applied" && e.timestamp < d.timestamp && d.timestamp - e.timestamp <= DD_RESET_MS)) continue;
    if (!kb && p.damageTaken.some((e) => (e.amount ?? 0) > 0 && e.timestamp <= d.timestamp && d.timestamp - e.timestamp <= SILENT_HIT_MS)) continue;
    errors.push(playerError(p, {
      ruleId: FB_KNOCKBACK_RULE_ID, severity: "Major", name: kb ? "Knocked Into the Wall" : "Walked Into the Wall",
      description: kb
        ? `Knocked into the deathwall by Blastburn (${sec(d.timestamp - kb.timestamp)}s before the death). Blastburn knocks away from the fire line; start next to it on the safe side so the knockback carries you across the arena, not out of it.`
        : "Died with no killing blow mid-pull: walked into the deathwall at the arena's edge.",
      timestamp: kb ? kb.timestamp : d.timestamp - DEATH_EVENT_LAG_MS, abilityId: kb?.abilityId ?? 0, abilityName: kb ? "Blastburn" : "Deathwall",
    }));
  }
  return errors;
}

// ── entry point ─────────────────────────────────────────────────────────────

/**
 * Futures Rewritten Phase 1 (Fatebreaker) errors. Self-gates on the
 * opening Cyclonic Break / Powder Mark Trail casts, which no other fight
 * uses, and stops at the first Phase 2 cast: later phases belong to their
 * own modules (and the fallback model until those exist).
 */
export function detectFatebreakerErrors(
  players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], occurrences?: ReportedOccurrence[],
): PullError[] {
  if (!enemyCasts.some((c) => SIGNATURE.includes(c.abilityId))) return [];
  const p2 = phase1End(enemyCasts);
  const deaths = deathEvents.filter((d) => d.timestamp <= p2);
  const life = buildLife(players, deaths);
  const lastEvent = Math.max(0, ...players.flatMap((p) => [...p.damageTaken, ...p.casts].map((e) => e.timestamp)), ...deathEvents.map((d) => d.timestamp));
  const end = Math.min(p2, lastEvent);
  const called = calledWipeDeaths(deaths, enemyCasts, p2 === Infinity ? lastEvent : -Infinity, end);

  const errors = [
    ...detectAvoidable(players, life, end),
    ...detectPersonalOverlaps(players, life, end),
    ...detectStacks(players, life, end),
    ...detectPowderMark(players, life, enemyCasts, deaths, end, occurrences),
    ...detectFatedBurnMark(players, life, deaths, end),
    ...detectTetherStacks(players, life, end),
    ...detectFallOfFaith(players, life, end),
    ...detectTowers(players, life, enemyCasts, end),
    ...detectWallDeaths(players, enemyCasts, deaths, called, end),
  ];

  // Generic cutoffs, only the earliest and only before any mechanic Raid.
  const generic: PullError[] = [];
  // The third Burnished Glory is cast in clears too (boss at <1% HP, A20
  // +2:41.5): only a pull that never reached P2 enraged.
  const enrage = p2 === Infinity ? castsOf(enemyCasts, ENRAGE, end)[0] : undefined;
  if (enrage) {
    const left = enrage.hitPoints !== undefined && enrage.maxHitPoints
      ? ` ${enrage.actorName} still had ${(100 * enrage.hitPoints / enrage.maxHitPoints).toFixed(1)}% HP left.` : "";
    generic.push(raidMarker(FB_ENRAGE_RULE_ID, "Burnished Glory (Enrage)",
      `The third Burnished Glory, the hard enrage, went off. The DPS check wasn't met.${left}`,
      enrage.timestamp, enrage.abilityId, "Burnished Glory"));
  }
  const calledList = deaths.filter((d) => called.has(d)).sort((a, b) => a.timestamp - b.timestamp);
  if (calledList.length >= CALLED_WIPE_COUNT) {
    generic.push(raidMarker(FB_CALLED_WIPE_RULE_ID, "Wipe Called",
      `${calledList.length} players died with no killing blow (${joinNames(uniq(calledList.map((d) => d.player)))}): the wipe was called and the raid reset into the deathwall.`,
      calledList[0].timestamp - DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  // COLLAPSE_DEAD_COUNT dead at once with the pull ending soon after (P1
  // wipes only; a pull that reached P2 carried on).
  if (p2 === Infinity) {
    const outAt = (t: number) => players.filter((p) => !life.alive(p, t));
    const collapseT = life.outIntervals.map((w) => w.start).sort((a, b) => a - b)
      .find((t) => outAt(t).length >= COLLAPSE_DEAD_COUNT && lastEvent - t <= COLLAPSE_END_MS);
    if (collapseT !== undefined) {
      const who = outAt(collapseT).map((p) => p.name);
      generic.push(raidMarker(FB_COLLAPSE_RULE_ID, "Party Collapse",
        `${who.length} players were dead at once (${joinNames(who)}). Treated as the cutoff point.`,
        collapseT + DEATH_EVENT_LAG_MS, 0, "Deaths"));
    }
  }
  const firstRaid = Math.min(...errors.filter((e) => e.severity === "Raid").map((e) => e.timestamp));
  const marker = generic.sort((a, b) => a.timestamp - b.timestamp)[0];
  if (marker && marker.timestamp < firstRaid) errors.push(marker);
  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
