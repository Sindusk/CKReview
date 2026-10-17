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
// Moonfire ×1.09; the spenders ×1.43 (Starsurge) and ×1.49 (Starfall).
// Each charge that sits full is a recharge lost: time at two charges ÷ 30s
// is that share of an Eclipse not pressed. One Eclipse is worth 15s of the
// player's damage outside Eclipse and Incarnation, each ability × (its own
// inside ÷ outside non-crit median − 1, at most ECL_RATIO_CAP: Pondzsi's own
// Starfall read ×2.32), in the Eclipse the player presses (their Lunar /
// Solar mix). The spenders are in it: what the player spent outside
// because no Eclipse came is this check's, not spenderOutsideEclipse's
// (below), which judges a spend given the player's own Eclipses.
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
// An Eclipse was worth 0.3–0.6M by the hits (Sylmigron 452k on the case
// study); the plain in-vs-out damage rate reads 0.6–1.6M, inflated by what
// lines up with Eclipse.
// Lost (a pull): the top players above none on 12 of 25, else 18–123k
// (Новеон 123k, Skress 107k, Arzenal 84k: 0:22–0:28 after his opener);
// Copingway 258k, Boomtoast 202k, Lazerbares 184k, Mortychen 172k; Sylmigron
// 1.06M on the case study (4:23–5:23: 36s at two charges, 546k) and 0–931k
// on each of his static's 16 pulls (Ula'tek 931k; Entombed Sentinels Pull 1
// 506k: 0:25–1:36).
//
// ── Spenders outside Eclipse (spenderOutsideEclipse) ───────────────────
// Built 2026-10-13 in ranged.ts on the case study (Sylmigron 26 vs Kadss's
// 4 there, WoWAnalyzer 28 vs 4), moved here and reworked in this pass. As
// built, a paid or free Starsurge / Starfall cast outside Eclipse and
// Incarnation under 20 Astral Power from the cap was priced at the
// player's inside − outside average per cast; the top players read
// 1.2–2.3M (Delvkin 2.32M for 18 spends, Lappe 1.48M) against Sylmigron's
// 1.69M, for three reasons, each measured:
// - 40 of 87 such spends on the top players checked were free (Starweaver's
//   Weft / Warp up: Delvkin 13 of 18), a proc used, not a choice;
// - "inside" took in Incarnation and the enemies a Starfall found
//   (Kihmarhi's Starfall 510k inside vs 60k outside, Vashnik's adds): read
//   per hit instead, Eclipse adds ×1.43 to a Starsurge and ×1.49 to a
//   Starfall (pooled; the player's own with SPENDER_MIN_HITS each side);
// - the top players keep one Eclipse charge back and still spend outside
//   Eclipse, because holding would cap: at 6.5–9.6 Astral Power a second
//   outside, 60 Astral Power fills in 5s.
// So now: a paid spend outside Eclipse and Incarnation is a loss only when
// its Astral Power, plus the player's own gain rate outside (from the
// casts' logged amounts), would have stayed under the cap until their
// next Eclipse or Incarnation started; priced at its hits that landed
// outside × (the bonus − 1) (a Starfall pressed just before an Eclipse
// mostly lands in it). A spend forced by a late Eclipse is excused here:
// the late Eclipse is eclipseCapped's.
// Lost (a pull): the top players above none on 9 of 25, else 5–277k
// (Новеон 277k, Arzenal 263k, Alcorria 251k: 1:42, 2:03 and 3:31, each
// 1–3s before her Eclipse); weaker Mortychen 149k, Boomtoast 78k; Sylmigron
// 182k on the case study (0:38, 3:06, 5:19; 20 more excused) and 0–217k on
// his static's pulls. With eclipseCapped, the pair reads 0–400k on the top
// players (Lappe, Birdlet, Delvkin, Boltxb, Pondzsi none) and 1.25M on the
// case study.
//
// ── Fury of Elune held (furyHeld) ──────────────────────────────────────
// Fury of Elune (202770, Elune's Chosen) is an 8s beam: its hits (211545,
// 394111), Boundless Moonlight's at its end (428682) and the Full Moon /
// Minor Moon it brings, 0.21–0.52M a press outside Incarnation, plus ~30–50
// Astral Power over the beam (the casts' logged amounts: 11–13 a second
// inside it against 7–8 outside), worth 6–9k each in spenders. Its cooldown
// isn't WoWAnalyzer's (60s, Lunation 2s a cast): fitted on 288 intervals of
// the 30 Elune player-pulls, it is 45s less 1.5s per Starfire (194153),
// Starsurge (78674), Starfall (191034) or Moonfire (8921) cast (37
// intervals within 1s of that line, none under it; no other per-spell mix
// came close, and the cooldown isn't hasted: the opener's lust cycles are
// the shortest in real time, 18.5–21s, not in hasted time). Players
// without Lunation (shortest interval 45s or 60s: Copingway, Jugular,
// Новеон, Faunuis, Sylmigron at Coiled Altar) get that flat cooldown.
// Held = ready → next press, less forced time (and FOE_SETTLE_MS after it:
// the retarget and DoTs after a Stasis boss swap; Skress and Luontojäbä
// press 7–11s after the 4:22 swap), the context's hold windows, time whose
// next 8s is mostly forced, the pull's last FOE_TAIL_MS, and FOE_ALLOW_MS a
// cycle: the top players' ordinary delay (median 1.8s, p90 4.7s over 153
// cycles; the weaker players' p90 9.1s). Not Eclipse: holds that end in an
// Eclipse are as common on the weak as on the top. A held second costs
// that share of a use: held ÷ the player's average recharge × (their press
// outside Incarnation + its Astral Power − their average GCD).
// Held for Incarnation: a press lined up with it (inside, or within
// FOE_BEFORE_INC_MS before) did 1.62× one outside (pooled, 87 / 278
// presses), so a hold that ends there is excused up to its break-even,
// never past one recharge. Boltxb held it 18s at 4:17 for Incarnation at
// 4:42; Skress 16s at 2:32 for 2:55.
// Lost (a pull): top Entombed Sentinels Boltxb, Delvkin, Birdlet, Lappe,
// Painseekerr, 뽀또에요 none; Skress 63k, Luontojäbä 35k, Arzenal 35k, Pondzsi
// 80k; Vashnik Faunuis none, Adrenalift 13k, Acíz 53k, Meekii 67k,
// Alcorria 108k (2:22, pressed 2:32). Weaker: Tormgan 267k (0:51 → 1:00,
// 3:38 → 3:47), Boomtoast 71k, Lazerbares 57k; Sylmigron 335k on the case
// study (1:54 → 2:10, 4:56 → 5:10) and 0–288k on his static's Elune pulls
// (Ula'tek 288k: 4:21 → 4:43, 6:40 → 6:52).
//
// ── Starfall on one enemy (starfallOneTarget) ──────────────────────────
// Starfall (191034, the cast and an 8s buff that stacks: a second press
// adds a stack, Sylmigron 1:28.3 / 1:29.4 on the case study; hits 191037,
// 1301742) and Starsurge (78674; hits by name, Star Cascade's included)
// spend the same Astral Power. An isolated Starfall whose hits found one
// enemy did 0.40× (Eclipse, 9 casts) and 0.46× (outside, 5) the player's
// Starsurge per Astral Power; on two enemies Starfall already wins (1.35×
// pooled, overlaps included), so WoWAnalyzer's three-target line is wrong
// but its one-target premise holds. Starfalls chained within 8s share
// their hits, so each chain is judged: when all its hits found one enemy,
// its paid Starfalls' Astral Power × the player's own Starsurge damage per
// Astral Power (in or out of Eclipse / Incarnation as each was cast) − the
// chain's hits (the paid share, free Starweaver's Warp ones left out).
// Not counted: a chain in forced time or running past the pull's end.
// Lost (a pull): top Entombed Sentinels players none (three bosses, always
// a second enemy); on Vashnik Kihmarhi, Adrenalift, Acíz, 一队萨满, 德大叔,
// 予你 none, 星尘魅影 105k, 秋風怒 107k, Mortychen 63k, Meekii 203k (two at
// 5:41). Weaker: Jugular 740k (Ftj4vwHf9RazPcqV: 1:22, 4:11, 5:50, all on
// Vashnik alone), Nopsu 394k; Sylmigron 386k on the case study (1:28,
// 2:07, 3:41) and 0–348k on his static's pulls (Vashnik 3 348k, Vashnik
// 5 316k).

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
const ECL_RATIO_CAP = 2;
const STEP_MS = 250;
const MIN_HELD_MS = 500;

const FURY_OF_ELUNE = 202770;
// Lunation's cutters: Starfire, Starsurge, Starfall, Moonfire (the casts).
const FOE_CUTTERS = new Set([194153, 78674, 191034, 8921]);
const FOE_BASE_MS = 45_000;
const FOE_CUT_MS = 1_500;
const FOE_LUNATION_MAX_MS = 40_000;
const FOE_HITS = /^(Fury of Elune|Boundless Moonlight|Full Moon|Minor Moon)$/;
const FOE_HIT_MS = 12_000;
const FOE_BEAM_MS = 8_000;
const FOE_BEFORE_INC_MS = 3_000;
const FOE_ALLOW_MS = 4_000;
const FOE_SETTLE_MS = 5_000;
const FOE_TAIL_MS = 8_000;
const FOE_MIN_PRESSES = 4;
// A press lined up with Incarnation ÷ one outside, pooled over the 50 (87 / 278 presses, 561k / 346k), for a player with too few of their own.
const FOE_INC_RATIO = 1.62;
const ASTRAL_POWER = 8;      // WCL classResources type, logged ×10
const AP_PAIR_MS = 3_000;
const AP_NEAR_CAP = 50;

const STARFALL = 191034;      // the cast and the player's buff
const STARSURGE = 78674;
const STARFALL_MS = 8_000;
const SURGE_HIT_MS = 2_000;
// Eclipse's bonus to the spenders' hits, pooled over the 50 (Lunar), for a player with too few of their own.
const BALANCE_SPENDERS: { id: number; name: string; spanMs: number; bonus: number }[] = [
  { id: STARSURGE, name: "Starsurge", spanMs: SURGE_HIT_MS, bonus: 1.43 },
  { id: STARFALL, name: "Starfall", spanMs: STARFALL_MS, bonus: 1.49 },
];
const SPENDER_MIN_HITS = 5;

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const inside = (ws: Window[], t: number) => ws.some((w) => t >= w.startMs && t <= w.endMs);
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : NaN);

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

/** What one Eclipse of a kind adds: ECL_MS × the player's damage per ms outside it × each ability's measured bonus (capped at ECL_RATIO_CAP). */
function eclipseWorth(ctx: PlayerCheckContext, buff: number, excluded: Window[]): { value: number; parts: string[] } | undefined {
  const ecl = statusWindows(ctx.player, new Set([buff]), ctx.endMs);
  const anyEcl = statusWindows(ctx.player, new Set([ECLIPSE_LUNAR_BUFF, ECLIPSE_SOLAR_BUFF]), ctx.endMs);
  const outWindows = mergeWindows([...excluded, ...anyEcl]);
  const outMs = ctx.endMs - overlapMs(0, ctx.endMs, outWindows);
  if (outMs <= 0) return undefined;
  const by = new Map<string, { inside: number[]; outside: number[]; outDamage: number }>();
  for (const e of ctx.player.damageDone) {
    if (e.pet || e.timestamp >= ctx.endMs || inside(excluded, e.timestamp)) continue;
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
    const r = Math.min(ECL_RATIO_CAP, median(g.inside) / median(g.outside));
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
      `${s(ECL_MS)} of the player's damage outside Eclipse × each ability's bonus inside, from its hits; ${kinds.join("; ")}`,
    detail: `Eclipse sat at two charges for ${s(heldMs)} (${(heldMs / ECL_RECHARGE_MS).toFixed(1)} Eclipses not pressed)`,
    moments,
  })];
};

// ── Fury of Elune held ─────────────────────────────────────────────────

/** The player's Fury of Elune cooldown: Lunation's per-cast cut when their log shows it, else a flat 45s or 60s. */
function furyModel(ctx: PlayerCheckContext, times: number[]): { readyAfter(t: number): number; rule: string } {
  const gaps = times.slice(1).map((t, i) => t - times[i]);
  const shortest = Math.min(...gaps);
  if (shortest < FOE_LUNATION_MAX_MS) {
    const cuts = ctx.player.casts.filter((c) => !c.fake && FOE_CUTTERS.has(c.abilityId)).map((c) => c.timestamp).sort((a, b) => a - b);
    return {
      readyAfter(t) {
        let n = 0;
        for (const x of cuts) {
          if (x <= t) continue;
          if (x - t + n * FOE_CUT_MS >= FOE_BASE_MS) break;
          n++;
        }
        return t + FOE_BASE_MS - n * FOE_CUT_MS;
      },
      rule: `${s(FOE_BASE_MS)} less ${s(FOE_CUT_MS)} per Starfire, Starsurge, Starfall or Moonfire (Lunation)`,
    };
  }
  const cd = shortest >= 59_000 ? 60_000 : FOE_BASE_MS;
  return { readyAfter: (t) => t + cd, rule: `a flat ${s(cd)} (no Lunation in this log)` };
}

const furyHeld: JobCheck = (ctx) => {
  const times = presses(ctx, new Set([FURY_OF_ELUNE]));
  if (times.length < FOE_MIN_PRESSES) return [];
  const p = ctx.player;
  const model = furyModel(ctx, times);
  const inc = statusWindows(p, new Set([INCARNATION]), ctx.endMs);
  const forced = mergeWindows(ctx.forced);
  // Lined up with Incarnation: the press inside it, or just before it so the beam runs in it.
  const aligned = (t: number) => inside(inc, t) || inside(inc, t + FOE_BEFORE_INC_MS);

  // A press's own hits, to the next press (its beam and Boundless Moonlight's end hits).
  const hits = p.damageDone.filter((e) => !e.pet && FOE_HITS.test(e.abilityName) && e.timestamp < ctx.endMs);
  const rows = times.map((t, i) => ({ t, aligned: aligned(t), dmg: hits.filter((e) => e.timestamp >= t && e.timestamp < Math.min(t + FOE_HIT_MS, times[i + 1] ?? Infinity)).reduce((a, e) => a + (e.amount ?? 0), 0) }))
    .filter((r) => r.t + FOE_HIT_MS <= ctx.endMs && overlapMs(r.t, r.t + FOE_BEAM_MS, forced) <= FOE_BEAM_MS / 2);
  const out = rows.filter((r) => !r.aligned), inn = rows.filter((r) => r.aligned);
  if (out.length < 3) return [];
  const avgOut = avg(out.map((r) => r.dmg));
  const avgIn = inn.length >= 2 ? avg(inn.map((r) => r.dmg)) : avgOut * FOE_INC_RATIO;

  // Its Astral Power: the gain rate over the beam against the rest of the pull, × damage per Astral Power from the spenders.
  const ap = astralPerUse(ctx, times);
  const gcd = ctx.values.gcdValue(undefined, false);
  const value = avgOut + ap.value - gcd;
  if (!(value > 0)) return [];

  const recharges = times.map((t) => model.readyAfter(t) - t);
  const avgRecharge = avg(recharges);
  const perMs = value / avgRecharge;
  const excuseMs = Math.min(avgRecharge, Math.max(0, (avgIn - avgOut) / perMs));
  const notHeld = mergeWindows([...ctx.forced.map((w) => ({ startMs: w.startMs, endMs: w.endMs + FOE_SETTLE_MS })), ...(ctx.context?.cooldownHoldWindows?.(ctx.pull) ?? [])]);
  const lastUseful = ctx.endMs - FOE_TAIL_MS;
  const counts = (t: number) => t < lastUseful && !inside(notHeld, t) && overlapMs(t, t + FOE_BEAM_MS, forced) <= FOE_BEAM_MS / 2;

  const moments: Moment[] = [];
  let heldMs = 0, excusedMs = 0;
  times.forEach((prev, i) => {
    const ready = model.readyAfter(prev);
    const next = times[i + 1];
    const until = Math.min(next ?? lastUseful, lastUseful);
    if (until <= ready) return;
    let open = 0;
    for (let t = ready; t < until; t += STEP_MS) if (counts(t)) open += Math.min(STEP_MS, until - t);
    let held = open - FOE_ALLOW_MS;
    if (held <= 0) return;
    let excused = 0;
    if (next !== undefined && aligned(next)) { excused = Math.min(held, excuseMs); held -= excused; }
    excusedMs += excused;
    if (held < MIN_HELD_MS) return;
    heldMs += held;
    moments.push({ startMs: ready, endMs: next ?? ctx.endMs, lostDamage: held * perMs,
      detail: `Fury of Elune ready at ${clock(ready)}, ${next !== undefined ? `pressed at ${clock(next)}` : "not pressed again"}: ${s(held)} held` +
        (excused > 0 ? ` (${s(excused)} more excused: held for Incarnation)` : "") });
  });
  if (moments.length === 0) return [];
  return [finding(ctx, {
    kind: "cooldown-drift", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Fury of Elune held",
    lostDamage: heldMs * perMs,
    basis: `held time (past ${s(FOE_ALLOW_MS)} a cycle, outside forced time) ÷ ${s(avgRecharge)} average recharge × ${k(value)} a use ` +
      `(${k(avgOut)} its hits outside Incarnation, ${out.length} presses, + ${ap.basis} − ${k(gcd)} average GCD)` +
      (excusedMs > 0 ? `; ${s(excusedMs)} held for Incarnation excused (up to ${s(excuseMs)} a hold: ${k(avgIn)} a press lined up with it − ${k(avgOut)}, its break-even)` : ""),
    detail: `Fury of Elune sat ready ${s(heldMs)} past the allowance in ${moments.length} cycle${moments.length > 1 ? "s" : ""} (cooldown ${model.rule})`,
    moments,
  })];
};

/** Astral Power a Fury of Elune adds over its beam, measured from the casts' logged amounts, × the player's spender damage per Astral Power. */
function astralPerUse(ctx: PlayerCheckContext, foe: number[]): { value: number; basis: string } {
  const casts = ctx.player.casts.filter((c) => !c.fake && c.timestamp < ctx.endMs && c.resources?.some((r) => r.type === ASTRAL_POWER))
    .sort((a, b) => a.timestamp - b.timestamp);
  let inG = 0, inMs = 0, outG = 0, outMs = 0, spent = 0;
  for (let i = 0; i < casts.length; i++) {
    const a = casts[i].resources!.find((r) => r.type === ASTRAL_POWER)!;
    spent += a.cost ?? 0;
    const next = casts[i + 1];
    if (!next) continue;
    const b = next.resources!.find((r) => r.type === ASTRAL_POWER)!;
    const dt = next.timestamp - casts[i].timestamp;
    if (dt <= 0 || dt > AP_PAIR_MS || b.amount >= b.max - AP_NEAR_CAP) continue;
    const g = b.amount - (a.amount - (a.cost ?? 0));
    if (foe.some((t) => casts[i].timestamp >= t && next.timestamp <= t + FOE_BEAM_MS + 500)) { inG += g; inMs += dt; } else { outG += g; outMs += dt; }
  }
  if (inMs < 5_000 || outMs < 5_000 || spent <= 0) return { value: 0, basis: "its Astral Power not measured" };
  const extra = Math.max(0, (inG / inMs - outG / outMs) * FOE_BEAM_MS);
  const spenderDamage = ctx.player.damageDone.filter((e) => !e.pet && e.timestamp < ctx.endMs && SPENDER.test(e.abilityName)).reduce((a, e) => a + (e.amount ?? 0), 0);
  const perUnit = spenderDamage / spent;
  return { value: extra * perUnit, basis: `${Math.round(extra / 10)} Astral Power over its beam × ${k(perUnit * 10)} per Astral Power from the spenders` };
}

// ── Starfall on one enemy ──────────────────────────────────────────────

const starfallOneTarget: JobCheck = (ctx) => {
  const p = ctx.player;
  const casts = p.casts.filter((c) => !c.fake && c.timestamp < ctx.endMs).sort((a, b) => a.timestamp - b.timestamp);
  const falls = casts.filter((c) => c.abilityId === STARFALL);
  if (falls.length === 0) return [];
  const burst = statusWindows(p, new Set([ECLIPSE_LUNAR_BUFF, ECLIPSE_SOLAR_BUFF, INCARNATION]), ctx.endMs);
  const forced = mergeWindows(ctx.forced);
  const cost = (c: (typeof casts)[number]) => (c.resources?.find((r) => r.type === ASTRAL_POWER)?.cost ?? 0) / 10;

  // The player's Starsurge damage per Astral Power, in and out of Eclipse / Incarnation.
  const surges = casts.filter((c) => c.abilityId === STARSURGE);
  const surgeHits = p.damageDone.filter((e) => !e.pet && e.abilityName.startsWith("Starsurge"));
  const perAp = { in: [] as number[], out: [] as number[] };
  surges.forEach((c, i) => {
    if (cost(c) <= 0) return;
    const until = Math.min(c.timestamp + SURGE_HIT_MS, surges[i + 1]?.timestamp ?? Infinity);
    const d = surgeHits.filter((e) => e.timestamp >= c.timestamp && e.timestamp < until).reduce((a, e) => a + (e.amount ?? 0), 0);
    (inside(burst, c.timestamp) ? perAp.in : perAp.out).push(d / cost(c));
  });
  const surgeIn = perAp.in.length >= 3 ? avg(perAp.in) : avg([...perAp.in, ...perAp.out]);
  const surgeOut = perAp.out.length >= 3 ? avg(perAp.out) : avg([...perAp.in, ...perAp.out]);
  if (!(surgeIn > 0) || !(surgeOut > 0)) return [];

  // Starfalls chained within their duration share their hits (a second press stacks the buff): judge each chain.
  const fallHits = p.damageDone.filter((e) => !e.pet && e.abilityName === "Starfall");
  const chains: (typeof falls)[] = [];
  for (const c of falls) {
    const last = chains[chains.length - 1];
    if (last && c.timestamp - last[last.length - 1].timestamp < STARFALL_MS) last.push(c); else chains.push([c]);
  }
  const moments: Moment[] = [];
  let n = 0;
  for (const chain of chains) {
    const from = chain[0].timestamp, to = chain[chain.length - 1].timestamp + STARFALL_MS;
    if (to > ctx.endMs || chain.some((c) => inside(forced, c.timestamp))) continue;
    const hs = fallHits.filter((e) => e.timestamp >= from && e.timestamp < to);
    const enemies = new Set(hs.map((e) => `${e.targetActorId}.${e.targetInstance ?? 1}`));
    if (enemies.size !== 1) continue;
    const paid = chain.filter((c) => cost(c) > 0);
    if (paid.length === 0) continue;
    const damage = hs.reduce((a, e) => a + (e.amount ?? 0), 0) * paid.length / chain.length;
    const asSurges = paid.reduce((a, c) => a + cost(c) * (inside(burst, c.timestamp) ? surgeIn : surgeOut), 0);
    const loss = asSurges - damage;
    if (loss <= 0) continue;
    n += paid.length;
    moments.push({ startMs: from, endMs: to, lostDamage: loss,
      detail: `${paid.length > 1 ? `${paid.length} Starfalls` : "Starfall"} at ${clock(from)} on ${hs[0]?.target ?? "one enemy"} alone: ${k(damage)} for ${paid.reduce((a, c) => a + cost(c), 0)} Astral Power, ${k(asSurges)} as Starsurges` });
  }
  if (moments.length === 0) return [];
  return [finding(ctx, {
    kind: "aoe-single", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Starfall on one enemy",
    lostDamage: moments.reduce((a, m) => a + m.lostDamage, 0),
    basis: `each paid Starfall whose hits found one enemy: its Astral Power × the player's Starsurge damage per Astral Power (${k(surgeIn * 10)} per 10 in Eclipse or Incarnation, ${k(surgeOut * 10)} outside) − the Starfall's own hits (chained Starfalls share theirs)`,
    detail: `${n} Starfall${n > 1 ? "s" : ""} that hit one enemy, where Starsurge does more with the same Astral Power`,
    moments,
  })];
};

// ── Spenders outside Eclipse ───────────────────────────────────────────

/** Eclipse's bonus to one spender's hits: non-crit median inside an Eclipse (not Incarnation) ÷ outside both. */
function spenderEclipseBonus(ctx: PlayerCheckContext, name: string, fallback: number): { bonus: number; own: boolean } {
  const ecl = statusWindows(ctx.player, new Set([ECLIPSE_LUNAR_BUFF, ECLIPSE_SOLAR_BUFF]), ctx.endMs);
  const inc = statusWindows(ctx.player, new Set([INCARNATION]), ctx.endMs);
  const inE: number[] = [], out: number[] = [];
  for (const h of ctx.player.damageDone) {
    if (h.pet || h.abilityName !== name || h.hitType !== 1 || !h.unmitigatedAmount || h.timestamp >= ctx.endMs || inside(inc, h.timestamp)) continue;
    (inside(ecl, h.timestamp) ? inE : out).push(h.unmitigatedAmount);
  }
  if (inE.length < SPENDER_MIN_HITS || out.length < SPENDER_MIN_HITS) return { bonus: fallback, own: false };
  return { bonus: Math.min(ECL_RATIO_CAP, median(inE) / median(out)), own: true };
}

/** Astral Power the player gains per ms outside the windows, from the casts' logged amounts. */
function astralGainPerMs(ctx: PlayerCheckContext, windows: Window[]): number | undefined {
  const casts = ctx.player.casts.filter((c) => !c.fake && c.timestamp < ctx.endMs && c.resources?.some((r) => r.type === ASTRAL_POWER))
    .sort((a, b) => a.timestamp - b.timestamp);
  let g = 0, ms = 0;
  for (let i = 0; i + 1 < casts.length; i++) {
    const a = casts[i].resources!.find((r) => r.type === ASTRAL_POWER)!, b = casts[i + 1].resources!.find((r) => r.type === ASTRAL_POWER)!;
    const dt = casts[i + 1].timestamp - casts[i].timestamp;
    if (dt <= 0 || dt > AP_PAIR_MS || b.amount >= b.max - AP_NEAR_CAP || inside(windows, casts[i].timestamp) || inside(windows, casts[i + 1].timestamp)) continue;
    g += b.amount - (a.amount - (a.cost ?? 0)); ms += dt;
  }
  return ms >= 10_000 ? Math.max(0, g / ms) : undefined;
}

const spenderOutsideEclipse: JobCheck = (ctx) => {
  const p = ctx.player;
  const ecl = statusWindows(p, new Set([ECLIPSE_LUNAR_BUFF, ECLIPSE_SOLAR_BUFF, INCARNATION]), ctx.endMs);
  const forced = mergeWindows(ctx.forced);
  const gain = astralGainPerMs(ctx, ecl);
  if (gain === undefined) return [];
  let lost = 0, n = 0, excused = 0;
  const parts: string[] = [];
  const moments: Moment[] = [];
  for (const sp of BALANCE_SPENDERS) {
    const casts = p.casts.filter((c) => !c.fake && c.abilityId === sp.id && c.timestamp < ctx.endMs).sort((a, b) => a.timestamp - b.timestamp);
    const hits = p.damageDone.filter((h) => !h.pet && h.abilityName === sp.name);
    const { bonus, own } = spenderEclipseBonus(ctx, sp.name, sp.bonus);
    if (!(bonus > 1)) continue;
    let spDmg = 0, spN = 0;
    casts.forEach((c, i) => {
      const r = c.resources?.find((x) => x.type === ASTRAL_POWER);
      if (!r || (r.cost ?? 0) <= 0 || inside(ecl, c.timestamp) || inside(forced, c.timestamp)) return;
      // Could it have waited? The Astral Power held to the player's next Eclipse or Incarnation without capping.
      const nextWindow = ecl.find((w) => w.startMs > c.timestamp)?.startMs ?? Infinity;
      const atNext = r.amount + gain * (nextWindow - c.timestamp);
      if (!(atNext <= r.max) || nextWindow >= ctx.endMs) { excused++; return; }
      // Its hits that landed outside Eclipse and Incarnation (a Starfall pressed just before one runs into it).
      const until = Math.min(c.timestamp + sp.spanMs, casts[i + 1]?.timestamp ?? Infinity);
      const outside = hits.filter((h) => h.timestamp >= c.timestamp && h.timestamp < until && !inside(ecl, h.timestamp)).reduce((a, h) => a + (h.amount ?? 0), 0);
      const loss = outside * (bonus - 1);
      if (loss <= 0) return;
      spDmg += outside; spN++;
      moments.push({ startMs: c.timestamp, endMs: c.timestamp, lostDamage: loss,
        detail: `${sp.name} at ${clock(c.timestamp)} outside Eclipse (${k(outside)} of it outside) at ${Math.round(r.amount / 10)} Astral Power: ` +
          `the next Eclipse came ${s(nextWindow - c.timestamp)} later, ~${Math.round(atNext / 10)} of ${Math.round(r.max / 10)} by then` });
    });
    if (spN === 0) continue;
    lost += spDmg * (bonus - 1); n += spN;
    parts.push(`${spN} ${sp.name} (${k(spDmg)} of hits outside) × ${Math.round((bonus - 1) * 100)}% (${own ? "Eclipse's bonus to the player's own non-crit hits" : "pooled Eclipse bonus"})`);
  }
  if (n === 0) return [];
  moments.sort((a, b) => a.startMs - b.startMs);
  return [finding(ctx, {
    kind: "burst-window", startMs: moments[0].startMs, endMs: moments[moments.length - 1].startMs, forced: false, inference: true,
    label: "Spenders outside Eclipse",
    lostDamage: lost,
    basis: parts.join(" + ") + `; paid spends only, when the Astral Power would have kept to the player's next Eclipse or Incarnation without capping (${(gain * 100).toFixed(1)} a second gained outside them)` +
      (excused ? `; ${excused} more excused: holding would have capped before the next Eclipse` : ""),
    detail: `${n} paid Astral Power spender${n > 1 ? "s" : ""} cast outside Eclipse and Incarnation that could have waited for one`,
    moments,
  })];
};

export const BALANCE_CHECKS: JobCheck[] = [spenderOutsideEclipse, eclipseCapped, furyHeld, starfallOneTarget];
