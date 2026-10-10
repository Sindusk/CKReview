// lib/mechanics/ffxiv/fru/oracle-of-darkness.ts
//
// -- GUIDE-DERIVED MODEL: ORACLE OF DARKNESS (FRU PHASE 3) --
// Futures Rewritten (Ultimate), patch 7.11 origin; checked 2026-10-09.
// Comments only. No real reports checked; ALL proposed log signals and
// attribution are guide-derived hypotheses. Shared contract: fatebreaker.ts.
// Previous module owns Ice Veil. roomates.ts owns subsequent duo phase.
// Baseline WTFDIG NAUR; LPDU/MUR mechanics choices documented separately.
// Damage Down/Mark of Mortality -> Major when root player proven; Raid is
// first inevitable wipe. Unknown assignment or clipped victim is not fault.
//
// -- SOURCES --
// [N] Tvnariea Reksane's original NAUR mechanic explanation:
//     https://naurffxiv.com/ultimate/fru/guide/p3
// [U] Original NAUR Relativity slides, all 20 inspected:
//     https://tinyurl.com/lesbin-ur
// [A] Original NAUR static-spread Apocalypse diagrams:
//     https://raidplan.io/plan/gU44027CtpmKs-sC
// [L] LPDU's own current assignments, sourced from Fijou:
//     https://lpdu.net/fru/p3/
//     https://raidplan.io/plan/OCGsXXXpUHCT5QiH
// [MU] MUR original Relativity plan, both Y orientations inspected:
//      https://raidplan.io/plan/oYnDQe4ZbVaoxA5r
// [MA] MUR LP-priority Apocalypse plan, updated Em:
//      https://raidplan.io/plan/LZwXKA645GGmjEO2
// [I] Tor's original guide, 2024-12-06:
//     https://www.icy-veins.com/ffxiv/futures-rewritten-ultimate-guide-for-phase-3-oracle-of-darkness
// [C] Original Cactbot timeline; ACT/game IDs, unverified FFLogs mapping:
//     https://github.com/OverlayPlugin/cactbot/blob/main/ui/raidboss/data/07-dt/ultimate/futures_rewritten.txt
// No mechanic-changing hotfix established. U revised G1 flex and rewind
// placements after release; old generic priorities need not match NAUR.
// N's debuff table appears to mislabel the two short-fire DPS as Shadoweye;
// its prose and U/I instead assign them Eruption. Prose/U model used here.
//
// -- PHASE SHAPE, GATE AND CLOCK --
// Ice Veil defeat, Junction and ~27s transition precede Gaia targetability.
// Full uptime, one Relativity then one six-wave Apocalypse. No energy bar.
// Circular deathwall. HP must be BELOW 20% by Memory's End completion;
// passing gives raid damage and P4, failing is lethal enrage (Raid).
// Approximate offsets from first targetability [C], cast starts earlier:
// 00:04 Judgment; 00:18 Relativity; 01:06 Shell; 01:22 Black Halo;
// 01:50 first Water; 02:04 Eruption; 02:12 Dance; 02:38 Memory's End.
// P4 Shiva appears N/S opposite Gaia's final side; E/W boundary choice can
// be ambiguous. Phase anchor events supersede whole-pull timestamps.
// Hell's Judgment reduces HP to ~1, ignoring shields/mitigation. Heal for
// next raidwide; it is expected damage, not a mitigation failure. Max-HP
// buff expiring between snapshot/damage can kill [N]; cause needs a trace.
//
// -- ULTIMATE RELATIVITY: DEBUFF ASSIGNMENT [U, MU] --
// Raidwide; seven Spell-in-Waiting: Dark Fire III and one Dark Blizzard III.
// Role template (one short support OR long DPS replaced by 20s Blizzard):
// Supports: two 30s fires, one 20s fire, one 10s fire/20s Blizzard.
// DPS: two 10s fires, one 20s fire, one 30s fire/20s Blizzard.
// Supports 30s and long DPS: 26s waiting Return + 43s Shadoweye (three).
// DPS 20s: 16s waiting Return + 43s Water (one).
// Other supports/DPS: 16s waiting Return + 43s Eruption (four).
// Three separate Unholy Darkness marks resolve at 10/20/30s, on players
// whose fire/ice does not share that timer. Blizzard is a centered donut;
// its holder stays with stack at 20s, not out with a fictitious fire.
// Fires spread beyond assigned light. Others soak Unholy: MINIMUM five,
// usually five or six. Too few gives Mark of Mortality; extra sixth is valid.
// Failure: overlapping fire/ice donut -> LOG: extra elemental damage under
//   magic vuln or penalty/death; FAULT: misplaced carrier if snapshot proves
//   it, not every victim; CONSEQUENCE: Major on death/penalty.
// Failure: small Unholy -> LOG: fewer than five living recipients + Mark;
//   FAULT: missing assigned helper if known; CONSEQUENCE: Major/Raid.
// Removal: waiting spell expiry casts its attack; death/early removal can
// change planned counts. Exact death-triggered behavior remains unverified.
// Not errors: own fire, correct donut/Unholy, initial raidwide.
//
// -- RELATIVITY: EIGHT HOURGLASSES AND REGIONAL PRIORITIES [MU, U, L] --
// Eight Delight's Hourglass on principal directions. Speed assigns three
// yellow (first), three untouched (second), two purple (third); Y is random
// rotation. Relative N is gap between two yellow arms, lone yellow S.
// Long supports NW/NE, long DPS/Blizzard S; short DPS SW/SE, short support/
// Blizzard N; medium support W, medium DPS E. Reversing relative N requires
// reversing directions AND priority; one rotated frame is not a mistake.
// NAUR: healer prefers NW, tank NE; ranged SW, melee SE. Doubled job-role:
// G1 adjusts for G2 (H1 to NE, MT to NW, R1 to SE, M1 to SW).
// LPDU/MUR balls-N priorities: H1,MT,OT,H2 NW->NE; R1,M1,M2,R2 SW->SE.
// Example H2+MT long: NAUR H2 NW/MT NE; LPDU/MUR MT NW/H2 NE. This
// distinguishes plans; a lone mixed pair can otherwise fit several labels.
// Sinbound Meltdown nearest-player beam: bait initial shot across center,
// then retreat around own light opposite indicated spin. Ten shots rotate
// over ~120 degrees; follow-ups are avoidable, including during rewind.
// Yellow lights bait at ~16s by long cohort; untouched at ~26s by short;
// purple at ~36s by medium. These are offsets from debuff application.
// Failure: beam repeats/stray ray -> LOG: follow-up Meltdown damage/penalty;
//   FAULT: mover or misplaced initial aimer if source/ray known;
//   CONSEQUENCE: Major on penalty/death. One intended initial bait is normal.
// Failure: wrong light ownership -> LOG: same nearest player hit by two
//   beams, or bad initial direction clipping others; FAULT: controller if
//   frame/priority and actor coordinates establish it; CONSEQUENCE: Major.
// Not errors: target selection by initial bait and independent beam spins.
//
// -- RETURN SNAPSHOTS, STUN AND DELAYED RESOLUTION [N, I, U] --
// Waiting Return expiry at 16/26s records location, then applies actual
// Return for 24/14s. All rewind at ~40s with 4s Stun; delayed effects at
// ~43s resolve while immobile. Facing is NOT recorded with the location.
// Water snapshot near center on E ray; three eyes spaced near center on
// NW/NE/S rays. Four Eruptions outside near own light; W medium support
// must snapshot just INSIDE its light to escape later rotating beam.
// Sequence: short fires/Unholy -> yellow baits + short snapshots -> medium
// fires/ice/Unholy -> untouched baits + long snapshots -> long fires/Unholy
// -> purple baits -> face outward -> rewind -> Water/eyes/Eruptions.
// Water + three eyes form four-player stack. Eyes cannot gaze each other;
// everyone faces outward before Stun, including nearby eye holders.
// Failure: bad snapshot -> LOG: post-rewind Eruption overlap, Water Mark or
//   Meltdown death; FAULT: snapshot placer if location data establishes it;
//   CONSEQUENCE: Major; Raid on unrecoverable multi-kill.
// Failure: gaze -> LOG: Shadoweye death/Petrification if present; FAULT:
//   viewer with proven facing, or misplaced eye clipping assigned viewer;
//   CONSEQUENCE: Major. Damage alone cannot prove whose facing was wrong.
// Removal: actual Return expiry moves/stuns, not cleanse. Death removals do
// not prove snapshot success. Spell-in-Waiting and resolving attacks may
// have separate IDs reused by P4; phase-scoped interpretation is essential.
// Not errors: forced teleport/Stun and correct four-player Water hit.
//
// -- SHELL CRUSHER, PULSAR, BLACK HALO [I] --
// Shell Crusher random-player whole-party stack; Shockwave Pulsar raidwide.
// Black Halo aggro-targeted shared tank cone: both tanks mitigate away from
// party, or established solo mitigation/invuln strategy. It is not two
// mandatory distinct busters. Pulsar repeats after Apocalypse.
// Failure: wrong cone/stack -> LOG: non-tank Halo damage, small Shell deaths;
//   FAULT: controller/missing helper if established; CONSEQUENCE: Major on
//   death. Expected stack/buster/raidwide damage is never an error alone.
//
// -- SPELL-IN-WAITING REFRAIN: THREE WATER PAIRS [A, MA, L] --
// Six players receive two each of 10/29/38s Water, two have none. Each four
// must have ONE of each timer and one none; none/none is also a duplicate.
// NAUR initially supports W / DPS E in boxes. Duplicates swap using MT,OT,
// H1,H2 support and M1,M2,R1,R2 DPS priority; higher priority moves.
// NAUR STATIC SPREADS: flex for first Water, return to original role spread
// locations for Spirit Taker/Eruption, then re-flex for second/third Water.
// Supports use safe red/purple sector, DPS yellow/blue; G1 left/G2 right
// facing middle. Near positions within safe pizza rays, far 2.5 wall notches
// outside; maintain individual spacing. This return is intentional.
// LPDU initially supports NW / DPS SE; same role swap priorities but KEEP
// flexed group and inherit swapped player's spread location throughout.
// Its Spirit Taker tank/melee spots MT A, OT D, M1 C, M2 B.
// MUR initially LP1 W / LP2 E, not support/DPS groups. Equal-status pairs
// use H1,R1,M1,MT,OT,M2,R2,H2 ordering W->E; keep flexed groups/spots.
// Two or four flexes can be valid. No flex needed with balanced timers.
// Failure: duplicated/missing stack -> LOG: overlapped Waters under magic
//   vuln or undersoak Mark; FAULT: wrong flex/missing helper if assignment
//   and original timers prove it; CONSEQUENCE: Major/Raid.
// Not errors: three paired Water resolutions; NAUR temporary return or
// LPDU/MUR permanent flex, even though those movements differ visibly.
//
// -- SIX APOCALYPSE WAVES, SPIRIT TAKER AND DARKEST DANCE [A, MA] --
// Two opposite lights start at cardinal/intercardinal and rotate CW/CCW;
// two more originate center and follow. Read start and direction: initial
// safe sector one marker opposite rotation. Six explosion waves, Eruption
// spreads coincide with second; move inward after Eruption for next waves.
// Spirit Taker random-target jump before explosions: spread in boxes, not
// a stack. Nearby non-target is knocked toward wall; root is bad spacing.
// Second Water near center precedes Darkest Dance farthest-player buster.
// Assigned tank (NAUR OT) baits next safe wall sector ~90 degrees from light
// origin; Gaia jumps there then knocks everyone outward. Follow without
// standing in buster. Final Water groups take left/right facing Gaia and
// meet after knockback; gap close is valid, leaving ranged behind is not.
// Failure: explosion/Eruption overlap -> LOG: Apocalypse damage/Damage
//   Down or doubled spread; FAULT: mover/overlap controller if established;
//   CONSEQUENCE: Major, not automatic blame on displaced victim.
// Failure: wrong farthest/wall bait -> LOG: Dance on non-tank, buster clip,
//   knockback wall death; FAULT: far-bait controller or player farther than
//   tank if position snapshot known; CONSEQUENCE: Major, Raid if terminal.
// Failure: missed final Water -> LOG: Mark/death after knockback; FAULT:
//   assigned helper who failed to reunite if proven; CONSEQUENCE: Major.
// Not errors: tank Dance, knockback, expected Water and Pulsar. No enrage
// blame to a player solely because boss HP misses its damage check.
//
// -- OBSERVABILITY AND OPEN LOG-VERIFICATION QUESTIONS --
// Candidate C action hex: 9D54 fire damage, 9D56 eye damage, 9D55 Unholy,
// 9D4F Water, 9D2B initial Meltdown ability. These are not verified FFLogs
// IDs; repeated damage/controller names and P4 reuse need separate mapping.
// 1. Do successful UR mixed/doubled role pairs distinguish NAUR role/G1
//    adjustment from LPDU/MUR priority? Are Speed endpoints/light centers
//    available to infer the relative frame without animation or facing?
// 2. Can Apoc stack recipients plus intermediate damage positions show
//    NAUR return-to-role vs retained flex, and role-group vs MUR LP start?
//    Balanced pulls cannot settle swap priority. Mixed presets are valid;
//    Strategy needs compatible/unknown candidates and explicit override.
// 3. Resolve all cast/damage/status IDs, especially same-name waiting vs
//    resolution, initial vs follow-up beam, gaze, split-stack penalties.
//    Verify N's table discrepancy, Mark stacking threshold and exact timers.
// 4. Does a carrier dying trigger each delayed Fire/Water/Unholy/Return/eye
//    early, cancel it or retarget? Which event marks first inevitable loss?
//    A death-time status removal alone does not answer this.
// 5. Are rewind-location samples and facing available? Measure beam/eruption
//    geometry, stun timing, enrage rez-invulnerability bypass and reset
//    signatures. Distinguish snapshot mistake from earlier mis-aimed beam.
