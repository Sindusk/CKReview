"use client";

import { useEffect, useRef, useState } from "react";
import type { Vod } from "@/types/Vod";
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
  getCurrentTime(): number;
  getDuration(): number;
  loadVideoById(options: { videoId: string; startSeconds?: number }): void;
};

type YTPlayerEvent = {
  target: YTPlayer;
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
}: VideoPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const playerReadyRef = useRef(false);

  // Mirrors the latest `seekRequest` synchronously (not via useEffect) so
  // that the player-creation effect always sees the up-to-date target even
  // when `vod` and `seekRequest` change together in the same render.
  const latestSeekRef = useRef<SeekRequest | null>(seekRequest);
  latestSeekRef.current = seekRequest;

  // Bumped on every reuse-swap so an in-flight readiness poll (below) from
  // an earlier swap can tell it's been superseded and stop.
  const swapGenerationRef = useRef(0);

  const [playerReady, setPlayerReady] = useState(false);

  /**
   * Polls getDuration() until it's non-zero — the reliable signal that a
   * freshly loadVideoById()'d video has actually loaded its metadata —
   * then applies the exact target seek. Calling seekTo() any earlier
   * (e.g. from the first onStateChange event) gets silently dropped by
   * the YouTube IFrame API and the video just plays from 0 instead.
   */
  function seekOnceReady(generation: number) {
    const player = playerRef.current;
    if (!player || swapGenerationRef.current !== generation) return;

    if (player.getDuration() > 0) {
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
    if (!vod) {
      playerReadyRef.current = false;
      setPlayerReady(false);

      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      return;
    }

    const startTime = latestSeekRef.current?.time;

    // Reuse the existing player: swap the video in place.
    if (playerRef.current && playerReadyRef.current) {
      swapGenerationRef.current += 1;
      playerRef.current.loadVideoById({ videoId: vod.videoId, startSeconds: startTime });
      seekOnceReady(swapGenerationRef.current);
      return;
    }

    if (!containerRef.current) return;

    playerReadyRef.current = false;
    setPlayerReady(false);

    const div = document.createElement("div");
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(div);

    loadYouTubeAPI().then(() => {
      if (!containerRef.current) return;

      playerRef.current = new window.YT.Player(div, {
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
            playerReadyRef.current = true;
            setPlayerReady(true);

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
    });
  }, [vod?.id]);

  // Destroy the player only when the component actually unmounts — VOD
  // switches while mounted reuse the player above instead.
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, []);

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

    playerRef.current.seekTo(seekRequest.time, true);
    playerRef.current.playVideo();
  }, [seekRequest]);

  /**
   * =========================
   * PLAYBACK SYNC LOOP
   * =========================
   * SINGLE SOURCE OF TRUTH
   */
  useEffect(() => {
    if (!onCurrentTimeChange) return;
    if (!playerReady || !playerRef.current) return;

    const interval = setInterval(() => {
      const time = playerRef.current?.getCurrentTime();

      if (typeof time === "number") {
        onCurrentTimeChange(time);
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

      {/* Inset well around the player — nothing is drawn over the iframe. */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", padding: "8px 8px 0" }}>
        <div
          ref={containerRef}
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
        />
      </div>
    </div>
  );
}
