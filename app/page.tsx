"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import Header from "../components/Header";
import AddVodDialog, { type AddVodSource } from "../components/AddVodDialog";
import ReportDialog from "../components/ReportDialog";
import SessionFoundDialog from "@/components/SessionFoundDialog";
import SampleDataFoundDialog from "@/components/SampleDataFoundDialog";
import LoginDialog from "@/components/LoginDialog";
import LogApiSetupDialog, { type LogProvider } from "@/components/LogApiSetupDialog";
import AddReviewToStaticDialog from "@/components/AddReviewToStaticDialog";
import ManageStaticsDialog from "@/components/ManageStaticsDialog";
import { parseYouTubeUrl, parseLogUrl } from "@/lib/url-parsers";
import { isLocalVod, type Vod } from "../types/Vod";
import { loadLocalVodOffset, saveLocalVodOffset, clearLocalVodOffset } from "@/lib/local-vod-sync";
import VideoPanel from "../components/VideoPanel";
import VODSidebar from "../components/VODSidebar";
import { Panel } from "../components/ui/Panel";
import TranscriptDialog from "../components/TranscriptDialog";
import AnalysisPanel from "../components/AnalysisPanel";
import RosterPanel from "../components/RosterPanel";
import TimelinePanel from "@/components/TimelinePanel";
import StrategyDialog from "@/components/StrategyDialog";
import MitigationDialog from "@/components/MitigationDialog";
import DamageDialog from "@/components/DamageDialog";
import { detectTerminateKickOrder } from "@/lib/mechanics/wow/vs-dr-mqd/terminate-kicks";
import { detectCrystalAssignments } from "@/lib/mechanics/wow/vs-dr-mqd/crystal-assignments";
import {
  detectBlackHoleStrategy,
  detectMissedAssignedTetherErrors,
  detectClippedByNeighborTetherErrors,
  detectIncorrectBlackHoleDirectionErrors,
  type BlackHoleStrategyId,
} from "@/lib/mechanics/ffxiv/dancingmad/blackhole-strategy";
import { learnGravenImageLayout, detectGravenImageSpreadErrors, detectGravenImageStackErrors } from "@/lib/mechanics/ffxiv/dancingmad/graven-image";
import { learnWaveCannonLayout, detectWaveCannonPositionErrors } from "@/lib/mechanics/ffxiv/dancingmad/wave-cannon";
import { applyFallback, buildFallbackProfiles } from "@/lib/mechanics/fallback";
import type { Pull } from "../types/Pull";
import { createCallWipeError, CALL_WIPE_RULE_ID, createManualError, type ManualErrorInput } from "@/types/PullError";
import type { SavedSession } from "@/types/Session";
import useTimelineController from "@/hooks/useTimelineController";
import { fetchReport, fetchFightData, buildFightLogLabels, getWCLRateLimitStatus, isWCLQuotaExhausted, type WCLReport } from "@/lib/wcl-client";
import {
  transformReportToPulls,
  transformFFReportToPulls,
  transformFightToPull,
  transformFFightToPull,
  buildWCLAbilityMap,
  buildFFLAbilityMap,
  renumberPullsByBoss,
} from "@/lib/log-transforms";
import { fetchFFReport, fetchFFightData, buildFFFightLogLabels, getFFLRateLimitStatus, isFFLQuotaExhausted, type FFLReport } from "@/lib/ffl-client";
import { formatWaitTime, type RateLimitStatus } from "@/lib/rate-limit";
import { tryFetchSampleReportMeta, fetchSampleReport, type SampleReportMeta, type SampleReportPayload } from "@/lib/sample-report-client";
import {
  lookupSessionForLog,
  fetchSession,
  createSession,
  updateSession,
  buildWipeCallsMap,
  applyPendingWipeCalls,
  buildManualErrorsMap,
  applyPendingManualErrors,
  type SessionLookupMatch,
} from "../lib/session";
import type { SavedManualError } from "@/types/Session";

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

// How often to re-check a "live" report for newly-appeared fights while
// live log mode is on. Each check costs one report/fights query plus, only
// when new fights actually exist, one fetchFightData per new fight — modest
// against the hourly points quota, and isWCLQuotaExhausted()/
// isFFLQuotaExhausted() skip the cycle entirely if the quota is already spent.
const LIVE_POLL_INTERVAL_MS = 30_000;

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

// The ONE place VODs are chosen for sending to the server (persistSession's
// app/api/sessions payload). Local-file VODs are dropped: they exist only
// in this tab, and neither the file nor a placeholder entry may reach the
// server (docs/local-vod-plan.md). Anything new that sends VODs anywhere
// must go through this too.
function serverSavableVods(vods: Vod[]): Vod[] {
  return vods.filter(v => !isLocalVod(v));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [vods, setVods] = useState<Vod[]>([]);
  const [selectedVodId, setSelectedVodId] = useState<number | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [transcriptVodId, setTranscriptVodId] = useState<number | null>(null);

  const [pulls, setPulls] = useState<Pull[]>([]);
  const [showStrategy, setShowStrategy] = useState(false);
  const [showMitigation, setShowMitigation] = useState(false);
  const [showDamage, setShowDamage] = useState(false);
  // Report-level strategy detection (the Midnight Falls Terminate kick
  // rotation and Dawn Crystal carry assignments) — recomputed whenever the
  // pull set changes, e.g. live-log polling appending new fights.
  const kickStrategy = useMemo(() => detectTerminateKickOrder(pulls), [pulls]);
  const crystalStrategy = useMemo(() => detectCrystalAssignments(pulls), [pulls]);

  // Black Hole tether strategy (DSA/SDA/Double Tether) — auto-detected from
  // whichever moments each named player actually gets hit at across every
  // pull in the report (see blackhole-strategy.ts). `blackHoleOverrideId`
  // lets the user force a shape via the Strategy dialog's selector instead
  // of trusting the auto-detected one; persisted like the mitigation plan.
  const [blackHoleOverrideId, setBlackHoleOverrideId] = useState<BlackHoleStrategyId | null>(null);
  useEffect(() => {
    const stored = localStorage.getItem("blackhole_strategy_id");
    if (stored) setBlackHoleOverrideId(stored as BlackHoleStrategyId);
  }, []);
  function handleBlackHoleOverrideChange(id: BlackHoleStrategyId | null) {
    setBlackHoleOverrideId(id);
    if (id) localStorage.setItem("blackhole_strategy_id", id);
    else localStorage.removeItem("blackhole_strategy_id");
  }
  const blackHoleStrategy = useMemo(
    () => detectBlackHoleStrategy(pulls, blackHoleOverrideId),
    [pulls, blackHoleOverrideId]
  );
  // Graven Image's ideal spread positions are learned fresh from THIS
  // report's own pulls (which job stands where is a raid strategy choice,
  // not a game-mechanic constant — see graven-image.ts's module header),
  // same cross-pull-then-per-pull shape as blackHoleStrategy above.
  const gravenImageLayout = useMemo(() => learnGravenImageLayout(pulls), [pulls]);
  // Wave Cannon's ideal beam spots are learned the same way — see
  // wave-cannon.ts's module header for why a hardcoded table doesn't
  // generalize across raid teams.
  const waveCannonLayout = useMemo(() => learnWaveCannonLayout(pulls), [pulls]);
  // Bosses without an encounter module get the fallback model, which learns
  // each ability's normal targets from the pull itself and the report's
  // earlier pulls of that boss, never later ones (lib/mechanics/fallback.ts).
  const fallbackProfiles = useMemo(() => buildFallbackProfiles(pulls), [pulls]);

  // Pulls with the cross-pull errors merged in: Black Hole "Missed Assigned
  // Tether" (blackhole-strategy.ts), Graven Image, Wave Cannon, and the
  // fallback model on bosses without a module (which also drops the
  // generic Damage Down rule there, since it owns penalties). Unlike
  // the other FF mechanic detections, these depend on state that isn't
  // known from a single pull alone (a strategy or layout resolved from ALL
  // pulls), so they can't be baked into pull.errors at import time the way
  // detectForsakenTowerErrors etc. are (log-transforms.ts) — recomputed
  // here instead, same pattern as kickStrategy/crystalStrategy. Every
  // downstream consumer of `pulls` (AnalysisPanel, PullList, the report
  // dialog, AddReviewToStaticDialog, ...) should read `displayPulls` instead
  // so these errors show up everywhere errors normally do; `pulls` itself
  // and `pullsRef` stay
  // untouched since they're also what gets persisted to the session (wipe
  // calls / manual errors) and re-derived on strategy swap.
  const displayPulls = useMemo(() => {
    return pulls.map((pull) => {
      const p = applyFallback(pull, fallbackProfiles);
      const blackHoleErrors = [
        ...detectMissedAssignedTetherErrors(p, blackHoleStrategy),
        ...detectClippedByNeighborTetherErrors(p, blackHoleStrategy),
        ...detectIncorrectBlackHoleDirectionErrors(p, blackHoleStrategy),
      ];
      const gravenImageErrors = [
        ...detectGravenImageSpreadErrors(p, gravenImageLayout),
        ...detectGravenImageStackErrors(p),
      ];
      const waveCannonErrors = detectWaveCannonPositionErrors(p.players, p.deathEvents, waveCannonLayout);
      const extra = [...blackHoleErrors, ...gravenImageErrors, ...waveCannonErrors];
      return extra.length === 0 ? p : { ...p, errors: [...p.errors, ...extra] };
    });
  }, [pulls, blackHoleStrategy, gravenImageLayout, waveCannonLayout, fallbackProfiles]);
  const [selectedPullId, setSelectedPullId] = useState<number | null>(null);

  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [loadedReportCode, setLoadedReportCode] = useState<string | null>(null);
  // Epoch ms the loaded log started recording (WCL/FFLogs report.startTime).
  // Only used when attaching this session to a static, so the static
  // dashboard can show the night the raid actually happened rather than the
  // day someone got round to adding it — see StaticReview.reportStartedAt.
  // Null for sample-data imports captured before the field was queried.
  const [loadedReportStartedAt, setLoadedReportStartedAt] = useState<number | null>(null);

  // "Live log" — opt-in, off by default. When on, keeps polling the loaded
  // report for newly-appeared fights (see the polling useEffect below) and
  // appends them as new pulls instead of requiring a manual re-import.
  const [liveLogEnabled, setLiveLogEnabled] = useState(false);
  // Most recent live-poll failure (rate limit, revoked token, network, …).
  // Polling previously only console.error'd on failure, so a background
  // poll could fail silently forever with the "Live" indicator still
  // showing green. Cleared on the next successful poll or when live log
  // is toggled off.
  const [liveLogError, setLiveLogError] = useState<string | null>(null);

  function handleLiveLogEnabledChange(enabled: boolean) {
    setLiveLogEnabled(enabled);
    setLiveLogError(null);
  }

  // ── Rate limit display ─────────────────────────────────────────────────────
  //
  // "Points" spent by the most recently completed import specifically
  // (end-of-import snapshot minus the snapshot taken right before that
  // import started), and which provider's tracker to keep polling for the
  // live "resets in" countdown shown next to "Ready for review".
  const [importPointsUsed, setImportPointsUsed] = useState<number | null>(null);
  const [loadedSource, setLoadedSource] = useState<"wcl" | "ffl" | null>(null);
  const [liveRateLimit, setLiveRateLimit] = useState<RateLimitStatus | null>(null);

  // Poll the relevant provider's tracker once a report is loaded so the
  // "resets in Xm Ys" readout counts down in real time rather than freezing
  // at whatever it read the moment the import finished. This is a local
  // recomputation against the last-seen snapshot (see lib/rate-limit.ts) —
  // it does NOT make a network request every second.
  useEffect(() => {
    if (!loadedSource) return;

    const getStatus = loadedSource === "wcl" ? getWCLRateLimitStatus : getFFLRateLimitStatus;
    const initial = getStatus();
    // TEMP DIAGNOSTIC — remove once the missing-display issue is confirmed fixed.
    console.log("[rate-limit debug] polling effect (re)started for", loadedSource, "initial status:", initial);
    setLiveRateLimit(initial);

    const interval = setInterval(() => setLiveRateLimit(getStatus()), 1000);
    return () => clearInterval(interval);
  }, [loadedSource]);

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

  // ── Statics (see components/BurgerMenu.tsx "Statics"/"Account" sections) ──
  const [currentUser, setCurrentUser] = useState<{ username: string; role: string } | null>(null);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [logApiSetup, setLogApiSetup] = useState<LogProvider | null>(null);
  const [showAddReviewToStaticDialog, setShowAddReviewToStaticDialog] = useState(false);
  const [showManageStaticsDialog, setShowManageStaticsDialog] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => setCurrentUser(data.user))
      .catch(() => setCurrentUser(null));
  }, []);

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setCurrentUser(null);
  }, []);
  const [duplicateMatch, setDuplicateMatch] = useState<SessionLookupMatch | null>(null);
  const [pendingRawInput, setPendingRawInput] = useState<string | null>(null);

  // A report already fetched to disk via scripts/fetch-wow-report.js /
  // fetch-ff-report.js (see lib/sample-report-store.ts) — offered as a
  // free alternative to a live re-fetch when found during import. Holds
  // only the lightweight meta (title/fight count), NOT the full payload —
  // that can run into the hundreds of MB, so it's only fetched if the
  // user actually confirms via the dialog (see handleUseSampleData).
  const [sampleDataFound, setSampleDataFound] = useState<{
    source: "wcl" | "ffl"; code: string; rawInput: string; meta: SampleReportMeta;
  } | null>(null);
  // True once the currently-loaded report came from local sample data
  // rather than a live fetch — surfaced in the loaded-state badge so it's
  // never mistaken for a live/current log mid-review.
  const [loadedFromSampleData, setLoadedFromSampleData] = useState(false);

  // Refs mirror the state above so the debounced persistSession() call
  // below always reads current values, even when called synchronously
  // right after a setState (before the closure over state would update).
  const sessionIdRef = useRef<string | null>(null);
  const vodsRef = useRef<Vod[]>(vods);
  const pullsRef = useRef<Pull[]>(pulls);
  const sessionReportUrlRef = useRef(sessionReportUrl);
  const pendingWipeCallsRef = useRef<Record<number, number>>({});
  const pendingManualErrorsRef = useRef<Record<number, SavedManualError[]>>({});
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { vodsRef.current = vods; }, [vods]);

  // Release a local VOD's object URL once it leaves the list (e.g. a session
  // restore replaces the VODs), and all of them when the page unmounts.
  const localVodUrlsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const current = new Set(
      vods.flatMap(v => (v.localFile ? [v.localFile.objectUrl] : []))
    );
    for (const url of localVodUrlsRef.current) {
      if (!current.has(url)) URL.revokeObjectURL(url);
    }
    localVodUrlsRef.current = current;
  }, [vods]);
  useEffect(() => () => {
    for (const url of localVodUrlsRef.current) URL.revokeObjectURL(url);
  }, []);
  useEffect(() => { pullsRef.current = pulls; }, [pulls]);
  useEffect(() => { sessionReportUrlRef.current = sessionReportUrl; }, [sessionReportUrl]);

  const selectedVod = vods.find(v => v.id === selectedVodId) ?? null;
  const activePull  = displayPulls.find(p => p.id === selectedPullId) ?? null;

  const handlePullDetected = useCallback((pullId: number) => {
    setSelectedPullId(pullId);
  }, []);

  const timeline = useTimelineController({
    vod:            selectedVod,
    pull:           activePull,
    pulls:          displayPulls,
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
        vods: serverSavableVods(vodsRef.current).map(v => ({
          player: v.player,
          url:    v.url,
          offset: v.isCalibrated ? v.offset : undefined,
        })),
        wipeCalls:    buildWipeCallsMap(pullsRef.current),
        manualErrors: buildManualErrorsMap(pullsRef.current),
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

  // Importing a DIFFERENT log must start a NEW session. Without this,
  // sessionIdRef stays pointed at the previous report's session and the next
  // persistSession() overwrites that session in place with the new report's
  // url/VODs/wipe calls. That also silently re-points anything keyed on the
  // session id — notably StaticReview, which is unique on
  // (staticId, sessionId): adding a second night's log to a static then hit
  // the "resync" path and wiped the first night's pulls (seen 2026-08-03
  // with J4TnhjdNBtDK6LMx + mhLjAT4vDyJgZcBk).
  const startNewSessionIfDifferentLog = useCallback((rawInput: string) => {
    if (!sessionIdRef.current) return;

    const current = parseLogUrl(sessionReportUrlRef.current ?? "");
    const next    = parseLogUrl(rawInput);
    if (!next) return;
    if (current && current.source === next.source && current.code === next.code) return;

    sessionIdRef.current = null;
    setSessionId(null);
    pendingWipeCallsRef.current    = {};
    pendingManualErrorsRef.current = {};

    // Drop ?session=<id> so a reload doesn't restore the old report on top of
    // the one being imported; persistSession() stamps the new id shortly.
    const url = new URL(window.location.href);
    url.searchParams.delete("session");
    window.history.replaceState({}, "", url.toString());
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
      sessionReportUrlRef.current = session.reportUrl;
      setImportInput(session.reportUrl);
      pendingWipeCallsRef.current = session.wipeCalls ?? {};
      pendingManualErrorsRef.current = session.manualErrors ?? {};

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

  const handleAddError = useCallback((pullId: number, input: ManualErrorInput) => {
    setPulls(prev =>
      prev.map(p => {
        if (p.id !== pullId) return p;
        const newError = createManualError(input);
        const updatedErrors = [...p.errors, newError].sort((a, b) => a.timestamp - b.timestamp);
        return { ...p, errors: updatedErrors };
      })
    );
    persistSession();
  }, [persistSession]);

  const handleRemoveError = useCallback((pullId: number, errorId: string) => {
    setPulls(prev =>
      prev.map(p => {
        if (p.id !== pullId) return p;
        return { ...p, errors: p.errors.filter(e => e.id !== errorId) };
      })
    );
    persistSession();
  }, [persistSession]);

  // Report half of a local VOD's remembered-sync key (lib/local-vod-sync.ts):
  // the same file's offset only applies to the log it was calibrated on.
  function currentReportKey(): string {
    const parsed = parseLogUrl(sessionReportUrlRef.current ?? "");
    return parsed ? `${parsed.source}:${parsed.code}` : "";
  }

  function handleAddVod(player: string, source: AddVodSource) {
    if (source.kind === "local") {
      const { file } = source;
      const localFile = {
        objectUrl:    URL.createObjectURL(file),
        name:         file.name,
        size:         file.size,
        lastModified: file.lastModified,
      };
      // Re-picking a file calibrated earlier on this log restores its sync.
      const rememberedOffset = loadLocalVodOffset(localFile, currentReportKey());
      const newVod: Vod = {
        id:         Date.now(),
        source:     "local",
        localFile,
        offset:       rememberedOffset,
        isCalibrated: rememberedOffset !== undefined,
        player,
        url:        "",
        videoId:    "",
        embedUrl:   "",
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
      // Saves the report url etc. as usual; serverSavableVods() keeps this
      // VOD out of the payload.
      persistSession();
      return;
    }

    const { url } = source;
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
    if (selectedVod.localFile) {
      saveLocalVodOffset(selectedVod.localFile, currentReportKey(), offset);
    }
    setVods(prev =>
      prev.map(v =>
        v.id === selectedVod.id
          ? { ...v, offset, isCalibrated: true }
          : v
      )
    );
    persistSession();
  }

  // Clears a VOD's calibration so it can be re-synced from scratch — the
  // counterpart to syncToPull() above. Triggered from the "Unsync" button
  // in VideoPanel's title bar (only shown while the VOD is calibrated).
  function handleUnsyncVod(vodId: number) {
    const localFile = vods.find(v => v.id === vodId)?.localFile;
    if (localFile) clearLocalVodOffset(localFile, currentReportKey());
    setVods(prev =>
      prev.map(v =>
        v.id === vodId
          ? { ...v, isCalibrated: false, offset: undefined }
          : v
      )
    );
    persistSession();
  }

  // ── WarcraftLogs import ────────────────────────────────────────────────────

  async function handleImportWCL(reportCode: string) {
    // Baseline "points spent this hour" BEFORE this import does anything —
    // used to compute how many points THIS import specifically cost (see
    // the diff against endStatus below). Read before fetchReport so a
    // fresh session (never seen a response yet) baselines at 0 rather than
    // missing data entirely.
    const startStatus = getWCLRateLimitStatus();
    setLoadedFromSampleData(false);

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

    // "Boss Pull N" labels for the raw-response console dumps, so sample
    // data grabbed from the console is identifiable per pull.
    const fightLogLabels = buildFightLogLabels(report.fights);

    const fightDataList = await mapWithConcurrency(
      validFights,
      FIGHT_FETCH_CONCURRENCY,
      async (fight) => {
        const fightData = await fetchFightData(reportCode, fight, report.masterData.actors, fightLogLabels.get(fight.id));
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
    
    newPulls = applyPendingManualErrors(newPulls, pendingManualErrorsRef.current);
    pendingManualErrorsRef.current = {};

    setPulls(newPulls);
    setSelectedPullId(null);
    setLoadedReportCode(report.code);
    setLoadedReportStartedAt(report.startTime ?? null);
    setLoadedSource("wcl");
    setImportStatus(`Log Loaded: ${report.code}`);
    setImportProgress(100);

    const endStatus = getWCLRateLimitStatus();
    // TEMP DIAGNOSTIC — remove once the missing-display issue is confirmed fixed.
    console.log("[rate-limit debug] WCL import finished — startStatus:", startStatus, "endStatus:", endStatus);
    if (endStatus) {
      const spent = startStatus
        ? Math.max(0, endStatus.pointsSpentThisHour - startStatus.pointsSpentThisHour)
        : endStatus.pointsSpentThisHour;
      setImportPointsUsed(spent);
    }

    persistSession();
  }

  // ── FFLogs import ──────────────────────────────────────────────────────────

  async function handleImportFFL(reportCode: string) {
    // Baseline "points spent this hour" BEFORE this import does anything —
    // used to compute how many points THIS import specifically cost (see
    // the diff against endStatus below).
    const startStatus = getFFLRateLimitStatus();
    setLoadedFromSampleData(false);

    const report = await fetchFFReport(reportCode);

    const validFights = report.fights.filter(f => f.endTime > f.startTime);

    setImportProgress(10);
    setImportStatus(`Loading ${validFights.length} fight${validFights.length === 1 ? "" : "s"}…`);

    // Every ability used anywhere in the report, keyed by gameID — resolves
    // ability names (including death causes) without falling back to "Ability {id}".
    const abilityMap = buildFFLAbilityMap(report.masterData.abilities);

    const totalFights = Math.max(validFights.length, 1);
    let completedFights = 0;

    const fightLogLabels = buildFFFightLogLabels(report.fights);

    const fightDataList = await mapWithConcurrency(
      validFights,
      FIGHT_FETCH_CONCURRENCY,
      async (fight) => {
        const fightData = await fetchFFightData(reportCode, fight, report.masterData.actors, fightLogLabels.get(fight.id));
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
    
    newPulls = applyPendingManualErrors(newPulls, pendingManualErrorsRef.current);
    pendingManualErrorsRef.current = {};

    setPulls(newPulls);
    setSelectedPullId(null);
    setLoadedReportCode(report.code);
    setLoadedReportStartedAt(report.startTime ?? null);
    setLoadedSource("ffl");
    setImportStatus(`Log Loaded: ${report.code}`);
    setImportProgress(100);

    const endStatus = getFFLRateLimitStatus();
    // TEMP DIAGNOSTIC — remove once the missing-display issue is confirmed fixed.
    console.log("[rate-limit debug] FFL import finished — startStatus:", startStatus, "endStatus:", endStatus);
    if (endStatus) {
      const spent = startStatus
        ? Math.max(0, endStatus.pointsSpentThisHour - startStatus.pointsSpentThisHour)
        : endStatus.pointsSpentThisHour;
      setImportPointsUsed(spent);
    }

    persistSession();
  }

  // ── Live log polling ────────────────────────────────────────────────────────
  //
  // Re-fetches the report and diffs its fight list against the currently
  // loaded pulls (by fightId — the stable identifier; Pull.id is just a
  // startTime-sorted position, see below) to find fights that appeared
  // since the last check. New fights are transformed and appended without
  // disturbing existing pulls' errors/VOD sync. Mirrors handleImportWCL's
  // fetch → transform → reattach-pending-state shape, just scoped to only
  // the new fights instead of the whole report.

  async function pollWCLForNewFights(reportCode: string) {
    if (isWCLQuotaExhausted()) return;

    let report: WCLReport;
    try {
      report = await fetchReport(reportCode);
      setLiveLogError(null);
    } catch (err) {
      console.error("Live log poll failed:", err);
      setLiveLogError(err instanceof Error ? err.message : String(err));
      return;
    }

    const knownFightIds = new Set(pullsRef.current.map(p => p.fightId));
    const newFights = report.fights.filter(f => f.endTime > f.startTime && !knownFightIds.has(f.id));
    if (newFights.length === 0) return;

    const abilityMap = buildWCLAbilityMap(report.masterData.abilities);
    const fightLogLabels = buildFightLogLabels(report.fights);
    const newFightData = await mapWithConcurrency(
      newFights,
      FIGHT_FETCH_CONCURRENCY,
      (fight) => fetchFightData(reportCode, fight, report.masterData.actors, fightLogLabels.get(fight.id))
    );

    let appended = newFightData.map(data => transformFightToPull(data, abilityMap, report.code));
    appended = applyPendingWipeCalls(appended, pendingWipeCallsRef.current);
    appended = applyPendingManualErrors(appended, pendingManualErrorsRef.current);

    appendLivePulls(appended);
  }

  async function pollFFLForNewFights(reportCode: string) {
    if (isFFLQuotaExhausted()) return;

    let report: FFLReport;
    try {
      report = await fetchFFReport(reportCode);
      setLiveLogError(null);
    } catch (err) {
      console.error("Live log poll failed:", err);
      setLiveLogError(err instanceof Error ? err.message : String(err));
      return;
    }

    const knownFightIds = new Set(pullsRef.current.map(p => p.fightId));
    const newFights = report.fights.filter(f => f.endTime > f.startTime && !knownFightIds.has(f.id));
    if (newFights.length === 0) return;

    const abilityMap = buildFFLAbilityMap(report.masterData.abilities);
    const fightLogLabels = buildFFFightLogLabels(report.fights);
    const newFightData = await mapWithConcurrency(
      newFights,
      FIGHT_FETCH_CONCURRENCY,
      (fight) => fetchFFightData(reportCode, fight, report.masterData.actors, fightLogLabels.get(fight.id))
    );

    let appended = newFightData.map(data => transformFFightToPull(data, abilityMap, report.code));
    appended = applyPendingWipeCalls(appended, pendingWipeCallsRef.current);
    appended = applyPendingManualErrors(appended, pendingManualErrorsRef.current);

    appendLivePulls(appended);
  }

  // Shared by both poll functions — merges newly-appeared pulls into the
  // existing set, then renumbers ids (Pull.id is just a startTime-sorted
  // position, not stable across imports) and per-boss pull numbers across
  // the COMBINED set so e.g. a 4th Rotmire pull appearing live reads #4,
  // not a fresh #1.
  function appendLivePulls(newPulls: Pull[]) {
    setPulls(prev => {
      const combined = [...prev, ...newPulls].sort((a, b) => a.startTime - b.startTime);
      combined.forEach((p, i) => { p.id = i + 1; });
      renumberPullsByBoss(combined);
      return combined;
    });
    persistSession();
  }

  // Polls the loaded report for new fights while live log mode is on.
  // Deliberately does not fire an immediate poll on mount/enable — the
  // report was just fully fetched by the initial import, so the first
  // live check happens after one full interval.
  useEffect(() => {
    if (!liveLogEnabled || !loadedReportCode || importing) return;

    const poll =
      loadedSource === "wcl" ? () => pollWCLForNewFights(loadedReportCode) :
      loadedSource === "ffl" ? () => pollFFLForNewFights(loadedReportCode) :
      null;
    if (!poll) return;

    const interval = setInterval(poll, LIVE_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [liveLogEnabled, loadedReportCode, loadedSource, importing]);

  // ── Unified import dispatcher ──────────────────────────────────────────────

  async function handleImportReport(
    rawInput: string,
    options?: { skipDuplicateCheck?: boolean; skipSampleCheck?: boolean }
  ) {
    const parsed = parseLogUrl(rawInput);

    if (!parsed) {
      setImportError(
        "Please paste a full WarcraftLogs or FFLogs report URL " +
        "(e.g. https://www.warcraftlogs.com/reports/… or https://www.fflogs.com/reports/…)"
      );
      return;
    }

    // Immediate feedback that the click registered — both pre-checks below
    // hit local API routes and are normally fast, but clicking Import
    // shouldn't visibly do nothing while they run (seen 2026-07-19: the
    // sample-data check used to fetch the ENTIRE report just to decide
    // whether to prompt, which could take ~10s on a big report with no
    // loading indicator at all).
    setImporting(true);
    setImportError(null);
    setImportProgress(0);
    setImportStatus("Checking for an existing session…");

    // If a saved session already exists for this exact log — and it isn't
    // the one we're already working from — offer to load it instead of
    // silently spinning up a second session for the same report.
    if (!options?.skipDuplicateCheck) {
      const match = await lookupSessionForLog(parsed.source, parsed.code);
      if (match && match.id !== sessionIdRef.current) {
        setImporting(false);
        setDuplicateMatch(match);
        setPendingRawInput(rawInput);
        return;
      }
    }

    // If this report was already fetched to disk (scripts/fetch-*-report.js,
    // see lib/sample-report-store.ts), offer to load it instead of spending
    // more rate-limit points on a live re-fetch. Only the lightweight meta
    // (title/fight count) is fetched here — the full payload can run into
    // the hundreds of MB, so it's only worth fetching once the user
    // actually confirms via the dialog (see handleUseSampleData).
    if (!options?.skipSampleCheck) {
      setImportStatus("Checking for local sample data…");
      const meta = await tryFetchSampleReportMeta(parsed.source, parsed.code);
      if (meta) {
        setImporting(false);
        setSampleDataFound({ source: parsed.source, code: parsed.code, rawInput, meta });
        return;
      }
    }

    setImportStatus("Fetching report information…");
    startNewSessionIfDifferentLog(rawInput);
    setSessionReportUrl(rawInput);
    sessionReportUrlRef.current = rawInput;
    // Clear the previous import's rate-limit readout so stale numbers can't
    // briefly show once this new import finishes and loadedReportCode is
    // still momentarily set from the last one.
    setImportPointsUsed(null);

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
      setLoadedReportStartedAt(null);
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
    // Eagerly, not just via the mirroring effect: the handleImportReport()
    // call below runs before that effect flushes, and its
    // startNewSessionIfDifferentLog() check would otherwise compare against
    // the PREVIOUS report's url and discard the session just adopted here.
    sessionReportUrlRef.current = session.reportUrl;
    pendingWipeCallsRef.current = session.wipeCalls ?? {};
    pendingManualErrorsRef.current = session.manualErrors ?? {};

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

  // ── "Local sample data found for this log" prompt ──────────────────────────

  function applySampleReport(payload: SampleReportPayload) {
    const newPullsRaw = payload.source === "wcl"
      ? transformReportToPulls(
          payload.fightDataList,
          buildWCLAbilityMap(payload.report.masterData.abilities),
          payload.report.code
        )
      : transformFFReportToPulls(
          payload.fightDataList,
          buildFFLAbilityMap(payload.report.masterData.abilities),
          payload.report.code
        );

    let newPulls = applyPendingWipeCalls(newPullsRaw, pendingWipeCallsRef.current);
    pendingWipeCallsRef.current = {};

    newPulls = applyPendingManualErrors(newPulls, pendingManualErrorsRef.current);
    pendingManualErrorsRef.current = {};

    setPulls(newPulls);
    setSelectedPullId(null);
    setLoadedReportCode(payload.report.code);
    setLoadedReportStartedAt(payload.report.startTime ?? null);
    setLoadedSource(payload.source);
    setImportStatus(`Log Loaded: ${payload.report.code} (local sample data)`);
    setImportProgress(100);
    setImportPointsUsed(null);
    setImportError(null);
    setLoadedFromSampleData(true);

    persistSession();
  }

  async function handleUseSampleData() {
    const found = sampleDataFound;
    setSampleDataFound(null);
    if (!found) return;

    setImporting(true);
    setImportError(null);
    setImportProgress(20);
    setImportStatus(`Loading ${found.code} from local sample data…`);
    startNewSessionIfDifferentLog(found.rawInput);
    setSessionReportUrl(found.rawInput);
    sessionReportUrlRef.current = found.rawInput;

    try {
      const payload = await fetchSampleReport(found.source, found.code);
      applySampleReport(payload);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
      setImportStatus(null);
    } finally {
      setImporting(false);
    }
  }

  function handleFetchLiveInstead() {
    const found = sampleDataFound;
    setSampleDataFound(null);
    if (found) handleImportReport(found.rawInput, { skipDuplicateCheck: true, skipSampleCheck: true });
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
      className="ck-app"
      style={{
        height:          "100vh",
        display:         "flex",
        flexDirection:   "column",
        // This is a fixed-viewport dashboard — every scrollable region is an
        // inner panel, so the document itself must never scroll. Without this
        // a row that overflows horizontally (the header's fixed-width banner
        // artwork on a narrow window) spills onto the body, and the resulting
        // horizontal bar then eats enough height to also trip a vertical one.
        overflow:        "hidden",
      }}
    >
      <Header
        onAddVod={() => setShowDialog(true)}
        onConnectWCL={() => setLogApiSetup("wcl")}
        onConnectFFL={() => setLogApiSetup("ffl")}
        onOpenReport={() => setShowReport(true)}
        onAddReviewToStatic={() => setShowAddReviewToStaticDialog(true)}
        onManageStatics={() => setShowManageStaticsDialog(true)}
        onLogin={() => setShowLoginDialog(true)}
        onLogout={handleLogout}
        currentUser={currentUser}
        hasActiveSession={sessionId != null}
      />

      <div
        className="ck-strip"
        style={{
          display:         "flex",
          alignItems:      "center",
          gap:             "8px",
          padding:         "6px 16px",
          flexShrink:      0,
          position:        "relative",
          zIndex:          1,
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
          importPointsUsed={importPointsUsed}
          rateLimit={liveRateLimit}
          liveLogEnabled={liveLogEnabled}
          onLiveLogEnabledChange={handleLiveLogEnabledChange}
          liveLogError={liveLogError}
          loadedFromSampleData={loadedFromSampleData}
        />
        <button
          className="ck-btn"
          onClick={() => setShowDamage(true)}
          title="Where each player lost damage, scored in their own damage and checked against the fight"
        >
          Damage
        </button>
        <button
          className="ck-btn"
          onClick={() => setShowMitigation(true)}
          title="The party's mitigation on each raidwide, read from the log"
        >
          Mitigation
        </button>
        <button
          className="ck-btn"
          onClick={() => setShowStrategy(true)}
          title="Raid strategy detected automatically from this report's pulls"
        >
          Strategy
        </button>
      </div>

      <StrategyDialog
        open={showStrategy}
        onClose={() => setShowStrategy(false)}
        strategy={kickStrategy}
        crystals={crystalStrategy}
        blackHole={blackHoleStrategy}
        blackHoleOverrideId={blackHoleOverrideId}
        onBlackHoleOverrideChange={handleBlackHoleOverrideChange}
        pulls={pulls}
        currentPullId={selectedPullId}
      />

      <DamageDialog
        open={showDamage}
        onClose={() => setShowDamage(false)}
        pulls={pulls}
        currentPullId={selectedPullId}
      />

      <MitigationDialog
        open={showMitigation}
        onClose={() => setShowMitigation(false)}
        pulls={pulls}
        currentPullId={selectedPullId}
      />

      <div
        style={{
          flex:                1,
          display:             "grid",
          gridTemplateColumns: "1fr 2fr 1fr",
          gridTemplateRows:    "minmax(0, 1fr)",
          // Gaps and padding leave room for the Panel corner ornaments,
          // which hang ~5px outside each frame.
          gap:                 "14px",
          padding:             "14px 12px 12px",
          overflow:            "hidden",
          minHeight:           0,
        }}
      >
        {/* The column itself must not clip — the Panels' corner ornaments
            overhang it. Each Panel clips its own body instead. */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", minHeight: 0 }}>
          <Panel
            style={{
              // Fixed to fit exactly one column of 5 players (header + 5 rows)
              // for WoW, and 4 rows of paired players (MT/OT, H1/H2, M1/M2,
              // R1/R2) for FFXIV — a bit of empty space below FFXIV's 4th row
              // is expected and fine. Drilling into a player's detail tabs
              // scrolls WITHIN this height instead of expanding the panel.
              flex:          "0 0 auto",
              height:        "300px",
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
          </Panel>

          <Panel style={{ flex: "1 1 0" }}>
            <AnalysisPanel
              pull={activePull}
              playbackTimeMs={timeline.playbackTimeMs}
              onSeekToTime={isCalibrated ? handleSeekToMs : undefined}
              onCallWipe={handleCallWipe}
              onAddError={handleAddError}
              onRemoveError={handleRemoveError}
              vodTimeAvailable={isCalibrated}
            />
          </Panel>
        </div>

        <Panel diamondBottom>
          <div style={{ flex: 1, minHeight: 0 }}>
            <VideoPanel
              vod={selectedVod}
              seekRequest={timeline.seekRequest}
              onCurrentTimeChange={handleVideoTimeUpdate}
              onUnsync={handleUnsyncVod}
            />
          </div>
          <div style={{ flexShrink: 0 }}>
            {videoBottom}
          </div>
        </Panel>

        <VODSidebar
          pulls={displayPulls}
          selectedPullId={selectedPullId}
          onSelectPull={setSelectedPullId}
          vods={vods}
          selectedVodId={selectedVodId}
          onSelectVod={setSelectedVodId}
          onOpenTranscript={setTranscriptVodId}
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
        pulls={displayPulls}
      />

      <LoginDialog
        open={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
        onLoggedIn={setCurrentUser}
      />

      <LogApiSetupDialog
        provider={logApiSetup}
        onClose={() => setLogApiSetup(null)}
      />

      <AddReviewToStaticDialog
        open={showAddReviewToStaticDialog}
        sessionId={sessionId}
        reportUrl={sessionReportUrl}
        reportStartedAt={loadedReportStartedAt}
        pulls={displayPulls}
        onClose={() => setShowAddReviewToStaticDialog(false)}
        onOpenManageStatics={() => setShowManageStaticsDialog(true)}
      />

      <ManageStaticsDialog
        open={showManageStaticsDialog}
        sessionId={sessionId}
        onClose={() => setShowManageStaticsDialog(false)}
      />

      <TranscriptDialog
        vod={vods.find(v => v.id === transcriptVodId) ?? null}
        onClose={() => setTranscriptVodId(null)}
      />

      <SessionFoundDialog
        open={duplicateMatch !== null}
        vodCount={duplicateMatch?.vodCount ?? 0}
        wipeCount={duplicateMatch?.wipeCount ?? 0}
        onLoad={handleLoadFoundSession}
        onImportFresh={handleImportFreshInstead}
      />

      <SampleDataFoundDialog
        open={sampleDataFound !== null}
        reportCode={sampleDataFound?.code ?? ""}
        fightCount={sampleDataFound?.meta.fightCount ?? 0}
        onUseSample={handleUseSampleData}
        onFetchLive={handleFetchLiveInstead}
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
      className="ck-rule"
      style={{
        padding:        "10px 12px",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        gap:            "12px",
      }}
    >
      <div style={{ fontSize: "12px", color: "var(--ck-text-3)", lineHeight: "1.4" }}>
        {!hasVod && "Add a VOD to begin."}
        {hasVod && !hasPull && "Select a pull to sync."}
        {hasVod && hasPull && rawVideoTime !== null && (
          <>
            <span style={{ color: "var(--ck-text-2)" }}>Video at </span>
            <span className="ck-num" style={{ color: "var(--ck-arcane-text)", fontWeight: 600 }}>
              {formatTime(rawVideoTime)}
            </span>
            <span> — seek to the pull start, then sync.</span>
          </>
        )}
      </div>

      <button
        className="ck-btn ck-btn--arcane"
        onClick={onSync}
        disabled={!ready}
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
  importPointsUsed,
  rateLimit,
  liveLogEnabled,
  onLiveLogEnabledChange,
  liveLogError,
  loadedFromSampleData,
}: {
  value:            string;
  onChange:         (v: string) => void;
  importing:        boolean;
  importProgress:   number;
  importStatus:     string | null;
  loadedReportCode: string | null;
  error:            string | null;
  onImport:         (url: string) => void;
  // Points spent specifically by the import that just completed, or null
  // if unavailable (e.g. the provider never returned rateLimitData).
  importPointsUsed?: number | null;
  // Live-ticking snapshot of the provider's hourly points quota — see
  // page.tsx's polling useEffect keyed on loadedSource.
  rateLimit?:        RateLimitStatus | null;
  // Opt-in "keep polling this report for new fights" toggle — off by
  // default, set before Import is clicked, drives page.tsx's live-poll
  // useEffect once a report is loaded.
  liveLogEnabled:         boolean;
  onLiveLogEnabledChange: (v: boolean) => void;
  // Most recent background poll failure, or null if the last poll (or the
  // initial import) succeeded — see page.tsx's pollWCLForNewFights/
  // pollFFLForNewFights.
  liveLogError: string | null;
  // True if the currently-loaded report came from lib/sample-report-store.ts
  // (scripts/fetch-*-report.js's saved output) rather than a live fetch.
  loadedFromSampleData: boolean;
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
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, flexWrap: "wrap", rowGap: "4px" }}>
        <span className="ck-chip">
          <span style={{ color: "var(--ck-text-2)", fontWeight: 500 }}>Log Loaded:</span>
          {loadedReportCode}
        </span>
        <span style={{ fontSize: "11px", color: "var(--ck-text-2)" }}>Ready for review</span>

        {loadedFromSampleData && (
          <span
            title="Loaded from local sample data (scripts/fetch-wow-report.js / fetch-ff-report.js) — not a live fetch"
            style={{ fontSize: "11px", color: "#c4b5fd", fontWeight: 600 }}
          >
            · Local sample data
          </span>
        )}

        {liveLogEnabled && liveLogError && (
          <span
            title={liveLogError}
            style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#f87171", maxWidth: "320px" }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "999px", backgroundColor: "#f87171" }} />
            Live poll failed: {liveLogError}
          </span>
        )}

        {liveLogEnabled && !liveLogError && (
          <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#4ade80" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "999px", backgroundColor: "#4ade80" }} />
            Live — checking for new pulls
          </span>
        )}

        {rateLimit && (
          <span
            title="API points used to import this log, total points used this hour, and when the hourly quota resets"
            className="ck-num"
            style={{ fontSize: "11px", color: "var(--ck-text-3)", whiteSpace: "nowrap" }}
          >
            · {importPointsUsed !== null && importPointsUsed !== undefined && (
              <>{importPointsUsed.toLocaleString()} pts this import · </>
            )}
            {rateLimit.pointsSpentThisHour.toLocaleString()}/{rateLimit.limitPerHour.toLocaleString()} this hour
            · resets in {formatWaitTime(rateLimit.secondsUntilReset)}
          </span>
        )}
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
        className="ck-field"
        style={{ flex: 1, maxWidth: "480px" }}
      />
      <label
        title="Keep checking this report for new fights and import them automatically as they occur"
        style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap", cursor: "pointer" }}
      >
        <input
          type="checkbox"
          checked={liveLogEnabled}
          onChange={e => onLiveLogEnabledChange(e.target.checked)}
        />
        Live log
      </label>
      <button
        className="ck-btn ck-btn--primary"
        onClick={handleSubmit}
        disabled={!value.trim()}
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
