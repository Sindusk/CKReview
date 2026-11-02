// lib/mechanics/ffxiv/dsr/dark-king-thordan.ts
//
// -- DIGEST --
// DSR Ultimate P5: Wrath combines divebombs, twisters, tethers, lightning,
// cones and baited fires; Death combines Doom cleanses, chains, gaze,
// spreads and eight killable meteors. Reduce Thordan below his transition
// threshold and spare him. Killing him prevents P7, even if P6 is cleared.
// Sections: "-- SCOPE AND SOURCES --", "-- SHAPE AND CLOCK --",
// "-- MECHANICS --", "-- PULL ENDERS --", "-- STRATEGY AND NOT ERRORS --",
// "-- OPEN QUESTIONS --". All signals guide-derived, not log-verified.
//
// -- SCOPE AND SOURCES --
// Ultimate; checked 2026-11-02:
// https://consolegameswiki.com/wiki/Dragonsong%27s_Reprise_(Ultimate)
// https://www.icy-veins.com/ffxiv/dragonsongs-reprise-ultimate-introduction
// https://naurffxiv.com/ultimate/dsr
// https://raw.githubusercontent.com/quisquous/cactbot/main/ui/raidboss/data/06-ew/ultimate/dragonsongs_reprise_ultimate.txt
// Released 6.11; 7.0 freeze bug fixed 2024-07-02 (official notice in P1).
// No additional numeric change established. IDs are unverified hex network
// ability candidates. P1/P2 share names and IDs, so phase context matters.
//
// -- SHAPE AND CLOCK --
// Relative to Incarnation: Dragon's Eye 0:06, Wrath 0:25; boss becomes
// untargetable for trio and returns for Quaga and Heel/Might. Death of the
// Heavens follows, then eight targetable meteor circles. Killing meteors
// determines return timing; a final Quaga and Heel/Might precede Aetheric
// Burst. Reduce boss below ~3% before the cast completes, then stop attacks
// when he kneels. This is a timed script with kill-dependent meteor gap.
//
// -- MECHANICS --
// INCARNATION (6B86) revives three dragons; Dragon's Eye (6B87) buffs the
// boss. Auto damage, Ancient Quaga (63C6), Heavenly Heel (63C7) and three
// Ascalon's Might cleaves recur. Tank swap/invuln and isolate. LOG SIGNAL:
// unintended extra buster victims or repeated hits under resistance down;
// FAULT: positioning or tank only when established; CONSEQUENCE: Major
// on death, Raid on collapse. Planned mitigation, autos, busters and Quaga
// damage are normal; resistance debuffs expire.
//
// WRATH OF THE HEAVENS (6B89): Twisting Dive (6B8B) crosses arena, then
// one Twister per player appears at snapshotted locations. Two players get
// Spiral Pierce line tethers (6B8A), one gets Skyward Leap; two receive
// Thunderstruck from Chain Lightning (6B8F). Separate tethers and markers,
// dodge the dragon, move out of each Twister without touching another.
// Thunderstruck resolves as a spread; touching another adds Paralysis and
// Damage Down. LOG SIGNAL: Twister explosion/knockback, dive, line overlap,
// extra lightning victims or debuffs; FAULT: baiter or victim only where
// position/target proves responsibility; CONSEQUENCE: Major for death,
// Raid for party collapse. Thunderstruck expires; death behavior unknown.
//
// WRATH CONTINUED: one green marker baits Cauterize (6B8D); eight baited
// Ascalon's Mercy Revealed cones (63CA) must be spread. Liquid Heaven
// (6B91) targets a player with five sequential fireballs and puddles;
// Charibert's Altar Flare (63E5) places up to four delayed AoEs on another;
// Grinnaux casts Empty Dimension (62DA) donut. Bait away from safe space,
// move through safe regions and avoid puddles. If either fire target dies,
// remaining drops retarget randomly. LOG SIGNAL: extra cone victims, Burns,
// flare explosion, Cauterize or donut damage; FAULT: dropper only if bad
// placement is provable; otherwise affected player or unknown. CONSEQUENCE:
// Major for death, Raid on collapse. Initial intended fireball damage is
// expected; the resulting persistent puddle damage is avoidable.
//
// DEATH OF THE HEAVENS: four players receive ~25s Doom; four without Doom
// bait Wings of Salvation circles, leaving four small consumable cleanse
// puddles. One Doom player consumes each. Doom expiry kills. A player without
// Doom can consume a puddle, depriving another player. LOG SIGNAL: Doom
// expires with death, missing cleanse or wrong player's puddle interaction;
// FAULT: receiver or premature consumer if log identifies them, otherwise
// unknown; CONSEQUENCE: Major on death, potentially Raid. Doom removal by
// puddle is correct; death/removal side effects are unverified.
//
// DEATH OVERLAPS: Zephirin's Spear of the Fury and unmarked Cauterize
// cross the center; Heavy Impact is five expanding earthquake rings;
// Lightning Storm spreads all eight. Four Holy Chain pairs break by
// distance during Faith Unmoving: circle = two Doom, triangle and square =
// one Doom/one no Doom, cross = two no Doom. Heavensflame spreads while
// simultaneously looking away from both Thordan and the Eye's gaze.
// LOG SIGNAL: line/ring hits, Stun, Damage Down, unbroken chain penalty,
// Hysteria or multiple fire/lightning hits and resistance down. FAULT:
// affected player for avoidable terrain/gaze, pair for unbroken chain,
// overlap responsibility only if placements prove it. CONSEQUENCE: Minor
// if survived, Major if death, Raid when the party cannot continue. Chain
// breaks and Doom removal are intentional; gazes and markers may not log.
//
// HOLY METEOR (6B97): eight Meteor Circles appear on cardinal/intercardinal
// spots and must be destroyed before Meteor Impact (6B98). LOG SIGNAL:
// surviving circle and completed impact/raid damage; FAULT: external DPS
// assignment, so player-less; CONSEQUENCE: Raid if it wipes. Meteor deaths
// are expected; delay until the slowest circle determines return timing.
//
// -- PULL ENDERS --
// Aetheric Burst (6B88) completes above threshold; meteor impacts, Doom
// deaths, chains or cascading overlaps often wipe. Killing Thordan instead
// of sparing him permits a P6 branch but makes P7 inaccessible; the later
// eyes cannot be killed without prior buffs. Mark the route failure at the
// proven kill, not at the eventual inevitable repeat. Exact HP threshold and
// whether simultaneous DoTs can kill him need verification.
//
// -- STRATEGY AND NOT ERRORS --
// Community Wrath and Death plans assign different fixed spots, tether
// priorities, Doom-cleanses and knockback handling. No specific static plan
// supplied. Chosen baits, deliberate boss damage holds, successful cleanse,
// knockback and standard raidwide damage are normal.
//
// -- OPEN QUESTIONS --
// 1. Map Doom, cleanse, chain, twister, meteor and collision IDs/events.
// 2. Can logs distinguish the kneel/spare and kill branches at their source?
// 3. What happens to Doom, lightning and tethers when the holder dies?
// 4. Are circle ownership, gaze facing, tower/meteor HP and retargets visible?
