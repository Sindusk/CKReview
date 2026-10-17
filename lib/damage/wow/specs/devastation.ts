// lib/damage/wow/specs/devastation.ts
//
// Devastation Evoker's own checks, beside the shared ones ranged.ts gives
// it (Dragonrage window, Strafing Run expired) and the tracked cooldowns.
// Built in the WoWAnalyzer audit's phase 3 (docs/wowa-audit/
// evoker-devastation.md), every rule valued as damage lost. Measured
// 2026-10-17 on 19 Devastation player-pulls, all Mythic kills: the top
// parses Mythvoker (vRPGT4MN6VALQWFh, Entombed Sentinels 100th, Vashnik
// 99.0th), Tëemo (fcj1YgaCJBT2kXFm, Vashnik 100th), Galakrussy
// (dG8D9y6WxrfmtgXp, Entombed Sentinels 99.7th), Fistlad
// (Kag91qVZ2YJ7MQAb, Vashnik 99.4th), Aqrippae (MLy7nw8kaW1D394Y, 98.2nd),
// Elfuêgo (r9CX1kpRGLmKJH4M, 94.2nd) and Millzd (tcdpmV7MBHK1jGYk 89.7th,
// NvX17Tb9yMY8QrDf 83.5th); the weaker Brakkarion (atJRCq3YM8P4KGpD,
// Vashnik 1st), Skysong (1NL29tyvbzGhZgPK, 9.3rd), Qiyue
// (VbAHWZDdPwJBajmx, 16.0th), Lanidra (fh6bLKy12gzWvGCH, 16.7th), 夜漪微澜
// (MaWQwnygjkh1czL8, 32.4th), Emerie (nhbCYHXRf1T2qAv9, Entombed
// Sentinels 32.7th), Meatbulb (9w3bK4qhrRC82gVX, 47.1st), Jorblóx
// (VBPkNJnWMdZx8wQ1, 48.0th), Asuia (ZvrLTQfk1zbAXMwB, 68.8th) and the
// static's Bragontix (qpZx3mWaG7gcDdYB, the case study). Percentiles are
// WCL's Devastation ranking. Spell ids are from those logs' masterData.
//
// Talents (casts and buffs): 18 of 19 play Scalecommander (Deep Breath
// with Strafing Run, Mass Disintegrate, Bombardments); Emerie plays
// Flameshaper (27 Fire Breaths, no Deep Breath). Everyone takes
// Dragonrage, Tip the Scales, Font of Magic (Fire Breath 382266, Eternity
// Surge 382411), Burnout, Essence Burst, Leaping Flames, Imminent
// Destruction and Rising Fury (Unbound Flame on five players).
//
// ── Disintegrate ticks clipped (ticksClipped) ─────────────────────────
// Disintegrate (356995) ticks at its start and every T after, 5 ticks over
// 4T (T ~0.35–0.55s, hasted). The k-th tick lands only when the next GCD
// starts past (k − 1)T (next start at 3.5T → 4 ticks 36 of 38; at 4.25T →
// 5 ticks 155 of 168), so a press before the end drops the ticks left.
// Chaining Disintegrate onto itself carries one tick into the new channel
// (after a chain that dropped one, 10 of 22 ran to six ticks), so a chain
// loses only past the first. The engine reads the clipped channel as
// channel time, not idle (timeline.ts channelLocks; 5–9s a pull on the
// top players had read as GCD delays).
// A clip trades ticks for time: each dropped tick is worth the player's
// Disintegrate damage (Mass Disintegrate's other targets included) ÷ the
// tick instants on their cast targets (76–113k), less the time the clip
// gained (the full channel's end − the next press) at the player's average
// GCD rate. A last tick dropped at 3.8–4T gains almost nothing; two ticks
// dropped at 2.5T for an empower about break even, so only late clips cost.
// Clips whose next press is in forced or movement time aren't counted.
// Measured (lost a pull): top Tëemo 960k (12 clips; a Burnout Living Flame
// pressed 10ms before the last tick at 3:33 and 4:23, 99k each), Mythvoker
// 798k / 482k, Millzd 438k / 150k, Galakrussy 376k, Fistlad 290k, Aqrippae
// 213k; weaker Elfuêgo (94th) 2.44M (10 instant Living Flames on the last
// tick), Qiyue 1.42M (27 clips), Skysong 1.22M, Lanidra 1.00M, Jorblóx
// 768k, Asuia 566k, Bragontix 468k, Brakkarion 406k, 夜漪微澜 389k,
// Meatbulb 182k, Emerie (Flameshaper) 88k. It fires on the top players
// too, but each moment is a tick paid for and dropped for no time gained,
// and the habit separates them: a clip of the last tick alone 3–13 times a
// pull on the top players (median 6), 7–24 on the weaker (median 14).
// WoWAnalyzer grades the same ticks (its tick efficiency; Bragontix
// 340 / 385 against 380 / 415 here, chains counted as carried).

import type { JobCheck, Moment } from "../../types";
import { finding } from "../../checks";
import { inWindows, mergeWindows } from "../../timeline";
import { k } from "./shared";

// Ids from the sample logs' masterData (dG8D9y6WxrfmtgXp, fcj1YgaCJBT2kXFm).
const DISINTEGRATE = 356995;
const DIS_TICKS = 5;           // a full channel's ticks, one at its start
const TICK_SLACK_MS = 25;      // ticks of one channel on one target within this are one

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

// ── Disintegrate ticks clipped (ticksClipped) ─────────────────────────

const ticksClipped: JobCheck = (ctx) => {
  const p = ctx.player;
  const hits = p.damageDone.filter((e) => !e.pet && e.abilityName === "Disintegrate");
  if (hits.length === 0) return [];
  const byTarget = new Map<string, number[]>();
  for (const e of hits) {
    const list = byTarget.get(e.target ?? "") ?? [];
    list.push(e.timestamp);
    byTarget.set(e.target ?? "", list);
  }
  for (const list of byTarget.values()) list.sort((a, b) => a - b);
  const uses = ctx.uses.filter((u) => u.startMs < ctx.endMs);
  const excused = mergeWindows([...ctx.forced, ...(ctx.movement ?? []), ...ctx.dead]);
  type Clip = { t: number; next: number; nextName: string; dropped: number; gainedMs: number; T: number };
  const clips: Clip[] = [];
  let tickInstants = 0, carry = 0;
  for (let i = 0; i < uses.length; i++) {
    const u = uses[i];
    if (u.action.id !== DISINTEGRATE) continue;
    const next = uses[i + 1];
    const until = next?.startMs ?? ctx.endMs;
    const chain = next?.action.id === DISINTEGRATE;
    const own: number[] = [];
    for (const t of byTarget.get(u.target ?? "") ?? []) {
      if (t < u.startMs - TICK_SLACK_MS) continue;
      if (t >= until - (chain ? TICK_SLACK_MS : -TICK_SLACK_MS)) break;
      if (own.length === 0 || t - own[own.length - 1] > TICK_SLACK_MS) own.push(t);
    }
    tickInstants += own.length;
    const expected = DIS_TICKS + carry;
    carry = 0;
    if (own.length < 2 || !next) continue;
    const T = (own[own.length - 1] - own[0]) / (own.length - 1);
    const end = own[0] + (expected - 1) * T;
    if (next.startMs >= end) continue;
    const dropped = Math.max(0, expected - own.length - (chain ? 1 : 0));
    if (chain && expected - own.length >= 1) carry = 1;
    if (dropped === 0 || inWindows(next.startMs, excused)) continue;
    clips.push({ t: u.startMs, next: next.startMs, nextName: next.abilityName, dropped, gainedMs: end - next.startMs, T });
  }
  if (clips.length === 0 || tickInstants === 0) return [];
  const perTick = hits.filter((e) => e.timestamp < ctx.endMs + 3_000).reduce((a, e) => a + (e.amount ?? 0), 0) / tickInstants;
  const moments: Moment[] = [];
  let lost = 0, ticks = 0;
  for (const c of clips) {
    const gcdMs = ctx.baseGcdMs / ctx.factor * ctx.factorAt(c.next);
    const rate = ctx.values.gcdValue(ctx.phaseOf(c.next), inWindows(c.next, ctx.buffWindows)) / gcdMs;
    const v = c.dropped * perTick - c.gainedMs * rate;
    if (v <= 0) continue;
    lost += v; ticks += c.dropped;
    moments.push({ startMs: c.t, endMs: c.next, lostDamage: v,
      detail: `Disintegrate at ${clock(c.t)} clipped by ${c.nextName}: ${c.dropped} tick${c.dropped > 1 ? "s" : ""} dropped, ${(c.gainedMs / 1000).toFixed(2)}s gained` });
  }
  if (moments.length === 0) return [];
  return [finding(ctx, {
    kind: "interrupted-cast", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Disintegrate ticks clipped",
    lostDamage: lost,
    basis: `${ticks} ticks dropped × ${k(perTick)} a tick (the player's Disintegrate damage ÷ ${tickInstants} tick instants on their targets), less the time each clip gained at the player's average GCD rate`,
    detail: `${moments.length} Disintegrates clipped before their last tick by another press (forced and movement time excused)`,
    moments,
  })];
};

export const DEVASTATION_CHECKS: JobCheck[] = [ticksClipped];
