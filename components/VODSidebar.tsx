"use client";

import { useEffect, useState } from "react";
import { isLocalVod, isTwitchVod, type Vod } from "../types/Vod";
import PullList from "../components/PullList";
import { Panel, PanelHeader } from "./ui/Panel";
import { LineGlyph } from "./ui/LineGlyph";
import type { Pull } from "../types/Pull";
import { coveredRangeLabel, isSynced } from "../lib/vod-sync";

// Module-level cache (not component state) so switching pulls/remounting
// this sidebar doesn't re-fetch a title we already have this session.
const titleCache = new Map<string, string>();

// YouTube's oEmbed endpoint is public, keyless, and CORS-enabled — good
// enough for a "what video is this" label without wiring up a real API key
// or persisting the title alongside the VOD.
// Pass null to skip the fetch (local VODs have no YouTube video).
function useYouTubeTitle(videoId: string | null): string | null {
  const [title, setTitle] = useState<string | null>(videoId ? titleCache.get(videoId) ?? null : null);

  useEffect(() => {
    if (!videoId) return;
    const cached = titleCache.get(videoId);
    if (cached) {
      setTitle(cached);
      return;
    }

    let cancelled = false;
    fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelled || !data?.title) return;
        titleCache.set(videoId, data.title);
        setTitle(data.title);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [videoId]);

  return title;
}

type VODSidebarProps = {
  vods: Vod[];
  selectedVodId: number | null;
  onSelectVod: (id: number) => void;
  onOpenTranscript: (id: number) => void;
  onAddVod: () => void;

  pulls: Pull[];
  selectedPullId: number | null;
  onSelectPull: (id: number) => void;
};

export default function VODSidebar({
  vods,
  selectedVodId,
  onSelectVod,
  onOpenTranscript,
  onAddVod,
  pulls,
  selectedPullId,
  onSelectPull,
}: VODSidebarProps) {
  // Two stacked Panels, mirroring the Roster/Analysis pair in the left
  // column. The column itself doesn't clip: the Panels' corner ornaments
  // overhang it.
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        minHeight: 0,
      }}
    >
      <Panel style={{ flex: "0 0 auto" }}>
        <PanelHeader title="VODs" count={vods.length > 0 ? `(${vods.length})` : undefined}>
          <button className="ck-btn" onClick={onAddVod} title="Add a YouTube, Twitch or local VOD to watch alongside the pulls">
            <LineGlyph name="add" size={14} strokeWidth={2} />
            Add VOD
          </button>
        </PanelHeader>

        {/*
          Fixed to the height of a single row of VOD cards. With ~3 VODs this
          never needs to scroll; a 4th+ VOD just scrolls horizontally instead
          of eating vertical space that PullList needs below.
        */}
        <div
          style={{
            flex:       "0 0 auto",
            height:     "112px",
            minHeight:  0,
            overflowX:  "auto",
            overflowY:  "hidden",
            padding:    "8px",
            boxSizing:  "border-box",
            display:    "flex",
            flexWrap:   "nowrap",
            gap:        "8px",
          }}
        >
          {vods.length === 0 && (
            <div style={{ color: "var(--ck-text-3)", fontSize: "13px", alignSelf: "center", paddingLeft: "4px" }}>
              No VODs added yet
            </div>
          )}

          {vods.map(vod => (
            <VodCard
              key={vod.id}
              vod={vod}
              rangeLabel={isSynced(vod) ? coveredRangeLabel(vod, pulls) : null}
              isSelected={vod.id === selectedVodId}
              onSelectVod={onSelectVod}
              onOpenTranscript={onOpenTranscript}
            />
          ))}
        </div>
      </Panel>

      <Panel style={{ flex: "1 1 0" }}>
        <PullList
          pulls={pulls}
          selectedPullId={selectedPullId}
          onSelectPull={onSelectPull}
        />
      </Panel>
    </div>
  );
}

function VodCard({
  vod,
  rangeLabel,
  isSelected,
  onSelectVod,
  onOpenTranscript,
}: {
  vod: Vod;
  // Pulls this synced VOD covers ("Pulls 1–40", lib/vod-sync.ts), shown
  // beside the source icon so an auto-swap is predictable. Null if unsynced.
  rangeLabel: string | null;
  isSelected: boolean;
  onSelectVod: (id: number) => void;
  onOpenTranscript: (id: number) => void;
}) {
  const local = isLocalVod(vod);
  const twitch = isTwitchVod(vod);
  const youTubeTitle = useYouTubeTitle(local || twitch ? null : vod.videoId);
  // Twitch has no keyless title lookup (its API needs a registered app), so
  // the card shows the VOD's ID instead.
  const title = local ? vod.localFile?.name ?? null
    : twitch ? `twitch.tv/videos/${vod.videoId}`
    : youTubeTitle;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelectVod(vod.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelectVod(vod.id);
        }
      }}
      className={`ck-card ck-card--interactive${isSelected ? " ck-card--selected" : ""}`}
      style={{
        textAlign: "left",
        padding: "8px 6px",
        boxSizing: "border-box",
        color: "var(--ck-text)",
        width: "150px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "4px" }}>
        <div style={{ width: "18px", flexShrink: 0 }} />
        <div style={{ fontWeight: 700, fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center", flex: 1, color: isSelected ? "#e1f0ff" : "var(--ck-text)" }}>
          {vod.player}
        </div>
        {/* Transcripts come from YouTube, so local files and Twitch VODs
            have none. The spacer keeps the player name centred either way. */}
        {local || twitch ? (
          <div style={{ width: "18px", flexShrink: 0 }} />
        ) : (
          <button
            className="ck-btn"
            title="View transcript"
            onClick={(e) => { e.stopPropagation(); onOpenTranscript(vod.id); }}
            style={{ width: "18px", height: "18px", padding: 0, fontSize: "10px" }}
          >
            T
          </button>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", padding: "4px 0" }}>
        {local ? (
          <span
            className="ck-badge"
            title="Local file: plays from this device only and is never uploaded. Pick it again after a refresh."
          >
            Local
          </span>
        ) : twitch ? (
          // Twitch icon: a purple speech-bubble screen.
          <svg viewBox="0 0 24 26" width="16" height="17" aria-label="Twitch">
            <title>Twitch VOD: past broadcasts expire after 7–60 days</title>
            <path d="M2 0 L0 5 V23 H6 V26 H9 L12 23 H17 L24 16 V0 Z" fill="#a78bfa" opacity="0.9" />
            <path d="M4 2 H22 V15 L18 19 H12 L9 22 V19 H4 Z" fill="#1a1a1a" />
            <rect x="10" y="6" width="2" height="6" fill="#a78bfa" />
            <rect x="16" y="6" width="2" height="6" fill="#a78bfa" />
          </svg>
        ) : (
          // YouTube icon — marks the source at a glance instead of
          // spelling out the URL as plain text.
          <svg viewBox="0 0 28 20" width="24" height="17" aria-hidden="true">
            <rect x="0" y="0" width="28" height="20" rx="5" fill="#f87171" opacity="0.85" />
            <path d="M11 6 L19 10 L11 14 Z" fill="#1a1a1a" />
          </svg>
        )}
        {rangeLabel && (
          <span
            title={vod.durationSec === undefined
              ? "Covered pulls. The video's length isn't known until it plays once, so this may run past its end."
              : "Pulls whose start is in this VOD"}
            style={{ fontSize: "10px", color: "var(--ck-text-3)", whiteSpace: "nowrap" }}
          >
            {rangeLabel}
          </span>
        )}
      </div>

      {/* YouTube title from the oEmbed endpoint, the local file's name, or
          the Twitch VOD's path. */}
      <div
        title={title ?? undefined}
        style={{
          fontSize: "10px",
          color: "var(--ck-text-2)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          textAlign: "center",
        }}
      >
        {title ?? " "}
      </div>
    </div>
  );
}
