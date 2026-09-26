"use client";

// components/MitigationDialog.tsx
//
// "Mitigation" modal opened from the header bar, directly to the left of
// "Strategy". Split out of StrategyDialog.tsx (2026-07) once the Strategy
// dialog took on Black Hole strategy selection — mitigation-plan display and
// raid strategy selection are unrelated concerns that happened to share one
// dialog early on.
//
// Two tabs:
//   - "Heatmap" (2026-07-24, replaces the old static "Plan" tab — see
//     lib/mechanics/ffxiv/dancingmad/mitigation-heatmap.ts's header for the
//     full rationale): aggregates every loaded pull's Review-tab data into
//     one reliability grid — how often did each player actually land their
//     assigned mitigation, across the whole pull history, not just one pull.
//   - "Review": a per-pull audit table — did each player actually hit their
//     assigned mitigation, and when (see MitigationReviewTable.tsx /
//     lib/mechanics/ffxiv/dancingmad/mitigation-review.ts). First-pass
//     prototype; ambiguous sheet terms show "?" rather than a guess.

import { useState } from "react";
import {
  MITIGATION_PLANS,
  getMitigationPlan,
} from "@/lib/mechanics/ffxiv/dancingmad/mitigation-plan";
import { buildMitigationReview } from "@/lib/mechanics/ffxiv/dancingmad/mitigation-review";
import { buildMitigationHeatmap } from "@/lib/mechanics/ffxiv/dancingmad/mitigation-heatmap";
import MitigationReviewTable from "@/components/MitigationReviewTable";
import MitigationHeatmapTable from "@/components/MitigationHeatmapTable";
import { useFFPullSelector } from "@/hooks/useFFPullSelector";
import type { Pull } from "@/types/Pull";
import { Dialog } from "./ui/Dialog";

type MitigationDialogProps = {
  open:     boolean;
  onClose:  () => void;
  pulls: Pull[];
  // The app's globally-selected pull — the dialog's own pull dropdown
  // resets to this every time it opens (see hooks/useFFPullSelector.ts).
  currentPullId: number | null;
  mitigationPlanId: string | null;
  onMitigationPlanChange: (id: string | null) => void;
};

type Tab = "heatmap" | "review";

export default function MitigationDialog({
  open,
  onClose,
  pulls,
  currentPullId,
  mitigationPlanId,
  onMitigationPlanChange,
}: MitigationDialogProps) {
  const plan = getMitigationPlan(mitigationPlanId);
  const [activeTab, setActiveTab] = useState<Tab>("heatmap");

  // Pull selector — resets to the app's current pull every time the dialog
  // opens (see hooks/useFFPullSelector.ts), same pattern as StrategyDialog.
  // Only the Review tab is per-pull; Heatmap aggregates every loaded pull
  // regardless of this selection (kept only so Review has one to fall back
  // to, and so it doesn't reset the moment you flip tabs).
  const { ffPulls, selectedPullId, setSelectedPullId, selectedPull } =
    useFFPullSelector(pulls, open, currentPullId);

  const reviewRows  = selectedPull ? buildMitigationReview(selectedPull, plan) : [];
  const heatmapRows = buildMitigationHeatmap(pulls, plan);

  if (!open) return null;

  const showMitigation = ffPulls.length > 0 && selectedPull !== null;
  const wide = plan ? "min(1200px, 96vw)" : "min(880px, 94vw)";

  return (
    <Dialog
      title="Mitigation"
      width={showMitigation ? wide : "480px"}
      maxHeight="80vh"
      zIndex={1100}
      onBackdropClick={onClose}
      onClose={onClose}
    >
        {showMitigation ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <button className={`ck-tab${activeTab === "heatmap" ? " ck-tab--active" : ""}`} onClick={() => setActiveTab("heatmap")}>Heatmap</button>
                <button className={`ck-tab${activeTab === "review" ? " ck-tab--active" : ""}`} onClick={() => setActiveTab("review")}>Review</button>
              </div>

              {/* Heatmap aggregates every loaded pull — the per-pull selector only applies to Review. */}
              {activeTab === "review" && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span className="ck-label" style={{ margin: 0 }}>Pull</span>
                  <select
                    className="ck-field"
                    value={selectedPullId ?? ""}
                    onChange={(e) => setSelectedPullId(Number(e.target.value))}
                    style={{ padding: "3px 8px" }}
                  >
                    {ffPulls.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} #{p.pullNumber} ({p.result})</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
                <span className="ck-label" style={{ margin: 0 }}>Plan</span>
                <select
                  className="ck-field"
                  value={mitigationPlanId ?? ""}
                  onChange={(e) => onMitigationPlanChange(e.target.value || null)}
                  style={{ padding: "3px 8px" }}
                >
                  <option value="">None</option>
                  {MITIGATION_PLANS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {!plan ? (
              <p className="ck-dialog-text" style={{ margin: "6px 0 0" }}>
                Select a mitigation plan to see how reliably each player is
                landing their assigned mitigations across every loaded pull.
              </p>
            ) : activeTab === "heatmap" ? (
              <>
                <div className="ck-help">
                  Every mitigation-plan mechanic reached in at least one loaded
                  pull, aggregated across ALL of them. Each cell is colored by
                  pass rate — <span style={{ color: "#22c55e" }}>green</span> reliable,{" "}
                  <span style={{ color: "#ef4444" }}>red</span> frequently missed
                  — with an x/y count of hits out of checkable pulls (dead-player
                  and no-effect samples are excluded from the rate). Hover a cell
                  for the exact per-pull breakdown, including real cast timing
                  relative to each pull&apos;s own mechanic hit.
                </div>
                {selectedPull && <MitigationHeatmapTable representativePull={selectedPull} plan={plan} rows={heatmapRows} />}
              </>
            ) : (
              <>
                <div className="ck-help">
                  Every plan mechanic across the whole fight, with a per-player mark:{" "}
                  <span style={{ color: "#4ade80" }}>✓</span> hit,{" "}
                  <span style={{ color: "#f87171" }}>✗</span> missed,{" "}
                  <span style={{ color: "#64748b" }}>?</span> unresolved sheet term (not
                  mapped to a real ability for this job yet), <span style={{ color: "#666" }}>–</span> already
                  dead / just revived, <span style={{ color: "#444" }}>-</span> grayed out —
                  mechanic not reached this pull. Hover a mark for details. First-pass
                  prototype — expect gaps until sheet terms are fully mapped.
                </div>
                {selectedPull && <MitigationReviewTable pull={selectedPull} plan={plan} rows={reviewRows} />}
              </>
            )}
          </div>
        ) : (
          <p className="ck-dialog-text">
            No FFXIV report loaded. Import a Dancing Mad report to select a
            mitigation plan and see the expected casts mapped onto the roster.
          </p>
        )}
    </Dialog>
  );
}
