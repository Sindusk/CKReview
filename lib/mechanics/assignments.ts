// lib/mechanics/assignments.ts
//
// Assigned duties (docs/exposure-plan.md): a job the raid lead gives to a
// player, such as The Lost Explorers' fish carrier. The boss module reports
// every instance of an assigned mechanic with the player(s) who performed
// it (lib/mechanics/occurrences.ts); this file works out, across all of a
// report's pulls, who the job was given to, and fills that in where nobody
// performed it, so the failure lands on the assignee.
//
// Generic over every mechanic whose rule-meta exposure is "assigned"; no
// boss-specific code here.
//
// Detection (thresholds chosen by the builder, not yet confirmed — listed
// in docs/open-items.md):
// - "single": one player performed at least SINGLE_SHARE of the instances
//   someone performed. They are the assignee of every instance.
// - "shared": no single player, but two or three each performed at least
//   SHARED_MIN_SHARE and together at least SINGLE_SHARE (Lost Explorers
//   report A: two carriers, no fixed per-cycle order). An instance nobody
//   performed stays player-less: which of them should have done it is not
//   known (user, 2026-10-11).
// - "none": nobody detected (fewer than MIN_PERFORMED performed instances,
//   or no clear pattern).
//
// Override: the Strategy dialog lets the user pick the assignee, or
// "nobody assigned", per duty. Saved in the report's session
// (SavedSession.dutyOverrides), so it applies to this report only, on
// every import and resync (user, 2026-10-11).
//
// Applied in app/page.tsx's displayPulls layer, so the Report tab, the pull
// list and the static import all see the same attribution.

import type { Pull } from "@/types/Pull";
import type { PullError } from "@/types/PullError";
import { getPullRaidCutoff } from "@/lib/report-data";
import { getRuleMeta, mechanicDutyLabel, mechanicExposure } from "./rule-meta";
import { occurrenceForError, type MechanicOccurrence } from "./occurrences";

const SINGLE_SHARE = 0.75;
const SHARED_MIN_SHARE = 0.25;
const MIN_PERFORMED = 3;

export type DutyAssignee = { player: string; performed: number };

export type DutyAssignment = {
  mechanicKey: string;
  label:       string;
  /** The boss the duty belongs to (its pulls' name). */
  boss:        string;
  kind:        "single" | "shared" | "none";
  /** "override" when the user picked it in the Strategy dialog. */
  source:      "detected" | "override";
  /** The assignee(s), most performed first; empty for "none". */
  assignees:   DutyAssignee[];
  /** Everyone who performed it at least once, most first. */
  performers:  DutyAssignee[];
  /** Instances someone performed / all instances, across the report. */
  performed:   number;
  instances:   number;
  pulls:       number;
};

/** Per duty: a player name, or null for "nobody assigned". Absent = auto. */
export type DutyOverrides = Record<string, string | null>;

/** Every assigned mechanic in the report with its detected assignee(s). */
export function detectDutyAssignments(pulls: Pull[]): DutyAssignment[] {
  const byKey = new Map<string, { instances: number; performed: number; pulls: Set<number>; bosses: Map<string, number>; counts: Map<string, number> }>();
  for (const pull of pulls) {
    for (const o of pull.mechanicOccurrences ?? []) {
      if (!o.players || mechanicExposure(o.mechanicKey) !== "assigned") continue;
      const entry = byKey.get(o.mechanicKey)
        ?? { instances: 0, performed: 0, pulls: new Set<number>(), bosses: new Map<string, number>(), counts: new Map<string, number>() };
      entry.instances += 1;
      entry.pulls.add(pull.id);
      entry.bosses.set(pull.name, (entry.bosses.get(pull.name) ?? 0) + 1);
      if (o.players.length > 0) entry.performed += 1;
      for (const name of o.players) entry.counts.set(name, (entry.counts.get(name) ?? 0) + 1);
      byKey.set(o.mechanicKey, entry);
    }
  }

  const out: DutyAssignment[] = [];
  for (const [mechanicKey, e] of byKey) {
    const performers = [...e.counts].map(([player, performed]) => ({ player, performed })).sort((a, b) => b.performed - a.performed);
    const share = (n: number) => n / e.performed;
    let kind: DutyAssignment["kind"] = "none";
    let assignees: DutyAssignee[] = [];
    if (e.performed >= MIN_PERFORMED && share(performers[0].performed) >= SINGLE_SHARE) {
      kind = "single";
      assignees = [performers[0]];
    } else if (e.performed >= MIN_PERFORMED) {
      const sharers = performers.filter((r) => share(r.performed) >= SHARED_MIN_SHARE).slice(0, 3);
      if (sharers.length >= 2 && share(sharers.reduce((s, r) => s + r.performed, 0)) >= SINGLE_SHARE) {
        kind = "shared";
        assignees = sharers;
      }
    }
    out.push({
      mechanicKey,
      label:     mechanicDutyLabel(mechanicKey),
      boss:      [...e.bosses].sort((a, b) => b[1] - a[1])[0][0],
      kind,
      source:    "detected",
      assignees,
      performers,
      performed: e.performed,
      instances: e.instances,
      pulls:     e.pulls.size,
    });
  }
  return out.sort((a, b) => a.boss.localeCompare(b.boss) || a.label.localeCompare(b.label));
}

/** The detected duties with the user's overrides applied. */
export function resolveDutyAssignments(detected: DutyAssignment[], overrides: DutyOverrides): DutyAssignment[] {
  return detected.map((d) => {
    if (!(d.mechanicKey in overrides)) return d;
    const player = overrides[d.mechanicKey];
    if (player === null) return { ...d, kind: "none", source: "override", assignees: [] };
    const performed = d.performers.find((p) => p.player === player)?.performed ?? 0;
    return { ...d, kind: "single", source: "override", assignees: [{ player, performed }] };
  });
}

/**
 * The pull with each assignee filled in where nobody performed a "single"
 * duty: the instance names them, and its player-less errors become theirs.
 * A Minor takes their name; a Raid error stays the cutoff marker and gains
 * a Major on the assignee 1ms before it (README attribution point 4).
 */
export function applyDutyAssignments(pull: Pull, assignments: DutyAssignment[]): Pull {
  const single = new Map(assignments.filter((a) => a.kind === "single").map((a) => [a.mechanicKey, a]));
  if (single.size === 0 || !pull.mechanicOccurrences) return pull;
  const roster = new Set(pull.players.map((p) => p.name));

  const filled: MechanicOccurrence[] = [];
  const occurrences = pull.mechanicOccurrences.map((o) => {
    const duty = single.get(o.mechanicKey);
    const assignee = duty?.assignees[0].player;
    if (!duty || !assignee || !o.players || o.players.length > 0 || !roster.has(assignee)) return o;
    const next = { ...o, players: [assignee] };
    filled.push(next);
    return next;
  });
  if (filled.length === 0) return pull;

  const extra: PullError[] = [];
  const errors = pull.errors.map((e) => {
    if (e.player) return e;
    const key = getRuleMeta(e.ruleId, e.name).mechanicKey;
    const n = occurrenceForError(occurrences, key, e.timestamp);
    const inst = filled.find((o) => o.mechanicKey === key && o.occurrence === n);
    if (!inst) return e;
    const duty = single.get(key)!;
    const who = inst.players![0];
    const note = duty.source === "override"
      ? `${who} is the ${duty.label.toLowerCase()} set in the Strategy dialog; nobody did it this time.`
      : `${who} is this report's ${duty.label.toLowerCase()} (did it ${duty.assignees[0].performed} of the ${duty.performed} times someone did); nobody did it this time.`;
    if (e.severity === "Raid") {
      extra.push({ ...e, player: who, severity: "Major", timestamp: e.timestamp - 1, description: `${note} ${e.description}` });
      return e;
    }
    return { ...e, player: who, description: `${note} ${e.description}` };
  });
  return { ...pull, mechanicOccurrences: occurrences, errors: [...errors, ...extra].sort((a, b) => a.timestamp - b.timestamp) };
}

export type DutyFailure = { pullNumber: number; timestamp: number; name: string };

/** One player's record at a duty over the report: chances and the failed ones. */
export type DutyRecord = { player: string; chances: number; failures: DutyFailure[] };

/**
 * Each assignee's record at a duty, over pulls with the assignments
 * already applied (displayPulls): the instances naming them, and those
 * where they have a Major or Minor before the pull's raid cutoff, the same
 * errors the statics count.
 */
export function dutyRecords(pulls: Pull[], duty: DutyAssignment): DutyRecord[] {
  return duty.assignees.map(({ player }) => {
    let chances = 0;
    const failures: DutyFailure[] = [];
    for (const pull of pulls) {
      const mine = (pull.mechanicOccurrences ?? []).filter((o) => o.mechanicKey === duty.mechanicKey && o.players?.includes(player));
      if (mine.length === 0) continue;
      chances += mine.length;
      const cutoff = getPullRaidCutoff(pull);
      const failed = new Set<number>();
      for (const e of pull.errors) {
        if (e.player !== player || (e.severity !== "Major" && e.severity !== "Minor")) continue;
        if (cutoff !== null && e.timestamp > cutoff) continue;
        if (getRuleMeta(e.ruleId, e.name).mechanicKey !== duty.mechanicKey) continue;
        const n = occurrenceForError(pull.mechanicOccurrences, duty.mechanicKey, e.timestamp, player);
        if (n === null || failed.has(n)) continue;
        failed.add(n);
        failures.push({ pullNumber: pull.pullNumber, timestamp: e.timestamp, name: e.name });
      }
    }
    return { player, chances, failures };
  });
}
