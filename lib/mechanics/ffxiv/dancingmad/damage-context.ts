// lib/mechanics/ffxiv/dancingmad/damage-context.ts
//
// Dancing Mad's fight context for the damage analysis
// (docs/archive/damage-analysis-plan.md, Layer 2; lib/damage/types.ts DamageContext).
//
// Phase pools are from the first DPS study (docs/dps-analysis.md, method
// step 1): every log showed the same damage total for P2, P3 and P5, so
// those pools are fixed. Only P5's DPS decides the enrage, so a cooldown
// held from an earlier phase into P5 is not drift.
//
// P1 and P4 are threshold checks: Kefka must be under 15% HP when he goes
// untargetable at the end of P1 (phase1.ts "ENRAGE CHECK"), and under 25%
// by his final Ultima Upsurge in P4 (kefka-says.ts header, "PHASE END").
// Neither phase's damage carries over (the next pool is fixed), so once
// he's under the line the rest of the phase is forced: losses there change
// nothing (user, 2026-10-08). The study first read P4's varying total as
// "P4 damage doesn't count" and missed the check. Measured on
// 2T1HzdPKgbhM43am fight 10: P1 under 15% at about +184 (a Paladin rightly
// held the Confiteor chain for P2); P4 under 25% at +859.5, 17.35% at the
// final Upsurge (+868.4).
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

// The HP share Kefka must be under, by phase.
const HP_CHECKS: Record<number, number> = { 1: 0.15, 4: 0.25 };

export const DANCING_MAD_DAMAGE_CONTEXT: DamageContext = {
  encounter: "Dancing Mad",
  phases: {
    1: { note: "Kefka must be under 15% when he goes untargetable" },
    2: { pool: 44_100_000, fixedPool: true, carriesOver: false },
    3: { pool: 75_100_000, fixedPool: true, carriesOver: false, multiTarget: true, note: "Exdeath and Chaos" },
    4: { fixedPool: false, carriesOver: false, note: "Kefka must be under 25% by the final Ultima Upsurge" },
    5: { pool: 56_900_000, fixedPool: true, decidesEnrage: true },
  },
  // Past a check: from the first hit that leaves Kefka under the line to
  // the end of the phase. A pull that never got him there has no window.
  forcedWindows: (pull) => {
    const out: ForcedWindow[] = [];
    for (const [phase, line] of Object.entries(HP_CHECKS)) {
      for (const span of phaseSpans(pull, Number(phase))) {
        const crossed = pull.players
          .flatMap((p) => p.damageDone)
          .filter((e) => e.timestamp >= span.startMs && e.timestamp <= span.endMs
            && e.target === "Kefka" && e.healthAfter !== undefined && e.maxHealth
            && e.healthAfter / e.maxHealth < line)
          .reduce<number | undefined>((min, e) => (min === undefined || e.timestamp < min ? e.timestamp : min), undefined);
        if (crossed !== undefined) out.push({ startMs: crossed, endMs: span.endMs, cause: `P${phase} check passed: Kefka under ${line * 100}%` });
      }
    }
    return out;
  },
  mechanicLabel: (key) => mechanicLabelForKey(key) ?? RULE_KEY_LABELS[key],
};
