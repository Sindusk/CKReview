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
// 3. **The user's imported presets**: WaymarkPresetPlugin / Waymark
//    Librarian JSON pasted into the replay's Import dialog
//    (parseWaymarkPresetJson), saved per account and fight
//    (UserWaymarkPreset, app/api/waymarks). That JSON's X / Z are the
//    game's horizontal yalms, the same plane as the ACT log's x / y; Y is
//    height. MapID is the duty's ContentFinderCondition id
//    (FightReplay.waymarkMapId).
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

/** WaymarkPresetPlugin's keys for the eight marks, in WAYMARK_LABELS order. */
const PRESET_JSON_KEYS = ["A", "B", "C", "D", "One", "Two", "Three", "Four"] as const;
export const MAX_PRESET_NAME = 64;
/** Dropdown / default value prefix for the user's own presets: "mine:<name>". */
export const MINE_PREFIX = "mine:";

/**
 * Marks checked for saving: 1-8 distinct marks 0-7 with integer
 * centi-yalm coordinates within ±1000 yalms. Null when anything is off.
 * The server runs this on whatever a client sends.
 */
export function cleanMarks(raw: unknown): Waymark[] | null {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 8) return null;
  const seen = new Set<number>();
  const out: Waymark[] = [];
  for (const m of raw) {
    const { mark, x, y } = (m ?? {}) as Record<string, unknown>;
    if (!Number.isInteger(mark) || (mark as number) < 0 || (mark as number) > 7 || seen.has(mark as number)) return null;
    if (![x, y].every((v) => Number.isInteger(v) && Math.abs(v as number) <= 100000)) return null;
    seen.add(mark as number);
    out.push({ mark: mark as number, x: x as number, y: y as number });
  }
  return out.sort((a, b) => a.mark - b.mark);
}

/**
 * Reads a WaymarkPresetPlugin / Waymark Librarian preset:
 * `{ Name, MapID, A: { X, Y, Z, ID, Active }, B, ..., Four }`. Inactive
 * marks are skipped. Returns the preset or what's wrong with the text.
 */
export function parseWaymarkPresetJson(text: string):
  { ok: true; name: string; mapId: number | null; marks: Waymark[] } | { ok: false; error: string } {
  let j: unknown;
  try { j = JSON.parse(text); } catch { return { ok: false, error: "That isn't valid JSON. Paste the whole preset, from { to }." }; }
  if (!j || typeof j !== "object" || Array.isArray(j)) return { ok: false, error: "Expected one preset: an object with A, B, C, D, One, Two, Three and Four." };
  const o = j as Record<string, unknown>;
  const marks: Waymark[] = [];
  for (let mark = 0; mark < 8; mark++) {
    const key = PRESET_JSON_KEYS[mark];
    const w = o[key];
    if (w === undefined || w === null) continue;
    if (typeof w !== "object") return { ok: false, error: `Waymark ${key} isn't an object with X, Y and Z.` };
    const { X, Z, Active } = w as Record<string, unknown>;
    if (Active === false) continue;
    if (typeof X !== "number" || typeof Z !== "number" || !Number.isFinite(X) || !Number.isFinite(Z) || Math.abs(X) > 1000 || Math.abs(Z) > 1000) {
      return { ok: false, error: `Waymark ${key} needs numeric X and Z.` };
    }
    marks.push({ mark, x: Math.round(X * 100), y: Math.round(Z * 100) });
  }
  if (!marks.length) return { ok: false, error: "No active waymarks in that preset." };
  const name = typeof o.Name === "string" && o.Name.trim() ? o.Name.trim().slice(0, MAX_PRESET_NAME) : "Imported preset";
  const mapId = typeof o.MapID === "number" && Number.isInteger(o.MapID) ? o.MapID : null;
  return { ok: true, name, mapId, marks };
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
