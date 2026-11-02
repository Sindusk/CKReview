"use client";

import { useState } from "react";
import { Dialog, Field } from "./ui/Dialog";
import { parseVodUrl } from "@/lib/url-parsers";

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
  // Why the last Add was refused; cleared on any edit or Cancel.
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  function handleAdd() {
    const problem =
      !player.trim() ? "Enter whose perspective this VOD is." :
      kind === "url" && !url.trim() ? "Paste a YouTube or Twitch link." :
      kind === "url" && !parseVodUrl(url.trim()) ? "That isn't a YouTube video or Twitch VOD link (twitch.tv/videos/…)." :
      kind === "local" && !file ? "Choose a video file." :
      null;
    if (problem) {
      setError(problem);
      return;
    }

    if (kind === "url") onAdd(player.trim(), { kind: "url", url: url.trim() });
    else onAdd(player.trim(), { kind: "local", file: file! });

    setPlayer("");
    setUrl("");
    setFile(null);
    setError(null);
  }

  return (
    <Dialog
      title="Add VOD"
      width="500px"
      footer={
        <>
          <button className="ck-btn ck-btn--md" onClick={() => { setError(null); onCancel(); }}>Cancel</button>
          <button className="ck-btn ck-btn--md ck-btn--primary" onClick={handleAdd}>Add</button>
        </>
      }
    >
      <Field label="Player / Perspective">
        <input
          className="ck-input"
          value={player}
          onChange={e => { setPlayer(e.target.value); setError(null); }}
          placeholder="e.g. Koro"
        />
      </Field>

      <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
        <button
          className={`ck-tab ck-tab--sm${kind === "url" ? " ck-tab--active" : ""}`}
          onClick={() => { setKind("url"); setError(null); }}
        >
          YouTube / Twitch URL
        </button>
        <button
          className={`ck-tab ck-tab--sm${kind === "local" ? " ck-tab--active" : ""}`}
          onClick={() => { setKind("local"); setError(null); }}
        >
          Local file
        </button>
      </div>

      {error && <p className="ck-error-text" role="alert">{error}</p>}

      {kind === "url" ? (
        <Field label="YouTube or Twitch URL" style={{ marginBottom: 0 }}>
          <input
            className="ck-input"
            value={url}
            onChange={e => { setUrl(e.target.value); setError(null); }}
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
            onChange={e => { setFile(e.target.files?.[0] ?? null); setError(null); }}
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
