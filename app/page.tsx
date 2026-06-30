"use client";

import { useState, useCallback } from "react";
import Header from "../components/Header";
import AddVodDialog from "../components/AddVodDialog";
import { parseYouTubeUrl } from "../lib/youtube";
import type { Vod } from "../types/Vod";
import VideoPanel from "../components/VideoPanel";
import VODSidebar from "../components/VODSidebar";
import PerspectiveTabs from "../components/PerspectiveTabs";
import AnalysisPanel from "../components/AnalysisPanel";
import RosterPanel from "../components/RosterPanel";
import TimelinePanel from "@/components/TimelinePanel";
import type { Pull } from "../types/Pull";
import useTimelineController from "@/hooks/useTimelineController";
import { loginWithWarcraftLogs } from "@/lib/wcl-auth";
import { fetchReport, fetchFightData } from "@/lib/wcl-client";
import { transformReportToPulls } from "@/lib/wcl-transforms";

export default function Home() {
  // ─── VOD state ───────────────────────────────────────────────────────────────

  const [vods, setVods]                   = useState<Vod[]>([]);
  const [selectedVodId, setSelectedVodId] = useState<number | null>(null);
  const [showDialog, setShowDialog]       = useState(false);
  const [perspective, setPerspective]     = useState<"Tank" | "Healer" | "DPS">("DPS");

  // ─── Pull state ──────────────────────────────────────────────────────────────

  const [pulls, setPulls]                   = useState<Pull[]>([]);
  const [selectedPullId, setSelectedPullId] = useState<number | null>(null);

  // ─── WCL import state ────────────────────────────────────────────────────────

  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting]     = useState(false);

  // ─── Derived selections ──────────────────────────────────────────────────────

  const selectedVod = vods.find(v => v.id === selectedVodId) ?? null;
  const activePull  = pulls.find(p => p.id === selectedPullId) ?? null;

  // ─── Pull detection callback (stable reference) ──────────────────────────────

  const handlePullDetected = useCallback((pullId: number) => {
    setSelectedPullId(pullId);
  }, []);

  // ─── Timeline controller ─────────────────────────────────────────────────────

  const timeline = useTimelineController({
    vod:            selectedVod,
    pull:           activePull,
    pulls,
    onPullDetected: handlePullDetected,
  });

  // ─── VideoPanel needs ONE combined time-update callback ──────────────────────

  const handleVideoTimeUpdate = useCallback((rawTime: number) => {
    timeline.updateFromVideo(rawTime);
    timeline.updateRawVideoTime(rawTime);
  }, [timeline.updateFromVideo, timeline.updateRawVideoTime]);

  // ─── Seek to ms-into-pull (used by AnalysisPanel death click) ────────────────
  // Death timestamps are ms into the pull.
  // seekToPullStart(offsetOverride) adds offsetOverride seconds to pull start.

  const handleSeekToMs = useCallback((ms: number) => {
    if (!activePull || !selectedVod) return;
    timeline.seekToPullStart(ms / 1000);
  }, [activePull, selectedVod, timeline]);

  // ─── VOD handlers ────────────────────────────────────────────────────────────

  function handleAddVod(player: string, url: string) {
    const parsed = parseYouTubeUrl(url);
    if (!parsed) { alert("Invalid YouTube URL"); return; }

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
  }

  // ─── Calibration ─────────────────────────────────────────────────────────────

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
  }

  // ─── WCL import ──────────────────────────────────────────────────────────────

  async function handleImportReport(reportCode: string) {
    setImporting(true);
    setImportError(null);

    try {
      const report        = await fetchReport(reportCode);
      const fightDataList = await Promise.all(
        report.fights.map(fight =>
          fetchFightData(reportCode, fight, report.masterData.actors)
        )
      );
      const newPulls = transformReportToPulls(fightDataList);
      setPulls(newPulls);
      setSelectedPullId(null);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  }

  // ─── Bottom-of-video slot: Sync button OR scrub bar ──────────────────────────

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

  // ─── Render ──────────────────────────────────────────────────────────────────

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
      {/* HEADER */}
      <Header
        onAddVod={() => setShowDialog(true)}
        onConnectWCL={loginWithWarcraftLogs}
      />

      {/* TOOLBAR */}
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
          importing={importing}
          error={importError}
          onImport={handleImportReport}
        />
      </div>

      {/* MAIN GRID */}
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
        {/* LEFT: ROSTER (33%) + ANALYSIS (67%) */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", overflow: "hidden", minHeight: 0 }}>

          {/* Roster panel — 33% of left column height */}
          <div
            style={{
              flex:       "0 0 33%",
              border:     "1px solid #333",
              overflow:   "hidden",
              display:    "flex",
              flexDirection: "column",
              minHeight:  0,
            }}
          >
            <RosterPanel players={activePull?.players ?? []} />
          </div>

          {/* Analysis panel — remaining 67% */}
          <div
            style={{
              flex:      "1 1 0",
              border:    "1px solid #333",
              overflow:  "hidden",
              display:   "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <AnalysisPanel
              pull={activePull}
              playbackTimeMs={timeline.playbackTimeMs}
              onSeekToTime={isCalibrated ? handleSeekToMs : undefined}
            />
          </div>
        </div>

        {/* MIDDLE: VIDEO */}
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
          <PerspectiveTabs value={perspective} onChange={setPerspective} />

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

        {/* RIGHT: SIDEBAR */}
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
    </div>
  );
}

// ─── Sync To Pull Button ──────────────────────────────────────────────────────

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
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  return (
    <div
      style={{
        padding:         "10px",
        background:      "#181818",
        borderTop:       "1px solid #333",
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "space-between",
        gap:             "12px",
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

// ─── WCL Import Bar ───────────────────────────────────────────────────────────

function WCLImportBar({
  importing,
  error,
  onImport,
}: {
  importing: boolean;
  error:     string | null;
  onImport:  (code: string) => void;
}) {
  const [code, setCode] = useState("");

  function handleSubmit() {
    const trimmed = code.trim();
    if (!trimmed) return;
    const match = trimmed.match(/reports\/([a-zA-Z0-9]+)/);
    onImport(match ? match[1] : trimmed);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
      <input
        value={code}
        onChange={e => setCode(e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleSubmit()}
        placeholder="WarcraftLogs report URL or code…"
        disabled={importing}
        style={{
          flex:            1,
          maxWidth:        "360px",
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
        disabled={importing || !code.trim()}
        style={{
          backgroundColor: importing ? "#1e293b" : "#2563eb",
          color:           importing ? "#555" : "white",
          border:          "none",
          borderRadius:    "6px",
          padding:         "6px 14px",
          fontSize:        "12px",
          fontWeight:      600,
          cursor:          importing ? "default" : "pointer",
        }}
      >
        {importing ? "Importing…" : "Import"}
      </button>
      {error && (
        <span style={{ fontSize: "11px", color: "#f87171", maxWidth: "240px" }}>
          {error}
        </span>
      )}
    </div>
  );
}
