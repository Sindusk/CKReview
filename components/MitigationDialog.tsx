"use client";

// components/MitigationDialog.tsx
//
// "Mitigation" modal opened from the header bar. Shows the party's actual
// mitigation per raidwide hit, read from the log (docs/mitigation-redesign.md):
// what was used and by whom, what was free, how close the raid came to
// dying, and what could be dropped. No plan input and no PullErrors; this
// replaced the Ikuya-sheet Heatmap and Review tabs on 2026-10-06.
//
// One view, the timeline (components/MitigationTimeline.tsx), for either a
// single pull or every loaded pull at once (the default: one pull is too
// noisy to plan from). Pulls fetched before the mitigation fields were kept
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

type MitigationDialogProps = {
  open:     boolean;
  onClose:  () => void;
  pulls:    Pull[];
  // The app's globally-selected pull — the dialog's pull dropdown resets to
  // it on open when "one pull" mode is picked (hooks/useFFPullSelector.ts).
  currentPullId: number | null;
};

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

  const analyzable = useMemo(() => ffPulls.filter(hasMitigationData), [ffPulls]);
  const stale = ffPulls.length - analyzable.length;

  // Only computed while open; the analysis reads every damage event.
  const perPull = useMemo(() => {
    if (!open) return [];
    return analyzable.map((p) => ({
      pullId: p.id, pullNumber: p.pullNumber, hits: analyzePullMitigation(p, FFXIV_MITIGATION),
    }));
  }, [open, analyzable]);
  const aggregate = useMemo(() => (allPulls ? aggregateMitigation(perPull, FFXIV_MITIGATION) : []), [allPulls, perPull]);
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
              <option value="all">All loaded pulls ({analyzable.length})</option>
              {ffPulls.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} #{p.pullNumber} ({p.result}){hasMitigationData(p) ? "" : " — needs re-fetch"}
                </option>
              ))}
            </select>
            {stale > 0 && (
              <span className="ck-help" style={{ margin: 0 }}>
                {stale} of {ffPulls.length} pulls were fetched before mitigation data was kept and are left out.
                Re-fetch the report to include them.
              </span>
            )}
          </div>

          <TimelineLegend aggregate={allPulls} />

          <div style={{ flex: "1 1 auto", minHeight: 0, overflow: "auto", border: "1px solid var(--ck-line-2)", borderRadius: 3 }}>
            {selectedStale ? (
              <p className="ck-dialog-text" style={{ padding: 12 }}>
                This pull was fetched before mitigation data was kept. Re-fetch the report to analyze it.
              </p>
            ) : allPulls ? (
              analyzable.length === 0
                ? <p className="ck-dialog-text" style={{ padding: 12 }}>No loaded pull has mitigation data yet. Re-fetch the report to analyze it.</p>
                : <AggregateTimeline rows={aggregate} groups={groups} expanded={expanded} onToggle={toggleExpanded} />
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
