"use client";

import { useEffect, useRef, useState } from "react";
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
  loadVideoById(options: { videoId: string; startSeconds?: number }): void;
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

  // Set right before a loadVideoById() reuse-swap. VideoPanel is a child
  // component, so its effects run BEFORE the parent hook's effect that
  // recomputes the correct seek target for the new VOD — meaning the
  // startSeconds passed to loadVideoById here is often one render stale.
  // A seekTo() issued immediately after (from the SEEK HANDLER effect,
  // once the corrected target lands) can get silently dropped because the
  // player is still loading the newly-swapped video. This flag makes the
  // NEXT state-change event re-apply whatever the freshest known target is
  // (read at fire time, so it's correct by then) exactly once.
  const awaitingReuseLoadRef = useRef(false);

  const [playerReady, setPlayerReady] = useState(false);

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
      awaitingReuseLoadRef.current = true;
      console.log("[VideoPanel] REUSE swap", { vodId: vod.videoId, startTime, seekRequestProp: seekRequest });
      playerRef.current.loadVideoById({ videoId: vod.videoId, startSeconds: startTime });
      return;
    }

    console.log("[VideoPanel] CREATE new player", { vodId: vod.videoId, startTime, seekRequestProp: seekRequest, hadPlayer: !!playerRef.current, wasReady: playerReadyRef.current });

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

          onStateChange: (event: YTOnStateChangeEvent) => {
            console.log("[VideoPanel] onStateChange", { data: event.data, awaiting: awaitingReuseLoadRef.current, target: latestSeekRef.current?.time });
            if (!awaitingReuseLoadRef.current || !playerRef.current) return;
            awaitingReuseLoadRef.current = false;

            const target = latestSeekRef.current?.time;
            if (target !== undefined) {
              playerRef.current.seekTo(target, true);
              playerRef.current.playVideo();
            }
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
    console.log("[VideoPanel] SEEK HANDLER effect", { seekRequest, hasPlayer: !!playerRef.current, ready: playerReadyRef.current });
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
      <div
        style={{
          padding: "8px 10px",
          background: "#1a1a1a",
          borderBottom: "1px solid #2a2a2a",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <span style={{ fontWeight: 700, color: "#f8fafc", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {vod ? vod.player : "No VOD Selected"}
        </span>

        {vod?.isCalibrated && onUnsync && (
          <button
            onClick={() => onUnsync(vod.id)}
            title="Clear this VOD's sync so it can be re-aligned"
            style={{
              backgroundColor: "transparent",
              color: "#60a5fa",
              border: "1px solid #2563eb",
              borderRadius: "6px",
              padding: "4px 10px",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Unsync
          </button>
        )}
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
