// lib/mechanics/wow/va/entombed-sentinels-damage-context.ts
//
// Entombed Sentinels' fight context for the damage analysis
// (docs/archive/damage-analysis-plan.md, "WoW build order" step 4;
// lib/damage/types.ts DamageContext). Measured on Mvz3r1AnVKYpdFTH (30
// Mythic wipes), 2026-10-06. The encounter model is entombed-sentinels.ts's
// header.
//
// - Phases: 1 "Stage One: Entombed Sentinels", 2 "Intermission: Vitriolic
//   Stasis", alternating (2 at ~+46s, then every ~104–110s). Two bosses with
//   separate pools (Blood and Breath of Ula'tek), one team each, 40yd+ apart:
//   no cleave between them. The Venom Coagulation adds take ~20% of damage.
// - Vitriolic Stasis (phase 2, boss buffs 1284588 / 1284606; median 15s,
//   6–29s) is 99% damage reduction: hits do ~4 damage. Its damage doesn't
//   count, so the phase is damageCounts false.
// - The bosses rush together ~1.1s before Stasis (their Mark buffs 1284494 /
//   1284503 drop; the median last real hit is 1.3s before), and the teams
//   swap bosses after it (first real hit a median 3.0s after Stasis ends).
//   Forced: phase 2 start − 1.5s, and phase 2 end + 3s.
// - Not forced: Shifting Protovenom and Clinging Murk cost partial movement
//   only (cast rate 0.66–0.86); Unstable Miasma, Blighted Blood and the
//   droplet pickups cost nothing measurable.
// - Berserk (26662) at +420.2 on both bosses (one sample). Stasis heals the
//   lower boss up to the higher, so health has to stay balanced.

import type { DamageContext, ForcedWindow } from "../../../damage/types";
import { phaseSpans } from "../../../damage/wow/context-helpers";

const RUSH_MS = 1_500;
const SWAP_MS = 3_000;

export const ENTOMBED_SENTINELS_DAMAGE_CONTEXT: DamageContext = {
  encounter: "Entombed Sentinels",
  phases: {
    1: { note: "two bosses, one team each" },
    2: { damageCounts: false, note: "Vitriolic Stasis: 99% damage reduction" },
  },
  forcedWindows: (pull) => phaseSpans(pull, 2).flatMap((s): ForcedWindow[] => [
    { startMs: s.startMs - RUSH_MS, endMs: s.startMs, cause: "bosses rushing together (Stasis)" },
    { startMs: s.endMs, endMs: s.endMs + SWAP_MS, cause: "swapping bosses after Stasis" },
  ]),
};
