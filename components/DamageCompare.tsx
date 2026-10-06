"use client";

// components/DamageCompare.tsx
//
// The Damage dialog's "Compare with clears" view (docs/damage-analysis-plan.md,
// Layer 4; lib/damage/compare.ts). The user pastes reference clears and
// presses Fetch: nothing loads on its own (CLAUDE.md: no hidden costs).
// Shows raid, role and per-player rDPS over equal windows from the start of
// the deciding phase, against the median of the clears' players of the same
// job, with the own / given split and GCD rates beside it.

import { useMemo, useState } from "react";
import type { Pull } from "@/types/Pull";
import { analyzePullDamage } from "@/lib/damage/analyze";
import { compareWithReferences, type CompareLog, type CompareRow } from "@/lib/damage/compare";
import { getDamageContext } from "@/lib/damage/contexts";
import { FFXIV_DAMAGE } from "@/lib/damage/ffxiv/game";
import { loadReferenceClear, parseReferenceInput } from "@/lib/damage/reference-clears";
import type { PullDamageAnalysis } from "@/lib/damage/types";
import { getClassColor } from "@/lib/player-display";
import { SEVERITY_COLOR } from "./SeverityIcon";

export type ReferenceClear = CompareLog & { source: "sample" | "live" };

const k = (n: number | undefined) => (n === undefined || !Number.isFinite(n) ? "—" : `${(n / 1000).toFixed(1)}k`);
const rate = (n: number | undefined) => (n === undefined || !Number.isFinite(n) ? "—" : n.toFixed(1));

function Delta({ value, base }: { value: number; base?: number }) {
  if (base === undefined || !Number.isFinite(base) || base <= 0) return <span style={{ color: "var(--ck-text-3)" }}>—</span>;
  const d = (value - base) / base;
  const color = d <= -0.03 ? SEVERITY_COLOR.Major : d >= 0.03 ? "var(--ck-arcane-text)" : "var(--ck-text-2)";
  return <span className="ck-num" style={{ color }}>{d >= 0 ? "+" : ""}{(d * 100).toFixed(0)}%</span>;
}

export default function DamageCompare({ ownPulls, analyses, refs, onRefsChange }: {
  ownPulls:  Pull[];
  analyses:  Map<number, PullDamageAnalysis>;
  refs:      ReferenceClear[];
  onRefsChange: (refs: ReferenceClear[]) => void;
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bossName = ownPulls[0]?.name;
  const fetchRef = async () => {
    const parsed = parseReferenceInput(input);
    if (!parsed) { setError("Paste an FFLogs report URL (with ?fight=) or a report code."); return; }
    setBusy(true); setError(null);
    try {
      const { pull, source } = await loadReferenceClear(parsed);
      if (bossName && pull.name !== bossName) throw new Error(`That fight is ${pull.name}, not ${bossName}.`);
      if (pull.result !== "Kill") throw new Error("That fight isn't a kill; reference clears must be kills.");
      const label = `${parsed.code} #${pull.fightId}`;
      if (refs.some((r) => r.label === label)) throw new Error("That clear is already loaded.");
      const analysis = analyzePullDamage(pull, FFXIV_DAMAGE, getDamageContext(pull.name));
      onRefsChange([...refs, { pull, analysis, label, source }]);
      setInput("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const result = useMemo(() => {
    if (refs.length === 0 || ownPulls.length === 0) return null;
    const own: CompareLog[] = ownPulls.flatMap((p) => {
      const a = analyses.get(p.id);
      return a ? [{ pull: p, analysis: a, label: `#${p.pullNumber}` }] : [];
    });
    return compareWithReferences(own, refs, FFXIV_DAMAGE, getDamageContext(bossName ?? ""));
  }, [refs, ownPulls, analyses, bossName]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          className="ck-field"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !busy) void fetchRef(); }}
          placeholder="FFLogs clear URL (with ?fight=) or report code"
          style={{ flex: "1 1 320px", padding: "4px 8px" }}
        />
        <button className="ck-btn ck-btn--sm" disabled={busy || !input.trim()} onClick={() => void fetchRef()}>
          {busy ? "Fetching…" : "Fetch clear"}
        </button>
        <span className="ck-help" style={{ margin: 0 }}>
          Loads one fight: local sample data if it&apos;s there, otherwise from FFLogs (uses API points).
        </span>
      </div>
      {error && <p className="ck-error-text" style={{ margin: 0 }}>{error}</p>}
      {refs.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {refs.map((r) => (
            <span key={r.label} className="ck-chip" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              title={r.pull.players.map((p) => p.className).join(", ")}>
              <span className="ck-num">{r.label}</span>
              <span style={{ color: "var(--ck-text-3)", fontSize: 11 }}>{r.pull.players.map((p) => p.className.split(" ").map((w) => w[0]).join("")).join(" ")}</span>
              <button className="ck-btn ck-btn--xs" aria-label={`Remove ${r.label}`} onClick={() => onRefsChange(refs.filter((x) => x !== r))}>✕</button>
            </span>
          ))}
        </div>
      )}

      {result === null ? (
        <p className="ck-dialog-text">
          Add reference clears to compare against: kills of this fight by other groups, ideally with your jobs and the same
          tank and healer pairs. Each is measured over the same window from the start of the phase that decides the enrage.
        </p>
      ) : "error" in result ? (
        <p className="ck-dialog-text">{result.error}</p>
      ) : (
        <>
          <p className="ck-help" style={{ margin: 0 }}>
            {result.phaseName}: the first <span className="ck-num">{(result.windowMs / 1000).toFixed(0)}s</span> of the phase in
            every log{result.ownPulls > 1 ? ` (median over ${result.ownPulls} pulls that reached it, each measured against the clears over its own window)` : ""}.
            Clears are the median of their players of the same job. A burst that straddles the window&apos;s end reads as a
            missing cast; check before blaming a rotation. rDPS = own damage + buffs given.
          </p>
          <div className="ck-table-wrap" style={{ overflow: "auto", minHeight: 0 }}>
            <table className="ck-table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th>Player</th><th style={{ textAlign: "right" }}>rDPS</th><th style={{ textAlign: "right" }}>Clears</th>
                  <th style={{ textAlign: "right" }}>Δ</th><th style={{ textAlign: "right" }}>Own</th><th style={{ textAlign: "right" }}>Given</th>
                  <th style={{ textAlign: "right" }}>GCD/min</th><th style={{ textAlign: "right" }}>Heal GCD/min</th>
                  <th style={{ textAlign: "right" }} title="The analysis's estimated unforced loss inside the window">Est. loss/s</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ color: "var(--ck-text)", fontWeight: 600 }}>Raid (damage dealt)</td>
                  <td className="ck-num" style={{ textAlign: "right" }}>{k(result.raid.dps)}</td>
                  <td className="ck-num" style={{ textAlign: "right" }}>{k(result.raid.refDps)}</td>
                  <td style={{ textAlign: "right" }}><Delta value={result.raid.dps} base={result.raid.refDps} /></td>
                  <td colSpan={5} />
                </tr>
                {result.roles.map((r) => (
                  <tr key={r.role}>
                    <td style={{ color: "var(--ck-text)", fontWeight: 600 }}>{r.role === "DPS" ? "DPS (4)" : `${r.role}s (2)`}</td>
                    <td className="ck-num" style={{ textAlign: "right" }}>{k(r.rdps)}</td>
                    <td className="ck-num" style={{ textAlign: "right" }}>{k(r.refRdps)}</td>
                    <td style={{ textAlign: "right" }}><Delta value={r.rdps} base={r.refRdps} /></td>
                    <td colSpan={5} />
                  </tr>
                ))}
                {result.rows.map((p: CompareRow) => (
                  <tr key={p.player}>
                    <td>
                      <span style={{ display: "inline-block", width: 3, height: 10, marginRight: 6, background: getClassColor("ffxiv", p.job) }} />
                      <span style={{ color: "var(--ck-text)" }}>{p.player}</span>
                      <span style={{ color: "var(--ck-text-3)" }}> {p.job}</span>
                    </td>
                    <td className="ck-num" style={{ textAlign: "right" }}>{k(p.rdps)}</td>
                    <td className="ck-num" style={{ textAlign: "right" }} title={`${p.refCount} reference ${p.job}${p.refCount === 1 ? "" : "s"}`}>
                      {k(p.ref?.rdps)}{p.refCount > 0 && <span style={{ color: "var(--ck-text-3)" }}> ({p.refCount})</span>}
                    </td>
                    <td style={{ textAlign: "right" }}><Delta value={p.rdps} base={p.ref?.rdps} /></td>
                    <td className="ck-num" style={{ textAlign: "right" }}>{k(p.ownDps)} / {k(p.ref?.ownDps)}</td>
                    <td className="ck-num" style={{ textAlign: "right" }}>{k(p.givenDps)} / {k(p.ref?.givenDps)}</td>
                    <td className="ck-num" style={{ textAlign: "right" }}>{rate(p.gcdsPerMin)} / {rate(p.ref?.gcdsPerMin)}</td>
                    <td className="ck-num" style={{ textAlign: "right" }}>
                      {p.healGcdsPerMin || p.ref?.healGcdsPerMin ? `${rate(p.healGcdsPerMin)} / ${rate(p.ref?.healGcdsPerMin)}` : "—"}
                    </td>
                    <td className="ck-num" style={{ textAlign: "right" }}>{k(p.lostDps)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ck-help" style={{ margin: 0 }}>Pairs read <em>yours / the clears&apos;</em>. A job with no clear player shows —.</p>
        </>
      )}
    </div>
  );
}
