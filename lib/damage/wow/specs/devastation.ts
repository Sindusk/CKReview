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
//
// ── Dragonrage drift: a use's worth (dragonrageValue) ─────────────────
// Dragonrage (375087) is tracked at 120s (tracked-cooldowns.ts) but deals
// nothing under its own id, so a lost use was worth 0 and its drift never
// reported. What a window adds, measured: Essence Burst (359618) gains run
// 0.15–0.39 a second inside it against 0.06–0.15 outside, 3–8 extra a use
// over its ~25–33s window (Animosity re-applications merged); each makes a
// Disintegrate free, worth one over the Living Flame it displaces
// (Disintegrate 370–503k a cast, Living Flame 45–87k); plus the Pyres the
// cast exhales (98–227k on one target, 0.4–0.7M on Vashnik's adds). Per
// use: 1.0–3.3M. The window's per-hit bonus is small (3–25% on most), and
// the raw damage rate inside vs outside (2.4–9.3M a use) carries the
// empowers, lust and potions lined up with it, so neither is used.
// Ready time in the fight's hold windows isn't held (burstHold), and a
// Dragonrage pressed before the pull counts (prePullStatusIds: Mythvoker,
// Vashnik, first removal 0:09, first cast 2:01.9).
// Measured: no top player loses a use. Qiyue 1.22M (ready 6:22, kill
// 6:35: room for a fourth), Emerie 783k (2:01 → 2:42 outside Stasis);
// Meatbulb's 23s at 4:15 falls in Vashnik's hold window.
//
// ── Fire Breath and Eternity Surge held (empowersHeld) ────────────────
// The two empowers (Font of Magic: Fire Breath 382266, Eternity Surge
// 382411; base 357208 / 359073) recharge faster with every Disintegrate
// tick (Causality) and Pyre hit. Fitted on the 18 Scalecommander
// player-pulls (sampledata/wow/_scratch/dev-emp.js; a re-press within 5s
// after a cancel is one press): Fire Breath 29.5s less 0.6s a Disintegrate
// tick instant and 0.3s a Pyre hit (1 of 287 intervals under the line,
// most 1–3s over it: a Disintegrate channel finishing), Eternity Surge
// 26.0s less 0.55s and 0.3s (3 of 319 under). Recharges run 14–18s in
// practice. A player with more than a tenth of their intervals under the
// line isn't judged for that empower (Emerie's Flameshaper Fire Breath:
// 19 of 26).
// Held = ready → next press, less forced, dead, movement and hold-window
// time (one recharge before its target) and 3s a cycle; a hold that ends
// in the first 6s of a Dragonrage window, begun before it and shorter
// than a recharge, is excused (lined up: each empower extends the window
// through Animosity); the time after the player's last press of the pull
// is the gap check's. A held second costs that share of a press: held ÷
// the average modelled recharge × (the player's press, its hits and burn
// by name, 180–585k − a Living Flame, the filler in its place, 45–87k).
// Measured (lost a pull): top Tëemo 156k (Fire Breath ready 0:55, pressed
// 1:04), Fistlad 84k, Elfuêgo 83k, Galakrussy 82k, Millzd 51k / 15k,
// Mythvoker 17k / 0, Aqrippae 11k; weaker Emerie 613k (Eternity Surge;
// 0:57, 2:58, 3:43, 5:45), Jorblóx 305k (Eternity Surge ready 2:27,
// pressed 3:00), Bragontix 301k, Meatbulb 207k, Lanidra 196k, Qiyue 118k,
// Skysong 104k, 夜漪微澜 67k, Asuia 52k. Small next to the other losses;
// the per-window empower count (WoWAnalyzer's Dragonrage rows) is mostly
// this hold, seen inside the window.
//
// Tip the Scales (370553) stays tracked and unvalued: it makes one
// empower instant at full rank, and every player here releases theirs
// early (0.5–1.1s of charge on average), so a use saves about half a GCD,
// ~0.1–0.2M. Its drift (Qiyue, Emerie, Elfuêgo, Mythvoker's 48s at
// 2:27–3:15 on Vashnik) is left unpriced.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { JobCheck, Moment } from "../../types";
import { finding } from "../../checks";
import { holdWindowsFor, inWindows, mergeWindows, overlapMs, statusWindows } from "../../timeline";
import { k, s } from "./shared";

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

// ── Dragonrage, a use's worth (dragonrageValue) ───────────────────────

const DRAGONRAGE = 375087;
const ESSENCE_BURST = 359618;
const DR_PYRE_MS = 1_500;

/** Damage per cast of an ability, its hits matched by name. */
function perCast(p: PlayerInfo, name: string, endMs: number): number {
  const n = p.casts.filter((c) => !c.fake && c.abilityName === name && c.timestamp < endMs).length;
  if (n === 0) return 0;
  return p.damageDone.filter((e) => !e.pet && e.abilityName === name && e.timestamp < endMs).reduce((a, e) => a + (e.amount ?? 0), 0) / n;
}

/**
 * One Dragonrage (tracked-cooldowns.ts): the Essence Bursts it adds (gains
 * a second inside its windows less outside, × its average window) each
 * worth a Disintegrate over the Living Flame it replaces, plus the Pyres
 * the cast exhales.
 */
export function dragonrageValue(p: PlayerInfo, endMs: number): { value: number; basis: string } | undefined {
  const wins = statusWindows(p, new Set([DRAGONRAGE]), endMs).filter((w) => w.startMs < endMs);
  const casts = p.casts.filter((c) => !c.fake && c.abilityId === DRAGONRAGE && c.timestamp < endMs).map((c) => c.timestamp);
  if (wins.length === 0 || casts.length === 0) return undefined;
  const inMs = wins.reduce((a, w) => a + Math.min(w.endMs, endMs) - w.startMs, 0);
  const outMs = endMs - inMs;
  if (inMs <= 0 || outMs <= 0) return undefined;
  const gains = (p.buffs ?? []).filter((b) => b.abilityId === ESSENCE_BURST && b.source === p.name && b.timestamp < endMs &&
    (b.buffStatus === "applied" || b.buffStatus === "stack"));
  const gIn = gains.filter((b) => inWindows(b.timestamp, wins)).length;
  const avgLen = inMs / wins.length;
  const extra = Math.max(0, (gIn / inMs - (gains.length - gIn) / outMs) * avgLen);
  const each = Math.max(0, perCast(p, "Disintegrate", endMs) - perCast(p, "Living Flame", endMs));
  const pyre = p.damageDone.filter((e) => !e.pet && e.abilityName === "Pyre" && casts.some((t) => e.timestamp >= t && e.timestamp <= t + DR_PYRE_MS))
    .reduce((a, e) => a + (e.amount ?? 0), 0) / casts.length;
  const value = extra * each + pyre;
  if (!(value > 0)) return undefined;
  return {
    value,
    basis: `${k(value)} a use: ${extra.toFixed(1)} extra Essence Bursts (gains a second inside its ${(avgLen / 1000).toFixed(0)}s windows less outside) × ${k(each)} (a Disintegrate − a Living Flame) + ${k(pyre)} of Pyres at the cast`,
  };
}

// ── Fire Breath and Eternity Surge held (empowersHeld) ────────────────

type Empower = { name: string; ids: Set<number>; baseMs: number; perTickMs: number; perPyreMs: number };
const EMPOWERS: Empower[] = [
  { name: "Fire Breath", ids: new Set([382266, 357208]), baseMs: 29_500, perTickMs: 600, perPyreMs: 300 },
  { name: "Eternity Surge", ids: new Set([382411, 359073]), baseMs: 26_000, perTickMs: 550, perPyreMs: 300 },
];
const EMP_REPRESS_MS = 5_000;     // a press this soon after the last is a re-press after a cancel
const EMP_ALLOW_MS = 3_000;       // a cycle's press timing (a Disintegrate channel can hold it ~2s)
const EMP_MISFIT_SHARE = 0.1;     // more of the player's intervals than this under the model: not judged
const EMP_DR_GRACE_MS = 6_000;    // a hold ending this early in a Dragonrage window, begun before it, is lined up
const EMP_TAIL_MS = 3_000;

const empowersHeld: JobCheck = (ctx) => {
  const p = ctx.player;
  const ticks: number[] = [];
  for (const t of p.damageDone.filter((e) => !e.pet && e.abilityName === "Disintegrate").map((e) => e.timestamp).sort((a, b) => a - b)) {
    if (ticks.length === 0 || t - ticks[ticks.length - 1] > TICK_SLACK_MS) ticks.push(t);
  }
  const pyre = p.damageDone.filter((e) => !e.pet && e.abilityName === "Pyre").map((e) => e.timestamp).sort((a, b) => a - b);
  const dr = statusWindows(p, new Set([DRAGONRAGE]), ctx.endMs);
  const filler = perCast(p, "Living Flame", ctx.endMs);
  // After the player's last press nothing was cast at all: the idle is the
  // gap check's, not a held empower's (Qiyue stopped at 5:59 of 6:35).
  const lastPress = Math.max(0, ...ctx.uses.filter((u) => u.startMs < ctx.endMs).map((u) => u.startMs));
  const out = [];
  for (const E of EMPOWERS) {
    const presses: number[] = [];
    for (const u of ctx.uses.filter((x) => E.ids.has(x.action.id) && x.startMs < ctx.endMs)) {
      if (presses.length && u.startMs - presses[presses.length - 1] < EMP_REPRESS_MS) presses[presses.length - 1] = u.startMs;
      else presses.push(u.startMs);
    }
    if (presses.length < 3) continue;
    const cuts = [...ticks.map((t) => ({ t, ms: E.perTickMs })), ...pyre.map((t) => ({ t, ms: E.perPyreMs }))].sort((a, b) => a.t - b.t);
    const readyAfter = (t0: number) => {
      let cut = 0;
      for (const c of cuts) {
        if (c.t <= t0) continue;
        if (c.t - t0 + cut >= E.baseMs) break;
        cut += c.ms;
      }
      return Math.max(t0, t0 + E.baseMs - cut);
    };
    const readies = presses.map(readyAfter);
    const below = presses.slice(1).filter((t, i) => t < readies[i] - 300).length;
    if (below > EMP_MISFIT_SHARE * (presses.length - 1)) continue;
    const avgRecharge = readies.slice(0, -1).reduce((a, r, i) => a + r - presses[i], 0) / (presses.length - 1);
    const casts = p.casts.filter((c) => !c.fake && E.ids.has(c.abilityId) && c.timestamp < ctx.endMs).length;
    const press = perCast(p, E.name, ctx.endMs) * casts / presses.length;
    const value = press - filler;
    if (!(value > 0) || !(avgRecharge > 0)) continue;
    const notHeld = mergeWindows([...ctx.forced, ...ctx.dead, ...(ctx.movement ?? []),
      ...holdWindowsFor(ctx.context?.cooldownHoldWindows?.(ctx.pull), avgRecharge)]);
    const moments: Moment[] = [];
    let heldMs = 0;
    for (let i = 0; i < presses.length; i++) {
      const from = readies[i], to = presses[i + 1] ?? Math.min(ctx.endMs, lastPress) - EMP_TAIL_MS;
      if (to <= from) continue;
      if (dr.some((w) => from < w.startMs && to >= w.startMs && to <= w.startMs + EMP_DR_GRACE_MS && to - from <= avgRecharge)) continue;
      const h = to - from - overlapMs(from, to, notHeld) - EMP_ALLOW_MS;
      if (h <= 0) continue;
      heldMs += h;
      moments.push({ startMs: from, endMs: to, lostDamage: h / avgRecharge * value,
        detail: `${E.name} ready ${clock(from)}, pressed ${presses[i + 1] !== undefined ? clock(to) : "never again"}: ${s(h)} held` });
    }
    if (moments.length === 0) continue;
    out.push(finding(ctx, {
      kind: "cooldown-drift", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
      label: `${E.name} held`,
      lostDamage: heldMs / avgRecharge * value,
      basis: `${s(heldMs)} held ÷ ${s(avgRecharge)} average recharge (${s(E.baseMs)} less ${E.perTickMs}ms a Disintegrate tick and ${E.perPyreMs}ms a Pyre hit) × ` +
        `(${k(press)} a ${E.name} − ${k(filler)} a Living Flame in its place); forced, dead, movement and hold-window time, ${s(EMP_ALLOW_MS)} a cycle and holds into Dragonrage excused`,
      detail: `${E.name} sat ready ${s(heldMs)} past its press timing (${presses.length} presses)`,
      moments,
    }));
  }
  return out;
};

export const DEVASTATION_CHECKS: JobCheck[] = [ticksClipped, empowersHeld];
