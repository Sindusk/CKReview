"use client";

// components/MitigationDialog.tsx
//
// "Mitigation" modal opened from the header bar. Shows the party's actual
// mitigation per raidwide hit, read from the log (docs/archive/mitigation-redesign.md):
// what was used and by whom, what was free, how close the raid came to
// dying, and what could be dropped. No plan input and no PullErrors; this
// replaced the Ikuya-sheet Heatmap and Review tabs on 2026-10-06.
//
// Two views: the Plan (components/MitigationPlan.tsx, lib/mitigation/plan.ts),
// a short list of coordinated changes for the raid lead, read from all of
// a group's pulls; and the full timeline (components/MitigationTimeline.tsx).
// A role filter hides other roles' columns in the timeline and dims items
// that don't involve that role in the plan. Both are for one boss
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
import { PLAN_MIN_PULLS, buildMitigationPlan } from "@/lib/mitigation/plan";
import { PlanView, ROLE_FILTERS, roleOfSlot, type RoleFilter } from "./MitigationPlan";
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
  const [view, setView] = useState<"plan" | "timeline">("plan");
  const [role, setRole] = useState<RoleFilter>("all");
  const plan = useMemo(() => {
    if (!allPulls || view !== "plan" || perPull.length < PLAN_MIN_PULLS) return null;
    const byId = new Map(analyzable.map((p) => [p.id, p]));
    return buildMitigationPlan(aggregate, perPull.map((p) => ({ pull: byId.get(p.pullId)!, hits: p.hits })), FFXIV_MITIGATION);
  }, [allPulls, view, perPull, aggregate, analyzable]);
  // Hits the group rarely takes are likely mistakes, not mitigation to
  // plan (AggregatedHit.rare): hidden unless asked for.
  const [showRare, setShowRare] = useState(false);
  const rareCount = aggregate.filter((r) => r.rare).length;
  const shownRows = showRare ? aggregate : aggregate.filter((r) => !r.rare);
  const groups = useMemo(() => buildPlayerGroups(allPulls ? analyzable : selectedPull ? [selectedPull] : []),
    [allPulls, analyzable, selectedPull]);
  const roleOf = useMemo(() => {
    const map = new Map(groups.map((g) => [g.player, roleOfSlot(g.slot)]));
    return (player: string) => map.get(player);
  }, [groups]);
  // Players with no known slot stay visible under every filter.
  const shownGroups = useMemo(() => (role === "all" ? groups : groups.filter((g) => (roleOfSlot(g.slot) ?? role) === role)),
    [groups, role]);

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
            <div style={{ display: "flex", gap: 4 }}>
              <button className={`ck-tab ck-tab--sm${view === "plan" ? " ck-tab--active" : ""}`} onClick={() => setView("plan")}>Plan</button>
              <button className={`ck-tab ck-tab--sm${view === "timeline" ? " ck-tab--active" : ""}`} onClick={() => setView("timeline")}>Timeline</button>
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
            <span className="ck-label" style={{ margin: 0 }}>Role</span>
            <div style={{ display: "flex", gap: 4 }}>
              {ROLE_FILTERS.map((r) => (
                <button key={r.value} className={`ck-tab ck-tab--sm${role === r.value ? " ck-tab--active" : ""}`} onClick={() => setRole(r.value)}>
                  {r.label}
                </button>
              ))}
            </div>
            {stale > 0 && (
              <span className="ck-help" style={{ margin: 0 }}>
                {stale} of {rosterPulls.length} pulls were fetched before mitigation data was kept and are left out.
                Re-fetch the report to include them.
              </span>
            )}
          </div>

          {view === "timeline" && <TimelineLegend aggregate={allPulls} />}

          {view === "timeline" && allPulls && rareCount > 0 && (
            <div className="ck-help" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <span>
                {showRare ? "Showing" : "Hiding"} {rareCount} hit{rareCount > 1 ? "s" : ""} taken in under a quarter of the pulls
                that got that far: likely mistakes, not mitigation to plan.
              </span>
              <button className="ck-btn ck-btn--sm" onClick={() => setShowRare((s) => !s)}>{showRare ? "Hide" : "Show"}</button>
            </div>
          )}

          <div style={{ flex: "1 1 auto", minHeight: 0, overflow: "auto", border: "1px solid var(--ck-line-2)", borderRadius: 3 }}>
            {view === "plan" ? (
              !allPulls ? (
                <p className="ck-dialog-text" style={{ padding: 12 }}>
                  The plan reads all of a group&apos;s pulls: one pull is too noisy to plan from.{" "}
                  <button className="ck-btn ck-btn--sm" onClick={() => setAllPulls(true)}>Use all pulls</button>
                </p>
              ) : !plan ? (
                <p className="ck-dialog-text" style={{ padding: 12 }}>
                  The plan needs at least {PLAN_MIN_PULLS} pulls with mitigation data from this group ({perPull.length} loaded).
                  The Timeline still shows them.
                </p>
              ) : <PlanView plan={plan} roleOf={roleOf} role={role} />
            ) : selectedStale ? (
              <p className="ck-dialog-text" style={{ padding: 12 }}>
                This pull was fetched before mitigation data was kept. Re-fetch the report to analyze it.
              </p>
            ) : allPulls ? (
              analyzable.length === 0
                ? <p className="ck-dialog-text" style={{ padding: 12 }}>No loaded pull has mitigation data yet. Re-fetch the report to analyze it.</p>
                : <AggregateTimeline rows={shownRows} groups={shownGroups} expanded={expanded} onToggle={toggleExpanded} />
            ) : selectedHits && selectedHits.length > 0 ? (
              <PullTimeline hits={selectedHits} groups={shownGroups} expanded={expanded} onToggle={toggleExpanded} />
            ) : (
              <p className="ck-dialog-text" style={{ padding: 12 }}>No raidwide hits in this pull.</p>
            )}
          </div>
        </>
      )}
    </Dialog>
  );
}
