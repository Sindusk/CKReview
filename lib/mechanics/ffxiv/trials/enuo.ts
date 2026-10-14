// lib/mechanics/ffxiv/trials/enuo.ts
//
// -- GUIDE-DERIVED MODEL: ENUO --
// The Unmaking (Extreme), level100, Dawntrail patch7.5; Extreme only.
// Research checked2026-10-14. Comments only; no Enuo report analyzed,
// no failures observed, no detector registered. LOG SIGNALS are predicted.
//
// -- SOURCES AND PATCH SENSITIVITY --
// [BM] awgil/BossMod's firsthand Ex8Enuo Enums, States, Components, Config;
// path revision799524b33be594900dbad984ebb4d2ef8325d47a,2026-09-30.
// Public tool observations/candidate IDs, not verified FFLogs evidence:
// https://github.com/awgil/ffxiv_bossmod/tree/799524b33be594900dbad984ebb4d2ef8325d47a/BossMod.Modules/Dawntrail/Extreme/Ex8Enuo
// [DATA] XIVAPI Action names/cast times and Status names/descriptions/
// CanDispel checked for every candidate ID below:
// https://v2.xivapi.com/api/sheet/Action/50014?fields=Name,Cast100ms
// https://v2.xivapi.com/api/sheet/Status/3943?fields=Name,Description,CanDispel
// [IV] Lyra's original guide, updated2026-05-01:
// https://www.icy-veins.com/ffxiv/the-unmaking-extreme-trial-guide
// [NA] Current Hector/Kobe/modified-enuo strategies and direction variants:
// https://naurffxiv.com/extreme/the-unmaking
// [JP] Published Nukemaru macro, partner/orb and tower priorities:
// https://xivjpraids.com/7.0_dawntrail/extreme_trials/enuo/
// [G8] Original Japanese guide, movement rules and add-phase explanation:
// https://game8.jp/ff14/782325
// [TL] Thaliak's firsthand reference timeline; phase3 offsets depend on
// Beacon kill time. Orb solo penalty and death-unlocks-add observations:
// https://thaliak.com/extremes/unmaking/
// [SE5] Released2026-04-28, eight players, minimum average ilvl770:
// https://na.finalfantasyxiv.com/lodestone/topics/detail/07320affa7e0fcd9685afcbe54fbf55405b6d822
// [SE51] 7.51,2026-06-02: Gauntlet Taken now clears immediately on add
// defeat; Protective/Aggressive attacks no longer resolve after the add
// dies before cast completion. Old delayed removals/hits can be game bugs:
// https://eu.finalfantasyxiv.com/lodestone/topics/detail/f2e3faea7dd6fecf3f1b66a2a4c30892684d2938/
// Release dates checked against official maintenance announcements.
// 7.55 changes mount rewards; researched7.56/7.57 notes/hotfix index show
// no encounter-count/geometry change or Enuo Echo addition. Damage
// tolerances and add kill times remain gear/patch dependent.
//
// -- LOG VOCABULARY, SEVERITY AND REMOVALS --
// IDs below are game-data cast/damage/aura/penalty candidates, not proven
// FFLogs mappings. NPC IDs identify types, not individual log actors.
// Empty DATA action names:49927 jump,49937 boss auto,49938/50012 add
// lifecycle,49974 portal teleport,50015 unexplained helper,50016 Looming
// auto,50751/52/53 personal add autos. These labels come from BM.
// Status->FFLogs candidates add1000000: Magic Vulnerability Up2941;
// Dark Resistance Down II3323; Chains of Condemnation4562; Freezing Up3523;
// Deep Freeze4150; Unbecoming4882; Petrification3007; Disease3943;
// Quantum Entanglement4884/player and Nullification4883/shadow;
// Sustained Damage4149.2941 is reused, e.g. Necron; Sphene freeze IDs differ.
// Gauntlet Taken5357..5364 pairs with Gauntlet Thrown5365..5372 by index.
// Only Disease is dispellable among these [DATA]. Other auras resolve
// naturally/by mechanic cleanup; no documented explosive dispel effect.
// Survived avoidables without DD = Minor; attributable death/wipe = Major;
// verified DD invokes README's Major exception. DD is not established for
// any Enuo avoidable here. Raid marks irreversible cutoff, not death count.
// Blame proven misplaced aimer/soaker, not every damage victim. Correctly
// executed raw-damage deaths are mitigation issues. Retargeted/missed
// duties caused by an earlier death are fallout, not another mechanic error.
// Icons, facing, tether/map cues and assignments may be absent in FFLogs.
//
// -- ARENA, PHASE TRIGGERS, CLOCK AND GAUGE --
// Circle radius20 centered(100,100), north decreasing z [BM]. Walking off
// during boss phases is fatal. All for Naught removes this small floor;
// intermission is a huge square (BM says500x500, draws only60x60).
// Three guide phases: opening boss -> TIMED All for Naught -> add phase
// -> KILL Beacon in the Dark -> final boss. BM calls final boss phase P2.
// No HP push threshold established for opening; Enuo is untargetable
// throughout intermission. There are one, then TWO outer void portals.
// Nominal BM cast START offsets from pull, seconds, rounded:
// +9 Meteorain; +22 Grows; +36 Wakes; +40 Meltdown; +52 Emptiness;
// +60 Grows; +77 Gaze; +107 Vacuum; +118 Emptiness; +128 Freeze;
// +136 Meteorain; +150 All for Naught(5s); untargetable~+155.
// Looming becomes targetable~+175; tower/cone impacts~+185/+209;
// four personal adds appear~1.2s after each, eight duels total.
// Duty gauge climbs during intermission and continues after Looming dies
// until Beacon dies [TL]. At100, Apeiron48478 instantly kills the group.
// BM estimates~+279 or110.4s from first gauge/director update; TL~+282.
// Exact initial value/tick rate/error gains/reset semantics are unresolved;
// no comparable gauge accumulation is researched in either boss phase.
// Beacon kill -> Enuo targetable~8.3s later. Final phase T=retargetable:
// +0 Lightless World; +20 Almagest; +31 Grows; +45 Wakes(lasers+55/+66);
// +66 Holy; +80 Grows; +94 Dimension; +110 Vacuum/+114 Meltdown;
// +131 Gaze; +166 Almagest; +179 Wakes; +183 Hunts; +212 Emptiness;
// +223 Hunts; +252 Emptiness; +261 Dimension; +276 Almagest; +287 Grows;
// +301 Wakes(lasers+311/+323); +323 Freeze; +335 Grows; +349 Dimension;
// +364/+374 Meteorain; +388 Almagest enrage(9s), lethal~T+397.
// These are sums of BM state delays, not measured report timestamps;
// quicker Beacon kill advances the final phase and absolute enrage time.
//
// -- COMMUNITY ASSIGNMENTS / STRATEGY VARIANCE --
// Two light parties, one tank/healer/melee/ranged each; G1west/G2east is
// common. Slots below are examples, not this user's roster assignments.
// JP Airy partners: N MT+D3; E H2+D4; S OT+D2; W H1+D1. Implied clock
// DPS spots D3NE,D4SE,D2SW,D1NW; DPS rotate CCW to cardinal supports.
// Hector instead rotates supports CW to intercardinal DPS [IV/NA]. Both
// are legal; cardinal versus intercardinal baits require the matching plan.
// JP orb orientation: tanks toward enlarged orbs, healers left, melees
// right, ranged opposite. BM Hector preset uses role order THMR clockwise
// separately for fast/slow orbs. Actual orb direction/order governs motion.
// JP intermission clockwise from N priority MT/D1 -> OT/D2 -> H1/D3 ->
// H2/D4; one member of each pair is eligible each role wave. NA uses color
// pairs or modified-enuo snake priority (TR northmost, HM southmost).
// NA Hunts variants: first runners CW, second CW OR CCW. Published JP
// macro uses CW->CCW. Direction choice itself is never a failure.
//
// -- METEORAIN / ALMAGEST / LIGHTLESS WORLD --
// Meteorain50049:5s magical raidwide; Almagest49972:5s magical raidwide.
// Lightless World50029:10s visual, then50030 repeated damage and50031
// final hit. BM/TL/G8 say SIX hits, first->last~2.5s; IV says five.
// Adopt six provisionally. All damage in these blocks is expected; proper
// mitigation/healing deaths are not positional mechanic errors.
// Final Almagest50050:9s cast is hard enrage, distinct from routine49972.
// LOG SIGNAL:50050 completes with lethal raid damage; FAULT: group damage
// check, no automatic individual; CONSEQUENCE: Raid. Same for Apeiron.
//
// -- NAUGHT GROWS / RETURN TO NOTHING --
// 49975/49976:7s controller, resolve AoEs at8s. Arrow endpoint locates
// effect, shape chooses circle/donut; IDs are not inferred element labels.
// Portal AoEs49977 radius40 circle /49978 donut40..60; boss AoEs49979
// radius12 circle /49980 donut6..40 [BM]. P1 uses portal, final phase
// combines one boss-centered and one portal-centered effect. Be in BOTH
// safe regions before the accompanying wild charge~0.8s later.
// Return to Nothing49983: two healer-directed width6 lines, four per line;
// first person from each moving orb takes greater damage. Great Return
// 49984: one healer line, all8, FIRST TWO take greater damage [IV].
// Tanks stand toward orb/outside of stack and mitigate, not boss-front;
// marked healer positioning aims its orb->party line. BM models source
// ~7y outside marked player, line ending toward boss. Own split damage and
// short2941 are expected. Exact damage split/closest-target multiplier open.
// LOG SIGNAL:49977..80 avoidable hit; FAULT: failed dodge if not displaced;
// CONSEQUENCE: Minor->Major. LOG SIGNAL: charge misses members, lines
// overlap, non-tank intercepts first hit(s); FAULT: wrong aimer/member or
// interceptor under known plan; CONSEQUENCE: Minor->Major on death.
// Marked-player death cancellation/retarget is not established by BM's
// removal of its display. No delay/early-explosion-on-death claim verified.
//
// -- MELTDOWN / CHAINS OF CONDEMNATION --
// 50040:4s cast;4562 applies~1s later, movement causes fire damage [DATA].
// G8 gives2s duration and permits stationary attacks (not full Pyretic).
// 50041:4.5s radius5 ground circles, bait together, then dodge;50042:5.5s
// radius5 personal spreads with2941, resolve~1s after ground circles.
// Correct: center bait in P1; stop while4562 active; on removal run to
// clock spots, outside puddles and >5y from each other's spread centers.
// Final-phase overlap with Vacuum needs its safe region prepositioned.
// LOG SIGNAL: movement-triggered damage while4562 (damage ID unresolved);
// FAULT: mover only if movement/damage proved; CONSEQUENCE: Minor->Major.
// LOG SIGNAL:50041 or multiple50042 exposures; FAULT: failed dodge/spread
// or unsafe dropper if established; CONSEQUENCE: Minor->Major. Own50042
// and2941 expected.4562 cannot be Esuna'd; early death behavior unknown.
//
// -- AIRY / DENSE EMPTINESS --
// Airy50032 /Dense50033:4s visual, damage~1s later. Airy50034 four
// support-aimed60y/60deg cones [BM], two per cone, one DPS with each.
// Dense50035 two healer-aimed60y/100deg cones, four per light party.
// Opposite opening variants both occur; final versions follow Hunts.
// Use active cardinal/intercardinal pair plan for Airy, E/W light parties
// for Dense; keep cone groups apart. Magic vuln and own split hit normal.
// LOG SIGNAL: double50034/35 exposure or short recipient groups; FAULT:
// misplaced bait target/member under known plan; CONSEQUENCE: Minor->Major.
// Body count affects split damage, not a researched distinct failure spell.
//
// -- GAZE OF THE VOID / FAST AND SLOW ORB SOAKS --
// 50002:6s controller;50003/04:7s spawn controllers;50005:7s helper
// cast, radius40/45deg cones. TEN cones in rotating order, first->last
// ~3.6s; two sectors repeat. Dodge behind first then follow clearing cones.
// Result: eight moving edge orbs, four fast/yellow tether407, four
// slow/purple406. One enlarged orb per speed group from repeated sectors.
// Small0x4DC5 uses Burst50006 radius5; big0x4DC6 Violent Burst50007
// radius6. Each is TWO-player shared soak; tanks take both big orbs.
// Fast first, wait for2941 to expire, then assigned slow; TL gives5s vuln.
// Same-role pairs T/T,H/H,M/M,R/R use role plan relative to BIG ORBS,
// not fixed north. Colors may alternate unevenly; nearest purple is not
// necessarily assigned. BM slow travel~1.3y/s from20y,~15.4s to boss;
// its18s post-cone deadline is a display timeout, not a proven safe wait.
// LOG SIGNAL:50005; FAULT: failed cone dodge; CONSEQUENCE: Minor->Major.
// LOG SIGNAL:50006/07 on lone player then forced fall; FAULT: missed
// partner or premature toucher if known; CONSEQUENCE: Major. TL reports
// solo soak knockback ignores immunity. No separate solo penalty ID known.
// LOG SIGNAL: second50006/07 while2941 and death; FAULT: early absorber/
// wrong pair if established; CONSEQUENCE: Major. Correct two-hit soaks legal.
// Orb reaches boss ->Big Burst50008(small)/50009(big), radius60, group
// Sustained Damage4149 [TL]. LOG SIGNAL: penalty +4149; FAULT: missing
// living assigned pair if known, not all DoT victims; CONSEQUENCE: Major
// if attributable death, Raid if unrecoverable. Orb disappears on absorb;
// collision/retarget after a dead soaker remains unresolved.
//
// -- VACUUM / SILENT TORRENT --
// 49994:2s visual;49995/96/97:3.5s appearance controllers.49998/99/50000:
// 4s Silent Torrent ring sectors r17..19, widths20/40/60deg. Followup
// Vacuum50001:1.5s cast, radius7 circles at resulting helper locations.
// Lines resolve~6.1s after controller end, circles~2.1s later [BM].
// Stand inside ring, toward long-arc side (opposite short arc) to avoid
// near-center short-arc explosion [IV]. Final phase layers Meltdown:
// pick safe location before Chains, then freeze movement until expiry.
// LOG SIGNAL:49998..50001 avoidable hit; FAULT: failed dodger, or prior
// displacement/Chains fallout; CONSEQUENCE: Minor->Major. Safe geometry
// does not imply center alone is always safe. No removable mechanic mark.
//
// -- DEEP FREEZE / FLARE TANKBUSTERS --
// 50043:5s raidwide; Freezing Up3523 requires continued movement until
// expiry or4150 Deep Freeze incapacitates/DoTs. Simultaneous50044:6s
// helper flares on TOP TWO ENMITY players [G8]; keep both tanks top-two.
// Common tank NW/NE max melee, other six south, separated from flares;
// use mitigation. BM models13y danger circle but enum says range40
// proximity AoE;13y is NOT established zero-damage/failure threshold.
// LOG SIGNAL:4150 apply/ticks; FAULT: player stopped while able to move;
// CONSEQUENCE: Minor->Major. Freeze due to previous incapacity is fallout.
// LOG SIGNAL: overlapping tank50044 hits/excess collateral; FAULT: bad
// flare placement or incorrect top-two threat only if established;
// CONSEQUENCE: Minor->Major. Own flares/raidwide and mitigated proximity
// damage at planned positions are expected; exact falloff curve unknown.
//
// -- ALL FOR NAUGHT / LOOMING / VOIDAL TURBULENCE --
// 50010:5s transition, boss untargetable and Unbecoming4882 party DoT.
// Looming0x4DC7 emergence:50011:5s visual,49369:6s radius8 lethal center,
// 49982:6s helper knockback; BM20y. Avoid center, immunity permitted [G8].
// Small boss-phase death edge is absent here; correct knockback is expected.
// Looming auto50016 is heavy tank damage; eight personal duels below.
// Two Voidal Turbulence50036:6s waves, damage50038 at~7.3s, four60y/
// 60deg cones on DPS OR supports; unmarked other role takes four towers.
// Empty Shadow50013:7s radius6 towers, TWO west/TWO east, one each.
// Wave2 swaps duties; dark resistance3323 on normal cone/tower hits.
// Place cones in wide tower-free gaps, not narrow gap clipping soakers;
// soak assigned tower. Big Burst50014 radius60 is distinct tower penalty.
// LOG SIGNAL:50014/missing50013 soak; FAULT: missed eligible soaker if
// known; CONSEQUENCE: Major on attributable death, Raid if wipe inevitable.
// LOG SIGNAL: extra50038 exposure/tower player clipped; FAULT: unsafe
// cone aimer or intruder if known; CONSEQUENCE: Minor->Major. Valid cone,
// tower,4882 DoT/auto damage are expected.4882 cleanup after exit unverified.
//
// -- PERSONAL SHADOW DUELS / GAUNTLETS / DEATH FALLOUT --
// Two waves of4 spawn~1.2s after towers; in full roster totals TWO
// Protective(tanks), TWO Soothing(healers), FOUR Aggressive(DPS).
// Tower soaker receives Gauntlet Taken5357..64; add matching Thrown5365..72
// and tether284. Only that player can damage that personal add [BM/DATA].
// TL: excessive separation pulls owner back; owner's death removes add
// damage immunity, permitting rescue. Death does not inherently wipe raid.
// Correct: handle own duel; after kill resume Looming damage. Post7.51
// Gauntlet clears immediately on add kill. Immunity/null damage to another
// duel is not a positional error or proof a living player missed their own.
// LOG SIGNAL: surviving personal add at deadline/Self-destruct50799(5s,
// radius60; BM lists Aggressive/Soothing); FAULT: living owner if isolated
// damage-check duty known; CONSEQUENCE: Major if attributable wipe, Raid
// if lethal. Exact self-destruct trigger/deadline/cast cancellation open.
// Unnamed50012/49938 lifecycle actions and boss/add status2056 extra0x46B
// are BM observations, not proof of a spawn/death penalty or damage bonus.
//
// -- PROTECTIVE SHADOW: DRAIN TOUCH / WEIGHT OF NOTHING --
// 0x4DC8; auto50751. Drain Touch50018:5s INTERRUPTIBLE owner cast;
// 50019 completed lifesteal hit. Tank Interjects own add; no shared kick
// rotation. LOG SIGNAL: completed50018 +50019 versus interrupt event;
// FAULT: owner tank if able/alive; CONSEQUENCE: Minor->Major on outcome.
// Weight50020:4s visual;50021:5s helper,100x8y line on owner, heavy
// tankbuster. Mitigate/point away or kill add first; not interruptible.
// LOG SIGNAL:50021 hits another player; FAULT: bad tank aim/intruder if
// known; CONSEQUENCE: Minor->Major. Own mitigated tank hits legal; own-hit
// death alone is not a mechanic error. Post7.51 killing pre-cast stops it.
//
// -- SOOTHING SHADOW: ENTANGLEMENT / CURSE OF THE FLESH --
// 0x4DCA; auto50753; healer4884 Quantum Entanglement and shadow4883
// Nullification are paired DoTs [DATA/BM], not established damage reflect.
// TL says healer DoT lasts until own add dies. Both non-dispellable.
// Curse50024:2s visual;50025:3s helper applies Disease3943, movement/
// healing recovery reduction. Owner self-Esunas [G8], then finishes add.
// LOG SIGNAL:3943 lingers without successful cleanse; FAULT: owner healer
// if alive/able and duty known; CONSEQUENCE: Minor->Major on causal death.
// Esuna/removal ends Disease with no researched explosion. Correct duel
// DoT/disease application is expected; death/removal transfer unknown.
//
// -- AGGRESSIVE SHADOW: DEMON EYE --
// 0x4DC9; auto50752; Demon Eye50022:4s visual,50023:5s helper gaze
// radius20, applies3007 Petrification. Look away from ALL nearby active
// adds, not toward another gaze. Can outrange; exact facing tolerance open.
// LOG SIGNAL:3007 apply following50023; FAULT: player facing gaze if
// independent; CONSEQUENCE: Minor->Major.3007 is not dispellable [DATA].
// Killing Aggressive before cast completes cancels attack post7.51;
// earlier reports may still show a resolved gaze after add death.
// Petrification duration and punishment to others are unestablished.
//
// -- BEACON IN THE DARK / NOTHINGNESS / INTERMISSION DEADLINE --
// After Looming dies, Beacon0x4DCB becomes targetable; KILL IT, not merely
// Looming, to exit and stop gauge. No researched second gauge/reset or
// mandatory add-death explosion. Nothingness50017:3s,100x4y avoidable
// lines from untargetable surrounding shadows [TL]; dodge while killing
// Beacon. Precise wave count/spawn clock not established by BM.
// LOG SIGNAL:50017 damage; FAULT: failed dodge/unsafe bait if known;
// CONSEQUENCE: Minor->Major. LOG SIGNAL: gauge100 ->Apeiron48478 on raid;
// FAULT: group add/Beacon check, no presumed individual; CONSEQUENCE: Raid.
// Individual duel failures can cause this but gauge enrage alone names none.
//
// -- FINAL PHASE: NAUGHT WAKES / PASSAGE OF NAUGHT --
// 49973:2s Wakes relocates portals49974. P1 has no laser consequence;
// final phase fires Passage49985:7s and49986/87:6s,80x16y rectangles.
// Whole portals fire through center; split portals fire parallel sides.
// Dodge combined lines; adjacent portal axes may be45deg, not always90.
// First two volleys~11.3s apart; later repeats before Deep Freeze. During
// Hunts, split beams leave central safe region at start; whole crossing
// beams leave cardinal/intercardinal outer gaps at end [IV/G8/BM].
// LOG SIGNAL:49985/86/87 damage; FAULT: failed combined-line dodge;
// CONSEQUENCE: Minor->Major. Visual portal count/cues may be unlogged.
//
// -- SHROUDED HOLY / DIMENSION ZERO --
// Holy50045:5s visual;50046:6s radius6 healer stacks, four each E/W;
// expected split damage/2941. Dimension50047:5s controller;50048 width8/
// 60y shared line. Group in marked line, heal/mitigate each impact.
// BM first Dimension has THREE hits, first->last2.7s; later two have
// FOUR hits, first->last4.1s. IV/G8 shorthand says three; late count differs.
// TL describes random Dimension target; IV healer. Target role unresolved.
// LOG SIGNAL: overlapping Holy50046, missing living line member or unsafe
// 50048 recipient set; FAULT: wrong aimer/member under known plan;
// CONSEQUENCE: Minor->Major. Own stack hits and short Holy vuln expected.
//
// -- NAUGHT HUNTS / ENDLESS CHASE / HANDOFFS --
// 49992:6s controller; two VoidChase0x4EB5 tether404 to first runners,
// player->player405 indicates next owners. Start laser and chase at~7s.
// 48475:6s first helper cast;49993 subsequent radius6 ground explosions.
// BM: two chasers,13 pulses each first owner,12 each second, total50;
// ~0.9s cadence,3y advance per pulse. Target switch~8.4s after start,
// second segment~8.3s; final lasers~4.6s later. Two complete Hunts sets,
// eight owners total in a full live roster; second set uses remaining4.
// Correct: first owners kite outer edge CW after lasers; second prepare
// handoff and kite CW or CCW per plan, away from middle/unmarked party.
// Finish with Passage safe gaps and Airy/Dense formation. This is moving
// AoE bait, not orb contact soak; do not apply Gaze soak rules here.
// LOG SIGNAL:48475/49993 damage/repeated vulnerability stacks; FAULT:
// caught runner, unsafe inward bait or intruder only with chase geometry;
// CONSEQUENCE: Minor->Major. Later vulnerability identity/duration unknown.
// Tether timing may show handoff; death retarget/disappearance unknown.
// A second owner inheriting an unsafe path from an earlier death is fallout.
//
// -- WHAT ENDS A PULL / OPEN QUESTIONS FOR LOG VERIFICATION --
// Hard cutoffs: gauge100 Apeiron, final50050 enrage. Failed orb Big Burst,
// tower Big Burst and personal Self-destruct can be catastrophic; establish
// irreversible outcome rather than assuming every occurrence wipes. Falls
// may have no killing ability; distinguish solo orb launch, ordinary boss
// floor edge and deliberate reset. No separate boss soft-enrage resource.
// 1. Map all candidate cast/damage/status IDs, pyretic damage and unnamed
//    helpers; which avoidables give DD, generic vuln or Sustained Damage?
// 2. Confirm phase clocks, gauge initial value/ticks/error gains, stop on
//    Beacon death, absolute deadline and final enrage relative to retarget.
// 3. Charge/Emptiness/Holy/orb/Dimension split formulas, required minimums,
//    front-hit multipliers, marked roles and death cancellation/retarget?
// 4. Meltdown bait snapshot versus aura timing; movement test, death early
//    removal and puddle/spread behavior; freeze window and flare falloff?
// 5. Orb deadlines/vuln duration, solo launch/immunity, slow/fast assignment
//    geometry, double-contact and whether Big Burst stacks/resets its DoT?
// 6. Tower min/max soakers and penalty outcomes; duel death-unlock/pullback,
//    allowed rescue/healing, self-destruct triggers, Gauntlet cleanup,
//    Quantum pairing/cleanup, Disease duration and post7.51 cancellations?
// 7. Beacon helper spawn/count/targeting and Nothingness volleys; exact
//    portal laser widths/angles; Hunts pulses, handoff/death retarget and
//    vulnerability; Lightless six and Dimension3/4 counts in current logs?
