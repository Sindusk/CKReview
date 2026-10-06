// lib/damage/contexts.ts
//
// Boss name → damage context. A boss without one still gets the analysis
// with log-inferred downtime only (lib/damage/analyze.ts).

import type { DamageContext } from "./types";
import { DANCING_MAD_DAMAGE_CONTEXT } from "../mechanics/ffxiv/dancingmad/damage-context";
import { ENTOMBED_SENTINELS_DAMAGE_CONTEXT } from "../mechanics/wow/va/entombed-sentinels-damage-context";
import { VASHNIK_DAMAGE_CONTEXT } from "../mechanics/wow/va/vashnik-damage-context";
import { SSZORAK_DAMAGE_CONTEXT } from "../mechanics/wow/va/sszorak-damage-context";
import { NYMRISSA_DAMAGE_CONTEXT } from "../mechanics/wow/va/nymrissa-damage-context";
import { NEKZALI_DAMAGE_CONTEXT } from "../mechanics/wow/va/nekzali-damage-context";
import { LOST_EXPLORERS_DAMAGE_CONTEXT } from "../mechanics/wow/va/lost-explorers-damage-context";
import { TWIN_FANGS_DAMAGE_CONTEXT } from "../mechanics/wow/va/twin-fangs-damage-context";
import { COILED_ALTAR_DAMAGE_CONTEXT } from "../mechanics/wow/va/coiled-altar-damage-context";
import { ULATEK_DAMAGE_CONTEXT } from "../mechanics/wow/va/ulatek-damage-context";

const CONTEXTS: Record<string, DamageContext> = {
  "Dancing Mad": DANCING_MAD_DAMAGE_CONTEXT,
  // The Venomous Abyss (WoW)
  "Entombed Sentinels":      ENTOMBED_SENTINELS_DAMAGE_CONTEXT,
  "Vashnik the Malignant":   VASHNIK_DAMAGE_CONTEXT,
  "Sszorak":                 SSZORAK_DAMAGE_CONTEXT,
  "Nymrissa Wavecaller":     NYMRISSA_DAMAGE_CONTEXT,
  "Nek'zali the Soulcoiler": NEKZALI_DAMAGE_CONTEXT,
  "The Lost Explorers":      LOST_EXPLORERS_DAMAGE_CONTEXT,
  "The Twin Fangs":          TWIN_FANGS_DAMAGE_CONTEXT,
  "The Coiled Altar":        COILED_ALTAR_DAMAGE_CONTEXT,
  "Ula'tek":                 ULATEK_DAMAGE_CONTEXT,
};

export function getDamageContext(bossName: string): DamageContext | undefined {
  return CONTEXTS[bossName];
}
