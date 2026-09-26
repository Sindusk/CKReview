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
import { Dialog } from "./ui/Dialog";

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
    <Dialog
      title="Raid Report"
      subtitle={`${pulls.length} pull${pulls.length === 1 ? "" : "s"} analyzed`}
      width="min(920px, 100%)"
      onBackdropClick={onClose}
      onClose={onClose}
      bodyStyle={{ padding: "8px 20px 24px" }}
    >
          {pulls.length === 0 ? (
            <div style={{ color: "var(--ck-text-3)", fontSize: "13px", padding: "40px 0", textAlign: "center" }}>
              Import a report to generate the raid review.
            </div>
          ) : (
            <>
              {/* Pedestal */}
              <Pedestal players={pedestal} />

              {/* Table */}
              <div style={{ marginTop: "22px" }}>
                <div className="ck-section-label">Player Breakdown</div>

                <div className="ck-table-wrap">
                  <table className="ck-table">
                    <thead>
                      <tr>
                        <th>Player</th>
                        <th style={{ textAlign: "right" }}>First Errors</th>
                        <th style={{ textAlign: "right" }}>First Error %</th>
                        <th style={{ textAlign: "right" }}>Total Major Errors</th>
                        <th style={{ textAlign: "right" }}>Total %</th>
                        <th
                          style={{ textAlign: "right" }}
                          title="Pulls this player was present for — both percentages are per pull played, not per pull in the report."
                        >
                          Pulls
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.map((p) => {
                        const color = getClassColor(p.game, p.className);
                        const roleColor = getRoleColor(p.role);

                        return (
                          <tr key={p.name}>
                            <td style={tdStyle}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <img
                                  src={getPlayerSpecIcon(p.game, p.specId, p.className)}
                                  alt=""
                                  width={20}
                                  height={20}
                                  style={{ borderRadius: "3px", flexShrink: 0 }}
                                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                                />
                                <span>
                                  <span style={{ color, fontWeight: 600 }}>{p.name}</span>
                                  <span style={{ color: roleColor, fontSize: "11px", fontWeight: 600, marginLeft: "8px" }}>
                                    {p.role}
                                  </span>
                                  <span style={{ color: "var(--ck-text-3)", fontSize: "11px", marginLeft: "6px" }}>
                                    {formatClassName(p.className)}
                                  </span>
                                </span>
                              </div>
                            </td>
                            <td style={{ ...tdStyle, textAlign: "right" }}>{p.firstErrorCount}</td>
                            <td style={{ ...tdStyle, textAlign: "right", color: "#f87171", fontWeight: 600 }}>
                              {p.firstErrorPct.toFixed(1)}%
                            </td>
                            <td style={{ ...tdStyle, textAlign: "right" }}>{p.totalCount}</td>
                            <td style={{ ...tdStyle, textAlign: "right", color: "#fb923c" }}>
                              {p.totalPct.toFixed(1)}%
                            </td>
                            <td style={{ ...tdStyle, textAlign: "right", color: "var(--ck-text-3)" }}>
                              {p.pullCount}
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
                <div className="ck-section-label">Raid Timeline</div>
                <RaidTimelineView timeline={timeline} />
              </div>
            </>
          )}
    </Dialog>
  );
}

// Padding/borders come from .ck-table; this only sets the body text tone.
const tdStyle: React.CSSProperties = {
  color: "var(--ck-text)",
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
        <div style={{ fontSize: "10px", color: "var(--ck-text-3)", marginBottom: "8px" }}>
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
        <div style={{ color: "var(--ck-text-3)", fontSize: "13px", padding: "20px 0" }}>
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
      <div style={{ color: "var(--ck-text-3)", fontSize: "13px", padding: "12px 0" }}>
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
          color: "var(--ck-text-3)",
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
          border:       "1px solid var(--ck-line-2)",
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
        <div style={{ display: "flex", alignItems: "center", gap: "14px", fontSize: "11px", color: "var(--ck-text-2)" }}>
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
