// lib/mechanics/ffxiv/dsr/dragon-king-thordan.ts
//
// -- DIGEST --
// DSR Ultimate P7 research only; expands Terra's model, no detector/log proof.
// Transition has two bleed windows then Alternative End. Final phase:
// Exaflare -> two Trinities -> Akh Morn -> two Trinities -> Gigaflare ->
// two Trinities; repeat, but third cycle has NO Gigaflare: third Akh Morn,
// two Trinities, Morn Afah sacrifice-tower enrage. Three Exaflares,
// three Akh Morns (5/6/7 hits), two Gigaflares (three hits each).
// Trinity separately hits top two enmity targets and proximity bait, in
// small circles; tanks rotate resistance exposure, non-tanks rotate physical
// vulnerability. Every Edge also resolves fire OUT / ice IN.
// 3-3-2 towers are a split-damage plan, NOT required occupancy counts.
// 6-1-1 (blue invuln, red tank mitigation, other red six) is legitimate.
// JP/Mana may tank-LB3 second Akh Morn; MRH/HMR proximity-bait orders differ.
// Enrage's intended sacrifices are normal; Raid occurs at failed final
// coverage/terminal loss, not at cast start or first planned death.
// Sections: "SCOPE AND SOURCES", "SHAPE AND CLOCK", "LOG AND SEVERITY",
// "TRANSITION: TWO BLEEDS AND ALTERNATIVE END", "TRINITY",
// "FLAMES AND ICE OF ASCALON", "EXAFLARES EDGE", "AKH MORNS EDGE",
// "GIGAFLARES EDGE", "MORN AFAHS EDGE AND ENRAGE", "PULL ENDERS",
// "STRATEGY AND NOT ERRORS", "OPEN QUESTIONS".
// Main unknowns: proximity selection/auras, damage splitting and snapshots,
// geometry/falloff, enrage death/penalty timing. No user assignments supplied.
// -- END DIGEST --
//
// -- SCOPE AND SOURCES --
// Ultimate only, checked 2026-11-02. All IDs/action roles are candidates.
// [IV] https://www.icy-veins.com/ffxiv/dragonsongs-reprise-ultimate-guide-for-dragonking-thordan
// [T] https://ffxiv.tuufless.com/elemental/dsr/07_dragonking_thordan/
// [R] https://ffxiv.tuufless.com/mana/dsr/differences/
// [NA] https://naurffxiv.com/ultimate/dsr
// [U] https://ultistrats.com/guides/dsr/
// [M] https://materiaraiding.com/ultimate/dsr
// [APD] https://ultimates.guide/dsr/
// [O] First-hand author of 1-1-6 / no P6 invuln plan:
// https://www.reddit.com/r/ffxiv/comments/v12o43/
// [DRK] https://www.thebalanceffxiv.com/jobs/tanks/dark-knight/fight-tips/the-dragonsongs-reprise-ultimate-drk-guide/
// [B] DSW2Enums.cs, DSW2States.cs, P7Trinity.cs, P7FlamesIceOfAscalon.cs,
// P7ExaflaresEdge.cs, P7AkhMornsEdge.cs, P7GigaflaresEdge.cs,
// P7MornAfahsEdge.cs, independent game-event/geometry descriptions:
// https://github.com/awgil/ffxiv_bossmod/tree/master/BossMod.Ultimate/Endwalker/Ultimate/DSW2
// [C] https://raw.githubusercontent.com/quisquous/cactbot/main/ui/raidboss/data/06-ew/ultimate/dragonsongs_reprise_ultimate.txt
// [W] https://consolegameswiki.com/wiki/Dragonsong%27s_Reprise_(Ultimate)
// Release 6.11; no P7 numerical hotfix established. P1 links official release
// and 2024-07-02 freeze fix (P6 relevance). Modern damage/mitigation changes
// recovery, cooldown plans and whether sacrifice towers are reached.
// Source caution: C's explanatory comment contains 69DC/69D3 spellings;
// B's decimal 28060/28051 and C's live timeline use 6D9C/6D93. The initial
// draft copied those suspicious hex comments. Decimal candidates below
// retain the consistent game-action mapping, pending actual FFLogs checks.
//
// -- SHAPE AND CLOCK --
// Requires successful rewind save, P5 spare and both P6 dragons finished.
// P7 owns Resentment -> Shockwave -> Alternative End transition so neighboring
// modules do not each own the same deaths. Square arena, lethal perimeter.
// Dragonking is movable/rotatable through enmity between forced casts.
// Three regular Edge types determine positioning, not a resource/energy bar.
// [C] EFFECT clock from Shockwave (00:00), rounded:
// 00:16 Alternative End; 00:25 targetable; 00:36 Exaflare1;
// 00:44/48 Trinity pair; 00:57 Akh Morn1 (five hits);
// 01:09/13 Trinity pair; 01:24 Gigaflare1 (three over ~8s);
// 01:42/46 Trinity pair; 01:55 Exaflare2; ~02:16 Akh Morn2 (six);
// ~02:44 Gigaflare2; ~03:15 Exaflare3; ~03:36 Akh Morn3 (seven);
// ~03:50/54 final Trinities; enrage towers ~04:06/09/13.
// Each later regular Edge likewise has two follow-up Trinities. Subtract
// ~25s for boss-targetability clock; whole-pull offset varies with prior
// kills/holds. Enrage cast begins ~10.7s before first towers, NOT at 04:06.
// All numbers are source anchors, not measured report thresholds.
//
// -- LOG AND SEVERITY --
// DECIMAL game actions from B, unverified in FFLogs. Controller casts,
// actual helper hits, subsequent hits and missed-tower penalties differ.
// Damage Down is attributable Major even if alive; otherwise Minor for
// avoidable nonlethal damage, Major for caused death/loss, Raid for terminal
// wipe. Do not infer mistake from every high hit in this mitigation phase.
// A planned 6-1-1 solo buster or lethal sacrifice is not an under-soak error.
// Tank actions/actual enmity matter, not fixed MT/OT job guesses. Victim x/y
// does not provide source-facing, origin, missing helper or intended plan.
// Debuff cleanup on death differs from expiry/swap; raised replacements and
// missing targets after earlier deaths can change ordinary mechanic damage.
//
// -- TRANSITION: TWO BLEEDS AND ALTERNATIVE END --
// What: remaining eyes/Estinien produce Resentment/bleed as in P4, then
// Thordan's Shockwave 29156 creates another raid-damage/bleed window.
// Alternative End 29752 is the separate large transition hit before target
// is available. These are NOT missed-tower or Exaflare failure spells.
// Correct: top and mitigate ongoing bleeds; shield/mitigate Alternative End
// after late bleed ticks so shields are not consumed prematurely. Enemy
// debuffs requiring a target may be unavailable; party mitigation still works.
// Failure -> LOG SIGNAL: source-specific raid hit/periodic death, missing
// coverage or prior low HP; FAULT: group plan/prior cause unless a precise
// assigned omission is known; CONSEQUENCE: Major with attribution, Raid on
// terminal collapse. A player's death alone does not prove one healer fault.
// Removal: bleeds expire on their timers, not a required Esuna. Not errors:
// both bleed windows, sustained healing, raidwide hits, waiting to shield.
//
// -- TRINITY --
// What: controller 28062; actual small ~3y-circle effects:
// 28063 = highest-enmity dark hit; 28064 = second-enmity light hit;
// 28065 = proximity hit, normally a non-tank, dark/light plus physical
// vulnerability. Top tanks gain corresponding Dark/Light Resistance Down;
// nearest bait gains Physical Vulnerability Up and elemental exposures.
// TWO Trinity volleys after EACH of eight regular Edges = sixteen volleys,
// each with three primary hits, normally 48 primary target events total.
// Extra splash recipients are distinct from three intended primary targets.
// Correct: tank swap during each major Edge cast so consecutive sets do not
// continually build same-element resistance down. Both tanks continue taking
// each volley, separated from each other and the proximity bait. Two members
// of scheduled non-tank pair step in one at a time; first steps back before
// second. Others stay farther than next bait, usually max-melee or beyond.
// "Nearest" is from boss, not tank, ring waymark or arena center. Exact
// exclusion of top-enmity targets from proximity selection is unverified;
// B simplifies its display to tanks + closest non-tank, not proof of game rule.
// Failure: repeat proximity -> LOG SIGNAL: 28065 on same target while Physical
// Vulnerability Up active, death; FAULT: late departing bait or missing next
// bait only if positions/duty establish it; CONSEQUENCE: Major.
// Failure: overlapping recipients -> LOG SIGNAL: extra 28063/64/65 hits at
// same volley, stacked vulnerabilities/deaths; FAULT: misplaced target or
// intruder if known; CONSEQUENCE: Major on death, Minor if no Damage Down.
// Failure: wrong tank rotation -> LOG SIGNAL: same tank's elemental stacks
// grow across sets, no intended enmity swap, lethal hit; FAULT: swap duty
// only with enmity/plan evidence; CONSEQUENCE: Major, Raid if terminal.
// Failure: enmity lost after death -> LOG SIGNAL: dark/light primary target
// becomes non-tank; FAULT: earlier cause or failed recovery pickup, not
// automatically that recipient; CONSEQUENCE: Major for proven new cause.
// Removal: resistances/vulnerability expire; swapping changes assigned
// element, not instantaneous dispel. Death removes statuses but recovery
// target selection needs verification. Not errors: both tank hits per volley,
// each intended proximity hit, normal two-hit elemental accumulation per set.
//
// -- FLAMES AND ICE OF ASCALON --
// What: fire sword -> Flames of Ascalon 28049, ~8y point-blank (OUT);
// ice sword -> Ice of Ascalon 28050, ~8y-inner donut (IN). Each regular
// Edge resolves one of these, before/at its opening damage. Candidate
// Generic Mechanic status 2056 with extra data may encode sword color;
// this NPC cue is not automatically a player aura visible in FFLogs.
// Correct: read current sword each cast, resolve IN/OUT then finish the
// Exaflare/tower/proximity movement. Fire does not forbid entering hitbox
// AFTER its snapshot; returning in helps tower sharing/healing.
// Failure -> LOG SIGNAL: actual 28049/28050 hit, Damage Down/death;
// FAULT: mover unless pushed or constrained by earlier failure;
// CONSEQUENCE: Major with Damage Down/death, Minor otherwise.
// Removal: instantaneous attack, no player-debuff cleanse. Not errors:
// moving in after fire, farther out on fire, different opening sword patterns.
//
// -- EXAFLARES EDGE --
// What: controller 28059 (~6s). Three starts relative to boss orientation,
// each emits moving explosions in THREE orthogonal directions (nine rays).
// First-circle effect 28060, later effects 28061. B models ~6y radius,
// ~7y step, ~1.9s cadence, six positions per ray including origin. Shared
// starting circles / helpers mean raw event-row count is not nine separate
// initial explosions. Three occurrences, always alongside fire/ice in/out.
// Correct static: face boss N/S, begin behind outside/inside per sword,
// wait first explosion, move into its cleared center, then use a second
// backward/side dodge if another ray crosses it. Never run into a first
// telegraph before it explodes. Follow ray directions, not animation tail.
// Uptime alternative: choose an origin that other rays do not cross, then
// one movement into that cleared origin can suffice. Rear origin may need
// a second dodge; one-movement is pattern-dependent, not universal.
// Failure -> LOG SIGNAL: 28060/28061 damage, Damage Down/death; FAULT:
// mover unless earlier knockback/bad boss movement established;
// CONSEQUENCE: Major with Damage Down/death, Minor otherwise. A tank dying
// may change Trinity enmity next; those victims are fallout, not new faults.
// Removal: each ray advances then expires; no player aura to dispel.
// Not errors: downtime dodge, choosing another origin, single or two-step
// path, boss re-facing between casts when next pattern remains solvable.
//
// -- AKH MORNS EDGE --
// What: 28051 controller (~6s); three towers relative to boss facing,
// front-left/red, front-right/red, rear/blue. Candidate ~4y tower radii.
// FIRST hits 29452 / 29453 red, 29454 blue; REPEATS 28054 red / 28055 blue;
// FAIL 28056 is separate room-wide missed-tower damage. Same display name
// alone cannot distinguish hit type. Blue total is tuned for tanks, red
// for other split groups. Successive occurrences have FIVE / SIX / SEVEN
// hits, roughly 1.1s apart; first-to-last windows ~4.4/5.5/6.6s, plus effect
// sequencing can make displayed windows longer. Measure actual report hits.
// Correct standard 3-3-2: each red = healer + two DPS, blue = both tanks.
// ALL hits must remain covered; mitigation/healing must cover later hits,
// not merely first impact. Fire/ice resolves before tower entry deadline.
// Alternative 6-1-1: one tank invulns blue, other tank solo-mitigates red,
// six others stack remaining red. Occupancy is split damage: three and two
// are NOT proven minimums. Each tower needs coverage; invuln does not make
// it okay to leave a tower entirely empty. Role/position choice is external.
// Failure: uncovered tower -> LOG SIGNAL: 28056 raid penalty rather than
// ordinary local hits, missing coverage; FAULT: known missing occupant only
// with assigned tower, otherwise unknown; CONSEQUENCE: Raid if terminal.
// Failure: group splits/leaves early -> LOG SIGNAL: declining recipients,
// increased per-victim later hits/deaths; FAULT: mover only if plan/position
// establish premature departure; CONSEQUENCE: Major for caused death.
// Failure: planned solo dies -> LOG SIGNAL: correct tower hit stream,
// insufficient survival/expired invuln and death; FAULT: mitigation/healing
// responsibility only with plan, not "one player in tower" by itself;
// CONSEQUENCE: Major if attributable, Raid if subsequent coverage collapses.
// Removal: towers finish after full hit count; ordinary damage has no
// required dispel. Death-time target/remaining-tick behavior is unverified.
// Not errors: every shared hit, solo blue under invuln, red tank solo,
// tank LB3 on a planned set, reduced group occupancy during recovery.
//
// -- GIGAFLARES EDGE --
// What: controller 28057 (~8s). Three proximity origins around boss form
// triangle; resolve in spawn order. Actual hits 28058 / 28114 / 28115,
// ~4s apart, total ~8s. Fire/ice resolves around first blast. TWO occurrences;
// there is no third Gigaflare before enrage. IV estimates safe falloff ~21y;
// B says ~20? and T describes steep near-lethal boundary. This is a guide
// estimate, NOT a validated continuous damage-distance formula or tolerance.
// Correct rotating plan: opposite each source for its blast, rotate around
// boss following sequence. Single-movement plan: opposite first, then cross
// to first origin after its blast, remain far enough from other two. Ice-IN
// limits radial freedom; use the safe portion inside hitbox opposite first.
// Party mitigation/healing must cover EACH hit; later hits may snapshot
// separately. Short mitigation applied too early can expire before hit three.
// Failure: too near -> LOG SIGNAL: source-specific excessive hit/death plus
// snapshot distance to actual origin; FAULT: player only if avoidability is
// established, otherwise healing/mitigation/prior HP cause unknown;
// CONSEQUENCE: Major on caused death, Minor for avoidable excess survived.
// Failure: fire/ice error during proximity -> LOG SIGNAL: distinct Ascalon
// effect, not merely high Gigaflare; FAULT: mover unless forced;
// CONSEQUENCE: Major with Damage Down/death. Removal: circles resolve once;
// no player cleanse. Not errors: three intended reduced hits, either route,
// stationary casters in a valid single-movement spot, residual heavy damage.
//
// -- MORN AFAHS EDGE AND ENRAGE --
// What: after Akh Morn3 and its two Trinities, Morn Afah's Edge 28206,
// ~10s cast. FIRST three fatal towers 29455/29456/29457; subsequent fatal
// tower effect 28208, controller 28207. Empty-tower FAIL 28209 is separate
// raid-wide wipe. Each set at same three sites, ~3.2s between sets. This
// sequence repeats; "three sets" describes normal eight-player exhaustion,
// not necessarily a hard-coded limit of three game executions.
// Correct extension: sacrifice three players per first TWO sets, keeping
// highest damage pair alive to finish during third empty-tower penalty
// animation. Example first H1/H2/MT, second R1/R2/OT, M1/M2 keep attacking.
// Each intended covered tower kills its soaker; normal tank invulnerability
// is not assumed to survive this scripted sacrifice.
// Failure: early uncovered tower -> LOG SIGNAL: 28209 and raid death earlier
// than expected sacrifice schedule; FAULT: assigned sacrificer only if plan
// known, otherwise group damage check; CONSEQUENCE: Raid at terminal event.
// Failure: still alive at final coverage exhaustion -> LOG SIGNAL: boss
// survives final empty-tower wipe; FAULT: raid DPS/prior loss, player-less;
// CONSEQUENCE: Raid. Cast beginning or first planned death is NOT failure.
// Removal: boss defeat ends objective; effect animations/death order at the
// kill boundary need verification. Not errors: up to six planned sacrifice
// deaths, deliberately empty final set, a kill during the enrage sequence.
//
// -- PULL ENDERS --
// Final uncovered Morn Afah penalty, terminal ordinary tower failure,
// unrecoverable Trinity/enmity collapse, or too many lost players to cover
// next obligations. Exaflare/Gigaflare deaths can be raised; one death is not
// universally Raid. Third Akh Morn is toughest repeated group hit; it is
// a scripted escalation, not a separate failure cast. Enrage can be beaten
// during sacrifice extension; actual terminal damage/kill outcome matters.
//
// -- STRATEGY AND NOT ERRORS --
// NA/Elemental MRH Trinity: melee after Exaflare, ranged after Akh Morn,
// healers after Gigaflare, G1 then G2 in each pair. Mana HMR: healers after
// Exaflare, melee after Akh Morn, ranged after Gigaflare. Both rotate six
// non-tanks safely when timings/debuffs permit. Other explicit orders valid.
// All-3-3-2 is common Elemental/LPDU-style; NA often 3-3-2 first then 6-1-1
// second/third with alternating tank invulns. Mana tank-LB3 second Akh Morn
// changes mitigation expectations without changing tower ownership.
// Other split distributions (e.g. 4-3-1 with solo blue invuln) follow the
// same sharing mechanics but require their actual mitigation plan; no
// detector should impose 3-3-2 counts as a universal success criterion.
// Saving P6 invulns or using them there changes P7 options; cooldowns depend
// on job and prior holds, not blanket "always invuln here" requirements.
// Static two-step Exaflares, pattern-read uptime Exaflares, rotating or
// single-cross Gigaflare, compass-mirrored tower sites and sacrifice orders
// all vary. Boss-relative front/rear matters more than literal NW/NE/S.
// Intended transition damage, Trinity hits, tower shares, proximity damage,
// tank invulns/LBs and sacrifice deaths are normal. No group-specific plan.
//
// -- OPEN QUESTIONS --
// 1. Map FFLogs cast/hit/penalty and resistance/Physical Vulnerability GUIDs,
//    including correct Exaflare/Akh Morn hex mappings and helper sources.
// 2. Verify Trinity proximity eligibility, enmity/splash behavior, aura
//    durations/stack reset and death/raise retargeting before attributing swaps.
// 3. Verify tower split arithmetic/empty checks across every hit, invuln/LB
//    interactions, and count-specific 5/6/7 damage/mitigation snapshots.
// 4. Measure sword radius, Exaflare step/cadence, Gigaflare source/falloff/
//    snapshot positions and safe ice-IN region; no guide pixels as thresholds.
// 5. Verify transition bleed windows and enrage cast/first/repeat/fail/kill
//    timing, fatal soak behavior, and valid kill during final empty animation.
// 6. Build from a kill plus Trinity, Exaflare, both tower plans, Gigaflare
//    and sacrifice/enrage wipes. User logs/assignments have not been supplied.
