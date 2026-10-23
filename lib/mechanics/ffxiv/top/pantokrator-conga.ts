// lib/mechanics/ffxiv/top/pantokrator-conga.ts
//
// Cross-pull: the raid's priority line in The Omega Protocol's Phase 1,
// learned from the report's own clean resolutions, then used to name the
// one player of a pair who stood on the wrong side. Two uses:
//
// 1. Pantokrator. Groups split the eight In Line players by one conga
// line: for each number, the player earlier in the line goes to one side
// and the later one to the other (NAUR: H1 R1 M1 MT OT M2 R2 H2). The order
// belongs to the raid's slots, which the log doesn't name (roles.ts reads a
// comp with one melee wrongly), so it's learned per report: every order of
// the roster's eight players is tried against every pull whose two groups
// the lines show, and the best fits are kept. Report b9FcR6vxAPd3zhkH: one
// order and its mirror fit all 49 known splits, no other order does, and
// it's NAUR's with the RDM as M1 and the DRG as M2 (the user's slots).
// Report 2qgaAkxVypGWv9CN (the user's static): one order fits 28 of 28,
// SCH DNC MNK DRK GNB SAM RDM SGE, NAUR's again.
//
// omega.ts names both of a pair (SAME_SIDE_NAME) whose two line marks stood
// in one line, or whose two players ended up in one group (2qgaAkxVypGWv9CN
// Pull 3 1:21.4: both In Line 1 and both In Line 4 on one side). Here, the
// stack's or group's other players show which side it was (earlier or
// later in the conga); the pair member who belongs on the other side keeps
// the error and the other is dropped. Pull 3's verdict (the RDM and the
// MNK didn't flex) is the user's VOD call (2026-10-23). Left as is when the
// report gives no conga, the fitting orders disagree, or the side isn't
// consistent.
//
// 2. Program Loop. The two Blaster holders of a round take the two
// cardinals the towers leave free, by priority: scanning the cardinals
// clockwise from north, the earlier holder in the line takes the first free
// one (user, 2026-10-23, Pull 1 0:38.2: the SCH "should have been south
// based on priority"). Learned the same way, per report, from the clean
// rounds (each Blaster on its own holder only), over every order and scan
// start; a counter-clockwise scan is a clockwise one with the order
// reversed. 2qgaAkxVypGWv9CN: 160 clean rounds, the conga order above with
// a north clockwise scan fits 154 (no other start comes within 38). omega.ts
// names both holders of a Blaster that hit both (HOLDERS_TOGETHER_NAME);
// here the one off their assigned cardinal (> HOLDER_SPOT_DEG) keeps it
// when the other stood on theirs.
//
// ── OPEN QUESTIONS (VOD needed; moved from docs/open-items.md 2026-10-15) ──
//   - Two players with the same line number on one side (report
//     b9FcR6vxAPd3zhkH, Pull 46 and Pull 55 at 1:21): settled by the
//     report's own conga (the DRG in Pull 46, the PCT in Pull 55). Not yet
//     confirmed on VOD.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import {
  readPantokrator, readProgramLoop, offCardinal, SAME_SIDE_NAME, HOLDERS_TOGETHER_NAME, TOP1_LINE_RULE_ID, TOP1_BLASTER_RULE_ID,
} from "./omega";

export type PantokratorConga = {
  /** Every best-fitting order of player names (a mirror counts as the same order); empty when unknown. */
  orders: string[][];
  /** Pulls with known groups, and how many the orders fit. */
  pulls: number;
  fits: number;
  /** The Program Loop holder priority, when the clean rounds give one. */
  loop?: LoopPriority;
};

/** Best fits of (order, scan start) for the holders: start 0 N .. 3 W, scanning clockwise. */
export type LoopPriority = { fits: { order: string[]; start: number }[]; rounds: number; agree: number };

type PullLike = { players: PlayerInfo[]; deathEvents: DeathEvent[]; enemyCasts: EnemyEvent[] };

// Fewer known splits than this can't pin an order; the best order must
// fit at least this share of them (a pull where someone stood on the wrong
// side with the lines still clean breaks one split).
const MIN_PULLS = 5;
const MIN_FIT = 0.9;
// Past this many tied orders the data doesn't constrain the line enough.
const MAX_ORDERS = 500;
// Holder rounds: as many, and as good a fit (6 of 160 broke it in
// 2qgaAkxVypGWv9CN: holders who swapped with the round still clean).
const MIN_LOOP_ROUNDS = 10;
// The same threshold as omega.ts's holder spot.
const HOLDER_SPOT_DEG = 30;

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((r) => [x, ...r]));
}

/** Learn the report's conga from its Pantokrator splits and Program Loop holds; undefined when neither gives one. */
export function learnPantokratorConga(pulls: PullLike[]): PantokratorConga | undefined {
  const panto = learnSplits(pulls);
  const loop = learnLoopPriority(pulls);
  if (!panto && !loop) return undefined;
  return { ...(panto ?? { orders: [], pulls: 0, fits: 0 }), loop };
}

function learnSplits(pulls: PullLike[]): Omit<PantokratorConga, "loop"> | undefined {
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

/** Position of cardinal `c` in a clockwise scan from `start`. */
const scanPos = (c: number, start: number) => (c - start + 4) % 4;

function learnLoopPriority(pulls: PullLike[]): LoopPriority | undefined {
  // Each clean round: the two holders, the first one in scan order per start.
  const rounds: { a: string; b: string; ca: number; cb: number }[] = [];
  const names = new Set<string>();
  for (const pull of pulls) {
    for (const rd of readProgramLoop(pull.players, pull.deathEvents, pull.enemyCasts) ?? []) {
      if (!rd.clean || rd.holders.length !== 2) continue;
      const [a, b] = rd.holders;
      const ca = rd.free.find((f) => offCardinal(a.bearing, f) <= HOLDER_SPOT_DEG);
      const cb = rd.free.find((f) => offCardinal(b.bearing, f) <= HOLDER_SPOT_DEG);
      if (ca === undefined || cb === undefined || ca === cb) continue;
      rounds.push({ a: a.name, b: b.name, ca, cb });
      names.add(a.name); names.add(b.name);
    }
  }
  if (rounds.length < MIN_LOOP_ROUNDS || names.size !== 8) return undefined;
  // 40320 orders x 4 starts over every round: index arrays, not maps.
  const idx = new Map([...names].map((n, i) => [n, i]));
  const rs = rounds.map((r) => ({ a: idx.get(r.a)!, b: idx.get(r.b)!, firstA: [0, 1, 2, 3].map((s) => scanPos(r.ca, s) < scanPos(r.cb, s)) }));
  const rank = new Int8Array(8);
  let best = -1;
  let fits: { order: string[]; start: number }[] = [];
  for (const order of permutations([...names])) {
    order.forEach((n, i) => { rank[idx.get(n)!] = i; });
    for (let start = 0; start < 4; start++) {
      let n = 0;
      for (const r of rs) if ((rank[r.a] < rank[r.b]) === r.firstA[start]) n++;
      if (n > best) { best = n; fits = [{ order, start }]; } else if (n === best && fits.length <= MAX_ORDERS) fits.push({ order, start });
    }
  }
  if (best < MIN_FIT * rounds.length || fits.length > MAX_ORDERS) return undefined;
  return { fits, rounds: rounds.length, agree: best };
}

/**
 * Narrow each same-number pair error and each holders-together error to
 * the player who stood on the wrong side. Errors are the pull's own;
 * anything not resolvable is kept.
 */
export function applyPantokratorConga(
  errors: PullError[], players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], conga: PantokratorConga | undefined,
): PullError[] {
  if (!conga) return errors;
  return applyLoopPriority(applySplits(errors, players, deathEvents, enemyCasts, conga), players, deathEvents, enemyCasts, conga.loop);
}

function applySplits(
  errors: PullError[], players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], conga: PantokratorConga,
): PullError[] {
  const pairErrors = errors.filter((e) => e.ruleId === TOP1_LINE_RULE_ID && e.name === SAME_SIDE_NAME);
  if (!conga.orders.length || !pairErrors.length) return errors;
  const read = readPantokrator(players, deathEvents, enemyCasts);
  if (!read) return errors;
  const drop = new Set<PullError>();
  const rewrite = new Map<PullError, PullError>();
  const partnerOf = (n: string) => [...read.num].find(([x, k]) => x !== n && k === read.num.get(n))?.[0];
  for (const t of [...new Set(pairErrors.map((e) => e.timestamp))]) {
    const atT = pairErrors.filter((e) => e.timestamp === t);
    // One pair per In Line number (Pull 3 had two at once).
    for (const k of [...new Set(atT.map((e) => read.num.get(e.player!)))]) {
      const pair = atT.filter((e) => read.num.get(e.player!) === k);
      if (pair.length !== 2) continue;
      const [a, b] = pair.map((e) => e.player!);
      const set = read.sets.find((s) => Math.abs(s.t - t) <= 1000);
      // Where the pair stood together: their shared group, else their shared line.
      const where = read.groups?.find((g) => g.includes(a) && g.includes(b))
        ?? set?.lines.find((l) => l.includes(a) && l.includes(b));
      if (!where) continue;
      // The side's other players, leaving out any other pair stuck on it.
      const stack = where.filter((n) => n !== a && n !== b && read.num.has(n) && !where.includes(partnerOf(n) ?? ""));
      // Per order: the stack's side, then which of the pair belongs elsewhere.
      const verdicts = new Set<string>();
      for (const order of conga.orders) {
        const rank = new Map(order.map((n, i) => [n, i]));
        const earlier = (n: string) => {
          const partner = partnerOf(n);
          return partner !== undefined && rank.get(n)! < rank.get(partner)!;
        };
        const stackSides = new Set(stack.map(earlier));
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
          description: `${e.description.replace(/ One of the two should have (crossed|flexed) to the other group; the log can't say which\./, "")} By the raid's conga (learned from ${conga.fits} of ${conga.pulls} Pantokrator splits in this report), ${wrong} belonged on the other side and ${right} was where they should be.`,
        });
      }
    }
  }
  if (!drop.size && !rewrite.size) return errors;
  return errors.filter((e) => !drop.has(e)).map((e) => rewrite.get(e) ?? e);
}

const CARDINAL = ["north", "east", "south", "west"];

function applyLoopPriority(
  errors: PullError[], players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], loop: LoopPriority | undefined,
): PullError[] {
  const together = errors.filter((e) => e.ruleId === TOP1_BLASTER_RULE_ID && e.name === HOLDERS_TOGETHER_NAME);
  if (!loop || !together.length) return errors;
  const rounds = readProgramLoop(players, deathEvents, enemyCasts) ?? [];
  const drop = new Set<PullError>();
  const rewrite = new Map<PullError, PullError>();
  for (const t of [...new Set(together.map((e) => e.timestamp))]) {
    const pair = together.filter((e) => e.timestamp === t);
    const rd = rounds.find((r) => Math.abs(r.t - t) <= 1500);
    if (pair.length !== 2 || !rd || rd.free.length !== 2) continue;
    const at = pair.map((e) => rd.holders.find((x) => x.name === e.player));
    if (at.some((x) => !x)) continue;
    // Per fit: each holder's assigned cardinal, then who stood off theirs.
    const verdicts = new Set<string>();
    for (const { order, start } of loop.fits) {
      const rank = new Map(order.map((n, i) => [n, i]));
      const [first, second] = [...rd.free].sort((x, y) => scanPos(x, start) - scanPos(y, start));
      const [a, b] = at as { name: string; bearing: number }[];
      const aFirst = rank.get(a.name)! < rank.get(b.name)!;
      const offA = offCardinal(a.bearing, aFirst ? first : second) > HOLDER_SPOT_DEG;
      const offB = offCardinal(b.bearing, aFirst ? second : first) > HOLDER_SPOT_DEG;
      const cardA = aFirst ? first : second, cardB = aFirst ? second : first;
      verdicts.add(offA === offB ? "?" : `${offA ? a.name : b.name}|${offA ? cardA : cardB}`);
    }
    if (verdicts.size !== 1 || verdicts.has("?")) continue;
    const [wrong, card] = [...verdicts][0].split("|");
    const wrongCard = Number(card);
    for (const e of pair) {
      if (e.player !== wrong) { drop.add(e); continue; }
      rewrite.set(e, {
        ...e,
        name: "Wrong Tether Spot",
        description: `${e.description} By the raid's holder priority (learned from ${loop.agree} of ${loop.rounds} clean Program Loop rounds in this report), ${wrong} belonged ${CARDINAL[wrongCard]}, and the other holder was on their spot.`,
      });
    }
  }
  if (!drop.size && !rewrite.size) return errors;
  return errors.filter((e) => !drop.has(e)).map((e) => rewrite.get(e) ?? e);
}
