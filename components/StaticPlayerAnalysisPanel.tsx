"use client";

// components/StaticPlayerAnalysisPanel.tsx
//
// One player's view of the static's detailed sessions: their mechanics
// ranked for the selected boss/phase/sessions (chances limited to pulls they
// played), their first sessions against their last per mechanic, and a strip
// across the fight timeline showing where their counted errors cluster.
// Clicking a mechanic narrows the strip to it. Data:
// /api/statics/[staticId]/analysis/players/[identityId]
// (lib/static-analysis.ts). Separate from StaticPlayersPanel, which is the
// identity-management tool.

import { useEffect, useMemo, useState } from "react";
import { PanelHeader } from "@/components/ui/Panel";
import { SEVERITY_COLOR } from "@/components/SeverityIcon";
import { getClassColor } from "@/lib/player-display";
import {
  AnalysisCoverageNote, AnalysisFilterBar, DEFAULT_ANALYSIS_FILTER, MechanicTable,
  analysisQuery, rankMechanics,
  type AnalysisContextResponse, type AnalysisFilterState, type MechanicStats, type SessionTallyPoint,
} from "@/components/StaticAnalysisParts";
import type { TimelineError } from "@/lib/static-analysis";

type PlayerOption = {
  id:         number;
  name:       string;
  job:        { game: string; className: string; specId: number | null } | null;
  pullsCount: number;
};

type PlayerAnalysisResponse = AnalysisContextResponse & {
  player:        { id: number; name: string };
  pullsPlayed:   number;
  maxDurationMs: number;
  mechanics:     MechanicStats[];
  timeline:      TimelineError[];
};

/** Sessions compared at each end for "first vs last". */
const COMPARE_SESSIONS = 3;

export default function StaticPlayerAnalysisPanel({ staticId, dataVersion = 0 }: { staticId: number; dataVersion?: number }) {
  const [players, setPlayers] = useState<PlayerOption[] | null>(null);
  const [identityId, setIdentityId] = useState<number | null>(null);
  const [filter, setFilter] = useState<AnalysisFilterState>(DEFAULT_ANALYSIS_FILTER);
  const [data, setData] = useState<PlayerAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMechanic, setSelectedMechanic] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/statics/${staticId}/players`)
      .then(async (res) => {
        const d = await res.json();
        if (!res.ok) { setError(d.error || "Failed to load players"); return; }
        const next: PlayerOption[] = [...d.players].sort((a: PlayerOption, b: PlayerOption) => a.name.localeCompare(b.name));
        setPlayers(next);
        // The selected player may just have been deleted.
        setIdentityId((id) => (id !== null && !next.some((p) => p.id === id) ? null : id));
      })
      .catch(() => setError("Failed to load players"));
  }, [staticId, dataVersion]);

  // Reads only this app's database (no WCL/FFLogs call).
  useEffect(() => {
    if (identityId === null) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/statics/${staticId}/analysis/players/${identityId}?${analysisQuery(filter)}`)
      .then(async (res) => {
        const d = await res.json();
        if (cancelled) return;
        if (!res.ok) { setError(d.error || "Failed to load player analysis"); return; }
        setError(null);
        setData(d);
      })
      .catch(() => { if (!cancelled) setError("Failed to load player analysis"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [staticId, identityId, filter, dataVersion]);

  // A selection that the new filter no longer contains would leave the strip empty.
  useEffect(() => {
    if (selectedMechanic && data && !data.mechanics.some((m) => m.mechanicKey === selectedMechanic)) setSelectedMechanic(null);
  }, [data, selectedMechanic]);

  const ranked = useMemo(() => (data ? rankMechanics(data.mechanics) : []), [data]);
  const selectedLabel = data?.mechanics.find((m) => m.mechanicKey === selectedMechanic)?.label ?? null;
  const shown = data && data.player.id === identityId ? data : null;

  return (
    <div>
      <PanelHeader title="Player Analysis" subtitle={shown?.boss ?? undefined}>
        <select
          className="ck-field"
          value={identityId ?? ""}
          onChange={(e) => { setIdentityId(e.target.value ? Number(e.target.value) : null); setSelectedMechanic(null); }}
          style={{ padding: "4px 8px", fontSize: "12px" }}
        >
          <option value="">Select player…</option>
          {(players ?? []).map((p) => (
            <option
              key={p.id}
              value={p.id}
              style={p.job ? { color: getClassColor(p.job.game as "wow" | "ffxiv", p.job.className) } : undefined}
            >
              {p.name}
            </option>
          ))}
        </select>
        <AnalysisFilterBar filter={filter} onChange={setFilter} context={shown} />
      </PanelHeader>

      <div style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: "12px", opacity: loading && shown ? 0.6 : 1 }}>
        {error && <p className="ck-error-text" style={{ margin: 0 }}>{error}</p>}
        {identityId === null ? (
          <p className="ck-dialog-text" style={{ margin: 0 }}>Pick a player to see which mechanics they fail most, whether that is improving, and where in the fight their errors cluster.</p>
        ) : shown == null ? (
          <p className="ck-dialog-text" style={{ margin: 0 }}>Loading analysis...</p>
        ) : shown.boss === null ? (
          <p className="ck-dialog-text" style={{ margin: 0 }}>No sessions with detailed tracking yet. Add or resync a session to start collecting per-mechanic data.</p>
        ) : shown.pullsPlayed === 0 ? (
          <p className="ck-dialog-text" style={{ margin: 0 }}>{shown.player.name} played none of the pulls in this filter.</p>
        ) : (
          <>
            <AnalysisCoverageNote context={shown} extra={`${shown.player.name} played ${shown.pullsPlayed}`} />
            <section>
              <h3 className="ck-section-label" style={{ margin: "0 0 8px" }}>
                {filter.includeMinors ? "Major + Minor errors" : "Major errors"} by mechanic
              </h3>
              <MechanicTable
                mechanics={ranked}
                phases={shown.phases}
                sessions={shown.sessions}
                showPlayers={false}
                selectedKey={selectedMechanic}
                onSelect={(key) => setSelectedMechanic((cur) => (cur === key ? null : key))}
                extraColumn={{
                  header: "First → last",
                  title:  `Their first ${COMPARE_SESSIONS} sessions with chances against their last ${COMPARE_SESSIONS} (fewer when there aren't enough to split)`,
                  render: (m) => <FirstVsLast points={m.perSession} />,
                }}
              />
            </section>
            <section>
              <h3 className="ck-section-label" style={{ margin: "0 0 8px" }}>
                Where in the fight{selectedLabel ? `: ${selectedLabel}` : ""}
                {selectedLabel && (
                  <button className="ck-btn ck-btn--xs" onClick={() => setSelectedMechanic(null)} style={{ textTransform: "none", letterSpacing: 0 }}>
                    Show all
                  </button>
                )}
              </h3>
              <TimelineStrip
                errors={selectedMechanic ? shown.timeline.filter((t) => t.mechanicKey === selectedMechanic) : shown.timeline}
                maxDurationMs={shown.maxDurationMs}
              />
            </section>
          </>
        )}
      </div>
    </div>
  );
}

/** "2/9 → 0/8": failures out of chances in the player's first vs last sessions. */
function FirstVsLast({ points }: { points: SessionTallyPoint[] }) {
  const usable = points.filter((p) => p.chances > 0);
  const n = Math.min(COMPARE_SESSIONS, Math.floor(usable.length / 2));
  if (n < 1) return <span style={{ color: "var(--ck-text-3)" }}>—</span>;
  const sum = (ps: SessionTallyPoint[]) => ps.reduce((acc, p) => ({ failed: acc.failed + p.failed, chances: acc.chances + p.chances }), { failed: 0, chances: 0 });
  const first = sum(usable.slice(0, n));
  const last = sum(usable.slice(-n));
  const before = first.failed / first.chances;
  const after = last.failed / last.chances;
  const color = after < before ? "#4ade80" : after > before ? "#f87171" : "var(--ck-text-3)";
  return (
    <span
      style={{ whiteSpace: "nowrap" }}
      title={`First ${n} session${n === 1 ? "" : "s"}: ${Math.round(before * 100)}% · last ${n}: ${Math.round(after * 100)}%`}
    >
      {first.failed}/{first.chances} <span style={{ color }}>→</span> {last.failed}/{last.chances}
    </span>
  );
}

/**
 * Error counts in fixed time bins across the fight, so clusters ("the spread
 * about a minute in") stand out. Majors and Minors stack in their colours.
 */
function TimelineStrip({ errors, maxDurationMs }: { errors: TimelineError[]; maxDurationMs: number }) {
  if (errors.length === 0 || maxDurationMs <= 0) {
    return <p className="ck-dialog-text" style={{ margin: 0 }}>No counted errors to place.</p>;
  }
  const width = 1000;
  const height = 70;
  const axis = 14;
  // About 60 bins, rounded to a 5 s multiple.
  const binMs = Math.max(5_000, Math.ceil(maxDurationMs / 60 / 5_000) * 5_000);
  const binCount = Math.ceil(maxDurationMs / binMs);
  const bins = Array.from({ length: binCount }, () => ({ major: 0, minor: 0, labels: new Map<string, number>() }));
  for (const e of errors) {
    const bin = bins[Math.min(binCount - 1, Math.floor(e.timestampMs / binMs))];
    if (e.severity === "Minor") bin.minor += 1; else bin.major += 1;
    bin.labels.set(e.label, (bin.labels.get(e.label) ?? 0) + 1);
  }
  const maxCount = Math.max(1, ...bins.map((b) => b.major + b.minor));
  const binW = width / binCount;
  const plotH = height - axis;
  const tickEveryMs = maxDurationMs > 8 * 60_000 ? 120_000 : 60_000;
  const ticks: number[] = [];
  for (let t = 0; t <= maxDurationMs; t += tickEveryMs) ticks.push(t);

  return (
    <div>
    {/* Bars stretch to the panel width (preserveAspectRatio none); the time
        labels are HTML below so they don't stretch with them. */}
    <svg viewBox={`0 0 ${width} ${plotH}`} preserveAspectRatio="none" style={{ width: "100%", height: `${plotH}px`, display: "block" }}>
      <line x1={0} x2={width} y1={plotH} y2={plotH} stroke="var(--ck-line-2)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      {bins.map((b, i) => {
        const total = b.major + b.minor;
        if (total === 0) return null;
        const majorH = (b.major / maxCount) * (plotH - 2);
        const minorH = (b.minor / maxCount) * (plotH - 2);
        const from = fmt(i * binMs);
        const to = fmt(Math.min(maxDurationMs, (i + 1) * binMs));
        const title = `${from}–${to}: ${total} error${total === 1 ? "" : "s"}\n` +
          [...b.labels].sort((x, y) => y[1] - x[1]).map(([label, n]) => `${label}: ${n}`).join("\n");
        return (
          <g key={i}>
            <title>{title}</title>
            <rect x={i * binW + 0.5} y={plotH - majorH} width={Math.max(1, binW - 1)} height={majorH} fill={SEVERITY_COLOR.Major} opacity={0.8} />
            <rect x={i * binW + 0.5} y={plotH - majorH - minorH} width={Math.max(1, binW - 1)} height={minorH} fill={SEVERITY_COLOR.Minor} opacity={0.8} />
          </g>
        );
      })}
    </svg>
    <div style={{ position: "relative", height: `${axis}px` }}>
      {ticks.map((t) => (
        <span
          key={t}
          className="ck-num"
          style={{
            position:  "absolute",
            left:      `${(t / maxDurationMs) * 100}%`,
            transform: t === 0 ? "none" : "translateX(-50%)",
            fontSize:  "10px",
            color:     "var(--ck-text-3)",
            whiteSpace: "nowrap",
          }}
        >
          {fmt(t)}
        </span>
      ))}
    </div>
    </div>
  );
}

function fmt(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
