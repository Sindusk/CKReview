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
import { burstGcdFindings, castTimeProcFindings, dotUptimeFindings, observedWindowBonus, primaryResourceCapFindings } from "./shared";

// Backdraft (117828): Conflagrate (17962) adds a stack, max 2; Chaos Bolt
// (116858), Incinerate (29722) and Soul Fire (6353) each take one. Ids and
// the max from qpZx3mWaG7gcDdYB pull 3 (applybuffstack 2, then
// refreshbuff on a Conflagrate at 2).
const backdraft: JobCheck = (ctx) => castTimeProcFindings(ctx, {
  statusId: 117828, name: "Backdraft", maxStacks: 2,
  generatorIds: [17962], consumerIds: [116858, 29722, 6353],
});

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
  "Destruction Warlock":  [window(442726, "Malevolence"), dot("Wither", 445474), backdraft],
  "Devastation Evoker":   [window(375087, "Dragonrage")],
  "Augmentation Evoker":  [],
  "Devourer Demon Hunter": [],
};
