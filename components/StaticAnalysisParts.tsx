"use client";

// components/StaticAnalysisParts.tsx
//
// Shared pieces of the Statics analysis views (StaticMechanicsPanel for the
// raid, StaticPlayerAnalysisPanel for one player): the filter bar, the
// ranked mechanic table with its per-session trend, and the response types
// of /api/statics/[staticId]/analysis/*. Counting rules live in
// lib/static-analysis.ts; docs/static-player-analysis-plan.md has the why.

import type { CSSProperties, ReactNode } from "react";
import type { AnalysisPhase, AnalysisSession, MechanicStats } from "@/lib/static-analysis";
import { SEVERITY_COLOR } from "@/components/SeverityIcon";

export type { AnalysisPhase, AnalysisSession, MechanicStats };

/** Context every analysis response carries (contextSummary). */
export type AnalysisContextResponse = {
  boss:               string | null;
  bosses:             { name: string; pulls: number }[];
  phases:             AnalysisPhase[];
  sessions:           AnalysisSession[];
  undetailedSessions: number;
  pulls:              number;
  pullsWithoutPhases: number;
};

export type AnalysisFilterState = {
  boss:          string | null;
  phase:         number | null;
  /** Last N sessions; null = all. */
  sessions:      number | null;
  includeMinors: boolean;
};

export const DEFAULT_ANALYSIS_FILTER: AnalysisFilterState = { boss: null, phase: null, sessions: null, includeMinors: false };

/** Below this many chances a rate is shown muted and no trend is drawn. */
export const MIN_CHANCES = 5;

const SESSION_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "All sessions" },
  { value: 3,    label: "Last 3 sessions" },
  { value: 5,    label: "Last 5 sessions" },
  { value: 10,   label: "Last 10 sessions" },
];

export function analysisQuery(f: AnalysisFilterState): string {
  const q = new URLSearchParams();
  if (f.boss) q.set("boss", f.boss);
  if (f.phase !== null) q.set("phase", String(f.phase));
  if (f.sessions !== null) q.set("sessions", String(f.sessions));
  if (f.includeMinors) q.set("includeMinors", "true");
  return q.toString();
}

/** "P1: Kefka" → "P1", "Stage Two: The Dark Reactor" → "Stage Two". */
export function shortPhaseName(phases: AnalysisPhase[], id: number | null): string {
  if (id === null) return "—";
  const name = phases.find((p) => p.id === id)?.name;
  if (!name) return `Phase ${id}`;
  return name.split(":")[0].trim();
}

export function phaseName(phases: AnalysisPhase[], id: number | null): string {
  if (id === null) return "";
  return phases.find((p) => p.id === id)?.name ?? `Phase ${id}`;
}

export function AnalysisFilterBar({
  filter,
  onChange,
  context,
}: {
  filter:   AnalysisFilterState;
  onChange: (next: AnalysisFilterState) => void;
  context:  AnalysisContextResponse | null;
}) {
  const bosses = context?.bosses ?? [];
  const phases = context?.phases ?? [];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
      {bosses.length > 1 && (
        <select
          className="ck-field"
          value={context?.boss ?? ""}
          onChange={(e) => onChange({ ...filter, boss: e.target.value || null, phase: null })}
          style={selectStyle}
        >
          {bosses.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
        </select>
      )}
      <select
        className="ck-field"
        value={filter.phase ?? ""}
        onChange={(e) => onChange({ ...filter, phase: e.target.value === "" ? null : Number(e.target.value) })}
        disabled={phases.length === 0}
        title={phases.length === 0 ? "This encounter has no phase data in its logs" : undefined}
        style={selectStyle}
      >
        <option value="">All phases</option>
        {phases.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select
        className="ck-field"
        value={filter.sessions ?? ""}
        onChange={(e) => onChange({ ...filter, sessions: e.target.value === "" ? null : Number(e.target.value) })}
        style={selectStyle}
      >
        {SESSION_OPTIONS.map((o) => <option key={o.label} value={o.value ?? ""}>{o.label}</option>)}
      </select>
      <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--ck-text-2)", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={filter.includeMinors}
          onChange={(e) => onChange({ ...filter, includeMinors: e.target.checked })}
        />
        Include Minors
      </label>
    </div>
  );
}

/** One line on what the numbers cover and what they leave out. */
export function AnalysisCoverageNote({ context }: { context: AnalysisContextResponse }) {
  const parts: string[] = [];
  parts.push(`${context.sessions.length} session${context.sessions.length === 1 ? "" : "s"}, ${context.pulls} pull${context.pulls === 1 ? "" : "s"}`);
  if (context.undetailedSessions > 0) {
    parts.push(`${context.undetailedSessions} earlier session${context.undetailedSessions === 1 ? "" : "s"} predate detailed tracking (resync to include)`);
  }
  if (context.pullsWithoutPhases > 0) {
    parts.push(`${context.pullsWithoutPhases} pull${context.pullsWithoutPhases === 1 ? " has" : "s have"} no phase data and sit out phase-based rates`);
  }
  return <p style={{ margin: 0, fontSize: "11px", color: "var(--ck-text-3)" }}>{parts.join(" · ")}</p>;
}

function chanceTooltip(m: MechanicStats, phases: AnalysisPhase[]): string {
  if (m.chanceKind === "occurrence") return `Failed ${m.failed} of the ${m.chances} times it happened`;
  if (m.chanceKind === "phase") return `Failed in ${m.failed} of the ${m.chances} pulls that reached ${phaseName(phases, m.phase)}`;
  return `Failed in ${m.failed} of ${m.chances} pulls`;
}

/** Enough-sample rows first by rate, then the thin ones by failures. */
export function rankMechanics(mechanics: MechanicStats[]): MechanicStats[] {
  const solid = mechanics.filter((m) => m.chances >= MIN_CHANCES);
  const thin = mechanics.filter((m) => m.chances < MIN_CHANCES);
  solid.sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0) || b.failed - a.failed);
  thin.sort((a, b) => b.failed - a.failed || (b.rate ?? 0) - (a.rate ?? 0));
  return [...solid, ...thin];
}

export function MechanicTable({
  mechanics,
  phases,
  sessions,
  showPlayers = true,
  extraColumn,
}: {
  mechanics:    MechanicStats[];
  phases:       AnalysisPhase[];
  sessions:     AnalysisSession[];
  showPlayers?: boolean;
  /** Optional trailing column (the player view's first-vs-last comparison). */
  extraColumn?: { header: string; title?: string; render: (m: MechanicStats) => ReactNode };
}) {
  if (mechanics.length === 0) {
    return <p className="ck-dialog-text" style={{ margin: 0 }}>No counted errors for this filter.</p>;
  }
  return (
    <div className="ck-table-wrap" style={{ overflowX: "auto" }}>
      <table className="ck-table" style={{ fontSize: "12px", width: "100%" }}>
        <thead>
          <tr>
            <th style={th("left")}>Mechanic</th>
            <th style={th("left")}>Phase</th>
            <th style={th("right")} title="Failed chances out of chances: times the mechanic happened, or pulls that reached its phase">Failed</th>
            <th style={th("left")}>Rate</th>
            <th style={th("left")} title={`Rate per session, oldest to newest. Hidden below ${MIN_CHANCES} chances.`}>Trend</th>
            {showPlayers && <th style={th("right")} title="Players with at least one counted error">Players</th>}
            <th style={th("right")} title="Raw error count (several players can fail one chance)">Errors</th>
            {extraColumn && <th style={th("right")} title={extraColumn.title}>{extraColumn.header}</th>}
          </tr>
        </thead>
        <tbody>
          {mechanics.map((m) => {
            const thin = m.chances < MIN_CHANCES;
            const ratePct = m.rate !== null ? Math.round(m.rate * 100) : null;
            return (
              <tr key={m.mechanicKey} style={thin ? { opacity: 0.6 } : undefined}>
                <td style={td("left")} title={m.rules.map((r) => `${r.name}: ${r.errors}`).join("\n")}>{m.label}</td>
                <td style={{ ...td("left"), color: "var(--ck-text-2)", whiteSpace: "nowrap" }} title={phaseName(phases, m.phase)}>
                  {shortPhaseName(phases, m.phase)}
                </td>
                <td className="ck-num" style={td("right")} title={chanceTooltip(m, phases)}>
                  {m.failed}/{m.chances}
                </td>
                <td style={{ ...td("left"), minWidth: "110px" }} title={thin ? `Fewer than ${MIN_CHANCES} chances — too few to read much into` : undefined}>
                  <RateBar pct={ratePct} />
                </td>
                <td style={td("left")}>
                  {thin ? null : <Sparkline points={m.perSession} sessions={sessions} />}
                </td>
                {showPlayers && <td className="ck-num" style={td("right")}>{m.players}</td>}
                <td className="ck-num" style={td("right")}>{m.errors}</td>
                {extraColumn && <td className="ck-num" style={td("right")}>{extraColumn.render(m)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RateBar({ pct }: { pct: number | null }) {
  if (pct === null) return <span style={{ color: "var(--ck-text-3)" }}>—</span>;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <div style={{ flex: "1 1 auto", height: "6px", minWidth: "60px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: SEVERITY_COLOR.Major, opacity: 0.75 }} />
      </div>
      <span className="ck-num" style={{ width: "34px", textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

/** Per-session rate, oldest to newest; sessions without chances are skipped. */
export function Sparkline({
  points,
  sessions,
  width = 72,
  height = 18,
}: {
  points:   { sessionId: number; failed: number; chances: number }[];
  sessions: AnalysisSession[];
  width?:   number;
  height?:  number;
}) {
  const indexOf = new Map(sessions.map((s, i) => [s.id, i + 1]));
  const usable = points.filter((p) => p.chances > 0);
  if (usable.length < 2) return <span style={{ color: "var(--ck-text-3)", fontSize: "11px" }}>—</span>;
  const pad = 2;
  const xs = usable.map((_, i) => pad + (i * (width - 2 * pad)) / (usable.length - 1));
  const ys = usable.map((p) => height - pad - (p.failed / p.chances) * (height - 2 * pad));
  const title = usable.map((p) => `Session ${indexOf.get(p.sessionId) ?? "?"}: ${p.failed}/${p.chances}`).join("\n");
  return (
    <svg width={width} height={height} style={{ display: "block" }} aria-label="Rate per session">
      <title>{title}</title>
      <line x1={pad} x2={width - pad} y1={height - pad} y2={height - pad} stroke="var(--ck-line-2)" strokeWidth={1} />
      <polyline points={xs.map((x, i) => `${x},${ys[i]}`).join(" ")} fill="none" stroke="var(--ck-arcane)" strokeWidth={1.5} />
      {xs.map((x, i) => <circle key={i} cx={x} cy={ys[i]} r={1.8} fill="var(--ck-arcane-text)" />)}
    </svg>
  );
}

const selectStyle: CSSProperties = { padding: "4px 8px", fontSize: "12px" };

function th(align: "left" | "right"): CSSProperties {
  return { textAlign: align, padding: "7px 8px", whiteSpace: "nowrap" };
}

function td(align: "left" | "right"): CSSProperties {
  return { textAlign: align, padding: "6px 8px" };
}
