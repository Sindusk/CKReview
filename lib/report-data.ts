// lib/report-data.ts
//
// Pure data-transformation helpers for the raid Report feature (see
// components/ReportDialog.tsx). Nothing here touches the network or React —
// it all operates on the already-imported Pull[] the app holds in memory.

import type { Pull } from "@/types/Pull";

export type ReportRole = "Tank" | "Healer" | "DPS";
export type ReportGame = "wow" | "ffxiv";

// ─── Player stats table ────────────────────────────────────────────────────

export type PlayerReportStats = {
  name:            string;
  className:       string;
  specId:          number;   // Blizzard spec ID (WoW) — 0/meaningless for FFXIV
  role:            ReportRole;
  game:            ReportGame;

  // Column 2 — how many pulls this player caused the very first
  // Major error.
  firstErrorCount: number;
  // Column 3 — firstErrorCount / pullCount, as a 0–100 percentage.
  firstErrorPct:   number;

  // Column 4 — total pre-wipe (or pre-raid-error) Major errors this player
  // caused across every pull, not just the first one — see
  // getPullCriticalEvents' cutoff logic below.
  totalCount:      number;
  // Column 5 — totalCount / pullCount, as a 0–100 percentage. Can exceed
  // 100% since a player may cause multiple pre-wipe errors in one pull.
  totalPct:        number;

  // Column 6 — how many of the report's pulls this player was actually
  // present for (i.e. appears in pull.players). Both percentages above are
  // per-pull-played, NOT per-report-pull: someone who showed up for the
  // last 10 of 50 pulls is rated against those 10.
  pullCount:       number;

  // Combined "early mistakes" score used to rank the pedestal — lower is
  // better. Simple sum of the two raw counts above.
  combinedScore:   number;
};

type CriticalEvent = {
  timestamp: number;
  player:    string;
  class:     string;
  role:      ReportRole;
};

// A pull's ordered stream of "critical" events, for the purposes of the
// Report's per-player attribution.
//
// Deaths are intentionally excluded — a death isn't inherently the fault of
// the player who died, so the report only counts Major errors as mistakes.
//
// Raid errors are also excluded from per-player attribution (they aren't
// any one player's fault to begin with — see types/PullError.ts), but the
// EARLIEST Raid error in the pull (whether auto-detected, e.g. River of
// Light, or manually marked via "Call Wipe") is used as a cutoff: once a
// raid-wide mistake has happened, the raid is assumed to be wiping, and any
// Major errors after that point are dropped from the report. Otherwise
// players scrambling/jumping into fire to end the pull faster would get
// unfairly dinged for "mistakes" that only happened because the pull was
// already over.
// The earliest Raid-severity error's timestamp (auto-detected or a manual
// Call Wipe), or null if the pull has none. Shared by getPullCriticalEvents
// below and by computeStaticReviewPullData (lib/static-review-data.ts) —
// both need to drop anything logged after the raid was already wiping.
export function getPullRaidCutoff(pull: Pull): number | null {
  const raidTimestamps = pull.errors
    .filter((e) => e.severity === "Raid")
    .map((e) => e.timestamp);

  return raidTimestamps.length > 0 ? Math.min(...raidTimestamps) : null;
}

function getPullCriticalEvents(pull: Pull): CriticalEvent[] {
  const cutoff = getPullRaidCutoff(pull);

  const majors: CriticalEvent[] = pull.errors
    .filter((e) => e.severity === "Major")
    .filter((e) => cutoff === null || e.timestamp <= cutoff)
    // Major errors always carry player/class/role (only Raid errors can
    // omit them) so these are safe to assert.
    .map((e) => ({
      timestamp: e.timestamp,
      player:    e.player!,
      class:     e.class!,
      role:      e.role!,
    }));

  return majors.sort((a, b) => a.timestamp - b.timestamp);
}

// Roster info keyed by player name. Names are used as the join key across
// pulls since actorId is only stable within a single pull/report.
//
// `pullCount` is how many pulls the player was actually in — the report's
// rates are per-pull-played, so a raider who joined halfway through the
// night isn't flattered by the pulls they sat out.
type RosterEntry = {
  className: string;
  specId:    number;
  role:      ReportRole;
  game:      ReportGame;
  pullCount: number;
};

function buildRoster(pulls: Pull[]): Map<string, RosterEntry> {
  const roster = new Map<string, RosterEntry>();

  for (const pull of pulls) {
    // A name should only ever count once per pull, however many entries the
    // log produced for it.
    const seenThisPull = new Set<string>();

    for (const p of pull.players) {
      // Same exclusions RosterPanel already applies — these aren't real
      // individual players and shouldn't show up in the report.
      if (p.name === "Multiple Players") continue;
      if (p.specName === "LimitBreak" || p.specName === "Limit Break") continue;
      if (seenThisPull.has(p.name)) continue;
      seenThisPull.add(p.name);

      const existing = roster.get(p.name);
      if (existing) {
        existing.pullCount += 1;
      } else {
        roster.set(p.name, {
          className: p.className,
          specId:    p.specId,
          role:      p.role,
          game:      pull.game,
          pullCount: 1,
        });
      }
    }
  }

  return roster;
}

/**
 * Computes the per-player First Errors / Top 3 stats table for every player
 * who appears anywhere in the given pulls.
 *
 * Sorted descending by total Major errors (column 4) — the biggest
 * contributors of Major mistakes rise to the top.
 */
export function computePlayerReportStats(pulls: Pull[]): PlayerReportStats[] {
  const roster        = buildRoster(pulls);
  const firstErrorMap = new Map<string, number>();
  const totalMap        = new Map<string, number>();

  for (const pull of pulls) {
    const events = getPullCriticalEvents(pull);
    if (events.length === 0) continue;

    const first = events[0];
    firstErrorMap.set(first.player, (firstErrorMap.get(first.player) ?? 0) + 1);

    for (const e of events) {
      totalMap.set(e.player, (totalMap.get(e.player) ?? 0) + 1);
    }
  }

  const stats: PlayerReportStats[] = [];

  for (const [name, info] of roster.entries()) {
    const firstErrorCount = firstErrorMap.get(name) ?? 0;
    const totalCount      = totalMap.get(name) ?? 0;
    const pullCount       = info.pullCount;

    stats.push({
      name,
      className:       info.className,
      specId:          info.specId,
      role:            info.role,
      game:            info.game,
      firstErrorCount,
      firstErrorPct:   pullCount > 0 ? (firstErrorCount / pullCount) * 100 : 0,
      totalCount,
      totalPct:        pullCount > 0 ? (totalCount / pullCount) * 100 : 0,
      pullCount,
      combinedScore:   firstErrorCount + totalCount,
    });
  }

  stats.sort((a, b) => {
    if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
    if (b.totalPct !== a.totalPct) return b.totalPct - a.totalPct;
    if (b.firstErrorCount !== a.firstErrorCount) return b.firstErrorCount - a.firstErrorCount;
    return a.name.localeCompare(b.name);
  });

  return stats;
}

/**
 * Picks the MVP + 2 runners-up — the 3 players with the fewest early
 * mistakes (lowest combinedScore). Ties broken by fewer first-errors, then
 * alphabetically for stability.
 */
export function computePedestal(stats: PlayerReportStats[]): PlayerReportStats[] {
  return [...stats]
    .sort((a, b) => {
      if (a.combinedScore !== b.combinedScore) return a.combinedScore - b.combinedScore;
      if (a.firstErrorCount !== b.firstErrorCount) return a.firstErrorCount - b.firstErrorCount;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 3);
}

// ─── Raid timeline ──────────────────────────────────────────────────────────

export type TimelineSegment = {
  type:     "combat" | "downtime";
  startSec: number;
  endSec:   number;
  pull?:    Pull;   // present on "combat" segments
};

export type RaidTimeline = {
  segments:         TimelineSegment[];
  totalDurationSec: number;
  combatSeconds:    number;
  uptimePct:        number;
};

/**
 * Builds a timeline spanning from the start of the FIRST pull through the
 * end of the LAST pull. Pull start/end times are already report-relative
 * seconds (see Pull.startTime/endTime), but the timeline itself is
 * re-based so t=0 is the first pull's start — this guarantees the timeline
 * always begins with a green (combat) segment instead of leading downtime
 * from the start of the log/report.
 */
export function computeRaidTimeline(pulls: Pull[]): RaidTimeline {
  if (pulls.length === 0) {
    return { segments: [], totalDurationSec: 0, combatSeconds: 0, uptimePct: 0 };
  }

  const sorted = [...pulls].sort((a, b) => a.startTime - b.startTime);
  const rangeStart = sorted[0].startTime;
  const rangeEnd = sorted[sorted.length - 1].endTime;
  const totalDurationSec = Math.max(0, rangeEnd - rangeStart);

  const segments: TimelineSegment[] = [];
  let cursor = rangeStart;
  let combatSeconds = 0;

  for (const pull of sorted) {
    if (pull.startTime > cursor) {
      segments.push({
        type:     "downtime",
        startSec: cursor - rangeStart,
        endSec:   pull.startTime - rangeStart,
      });
      cursor = pull.startTime;
    }

    const segStart = Math.max(cursor, pull.startTime);
    const segEnd   = Math.max(segStart, pull.endTime);

    if (segEnd > segStart) {
      segments.push({
        type:     "combat",
        startSec: segStart - rangeStart,
        endSec:   segEnd - rangeStart,
        pull,
      });
      combatSeconds += segEnd - segStart;
    }

    cursor = Math.max(cursor, segEnd);
  }

  const uptimePct = totalDurationSec > 0 ? (combatSeconds / totalDurationSec) * 100 : 0;

  return { segments, totalDurationSec, combatSeconds, uptimePct };
}

export function formatHMS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  }
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
