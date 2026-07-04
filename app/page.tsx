"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Header from "../components/Header";
import AddVodDialog from "../components/AddVodDialog";
import ReportDialog from "../components/ReportDialog";
import SessionFoundDialog from "@/components/SessionFoundDialog";
import { parseYouTubeUrl } from "../lib/youtube";
import type { Vod } from "../types/Vod";
import VideoPanel from "../components/VideoPanel";
import VODSidebar from "../components/VODSidebar";
import AnalysisPanel from "../components/AnalysisPanel";
import RosterPanel from "../components/RosterPanel";
import TimelinePanel from "@/components/TimelinePanel";
import type { Pull } from "../types/Pull";
import { createCallWipeError, CALL_WIPE_RULE_ID } from "@/types/PullError";
import type { SavedSession } from "@/types/Session";
import useTimelineController from "@/hooks/useTimelineController";
import { loginWithWarcraftLogs } from "@/lib/wcl-auth";
import { loginWithFFLogs } from "@/lib/ffl-auth";
import { fetchReport, fetchFightData } from "@/lib/wcl-client";
import { transformReportToPulls, buildAbilityMap as buildWCLAbilityMap } from "@/lib/wcl-transforms";
import { fetchFFReport, fetchFFightData } from "@/lib/ffl-client";
import { transformFFReportToPulls, buildAbilityMap as buildFFLAbilityMap } from "@/lib/ffl-transforms";
import { parseLogUrl } from "@/lib/log-url";
import {
  lookupSessionForLog,
  fetchSession,
  createSession,
  updateSession,
  type SessionLookupMatch,
} from "@/lib/session-client";
import { buildWipeCallsMap, applyPendingWipeCalls } from "@/lib/session-helpers";

// ─── Concurrency-limited fetch helper ─────────────────────────────────────────
//
// Fights used to be fetched one at a time in a sequential for-loop, which is
// the main reason large reports felt slow to import — each fight's ~7 event
// queries (with their own pagination) had to fully finish before the next
// fight's queries even started. Fetching multiple fights at once fixes that,
// but WCL/FFLogs both enforce an hourly API "points" budget on their GraphQL
// APIs, so firing off every fight at once risks 429s on big reports. This caps
// how many fights are in flight at a time as a middle ground — raise/lower
// FIGHT_FETCH_CONCURRENCY if you find it's still slow or start hitting rate
// limit errors.

const FIGHT_FETCH_CONCURRENCY = 3;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await fn(items[current], current);
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [vods, setVods] = useState<Vod[]>([]);
  const [selectedVodId, setSelectedVodId] = useState<number | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const [pulls, setPulls] = useState<Pull[]>([]);
  const [selectedPullId, setSelectedPullId] = useState<number | null>(null);

  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [loadedReportCode, setLoadedReportCode] = useState<string | null>(null);

  // ── Session save/load ──────────────────────────────────────────────────────
  //
  // A "session" is just the log URL + VODs (with calibration offsets) +
  // any manually-called wipes, saved server-side under a short id that
  // gets stamped onto the URL as ?session=<id> the first time anything
  // savable happens. Loading that URL later re-populates all three
  // without auto-importing the log — the user still has to hit Import.

  const [importInput, setImportInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionReportUrl, setSessionReportUrl] = useState("");
  const [duplicateMatch, setDuplicateMatch] = useState<SessionLookupMatch | null>(null);
  const [pendingRawInput, setPendingRawInput] = useState<string | null>(null);

  // Refs mirror the state above so the debounced persistSession() call
  // below always reads current values, even when called synchronously
  // right after a setState (before the closure over state would update).
  const sessionIdRef = useRef<string | null>(null);
  const vodsRef = useRef<Vod[]>(vods);
  const pullsRef = useRef<Pull[]>(pulls);
  const sessionReportUrlRef = useRef(sessionReportUrl);
  const pendingWipeCallsRef = useRef<Record<number, number>>({});
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { vodsRef.current = vods; }, [vods]);
  useEffect(() => { pullsRef.current = pulls; }, [pulls]);
  useEffect(() => { sessionReportUrlRef.current = sessionReportUrl; }, [sessionReportUrl]);

  const selectedVod = vods.find(v => v.id === selectedVodId) ?? null;
  const activePull  = pulls.find(p => p.id === selectedPullId) ?? null;

  const handlePullDetected = useCallback((pullId: number) => {
    setSelectedPullId(pullId);
  }, []);

  const timeline = useTimelineController({
    vod:            selectedVod,
    pull:           activePull,
    pulls,
    onPullDetected: handlePullDetected,
  });

  const handleVideoTimeUpdate = useCallback((rawTime: number) => {
    timeline.updateFromVideo(rawTime);
    timeline.updateRawVideoTime(rawTime);
  }, [timeline.updateFromVideo, timeline.updateRawVideoTime]);

  const handleSeekToMs = useCallback((ms: number) => {
    if (!activePull || !selectedVod) return;
    timeline.seekToPullStart(ms / 1000);
  }, [activePull, selectedVod, timeline]);

  // Debounced session save. Lazily creates a session (and stamps
  // ?session=<id> onto the URL) the first time anything savable exists;
  // every subsequent call overwrites that same session. Safe to call
  // right after any setVods/setPulls/setSessionReportUrl — it reads from
  // refs, not from state closed over at render time.
  const persistSession = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      const payload: Omit<SavedSession, "createdAt"> = {
        reportUrl: sessionReportUrlRef.current ?? "",
        vods: vodsRef.current.map(v => ({
          player: v.player,
          url:    v.url,
          offset: v.isCalibrated ? v.offset : undefined,
        })),
        wipeCalls: buildWipeCallsMap(pullsRef.current),
      };

      // Nothing worth saving yet — don't create an empty session.
      if (!payload.reportUrl && payload.vods.length === 0) return;

      try {
        if (sessionIdRef.current) {
          await updateSession(sessionIdRef.current, payload);
        } else {
          const id = await createSession(payload);
          sessionIdRef.current = id;
          setSessionId(id);

          const url = new URL(window.location.href);
          url.searchParams.set("session", id);
          window.history.replaceState({}, "", url.toString());
        }
      } catch (err) {
        console.error("Failed to save session:", err);
      }
    }, 400);
  }, []);

  // Restore a saved session from ?session=<id> on first load. Pre-fills
  // the import box (does NOT auto-import) and restores VODs with their
  // calibration already applied. Wipe calls are stashed in a ref and
  // reattached once the log is actually imported and pulls exist.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("session");
    if (!id) return;

    (async () => {
      const session = await fetchSession(id);
      if (!session) return;

      sessionIdRef.current = id;
      setSessionId(id);
      setSessionReportUrl(session.reportUrl);
      setImportInput(session.reportUrl);
      pendingWipeCallsRef.current = session.wipeCalls ?? {};

      const restoredVods: Vod[] = session.vods.map((v, i) => {
        const parsedYt = parseYouTubeUrl(v.url);
        return {
          id:           Date.now() + i,
          player:       v.player,
          url:          v.url,
          videoId:      parsedYt?.videoId ?? "",
          embedUrl:     parsedYt?.embedUrl ?? "",
          class:        "Unknown",
          role:         "DPS",
          raid:         "Unknown Raid",
          boss:         "Unknown Boss",
          difficulty:   "Unknown",
          uploadedBy:   "local-user",
          offset:       v.offset,
          isCalibrated: v.offset !== undefined,
        };
      });

      if (restoredVods.length > 0) {
        setVods(restoredVods);
        setSelectedVodId(restoredVods[0].id);
      }
    })();
    // Runs once on mount only — intentionally omits deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Call Wipe" — appends a manually-created Raid error (see
  // types/PullError.ts createCallWipeError) to the given pull at the given
  // timestamp (the current playback time, passed up from AnalysisPanel).
  // Per product decision this is independent of any auto-detected Raid
  // errors already on the pull — it only no-ops if a Call Wipe error has
  // already been added once.
  const handleCallWipe = useCallback((pullId: number, timestampMs: number) => {
    setPulls(prev =>
      prev.map(p => {
        if (p.id !== pullId) return p;
        if (p.errors.some(e => e.ruleId === CALL_WIPE_RULE_ID)) return p;

        const updatedErrors = [...p.errors, createCallWipeError(timestampMs)]
          .sort((a, b) => a.timestamp - b.timestamp);

        return { ...p, errors: updatedErrors };
      })
    );
    persistSession();
  }, [persistSession]);

  function handleAddVod(player: string, url: string) {
    const parsed = parseYouTubeUrl(url);
    if (!parsed) {
      alert("Invalid YouTube URL");
      return;
    }

    const newVod: Vod = {
      id:         Date.now(),
      player,
      url,
      videoId:    parsed.videoId,
      embedUrl:   parsed.embedUrl,
      class:      "Unknown",
      role:       "DPS",
      raid:       "Unknown Raid",
      boss:       "Unknown Boss",
      difficulty: "Unknown",
      uploadedBy: "local-user",
    };

    setVods(prev => [...prev, newVod]);
    setSelectedVodId(newVod.id);
    setShowDialog(false);
    persistSession();
  }

  function syncToPull() {
    if (!selectedVod || !activePull || timeline.rawVideoTime === null) return;
    const offset = timeline.calibrate(timeline.rawVideoTime, activePull);
    setVods(prev =>
      prev.map(v =>
        v.id === selectedVod.id
          ? { ...v, offset, isCalibrated: true }
          : v
      )
    );
    persistSession();
  }

  // ── WarcraftLogs import ────────────────────────────────────────────────────

  async function handleImportWCL(reportCode: string) {
    const report = await fetchReport(reportCode);

    // Extra safety net beyond killType: Encounters — drop any fight with a
    // degenerate/zero duration rather than showing it as a pull (#7).
    const validFights = report.fights.filter(f => f.endTime > f.startTime);

    setImportProgress(10);
    setImportStatus(`Loading ${validFights.length} fight${validFights.length === 1 ? "" : "s"}…`);

    // Every ability used anywhere in the report, keyed by gameID — resolves
    // ability names (including death causes) without a hand-maintained table.
    const abilityMap = buildWCLAbilityMap(report.masterData.abilities);

    const totalFights = Math.max(validFights.length, 1);
    let completedFights = 0;

    const fightDataList = await mapWithConcurrency(
      validFights,
      FIGHT_FETCH_CONCURRENCY,
      async (fight) => {
        const fightData = await fetchFightData(reportCode, fight, report.masterData.actors);
        completedFights += 1;
        const progress = Math.round(10 + (completedFights / totalFights) * 85);
        setImportProgress(progress);
        setImportStatus(`Loaded ${completedFights}/${validFights.length} fights…`);
        return fightData;
      }
    );

    let newPulls = transformReportToPulls(fightDataList, abilityMap, report.code);

    // Reattach any wipe calls carried over from a loaded/matched session —
    // pulls are always rebuilt fresh here, so this has to happen post-hoc.
    newPulls = applyPendingWipeCalls(newPulls, pendingWipeCallsRef.current);
    pendingWipeCallsRef.current = {};

    setPulls(newPulls);
    setSelectedPullId(null);
    setLoadedReportCode(report.code);
    setImportStatus(`Log Loaded: ${report.code}`);
    setImportProgress(100);
    persistSession();
  }

  // ── FFLogs import ──────────────────────────────────────────────────────────

  async function handleImportFFL(reportCode: string) {
    const report = await fetchFFReport(reportCode);

    const validFights = report.fights.filter(f => f.endTime > f.startTime);

    setImportProgress(10);
    setImportStatus(`Loading ${validFights.length} fight${validFights.length === 1 ? "" : "s"}…`);

    // Every ability used anywhere in the report, keyed by gameID — resolves
    // ability names (including death causes) without falling back to "Ability {id}".
    const abilityMap = buildFFLAbilityMap(report.masterData.abilities);

    const totalFights = Math.max(validFights.length, 1);
    let completedFights = 0;

    const fightDataList = await mapWithConcurrency(
      validFights,
      FIGHT_FETCH_CONCURRENCY,
      async (fight) => {
        const fightData = await fetchFFightData(reportCode, fight, report.masterData.actors);
        completedFights += 1;
        const progress = Math.round(10 + (completedFights / totalFights) * 85);
        setImportProgress(progress);
        setImportStatus(`Loaded ${completedFights}/${validFights.length} fights…`);
        return fightData;
      }
    );

    let newPulls = transformFFReportToPulls(fightDataList, abilityMap, report.code);

    newPulls = applyPendingWipeCalls(newPulls, pendingWipeCallsRef.current);
    pendingWipeCallsRef.current = {};

    setPulls(newPulls);
    setSelectedPullId(null);
    setLoadedReportCode(report.code);
    setImportStatus(`Log Loaded: ${report.code}`);
    setImportProgress(100);
    persistSession();
  }

  // ── Unified import dispatcher ──────────────────────────────────────────────

  async function handleImportReport(rawInput: string, options?: { skipDuplicateCheck?: boolean }) {
    const parsed = parseLogUrl(rawInput);

    if (!parsed) {
      setImportError(
        "Please paste a full WarcraftLogs or FFLogs report URL " +
        "(e.g. https://www.warcraftlogs.com/reports/… or https://www.fflogs.com/reports/…)"
      );
      return;
    }

    // If a saved session already exists for this exact log — and it isn't
    // the one we're already working from — offer to load it instead of
    // silently spinning up a second session for the same report.
    if (!options?.skipDuplicateCheck) {
      const match = await lookupSessionForLog(parsed.source, parsed.code);
      if (match && match.id !== sessionIdRef.current) {
        setDuplicateMatch(match);
        setPendingRawInput(rawInput);
        return;
      }
    }

    setImporting(true);
    setImportError(null);
    setImportProgress(0);
    setImportStatus("Fetching report information…");
    setSessionReportUrl(rawInput);

    try {
      if (parsed.source === "wcl") {
        await handleImportWCL(parsed.code);
      } else {
        await handleImportFFL(parsed.code);
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
      setImportStatus(null);
      setLoadedReportCode(null);
    } finally {
      setImporting(false);
    }
  }

  // ── "A session was found for this log" dialog ───────────────────────────────

  async function handleLoadFoundSession() {
    const match = duplicateMatch;
    const rawInput = pendingRawInput;
    setDuplicateMatch(null);
    setPendingRawInput(null);

    if (!match || !rawInput) return;

    const session = await fetchSession(match.id);
    if (!session) {
      // Fetch failed for some reason — don't block the user, just import fresh.
      handleImportReport(rawInput, { skipDuplicateCheck: true });
      return;
    }

    sessionIdRef.current = match.id;
    setSessionId(match.id);
    setSessionReportUrl(session.reportUrl);
    pendingWipeCallsRef.current = session.wipeCalls ?? {};

    const restoredVods: Vod[] = session.vods.map((v, i) => {
      const parsedYt = parseYouTubeUrl(v.url);
      return {
        id:           Date.now() + i,
        player:       v.player,
        url:          v.url,
        videoId:      parsedYt?.videoId ?? "",
        embedUrl:     parsedYt?.embedUrl ?? "",
        class:        "Unknown",
        role:         "DPS",
        raid:         "Unknown Raid",
        boss:         "Unknown Boss",
        difficulty:   "Unknown",
        uploadedBy:   "local-user",
        offset:       v.offset,
        isCalibrated: v.offset !== undefined,
      };
    });

    if (restoredVods.length > 0) {
      setVods(restoredVods);
      setSelectedVodId(restoredVods[0].id);
    }

    const url = new URL(window.location.href);
    url.searchParams.set("session", match.id);
    window.history.replaceState({}, "", url.toString());

    handleImportReport(rawInput, { skipDuplicateCheck: true });
  }

  function handleImportFreshInstead() {
    const rawInput = pendingRawInput;
    setDuplicateMatch(null);
    setPendingRawInput(null);
    if (rawInput) handleImportReport(rawInput, { skipDuplicateCheck: true });
  }

  const isCalibrated = selectedVod?.isCalibrated ?? false;

  const videoBottom = isCalibrated ? (
    <TimelinePanel
      currentTime={timeline.currentTime}
      duration={timeline.pullDuration}
      onSeek={timeline.seekWithinPull}
    />
  ) : (
    <SyncToPullButton
      hasVod={!!selectedVod}
      hasPull={!!activePull}
      rawVideoTime={timeline.rawVideoTime}
      onSync={syncToPull}
    />
  );

  return (
    <div
      style={{
        height:          "100vh",
        display:         "flex",
        flexDirection:   "column",
        backgroundColor: "#121212",
        color:           "white",
      }}
    >
      <Header
        onAddVod={() => setShowDialog(true)}
        onConnectWCL={loginWithWarcraftLogs}
        onConnectFFL={loginWithFFLogs}
        onOpenReport={() => setShowReport(true)}
      />

      <div
        style={{
          display:         "flex",
          alignItems:      "center",
          gap:             "12px",
          padding:         "6px 16px",
          backgroundColor: "#181818",
          borderBottom:    "1px solid #2a2a2a",
          flexShrink:      0,
        }}
      >
        <WCLImportBar
          value={importInput}
          onChange={setImportInput}
          importing={importing}
          importProgress={importProgress}
          importStatus={importStatus}
          loadedReportCode={loadedReportCode}
          error={importError}
          onImport={handleImportReport}
        />
      </div>

      <div
        style={{
          flex:                1,
          display:             "grid",
          gridTemplateColumns: "1fr 2fr 1fr",
          gap:                 "10px",
          padding:             "10px",
          overflow:            "hidden",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", overflow: "hidden", minHeight: 0 }}>
          <div
            style={{
              // Fixed to fit exactly one column of 5 players (header + 5 rows).
              // Drilling into a player's detail tabs scrolls WITHIN this
              // height instead of expanding the panel.
              flex:          "0 0 auto",
              height:        "300px",
              border:        "1px solid #333",
              overflow:      "hidden",
              display:       "flex",
              flexDirection: "column",
              minHeight:     0,
            }}
          >
            {/*
              #8 — keying on selectedPullId forces RosterPanel to remount
              (and therefore reset its internal "selected player" state)
              any time the user picks a different pull. Without this, the
              player-detail view stayed open across pull changes showing
              stale event data from the previous pull's timeline.
            */}
            <RosterPanel
              key={selectedPullId ?? "none"}
              players={activePull?.players ?? []}
              playbackTimeMs={timeline.playbackTimeMs}
            />
          </div>

          <div
            style={{
              flex:          "1 1 0",
              border:        "1px solid #333",
              overflow:      "hidden",
              display:       "flex",
              flexDirection: "column",
              minHeight:     0,
            }}
          >
            <AnalysisPanel
              pull={activePull}
              playbackTimeMs={timeline.playbackTimeMs}
              onSeekToTime={isCalibrated ? handleSeekToMs : undefined}
              onCallWipe={handleCallWipe}
            />
          </div>
        </div>

        <div
          style={{
            border:        "1px solid #333",
            padding:       "10px",
            overflow:      "hidden",
            display:       "flex",
            flexDirection: "column",
            minHeight:     0,
          }}
        >
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ flex: 1, minHeight: 0 }}>
              <VideoPanel
                vod={selectedVod}
                seekRequest={timeline.seekRequest}
                onCurrentTimeChange={handleVideoTimeUpdate}
              />
            </div>
            <div style={{ flexShrink: 0 }}>
              {videoBottom}
            </div>
          </div>
        </div>

        <VODSidebar
          pulls={pulls}
          selectedPullId={selectedPullId}
          onSelectPull={setSelectedPullId}
          vods={vods}
          selectedVodId={selectedVodId}
          onSelectVod={setSelectedVodId}
        />
      </div>

      <AddVodDialog
        open={showDialog}
        onCancel={() => setShowDialog(false)}
        onAdd={handleAddVod}
      />

      <ReportDialog
        open={showReport}
        onClose={() => setShowReport(false)}
        pulls={pulls}
      />

      <SessionFoundDialog
        open={duplicateMatch !== null}
        vodCount={duplicateMatch?.vodCount ?? 0}
        wipeCount={duplicateMatch?.wipeCount ?? 0}
        onLoad={handleLoadFoundSession}
        onImportFresh={handleImportFreshInstead}
      />
    </div>
  );
}

// ─── SyncToPullButton ─────────────────────────────────────────────────────────

function SyncToPullButton({
  hasVod,
  hasPull,
  rawVideoTime,
  onSync,
}: {
  hasVod:       boolean;
  hasPull:      boolean;
  rawVideoTime: number | null;
  onSync:       () => void;
}) {
  const ready = hasVod && hasPull && rawVideoTime !== null;

  function formatTime(s: number) {
    const m   = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  return (
    <div
      style={{
        padding:        "10px",
        background:     "#181818",
        borderTop:      "1px solid #333",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        gap:            "12px",
      }}
    >
      <div style={{ fontSize: "12px", color: "#555", lineHeight: "1.4" }}>
        {!hasVod && "Add a VOD to begin."}
        {hasVod && !hasPull && "Select a pull to sync."}
        {hasVod && hasPull && rawVideoTime !== null && (
          <>
            <span style={{ color: "#888" }}>Video at </span>
            <span style={{ color: "#94a3b8", fontFamily: "monospace" }}>
              {formatTime(rawVideoTime)}
            </span>
            <span style={{ color: "#555" }}> — seek to the pull start, then sync.</span>
          </>
        )}
      </div>

      <button
        onClick={onSync}
        disabled={!ready}
        style={{
          backgroundColor: ready ? "#1e3a5f" : "#111",
          color:           ready ? "#60a5fa" : "#444",
          border:          `1px solid ${ready ? "#2563eb" : "#2a2a2a"}`,
          borderRadius:    "6px",
          padding:         "6px 16px",
          fontSize:        "12px",
          fontWeight:      600,
          cursor:          ready ? "pointer" : "default",
          whiteSpace:      "nowrap",
          flexShrink:      0,
        }}
      >
        Sync to Pull
      </button>
    </div>
  );
}

// ─── WCLImportBar (now handles both WCL and FFLogs) ───────────────────────────
//
// Now a controlled component — `value`/`onChange` are lifted to page.tsx so
// a restored session (?session=<id>) can pre-fill the text box without
// auto-submitting it.

function WCLImportBar({
  value,
  onChange,
  importing,
  importProgress,
  importStatus,
  loadedReportCode,
  error,
  onImport,
}: {
  value:            string;
  onChange:         (v: string) => void;
  importing:        boolean;
  importProgress:   number;
  importStatus:     string | null;
  loadedReportCode: string | null;
  error:            string | null;
  onImport:         (url: string) => void;
}) {
  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed) return;
    onImport(trimmed);
  }

  // #7 — "Import Another" was removed. Once a report is loaded, this bar
  // just shows the loaded-state badge; there's no in-place reset flow to
  // maintain/support.
  if (loadedReportCode && !importing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
        <span
          style={{
            padding:         "6px 12px",
            borderRadius:    "999px",
            backgroundColor: "#1e293b",
            color:           "#93c5fd",
            fontSize:        "12px",
            fontWeight:      600,
          }}
        >
          Log Loaded: {loadedReportCode}
        </span>
        <span style={{ fontSize: "11px", color: "#94a3b8" }}>Ready for review</span>
      </div>
    );
  }

  if (importing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
        <div style={{ width: "10px", height: "10px", borderRadius: "999px", backgroundColor: "#38bdf8", boxShadow: "0 0 0 4px rgba(56,189,248,0.2)" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#e2e8f0" }}>Importing report</span>
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>{Math.max(4, importProgress)}%</span>
          </div>
          <div style={{ height: "8px", borderRadius: "999px", backgroundColor: "#1f2937", overflow: "hidden" }}>
            <div
              style={{
                width:        `${Math.max(4, importProgress)}%`,
                height:       "100%",
                background:   "linear-gradient(90deg, #38bdf8, #2563eb)",
                borderRadius: "999px",
                transition:   "width 0.2s ease",
              }}
            />
          </div>
          <div style={{ marginTop: "4px", fontSize: "11px", color: "#94a3b8" }}>
            {importStatus ?? "Preparing import…"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleSubmit()}
        placeholder="Paste a WarcraftLogs or FFLogs report URL…"
        style={{
          flex:            1,
          maxWidth:        "480px",
          padding:         "6px 10px",
          backgroundColor: "#111",
          border:          "1px solid #333",
          borderRadius:    "6px",
          color:           "#ccc",
          fontSize:        "12px",
          outline:         "none",
        }}
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim()}
        style={{
          backgroundColor: "#2563eb",
          color:           "white",
          border:          "none",
          borderRadius:    "6px",
          padding:         "6px 14px",
          fontSize:        "12px",
          fontWeight:      600,
          cursor:          value.trim() ? "pointer" : "default",
          opacity:         value.trim() ? 1 : 0.7,
        }}
      >
        Import
      </button>
      {error && (
        <span style={{ fontSize: "11px", color: "#f87171", maxWidth: "320px" }}>
          {error}
        </span>
      )}
    </div>
  );
}