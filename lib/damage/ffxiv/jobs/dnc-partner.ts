// lib/damage/ffxiv/jobs/dnc-partner.ts
//
// What a player is worth as a Dancer's partner over a stretch of the pull:
// the three things a partner gets, after partnercalc
// (https://github.com/hintxiv/ts-partnercalc, src/math/rdps.ts and
// src/math/esprit.ts; ported 2026-10-18 at its May 2025 commit, the user
// asked for it to strengthen the partner checks in ranged.ts):
//   - Standard Finish: the partner copy's damage bonus on their hits.
//     Each hit is taken back to its expected value (a natural crit / direct
//     hit divided out, then the expected crit and direct-hit multiplier at
//     their rates put back, with Devilment's +20% / +20% when the Dancer's
//     Devilment is up), so one lucky crit doesn't decide it. A hit that
//     already carried the copy has it divided out first.
//   - Devilment: +20% crit and +20% direct-hit rate, the expected
//     multiplier at their rates with it minus without it, on the same base.
//   - Esprit: each partner weaponskill or spell under Standard Finish has a
//     job-specific chance at 10 Esprit (ESPRIT_RATE, partnercalc's measured
//     rates, 0.2 where it has none), worth 3.56 potency each (partnercalc's
//     POTENCY_PER_ESPRIT, from ringabel's calculations) at the Dancer's own
//     damage per potency (mean hit ÷ potency over her single-target GCDs
//     and Fan Dance, partnercalc's potencyRatio). Not counted under
//     Technical Finish (it gives Esprit anyway); hits within 200ms are one
//     event (AoEs, Barrage).
// Differences from partnercalc: crit and direct-hit rates come from
// crit-rates.ts (the player's own hits, or their logged gear); the
// Standard Finish bonus is the ledger's measured share (5% by default);
// "weaponskill or spell" is any on-GCD action; actions that always crit or
// always direct-hit are valued as normal rolls (partnercalc treats
// Devilment there as a flat crit-rate multiplier). Not checked against
// partnercalc's output on a 7.4+ log yet.
//
//   Copyright (c) 2022 hintxiv
//   MIT License; full text in THIRD_PARTY_NOTICES.md.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { PlayerCheckContext } from "../../checks";
import { estimateHitRates } from "../../crit-rates";
import { inWindows, type Window } from "../../timeline";
import { XIVA_ACTIONS as A, XIVA_STATUSES as S } from "../xiva-data";

const ESPRIT_PER_GCD = 10;
const POTENCY_PER_ESPRIT = 3.56;
const ESPRIT_LOCKOUT_MS = 200;
const DEFAULT_ESPRIT_RATE = 0.2;
const ESPRIT_RATE: Record<string, number> = {
  Dragoon: 0.2, Monk: 0.1685, Ninja: 0.2, Reaper: 0.2, Samurai: 0.2, Viper: 0.17, Dancer: 0.2, BlackMage: 0.2481,
};
// Single-target Dancer actions and their potency (partnercalc's DNC table),
// for her damage per potency.
const DNC_POTENCY: [key: string, potency: number][] = [
  ["CASCADE", 220], ["FOUNTAIN", 280], ["REVERSE_CASCADE", 280], ["FOUNTAINFALL", 340], ["FAN_DANCE", 150],
];
const DH_MULT = 1.25;
const DEVILMENT_RATE = 0.2;

export type PartnerValue = { standard: number; devilment: number; esprit: number; total: number };

export type PartnerModel = {
  /**
   * What `p` would add as partner from `from` to `to`: Standard Finish and
   * Esprit where `stdWins` holds, Devilment where `devilWins` holds.
   */
  value(p: PlayerInfo, from: number, to: number, stdWins: Window[], devilWins: Window[]): PartnerValue;
};

export function partnerModel(ctx: PlayerCheckContext): PartnerModel {
  const dancer = ctx.player;
  // The Dancer's damage per potency.
  const ratios: number[] = [];
  for (const [key, potency] of DNC_POTENCY) {
    const id = A[key]?.id;
    if (id === undefined) continue;
    for (const e of dancer.damageDone) if (e.abilityId === id && !e.isDoT && (e.amount ?? 0) > 0) ratios.push(e.amount! / potency);
  }
  const perPotency = ratios.length ? ratios.reduce((a, x) => a + x, 0) / ratios.length : 0;
  const ratesOf = new Map<PlayerInfo, { crit: number; dh: number; critMult: number }>();
  const rates = (p: PlayerInfo) => {
    let r = ratesOf.get(p);
    if (!r) {
      const h = estimateHitRates([p], ctx.game, new Set());
      r = { crit: h?.crit ?? 0.25, dh: h?.directHit ?? 0.3, critMult: h?.critMult ?? 1.55 };
      ratesOf.set(p, r);
    }
    return r;
  };
  const stdCopy = S.STANDARD_FINISH_PARTNER?.id;
  const devilId = S.DEVILMENT?.id;
  const techId = S.TECHNICAL_FINISH?.id;
  const expect = (cr: number, dr: number, cm: number) => (1 + Math.min(1, cr) * (cm - 1)) * (1 + Math.min(1, dr) * (DH_MULT - 1));

  return {
    value(p, from, to, stdWins, devilWins) {
      const out = { standard: 0, devilment: 0, esprit: 0, total: 0 };
      if (p === dancer || to <= from) return out;
      const r = rates(p);
      const sh = stdCopy !== undefined ? ctx.ledger?.share(stdCopy, p) ?? 0 : 0;
      const fStd = sh > 0 && sh < 1 ? sh / (1 - sh) : 0.05;
      const espritRate = ESPRIT_RATE[(p.className ?? "").replace(/\s/g, "")] ?? DEFAULT_ESPRIT_RATE;
      let lastEsprit = -Infinity;
      for (const e of p.damageDone) {
        if (e.timestamp < from || e.timestamp >= to || (e.amount ?? 0) <= 0) continue;
        const std = inWindows(e.timestamp, stdWins), dev = inWindows(e.timestamp, devilWins);
        if (!std && !dev) continue;
        const ids = e.statusIds ?? [];
        // Crit / direct-hit buffs the hit already carried (Devilment left
        // out: it's what's being valued).
        let cr = r.crit, dr = r.dh;
        for (const id of new Set(ids)) {
          if (id === devilId) continue;
          const b = ctx.game.partyBuff(id);
          cr += b?.crit ?? 0;
          dr += b?.directHit ?? 0;
        }
        const hadDevil = devilId !== undefined && ids.includes(devilId);
        // The hit without its own crit / direct-hit luck (a DoT tick is
        // already at its expected value).
        const rolled = expect(cr + (hadDevil ? DEVILMENT_RATE : 0), dr + (hadDevil ? DEVILMENT_RATE : 0), r.critMult);
        let base = e.isDoT ? e.amount! / rolled
          : e.amount! / (e.hitType === 2 ? r.critMult : 1) / (e.directHit ? DH_MULT : 1);
        if (stdCopy !== undefined && ids.includes(stdCopy)) base /= 1 + fStd;
        const withDevil = expect(cr + DEVILMENT_RATE, dr + DEVILMENT_RATE, r.critMult), without = expect(cr, dr, r.critMult);
        if (std) out.standard += base * (dev ? withDevil : without) * fStd;
        if (dev) out.devilment += base * (std ? 1 + fStd : 1) * (withDevil - without);
        if (std && perPotency > 0 && ctx.game.action(e.abilityId)?.onGcd && !e.pet &&
            !(techId !== undefined && ids.includes(techId)) && e.timestamp - lastEsprit > ESPRIT_LOCKOUT_MS) {
          out.esprit += espritRate * ESPRIT_PER_GCD * POTENCY_PER_ESPRIT * perPotency;
          lastEsprit = e.timestamp;
        }
      }
      out.total = out.standard + out.devilment + out.esprit;
      return out;
    },
  };
}
