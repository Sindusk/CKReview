"use client";

import { useMemo } from "react";
import type { Pull } from "@/types/Pull";
import {
  computePlayerReportStats,
  computePedestal,
  computeRaidTimeline,
  formatHMS,
  type PlayerReportStats,
  type RaidTimeline,
} from "@/lib/report-data";
import { getClassColor, getRoleColor, formatClassName, getPlayerSpecIcon } from "@/lib/player-display";

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
              <Pedestal players={pedestal} />

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
                        const roleColor = getRoleColor(p.role);

                        return (
                          <tr
                            key={p.name}
                            style={{
                              backgroundColor: i % 2 === 0 ? "#141414" : "#171717",
                              borderTop:       "1px solid #222",
                            }}
                          >
                            <td style={tdStyle}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <img
                                  src={getPlayerSpecIcon(p.game, p.specId, p.className)}
                                  alt=""
                                  width={20}
                                  height={20}
                                  style={{ borderRadius: "4px", flexShrink: 0 }}
                                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                                />
                                <span>
                                  <span style={{ color, fontWeight: 600 }}>{p.name}</span>
                                  <span style={{ color: roleColor, fontSize: "11px", marginLeft: "8px" }}>
                                    {p.role}
                                  </span>
                                  <span style={{ color: "#555", fontSize: "11px", marginLeft: "6px" }}>
                                    {formatClassName(p.className)}
                                  </span>
                                </span>
                              </div>
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
                <RaidTimelineView timeline={timeline} />
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

// ─── Pedestal (formerly components/report/ReportPedestal.tsx) ─────────────
//
// Only ever rendered from ReportDialog above — kept as a local component
// rather than a separate file since nothing else uses it.

type PedestalSlot = {
  place:      1 | 2 | 3;
  medal:      string;
  height:     string;
  order:      number;   // visual left-to-right order: 2nd, 1st, 3rd
  labelColor: string;
};

const PEDESTAL_SLOTS: PedestalSlot[] = [
  { place: 2, medal: "🥈", height: "78px",  order: 0, labelColor: "#c0c0c0" },
  { place: 1, medal: "🥇", height: "108px", order: 1, labelColor: "#facc15" },
  { place: 3, medal: "🥉", height: "56px",  order: 2, labelColor: "#cd7f32" },
];

function PedestalCard({
  slot,
  player,
}: {
  slot: PedestalSlot;
  player: PlayerReportStats | undefined;
}) {
  const color = player ? getClassColor(player.game, player.className) : "#555";
  const roleColor = player ? getRoleColor(player.role) : "#555";

  return (
    <div
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "flex-end",
        order:          slot.order,
        width:          "140px",
      }}
    >
      <span style={{ fontSize: slot.place === 1 ? "30px" : "24px", marginBottom: "4px" }}>
        {slot.medal}
      </span>

      <div
        style={{
          display:      "flex",
          alignItems:   "center",
          gap:          "5px",
          maxWidth:     "130px",
          marginBottom: "2px",
        }}
      >
        {player && (
          <img
            src={getPlayerSpecIcon(player.game, player.specId, player.className)}
            alt=""
            width={16}
            height={16}
            style={{ borderRadius: "3px", flexShrink: 0 }}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        )}
        <span
          style={{
            fontWeight:   700,
            fontSize:     slot.place === 1 ? "14px" : "13px",
            color:        player ? color : "#444",
            whiteSpace:   "nowrap",
            overflow:     "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {player?.name ?? "—"}
        </span>
      </div>

      {player && (
        <div style={{ fontSize: "10px", color: roleColor, marginBottom: "6px" }}>
          {player.role} · {formatClassName(player.className)}
        </div>
      )}

      {player && (
        <div style={{ fontSize: "10px", color: "#777", marginBottom: "8px" }}>
          {player.combinedScore} early mistake{player.combinedScore === 1 ? "" : "s"}
        </div>
      )}

      <div
        style={{
          width:           "100%",
          height:          slot.height,
          borderRadius:    "6px 6px 0 0",
          background:      `linear-gradient(180deg, ${slot.labelColor}22, ${slot.labelColor}0d)`,
          border:          `1px solid ${slot.labelColor}55`,
          borderBottom:    "none",
          display:         "flex",
          alignItems:      "flex-start",
          justifyContent:  "center",
          paddingTop:      "6px",
        }}
      >
        <span style={{ fontSize: "18px", fontWeight: 800, color: slot.labelColor }}>
          {slot.place}
        </span>
      </div>
    </div>
  );
}

function Pedestal({ players }: { players: PlayerReportStats[] }) {
  const byPlace = new Map(players.map((p, i) => [i + 1, p]));

  return (
    <div
      style={{
        display:        "flex",
        alignItems:     "flex-end",
        justifyContent: "center",
        gap:            "18px",
        padding:        "18px 10px 0",
      }}
    >
      {players.length === 0 ? (
        <div style={{ color: "#555", fontSize: "13px", padding: "20px 0" }}>
          Not enough data yet to crown an MVP.
        </div>
      ) : (
        PEDESTAL_SLOTS.map((slot) => (
          <PedestalCard key={slot.place} slot={slot} player={byPlace.get(slot.place)} />
        ))
      )}
    </div>
  );
}

// ─── Raid timeline (formerly components/report/ReportTimeline.tsx) ────────
//
// Only ever rendered from ReportDialog above — kept as a local component
// rather than a separate file since nothing else uses it.

function RaidTimelineView({ timeline }: { timeline: RaidTimeline }) {
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
