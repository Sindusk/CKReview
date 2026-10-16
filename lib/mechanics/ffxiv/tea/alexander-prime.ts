// The Epic of Alexander (Ultimate) -- Phase 3: Alexander Prime.
// Includes entry Temporal Stasis and the Divine Judgment transition.
//
// -- GUIDE-DERIVED MODEL (2026-10-15) --
// Research only: no detector, live-report verification or VOD rulings.
// Eight-player level-80 Ultimate (5.11), item-level sync 475. This model
// ends after the tank-LB transition hit; Perfect Alexander has its own
// file. A future VERIFIED AGAINST LOGS section takes precedence.
// All failure signals are guide/source-derived and unobserved locally.
// Later job changes affect damage checks and cooldown coverage. Historic
// invulnerability timings and launch healing numbers are not invariants.
//
// -- SOURCES CHECKED 2026-10-15 --
// [NA] Current NAUR directory and linked phase toolboxes:
// https://naurffxiv.com/ultimate/tea
// https://ff14.toolboxgaming.space/?id=860745463802461&preview=1
// https://ff14.toolboxgaming.space/?id=537197026169861&preview=1
// [WD] Browser, NAUR/Elinabin Timestop/Inception and Wormhole tabs;
// Wormhole initial diagram visually inspected to settle true north:
// https://wtfdig.info/ultimates/tea#naur
// [IV] Lyra, alternate Stasis/Inception sides and PUG Wormhole:
// https://www.icy-veins.com/ffxiv/the-epic-of-alexander-ultimate-guides-alexander-prime
// [US] Relative-Alex-north Wormhole / Christmas-right Stasis:
// https://ultistrats.com/guides/tea/
// [OCE] Written true-north Wormhole, crystal/orb and debuff reasoning:
// https://materiaraiding.com/ultimate/tea
// [BM] Primary actor/action/status definitions, geometry and event order:
// https://github.com/awgil/ffxiv_bossmod/tree/master/BossMod.Ultimate/Shadowbringers/Ultimate/TEA
// Read TEAEnums.cs, TEAStates.cs, P3TemporalStasis.cs, P3Inception1-4.cs,
// P3Wormhole.cs, LimitCut.cs, ApocalypticRay.cs and P2SuperJump.cs.
// [CB] Primary reference timeline and trigger IDs, main branch:
// https://github.com/quisquous/cactbot/blob/main/ui/raidboss/data/05-shb/ultimate/the_epic_of_alexander.txt
// Same path: the_epic_of_alexander.ts. No implementation code reproduced.
//
// -- SHAPE, CLOCK, AND ENCOUNTER PUZZLE --
// BJ+CC defeat triggers Temporal Stasis, then Alexander Prime (AP) becomes
// attackable between formations. Formation starts and resolves on a
// script, not HP thresholds. Boss damage affects the eventual final check.
// Inception's True Heart must collect four crystals and awaken to grant
// the Enigma Codex used to see Fate Projection in P4. This is a mechanic
// objective, not an add to kill. Standard progression preserves it.
// End sequence defeats CC, then BJ, then AP before their deadlines;
// actual finish and tank-LB transition depend on kill times.
// [CB] t=0 here is Temporal Stasis RESOLUTION (synthetic timeline 500).
// Its 8s cast begins at -8; this anchor is not pull time or first AP auto:
//   +3.1 debuff resolution; +5.1..7.2 three swords / two fire cones;
//   +11.4 targetable; +21.5 Heat; +24.6/+26.7/+28.8 Spears.
//   +37.9 Inception Formation; +41.0 untargetable;
//   +52.4 Judgment Crystal control; +58.2 crystal drops / True Heart;
//   +69.5/+71.7/+73.8 three Flarethrowers; +81.0 Inception;
//   +89.1 debuffs resolve, +89.4 Sacrament;
//   +95.3/+96.4/+97.5 swords; +98.3 Super Jump; +100.3 targetable;
//   +110.9 Heat; +116.0/+118.1/+120.2 Spears (longer delay).
//   +129.3 Wormhole Formation; +132.3 untargetable; +137.7 Limit Cut;
//   +140.7 Link-Up; +143.7 Void; +149.5 Chakrams; +150.9 jump/#1;
//   +152.4 #2; +155.2 #3; +155.6 soak 1; +156.7 #4;
//   +157.9 Sacrament; +159.5 #5; +159.7 soak 2; +160.8 #6;
//   +163.6 #7; +164.0 soak 3; +165.1 #8;
//   +166.4 Missile Command; +170.0 Incinerating Heat;
//   +174.2 targetable; +174.6 Enumerations; +182.9/+190.0 Mega Holy;
//   +199.4 Summon Alexander; +205.7 J Storm, adds ~+206.8 targetable.
// These are reference resolving-action times, not verified cutoffs. A
// source clock that resynchronizes on kill events cannot establish a
// globally fixed Divine Judgment or P4 start time.
//
// -- IDs, GEOMETRY, AND ATTRIBUTION --
// Decimal action IDs are candidates from BM/CB, not verified FFLogs IDs.
// Raw status IDs usually map to FFLogs 1000000 + raw. Tethers/headmarkers
// visible in client tools may be absent from the app's exported streams.
// AP actor 0x2C53, Shanoa 0x2C51, True Heart 0x2C52, Plasmasphere 0x2C50,
// crystal 0x2C54, giant Alexander transition actor 0x18D6.
// Minor: nonfatal avoidable damage/no Damage Down. Major: named root
// cause of death/wipe or confirmed avoidable Damage Down. Raid: genuinely
// unrecoverable state, no invented individual for an invisible assignment.
// Correct tank/raid/soak damage deaths are mitigation analysis. A prior
// death's lost baits and redistributed mechanics are fallout, not new fault.
//
// -- TEMPORAL STASIS --
// Candidate cast 18522 (8s); Temporal Displacement raw 1119 freezes the
// players. Per role group, one support + one DPS receive each assignment:
// House Arrest raw 1123 (close), Restraining Order 1124 (far), Aggravated
// Assault 1121 (no extra damage), or no debuff. Four pairs = eight players.
// Candidate resolution hits: Plaint of Surety 18531 (tether check),
// Plaint of Severity 18529 (expected hit/vulnerability on Assault).
// House Arrest game tether 28, Restraining Order 29. BM uses <=5y close
// and ~30y far; cited examples pass 4.93y / fail 5.34y for close and fail
// 25.45y / pass 31.25y for far. These bracket, not prove exact thresholds.
// CC Alpha Sword 18539 aims three successive cones at its closest three
// players. BJ Flarethrower 18540 aims two successive cones at its closest
// two. Baiters must not overlap cones or include Assault players.
// NAUR / Christmas-right plan: House Arrest pair stays E of center,
// support just N / DPS just S of the EAST boss, whichever boss that is;
// no-debuff pair similarly N/S of WEST boss. Assault pair stays at the
// BJ-side wall. Far tether pair splits opposite sides; player on CC side
// is near its outside marker to take the third sword, BJ side at wall.
// WD describes the far pair as FFA: support is NOT always E or W.
// Thus House Arrest baits CC if CC E, BJ if CC W; no-debuff pair does the
// other boss. Freeze locks the correct setup for the entire resolution.
// Failure: tether distance -> LOG SIGNAL: lethal 18531 / failed pair
// check rather than its possible 1-damage success; FAULT: off-position
// endpoint if plan known, otherwise unresolved pair; CONSEQUENCE: Major.
// Failure: wrong/overlapping cone -> LOG SIGNAL: extra 18539/18540 victim
// or repeated element during vulnerability; FAULT: wrong nearest bait or
// lane entrant as established; CONSEQUENCE: Major if lethal, Raid when
// the full mechanic can no longer resolve. Assault victim is not assumed
// to have moved wrong simply because a cone hit them.
// Removal: scripted expiry/resolution and unfreeze; no cleanse. Death
// removes statuses, but frozen-player immobility itself is expected.
// Not errors: assigned cones, Severity hit, successful tether check.
//
// -- CHASTENING HEAT / DIVINE SPEAR / MEGA HOLY --
// Heat cast/damage 19072, 5s / ~5y tank circle, Magic Vulnerability Up.
// Spear 19074, three magical frontal cleaves, ~2.1s apart. First set starts
// ~3.2s after Heat; second ~5.2s. Face away, swap after Heat or coordinate
// invulnerability coverage. Longer second set can outlast an invuln used
// on Heat; tank may mitigate Heat then invuln Spears. Job-specific
// exceptions must be checked against current level-80 ability behavior.
// Mega Holy 19075: two unavoidable raidwides after Wormhole, 7.1s apart.
// Failure: party cleave / invalid swap -> LOG SIGNAL: 19074 nonassigned
// victims or vulnerable tank continues taking it with a demonstrated
// missed swap; FAULT: responsible tank if assignment established;
// CONSEQUENCE: Major if lethal. A planned invulnerable vulnerable tank
// is not a missed swap. Raw buster or Holy deaths alone are not flags.
// Removal: vulnerability times out; no dispel/raid explosion sourced.
//
// -- INCEPTION: ORBS, CRYSTALS, HEART --
// Inception Formation 18543. Four Plasmaspheres tether four random
// players (game tether 12). Remaining four get crystal marker (raw icon
// 96): control 18523, drop damage 18524, 5y circles. Crystal ground and
// orb ground actors are 0x1E9E3C / 0x1EA1C9; not ordinary player auras.
// Aetheroplasm 18546 is each orb's ~6y explosion; Electromagnetic Burst
// 18548 is the raid penalty for intersecting explosions/ground effects.
// Orbs shrink/weaken with time; kite across arena before deliberately
// intercepting own orb. Early interception hurts, incidental interception
// changes the puzzle, and overlapping orb explosions/green residue is bad.
// Exact collision test (explosions vs residual zones) remains unverified.
// NAUR: initial AP N or S becomes relative N, Shanoa opposite. Two orbs
// from each E/W side; cross tether paths so their owners take opposite
// long routes, using N intercardinal then E/W red floor dots. Crystal
// players go relative S and form a four-corner box in True Heart's path.
// Initial crystal circles must not overlap (5y radii -> nominal 10y
// separation). Box is centered on Heart's line, away from initial AP.
// Wall pair plants first; inner pair aligns to it. Watch traveling orbs.
// Shanoa's Undying Affection 19020 summons True Heart; Heart moves toward
// AP, touches all FOUR crystals, awakens golden and later reveals AP's
// new location. Do not destroy Heart. Gauge-building attacks on its
// invulnerable state are legitimate; no obligation to deal real HP damage.
// Candidate normal crystal burst Tetrashatter 19080; failed crystal cast
// Tetrashatter 18525 (5.5s). Candidate Heart success action 19024, player
// Enigma Codex raw 2146; Heart's own Codex raw 2147 is a DIFFERENT aura.
// Crystal bursts are proximity damage: leave the crystal side toward AP
// after placement. Four normal Heart-triggered bursts are intended.
// Failure: early/intersecting orb -> LOG SIGNAL: 18546 unusually early /
// 18548 raid penalty, orb/tether positions if available; FAULT: intercepted
// path or bad explosion placement if established; CONSEQUENCE: Major/Raid.
// Failure: overlapping/wrong crystal -> LOG SIGNAL: 18525 or premature
// bursts / failed four-crystal awakening; FAULT: misplaced marked player
// only if box geometry/assignment establishes it; CONSEQUENCE: Raid for
// lost required objective, Major when attributable.
// Failure: Heart not awakened -> LOG SIGNAL: fewer consumed crystals,
// no success/2146 buff; FAULT: unresolved unless placement cause proven;
// CONSEQUENCE: standard-plan progression failure, but absence of Codex
// alone does not establish an immediate wipe (see P4 visibility caveat).
// Removal: orbs consumed on contact, green ground lingers; crystals
// disappear on burst/consumption; Heart exits after its scripted journey.
// Dead marked-player orb/crystal behavior is an open question. No Esuna.
//
// -- INCEPTION: THREE FIRE BAITS, SACRAMENT, DEBUFFS, SWORDS/JUMP --
// Three closest-player Flarethrowers 18540 occur after orbs. NAUR takes
// them tank 1 / tank 2 / remaining party, avoiding repeated Fire weakness.
// MT far / OT middle in strategy terminology identifies which fire
// position is used; the selected target must actually be nearest for its
// own snapshot. After each shot that baiter leaves the next bait's path.
// New debuffs: one tank + one DPS Restraining Order; one DPS Shared
// Sentence raw 1122; other two DPS Assault. Healers have no such debuff.
// Shared Sentence resolves as Plaint of Solidarity 18530, ~4y split stack
// (three-player normal plan); Severity 18529 hits Assaults, Surety 18531
// checks the far pair. Inception control 18526 is not the damaging
// Sacrament hit 18527, a cross of 16y-wide lanes from AP's new position.
// NAUR: awakened Heart's destination becomes new relative N. Both tanks
// + Shared DPS go relative W (LEFT facing Heart), five others relative E.
// Use the wall for far-tether distance, and stand outside Sacrament lanes.
// After resolution, return to TRUE coordinates: CC center, BJ W. Regen
// healer N of CC, shield S, far-tether DPS W are the three close sword
// baiters; Assault/shared players stay out. A tank (normally first
// invuln tank) baits BJ's farthest Super Jump at E wall; others near 1
// marker move inward as swords begin so they avoid the ~10y jump splash.
// Super Jump: controller 18505, damage 18506. The expected tank jump hit
// is not a numbered charge and does not need the same prevention logic.
// Failure: fire repeats / clips -> LOG SIGNAL: 18540 on previous baiter
// or party in wrong volley; FAULT: wrong nearest bait/entrant as proven;
// CONSEQUENCE: Minor/Major, Raid only for an unrecoverable cascade.
// Failure: shared/far/Assault -> LOG SIGNAL: lethal 18530/18531 or Assault
// plus unintended damage; FAULT: off-position assigned member, not every
// stack casualty; CONSEQUENCE: Major/Raid. Normal Plaint hits are expected.
// Failure: Sacrament -> LOG SIGNAL: 18527; FAULT: lane entrant unless
// earlier forced movement caused it; CONSEQUENCE: Minor/Major by outcome.
// Failure: wrong sword/jump bait -> LOG SIGNAL: 18539/18506 targets and
// extra victims; FAULT: wrong nearest/farthest bait or off-slot bystander;
// CONSEQUENCE: Major if lethal. All geometry requires the correct frame.
// Removal: debuffs resolve on the scripted check; no cleanse. Their
// temporary vulnerabilities restrict who can bait the subsequent swords.
//
// -- WORMHOLE: NAUR TRUE-COORDINATE PLAN --
// Wormhole Formation 18542; numbered Limit Cut control 19215. Actual
// TRUE layout: AP S, BJ/CC NW/NE (can swap), not AP N. Everyone baits
// Chakrams at center before leaving. Chakrams spawn N and BJ-side E/W,
// cutting the center on perpendicular axes; Link-Up 18495 here does NOT
// apply Compressed Water/Lightning. Eye of the Chakram hit 18517.
// Odds W, evens E. 1/2 initially NW/NE red dots; 3/4 SW/SE, with the
// player farthest from BJ exactly on its red dot to bait jump, partner
// closer to wall as appropriate. 5/6/7/8 wait on northern side near
// wall, not center or an active void. All travel along wall to avoid rays.
// CC teleports behind odd facing; odd aim the cone out, evens prevent
// knockback on dash. Alpha Sword 18484 is reused, but this phase's Super
// Blassty Charge is 18883, NOT intermission 19279. Pair intervals are
// shorter (~2.7s charge -> next sword vs ~3.2s in intermission).
// BJ jumps 3 or 4 as #1 is hit, then aims five Apocalyptic Ray 18508
// pulses toward center. Jump baiter steps toward wall after landing;
// #1/#2 stay correctly placed so the center-pointed beam leaves room.
// BM's ray angle is provisional. Sacrament 18519: AP's 6s cast, 16y-wide
// cross; #3/#4 move along wall AWAY FROM AP after their hits to avoid it.
// WD warns to preserve facing while moving around the edge: a new odd
// facing can put CC on the wrong side and point the cone into the party.
//
// -- WORMHOLE: VOID OF REPENTANCE / CONFESSION --
// Void control 18534 creates TWO diagonally offset side puddles, near
// NW/SE or NE/SW rather than exactly on both cardinal points. Each needs
// one player in EACH of three successive checks: SIX correct soaks total.
// BM models radii 8 -> 6 -> 3y as they shrink. Candidate soak hits:
// first Repentance 18537, second 18536, third 18535. These reverse ID
// order is intentional. Unsoaked penalty Confession 18538 is raidwide.
// Soaks inflict short vulnerability, preventing immediate LC/soak overlap.
// NAUR / common PUG order, one number per side at each check:
//   5/6 soak FIRST near #3 sword, then move to original 1/2 NW/NE spots.
//   7/8 soak SECOND near #5 sword, then go to 3/4 SW/SE spots.
//   1/2 soak THIRD near #7 sword after their LC vulnerability expires.
//   3/4 never soak. After final soak, freed players gather center while
//   7/8 still finish their own attacks, then all eight take Heat stack.
// Stand toward wall inside puddle and use wall routes entering/leaving;
// cutting toward middle can cross both ray and Sacrament.
// Failure: missed puddle -> LOG SIGNAL: 18538; FAULT: assigned number on
// failed side only if number/side occupancy known; CONSEQUENCE: Raid.
// Failure: double/early soak or charge overlap -> LOG SIGNAL: extra soak
// recipients / LC plus Repentance during vulnerability; FAULT: early
// entrant or wrong assigned number if established; CONSEQUENCE: Major.
// Failure: mis-aimed sword/dash / wrong jump / ray / Sacrament / chakram
// -> LOG SIGNAL: corresponding 18484/18883/18506/18508/18519/18517 hits;
// FAULT: responsible baiter or entrant as proven, not automatically the
// victim; CONSEQUENCE: Minor/Major by result, Raid when sequence is lost.
// Removal: each correct check shrinks puddle, third deletes it; failed
// check triggers Confession. Short vulnerability expires, not dispelled.
// Numbered attacks on a dead target and resulting missing soaks are
// fallout if an earlier death already caused that missing assignment.
// Not errors: six intended Repentance hits, own sword/dash, planned jump
// hit, prevention, waiting outside center through #8 despite others moving.
//
// -- POST-WORMHOLE HEAT / ENUMERATIONS --
// Incinerating Heat 19025 is a 5s cast, ~5y stack on a random player:
// all eight gather. Missile Command 18509 only creates two three-person
// Enumeration marks here, NOT P2's mines/ice. Enumeration 18512 follows
// Heat; markers may appear immediately before Heat resolves.
// NAUR: marked DPS split W/E, BOTH healers help W, BOTH tanks help E;
// two unmarked DPS stay out. This is not P2's M1/phys flex grouping.
// Failure: missing Heat helpers -> LOG SIGNAL: lethal small 19025 split;
// FAULT: assigned absentee only if proven; CONSEQUENCE: Major; normal
// correctly shared damage belongs to mitigation. Enumeration wrong count
// -> LOG SIGNAL: 18512 penalty deaths; FAULT: missed helper/extra DPS/
// misplaced marked DPS if occupancy is settled; CONSEQUENCE: Major/Raid.
// Removal: stack resolves; Enumeration may deal no damage on success.
// Not errors: unmarked DPS deliberately absent from Enumeration, two
// Mega Holies on whole party following a clean split.
//
// -- SUMMON ALEXANDER / J WAVES / DIVINE JUDGMENT --
// Summon Alexander 19029 starts a distinct final check. CC SE casts
// Eternal Darkness 18549, 25s; BJ SW applies J Storm 18550 then repeated
// J Wave 18551, ~3s intervals with increasing Damage Up; AP protected
// until both die, casts Divine Judgment 18552, 75s [BM]. Kill CC first,
// then BJ to stop escalating Waves, then AP to stop the fatal cast.
// J Wave count is kill-dependent; CB displays a 16-wave reference train,
// not a required count or a pass/fail threshold. No fixed wave number is
// intrinsically an individual error. Spend healing/mitigation accordingly.
// AP reaching its defeat threshold produces success action 18553, then
// giant Alexander uses transition raid damage 18554. Tank LB3 + shields /
// other mitigation cover this unavoidable hit; normal cue is countdown 3.
// CB calls its 0x4879 (18553) sync "Divine Judgment Enrage", while BM
// calls that action the SUCCESS event. A timeline label is not proof of
// failure: 18552 completion, 18553 success, 18554 normal transition must
// be distinguished in the actual log. The success sync permits large
// timing variation; later P4 timings are therefore not fixed pull offsets.
// Failure: CC/AP deadline -> LOG SIGNAL: completed fatal 18549/18552
// and wipe result; FAULT: collective unless concrete root cause proven;
// CONSEQUENCE: Raid. Begincast alone is expected and not an enrage failure.
// Failure: late BJ kill -> LOG SIGNAL: escalating 18551 casualties;
// FAULT: no named player from damage taken alone; CONSEQUENCE: mitigation
// concern / Raid only when survival is no longer possible.
// Failure: absent/mistimed required LB -> LOG SIGNAL: 18554 with no
// covering tank LB3 aura/cast and raid loss; FAULT: named tank only if
// assigned, alive and LB available; CONSEQUENCE: Major + Raid if proven.
// Removal: BJ defeat stops Waves; CC defeat stops its cast and AP loses
// protection when both are defeated. Scripted transition stun/Down for
// the Count and cinematic inactivity are expected, not player deaths.
//
// -- STRATEGY VARIANCE AND NON-ERRORS --
// Stasis can be debuff-fixed east/west (NAUR Christmas-right/nothing-left)
// or boss-relative, e.g. always close pair at BJ / unmarked at CC [IV].
// Far tethers can have fixed support/DPS sides or FFA. These change who
// baits the third sword; they are not interchangeable attribution plans.
// Inception tanks+Shared can go left (NAUR/OCE) or right (IV) facing Heart;
// the other group takes the opposite safe side. Both satisfy the puzzle.
// Wormhole can be described in true north (AP S, odd W) or rotated 180
// degrees with AP as relative N (odd relative E, evens relative W).
// US says "Alex north, evens left, odds right"; this describes the SAME
// geometry, not a reversal of NAUR's true-coordinate plan. Different
// actual routes exist, but exact uninspected routes are not asserted here.
// Tank fire order, jump tank, paired buster invulns and healing plan vary.
// Expected damage includes successful tether checks, Severity/Solidarity,
// crystal proximity bursts, orb intercepts, assigned cones/soaks, Heat,
// Holy, J Storm/Waves and properly mitigated transition Judgment.
//
// -- WHAT ENDS A PULL / OPEN QUESTIONS FOR LOG VERIFICATION --
// Confession, overlapping orb penalty, destroyed numbered/soak sequence,
// lost required crystal setup or completed final enrage normally ends
// standard progression. Failed Codex visibility and individual deaths
// need their actual remaining state assessed, not automatic blanket cutoff.
// 1. Map Plaint variants, resistance debuffs, all penalties and Damage
//    Down; settle close/far and cone/collision thresholds with clean/fail
//    samples and confirm which assignment/actor/facing streams exist.
// 2. Heart four-crystal count, good/bad Tetrashatter distinction, orb
//    weakening, overlap test, death retarget/removal behavior and Codex
//    persistence/reapplication after death/raise.
// 3. Confirm Stasis far-pair convention, fire order, jump tank and the
//    exact Inception sides; frame changes must be recorded with slots.
// 4. Wormhole icon availability, dead numbered targets, puddle centers,
//    true soak radii, exact vulnerability duration, damage shares and
//    unsoaked Confession timing. Confirm six hits vs three time steps.
// 5. Tank LB3 coverage, final cast begin/end/interrupt IDs, 18553 success,
//    18554 transition source, J Wave scaling and kill-dependent anchors.
