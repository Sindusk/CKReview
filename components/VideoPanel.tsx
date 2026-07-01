"use client";

import { useEffect, useRef } from "react";
import type { Vod } from "@/types/Vod";
import type { SeekRequest } from "@/hooks/useTimelineController";

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
};

type YTPlayerEvent = {
  target: YTPlayer;
};

type YTOnStateChangeEvent = {
  data: number;
  target: YTPlayer;
};

type VideoPanelProps = {
  vod: Vod | null;

  // ONE-TIME SEEK COMMAND ONLY. `token` is bumped on every request so that
  // seeking to the same time twice in a row still re-fires the effect below.
  seekRequest: SeekRequest | null;

  // continuous playback reporting
  onCurrentTimeChange?: (time: number) => void;
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
}: VideoPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const playerReadyRef = useRef(false);
  const pendingSeekRef = useRef<number | null>(null);

  /**
   * =========================
   * CREATE / DESTROY PLAYER
   * =========================
   */
  useEffect(() => {
    if (!vod || !containerRef.current) return;

    playerReadyRef.current = false;
    pendingSeekRef.current = null;

    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }

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
        },
        events: {
          onReady: (event: YTPlayerEvent) => {
            playerReadyRef.current = true;

            if (pendingSeekRef.current !== null) {
              const time = pendingSeekRef.current;

              event.target.seekTo(time, true);
              event.target.playVideo();
            }
          },

          onStateChange: (event: YTOnStateChangeEvent) => {
            // 1 = playing
            if (event.data === 1 && pendingSeekRef.current !== null) {
              const time = pendingSeekRef.current;

              event.target.seekTo(time, true);
              pendingSeekRef.current = null;

              // ensure playback continues after late seek
              event.target.playVideo();
            }
          },
        }
      });
    });

    return () => {
      playerReadyRef.current = false;

      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [vod?.id]);

  /**
   * =========================
   * SEEK HANDLER (ONE-SHOT ONLY)
   * =========================
   * Depends on the whole `seekRequest` object (not just its time), so a
   * repeat click on the same timestamp — which bumps `token` and creates a
   * new object — still re-triggers this effect and re-seeks the player.
   */
  useEffect(() => {
    if (seekRequest === null) return;

    const { time } = seekRequest;

    // Always store latest seek
    pendingSeekRef.current = time;

    if (!playerRef.current || !playerReadyRef.current) return;

    playerRef.current.seekTo(time, true);
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
    if (!playerRef.current) return;

    const interval = setInterval(() => {
      const time = playerRef.current?.getCurrentTime();

      if (typeof time === "number") {
        onCurrentTimeChange(time);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [onCurrentTimeChange]);

  /**
   * Fix for seeking not occurring when swapping VOD's.
   */
  useEffect(() => {
    if (!vod || seekRequest === null) return;

    // When VOD changes, ALWAYS re-arm seek
    pendingSeekRef.current = seekRequest.time;

    if (playerRef.current && playerReadyRef.current) {
      playerRef.current.seekTo(seekRequest.time, true);
      playerRef.current.playVideo();
    }
  }, [vod?.id]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "8px 10px",
          background: "#1a1a1a",
          borderBottom: "1px solid #2a2a2a",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontWeight: 700,
          color: "#f8fafc",
        }}
      >
        {vod ? vod.player : "No VOD Selected"}
      </div>

      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: "relative",
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}
