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
  // This player's job/spec/role in THIS pull (from Pull.players, not
  // derived from the error rows — populated even for a player with zero
  // errors here). See StaticReviewPullPlayerError's schema comment for why
  // this is snapshotted per pull rather than assumed constant.
  className?: string;
  specId?:    number;
  role?:      "Tank" | "Healer" | "DPS";
  majorCount: number;
  minorCount: number;
};

export type StaticReviewPullData = {
  fightId:       number;
  pullNumber:    number;
  bossName:      string;
  result:        "Wipe" | "Kill";
  game:          "wow" | "ffxiv";
  startTime:     number;
  endTime:       number;
  // Pull.fightDuration, ms — the pull's own length (fallback display value
  // when there's no raid-severity error to anchor on).
  durationMs:    number;
  // ms into the pull when the earliest Raid-severity error fired, or null.
  raidErrorAtMs: number | null;
  players:       StaticReviewPullPlayerErrorData[];
};

/**
 * Per pull, counts each player's Major/Minor errors up through the same
 * raid-wipe cutoff used by the Report tab (see report-data.ts's
 * getPullRaidCutoff): once the earliest Raid-severity error has fired,
 * anything after it is dropped, Major or Minor, since the raid is already
 * wiping by that point.
 *
 * Every roster player gets a row (even 0/0), not just ones with a counted
 * error — the Players panel's "pulls they were in" / error-rate stats need
 * genuine participation counts to mean anything once substitutes are in
 * the mix, and a player who only ever had 0 errors would otherwise never
 * appear at all.
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

    const players: StaticReviewPullPlayerErrorData[] = pull.players
      .filter((p) => p.name !== "Multiple Players" && p.specName !== "LimitBreak" && p.specName !== "Limit Break")
      .map((p) => {
        const c = counts.get(p.name);
        return {
          player:     p.name,
          className:  p.className,
          specId:     p.specId,
          role:       p.role,
          majorCount: c?.major ?? 0,
          minorCount: c?.minor ?? 0,
        };
      });

    return {
      fightId:       pull.fightId,
      pullNumber:    pull.pullNumber,
      bossName:      pull.name,
      result:        pull.result,
      game:          pull.game,
      startTime:     pull.startTime,
      endTime:       pull.endTime,
      durationMs:    pull.fightDuration,
      raidErrorAtMs: cutoff,
      players,
    };
  });
}
