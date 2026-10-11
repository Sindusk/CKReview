// lib/mitigation/optimize.ts
//
// The Analysis view's optimizer (docs/archive/mitigation-optimizer-plan.md):
// a small set of coordinated changes to a group's current cooldown plan,
// found by searching over the whole schedule. The engine is generic: the
// party Analysis (partyPlan, below) and the planned Tanking panel
// (docs/tanking-panel-plan.md) differ only in the OptimizerProblem they hand
// it: eligible entries, anchor hits, objective, hard constraint and extra
// edits.
//
// ── The plan is "cooldown on hit" ──────────────────────────────────────
// A plan is a list of assignments (player, catalog entry, anchor hit id),
// the hit id being the cross-pull key MitigationHit.id. In each window pull
// a player's real casts of an eligible entry are attached to the first hit
// each covered: cast at or before the hit's end, the hit within the entry's
// duration + SNAPSHOT_SLACK_MS, and the entry on the hit with this player
// among its casters. A cast that covered no hit attaches to nothing. The
// baseline (the current plan) is every (player, entry, hit) attached in at
// least half the window pulls that reached that hit.
//
// ── Evaluating a candidate plan ────────────────────────────────────────
// A candidate is the baseline plus changes, applied in order to every window
// pull with that pull's real hit times and damage:
//   - a move takes the player's cast assigned to `from` off and places one
//     at `to` (CAST_LEAD_MS before the hit); an add places a new one at
//     `to`. A cast the plan doesn't touch keeps its real time. A move in a
//     pull with no cast assigned to `from` isn't applied there.
//   - a placed cast covers every hit from its anchor up to its duration
//     after the cast, with no snapshot slack (conservative); a
//     variableDuration entry covers only its anchor hit.
//   - a removed cast stops covering the hits it covered in the log, unless
//     another cast of the same entry still covers them.
//   - legality: the player's resulting casts pass simulateCharges with
//     nothing rejected and the player is alive at the placed cast. Where a
//     change isn't legal it is left out of that pull (pessimistic). A
//     change counts only where it is legal in at least half the window
//     pulls that reached its anchor (`enough`).
// Per target, a change's effect is a delta, marginWith(changes) minus
// marginWith(none), both with DAMAGE_ROLL_BUFFER, added to the logged
// margin (user-accepted, 2026-10-11): a hit the plan doesn't touch keeps
// exactly its logged margin, so the baseline reproduces the aggregate and
// the Analysis agrees with the Timeline, and what a change adds or removes
// is measured on damage rolled 5% high. The sequence margin (margin minus
// laterDrop) moves by the same kind of delta. A hit's estimate in a pull is
// its lowest judged target (analyze.ts judged); a target that died counts
// as alive only if a change lifts it to 0+, and one that lived dies if a
// change takes it below 0. Across the window a hit's verdict uses the
// median estimate (fail when most pulls estimate a death); "tight" is good
// on the median with the worst pull under MARGIN_UNDER (aggregate.ts).
// Only hits within the old or new casts' coverage of an edited lane are
// re-scored (incremental evaluation from the parent candidate).
//
// ── Gated entries ──────────────────────────────────────────────────────
// Kerachole (Addersgall), Sacred Soil (Aetherflow) and the like may be
// moved and swapped (the same resource, spent at another time) and added
// (user, 2026-10-11): an added one is marked with its gate, so the player
// checks the gauge themselves.
//
// ── The search ─────────────────────────────────────────────────────────
// Edits on a candidate: shift (one assignment to another anchor), swap (two
// assignments trade anchors, offered as one edit so the search finds a
// trade in one step), add (a new assignment; never a shield without a size
// estimate), plus the problem's extraEdits. There is no separate drop: a
// cooldown dropped to be used elsewhere is a shift. Change count: a shift
// or an add is 1, a swap 2 (two players each move one cooldown); shifting
// an already moved or added cast edits that change instead of adding one.
// Shift and swap targets are anchors that are failing or tight, or that
// hold a movable cast; adds go only to failing or tight anchors (an add
// helps nothing else). Beam search from the baseline, BEAM_WIDTH wide, up
// to PLAN_MAX_CHANGES changes; candidates breaking a change's legality
// share or the hard constraint are dropped; the best plan at any depth wins
// by the objective (a tuple, compared first difference first).
//
// ── Groups ─────────────────────────────────────────────────────────────
// The winning changes are split into dependent groups, each shown as one
// "do together" card: a swap's two halves always go together; otherwise two
// changes are dependent when, with one taken out, the other becomes illegal
// or stops helping (the objective without both equals the objective
// without the first).

import type { Pull } from "@/types/Pull";
import type { PlayerInfo } from "@/types/PlayerInfo";
import type { CatalogEntry, HitTarget, HitVerdict, MitigationGame, MitigationHit } from "./types";
import type { AggregatedHit } from "./aggregate";
import {
  DAMAGE_ROLL_BUFFER, DROP_MIN_COOLDOWN_MS, MARGIN_UNDER, SEQUENCE_FLOOR, SNAPSHOT_SLACK_MS,
  chargesAt, isDeadOrFreshlyRevived, judged, marginWith, playerCasts, simulateCharges, verdictFor, type AddedMitigation,
} from "./analyze";
import { reachesPart, type DebuffReach } from "./debuff-reach";

// Tunables: chosen by the builder, not yet confirmed (docs/open-items.md),
// except the window and the change budget (user, 2026-10-11).
export const PLAN_WINDOW_DEFAULT = 5;
export const PLAN_MAX_CHANGES = 3;
export const PLAN_MIN_PULLS = 3;
// A placed cast's lead before its anchor hit's first damage.
export const CAST_LEAD_MS = 2_000;
export const BEAM_WIDTH = 50;
// Tier 3: a cooldown's weight is its length over this, so a 120s one counts
// twice a 60s one.
const FREEDOM_REFERENCE_MS = 120_000;
// A short hit whose median lowest player ends below this (overkill of half
// a health bar) is a mechanic failure, not something one more mitigation
// covers: Red Hot and Deep Blue's Plunging Snap #3 at -674%.
export const MECHANIC_MARGIN = -0.5;
const SAME_HIT_MS = 100;

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
export const enough = (n: number, of: number) => of > 0 && n * 2 >= of;

// ── Problem ────────────────────────────────────────────────────────────

export type WindowPull = { pull: Pull; hits: MitigationHit[] };

export type Assignment = { player: string; key: string; anchor: string };

// `pair` ties a swap's two moves together.
export type Change =
  | { kind: "move"; player: string; key: string; from: string; to: string; pair?: number }
  | { kind: "add";  player: string; key: string; to: string };

export type HitEstimate = {
  median: number; worst: number; worstSequence: number; verdict: HitVerdict; tight: boolean; pulls: number;
};

export type PlanEvaluation = {
  changes: Change[];
  hits:    Map<string, HitEstimate>;  // anchor hit id -> estimate
  legal:   { legal: number; pulls: number }[];  // per change
  freedom: number;                    // tier 3, relative to the baseline
  perPull: PullEval[];
};

/** What the engine needs from its caller (the party Analysis, later the Tanking panel). */
export type OptimizerProblem = {
  game:     MitigationGame;
  reach?:   DebuffReach;
  window:   WindowPull[];
  // The hits matched across the window (aggregateMitigation over the window
  // pulls) that casts may be moved from or to and the objective reads.
  anchors:  AggregatedHit[];
  eligible: (entry: CatalogEntry, player: PlayerInfo) => boolean;
  // Whether a new cast may be added (not just moved).
  canAdd:   (entry: CatalogEntry, player: PlayerInfo) => boolean;
  // Median per-target absorb of each shield entry (medianShieldSizes).
  shieldSizes: Map<string, number>;
  // Higher is better, compared first difference first.
  objective:  (ev: PlanEvaluation) => number[];
  // The hard constraint, against the baseline.
  constraint: (base: PlanEvaluation, ev: PlanEvaluation) => boolean;
  // Anchors worth fixing (adds go only here; shifts and swaps go here or
  // to anchors holding a movable cast).
  needsHelp:  (ev: PlanEvaluation, hitId: string) => boolean;
  // More edits beyond shift, swap and add (the Tanking panel's invulns).
  extraEdits?: (state: SearchState) => Change[][];
  maxChanges?: number;
  beamWidth?:  number;
};

/** Median per-target absorb of each shield entry over every hit given; none for a shield never seen absorbing. */
export function medianShieldSizes(hitLists: MitigationHit[][], game: MitigationGame): Map<string, number> {
  const amounts = new Map<string, number[]>();
  for (const hits of hitLists) for (const h of hits) for (const t of h.targets) {
    const perEntry = new Map<string, number>();
    for (const a of t.shieldAbsorbs) {
      const s = game.statusIndex.get(a.statusId);
      if (s) perEntry.set(s.entry.key, (perEntry.get(s.entry.key) ?? 0) + a.amount);
    }
    for (const [key, amount] of perEntry) if (amount > 0) amounts.set(key, [...(amounts.get(key) ?? []), amount]);
  }
  return new Map([...amounts].map(([key, xs]) => [key, median(xs)]));
}

// ── Per-pull cast lists ────────────────────────────────────────────────

type Cast = {
  t:       number;
  anchor?: string;   // the hit it is assigned to
  real:    boolean;  // as logged (false: placed by a change)
};

type Lane = { player: PlayerInfo; entry: CatalogEntry; casts: Cast[] };

export type PullCtx = {
  wp:      WindowPull;
  hits:    MitigationHit[];           // by time
  hitIx:   Map<string, MitigationHit>;
  lanes:   Map<string, Lane>;         // `${player}|${key}`
  // Hits each real cast covered in the log: `${player}|${key}|${t}` -> hit ids.
  covered: Map<string, Set<string>>;
  edge?:   MitigationHit;             // the progression edge, if reached
  cache:   Map<string, HitResult>;    // `${hitId}|${signature}`
};

type HitResult = { margin: number; sequence: number; died: boolean };

type PullEval = {
  lanes:   Map<string, Cast[]>;  // changed lanes only
  legal:   boolean[];
  results: Map<string, HitResult>;
};

const laneKey = (player: string, key: string) => `${player}|${key}`;

/** Whether the log shows this player's cast of `entry` at `t` on the hit. */
function castOnHit(hit: MitigationHit, entry: CatalogEntry, player: string, t: number): boolean {
  return t <= hit.endMs + SAME_HIT_MS && hit.timestampMs - t <= entry.durationMs + SNAPSHOT_SLACK_MS
    && hit.active.some((a) => a.key === entry.key && a.casters.includes(player));
}

function buildPullCtx(problem: OptimizerProblem, wp: WindowPull, edgeId: string | undefined): PullCtx {
  const hits = [...wp.hits].sort((a, b) => a.timestampMs - b.timestampMs);
  const ctx: PullCtx = {
    wp, hits, hitIx: new Map(hits.map((h) => [h.id, h])), lanes: new Map(), covered: new Map(),
    edge: hits.find((h) => h.id === edgeId), cache: new Map(),
  };
  for (const player of wp.pull.players) {
    for (const entry of problem.game.catalog) {
      if (!entry.jobs.includes(player.className) || !problem.eligible(entry, player)) continue;
      const casts: Cast[] = playerCasts(player, entry).map((t) => {
        const on = hits.filter((h) => castOnHit(h, entry, player.name, t));
        ctx.covered.set(`${player.name}|${entry.key}|${t}`, new Set(on.map((h) => h.id)));
        return { t, anchor: on[0]?.id, real: true };
      });
      ctx.lanes.set(laneKey(player.name, entry.key), { player, entry, casts });
    }
  }
  return ctx;
}

// ── Baseline ───────────────────────────────────────────────────────────

/** The current plan: every (player, entry, hit) attached in at least half the window pulls that reached the hit. */
function baselineAssignments(problem: OptimizerProblem, ctxs: PullCtx[]): Assignment[] {
  const counts = new Map<string, { a: Assignment; n: number }>();
  for (const ctx of ctxs) {
    for (const lane of ctx.lanes.values()) {
      for (const c of lane.casts) {
        if (!c.anchor) continue;
        const k = `${lane.player.name}|${lane.entry.key}|${c.anchor}`;
        const x = counts.get(k) ?? { a: { player: lane.player.name, key: lane.entry.key, anchor: c.anchor }, n: 0 };
        x.n++;
        counts.set(k, x);
      }
    }
  }
  const reached = new Map(problem.anchors.map((r) => [r.id, r.pulls]));
  return [...counts.values()].filter(({ a, n }) => {
    const of = reached.get(a.anchor);
    return of !== undefined && enough(n, of);
  }).map(({ a }) => a);
}

// ── Applying changes ───────────────────────────────────────────────────

function applyChanges(ctx: PullCtx, changes: Change[]): { lanes: Map<string, Cast[]>; legal: boolean[] } {
  const lanes = new Map<string, Cast[]>();
  const legal: boolean[] = [];
  for (const ch of changes) {
    const k = laneKey(ch.player, ch.key);
    const lane = ctx.lanes.get(k);
    const to = ctx.hitIx.get(ch.to);
    if (!lane || !to) { legal.push(false); continue; }
    let next = lanes.get(k) ?? lane.casts;
    if (ch.kind === "move") {
      const i = next.findIndex((c) => c.anchor === ch.from);
      if (i < 0) { legal.push(false); continue; }
      next = next.filter((_, j) => j !== i);
    }
    const t = Math.max(0, to.timestampMs - CAST_LEAD_MS);
    next = [...next, { t, anchor: ch.to, real: false }].sort((a, b) => a.t - b.t);
    const ok = simulateCharges(next.map((c) => c.t), lane.entry).rejected.length === 0
      && !isDeadOrFreshlyRevived(lane.player, ctx.wp.pull.deathEvents, t);
    legal.push(ok);
    if (ok) lanes.set(k, next);
  }
  return { lanes, legal };
}

// ── Evaluating ─────────────────────────────────────────────────────────

/** One hit's estimate in one pull, with the changed lanes applied. */
function estimateHit(problem: OptimizerProblem, ctx: PullCtx, hit: MitigationHit, changed: Map<string, Cast[]>): HitResult {
  const removed = new Set<string>();
  const added: { entry: CatalogEntry; player: string }[] = [];
  for (const [k, casts] of changed) {
    const lane = ctx.lanes.get(k)!;
    const { player, entry } = lane;
    const coveredBy = (c: Cast) => ctx.covered.get(`${player.name}|${entry.key}|${c.t}`)?.has(hit.id);
    const kept = new Set(casts.filter((c) => c.real).map((c) => c.t));
    if (lane.casts.some((c) => !kept.has(c.t) && coveredBy(c)) && !casts.some((c) => c.real && coveredBy(c))) {
      const others = hit.active.find((a) => a.key === entry.key)?.casters.filter((c) => c !== player.name) ?? [];
      if (others.length === 0) removed.add(entry.key);
    }
    for (const c of casts) {
      if (c.real) continue;
      const covers = entry.variableDuration ? c.anchor === hit.id
        : c.t <= hit.timestampMs && hit.timestampMs - c.t <= entry.durationMs;
      if (!covers) continue;
      if (hit.active.some((a) => a.key === entry.key) && !removed.has(entry.key)) continue;  // doesn't stack
      if (added.some((a) => a.entry.key === entry.key)) continue;
      added.push({ entry, player: player.name });
    }
  }
  const pool = judged(hit.targets);
  const logged = (): HitResult => ({
    margin: hit.margin, sequence: hit.sequenceMargin, died: hit.cleanDeaths > 0,
  });
  if (pool.length === 0 || (removed.size === 0 && added.length === 0)) return logged();

  const signature = `${hit.id}|${[...removed].sort().join(",")}|${added.map((a) => `${a.entry.key}:${a.player}`).sort().join(",")}`;
  const hitCache = ctx.cache.get(signature);
  if (hitCache) return hitCache;

  const lowest = [...pool].sort((a, b) => a.margin - b.margin)[0];
  let margin = Infinity;
  let sequence = Infinity;
  let died = false;
  for (const t of pool) {
    const adds: AddedMitigation[] = added
      .filter((a) => a.entry.reach === "party" || (a.entry.reach === "self" ? a.player === t.player : t === lowest))
      .map((a) => ({
        entry: a.entry, shield: problem.shieldSizes.get(a.entry.key) ?? 0,
        applies: (part) => reachesPart(problem.reach, a.entry, a.player, part, hit),
      }));
    const d = targetDelta(problem, t, removed, adds, hit);
    const m = t.margin + d.margin;
    margin = Math.min(margin, m);
    sequence = Math.min(sequence, t.margin - t.laterDrop + d.sequence);
    const changedHere = d.margin !== 0;
    if (!t.vulnerable && (changedHere ? m < 0 : t.died)) died = true;
  }
  const result = { margin, sequence, died };
  ctx.cache.set(signature, result);
  return result;
}

function targetDelta(problem: OptimizerProblem, t: HitTarget, removed: Set<string>, adds: AddedMitigation[], hit: MitigationHit) {
  if (removed.size === 0 && adds.length === 0) return { margin: 0, sequence: 0 };
  const none = marginWith(t, new Set(), [], problem.game, hit.damageColumn, DAMAGE_ROLL_BUFFER);
  const changed = marginWith(t, removed, adds, problem.game, hit.damageColumn, DAMAGE_ROLL_BUFFER);
  return { margin: changed.margin - none.margin, sequence: changed.sequenceMargin - none.sequenceMargin };
}

/** Hit ids whose estimate a lane change can affect: within the old or new casts' reach. */
function touchedHits(ctx: PullCtx, entry: CatalogEntry, before: Cast[], after: Cast[]): string[] {
  const reachMs = entry.durationMs + SNAPSHOT_SLACK_MS;
  const times = new Set([...before, ...after].map((c) => c.t));
  const beforeT = new Set(before.map((c) => c.t));
  const afterT = new Set(after.map((c) => c.t));
  const diff = [...times].filter((t) => beforeT.has(t) !== afterT.has(t));
  return ctx.hits.filter((h) => diff.some((t) => t <= h.endMs + SAME_HIT_MS && h.timestampMs - t <= reachMs)).map((h) => h.id);
}

/** Tier 3 in one pull: what the changed lanes gain at the progression edge over the real casts. */
function laneFreedom(ctx: PullCtx, changed: Map<string, Cast[]>): number {
  if (!ctx.edge) return 0;
  const at = ctx.edge.timestampMs;
  let sum = 0;
  for (const [k, casts] of changed) {
    const { entry, casts: real } = ctx.lanes.get(k)!;
    const value = (list: Cast[]) => {
      const s = chargesAt(list.map((c) => c.t), entry, at);
      const readyAt = s.charges > 0 ? at : s.nextReadyMs;
      return (s.charges > 0 ? entry.cooldownMs / 1000 : 0) - (readyAt - at) / 1000;
    };
    sum += (value(casts) - value(real)) * entry.cooldownMs / FREEDOM_REFERENCE_MS;
  }
  return sum;
}

/** Evaluates a plan, re-scoring only hits the changed lanes touch when given the parent's evaluation. */
export function evaluatePlan(problem: OptimizerProblem, ctxs: PullCtx[], changes: Change[], parent?: PlanEvaluation): PlanEvaluation {
  const legal = changes.map(() => ({ legal: 0, pulls: 0 }));
  const perPull: PullEval[] = [];
  let freedom = 0;
  let edgePulls = 0;
  ctxs.forEach((ctx, i) => {
    const applied = applyChanges(ctx, changes);
    changes.forEach((ch, j) => {
      if (!ctx.hitIx.has(ch.to)) return;
      legal[j].pulls++;
      if (applied.legal[j]) legal[j].legal++;
    });
    const prev = parent?.perPull[i];
    let results: Map<string, HitResult>;
    if (prev) {
      results = new Map(prev.results);
      const keys = new Set([...prev.lanes.keys(), ...applied.lanes.keys()]);
      const dirty = new Set<string>();
      for (const k of keys) {
        const a = prev.lanes.get(k) ?? ctx.lanes.get(k)!.casts;
        const b = applied.lanes.get(k) ?? ctx.lanes.get(k)!.casts;
        if (a.length === b.length && a.every((c, n) => c.t === b[n].t && c.real === b[n].real && c.anchor === b[n].anchor)) continue;
        for (const id of touchedHits(ctx, ctx.lanes.get(k)!.entry, a, b)) dirty.add(id);
      }
      for (const id of dirty) {
        if (results.has(id)) results.set(id, estimateHit(problem, ctx, ctx.hitIx.get(id)!, applied.lanes));
      }
    } else {
      results = new Map();
      for (const row of problem.anchors) {
        const hit = ctx.hitIx.get(row.id);
        if (hit) results.set(row.id, estimateHit(problem, ctx, hit, applied.lanes));
      }
    }
    if (ctx.edge) {
      edgePulls++;
      freedom += laneFreedom(ctx, applied.lanes);
    }
    perPull.push({ lanes: applied.lanes, legal: applied.legal, results });
  });

  const hits = new Map<string, HitEstimate>();
  for (const row of problem.anchors) {
    const rs = perPull.map((p) => p.results.get(row.id)).filter((r): r is HitResult => r !== undefined);
    if (!rs.length) continue;
    const margins = rs.map((r) => r.margin);
    const med = median(margins);
    const worst = Math.min(...margins);
    const deaths = rs.filter((r) => r.died).length;
    const verdict = verdictFor(med, deaths * 2 > rs.length ? 1 : 0);
    hits.set(row.id, {
      median: med, worst, worstSequence: Math.min(...rs.map((r) => r.sequence)), verdict,
      tight: verdict === "good" && worst < MARGIN_UNDER, pulls: rs.length,
    });
  }
  return { changes, hits, legal, freedom: edgePulls ? freedom / edgePulls : 0, perPull };
}

// ── The search ─────────────────────────────────────────────────────────

export type SearchState = {
  problem:  OptimizerProblem;
  baseline: Assignment[];
  ev:       PlanEvaluation;
};

/** The assignments a plan ends up with, each with the change that put it there (-1: baseline). */
function currentAssignments(baseline: Assignment[], changes: Change[]): (Assignment & { origin: number })[] {
  const out = baseline.map((a) => ({ ...a, origin: -1 }));
  changes.forEach((ch, i) => {
    if (ch.kind === "move") {
      const j = out.findIndex((a) => a.player === ch.player && a.key === ch.key && a.anchor === ch.from);
      if (j >= 0) out[j] = { ...out[j], anchor: ch.to, origin: i };
    } else {
      out.push({ player: ch.player, key: ch.key, anchor: ch.to, origin: i });
    }
  });
  return out;
}

/** The plan with one assignment shifted to `to`, editing the change that placed it if any. */
function shifted(changes: Change[], a: Assignment & { origin: number }, to: string, pair?: number): Change[] | null {
  if (a.origin < 0) return [...changes, { kind: "move", player: a.player, key: a.key, from: a.anchor, to, pair }];
  const ch = changes[a.origin];
  const next = [...changes];
  if (ch.kind === "move" && ch.from === to) next.splice(a.origin, 1);
  else next[a.origin] = { ...ch, to };
  return next;
}

const changeKey = (c: Change) => c.kind === "move" ? `m|${c.player}|${c.key}|${c.from}|${c.to}` : `a|${c.player}|${c.key}|${c.to}`;
const planKey = (changes: Change[]) => changes.map(changeKey).sort().join(";");

function compare(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (Math.abs(d) > 1e-9) return d;
  }
  return 0;
}

function valid(problem: OptimizerProblem, base: PlanEvaluation, ev: PlanEvaluation): boolean {
  if (!ev.legal.every((l) => enough(l.legal, l.pulls))) return false;
  return problem.constraint(base, ev);
}

export type SearchResult = { baseline: Assignment[]; base: PlanEvaluation; best: PlanEvaluation; evaluated: number };

export function searchPlan(problem: OptimizerProblem, ctxs: PullCtx[], baseline: Assignment[]): SearchResult {
  const maxChanges = problem.maxChanges ?? PLAN_MAX_CHANGES;
  const width = problem.beamWidth ?? BEAM_WIDTH;
  const base = evaluatePlan(problem, ctxs, []);
  const lanesByPlayer = new Map<string, PlayerInfo>();
  for (const ctx of ctxs) for (const lane of ctx.lanes.values()) lanesByPlayer.set(laneKey(lane.player.name, lane.entry.key), lane.player);
  const entryOf = new Map(problem.game.catalog.map((e) => [e.key, e]));
  const anchorIds = problem.anchors.map((r) => r.id);
  const timeOf = new Map(problem.anchors.map((r) => [r.id, r.medianMs]));
  const edgeMs = Math.max(...problem.anchors.map((r) => r.medianMs));
  const backBy = (key: string, anchor: string) => timeOf.get(anchor)! - CAST_LEAD_MS + entryOf.get(key)!.cooldownMs;
  let pairId = 0;

  let beam: { ev: PlanEvaluation; score: number[] }[] = [{ ev: base, score: problem.objective(base) }];
  let best = beam[0];
  const seen = new Set<string>([""]);
  let evaluated = 1;

  for (let step = 0; step < maxChanges; step++) {
    const next: typeof beam = [];
    for (const cand of beam) {
      const changes = cand.ev.changes;
      const current = currentAssignments(baseline, changes);
      const occupied = new Set(current.map((a) => `${a.player}|${a.key}|${a.anchor}`));
      const helpIds = anchorIds.filter((id) => problem.needsHelp(cand.ev, id));
      const help = new Set(helpIds);
      const proposals: Change[][] = [];
      for (const a of current) {
        // Shifts go to a hit needing help...
        for (const to of helpIds) {
          if (to === a.anchor || occupied.has(`${a.player}|${a.key}|${to}`)) continue;
          const p = shifted(changes, a, to);
          if (p) proposals.push(p);
        }
        // ...or, to free a cooldown for later mechanics (tier 3), to the
        // latest earlier hit that gets it back by the progression edge.
        if (backBy(a.key, a.anchor) > edgeMs) {
          const to = [...anchorIds].reverse().find((id) => timeOf.get(id)! < timeOf.get(a.anchor)! && backBy(a.key, id) <= edgeMs);
          if (to && !occupied.has(`${a.player}|${a.key}|${to}`)) {
            const p = shifted(changes, a, to);
            if (p) proposals.push(p);
          }
        }
      }
      // A swap helps a hit directly, or brings the cast that moves earlier
      // back in time for a hit needing help after its old spot.
      const swapHelps = (early: string, late: string, lateKey: string) => help.has(early) || help.has(late)
        || helpIds.some((h) => timeOf.get(h)! > timeOf.get(late)! && backBy(lateKey, early) <= timeOf.get(h)!);
      for (let i = 0; i < current.length; i++) {
        for (let j = i + 1; j < current.length; j++) {
          const a = current[i];
          const b = current[j];
          if (a.anchor === b.anchor || laneKey(a.player, a.key) === laneKey(b.player, b.key)) continue;
          const [early, late] = timeOf.get(a.anchor)! < timeOf.get(b.anchor)! ? [a, b] : [b, a];
          if (!swapHelps(early.anchor, late.anchor, late.key)) continue;
          if (occupied.has(`${a.player}|${a.key}|${b.anchor}`) || occupied.has(`${b.player}|${b.key}|${a.anchor}`)) continue;
          const pair = ++pairId;
          const p1 = shifted(changes, a, b.anchor, pair);
          if (!p1) continue;
          // b's origin index may have moved if shifting a removed a change.
          const cur2 = currentAssignments(baseline, p1).find((x) => x.player === b.player && x.key === b.key && x.anchor === b.anchor);
          const p2 = cur2 && shifted(p1, cur2, a.anchor, pair);
          if (p2) proposals.push(p2);
        }
      }
      for (const [k, player] of lanesByPlayer) {
        const entry = entryOf.get(k.slice(k.lastIndexOf("|") + 1))!;
        if (!problem.canAdd(entry, player)) continue;
        for (const to of helpIds) {
          if (occupied.has(`${player.name}|${entry.key}|${to}`)) continue;
          proposals.push([...changes, { kind: "add", player: player.name, key: entry.key, to }]);
        }
      }
      for (const extra of problem.extraEdits?.({ problem, baseline, ev: cand.ev }) ?? []) proposals.push(extra);

      for (const p of proposals) {
        if (p.length > maxChanges) continue;
        const key = planKey(p);
        if (seen.has(key)) continue;
        seen.add(key);
        const ev = evaluatePlan(problem, ctxs, p, cand.ev);
        evaluated++;
        if (!valid(problem, base, ev)) continue;
        next.push({ ev, score: problem.objective(ev) });
      }
    }
    if (!next.length) break;
    next.sort((a, b) => compare(b.score, a.score));
    beam = next.slice(0, width);
    if (compare(beam[0].score, best.score) > 0) best = beam[0];
  }
  return { baseline, base, best: best.ev, evaluated };
}

/** Splits a plan's changes into groups that must be done together (see header). */
export function groupChanges(problem: OptimizerProblem, ctxs: PullCtx[], changes: Change[], base: PlanEvaluation): Change[][] {
  const n = changes.length;
  const parent = changes.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const union = (i: number, j: number) => { parent[find(i)] = find(j); };
  const score = (cs: Change[]) => {
    const ev = evaluatePlan(problem, ctxs, cs);
    return { ev, s: problem.objective(ev).slice(0, -1) };  // the change count doesn't count here
  };
  // Changes that lift the same hit needing help go on one card: a raid
  // lead fixes one hit at a time.
  const helped = changes.map((c) => {
    const ev = evaluatePlan(problem, ctxs, [c]);
    return new Set([...base.hits].filter(([id, b]) => {
      const e = ev.hits.get(id);
      return problem.needsHelp(base, id) && !!e && (e.median > b.median + 1e-9 || e.worst > b.worst + 1e-9);
    }).map(([id]) => id));
  });
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) if ([...helped[i]].some((id) => helped[j].has(id))) union(i, j);
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const ci = changes[i];
      const cj = changes[j];
      if (ci.kind === "move" && cj.kind === "move" && ci.pair !== undefined && ci.pair === cj.pair) { union(i, j); continue; }
      const withoutI = changes.filter((_, k) => k !== i);
      const w = score(withoutI);
      const jIdx = withoutI.indexOf(cj);
      if (!enough(w.ev.legal[jIdx].legal, w.ev.legal[jIdx].pulls)) { union(i, j); continue; }
      const w2 = score(withoutI.filter((c) => c !== cj));
      if (compare(w.s, w2.s) <= 0) union(i, j);
    }
  }
  const groups = new Map<number, Change[]>();
  changes.forEach((c, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), c]));
  return [...groups.values()];
}

// ── The party Analysis ─────────────────────────────────────────────────

export type HitClass = "plan" | "healing" | "mechanic";

/** Hits the objective leaves out: healing deaths and mechanic failures. */
export function classifyHit(row: AggregatedHit): HitClass {
  if ((row.verdict === "fail" || row.verdict === "under") && row.medianMargin < MECHANIC_MARGIN) return "mechanic";
  if (row.verdict === "fail") {
    const dead = row.byPull.flatMap((b) => b.hit.targets.filter((t) => t.died && !t.vulnerable));
    if (dead.every((t) => t.deathCause === "healing")) return "healing";
  }
  return "plan";
}

/** Party-wide planned cooldowns: the entries the Analysis may move or add. Tank personals never move. */
export function partyEligible(entry: CatalogEntry): boolean {
  return entry.reach === "party" && entry.inSheet !== false && !entry.situational
    && entry.kind !== "invuln" && entry.kind !== "limitBreak" && entry.cooldownMs >= DROP_MIN_COOLDOWN_MS;
}

const failing = (e: HitEstimate) => e.verdict === "fail" || e.verdict === "under";

export type PartySetup = {
  problem:  OptimizerProblem;
  ctxs:     PullCtx[];
  baseline: Assignment[];
  classes:  Map<string, HitClass>;
};

/**
 * The party Analysis problem over a group's last pulls. `rows` is
 * aggregateMitigation over exactly the window pulls; `allHits` every loaded
 * pull's hits (shield size estimates). Anchors are party hits (no tank
 * busters) reached in PLAN_MIN_PULLS+ window pulls and not rare.
 *
 * Objective, first difference wins (user, 2026-10-11):
 *   1. fewer failing hits (median fail or under); ties: higher sum of
 *      median margins capped at MARGIN_UNDER
 *   2. fewer tight hits; ties: higher sum of worst-pull margins, capped
 *   3. cooldowns free at the progression edge (the last anchor): per
 *      changed (player, entry), off cooldown there (its length in seconds)
 *      minus how long until it is back, weighted by length over
 *      FREEDOM_REFERENCE_MS, against the real casts, averaged over the
 *      window pulls reaching the edge. The least certain tier.
 *   4. fewer changes
 * Healing and mechanic hits are left out of tiers 1-2.
 * Hard constraint: a healing or mechanic hit gets no worse (median or worst
 * pull), and a hit good or over in the baseline stays at least
 * MARGIN_UNDER on the median, its worst pull stays at least MARGIN_UNDER
 * (or no lower than it was, if it was already below), and its worst
 * sequence margin stays at least SEQUENCE_FLOOR (or no lower than it was).
 */
export function partySetup(window: WindowPull[], rows: AggregatedHit[], allHits: MitigationHit[][],
  game: MitigationGame, reach?: DebuffReach,
  // Narrows the entries considered (scripts/check-optimizer-example.js).
  only?: (entry: CatalogEntry, player: PlayerInfo) => boolean): PartySetup {
  const anchors = rows.filter((r) => !r.rare && r.pulls >= PLAN_MIN_PULLS && !r.byPull.every((b) => b.hit.tankOnly))
    .sort((a, b) => a.medianMs - b.medianMs);
  const classes = new Map(anchors.map((r) => [r.id, classifyHit(r)]));
  const planned = (id: string) => classes.get(id) === "plan";
  const shieldSizes = medianShieldSizes(allHits, game);
  const cap = (x: number) => Math.min(x, MARGIN_UNDER);
  const problem: OptimizerProblem = {
    game, reach, window, anchors, shieldSizes,
    eligible: (entry, player) => partyEligible(entry) && (!only || only(entry, player)),
    canAdd:   (entry) => !entry.statuses.some((s) => s.shield) || shieldSizes.has(entry.key),
    objective: (ev) => {
      let fail = 0, failSum = 0, tight = 0, tightSum = 0;
      for (const [id, e] of ev.hits) {
        if (!planned(id)) continue;
        if (failing(e)) fail++;
        else if (e.tight) tight++;
        failSum += cap(e.median);
        tightSum += cap(e.worst);
      }
      return [-fail, failSum, -tight, tightSum, ev.freedom, -ev.changes.length];
    },
    constraint: (base, ev) => {
      for (const [id, b] of base.hits) {
        const e = ev.hits.get(id)!;
        // Healing and mechanic hits are never changed, so never made worse.
        if (!planned(id) && (e.median < b.median - 1e-9 || e.worst < b.worst - 1e-9)) return false;
        if (b.verdict !== "good" && b.verdict !== "over") continue;
        if (e.verdict === "fail" || e.median < MARGIN_UNDER - 1e-9) return false;
        if (e.worst < Math.min(MARGIN_UNDER, b.worst) - 1e-9) return false;
        if (e.worstSequence < Math.min(SEQUENCE_FLOOR, b.worstSequence) - 1e-9) return false;
      }
      return true;
    },
    needsHelp: (ev, id) => {
      const e = ev.hits.get(id);
      return !!e && planned(id) && (failing(e) || e.tight);
    },
  };
  const edgeId = anchors[anchors.length - 1]?.id;
  const ctxs = window.map((wp) => buildPullCtx(problem, wp, edgeId));
  return { problem, ctxs, baseline: baselineAssignments(problem, ctxs), classes };
}

/** Failing (fail or under on the median) and tight counts over the planned hits. */
export function countIssues(setup: PartySetup, ev: PlanEvaluation): { failing: number; tight: number } {
  let f = 0;
  let t = 0;
  for (const [id, e] of ev.hits) {
    if (setup.classes.get(id) !== "plan") continue;
    if (failing(e)) f++;
    else if (e.tight) t++;
  }
  return { failing: f, tight: t };
}

// ── Output ─────────────────────────────────────────────────────────────

export type HitRef = { id: string; name: string; occurrence: number; phase?: string; medianMs: number };

export type OptimizedChange = {
  kind:   "move" | "add";  // a swap is two moves
  player: string;
  job:    string;
  key:    string;
  name:   string;          // catalog entry
  from?:  HitRef;          // move only
  to:     HitRef;
  legal:  number;          // window pulls where it fits
  pulls:  number;
  gated?: string;          // an add of a gated entry: what the player must check (Addersgall)
};

type Side = { median: number; worst: number; verdict: HitVerdict; tight: boolean };
export type HitOutcome = { hit: HitRef; before: Side; after: Side };

export type Counts = { failing: number; tight: number };

export type OptimizedPlan = {
  windowPulls:   number[];  // pull ids used
  summary:       { before: Counts; after: Counts };
  // purpose: "fix" lifts a failing or tight hit; "free" only frees
  // cooldowns for later mechanics (tier 3).
  groups:        { purpose: "fix" | "free"; changes: OptimizedChange[]; hits: HitOutcome[] }[];
  notMitigation: HitRef[];  // healing or mechanic failures: listed, never changed
  unfixed:       HitRef[];  // failing or tight hits no plan within budget fixes
  evaluated:     number;    // candidate plans scored
};

function refOf(row: AggregatedHit): HitRef {
  return { id: row.id, name: row.abilityName, occurrence: row.occurrence, phase: row.phase, medianMs: row.medianMs };
}

/** The party Analysis: the best plan within the change budget, grouped for display. */
export function partyPlan(window: WindowPull[], rows: AggregatedHit[], allHits: MitigationHit[][],
  game: MitigationGame, reach?: DebuffReach, only?: (entry: CatalogEntry, player: PlayerInfo) => boolean): OptimizedPlan {
  const setup = partySetup(window, rows, allHits, game, reach, only);
  const { problem, ctxs } = setup;
  const result = searchPlan(problem, ctxs, setup.baseline);
  const { base, best } = result;
  const rowOf = new Map(problem.anchors.map((r) => [r.id, r]));
  const jobOf = new Map(window.flatMap((w) => w.pull.players.map((p) => [p.name, p.className] as const)));
  const entryOf = new Map(game.catalog.map((e) => [e.key, e]));
  const side = (e: HitEstimate): Side => ({ median: e.median, worst: e.worst, verdict: e.verdict, tight: e.tight });

  const groups = groupChanges(problem, ctxs, best.changes, base).map((group) => {
    const changes: OptimizedChange[] = group.map((c) => {
      const i = best.changes.indexOf(c);
      const entry = entryOf.get(c.key)!;
      return {
        kind: c.kind, player: c.player, job: jobOf.get(c.player) ?? "", key: c.key, name: entry.name,
        from: c.kind === "move" ? refOf(rowOf.get(c.from)!) : undefined,
        to: refOf(rowOf.get(c.to)!),
        legal: best.legal[i].legal, pulls: best.legal[i].pulls,
        gated: c.kind === "add" ? entry.gated : undefined,
      };
    });
    const alone = evaluatePlan(problem, ctxs, group);
    const hits: HitOutcome[] = problem.anchors
      .filter((r) => {
        const a = alone.hits.get(r.id);
        const b = base.hits.get(r.id);
        return a && b && (Math.abs(a.median - b.median) > 1e-9 || Math.abs(a.worst - b.worst) > 1e-9);
      })
      .map((r) => ({ hit: refOf(r), before: side(base.hits.get(r.id)!), after: side(best.hits.get(r.id)!) }));
    const fixes = hits.some((h) => problem.needsHelp(base, h.hit.id)
      && (h.after.median > h.before.median + 1e-9 || h.after.worst > h.before.worst + 1e-9));
    return { purpose: fixes ? "fix" as const : "free" as const, changes, hits };
  });

  const notMitigation = problem.anchors.filter((r) => setup.classes.get(r.id) !== "plan" && failing(base.hits.get(r.id)!)).map(refOf);
  const unfixed = problem.anchors
    .filter((r) => setup.classes.get(r.id) === "plan" && (failing(best.hits.get(r.id)!) || best.hits.get(r.id)!.tight))
    .map(refOf);
  return {
    windowPulls: window.map((w) => w.pull.id),
    summary: { before: countIssues(setup, base), after: countIssues(setup, best) },
    groups, notMitigation, unfixed, evaluated: result.evaluated,
  };
}
