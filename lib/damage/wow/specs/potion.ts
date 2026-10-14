// lib/damage/wow/specs/potion.ts
//
// Combat potions not used (every non-healer WoW spec). Midnight's combat
// potions (buff-stream.ts WOW_COMBAT_POTION_IDS) last 30s on a 5-minute
// cooldown that health potions don't share: on qpZx3mWaG7gcDdYB pull 3
// Bragontix drank Light's Potential at 0:03 and 6:25 with a health potion
// at 2:36. WoWAnalyzer's "Number of Potions Used" flags a pull with room
// for another (Shadowmeld, 1 of 2 on a 6:36 kill; the 100th-percentile
// Imnotanorc on 3Vz6Qt2RyTPXwpJn too).
//
// Uses: casts of a potion, plus a potion buff already up in the first
// 1.5s with no cast (drunk before the pull). Room: one at the pull, then
// one 300s after each use; a use that never came is missed when at least
// MIN_ROOM_MS of the analysed window was left with the player alive.
// Lenient on purpose: a late potion isn't judged, only a missing one.
// Some top players drink none (3Vz6Qt2RyTPXwpJn's Illhitu and two Blood
// DKs, NK1hBtW9rckdjq36's Chazh): no potion buff, cast or hit snapshot.
//
// Value (inference): the 30s it would have covered (less what the pull
// had left) × the player's damage per second alive × the potion's bonus,
// measured from the log:
// - Light's Potential (primary stat): the median over abilities of the
//   median non-crit hit with it ÷ without it, comparing only hits on the
//   same target with the same other tracked buffs, within 60s of a potion.
//   The player's own when 3+ abilities compare, else the pull's median of
//   players who measured; capped at 30%. Measured 2026-10-13: +20–40%
//   (5 players across three kills; median +31%).
// - Potion of Recklessness (secondary stats): its haste, ×0.864 GCD in the
//   haste fit (haste-statuses.ts), +15.7% casts. Its hit bonus reads ~+5%
//   and too few players compare to use it.
// The player's own potion kind decides; one who drank none is valued as
// Light's Potential.

import type { Pull } from "@/types/Pull";
import type { PlayerInfo } from "@/types/PlayerInfo";
import type { DamageFinding, JobCheck, PotWindow } from "../../types";
import { finding } from "../../checks";
import { mergeWindows, overlapMs } from "../../timeline";
import { k, s } from "./shared";

const LIGHTS_POTENTIAL = 1236616;
const RECKLESSNESS = 1236994;
const DRAUGHT = 1236998;   // Draught of Rampant Abandon: counts as a use; seen twice, never measured
const POTIONS = new Set([LIGHTS_POTENTIAL, RECKLESSNESS, DRAUGHT]);
const COOLDOWN_MS = 300_000;
const DURATION_MS = 30_000;
const PRE_PULL_MS = 1_500;
// WoWAnalyzer's line, measured (2026-10-13): it calls one potion right on
// a 5:20 kill (Holyvi, 18s left after the cooldown) and flags a 5:29 one
// (Imnotanorc, 26s left).
const MIN_ROOM_MS = 20_000;
const NEAR_MS = 60_000;
const BONUS_CAP = 0.3;
const RECKLESSNESS_BONUS = 1 / 0.864 - 1;

const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

/** A player's measured Light's Potential bonus, or undefined under 3 comparable abilities. */
function measuredBonus(p: PlayerInfo, id: number): number | undefined {
  const onTimes = p.damageDone.filter((h) => h.statusIds?.includes(id)).map((h) => h.timestamp);
  if (onTimes.length === 0) return undefined;
  const groups = new Map<string, { on: number[]; off: number[] }>();
  for (const h of p.damageDone) {
    if (h.pet || h.hitType !== 1 || !h.unmitigatedAmount || !h.statusIds) continue;
    if (!onTimes.some((t) => Math.abs(t - h.timestamp) <= NEAR_MS)) continue;
    const key = `${h.abilityId}|${h.target}|${h.statusIds.filter((x) => x !== id).sort().join(",")}`;
    const g = groups.get(key) ?? { on: [], off: [] };
    (h.statusIds.includes(id) ? g.on : g.off).push(h.unmitigatedAmount);
    groups.set(key, g);
  }
  const ratios = [...groups.values()].filter((g) => g.on.length >= 3 && g.off.length >= 3).map((g) => med(g.on) / med(g.off));
  return ratios.length >= 3 ? Math.min(BONUS_CAP, Math.max(0, med(ratios) - 1)) : undefined;
}

const pullBonusCache = new WeakMap<Pull, number | undefined>();
function pullBonus(pull: Pull): number | undefined {
  if (pullBonusCache.has(pull)) return pullBonusCache.get(pull);
  const xs = pull.players.map((p) => measuredBonus(p, LIGHTS_POTENTIAL)).filter((x): x is number => x !== undefined);
  const out = xs.length ? med(xs) : undefined;
  pullBonusCache.set(pull, out);
  return out;
}

/**
 * The player's combat potions for the dialog's timeline (DamageGame.potWindows):
 * each potion buff from applied to removed, or a cast with no buff seen
 * for DURATION_MS. Health potions aren't in POTIONS.
 */
export function potionWindows(player: PlayerInfo, endMs: number): PotWindow[] {
  const out: PotWindow[] = [];
  const open = new Map<number, { t: number; name: string; icon?: string }>();
  for (const e of [...(player.buffs ?? [])].filter((b) => POTIONS.has(b.abilityId)).sort((a, b) => a.timestamp - b.timestamp)) {
    if (e.buffStatus === "applied" && !open.has(e.abilityId)) open.set(e.abilityId, { t: e.timestamp, name: e.abilityName, icon: e.abilityIcon });
    else if (e.buffStatus === "removed") {
      const o = open.get(e.abilityId);
      out.push({ startMs: o?.t ?? Math.max(0, e.timestamp - DURATION_MS), endMs: e.timestamp, name: o?.name ?? e.abilityName, icon: o?.icon ?? e.abilityIcon });
      open.delete(e.abilityId);
    }
  }
  for (const o of open.values()) out.push({ startMs: o.t, endMs: Math.min(o.t + DURATION_MS, endMs), name: o.name, icon: o.icon });
  for (const c of player.casts) {
    if (!POTIONS.has(c.abilityId) || out.some((w) => c.timestamp >= w.startMs - 1_000 && c.timestamp <= w.endMs)) continue;
    out.push({ startMs: c.timestamp, endMs: Math.min(c.timestamp + DURATION_MS, endMs), name: c.abilityName, icon: c.abilityIcon });
  }
  return out.sort((a, b) => a.startMs - b.startMs);
}

export const combatPotion: JobCheck = (ctx): DamageFinding[] => {
  if (ctx.player.role === "Healer") return [];
  const casts = ctx.player.casts.filter((c) => POTIONS.has(c.abilityId)).sort((a, b) => a.timestamp - b.timestamp);
  const uses = casts.map((c) => ({ t: c.timestamp, id: c.abilityId }));
  const early = (ctx.player.buffs ?? []).find((b) => POTIONS.has(b.abilityId) && b.buffStatus === "applied" && b.timestamp <= PRE_PULL_MS);
  if (early && !casts.some((c) => c.timestamp <= PRE_PULL_MS + 500)) uses.unshift({ t: 0, id: early.abilityId });

  // Room counts only time alive: 3Vz6Qt2RyTPXwpJn's Falkeron died at 2:20
  // and wasn't raised, so no potion was due at 5:03.
  const dead = mergeWindows(ctx.dead);
  const aliveIn = (a: number, b: number) => Math.max(0, b - a - overlapMs(a, b, dead));
  const missed: number[] = [];
  let next = 0;
  for (const u of uses) {
    while (u.t - next >= COOLDOWN_MS) { missed.push(next); next += COOLDOWN_MS; }   // a whole cooldown passed unused
    next = Math.max(next, u.t) + COOLDOWN_MS;
  }
  while (ctx.endMs - next >= MIN_ROOM_MS) {
    if (aliveIn(next, ctx.endMs) >= MIN_ROOM_MS) missed.push(next);
    next += COOLDOWN_MS;
  }
  if (missed.length === 0) return [];

  const kind = uses[uses.length - 1]?.id ?? LIGHTS_POTENTIAL;
  let bonus: number | undefined, bonusBasis: string;
  if (kind === RECKLESSNESS) {
    bonus = RECKLESSNESS_BONUS;
    bonusBasis = "Potion of Recklessness's haste (GCD ×0.864 in the haste fit)";
  } else {
    const own = measuredBonus(ctx.player, LIGHTS_POTENTIAL);
    bonus = own ?? pullBonus(ctx.pull);
    bonusBasis = own !== undefined ? "Light's Potential's bonus measured from this player's hits"
      : "Light's Potential's bonus, the pull's median measured from hits";
  }
  const alive = aliveIn(0, ctx.endMs);
  const rate = alive > 0 ? ctx.values.total / alive : 0;
  return missed.map((at) => {
    const coverMs = Math.min(DURATION_MS, aliveIn(at, ctx.endMs));
    const lost = bonus !== undefined ? coverMs * rate * bonus : 0;
    const t = Math.round(at / 1000);
    return finding(ctx, {
      kind: "tincture", startMs: at, endMs: at + coverMs, forced: false, inference: true,
      label: "Combat potion not used",
      lostDamage: lost,
      basis: bonus !== undefined
        ? `${s(coverMs)} × ${k(rate * 1000)}/s × ${(bonus * 100).toFixed(0)}% (${bonusBasis})`
        : "not valued: Light's Potential's bonus couldn't be measured on this pull",
      detail: `A combat potion was ready from ${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")} and never used (${uses.length} used)`,
      // One mark where it came ready, not the 30s it would have covered.
      moments: [{ startMs: at, endMs: at, lostDamage: lost }],
    });
  });
};
