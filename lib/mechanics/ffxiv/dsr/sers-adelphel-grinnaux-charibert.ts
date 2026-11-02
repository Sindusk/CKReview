// lib/mechanics/ffxiv/dsr/sers-adelphel-grinnaux-charibert.ts
//
// -- DIGEST --
// DSR Ultimate P1: paired knights, portals and chains, then the first
// Planar Prison/Charibert sequence. Failures include missed interrupts,
// bad portal placement, overlaps, unbroken chains, missed baits and enrage.
// The first Haurchefant death is scripted; the later replay is a different
// phase. Community role positions are examples, not known assignments.
// Sections: "-- SCOPE AND SOURCES --", "-- SHAPE AND CLOCK --",
// "-- MECHANICS --", "-- PULL ENDERS --", "-- STRATEGY AND NOT ERRORS --",
// "-- OPEN QUESTIONS --". All signals below are guide-inferred.
//
// -- SCOPE AND SOURCES --
// Ultimate, level 90 synced. Checked 2026-11-02:
// https://consolegameswiki.com/wiki/Dragonsong%27s_Reprise_(Ultimate)
// https://www.icy-veins.com/ffxiv/dragonsongs-reprise-ultimate-guide-for-the-vault-phase
// https://www.thepfstrat.com/u/dru
// https://raw.githubusercontent.com/quisquous/cactbot/main/ui/raidboss/data/06-ew/ultimate/dragonsongs_reprise_ultimate.txt
// Official release in 6.11: https://na.finalfantasyxiv.com/lodestone/topics/detail/f525c780b9abdb74c5b664f799dd16ff9de9c7b1
// A 7.0 freeze-mechanic bug was fixed July 2, 2024:
// https://na.finalfantasyxiv.com/lodestone/news/detail/d6a632f3c438f8ef92954f30af4d3cb1b79af011
// No other DSR-specific numeric change established. Gear/job changes can
// alter pushes; old guides are not current DPS thresholds. IDs below are
// hexadecimal network ability IDs, candidate event types, not verified in
// FFLogs; all failure signals and consequences require real-log checks.
//
// -- SHAPE AND CLOCK --
// Adelphel and Grinnaux together; reduce both before the timed soft enrage.
// Approximate elapsed ability resolutions: Holiest of Holy 0:10, Empty
// Dimension and Shield Bash 0:23, Bladedance 0:25, Heavensblaze 0:28,
// Slash waves 0:45/0:52, Faith Unmoving 1:00, Execution 1:09, chains
// and Heavensflame 1:26-1:28, dimension 1:44, Steel buffs 2:07.
// After both knights are defeated, a scripted prison phase starts. Prison
// is not a checkpoint skip in the same pull; later pulls may start at the
// checkpoint after the door. Pure of Heart resolves ~36s after prison.
//
// -- MECHANICS --
// HOLIEST / BUSTER / HEAVENSBLAZE (62D4, 62D1, 62D2, 62DD damage).
// Raidwide, then Empty Dimension donut (62DA), transferable Bash tether,
// distance-scaled charge/stun and multi-hit cleave, plus a shared fire hit.
// Tank intercepts tether, stands away and mitigates/invulns; raid shares
// Heavensblaze and avoids cleave. Full Dimension 62DB instead is point blank.
// Failure -> LOG SIGNAL: dimension damage or extra Bash/Bladedance victims;
// FAULT: victim or tether holder if placement proven; CONSEQUENCE: Minor if
// survived, Major if death, Raid if party collapses. Missing mitigation or
// a small share alone does not identify fault. Auras expire; no dispel known.
//
// HYPERDIMENSIONAL SLASH (62D7 damage), PORTALS, BRIGHT FLARE, EXECUTION.
// Four marked players bait lines, four unmarked share the opposite cone;
// swap for the second set. Eight portals persist at the edge. Separate
// portals and keep them out of the later cardinal zigzag of Adelphel's
// Shining Blade/orbs. Portals too close to each other or to those orbs
// explode; standing near a portal can tether and cause Damage Down.
// Bad bait -> LOG SIGNAL: multiple hits/vulnerability or portal explosion;
// FAULT: baiter only if portal position and safe alternatives are known;
// CONSEQUENCE: Major on death, Raid on raid-wiping collision. Penalty ID
// unknown. Adelphel then targets highest enmity with Execution (62D5):
// tank isolates; extra victims die. FAULT: baiter or victim depends on
// positions; do not infer solely from a victim's hit.
//
// HOLIEST HALLOWING (62D0 begincast): interrupt each of three casts or
// the knights regain substantial HP (guide says 50%). LOG SIGNAL: cast
// completes/healing versus interrupted cast; FAULT: interrupt assignment
// external, so player-less unless established; CONSEQUENCE: potentially
// Raid if it causes the Steel timer, otherwise contextual. Reused cast
// names alone do not prove a missed interrupt. No debuff removal involved.
//
// HOLY CHAIN / FAITH UNMOVING / HEAVENSFLAME (62DC, 62DE damage).
// Four symbol-matched pairs separate enough to break Burning Chains; the
// knockback helps but can be immuned. Then all eight spread personal fire
// AoEs; Fire Resistance Down II makes overlapping hits deadly. Chain
// expiration without breaking -> LOG SIGNAL: chain penalty/damage on both;
// FAULT: pair unless movement proves one; CONSEQUENCE: Major on death,
// Raid if unrecoverable. Spread overlap -> LOG SIGNAL: multiple fire hits
// and resistance down on victim; FAULT: placement only if provable.
//
// PLANAR PRISON / BRIGHTWING / PURE OF HEART (62E1, 6319, 631A, 62E4).
// Everyone is confined; exiting Planar Imprisonment kills. Charibert is
// attackable while casting ~36s Pure of Heart; reduce HP to ~30% or lower
// and mitigate. Four Brightwing casts hit two nearest players each, applying
// Light Resistance Down and Skyblind; each drops a delayed invisible AoE
// ~5s later. Rotate four pairs, bait outward, move off drops. Haurchefant
// intercepts the spear and dies in this first history. His Shockwave pulses
// until then. LOG SIGNAL: Brightwing repeated on resistant target or other
// victim; Skyblind lethal damage; Pure of Heart raid deaths. FAULT: marked
// baiters or pair only if positions/rotation establish it; CONSEQUENCE:
// Major on death, Raid for lethal Pure. Skyblind expires; death behavior
// and exact HP threshold remain unverified. Spear here is not a failed save.
//
// -- PULL ENDERS --
// Steel grants both knights invulnerability, full HP and damage up if not
// defeated in time. Portal collisions, lethal Pure of Heart, or a prison
// collapse commonly end the run. Arena edge kills; a group of deliberate
// falls after a called wipe is not independent player blame.
//
// -- STRATEGY AND NOT ERRORS --
// Common PF: first marked slash group north, second south; paired roles
// bait prison cleaves healer, melee, ranged, tank, alternating puddle sides.
// Other safe placements, immunities and rotations work. Tank invulnerability,
// correct shared fire, normal raid pulses and scripted Haurchefant death are
// expected. A checkpoint pull need not contain the opening knights.
//
// -- OPEN QUESTIONS --
// 1. Which FFLogs IDs identify each cast, portal explosion, chain and drop?
// 2. How are prisoner/phase boundaries and checkpoint pulls represented?
// 3. What are Pure of Heart's actual HP/damage threshold and death behavior?
// 4. Are interrupt actors, tether transfers and portal positions recorded?
