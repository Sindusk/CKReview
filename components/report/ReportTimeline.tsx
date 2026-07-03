"use client";

import type { RaidTimeline } from "@/lib/report-data";
import { formatHMS } from "@/lib/report-data";

export default function ReportTimeline({ timeline }: { timeline: RaidTimeline }) {
  const { segments, totalDurationSec, uptimePct } = timeline;

  if (totalDurationSec <= 0) {
    return (
      <div style={{ color: "#555", fontSize: "13px", padding: "12px 0" }}>
        No pull data yet to build a timeline.
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "11px",
          color: "#777",
          marginBottom: "6px",
        }}
      >
        <span>0:00</span>
        <span>{formatHMS(totalDurationSec)}</span>
      </div>

      <div
        style={{
          display:      "flex",
          width:        "100%",
          height:       "22px",
          borderRadius: "5px",
          overflow:     "hidden",
          border:       "1px solid #2a2a2a",
        }}
      >
        {segments.map((seg, i) => {
          const widthPct = ((seg.endSec - seg.startSec) / totalDurationSec) * 100;
          const isCombat = seg.type === "combat";
          const title = isCombat
            ? `${seg.pull?.name ?? "Pull"} — ${formatHMS(seg.startSec)} to ${formatHMS(seg.endSec)}`
            : `Downtime — ${formatHMS(seg.startSec)} to ${formatHMS(seg.endSec)}`;

          return (
            <div
              key={i}
              title={title}
              style={{
                width:      `${widthPct}%`,
                minWidth:   widthPct > 0 ? "1px" : 0,
                height:     "100%",
                background: isCombat ? "#22c55e" : "#333",
                borderRight: i < segments.length - 1 ? "1px solid #121212" : "none",
              }}
            />
          );
        })}
      </div>

      <div
        style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          marginTop:      "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "11px", color: "#888" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#22c55e", display: "inline-block" }} />
            Combat
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "2px", background: "#333", display: "inline-block" }} />
            Downtime
          </span>
        </div>

        <div style={{ fontSize: "13px", fontWeight: 700, color: "#4ade80" }}>
          {uptimePct.toFixed(1)}% raid uptime
        </div>
      </div>
    </div>
  );
}
