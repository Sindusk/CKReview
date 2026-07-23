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

const tabButtonStyle = (active: boolean) => ({
  padding: "5px 12px",
  fontSize: "12px",
  fontWeight: 600,
  borderRadius: "5px",
  border: active ? "1px solid #60a5fa66" : "1px solid #333",
  backgroundColor: active ? "#60a5fa18" : "transparent",
  color: active ? "#60a5fa" : "#888",
  cursor: "pointer",
});

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
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1100,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#222",
          padding: "22px",
          borderRadius: "10px",
          width: showMitigation ? wide : "480px",
          maxHeight: "80vh",
          overflowY: "auto",
          color: "white",
          border: "1px solid #444",
          boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <h3 style={{ margin: 0, fontSize: "16px" }}>Mitigation</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: "#888",
              fontSize: "18px",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {showMitigation ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <button style={tabButtonStyle(activeTab === "heatmap")} onClick={() => setActiveTab("heatmap")}>Heatmap</button>
                <button style={tabButtonStyle(activeTab === "review")} onClick={() => setActiveTab("review")}>Review</button>
              </div>

              {/* Heatmap aggregates every loaded pull — the per-pull selector only applies to Review. */}
              {activeTab === "review" && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>Pull</span>
                  <select
                    value={selectedPullId ?? ""}
                    onChange={(e) => setSelectedPullId(Number(e.target.value))}
                    style={{
                      backgroundColor: "#1a1a1a",
                      color: "#e2e8f0",
                      border: "1px solid #444",
                      borderRadius: "5px",
                      padding: "3px 8px",
                      fontSize: "12px",
                    }}
                  >
                    {ffPulls.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} #{p.pullNumber} ({p.result})</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>Plan</span>
                <select
                  value={mitigationPlanId ?? ""}
                  onChange={(e) => onMitigationPlanChange(e.target.value || null)}
                  style={{
                    backgroundColor: "#1a1a1a",
                    color: "#e2e8f0",
                    border: "1px solid #444",
                    borderRadius: "5px",
                    padding: "3px 8px",
                    fontSize: "12px",
                  }}
                >
                  <option value="">None</option>
                  {MITIGATION_PLANS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {!plan ? (
              <p style={{ fontSize: "12px", color: "#94a3b8", margin: "6px 0 0" }}>
                Select a mitigation plan to see how reliably each player is
                landing their assigned mitigations across every loaded pull.
              </p>
            ) : activeTab === "heatmap" ? (
              <>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "12px" }}>
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
                <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "12px" }}>
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
          <p style={{ fontSize: "13px", color: "#ccc", lineHeight: 1.5 }}>
            No FFXIV report loaded. Import a Dancing Mad report to select a
            mitigation plan and see the expected casts mapped onto the roster.
          </p>
        )}
      </div>
    </div>
  );
}
