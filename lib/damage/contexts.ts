// lib/damage/contexts.ts
//
// Boss name → damage context. A boss without one still gets the analysis
// with log-inferred downtime only (lib/damage/analyze.ts).

import type { DamageContext } from "./types";
import { DANCING_MAD_DAMAGE_CONTEXT } from "../mechanics/ffxiv/dancingmad/damage-context";

const CONTEXTS: Record<string, DamageContext> = {
  "Dancing Mad": DANCING_MAD_DAMAGE_CONTEXT,
};

export function getDamageContext(bossName: string): DamageContext | undefined {
  return CONTEXTS[bossName];
}
