"use client";

// app/statics/[staticId]/page.tsx
//
// A static's dashboard: the cross-pull error chart (StaticErrorChart) plus
// the list of imported reviews/pulls with editable per-pull notes
// (StaticReviewPull.summary). Reachable from BurgerMenu's "Manage Statics"
// dialog — the "View" link there routes here.

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import StaticErrorChart, { type ChartPull } from "@/components/StaticErrorChart";

type StaticInfo = { id: number; name: string; role: "OWNER" | "MEMBER" };

type ReviewSummary = {
  id:        number;
  reportUrl: string;
  label:     string | null;
  addedAt:   string;
};

export default function StaticDashboardPage() {
  const params = useParams();
  const staticId = Number(params.staticId);

  const [staticInfo, setStaticInfo] = useState<StaticInfo | null>(null);
  const [reviews, setReviews] = useState<ReviewSummary[] | null>(null);
  const [pulls, setPulls] = useState<ChartPull[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingPull, setEditingPull] = useState<number | null>(null);
  const [summaryDraft, setSummaryDraft] = useState("");

  useEffect(() => {
    if (!Number.isInteger(staticId)) return;

    fetch(`/api/statics/${staticId}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Failed to load static"); return; }
        setStaticInfo(data.static);
      })
      .catch(() => setError("Failed to load static"));

    fetch(`/api/statics/${staticId}/reviews`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) setReviews(data.reviews);
      })
      .catch(() => {});

    fetch(`/api/statics/${staticId}/chart-data`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) setPulls(data.pulls);
      })
      .catch(() => {});
  }, [staticId]);

  function startEditingSummary(pullId: number, current: string | null) {
    setEditingPull(pullId);
    setSummaryDraft(current ?? "");
  }

  async function saveSummary(pull: ChartPull) {
    await fetch(`/api/statics/${staticId}/pulls/${pull.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ summary: summaryDraft }),
    });
    setEditingPull(null);
    setPulls((prev) => prev?.map((p) => (p.id === pull.id ? { ...p, summary: summaryDraft || null } : p)) ?? null);
  }

  if (error) {
    return <div style={{ padding: "40px", color: "#f87171" }}>{error}</div>;
  }

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 20px", color: "#eee" }}>
      <div style={{ marginBottom: "20px" }}>
        <Link href="/" style={{ color: "#888", fontSize: "13px", textDecoration: "none" }}>&larr; Back</Link>
        <h1 style={{ margin: "6px 0 0", fontSize: "24px" }}>{staticInfo?.name ?? "Loading..."}</h1>
      </div>

      <div style={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: "10px", padding: "20px", marginBottom: "24px" }}>
        {pulls == null ? (
          <p style={{ fontSize: "13px", color: "#999" }}>Loading chart...</p>
        ) : (
          <StaticErrorChart pulls={pulls} />
        )}
      </div>

      <h2 style={{ fontSize: "18px", marginBottom: "10px" }}>Pulls</h2>
      <div style={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: "10px", padding: "12px" }}>
        {pulls == null || pulls.length === 0 ? (
          <p style={{ fontSize: "13px", color: "#999", padding: "8px" }}>No pulls imported yet.</p>
        ) : (
          pulls.map((pull) => {
            const isEditing = editingPull === pull.id;
            return (
              <div key={pull.id} style={{ padding: "10px 8px", borderBottom: "1px solid #2a2a2a" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: "13px" }}>
                    <strong>{pull.bossName} #{pull.pullNumber}</strong>{" "}
                    <span style={{ color: pull.result === "Kill" ? "#4ade80" : "#999" }}>{pull.result}</span>
                    {pull.reviewLabel && <span style={{ color: "#777" }}> — {pull.reviewLabel}</span>}
                  </div>
                  {!isEditing && (
                    <button
                      onClick={() => startEditingSummary(pull.id, pull.summary ?? null)}
                      style={{ background: "none", border: "1px solid #444", borderRadius: "5px", color: "#aaa", fontSize: "11px", padding: "3px 8px", cursor: "pointer" }}
                    >
                      {pull.summary ? "Edit note" : "Add note"}
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div style={{ marginTop: "8px" }}>
                    <textarea
                      className="ck-input"
                      value={summaryDraft}
                      onChange={(e) => setSummaryDraft(e.target.value)}
                      placeholder="What happened / went wrong on this pull..."
                      rows={3}
                      style={{ width: "100%", resize: "vertical" }}
                    />
                    <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                      <button
                        onClick={() => saveSummary(pull)}
                        style={{ backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "5px", padding: "5px 12px", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingPull(null)}
                        style={{ background: "none", color: "#aaa", border: "1px solid #444", borderRadius: "5px", padding: "5px 12px", fontSize: "12px", cursor: "pointer" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : pull.summary ? (
                  <p style={{ fontSize: "12px", color: "#bbb", marginTop: "6px", whiteSpace: "pre-wrap" }}>{pull.summary}</p>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
