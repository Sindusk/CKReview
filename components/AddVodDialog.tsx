"use client";

import { useState } from "react";
import { Dialog, Field } from "./ui/Dialog";

// A YouTube or Twitch link (the page tells them apart, lib/url-parsers.ts
// parseVodUrl), or a video file from the user's disk. The file is only
// handed back to the page, which plays it through an object URL; it is
// never uploaded (see docs/archive/local-vod-plan.md).
export type AddVodSource =
  | { kind: "url"; url: string }
  | { kind: "local"; file: File };

type AddVodDialogProps = {
  open: boolean;
  onCancel: () => void;
  onAdd: (player: string, source: AddVodSource) => void;
};

export default function AddVodDialog({ open, onCancel, onAdd }: AddVodDialogProps) {
  const [player, setPlayer] = useState("");
  const [kind, setKind] = useState<AddVodSource["kind"]>("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  if (!open) {
    return null;
  }

  function handleAdd() {
    if (!player.trim()) return;

    if (kind === "url") {
      if (!url.trim()) return;
      onAdd(player.trim(), { kind: "url", url: url.trim() });
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
          className={`ck-tab ck-tab--sm${kind === "url" ? " ck-tab--active" : ""}`}
          onClick={() => setKind("url")}
        >
          YouTube / Twitch URL
        </button>
        <button
          className={`ck-tab ck-tab--sm${kind === "local" ? " ck-tab--active" : ""}`}
          onClick={() => setKind("local")}
        >
          Local file
        </button>
      </div>

      {kind === "url" ? (
        <Field label="YouTube or Twitch URL" style={{ marginBottom: 0 }}>
          <input
            className="ck-input"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=... or https://www.twitch.tv/videos/..."
          />
          <div className="ck-help" style={{ marginTop: "8px", marginBottom: 0 }}>
            Twitch deletes past broadcasts after 7–60 days; highlights and
            uploads are kept. Subscriber-only VODs won&apos;t play here.
          </div>
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
