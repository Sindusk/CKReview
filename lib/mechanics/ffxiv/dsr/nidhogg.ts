// lib/mechanics/ffxiv/dsr/nidhogg.ts
//
// -- DIGEST --
// DSR Ultimate P3: Dive from Grace assigns jumps in 3/2/3 waves, generating
// towers for other players; stack/in-out attacks and Geirskogul overlap.
// Four enumerated towers and two tank tethers follow. Missing towers is a
// raid failure; spread and bait attribution needs markers and positions.
// Sections: "-- SCOPE AND SOURCES --", "-- SHAPE AND CLOCK --",
// "-- MECHANICS --", "-- PULL ENDERS --", "-- STRATEGY AND NOT ERRORS --",
// "-- OPEN QUESTIONS --". All signals are guide-inferred, not log-verified.
//
// -- SCOPE AND SOURCES --
// Ultimate. Sources checked 2026-11-02:
// https://consolegameswiki.com/wiki/Dragonsong%27s_Reprise_(Ultimate)
// https://www.icy-veins.com/ffxiv/dragonsongs-reprise-ultimate-guide-for-nidhogg
// https://ultimates.guide/dsr/
// https://raw.githubusercontent.com/quisquous/cactbot/main/ui/raidboss/data/06-ew/ultimate/dragonsongs_reprise_ultimate.txt
// Released in 6.11; gear and balance affect phase pushes. The 7.0 freeze
// bug was fixed 2024-07-02; see official notice in P1. No phase-specific
// numerical hotfix established. IDs are hexadecimal, candidate network
// events; FFLogs IDs and event types require verification.
//
// -- SHAPE AND CLOCK --
// Fixed script from Final Chorus: Dive from Grace ~0:18, jump waves at
// ~0:28, 0:38, 0:49, interleaved stacks/in-out, towers and lines. First
// Drachenlance ~1:08, four towers ~1:15, double tethers ~1:22, second
// Drachenlance ~1:46; Revenge of the Horde resolves ~1:59 if not killed.
// Actual transition from P2 depends on defeat, so pull offsets vary.
//
// -- MECHANICS --
// FINAL CHORUS (6709 damage): unavoidable transition raid hit; mitigate.
// Nidhogg is stationary but faces the enmity holder; autos cleave. An extra
// auto victim -> LOG SIGNAL: auto damage to non-tank; FAULT: tank if bad
// facing is proven, otherwise unknown; CONSEQUENCE: Major if death.
//
// DIVE FROM GRACE (670D) / DARK HIGH JUMP (670E), DARK SPINESHATTER
// DIVE (670F), DARK ELUSIVE JUMP (6710): 3 players first, 2 second, 3
// third. Each jump lands on its marked player, leaving a tower ~3s later:
// circle at player, up arrow 10 yalms in front, down arrow 10 behind.
// Arrow pairs occur together in a numbered group; other marks are circles.
// Jump hit applies Fire Resistance Down II and Physical Vulnerability Up;
// other players caught in the jump are knocked back and killed. Drops must
// be placed for another numbered group; the jumper cannot immediately soak.
// LOG SIGNAL: jump damage to extra players, bad tower position or missing
// soak. FAULT: jumper if objectively misplaced, otherwise ambiguous;
// CONSEQUENCE: Major for death, Raid for a resulting empty tower. Number
// marks persist through phase; jump debuffs resolve/expire. Death before
// jump and whether markers remain visible in FFLogs are open questions.
//
// DARKDRAGON DIVE (candidate 6711/6717/6718/6719/671B): each jump tower
// needs one different player ~1.5s after appearing. A player with recent
// Fire Resistance Down II dies to another. Failure -> LOG SIGNAL: tower
// raid explosion, penalty ID unknown, or tower damage to resistant player;
// FAULT: unassigned if soak plan not known; CONSEQUENCE: Raid for explosion,
// Major for death. On success clone spawns and baits GEIRSKOGUL (670A) at
// nearest player; soaker normally turns it away from group. Unexpected line
// victims -> FAULT: baiter only if position proves their line, otherwise
// unknown; Major if killed. Successful tower and line bait are normal.
//
// GNASH AND LASH / LASH AND GNASH (6712/6713), EYE OF THE TYRANT (6714):
// stack followed by out/in or in/out, respectively. Eye is shared by the
// available group, typically five; wave players simultaneously resolve
// towers. Being hit by Gnashing/Lashing Wheel causes knockback and Damage
// Down. LOG SIGNAL: wheel damage/debuff or under-shared stack damage/death;
// FAULT: wheel victim; stack assignment external. CONSEQUENCE: Minor if
// survived, Major if killed, Raid on resulting wipe. Shared stack normal.
//
// DRACHENLANCE (670B): lethal random-facing frontal cone, second faces
// south per guide. LOG SIGNAL: cone damage/death; FAULT: victim if dodge
// possible; CONSEQUENCE: Major. Boss movement/facing is not an error itself.
//
// ENUMERATED TOWERS: four intercardinal towers, 1-4 pillars per tower,
// eight required soaks total, resolve ~5s after spawn. A tower with fewer
// than indicated explodes raid-wide. Four clone lines follow, except one
// clone supplies a tank tether. LOG SIGNAL: unsoaked explosion or fewer
// recipients than indicated; FAULT: player-less without known distribution;
// CONSEQUENCE: Raid. Community anchors ranged/healers and flexes tanks/melee
// based on clockwise/counterclockwise priority; this is one plan only.
//
// SOUL TETHER (671C): boss and one clone tether random players; tanks take
// the transferable tethers and separate AoE busters, mitigate or invuln.
// LOG SIGNAL: non-tank target or extra buster victims/deaths; FAULT: unknown
// without the intercept assignments and positions; CONSEQUENCE: Major on
// death, Raid if collapse. Tethers naturally resolve; passing is intentional.
//
// -- PULL ENDERS --
// Revenge of the Horde (7436) is timed enrage. Empty jump/enumeration
// towers, multiple jump collisions or tether deaths commonly wipe. Arena
// edge/fall or knockback can kill without an informative killing ability.
//
// -- STRATEGY AND NOT ERRORS --
// Common East/West or Westhogg arrow orientation and tower flex priorities
// differ. Expected jump hits, tower hits, Eye stack, tank tether damage,
// Final Chorus and deliberate invulnerability are not errors. Limit break
// may be needed later; a held LB or phase damage is not a personal mistake.
//
// -- OPEN QUESTIONS --
// 1. Confirm jump target/status IDs, tower variants, requirements and empty
//    penalty, including whether placed-tower coordinates are logged.
// 2. How are markers, facing, line targets and tether transfers exposed?
// 3. What happens when a marked player dies before jump or during a tower?
// 4. Verify clock, stack share and auras against kill and failed-tower pulls.
