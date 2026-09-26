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
import { SeverityIcon, SEVERITY_COLOR } from "@/components/SeverityIcon";
import BrandBanner from "@/components/BrandBanner";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Panel, PanelHeader } from "@/components/ui/Panel";

type StaticInfo = { id: number; name: string; role: "OWNER" | "MEMBER" };

type ReviewSummary = {
  id:        number;
  reportUrl: string;
  label:     string | null;
  addedAt:   string;
  // ISO date the LOG was recorded (StaticReview.reportStartedAt) — null for
  // reviews added before that column existed; those show a dash until
  // they're resynced from a client that has the report open.
  reportStartedAt: string | null;
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
  // Round-tripped from ManageStaticsDialog's "View" link — lets Back land
  // on the session that was open before navigating here (see app/page.tsx's
  // session-restore effect) instead of a blank page. Pre-fills the import
  // box/VODs; re-importing the report itself is still a manual click, same
  // as any other `?session=` link — see that effect's header for why.
  const fromSessionId = useSearchParams().get("session");
  const backHref = fromSessionId ? `/?session=${fromSessionId}` : "/";

  const [staticInfo, setStaticInfo] = useState<StaticInfo | null>(null);
  const [reviews, setReviews] = useState<ReviewSummary[] | null>(null);
  const [pulls, setPulls] = useState<ChartPull[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingPull, setEditingPull] = useState<number | null>(null);
  const [summaryDraft, setSummaryDraft] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [editingReview, setEditingReview] = useState<number | null>(null);
  const [labelDraft, setLabelDraft] = useState("");
  const [pendingRemove, setPendingRemove] = useState<{ review: ReviewSummary; number: number } | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

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

  async function saveLabel(reviewId: number) {
    const label = labelDraft.trim();
    await fetch(`/api/statics/${staticId}/reviews/${reviewId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ label }),
    });
    setEditingReview(null);
    setReviews((prev) => prev?.map((r) => (r.id === reviewId ? { ...r, label: label || null } : r)) ?? null);
    // The chart's hover readout shows reviewLabel too, so keep the
    // separately-fetched pull data in step rather than making the user
    // reload to see the rename take.
    setPulls((prev) => prev?.map((p) => (p.reviewId === reviewId ? { ...p, reviewLabel: label || null } : p)) ?? null);
  }

  // Detaches one review from this static. The DELETE route cascades to that
  // review's pulls and per-player error rows only; the saved session itself
  // and every other review are untouched. Only an owner or the member who
  // added the review may do it — the route enforces that and its message is
  // surfaced here.
  async function removeReview(reviewId: number) {
    setPendingRemove(null);
    setRemoveError(null);
    try {
      const res = await fetch(`/api/statics/${staticId}/reviews/${reviewId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setRemoveError(data.error || "Failed to remove session");
        return;
      }
    } catch {
      setRemoveError("Failed to remove session — check your connection and try again");
      return;
    }
    setReviews((prev) => prev?.filter((r) => r.id !== reviewId) ?? null);
    setPulls((prev) => prev?.filter((p) => p.reviewId !== reviewId) ?? null);
    setExpanded((prev) => {
      const next = new Set(prev);
      next.delete(reviewId);
      return next;
    });
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

  // Same brand band as the review screen, with Back where the burger sits.
  const header = (
    <header style={{ position: "relative", height: "80px", display: "flex", alignItems: "center", padding: "0 20px" }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <BrandBanner height={80} />
      </div>
      <Link href={backHref} className="ck-btn ck-btn--md" style={{ position: "relative" }}>&larr; Back</Link>
    </header>
  );

  if (error) {
    return (
      <div className="ck-app" style={{ minHeight: "100vh" }}>
        {header}
        <div style={{ padding: "40px", color: "#ff8a8a" }}>{error}</div>
      </div>
    );
  }

  const sectionGap = "28px";

  return (
    <div className="ck-app" style={{ minHeight: "100vh" }}>
      {header}

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "28px 20px 48px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "22px" }}>
          <h1 className="ck-panel-title" style={{ fontSize: "28px" }}>{staticInfo?.name ?? "Loading..."}</h1>
          {staticInfo && (
            <span className="ck-badge ck-badge--plain" style={{ color: staticInfo.role === "OWNER" ? "var(--ck-text-gold)" : "var(--ck-text-2)" }}>
              {staticInfo.role === "OWNER" ? "Owner" : "Member"}
            </span>
          )}
        </div>

        <Panel style={{ marginBottom: sectionGap }}>
          <PanelHeader title="Error Trends" />
          <div style={{ padding: "16px 18px 18px" }}>
            {pulls == null ? (
              <p className="ck-dialog-text">Loading chart...</p>
            ) : (
              <StaticErrorChart pulls={pulls} />
            )}
          </div>
        </Panel>

        <Panel style={{ marginBottom: sectionGap }}>
          {Number.isInteger(staticId) && <StaticPlayersPanel staticId={staticId} />}
        </Panel>

        <Panel>
          <PanelHeader title="Sessions" count={sessions ? `(${sessions.length})` : undefined} />
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "12px" }}>
        {removeError && <p className="ck-error-text" style={{ margin: "0 2px" }}>{removeError}</p>}
        {sessions == null ? (
          <p className="ck-dialog-text">Loading sessions...</p>
        ) : sessions.length === 0 ? (
          <p className="ck-dialog-text">No pulls imported yet.</p>
        ) : (
          sessions.map((session, sessionIdx) => {
            const isOpen = expanded.has(session.review.id);
            const isEditingLabel = editingReview === session.review.id;
            const recordedAt = session.review.reportStartedAt;

            return (
              <div key={session.review.id} className={`ck-card${isOpen ? " ck-card--selected" : ""}`} style={{ overflow: "hidden" }}>
                {/* Header is a row, not a single <button>, so the label
                    editor can live inside it — a form control nested in a
                    button is neither valid HTML nor clickable. */}
                <div
                  style={{
                    display:         "flex",
                    alignItems:      "center",
                    justifyContent:  "space-between",
                    gap:             "10px",
                    padding:         "10px 14px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: "1 1 auto" }}>
                    <button
                      onClick={() => toggleSession(session.review.id)}
                      aria-expanded={isOpen}
                      style={{
                        display:     "flex",
                        alignItems:  "center",
                        gap:         "10px",
                        background:  "none",
                        border:      "none",
                        cursor:      "pointer",
                        color:       "var(--ck-text)",
                        fontFamily:  "inherit",
                        padding:     0,
                        textAlign:   "left",
                        flexShrink:  0,
                      }}
                    >
                      <span style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.1s", display: "inline-block", fontSize: "10px", color: "var(--ck-text-gold)" }}>
                        &#9654;
                      </span>
                      <strong style={{ fontSize: "14px" }}>Session {sessionIdx + 1}</strong>
                    </button>

                    {isEditingLabel ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: "1 1 auto", minWidth: 0 }}>
                        <input
                          className="ck-input"
                          value={labelDraft}
                          onChange={(e) => setLabelDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveLabel(session.review.id);
                            if (e.key === "Escape") setEditingReview(null);
                          }}
                          placeholder="e.g. Week 4 progression"
                          style={{ fontSize: "13px", flex: "1 1 auto", minWidth: 0 }}
                          autoFocus
                        />
                        <button className="ck-btn ck-btn--sm ck-btn--primary" onClick={() => saveLabel(session.review.id)}>
                          Save
                        </button>
                        <button className="ck-btn ck-btn--sm" onClick={() => setEditingReview(null)}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => { setEditingReview(session.review.id); setLabelDraft(session.review.label ?? ""); }}
                          title="Rename this session"
                          style={{
                            background:  "none",
                            border:      "none",
                            cursor:      "pointer",
                            padding:     "2px 4px",
                            fontSize:    "13px",
                            fontFamily:  "inherit",
                            color:       session.review.label ? "var(--ck-text-2)" : "var(--ck-text-3)",
                            fontStyle:   session.review.label ? "normal" : "italic",
                            textAlign:   "left",
                            overflow:    "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace:  "nowrap",
                          }}
                        >
                          {session.review.label ? `— ${session.review.label}` : "— add a label"}
                        </button>
                        <span className="ck-count" style={{ flexShrink: 0 }}>{session.pulls.length} pulls</span>
                      </>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                    <span
                      className="ck-num"
                      style={{ fontSize: "11px", color: "var(--ck-text-3)" }}
                      title={
                        recordedAt
                          ? "Date the log was recorded"
                          : "This review predates report-date tracking — resync it from the app to fill this in"
                      }
                    >
                      {recordedAt ? new Date(recordedAt).toLocaleDateString() : "—"}
                    </span>
                    <button
                      className="ck-btn ck-btn--xs ck-btn--danger"
                      onClick={() => setPendingRemove({ review: session.review, number: sessionIdx + 1 })}
                      title="Remove this session from the static"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div style={{ borderTop: "1px solid var(--ck-line-2)", background: "rgba(0,0,0,0.2)" }}>
                    {session.pulls.map((pull) => {
                      const isEditing = editingPull === pull.id;
                      const totalMajor = pull.players.reduce((sum, p) => sum + p.majorCount, 0);
                      const totalMinor = pull.players.reduce((sum, p) => sum + p.minorCount, 0);
                      const durationLabel = formatDuration(pull.raidErrorAtMs ?? pull.durationMs);

                      return (
                        <div key={pull.id} style={{ padding: "9px 16px", borderBottom: "1px solid var(--ck-line)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                            <div className="ck-num" style={{ fontSize: "13px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                              <strong>
                                {pull.bossName} <span style={{ color: "var(--ck-text-gold)" }}>#{pull.pullNumber}</span>
                              </strong>
                              <span className="ck-badge" style={{ color: pull.result === "Kill" ? "#4ade80" : "#f87171" }}>{pull.result}</span>
                              <span style={{ color: SEVERITY_COLOR.Major, fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                <SeverityIcon kind="Major" size={12} /> {totalMajor} Major
                              </span>
                              <span style={{ color: SEVERITY_COLOR.Minor, fontSize: "12px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                <SeverityIcon kind="Minor" size={12} /> {totalMinor} Minor
                              </span>
                              <span style={{ color: "var(--ck-text-3)", fontSize: "12px" }}>
                                {pull.raidErrorAtMs != null ? `wiped at ${durationLabel}` : `lasted ${durationLabel}`}
                              </span>
                            </div>
                            {!isEditing && (
                              <button className="ck-btn ck-btn--xs" onClick={() => startEditingSummary(pull.id, pull.summary ?? null)}>
                                {pull.summary ? "Edit note" : "Add note"}
                              </button>
                            )}
                          </div>

                          {isEditing ? (
                            <div style={{ marginTop: "8px" }}>
                              <textarea
                                className="ck-textarea"
                                value={summaryDraft}
                                onChange={(e) => setSummaryDraft(e.target.value)}
                                placeholder="What happened / went wrong on this pull..."
                                rows={3}
                              />
                              <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                                <button className="ck-btn ck-btn--sm ck-btn--primary" onClick={() => saveSummary(pull)}>
                                  Save
                                </button>
                                <button className="ck-btn ck-btn--sm" onClick={() => setEditingPull(null)}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : pull.summary ? (
                            <p style={{ fontSize: "12px", lineHeight: 1.5, color: "var(--ck-text-2)", margin: "6px 0 0", whiteSpace: "pre-wrap" }}>{pull.summary}</p>
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
        </Panel>
      </div>

      <ConfirmDialog
        open={pendingRemove !== null}
        title="Remove this session?"
        message={
          pendingRemove
            ? `Session ${pendingRemove.number}${pendingRemove.review.label ? ` (${pendingRemove.review.label})` : ""} and its pulls, notes and error counts will be removed from this static. Other sessions are not affected, and the review itself can be added again later.`
            : undefined
        }
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onConfirm={() => pendingRemove && removeReview(pendingRemove.review.id)}
        onCancel={() => setPendingRemove(null)}
      />
    </div>
  );
}
