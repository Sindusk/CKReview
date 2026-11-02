// lib/mechanics/ffxiv/dsr/dragon-king-thordan.ts
//
// -- DIGEST --
// DSR Ultimate P7: alternate Exaflare, Akh Morn and Gigaflare with paired
// Trinity autos. Spread tower groups correctly, rotate closest-player auto
// baits and tanks, dodge in/out and proximity hits. Three sets of lethal
// enrage towers are a planned sacrifice, not nine ordinary missed soaks.
// Sections: "-- SCOPE AND SOURCES --", "-- SHAPE AND CLOCK --",
// "-- MECHANICS --", "-- PULL ENDERS --", "-- STRATEGY AND NOT ERRORS --",
// "-- OPEN QUESTIONS --". Signals guide-derived, not log-verified.
//
// -- SCOPE AND SOURCES --
// Ultimate. Checked 2026-11-02:
// https://consolegameswiki.com/wiki/Dragonsong%27s_Reprise_(Ultimate)
// https://www.icy-veins.com/ffxiv/dragonsongs-reprise-ultimate-guide-for-dragonking-thordan
// https://naurffxiv.com/ultimate/dsr
// https://raw.githubusercontent.com/quisquous/cactbot/main/ui/raidboss/data/06-ew/ultimate/dragonsongs_reprise_ultimate.txt
// Released 6.11; the official 7.0 freeze fix 2024-07-02 is linked in P1.
// No other numeric change established. Gear/jobs affect checks and pushes.
// All IDs below are candidate hexadecimal network IDs, not verified FFLogs
// event types. Out-of-phase events with similar names must be separated.
//
// -- SHAPE AND CLOCK --
// Requires saved Haurchefant, spared P5 Thordan, and both dragons killed.
// Resentment, Shockwave/bleed (71E4) and Alternative End (7438) precede
// targetability. Relative to Shockwave: Alternative End ~0:16; targetable
// ~0:25; Exaflare ~0:36; Akh Morn ~0:57; Gigaflare ~1:24; Exaflare 2
// ~1:55; Akh Morn 2 ~2:16; Gigaflare 2 ~2:43; Exaflare 3, Akh Morn 3,
// then Morn Afah's Edge enrage. Two Trinity autos follow each Edge cast.
// Each is a timed sequence; victory on boss death can end it early.
//
// -- MECHANICS --
// TRANSITION: Resentment and Shockwave/bleed followed by Alternative End
// are unavoidable raid damage; mitigate/heal. LOG SIGNAL: deaths to these
// attacks; FAULT: insufficient mitigation/healing is a group-plan question,
// not automatically any individual; CONSEQUENCE: Raid if party collapses.
// DoT expiry is natural; transition damage is not an avoidable hit.
//
// TRINITY (6D9E controller; 6D9F highest enmity, 6DA0 second, 6DA1 nearest
// candidate damage): three small AoEs, twice after each Edge. Highest enmity
// gains Dark Resistance Down, second gains Light Resistance Down, nearest
// gains both plus Physical Vulnerability Up. Tanks swap enmity during Edge
// casts; two other players rotate nearest hits. Consecutive nearest hits on
// a physically vulnerable player are lethal; repeated tank element stacks
// raise damage. LOG SIGNAL: recipient identity, resistance stacks, duplicate
// hits and death; FAULT: nearest bait/position or tank swap only when enmity
// and assignment demonstrate it; CONSEQUENCE: Major on death, Raid on
// collapse. One hit per intended recipient is normal. Debuffs expire.
//
// FLAMES OF ASCALON (6D91) / ICE OF ASCALON (6D92): fire swords indicate
// point-blank attack (move out), ice indicate donut (move in). Accompanies
// each Edge. LOG SIGNAL: associated avoidable hit, likely Damage Down or
// death; FAULT: victim if movement was possible; CONSEQUENCE: Minor on
// survivable damage, Major on death, Raid on resulting collapse. Exact
// penalty/status and whether sword cue appears in FFLogs unverified.
//
// EXAFLARE'S EDGE (6D9B controller, 69DC initial / 6D9D later candidates):
// three starting circles each send moving explosions along indicated lines;
// avoid initial and subsequent positions after in/out resolution. LOG SIGNAL:
// Exaflare damage/death; FAULT: hit player, except a forced movement cause
// must be considered; CONSEQUENCE: Major on death, Raid if group collapses.
// Static movement and one-movement uptime strategies are both valid; a
// particular location alone is not evidence of failure.
//
// AKH MORN'S EDGE (69D3/6D93 controller; 730C/730D red first hits, 730E
// blue first, 6D96/6D97 subsequent candidates): three towers: two red
// groups of three and a blue group of two tanks. They hit 5, 6, then 7
// times on successive occurrences, shared damage requiring mitigation.
// Empty tower -> raid explosion; an undersized tower may instead deal more
// split damage, so do not treat recommended 3/3/2 as a proven hard minimum.
// LOG SIGNAL: tower target count and damage per hit, empty-tower penalty,
// death; FAULT: assignment unknown without group plan and position;
// CONSEQUENCE: Raid for empty explosion, Major for caused death. A common
// plan uses tank invulnerability for blue; legitimate alternatives exist.
// Each repeated hit and successful tower is expected.
//
// GIGAFLARE'S EDGE (6D99 controller, 6D9A/6DD2/6DD3 proximity hits):
// three proximity explosions plus fire/ice in/out. Distance from each
// blast determines damage, guide estimates ~21 yalms for safe falloff;
// resolve position against all blasts. LOG SIGNAL: high proximity damage
// or death; FAULT: affected player only if actual origin, snapshot and
// distance show avoidable proximity; mitigation alone cannot prove blame.
// CONSEQUENCE: Major on death, Minor for avoidable survivable excess.
// Three ordinary reduced-damage hits are expected.
//
// MORN AFAH'S EDGE: after third Akh Morn and Trinity pair, three sets of
// three towers appear; each kills its soaker, and an empty tower wipes the
// raid. With eight players, all nine cannot be covered. Standard extension
// sacrifices three players in each of the first two sets, leaves the last
// empty while remaining damage dealers finish the boss. LOG SIGNAL: tower
// death and empty-tower raid hit; FAULT: raid damage check, not the intended
// sacrificers; CONSEQUENCE: Raid when enrage actually makes victory
// impossible. If boss dies during enrage, sacrifice deaths are expected.
// Penalty ID, exact timings and whether kills resolve after boss death are
// unverified. Death order and tower placement may vary by strategy.
//
// -- PULL ENDERS --
// Morn Afah's Edge is the hard enrage; empty normal Akh Morn tower, repeated
// Trinity or Exaflare deaths and group collapse can end the pull earlier.
// An enrage cast alone is not necessarily failure if the boss dies during
// planned sacrifice towers. Identify the actual wipe/cutoff event.
//
// -- STRATEGY AND NOT ERRORS --
// Common nearest Trinity order: two melee, two ranged, two healers; tanks
// swap each Edge. Other jobs, orders, tank invulnerability, Exaflare dodge
// paths and enrage sacrifices are valid. Shared damage, raidwide pulses and
// intended tank/nearest hits are normal; no static assignments supplied.
//
// -- OPEN QUESTIONS --
// 1. Verify FFLogs IDs and targets for all three Trinity attacks, stack
//    debuffs, tower first/subsequent hits and empty-tower penalties.
// 2. What are tower minimums, split damage and invulnerability interactions?
// 3. Which sword/Exaflare telegraphs and positions are represented in logs?
// 4. Verify Gigaflare falloff, enrage tower timings, deaths, and kill cutoff.
