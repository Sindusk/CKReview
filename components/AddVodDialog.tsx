"use client";

import { useState } from "react";

type AddVodDialogProps = {
  open: boolean;
  onCancel: () => void;
  onAdd: (player: string, url: string, reportCode?: string) => void;
};

export default function AddVodDialog({
  open,
  onCancel,
  onAdd,
}: AddVodDialogProps) {
  const [player, setPlayer] = useState("");
  const [url, setUrl] = useState("");
  const [reportCode, setReportCode] = useState("");

  if (!open) {
    return null;
  }

  function handleAdd() {
    onAdd(player.trim(), url.trim(), reportCode.trim());

    setPlayer("");
    setUrl("");
    setReportCode("");
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
      }}
    >
      <div
        style={{
          backgroundColor: "#2a2a2a",
          padding: "24px",
          borderRadius: "8px",
          width: "500px",
          color: "white",
          border: "1px solid #555",
        }}
      >
        <h2>Add VOD</h2>

        <div style={{ marginBottom: "16px" }}>
          <label>Player / Perspective</label>

          <input
            style={{
              width: "100%",
              padding: "8px",
              marginTop: "4px",
              color: "black",
              backgroundColor: "white",
            }}
            value={player}
            onChange={(e) => setPlayer(e.target.value)}
          />
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label>Warcraft Logs report code or URL</label>

          <input
            style={{
              width: "100%",
              padding: "8px",
              marginTop: "4px",
              color: "black",
              backgroundColor: "white",
            }}
            value={reportCode}
            onChange={(e) => setReportCode(e.target.value)}
            placeholder="Optional. Example: abc123def456"
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label>YouTube URL</label>

          <input
            style={{
              width: "100%",
              padding: "8px",
              marginTop: "4px",
              color: "black",
              backgroundColor: "white",
            }}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
          }}
        >
          <button onClick={onCancel}>Cancel</button>

          <button onClick={handleAdd}>Add</button>
        </div>
      </div>
    </div>
  );
}