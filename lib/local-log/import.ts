// lib/local-log/import.ts
//
// The browser side of importing an ACT / IINACT log (act-report.ts does
// the parsing): wires in the XIVAPI lookups the log lacks, keeps the
// parsed log in memory for the replay, and builds a pull's ReplayData from
// it on Load replay (no FFLogs call). The log file itself is never stored
// or sent; re-opening a saved session needs the file picked again, like a
// local VOD.
//
// A local log's report URL is `local-log:<code>` (localLogUrl); code is
// localLogCode()'s hash of the file, so the same file gives the same code
// and its saved session is found again.

import { localLogCode, parseActLog, scanActLog, type ActLogImport, type ActZoneVisit } from "./act-report";
import { fetchItemNames, fetchStatusCategories } from "./status-categories";
import { parseActTimestamp } from "./read-lines";
import { buildReplayData, type ReplayData, type ReplayMap } from "@/lib/replay/ffxiv-replay";

export type { ActZoneVisit };

const PREFIX = "local-log:";

export function localLogUrl(code: string): string { return `${PREFIX}${code}`; }

/** The code of a `local-log:<code>` URL, or null. */
export function parseLocalLogUrl(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim();
  return s.startsWith(PREFIX) && s.length > PREFIX.length ? s.slice(PREFIX.length) : null;
}

/** The file's report code, from its name, size and first timestamp. */
export async function codeForLogFile(file: File): Promise<string> {
  const head = await file.slice(0, 64 * 1024).text();
  const first = head.split("\n").map((l) => parseActTimestamp(l.split("|")[1] ?? "")).find((t) => Number.isFinite(t)) ?? 0;
  return localLogCode(file.name, file.size, first);
}

export async function scanLocalLog(file: File, onProgress?: (f: number) => void): Promise<ActZoneVisit[]> {
  return scanActLog(file, onProgress);
}

/** Parses the chosen duties into a report the FFLogs import path takes as is. */
export async function importLocalLog(file: File, visits: ActZoneVisit[], onProgress?: (f: number) => void): Promise<ActLogImport> {
  const code = await codeForLogFile(file);
  const zones = [...new Set(visits.map((v) => v.zone))].join(", ");
  const day = new Date(visits[0]?.start ?? Date.now()).toLocaleDateString();
  return parseActLog(file, visits, code, {
    title: `${zones} · ${day} (local log)`,
    onProgress,
    statusCategories: fetchStatusCategories,
    itemNames: fetchItemNames,
  });
}

const mapCache = new Map<number, ReplayMap | null>();

/** The game's map for a log map id, in FFLogs' ReplayMap shape (XIVAPI's Map sheet). */
async function fetchMap(id: number): Promise<ReplayMap | null> {
  if (mapCache.has(id)) return mapCache.get(id)!;
  let map: ReplayMap | null = null;
  try {
    const res = await fetch(`https://v2.xivapi.com/api/sheet/Map/${id}?fields=Id,SizeFactor,OffsetX,OffsetY,PlaceName.Name`);
    if (res.ok) {
      const j = (await res.json()) as { fields?: { Id?: string; SizeFactor?: number; OffsetX?: number; OffsetY?: number; PlaceName?: { fields?: { Name?: string } } } };
      const [territory, index] = (j.fields?.Id ?? "").split("/");
      if (territory && index && j.fields?.SizeFactor) {
        // FFLogs' filename for the same texture: "m-z3oy-z3oy.00.jpg".
        map = { id, name: j.fields.PlaceName?.fields?.Name ?? "", filename: `m-${territory}-${territory}.${index}.jpg`,
          sizeFactor: j.fields.SizeFactor, offsetX: j.fields.OffsetX ?? 0, offsetY: j.fields.OffsetY ?? 0 };
      }
    }
  } catch { /* no map art */ }
  mapCache.set(id, map);
  return map;
}

/** A pull's replay from the parsed log. */
export async function buildLocalReplay(imp: ActLogImport, fightId: number): Promise<ReplayData | null> {
  const fight = imp.report.fights.find((f) => f.id === fightId);
  const r = imp.replay.get(fightId);
  if (!fight || !r) return null;
  const names = new Map(imp.report.masterData.abilities.map((a) => [a.gameID, a.name]));
  const map = r.mapId !== null ? await fetchMap(r.mapId) : null;
  return buildReplayData(imp.report.code, fightId, fight.startTime, fight.endTime, r.events, imp.actors, names, map);
}
