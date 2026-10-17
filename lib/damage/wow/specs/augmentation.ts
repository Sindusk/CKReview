// lib/damage/wow/specs/augmentation.ts
//
// Augmentation Evoker's own checks (ranged.ts gives the spec no shared
// one). Built in the WoWAnalyzer audit's phase 3 (docs/wowa-audit/
// evoker-augmentation.md), every rule valued as damage lost. Measured
// 2026-10-17 on 31 Augmentation player-pulls, all Mythic kills: the top
// parses Batchester (baRCnPv62YQ1dJZN, Vashnik 100th and Entombed
// Sentinels 98.1st), 영능턴종영능 (phzkLrdNBgtfCmW9, Vashnik 99.8th),
// Fuexovoker (MrVh6X8p1BRAJCYt, 99.3rd), Dreamsweet (LckJC7GMhQvD6rdw,
// Entombed Sentinels 99.8th), Augmentfluup (6qVxPcBdCgXrkG8a, 98.5th),
// 식용드래곤 (aZ6NnwL8g9PdpGJ1, 96.3rd), Dracman (PAgdKqkXDTRfLnJy,
// 95.9th); the weaker Yùkîï (7pFPAqzc2NHLXjwZ, Vashnik 4th), Uvokerx
// (ZC7YNpr2HVQLtjv1, Entombed Sentinels 8th), Chiggen (a4kX1DNT27yHGvqJ,
// 17.6th), Имродорми (7L3RKpavDA8T4MjY, 18.4th), Snarkareth
// (KB1a9CWc6pT4VGqA, 23.8th), Avelinna (6qVxPcBdCgXrkG8a, 44th / 83rd),
// Shixxevo (zdyhBj7pxWG6A8QZ, 47th), Dwng (8kVQMJ4rmpnyRjBH, 47th) and 15
// between. Percentiles are WCL's Augmentation ranking, which counts the
// support damage below. Spell ids are from those logs' masterData.
//
// Talents (casts and buffs): all 31 play Chronowarden (Chrono Flames
// 431443 for Living Flame, Temporal Burst from Tip the Scales), with
// Duplicate (Future Self copies of Eruption, Fire Breath and Upheaval),
// Time Skip, Fate Mirror and two Prescience charges. Nobody plays
// Scalecommander (no Mass Eruption).
//
// ── Support damage is the Evoker's own hits ───────────────────────────
// Warcraft Logs writes what Ebon Might, Prescience, Shifting Sands, Fate
// Mirror, Inferno's Blessing and Breath of Eons add to allies as the
// Evoker's damage events: about three quarters of an Augmentation's damage
// (第十九个布丁 76%, Uvokerx 76%; Ebon Might alone about a quarter). So these checks price support with the player's own
// log; nothing waits on the rDPS split. It also mispriced idle GCDs
// (game.ts AUG_SUPPORT_HITS).
//
// ── Cooldown recovery (recoverySteps) ─────────────────────────────────
// Every cooldown here recovers at (1 + 1% per Temporal Burst stack) × 11
// inside Time Skip. Temporal Burst (431698) starts at 30 stacks on each
// Tip the Scales and loses one every ~1.3s; Time Skip (404977) lasts 3.0s.
// Fitted on the 31 player-pulls (sampledata/wow/_scratch/aug-cdfit.js,
// aug-chargefit.js): with it, the shortest recovered interval between
// casts is Breath of Eons 120.2s (raw 71–122s), Tip the Scales 90.8s,
// Ebon Might 30.8s (cast time included), Time Skip 141.8s (not sped by
// itself), and Prescience's two charges fit a 10s recharge (one press of
// 990 without a charge at 10s, 51 at 11s, none at 9s). Fire Breath and Upheaval
// didn't fit (cancelled empowers log as presses, Upheaval has resets): not
// modelled.
//
// ── Ebon Might down while ready (ebonMightDown) ───────────────────────
// The Evoker's own Ebon Might (395296) off, from the moment its 30s
// cooldown was back (from the last cast, under the recovery model) to the
// next application, less 2s a lapse for the cast and reaction, forced, dead
// and hold-window time. Lost = that time × what Ebon Might added to allies
// per second it was up this pull (its 395152 hits ÷ uptime: 48–76k/s).
// Lapses while the cooldown was still running aren't counted: uptime is
// capped by the cooldown, and the top players lapse there too.
// Measured (lost a pull): the top players 0–123k (Batchester 0 / 123k,
// 영능턴종영능 0, Fuexovoker 0, Dreamsweet 0, Augmentfluup 16k / 58k);
// weaker Dwng 601k (6.9s at 2:22), Avelinna 422k on Entombed Sentinels,
// Paxthyr 314k, Snarkareth 221k, Nutnut 198k, Имродорми 161k. A raw 27s
// cooldown (Temporal Burst unmodelled) had read up to 2.0M.
//
// ── Prescience charges capped (prescienceCapped) ──────────────────────
// Two charges, 10s, simulated from the presses under the recovery model.
// Recharge lost at two charges, past 3s a stretch (an empower's channel
// can hold the GCD that long), outside forced and dead time, Time Skip (its
// 33s of recovery overfills a bank of two on every player: the top
// players read 1.2–3.8M with it counted) and the 10s before each Breath
// of Eons (pooling both charges for the Breath window is the common line).
// A lost press = the player's Prescience and Fate Mirror hits ÷ presses
// (333–598k) less a GCD.
// Measured: the top players 0–430k (영능턴종영능 0, 식용드래곤 27k,
// Dracman 96k, Batchester 163k / 236k, Augmentfluup 166k / 175k,
// Fuexovoker 334k, Dreamsweet 430k: 10s lost at 0:08–0:29); weaker
// Avelinna 1.37M / 1.74M, Имродорми 1.22M (12.7s at 4:53–5:09), Snarkareth
// 743k, Paxthyr 672k, Dwng 634k. Chiggen and Yùkîï (weak) 31–38k.
//
// ── Breath of Eons and Time Skip held (heldUses) ──────────────────────
// Replaces tracked-cooldowns.ts's fixed 74s / 135s, which were worth 0 a
// use (Breath's damage logs under 409632) and so never reported. Held =
// ready (recovery model) → next press, less 3s a stretch and forced, dead
// and hold-window time; lost uses = held ÷ the average modelled recharge.
// Breath also counts room: pressing each as soon as it was back (3s
// allowance each) would have fit one more before the last 16s (a Breath
// there never explodes), when 10s+ was held. A Breath is worth the
// player's average explosion (0.53–1.66M) less a GCD.
// Measured: no top player loses a Breath. Bddrgdotcom (6Bpq1FmA9aH4WQxc,
// 68.5th) 963k and Blueprínt (VWMbYPRyxCAmhZFj) 856k skipped the opener
// Breath (first at 1:26 / 1:15: room for 4, cast 3); Nutnut 1.08M.
// Time Skip is valued (inference) by 30s of recovery as a quarter Breath
// plus two Prescience presses (0.6–1.2M), and counts whole recharges held
// only: room fired on every Entombed Sentinels kill, top ones included
// (all cast two, the second at 2:44–2:55), so it was left out. It fires on
// nobody here (Snarkareth held 48s, Yùkîï 59s).
//
// ── Breath of Eons never exploded (breathNoExplosion) ─────────────────
// Temporal Wound's explosion (409632) lands 12.1–14.7s after every Breath
// cast. A Breath 16s+ before the end with none after it banked nothing
// (it missed the targets, or they died or left): lost = the player's
// average explosion. 3 of ~120 Breaths: Yùkîï and Snarkareth's Vashnik
// openers (0:04, 941k and 1.11M) and Dreamsweet's 3:02 on Entombed
// Sentinels (971k; every enemy kept being hit through 3:20, so not an
// early death). A Breath in the last 16s of a kill never explodes either
// (6 casts, top players among them): not judged, the kill took the
// damage.
//
// Not built (numbers in the ledger): Fire Breath and Upheaval held (Fire
// Breath 2.65–3.04 a minute alive on the top Vashnik players against
// 2.25–2.47 on the weak; no cooldown model fits), empowers inside the
// Breath window, Essence at the cap, the proc expiries.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { JobCheck, Moment } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { holdWindowsFor, mergeWindows, overlapMs, statusWindows, type Window } from "../../timeline";
import { k, s } from "./shared";

// Ids from the sample logs' masterData (K4x8cMZYVpGCDbJH, baRCnPv62YQ1dJZN).
const EBON_MIGHT = 395152;          // the cast, and the support hits credited to the Evoker
const EBON_MIGHT_SELF = 395296;     // the Evoker's own Ebon Might buff
const PRESCIENCE = 409311;          // the cast
const PRESCIENCE_HIT = 410089;      // its support hits
const FATE_MIRROR = 404908;         // Prescience's echo (talent), the Evoker's hits
const BREATH_OF_EONS = 403631;      // the cast (a flight: game.ts LOCK_STATUSES)
const BREATH_EXPLOSION = 409632;    // "Breath of Eons": Temporal Wound's explosion, ~12–15s after
const TIME_SKIP = 404977;           // the cast and the buff
const TEMPORAL_BURST = 431698;      // Chronowarden, from Tip the Scales: 30 stacks, one lost every ~1.3s

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

function presses(p: PlayerInfo, id: number, endMs: number): number[] {
  const out: number[] = [];
  for (const c of p.casts.filter((c) => !c.fake && c.abilityId === id && c.timestamp < endMs).sort((a, b) => a.timestamp - b.timestamp)) {
    if (out.length && c.timestamp - out[out.length - 1] < 100) continue;
    out.push(c.timestamp);
  }
  return out;
}

function damageOf(p: PlayerInfo, ids: Set<number>, endMs: number): number {
  return p.damageDone.filter((e) => !e.pet && ids.has(e.abilityId) && e.timestamp < endMs).reduce((a, e) => a + (e.amount ?? 0), 0);
}

// ── Cooldown recovery ─────────────────────────────────────────────────

type Step = { t: number; r: number };

/** The player's cooldown recovery rate through the pull, piecewise constant. */
function recoverySteps(p: PlayerInfo, withSkip = true): Step[] {
  const ev = (p.buffs ?? []).filter((b) => (b.abilityId === TEMPORAL_BURST || (withSkip && b.abilityId === TIME_SKIP)) && b.source === p.name)
    .sort((a, b) => a.timestamp - b.timestamp);
  let stacks = 0, skip = false;
  const out: Step[] = [{ t: 0, r: 1 }];
  for (const b of ev) {
    if (b.abilityId === TEMPORAL_BURST) {
      if (b.buffStatus === "applied" || b.buffStatus === "refreshed") stacks = TEMPORAL_BURST_STACKS;
      else if (b.buffStatus === "stackRemoved") stacks = Math.max(0, stacks - 1);
      else if (b.buffStatus === "removed") stacks = 0;
    } else if (b.buffStatus === "applied") skip = true;
    else if (b.buffStatus === "removed") skip = false;
    out.push({ t: b.timestamp, r: (1 + stacks * TEMPORAL_BURST_PER_STACK) * (skip ? TIME_SKIP_RATE : 1) });
  }
  return out;
}

/** Recovery (ms of cooldown) over [a, b]. */
function recovered(steps: Step[], a: number, b: number): number {
  let x = 0;
  for (let i = 0; i < steps.length; i++) {
    const s0 = steps[i].t, e0 = steps[i + 1]?.t ?? Infinity;
    if (e0 <= a) continue;
    if (s0 >= b) break;
    x += (Math.min(b, e0) - Math.max(a, s0)) * steps[i].r;
  }
  return x;
}

/** When a cooldown of `baseMs` pressed at `from` is back. */
function readyAfter(steps: Step[], from: number, baseMs: number): number {
  let need = baseMs, t = from;
  for (let i = 0; i < steps.length; i++) {
    const s0 = steps[i].t, e0 = steps[i + 1]?.t ?? Infinity;
    if (e0 <= t) continue;
    const start = Math.max(t, s0);
    const can = (e0 - start) * steps[i].r;
    if (can >= need) return start + need / steps[i].r;
    need -= can;
    t = e0;
  }
  return t + need;
}

// Fitted on 31 player-pulls (see the header): rate = (1 + 1% per Temporal
// Burst stack) × 11 inside Time Skip.
const TEMPORAL_BURST_STACKS = 30;
const TEMPORAL_BURST_PER_STACK = 0.01;
const TIME_SKIP_RATE = 11;

// ── Ebon Might down (ebonMightDown) ───────────────────────────────────

const EBON_MIGHT_CD_MS = 30_000;
const EBON_MIGHT_GRACE_MS = 2_000;

const ebonMightDown: JobCheck = (ctx) => {
  const p = ctx.player;
  const up = statusWindows(p, new Set([EBON_MIGHT_SELF]), ctx.endMs);
  if (up.length === 0) return [];
  const upMs = up.reduce((a, w) => a + Math.min(w.endMs, ctx.endMs) - w.startMs, 0);
  const rate = upMs > 0 ? damageOf(p, new Set([EBON_MIGHT]), ctx.endMs) / upMs : 0;
  if (!(rate > 0)) return [];
  const casts = presses(p, EBON_MIGHT, ctx.endMs);
  const steps = recoverySteps(p);
  const notHeld = mergeWindows([...ctx.forced, ...ctx.dead, ...holdWindowsFor(ctx.context?.cooldownHoldWindows?.(ctx.pull), EBON_MIGHT_CD_MS)]);
  const moments: Moment[] = [];
  let heldMs = 0;
  for (let i = 0; i < up.length; i++) {
    const from = up[i].endMs, to = Math.min(up[i + 1]?.startMs ?? ctx.endMs, ctx.endMs);
    if (from >= to) continue;
    const last = casts.filter((t) => t <= from).pop();
    const ready = last === undefined ? from : readyAfter(steps, last, EBON_MIGHT_CD_MS);
    const start = Math.max(from, ready);
    if (start >= to) continue;
    const held = to - start - overlapMs(start, to, notHeld) - EBON_MIGHT_GRACE_MS;
    if (held <= 0) continue;
    heldMs += held;
    moments.push({ startMs: start, endMs: to, lostDamage: held * rate,
      detail: `Ebon Might down ${clock(from)}–${clock(to)}, ready from ${clock(start)}: ${s(held)} past the cast` });
  }
  if (moments.length === 0) return [];
  return [finding(ctx, {
    kind: "buff-uptime", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Ebon Might down while ready",
    lostDamage: heldMs * rate,
    basis: `${s(heldMs)} with Ebon Might off the Evoker and its ${s(EBON_MIGHT_CD_MS)} cooldown back (less ${s(EBON_MIGHT_GRACE_MS)} a lapse for the cast, forced and dead time) × ${k(rate * 1000)}/s, what Ebon Might added to allies per second up this pull`,
    detail: `Ebon Might lapsed ${moments.length} time${moments.length > 1 ? "s" : ""} with the cast ready (${s(heldMs)} in all)`,
    moments,
  })];
};

// ── Prescience charges capped (prescienceCapped) ──────────────────────

const PRESCIENCE_CHARGES = 2;
const PRESCIENCE_RECHARGE_MS = 10_000;
const PRESCIENCE_GRACE_MS = 3_000;
const PRESCIENCE_BREATH_HOLD_MS = 10_000;

/** Stretches at full charges, simulated from the presses under the recovery model. */
function cappedStretches(times: number[], steps: Step[], endMs: number): Window[] {
  const out: Window[] = [];
  let have = PRESCIENCE_CHARGES, progress = 0, last = 0;
  const advance = (to: number) => {
    let t = last;
    while (t < to) {
      if (have >= PRESCIENCE_CHARGES) { out.push({ startMs: t, endMs: to }); break; }
      const at = readyAfter(steps, t, PRESCIENCE_RECHARGE_MS - progress);
      if (at <= to) { have++; progress = 0; t = at; continue; }
      progress += recovered(steps, t, to);
      t = to;
    }
    last = to;
  };
  for (const t of times) { advance(t); if (have > 0) have--; }
  advance(endMs);
  return mergeWindows(out);
}

const prescienceCapped: JobCheck = (ctx) => {
  const p = ctx.player;
  const times = presses(p, PRESCIENCE, ctx.endMs);
  if (times.length === 0) return [];
  const support = damageOf(p, new Set([PRESCIENCE_HIT, FATE_MIRROR]), ctx.endMs);
  const gcd = ctx.values.gcdValue(undefined, false);
  const value = support / times.length - gcd;
  if (!(value > 0)) return [];
  const steps = recoverySteps(p);
  const breaths = presses(p, BREATH_OF_EONS, ctx.endMs).map((t) => ({ startMs: t - PRESCIENCE_BREATH_HOLD_MS, endMs: t }));
  const skips = statusWindows(p, new Set([TIME_SKIP]), ctx.endMs);
  const notHeld = mergeWindows([...ctx.forced, ...ctx.dead, ...breaths, ...skips,
    ...holdWindowsFor(ctx.context?.cooldownHoldWindows?.(ctx.pull), PRESCIENCE_RECHARGE_MS)]);
  const moments: Moment[] = [];
  let lostMs = 0;
  for (const w of cappedStretches(times, steps, ctx.endMs)) {
    // Recovery wasted at the cap, outside excused time; a Time Skip at the
    // cap wastes eleven times as much.
    let open = 0;
    let t = w.startMs;
    for (const x of notHeld.filter((x) => x.endMs > w.startMs && x.startMs < w.endMs)) {
      if (x.startMs > t) open += recovered(steps, t, x.startMs);
      t = Math.max(t, x.endMs);
    }
    if (t < w.endMs) open += recovered(steps, t, w.endMs);
    const lost = open - PRESCIENCE_GRACE_MS;
    if (lost <= 0) continue;
    lostMs += lost;
    moments.push({ startMs: w.startMs, endMs: w.endMs, lostDamage: lost / PRESCIENCE_RECHARGE_MS * value,
      detail: `Prescience at two charges ${clock(w.startMs)}–${clock(w.endMs)}: ${s(lost)} of recharge lost` });
  }
  if (moments.length === 0) return [];
  return [finding(ctx, {
    kind: "cooldown-drift", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Prescience charges capped",
    lostDamage: lostMs / PRESCIENCE_RECHARGE_MS * value,
    basis: `${s(lostMs)} of recharge lost at two charges (past ${s(PRESCIENCE_GRACE_MS)} a stretch; forced and dead time and the ${s(PRESCIENCE_BREATH_HOLD_MS)} before each Breath of Eons excused) ÷ ${s(PRESCIENCE_RECHARGE_MS)} × ` +
      `${k(value)} a Prescience (its and Fate Mirror's support hits ÷ ${times.length} presses, less a ${k(gcd)} GCD)`,
    detail: `Prescience sat at two charges: ${(lostMs / PRESCIENCE_RECHARGE_MS).toFixed(1)} presses lost`,
    moments,
  })];
};

// ── Breath of Eons (breathHeld, breathNoExplosion) ────────────────────

const BREATH_CD_MS = 120_000;
const BREATH_FIRST_USE_MS = 8_000;
const BREATH_ALLOW_MS = 3_000;
const BREATH_LAND_MS = 16_000;   // cast → explosion, with margin (12.1–14.7s seen)

/** Explosion damage per Breath that exploded, and which casts did. */
function breathExplosions(p: PlayerInfo, times: number[], endMs: number): { landed: boolean[]; perLanded: number } {
  const hits = p.damageDone.filter((e) => !e.pet && e.abilityId === BREATH_EXPLOSION && e.timestamp < endMs);
  const landed = times.map((t) => hits.some((h) => h.timestamp > t && h.timestamp <= t + BREATH_LAND_MS + 4_000));
  const n = landed.filter(Boolean).length;
  const total = hits.reduce((a, h) => a + (h.amount ?? 0), 0);
  return { landed, perLanded: n > 0 ? total / n : 0 };
}

type HeldSpec = {
  name: string; id: number; baseMs: number; firstUseMs: number;
  // The pull's last tailMs: a press there does nothing (Breath never explodes).
  tailMs: number;
  // Time Skip doesn't speed its own recharge.
  ownSkip?: boolean;
  // Also count a use the holds pushed past the end (pressing each as soon
  // as it was back would have fit one more).
  room?: boolean;
  value(ctx: PlayerCheckContext, times: number[]): { value: number; basis: string } | undefined;
};

/** Whole uses lost to holding a cooldown, under the recovery model. */
function heldUses(ctx: PlayerCheckContext, spec: HeldSpec) {
  const p = ctx.player;
  const times = presses(p, spec.id, ctx.endMs);
  if (times.length === 0) return [];
  const v = spec.value(ctx, times);
  if (!v || !(v.value > 0)) return [];
  const steps = recoverySteps(p, !spec.ownSkip);
  const readies = times.map((t) => readyAfter(steps, t, spec.baseMs));
  const avgRecharge = readies.reduce((a, r, i) => a + r - times[i], 0) / readies.length;
  const notHeld = mergeWindows([...ctx.forced, ...ctx.dead, ...holdWindowsFor(ctx.context?.cooldownHoldWindows?.(ctx.pull), avgRecharge)]);
  const lastUseful = ctx.endMs - spec.tailMs;
  const stretches: Window[] = [{ startMs: spec.firstUseMs, endMs: times[0] }, ...readies.map((r, i) => ({ startMs: r, endMs: times[i + 1] ?? lastUseful }))];
  let held = 0;
  let longest: Window | undefined, longestHeld = 0;
  for (const w of stretches) {
    const end = Math.min(w.endMs, lastUseful);
    if (end <= w.startMs) continue;
    const h = Math.max(0, end - w.startMs - overlapMs(w.startMs, end, notHeld) - HELD_ALLOW_MS);
    held += h;
    if (h > longestHeld) { longestHeld = h; longest = { startMs: w.startMs, endMs: end }; }
  }
  // Room: every use pressed as soon as it's back (outside forced and dead
  // time), under the same recovery. Holds that each fall short of a whole
  // recharge can still cost the last use before the end (Snarkareth's
  // second Time Skip 216s after his first left no room for a third).
  // Each use in the room count takes the same allowance a hold gets.
  let room = 0;
  for (let t = Math.min(spec.firstUseMs, times[0]), guard = 0; spec.room && t < lastUseful && guard < 100; guard++) {
    const w = notHeld.find((x) => t >= x.startMs && t < x.endMs);
    if (w) { t = w.endMs; continue; }
    room++;
    t = readyAfter(steps, t, spec.baseMs) + HELD_ALLOW_MS;
  }
  const used = times.filter((t) => t < lastUseful).length;
  const lost = Math.max(Math.floor(held / avgRecharge), held >= ROOM_MIN_HELD_MS ? room - used : 0);
  if (lost < 1 || !longest) return [];
  return [finding(ctx, {
    kind: "cooldown-drift", startMs: longest.startMs, endMs: longest.endMs, forced: false, inference: true,
    label: `${spec.name} drift`,
    lostDamage: lost * v.value,
    basis: `${lost} use${lost > 1 ? "s" : ""} × ${v.basis}; room for ${room} before the last ${s(spec.tailMs)}`,
    detail: `${spec.name} sat ready for ${s(held)} in total (${used} uses; ${s(spec.baseMs)} recharge, faster in Temporal Burst${spec.ownSkip ? "" : " and Time Skip"}, ${s(avgRecharge)} on average here): about ${lost} use${lost > 1 ? "s" : ""} lost`,
  })];
}

const HELD_ALLOW_MS = 3_000;
const ROOM_MIN_HELD_MS = 10_000;

/** One Breath: the player's average explosion, less the GCD it takes. */
function breathValue(ctx: PlayerCheckContext, times: number[]) {
  const { perLanded } = breathExplosions(ctx.player, times, ctx.endMs);
  const gcd = ctx.values.gcdValue(undefined, false);
  return { value: perLanded - gcd, basis: `(${k(perLanded)} average explosion − ${k(gcd)} GCD in its place)`, perLanded, gcd };
}

const breathHeld: JobCheck = (ctx) => heldUses(ctx, {
  name: "Breath of Eons", id: BREATH_OF_EONS, baseMs: BREATH_CD_MS, firstUseMs: BREATH_FIRST_USE_MS, tailMs: BREATH_LAND_MS,
  room: true, value: breathValue,
});

// Time Skip: 10× extra recovery for its 3s, ~30s of every cooldown. A use
// is valued by two of them, both measured on the player: a quarter of a
// Breath of Eons (30 of its 120s) and two Prescience presses (30s is three
// recharges, but two charges is all it can bank). Fire Breath, Upheaval
// and Tip the Scales gain too and aren't counted (lenient).
const TIME_SKIP_CD_MS = 141_500;
const TIME_SKIP_GAIN_MS = 30_000;
const timeSkipHeld: JobCheck = (ctx) => heldUses(ctx, {
  name: "Time Skip", id: TIME_SKIP, baseMs: TIME_SKIP_CD_MS, firstUseMs: 10_000, tailMs: 15_000, ownSkip: true,
  value: (c) => {
    const pres = presses(c.player, PRESCIENCE, c.endMs);
    const breaths = presses(c.player, BREATH_OF_EONS, c.endMs);
    if (pres.length === 0 || breaths.length === 0) return undefined;
    const gcd = c.values.gcdValue(undefined, false);
    const perPres = damageOf(c.player, new Set([PRESCIENCE_HIT, FATE_MIRROR]), c.endMs) / pres.length - gcd;
    const b = breathValue(c, breaths);
    const value = Math.max(0, b.value) * TIME_SKIP_GAIN_MS / BREATH_CD_MS + 2 * Math.max(0, perPres) - gcd;
    return { value, basis: `${k(value)} a use: ${s(TIME_SKIP_GAIN_MS)} of recharge as a quarter of a Breath of Eons (${k(b.value)}) + two Prescience presses (${k(perPres)} each), less its GCD` };
  },
});

const breathNoExplosion: JobCheck = (ctx) => {
  const p = ctx.player;
  const times = presses(p, BREATH_OF_EONS, ctx.endMs);
  if (times.length < 2) return [];
  const { landed, perLanded } = breathExplosions(p, times, ctx.endMs);
  if (!(perLanded > 0)) return [];
  const forced = mergeWindows(ctx.forced);
  return times.flatMap((t, i) => {
    if (landed[i] || t + BREATH_LAND_MS > ctx.endMs) return [];
    const f = overlapMs(t, t + BREATH_LAND_MS, forced) > BREATH_LAND_MS / 2;
    return [finding(ctx, {
      kind: "no-damage", startMs: t, endMs: t + BREATH_LAND_MS, forced: f, inference: true,
      label: "Breath of Eons never exploded",
      lostDamage: perLanded,
      basis: `${k(perLanded)} the player's average explosion (${landed.filter(Boolean).length} that landed)`,
      detail: `Breath of Eons at ${clock(t)} banked nothing: no explosion followed (it missed, or its targets died or left first)`,
    })];
  });
};

export const AUGMENTATION_CHECKS: JobCheck[] = [ebonMightDown, prescienceCapped, breathHeld, breathNoExplosion, timeSkipHeld];
