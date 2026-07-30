"use client";

// components/StaticErrorChart.tsx
//
// Cumulative per-player error count across every pull ever imported into a
// static (see app/api/statics/[staticId]/chart-data/route.ts) — the "UMAD
// Total Errors" chart from the old Google Sheet (sampledata/ff/DMUStats.png),
// rebuilt from StaticReviewPull/StaticReviewPullPlayerError instead of being
// hand-maintained.
//
// Colors are the dataviz-skill reference palette's dark categorical steps
// (see palette.md), assigned in fixed order by player name so a given
// player's line color is stable across re-renders/filtering. The 8-slot
// palette is only guaranteed CVD-safe up to 8 simultaneous series — WoW
// rosters can exceed that, so the legend's checkboxes exist specifically to
// let the viewer narrow down to a readable subset, and colors past slot 8
// cycle rather than guarantee separation.

import { useMemo, useState } from "react";

export type ChartPullPlayerError = {
  player:     string;
  majorCount: number;
  minorCount: number;
};

export type ChartPull = {
  id:          number;
  reviewId:    number;
  reviewLabel: string | null;
  fightId:     number;
  pullNumber:  number;
  bossName:    string;
  result:      string;
  summary?:    string | null;
  players:     ChartPullPlayerError[];
};

const CATEGORICAL_DARK = [
  "#3987e5", // blue
  "#d95926", // orange
  "#199e70", // aqua
  "#c98500", // yellow
  "#d55181", // magenta
  "#008300", // green
  "#9085e9", // violet
  "#e66767", // red
];

const INK_PRIMARY   = "#ffffff";
const INK_SECONDARY = "#c3c2b7";
const INK_MUTED     = "#898781";
const GRIDLINE      = "#2c2c2a";
const BASELINE      = "#383835";

type Mode = "total" | "majorOnly";

function buildSeries(pulls: ChartPull[], mode: Mode) {
  const players = new Set<string>();
  for (const pull of pulls) {
    for (const p of pull.players) players.add(p.player);
  }
  const sortedPlayers = Array.from(players).sort((a, b) => a.localeCompare(b));

  const running = new Map<string, number>();
  const series = new Map<string, number[]>();
  for (const player of sortedPlayers) series.set(player, []);

  for (const pull of pulls) {
    const byPlayer = new Map(pull.players.map((p) => [p.player, p]));
    for (const player of sortedPlayers) {
      const entry = byPlayer.get(player);
      const delta = entry ? (mode === "majorOnly" ? entry.majorCount : entry.majorCount + entry.minorCount) : 0;
      const next = (running.get(player) ?? 0) + delta;
      running.set(player, next);
      series.get(player)!.push(next);
    }
  }

  return { players: sortedPlayers, series };
}

const CHART_HEIGHT = 320;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;
const PAD_LEFT = 40;
const PAD_RIGHT = 16;
const PULL_SPACING = 14; // px per pull along the x-axis

export default function StaticErrorChart({ pulls }: { pulls: ChartPull[] }) {
  const [mode, setMode] = useState<Mode>("total");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const { players, series } = useMemo(() => buildSeries(pulls, mode), [pulls, mode]);
  const colorFor = (player: string) => CATEGORICAL_DARK[players.indexOf(player) % CATEGORICAL_DARK.length];

  const visiblePlayers = players.filter((p) => !hidden.has(p));

  const maxY = useMemo(() => {
    let max = 0;
    for (const player of visiblePlayers) {
      const vals = series.get(player) ?? [];
      for (const v of vals) if (v > max) max = v;
    }
    return Math.max(max, 1);
  }, [series, visiblePlayers]);

  const n = pulls.length;
  const innerWidth = Math.max(n - 1, 1) * PULL_SPACING;
  const width = innerWidth + PAD_LEFT + PAD_RIGHT;
  const innerHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

  function xAt(i: number) {
    return PAD_LEFT + (n <= 1 ? 0 : (i / (n - 1)) * innerWidth);
  }
  function yAt(v: number) {
    return PAD_TOP + innerHeight - (v / maxY) * innerHeight;
  }

  function toggle(player: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(player)) next.delete(player);
      else next.add(player);
      return next;
    });
  }

  if (n === 0) {
    return (
      <p style={{ fontSize: "13px", color: INK_MUTED }}>
        No pulls imported yet — add a review to start building this chart.
      </p>
    );
  }

  const yTicks = 5;
  const tickVals = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((maxY / yTicks) * i));

  const hoverPull = hoverIdx != null ? pulls[hoverIdx] : null;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", flexWrap: "wrap", gap: "10px" }}>
        <h3 style={{ margin: 0, fontSize: "16px", color: INK_PRIMARY }}>Total Errors — Cumulative Over All Pulls</h3>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div style={{ display: "flex", border: "1px solid #444", borderRadius: "6px", overflow: "hidden" }}>
            {(["total", "majorOnly"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding:      "5px 10px",
                  fontSize:     "12px",
                  fontWeight:   600,
                  border:       "none",
                  cursor:       "pointer",
                  backgroundColor: mode === m ? "#2563eb" : "transparent",
                  color:        mode === m ? "#fff" : INK_SECONDARY,
                }}
              >
                {m === "total" ? "Major + Minor" : "Major Only"}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowTable((v) => !v)}
            style={{
              padding:      "5px 10px",
              fontSize:     "12px",
              fontWeight:   600,
              border:       "1px solid #444",
              borderRadius: "6px",
              cursor:       "pointer",
              backgroundColor: showTable ? "#2563eb" : "transparent",
              color:        showTable ? "#fff" : INK_SECONDARY,
            }}
          >
            {showTable ? "Show Chart" : "Show Table"}
          </button>
        </div>
      </div>

      {/* Legend — also the visibility toggle */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginBottom: "12px" }}>
        {players.map((player) => {
          const isHidden = hidden.has(player);
          return (
            <button
              key={player}
              onClick={() => toggle(player)}
              style={{
                display:      "flex",
                alignItems:   "center",
                gap:          "6px",
                background:   "none",
                border:       "none",
                cursor:       "pointer",
                padding:      0,
                opacity:      isHidden ? 0.4 : 1,
                fontSize:     "12px",
                color:        INK_SECONDARY,
              }}
              title={isHidden ? `Show ${player}` : `Hide ${player}`}
            >
              <span
                style={{
                  width:           "10px",
                  height:          "10px",
                  borderRadius:    "2px",
                  backgroundColor: colorFor(player),
                  flexShrink:      0,
                }}
              />
              {player}
            </button>
          );
        })}
      </div>

      {showTable ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "12px" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "6px 8px", color: INK_MUTED, borderBottom: `1px solid ${GRIDLINE}` }}>Pull</th>
                <th style={{ textAlign: "left", padding: "6px 8px", color: INK_MUTED, borderBottom: `1px solid ${GRIDLINE}` }}>Result</th>
                {visiblePlayers.map((p) => (
                  <th key={p} style={{ textAlign: "right", padding: "6px 8px", color: colorFor(p), borderBottom: `1px solid ${GRIDLINE}` }}>
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pulls.map((pull, i) => (
                <tr key={`${pull.reviewId}-${pull.fightId}`}>
                  <td style={{ padding: "6px 8px", color: INK_PRIMARY }}>{pull.bossName} #{pull.pullNumber}</td>
                  <td style={{ padding: "6px 8px", color: pull.result === "Kill" ? "#0ca30c" : INK_SECONDARY }}>{pull.result}</td>
                  {visiblePlayers.map((p) => (
                    <td key={p} style={{ padding: "6px 8px", textAlign: "right", color: INK_SECONDARY, fontVariantNumeric: "tabular-nums" }}>
                      {series.get(p)?.[i] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ overflowX: "auto", position: "relative" }}>
          <svg
            width={width}
            height={CHART_HEIGHT}
            onMouseLeave={() => setHoverIdx(null)}
            style={{ display: "block" }}
          >
            {/* gridlines + y ticks */}
            {tickVals.map((v) => {
              const y = yAt(v);
              return (
                <g key={v}>
                  <line x1={PAD_LEFT} y1={y} x2={width - PAD_RIGHT} y2={y} stroke={GRIDLINE} strokeWidth={1} />
                  <text x={PAD_LEFT - 8} y={y + 4} textAnchor="end" fontSize={11} fill={INK_MUTED}>
                    {v}
                  </text>
                </g>
              );
            })}
            {/* baseline */}
            <line x1={PAD_LEFT} y1={PAD_TOP + innerHeight} x2={width - PAD_RIGHT} y2={PAD_TOP + innerHeight} stroke={BASELINE} strokeWidth={1} />

            {/* hover crosshair */}
            {hoverIdx != null && (
              <line
                x1={xAt(hoverIdx)} y1={PAD_TOP} x2={xAt(hoverIdx)} y2={PAD_TOP + innerHeight}
                stroke={INK_MUTED} strokeWidth={1} strokeDasharray="3,3"
              />
            )}

            {/* series lines */}
            {visiblePlayers.map((player) => {
              const vals = series.get(player) ?? [];
              const d = vals.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v)}`).join(" ");
              return (
                <path
                  key={player}
                  d={d}
                  fill="none"
                  stroke={colorFor(player)}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}

            {/* hover dots */}
            {hoverIdx != null &&
              visiblePlayers.map((player) => {
                const v = series.get(player)?.[hoverIdx] ?? 0;
                return (
                  <circle
                    key={player}
                    cx={xAt(hoverIdx)}
                    cy={yAt(v)}
                    r={4}
                    fill={colorFor(player)}
                    stroke="#1a1a1a"
                    strokeWidth={1.5}
                  />
                );
              })}

            {/* hit targets — one wide invisible rect per pull, bigger than the mark itself */}
            {pulls.map((_, i) => (
              <rect
                key={i}
                x={xAt(i) - PULL_SPACING / 2}
                y={PAD_TOP}
                width={PULL_SPACING}
                height={innerHeight}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(i)}
              />
            ))}
          </svg>

          {hoverPull && (
            <div
              style={{
                position:        "absolute",
                left:            Math.min(xAt(hoverIdx!) + 8, width - 190),
                top:             PAD_TOP,
                backgroundColor: "#111",
                border:          "1px solid #444",
                borderRadius:    "6px",
                padding:         "8px 10px",
                fontSize:        "11px",
                color:           INK_SECONDARY,
                pointerEvents:   "none",
                whiteSpace:      "nowrap",
                boxShadow:       "0 6px 16px rgba(0,0,0,0.4)",
              }}
            >
              <div style={{ color: INK_PRIMARY, fontWeight: 600, marginBottom: "4px" }}>
                {hoverPull.bossName} #{hoverPull.pullNumber} — {hoverPull.result}
              </div>
              {hoverPull.reviewLabel && <div style={{ marginBottom: "4px" }}>{hoverPull.reviewLabel}</div>}
              {visiblePlayers.map((p) => (
                <div key={p} style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                  <span style={{ color: colorFor(p) }}>{p}</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{series.get(p)?.[hoverIdx!] ?? 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
