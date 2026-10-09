// lib/mechanics/ffxiv/dancingmad/damage-context.ts
//
// Dancing Mad's fight context for the damage analysis
// (docs/archive/damage-analysis-plan.md, Layer 2; lib/damage/types.ts DamageContext).
//
// Phase pools are from the first DPS study (docs/dps-analysis.md, method
// step 1): every log showed the same damage total for P2, P3 and P5, so
// those pools are fixed. Only P5's DPS decides the enrage, so a cooldown
// held from an earlier phase into P5 is not drift. P1 has its own enrage
// check (the "Missed Enrage Check" rule) but no recorded pool.
//
// P4 is a threshold check: Kefka must be under 25% HP by his final Ultima
// Upsurge (kefka-says.ts header, "PHASE END"), or the phase enrages. Its
// damage doesn't carry into P5 (P5's pool is fixed), so once he's under
// 25% the rest of P4 is forced: losses there change nothing (user,
// 2026-10-08). The study first read P4's varying total as "P4 damage
// doesn't count" and missed the check. Measured on 2T1HzdPKgbhM43am
// fight 10: under 25% at +859.5, 17.35% at the final Upsurge (+868.4).
//
// Forced downtime: the transitions and untargetable stretches come from
// the engine's log-inferred raid downtime. Per-player busy windows (tower
// soakers, debuff carriers, baits) are the next step; until then a gap
// during a mechanic is labelled with it ("during Towers (P5)") but still
// counted.

import type { DamageContext, ForcedWindow } from "../../../damage/types";
import { phaseSpans } from "../../../damage/wow/context-helpers";
import { mechanicLabelForKey } from "../../rule-meta";

// Occurrence keys that are single rules, not grouped mechanics.
const RULE_KEY_LABELS: Record<string, string> = {
  "ffxiv-phase1-hyperdrive-out-of-position": "Hyperdrive",
  "ffxiv-exdeath-thunder3-wrong-tank":       "Thunder III (tankbuster)",
  "ffxiv-exdeath-shockwave-silent-kill":     "Shockwave",
  "ffxiv-uk-apocalypse":                     "Stray Apocalypse",
};

const P4_CHECK_HP = 0.25;

export const DANCING_MAD_DAMAGE_CONTEXT: DamageContext = {
  encounter: "Dancing Mad",
  phases: {
    1: { note: "has its own enrage check" },
    2: { pool: 44_100_000, fixedPool: true, carriesOver: false },
    3: { pool: 75_100_000, fixedPool: true, carriesOver: false, multiTarget: true, note: "Exdeath and Chaos" },
    4: { fixedPool: false, carriesOver: false, note: "Kefka must be under 25% by the final Ultima Upsurge" },
    5: { pool: 56_900_000, fixedPool: true, decidesEnrage: true },
  },
  // P4 past the check: from the first hit that leaves Kefka under 25% to
  // the end of the phase. A pull that never got him there has no window.
  forcedWindows: (pull) => {
    const out: ForcedWindow[] = [];
    for (const span of phaseSpans(pull, 4)) {
      const crossed = pull.players
        .flatMap((p) => p.damageDone)
        .filter((e) => e.timestamp >= span.startMs && e.timestamp <= span.endMs
          && e.target === "Kefka" && e.healthAfter !== undefined && e.maxHealth
          && e.healthAfter / e.maxHealth < P4_CHECK_HP)
        .reduce<number | undefined>((min, e) => (min === undefined || e.timestamp < min ? e.timestamp : min), undefined);
      if (crossed !== undefined) out.push({ startMs: crossed, endMs: span.endMs, cause: "P4 check passed: Kefka under 25%" });
    }
    return out;
  },
  mechanicLabel: (key) => mechanicLabelForKey(key) ?? RULE_KEY_LABELS[key],
};
