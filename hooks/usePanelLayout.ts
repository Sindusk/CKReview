"use client";

// hooks/usePanelLayout.ts
//
// The review screen's resizable layout (components/ui/ResizeHandle.tsx):
// the three columns' shares of the width and the roster panel's height.
// Kept per browser in localStorage, a convenience only: it falls back to
// the defaults when storage is empty, blocked or holds something odd.

import { useCallback, useEffect, useState } from "react";

const KEY = "ck-panel-layout-v1";
export const DEFAULT_COLS: [number, number, number] = [25, 50, 25];  // % of the columns' width
export const DEFAULT_ROSTER_H = 300;
const MIN_COL = 14;
const MIN_ROSTER_H = 120;

type Layout = { cols: [number, number, number]; rosterH: number };

function load(): Layout | null {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    const cols = raw?.cols;
    if (!Array.isArray(cols) || cols.length !== 3 || !cols.every((c) => typeof c === "number" && c >= MIN_COL)) return null;
    const rosterH = typeof raw.rosterH === "number" && raw.rosterH >= MIN_ROSTER_H ? raw.rosterH : DEFAULT_ROSTER_H;
    return { cols: cols as [number, number, number], rosterH };
  } catch {
    return null;
  }
}

export function usePanelLayout() {
  const [layout, setLayout] = useState<Layout>({ cols: DEFAULT_COLS, rosterH: DEFAULT_ROSTER_H });

  // Read on the client only, after mount, so the server render matches.
  useEffect(() => {
    const saved = load();
    if (saved) setLayout(saved);
  }, []);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(layout)); } catch { /* storage blocked: keep it for this visit */ }
  }, [layout]);

  /** Moves the border after column `i` (0 or 1) by `deltaPct` of the columns' width. */
  const moveColumnBorder = useCallback((i: 0 | 1, deltaPct: number) => {
    setLayout((l) => {
      const cols = [...l.cols] as [number, number, number];
      const d = Math.max(MIN_COL - cols[i], Math.min(cols[i + 1] - MIN_COL, deltaPct));
      cols[i] += d;
      cols[i + 1] -= d;
      return { ...l, cols };
    });
  }, []);

  /** Grows the roster panel by `deltaPx`, up to `maxPx`. */
  const moveRosterBorder = useCallback((deltaPx: number, maxPx: number) => {
    setLayout((l) => ({ ...l, rosterH: Math.max(MIN_ROSTER_H, Math.min(maxPx, l.rosterH + deltaPx)) }));
  }, []);

  const resetColumns = useCallback(() => setLayout((l) => ({ ...l, cols: DEFAULT_COLS })), []);
  const resetRoster = useCallback(() => setLayout((l) => ({ ...l, rosterH: DEFAULT_ROSTER_H })), []);

  return { ...layout, moveColumnBorder, moveRosterBorder, resetColumns, resetRoster };
}
