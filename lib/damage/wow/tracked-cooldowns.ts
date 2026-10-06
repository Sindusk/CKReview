// lib/damage/wow/tracked-cooldowns.ts
//
// Which cooldowns the drift check judges, per spec (key: "<spec> <class>",
// e.g. "Fire Mage"; lib/damage/wow/game.ts jobOf). Same rule as FFXIV's
// list: only cooldowns gated by nothing but their recast belong here, or a
// proc- or resource-gated one sits "ready" while unusable and reads as drift.
// WoWAnalyzer may be read for which cooldowns matter, never copied (AGPL).
//
// Every number is measured (lib/damage/wow/spell-data.ts, survey of 12
// fights, 2026-10-06):
// - cooldownMs: the shortest interval between one player's casts, rounded
//   to the second. That's an upper bound on the real recast, so the check
//   errs lenient: a talent that shortens it more than the samples show
//   would hide drift, never invent it.
// - firstUseOffsetMs: how late the opener uses it, from the median first
//   cast across the survey (rounded up).
// - Only when the median interval is within 1.25× of the shortest: a bigger
//   spread means resets or cooldown reduction (Divine Toll for Retribution:
//   shortest 30s, median 62s), and the shortest would invent drift.
// Defensives are left out: holding them is a choice. So are cooldowns gated
// by a resource (Eye Beam, Breath of Sindragosa) or charges (Shadow Dance).

import type { TrackedCooldown } from "../types";

export const WOW_TRACKED_COOLDOWNS: Record<string, TrackedCooldown[]> = {
  // ── Tanks ───────────────────────────────────────────────────────────
  "Blood Death Knight": [
    // min interval 90.0s (69 casts), first use median 2.1s (15 players)
    { name: "Dancing Rune Weapon", actionIds: [49028], cooldownMs: 90_000, charges: 1, firstUseOffsetMs: 3_000 },
    // min 120.0s (37 casts), first use median 2.1s
    { name: "Raise Dead", actionIds: [46585], cooldownMs: 120_000, charges: 1, firstUseOffsetMs: 3_000 },
  ],
  "Protection Paladin": [
    // min 59.9s (51 casts), first use median 1.7s (8 players)
    { name: "Sentinel", actionIds: [389539], cooldownMs: 60_000, charges: 1, firstUseOffsetMs: 3_000 },
    // min 60.0s (47 casts), first use median 8.5s (25 players across specs)
    { name: "Divine Toll", actionIds: [375576], cooldownMs: 60_000, charges: 1, firstUseOffsetMs: 10_000 },
  ],
  // Unverified (2 players): min 60.0s (9 casts), first use 6.0s.
  "Brewmaster Monk": [
    { name: "Exploding Keg", actionIds: [325153], cooldownMs: 60_000, charges: 1, firstUseOffsetMs: 7_000 },
  ],
  // Unverified (1 player): Sigil of Spite min 63.0s, first use 4.4s; Sigil
  // of Flame min 30.9s.
  "Vengeance Demon Hunter": [
    { name: "Sigil of Spite", actionIds: [390163], cooldownMs: 63_000, charges: 1, firstUseOffsetMs: 5_000 },
    { name: "Sigil of Flame", actionIds: [204596], cooldownMs: 31_000, charges: 1, firstUseOffsetMs: 5_000 },
  ],

  // ── Melee (shortest / median interval, first use median) ─────────────
  // Arms: Avatar 51s / 64s and Colossus Smash 24.5s / 32s spread too far
  // (cooldown reduction): not tracked.
  "Fury Warrior": [   // unverified (2 players)
    { name: "Recklessness", actionIds: [1719], cooldownMs: 41_000, charges: 1, firstUseOffsetMs: 2_000 },     // 41.5 / 49.3s, 0.4s
    { name: "Odyn's Fury", actionIds: [385062], cooldownMs: 45_000, charges: 1, firstUseOffsetMs: 3_000 },    // 45.0 / 47.8s, 1.2s
  ],
  "Retribution Paladin": [
    { name: "Wake of Ashes", actionIds: [255937], cooldownMs: 30_000, charges: 1, firstUseOffsetMs: 6_000 },      // 30.0 / 31.7s, 5.5s
    { name: "Avenging Wrath", actionIds: [31884], cooldownMs: 60_000, charges: 1, firstUseOffsetMs: 4_000 },      // 60.0 / 62.1s, 3.4s
    { name: "Execution Sentence", actionIds: [343527], cooldownMs: 60_000, charges: 1, firstUseOffsetMs: 4_000 }, // 60.0 / 62.1s, 3.9s
  ],
  "Havoc Demon Hunter": [
    { name: "Essence Break", actionIds: [258860], cooldownMs: 30_000, charges: 1, firstUseOffsetMs: 5_000 },   // 30.0 / 35.5s, 4.7s
    { name: "The Hunt", actionIds: [370965], cooldownMs: 60_000, charges: 1, firstUseOffsetMs: 3_000 },        // 60.4 / 64.4s, 2.3s
    { name: "Metamorphosis", actionIds: [200166], cooldownMs: 119_000, charges: 1, firstUseOffsetMs: 9_000 },  // 119.2 / 130.9s, 8.9s
  ],
  "Windwalker Monk": [
    { name: "Invoke Xuen", actionIds: [123904], cooldownMs: 90_000, charges: 1, firstUseOffsetMs: 3_000 },          // 90.2 / 100.0s, 2.6s
    { name: "Celestial Conduit", actionIds: [443028], cooldownMs: 90_000, charges: 1, firstUseOffsetMs: 13_000 },   // 90.2 / 95.8s, 12.6s
  ],
  "Frost Death Knight": [   // unverified (2 players)
    { name: "Pillar of Frost", actionIds: [51271], cooldownMs: 45_000, charges: 1, firstUseOffsetMs: 3_000 },       // 45.0 / 49.8s, 2.4s
    { name: "Reaper's Mark", actionIds: [439843], cooldownMs: 45_000, charges: 1, firstUseOffsetMs: 3_000 },        // 45.0 / 49.7s, 2.2s
    { name: "Frostwyrm's Fury", actionIds: [279302], cooldownMs: 91_000, charges: 1, firstUseOffsetMs: 6_000 },     // 91.9 / 98.8s, 5.0s
  ],
  "Unholy Death Knight": [
    { name: "Dark Transformation", actionIds: [1233448], cooldownMs: 45_000, charges: 1, firstUseOffsetMs: 4_000 }, // 45.1 / 46.5s, 3.8s
    { name: "Army of the Dead", actionIds: [42650], cooldownMs: 91_000, charges: 1, firstUseOffsetMs: 4_000 },      // 91.1 / 95.2s, 4.0s
  ],
  "Assassination Rogue": [
    { name: "Kingsbane", actionIds: [385627], cooldownMs: 60_000, charges: 1, firstUseOffsetMs: 11_000 },   // 60.0 / 64.8s, 10.9s
    { name: "Deathmark", actionIds: [360194], cooldownMs: 122_000, charges: 1, firstUseOffsetMs: 10_000 },  // 122.4 / 140.5s, 9.9s
  ],
  "Subtlety Rogue": [
    { name: "Shadow Blades", actionIds: [121471], cooldownMs: 90_000, charges: 1, firstUseOffsetMs: 5_000 },  // 90.5 / 97.2s, 5.0s
    { name: "Goremaw's Bite", actionIds: [426591], cooldownMs: 45_000, charges: 1, firstUseOffsetMs: 5_000 }, // 45.0 / 47.5s, 4.7s
  ],
  "Feral Druid": [   // unverified (1 player)
    { name: "Tiger's Fury", actionIds: [5217], cooldownMs: 30_000, charges: 1, firstUseOffsetMs: 3_000 },          // 30.0 / 30.0s, 2.7s
    { name: "Feral Frenzy", actionIds: [274837], cooldownMs: 30_000, charges: 1, firstUseOffsetMs: 6_000 },        // 30.0 / 31.2s, 5.1s
    { name: "Convoke the Spirits", actionIds: [391528], cooldownMs: 61_000, charges: 1, firstUseOffsetMs: 9_000 }, // 61.4 / 62.7s, 8.1s
    { name: "Berserk", actionIds: [106951], cooldownMs: 120_000, charges: 1, firstUseOffsetMs: 2_000 },            // 120.0 / 120.2s, 1.6s
  ],
  "Survival Hunter": [   // unverified (1 player)
    { name: "Takedown", actionIds: [1250646], cooldownMs: 61_000, charges: 1, firstUseOffsetMs: 36_000 },  // 61.4 / 62.5s, 35.6s
  ],
};
