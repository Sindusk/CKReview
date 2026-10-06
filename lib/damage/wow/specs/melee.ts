// lib/damage/wow/specs/melee.ts
//
// Melee checks (docs/damage-analysis-plan.md, "WoW build order" step 6, third
// role batch, 2026-10-06). Which cooldowns and windows matter was informed
// by WoWAnalyzer (read, not copied: AGPL); every id is from our own logs
// (lib/damage/wow/spell-data.ts, the status the spec's cooldown puts on
// them). Sample players per spec: Arms 19, Windwalker 10, Havoc 9,
// Retribution 8, Assassination 6, Subtlety 4, Unholy 3, Frost DK 2, Fury 2,
// Feral, Survival and Outlaw 1 each (fewer than 3: unverified).
//
// Every melee spec gets:
// - its main cooldown's window (burstGcdFindings): GCDs that fit vs GCDs
//   pressed. The window's bonus is read from the player's own hits
//   (observedWindowBonus, capped at 30%), so it's inference.
// - its main resource capped (primaryResourceCapFindings): Rage, Fury,
//   Runic Power, Energy or Focus, whichever the player's casts log most;
//   spenders are every cast that logged a cost of it. Energy and Focus
//   regenerate, and their spenders cost them, so most of that waste stays
//   invisible: the check sees only non-spending casts made at the cap.
// Tracked cooldowns are in tracked-cooldowns.ts.

import type { JobCheck } from "../../types";
import { burstGcdFindings, observedWindowBonus, primaryResourceCapFindings } from "./shared";

const window = (statusId: number, name: string): JobCheck => (ctx) => burstGcdFindings(ctx, {
  statusId, name,
  bonus: observedWindowBonus,
  bonusBasis: "the window's bonus read from the player's own hits, inside vs outside, capped at 30%",
  inference: true,
});

// Main cooldown buff per spec (status id as logged on the player).
const MELEE_WINDOWS: Record<string, [number, string]> = {
  "Arms Warrior":           [107574, "Avatar"],
  "Fury Warrior":           [1719, "Recklessness"],
  "Retribution Paladin":    [31884, "Avenging Wrath"],
  "Havoc Demon Hunter":     [162264, "Metamorphosis"],
  "Windwalker Monk":        [123904, "Invoke Xuen"],
  "Frost Death Knight":     [51271, "Pillar of Frost"],
  "Unholy Death Knight":    [1235391, "Dark Transformation"],
  "Assassination Rogue":    [385627, "Kingsbane"],
  "Subtlety Rogue":         [121471, "Shadow Blades"],
  "Outlaw Rogue":           [13750, "Adrenaline Rush"],
  "Feral Druid":            [106951, "Berserk"],
  "Survival Hunter":        [1250646, "Takedown"],
};

export const MELEE_CHECKS: Record<string, JobCheck[]> = Object.fromEntries(
  Object.entries(MELEE_WINDOWS).map(([spec, [id, name]]) => [spec, [window(id, name), primaryResourceCapFindings]]),
);
