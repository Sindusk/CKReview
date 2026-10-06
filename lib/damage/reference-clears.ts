// lib/damage/reference-clears.ts
//
// Loads one reference clear for the Damage dialog's comparison
// (lib/damage/compare.ts). Only on the user's button press (CLAUDE.md: no
// hidden costs; FFLogs is rate-limited), and only the one fight:
//   1. local sample data, if scripts/fetch-ff-report.js saved the report
//      (a metadata-only check first; no API cost)
//   2. otherwise FFLogs: the report's metadata, then that fight's events
// The fight is the `?fight=` in a pasted URL, or the report's last kill.

import type { Pull } from "@/types/Pull";
import { fetchFFReport, fetchFFightData } from "../ffl-client";
import { tryFetchSampleReportMeta, fetchSampleReport } from "../sample-report-client";
import { buildFFLAbilityMap, transformFFightToPull } from "../log-transforms";

export type ReferenceInput = { code: string; fightId?: number };

/** A pasted FFLogs URL, or a bare report code (optionally "code#fight"). */
export function parseReferenceInput(raw: string): ReferenceInput | null {
  const s = raw.trim();
  const code = s.match(/reports\/([a-zA-Z0-9]{16})/)?.[1] ?? s.match(/^([a-zA-Z0-9]{16})\b/)?.[1];
  if (!code) return null;
  const fight = s.match(/[?&#]fight=(\d+)/)?.[1] ?? s.match(/^[a-zA-Z0-9]{16}#(\d+)$/)?.[1];
  return { code, fightId: fight ? Number(fight) : undefined };
}

export async function loadReferenceClear(input: ReferenceInput): Promise<{ pull: Pull; source: "sample" | "live" }> {
  const meta = await tryFetchSampleReportMeta("ffl", input.code);
  if (meta) {
    const payload = await fetchSampleReport("ffl", input.code);
    if (payload.source === "ffl") {
      const kills = payload.fightDataList.filter((d) => d.fight.kill);
      const data = input.fightId !== undefined
        ? payload.fightDataList.find((d) => d.fight.id === input.fightId)
        : kills[kills.length - 1];
      if (data) {
        const abilityMap = buildFFLAbilityMap(payload.report.masterData.abilities);
        return { pull: transformFFightToPull(data, abilityMap, input.code), source: "sample" };
      }
    }
  }

  const report = await fetchFFReport(input.code);
  const kills = report.fights.filter((f) => f.kill);
  const fight = input.fightId !== undefined
    ? report.fights.find((f) => f.id === input.fightId)
    : kills[kills.length - 1];
  if (!fight) throw new Error(input.fightId !== undefined ? `Fight ${input.fightId} isn't in ${input.code}.` : `${input.code} has no kill.`);
  const data = await fetchFFightData(input.code, fight, report.masterData.actors, undefined, true);
  const abilityMap = buildFFLAbilityMap(report.masterData.abilities);
  return { pull: transformFFightToPull(data, abilityMap, report.code), source: "live" };
}
