// lib/damage/wow/specs/ranged.ts
//
// Ranged and caster checks (docs/archive/damage-analysis-plan.md, "WoW build order"
// step 6, last role batch, 2026-10-06). Which cooldowns, DoTs and resources
// matter was informed by WoWAnalyzer (read, not copied: AGPL); every id is
// from our own logs (lib/damage/wow/spell-data.ts). Sample players: Arcane
// 19, Elemental 13, Beast Mastery 11, Balance 11, Shadow 9, Demonology 9,
// Marksmanship 8, Devastation 7, Affliction 6; Augmentation 3, Fire 2,
// Devourer 2, Frost Mage 1, Destruction 1 (under 3: unverified).
//
// - Main cooldown window (burstGcdFindings, bonus read from the hits,
//   inference): Arcane Surge, Combustion, Incarnation, Bestial Wrath,
//   Trueshot, Voidform, Ascendance, Malevolence, Demonic Tyrant,
//   Dragonrage. Frost Mage, Augmentation and Devourer have none here
//   (Icy Veins wasn't cast in the samples; Ebon Might is up 97% of the time).
// - Main resource at the cap (primaryResourceCapFindings): Maelstrom,
//   Insanity, Astral Power, Focus. Mages log only mana; Soul Shards and
//   Essence only on their spenders: not judged.
// - DoT uptime (dotUptimeFindings, from Pull.bossDebuffs): Shadow Word:
//   Pain, Vampiric Touch; Agony, Unstable Affliction, Wither / Corruption;
//   Moonfire, Sunfire; Flame Shock; Destruction's Wither.
// - Cancelled casts are the engine's own check (begin-casts with no cast).
// - Augmentation's support (Ebon Might, Prescience) isn't in the rDPS split
//   yet: WCL credits it its own way and our streams don't carry it.
// Tracked cooldowns are in tracked-cooldowns.ts.

import type { JobCheck } from "../../types";
import { finding } from "../../checks";
import { mergeWindows, overlapMs } from "../../timeline";
import { burstGcdFindings, castTimeProcFindings, dotUptimeFindings, k, observedWindowBonus, primaryResourceCapFindings } from "./shared";

// Backdraft (117828): Conflagrate (17962) adds a stack, max 2; Chaos Bolt
// (116858), Incinerate (29722) and Soul Fire (6353) each take one. Ids and
// the max from qpZx3mWaG7gcDdYB pull 3 (applybuffstack 2, then
// refreshbuff on a Conflagrate at 2).
const backdraft: JobCheck = (ctx) => castTimeProcFindings(ctx, {
  statusId: 117828, name: "Backdraft", maxStacks: 2,
  generatorIds: [17962], consumerIds: [116858, 29722, 6353],
});

// Havoc (80240, a debuff on an enemy, 20s here) copies the player's
// single-target spells onto that enemy, so it belongs on an enemy they're
// NOT attacking. On qpZx3mWaG7gcDdYB pull 3 Wyrmtongues put it on Breath at
// 2:46, then the post-Stasis swap made Breath their main target: 12 of 13
// spells in the window went at the Havoc target and almost nothing was
// copied. The two top Destruction Warlocks on NK1hBtW9rckdjq36 put it on
// the other boss at all 9 of their swaps.
// A window counts when 60%+ of its single-target casts (3+) went at the
// Havoc target and the player hit another enemy within it ±5s. Lost = the
// share aimed at it × the player's average copied damage per window
// (hits on the Havoc target in windows where nothing was aimed at it), ×
// the window's unforced share. Inference: what a proper target would have
// copied.
const HAVOC = 80240;
const HAVOC_SPELLS = new Set([116858, 29722, 17962, 17877, 6353]); // Chaos Bolt, Incinerate, Conflagrate, Shadowburn, Soul Fire
const havocTarget: JobCheck = (ctx) => {
  const ev = (ctx.pull.bossDebuffs ?? []).filter((e) => e.statusId === HAVOC && e.sourceName === ctx.player.name)
    .sort((a, b) => a.timestamp - b.timestamp);
  const wins: { startMs: number; endMs: number; target: string }[] = [];
  for (const e of ev) {
    if (e.status === "applied") wins.push({ startMs: e.timestamp, endMs: ctx.endMs, target: e.targetName });
    else if (e.status === "removed" && wins.length && wins[wins.length - 1].target === e.targetName) wins[wins.length - 1].endMs = e.timestamp;
  }
  const own = ctx.player.damageDone.filter((h) => !h.pet);
  const stats = wins.map((w) => {
    const casts = ctx.player.casts.filter((c) => HAVOC_SPELLS.has(c.abilityId) && c.timestamp >= w.startMs && c.timestamp <= w.endMs);
    const aimed = casts.filter((c) => c.target === w.target).length;
    const onTarget = own.filter((h) => HAVOC_SPELLS.has(h.abilityId) && h.target === w.target && h.timestamp >= w.startMs && h.timestamp <= w.endMs + 2_000)
      .reduce((a, h) => a + (h.amount ?? 0), 0);
    const other = own.some((h) => h.target !== w.target && h.timestamp >= w.startMs - 5_000 && h.timestamp <= w.endMs + 5_000);
    return { w, casts: casts.length, aimed, onTarget, other };
  });
  const clean = stats.filter((x) => x.casts >= 3 && x.aimed === 0);
  if (clean.length < 2) return [];
  const perWindow = clean.reduce((a, x) => a + x.onTarget, 0) / clean.length;
  const forced = mergeWindows(ctx.forced);
  return stats.filter((x) => x.casts >= 3 && x.other && x.aimed / x.casts >= 0.6 && x.w.endMs <= ctx.endMs).map((x) => {
    const len = x.w.endMs - x.w.startMs;
    const unforced = len > 0 ? 1 - overlapMs(x.w.startMs, x.w.endMs, forced) / len : 0;
    const share = x.aimed / x.casts;
    const t = Math.round(x.w.startMs / 1000);
    return finding(ctx, {
      kind: "burst-window", startMs: x.w.startMs, endMs: x.w.endMs, forced: false,
      label: "Havoc on the main target", inference: true,
      lostDamage: share * perWindow * unforced,
      basis: `${x.aimed} of ${x.casts} single-target spells at the Havoc target (${Math.round(share * 100)}%) × ${k(perWindow)} copied per Havoc on another enemy (${clean.length} windows)` +
        (unforced < 1 ? ` × ${Math.round(unforced * 100)}% of the window outside forced time` : ""),
      detail: `Havoc at ${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")} on ${x.w.target}, then ${x.aimed} of ${x.casts} spells went at it: nothing to copy them to`,
    });
  });
};

const window = (statusId: number, name: string): JobCheck => (ctx) => burstGcdFindings(ctx, {
  statusId, name,
  bonus: observedWindowBonus,
  bonusBasis: "the window's bonus read from the player's own hits, inside vs outside, capped at 30%",
  inference: true,
});
const dot = (name: string, ...statusIds: number[]): JobCheck => (ctx) => dotUptimeFindings(ctx, { statusIds, name });

export const RANGED_CHECKS: Record<string, JobCheck[]> = {
  "Arcane Mage":          [window(365362, "Arcane Surge")],
  "Fire Mage":            [window(190319, "Combustion")],
  "Frost Mage":           [],
  "Balance Druid":        [window(102560, "Incarnation"), primaryResourceCapFindings, dot("Moonfire", 164812), dot("Sunfire", 164815)],
  "Beast Mastery Hunter": [window(19574, "Bestial Wrath"), primaryResourceCapFindings],
  "Marksmanship Hunter":  [window(288613, "Trueshot"), primaryResourceCapFindings],
  "Shadow Priest":        [window(194249, "Voidform"), primaryResourceCapFindings, dot("Shadow Word: Pain", 589), dot("Vampiric Touch", 34914)],
  "Elemental Shaman":     [window(1219480, "Ascendance"), primaryResourceCapFindings, dot("Flame Shock", 188389)],
  "Affliction Warlock":   [window(442726, "Malevolence"), dot("Agony", 980), dot("Unstable Affliction", 1259790), dot("Wither / Corruption", 445474, 146739)],
  "Demonology Warlock":   [window(265187, "Demonic Tyrant")],
  "Destruction Warlock":  [window(442726, "Malevolence"), dot("Wither", 445474), backdraft, havocTarget],
  "Devastation Evoker":   [window(375087, "Dragonrage")],
  "Augmentation Evoker":  [],
  "Devourer Demon Hunter": [],
};
