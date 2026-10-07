// lib/pull-phases.ts
//
// Phase data for a pull, read from the report metadata both FFLogs and WCL
// return with the fight list (no event download). Feeds the Statics
// per-phase analysis (docs/archive/static-player-analysis-plan.md, "Data check
// findings").
//
// How the log's fields behave (checked 2026-10-06 on Dancing Mad, Midnight
// Falls and every Venomous Abyss boss):
// - Phase identity is `phaseTransitions[].id`, matching the report-level
//   `phases[].id`. The fight's `lastPhase` is a stage ordinal that skips
//   intermissions (Midnight Falls Stage Two is id 3 but `lastPhase` 2), so
//   it is never used as a phase id here.
// - Transition times are report-absolute ms (the base of `fight.startTime`);
//   the first transition equals the fight start, and the last segment runs
//   to `fight.endTime`.
// - Some encounters alternate (Entombed Sentinels, Sszorak, Lost Explorers):
//   the same phase id appears in several segments of one pull.
// - Some encounters have no phases at all (Vashnik, Twin Fangs, Nymrissa):
//   `lastPhase` 0, no transitions, absent from the report's `phases`.
// - FFLogs sometimes returns no transitions for a whole report even though
//   the encounter has phases (two P1-only Dancing Mad nights). With
//   `lastPhase` 1 the whole pull is the first stage, so one segment is
//   synthesized; any other value without transitions is left unknown.

export type EncounterPhase = {
  id:             number;
  name:           string;
  isIntermission: boolean;
};

/** Report-level `phases` entry: the phase list for one encounter. */
export type ReportEncounterPhases = {
  encounterID:     number;
  separatesWipes?: boolean | null;
  phases:          EncounterPhase[] | null;
};

/** One stretch of a pull spent in one phase, in ms from pull start. */
export type PullPhaseSegment = {
  phase:   number;   // the log's phase id (EncounterPhase.id)
  startMs: number;
  endMs:   number;
};

/** The phase fields a WCL/FFLogs fight carries (see the report queries). */
export type FightPhaseFields = {
  startTime:         number;
  endTime:           number;
  encounterID?:      number | null;
  lastPhase?:        number | null;
  phaseTransitions?: { id: number; startTime: number }[] | null;
  /** Not from the API: the encounter's phase list, set by attachEncounterPhases. */
  encounterPhases?:  EncounterPhase[];
};

/**
 * Copies each encounter's phase list from the report-level `phases` onto
 * its fights, so per-fight code (fetchFightData → transform) has it without
 * extra plumbing. Encounters without phase data are left untouched.
 */
export function attachEncounterPhases(
  fights:       FightPhaseFields[],
  reportPhases: ReportEncounterPhases[] | null | undefined,
): void {
  if (!reportPhases?.length) return;
  const byEncounter = new Map<number, EncounterPhase[]>();
  for (const entry of reportPhases) {
    if (entry.phases?.length) byEncounter.set(entry.encounterID, entry.phases);
  }
  for (const fight of fights) {
    const phases = fight.encounterID != null ? byEncounter.get(fight.encounterID) : undefined;
    if (phases) fight.encounterPhases = phases;
  }
}

/**
 * The pull's phase segments, or undefined when the log has no phase data
 * for it (see the header for the fallback rules).
 */
export function buildPullPhaseSegments(fight: FightPhaseFields): PullPhaseSegment[] | undefined {
  const durationMs = fight.endTime - fight.startTime;
  const transitions = fight.phaseTransitions ?? [];

  if (transitions.length === 0) {
    if (fight.lastPhase !== 1 || !fight.encounterPhases?.length) return undefined;
    const first = fight.encounterPhases.find(p => !p.isIntermission) ?? fight.encounterPhases[0];
    return [{ phase: first.id, startMs: 0, endMs: durationMs }];
  }

  const sorted = [...transitions].sort((a, b) => a.startTime - b.startTime);
  const segments: PullPhaseSegment[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const startMs = Math.max(0, Math.round(sorted[i].startTime - fight.startTime));
    const endMs = i + 1 < sorted.length
      ? Math.round(sorted[i + 1].startTime - fight.startTime)
      : durationMs;
    const prev = segments[segments.length - 1];
    if (prev && prev.phase === sorted[i].id) { prev.endMs = endMs; continue; }
    segments.push({ phase: sorted[i].id, startMs, endMs: Math.max(startMs, endMs) });
  }
  return segments;
}

/** The phase a pull-relative timestamp falls in, or null without phase data. */
export function phaseAt(segments: PullPhaseSegment[] | undefined, timestampMs: number): number | null {
  if (!segments?.length) return null;
  for (let i = segments.length - 1; i >= 0; i--) {
    if (timestampMs >= segments[i].startMs) return segments[i].phase;
  }
  return segments[0].phase;
}
