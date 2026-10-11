// Per-VOD sync points and coverage (docs/vod-coverage-plan.md).
//
// A VOD is synced by hand, once, at some pull: offset = video time - report
// time. A stream dropout makes the video skip ~20s, so every pull after it
// would start ~20s late. "Re-sync from this pull" adds another point instead
// of replacing the first, so pulls before it keep their sync:
// - The offset for a pull is the last point with fromTime <= pull.startTime,
//   or the first point when none qualifies. One point behaves exactly like
//   the old single offset.
// - fromTime is report seconds (the synced pull's startTime), not a pull id,
//   because live polling renumbers pulls.
// - The pull the skip happens in may be off; that's accepted. Nothing here
//   works within a pull.
//
// `Vod.offset` / `isCalibrated` stay as derived fields (first point's offset
// / any point exists) so callers that only ask "is it synced" keep working.
// Anything that turns report time into video time, or back, goes through
// the helpers below.

import type { Pull } from "@/types/Pull";
import type { SyncPoint, Vod } from "@/types/Vod";

export type { SyncPoint };

// A VOD's sync points, sorted by fromTime. Falls back to one point built
// from the legacy single offset (VODs restored from older sessions).
export function syncPointsOf(vod: Vod): SyncPoint[] {
  if (vod.syncPoints && vod.syncPoints.length > 0) return vod.syncPoints;
  if (vod.isCalibrated && vod.offset !== undefined) return [{ fromTime: 0, offset: vod.offset }];
  return [];
}

// Sync points from a saved session VOD: `syncPoints` when present, else
// one point from the legacy `offset`.
export function savedSyncPoints(saved: { offset?: number; syncPoints?: SyncPoint[] }): SyncPoint[] {
  if (saved.syncPoints && saved.syncPoints.length > 0) return saved.syncPoints;
  return saved.offset !== undefined ? [{ fromTime: 0, offset: saved.offset }] : [];
}

export function isSynced(vod: Vod): boolean {
  return syncPointsOf(vod).length > 0;
}

// The VOD with exactly these sync points, keeping the derived legacy fields
// in step. An empty list unsyncs it.
export function withSyncPoints(vod: Vod, points: SyncPoint[]): Vod {
  const sorted = [...points].sort((a, b) => a.fromTime - b.fromTime);
  return {
    ...vod,
    syncPoints:   sorted.length > 0 ? sorted : undefined,
    offset:       sorted[0]?.offset,
    isCalibrated: sorted.length > 0,
  };
}

// Adds a point, replacing one already at the same fromTime.
export function addSyncPoint(vod: Vod, point: SyncPoint): Vod {
  const kept = syncPointsOf(vod).filter(p => p.fromTime !== point.fromTime);
  return withSyncPoints(vod, [...kept, point]);
}

// The pull each sync point was made at: the pull starting at its fromTime,
// else the first pull after it (a point restored from a legacy offset has
// fromTime 0). Undefined when no pull is that late.
export function syncPointPulls(vod: Vod, pulls: Pull[]): (Pull | undefined)[] {
  return syncPointsOf(vod).map(point =>
    pulls.find(p => Math.abs(p.startTime - point.fromTime) < 0.001) ??
    pulls.find(p => p.startTime >= point.fromTime)
  );
}

// Offset (video - report seconds) in effect at a report time, or undefined
// when the VOD isn't synced.
export function offsetAtReportTime(vod: Vod, reportTime: number): number | undefined {
  const points = syncPointsOf(vod);
  if (points.length === 0) return undefined;
  let chosen = points[0];
  for (const p of points) {
    if (p.fromTime <= reportTime) chosen = p;
    else break;
  }
  return chosen.offset;
}

export function offsetForPull(vod: Vod, pull: Pull): number | undefined {
  return offsetAtReportTime(vod, pull.startTime);
}

// Video seconds at which a pull starts, or undefined when unsynced.
export function pullStartVideoTime(vod: Vod, pull: Pull): number | undefined {
  const offset = offsetForPull(vod, pull);
  return offset === undefined ? undefined : pull.startTime + offset;
}

// Raw video time -> report seconds. Point k covers video times from where
// its own pull starts (fromTime_k + offset_k) up to the next point's start;
// the first point also covers everything before it.
export function videoToReportTime(vod: Vod, rawVideoTime: number): number | undefined {
  const points = syncPointsOf(vod);
  if (points.length === 0) return undefined;
  let chosen = points[0];
  for (const p of points) {
    if (p.fromTime + p.offset <= rawVideoTime) chosen = p;
  }
  return rawVideoTime - chosen.offset;
}

// Whether the VOD has footage at this pull's start. A pull running past the
// video's end still counts: the user sees where it cuts off. Without a known
// length (older sessions, before the VOD first loads) only the start is
// checked.
export function coversPull(vod: Vod, pull: Pull): boolean {
  const start = pullStartVideoTime(vod, pull);
  if (start === undefined || start < 0) return false;
  return vod.durationSec === undefined || start <= vod.durationSec;
}

// First and last covered pull in list order, or null when none is covered.
export function coveredPullRange(vod: Vod, pulls: Pull[]): { first: Pull; last: Pull } | null {
  let first: Pull | null = null;
  let last:  Pull | null = null;
  for (const p of pulls) {
    if (!coversPull(vod, p)) continue;
    if (!first) first = p;
    last = p;
  }
  return first && last ? { first, last } : null;
}
