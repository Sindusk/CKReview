// lib/mechanics/ffxiv/fru/fatebreaker.ts
//
// -- GUIDE-DERIVED MODEL: FATEBREAKER (FRU PHASE 1) --
// Futures Rewritten (Ultimate), released patch 7.11; checked 2026-10-09.
// Comments only, no detector/Strategy registration. No report analyzed;
// ALL proposed log signals and attribution are unverified hypotheses.
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
