"use client";

// components/MitigationDialog.tsx
//
// "Mitigation" modal opened from the header bar. Shows the party's actual
// mitigation per raidwide hit, read from the log (docs/archive/mitigation-redesign.md):
// what was used and by whom, what was free, how close the raid came to
// dying, and what could be dropped. No plan input and no PullErrors; this
// replaced the Ikuya-sheet Heatmap and Review tabs on 2026-10-06.
//
// Three views. Tanking (components/MitigationTanking.tsx, user, 2026-10-11):
// both tanks on one fight clock, buster margins and the tank optimizer's
// changes (lib/mitigation/tanking-plan.ts, in lib/mitigation/tanking.worker.ts),
// computed only while it is open. Analysis (components/MitigationPlan.tsx,
// lib/mitigation/plan.ts, lib/mitigation/findings.ts), findings in
// categories with suggestions and a few coordinated cooldown changes for the
// raid lead, searched over the group's last N pulls (a "Last N pulls" input,
// blank = 5) or the one selected pull (user, 2026-10-14) in a web worker
// (lib/mitigation/plan.worker.ts) when the user clicks Analyze, never on
// open; opened first whenever there is an analyzable pull; and the full Timeline
// (components/MitigationTimeline.tsx), with a details panel for the
// clicked hit (components/MitigationHitDetails.tsx). The timeline hides
// uneventful hits (raid hits nobody died to, taken at full health) and,
// across pulls, rare ones, each behind a checkbox.
// A player selector (components/MitigationPlayerPicker.tsx) narrows the
// timeline to one player's columns. The Tanking view swaps it for the two
// tanks side by side; the Analysis has none (user, 2026-10-11). All views
// are for one boss
// at a time (a Boss dropdown, defaulting to the current pull's boss), and
// for either a single pull or all of one group's pulls on that boss at once
// (the default: one pull is too noisy to plan from). A group is an exact
// roster; a report can hold several groups' pulls of the same boss. Boss-
// debuff reach (lib/mitigation/debuff-reach.ts) is learned from every
// loaded pull of the boss, any group. Pulls fetched before the mitigation fields were kept
// are listed as needing a re-fetch; re-fetching stays an explicit action
// elsewhere in the app, never triggered from here.

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Pull } from "@/types/Pull";
import { analyzePullMitigation } from "@/lib/mitigation/analyze";
import { aggregateMitigation } from "@/lib/mitigation/aggregate";
import { buildDebuffReach } from "@/lib/mitigation/debuff-reach";
import { buildMitigationPlan, planWindow, type OptimizedPlan } from "@/lib/mitigation/plan";
import type { PlanReply, PlanRequest } from "@/lib/mitigation/plan.worker";
import { aggregateBusters, analyzePullTanking, summarizeUnused } from "@/lib/mitigation/tanking";
import { buildTankingPlan, clockPull, tankWindow, type TankingPlan } from "@/lib/mitigation/tanking-plan";
import type { TankingReply, TankingRequest } from "@/lib/mitigation/tanking.worker";
import { AnalysisWindowControls, PlanView } from "./MitigationPlan";
import { TankingView, chipsFromAggregate, chipsFromPull } from "./MitigationTanking";
import { PlayerPicker } from "./MitigationPlayerPicker";
import { AggregateDetails, HitDetails } from "./MitigationHitDetails";
import { FFXIV_MITIGATION } from "@/lib/mitigation/ffxiv-catalog";
import { withDeploymentShields } from "@/lib/mitigation/ffxiv-deployment";
import { useFFPullSelector } from "@/hooks/useFFPullSelector";
import {
  AggregateTimeline, PullTimeline, TimelineLegend, buildPlayerGroups, fmtTime, hasMitigationData, rowUneventful, uneventful,
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
  // Play the video from `ms` into that pull (closes the dialog). Unset
  // without a synced VOD.
  onSeek?: (pullId: number, ms: number) => void;
};

type View ="analysis" | "timeline" | "tanking";

const rosterKey = (pull: Pull) => pull.players.map((p) => p.name).sort().join("|");

function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ck-text-2)", cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}

export default function MitigationDialog({ open, onClose, pulls, currentPullId, onSeek }: MitigationDialogProps) {
  const { ffPulls: rawFfPulls, selectedPullId, setSelectedPullId, selectedPull } =
    useFFPullSelector(pulls, open, currentPullId);
  // Every mitigation view reads the pulls with spreadlo shields told apart
  // from Galvanize (lib/mitigation/ffxiv-deployment.ts; memoized per pull).
  const ffPulls = useMemo(() => rawFfPulls.map(withDeploymentShields), [rawFfPulls]);
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

  // Boss-debuff reach is learned from every loaded pull of the boss, any
  // group (lib/mitigation/debuff-reach.ts): more attempts, fewer unknowns.
  const reach = useMemo(() => (open ? buildDebuffReach(bossPulls.filter(hasMitigationData), FFXIV_MITIGATION) : undefined),
    [open, bossPulls]);
  // Only computed while open; the analysis reads every damage event.
  const perPull = useMemo(() => {
    if (!open) return [];
    return analyzable.map((p) => ({
      pullId: p.id, pullNumber: p.pullNumber, durationMs: p.fightDuration,
      hits: analyzePullMitigation(p, FFXIV_MITIGATION, reach),
    }));
  }, [open, analyzable, reach]);
  const aggregate = useMemo(() => (allPulls ? aggregateMitigation(perPull, FFXIV_MITIGATION, reach) : []), [allPulls, perPull, reach]);
  const view: View = viewPick ?? (perPull.length > 0 ? "analysis" : "timeline");

  // The Analysis searches the group's last N pulls (lib/mitigation/plan.ts),
  // or the one selected pull (user, 2026-10-14), in a web worker; blank
  // input = the default window.
  const [windowInput, setWindowInput] = useState("");
  const windowSize = /^\d+$/.test(windowInput.trim()) ? Number(windowInput) : undefined;
  const [planResult, setPlanResult] = useState<{ plan: OptimizedPlan | null; pending: boolean; error?: string }>({ plan: null, pending: false });
  const worker = useRef<Worker | null>(null);
  const requestId = useRef(0);
  const planWin = useMemo(() => {
    const byId = new Map(analyzable.map((p) => [p.id, p]));
    const picked = allPulls ? planWindow(perPull, windowSize) : perPull.filter((p) => p.pullId === selectedPull?.id);
    return picked.map((p) => ({ ...p, pull: byId.get(p.pullId)! }));
  }, [allPulls, perPull, analyzable, windowSize, selectedPull]);
  // Opening the view reads the log only; the optimizer runs when the user
  // clicks Analyze (user, 2026-10-14), for the window shown then. Another
  // window waits for another click.
  const winKey = planWin.map((p) => p.pullId).join(",");
  const [analyzeKey, setAnalyzeKey] = useState<string | null>(null);
  useEffect(() => { if (open) setAnalyzeKey(null); }, [open]);
  const planWanted = open && view === "analysis" && planWin.length > 0 && analyzeKey === winKey;
  useEffect(() => {
    if (!planWanted) return;
    const window = planWin;
    const allHits = perPull.map((p) => p.hits);
    const id = ++requestId.current;
    setPlanResult((r) => ({ ...r, pending: true }));
    if (typeof Worker === "undefined") {
      setPlanResult({ plan: buildMitigationPlan(window, allHits, FFXIV_MITIGATION, reach), pending: false });
      return;
    }
    if (!worker.current) {
      worker.current = new Worker(new URL("../lib/mitigation/plan.worker.ts", import.meta.url));
      worker.current.onmessage = (e: MessageEvent<PlanReply>) => {
        if (e.data.id !== requestId.current) return;
        setPlanResult({ plan: e.data.plan ?? null, pending: false, error: e.data.error });
      };
    }
    const request: PlanRequest = { id, window, allHits, reach };
    worker.current.postMessage(request);
  }, [planWanted, planWin, perPull, reach]);
  // The Tanking view (components/MitigationTanking.tsx): each pull's tank
  // streams and busters, only while that view is open; its changes are
  // searched over the window of pulls with the latest tank jobs, in a
  // worker like the Analysis.
  const tankingWanted = open && view === "tanking";
  const tankingPerPull = useMemo(() => {
    if (!tankingWanted) return [];
    const byId = new Map(analyzable.map((p) => [p.id, p]));
    return perPull.map((p) => {
      const pull = byId.get(p.pullId)!;
      return { ...p, pull, tanking: analyzePullTanking(pull, p.hits, FFXIV_MITIGATION) };
    });
  }, [tankingWanted, perPull, analyzable]);
  const tankWin = useMemo(() => tankWindow(tankingPerPull, windowSize), [tankingPerPull, windowSize]);
  const [tankResult, setTankResult] = useState<{ plan: TankingPlan | null; pending: boolean; error?: string }>({ plan: null, pending: false });
  const tankWorker = useRef<Worker | null>(null);
  const tankRequestId = useRef(0);
  useEffect(() => {
    if (!tankingWanted || !allPulls || !tankWin.length) {
      setTankResult({ plan: null, pending: false });
      return;
    }
    const id = ++tankRequestId.current;
    setTankResult((r) => ({ ...r, pending: true }));
    if (typeof Worker === "undefined") {
      setTankResult({ plan: buildTankingPlan(tankWin, FFXIV_MITIGATION), pending: false });
      return;
    }
    if (!tankWorker.current) {
      tankWorker.current = new Worker(new URL("../lib/mitigation/tanking.worker.ts", import.meta.url));
      tankWorker.current.onmessage = (e: MessageEvent<TankingReply>) => {
        if (e.data.id !== tankRequestId.current) return;
        setTankResult({ plan: e.data.plan ?? null, pending: false, error: e.data.error });
      };
    }
    const request: TankingRequest = { id, window: tankWin };
    tankWorker.current.postMessage(request);
  }, [tankingWanted, allPulls, tankWin]);
  const tankShown = useMemo(() => {
    if (!tankingWanted) return undefined;
    if (!allPulls) return tankingPerPull.find((p) => p.pullId === selectedPull?.id);
    return clockPull(tankWin.length ? tankWin : tankingPerPull);
  }, [tankingWanted, allPulls, tankingPerPull, tankWin, selectedPull]);
  const tankPulls = useMemo(() => (allPulls ? (tankWin.length ? tankWin : tankingPerPull) : tankShown ? [tankShown] : []),
    [allPulls, tankWin, tankingPerPull, tankShown]);
  const tankChips = useMemo(() => (allPulls
    ? chipsFromAggregate(aggregateBusters(tankPulls))
    : chipsFromPull(tankShown?.tanking.busters ?? [])), [allPulls, tankPulls, tankShown]);
  const tankUnused = useMemo(() => summarizeUnused(tankPulls.map((p) => p.tanking)), [tankPulls]);

  // The workers go with the dialog.
  useEffect(() => {
    if (open) return;
    worker.current?.terminate();
    worker.current = null;
    setPlanResult({ plan: null, pending: false });
    tankWorker.current?.terminate();
    tankWorker.current = null;
  }, [open]);

  const groups = useMemo(() => buildPlayerGroups(allPulls ? analyzable : selectedPull ? [selectedPull] : []),
    [allPulls, analyzable, selectedPull]);
  const focusGroup = groups.find((g) => g.player === focus);
  const shownFocus = focusGroup ? focus : null;
  // A picked player shows only their columns, personal ones open.
  const shownGroups = focusGroup ? [focusGroup] : groups;
  const shownExpanded = focusGroup ? new Set([...expanded, focusGroup.player]) : expanded;
  // The Tanking view's picker holds only the tanks: another pick shows both.
  const tankFocus = focusGroup && ["Paladin", "Warrior", "Dark Knight", "Gunbreaker"].includes(focusGroup.job) ? focusGroup.player : null;

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
      // Fixed for the Analysis, so its list and timeline scroll on their own.
      height={ffPulls.length > 0 && view === "analysis" ? "88vh" : undefined}
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
              <button className={`ck-tab ck-tab--sm${view === "tanking" ? " ck-tab--active" : ""}`} onClick={() => setViewPick("tanking")}>Tanking</button>
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
            {view === "analysis" && planWin.length > 0 && (
              <AnalysisWindowControls window={planWin} allPulls={allPulls} windowInput={windowInput} onWindowInput={setWindowInput}
                groupPulls={perPull.length} />
            )}
            {groups.length > 0 && view === "timeline" && <PlayerPicker groups={groups} focus={shownFocus} onPick={setFocus} />}
            {groups.length > 0 && view === "tanking" && <PlayerPicker groups={groups} focus={tankFocus} onPick={setFocus} tanksOnly />}
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
              {view === "tanking" ? (
                analyzable.length === 0 || (!allPulls && selectedStale)
                  ? <p className="ck-dialog-text" style={{ padding: 12 }}>No loaded pull has mitigation data yet. Re-fetch the report to analyze it.</p>
                  : <TankingView plan={tankResult.plan} pending={tankResult.pending} error={tankResult.error}
                      shown={tankShown} chips={tankChips} unused={tankUnused} focus={tankFocus} allPulls={allPulls}
                      shownLabel={tankShown ? `Clock: pull ${tankShown.pullNumber}${allPulls ? ` (${fmtTime(tankShown.durationMs)}, the window's furthest)` : ""}` : ""}
                      windowInput={windowInput} onWindowInput={setWindowInput} groupPulls={perPull.length} windowPulls={tankWin.length}
                      onOpenBuster={(id) => {
                        const row = aggregate.find((r) => r.id === id);
                        if (row && rowUneventful(row)) setShowUneventful(true);
                        if (row?.rare) setShowRare(true);
                        if (!allPulls && selectedHits?.some((h) => h.id === id && uneventful(h))) setShowUneventful(true);
                        setViewPick("timeline");
                        setSelectedHitId(id);
                      }} />
              ) : view === "analysis" ? (
                selectedStale ? (
                  <p className="ck-dialog-text" style={{ padding: 12 }}>
                    This pull was fetched before mitigation data was kept. Re-fetch the report to analyze it.
                  </p>
                ) : planWin.length === 0 ? (
                  <p className="ck-dialog-text" style={{ padding: 12 }}>No loaded pull has mitigation data yet. Re-fetch the report to analyze it.</p>
                ) : <PlanView plan={planResult.plan} pending={planResult.pending && analyzeKey === winKey} error={planResult.error}
                      window={planWin} reach={reach} onAnalyze={() => setAnalyzeKey(winKey)}
                      onOpenHit={(id) => {
                        const row = aggregate.find((r) => r.id === id);
                        if (row && rowUneventful(row)) setShowUneventful(true);
                        if (row?.rare) setShowRare(true);
                        if (!allPulls && selectedHits?.some((h) => h.id === id && uneventful(h))) setShowUneventful(true);
                        setViewPick("timeline");
                        setSelectedHitId(id);
                      }} />
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
                  selectedId={selectedHitId} onSelect={setSelectedHitId}
                  onSeek={onSeek && selectedPull ? (ms) => onSeek(selectedPull.id, ms) : undefined} />
              ) : (
                <p className="ck-dialog-text" style={{ padding: 12 }}>
                  {selectedHits?.length ? "Every hit in this pull was uneventful." : "No raidwide hits in this pull."}
                </p>
              )}
            </div>
            {view === "timeline" && detailRow && <AggregateDetails row={detailRow} reach={reach} onClose={closeDetails} />}
            {view === "timeline" && detailHit && <HitDetails hit={detailHit} reach={reach} onClose={closeDetails} />}
          </div>
        </>
      )}
    </Dialog>
  );
}
