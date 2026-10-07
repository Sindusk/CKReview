// lib/static-analysis.ts
//
// Server-only. Loads a static's detailed sessions (StaticReview.detailVersion
// set) and aggregates them for the analysis routes under
// app/api/statics/[staticId]/analysis/ — per-mechanic rates for the raid or
// one player, and wipe causes. See docs/archive/static-player-analysis-plan.md.
//
// Counting rules (settled with the user, see the plan's "Decisions"):
// - Majors only by default; `includeMinors` adds Minors. Raid errors are not
//   ranked as mechanics; they show up as wipe causes.
// - Errors after the pull's raid cutoff (afterCutoff) are never counted, so
//   the numbers match the count rows and the Report tab.
// - A mechanic's "chances" use the best exposure data available:
//   1. "occurrence": mechanic instances the pull reached
//      (StaticReviewPullMechanic), when the boss module reports them;
//   2. "phase": pulls that reached the mechanic's phase;
//   3. "pull": every pull, for encounters without phase data.
//   `failed` is the number of chances with at least one counted error, so
//   "6/14" reads "failed 6 of the 14 times it happened". `errors` is the raw
//   error count (several players can fail one chance).
// - Sessions are ordered by addedAt, like the rest of the statics views.

import { prisma } from "@/lib/prisma";

export type AnalysisFilter = {
  boss:          string | null;
  /** Last N detailed sessions; null = all. */
  sessions:      number | null;
  from:          Date | null;
  to:            Date | null;
  phase:         number | null;
  includeMinors: boolean;
};

export function parseAnalysisFilter(params: URLSearchParams): AnalysisFilter {
  const int = (name: string) => {
    const raw = params.get(name);
    if (raw === null || raw === "") return null;
    const n = Number(raw);
    return Number.isInteger(n) ? n : null;
  };
  const date = (name: string) => {
    const raw = params.get(name);
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const sessions = int("sessions");
  return {
    boss:          params.get("boss") || null,
    sessions:      sessions !== null && sessions > 0 ? sessions : null,
    from:          date("from"),
    to:            date("to"),
    phase:         int("phase"),
    includeMinors: params.get("includeMinors") === "true" || params.get("includeMinors") === "1",
  };
}

// ─── Loading ────────────────────────────────────────────────────────────────

export type AnalysisSession = {
  id:      number;
  label:   string | null;
  /** When the log was recorded, else when it was added. ISO string. */
  date:    string;
  pulls:   number;
};

export type AnalysisPhase = { id: number; name: string; isIntermission: boolean };

type LoadedError = {
  identityId:  number | null;
  player:      string | null;
  severity:    string;
  timestampMs: number;
  phase:       number | null;
  occurrence:  number | null;
  rule:        { mechanicKey: string; mechanicLabel: string; phaseHint: number | null; name: string };
};

type LoadedPull = {
  id:               number;
  sessionId:        number;
  pullNumber:       number;
  result:           string;
  durationMs:       number;
  lastPhase:        number | null;
  endCauseKind:     string | null;
  endCauseAbility:  string | null;
  endCausePhase:    number | null;
  endCauseRule:     { mechanicKey: string; mechanicLabel: string } | null;
  phases:           { phase: number }[];
  mechanics:        { mechanicKey: string; occurrence: number; phase: number | null }[];
  errors:           LoadedError[];
  /** Identity ids in the pull's roster (from the count rows). */
  roster:           Set<number>;
};

export type AnalysisContext = {
  boss:                string | null;
  bosses:              { name: string; pulls: number }[];
  phases:              AnalysisPhase[];
  sessions:            AnalysisSession[];
  /** Sessions with this boss imported before detailed tracking. */
  undetailedSessions:  number;
  pulls:               LoadedPull[];
};

/** Loads every detailed pull of the filter's boss and sessions. */
export async function loadAnalysisContext(staticId: number, filter: AnalysisFilter): Promise<AnalysisContext> {
  const bossRows = await prisma.staticReviewPull.groupBy({
    by:     ["bossName"],
    where:  { review: { staticId, detailVersion: { not: null } } },
    _count: { _all: true },
  });
  const bosses = bossRows
    .map((b) => ({ name: b.bossName, pulls: b._count._all }))
    .sort((a, b) => b.pulls - a.pulls);
  const boss = filter.boss && bosses.some((b) => b.name === filter.boss) ? filter.boss : bosses[0]?.name ?? null;

  if (!boss) {
    const undetailedSessions = await prisma.staticReview.count({ where: { staticId, detailVersion: null } });
    return { boss: null, bosses, phases: [], sessions: [], undetailedSessions, pulls: [] };
  }

  const [reviews, undetailedSessions, phaseRows] = await Promise.all([
    prisma.staticReview.findMany({
      where:   { staticId, detailVersion: { not: null }, pulls: { some: { bossName: boss } } },
      orderBy: { addedAt: "asc" },
      select:  { id: true, label: true, addedAt: true, reportStartedAt: true },
    }),
    prisma.staticReview.count({
      where: { staticId, detailVersion: null, pulls: { some: { bossName: boss } } },
    }),
    prisma.staticPhase.findMany({
      where:   { staticId, bossName: boss },
      orderBy: { phaseId: "asc" },
      select:  { phaseId: true, name: true, isIntermission: true },
    }),
  ]);

  let selected = reviews.filter((r) => {
    const when = r.reportStartedAt ?? r.addedAt;
    return (!filter.from || when >= filter.from) && (!filter.to || when <= filter.to);
  });
  if (filter.sessions !== null) selected = selected.slice(-filter.sessions);

  const severities = filter.includeMinors ? ["Major", "Minor"] : ["Major"];
  const rawPulls = await prisma.staticReviewPull.findMany({
    where:   { staticReviewId: { in: selected.map((r) => r.id) }, bossName: boss },
    orderBy: [{ staticReviewId: "asc" }, { pullNumber: "asc" }],
    select: {
      id: true, staticReviewId: true, pullNumber: true, result: true, durationMs: true, lastPhase: true,
      endCauseKind: true, endCauseAbility: true, endCausePhase: true,
      endCauseRule: { select: { mechanicKey: true, mechanicLabel: true } },
      phases:       { select: { phase: true }, orderBy: { seq: "asc" } },
      mechanics:    { select: { mechanicKey: true, occurrence: true, phase: true } },
      errors: {
        where:  { afterCutoff: false, severity: { in: severities } },
        select: {
          identityId: true, player: true, severity: true, timestampMs: true, phase: true, occurrence: true,
          rule: { select: { mechanicKey: true, mechanicLabel: true, phaseHint: true, name: true } },
        },
      },
      playerErrors: { select: { identityId: true } },
    },
  });

  const pullCounts = new Map<number, number>();
  for (const p of rawPulls) pullCounts.set(p.staticReviewId, (pullCounts.get(p.staticReviewId) ?? 0) + 1);

  return {
    boss,
    bosses,
    phases: phaseRows.map((p) => ({ id: p.phaseId, name: p.name, isIntermission: p.isIntermission })),
    sessions: selected.map((r) => ({
      id:    r.id,
      label: r.label,
      date:  (r.reportStartedAt ?? r.addedAt).toISOString(),
      pulls: pullCounts.get(r.id) ?? 0,
    })),
    undetailedSessions,
    pulls: rawPulls.map((p) => ({
      id:              p.id,
      sessionId:       p.staticReviewId,
      pullNumber:      p.pullNumber,
      result:          p.result,
      durationMs:      p.durationMs,
      lastPhase:       p.lastPhase,
      endCauseKind:    p.endCauseKind,
      endCauseAbility: p.endCauseAbility,
      endCausePhase:   p.endCausePhase,
      endCauseRule:    p.endCauseRule,
      phases:          p.phases,
      mechanics:       p.mechanics,
      errors:          p.errors,
      roster:          new Set(p.playerErrors.map((pe) => pe.identityId).filter((id): id is number => id !== null)),
    })),
  };
}

// ─── Mechanics ──────────────────────────────────────────────────────────────

export type ChanceKind = "occurrence" | "phase" | "pull";

export type SessionTally = { sessionId: number; failed: number; chances: number; errors: number };

export type MechanicStats = {
  mechanicKey: string;
  label:       string;
  /** The phase the chances were counted against, null for pull exposure. */
  phase:       number | null;
  chanceKind:  ChanceKind;
  errors:      number;
  failed:      number;
  chances:     number;
  /** failed / chances, null without chances. */
  rate:        number | null;
  players:     number;
  rules:       { name: string; errors: number }[];
  perSession:  SessionTally[];
};

/**
 * The one phase a mechanic belongs to, or null when its errors span several
 * phases (a generic rule) or nothing places it. Such a mechanic falls back
 * to pull exposure unless a phase filter pins it.
 */
function mechanicPhase(errors: LoadedError[]): number | null {
  const phases = new Set<number>();
  for (const e of errors) if (e.phase !== null) phases.add(e.phase);
  if (phases.size === 1) return [...phases][0];
  if (phases.size > 1) return null;
  return errors.find((e) => e.rule.phaseHint !== null)?.rule.phaseHint ?? null;
}

function errorInPhase(e: LoadedError, phase: number): boolean {
  return e.phase === phase || (e.phase === null && e.rule.phaseHint === phase);
}

/**
 * Per-mechanic stats over `ctx.pulls`. With `identityId`, only that player's
 * errors count and chances are limited to pulls they played.
 */
export function computeMechanicStats(ctx: AnalysisContext, filter: AnalysisFilter, identityId?: number): MechanicStats[] {
  const pulls = identityId === undefined ? ctx.pulls : ctx.pulls.filter((p) => p.roster.has(identityId));

  // Errors per mechanic, keeping the pull each came from.
  const byMechanic = new Map<string, { label: string; items: { pull: LoadedPull; e: LoadedError }[] }>();
  for (const pull of pulls) {
    for (const e of pull.errors) {
      if (identityId !== undefined && e.identityId !== identityId) continue;
      if (filter.phase !== null && !errorInPhase(e, filter.phase)) continue;
      const entry = byMechanic.get(e.rule.mechanicKey) ?? { label: e.rule.mechanicLabel, items: [] };
      entry.items.push({ pull, e });
      byMechanic.set(e.rule.mechanicKey, entry);
    }
  }

  const stats: MechanicStats[] = [];
  for (const [mechanicKey, { label, items: allItems }] of byMechanic) {
    const phase = filter.phase ?? mechanicPhase(allItems.map((i) => i.e));
    const hasOccurrences = pulls.some((p) => p.mechanics.some((m) => m.mechanicKey === mechanicKey));
    const hasPhaseData = phase !== null && pulls.some((p) => p.phases.length > 0);
    const chanceKind: ChanceKind = hasOccurrences ? "occurrence" : hasPhaseData ? "phase" : "pull";
    // Phase exposure can't be judged on a pull without phase data (a session
    // saved before phases were fetched), so those pulls sit out entirely
    // rather than counting only their failures as chances.
    const counted = chanceKind === "phase" ? pulls.filter((p) => p.phases.length > 0) : pulls;
    const countedIds = new Set(counted.map((p) => p.id));
    const items = allItems.filter((i) => countedIds.has(i.pull.id));
    if (items.length === 0) continue;

    // Chances and failures per pull, then summed per session and overall.
    const chancesIn = (p: LoadedPull): number => {
      if (chanceKind === "occurrence") {
        return p.mechanics.filter((m) => m.mechanicKey === mechanicKey && (filter.phase === null || m.phase === filter.phase)).length;
      }
      if (chanceKind === "phase") return p.phases.some((s) => s.phase === phase) ? 1 : 0;
      return 1;
    };
    const failedIn = new Map<number, Set<string>>(); // pullId -> failed chance ids
    for (const { pull, e } of items) {
      const set = failedIn.get(pull.id) ?? new Set<string>();
      set.add(chanceKind === "occurrence" ? String(e.occurrence ?? "?") : "pull");
      failedIn.set(pull.id, set);
    }

    const perSession = new Map<number, SessionTally>();
    let chances = 0;
    let failed = 0;
    for (const p of counted) {
      const c = chancesIn(p);
      // A failure always implies the mechanic happened, even where the
      // exposure data missed it (no phase segment, unreported occurrence).
      const f = failedIn.get(p.id)?.size ?? 0;
      const pc = Math.max(c, f);
      const tally = perSession.get(p.sessionId) ?? { sessionId: p.sessionId, failed: 0, chances: 0, errors: 0 };
      tally.chances += pc;
      tally.failed += f;
      perSession.set(p.sessionId, tally);
      chances += pc;
      failed += f;
    }
    for (const { pull } of items) perSession.get(pull.sessionId)!.errors += 1;

    const rules = new Map<string, number>();
    for (const { e } of items) rules.set(e.rule.name, (rules.get(e.rule.name) ?? 0) + 1);

    stats.push({
      mechanicKey,
      label,
      phase: chanceKind === "pull" ? null : phase,
      chanceKind,
      errors:   items.length,
      failed,
      chances,
      rate:     chances > 0 ? failed / chances : null,
      players:  new Set(items.map((i) => i.e.identityId).filter((id) => id !== null)).size,
      rules:    [...rules].map(([name, errors]) => ({ name, errors })).sort((a, b) => b.errors - a.errors),
      perSession: ctx.sessions.map((s) => perSession.get(s.id) ?? { sessionId: s.id, failed: 0, chances: 0, errors: 0 }),
    });
  }

  return stats.sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1) || b.failed - a.failed || a.label.localeCompare(b.label));
}

/** One counted error of a player, for the fight-timeline strip. */
export type TimelineError = {
  timestampMs: number;
  phase:       number | null;
  mechanicKey: string;
  label:       string;
  severity:    string;
  sessionId:   number;
  pullNumber:  number;
};

export function computePlayerTimeline(ctx: AnalysisContext, filter: AnalysisFilter, identityId: number): TimelineError[] {
  const out: TimelineError[] = [];
  for (const p of ctx.pulls) {
    for (const e of p.errors) {
      if (e.identityId !== identityId) continue;
      if (filter.phase !== null && !errorInPhase(e, filter.phase)) continue;
      out.push({
        timestampMs: e.timestampMs, phase: e.phase, mechanicKey: e.rule.mechanicKey, label: e.rule.mechanicLabel,
        severity: e.severity, sessionId: p.sessionId, pullNumber: p.pullNumber,
      });
    }
  }
  return out.sort((a, b) => a.timestampMs - b.timestampMs);
}

// ─── Wipe causes ────────────────────────────────────────────────────────────

export type WipeCauseStats = {
  /** "m:<mechanicKey>" for a rule's mechanic, "a:<ability>" for a death's ability. */
  key:        string;
  label:      string;
  count:      number;
  kinds:      { raidError: number; deathChain: number; called: number };
  perSession: { sessionId: number; count: number }[];
};

export type WipeCauseSummary = {
  wipes:      number;
  unknown:    number;
  causes:     WipeCauseStats[];
  /** Wipes per session in the same filter, the trend's denominator. */
  perSession: { sessionId: number; wipes: number }[];
};

/** The phase a pull ended in: its last segment, else the cause's phase. */
function endPhase(p: LoadedPull): number | null {
  return p.phases.length > 0 ? p.phases[p.phases.length - 1].phase : p.endCausePhase;
}

export function computeWipeCauses(ctx: AnalysisContext, filter: AnalysisFilter): WipeCauseSummary {
  const wipes = ctx.pulls.filter((p) => p.result === "Wipe" && (filter.phase === null || endPhase(p) === filter.phase));
  const causes = new Map<string, WipeCauseStats>();
  const wipesPerSession = new Map<number, number>();
  let unknown = 0;

  for (const p of wipes) {
    wipesPerSession.set(p.sessionId, (wipesPerSession.get(p.sessionId) ?? 0) + 1);
    const kind = p.endCauseKind as keyof WipeCauseStats["kinds"] | null;
    let key: string | null = null;
    let label = "";
    if (p.endCauseRule) { key = `m:${p.endCauseRule.mechanicKey}`; label = p.endCauseRule.mechanicLabel; }
    else if (p.endCauseAbility) { key = `a:${p.endCauseAbility}`; label = p.endCauseAbility; }
    if (!kind || !key) { unknown += 1; continue; }

    const entry = causes.get(key) ?? {
      key, label, count: 0, kinds: { raidError: 0, deathChain: 0, called: 0 },
      perSession: ctx.sessions.map((s) => ({ sessionId: s.id, count: 0 })),
    };
    entry.count += 1;
    if (kind in entry.kinds) entry.kinds[kind] += 1;
    const ps = entry.perSession.find((s) => s.sessionId === p.sessionId);
    if (ps) ps.count += 1;
    causes.set(key, entry);
  }

  return {
    wipes:   wipes.length,
    unknown,
    causes:  [...causes.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    perSession: ctx.sessions.map((s) => ({ sessionId: s.id, wipes: wipesPerSession.get(s.id) ?? 0 })),
  };
}

/** Context fields every analysis response carries. */
export function contextSummary(ctx: AnalysisContext) {
  return {
    boss:               ctx.boss,
    bosses:             ctx.bosses,
    phases:             ctx.phases,
    sessions:           ctx.sessions,
    undetailedSessions: ctx.undetailedSessions,
    pulls:              ctx.pulls.length,
    // Pulls stored without phase data; phase-based rates leave them out.
    pullsWithoutPhases: ctx.phases.length > 0 ? ctx.pulls.filter((p) => p.phases.length === 0).length : 0,
  };
}
