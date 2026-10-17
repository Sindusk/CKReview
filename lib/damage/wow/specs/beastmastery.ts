// lib/damage/wow/specs/beastmastery.ts
//
// Beast Mastery Hunter's own checks and values, beside the shared ones
// ranged.ts gives it (the Bestial Wrath window, Focus at the cap with
// Barbed Shot excluded). Built in the
// WoWAnalyzer audit's phase 3 (docs/wowa-audit/hunter-beastmastery.md),
// every rule valued as damage lost, pets included: the pet and the beasts
// it brings do 47–61% of a BM player's damage. Measured 2026-10-17 on the
// 37 BM player-pulls on disk, all Mythic: the top Entombed Sentinels parses
// Luumu (baRCnPv62YQ1dJZN, 99.6th) and Yaji (NvX17Tb9yMY8QrDf, 99.8th),
// with Волкерокхант (Vr8dLPtFYWA4G1yg) and Levipeepee (6kHtGaQXCMWYxFpZ);
// on Vashnik Yaji (tcdpmV7MBHK1jGYk), Käächhunt (zdyhBj7pxWG6A8QZ),
// 小红手经年 and Minttu (MaWQwnygjkh1czL8), 干嘛喵 (VbAHWZDdPwJBajmx),
// Arteyparty (hjHXmdnJFwTPpMtK), Hirvihotline (8kVQMJ4rmpnyRjBH), 曉月的終焉
// (7B1wQbjNhgXJDaHC), Полли and Авалайзи (7L3RKpavDA8T4MjY), 爱美女的菠萝 and
// 嗜血魔圣 (9rGDw4WB3bv6VmnK), Yolt (Ftj4vwHf9RazPcqV), Floala
// (r9CX1kpRGLmKJH4M), and the 100th-percentile 爹丶爹 (RbhPKYWd6t1nAC3f
// fight 40, fetched); the weaker Koralie (8AFnLQKdrcgawzDC fight 224, 20th,
// fetched) and Snobshot beside her, Jimache and Nidzoz (v8bmgMAdcnBCj9Ya),
// and the static's Deathstriker (qpZx3mWaG7gcDdYB, the case study, and his
// 16 pulls on seven bosses in gVDPhzp61Zm29HMw): 40 player-pulls. Spell
// ids are from those logs' masterData.
//
// Talents (from casts, buffs and pet hits; every one of the 37): Pack
// Leader (Howl of the Pack Leader, the boar's Boar Charge, the bear's Rend
// Flesh), Nature's Ally, Bloodshed (cast by the pet at each Bestial Wrath),
// Stomp, and Dire Beast summons. Nobody plays Dark Ranger: no Black Arrow in
// any log. Wild Thrash (and the Beast Cleave it gives) on 16 of 37.
//
// ── Bestial Wrath's worth (bestialWrathValue) ──────────────────────────
// Bestial Wrath (19574, the cast and a 15.0s buff on the player) is a plain
// 30s cooldown (shortest interval 30.0s, median 31.0s). Its damage is all
// the pet's: its own hit (344572), Bloodshed (321538, a DoT the pet casts at
// each Bestial Wrath: no player cast; every hit within 16s of one), and a
// bonus to the pet's hits in the window: non-crit pet basic attacks and
// Kill Commands ×1.2–1.6 inside vs outside. The tracked-cooldown drift
// priced a use by the cast id's own hits, so it was worth 0 and Bestial
// Wrath drift never showed. A use is worth the player's Bloodshed and
// Bestial Wrath hits per cast plus what the windows added to the pet's hits
// (each × (1 − 1/ratio)): 1.1–2.1M a use on the 37 (Deathstriker 1.29M on
// the case study, Luumu 1.62M).
//
// ── Bestial Wrath held (bestialWrathHeld) ──────────────────────────────
// Replaces the tracked-cooldown drift (tracked-cooldowns.ts), which once
// valued would have flagged both top players on MaWQwnygjkh1czL8 (1.55M,
// 1.68M): on Vashnik, BM players hold Bestial Wrath for the Venoms after
// Imbibe (小红手经年 ready 2:48, pressed 3:14; Yaji tcdpmV7MBHK1jGYk ready
// 1:35, pressed 1:50), which the context's hold windows allow and that check
// doesn't read. Same model as Demonology's held checks: held = ready → next
// press (or the pull's last BW_TAIL_MS), less forced time, the context's
// hold windows, time whose next BW_LOOKAHEAD_MS is mostly forced, and
// BW_ALLOW_MS a cycle (the top players' ordinary 0–2.7s: Käächhunt 30.0–
// 32.7s apart, Luumu 30.1–33.5s). A held second is that share of a use:
// held ÷ 30s × (the player's use − their average GCD, the GCD the press
// takes). The opener counts from BW_FIRST_MS.
// Measured (lost a pull): top Luumu, Yaji (both kills), Волкерокхант,
// 小红手经年, 爱美女的菠萝, 曉月的終焉 none; Käächhunt 18k, 干嘛喵 33k, Minttu
// 89k, 爹丶爹 229k (2.4s at 3:44, 1.6s at 5:09: he presses it 30–34s
// apart, and opens with it at 0:27, inside the first hold window). Weaker:
// Koralie 154k (2:03), Snobshot 20k; 嗜血魔圣 2.10M (9rGDw4WB3bv6VmnK; ready 2:20, pressed 2:41 and
// 3:44 → 4:19, 15s each), Jimache 1.84M (v8bmgMAdcnBCj9Ya; 3:57 → 4:50),
// Arteyparty 916k, Hirvihotline 557k, Nidzoz 353k, Floala 359k; Deathstriker
// 125k on the case study (5:02 → 5:07) and 0–881k on each of his static's
// 16 pulls (Ula'tek 881k: 2:40 → 2:59, 3:29 → 3:42, 4:12 → 4:18).
//
// ── Kill Command without Nature's Ally (killCommandUnbuffed) ───────────
// Nature's Ally (1276720, every one of the 37) is a buff each Cobra Shot
// (193455) or Barbed Shot (217200) applies and each Kill Command (34026)
// takes: its removal logs at the cast's instant (Luumu, 76 of 76; no other
// consumer). It raises the Kill Command: the pet's (83381) and the Pack
// Leader beasts' (1232922) non-crit hits ×1.13–1.65 with it vs without
// (players with 5+ unbuffed; median ~1.3; Deathstriker 26k vs 21k, beasts
// 16k vs 12k), so a Kill Command without it lost its hits × (1 − 1/ratio):
// the player's own ratio when NA_MIN_UNBUFFED_HITS each side, else
// NA_DEFAULT_RATIO. Kill Cleave (389448) is a share of the Kill Command
// and counts too. What it is, nearly always: two Kill Commands in a row
// (Deathstriker 0:03.9 → 0:04.8, 0:20.8 → 0:21.9, 0:34.4 → 0:35.4 on the
// case study), where a Cobra Shot between would have given the buff. The
// top players almost never do it on one enemy, so the extra GCD doesn't
// cost them Kill Commands (15–18 a minute). Not counted: forced time, and a
// Kill Command whose hits found two or more enemies. On Vashnik the top
// players double up in the Venom burst after Imbibe (the 100th-percentile
// 爹丶爹, RbhPKYWd6t1nAC3f fight 40: 11 unbuffed, the three largest at
// 0:29, 1:52 and 3:17 on the Venoms, 4–5s after each Imbibe), where a
// Kill Command held a GCD can land on dead adds; with them counted he read
// 229k against the 20th-percentile Koralie's 322k.
// Measured (lost a pull): top Luumu, Yaji (Entombed Sentinels),
// Волкерокхант none; Yaji (Vashnik) 37k, Minttu 21k, 爹丶爹 47k (4), 干嘛喵
// 54k, Käächhunt 86k (3), 小红手经年 104k (3: 0:04 after the opener's
// Bestial Wrath, 5:10, 5:34). Weaker: Koralie 144k (8AFnLQKdrcgawzDC fight
// 224, 20th; 9), Snobshot 58k beside her, 嗜血魔圣 277k (10), 爱美女的菠萝
// 131k, Jimache 151k, Yolt 140k, Nidzoz 64k (13, small hits); Deathstriker
// 159k on the case study (10) and 113–342k on each of his static's 16
// pulls (6–18 a pull; Entombed Sentinels Pull 5 342k, 14). WoWAnalyzer only
// annotates each unbuffed cast.
//
// ── Wild Thrash on one enemy (wildThrashOneTarget) ─────────────────────
// Wild Thrash (1264359, 35 Focus like a Cobra Shot) is the AoE press: the
// pet's hit (1264355) on every enemy in reach, and Beast Cleave (268877, a
// ~10s buff on the player it applies each press) makes the pet's attacks
// cleave (Beast Cleave 118459, Kill Cleave 389448). On one enemy the hit is
// 16–83k (median ~40k) against the player's Cobra Shot's 72–113k, and the
// buff does nothing visible there (Deathstriker Kith'ix Pull 2: pet Claw
// and melee ×0.95–0.98 with it). It doesn't give Nature's Ally either. So
// a press whose pet hit one enemy, and whose Beast Cleave (to the next
// press) cleaved nothing, lost a Cobra Shot less its own hit. This is the
// premise of WoWAnalyzer's "Beast Cleave windows with no hits" rule, which
// phase 2 had marked `wrong` because Beast Cleave used to come for free.
// Not counted in forced time or the pull's last WT_HIT_MS.
// Measured (lost a pull): top Luumu, Yaji (Entombed Sentinels),
// Волкерокхант, Käächhunt, Minttu none; Yaji (Vashnik) 60k (1), 爹丶爹 76k
// (1, 2:19), 小红手经年 181k (3: 2:42, 4:49, 5:23). Weaker: Koralie 284k
// (5, from 0:05), Arteyparty 121k, Hirvihotline 96k, 嗜血魔圣 50k. Deathstriker none on the case study but a habit on
// single-target bosses: Kith'ix Pull 2 782k (17 of 19 presses, every ~10s
// to keep Beast Cleave up), Nek'zali Pulls 1 and 2 648k and 682k (18, 15),
// Ula'tek 637k (8).

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { JobCheck, Moment } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { inWindows, mergeWindows, overlapMs, type Window } from "../../timeline";
import { k, s, statusWindows } from "./shared";

const BESTIAL_WRATH = 19574;             // the cast and the player's 15s buff
const BESTIAL_WRATH_HIT = 344572;        // the pet's hit
const BLOODSHED = 321538;                // the pet's DoT, one per Bestial Wrath
// The pet's ordinary attacks, to read Bestial Wrath's bonus from (Stomp and
// the cleaves vary with their trigger and the target count).
const BASIC = new Set(["Melee", "Kill Command", "Claw", "Bite", "Smack"]);
const MAX_RATIO = 2;

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[xs.length >> 1];

/** The player's Bestial Wrath windows (apply → remove of the 15s buff). */
function wrathWindows(player: PlayerInfo, endMs: number): [number, number][] {
  const out: [number, number][] = [];
  let open: number | undefined;
  for (const b of [...(player.buffs ?? [])].filter((x) => x.abilityId === BESTIAL_WRATH).sort((a, b) => a.timestamp - b.timestamp)) {
    if (b.buffStatus === "applied" && open === undefined) open = b.timestamp;
    else if (b.buffStatus === "removed" && open !== undefined) { out.push([open, b.timestamp]); open = undefined; }
  }
  if (open !== undefined) out.push([open, endMs]);
  return out;
}

/** One Bestial Wrath's worth: Bloodshed and its own hit per cast, plus what the windows added to the pet's hits. */
export function bestialWrathValue(player: PlayerInfo, endMs: number): { value: number; basis: string } | undefined {
  const casts = player.casts.filter((c) => !c.fake && c.abilityId === BESTIAL_WRATH && c.timestamp < endMs).length;
  if (casts === 0) return undefined;
  const wins = wrathWindows(player, endMs);
  const inW = (t: number) => wins.some(([a, b]) => t >= a && t <= b);
  const pet = player.damageDone.filter((e) => e.pet && e.timestamp < endMs);
  const own = pet.filter((e) => e.abilityId === BLOODSHED || e.abilityId === BESTIAL_WRATH_HIT).reduce((a, e) => a + (e.amount ?? 0), 0);
  const by = new Map<string, { i: number[]; o: number[] }>();
  for (const e of pet) {
    if (e.hitType !== 1 || !(e.amount! > 0) || e.isDoT || !BASIC.has(e.abilityName)) continue;
    const g = by.get(e.abilityName) ?? { i: [], o: [] };
    (inW(e.timestamp) ? g.i : g.o).push(e.amount!);
    by.set(e.abilityName, g);
  }
  let sum = 0, n = 0;
  for (const g of by.values()) {
    if (g.i.length < 5 || g.o.length < 5) continue;
    sum += (Math.min(MAX_RATIO, Math.max(1, median(g.i) / median(g.o))) - 1) * g.i.length;
    n += g.i.length;
  }
  const ratio = n >= 20 ? 1 + sum / n : 1;
  const petIn = pet.filter((e) => e.abilityId !== BLOODSHED && e.abilityId !== BESTIAL_WRATH_HIT && inW(e.timestamp))
    .reduce((a, e) => a + (e.amount ?? 0), 0);
  const added = petIn * (1 - 1 / ratio);
  const value = (own + added) / casts;
  if (!(value > 0)) return undefined;
  return {
    value,
    basis: `${k(value)} a use (the pet's Bloodshed and Bestial Wrath hits, ${k(own / casts)} a cast, + ${k(added / casts)} the window added to its other hits: ×${ratio.toFixed(2)}, its basic attacks and Kill Commands inside vs outside; ${casts} casts)`,
  };
}

// ── Bestial Wrath held ─────────────────────────────────────────────────

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const inside = (ws: Window[], t: number) => ws.some((w) => t >= w.startMs && t <= w.endMs);

/** One press per instant, before the pull's end. */
function presses(ctx: PlayerCheckContext, id: number): number[] {
  const out: number[] = [];
  for (const t of ctx.player.casts.filter((c) => !c.fake && c.abilityId === id && c.timestamp < ctx.endMs).map((c) => c.timestamp).sort((a, b) => a - b)) {
    if (out.length && t - out[out.length - 1] < 100) continue;
    out.push(t);
  }
  return out;
}

const bestialWrathHeld: JobCheck = (ctx) => {
  const bw = presses(ctx, BESTIAL_WRATH);
  if (bw.length < 2) return [];
  const use = bestialWrathValue(ctx.player, ctx.endMs);
  if (!use) return [];
  const gcd = ctx.values.gcdValue(undefined, false);
  const value = use.value - gcd;
  if (!(value > 0)) return [];
  const notHeld = mergeWindows([...ctx.forced, ...(ctx.context?.cooldownHoldWindows?.(ctx.pull) ?? [])]);
  const lastUseful = ctx.endMs - BW_TAIL_MS;
  const counts = (t: number) => t < lastUseful && !inside(notHeld, t) && overlapMs(t, t + BW_LOOKAHEAD_MS, notHeld) <= BW_LOOKAHEAD_MS / 2;
  const perMs = value / BW_CD_MS;
  const moments: Moment[] = [];
  let heldMs = 0;
  // The opener: from BW_FIRST_MS into the pull to the first press, then each recast.
  const stretches = [{ ready: BW_FIRST_MS, next: bw[0] as number | undefined }, ...bw.map((t, i) => ({ ready: t + BW_CD_MS, next: bw[i + 1] }))];
  for (const { ready, next } of stretches) {
    const until = Math.min(next ?? lastUseful, lastUseful);
    if (until <= ready) continue;
    let open = 0;
    for (let t = ready; t < until; t += BW_STEP_MS) if (counts(t)) open += Math.min(BW_STEP_MS, until - t);
    const held = open - BW_ALLOW_MS;
    if (held < BW_MIN_HELD_MS) continue;
    heldMs += held;
    moments.push({ startMs: ready, endMs: next ?? ctx.endMs, lostDamage: held * perMs,
      detail: `Bestial Wrath ready at ${clock(ready)}, ${next !== undefined ? `pressed at ${clock(next)}` : "not pressed again"}: ${s(held)} held` });
  }
  if (moments.length === 0) return [];
  return [finding(ctx, {
    kind: "cooldown-drift", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Bestial Wrath held",
    lostDamage: heldMs * perMs,
    basis: `held time (past ${s(BW_ALLOW_MS)} a cycle, outside forced time and the fight's hold windows) ÷ ${s(BW_CD_MS)} cooldown × (${use.basis} − ${k(gcd)} average GCD)`,
    detail: `Bestial Wrath sat ready ${s(heldMs)} past the allowance in ${moments.length} cycle${moments.length > 1 ? "s" : ""} (30s cooldown)`,
    moments,
  })];
};

const BW_CD_MS = 30_000;
const BW_FIRST_MS = 3_000;
const BW_ALLOW_MS = 2_000;
const BW_TAIL_MS = 10_000;
const BW_LOOKAHEAD_MS = 10_000;
const BW_STEP_MS = 250;
const BW_MIN_HELD_MS = 250;

// ── Kill Command without Nature's Ally ─────────────────────────────────

const KILL_COMMAND = 34026;              // the player's cast
const KC_HITS = new Set([83381, 1232922, 389448]);   // the pet's, the Pack Leader beasts', Kill Cleave
const KC_RATIO_HITS = new Set([83381, 1232922]);
const NATURES_ALLY = 1276720;
const NA_DEFAULT_RATIO = 1.3;
const NA_MIN_UNBUFFED_HITS = 8;
const NA_MAX_RATIO = 1.6;
const KC_SPAN_MS = 1_500;
const NA_TAKEN_MS = 50;

const killCommandUnbuffed: JobCheck = (ctx) => {
  const p = ctx.player;
  const na = statusWindows(ctx, NATURES_ALLY);
  if (na.length === 0) return [];
  const kc = presses(ctx, KILL_COMMAND);
  if (kc.length < 10) return [];
  const forced = mergeWindows(ctx.forced);
  const hits = p.damageDone.filter((e) => e.pet && KC_HITS.has(e.abilityId) && e.timestamp < ctx.endMs + KC_SPAN_MS);
  const rows = kc.map((t, i) => {
    const until = Math.min(t + KC_SPAN_MS, kc[i + 1] ?? Infinity);
    const mine = hits.filter((e) => e.timestamp >= t && e.timestamp < until);
    // The Kill Command takes the buff: its removal logs at the cast's instant or just after.
    return { t, buffed: na.some((x) => t >= x.startMs && t <= x.endMs + NA_TAKEN_MS), mine, dmg: mine.reduce((a, e) => a + (e.amount ?? 0), 0) };
  });
  const nonCrit = (rs: typeof rows) => rs.flatMap((r) => r.mine.filter((e) => KC_RATIO_HITS.has(e.abilityId) && e.hitType === 1 && e.amount! > 0).map((e) => e.amount!));
  const w = nonCrit(rows.filter((r) => r.buffed)), o = nonCrit(rows.filter((r) => !r.buffed));
  const own = o.length >= NA_MIN_UNBUFFED_HITS && w.length >= NA_MIN_UNBUFFED_HITS;
  const ratio = own ? Math.min(NA_MAX_RATIO, Math.max(1, median(w) / median(o))) : NA_DEFAULT_RATIO;
  const enemies = (r: (typeof rows)[number]) => new Set(r.mine.map((e) => `${e.targetActorId ?? e.target}.${e.targetInstance ?? 1}`)).size;
  // On adds, pressing the Kill Command at once can beat buffing it (they die): one enemy only.
  const bad = rows.filter((r) => !r.buffed && !inWindows(r.t, forced) && r.dmg > 0 && enemies(r) <= 1);
  if (bad.length === 0) return [];
  const moments: Moment[] = bad.map((r) => ({ startMs: r.t, endMs: r.t, lostDamage: r.dmg * (1 - 1 / ratio),
    detail: `Kill Command at ${clock(r.t)} without Nature's Ally (${k(r.dmg)})` }));
  const lost = moments.reduce((a, m) => a + (m.lostDamage ?? 0), 0);
  return [finding(ctx, {
    kind: "burst-window", startMs: bad[0].t, endMs: bad[bad.length - 1].t, forced: false, inference: true,
    label: "Kill Command without Nature's Ally",
    lostDamage: lost,
    basis: `each one's pet hits (Kill Command, the beasts' Kill Command, Kill Cleave) × (1 − 1/${ratio.toFixed(2)}), ` +
      (own ? `the player's own Kill Command hits with Nature's Ally vs without (non-crit medians, ${w.length} / ${o.length})` : `Nature's Ally's ×${NA_DEFAULT_RATIO} measured on the sample players (too few unbuffed hits to read the player's own)`),
    detail: `${bad.length} Kill Command${bad.length > 1 ? "s" : ""} pressed without Nature's Ally (a Cobra Shot or Barbed Shot first gives it), mostly two Kill Commands in a row`,
    moments,
  })];
};

// ── Wild Thrash on one enemy ───────────────────────────────────────────

const WILD_THRASH = 1264359;             // the player's press
const WILD_THRASH_HIT = 1264355;         // the pet's hit
const BEAST_CLEAVE = 268877;             // the player's buff Wild Thrash applies
const CLEAVE_HITS = new Set([118459, 389448]);   // Beast Cleave, Kill Cleave
const COBRA_SHOT = 193455;
const WT_HIT_MS = 2_000;

const wildThrashOneTarget: JobCheck = (ctx) => {
  const p = ctx.player;
  const wt = presses(ctx, WILD_THRASH);
  if (wt.length === 0) return [];
  const cobraN = p.casts.filter((c) => !c.fake && c.abilityId === COBRA_SHOT && c.timestamp < ctx.endMs).length;
  if (cobraN < 5) return [];
  const cobra = p.damageDone.filter((e) => !e.pet && e.abilityId === COBRA_SHOT && e.timestamp < ctx.endMs).reduce((a, e) => a + (e.amount ?? 0), 0) / cobraN;
  const bc = statusWindows(ctx, BEAST_CLEAVE);
  const forced = mergeWindows(ctx.forced);
  const enemy = (e: { target?: string; targetActorId?: number; targetInstance?: number }) => `${e.targetActorId ?? e.target}.${e.targetInstance ?? 1}`;
  const moments: Moment[] = [];
  wt.forEach((t, i) => {
    if (inWindows(t, forced) || t > ctx.endMs - WT_HIT_MS) return;
    const hits = p.damageDone.filter((e) => e.pet && e.abilityId === WILD_THRASH_HIT && e.timestamp >= t && e.timestamp < t + WT_HIT_MS);
    if (new Set(hits.map(enemy)).size > 1) return;
    // The Beast Cleave it started (or refreshed), to the next Wild Thrash: any cleave hit is its payoff.
    const win = bc.find((w) => t >= w.startMs - 50 && t <= w.endMs);
    const until = Math.min(win?.endMs ?? t + 10_000, wt[i + 1] ?? Infinity);
    if (p.damageDone.some((e) => e.pet && CLEAVE_HITS.has(e.abilityId) && e.timestamp >= t && e.timestamp < until)) return;
    const dmg = hits.reduce((a, e) => a + (e.amount ?? 0), 0);
    const lost = cobra - dmg;
    if (lost <= 0) return;
    moments.push({ startMs: t, endMs: t, lostDamage: lost, detail: `Wild Thrash at ${clock(t)} on one enemy (${k(dmg)}), no cleave in its Beast Cleave` });
  });
  if (moments.length === 0) return [];
  return [finding(ctx, {
    kind: "burst-window", startMs: moments[0].startMs, endMs: moments[moments.length - 1].startMs, forced: false, inference: true,
    label: "Wild Thrash on one enemy",
    lostDamage: moments.reduce((a, m) => a + (m.lostDamage ?? 0), 0),
    basis: `each one's GCD as a Cobra Shot (the player's average, ${k(cobra)}) − its own hit; its Beast Cleave hit nothing`,
    detail: `${moments.length} Wild Thrash${moments.length > 1 ? "es" : ""} pressed with one enemy in reach: its Beast Cleave had nothing to cleave to`,
    moments,
  })];
};

export const BEAST_MASTERY_CHECKS: JobCheck[] = [bestialWrathHeld, killCommandUnbuffed, wildThrashOneTarget];
