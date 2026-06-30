"use client";

import { useState, useCallback } from "react";
import Header from "../components/Header";
import AddVodDialog from "../components/AddVodDialog";
import { parseYouTubeUrl } from "../lib/youtube";
import type { Vod } from "../types/Vod";
import VideoPanel from "../components/VideoPanel";
import VODSidebar from "../components/VODSidebar";
import AnalysisPanel from "../components/AnalysisPanel";
import RosterPanel from "../components/RosterPanel";
import TimelinePanel from "@/components/TimelinePanel";
import type { Pull } from "../types/Pull";
import useTimelineController from "@/hooks/useTimelineController";
import { loginWithWarcraftLogs } from "@/lib/wcl-auth";
import { fetchReport, fetchFightData } from "@/lib/wcl-client";
import { transformReportToPulls } from "@/lib/wcl-transforms";

export default function Home() {
  const [vods, setVods] = useState<Vod[]>([]);
  const [selectedVodId, setSelectedVodId] = useState<number | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const [pulls, setPulls] = useState<Pull[]>([]);
  const [selectedPullId, setSelectedPullId] = useState<number | null>(null);

  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [loadedReportCode, setLoadedReportCode] = useState<string | null>(null);

  const selectedVod = vods.find(v => v.id === selectedVodId) ?? null;
  const activePull = pulls.find(p => p.id === selectedPullId) ?? null;

  const handlePullDetected = useCallback((pullId: number) => {
    setSelectedPullId(pullId);
  }, []);

  const timeline = useTimelineController({
    vod: selectedVod,
    pull: activePull,
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

  function handleAddVod(player: string, url: string) {
    const parsed = parseYouTubeUrl(url);
    if (!parsed) {
      alert("Invalid YouTube URL");
      return;
    }

    const newVod: Vod = {
      id: Date.now(),
      player,
      url,
      videoId: parsed.videoId,
      embedUrl: parsed.embedUrl,
      class: "Unknown",
      role: "DPS",
      raid: "Unknown Raid",
      boss: "Unknown Boss",
      difficulty: "Unknown",
      uploadedBy: "local-user",
    };

    setVods(prev => [...prev, newVod]);
    setSelectedVodId(newVod.id);
    setShowDialog(false);
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
  }

  async function handleImportReport(reportCode: string) {
    setImporting(true);
    setImportError(null);
    setImportProgress(0);
    setImportStatus("Fetching report information...");

    try {
      const report = await fetchReport(reportCode);
      setImportProgress(10);
      setImportStatus(`Loading ${report.fights.length} fight${report.fights.length === 1 ? "" : "s"}...`);

      const fightDataList = [] as Awaited<ReturnType<typeof fetchFightData>>[];
      const totalFights = Math.max(report.fights.length, 1);

      for (let index = 0; index < report.fights.length; index += 1) {
        const fight = report.fights[index];
        const fightData = await fetchFightData(reportCode, fight, report.masterData.actors);
        fightDataList.push(fightData);

        const progress = Math.round(10 + ((index + 1) / totalFights) * 85);
        setImportProgress(progress);
        setImportStatus(`Loaded fight ${index + 1}/${report.fights.length}`);
      }

      const newPulls = transformReportToPulls(fightDataList);
      setPulls(newPulls);
      setSelectedPullId(null);
      setLoadedReportCode(report.code);
      setImportStatus(`Log Loaded: ${report.code}`);
      setImportProgress(100);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
      setImportStatus(null);
      setLoadedReportCode(null);
    } finally {
      setImporting(false);
    }
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
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#121212",
        color: "white",
      }}
    >
      <Header
        onAddVod={() => setShowDialog(true)}
        onConnectWCL={loginWithWarcraftLogs}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "6px 16px",
          backgroundColor: "#181818",
          borderBottom: "1px solid #2a2a2a",
          flexShrink: 0,
        }}
      >
        <WCLImportBar
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
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 2fr 1fr",
          gap: "10px",
          padding: "10px",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", overflow: "hidden", minHeight: 0 }}>
          <div
            style={{
              flex: "0 0 33%",
              border: "1px solid #333",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <RosterPanel players={activePull?.players ?? []} />
          </div>

          <div
            style={{
              flex: "1 1 0",
              border: "1px solid #333",
              overflow: "hidden",
              display: "flex",
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

        <div
          style={{
            border: "1px solid #333",
            padding: "10px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
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
    </div>
  );
}

function SyncToPullButton({
  hasVod,
  hasPull,
  rawVideoTime,
  onSync,
}: {
  hasVod: boolean;
  hasPull: boolean;
  rawVideoTime: number | null;
  onSync: () => void;
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
        padding: "10px",
        background: "#181818",
        borderTop: "1px solid #333",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
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
          color: ready ? "#60a5fa" : "#444",
          border: `1px solid ${ready ? "#2563eb" : "#2a2a2a"}`,
          borderRadius: "6px",
          padding: "6px 16px",
          fontSize: "12px",
          fontWeight: 600,
          cursor: ready ? "pointer" : "default",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        Sync to Pull
      </button>
    </div>
  );
}

function WCLImportBar({
  importing,
  importProgress,
  importStatus,
  loadedReportCode,
  error,
  onImport,
}: {
  importing: boolean;
  importProgress: number;
  importStatus: string | null;
  loadedReportCode: string | null;
  error: string | null;
  onImport: (code: string) => void;
}) {
  const [code, setCode] = useState("");

  function handleSubmit() {
    const trimmed = code.trim();
    if (!trimmed) return;
    const match = trimmed.match(/reports\/([a-zA-Z0-9]+)/);
    onImport(match ? match[1] : trimmed);
  }

  if (loadedReportCode && !importing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
        <span
          style={{
            padding: "6px 12px",
            borderRadius: "999px",
            backgroundColor: "#1e293b",
            color: "#93c5fd",
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          Log Loaded: {loadedReportCode}
        </span>
      </div>
    );
  }

  if (importing) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ height: "8px", borderRadius: "999px", backgroundColor: "#1f2937", overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.max(4, importProgress)}%`,
                height: "100%",
                background: "linear-gradient(90deg, #38bdf8, #2563eb)",
                borderRadius: "999px",
                transition: "width 0.2s ease",
              }}
            />
          </div>
          <div style={{ marginTop: "4px", fontSize: "11px", color: "#94a3b8" }}>
            {importStatus ?? "Importing log..."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
      <input
        value={code}
        onChange={e => setCode(e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleSubmit()}
        placeholder="WarcraftLogs report URL or code…"
        style={{
          flex: 1,
          maxWidth: "360px",
          padding: "6px 10px",
          backgroundColor: "#111",
          border: "1px solid #333",
          borderRadius: "6px",
          color: "#ccc",
          fontSize: "12px",
          outline: "none",
        }}
      />
      <button
        onClick={handleSubmit}
        disabled={!code.trim()}
        style={{
          backgroundColor: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "6px",
          padding: "6px 14px",
          fontSize: "12px",
          fontWeight: 600,
          cursor: code.trim() ? "pointer" : "default",
          opacity: code.trim() ? 1 : 0.7,
        }}
      >
        Import
      </button>
      {error && (
        <span style={{ fontSize: "11px", color: "#f87171", maxWidth: "240px" }}>
          {error}
        </span>
      )}
    </div>
  );
}
