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
//   spread means resets or cooldown reduction, and the shortest would
//   invent drift. (Divine Toll's 30s / 62s spread was the survey mixing
//   specs; measured on Retribution alone it's a clean 60s, tracked below.)
// Defensives are left out: holding them is a choice. So are cooldowns gated
// by a resource (Eye Beam, Breath of Sindragosa) or charges (Shadow Dance).

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { TrackedCooldown } from "../types";
import { avengingWrathValue, divineTollValue } from "./specs/retribution";
import { pillarOfFrostValue } from "./specs/frostdk";

/**
 * One Vanish's worth to an Assassination Rogue: the damage of a Garrote cast
 * within 6s after a Vanish (to its next Garrote on that target, up to 24s)
 * less the player's average ordinary Garrote (ones that ran 15s+). Both from
 * this player's hits; undefined without one of each.
 */
function vanishGarroteValue(player: PlayerInfo, endMs: number): { value: number; basis: string } | undefined {
  const vanish = player.casts.filter((c) => c.abilityName === "Vanish").map((c) => c.timestamp);
  const gar = player.casts.filter((c) => c.abilityName === "Garrote" && c.timestamp < endMs).sort((a, b) => a.timestamp - b.timestamp);
  const ticks = player.damageDone.filter((h) => !h.pet && h.abilityName === "Garrote");
  const rows = gar.map((c, i) => {
    const next = gar.slice(i + 1).find((x) => x.target === c.target);
    const end = Math.min(next?.timestamp ?? Infinity, c.timestamp + 24_000, endMs);
    const dmg = ticks.filter((h) => h.target === c.target && h.timestamp > c.timestamp && h.timestamp <= end + 500).reduce((a, h) => a + (h.amount ?? 0), 0);
    return { dmg, len: end - c.timestamp, fromVanish: vanish.some((t) => c.timestamp - t >= 0 && c.timestamp - t < 6_000) };
  });
  const avg = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / xs.length;
  const v = rows.filter((r) => r.fromVanish && r.len >= 15_000).map((r) => r.dmg);
  const o = rows.filter((r) => !r.fromVanish && r.len >= 15_000).map((r) => r.dmg);
  if (v.length === 0 || o.length === 0) return undefined;
  const k = (n: number) => `${Math.round(n / 1000)}k`;
  return { value: avg(v) - avg(o), basis: `(${k(avg(v))} Garrote from Vanish − ${k(avg(o))} ordinary Garrote)` };
}

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
  // Retribution (values per use and burstHold: specs/retribution.ts's
  // header, WoWAnalyzer audit phase 3, 2026-10-17). Divine Toll on
  // Retribution alone: shortest 60.0s, typical 62–75s over 58 player-pulls
  // (the survey's 30s was another spec's).
  "Retribution Paladin": [
    { name: "Wake of Ashes", actionIds: [255937], cooldownMs: 30_000, charges: 1, firstUseOffsetMs: 6_000,       // 30.0 / 31.7s, 5.5s
      damageIds: [255937, 405345, 405350, 403695], burstHold: true },
    { name: "Avenging Wrath", actionIds: [31884], cooldownMs: 60_000, charges: 1, firstUseOffsetMs: 4_000,       // 60.0 / 62.1s, 3.4s
      valuePerUse: avengingWrathValue, burstHold: true },
    { name: "Execution Sentence", actionIds: [343527], cooldownMs: 60_000, charges: 1, firstUseOffsetMs: 4_000,  // 60.0 / 62.1s, 3.9s
      damageIds: [387113, 1260251], burstHold: true },
    { name: "Divine Toll", actionIds: [375576], cooldownMs: 60_000, charges: 1, firstUseOffsetMs: 10_000,
      valuePerUse: divineTollValue, burstHold: true },
  ],
  "Havoc Demon Hunter": [
    { name: "Essence Break", actionIds: [258860], cooldownMs: 30_000, charges: 1, firstUseOffsetMs: 5_000 },   // 30.0 / 35.5s, 4.7s
    { name: "The Hunt", actionIds: [370965], cooldownMs: 60_000, charges: 1, firstUseOffsetMs: 3_000 },        // 60.4 / 64.4s, 2.3s
    { name: "Metamorphosis", actionIds: [200166], cooldownMs: 119_000, charges: 1, firstUseOffsetMs: 9_000 },  // 119.2 / 130.9s, 8.9s
  ],
  "Windwalker Monk": [
    { name: "Invoke Xuen", actionIds: [123904], cooldownMs: 90_000, charges: 1, firstUseOffsetMs: 3_000 },          // 90.2 / 100.0s, 2.6s
    // Its hits log as 443038 (LckJC7GMhQvD6rdw), not the cast's id: without
    // damageIds a use was worth 0 and the drift never showed (2026-10-17).
    { name: "Celestial Conduit", actionIds: [443028], damageIds: [443038], cooldownMs: 90_000, charges: 1, firstUseOffsetMs: 13_000 },   // 90.2 / 95.8s, 12.6s
  ],
  // Frost DK, re-measured in the WoWAnalyzer audit's phase 3 (2026-10-17;
  // specs/frostdk.ts's header) on 31 player-pulls of 16 players: shortest /
  // median interval Pillar of Frost 45.0 / 47.3s, Reaper's Mark 45.0 /
  // 47.7s, Frostwyrm's Fury 90.1 / 96.2s, Breath of Sindragosa 90.2 / 96.3s.
  // Pillar had been worth 0 a use, so its drift never showed (it deals
  // nothing itself: valued by its window now), and most of Reaper's Mark's
  // damage logs as 436304 and 439594. Frostwyrm's Fury (hits 279303) and
  // Breath of Sindragosa, held to line up with every other Pillar, are
  // judged in specs/frostdk.ts with that wait excused: tracked here at a
  // flat 90s they flagged the top players (Winningdk dG8D9y6WxrfmtgXp
  // 1.19M and 498k).
  "Frost Death Knight": [
    { name: "Pillar of Frost", actionIds: [51271], cooldownMs: 45_000, charges: 1, firstUseOffsetMs: 3_000, valuePerUse: pillarOfFrostValue },
    { name: "Reaper's Mark", actionIds: [439843], damageIds: [439843, 436304, 439594], cooldownMs: 45_000, charges: 1, firstUseOffsetMs: 3_000 },
  ],
  "Unholy Death Knight": [
    { name: "Dark Transformation", actionIds: [1233448], cooldownMs: 45_000, charges: 1, firstUseOffsetMs: 4_000 }, // 45.1 / 46.5s, 3.8s
    { name: "Army of the Dead", actionIds: [42650], cooldownMs: 91_000, charges: 1, firstUseOffsetMs: 4_000 },      // 91.1 / 95.2s, 4.0s
  ],
  "Assassination Rogue": [
    { name: "Kingsbane", actionIds: [385627], cooldownMs: 60_000, charges: 1, firstUseOffsetMs: 11_000 },   // 60.0 / 64.8s, 10.9s
    { name: "Deathmark", actionIds: [360194], cooldownMs: 122_000, charges: 1, firstUseOffsetMs: 10_000 },  // 122.4 / 140.5s, 9.9s
    // Vanish (1856) is a damage cooldown here: the Garrote after it gets
    // Improved Garrote (392401, 6s), 1.09–1.60M over its duration against
    // ~0.34M for an ordinary one. Measured 2026-10-13: the 99th-percentile
    // Auxeus (ACmXHMFtaPLR9k8w) Vanished at 0:09, 2:10, 4:20 (121s, 130s);
    // Nearby (qpZx3mWaG7gcDdYB) only at 2:04 and 4:30, skipping the opener
    // one (WoWAnalyzer 61%). Value of a use: vanishGarroteValue.
    { name: "Vanish", actionIds: [1856], cooldownMs: 120_000, charges: 1, firstUseOffsetMs: 10_000, valuePerUse: vanishGarroteValue, openerUse: true },
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

  // ── Ranged and casters ─────────────────────────────────────────────
  // Not tracked: Balance's Fury of Elune (19.7 / 25.9s) and Incarnation
  // (20.8 / 104.7s), Elemental's Stormkeeper (38.2 / 48.9s: Ancestors cut
  // it, so wow/specs/ranged.ts judges it with spentCooldownDrift), Fire's Meteor
  // (53.9 / 68.7s), Augmentation's Tip the Scales (47.8 / 64.0s): spread too
  // far. Demonology's Call Dreadstalkers and Implosion are judged in
  // wow/specs/demonology.ts (held time with a Tyrant line-up excused).
  "Arcane Mage": [
    { name: "Touch of the Magi", actionIds: [321507], cooldownMs: 45_000, charges: 1, firstUseOffsetMs: 4_000 }, // 45.0 / 46.8s, 3.2s
    { name: "Arcane Surge", actionIds: [365350], cooldownMs: 91_000, charges: 1, firstUseOffsetMs: 2_000 },      // 91.0 / 94.4s, 0.9s
  ],
  "Fire Mage": [   // unverified (2 players)
    { name: "Combustion", actionIds: [190319], cooldownMs: 60_000, charges: 1, firstUseOffsetMs: 23_000 },  // 60.0 / 60.9s, 22.4s
  ],
  "Frost Mage": [   // unverified (1 player)
    { name: "Frozen Orb", actionIds: [84714], cooldownMs: 60_000, charges: 1, firstUseOffsetMs: 2_000 },   // 60.3 / 62.2s, 1.8s
    { name: "Comet Storm", actionIds: [153595], cooldownMs: 43_000, charges: 1, firstUseOffsetMs: 7_000 }, // 43.0 / 46.3s, 6.8s
    { name: "Ray of Frost", actionIds: [205021], cooldownMs: 44_000, charges: 1, firstUseOffsetMs: 3_000 },// 44.8 / 47.5s, 2.7s
  ],
  // Beast Mastery's Bestial Wrath (30.0 / 31.0s, 2.4s) was tracked here
  // until the WoWAnalyzer audit's phase 3 (2026-10-17): its damage is the
  // pet's (its hit 344572, the Bloodshed it casts, the window's bonus to the
  // pet), so priced by the cast id a use was worth 0 and its drift never
  // showed. wow/specs/beastmastery.ts judges it now (held time, with
  // Vashnik's hold windows read).
  "Marksmanship Hunter": [
    { name: "Volley", actionIds: [260243], cooldownMs: 45_000, charges: 1, firstUseOffsetMs: 4_000 },     // 45.0 / 51.5s, 3.7s
    { name: "Trueshot", actionIds: [288613], cooldownMs: 120_000, charges: 1, firstUseOffsetMs: 4_000 },  // 120.3 / 132.5s, 4.0s
  ],
  "Shadow Priest": [
    { name: "Halo", actionIds: [120644], cooldownMs: 60_000, charges: 1, firstUseOffsetMs: 6_000 },           // 60.6 / 62.9s, 6.0s
    { name: "Voidform", actionIds: [228260], cooldownMs: 120_000, charges: 1, firstUseOffsetMs: 8_000 },      // 120.6 / 126.9s, 7.2s
    { name: "Void Torrent", actionIds: [263165], cooldownMs: 30_000, charges: 1, firstUseOffsetMs: 11_000 },  // 30.0 / 33.5s, 10.8s
  ],
  "Elemental Shaman": [
    { name: "Ascendance", actionIds: [114050], cooldownMs: 120_000, charges: 1, firstUseOffsetMs: 2_000 },  // 120.2 / 139.9s, 1.6s
  ],
  "Affliction Warlock": [
    { name: "Malevolence", actionIds: [442726], cooldownMs: 60_000, charges: 1, firstUseOffsetMs: 4_000 },       // 60.0 / 62.3s, 3.9s
    { name: "Summon Darkglare", actionIds: [205180], cooldownMs: 120_000, charges: 1, firstUseOffsetMs: 3_000 }, // 120.0 / 123.2s, 3.0s
  ],
  "Demonology Warlock": [
    { name: "Summon Demonic Tyrant", actionIds: [265187], cooldownMs: 60_000, charges: 1, firstUseOffsetMs: 5_000 },  // 60.8 / 63.0s, 5.0s
  ],
  // Checked against WoWAnalyzer on qpZx3mWaG7gcDdYB pull 3 (2026-10-13):
  // its cooldown bars recharge Summon Infernal in 90.0s and Malevolence in
  // 60.0s (the 1-player survey's 95s came from late casts; Affliction's
  // Malevolence measures 60.0s too). Soul Fire is often hard-cast before the
  // pull: its own hit before the first cast is the evidence (0:01.5 there),
  // which WoWAnalyzer misses ("0:00-1:07 unused"). Its bars say ~41s, but
  // no player began one sooner than ~45s after the last landed (45.9s
  // there; the two top Destruction Warlocks on NK1hBtW9rckdjq36 45.3s and
  // 45.6s): the cooldown is ~45s from landing, so the measured 46s between
  // landings stays. Havoc (30s) isn't tracked: its value
  // is the damage it copies, not hits of its own, and it was pressed before
  // the pull too (on the enemy at 0:00).
  "Destruction Warlock": [
    { name: "Summon Infernal", actionIds: [1122], cooldownMs: 90_000, charges: 1, firstUseOffsetMs: 2_000 },   // 90.2s here, 1.8s
    { name: "Malevolence", actionIds: [442726], cooldownMs: 60_000, charges: 1, firstUseOffsetMs: 3_000 },     // 60.0s (bars), 2.8s
    { name: "Soul Fire", actionIds: [6353], cooldownMs: 46_000, charges: 1, firstUseOffsetMs: 1_000, prePullEvidenceIds: [6353] },  // 46.7 / 52.3s, 0.4s
  ],
  "Devastation Evoker": [
    { name: "Dragonrage", actionIds: [375087], cooldownMs: 120_000, charges: 1, firstUseOffsetMs: 3_000 },     // 120.0 / 122.5s, 2.8s
    { name: "Tip the Scales", actionIds: [370553], cooldownMs: 120_000, charges: 1, firstUseOffsetMs: 4_000 }, // 120.7 / 123.4s, 3.0s
  ],
  "Augmentation Evoker": [   // unverified (3 players)
    { name: "Breath of Eons", actionIds: [403631], cooldownMs: 74_000, charges: 1, firstUseOffsetMs: 2_000 },  // 74.6 / 91.3s, 1.6s
    { name: "Time Skip", actionIds: [404977], cooldownMs: 135_000, charges: 1, firstUseOffsetMs: 8_000 },     // 135.8 / 155.8s, 7.2s
  ],
  "Devourer Demon Hunter": [   // unverified (2 players)
    { name: "The Hunt", actionIds: [1246167], cooldownMs: 91_000, charges: 1, firstUseOffsetMs: 11_000 },  // 91.6 / 105.6s, 10.7s
  ],

  // ── Healers ─────────────────────────────────────────────────────────
  // Mistweaver's Celestial Conduit (Conduit of the Celestials), from the
  // WoWAnalyzer audit's phase 3 (2026-10-17): shortest interval 90.0s
  // (Abuki gVDPhzp61Zm29HMw, many times; 89 casts of 12 players), first use
  // median 13s (25 player-pulls). Its hits log as 443038 (masterData of
  // the same reports), 52–541k a cast; the five top players
  // (K4x8cMZYVpGCDbJH, 8kVQMJ4rmpnyRjBH, J3ckBVtrZNfWv1h7,
  // MaWQwnygjkh1czL8, 7L3RKpavDA8T4MjY, Vashnik) pressed it every
  // 90–105s. Players on Master of Harmony never cast it and get nothing.
  "Mistweaver Monk": [
    { name: "Celestial Conduit", actionIds: [443028], damageIds: [443038], cooldownMs: 90_000, charges: 1, firstUseOffsetMs: 13_000 },
  ],
};
