"use client";

// components/DamageDialog.tsx
//
// "Damage" modal opened from the header bar (docs/archive/damage-analysis-plan.md,
// UI). Shows where each player lost damage, scored in their own observed
// damage, with fight context from the boss's DamageContext:
//   - one pull: the phase summary, players ranked by estimated loss (a bar
//     of it by coaching theme, lib/damage/coaching.ts), and the selected
//     player's Biggest wins (top three themes), lane timeline
//     (DamageTimeline.tsx, hover for each GCD and its weaves) and findings,
//     each with its basis, ability names drawn with their icons; forced
//     findings are greyed with their cause
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

import { useEffect, useMemo, useRef, useState } from "react";
import type { Pull } from "@/types/Pull";
import { analyzePullDamage } from "@/lib/damage/analyze";
import { aggregateDamage, type PlayerDamageAggregate } from "@/lib/damage/aggregate";
import { getDamageContext } from "@/lib/damage/contexts";
import { FFXIV_DAMAGE, GUARANTEED_HIT_STATUS_IDS } from "@/lib/damage/ffxiv/game";
import { MIN_ESTIMATE_HITS, playerHitRates, reliableRates } from "@/lib/damage/crit-rates";
import { critLuck } from "@/lib/damage/crit-luck";
import { WOW_DAMAGE } from "@/lib/damage/wow/game";
import type { DamageFinding, PhaseDamageSummary, PlayerDamageSummary, PullDamageAnalysis } from "@/lib/damage/types";
import { biggestWins, findingItems, KIND_THEME, THEME_NAME, type CoachingItem, type CoachingTheme } from "@/lib/damage/coaching";
import { readableText, THEME_COLOR, ThemeGlyph } from "./ui/DamageGlyphs";
import DamageTimeline, { MOVEMENT_COLOR } from "./DamageTimeline";
import { getClassColor, getPlayerClassIcon, getPlayerSpecIcon } from "@/lib/player-display";
import { useFFPullSelector } from "@/hooks/useFFPullSelector";
import { SEVERITY_COLOR } from "./SeverityIcon";
import { fmtTime } from "./MitigationTimeline";
import { Dialog } from "./ui/Dialog";
import { InfoTip } from "./ui/InfoTip";
import DamageCompare, { type ReferenceClear } from "./DamageCompare";

type DamageDialogProps = {
  open:          boolean;
  onClose:       () => void;
  pulls:         Pull[];
  // The app's globally-selected pull; the dropdown resets to it on open.
  currentPullId: number | null;
};

// Red, not the Major orange: beside the raid-buff gold the orange read as
// the same colour. Totals use it; a single finding's cost the softer red.
const LOSS_COLOR = SEVERITY_COLOR.Death;
const LOSS_SOFT = "#f0928d";

// The dialog's secondary text, lifted for its small sizes (the app-wide
// tokens are #b3afa6 / #80848a), set on the dialog body so only it changes.
const READABLE_TEXT = {
  "--ck-text-2": "#c9c5bc",
  "--ck-text-3": "#9da1a8",
  "--ck-loss-soft": LOSS_SOFT,
} as React.CSSProperties;

const fmtDamage = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : `${Math.round(n)}`;

const KIND_LABEL: Record<DamageFinding["kind"], string> = {
  "gcd-gap":          "GCD gap",
  "gcd-delays":       "GCD delays",
  "gcd-pace":         "GCD pace",
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
  "tincture":         "Tincture",
  "pet-cut":          "Pet cut short",
  "missed-followup":  "Missed follow-up",
  "movement":         "Movement",
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
  // Loaded clears' players feed the same-spec pace check (lib/damage/pace.ts),
  // so adding or removing one starts a fresh cache.
  const cache = useRef(new WeakMap<Pull, PullDamageAnalysis>());
  const cacheRefs = useRef(refs);
  const analyses = useMemo(() => {
    const out = new Map<number, PullDamageAnalysis>();
    if (!open) return out;
    if (cacheRefs.current !== refs) { cache.current = new WeakMap(); cacheRefs.current = refs; }
    const pacePeers = refs.flatMap((r) => r.analysis.players.flatMap((p) => (p.pace ? [{ ...p.pace, source: r.label }] : [])));
    const shown = allPulls ? gamePulls : selectedPull ? [selectedPull] : [];
    for (const p of shown) {
      let a = cache.current.get(p);
      if (!a) { a = analyzePullDamage(p, gameOf(p), getDamageContext(p.name), { pacePeers }); cache.current.set(p, a); }
      out.set(p.id, a);
    }
    return out;
  }, [open, allPulls, gamePulls, selectedPull, refs]);
  const aggregate = useMemo(() => (allPulls ? aggregateDamage([...analyses.values()]) : []), [allPulls, analyses]);

  if (!open) return null;

  const isWow = (selectedPull ?? gamePulls[gamePulls.length - 1])?.game === "wow";
  const colorGame = isWow ? "wow" : "ffxiv";
  // WoW findings name the spec ("Fire Mage"); class colours key on the class.
  const classOf = new Map<string, string>();
  const specOf = new Map<string, number>();
  for (const p of (allPulls ? gamePulls : selectedPull ? [selectedPull] : [])) {
    for (const pl of p.players) { classOf.set(pl.name, pl.className); specOf.set(pl.name, pl.specId); }
  }
  // Used as text throughout, so lifted to read on the dark cards.
  const colorFor = (player: string, job: string) => readableText(getClassColor(colorGame, isWow ? classOf.get(player) ?? job : job));
  // WoW: the spec's icon, so two Warlocks on different specs don't look alike.
  const iconFor = (player: string, job: string) => {
    const spec = specOf.get(player);
    return isWow && spec !== undefined
      ? getPlayerSpecIcon(colorGame, spec, classOf.get(player) ?? job)
      : getPlayerClassIcon(colorGame, isWow ? classOf.get(player) ?? job : job);
  };

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
      bodyStyle={{ display: "flex", flexDirection: "column", overflow: "hidden", ...READABLE_TEXT }}
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
              {!allPulls && analysis?.patch ? ` Judged by patch ${analysis.patch} job rules.` : ""}
              {!allPulls && analysis?.missingData.length
                ? ` This pull was fetched without ${analysis.missingData.join(", ")}; re-fetch the report for the full analysis.`
                : allPulls && needRefetch > 0
                  ? ` ${needRefetch} of ${gamePulls.length} pulls were fetched before the damage data existed; re-fetch the report for the full analysis.`
                  : ""}
            </span>
            {view === "findings" && !allPulls && analysis && analysis.phases.length > 0 && (
              <span style={{ marginLeft: "auto" }}>
                <InfoTip label="Phases: raid damage, damage taken and estimated loss per phase" maxWidth={480}
                  trigger={<span className="ck-badge">Phases</span>}
                  content={<PhaseTable phases={analysis.phases} />} />
              </span>
            )}
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
              <div className="ck-section-label" style={{ margin: "0 0 6px" }}>
                {allPulls ? "Estimated loss per pull" : "Estimated loss"}
              </div>
              {allPulls
                ? aggregate.map((a) => (
                  <PlayerCard key={a.player} name={a.player} job={a.job} color={colorFor(a.player, a.job)} icon={iconFor(a.player, a.job)}
                    lost={a.lostPerPull} forced={a.forcedPerPull} movement={a.movementPerPull} uptime={a.gcdUptime}
                    showMovement={aggregate.some((x) => x.movementPerPull >= 1)}
                    dealt={a.damagePerPull} dealtLabel={`dealt / ${a.pulls} pull${a.pulls === 1 ? "" : "s"}`}
                    themeLoss={themeLoss(recurringItems(a.recurring), a.pulls)} maxLost={aggregate[0]?.lostPerPull ?? 0}
                    selected={a.player === activePlayer} onClick={() => setSelectedPlayer(a.player)} />
                ))
                : analysis?.players.map((p) => (
                  <PlayerCard key={p.player} name={p.player} job={p.job} color={colorFor(p.player, p.job)} icon={iconFor(p.player, p.job)}
                    lost={p.lostDamage} forced={p.forcedDamage} movement={p.movementDamage ?? 0} uptime={p.gcdUptime.pct}
                    showMovement={analysis.players.some((x) => (x.movementDamage ?? 0) >= 1)}
                    dealt={p.damage} dealtLabel="dealt"
                    themeLoss={themeLoss(findingItems(p.findings), 1)} maxLost={Math.max(0, ...analysis.players.map((x) => x.lostDamage))}
                    selected={p.player === activePlayer} onClick={() => setSelectedPlayer(p.player)} />
                ))}
            </div>

            <div style={{ minHeight: 0, overflowY: "auto", border: "1px solid var(--ck-line-2)", borderRadius: 3, padding: 12 }}>
              {allPulls ? (
                <AggregateDetail agg={aggregate.find((a) => a.player === activePlayer)} totalPulls={gamePulls.length} colorFor={colorFor} iconFor={iconFor}
                  pulls={gamePulls} />
              ) : analysis && activePlayer ? (
                <PlayerDetail
                  key={`${selectedPull?.id}-${activePlayer}`}
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
              Greyed lines and hatched time are forced (untargetable, dead, a boss mechanic that keeps the player off the boss, or a
              phase whose damage doesn&apos;t count) and aren&apos;t counted. Blue is movement a mechanic required: idle
              inside its window beyond the player&apos;s own usual rate, not counted either. Hover the timeline for each GCD
              and what was woven after it. Spell timings are measured from logs;
              rules informed by{" "}
              <a href="https://github.com/WoWAnalyzer/WoWAnalyzer" target="_blank" rel="noreferrer" style={{ color: "var(--ck-arcane-text)" }}>
                WoWAnalyzer
              </a>.
            </p>
          ) : (
            <p className="ck-help" style={{ margin: "10px 0 0" }}>
              Losses are estimates in each player&apos;s own damage from the pull; every line shows its basis.
              Greyed lines and hatched time are forced (untargetable, dead, a limit break, or a phase whose damage
              doesn&apos;t count) and aren&apos;t counted. Hover the timeline for each GCD and what was woven after it. Action and status data and parts of the method are adapted from{" "}
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
                <td>
                  {p.name} <span className="ck-num" style={{ color: "var(--ck-text-3)" }}>{fmtTime(p.startMs)}–{fmtTime(p.endMs)}</span>
                  {p.context?.decidesEnrage && <span className="ck-badge" style={{ marginLeft: 6 }}>Decides enrage</span>}
                  {p.context?.damageCounts === false && <span className="ck-badge ck-badge--plain" style={{ marginLeft: 6 }}>Doesn&apos;t count</span>}
                  {p.context?.note && <div style={{ color: "var(--ck-text-3)", fontSize: 11 }}>{p.context.note}</div>}
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

// Counted loss per coaching theme, for a player card's bar.
type ThemeLoss = Partial<Record<CoachingTheme, number>>;
function themeLoss(items: CoachingItem[], pulls: number): ThemeLoss {
  const out: ThemeLoss = {};
  for (const i of items) {
    if (i.forced || i.lostDamage < 1) continue;
    const t = KIND_THEME[i.kind];
    out[t] = (out[t] ?? 0) + i.lostDamage / pulls;
  }
  return out;
}
const recurringItems = (rows: PlayerDamageAggregate["recurring"]): CoachingItem[] =>
  rows.map((r) => ({ kind: r.kind, lostDamage: r.lostDamage, forced: r.forced, example: r.example }));
const THEME_ORDER = Object.keys(THEME_NAME) as CoachingTheme[];

// Icon | name (job colour) over job · uptime | damage dealt | loss over forced,
// then a bar of the loss by theme, against the biggest loss in the list.
function PlayerCard({ name, job, color, icon, lost, forced, movement, showMovement, uptime, dealt, dealtLabel, themeLoss, maxLost, selected, onClick }: {
  name: string; job: string; color: string; icon: string; lost: number; forced: number; movement: number;
  // Any card in the list has movement: every card shows its (possibly 0k)
  // movement number so the columns line up.
  showMovement: boolean; uptime: number;
  dealt: number; dealtLabel: string; themeLoss: ThemeLoss; maxLost: number; selected: boolean; onClick: () => void;
}) {
  // Two lines always: long text is cut with an ellipsis, never wrapped.
  const small: React.CSSProperties = { color: "var(--ck-text-3)", fontSize: 11, whiteSpace: "nowrap" };
  return (
    <div
      className={`ck-card ck-card--interactive${selected ? " ck-card--selected" : ""}`}
      onClick={onClick}
      style={{
        padding: "7px 10px", marginBottom: 6, cursor: "pointer",
        display: "grid", gridTemplateColumns: "26px minmax(0, 1fr) 56px auto", columnGap: 8, alignItems: "center",
      }}
    >
      <img src={icon} alt={job} width={26} height={26} style={{ display: "block" }}
        onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ color, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
        {/* The job shrinks first; the uptime always shows whole. */}
        <div style={{ ...small, display: "flex", minWidth: 0 }} title={`${job} · GCD uptime while alive and the boss was targetable`}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{job}</span>
          <span style={{ flexShrink: 0 }}>&nbsp;· <span className="ck-num">{fmtUptime(uptime)}</span></span>
        </div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div className="ck-num" style={{ color: "var(--ck-text)", fontSize: 14, fontWeight: 600 }}>{fmtDamage(dealt)}</div>
        <div style={small}>{dealtLabel}</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div className="ck-num" style={{ color: lost > 0 ? LOSS_COLOR : "var(--ck-text-2)", fontSize: 14, fontWeight: 600 }}>{fmtDamage(lost)}</div>
        <div className="ck-num" style={small} title={`Forced ${fmtDamage(forced)}; movement a mechanic required ${fmtDamage(movement)} (neither is counted)`}>
          {fmtDamage(forced)}{(showMovement || movement >= 1) && <> · <span style={{ color: MOVEMENT_COLOR }}>{movement >= 1 ? fmtDamage(movement) : "0k"}</span></>}
        </div>
      </div>
      {maxLost > 0 && (
        <div style={{ gridColumn: "2 / 5", height: 4, marginTop: 5, borderRadius: 2, background: "var(--ck-line)", display: "flex", overflow: "hidden" }}>
          {THEME_ORDER.filter((t) => (themeLoss[t] ?? 0) > 0).map((t) => (
            <span key={t} title={`${THEME_NAME[t]}: ${fmtDamage(themeLoss[t]!)}`}
              style={{ width: `${(themeLoss[t]! / maxLost) * 100}%`, background: THEME_COLOR[t], height: "100%" }} />
          ))}
        </div>
      )}
    </div>
  );
}

// The top three themes by counted loss, each with its tip and worst instance.
// Clicking one opens that kind's findings (single pull only).
function BiggestWins({ items, perPull, icons, onPick }: {
  items: CoachingItem[]; perPull?: number; icons: AbilityIcons; onPick?: (f: DamageFinding) => void;
}) {
  const wins = biggestWins(items);
  if (wins.length === 0) return null;
  const div = perPull ?? 1;
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="ck-section-label" style={{ margin: "0 0 6px" }}>Biggest wins{perPull ? " (per pull)" : ""}</div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${wins.length}, minmax(0, 1fr))`, gap: 6 }}>
        {wins.map((w, i) => (
          <div key={w.theme} className={onPick ? "ck-card ck-card--interactive" : "ck-card"} onClick={() => onPick?.(w.worst)}
            style={{ padding: "9px 11px 10px", display: "grid", gap: 6, alignContent: "start", cursor: onPick ? "pointer" : undefined, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ThemeGlyph theme={w.theme} size={24} />
              <span style={{ fontWeight: 600, fontSize: 13, flex: "1 1 auto", color: "var(--ck-text)" }}>{THEME_NAME[w.theme]}</span>
              <span className="ck-num" style={{ color: "var(--ck-text-3)", fontSize: 11 }}>#{i + 1}</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <span className="ck-num" style={{ color: LOSS_COLOR, fontSize: 16, fontWeight: 700 }}>{fmtDamage(w.lostDamage / div)}</span>
              <span style={{ color: "var(--ck-text-3)", fontSize: 11 }}>
                {Math.round(w.share * 100)}% of the counted loss · {w.count} {w.count === 1 ? "finding" : "findings"}
              </span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: "var(--ck-line)", overflow: "hidden" }}>
              <div style={{ width: `${w.share * 100}%`, height: "100%", background: THEME_COLOR[w.theme] }} />
            </div>
            <div style={{ color: "var(--ck-text)", fontSize: 12.5, lineHeight: 1.45 }}>{w.tip}</div>
            <div style={{ color: "var(--ck-text-2)", fontSize: 12, lineHeight: 1.5 }}>
              Worst: <span className="ck-num">{fmtTime(w.worst.startMs)}</span> <RichDetail text={w.worst.detail} icons={icons} />{" "}
              <span className="ck-num" style={{ color: LOSS_SOFT }}>{fmtDamage(w.worst.lostDamage)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Ability icons in finding text ────────────────────────────────────────
// Findings name abilities in their text ("No GCD for 1.3s after Kasha"), so
// the names are matched against the abilities this player logged in the
// pull(s) (casts, buffs, hits, heals), longest first, and drawn with their
// icon. Only the player's own abilities can match, so a boss's attack named
// in a cause isn't decorated. Names under 4 characters are left out.
type AbilityIcons = { icons: Map<string, string>; re: RegExp | null };
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function abilityIconsOf(pulls: Pull[], player: string): AbilityIcons {
  const icons = new Map<string, string>();
  for (const p of pulls) {
    const pl = p.players.find((x) => x.name === player);
    if (!pl) continue;
    for (const e of [...pl.casts, ...(pl.buffs ?? []), ...pl.damageDone, ...pl.healing]) {
      if (e.abilityIcon && e.abilityName && !icons.has(e.abilityName)) icons.set(e.abilityName, e.abilityIcon);
    }
  }
  const names = [...icons.keys()].filter((n) => n.length >= 4 && !/^(attack|melee|auto shot|shoot)$/i.test(n)).sort((a, b) => b.length - a.length);
  return { icons, re: names.length ? new RegExp(`(?<![A-Za-z])(${names.map(escapeRe).join("|")})(?![A-Za-z])`, "g") : null };
}
const firstAbility = (text: string, a: AbilityIcons): string | undefined => {
  if (!a.re) return undefined;
  a.re.lastIndex = 0;
  return a.re.exec(text)?.[1];
};

function RichDetail({ text, icons }: { text: string; icons: AbilityIcons }) {
  if (!icons.re) return <>{text}</>;
  const parts = text.split(icons.re);
  // split with one capture group: odd indexes are the matched names.
  return (
    <>
      {parts.map((part, i) => i % 2 === 0 ? part : (
        <span key={i} style={{ whiteSpace: "nowrap", fontWeight: 600, color: "var(--ck-text)" }}>
          <img src={icons.icons.get(part)} alt="" width={15} height={15}
            style={{ verticalAlign: -3, marginRight: 3, borderRadius: 2 }}
            onError={(e) => { e.currentTarget.style.display = "none"; }} />
          {part}
        </span>
      ))}
    </>
  );
}

function PlayerDetail({ summary, analysis, colorFor, iconFor, pull, pulls }: {
  summary: PlayerDamageSummary; analysis: PullDamageAnalysis; colorFor: ColorFor; iconFor: ColorFor; pull?: Pull; pulls: Pull[];
}) {
  const shown = summary.findings.filter((f) => f.lostDamage >= 1 || f.kind === "interrupted-cast");
  const icons = useMemo(() => abilityIconsOf(pull ? [pull] : [], summary.player), [pull, summary.player]);
  // Shared by the summary, the timeline and the finding list: the open
  // groups (the biggest one to start) and the finding picked on either.
  const items = useMemo(() => findingItems(summary.findings), [summary.findings]);
  const [openKinds, setOpenKinds] = useState<Set<DamageFinding["kind"]>>(() => {
    const top = biggestWins(items, 1)[0];
    return new Set(top ? [top.topKind] : []);
  });
  const [picked, setPicked] = useState<DamageFinding | null>(null);
  const [hovered, setHovered] = useState<DamageFinding | null>(null);
  const pick = (f: DamageFinding) => {
    setOpenKinds((prev) => new Set(prev).add(f.kind));
    setPicked(f);
  };
  // Crit luck (FFXIV): the player's rates from their hits in every loaded
  // pull, then this pull against what its rotation averages.
  const luck = useMemo(() => {
    if (!pull || pull.game !== "ffxiv") return undefined;
    const player = pull.players.find((p) => p.name === summary.player);
    const same = pulls.filter((p) => p.game === "ffxiv").flatMap((p) => p.players.filter((x) => x.name === summary.player));
    const rates = player ? playerHitRates(same, FFXIV_DAMAGE, GUARANTEED_HIT_STATUS_IDS) : undefined;
    if (!player || !rates) return undefined;
    // One pull: hidden (its own hits would set the rates it's judged
    // against). Two or more but under the hit threshold: shown as rough.
    if (rates.source === "estimate" && same.length < 2) return { thin: true as const, rates, pulls: same.length };
    const result = critLuck(player, analysis.endMs, rates, FFXIV_DAMAGE, GUARANTEED_HIT_STATUS_IDS);
    return result ? { thin: false as const, rough: !reliableRates(rates), ...result, rates, pulls: same.length } : undefined;
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
              `and one pull can't estimate them: its own hits would set the rates it's judged against. Load another pull.`,
          }] : rolled ? [{
            label: "Crit luck", value: `${ordinal(Math.round(rolled.percentile * 100))} pct${rolled.rough ? "?" : ""}`,
            sub: `${rolled.actual >= rolled.mean ? "+" : "−"}${fmtDamage(Math.abs(rolled.actual - rolled.mean))} vs average`,
            caution: rolled.rough,
            title: (rolled.rough
              ? `ROUGH: the rates come from ${rolled.rates.hits} unbuffed hits, under the ${MIN_ESTIMATE_HITS} (about 8-10 pulls) that make ` +
                `them reliable, so this can be tens of points off. Take it as a general idea. ` : "") +
              `Where this pull's damage sat among every outcome the same rotation could roll (crit, direct hit, ±5%), ` +
              `and how far from the average: ${rolled.crits} crits vs ${rolled.expectedCrits.toFixed(0)} expected, ` +
              `${rolled.directHits} direct hits vs ${rolled.expectedDirectHits.toFixed(0)} expected, over ${rolled.hits} hits. ` +
              `${ratesNote} DoT ticks don't count (FFLogs logs them at their average).`,
          }] : []),
      ]} />
      <BiggestWins items={items} icons={icons} onPick={pick} />
      <DamageTimeline summary={summary} analysis={analysis} highlight={hovered ?? picked} onPick={pick} />
      {(summary.timeline.gauges ?? []).map((g) => (
        <div key={g.name} style={{ color: "var(--ck-text-3)", fontSize: 11, marginLeft: 96 }}>{g.name}: {g.note}</div>
      ))}
      {shown.length === 0 ? (
        <p className="ck-dialog-text" style={{ marginTop: 12 }}>Nothing found for this player.</p>
      ) : (
        <FindingGroups findings={shown} icons={icons} open={openKinds} onOpenChange={setOpenKinds}
          picked={picked} onHover={setHovered} />
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
  caution?: boolean;                    // a rough value: amber-tinted panel
  title?: string;
};
// Uptime 95%+ reads good, under 90% poor. Crit luck stays uncoloured: it's
// luck, not something to fix.
const UPTIME_GOOD = 0.95, UPTIME_POOR = 0.9;
// A rough value (crit luck from too few hits): the Minor amber, faint.
const CAUTION_BG = "rgba(227, 195, 74, 0.10)", CAUTION_EDGE = "rgba(227, 195, 74, 0.45)";
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
            background: s.caution ? CAUTION_BG : "var(--ck-bg-card-hi)",
            border: `1px solid ${s.caution ? CAUTION_EDGE : "var(--ck-line-2)"}`, borderRadius: 3,
            borderTop: `2px solid ${s.tone ? TONE[s.tone] : s.caution ? CAUTION_EDGE : "var(--ck-line-2)"}`,
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
// first), each one's entries in time order, collapsed until clicked. The
// picked finding (a timeline dot or a summary card) is highlighted and
// scrolled to; hovering a row highlights its dot.
function FindingGroups({ findings, icons, open, onOpenChange: setOpen, picked, onHover }: {
  findings: DamageFinding[]; icons: AbilityIcons;
  open: Set<DamageFinding["kind"]>; onOpenChange: React.Dispatch<React.SetStateAction<Set<DamageFinding["kind"]>>>;
  picked: DamageFinding | null; onHover: (f: DamageFinding | null) => void;
}) {
  const groups = new Map<DamageFinding["kind"], DamageFinding[]>();
  for (const f of findings) groups.set(f.kind, [...(groups.get(f.kind) ?? []), f]);
  const counted = (list: DamageFinding[]) => list.filter((f) => !f.forced).reduce((a, f) => a + f.lostDamage, 0);
  const sorted = [...groups].sort((a, b) => counted(b[1]) - counted(a[1]));
  const maxRow = Math.max(1, ...findings.filter((f) => !f.forced).map((f) => f.lostDamage));
  return (
    <div style={{ marginTop: 10 }}>
      {sorted.map(([kind, list]) => {
        const total = counted(list);
        const isOpen = open.has(kind);
        const forcedOnly = list.every((f) => f.forced) && kind !== "movement";
        const moveTotal = list.filter((f) => f.movement).reduce((a, f) => a + f.lostDamage, 0);
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
              <ThemeGlyph theme={KIND_THEME[kind]} size={22} />
              <span style={{ flex: "0 0 auto", fontWeight: 600, fontSize: 13, color: "var(--ck-text)" }}>{KIND_LABEL[kind]}</span>
              <span style={{ color: "var(--ck-text-3)", fontSize: 12, flex: "1 1 auto" }}>
                {list.length} {list.length === 1 ? "entry" : "entries"}
                {list.some((f) => f.forced) && !forcedOnly ? ` (${list.filter((f) => f.forced).length} forced)` : ""}
              </span>
              <span className="ck-num" style={{ color: total >= 1 ? LOSS_COLOR : moveTotal >= 1 ? MOVEMENT_COLOR : "var(--ck-text-3)", fontSize: 14, fontWeight: 700, flex: "0 0 auto" }}>
                {total >= 1 ? fmtDamage(total) : moveTotal >= 1 ? fmtDamage(moveTotal) : "—"}
              </span>
            </div>
            {isOpen && (
              <div style={{ paddingLeft: 22, paddingBottom: 4 }}>
                {[...list].sort((a, b) => a.startMs - b.startMs).map((f, i) => (
                  <FindingRow key={i} f={f} icons={icons} maxLost={maxRow} picked={f === picked} onHover={onHover} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Time | lead icon (the first ability named, else the theme glyph) | the
// line, ability names with their icons, over its basis | cost with a bar
// against the player's biggest single finding.
function FindingRow({ f, icons, maxLost, picked, onHover }: {
  f: DamageFinding; icons: AbilityIcons; maxLost: number; picked: boolean; onHover: (f: DamageFinding | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (picked) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [picked]);
  const lead = firstAbility(f.detail, icons);
  const counted = !f.forced && f.lostDamage >= 1;
  return (
    <div ref={ref} onMouseEnter={() => onHover(f)} onMouseLeave={() => onHover(null)}
      style={{
        display: "grid", gridTemplateColumns: "42px 22px minmax(0, 1fr) 64px", columnGap: 10, alignItems: "start",
        padding: "6px 4px", borderTop: "1px solid var(--ck-line)", opacity: f.forced && !f.movement ? 0.55 : 1,
        background: picked ? "rgba(83,169,255,0.10)" : undefined, boxShadow: picked ? "inset 2px 0 0 var(--ck-arcane)" : undefined,
      }}>
      <span className="ck-num" style={{ color: "var(--ck-text-2)", fontSize: 12, paddingTop: 2 }}>{fmtTime(f.startMs)}</span>
      {lead ? (
        <img src={icons.icons.get(lead)} alt={lead} width={22} height={22} style={{ display: "block", borderRadius: 3 }}
          onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
      ) : <ThemeGlyph theme={KIND_THEME[f.kind]} size={22} />}
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "var(--ck-text)", fontSize: 13, lineHeight: 1.5 }}>
          <RichDetail text={f.detail} icons={icons} />
          {f.target && <span style={{ color: "var(--ck-text-2)" }}> · on {f.target}</span>}
          {f.cause && !f.movement && <span style={{ color: "var(--ck-text-3)" }}> — {f.forced ? `forced: ${f.cause}` : f.cause}</span>}
          {f.movement && <span style={{ color: MOVEMENT_COLOR }}> — movement, not counted</span>}
        </div>
        <div style={{ color: "var(--ck-text-3)", fontSize: 11.5 }}>
          {f.phase ? `${f.phase} · ` : ""}{f.inference ? "Inference: " : ""}{f.basis}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <span className="ck-num" style={{ color: f.movement ? MOVEMENT_COLOR : f.forced ? "var(--ck-text-3)" : LOSS_SOFT, fontSize: 12.5, fontWeight: 600 }}>
          {f.lostDamage >= 1 ? fmtDamage(f.lostDamage) : "—"}
        </span>
        {counted && (
          <div style={{ height: 3, marginTop: 4, borderRadius: 2, background: "var(--ck-line)", overflow: "hidden", display: "flex", justifyContent: "flex-end" }}>
            <span style={{ width: `${Math.min(1, f.lostDamage / maxLost) * 100}%`, background: LOSS_SOFT }} />
          </div>
        )}
      </div>
    </div>
  );
}

function AggregateDetail({ agg, totalPulls, colorFor, iconFor, pulls }: {
  agg: PlayerDamageAggregate | undefined; totalPulls: number; colorFor: ColorFor; iconFor: ColorFor; pulls: Pull[];
}) {
  const player = agg?.player;
  const icons = useMemo(() => abilityIconsOf(player ? pulls : [], player ?? ""), [pulls, player]);
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
      <BiggestWins items={recurringItems(agg.recurring)} perPull={agg.pulls} icons={icons} />
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
                <td style={{ color: "var(--ck-text)" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <ThemeGlyph theme={KIND_THEME[r.kind]} size={18} />
                    <span><RichDetail text={r.label} icons={icons} />{r.forced ? " (forced)" : ""}</span>
                  </span>
                </td>
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
