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
// by a resource (Eye Beam, Breath of Sindragosa). Charges are simulated
// (Shadow Dance's two, since 2026-10-17: a fixed recharge fitted them).

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { TrackedCooldown } from "../types";
import { avengingWrathValue, divineTollValue } from "./specs/retribution";
import { pillarOfFrostValue } from "./specs/frostdk";
import { dancingRuneWeaponValue } from "./specs/blood";
import { sigilValue } from "./specs/vengeance";
import { trueshotValue } from "./specs/marksmanship";
import { convokeValue, feralFrenzyValue, feralWindowValue } from "./specs/feral";
import { dragonrageValue } from "./specs/devastation";
import { niuzaoValue } from "./specs/brewmaster";
import { voidformValue } from "./specs/shadow";
import { shadowDanceValue } from "./specs/subtlety";
import { ascendanceValue, voltaicBlazeValue } from "./specs/enhancement";
import { infernalValue, malevolenceValue } from "./specs/destruction";
import { armyOfTheDeadValue, darkTransformationValue } from "./specs/unholy";

/**
 * One Vanish's worth to an Assassination Rogue: the damage of a Garrote cast
 * within 6s after a Vanish (to its next Garrote on that target, up to 24s)
 * less the player's average ordinary Garrote (ones that ran 15s+). Both from
 * this player's hits; undefined without one of each, except a player with
 * no Vanish Garrote at all, priced at VANISH_GARROTE_RATIO × their ordinary
 * one. The ratio: the player's own Vanish Garrote ÷ ordinary on 43 of 46
 * player-pulls (2026-10-17) ran 0.5–5.6, median 2.6, quartile 1.9 (a Vanish
 * outside Deathmark ~1.0–1.3: 遗伤, Калимист, Morllinor); 2.0 is taken
 * as the low, lenient side.
 */
const VANISH_GARROTE_RATIO = 2;
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
  const k = (n: number) => `${Math.round(n / 1000)}k`;
  // A player who never Vanished (or whose every Vanish Garrote was cut
  // short) has nothing of their own to price a use with: take
  // VANISH_GARROTE_RATIO × their ordinary Garrote (WoWAnalyzer audit phase
  // 3, 2026-10-17: Hofix JvQpZk3CXj78Dx2f pressed none in 5:22 and read 0).
  if (v.length === 0 && o.length > 0 && !rows.some((r) => r.fromVanish)) {
    return { value: avg(o) * (VANISH_GARROTE_RATIO - 1), basis: `(${VANISH_GARROTE_RATIO}× ${k(avg(o))}, an ordinary Garrote, from Vanish − ${k(avg(o))}; no Vanish Garrote of the player's own)` };
  }
  if (v.length === 0 || o.length === 0) return undefined;
  return { value: avg(v) - avg(o), basis: `(${k(avg(v))} Garrote from Vanish − ${k(avg(o))} ordinary Garrote)` };
}

export const WOW_TRACKED_COOLDOWNS: Record<string, TrackedCooldown[]> = {
  // ── Tanks ───────────────────────────────────────────────────────────
  "Blood Death Knight": [
    // min interval 90.0s (69 casts), first use median 2.1s (15 players).
    // Dancing Rune Weapon deals nothing itself (its copies log under the
    // Rune Weapon pet), so a use was worth 0 until the WoWAnalyzer audit's
    // phase 3 (2026-10-17): valued by specs/blood.ts dancingRuneWeaponValue.
    // Raise Dead stays unvalued (its ghoul is 38–147k a use, and the top
    // players skip uses: 蕾米蕾米蕾 J3ckBVtrZNfWv1h7 190s / 182s apart).
    // Reaper's Mark (Deathbringer): shortest 45s, hits under three ids as
    // for Frost; specs/blood.ts has the numbers.
    { name: "Dancing Rune Weapon", actionIds: [49028], cooldownMs: 90_000, charges: 1, firstUseOffsetMs: 3_000, valuePerUse: dancingRuneWeaponValue },
    // min 120.0s (37 casts), first use median 2.1s
    { name: "Raise Dead", actionIds: [46585], cooldownMs: 120_000, charges: 1, firstUseOffsetMs: 3_000 },
    { name: "Reaper's Mark", actionIds: [439843], damageIds: [439843, 436304, 439594], cooldownMs: 45_000, charges: 1, firstUseOffsetMs: 3_000 },
  ],
  "Protection Paladin": [
    // min 59.9s (51 casts), first use median 1.7s (8 players)
    { name: "Sentinel", actionIds: [389539], cooldownMs: 60_000, charges: 1, firstUseOffsetMs: 3_000 },
    // min 60.0s (47 casts), first use median 8.5s (25 players across specs)
    { name: "Divine Toll", actionIds: [375576], cooldownMs: 60_000, charges: 1, firstUseOffsetMs: 10_000 },
  ],
  // Brewmaster (the WoWAnalyzer audit's phase 3, 2026-10-17; 9 player-pulls,
  // specs/brewmaster.ts has the numbers):
  // - Exploding Keg: shortest 60.0–61.3s on seven players, median 62–70s.
  //   A use was valued by its first hit only (325153); its later hits
  //   (388867) and the Fuel on the Fire hits its buff gives Keg Smash
  //   (1262159, every one within 12s of a Keg) count now: 59–131k plus
  //   49–269k a use. burstHold: Melstout (PCMfNtnbrVxpwYhk, 99.7th) and
  //   Lootchi press it at the end of each Vashnik hold window (0:27, 1:54,
  //   3:19, 4:42, 6:03), when the Venoms give its Fuel on the Fire three
  //   targets; read as drift it was 2 lost uses on him.
  // - Invoke Niuzao: 95s with a talent (seven Shado-Pan players, shortest
  //   95.0–97.1s), 120s without (Master of Harmony: 121.0, 120.4); the
  //   talent isn't in the log, so 120s, lenient. Its first press: median
  //   4.5s. Valued by niuzaoValue (Niuzao's hits and the Flurry Strikes its
  //   window adds).
  "Brewmaster Monk": [
    { name: "Exploding Keg", actionIds: [325153], damageIds: [325153, 388867, 1262159], cooldownMs: 60_000, charges: 1, firstUseOffsetMs: 7_000, burstHold: true },
    { name: "Invoke Niuzao", actionIds: [132578], cooldownMs: 120_000, charges: 1, firstUseOffsetMs: 5_000, valuePerUse: niuzaoValue },
  ],
  // Vengeance (the WoWAnalyzer audit's phase 3, 2026-10-17; 24
  // player-pulls on nine reports, specs/vengeance.ts has the numbers):
  // Sigil of Spite min 60.2s (83 intervals, median 65.8s), Sigil of Flame
  // min 30.0s (171, median 32.8s). Both hit under another id than the cast
  // (389860, 204598), which also shows a pre-pull press; a use is valued
  // by sigilValue (its hits less the GCD it took). burstHold: the top
  // Vashnik tanks hold Sigil of Flame for the Venoms after Imbibe.
  "Vengeance Demon Hunter": [
    { name: "Sigil of Spite", actionIds: [390163], cooldownMs: 60_000, charges: 1, firstUseOffsetMs: 5_000, prePullEvidenceIds: [389860], burstHold: true, valuePerUse: sigilValue("Sigil of Spite", 390163) },
    { name: "Sigil of Flame", actionIds: [204596], cooldownMs: 30_000, charges: 1, firstUseOffsetMs: 5_000, prePullEvidenceIds: [204598], burstHold: true, valuePerUse: sigilValue("Sigil of Flame", 204596) },
  ],
  // Guardian (the WoWAnalyzer audit's phase 3, 2026-10-17; tank.ts's
  // Guardian notes have the numbers): Lunar Beam (cast 204066, a fake
  // 1270292 cast beside it) shortest 40.0s, median 42–44s over 27
  // player-pulls; its hits log as 1270292 and 414613 (masterData of
  // aZ6NnwL8g9PdpGJ1, mNkHXhaD6Y2tqQTg), 340–470k a use. burstHold: the
  // top Vashnik tanks hold it for the Venoms after Imbibe (Shasta
  // Ndh2H6Qw4Pp1qaMk 4:28 → 5:45). Not tracked: Red Moon (30.0s shortest)
  // is pressed every 40s right after each Lunar Beam by two of the top
  // players, an even trade (its ticks hit ×1.36 inside the beam), so its
  // drift flagged them and nobody weaker; Incarnation is 180s less 1s per
  // 25 Rage spent and most top tanks hold one use 32–67s.
  "Guardian Druid": [
    { name: "Lunar Beam", actionIds: [204066], damageIds: [1270292, 414613], prePullEvidenceIds: [1270292, 414613], cooldownMs: 40_000, charges: 1, firstUseOffsetMs: 6_000, burstHold: true },
  ],

  // ── Melee (shortest / median interval, first use median) ─────────────
  // Arms: Avatar 51s / 64s and Colossus Smash 24.5s / 32s spread too far
  // (cooldown reduction): not tracked.
  // Fury (the WoWAnalyzer audit's phase 3, 2026-10-17; 18 player-pulls,
  // specs/fury.ts has the numbers). Recklessness moved to fury.ts: it
  // recharges with Rage spent (72s less 1s per 40 Rage fits the log; the
  // fixed 41s sat above the 36.9s shortest interval) and does no damage
  // itself, so a lost use here was worth 0 and never reported. Odyn's Fury
  // is a clean 45s (shortest 45.0–45.9s on four players). Each press logs four
  // casts (385059, then 385060 / 385061 / 385062 within 0.3s); the survey
  // took 385062 for the GCD press, so it's the tracked id, and the lost use
  // is its hits (385060 / 385061 / 385062, 0.2–0.4M a press) less the GCD
  // that filled its place. burstHold: the top Vashnik players press it
  // with Recklessness after each Imbibe, 77–85s apart (Golgatron
  // dp6am4TQhG3cKFxR, 沐川內枯 19WyTrzgQRvdc4Z8, Øuranøse C4Kxpn3FtrvjWMAP).
  "Fury Warrior": [
    { name: "Odyn's Fury", actionIds: [385062], damageIds: [385060, 385061, 385062], cooldownMs: 45_000, charges: 1, firstUseOffsetMs: 3_000, burstHold: true },
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
  // Unholy (the WoWAnalyzer audit's phase 3, 2026-10-17; specs/unholy.ts
  // has the numbers): neither deals damage under its own id (Dark
  // Transformation's is its window, Army of the Dead's its Abomination and
  // Forbidden Knowledge's Necrotic Coils), so both were worth 0 a use and
  // their drift never showed. Valued by darkTransformationValue and
  // armyOfTheDeadValue.
  "Unholy Death Knight": [
    { name: "Dark Transformation", actionIds: [1233448], cooldownMs: 45_000, charges: 1, firstUseOffsetMs: 4_000, valuePerUse: darkTransformationValue }, // 45.1 / 46.5s, 3.8s
    { name: "Army of the Dead", actionIds: [42650], cooldownMs: 91_000, charges: 1, firstUseOffsetMs: 4_000, valuePerUse: armyOfTheDeadValue },      // 91.1 / 95.2s, 4.0s
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
  // Subtlety (the WoWAnalyzer audit's phase 3, 2026-10-17; specs/subtlety.ts
  // has the numbers): Shadow Blades and Goremaw's Bite were worth 0 a use,
  // their hits logging as 279043 and 426592 / 426593 / 1309309 / 1269217
  // (the last two the echoes of Goremaw's Bite's 14s window; masterData of
  // LckJC7GMhQvD6rdw). Shadow Dance: two charges, 20.0s, the largest fixed
  // recharge every player's casts fit (37 of 41 player-pulls at exactly
  // 20.00s); valued by its window (shadowDanceValue).
  "Subtlety Rogue": [
    { name: "Shadow Blades", actionIds: [121471], cooldownMs: 90_000, charges: 1, firstUseOffsetMs: 5_000, damageIds: [279043] },  // 90.5 / 97.2s, 5.0s
    { name: "Goremaw's Bite", actionIds: [426591], cooldownMs: 45_000, charges: 1, firstUseOffsetMs: 5_000, damageIds: [426592, 426593, 1309309, 1269217] }, // 45.0 / 47.5s, 4.7s
    { name: "Shadow Dance", actionIds: [185313], cooldownMs: 20_000, charges: 2, firstUseOffsetMs: 9_000, valuePerUse: shadowDanceValue },
  ],
  // Feral, re-measured in the WoWAnalyzer audit's phase 3 (2026-10-17;
  // specs/feral.ts's header) on 14 player-pulls of 13 players: shortest /
  // median interval Tiger's Fury 30.0 / 30.8s, Feral Frenzy 30.0 / 32.4s,
  // Convoke the Spirits 120.0 / 125.5s (pressed with Berserk; the survey's
  // 61s was one player on another build), Berserk 120.5 / 124.2s,
  // Incarnation 91.1 / 92.1s. None of them had a value per use: Tiger's
  // Fury, Berserk and Incarnation deal nothing themselves, Convoke's hits
  // log under the spells it casts, and Feral Frenzy's under 274838 (the
  // masterData of X618LRt7hPqzbVJj), so their drift never showed.
  "Feral Druid": [
    { name: "Tiger's Fury", actionIds: [5217], cooldownMs: 30_000, charges: 1, firstUseOffsetMs: 3_000,
      valuePerUse: feralWindowValue(5217, "Tiger's Fury", [106951, 102543]) },
    { name: "Feral Frenzy", actionIds: [274837], cooldownMs: 30_000, charges: 1, firstUseOffsetMs: 6_000, valuePerUse: feralFrenzyValue },
    { name: "Convoke the Spirits", actionIds: [391528], cooldownMs: 120_000, charges: 1, firstUseOffsetMs: 9_000, valuePerUse: convokeValue },
    { name: "Berserk", actionIds: [106951], cooldownMs: 120_000, charges: 1, firstUseOffsetMs: 3_000,
      valuePerUse: feralWindowValue(106951, "Berserk", [5217]) },
    { name: "Incarnation: Avatar of Ashamane", actionIds: [102543], cooldownMs: 91_000, charges: 1, firstUseOffsetMs: 3_000,
      valuePerUse: feralWindowValue(102543, "Incarnation", [5217]) },
  ],
  "Survival Hunter": [   // unverified (1 player)
    { name: "Takedown", actionIds: [1250646], cooldownMs: 61_000, charges: 1, firstUseOffsetMs: 36_000 },  // 61.4 / 62.5s, 35.6s
  ],

  // ── Ranged and casters ─────────────────────────────────────────────
  // Not tracked: Balance's Fury of Elune (19.7 / 25.9s) and Incarnation
  // (20.8 / 104.7s), Elemental's Stormkeeper (38.2 / 48.9s: Ancestors cut
  // it, so wow/specs/ranged.ts judges it with spentCooldownDrift), Fire's Meteor
  // (53.9 / 68.7s), Augmentation's Tip the Scales (47.8 / 64.0s): spread too
  // far (Tip the Scales is 90s, sped by Time Skip and Temporal Burst:
  // wow/specs/augmentation.ts's recovery model; not judged). Demonology's Call Dreadstalkers and Implosion are judged in
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
  // Marksmanship, from the WoWAnalyzer audit's phase 3 (2026-10-17; specs/
  // marksmanship.ts has the measurements):
  // - Trueshot has no hits of its own, so a use was worth 0 and its drift
  //   never showed. trueshotValue prices it: the Moonlight Chakram it
  //   unlocks plus its window's bonus, 0.9–2.9M a use on the samples. It
  //   fires on none of the 61 player-pulls on disk: every player presses it
  //   within a use of on time.
  // - Volley's hits log as 260247, so it is worth 0 here and never fires.
  //   Valued by them (damageIds) it read 227–424k on top players
  //   (Heppishunt MLy7nw8kaW1D394Y 73s held, Storcken 6qVxPcBdCgXrkG8a,
  //   期末考第二 K4x8cMZYVpGCDbJH, Pisslizard ACmXHMFtaPLR9k8w) as on the weaker
  //   (Ákamé 735k, Bechhunt 419k, Shadowmeld 53–320k): top players hold it
  //   to pair with Trueshot (Heppishunt 3:13 → 4:38 with Trueshot 4:38) or
  //   an add wave. Left unvalued; docs/wowa-audit/hunter-marksmanship.md.
  "Marksmanship Hunter": [
    { name: "Volley", actionIds: [260243], cooldownMs: 45_000, charges: 1, firstUseOffsetMs: 4_000 },     // 45.0 / 51.5s, 3.7s
    { name: "Trueshot", actionIds: [288613], cooldownMs: 120_000, charges: 1, firstUseOffsetMs: 4_000, burstHold: true, valuePerUse: trueshotValue },  // 120.3 / 132.5s, 4.0s
  ],
  "Shadow Priest": [
    // Halo hits under 390964 and Voidform deals nothing of its own, so both
    // were worth 0 a use and their drift never showed (the WoWAnalyzer
    // audit's phase 3, 2026-10-17; specs/shadow.ts). Both are pressed at
    // Vashnik's Imbibes by the top players: burstHold.
    { name: "Halo", actionIds: [120644], damageIds: [390964], prePullEvidenceIds: [390964], cooldownMs: 60_000, charges: 1, firstUseOffsetMs: 6_000, burstHold: true },           // 60.6 / 62.9s, 6.0s
    { name: "Voidform", actionIds: [228260], cooldownMs: 120_000, charges: 1, firstUseOffsetMs: 8_000, burstHold: true, valuePerUse: voidformValue },      // 120.6 / 126.9s, 7.2s
    { name: "Void Torrent", actionIds: [263165], cooldownMs: 30_000, charges: 1, firstUseOffsetMs: 11_000 },  // 30.0 / 33.5s, 10.8s
  ],
  // Enhancement (the WoWAnalyzer audit's phase 3, 2026-10-17; 23
  // player-pulls, specs/enhancement.ts has the numbers): Ascendance
  // shortest 120.0s (median 120–180s: the top Vashnik players hold it for
  // the Imbibes, burstHold), first press median 3.0s; Voltaic Blaze a fixed
  // 10.0s (shortest 9.98–10.13s on 22 of 23), first press median 0.6s.
  // Neither has hits of its own worth pricing a use by (Ascendance deals
  // 29–106k; its window is the value), so both take valuePerUse. Doom Winds
  // isn't pressed by anyone (Ascendance and spenders give it).
  "Enhancement Shaman": [
    { name: "Ascendance", actionIds: [114051], cooldownMs: 120_000, charges: 1, firstUseOffsetMs: 6_000, burstHold: true, valuePerUse: ascendanceValue },
    { name: "Voltaic Blaze", actionIds: [470057], cooldownMs: 10_000, charges: 1, firstUseOffsetMs: 3_000, burstHold: true, valuePerUse: voltaicBlazeValue },
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
  // Summon Infernal and Malevolence were worth 0 a use until the WoWAnalyzer
  // audit's phase 3 (2026-10-17): neither has hits under its cast id, so
  // their drift never reported. Valued in specs/destruction.ts (the
  // Infernal pet, Awakening and Crashing Chaos; Malevolence's hit and its
  // Chaos Bolt bonus). 34 player-pulls: shortest Infernal interval 90.0s,
  // Malevolence 60.0s.
  "Destruction Warlock": [
    { name: "Summon Infernal", actionIds: [1122], cooldownMs: 90_000, charges: 1, firstUseOffsetMs: 2_000, valuePerUse: infernalValue },   // 90.2s here, 1.8s
    { name: "Malevolence", actionIds: [442726], cooldownMs: 60_000, charges: 1, firstUseOffsetMs: 3_000, valuePerUse: malevolenceValue },  // 60.0s (bars), 2.8s
    { name: "Soul Fire", actionIds: [6353], cooldownMs: 46_000, charges: 1, firstUseOffsetMs: 1_000, prePullEvidenceIds: [6353] },  // 46.7 / 52.3s, 0.4s
  ],
  "Devastation Evoker": [
    // Dragonrage deals nothing under its own id, so a use was worth 0 and its
    // drift never reported; valued since the WoWAnalyzer audit's phase 3
    // (2026-10-17) by its extra Essence Bursts and Pyres (specs/devastation.ts),
    // and seen when pressed before the pull (Mythvoker vRPGT4MN6VALQWFh,
    // Vashnik: first removal at 0:09, first cast 2:01.9).
    { name: "Dragonrage", actionIds: [375087], cooldownMs: 120_000, charges: 1, firstUseOffsetMs: 3_000,   // 120.0 / 122.5s, 2.8s
      prePullStatusIds: [375087], burstHold: true, valuePerUse: dragonrageValue },
    // Worth 0 a use (no hits of its own) and left so: it makes one empower
    // instant at full rank, and the top players release theirs at 0.6–1.1s
    // on average, so a use saves about half a GCD (devastation.ts header).
    { name: "Tip the Scales", actionIds: [370553], cooldownMs: 120_000, charges: 1, firstUseOffsetMs: 4_000 }, // 120.7 / 123.4s, 3.0s
  ],
  // Augmentation's Breath of Eons and Time Skip moved to
  // wow/specs/augmentation.ts (the WoWAnalyzer audit's phase 3,
  // 2026-10-17). A fixed recast can't judge them: Time Skip speeds every
  // cooldown elevenfold for its 3s and Tip the Scales' Temporal Burst up to
  // 30%, so Breath's 120s came back in 71–122s and its 74s here invented
  // holds. Neither was worth anything a use here either (Breath's damage
  // logs under 409632, Time Skip has none), so neither ever reported.
  // Devourer's phase 3 (2026-10-17, 9 player-pulls that take it): worth 0 a
  // use, and left so. Its hits log under 1246169 / 1246168, but every
  // player, the 99.9–100th ones too, presses it only 1–3 times a pull (a
  // Void Metamorphosis resets it: shortest interval 43.6s, Felstalker
  // JQVkMCb8T324yWca), holding it 146–210s (Felstalker, Limofans
  // VbAHWZDdPwJBajmx, Vathiondh); valued, it would fire on the top players
  // as on the weak. specs/devourer.ts.
  "Devourer Demon Hunter": [
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
