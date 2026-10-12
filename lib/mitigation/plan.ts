// lib/mitigation/plan.ts
//
// The Mitigation dialog's Analysis view (named Plan until 2026-10-09): the
// party problem handed to the generic optimizer (optimize.ts), and the
// OptimizedPlan the view shows (docs/archive/mitigation-optimizer-plan.md).
// Replaced the one-change-per-hit planner and its Spare Mitigation list on
// 2026-10-11 (user: too much text, and it couldn't find re-orderings).
//
// ── Window ─────────────────────────────────────────────────────────────
// The last PLAN_WINDOW_DEFAULT pulls of the selected group (same boss,
// exact roster) define the current plan and are what changes are checked
// against (user, 2026-10-11); the dialog's number input overrides it,
// clamped to PLAN_MIN_PULLS..the group's pull count.
//
// ── What gets planned ──────────────────────────────────────────────────
// Anchors: hits reached in PLAN_MIN_PULLS+ window pulls, not rare, and not
// tank-only. Tank busters are out of the Analysis (user, 2026-10-11): not
// listed, scored or optimized, and tank personal cooldowns never move
// (a later Tanking panel holds them). Two kinds of hit are listed but
// never changed and never made worse:
//   - healing: fail, every clean death from low health before the hit.
//   - mechanic: fail or under on the median by more than MECHANIC_MARGIN.
// Movable entries: party-reach, in the sheet, not situational (Passage of
// Arms), no invulns or limit breaks, cooldown at least
// DROP_MIN_COOLDOWN_MS (GCD shields and short personals count as always
// used). Gated ones (Kerachole) may be moved and added, an added one marked
// with its gate (user, 2026-10-11). A shield never seen absorbing has no
// size estimate: it may be moved, never added. Boss debuffs count only on
// attacks their reach evidence allows (debuff-reach.ts).
//
// ── Objective, first difference wins (user, 2026-10-11) ────────────────
//   1. fewer failing hits (median fail or under); ties: higher sum of
//      median margins capped at MARGIN_UNDER, so lifting a hit past good
//      earns nothing extra
//   2. fewer tight hits (good on the median, worst pull under
//      MARGIN_UNDER); ties: higher sum of worst-pull margins, capped
//   3. cooldowns free at the progression edge (optimize.ts `freedom`), only
//      when nothing is failing or tight in the window (user, 2026-10-11):
//      otherwise its moves only spend headroom
//   4. fewer changes, at most PLAN_MAX_CHANGES
//   5. less headroom taken off other hits (median and worst-pull drops,
//      summed), so a free extra use always beats moving a cast away from
//      where it is used (user, 2026-10-11: Reprisal was moved from 1:04 to
//      5:09 when it was free again three times over)
// Healing and mechanic hits are left out of tiers 1-2.
//
// ── Hard constraint ────────────────────────────────────────────────────
// A healing or mechanic hit gets no worse (median or worst pull). A hit
// good or over in the baseline stays at least MARGIN_UNDER on the median;
// its worst pull stays at least MARGIN_UNDER (or no lower than it was, if
// already below); its worst sequence margin stays at least SEQUENCE_FLOOR
// (or no lower than it was). A change may spend headroom, never create a
// new problem.
//
// ── Output ─────────────────────────────────────────────────────────────
// Before and after counts, the "do together" groups (purpose "fix" when a
// group lifts a failing or tight hit, "free" for tier 3), each with the
// hits it changes (after = the whole plan applied); the healing and
// mechanic hits that fail; the failing or tight hits left unfixed.
// Estimates come from the log and are shown as such.

import type { Pull } from "@/types/Pull";
import type { PlayerInfo } from "@/types/PlayerInfo";
import type { CatalogEntry, HitVerdict, MitigationGame, MitigationHit } from "./types";
import { aggregateMitigation, type AggregatedHit } from "./aggregate";
import { DROP_MIN_COOLDOWN_MS, MARGIN_UNDER, SEQUENCE_FLOOR } from "./analyze";
import type { DebuffReach } from "./debuff-reach";
import {
  evaluatePlan, groupChanges, medianShieldSizes, prepareProblem, searchPlan,
  type HitEstimate, type OptimizerProblem, type PlanEvaluation,
} from "./optimize";

export const PLAN_WINDOW_DEFAULT = 5;  // user
export const PLAN_MAX_CHANGES = 3;     // user
// Tunables below: chosen by the builder, not yet confirmed (docs/open-items.md).
export const PLAN_MIN_PULLS = 3;
// A short hit whose median lowest player ends below this (overkill of half
// a health bar) is a mechanic failure, not something one more mitigation
// covers: Red Hot and Deep Blue's Plunging Snap #3 at -674%.
export const MECHANIC_MARGIN = -0.5;

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
  gated?: string;          // an added gated entry: what the player must check (Addersgall)
};

export type HitSide = { median: number; worst: number; verdict: HitVerdict; tight: boolean };
export type HitOutcome = { hit: HitRef; before: HitSide; after: HitSide };

export type Counts = { failing: number; tight: number };

export type PlanGroup = { purpose: "fix" | "free"; changes: OptimizedChange[]; hits: HitOutcome[] };

export type OptimizedPlan = {
  windowPulls:   number[];  // pull ids used
  summary:       { before: Counts; after: Counts };
  groups:        PlanGroup[];
  notMitigation: HitRef[];  // healing or mechanic failures: listed, never changed
  unfixed:       HitRef[];  // failing or tight hits no plan within budget fixes
  evaluated:     number;    // candidate plans scored
};

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

/** Party-wide planned cooldowns: the entries the Analysis may move or add. */
export function partyEligible(entry: CatalogEntry): boolean {
  return entry.reach === "party" && entry.inSheet !== false && !entry.situational
    && entry.kind !== "invuln" && entry.kind !== "limitBreak" && entry.cooldownMs >= DROP_MIN_COOLDOWN_MS;
}

const failing = (e: HitEstimate) => e.verdict === "fail" || e.verdict === "under";

export type WindowPull = { pull: Pull; pullId: number; pullNumber: number; durationMs?: number; hits: MitigationHit[] };

export type PartySetup = {
  problem: OptimizerProblem;
  anchors: AggregatedHit[];  // problem.anchors, typed
  classes: Map<string, HitClass>;
  ctxs:    ReturnType<typeof prepareProblem>["ctxs"];
  baseline: ReturnType<typeof prepareProblem>["baseline"];
  base:    PlanEvaluation;
};

/** The window: a group's last `size` pulls (blank = PLAN_WINDOW_DEFAULT), clamped as in the header. */
export function planWindow<T>(perPull: T[], size?: number): T[] {
  const n = Math.max(PLAN_MIN_PULLS, Math.min(perPull.length, size ?? PLAN_WINDOW_DEFAULT));
  return perPull.slice(-n);
}

/**
 * The party problem over `window` (see header). `allHits` is every loaded
 * pull's hits, for shield size estimates. `only` narrows the entries
 * (scripts/check-optimizer-example.js).
 */
export function partySetup(window: WindowPull[], allHits: MitigationHit[][], game: MitigationGame, reach?: DebuffReach,
  only?: (entry: CatalogEntry, player: PlayerInfo) => boolean): PartySetup {
  const rows = aggregateMitigation(window, game, reach);
  const anchors = rows.filter((r) => !r.rare && r.pulls >= PLAN_MIN_PULLS && !r.byPull.every((b) => b.hit.tankOnly))
    .sort((a, b) => a.medianMs - b.medianMs);
  const classes = new Map(anchors.map((r) => [r.id, classifyHit(r)]));
  const planned = (id: string) => classes.get(id) === "plan";
  const shieldSizes = medianShieldSizes(allHits, game);
  const cap = (x: number) => Math.min(x, MARGIN_UNDER);
  let freeMode = false;
  let baseEv: PlanEvaluation | undefined;
  // Headroom a plan takes off hits (median and worst pull, summed), so a
  // free extra use beats moving a cast that is needed where it is.
  const spent = (ev: PlanEvaluation) => {
    let s = 0;
    if (!baseEv) return s;
    for (const [id, b] of baseEv.hits) {
      const e = ev.hits.get(id)!;
      s += Math.max(0, b.median - e.median) + Math.max(0, b.worst - e.worst);
    }
    return s;
  };
  const problem: OptimizerProblem = {
    game, reach, window, anchors, shieldSizes, maxChanges: PLAN_MAX_CHANGES, freeShifts: false,
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
      return [-fail, failSum, -tight, tightSum, freeMode ? ev.freedom : 0, -ev.changes.length, -spent(ev)];
    },
    constraint: (base, ev) => {
      for (const [id, b] of base.hits) {
        const e = ev.hits.get(id)!;
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
  const { ctxs, baseline } = prepareProblem(problem);
  const base = evaluatePlan(problem, ctxs, []);
  baseEv = base;
  freeMode = !anchors.some((r) => problem.needsHelp(base, r.id));
  problem.freeShifts = freeMode;
  return { problem, anchors, classes, ctxs, baseline, base };
}

/** Failing (fail or under on the median) and tight counts over the planned hits. */
export function countIssues(classes: Map<string, HitClass>, ev: PlanEvaluation): Counts {
  let f = 0;
  let t = 0;
  for (const [id, e] of ev.hits) {
    if (classes.get(id) !== "plan") continue;
    if (failing(e)) f++;
    else if (e.tight) t++;
  }
  return { failing: f, tight: t };
}

function refOf(row: AggregatedHit): HitRef {
  return { id: row.id, name: row.abilityName, occurrence: row.occurrence, phase: row.phase, medianMs: row.medianMs };
}

/**
 * The Analysis: the best plan within the change budget over the window
 * (planWindow), grouped for display. `allHits` is every loaded pull's hits
 * of the group, for shield size estimates.
 */
export function buildMitigationPlan(window: WindowPull[], allHits: MitigationHit[][], game: MitigationGame, reach?: DebuffReach,
  only?: (entry: CatalogEntry, player: PlayerInfo) => boolean): OptimizedPlan {
  const setup = partySetup(window, allHits, game, reach, only);
  const { problem, anchors, ctxs, classes, base } = setup;
  const result = searchPlan(problem, ctxs, setup.baseline);
  const best = result.best;
  const rowOf = new Map(anchors.map((r) => [r.id, r]));
  const jobOf = new Map(window.flatMap((w) => w.pull.players.map((p) => [p.name, p.className] as const)));
  const entryOf = new Map(game.catalog.map((e) => [e.key, e]));
  const side = (e: HitEstimate): HitSide => ({ median: e.median, worst: e.worst, verdict: e.verdict, tight: e.tight });

  const groups = groupChanges(problem, ctxs, best.changes, base).map((group): PlanGroup => {
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
    const hits: HitOutcome[] = anchors
      .filter((r) => {
        const a = alone.hits.get(r.id);
        const b = base.hits.get(r.id);
        return a && b && (Math.abs(a.median - b.median) > 1e-9 || Math.abs(a.worst - b.worst) > 1e-9);
      })
      .map((r) => ({ hit: refOf(r), before: side(base.hits.get(r.id)!), after: side(best.hits.get(r.id)!) }));
    const fixes = hits.some((h) => problem.needsHelp(base, h.hit.id)
      && (h.after.median > h.before.median + 1e-9 || h.after.worst > h.before.worst + 1e-9));
    return { purpose: fixes ? "fix" : "free", changes, hits };
  });

  const notMitigation = anchors.filter((r) => classes.get(r.id) !== "plan" && failing(base.hits.get(r.id)!)).map(refOf);
  const unfixed = anchors
    .filter((r) => classes.get(r.id) === "plan" && (failing(best.hits.get(r.id)!) || best.hits.get(r.id)!.tight))
    .map(refOf);
  return {
    windowPulls: window.map((w) => w.pull.id),
    summary: { before: countIssues(classes, base), after: countIssues(classes, best) },
    groups, notMitigation, unfixed, evaluated: result.evaluated,
  };
}
