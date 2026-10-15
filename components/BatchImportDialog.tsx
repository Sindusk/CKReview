"use client";

// components/BatchImportDialog.tsx
//
// Adds several reports to a static in one go, one after another: each is
// imported on the review screen exactly as a manual Import would (same
// detection, the log's saved session adopted when one exists), then posted
// to the static the way AddReviewToStaticDialog does. A report the static
// already holds is resynced (the reviews route upserts by session).
// The page supplies `runItem`; this dialog only keeps the queue and shows
// each row's state.
//
// "Load this static's sessions" fills the queue with every session already
// in the static, each pinned to its own saved session, for a full resync
// (e.g. to give old sessions per-error detail).
//
// Every fetch here is the user's Start click; the queue stops at the first
// rate-limit error so the rest isn't burned on failures.

import { useEffect, useRef, useState } from "react";
import { parseLogUrl } from "@/lib/url-parsers";
import { Dialog, Field } from "./ui/Dialog";

export type BatchItem = {
  url:        string;
  // Pin to this saved session (a resync of a static's session); otherwise
  // the log's earliest saved session is adopted, or a new one is made.
  sessionId?: string;
};

export type BatchOutcome = "added" | "resynced";

type RowState =
  | { kind: "queued" }
  | { kind: "running" }
  | { kind: "done"; outcome: BatchOutcome }
  | { kind: "failed"; error: string }
  | { kind: "skipped"; reason: string };

type Row = { item: BatchItem; code: string | null; state: RowState };

type StaticSummary = { id: number; name: string };

export default function BatchImportDialog({ open, onClose, initialStaticId, runItem, progress }: {
  open:             boolean;
  onClose:          () => void;
  initialStaticId?: number | null;
  runItem:          (item: BatchItem, staticId: number) => Promise<BatchOutcome>;
  // The running import's progress line (the page's import bar), shown on
  // the active row.
  progress:         { percent: number; status: string | null };
}) {
  const [statics, setStatics] = useState<StaticSummary[] | null>(null);
  const [staticId, setStaticId] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stopRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    fetch("/api/statics")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Failed to load your statics"); setStatics([]); return; }
        setStatics(data.statics);
        const wanted = data.statics.find((s: StaticSummary) => s.id === initialStaticId);
        setStaticId(wanted?.id ?? data.statics[0]?.id ?? null);
      })
      .catch(() => setError("Failed to load your statics"));
  }, [open, initialStaticId]);

  if (!open) return null;

  // One report per line (or separated by spaces/commas); duplicates of the
  // same report dropped, keeping the first.
  function queueFromText(): Row[] {
    const seen = new Set<string>();
    const out: Row[] = [];
    for (const raw of text.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean)) {
      const parsed = parseLogUrl(raw);
      const key = parsed ? `${parsed.source}:${parsed.code}` : raw;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ item: { url: raw }, code: parsed?.code ?? null, state: parsed ? { kind: "queued" } : { kind: "skipped", reason: "Not a WarcraftLogs or FFLogs report URL" } });
    }
    return out;
  }

  async function loadStaticSessions() {
    if (staticId == null) return;
    setError(null);
    try {
      const res = await fetch(`/api/statics/${staticId}/reviews`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to load the static's sessions"); return; }
      // Oldest first, so a long resync works forward through the static.
      const reviews: { sessionId: string; reportUrl: string }[] = [...(data.reviews ?? [])].reverse();
      setText("");
      setRows(reviews.map((r) => ({
        item:  { url: r.reportUrl, sessionId: r.sessionId },
        code:  parseLogUrl(r.reportUrl)?.code ?? null,
        state: parseLogUrl(r.reportUrl) ? { kind: "queued" } : { kind: "skipped", reason: "Stored URL isn't a report URL" },
      })));
    } catch {
      setError("Failed to load the static's sessions");
    }
  }

  async function start() {
    if (staticId == null) return;
    const queue = rows.length > 0 && rows.some((r) => r.state.kind === "queued") ? rows : queueFromText();
    if (queue.length === 0) { setError("Paste at least one report URL."); return; }
    setRows(queue);
    setError(null);
    setRunning(true);
    stopRef.current = false;
    const set = (i: number, state: RowState) => setRows((prev) => prev.map((r, j) => (j === i ? { ...r, state } : r)));
    for (let i = 0; i < queue.length; i++) {
      if (queue[i].state.kind !== "queued") continue;
      if (stopRef.current) break;
      set(i, { kind: "running" });
      try {
        const outcome = await runItem(queue[i].item, staticId);
        set(i, { kind: "done", outcome });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        set(i, { kind: "failed", error: msg });
        // Out of points (or signed out): the rest would only fail too.
        if (/quota|rate limit|points|connect|authenticat|usage notice|login required/i.test(msg)) { setError("Stopped: the rest would fail the same way."); break; }
      }
    }
    setRunning(false);
  }

  const queued = rows.filter((r) => r.state.kind === "queued").length;
  const finished = rows.filter((r) => r.state.kind === "done").length;
  const failed = rows.filter((r) => r.state.kind === "failed").length;
  const canStart = !running && staticId != null && (queued > 0 || (rows.length === 0 && text.trim().length > 0));

  return (
    <Dialog
      title="Batch import to a static"
      width="620px"
      maxHeight="88vh"
      onBackdropClick={running ? undefined : onClose}
      onClose={running ? undefined : onClose}
      footer={
        <>
          {running
            ? <button className="ck-btn ck-btn--md" onClick={() => { stopRef.current = true; }}>Stop after this one</button>
            : <button className="ck-btn ck-btn--md" onClick={onClose}>Close</button>}
          {!running && rows.length > 0 && (
            <button className="ck-btn ck-btn--md" onClick={() => setRows([])}>Clear list</button>
          )}
          <button className="ck-btn ck-btn--md ck-btn--primary" onClick={start} disabled={!canStart}>
            {running ? "Importing…" : queued > 0 ? `Import ${queued}` : "Start"}
          </button>
        </>
      }
    >
      {statics === null ? (
        <p className="ck-dialog-text">Loading your statics...</p>
      ) : statics.length === 0 ? (
        <p className="ck-dialog-text">You don&apos;t have any statics yet. Create one from the menu first.</p>
      ) : (
        <>
          <p className="ck-dialog-text" style={{ marginTop: 0 }}>
            Each report is imported in turn, as if you pressed Import, then added to the static. Reports already in
            the static are resynced. Each import uses your API points, and the review screen ends on the last report.
          </p>
          <Field label="Static">
            <div style={{ display: "flex", gap: "8px" }}>
              <select className="ck-select" value={staticId ?? ""} disabled={running}
                onChange={(e) => { setStaticId(Number(e.target.value)); setRows([]); }} style={{ flex: 1 }}>
                {statics.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button className="ck-btn ck-btn--md" onClick={loadStaticSessions} disabled={running || staticId == null}
                title="Queue every session already in this static, to resync them all">
                Resync all its sessions
              </button>
            </div>
          </Field>
          {rows.length === 0 ? (
            <Field label="Reports (one URL per line)" style={{ marginBottom: 0 }}>
              <textarea className="ck-textarea" rows={7} value={text} onChange={(e) => setText(e.target.value)}
                placeholder={"https://www.fflogs.com/reports/AbCd1234…\nhttps://www.warcraftlogs.com/reports/…"} />
            </Field>
          ) : (
            <div>
              <div className="ck-label" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{rows.length} report{rows.length === 1 ? "" : "s"}</span>
                <span className="ck-num">{finished} done{failed ? ` · ${failed} failed` : ""}{queued ? ` · ${queued} to go` : ""}</span>
              </div>
              <div style={{ maxHeight: "46vh", overflowY: "auto", border: "1px solid var(--ck-line-2)", borderRadius: 4 }}>
                {rows.map((r, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "150px minmax(0, 1fr)", gap: "10px", padding: "6px 10px", borderTop: i ? "1px solid var(--ck-line)" : undefined, fontSize: "12px" }}>
                    <span className="ck-num" style={{ color: "var(--ck-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.item.url}>
                      {r.code ?? r.item.url}
                    </span>
                    <RowStatus state={r.state} progress={progress} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
      {error && <p className="ck-error-text" style={{ marginBottom: 0 }}>{error}</p>}
    </Dialog>
  );
}

function RowStatus({ state, progress }: { state: RowState; progress: { percent: number; status: string | null } }) {
  switch (state.kind) {
    case "queued":  return <span style={{ color: "var(--ck-text-3)" }}>Queued</span>;
    case "running": return <span style={{ color: "#7dd3fc" }}>{progress.status ?? "Importing…"} <span className="ck-num">{Math.max(0, progress.percent)}%</span></span>;
    case "done":    return <span style={{ color: "#4ade80" }}>{state.outcome === "resynced" ? "Resynced" : "Added"}</span>;
    case "failed":  return <span style={{ color: "#f87171" }} title={state.error}>Failed: {state.error}</span>;
    case "skipped": return <span style={{ color: "var(--ck-text-3)" }}>Skipped: {state.reason}</span>;
  }
}
