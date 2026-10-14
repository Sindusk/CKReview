// lib/mechanics/ffxiv/trials/queen-eternal.ts
//
// -- VERIFIED AGAINST LOGS (2026-10-14) --
// A = r83YhVvDwpzBkLyF: 16 pulls, kill A16 (9:43).
// B = rFQT8XZckzvH1LNx: 13 pulls, kills B3 (9:24) and B13 (9:49).
// Both the user's static's (some players on other jobs or swapped out). Nobody
// remembers the plan and there's no VOD; roles.ts slots are correct.
//
// Clock (A16; every pull within ~1s): Aethertithe 0:16 (cones 0:26/0:35/
// 0:44, Retribute 0:29/0:38/0:47), Wind 1:00 (Aeroquell 1:14, Force 1:27,
// gusts 1:33), World Shatter 1:41, Prosecution 1:54, Divide and Conquer
// 2:07 (recast 2:18), Royal Domain 2:26, Earth 2:40 (towers 3:08, Empire
// 3:20 with towers 3:22, meteors 3:34/3:41, Weighty Blow 3:48-3:58), World
// Shatter 4:03, Prosecution 4:15, Coronation 4:24 (Atomic Ray 4:37),
// Absolute Authority 4:54 (push 5:15), Ice 5:32 (Freezing Up 5:42, Rush
// 5:59, Force 6:07, second freeze 6:20, Drear Rising 6:26-6:49), World
// Shatter 6:56, Authority Eternal 7:10 (pushed). P2: Radical Shift 7:50/
// 8:09, World Shatter 8:22, Distortion 8:33, Grasp 8:44, Dying Memory 8:50,
// Banishment 9:06, Radical Shift 9:38. No pull saw the enrages (failed
// Authority Eternal 41036, Preservation 41053).
//
// IDs (the model's candidates held, with these log facts):
// - NO DAMAGE DOWN in the fight. Avoidables give Vulnerability Up 1001789
//   (Legitimate Force 40990/40992/40993/40994, Divide and Conquer's recast
//   30505, Absolute Authority puddles 41027, lonely Heel 41033, Distortion
//   41043/41044, both Big Bursts, Shatter 41021); Rush gives Physical
//   Vulnerability Up 1002940, Ice Dart Ice Resistance Down II 1002465, the
//   shares and spreads Magic Vulnerability Up 1002941.
// - Cast-targeted (the owner): Divide and Conquer lines 40984 (caster
//   instances repeat within the set), Earth towers Burst 41001 (the soaker),
//   Gravity Pillar 41004 / Ray 41005, Meteor Impact 41007/41008, Atomic Ray
//   40982, Rush 41017/41018 (penalty 41019/41020), Ice Dart 41023, Radical
//   Shift 41040. Some casts lose their target in the log.
// - Meteor Impact: 41007 = landed on a platform (a boulder), 41008 = fell
//   into the void. Each lands only on its own player. Weighty Blow 41012 is
//   the line hitting a player; 41010 a boulder blocking it.
// - Tyranny's Grasp 41048 is the tank tower's miss penalty (A15: the tower's
//   tank was dead). Biting Chains 40998 and Aero IV 40999 never hit.
//
// Findings:
// - Meteors: eight boulders, four a side, in every kill (B's Black Mage drops
//   in the second wave instead of the first). Big Burst 41009 killed the
//   party in 10 wipes: two players dropping together, one landing hitting
//   both (A9, A10, B11); a fallen player's meteor still landing (A5, A8, A14:
//   retargeted onto a player already dropping, B7); a boulder left over
//   because Weighty Blow hit a player instead (B5, B6); mass falls (A3, B9).
//   Clean drops kept 4.1y+ apart (A8).
// - Falls (no killing blow) are the most common error: Aethertithe cones
//   (A12, A15, B4 ~0:28), Wind gusts (A16 kill 1:34), Earth platforms
//   (3:17-3:42), the Ice bridges (5:49-5:56, in pairs: A11, A12, B8, B10),
//   Absolute Authority's push (A7), Radical Shift (A15, A16 kill, B13 kill).
// - Earth towers: a player not landed leaves a tower empty (A2, A5, A12, B7:
//   survivable once); two sharing one killed (A4, B1, B4).
// - Rush: short tethers and crossing lines killed 3-4 at once (A2, A6, A11).
// - Ice Dart: a dart on the stack group killed 5 (A13 +6:49, B8 +6:34; B13
//   kill: 6 hit, one died). The dart's cast loses its target every time.
// - Retribute: B12 lost three to a line short of players, then a group in
//   both lines. Prosecution: B1 +1:55 a tank took both hits and died; A2 +1:55
//   a double hit under an invulnerability (fine).
//
// Cutoffs (every wipe has one): A 5 boulder Big Burst, 3 mass deaths (Rush
// x2, Ice Dart), 3 both healers dead, 3 collapse, 1 tower Big Burst; B 4
// boulder Big Burst, 4 both healers dead, 2 mass deaths (Ice Dart,
// Retribute), 1 tower Big Burst. Kills carry no Raid error; their errors
// are Legitimate Force hits, falls (A16 x4, B13 x1), Deep Freeze, a missed
// Retribute/Aeroquell and B13's Ice Dart on the group.
//
// -- RULES IMPLEMENTED --
// - ffxiv-queen-eternal-avoidable: the avoidables above, per player
//   episode. Minor; Major when it killed (no Damage Down in this fight).
// - ffxiv-queen-eternal-freeze: Deep Freeze. Minor, Major when they died.
// - ffxiv-queen-eternal-share: Retribute lines, Aeroquell stacks: a player in
//   two, or a living player in none.
// - Spread families (one instance per player; owner and victim named; an
//   owned instance hitting 3+ others names its owner alone, an ownerless
//   one hitting 4+ is player-less): ffxiv-queen-eternal-spread (Atomic Ray,
//   Radical Shift, Divide and Conquer), -earth (towers, Pillar, Ray), -rush
//   (plus "tether too short" on 41019/41020's target), -ice-dart.
// - ffxiv-queen-eternal-empty-tower: tower Big Burst names the player with no
//   tower, else the two sharing one (Major); Raid tower-wipe when it killed
//   2+ and the pull ended within 40s.
// - ffxiv-queen-eternal-meteor: one landing hitting 2+ players names every
//   one of them (skipped for a player handed a dead player's meteor).
//   -weighty-blow: a Weighty Blow line on a player. -boulder-wipe: the Raid
//   marker at the boulder Big Burst, its cause in the description.
// - ffxiv-queen-eternal-prosecution (targeted: tanks): a tank died taking
//   both hits; names the other tank.
// - ffxiv-queen-eternal-fall: a death with no killing blow, phase named in
//   the description. Bridge and Radical Shift falls are never a called wipe.
// - Raid: boulder-wipe, tower-wipe, mass-deaths (4+ within 2.5s, Big Burst
//   and raidwides excluded, over within 40s), enrage (41036 / 41053),
//   called-wipe (3+ silent deaths within 5s, or near the end with nothing
//   killing anyone after), collapse (6 dead, or 5 with the pull over within
//   45s). Both healers dead comes from ffxiv/common.ts.
// Not built: Coronation tether endpoints and Absolute Authority's flares
// (both plans overlap the flares on purpose: the static stacks), Raised
// Tribute membership (B's tanks solo the late stacks with invulns), wind
// direction, Gravitational Anomaly flight, Royal Banishment/Dying Memory
// (all eight every time), Tyranny's Grasp tower misses (only after a tank
// death), Shatter (only after a tether holder fell), raidwide deaths.
//
// -- GUIDE-DERIVED MODEL: QUEEN ETERNAL (SPHENE) --
// The Minstrel's Ballad: Sphene's Burden, level100, patch7.1; Extreme only.
// Checked 2026-10-14. Comments only; no report analyzed, no failures
// observed, no detector registered. All LOG SIGNALS below are predictions.
//
// -- SOURCES AND PATCH SENSITIVITY --
// [BM] awgil/BossMod's firsthand Ex3Sphene Enums, States and components;
// last path change2026-09-30, revision below. Geometry/timers are public
// tool observations, NOT verified FFLogs evidence. Several BM TODOs remain:
// https://github.com/awgil/ffxiv_bossmod/tree/799524b33be594900dbad984ebb4d2ef8325d47a/BossMod.Modules/Dawntrail/Extreme/Ex3Sphene
// [DATA] XIVAPI Action names/cast times checked for all IDs below; status
// descriptions establish wind direction, levitation and freeze behavior:
// https://v2.xivapi.com/api/sheet/Action/41033?fields=Name,Cast100ms
// https://v2.xivapi.com/api/sheet/Status/4189?fields=Name,Description
// [IV] Tor's original encounter guide, updated2025-02-18:
// https://www.icy-veins.com/ffxiv/sphenes-burden-extreme-trial-guide
// [NA] Current NA PF conventions and original written guide:
// https://naurffxiv.com/extreme/sphenes-burden
// https://naurffxiv.com/extreme/sphenes-burden/guide
// [JP] Hamkatsu macro, fixed P2 coordinates and firsthand FAQ corrections:
// https://xivjpraids.com/7.0_dawntrail/extreme_trials/sphene/
// [G8] Original Japanese guide; rough clock and damage-type explanation:
// https://game8.jp/ff14/641571
// [SE11] 7.11,2024-11-26: fixed unintended incapacitation when
// Gravitational Anomaly expired. Pre-fix levitation deaths need context:
// https://na.finalfantasyxiv.com/lodestone/topics/detail/f8506f4808c8db5d061b31eb511dc946902712f4
// [SE2] 7.2,2025-03-25: wipe-earned Echo +5%, up to25%, after >=3m.
// Later gear/Echo changes damage tolerance and the P1 push time:
// https://na.finalfantasyxiv.com/lodestone/topics/detail/3c4910f373e497acd3428c37f6358e341e4cc06d
// No researched source establishes changed volley counts or geometry.
// Thaliak's encounter page has no usable timeline; not timing evidence.
//
// -- VOCABULARY, SEVERITY AND ATTRIBUTION --
// Numeric action IDs are game-data cast/damage/penalty candidates; helper
// casts may never be boss casts in FFLogs. Some actions have EMPTY names
// in DATA:40968/40969(auto),40996(wind push),41010(boulder destruction),
// 41037(intermission end),41046(north cleave). These are BM descriptions.
// Status->FFLogs candidates add1000000: wind4189/4190, Missing Link3587,
// Gravitational Anomaly3770, Authority's Expansion/Boot/Heel4186/4187/4188,
// Freezing Up2540, Deep Freeze3519. Mappings unverified; IDs can be reused.
// Magic/Ice vulnerability is described by guides; precise status IDs,
// durations and any avoidable Damage Down are unestablished here.
// Minor = survived avoidable without DD; Major = attributable death/wipe
// or verified DD; Raid = inevitable wipe cutoff. A Major names a player.
// Blame the proven root cause, not automatically the beam/spread victim.
// Correct soaks, tank hits and mitigation/healing deaths are not mechanic
// errors. A dead player's missing tether/tower/boulder is death fallout.
// Icons, environmental platform changes and tether endpoints may not be
// exposed by FFLogs. Callout assignments are not inherently in the log.
// Unless stated, attacks resolve by snapshot/cast, not removable auras.
// No researched mechanic requires Esuna or an interrupt. Death/dispel
// effects on delayed marks are unresolved except the untethered Shatter.
//
// -- SHAPE, CLOCK, PHASE CHECKS AND RESOURCES --
// Square arena centered(100,100), x/z80..120; north is decreasing z [BM].
// Two boss actors: P1 NPC0x4677, P2 NPC0x4678; hands0x4679/0x467A attack
// the two leading enmity players [IV]. Both tanks maintain top-two threat.
// No researched boss energy gauge, killable add check or progressive rage.
// BM nominal P1 cast START offsets, seconds from pull, rounded:
// +12 Aethertithe; +54 Wind; +64 Laws; +79 Force; +96 World Shatter;
// +108 Prosecution; +119 Divide; +141 Domain; +154 Earth; +164 Laws;
// +172 Force; +193 Empire; meteor landings+213/+220; +222 Weighty Blow;
// +237 Shatter; +250 Prosecution; +261 Coronation; +267 Atomic Ray;
// +284 Authority; +327 Ice; +337 Laws; +358 Force; +375 Laws;
// +411 Shatter; +424 Prosecution; +440 Domain; +452 Force; +466 Domain;
// +474 Authority Eternal,10s cast. G8's clock differs by several seconds.
// JP: below2% P1 finishes its current mechanic and advances to Authority
// Eternal. Reach0.1% before that10s cast ENDS or fail the P1 damage check.
// IV simplifies this as a0.1% push; use the JP distinction provisionally.
// Success41035 = transition raidwide; failure41036 = lethal enrage.
// P1 disappears~0.2s later; P2 appears~24.8s after disappearance, HP refills.
// No intermission add/objective. P1 clearing does not finish this encounter.
// With T=Authority Eternal START: P2 targetableT+35; Radical Shift starts
// T+39/+58; Shatter+78; Distortion+90; Grasp+100; Memory hits+110..118;
// Banishment hits+127..136; Radical+147/+166; Shatter+186; Preservation
// starts+198,14s cast, lethal+212 (~177s after P2 becomes targetable).
// Thus unpushed nominal hard deadline~+696 (11:36); an earlier HP push
// advances the P2 clock. These are sums of BM states, not measured logs.
// LOG SIGNAL:41036 or completed Preservation41053 with lethal raid damage;
// FAULT: group damage check, no automatic individual; CONSEQUENCE: Raid.
//
// -- PARTY PLAN AND ARENA VARIANTS --
// Common light parties G1west=MT,H1,M1,R1; G2east=OT,H2,M2,R2. These are
// community examples, not this user's roster; tank/melee pairs need a plan.
// Wind: hourglass/X, north/south bars25y wide by5y; diagonal paths [BM].
// Earth: two8x16y platforms, centers(92,94)/(108,94), wells toggle flight.
// Ice: side platforms centers(88,95)/(112,95),8x30y; center4x20y.
// Four ice bridges connect sides to center near z96/104; one crosser each.
// P2 fixed JP marker centers, west/east pairs from north to south:
// (91.3,86.7)/(108.7,86.7); (96,94)/(104,94);
// (92,98)/(108,98); (88,102)/(112,102). They intersect platform patterns;
// exact edge tolerance and small spread adjustments remain unverified.
// An illustrative P2 slot order is tank,melee,healer,ranged N->S [IV].
// Other valid plans: corner/CW meteors versus NA L Meteors; CW versus
// mirrored Coronation; split versus Mit Authority; alternative ice bridge
// traffic; MTTT versus rotating fresh ice takers; cue-read versus fixed P2.
// Strategy choice/marker label itself is not evidence of a mistake.
//
// -- RECURRING RAIDWIDES, PROSECUTION AND LEGITIMATE FORCE --
// Royal Domain41038:5s, unavoidable raidwide. Virtual Shift40985/86/87:
// 5s Wind/Earth/Ice raidwide with forced launch and changed floor.
// World Shatter40988(P1)/30354(P2):5s raidwide, restores square floor.
// Own raidwide damage/launch is expected; walking into a missing floor is
// not. LOG SIGNAL: death without killing ability at floor change/edge;
// FAULT: walker only with position/context; CONSEQUENCE: Major. This
// signature also covers knockback falls, broken bridges and called resets.
// Prosecution of War40970:5s first tank hit;40971 second hit~3.2s later.
// Swap during cast or invuln a deliberate double-hit; first leaves vuln.
// LOG SIGNAL: same tank receives both hits without a viable invuln and dies;
// FAULT: missed swap duty if established, not necessarily the dead tank;
// CONSEQUENCE: Major. Successful double-hit invuln/normal busters are legal.
// Legitimate Force40990/40992:first half-cleave at8s;40993/40994 opposite
// half~3.1s later. BM rectangles60x30y; arm-glow order chooses safe side.
// Correct: start second-cleaved half, cross after first; overlaps Wind
// chains, Earth flight/towers and Ice bridge return. LOG SIGNAL: these
// damage IDs/death; FAULT: failed dodger if independent; CONSEQUENCE:
// Minor->Major on attributable death, DD exception if later verified.
//
// -- AETHERTITHE / RETRIBUTE --
// Controller40972:3s;40973 repeated expected raid pulses;40974/75/76
// right/center/left suction cones,100y range/70deg full angle [BM].
// Three distinct thirds each once; first cone~+25, then~+34/+44.
// Retribute40977 visual;40978 two healer-directed60x8y line stacks~2.9s
// after each cone: THREE volleys, SIX lines. G1/G2 dodge and share one
// line each, four players, avoiding overlap; a brief magic vuln is normal.
// JP FAQ says damage splits equally regardless of front position; IV says
// front takes more. Tank-front is safe convention, not a proven obligation.
// LOG SIGNAL:40974..76 followed by forced movement/fall; FAULT: caught
// player; CONSEQUENCE: Major if killed. Cone graphic itself may be absent.
// LOG SIGNAL: two40978 exposures in a volley or undersized recipient set;
// FAULT: misplaced aimer/member only with beam geometry and plan;
// CONSEQUENCE: Minor->Major on death. Correct beam damage/vuln and40973
// pulses are expected, not grounds for flagging every recipient.
//
// -- LAWS OF WIND / CHAINS / WIND OF CHANGE --
// Laws40995:4s; Aeroquell40997:5s, two healer stacks, radius5/four players.
// G1 drops NW diagonal, G2SE, leaving NE<->SW chain route open [NA].
// Two Twisters0x467C remain at stack drops, radius5 Aero IV40999 hazard;
// BM despawns them~2.6s AFTER World Shatter finishes. Avoid until gone.
// Stack center before Missing Link3587 pairs DPS/support (four chains),
// then DPS NE/support SW. BM models25y break distance; IV says required
// separation depends on initial distance. No proven universal threshold.
// Biting Chains40998 starts after~5s unbroken: damage/stacking vuln each1s.
// LOG SIGNAL: late40998/repeated aura stacks; FAULT: failed pair member
// only with movement/plan, else ambiguous pair; CONSEQUENCE: Minor->Major.
// Stack missed/Twister touched -> LOG SIGNAL: undersized40997 or40999/
// hazard DoT; FAULT: missed member or unsafe dropper/entrant, not presumed
// victim; CONSEQUENCE: Minor->Major. Four-player soak damage is expected.
// Wind4189 = gust FROM EAST, pushes WEST;4190 = FROM WEST, pushes EAST
// [DATA]. Expiry action40996(BM unnamed),20y push after two Force hits.
// Stand on a horizontal bar at edge facing the wind source: east edge for
// 4189, west for4190. Orb/arrow art shows source, not status destination.
// LOG SIGNAL: status expiry then push/fall; FAULT: unsafe start position;
// CONSEQUENCE: Major if killed. Push immunity viability is unverified.
//
// -- DIVIDE AND CONQUER --
// 40983:7.5s controller;40984 eight sequential player-baited60x5y lines,
// about1s apart.30505:3s helper recasts all eight stored lines together,
// ~4.1s after bait8. Spread in a fan, then step into a gap after own bait.
// NA from center outward: healer,ranged,melee,tank on each half; other
// guide fan orders differ. Own bait damage/magic vuln is expected.
// LOG SIGNAL: excess40984 hits in sequence or any30505 damage; FAULT:
// incorrect bait position or failed gap dodge, with geometry/assignment;
// CONSEQUENCE: Minor->Major. Overlap victims are not automatically aimers.
//
// -- EARTH FLIGHT / TOWERS / GRAVITATIONAL EMPIRE --
// Laws of Earth41000:4s. Enter well for Gravitational Anomaly3770, fly
// into center and dodge Force; reenter well to LAND before tower soaks.
// Flight permits void travel but does not count as ground tower occupancy.
// Eight radius2 towers41001 Burst: west x90/94,east106/110,z88/100 [BM].
// Each needs one grounded player. Standard supports inner,DPS outer;
// tank/melee north,healer/ranged south. Second Force->tower window~5s.
// Gravitational Empire41003:7s; per platform one Gravity Pillar41004
// radius10 defamation (8s helper cast), one Gravity Ray41005 aimed cone,
// two unmarked tower soakers. Four second towers at x92/108,z89/99.
// Defam flies outward E/W; tether aims away toward NW/NE; unmarked remain
// grounded in towers. BM estimates Gravity Ray50y/60deg, explicitly TODO.
// LOG SIGNAL: Big Burst41002 (radius30 failed tower), absent/incorrect
// grounded41001 recipient; FAULT: missing assigned soaker if established;
// CONSEQUENCE: Major if attributable death, Raid if lethal raid penalty.
// LOG SIGNAL: extra41004/41005 victims; FAULT: unsafe marker/tether aimer
// or intruder, not necessarily victim; CONSEQUENCE: Minor->Major. Own
// defam/cone and valid Burst damage are expected.3770 is intentionally
// toggled, not dispelled; expiry/death/floor restoration cleanup unknown.
//
// -- METEOR IMPACT / BOULDER LIFECYCLE --
// 41006 controller; two waves of eight player meteors~7.1s apart; each
// wave resolves~6.1s after icons. First: FOUR boulders per platform; second:
// everybody floats off platforms, dropping into void.41007 platform hit
// radius4 spawns Virtual Boulder0x467D;41008 falling meteor is EXPECTED
// disposal, not a player falling. Flight alone does not prevent a boulder
// when the player's x/z remains above a platform.
// NA L pattern: along inner edge tank north,melee middle,healer south;
// ranged beside healer toward platform center. Leave shelter space south.
// Corner plan instead drops four spaced corners and rotates shelters CW.
// Big Burst41009:radius60 meteor penalty; guides associate overlap,
// surplus/leftover boulders with wipe. BM marks precise conditions TODO.
// LOG SIGNAL:41009; FAULT: extra/overlapping dropper only with complete
// drop positions/lifecycle, otherwise player-less; CONSEQUENCE: Raid plus
// attributable Major. Missed shelter supply -> LOG SIGNAL: fewer than four
// 41007 per side, then exposed Weighty Blow; FAULT: missed living dropper
// if established; CONSEQUENCE: Major/Raid as outcome, not death fallout.
// No reliable researched overlap cutoff or substitute-drop recovery rule.
//
// -- WEIGHTY BLOW --
// 41011:5s controller;41012 two orb->boulder lines per volley, width3.
// Origins BM(92,79.5)/(108,79.5), toward random party member on each
// side [IV]; four volleys~3.1s apart, consuming eight boulders total.
// 41010 unnamed boulder-destruction action records each successful block.
// Land at well, then party aligns behind one intact boulder per side.
// L plan blocks inner healer->melee->tank, then moves behind ranged rock.
// Corner/CW plan uses a different destruction order; each is correct.
// LOG SIGNAL: player41012 damage/death instead of a clean block, missing
// 41010 for a needed rock; FAULT: unsheltered/aerial player or displaced bait
// from party, only if known; CONSEQUENCE: Major on death. If no rock was
// available because of earlier error, this is fallout. Consuming rocks and
// returning to ground are intentional; stale levitation can defeat shelter.
//
// -- CORONATION / RUTHLESS REGALIA / ATOMIC RAY --
// 40979:3s, FOUR cardinal triangle helpers0x467B, each tethering TWO
// players (left/right endpoints).40980 Ruthless Regalia four100x12y beams
// ~10.1s after tether assignment; position endpoints without crossing.
// Atomic Ray40981:3s visual;40982:6s helper, radius16 spreads on all8,
// ~1.1s after lasers. Eight wall/corner slots must avoid double exposure.
// NA CW: north-source pair uses N/NE, east E/SE, south S/SW, west W/NW,
// preserving endpoint order. Mirrored guide positions use N/NW etc.
// LOG SIGNAL:40980 on a player; FAULT: bad tether endpoint/beam placement
// or intruder, with endpoints/plan; CONSEQUENCE: Minor->Major.
// LOG SIGNAL: multiple40982 exposures same volley; FAULT: wrong spread
// slot if established; CONSEQUENCE: Minor->Major. Own40982 is expected.
// Tether IDs270/271 are game candidates, not guaranteed FFLogs events.
//
// -- ABSOLUTE AUTHORITY --
// 41025:10s controller;41027:4s radius8 ground baits, four rounds during
// following~10s. Bait together, move out of old circles along north wall.
// Four role-group flares Authority's Expansion4186 ->41030 proximity;
// one opposite-role Boot4187 ->41031 radius6 split stack (four normally).
// These expire~10s after controller; all8 Heel4188 resolve~4s later:
// 41032 safe with >=one neighbor,41033 distinct lonely-player penalty.
// BM estimates Heel radius3 and flare safe radius15, BOTH unverified.
// Correct split plan: flares spread to assigned outer slots, other four
// stack center; then flare players pair and central party stays together.
// Mit Authority [NA]: stack all8, accept four overlapping flares/Boot
// with shields/mitigation; NO established vulnerability penalty here.
// NW->NE or reverse north-wall baits are both used. Overlap in Mit plan
// is intentional, not eight spread errors; falloff curve unestablished.
// 41026 visual/41028 repeated raid pulses accompany mechanic;41029:15s
// helper push30y south,~6.9s after Heel. Immunity or stand sufficiently N.
// LOG SIGNAL:41027 avoidable hit; FAULT: failed puddle dodge/unsafe bait;
// CONSEQUENCE: Minor->Major. LOG SIGNAL:41033; FAULT: isolated living
// player if position/partner known; CONSEQUENCE: Minor->Major.
// LOG SIGNAL: failed split stack/flare collateral (41030/31); FAULT:
// established misplaced player under SPLIT plan; CONSEQUENCE: Minor->Major.
// LOG SIGNAL: push->fall; FAULT: unsafe start/late immunity if established;
// CONSEQUENCE: Major. Correct Mit damage and41028 pulses are expected.
// Authority auras expire into their effects; early death behavior unknown.
//
// -- LAWS OF ICE 1 / FREEZE / RUSH / BRIDGES --
// 40987 changes floor;41013:4s Laws visual;41014:5s helper applies
// Freezing Up2540. Keep moving UNTIL expiry or gain Deep Freeze3519,
// incapacitation/DoT. Happens twice in Ice; BM icon warning~4.2s.
// LOG SIGNAL:3519 apply/ticks; FAULT: stopped player if alive/able to move;
// CONSEQUENCE: Minor->Major. Freeze caused by prior incapacity is fallout.
// Eight pillars in two role sets of4: south first (41015:12s Rush),
// east/west second (41016:9s), resolving together. Stretch each tether
// across to opposite platform; stay out of other players'80x4y rush lines.
// Success41017/18; short-tether penalties41019/20 add20y knockback.
// South outer crystals use north bridges, inner south [NA/JP]. Side routes
// vary: JP north crystal->south bridge,south->north; IV uses matching
// north/north,south/south. Each needs separation and adequate final stretch.
// BM south-crystal endpoints opposite side near z81; side-crystal endpoints
// opposite side near outer x85/115,z98/110, depending on source [BM].
// Return side-crystal players first, then south group; dodge Force centrally.
// Bridges break under two simultaneous crossers; later Laws repairs them.
// LOG SIGNAL:41019/20->fall; FAULT: short tether owner; CONSEQUENCE: Major.
// LOG SIGNAL: extra41017/18 line victims; FAULT: bad aimer/intruder if
// known; CONSEQUENCE: Minor->Major. LOG SIGNAL: bridge-timed falls; FAULT:
// simultaneous crossers only if occupancy proven; CONSEQUENCE: Major.
// Untethered pillar (e.g. missing/dead target) uses Shatter41021 radius8;
// surviving-target retarget/rescue unknown. Expected stretched Rush damage
// is legal; a pillar exploding after an earlier death is not a new error.
//
// -- LAWS OF ICE 2 / DREAR RISING / ICE DART / RAISED TRIBUTE --
// Second freeze then Drear Rising41022 visual; FOUR volleys~7.1s apart.
// Two transferable player tethers each ->Ice Dart41023 radius16 spreads;
// Raised Tribute41024 line stack80x8y, remaining six initially share.
// IV: first stack marks healer, later targets nearest player to boss;
// exact target selection remains unverified. Six warning pulses precede
// each resolution [JP]; these marker pulses are NOT six damage events.
// MTTT [NA/JP]: melees take first tethers to N ends of west/east platforms;
// party center/south. Tanks take2nd, then invuln3rd/4th, isolated N.
// Tanks can solo the late line stacks while invulnerable [IV]. The third
// stack's fifth warning pulse is the published invuln timing cue [JP].
// Fresh-player rotation is also viable if ice vuln has not been reused.
// LOG SIGNAL: multiple41023 exposures or41023 on stack group; FAULT:
// failed tether takeover/separation if established; CONSEQUENCE: Major
// if lethal, Minor otherwise. LOG SIGNAL: repeated41023 with ice vuln
// and no viable invuln->death; FAULT: assigned taker only if duty known;
// CONSEQUENCE: Major. Deliberate repeated invuln hits are expected.
// LOG SIGNAL: unsafe41024 stack recipient set; FAULT: wrongly isolated
// stack bait/member under active plan; CONSEQUENCE: Minor->Major.
// Correct solo tank stack/invuln, shared line and own Ice Dart are legal.
//
// -- RADICAL SHIFT (P2, TWO SETS OF TWO) --
// 41039:11s heavy raidwide/launch/platform replacement;41040:10s helper
// cast radius5 spreads, resolves~5.2s after floor change [BM]. Each pair
// ends with World Shatter30354:5s. Total FOUR changes/four spread volleys.
// Rotation/background selects one previewed Wind/Earth/Ice floor;
// stand in matching outline before replacement, then separated on it.
// BM map changes carry selection; public log availability unknown. P2
// variants use floor shapes, not another Earth-flight/tower or Ice-tether
// cycle. Fixed intersection markers avoid most selection movement [JP].
// LOG SIGNAL: floor-change fall without damage; FAULT: player outside
// chosen floor if geometry/cue known; CONSEQUENCE: Major. A fixed-marker
// plan is valid even without visibly moving. LOG SIGNAL: >one41040 hit
// per player/volley; FAULT: misplaced spread owner if established;
// CONSEQUENCE: Minor->Major. Own41040 plus41039 raid damage is expected.
//
// -- DIMENSIONAL DISTORTION / TYRANNY'S GRASP --
// 41042:4s controller;41043:5s first exaflare,41044 following explosions.
// BM radius6, five explosions per line,8.5y advance every1.1s. Two
// staggered alternating-column sets from north; step behind cleared hits.
// LOG SIGNAL:41043/44 damage; FAULT: failed dodger, unless displaced by
// earlier cause; CONSEQUENCE: Minor->Major.
// 41045:5s controller;41046 unnamed north-half20x40y cleave. Stay south.
// Two radius4 single-tank towers41047/30418 (6.2s/8.9s helper casts),
// resolve~1.2/~3.9s after cleave; westMT/eastOT is common [G8]. One each,
// mitigate; BM excludes first soaker from second. Dedicated miss-penalty
// ID/name not established. LOG SIGNAL:41046 hit, wrong/empty tower
// recipients or lethal tower failure; FAULT: failed dodger/assigned soaker
// if established; CONSEQUENCE: Minor->Major/Raid if unrecoverable.
// Correct tank-tower damage is expected; death alone proves no positioning
// error. Exact tower vulnerability duration and miss result remain open.
//
// -- DYING MEMORY / ROYAL BANISHMENT / WHAT ENDS THE PULL --
// Dying Memory41049 seven pulses,20042 eighth,~7.8s first->last [BM].
// G8 describes physical party damage; Royal Banishment41050:5s visual,
// 41051 seven line hits at1s cadence,41052 larger eighth after3s (first
// ->last9s).60x10y line. Group in marked line and sustain healing/mitigation.
// LOG SIGNAL: absent living member from line/unsafe recipient set; FAULT:
// missed stack member or mis-aimed target if known; CONSEQUENCE: Major
// if lethal, Minor otherwise. All8 Memory pulses and8 Banishment hits are
// expected; a tank-front requirement/split formula is not established.
// Unavoidable damage deaths belong to mitigation analysis. No modeled soft
// resource enrage. Hard checks: failed Authority Eternal41036, Preservation
// 41053 completion. Catastrophic meteor41009 and lethal missed-tower41002
// penalties can set earlier Raid cutoffs; chain/bridge/ice collapses need
// actual irrecoverable outcome, not an arbitrary death-count threshold.
//
// -- OPEN QUESTIONS FOR LOG VERIFICATION --
// 1. Map all candidate action/status IDs, unnamed helpers and reused IDs;
//    determine which avoidables give DD versus which vulnerability/DoT.
// 2. Confirm below2% trigger, mechanic completion before transition,
//    0.1% deadline, P2 HP pool, downtime and clocks for early/late pushes.
// 3. Retribute: equal split or front-player bonus? Minimum/count scaling
//    for Retribute, Aeroquell, Raised Tribute and Royal Banishment?
// 4. Chain break distance dependence, death unlink/retarget, wind immunity
//    and whether movement/tether/map cues survive FFLogs transformation?
// 5. Earth: aura cleanup/expiry/fall behavior; second-tower target selection;
//    cone angle; meteor overlap/count/leftover triggers and recovery with
//    a dead dropper; Weighty Blow targeting/block/height and cleanup time?
// 6. Authority: bait count/targets, flare falloff, Heel radius, damage types
//    and death/early-removal effects for every Authority aura?
// 7. Ice: movement test window/freeze duration; Rush stretch threshold and
//    own-hit damage; bridge collapse timing/rebuild; missing/dead targets;
//    Ice Dart vuln duration, tether transfer and Raised Tribute retargets?
// 8. P2: fixed-marker tolerances, spread snapshots, exaflare line counts,
//    tower lockout/miss penalty, Memory/Banishment split and final-hit size;
//    distinguish falls from deliberate resets and causal death fallout.

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import type { ReportedOccurrence } from "@/lib/mechanics/occurrences";
import { kFmt, joinNames, playerError, playerlessMinor, raidMarker, rezzedAt, clusterByGap, debuffIntervals, RAID_MARKER_SORT_OFFSET_MS } from "@/lib/mechanics/wow/common";

export const QE_AVOIDABLE_RULE_ID   = "ffxiv-queen-eternal-avoidable";
export const QE_FREEZE_RULE_ID      = "ffxiv-queen-eternal-freeze";       // stopped under Freezing Up
export const QE_SHARE_RULE_ID       = "ffxiv-queen-eternal-share";        // Retribute lines, Aeroquell stacks
export const QE_SPREAD_RULE_ID      = "ffxiv-queen-eternal-spread";       // Atomic Ray, Radical Shift, Divide and Conquer baits
export const QE_EARTH_RULE_ID       = "ffxiv-queen-eternal-earth";        // Earth towers, Gravity Pillar / Ray
export const QE_EMPTY_TOWER_RULE_ID = "ffxiv-queen-eternal-empty-tower";  // Big Burst (tower)
export const QE_RUSH_RULE_ID        = "ffxiv-queen-eternal-rush";         // Laws of Ice tethers
export const QE_ICE_DART_RULE_ID    = "ffxiv-queen-eternal-ice-dart";     // Drear Rising tethers
export const QE_METEOR_RULE_ID      = "ffxiv-queen-eternal-meteor";       // boulders dropped together
export const QE_WEIGHTY_RULE_ID     = "ffxiv-queen-eternal-weighty-blow"; // not behind a boulder
export const QE_SWAP_RULE_ID        = "ffxiv-queen-eternal-prosecution";  // Prosecution of War swap
export const QE_FALL_RULE_ID        = "ffxiv-queen-eternal-fall";
export const QE_BOULDER_WIPE_RULE_ID = "ffxiv-queen-eternal-boulder-wipe";
export const QE_TOWER_WIPE_RULE_ID  = "ffxiv-queen-eternal-tower-wipe";
export const QE_MASS_DEATHS_RULE_ID = "ffxiv-queen-eternal-mass-deaths";
export const QE_ENRAGE_RULE_ID      = "ffxiv-queen-eternal-enrage";
export const QE_CALLED_WIPE_RULE_ID = "ffxiv-queen-eternal-called-wipe";
export const QE_COLLAPSE_RULE_ID    = "ffxiv-queen-eternal-collapse";

// Aethertithe, Virtual Shift (Wind), Divide and Conquer: every pull opens with them.
const SIGNATURE      = [40972, 40985, 40983];
const WALKING_DEAD   = 1000811;
const WALKING_DEAD_FULL_MS = 9500;
const DEEP_FREEZE    = 1003519;
const AETHERTITHE_CONES = [40974, 40975, 40976];
const WIND_PUSH      = 40996;   // Wind of Change gust (cast on every player)
const SHIFT_WIND     = 40985;
const SHIFT_EARTH    = 40986;
const SHIFT_ICE      = 40987;
const WORLD_SHATTER  = [40988, 30354];
const LAWS_OF_ICE    = 41013;
const RADICAL_SHIFT  = 41039;
const AUTHORITY_PUSH = 41029;
const RETRIBUTE      = 40978;
const AEROQUELL      = 40997;
const DIVIDE         = 40984;   // Divide and Conquer: one line per baiter, cast-targeted
const ATOMIC_RAY     = 40982;
const RADICAL_SPREAD = 41040;
const TOWER          = 41001;   // Burst: an Earth tower, cast-targeted at its soaker
const PILLAR         = 41004;   // Gravity Pillar defamation, cast-targeted
const RAY            = 41005;   // Gravity Ray cone, cast-targeted
const TOWER_FAIL     = 41002;   // Big Burst: an Earth tower left empty
const RUSH           = [41017, 41018];
const RUSH_SHORT     = [41019, 41020]; // a Rush tether left short
const ICE_DART       = 41023;
const METEOR_DROP    = 41007;   // a meteor landing on a platform (a boulder)
const METEOR_VOID    = 41008;   // a meteor falling into the void (no boulder)
const BOULDER_BURST  = 41009;   // Big Burst: boulders touching, or one left over
const WEIGHTY_CAST   = 41011;
const WEIGHTY_BLOW   = 41012;
const PROSECUTION    = [40970, 40971];
const ENRAGE         = [41036, 41053]; // failed Authority Eternal, Preservation
// Raid-wide damage: deaths to these are mitigation, never a mass-death cutoff.
const RAIDWIDE = [40973, 40985, 40986, 40987, 40988, 30354, 41038, 41028, 41029, 41030, 41035, 41039, 41049, 20042, 41051, 41052, 41036, 41053];

// Avoidable hits. The fight hands out no Damage Down; these give
// Vulnerability Up 1001789 (Coronation's laser Magic Vulnerability Up), so
// a survived hit is Minor.
type Avoidable = { name: string; why: string };
const FORCE_WHY = "Legitimate Force cleaves one half of the arena, then the other; start in the half the glowing arm hits second and cross as soon as the first cleave goes off.";
const DISTORTION_WHY = "Dimensional Distortion's exaflares advance in staggered columns; step in behind a line that has already exploded.";
const AVOIDABLE: Record<number, Avoidable> = {
  40990: { name: "Legitimate Force", why: FORCE_WHY },
  40992: { name: "Legitimate Force", why: FORCE_WHY },
  40993: { name: "Legitimate Force", why: FORCE_WHY },
  40994: { name: "Legitimate Force", why: FORCE_WHY },
  30505: { name: "Divide and Conquer", why: "Divide and Conquer fires every baited line again together; after your own bait, step into a gap between the lines." },
  41027: { name: "Absolute Authority", why: "Absolute Authority drops circles on the party four times; bait them together and move out of the old circles along the north wall." },
  41033: { name: "Authority's Heel", why: "Authority's Heel needs at least one neighbour; stay next to another player when it goes off." },
  40980: { name: "Ruthless Regalia", why: "Coronation's tethered pairs fire Ruthless Regalia lasers; hold your end of the tether at your spot without crossing another pair's beam." },
  41043: { name: "Dimensional Distortion", why: DISTORTION_WHY },
  41044: { name: "Dimensional Distortion", why: DISTORTION_WHY },
};

// FFLogs logs the death event ~2.0s after the fatal hit (README).
const DEATH_EVENT_LAG_MS = 2000;
const DIED_FROM_HIT_MS   = 3000;
const EPISODE_MS         = 3000;
const RAISE_GRACE_MS     = 10_000;
// With this many dead, a share's, spread's or tower's layout is fallout.
const DOOMED_DEAD        = 3;
// An instance that hit this many players besides its owner was carried into
// the group: its owner is named alone (README pitfalls: a stack taken away
// from a waiting group names its holder).
const CROWD              = 3;
// Deaths to one moment's mechanics that end the pull: 4+ within
// MASS_WINDOW_MS and the pull over within 40s (A6 Rush 37s, B8 Ice Dart 35s,
// B12 Retribute 7s).
const MASS_DEATHS        = 4;
const MASS_WINDOW_MS     = 2500;
const MASS_END_MS        = 40_000;
const CALLED_WIPE_END_MS = 12_000;
const CALLED_WIPE_COUNT  = 3;
// Resets came 1-3s apart (A3 4.8s span, B9 5.5s); A3's first fall was
// 8.9s before the reset and B9's 5.8s.
const CALLED_WIPE_WINDOW = 5_000;
// No kill ever had 4 down at once. 6 dead never recovered (A7 carried on
// 89s with two alive); 5 dead with the pull over within 45s.
const COLLAPSE_DEAD_COUNT = 5;
const COLLAPSE_END_MS     = 45_000;
const COLLAPSE_ANY_COUNT  = 6;

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
  ? "lethal" : kFmt(es.reduce((s, e) => s + (e.amount ?? 0), 0));

const uniq = <T,>(xs: T[]) => [...new Set(xs)];
const namesOf = (ps: PlayerInfo[]) => joinNames(uniq(ps).map((p) => p.name));
const isTank = (p: PlayerInfo) => p.role === "Tank";
const instanceKey = (e: PlayerEvent) => `${e.abilityId}|${e.source}#${e.sourceInstance}`;
const castKey = (c: EnemyEvent) => `${c.abilityId}|${c.actorName}#${c.sourceInstance}`;
const deadCount = (players: PlayerInfo[], life: Life, t: number) => players.filter((p) => !life.hitAlive(p, t)).length;
const byName = (players: PlayerInfo[], name?: string) => (name ? players.find((p) => p.name === name) : undefined);
const mmss = (ms: number) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

/** Raised within RAISE_GRACE_MS before `t` (or still out at `t`). */
function inRaiseGrace(life: Life, p: PlayerInfo, t: number): boolean {
  return !life.hitAlive(p, t) || life.outIntervals.some((w) => w.p === p && w.end <= t && t - w.end < RAISE_GRACE_MS);
}

/** Took a listed avoidable hit within 2s of `t`: already flagged for it. */
function inAvoidable(p: PlayerInfo, t: number): boolean {
  return p.damageTaken.some((e) => AVOIDABLE[e.abilityId] && Math.abs(e.timestamp - t) <= 2000 && (e.amount ?? 0) > 0);
}

const killedBy = (life: Life, res: Hit[], p: PlayerInfo, ids: number[]) => {
  const last = res.filter((h) => h.p === p).pop()?.e.timestamp;
  const d = last !== undefined ? life.diedFrom(p, last) : undefined;
  return !!d && ids.includes(d.killingAbilityGameId);
};

// ── plain avoidable hits ────────────────────────────────────────────────────

function detectAvoidable(players: PlayerInfo[], life: Life): PullError[] {
  const errors: PullError[] = [];
  const ids = Object.keys(AVOIDABLE).map(Number);
  for (const p of players) {
    const hits = p.damageTaken.filter((e) => ids.includes(e.abilityId) && e.healthBefore !== 0 && life.hitAlive(p, e.timestamp) && (e.amount ?? 0) > 0);
    for (const g of clusterByGap(hits, (e) => e.timestamp, EPISODE_MS)) {
      const kinds = uniq(g.map((e) => AVOIDABLE[e.abilityId]));
      const death = life.diedFrom(p, g[g.length - 1].timestamp);
      const names = uniq(kinds.map((k) => k.name));
      errors.push(playerError(p, {
        ruleId: QE_AVOIDABLE_RULE_ID, severity: death ? "Major" : "Minor", name: `Hit by ${names.join(" / ")}`,
        description: `Hit by ${joinNames(names)} (${g.length > 1 ? `${g.length} hits, ` : ""}${amountText(g)}), with a vulnerability debuff.${death ? " They died." : ""} ${uniq(kinds.map((k) => k.why)).join(" ")}`,
        timestamp: g[0].timestamp, abilityId: g[0].abilityId, abilityName: g[0].abilityName,
      }));
    }
  }
  return errors;
}

/** Deep Freeze: stood still while Freezing Up held. */
function detectFreeze(players: PlayerInfo[], life: Life): PullError[] {
  const errors: PullError[] = [];
  for (const p of players) {
    for (const w of debuffIntervals(p, DEEP_FREEZE)) {
      if (!life.hitAlive(p, w.start)) continue;
      const end = Number.isFinite(w.end) ? w.end : w.start + 10_000;
      const death = life.diedFrom(p, end - DIED_FROM_HIT_MS + 2000);
      errors.push(playerError(p, {
        ruleId: QE_FREEZE_RULE_ID, severity: death ? "Major" : "Minor", name: "Frozen by Deep Freeze",
        description: `Stopped moving while Laws of Ice's Freezing Up held, and Deep Freeze froze them for ${((end - w.start) / 1000).toFixed(1)}s.${death ? " They died while it held." : ""} Keep walking until Freezing Up falls off (slidecast, or move between GCDs).`,
        timestamp: w.start, abilityId: DEEP_FREEZE, abilityName: "Deep Freeze",
      }));
    }
  }
  return errors;
}

// ── one instance per player: spreads, baits, towers, tethers ───────────────

type Spread = { name: string; ids: number[]; what: (abilityId: number) => string; why: string; ruleId: string; gapMs?: number; perCast?: boolean };
const SPREADS: Spread[] = [
  { name: "Atomic Ray", ids: [ATOMIC_RAY], what: () => "Atomic Ray spread", ruleId: QE_SPREAD_RULE_ID,
    why: "Atomic Ray puts a large spread on all eight right after Coronation's lasers; each player takes their own wall or corner slot." },
  { name: "Radical Shift", ids: [RADICAL_SPREAD], what: () => "Radical Shift spread", ruleId: QE_SPREAD_RULE_ID,
    why: "Radical Shift's spreads go off on the new floor; stand on your own marker, apart from everyone." },
  // The eight lines go off 1s apart and reuse caster instances within the
  // set: each hit is keyed to its own cast.
  { name: "Divide and Conquer", ids: [DIVIDE], what: () => "Divide and Conquer line", ruleId: QE_SPREAD_RULE_ID, perCast: true,
    why: "Divide and Conquer fires one line at each player in turn; spread in a fan so no line passes through anyone else." },
  { name: "Earth towers", ids: [TOWER, PILLAR, RAY], ruleId: QE_EARTH_RULE_ID,
    what: (id) => (id === PILLAR ? "Gravity Pillar" : id === RAY ? "Gravity Ray cone" : "Earth tower"),
    why: "Each Earth tower takes exactly one grounded player; at Gravitational Empire the Gravity Pillar and Gravity Ray players take their marks out of the towers' way." },
  { name: "Rush", ids: [...RUSH, ...RUSH_SHORT], what: () => "Rush line", ruleId: QE_RUSH_RULE_ID,
    why: "Each Ice Pillar rushes at its tethered player; stretch your tether across to the opposite platform and keep out of the other tethers' lines." },
  { name: "Ice Dart", ids: [ICE_DART], what: () => "Ice Dart", ruleId: QE_ICE_DART_RULE_ID,
    why: "Drear Rising's two tethered players take Ice Dart away from the group (each player only once: it leaves Ice Resistance Down II); everyone else stacks for Raised Tribute." },
];

/**
 * One instance per player. The owner of an instance is its cast target, else
 * the only player it hit, or the one player it hit who took nothing else. A
 * player hit by an instance that isn't theirs, or by two, overlapped; the
 * owner and the victim are both named. An owned instance that hit CROWD or
 * more other players was carried into the group: its owner alone is named.
 */
function detectSpreadFamily(players: PlayerInfo[], life: Life, casts: EnemyEvent[], fam: Spread): PullError[] {
  const errors: PullError[] = [];
  for (const res of clusterByGap(hitsOf(players, life, fam.ids), (h) => h.e.timestamp, fam.gapMs ?? 1500)) {
    const t0 = res[0].e.timestamp, t1 = res[res.length - 1].e.timestamp;
    if (deadCount(players, life, t0) >= DOOMED_DEAD) continue;
    // perCast: caster instances repeat within one set, so a hit belongs to
    // the latest matching cast before it.
    const famCasts = casts.filter((c) => fam.ids.includes(c.abilityId) && c.timestamp >= t0 - 2000 && c.timestamp <= t1 + 200 && c.sourceInstance !== undefined);
    const keyOfCast = (c: EnemyEvent) => (fam.perCast ? `${castKey(c)}@${c.timestamp}` : castKey(c));
    const keyOf = (e: PlayerEvent) => {
      if (!fam.perCast) return instanceKey(e);
      const c = famCasts.filter((x) => x.abilityId === e.abilityId && x.actorName === e.source && x.sourceInstance === e.sourceInstance &&
        x.timestamp <= e.timestamp + 200 && x.timestamp >= e.timestamp - 1500).pop();
      return c ? keyOfCast(c) : `${instanceKey(e)}@${e.timestamp}`;
    };
    const byInst = new Map<string, Hit[]>();
    const byPlayer = new Map<PlayerInfo, Set<string>>();
    for (const h of res) {
      if (inRaiseGrace(life, h.p, h.e.timestamp)) continue;
      const k = keyOf(h.e);
      byInst.set(k, [...(byInst.get(k) ?? []), h]);
      byPlayer.set(h.p, (byPlayer.get(h.p) ?? new Set()).add(k));
    }
    const owners = new Map<string, PlayerInfo>();
    for (const c of famCasts) {
      const p = byName(players, c.target);
      if (p) owners.set(keyOfCast(c), p);
    }
    for (const [k, hs] of byInst) {
      if (owners.has(k)) continue;
      const hit = uniq(hs.map((h) => h.p));
      const only = hit.filter((p) => byPlayer.get(p)!.size === 1 && ![...owners.values()].includes(p));
      if (hit.length === 1 && ![...owners.values()].includes(hit[0])) owners.set(k, hit[0]);
      else if (only.length === 1) owners.set(k, only[0]);
    }
    // Carried into the group: the owner alone answers for it. With no owner
    // in the log (Ice Dart's cast loses its target exactly then: A13 +6:49,
    // B8 +6:34, B13 +6:34) it stays player-less.
    const carried = new Map<string, PlayerInfo[]>();
    for (const [k, hs] of byInst) {
      const o = owners.get(k);
      const others = uniq(hs.map((h) => h.p)).filter((p) => p !== o);
      if (others.length >= (o ? CROWD : CROWD + 1)) carried.set(k, others);
    }
    const what = (k: string) => fam.what(Number(k.split("|")[0]));
    const killed = (ps: PlayerInfo[]) => ps.filter((p) => killedBy(life, res, p, fam.ids));
    for (const [k, victims] of carried) {
      const o = owners.get(k);
      const dead = killed(o ? [o, ...victims] : victims);
      const deathText = dead.length ? ` ${namesOf(dead)} died.` : "";
      if (!o) {
        errors.push(playerlessMinor(fam.ruleId, `${fam.name} on the Group`,
          `${/^[AEIOU]/.test(what(k)) ? "An" : "A"} ${what(k)} hit ${victims.length} players (${namesOf(victims)}); the log doesn't name whose it was.${deathText} ${fam.why}`,
          t0, Number(k.split("|")[0]), fam.name));
        continue;
      }
      errors.push(playerError(o, {
        ruleId: fam.ruleId, severity: dead.length ? "Major" : "Minor", name: `${fam.name} on the Group`,
        description: `Their ${what(k)} hit ${victims.length} other players (${namesOf(victims)}).${deathText} ${fam.why}`,
        timestamp: t0, abilityId: Number(k.split("|")[0]), abilityName: fam.name,
      }));
    }
    const links = new Map<PlayerInfo, Set<PlayerInfo>>();
    const link = (a: PlayerInfo, b: PlayerInfo) => {
      links.set(a, (links.get(a) ?? new Set()).add(b));
      links.set(b, (links.get(b) ?? new Set()).add(a));
    };
    for (const [p, ks0] of byPlayer) {
      const ks = [...ks0].filter((k) => !carried.has(k));
      const foreign = ks.filter((k) => owners.get(k) !== p);
      if (ks.length < 2 && foreign.length === 0) continue;
      if (!links.has(p)) links.set(p, new Set());
      for (const k of ks) {
        const o = owners.get(k);
        if (o) { if (o !== p) link(p, o); }
        else for (const h of byInst.get(k)!) if (h.p !== p) link(p, h.p);
      }
    }
    const seen = new Set<PlayerInfo>();
    for (const start of links.keys()) {
      if (seen.has(start)) continue;
      const group: PlayerInfo[] = [];
      const stack = [start];
      while (stack.length) {
        const p = stack.pop()!;
        if (seen.has(p)) continue;
        seen.add(p);
        group.push(p);
        for (const q of links.get(p) ?? []) stack.push(q);
      }
      const dead = killed(group);
      const deathText = dead.length ? ` ${namesOf(dead)} died.` : "";
      for (const p of group) {
        const others = [...(links.get(p) ?? [])];
        const ks = [...(byPlayer.get(p) ?? [])].filter((k) => !carried.has(k));
        const victim = ks.length > 1 || ks.some((k) => owners.get(k) !== p);
        const kinds = ks.map((k) => `${owners.get(k) === p ? "their own" : owners.get(k) ? `${owners.get(k)!.name}'s` : /^[AEIOU]/.test(what(k)) ? "an" : "a"} ${what(k)}`);
        const description = victim
          ? `Hit by ${joinNames(kinds)}${others.length ? ` (with ${namesOf(others)})` : ""}.`
          : `Their ${what(ks[0] ?? "")} also hit ${namesOf(others)}.`;
        errors.push(playerError(p, {
          ruleId: fam.ruleId, severity: dead.length ? "Major" : "Minor", name: `${fam.name} Overlap`,
          description: `${description}${deathText} ${fam.why}`,
          timestamp: t0, abilityId: fam.ids[0], abilityName: fam.name,
        }));
      }
    }
  }
  return errors;
}

/** A Rush tether left short: the pillar's penalty Rush goes to its tethered player. */
function detectShortRush(players: PlayerInfo[], life: Life, casts: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const c of castsOf(casts, RUSH_SHORT)) {
    const p = byName(players, c.target);
    if (!p || !life.hitAlive(p, c.timestamp) || inRaiseGrace(life, p, c.timestamp)) continue;
    const hit = p.damageTaken.find((e) => RUSH_SHORT.includes(e.abilityId) && Math.abs(e.timestamp - c.timestamp) <= 1500);
    const death = life.diedFrom(p, hit?.timestamp ?? c.timestamp);
    errors.push(playerError(p, {
      ruleId: QE_RUSH_RULE_ID, severity: death ? "Major" : "Minor", name: "Rush Tether Too Short",
      description: `Their Ice Pillar's tether wasn't stretched far enough, so its Rush hit as the short-tether penalty${hit ? ` (${amountText([hit])})` : ""}, with a knockback.${death ? " They died." : ""} Stretch the tether across to the opposite platform before the Rush.`,
      timestamp: c.timestamp, abilityId: c.abilityId, abilityName: "Rush",
    }));
  }
  return errors;
}

// ── shared lines and stacks ─────────────────────────────────────────────────

type Share = { name: string; ids: number[]; what: string; why: string };
const SHARES: Share[] = [
  { name: "Retribute", ids: [RETRIBUTE], what: "line",
    why: "Retribute fires two line stacks at the healers after each Aethertithe cone; each light party takes its own healer's line." },
  { name: "Aeroquell", ids: [AEROQUELL], what: "stack",
    why: "Aeroquell stacks on both healers; each light party takes its own healer's stack." },
];

/**
 * Each living player takes exactly one instance. A player in two took the
 * second under Magic Vulnerability Up (B12 +0:48: four died); a living
 * player in none left the others to take it short (B12 +0:38: a healer
 * died in a line of two).
 */
function detectShares(players: PlayerInfo[], life: Life): PullError[] {
  const errors: PullError[] = [];
  for (const fam of SHARES) {
    for (const res of clusterByGap(hitsOf(players, life, fam.ids), (h) => h.e.timestamp, 1500)) {
      const t = res[0].e.timestamp;
      if (deadCount(players, life, t) >= DOOMED_DEAD) continue;
      const byPlayer = new Map<PlayerInfo, Set<string>>();
      for (const h of res) byPlayer.set(h.p, (byPlayer.get(h.p) ?? new Set()).add(instanceKey(h.e)));
      const killed = uniq(res.map((h) => h.p)).filter((p) => killedBy(life, res, p, fam.ids));
      const deathText = killed.length ? ` ${namesOf(killed)} died.` : "";
      const doubled = [...byPlayer].filter(([p, ks]) => ks.size >= 2 && !inRaiseGrace(life, p, t)).map(([p]) => p);
      for (const p of doubled) {
        errors.push(playerError(p, {
          ruleId: QE_SHARE_RULE_ID, severity: killed.length ? "Major" : "Minor", name: `Took Two ${fam.name} ${fam.what}s`,
          description: `Stood in ${byPlayer.get(p)!.size} ${fam.name} ${fam.what}s at once${doubled.length > 1 ? ` (with ${namesOf(doubled.filter((x) => x !== p))})` : ""}.${deathText} ${fam.why}`,
          timestamp: t, abilityId: fam.ids[0], abilityName: fam.name,
        }));
      }
      const absent = players.filter((p) => !byPlayer.has(p) && life.hitAlive(p, t) && !inRaiseGrace(life, p, t) && !inAvoidable(p, t));
      const sizes = uniq(res.map((h) => instanceKey(h.e))).map((k) => res.filter((h) => instanceKey(h.e) === k).length);
      for (const p of absent) {
        errors.push(playerError(p, {
          ruleId: QE_SHARE_RULE_ID, severity: killed.length ? "Major" : "Minor", name: `Missed ${fam.name}`,
          description: `Took no ${fam.name} ${fam.what}, so the others shared ${sizes.length === 1 ? "it" : "them"} short (${sizes.join(" + ")} players).${deathText} ${fam.why}`,
          timestamp: t, abilityId: fam.ids[0], abilityName: fam.name,
        }));
      }
    }
  }
  return errors;
}

// ── Earth: empty towers ─────────────────────────────────────────────────────

/**
 * Big Burst: an Earth tower nobody stood in hits everyone (A4 +3:08: the
 * healers shared a tower). The first set takes all eight; the second set's
 * four towers go to everyone but the Gravity Pillar and Gravity Ray players.
 * The tower player who took no tower is named, else the two sharing one.
 * It ends the pull when it kills two or more and the pull is over soon after
 * (B1, B4); A2 survived one.
 */
function detectEmptyTowers(players: PlayerInfo[], life: Life, casts: EnemyEvent[], pullEnd: number): PullError[] {
  const errors: PullError[] = [];
  for (const res of clusterByGap(hitsOf(players, life, TOWER_FAIL), (h) => h.e.timestamp, 1500)) {
    const t = res[0].e.timestamp;
    const towers = hitsOf(players, life, TOWER).filter((h) => h.e.timestamp >= t - 3000 && h.e.timestamp <= t + 500);
    const marked = castsOf(casts, [PILLAR, RAY]).filter((c) => Math.abs(c.timestamp - t) <= 3000).map((c) => byName(players, c.target));
    const group = players.filter((p) => !marked.includes(p));
    const missing = group.filter((p) => !towers.some((h) => h.p === p) && life.hitAlive(p, t - 1000) && !inRaiseGrace(life, p, t - 1000));
    const byTower = new Map<string, PlayerInfo[]>();
    for (const h of towers) byTower.set(instanceKey(h.e), [...(byTower.get(instanceKey(h.e)) ?? []), h.p]);
    const doubled = uniq([...byTower.values()].filter((ps) => ps.length >= 2).flat());
    const died = uniq(res.filter((h) => life.diedFrom(h.p, h.e.timestamp)).map((h) => h.p));
    const deathText = died.length ? ` ${namesOf(died)} died.` : "";
    const why = "Every Earth tower needs one grounded player (land at a well before the towers go off); an empty tower's Big Burst hits the whole party.";
    const named = missing.length && missing.length <= 2 ? missing : doubled;
    for (const p of named) {
      const what = missing.includes(p)
        ? "Took no Earth tower"
        : `Shared an Earth tower with ${namesOf(doubled.filter((x) => x !== p))}`;
      errors.push(playerError(p, {
        ruleId: QE_EMPTY_TOWER_RULE_ID, severity: "Major", name: "Tower Left Empty",
        description: `${what}, so a tower stayed empty and Big Burst hit the party (${res.length} hit).${deathText} ${why}`,
        timestamp: t, abilityId: TOWER_FAIL, abilityName: "Big Burst",
      }));
    }
    if (!named.length) {
      errors.push(playerlessMinor(QE_EMPTY_TOWER_RULE_ID, "Tower Left Empty",
        `An Earth tower stayed empty and Big Burst hit the party (${res.length} hit).${deathText} ${why}`, t, TOWER_FAIL, "Big Burst"));
    }
    if (died.length >= 2 && pullEnd - t <= MASS_END_MS) {
      errors.push(raidMarker(QE_TOWER_WIPE_RULE_ID, "Tower Left Empty",
        `An empty Earth tower's Big Burst killed ${namesOf(died)}. Treated as the cutoff point.`,
        t, TOWER_FAIL, "Big Burst"));
    }
  }
  return errors;
}

// ── Earth: meteors, boulders and Weighty Blow ───────────────────────────────

/**
 * Meteor Impact drops a meteor on every player twice: the first wave lands on
 * the platforms as eight boulders (four a side), the second falls into the
 * void (B's Black Mage drops in the second wave instead; legal). Boulders
 * that touch go off as Big Burst and kill the party:
 * - two players dropping together: one landing hits both (A9 +3:34, A10
 *   +3:34, B11 +3:34). Both droppers are named;
 * - a dead or fallen player's meteor still lands (A5, A8: on the body after
 *   a fall; A14: retargeted onto a player already dropping one). The death
 *   is the error; the Big Burst is player-less;
 * - a boulder left over after Weighty Blow, because a line hit a player
 *   instead of a boulder (B5, B6).
 * Clean drops kept 4.1y+ apart (A8 4.1y); a landing hits players within ~4y.
 */
function detectMeteors(players: PlayerInfo[], life: Life, casts: EnemyEvent[], pullEnd: number): PullError[] {
  const errors: PullError[] = [];
  const why = "Each player drops their meteor on their own spot, apart from the others; boulders that touch go off as Big Burst and kill the party.";
  for (const wave of clusterByGap(hitsOf(players, life, [METEOR_DROP, METEOR_VOID]), (h) => h.e.timestamp, 3000)) {
    const t = wave[0].e.timestamp;
    const targets = castsOf(casts, [METEOR_DROP, METEOR_VOID]).filter((c) => c.timestamp >= t - 2000 && c.timestamp <= t + 1000);
    // A player targeted twice was handed a dead player's meteor: fallout.
    const twice = new Set(targets.map((c) => c.target).filter((n, i, a) => n && a.indexOf(n) !== i));
    const byInst = new Map<string, Hit[]>();
    for (const h of wave) if (h.e.abilityId === METEOR_DROP) byInst.set(instanceKey(h.e), [...(byInst.get(instanceKey(h.e)) ?? []), h]);
    const burst = hitsOf(players, life, BOULDER_BURST).some((h) => h.e.timestamp >= t && h.e.timestamp <= t + 6000);
    const flagged = new Set<PlayerInfo>();
    for (const hs of byInst.values()) {
      const hit = uniq(hs.map((h) => h.p)).filter((p) => !inRaiseGrace(life, p, t));
      if (hit.length < 2 || hit.some((p) => twice.has(p.name)) || deadCount(players, life, t) >= DOOMED_DEAD) continue;
      const dead = hit.filter((p) => life.diedFrom(p, t));
      for (const p of hit) {
        if (flagged.has(p)) continue;
        flagged.add(p);
        errors.push(playerError(p, {
          ruleId: QE_METEOR_RULE_ID, severity: burst || dead.length ? "Major" : "Minor", name: "Dropped Meteors Together",
          description: `Dropped their meteor on top of ${namesOf(hit.filter((x) => x !== p))}'s: one landing hit ${hit.length} players${burst ? " and the boulders went off as Big Burst" : ""}.${dead.length ? ` ${namesOf(dead)} died.` : ""} ${why}`,
          timestamp: t, abilityId: METEOR_DROP, abilityName: "Meteor Impact",
        }));
      }
    }
  }
  // Weighty Blow: four volleys of two lines, each blocked by a boulder.
  for (const h of hitsOf(players, life, WEIGHTY_BLOW)) {
    if (inRaiseGrace(life, h.p, h.e.timestamp)) continue;
    const d = life.diedFrom(h.p, h.e.timestamp);
    errors.push(playerError(h.p, {
      ruleId: QE_WEIGHTY_RULE_ID, severity: d ? "Major" : "Minor", name: "Not Behind a Boulder",
      description: `Hit by a Weighty Blow line (${amountText([h.e])}) instead of a boulder taking it, so that boulder was left over.${d ? " They died." : ""} Line up behind your side's boulder for each Weighty Blow volley.`,
      timestamp: h.e.timestamp, abilityId: WEIGHTY_BLOW, abilityName: "Weighty Blow",
    }));
  }
  const first = hitsOf(players, life, BOULDER_BURST)[0];
  if (first) {
    const t = first.e.timestamp;
    const weighty = castsOf(casts, WEIGHTY_CAST).find((c) => c.timestamp < t);
    const overlap = errors.some((e) => e.ruleId === QE_METEOR_RULE_ID && e.severity === "Major" && t - e.timestamp <= 6000);
    const fell = players.filter((p) => !life.hitAlive(p, t - 500) || inRaiseGrace(life, p, t - 2000));
    const cause = weighty
      ? "a boulder was left over after Weighty Blow"
      : overlap ? "meteors were dropped on top of each other"
        : fell.length ? `boulders touched after ${namesOf(fell)} died (a dead player's meteor still lands)` : "boulders touched";
    errors.push(raidMarker(QE_BOULDER_WIPE_RULE_ID, "Boulders Went Off",
      `Big Burst went off on the party because ${cause}. Treated as the cutoff point.`,
      t, BOULDER_BURST, "Big Burst"));
    void pullEnd;
  }
  return errors;
}

// ── Prosecution of War ──────────────────────────────────────────────────────

/**
 * Prosecution of War's two hits go to the top of enmity: the tanks swap
 * between them. One tank taking both is deliberate with an invulnerability
 * (A2 +1:55); when they die to it (B1 +1:55) the other tank didn't take the
 * second hit. Every instance is reported for the tanks (targeted).
 */
function detectProsecution(players: PlayerInfo[], life: Life, casts: EnemyEvent[], occurrences?: ReportedOccurrence[]): PullError[] {
  const errors: PullError[] = [];
  for (const set of clusterByGap(castsOf(casts, PROSECUTION), (c) => c.timestamp, 5000)) {
    const t = set[0].timestamp;
    const tanks = players.filter(isTank).filter((p) => life.hitAlive(p, t) && !inRaiseGrace(life, p, t));
    occurrences?.push({ mechanicKey: QE_SWAP_RULE_ID, timestamp: t, players: tanks.map((p) => p.name) });
    const hits = hitsOf(players, life, PROSECUTION).filter((h) => h.e.timestamp >= t - 500 && h.e.timestamp <= t + 5000);
    const takers = uniq(hits.map((h) => h.p));
    if (takers.length !== 1 || hits.length < 2 || tanks.length !== 2) continue;
    const victim = takers[0];
    const d = life.diedFrom(victim, hits[hits.length - 1].e.timestamp);
    if (!d) continue;
    const other = tanks.find((p) => p !== victim);
    if (!other) continue;
    errors.push(playerError(other, {
      ruleId: QE_SWAP_RULE_ID, severity: "Major", name: "Missed Prosecution Swap",
      description: `${victim.name} took both Prosecution of War hits and died. The second hit goes to the other tank: Provoke (or Shirk) between the hits, unless the first tank is using an invulnerability.`,
      timestamp: hits[1].e.timestamp, abilityId: hits[1].e.abilityId, abilityName: "Prosecution of War",
    }));
  }
  return errors;
}

// ── deaths with no killing blow ─────────────────────────────────────────────

function walkingDeadRanOut(p: PlayerInfo, d: DeathEvent): boolean {
  const hitT = d.timestamp - DEATH_EVENT_LAG_MS;
  return debuffIntervals(p, WALKING_DEAD).some((w) => Math.abs(w.end - hitT) <= 1500 && w.end - w.start >= WALKING_DEAD_FULL_MS);
}

/** A death right after a listed hit is that hit's error (or its fallout). */
const OWNED_DEATH_IDS = new Set([TOWER_FAIL, BOULDER_BURST, METEOR_DROP, METEOR_VOID, WEIGHTY_BLOW, ...RUSH, ...RUSH_SHORT, ICE_DART, 41021, 41024, 41048, TOWER, PILLAR, RAY]);
function ownedDeath(p: PlayerInfo, d: DeathEvent): boolean {
  return p.damageTaken.some((e) => (AVOIDABLE[e.abilityId] || OWNED_DEATH_IDS.has(e.abilityId)) && (e.amount ?? 0) > 0 &&
    e.timestamp <= d.timestamp && e.timestamp >= d.timestamp - DIED_FROM_HIT_MS - 1000);
}

/** Where the arena was when a player fell (the floor shapes change all fight). */
function fallContext(casts: EnemyEvent[], t: number): { what: string; why: string; protectedFall: boolean } {
  const last = (ids: number[]) => castsOf(casts, ids).filter((c) => c.timestamp <= t).pop();
  const cone = last(AETHERTITHE_CONES);
  if (cone && t - cone.timestamp <= 6000) {
    return { what: "pulled off the edge by an Aethertithe cone", why: "Aethertithe's cones pull players toward the boss; stand outside each cone (or far enough from the edge).", protectedFall: false };
  }
  const push = last([WIND_PUSH]);
  if (push && t - push.timestamp <= 4000) {
    return { what: "pushed off the edge by their Wind of Change gust", why: "Wind of Change pushes 20y away from the side it blows from; stand on a bar at the edge facing the wind (east edge for East Wind, west for West Wind).", protectedFall: false };
  }
  const auth = last([AUTHORITY_PUSH]);
  if (auth && t - auth.timestamp <= 8000) {
    return { what: "knocked off the south edge by Absolute Authority", why: "Absolute Authority's final knockback pushes 30y south; stand at the north wall, or use knockback immunity.", protectedFall: false };
  }
  const radical = last([RADICAL_SHIFT]);
  if (radical && t - radical.timestamp <= 12_000) {
    return { what: "fell when Radical Shift changed the floor", why: "Radical Shift swaps in the previewed floor; stand inside its outline before the change.", protectedFall: true };
  }
  const shift = last([SHIFT_WIND, SHIFT_EARTH, SHIFT_ICE]);
  const shatter = last(WORLD_SHATTER);
  if (shift && (!shatter || shatter.timestamp < shift.timestamp)) {
    if (shift.abilityId === SHIFT_WIND) return { what: "fell off the Wind floor", why: "Laws of Wind leaves narrow bars and diagonal paths; stay on the floor.", protectedFall: false };
    if (shift.abilityId === SHIFT_EARTH) return { what: "fell off an Earth platform", why: "On Laws of Earth, only Gravitational Anomaly (from a well) lets a player cross the void; land on a platform before it runs out.", protectedFall: false };
    const ice = last([LAWS_OF_ICE]);
    const rush = castsOf(casts, RUSH).find((c) => ice && c.timestamp > ice.timestamp);
    const bridges = !!ice && (!rush || t <= rush.timestamp + 3000);
    return bridges
      ? { what: "fell off the Ice floor while crossing", why: "An ice bridge breaks under two players crossing at once; take turns, one per bridge.", protectedFall: true }
      : { what: "fell off the Ice floor", why: "On Laws of Ice, stay on the platforms and bridges.", protectedFall: false };
  }
  return { what: "fell off the arena", why: "Stay on the floor.", protectedFall: false };
}

type Silent = { d: DeathEvent; p?: PlayerInfo; ctx: ReturnType<typeof fallContext> };

/** Classify deaths with no killing blow: falls (errors) versus the wipe being called. */
function classifySilentDeaths(players: PlayerInfo[], deaths: DeathEvent[], casts: EnemyEvent[], pullEnd: number) {
  const silent: Silent[] = [];
  for (const d of deaths) {
    if (d.killingAbilityGameId) continue;
    const p = byName(players, d.player);
    if (p && (walkingDeadRanOut(p, d) || ownedDeath(p, d))) continue;
    silent.push({ d, p, ctx: fallContext(casts, d.timestamp - DEATH_EVENT_LAG_MS) });
  }
  const called = new Set<DeathEvent>();
  // Bridge and Radical Shift falls come in pairs mid-mechanic (A11, A16 kill):
  // never a called wipe.
  const open = silent.filter((s) => !s.ctx.protectedFall);
  // Near the end, with nothing killing anyone after it (A11's bridge falls
  // were 12s before the last Legitimate Force deaths).
  const lastKill = Math.max(-Infinity, ...deaths.filter((d) => d.killingAbilityGameId).map((d) => d.timestamp));
  for (const s of open) if (pullEnd - s.d.timestamp <= CALLED_WIPE_END_MS && lastKill < s.d.timestamp) called.add(s.d);
  for (const s of open) {
    const near = open.filter((x) => Math.abs(x.d.timestamp - s.d.timestamp) <= CALLED_WIPE_WINDOW);
    if (near.length >= CALLED_WIPE_COUNT) near.forEach((x) => called.add(x.d));
  }
  return { silent, called };
}

/** Falls: a death with no killing blow where the floor isn't whole, or after a push. */
function detectFalls(silent: Silent[], called: Set<DeathEvent>, life: Life): PullError[] {
  const errors: PullError[] = [];
  for (const s of silent) {
    if (called.has(s.d)) continue;
    const hitT = s.d.timestamp - DEATH_EVENT_LAG_MS;
    if (!s.p) continue;
    const together = silent.filter((x) => x !== s && !called.has(x.d) && Math.abs(x.d.timestamp - s.d.timestamp) <= 1500 && x.p).map((x) => x.p!);
    const pairText = together.length ? ` (${namesOf(together)} fell at the same moment)` : "";
    errors.push(playerError(s.p, {
      ruleId: QE_FALL_RULE_ID, severity: "Major", name: "Fell Off",
      description: `Died with no killing blow at ${mmss(hitT)}: ${s.ctx.what}${pairText}. ${s.ctx.why}`,
      timestamp: hitT, abilityId: 0, abilityName: "Fall",
    }));
    void life;
  }
  return errors;
}

// ── cutoffs ─────────────────────────────────────────────────────────────────

/** 4+ deaths to one moment's mechanics (raidwides excluded), with the pull over soon after. */
function detectMassDeaths(deaths: DeathEvent[], pullEnd: number): PullError[] {
  // Big Burst deaths carry their own mechanic cutoffs.
  const fatal = deaths.filter((d) => d.killingAbilityGameId && !RAIDWIDE.includes(d.killingAbilityGameId) && d.killingAbilityGameId !== BOULDER_BURST && d.killingAbilityGameId !== TOWER_FAIL);
  for (const g of clusterByGap(fatal, (d) => d.timestamp, MASS_WINDOW_MS)) {
    if (uniq(g.map((d) => d.player)).length < MASS_DEATHS || pullEnd - g[0].timestamp > MASS_END_MS) continue;
    const kinds = uniq(g.map((d) => d.cause));
    return [raidMarker(QE_MASS_DEATHS_RULE_ID, "Mass Deaths",
      `${g.length} players died together to ${joinNames(kinds)} (${joinNames(uniq(g.map((d) => d.player)))}), and the pull ended soon after. Treated as the cutoff point.`,
      g[0].timestamp - DEATH_EVENT_LAG_MS + RAID_MARKER_SORT_OFFSET_MS, g[0].killingAbilityGameId, kinds[0])];
  }
  return [];
}

// ── entry point ─────────────────────────────────────────────────────────────

/** Queen Eternal (The Minstrel's Ballad: Sphene's Burden) errors. Self-gates on the boss's signature casts. */
export function detectQueenEternalErrors(
  players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], occurrences?: ReportedOccurrence[],
): PullError[] {
  if (!enemyCasts.some((c) => SIGNATURE.includes(c.abilityId))) return [];
  const life = buildLife(players, deathEvents);
  const pullEnd = Math.max(0, ...players.flatMap((p) => [...p.damageTaken, ...p.casts].map((e) => e.timestamp)), ...deathEvents.map((d) => d.timestamp));
  const { silent, called } = classifySilentDeaths(players, deathEvents, enemyCasts, pullEnd);

  const errors = [
    ...detectAvoidable(players, life),
    ...detectFreeze(players, life),
    ...detectShares(players, life),
    ...SPREADS.flatMap((fam) => detectSpreadFamily(players, life, enemyCasts, fam)),
    ...detectShortRush(players, life, enemyCasts),
    ...detectEmptyTowers(players, life, enemyCasts, pullEnd),
    ...detectMeteors(players, life, enemyCasts, pullEnd),
    ...detectProsecution(players, life, enemyCasts, occurrences),
    ...detectFalls(silent, called, life),
  ];
  // One Raid error per pull: keep only the earliest mechanic Raid.
  const raids = errors.filter((e) => e.severity === "Raid").sort((a, b) => a.timestamp - b.timestamp);
  for (const r of raids.slice(1)) errors.splice(errors.indexOf(r), 1);
  const firstRaid = () => Math.min(...errors.filter((e) => e.severity === "Raid").map((e) => e.timestamp));
  for (const m of detectMassDeaths(deathEvents, pullEnd)) if (m.timestamp < firstRaid()) errors.push(m);
  const enrage = castsOf(enemyCasts, ENRAGE)[0];
  if (enrage && enrage.timestamp < firstRaid()) {
    const failedPush = enrage.abilityId === 41036;
    errors.push(raidMarker(QE_ENRAGE_RULE_ID, failedPush ? "Authority Eternal (Damage Check)" : "Preservation (Enrage)",
      failedPush
        ? "Authority Eternal went off as the enrage: the Queen wasn't brought to 0.1% before the cast finished."
        : "Preservation went off: the Queen wasn't brought down before the hard enrage.",
      enrage.timestamp, enrage.abilityId, failedPush ? "Authority Eternal" : "Preservation"));
  }
  const calledList = deathEvents.filter((d) => called.has(d)).sort((a, b) => a.timestamp - b.timestamp);
  if (calledList.length >= 2 && calledList[0].timestamp - DEATH_EVENT_LAG_MS < firstRaid()) {
    errors.push(raidMarker(QE_CALLED_WIPE_RULE_ID, "Wipe Called",
      `${calledList.length} players died with no killing blow together (${joinNames(uniq(calledList.map((d) => d.player)))}): the wipe was called and the raid reset.`,
      calledList[0].timestamp - DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  const outAt = (t: number) => players.filter((p) => !life.alive(p, t));
  const collapseT = life.outIntervals.map((w) => w.start).sort((a, b) => a - b)
    .find((t) => outAt(t).length >= COLLAPSE_ANY_COUNT || (outAt(t).length >= COLLAPSE_DEAD_COUNT && pullEnd - t <= COLLAPSE_END_MS));
  if (collapseT !== undefined && collapseT + DEATH_EVENT_LAG_MS < firstRaid()) {
    const who = outAt(collapseT).map((p) => p.name);
    errors.push(raidMarker(QE_COLLAPSE_RULE_ID, "Party Collapse",
      `${who.length} players were dead at once (${joinNames(who)}). Treated as the cutoff point.`,
      collapseT + DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
