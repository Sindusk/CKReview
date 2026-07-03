"use client";

import { useMemo } from "react";
import type { Pull } from "@/types/Pull";
import {
  computePlayerReportStats,
  computePedestal,
  computeRaidTimeline,
} from "@/lib/report-data";
import { getClassColor } from "@/lib/class-colors";
import ReportPedestal from "./report/ReportPedestal";
import ReportTimeline from "./report/ReportTimeline";

const ROLE_COLOR: Record<string, string> = {
  Tank: "#60a5fa",
  Healer: "#4ade80",
  DPS: "#f87171",
};

type ReportDialogProps = {
  open:    boolean;
  onClose: () => void;
  pulls:   Pull[];
};

export default function ReportDialog({ open, onClose, pulls }: ReportDialogProps) {
  const stats = useMemo(() => computePlayerReportStats(pulls), [pulls]);
  const pedestal = useMemo(() => computePedestal(stats), [stats]);
  const timeline = useMemo(() => computeRaidTimeline(pulls), [pulls]);

  if (!open) return null;

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
            <h2 style={{ margin: 0, fontSize: "18px", color: "#f1f5f9" }}>Raid Report</h2>
            <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
              {pulls.length} pull{pulls.length === 1 ? "" : "s"} analyzed
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
          {pulls.length === 0 ? (
            <div style={{ color: "#555", fontSize: "13px", padding: "40px 0", textAlign: "center" }}>
              Import a report to generate the raid review.
            </div>
          ) : (
            <>
              {/* Pedestal */}
              <ReportPedestal players={pedestal} />

              {/* Table */}
              <div style={{ marginTop: "22px" }}>
                <div
                  style={{
                    fontSize:      "11px",
                    color:         "#555",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom:  "8px",
                  }}
                >
                  Player Breakdown
                </div>

                <div style={{ border: "1px solid #262626", borderRadius: "8px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#1c1c1c", color: "#888", textAlign: "left" }}>
                        <th style={thStyle}>Player</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>First Errors</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>First Error %</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>In First 3</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>In First 3 %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.map((p, i) => {
                        const color = getClassColor(p.game, p.className);
                        const roleColor = ROLE_COLOR[p.role] ?? "#aaa";

                        return (
                          <tr
                            key={p.name}
                            style={{
                              backgroundColor: i % 2 === 0 ? "#141414" : "#171717",
                              borderTop:       "1px solid #222",
                            }}
                          >
                            <td style={tdStyle}>
                              <span style={{ color, fontWeight: 600 }}>{p.name}</span>
                              <span style={{ color: roleColor, fontSize: "11px", marginLeft: "8px" }}>
                                {p.role}
                              </span>
                              <span style={{ color: "#555", fontSize: "11px", marginLeft: "6px" }}>
                                {p.className}
                              </span>
                            </td>
                            <td style={{ ...tdStyle, textAlign: "right" }}>{p.firstErrorCount}</td>
                            <td style={{ ...tdStyle, textAlign: "right", color: "#f87171", fontWeight: 600 }}>
                              {p.firstErrorPct.toFixed(1)}%
                            </td>
                            <td style={{ ...tdStyle, textAlign: "right" }}>{p.top3Count}</td>
                            <td style={{ ...tdStyle, textAlign: "right", color: "#fb923c" }}>
                              {p.top3Pct.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Timeline */}
              <div style={{ marginTop: "22px" }}>
                <div
                  style={{
                    fontSize:      "11px",
                    color:         "#555",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom:  "8px",
                  }}
                >
                  Raid Timeline
                </div>
                <ReportTimeline timeline={timeline} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding:    "8px 12px",
  fontWeight: 600,
  fontSize:   "11px",
};

const tdStyle: React.CSSProperties = {
  padding: "7px 12px",
  color:   "#ccc",
};
