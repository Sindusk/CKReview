// lib/damage/wow/haste.ts
//
// The GCD a WoW player could have pressed at each moment, from the pull
// itself (DamageGame.speedModels). WoW haste changes inside a pull:
// Bloodlust and Power Infusion, but also spec procs (Destruction's Reverse
// Entropy) and gear procs (trinkets), and haste sources multiply. The
// generic speedProfile (timeline.ts) has one GCD inside lust / Power
// Infusion and one outside; on qpZx3mWaG7gcDdYB pull 3 the outside value
// sat at the slow end, so delays during procs went uncounted.
//
// ── The fit (per player) ───────────────────────────────────────────────
// Observations, on a log scale:
// - hard casts: cast time (begin → land), one intercept per spell. Cast
//   time scales exactly with haste and nothing the player does changes it,
//   so casters' haste comes out clean.
// - instants: the interval to the next GCD, back to back only (0.7–1.6s),
//   and only the faster 40% of those within ±20s: the slower ones carry
//   the player's own delays. Abilities with a shorter GCD of their own
//   (Sweeping Strikes, Execution Sentence: ~0.74s) are left out.
// Model: log(observation) = intercept − Σ log(1 + haste of each active
// candidate buff). Candidates are the lust family, Power Infusion and
// WOW_HASTE_STATUSES; greedy forward selection keeps one while it cuts the
// squared error by 3% or more and its factor is under 0.97 (so a buff that
// doesn't speed anything up is never charged for).
// Validation on qpZx3mWaG7gcDdYB pull 3: Time Warp fits ×0.73–0.89 across
// 16 players (median ~0.78; +30% haste is ×0.77), Power Infusion ×0.84–0.86
// (+20% is ×0.83).
//
// The GCD at t = the instants' intercept × the factors active at t, kept
// within 0.75–1.5s, and never faster than the fastest back-to-back
// instant the player pressed within ±15s (when there are 3+): haste the
// list doesn't know about lands in the intercept, which would otherwise
// make every stretch without it look slow (Polpo, before Avenging Wrath
// was listed: base 1050ms, rating says ~1240ms). With the cap, a missing
// haste source can only make the model lenient. A player with too few instants for an intercept (most
// casters' GCD-side evidence is casts) takes their base from their haste
// rating, rating → haste calibrated on the same pull from the players
// that have both (rating ÷ C = haste %; Midnight's C isn't published, and
// the old level-90 tables are from Mists of Pandaria).
//
// The base is the player's own pace, so a slow rhythm all pull sets a slow
// base; lib/damage/pace.ts compares it with same-spec players' bases.
//
// The fit runs on the buffs in the player-buff stream; haste-statuses.ts
// lists the measured haste buffs the stream keeps (gear procs included).

import type { Pull } from "@/types/Pull";
import type { PlayerInfo } from "@/types/PlayerInfo";
import { inWindows, statusWindows, type GcdUse, type Window } from "../timeline";

export { WOW_HASTE_STATUS_IDS } from "./haste-statuses";

export type SpeedModel = {
  factor: number;               // base GCD ÷ 1.5s, with no candidate buff active
  at(t: number): number;        // GCD ÷ 1.5s for a GCD starting at t
  terms: { id: number; factor: number }[];
  baseFrom: "instants" | "rating";
  // The haste buffs' product at t (no clamp, no local floor): the GCD
  // without the player's own pace is base × this.
  hasteAt(t: number): number;
  // Rating ÷ haste % on this pull (the calibration above), when 3+ players
  // gave one. The same-spec pace check (lib/damage/pace.ts) scales by it.
  ratingC?: number;
};

const BASE_MS = 1_500;
const FLOOR_MS = 750;
const MIN_INSTANTS = 15;
const MAX_TERMS = 6;
const LOCAL_MS = 15_000;

/** Speed models for every hasted WoW player in the pull (none for fixed 1.0s GCD specs). */
export function wowSpeedModels(
  pull: Pull, usesOf: Map<string, GcdUse[]>, endMs: number, candidateIds: number[],
): Map<string, SpeedModel> {
  const fits = new Map<string, { player: PlayerInfo; fit: Fit }>();
  for (const p of pull.players) {
    const uses = usesOf.get(p.name) ?? [];
    const scaled = uses.filter((u) => u.action.speedScaled).length;
    if (uses.length < 20 || scaled < uses.length / 2) continue;
    const fit = fitPlayer(p, uses, endMs, candidateIds);
    if (fit) fits.set(p.name, { player: p, fit });
  }
  // rating → haste: C per player = rating ÷ haste % at their fitted base
  const cs = [...fits.values()]
    .filter((x) => x.fit.baseMs !== undefined && x.player.hasteRating && x.fit.baseMs < BASE_MS)
    .map((x) => x.player.hasteRating! / ((BASE_MS / x.fit.baseMs! - 1) * 100))
    .sort((a, b) => a - b);
  const c = cs.length >= 3 ? cs[Math.floor(cs.length / 2)] : undefined;

  const out = new Map<string, SpeedModel>();
  for (const { player, fit } of fits.values()) {
    let baseMs = fit.baseMs, baseFrom: SpeedModel["baseFrom"] = "instants";
    if (baseMs === undefined && c !== undefined && player.hasteRating !== undefined) {
      baseMs = BASE_MS / (1 + player.hasteRating / c / 100);
      baseFrom = "rating";
    }
    if (baseMs === undefined) continue;
    const base = clampMs(baseMs);
    const terms = fit.terms;
    const local = fit.instants;
    const floorAt = (t: number) => {
      let lo = 0, hi = local.length;
      while (lo < hi) { const m = (lo + hi) >> 1; if (local[m].t < t - LOCAL_MS) lo = m + 1; else hi = m; }
      let min = Infinity, n = 0;
      for (let i = lo; i < local.length && local[i].t <= t + LOCAL_MS; i++) { min = Math.min(min, local[i].iv); n++; }
      return n >= 3 ? min : 0;
    };
    out.set(player.name, {
      factor: base / BASE_MS,
      at: (t) => clampMs(Math.max(floorAt(t), terms.reduce((g, x) => (inWindows(t, x.windows) ? g * x.factor : g), base))) / BASE_MS,
      terms: terms.map((x) => ({ id: x.id, factor: x.factor })),
      baseFrom,
      hasteAt: (t) => terms.reduce((g, x) => (inWindows(t, x.windows) ? g * x.factor : g), 1),
      ratingC: c,
    });
  }
  return out;
}

const clampMs = (ms: number) => Math.min(BASE_MS, Math.max(FLOOR_MS, ms));

type Fit = {
  baseMs?:  number;
  terms:    { id: number; factor: number; windows: Window[] }[];
  instants: { t: number; iv: number }[];   // back-to-back instants (no short-GCD abilities), by time
};

function fitPlayer(player: PlayerInfo, uses: GcdUse[], endMs: number, candidateIds: number[]): Fit | undefined {
  // Back-to-back instant intervals, without abilities that have their own
  // shorter GCD (their median interval well under the player's).
  const raw: { t: number; iv: number; id: number }[] = [];
  for (let i = 0; i + 1 < uses.length; i++) {
    const u = uses[i];
    if (u.castMs > 0 || !u.action.speedScaled) continue;
    const iv = uses[i + 1].startMs - u.startMs;
    if (iv >= 700 && iv <= 1_600) raw.push({ t: u.startMs, iv, id: u.action.id });
  }
  const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const overall = raw.length ? median(raw.map((x) => x.iv)) : 0;
  const byId = new Map<number, number[]>();
  for (const x of raw) (byId.get(x.id) ?? byId.set(x.id, []).get(x.id)!).push(x.iv);
  const short = new Set([...byId].filter(([, xs]) => xs.length >= 3 && median(xs) < overall * 0.85).map(([id]) => id));
  const inst = raw.filter((x) => !short.has(x.id));
  const fast = inst.filter((x) => {
    const near = inst.filter((y) => Math.abs(y.t - x.t) <= 20_000).map((y) => y.iv).sort((a, b) => a - b);
    return x.iv <= near[Math.floor(near.length * 0.4)];
  });

  type Obs = { y: number; g: string; t: number };
  const obs: Obs[] = fast.map((x) => ({ y: Math.log(x.iv), g: "i", t: x.t }));
  for (const u of uses) if (u.castMs > 300 && !u.statusLock) obs.push({ y: Math.log(u.castMs), g: `c${u.action.id}`, t: u.startMs });
  const counts = new Map<string, number>();
  for (const o of obs) counts.set(o.g, (counts.get(o.g) ?? 0) + 1);
  const groups = [...counts].filter(([g, n]) => n >= (g === "i" ? MIN_INSTANTS : 3)).map(([g]) => g);
  const data = obs.filter((o) => groups.includes(o.g));
  if (data.length < 20) return undefined;

  const cands = candidateIds
    .map((id) => ({ id, windows: statusWindows(player, new Set([id]), endMs) }))
    .filter((c) => c.windows.length > 0);
  const ind = new Map(cands.map((c) => [c.id, data.map((o) => (inWindows(o.t, c.windows) ? 1 : 0))]));
  const design = (sel: number[]) => data.map((o, r) => [...groups.map((g) => (o.g === g ? 1 : 0)), ...sel.map((id) => ind.get(id)![r])]);
  const y = data.map((o) => o.y);
  const sel: number[] = [];
  let cur = leastSquares(design(sel), y);
  while (sel.length < MAX_TERMS) {
    let best: { id: number; f: { b: number[]; sse: number } } | undefined;
    for (const c of cands) {
      if (sel.includes(c.id)) continue;
      const on = ind.get(c.id)!.reduce((a, v) => a + v, 0);
      if (on < 4 || on > data.length - 4) continue;
      const f = leastSquares(design([...sel, c.id]), y);
      if (!best || f.sse < best.f.sse) best = { id: c.id, f };
    }
    if (!best) break;
    const factor = Math.exp(best.f.b[groups.length + sel.length]);
    if (best.f.sse > cur.sse * 0.97 || factor > 0.97) break;
    sel.push(best.id);
    cur = best.f;
  }
  const gi = groups.indexOf("i");
  return {
    baseMs: gi >= 0 ? Math.exp(cur.b[gi]) : undefined,
    terms: sel.map((id, i) => ({ id, factor: Math.exp(cur.b[groups.length + i]), windows: cands.find((c) => c.id === id)!.windows })),
    instants: inst.map((x) => ({ t: x.t, iv: x.iv })),
  };
}

/** Ordinary least squares by the normal equations (k is small). */
function leastSquares(X: number[][], y: number[]): { b: number[]; sse: number } {
  const k = X[0].length;
  const A = Array.from({ length: k }, () => new Array<number>(k + 1).fill(0));
  for (let r = 0; r < X.length; r++) {
    for (let i = 0; i < k; i++) {
      A[i][k] += X[r][i] * y[r];
      for (let j = 0; j < k; j++) A[i][j] += X[r][i] * X[r][j];
    }
  }
  for (let i = 0; i < k; i++) A[i][i] += 1e-6;
  for (let col = 0; col < k; col++) {
    let p = col;
    for (let r = col + 1; r < k; r++) if (Math.abs(A[r][col]) > Math.abs(A[p][col])) p = r;
    [A[col], A[p]] = [A[p], A[col]];
    for (let r = 0; r < k; r++) {
      if (r === col) continue;
      const f = A[r][col] / A[col][col];
      for (let j = col; j <= k; j++) A[r][j] -= f * A[col][j];
    }
  }
  const b = A.map((row, i) => row[k] / row[i]);
  let sse = 0;
  for (let r = 0; r < X.length; r++) {
    let pred = 0;
    for (let i = 0; i < k; i++) pred += X[r][i] * b[i];
    sse += (y[r] - pred) ** 2;
  }
  return { b, sse };
}
