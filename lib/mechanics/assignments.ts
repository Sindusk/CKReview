// lib/mechanics/assignments.ts
//
// Assigned duties (docs/archive/exposure-plan.md): a job the raid lead gives to a
// player or a group, such as The Lost Explorers' fish carrier or Sszorak's
// Mutilate soak groups. The boss module reports every instance of an
// assigned mechanic with the player(s) who performed it
// (lib/mechanics/occurrences.ts); this file works out, across all of a
// report's pulls, who the job was given to, and fills that in where it
// wasn't done, so the failure lands on the assignee(s).
//
// Generic over every mechanic whose rule-meta exposure is "assigned"; no
// boss-specific code here.
//
// Detection (thresholds chosen by the builder, not yet confirmed — listed
// in docs/open-items.md):
// - "group": a soak-style duty, done by GROUP_MIN_PERFORMERS or more
//   players at a time on average (user, 2026-10-11: build group
//   detection). Groups are the players who perform it together: seeded
//   from the most frequent performer, a group takes everyone whose
//   instances overlap the seed's by GROUP_JACCARD or more, among players
//   who performed at least GROUP_MIN_SHARE of the instances. Each instance
//   belongs to the group most of its performers are in; that group's
//   members are responsible, and members who didn't take part (alive)
//   take its player-less failure (README attribution point 3: flag all
//   candidates). Alternating groups (one per tank, alternating sets) come
//   out as separate groups.
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
// "nobody assigned", per duty (group duties: nobody assigned only). Saved
// in the report's session (SavedSession.dutyOverrides), so it applies to
// this report only, on every import and resync (user, 2026-10-11).
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
const GROUP_MIN_PERFORMERS = 2.5;
const GROUP_MIN_SHARE = 0.25;
const GROUP_JACCARD = 0.4;

export type DutyAssignee = { player: string; performed: number };

/** One soak group of a group duty: its members and the instances it took. */
export type DutyGroup = { members: string[]; instances: number };

export type DutyAssignment = {
  mechanicKey: string;
  label:       string;
  /** The boss the duty belongs to (its pulls' name). */
  boss:        string;
  kind:        "single" | "shared" | "group" | "none";
  /** "override" when the user picked it in the Strategy dialog. */
  source:      "detected" | "override";
  /** The assignee(s), most performed first; every group member for "group"; empty for "none". */
  assignees:   DutyAssignee[];
  /** Group duties: the groups, most instances first. */
  groups?:     DutyGroup[];
  /** Everyone who performed it at least once, most first. */
  performers:  DutyAssignee[];
  /** Instances someone performed / all instances, across the report. */
  performed:   number;
  instances:   number;
  pulls:       number;
};

/** Per duty: a player name, or null for "nobody assigned". Absent = auto. */
export type DutyOverrides = Record<string, string | null>;

/** Players who perform together: greedy co-occurrence clustering (see header). */
function detectGroups(sets: string[][], performed: number, counts: Map<string, number>): DutyGroup[] {
  const instancesOf = new Map<string, Set<number>>();
  sets.forEach((s, i) => { for (const p of s) instancesOf.set(p, (instancesOf.get(p) ?? new Set()).add(i)); });
  const jaccard = (a: Set<number>, b: Set<number>) => {
    let both = 0;
    for (const x of a) if (b.has(x)) both += 1;
    return both / (a.size + b.size - both);
  };
  const candidates = [...counts].filter(([, n]) => n >= Math.max(2, GROUP_MIN_SHARE * performed))
    .sort((a, b) => b[1] - a[1]).map(([p]) => p);
  const grouped = new Set<string>();
  const groups: DutyGroup[] = [];
  for (const seed of candidates) {
    if (grouped.has(seed)) continue;
    const members = candidates.filter((p) => !grouped.has(p) && jaccard(instancesOf.get(seed)!, instancesOf.get(p)!) >= GROUP_JACCARD);
    if (members.length < 2) continue;
    for (const m of members) grouped.add(m);
    groups.push({ members, instances: 0 });
  }
  for (const s of sets) {
    const g = groupOf(groups, s);
    if (g) g.instances += 1;
  }
  return groups.sort((a, b) => b.instances - a.instances);
}

/** The group most of an instance's performers belong to (at least two of them). */
function groupOf(groups: DutyGroup[], performers: string[]): DutyGroup | undefined {
  let best: DutyGroup | undefined;
  let bestN = 1;
  for (const g of groups) {
    const n = performers.filter((p) => g.members.includes(p)).length;
    if (n > bestN) { best = g; bestN = n; }
  }
  return best;
}

/** Every assigned mechanic in the report with its detected assignee(s). */
export function detectDutyAssignments(pulls: Pull[]): DutyAssignment[] {
  type Acc = { instances: number; performed: number; pulls: Set<number>; bosses: Map<string, number>; counts: Map<string, number>; sets: string[][] };
  const byKey = new Map<string, Acc>();
  for (const pull of pulls) {
    for (const o of pull.mechanicOccurrences ?? []) {
      if (!o.players || mechanicExposure(o.mechanicKey) !== "assigned") continue;
      const entry = byKey.get(o.mechanicKey)
        ?? { instances: 0, performed: 0, pulls: new Set<number>(), bosses: new Map<string, number>(), counts: new Map<string, number>(), sets: [] };
      entry.instances += 1;
      entry.pulls.add(pull.id);
      entry.bosses.set(pull.name, (entry.bosses.get(pull.name) ?? 0) + 1);
      if (o.players.length > 0) {
        entry.performed += 1;
        entry.sets.push(o.players);
      }
      for (const name of o.players) entry.counts.set(name, (entry.counts.get(name) ?? 0) + 1);
      byKey.set(o.mechanicKey, entry);
    }
  }

  const out: DutyAssignment[] = [];
  for (const [mechanicKey, e] of byKey) {
    const performers = [...e.counts].map(([player, performed]) => ({ player, performed })).sort((a, b) => b.performed - a.performed);
    const share = (n: number) => n / e.performed;
    const avgPerformers = e.sets.length ? e.sets.reduce((s, x) => s + x.length, 0) / e.sets.length : 0;
    let kind: DutyAssignment["kind"] = "none";
    let assignees: DutyAssignee[] = [];
    let groups: DutyGroup[] | undefined;
    if (e.performed >= MIN_PERFORMED && avgPerformers >= GROUP_MIN_PERFORMERS) {
      groups = detectGroups(e.sets, e.performed, e.counts);
      if (groups.length) {
        kind = "group";
        const members = new Set(groups.flatMap((g) => g.members));
        assignees = performers.filter((p) => members.has(p.player));
      }
    } else if (e.performed >= MIN_PERFORMED && share(performers[0].performed) >= SINGLE_SHARE) {
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
      ...(groups && kind === "group" ? { groups } : {}),
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
    if (player === null) return { ...d, kind: "none", source: "override", assignees: [], groups: undefined };
    const performed = d.performers.find((p) => p.player === player)?.performed ?? 0;
    return { ...d, kind: "single", source: "override", assignees: [{ player, performed }], groups: undefined };
  });
}

/** Alive at `t` by the pull's death events (a raise isn't tracked: a dead player stays out). */
function aliveAt(pull: Pull, name: string, t: number): boolean {
  return !pull.deathEvents.some((d) => d.player === name && d.timestamp < t);
}

/**
 * The pull with each duty's assignees filled in where the job wasn't done:
 * - "single": an instance nobody performed names the assignee, and its
 *   player-less errors become theirs.
 * - "group": every instance names its group's members (plus whoever
 *   performed), and its player-less errors go to the members who didn't
 *   take part and were alive.
 * A Minor takes the name (one copy per responsible player); a Raid error
 * stays the cutoff marker and gains a Major on each 1ms before it (README
 * attribution point 4).
 */
export function applyDutyAssignments(pull: Pull, assignments: DutyAssignment[]): Pull {
  const byKey = new Map(assignments.filter((a) => a.kind === "single" || a.kind === "group").map((a) => [a.mechanicKey, a]));
  if (byKey.size === 0 || !pull.mechanicOccurrences) return pull;
  const roster = new Set(pull.players.map((p) => p.name));

  // Instance -> the players its player-less failure goes to.
  const blame = new Map<MechanicOccurrence, string[]>();
  const occurrences = pull.mechanicOccurrences.map((o) => {
    const duty = byKey.get(o.mechanicKey);
    if (!duty || !o.players) return o;
    if (duty.kind === "single") {
      const assignee = duty.assignees[0].player;
      if (o.players.length > 0 || !roster.has(assignee)) return o;
      const next = { ...o, players: [assignee] };
      blame.set(next, [assignee]);
      return next;
    }
    const group = groupOf(duty.groups ?? [], o.players);
    if (!group) return o;
    const members = group.members.filter((m) => roster.has(m));
    const next = { ...o, players: [...new Set([...o.players, ...members])] };
    blame.set(next, members.filter((m) => !o.players!.includes(m)));
    return next;
  });
  if (blame.size === 0) return pull;

  const extra: PullError[] = [];
  const errors: PullError[] = [];
  for (const e of pull.errors) {
    if (e.player) { errors.push(e); continue; }
    const key = getRuleMeta(e.ruleId, e.name).mechanicKey;
    const n = occurrenceForError(occurrences, key, e.timestamp);
    const inst = [...blame.keys()].find((o) => o.mechanicKey === key && o.occurrence === n);
    const who = inst ? blame.get(inst)!.filter((m) => aliveAt(pull, m, e.timestamp)) : [];
    if (!inst || who.length === 0) { errors.push(e); continue; }
    const duty = byKey.get(key)!;
    const note = (p: string) => duty.source === "override"
      ? `${p} is the ${duty.label.toLowerCase()} set in the Strategy dialog; nobody did it this time.`
      : duty.kind === "group"
        ? `${p} is in the ${duty.label.toLowerCase()} for this one (with ${inst.players!.filter((x) => x !== p).join(", ")}) and didn't take part.`
        : `${p} is this report's ${duty.label.toLowerCase()} (did it ${duty.assignees[0].performed} of the ${duty.performed} times someone did); nobody did it this time.`;
    if (e.severity === "Raid") {
      errors.push(e);
      for (const p of who) extra.push({ ...e, player: p, severity: "Major", timestamp: e.timestamp - 1, description: `${note(p)} ${e.description}` });
      continue;
    }
    for (const p of who) errors.push({ ...e, player: p, description: `${note(p)} ${e.description}` });
  }
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
