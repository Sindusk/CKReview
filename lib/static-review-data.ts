// lib/static-review-data.ts
//
// Pure transform from an already-imported Pull[] to the per-pull,
// per-player shape persisted by POST /api/statics/[staticId]/reviews
// (StaticReviewPull + StaticReviewPullPlayerError, see prisma/schema.prisma).
// Computed client-side at "Add Review To Static" time — the app only ever
// has real Pull[] data in the browser (freshly fetched from WCL/FFL and run
// through detectPullErrors), so this can't be recomputed from scratch on
// the server.

import type { Pull } from "@/types/Pull";
import { getPullRaidCutoff } from "@/lib/report-data";

export type StaticReviewPullPlayerErrorData = {
  player:     string;
  majorCount: number;
  minorCount: number;
};

export type StaticReviewPullData = {
  fightId:    number;
  pullNumber: number;
  bossName:   string;
  result:     "Wipe" | "Kill";
  startTime:  number;
  endTime:    number;
  players:    StaticReviewPullPlayerErrorData[];
};

/**
 * Per pull, counts each player's Major/Minor errors up through the same
 * raid-wipe cutoff used by the Report tab (see report-data.ts's
 * getPullRaidCutoff): once the earliest Raid-severity error has fired,
 * anything after it is dropped, Major or Minor, since the raid is already
 * wiping by that point.
 */
export function computeStaticReviewPullData(pulls: Pull[]): StaticReviewPullData[] {
  return pulls.map((pull) => {
    const cutoff = getPullRaidCutoff(pull);
    const counts = new Map<string, { major: number; minor: number }>();

    for (const e of pull.errors) {
      if (e.severity !== "Major" && e.severity !== "Minor") continue;
      if (cutoff !== null && e.timestamp > cutoff) continue;
      if (!e.player) continue;

      const entry = counts.get(e.player) ?? { major: 0, minor: 0 };
      if (e.severity === "Major") entry.major += 1;
      else entry.minor += 1;
      counts.set(e.player, entry);
    }

    const players: StaticReviewPullPlayerErrorData[] = Array.from(counts.entries()).map(
      ([player, c]) => ({ player, majorCount: c.major, minorCount: c.minor })
    );

    return {
      fightId:    pull.fightId,
      pullNumber: pull.pullNumber,
      bossName:   pull.name,
      result:     pull.result,
      startTime:  pull.startTime,
      endTime:    pull.endTime,
      players,
    };
  });
}
