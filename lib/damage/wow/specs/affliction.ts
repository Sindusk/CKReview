// lib/damage/wow/specs/affliction.ts
//
// Affliction Warlock's own checks, beside the shared ones ranged.ts gives
// it (the Malevolence window; Agony, Unstable Affliction and Wither /
// Corruption uptime; the tracked Malevolence and Summon Darkglare
// cooldowns; the Nightfall expiry in procs.ts). Built in the WoWAnalyzer
// audit's phase 3 (docs/wowa-audit/warlock-affliction.md), every rule
// valued as damage lost. Measured 2026-10-17 on 18 Affliction player-pulls,
// all Mythic: the top parses 大哥别读条了 (9rGDw4WB3bv6VmnK, Vashnik, 100th),
// Zachx (Kag91qVZ2YJ7MQAb, Vashnik, 98.9th), Weeblock (tcdpmV7MBHK1jGYk,
// Vashnik, 96.6th; NvX17Tb9yMY8QrDf, Entombed Sentinels, 99.2nd) and
// Focusino (6kHtGaQXCMWYxFpZ, Entombed Sentinels, 100th); the weaker
// 八十參 (7B1wQbjNhgXJDaHC, 16.9th), Fluffalicous and Pigson
// (a4kX1DNT27yHGvqJ, 18th) and Næliel (ZjVtM1vFcrp7w3WC, 20th), all on
// Vashnik; and the static's Wyrmtongues, 9 wipes on four bosses
// (gVDPhzp61Zm29HMw). Spell ids are from those logs' masterData.
//
// Talents (from casts, buffs and hits): everyone takes Haunt, Dark
// Harvest, Unstable Affliction, Summon Darkglare and Nightfall. Six are
// Hellcaller (Wither, Malevolence, Blackened Soul: Wyrmtongues, Zachx,
// Weeblock, Focusino, Næliel), four Soul Harvester (Corruption, Succulent
// Soul, Demonic Soul: 大哥别读条了, 八十參, Fluffalicous, Pigson). 八十參 and
// Fluffalicous fill with Drain Soul instead of Shadow Bolt (a channel the
// spell survey lacked until this pass: game.ts). Every player has a demon
// out, so nobody takes Grimoire of Sacrifice.
//
// ── Haunt dropped (hauntDropped) ───────────────────────────────────────
// Haunt (48181: the cast, its hit and the enemy debuff) lasts 18.0s (every
// clean gain → removal span) on a ~15.5s cooldown (shortest interval
// 15.4–15.6s). The top players recast it as it runs out, every 16.1–18.3s
// (median), not on cooldown: the debuff sets the cadence. So a second
// with Haunt on no enemy pushes every later Haunt back a second, and over
// the pull that's gap ÷ the player's cadence Haunts lost. A Haunt is worth
// its hit (103–191k) less what its cast time would have done with the
// player's filler (Shadow Bolt or Drain Soul damage per ms of their own
// cast or channel: 31–74k).
// Not counted: Haunt's damage-taken bonus. Read from the log it is small
// and noisy: the player's own ticks on the same target in the 5s before vs
// after a re-application rose 1% (Corruption), 6% (Wither), 0.5%
// (Blackened Soul); Unstable Affliction's ticks read higher only because
// it is recast beside Haunt and its ticks decay after each cast.
// Gap time = Haunt on no enemy, less forced time and movement, from
// GCD + 1s (time to reapply). A gap in which the player cast SEED_EXCUSE+
// Seeds of Corruption is an AoE stretch and isn't counted: the 100th-
// percentile 大哥别读条了 (Soul Harvester, 86 Seeds) let Haunt drop for
// 16.4s at 0:20 and 13.4s at 5:26 while spreading Seeds on the Venoms.
// Measured (lost a pull): top 大哥别读条了 32k (4 Seed gaps excused), Zachx
// 49k (3:20, 6.9s), Focusino 33k, Weeblock none on either kill. Weaker:
// Næliel 189k (8 gaps of 2–8s, 4:55–5:02 the longest), Fluffalicous 161k,
// 八十參 57k, Pigson 48k; Wyrmtongues 20–231k on his Vashnik pulls
// (Pull 4: 2:13–2:24, 3:18–3:27) and 455k on Ula'tek Pull 1 (4:24–4:49
// and 7:04–7:38 on the adds). A small loss. WoWAnalyzer's cast-efficiency
// row (95% of the cooldown) is wrong in its premise: Focusino (100th,
// 96.9% uptime) spends 88% of the pull with Haunt on cooldown, Zachx 90%.
//
// ── Measured and not built ─────────────────────────────────────────────
// - Dark Harvest held (1257052; hits 1257065): 60.0s flat for every
//   Hellcaller (shortest interval 60.0–60.5s with 15–24 Unstable
//   Afflictions and Seeds between, so no Cull the Weak cut shows); Soul
//   Harvesters 41–54s with no fit to a cut per cast. A press's hits are
//   added damage (the DoTs on its targets tick no lower after it), 0.3–0.4M
//   on one enemy, ~1M on 2–3. The Vashnik top players hold it for the
//   Venoms after Imbibe (the context's hold windows). Held past 3s a
//   cycle outside forced and hold time, with a hold that ends on 2+
//   enemies excused: top 6–28k a pull, weaker 0, Wyrmtongues 0–123k (Ula'tek
//   3:21–3:49). Negligible.
// - Dark Harvest on a target missing a DoT: missing Agony or Wither
//   changes nothing (Weeblock Vashnik 4:38: 300k on a Burning Venom with
//   Agony alone vs 288–339k with both), and only adds lack Unstable
//   Affliction (a one-target DoT), top players included. Negligible.
// - No Dark Harvest struck nothing: 0 of 101 casts.

import type { JobCheck, Moment } from "../../types";
import { finding } from "../../checks";
import { gcdLockMs, mergeWindows, overlapMs, type Window } from "../../timeline";
import { k, s } from "./shared";

const HAUNT = 48181;                 // the cast, its hit and the debuff on the enemy
const SEED_OF_CORRUPTION = 27243;
const FILLERS = [686, 198590];       // Shadow Bolt, Drain Soul

const SEED_EXCUSE = 2;               // Seeds cast in a gap that make it an AoE stretch
const MAX_INTERVAL_MS = 25_000;      // Haunt intervals longer than this aren't the player's cadence

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

// ── Haunt dropped ──────────────────────────────────────────────────────

const hauntDropped: JobCheck = (ctx) => {
  const p = ctx.player;
  const events = (ctx.pull.bossDebuffs ?? [])
    .filter((e) => e.statusId === HAUNT && e.sourceName === p.name && e.timestamp < ctx.endMs)
    .sort((a, b) => a.timestamp - b.timestamp);
  if (events.length === 0) return [];
  const wins: Window[] = [];
  const open = new Map<string, number>();
  for (const e of events) {
    const key = `${e.targetActorId}.${e.targetInstance ?? 1}`;
    if (e.status === "removed") {
      const st = open.get(key);
      if (st !== undefined) { wins.push({ startMs: st, endMs: e.timestamp }); open.delete(key); }
    } else if (!open.has(key)) open.set(key, e.timestamp);
  }
  for (const st of open.values()) wins.push({ startMs: st, endMs: ctx.endMs });
  const active = mergeWindows(wins);

  const casts = p.casts.filter((c) => !c.fake && c.timestamp < ctx.endMs);
  const hauntCasts = casts.filter((c) => c.abilityId === HAUNT).map((c) => c.timestamp).sort((a, b) => a - b);
  if (hauntCasts.length < 3) return [];
  const intervals = hauntCasts.slice(1).map((t, i) => t - hauntCasts[i]).filter((x) => x <= MAX_INTERVAL_MS);
  if (intervals.length < 2) return [];
  const cadence = median(intervals);
  const hauntHit = p.damageDone.filter((e) => !e.pet && !e.isDoT && e.abilityId === HAUNT && e.timestamp < ctx.endMs)
    .reduce((a, e) => a + (e.amount ?? 0), 0) / hauntCasts.length;
  const filler = FILLERS.map((id) => ({ id, n: casts.filter((c) => c.abilityId === id).length })).sort((a, b) => b.n - a.n)[0];
  if (filler.n < 5) return [];
  const fillerName = casts.find((c) => c.abilityId === filler.id)?.abilityName ?? "filler";
  // What the Haunt's cast time would otherwise have done: the filler's
  // damage per ms of its own cast or channel (Drain Soul runs several GCDs).
  const lock = (id: number) => {
    const us = ctx.uses.filter((u) => u.action.id === id && u.startMs < ctx.endMs);
    return { n: us.length, ms: us.reduce((a, u) => a + gcdLockMs(u, ctx.factorAt(u.startMs)), 0) };
  };
  const fl = lock(filler.id), hl = lock(HAUNT);
  if (fl.ms <= 0 || hl.n === 0) return [];
  const fillerDmg = p.damageDone.filter((e) => !e.pet && e.abilityId === filler.id && e.timestamp < ctx.endMs).reduce((a, e) => a + (e.amount ?? 0), 0);
  const hauntLockMs = hl.ms / hl.n;
  const displaced = fillerDmg / fl.ms * hauntLockMs;
  const perHaunt = hauntHit - displaced;
  if (!(perHaunt > 0)) return [];
  const perMs = perHaunt / cadence;

  const notCounted = mergeWindows([...ctx.forced, ...(ctx.movement ?? [])]);
  const grace = ctx.baseGcdMs + 1_000;
  const moments: Moment[] = [];
  let lostMs = 0, excused = 0;
  let cursor = active[0].startMs;
  for (const w of [...active, { startMs: ctx.endMs, endMs: ctx.endMs }]) {
    if (w.startMs > cursor) {
      const from = cursor, to = w.startMs;
      const len = to - from - overlapMs(from, to, notCounted);
      const seeds = casts.filter((c) => c.abilityId === SEED_OF_CORRUPTION && c.timestamp >= from && c.timestamp < to).length;
      if (len >= grace && seeds >= SEED_EXCUSE) excused++;
      else if (len >= grace) {
        lostMs += len;
        moments.push({ startMs: from, endMs: to, lostDamage: len * perMs,
          detail: `Haunt off every enemy ${clock(from)}–${clock(to)}: ${s(len)} outside forced time and movement` });
      }
    }
    cursor = Math.max(cursor, w.endMs);
  }
  if (moments.length === 0) return [];
  return [finding(ctx, {
    kind: "dot-uptime", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Haunt dropped",
    lostDamage: lostMs * perMs,
    basis: `${s(lostMs)} without Haunt ÷ ${s(cadence)} between Haunts (the player's median) × (${k(hauntHit)} Haunt − ${k(displaced)}, the ${fillerName} its ${s(hauntLockMs)} cast displaces)` +
      (excused > 0 ? `; ${excused} gap${excused > 1 ? "s" : ""} with ${SEED_EXCUSE}+ Seeds of Corruption (AoE) not counted` : ""),
    detail: `Haunt was off every enemy for ${s(lostMs)} in ${moments.length} gap${moments.length > 1 ? "s" : ""}: each second pushes every later Haunt back`,
    moments,
  })];
};

export const AFFLICTION_CHECKS: JobCheck[] = [hauntDropped];
