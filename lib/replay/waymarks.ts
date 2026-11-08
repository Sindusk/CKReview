// lib/replay/waymarks.ts
//
// Waymarks (A B C D 1 2 3 4) on the FFXIV top-down replay. FFLogs' API has
// no waymark field or event, so they come from one of two places:
//
// 1. **The ACT / IINACT log** (line 28, WaymarkMarker). Waymarks are
//    party-wide, so any raider's log has them. Format, checked on the
//    user's IINACT logs (Dancing Mad 2026-07-18 and 07-23, AAC M2S/M3S
//    2026-10-29):
//      28|<ts>|Add|<0-7>|<placer id>|<placer name>|<x>|<y>|<z>|<hash>
//      28|<ts>|Delete|<0-7>|<placer id>|<placer name>|0.00|0.00|0.00|<hash>
//    0-7 = A B C D 1 2 3 4; x / y are yalms (+x east, +y south, the
//    log's horizontal plane), z is height. A preset placement logs all
//    eight at the same millisecond; re-placing one logs a Delete then an
//    Add. Leaving the instance logs Deletes. A zone change (line 01) clears
//    them too: waymarks never survive one in game.
//    Limit: waymarks placed before the log started aren't in it.
// 2. **A fight's default presets** (FightReplay.waymarkPresets in the
//    fight's replay spec), picked from the Waymarks dropdown when the static
//    plays from FFLogs only.
//
// Units here are the replay's: centi-yalms, +y south.

/** In-game order of the eight waymarks. */
export const WAYMARK_LABELS = ["A", "B", "C", "D", "1", "2", "3", "4"] as const;
/** The game's colours: A/1 red, B/2 yellow, C/3 blue, D/4 purple. */
export const WAYMARK_COLORS = ["#ff4a4a", "#ffd23a", "#3aa8ff", "#c25cff", "#ff4a4a", "#ffd23a", "#3aa8ff", "#c25cff"];

/** One placed waymark: `mark` is 0-7 (WAYMARK_LABELS), x / y centi-yalms. */
export type Waymark = { mark: number; x: number; y: number };

/** A fight's default layout. `note` says where it came from. */
export type WaymarkPreset = { name: string; marks: Waymark[]; note?: string };

/**
 * One change from the log: [epoch ms, mark 0-7, x, y], x / y null when the
 * mark is removed. Mark -1 clears all eight (a zone change).
 */
export type WaymarkEvent = [number, number, number | null, number | null];

/** Builds a preset from yalm coordinates in A B C D 1 2 3 4 order (null = not placed). */
export function presetFromYalms(name: string, yalms: ([number, number] | null)[], note?: string): WaymarkPreset {
  const marks: Waymark[] = [];
  yalms.forEach((p, mark) => { if (p) marks.push({ mark, x: Math.round(p[0] * 100), y: Math.round(p[1] * 100) }); });
  return { name, marks, note };
}

/**
 * The waymark change a log line makes, or null. Takes the line split on
 * "|" (lib/local-log/read-lines.ts) and the epoch ms of its timestamp.
 */
export function waymarkEventFromLine(f: string[], t: number): WaymarkEvent | null {
  if (f[0] === "01") return [t, -1, null, null];
  if (f[0] !== "28") return null;
  const mark = Number(f[3]);
  if (!Number.isInteger(mark) || mark < 0 || mark > 7) return null;
  if (f[2] === "Delete") return [t, mark, null, null];
  if (f[2] !== "Add") return null;
  const x = Number(f[6]), y = Number(f[7]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return [t, mark, Math.round(x * 100), Math.round(y * 100)];
}

/** The waymarks standing at epoch ms `t`. `events` must be sorted by time. */
export function waymarksAt(events: WaymarkEvent[], t: number): Waymark[] {
  const on: (Waymark | null)[] = new Array(8).fill(null);
  for (const [et, mark, x, y] of events) {
    if (et > t) break;
    if (mark < 0) on.fill(null);
    else on[mark] = x === null || y === null ? null : { mark, x, y };
  }
  return on.filter((w): w is Waymark => !!w);
}

/**
 * The events that matter for [startMs, endMs] (epoch): the state standing
 * at startMs as one event per mark, then the changes inside the window.
 * Keeps a whole day's log down to what one report needs.
 */
export function waymarkEventsFor(events: WaymarkEvent[], startMs: number, endMs: number): WaymarkEvent[] {
  const out: WaymarkEvent[] = [[startMs, -1, null, null]];
  for (const w of waymarksAt(events, startMs)) out.push([startMs, w.mark, w.x, w.y]);
  for (const e of events) if (e[0] > startMs && e[0] <= endMs) out.push(e);
  return out;
}

/** Whether any waymark is placed at some point in [startMs, endMs] (epoch). */
export function hasWaymarksIn(events: WaymarkEvent[], startMs: number, endMs: number): boolean {
  if (waymarksAt(events, startMs).length) return true;
  return events.some((e) => e[0] > startMs && e[0] <= endMs && e[2] !== null);
}
