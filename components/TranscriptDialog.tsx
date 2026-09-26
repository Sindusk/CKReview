"use client";

import { useEffect, useState } from "react";
import type { Vod } from "../types/Vod";
import { Dialog } from "./ui/Dialog";

type TranscriptLine = {
  startMs: number;
  text:    string;
};

type TranscriptState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; lines: TranscriptLine[] };

type TranscriptDialogProps = {
  vod:     Vod | null;
  onClose: () => void;
};

function formatTimestamp(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function TranscriptDialog({ vod, onClose }: TranscriptDialogProps) {
  const [state, setState] = useState<TranscriptState>({ status: "loading" });

  useEffect(() => {
    if (!vod) return;

    let cancelled = false;
    setState({ status: "loading" });

    (async () => {
      try {
        const res = await fetch(`/api/transcript/${vod.videoId}`);
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          setState({ status: "error", message: data.error ?? "Failed to load transcript" });
          return;
        }
        setState({ status: "loaded", lines: data.lines ?? [] });
      } catch {
        if (!cancelled) {
          setState({ status: "error", message: "Failed to load transcript" });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [vod?.videoId]);

  if (!vod) return null;

  const statusStyle = { color: "var(--ck-text-3)", fontSize: "13px", padding: "40px 0", textAlign: "center" } as const;

  return (
    <Dialog
      title="Transcript"
      subtitle={<>{vod.player}&apos;s VOD</>}
      width="min(920px, 100%)"
      onBackdropClick={onClose}
      onClose={onClose}
      bodyStyle={{ padding: "8px 20px 24px" }}
    >
      {state.status === "loading" && <div style={statusStyle}>Loading transcript…</div>}

      {state.status === "error" && <div style={statusStyle}>{state.message}</div>}

      {state.status === "loaded" && state.lines.length === 0 && (
        <div style={statusStyle}>Transcript was empty.</div>
      )}

      {state.status === "loaded" && state.lines.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
          {state.lines.map((line, i) => (
            <div key={i} style={{ display: "flex", gap: "12px", alignItems: "baseline" }}>
              <span className="ck-num" style={{ color: "var(--ck-text-gold)", opacity: 0.8, fontSize: "11px", minWidth: "48px", flexShrink: 0 }}>
                {formatTimestamp(line.startMs)}
              </span>
              <span style={{ color: "var(--ck-text)", fontSize: "13px", lineHeight: 1.5 }}>
                {line.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </Dialog>
  );
}
