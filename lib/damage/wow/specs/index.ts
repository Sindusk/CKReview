// lib/damage/wow/specs/index.ts
//
// Spec key ("<spec> <class>", e.g. "Fire Mage"; lib/damage/wow/game.ts
// jobOf) → that spec's checks, grouped by role in files beside this one the
// way lib/damage/ffxiv/jobs/ groups jobs. Filled in by role batch
// (docs/archive/damage-analysis-plan.md, "WoW build order" step 6): tanks first.
// Rules may be informed by WoWAnalyzer, never copied from it (AGPL).

import type { JobCheck } from "../../types";
import { BLOOD_CHECKS, BREWMASTER_CHECKS, PROT_PALADIN_CHECKS, PROT_WARRIOR_CHECKS } from "./tank";
import { HEALER_CHECKS, HOLY_PRIEST_CHECKS } from "./healer";
import { MELEE_CHECKS } from "./melee";
import { RANGED_CHECKS } from "./ranged";

export const WOW_SPEC_CHECKS: Record<string, JobCheck[]> = {
  ...MELEE_CHECKS,
  ...RANGED_CHECKS,
  "Blood Death Knight":  BLOOD_CHECKS,
  "Protection Paladin":  PROT_PALADIN_CHECKS,
  "Protection Warrior":  PROT_WARRIOR_CHECKS,
  "Brewmaster Monk":     BREWMASTER_CHECKS,
  "Holy Priest":         HOLY_PRIEST_CHECKS,
  "Discipline Priest":   HEALER_CHECKS,
  "Restoration Druid":   HEALER_CHECKS,
  "Holy Paladin":        HEALER_CHECKS,
  "Restoration Shaman":  HEALER_CHECKS,
  "Preservation Evoker": HEALER_CHECKS,
  "Mistweaver Monk":     HEALER_CHECKS,
};
