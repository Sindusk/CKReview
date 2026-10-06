// lib/damage/ffxiv/jobs/index.ts
//
// Job display name (lib/ffl-job-data.ts) → that job's checks. Filled in by
// role batch (docs/damage-analysis-plan.md, Layer 3): tanks so far.

import type { JobCheck } from "../../types";
import { GNB_CHECKS } from "./gnb";
import { DRK_CHECKS } from "./drk";
import { PLD_CHECKS, WAR_CHECKS } from "./pld-war";

export const JOB_CHECKS: Record<string, JobCheck[]> = {
  "Gunbreaker":  GNB_CHECKS,
  "Dark Knight": DRK_CHECKS,
  "Paladin":     PLD_CHECKS,
  "Warrior":     WAR_CHECKS,
};
