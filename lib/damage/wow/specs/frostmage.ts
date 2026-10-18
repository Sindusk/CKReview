// lib/damage/wow/specs/frostmage.ts
//
// Frost Mage's own checks (ranged.ts wires them; the spec has no burst
// window and, logging only mana, no resource check). Built in the
// WoWAnalyzer audit's phase 3 (docs/wowa-audit/mage-frost.md), every rule
// valued as damage lost. WoWAnalyzer's Frost is `lagging` (12.0.7), so each
// rule was tested against the log first. Measured 2026-10-17 on 21 Frost
// Mage player-pulls, all Mythic kills: fetched for it, the top Zhenglanxin
// (q1khJN3tL7Qcpg9d fight 30, Entombed Sentinels, 100th), Choechoi
// (nHavrDhPVtBYkMXA fight 48, 99.8th), 악용유저 (gtQBmXVDnHqYChRG fight
// 32, 99.6th; Redhexs is the other Frost Mage there), 夏夜椿湫
// (3ZYVyGkBqpDhKLFt fight 28, Vashnik, 100th), and the weaker Purer and
// Voxdeii (p4G1xa2yMqCDznZT fight 10, 20.6th for Purer), Mabho
// (hRr3amXQtW1FNgnf fight 2, 21.0th), Raisedxfist (K4anTbXNgf1H6Dzd fight
// 47, 21.6th); on disk Serasín (BTAdZMzQxgJf4XyH, 98.5th), Noribert
// (NvX17Tb9yMY8QrDf, 94.8th), Huggmark (PAgdKqkXDTRfLnJy, 93.3th),
// Choechoi on Vashnik (phzkLrdNBgtfCmW9, 89.5th), Pheanixx
// (dp6am4TQhG3cKFxR, Vashnik, 87.2th), Babymage (hjHXmdnJFwTPpMtK), Kysoon
// (9Nfcjg6rnRkYpd2Q), Angelona (zQq63GHTRwPgt2Bp), Lariel
// (CdMnBQWKX3gLYxym), Gerky (JdNq6WVXbvmxDgH9), Shaddâr
// (NrAkz46XQFvB7dT2), Supertitis (X618LRt7hPqzbVJj). Spell ids are from
// those logs' masterData.
//
// Talents (from casts and buffs): every Entombed Sentinels player is
// Spellslinger (Frost Splinter 443722, Splinterstorm), presses Frostbolt,
// Ice Lance, Flurry, Glacial Spike, Frozen Orb and Ray of Frost, and no
// Comet Storm. Three Vashnik players are Frostfire (Frostfire Bolt 431044,
// Comet Storm, Meteor; Choechoi switches to it there). Nobody presses Icy
// Veins: the spec has no burst window to judge. Shatter (1246949) is the
// spec's biggest hit (Zhenglanxin 43.2M, ~40% of his damage), dealt when
// an Ice Lance shatters the target; its Freezing stacks (1221389) aren't
// in the fetched enemy debuffs.
//
// ── Fingers of Frost wasted (fingersWasted) ────────────────────────────
// Fingers of Frost (44544) stacks to two; a proc gained at two logs as a
// "refreshed" with no stackRemoved at the same millisecond, and is lost.
// A full Ray of Frost channel (8 ticks) grants two: the top players enter
// it holding none (Zhenglanxin 10 of 10, Choechoi 8 of 8, Huggmark 8 of 9),
// the weaker often with one (Purer 6 of 10), and the second proc in the
// channel is wasted. Counted when the proc lands in a press made with two
// held, or a Ray of Frost pressed with one, the held count reached
// REACT_MS+ before the press (a Frostbolt or Glacial Spike that lands as
// Ray of Frost begins can't be answered: Purer 3:12.9, 4:02.1). A third
// proc landing in a press begun with none (two procs in one Ray) isn't
// counted. Unforced only.
// Value: an Ice Lance with Fingers of Frost lost, priced as the player's
// average Ice Lance press with it − without (each press's hits and the
// Shatter hits to the next press): 36–200k on the 21 (Zhenglanxin 415k −
// 350k, Purer 222k − 186k, Babymage 354k − 186k). Lenient: an Ice Lance
// without Fingers often shatters too.
// Measured (lost a pull): top Zhenglanxin, Choechoi (both bosses), 夏夜椿湫,
// Noribert, Kysoon, Gerky none; 악용유저 199k (1, Ray of Frost at 0:02 with
// one held from the pre-pull); Serasín 90k. Others: Redhexs 2.94M (14;
// entered five Rays with two held, 1:00, 1:40, 3:52, 5:25), Babymage 1.17M
// (7; Frostbolt pressed with two held at 1:13, 2:36, 4:10, 5:12), Pheanixx
// 1.16M (7), Shaddâr 504k, Lariel 491k, Supertitis 390k, Huggmark 303k,
// Raisedxfist 222k, Angelona 114k, Purer 109k, Mabho 80k, Voxdeii 37k.
// The 20th-percentile players read low (their Ice Lances without Fingers
// are worth nearly as much), so it marks a habit more than a rank.
//
// ── Measured and not built (mage-frost.md has the rows) ────────────────
// - Brain Freeze overwritten (190446 "refreshed", at a Frozen Orb press or
//   the landing of a Frostbolt / Glacial Spike pressed with it held): top
//   0–3 a pull (Zhenglanxin 1, Choechoi 0, 악용유저 3, 夏夜椿湫 1), the
//   others 0–9 (Purer 7, Mabho 7, Babymage 9, Raisedxfist 3, Huggmark 0). The empowered Flurry is worth only
//   −57k to +43k more than a plain one (with − without), so ≤0.4M a pull at
//   that price. Whether a Brain Freeze also grants the Flurry press (a
//   charge) isn't in the log: 5–17 Flurries a pull are cast without it.
// - Flurry into Thermal Void (1247730, an 8.0s buff): 0–2 a pull on top
//   and weak alike (Redhexs 5). Negligible.
// - Ray of Frost ticks clipped: top players clip as often (악용유저 5 of 10
//   Rays at 7 ticks, Mabho 7 of 10), and Frostfire players clip on purpose
//   to reset Comet Storm (Choechoi on Vashnik: all 5 Rays at 2–3 ticks).
// - Brain Freeze never runs out (0 of ~600 removals without a Flurry), so
//   it has no duration; Fingers of Frost's 15s is in procs.ts.

import type { JobCheck, Moment } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { inWindows, mergeWindows } from "../../timeline";
import { k } from "./shared";

const FINGERS = 44544;
const ICE_LANCE = 30455;
const RAY_OF_FROST = 205021;
const REACT_MS = 300;
const HIT_TAIL_MS = 250;

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const mean = (xs: number[]) => xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : NaN;

/**
 * The player's Ice Lance presses, each with its hits and the Shatter hits
 * that follow it (to the next GCD press, + HIT_TAIL_MS), split by whether
 * the press spent a Fingers of Frost.
 */
function iceLanceValues(ctx: PlayerCheckContext) {
  const p = ctx.player;
  const own = (p.buffs ?? []).filter((b) => b.source === p.name && b.abilityId === FINGERS);
  const spent = own.filter((b) => b.buffStatus === "removed" || b.buffStatus === "stackRemoved").map((b) => b.timestamp);
  const presses = ctx.uses.filter((u) => u.startMs < ctx.endMs).sort((a, b) => a.startMs - b.startMs);
  const hits = p.damageDone.filter((e) => !e.pet && (e.abilityName === "Ice Lance" || e.abilityName === "Shatter"));
  const withF: number[] = [], without: number[] = [];
  presses.forEach((u, i) => {
    if (u.action.id !== ICE_LANCE) return;
    const until = Math.max(presses[i + 1]?.startMs ?? u.startMs + 1_500, u.startMs + 300) + HIT_TAIL_MS;
    const dmg = hits.filter((e) => e.timestamp > u.startMs && e.timestamp <= until).reduce((a, e) => a + (e.amount ?? 0), 0);
    (spent.some((t) => Math.abs(t - u.startMs) < 150) ? withF : without).push(dmg);
  });
  return { withF: mean(withF), without: mean(without), nWith: withF.length, nWithout: without.length };
}

// Fingers of Frost wasted: a proc gained at two stacks (WCL logs it as a
// "refreshed" with no stackRemoved beside it) after the player pressed
// something other than Ice Lance while holding both.
const fingersWasted: JobCheck = (ctx) => {
  const p = ctx.player;
  const ev = (p.buffs ?? []).filter((b) => b.source === p.name && b.abilityId === FINGERS).sort((a, b) => a.timestamp - b.timestamp);
  if (ev.length === 0) return [];
  const removedStack = ev.filter((b) => b.buffStatus === "stackRemoved").map((b) => b.timestamp);
  const forced = mergeWindows(ctx.forced);
  const v = iceLanceValues(ctx);
  const each = v.withF - v.without;
  if (!(each > 0) || v.nWith < 5 || v.nWithout < 5) return [];
  // Stacks held at t, and when that count was reached.
  const stateAt = (t: number) => {
    let n = 0, since = 0;
    for (const e of ev) {
      if (e.timestamp > t) break;
      if (e.buffStatus === "applied") { n = 1; since = e.timestamp; }
      else if (e.buffStatus === "stack") { n = e.stack ?? 2; since = e.timestamp; }
      else if (e.buffStatus === "stackRemoved") { n = e.stack ?? 1; since = e.timestamp; }
      else if (e.buffStatus === "removed") { n = 0; since = e.timestamp; }
    }
    return { n, since };
  };
  const presses = ctx.uses.filter((u) => u.startMs < ctx.endMs).sort((a, b) => a.startMs - b.startMs);
  const moments: Moment[] = [];
  for (const e of ev) {
    if (e.timestamp >= ctx.endMs) break;
    if (e.buffStatus !== "refreshed") continue;
    if (removedStack.some((t) => Math.abs(t - e.timestamp) <= 5)) continue;   // the refresh logged with a spend
    if (inWindows(e.timestamp, forced)) continue;
    // The press the proc landed in (a Ray of Frost channel, a Frostbolt cast).
    const press = [...presses].reverse().find((u) => u.startMs < e.timestamp - 5);
    if (!press || press.action.id === ICE_LANCE) continue;
    const st = stateAt(press.startMs - 1);    if (st.since > press.startMs - REACT_MS) continue;
    // Pressed with both held, or into a Ray of Frost (its full channel gives
    // two) with one held.
    const avoidable = st.n >= 2 || (press.action.id === RAY_OF_FROST && st.n >= 1);
    if (!avoidable) continue;
    moments.push({ startMs: press.startMs, endMs: e.timestamp, lostDamage: each,
      detail: `${clock(e.timestamp)}: a Fingers of Frost gained at two stacks, in a ${press.abilityName} pressed at ${clock(press.startMs)} with ${st.n} held` });
  }
  if (moments.length === 0) return [];
  return [finding(ctx, {
    kind: "proc-lost", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Fingers of Frost wasted",
    lostDamage: moments.length * each,
    basis: `each an Ice Lance with Fingers of Frost lost: ${k(v.withF)} average Ice Lance press with it (its hits and the Shatter after, ${v.nWith}) − ${k(v.without)} without (${v.nWithout})`,
    detail: `${moments.length} Fingers of Frost gained at two stacks, in a spell pressed with both held (or with one, into a Ray of Frost): an Ice Lance first would have kept ${moments.length > 1 ? "them" : "it"}`,
    moments,
  })];
};

export const FROST_MAGE_CHECKS: JobCheck[] = [fingersWasted];
