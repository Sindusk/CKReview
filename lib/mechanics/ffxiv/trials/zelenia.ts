// lib/mechanics/ffxiv/trials/zelenia.ts
//
// ── DIGEST (read first; detail in the sections it names) ──
// What: FFXIV Zelenia trial, whole fight: timed opening (Catharsis, Shock,
//   Specter, EF1, Stock), kill-dependent party adds, six scripted Blooms,
//   Bloom1 repeat, tether busters, three Stock Breaks, Withering/Rose Red
//   enrage. Kills end 8:22-9:50 (Bloom6 or Bloom1 repeat). Arena center
//   (100,100) radius 16y. No Damage Down exists: avoidables give
//   Vulnerability Up 1001789.
// Rules (ids ffxiv-zelenia-*):
//   avoidable: Vulnerability Up causes (Thunder II, Shock, Power Break,
//     Valorous lines, Thunder Slash/IV, Encircling Thorns...); Minor, Major on
//     death. center: center Bleeding; Major when lethal.
//   specter (targeted tanks): non-tank in a cone names the tank who took none.
//   spearpoint: 3+ hit player-less, 1-2 hit named.
//   escelons: back-to-back or doubled EF cones, each player; nearly always lethal.
//   thunder-drop: drop on roses names dropper (overlap names both);
//     magic-break: the rose's dropper.
//   tower: marked player in a Bloom3/6 tower or two towers; empty-tower:
//     unmarked player with no tower (player-less if more than 2 left; add
//     towers always player-less).
//   share: living player missing Banish II/III or Stock Break.
//   fall: lone silent deaths, player-less.
//   Raid: quietus (adds 100 gauge), mass-deaths (4+ in 2.5s, over in 75s),
//     enrage (Rose Red), called-wipe, collapse (5 dead, over in 45s).
// Skips: drops, towers and EF skip resolutions with a player dead. Exposure is
//   everyone except specter.
// Cutoffs: Raid errors above; wipes need established unrecoverability, not one
//   penalty aura. Late Stocks are healing pressure, not a soft enrage.
// Key thresholds (A/B reports, 21 pulls, 8 kills): clock repeats within ~1s
//   per pull, add phase included; Quietus 2:31 (hit 2:37); clean EF volley hits
//   four alternating sets; Shock puddle pulses 43172 on circle holders are not
//   errors (0-2 in every kill). Quietus fail 43192/43214 and Rose Red never seen.
// Strategy: no static assignments supplied; community examples are not
//   assignments. Bloom6 single Holy hit with heavy mitigation is intended, not
//   an error. Rose-marked four drop Thunder III at Bloom4.
// Not built: Shock circle placement, add tower ownership/shade aim (no tethers
//   in log), Banish III splits, Bloom6 Holy (planned), rose placement beyond
//   Magic Break, Withering/Rose Red.
// Sections (grep the exact heading): "VERIFIED AGAINST LOGS (2026-10-14)"
//   pulls, clock, IDs, findings; "RULES IMPLEMENTED" rule list;
//   "GUIDE-DERIVED MODEL: ZELENIA"; "SOURCES AND PATCH SENSITIVITY";
//   "SEVERITY, ATTRIBUTION AND LOG VOCABULARY" status id mapping;
//   "SHAPE, CLOCK AND RESOURCES" tiles, reference clock;
//   "ROSE NETWORK RULES / EMBLAZON [BM]"; "ASSIGNMENTS AND STRATEGY VARIANCE";
//   "THORNED CATHARSIS / STOCK BREAK [BM, IV]";
//   "SHOCK / ALEXANDRIAN HOLY: OPENING [BM, DATA]";
//   "SPECTER OF THE LOST / ESCELONS' FALL [BM]";
//   "BLESSED BARRICADE / SPEARPOINT PUSH / PARTY ADDS [BM]";
//   "BLOOM1 / REPEAT: ALEXANDRIAN THUNDER II / III [BM]";
//   "BLOOM2 / BLOOM5: THUNDER SLASH, THUNDER IV, VALOROUS ASCENSION";
//   "BLOOM3: EMBLAZON / EXPANDED TOWERS [BM]";
//   "POST-BLOOM3: DONUT SHOCK / BANISH II / EF2 [BM, G8]";
//   "BLOOM4: ROSE/SPREAD NETWORK / ENCIRCLING THORNS / BANISH III";
//   "BLOOM6: TOWERS / EMBLAZON / HOLY HAZARD [BM, G8]";
//   "WHAT ENDS A PULL / OPEN QUESTIONS FOR LOG VERIFICATION".
// Open items: Shock/Stock/Valorous pulse counts, add gauge rate/reset, copied
//   tile and empty-tower event names, center vs wall Bleeding, real clocks
//   and quadrant drop map (see last section).
// ── END DIGEST ──
//
// -- VERIFIED AGAINST LOGS (2026-10-14) --
// A = Y9Fh2BHyj3xAqZ6V: 8 pulls, kills A3 (9:42), A5 (8:22), A7 (8:55),
//     A8 (8:37); wipes A1 A2 A4 A6.
// B = wNHvD38WTbFtGJKr: 13 pulls, kills B6 (9:47), B10 (9:50), B11 (8:53),
//     B13 (8:43); wipes B1-B5 B7-B9 B12.
// Both the user's static's (same roster, a few job swaps); B is the
// progression night. No VOD, nobody remembers the plan.
//
// Clock (A5; every pull within ~1s, the add phase included): Catharsis 0:11,
// Shock 0:31/towers 0:33, Specter 0:46, EF1 1:06-1:16, Stock 1:26,
// Barricade 1:35, add towers + Spearpoint 1:47/1:59/2:11/2:23, Quietus
// 2:31 (hit 2:37); Bloom1 2:52, Thunder III drops 3:21, Catharsis 3:28;
// Bloom2 3:38, Slash/Thunder IV 3:49-3:54, Specter 4:04; Bloom3 4:13,
// Emblazon 4:36, towers 4:41, Catharsis 4:48; Banish II 5:17, EF2
// 5:23-5:33, Stock 5:43; Bloom4 5:53, Emblazon + drops 6:08, Thorns 6:12,
// Banish III 6:22; Catharsis 6:32, Power Break 6:57, EF3 7:01-7:11, Power
// Break 7:12, Stock 7:21; Bloom5 7:33, Valorous 7:40, Slash/IV 7:51-7:56,
// Specter 8:06; Bloom6 8:18, Emblazon 8:39, Holy 8:42-8:46, towers 8:46.
// Kills end 8:22-9:50 (Bloom6 or the Bloom1 repeat); Rose Red, failed
// Quietus (43192/43214) and Magic Break's outer variant 43197 never seen.
//
// IDs (the model's BM candidates held):
// - NO DAMAGE DOWN. Avoidables give Vulnerability Up 1001789. Its causes:
//   Thunder II 43064/43199, Unmitigated Explosion 43069/43202, Shock 43178,
//   Power Break 43184/43185, Spearpoint Push 43187/43188, Queen's Crusade
//   43194, Valorous lines 43210, Thunder Slash 43216, Holy Hazard 43234,
//   Thunder III ground 43238, Thunder IV 43450/43451.
// - Shock: circles 43171 (each pulse its own instance, cast-targeted at
//   whoever it hits), puddle pulses 43172 (circle holders take 0-2 in every
//   kill: not an error), donut holders soak the 43226 towers. 43173-43176,
//   43178, 43179 are taken by nobody clean (B1 +0:33, B13 +0:31 died).
// - Light Resistance Down 1004164 <- Shock 43171 / Explosion 43201; Slashing
//   Resistance Down 1003130 <- Escelons' Fall 43183; Lightning Resistance
//   Down 1002998 <- Thunder III 43236; Magic Vulnerability Up 1003414 <-
//   Emblazon 43040 (the four rose-marked players).
// - Specter 43168 cast-targeted at each cone's taker. Explosion 43226/43201
//   cast-targeted at each tower's soaker; add towers 43068 (3 soakers each).
// - Center Bleeding: 1004137 on contact, 1004138 DoT (15s) after ~0.3s.
// - Encircling Thorns 43204 hits the unbroken vine pair (Thorny Vine 445).
//
// Findings:
// - Escelons' Fall: every clean volley hit four, alternating sets. Failures
//   are a player in two volleys in a row or two cones at once, nearly
//   always lethal: A2 +5:26 (three supports), A4, A6, B3 +5:23 (four DPS
//   doubled), B4, B6 (a kill), B9, A7/B10/B11 EF3 (kills).
// - Bloom4 Thunder III: a drop touching the roses spreads to all four marked
//   players (A3 +6:09 in a kill, A4 +6:08, B4 +6:13: four died each). The
//   drop's owner is the one unmarked player it hit. B12 +6:08 began with a
//   rose on a rose (Magic Break), then two drops on the roses.
// - Bloom1 drops: overlaps of two unmarked players (B4 +3:26, B5 +3:21 both
//   tanks). B3 and B6 deaths there were a dead player's moved drop and raw
//   damage at low HP.
// - Bloom3 / Bloom6 towers: one empty tower kills the marked four (B3, B9
//   +4:41: the unmarked player with no tower is the only one left; B8
//   +8:50). B7 +4:41: a silent death left a tower to a doubled soaker. B5
//   +8:45: a marked player in a tower, then everything.
// - Add phase: Spearpoint Push through the party ended A1, B1, B2 (1:47 /
//   2:11); the add towers' Unmitigated Explosion followed as fallout.
// - Specter: A3 +0:46 (kill) and B4 +0:46, a tank took no cone and a
//   non-tank died to it.
// - Power Break killed someone in A3, A5, A7, A8, B10, B11 (all kills).
// - Holy Hazard: the static takes one Holy cleave each, and the tower group
//   a second, in every kill (the BM/G8 mitigation plan). Not flagged.
// - Stock Break deaths (A3 +7:25 four DPS, A6) are raw damage after earlier
//   deaths: mitigation, not flagged.
//
// Cutoffs: A 2 mass deaths (A1 Spearpoint, A4 Thunder III), 1 called wipe
// (A2), 1 collapse (A6); B 9 mass deaths (Spearpoint B1/B2, Bloom3 towers
// B3/B7/B9, Thunder III B4/B12, Bloom6 towers B5/B8). No unexplained wipe.
//
// -- RULES IMPLEMENTED --
// - ffxiv-zelenia-avoidable: the Vulnerability Up causes above except
//   Holy Hazard, the Unmitigated Explosions and Spearpoint Push (own rules),
//   plus the rare Shock pulses and Encircling Thorns. Minor; Major on death.
// - ffxiv-zelenia-center: the center Bleeding; Major when it killed. The
//   boss's tank takes it at Bloom1/Bloom3 in most pulls.
// - ffxiv-zelenia-specter (targeted: tanks): a non-tank in a cone names the
//   tank who took none; with both tanks in, the non-tank stood in it.
// - ffxiv-zelenia-spearpoint: 3+ hit is player-less (tethers aren't in the
//   log); 1-2 hit are named.
// - ffxiv-zelenia-escelons: back-to-back or doubled cones, each player.
// - ffxiv-zelenia-thunder-drop: a drop on the roses names its dropper; an
//   overlap names both. ffxiv-zelenia-magic-break: the rose's dropper.
// - ffxiv-zelenia-tower: a marked player in a Bloom3/6 tower, or two towers.
//   ffxiv-zelenia-empty-tower: the unmarked player with no tower when 1-2
//   are left, else player-less; add towers always player-less.
// - ffxiv-zelenia-share: a living player missing Banish II/III or Stock Break.
// - ffxiv-zelenia-fall: lone silent deaths, player-less.
// - Raid: ffxiv-zelenia-quietus, -mass-deaths (4+ within 2.5s, over within
//   75s), -enrage (Rose Red), -called-wipe, -collapse (5 dead, over in 45s).
// Drops, towers and EF skip resolutions with a player dead (marks and sets
// move). Exposure is everyone except specter.
// Not built: Shock circle placement (the pulses' targets are their victims,
// not owners), add-phase tower ownership and shade aim (no tethers in the
// log), Banish III network splits (player-less geometry), Bloom6 Holy
// (planned), rose placement beyond Magic Break, Withering/Rose Red.
//
// -- GUIDE-DERIVED MODEL: ZELENIA --
// Recollection (Extreme), level 100, Dawntrail patch 7.2; Extreme only.
// Research checked 2026-10-14, written before any report was analyzed;
// its LOG SIGNALS are predictions. VERIFIED above wins disagreements.
//
// -- SOURCES AND PATCH SENSITIVITY --
// [BM] awgil/BossMod's firsthand Ex4Zelenia data: Enums, States, Tiles,
// Shock, Adds, EscelonsFall, Bloom1..6. Last encounter change 2026-09-30,
// revision 799524b33be594900dbad984ebb4d2ef8325d47a; not FFLogs proof:
// https://github.com/awgil/ffxiv_bossmod/tree/799524b33be594900dbad984ebb4d2ef8325d47a/BossMod.Modules/Dawntrail/Extreme/Ex4Zelenia
// [DATA] XIVAPI Action names/cast times checked for every candidate below:
// https://v2.xivapi.com/api/sheet/Action/43205?fields=Name,Cast100ms
// https://v2.xivapi.com/api/sheet/Status/3414?fields=Name,Description
// [IV] Lyra's original guide, updated 2025-03-30:
// https://www.icy-veins.com/ffxiv/recollection-extreme-trial-guide
// [G8] Game8's original Nukemaru/Kurapon explanation and Bloom6 mitigation:
// https://game8.jp/ff14/678687
// [JP] Published English macro/FAQ, tower networks and party splits:
// https://xivjpraids.com/7.0_dawntrail/extreme_trials/zelenia/
// [NA] Current Hector + EF2 Braindead/full-uptime convention:
// https://naurffxiv.com/extreme/recollection
// [TL] A'rhaeda Vhil's 2025-03-29 reference resolution timeline (unfinished):
// https://thaliak.com/extremes/recollection/
// [SE21] Patch7.21, 2025-04-22: sigil contrast improved, visual change:
// https://na.finalfantasyxiv.com/lodestone/topics/detail/6f824223a7e10da7b9b7dfc84f626d10d4df88b3/
// [SE3] Patch7.3, 2025-08-05: wipe-earned Echo +5%, max25%, after >=3m;
// HP/damage thresholds and kill-dependent add timing differ from launch:
// https://na.finalfantasyxiv.com/lodestone/topics/detail/c04405c6cbe8519a0b6c8aa5e4d88a5d447419c9
// Release dates checked against Lodestone maintenance announcements.
// No researched source establishes changed target counts or damage geometry.
//
// -- SEVERITY, ATTRIBUTION AND LOG VOCABULARY --
// All numeric IDs are game-data candidates for labeled cast/damage/aura
// events. Controller casts need not be damage. Names confirmed by DATA;
// log mappings, amounts and recipients remain unverified. Object IDs below
// identify game NPC types, not FFLogs actor IDs. Icons/maps may be absent.
// Sources describe increased damage taken, not an established Damage Down.
// Survived avoidables without DD are Minor; attributable death/wipe causes
// Major. A verified DD invokes README's Major exception; Raid = inevitable
// wipe/cutoff. Root cause may be the dropper/aimer, not the damage victim.
// Correctly executed damage deaths are mitigation issues. Death retargets,
// redistributed soaks and later missed duties from that death are fallout.
// Status->FFLogs candidates: Light Resistance Down II4164->1004164;
// Slashing Resistance Down3130->1003130; Lightning Resistance Down II2998
// ->1002998; Magic Vulnerability Up3414->1003414 (NOT Necron's 2941);
// Thorny Vine445->1000445; Bleeding4137/4138->1004137/1004138.
// BM also lists unexplained actor0x47C8 and boss/shade aura2056 extra0x382;
// no researched mechanic association established for those helpers.
// 2998 is reused by other fights, including Dancing Mad. Witch Hunt2970
// is a BM name for an unnamed boss status in DATA; extra0x2F6 close,
// 0x2F7 far. Availability of its extra field in FFLogs is unestablished.
//
// -- SHAPE, CLOCK AND RESOURCES --
// Circular arena center=(100,100), radius16y, hazardous wall. Bloom splits
// floor into 16 tiles: eight 45-degree slices, inner0..8y /outer8..16y [BM].
// Center radius2y becomes a Bleeding zone (Queen's Crusade43194 associated
// cast; exact damaging/tick ID unknown). Bleeding aura does not establish DD.
// Timed opening -> kill-dependent party adds -> six scripted Blooms ->
// repeat Bloom1 -> tether busters -> three Stock Breaks -> Withering/enrage.
// No boss-HP push found. Adds alone have Zelenia's Aether gauge: rises while
// fighting, 100 triggers failed Perfumed Quietus. Exact gain/reset unknown.
// BM ends adds when all die AND current shade baits/casts have resolved;
// its timeout is ~55s after spawn before failed return sequence. No revival.
// [TL] Approximate mm:ss reference, resolutions unless stated otherwise:
// 0:11 Catharsis; 0:22 Shock setup, 0:32 towers, 0:45 Specter;
// 1:06/1:09/1:12/1:15 EF1; 1:24..1:28 Stock; adds1:35;
// shade hits1:46/1:58/2:10/2:22, towers1:47/1:59/2:11;
// targetable2:28, successful Quietus Q=2:37.
// B1 2:52, ThunderII3:00, spreads3:21, Catharsis3:28;
// B2 3:38, in/out3:48/3:51, Specter4:04;
// B3 4:13, Emblazon4:35, towers4:40, Catharsis4:48;
// donuts5:15/BanishII5:16, EF2 5:22/5:25/5:28/5:32, Stock5:41..5:45;
// B4 5:53, Emblazon6:07/spreads6:08, Thorns6:11/BanishIII6:20;
// Catharsis6:32, EF3 7:00/7:03/7:06/7:09, Stock7:19..7:23;
// B5 7:33, Valorous7:39..7:42, in/out+lines7:51/7:54, Specter8:06;
// B6 8:18, Emblazon8:38, Holy8:41/8:44, towers8:44;
// B1 repeat8:55, ThunderII9:04/spreads9:25, Catharsis9:32/Specter9:43;
// Stocks9:57..10:01,10:10..10:14,10:23..10:27;
// Withering10:32, Rose Red10:45 (~Q+488s).
// Shift post-add references with actual Q; not a verified fixed pull clock.
// IV/BM/TL disagree on some pulse counts, listed in open questions below.
//
// -- ROSE NETWORK RULES / EMBLAZON [BM] --
// Candidates: Bloom controllers43193/43540..43544 (2.6s); Emblazon
// controller43195 (3s), marked-player action43040 ~6.7s after rose icon;
// BAD-PLACEMENT penalty Magic Break43196 inner /43197 outer.
// What happens: roses propagate a touching attack/soak through connected
// rose tiles. Adjacency is side-to-side around each ring or inner<->outer
// in same slice, NOT diagonal. A circle's edge touching a rose can activate
// the network even when its carrier stands on a blank tile. Emblazon adds
// four roses on one role group's occupied tiles and gives Magic Vuln.
// Correct play: four distinct blank tiles, then vacate before tower damage;
// build the network the current mechanic needs. Never drop on existing rose.
// Failure: existing-rose drop -> LOG SIGNAL: Magic Break; FAULT: marked
// dropper if identified; CONSEQUENCE: Major when lethal, Raid if unresolvable.
// Wrong network -> subsequent propagated hits/overlapping tower resolutions;
// FAULT: misplaced bud/drop carrier with map/position evidence, not all
// victims; Minor/Major by outcome. Same-tile simultaneous buds unresolved.
// Removal: activation consumes marks, new roses persist for mechanic;
// placement death/early-resolution behavior unknown. No dispel objective.
// Not errors: Emblazon own damage/vuln or standing on roses for valid soaks.
// Red floor alone is not a failure; incoming attack determines its danger.
//
// -- ASSIGNMENTS AND STRATEGY VARIANCE --
// No user static/slot map supplied. Community examples are not assignments.
// Generic clocks put supports on cardinals, DPS intercardinals [IV]; actual
// tank/healer clock ordering varies. Normal light parties G1=MT/H1/M1/R1,
// G2=OT/H2/M2/R2. JP tower pairs instead: MT+R1 NW, OT+R2 NE,
// H1+M1 SW, H2+M2 SE; maintain that plan's priorities, not generic T/M pairs.
// EF1/3: preassigned sets alternate volleys1/3 vs2/4; both groups moving
// vs only one adjusting are valid. G8 starts supports inside/DPS outside;
// first near/far cue determines first role, then prevent consecutive hits.
// Adds: supports W, DPS E; untethered three soak, tethered fourth aims shade.
// Bloom3: quadrant plan [IV] vs Kurapon relative to double-red inner tiles
// as N [G8/JP]. Both must produce four separate tower networks, not one.
// Bloom4 JP's four-blank safe quadrant is a2x2: near center M1/MT left,
// M2/OT right; farther out R1/H1 left, R2/H2 right. Only marked role drops.
// Afterwards gather true S, supports W /DPS E to break vines, and share
// Banish via outer southern roses.
// EF2: ordinary role stack/supports N/DPS S and free role first [G8]; NA
// favors separate EF2 Braindead/full-uptime arrangement. Its precise slot
// map was not available as text; no assertion that all use original Hector.
// Bloom6 normal: G1 N/G2 S, connect each tower to safe floor under final
// Holy cleave; tank/melee slots take inner tower, healer/ranged outer [IV].
// Alternate [G8/JP/BM]: keep tower networks separate, take ONE Holy hit with
// heavy mitigation or tank LB, accept its vuln, hold soak position. That
// intended Holy hit is not an error. Double Holy/failed tower is different.
//
// -- THORNED CATHARSIS / STOCK BREAK [BM, IV] --
// Candidates: Catharsis cast/damage43166 (5s). Stock controller43221 (7s),
// helper/damage43222..43225; each share radius6y, repeated ~1s apart.
// What happens: raidwide magical Catharsis; repeated stack on a marked
// player, healer per IV, with three closely spaced final volleys. Exact
// hit count disputed: IV says four, TL lists five early/six in later sets.
// Correct play: party shares/mitigates and heals between hits.
// Failure: leave stack -> fewer living assigned recipients, lethal split
// damage; FAULT: living absent soaker vs displaced holder needs positions;
// CONSEQUENCE: Major if death/wipe caused, Raid only if unresolvable.
// Removal: volley completes; BM notes later hits can stop if holder dies.
// Not errors: all intended raidwide/stack hits, or their raw mitigation deaths.
//
// -- SHOCK / ALEXANDRIAN HOLY: OPENING [BM, DATA] --
// Candidates: Shock controller43169 (3s); circle damage43171..43176,
// donut damage43178/43179;43170/43177 same-name helper roles unresolved.
// Holy controller43200 (3s), tower Explosion43226 (7s), candidate empty
// penalty Unmitigated Explosion43227. Circles radius4, donuts safe inside1y
// /danger to6y; persistent pulses ~5-6s after first hit [BM].
// What happens: four supports or DPS circles, other four donuts; four
// intercardinal single-soaker towers. Correct play: donut holders center
// on towers, hold still until pulses finish; circles drop clear then leave.
// Failure: extra Shock/puddle hit -> repeated damage + resistance penalty;
// FAULT: misplaced dropper vs touching player needs geometry; Minor/Major.
// Empty tower ->43227 candidate raid penalty; FAULT: assigned living donut
// holder only with tower identity; Major if attributable death/wipe, otherwise
// Minor, Raid only if unresolvable. Removal: pulses finish; marks consumed
// by drops. Not errors: own initial circle damage and correct Explosion.
// IV calls Shock fire; BM names Light Resistance Down II. Damage type and
// debuff association remain candidates, not a verified fire-resistance rule.
//
// -- SPECTER OF THE LOST / ESCELONS' FALL [BM] --
// Specter controller43167 (7s), damage43168 (0.7s), tether89; two physical
// 48y/60-degree full-angle cones on intercepted targets. Tanks each take
// a non-tank's tether, aim apart/outward, mitigate; no tank swap established.
// Failure: tether left/clip -> non-tank target or unintended cone victims;
// FAULT: missed tank vs misplaced party only with tether/position evidence;
// CONSEQUENCE: Minor/Major. Not errors: intended tank hits/invuln use.
// EF controller43181 (13s), repeat43182, damage43183: FOUR volleys of
// FOUR 24y/45-degree cones, first ~13.9s after cast start, ~3.1s apart.
// Nearest/farthest four bait according to stored boss cues; Slashing Down
// prevents repeated consecutive hits. THREE EF sequences total.
// Correct play: radial spacing, alternate bait sets, retain assigned angle.
// Failure: doubled cone/repeated bait -> multiple hits under Slashing Down;
// FAULT: wrong distance/angle baiter if established; Minor/Major by outcome.
// EF3 has fixed Power Break43184/43185 (6s) half-room cleaves before first
// bait and after fourth. Those cleaves aren't controlled by player tethers.
// Removal: tethers resolve with Specter; EF resistance debuff expires.
// Death retargets are fallout. Not errors: own single EF hit/Slashing Down.
//
// -- BLESSED BARRICADE / SPEARPOINT PUSH / PARTY ADDS [BM] --
// Candidates: controller43189 (3s); FOUR Roseblood Drop adds OID0x47C2
// (BM also lists0x485B variant); untargetable Zelenia's Shade OID0x47CA.
// Shade tether17; actual aimed hit Spearpoint Push43187/43188 (1.5s+0.7s),
// not later Power Break. Tower Explosion43068 (6s, radius3, minimum3);
// failed-soak candidate Unmitigated Explosion43069. Eight shade baits,
// one per player, ~12s paired waves; guides allow four paired tower sets.
// Correct play: kill all drops, tethered players orient shade's raised-sword
// side outward; other THREE on each role side soak, initially W tower SW /
// E tower NE. BM allows3..4 but excludes current baiter; three is intended.
// Failure: bad shade aim ->43187/43188 hits central party; FAULT: tether
// carrier vs wandering victim needs endpoints/orientation; Minor/Major.
// Miss tower ->43069; assigned absent live helper if known; Major if lethal,
// Raid if unresolvable. Adds survive gauge100 -> failed Quietus43192
// controller/43214 damage (9.2s helper); collective Raid failure.
// Removal: kills end add duty after current baits; no on-death explosion
// or revival established. Successful Quietus43191 controller/43213 damage
// is unavoidable; not an error. Tower/bait count may shorten with fast kills.
//
// -- BLOOM1 / REPEAT: ALEXANDRIAN THUNDER II / III [BM] --
// Candidates: II controller43198 (5s), first damage43199 (5.7s), repeated
// damage43064. III controller43235 (4.3s), personal hit43236 (5s),
// ground-target variant43238 (7.5s). Personal radius4y, propagates on roses.
// What happens: THREE rotating45-degree cones; BM models fifteen steps
// per sequence,10-degree advances ~1s apart. IV says >90 degrees overall;
// that conflicts with BM's ~140-degree advance. Eight personal III drops.
// Correct play: follow indicated CW/CCW behind cones on safe floor; spread
// so full circle footprint misses roses/others, not just center of marker.
// Failure: cone hit -> II damage, avoider Minor/Major. Bad III drop ->
// own +extra/propagated hits with Lightning Down; FAULT: identified dropper
// vs unsafe bystander needs network evidence; Minor/Major, Raid if doomed.
// Removal: drops resolve once; Lightning Down expires. Not errors: own III.
//
// -- BLOOM2 / BLOOM5: THUNDER SLASH, THUNDER IV, VALOROUS ASCENSION --
// Candidates [BM]: Slash controllers43448/43449 (6s), damage43216 (6.7s,
// 60-degree full-angle cone); IV circle43450 /donut43451 (6.7s), radius8
// boundary; ENUM outer16 but display extends to20. Six Slash helper cones.
// Correct play: read first in/out; start on side with one safe tile for
// first hit and two for second; change ring ~3s later, then dodge last cone.
// Bloom5 adds Valorous controller43206, expected raid damage43207..43209;
// Briar Thorn OID0x47C7 line43210 (5s,40y x8y), two paired line waves.
// Move around center to opposite safe region as lines and in/out switch.
// Failure: cone/IV/line hit -> respective damage/penalty; FAULT: avoider
// unless a wrong network caused it; Minor/Major by consequence.
// Removal: scripted hits/rose reset, no cleanse task. Not errors: expected
// Valorous raid pulses; their count/type disputed (IV says two physical).
//
// -- BLOOM3: EMBLAZON / EXPANDED TOWERS [BM] --
// Candidates: Bud of Valor43186 (3s), tower Explosion43201 (13s helper
// cast), failed-soak Unmitigated Explosion43202 candidate. FOUR towers.
// What happens: Emblazon role creates four roses; opposite role soaks one
// network each. Tower counts whole connected rose region, not only pip.
// Correct play: drop inner blank tiles, avoid linking TWO tower networks;
// four marked players vacate roses, four unmarked soak distinct networks.
// BM rejects outer drops and inner tiles that bridge adjacent tower regions.
// Failure: connect towers -> two Explosion hits on same network under vuln,
// or penalty if other network empty; FAULT: bad bud owner with map proof,
// Major if lethal/causes wipe, Raid if unresolvable. Marked extra soak ->
// Explosion under Magic Vuln; fault marked soaker, Minor/Major by outcome.
// Removal: correct tower resolves; buds persist through tower, then arena
// pattern changes. Not errors: remote connected-tile soak, own Explosion.
//
// -- POST-BLOOM3: DONUT SHOCK / BANISH II / EF2 [BM, G8] --
// Candidates: Banish controller43217 (5s), split damage43218 (radius5y).
// One support +one DPS stack target, normally four per ROLE stack; THREE
// others in one role get donut Shock (guide count; TL labels four).
// Correct play: supports N, DPS S, each role tightly shares stack; donut
// group holds safe donut holes, other role prepares EF's first bait, then
// alternate. EF2 Braindead varies assigned spots; role stacks are not LPs.
// Failure: overlap/leave role stack -> extra Shock/Banish damage or elevated
// split hit; FAULT: misplaced carrier/soaker with evidence; Minor/Major.
// Removal: donut pulses finish before transition; a brief own-stack Magic
// Vuln is expected. Not errors: own Banish and ordinary EF bait damage.
//
// -- BLOOM4: ROSE/SPREAD NETWORK / ENCIRCLING THORNS / BANISH III --
// Candidates [BM]: Thorns controller43203 (4s), failed-stretch damage43204;
// player Thorny Vine445, tether18. BanishIII controller43240 (4s), split
// damage43241 (radius4y), repeats to connected rose tiles touched by circle.
// What happens: four rose players join four adjacent blank tiles; other
// four III drops remain clear of that new network. Then four support-DPS
// chains break at ~20y separation within ~5.1s, simultaneous healer stack.
// Correct play: place/drop on opposite halves; assemble south, split W/E
// using intended outer rose network so all EIGHT share despite separation.
// Failure: III touches rose group ->43236/43238 hits marked players under
// Magic Vuln; FAULT: dropper if proven, Major if lethal, Raid if doomed.
// Miss stretch ->43204/ongoing Vine, fault unextended pair with duties;
// Minor/Major. Missing shared network -> too few Banish recipients/lethal
// split damage; fault disconnected holder/soaker only with geometric proof.
// Removal: stretch breaks chains; precise aura/tick removal needs checking.
// Not errors: remote Banish share, own stack, brief Vine while moving apart.
//
// -- BLOOM6: TOWERS / EMBLAZON / HOLY HAZARD [BM, G8] --
// Candidates: Holy controllers43231/43233 (7s), instant43065; damage43234
// (7.7s). Towers use43201/43202 again. TWO pairs of opposite cleaves,
// ~3.1s apart; BM ENUM says135 degrees but renderer/G8/IV imply120.
// Correct play: four buds connect separate inner/outer tower regions to
// safe tile, never connect towers together; unmarked role soaks, marked
// avoids tower damage. Normal plan dodges both cleaves; mitigation plan
// takes one, as documented above. Towers resolve just after final cleave.
// Failure: wrong network/soak -> Explosion/Unmitigated Explosion or two
// hits under vuln; root placement/assigned soaker with evidence, Major if
// lethal/wipe, Raid if unresolvable. Unplanned Holy ->43234/penalty,
// Minor/Major by consequence; planned one-hit soak is not a flag.
// Removal: tower resolution finishes puzzle; penalty aura expiry/death
// doesn't prove correction. Not errors: own tower or chosen cleave/vuln.
//
// -- WHAT ENDS A PULL / OPEN QUESTIONS FOR LOG VERIFICATION --
// Adds100 -> failed Quietus43214, Raid. Bad rose drop, connected towers,
// missed soaks or propagated III can wipe, but actual unrecoverability must
// be established, not inferred from one penalty aura. Late Stocks are a
// healing pressure sequence, not an established stacking boss soft enrage.
// Withering43545 (2.6s) ends layout; final Rose Red43205 (10s cast) is Raid
// hard enrage, reference10:45/~Q+488s. Center Bleeding or wall contact can
// be Major if lethal; blank-ability edge/reset deaths need source evidence.
// 1. Map actual cast/damage/penalty IDs, generic Vulnerability Up vs DD,
//    Shock light/fire semantics, and duration/reuse of resistance statuses.
// 2. Settle Shock pulse count (BM11 repeats vs state label11 total), Stock
//    pulse counts/increases, Valorous pulse count/type, Holy angle and II
//    rotation arc; controller/visual events may inflate published counts.
// 3. Confirm add gauge net rate/reset, maximum tower waves and kill-dependent
//    exit/Q-relative clock through hard enrage, including already-queued baits.
// 4. What event names copied tile hits, connected-tower double damage and
//    each empty-tower penalty? What happens to simultaneous same-tile buds,
//    or marks/tethers/queued Stock hits when their holder dies?
// 5. Which Bleeding belongs to center vs wall, and what is its damage tick?
//    Are ground objects/map updates and Witch Hunt extras present in capture?
// 6. Establish actual clocks, pairs, Kurapon/quadrant drop map, EF2 full-
//    uptime positions and Bloom6 mitigation plan before naming displaced
//    players or treating intentional rose/cleave damage as mistakes.

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import type { ReportedOccurrence } from "@/lib/mechanics/occurrences";
import { kFmt, joinNames, playerError, playerlessMinor, raidMarker, rezzedAt, clusterByGap, debuffIntervals, RAID_MARKER_SORT_OFFSET_MS } from "@/lib/mechanics/wow/common";

export const ZL_AVOIDABLE_RULE_ID   = "ffxiv-zelenia-avoidable";
export const ZL_CENTER_RULE_ID      = "ffxiv-zelenia-center";       // Queen's Crusade's center Bleeding
export const ZL_SPECTER_RULE_ID     = "ffxiv-zelenia-specter";      // Specter of the Lost tank tethers
export const ZL_PUSH_RULE_ID        = "ffxiv-zelenia-spearpoint";   // the shades' Spearpoint Push lines
export const ZL_EF_RULE_ID          = "ffxiv-zelenia-escelons";     // Escelons' Fall back-to-back / doubled cones
export const ZL_DROP_RULE_ID        = "ffxiv-zelenia-thunder-drop"; // Alexandrian Thunder III circles
export const ZL_MAGIC_BREAK_RULE_ID = "ffxiv-zelenia-magic-break";  // Emblazon rose on an existing rose
export const ZL_TOWER_RULE_ID       = "ffxiv-zelenia-tower";        // Bloom3/Bloom6 towers: marked soak, double soak
export const ZL_EMPTY_TOWER_RULE_ID = "ffxiv-zelenia-empty-tower";  // Unmitigated Explosion
export const ZL_SHARE_RULE_ID       = "ffxiv-zelenia-share";        // Banish II/III and Stock Break stacks
export const ZL_FALL_RULE_ID        = "ffxiv-zelenia-fall";
export const ZL_QUIETUS_RULE_ID     = "ffxiv-zelenia-quietus";      // adds alive at Perfumed Quietus
export const ZL_MASS_DEATHS_RULE_ID = "ffxiv-zelenia-mass-deaths";
export const ZL_ENRAGE_RULE_ID      = "ffxiv-zelenia-enrage";
export const ZL_CALLED_WIPE_RULE_ID = "ffxiv-zelenia-called-wipe";
export const ZL_COLLAPSE_RULE_ID    = "ffxiv-zelenia-collapse";

// Thorned Catharsis, Shock, Specter of the Lost: every pull opens with them.
const SIGNATURE        = [43166, 43169, 43167];
const SPECTER          = 43168;
const ESCELONS_FALL    = 43183;
const THUNDER_DROP     = 43236;
const MAGIC_BREAK      = [43196, 43197];
const TOWER            = 43201;   // Bloom3 / Bloom6 Explosion, cast-targeted at each soaker
const TOWER_EMPTY      = 43202;   // their Unmitigated Explosion
const ADD_TOWER_EMPTY  = 43069;   // the add phase's Unmitigated Explosion
const SPEARPOINT       = [43187, 43188];
const BANISH_II        = 43218;
const BANISH_III       = 43241;
const STOCK_BREAK      = [43222, 43223, 43224, 43225];
const QUIETUS_FAIL     = 43214;
const ROSE_RED         = 43205;   // hard enrage
const MAGIC_VULN       = 1003414; // Emblazon's mark
const CENTER_BLEED     = 1004137;
const CENTER_BLEED_DOT = 1004138;
// Raid-wide damage: deaths to it are mitigation, never part of a mass-death cutoff.
const RAIDWIDE = [43166, 43213, ...STOCK_BREAK, 43207, 43208, 43209];

// Avoidable hits: every cause of Vulnerability Up 1001789 except Holy Hazard
// (the static takes it on purpose, see RULES), plus the Shock pulses nobody
// takes cleanly and Encircling Thorns. No Damage Down exists in this fight,
// so a survived hit is Minor and a lethal one Major.
type Avoidable = { name: string; why: string };
const SHOCK_WHY = "Shock's circles leave pulsing puddles and its donuts pulse around their holders; drop your circle clear of the others, then stay out of every puddle and donut until the pulses end.";
const THUNDER_II_WHY = "Alexandrian Thunder II's three cones rotate; follow the rotation behind them on safe floor.";
const AVOIDABLE: Record<number, Avoidable> = {
  43064: { name: "Alexandrian Thunder II", why: THUNDER_II_WHY },
  43199: { name: "Alexandrian Thunder II", why: THUNDER_II_WHY },
  43173: { name: "Shock", why: SHOCK_WHY },
  43174: { name: "Shock", why: SHOCK_WHY },
  43175: { name: "Shock", why: SHOCK_WHY },
  43176: { name: "Shock", why: SHOCK_WHY },
  43178: { name: "Shock", why: SHOCK_WHY },
  43179: { name: "Shock", why: SHOCK_WHY },
  43184: { name: "Power Break", why: "The shade's Power Break cleaves half the room; stand on the side its sword isn't raised over." },
  43185: { name: "Power Break", why: "The shade's Power Break cleaves half the room; stand on the side its sword isn't raised over." },
  43194: { name: "Queen's Crusade", why: "Queen's Crusade hits around Zelenia as each Bloom starts; stay off the center." },
  43216: { name: "Thunder Slash", why: "Thunder Slash fires six cones in turn; read the first in/out and move behind each cone." },
  43450: { name: "Alexandrian Thunder IV", why: "Alexandrian Thunder IV is a circle then a donut (or the reverse); change ring between them." },
  43451: { name: "Alexandrian Thunder IV", why: "Alexandrian Thunder IV is a circle then a donut (or the reverse); change ring between them." },
  43238: { name: "Alexandrian Thunder III", why: "Bloom4's ground Thunder III circles land where the rose players stood; move off them." },
  43210: { name: "Valorous Ascension", why: "The Briar Thorns fire lines across the arena during Valorous Ascension; move around to the opposite safe side." },
  43204: { name: "Encircling Thorns", why: "Encircling Thorns tethers a support and a DPS; run apart (~20y) right away to break the vine." },
};

// FFLogs logs the death event ~2.0s after the fatal hit (README).
const DEATH_EVENT_LAG_MS = 2000;
const DIED_FROM_HIT_MS   = 3000;
const EPISODE_MS         = 3000;
const RAISE_GRACE_MS     = 10_000;
const TANK_ENMITY_LOST_MS = 30_000;
// Escelons' Fall volleys run ~3.1s apart; a longer gap is the next sequence.
const EF_VOLLEY_GAP_MS   = 4500;
// Deaths to one moment's mechanics that end the pull: 4+ within 2.5s and the
// pull over within 75s. B9's Bloom3 tower (4:44) ended 63s later; the kills
// A3 (Thunder III, 6:11) and B11 (Power Break, 7:15) carried on 98-211s.
const MASS_DEATHS        = 4;
const MASS_WINDOW_MS     = 2500;
const MASS_END_MS        = 75_000;
const CALLED_WIPE_END_MS = 12_000;
const CALLED_WIPE_COUNT  = 3;
const CALLED_WIPE_WINDOW = 10_000;
const CALLED_WIPE_PAIR_MS = 5_000;
// 5 dead with the pull over within 45s. A3 (a kill) and B8 carried on
// 156-198s with 5 dead; every wipe's 5-dead moment ended within 26s.
const COLLAPSE_DEAD_COUNT = 5;
const COLLAPSE_END_MS     = 45_000;

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
function hitsOf(players: PlayerInfo[], life: Life, ids: number | number[]): Hit[] {
  const set = new Set(Array.isArray(ids) ? ids : [ids]);
  const out: Hit[] = [];
  for (const p of players) {
    for (const e of p.damageTaken) {
      if (!set.has(e.abilityId) || e.healthBefore === 0) continue;
      if (life.hitAlive(p, e.timestamp)) out.push({ p, e });
    }
  }
  return out.sort((a, b) => a.e.timestamp - b.e.timestamp);
}

const castsOf = (casts: EnemyEvent[], ids: number | number[]) => {
  const set = new Set(Array.isArray(ids) ? ids : [ids]);
  return casts.filter((c) => set.has(c.abilityId)).sort((a, b) => a.timestamp - b.timestamp);
};

// Hits this large are FFLogs' unpaired previews of lethal hits (README).
const PREVIEW_AMOUNT = 1_500_000;
/** "~120k", or "lethal" when a hit in the set is a lethal preview. */
const amountText = (es: PlayerEvent[]) => es.some((e) => (e.amount ?? 0) >= PREVIEW_AMOUNT)
  ? "lethal" : kFmt(es.reduce((s, e) => s + Math.min(e.amount ?? 0, PREVIEW_AMOUNT), 0));

const uniq = <T,>(xs: T[]) => [...new Set(xs)];
const namesOf = (ps: PlayerInfo[]) => joinNames(uniq(ps).map((p) => p.name));
const isTank = (p: PlayerInfo) => p.role === "Tank";
const instanceKey = (e: PlayerEvent) => `${e.abilityId}|${e.source}#${e.sourceInstance}`;
const castKey = (c: EnemyEvent) => `${c.abilityId}|${c.actorName}#${c.sourceInstance}`;
const byName = (players: PlayerInfo[], name?: string) => (name ? players.find((p) => p.name === name) : undefined);
const landed = (e: PlayerEvent) => (e.amount ?? 0) > 0;
const allAlive = (players: PlayerInfo[], life: Life, t: number) => players.every((p) => life.hitAlive(p, t));

/** Exactly two tanks, both alive and holding enmity at `t` (otherwise targets move as fallout). */
function tanksHealthy(players: PlayerInfo[], life: Life, t: number): boolean {
  const tanks = players.filter(isTank);
  return tanks.length === 2 && tanks.every((p) => life.hitAlive(p, t) && !life.outIntervals.some((w) => w.p === p && w.start <= t && w.end >= t - TANK_ENMITY_LOST_MS));
}

/** Raised within RAISE_GRACE_MS before `t` (or still out at `t`). */
function inRaiseGrace(life: Life, p: PlayerInfo, t: number): boolean {
  return !life.hitAlive(p, t) || life.outIntervals.some((w) => w.p === p && w.end <= t && t - w.end < RAISE_GRACE_MS);
}

/** Holding Emblazon's Magic Vulnerability Up at `t`: a rose-marked player. The hit that spreads onto the roses removes it in its own millisecond. */
const marked = (p: PlayerInfo, t: number) => debuffIntervals(p, MAGIC_VULN).some((w) => w.start <= t + 100 && w.end >= t);

// ── plain avoidable hits ────────────────────────────────────────────────────

function detectAvoidable(players: PlayerInfo[], life: Life): PullError[] {
  const errors: PullError[] = [];
  const ids = Object.keys(AVOIDABLE).map(Number);
  for (const p of players) {
    const hits = p.damageTaken.filter((e) => ids.includes(e.abilityId) && e.healthBefore !== 0 && life.hitAlive(p, e.timestamp) && landed(e));
    for (const g of clusterByGap(hits, (e) => e.timestamp, EPISODE_MS)) {
      const kinds = uniq(g.map((e) => AVOIDABLE[e.abilityId]));
      const death = life.diedFrom(p, g[g.length - 1].timestamp);
      const names = uniq(kinds.map((k) => k.name));
      errors.push(playerError(p, {
        ruleId: ZL_AVOIDABLE_RULE_ID, severity: death ? "Major" : "Minor", name: `Hit by ${names.join(" / ")}`,
        description: `Hit by ${joinNames(names)} (${g.length > 1 ? `${g.length} hits, ` : ""}${amountText(g)}), with Vulnerability Up.${death ? " They died." : ""} ${uniq(kinds.map((k) => k.why)).join(" ")}`,
        timestamp: g[0].timestamp, abilityId: g[0].abilityId, abilityName: g[0].abilityName,
      }));
    }
  }
  return errors;
}

/**
 * Queen's Crusade leaves a small Bleeding zone at the center: contact gives
 * 1004137, which becomes the 1004138 DoT ~0.3s later (15s). The boss's tank
 * gets it most (A4, B8, B10, B11, kills included); B8 +8:00 died to it.
 */
function detectCenter(players: PlayerInfo[], life: Life, deaths: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const p of players) {
    const applies = p.debuffs.filter((e) => e.abilityId === CENTER_BLEED && e.debuffStatus === "applied" && life.hitAlive(p, e.timestamp));
    for (const g of clusterByGap(applies, (e) => e.timestamp, 20_000)) {
      const t = g[0].timestamp;
      const d = deaths.find((x) => x.player === p.name && x.timestamp >= t && x.timestamp <= t + 20_000 &&
        [CENTER_BLEED, CENTER_BLEED_DOT].includes(x.killingAbilityGameId));
      errors.push(playerError(p, {
        ruleId: ZL_CENTER_RULE_ID, severity: d ? "Major" : "Minor", name: "Stood in the Center",
        description: `Stepped into the Bleeding zone Queen's Crusade leaves at the arena's center${d ? ", and died to its Bleeding" : " and took its Bleeding DoT"}. The center 2y stays dangerous for the whole Bloom; hold the boss just off it.`,
        timestamp: t, abilityId: CENTER_BLEED, abilityName: "Bleeding",
      }));
    }
  }
  return errors;
}

// ── Specter of the Lost ─────────────────────────────────────────────────────

/**
 * Two tethers land on random players; the tanks take them and aim the cones
 * outward. Every kill resolution had exactly the two tanks hit. A non-tank
 * hit with both tanks healthy names the tank who took no cone (A3 +0:46,
 * B4 +0:46: two non-tanks died). With both tanks in cones, a non-tank hit
 * stood in a tank's cone. Skipped unless both tanks are healthy.
 */
function detectSpecter(players: PlayerInfo[], life: Life, occurrences?: ReportedOccurrence[]): PullError[] {
  const errors: PullError[] = [];
  for (const res of clusterByGap(hitsOf(players, life, SPECTER), (h) => h.e.timestamp, 1500)) {
    const t = res[0].e.timestamp;
    if (!tanksHealthy(players, life, t - DIED_FROM_HIT_MS)) continue;
    const tanks = players.filter(isTank);
    occurrences?.push({ mechanicKey: ZL_SPECTER_RULE_ID, timestamp: t, players: tanks.map((p) => p.name) });
    const victims = uniq(res.filter((h) => !isTank(h.p) && landed(h.e) && !inRaiseGrace(life, h.p, t)).map((h) => h.p));
    if (!victims.length) continue;
    const died = victims.filter((p) => life.diedFrom(p, t)?.killingAbilityGameId === SPECTER);
    const deathText = died.length ? ` ${namesOf(died)} died.` : "";
    const missing = tanks.filter((p) => !res.some((h) => h.p === p));
    const dmg = amountText(res.filter((h) => victims.includes(h.p)).map((h) => h.e));
    if (missing.length) {
      for (const p of missing) {
        errors.push(playerError(p, {
          ruleId: ZL_SPECTER_RULE_ID, severity: died.length ? "Major" : "Minor", name: "Specter Tether Not Taken",
          description: `Took no Specter of the Lost cone, so ${namesOf(victims)} took it instead (${dmg}).${deathText} Each tank takes one of the two tethers from the party and aims the cone outward.`,
          timestamp: t, abilityId: SPECTER, abilityName: "Specter of the Lost",
        }));
      }
      continue;
    }
    for (const p of victims) {
      const d = life.diedFrom(p, t);
      errors.push(playerError(p, {
        ruleId: ZL_SPECTER_RULE_ID, severity: d ? "Major" : "Minor", name: "In a Specter Cone",
        description: `Stood in a tank's Specter of the Lost cone (${amountText(res.filter((h) => h.p === p).map((h) => h.e))}).${d ? " They died." : ""} The cones are wide; stay behind the boss while the tanks aim them outward.`,
        timestamp: t, abilityId: SPECTER, abilityName: "Specter of the Lost",
      }));
    }
  }
  return errors;
}

// ── Spearpoint Push (party adds) ────────────────────────────────────────────

/**
 * The shades' Spearpoint Push lines go where their tethered player turns
 * them; no kill took one. The tether isn't in the log, so a line through 3+
 * players (the shade aimed into the party: A1 +1:47, B1, B2) is player-less;
 * one or two hit stood in the line.
 */
function detectSpearpoint(players: PlayerInfo[], life: Life): PullError[] {
  const errors: PullError[] = [];
  const why = "Each tethered player turns their shade's raised sword away from the party, and everyone else stays clear of the shades' lines.";
  for (const res of clusterByGap(hitsOf(players, life, SPEARPOINT), (h) => h.e.timestamp, 1500)) {
    const t = res[0].e.timestamp;
    const victims = uniq(res.filter((h) => landed(h.e) && !inRaiseGrace(life, h.p, t)).map((h) => h.p));
    if (!victims.length) continue;
    const died = victims.filter((p) => life.diedFrom(p, res.filter((h) => h.p === p).pop()!.e.timestamp));
    if (victims.length >= 3) {
      errors.push(playerlessMinor(ZL_PUSH_RULE_ID, "Spearpoint Push Into the Party",
        `A shade's Spearpoint Push hit ${victims.length} players (${namesOf(victims)})${died.length ? `; ${namesOf(died)} died` : ""}. The log doesn't record whose tether aimed it. ${why}`,
        t, res[0].e.abilityId, "Spearpoint Push"));
      continue;
    }
    for (const p of victims) {
      const d = died.includes(p);
      errors.push(playerError(p, {
        ruleId: ZL_PUSH_RULE_ID, severity: d ? "Major" : "Minor", name: "Hit by Spearpoint Push",
        description: `Hit by a shade's Spearpoint Push (${amountText(res.filter((h) => h.p === p).map((h) => h.e))}), with Vulnerability Up.${d ? " They died." : ""} ${why}`,
        timestamp: t, abilityId: res[0].e.abilityId, abilityName: "Spearpoint Push",
      }));
    }
  }
  return errors;
}

// ── Escelons' Fall ──────────────────────────────────────────────────────────

/**
 * Four volleys of four cones ~3.1s apart; each cone gives Slashing
 * Resistance Down, so a player hit in two volleys in a row (or by two cones
 * in one) takes 2-3x and usually dies (A2 +5:26: three supports; B3 +5:23:
 * four DPS doubled). Every clean volley hit four players, alternating sets.
 * Each repeated player could have moved, so each is named. A sequence that
 * starts with a player dead is skipped (the sets shift).
 */
function detectEscelons(players: PlayerInfo[], life: Life): PullError[] {
  const errors: PullError[] = [];
  const volleys = clusterByGap(hitsOf(players, life, ESCELONS_FALL), (h) => h.e.timestamp, 1000);
  const why = "Escelons' Fall alternates between the nearest and farthest four; after your hit, move to the other distance so the next volley takes the other set.";
  for (const seq of clusterByGap(volleys, (v) => v[0].e.timestamp, EF_VOLLEY_GAP_MS)) {
    if (!allAlive(players, life, seq[0][0].e.timestamp)) continue;
    seq.forEach((v, i) => {
      const t = v[0].e.timestamp;
      const prev = i > 0 ? new Set(seq[i - 1].filter((h) => landed(h.e)).map((h) => h.p)) : new Set<PlayerInfo>();
      const counts = new Map<PlayerInfo, Hit[]>();
      for (const h of v) counts.set(h.p, [...(counts.get(h.p) ?? []), h]);
      for (const [p, hs] of counts) {
        if (inRaiseGrace(life, p, t) || !hs.some((h) => landed(h.e))) continue;
        const doubled = hs.length >= 2, again = prev.has(p);
        if (!doubled && !again) continue;
        const d = life.diedFrom(p, hs[hs.length - 1].e.timestamp);
        errors.push(playerError(p, {
          ruleId: ZL_EF_RULE_ID, severity: d ? "Major" : "Minor", name: doubled ? "Two Escelons' Fall Cones" : "Escelons' Fall Twice in a Row",
          description: `${doubled ? `Took ${hs.length} Escelons' Fall cones in one volley` : "Was hit by Escelons' Fall in two volleys in a row"}, under Slashing Resistance Down (${amountText(hs.map((h) => h.e))}).${d ? " They died." : ""} ${why}`,
          timestamp: t, abilityId: ESCELONS_FALL, abilityName: "Escelons' Fall",
        }));
      }
    });
  }
  return errors;
}

// ── Alexandrian Thunder III drops ───────────────────────────────────────────

/**
 * Eight drops at Bloom1 and its repeat, four at Bloom4; each is cast-targeted
 * at its dropper and every kill resolution hit only the droppers. A drop that
 * also hits an Emblazon-marked player (Magic Vulnerability Up) touched the
 * rose network and spreads to all four: A3 +6:09 and A4 (four DPS died), B4
 * and B12 (four supports). Its dropper is the error. A drop on another
 * unmarked player is an overlap, both named. The owner of a drop without a
 * logged target is the only unmarked player it hit. Skipped with a player
 * dead (the marks move: B6 +6:08).
 */
function detectDrops(players: PlayerInfo[], life: Life, casts: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const res of clusterByGap(hitsOf(players, life, THUNDER_DROP), (h) => h.e.timestamp, 1500)) {
    const t0 = res[0].e.timestamp, t1 = res[res.length - 1].e.timestamp;
    if (!allAlive(players, life, t0 - DIED_FROM_HIT_MS)) continue;
    const owners = new Map<string, PlayerInfo>();
    for (const c of casts) {
      if (c.abilityId !== THUNDER_DROP || c.timestamp < t0 - 2000 || c.timestamp > t1 + 200 || !c.target) continue;
      const p = byName(players, c.target);
      if (p) owners.set(castKey(c), p);
    }
    const byInst = new Map<string, Hit[]>();
    for (const h of res) byInst.set(instanceKey(h.e), [...(byInst.get(instanceKey(h.e)) ?? []), h]);
    for (const [k, hs] of byInst) {
      if (owners.has(k)) continue;
      const unmarked = uniq(hs.filter((h) => !marked(h.p, h.e.timestamp)).map((h) => h.p));
      const hit = uniq(hs.map((h) => h.p));
      if (unmarked.length === 1) owners.set(k, unmarked[0]);
      else if (hit.length === 1) owners.set(k, hit[0]);
    }
    const killedIn = (ps: PlayerInfo[]) => ps.filter((p) => {
      const last = res.filter((h) => h.p === p).pop();
      return last && life.diedFrom(p, last.e.timestamp)?.killingAbilityGameId === THUNDER_DROP;
    });
    const why = "Drop your Thunder III circle on your own blank tile: its whole circle must miss the roses and the other players, or it spreads through every connected rose.";
    const sharedNamed = new Set<PlayerInfo>();
    for (const [k, hs] of byInst) {
      const owner = owners.get(k);
      const roses = uniq(hs.filter((h) => h.p !== owner && marked(h.p, h.e.timestamp) && landed(h.e) && !inRaiseGrace(life, h.p, t0)).map((h) => h.p));
      const others = uniq(hs.filter((h) => h.p !== owner && !marked(h.p, h.e.timestamp) && landed(h.e) && !inRaiseGrace(life, h.p, t0)).map((h) => h.p));
      if (roses.length) {
        const died = killedIn(roses);
        const text = `hit the rose network, spreading Thunder III to the marked players (${namesOf(roses)}, under Magic Vulnerability Up)${died.length ? `; ${namesOf(died)} died` : ""}.`;
        if (owner) {
          errors.push(playerError(owner, {
            ruleId: ZL_DROP_RULE_ID, severity: died.length ? "Major" : "Minor", name: "Thunder III on the Roses",
            description: `Their Alexandrian Thunder III circle ${text} ${why}`,
            timestamp: t0, abilityId: THUNDER_DROP, abilityName: "Alexandrian Thunder III",
          }));
        } else {
          errors.push(playerlessMinor(ZL_DROP_RULE_ID, "Thunder III on the Roses",
            `An Alexandrian Thunder III circle (its dropper isn't in the log) ${text} ${why}`, t0, THUNDER_DROP, "Alexandrian Thunder III"));
        }
      }
      // No logged target and two unmarked players in it: they stood together
      // (B5 +6:09, both tanks in each other's circles; both died).
      if (!owner && others.length >= 2) {
        const died = killedIn(others);
        for (const p of others) {
          if (sharedNamed.has(p)) continue;
          sharedNamed.add(p);
          errors.push(playerError(p, {
            ruleId: ZL_DROP_RULE_ID, severity: died.length ? "Major" : "Minor", name: "Thunder III Overlap",
            description: `Shared an Alexandrian Thunder III circle with ${namesOf(others.filter((x) => x !== p))}, under Lightning Resistance Down.${died.length ? ` ${namesOf(died)} died.` : ""} ${why}`,
            timestamp: t0, abilityId: THUNDER_DROP, abilityName: "Alexandrian Thunder III",
          }));
        }
      }
      if (others.length && owner) {
        const died = killedIn([owner, ...others]);
        const sev = died.length ? "Major" : "Minor";
        const deathText = died.length ? ` ${namesOf(died)} died.` : "";
        errors.push(playerError(owner, {
          ruleId: ZL_DROP_RULE_ID, severity: sev, name: "Thunder III Overlap",
          description: `Their Alexandrian Thunder III circle also hit ${namesOf(others)}, under Lightning Resistance Down.${deathText} ${why}`,
          timestamp: t0, abilityId: THUNDER_DROP, abilityName: "Alexandrian Thunder III",
        }));
        for (const p of others) {
          errors.push(playerError(p, {
            ruleId: ZL_DROP_RULE_ID, severity: sev, name: "Thunder III Overlap",
            description: `Hit by ${owner.name}'s Alexandrian Thunder III circle as well as their own, under Lightning Resistance Down.${deathText} ${why}`,
            timestamp: t0, abilityId: THUNDER_DROP, abilityName: "Alexandrian Thunder III",
          }));
        }
      }
    }
  }
  return errors;
}

/** Magic Break: an Emblazon rose dropped on an existing rose (B12 +6:10, lethal). */
function detectMagicBreak(players: PlayerInfo[], life: Life): PullError[] {
  return hitsOf(players, life, MAGIC_BREAK).filter((h) => !inRaiseGrace(life, h.p, h.e.timestamp)).map((h) => {
    const d = life.diedFrom(h.p, h.e.timestamp);
    return playerError(h.p, {
      ruleId: ZL_MAGIC_BREAK_RULE_ID, severity: d ? "Major" : "Minor", name: "Rose on a Rose",
      description: `Their Emblazon rose landed on a tile that was already a rose, and Magic Break hit them (${amountText([h.e])}).${d ? " They died." : ""} Drop your rose on a blank tile, never on an existing rose.`,
      timestamp: h.e.timestamp, abilityId: h.e.abilityId, abilityName: "Magic Break",
    });
  });
}

// ── Bloom3 / Bloom6 towers ──────────────────────────────────────────────────

/**
 * Four towers, each cast-targeted at its soaker; the soakers are the four
 * players Emblazon didn't mark. Every kill had four soakers, one tower each.
 * Unmitigated Explosion = a tower left empty: hits everyone and kills the
 * marked four (B3, B9 +4:44; B5, B8 Bloom6). The unmarked living player with
 * no tower is named (B3, B9: one each). A marked player hit by a tower, or
 * an unmarked one taking two, is that player's error. Skipped with a player
 * dead (B7 +4:41: a death left a tower to a doubled soaker).
 */
function detectTowers(players: PlayerInfo[], life: Life, casts: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  const events = [...hitsOf(players, life, [TOWER, TOWER_EMPTY]).map((h) => h.e.timestamp), ...castsOf(casts, TOWER).map((c) => c.timestamp)];
  for (const g of clusterByGap(events, (t) => t, 4000)) {
    const t0 = g[0], t1 = g[g.length - 1];
    const res = hitsOf(players, life, TOWER).filter((h) => h.e.timestamp >= t0 - 500 && h.e.timestamp <= t1 + 500);
    const empty = hitsOf(players, life, TOWER_EMPTY).filter((h) => h.e.timestamp >= t0 - 500 && h.e.timestamp <= t1 + 500);
    const soakers = new Set(castsOf(casts, TOWER).filter((c) => c.timestamp >= t0 - 500 && c.timestamp <= t1 + 500).map((c) => c.target));
    const whole = allAlive(players, life, t0 - DIED_FROM_HIT_MS);
    if (empty.length) {
      const t = empty[0].e.timestamp;
      const died = uniq(empty.filter((h) => life.diedFrom(h.p, h.e.timestamp)?.killingAbilityGameId === TOWER_EMPTY).map((h) => h.p));
      const deathText = died.length ? ` ${namesOf(died)} died.` : "";
      const missing = players.filter((p) => !marked(p, t0) && !soakers.has(p.name) && life.hitAlive(p, t0) && !inRaiseGrace(life, p, t0));
      const why = "The four players Emblazon didn't mark each take one tower network; an empty tower's Unmitigated Explosion hits the whole party.";
      if (missing.length && missing.length <= 2) {
        for (const p of missing) {
          errors.push(playerError(p, {
            ruleId: ZL_EMPTY_TOWER_RULE_ID, severity: died.length ? "Major" : "Minor", name: "Missed a Tower",
            description: `Wasn't marked by Emblazon and took no tower, so a tower stayed empty and Unmitigated Explosion hit the party (${uniq(empty.map((h) => h.p)).length} hit).${deathText} ${why}`,
            timestamp: t, abilityId: TOWER_EMPTY, abilityName: "Unmitigated Explosion",
          }));
        }
      } else {
        errors.push(playerlessMinor(ZL_EMPTY_TOWER_RULE_ID, "Tower Left Empty",
          `A tower stayed empty and Unmitigated Explosion hit the party (${uniq(empty.map((h) => h.p)).length} hit).${deathText} ${why}`, t, TOWER_EMPTY, "Unmitigated Explosion"));
      }
    }
    if (!whole) continue;
    const byPlayer = new Map<PlayerInfo, Hit[]>();
    for (const h of res) if (landed(h.e)) byPlayer.set(h.p, [...(byPlayer.get(h.p) ?? []), h]);
    for (const [p, hs] of byPlayer) {
      if (inRaiseGrace(life, p, t0)) continue;
      const isMarked = marked(p, hs[0].e.timestamp);
      const n = uniq(hs.map((h) => instanceKey(h.e))).length;
      if (!isMarked && n < 2) continue;
      const d = life.diedFrom(p, hs[hs.length - 1].e.timestamp);
      errors.push(playerError(p, {
        ruleId: ZL_TOWER_RULE_ID, severity: d ? "Major" : "Minor", name: isMarked ? "Marked Player in a Tower" : "Took Two Towers",
        description: isMarked
          ? `Was marked by Emblazon (Magic Vulnerability Up) but was hit by ${n > 1 ? `${n} towers` : "a tower"} (${amountText(hs.map((h) => h.e))}).${d ? " They died." : ""} Marked players drop their roses and then leave the rose tiles before the towers go off.`
          : `Was hit by ${n} towers at once, under Light Resistance Down (${amountText(hs.map((h) => h.e))}).${d ? " They died." : ""} Each tower network takes one soaker; don't connect two towers' rose tiles or stand where they meet.`,
        timestamp: hs[0].e.timestamp, abilityId: TOWER, abilityName: "Explosion",
      }));
    }
  }
  return errors;
}

/** The add phase's towers: three soakers each. The log can't say whose tower it was. */
function detectAddTowers(players: PlayerInfo[], life: Life): PullError[] {
  const errors: PullError[] = [];
  for (const res of clusterByGap(hitsOf(players, life, ADD_TOWER_EMPTY), (h) => h.e.timestamp, 2000)) {
    const t = res[0].e.timestamp;
    const died = uniq(res.filter((h) => life.diedFrom(h.p, h.e.timestamp)?.killingAbilityGameId === ADD_TOWER_EMPTY).map((h) => h.p));
    errors.push(playerlessMinor(ZL_EMPTY_TOWER_RULE_ID, "Add Tower Left Empty",
      `An add-phase tower went off without its three soakers, and Unmitigated Explosion hit the party (${uniq(res.map((h) => h.p)).length} hit)${died.length ? `; ${namesOf(died)} died` : ""}. The three untethered players on each side soak their side's tower.`,
      t, ADD_TOWER_EMPTY, "Unmitigated Explosion"));
  }
  return errors;
}

// ── shared stacks ───────────────────────────────────────────────────────────

type Share = { name: string; ids: number[]; why: string };
const SHARES: Share[] = [
  { name: "Alexandrian Banish II", ids: [BANISH_II], why: "Banish II stacks on one support and one DPS; each role gathers tightly in its own stack." },
  { name: "Alexandrian Banish III", ids: [BANISH_III], why: "Banish III is shared by all eight through the southern roses; stand on the shared rose network after breaking your vine." },
  { name: "Stock Break", ids: STOCK_BREAK, why: "Stock Break hits its target's stack several times; the whole party stays in it until the last hit." },
];

/** A living player in none of a stack's hits left the others to share it short. */
function detectShares(players: PlayerInfo[], life: Life): PullError[] {
  const errors: PullError[] = [];
  for (const fam of SHARES) {
    for (const res of clusterByGap(hitsOf(players, life, fam.ids), (h) => h.e.timestamp, 1500)) {
      const t = res[0].e.timestamp;
      const hit = new Set(res.map((h) => h.p));
      const absent = players.filter((p) => !hit.has(p) && life.hitAlive(p, t) && !inRaiseGrace(life, p, t));
      if (!absent.length) continue;
      const killed = uniq(res.filter((h) => fam.ids.includes(life.diedFrom(h.p, h.e.timestamp)?.killingAbilityGameId ?? -1)).map((h) => h.p));
      const deathText = killed.length ? ` ${namesOf(killed)} died.` : "";
      for (const p of absent) {
        errors.push(playerError(p, {
          ruleId: ZL_SHARE_RULE_ID, severity: killed.length ? "Major" : "Minor", name: `Missed ${fam.name}`,
          description: `Took no part of ${fam.name}, so ${hit.size} players shared it.${deathText} ${fam.why}`,
          timestamp: t, abilityId: fam.ids[0], abilityName: fam.name,
        }));
      }
    }
  }
  return errors;
}

// ── deaths with no killing blow ─────────────────────────────────────────────

/** No-killing-blow deaths that are the wipe being called, not mistakes. */
function calledWipeDeaths(deaths: DeathEvent[], pullEnd: number): Set<DeathEvent> {
  const out = new Set<DeathEvent>();
  const silent = deaths.filter((d) => !d.killingAbilityGameId);
  for (const d of silent) {
    // Near the end, unless mechanic deaths follow it: B7 +4:41's lone silent
    // death left a Bloom3 tower short, and the party died to it after.
    const followed = deaths.some((x) => x.killingAbilityGameId && x.player !== d.player && x.timestamp > d.timestamp);
    if (pullEnd - d.timestamp <= CALLED_WIPE_END_MS && !followed) out.add(d);
    const near = silent.filter((x) => Math.abs(x.timestamp - d.timestamp) <= CALLED_WIPE_WINDOW);
    if (near.length >= CALLED_WIPE_COUNT) near.forEach((x) => out.add(x));
    const pair = silent.filter((x) => Math.abs(x.timestamp - d.timestamp) <= CALLED_WIPE_PAIR_MS);
    if (pair.length >= 2) pair.forEach((x) => out.add(x));
  }
  return out;
}

/**
 * Lone silent deaths, player-less so the review sees them: a wall or edge
 * death, or a lethal hit FFLogs dropped (B7 +4:41, before the Bloom3 towers).
 * A death right after an avoidable or mechanic hit is that hit's error.
 */
function detectSilentDeaths(players: PlayerInfo[], deaths: DeathEvent[], skip: Set<DeathEvent>): PullError[] {
  const errors: PullError[] = [];
  const explained = new Set([...Object.keys(AVOIDABLE).map(Number), ESCELONS_FALL, THUNDER_DROP, BANISH_III, ...SPEARPOINT, TOWER, TOWER_EMPTY, SPECTER]);
  for (const d of deaths) {
    if (d.killingAbilityGameId || skip.has(d)) continue;
    const p = byName(players, d.player);
    if (!p) continue;
    if (p.damageTaken.some((e) => explained.has(e.abilityId) && e.timestamp <= d.timestamp && e.timestamp >= d.timestamp - DIED_FROM_HIT_MS - 1000)) continue;
    errors.push(playerlessMinor(ZL_FALL_RULE_ID, "Died With No Killing Blow",
      `${p.name} died mid-pull with no killing blow: a wall death, or a lethal hit the log didn't record.`,
      d.timestamp - DEATH_EVENT_LAG_MS, 0, "Fall"));
  }
  return errors;
}

// ── cutoffs ─────────────────────────────────────────────────────────────────

/** 4+ deaths to one moment's mechanics (raidwides excluded), with the pull over soon after. */
function detectMassDeaths(deaths: DeathEvent[], pullEnd: number): PullError[] {
  const fatal = deaths.filter((d) => d.killingAbilityGameId && !RAIDWIDE.includes(d.killingAbilityGameId));
  for (const g of clusterByGap(fatal, (d) => d.timestamp, MASS_WINDOW_MS)) {
    if (uniq(g.map((d) => d.player)).length < MASS_DEATHS || pullEnd - g[0].timestamp > MASS_END_MS) continue;
    const kinds = uniq(g.map((d) => d.cause));
    return [raidMarker(ZL_MASS_DEATHS_RULE_ID, "Mass Deaths",
      `${g.length} players died together to ${joinNames(kinds)} (${joinNames(uniq(g.map((d) => d.player)))}), and the pull ended soon after. Treated as the cutoff point.`,
      g[0].timestamp - DEATH_EVENT_LAG_MS + RAID_MARKER_SORT_OFFSET_MS, g[0].killingAbilityGameId, kinds[0])];
  }
  return [];
}

// ── entry point ─────────────────────────────────────────────────────────────

/** Zelenia (Recollection, Extreme) errors. Self-gates on the boss's opening casts. */
export function detectZeleniaErrors(
  players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], occurrences?: ReportedOccurrence[],
): PullError[] {
  if (!enemyCasts.some((c) => SIGNATURE.includes(c.abilityId) && c.actorName?.startsWith("Zelenia"))) return [];
  const life = buildLife(players, deathEvents);
  const pullEnd = Math.max(0, ...players.flatMap((p) => [...p.damageTaken, ...p.casts].map((e) => e.timestamp)), ...deathEvents.map((d) => d.timestamp));
  const called = calledWipeDeaths(deathEvents, pullEnd);

  const errors = [
    ...detectAvoidable(players, life),
    ...detectCenter(players, life, deathEvents),
    ...detectSpecter(players, life, occurrences),
    ...detectSpearpoint(players, life),
    ...detectEscelons(players, life),
    ...detectDrops(players, life, enemyCasts),
    ...detectMagicBreak(players, life),
    ...detectTowers(players, life, enemyCasts),
    ...detectAddTowers(players, life),
    ...detectShares(players, life),
    ...detectSilentDeaths(players, deathEvents, called),
  ];
  const firstRaid = () => Math.min(...errors.filter((e) => e.severity === "Raid").map((e) => e.timestamp));

  const quietus = hitsOf(players, life, QUIETUS_FAIL)[0];
  if (quietus) {
    errors.push(raidMarker(ZL_QUIETUS_RULE_ID, "Roseblood Drops Not Killed",
      "Perfumed Quietus went off with Roseblood Drops still alive (their gauge filled), hitting the party for lethal damage. All four drops have to die before the gauge fills. Treated as the cutoff point.",
      quietus.e.timestamp, QUIETUS_FAIL, "Perfumed Quietus"));
  }
  for (const m of detectMassDeaths(deathEvents, pullEnd)) if (m.timestamp < firstRaid()) errors.push(m);

  const enrage = castsOf(enemyCasts, ROSE_RED)[0];
  if (enrage && enrage.timestamp < firstRaid()) {
    errors.push(raidMarker(ZL_ENRAGE_RULE_ID, "Rose Red (Enrage)",
      "Rose Red went off: Zelenia wasn't brought down before the hard enrage.",
      enrage.timestamp, ROSE_RED, "Rose Red"));
  }
  const calledList = deathEvents.filter((d) => called.has(d)).sort((a, b) => a.timestamp - b.timestamp);
  const calledPair = calledList.some((d, i) => i > 0 && d.timestamp - calledList[i - 1].timestamp <= CALLED_WIPE_PAIR_MS);
  if ((calledList.length >= CALLED_WIPE_COUNT || calledPair) && calledList[0].timestamp - DEATH_EVENT_LAG_MS < firstRaid()) {
    errors.push(raidMarker(ZL_CALLED_WIPE_RULE_ID, "Wipe Called",
      `${calledList.length} players died with no killing blow together (${joinNames(uniq(calledList.map((d) => d.player)))}): the wipe was called and the raid reset.`,
      calledList[0].timestamp - DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  const outAt = (t: number) => players.filter((p) => !life.alive(p, t));
  const collapseT = life.outIntervals.map((w) => w.start).sort((a, b) => a - b)
    .find((t) => outAt(t).length >= COLLAPSE_DEAD_COUNT && pullEnd - t <= COLLAPSE_END_MS);
  if (collapseT !== undefined && collapseT + DEATH_EVENT_LAG_MS < firstRaid()) {
    const who = outAt(collapseT).map((p) => p.name);
    errors.push(raidMarker(ZL_COLLAPSE_RULE_ID, "Party Collapse",
      `${who.length} players were dead at once (${joinNames(who)}). Treated as the cutoff point.`,
      collapseT + DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
