// lib/mitigation/plan.ts
//
// The Mitigation dialog's Analysis view (named Plan until 2026-10-09): a short list of changes for the raid
// lead, read from the cross-pull aggregate (aggregate.ts). The timeline
// shows every hit; this picks the few that need something and pairs each
// with one fix (user-approved design, 2026-10-09).
//
// ── What gets listed ───────────────────────────────────────────────────
// Hits reached in PLAN_MIN_PULLS+ pulls and not rare:
//   - short: the median verdict is under, or fail with deaths from full
//     health (a mitigation death).
//   - tight: good on the median, but the worst pull ended under
//     MARGIN_UNDER. Planned after every short hit.
//   - healing: fail, every clean death from low health before the hit.
//     Listed, never given a mitigation change.
//   - mechanic: short by more than MECHANIC_MARGIN. Listed, never given a
//     mitigation change.
//   - spare: over, with a droppable set left after the plan's moves
//     (situational entries left out). Information only, never an
//     instruction.
//
// ── One change per hit ─────────────────────────────────────────────────
// For a short or tight hit, every party mitigation in the roster that would
// reach it (tank cooldowns too on a tank buster; shields only on
// unaspected damage; never a gated or situational one, such as Passage of
// Arms) is tried two ways:
//   - add: cast it at the hit. Fits a pull when it isn't already on the
//     hit, the player is alive, and the cast breaks no later cast's
//     cooldown (the same test as "free" in analyze.ts).
//   - move: take the player's cast off a spare hit whose droppable set
//     holds it, and cast it at this hit instead. Fits a pull when the
//     player cast it on the spare hit, the moved cast list is still legal,
//     and every hit that cast covered stays good without it (after the
//     damage-roll buffer, and with what the plan already took off them).
// A change needs to fit in at least half the hit's pulls. The best one
// lifts the hit's estimated lowest HP to good (the median on a short hit,
// the worst pull on a tight one); add beats move (it costs nothing
// elsewhere); then the higher estimate wins. A short hit takes the best
// change even if it stays short; a tight hit only one that fixes it.
//
// ── Coordinated, not per player ────────────────────────────────────────
// Changes are applied one after another to simulated cast lists, so two
// changes never spend the same cooldown, and what a move takes off a hit
// counts against that hit's next check. At most PLAN_MAX_CHANGES changes:
// a group that changes everything at once over-corrects. Later short hits
// are listed without a change, to re-check after the first round.
//
// ── Estimates ──────────────────────────────────────────────────────────
// An added % mitigation scales each reached target's logged damage before
// shields; an added shield subtracts the median per-target absorb that
// shield logged elsewhere in these pulls (its capacity isn't logged; no
// estimate when it never absorbed anything). These are estimates from the
// log, shown as such.

import type { Pull } from "@/types/Pull";
import type { PlayerInfo } from "@/types/PlayerInfo";
import type { CatalogEntry, HitVerdict, MitigationGame, MitigationHit } from "./types";
import type { AggregatedHit } from "./aggregate";
import {
  DAMAGE_ROLL_BUFFER, DROP_MIN_COOLDOWN_MS, MARGIN_UNDER, SNAPSHOT_SLACK_MS,
  isDeadOrFreshlyRevived, judged, lowestWithAdded, marginWithout, playerCasts, simulateCharges,
} from "./analyze";

export const PLAN_MIN_PULLS = 3;
export const PLAN_MAX_CHANGES = 3;
// A short hit whose median lowest player ends below this (overkill of half
// a health bar) is a mechanic failure, not something one more mitigation
// covers: Red Hot and Deep Blue's Plunging Snap #3 at -674%.
export const MECHANIC_MARGIN = -0.5;
const SAME_HIT_MS = 100;

export type PlanHitRef = {
  id:           string;
  name:         string;
  occurrence:   number;
  phase?:       string;
  medianMs:     number;
  verdict:      HitVerdict;
  medianMargin: number;
  worstMargin:  number;
  pulls:        number;
  deathPulls:   number;
  tankOnly:     boolean;
};

export type PlanChange = {
  kind:    "add" | "move";
  key:     string;
  name:    string;
  player:  string;
  job:     string;
  // The hit's lowest HP after the change, median and worst over its pulls;
  // undefined when it can't be estimated (a shield never seen absorbing).
  estMargin?: number;
  estWorst?:  number;
  // A move's spare hit, with its median lowest HP once the plan's moves are
  // taken off it.
  from?:   PlanHitRef & { estMargin: number };
  fits:    number;  // pulls where the change is legal (see header)
  pulls:   number;
};

export type PlanIssue = {
  hit:     PlanHitRef;
  status:  "short" | "tight" | "healing" | "mechanic";
  change?: PlanChange;
  reason?: string;  // why there is no change
};

// `player` is whoever cast it on the hit most often.
export type PlanSpare = { hit: PlanHitRef; items: { name: string; player?: string }[]; worstMargin: number };

export type MitigationPlan = { pulls: number; issues: PlanIssue[]; spare: PlanSpare[] };

type PerPull = { pull: Pull; hits: MitigationHit[] };

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const enough = (n: number, of: number) => of > 0 && n * 2 >= of;

function refOf(row: AggregatedHit): PlanHitRef {
  return {
    id: row.id, name: row.abilityName, occurrence: row.occurrence, phase: row.phase, medianMs: row.medianMs,
    verdict: row.verdict, medianMargin: row.medianMargin, worstMargin: row.worstMargin, pulls: row.pulls,
    deathPulls: row.deathPulls, tankOnly: row.byPull.every((b) => b.hit.tankOnly),
  };
}

/** Whether casting this entry could help this hit (see header). */
function reaches(entry: CatalogEntry, row: AggregatedHit, player: string, tankOnly: boolean): boolean {
  if (entry.inSheet === false || entry.gated || entry.situational) return false;
  if (entry.kind === "invuln" || entry.kind === "limitBreak" || entry.cooldownMs < DROP_MIN_COOLDOWN_MS) return false;
  if (row.damageColumn === "none" && entry.kind !== "shield") return false;
  if (entry.reach === "party") return true;
  if (!tankOnly) return false;
  if (entry.reach === "target") return true;
  return row.byPull.some((b) => b.hit.targets.some((t) => t.player === player));
}

export function buildMitigationPlan(rows: AggregatedHit[], perPull: PerPull[], game: MitigationGame): MitigationPlan {
  const byPullId = new Map(perPull.map((p) => [p.pull.id, p]));
  const planned = rows.filter((r) => !r.rare && r.pulls >= PLAN_MIN_PULLS);

  // Each player's cast list per pull, changed as the plan applies changes.
  const castLists = new Map<string, number[]>();
  const castsOf = (pull: Pull, player: PlayerInfo, entry: CatalogEntry) => {
    const k = `${pull.id}|${player.name}|${entry.key}`;
    let list = castLists.get(k);
    if (!list) castLists.set(k, list = playerCasts(player, entry));
    return list;
  };
  // Keys the plan has taken off each row.
  const removed = new Map<string, Set<string>>();
  const removedFrom = (id: string) => removed.get(id) ?? new Set<string>();

  // Median per-target absorb of each shield entry, over every hit loaded.
  const shieldSize = new Map<string, number>();
  {
    const amounts = new Map<string, number[]>();
    for (const { hits } of perPull) for (const h of hits) for (const t of h.targets) {
      const perEntry = new Map<string, number>();
      for (const a of t.shieldAbsorbs) {
        const s = game.statusIndex.get(a.statusId);
        if (s) perEntry.set(s.entry.key, (perEntry.get(s.entry.key) ?? 0) + a.amount);
      }
      for (const [key, amount] of perEntry) if (amount > 0) amounts.set(key, [...(amounts.get(key) ?? []), amount]);
    }
    for (const [key, xs] of amounts) shieldSize.set(key, median(xs));
  }

  const coveringCast = (list: number[], entry: CatalogEntry, hit: MitigationHit) =>
    [...list].reverse().find((c) => c <= hit.endMs + SAME_HIT_MS && hit.timestampMs - c <= entry.durationMs + SNAPSHOT_SLACK_MS);

  /** Every hit a cast covered stays good without it (and without what the plan already took off). */
  const coveredStayGood = (hits: MitigationHit[], entry: CatalogEntry, player: string, castMs: number) =>
    hits.every((h) => {
      if (h.timestampMs < castMs - SAME_HIT_MS || h.timestampMs - castMs > entry.durationMs + SNAPSHOT_SLACK_MS) return true;
      if (!h.active.some((a) => a.key === entry.key && a.casters.includes(player))) return true;
      const keys = new Set([...removedFrom(h.id), entry.key]);
      return judged(h.targets).filter((t) => !t.died)
        .every((t) => marginWithout(t, keys, game, h.damageColumn, DAMAGE_ROLL_BUFFER).margin >= MARGIN_UNDER);
    });

  /** Median and worst lowest HP on a row's hits with the entry added by `player`. */
  const estimate = (row: AggregatedHit, entry: CatalogEntry, player: string) => {
    const shield = entry.statuses.some((s) => s.shield);
    const size = shield ? shieldSize.get(entry.key) : 0;
    if (size === undefined) return undefined;
    const margins = row.byPull.map(({ hit }) => lowestWithAdded(hit, entry, player, size)).filter(Number.isFinite);
    if (!margins.length) return undefined;
    return { median: median(margins), worst: Math.min(...margins) };
  };

  type Option = PlanChange & { reachesGood: boolean; apply: () => void };

  const findChange = (row: AggregatedHit, status: "short" | "tight"): Option | undefined => {
    const tankOnly = row.byPull.every((b) => b.hit.tankOnly);
    const roster = byPullId.get(row.byPull[row.byPull.length - 1].pullId)?.pull.players ?? [];
    const spareRows = planned.filter((r) => r.verdict === "over" && r.id !== row.id);
    const options: Option[] = [];

    for (const player of roster) {
      for (const entry of game.catalog) {
        if (!entry.jobs.includes(player.className) || !reaches(entry, row, player.name, tankOnly)) continue;
        const est = estimate(row, entry, player.name);
        const goodEnough = (e: typeof est) => !!e && (status === "short" ? e.median : e.worst) >= MARGIN_UNDER;

        // Pulls where the player is alive and the entry isn't on the hit already.
        const open = row.byPull.flatMap(({ pullId, hit }) => {
          const pp = byPullId.get(pullId);
          const p = pp?.pull.players.find((x) => x.name === player.name);
          if (!pp || !p || hit.active.some((a) => a.key === entry.key)) return [];
          if (isDeadOrFreshlyRevived(p, pp.pull.deathEvents, hit.timestampMs)) return [];
          return [{ pp, p, hit }];
        });

        // Add.
        const addFits = open.filter(({ pp, p, hit }) =>
          simulateCharges([...castsOf(pp.pull, p, entry), hit.timestampMs].sort((a, b) => a - b), entry).rejected.length === 0);
        if (enough(addFits.length, row.pulls)) {
          options.push({
            kind: "add", key: entry.key, name: entry.name, player: player.name, job: player.className,
            estMargin: est?.median, estWorst: est?.worst, fits: addFits.length, pulls: row.pulls,
            reachesGood: goodEnough(est),
            apply: () => {
              for (const { pp, p, hit } of addFits) {
                const list = castsOf(pp.pull, p, entry);
                list.push(hit.timestampMs);
                list.sort((a, b) => a - b);
              }
            },
          });
        }

        // Move from a spare hit.
        for (const spare of spareRows) {
          if (!spare.droppable.keys.includes(entry.key) || removedFrom(spare.id).has(entry.key)) continue;
          const active = spare.active.find((a) => a.key === entry.key);
          if (!active || !enough(active.casters[player.name] ?? 0, spare.pulls)) continue;
          const moves = open.flatMap(({ pp, p, hit }) => {
            const list = castsOf(pp.pull, p, entry);
            const spareHit = spare.byPull.find((b) => b.pullId === pp.pull.id)?.hit;
            const cast = spareHit && coveringCast(list, entry, spareHit);
            if (cast === undefined) return [];
            const next = [...list.filter((c) => c !== cast), hit.timestampMs].sort((a, b) => a - b);
            if (simulateCharges(next, entry).rejected.length > 0) return [];
            if (!coveredStayGood(pp.hits, entry, player.name, cast)) return [];
            return [{ list, next }];
          });
          if (!enough(moves.length, row.pulls)) continue;
          const left = new Set([...removedFrom(spare.id), entry.key]);
          const spareEst = median(spare.byPull.map(({ hit }) => {
            const pool = judged(hit.targets).filter((t) => !t.died);
            return pool.length ? Math.min(...pool.map((t) => marginWithout(t, left, game, hit.damageColumn).margin)) : hit.margin;
          }));
          options.push({
            kind: "move", key: entry.key, name: entry.name, player: player.name, job: player.className,
            estMargin: est?.median, estWorst: est?.worst, fits: moves.length, pulls: row.pulls,
            from: { ...refOf(spare), estMargin: spareEst },
            reachesGood: goodEnough(est),
            apply: () => {
              for (const { list, next } of moves) list.splice(0, list.length, ...next);
              removed.set(spare.id, left);
            },
          });
        }
      }
    }

    const score = (o: Option) => (status === "short" ? o.estMargin : o.estWorst) ?? -Infinity;
    options.sort((a, b) => Number(b.reachesGood) - Number(a.reachesGood)
      || Number(b.kind === "add") - Number(a.kind === "add")
      || score(b) - score(a)
      || b.fits - a.fits);
    return options[0];
  };

  // Classify.
  const short: AggregatedHit[] = [];
  const tight: AggregatedHit[] = [];
  const healing: AggregatedHit[] = [];
  const mechanic: AggregatedHit[] = [];
  for (const row of planned) {
    if ((row.verdict === "fail" || row.verdict === "under") && row.medianMargin < MECHANIC_MARGIN) mechanic.push(row);
    else if (row.verdict === "fail") {
      const dead = row.byPull.flatMap((b) => b.hit.targets.filter((t) => t.died && !t.vulnerable));
      (dead.every((t) => t.deathCause === "healing") ? healing : short).push(row);
    } else if (row.verdict === "under") short.push(row);
    else if (row.verdict === "good" && row.worstMargin < MARGIN_UNDER) tight.push(row);
  }
  short.sort((a, b) => Number(b.verdict === "fail") - Number(a.verdict === "fail") || a.medianMargin - b.medianMargin);
  tight.sort((a, b) => a.worstMargin - b.worstMargin);

  const issues: PlanIssue[] = [];
  let changes = 0;
  for (const [status, list] of [["short", short], ["tight", tight]] as const) {
    for (const row of list) {
      if (changes >= PLAN_MAX_CHANGES) {
        issues.push({ hit: refOf(row), status, reason: `Not planned this round (at most ${PLAN_MAX_CHANGES} changes at a time). Re-check after the changes above.` });
        continue;
      }
      const option = findChange(row, status);
      if (!option) {
        issues.push({ hit: refOf(row), status, reason: "Nothing free or movable reaches this hit. Look at shields and healing going into it." });
        continue;
      }
      // A tight hit is fine on most pulls: only worth a change that fixes the worst one.
      if (status === "tight" && !option.reachesGood) {
        issues.push({ hit: refOf(row), status, reason: "No single change lifts the worst pull to Good. Check that pull on its own." });
        continue;
      }
      option.apply();
      changes++;
      const { reachesGood: _r, apply: _a, ...change } = option;
      issues.push({ hit: refOf(row), status, change });
    }
  }
  for (const row of mechanic) {
    issues.push({ hit: refOf(row), status: "mechanic", reason: "Lethal by far more than mitigation covers: usually a mechanic failure (wrong players hit), not a mitigation gap." });
  }
  for (const row of healing) {
    issues.push({ hit: refOf(row), status: "healing", reason: "Deaths came from low HP before the hit: healing or timing, not mitigation." });
  }

  const spare: PlanSpare[] = [];
  for (const row of planned) {
    if (row.verdict !== "over") continue;
    const taken = removedFrom(row.id);
    const items = row.droppable.keys
      .filter((k) => !taken.has(k) && !game.catalog.find((e) => e.key === k)?.situational).map((k) => {
      const a = row.active.find((x) => x.key === k);
      const top = a && Object.entries(a.casters).sort((x, y) => y[1] - x[1])[0]?.[0];
      return { name: a?.name ?? k, player: top };
    });
    if (items.length) spare.push({ hit: refOf(row), items, worstMargin: row.droppable.worstMargin });
  }

  return { pulls: perPull.length, issues, spare };
}
