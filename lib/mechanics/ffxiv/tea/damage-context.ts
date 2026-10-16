// lib/mechanics/ffxiv/tea/damage-context.ts
//
// The Epic of Alexander (Ultimate)'s fight context for the damage analysis
// (lib/damage/types.ts DamageContext). Phase 1 only, built 2026-10-16 from
// living-liquid.ts's header and HP measured from players' hits on report
// 1NG4Zah79yKYHCDv (73 pulls, no kill, 27 Phase 1 clears; fetched to 3:00).
// Phases 2-4 have no module yet and get log-inferred downtime only.
//
// - P1 Living Liquid: Cascade (+0:19) splits Living Liquid's 3.36M between
//   it and Liquid Hand (the Hand appears at ~39%). Only Living Liquid has to
//   die; on the 27 clears the raid dealt it 2.02-2.09M and the Hand
//   1.15-1.23M, leaving the Hand at 2.2-4.3% (living-liquid.ts: "Liquid
//   Hand does not also need to die"). The phase is HP-gated, not scripted:
//   Living Liquid reached 1 HP anywhere from 1:49.0 (Pull 73) to 2:03.7
//   (Pull 35), with no slow stretch before it (5% to 1 HP took 12-17s,
//   like 10% to 5%), so no hold. Phase 2 starts ~5s after Living Liquid
//   reaches 1 HP (Pull 47: 1:56.7 -> 2:01.8); damage in that gap changes
//   nothing. The Hand's damage only keeps Hand of Pain's HP gap closed, so
//   P1 is multi-target. The enrage Cascade (~+2:22) never happened on disk.
//   The deciding phase is the fight's last (Perfect Alexander), not P1.
//
// Not built: the doll owners' and the raid's deliberate damage control
// (dolls fed under 25%, balancing the two bosses for Hand of Pain): the log
// can't separate a planned hold from a lazy one.

import type { DamageContext, ForcedWindow } from "../../../damage/types";
import { phaseSpans } from "../../../damage/wow/context-helpers";
import { mechanicLabelForKey } from "../../rule-meta";

// Rule keys with no label in rule-meta.ts, for "gap during X".
const RULE_KEY_LABELS: Record<string, string> = {
  "ffxiv-ll-avoidable":  "Living Liquid avoidables",
  "ffxiv-ll-wave-bait":  "Protean Wave",
  "ffxiv-ll-exhaust":    "Jagd Doll Exhaust",
  "ffxiv-ll-doll-kill":  "Jagd Dolls",
  "ffxiv-ll-hand":       "Hand of Parting / Prayer",
  "ffxiv-ll-pain":       "Hand of Pain",
};

export const TEA_DAMAGE_CONTEXT: DamageContext = {
  encounter: "The Epic of Alexander",
  phases: {
    1: { pool: 3_360_000, fixedPool: true, carriesOver: false, multiTarget: true,
      note: "Living Liquid to 0 (Cascade splits its HP with Liquid Hand, which needn't die); HP-gated, no hold" },
  },
  forcedWindows: (pull) => {
    const out: ForcedWindow[] = [];
    for (const span of phaseSpans(pull, 1)) {
      const dead = pull.players.flatMap((p) => p.damageDone)
        .filter((e) => e.target === "living liquid" && e.timestamp >= span.startMs && e.timestamp <= span.endMs && e.healthAfter !== undefined && e.maxHealth && e.healthAfter / e.maxHealth <= 0.001)
        .reduce<number | undefined>((min, e) => (min === undefined || e.timestamp < min ? e.timestamp : min), undefined);
      if (dead !== undefined && dead < span.endMs) out.push({ startMs: dead, endMs: span.endMs, cause: "P1 over: Living Liquid at 1 HP, waiting for the transition" });
    }
    return out;
  },
  mechanicLabel: (key) => mechanicLabelForKey(key) ?? RULE_KEY_LABELS[key],
};
