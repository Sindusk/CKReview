import { useCallback, useEffect, useMemo, useState } from "react";
import type { Pull } from "@/types/Pull";
import type { Vod } from "@/types/Vod";

type TimelineControllerProps = {
  vod:             Vod | null;
  pull:            Pull | null;
  pulls:           Pull[];                        // full list for auto-detection
  onPullDetected:  (pullId: number) => void;      // called when video crosses into a different pull
};

export default function useTimelineController({
  vod,
  pull,
  pulls,
  onPullDetected,
}: TimelineControllerProps) {

  // ─── Core state ──────────────────────────────────────────────────────────────

  // Playback time in SECONDS relative to the current pull's start (matches Pull.startTime unit)
  const [playbackTime, setPlaybackTime] = useState(0);

  // One-shot seek command sent down to VideoPanel
  const [seekRequest, setSeekRequest] = useState<number | null>(null);

  // ─── Derived ─────────────────────────────────────────────────────────────────

  const pullDuration = useMemo(() => {
    if (!pull) return 0;
    return Math.max(0, pull.endTime - pull.startTime);  // seconds
  }, [pull]);

  const scrubPercent = useMemo(() => {
    if (pullDuration <= 0) return 0;
    return Math.min(playbackTime / pullDuration, 1);
  }, [playbackTime, pullDuration]);

  // Absolute video time in seconds (for VideoPanel and calibration)
  const currentVideoTime = useMemo(() => {
    if (!vod || !pull) return null;
    return (vod.offset ?? 0) + pull.startTime + playbackTime;
  }, [vod, pull, playbackTime]);

  // Playback time in MS for AnalysisPanel event comparisons
  const playbackTimeMs = useMemo(() => playbackTime * 1000, [playbackTime]);

  // ─── Seek to pull start when pull or vod changes ──────────────────────────

  useEffect(() => {
    if (!vod || !pull) return;

    // Only auto-seek if the VOD is calibrated; otherwise leave video where it is
    if (!vod.isCalibrated) return;

    const base = (vod.offset ?? 0) + pull.startTime;
    setPlaybackTime(0);
    setSeekRequest(base);
  }, [vod?.id, pull?.id]);

  // Reset playback when pull is cleared
  useEffect(() => {
    if (!pull) {
      setPlaybackTime(0);
      setSeekRequest(null);
    }
  }, [pull?.id]);

  // ─── Calibration ─────────────────────────────────────────────────────────────

  /**
   * Called when the user clicks "Sync to Pull".
   * Returns the computed offset so page.tsx can store it on the Vod.
   * offset = currentRawVideoTime - pull.startTime
   */
  function calibrate(rawVideoTime: number, targetPull: Pull): number {
    const offset = rawVideoTime - targetPull.startTime;
    return offset;
  }

  // ─── Video → UI sync ─────────────────────────────────────────────────────────

  /**
   * Called every ~200ms by VideoPanel with the raw video time in seconds.
   * 1. Updates pull-relative playbackTime.
   * 2. Detects whether we've crossed into a different pull and notifies page.tsx.
   */
  const updateFromVideo = useCallback((rawVideoTime: number) => {
    if (!vod) return;

    const offset = vod.offset ?? 0;

    // 1. Update playback time relative to selected pull
    if (pull) {
      const t = rawVideoTime - offset - pull.startTime;
      setPlaybackTime(Math.max(0, Math.min(t, pullDuration)));
    }

    // 2. Auto-detect which pull we're in (only when calibrated)
    if (vod.isCalibrated && pulls.length > 0) {
      const reportTime = rawVideoTime - offset; // seconds from report start

      const detected = pulls.find(
        (p) => reportTime >= p.startTime && reportTime <= p.endTime
      );

      if (detected && detected.id !== pull?.id) {
        onPullDetected(detected.id);
      }
    }
  }, [vod, pull, pulls, pullDuration, onPullDetected]);

  // ─── Scrub bar input ─────────────────────────────────────────────────────────

  function seekWithinPull(percent: number) {
    if (!pull || !vod) return;

    const clamped    = Math.max(0, Math.min(percent, 1));
    const newPlayback = clamped * pullDuration;

    setPlaybackTime(newPlayback);
    setSeekRequest((vod.offset ?? 0) + pull.startTime + newPlayback);
  }

  // ─── Jump to pull start ───────────────────────────────────────────────────────

  function seekToPullStart(offsetOverride = 0) {
    if (!pull || !vod) return;
    setSeekRequest((vod.offset ?? 0) + pull.startTime + offsetOverride);
  }

  // ─── Raw video time (for the Sync button label) ───────────────────────────────

  // Stored separately so the Sync button can display it without needing a pull
  const [rawVideoTime, setRawVideoTime] = useState<number | null>(null);

  const updateRawVideoTime = useCallback((t: number) => {
    setRawVideoTime(t);
  }, []);

  return {
    // Time values
    playbackTime,        // seconds into current pull
    playbackTimeMs,      // ms into current pull — for AnalysisPanel
    currentTime: playbackTime,
    currentVideoTime,    // absolute video seconds
    rawVideoTime,        // raw player time, available even before calibration

    // Scrub bar
    pullDuration,
    scrubPercent,

    // Actions
    seekWithinPull,
    seekToPullStart,
    calibrate,
    updateFromVideo,
    updateRawVideoTime,

    // Seek command for VideoPanel
    seekRequest,
  };
}
