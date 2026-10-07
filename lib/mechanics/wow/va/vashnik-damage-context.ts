// lib/mechanics/wow/va/vashnik-damage-context.ts
//
// Vashnik the Malignant's fight context for the damage analysis
// (docs/archive/damage-analysis-plan.md, "WoW build order" step 4;
// lib/damage/types.ts DamageContext). Measured on kGVX7tafBT2pM1N3 pull 19
// (the 438.6s kill), 2026-10-06. The encounter model is vashnik.ts's
// header.
//
// - No log phases and one HP pool (Vashnik). The boss is never
//   untargetable: player damage on him has no gap of 0.8s+ all fight.
//   Imbibe (1284663) isn't a downtime.
// - Plague Froth carriers (debuff 1281913, 6.0s, 5 players per set, never
//   tanks) walk out to aim their waves at the totems. Melee carriers cast at
//   half their usual rate and deal a third of their damage (16 cases); ranged
//   carriers keep casting (0.97). Forced for melee: the debuff plus 2s to walk
//   back.
// - Measured and not forced: Exploding Infection, Stygian Infection, Bile
//   soaks, Congealing Bolt, the Dripping Fangs tank swaps.
// - After each Imbibe, 8 Shrouded Venoms spawn and are burst in 5–20s
//   (44–68% of raid damage); the Burning Venoms are cleaved beside the boss.
//   Not modelled: PhaseContext.multiTarget is per phase, and Vashnik has no
//   phases.
// - Enrage unobserved: no Berserk in a 468s wipe.

import type { DamageContext } from "../../../damage/types";
import { debuffWindows, isMelee } from "../../../damage/wow/context-helpers";

const PLAGUE_FROTH = 1281913;

export const VASHNIK_DAMAGE_CONTEXT: DamageContext = {
  encounter: "Vashnik the Malignant",
  phases: {},
  forcedWindows: (pull) => debuffWindows(pull, [PLAGUE_FROTH], "carrying Plague Froth", { who: isMelee, maxMs: 8_000, tailMs: 2_000 }),
};
