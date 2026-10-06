// lib/static-review-data.ts
//
// Pure transform from an already-imported Pull[] to the per-pull,
// per-player shape persisted by POST /api/statics/[staticId]/reviews
// (StaticReviewPull + StaticReviewPullPlayerError, see prisma/schema.prisma),
// plus the detail rows behind the mechanic/phase analysis: every error,
// phase segments and the wipe cause (buildStaticReviewPayload; see
// docs/static-player-analysis-plan.md).
// Computed client-side at "Add Review To Static" time — the app only ever
// has real Pull[] data in the browser (freshly fetched from WCL/FFL and run
// through detectPullErrors), so this can't be recomputed from scratch on
// the server.

import type { Pull } from "@/types/Pull";
import { CALL_WIPE_RULE_ID, type PullError } from "@/types/PullError";
import { getPullRaidCutoff } from "@/lib/report-data";
import { WCL_MYTHIC_DIFFICULTY } from "@/lib/wcl-client";
import { phaseAt, type EncounterPhase } from "@/lib/pull-phases";
import { getRuleMeta, staticRuleKey } from "@/lib/mechanics/rule-meta";
import { occurrenceForError } from "@/lib/mechanics/occurrences";

/**
 * Shape version of the detail rows (StaticReview.detailVersion). Bump when
 * the stored detail changes meaning, so the views can tell sessions apart.
 */
export const STATIC_DETAIL_VERSION = 1;

/**
 * The pulls that count toward a static's stats. WoW: Mythic raid pulls
 * only — Normal/Heroic raids and Mythic+ dungeons in the same log are
 * dropped. A WoW pull with no recorded difficulty (a session saved before
 * the field existed) is kept, since it can't be told apart. FFXIV: all.
 */
export function staticEligiblePulls(pulls: Pull[]): Pull[] {
  return pulls.filter((p) => p.game !== "wow" || p.difficulty === undefined || p.difficulty === WCL_MYTHIC_DIFFICULTY);
}

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

  // ── Detail (detailVersion ≥ 1; absent from older clients) ─────────────
  // Highest log phase id reached, null without phase data.
  lastPhase?:    number | null;
  phases?:       { phase: number; startMs: number; endMs: number }[];
  errors?:       StaticReviewErrorData[];
  mechanics?:    StaticReviewMechanicData[];
  endCause?:     StaticWipeCause | null;
};

/** One error of any severity, cutoff errors included and flagged. */
export type StaticReviewErrorData = {
  player:      string | null;
  ruleKey:     string;
  severity:    "Major" | "Minor" | "Raid";
  timestampMs: number;
  phase:       number | null;
  occurrence:  number | null;
  afterCutoff: boolean;
};

/** One mechanic instance the pull reached (filled per boss module later). */
export type StaticReviewMechanicData = {
  mechanicKey: string;
  occurrence:  number;
  timestampMs: number;
  phase:       number | null;
};

/** What ended a wiped pull (see computeWipeCause). */
export type StaticWipeCause = {
  kind:    "raidError" | "deathChain" | "called";
  // Rule behind the cause (raidError; the nearest Major for a called wipe).
  ruleKey: string | null;
  // Ability behind the cause (the error's ability, or the killing ability).
  ability: string | null;
  atMs:    number;
  phase:   number | null;
};

/** StaticRule row content, deduplicated per payload. */
export type StaticRuleData = {
  ruleKey:       string;
  name:          string;
  mechanicKey:   string;
  mechanicLabel: string;
  phaseHint:     number | null;
};

/** Everything POST /api/statics/[staticId]/reviews takes besides session info. */
export type StaticReviewPayload = {
  detailVersion: number;
  pulls:         StaticReviewPullData[];
  rules:         StaticRuleData[];
  phaseNames:    { bossName: string; phases: EncounterPhase[] }[];
};

// Death chain tuning for computeWipeCause. Measured 2026-10-06 on sample
// wipes: FFXIV wipes end ~2 s after the last death; the WoW wipes without a
// Raid error were resets, one with its last death 30 s before the end.
const DEATH_CHAIN_GAP_MS = 10_000;
const DEATH_CHAIN_END_WINDOW_MS = 15_000;

/** StaticRule key for an error: rule id plus name (lib/mechanics/rule-meta.ts). */
function errorRuleKey(e: PullError): string {
  return staticRuleKey(e.ruleId, e.name);
}

/**
 * What ended a wiped pull, or null for a kill or when nothing qualifies.
 * First that applies:
 * 1. The pull's first Raid error (the getPullRaidCutoff error).
 * 2. A manual Call Wipe as that first Raid error: "called", pointing at the
 *    nearest Major error or death before the call.
 * 3. No Raid error: the final death chain — walking back from the last
 *    death while deaths are ≤ DEATH_CHAIN_GAP_MS apart; the cause is the
 *    first death's killing ability. The chain must end within
 *    DEATH_CHAIN_END_WINDOW_MS of the pull end, otherwise the raid reset
 *    while alive and the cause is unknown.
 */
export function computeWipeCause(pull: Pull): StaticWipeCause | null {
  if (pull.result !== "Wipe") return null;
  const phaseOf = (ms: number) => phaseAt(pull.phaseSegments, ms);

  const raidErrors = pull.errors
    .filter((e) => e.severity === "Raid")
    .sort((a, b) => a.timestamp - b.timestamp);
  if (raidErrors.length > 0) {
    const firstAt = raidErrors[0].timestamp;
    const atCutoff = raidErrors.filter((e) => e.timestamp === firstAt);
    const detected = atCutoff.find((e) => e.ruleId !== CALL_WIPE_RULE_ID);
    if (detected) {
      return { kind: "raidError", ruleKey: errorRuleKey(detected), ability: detected.abilityName || null, atMs: detected.timestamp, phase: phaseOf(detected.timestamp) };
    }

    const lastMajor = pull.errors
      .filter((e) => e.severity === "Major" && e.timestamp <= firstAt)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    const lastDeath = pull.deathEvents
      .filter((d) => d.timestamp <= firstAt)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    if (lastMajor && (!lastDeath || lastMajor.timestamp >= lastDeath.timestamp)) {
      return { kind: "called", ruleKey: errorRuleKey(lastMajor), ability: lastMajor.abilityName || null, atMs: lastMajor.timestamp, phase: phaseOf(lastMajor.timestamp) };
    }
    if (lastDeath) {
      return { kind: "called", ruleKey: null, ability: lastDeath.cause || null, atMs: lastDeath.timestamp, phase: phaseOf(lastDeath.timestamp) };
    }
    return { kind: "called", ruleKey: null, ability: null, atMs: firstAt, phase: phaseOf(firstAt) };
  }

  const deaths = [...pull.deathEvents].sort((a, b) => a.timestamp - b.timestamp);
  if (deaths.length === 0) return null;
  if (pull.fightDuration - deaths[deaths.length - 1].timestamp > DEATH_CHAIN_END_WINDOW_MS) return null;
  let i = deaths.length - 1;
  while (i > 0 && deaths[i].timestamp - deaths[i - 1].timestamp <= DEATH_CHAIN_GAP_MS) i--;
  const first = deaths[i];
  return { kind: "deathChain", ruleKey: null, ability: first.cause || null, atMs: first.timestamp, phase: phaseOf(first.timestamp) };
}

/** Per-error detail for one pull (all severities, cutoff flagged). */
function computePullErrorDetail(pull: Pull, cutoff: number | null): StaticReviewErrorData[] {
  return pull.errors.map((e) => ({
    player:      e.player ?? null,
    ruleKey:     errorRuleKey(e),
    severity:    e.severity,
    timestampMs: Math.round(e.timestamp),
    phase:       phaseAt(pull.phaseSegments, e.timestamp),
    occurrence:  occurrenceForError(pull.mechanicOccurrences, getRuleMeta(e.ruleId, e.name).mechanicKey, e.timestamp),
    afterCutoff: cutoff !== null && e.timestamp > cutoff,
  }));
}

/**
 * The full POST payload: count rows plus detail rows, the rules they
 * reference and the phase names. Run against displayPulls (never pulls —
 * the cross-pull errors live only in displayPulls, see
 * docs/app-architecture.md).
 */
export function buildStaticReviewPayload(pulls: Pull[]): StaticReviewPayload {
  const rules = new Map<string, StaticRuleData>();
  for (const pull of pulls) {
    for (const e of pull.errors) {
      const ruleKey = errorRuleKey(e);
      const meta = getRuleMeta(e.ruleId, e.name);
      rules.set(ruleKey, {
        ruleKey,
        name:          e.name,
        mechanicKey:   meta.mechanicKey,
        mechanicLabel: meta.mechanicLabel,
        phaseHint:     meta.phaseHint ?? null,
      });
    }
  }

  const phaseNames = new Map<string, EncounterPhase[]>();
  for (const pull of pulls) {
    if (pull.encounterPhases?.length) phaseNames.set(pull.name, pull.encounterPhases);
  }

  return {
    detailVersion: STATIC_DETAIL_VERSION,
    pulls:         computeStaticReviewPullData(pulls),
    rules:         [...rules.values()],
    phaseNames:    [...phaseNames].map(([bossName, phases]) => ({ bossName, phases })),
  };
}

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
      lastPhase:     pull.phaseSegments?.length ? Math.max(...pull.phaseSegments.map((s) => s.phase)) : null,
      phases:        (pull.phaseSegments ?? []).map((s) => ({ phase: s.phase, startMs: s.startMs, endMs: s.endMs })),
      errors:        computePullErrorDetail(pull, cutoff),
      mechanics:     (pull.mechanicOccurrences ?? []).map((o) => ({
        mechanicKey: o.mechanicKey,
        occurrence:  o.occurrence,
        timestampMs: Math.round(o.timestamp),
        phase:       phaseAt(pull.phaseSegments, o.timestamp),
      })),
      endCause:      computeWipeCause(pull),
    };
  });
}
