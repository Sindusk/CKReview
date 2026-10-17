// lib/damage/wow/specs/feral.ts
//
// Feral Druid's own checks and cooldown values, beside the shared ones
// melee.ts gives it (the Berserk window, Energy at the cap). Built in the
// WoWAnalyzer audit's phase 3 (docs/wowa-audit/druid-feral.md), every rule
// valued as damage lost. Measured 2026-10-17 on 14 Feral player-pulls of
// 13 players, all Mythic kills fetched for this pass: the top parses
// Catalyà and Orog (X618LRt7hPqzbVJj, Vashnik 100th), 万花通灵
// (yrFd7CYZvt6XAz3T, 99.3rd), Vydal (fh6bLKy12gzWvGCH, 98.6th), Scaricat
// (6Bpq1FmA9aH4WQxc, Entombed Sentinels 100th), Samarae (QFTXqD8VNKCvx9jf,
// 99.5th), 小奶酱丶 (RbhPKYWd6t1nAC3f, 94th, and the survey's Vashnik
// pull); the weaker Cheezywizzy (ZvrLTQfk1zbAXMwB, Vashnik 3rd and
// Entombed Sentinels 20th), Chesteria (C4Kxpn3FtrvjWMAP, 3rd), Lylyvienne
// (KB1a9CWc6pT4VGqA, 16th), Munchkinz (nhbCYHXRf1T2qAv9, 16th) and Tyger
// (RwxWC6PF2pJ7Zd9H, 18th). Spell ids are from those logs' masterData.
//
// Talents (from casts, buffs and hits): every one plays Wildstalker
// (Bloodseeker Vines, Bursting Growth) and Circle of Life and Death (Rake's
// untouched span is 12.0s, not 15). Nobody takes Bloodtalons (no buff),
// Thrash, Brutal Slash or Chomp. Two builds: Berserk with Convoke the
// Spirits on one 120s cooldown (Convoke pressed ~2s after each Berserk)
// and Apex Predator's Craving (free Bites), or Incarnation (91s) without
// Convoke (Vydal, 小奶酱丶 on Vashnik, Lylyvienne). Lunar Inspiration
// (Moonfire 155625, pressed) on the Entombed Sentinels kills only; Primal
// Wrath and Swipe on Vashnik. Feral Frenzy on a 30s cooldown for all but
// Chesteria (none) and Lylyvienne (Frantic Frenzy, 1243807).
//
// ── Tracked cooldowns' value per use (tracked-cooldowns.ts) ────────────
// None of the four tracked cooldowns had one, so their drift never showed:
// Tiger's Fury and Berserk deal nothing themselves, Convoke's hits log
// under the spells it casts, Feral Frenzy's under 274838.
// - Tiger's Fury, Berserk, Incarnation (feralWindowValue): the window's
//   bonus from the player's direct non-crit hits (TF's outside Berserk,
//   Berserk's outside TF, against neither) × the damage done inside an
//   average window. TF read +12–27% (no Energy of its own: the cast after
//   it shows only regen, 6–19 Energy in 0.3–1.0s); its bleeds keep the
//   snapshot (Rip ×1.24, Rake ×1.21, Moonfire ×1.25, ticks after the
//   window, medians of 14 players) and that tail isn't counted. Per use:
//   TF 0.40–0.97M, Berserk (25s with the tier set) 1.08–2.49M,
//   Incarnation 1.64–1.94M.
// - Convoke (convokeValue): its direct hits in the ~4.3s channel, less the
//   player's direct-hit rate outside it: 0.67–1.39M a use.
// - Feral Frenzy (feralFrenzyValue): its own presses' hits in the 6s
//   after, less a GCD: 155–529k. A player who never presses it gets
//   nothing, though Convoke casts Frenzies under the same hit id.
// Re-measured cooldowns (shortest / median interval): TF 30.0 / 30.8s,
// Frenzy 30.0 / 32.4s, Convoke 120.0 / 125.5s (the survey's 61s was a
// build nobody here plays), Berserk 120.5 / 124.2s, Incarnation 91.1 /
// 92.1s (newly tracked).
// Measured (lost a pull): Feral Frenzy drift on Catalyà 600k (top: 11
// presses 35–41s apart, 61.6s held, two uses), Cheezywizzy 353k / 736k,
// Tyger 664k, Munchkinz 299k, none on the other top players; Tiger's Fury
// drift on Cheezywizzy's Vashnik kill only (397k, 26s held). Berserk,
// Incarnation and Convoke lose no whole use on anyone (Scaricat held
// Berserk and Convoke 35s once on Entombed Sentinels).

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { JobCheck } from "../../types";
import { statusWindows, type Window } from "../../timeline";
import { k } from "./shared";

const CONVOKE = 391528;
const FERAL_FRENZY = 274837;
const FRENZY_HIT = 274838;
const FRENZY_SPAN_MS = 6_000;
const BONUS_CAP = 0.3;
const CONVOKE_LAND_MS = 300;

const median = (xs: number[]) => { const v = [...xs].sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
const inAny = (ws: Window[], t: number) => ws.some((w) => t >= w.startMs && t <= w.endMs);

/**
 * One use of a damage window (Tiger's Fury, Berserk, Incarnation): what it
 * added to the player's hits. The bonus is read from the player's own
 * direct non-crit hits inside this window but outside `others`, against
 * hits outside both (per ability, weighted by hits inside), capped at
 * BONUS_CAP; the value is the damage done inside an average window ×
 * bonus ÷ (1 + bonus). Undefined for a player who never had the window.
 */
export function feralWindowValue(statusId: number, name: string, others: number[]) {
  return (player: PlayerInfo, endMs: number): { value: number; basis: string } | undefined => {
    const wins = statusWindows(player, new Set([statusId]), endMs).filter((w) => w.startMs < endMs);
    if (wins.length === 0) return undefined;
    const other = statusWindows(player, new Set(others), endMs);
    const by = new Map<number, { i: number[]; o: number[] }>();
    for (const e of player.damageDone) {
      if (e.pet || e.isDoT || e.hitType !== 1 || !e.unmitigatedAmount || e.timestamp >= endMs) continue;
      const inOther = inAny(other, e.timestamp), inThis = inAny(wins, e.timestamp);
      if (inOther && inThis) continue;
      const g = by.get(e.abilityId) ?? { i: [], o: [] };
      if (inThis) g.i.push(e.unmitigatedAmount); else if (!inOther) g.o.push(e.unmitigatedAmount);
      by.set(e.abilityId, g);
    }
    let sum = 0, n = 0;
    for (const g of by.values()) {
      if (g.i.length === 0 || g.o.length < 3) continue;
      sum += (median(g.i) / median(g.o) - 1) * g.i.length;
      n += g.i.length;
    }
    const bonus = n > 0 ? Math.min(BONUS_CAP, Math.max(0, sum / n)) : 0;
    if (bonus <= 0) return undefined;
    const dmg = player.damageDone.filter((e) => e.timestamp < endMs && inAny(wins, e.timestamp)).reduce((a, e) => a + (e.amount ?? 0), 0);
    const each = dmg / wins.length;
    const value = each * bonus / (1 + bonus);
    return {
      value,
      basis: `${k(value)} that an average ${name} added (${k(each)} done inside each of ${wins.length} windows, ` +
        `+${Math.round(bonus * 100)}% read from the player's own direct hits, capped at ${BONUS_CAP * 100}%)`,
    };
  };
}

/**
 * One Convoke the Spirits: the direct hits (no ticks, no melee swings, no
 * pet) landing in its channel, to CONVOKE_LAND_MS after it, less the
 * player's own direct-hit rate outside the channels over the same time.
 * The bleeds it lays tick on after it and aren't counted (lenient).
 */
export function convokeValue(player: PlayerInfo, endMs: number): { value: number; basis: string } | undefined {
  const wins = statusWindows(player, new Set([CONVOKE]), endMs).filter((w) => w.endMs <= endMs)
    .map((w) => ({ startMs: w.startMs, endMs: w.endMs + CONVOKE_LAND_MS }));
  if (wins.length === 0) return undefined;
  const direct = player.damageDone.filter((e) => !e.pet && !e.isDoT && e.abilityId !== 1 && e.timestamp < endMs);
  const inMs = wins.reduce((a, w) => a + w.endMs - w.startMs, 0);
  const inDmg = direct.filter((e) => inAny(wins, e.timestamp)).reduce((a, e) => a + (e.amount ?? 0), 0);
  const outRate = direct.filter((e) => !inAny(wins, e.timestamp)).reduce((a, e) => a + (e.amount ?? 0), 0) / Math.max(1, endMs - inMs);
  const value = (inDmg - inMs * outRate) / wins.length;
  if (!(value > 0)) return undefined;
  return {
    value,
    basis: `${k(value)} an average Convoke the Spirits (${k(inDmg / wins.length)} of direct hits in its ${(inMs / wins.length / 1000).toFixed(1)}s channel − ${k(inMs / wins.length * outRate)} at the player's direct-hit rate outside it)`,
  };
}

/**
 * One Feral Frenzy: its hits (FRENZY_HIT, a bleed) from each of the
 * player's own presses to the next or FRENZY_SPAN_MS, less the GCD it
 * took. Convoke the Spirits casts Frenzies too, under the same hit id; a
 * player who never presses it (Chesteria C4Kxpn3FtrvjWMAP: 485k of
 * Convoke Frenzy hits, no press) has no use to lose.
 */
export function feralFrenzyValue(player: PlayerInfo, endMs: number, gcdValue: number): { value: number; basis: string } | undefined {
  const casts = player.casts.filter((c) => !c.fake && c.abilityId === FERAL_FRENZY && c.timestamp < endMs).map((c) => c.timestamp).sort((a, b) => a - b);
  if (casts.length === 0) return undefined;
  const hits = player.damageDone.filter((e) => !e.pet && e.abilityId === FRENZY_HIT);
  const own = casts.reduce((a, t, i) => a + hits.filter((e) => e.timestamp >= t && e.timestamp < Math.min(casts[i + 1] ?? Infinity, t + FRENZY_SPAN_MS))
    .reduce((b, e) => b + (e.amount ?? 0), 0), 0) / casts.length;
  const value = own - gcdValue;
  if (!(value > 0)) return undefined;
  return { value, basis: `(${k(own)} an average Feral Frenzy, its hits in the ${FRENZY_SPAN_MS / 1000}s after the press, − ${k(gcdValue)} average GCD in its place)` };
}

export const FERAL_CHECKS: JobCheck[] = [];
