// Remembered sync for local-file VODs (docs/local-vod-plan.md item 6).
//
// A local VOD is gone after a refresh, so its calibration would be lost
// with it. This keeps the offset in the browser's localStorage, keyed on
// the file's identity (name + size + lastModified) and the report, so
// re-picking the same file for the same log restores its sync. It stays on
// the user's machine, like the file itself.
//
// Storage can be unavailable (private windows, blocked site data), so
// every access is wrapped and failure just means no remembered sync.

import type { LocalVodFile } from "@/types/Vod";

const KEY_PREFIX = "ckreview:local-vod-sync:";

function storageKey(file: LocalVodFile, reportKey: string): string {
  return `${KEY_PREFIX}${reportKey}|${file.name}|${file.size}|${file.lastModified}`;
}

export function loadLocalVodOffset(file: LocalVodFile, reportKey: string): number | undefined {
  try {
    const raw = window.localStorage.getItem(storageKey(file, reportKey));
    if (raw === null) return undefined;
    const offset = Number(raw);
    return Number.isFinite(offset) ? offset : undefined;
  } catch {
    return undefined;
  }
}

export function saveLocalVodOffset(file: LocalVodFile, reportKey: string, offset: number): void {
  try {
    window.localStorage.setItem(storageKey(file, reportKey), String(offset));
  } catch {
    // Storage unavailable — the sync just won't be remembered.
  }
}

export function clearLocalVodOffset(file: LocalVodFile, reportKey: string): void {
  try {
    window.localStorage.removeItem(storageKey(file, reportKey));
  } catch {
    // Storage unavailable — nothing was stored.
  }
}
