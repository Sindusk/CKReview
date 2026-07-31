"use client";

// app/statics/[staticId]/page.tsx
//
// A static's dashboard: the cross-pull error chart (StaticErrorChart), a
// collapsible per-review ("Session") list of pulls with error counts/notes,
// and the player-identity merge panel (StaticPlayersPanel). Reachable from
// BurgerMenu's "Manage Statics" dialog — the "View" link there routes here.

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import StaticErrorChart, { type ChartPull } from "@/components/StaticErrorChart";
import StaticPlayersPanel from "@/components/StaticPlayersPanel";

type StaticInfo = { id: number; name: string; role: "OWNER" | "MEMBER" };

type ReviewSummary = {
  id:        number;
  reportUrl: string;
  label:     string | null;
  addedAt:   string;
};

type Session = {
  review: ReviewSummary;
  pulls:  ChartPull[];
};

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function groupIntoSessions(pulls: ChartPull[], reviews: ReviewSummary[]): Session[] {
  const reviewById = new Map(reviews.map((r) => [r.id, r]));
  const order: number[] = [];
  const byReview = new Map<number, ChartPull[]>();

  for (const pull of pulls) {
    if (!byReview.has(pull.reviewId)) {
      byReview.set(pull.reviewId, []);
      order.push(pull.reviewId);
    }
    byReview.get(pull.reviewId)!.push(pull);
  }

  return order
    .map((reviewId) => {
      const review = reviewById.get(reviewId);
      if (!review) return null;
      return { review, pulls: byReview.get(reviewId)! };
    })
    .filter((s): s is Session => s !== null);
}

export default function StaticDashboardPage() {
  const params = useParams();
  const staticId = Number(params.staticId);
  // Round-tripped from ManageStaticsDialog's "View" link — lets Back
  // restore the report that was open before navigating here (see
  // app/page.tsx's session-restore effect) instead of landing on a blank
  // page.
  const fromSessionId = useSearchParams().get("session");
  const backHref = fromSessionId ? `/?session=${fromSessionId}&restore=1` : "/";

  const [staticInfo, setStaticInfo] = useState<StaticInfo | null>(null);
  const [reviews, setReviews] = useState<ReviewSummary[] | null>(null);
  const [pulls, setPulls] = useState<ChartPull[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingPull, setEditingPull] = useState<number | null>(null);
  const [summaryDraft, setSummaryDraft] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

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

  const sessions = useMemo(
    () => (pulls && reviews ? groupIntoSessions(pulls, reviews) : null),
    [pulls, reviews]
  );

  function toggleSession(reviewId: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(reviewId)) next.delete(reviewId);
      else next.add(reviewId);
      return next;
    });
  }

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
        <Link href={backHref} style={{ color: "#888", fontSize: "13px", textDecoration: "none" }}>&larr; Back</Link>
        <h1 style={{ margin: "6px 0 0", fontSize: "24px" }}>{staticInfo?.name ?? "Loading..."}</h1>
      </div>

      <div style={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: "10px", padding: "20px", marginBottom: "24px" }}>
        {pulls == null ? (
          <p style={{ fontSize: "13px", color: "#999" }}>Loading chart...</p>
        ) : (
          <StaticErrorChart pulls={pulls} />
        )}
      </div>

      <h2 style={{ fontSize: "18px", marginBottom: "10px" }}>Players</h2>
      <div style={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: "10px", padding: "16px", marginBottom: "24px" }}>
        {Number.isInteger(staticId) && <StaticPlayersPanel staticId={staticId} />}
      </div>

      <h2 style={{ fontSize: "18px", marginBottom: "10px" }}>Sessions</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {sessions == null ? (
          <p style={{ fontSize: "13px", color: "#999" }}>Loading sessions...</p>
        ) : sessions.length === 0 ? (
          <p style={{ fontSize: "13px", color: "#999" }}>No pulls imported yet.</p>
        ) : (
          sessions.map((session, sessionIdx) => {
            const isOpen = expanded.has(session.review.id);
            return (
              <div key={session.review.id} style={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: "10px", overflow: "hidden" }}>
                <button
                  onClick={() => toggleSession(session.review.id)}
                  style={{
                    display:         "flex",
                    alignItems:      "center",
                    justifyContent:  "space-between",
                    width:           "100%",
                    padding:         "12px 16px",
                    background:      "none",
                    border:          "none",
                    cursor:          "pointer",
                    color:           "#eee",
                    textAlign:       "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.1s", display: "inline-block", fontSize: "11px", color: "#888" }}>
                      &#9654;
                    </span>
                    <strong style={{ fontSize: "14px" }}>Session {sessionIdx + 1}</strong>
                    {session.review.label && <span style={{ fontSize: "13px", color: "#aaa" }}>— {session.review.label}</span>}
                    <span style={{ fontSize: "12px", color: "#666" }}>{session.pulls.length} pulls</span>
                  </div>
                  <span style={{ fontSize: "11px", color: "#666" }}>
                    {new Date(session.review.addedAt).toLocaleDateString()}
                  </span>
                </button>

                {isOpen && (
                  <div style={{ borderTop: "1px solid #2a2a2a" }}>
                    {session.pulls.map((pull) => {
                      const isEditing = editingPull === pull.id;
                      const totalMajor = pull.players.reduce((sum, p) => sum + p.majorCount, 0);
                      const totalMinor = pull.players.reduce((sum, p) => sum + p.minorCount, 0);
                      const durationLabel = formatDuration(pull.raidErrorAtMs ?? pull.durationMs);

                      return (
                        <div key={pull.id} style={{ padding: "10px 16px", borderBottom: "1px solid #232323" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                            <div style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                              <strong>{pull.bossName} #{pull.pullNumber}</strong>
                              <span style={{ color: pull.result === "Kill" ? "#4ade80" : "#999" }}>{pull.result}</span>
                              <span style={{ color: "#f87171", fontSize: "12px" }}>{totalMajor} Major</span>
                              <span style={{ color: "#facc15", fontSize: "12px" }}>{totalMinor} Minor</span>
                              <span style={{ color: "#777", fontSize: "12px" }}>
                                {pull.raidErrorAtMs != null ? `wiped at ${durationLabel}` : `lasted ${durationLabel}`}
                              </span>
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
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
