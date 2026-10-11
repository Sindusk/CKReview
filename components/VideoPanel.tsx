"use client";

import { useEffect, useRef, useState } from "react";
import { isLocalVod, type Vod } from "@/types/Vod";
import type { SeekRequest } from "@/hooks/useTimelineController";
import { PanelHeader } from "./ui/Panel";

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT: any;
  }
}

type YTPlayer = {
  destroy(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  getCurrentTime(): number;
  getDuration(): number;
  loadVideoById(options: { videoId: string; startSeconds?: number }): void;
};

type YTPlayerEvent = {
  target: YTPlayer;
};

/**
 * What the rest of the panel needs from whichever player is active: seek,
 * play and read the time. Two implementations — the YouTube iframe player
 * and an HTML5 <video> playing a local file. Switching videos stays
 * source-specific (loadVideoById vs. changing the <video> src) and lives in
 * the create/swap effect below.
 */
type PlayerAdapter = {
  seekTo(seconds: number): void;
  play(): void;
  pause(): void;
  getCurrentTime(): number;
  getDuration(): number;
};

function youTubeAdapter(player: YTPlayer): PlayerAdapter {
  return {
    seekTo:         (t) => player.seekTo(t, true),
    play:           () => player.playVideo(),
    pause:          () => player.pauseVideo(),
    getCurrentTime: () => player.getCurrentTime(),
    getDuration:    () => player.getDuration(),
  };
}

function videoElementAdapter(video: HTMLVideoElement): PlayerAdapter {
  return {
    seekTo: (t) => { video.currentTime = t; },
    // Unmuted play() can be refused by the browser's autoplay policy when
    // there's no recent user gesture; fall back to muted playback, the same
    // way the YouTube embed starts muted.
    play: () => {
      video.play().catch((err) => {
        if (err?.name !== "NotAllowedError") return;
        video.muted = true;
        video.play().catch(() => {});
      });
    },
    pause: () => video.pause(),
    getCurrentTime: () => video.currentTime,
    getDuration:    () => (Number.isFinite(video.duration) ? video.duration : 0),
  };
}

// What the no-coverage card shows (built in app/page.tsx from
// lib/vod-sync.ts). Labels are "Alice" or "Alice part 2".
export type CoverageGap = {
  pullNumber:   number;
  logTime:      string;                             // "2:41:10"
  currentLabel: string;                             // the VOD on screen
  covering:     { vodId: number; label: string }[]; // other synced VODs that cover it
  ranges:       { label: string; range: string }[]; // every synced VOD's covered pulls
  unsynced:     string[];                           // VODs that might, once synced
};

type VideoPanelProps = {
  vod: Vod | null;

  // ONE-TIME SEEK COMMAND ONLY. `token` is bumped on every request so that
  // seeking to the same time twice in a row still re-fires the effect below.
  seekRequest: SeekRequest | null;

  // continuous playback reporting
  onCurrentTimeChange?: (time: number) => void;

  // Clears this VOD's calibration (isCalibrated/offset) so it can be
  // re-synced. Only rendered in the title bar when the VOD is currently
  // calibrated — nothing to unsync otherwise.
  onUnsync?: (vodId: number) => void;

  // "Re-sync from this pull" (lib/vod-sync.ts): adds a sync point at the
  // selected pull, from the current video position, for a stream dropout.
  // Shown beside Unsync; `canResync` is false until a pull is selected and
  // the player has reported a time.
  onResync?: () => void;
  canResync?: boolean;

  // Pull labels of the VOD's sync points, e.g. ["#1", "#23"]. The title
  // bar lists them once there's more than one.
  syncPointLabels?: string[];

  // A brief note shown over the top of the video, e.g. after an auto-swap
  // to another VOD. The page clears it after a few seconds.
  note?: { text: string; token: number } | null;

  // Set while this synced VOD doesn't cover the selected pull. The player
  // pauses, ignores seeks and never starts playing, and a card replaces
  // the video saying what does cover the pull. Cleared by picking another
  // pull or VOD.
  coverageGap?: CoverageGap | null;
  onSelectVod?: (vodId: number) => void;

  // The active video's length in seconds, reported from the playback loop
  // once the player knows it (getDuration() > 0) and the VOD hasn't
  // recorded one yet. Coverage (lib/vod-sync.ts) depends on it.
  onDurationKnown?: (vodId: number, durationSec: number) => void;
};

function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve();
      return;
    }

    const existing = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );

    if (!existing) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }

    window.onYouTubeIframeAPIReady = () => resolve();
  });
}

export default function VideoPanel({
  vod,
  seekRequest,
  onCurrentTimeChange,
  onUnsync,
  onResync,
  canResync,
  syncPointLabels,
  note,
  coverageGap,
  onSelectVod,
  onDurationKnown,
}: VideoPanelProps) {
  const hold = !!coverageGap;
  // Read by the async player callbacks below (readiness poll, onReady,
  // local metadata), which must not start playback behind the card.
  const holdRef = useRef(hold);
  holdRef.current = hold;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // The raw YouTube player, kept for loadVideoById/destroy. Non-null only
  // while a YouTube VOD is showing.
  const ytPlayerRef = useRef<YTPlayer | null>(null);
  // Whichever player is active, YouTube or local.
  const playerRef = useRef<PlayerAdapter | null>(null);
  const playerReadyRef = useRef(false);

  // Mirrors the latest `seekRequest` synchronously (not via useEffect) so
  // that the player-creation effect always sees the up-to-date target even
  // when `vod` and `seekRequest` change together in the same render.
  const latestSeekRef = useRef<SeekRequest | null>(seekRequest);
  latestSeekRef.current = seekRequest;
  const latestVodIdRef = useRef<number | null>(vod?.id ?? null);
  latestVodIdRef.current = vod?.id ?? null;
  // Read by the playback loop, which only restarts on a VOD switch.
  const latestDurationRef = useRef<number | undefined>(vod?.durationSec);
  latestDurationRef.current = vod?.durationSec;
  const onDurationKnownRef = useRef(onDurationKnown);
  onDurationKnownRef.current = onDurationKnown;

  // Bumped on every reuse-swap so an in-flight readiness poll (below) from
  // an earlier swap can tell it's been superseded and stop.
  const swapGenerationRef = useRef(0);

  const [playerReady, setPlayerReady] = useState(false);
  // Set when the browser can't decode the selected local file.
  const [localError, setLocalError] = useState(false);

  const isLocal = !!vod && isLocalVod(vod);

  function destroyYouTubePlayer() {
    if (ytPlayerRef.current) {
      ytPlayerRef.current.destroy();
      ytPlayerRef.current = null;
    }
    if (containerRef.current) containerRef.current.innerHTML = "";
  }

  /**
   * Polls getDuration() until it's non-zero — the reliable signal that a
   * freshly loadVideoById()'d video has actually loaded its metadata —
   * then applies the exact target seek. Calling seekTo() any earlier
   * (e.g. from the first onStateChange event) gets silently dropped by
   * the YouTube IFrame API and the video just plays from 0 instead.
   */
  function seekOnceReady(generation: number) {
    const player = ytPlayerRef.current;
    if (!player || swapGenerationRef.current !== generation) return;

    if (player.getDuration() > 0) {
      // loadVideoById autoplays; behind the no-coverage card it must not.
      if (holdRef.current) {
        player.pauseVideo();
        return;
      }
      const target = latestSeekRef.current?.time;
      if (target !== undefined) {
        player.seekTo(target, true);
        player.playVideo();
      }
      return;
    }

    setTimeout(() => seekOnceReady(generation), 50);
  }

  /**
   * =========================
   * CREATE / SWAP PLAYER
   * =========================
   * The first VOD selected creates a real YT.Player (cued to its target
   * start time via playerVars.start, so it doesn't start at 0 and jump).
   * Every VOD switch after that REUSES the same player/iframe via
   * loadVideoById instead of destroying and recreating it — tearing down
   * and rebuilding the whole IFrame API embed on every switch was the
   * main source of the load-time delay between VODs.
   */
  useEffect(() => {
    setLocalError(false);

    if (!vod) {
      playerReadyRef.current = false;
      setPlayerReady(false);
      playerRef.current = null;
      destroyYouTubePlayer();
      return;
    }

    // Local file: the <video> element rendered below picks up the new src,
    // and its onLoadedMetadata handler marks the player ready and seeks.
    if (isLocalVod(vod)) {
      playerReadyRef.current = false;
      setPlayerReady(false);
      playerRef.current = null;
      destroyYouTubePlayer();
      return;
    }

    const startTime = latestSeekRef.current?.time;

    // Reuse the existing player: swap the video in place. ytPlayerRef is
    // cleared whenever a local VOD takes over, so this only reuses a
    // YouTube player that's still showing.
    if (ytPlayerRef.current && playerReadyRef.current) {
      swapGenerationRef.current += 1;
      ytPlayerRef.current.loadVideoById({ videoId: vod.videoId, startSeconds: startTime });
      seekOnceReady(swapGenerationRef.current);
      return;
    }

    if (!containerRef.current) return;

    playerReadyRef.current = false;
    setPlayerReady(false);

    const div = document.createElement("div");
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(div);

    const creatingForVodId = vod.id;

    loadYouTubeAPI().then(() => {
      // A different VOD (possibly a local one) may have been selected
      // while the API script loaded.
      if (!containerRef.current || latestVodIdRef.current !== creatingForVodId) return;

      const ytPlayer: YTPlayer = new window.YT.Player(div, {
        videoId: vod.videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 1,
          mute: 1,
          enablejsapi: 1,
          ...(startTime !== undefined ? { start: Math.max(0, Math.floor(startTime)) } : {}),
        },
        events: {
          onReady: (event: YTPlayerEvent) => {
            // Superseded by a local VOD before the iframe finished loading.
            if (ytPlayerRef.current !== ytPlayer) return;
            playerRef.current = youTubeAdapter(ytPlayer);
            playerReadyRef.current = true;
            setPlayerReady(true);

            if (holdRef.current) {
              event.target.pauseVideo();
              return;
            }

            // `start` only has integer-second precision — nudge to the
            // exact target once, then let the video play uninterrupted.
            const target = latestSeekRef.current?.time;
            if (target !== undefined) {
              event.target.seekTo(target, true);
            }
            event.target.playVideo();
          },
        }
      });
      ytPlayerRef.current = ytPlayer;
    });
  }, [vod?.id]);

  // Destroy the player only when the component actually unmounts — VOD
  // switches while mounted reuse the player above instead.
  useEffect(() => {
    return () => {
      if (ytPlayerRef.current) {
        ytPlayerRef.current.destroy();
        ytPlayerRef.current = null;
      }
      playerRef.current = null;
    };
  }, []);

  // Local-file counterpart of the YouTube onReady above: once the browser
  // knows the duration, seeking is reliable, so apply the pending target
  // once and start playing.
  function handleLocalMetadata() {
    const video = videoRef.current;
    if (!video) return;

    const player = videoElementAdapter(video);
    playerRef.current = player;
    playerReadyRef.current = true;
    setPlayerReady(true);
    if (holdRef.current) return;

    const target = latestSeekRef.current?.time;
    if (target !== undefined) player.seekTo(target);
    player.play();
  }

  function handleLocalError() {
    playerRef.current = null;
    playerReadyRef.current = false;
    setPlayerReady(false);
    setLocalError(true);
  }

  /**
   * =========================
   * SEEK HANDLER (ONE-SHOT ONLY)
   * =========================
   * Depends on the whole `seekRequest` object (not just its time), so a
   * repeat click on the same timestamp — which bumps `token` and creates a
   * new object — still re-triggers this effect and re-seeks the player.
   *
   * Fires a single seekTo/playVideo call and nothing else — no follow-up
   * re-seek on a later state-change event, which was what produced the
   * "play, backtrack, play again" stutter.
   */
  useEffect(() => {
    if (seekRequest === null) return;
    if (!playerRef.current || !playerReadyRef.current) return;
    if (holdRef.current) return;

    playerRef.current.seekTo(seekRequest.time);
    playerRef.current.play();
  }, [seekRequest]);

  // Pause when the no-coverage card goes up. The seek that lifts it (a
  // new pull or VOD) starts playback again through the effect above.
  useEffect(() => {
    if (hold && playerReady) playerRef.current?.pause();
  }, [hold, playerReady]);

  /**
   * =========================
   * PLAYBACK SYNC LOOP
   * =========================
   * SINGLE SOURCE OF TRUTH
   */
  useEffect(() => {
    if (!onCurrentTimeChange) return;
    if (!playerReady || !playerRef.current) return;

    const loopVodId = vod?.id;
    const interval = setInterval(() => {
      const time = playerRef.current?.getCurrentTime();

      if (typeof time === "number") {
        onCurrentTimeChange(time);
      }

      // Record the length the first time the player knows it. The page
      // decides whether a later, longer reading is worth re-saving.
      const duration = playerRef.current?.getDuration();
      if (
        loopVodId !== undefined &&
        typeof duration === "number" && duration > 0 &&
        (latestDurationRef.current === undefined || duration > latestDurationRef.current + 30)
      ) {
        onDurationKnownRef.current?.(loopVodId, duration);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [onCurrentTimeChange, playerReady, vod?.id]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <PanelHeader title={vod ? vod.player : "No VOD Selected"} shrinkTitle>
        {vod?.isCalibrated && syncPointLabels && syncPointLabels.length > 1 && (
          <span
            title="This VOD was re-synced after a skip. Each pull uses the latest sync at or before it."
            style={{ fontSize: "11px", color: "var(--ck-text-3)", whiteSpace: "nowrap" }}
          >
            synced at pulls {syncPointLabels.join(", ")}
          </span>
        )}
        {vod?.isCalibrated && onResync && (
          <button
            className="ck-btn ck-btn--arcane ck-btn--sm"
            onClick={onResync}
            disabled={!canResync}
            title="Fixes a skip in the video: this pull and later ones use the new sync; earlier pulls keep theirs. Seek the video to this pull's start first."
          >
            Re-sync from this pull
          </button>
        )}
        {vod?.isCalibrated && onUnsync && (
          <button
            className="ck-btn ck-btn--arcane ck-btn--sm"
            onClick={() => onUnsync(vod.id)}
            title="Clear this VOD's sync so it can be re-aligned"
          >
            Unsync
          </button>
        )}
      </PanelHeader>

      {/* Inset well around the player. Only two things are drawn over the
          iframe: the brief swap note and the no-coverage card. */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", padding: "8px 8px 0" }}>
        <div
          style={{
            flex: 1,
            position: "relative",
            width: "100%",
            height: "100%",
            background: vod ? "#000" : "rgba(0,0,0,0.3)",
            boxShadow: vod
              ? "0 0 0 1px rgba(255,255,255,0.06), 0 2px 10px rgba(0,0,0,0.6)"
              : "inset 0 0 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
          }}
        >
          {/* The YouTube API owns this div's contents (it swaps in its
              iframe), so React never renders children into it. */}
          <div
            ref={containerRef}
            style={{ position: "absolute", inset: 0, display: isLocal ? "none" : "block" }}
          />

          {isLocal && vod?.localFile && !localError && (
            <video
              ref={videoRef}
              src={vod.localFile.objectUrl}
              controls
              playsInline
              onLoadedMetadata={handleLocalMetadata}
              onError={handleLocalError}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", background: "#000" }}
            />
          )}

          {coverageGap && (
            <CoverageGapCard gap={coverageGap} onSelectVod={onSelectVod} />
          )}

          {/* Swap note: drawn over the player briefly, and click-through so
              it never blocks the video's controls. */}
          {note && (
            <div
              key={note.token}
              style={{
                position: "absolute",
                top: "8px",
                left: "50%",
                transform: "translateX(-50%)",
                maxWidth: "calc(100% - 16px)",
                padding: "5px 10px",
                borderRadius: "4px",
                background: "rgba(10, 12, 18, 0.85)",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.08)",
                color: "var(--ck-text-2)",
                fontSize: "12px",
                pointerEvents: "none",
                zIndex: 2,
              }}
            >
              {note.text}
            </div>
          )}

          {isLocal && localError && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: "8px",
                padding: "24px",
                fontSize: "13px",
                lineHeight: 1.55,
                color: "var(--ck-text-2)",
                textAlign: "center",
              }}
            >
              <div style={{ color: "#ff8a8a", fontWeight: 600 }}>
                Your browser can&apos;t play {vod?.localFile?.name ?? "this file"}.
              </div>
              <div>
                In OBS, record as MP4 (or Hybrid MP4), or convert an existing
                recording with File → Remux Recordings. MKV only plays in
                Chrome and Edge; HEVC and AV1 depend on your hardware.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Replaces the video while the synced VOD on screen doesn't cover the
// selected pull: what does cover it (with a button to switch), each synced
// VOD's range, and unsynced VODs that might once synced. The timeline,
// errors and analysis keep working without video.
function CoverageGapCard({
  gap,
  onSelectVod,
}: {
  gap: CoverageGap;
  onSelectVod?: (vodId: number) => void;
}) {
  const where = `pull ${gap.pullNumber} (${gap.logTime} into the log)`;
  const unsyncedCount = gap.unsynced.length;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 1,
        background: "#0b0d12",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: "10px",
        padding: "24px",
        fontSize: "13px",
        lineHeight: 1.55,
        color: "var(--ck-text-2)",
        textAlign: "center",
      }}
    >
      <div style={{ color: "#ff8a8a", fontWeight: 600 }}>
        {gap.covering.length === 0
          ? `No synced VOD covers ${where}.`
          : `${gap.currentLabel}'s VOD doesn't reach ${where}.`}
      </div>

      {gap.covering.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <span>Covered by</span>
          {gap.covering.map(c => (
            <button
              key={c.vodId}
              className="ck-btn ck-btn--arcane ck-btn--sm"
              onClick={() => onSelectVod?.(c.vodId)}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {gap.ranges.length > 0 && (
        <div style={{ color: "var(--ck-text-3)" }}>
          {gap.ranges.map(r => `${r.label}: ${r.range.toLowerCase()}`).join(" · ")}
        </div>
      )}

      {unsyncedCount > 0 && (
        <div style={{ color: "var(--ck-text-3)" }}>
          {unsyncedCount === 1
            ? `${gap.unsynced[0]}'s VOD isn't synced yet. Sync it to use it here.`
            : `${gap.unsynced.join(", ")}'s VODs aren't synced yet. Sync them to use them here.`}
        </div>
      )}
    </div>
  );
}
