// lib/mitigation/findings.ts
//
// The Mitigation dialog's Analysis view as findings (user, 2026-10-14,
// modelled on the Damage dialog): findings in categories beside a fight
// timeline. Pure: (window pulls, the optimizer's OptimizedPlan or null) ->
// AnalysisFindings. Without a plan it is facts read from the log only and
// cheap, so the view opens fast; the optimizer runs when the user clicks
// Analyze (user, 2026-10-14), and only then come the plan, its "Try"
// changes and the "Idea" suggestions. Thresholds are the builder's, not yet
// confirmed (listed under "Not yet confirmed" below).
//
// ── Categories ─────────────────────────────────────────────────────────
//   under   Planned hits (the plan's anchors: plan.ts classifyHit "plan",
//           not tank-only) that fail (median fail/under) or are tight, as
//           the plan counts them: good on the median, worst pull under
//           MARGIN_UNDER. Analyzed: the fix is the plan group that lifts it;
//           else the best free add (notes.ts aggregateAddOptions) as an
//           idea.
//   plan    Analyzed: the plan's "do together" groups, lettered A, B, ...
//   unused  Party cooldowns (partyEligible, or situational ones, shown but
//           never suggested) cast under UNUSED_MAX_SHARE of the casts the
//           window's pulls allowed (one at pull start, then one per
//           cooldown) and ready at UNUSED_MIN_READY_SHARE+ of the planned
//           raidwides. Gated entries are left out (their availability is
//           a guess). `readyAt` names the under hits where it sat ready.
//           Analyzed: the idea is the neediest under hit where it was free
//           in every pull that reached it, unless the plan already uses it.
//   timing  late: a party cooldown cast within LATE_MAX_MS after a hit it
//           wasn't on, in at least half the pulls that had the hit (one
//           pull is enough, user, 2026-10-14), and not on a later raidwide
//           that pull (then it was for that one). Only hits that aren't
//           over on the median.
//           stacked: an over hit with STACK_MIN_COOLDOWNS+ party cooldowns
//           on it in at least half its pulls and a median of
//           STACK_MIN_MARGIN+. Highest first.
//   other   Healing and mechanic hits that fail (plan.ts classifyHit), any
//           pull count; tank busters are counted and left to the Tanking
//           view.
//
// ── Timeline ───────────────────────────────────────────────────────────
// Hits at their median time over the window, the non-tank ones with their
// median and worst lowest HP. Cooldown lanes are the clock pull's (the
// window's longest, tanking-plan.ts clockPull) casts of every party
// cooldown but gated ones (Tempera Grassa shares Tempera Coat's cooldown)
// the plan doesn't touch,
// the stretches from the first raidwide on that it sat ready, split
// (user, 2026-10-14) into free (READY_GAP_MIN_MS+; a cast there delays
// nothing) and held (the cooldown's length before each later cast: the
// player was holding it for that one, so a cast there pushes it back), a
// dot on each under hit it sat ready for, and marks
// for late casts and, analyzed, the plan's changes and ideas. A clock-pull
// cast a plan move would make unavailable (by more than SNAPSHOT_SLACK_MS:
// a recast a second later is the same cast) is marked lost. `inFindings`
// lanes are the ones a finding names; the view shows those first.
//
// Not yet confirmed by the user (from docs/open-items.md 2026-10-15): the
// thresholds above (UNUSED_MAX_SHARE ½, UNUSED_MIN_READY_SHARE ⅓,
// LATE_MAX_MS 8s, STACK_MIN_COOLDOWNS 4, STACK_MIN_MARGIN 45%,
// READY_GAP_MIN_MS 20s); "Cooldown plan" being its own group and also each
// fixed hit's Try line; ideas outside the plan shown, marked as ideas.
// Performance: Dancing Mad (one 18-minute pull window) took ~10s to plan in
// the worker; watch for that on long single pulls.

import type { Pull } from "@/types/Pull";
import type { CatalogEntry, MitigationGame, MitigationHit } from "./types";
import { aggregateMitigation, type AggregatedHit } from "./aggregate";
import { MARGIN_OVER, MARGIN_UNDER, chargesAt, playerCasts, SNAPSHOT_SLACK_MS } from "./analyze";
import type { DebuffReach } from "./debuff-reach";
import { aggregateAddOptions } from "./notes";
import {
  PLAN_MIN_PULLS, classifyHit, partyEligible,
  type HitClass, type HitRef, type HitSide, type OptimizedChange, type OptimizedPlan, type PlanGroup,
} from "./plan";
import { clockPull } from "./tanking-plan";

export const UNUSED_MAX_SHARE = 0.5;
export const UNUSED_MIN_READY_SHARE = 1 / 3;
export const LATE_MAX_MS = 8_000;
export const STACK_MIN_COOLDOWNS = 4;
export const STACK_MIN_MARGIN = 0.45;
export const READY_GAP_MIN_MS = 20_000;
export const HELD_MIN_MS = 3_000;

export type FindingCategory = "under" | "plan" | "unused" | "timing" | "other";
// A timeline pin over a hit: which finding is about it.
export type PinKind = "fail" | "tight" | "late" | "stacked" | "other";

export type FindingsWindowPull = { pull: Pull; pullId: number; pullNumber: number; durationMs?: number; hits: MitigationHit[] };

export type PlanLetter = { letter: string; group: PlanGroup };

export type UnderFinding = {
  hit:       HitRef;
  failing:   boolean;           // else tight
  median:    number;
  worst:     number;
  worstPull: number;            // pull number
  deathPulls: number;
  pulls:     number;            // window pulls that had it
  reached:   number;
  column?:   "physical" | "magical" | "none";
  steady:    CooldownRef[];     // party cooldowns on it every pull
  fix?:      { letter: string; changes: OptimizedChange[]; after: HitSide };
  idea?:     { player: string; job: string; key: string; name: string; freePulls: number; est?: number };
};

export type UnusedFinding = {
  player:    string;
  job:       string;
  key:       string;
  name:      string;
  cooldownMs: number;
  casts:     number;
  possible:  number;
  pulls:     number;
  noCastPulls: number[];        // window pulls with no cast
  readyHits: number;
  totalHits: number;
  readyAt:   HitRef[];          // under hits it sat ready for, in every pull that had them
  situational?: string;
  inPlan?:   string;            // the plan letter that already uses it
  idea?:     { hit: HitRef; freePulls: number; pulls: number };
};

export type LateCast = { pullNumber: number; castMs: number; hitMs: number; readyMs: number; prevCastMs?: number };

export type LateFinding = {
  kind:      "late";
  hit:       HitRef;
  player:    string;
  job:       string;
  key:       string;
  name:      string;
  casts:     LateCast[];
  pulls:     number;             // pulls that had the hit
  readyInTime: number;           // of those casts, how many had it ready before the hit
};

export type StackedFinding = {
  kind:      "stacked";
  hit:       HitRef;
  median:    number;
  worst:     number;
  pulls:     number;
  cooldowns: CooldownRef[];
  alternatives: string[];        // droppable on its own
  planMove?: { letter: string; change: OptimizedChange; after: HitSide };
};

export type OtherFinding = { hit: HitRef; cls: Exclude<HitClass, "plan">; deaths: number; median: number; pulls: number };

export type TimelineHit = {
  id:      string;
  name:    string;
  medianMs: number;
  tank:    boolean;
  median:  number;
  worst:   number;
  pulls:   number;
  tone:    "fail" | "tight" | "good" | "over" | "other";
  deaths:  number;
  pins:    PinKind[];
};

export type LaneMark =
  | { kind: "move"; fromMs: number; toMs: number; letter: string }
  | { kind: "add"; atMs: number; letter: string }
  | { kind: "idea"; atMs: number; label: string };

export type Lane = {
  player:  string;
  job:     string;
  key:     string;
  name:    string;
  casts:   { atMs: number; durationMs: number; late?: string; lost?: string }[];
  // Off cooldown and unused: free (a cast there delays nothing) or held,
  // the cooldown's length before a later cast (a cast there would push
  // that one back).
  free:    [number, number][];
  held:    [number, number][];
  readyDots: { atMs: number; hit: string }[];  // ready, unused, at an under hit (clock pull)
  marks:   LaneMark[];
  inFindings: boolean;
};

export type AnalysisFindings = {
  analyzed:   boolean;           // built with a plan
  windowPulls: number[];         // pull numbers
  clock?:     { pullNumber: number; durationMs: number };
  reachSteps: { untilMs: number; pulls: number }[];  // pulls still going, by time
  hits:       TimelineHit[];
  lanes:      Lane[];
  letters:    PlanLetter[];
  under:      UnderFinding[];
  unused:     UnusedFinding[];
  timing:     (LateFinding | StackedFinding)[];
  other:      OtherFinding[];
  tankBusters: number;
};

// A cooldown on a hit, by its usual caster.
export type CooldownRef = { key: string; name: string; player: string; job: string };
function cooldownOf(a: AggregatedHit["active"][number], jobOf: Map<string, string>): CooldownRef {
  const player = Object.entries(a.casters).sort((x, y) => y[1] - x[1])[0]?.[0] ?? "";
  return { key: a.key, name: a.name, player, job: jobOf.get(player) ?? "" };
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const refOf = (r: AggregatedHit): HitRef => ({ id: r.id, name: r.abilityName, occurrence: r.occurrence, phase: r.phase, medianMs: r.medianMs });
const isTankRow = (r: AggregatedHit) => r.byPull.every((b) => b.hit.tankOnly);
const failingRow = (r: AggregatedHit) => r.verdict === "fail" || r.verdict === "under";
// As the optimizer counts it (optimize.ts HitEstimate.tight), so the counts agree.
const tightRow = (r: AggregatedHit) => r.verdict === "good" && r.worstMargin < MARGIN_UNDER;
const readyState = (s: string) => s === "free" || s === "available";
/** A party cooldown the view tracks: one the plan may move, or a situational one shown for reference. */
const tracked = (e: CatalogEntry) => partyEligible(e) || (e.reach === "party" && !!e.situational && e.inSheet !== false
  && e.kind !== "invuln" && e.kind !== "limitBreak");

export function buildAnalysisFindings(window: FindingsWindowPull[], plan: OptimizedPlan | null, game: MitigationGame,
  reach?: DebuffReach): AnalysisFindings {
  const rows = aggregateMitigation(window.map(({ pull, ...w }) => ({ ...w, durationMs: w.durationMs ?? pull.fightDuration })), game, reach)
    .filter((r) => !r.rare)
    .sort((a, b) => a.medianMs - b.medianMs);
  const entryOf = new Map(game.catalog.map((e) => [e.key, e]));
  const jobOf = new Map(window.flatMap((w) => w.pull.players.map((p) => [p.name, p.className] as const)));
  const anchors = rows.filter((r) => r.pulls >= PLAN_MIN_PULLS && !isTankRow(r));
  const planned = anchors.filter((r) => classifyHit(r) === "plan");
  const letters: PlanLetter[] = (plan?.groups ?? []).map((group, i) => ({ letter: LETTERS[i] ?? String(i + 1), group }));

  // ── under ──
  const under: UnderFinding[] = planned
    .filter((r) => failingRow(r) || tightRow(r))
    .map((r) => {
      const worst = r.byPull.reduce((a, b) => (b.hit.margin < a.hit.margin ? b : a));
      const steady = r.active
        .filter((a) => a.pulls === r.pulls && entryOf.get(a.key) && partyEligible(entryOf.get(a.key)!))
        .map((a) => cooldownOf(a, jobOf));
      const out: UnderFinding = {
        hit: refOf(r), failing: failingRow(r), median: r.medianMargin, worst: r.worstMargin, worstPull: worst.pullNumber,
        deathPulls: r.deathPulls, pulls: r.pulls, reached: r.reached, column: r.damageColumn, steady,
      };
      if (!plan) return out;
      const fixGroup = letters.find((l) => l.group.purpose === "fix" && l.group.hits.some((h) => h.hit.id === r.id
        && (h.after.median > h.before.median + 1e-9 || h.after.worst > h.before.worst + 1e-9)));
      if (fixGroup) {
        const outcome = fixGroup.group.hits.find((h) => h.hit.id === r.id)!;
        const touching = fixGroup.group.changes.filter((c) => c.to.id === r.id || c.from?.id === r.id);
        out.fix = { letter: fixGroup.letter, changes: touching.length ? touching : fixGroup.group.changes, after: outcome.after };
      } else {
        const opt = aggregateAddOptions(r, game, reach).find((o) => entryOf.get(o.key) && partyEligible(entryOf.get(o.key)!));
        if (opt) out.idea = { player: opt.player, job: jobOf.get(opt.player) ?? "", key: opt.key, name: opt.name, freePulls: opt.pulls ?? 0, est: opt.est };
      }
      return out;
    })
    .sort((a, b) => Number(b.failing) - Number(a.failing) || a.median - b.median);

  // ── unused ──
  const inPlan = new Map<string, string>();
  for (const l of letters) for (const c of l.group.changes) inPlan.set(`${c.player}|${c.key}`, l.letter);
  const underRows = under.map((u) => planned.find((r) => r.id === u.hit.id)!);
  const unused: UnusedFinding[] = [];
  for (const player of window[window.length - 1]?.pull.players ?? []) {
    for (const entry of game.catalog) {
      // Gated entries' availability is a guess (Tempera Grassa shares Tempera Coat's cooldown).
      if (!entry.jobs.includes(player.className) || !tracked(entry) || entry.cooldownMs <= 0 || entry.gated) continue;
      let casts = 0, possible = 0;
      const noCastPulls: number[] = [];
      for (const w of window) {
        const p = w.pull.players.find((x) => x.name === player.name);
        const n = p ? playerCasts(p, entry).length : 0;
        casts += n;
        if (n === 0) noCastPulls.push(w.pullNumber);
        possible += Math.floor((w.durationMs ?? w.pull.fightDuration) / entry.cooldownMs) + (entry.charges ?? 1);
      }
      let readyHits = 0, totalHits = 0;
      for (const r of planned) {
        for (const { hit } of r.byPull) {
          const m = hit.players.find((x) => x.player === player.name && x.key === entry.key);
          if (!m || m.dead) continue;
          totalHits++;
          if (readyState(m.state)) readyHits++;
        }
      }
      if (possible === 0 || casts >= possible * UNUSED_MAX_SHARE || totalHits === 0 || readyHits < totalHits * UNUSED_MIN_READY_SHARE) continue;
      const readyAt = underRows
        .filter((r) => r.byPull.every(({ hit }) => hit.players.some((m) => m.player === player.name && m.key === entry.key
          && !m.dead && readyState(m.state))))
        .map(refOf);
      const f: UnusedFinding = {
        player: player.name, job: player.className, key: entry.key, name: entry.name, cooldownMs: entry.cooldownMs,
        casts, possible, pulls: window.length, noCastPulls, readyHits, totalHits, readyAt,
        situational: entry.situational, inPlan: inPlan.get(`${player.name}|${entry.key}`),
      };
      if (plan && !f.situational && !f.inPlan) {
        for (const row of underRows) {
          const opt = aggregateAddOptions(row, game, reach).find((o) => o.player === player.name && o.key === entry.key);
          if (opt && (opt.pulls ?? 0) === row.pulls) { f.idea = { hit: refOf(row), freePulls: opt.pulls ?? 0, pulls: row.pulls }; break; }
        }
      }
      unused.push(f);
    }
  }
  unused.sort((a, b) => Number(!!a.situational) - Number(!!b.situational) || a.casts / a.possible - b.casts / b.possible);

  // ── timing: late ──
  const timing: (LateFinding | StackedFinding)[] = [];
  for (const r of rows) {
    if (isTankRow(r) || r.verdict === "over" || classifyHit(r) !== "plan") continue;
    const byKey = new Map<string, LateCast[]>();
    for (const { pullNumber, hit } of r.byPull) {
      const w = window.find((x) => x.pullNumber === pullNumber)!;
      const later = w.hits.filter((h) => h.timestampMs > hit.timestampMs && !h.tankOnly);
      for (const p of w.pull.players) {
        for (const entry of game.catalog) {
          if (!entry.jobs.includes(p.className) || !partyEligible(entry)) continue;
          if (hit.active.some((a) => a.key === entry.key && a.casters.includes(p.name))) continue;
          const casts = playerCasts(p, entry);
          const late = casts.find((c) => c > hit.timestampMs && c - hit.timestampMs <= LATE_MAX_MS);
          if (late === undefined) continue;
          // On a later raidwide that pull: it was cast for that one.
          if (later.some((h) => h.timestampMs - late <= entry.durationMs + SNAPSHOT_SLACK_MS
            && h.active.some((a) => a.key === entry.key && a.casters.includes(p.name)))) continue;
          const before = casts.filter((c) => c < late);
          const state = chargesAt(before, entry, hit.timestampMs);
          const readyMs = state.charges > 0
            ? Math.max(0, ...before.map((c) => c + entry.cooldownMs).filter((t) => t <= hit.timestampMs))
            : state.nextReadyMs;
          const k = `${p.name}|${entry.key}`;
          byKey.set(k, [...(byKey.get(k) ?? []), { pullNumber, castMs: late, hitMs: hit.timestampMs, readyMs, prevCastMs: before[before.length - 1] }]);
        }
      }
    }
    for (const [k, casts] of byKey) {
      if (casts.length * 2 < r.pulls) continue;
      const [player, key] = k.split("|");
      timing.push({
        kind: "late", hit: refOf(r), player, job: jobOf.get(player) ?? "", key, name: entryOf.get(key)!.name,
        casts, pulls: r.pulls, readyInTime: casts.filter((c) => c.readyMs <= c.hitMs).length,
      });
    }
  }

  // ── timing: stacked ──
  const moveOff = new Map<string, { letter: string; change: OptimizedChange; after: HitSide }>();
  for (const l of letters) {
    for (const c of l.group.changes) {
      if (c.kind !== "move" || !c.from) continue;
      const after = l.group.hits.find((h) => h.hit.id === c.from!.id)?.after;
      if (after) moveOff.set(c.from.id, { letter: l.letter, change: c, after });
    }
  }
  for (const r of planned) {
    if (r.verdict !== "over" || r.medianMargin < STACK_MIN_MARGIN) continue;
    const cds = r.active
      .filter((a) => a.pulls * 2 >= r.pulls && entryOf.get(a.key) && partyEligible(entryOf.get(a.key)!))
      .map((a) => cooldownOf(a, jobOf));
    if (cds.length < STACK_MIN_COOLDOWNS) continue;
    timing.push({
      kind: "stacked", hit: refOf(r), median: r.medianMargin, worst: r.worstMargin, pulls: r.pulls, cooldowns: cds,
      alternatives: r.droppable.alternatives, planMove: moveOff.get(r.id),
    });
  }
  timing.sort((a, b) => Number(a.kind === "stacked") - Number(b.kind === "stacked")
    || (a.kind === "stacked" && b.kind === "stacked" ? b.median - a.median : a.hit.medianMs - b.hit.medianMs));

  // ── other ──
  const other: OtherFinding[] = rows
    .filter((r) => !isTankRow(r) && failingRow(r) && classifyHit(r) !== "plan")
    .map((r) => ({ hit: refOf(r), cls: classifyHit(r) as Exclude<HitClass, "plan">, deaths: r.deaths, median: r.medianMargin, pulls: r.pulls }));
  const tankBusters = rows.filter(isTankRow).length;

  // ── timeline ──
  const pinsOf = new Map<string, Set<PinKind>>();
  const pin = (id: string, c: PinKind) => pinsOf.set(id, (pinsOf.get(id) ?? new Set()).add(c));
  for (const u of under) pin(u.hit.id, u.failing ? "fail" : "tight");
  for (const t of timing) pin(t.hit.id, t.kind);
  for (const o of other) pin(o.hit.id, "other");
  const underIds = new Map(under.map((u) => [u.hit.id, u]));
  const otherIds = new Set(other.map((o) => o.hit.id));
  const hits: TimelineHit[] = rows.map((r) => ({
    id: r.id, name: r.abilityName, medianMs: r.medianMs, tank: isTankRow(r), median: r.medianMargin, worst: r.worstMargin,
    pulls: r.pulls, deaths: r.deaths, pins: [...(pinsOf.get(r.id) ?? [])],
    tone: otherIds.has(r.id) ? "other" : underIds.get(r.id)?.failing ? "fail" : underIds.has(r.id) ? "tight"
      : failingRow(r) ? "fail" : r.medianMargin >= MARGIN_OVER ? "over" : "good",
  }));

  const durations = window.map((w) => w.durationMs ?? w.pull.fightDuration).sort((a, b) => a - b);
  const reachSteps = durations.map((d, i) => ({ untilMs: d, pulls: durations.length - i }))
    .filter((s, i, all) => i === all.length - 1 || s.untilMs !== all[i + 1].untilMs);

  const clock = clockPull(window.map((w) => ({ ...w, durationMs: w.durationMs ?? w.pull.fightDuration })));
  const lanes: Lane[] = [];
  if (clock) {
    const lateByKey = new Map<string, LateFinding>();
    for (const t of timing) if (t.kind === "late") lateByKey.set(`${t.player}|${t.key}`, t);
    const unusedKeys = new Set(unused.filter((u) => !u.situational).map((u) => `${u.player}|${u.key}`));
    const firstRaidwide = clock.hits.find((h) => !h.tankOnly)?.timestampMs ?? 0;
    const clockUnder = clock.hits.filter((h) => underIds.has(h.id));
    for (const player of clock.pull.players) {
      for (const entry of game.catalog) {
        const k = `${player.name}|${entry.key}`;
        // Gated ones only when the plan moves or adds them (Tempera Grassa).
        if (!entry.jobs.includes(player.className) || !tracked(entry) || (entry.gated && !inPlan.has(k))) continue;
        const castTimes = playerCasts(player, entry);
        const lateFinding = lateByKey.get(k);
        const late = lateFinding?.casts.find((c) => c.pullNumber === clock.pullNumber);
        const casts: Lane["casts"] = castTimes.map((t) => ({
          atMs: t, durationMs: entry.durationMs,
          late: late && late.castMs === t ? `${Math.max(1, Math.round((t - late.hitMs) / 1000))}s after ${lateFinding!.hit.name}` : undefined,
        }));
        const marks: LaneMark[] = [];
        for (const l of letters) {
          for (const c of l.group.changes) {
            if (c.player !== player.name || c.key !== entry.key) continue;
            if (c.kind === "move" && c.from) {
              marks.push({ kind: "move", fromMs: c.from.medianMs, toMs: c.to.medianMs, letter: l.letter });
              // A clock-pull cast the move makes unavailable: the one after the moved cast, while it would still be down.
              const moved = [...castTimes].reverse().find((t) => t <= c.from!.medianMs + SNAPSHOT_SLACK_MS);
              for (const cast of casts) {
                if (moved !== undefined && cast.atMs > moved && cast.atMs > c.to.medianMs - entry.cooldownMs
                  && cast.atMs + SNAPSHOT_SLACK_MS < c.to.medianMs + entry.cooldownMs) {
                  cast.lost = `Lost if ${entry.name} moves to ${c.to.name} (plan ${l.letter})`;
                }
              }
            } else marks.push({ kind: "add", atMs: c.to.medianMs, letter: l.letter });
          }
        }
        const u = unused.find((x) => x.player === player.name && x.key === entry.key);
        if (u?.idea) marks.push({ kind: "idea", atMs: u.idea.hit.medianMs, label: u.idea.hit.name });
        for (const und of under) {
          if (und.idea?.player === player.name && und.idea.key === entry.key) {
            marks.push({ kind: "idea", atMs: und.hit.medianMs, label: und.hit.name });
          }
        }
        const readyDots = clockUnder
          .filter((h) => h.players.some((m) => m.player === player.name && m.key === entry.key && !m.dead && readyState(m.state)))
          .map((h) => ({ atMs: underIds.get(h.id)!.hit.medianMs, hit: h.abilityName }));
        const free: [number, number][] = [];
        const held: [number, number][] = [];
        if (entry.cooldownMs > 0) {
          for (const [a0, b] of readyIntervals(castTimes, entry, clock.durationMs)) {
            const a = Math.max(a0, firstRaidwide);
            if (b <= a) continue;
            // Ending at a cast: the cooldown's length before it was held for it (user, 2026-10-14).
            const holdFrom = b < clock.durationMs ? Math.max(a, b - entry.cooldownMs) : b;
            if (holdFrom - a >= READY_GAP_MIN_MS) free.push([a, holdFrom]);
            if (b - holdFrom >= HELD_MIN_MS) held.push([holdFrom, b]);
          }
        }
        const inFindings = marks.length > 0 || casts.some((c) => c.late || c.lost) || unusedKeys.has(k);
        lanes.push({ player: player.name, job: player.className, key: entry.key, name: entry.name, casts, free, held, readyDots, marks, inFindings });
      }
    }
  }

  return {
    analyzed: plan !== null,
    windowPulls: window.map((w) => w.pullNumber),
    clock: clock ? { pullNumber: clock.pullNumber, durationMs: clock.durationMs } : undefined,
    reachSteps, hits, lanes, letters, under, unused, timing, other, tankBusters,
  };
}

/** When the entry had a charge ready, from pull start to `endMs`, given its (accepted) casts. */
export function readyIntervals(casts: number[], entry: CatalogEntry, endMs: number): [number, number][] {
  const max = entry.charges ?? 1;
  const out: [number, number][] = [];
  let charges = max, next = Infinity, open: number | null = 0, i = 0;
  for (;;) {
    const cast = i < casts.length ? casts[i] : Infinity;
    const t = Math.min(cast, next);
    if (t >= endMs) break;
    if (next <= cast) {
      charges++;
      if (open === null) open = next;
      next = charges < max ? next + entry.cooldownMs : Infinity;
    } else {
      charges--;
      if (next === Infinity) next = cast + entry.cooldownMs;
      if (charges === 0 && open !== null) { out.push([open, cast]); open = null; }
      i++;
    }
  }
  if (open !== null) out.push([open, endMs]);
  return out;
}
