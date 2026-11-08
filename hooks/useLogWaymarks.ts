"use client";

// hooks/useLogWaymarks.ts
//
// Waymarks read from an ACT / IINACT log the user picks, for FFLogs
// reports (FFLogs has none; lib/replay/waymarks.ts). Only zone (01) and
// waymark (28) lines are kept, a few hundred per night, so they are saved
// in localStorage per file and survive a reload; the log itself is never
// stored or sent anywhere. Any FFXIV pull whose real time falls inside a
// saved file's span gets that file's waymarks, whatever report it came
// from, matched by wall-clock time (the log's timestamps carry their UTC
// offset; FFLogs' report startTime is epoch ms).

import { useCallback, useEffect, useState } from "react";
import { parseActTimestamp, readLogLines } from "@/lib/local-log/read-lines";
import { waymarkEventFromLine, waymarkEventsFor, type WaymarkEvent } from "@/lib/replay/waymarks";

const STORAGE_KEY = "ckreview.logWaymarks.v1";
const MAX_FILES = 30;

export type LogWaymarkFile = {
  name:   string;
  size:   number;
  start:  number;   // epoch ms of the log's first line
  end:    number;   // and last line
  events: WaymarkEvent[];
};

function loadSaved(): LogWaymarkFile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

function save(files: LogWaymarkFile[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(files)); } catch { /* storage full or blocked: keep in memory */ }
}

/** Epoch ms of the first ACT timestamp in `text` (a line's second field). */
function firstTimestamp(text: string, fromEnd: boolean): number {
  const lines = text.split("\n").filter((l) => l.includes("|"));
  if (fromEnd) lines.reverse();
  for (const l of lines) {
    const t = parseActTimestamp(l.split("|")[1] ?? "");
    if (Number.isFinite(t)) return t;
  }
  return NaN;
}

/** The waymark changes in an ACT / IINACT log file, and its time span. */
export async function readLogWaymarks(file: File, onProgress?: (f: number) => void): Promise<LogWaymarkFile> {
  const head = await file.slice(0, 64 * 1024).text();
  const tail = await file.slice(Math.max(0, file.size - 256 * 1024)).text();
  const start = firstTimestamp(head, false);
  const end = firstTimestamp(tail, true);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error("This doesn't look like an ACT or IINACT network log (Network_*.log).");
  }
  const events: WaymarkEvent[] = [];
  await readLogLines(file, (f) => {
    const t = parseActTimestamp(f[1]);
    if (!Number.isFinite(t)) return;
    const e = waymarkEventFromLine(f, t);
    if (e) events.push(e);
  }, { wanted: new Set(["01", "28"]), onProgress });
  events.sort((a, b) => a[0] - b[0]);
  return { name: file.name, size: file.size, start, end, events };
}

export function useLogWaymarks() {
  const [files, setFiles] = useState<LogWaymarkFile[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setFiles(loadSaved()); }, []);

  const addFile = useCallback(async (file: File) => {
    setError(null);
    setProgress(0);
    try {
      const read = await readLogWaymarks(file, setProgress);
      setFiles((prev) => {
        const next = [read, ...prev.filter((f) => !(f.name === read.name && f.size === read.size))].slice(0, MAX_FILES);
        save(next);
        return next;
      });
      return read;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setProgress(null);
    }
  }, []);

  /** Add an already-read file's events (the local log import reads them in the same pass). */
  const addRead = useCallback((read: LogWaymarkFile) => {
    setFiles((prev) => {
      const next = [read, ...prev.filter((f) => !(f.name === read.name && f.size === read.size))].slice(0, MAX_FILES);
      save(next);
      return next;
    });
  }, []);

  /**
   * The pull's waymark events in ms from its start, or null when no saved
   * log covers it. `startMs` / `endMs` are the pull's epoch ms.
   */
  const eventsForPull = useCallback((startMs: number, endMs: number): WaymarkEvent[] | null => {
    const f = files.find((x) => x.start <= startMs && x.end >= startMs);
    if (!f) return null;
    return waymarkEventsFor(f.events, startMs, endMs).map(([t, m, x, y]) => [t - startMs, m, x, y] as WaymarkEvent);
  }, [files]);

  return { files, progress, error, addFile, addRead, eventsForPull };
}
