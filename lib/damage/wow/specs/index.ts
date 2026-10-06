// lib/damage/wow/specs/index.ts
//
// Spec key ("<spec> <class>", e.g. "Fire Mage"; lib/damage/wow/game.ts
// jobOf) → that spec's checks, grouped by role in files beside this one the
// way lib/damage/ffxiv/jobs/ groups jobs. Filled in by role batch
// (docs/damage-analysis-plan.md, "WoW build order" step 6): tanks first.
// Rules may be informed by WoWAnalyzer, never copied from it (AGPL).

import type { JobCheck } from "../../types";
import { BLOOD_CHECKS, PROT_PALADIN_CHECKS } from "./tank";

export const WOW_SPEC_CHECKS: Record<string, JobCheck[]> = {
  "Blood Death Knight":  BLOOD_CHECKS,
  "Protection Paladin":  PROT_PALADIN_CHECKS,
};
