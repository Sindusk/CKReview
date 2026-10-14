// lib/mechanics/ffxiv/trials/queen-eternal.ts
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
