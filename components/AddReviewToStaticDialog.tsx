"use client";

// components/AddReviewToStaticDialog.tsx
//
// Attaches the currently-open review session (see app/page.tsx's
// sessionId/sessionReportUrl state) to one of the current user's statics.
// Only persists a pointer (sessionId + a denormalized reportUrl/label) —
// the underlying session in data/sessions/<id>.json is untouched.

import { useEffect, useState } from "react";
import type { Pull } from "@/types/Pull";
import { computeStaticReviewPullData, staticEligiblePulls } from "@/lib/static-review-data";
import { Dialog, Field } from "./ui/Dialog";

type StaticSummary = {
  id:   number;
  name: string;
  role: "OWNER" | "MEMBER";
};

type AddReviewToStaticDialogProps = {
  open:               boolean;
  sessionId:          string | null;
  reportUrl:          string;
  // Epoch ms the log started recording, or null when it isn't known (a
  // sample-data import predating the field). Persisted as the review's
  // reportStartedAt so the static dashboard can date sessions by when they
  // were played rather than when they were added.
  reportStartedAt:    number | null;
  pulls:              Pull[];
  onClose:            () => void;
  onOpenManageStatics: () => void;
};

export default function AddReviewToStaticDialog({
  open,
  sessionId,
  reportUrl,
  reportStartedAt,
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

  // WoW statics track Mythic raid progress only: Normal/Heroic raid pulls
  // and Mythic+ dungeons in the same log are left out.
  const eligiblePulls = staticEligiblePulls(pulls);
  const skippedPulls = pulls.length - eligiblePulls.length;

  async function handleSubmit() {
    if (!sessionId || selectedId == null || eligiblePulls.length === 0) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/statics/${selectedId}/reviews`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          sessionId,
          reportUrl,
          reportStartedAt,
          label: label.trim() || undefined,
          pulls: computeStaticReviewPullData(eligiblePulls),
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
    <Dialog
      title="Add Review To Static"
      width="440px"
      onBackdropClick={onClose}
      footer={
        <>
          <button className="ck-btn ck-btn--md" onClick={onClose}>
            {done ? "Close" : "Cancel"}
          </button>
          {sessionId && !done && statics && statics.length > 0 && (
            <button
              className="ck-btn ck-btn--md ck-btn--primary"
              onClick={handleSubmit}
              disabled={submitting || selectedId == null || eligiblePulls.length === 0}
            >
              {submitting ? (alreadyLinked ? "Resyncing..." : "Adding...") : (alreadyLinked ? "Resync" : "Add")}
            </button>
          )}
        </>
      }
    >
      {!sessionId ? (
        <p className="ck-dialog-text">
          Save some progress first — add a VOD or call a wipe — then this review can be attached to a static.
        </p>
      ) : done ? (
        <p className="ck-dialog-text" style={{ color: "#4ade80" }}>
          {resynced ? "Resynced — pull/error data refreshed from the current session." : "Added."}
        </p>
      ) : statics === null ? (
        <p className="ck-dialog-text">Loading your statics...</p>
      ) : error ? null : statics.length === 0 ? (
        <div>
          <p className="ck-dialog-text" style={{ marginBottom: "14px" }}>
            You don&apos;t have any statics yet.
          </p>
          <button className="ck-btn ck-btn--md ck-btn--primary" onClick={() => { onClose(); onOpenManageStatics(); }}>
            Create a Static
          </button>
        </div>
      ) : (
        <>
          <Field label="Static">
            <select
              className="ck-select"
              value={selectedId ?? ""}
              onChange={e => setSelectedId(Number(e.target.value))}
            >
              {statics.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Label (optional)" style={{ marginBottom: error || skippedPulls > 0 ? "14px" : 0 }}>
            <input
              className="ck-input"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Week 4 progression"
            />
          </Field>

          {skippedPulls > 0 && (
            <p className="ck-dialog-text" style={{ marginBottom: error ? "14px" : 0 }}>
              {eligiblePulls.length === 0
                ? "This log has no Mythic raid pulls — nothing to add. Statics only track Mythic raids."
                : `${eligiblePulls.length} Mythic raid pull${eligiblePulls.length === 1 ? "" : "s"} will be added; ` +
                  `${skippedPulls} Normal/Heroic raid or Mythic+ pull${skippedPulls === 1 ? " is" : "s are"} left out.`}
            </p>
          )}
        </>
      )}

      {error && <p className="ck-error-text" style={{ marginBottom: 0 }}>{error}</p>}
    </Dialog>
  );
}
