// lib/mitigation/tanking-plan.ts
//
// The Tanking view's optimizer (docs/tanking-panel-plan.md, "The
// optimizer"): the tank problem handed to the generic engine (optimize.ts),
// and the TankingPlan the view shows. Same plan model, window
// (plan.ts planWindow), legality, beam search and change budget as the
// party Analysis (plan.ts); only the anchors, eligible entries, objective
// and constraint differ. Every amount is a fraction of the tank's max HP.
//
// ── Anchors (each a synthetic MitigationHit per window pull) ───────────
//   - busters (tanking.ts aggregateBusters), not rare. Each tank hit is one target judged
//     from FULL HP: its parts are the buster's own plus all of that tank's
//     enemy damage in the next FOLLOW_UP_MS, so a margin is exactly the
//     tanking.ts margin and a change's effect follows the plan's buster
//     check. A tank under an invuln is left out (judged).
//   - heavy windows: per tank and per duration D of their eligible
//     cooldowns, the HEAVY_WINDOWS_PER_DURATION start times maximizing the
//     median (over window pulls the tank lived through) of their damage
//     before shields in [s, s + D − CAST_LEAD_MS] (what a cast placed
//     CAST_LEAD_MS before s covers), at least HEAVY_MIN, overlapping no
//     buster's check window and no window already taken for that tank.
//     Longer D first. Ids: `autos|<tank>|<start s>|<D s>`.
// Buster classes: "mechanic" when the median margin is below
// TANK_MECHANIC_MARGIN (a bait or overlap failure: Deep Impact hitting a
// non-tank's spot, Plummet towers left empty): listed, never changed and
// never made worse. "protect" when reached in fewer than PLAN_MIN_PULLS
// window pulls: not planned, but never made worse, so a cooldown isn't
// spent just before a buster the group is only starting to reach (Vamp
// A9-A13: a Rampart on autos ending 5s before Hardcore #2; builder's
// choice, user, 2026-10-11). Otherwise "plan".
//
// ── Eligible entries ────────────────────────────────────────────────────
// Tank jobs' own cooldowns of 30s+ (DROP_MIN_COOLDOWN_MS): Rampart, the
// 40% ones, Camouflage, Dark Mind, Oblation (self or cast on the co-tank).
// Not Bulwark: its block is outside FFLogs' multiplier, so it has no value
// to move. Short cooldowns (tanking.ts SHORT_COOLDOWNS) are assumed pressed
// on cooldown and never placed. Party mitigation and healer single-target
// mitigation are counted where logged but never moved. A self cooldown
// goes only to anchors where its tank is hit (Alice's Rampart did nothing
// on Kade's autos). Invulns: only added (a removed invuln can't be rebuilt
// from the log: Hallowed Ground logs 0), only onto a buster that is
// failing or tight in the baseline and not shared (plan: shared busters
// aren't re-planned around invulns yet), and only by a tank who is under
// TANK_MARGIN_UNDER on it in some window pull: another tank's invuln just
// hides damage the healers then have to heal (Living Dead leaves 1 HP).
//
// ── Window ─────────────────────────────────────────────────────────────
// plan.ts planWindow over the pulls whose tanks played the latest pull's
// jobs (tankWindow). A dual buster taken as an overlap (tanking.ts
// Buster.overlap) is left out of that pull: a mechanic failure.
// A cast placed by a change reduces only the parts inside its duration
// (OptimizerProblem.coverParts). A target-reach entry goes to the lowest
// tank on the anchor, as in the Analysis.
//
// ── Objective, first difference wins ───────────────────────────────────
//   1. fewer failing busters (median fail or under); ties: higher sum of
//      median margins capped at TANK_MARGIN_UNDER
//   2. fewer tight busters (median good+, worst pull under); ties: higher
//      sum of worst-pull margins, capped
//   3. less tank damage: the anchors' damage, summed over both tanks and
//      averaged over the window pulls, plus TANK_CHANGE_COST per change
//      (a change must buy at least that much to be worth a raid lead's
//      attention)
//   4. lower invuln cost (INVULN_COST: Hallowed Ground low; Holmgang,
//      Living Dead and Superbolide hand the healers a near-dead tank)
//   5. fewer changes
// Hard constraint: a plan buster passing in the baseline (good or over on
// the median) stays at least TANK_MARGIN_UNDER on the median and its worst
// pull at least TANK_MARGIN_UNDER (or no lower than it was); no new
// deaths; a mechanic buster gets no worse.
//
// ── Working together ───────────────────────────────────────────────────
// The engine's groups become cards. A card is "together" when it names
// both tanks: changes by both, or a cooldown one tank casts on the other.
// Each change names its receiver for a target-reach cooldown. A move from
// A to B plus an add back on A is shown as one add on B.

import type { Pull } from "@/types/Pull";
import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type {
  ActiveMitigation, CatalogEntry, HitPart, HitTarget, MitigationGame, MitigationHit,
} from "./types";
import { DROP_MIN_COOLDOWN_MS, SNAPSHOT_SLACK_MS, judged, playerCasts } from "./analyze";
import {
  CAST_LEAD_MS, evaluatePlan, groupChanges, prepareProblem, searchPlan,
  type Change, type HitEstimate, type OptimizerProblem, type PlanEvaluation,
} from "./optimize";
import { PLAN_MAX_CHANGES, PLAN_MIN_PULLS, planWindow } from "./plan";
import {
  FOLLOW_UP_MS, SHORT_COOLDOWNS, TANK_MARGIN_UNDER, aggregateBusters,
  type AggregatedBuster, type BusterKind, type PullTanking, type TankStream,
} from "./tanking";

// Tunables: chosen by the builder, not yet confirmed (docs/open-items.md).
export const HEAVY_WINDOWS_PER_DURATION = 3;
export const HEAVY_MIN = 0.3;
export const TANK_CHANGE_COST = 0.10;
export const TANK_MECHANIC_MARGIN = -0.5;
export const INVULN_COST: Record<string, number> = {
  "hallowed-ground": 0.5, "holmgang": 1, "living-dead": 1, "superbolide": 1,
};
const SAME_HIT_MS = 100;

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// ── Types ──────────────────────────────────────────────────────────────

export type BusterClass = "plan" | "mechanic" | "protect";

export type TankWindowPull = {
  pull: Pull; pullId: number; pullNumber: number; durationMs: number;
  hits: MitigationHit[]; tanking: PullTanking;
};

export type AnchorRef = {
  id:       string;
  kind:     "buster" | "autos";
  name:     string;        // "Hardcore #2", or "autos" for a heavy window
  medianMs: number;
  endMs?:   number;        // a heavy window's end
  tank?:    string;        // a heavy window's tank
  busterKind?: BusterKind;
};

export type TankChange = {
  kind:     "move" | "add";
  player:   string;
  job:      string;
  key:      string;
  name:     string;
  from?:    AnchorRef;
  to:       AnchorRef;
  receiver?: string;       // a target-reach cooldown cast on someone (Oblation on the co-tank)
  invuln:   boolean;
  legal:    number;
  pulls:    number;
};

export type BusterSide = { median: number; worst: number; failing: boolean; tight: boolean };
export type BusterOutcome = { buster: AnchorRef; before: BusterSide; after: BusterSide };

export type TankPlanGroup = {
  together: boolean;
  changes:  TankChange[];
  busters:  BusterOutcome[];
  damage:   { before: number; after: number };  // this group alone, summed over the anchors it touches
};

export type TankCounts = { failing: number; tight: number; damage: number };

export type TankingPlan = {
  windowPulls: number[];
  summary:     { before: TankCounts; after: TankCounts };
  groups:      TankPlanGroup[];
  mechanic:    AnchorRef[];  // busters failing as mechanics: listed, never changed
  unfixed:     AnchorRef[];  // failing or tight plan busters left so
  anchors:     AnchorRef[];  // every anchor, by time
  evaluated:   number;
};

// ── Window ─────────────────────────────────────────────────────────────

/**
 * The window (plan.ts planWindow) over the group's pulls whose tanks played
 * the jobs they play in the latest one: advice is for the current jobs
 * (Vamp Fatale A4-A6 had Kade on Gunbreaker, A7-A8 on Paladin). Empty
 * when fewer than PLAN_MIN_PULLS match.
 */
export function tankWindow<T extends { pull: Pull }>(perPull: T[], size?: number): T[] {
  const jobs = (p: Pull) => p.players.filter((x) => x.role === "Tank").map((x) => `${x.name}:${x.className}`).sort().join("|");
  const last = perPull[perPull.length - 1];
  if (!last) return [];
  const same = perPull.filter((p) => jobs(p.pull) === jobs(last.pull));
  return same.length < PLAN_MIN_PULLS ? [] : planWindow(same, size);
}

/** The window's median pull by total tank damage: the one the lanes show in all-pulls mode. */
export function medianTankPull<T extends { tanking: PullTanking }>(window: T[]): T | undefined {
  const total = (w: T) => w.tanking.tanks.reduce((s, t) => s + t.events.reduce((a, e) => a + e.taken, 0), 0);
  const sorted = [...window].sort((a, b) => total(a) - total(b));
  return sorted[Math.floor(sorted.length / 2)];
}

// ── Eligibility ────────────────────────────────────────────────────────

const TANK_JOBS = new Set(["Paladin", "Warrior", "Dark Knight", "Gunbreaker"]);

/** A tank cooldown the Tanking view may move or add (see header). */
export function tankEligible(entry: CatalogEntry): boolean {
  if (!entry.jobs.some((j) => TANK_JOBS.has(j)) || entry.jobs.length > 4) return false;
  if (entry.reach === "party" || entry.inSheet === false || entry.kind === "limitBreak") return false;
  if (SHORT_COOLDOWNS.includes(entry.key)) return false;
  if (entry.kind === "invuln") return true;
  if (!entry.statuses.some((s) => s.shield || s.physical > 0 || s.magical > 0)) return false;  // Bulwark
  return entry.cooldownMs >= DROP_MIN_COOLDOWN_MS;
}

// ── Synthetic anchor hits ──────────────────────────────────────────────

/** One tank's enemy damage events in [from, to], as the stream counts them (invuln-covered at 0). */
function eventsIn(player: PlayerInfo, stream: TankStream, from: number, to: number): HitPart[] {
  const parts: HitPart[] = [];
  for (const te of stream.events) {
    if (te.timestampMs < from || te.timestampMs > to) continue;
    const max = stream.maxHealth;
    parts.push({
      abilityName: te.abilityName, source: te.source, timestampMs: te.timestampMs,
      damage: te.taken * max, absorbed: te.absorbed * max, healthAfter: 0,
      column: te.column, statusIds: te.statusIds,
      shieldAbsorbs: (player.shieldAbsorbs ?? [])
        .filter((a) => a.amount > 0 && Math.abs(a.timestamp - te.timestampMs) <= SAME_HIT_MS)
        .map((a) => ({ statusId: a.statusId, caster: a.caster, amount: a.amount })),
    });
  }
  return parts;
}

function target(player: PlayerInfo, stream: TankStream, parts: HitPart[],
  flags: { died?: boolean; vulnerable?: boolean; invulnerable?: boolean }): HitTarget {
  const max = stream.maxHealth;
  const damage = parts.reduce((s, p) => s + p.damage, 0);
  return {
    player: player.name, job: player.className, tank: true, maxHealth: max, healthBefore: max,
    healthAfter: max - damage, damage, absorbed: parts.reduce((s, p) => s + p.absorbed, 0),
    catalogProduct: 1, consistent: true, parts, margin: (max - damage) / max, laterDrop: 0,
    died: !!flags.died, vulnerable: !!flags.vulnerable, invulnerable: !!flags.invulnerable,
    statusIds: [...new Set(parts.flatMap((p) => p.statusIds))],
    shieldAbsorbs: parts.flatMap((p) => p.shieldAbsorbs),
  };
}

/** Who had each catalog entry up on the targets' parts: shields by their absorbs, the rest by casts. */
function activeOn(pull: Pull, targets: HitTarget[], game: MitigationGame, startMs: number, endMs: number): ActiveMitigation[] {
  const byKey = new Map<string, ActiveMitigation>();
  for (const t of targets) {
    const keys = new Set<string>();
    for (const p of t.parts) for (const id of p.statusIds) {
      const s = game.statusIndex.get(id);
      if (s && (s.status.shield || s.status.physical > 0 || s.status.magical > 0)) keys.add(s.entry.key);
    }
    for (const key of keys) {
      const entry = game.catalog.find((e) => e.key === key)!;
      const a = byKey.get(key) ?? { key, name: entry.name, kind: entry.kind, casters: [], targets: 0 };
      a.targets++;
      for (const abs of t.shieldAbsorbs) {
        if (entry.statuses.some((s) => s.id === abs.statusId) && abs.caster && !a.casters.includes(abs.caster)) a.casters.push(abs.caster);
      }
      byKey.set(key, a);
    }
  }
  for (const a of byKey.values()) {
    if (a.casters.length) continue;
    const entry = game.catalog.find((e) => e.key === a.key)!;
    for (const p of pull.players) {
      if (!entry.jobs.includes(p.className)) continue;
      if (playerCasts(p, entry).some((t) => t <= endMs + SAME_HIT_MS && startMs - t <= entry.durationMs + SNAPSHOT_SLACK_MS)) a.casters.push(p.name);
    }
  }
  return [...byKey.values()];
}

function syntheticHit(pull: Pull, game: MitigationGame, id: string, name: string, startMs: number, endMs: number,
  targets: HitTarget[], occurrence: number): MitigationHit {
  const pool = judged(targets);
  const margin = pool.length ? Math.min(...pool.map((t) => t.margin)) : 1;
  const first = targets.flatMap((t) => t.parts)[0];
  return {
    id, abilityId: 0, abilityName: name, abilityNames: [name], occurrence, timestampMs: startMs, endMs,
    damageColumn: first?.column, sequenceId: 0, waves: 1, tankOnly: true, targets,
    active: activeOn(pull, targets, game, startMs, endMs), players: [],
    totalDamage: targets.reduce((s, t) => s + t.damage, 0), takenDamage: 0, absorbedDamage: 0,
    lowestBefore: 1, margin, sequenceMargin: margin,
    deaths: targets.filter((t) => t.died).length, cleanDeaths: targets.filter((t) => t.died && !t.vulnerable).length,
    verdict: "good", droppable: { keys: [], names: [], worstMargin: margin, alternatives: [], candidates: 0 }, note: "",
  };
}

function busterHit(wp: TankWindowPull, game: MitigationGame, row: AggregatedBuster): MitigationHit | undefined {
  const b = row.byPull.find((x) => x.pullId === wp.pullId)?.buster;
  if (!b || b.overlap) return undefined;  // a mechanic failure, not a plan to fix
  const targets: HitTarget[] = [];
  for (const bt of b.tanks) {
    const player = wp.pull.players.find((p) => p.name === bt.player);
    const stream = wp.tanking.tanks.find((s) => s.player === bt.player);
    if (!player || !stream) continue;
    const mine = stream.events.filter((e) => e.busterId === b.id);
    const from = mine[0]?.timestampMs ?? b.timestampMs;
    const to = (mine[mine.length - 1]?.timestampMs ?? b.endMs) + FOLLOW_UP_MS;
    // The follow-up rule of tanking.ts: a single event bigger than the bar is a failed mechanic.
    const parts = eventsIn(player, stream, from, to).filter((p) => p.damage < stream.maxHealth);
    targets.push(target(player, stream, parts, { died: bt.died, vulnerable: bt.vulnerable, invulnerable: !!bt.invuln }));
  }
  return syntheticHit(wp.pull, game, b.id, b.abilityName, b.timestampMs, b.endMs, targets, b.occurrence);
}

// ── Heavy windows ──────────────────────────────────────────────────────

type HeavyWindow = { id: string; tank: string; startMs: number; endMs: number; score: number };

function heavyWindows(window: TankWindowPull[], busters: AggregatedBuster[], game: MitigationGame): HeavyWindow[] {
  const out: HeavyWindow[] = [];
  const tanks = [...new Set(window.flatMap((w) => w.tanking.tanks.map((s) => s.player)))];
  const busterZones = busters.map((b) => {
    const ends = b.byPull.map((x) => x.buster.endMs - x.buster.timestampMs);
    return { start: b.medianMs, end: b.medianMs + median(ends) + FOLLOW_UP_MS };
  });
  for (const tank of tanks) {
    const job = window.flatMap((w) => w.pull.players).find((p) => p.name === tank)?.className;
    const durations = [...new Set(game.catalog
      .filter((e) => job && e.jobs.includes(job) && tankEligible(e) && e.kind !== "invuln")
      .map((e) => e.durationMs))].sort((a, b) => b - a);
    const taken: HeavyWindow[] = [];
    for (const d of durations) {
      const span = d - CAST_LEAD_MS;
      const scores: { s: number; score: number }[] = [];
      const longest = Math.max(...window.map((w) => w.durationMs));
      for (let s = 0; s + span <= longest; s += 1000) {
        const vals: number[] = [];
        for (const w of window) {
          if (w.durationMs < s + span) continue;
          const stream = w.tanking.tanks.find((x) => x.player === tank);
          if (!stream) continue;
          if (w.pull.deathEvents.some((x) => x.player === tank && x.timestamp <= s + span)) continue;
          vals.push(stream.events.filter((e) => e.timestampMs >= s && e.timestampMs <= s + span)
            .reduce((sum, e) => sum + e.taken + e.absorbed, 0));
        }
        if (vals.length >= PLAN_MIN_PULLS) scores.push({ s, score: median(vals) });
      }
      scores.sort((a, b) => b.score - a.score);
      let picked = 0;
      for (const { s, score } of scores) {
        if (picked >= HEAVY_WINDOWS_PER_DURATION || score < HEAVY_MIN) break;
        const end = s + span;
        const overlaps = (a: number, b: number) => s < b && end > a;
        if (busterZones.some((z) => overlaps(z.start - CAST_LEAD_MS, z.end))) continue;
        if (taken.some((w) => overlaps(w.startMs, w.endMs))) continue;
        const w = { id: `autos|${tank}|${s / 1000}|${d / 1000}`, tank, startMs: s, endMs: end, score };
        taken.push(w);
        picked++;
      }
    }
    out.push(...taken);
  }
  return out.sort((a, b) => a.startMs - b.startMs);
}

function heavyHit(wp: TankWindowPull, game: MitigationGame, w: HeavyWindow): MitigationHit | undefined {
  if (wp.durationMs < w.endMs) return undefined;
  const player = wp.pull.players.find((p) => p.name === w.tank);
  const stream = wp.tanking.tanks.find((s) => s.player === w.tank);
  if (!player || !stream) return undefined;
  if (wp.pull.deathEvents.some((x) => x.player === w.tank && x.timestamp <= w.endMs && x.timestamp >= w.startMs - FOLLOW_UP_MS)) return undefined;
  const parts = eventsIn(player, stream, w.startMs, w.endMs);
  return syntheticHit(wp.pull, game, w.id, "autos", w.startMs, w.endMs, [target(player, stream, parts, {})], 1);
}

// ── Setup ──────────────────────────────────────────────────────────────

export type TankSetup = {
  problem:  OptimizerProblem;
  refs:     Map<string, AnchorRef>;
  classes:  Map<string, BusterClass>;
  ctxs:     ReturnType<typeof prepareProblem>["ctxs"];
  baseline: ReturnType<typeof prepareProblem>["baseline"];
  base:     PlanEvaluation;
};

const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;

/** The tank problem over `window` (see header). `only` narrows the entries (scripts/check-tanking-example.js). */
export function tankSetup(window: TankWindowPull[], game: MitigationGame,
  only?: (entry: CatalogEntry, player: PlayerInfo) => boolean): TankSetup {
  const rows = aggregateBusters(window.map((w) => ({ pullId: w.pullId, pullNumber: w.pullNumber, durationMs: w.durationMs, tanking: w.tanking })));
  const busters = rows.filter((r) => !r.rare);
  const heavy = heavyWindows(window, rows, game);

  const refs = new Map<string, AnchorRef>();
  for (const r of busters) refs.set(r.id, { id: r.id, kind: "buster", name: `${r.abilityName} #${r.occurrence}`, medianMs: r.medianMs, busterKind: r.kind });
  for (const w of heavy) refs.set(w.id, { id: w.id, kind: "autos", name: `autos ${mmss(w.startMs)}–${mmss(w.endMs)}`, medianMs: w.startMs, endMs: w.endMs, tank: w.tank });

  const engineWindow = window.map((wp) => ({
    pull: wp.pull,
    hits: [
      ...busters.map((r) => busterHit(wp, game, r)),
      ...heavy.map((w) => heavyHit(wp, game, w)),
    ].filter((h): h is MitigationHit => !!h),
  }));
  const anchors = [...refs.values()].map((r) => ({
    id: r.id, medianMs: r.medianMs, pulls: engineWindow.filter((w) => w.hits.some((h) => h.id === r.id)).length,
  })).filter((a) => a.pulls > 0).sort((a, b) => a.medianMs - b.medianMs);

  const hitTanks = new Map<string, Set<string>>();
  for (const w of engineWindow) for (const h of w.hits) {
    const set = hitTanks.get(h.id) ?? new Set<string>();
    for (const t of h.targets) set.add(t.player);
    hitTanks.set(h.id, set);
  }

  const classes = new Map<string, BusterClass>();
  for (const r of busters) {
    classes.set(r.id, r.medianMargin !== undefined && r.medianMargin < TANK_MECHANIC_MARGIN ? "mechanic"
      : r.pulls < PLAN_MIN_PULLS ? "protect" : "plan");
  }
  const isBuster = (id: string) => refs.get(id)?.kind === "buster";
  const planned = (id: string) => classes.get(id) === "plan";
  const failing = (e: HitEstimate) => e.median < TANK_MARGIN_UNDER || e.verdict === "fail";
  const tight = (e: HitEstimate) => !failing(e) && e.worst < TANK_MARGIN_UNDER;
  const entryOf = new Map(game.catalog.map((e) => [e.key, e]));
  const cap = (x: number) => Math.min(x, TANK_MARGIN_UNDER);
  // Per buster needing help, the tanks under TANK_MARGIN_UNDER on it in
  // at least one window pull: the only ones an added invuln may be for
  // (another tank's invuln only hides damage the healers then take).
  const lowAtBase = new Map<string, Set<string>>();

  const problem: OptimizerProblem = {
    game, window: engineWindow, anchors, shieldSizes: new Map(), maxChanges: PLAN_MAX_CHANGES, freeShifts: false, coverParts: true,
    eligible: (entry, player) => tankEligible(entry) && (!only || only(entry, player)),
    canAdd:   (entry) => !entry.statuses.some((s) => s.shield) || entry.shieldPctMaxHp !== undefined || entry.kind === "invuln",
    allowChange: (ch) => {
      const entry = entryOf.get(ch.key)!;
      // A self cooldown only where its tank is hit.
      if (entry.reach === "self" && !hitTanks.get(ch.to)?.has(ch.player)) return false;
      if (entry.kind !== "invuln") return true;
      const ref = refs.get(ch.to);
      return ch.kind === "add" && !!ref && ref.kind === "buster" && !!lowAtBase.get(ch.to)?.has(ch.player)
        && ref.busterKind !== "shared" && ref.busterKind !== "solo";
    },
    objective: (ev) => {
      let fail = 0, failSum = 0, tightN = 0, tightSum = 0, damage = 0, invuln = 0;
      for (const [id, e] of ev.hits) {
        damage += e.damage;
        if (!isBuster(id) || !planned(id)) continue;
        if (failing(e)) fail++;
        else if (tight(e)) tightN++;
        failSum += cap(e.median);
        tightSum += cap(e.worst);
      }
      for (const ch of ev.changes) invuln += INVULN_COST[ch.key] ?? 0;
      return [-fail, failSum, -tightN, tightSum, -(damage + ev.changes.length * TANK_CHANGE_COST), -invuln, -ev.changes.length];
    },
    constraint: (base, ev) => {
      for (const [id, b] of base.hits) {
        if (!isBuster(id)) continue;
        const e = ev.hits.get(id)!;
        if (!planned(id)) {
          if (e.median < b.median - 1e-9 || e.worst < b.worst - 1e-9) return false;
          continue;
        }
        if (e.verdict === "fail" && b.verdict !== "fail") return false;
        if (failing(b)) continue;
        if (e.median < TANK_MARGIN_UNDER - 1e-9) return false;
        if (e.worst < Math.min(TANK_MARGIN_UNDER, b.worst) - 1e-9) return false;
      }
      return true;
    },
    needsHelp: (ev, id) => {
      if (!isBuster(id)) return true;  // heavy windows: where freed cooldowns can go
      const e = ev.hits.get(id);
      return !!e && planned(id) && (failing(e) || tight(e));
    },
  };
  const { ctxs, baseline } = prepareProblem(problem);
  const base = evaluatePlan(problem, ctxs, []);
  for (const a of anchors) {
    if (!isBuster(a.id) || !problem.needsHelp(base, a.id)) continue;
    const low = new Set<string>();
    for (const w of engineWindow) {
      const hit = w.hits.find((h) => h.id === a.id);
      for (const t of hit ? judged(hit.targets) : []) if (t.margin < TANK_MARGIN_UNDER) low.add(t.player);
    }
    lowAtBase.set(a.id, low);
  }
  return { problem, refs, classes, ctxs, baseline, base };
}

// ── The plan ───────────────────────────────────────────────────────────

/** Who a target-reach cooldown lands on at an anchor: its tank (autos), or the lowest tank in most window pulls. */
function receiverAt(setup: TankSetup, anchorId: string): string | undefined {
  const ref = setup.refs.get(anchorId);
  if (ref?.kind === "autos") return ref.tank;
  const counts = new Map<string, number>();
  for (const ctx of setup.ctxs) {
    const hit = ctx.hitIx.get(anchorId);
    const pool = hit ? judged(hit.targets) : [];
    if (!pool.length) continue;
    const lowest = pool.reduce((a, b) => (b.margin < a.margin ? b : a)).player;
    counts.set(lowest, (counts.get(lowest) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
}

function counts(setup: TankSetup, ev: PlanEvaluation): TankCounts {
  let failing = 0, tight = 0, damage = 0;
  for (const [id, e] of ev.hits) {
    damage += e.damage;
    if (setup.refs.get(id)?.kind !== "buster" || setup.classes.get(id) !== "plan") continue;
    if (e.median < TANK_MARGIN_UNDER || e.verdict === "fail") failing++;
    else if (e.worst < TANK_MARGIN_UNDER) tight++;
  }
  return { failing, tight, damage };
}

const side = (e: HitEstimate): BusterSide => ({
  median: e.median, worst: e.worst,
  failing: e.median < TANK_MARGIN_UNDER || e.verdict === "fail",
  tight: e.median >= TANK_MARGIN_UNDER && e.verdict !== "fail" && e.worst < TANK_MARGIN_UNDER,
});

/** The Tanking view's plan over the window (plan.ts planWindow). */
export function buildTankingPlan(window: TankWindowPull[], game: MitigationGame,
  only?: (entry: CatalogEntry, player: PlayerInfo) => boolean): TankingPlan {
  const setup = tankSetup(window, game, only);
  const { problem, ctxs, base, refs } = setup;
  const result = searchPlan(problem, ctxs, setup.baseline);
  const best = result.best;
  const jobOf = new Map(window.flatMap((w) => w.pull.players.map((p) => [p.name, p.className] as const)));
  const entryOf = new Map(game.catalog.map((e) => [e.key, e]));

  const groups = groupChanges(problem, ctxs, best.changes, base).map((group): TankPlanGroup => {
    // "Move X from A to B" plus "add X on A" is one instruction: X on B too.
    const shown = group.flatMap((c: Change): Change[] => {
      if (c.kind === "add" && group.some((m) => m.kind === "move" && m.player === c.player && m.key === c.key && m.from === c.to)) return [];
      if (c.kind === "move" && group.some((a) => a.kind === "add" && a.player === c.player && a.key === c.key && a.to === c.from)) {
        return [{ kind: "add", player: c.player, key: c.key, to: c.to }];
      }
      return [c];
    });
    const changes: TankChange[] = shown.map((c: Change) => {
      const i = Math.max(0, best.changes.findIndex((b) => b.player === c.player && b.key === c.key && b.to === c.to));
      const entry = entryOf.get(c.key)!;
      const receiver = entry.reach === "target" ? receiverAt(setup, c.to) : undefined;
      return {
        kind: c.kind, player: c.player, job: jobOf.get(c.player) ?? "", key: c.key, name: entry.name,
        from: c.kind === "move" ? refs.get(c.from) : undefined, to: refs.get(c.to)!,
        receiver: receiver && receiver !== c.player ? receiver : undefined,
        invuln: entry.kind === "invuln", legal: best.legal[i].legal, pulls: best.legal[i].pulls,
      };
    });
    const alone = evaluatePlan(problem, ctxs, group);
    const touched = [...base.hits.keys()].filter((id) => {
      const a = alone.hits.get(id)!;
      const b = base.hits.get(id)!;
      return Math.abs(a.median - b.median) > 1e-9 || Math.abs(a.worst - b.worst) > 1e-9 || Math.abs(a.damage - b.damage) > 1e-9;
    });
    const busters = touched.filter((id) => refs.get(id)!.kind === "buster")
      .filter((id) => Math.abs(alone.hits.get(id)!.median - base.hits.get(id)!.median) > 1e-9
        || Math.abs(alone.hits.get(id)!.worst - base.hits.get(id)!.worst) > 1e-9)
      .map((id) => ({ buster: refs.get(id)!, before: side(base.hits.get(id)!), after: side(alone.hits.get(id)!) }));
    const names = new Set(changes.flatMap((c) => [c.player, ...(c.receiver ? [c.receiver] : [])]));
    return {
      together: names.size > 1, changes, busters,
      damage: {
        before: touched.reduce((s, id) => s + base.hits.get(id)!.damage, 0),
        after: touched.reduce((s, id) => s + alone.hits.get(id)!.damage, 0),
      },
    };
  });

  const busterRefs = [...refs.values()].filter((r) => r.kind === "buster" && base.hits.has(r.id));
  const failingOrTight = (e: HitEstimate) => side(e).failing || side(e).tight;
  return {
    windowPulls: window.map((w) => w.pull.id),
    summary: { before: counts(setup, base), after: counts(setup, best) },
    groups,
    mechanic: busterRefs.filter((r) => setup.classes.get(r.id) === "mechanic"),
    unfixed: busterRefs.filter((r) => setup.classes.get(r.id) === "plan" && failingOrTight(best.hits.get(r.id)!)),
    anchors: [...refs.values()].filter((r) => base.hits.has(r.id)).sort((a, b) => a.medianMs - b.medianMs),
    evaluated: result.evaluated,
  };
}
