"use client";

import { useState } from "react";
import { Dialog, Field } from "./ui/Dialog";

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
    <Dialog
      title="Add VOD"
      width="500px"
      footer={
        <>
          <button className="ck-btn ck-btn--md" onClick={onCancel}>Cancel</button>
          <button className="ck-btn ck-btn--md ck-btn--primary" onClick={handleAdd}>Add</button>
        </>
      }
    >
      <Field label="Player / Perspective">
        <input
          className="ck-input"
          value={player}
          onChange={e => setPlayer(e.target.value)}
          placeholder="e.g. Koro"
        />
      </Field>

      <Field label="YouTube URL" style={{ marginBottom: 0 }}>
        <input
          className="ck-input"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
        />
      </Field>
    </Dialog>
  );
}