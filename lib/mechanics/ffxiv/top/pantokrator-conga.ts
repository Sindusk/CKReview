// lib/mechanics/ffxiv/top/pantokrator-conga.ts
//
// Cross-pull: which side each player takes in The Omega Protocol's
// Pantokrator, learned from the report's own clean splits, then used to
// name the one player of a same-number pair who didn't cross.
//
// Groups split the eight In Line players by one conga line: for each
// number, the player earlier in the line goes to one side and the later
// one to the other (NAUR: H1 R1 M1 MT OT M2 R2 H2). The order belongs to
// the raid's slots, which the log doesn't name (roles.ts reads a comp with
// one melee wrongly), so it's learned per report: every order of the
// roster's eight players is tried against every pull whose two groups the
// lines show, and the best fits are kept. Report b9FcR6vxAPd3zhkH: one
// order and its mirror fit all 49 known splits, no other order does, and
// it's NAUR's with the RDM as M1 and the DRG as M2 (the user's slots).
//
// omega.ts names both of a pair whose two line marks stood in one line
// (SAME_SIDE_NAME). Here, the stack's other players show which side it
// was (earlier or later in the conga); the pair member who belongs on the
// other side keeps the error and the other is dropped. Left as is when the
// report gives no conga, the fitting orders disagree, or the stack's side
// isn't consistent.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import { readPantokrator, SAME_SIDE_NAME, TOP1_LINE_RULE_ID } from "./omega";

export type PantokratorConga = {
  /** Every best-fitting order of player names (a mirror counts as the same order). */
  orders: string[][];
  /** Pulls with known groups, and how many the orders fit. */
  pulls: number;
  fits: number;
};

type PullLike = { players: PlayerInfo[]; deathEvents: DeathEvent[]; enemyCasts: EnemyEvent[] };

// Fewer known splits than this can't pin an order; the best order must
// fit at least this share of them (a pull where someone stood on the wrong
// side with the lines still clean breaks one split).
const MIN_PULLS = 5;
const MIN_FIT = 0.9;
// Past this many tied orders the data doesn't constrain the line enough.
const MAX_ORDERS = 500;

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((r) => [x, ...r]));
}

/** Learn the report's conga from its Pantokrator splits; undefined when it can't. */
export function learnPantokratorConga(pulls: PullLike[]): PantokratorConga | undefined {
  // Each split: the four pairs as [a, b, a's side].
  const splits: [string, string, boolean][][] = [];
  const names = new Set<string>();
  for (const pull of pulls) {
    const read = readPantokrator(pull.players, pull.deathEvents, pull.enemyCasts);
    if (!read?.groups || read.num.size !== 8) continue;
    const side = new Set(read.groups[0]);
    const pairs = [1, 2, 3, 4].map((n) => [...read.num].filter(([, x]) => x === n).map(([name]) => name));
    if (pairs.some((p) => p.length !== 2 || side.has(p[0]) === side.has(p[1]))) continue;
    splits.push(pairs.map(([a, b]) => [a, b, side.has(a)]));
    for (const [a, b] of pairs) { names.add(a); names.add(b); }
  }
  if (splits.length < MIN_PULLS || names.size !== 8) return undefined;
  let best = -1;
  let orders: string[][] = [];
  for (const order of permutations([...names])) {
    if (order[0] > order[order.length - 1]) continue; // one of each mirror pair
    const rank = new Map(order.map((n, i) => [n, i]));
    let fits = 0;
    for (const split of splits) {
      const sides = split.map(([a, b, aSide]) => (rank.get(a)! < rank.get(b)! ? aSide : !aSide));
      if (sides.every((s) => s === sides[0])) fits++;
    }
    if (fits > best) { best = fits; orders = [order]; } else if (fits === best && orders.length <= MAX_ORDERS) orders.push(order);
  }
  if (best < MIN_FIT * splits.length || orders.length > MAX_ORDERS) return undefined;
  return { orders, pulls: splits.length, fits: best };
}

/**
 * Narrow each same-number pair error to the player who belonged on the
 * other side. Errors are the pull's own; anything not resolvable is kept.
 */
export function applyPantokratorConga(
  errors: PullError[], players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], conga: PantokratorConga | undefined,
): PullError[] {
  const pairErrors = errors.filter((e) => e.ruleId === TOP1_LINE_RULE_ID && e.name === SAME_SIDE_NAME);
  if (!conga || !pairErrors.length) return errors;
  const read = readPantokrator(players, deathEvents, enemyCasts);
  if (!read) return errors;
  const drop = new Set<PullError>();
  const rewrite = new Map<PullError, PullError>();
  for (const t of [...new Set(pairErrors.map((e) => e.timestamp))]) {
    const pair = pairErrors.filter((e) => e.timestamp === t);
    if (pair.length !== 2) continue;
    const [a, b] = pair.map((e) => e.player!);
    const set = read.sets.find((s) => Math.abs(s.t - t) <= 1000);
    if (!set) continue;
    const stack = [...new Set(set.lines.flatMap((l) => l.filter((n) => n !== a && n !== b)))];
    // Per order: the stack's side, then which of the pair belongs elsewhere.
    const verdicts = new Set<string>();
    for (const order of conga.orders) {
      const rank = new Map(order.map((n, i) => [n, i]));
      const earlier = (n: string) => {
        const partner = [...read.num].find(([x, k]) => x !== n && k === read.num.get(n))?.[0];
        return partner !== undefined && rank.get(n)! < rank.get(partner)!;
      };
      const stackSides = new Set(stack.filter((n) => read.num.has(n)).map(earlier));
      if (stackSides.size !== 1) { verdicts.add("?"); continue; }
      const stackEarlier = [...stackSides][0];
      // Of the pair, the earlier one belongs on the earlier side.
      const aEarlier = rank.get(a)! < rank.get(b)!;
      verdicts.add((aEarlier === stackEarlier) ? b : a);
    }
    if (verdicts.size !== 1 || verdicts.has("?")) continue;
    const wrong = [...verdicts][0];
    const right = wrong === a ? b : a;
    for (const e of pair) {
      if (e.player === right) { drop.add(e); continue; }
      rewrite.set(e, {
        ...e,
        name: "Didn't Cross",
        description: `${e.description.replace(/ One of the two should have crossed to the other group; the log can't say which\./, "")} By the raid's conga (learned from ${conga.fits} of ${conga.pulls} Pantokrator splits in this report), ${wrong} belonged on the other side and ${right} was where they should be.`,
      });
    }
  }
  if (!drop.size && !rewrite.size) return errors;
  return errors.filter((e) => !drop.has(e)).map((e) => rewrite.get(e) ?? e);
}
