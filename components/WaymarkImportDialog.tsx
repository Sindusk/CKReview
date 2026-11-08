"use client";

// components/WaymarkImportDialog.tsx
//
// Replay → Import waymarks: paste a WaymarkPresetPlugin / Waymark Librarian
// preset (JSON), check what it holds, name it and save it to the account
// for this fight (hooks/useUserWaymarks.ts). Warns, without blocking, when
// the preset's MapID names a different duty than this fight
// (FightReplay.waymarkMapId), and when the name replaces one already saved.

import { useEffect, useMemo, useState } from "react";
import { Dialog, Field } from "./ui/Dialog";
import { MAX_PRESET_NAME, parseWaymarkPresetJson, WAYMARK_COLORS, WAYMARK_LABELS } from "@/lib/replay/waymarks";
import type { UserWaymarkPreset } from "@/hooks/useUserWaymarks";

type Props = {
  open:          boolean;
  fightName:     string;
  fightMapId?:   number;
  signedIn:      boolean;
  existingNames: string[];
  onSave:        (p: UserWaymarkPreset) => Promise<string | null>;
  onClose:       () => void;
};

const EXAMPLE = `{
  "Name": "12y Waymarks",
  "MapID": 1094,
  "A": { "X": 100.0, "Y": 0.0, "Z": 88.0, "ID": 0, "Active": true },
  ...
}`;

export default function WaymarkImportDialog({ open, fightName, fightMapId, signedIn, existingNames, onSave, onClose }: Props) {
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setText(""); setName(""); setError(null); } }, [open]);

  const parsed = useMemo(() => (text.trim() ? parseWaymarkPresetJson(text) : null), [text]);
  // A fresh paste fills the name from the preset's own.
  useEffect(() => { if (parsed?.ok) setName(parsed.name); }, [parsed]);

  if (!open) return null;

  const trimmed = name.trim();
  const otherDuty = parsed?.ok && parsed.mapId !== null && fightMapId !== undefined && parsed.mapId !== fightMapId;
  const replaces = existingNames.includes(trimmed);
  const canSave = signedIn && parsed?.ok && trimmed.length > 0 && !busy;

  async function save() {
    if (!parsed?.ok) return;
    if (!trimmed) { setError("Give the preset a name"); return; }
    setBusy(true);
    setError(null);
    const err = await onSave({ name: trimmed, marks: parsed.marks, mapId: parsed.mapId });
    setBusy(false);
    if (err) setError(err);
    else onClose();
  }

  return (
    <Dialog
      title="Import waymarks"
      subtitle={fightName}
      width="520px"
      onClose={onClose}
      footer={
        <>
          <button className="ck-btn ck-btn--md" onClick={onClose}>Cancel</button>
          <button className="ck-btn ck-btn--md ck-btn--primary" disabled={!canSave} onClick={save}>
            {busy ? "Saving…" : replaces ? "Replace preset" : "Save preset"}
          </button>
        </>
      }
    >
      <p style={{ marginTop: 0, color: "var(--ck-text-2)", fontSize: 13 }}>
        Paste a preset exported from Waymark Preset (Dalamud) or Waymark Librarian. It&apos;s saved to your account
        for {fightName} and shows in the replay&apos;s Waymarks dropdown.
      </p>
      {!signedIn && (
        <div style={{ color: "#e06c6c", fontSize: 13, marginBottom: 12 }}>Sign in to save waymark presets.</div>
      )}
      <Field label="Preset JSON">
        <textarea className="ck-textarea" rows={9} value={text} placeholder={EXAMPLE} spellCheck={false}
          onChange={(e) => { setText(e.target.value); setError(null); }}
          style={{ width: "100%", fontFamily: "ui-monospace, Consolas, monospace", fontSize: 12, boxSizing: "border-box" }} />
      </Field>
      {parsed && "error" in parsed && <div style={{ color: "#e06c6c", fontSize: 13, marginBottom: 12 }}>{parsed.error}</div>}
      {parsed?.ok && (
        <>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 12, fontSize: 13, color: "var(--ck-text-2)" }}>
            {parsed.marks.length} waymark{parsed.marks.length === 1 ? "" : "s"}:
            {parsed.marks.map((m) => (
              <span key={m.mark} style={{ color: WAYMARK_COLORS[m.mark], fontWeight: 700 }}
                title={`X ${(m.x / 100).toFixed(2)}  Z ${(m.y / 100).toFixed(2)}`}>{WAYMARK_LABELS[m.mark]}</span>
            ))}
          </div>
          <Field label="Name">
            <input className="ck-input" value={name} maxLength={MAX_PRESET_NAME} onChange={(e) => { setName(e.target.value); setError(null); }}
              style={{ width: "100%", boxSizing: "border-box" }} />
          </Field>
          {replaces && <div style={{ color: "#f0d9a8", fontSize: 12, marginBottom: 8 }}>You already have a preset called “{trimmed}” for this fight; saving replaces it.</div>}
          {otherDuty && (
            <div style={{ color: "#f0d9a8", fontSize: 12, marginBottom: 8 }}>
              This preset is for another duty (MapID {parsed.mapId}; {fightName} is {fightMapId}). You can still save it.
            </div>
          )}
        </>
      )}
      {error && <div style={{ color: "#e06c6c", fontSize: 13 }}>{error}</div>}
    </Dialog>
  );
}
