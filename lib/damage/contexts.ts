// lib/damage/contexts.ts
//
// Boss name → damage context. A boss without one still gets the analysis
// with log-inferred downtime only (lib/damage/analyze.ts).

import type { DamageContext } from "./types";
import { DANCING_MAD_DAMAGE_CONTEXT } from "../mechanics/ffxiv/dancingmad/damage-context";
import { FRU_DAMAGE_CONTEXT } from "../mechanics/ffxiv/fru/damage-context";
import { TYRANT_DAMAGE_CONTEXT } from "../mechanics/ffxiv/arcadion/tyrant-damage-context";
import { LINDWURM_DAMAGE_CONTEXT } from "../mechanics/ffxiv/arcadion/lindwurm-damage-context";
import { LINDWURM_II_DAMAGE_CONTEXT } from "../mechanics/ffxiv/arcadion/lindwurm-2-damage-context";
import { VAMP_FATALE_DAMAGE_CONTEXT } from "../mechanics/ffxiv/arcadion/vamp-fatale-damage-context";
import { RED_HOT_DEEP_BLUE_DAMAGE_CONTEXT } from "../mechanics/ffxiv/arcadion/red-hot-deep-blue-damage-context";
import { DOOMTRAIN_DAMAGE_CONTEXT } from "../mechanics/ffxiv/trials/doomtrain-damage-context";
import { NECRON_DAMAGE_CONTEXT } from "../mechanics/ffxiv/trials/necron-damage-context";
import { ZELENIA_DAMAGE_CONTEXT } from "../mechanics/ffxiv/trials/zelenia-damage-context";
import { ENUO_DAMAGE_CONTEXT } from "../mechanics/ffxiv/trials/enuo-damage-context";
import { QUEEN_ETERNAL_DAMAGE_CONTEXT } from "../mechanics/ffxiv/trials/queen-eternal-damage-context";
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
  "Futures Rewritten": FRU_DAMAGE_CONTEXT,
  "The Tyrant": TYRANT_DAMAGE_CONTEXT,
  "Lindwurm": LINDWURM_DAMAGE_CONTEXT,
  "Lindwurm II": LINDWURM_II_DAMAGE_CONTEXT,
  "Vamp Fatale": VAMP_FATALE_DAMAGE_CONTEXT,
  "Red Hot and Deep Blue": RED_HOT_DEEP_BLUE_DAMAGE_CONTEXT,
  "Doomtrain": DOOMTRAIN_DAMAGE_CONTEXT,
  "Necron": NECRON_DAMAGE_CONTEXT,
  "Zelenia": ZELENIA_DAMAGE_CONTEXT,
  "Enuo": ENUO_DAMAGE_CONTEXT,
  "Queen Eternal": QUEEN_ETERNAL_DAMAGE_CONTEXT,
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
