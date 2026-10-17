// lib/damage/wow/specs/windwalker.ts
//
// Windwalker Monk's own checks, beside the shared ones melee.ts gives it
// (Invoke Xuen window, Energy at the cap, the tracked Xuen and Celestial
// Conduit cooldowns). Built in the WoWAnalyzer audit's phase 3
// (docs/wowa-audit/monk-windwalker.md), every rule valued as damage lost.
// Measured 2026-10-17 on Entombed Sentinels Mythic kills: the top parses
// Styphi (ACmXHMFtaPLR9k8w), Jordomonk (VWMbYPRyxCAmhZFj), Neyha
// (LckJC7GMhQvD6rdw) and Krylest (xN9cWhzbvqTVfrG8); the weaker Blkphnx
// (qpZx3mWaG7gcDdYB, the case study), Shoccemnk (PAgdKqkXDTRfLnJy), Leluu
// (v8bmgMAdcnBCj9Ya) and ßacardi (wWx8B1GPZMLghAyz, Shado-Pan). Spell ids
// are from those logs' masterData.
//
// ── Fists of Fury held (fistsHeld) ─────────────────────────────────────
// Fists of Fury (113656; hits 117418) is the spec's biggest button, 22–27%
// of the damage. Its cooldown is cut server-side, so the log never says
// when it came back; it's rebuilt here from what the log does show:
// - 24s at base, recovering at (1 + haste) where haste is the gear rating
//   at the pull ÷ 44 per 1%. Haste procs and potions are left out, which
//   makes the rebuilt ready time late (lenient).
// - recovery ×1.75 for each Heart of the Jade Serpent buff up (443421,
//   443616, 1238904) and ×1.3 in lust;
// - 1s off per Blackout Kick (100784), 2s inside Zenith (1249625), and the
//   same again when Teachings of the Monastery (202090) is consumed within
//   TEACHINGS_MS of one;
// - 4s off per critical hit of Rising Sun Kick (185099), Rushing Wind Kick
//   (468179) or Glory of the Dawn (392959);
// - 0.5s off per enemy a Spinning Crane Kick (107270) hits, up to 5.
// Checked against the seven top players: 12–23 of their 32–37 casts come
// 0.3–4.6s before the rebuilt ready time (about two thirds inside
// Zenith), the weaker players' 2–12. So the model is slow, never fast:
// what it calls held, was. It reproduces the case study's gap
// (WoWAnalyzer's ~3.6s vs ~1.2s ready-but-unpressed a cast).
//
// The time from the rebuilt ready time to the next cast is held, less
// forced time, movement windows, the part of another channel (Celestial
// Conduit, Spinning Crane Kick) past its GCD, and HOLD_ALLOW_MS a cycle
// (the GCD it came back in, a combo step). Each held second loses that
// share of a Fists: held ÷ the player's average rebuilt recharge × (their
// average Fists − the Tiger Palm / Blackout Kick GCDs its channel took),
// with the Fists average inside the burst (Zenith or Invoke Xuen,
// 123904) for held time inside it. The average, not the cycle's own: a
// held second pushes every later Fists back, and a burst cycle can
// rebuild in 3–4s (Spiritbound, Vashnik 4:44), which priced one held
// second at a third of a Fists.
//
// Held into the burst: a Fists inside Zenith / Xuen did 1.5–2.4× one
// outside (one target, medians; e.g. Styphi 373k → 586k, Blkphnx 228k →
// 537k), so holding one that's ready just before the window pays for a
// few seconds. A hold that ends in the first BURST_GRACE_MS of a window,
// having started before it, is excused up to its break-even: (Fists
// inside − outside) ÷ the value of one held second outside, and never
// past one recharge: a Fists ready longer before the window than that
// could have been pressed and been back in time. The top players all do
// this: Styphi 7s into 4:32, Neyha 4.5s into 4:36, Krylest 4s into 1:30.
//
// Measured (lost a pull):
// - top, Entombed Sentinels: Styphi, Neyha, Chumfu (GndQ9VFWtLzNjKpk),
//   Kreemoncow (baRCnPv62YQ1dJZN) none; Krexonaut (dG8D9y6WxrfmtgXp) 21k;
//   Elevatedhota (JvQpZk3CXj78Dx2f) 30k; Krylest 35k; Candybrew
//   (Vr8dLPtFYWA4G1yg) 44k; Chijing (MLy7nw8kaW1D394Y) 63k; Jordomonk
//   233k, 190k of it one cycle: ready in Stasis at 4:19, then 9s of other
//   spenders (4:34–4:43) before his 4:47 Zenith. Vashnik: Spiritbound
//   (hjHXmdnJFwTPpMtK, 98th) 224k.
// - weaker: Blkphnx 394k (240k at 4:32–4:45: Tiger Palm / Blackout Kick
//   for 13s after Stasis with it ready, into Xuen at 4:45; 9.9s of it
//   excused), and 8.08M over his static's 14 pulls (gVDPhzp61Zm29HMw;
//   up to 1.62M, Coiled Altar 2:38–3:12); ßacardi (Shado-Pan, no Heart)
//   1.17M, 613k of it 2:46–3:44, a minute of Tiger Palm / Blackout Kick
//   into Zenith; Omzo (9w3bK4qhrRC82gVX, Vashnik 20th) 384k; Leluu 93k;
//   Shoccemnk 15k. Most of the weaker players' long holds (Leluu
//   0:45–1:05 and 6:09–6:28, Shoccemnk's 4:15) sit in Vitriolic Stasis and
//   aren't counted; WoWAnalyzer counts them, hence its 65% vs 84%.
//
// ── Zenith Stomp unused (zenithStompUnused) ────────────────────────────
// With the talent that grants them, Zenith puts STOMPS_GRANTED Zenith
// Stomp casts (1291484, the buff; cast and hits 1272696) on the player
// for the window: Gransonn and Spiritbound (Vashnik, 99th / 98th) pressed
// 12 for 6 Zeniths and let none run out. A window that ends with no stomp
// pressed at its end lost the ones not pressed, each worth the player's
// Zenith Stomp (its hits within STOMP_HIT_MS) less a Tiger Palm / Blackout
// Kick GCD (it takes a GCD). A window mostly in forced time isn't counted.
// Measured: ßacardi 7 of 16 unused (0:20, 1:04, 2:12, 4:37, 6:15): 7 ×
// (188k − 51k) = 964k; Blkphnx 1 each on Kith'ix Pull 2 and Nek'zali
// Pull 2 of 14 pulls; the other players don't take the talent.

import type { PlayerEvent } from "@/types/PlayerInfo";
import type { DamageFinding, JobCheck, Moment } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { gcdLockMs, mergeWindows, overlapMs, type Window } from "../../timeline";
import { k, s, statusWindows } from "./shared";

const FISTS = 113656;
const FISTS_HIT = 117418;
const BLACKOUT_KICK = 100784;
const TIGER_PALM = 100780;
const TEACHINGS = 202090;
const ZENITH = 1249625;
const XUEN = 123904;
const HEART = [443421, 443616, 1238904];
const LUST = [2825, 32182, 80353, 264667, 390386, 466904];
const CRIT_CUTS = new Set([185099, 468179, 392959]);   // Rising Sun Kick, Rushing Wind Kick, Glory of the Dawn
const SPINNING_CRANE_KICK = 101546;
const SCK_HIT = 107270;
const CELESTIAL_CONDUIT = 443028;
const STOMP_GRANT = 1291484;   // the Zenith Stomp casts Zenith grants (buff)
const ZENITH_STOMP = 1272696;  // cast and hit
const STOMPS_GRANTED = 2;
const STOMP_HIT_MS = 1_000;

const FISTS_BASE_MS = 24_000;
const HASTE_RATING_PER_PCT = 44;
const HEART_RATE = 1.75;
const LUST_RATE = 1.3;
const BOK_MS = 1_000;
const BOK_ZENITH_MS = 2_000;
const TEACHINGS_MS = 400;
const CRIT_MS = 4_000;
const SCK_TARGET_MS = 500;
const SCK_TARGETS = 5;
const STEP_MS = 50;
const HOLD_ALLOW_MS = 2_000;
const MIN_HELD_MS = 250;
const BURST_GRACE_MS = 3_000;
const FISTS_SPAN_MS = 5_000;

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const inside = (ws: Window[], t: number) => ws.some((w) => t >= w.startMs && t <= w.endMs);
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : NaN);

/** One press per spell per instant (a press can log twice), before the pull's end. */
function presses(ctx: PlayerCheckContext, id: number): PlayerEvent[] {
  const out: PlayerEvent[] = [];
  for (const c of ctx.player.casts.filter((c) => !c.fake && c.abilityId === id && c.timestamp < ctx.endMs).sort((a, b) => a.timestamp - b.timestamp)) {
    if (out.length && c.timestamp - out[out.length - 1].timestamp < 100) continue;
    out.push(c);
  }
  return out;
}

/** The player's filler GCD: their Tiger Palm and Blackout Kick damage ÷ those presses. */
function fillerPerGcd(ctx: PlayerCheckContext): number {
  const n = presses(ctx, TIGER_PALM).length + presses(ctx, BLACKOUT_KICK).length;
  const dmg = ctx.player.damageDone.filter((e) => !e.pet && e.timestamp < ctx.endMs && (e.abilityId === TIGER_PALM || e.abilityId === BLACKOUT_KICK))
    .reduce((a, e) => a + (e.amount ?? 0), 0);
  return n > 0 ? dmg / n : 0;
}

type Cycle = { prev: number; cast: number; ready: number; rechargeMs: number };

/** Each Fists of Fury after the first: when the rebuilt cooldown had it ready again. The last one's cycle ends at the pull's end. */
function fistsCycles(ctx: PlayerCheckContext, fists: number[]): Cycle[] {
  const haste = (ctx.player.hasteRating ?? 0) / HASTE_RATING_PER_PCT / 100;
  const zenith = statusWindows(ctx, ZENITH);
  const heart = HEART.map((id) => statusWindows(ctx, id));
  const lust = mergeWindows(LUST.flatMap((id) => statusWindows(ctx, id)));
  const rate = (t: number) => {
    let r = 1 + haste;
    if (inside(lust, t)) r *= LUST_RATE;
    for (const ws of heart) if (inside(ws, t)) r *= HEART_RATE;
    return r;
  };
  // The reductions, in time order.
  const cuts: { t: number; ms: number }[] = [];
  const boks = presses(ctx, BLACKOUT_KICK).map((c) => c.timestamp);
  for (const t of boks) cuts.push({ t, ms: inside(zenith, t) ? BOK_ZENITH_MS : BOK_MS });
  for (const b of ctx.player.buffs ?? []) {
    if (b.abilityId !== TEACHINGS || (b.buffStatus !== "removed" && b.buffStatus !== "stackRemoved")) continue;
    if (boks.some((t) => t <= b.timestamp && b.timestamp - t <= TEACHINGS_MS)) cuts.push({ t: b.timestamp, ms: inside(zenith, b.timestamp) ? BOK_ZENITH_MS : BOK_MS });
  }
  const sck = presses(ctx, SPINNING_CRANE_KICK).map((c) => c.timestamp);
  const sckSeen = new Map<number, Set<string>>();
  for (const e of ctx.player.damageDone) {
    if (e.pet) continue;
    if (CRIT_CUTS.has(e.abilityId) && e.hitType === 2) cuts.push({ t: e.timestamp, ms: CRIT_MS });
    else if (e.abilityId === SCK_HIT) {
      const c = [...sck].reverse().find((t) => t <= e.timestamp);
      if (c === undefined) continue;
      const seen = sckSeen.get(c) ?? new Set<string>();
      const key = `${e.targetActorId}.${e.targetInstance ?? 1}`;
      if (seen.size >= SCK_TARGETS || seen.has(key)) continue;
      seen.add(key); sckSeen.set(c, seen);
      cuts.push({ t: e.timestamp, ms: SCK_TARGET_MS });
    }
  }
  cuts.sort((a, b) => a.t - b.t);

  const out: Cycle[] = [];
  for (let i = 0; i < fists.length; i++) {
    const prev = fists[i];
    const until = fists[i + 1] ?? ctx.endMs;
    let rem = FISTS_BASE_MS, t = prev, ready: number | undefined;
    let ci = cuts.findIndex((c) => c.t > prev);
    if (ci < 0) ci = cuts.length;
    while (ready === undefined && t < until + FISTS_BASE_MS) {
      const nt = t + STEP_MS;
      while (ci < cuts.length && cuts[ci].t <= nt) {
        rem -= cuts[ci].ms;
        if (rem <= 0) { ready = cuts[ci].t; break; }
        ci++;
      }
      if (ready !== undefined) break;
      const r = rate(t);
      rem -= STEP_MS * r;
      if (rem <= 0) ready = nt + rem / r;
      t = nt;
    }
    if (ready === undefined || i + 1 >= fists.length && ready >= ctx.endMs) continue;
    out.push({ prev, cast: fists[i + 1] ?? ctx.endMs, ready, rechargeMs: ready - prev });
  }
  return out;
}

const fistsHeld: JobCheck = (ctx) => {
  const fists = presses(ctx, FISTS).map((c) => c.timestamp);
  if (fists.length < 5) return [];
  const burst = mergeWindows([...statusWindows(ctx, ZENITH), ...statusWindows(ctx, XUEN)]);
  // A Fists' damage: its hits to the next press or FISTS_SPAN_MS.
  const hits = ctx.player.damageDone.filter((e) => !e.pet && e.abilityId === FISTS_HIT);
  const dmg = fists.map((t, i) => hits.filter((e) => e.timestamp >= t && e.timestamp < Math.min(fists[i + 1] ?? Infinity, t + FISTS_SPAN_MS))
    .reduce((a, e) => a + (e.amount ?? 0), 0));
  const outV = avg(dmg.filter((_, i) => !inside(burst, fists[i])));
  const inList = dmg.filter((_, i) => inside(burst, fists[i]));
  const inV = inList.length >= 3 ? avg(inList) : outV;
  if (!(outV > 0)) return [];
  // What the channel's GCDs would have done instead: the player's Tiger Palm / Blackout Kick.
  const filler = fillerPerGcd(ctx);
  const channel = statusWindows(ctx, FISTS).filter((w) => w.endMs <= ctx.endMs).map((w) => w.endMs - w.startMs);
  const channelGcds = channel.length >= 3 ? avg(channel) / ctx.baseGcdMs : 4;
  const worth = (v: number) => Math.max(0, v - channelGcds * filler);
  if (worth(outV) <= 0) return [];

  // Not held: forced time, movement, and other channels past their GCD.
  const channels = ctx.uses.filter((u) => u.action.id === CELESTIAL_CONDUIT || u.action.id === SPINNING_CRANE_KICK)
    .map((u) => ({ startMs: u.startMs + ctx.baseGcdMs, endMs: u.startMs + gcdLockMs(u, ctx.factorAt(u.startMs)) }))
    .filter((w) => w.endMs > w.startMs);
  const excluded = mergeWindows([...ctx.forced, ...(ctx.movement ?? []), ...channels]);

  const moments: Moment[] = [];
  let heldMs = 0, excusedMs = 0, lost = 0;
  // A held second pushes every later Fists back: it costs that share of
  // the player's average recharge, not of the cycle's (a burst cycle can
  // rebuild in 3–4s, which would price one held second at a third of a Fists).
  const cycles = fistsCycles(ctx, fists);
  const recharge = avg(cycles.filter((c) => c.cast < ctx.endMs).map((c) => c.rechargeMs));
  if (!(recharge > 0)) return [];
  for (const c of cycles) {
    if (c.cast <= c.ready) continue;
    const span = c.cast - c.ready - overlapMs(c.ready, c.cast, excluded);
    let held = span - HOLD_ALLOW_MS;
    if (held <= 0) continue;
    // Held into the burst: ready before a window, pressed in its first seconds.
    const into = burst.find((w) => c.ready < w.startMs && c.cast >= w.startMs && c.cast <= w.startMs + BURST_GRACE_MS);
    let excused = 0;
    if (into && inV > outV) {
      const perMs = worth(outV) / recharge;
      excused = Math.min(held, (inV - outV) / perMs, recharge);
      held -= excused;
    }
    excusedMs += excused;
    if (held < MIN_HELD_MS) continue;
    // Held time inside the burst is worth a burst Fists.
    const inMs = Math.min(held, overlapMs(c.ready, c.cast, burst));
    const v = (inMs * worth(inV) + (held - inMs) * worth(outV)) / recharge;
    heldMs += held; lost += v;
    moments.push({ startMs: c.ready, endMs: c.cast, lostDamage: v,
      detail: `Fists of Fury ready at ${clock(c.ready)}, ${c.cast >= ctx.endMs ? "not pressed again" : `pressed at ${clock(c.cast)}`}: ${s(held)} held` +
        (excused > 0 ? ` (${s(excused)} more excused: held into ${inside(statusWindows(ctx, ZENITH), into!.startMs + 1) ? "Zenith" : "Invoke Xuen"} at ${clock(into!.startMs)})` : "") +
        ` (this cycle's rebuilt recharge ${s(c.rechargeMs)})` });
  }
  if (moments.length === 0 || lost < 1) return [];
  return [finding(ctx, {
    kind: "cooldown-drift", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Fists of Fury held",
    lostDamage: lost,
    basis: `held time (past ${s(HOLD_ALLOW_MS)} a cycle, outside forced time and movement) ÷ ${s(recharge)}, the player's average rebuilt recharge, × (their Fists, ${k(outV)} outside Zenith / Xuen and ${k(inV)} inside, − ${channelGcds.toFixed(1)} GCDs of Tiger Palm / Blackout Kick at ${k(filler)})` +
      (excusedMs > 0 ? `; ${s(excusedMs)} held into a burst window excused up to its break-even` : ""),
    detail: `Fists of Fury sat ready ${s(heldMs)} past the allowance in ${moments.length} cycle${moments.length > 1 ? "s" : ""} (cooldown rebuilt from haste, Heart of the Jade Serpent, Blackout Kicks and critical kicks)`,
    moments,
  })];
};

// ── Zenith Stomp casts left unused ─────────────────────────────────────

const zenithStompUnused: JobCheck = (ctx) => {
  const wins = statusWindows(ctx, STOMP_GRANT).filter((w) => w.endMs <= ctx.endMs);
  if (wins.length === 0) return [];
  const stomps = presses(ctx, ZENITH_STOMP).map((c) => c.timestamp);
  // A stomp's worth: its hits within STOMP_HIT_MS of the press.
  const hits = ctx.player.damageDone.filter((e) => !e.pet && e.abilityId === ZENITH_STOMP);
  const per = avg(stomps.map((t) => hits.filter((e) => e.timestamp >= t && e.timestamp < t + STOMP_HIT_MS).reduce((a, e) => a + (e.amount ?? 0), 0)));
  const filler = fillerPerGcd(ctx);
  if (!(per > filler)) return [];
  const forced = mergeWindows(ctx.forced);
  const moments: Moment[] = [];
  let unusedN = 0, forcedN = 0;
  for (const w of wins) {
    const used = stomps.filter((t) => t >= w.startMs - 100 && t <= w.endMs + 100).length;
    const unused = STOMPS_GRANTED - used;
    if (unused <= 0 || stomps.some((t) => Math.abs(t - w.endMs) <= 300)) continue;
    if (overlapMs(w.startMs, w.endMs, forced) >= (w.endMs - w.startMs) / 2) { forcedN += unused; continue; }
    unusedN += unused;
    moments.push({ startMs: w.startMs, endMs: w.endMs, lostDamage: unused * (per - filler),
      detail: `Zenith at ${clock(w.startMs)}: ${used} of ${STOMPS_GRANTED} Zenith Stomps used, ${unused} ran out at ${clock(w.endMs)}` });
  }
  if (moments.length === 0) return [];
  return [finding(ctx, {
    kind: "proc-lost", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Zenith Stomp unused",
    lostDamage: moments.reduce((a, m) => a + (m.lostDamage ?? 0), 0),
    basis: `${unusedN} × (${k(per)}, the player's Zenith Stomp − ${k(filler)}, their Tiger Palm / Blackout Kick GCD)` +
      (forcedN ? `; ${forcedN} more in windows mostly forced, not counted` : ""),
    detail: `${unusedN} of the Zenith Stomps that Zenith grants ran out unused (${moments.length} window${moments.length > 1 ? "s" : ""})`,
    moments,
  })];
};

export const WINDWALKER_CHECKS: JobCheck[] = [fistsHeld, zenithStompUnused];
