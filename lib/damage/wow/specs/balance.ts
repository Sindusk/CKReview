// lib/damage/wow/specs/balance.ts
//
// Balance Druid's own checks, beside the shared ones ranged.ts gives it
// (Incarnation window, Astral Power at the cap, Moonfire and Sunfire
// uptime, spenders outside Eclipse). Built in the WoWAnalyzer audit's
// phase 3 (docs/wowa-audit/druid-balance.md), every rule valued as damage
// lost. Measured 2026-10-17 on the 50 Balance player-pulls on disk, all
// Mythic: the top Entombed Sentinels parses Boltxb (PAgdKqkXDTRfLnJy),
// Delvkin (LckJC7GMhQvD6rdw), Birdlet (GndQ9VFWtLzNjKpk), Lappe
// (baRCnPv62YQ1dJZN), Arzenal (VWMbYPRyxCAmhZFj), 뽀또에요 (aZ6NnwL8g9PdpGJ1),
// Skress (ACmXHMFtaPLR9k8w), Painseekerr (6kHtGaQXCMWYxFpZ), Pondzsi
// (wWx8B1GPZMLghAyz); on Vashnik Faunuis (Kag91qVZ2YJ7MQAb), Kihmarhi
// (a4kX1DNT27yHGvqJ), Колорадогодх and Новеон (7L3RKpavDA8T4MjY), Adrenalift
// (r9CX1kpRGLmKJH4M), Acíz (zdyhBj7pxWG6A8QZ), 星尘魅影 (MaWQwnygjkh1czL8),
// Alcorria (tcdpmV7MBHK1jGYk) and the other Balance players on those kills;
// the weaker Boomtoast (xN9cWhzbvqTVfrG8), Copingway (dG8D9y6WxrfmtgXp),
// Lazerbares (wWx8B1GPZMLghAyz), Jugular (Ftj4vwHf9RazPcqV), Nopsu
// (8kVQMJ4rmpnyRjBH), Tormgan (ZjVtM1vFcrp7w3WC), 杂货店的嗷呜
// (J3ckBVtrZNfWv1h7), and the static's Sylmigron (qpZx3mWaG7gcDdYB, the case
// study, and his 16 pulls on seven bosses in gVDPhzp61Zm29HMw). Spell ids
// are from those logs' masterData.
//
// Talents (from casts and buffs): two builds. Elune's Chosen (Fury of
// Elune, Boundless Moonlight; Starfire and Lunar Eclipse) on every
// Entombed Sentinels player and about half the Vashnik ones; Keeper of the
// Grove (Force of Nature, Dream Burst; Wrath and Solar Eclipse) on the
// rest of Vashnik, where Sylmigron switches to it too. Everyone takes
// Incarnation: Chosen of Elune with two charges, Starlord, Starweaver and
// Umbral Embrace. Nobody casts Celestial Alignment, Convoke the Spirits or
// New Moon, so their rules fire on nothing.
//
// ── Eclipse charges capped (eclipseCapped) ─────────────────────────────
// Eclipse is a press now: Lunar Eclipse (1233272) or Solar Eclipse
// (1233346), off the GCD, each a 15s buff (Eclipse (Lunar) 48518 / (Solar)
// 48517). Two charges, 30s recharge: simulated from the presses, no player
// of the 50 ever pressed one before a charge was back at 30s (five did at
// 32s). Incarnation (102560) grants both Eclipses for its 20s, so nobody
// presses Eclipse inside it, and the top players press one the moment it
// ends (Lappe 0:24.3 → 0:25.6, 2:16.6 → 2:17.2).
// An Eclipse raises its school's hits: non-crit hits inside vs outside
// (outside Incarnation), pooled medians over the 50: in Lunar, Starfire
// ×1.85, Moonfire ×1.32, Shooting Stars ×1.29, Meteorites ×1.30, Sunfire
// ×1.07; in Solar, Wrath ×1.80, Sunfire ×1.29, Shooting Stars ×1.28,
// Moonfire ×1.09. Each charge that sits full is a recharge lost: time at
// two charges ÷ 30s is that share of an Eclipse not pressed. One Eclipse is
// worth 15s of the player's non-spender damage outside Eclipse and
// Incarnation, each ability × (its own inside ÷ outside non-crit median −
// 1), in the Eclipse the player presses (their Lunar / Solar mix).
// Starsurge and Starfall are left out: a spender cast outside Eclipse is
// already spenderOutsideEclipse's (ranged.ts).
// Time at two charges isn't held in forced time, inside Incarnation, in
// the context's hold windows, in the first ECL_OPENER_MS (the opener
// Incarnation comes at 0:02–0:07), in the pull's last ECL_TAIL_MS, or when
// most of the next 15s is forced (an Eclipse pressed into Stasis is
// wasted); ECL_ALLOW_MS a stretch is press timing.
// Measured (time at two charges past the allowance, a pull): top players
// 0–8s (Boltxb 1.1s, Lappe 4.8s, mostly the seconds before the opener
// Incarnation); Copingway 24.9s (2:41–3:08), Boomtoast 25.5s (2:02–2:56),
// Lazerbares 20.8s; Sylmigron 84.8s on the case study (0:25–0:43, 4:22–5:22:
// 2.8 Eclipses), 10–57s on his static's Elune pulls (Entombed Sentinels
// Pull 1: 0:25–0:59, the whole gap between his first two Incarnations).
// An Eclipse was worth 0.3–0.6M by the hits; the plain in-vs-out damage
// rate reads 0.6–1.6M, inflated by what lines up with Eclipse.

import type { JobCheck, Moment } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { mergeWindows, overlapMs, statusWindows, type Window } from "../../timeline";
import { k, s } from "./shared";

const LUNAR_ECLIPSE = 1233272;
const SOLAR_ECLIPSE = 1233346;
const ECLIPSE_LUNAR_BUFF = 48518;
const ECLIPSE_SOLAR_BUFF = 48517;
const INCARNATION = 102560;
const SPENDER = /^(Starsurge|Starfall)/;

const ECL_CHARGES = 2;
const ECL_RECHARGE_MS = 30_000;
const ECL_MS = 15_000;
const ECL_OPENER_MS = 8_000;
const ECL_TAIL_MS = 5_000;
const ECL_ALLOW_MS = 2_000;
const ECL_MIN_HITS = 5;
const STEP_MS = 250;
const MIN_HELD_MS = 500;

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const inside = (ws: Window[], t: number) => ws.some((w) => t >= w.startMs && t <= w.endMs);
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

/** One press per instant (a press can log twice), before the pull's end. */
function presses(ctx: PlayerCheckContext, ids: Set<number>): number[] {
  const out: number[] = [];
  for (const t of ctx.player.casts.filter((c) => !c.fake && ids.has(c.abilityId) && c.timestamp < ctx.endMs).map((c) => c.timestamp).sort((a, b) => a - b)) {
    if (out.length && t - out[out.length - 1] < 100) continue;
    out.push(t);
  }
  return out;
}

/** Stretches a charged cooldown sat at full charges, simulated from its presses (full at the pull). */
function fullStretches(times: number[], charges: number, rechargeMs: number, endMs: number): Window[] {
  let have = charges, nextAt = Infinity;
  const out: Window[] = [];
  let fullSince: number | undefined = 0;
  const advance = (t: number) => {
    while (nextAt <= t) {
      have++;
      const at = nextAt;
      nextAt = have < charges ? at + rechargeMs : Infinity;
      if (have === charges) fullSince = at;
    }
  };
  for (const t of times) {
    advance(t);
    if (have === charges && fullSince !== undefined) { out.push({ startMs: fullSince, endMs: t }); fullSince = undefined; }
    if (have > 0) have--;
    if (nextAt === Infinity) nextAt = t + rechargeMs;
  }
  advance(endMs);
  if (have === charges && fullSince !== undefined) out.push({ startMs: fullSince, endMs });
  return out;
}

// ── Eclipse charges capped ─────────────────────────────────────────────

/** What one Eclipse of a kind adds: ECL_MS × the player's non-spender damage per ms outside it × each ability's measured bonus. */
function eclipseWorth(ctx: PlayerCheckContext, buff: number, excluded: Window[]): { value: number; parts: string[] } | undefined {
  const ecl = statusWindows(ctx.player, new Set([buff]), ctx.endMs);
  const anyEcl = statusWindows(ctx.player, new Set([ECLIPSE_LUNAR_BUFF, ECLIPSE_SOLAR_BUFF]), ctx.endMs);
  const outWindows = mergeWindows([...excluded, ...anyEcl]);
  const outMs = ctx.endMs - overlapMs(0, ctx.endMs, outWindows);
  if (outMs <= 0) return undefined;
  const by = new Map<string, { inside: number[]; outside: number[]; outDamage: number }>();
  for (const e of ctx.player.damageDone) {
    if (e.pet || e.timestamp >= ctx.endMs || SPENDER.test(e.abilityName) || inside(excluded, e.timestamp)) continue;
    const g = by.get(e.abilityName) ?? { inside: [], outside: [], outDamage: 0 };
    const inE = inside(ecl, e.timestamp);
    if (!inE && inside(anyEcl, e.timestamp)) continue;   // the other Eclipse
    if (!inE) g.outDamage += e.amount ?? 0;
    if (e.hitType === 1 && e.unmitigatedAmount) (inE ? g.inside : g.outside).push(e.unmitigatedAmount);
    by.set(e.abilityName, g);
  }
  let perMs = 0;
  const parts: { name: string; v: number; r: number }[] = [];
  for (const [name, g] of by) {
    if (g.inside.length < ECL_MIN_HITS || g.outside.length < ECL_MIN_HITS) continue;
    const r = median(g.inside) / median(g.outside);
    if (!(r > 1)) continue;
    perMs += g.outDamage / outMs * (r - 1);
    parts.push({ name, v: g.outDamage / outMs * (r - 1) * ECL_MS, r });
  }
  if (!(perMs > 0)) return undefined;
  parts.sort((a, b) => b.v - a.v);
  return { value: perMs * ECL_MS, parts: parts.slice(0, 3).map((p) => `${p.name} ×${p.r.toFixed(2)}`) };
}

const eclipseCapped: JobCheck = (ctx) => {
  const times = presses(ctx, new Set([LUNAR_ECLIPSE, SOLAR_ECLIPSE]));
  if (times.length === 0) return [];
  const p = ctx.player;
  const inc = statusWindows(p, new Set([INCARNATION]), ctx.endMs);
  const forced = mergeWindows(ctx.forced);
  const notHeld = mergeWindows([...ctx.forced, ...inc, ...(ctx.context?.cooldownHoldWindows?.(ctx.pull) ?? [])]);
  const lastUseful = ctx.endMs - ECL_TAIL_MS;
  const counts = (t: number) => t >= ECL_OPENER_MS && t < lastUseful && !inside(notHeld, t)
    && overlapMs(t, t + ECL_MS, forced) <= ECL_MS / 2;

  // The Eclipse the player presses, valued by its own hits.
  const lunarShare = times.filter((t) => p.casts.some((c) => c.abilityId === LUNAR_ECLIPSE && Math.abs(c.timestamp - t) < 100)).length / times.length;
  const excluded = mergeWindows([...forced, ...inc]);
  const lunar = lunarShare > 0 ? eclipseWorth(ctx, ECLIPSE_LUNAR_BUFF, excluded) : undefined;
  const solar = lunarShare < 1 ? eclipseWorth(ctx, ECLIPSE_SOLAR_BUFF, excluded) : undefined;
  const value = (lunar ? lunarShare * lunar.value : 0) + (solar ? (1 - lunarShare) * solar.value : 0);
  if (!(value > 0)) return [];

  const moments: Moment[] = [];
  let heldMs = 0;
  for (const w of fullStretches(times, ECL_CHARGES, ECL_RECHARGE_MS, ctx.endMs)) {
    let open = 0;
    for (let t = w.startMs; t < w.endMs; t += STEP_MS) if (counts(t)) open += Math.min(STEP_MS, w.endMs - t);
    const held = open - ECL_ALLOW_MS;
    if (held < MIN_HELD_MS) continue;
    heldMs += held;
    moments.push({ startMs: w.startMs, endMs: w.endMs, lostDamage: held / ECL_RECHARGE_MS * value,
      detail: `Eclipse at two charges ${clock(w.startMs)}–${clock(w.endMs)}: ${s(held)} of recharge lost` });
  }
  if (moments.length === 0) return [];
  const kinds = [lunar && lunarShare > 0 ? `Lunar ${k(lunar.value)} (${lunar.parts.join(", ")})` : "", solar && lunarShare < 1 ? `Solar ${k(solar.value)} (${solar.parts.join(", ")})` : ""].filter(Boolean);
  return [finding(ctx, {
    kind: "cooldown-drift", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Eclipse charges capped",
    lostDamage: heldMs / ECL_RECHARGE_MS * value,
    basis: `${s(heldMs)} at two charges (past ${s(ECL_ALLOW_MS)} a stretch, outside forced time and Incarnation) ÷ ${s(ECL_RECHARGE_MS)} recharge × ${k(value)} an Eclipse: ` +
      `${s(ECL_MS)} of the player's non-spender damage outside Eclipse × each ability's bonus inside, from its hits; ${kinds.join("; ")}`,
    detail: `Eclipse sat at two charges for ${s(heldMs)} (${(heldMs / ECL_RECHARGE_MS).toFixed(1)} Eclipses not pressed)`,
    moments,
  })];
};

export const BALANCE_CHECKS: JobCheck[] = [eclipseCapped];
