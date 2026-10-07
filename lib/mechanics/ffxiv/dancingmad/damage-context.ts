// lib/mechanics/ffxiv/dancingmad/damage-context.ts
//
// Dancing Mad's fight context for the damage analysis
// (docs/archive/damage-analysis-plan.md, Layer 2; lib/damage/types.ts DamageContext).
//
// Phase pools are from the first DPS study (docs/dps-analysis.md, method
// step 1): every log showed the same damage total for P2, P3 and P5, so
// those pools are fixed. P4's total varies between logs and the P5 pool
// stays fixed, so extra P4 damage is lost: nothing done in P4 changes the
// enrage, and P4 losses are shown as forced. Only P5's DPS decides the
// enrage, so a cooldown held from an earlier phase into P5 is not drift.
// P1 has its own enrage check (the "Missed Enrage Check" rule) but no
// recorded pool.
//
// Forced downtime: the transitions and untargetable stretches come from
// the engine's log-inferred raid downtime, so nothing is listed here yet.
// Per-player busy windows (tower soakers, debuff carriers, baits) are the
// next step; until then a gap during a mechanic is labelled with it
// ("during Towers (P5)") but still counted.

import type { DamageContext } from "../../../damage/types";
import { mechanicLabelForKey } from "../../rule-meta";

// Occurrence keys that are single rules, not grouped mechanics.
const RULE_KEY_LABELS: Record<string, string> = {
  "ffxiv-phase1-hyperdrive-out-of-position": "Hyperdrive",
  "ffxiv-exdeath-thunder3-wrong-tank":       "Thunder III (tankbuster)",
  "ffxiv-exdeath-shockwave-silent-kill":     "Shockwave",
  "ffxiv-uk-apocalypse":                     "Stray Apocalypse",
};

export const DANCING_MAD_DAMAGE_CONTEXT: DamageContext = {
  encounter: "Dancing Mad",
  phases: {
    1: { note: "has its own enrage check" },
    2: { pool: 44_100_000, fixedPool: true, carriesOver: false },
    3: { pool: 75_100_000, fixedPool: true, carriesOver: false, multiTarget: true, note: "Exdeath and Chaos" },
    4: { fixedPool: false, carriesOver: false, damageCounts: false, note: "P4 damage doesn't carry over" },
    5: { pool: 56_900_000, fixedPool: true, decidesEnrage: true },
  },
  mechanicLabel: (key) => mechanicLabelForKey(key) ?? RULE_KEY_LABELS[key],
};
