"use client";

import { useState } from "react";
import { Dialog, Field } from "./ui/Dialog";

// A YouTube link, or a video file from the user's disk. The file is only
// handed back to the page, which plays it through an object URL; it is
// never uploaded (see docs/local-vod-plan.md).
export type AddVodSource =
  | { kind: "youtube"; url: string }
  | { kind: "local"; file: File };

type AddVodDialogProps = {
  open: boolean;
  onCancel: () => void;
  onAdd: (player: string, source: AddVodSource) => void;
};

export default function AddVodDialog({ open, onCancel, onAdd }: AddVodDialogProps) {
  const [player, setPlayer] = useState("");
  const [kind, setKind] = useState<AddVodSource["kind"]>("youtube");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  if (!open) {
    return null;
  }

  function handleAdd() {
    if (!player.trim()) return;

    if (kind === "youtube") {
      if (!url.trim()) return;
      onAdd(player.trim(), { kind: "youtube", url: url.trim() });
    } else {
      if (!file) return;
      onAdd(player.trim(), { kind: "local", file });
    }

    setPlayer("");
    setUrl("");
    setFile(null);
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

      <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
        <button
          className={`ck-tab ck-tab--sm${kind === "youtube" ? " ck-tab--active" : ""}`}
          onClick={() => setKind("youtube")}
        >
          YouTube URL
        </button>
        <button
          className={`ck-tab ck-tab--sm${kind === "local" ? " ck-tab--active" : ""}`}
          onClick={() => setKind("local")}
        >
          Local file
        </button>
      </div>

      {kind === "youtube" ? (
        <Field label="YouTube URL" style={{ marginBottom: 0 }}>
          <input
            className="ck-input"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </Field>
      ) : (
        <Field label="Video file" style={{ marginBottom: 0 }}>
          <input
            type="file"
            accept="video/*,.mkv"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            style={{ color: "var(--ck-text)", fontSize: "12px" }}
          />
          <div className="ck-help" style={{ marginTop: "8px", marginBottom: 0 }}>
            Plays from your disk and is never uploaded. It stays only in this
            tab, so after a refresh you&apos;ll need to pick it again.
          </div>
        </Field>
      )}
    </Dialog>
  );
}
