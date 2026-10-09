// lib/damage/crit-luck.ts
//
// Crit luck for one FFXIV player in one pull: where their damage sat among
// all the outcomes the same rotation could have rolled (the method of
// howbadwasmycritinxiv.com and the ffxiv_stats package). Pure.
//
// Every rolling hit independently crits (×critMult) with its crit chance
// and direct-hits (×1.25) with its direct-hit chance; crit and direct hit
// stack. Chances are the player's rates (lib/damage/crit-rates.ts) plus the
// crit / direct-hit buffs in the hit's status snapshot, capped at 100%. A
// hit's base damage is its amount with the outcome it actually got divided
// out. Then, per hit, E[X] = (1 − c + c·M)(1 − d + 1.25d) and
// E[X²] = (1 − c + c·M²)(1 − d + 1.5625d) times the ±5% roll's
// E[R²] = 1 + 0.1²/12. Summing several hundred independent hits gives a
// normal distribution to very good accuracy: mean = Σ base·E[X],
// variance = Σ base²·(E[X²]·E[R²] − E[X]²).
//
// Not rolled (counted at what they dealt): DoT ticks (FFLogs logs FFXIV
// ticks at their expected value), hits under a guaranteed crit, abilities
// that always crit or direct-hit, hits for 0. The actual roll in each base
// is part of what's measured, so the ±5% spread is approximate.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { DamageGame } from "./types";
import type { HitRates } from "./crit-rates";

export type CritLuck = {
  actual:      number;   // damage from rolling hits
  mean:        number;   // what those hits average
  sd:          number;
  percentile:  number;   // 0-1: share of outcomes below the actual
  hits:        number;
  crits:       number;   // crits that happened
  expectedCrits: number;
  directHits:  number;
  expectedDirectHits: number;
};

const DH_MULT = 1.25;
const ROLL_E2 = 1 + 0.1 ** 2 / 12;
const ALWAYS_SHARE = 0.95;

/** Standard normal CDF (Abramowitz & Stegun 7.1.26, error under 1.5e-7). */
function phi(z: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t *
    Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

export function critLuck(
  player: PlayerInfo, endMs: number, rates: HitRates, game: DamageGame, guaranteedStatusIds: Set<number>,
): CritLuck | undefined {
  const hits = player.damageDone.filter((e) => e.timestamp < endMs && (e.amount ?? 0) > 0 &&
    (e.hitType === 1 || e.hitType === 2) && !e.isDoT && !game.isTickAbility(e.abilityId) &&
    !(e.statusIds ?? []).some((id) => guaranteedStatusIds.has(id)));

  // Abilities that always crit or direct-hit (in this pull) don't roll.
  const byAbility = new Map<number, { n: number; c: number; d: number }>();
  for (const e of hits) {
    const a = byAbility.get(e.abilityId) ?? { n: 0, c: 0, d: 0 };
    a.n++; if (e.hitType === 2) a.c++; if (e.directHit) a.d++;
    byAbility.set(e.abilityId, a);
  }
  const always = (id: number) => {
    const a = byAbility.get(id)!;
    return a.n >= 3 && (a.c / a.n >= ALWAYS_SHARE || a.d / a.n >= ALWAYS_SHARE);
  };

  let actual = 0, mean = 0, variance = 0, n = 0, crits = 0, expCrits = 0, dhs = 0, expDh = 0;
  for (const e of hits) {
    if (always(e.abilityId)) continue;
    let c = rates.crit, d = rates.directHit;
    // Once per buff: a dance partner's hits list Devilment twice, and
    // counted twice it read +40% (observed: 26% → 47% crit, so +20%).
    // Calibration (validate.js crit-rates --calibrate): percentiles over
    // 438 player-pulls on jN3XDrf2z8PmLgRJ land 8-12% in each tenth.
    const seen = new Set<string>();
    for (const id of e.statusIds ?? []) {
      const b = game.partyBuff(id);
      if (!b || seen.has(b.name)) continue;
      seen.add(b.name);
      c += b.crit ?? 0;
      d += b.directHit ?? 0;
    }
    c = Math.min(1, c); d = Math.min(1, d);
    const crit = e.hitType === 2, dh = e.directHit === true;
    const amount = e.amount ?? 0;
    const base = amount / (crit ? rates.critMult : 1) / (dh ? DH_MULT : 1);
    const ex = (1 - c + c * rates.critMult) * (1 - d + d * DH_MULT);
    const ex2 = (1 - c + c * rates.critMult ** 2) * (1 - d + d * DH_MULT ** 2);
    actual += amount;
    mean += base * ex;
    variance += base * base * (ex2 * ROLL_E2 - ex * ex);
    n++;
    if (crit) crits++;
    if (dh) dhs++;
    expCrits += c;
    expDh += d;
  }
  if (n === 0 || variance <= 0) return undefined;
  const sd = Math.sqrt(variance);
  return {
    actual, mean, sd, percentile: phi((actual - mean) / sd), hits: n,
    crits, expectedCrits: expCrits, directHits: dhs, expectedDirectHits: expDh,
  };
}
