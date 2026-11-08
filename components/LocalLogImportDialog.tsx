"use client";

// components/LocalLogImportDialog.tsx
//
// Picks an ACT / IINACT network log (Network_*.log) and the duties in it to
// import (lib/local-log/import.ts). The quick scan reads only zone, director
// and combat lines, then lists each duty visit with its pull count; the
// chosen ones are parsed by the page's import. The file stays in the
// browser.

import { useRef, useState } from "react";
import { Dialog } from "./ui/Dialog";
import { scanLocalLog, type ActZoneVisit } from "@/lib/local-log/import";

function time(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function LocalLogImportDialog({ onClose, onImport }: {
  onClose:  () => void;
  onImport: (file: File, visits: ActZoneVisit[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [visits, setVisits] = useState<ActZoneVisit[] | null>(null);
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(f: File) {
    setFile(f); setVisits(null); setError(null); setProgress(0);
    try {
      const v = await scanLocalLog(f, setProgress);
      setVisits(v);
      setChosen(new Set(v.map((_, i) => i)));
      if (!v.length) setError("No duty pulls found in this log. Is it a Network_*.log from ACT or IINACT?");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setProgress(null);
    }
  }

  const picked = visits?.filter((_, i) => chosen.has(i)) ?? [];

  return (
    <Dialog
      title="Import a local log"
      subtitle="ACT or IINACT network log (Network_*.log). It's read in this browser and never uploaded."
      width="560px"
      onClose={onClose}
      footer={
        <>
          <button className="ck-btn" onClick={onClose}>Cancel</button>
          <button className="ck-btn ck-btn--primary" disabled={!file || !picked.length} onClick={() => file && onImport(file, picked)}>
            Import {picked.length ? `${picked.reduce((n, v) => n + v.pulls, 0)} pulls` : ""}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="ck-btn" onClick={() => inputRef.current?.click()} disabled={progress !== null}>
            {file ? "Choose another file…" : "Choose log file…"}
          </button>
          <span style={{ fontSize: 12, color: "var(--ck-text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {file ? `${file.name} · ${(file.size / 1e6).toFixed(0)} MB` : "In ACT: AppData\\Roaming\\Advanced Combat Tracker\\FFXIVLogs; in IINACT: its log folder"}
          </span>
          <input ref={inputRef} type="file" accept=".log,.txt" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) pick(f); }} />
        </div>
        {progress !== null && <div style={{ fontSize: 13, color: "var(--ck-text-2)" }}>Scanning the log… {Math.round(progress * 100)}%</div>}
        {error && <div style={{ fontSize: 13, color: "#f87171" }}>{error}</div>}
        {visits && visits.length > 0 && (
          <table className="ck-table" style={{ width: "100%" }}>
            <thead><tr><th style={{ width: 28 }} /><th style={{ textAlign: "left" }}>Duty</th><th>Time</th><th>Pulls</th></tr></thead>
            <tbody>
              {visits.map((v, i) => (
                <tr key={`${v.zone}-${v.start}`} style={{ cursor: "pointer" }}
                  onClick={() => setChosen((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; })}>
                  <td><input type="checkbox" checked={chosen.has(i)} readOnly /></td>
                  <td>{v.zone}</td>
                  <td className="ck-num" style={{ textAlign: "center" }}>{time(v.start)}–{time(v.end)}</td>
                  <td className="ck-num" style={{ textAlign: "center" }}>{v.pulls}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Dialog>
  );
}
