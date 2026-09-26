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
import { Dialog, Field } from "./ui/Dialog";

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
            style={{ borderRadius: "3px", flexShrink: 0 }}
            onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
          />
        )}
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected?.name ?? "Select a player"}
        </span>
        <span style={{ fontSize: "10px", color: "var(--ck-text-gold)", flexShrink: 0 }}>▾</span>
      </button>

      {open && (
        <div
          className="ck-menu"
          style={{
            position:  "absolute",
            top:       "calc(100% + 4px)",
            left:      0,
            right:     0,
            padding:   "4px",
            maxHeight: "220px",
            overflowY: "auto",
            zIndex:    20,
          }}
        >
          {players.map((p) => (
            <div
              key={p.actorId}
              onClick={() => { onChange(p.name); setOpen(false); }}
              className={`ck-menu-item${p.name === value ? " ck-menu-item--selected" : ""}`}
              style={{ gap: "8px", padding: "6px 8px" }}
            >
              <img
                src={getPlayerSpecIcon(p.game, p.specId, p.className)}
                alt=""
                width={20}
                height={20}
                style={{ borderRadius: "3px", flexShrink: 0 }}
                onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
              />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.name}
              </span>
            </div>
          ))}
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

  // Reset the form fresh whenever the dialog transitions from closed to
  // open — NOT on every re-render while it stays open. defaultTimestampMs
  // (live VOD playback time) and players (a freshly-filtered array each
  // render) both change continuously while playback runs, so including them
  // in the dependency array would re-run this effect every tick and wipe
  // out in-progress edits.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setPlayerName(players[0]?.name ?? "");
      setSeverity("Major");
      setName("");
      setDescription("");
      setTimeInput(defaultTimestampMs !== null ? formatTimeInput(defaultTimestampMs) : "");
    }
    wasOpenRef.current = open;
  });

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
    <Dialog
      title="Add Error"
      width="460px"
      // The body must not clip: the player dropdown overhangs it.
      bodyStyle={{ overflowY: "visible" }}
      footer={
        <>
          <button className="ck-btn ck-btn--md" onClick={onCancel}>Cancel</button>
          <button className="ck-btn ck-btn--md ck-btn--primary" onClick={handleAdd} disabled={!canSubmit}>Add</button>
        </>
      }
    >
      {needsPlayer && (
        <Field label="Player">
          {players.length === 0 ? (
            <div style={{ fontSize: "12px", color: "var(--ck-text-3)" }}>
              No players available on this pull&apos;s roster.
            </div>
          ) : (
            <PlayerSelect players={players} value={playerName} onChange={setPlayerName} />
          )}
        </Field>
      )}

      <div style={{ display: "flex", gap: "10px" }}>
        <Field label="Type" style={{ flex: 1 }}>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as Severity)}
            className="ck-select"
          >
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>

        <Field label="Timestamp" style={{ width: "120px" }}>
          <input
            value={timeInput}
            onChange={(e) => setTimeInput(e.target.value)}
            placeholder="0:00"
            className="ck-input ck-num"
          />
        </Field>
      </div>

      <Field label="Name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Stood in Void Zone"
          className="ck-input"
        />
      </Field>

      <Field label="Note" style={{ marginBottom: 0 }}>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional details…"
          rows={3}
          className="ck-textarea"
        />
      </Field>
    </Dialog>
  );
}