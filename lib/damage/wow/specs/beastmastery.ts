// lib/damage/wow/specs/beastmastery.ts
//
// Beast Mastery Hunter's own checks and values, beside the shared ones
// ranged.ts gives it (the Bestial Wrath window, Focus at the cap with
// Barbed Shot excluded) and the tracked Bestial Wrath cooldown. Built in the
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
// (r9CX1kpRGLmKJH4M); the weaker Jimache and Nidzoz (v8bmgMAdcnBCj9Ya), and
// the static's Deathstriker (qpZx3mWaG7gcDdYB, the case study, and his 16
// pulls on seven bosses in gVDPhzp61Zm29HMw). Spell ids are from those
// logs' masterData.
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
// 89k. Weaker: 嗜血魔圣 2.10M (9rGDw4WB3bv6VmnK; ready 2:20, pressed 2:41 and
// 3:44 → 4:19, 15s each), Jimache 1.84M (v8bmgMAdcnBCj9Ya; 3:57 → 4:50),
// Arteyparty 916k, Hirvihotline 557k, Nidzoz 353k, Floala 359k; Deathstriker
// 125k on the case study (5:02 → 5:07) and 0–881k on each of his static's
// 16 pulls (Ula'tek 881k: 2:40 → 2:59, 3:29 → 3:42, 4:12 → 4:18).

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { JobCheck, Moment } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { mergeWindows, overlapMs, type Window } from "../../timeline";
import { k, s } from "./shared";

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

export const BEAST_MASTERY_CHECKS: JobCheck[] = [bestialWrathHeld];
