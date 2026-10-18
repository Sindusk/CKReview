// lib/damage/wow/specs/devourer.ts
//
// Devourer Demon Hunter's own checks, beside the generic ones (GCD gaps,
// potions, the tracked The Hunt). Built in the WoWAnalyzer audit's phase 3
// (docs/wowa-audit/demonhunter-devourer.md), every rule valued as damage
// lost. Measured 2026-10-17 on 47 Devourer player-pulls, all Mythic kills
// of Entombed Sentinels and Vashnik: the top parses Limofans
// (VbAHWZDdPwJBajmx, Vashnik 100th), Caukyy (JdNq6WVXbvmxDgH9, Vashnik
// 99.9th, with Watchmedh), Vathiondh (9Nfcjg6rnRkYpd2Q, Entombed Sentinels
// 100th, with Velfurian and Vålkwing), Influka (PYaN4FW3VXKDThmL, 99.9th),
// Felstalker (JQVkMCb8T324yWca, 99.0th), Pve (96.2nd), Freakerino (96.1st),
// Likdh (92.6th), Ercege (z8rQ23NBy4LwM6PZ, Vashnik 92.2nd); the weaker
// Vargona (X618LRt7hPqzbVJj, Vashnik 3.6th), Daimian (VBPkNJnWMdZx8wQ1,
// Entombed Sentinels 4.3rd), Hoodh (7pFPAqzc2NHLXjwZ, 7.7th), 月满夜丶
// (wPmFHVKRQb31X97z, 8.7th), Jexro (a4kX1DNT27yHGvqJ, 9.9th), 氺蘭斯氺
// (A49h3gvBnRYHZQNX, 10.9th) and 30 more between. Percentiles are WCL's
// Devourer ranking. Spell ids are from those logs' masterData.
//
// Talents (casts, buffs and hit ids; CombatantInfo has no names): 38
// Annihilator (Voidfall stacks, Voidfall Meteor, World Killer, Catastrophe,
// Meteor Shower), 9 Void-Scarred (Voidblade, Reaper's Toll whose hits log
// as Hungering Slash, Predator's Wake, Voidsurge; all 9 take The Hunt).
// Eradicate on 36 of 47; Moment of Craving on all.
//
// The kit as the log shows it: outside the transformation Consume (~1s
// cast) builds Fury and Void Ray (a ~2s channel, 20 tick instants on its
// target) spends 100; soul pickups stack a counter (1225789) until Void
// Metamorphosis (1217607) is pressed. Inside it Consume becomes Devour (a
// 0.55s cast), Reap becomes Cull, Void Ray costs nothing and is followed
// by a Collapsing Star (a 1.3–2.1s cast, ~1M), and Fury drains faster and
// faster until it empties and the window ends (~43s, median). Neither the
// transformation nor Eradicate is ever logged as a cast: game.ts adds both
// as presses (devourerUnlogged), which closed the ~1s after each Void Ray
// that had read as idle (Konudh 82% → 92% GCD uptime).
//
// ── Void Metamorphosis window (metaWindow) ─────────────────────────────
// A GCD inside the window is worth more: the player's GCD damage there ÷
// their GCD uses there (Eradicate's hits included) ran 1.12–2.36× one
// outside (Limofans 323k vs 165k, Caukyy 297k vs 136k, Vathiondh 195k vs
// 157k; Vargona 270k vs 124k); the raw damage rate 1.8–5.6× (Meteors and
// procs lined up with it). observedWindowBonus can't read it: the window
// swaps the presses (Devour, Cull, Collapsing Star, its own Void Ray id
// 1214595), so few hits compare. burstGcdFindings counts the GCDs that
// fit (Void Ray's channel, Collapsing Star's cast and the transformation's
// own lock taken out) against the presses made; each missing one costs
// the window's GCD value over the player's average GCD at that moment (the
// gap check prices the rest). Lenient: idle there also costs Fury, which
// can end the window sooner; not counted.
// Measured (lost a pull): top Vathiondh, Influka none, Likdh 25k,
// Freakerino 38k, Ercege 60k, Pve 80k, Felstalker 109k (2:44, 28 of 33;
// his other windows mostly Vitriolic Stasis, forced), Konudh 215k, Caukyy
// 217k (2:59, 42 of 44 GCDs), Limofans 374k (1–2 GCDs short a window at
// 432k a GCD inside, 330k average: Reaper's Toll's hits count);
// weaker 稳重不失奔放 1.70M, Nyxh 1.38M (4:35, 27 of 36), Hoodh 1.34M,
// Burningpain 1.22M, 月满夜丶 1.20M, Vargona 1.19M (4:05, 8 of 15), Jexro
// 552k, Daimian 492k; 氺蘭斯氺 none (forced).
// WoWAnalyzer grades the same idle as a share of each window (98% for
// perfect); the app prices only the window's surplus.
//
// ── Eradicate overwritten (eradicateOverwritten) ───────────────────────
// Each Void Ray leaves an Eradicate (1239524) that the next Reap or Cull
// press spends (its hits, 1279200 / 1225827, 0.25s later). It never runs
// out in the samples (1,287 removals: every one without a hit is a 0.02s
// flicker, the kill, or the buff carried across a transformation's start
// or end), but a Void Ray that ends while one is still unspent refreshes it,
// and the old one is gone: Xaêro (KB1a9CWc6pT4VGqA, 70th) entered the
// transformation holding one (0:13.26) and pressed Void Ray first; the new
// one replaced it at 0:16.12. Each is a lost Eradicate press for the GCD it
// would have taken: the player's Eradicate (its hits ÷ its presses,
// 341–623k) less their average GCD there.
// An overwrite whose held span was mostly forced isn't counted (Promidh
// JvQpZk3CXj78Dx2f 0:57, a Void Ray through Vitriolic Stasis).
// Measured: Xaêro 5 a pull, 1.01M; Goodlookin (6Bpq1FmA9aH4WQxc) 2, 336k;
// one each for Caukyy (99.9th, 6:19) 207k, 紫色小猪 269k, Ribblez 229k,
// Purekenny 160k; the other 29 Eradicate players none.
//
// ── Measured and not built (numbers in the ledger) ─────────────────────
// - Void Ray cut short: 1,502 of ~1,650 channels land 20 tick instants on
//   their target, and 95 of the 113 with a press at the buff's removal do
//   too; under 18 ticks ~35 times in 47 pulls. Negligible.
// - Fury at the cap outside the transformation: top players cast at 120 as
//   often as the weak (Caukyy 7.3 a minute, Ercege 7.3, Limofans 6.2;
//   Vargona 1.1, Daimian 8.8). Void Ray waits on its cooldown (4.3s+
//   apart, p05), not on Fury; inside the window Fury sits at the cap by
//   design.
// - Reaper's Toll smuggled into the transformation (Voidblade or The Hunt
//   pressed just before it): no extra Toll in the window (Vathiondh 5 and 6
//   without, 4–7 with; Influka 5–6 either way), and both 99.9–100th players
//   skip it in 2–3 of 5 windows.
// - Reap / Cull counts: no recharge model (Moment of Craving resets it
//   after every Void Ray); rates don't separate within a build.
// - Voidstep (6.0s; Vengeful Retreat spends it): ~14k a use; Limofans
//   spends none of 22.
// - The Hunt (tracked, 91s): worth 0 a use (its hits log under 1246169
//   and 1246168), so it never reports, and left so: every one of the 9
//   players who take it presses it only 1–3 times a pull, the top ones too
//   (Felstalker 3 in 5:17, a 146s hold; Limofans 3 in 6:21, 181s), 9 of
//   the 23 presses just before a transformation (which resets it), so
//   valued it would fire on them as on the weak (Kraa 2 in 7:00).

import type { JobCheck, Moment } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { inWindows, mergeWindows, overlapMs, type Window } from "../../timeline";
import { burstGcdFindings, k, statusWindows } from "./shared";

// Ids from the sample logs' masterData (8kVQMJ4rmpnyRjBH, VbAHWZDdPwJBajmx).
const VOID_META = 1217607;
const ERADICATE = 1239524;
const ERADICATE_HITS = new Set([1279200, 1225827]);   // Eradicate (Cull), Eradicate (Reap)
const ERADICATE_HIT_MS = 800;

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

// ── Void Metamorphosis window ──────────────────────────────────────────

/** The player's GCD value inside Void Metamorphosis: their GCD damage there ÷ their GCD uses there. */
function metaGcdValue(ctx: PlayerCheckContext): number | undefined {
  const wins = statusWindows(ctx, VOID_META).filter((w) => w.startMs < ctx.endMs);
  if (wins.length === 0) return undefined;
  const gcdNames = new Set(ctx.player.casts.filter((c) => ctx.game.action(c.abilityId)?.onGcd).map((c) => c.abilityName));
  let dmg = 0;
  for (const e of ctx.player.damageDone) {
    if (e.timestamp >= ctx.endMs || !inWindows(e.timestamp, wins)) continue;
    if (ctx.game.isGcdDamage ? ctx.game.isGcdDamage(e, gcdNames) : !e.pet) dmg += e.amount ?? 0;
  }
  const n = ctx.uses.filter((u) => u.startMs < ctx.endMs && inWindows(u.startMs, wins)).length;
  return n >= 10 ? dmg / n : undefined;
}

const metaWindow: JobCheck = (ctx) => {
  const inside = metaGcdValue(ctx);
  if (inside === undefined) return [];
  return burstGcdFindings(ctx, {
    statusId: VOID_META, name: "Void Metamorphosis",
    bonus: (c: PlayerCheckContext, w: Window) => {
      const value = c.values.gcdValue(c.phaseOf(w.startMs), inWindows(w.startMs, c.buffWindows));
      return value > 0 ? Math.max(0, inside / value - 1) : 0;
    },
    bonusBasis: `the player's GCD inside Void Metamorphosis, ${k(inside)}, over their average`,
    inference: true,
  });
};

// ── Eradicate overwritten ──────────────────────────────────────────────

const eradicateOverwritten: JobCheck = (ctx) => {
  const ev = (ctx.player.buffs ?? []).filter((b) => b.abilityId === ERADICATE && b.timestamp < ctx.endMs).sort((a, b) => a.timestamp - b.timestamp);
  if (ev.length === 0) return [];
  const hits = ctx.player.damageDone.filter((e) => !e.pet && ERADICATE_HITS.has(e.abilityId) && e.timestamp < ctx.endMs + ERADICATE_HIT_MS);
  // Presses: removals with a hit after them (the press itself isn't logged).
  const presses = ev.filter((b) => b.buffStatus === "removed" && hits.some((e) => e.timestamp >= b.timestamp - 50 && e.timestamp <= b.timestamp + ERADICATE_HIT_MS)).length;
  if (presses < 5) return [];
  const per = hits.reduce((a, e) => a + (e.amount ?? 0), 0) / presses;
  const forced = mergeWindows(ctx.forced);
  const moments: Moment[] = [];
  let open: number | undefined, lost = 0;
  for (const b of ev) {
    if (b.buffStatus === "applied") { open = b.timestamp; continue; }
    if (b.buffStatus === "removed") { open = undefined; continue; }
    if (b.buffStatus !== "refreshed" || open === undefined) continue;
    // The old Eradicate, held from `open` to this refresh, is lost unless that time was mostly forced.
    const from = open;
    open = b.timestamp;
    if (overlapMs(from, b.timestamp, forced) >= (b.timestamp - from) / 2) continue;
    const gcd = ctx.values.gcdValue(ctx.phaseOf(b.timestamp), inWindows(b.timestamp, ctx.buffWindows));
    const v = Math.max(0, per - gcd);
    if (v <= 0) continue;
    lost += v;
    moments.push({ startMs: from, endMs: b.timestamp, lostDamage: v,
      detail: `Eradicate gained at ${clock(from)} and still unspent when the next Void Ray ended at ${clock(b.timestamp)}` });
  }
  if (moments.length === 0) return [];
  return [finding(ctx, {
    kind: "proc-lost", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Eradicate overwritten",
    lostDamage: lost,
    basis: `${moments.length} × (${k(per)}, the player's Eradicate (its hits ÷ ${presses} presses), − their average GCD it would have taken)`,
    detail: `${moments.length} Eradicate${moments.length > 1 ? "s" : ""} replaced unspent by the next Void Ray's`,
    moments,
  })];
};

export const DEVOURER_CHECKS: JobCheck[] = [metaWindow, eradicateOverwritten];
