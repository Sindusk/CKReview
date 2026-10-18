// Remembered sync for local-file VODs (docs/archive/local-vod-plan.md item 6).
//
// A local VOD is gone after a refresh, so its calibration would be lost
// with it. This keeps its sync points and video length (lib/vod-sync.ts)
// in the browser's localStorage, keyed on the file's identity (name + size
// + lastModified) and the report, so re-picking the same file for the same
// log restores its sync. It stays on the user's machine, like the file
// itself.
//
// Stored as JSON { syncPoints, durationSec }. Entries written before sync
// points existed are a plain offset number; those read back as one point.
//
// Storage can be unavailable (private windows, blocked site data), so
// every access is wrapped and failure just means no remembered sync.

import type { LocalVodFile, SyncPoint } from "@/types/Vod";

const KEY_PREFIX = "ckreview:local-vod-sync:";

export type LocalVodSync = {
  syncPoints:   SyncPoint[];
  durationSec?: number;
};

function storageKey(file: LocalVodFile, reportKey: string): string {
  return `${KEY_PREFIX}${reportKey}|${file.name}|${file.size}|${file.lastModified}`;
}

function isSyncPoint(p: unknown): p is SyncPoint {
  const o = p as SyncPoint | null;
  return !!o && Number.isFinite(o.fromTime) && Number.isFinite(o.offset);
}

export function loadLocalVodSync(file: LocalVodFile, reportKey: string): LocalVodSync | undefined {
  try {
    const raw = window.localStorage.getItem(storageKey(file, reportKey));
    if (raw === null) return undefined;

    const parsed: unknown = JSON.parse(raw);
    // Old format: the single offset as a plain number.
    if (typeof parsed === "number") {
      return Number.isFinite(parsed) ? { syncPoints: [{ fromTime: 0, offset: parsed }] } : undefined;
    }

    const stored = parsed as Partial<LocalVodSync> | null;
    const syncPoints = Array.isArray(stored?.syncPoints) ? stored.syncPoints.filter(isSyncPoint) : [];
    if (syncPoints.length === 0) return undefined;
    const durationSec = Number.isFinite(stored?.durationSec) ? stored?.durationSec : undefined;
    return { syncPoints, durationSec };
  } catch {
    return undefined;
  }
}

export function saveLocalVodSync(file: LocalVodFile, reportKey: string, sync: LocalVodSync): void {
  try {
    window.localStorage.setItem(storageKey(file, reportKey), JSON.stringify(sync));
  } catch {
    // Storage unavailable — the sync just won't be remembered.
  }
}

export function clearLocalVodSync(file: LocalVodFile, reportKey: string): void {
  try {
    window.localStorage.removeItem(storageKey(file, reportKey));
  } catch {
    // Storage unavailable — nothing was stored.
  }
}
