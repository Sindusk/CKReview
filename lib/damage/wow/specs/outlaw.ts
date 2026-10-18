// lib/damage/wow/specs/outlaw.ts
//
// Outlaw Rogue's own checks, beside the Adrenaline Rush window melee.ts
// gives it. Built in the WoWAnalyzer audit's phase 3
// (docs/wowa-audit/rogue-outlaw.md; WoWAnalyzer's Outlaw is `lagging`,
// 12.0.7, partly maintained), every rule valued as damage lost. Measured
// 2026-10-17 on 17 Outlaw player-pulls, all Mythic kills: the top parses
// Nøwyouseemee and Âv (9XD63Z1tFWKmvCAG, Vashnik 98.8th / 91.9th),
// Scoreboard (LnNK1CxVJZQ9kfX3, 100th), Decapre (VJgMTWKFBA7n1j3p, 97.7th),
// 저는싸이코입니다 (M4vNdFBK8Yacb9mC, Entombed Sentinels 100th), 云梦默
// (6y7k1CLj3ABbmVJK, 99th); the weaker Nicsterkins (cpdvJRj9g3WAThzx,
// Vashnik and Sentinels, 1–5th), Lobotomi (RFh1Cp4xdL6aY9qt), 步玎
// (tdPcqXCya18rzVZK), Soulsick (PzG3QDc4g7AKdJw8); and Buffoutlaw,
// Loktark, Buckaneering, Ilikesneakin, Rosey, Stabbybuddy (on disk
// before). Spell ids are from those logs' masterData.
//
// Talents (casts and buffs): every player Trickster (Coup de Grace,
// Unseen Blade, Escalating Blade), Killing Spree, Keep It Rolling,
// Preparation, combo points to 7; Blade Rush on 7 of 17; nobody Audacity.
// Combo points are logged on finishers only (type 4, before the spend),
// and finishers refund points the log doesn't show: from one finisher to
// the next with no builder between, the second is at 7 points at the
// median, every player. Fang Strike (1301405) makes a finisher free (no
// cost logged).
//
// ── No Energy cap check ────────────────────────────────────────────────
// Energy never limits Outlaw. Presses below 45 Energy (a Sinister Strike):
// 0–1 on 11 of 17 player-pulls; GCDs late with the Energy barely there: 0
// on 12 of 17, at most 14s (Nicsterkins, at the cap on 3% of presses).
// The players most often at the cap (Buckaneering 21%, Soulsick 20%,
// Nøwyouseemee 12% of presses) never waited on Energy. The shared
// primaryResourceCapFindings read top 0–1.32M (Âv 1.32M, Nøwyouseemee
// 1.11M) and weak 64k–1.13M, from Blade Rush pressed at the cap and
// Adrenaline Rush pressed at 200 (it raises the cap to 250: nothing lost).
// So melee.ts gives Outlaw this file's checks in its place (pending the
// user's review, docs/wowa-audit/rogue-outlaw.md).
//
// ── Finisher below 6 combo points (finisherLowCp) ──────────────────────
// Dispatch, Between the Eyes or Coup de Grace spent below the cap less one
// (6 of 7), as WoWAnalyzer's floor has it. Not counted: Killing Spree (its
// floor is lower and its damage doesn't track the points: 6 points
// 0.44–1.18M, 7 points 0.40–1.36M), Slice and Dice, free finishers, a
// finisher right after another finisher (a refund put the points there:
// no builder was pressed for them; about half of the low ones), one with
// Opportunity up (a Pistol Shot volley would overcap), one whose target
// the player didn't hit again within 4s (dying or left), forced time.
// Lost per press = the points short of 6 × the player's damage a point for
// that finisher: its own hits at 7 points ÷ 7 (Dispatch 11–18k, Between
// the Eyes 17–35k, Coup de Grace 11–17k). Lenient: short of 7 would be
// more, and the top players spend at 6 on 20–30% of finishers.
// Measured (lost a pull): top Scoreboard, Nøwyouseemee, Âv, 저는싸이코입니다
// none; Decapre 27k (2); 云梦默 159k (7, a 3-point Dispatch at 0:02 and
// Coups de Grace at 5 points: 0:38, 1:34, 1:43, 2:30). Weaker: Nicsterkins
// 342k on Vashnik (24: Between the Eyes at 5 points 0:30, 0:36, 0:47),
// 266k on Sentinels (14), Soulsick 152k, Buckaneering 149k, Lobotomi 93k,
// Stabbybuddy 42k, Buffoutlaw 28k, Rosey 24k. Small but one-sided.
//
// ── Measured and not built ─────────────────────────────────────────────
// - Adrenaline Rush held (Restless Blades): a use is worth a lot (the
//   player's damage in it ×1.6–3.4 their rate outside; presses 1.04–1.10
//   a second against 0.87–0.94), but no recharge rule fits. WoWAnalyzer's
//   (1s a combo point, ×1.3 under Triple Threat, Coup de Grace +5,
//   Preparation a reset) has 38 of 58 top-player casts before the rebuilt
//   ready time, up to 25s; faster rules spread as widely: the top players'
//   intervals sit at 27–32s whether 81 or 106 points were spent. The
//   lenient rule (1s a point) finds 0.7–19s of hold on 4 of 17, under one
//   use. Killing Spree and Blade Rush share the reduction.
// - Roll the Bones down: top 91–100% up, weak to 60%, but mostly dead
//   time or an opener rolled with Adrenaline Rush's Loaded Dice (top
//   players too: Decapre 0:24), and a roll's worth doesn't show: Sinister
//   Strike does the same with one up as without (Loktark 45k vs 44k,
//   Stabbybuddy 34k vs 41k).
// - Sinister Strike with Opportunity up: the top players do it as much
//   (Âv 27 of 100), and Opportunity never re-procs while held.
// - Opportunity running out: procs.ts (12s).

import type { JobCheck, Moment } from "../../types";
import { finding } from "../../checks";
import { forcedPart } from "../../timeline";
import { k } from "./shared";

const DISPATCH = 2098;
const BETWEEN_THE_EYES = 315341;
const COUP_DE_GRACE = 441776;
const OPPORTUNITY = 195627;
const CP = 4;
// Each finisher's own hits (Coup de Grace hits as three "Dispatch (Coup de Grace)" ids).
const OWN_HITS = new Map<number, Set<number>>([
  [DISPATCH, new Set([DISPATCH])],
  [BETWEEN_THE_EYES, new Set([BETWEEN_THE_EYES])],
  [COUP_DE_GRACE, new Set([462140, 462239, 462240])],
]);
const FINISHER_IDS = new Set([DISPATCH, BETWEEN_THE_EYES, COUP_DE_GRACE, 51690, 315496]);   // + Killing Spree, Slice and Dice
const OWN_MS = 400;
const TARGET_GONE_MS = 4_000;
const MIN_SAMPLES = 3;
const MIN_LOST = 1_000;

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const avg = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / xs.length;

/** Whether the player's own status was up just before t. */
function upBefore(buffs: { abilityId: number; timestamp: number; buffStatus?: string; source?: string }[], statusId: number, t: number): boolean {
  let on = false;
  for (const b of buffs) {
    if (b.abilityId !== statusId) continue;
    if (b.timestamp >= t) break;
    on = b.buffStatus !== "removed";
  }
  return on;
}

// ── Finisher below the floor ───────────────────────────────────────────
const finisherLowCp: JobCheck = (ctx) => {
  const own = (ctx.player.buffs ?? []).filter((b) => b.source === ctx.player.name).sort((a, b) => a.timestamp - b.timestamp);
  const casts = ctx.player.casts.filter((c) => !c.fake && c.timestamp < ctx.endMs).sort((a, b) => a.timestamp - b.timestamp);
  const fins = casts.filter((c) => OWN_HITS.has(c.abilityId) && (c.resources?.find((r) => r.type === CP)?.cost ?? 0) > 0);
  if (fins.length < 10) return [];
  const max = fins[0].resources!.find((r) => r.type === CP)!.max ?? 7;
  const floor = max - 1;
  const mine = ctx.player.damageDone.filter((e) => !e.pet);
  const ownOf = (c: typeof casts[number]) => {
    const ids = OWN_HITS.get(c.abilityId)!;
    return mine.filter((e) => ids.has(e.abilityId) && e.timestamp >= c.timestamp - 20 && e.timestamp < c.timestamp + OWN_MS).reduce((a, e) => a + (e.amount ?? 0), 0);
  };
  // The player's damage a point for each finisher, from their own presses at the cap.
  const perPoint = new Map<number, number>();
  for (const id of OWN_HITS.keys()) {
    const atCap = fins.filter((c) => c.abilityId === id && c.resources!.find((r) => r.type === CP)!.cost === max).map(ownOf);
    if (atCap.length >= MIN_SAMPLES) perPoint.set(id, avg(atCap) / max);
  }
  const presses = ctx.uses.map((u) => ({ t: u.startMs, id: u.action.id }));
  const moments: Moment[] = [];
  let lost = 0;
  for (const c of fins) {
    const spent = c.resources!.find((r) => r.type === CP)!.cost!;
    if (spent >= floor) continue;
    const per = perPoint.get(c.abilityId);
    if (!per) continue;
    if (forcedPart(c.timestamp, c.timestamp + 1, ctx.forced).ms > 0) continue;
    // A combo-point refund after a finisher put the player there: no builder was pressed for these points.
    const prev = [...presses].reverse().find((x) => x.t < c.timestamp - 50);
    if (!prev || FINISHER_IDS.has(prev.id)) continue;
    // Pistol Shot's extra shots would overcap the points.
    if (upBefore(own, OPPORTUNITY, c.timestamp)) continue;
    // A target about to die (or left): spending what's there is right.
    const next = mine.find((e) => e.target === c.target && e.timestamp > c.timestamp + OWN_MS);
    if (!next || next.timestamp - c.timestamp > TARGET_GONE_MS) continue;
    const each = (floor - spent) * per;
    lost += each;
    moments.push({ startMs: c.timestamp, endMs: c.timestamp, lostDamage: each,
      detail: `${c.abilityName} at ${clock(c.timestamp)} with ${spent} combo point${spent > 1 ? "s" : ""} (${floor - spent} under ${floor})` });
  }
  if (moments.length === 0 || lost < MIN_LOST) return [];
  const rates = [...perPoint.entries()].map(([id, v]) => `${casts.find((c) => c.abilityId === id)?.abilityName ?? id} ${k(v)}`).join(", ");
  return [finding(ctx, {
    kind: "wrong-gcd", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: `Finisher below ${floor} combo points`,
    lostDamage: lost,
    basis: `each: the points short of ${floor} × the finisher's damage a point (its own hits at ${max} points ÷ ${max}: ${rates})`,
    detail: `${moments.length} finisher${moments.length > 1 ? "s" : ""} spent below ${floor} of ${max} combo points right after a builder, without Opportunity up`,
    moments,
  })];
};

export const OUTLAW_CHECKS: JobCheck[] = [finisherLowCp];
