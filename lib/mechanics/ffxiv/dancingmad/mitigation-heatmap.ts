// lib/mechanics/ffxiv/dancingmad/mitigation-heatmap.ts
//
// Cross-pull aggregate for the Mitigation dialog's new "Heatmap" tab —
// replaces the old static "Plan" tab (2026-07-24). Now that the Review tab
// audits every mechanic against real per-pull data (mitigation-review.ts),
// a static sheet-timeline display is redundant; this instead answers "how
// RELIABLE is each player's mitigation across every pull we've loaded" by
// running buildMitigationReview() once per pull and aggregating the results
// by PlanMechanic object identity — MITIGATION_PLANS is a module-level
// singleton built once from static JSON (mitigation-plan.ts), so the exact
// same PlanMechanic object reference is shared across every
// buildMitigationReview() call for every pull, safe to use as a Map key
// instead of re-deriving a name-based one (which would also break on the
// two genuinely-different-occurrence "same name" cases mitigation-review.ts
// already has to handle, e.g. the two "Light of Judgment" mechanics).
//
// No new detection logic here — reuses buildMitigationReview's boss-cast
// anchoring, buff-check, NO_EFFECT_OVERRIDES, dead-exemption, etc. wholesale
// per pull, so a fix to that module automatically improves this aggregate.

import type { Pull } from "@/types/Pull";
import { type MitigationPlan, type PlanMechanic } from "./mitigation-plan";
import { flattenPhaseMechanics, flattenTankMechanics, type FlatMechanic } from "./mitigation-detection";
import { buildMitigationReview, type MitigationReviewCheck } from "./mitigation-review";

export type HeatmapOutcome = "pass" | "fail" | "exempt" | "unresolved";

export type HeatmapSample = {
  pullNumber: number;
  pullId:     number;
  outcome:    HeatmapOutcome;
  anchorMs:   number;                    // this PULL's real anchor time — differs pull to pull, needed to compute a cast's offset for the tooltip
  checks:     MitigationReviewCheck[];   // per-ability detail (status/abilityName/lastCastMs) for the tooltip
};

export type HeatmapCell = {
  slotLabel:     string;
  tentativeSlot: boolean;
  samples:       HeatmapSample[];        // one entry per pull that reached this mechanic
};

export type HeatmapRow = {
  phaseTitle:     string;
  mech:           PlanMechanic;
  cellsByActorId: Map<number, HeatmapCell>;
};

// Reduces a cell's (possibly multi-ability) checks to ONE outcome for this
// pull's sample:
//   - "fail"       any required ability was genuinely missed — the one case
//                  that should count against the player.
//   - "unresolved" nothing missed, but some check couldn't be resolved to a
//                  real ability (sheet-term gap, not a performance issue) —
//                  excluded from the pass rate, shown in the tooltip only.
//   - "exempt"     every check was "dead" (player couldn't have acted) or
//                  "noEffect" (NO_EFFECT_OVERRIDES — the sheet lied) —
//                  nothing to hold the player to here at all.
//   - "pass"       everything else — every relevant check was a real hit.
function reduceOutcome(checks: MitigationReviewCheck[]): HeatmapOutcome {
  if (checks.some((c) => c.status === "missed")) return "fail";
  if (checks.some((c) => c.status === "unresolved")) return "unresolved";
  const relevant = checks.filter((c) => c.status !== "dead" && c.status !== "noEffect");
  if (relevant.length === 0) return "exempt";
  return "pass";
}

/**
 * Aggregates every loaded FF pull's mitigation-review data into one row per
 * mechanic reached in at least one pull, one cell per (mechanic, player)
 * pair, each holding every pull's sample for it. Empty if there's no plan
 * or no FF pulls loaded.
 */
export function buildMitigationHeatmap(pulls: Pull[], plan: MitigationPlan | null): HeatmapRow[] {
  if (!plan) return [];
  const ffPulls = pulls.filter((p) => p.game === "ffxiv");
  if (ffPulls.length === 0) return [];

  // Canonical mechanic list/order straight from the plan — same source
  // buildMitigationReview itself flattens from, so PlanMechanic references
  // line up exactly.
  const flat: FlatMechanic[] = [...flattenPhaseMechanics(plan), ...flattenTankMechanics(plan)];
  const byMech = new Map<PlanMechanic, { phaseTitle: string; cells: Map<number, HeatmapCell> }>();
  for (const { phaseTitle, mech } of flat) byMech.set(mech, { phaseTitle, cells: new Map() });

  for (const pull of ffPulls) {
    for (const row of buildMitigationReview(pull, plan)) {
      if (!row.reached) continue; // never reached this pull — no sample, not even a "future" placeholder here (this view is retrospective)
      const entry = byMech.get(row.mech);
      if (!entry) continue; // shouldn't happen — same flat list backs both, guard anyway
      for (const [actorId, cell] of row.cellsByActorId) {
        let hc = entry.cells.get(actorId);
        if (!hc) {
          hc = { slotLabel: cell.slotLabel, tentativeSlot: cell.tentativeSlot, samples: [] };
          entry.cells.set(actorId, hc);
        }
        hc.samples.push({
          pullNumber: pull.pullNumber,
          pullId:     pull.id,
          outcome:    reduceOutcome(cell.checks),
          anchorMs:   row.anchorMs,
          checks:     cell.checks,
        });
      }
    }
  }

  const rows: HeatmapRow[] = [];
  for (const { phaseTitle, mech } of flat) {
    const entry = byMech.get(mech)!;
    if (entry.cells.size === 0) continue; // never reached in ANY loaded pull — nothing to show
    rows.push({ phaseTitle, mech, cellsByActorId: entry.cells });
  }
  return rows;
}

/** Pass rate among "countable" samples — exempt/unresolved don't reflect on the player, so excluded from the rate (still visible in the tooltip). */
export function cellPassRate(cell: HeatmapCell): { passed: number; countable: number } {
  const countable = cell.samples.filter((s) => s.outcome === "pass" || s.outcome === "fail");
  const passed = countable.filter((s) => s.outcome === "pass").length;
  return { passed, countable: countable.length };
}
