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
// - Initial-cone clock spots: each player stands at the same bearing in
//   both Cyclonic Breaks in A and B (within ~5 degrees); C swaps two players
//   (226 <-> 270) every pull. A's spots: MT 0, OT 90, H1 268, H2 180, the
//   M1 225, the SE melee 135, NE 45, NW 315 (standard modified clocks).
// - Group A's tank swap: the MT Provokes at the pull (+0:00-1.6), the OT
//   Provokes ~1.5s before the first buster lands; B/C have no opener
//   Provoke (their MT Shirks ~2s before the buster).
// - Fall of Faith fire: Sinblaze points at the helper nearest the carrier.
//   Every fire cone into the other group had a helper 17-68 units from the
//   carrier (A40, A42, A53, A61); clean resolutions' nearest helper 90+.
// VOD review 2026-10-12 (user): report A pulls 3, 4, 17, 19, 26, 46, 53,
// 61, 64; rulings in expectations/rulings.json. It set the Provoke blame,
// the opener-MT aggro check, cone spots, "dead going into", Sinblaze's
// nearest helper and the 20s Damage Down reset window below.
// VOD review 2026-10-12 round 2 (user): report A pulls 1, 7, 15, 29, 41;
// rulings in expectations/rulings.json. It set Bow Shock's pointing helper,
// the behind bait in tethers 3/4, mitigation deaths in a clean Fall of Faith
// and the Fated Burn Mark holder who died (A13: Laura, not Yoro).
// - Lightning Fall of Faith: each helper's cone points from the carrier
//   through them. A7 +1:47: Jamie 1.2y from the carrier, 43 degrees off the
//   line to the other group, whose four took Bow Shock. In every other
//   3+-extras lightning resolution (A, B, C) no own-group helper was within
//   60 degrees; clean ones go down to 44 (so the angle alone isn't an error).
// - Single-hit deaths in clean Fall of Faith resolutions are low HP going in
//   (A15, A34, A52, A55: 30-80k HP left after the previous tether, no
//   mitigation on the hits). Per the user these are never flagged: a death
//   to raw damage in a correctly done mechanic isn't a player error.
// VOD review 2026-10-12 round 3 (user): report A pulls 34, 43, 44, 45, 52,
// 55, 58, 59, 60. It set the Sinsmite outer/inner bands, Burn Mark on a
// non-tank naming only them, the four-player other-side group read, and
// no mitigation-death flags.
// - Sinsmite: each bearing holds an outer and an inner spread (A: Yoro/
//   Galileo, Apollo/Sayacissa, Sin/Laura, Sarelie/Jamie). Clean outer
//   11.5y+ from the center (B, C 12.1+), inner 10.6y- (B, C 8.7-).
// VOD review 2026-10-12 round 4 (user): report T wdH8Az193bYxJTRf (group
// A's static on 2025-01-11, 34 pulls, cited as T12 +0:50), pulls 12, 14,
// 30, 34; rulings in expectations/rulings.json. It set:
// - stacks retargeted by a death to something else being fallout (T12);
// - still holding Damage Down at a wall death being a reset (T14);
// - a wall death before a mechanic death not being part of the called
//   wipe (T30);
// - the Fall of Faith group read from a same-side four-player resolution
//   (T34: the ninja on the wrong side for tether 1, their cone hit all
//   five of the other group).
// Cutoffs (first Raid error): player dead going into a mechanic 62, called
// wipe 41, collapse 40, Fated Burn Mark 22, enrage 11, tower 3; the 18 P1
// clears have none.
//
// -- RULES IMPLEMENTED --
// ffxiv-fb-avoidable (Major on Damage Down or death, else Minor): Cyclonic
//   Break follow-ups, Blasting Zone, Brightfire, Burnt Strike, Burnout.
// ffxiv-fb-overlap (Major if someone involved died, else Minor): with all
//   eight alive, a player hit by two or more initial cones, Sinsmite or
//   Sinbound Thunder III spreads; everyone sharing those instances named.
//   Cones: when some of them stood 20+ degrees off their spot in the pull's
//   other Cyclonic Break, only those are named; with someone dead, only a
//   player who moved onto a living player's spot. Sinsmite, two players on
//   one bearing: the one outside their band (outer under 11y, inner over
//   11y), else both.
// ffxiv-fb-stack: with all eight alive, a player in two Sinsmoke / Sinbound
//   Fire III stacks, or in none (not if just hit by an avoidable). Skipped
//   when a player outside the stacks died at that moment (retargeted).
// ffxiv-fb-powder-swap (Major): the first Powder Mark on the tank who
//   wasn't the opener-Provoke MT (that tank named); the holder killed by an
//   auto-attack: the other tank if they didn't Provoke, both tanks if they
//   did. ffxiv-fb-powder-death (Major): a tank killed by the Powder Mark
//   buster or by a single expiry Burn Mark with the other tank alive
//   (their mitigation; with the other tank dead it's fallout, A45).
// ffxiv-fb-burn-mark: both expiry explosions on one tank (both tanks named),
//   or one on a non-tank with all eight alive (that player alone: A58).
// ffxiv-fb-fated-burn-mark (Raid): a Fated Burn Mark explosion hitting 3+
//   others; the holder (the one who died before it) is flagged by what
//   killed them.
// ffxiv-fb-tether-stack (all eight alive): both stacks overlapping (the two
//   tethered players), a player in both, a player in neither when a stack
//   was short, else a player-less Minor for an uneven split.
// ffxiv-fb-fall-of-faith: each resolution's group is read from the other
//   resolution on its side when that was clean (failing that, one that hit
//   exactly four including this carrier), else as everyone outside a
//   clean resolution of the other side (failing that, one of exactly four
//   players sharing nobody with this one); with the group alive: a double hit
//   (in lightning, not this side's other carrier by Prey order, next in
//   tethers 1/2 and previous in 3/4, when others doubled too: they stand
//   behind the carrier),
//   fire reaching the other group (the helper nearest the carrier alone),
//   lightning reaching it (3+: the own-group helper within 60 degrees of the
//   direction to them, else the carrier by Floating Fetters; fewer: those
//   players), a short Sinblaze's missing members (player-less if unknown).
//   A death in a clean resolution is never flagged (mitigation).
// ffxiv-fb-tower (Raid + Major): a short tower; with the six non-tanks
//   alive, a non-tank in no tower, else the extras in an overfilled one.
//   Skipped with 3+ non-tanks dead.
// ffxiv-fb-knockback (Major): knocked into the wall by Blastburn, or walked
//   into it mid-pull (not within 20s of their own Damage Down or still
//   holding it: a reset; not a dropped killing blow).
// ffxiv-fb-dead-going-in (Raid): someone still dead when Cyclonic Break,
//   Utopian Sky, the tether stacks or Fall of Faith begins (all eight
//   needed), or a non-tank at the towers (C27 cleared with the OT dead).
// ffxiv-fb-enrage / -called-wipe (3+ no-killing-blow deaths within 10s or
//   within 12s of the end, knocks excluded, and not a lone first death
//   followed by a mechanic death: common.ts resetCluster) / -collapse (4 dead, pull over
//   within 20s): Raid, only the earliest, only before any mechanic Raid.
// Exposure: -powder-swap and -powder-death are targeted (both tanks at each
// Powder Mark); everything else counts everyone.
// The Damage Down causes are excluded from ffxiv-damage-down (error-rules.ts).
//
// - Utopian tether stacks, group A: supports north, DPS south. Two DPS
//   tethered: one DPS flexes north and the MT south; two supports: the M1
//   north. Which DPS flexes changed through the night (A12/A42 the BLM/PCT
//   caster, A23/A54/A62/A70 the NIN); the model says the long tether goes
//   north, but tether length isn't logged (the charge casts 40165/40166
//   appear in only 7 of 197 pulls). So when the stacks overlap both
//   tethered players stay named; per the user's notes A49's caster failed
//   to flex (ruling).
// Not built: who left their spot in a spread overlap, which tethered player
// should flex for the tether stacks, the towers' assigned members (groups
// differ per report),
// Bleeding / Burnished Glory deaths (healing), tank mitigation beyond
// deaths.
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
import { kFmt, sec, yd, joinNames, playerError, playerlessMinor, raidMarker, clusterByGap } from "@/lib/mechanics/wow/common";
import {
  DAMAGE_DOWN, MARK_OF_MORTALITY, DEATH_EVENT_LAG_MS, PREVIEW_AMOUNT, type Hit, type Life,
  bodyHit, buildLife, hitsOf, castsOf, gotAura, clock, uniq, namesOf, isTank, realAmount, allAlive, byPlayer, resetCluster,
} from "./common";

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
export const FB_DEAD_GOING_IN_RULE_ID = "ffxiv-fb-dead-going-in";

// ── log IDs (VERIFIED above) ────────────────────────────────────────────────

const SIGNATURE = [40144, 40148, 40168];      // opening Cyclonic Break (fire / lightning), Powder Mark Trail
const FATED_BURN_MARK = 1004165;
const POWDER_MARK = 1004166;
const FLOATING_FETTERS = 1002304;
const PREY = 1001051;
// Fall of Faith's Prey marks land 5.6-13.9s before the first tether hits
// (C31: +1:33.3 .. +1:41.6, hit +1:47.2); the Utopian Prey is 40s earlier.
const PREY_BEFORE_FALL_MS = 16_000;
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

const EPISODE_MS         = 3000;
// A no-killing-blow death this long after a Blastburn cast was knocked into
// the deathwall: 2.8-3.5s in all 32 such deaths (A12 +1:16.4 ... C20 +2:27.5).
const KNOCKBACK_MIN_MS   = 2000;
const KNOCKBACK_MAX_MS   = 4500;
// A no-killing-blow death this soon after the player's own Damage Down is a
// voluntary reset into the wall (4.1-8.5s mostly, A40 ... C25; A64 +1:22.8
// 15.3s, user-confirmed): the Damage Down's cause is the error, not the
// death.
const DD_RESET_MS        = 20_000;
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
// Bow Shock is a 120-degree cone: a helper this close to the direction of
// the other group aims it at them (boltPointer).
const BOW_HALF_CONE      = 60;
// This many non-tanks dead before the towers: no tower error (A10, A34).
const TOWER_OVER_DEAD    = 3;
// A no-killing-blow death with a damage hit this soon before its event died
// to that hit (FFLogs dropped the killing blow: A19 +1:49.5 after Sinblaze).
const SILENT_HIT_MS      = 3500;
const ARENA_CENTER       = 10000;
// A player's initial-cone clock spot is the same in both Cyclonic Breaks
// (A and B: within ~5 degrees; C swaps two players every pull). Further than
// this from it is off their spot (A4 the M1 226 -> 137).
const CONE_SPOT_MOVED    = 20;
// Sinsmite spreads: two players per bearing, one outer, one inner (yalms
// from the center). Clean outer 11.5+ (A) / 12.1+ (B, C); clean inner
// 10.6- (A) / 8.7- (B, C). A44 +0:17 outer at 10.6 (user: wrong).
const SPREAD_PAIR_DEG    = 25;
const SPREAD_OUTER_MIN   = 11;
const SPREAD_INNER_MAX   = 11;
// The main tank Provokes at the pull (group A: +0:00.0-1.6 every pull).
const OPENER_PROVOKE_MS  = 3000;
// The swap Provoke counts from this long before the buster lands (group A
// Provokes ~1.5s before it, B/C 0.7-2.7s before).
const SWAP_PROVOKE_BEFORE_MS = 6000;
// "Dead going in" is read this long before a mechanic's first hit, so its
// own victims (death modeled ~2.1s before the event) don't count.
const DEAD_GOING_IN_MS   = 500;

// ── shared helpers (the rest are in ./common) ───────────────────────────────

/** Holding the aura at `t` (applied before, not removed since). */
function holdsAt(p: PlayerInfo, id: number, t: number): boolean {
  let on = false;
  for (const e of p.debuffs) if (e.abilityId === id && e.timestamp <= t) on = e.debuffStatus !== "removed";
  return on;
}

/** Took a listed avoidable hit within 2s of `t`: already flagged for it. */
function inAvoidable(p: PlayerInfo, t: number): boolean {
  return p.damageTaken.some((e) => AVOIDABLE[e.abilityId] && Math.abs(e.timestamp - t) <= 2000 && !bodyHit(e));
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
    const hits = p.damageTaken.filter((e) => ids.includes(e.abilityId) && e.timestamp <= end && !bodyHit(e) && life.hitAlive(p, e.timestamp) &&
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

/** Clock bearing of a hit around the arena center, degrees clockwise from north. */
function bearingOf(e: PlayerEvent): number | undefined {
  if (e.x === undefined || e.y === undefined) return undefined;
  return (Math.atan2(e.x - ARENA_CENTER, -(e.y - ARENA_CENTER)) * 180 / Math.PI + 360) % 360;
}
/** Distance of a hit from the arena center, in yalms. */
function radiusOf(e: PlayerEvent): number | undefined {
  return e.x === undefined || e.y === undefined ? undefined : Math.hypot(e.x - ARENA_CENTER, e.y - ARENA_CENTER) / 100;
}
const angleApart = (a: number, b: number) => Math.abs(((a - b) % 360 + 540) % 360 - 180);

/**
 * With all eight alive, a player hit by two or more instances of a personal
 * bait stood on someone else's. Every player involved is named (README
 * philosophy 3) unless, for the initial Cyclonic Break cones, some of them
 * stood somewhere else in the pull's other Cyclonic Break: then only those
 * who left their clock spot are named (user, 2026-10-12, A4 +0:58: the M1
 * stood on the M2's spot). With anyone dead the baits retarget onto the
 * living (eight cones on one survivor, C21), so only a cone player who left
 * their spot is named; the rest is fallout.
 */
function detectPersonalOverlaps(players: PlayerInfo[], life: Life, end: number): PullError[] {
  const errors: PullError[] = [];
  const coneSets = clusterByGap(hitsOf(players, life, CYCLONIC_CONE, end), (h) => h.e.timestamp, 1500);
  for (const fam of PERSONAL) {
    const isCone = fam.ids.includes(CYCLONIC_CONE);
    for (const res of clusterByGap(hitsOf(players, life, fam.ids, end), (h) => h.e.timestamp, 1500)) {
      const t0 = res[0].e.timestamp;
      const everyone = allAlive(players, life, t0 - 500);
      if (!everyone && !isCone) continue;
      let doubled = [...byPlayer(res)].filter(([, es]) => es.length > 1);
      // Each doubled player's spot in the other Cyclonic Break, and how far
      // they stood from it now.
      const moved = new Map<PlayerInfo, { now: number; before: number }>();
      const spreadNote = new Map<PlayerInfo, string>();
      if (isCone) {
        const other = coneSets.find((s) => s !== res && Math.abs(s[0].e.timestamp - t0) > 10_000);
        for (const [p, es] of doubled) {
          const now = bearingOf(es[0]);
          const ref = other?.find((h) => h.p === p && byPlayer(other).get(p)!.length === 1);
          const before = ref ? bearingOf(ref.e) : undefined;
          if (now !== undefined && before !== undefined && angleApart(now, before) > CONE_SPOT_MOVED) moved.set(p, { now, before });
        }
        // With someone dead, only a player who moved onto another living
        // player's spot (shared a cone with someone who didn't move); a lone
        // survivor eating the extra cones is fallout (B5: 8 cones on one).
        const instKey = (e: PlayerEvent) => `${e.source}#${e.sourceInstance}`;
        const sharesWithUnmoved = (p: PlayerInfo, es: PlayerEvent[]) => {
          const mine = new Set(es.map(instKey));
          return res.some((h) => h.p !== p && !moved.has(h.p) && mine.has(instKey(h.e)));
        };
        const off = doubled.filter(([p, es]) => moved.has(p) && (everyone || sharesWithUnmoved(p, es)));
        if (!everyone || (off.length && off.length < doubled.length)) doubled = off;
      }
      // Two Sinsmite players on one bearing: each bearing holds an outer and
      // an inner spread. The one outside their band moved (user, 2026-10-12,
      // A44 +0:17: Sarelie, outer at 10.6y; A1 +0:17 both in band, both
      // named). Clean outer 11.5y+ (A; B/C 12.1+), inner 10.6y- (B/C 8.7-).
      if (fam.ids.includes(SINSMITE_SPREAD) && everyone && doubled.length === 2) {
        const [a, b] = doubled.map(([p, es]) => ({ p, e: es[0], r: radiusOf(es[0]) }));
        const ba = bearingOf(a.e), bb = bearingOf(b.e);
        if (a.r !== undefined && b.r !== undefined && ba !== undefined && bb !== undefined && angleApart(ba, bb) <= SPREAD_PAIR_DEG) {
          const [outer, inner] = a.r >= b.r ? [a, b] : [b, a];
          const off = outer.r! < SPREAD_OUTER_MIN ? outer : inner.r! > SPREAD_INNER_MAX ? inner : undefined;
          if (off) {
            doubled = doubled.filter(([p]) => p === off.p);
            spreadNote.set(off.p, ` They were the ${off === outer ? "outer" : "inner"} spread on their line, ${off.r!.toFixed(1)} yalms from the center (${off === outer ? `outer spots are ${SPREAD_OUTER_MIN}+` : `inner spots are within ${SPREAD_INNER_MAX}`}).`);
          }
        }
      }
      if (!doubled.length) continue;
      const killed = doubled.filter(([p, es]) => life.diedFrom(p, es[es.length - 1].timestamp)).map(([p]) => p);
      const instKey = (e: PlayerEvent) => `${e.source}#${e.sourceInstance}`;
      for (const [p, es] of doubled) {
        const m = moved.get(p);
        const spot = m ? ` They stood at ${Math.round(m.now)} degrees around the boss, where their spot in the other Cyclonic Break was ${Math.round(m.before)}.` : "";
        const dead = everyone ? "" : " Someone was already dead, so the extra cones went to the living anyway.";
        // Who shared an instance with them.
        const mine = new Set(es.map(instKey));
        const others = uniq(res.filter((h) => h.p !== p && mine.has(instKey(h.e))).map((h) => h.p));
        const death = killed.includes(p);
        errors.push(playerError(p, {
          ruleId: FB_OVERLAP_RULE_ID, severity: killed.length ? "Major" : "Minor", name: `${fam.name} Overlap`,
          description: `Took ${es.length} ${fam.name} ${fam.what}s (${kFmt(es.reduce((s, e) => s + realAmount(e), 0))})${others.length ? ` together with ${namesOf(others)}` : ""}${death ? " and died" : killed.length ? `; ${namesOf(killed)} died` : ""}.${spot}${spreadNote.get(p) ?? ""}${dead} ${fam.why}`,
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
function detectStacks(players: PlayerInfo[], life: Life, deaths: DeathEvent[], end: number): PullError[] {
  const errors: PullError[] = [];
  for (const st of STACKS) {
    for (const res of clusterByGap(hitsOf(players, life, st.id, end), (h) => h.e.timestamp, 1000)) {
      const t0 = res[0].e.timestamp;
      if (!allAlive(players, life, t0 - 500)) continue;
      const per = byPlayer(res);
      // Someone killed at that moment by something else (Blasting Zone on a
      // stack's healer target) retargets the stacks: fallout (user,
      // 2026-10-12, T12 +0:50: both fire stacks on three after the healer
      // died to Blasting Zone; the line victims are flagged for it).
      if (players.some((p) => !per.has(p) && deaths.some((d) => d.player === p.name && d.timestamp >= t0 && d.timestamp <= t0 + DEATH_EVENT_LAG_MS + 1000))) continue;
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
 * - The first buster on the tank who wasn't the MT: they held aggro they
 *   shouldn't have (user, 2026-10-12, A26: the OT Shirked after the opener
 *   and still took it). The MT is the tank who Provoked at the pull
 *   (group A, every pull); without one this isn't checked.
 * - The holder killed by an auto-attack under the buster's Physical
 *   Vulnerability Up: the swap failed. The other tank is named when they
 *   didn't Provoke (A3; a Shirk alone doesn't move aggro). Group A's clean
 *   swap is a Provoke ~1.5s before the buster lands. When they did Provoke,
 *   both tanks are named (B/C: Provoked and still lost the holder).
 * - The holder killed by the buster itself: their mitigation.
 * - An expiry Burn Mark hitting a non-tank with all eight up: that player
 *   (they came closer than the other tank; user, A58).
 * - A tank killed by a single expiry Burn Mark: their mitigation (user,
 *   A4: not a mechanic failure).
 * A death-triggered Burn Mark's victims are fallout of the holder's death.
 */
function detectPowderMark(players: PlayerInfo[], life: Life, casts: EnemyEvent[], deaths: DeathEvent[], end: number, occurrences?: ReportedOccurrence[]): PullError[] {
  const errors: PullError[] = [];
  const tanks = players.filter(isTank);
  const provokes = (p: PlayerInfo) => p.casts.filter((e) => e.abilityName === "Provoke");
  // Only an opener Provoke says who the MT is: the first auto-attack named
  // the wrong tank in group C (its MT is the one who takes every buster).
  const mt = tanks.find((p) => provokes(p).some((e) => e.timestamp <= OPENER_PROVOKE_MS));
  castsOf(casts, POWDER, end).forEach((c, n) => {
    const holder = players.find((p) => p.name === c.target);
    // With a tank dead the buster goes to someone else: fallout.
    if (!holder || !isTank(holder)) return;
    const t = c.timestamp;
    for (const key of [FB_POWDER_SWAP_RULE_ID, FB_POWDER_DEATH_RULE_ID]) occurrences?.push({ mechanicKey: key, timestamp: t, players: tanks.map((p) => p.name) });
    const other = tanks.find((p) => p !== holder);
    const death = deaths.find((d) => d.player === holder.name && d.timestamp > t && d.timestamp <= t + 18_000);
    const wrongTank = n === 0 && mt && holder !== mt && life.alive(mt, t);
    if (wrongTank) {
      const shirk = holder.casts.find((e) => e.abilityName === "Shirk" && e.timestamp < t);
      errors.push(playerError(holder, {
        ruleId: FB_POWDER_SWAP_RULE_ID, severity: "Major", name: "Had Aggro for the First Powder Mark",
        description: `Held aggro when the first Powder Mark Trail went out, so it landed on them instead of ${mt!.name}, the main tank${shirk ? ` (they had Shirked at ${clock(shirk.timestamp)})` : ""}.${death?.killingAbilityGameId === POWDER ? " They died to it, setting off Burn Mark early." : ""} The main tank holds aggro for the first buster; the off-tank stays below them on enmity.`,
        timestamp: t, abilityId: POWDER, abilityName: "Powder Mark Trail",
      }));
    }
    if (death?.killingAbilityGameId === AUTO && other) {
      const provoke = provokes(other).find((e) => e.timestamp >= t - SWAP_PROVOKE_BEFORE_MS && e.timestamp <= death.timestamp);
      const lethal = `${holder.name} took an auto-attack under Powder Mark Trail's Physical Vulnerability Up and died (${sec(death.timestamp - t)}s after the buster), setting off Burn Mark early.`;
      for (const p of provoke ? tanks : [other]) {
        errors.push(playerError(p, {
          ruleId: FB_POWDER_SWAP_RULE_ID, severity: "Major", name: "Powder Mark Swap Missed",
          description: provoke
            ? `${lethal} ${other.name} did Provoke (${sec(Math.abs(provoke.timestamp - t))}s ${provoke.timestamp < t ? "before" : "after"} the buster), but ${holder.name} still had aggro. The log can't tell which tank's enmity was off.`
            : `${lethal} ${other.name} didn't Provoke: the other tank must Provoke as the buster goes out. A Shirk from the marked tank only helps; it doesn't move aggro on its own.`,
          timestamp: death.timestamp - DEATH_EVENT_LAG_MS, abilityId: AUTO, abilityName: "Attack",
        }));
      }
    } else if (death?.killingAbilityGameId === POWDER && !wrongTank) {
      errors.push(playerError(holder, {
        ruleId: FB_POWDER_DEATH_RULE_ID, severity: "Major", name: "Died to Powder Mark Trail",
        description: "Died to the Powder Mark Trail tank buster itself. It needs a mitigation cooldown; the death also set off Burn Mark early on the players nearest.",
        timestamp: t, abilityId: POWDER, abilityName: "Powder Mark Trail",
      }));
    }
    // The expiry Burn Mark (the holder still alive when the mark ran out).
    const expiry = holder.debuffs.find((e) => e.abilityId === POWDER_MARK && e.debuffStatus === "removed" && e.timestamp > t);
    if (!expiry || !life.alive(holder, expiry.timestamp)) return;
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
      return;
    }
    // With anyone dead the pull was already over (user, A17 +2:27).
    if (nonTanks.length && other && allAlive(players, life, expiry.timestamp - 500)) {
      const killed = nonTanks.filter((p) => hits.some((h) => h.p === p && life.diedFrom(p, h.e.timestamp)));
      // The non-tank came closer than the other tank: theirs alone (user,
      // 2026-10-12, A58 +0:41: Sarelie should have been further from the
      // holder; the other tank, ~13y away, was fine; clean 12-17y).
      for (const p of nonTanks) {
        errors.push(playerError(p, {
          ruleId: FB_BURN_MARK_RULE_ID, severity: killed.length ? "Major" : "Minor", name: "Burn Mark on a Non-Tank",
          description: `Burn Mark from ${holder.name}'s Powder Mark went to ${namesOf(nonTanks)} instead of ${other.name}: it hits the player nearest the marked tank, and they were closer to ${holder.name} than ${other.name} was.${killed.length ? ` ${namesOf(killed)} died.` : ""} The other tank stays closest to the marked tank; everyone else stays a few yalms further away, off to the side.`,
          timestamp: hits[0].e.timestamp, abilityId: BURN_MARK, abilityName: "Burn Mark",
        }));
      }
    }
    // Only with the other tank alive: otherwise the second explosion had
    // nowhere correct to go and the death is fallout (A45 +2:27.9).
    for (const h of hits.filter((x) => isTank(x.p) && other && life.alive(other, expiry.timestamp))) {
      if (life.diedFrom(h.p, h.e.timestamp)?.killingAbilityGameId !== BURN_MARK) continue;
      errors.push(playerError(h.p, {
        ruleId: FB_POWDER_DEATH_RULE_ID, severity: "Major", name: "Died to Burn Mark",
        description: `Died to their own Burn Mark at the end of Powder Mark Trail (${kFmt(realAmount(h.e))}) without enough mitigation. The mechanic resolved correctly (one explosion each); the tank needs a cooldown for it.`,
        timestamp: h.e.timestamp, abilityId: BURN_MARK, abilityName: "Burn Mark",
      }));
    }
  });
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
    // Both holders' marks end at the stacks; the one that exploded is the
    // holder who died (A13 +1:20: Laura's ended at her death, Yoro survived).
    const holders = players.filter((p) => p.debuffs.some((e) => e.abilityId === FATED_BURN_MARK && e.debuffStatus === "removed" && e.timestamp <= t + 200 && e.timestamp >= t - 1500));
    const holder = holders.find((p) => deaths.some((x) => x.player === p.name && x.timestamp - DEATH_EVENT_LAG_MS <= t && t - (x.timestamp - DEATH_EVENT_LAG_MS) <= 2500)) ?? holders[0];
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
 * each), else as everyone outside a clean resolution of the other side
 * (user, 2026-10-12, A19 +1:47: the MT was the missing fourth). With the
 * group alive:
 * - a player hit twice in one resolution (two cones, or cone + carrier);
 * - fire reaching the other group: Sinblaze's cone points at the helper
 *   nearest the carrier, so that helper is named alone (user, A53 +1:55
 *   and A61 +1:55: they stood 17-33 units from the carrier, the cone went
 *   across the arena; also A40 68, A42 38. Clean nearest helpers 90+);
 * - lightning with players of the other group in it (FALL_WRONG_SIDE+ of
 *   them: the helper whose cone pointed at them, else the carrier; fewer:
 *   those players);
 * - a short Sinblaze: the missing members of that group.
 * A death in a clean resolution is mitigation, never flagged (user, A15).
 */
function detectFallOfFaith(players: PlayerInfo[], life: Life, end: number): PullError[] {
  const errors: PullError[] = [];
  const res = clusterByGap(hitsOf(players, life, [SINBLAZE, FALL_CARRIER, BOW_SHOCK], end), (h) => h.e.timestamp, FALL_GAP_MS);
  const clean = (r: Hit[]) => byPlayer(r).size === 4 && [...byPlayer(r).values()].every((es) => es.length === 1);
  // Tether order = Prey order (applied ~1:33-1:41, before the first hit).
  const first = res[0]?.[0].e.timestamp ?? 0;
  const preyOrder = players.flatMap((p) => p.debuffs.filter((e) => e.abilityId === PREY && e.debuffStatus === "applied" &&
    e.timestamp <= first && first - e.timestamp <= PREY_BEFORE_FALL_MS).map((e) => ({ p, t: e.timestamp })))
    .sort((a, b) => a.t - b.t).map((x) => x.p);
  const carrierAt = (t: number) => players.find((p) => p.debuffs.some((e) => e.abilityId === FLOATING_FETTERS && e.debuffStatus === "applied" &&
    t - e.timestamp >= FETTERS_BEFORE_MS[0] && t - e.timestamp <= FETTERS_BEFORE_MS[1]));
  res.forEach((r, k) => {
    const t = r[0].e.timestamp;
    // Failing a clean one, a same-side resolution that hit exactly four
    // players including this tether's carrier (user, 2026-10-12, T34 +1:47:
    // tether 3 hit the ninja with its group, so the ninja's tether-1 cone
    // into the other group was theirs).
    const own = carrierAt(t);
    const partner = [res[k - 2], res[k + 2]].find((x) => x && clean(x)) ??
      [res[k - 2], res[k + 2]].find((x) => x && byPlayer(x).size === 4 && !!own && byPlayer(x).has(own));
    // Any resolution of the other side; failing a clean one, one that hit
    // exactly four players (user, 2026-10-12: A60 +1:47 Laura, read from a
    // clean tether 4; A43 +1:47 Sayacissa, from tether 4's four, doubled).
    // The four must share nobody with this resolution: a late tether after
    // deaths can sweep up both sides (A40 tether 4).
    const otherSide = [res[k - 1], res[k + 1], res[k - 3], res[k + 3]];
    const across = otherSide.find((x) => x && clean(x)) ??
      otherSide.find((x) => x && byPlayer(x).size === 4 && !x.some((h) => r.some((m) => m.p === h.p)));
    const group = partner ? new Set(partner.map((h) => h.p))
      : across && players.length === 8 ? new Set(players.filter((p) => !across.some((h) => h.p === p))) : undefined;
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
    const nth = `tether ${k + 1} (${fire ? "fire" : "lightning"})`;
    const base = { ruleId: FB_FALL_RULE_ID, severity: sev, timestamp: t, abilityId: r[0].e.abilityId, abilityName: r[0].e.abilityName } as const;
    // The carrier of the next tether on this side stands behind the current
    // carrier, so in a misread lightning tether (stacked as for fire) they
    // were in their spot; the others weren't (user, 2026-10-12, A46 +1:47:
    // the H1, tether 3's carrier, correct).
    // In tethers 3 and 4 it is the previous carrier of this side (user, A29
    // +1:55: Apollo, tether 2's carrier, correctly behind; Laura moved behind
    // instead of to the side).
    const sideCarrier = preyOrder[k + 2] ?? preyOrder[k - 2];
    const doubledHere = [...per].filter(([, es]) => es.length > 1).map(([p]) => p);
    const behind = !fire && sideCarrier && doubledHere.includes(sideCarrier) && doubledHere.length > 1 ? sideCarrier : undefined;
    for (const [p, es] of per) {
      if (es.length < 2 || p === behind) continue;
      errors.push(playerError(p, { ...base, name: "Fall of Faith Double Hit",
        description: `Took ${es.length} hits from Fall of Faith ${nth} (${kFmt(es.reduce((s, e) => s + realAmount(e), 0))}).${outcome} ${fire
          ? "Sinblaze is one fire cone shared by the carrier's group of four."
          : `This tether was lightning: the three helpers spread for their own Bow Shock cones (two to the sides, one behind${behind ? `: ${behind.name}, this side's other carrier, was correctly behind` : ""}). Stacking as if it were fire puts several cones on each player.`}` }));
    }
    // A death in a clean resolution is mitigation/healing, never flagged
    // here (user, 2026-10-12, A15/A34/A52/A55).
    // Fire into the other group: the helper nearest the carrier aimed it.
    const carrierHit = carrier && per.get(carrier)?.[0];
    if (fire && group && carrierHit?.x !== undefined && [...per.keys()].some((p) => !group.has(p))) {
      const dist = (e: PlayerEvent) => (e.x === undefined || e.y === undefined ? Infinity : Math.hypot(e.x - carrierHit.x!, e.y - carrierHit.y!));
      const near = [...per].filter(([p]) => p !== carrier).map(([p, es]) => ({ p, d: dist(es[0]) })).sort((a, b) => a.d - b.d)[0];
      const extras = [...per.keys()].filter((p) => !group.has(p));
      if (near && near.d < Infinity) {
        errors.push(playerError(near.p, { ...base, severity: "Major", name: "Pointed Sinblaze at the Other Group",
          description: `Stood ~${yd(near.d)} yalms from ${carrier!.name}, the fire carrier of ${nth}, the closest helper, so Sinblaze's cone pointed through them across the arena into the other group (${namesOf(extras)}).${outcome} Sinblaze aims at the helper nearest the carrier: stand a few yalms out on your group's side so the cone points away from the other group.` }));
        return;
      }
    }
    if (group) {
      const extras = [...per.keys()].filter((p) => !group.has(p));
      const pointer = !fire && extras.length >= FALL_WRONG_SIDE && carrierHit ? boltPointer(carrierHit, per, group, extras) : undefined;
      if (pointer) {
        errors.push(playerError(pointer.p, { ...base, severity: "Major", name: "Pointed Bow Shock at the Other Group",
          description: `Stood ~${yd(pointer.dist)} yalms from ${carrier!.name}, the lightning carrier of ${nth}, on the other group's side (${Math.round(pointer.off)} degrees off the line to them), so their Bow Shock cone hit ${extras.length} players of the other group (${namesOf(extras)}).${outcome} Each helper's cone points from the carrier through them: bait to the sides and behind, away from the other group.` }));
      } else if (extras.length >= FALL_WRONG_SIDE && carrier) {
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

/**
 * The lightning helper whose Bow Shock cone (120 degrees, from the carrier
 * through the helper) points at the other group: within BOW_HALF_CONE of
 * the direction from the carrier to the hit players of the other group.
 * A7 +1:47 (user: Jamie): 43 degrees; every other 3+-extras lightning
 * resolution in A, B and C had no own-group helper within 60.
 */
function boltPointer(c: PlayerEvent, per: Map<PlayerInfo, PlayerEvent[]>, group: Set<PlayerInfo>, extras: PlayerInfo[]) {
  const dir = (e: PlayerEvent) => Math.atan2(e.y! - c.y!, e.x! - c.x!) * 180 / Math.PI;
  const placed = extras.map((p) => per.get(p)![0]).filter((e) => e.x !== undefined && e.y !== undefined);
  if (!placed.length || c.y === undefined) return undefined;
  const cx = placed.reduce((s, e) => s + e.x!, 0) / placed.length, cy = placed.reduce((s, e) => s + e.y!, 0) / placed.length;
  const toward = Math.atan2(cy - c.y, cx - c.x!) * 180 / Math.PI;
  return [...per].filter(([p, es]) => group.has(p) && es[0].x !== undefined && es[0].y !== undefined && (es[0].x !== c.x || es[0].y !== c.y))
    .map(([p, es]) => ({ p, off: angleApart(dir(es[0]), toward), dist: Math.hypot(es[0].x! - c.x!, es[0].y! - c.y!) }))
    .filter((h) => h.off <= BOW_HALF_CONE).sort((a, b) => a.off - b.off)[0];
}

// ── Burnt Strike towers (~+2:26)────────────────────────────────────────────

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
      Math.abs(e.timestamp - c.timestamp) <= 1500 && !bodyHit(e)));
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

// ── a mechanic started with someone dead ────────────────────────────────────

/**
 * Nearly all of P1 needs all eight alive: eight Cyclonic Break cones, two
 * four-player groups for Utopian Sky, the tether stacks and Fall of Faith,
 * six tower soakers plus two tanks. Deaths are only survivable in the short
 * windows between (the Damage Down resets). So someone still dead when one
 * of these starts makes it unresolvable: a Raid marker just before it
 * (user, 2026-10-12, A4 +0:57: the OT dead going into the second Cyclonic
 * Break; A17: three dead going into the towers). The death's own cause is
 * flagged where it happened.
 */
function detectDeadGoingIn(players: PlayerInfo[], life: Life, casts: EnemyEvent[], end: number): PullError[] {
  // `need`: who must be alive (the towers only need the six non-tanks: C27
  // cleared P1 with the OT dead at them).
  const starts: { t: number; what: string; id: number; need?: (p: PlayerInfo) => boolean }[] = [];
  const first = (ids: number[], gap: number) => clusterByGap(hitsOf(players, life, ids, end), (h) => h.e.timestamp, gap).map((g) => g[0].e);
  for (const e of first([CYCLONIC_CONE], 1500)) starts.push({ t: e.timestamp, what: "Cyclonic Break", id: CYCLONIC_CONE });
  for (const e of first([40157, FIRE_STACK, THUNDER_SPREAD], 3000)) starts.push({ t: e.timestamp, what: "Utopian Sky", id: e.abilityId });
  for (const e of first([TETHER_STACK], 1000)) starts.push({ t: e.timestamp, what: "the tether stacks", id: TETHER_STACK });
  const fall = first([SINBLAZE, FALL_CARRIER, BOW_SHOCK], 10_000)[0];
  if (fall) starts.push({ t: fall.timestamp, what: "Fall of Faith", id: fall.abilityId });
  const tower = castsOf(casts, Object.keys(TOWER_NEED).map(Number), end)[0];
  if (tower) starts.push({ t: tower.timestamp, what: "the towers", id: tower.abilityId, need: (p) => !isTank(p) });
  for (const s of starts.sort((a, b) => a.t - b.t)) {
    const t = s.t - DEAD_GOING_IN_MS;
    const dead = players.filter((p) => (s.need ?? (() => true))(p) && !life.alive(p, t));
    if (!dead.length) continue;
    return [raidMarker(FB_DEAD_GOING_IN_RULE_ID, "Player Dead Going Into a Mechanic",
      `${namesOf(dead)} ${dead.length === 1 ? "was" : "were"} still dead when ${s.what} began. It needs ${s.need ? "all six non-tanks" : "all eight"} alive, so it's unresolvable from here; treated as the cutoff point. Raise before it, or don't die outside the short safe windows.`,
      t, s.id, s.what)];
  }
  return [];
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
    const near = resetCluster(silent.filter((x) => Math.abs(x.timestamp - d.timestamp) <= CALLED_WIPE_WINDOW), deaths);
    if (near.length >= CALLED_WIPE_COUNT) near.forEach((x) => out.add(x));
  }
  return new Set(resetCluster([...out], deaths));
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
    // Still holding Damage Down at the death, however old: dying where
    // nothing needs them to clear it is the right call (user, 2026-10-12,
    // T14 +1:21: the GNB reset after the tether stacks, 61s after it).
    if (!kb && holdsAt(p, DAMAGE_DOWN, d.timestamp - DEATH_EVENT_LAG_MS - 200)) continue;
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
  const called = calledWipeDeaths(deaths, enemyCasts, p2 === Infinity ? lastEvent : Infinity, end);

  const errors = [
    ...detectAvoidable(players, life, end),
    ...detectPersonalOverlaps(players, life, end),
    ...detectStacks(players, life, deaths, end),
    ...detectPowderMark(players, life, enemyCasts, deaths, end, occurrences),
    ...detectFatedBurnMark(players, life, deaths, end),
    ...detectTetherStacks(players, life, end),
    ...detectFallOfFaith(players, life, end),
    ...detectTowers(players, life, enemyCasts, end),
    ...detectDeadGoingIn(players, life, enemyCasts, end),
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
