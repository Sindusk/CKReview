"use client";

// components/DamageDialog.tsx
//
// "Damage" modal opened from the header bar (docs/archive/damage-analysis-plan.md,
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
// Both games (docs/archive/damage-analysis-plan.md, "WoW build order" step 5): each
// pull is analysed with its own game layer (FFXIV_DAMAGE / WOW_DAMAGE). WoW
// pulls are big, so pulls are analysed when first shown (one pull, or every
// pull for the "all loaded pulls" view) and cached for the open dialog.
// Reference clears work for both (WarcraftLogs clears for WoW pulls).

import { useMemo, useRef, useState } from "react";
import type { Pull } from "@/types/Pull";
import { analyzePullDamage } from "@/lib/damage/analyze";
import { aggregateDamage, type PlayerDamageAggregate } from "@/lib/damage/aggregate";
import { getDamageContext } from "@/lib/damage/contexts";
import { FFXIV_DAMAGE, GUARANTEED_HIT_STATUS_IDS } from "@/lib/damage/ffxiv/game";
import { MIN_ESTIMATE_HITS, playerHitRates, reliableRates } from "@/lib/damage/crit-rates";
import { critLuck } from "@/lib/damage/crit-luck";
import { WOW_DAMAGE } from "@/lib/damage/wow/game";
import type { DamageFinding, PhaseDamageSummary, PlayerDamageSummary, PullDamageAnalysis } from "@/lib/damage/types";
import { getClassColor, getPlayerClassIcon } from "@/lib/player-display";
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

// Red, not the Major orange: beside the raid-buff gold the orange read as
// the same colour.
const LOSS_COLOR = SEVERITY_COLOR.Death;

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
  "no-damage":        "No damage",
  "gcd-clipping":     "Clipping",
  "combo-broken":     "Broken combo",
  "disengage":        "Disengage",
  "positional":       "Positional",
  "buff-coverage":    "Buff coverage",
  "burst-window":     "Burst window",
  "buff-uptime":      "Buff uptime",
  "gauge-overcap":    "Overcap",
  "heal-gcd":         "Heal GCD",
  "aoe-single":       "AoE on one",
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
  const iconFor = (player: string, job: string) => getPlayerClassIcon(colorGame, isWow ? classOf.get(player) ?? job : job);

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
      // Fixed, so picking a player with few findings doesn't shrink it.
      height={gamePulls.length > 0 ? "88vh" : undefined}
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
                  <PlayerCard key={a.player} name={a.player} job={a.job} color={colorFor(a.player, a.job)} icon={iconFor(a.player, a.job)}
                    lost={a.lostPerPull} forced={a.forcedPerPull} uptime={a.gcdUptime}
                    dealt={a.damagePerPull} dealtLabel={`dealt / ${a.pulls} pull${a.pulls === 1 ? "" : "s"}`}
                    selected={a.player === activePlayer} onClick={() => setSelectedPlayer(a.player)} />
                ))
                : analysis?.players.map((p) => (
                  <PlayerCard key={p.player} name={p.player} job={p.job} color={colorFor(p.player, p.job)} icon={iconFor(p.player, p.job)}
                    lost={p.lostDamage} forced={p.forcedDamage} uptime={p.gcdUptime.pct}
                    dealt={p.damage} dealtLabel="dealt"
                    selected={p.player === activePlayer} onClick={() => setSelectedPlayer(p.player)} />
                ))}
            </div>

            <div style={{ minHeight: 0, overflowY: "auto", border: "1px solid var(--ck-line-2)", borderRadius: 3, padding: 12 }}>
              {allPulls ? (
                <AggregateDetail agg={aggregate.find((a) => a.player === activePlayer)} totalPulls={gamePulls.length} colorFor={colorFor} iconFor={iconFor} />
              ) : analysis && activePlayer ? (
                <PlayerDetail
                  summary={analysis.players.find((p) => p.player === activePlayer)!}
                  analysis={analysis}
                  colorFor={colorFor}
                  iconFor={iconFor}
                  pull={selectedPull}
                  pulls={gamePulls}
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

const fmtUptime = (pct: number) => `${(pct * 100).toFixed(1)}%`;

// Icon | name (job colour) over job · uptime | damage dealt | loss over forced.
function PlayerCard({ name, job, color, icon, lost, forced, uptime, dealt, dealtLabel, selected, onClick }: {
  name: string; job: string; color: string; icon: string; lost: number; forced: number; uptime: number;
  dealt: number; dealtLabel: string; selected: boolean; onClick: () => void;
}) {
  // Two lines always: long text is cut with an ellipsis, never wrapped.
  const small: React.CSSProperties = { color: "var(--ck-text-3)", fontSize: 11, whiteSpace: "nowrap" };
  return (
    <div
      className={`ck-card ck-card--interactive${selected ? " ck-card--selected" : ""}`}
      onClick={onClick}
      style={{
        padding: "7px 10px", marginBottom: 6, cursor: "pointer",
        display: "grid", gridTemplateColumns: "26px minmax(0, 1fr) 56px 70px", columnGap: 8, alignItems: "center",
      }}
    >
      <img src={icon} alt={job} width={26} height={26} style={{ display: "block" }}
        onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ color, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
        {/* The job shrinks first; the uptime always shows whole. */}
        <div style={{ ...small, display: "flex", minWidth: 0 }} title={`${job} · GCD uptime while alive and the boss was targetable`}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{job}</span>
          <span style={{ flexShrink: 0 }}>&nbsp;· <span className="ck-num">{fmtUptime(uptime)}</span> uptime</span>
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div className="ck-num" style={{ color: "var(--ck-text)", fontSize: 14, fontWeight: 600 }}>{fmtDamage(dealt)}</div>
        <div style={small}>{dealtLabel}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div className="ck-num" style={{ color: lost > 0 ? LOSS_COLOR : "var(--ck-text-2)", fontSize: 14, fontWeight: 600 }}>{fmtDamage(lost)}</div>
        <div className="ck-num" style={small}>forced {fmtDamage(forced)}</div>
      </div>
    </div>
  );
}

function PlayerDetail({ summary, analysis, colorFor, iconFor, pull, pulls }: {
  summary: PlayerDamageSummary; analysis: PullDamageAnalysis; colorFor: ColorFor; iconFor: ColorFor; pull?: Pull; pulls: Pull[];
}) {
  const shown = summary.findings.filter((f) => f.lostDamage >= 1 || f.kind === "interrupted-cast");
  // Crit luck (FFXIV): the player's rates from their hits in every loaded
  // pull, then this pull against what its rotation averages.
  const luck = useMemo(() => {
    if (!pull || pull.game !== "ffxiv") return undefined;
    const player = pull.players.find((p) => p.name === summary.player);
    const same = pulls.filter((p) => p.game === "ffxiv").flatMap((p) => p.players.filter((x) => x.name === summary.player));
    const rates = player ? playerHitRates(same, FFXIV_DAMAGE, GUARANTEED_HIT_STATUS_IDS) : undefined;
    if (!player || !rates) return undefined;
    if (!reliableRates(rates)) return { thin: true as const, rates, pulls: same.length };
    const result = critLuck(player, analysis.endMs, rates, FFXIV_DAMAGE, GUARANTEED_HIT_STATUS_IDS);
    return result ? { thin: false as const, ...result, rates, pulls: same.length } : undefined;
  }, [pull, pulls, summary.player, analysis.endMs]);
  const rolled = luck && "percentile" in luck ? luck : undefined;
  const ratesNote = luck?.rates.source === "stats"
    ? `Rates from this player's gear in the log (they recorded it): crit ${(luck.rates.crit * 100).toFixed(1)}% ×${luck.rates.critMult.toFixed(3)}, direct hit ${(luck.rates.directHit * 100).toFixed(1)}%.`
    : luck ? `Rates estimated from ${luck.rates.hits} unbuffed hits in ${luck.pulls} loaded pulls: crit ${(luck.rates.crit * 100).toFixed(1)}% ` +
      `×${luck.rates.critMult.toFixed(2)}, direct hit ${(luck.rates.directHit * 100).toFixed(1)}%.` : "";
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <img src={iconFor(summary.player, summary.job)} alt={summary.job} width={28} height={28} style={{ display: "block" }}
          onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
        <span style={{ color: colorFor(summary.player, summary.job), fontSize: 16, fontWeight: 600 }}>{summary.player}</span>
        <span style={{ color: "var(--ck-text-3)", fontSize: 12 }}>
          {summary.job} · <span className="ck-num">{(summary.baseGcdMs / 1000).toFixed(2)}s</span> GCD
        </span>
      </div>
      <StatStrip stats={[
          { label: "GCD uptime", value: fmtUptime(summary.gcdUptime.pct),
            sub: `of ${fmtTime(summary.gcdUptime.eligibleMs)} active`,
            tone: summary.gcdUptime.pct >= UPTIME_GOOD ? "good" : summary.gcdUptime.pct < UPTIME_POOR ? "bad" : undefined,
            title: `GCD locks over ${fmtTime(summary.gcdUptime.eligibleMs)} alive and targetable (deaths, untargetable time and limit breaks excluded); ${summary.gcds} GCDs` },
          ...(summary.gcdSplit.heal > 0 ? [{
            label: "Heal GCDs", value: String(summary.gcdSplit.heal), sub: `of ${summary.gcdSplit.heal + summary.gcdSplit.damage}`,
            title: "GCDs that healed or shielded, of all heal and damage GCDs",
          }] : []),
          { label: "Own damage", value: fmtDamage(summary.damage - summary.buffs.received), sub: `${fmtDamage(summary.damage)} dealt`,
            title: "The rDPS split: this player's damage without what others' buffs added" },
          { label: "Buffs given", value: summary.buffs.given > 0 ? approx(summary, fmtDamage(summary.buffs.given)) : "—",
            title: "What this player's party buffs added to everyone else's damage" },
          { label: "Buffs received", value: approx(summary, fmtDamage(summary.buffs.received)),
            title: "What others' buffs added to this player's damage" },
          ...(luck?.thin ? [{
            label: "Crit luck", value: "—", sub: "needs more pulls",
            title: `This player's crit and direct-hit rates aren't in the log (only the player who recorded it has gear stats), ` +
              `and ${luck.rates.hits} unbuffed hits in ${luck.pulls} loaded pull${luck.pulls === 1 ? "" : "s"} are too few to estimate them ` +
              `(${MIN_ESTIMATE_HITS} needed, about 8-10 pulls). With fewer, the estimate absorbs the luck it's meant to measure.`,
          }] : rolled ? [{
            label: "Crit luck", value: `${ordinal(Math.round(rolled.percentile * 100))} pct`,
            sub: `${rolled.actual >= rolled.mean ? "+" : "−"}${fmtDamage(Math.abs(rolled.actual - rolled.mean))} vs average`,
            title: `Where this pull's damage sat among every outcome the same rotation could roll (crit, direct hit, ±5%), ` +
              `and how far from the average: ${rolled.crits} crits vs ${rolled.expectedCrits.toFixed(0)} expected, ` +
              `${rolled.directHits} direct hits vs ${rolled.expectedDirectHits.toFixed(0)} expected, over ${rolled.hits} hits. ` +
              `${ratesNote} DoT ticks don't count (FFLogs logs them at their average).`,
          }] : []),
      ]} />
      <TimelineStrip summary={summary} analysis={analysis} />
      {shown.length === 0 ? (
        <p className="ck-dialog-text" style={{ marginTop: 12 }}>Nothing found for this player.</p>
      ) : (
        <FindingGroups findings={shown} />
      )}
    </div>
  );
}

const ordinal = (n: number) => {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${s}`;
};

// ≈ only on values that include estimated crit / direct-hit buff shares.
const approx = (s: PlayerDamageSummary, v: string) => (s.buffs.approximate ? `≈${v}` : v);
const APPROX_NOTE = "; ≈ includes crit and direct-hit buffs, estimated";

type Stat = {
  label:  string;
  value:  string;
  sub?:   string;                       // small line under the value
  tone?:  "good" | "bad";               // arcane blue / Death red; else plain
  title?: string;
};
// Uptime 95%+ reads good, under 90% poor. Crit luck stays uncoloured: it's
// luck, not something to fix.
const UPTIME_GOOD = 0.95, UPTIME_POOR = 0.9;
const TONE: Record<NonNullable<Stat["tone"]>, string> = { good: "var(--ck-arcane-text)", bad: LOSS_COLOR };
// Stats as one row of equal panels.
function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))`, gap: 6, marginBottom: 10,
    }}>
      {stats.map((s) => (
        <div key={s.label}
          title={s.title && s.value.startsWith("≈") ? s.title + APPROX_NOTE : s.title}
          style={{
            background: "var(--ck-bg-card-hi)", border: "1px solid var(--ck-line-2)", borderRadius: 3,
            borderTop: `2px solid ${s.tone ? TONE[s.tone] : "var(--ck-line-2)"}`,
            padding: "5px 9px", minWidth: 0, cursor: s.title ? "help" : undefined,
          }}>
          <div style={{ color: "var(--ck-text-3)", fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</div>
          <div className="ck-num" style={{ color: s.tone ? TONE[s.tone] : "var(--ck-text)", fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>{s.value}</div>
          {s.sub && <div className="ck-num" style={{ color: "var(--ck-text-3)", fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.sub}</div>}
        </div>
      ))}
    </div>
  );
}

// Findings grouped by kind: the groups by their counted loss (biggest
// first), each one's entries in time order, collapsed until clicked.
function FindingGroups({ findings }: { findings: DamageFinding[] }) {
  const [open, setOpen] = useState<Set<DamageFinding["kind"]>>(new Set());
  const groups = new Map<DamageFinding["kind"], DamageFinding[]>();
  for (const f of findings) groups.set(f.kind, [...(groups.get(f.kind) ?? []), f]);
  const counted = (list: DamageFinding[]) => list.filter((f) => !f.forced).reduce((a, f) => a + f.lostDamage, 0);
  const sorted = [...groups].sort((a, b) => counted(b[1]) - counted(a[1]));
  return (
    <div style={{ marginTop: 10 }}>
      {sorted.map(([kind, list]) => {
        const total = counted(list);
        const isOpen = open.has(kind);
        const forcedOnly = list.every((f) => f.forced);
        return (
          <div key={kind} style={{ borderTop: "1px solid var(--ck-line)" }}>
            <div
              onClick={() => setOpen((prev) => {
                const next = new Set(prev);
                if (next.has(kind)) next.delete(kind); else next.add(kind);
                return next;
              })}
              style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 0", cursor: "pointer", opacity: forcedOnly ? 0.55 : 1 }}
            >
              <span style={{ color: "var(--ck-text-3)", fontSize: 11, width: 12, flex: "0 0 auto" }}>{isOpen ? "▾" : "▸"}</span>
              <span className="ck-badge ck-badge--plain" style={{ flex: "0 0 auto" }}>{KIND_LABEL[kind]}</span>
              <span style={{ color: "var(--ck-text-3)", fontSize: 12, flex: "1 1 auto" }}>
                {list.length} {list.length === 1 ? "entry" : "entries"}
                {list.some((f) => f.forced) && !forcedOnly ? ` (${list.filter((f) => f.forced).length} forced)` : ""}
              </span>
              <span className="ck-num" style={{ color: total >= 1 ? LOSS_COLOR : "var(--ck-text-3)", fontSize: 14, fontWeight: 700, flex: "0 0 auto" }}>
                {total >= 1 ? fmtDamage(total) : "—"}
              </span>
            </div>
            {isOpen && (
              <div style={{ paddingLeft: 22, paddingBottom: 4 }}>
                {[...list].sort((a, b) => a.startMs - b.startMs).map((f, i) => <FindingRow key={i} f={f} />)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FindingRow({ f }: { f: DamageFinding }) {
  return (
    <div style={{ padding: "6px 0", borderTop: "1px solid var(--ck-line)", opacity: f.forced ? 0.55 : 1 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
        <span className="ck-num" style={{ color: "var(--ck-text-3)", fontSize: 12, width: 42, flex: "0 0 auto" }}>{fmtTime(f.startMs)}</span>
        <span style={{ color: "var(--ck-text)", fontSize: 13, flex: "1 1 auto" }}>
          {f.detail}
          {f.cause && <span style={{ color: "var(--ck-text-3)" }}> — {f.forced ? `forced: ${f.cause}` : f.cause}</span>}
        </span>
        <span className="ck-num" style={{ color: f.forced ? "var(--ck-text-3)" : LOSS_COLOR, fontSize: 12, fontWeight: 400, flex: "0 0 auto" }}>
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
  // A tick and label every minute; the last is left out when it would
  // crowd the end label.
  const minutes: number[] = [];
  for (let t = 60_000; t < total - 15_000; t += 60_000) minutes.push(t);
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
        {minutes.map((t) => (
          <div key={`m${t}`} style={{ position: "absolute", top: 0, bottom: 0, left: pct(t), width: 1, background: "var(--ck-line-2)" }} />
        ))}
        {summary.timeline.gcdStarts.map((t, i) => (
          <div key={`g${i}`} style={{ position: "absolute", top: 9, bottom: 9, left: pct(t), width: 1, background: "var(--ck-text-3)", opacity: 0.6 }} />
        ))}
        {analysis.phases.slice(1).map((p) => (
          <div key={`p${p.phaseId}-${p.startMs}`} title={p.name}
            style={{ position: "absolute", top: 0, bottom: 0, left: pct(p.startMs), width: 1, background: "var(--ck-frame)" }} />
        ))}
        {/* A summary finding (small delays, early DoT refreshes, missed
            positionals) marks each of its moments, not its first-to-last span. */}
        {summary.findings.filter((f) => !f.forced && f.lostDamage >= 1).flatMap((f, i) =>
          (f.moments ?? [{ startMs: f.startMs, endMs: f.endMs }]).map((m, j) => (
            <div key={`x${i}-${j}`}
              title={`${fmtTime(m.startMs)} ${m.detail ?? f.detail} (${fmtDamage(m.lostDamage ?? f.lostDamage)})`}
              style={{ position: "absolute", bottom: 0, height: 6, left: pct(m.startMs), width: `max(3px, ${width(m.startMs, m.endMs)})`, background: LOSS_COLOR }} />
          )))}
      </div>
      <div style={{ position: "relative", height: 13, color: "var(--ck-text-3)", fontSize: 10, marginTop: 2 }}>
        <span className="ck-num" style={{ position: "absolute", left: 0 }}>0:00</span>
        {minutes.map((t) => (
          <span key={t} className="ck-num" style={{ position: "absolute", left: pct(t), transform: "translateX(-50%)" }}>{fmtTime(t)}</span>
        ))}
        <span className="ck-num" style={{ position: "absolute", right: 0 }}>{fmtTime(total)}</span>
      </div>
      <div style={{ color: "var(--ck-text-3)", fontSize: 10, textAlign: "center" }}>
        gold: raid buffs · shaded: forced · ticks: GCDs · red: counted losses
      </div>
    </div>
  );
}

function AggregateDetail({ agg, totalPulls, colorFor, iconFor }: {
  agg: PlayerDamageAggregate | undefined; totalPulls: number; colorFor: ColorFor; iconFor: ColorFor;
}) {
  if (!agg) return <p className="ck-dialog-text">No players.</p>;
  const rows = agg.recurring.filter((r) => r.lostDamage >= 1 || r.kind === "interrupted-cast");
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <img src={iconFor(agg.player, agg.job)} alt={agg.job} width={28} height={28} style={{ display: "block" }}
          onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
        <span style={{ color: colorFor(agg.player, agg.job), fontSize: 16, fontWeight: 600 }}>{agg.player}</span>
        <span style={{ color: "var(--ck-text-3)", fontSize: 12 }}>{agg.job}</span>
      </div>
      <StatStrip stats={[
        { label: "Pulls", value: String(agg.pulls), sub: `of ${totalPulls} loaded` },
        { label: "GCD uptime", value: fmtUptime(agg.gcdUptime),
          tone: agg.gcdUptime >= UPTIME_GOOD ? "good" : agg.gcdUptime < UPTIME_POOR ? "bad" : undefined,
          title: "GCD locks over the time this player was alive and the boss was targetable, all pulls together" },
        { label: "Dealt per pull", value: fmtDamage(agg.damagePerPull) },
        { label: "Lost per pull", value: fmtDamage(agg.lostPerPull), sub: `forced ${fmtDamage(agg.forcedPerPull)}`,
          tone: agg.lostPerPull > 0 ? "bad" : undefined },
      ]} />
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
