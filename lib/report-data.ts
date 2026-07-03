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
  role:            ReportRole;
  game:            ReportGame;

  // Column 2 — how many pulls this player caused the very first
  // Major error or death.
  firstErrorCount: number;
  // Column 3 — firstErrorCount / total pulls, as a 0–100 percentage.
  firstErrorPct:   number;

  // Column 4 — how many times this player's error/death was among the
  // first 3 Major errors/deaths of a pull (a player can be credited twice
  // in the same pull if they account for 2 of the first 3 events).
  top3Count:       number;
  // Column 5 — top3Count / total pulls, as a 0–100 percentage.
  top3Pct:         number;

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

// A pull's ordered stream of "critical" events — every death plus every
// Major (not Minor) error, sorted chronologically. This is the shared
// source for both the first-error and top-3 metrics.
function getPullCriticalEvents(pull: Pull): CriticalEvent[] {
  const deaths: CriticalEvent[] = pull.deathEvents.map((d) => ({
    timestamp: d.timestamp,
    player:    d.player,
    class:     d.class,
    role:      d.role,
  }));

  const majors: CriticalEvent[] = pull.errors
    .filter((e) => e.severity === "Major")
    .map((e) => ({
      timestamp: e.timestamp,
      player:    e.player,
      class:     e.class,
      role:      e.role,
    }));

  return [...deaths, ...majors].sort((a, b) => a.timestamp - b.timestamp);
}

// Roster info keyed by player name. Names are used as the join key across
// pulls since actorId is only stable within a single pull/report.
type RosterEntry = { className: string; role: ReportRole; game: ReportGame };

function buildRoster(pulls: Pull[]): Map<string, RosterEntry> {
  const roster = new Map<string, RosterEntry>();

  for (const pull of pulls) {
    for (const p of pull.players) {
      // Same exclusions RosterPanel already applies — these aren't real
      // individual players and shouldn't show up in the report.
      if (p.name === "Multiple Players") continue;
      if (p.specName === "LimitBreak" || p.specName === "Limit Break") continue;

      if (!roster.has(p.name)) {
        roster.set(p.name, { className: p.className, role: p.role, game: pull.game });
      }
    }
  }

  return roster;
}

/**
 * Computes the per-player First Errors / Top 3 stats table for every player
 * who appears anywhere in the given pulls.
 *
 * Sorted descending by firstErrorPct (column 3) — the players most likely
 * to be the first mistake of a pull rise to the top.
 */
export function computePlayerReportStats(pulls: Pull[]): PlayerReportStats[] {
  const roster        = buildRoster(pulls);
  const totalPulls     = pulls.length;
  const firstErrorMap = new Map<string, number>();
  const top3Map        = new Map<string, number>();

  for (const pull of pulls) {
    const events = getPullCriticalEvents(pull);
    if (events.length === 0) continue;

    const first = events[0];
    firstErrorMap.set(first.player, (firstErrorMap.get(first.player) ?? 0) + 1);

    for (const e of events.slice(0, 3)) {
      top3Map.set(e.player, (top3Map.get(e.player) ?? 0) + 1);
    }
  }

  const stats: PlayerReportStats[] = [];

  for (const [name, info] of roster.entries()) {
    const firstErrorCount = firstErrorMap.get(name) ?? 0;
    const top3Count       = top3Map.get(name) ?? 0;

    stats.push({
      name,
      className:       info.className,
      role:            info.role,
      game:            info.game,
      firstErrorCount,
      firstErrorPct:   totalPulls > 0 ? (firstErrorCount / totalPulls) * 100 : 0,
      top3Count,
      top3Pct:         totalPulls > 0 ? (top3Count / totalPulls) * 100 : 0,
      combinedScore:   firstErrorCount + top3Count,
    });
  }

  stats.sort((a, b) => {
    if (b.firstErrorPct !== a.firstErrorPct) return b.firstErrorPct - a.firstErrorPct;
    if (b.top3Pct !== a.top3Pct) return b.top3Pct - a.top3Pct;
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
 * Builds a gapless timeline from t=0 (start of the log) through the end of
 * the final pull. Pull start/end times are already report-relative seconds
 * (see Pull.startTime/endTime). Green = a pull was engaged, gray = downtime
 * between/before pulls.
 */
export function computeRaidTimeline(pulls: Pull[]): RaidTimeline {
  if (pulls.length === 0) {
    return { segments: [], totalDurationSec: 0, combatSeconds: 0, uptimePct: 0 };
  }

  const sorted = [...pulls].sort((a, b) => a.startTime - b.startTime);
  const totalDurationSec = sorted[sorted.length - 1].endTime;

  const segments: TimelineSegment[] = [];
  let cursor = 0;
  let combatSeconds = 0;

  for (const pull of sorted) {
    if (pull.startTime > cursor) {
      segments.push({ type: "downtime", startSec: cursor, endSec: pull.startTime });
      cursor = pull.startTime;
    }

    const segStart = Math.max(cursor, pull.startTime);
    const segEnd   = Math.max(segStart, pull.endTime);

    if (segEnd > segStart) {
      segments.push({ type: "combat", startSec: segStart, endSec: segEnd, pull });
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
