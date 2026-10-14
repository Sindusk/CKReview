// lib/mechanics/ffxiv/trials/zelenia.ts
//
// -- GUIDE-DERIVED MODEL: ZELENIA --
// Recollection (Extreme), level 100, Dawntrail patch 7.2; Extreme only.
// Research checked 2026-10-14. Comment-only; no Zelenia report analyzed,
// no failures observed, no detector registered. LOG SIGNALS are predicted.
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
