"use client";

// components/StaticErrorChart.tsx
//
// Cumulative per-player error count across every pull ever imported into a
// static (see app/api/statics/[staticId]/chart-data/route.ts) — the "UMAD
// Total Errors" chart from the old Google Sheet (sampledata/ff/DMUStats.png),
// rebuilt from StaticReviewPull/StaticReviewPullPlayerError instead of being
// hand-maintained.
//
// Series are keyed by resolved player IDENTITY (StaticPlayerIdentity), not
// raw log name — a player who changed their in-game name mid-static (e.g.
// "Salty Dango" -> "Kup'o Noodles") still draws as one continuous line once
// a reviewer merges those names together (see the static dashboard's
// Players panel). Rows written before identity resolution existed fall
// back to keying on the raw name.
//
// Colors are each identity's own class/job color (lib/player-display.ts),
// not a generic categorical palette — raid tools' users already read class
// colors instinctively, and pairing the color with that job's icon (see the
// legend/tooltip) gives a second, color-independent way to tell lines apart
// on top of that. A player who changed job mid-static is colored/iconed by
// whichever job appears most often across their pulls, since a line can't
// sensibly change color partway through.

import { useEffect, useMemo, useRef, useState } from "react";
import { getClassColor, getPlayerSpecIcon } from "@/lib/player-display";

export type ChartPullPlayerError = {
  player:       string;
  identityId:   number | null;
  identityName: string;
  className:    string | null;
  specId:       number | null;
  role:         string | null;
  majorCount:   number;
  minorCount:   number;
};

export type ChartPull = {
  id:            number;
  reviewId:      number;
  reviewLabel:   string | null;
  fightId:       number;
  pullNumber:    number;
  bossName:      string;
  result:        string;
  game:          string;
  durationMs:    number;
  raidErrorAtMs: number | null;
  summary?:      string | null;
  players:       ChartPullPlayerError[];
};

const INK_PRIMARY   = "#ffffff";
const INK_SECONDARY = "#c3c2b7";
const INK_MUTED     = "#898781";
const GRIDLINE      = "#2c2c2a";
const BASELINE      = "#383835";
const FALLBACK_COLOR = "#aaaaaa";

type Mode = "total" | "majorOnly";

function identityKey(p: ChartPullPlayerError): string {
  return p.identityId != null ? `id:${p.identityId}` : `name:${p.player}`;
}

type SeriesPlayer = {
  key:  string;
  name: string;
  game: string | null;
  className: string | null;
  specId: number | null;
};

function buildSeries(pulls: ChartPull[], mode: Mode) {
  const info = new Map<string, SeriesPlayer>();
  // Tally (game, className, specId) occurrences per identity so a job
  // change mid-static still resolves to one stable color/icon — the most
  // frequently-seen combo wins.
  const jobTally = new Map<string, Map<string, { count: number; game: string; className: string; specId: number | null }>>();

  for (const pull of pulls) {
    for (const p of pull.players) {
      const key = identityKey(p);
      if (!info.has(key)) info.set(key, { key, name: p.identityName, game: null, className: null, specId: null });

      if (p.className) {
        const tally = jobTally.get(key) ?? new Map();
        const jobKey = `${pull.game}::${p.className}::${p.specId ?? ""}`;
        const entry = tally.get(jobKey) ?? { count: 0, game: pull.game, className: p.className, specId: p.specId };
        entry.count += 1;
        tally.set(jobKey, entry);
        jobTally.set(key, tally);
      }
    }
  }

  for (const [key, tally] of jobTally.entries()) {
    let best: { count: number; game: string; className: string; specId: number | null } | null = null;
    for (const entry of tally.values()) {
      if (!best || entry.count > best.count) best = entry;
    }
    if (best) {
      const player = info.get(key)!;
      player.game = best.game;
      player.className = best.className;
      player.specId = best.specId;
    }
  }

  const players = Array.from(info.values()).sort((a, b) => a.name.localeCompare(b.name));

  const running = new Map<string, number>();
  const series = new Map<string, number[]>();
  for (const player of players) series.set(player.key, []);

  for (const pull of pulls) {
    const byKey = new Map(pull.players.map((p) => [identityKey(p), p]));
    for (const player of players) {
      const entry = byKey.get(player.key);
      const delta = entry ? (mode === "majorOnly" ? entry.majorCount : entry.majorCount + entry.minorCount) : 0;
      const next = (running.get(player.key) ?? 0) + delta;
      running.set(player.key, next);
      series.get(player.key)!.push(next);
    }
  }

  return { players, series };
}

const CHART_HEIGHT = 320;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;
const PAD_LEFT = 40;
const PAD_RIGHT = 16;

// The chart is width-driven, not spacing-driven: it always fits the space
// it's given rather than growing past it into a horizontal scrollbar, so
// pull-to-pull spacing is whatever the available width divides into. These
// only bound the hit-target width used for hover detection — a hair wider
// than the gap makes neighbouring pulls easy to land on when a long static
// squeezes them together, and the cap stops one lone pull from claiming the
// entire plot area.
const MIN_HIT_WIDTH = 6;
const MAX_HIT_WIDTH = 28;

// Fallback plot width for the first render, before the ResizeObserver has
// measured the container (and for any environment without one).
const FALLBACK_WIDTH = 720;

// Fixed-width column holding the hover readout, to the RIGHT of the plot —
// it used to float over the lines, where it both covered the data it was
// describing and got clipped on pulls near the right edge.
const HOVER_PANEL_WIDTH = 210;

export default function StaticErrorChart({ pulls }: { pulls: ChartPull[] }) {
  // Major-only is the default view: Minor errors are noise-level mistakes
  // and burying the Majors under them is not how this chart gets read.
  const [mode, setMode] = useState<Mode>("majorOnly");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const plotRef = useRef<HTMLDivElement | null>(null);
  const [plotWidth, setPlotWidth] = useState(FALLBACK_WIDTH);

  useEffect(() => {
    const el = plotRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(([entry]) => {
      const next = entry.contentRect.width;
      if (next > 0) setPlotWidth(next);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [showTable]);

  const { players, series } = useMemo(() => buildSeries(pulls, mode), [pulls, mode]);
  const colorFor = (player: SeriesPlayer) =>
    player.className ? getClassColor(player.game as "wow" | "ffxiv", player.className) : FALLBACK_COLOR;
  const iconFor = (player: SeriesPlayer) =>
    player.className && player.game
      ? getPlayerSpecIcon(player.game as "wow" | "ffxiv", player.specId ?? 0, player.className)
      : null;

  const visiblePlayers = players.filter((p) => !hidden.has(p.key));

  const maxY = useMemo(() => {
    let max = 0;
    for (const player of visiblePlayers) {
      const vals = series.get(player.key) ?? [];
      for (const v of vals) if (v > max) max = v;
    }
    return Math.max(max, 1);
  }, [series, visiblePlayers]);

  const n = pulls.length;
  const width = Math.max(plotWidth, PAD_LEFT + PAD_RIGHT + 40);
  const innerWidth = width - PAD_LEFT - PAD_RIGHT;
  const innerHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const hitWidth = Math.min(
    MAX_HIT_WIDTH,
    Math.max(MIN_HIT_WIDTH, n <= 1 ? MAX_HIT_WIDTH : (innerWidth / (n - 1)) * 1.2)
  );

  function xAt(i: number) {
    return PAD_LEFT + (n <= 1 ? 0 : (i / (n - 1)) * innerWidth);
  }
  function yAt(v: number) {
    return PAD_TOP + innerHeight - (v / maxY) * innerHeight;
  }

  function toggle(key: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
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
  // Hover rows are sorted by their value AT the hovered pull — reflecting
  // the data at that point, not the legend's static alphabetical order.
  const hoverRows = hoverIdx != null
    ? [...visiblePlayers].sort((a, b) => (series.get(b.key)?.[hoverIdx] ?? 0) - (series.get(a.key)?.[hoverIdx] ?? 0))
    : [];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", flexWrap: "wrap", gap: "10px" }}>
        <h3 style={{ margin: 0, fontSize: "16px", color: INK_PRIMARY }}>
          {mode === "majorOnly" ? "Major Errors" : "Total Errors"} — Cumulative Over All Pulls
        </h3>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div style={{ display: "flex", border: "1px solid #444", borderRadius: "6px", overflow: "hidden" }}>
            {(["majorOnly", "total"] as Mode[]).map((m) => (
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
          const isHidden = hidden.has(player.key);
          const icon = iconFor(player);
          return (
            <button
              key={player.key}
              onClick={() => toggle(player.key)}
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
              title={isHidden ? `Show ${player.name}` : `Hide ${player.name}`}
            >
              {icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={icon} alt="" width={16} height={16} style={{ borderRadius: "2px", flexShrink: 0 }} />
              ) : (
                <span
                  style={{
                    width:           "10px",
                    height:          "10px",
                    borderRadius:    "2px",
                    backgroundColor: colorFor(player),
                    flexShrink:      0,
                  }}
                />
              )}
              <span style={{ color: colorFor(player) }}>{player.name}</span>
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
                  <th key={p.key} style={{ textAlign: "right", padding: "6px 8px", color: colorFor(p), borderBottom: `1px solid ${GRIDLINE}` }}>
                    {p.name}
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
                    <td key={p.key} style={{ padding: "6px 8px", textAlign: "right", color: INK_SECONDARY, fontVariantNumeric: "tabular-nums" }}>
                      {series.get(p.key)?.[i] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        // Plot and readout sit side by side: the plot takes whatever width
        // is left (minWidth 0 is what actually lets a flex child shrink
        // below its content), the readout gets a fixed column so hovering
        // never reflows the chart underneath the cursor.
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <div ref={plotRef} style={{ flex: "1 1 auto", minWidth: 0 }}>
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
              const vals = series.get(player.key) ?? [];
              const d = vals.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(v)}`).join(" ");
              return (
                <path
                  key={player.key}
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
                const v = series.get(player.key)?.[hoverIdx] ?? 0;
                return (
                  <circle
                    key={player.key}
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
                x={xAt(i) - hitWidth / 2}
                y={PAD_TOP}
                width={hitWidth}
                height={innerHeight}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(i)}
              />
            ))}
          </svg>
          </div>

          {/* Hover readout — always occupies its column, so the plot width
              (and therefore the x positions being hovered) never shifts
              between the hovered and un-hovered states. */}
          <div
            style={{
              width:           `${HOVER_PANEL_WIDTH}px`,
              flexShrink:      0,
              backgroundColor: "#111",
              border:          "1px solid #2c2c2a",
              borderRadius:    "6px",
              padding:         "8px 10px",
              fontSize:        "11px",
              color:           INK_SECONDARY,
              maxHeight:       `${CHART_HEIGHT}px`,
              overflowY:       "auto",
              boxSizing:       "border-box",
            }}
          >
            {hoverPull ? (
              <>
                <div style={{ color: INK_PRIMARY, fontWeight: 600, marginBottom: "4px" }}>
                  {hoverPull.bossName} #{hoverPull.pullNumber} — {hoverPull.result}
                </div>
                {hoverPull.reviewLabel && (
                  <div style={{ marginBottom: "4px", color: INK_MUTED }}>{hoverPull.reviewLabel}</div>
                )}
                {hoverRows.map((p) => (
                  <div key={p.key} style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                    <span style={{ color: colorFor(p), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.name}
                    </span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>{series.get(p.key)?.[hoverIdx!] ?? 0}</span>
                  </div>
                ))}
              </>
            ) : (
              <div style={{ color: INK_MUTED }}>Hover a pull to see totals at that point.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
