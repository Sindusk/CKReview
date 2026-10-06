// lib/damage/ffxiv/jobs/index.ts
//
// Job display name (lib/ffl-job-data.ts) → that job's checks. Filled in by
// role batch (docs/damage-analysis-plan.md, Layer 3): every combat job.

import type { JobCheck } from "../../types";
import { GNB_CHECKS } from "./gnb";
import { DRK_CHECKS } from "./drk";
import { PLD_CHECKS, WAR_CHECKS } from "./pld-war";
import { AST_CHECKS, SCH_CHECKS, SGE_CHECKS, WHM_CHECKS } from "./healer";
import { DRG_CHECKS, MNK_CHECKS, NIN_CHECKS, RPR_CHECKS, SAM_CHECKS, VPR_CHECKS } from "./melee";
import { BRD_CHECKS, DNC_CHECKS, MCH_CHECKS } from "./ranged";
import { BLM_CHECKS, PCT_CHECKS, RDM_CHECKS, SMN_CHECKS } from "./caster";

export const JOB_CHECKS: Record<string, JobCheck[]> = {
  "Gunbreaker":  GNB_CHECKS,
  "Dark Knight": DRK_CHECKS,
  "Paladin":     PLD_CHECKS,
  "Warrior":     WAR_CHECKS,
  "Scholar":     SCH_CHECKS,
  "Astrologian": AST_CHECKS,
  "White Mage":  WHM_CHECKS,
  "Sage":        SGE_CHECKS,
  "Samurai":     SAM_CHECKS,
  "Viper":       VPR_CHECKS,
  "Monk":        MNK_CHECKS,
  "Dragoon":     DRG_CHECKS,
  "Ninja":       NIN_CHECKS,
  "Reaper":      RPR_CHECKS,
  "Dancer":      DNC_CHECKS,
  "Bard":        BRD_CHECKS,
  "Machinist":   MCH_CHECKS,
  "Pictomancer": PCT_CHECKS,
  "Black Mage":  BLM_CHECKS,
  "Summoner":    SMN_CHECKS,
  "Red Mage":    RDM_CHECKS,
};
