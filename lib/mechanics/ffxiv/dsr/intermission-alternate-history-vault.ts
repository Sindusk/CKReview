// lib/mechanics/ffxiv/dsr/intermission-alternate-history-vault.ts
//
// -- DIGEST --
// DSR Ultimate rewind repeats P1 prison with Haurchefant alive. Heal him,
// resolve four two-person Brightwings and Skyblind drops, damage Charibert,
// and destroy the spear before Pierce. Letting Haurchefant die sends the
// party back to P2 rather than the true continuation. Sections: "-- SCOPE
// AND SOURCES --", "-- SHAPE AND CLOCK --", "-- MECHANICS --", "-- PULL
// ENDERS --", "-- STRATEGY AND NOT ERRORS --", "-- OPEN QUESTIONS --".
// All signals are guide-inferred, not verified against FFLogs.
//
// -- SCOPE AND SOURCES --
// Ultimate. Checked 2026-11-02:
// https://consolegameswiki.com/wiki/Dragonsong%27s_Reprise_(Ultimate)
// https://www.icy-veins.com/ffxiv/dragonsongs-reprise-ultimate-guide-for-eyes
// https://www.thepfstrat.com/u/dru
// https://raw.githubusercontent.com/quisquous/cactbot/main/ui/raidboss/data/06-ew/ultimate/dragonsongs_reprise_ultimate.txt
// Released 6.11; 2024-07-02 7.0 freeze fix official notice linked in P1.
// No other numerical hotfix established. Candidate IDs are hex network IDs,
// not verified FFLogs IDs. Reuse of P1 ability names requires phase context.
//
// -- SHAPE AND CLOCK --
// After both eyes die, rewind transition returns to prison. Measured from
// Planar Prison resolution: Spear of the Fury ~0:10, Brightwing pairs
// ~0:16, 0:21, 0:26, 0:31, first three Skyblind drops ~0:24/0:29/0:34,
// Pure of Heart ~0:36, last Skyblind ~0:39, Pierce ~0:52. Script is timed;
// spear defeat is the variable condition that advances to P5. These are
// candidate timeline offsets, not verified logs.
//
// -- MECHANICS --
// PLANAR PRISON (62E1) applies Planar Imprisonment to all eight: leaving
// the confined circle kills. Haurchefant intercepts the Spear of the Fury
// (62E2) and is a healable friendly NPC. SHOCKWAVE pulses as long as he
// lives; heal him through sustained damage and keep him near full before
// Pure of Heart. LOG SIGNAL: NPC damage/healing/HP and death, if logged;
// FAULT: no individual healer can be inferred from NPC death alone;
// CONSEQUENCE: Raid for failed save. Correct prison and Shockwave damage
// are expected. Planar Imprisonment ends with prison; no dispel known.
//
// BRIGHTWING (6319 damage) targets the two closest to Charibert in each
// of four waves, with separate small cones. Each hit inflicts Light
// Resistance Down and Skyblind; Skyblind drops an invisible delayed circle
// at the holder's position ~5s later (631A candidate damage). Four pairs
// rotate and move after placing the drop, avoiding overlaps and the prison
// edge. LOG SIGNAL: repeated hit while resistant, extra cone victims, or
// Skyblind damage/death. FAULT: pair/baiter only if timing and location
// establish ownership; a victim may have walked into a correct bait.
// CONSEQUENCE: Major on death, Raid if ensuing collapse. Aura expires;
// early removal, death and puddle ownership are unverified.
//
// PURE OF HEART (62E4): Charibert's ~36s cast deals damage depending on
// remaining HP; guide suggests at or below roughly 30% for survival.
// Attack him during prison and mitigate; the hit also damages Haurchefant.
// LOG SIGNAL: cast damage and death of players or NPC; FAULT: raid-level
// damage/healing issue unless a specific cause is established. CONSEQUENCE:
// Raid when NPC dies or party is unrecoverable. Surviving the hit and
// receiving heavy damage are expected. Exact threshold is not verified.
//
// SPEAR OF THE FURY / PIERCE (69B5 candidate): after prison ends, attack
// the targetable spear pinning Haurchefant. It casts Pierce for ~11s;
// completion kills him. LOG SIGNAL: completed Pierce or NPC death and P2
// loop instead of Incarnation; FAULT: raid damage check, player-less;
// CONSEQUENCE: Raid for the true-route pull. Spear death cancels cast and
// permits the alternate history. Prior P1 spear hit and scripted death have
// the same names but are not a failed save.
//
// -- PULL ENDERS --
// Haurchefant dying to initial spear damage, Shockwaves, Pure of Heart or
// Pierce prevents the intended continuation; the game can replay P2, not
// necessarily immediately wipe. Lethal prison exits or multiple Brightwing
// deaths can also cause collapse. A player-less route failure is preferable
// to guessing healer or spear assignment.
//
// -- STRATEGY AND NOT ERRORS --
// Common PF rotation is healer, melee, ranged, tank pairs with alternating
// east/west drops. Other safe rotations and shielding/healing plans are
// valid. Sustained Shockwave here is success evidence, unlike the first
// history where the NPC's scripted death stops it.
//
// -- OPEN QUESTIONS --
// 1. Does FFLogs expose Haurchefant HP, heals, death and spear target HP?
// 2. Which events distinguish first and rewind prison, particularly on
//    checkpoint pulls and the loop after a failed save?
// 3. What is Pure of Heart's actual damage/HP relationship and NPC damage?
// 4. What happens to Skyblind and bait targeting if a marked player dies?
