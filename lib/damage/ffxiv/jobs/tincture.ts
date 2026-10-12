// lib/damage/ffxiv/jobs/tincture.ts
//
// Tinctures (every job). xivanalysis judges a tincture window by a per-job
// list of actions expected inside it (DRK: three Delirium GCDs, two
// Bloodspillers, five Edges...; PLD: 12 GCDs). Those lists are patch- and
// job-specific. This check asks the question the lists stand for, valued
// from the log: given the player's damage as played, where would the same
// number of tinctures have covered the most, and is there room for one
// more?
//
// - Windows: the Medicated status on the player, 30s. A removal with no
//   application before it was a pre-pull tincture (start = removal − 30s).
// - Damage under a window: every hit the player and their pets dealt in
//   it, DoT ticks included, minus hits in forced windows (past a phase's
//   HP check the damage was wasted). Crit and direct-hit luck is taken out
//   of each hit (actual multiplier → expected one, from the player's
//   estimated rates plus the crit/DH buffs in the hit's snapshot), so a
//   window doesn't win because its crits rolled well. Hits with a
//   guaranteed crit, and abilities that always crit, are left as dealt.
// - Best placement: the same number of 30s windows on a 1s grid, starts at
//   least 270s apart (the tincture recast), the first as early as 3s before
//   the pull. Dynamic programming over the start times.
// - Bonus: measured from the player's own hits, the median over abilities
//   of (median non-crit non-DH hit ÷ FFLogs multiplier with Medicated) ÷
//   (the same without); FFLogs' multiplier doesn't include a main-stat
//   buff. With fewer than BONUS_MIN_ABILITIES abilities, the party's median
//   measured bonus, else BONUS_DEFAULT. dDar482XvFKBPJYh FRU kill (7.1,
//   Grade 2 Gemdraughts): 4.8-6.4% for the six players with 7+ abilities.
// - Lost = (best − actual) × bonus, and (best with one more − best) ×
//   bonus for the extra tincture. Pulls with no tincture are skipped: in
//   prog, not drinking is a choice about cost, not play.
// Marked inference: it assumes the rotation would have been the same.

import type { PlayerEvent, PlayerInfo } from "@/types/PlayerInfo";
import type { Pull } from "@/types/Pull";
import type { DamageFinding, DamageGame, JobCheck } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { estimateHitRates } from "../../crit-rates";
import { inWindows, mergeWindows, type Window } from "../../timeline";
import { XIVA_STATUSES as S } from "../xiva-data";
import { k } from "./shared";

const MEDICATED = S.MEDICATED.id;
const DURATION_MS = 30_000;
const RECAST_MS = 270_000;
const EARLIEST_MS = -3_000;
const STEP_MS = 1_000;
const BONUS_MIN_ABILITIES = 5;
const BONUS_DEFAULT = 0.05;
const DH_MULT = 1.25;
const ALWAYS_SHARE = 0.95;
const ALWAYS_MIN_HITS = 5;
// A moved tincture under this share of its window's damage is noise.
const MOVE_MIN_SHARE = 0.02;
const GUARANTEED = new Set(
  ["LIFE_SURGE", "INNER_RELEASE", "REASSEMBLED"].map((x) => S[x]?.id).filter((id): id is number => id !== undefined),
);

const clock = (ms: number) => {
  const neg = ms < 0;
  const t = Math.round(Math.abs(ms) / 1000);
  return `${neg ? "-" : ""}${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

/** Medicated windows on the player; a pre-pull one starts before 0. */
export function tinctureWindows(player: PlayerInfo, endMs: number): Window[] {
  const out: Window[] = [];
  let open: number | undefined;
  for (const e of [...(player.buffs ?? [])].sort((a, b) => a.timestamp - b.timestamp)) {
    if (e.abilityId !== MEDICATED) continue;
    if (e.buffStatus === "removed") {
      out.push({ startMs: open ?? e.timestamp - DURATION_MS, endMs: e.timestamp });
      open = undefined;
    } else if (e.buffStatus === "applied" && open === undefined) {
      open = e.timestamp;
    }
  }
  if (open !== undefined) out.push({ startMs: open, endMs: Math.min(open + DURATION_MS, endMs) });
  return out;
}

function measuredBonus(player: PlayerInfo, windows: Window[]): { bonus: number; abilities: number } {
  const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const by = new Map<number, { on: number[]; off: number[] }>();
  for (const e of player.damageDone) {
    if (e.pet || e.isDoT || !(e.amount && e.amount > 0) || e.hitType !== 1 || e.directHit || !e.multiplier) continue;
    const s = by.get(e.abilityId) ?? { on: [], off: [] };
    (inWindows(e.timestamp, windows) ? s.on : s.off).push(e.amount / e.multiplier);
    by.set(e.abilityId, s);
  }
  const ratios = [...by.values()].filter((s) => s.on.length >= 2 && s.off.length >= 2).map((s) => med(s.on) / med(s.off));
  return { bonus: ratios.length ? med(ratios) - 1 : 0, abilities: ratios.length };
}

const partyBonusCache = new WeakMap<Pull, number | undefined>();
function partyBonus(pull: Pull, endMs: number): number | undefined {
  if (partyBonusCache.has(pull)) return partyBonusCache.get(pull);
  const xs = pull.players
    .map((p) => measuredBonus(p, tinctureWindows(p, endMs)))
    .filter((m) => m.abilities >= BONUS_MIN_ABILITIES)
    .map((m) => m.bonus)
    .sort((a, b) => a - b);
  const out = xs.length ? xs[Math.floor(xs.length / 2)] : undefined;
  partyBonusCache.set(pull, out);
  return out;
}

/** Each hit's damage with crit/DH luck replaced by its expectation. */
function unluckyAmounts(player: PlayerInfo, game: DamageGame, hits: PlayerEvent[]): number[] {
  const rates = estimateHitRates([player], game, GUARANTEED);
  if (!rates) return hits.map((e) => e.amount ?? 0);
  const always = new Set<number>();
  const by = new Map<number, { n: number; c: number }>();
  for (const e of hits) {
    if (e.isDoT || !(e.amount && e.amount > 0)) continue;
    const s = by.get(e.abilityId) ?? { n: 0, c: 0 };
    s.n++; if (e.hitType === 2) s.c++;
    by.set(e.abilityId, s);
  }
  for (const [id, s] of by) if (s.n >= ALWAYS_MIN_HITS && s.c / s.n >= ALWAYS_SHARE) always.add(id);
  return hits.map((e) => {
    const amt = e.amount ?? 0;
    if (amt <= 0 || e.isDoT || game.isTickAbility(e.abilityId) || always.has(e.abilityId) ||
      (e.statusIds ?? []).some((id) => GUARANTEED.has(id))) return amt;
    let crit = rates.crit, dh = rates.directHit;
    for (const id of e.statusIds ?? []) {
      const b = game.partyBuff(id);
      crit += b?.crit ?? 0;
      dh += b?.directHit ?? 0;
    }
    crit = Math.min(1, crit); dh = Math.min(1, dh);
    const actual = (e.hitType === 2 ? rates.critMult : 1) * (e.directHit ? DH_MULT : 1);
    const expected = (1 + crit * (rates.critMult - 1)) * (1 + dh * (DH_MULT - 1));
    return (amt / actual) * expected;
  });
}

type Placement = { total: number; starts: number[] };

/** The best n windows on the grid (bin i starts at EARLIEST_MS + i × STEP_MS). */
function bestPlacement(prefix: Float64Array, bins: number, n: number): Placement | undefined {
  const per = DURATION_MS / STEP_MS, gap = RECAST_MS / STEP_MS;
  const W = (t: number) => prefix[Math.min(bins, t + per)] - prefix[t];
  let prev = new Float64Array(bins).fill(0);
  const takes: Uint8Array[] = [];
  for (let j = 1; j <= n; j++) {
    const cur = new Float64Array(bins).fill(-Infinity);
    const take = new Uint8Array(bins);
    for (let t = 0; t < bins; t++) {
      const before = j === 1 ? 0 : t - gap >= 0 ? prev[t - gap] : -Infinity;
      const withIt = before === -Infinity ? -Infinity : W(t) + before;
      const without = t > 0 ? cur[t - 1] : -Infinity;
      if (withIt > without) { cur[t] = withIt; take[t] = 1; } else cur[t] = without;
    }
    takes.push(take);
    prev = cur;
  }
  if (!(prev[bins - 1] > -Infinity)) return undefined;
  const starts: number[] = [];
  let t = bins - 1;
  for (let j = n; j >= 1; j--) {
    while (t >= 0 && !takes[j - 1][t]) t--;
    if (t < 0) return undefined;
    starts.unshift(t);
    t -= gap;
  }
  return { total: prev[bins - 1], starts };
}

export const tincture: JobCheck = (ctx: PlayerCheckContext): DamageFinding[] => {
  const windows = tinctureWindows(ctx.player, ctx.endMs).filter((w) => w.startMs < ctx.endMs);
  if (windows.length === 0) return [];

  const forced = mergeWindows(ctx.forced);
  const hits = ctx.player.damageDone.filter((e) => e.timestamp < ctx.endMs && !inWindows(e.timestamp, forced));
  const amounts = unluckyAmounts(ctx.player, ctx.game, hits);
  const earliest = Math.min(EARLIEST_MS, ...windows.map((w) => w.startMs));
  const bins = Math.max(1, Math.ceil((ctx.endMs - earliest) / STEP_MS));
  const series = new Float64Array(bins);
  hits.forEach((e, i) => { series[Math.min(bins - 1, Math.floor((e.timestamp - earliest) / STEP_MS))] += amounts[i]; });
  const prefix = new Float64Array(bins + 1);
  for (let i = 0; i < bins; i++) prefix[i + 1] = prefix[i] + series[i];
  const per = DURATION_MS / STEP_MS;
  const binOf = (ms: number) => Math.max(0, Math.floor((ms - earliest) / STEP_MS));
  const cover = (bin: number) => prefix[Math.min(bins, bin + per)] - prefix[Math.min(bins, bin)];
  const atMs = (bin: number) => earliest + bin * STEP_MS;

  const own = measuredBonus(ctx.player, windows);
  const party = partyBonus(ctx.pull, ctx.endMs);
  const bonus = own.abilities >= BONUS_MIN_ABILITIES ? own.bonus : party ?? BONUS_DEFAULT;
  const bonusBasis = own.abilities >= BONUS_MIN_ABILITIES
    ? `+${(bonus * 100).toFixed(1)}%, measured from ${own.abilities} abilities' hits with and without Medicated`
    : party !== undefined
      ? `+${(bonus * 100).toFixed(1)}%, the party's median measured bonus (too few of this player's hits to measure)`
      : `+${(bonus * 100).toFixed(1)}% assumed (too few hits to measure)`;

  const actualBins = windows.map((w) => binOf(w.startMs));
  const actual = actualBins.reduce((a, b) => a + cover(b), 0);
  const best = bestPlacement(prefix, bins, windows.length);
  const more = bestPlacement(prefix, bins, windows.length + 1);
  const out: DamageFinding[] = [];

  // What the player cast first in a window, to say where it would start.
  const firstCast = (ms: number) => ctx.player.casts.find((c) => c.timestamp >= ms && ctx.game.action(c.abilityId)?.onGcd)?.abilityName;

  if (best && best.total > actual) {
    const moments = actualBins.map((b, i) => {
      const to = best.starts[i];
      const gain = cover(to) - cover(b);
      return { from: b, to, gain };
    }).filter((m) => Math.abs(m.to - m.from) >= 3 && m.gain > Math.max(1, cover(m.from)) * MOVE_MIN_SHARE);
    if (moments.length > 0) {
      const lost = (best.total - actual) * bonus;
      out.push(finding(ctx, {
        kind: "tincture", startMs: Math.max(0, windows[0].startMs), endMs: windows[windows.length - 1].endMs,
        forced: false, inference: true,
        label: "Tincture timing",
        lostDamage: lost,
        basis: `${k(best.total)} vs ${k(actual)} damage under the tinctures (crit/DH luck removed, as played), × ${bonusBasis}`,
        detail: `${windows.length === 1 ? "The tincture" : `${windows.length} tinctures`} at ${actualBins.map((b) => clock(atMs(b))).join(", ")}` +
          ` covered ${k(actual)}; at ${best.starts.map((b) => clock(atMs(b))).join(", ")} they'd have covered ${k(best.total)}`,
        moments: moments.map((m) => ({
          startMs: Math.max(0, atMs(m.from)), endMs: Math.max(0, atMs(m.from)) + DURATION_MS,
          lostDamage: m.gain * bonus,
          detail: `tincture at ${clock(atMs(m.from))} (${k(cover(m.from))} under it) → ${clock(atMs(m.to))}` +
            `${firstCast(atMs(m.to)) ? `, before ${firstCast(atMs(m.to))}` : ""} (${k(cover(m.to))})`,
        })),
      }));
    }
  }
  if (best && more && more.total > best.total) {
    const gain = more.total - best.total;
    out.push(finding(ctx, {
      kind: "tincture", startMs: Math.max(0, atMs(more.starts[0])), endMs: Math.max(0, atMs(more.starts[0])) + DURATION_MS,
      forced: false, inference: true,
      label: "Room for another tincture",
      lostDamage: gain * bonus,
      basis: `${k(gain)} more damage covered by ${windows.length + 1} tinctures at ${more.starts.map((b) => clock(atMs(b))).join(", ")}` +
        ` (270s recast, crit/DH luck removed), × ${bonusBasis}`,
      detail: `Room for ${windows.length + 1} tinctures (${windows.length} used): ${more.starts.map((b) => clock(atMs(b))).join(", ")}`,
    }));
  }
  return out;
};
