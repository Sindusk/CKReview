"use client";

// components/MitigationDialog.tsx
//
// "Mitigation" modal opened from the header bar. Shows the party's actual
// mitigation per raidwide hit, read from the log (docs/archive/mitigation-redesign.md):
// what was used and by whom, what was free, how close the raid came to
// dying, and what could be dropped. No plan input and no PullErrors; this
// replaced the Ikuya-sheet Heatmap and Review tabs on 2026-10-06.
//
// One view, the timeline (components/MitigationTimeline.tsx), for one boss
// at a time (a Boss dropdown, defaulting to the current pull's boss), and
// for either a single pull or all of one group's pulls on that boss at once
// (the default: one pull is too noisy to plan from). A group is an exact
// roster; a report can hold several groups' pulls of the same boss. Pulls fetched before the mitigation fields were kept
// are listed as needing a re-fetch; re-fetching stays an explicit action
// elsewhere in the app, never triggered from here.

import { useMemo, useState } from "react";
import type { Pull } from "@/types/Pull";
import { analyzePullMitigation } from "@/lib/mitigation/analyze";
import { aggregateMitigation } from "@/lib/mitigation/aggregate";
import { FFXIV_MITIGATION } from "@/lib/mitigation/ffxiv-catalog";
import { useFFPullSelector } from "@/hooks/useFFPullSelector";
import {
  AggregateTimeline, PullTimeline, TimelineLegend, buildPlayerGroups, hasMitigationData,
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

const rosterKey = (pull: Pull) => pull.players.map((p) => p.name).sort().join("|");

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

  // One boss at a time: the selected pull's boss, all pulls or one of them.
  const bosses = useMemo(() => [...new Set(ffPulls.map((p) => p.name))], [ffPulls]);
  const boss = selectedPull?.name ?? bosses[0];
  const bossPulls = useMemo(() => ffPulls.filter((p) => p.name === boss), [ffPulls, boss]);
  const pickBoss = (name: string) => {
    const pulls = ffPulls.filter((p) => p.name === name);
    if (pulls.length) setSelectedPullId(pulls[pulls.length - 1].id);
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
  // Hits the group rarely takes are likely mistakes, not mitigation to
  // plan (AggregatedHit.rare): hidden unless asked for.
  const [showRare, setShowRare] = useState(false);
  const rareCount = aggregate.filter((r) => r.rare).length;
  const shownRows = showRare ? aggregate : aggregate.filter((r) => !r.rare);
  const groups = useMemo(() => buildPlayerGroups(allPulls ? analyzable : selectedPull ? [selectedPull] : []),
    [allPulls, analyzable, selectedPull]);

  if (!open) return null;

  const selectedHits = selectedPull ? perPull.find((p) => p.pullId === selectedPull.id)?.hits : undefined;
  const selectedStale = !allPulls && selectedPull !== null && !hasMitigationData(selectedPull);

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
            {stale > 0 && (
              <span className="ck-help" style={{ margin: 0 }}>
                {stale} of {rosterPulls.length} pulls were fetched before mitigation data was kept and are left out.
                Re-fetch the report to include them.
              </span>
            )}
          </div>

          <TimelineLegend aggregate={allPulls} />

          {allPulls && rareCount > 0 && (
            <div className="ck-help" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <span>
                {showRare ? "Showing" : "Hiding"} {rareCount} hit{rareCount > 1 ? "s" : ""} taken in under a quarter of the pulls
                that got that far: likely mistakes, not mitigation to plan.
              </span>
              <button className="ck-btn ck-btn--sm" onClick={() => setShowRare((s) => !s)}>{showRare ? "Hide" : "Show"}</button>
            </div>
          )}

          <div style={{ flex: "1 1 auto", minHeight: 0, overflow: "auto", border: "1px solid var(--ck-line-2)", borderRadius: 3 }}>
            {selectedStale ? (
              <p className="ck-dialog-text" style={{ padding: 12 }}>
                This pull was fetched before mitigation data was kept. Re-fetch the report to analyze it.
              </p>
            ) : allPulls ? (
              analyzable.length === 0
                ? <p className="ck-dialog-text" style={{ padding: 12 }}>No loaded pull has mitigation data yet. Re-fetch the report to analyze it.</p>
                : <AggregateTimeline rows={shownRows} groups={groups} expanded={expanded} onToggle={toggleExpanded} />
            ) : selectedHits && selectedHits.length > 0 ? (
              <PullTimeline hits={selectedHits} groups={groups} expanded={expanded} onToggle={toggleExpanded} />
            ) : (
              <p className="ck-dialog-text" style={{ padding: 12 }}>No raidwide hits in this pull.</p>
            )}
          </div>
        </>
      )}
    </Dialog>
  );
}
