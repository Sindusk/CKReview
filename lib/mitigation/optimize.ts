// lib/mitigation/optimize.ts
//
// The Analysis view's optimizer (docs/mitigation-optimizer-plan.md): a small
// set of coordinated changes to a group's current cooldown plan, found by
// searching over the whole schedule. The engine is generic: the party
// Analysis and the planned Tanking panel (docs/tanking-panel-plan.md) differ
// only in the OptimizerProblem they hand it (eligible entries, anchor hits,
// objective, constraint, extra edits).
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
// A candidate is the baseline plus changes, applied to every window pull
// with that pull's real hit times and damage:
//   - a move takes the player's cast attached to `from` off and places one
//     at `to` (CAST_LEAD_MS before the hit); an add places one at `to`.
//     A cast the plan doesn't touch keeps its real time. A move in a pull
//     with no cast attached to `from` isn't applied there.
//   - a placed cast covers every hit from its anchor up to its duration
//     after the cast, with no snapshot slack (conservative); a
//     variableDuration entry covers only its anchor hit.
//   - a removed cast stops covering the hits it covered in the log, unless
//     another cast of the same entry that is still there covers them too.
//   - legality: the player's resulting casts pass simulateCharges with
//     nothing rejected and the player is alive at the placed cast. Where a
//     change isn't legal it is left out of that pull (pessimistic). A
//     change counts only where it is legal in at least half the window
//     pulls that reached its anchor (`enough`).
// Per target the change's effect is a delta, marginWith(changes) -
// marginWith(none), both with DAMAGE_ROLL_BUFFER, added to the logged
// margin: a hit the plan doesn't touch keeps exactly its logged margin
// (so the baseline reproduces the aggregate), and what a change adds or
// removes is measured on damage rolled 5% high. A hit's estimate in a pull
// is its lowest judged target (analyze.ts judged); a target that died is
// alive in the estimate only if a change lifts it to 0+, and one that
// lived dies if a change takes it below 0. Across the window a hit's
// verdict uses the median estimate (fail when most pulls estimate a
// death), and "tight" is good on the median with the worst pull under
// MARGIN_UNDER, as in aggregate.ts.

import type { Pull } from "@/types/Pull";
import type { PlayerInfo } from "@/types/PlayerInfo";
import type { CatalogEntry, HitTarget, HitVerdict, MitigationGame, MitigationHit } from "./types";
import type { AggregatedHit } from "./aggregate";
import {
  DAMAGE_ROLL_BUFFER, DROP_MIN_COOLDOWN_MS, MARGIN_UNDER, SNAPSHOT_SLACK_MS,
  isDeadOrFreshlyRevived, judged, marginWith, playerCasts, simulateCharges, verdictFor, type AddedMitigation,
} from "./analyze";
import { reachesPart, type DebuffReach } from "./debuff-reach";

export const PLAN_WINDOW_DEFAULT = 5;
export const PLAN_MIN_PULLS = 3;
export const PLAN_MAX_CHANGES = 3;
// A placed cast's lead before its anchor hit's first damage.
export const CAST_LEAD_MS = 2_000;
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

export type Change =
  | { kind: "move"; player: string; key: string; from: string; to: string }
  | { kind: "add";  player: string; key: string; to: string };

/** What the engine needs from its caller (the party Analysis, later the Tanking panel). */
export type OptimizerProblem = {
  game:     MitigationGame;
  reach?:   DebuffReach;
  window:   WindowPull[];
  // The hits the objective is scored on, matched across the window
  // (aggregateMitigation over the window pulls). Also the only hits a cast
  // may be moved from or to.
  anchors:  AggregatedHit[];
  eligible: (entry: CatalogEntry, player: PlayerInfo) => boolean;
  // Whether a new cast may be added (not just moved): no gated entry, no
  // shield without a size estimate.
  canAdd:   (entry: CatalogEntry, player: PlayerInfo) => boolean;
  // Median per-target absorb of each shield entry (medianShieldSizes).
  shieldSizes: Map<string, number>;
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
  wp:     WindowPull;
  hitIx:  Map<string, MitigationHit>;
  lanes:  Map<string, Lane>;  // `${player}|${key}`
  // Hits each real cast covered in the log: `${player}|${key}|${t}` -> hit ids.
  covered: Map<string, Set<string>>;
};

const laneKey = (player: string, key: string) => `${player}|${key}`;

/** Whether the log shows this player's cast of `entry` at `t` on the hit. */
function castOnHit(hit: MitigationHit, entry: CatalogEntry, player: string, t: number): boolean {
  return t <= hit.endMs + SAME_HIT_MS && hit.timestampMs - t <= entry.durationMs + SNAPSHOT_SLACK_MS
    && hit.active.some((a) => a.key === entry.key && a.casters.includes(player));
}

function buildPullCtx(problem: OptimizerProblem, wp: WindowPull): PullCtx {
  const hits = [...wp.hits].sort((a, b) => a.timestampMs - b.timestampMs);
  const ctx: PullCtx = { wp, hitIx: new Map(hits.map((h) => [h.id, h])), lanes: new Map(), covered: new Map() };
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
export function baselineAssignments(problem: OptimizerProblem, ctxs: PullCtx[]): Assignment[] {
  const counts = new Map<string, number>();
  for (const ctx of ctxs) {
    for (const [k, lane] of ctx.lanes) {
      for (const c of lane.casts) if (c.anchor) counts.set(`${k}|${c.anchor}`, (counts.get(`${k}|${c.anchor}`) ?? 0) + 1);
    }
  }
  const reached = new Map(problem.anchors.map((r) => [r.id, r.pulls]));
  const out: Assignment[] = [];
  for (const [k, n] of counts) {
    const [player, key, ...rest] = k.split("|");
    const anchor = rest.join("|");  // hit ids hold a "|"
    const of = reached.get(anchor);
    if (of !== undefined && enough(n, of)) out.push({ player, key, anchor });
  }
  return out;
}

// ── Applying changes ───────────────────────────────────────────────────

type Applied = {
  lanes:   Map<string, Cast[]>;  // changed lanes only
  legal:   boolean[];            // per change, in this pull
};

function applyChanges(ctx: PullCtx, changes: Change[]): Applied {
  const lanes = new Map<string, Cast[]>();
  const legal: boolean[] = [];
  for (const ch of changes) {
    const k = laneKey(ch.player, ch.key);
    const lane = ctx.lanes.get(k);
    const to = ctx.hitIx.get(ch.to);
    const current = lanes.get(k) ?? lane?.casts ?? [];
    if (!lane || !to) { legal.push(false); continue; }
    let next = current;
    if (ch.kind === "move") {
      const i = current.findIndex((c) => c.anchor === ch.from);
      if (i < 0) { legal.push(false); continue; }
      next = current.filter((_, j) => j !== i);
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

export type HitEstimate = { median: number; worst: number; verdict: HitVerdict; tight: boolean; pulls: number };

/** One hit's estimated lowest margin in one pull, with the changed lanes applied. */
function estimateHit(problem: OptimizerProblem, ctx: PullCtx, hit: MitigationHit, changed: Map<string, Cast[]>):
  { margin: number; died: boolean } {
  const pool = judged(hit.targets);
  if (pool.length === 0) return { margin: hit.margin, died: false };
  const removed = new Set<string>();
  const added: { entry: CatalogEntry; player: string }[] = [];
  for (const [k, casts] of changed) {
    const lane = ctx.lanes.get(k)!;
    const { player, entry } = lane;
    // Real casts the changes took away, and whether one still covering this hit is left.
    const kept = new Set(casts.filter((c) => c.real).map((c) => c.t));
    const lost = lane.casts.filter((c) => !kept.has(c.t)
      && ctx.covered.get(`${player.name}|${entry.key}|${c.t}`)?.has(hit.id));
    if (lost.length) {
      const otherCasters = hit.active.find((a) => a.key === entry.key)?.casters.filter((c) => c !== player.name) ?? [];
      const stillCovered = casts.some((c) => c.real && ctx.covered.get(`${player.name}|${entry.key}|${c.t}`)?.has(hit.id));
      if (!stillCovered && otherCasters.length === 0) removed.add(entry.key);
    }
    for (const c of casts) {
      if (c.real) continue;
      const covers = entry.variableDuration ? c.anchor === hit.id
        : c.t <= hit.timestampMs && hit.timestampMs - c.t <= entry.durationMs;
      if (!covers) continue;
      if (hit.active.some((a) => a.key === entry.key) && !removed.has(entry.key)) continue;  // doesn't stack
      added.push({ entry, player: player.name });
    }
  }
  if (removed.size === 0 && added.length === 0) {
    return { margin: hit.margin, died: hit.cleanDeaths > 0 };
  }
  const lowest = [...pool].sort((a, b) => a.margin - b.margin)[0];
  let margin = Infinity;
  let died = false;
  for (const t of pool) {
    const adds: AddedMitigation[] = added
      .filter((a) => a.entry.reach === "party" || (a.entry.reach === "self" ? a.player === t.player : t === lowest))
      .map((a) => ({
        entry: a.entry, shield: problem.shieldSizes.get(a.entry.key) ?? 0,
        applies: (part) => reachesPart(problem.reach, a.entry, a.player, part, hit),
      }));
    const m = targetEstimate(problem, t, removed, adds, hit);
    margin = Math.min(margin, m);
    const changedHere = m !== t.margin;
    if (!t.vulnerable && (changedHere ? m < 0 : t.died)) died = true;
  }
  return { margin, died };
}

function targetEstimate(problem: OptimizerProblem, t: HitTarget, removed: Set<string>, adds: AddedMitigation[], hit: MitigationHit): number {
  if (removed.size === 0 && adds.length === 0) return t.margin;
  const none = marginWith(t, new Set(), [], problem.game, hit.damageColumn, DAMAGE_ROLL_BUFFER).margin;
  const withChanges = marginWith(t, removed, adds, problem.game, hit.damageColumn, DAMAGE_ROLL_BUFFER).margin;
  return t.margin + (withChanges - none);
}

export type PlanEvaluation = {
  hits:  Map<string, HitEstimate>;  // anchor hit id -> estimate
  legal: { legal: number; pulls: number }[];  // per change
};

export function evaluatePlan(problem: OptimizerProblem, ctxs: PullCtx[], changes: Change[]): PlanEvaluation {
  const perHit = new Map<string, { margins: number[]; deaths: number }>();
  const legal = changes.map(() => ({ legal: 0, pulls: 0 }));
  for (const ctx of ctxs) {
    const applied = applyChanges(ctx, changes);
    changes.forEach((ch, i) => {
      if (!ctx.hitIx.has(ch.to)) return;
      legal[i].pulls++;
      if (applied.legal[i]) legal[i].legal++;
    });
    for (const row of problem.anchors) {
      const hit = ctx.hitIx.get(row.id);
      if (!hit) continue;
      const e = estimateHit(problem, ctx, hit, applied.lanes);
      const acc = perHit.get(row.id) ?? { margins: [], deaths: 0 };
      acc.margins.push(e.margin);
      if (e.died) acc.deaths++;
      perHit.set(row.id, acc);
    }
  }
  const hits = new Map<string, HitEstimate>();
  for (const [id, { margins, deaths }] of perHit) {
    const med = median(margins);
    const worst = Math.min(...margins);
    const verdict = verdictFor(med, deaths * 2 > margins.length ? 1 : 0);
    hits.set(id, { median: med, worst, verdict, tight: verdict === "good" && worst < MARGIN_UNDER, pulls: margins.length });
  }
  return { hits, legal };
}

// ── The party Analysis problem ─────────────────────────────────────────

export type HitClass = "plan" | "healing" | "mechanic";

/** Hits the objective leaves out: healing deaths and mechanic failures (as plan.ts classified them). */
export function classifyHit(row: AggregatedHit): HitClass {
  if ((row.verdict === "fail" || row.verdict === "under") && row.medianMargin < MECHANIC_MARGIN) return "mechanic";
  if (row.verdict === "fail") {
    const dead = row.byPull.flatMap((b) => b.hit.targets.filter((t) => t.died && !t.vulnerable));
    if (dead.every((t) => t.deathCause === "healing")) return "healing";
  }
  return "plan";
}

/** Party-wide planned cooldowns: the entries the Analysis may move or add. */
export function partyEligible(entry: CatalogEntry): boolean {
  return entry.reach === "party" && entry.inSheet !== false && !entry.situational
    && entry.kind !== "invuln" && entry.kind !== "limitBreak" && entry.cooldownMs >= DROP_MIN_COOLDOWN_MS;
}

export type PartySetup = {
  problem:  OptimizerProblem;
  ctxs:     PullCtx[];
  baseline: Assignment[];
  // Party hits reached in PLAN_MIN_PULLS+ window pulls and not rare, by class.
  classes:  Map<string, HitClass>;
};

/**
 * The party Analysis problem over a group's last `windowSize` pulls.
 * `rows` is aggregateMitigation over exactly those pulls; `allHits` every
 * loaded pull's hits (shield size estimates).
 */
export function partySetup(window: WindowPull[], rows: AggregatedHit[], allHits: MitigationHit[][],
  game: MitigationGame, reach?: DebuffReach): PartySetup {
  const anchors = rows.filter((r) => !r.rare && r.pulls >= PLAN_MIN_PULLS && !r.byPull.every((b) => b.hit.tankOnly));
  const shieldSizes = medianShieldSizes(allHits, game);
  const problem: OptimizerProblem = {
    game, reach, window, anchors, shieldSizes,
    eligible: (entry) => partyEligible(entry),
    canAdd:   (entry) => !entry.gated && (!entry.statuses.some((s) => s.shield) || shieldSizes.has(entry.key)),
  };
  const ctxs = window.map((wp) => buildPullCtx(problem, wp));
  return {
    problem, ctxs,
    baseline: baselineAssignments(problem, ctxs),
    classes: new Map(anchors.map((r) => [r.id, classifyHit(r)])),
  };
}

/** Failing (fail or under on the median) and tight counts over the planned hits. */
export function countIssues(setup: PartySetup, ev: PlanEvaluation): { failing: number; tight: number } {
  let failing = 0;
  let tight = 0;
  for (const [id, e] of ev.hits) {
    if (setup.classes.get(id) !== "plan") continue;
    if (e.verdict === "fail" || e.verdict === "under") failing++;
    else if (e.tight) tight++;
  }
  return { failing, tight };
}
