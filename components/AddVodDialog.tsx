"use client";

import { useState } from "react";

type AddVodDialogProps = {
  open: boolean;
  onCancel: () => void;
  onAdd: (player: string, url: string) => void;
};

export default function AddVodDialog({ open, onCancel, onAdd }: AddVodDialogProps) {
  const [player, setPlayer] = useState("");
  const [url, setUrl] = useState("");

  if (!open) {
    return null;
  }

  function handleAdd() {
    if (!player.trim() || !url.trim()) return;

    onAdd(player.trim(), url.trim());
    setPlayer("");
    setUrl("");
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "#222",
          padding: "24px",
          borderRadius: "10px",
          width: "500px",
          color: "white",
          border: "1px solid #444",
          boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: "16px", fontSize: "20px" }}>Add VOD</h2>

        <div style={{ marginBottom: "14px" }}>
          <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#ddd" }}>
            Player / Perspective
          </label>
          <input
            className="ck-input"
            value={player}
            onChange={e => setPlayer(e.target.value)}
            placeholder="e.g. Koro"
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#ddd" }}>
            YouTube URL
          </label>
          <input
            className="ck-input"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <button
            onClick={onCancel}
            style={{
              backgroundColor: "#2f2f2f",
              color: "#f3f4f6",
              border: "1px solid #555",
              borderRadius: "6px",
              padding: "8px 14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            style={{
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "6px",
              padding: "8px 14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}