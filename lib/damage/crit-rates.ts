// lib/damage/crit-rates.ts
//
// Each FFXIV player's crit rate, direct-hit rate and crit multiplier, the
// inputs for crit luck (how far a pull's damage sat from what the same
// rotation averages). FFLogs has real gear stats only for the player who
// recorded the log (ACT's PlayerStats line); for everyone else the rates
// are estimated from their own hits across the loaded pulls:
//   - no DoT ticks: FFLogs simulates FFXIV ticks at their expected value
//     and never marks one a crit (Combust III: 0 of 4782 on jN3XDrf2z8PmLgRJ)
//   - no abilities averaging under 100 a hit (healer auto-attacks hit for 1)
//   - only hits that roll normally: damage > 0, hitType 1 (normal) or
//     2 (crit), no crit / direct-hit buff in the hit's status snapshot
//     (Battle Litany, Chain Stratagem, Devilment, Battle Voice, from the
//     game's party-buff table) and no guaranteed-crit status (Life Surge
//     and the like: GUARANTEED_STATUS_KEYS)
//   - abilities that always crit or always direct-hit (Starfall Dance) are
//     left out: 95%+ over 5+ hits
//   - crit multiplier: per ability, the mean crit hit over the mean normal
//     hit (both without direct hit, each ÷ its FFLogs multiplier so damage
//     buffs cancel), weighted by crit hits, abilities with 3+ of each
// The ±5% roll averages out. Checked against the logger's real stats on
// jN3XDrf2z8PmLgRJ (scripts/validate.js crit-rates).

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { DamageGame } from "./types";

export type HitRates = {
  crit:      number;   // 0-1
  directHit: number;   // 0-1
  critMult:  number;   // e.g. 1.594
  hits:      number;   // hits the rates came from
  source:    "stats" | "estimate";
};

// Level 100 stat formulas (sub 420, div 2780).
const SUB = 420, DIV = 2780;
export function ratesFromStats(criticalHit: number, directHit: number): Omit<HitRates, "hits" | "source"> {
  return {
    crit:      Math.floor((200 * (criticalHit - SUB)) / DIV + 50) / 1000,
    critMult:  Math.floor((200 * (criticalHit - SUB)) / DIV + 1400) / 1000,
    directHit: Math.floor((550 * (directHit - SUB)) / DIV) / 1000,
  };
}

// An estimate from fewer hits is too loose for crit luck: one pull's
// ~150-300 unbuffed hits put the crit rate ±3% out, which moved the kill's
// percentiles 30-60 points (Kade 76th pooled, 18th from the kill alone).
// About 8-10 pulls.
export const MIN_ESTIMATE_HITS = 2_000;

export const reliableRates = (r: HitRates) => r.source === "stats" || r.hits >= MIN_ESTIMATE_HITS;

/** The log recorder's real stats when the log has them, else the estimate. */
export function playerHitRates(players: PlayerInfo[], game: DamageGame, guaranteedStatusIds: Set<number>): HitRates | undefined {
  const stats = players.find((p) => p.stats)?.stats;
  if (stats) return { ...ratesFromStats(stats.criticalHit, stats.directHit), hits: 0, source: "stats" };
  return estimateHitRates(players, game, guaranteedStatusIds);
}

const ALWAYS_SHARE = 0.95;
const ALWAYS_MIN_HITS = 5;
const MULT_MIN_EACH = 3;
const MIN_MEAN_HIT = 100;

/**
 * Estimates one player's rates from their hits in several pulls (the same
 * player, by name). guaranteedStatusIds: statuses that force a crit or
 * direct hit on the hit carrying them.
 */
export function estimateHitRates(players: PlayerInfo[], game: DamageGame, guaranteedStatusIds: Set<number>): HitRates | undefined {
  const rateBuff = (id: number) => {
    const b = game.partyBuff(id);
    return b !== undefined && ((b.crit ?? 0) > 0 || (b.directHit ?? 0) > 0);
  };
  const hits = players.flatMap((p) => p.damageDone).filter((e) =>
    (e.amount ?? 0) > 0 && (e.hitType === 1 || e.hitType === 2) &&
    !e.isDoT && !game.isTickAbility(e.abilityId) &&
    !(e.statusIds ?? []).some((id) => rateBuff(id) || guaranteedStatusIds.has(id)));

  // Abilities that always crit / direct-hit don't roll.
  const byAbility = new Map<number, typeof hits>();
  for (const e of hits) byAbility.set(e.abilityId, [...(byAbility.get(e.abilityId) ?? []), e]);
  const rolls = new Set<number>();
  for (const [id, list] of byAbility) {
    // Healer auto-attacks hit for 1: their crits change nothing.
    if (list.reduce((a, e) => a + (e.amount ?? 0), 0) / list.length < MIN_MEAN_HIT) continue;
    const c = list.filter((e) => e.hitType === 2).length / list.length;
    const d = list.filter((e) => e.directHit).length / list.length;
    if (list.length >= ALWAYS_MIN_HITS && (c >= ALWAYS_SHARE || d >= ALWAYS_SHARE)) continue;
    rolls.add(id);
  }
  const rolled = hits.filter((e) => rolls.has(e.abilityId));
  if (rolled.length === 0) return undefined;

  // Crit multiplier from same-ability comparisons, without direct hits.
  let weighted = 0, weight = 0;
  for (const id of rolls) {
    const list = (byAbility.get(id) ?? []).filter((e) => !e.directHit);
    const norm = (e: (typeof list)[number]) => (e.amount ?? 0) / (e.multiplier || 1);
    const crits = list.filter((e) => e.hitType === 2), normals = list.filter((e) => e.hitType === 1);
    if (crits.length < MULT_MIN_EACH || normals.length < MULT_MIN_EACH) continue;
    const mean = (l: typeof list) => l.reduce((a, e) => a + norm(e), 0) / l.length;
    weighted += (mean(crits) / mean(normals)) * crits.length;
    weight += crits.length;
  }

  return {
    crit:      rolled.filter((e) => e.hitType === 2).length / rolled.length,
    directHit: rolled.filter((e) => e.directHit).length / rolled.length,
    critMult:  weight > 0 ? weighted / weight : 1.5,
    hits:      rolled.length,
    source:    "estimate",
  };
}
