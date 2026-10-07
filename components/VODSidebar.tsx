"use client";

import { useEffect, useState } from "react";
import { isLocalVod, type Vod } from "../types/Vod";
import PullList from "../components/PullList";
import { Panel, PanelHeader } from "./ui/Panel";
import type { Pull } from "../types/Pull";

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

  pulls: Pull[];
  selectedPullId: number | null;
  onSelectPull: (id: number) => void;
};

export default function VODSidebar({
  vods,
  selectedVodId,
  onSelectVod,
  onOpenTranscript,
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
        <PanelHeader title="VODs" count={vods.length > 0 ? `(${vods.length})` : undefined} />

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
  isSelected,
  onSelectVod,
  onOpenTranscript,
}: {
  vod: Vod;
  isSelected: boolean;
  onSelectVod: (id: number) => void;
  onOpenTranscript: (id: number) => void;
}) {
  const local = isLocalVod(vod);
  const youTubeTitle = useYouTubeTitle(local ? null : vod.videoId);
  const title = local ? vod.localFile?.name ?? null : youTubeTitle;

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
        {/* Transcripts come from YouTube, so local files have none. The
            spacer keeps the player name centred either way. */}
        {local ? (
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

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "4px 0" }}>
        {local ? (
          <span
            className="ck-badge"
            title="Local file: plays from this device only and is never uploaded. Pick it again after a refresh."
          >
            Local
          </span>
        ) : (
          // YouTube icon — marks the source at a glance instead of
          // spelling out the URL as plain text.
          <svg viewBox="0 0 28 20" width="24" height="17" aria-hidden="true">
            <rect x="0" y="0" width="28" height="20" rx="5" fill="#f87171" opacity="0.85" />
            <path d="M11 6 L19 10 L11 14 Z" fill="#1a1a1a" />
          </svg>
        )}
      </div>

      {/* YouTube title from the oEmbed endpoint, or the local file's name. */}
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
