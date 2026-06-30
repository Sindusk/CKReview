"use client";

import type { Vod } from "../types/Vod";
import PullList from "../components/PullList";
import type { Pull } from "../types/Pull";

type VODSidebarProps = {
  vods: Vod[];
  selectedVodId: number | null;
  onSelectVod: (id: number) => void;

  pulls: Pull[];
  selectedPullId: number | null;
  onSelectPull: (id: number) => void;
};

export default function VODSidebar({
  vods,
  selectedVodId,
  onSelectVod,
  pulls,
  selectedPullId,
  onSelectPull,
}: VODSidebarProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        border: "1px solid #333",
        backgroundColor: "#0f0f0f",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "10px",
          borderBottom: "1px solid #333",
          fontWeight: "bold",
          backgroundColor: "#1a1a1a",
          flexShrink: 0,
        }}
      >
        VODs
      </div>

      <div
        style={{
          flex: "0 0 28%",
          minHeight: 0,
          overflowY: "auto",
          padding: "8px",
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "8px",
          alignContent: "start",
          borderBottom: "1px solid #333",
        }}
      >
        {vods.length === 0 && (
          <div style={{ color: "#777", fontSize: "14px", gridColumn: "1 / -1" }}>
            No VODs added yet
          </div>
        )}

        {vods.map(vod => {
          const isSelected = vod.id === selectedVodId;

          return (
            <button
              key={vod.id}
              onClick={() => onSelectVod(vod.id)}
              style={{
                textAlign: "left",
                padding: "8px 6px",
                borderRadius: "6px",
                border: isSelected ? "1px solid #3b82f6" : "1px solid #333",
                backgroundColor: isSelected ? "#1e293b" : "#111",
                color: "white",
                cursor: "pointer",
                minHeight: "70px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                overflow: "hidden",
              }}
            >
              <div style={{ fontWeight: "bold", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {vod.player}
              </div>
              <div style={{ fontSize: "10px", color: "#aaa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {vod.url.length > 18 ? vod.url.slice(0, 18) + "..." : vod.url}
              </div>
            </button>
          );
        })}
      </div>

      <PullList
        pulls={pulls}
        selectedPullId={selectedPullId}
        onSelectPull={onSelectPull}
      />
    </div>
  );
}