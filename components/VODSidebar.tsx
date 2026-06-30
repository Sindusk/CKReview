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
      {/* HEADER */}
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

      {/* LIST */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {vods.length === 0 && (
          <div style={{ color: "#777", fontSize: "14px" }}>
            No VODs added yet
          </div>
        )}

        {vods.map((vod) => {
          const isSelected = vod.id === selectedVodId;

          return (
            <button
              key={vod.id}
              onClick={() => onSelectVod(vod.id)}
              style={{
                textAlign: "left",
                padding: "10px",
                borderRadius: "6px",
                border: isSelected
                  ? "1px solid #3b82f6"
                  : "1px solid #333",
                backgroundColor: isSelected ? "#1e293b" : "#111",
                color: "white",
                cursor: "pointer",
              }}
            >
              <div style={{ fontWeight: "bold" }}>{vod.player}</div>
              <div style={{ fontSize: "12px", color: "#aaa" }}>
                {vod.url.length > 30
                  ? vod.url.slice(0, 30) + "..."
                  : vod.url}
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