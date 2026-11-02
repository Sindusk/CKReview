// lib/mechanics/ffxiv/dsr/king-thordan-knights-twelve.ts
//
// -- DIGEST --
// DSR Ultimate P2: Strength and Sanctity knight sequences, followed by
// Ultimate End and a timed damage check. Avoid lines, cleaves, gazes,
// meteors and puddles; share stacks and take every tower. Tether and tower
// assignments are external. See "-- SCOPE AND SOURCES --", "-- SHAPE AND
// CLOCK --", "-- MECHANICS --", "-- PULL ENDERS --", "-- STRATEGY AND
// NOT ERRORS --", "-- OPEN QUESTIONS --". Guide-derived, not log-verified.
//
// -- SCOPE AND SOURCES --
// Ultimate, checked 2026-11-02:
// https://consolegameswiki.com/wiki/Dragonsong%27s_Reprise_(Ultimate)
// https://www.icy-veins.com/ffxiv/dragonsongs-reprise-ultimate-guide-for-king-thordan
// https://naurffxiv.com/ultimate/dsr
// https://raw.githubusercontent.com/quisquous/cactbot/main/ui/raidboss/data/06-ew/ultimate/dragonsongs_reprise_ultimate.txt
// Released 6.11; later job/gear changes alter damage and pushes. A 7.0
// freeze bug was fixed 2024-07-02 (official notice linked in P1). No
// additional numeric hotfix established. IDs are unverified hexadecimal
// network candidates; timings are approximate ability resolutions.
//
// -- SHAPE AND CLOCK --
// From first Ascalon's Mercy Concealed resolution (0:00): Might at 0:03,
// Strength at 0:17, Quaga at 0:58, Heel at 1:08, then Sanctity. Ultimate
// End precedes two Broad Swings and Aetheric Burst, at approximately 3:05
// after the first Mercy, if not defeated. Events follow a scripted sequence;
// Thordan locks at 1 HP until later mechanics; phase advance requires his
// defeat. Checkpoint start and kiting can disturb absolute pull offsets.
//
// -- MECHANICS --
// ASCALON'S MERCY CONCEALED (63C8), MIGHT (63C5), HEAVENLY HEEL (63C7).
// Eight baited lines must be spread; Might is a three-hit cleaving buster;
// Heel gives Slashing Resistance Down before the Might sequence. Tank swap
// or invulnerability; isolate the cleave. LOG SIGNAL: multiple line hits
// or extra buster victims, death following resistance down. FAULT: line
// position/baiter only if identifiable, or tank for a proven cleave;
// CONSEQUENCE: Minor for survivable avoidable hit, Major for caused death.
// Expected tank hits and mitigation are not errors; resistance expires.
//
// STRENGTH OF THE WARD (63D3), LIGHTNING STORM (63CC), SPIRAL THRUST
// (63D4), HEAVY IMPACT (63D6-63DA damage): three charging knights define
// safe lanes; dodge their lines and five expanding impact rings while
// spreading personal lightning then eight Mercy baits. LOG SIGNAL: hit,
// stun or Damage Down; FAULT: hit player unless another bait demonstrably
// caused overlap; CONSEQUENCE: Minor or Major on death, Raid if party dies.
//
// STRENGTH CONTINUED: three Skyward Leap markers (63DD), one unmarked
// non-tank Dragon's Rage split stack (63CE), two transferable Holy Shield
// Bash tethers followed by Bladedance, expanding Dimensional Collapse
// (63DB), and Conviction towers (63DF). Tanks intercept and separate
// tethers, marked players spread, remaining players share stack, then one
// player per tower. Empty tower -> LOG SIGNAL: raid explosion, penalty ID
// unknown; FAULT: assigned soaker unknown without strat; CONSEQUENCE: Raid.
// Stack or jump overlap -> LOG SIGNAL: unexpected target count, vulnerability
// and deaths; FAULT: unknown without positions/markers. Correct tower and
// stack damage is expected; short resistance debuffs expire naturally.
//
// SANCTITY: two simultaneous gazes, Thordan's Dragon's Gaze and the Eye's
// Dragon's Glory; face away from both. Sacred Sever hits two marked targets
// in sequence, split among two groups of four; distance from Zephirin
// reduces damage. Dodge knight dashes/orbs. LOG SIGNAL: gaze damage and
// Hysteria; FAULT: affected player, CONSEQUENCE: Minor or Major if death.
// Under-share -> high per-player damage/death; intended groups external,
// so FAULT may be unknown. Do not infer fault from stack damage alone.
//
// SANCTITY METEORS: two same-role Prey players each place seven Holy
// Comets while running opposite edges; colliding meteors cause Holy Impact
// raid wipe. Four Hiemal Storm pairs split initial ice hits, leave ice
// puddles; four Heaven's Stake fire puddles and edge fire constrain movement.
// Two Conviction tower sets require one player each; second includes Faith
// Unmoving knockback or immunity. LOG SIGNAL: Holy Impact, empty tower
// explosion, Frostbite/Burns or repeated ice hits; FAULT: meteor dropper,
// puddle victim or tower assignee only when placement establishes it;
// CONSEQUENCE: Raid for wipe, Major for resulting death. Ordinary meteor
// raid pulses, paired ice damage and knockback are expected. Puddles persist
// through this sequence; duration and death retargeting are unverified.
//
// ULTIMATE END (63??) is expected high raid damage; mitigation/healing
// required. Broad Swing (63C0/63C1) is three sequential thirds of the
// arena, twice: dodge behind then through cleared sector. LOG SIGNAL:
// Swing damage/knockback/Damage Down; FAULT: victim; CONSEQUENCE: Major
// if killed, otherwise Minor. Do not blame a healer for raidwide death
// without the plan and evidence.
//
// -- PULL ENDERS --
// Aetheric Burst 63C3 completion wipes if boss not defeated. Empty towers,
// meteor collisions and severe stacked failures usually end the pull.
// Falling or knockback into the lethal edge can be an ability-less death.
//
// -- STRATEGY AND NOT ERRORS --
// PF variations choose different safe lanes, light-party positions, tether
// and meteor priorities and knockback immunity; no single compass plan is
// established for this group. Taking shared damage and tower soaks is
// correct; phase-specific enrage, not a player death, owns a DPS failure.
//
// -- OPEN QUESTIONS --
// 1. Which FFLogs IDs and source instances distinguish tower successes and
//    penalties, orb/meteor collisions, gaze, ice, fire and line hits?
// 2. Are head markers, knockback, tether transfers and gaze facing logged?
// 3. What are actual phase-relative times and the effects of early pushes?
// 4. Can cause of a failed stack or tower be inferred without assignments?
