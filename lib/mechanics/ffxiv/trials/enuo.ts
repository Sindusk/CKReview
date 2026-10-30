// lib/mechanics/ffxiv/trials/enuo.ts
//
// ── DIGEST (read first; detail in the sections it names) ──
// What: FFXIV Enuo trial. Per-player errors for avoidable hits, Chains,
//   Deep Freeze, Petrification, cone/line/stack shares, Dimension Zero,
//   Meltdown spreads, Voidal Turbulence cones+towers, Gaze orbs, flares
//   and lone deaths; plus Raid-level wipe causes. Phase gating, clock and
//   signature: "ARENA, PHASE TRIGGERS, CLOCK AND GAUGE".
// Rules (all ffxiv-enuo-*): avoidable (Minor, Major if it killed), chains
//   (2+ ticks in one chain), freeze, petrify (Minor, Major if died), share
//   (Airy/Dense, Holy, Return lines: in two, or living in none), return-front
//   (non-tank 2x others' line hit, both tanks in line), dimension (living
//   player out of every hit), spread (Meltdown), turbulence (cones+towers),
//   empty-tower (Big Burst, Major), orb (lone/3rd/outside-pair soaker),
//   flare (non-tanks; targeted), fall (lone death, no killing blow,
//   player-less). Shares/spreads/orbs skip moments with 3+ dead.
// Cutoffs (Raid): tower-wipe, self-destruct, mass-deaths (4+ non-raidwide
//   deaths in 2.5s), enrage (final Almagest/Apeiron), called-wipe, collapse
//   (6 dead). Kills carry no Raid error.
// Key thresholds: front hit 2x others (a non-tank in front took 3.4-5.5x and
//   died: A11 +5:16, B8 +1:09); flare 2x; chains 2+ ticks (kills hit up to 8);
//   orbs soaked in role pairs in every kill. Mass deaths over within 40s,
//   collapse within 45s.
// Assumptions: one role group baits turbulence cones, the other takes
//   towers (swaps per wave and pull). Dark Resistance Down makes a second
//   hit lethal. Roles from roles.ts slots. Only Big Burst 50014 gives
//   Damage Down; avoidables give Vulnerability Up.
// Sections: "VERIFIED AGAINST LOGS (2026-10-14)" (2 reports, clock, IDs,
//   findings); "RULES IMPLEMENTED" (incl. not-built list); "GUIDE-DERIVED
//   MODEL: ENUO"; "SOURCES AND PATCH SENSITIVITY"; "LOG VOCABULARY,
//   SEVERITY AND REMOVALS"; "ARENA, PHASE TRIGGERS, CLOCK AND GAUGE";
//   "COMMUNITY ASSIGNMENTS / STRATEGY VARIANCE"; per-mechanic sections
//   "METEORAIN / ALMAGEST / LIGHTLESS WORLD", "NAUGHT GROWS / RETURN TO
//   NOTHING", "MELTDOWN / CHAINS OF CONDEMNATION", "AIRY / DENSE EMPTINESS",
//   "GAZE OF THE VOID / FAST AND SLOW ORB SOAKS", "VACUUM / SILENT TORRENT",
//   "DEEP FREEZE / FLARE TANKBUSTERS", "ALL FOR NAUGHT / LOOMING / VOIDAL
//   TURBULENCE", "PERSONAL SHADOW DUELS / GAUNTLETS / DEATH FALLOUT",
//   "PROTECTIVE SHADOW: DRAIN TOUCH / WEIGHT OF NOTHING", "SOOTHING SHADOW:
//   ENTANGLEMENT / CURSE OF THE FLESH", "AGGRESSIVE SHADOW: DEMON EYE",
//   "BEACON IN THE DARK / NOTHINGNESS / INTERMISSION DEADLINE", "FINAL
//   PHASE: NAUGHT WAKES / PASSAGE OF NAUGHT", "SHROUDED HOLY / DIMENSION
//   ZERO", "NAUGHT HUNTS / ENDLESS CHASE / HANDOFFS", "WHAT ENDS A PULL /
//   OPEN QUESTIONS FOR LOG VERIFICATION".
// Open items: not built are Disease cleanses, Drain Touch, Weight of
//   Nothing, duel/gauge attribution, Gaze cone direction, Naught Hunts
//   runner geometry, raidwide deaths. Some casts lose their target in the
//   log. Enrage and Apeiron never seen (every kill ended first); open
//   questions listed in the last section.
// ── END DIGEST ──
//
// -- VERIFIED AGAINST LOGS (2026-10-14) --
// A = Xk2DKZwVp4Ar6d7y: 11 pulls, kills A3 A4 A10 A11 (9:18-10:08).
// B = pnLBzfbH8NjGAJRg: 15 pulls, kills B7-B12 B14 B15 (8:30-8:52).
// Both the user's static's (the same eight, some on other jobs in B). Nobody
// remembers the plan and there's no VOD; roles.ts slots are correct.
//
// Clock (A11; every pull within ~1s up to the intermission): Meteorain
// 0:15, Naught Grows 0:29 (Return lines 0:31), Meltdown 0:44 (chains 0:45,
// puddles 0:50, spreads 0:51), Airy/Dense 0:57, Grows 1:07 (Great Return
// 1:09), Gaze 1:24 (cones 1:25-1:28, orbs 1:33-1:44), Vacuum 1:50, Dense/
// Airy 2:02, Deep Freeze 2:13 (flares 2:14), Meteorain 2:22, All for
// Naught 2:35, Looming Shadow 2:54, Voidal Turbulence 3:04 and ~3:28-3:41
// (the second wave waits on the Looming Shadow), duels to ~4:00,
// Nothingness ~4:23. The final phase follows the Beacon kill (A11 Almagest
// 5:01): Grows/Return, Wakes and Passage, Holy, Grows/Return, Dimension,
// Vacuum + Meltdown, Gaze (orbs ~6:45-7:11), Almagest, two Naught Hunts
// with Airy/Dense, Dimension. Every kill ended before the enrage: the
// final Almagest 50050 and the gauge's Apeiron 48478 were never seen.
//
// IDs (the model's BM candidates held):
// - DAMAGE DOWN comes only from an empty tower's Big Burst 50014. The
//   avoidables give Vulnerability Up 1001789: Gaze cones 50005, Meltdown
//   puddles 50041, Endless Chase 49993, Passage of Naught 49985/49986/49987,
//   Naught Grows 49977-49980, Silent Torrent 49998-50000, Vacuum 50001,
//   Nothingness 50017. Shares give Magic Vulnerability Up 1002941.
// - Chains of Condemnation 1004562 is both the status (~2s) and its
//   movement damage (~60k per tick, ~0.7s apart). Freezing Up 1003523 ->
//   Deep Freeze 1004150 (9s) on a player who stops. Petrification 1003007
//   (9s) from Demon Eye 50023. Disease 1003943 from Curse of the Flesh.
// - Cast-targeted: Meltdown spreads 50042, Empty Shadow towers 50013 (the
//   soaker), Voidal Turbulence cones 50038 (the baiter); some casts lose
//   their target in the log.
// - Orbs: Burst 50006 (small, 6 per Gaze) and Violent Burst 50007 (big, 2),
//   one Void#instance each; Big Burst 50008 = an orb reached Enuo (B6, as
//   the pull ended). Deep Freeze's flares 50044 hit everyone with falloff.
//
// Findings:
// - Orbs: every kill soaked them in role pairs (both tanks on the big ones,
//   healers, melee, ranged). A lone soaker was launched and fell with no
//   killing blow ~2.3s later (A4 +6:54, A10 +7:04, +7:10) or died to the
//   hit (A2, B2, B3, B11). A third soaker took a second orb under Magic
//   Vulnerability Up and usually died (A5, A9 +1:43, B14 +6:58). In B the
//   DRK clipped the healers' slow orb in four kills and lived.
// - Emptiness: a player in two Airy cones dies (A1 +0:58: four died); a
//   lone Airy cone killed its taker (A5 +2:04, A7 +0:58).
// - Return lines: the tanks take the front hits. A non-tank in front took
//   3.4-5.5x the others and died (A11 +5:16, B8 +1:09, B9 +4:54, B13 +0:31);
//   A4 +5:04 the GNB was out of the line and the RDM in front died; B5
//   +0:31 both tanks missed Great Return and two DPS died.
// - Voidal Turbulence: one role group baits the cones, the other takes
//   the towers (roles swap between the two waves, and pull to pull).
//   Dark Resistance Down from a tower or cone makes a second hit lethal:
//   cones clipping tower soakers killed in A3, A10, A11 (kills) and B6.
//   Big Burst: A8 +3:30 (two DPS shared a tower), A9 +3:41 (the SAM baited
//   into a cone instead of a tower); both wiped.
// - Meltdown puddles are lethal stacked (B6 +6:43: five died; B13 +6:20).
// - Every pull has some Chains damage; up to 8 ticks at one Meltdown in a
//   kill. Deep Freeze froze B's SCH in six pulls (kills included).
// - Disease was left on the WHM for its full 60s in five B kills: not a
//   failure the raid needs to fix. Every Drain Touch (12) was interrupted.
//   One Self-Destruct began (B) and never finished.
//
// Cutoffs (every wipe has one): A 3 called wipes, 2 tower Big Bursts, 1
// mass deaths (A1 Airy), 1 collapse (A6); B 4 called wipes, 3 mass deaths
// (B1 Great Return, B2 Airy, B6 Meltdown). Kills carry no Raid error; their
// errors are real avoidable hits (Endless Chase and Passage most of all),
// Chains, Deep Freeze, turbulence clips and orb mistakes.
//
// -- RULES IMPLEMENTED --
// - ffxiv-enuo-avoidable: the avoidables above, per player episode. Minor;
//   Major when it killed (they give Vulnerability Up, not Damage Down).
// - ffxiv-enuo-chains: 2+ Chains ticks in one chain (one tick is the player
//   still moving as it lands). ffxiv-enuo-freeze: Deep Freeze.
//   ffxiv-enuo-petrify: Petrification. All Minor, Major when they died.
// - ffxiv-enuo-share: Airy/Dense cones, Holy stacks, Return/Great Return
//   lines: a player in two, or a living player in none (skipped when the
//   aimer took an avoidable: fallout). ffxiv-enuo-return-front: a non-tank
//   with 2x the other non-tanks' unmitigated line hit, both tanks in line.
//   ffxiv-enuo-dimension: a living player out of every Dimension Zero hit.
// - ffxiv-enuo-spread (Meltdown) and ffxiv-enuo-turbulence (cones + towers):
//   one instance per player, owner and victim named; a tower-group player
//   with no tower is named alone. ffxiv-enuo-empty-tower: Big Burst names
//   the tower-group player with no tower, else the two sharing one (Major),
//   with the Raid marker ffxiv-enuo-tower-wipe.
// - ffxiv-enuo-orb: a lone soaker names their role partner; a 3+ orb names
//   whoever is outside its pair (all of them when no pair has two); an orb
//   reaching Enuo is player-less.
// - ffxiv-enuo-flare (targeted: non-tanks): a non-tank with 2x the others'
//   flare hit stood by a tank's flare (skipped with a tank down).
// - ffxiv-enuo-fall: lone deaths with no killing blow (player-less).
// - Raid: tower-wipe, self-destruct, mass-deaths (4+ non-raidwide deaths
//   within 2.5s, over within 40s), enrage (final Almagest or Apeiron),
//   called-wipe, collapse (6 dead, over within 45s).
// Shares, spreads and orbs skip moments with 3+ dead (fallout). Exposure is
// everyone except the flares.
// Not built: Disease cleanses (kills leave it), Drain Touch (always
// interrupted), Weight of Nothing (only its own tank was hit; a death to
// it is mitigation), duel and gauge attribution (no add ownership in the
// enemy-cast stream), Gaze cone direction, Naught Hunts runner geometry
// (a caught runner is just an avoidable), raidwide deaths (mitigation).
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

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import type { ReportedOccurrence } from "@/lib/mechanics/occurrences";
import { detectFFRoles } from "@/lib/mechanics/ffxiv/roles";
import { kFmt, joinNames, playerError, playerlessMinor, raidMarker, rezzedAt, clusterByGap, debuffIntervals, RAID_MARKER_SORT_OFFSET_MS } from "@/lib/mechanics/wow/common";

export const EN_AVOIDABLE_RULE_ID   = "ffxiv-enuo-avoidable";
export const EN_CHAINS_RULE_ID      = "ffxiv-enuo-chains";       // moved under Chains of Condemnation
export const EN_FREEZE_RULE_ID      = "ffxiv-enuo-freeze";       // stopped under Freezing Up
export const EN_PETRIFY_RULE_ID     = "ffxiv-enuo-petrify";      // Demon Eye gaze
export const EN_SHARE_RULE_ID       = "ffxiv-enuo-share";        // Emptiness cones, Holy stacks, Return lines
export const EN_FRONT_RULE_ID       = "ffxiv-enuo-return-front"; // a non-tank at the front of a Return line
export const EN_DIMENSION_RULE_ID   = "ffxiv-enuo-dimension";    // Dimension Zero line stack
export const EN_SPREAD_RULE_ID      = "ffxiv-enuo-spread";       // Meltdown spreads
export const EN_TURBULENCE_RULE_ID  = "ffxiv-enuo-turbulence";   // Voidal Turbulence cones + Empty Shadow towers
export const EN_EMPTY_TOWER_RULE_ID = "ffxiv-enuo-empty-tower";  // Big Burst (tower)
export const EN_ORB_RULE_ID         = "ffxiv-enuo-orb";          // Gaze of the Void orb pairs
export const EN_FLARE_RULE_ID       = "ffxiv-enuo-flare";        // Deep Freeze flares on non-tanks
export const EN_FALL_RULE_ID        = "ffxiv-enuo-fall";
export const EN_TOWER_WIPE_RULE_ID  = "ffxiv-enuo-tower-wipe";
export const EN_SELF_DESTRUCT_RULE_ID = "ffxiv-enuo-self-destruct";
export const EN_MASS_DEATHS_RULE_ID = "ffxiv-enuo-mass-deaths";
export const EN_ENRAGE_RULE_ID      = "ffxiv-enuo-enrage";
export const EN_CALLED_WIPE_RULE_ID = "ffxiv-enuo-called-wipe";
export const EN_COLLAPSE_RULE_ID    = "ffxiv-enuo-collapse";

// Meteorain, Naught Grows, Meltdown: every pull opens with them.
const SIGNATURE      = [50049, 49975, 50040];
const WALKING_DEAD   = 1000811;
const WALKING_DEAD_FULL_MS = 9500;
const CHAINS         = 1004562; // Chains of Condemnation: the status and its movement damage share the ID
const FREEZE         = 1004150; // Deep Freeze: stood still under Freezing Up
const PETRIFY        = 1003007;
const MELTDOWN_SPREAD = 50042;
const AIRY           = 50034;
const DENSE          = 50035;
const HOLY           = 50046;
const RETURN         = 49983;   // Return to Nothing: two lines of four
const GREAT_RETURN   = 49984;   // Great Return to Nothing: one line of eight
const DIMENSION      = 50048;
const TOWER          = 50013;   // Empty Shadow, cast-targeted at its soaker
const CONE           = 50038;   // Voidal Turbulence, cast-targeted at its baiter
const TOWER_FAIL     = 50014;   // Big Burst: a tower left empty (Damage Down on everyone)
const BURST          = 50006;   // small orb
const VIOLENT_BURST  = 50007;   // big orb (tanks)
const ORB_FAIL       = [50008, 50009]; // Big Burst: an orb reached Enuo
const FLARE          = 50044;   // Deep Freeze's flares on the top two of enmity
const SELF_DESTRUCT  = 50799;
const ENRAGE         = [50050, 48478]; // final Almagest, Apeiron (intermission gauge)
// Raid-wide damage: deaths to these are mitigation, never part of a
// mass-death cutoff.
const RAIDWIDE = [50049, 49972, 50030, 50031, 50043, 50050, 48478];

// Avoidable hits. The only Damage Down in the fight is the tower Big Burst;
// these give Vulnerability Up 1001789, so a survived hit is Minor.
type Avoidable = { name: string; why: string };
const GROWS_WHY = "Naught Grows expands a circle or a donut from the arrow's end (the portal, and in the final phase Enuo too); stand where both are safe before they go off.";
const PASSAGE_WHY = "Naught Wakes' portals fire Passage of Naught lasers across the arena; stand outside every line, including the parallel ones from split portals.";
const TORRENT_WHY = "Vacuum's Silent Torrent arcs go off on the ring, then circles drop where they ended; stand in the ring on the long arc's side, away from the short arc.";
const AVOIDABLE: Record<number, Avoidable> = {
  50005: { name: "Gaze of the Void", why: "Gaze of the Void's ten cones go off in a rotating order; start behind the first one and follow the cones that have already gone off." },
  50041: { name: "Meltdown", why: "Meltdown drops a circle under every player; bait them together, then move out to your spread spot before they go off." },
  49993: { name: "Endless Chase", why: "Naught Hunts' chasers explode along their runner's path every second; runners kite the outer edge without stopping, everyone else stays out of the path." },
  48475: { name: "Endless Chase", why: "Naught Hunts' chasers explode along their runner's path every second; runners kite the outer edge without stopping, everyone else stays out of the path." },
  49985: { name: "Passage of Naught", why: PASSAGE_WHY },
  49986: { name: "Passage of Naught", why: PASSAGE_WHY },
  49987: { name: "Passage of Naught", why: PASSAGE_WHY },
  49977: { name: "Naught Grows", why: GROWS_WHY },
  49978: { name: "Naught Grows", why: GROWS_WHY },
  49979: { name: "Naught Grows", why: GROWS_WHY },
  49980: { name: "Naught Grows", why: GROWS_WHY },
  49998: { name: "Silent Torrent", why: TORRENT_WHY },
  49999: { name: "Silent Torrent", why: TORRENT_WHY },
  50000: { name: "Silent Torrent", why: TORRENT_WHY },
  50001: { name: "Vacuum", why: TORRENT_WHY },
  50017: { name: "Nothingness", why: "The shadows around the Beacon in the Dark fire Nothingness lines; dodge them while killing the Beacon." },
  49369: { name: "Looming Emptiness", why: "The Looming Shadow emerges with a lethal circle at its center; stand away from it before the knockback." },
};

// One instance per player: a player hit by another player's instance, or by
// two at once, is an overlap (both named; README philosophy 3).
type Spread = { name: string; ids: number[]; what: string; why: string; ruleId: string };
const MELTDOWN: Spread = { name: "Meltdown", ids: [MELTDOWN_SPREAD], what: "spread", ruleId: EN_SPREAD_RULE_ID,
  why: "Meltdown puts a spread circle on every player a second after the ground circles; once the chains fall off, run to your own spread spot." };
const TURBULENCE: Spread = { name: "Voidal Turbulence", ids: [TOWER, CONE], what: "cone or tower", ruleId: EN_TURBULENCE_RULE_ID,
  why: "Voidal Turbulence aims a cone at each player of one role group while the other group takes the four Empty Shadow towers; aim cones into the gaps between towers, and each tower takes one player." };

// Shared hits: every living player takes exactly one instance.
type Share = { name: string; ids: number[]; what: string; why: string };
const SHARES: Share[] = [
  { name: "Airy Emptiness", ids: [AIRY], what: "partner cone",
    why: "Airy Emptiness aims four cones at the supports; each DPS stands with their partner so every cone takes exactly two." },
  { name: "Dense Emptiness", ids: [DENSE], what: "light-party cone",
    why: "Dense Emptiness aims two cones at the healers; each light party stacks in its own healer's cone." },
  { name: "Shrouded Holy", ids: [HOLY], what: "stack",
    why: "Shrouded Holy stacks on both healers; each light party takes its own healer's stack." },
  { name: "Return to Nothing", ids: [RETURN], what: "line",
    why: "Return to Nothing fires two orb lines at the healers; each light party lines up in its own, tank in front." },
  { name: "Great Return to Nothing", ids: [GREAT_RETURN], what: "line",
    why: "Great Return to Nothing fires one orb line through all eight; everyone lines up behind the tanks." },
];

// FFLogs logs the death event ~2.0s after the fatal hit (README).
const DEATH_EVENT_LAG_MS = 2000;
const DIED_FROM_HIT_MS   = 3000;
const EPISODE_MS         = 3000;
const RAISE_GRACE_MS     = 10_000;
// With this many dead, a share's, spread's or orb's layout is fallout.
const DOOMED_DEAD        = 3;
// Chains of Condemnation ticks ~0.7s apart while its holder moves. One tick
// is the player still moving as the chains land; two or more is walking on.
// Every pull has some: up to 8 ticks at one Meltdown in the kill A11 6:35.
const CHAINS_MIN_TICKS   = 2;
// A Return line's front hits (the first player, or Great Return's first
// two) are several times the rest. Unmitigated, a non-tank in front took
// 3.9-5.5x the non-tank median (A11 5:16, B8 1:09, B5 0:31); the worst
// clean non-tank was 1.4x (B9 5:43).
const FRONT_RATIO        = 2;
// Deep Freeze's flares hit everyone with falloff. Non-tanks at their spots
// took at most 1.3x the non-tank median (largest hit); the Monk who died by
// the tank in B4 +2:13 took 6.6x.
const FLARE_RATIO        = 2;
// Deaths to one moment's mechanics that end the pull: 4+ within
// MASS_WINDOW_MS and the pull over within 40s. Wipes ended 12-31s after
// (B1 Great Return, A6 Endless Chase, B6 Meltdown); the kill B10 lost four
// to Endless Chase at 7:36 and finished 55s later.
const MASS_DEATHS        = 4;
const MASS_WINDOW_MS     = 2500;
const MASS_END_MS        = 40_000;
const CALLED_WIPE_END_MS = 12_000;
const CALLED_WIPE_COUNT  = 3;
const CALLED_WIPE_WINDOW = 10_000;
const CALLED_WIPE_PAIR_MS = 5_000;
// 6 dead with the pull over within 45s: no kill ever had 6 down; the kill
// B10 had 5 down at 7:53 and finished 40s later.
const COLLAPSE_DEAD_COUNT = 6;
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
  ? "lethal" : kFmt(es.reduce((s, e) => s + (e.amount ?? 0), 0));
/** The hit before mitigation (README: rebuild it when it's missing). */
const rawOf = (e: PlayerEvent) => e.unmitigatedAmount ?? ((e.amount ?? 0) + (e.absorbed ?? 0) + (e.overkill ?? 0)) / (e.multiplier || 1);
const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
};

const uniq = <T,>(xs: T[]) => [...new Set(xs)];
const namesOf = (ps: PlayerInfo[]) => joinNames(uniq(ps).map((p) => p.name));
const isTank = (p: PlayerInfo) => p.role === "Tank";
const isDps = (p: PlayerInfo) => p.role !== "Tank" && p.role !== "Healer";
const instanceKey = (e: PlayerEvent) => `${e.abilityId}|${e.source}#${e.sourceInstance}`;
const castKey = (c: EnemyEvent) => `${c.abilityId}|${c.actorName}#${c.sourceInstance}`;
const deadCount = (players: PlayerInfo[], life: Life, t: number) => players.filter((p) => !life.hitAlive(p, t)).length;
const byName = (players: PlayerInfo[], name?: string) => (name ? players.find((p) => p.name === name) : undefined);

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
        ruleId: EN_AVOIDABLE_RULE_ID, severity: death ? "Major" : "Minor", name: `Hit by ${names.join(" / ")}`,
        description: `Hit by ${joinNames(names)} (${g.length > 1 ? `${g.length} hits, ` : ""}${amountText(g)}), with Vulnerability Up.${death ? " They died." : ""} ${uniq(kinds.map((k) => k.why)).join(" ")}`,
        timestamp: g[0].timestamp, abilityId: g[0].abilityId, abilityName: g[0].abilityName,
      }));
    }
  }
  return errors;
}

/**
 * Meltdown's Chains of Condemnation (~2s) burns its holder each ~0.7s they
 * keep moving. Flagged from CHAINS_MIN_TICKS ticks in one chain.
 */
function detectChains(players: PlayerInfo[], life: Life): PullError[] {
  const errors: PullError[] = [];
  for (const p of players) {
    for (const w of debuffIntervals(p, CHAINS)) {
      const ticks = p.damageTaken.filter((e) => e.abilityId === CHAINS && e.timestamp >= w.start && e.timestamp <= w.end + 500 && (e.amount ?? 0) > 0);
      if (ticks.length < CHAINS_MIN_TICKS || !life.hitAlive(p, w.start)) continue;
      const death = life.diedFrom(p, ticks[ticks.length - 1].timestamp);
      errors.push(playerError(p, {
        ruleId: EN_CHAINS_RULE_ID, severity: death ? "Major" : "Minor", name: "Moved Under Chains of Condemnation",
        description: `Kept moving under Meltdown's Chains of Condemnation and burned ${ticks.length} times (${amountText(ticks)}).${death ? " They died." : ""} Stop moving when Meltdown finishes casting (attacks are fine) and run to your spread spot once the chains fall off.`,
        timestamp: ticks[0].timestamp, abilityId: CHAINS, abilityName: "Chains of Condemnation",
      }));
    }
  }
  return errors;
}

/** Deep Freeze (stood still under Freezing Up) and Petrification (looked at a Demon Eye). */
function detectStatusFails(players: PlayerInfo[], life: Life): PullError[] {
  const errors: PullError[] = [];
  const kinds = [
    { id: FREEZE, ruleId: EN_FREEZE_RULE_ID, name: "Frozen by Deep Freeze", abilityName: "Deep Freeze",
      what: "Stopped moving while Freezing Up held, and Deep Freeze froze them in place",
      why: "Freezing Up from Deep Freeze needs constant movement until it falls off; keep walking (slidecast, or move between GCDs)." },
    { id: PETRIFY, ruleId: EN_PETRIFY_RULE_ID, name: "Petrified by Demon Eye", abilityName: "Petrification",
      what: "Was facing an Aggressive Shadow's Demon Eye and got Petrification",
      why: "Look away from every nearby Aggressive Shadow (not just your own) as Demon Eye finishes casting." },
  ];
  for (const k of kinds) {
    for (const p of players) {
      for (const w of debuffIntervals(p, k.id)) {
        if (!life.hitAlive(p, w.start)) continue;
        const end = Number.isFinite(w.end) ? w.end : w.start + 10_000;
        const death = life.diedFrom(p, end - DIED_FROM_HIT_MS + 2000);
        errors.push(playerError(p, {
          ruleId: k.ruleId, severity: death ? "Major" : "Minor", name: k.name,
          description: `${k.what} for ${((end - w.start) / 1000).toFixed(1)}s.${death ? " They died while it held." : ""} ${k.why}`,
          timestamp: w.start, abilityId: k.id, abilityName: k.abilityName,
        }));
      }
    }
  }
  return errors;
}

// ── overlapping spreads, cones and towers ───────────────────────────────────

/**
 * One instance per player. The owner of an instance is its cast target, else
 * the only player it hit, or the one player it hit who took nothing else. A
 * player hit by an instance that isn't theirs, or by two, overlapped; the
 * owner and the victim are both named, unless `alone(victim)` says the
 * victim was out of their own spot (then only they are named).
 */
function detectSpreadFamily(players: PlayerInfo[], life: Life, casts: EnemyEvent[], fam: Spread,
  alone?: (p: PlayerInfo, res: Hit[], t: number) => boolean): PullError[] {
  const errors: PullError[] = [];
  for (const res of clusterByGap(hitsOf(players, life, fam.ids), (h) => h.e.timestamp, 1500)) {
    const t0 = res[0].e.timestamp, t1 = res[res.length - 1].e.timestamp;
    if (deadCount(players, life, t0) >= DOOMED_DEAD) continue;
    const byInst = new Map<string, Hit[]>();
    const byPlayer = new Map<PlayerInfo, Set<string>>();
    for (const h of res) {
      if (inRaiseGrace(life, h.p, h.e.timestamp)) continue;
      const k = instanceKey(h.e);
      byInst.set(k, [...(byInst.get(k) ?? []), h]);
      byPlayer.set(h.p, (byPlayer.get(h.p) ?? new Set()).add(k));
    }
    const owners = new Map<string, PlayerInfo>();
    for (const c of casts) {
      if (!fam.ids.includes(c.abilityId) || c.timestamp < t0 - 2000 || c.timestamp > t1 + 200 || c.sourceInstance === undefined || !c.target) continue;
      const p = byName(players, c.target);
      if (p) owners.set(castKey(c), p);
    }
    const away = new Set([...byPlayer.keys()].filter((p) => alone?.(p, res, t0)));
    for (const [k, hs] of byInst) {
      if (owners.has(k)) continue;
      const hit = uniq(hs.map((h) => h.p));
      const only = hit.filter((p) => byPlayer.get(p)!.size === 1 && ![...owners.values()].includes(p) && !away.has(p));
      // A player owns one instance: a cone hitting only a tower's soaker
      // isn't theirs (its baiter is unlogged).
      if (hit.length === 1 && ![...owners.values()].includes(hit[0])) owners.set(k, hit[0]);
      else if (only.length === 1) owners.set(k, only[0]);
    }
    const links = new Map<PlayerInfo, Set<PlayerInfo>>();
    const link = (a: PlayerInfo, b: PlayerInfo) => {
      links.set(a, (links.get(a) ?? new Set()).add(b));
      links.set(b, (links.get(b) ?? new Set()).add(a));
    };
    for (const [p, ks] of byPlayer) {
      const foreign = [...ks].filter((k) => owners.get(k) !== p);
      if (ks.size < 2 && foreign.length === 0) continue;
      if (!links.has(p)) links.set(p, new Set());
      if (away.has(p)) continue;
      for (const k of ks) {
        const o = owners.get(k);
        if (o) { if (o !== p) link(p, o); }
        else for (const h of byInst.get(k)!) if (h.p !== p) link(p, h.p);
      }
    }
    const what = (k: string) => (k.startsWith(`${TOWER}|`) ? "Empty Shadow tower" : k.startsWith(`${CONE}|`) ? "Voidal Turbulence cone" : `${fam.name} ${fam.what}`);
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
      const killed = group.filter((p) => killedBy(life, res, p, fam.ids));
      const deathText = killed.length ? ` ${namesOf(killed)} died.` : "";
      for (const p of group) {
        const others = [...(links.get(p) ?? [])];
        const ks = [...(byPlayer.get(p) ?? [])];
        const victim = ks.length > 1 || ks.some((k) => owners.get(k) !== p);
        const kinds = ks.map((k) => `${owners.get(k) === p ? "their own" : owners.get(k) ? `${owners.get(k)!.name}'s` : "a"} ${what(k)}`);
        const description = victim
          ? `Hit by ${joinNames(kinds)}${others.length ? ` (with ${namesOf(others)})` : ""}.`
          : `Their ${what(ks[0] ?? "")} also hit ${namesOf(others)}.`;
        errors.push(playerError(p, {
          ruleId: fam.ruleId, severity: killed.length ? "Major" : "Minor", name: `${fam.name} Overlap`,
          description: `${description}${deathText} ${fam.why}`,
          timestamp: t0, abilityId: fam.ids[0], abilityName: fam.name,
        }));
      }
    }
  }
  return errors;
}

/**
 * Voidal Turbulence's role groups: the cones go to one role group (DPS, or
 * the supports) and the other group takes the towers. Read the cone group
 * from the cones' logged targets (some casts have none).
 */
function towerGroupAt(players: PlayerInfo[], casts: EnemyEvent[], t: number): PlayerInfo[] {
  const coneTargets = casts.filter((c) => c.abilityId === CONE && c.timestamp >= t - 6000 && c.timestamp <= t + 1500)
    .map((c) => byName(players, c.target)).filter((p): p is PlayerInfo => !!p);
  if (!coneTargets.length) return [];
  const dpsCones = coneTargets.filter(isDps).length * 2 > coneTargets.length;
  return players.filter((p) => isDps(p) !== dpsCones);
}

function detectTurbulence(players: PlayerInfo[], life: Life, casts: EnemyEvent[]): PullError[] {
  // A tower-group player who took no tower was out of their spot: a cone
  // that hit them there is theirs to answer for (A9 +3:41).
  const alone = (p: PlayerInfo, res: Hit[], t: number) =>
    towerGroupAt(players, casts, t).includes(p) && !res.some((h) => h.p === p && h.e.abilityId === TOWER);
  // Two players sharing a tower that left another empty: detectEmptyTowers
  // names them for the Big Burst.
  const sharedBeforeBurst = (e: PullError) => {
    const p = byName(players, e.player);
    return !!p && hitsOf(players, life, TOWER_FAIL).some((h) => h.e.timestamp >= e.timestamp && h.e.timestamp - e.timestamp <= 2000) &&
      hitsOf(players, life, TOWER).filter((h) => h.p === p && Math.abs(h.e.timestamp - e.timestamp) <= 1500)
        .some((h) => hitsOf(players, life, TOWER).some((x) => x.p !== p && instanceKey(x.e) === instanceKey(h.e) && Math.abs(x.e.timestamp - h.e.timestamp) <= 1500));
  };
  return detectSpreadFamily(players, life, casts, TURBULENCE, alone).filter((e) => !sharedBeforeBurst(e));
}

/**
 * Big Burst: an Empty Shadow tower nobody stood in hits everyone with
 * Damage Down (A8 +3:31, A9 +3:42; both wiped). The tower group player who
 * took no tower is named; failing that, two players sharing a tower.
 */
function detectEmptyTowers(players: PlayerInfo[], life: Life, casts: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const res of clusterByGap(hitsOf(players, life, TOWER_FAIL), (h) => h.e.timestamp, 1500)) {
    const t = res[0].e.timestamp;
    const towers = hitsOf(players, life, TOWER).filter((h) => h.e.timestamp >= t - 3000 && h.e.timestamp <= t);
    const group = towerGroupAt(players, casts, t - 1000);
    const missing = group.filter((p) => !towers.some((h) => h.p === p) && life.hitAlive(p, t - 1000) && !inRaiseGrace(life, p, t - 1000));
    const byTower = new Map<string, PlayerInfo[]>();
    for (const h of towers) byTower.set(instanceKey(h.e), [...(byTower.get(instanceKey(h.e)) ?? []), h.p]);
    const doubled = uniq([...byTower.values()].filter((ps) => ps.length >= 2).flat());
    const died = uniq(res.filter((h) => life.diedFrom(h.p, h.e.timestamp)).map((h) => h.p));
    const deathText = died.length ? ` ${namesOf(died)} died.` : "";
    const why = "Every Empty Shadow tower needs one player from the tower group; an empty tower's Big Burst gives the whole party Damage Down.";
    const named = missing.length && missing.length <= 2 ? missing : doubled;
    for (const p of named) {
      const what = missing.includes(p)
        ? "Was in the tower group but took no Empty Shadow tower"
        : `Shared an Empty Shadow tower with ${namesOf(doubled.filter((x) => x !== p))}`;
      errors.push(playerError(p, {
        ruleId: EN_EMPTY_TOWER_RULE_ID, severity: "Major", name: "Tower Left Empty",
        description: `${what}, so a tower stayed empty and Big Burst hit the party (${res.length} hit, Damage Down).${deathText} ${why}`,
        timestamp: t, abilityId: TOWER_FAIL, abilityName: "Big Burst",
      }));
    }
    if (!named.length) {
      errors.push(playerlessMinor(EN_EMPTY_TOWER_RULE_ID, "Tower Left Empty",
        `An Empty Shadow tower stayed empty and Big Burst hit the party (${res.length} hit, Damage Down).${deathText} ${why}`, t, TOWER_FAIL, "Big Burst"));
    }
    errors.push(raidMarker(EN_TOWER_WIPE_RULE_ID, "Tower Left Empty",
      `Big Burst gave the whole party Damage Down mid-intermission${died.length ? ` and killed ${namesOf(died)}` : ""}: the adds can't be killed in time from here. Treated as the cutoff point.`,
      t + RAID_MARKER_SORT_OFFSET_MS, TOWER_FAIL, "Big Burst"));
  }
  return errors;
}

// ── shared cones, stacks and lines ──────────────────────────────────────────

/**
 * Each living player takes exactly one instance. A player in two took the
 * second under Magic Vulnerability Up (A1 +0:58: four died); a living
 * player in none left the others to take it short (a lone Airy cone killed
 * its taker: A5 +2:04, A7 +0:58).
 */
function detectShares(players: PlayerInfo[], life: Life, casts: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const fam of SHARES) {
    for (const res of clusterByGap(hitsOf(players, life, fam.ids), (h) => h.e.timestamp, 1500)) {
      const t = res[0].e.timestamp;
      if (deadCount(players, life, t) >= DOOMED_DEAD) continue;
      // An aimer caught by an avoidable takes their cone into the wrong zone;
      // the partners who stayed in the safe spot missed it as fallout.
      const aimers = castsOf(casts, fam.ids).filter((c) => c.timestamp >= t - 2000 && c.timestamp <= t + 200).map((c) => byName(players, c.target));
      const aimerOff = aimers.some((p) => p && inAvoidable(p, t)) || (!aimers.some(Boolean) && res.some((h) => inAvoidable(h.p, t)));
      const byPlayer = new Map<PlayerInfo, Set<string>>();
      for (const h of res) byPlayer.set(h.p, (byPlayer.get(h.p) ?? new Set()).add(instanceKey(h.e)));
      const killed = uniq(res.map((h) => h.p)).filter((p) => killedBy(life, res, p, fam.ids));
      const deathText = killed.length ? ` ${namesOf(killed)} died.` : "";
      const doubled = [...byPlayer].filter(([p, ks]) => ks.size >= 2 && !inRaiseGrace(life, p, t)).map(([p]) => p);
      for (const p of doubled) {
        errors.push(playerError(p, {
          ruleId: EN_SHARE_RULE_ID, severity: killed.length ? "Major" : "Minor", name: `Took Two ${fam.name} ${fam.what}s`,
          description: `Stood in ${byPlayer.get(p)!.size} ${fam.name} ${fam.what}s at once${doubled.length > 1 ? ` (with ${namesOf(doubled.filter((x) => x !== p))})` : ""}.${deathText} ${fam.why}`,
          timestamp: t, abilityId: fam.ids[0], abilityName: fam.name,
        }));
      }
      if (aimerOff) continue;
      const absent = players.filter((p) => !byPlayer.has(p) && life.hitAlive(p, t) && !inRaiseGrace(life, p, t) && !inAvoidable(p, t));
      const sizes = uniq(res.map((h) => instanceKey(h.e))).map((k) => res.filter((h) => instanceKey(h.e) === k).length);
      for (const p of absent) {
        errors.push(playerError(p, {
          ruleId: EN_SHARE_RULE_ID, severity: killed.length ? "Major" : "Minor", name: `Missed ${fam.name}`,
          description: `Took no ${fam.name} ${fam.what}, so the others shared ${sizes.length === 1 ? "it" : "them"} short (${sizes.join(" + ")} players).${deathText} ${fam.why}`,
          timestamp: t, abilityId: fam.ids[0], abilityName: fam.name,
        }));
      }
    }
  }
  return errors;
}

/**
 * The first player in a Return to Nothing line (Great Return: the first
 * two) takes a much larger hit; the tanks stand there. A non-tank whose hit
 * is FRONT_RATIO times the other non-tanks' median got in front of a tank.
 * With a tank missing from the line or dead, the front was left open:
 * fallout of that (the missing tank is flagged by detectShares).
 */
function detectReturnFront(players: PlayerInfo[], life: Life): PullError[] {
  const errors: PullError[] = [];
  for (const res of clusterByGap(hitsOf(players, life, [RETURN, GREAT_RETURN]), (h) => h.e.timestamp, 1500)) {
    const t = res[0].e.timestamp;
    const tanks = players.filter(isTank);
    if (tanks.length !== 2 || tanks.some((p) => !res.some((h) => h.p === p) || inRaiseGrace(life, p, t))) continue;
    const others = res.filter((h) => !isTank(h.p) && (h.e.amount ?? 0) < PREVIEW_AMOUNT);
    if (others.length < 3) continue;
    const med = median(others.map((h) => rawOf(h.e)));
    // A player in both lines is detectShares' doubled taker (B7 +0:31).
    const doubled = (p: PlayerInfo) => uniq(res.filter((h) => h.p === p).map((h) => instanceKey(h.e))).length >= 2;
    const front = res.filter((h) => !isTank(h.p) && !inRaiseGrace(life, h.p, t) && !doubled(h.p) &&
      ((h.e.amount ?? 0) >= PREVIEW_AMOUNT || (med > 0 && rawOf(h.e) >= FRONT_RATIO * med)));
    for (const h of front) {
      const d = life.diedFrom(h.p, h.e.timestamp);
      const name = h.e.abilityId === GREAT_RETURN ? "Great Return to Nothing" : "Return to Nothing";
      errors.push(playerError(h.p, {
        ruleId: EN_FRONT_RULE_ID, severity: d ? "Major" : "Minor", name: "In Front of the Tanks",
        description: `Took one of ${name}'s front hits meant for a tank (${amountText([h.e])}, ${(rawOf(h.e) / med).toFixed(1)}x the others' hits).${d ? " They died." : ""} Line up behind your tank, on the far side from the orb.`,
        timestamp: h.e.timestamp, abilityId: h.e.abilityId, abilityName: name,
      }));
    }
  }
  return errors;
}

/** Dimension Zero: 3-4 line hits on one target; every living player stays in the line for all of them. */
function detectDimension(players: PlayerInfo[], life: Life, casts: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const set of clusterByGap(castsOf(casts, DIMENSION), (c) => c.timestamp, 6000)) {
    const t0 = set[0].timestamp, t1 = set[set.length - 1].timestamp;
    if (deadCount(players, life, t0) >= DOOMED_DEAD) continue;
    const res = hitsOf(players, life, DIMENSION).filter((h) => h.e.timestamp >= t0 - 500 && h.e.timestamp <= t1 + 1500);
    if (!res.length) continue;
    const killed = uniq(res.map((h) => h.p)).filter((p) => killedBy(life, res, p, [DIMENSION]));
    const absent = players.filter((p) => !res.some((h) => h.p === p) && life.hitAlive(p, t0) && !inRaiseGrace(life, p, t0) && !inAvoidable(p, t0));
    for (const p of absent) {
      errors.push(playerError(p, {
        ruleId: EN_DIMENSION_RULE_ID, severity: killed.length ? "Major" : "Minor", name: "Missed Dimension Zero",
        description: `Took none of Dimension Zero's ${set.length} line hits, so ${uniq(res.map((h) => h.p)).length} players shared them.${killed.length ? ` ${namesOf(killed)} died.` : ""} Everyone stacks in the marked line until the last hit.`,
        timestamp: t0, abilityId: DIMENSION, abilityName: "Dimension Zero",
      }));
    }
  }
  return errors;
}

// ── Gaze of the Void orbs ───────────────────────────────────────────────────

/**
 * Eight orbs per Gaze of the Void, each soaked by two players. In every
 * kill the pairs were the role pairs (both tanks on the big orbs, the
 * healers, the melee, the ranged), each pair taking one fast and one slow
 * orb. Failures:
 * - one soaker: the orb launches them (A4 +6:54, A10 +7:04: they fell, no
 *   killing blow ~2.3s later) or kills them outright; their partner is
 *   named when alive.
 * - three or more: the player outside the orb's pair took a second orb under
 *   Magic Vulnerability Up and usually died (A5 +1:38, A9 +1:43).
 * - an orb nobody took reaches Enuo: Big Burst (B6 +7:12), player-less.
 */
function detectOrbs(players: PlayerInfo[], life: Life): PullError[] {
  const errors: PullError[] = [];
  const pair = new Map<PlayerInfo, string>();
  for (const a of detectFFRoles(players)) if (a.player) pair.set(a.player, a.slot === "MT" || a.slot === "OT" ? "tanks" : a.slot[0]);
  const partnerOf = (p: PlayerInfo) => players.find((q) => q !== p && pair.get(q) !== undefined && pair.get(q) === pair.get(p));
  const why = "Each orb takes exactly two players, the same-role pair (tanks on the big orbs): fast orbs first, then the slow ones once Magic Vulnerability Up falls off.";
  for (const gaze of clusterByGap(hitsOf(players, life, [BURST, VIOLENT_BURST]), (h) => h.e.timestamp, 15_000)) {
    const orbs = new Map<string, Hit[]>();
    for (const h of gaze) orbs.set(instanceKey(h.e), [...(orbs.get(instanceKey(h.e)) ?? []), h]);
    for (const hs of orbs.values()) {
      const t = hs[0].e.timestamp;
      if (deadCount(players, life, t) >= DOOMED_DEAD) continue;
      const soakers = uniq(hs.filter((h) => !inRaiseGrace(life, h.p, h.e.timestamp)).map((h) => h.p));
      const size = hs[0].e.abilityId === VIOLENT_BURST ? "big" : "small";
      const died = soakers.filter((p) => life.diedFrom(p, t));
      const deathText = died.length ? ` ${namesOf(died)} died.` : "";
      if (soakers.length === 1) {
        const p = soakers[0];
        const partner = partnerOf(p);
        if (!partner || !life.hitAlive(partner, t) || inRaiseGrace(life, partner, t)) continue;
        errors.push(playerError(partner, {
          ruleId: EN_ORB_RULE_ID, severity: died.length ? "Major" : "Minor", name: "Left Orb Partner Alone",
          description: `${p.name} soaked a ${size} Gaze of the Void orb alone (${amountText(hs.filter((h) => h.p === p).map((h) => h.e))}) and was launched.${deathText} ${why}`,
          timestamp: t, abilityId: hs[0].e.abilityId, abilityName: hs[0].e.abilityName,
        }));
      } else if (soakers.length >= 3) {
        const counts = new Map<string, number>();
        for (const p of soakers) if (pair.has(p)) counts.set(pair.get(p)!, (counts.get(pair.get(p)!) ?? 0) + 1);
        const owner = [...counts].find(([, n]) => n >= 2)?.[0];
        const extras = owner ? soakers.filter((p) => pair.get(p) !== owner) : soakers;
        for (const p of extras) {
          errors.push(playerError(p, {
            ruleId: EN_ORB_RULE_ID, severity: died.length ? "Major" : "Minor", name: owner ? "Soaked Another Pair's Orb" : "Crowded Orb",
            description: `${owner ? "Joined another pair's" : "Was one of"} ${soakers.length} players in a ${size} Gaze of the Void orb (with ${namesOf(soakers.filter((x) => x !== p))}).${deathText} ${why}`,
            timestamp: t, abilityId: hs[0].e.abilityId, abilityName: hs[0].e.abilityName,
          }));
        }
      }
    }
  }
  for (const res of clusterByGap(hitsOf(players, life, ORB_FAIL), (h) => h.e.timestamp, 3000)) {
    const died = uniq(res.filter((h) => life.diedFrom(h.p, h.e.timestamp)).map((h) => h.p));
    errors.push(playerlessMinor(EN_ORB_RULE_ID, "Orb Reached Enuo",
      `A Gaze of the Void orb reached Enuo unsoaked and went off as Big Burst${died.length ? ` (${namesOf(died)} died)` : ""}. ${why}`,
      res[0].e.timestamp, res[0].e.abilityId, "Big Burst"));
  }
  return errors;
}

// ── Deep Freeze flares ──────────────────────────────────────────────────────

/**
 * Deep Freeze's two flares go on the top two of enmity (the tanks), who
 * take them at the edge away from the party. Everyone takes some falloff; a
 * non-tank with FLARE_RATIO times the others' median stood by a flare.
 * Skipped when a tank is dead (the flares retarget).
 */
function detectFlares(players: PlayerInfo[], life: Life, occurrences?: ReportedOccurrence[]): PullError[] {
  const errors: PullError[] = [];
  for (const res of clusterByGap(hitsOf(players, life, FLARE), (h) => h.e.timestamp, 1500)) {
    const t = res[0].e.timestamp;
    const tanks = players.filter(isTank);
    if (tanks.length !== 2 || tanks.some((p) => inRaiseGrace(life, p, t))) continue;
    const nonTanks = players.filter((p) => !isTank(p) && life.hitAlive(p, t) && !inRaiseGrace(life, p, t));
    occurrences?.push({ mechanicKey: EN_FLARE_RULE_ID, timestamp: t, players: nonTanks.map((p) => p.name) });
    const worst = new Map<PlayerInfo, PlayerEvent>();
    for (const h of res) if (!isTank(h.p) && rawOf(h.e) > (worst.has(h.p) ? rawOf(worst.get(h.p)!) : -1)) worst.set(h.p, h.e);
    if (worst.size < 3) continue;
    const med = median([...worst.values()].map(rawOf));
    for (const [p, e] of worst) {
      if (!nonTanks.includes(p) || med <= 0 || rawOf(e) < FLARE_RATIO * med) continue;
      const d = life.diedFrom(p, e.timestamp);
      errors.push(playerError(p, {
        ruleId: EN_FLARE_RULE_ID, severity: d ? "Major" : "Minor", name: "Stood by a Tank's Flare",
        description: `Took ${amountText([e])} from a Deep Freeze flare, ${(rawOf(e) / med).toFixed(1)}x the rest of the party: they stood near a tank's flare.${d ? " They died." : ""} The tanks take the flares at the north-west and north-east edges; everyone else stays south, away from them.`,
        timestamp: e.timestamp, abilityId: FLARE, abilityName: "Deep Freeze",
      }));
    }
  }
  return errors;
}

// ── deaths with no killing blow ─────────────────────────────────────────────

function walkingDeadRanOut(p: PlayerInfo, d: DeathEvent): boolean {
  const hitT = d.timestamp - DEATH_EVENT_LAG_MS;
  return debuffIntervals(p, WALKING_DEAD).some((w) => Math.abs(w.end - hitT) <= 1500 && w.end - w.start >= WALKING_DEAD_FULL_MS);
}

/** A death right after a listed hit is that hit's error (a lone orb launches its soaker off the edge ~2.3s later). */
const OWNED_DEATH_IDS = new Set([BURST, VIOLENT_BURST, FLARE, CHAINS, MELTDOWN_SPREAD, AIRY, DENSE, CONE]);
function ownedDeath(p: PlayerInfo, d: DeathEvent): boolean {
  return p.damageTaken.some((e) => (AVOIDABLE[e.abilityId] || OWNED_DEATH_IDS.has(e.abilityId)) && e.timestamp <= d.timestamp && e.timestamp >= d.timestamp - DIED_FROM_HIT_MS - 1000);
}

/** No-killing-blow deaths that are the wipe being called, not mistakes. */
function calledWipeDeaths(players: PlayerInfo[], deaths: DeathEvent[], pullEnd: number): Set<DeathEvent> {
  const out = new Set<DeathEvent>();
  const silent = deaths.filter((d) => {
    if (d.killingAbilityGameId) return false;
    const p = byName(players, d.player);
    return !(p && (walkingDeadRanOut(p, d) || ownedDeath(p, d)));
  });
  for (const d of silent) {
    if (pullEnd - d.timestamp <= CALLED_WIPE_END_MS) out.add(d);
    const near = silent.filter((x) => Math.abs(x.timestamp - d.timestamp) <= CALLED_WIPE_WINDOW);
    if (near.length >= CALLED_WIPE_COUNT) near.forEach((x) => out.add(x));
    const pair = silent.filter((x) => Math.abs(x.timestamp - d.timestamp) <= CALLED_WIPE_PAIR_MS);
    if (pair.length >= 2) pair.forEach((x) => out.add(x));
  }
  return out;
}

/**
 * Lone silent deaths: Walking Dead running out, or anything else (the
 * intermission's damage over time finishing a low player, or a lethal hit
 * FFLogs dropped). Player-less, so the review sees them.
 */
function detectSilentDeaths(players: PlayerInfo[], deaths: DeathEvent[], skip: Set<DeathEvent>): PullError[] {
  const errors: PullError[] = [];
  for (const d of deaths) {
    if (d.killingAbilityGameId || skip.has(d)) continue;
    const p = byName(players, d.player);
    if (!p || ownedDeath(p, d)) continue;
    const hitT = d.timestamp - DEATH_EVENT_LAG_MS;
    errors.push(walkingDeadRanOut(p, d)
      ? playerlessMinor(EN_FALL_RULE_ID, "Walking Dead Ran Out",
        `${p.name}'s Walking Dead (from Living Dead) expired before they were healed back to full, and they died. The healers have to heal the Walking Dead tank to full within its 10s.`,
        hitT, WALKING_DEAD, "Walking Dead")
      : playerlessMinor(EN_FALL_RULE_ID, "Died With No Killing Blow",
        `${p.name} died mid-pull with no killing blow: damage over time finishing them, a fall, or a lethal hit the log didn't record.`,
        hitT, 0, "Death"));
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
    return [raidMarker(EN_MASS_DEATHS_RULE_ID, "Mass Deaths",
      `${g.length} players died together to ${joinNames(kinds)} (${joinNames(uniq(g.map((d) => d.player)))}), and the pull ended soon after. Treated as the cutoff point.`,
      g[0].timestamp - DEATH_EVENT_LAG_MS + RAID_MARKER_SORT_OFFSET_MS, g[0].killingAbilityGameId, kinds[0])];
  }
  return [];
}

// ── entry point ─────────────────────────────────────────────────────────────

/** Enuo (The Unmaking, Extreme) errors. Self-gates on the boss's signature casts. */
export function detectEnuoErrors(
  players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], occurrences?: ReportedOccurrence[],
): PullError[] {
  if (!enemyCasts.some((c) => SIGNATURE.includes(c.abilityId))) return [];
  const life = buildLife(players, deathEvents);
  const pullEnd = Math.max(0, ...players.flatMap((p) => [...p.damageTaken, ...p.casts].map((e) => e.timestamp)), ...deathEvents.map((d) => d.timestamp));
  const called = calledWipeDeaths(players, deathEvents, pullEnd);

  const errors = [
    ...detectAvoidable(players, life),
    ...detectChains(players, life),
    ...detectStatusFails(players, life),
    ...detectShares(players, life, enemyCasts),
    ...detectReturnFront(players, life),
    ...detectDimension(players, life, enemyCasts),
    ...detectSpreadFamily(players, life, enemyCasts, MELTDOWN),
    ...detectTurbulence(players, life, enemyCasts),
    ...detectEmptyTowers(players, life, enemyCasts),
    ...detectOrbs(players, life),
    ...detectFlares(players, life, occurrences),
    ...detectSilentDeaths(players, deathEvents, called),
  ];
  const firstRaid = () => Math.min(...errors.filter((e) => e.severity === "Raid").map((e) => e.timestamp));
  const selfDestruct = hitsOf(players, life, SELF_DESTRUCT)[0];
  if (selfDestruct && selfDestruct.e.timestamp < firstRaid()) {
    errors.push(raidMarker(EN_SELF_DESTRUCT_RULE_ID, "Shadow Self-Destructed",
      "A personal shadow survived its duel and went off as Self-Destruct on the party. Each player kills their own shadow (the one from their tower). Treated as the cutoff point.",
      selfDestruct.e.timestamp, SELF_DESTRUCT, "Self-Destruct"));
  }
  for (const m of detectMassDeaths(deathEvents, pullEnd)) if (m.timestamp < firstRaid()) errors.push(m);
  const enrage = castsOf(enemyCasts, ENRAGE)[0];
  if (enrage && enrage.timestamp < firstRaid()) {
    const apeiron = enrage.abilityId === 48478;
    errors.push(raidMarker(EN_ENRAGE_RULE_ID, apeiron ? "Apeiron (Intermission Enrage)" : "Almagest (Enrage)",
      apeiron
        ? "The intermission gauge filled and Apeiron went off: the Looming Shadow and the Beacon in the Dark weren't killed in time."
        : "The final Almagest went off: Enuo wasn't brought down before the hard enrage.",
      enrage.timestamp, enrage.abilityId, apeiron ? "Apeiron" : "Almagest"));
  }
  const calledList = deathEvents.filter((d) => called.has(d)).sort((a, b) => a.timestamp - b.timestamp);
  const calledPair = calledList.some((d, i) => i > 0 && d.timestamp - calledList[i - 1].timestamp <= CALLED_WIPE_PAIR_MS);
  if ((calledList.length >= CALLED_WIPE_COUNT || calledPair) && calledList[0].timestamp - DEATH_EVENT_LAG_MS < firstRaid()) {
    errors.push(raidMarker(EN_CALLED_WIPE_RULE_ID, "Wipe Called",
      `${calledList.length} players died with no killing blow together (${joinNames(uniq(calledList.map((d) => d.player)))}): the wipe was called and the raid reset.`,
      calledList[0].timestamp - DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  const outAt = (t: number) => players.filter((p) => !life.alive(p, t));
  const collapseT = life.outIntervals.map((w) => w.start).sort((a, b) => a - b)
    .find((t) => outAt(t).length >= COLLAPSE_DEAD_COUNT && pullEnd - t <= COLLAPSE_END_MS);
  if (collapseT !== undefined && collapseT + DEATH_EVENT_LAG_MS < firstRaid()) {
    const who = outAt(collapseT).map((p) => p.name);
    errors.push(raidMarker(EN_COLLAPSE_RULE_ID, "Party Collapse",
      `${who.length} players were dead at once (${joinNames(who)}). Treated as the cutoff point.`,
      collapseT + DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
