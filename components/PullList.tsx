"use client";

import type { Pull } from "@/types/Pull";

type PullListProps = {
  pulls:          Pull[];
  selectedPullId: number | null;
  onSelectPull:   (id: number) => void;
};

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PullList({ pulls, selectedPullId, onSelectPull }: PullListProps) {
  return (
    <div
      style={{
        borderTop:     "1px solid #333",
        paddingTop:    "10px",
        display:       "flex",
        flexDirection: "column",
        minHeight:     0,
        flex:          1,
        overflow:      "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          fontWeight:    "bold",
          marginBottom:  "8px",
          fontSize:      "13px",
          color:         "#ccc",
          paddingLeft:   "2px",
          flexShrink:    0,
        }}
      >
        Pulls
        {pulls.length > 0 && (
          <span style={{ color: "#555", fontWeight: "normal", marginLeft: "6px" }}>
            ({pulls.length})
          </span>
        )}
      </div>

      {pulls.length === 0 && (
        <div style={{ color: "#555", fontSize: "12px", paddingLeft: "2px" }}>
          No pull data yet
        </div>
      )}

      {/* Scrollable list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "5px", overflowY: "auto", flex: 1 }}>
        {pulls.map((pull) => {
          const active = pull.id === selectedPullId;
          const isKill = pull.result === "Kill";
          const deaths = pull.deathEvents.length;

          return (
            <button
              key={pull.id}
              onClick={() => onSelectPull(pull.id)}
              style={{
                textAlign:       "left",
                padding:         "8px 10px",
                borderRadius:    "6px",
                border:          active ? "1px solid #3b82f6" : "1px solid #2a2a2a",
                backgroundColor: active ? "#1e293b" : "#111",
                color:           "white",
                cursor:          "pointer",
                flexShrink:      0,
              }}
            >
              {/* Row 1: name + result badge */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontWeight: 600, fontSize: "13px" }}>{pull.name}</span>
                <span
                  style={{
                    fontSize:        "10px",
                    fontWeight:      700,
                    padding:         "2px 6px",
                    borderRadius:    "4px",
                    backgroundColor: isKill ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.12)",
                    color:           isKill ? "#4ade80" : "#f87171",
                    border:          `1px solid ${isKill ? "#166534" : "#7f1d1d"}`,
                    letterSpacing:   "0.04em",
                  }}
                >
                  {isKill ? "KILL" : "WIPE"}
                </span>
              </div>

              {/* Row 2: duration + deaths */}
              <div style={{ display: "flex", gap: "10px", fontSize: "11px", color: "#666" }}>
                <span>⏱ {formatDuration(pull.fightDuration)}</span>
                {deaths > 0
                  ? <span style={{ color: "#ef4444" }}>💀 {deaths} death{deaths !== 1 ? "s" : ""}</span>
                  : <span style={{ color: "#22c55e" }}>✓ No deaths</span>
                }
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
