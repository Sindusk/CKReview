"use client";

// components/MitigationDialog.tsx
//
// "Mitigation" modal opened from the header bar. Shows the party's actual
// mitigation per raidwide hit, read from the log (docs/archive/mitigation-redesign.md):
// what was used and by whom, what was free, how close the raid came to
// dying, and what could be dropped. No plan input and no PullErrors; this
// replaced the Ikuya-sheet Heatmap and Review tabs on 2026-10-06.
//
// Two views (user, 2026-10-09): Analysis (components/MitigationPlan.tsx,
// lib/mitigation/plan.ts), a short list of coordinated changes for the raid
// lead read from all of a group's pulls, opened first whenever the group
// has PLAN_MIN_PULLS+ analyzable pulls; and the full Timeline
// (components/MitigationTimeline.tsx), with a details panel for the
// clicked hit (components/MitigationHitDetails.tsx). The timeline hides
// uneventful hits (raid hits nobody died to, taken at full health) and,
// across pulls, rare ones, each behind a checkbox.
// A player selector (components/MitigationPlayerPicker.tsx) narrows the
// timeline to one player's columns and removes Analysis items that don't
// involve them. Both views are for one boss
// at a time (a Boss dropdown, defaulting to the current pull's boss), and
// for either a single pull or all of one group's pulls on that boss at once
// (the default: one pull is too noisy to plan from). A group is an exact
// roster; a report can hold several groups' pulls of the same boss. Pulls fetched before the mitigation fields were kept
// are listed as needing a re-fetch; re-fetching stays an explicit action
// elsewhere in the app, never triggered from here.

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Pull } from "@/types/Pull";
import { analyzePullMitigation } from "@/lib/mitigation/analyze";
import { aggregateMitigation } from "@/lib/mitigation/aggregate";
import { PLAN_MIN_PULLS, buildMitigationPlan } from "@/lib/mitigation/plan";
import { PlanView } from "./MitigationPlan";
import { PlayerPicker } from "./MitigationPlayerPicker";
import { AggregateDetails, HitDetails } from "./MitigationHitDetails";
import { FFXIV_MITIGATION } from "@/lib/mitigation/ffxiv-catalog";
import { useFFPullSelector } from "@/hooks/useFFPullSelector";
import {
  AggregateTimeline, PullTimeline, TimelineLegend, buildPlayerGroups, hasMitigationData, rowUneventful, uneventful,
} from "./MitigationTimeline";
import { Dialog } from "./ui/Dialog";
import RosterPullPicker from "./RosterPullPicker";

type MitigationDialogProps = {
  open:     boolean;
  onClose:  () => void;
  pulls:    Pull[];
  // The app's globally-selected pull — the dialog's pull dropdown resets to
  // it on open when "one pull" mode is picked (hooks/useFFPullSelector.ts).
  currentPullId: number | null;
};

type View = "analysis" | "timeline";

const rosterKey = (pull: Pull) => pull.players.map((p) => p.name).sort().join("|");

function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ck-text-2)", cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}

export default function MitigationDialog({ open, onClose, pulls, currentPullId }: MitigationDialogProps) {
  const { ffPulls, selectedPullId, setSelectedPullId, selectedPull } =
    useFFPullSelector(pulls, open, currentPullId);
  const [allPulls, setAllPulls] = useState(true);
  // Players whose personal mitigation columns are open (collapsed by default).
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = (player: string) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(player)) next.delete(player); else next.add(player);
    return next;
  });
  // The view the user picked; null until they do, so each open defaults by
  // how many pulls there are.
  const [viewPick, setViewPick] = useState<View | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [selectedHitId, setSelectedHitId] = useState<string | null>(null);
  const [showUneventful, setShowUneventful] = useState(false);
  // Hits the group rarely takes are likely mistakes, not mitigation to
  // plan (AggregatedHit.rare): hidden unless asked for.
  const [showRare, setShowRare] = useState(false);
  useEffect(() => {
    if (!open) return;
    setViewPick(null);
    setSelectedHitId(null);
  }, [open]);

  // One boss at a time: the selected pull's boss, all pulls or one of them.
  const bosses = useMemo(() => [...new Set(ffPulls.map((p) => p.name))], [ffPulls]);
  const boss = selectedPull?.name ?? bosses[0];
  const bossPulls = useMemo(() => ffPulls.filter((p) => p.name === boss), [ffPulls, boss]);
  const pickBoss = (name: string) => {
    const pulls = ffPulls.filter((p) => p.name === name);
    if (pulls.length) setSelectedPullId(pulls[pulls.length - 1].id);
    setViewPick(null);
  };

  // Within the boss, pulls are grouped by roster (every player the same), so
  // "all pulls" never mixes two groups' mitigation plans.
  const rosters = useMemo(() => {
    const byKey = new Map<string, Pull[]>();
    for (const p of bossPulls) byKey.set(rosterKey(p), [...(byKey.get(rosterKey(p)) ?? []), p]);
    return [...byKey].map(([key, pulls]) => ({ key, pulls }));
  }, [bossPulls]);
  const roster = selectedPull ? rosterKey(selectedPull) : rosters[0]?.key;
  const rosterPulls = useMemo(() => rosters.find((r) => r.key === roster)?.pulls ?? [], [rosters, roster]);

  const analyzable = useMemo(() => rosterPulls.filter(hasMitigationData), [rosterPulls]);
  const stale = rosterPulls.length - analyzable.length;

  // Only computed while open; the analysis reads every damage event.
  const perPull = useMemo(() => {
    if (!open) return [];
    return analyzable.map((p) => ({
      pullId: p.id, pullNumber: p.pullNumber, durationMs: p.fightDuration,
      hits: analyzePullMitigation(p, FFXIV_MITIGATION),
    }));
  }, [open, analyzable]);
  const aggregate = useMemo(() => (allPulls ? aggregateMitigation(perPull, FFXIV_MITIGATION) : []), [allPulls, perPull]);
  const view: View = viewPick ?? (allPulls && perPull.length >= PLAN_MIN_PULLS ? "analysis" : "timeline");
  const plan = useMemo(() => {
    if (!allPulls || view !== "analysis" || perPull.length < PLAN_MIN_PULLS) return null;
    const byId = new Map(analyzable.map((p) => [p.id, p]));
    return buildMitigationPlan(aggregate, perPull.map((p) => ({ pull: byId.get(p.pullId)!, hits: p.hits })), FFXIV_MITIGATION);
  }, [allPulls, view, perPull, aggregate, analyzable]);

  const groups = useMemo(() => buildPlayerGroups(allPulls ? analyzable : selectedPull ? [selectedPull] : []),
    [allPulls, analyzable, selectedPull]);
  const focusGroup = groups.find((g) => g.player === focus);
  const shownFocus = focusGroup ? focus : null;
  // A picked player shows only their columns, personal ones open.
  const shownGroups = focusGroup ? [focusGroup] : groups;
  const shownExpanded = focusGroup ? new Set([...expanded, focusGroup.player]) : expanded;

  const notRare = aggregate.filter((r) => !r.rare);
  const rareCount = aggregate.length - notRare.length;
  const rowsAfterRare = showRare ? aggregate : notRare;
  const quietRows = rowsAfterRare.filter(rowUneventful).length;
  const shownRows = showUneventful ? rowsAfterRare : rowsAfterRare.filter((r) => !rowUneventful(r));

  if (!open) return null;

  const selectedHits = selectedPull ? perPull.find((p) => p.pullId === selectedPull.id)?.hits : undefined;
  const quietHits = selectedHits?.filter(uneventful).length ?? 0;
  const shownHits = selectedHits && !showUneventful ? selectedHits.filter((h) => !uneventful(h)) : selectedHits;
  const selectedStale = !allPulls && selectedPull !== null && !hasMitigationData(selectedPull);
  const closeDetails = () => setSelectedHitId(null);
  const detailRow = allPulls ? shownRows.find((r) => r.id === selectedHitId) : undefined;
  const detailHit = !allPulls ? shownHits?.find((h) => h.id === selectedHitId) : undefined;
  const quiet = allPulls ? quietRows : quietHits;

  return (
    <Dialog
      title="Mitigation"
      width={ffPulls.length > 0 ? "min(1500px, 97vw)" : "480px"}
      maxHeight="88vh"
      zIndex={1100}
      onBackdropClick={onClose}
      onClose={onClose}
      bodyStyle={{ display: "flex", flexDirection: "column", overflow: "hidden" }}
    >
      {ffPulls.length === 0 ? (
        <p className="ck-dialog-text">No FFXIV report loaded. Import a report to see the party&apos;s mitigation on each raidwide.</p>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 4 }}>
              <button className={`ck-tab ck-tab--sm${view === "analysis" ? " ck-tab--active" : ""}`} onClick={() => setViewPick("analysis")}>Analysis</button>
              <button className={`ck-tab ck-tab--sm${view === "timeline" ? " ck-tab--active" : ""}`} onClick={() => setViewPick("timeline")}>Timeline</button>
            </div>
            <span className="ck-label" style={{ margin: 0 }}>Boss</span>
            <select className="ck-field" value={boss} onChange={(e) => pickBoss(e.target.value)} style={{ padding: "3px 8px" }}>
              {bosses.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <span className="ck-label" style={{ margin: 0 }}>Pull</span>
            <RosterPullPicker
              rosters={rosters}
              usable={hasMitigationData}
              value={allPulls ? { kind: "all", roster: roster ?? "" } : { kind: "pull", pullId: selectedPullId ?? -1 }}
              onChange={(pick) => {
                if (pick.kind === "all") {
                  const pulls = rosters.find((r) => r.key === pick.roster)?.pulls ?? [];
                  if (pulls.length) setSelectedPullId(pulls[pulls.length - 1].id);
                  setAllPulls(true);
                  return;
                }
                setAllPulls(false);
                setSelectedPullId(pick.pullId);
              }}
            />
            {groups.length > 0 && <PlayerPicker groups={groups} focus={shownFocus} onPick={setFocus} />}
            {stale > 0 && (
              <span className="ck-help" style={{ margin: 0 }}>
                {stale} of {rosterPulls.length} pulls were fetched before mitigation data was kept and are left out.
                Re-fetch the report to include them.
              </span>
            )}
          </div>

          {view === "timeline" && <TimelineLegend aggregate={allPulls} />}

          {view === "timeline" && (quiet > 0 || (allPulls && rareCount > 0)) && (
            <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              {quiet > 0 && (
                <Checkbox checked={showUneventful} onChange={setShowUneventful}>
                  Show {quiet} uneventful hit{quiet > 1 ? "s" : ""} (nobody died, everyone at full HP going in)
                </Checkbox>
              )}
              {allPulls && rareCount > 0 && (
                <Checkbox checked={showRare} onChange={setShowRare}>
                  Show {rareCount} rare hit{rareCount > 1 ? "s" : ""} (taken in under a quarter of the pulls that got that far)
                </Checkbox>
              )}
            </div>
          )}

          <div style={{ flex: "1 1 auto", minHeight: 0, display: "flex", border: "1px solid var(--ck-line-2)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ flex: "1 1 auto", minWidth: 0, overflow: "auto" }}>
              {view === "analysis" ? (
                !allPulls ? (
                  <p className="ck-dialog-text" style={{ padding: 12 }}>
                    The analysis reads all of a group&apos;s pulls: one pull is too noisy to plan from.{" "}
                    <button className="ck-btn ck-btn--sm" onClick={() => setAllPulls(true)}>Use all pulls</button>
                  </p>
                ) : !plan ? (
                  <p className="ck-dialog-text" style={{ padding: 12 }}>
                    The analysis needs at least {PLAN_MIN_PULLS} pulls with mitigation data from this group ({perPull.length} loaded).
                    The Timeline still shows them.
                  </p>
                ) : <PlanView plan={plan} focus={shownFocus} />
              ) : selectedStale ? (
                <p className="ck-dialog-text" style={{ padding: 12 }}>
                  This pull was fetched before mitigation data was kept. Re-fetch the report to analyze it.
                </p>
              ) : allPulls ? (
                analyzable.length === 0
                  ? <p className="ck-dialog-text" style={{ padding: 12 }}>No loaded pull has mitigation data yet. Re-fetch the report to analyze it.</p>
                  : <AggregateTimeline rows={shownRows} groups={shownGroups} expanded={shownExpanded} onToggle={toggleExpanded}
                      selectedId={selectedHitId} onSelect={setSelectedHitId} />
              ) : shownHits && shownHits.length > 0 ? (
                <PullTimeline hits={shownHits} groups={shownGroups} expanded={shownExpanded} onToggle={toggleExpanded}
                  selectedId={selectedHitId} onSelect={setSelectedHitId} />
              ) : (
                <p className="ck-dialog-text" style={{ padding: 12 }}>
                  {selectedHits?.length ? "Every hit in this pull was uneventful." : "No raidwide hits in this pull."}
                </p>
              )}
            </div>
            {view === "timeline" && detailRow && <AggregateDetails row={detailRow} onClose={closeDetails} />}
            {view === "timeline" && detailHit && <HitDetails hit={detailHit} onClose={closeDetails} />}
          </div>
        </>
      )}
    </Dialog>
  );
}
