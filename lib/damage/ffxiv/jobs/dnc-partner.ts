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
// Hits that always crit or direct-hit (an action at 95%+ of 5+ hits, or
// Life Surge / Inner Release / Reassembled) keep their real value, and
// Devilment raises them by rate × (multiplier − 1), as partnercalc does.
// Rates come from crit-rates.ts: the game's own chances on the player's
// DoT ticks where they have one (partnercalc's source), else the logged
// gear or the estimate from hits.
// Differences from partnercalc: the Standard Finish bonus is the ledger's
// measured share (5% by default); "weaponskill or spell" is any on-GCD
// action; auto-attacks count (both buffs apply to them in game;
// partnercalc reads only damage with a cast snapshot, so it leaves them
// out).
// Checked against partnercalc.app on Xk2DKZwVp4Ar6d7y fight 3 (Enuo kill,
// Chauzey Solstice, 2026-10-18; the saved page in sampledata/damage-ff):
// same best partner (Tsuki Hoshino, 2039k here, 1973k there); without
// auto-attacks the tanks match within 1% (Kade Kansado Standard Finish
// 659k / 656k, Devilment 530k / 527k); others within about 10% either way.
// Its 8:08-9:10 window has Apollo Tomyris ahead of Apollo Avrani (141k /
// 79k), as `partnerChoice` found for the 8:04 swap.
//
//   Copyright (c) 2022 hintxiv
//   MIT License; full text in THIRD_PARTY_NOTICES.md.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { PlayerCheckContext } from "../../checks";
import { estimateHitRates } from "../../crit-rates";
import { inWindows, type Window } from "../../timeline";
import { XIVA_ACTIONS as A, XIVA_STATUSES as S } from "../xiva-data";
import { GUARANTEED_HIT_STATUS_IDS } from "../game";

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
const AUTO_MIN_HITS = 5, AUTO_SHARE = 0.95;

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
  // Actions that always crit / always direct-hit, per player: 95%+ of 5+
  // hits, as crit-rates.ts judges them.
  const autoOf = (pick: (e: PlayerInfo["damageDone"][number]) => boolean) => {
    const cache = new Map<PlayerInfo, Set<number>>();
    return (p: PlayerInfo) => {
      let s = cache.get(p);
      if (!s) {
        const by = new Map<number, { n: number; yes: number }>();
        for (const e of p.damageDone) {
          if (e.isDoT || (e.amount ?? 0) <= 0) continue;
          const x = by.get(e.abilityId) ?? { n: 0, yes: 0 };
          x.n++; if (pick(e)) x.yes++;
          by.set(e.abilityId, x);
        }
        s = new Set([...by].filter(([, x]) => x.n >= AUTO_MIN_HITS && x.yes / x.n >= AUTO_SHARE).map(([id]) => id));
        cache.set(p, s);
      }
      return s;
    };
  };
  const autoCrit = autoOf((e) => e.hitType === 2), autoDH = autoOf((e) => !!e.directHit);

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
        // Crit / direct-hit rate buffs the hit already carried (Devilment
        // left out: it's what's being valued).
        let bc = 0, bd = 0;
        for (const id of new Set(ids)) {
          if (id === devilId) continue;
          const b = ctx.game.partyBuff(id);
          bc += b?.crit ?? 0;
          bd += b?.directHit ?? 0;
        }
        const hd = devilId !== undefined && ids.includes(devilId) ? DEVILMENT_RATE : 0;
        // A guaranteed crit / direct hit (an action that always does, or
        // Life Surge, Inner Release, Reassembled) doesn't roll: rate buffs
        // raise its damage instead, by rate × (multiplier − 1). partnercalc
        // keeps such hits at their real value and applies Devilment as that
        // flat bonus (rdps.ts, the 'auto' cases).
        const guaranteed = ids.some((id) => GUARANTEED_HIT_STATUS_IDS.has(id));
        const aC = !e.isDoT && e.hitType === 2 && (guaranteed || autoCrit(p).has(e.abilityId));
        const aD = !e.isDoT && !!e.directHit && (guaranteed || autoDH(p).has(e.abilityId));
        const critF = (buff: number) => aC ? r.critMult * (1 + buff * (r.critMult - 1)) : 1 + Math.min(1, r.crit + buff) * (r.critMult - 1);
        const dhF = (buff: number) => aD ? DH_MULT * (1 + buff * (DH_MULT - 1)) : 1 + Math.min(1, r.dh + buff) * (DH_MULT - 1);
        // The hit without its own crit / direct-hit luck (a DoT tick is
        // already at its expected value).
        let base = e.isDoT ? e.amount! / (critF(bc + hd) * dhF(bd + hd))
          : e.amount! / (aC ? critF(bc + hd) : e.hitType === 2 ? r.critMult : 1) / (aD ? dhF(bd + hd) : e.directHit ? DH_MULT : 1);
        if (stdCopy !== undefined && ids.includes(stdCopy)) base /= 1 + fStd;
        const withDevil = critF(bc + DEVILMENT_RATE) * dhF(bd + DEVILMENT_RATE), without = critF(bc) * dhF(bd);
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
