"use client";

import { useEffect, useState } from "react";
import type { Vod } from "../types/Vod";

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

  return (
    <div
      style={{
        position:        "fixed",
        inset:            0,
        backgroundColor: "rgba(0,0,0,0.65)",
        display:         "flex",
        justifyContent:  "center",
        alignItems:      "center",
        zIndex:          1000,
        padding:         "24px",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#161616",
          border:          "1px solid #333",
          borderRadius:    "10px",
          boxShadow:       "0 12px 32px rgba(0,0,0,0.5)",
          width:           "min(920px, 100%)",
          maxHeight:       "90vh",
          display:         "flex",
          flexDirection:   "column",
          overflow:        "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "space-between",
            padding:         "16px 20px",
            borderBottom:    "1px solid #2a2a2a",
            backgroundColor: "#1a1a1a",
            flexShrink:      0,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", color: "#f1f5f9" }}>Transcript</h2>
            <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
              {vod.player}&apos;s VOD
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              backgroundColor: "#1f1f1f",
              color:           "#ccc",
              border:          "1px solid #333",
              borderRadius:    "6px",
              padding:         "6px 12px",
              cursor:          "pointer",
              fontSize:        "13px",
            }}
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: "8px 20px 24px" }}>
          {state.status === "loading" && (
            <div style={{ color: "#555", fontSize: "13px", padding: "40px 0", textAlign: "center" }}>
              Loading transcript…
            </div>
          )}

          {state.status === "error" && (
            <div style={{ color: "#555", fontSize: "13px", padding: "40px 0", textAlign: "center" }}>
              {state.message}
            </div>
          )}

          {state.status === "loaded" && state.lines.length === 0 && (
            <div style={{ color: "#555", fontSize: "13px", padding: "40px 0", textAlign: "center" }}>
              Transcript was empty.
            </div>
          )}

          {state.status === "loaded" && state.lines.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
              {state.lines.map((line, i) => (
                <div key={i} style={{ display: "flex", gap: "12px", alignItems: "baseline" }}>
                  <span style={{ color: "#666", fontSize: "11px", minWidth: "48px", flexShrink: 0 }}>
                    {formatTimestamp(line.startMs)}
                  </span>
                  <span style={{ color: "#ccc", fontSize: "13px" }}>
                    {line.text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
