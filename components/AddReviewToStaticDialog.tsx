"use client";

// components/AddReviewToStaticDialog.tsx
//
// Attaches the currently-open review session (see app/page.tsx's
// sessionId/sessionReportUrl state) to one of the current user's statics.
// Only persists a pointer (sessionId + a denormalized reportUrl/label) —
// the underlying session in data/sessions/<id>.json is untouched.

import { useEffect, useState } from "react";
import type { Pull } from "@/types/Pull";
import { computeStaticReviewPullData } from "@/lib/static-review-data";

type StaticSummary = {
  id:   number;
  name: string;
  role: "OWNER" | "MEMBER";
};

type AddReviewToStaticDialogProps = {
  open:               boolean;
  sessionId:          string | null;
  reportUrl:          string;
  pulls:              Pull[];
  onClose:            () => void;
  onOpenManageStatics: () => void;
};

export default function AddReviewToStaticDialog({
  open,
  sessionId,
  reportUrl,
  pulls,
  onClose,
  onOpenManageStatics,
}: AddReviewToStaticDialogProps) {
  const [statics, setStatics] = useState<StaticSummary[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [resynced, setResynced] = useState(false);
  // Whether `sessionId` is already linked to the currently-selected static —
  // checked per-static (not just once) since switching the dropdown can
  // move from "new" to "already linked" or back. Drives the Add/Resync
  // button label so it's clear up front which one is about to happen.
  const [alreadyLinked, setAlreadyLinked] = useState(false);

  useEffect(() => {
    if (!open) return;

    setError(null);
    setDone(false);
    setLabel("");

    fetch("/api/statics")
      .then(async res => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to load your statics");
          setStatics([]);
          return;
        }
        setStatics(data.statics);
        setSelectedId(data.statics[0]?.id ?? null);
      })
      .catch(() => setError("Failed to load your statics"));
  }, [open]);

  useEffect(() => {
    if (!open || selectedId == null || !sessionId) {
      setAlreadyLinked(false);
      return;
    }

    let cancelled = false;
    fetch(`/api/statics/${selectedId}/reviews`)
      .then(async res => {
        const data = await res.json();
        if (!res.ok || cancelled) return;
        const reviews: { sessionId: string }[] = data.reviews ?? [];
        setAlreadyLinked(reviews.some(r => r.sessionId === sessionId));
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [open, selectedId, sessionId]);

  if (!open) return null;

  async function handleSubmit() {
    if (!sessionId || selectedId == null) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/statics/${selectedId}/reviews`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          sessionId,
          reportUrl,
          label: label.trim() || undefined,
          pulls: computeStaticReviewPullData(pulls),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to add review");
        return;
      }

      setResynced(!!data.resynced);
      setDone(true);
    } catch {
      setError("Failed to add review — check your connection and try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#222",
          padding: "24px",
          borderRadius: "10px",
          width: "420px",
          color: "white",
          border: "1px solid #444",
          boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: "16px", fontSize: "20px" }}>Add Review To Static</h2>

        {!sessionId ? (
          <p style={{ fontSize: "13px", color: "#ccc" }}>
            Save some progress first — add a VOD or call a wipe — then this review can be attached to a static.
          </p>
        ) : done ? (
          <p style={{ fontSize: "13px", color: "#4ade80" }}>
            {resynced ? "Resynced — pull/error data refreshed from the current session." : "Added."}
          </p>
        ) : statics === null ? (
          <p style={{ fontSize: "13px", color: "#999" }}>Loading your statics...</p>
        ) : error ? null : statics.length === 0 ? (
          <div>
            <p style={{ fontSize: "13px", color: "#ccc", marginBottom: "14px" }}>
              You don't have any statics yet.
            </p>
            <button
              onClick={() => { onClose(); onOpenManageStatics(); }}
              style={{
                backgroundColor: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "6px",
                padding: "8px 14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Create a Static
            </button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#ddd" }}>
                Static
              </label>
              <select
                className="ck-input"
                value={selectedId ?? ""}
                onChange={e => setSelectedId(Number(e.target.value))}
              >
                {statics.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#ddd" }}>
                Label (optional)
              </label>
              <input
                className="ck-input"
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="e.g. Week 4 progression"
              />
            </div>
          </>
        )}

        {error && (
          <p style={{ color: "#f87171", fontSize: "12px", marginBottom: "10px" }}>{error}</p>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: "#2f2f2f",
              color: "#f3f4f6",
              border: "1px solid #555",
              borderRadius: "6px",
              padding: "8px 14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {done ? "Close" : "Cancel"}
          </button>
          {sessionId && !done && statics && statics.length > 0 && (
            <button
              onClick={handleSubmit}
              disabled={submitting || selectedId == null}
              style={{
                backgroundColor: "#2563eb",
                color: "white",
                border: "none",
                borderRadius: "6px",
                padding: "8px 14px",
                fontWeight: 600,
                cursor: submitting ? "default" : "pointer",
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? (alreadyLinked ? "Resyncing..." : "Adding...") : (alreadyLinked ? "Resync" : "Add")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
