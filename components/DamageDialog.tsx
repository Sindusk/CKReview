"use client";

// components/DamageDialog.tsx
//
// "Damage" modal opened from the header bar (docs/damage-analysis-plan.md,
// UI). Shows where each player lost damage, scored in their own observed
// damage, with fight context from the boss's DamageContext:
//   - one pull: the phase summary, players ranked by estimated loss, and
//     the selected player's timeline strip and findings, each with its
//     basis; forced findings are greyed with their cause
//   - all loaded pulls: average loss per pull and the findings that recur
// Pure view over lib/damage/; nothing is fetched here. Pulls fetched before
// the damage fields existed say so; re-fetching stays an explicit action
// elsewhere in the app.
//
// Both games (docs/damage-analysis-plan.md, "WoW build order" step 5): each
// pull is analysed with its own game layer (FFXIV_DAMAGE / WOW_DAMAGE). WoW
// pulls are big, so pulls are analysed when first shown (one pull, or every
// pull for the "all loaded pulls" view) and cached for the open dialog.
// Reference clears work for both (WarcraftLogs clears for WoW pulls).

import { useMemo, useRef, useState } from "react";
import type { Pull } from "@/types/Pull";
import { analyzePullDamage } from "@/lib/damage/analyze";
import { aggregateDamage, type PlayerDamageAggregate } from "@/lib/damage/aggregate";
import { getDamageContext } from "@/lib/damage/contexts";
import { FFXIV_DAMAGE } from "@/lib/damage/ffxiv/game";
import { WOW_DAMAGE } from "@/lib/damage/wow/game";
import type { DamageFinding, PhaseDamageSummary, PlayerDamageSummary, PullDamageAnalysis } from "@/lib/damage/types";
import { getClassColor } from "@/lib/player-display";
import { useFFPullSelector } from "@/hooks/useFFPullSelector";
import { SEVERITY_COLOR } from "./SeverityIcon";
import { fmtTime } from "./MitigationTimeline";
import { Dialog } from "./ui/Dialog";
import DamageCompare, { type ReferenceClear } from "./DamageCompare";

type DamageDialogProps = {
  open:          boolean;
  onClose:       () => void;
  pulls:         Pull[];
  // The app's globally-selected pull; the dropdown resets to it on open.
  currentPullId: number | null;
};

const LOSS_COLOR = SEVERITY_COLOR.Major;

const fmtDamage = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : `${Math.round(n)}`;

const KIND_LABEL: Record<DamageFinding["kind"], string> = {
  "gcd-gap":          "GCD gap",
  "gcd-delays":       "GCD delays",
  "cooldown-drift":   "Cooldown drift",
  "death":            "Death",
  "penalty":          "Penalty",
  "proc-lost":        "Lost proc",
  "interrupted-cast": "Cancelled cast",
  "gcd-clipping":     "Clipping",
  "combo-broken":     "Broken combo",
  "disengage":        "Disengage",
  "positional":       "Positional",
  "buff-coverage":    "Buff coverage",
  "burst-window":     "Burst window",
  "buff-uptime":      "Buff uptime",
  "gauge-overcap":    "Overcap",
  "heal-gcd":         "Heal GCD",
  "dot-uptime":       "DoT uptime",
  "dot-clip":         "DoT clipping",
};

const gameOf = (p: Pull) => (p.game === "wow" ? WOW_DAMAGE : FFXIV_DAMAGE);

export default function DamageDialog({ open, onClose, pulls, currentPullId }: DamageDialogProps) {
  const { ffPulls: gamePulls, selectedPullId, setSelectedPullId, selectedPull } =
    useFFPullSelector(pulls, open, currentPullId, ["ffxiv", "wow"]);
  const [allPulls, setAllPulls] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [view, setView] = useState<"findings" | "compare">("findings");
  // Reference clears stay loaded while the app is open (this component
  // stays mounted when the dialog closes); re-adding one is a user action.
  const [refs, setRefs] = useState<ReferenceClear[]>([]);

  // Analyses are computed only for the pulls on show and cached per Pull
  // object; a re-import replaces the objects, so stale entries never match.
  const cache = useRef(new WeakMap<Pull, PullDamageAnalysis>());
  const analyses = useMemo(() => {
    const out = new Map<number, PullDamageAnalysis>();
    if (!open) return out;
    const shown = allPulls ? gamePulls : selectedPull ? [selectedPull] : [];
    for (const p of shown) {
      let a = cache.current.get(p);
      if (!a) { a = analyzePullDamage(p, gameOf(p), getDamageContext(p.name)); cache.current.set(p, a); }
      out.set(p.id, a);
    }
    return out;
  }, [open, allPulls, gamePulls, selectedPull]);
  const aggregate = useMemo(() => (allPulls ? aggregateDamage([...analyses.values()]) : []), [allPulls, analyses]);

  if (!open) return null;

  const isWow = (selectedPull ?? gamePulls[gamePulls.length - 1])?.game === "wow";
  const colorGame = isWow ? "wow" : "ffxiv";
  // WoW findings name the spec ("Fire Mage"); class colours key on the class.
  const classOf = new Map<string, string>();
  for (const p of (allPulls ? gamePulls : selectedPull ? [selectedPull] : [])) for (const pl of p.players) classOf.set(pl.name, pl.className);
  const colorFor = (player: string, job: string) => getClassColor(colorGame, isWow ? classOf.get(player) ?? job : job);

  const analysis = selectedPull ? analyses.get(selectedPull.id) : undefined;
  const needRefetch = [...analyses.values()].filter((a) => a.missingData.length > 0).length;
  const contextName = (allPulls ? gamePulls[gamePulls.length - 1] : selectedPull)?.name;
  const hasContext = contextName ? getDamageContext(contextName) !== undefined : false;

  const playerNames = allPulls ? aggregate.map((a) => a.player) : analysis?.players.map((p) => p.player) ?? [];
  const activePlayer = selectedPlayer && playerNames.includes(selectedPlayer) ? selectedPlayer : playerNames[0] ?? null;

  return (
    <Dialog
      title="Damage"
      width={gamePulls.length > 0 ? "min(1400px, 97vw)" : "480px"}
      maxHeight="88vh"
      zIndex={1100}
      onBackdropClick={onClose}
      onClose={onClose}
      bodyStyle={{ display: "flex", flexDirection: "column", overflow: "hidden" }}
    >
      {gamePulls.length === 0 ? (
        <p className="ck-dialog-text">No report loaded. Import a report to see where each player lost damage.</p>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 4 }}>
              <button className={`ck-tab ck-tab--sm${view === "findings" ? " ck-tab--active" : ""}`} onClick={() => setView("findings")}>Findings</button>
              <button className={`ck-tab ck-tab--sm${view === "compare" ? " ck-tab--active" : ""}`} onClick={() => setView("compare")}>
                Compare with clears{refs.length ? ` (${refs.length})` : ""}
              </button>
            </div>
            <span className="ck-label" style={{ margin: 0 }}>Pulls</span>
            <select
              className="ck-field"
              value={allPulls ? "all" : String(selectedPullId ?? "")}
              onChange={(e) => {
                if (e.target.value === "all") { setAllPulls(true); return; }
                setAllPulls(false);
                setSelectedPullId(Number(e.target.value));
              }}
              style={{ padding: "3px 8px" }}
            >
              <option value="all">All loaded pulls ({gamePulls.length})</option>
              {gamePulls.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} #{p.pullNumber} ({p.result}){analyses.get(p.id)?.missingData.length ? " — needs re-fetch" : ""}
                </option>
              ))}
            </select>
            <span className="ck-help" style={{ margin: 0 }}>
              {hasContext
                ? `Fight context: ${contextName}.`
                : "No fight context for this boss: only untargetable time read from the log counts as forced."}
              {!allPulls && analysis?.missingData.length
                ? ` This pull was fetched without ${analysis.missingData.join(", ")}; re-fetch the report for the full analysis.`
                : allPulls && needRefetch > 0
                  ? ` ${needRefetch} of ${gamePulls.length} pulls were fetched before the damage data existed; re-fetch the report for the full analysis.`
                  : ""}
            </span>
          </div>

          {view === "compare" ? (
            <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}>
              <DamageCompare
                ownPulls={allPulls ? gamePulls.filter((p) => p.game === (isWow ? "wow" : "ffxiv")) : selectedPull ? [selectedPull] : []}
                analyses={analyses}
                refs={refs}
                onRefsChange={setRefs}
                colorFor={colorFor}
              />
            </div>
          ) : (
          <div style={{ flex: "1 1 auto", minHeight: 0, display: "grid", gridTemplateColumns: "340px minmax(0, 1fr)", gap: 12 }}>
            <div style={{ minHeight: 0, overflowY: "auto", paddingRight: 4 }}>
              {!allPulls && analysis && <PhaseTable phases={analysis.phases} />}
              <div className="ck-section-label" style={{ margin: "10px 0 6px" }}>
                {allPulls ? "Estimated loss per pull" : "Estimated loss"}
              </div>
              {allPulls
                ? aggregate.map((a) => (
                  <PlayerCard key={a.player} name={a.player} job={a.job} color={colorFor(a.player, a.job)} lost={a.lostPerPull} forced={a.forcedPerPull}
                    sub={`${a.pulls} pull${a.pulls === 1 ? "" : "s"}`}
                    selected={a.player === activePlayer} onClick={() => setSelectedPlayer(a.player)} />
                ))
                : analysis?.players.map((p) => (
                  <PlayerCard key={p.player} name={p.player} job={p.job} color={colorFor(p.player, p.job)} lost={p.lostDamage} forced={p.forcedDamage}
                    sub={`dealt ${fmtDamage(p.damage)}`}
                    selected={p.player === activePlayer} onClick={() => setSelectedPlayer(p.player)} />
                ))}
            </div>

            <div style={{ minHeight: 0, overflowY: "auto", border: "1px solid var(--ck-line-2)", borderRadius: 3, padding: 12 }}>
              {allPulls ? (
                <AggregateDetail agg={aggregate.find((a) => a.player === activePlayer)} totalPulls={gamePulls.length} colorFor={colorFor} />
              ) : analysis && activePlayer ? (
                <PlayerDetail
                  summary={analysis.players.find((p) => p.player === activePlayer)!}
                  analysis={analysis}
                  colorFor={colorFor}
                />
              ) : (
                <p className="ck-dialog-text">No players in this pull.</p>
              )}
            </div>
          </div>
          )}

          {isWow ? (
            <p className="ck-help" style={{ margin: "10px 0 0" }}>
              Losses are estimates in each player&apos;s own damage from the pull; every line shows its basis.
              Greyed lines are forced (untargetable, dead, a boss mechanic that keeps the player off the boss, or a
              phase whose damage doesn&apos;t count) and aren&apos;t counted. Spell timings are measured from logs;
              rules informed by{" "}
              <a href="https://github.com/WoWAnalyzer/WoWAnalyzer" target="_blank" rel="noreferrer" style={{ color: "var(--ck-arcane-text)" }}>
                WoWAnalyzer
              </a>.
            </p>
          ) : (
            <p className="ck-help" style={{ margin: "10px 0 0" }}>
              Losses are estimates in each player&apos;s own damage from the pull; every line shows its basis.
              Greyed lines are forced (untargetable, dead, a limit break, or a phase whose damage doesn&apos;t count)
              and aren&apos;t counted. Action and status data and parts of the method are adapted from{" "}
              <a href="https://github.com/xivanalysis/xivanalysis" target="_blank" rel="noreferrer" style={{ color: "var(--ck-arcane-text)" }}>
                xivanalysis
              </a>{" "}(MIT).
            </p>
          )}
        </>
      )}
    </Dialog>
  );
}

function PhaseTable({ phases }: { phases: PhaseDamageSummary[] }) {
  if (phases.length === 0) return null;
  const last = phases[phases.length - 1];
  const deciding = phases.find((p) => p.context?.decidesEnrage);
  return (
    <div>
      <div className="ck-table-wrap">
        <table className="ck-table" style={{ fontSize: 12 }}>
          <thead>
            <tr>
              <th>Phase</th><th style={{ textAlign: "right" }}>Raid dmg</th>
              <th style={{ textAlign: "right" }} title="Damage the party took, shields included">Taken</th>
              <th style={{ textAlign: "right" }}>Est. lost</th>
            </tr>
          </thead>
          <tbody>
            {phases.map((p) => (
              <tr key={`${p.phaseId}-${p.startMs}`}>
                <td title={p.context?.note}>
                  {p.name}
                  {p.context?.decidesEnrage && <span className="ck-badge" style={{ marginLeft: 6 }}>Decides enrage</span>}
                  {p.context?.damageCounts === false && <span className="ck-badge ck-badge--plain" style={{ marginLeft: 6 }}>Doesn&apos;t count</span>}
                </td>
                <td className="ck-num" style={{ textAlign: "right" }}>{fmtDamage(p.raidDamage)}</td>
                <td className="ck-num" style={{ textAlign: "right" }}>{fmtDamage(p.raidDamageTaken)}</td>
                <td className="ck-num" style={{ textAlign: "right", color: p.raidLostDamage > 0 ? LOSS_COLOR : undefined }}>
                  {p.context?.damageCounts === false ? "—" : fmtDamage(p.raidLostDamage)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {last.bossHpLeft !== undefined && (
        <p className="ck-help" style={{ margin: "6px 0 0" }}>
          Boss HP left at the end: <span className="ck-num">{fmtDamage(last.bossHpLeft)}</span>.
          {deciding === last && ` Estimated raid loss in ${last.name}: ${fmtDamage(last.raidLostDamage)}${
            last.raidLostDamage >= last.bossHpLeft ? " — more than the HP left." : "."}`}
        </p>
      )}
    </div>
  );
}

type ColorFor = (player: string, job: string) => string;

function PlayerCard({ name, job, color, lost, forced, sub, selected, onClick }: {
  name: string; job: string; color: string; lost: number; forced: number; sub: string; selected: boolean; onClick: () => void;
}) {
  return (
    <div
      className={`ck-card ck-card--interactive${selected ? " ck-card--selected" : ""}`}
      onClick={onClick}
      style={{ padding: "7px 10px", marginBottom: 6, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
    >
      <span style={{ width: 4, alignSelf: "stretch", borderRadius: 2, background: color }} />
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
        <div style={{ color: "var(--ck-text)", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
        <div style={{ color: "var(--ck-text-3)", fontSize: 11 }}>{job} · {sub}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div className="ck-num" style={{ color: lost > 0 ? LOSS_COLOR : "var(--ck-text-2)", fontSize: 14, fontWeight: 600 }}>{fmtDamage(lost)}</div>
        <div className="ck-num" style={{ color: "var(--ck-text-3)", fontSize: 11 }}>forced {fmtDamage(forced)}</div>
      </div>
    </div>
  );
}

function PlayerDetail({ summary, analysis, colorFor }: { summary: PlayerDamageSummary; analysis: PullDamageAnalysis; colorFor: ColorFor }) {
  const shown = summary.findings.filter((f) => f.lostDamage >= 1 || f.kind === "interrupted-cast");
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
        <span style={{ color: colorFor(summary.player, summary.job), fontSize: 15, fontWeight: 600 }}>{summary.player}</span>
        <span style={{ color: "var(--ck-text-3)", fontSize: 12 }}>{summary.job}</span>
        <span className="ck-help" style={{ margin: 0 }}>
          GCD <span className="ck-num">{(summary.baseGcdMs / 1000).toFixed(2)}s</span> · {summary.gcds} GCDs ·
          in raid buffs <span className="ck-num">{summary.buffWindowGcds.used}/{summary.buffWindowGcds.fit}</span> that fit
          {summary.gcdSplit.heal > 0 && <>
            {" "}· heal GCDs <span className="ck-num">{summary.gcdSplit.heal}</span> vs damage{" "}
            <span className="ck-num">{summary.gcdSplit.damage}</span>
          </>}
        </span>
      </div>
      <div className="ck-help" style={{ margin: "-4px 0 8px" }}
        title="The rDPS split: own damage excludes what others' buffs added; buffs given is what this player's buffs added to the party">
        Own damage <span className="ck-num">{fmtDamage(summary.damage - summary.buffs.received)}</span>
        {" "}· buffs given to the party <span className="ck-num">{summary.buffs.approximate ? "≈" : ""}{fmtDamage(summary.buffs.given)}</span>
        {" "}· received <span className="ck-num">{summary.buffs.approximate ? "≈" : ""}{fmtDamage(summary.buffs.received)}</span>
      </div>
      <TimelineStrip summary={summary} analysis={analysis} />
      {shown.length === 0 ? (
        <p className="ck-dialog-text" style={{ marginTop: 12 }}>Nothing found for this player.</p>
      ) : (
        <div style={{ marginTop: 10 }}>
          {shown.map((f, i) => <FindingRow key={i} f={f} />)}
        </div>
      )}
    </div>
  );
}

function FindingRow({ f }: { f: DamageFinding }) {
  return (
    <div style={{ padding: "6px 0", borderTop: "1px solid var(--ck-line)", opacity: f.forced ? 0.55 : 1 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
        <span className="ck-num" style={{ color: "var(--ck-text-3)", fontSize: 12, width: 42, flex: "0 0 auto" }}>{fmtTime(f.startMs)}</span>
        <span className="ck-badge ck-badge--plain" style={{ flex: "0 0 auto" }}>{KIND_LABEL[f.kind]}</span>
        <span style={{ color: "var(--ck-text)", fontSize: 13, flex: "1 1 auto" }}>
          {f.detail}
          {f.cause && <span style={{ color: "var(--ck-text-3)" }}> — {f.forced ? `forced: ${f.cause}` : f.cause}</span>}
        </span>
        <span className="ck-num" style={{ color: f.forced ? "var(--ck-text-3)" : LOSS_COLOR, fontSize: 13, flex: "0 0 auto" }}>
          {f.lostDamage >= 1 ? fmtDamage(f.lostDamage) : "—"}
        </span>
      </div>
      <div style={{ color: "var(--ck-text-3)", fontSize: 11, marginLeft: 52 }}>
        {f.phase ? `${f.phase} · ` : ""}{f.inference ? "Inference: " : ""}{f.basis}
      </div>
    </div>
  );
}

// One horizontal strip over the analysed window: forced time shaded, raid
// buff windows as a gold band, a tick per GCD, phase starts as dividers and
// each counted finding as a marker.
function TimelineStrip({ summary, analysis }: { summary: PlayerDamageSummary; analysis: PullDamageAnalysis }) {
  const total = Math.max(1, analysis.endMs);
  const pct = (ms: number) => `${(Math.max(0, Math.min(ms, total)) / total) * 100}%`;
  const width = (s: number, e: number) => `${(Math.max(0, Math.min(e, total) - Math.max(0, s)) / total) * 100}%`;
  return (
    <div>
      <div style={{ position: "relative", height: 34, background: "var(--ck-bg-deep)", border: "1px solid var(--ck-line-2)", borderRadius: 2, overflow: "hidden" }}>
        {summary.timeline.forced.map((w, i) => (
          <div key={`f${i}`} title={`${fmtTime(w.startMs)}–${fmtTime(w.endMs)} forced: ${w.cause}`}
            style={{ position: "absolute", top: 0, bottom: 0, left: pct(w.startMs), width: width(w.startMs, w.endMs), background: "rgba(255,255,255,0.07)" }} />
        ))}
        {summary.timeline.buffWindows.map((w, i) => (
          <div key={`b${i}`} title={`Raid buffs ${fmtTime(w.startMs)}–${fmtTime(w.endMs)}`}
            style={{ position: "absolute", top: 0, height: 5, left: pct(w.startMs), width: width(w.startMs, w.endMs), background: "var(--ck-gold-2)" }} />
        ))}
        {summary.timeline.gcdStarts.map((t, i) => (
          <div key={`g${i}`} style={{ position: "absolute", top: 9, bottom: 9, left: pct(t), width: 1, background: "var(--ck-text-3)", opacity: 0.6 }} />
        ))}
        {analysis.phases.slice(1).map((p) => (
          <div key={`p${p.phaseId}-${p.startMs}`} title={p.name}
            style={{ position: "absolute", top: 0, bottom: 0, left: pct(p.startMs), width: 1, background: "var(--ck-frame)" }} />
        ))}
        {summary.findings.filter((f) => !f.forced && f.lostDamage >= 1).map((f, i) => (
          <div key={`x${i}`} title={`${fmtTime(f.startMs)} ${f.detail} (${fmtDamage(f.lostDamage)})`}
            style={{ position: "absolute", bottom: 0, height: 6, left: pct(f.startMs), width: `max(3px, ${width(f.startMs, f.endMs)})`, background: LOSS_COLOR }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ck-text-3)", fontSize: 10, marginTop: 2 }}>
        <span className="ck-num">0:00</span>
        <span>gold: raid buffs · shaded: forced · ticks: GCDs · orange: counted losses</span>
        <span className="ck-num">{fmtTime(total)}</span>
      </div>
    </div>
  );
}

function AggregateDetail({ agg, totalPulls, colorFor }: { agg: PlayerDamageAggregate | undefined; totalPulls: number; colorFor: ColorFor }) {
  if (!agg) return <p className="ck-dialog-text">No players.</p>;
  const rows = agg.recurring.filter((r) => r.lostDamage >= 1 || r.kind === "interrupted-cast");
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <span style={{ color: colorFor(agg.player, agg.job), fontSize: 15, fontWeight: 600 }}>{agg.player}</span>
        <span style={{ color: "var(--ck-text-3)", fontSize: 12 }}>{agg.job} · in {agg.pulls} of {totalPulls} pulls</span>
      </div>
      <div className="ck-table-wrap">
        <table className="ck-table" style={{ fontSize: 12 }}>
          <thead>
            <tr>
              <th>Finding</th><th>Phase</th><th style={{ textAlign: "right" }}>Pulls</th>
              <th style={{ textAlign: "right" }}>Lost per pull</th><th>Worst case</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ opacity: r.forced ? 0.55 : 1 }}>
                <td style={{ color: "var(--ck-text)" }}>{r.label}{r.forced ? " (forced)" : ""}</td>
                <td>{r.phase ?? "—"}</td>
                <td className="ck-num" style={{ textAlign: "right" }}>{r.pulls}/{agg.pulls}</td>
                <td className="ck-num" style={{ textAlign: "right", color: r.forced ? undefined : LOSS_COLOR }}>
                  {r.lostDamage >= 1 ? fmtDamage(r.lostDamage / agg.pulls) : "—"}
                </td>
                <td style={{ color: "var(--ck-text-3)" }} title={r.example.basis}>{r.example.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
