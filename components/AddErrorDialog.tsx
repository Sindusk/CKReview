"use client";

// components/AddErrorDialog.tsx
//
// Lets the user manually add a Major/Minor/Raid error to the current pull,
// attributed to a specific roster player (or raid-wide, for Raid severity —
// same convention as auto-detected Raid errors, which never carry a
// player/class/role — see types/PullError.ts).

import { useEffect, useRef, useState } from "react";
import type { PlayerInfo } from "@/types/PlayerInfo";
import type { ManualErrorInput } from "@/types/PullError";
import { getPlayerSpecIcon } from "@/lib/player-display";

type Severity = "Major" | "Minor" | "Raid";

type AddErrorDialogProps = {
  open:               boolean;
  players:            PlayerInfo[];         // already filtered to real players — see AnalysisPanel
  defaultTimestampMs: number | null;         // current VOD playback time, or null if no VOD loaded
  onCancel:           () => void;
  onAdd:              (input: ManualErrorInput) => void;
};

function formatTimeInput(ms: number): string {
  const totalSec = Math.max(0, ms) / 1000;
  const m = Math.floor(totalSec / 60);
  const s = totalSec - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}

// Accepts "M:SS", "M:SS.ss", or a bare number of seconds. Returns ms, or
// null if unparseable/blank.
function parseTimeInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d+):(\d+(?:\.\d+)?)$/);
  if (match) {
    const mins = parseInt(match[1], 10);
    const secs = parseFloat(match[2]);
    return Math.round((mins * 60 + secs) * 1000);
  }

  const asSeconds = Number(trimmed);
  if (!Number.isNaN(asSeconds)) return Math.round(asSeconds * 1000);

  return null;
}

const SEVERITIES: Severity[] = ["Major", "Minor", "Raid"];

// ─── PlayerSelect ───────────────────────────────────────────────────────────
//
// A native <select> can't render an <img> inside its options in any
// cross-browser-reliable way, so the player picker is a small custom
// dropdown instead: a button showing the selected player's spec/job icon +
// name (no spec/class text, per product decision for this dialog
// specifically), opening a list of the same for every roster player.

function PlayerSelect({
  players,
  value,
  onChange,
}: {
  players: PlayerInfo[];
  value:   string;
  onChange: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = players.find((p) => p.name === value);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="ck-select"
        style={{ display: "flex", alignItems: "center", gap: "8px", textAlign: "left" }}
      >
        {selected && (
          <img
            src={getPlayerSpecIcon(selected.game, selected.specId, selected.className)}
            alt=""
            width={20}
            height={20}
            style={{ borderRadius: "4px", flexShrink: 0 }}
            onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
          />
        )}
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected?.name ?? "Select a player"}
        </span>
        <span style={{ fontSize: "10px", color: "#888", flexShrink: 0 }}>▾</span>
      </button>

      {open && (
        <div
          style={{
            position:        "absolute",
            top:             "calc(100% + 4px)",
            left:            0,
            right:           0,
            backgroundColor: "#1a1a1a",
            border:          "1px solid #444",
            borderRadius:    "6px",
            maxHeight:       "220px",
            overflowY:       "auto",
            zIndex:          20,
            boxShadow:       "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          {players.map((p) => {
            const isSelected = p.name === value;
            return (
              <div
                key={p.actorId}
                onClick={() => { onChange(p.name); setOpen(false); }}
                style={{
                  display:         "flex",
                  alignItems:      "center",
                  gap:             "8px",
                  padding:         "7px 10px",
                  cursor:          "pointer",
                  backgroundColor: isSelected ? "#2a2a2a" : "transparent",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#2a2a2a"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isSelected ? "#2a2a2a" : "transparent"; }}
              >
                <img
                  src={getPlayerSpecIcon(p.game, p.specId, p.className)}
                  alt=""
                  width={20}
                  height={20}
                  style={{ borderRadius: "4px", flexShrink: 0 }}
                  onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
                />
                <span style={{ fontSize: "13px", color: "#e5e7eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.name}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AddErrorDialog({
  open,
  players,
  defaultTimestampMs,
  onCancel,
  onAdd,
}: AddErrorDialogProps) {
  const [playerName, setPlayerName] = useState("");
  const [severity, setSeverity]     = useState<Severity>("Major");
  const [name, setName]             = useState("");
  const [description, setDescription] = useState("");
  const [timeInput, setTimeInput]   = useState("");

  // Reset the form fresh every time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setPlayerName(players[0]?.name ?? "");
    setSeverity("Major");
    setName("");
    setDescription("");
    setTimeInput(defaultTimestampMs !== null ? formatTimeInput(defaultTimestampMs) : "");
  }, [open, defaultTimestampMs, players]);

  if (!open) return null;

  const needsPlayer = severity !== "Raid";
  const selectedPlayer = needsPlayer ? players.find((p) => p.name === playerName) : undefined;
  const canSubmit = name.trim().length > 0 && (!needsPlayer || !!selectedPlayer);

  function handleAdd() {
    if (!canSubmit) return;

    const parsedMs = parseTimeInput(timeInput);

    onAdd({
      severity,
      name:        name.trim(),
      description: description.trim(),
      timestamp:   parsedMs ?? 0,
      player:      selectedPlayer?.name,
      class:       selectedPlayer?.className,
      specId:      selectedPlayer?.specId,
      role:        selectedPlayer?.role,
    });
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
          width: "440px",
          color: "white",
          border: "1px solid #444",
          boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: "16px", fontSize: "20px" }}>Add Error</h2>

        {needsPlayer && (
          <div style={{ marginBottom: "14px" }}>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#ddd" }}>
              Player
            </label>
            {players.length === 0 ? (
              <div style={{ fontSize: "12px", color: "#888" }}>
                No players available on this pull's roster.
              </div>
            ) : (
              <PlayerSelect players={players} value={playerName} onChange={setPlayerName} />
            )}
          </div>
        )}

        <div style={{ marginBottom: "14px", display: "flex", gap: "10px" }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#ddd" }}>
              Type
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as Severity)}
              className="ck-select"
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div style={{ width: "120px" }}>
            <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#ddd" }}>
              Timestamp
            </label>
            <input
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              placeholder="0:00"
              className="ck-input"
            />
          </div>
        </div>

        <div style={{ marginBottom: "14px" }}>
          <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#ddd" }}>
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Stood in Void Zone"
            className="ck-input"
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "4px", fontSize: "13px", color: "#ddd" }}>
            Note
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional details…"
            rows={3}
            className="ck-textarea"
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
            disabled={!canSubmit}
            style={{
              backgroundColor: canSubmit ? "#2563eb" : "#1e3a5f",
              color: canSubmit ? "white" : "#5b7699",
              border: "none",
              borderRadius: "6px",
              padding: "8px 14px",
              fontWeight: 600,
              cursor: canSubmit ? "pointer" : "default",
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}