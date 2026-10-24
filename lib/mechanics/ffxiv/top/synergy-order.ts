// lib/mechanics/ffxiv/top/synergy-order.ts
//
// Cross-pull: the order that decides which row each player takes in The
// Omega Protocol's Party Synergy, learned from the report's own clean
// Fire spreads, then used to name the one player of a glitch pair who
// stood in the wrong row (Fire) or the wrong stack (Spotlight).
//
// Each same-symbol pair splits across the eye's laser: the player earlier
// in the raid's order stands left of the eye (looking at the center), the
// other right. Each row stacks for its own Spotlight; when both marks land
// in one row, the mark nearer the eye swaps rows with their partner (Mid
// Glitch and the left row: cross, square, circle, triangle from the eye;
// Remote Glitch's right row runs triangle, square, circle, cross).
// Reports BKQ92ndywPaLtbMm, 8hnVr24MtBqNvRAb and ZPpBNMGyrnzJ2LRC (one
// static, NAUR strats): the order H1 RDM PCT MT OT DRG DNC H2 fits all
// 131 clean pairs, uniquely; the swap rule fits all 10 clean swaps, and
// every all-alive Spotlight failure has exactly one pair member outside
// their expected stack.
//
// The order is learned per report over jobs (over names when a pull has
// two of one job): every order of the eight is tried against the pairs
// whose rows and eye side the pull shows (omega-mf.ts readSynergy), and
// the best fits are kept. omega-mf.ts names both partners; here the one
// in the wrong row or stack keeps the error and the other is dropped. Left
// as is when the report gives no order, the best orders disagree on the
// pair, or the pull's rows don't place the pair.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import type { HeadMarker } from "../fru/usurper-of-frost";
import type { PantokratorConga } from "./pantokrator-conga";
import { readSynergy, partnerOf, fireGroups, TOP2_GLITCH_RULE_ID, TOP2_STACK_RULE_ID, TOP2_FIRE_RULE_ID, type SynergyRead } from "./omega-mf";

export type SynergyOrder = {
  /** Every best-fitting order of keys (jobs, or names when keyed by name). */
  orders: string[][];
  byName: boolean;
  /** Clean pairs seen with a known eye side, and how many the orders fit. */
  pairs: number;
  fits: number;
};

type PullLike = { players: PlayerInfo[]; deathEvents: DeathEvent[]; enemyCasts: EnemyEvent[]; headMarkers?: HeadMarker[] };

// Fewer clean pairs than this can't pin an order; the best order must fit
// at least this share (a player in the wrong row with nobody hurt breaks one).
const MIN_PAIRS = 12;
const MIN_FIT = 0.9;
const MAX_ORDERS = 500;

const RANK_FROM_EYE: Record<string, number> = { X: 0, S: 1, O: 2, T: 3 };
const RANK_REVERSED: Record<string, number> = { T: 0, S: 1, O: 2, X: 3 };
// Fire spots sit ~10 yalms apart along each row (30/40/50/60 from the eye).
const SPOT_SPACING = 1000;
// A glitch pair narrows to the partner this far off their slot when the
// other is within OFF_SPOT_PARTNER_MAX (centi-yalms). Clean players: 381
// within 10.0y but for players the laser or a death had displaced (11.8y
// B1, 13.4y A23, 17.0y C3). Off-slot partners: 9.5y (B34 S), 14.4y (B44),
// 15.8y (B14), 27-31y (A27, A33, B48, B49: the wrong end of the Remote
// row); their partners 1.9-6.7y. Both near their slots (B5 1.6/2.1y, C27
// 1.8/2.9y: the rows a few yalms too close or too wide) stays a pair.
const OFF_SPOT_MIN = 900;
const OFF_SPOT_PARTNER_MAX = 700;

/**
 * How far each player stood from their Fire slot (centi-yalms): the side
 * of the axis their row takes (early row: the side the clean early players
 * stand on) at the clean players' median distance from it, and the rank
 * their symbol takes along the row, from whichever end fits the clean
 * players better.
 */
export function slotDeviations(read: SynergyRead, early: (n: string) => boolean | undefined): Map<string, number> | undefined {
  const u = read.axis;
  if (!u || read.firePos.size < 8) return undefined;
  const lat = (q: { x: number; y: number }) => u.x * (q.y - 10000) - u.y * (q.x - 10000);
  const al = (q: { x: number; y: number }) => u.x * (q.x - 10000) + u.y * (q.y - 10000);
  const names = [...read.firePos.keys()].filter((n) => early(n) !== undefined && read.symbol.has(n));
  // B14 kept only three clean (overlaps and deaths); they still place the
  // slots. With fewer, everyone votes (LG64YVQy2KZbtpN8 Pull 11: two clean,
  // five of eight on their slots).
  const clean = names.filter((n) => read.clean.has(n)).length >= 3 ? names.filter((n) => read.clean.has(n)) : names;
  if (clean.length < 6) return undefined;
  const sideVote = clean.reduce((a, n) => a + (early(n) ? 1 : -1) * Math.sign(lat(read.firePos.get(n)!)), 0);
  if (sideVote === 0) return undefined;
  const earlySign = Math.sign(sideVote);
  const absLat = clean.map((n) => Math.abs(lat(read.firePos.get(n)!))).sort((a, b) => a - b);
  const width = absLat[Math.floor(absLat.length / 2)];
  const rank = (n: string) => (read.remote && !early(n) ? RANK_REVERSED : RANK_FROM_EYE)[read.symbol.get(n)!];
  const expAlong = (n: string, end: number) => end * (rank(n) - 1.5) * SPOT_SPACING;
  const misfit = (end: number) => clean.reduce((a, n) => a + Math.abs(al(read.firePos.get(n)!) - expAlong(n, end)), 0);
  const end = misfit(1) <= misfit(-1) ? 1 : -1;
  return new Map(names.map((n) => {
    const q = read.firePos.get(n)!;
    return [n, Math.hypot(lat(q) - (early(n) ? earlySign : -earlySign) * width, al(q) - expAlong(n, end))];
  }));
}

/** Players on the wrong side of the eye's axis for their row (every player votes on which side is early). */
function wrongSide(read: SynergyRead, early: (n: string) => boolean | undefined): Set<string> | undefined {
  const u = read.axis;
  if (!u) return undefined;
  const lat = (q: { x: number; y: number }) => u.x * (q.y - 10000) - u.y * (q.x - 10000);
  const names = [...read.firePos.keys()].filter((n) => early(n) !== undefined);
  const vote = names.reduce((a, n) => a + (early(n) ? 1 : -1) * Math.sign(lat(read.firePos.get(n)!)), 0);
  if (Math.abs(vote) < 4) return undefined;
  return new Set(names.filter((n) => Math.sign(lat(read.firePos.get(n)!)) !== (early(n) ? Math.sign(vote) : -Math.sign(vote))));
}

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((r) => [x, ...r]));
}

const distinctJobs = (players: PlayerInfo[]) => new Set(players.map((p) => p.className)).size === players.length;

function keyer(players: PlayerInfo[], byName: boolean): (name: string) => string {
  const job = new Map(players.map((p) => [p.name, p.className]));
  return (name) => (byName ? name : job.get(name) ?? name);
}

/**
 * Learn the report's Party Synergy order; undefined when it can't. When the
 * clean pairs leave several orders tied, the report's Pantokrator conga
 * (either direction) picks among them: the user's static uses one line for
 * both (user, 2026-10-24, LG64YVQy2KZbtpN8: SGE RDM SAM GNB DRK MNK DNC SCH;
 * 42 orders fit its 27 clean pairs, and the conga is one of them). Another
 * static's Synergy order differs from its conga, and it fits uniquely anyway.
 */
export function learnSynergyOrder(pulls: PullLike[], conga?: PantokratorConga): SynergyOrder | undefined {
  const reads = pulls.map((p) => ({ p, read: readSynergy(p.players, p.deathEvents, p.enemyCasts, p.headMarkers ?? []) }))
    .filter((x): x is { p: PullLike; read: SynergyRead } => !!x.read);
  if (!reads.length) return undefined;
  const byName = !reads.every((x) => distinctJobs(x.p.players));
  const obs: [string, string][] = [];
  for (const { p, read } of reads) {
    if (!read.rows || read.left === undefined) continue;
    const key = keyer(p.players, byName);
    for (const [a, b] of read.pairs) {
      if (!read.clean.has(a) || !read.clean.has(b)) continue;
      const ra = read.rows.get(a), rb = read.rows.get(b);
      if (ra === undefined || rb === undefined || ra === rb) continue;
      obs.push(ra === read.left ? [key(a), key(b)] : [key(b), key(a)]);
    }
  }
  const keys = [...new Set(obs.flat())];
  if (obs.length < MIN_PAIRS || keys.length !== 8) return undefined;
  let best: string[][] = [];
  let bestFit = -1;
  for (const o of permutations(keys)) {
    const idx = new Map(o.map((k, i) => [k, i]));
    const fit = obs.filter(([l, r]) => idx.get(l)! < idx.get(r)!).length;
    if (fit > bestFit) { bestFit = fit; best = [o]; }
    else if (fit === bestFit && best.length < MAX_ORDERS) best.push(o);
  }
  if (bestFit < MIN_FIT * obs.length) return undefined;
  if (best.length > 1 && conga?.orders.length === 1) {
    const key = keyer(reads[0].p.players, byName);
    const line = conga.orders[0].map(key);
    const same = (o: string[], l: string[]) => o.length === l.length && o.every((k, i) => k === l[i]);
    const fit = best.filter((o) => same(o, line) || same(o, [...line].reverse()));
    if (fit.length) best = fit;
  }
  return { orders: best, byName, pairs: obs.length, fits: bestFit };
}

/** True when every best order puts `a` before `b`, false when every one puts it after. */
function earlier(so: SynergyOrder, a: string, b: string): boolean | undefined {
  const votes = so.orders.map((o) => o.indexOf(a) < o.indexOf(b));
  return votes.every(Boolean) ? true : votes.every((v) => !v) ? false : undefined;
}

/**
 * Narrow omega-mf.ts's pair errors to the partner out of place. Fire: the
 * pull's early row is the left row when the eye is known, else the row of
 * the earlier players of the clean split pairs; the pair member outside
 * their row keeps "Out of Glitch Range". Spotlight: the expected stacks
 * are the rows with the swap applied; the pair member outside theirs keeps
 * "Same Stack as Partner".
 */
export function applySynergyOrder(
  errors: PullError[], players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], headMarkers: HeadMarker[] | undefined, so: SynergyOrder | undefined,
): PullError[] {
  if (!so) return errors;
  const pairErr = (e: PullError) => (e.ruleId === TOP2_GLITCH_RULE_ID && e.name === "Out of Glitch Range") || (e.ruleId === TOP2_STACK_RULE_ID && e.name === "Same Stack as Partner")
    || (e.ruleId === TOP2_FIRE_RULE_ID && e.name === "Fire Overlap");
  if (!errors.some(pairErr)) return errors;
  const read = readSynergy(players, deathEvents, enemyCasts, headMarkers ?? []);
  if (!read) return errors;
  const key = keyer(players, so.byName);
  const before = (a: string, b: string) => earlier(so, key(a), key(b));
  // 0 = the early row (left of the eye), 1 = the late row, per the order.
  const expRow = new Map<string, 0 | 1>();
  for (const [a, b] of read.pairs) {
    const e = before(a, b);
    if (e === undefined) continue;
    expRow.set(a, e ? 0 : 1);
    expRow.set(b, e ? 1 : 0);
  }

  const drop = new Set<PullError>();
  const narrowed = new Map<PullError, string>();
  const offBy = new Map<string, number>();

  // Fire: how far each player stood from their slot.
  const devs = slotDeviations(read, (n) => (expRow.has(n) ? expRow.get(n) === 0 : undefined));

  // Spotlight: the expected stack row of each player, with the swap.
  const stackRow = new Map(expRow);
  const [m1, m2] = read.marks;
  if (m1 && m2 && expRow.has(m1) && expRow.has(m2) && expRow.get(m1) === expRow.get(m2)) {
    const row = expRow.get(m1)!;
    const rank = read.remote && row === 1 ? RANK_REVERSED : RANK_FROM_EYE;
    const r1 = rank[read.symbol.get(m1) ?? ""], r2 = rank[read.symbol.get(m2) ?? ""];
    const swapper = r1 < r2 ? m1 : r2 < r1 ? m2 : undefined;
    const partner = swapper && partnerOf(read, swapper);
    if (swapper && partner) { stackRow.set(swapper, row === 0 ? 1 : 0); stackRow.set(partner, row); }
    else stackRow.clear();
  }
  const instOfRow = new Map<0 | 1, number>();
  for (const r of [0, 1] as const) {
    const counts = new Map<number, number>();
    for (const [n, row] of stackRow) {
      const is = read.stacks.get(n) ?? [];
      if (row === r && is.length === 1) counts.set(is[0], (counts.get(is[0]) ?? 0) + 1);
    }
    const top = [...counts].sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] >= 3) instOfRow.set(r, top[0]);
  }
  if (instOfRow.get(0) === instOfRow.get(1)) instOfRow.clear();

  for (const [a, b] of read.pairs) {
    for (const [rule, name] of [[TOP2_GLITCH_RULE_ID, "Out of Glitch Range"], [TOP2_STACK_RULE_ID, "Same Stack as Partner"]] as const) {
      const errs = errors.filter((e) => e.ruleId === rule && e.name === name && (e.player === a || e.player === b));
      if (errs.length !== 2) continue;
      let wrong: string[] = [];
      if (rule === TOP2_GLITCH_RULE_ID) {
        const da = devs?.get(a), db = devs?.get(b);
        if (da === undefined || db === undefined) continue;
        wrong = da >= OFF_SPOT_MIN && db <= OFF_SPOT_PARTNER_MAX ? [a] : db >= OFF_SPOT_MIN && da <= OFF_SPOT_PARTNER_MAX ? [b] : [];
        if (wrong.length) offBy.set(wrong[0], (wrong[0] === a ? da : db) / 100);
      } else {
        if (!stackRow.has(a) || instOfRow.size !== 2) continue;
        wrong = [a, b].filter((n) => (read.stacks.get(n) ?? [])[0] !== instOfRow.get(stackRow.get(n)!));
      }
      if (wrong.length !== 1) continue;
      for (const e of errs) {
        if (e.player === wrong[0]) narrowed.set(e, wrong[0]);
        else drop.add(e);
      }
    }
  }
  // Fire overlaps: within each Fire that hit several, the players off their
  // slot keep "Fire Overlap" when the rest stood on theirs (user,
  // 2026-10-24, LG64YVQy2KZbtpN8 Pull 11 2:54.1: the DRK and SCH went to
  // the wrong sides, the RDM and SAM they overlapped were right).
  const wrong = wrongSide(read, (n) => (expRow.has(n) ? expRow.get(n) === 0 : undefined));
  if (wrong) {
    const fireErr = (n: string) => errors.find((e) => e.ruleId === TOP2_FIRE_RULE_ID && e.name === "Fire Overlap" && e.player === n);
    for (const g of fireGroups(players, read.fireT)) {
      const named = g.map((p) => p.name).filter((n) => fireErr(n) && expRow.has(n));
      const off = named.filter((n) => wrong.has(n));
      if (named.length < 2 || !off.length || off.length === named.length) continue;
      for (const n of named) {
        if (off.includes(n)) narrowed.set(fireErr(n)!, n);
        else drop.add(fireErr(n)!);
      }
    }
  }
  return errors.filter((e) => !drop.has(e)).map((e) => {
    if (!narrowed.has(e)) return e;
    const off = offBy.get(e.player ?? "");
    return {
      ...e,
      description: e.description.replace("Either could have moved.", `By the raid's order, ${e.player} was ~${off?.toFixed(1) ?? "?"}y off their spot.`)
        .replace("Either belonged in the other stack.", `By the raid's order and swap, ${e.player} belonged in the other stack.`)
        .replace("Either could have been off their spot.", `By the raid's order, ${e.player} was on the wrong side of the eye.`),
    };
  });
}
