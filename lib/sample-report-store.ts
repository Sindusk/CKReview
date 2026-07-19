// lib/sample-report-store.ts
//
// Reads reports already saved to disk by scripts/fetch-wow-report.js /
// scripts/fetch-ff-report.js (sampledata/<wow|ff>/<code>/) and reshapes
// them back into the same {report, fightDataList} shape fetchReport() +
// fetchFightData() normally produce over the live API — so a report
// fetched once for sample-data collection can also be loaded straight
// into the app without spending more rate-limit points on re-imports
// during iteration. Server-only — never import this from a "use client"
// file; see app/api/sample-report/[source]/[code]/route.ts for the
// browser-facing side.
//
// Each per-fight file on disk is the raw GraphQL response envelope
// ({query, variables, json: {data: {reportData: {report: {<stream>: {data}}}}}})
// that wcl-client.ts's/ffl-client.ts's gql() dumps to the console — NOT
// already in WCLFightData/FFLFightData shape. variables.fightIDs[0] gives
// the fight id to match back against meta.json's fights array; the stream
// keys (deaths, combatantInfo, …) map 1:1 to WCLFightData/FFLFightData's
// field names (deathEvents, combatantInfos, …) since both providers'
// FIGHT_EVENTS_QUERY share the same aliases.

import { promises as fs } from "fs";
import path from "path";
import type { WCLReport, WCLFightData } from "./wcl-client";
import type { FFLReport, FFLFightData } from "./ffl-client";

export type SampleSource = "wcl" | "ffl";

const SAMPLE_ROOT = path.join(process.cwd(), "sampledata");

// scripts/fetch-wow-report.js / fetch-ff-report.js default to these
// sub-directories (--out overrides, but that's a manual dev-tooling
// escape hatch, not something this loader needs to follow).
const DIR_BY_SOURCE: Record<SampleSource, string> = { wcl: "wow", ffl: "ff" };

// Guards against path traversal via a malformed report code.
function reportDir(source: SampleSource, code: string): string {
  if (!/^[a-zA-Z0-9]+$/.test(code)) {
    throw new Error(`Invalid report code: ${code}`);
  }
  return path.join(SAMPLE_ROOT, DIR_BY_SOURCE[source], code);
}

const STREAM_TO_FIELD = {
  deaths:        "deathEvents",
  combatantInfo: "combatantInfos",
  casts:         "castEvents",
  damageDone:    "damageDoneEvents",
  damageTaken:   "damageTakenEvents",
  healing:       "healingEvents",
  debuffs:       "debuffEvents",
  enemyCasts:    "enemyCastEvents",
  enemyBuffs:    "enemyBuffEvents",
} as const;

export type SampleReportPayload =
  | { source: "wcl"; report: WCLReport; fightDataList: WCLFightData[] }
  | { source: "ffl"; report: FFLReport; fightDataList: FFLFightData[] };

export async function sampleReportExists(source: SampleSource, code: string): Promise<boolean> {
  try {
    await fs.access(path.join(reportDir(source, code), "meta.json"));
    return true;
  } catch {
    return false;
  }
}

export type SampleReportMeta = { code: string; title: string; fightCount: number };

/**
 * Reads just meta.json — KBs, not the full per-fight event data (which can
 * run into the hundreds of MB for a big report). Used to power the
 * "local sample data found, load it?" prompt without paying the cost of a
 * full load the user might decline.
 */
export async function loadSampleReportMeta(source: SampleSource, code: string): Promise<SampleReportMeta | null> {
  try {
    const meta = JSON.parse(await fs.readFile(path.join(reportDir(source, code), "meta.json"), "utf-8"));
    return { code: meta.code, title: meta.title, fightCount: meta.fights.length };
  } catch {
    return null;
  }
}

export async function loadSampleReport(source: SampleSource, code: string): Promise<SampleReportPayload> {
  const dir  = reportDir(source, code);
  const meta = JSON.parse(await fs.readFile(path.join(dir, "meta.json"), "utf-8"));

  const fightById = new Map<number, any>(meta.fights.map((f: any) => [f.id, f]));
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json") && f !== "meta.json");

  const fightDataList: any[] = [];

  for (const file of files) {
    const raw = JSON.parse(await fs.readFile(path.join(dir, file), "utf-8"));
    const fightId = raw?.variables?.fightIDs?.[0];
    const fight   = fightById.get(fightId);
    // A pull file with no matching fight in meta.json is stale (e.g.
    // meta.json was re-fetched after a fight got renumbered) — skip it
    // rather than failing the whole load.
    if (!fight) continue;

    const streams   = raw.json.data.reportData.report;
    const fightData: any = { fight, actors: meta.masterData.actors };
    for (const [streamKey, field] of Object.entries(STREAM_TO_FIELD)) {
      fightData[field] = streams[streamKey]?.data ?? [];
    }
    fightDataList.push(fightData);
  }

  fightDataList.sort((a, b) => a.fight.startTime - b.fight.startTime);

  const report = {
    code:       meta.code,
    title:      meta.title,
    fights:     meta.fights,
    masterData: meta.masterData,
  };

  return { source, report, fightDataList } as SampleReportPayload;
}
