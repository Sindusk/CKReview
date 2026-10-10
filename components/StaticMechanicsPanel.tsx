"use client";

// components/StaticMechanicsPanel.tsx
//
// Raid view of the static's detailed sessions: mechanics ranked by failure
// rate per chance, and what ended the wipes, for one boss, phase and
// session range. Data: /api/statics/[staticId]/analysis/mechanics and
// /wipe-causes (lib/static-analysis.ts). Sessions imported before detailed
// tracking are left out and counted in the coverage line.

import { useEffect, useState } from "react";
import { PanelHeader } from "@/components/ui/Panel";
import {
  AnalysisCoverageNote, AnalysisFilterBar, DEFAULT_ANALYSIS_FILTER, MIN_CHANCES, MechanicTable, Sparkline,
  analysisQuery, rankMechanics,
  type AnalysisContextResponse, type AnalysisFilterState, type MechanicStats,
} from "@/components/StaticAnalysisParts";

type WipeCause = {
  key:        string;
  label:      string;
  count:      number;
  kinds:      { raidError: number; deathChain: number; called: number };
  perSession: { sessionId: number; count: number }[];
};

type MechanicsResponse = AnalysisContextResponse & { mechanics: MechanicStats[] };
type WipeCausesResponse = AnalysisContextResponse & {
  wipes:      number;
  unknown:    number;
  causes:     WipeCause[];
  perSession: { sessionId: number; wipes: number }[];
};

const KIND_LABEL: Record<keyof WipeCause["kinds"], string> = {
  raidError:  "raid error",
  deathChain: "deaths",
  called:     "called",
};

export default function StaticMechanicsPanel({ staticId, dataVersion = 0 }: { staticId: number; dataVersion?: number }) {
  const [filter, setFilter] = useState<AnalysisFilterState>(DEFAULT_ANALYSIS_FILTER);
  const [mechanics, setMechanics] = useState<MechanicsResponse | null>(null);
  const [wipes, setWipes] = useState<WipeCausesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reads only this app's database (no WCL/FFLogs call), so refetching on
  // every filter change is free.
  useEffect(() => {
    let cancelled = false;
    const q = analysisQuery(filter);
    setLoading(true);
    Promise.all([
      fetch(`/api/statics/${staticId}/analysis/mechanics?${q}`).then((r) => r.json().then((d) => ({ ok: r.ok, d }))),
      fetch(`/api/statics/${staticId}/analysis/wipe-causes?${q}`).then((r) => r.json().then((d) => ({ ok: r.ok, d }))),
    ])
      .then(([m, w]) => {
        if (cancelled) return;
        if (!m.ok || !w.ok) { setError(m.d.error || w.d.error || "Failed to load analysis"); return; }
        setError(null);
        setMechanics(m.d);
        setWipes(w.d);
      })
      .catch(() => { if (!cancelled) setError("Failed to load analysis"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [staticId, filter, dataVersion]);

  const context = mechanics;
  const noDetail = context !== null && context.boss === null;

  return (
    <div>
      <PanelHeader title="Mechanics" subtitle={context?.boss ?? undefined}>
        <AnalysisFilterBar filter={filter} onChange={setFilter} context={context} />
      </PanelHeader>

      <div style={{ padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: "12px", opacity: loading && context ? 0.6 : 1 }}>
        {error && <p className="ck-error-text" style={{ margin: 0 }}>{error}</p>}
        {context == null ? (
          <p className="ck-dialog-text" style={{ margin: 0 }}>Loading analysis...</p>
        ) : noDetail ? (
          <p className="ck-dialog-text" style={{ margin: 0 }}>
            No sessions with detailed tracking yet. Add or resync a session to start collecting per-mechanic data
            {context.undetailedSessions > 0 ? ` (${context.undetailedSessions} existing session${context.undetailedSessions === 1 ? "" : "s"} predate it)` : ""}.
          </p>
        ) : (
          <>
            <AnalysisCoverageNote context={context} />
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)", gap: "16px", alignItems: "start" }}>
              <section style={{ minWidth: 0 }}>
                <h3 className="ck-section-label" style={{ margin: "0 0 8px" }}>
                  {filter.includeMinors ? "Major + Minor errors" : "Major errors"} by mechanic
                </h3>
                <MechanicTable mechanics={rankMechanics(context.mechanics)} phases={context.phases} sessions={context.sessions} />
              </section>
              <section style={{ minWidth: 0 }}>
                <h3 className="ck-section-label" style={{ margin: "0 0 8px" }}>
                  What ended the wipes{wipes ? ` (${wipes.wipes})` : ""}
                </h3>
                {wipes && <WipeCauseList data={wipes} />}
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function WipeCauseList({ data }: { data: WipeCausesResponse }) {
  if (data.wipes === 0) return <p className="ck-dialog-text" style={{ margin: 0 }}>No wipes for this filter.</p>;
  const max = Math.max(1, ...data.causes.map((c) => c.count));
  // Per-session share of wipes, for the trend.
  const wipesBySession = new Map(data.perSession.map((s) => [s.sessionId, s.wipes]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {data.causes.map((c) => {
        const kinds = (Object.keys(c.kinds) as (keyof WipeCause["kinds"])[])
          .filter((k) => c.kinds[k] > 0)
          .map((k) => `${c.kinds[k]} ${KIND_LABEL[k]}`)
          .join(", ");
        const trend = c.perSession.map((s) => ({ sessionId: s.sessionId, failed: s.count, chances: wipesBySession.get(s.sessionId) ?? 0 }));
        return (
          <div key={c.key} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "4px 10px", alignItems: "center" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", fontSize: "12px" }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={c.label}>{c.label}</span>
                <span className="ck-num" style={{ color: "var(--ck-text-2)", flexShrink: 0 }} title={kinds}>
                  {c.count} · {Math.round((c.count / data.wipes) * 100)}%
                </span>
              </div>
              <div style={{ height: "4px", marginTop: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ width: `${(c.count / max) * 100}%`, height: "100%", background: "var(--ck-arcane)", opacity: 0.7 }} />
              </div>
            </div>
            {data.wipes >= MIN_CHANCES
              ? <Sparkline points={trend} sessions={data.sessions} width={56} height={16} />
              : <span />}
          </div>
        );
      })}
      {data.unknown > 0 && (
        <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--ck-text-3)" }}>
          {data.unknown} wipe{data.unknown === 1 ? "" : "s"} with no identifiable cause (a reset with the raid alive, or no deaths logged).
        </p>
      )}
    </div>
  );
}
