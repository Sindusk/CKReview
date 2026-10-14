// lib/mechanics/ffxiv/trials/zoraal-ja.ts
//
// -- GUIDE-DERIVED MODEL: ZORAAL JA --
// Everkeep (Extreme), level100, Dawntrail patch7.0; Extreme only.
// Research checked2026-10-14. Comments only; no Everkeep report analyzed,
// no failures observed, no detector registered. LOG SIGNALS are predicted.
//
// -- SOURCES AND PATCH SENSITIVITY --
// [BM] awgil/BossMod's firsthand Ex2ZoraalJa Enums, States and components;
// path revision799524b33be594900dbad984ebb4d2ef8325d47a,2026-09-30.
// Geometry/timers are public tool observations, not FFLogs verification:
// https://github.com/awgil/ffxiv_bossmod/tree/799524b33be594900dbad984ebb4d2ef8325d47a/BossMod.Modules/Dawntrail/Extreme/Ex2ZoraalJa
// [DATA] XIVAPI Action names/cast times checked for every candidate below;
// Status names/descriptions/CanDispel checked for4047/2096/3262/769/2397:
// https://v2.xivapi.com/api/sheet/Action/39274?fields=Name,Cast100ms
// https://v2.xivapi.com/api/sheet/Status/4047?fields=Name,Description,CanDispel
// [IV] Lyra's original guide; July1 heading, July5,2024 Turmoil correction:
// https://www.icy-veins.com/ffxiv/everkeep-extreme-trial-guide
// [NA] Current Conga/RMMR conventions and orientation markers:
// https://naurffxiv.com/extreme/everkeep
// [JP] Hamkatsu macro, invuln plan and knock-up troubleshooting:
// https://xivjpraids.com/7.0_dawntrail/extreme_trials/zoraal_ja/
// [G8] Original Hamkatsu explanation, stack vulnerability and jump rules:
// https://game8.jp/ff14/622454
// [SEFIX] All Duty Worlds fixed Projection expiry by2024-07-05,19:00PDT
// (2024-07-06UTC). Before fix an untriggered debuff silently disappeared;
// current expiry triggers its stack [JP]. Launch wall-skip advice is stale:
// https://na.finalfantasyxiv.com/lodestone/news/detail/3b60d81a7123a4894e208f835c043c22eb4697b5
// [SE1] 7.1,2024-11-12: wipe-earned Echo +5%, maximum25%, after >=3m.
// Later gear/Echo changes damage tolerance and how much chronology is seen:
// https://na.finalfantasyxiv.com/lodestone/topics/detail/9b42b2425f3a680caea3281ccd65c99677cb00e2
// No researched source establishes later target-count/geometry changes.
// Thaliak's Everkeep page contains no usable timeline; not timing evidence.
//
// -- LOG VOCABULARY, SEVERITY AND ATTRIBUTION --
// Every numeric ID is a game-data cast/damage/aura candidate, not a proven
// FFLogs mapping. Helpers can own damage instead of the visual boss cast.
// DATA has unnamed actions37717 teleport,37728 track visual and35567
// Duty's Edge target selection;37799 auto has a Japanese name in DATA.
// Status->FFLogs candidates: Projection4047->1004047; Wind Resistance
// Down II2096->1002096; Liftoff3262->1003262; Burning Chains769->1000769.
// None is dispellable. Generic actor status2397 extra0x2C7/0x2CD is unnamed
// in DATA; it is not proof of a player mechanic. These IDs may be reused.
// Magic vulnerability is described for stacks/spreads/busters; its IDs and
// durations outside Turmoil remain unverified. No avoidable Damage Down
// established here. Survived avoidables without DD are Minor; attributable
// death/wipe or verified DD is Major. Raid = irreversible wipe cutoff.
// A Major names a proven root-cause player. An overlapping hit's victim is
// not necessarily the wrong dropper/tether holder. Correct damage deaths
// are mitigation issues; missed duties/retargets after death are fallout.
// Icons, portal/map effects, tethers and calls may be absent from FFLogs.
// No researched interrupt, Esuna, killable-add objective or boss energy bar.
// Delayed marks' death/early-removal behavior is unresolved unless specified.
//
// -- ARENA, SHAPE AND CLOCK --
// One continuous scripted timeline [BM], no researched HP transition.
// Guides label three phases; THREE Dawn of an Age windows are terrain
// cycles, not three boss HP pools. Normal arena:40x40y square rotated45deg,
// center(100,100), north decreasing z. Edge inflicts light Bleeding [IV],
// not instant death. Dawn shrinks to20x20y rotated square, now with FALLS.
// Small grid is4x4,5y cells; center coordinates in local NW/NE axes are
// -7.5,-2.5,2.5,7.5. Outer platform centers are30y away on diagonals.
// First/third Dawn have four outer preview platforms; second has ONE
// accessible NW/NE partner platform. Pair-platform centers remain30y apart.
// Normal-arena Triumph uses a DIFFERENT4x4 sword lattice:10y spacing,
// local coordinates-15,-5,5,15 [BM]. Do not equate these with Chasm cells.
// BM nominal cast START offsets from pull, seconds, rounded:
// +11 Actualize; +21 Divide/+29 Half; +43 Divide/+51 Regicidal;
// +68 Dawn1; +85 Vollok/+94 Sync/+103 Half Full; +114 Gateway;
// +122 Blade/+130 Track; lanes+142/cells+147; Actualize+147;
// +159/+170 Triumph; +184 Half; +198 Actualize; +210 Turmoil;
// +261 Bitter; +281 Dawn2; +298 Drum; +312 Vollok/+321 Sync;
// +330 Aero; swords/cells+335; +342 long Half; +354 Duty;
// +368 Chains; +388 Actualize; +401/+411 Triumph; +421 Circuit;
// +436 Regicidal; +452 Turmoil; Half Full+473/+482/+493; +503 Bitter;
// +523 Dawn3; +540 Vollok/+548 Sync; swords+562/cells+565;
// +565 Duty; +582 Gateway/+590 Blade/+599 Track; lanes+611/cells+616;
// +616 Actualize; +629 Divide/+637 Half; +651 Actualize enrage(10s).
// Deadline~+661(11:01), sums of BM state delays, not measured logs.
// G8's public clock broadly agrees but differs by~1-2s. No passive rage,
// add-phase deadline or separate resource soft enrage researched.
//
// -- COMMUNITY ASSIGNMENTS AND STRATEGY VARIANCE --
// Four partner pairs: MT/M1,OT/M2,H1/R1,H2/R2. H1/H2 and paired DPS
// are community slots, not user assignments; tank/melee pairs need a plan.
// JP Turmoil trigger order: H1,H2,R2,R1,M2,M1,OT,MT. NA Conga is an
// ordered line of individual pops; rolling whole-party stacks also satisfy
// the serial-trigger rule. Slot order itself is not an error.
// Drum RMMR, left->right facing boss/target platform: H1/R1,MT/M1,
// OT/M2,H2/R2. Later mirrored-cell assignment: tank/melee pairs front,
// healer/ranged pairs rear, one pair left/one right on EACH role platform.
// Whichever role has Drum circles stays; opposite role is launched.
// Stormy Edge: immunity or safe natural knockback. Drum/Aero: intended
// launches cannot be prevented [BM]; correct arrival matters, not immunity
// cast alone. Bitter: invuln sets or alternating swaps; current JP prefers
// invuln and notes only WAR can cover both sets alone at~242s separation.
// Legacy Turmoil wall cheese belongs only to pre-fix reports. It is not a
// valid current plan; the normal wall DoT still is not an instant kill.
//
// -- ACTUALIZE / DAWN OF AN AGE / ENVIRONMENT --
// Actualize37784:5s magical raidwide, including floor restoration after
// each Dawn. Dawn37783:7s heavy magical raidwide and small-grid transition.
// Expected launch/brief interruption at floor restoration is not an error.
// LOG SIGNAL: normal boundary Bleeding (ID unresolved); FAULT: boundary
// entrant if avoidable; CONSEQUENCE: Minor->Major if causally lethal.
// LOG SIGNAL: no-ability death at small-platform edge or failed launch;
// FAULT: walker/unsafe launch aimer only with context; CONSEQUENCE: Major.
// Deliberate resets and earlier forced displacement can share this shape.
// Correct raidwide/transition damage deaths are not positional errors.
// Actualize39274:10s distinct enrage; LOG SIGNAL: completed39274/lethal
// group damage; FAULT: group damage check, no presumed player;
// CONSEQUENCE: Raid. Ordinary37784 completion never proves enrage.
//
// -- MULTIDIRECTIONAL DIVIDE / FORWARD AND BACKWARD HALF --
// Divide37794:5s initial cross length30/width4.37795:16s helper cross
// length30/width8;37796:16s extra length40/width4 lines at breaks.
// Dodge initial lanes, then enlarged cross/additional lines ~11s later
// while preparing Quarter safe region. Normal Half visuals37755/56
// ForwardR/L,37757/58 BackwardR/L:8s; long39322..25:9s during Dawn2.
// 37759 Forward Edge /39282 Backward Edge:1s movement/front-back damage;
// 37760:1s Half Full helper side cleave. Forward moves through boss and
// turns around; safe original FRONT quadrant on GLOWING sword side.
// Backward safe original REAR quadrant on NON-GLOWING side [IV/G8].
// Read pre-jump facing and remain safe from Divide/other projections too.
// LOG SIGNAL:37794..96 avoidable damage; FAULT: failed lane dodge;
// CONSEQUENCE: Minor->Major. LOG SIGNAL:37759/39282/37760 hit;
// FAULT: wrong safe quadrant unless earlier displacement; CONSEQUENCE:
// Minor->Major. Boss visual casts are not necessarily damaging events.
//
// -- HALF FULL / HALF CIRCUIT --
// Half Full37736/37737:6s visuals,37790:6.3s helper side hit. Glowing
// sword half is unsafe; crosses center immediately after small swords and
// three times during Turmoil2. Preposition on safe side without bad stack.
// Half Circuit37739/37740:7s visual;37793 radius10 circle OR37792
// donut10..30 at7s,37791 side cleave~0.3s later. Smiting Circuit37732/33
// are helper visuals, not separate player spread/stack mechanics.
// Combine in/out with safe half; wide helper rectangles60x120 represent
// half-plane coverage, not120y-wide playable arena [BM].
// LOG SIGNAL:37790..93 damage; FAULT: wrong side/in-out position if
// independent; CONSEQUENCE: Minor->Major. No removable player mark.
//
// -- REGICIDAL RAGE / BITTER WHIRLWIND --
// Regicidal39227:8s; TWO transferable tethers89 initially on random
// players.39228 radius8 busters at~0.1s after completion. Tanks take one
// each, separate from group AND each other while dodging active lanes.
// LOG SIGNAL:39228 non-tank target or collateral overlap; FAULT: missed
// tank takeover/unsafe holder or intruder only with duties/tether geometry;
// CONSEQUENCE: Minor->Major on causal death. Own tank buster expected.
// Bitter39229:5s visual;39230:5s first helper radius5 buster;39231
// repeat visuals,39232 next damage at~3.3/~6.4s after first hit. THREE
// hits per set, TWO sets~242.3s apart. Each leaves magic vulnerability.
// Swap MT->OT->MT between hits, or one tank invulns all3; set2 may need
// other tank's invuln. Remain away from others; do not share normal soaks.
// LOG SIGNAL: reused unprotected tank hit while vuln, wrong target or
// extra39230/32 victims; FAULT: failed established swap/unsafe buster
// position, not presumed dead tank; CONSEQUENCE: Minor->Major. Correct
// repeated invuln hits/vulnerability and ordinary tank damage are legal.
//
// -- VOLLOK / SYNC / SMALL AND LARGE FANGS --
// Small Vollok37719:4s visual,16 FangVollokSmall0x42B7 [BM enum].
// Sync37721:5s connects two side patterns to central grid. Source37785:
// 8s5x5y fang cast; mirrored37786:1s helper Chasm of Vollok damage.
// Translation from outer to center preserves local cell coordinates.
// Correct: intersection safe from BOTH source patterns; Dawn1 Half Full
// resolves~0.5s after swords, so a safe cell alone may need a side dodge.
// Dawn3 follows swords with player cells and Duty's Edge instead.
// Large Vollok37778:5s visual, TWO large fangs0x42B8, one per platform.
// 37779:8s10x10y source squares;37780:1s mirrored squares. Each fang
// covers2x2 small cells; union leaves EIGHT unique safe local cells [IV],
// across which all8 players must allocate without mirrored duplicates.
// LOG SIGNAL:37785/86/37779/80 damage; FAULT: wrong combined-pattern
// cell unless displaced; CONSEQUENCE: Minor->Major. Preview swords and
// mirrors are hazards, not killable adds or an interrupt assignment.
//
// -- CHASM OF VOLLOK: PLAYER CELLS --
// 37769 damage; icon185 on all8, resolves~6.1s after mark [BM]. Cell
// containing marked player's current position becomes5x5y AoE; own hit
// and magic vulnerability expected. Whole cell matters, not player radius.
// During two-platform section, each drop is ALSO mirrored into SAME local
// cell of other platform; two players with matching local coordinates
// collide even when their world positions are30y apart.
// Correct: one player per unique safe local cell across BOTH platforms;
// movement still free until snapshot. Otherwise spread near clock cells.
// LOG SIGNAL: excess37769 exposure and/or overlapping cell sources;
// FAULT: wrong assigned cell dropper, not necessarily collateral victim;
// CONSEQUENCE: Minor->Major. Own single exposure is legal. BM explicitly
// ASSUMES dead targets do not drop; real death/snapshot behavior is open.
//
// -- GREATER GATEWAY / BLADE WARP / FORGED TRACK --
// 37761/37726/37727:4s visual casts. FangBlade0x42AB source preview
// 37788:10.9s20x5y lane;37789 untelegraphed transferred narrow lane.
// Gateway lane links change destination row/column. Blue: narrow; red:
// Fiery Edge37762 visual,37763 center/37764 adjacent5y lanes (15y total).
// Green: Stormy Edge37765 visual,37766 damaging5y center lane,37767
// perpendicular7y knockback. DATA helper casts0.1s, BM enum0.5s; unverified.
// BM finds FOUR combined patterns: NE/NW red/green mirrored; SE/SW narrow
// links exchange inner/outer sides. Do not treat these as fixed world lanes.
// Narrow resolves first, fire~0.2s later or wind push~0.6s later [BM].
// Correct: avoid transferred blue lanes and15y fire; green stay off center
// line with landing room, or use Arm's Length/Surecast [G8]. Then spread
// for cells~4.9s later. A correct green knockback is not avoidable damage.
// LOG SIGNAL:37789/37763/64/66 damage; FAULT: failed mapped-lane dodge;
// CONSEQUENCE: Minor->Major. LOG SIGNAL:37767->fall/unsafe cell;
// FAULT: unsafe start or failed planned immunity if established;
// CONSEQUENCE: Major if lethal, Minor on survived collateral.
// Portal color/link routing may not be exposed by player damage events.
//
// -- PROJECTION OF TRIUMPH: MOVING CIRCLES / DONUTS --
// 37770:5s, cast TWICE per section, two opposed incoming rows per cast.
// 16 normal-arena sword positions. Row meeting a sword resolves Walls
// 37772 radius4 circle or Siege37771 donut3..8,0.5s helper casts.
// BM SIX volleys~5s apart,8/8/16/16/8/8 explosions=64 per full section.
// Donut safe within3y of sword; circle safe >=4y away but outside nearby
// donuts. Observe each incoming row; second can repeat/change shape.
// First section overlaps Forward/Backward Half between volleys4/5,
// then Actualize near volley6. Second Circuit resolves between3/4;
// Regicidal tethers arrive around5, hit after6. Keep dodging after cleave.
// LOG SIGNAL:37771/72 damage; FAULT: failed current-volley shape dodge
// if independent; CONSEQUENCE: Minor->Major. No player debuff to dispel.
// Row/sword helper actors are not killable adds, and row contact alone
// is not the failure: the resulting AoE geometry determines safety.
//
// -- PROJECTION OF TURMOIL / MIGHT OF VOLLOK --
// 39560:5s visual;4047 Projection on each player, ONE moving N->S row
// 0x42BD. Marked player's row contact consumes4047 and triggers Might
// 37773 radius8 split stack. Current aura EXPIRY also triggers stack [JP].
// Eight living marked carriers ->EIGHT ordered pops. G8 gives2s magic
// vulnerability on stack recipients; wait for it to clear between pops.
// Correct: next carrier touches row with party within8y; rest stay ahead,
// move south with row. Once4047 consumed, that player can cross freely.
// Conga/rolling-stack plans choose order; no order inherently in logs.
// Boss mitigation debuffs affect these stacks [JP]. Own repeated37773
// hits and brief vuln are expected. MT may sit out some shares [G8];
// fewer than8 recipients is not by itself a failed stack or a missed pop.
// Turmoil2 adds three Half Full casts during advance; maintain same serial
// timing while dodging safe half. Final Bitter overlaps section's end.
// LOG SIGNAL: two37773 triggers while prior stack vuln active; FAULT:
// premature second carrier only if identifiable, not every stack victim;
// CONSEQUENCE: Minor->Major. LOG SIGNAL:4047 expiry->late37773 outside
// coordinated group; FAULT: missed living carrier if known;
// CONSEQUENCE: Major if causally lethal, Raid if stacked expiries doom pull.
// LOG SIGNAL: under-shared37773 lethal damage; FAULT: isolated trigger/
// absent assigned members if proven; CONSEQUENCE: Major. Dedicated expiry
// penalty ID and carrier-death detonation/retarget behavior are unresolved.
//
// -- DRUM OF VOLLOK / TWO-PLATFORM LANDINGS --
// 37774:7.4s visual;37775:8s helper radius4 EXACTLY TWO-player stacks,
// FOUR pairs, marked DPS OR supports. Marked players launch in place;
// unmarked partner flies25y directly AWAY FROM marked player's position.
// Pair line toward new NW/NE platform, within4y of own circle; unmarked
// on destination side of partner. BM treats launch as immunity-ignoring.
// Then roles separate four per platform for Large Vollok/mirrored cells.
// LOG SIGNAL: incorrect37775 recipient count or launch->fall; FAULT:
// wrong partner/relative launch position if proven, or bad circle anchor;
// CONSEQUENCE: Minor->Major. Marked players remaining in original platform
// and every correct paired hit/launch are expected, not missing movement.
// Dedicated enumeration-fail ability/count penalty is not established.
//
// -- AERO III / DUTY'S EDGE / BURNING CHAINS --
// 37776:5s visual; TWO BitingWind0x42BE radius4 zones,37777 on contact
// damage/launch. Push25y away from TORNADO CENTER, immunity-ignoring [BM].
// 2096 Wind Resistance Down II/3262 Liftoff are normal contact auras.
// Long Forward/Backward Half makes one platform unsafe; occupants jump
// to safe platform before cleave. Aim from near tornado edge toward other
// platform, not arbitrary side; do not reenter with wind vuln [G8].
// Duty37748:4.9s visual,35567 target selection,37749 repeated visuals;
// 38055:100x8y shared line, FOUR hits, first+0.4s then every2.1s.
// Gather all8 on safe platform and align to marked target; guides say
// damage increases per hit [IV], exact formula unresolved. Own hits legal.
// Burning37781:5s visual;769 DoT and four DPS/support tethers128.
// Role that DID NOT just Aero-jump now jumps back, then pairs separate
// enough across platforms to break.37782 is chain damage, geometry unknown.
// Removal: spatial chain break clears aura/tether; not Esuna/heal removal.
// LOG SIGNAL: repeat37777 with2096 ->death; FAULT: repeated entrant if
// alive/independent; CONSEQUENCE: Major. First correct wind hit is legal.
// LOG SIGNAL: launch->fall; FAULT: wrong tornado approach vector;
// CONSEQUENCE: Major if context proves independence.
// LOG SIGNAL: missing living38055 recipients/unsafe line aim; FAULT:
// failed platform gather/member or target aim if known;
// CONSEQUENCE: Minor->Major. Death to correct share is mitigation issue.
// LOG SIGNAL: persistent769/37782 after assigned jump/break opportunity;
// FAULT: failed pair member only with movement evidence; CONSEQUENCE:
// Minor->Major. Brief pre-break DoT is expected. Pair death/unlink behavior
// and exact distance/time threshold are unresolved, not a guessed deadline.
//
// -- PULL END AND OPEN QUESTIONS FOR LOG VERIFICATION --
// Hard cutoff is39274 enrage. Double Turmoil pops/stacked expiries,
// failed pair launches or mirrored-cell collisions can cause collapse;
// no researched one-miss always-wipe tower/add check. Establish irreversible
// outcome before Raid cutoff; later errors after death remain fallout.
// 1. Map damage/status candidates, generic Magic Vulnerability IDs and any
//    DD, wall Bleeding, enumeration/expired-Projection penalty abilities?
// 2. Confirm scripted clock/enrage, terrain snapshots/cleanup, helper
//    lifecycle and hit counts, especially Triumph64 versus damage rows?
// 3. Chasm: own-hit versus collateral records, cell boundary tolerance,
//    mirrored sources and dead-carrier cancellation/snapshot/retarget?
// 4. Forged routes/landing vectors, Stormy immunity and exact helper timing;
//    Drum/Aero launch range, failed-enumeration result and wind vuln duration?
// 5. Turmoil: Projection duration, expiry/death effects, stack split/size
//    scaling,2s vuln, simultaneous-carrier attribution and pre-fix reports?
// 6. Duty/Bitter damage scaling, target/enmity snapshots, buster vuln
//    duration, invuln/swap plans and marked-player deaths/retargets?
// 7. Chains: break distance, tick grace, removal on death/phase restoration;
//    no-ability falls versus resets and earlier displacement cascades?
