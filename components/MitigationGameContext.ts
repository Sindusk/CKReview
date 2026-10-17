// components/MitigationGameContext.ts
//
// The mitigation catalog the Mitigation dialog's views work with: the one
// resolved for the boss's sync level (lib/mitigation/ffxiv-catalog.ts
// ffxivMitigationAt), so a TEA pull's sheet, icons and suggestions say
// Vengeance where a level-100 pull says Damnation. MitigationDialog
// provides it; the level cap's catalog is the default.

import { createContext, useContext } from "react";
import { FFXIV_MITIGATION } from "@/lib/mitigation/ffxiv-catalog";
import type { MitigationGame } from "@/lib/mitigation/types";

export const MitigationGameContext = createContext<MitigationGame>(FFXIV_MITIGATION);

export function useMitigationGame(): MitigationGame {
  return useContext(MitigationGameContext);
}
