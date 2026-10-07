// lib/mechanics/wow/va/nymrissa-damage-context.ts
//
// Nymrissa Wavecaller's fight context for the damage analysis
// (docs/archive/damage-analysis-plan.md, "WoW build order" step 4;
// lib/damage/types.ts DamageContext). There is no detection module for this
// boss yet, so this is from the logs alone: the Mythic kill
// rNL38zFGMbyADRTh pull 2 (395.7s), 2026-10-06. (nRGxQ1b8LdMvzC4D pull 1 is
// a Heroic kill.)
//
// - No log phases, one boss, a ~110s rotation (Abyssal Rain, Water Jet,
//   Chilling Frost, Swirling Whirlpools then Pop! 9s later). Each Abyssal
//   Rain adds a Wavecaller's Might stack (an enrage ramp, inferred). No
//   Berserk seen up to 363s.
// - Bubblefin adds take about a third of raid damage: waves of 10–17
//   Shorerunners plus 1–2 Frostscales at +26, +70, +136, +180, +246, +290,
//   +356, alive a median 24s. Multi-target, but the engine's multiTarget is
//   per phase and this fight has none.
// - No forced windows: the raid's cast rate holds at 0.9–1.1 through every
//   mechanic; Swirling Whirlpools dips it to 0.6–0.85 for ~7s (7 samples,
//   weak). Chilling Frost, Frost Orb and Lingering Frost cost little.

import type { DamageContext } from "../../../damage/types";

export const NYMRISSA_DAMAGE_CONTEXT: DamageContext = {
  encounter: "Nymrissa Wavecaller",
  phases: {},
};
