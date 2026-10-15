"use client";

// components/StaticErrorChart.tsx
//
// The static dashboard's Error Trends chart (app/api/statics/[staticId]/
// chart-data/route.ts), one point per pull (user, 2026-10-15: per pull
// reads better than per session), session starts marked by a faint divider
// and their date, one line per player identity. Two views (user,
// 2026-10-15, from a mockup on CK Dancing Mad):
//   - Per pull (default): errors per pull, averaged over the player's last
//     N pulls played in range (10 / 20 / 50). A player who sat a pull out
//     has a gap there, so a replacement joining late, or someone who left,
//     reads on the same scale as everyone else instead of as a flat line or
//     a late start.
//   - Cumulative: running totals restarted at the first session in range;
//     each line starts at the player's first pull in it.
// Filters: the fight (boss), a phase (detailed sessions only: per-error rows
// carry the phase; older sessions are left out and counted in a note), and
// the session range (from / to, with quick "last N" presets). Hovering shows
// a compact tooltip at the cursor with the session and each player's value,
// errors and pulls.
//
// Series are keyed by resolved player IDENTITY (StaticPlayerIdentity), not
// raw log name, so a renamed player stays one line once merged in the
// Players panel; rows from before identity resolution key on the raw name.
// Colors are each identity's class/job color (its most-played job), paired
// with the job icon in the legend.

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
  /** Detailed sessions: phase id -> [major, minor] counted errors. */
  byPhase?:     Record<number, [number, number]>;
};

export type ChartPull = {
  id:             number;
  reviewId:       number;
  reviewLabel:    string | null;
  /** ISO: when the log was recorded, else when it was added. */
  reviewDate?:    string;
  /** The session has per-error detail (phase filtering works on it). */
  detailed?:      boolean;
  phasesReached?: number[];
  fightId:        number;
  pullNumber:     number;
  bossName:       string;
  result:         string;
  game:           string;
  durationMs:     number;
  raidErrorAtMs:  number | null;
  summary?:       string | null;
  players:        ChartPullPlayerError[];
};

export type ChartPhase = { bossName: string; phaseId: number; name: string };

const INK_PRIMARY   = "#ffffff";
const INK_SECONDARY = "#c3c2b7";
const INK_MUTED     = "#898781";
const GRIDLINE      = "#2c2c2a";
const BASELINE      = "#383835";
const FALLBACK_COLOR = "#aaaaaa";

type Severity = "majorOnly" | "total";
type Metric = "rate" | "cumulative";

// Per pull: each point averages the player's last N pulls played.
const ROLL_OPTIONS = [10, 20, 50];
const ROLL_DEFAULT = 20;
const RANGE_PRESETS = [5, 10, 20];

function identityKey(p: ChartPullPlayerError): string {
  return p.identityId != null ? `id:${p.identityId}` : `name:${p.player}`;
}

type SeriesPlayer = { key: string; name: string; game: string | null; className: string | null; specId: number | null };

/** Every identity in these pulls, with its most-played job for color and icon. */
function playersOf(pulls: ChartPull[]): SeriesPlayer[] {
  const info = new Map<string, SeriesPlayer>();
  const jobTally = new Map<string, Map<string, { count: number; game: string; className: string; specId: number | null }>>();
  for (const pull of pulls) {
    for (const p of pull.players) {
      const key = identityKey(p);
      if (!info.has(key)) info.set(key, { key, name: p.identityName, game: null, className: null, specId: null });
      if (!p.className) continue;
      const tally = jobTally.get(key) ?? new Map();
      const jobKey = `${pull.game}::${p.className}::${p.specId ?? ""}`;
      const entry = tally.get(jobKey) ?? { count: 0, game: pull.game, className: p.className, specId: p.specId };
      entry.count += 1;
      tally.set(jobKey, entry);
      jobTally.set(key, tally);
    }
  }
  for (const [key, tally] of jobTally) {
    const best = [...tally.values()].sort((a, b) => b.count - a.count)[0];
    if (best) Object.assign(info.get(key)!, { game: best.game, className: best.className, specId: best.specId });
  }
  return [...info.values()].sort((a, b) => a.name.localeCompare(b.name));
}

type Session = { reviewId: number; number: number; label: string | null; date: string | null; detailed: boolean; pulls: ChartPull[] };

/** Errors over pulls played: the rolling window (rate) or since the range start (cumulative). */
type Tally = { pulls: number; errors: number };

/** A player's value at one pull, with that pull's own errors (undefined: sat it out). */
type Point = { value: number; tally: Tally; here?: number } | null;

/** One x position: a pull of the fight in range (that reached the phase, when one is picked). */
type AxisPull = { pull: ChartPull; session: Session; sessionIdx: number };

export default function StaticErrorChart({ pulls, phases = [] }: { pulls: ChartPull[]; phases?: ChartPhase[] }) {
  const [metric, setMetric] = useState<Metric>("rate");
  // Major-only is the default: Minors are noise-level and would bury them.
  const [severity, setSeverity] = useState<Severity>("majorOnly");
  const [rollPulls, setRollPulls] = useState<number>(ROLL_DEFAULT);
  const [boss, setBoss] = useState<string | null>(null);
  const [phase, setPhase] = useState<number | null>(null);
  // Indices into the fight's sessions; null = the first / last.
  const [fromIdx, setFromIdx] = useState<number | null>(null);
  const [toIdx, setToIdx] = useState<number | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [hover, setHover] = useState<{ idx: number; x: number; y: number } | null>(null);
  const [showTable, setShowTable] = useState(false);

  const plotRef = useRef<HTMLDivElement | null>(null);
  const [plotWidth, setPlotWidth] = useState(FALLBACK_WIDTH);
  useEffect(() => {
    const el = plotRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => { if (entry.contentRect.width > 0) setPlotWidth(entry.contentRect.width); });
    observer.observe(el);
    return () => observer.disconnect();
  }, [showTable]);

  // Fights by pull count; the most-pulled one is the default.
  const bosses = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of pulls) counts.set(p.bossName, (counts.get(p.bossName) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, pulls: n }));
  }, [pulls]);
  const activeBoss = boss && bosses.some((b) => b.name === boss) ? boss : bosses[0]?.name ?? null;
  const bossPhases = phases.filter((p) => p.bossName === activeBoss);
  const activePhase = phase !== null && bossPhases.some((p) => p.phaseId === phase) ? phase : null;

  // Sessions of this fight in log order, numbered as on the dashboard's list
  // (every session of the static, oldest first).
  const sessions = useMemo(() => {
    const number = new Map<number, number>();
    for (const p of pulls) if (!number.has(p.reviewId)) number.set(p.reviewId, number.size + 1);
    const out: Session[] = [];
    const byId = new Map<number, Session>();
    for (const p of pulls) {
      if (p.bossName !== activeBoss) continue;
      let s = byId.get(p.reviewId);
      if (!s) {
        s = { reviewId: p.reviewId, number: number.get(p.reviewId)!, label: p.reviewLabel, date: p.reviewDate ?? null, detailed: p.detailed ?? false, pulls: [] };
        byId.set(p.reviewId, s);
        out.push(s);
      }
      s.pulls.push(p);
    }
    return out;
  }, [pulls, activeBoss]);

  const last = sessions.length - 1;
  const from = Math.max(0, Math.min(fromIdx ?? 0, last));
  const to = Math.max(from, Math.min(toIdx ?? last, last));
  // A phase needs per-error detail: older sessions drop out of a phase view.
  const { shown, undetailed } = useMemo(() => {
    const inRange = sessions.slice(from, to + 1);
    const kept = activePhase === null ? inRange : inRange.filter((s) => s.detailed);
    return { shown: kept, undetailed: inRange.length - kept.length };
  }, [sessions, from, to, activePhase]);

  const players = useMemo(() => playersOf(shown.flatMap((s) => s.pulls)), [shown]);

  // One x position per pull, in log order.
  const axis = useMemo(() => {
    const out: AxisPull[] = [];
    shown.forEach((session, sessionIdx) => {
      for (const pull of session.pulls) {
        if (activePhase !== null && !(pull.phasesReached ?? []).includes(activePhase)) continue;
        out.push({ pull, session, sessionIdx });
      }
    });
    return out;
  }, [shown, activePhase]);

  // Each pull's errors per player who played it.
  const perPull = useMemo(() => axis.map(({ pull }) => {
    const m = new Map<string, number>();
    for (const p of pull.players) {
      const counts = activePhase === null ? [p.majorCount, p.minorCount] : p.byPhase?.[activePhase] ?? [0, 0];
      m.set(identityKey(p), severity === "majorOnly" ? counts[0] : counts[0] + counts[1]);
    }
    return m;
  }), [axis, activePhase, severity]);

  // Rate: errors per pull over the player's last `rollPulls` pulls played,
  // a gap where they sat out. Cumulative: running total from their first
  // pull in range, flat while they sat out.
  const series = useMemo(() => {
    const out = new Map<string, Point[]>();
    for (const player of players) {
      const points: Point[] = [];
      const recent: number[] = [];
      let running = 0;
      let played = 0;
      perPull.forEach((m) => {
        const here = m.get(player.key);
        if (here !== undefined) { running += here; played += 1; recent.push(here); if (recent.length > rollPulls) recent.shift(); }
        if (metric === "cumulative") {
          points.push(played > 0 ? { value: running, tally: { pulls: played, errors: running }, here } : null);
          return;
        }
        if (here === undefined) { points.push(null); return; }
        const errors = recent.reduce((s, x) => s + x, 0);
        points.push({ value: errors / recent.length, tally: { pulls: recent.length, errors }, here });
      });
      out.set(player.key, points);
    }
    return out;
  }, [players, perPull, metric, rollPulls]);

  const colorFor = (p: SeriesPlayer) => (p.className ? getClassColor(p.game as "wow" | "ffxiv", p.className) : FALLBACK_COLOR);
  const iconFor = (p: SeriesPlayer) => (p.className && p.game ? getPlayerSpecIcon(p.game as "wow" | "ffxiv", p.specId ?? 0, p.className) : null);
  const visible = players.filter((p) => !hidden.has(p.key));

  const n = axis.length;
  const maxY = Math.max(metric === "rate" ? 0.1 : 1, ...visible.flatMap((p) => (series.get(p.key) ?? []).map((pt) => pt?.value ?? 0)));
  const width = Math.max(plotWidth, PAD_LEFT + PAD_RIGHT + 40);
  const innerWidth = width - PAD_LEFT - PAD_RIGHT;
  const innerHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const xAt = (i: number) => PAD_LEFT + (n <= 1 ? innerWidth / 2 : (i / (n - 1)) * innerWidth);
  const yAt = (v: number) => PAD_TOP + innerHeight - (v / maxY) * innerHeight;
  const fmtValue = (v: number) => (metric === "rate" ? v.toFixed(2) : String(Math.round(v)));
  const sessionDate = (s: Session) => (s.date ? new Date(s.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—");
  const sessionName = (s: Session) => `Session ${s.number} · ${sessionDate(s)}`;

  const yTicks = useMemo(() => {
    const step = niceStep(maxY / 4);
    const out: number[] = [];
    for (let v = 0; v <= maxY + 1e-9; v += step) out.push(+v.toFixed(4));
    return out;
  }, [maxY]);
  // Session starts: a faint divider each, and the date where 60px+ from the last label.
  const sessionStarts = axis.map((a, i) => (i === 0 || axis[i - 1].sessionIdx !== a.sessionIdx ? i : -1)).filter((i) => i >= 0);
  const dateLabels: number[] = [];
  for (const i of sessionStarts) {
    if (dateLabels.length === 0 || xAt(i) - xAt(dateLabels[dateLabels.length - 1]) >= 60) dateLabels.push(i);
  }

  function toggle(key: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function setPreset(count: number | null) {
    setToIdx(null);
    setFromIdx(count === null ? null : Math.max(0, sessions.length - count));
  }

  if (pulls.length === 0) {
    return <p style={{ fontSize: "13px", color: INK_MUTED }}>No pulls imported yet — add a review to start building this chart.</p>;
  }

  const hoverAt = hover ? axis[hover.idx] : null;
  const hoverRows = hover
    ? visible
        .map((p) => ({ p, pt: series.get(p.key)?.[hover.idx] ?? null }))
        .filter((r): r is { p: SeriesPlayer; pt: NonNullable<Point> } => r.pt !== null)
        .sort((a, b) => b.pt.value - a.pt.value)
    : [];
  // The table: each session's value at its last pull in range.
  const sessionEnds = shown.map((s, si) => ({ s, i: axis.reduce((last, a, i) => (a.sessionIdx === si ? i : last), -1) })).filter((x) => x.i >= 0);

  const selectStyle = { padding: "3px 8px", fontSize: "12px" } as const;
  const presetActive = (count: number | null) => (toIdx === null || toIdx >= last) && (count === null ? from === 0 : from === Math.max(0, sessions.length - count));

  return (
    <div>
      {/* Controls: what's counted, then which slice of the static. */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
        <div style={{ display: "flex", gap: "4px" }}>
          {(["rate", "cumulative"] as Metric[]).map((m) => (
            <button key={m} onClick={() => setMetric(m)} className={`ck-tab${metric === m ? " ck-tab--active" : ""}`}
              title={m === "rate" ? "Errors per pull, averaged over each player's last pulls played" : "Running total since the first session in range"}>
              {m === "rate" ? "Per pull" : "Cumulative"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {(["majorOnly", "total"] as Severity[]).map((m) => (
            <button key={m} onClick={() => setSeverity(m)} className={`ck-tab${severity === m ? " ck-tab--active" : ""}`}>
              {m === "total" ? "Major + Minor" : "Major only"}
            </button>
          ))}
        </div>
        {metric === "rate" && (
          <label style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", color: INK_SECONDARY }}
            title="Each point averages the player's errors over their last pulls played (in range)">
            Average of last
            <select className="ck-field" value={rollPulls} onChange={(e) => setRollPulls(Number(e.target.value))} style={{ padding: "2px 6px", fontSize: "12px" }}>
              {ROLL_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            pulls
          </label>
        )}
        <button className="ck-btn" onClick={() => setShowTable((v) => !v)} style={{ marginLeft: "auto" }}>
          {showTable ? "Show chart" : "Show table"}
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "10px", fontSize: "12px", color: INK_SECONDARY }}>
        {bosses.length > 1 && (
          <select className="ck-field" value={activeBoss ?? ""} style={selectStyle}
            onChange={(e) => { setBoss(e.target.value); setPhase(null); setFromIdx(null); setToIdx(null); }}>
            {bosses.map((b) => <option key={b.name} value={b.name}>{b.name} ({b.pulls})</option>)}
          </select>
        )}
        <select className="ck-field" value={activePhase ?? ""} style={selectStyle}
          onChange={(e) => setPhase(e.target.value === "" ? null : Number(e.target.value))}
          disabled={bossPhases.length === 0}
          title={bossPhases.length === 0 ? "No session of this fight has phase detail yet (resync to add it)" : "Count only errors in this phase, per pull that reached it"}>
          <option value="">All phases</option>
          {bossPhases.map((p) => <option key={p.phaseId} value={p.phaseId}>{p.name}</option>)}
        </select>
        <span style={{ marginLeft: "6px" }}>Sessions</span>
        {[...RANGE_PRESETS.filter((c) => c < sessions.length), null].map((c) => (
          <button key={c ?? "all"} className={`ck-tab ck-tab--sm${presetActive(c) ? " ck-tab--active" : ""}`} onClick={() => setPreset(c)}>
            {c === null ? "All" : `Last ${c}`}
          </button>
        ))}
        <select className="ck-field" value={from} style={selectStyle} aria-label="From session"
          onChange={(e) => { const v = Number(e.target.value); setFromIdx(v); if (v > to) setToIdx(v); }}>
          {sessions.map((s, i) => <option key={s.reviewId} value={i}>{sessionName(s)}</option>)}
        </select>
        <span>to</span>
        <select className="ck-field" value={to} style={selectStyle} aria-label="To session"
          onChange={(e) => { const v = Number(e.target.value); setToIdx(v); if (v < from) setFromIdx(v); }}>
          {sessions.map((s, i) => <option key={s.reviewId} value={i} disabled={i < from}>{sessionName(s)}</option>)}
        </select>
      </div>

      {undetailed > 0 && (
        <p style={{ fontSize: "12px", color: INK_MUTED, margin: "0 0 8px" }}>
          {undetailed} session{undetailed === 1 ? "" : "s"} in this range {undetailed === 1 ? "has" : "have"} no phase detail and {undetailed === 1 ? "is" : "are"} left out.
          Resync {undetailed === 1 ? "it" : "them"} (Import / resync reports, under Sessions) to include {undetailed === 1 ? "it" : "them"}.
        </p>
      )}

      {/* Legend: also the visibility toggle */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginBottom: "10px" }}>
        {players.map((player) => {
          const isHidden = hidden.has(player.key);
          const icon = iconFor(player);
          return (
            <button key={player.key} onClick={() => toggle(player.key)} title={isHidden ? `Show ${player.name}` : `Hide ${player.name}`}
              style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", padding: 0, opacity: isHidden ? 0.4 : 1, fontSize: "12px", color: INK_SECONDARY }}>
              {icon
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={icon} alt="" width={16} height={16} style={{ borderRadius: "2px", flexShrink: 0 }} />
                : <span style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: colorFor(player), flexShrink: 0 }} />}
              <span style={{ color: colorFor(player) }}>{player.name}</span>
            </button>
          );
        })}
      </div>

      {n === 0 ? (
        <p style={{ fontSize: "13px", color: INK_MUTED }}>No sessions in this selection.</p>
      ) : showTable ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "12px" }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: "left" }}>Session (value at its last pull)</th>
                {visible.map((p) => <th key={p.key} style={{ ...thStyle, textAlign: "right", color: colorFor(p) }}>{p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {sessionEnds.map(({ s, i }) => (
                <tr key={s.reviewId}>
                  <td style={{ padding: "6px 8px", color: INK_PRIMARY, whiteSpace: "nowrap" }}>{sessionName(s)}{s.label ? ` · ${s.label}` : ""}</td>
                  {visible.map((p) => {
                    const pt = series.get(p.key)?.[i] ?? null;
                    return (
                      <td key={p.key} style={{ padding: "6px 8px", textAlign: "right", color: INK_SECONDARY, fontVariantNumeric: "tabular-nums" }}
                        title={pt ? `${pt.tally.errors} errors in ${pt.tally.pulls} pulls` : "Sat out"}>
                        {pt ? fmtValue(pt.value) : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={plotRef} style={{ position: "relative" }} onMouseLeave={() => setHover(null)}>
          <svg width={width} height={CHART_HEIGHT} style={{ display: "block" }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const mx = e.clientX - rect.left;
              const idx = n <= 1 ? 0 : Math.round(((mx - PAD_LEFT) / innerWidth) * (n - 1));
              setHover({ idx: Math.max(0, Math.min(n - 1, idx)), x: mx, y: e.clientY - rect.top });
            }}>
            {yTicks.map((v) => (
              <g key={v}>
                <line x1={PAD_LEFT} y1={yAt(v)} x2={width - PAD_RIGHT} y2={yAt(v)} stroke={GRIDLINE} strokeWidth={1} />
                <text x={PAD_LEFT - 8} y={yAt(v) + 4} textAnchor="end" fontSize={11} fill={INK_MUTED}>{fmtValue(v)}</text>
              </g>
            ))}
            <line x1={PAD_LEFT} y1={PAD_TOP + innerHeight} x2={width - PAD_RIGHT} y2={PAD_TOP + innerHeight} stroke={BASELINE} strokeWidth={1} />
            <text x={12} y={PAD_TOP + innerHeight / 2} fontSize={11} fill={INK_MUTED} textAnchor="middle"
              transform={`rotate(-90 12 ${PAD_TOP + innerHeight / 2})`}>
              {metric === "rate" ? "errors per pull" : "errors in range"}
            </text>
            {sessionStarts.slice(1).map((i) => (
              <line key={`s${i}`} x1={(xAt(i - 1) + xAt(i)) / 2} x2={(xAt(i - 1) + xAt(i)) / 2} y1={PAD_TOP} y2={PAD_TOP + innerHeight}
                stroke={GRIDLINE} strokeWidth={1} />
            ))}
            {dateLabels.map((i) => (
              <text key={`d${i}`} x={xAt(i)} y={CHART_HEIGHT - 8} textAnchor={i === 0 ? "start" : xAt(i) > width - 40 ? "end" : "middle"} fontSize={11} fill={INK_MUTED}>
                {sessionDate(axis[i].session)}
              </text>
            ))}

            {hover && <line x1={xAt(hover.idx)} y1={PAD_TOP} x2={xAt(hover.idx)} y2={PAD_TOP + innerHeight} stroke={INK_MUTED} strokeWidth={1} strokeDasharray="3,3" />}

            {visible.map((player) => {
              const pts = series.get(player.key) ?? [];
              // Breaks where the player sat out (rate); a lone point is a dot.
              const segs: string[] = [];
              const dots: number[] = [];
              let cur: string[] = [];
              const flush = (end: number) => {
                if (cur.length === 1) dots.push(end);
                else if (cur.length > 1) segs.push(cur.join(" "));
                cur = [];
              };
              pts.forEach((pt, i) => {
                if (!pt) { flush(i - 1); return; }
                cur.push(`${cur.length === 0 ? "M" : "L"} ${xAt(i)} ${yAt(pt.value)}`);
              });
              flush(pts.length - 1);
              const color = colorFor(player);
              return (
                <g key={player.key}>
                  {segs.map((d, k) => <path key={k} d={d} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />)}
                  {dots.map((i) => <circle key={i} cx={xAt(i)} cy={yAt(pts[i]!.value)} r={2.5} fill={color} />)}
                </g>
              );
            })}

            {hover && visible.map((player) => {
              const pt = series.get(player.key)?.[hover.idx];
              return pt ? <circle key={player.key} cx={xAt(hover.idx)} cy={yAt(pt.value)} r={4} fill={colorFor(player)} stroke="#1a1a1a" strokeWidth={1.5} /> : null;
            })}
          </svg>

          {/* Compact tooltip at the cursor, flipped left near the right edge. */}
          {hover && hoverAt && (
            <div style={{
              position: "absolute", pointerEvents: "none", zIndex: 5, width: TOOLTIP_WIDTH,
              left: hover.x + 14 + TOOLTIP_WIDTH > width ? Math.max(0, hover.x - 14 - TOOLTIP_WIDTH) : hover.x + 14,
              top: Math.max(0, Math.min(hover.y - 20, CHART_HEIGHT - 60)),
              background: "#0d1013", border: "1px solid var(--ck-line-2)", borderRadius: 4, padding: "7px 9px",
              fontSize: "11.5px", lineHeight: 1.45, color: INK_SECONDARY, boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
            }}>
              <div style={{ color: INK_PRIMARY, fontWeight: 600 }}>
                {hoverAt.pull.bossName} #{hoverAt.pull.pullNumber}{" "}
                <span style={{ color: hoverAt.pull.result === "Kill" ? "#4ade80" : INK_SECONDARY, fontWeight: 400 }}>{hoverAt.pull.result}</span>
              </div>
              <div style={{ color: INK_MUTED, marginBottom: 4 }}>
                {sessionName(hoverAt.session)}{hoverAt.session.label ? ` · ${hoverAt.session.label}` : ""}
              </div>
              {hoverRows.length === 0 && <div style={{ color: INK_MUTED }}>Nobody shown played this pull.</div>}
              {hoverRows.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "8px minmax(0, 1fr) auto auto auto", gap: "0 6px", alignItems: "center" }}>
                  <span /><span />
                  <span style={{ color: INK_MUTED, fontSize: 10.5 }}>{metric === "rate" ? `last ${rollPulls}` : "total"}</span>
                  <span style={{ color: INK_MUTED, fontSize: 10.5, textAlign: "right" }}>{metric === "rate" ? "err/pulls" : "pulls"}</span>
                  <span style={{ color: INK_MUTED, fontSize: 10.5, textAlign: "right" }}>this pull</span>
                  {hoverRows.map(({ p, pt }) => [
                    <span key={`c${p.key}`} style={{ width: 8, height: 8, borderRadius: 2, background: colorFor(p) }} />,
                    <span key={`n${p.key}`} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>,
                    <span key={`v${p.key}`} style={{ color: INK_PRIMARY, fontVariantNumeric: "tabular-nums" }}>{fmtValue(pt.value)}</span>,
                    <span key={`t${p.key}`} style={{ color: INK_MUTED, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                      {metric === "rate" ? `${pt.tally.errors}/${pt.tally.pulls}` : pt.tally.pulls}
                    </span>,
                    <span key={`h${p.key}`} style={{ fontVariantNumeric: "tabular-nums", textAlign: "right", color: pt.here ? INK_PRIMARY : INK_MUTED }}>
                      {pt.here === undefined ? "sat out" : pt.here}
                    </span>,
                  ])}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** 1, 2 or 5 times a power of ten, at least `raw`. */
function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
}

const CHART_HEIGHT = 320;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;
const PAD_LEFT = 48;
const PAD_RIGHT = 16;
const TOOLTIP_WIDTH = 250;
// Plot width for the first render, before the ResizeObserver measures.
const FALLBACK_WIDTH = 720;
const thStyle = { padding: "6px 8px", color: INK_MUTED, borderBottom: `1px solid ${GRIDLINE}` } as const;
