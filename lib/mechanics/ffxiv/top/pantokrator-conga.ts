// lib/mechanics/ffxiv/top/pantokrator-conga.ts
//
// Cross-pull: the raid's priority line in The Omega Protocol's Phase 1,
// learned from the report's own clean resolutions, then used to name the
// one player of a pair who stood on the wrong side. Three uses:
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
// when the other stood on theirs. The same line pairs the hand-offs: the
// earlier new holder takes the earlier previous holder's tether, so when
// both took one tether, the one whose tether stayed put is named
// (applyTetherPairing). When both new holders took and a previous holder's
// tether stayed (omega.ts KEPT_TAG), the earlier new holder owes the tether
// of the previous holder first in the clockwise scan; whoever owed the kept
// one is at fault, the other is dropped (applyKeptTether; user, 2026-11-02,
// nbKLdqJkapxmNfzt Pull 16 0:56.1: RDM west, WAR flexing to south). The
// same reading on 2qgaAkxVypGWv9CN Pull 12 0:38.2 puts the SCH on the kept
// tether, so both stay flagged (that ruling holds).
//
// 3. Program Loop towers. The round's two In Line players take the two
// tower cardinals by a priority learned the same way from the rounds where
// each tower took one of them (KCX2qW4khczmZ9T1: one fit, 129 of 129, a
// north clockwise scan with the reversed conga SCH DNC MNK DRK GNB SAM RDM
// SGE, earlier on the first tower; 2qgaAkxVypGWv9CN 200/201,
// LG64YVQy2KZbtpN8 152/152, hjgk42MDf81arFVY 156/156, same fit). omega.ts
// names both of a pair in one tower (SAME_TOWER_NAME); here the one whose
// tower was left empty keeps it, "Wrong Tower" (user, 2026-10-30,
// KCX2qW4khczmZ9T1 Pull 17 0:37.7), via applyTowerPriority.
//
// 4. Wave Cannon Kyrios (applyWaveMover, below): a two-player overlap
// narrows to the player whose line is outside their report-learned range.
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
  readPantokrator, readProgramLoop, readLoopNumbers, offCardinal, cardinalOf, KEPT_TAG, SAME_SIDE_NAME, SAME_TOWER_NAME, HOLDERS_TOGETHER_NAME, TOOK_ANOTHERS_NAME, STAYED_PUT,
  TOP1_LINE_RULE_ID, TOP1_BLASTER_RULE_ID, TOP1_TOWER_RULE_ID, TOP1_WAVE_CANNON_RULE_ID,
} from "./omega";
import { bodyHit, isTank } from "../fru/common";
import { playerError } from "@/lib/mechanics/wow/common";

export type PantokratorConga = {
  /** Every best-fitting order of player names (a mirror counts as the same order); empty when unknown. */
  orders: string[][];
  /** Pulls with known groups, and how many the orders fit. */
  pulls: number;
  fits: number;
  /** The Program Loop holder priority, when the clean rounds give one. */
  loop?: LoopPriority;
  /** The Program Loop tower priority (which of a round's two In Line players takes which tower), when the clean rounds give one. */
  tower?: LoopPriority;
  /** Per player name, the bearing range of that player's clean Wave Cannon Kyrios lines (waveUsual), when 6+ volleys give one. */
  wave?: Record<string, WaveUsual>;
};

/** Where one player's own Wave Cannon Kyrios line usually lands, in degrees from the boss. */
export type WaveUsual = { median: number; lo: number; hi: number; n: number };

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
  const tower = learnTowerPriority(pulls);
  const wave = learnWaveUsual(pulls);
  if (!panto && !loop && !tower && !wave) return undefined;
  return { ...(panto ?? { orders: [], pulls: 0, fits: 0 }), loop, tower, wave };
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
  return fitPriority(rounds, names);
}

/**
 * Tower priority: the two In Line players of a round on the two tower
 * cardinals, learned like the holders' from the clean tower rounds (each
 * tower soaked by one of them). KCX2qW4khczmZ9T1: 127 of 127 clean rounds
 * fit one scan (from north, clockwise, the LATER player in the conga on the
 * first tower).
 */
function learnTowerPriority(pulls: PullLike[]): LoopPriority | undefined {
  const rounds: { a: string; b: string; ca: number; cb: number }[] = [];
  const names = new Set<string>();
  for (const pull of pulls) {
    for (const rd of readProgramLoop(pull.players, pull.deathEvents, pull.enemyCasts) ?? []) {
      if (!rd.towerClean) continue;
      const [a, b] = rd.soaks;
      rounds.push({ a: a.name, b: b.name, ca: a.card, cb: b.card });
      names.add(a.name); names.add(b.name);
    }
  }
  return fitPriority(rounds, names);
}

/** Best (order, scan start) fits for rounds where a stood on ca and b on cb; undefined unless clean enough. */
function fitPriority(rounds: { a: string; b: string; ca: number; cb: number }[], names: Set<string>): LoopPriority | undefined {
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
  const split = applyTetherPairing(applySplits(errors, players, deathEvents, enemyCasts, conga), players, enemyCasts, conga);
  const held = applyLoopPriority(applyKeptTether(split, players, deathEvents, enemyCasts, conga.loop), players, deathEvents, enemyCasts, conga.loop);
  return applyWaveMover(applyTowerPriority(held, players, deathEvents, enemyCasts, conga.tower), players, deathEvents, enemyCasts, conga.wave);
}

// ── Wave Cannon Kyrios: who moved ───────────────────────────────────────────
//
// A line that hit two non-tanks (omega.ts names both, "Wave Cannon Overlap")
// was one player's line walked into by the other. Each player's own line has
// a usual bearing from the boss (the report's clean volleys: a line that hit
// that player alone). The one whose bearing lies outside its usual range
// while the partner is on theirs is the mover; the partner is dropped (user,
// 2026-11-06, Pull 21 1:48 of WtGX1fYHyJMx3Pr7: the RDM "greeds a cast and
// moves slowly, getting clipped by the laser in the RPR position... the RPR
// was completely correct... they should not even get a minor"). Per-pull
// signals fail (cast.target blank on overlaps; "has a line elsewhere" picks
// the wrong player; facing is the pre-aim value), so it is learned per report.
// Thresholds (degrees; tools/ffxiv/top/omega-wavecannon.js prints the data):
//   WAVE_MIN_CLEAN 6 clean volleys to learn a player's range, else both named.
//   WAVE_TRIM 30: clean bearings farther than this from the median are strays
//     (a clean RDM line 72 off) and don't widen the range.
//   Range = min..max of the rest. Clean spread 7-27 deg (SGE 2qgaAkxVypGWv9CN
//   -27..7). Distance outside it: WAVE_OFF_MIN 10 for the mover (Pull 21: 13;
//   below it 2qgaAkxVypGWv9CN Pull 67 MNK 7 stays both), the partner at most
//   WAVE_ON_MAX 12 (LG64YVQy2KZbtpN8 Pull 7: partner 12, mover 84) and at
//   least WAVE_GAP_MIN 10 less than the mover (KCX2qW4khczmZ9T1 Pull 25
//   1:57: 11 vs 20 stays both; nbKLdqJkapxmNfzt Pull 21: 41 vs 80 stays both).
//   Other movers on disk: 41-121 outside (KCX Pull 25 1:48 71, hjgk42MDf81arFVY
//   Pull 23 103). Only lines hitting exactly two non-tanks are read.
// Major when the mover's vulnerability from the overlap leads to its death:
// a later Wave Cannon hit on it within 15s with that Magic Vulnerability Up
// still on (no removal since the overlap) that kills it (Pull 21: 73.9k,
// 9.96s later). Otherwise the severity omega.ts gave stands.
const WAVE_CANNON_ID = 31505;
const WAVE_MIN_CLEAN = 6;
const WAVE_TRIM = 30;
const WAVE_OFF_MIN = 10;
const WAVE_ON_MAX = 12;
const WAVE_GAP_MIN = 10;
const WAVE_FATAL_MS = 15000;
const WAVE_DEATH_LAG_MS = 6000;
const WAVE_BUCKET_MS = 5000;
const angDiff = (a: number, m: number) => ((a - m + 540) % 360) - 180;

type WaveLine = { t: number; hits: { p: PlayerInfo; b: number }[] };

function waveLines(players: PlayerInfo[], enemyCasts: EnemyEvent[]): WaveLine[] {
  const out: WaveLine[] = [];
  for (const c of enemyCasts) {
    if (c.abilityId !== WAVE_CANNON_ID || c.x === undefined || c.y === undefined) continue;
    const hits: WaveLine["hits"] = [];
    for (const p of players) {
      const e = p.damageTaken.find((x) => x.abilityId === WAVE_CANNON_ID && x.sourceInstance === c.sourceInstance &&
        Math.abs(x.timestamp - c.timestamp) <= 1000 && !bodyHit(x));
      if (e && e.x !== undefined && e.y !== undefined) hits.push({ p, b: Math.atan2(e.x - c.x, e.y - c.y) * 180 / Math.PI });
    }
    out.push({ t: c.timestamp, hits });
  }
  return out;
}

function learnWaveUsual(pulls: PullLike[]): Record<string, WaveUsual> | undefined {
  const by = new Map<string, number[]>();
  for (const pull of pulls) {
    for (const l of waveLines(pull.players, pull.enemyCasts)) {
      if (l.hits.length === 1 && !isTank(l.hits[0].p)) by.set(l.hits[0].p.name, [...(by.get(l.hits[0].p.name) ?? []), l.hits[0].b]);
    }
  }
  const out: Record<string, WaveUsual> = {};
  for (const [name, bs] of by) {
    if (bs.length < WAVE_MIN_CLEAN) continue;
    const median = [...bs].sort((a, b) => a - b)[bs.length >> 1];
    const devs = bs.map((b) => angDiff(b, median)).filter((d) => Math.abs(d) <= WAVE_TRIM);
    out[name] = { median, lo: Math.min(...devs), hi: Math.max(...devs), n: bs.length };
  }
  return Object.keys(out).length ? out : undefined;
}

/** Degrees bearing b lies outside p's usual range (0 inside); undefined when no range is known. */
function waveOutside(wave: Record<string, WaveUsual>, name: string, b: number): number | undefined {
  const u = wave[name];
  if (!u) return undefined;
  const d = angDiff(b, u.median);
  return Math.max(u.lo - d, d - u.hi, 0);
}

/** The mover's later Wave Cannon hit that killed it with the overlap's vulnerability still on, if any. */
function waveFatalHit(p: PlayerInfo, deathEvents: DeathEvent[], t: number): number | undefined {
  const isVuln = (e: { abilityName?: string }) => /Magic Vulnerability Up/.test(e.abilityName ?? "");
  for (const h of p.damageTaken) {
    if (h.abilityId !== WAVE_CANNON_ID || h.timestamp <= t + 1000 || h.timestamp > t + WAVE_FATAL_MS || bodyHit(h) || !((h.amount ?? 0) > 0)) continue;
    const died = deathEvents.some((d) => d.player === p.name && d.killingAbilityGameId === WAVE_CANNON_ID && d.timestamp >= h.timestamp && d.timestamp - h.timestamp <= WAVE_DEATH_LAG_MS);
    const on = p.debuffs.some((e) => isVuln(e) && e.debuffStatus === "applied" && e.timestamp <= t + 500) &&
      !p.debuffs.some((e) => isVuln(e) && e.debuffStatus === "removed" && e.timestamp > t + 500 && e.timestamp < h.timestamp - 200);
    if (died && on) return h.timestamp;
  }
  return undefined;
}

function applyWaveMover(
  errors: PullError[], players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], wave: Record<string, WaveUsual> | undefined,
): PullError[] {
  const overlaps = errors.filter((e) => e.ruleId === TOP1_WAVE_CANNON_RULE_ID && e.name === "Wave Cannon Overlap");
  if (!wave || !overlaps.length) return errors;
  const bucket = (t: number) => Math.round(t / WAVE_BUCKET_MS);
  const kept = new Set<string>();
  const dropped = new Set<string>();
  const rewrite = new Map<PullError, PullError>();
  for (const l of waveLines(players, enemyCasts)) {
    if (l.hits.length < 2) continue;
    let mover: { p: PlayerInfo; b: number } | undefined;
    if (l.hits.length === 2 && !l.hits.some((h) => isTank(h.p))) {
      const [a, b] = l.hits.map((h) => waveOutside(wave, h.p.name, h.b));
      if (a !== undefined && b !== undefined) {
        if (a >= WAVE_OFF_MIN && b <= WAVE_ON_MAX && a - b >= WAVE_GAP_MIN) mover = l.hits[0];
        else if (b >= WAVE_OFF_MIN && a <= WAVE_ON_MAX && b - a >= WAVE_GAP_MIN) mover = l.hits[1];
      }
    }
    for (const h of l.hits) {
      const key = `${h.p.name}@${bucket(l.t)}`;
      if (!mover || h === mover) kept.add(key); else dropped.add(key);
    }
    if (!mover) continue;
    const err = overlaps.find((e) => e.player === mover!.p.name && Math.abs(e.timestamp - l.t) <= 2500);
    if (!err) continue;
    const away = waveOutside(wave, mover.p.name, mover.b)!;
    const hit = waveFatalHit(mover.p, deathEvents, l.t);
    const other = l.hits.find((h) => h !== mover)!.p.name;
    rewrite.set(err, {
      ...err,
      severity: hit !== undefined ? "Major" : err.severity,
      description: `${err.description} ${mover.p.name}'s line was ~${Math.round(away)}° outside its usual spot while ${other}'s was on theirs: ${mover.p.name} moved into it.` +
        (hit !== undefined ? ` The Magic Vulnerability Up from it was still on when ${mover.p.name}'s own next line killed them.` : ""),
    });
  }
  const out: PullError[] = [];
  for (const e of errors) {
    if (e.ruleId === TOP1_WAVE_CANNON_RULE_ID && e.name === "Wave Cannon Overlap" && e.player) {
      const key = `${e.player}@${bucket(e.timestamp)}`;
      if (dropped.has(key) && !kept.has(key)) continue;
    }
    out.push(rewrite.get(e) ?? e);
  }
  return out;
}

/**
 * Both of a round's holders took a tether and one previous holder's stayed
 * put (omega.ts tags the thief's "Took Another's Tether" with that holder,
 * KEPT_TAG). By the holder priority the earlier new holder owes the tether
 * of the previous holder who stands first in the clockwise scan; whoever
 * owed the kept tether is at fault, and a taker who ended on theirs is
 * dropped (user, 2026-11-02, nbKLdqJkapxmNfzt Pull 16 0:56.1: "The RDM
 * should be taking the west tether. WAR is flexing, which results in them
 * being required to take the southern tether... The WAR takes the correct
 * tether, and RDM is incorrect"). Unchanged when the fits disagree.
 */
function applyKeptTether(
  errors: PullError[], players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], loop: LoopPriority | undefined,
): PullError[] {
  const tagged = errors.filter((e) => e.ruleId === TOP1_BLASTER_RULE_ID && e.name === TOOK_ANOTHERS_NAME && e.description.includes(KEPT_TAG));
  if (!loop || !tagged.length) return errors;
  const rounds = readProgramLoop(players, deathEvents, enemyCasts) ?? [];
  const drop = new Set<PullError>();
  const rewrite = new Map<PullError, PullError>();
  for (const e of tagged) {
    const thief = e.player!;
    const v = players.find((p) => p.name !== thief && e.description.includes(`took the tether ${p.name} had taken`))?.name;
    const keptName = e.description.slice(e.description.indexOf(KEPT_TAG) + KEPT_TAG.length).split("]")[0];
    const idx = rounds.findIndex((r) => Math.abs(r.t - e.timestamp) <= 1500);
    const prior = idx > 0 ? rounds[idx - 1].holders : [];
    const K = prior.find((h) => h.name === keptName), P = prior.find((h) => h.name !== keptName);
    const victim = errors.find((x) => x.timestamp === e.timestamp && x.player === v && x.name === "Tether Not Taken");
    if (!v || !K || !P || prior.length !== 2 || !victim) continue;
    const cK = cardinalOf(K.bearing), cP = cardinalOf(P.bearing);
    if (cK === cP) continue;
    const verdicts = new Set<string>();
    for (const { order, start } of loop.fits) {
      const rank = new Map(order.map((n, i) => [n, i]));
      if (!rank.has(v) || !rank.has(thief)) { verdicts.add("?"); continue; }
      const vFirst = rank.get(v)! < rank.get(thief)!;
      const kFirst = scanPos(cK, start) < scanPos(cP, start);
      verdicts.add(vFirst === kFirst ? v : thief); // who owed the kept tether
    }
    if (verdicts.size !== 1 || verdicts.has("?") || !verdicts.has(v)) continue;
    drop.add(e);
    rewrite.set(victim, {
      ...victim,
      description: `${victim.description} Holder priority (${loop.agree}/${loop.rounds} rounds): ${v} owed the ${CARDINAL[cK]} tether and ${thief} the ${CARDINAL[cP]} one, which ${thief} took.`,
    });
  }
  // The tag is for this function only.
  const untag = (e: PullError) => tagged.includes(e) ? { ...e, description: e.description.slice(0, e.description.indexOf(KEPT_TAG)) } : e;
  return errors.filter((e) => !drop.has(e)).map((e) => untag(rewrite.get(e) ?? e));
}

/**
 * Both In Line players in one tower (omega.ts names both, SAME_TOWER_NAME):
 * by the learned tower priority, the one whose tower was the empty one is
 * at fault and the other is dropped (user, 2026-10-30, KCX2qW4khczmZ9T1
 * Pull 17 0:37.7: "GNB is incorrect here. SGE was taking the correct
 * tower"). The empty tower's cardinal is the one neither the soaked tower
 * nor a Blaster holder took (each holder within HOLDER_SPOT_DEG of a
 * distinct free cardinal); the Obliteration's cast spot can repeat the
 * previous round's (KCX2qW4khczmZ9T1 Pulls 29, 40). Both stay named when
 * the holders don't pin it or the fits disagree.
 */
function applyTowerPriority(
  errors: PullError[], players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], tower: LoopPriority | undefined,
): PullError[] {
  const same = errors.filter((e) => e.ruleId === TOP1_TOWER_RULE_ID && e.name === SAME_TOWER_NAME);
  if (!tower || !same.length) return errors;
  const rounds = readProgramLoop(players, deathEvents, enemyCasts) ?? [];
  const drop = new Set<PullError>();
  const rewrite = new Map<PullError, PullError>();
  for (const t of [...new Set(same.map((e) => e.timestamp))]) {
    const pair = same.filter((e) => e.timestamp === t);
    const rd = rounds.find((r) => Math.abs(r.t - t) <= 1500);
    if (pair.length !== 2 || !rd) continue;
    const soaked = new Set(rd.soaks.filter((s) => pair.some((e) => e.player === s.name)).map((s) => s.card));
    if (soaked.size !== 1) continue;
    const s = [...soaked][0];
    const held = rd.holders.map((x) => [0, 1, 2, 3].find((c) => offCardinal(x.bearing, c) <= HOLDER_SPOT_DEG));
    if (held.length !== 2 || held.some((c) => c === undefined || c === s) || held[0] === held[1]) continue;
    const empty = [0, 1, 2, 3].filter((c) => c !== s && !held.includes(c));
    if (empty.length !== 1) continue;
    const [a, b] = pair.map((e) => e.player!);
    const verdicts = new Set<string>();
    for (const { order, start } of tower.fits) {
      const rank = new Map(order.map((n, i) => [n, i]));
      if (!rank.has(a) || !rank.has(b)) { verdicts.add("?"); continue; }
      const [first] = [s, empty[0]].sort((x, y) => scanPos(x, start) - scanPos(y, start));
      const aFirst = rank.get(a)! < rank.get(b)!;
      // The earlier one in the fit's order owns the first tower of the scan.
      const aOwnsEmpty = (aFirst ? first : (first === s ? empty[0] : s)) === empty[0];
      verdicts.add(aOwnsEmpty ? a : b);
    }
    if (verdicts.size !== 1 || verdicts.has("?")) continue;
    const wrong = [...verdicts][0];
    for (const e of pair) {
      if (e.player !== wrong) { drop.add(e); continue; }
      rewrite.set(e, {
        ...e,
        name: "Wrong Tower",
        description: `${e.description.replace(/ Either could have moved\./, "")} By the tower priority (${tower.agree}/${tower.rounds} rounds), ${wrong}'s was the ${CARDINAL[empty[0]]} tower, left empty; the other was in theirs.`,
      });
    }
  }
  if (!drop.size && !rewrite.size) return errors;
  return errors.filter((e) => !drop.has(e)).map((e) => rewrite.get(e) ?? e);
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
          description: `${e.description.replace(/ One should have (crossed|flexed); the log can't say which\./, "")} By the conga (${conga.fits}/${conga.pulls} splits), ${wrong} belonged on the other side; ${right} was right.`,
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
        description: `${e.description} Holder priority (${loop.agree}/${loop.rounds} rounds) put ${wrong} ${CARDINAL[wrongCard]}; the other was in place.`,
      });
    }
  }
  if (!drop.size && !rewrite.size) return errors;
  return errors.filter((e) => !drop.has(e)).map((e) => rewrite.get(e) ?? e);
}

/**
 * Both of a round's holders took one tether while the other stayed on its
 * previous holder: omega.ts names the later taker. The hand-off pairs by
 * the conga: the earlier new holder takes the earlier previous holder's
 * tether (247 of 254 clean hand-offs over hjgk42MDf81arFVY,
 * LG64YVQy2KZbtpN8 and 2qgaAkxVypGWv9CN). So the one whose tether stayed
 * put is at fault, whoever took last (user, 2026-10-28, hjgk42MDf81arFVY
 * Pull 36 0:38.1: "The MNK took the wrong tether, leaving the SCH without
 * one", the MNK first; LG64YVQy2KZbtpN8 Pull 45 0:46.9, the DNC last).
 */
function applyTetherPairing(
  errors: PullError[], players: PlayerInfo[], enemyCasts: EnemyEvent[], conga: PantokratorConga,
): PullError[] {
  const shared = errors.filter((e) => e.ruleId === TOP1_BLASTER_RULE_ID && e.name === TOOK_ANOTHERS_NAME && e.description.includes(STAYED_PUT));
  if (!conga.orders.length || !shared.length) return errors;
  const num = readLoopNumbers(players, enemyCasts);
  if (!num) return errors;
  const rewrite = new Map<PullError, PullError>();
  for (const e of shared) {
    const later = e.player!;
    const first = players.find((p) => p.name !== later && e.description.includes(`took ${p.name}'s tether`))?.name;
    const stuck = players.find((p) => e.description.includes(`instead of ${p.name}'s`))?.name;
    const other = stuck && [...num].find(([n, k]) => n !== stuck && k === num.get(stuck))?.[0];
    if (!first || !stuck || !other) continue;
    const verdicts = new Set<string>();
    for (const order of conga.orders) {
      const rank = new Map(order.map((n, i) => [n, i]));
      if ([first, later, stuck, other].some((n) => !rank.has(n))) { verdicts.add("?"); continue; }
      const stuckEarlier = rank.get(stuck)! < rank.get(other)!;
      const firstEarlier = rank.get(first)! < rank.get(later)!;
      verdicts.add(stuckEarlier === firstEarlier ? first : later);
    }
    if (verdicts.size !== 1 || verdicts.has("?")) continue;
    const wrong = [...verdicts][0];
    const right = wrong === first ? later : first;
    rewrite.set(e, wrong === later
      ? { ...e, description: `${e.description} By the conga, ${stuck}'s was theirs and ${other}'s was ${right}'s.` }
      : playerError(players.find((x) => x.name === wrong)!, {
        ruleId: e.ruleId, severity: e.severity, name: e.name,
        description: e.description.replace(/ took .*?, which stayed put\./, ` took ${other}'s tether, which by the conga was ${right}'s, while ${stuck}'s, theirs, ${STAYED_PUT}; ${right} took it from them.`),
        timestamp: e.timestamp, abilityId: e.abilityId, abilityName: e.abilityName,
      }));
  }
  if (!rewrite.size) return errors;
  return errors.map((e) => rewrite.get(e) ?? e);
}
