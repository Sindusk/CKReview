// lib/damage/wow/specs/subtlety.ts
//
// Subtlety Rogue's own checks, beside the shared ones melee.ts gives it
// (the Shadow Blades window) and the tracked Shadow Blades, Goremaw's Bite
// and Shadow Dance (tracked-cooldowns.ts). Built in the WoWAnalyzer
// audit's phase 3 (docs/wowa-audit/rogue-subtlety.md), every rule valued
// as damage lost. Measured 2026-10-17 on 41 Subtlety player-pulls, all
// Mythic kills: the top parses 绯弹的亚莉亚 (Jk8Rhf6rwqWP1jg7, Vashnik
// 99.9th), 小胖啵 (wPmFHVKRQb31X97z, 99.8th), Amirmur (Ax8BRZa16VYwmLN7,
// 99.7th) and 志命韓吉 (A49h3gvBnRYHZQNX, Entombed Sentinels 100th), all
// four fetched for this pass, Messerknecht (LckJC7GMhQvD6rdw, 99.3rd),
// Charrend (dG8D9y6WxrfmtgXp, 98.8th), Zikli (MLy7nw8kaW1D394Y, 98.4th),
// 唐宋不吃糖 (J3ckBVtrZNfWv1h7, 96.6th), 水知我 (78hvzrVRXKn6NYMa, 90.9th);
// the best Deathstalker Nickledon (baRCnPv62YQ1dJZN, Entombed Sentinels
// 95.9th, Vashnik 63rd); the weaker 棉花糖丨 (MaWQwnygjkh1czL8, 4.6th),
// Djamyth (C4Kxpn3FtrvjWMAP, 5.6th), Nami (RwxWC6PF2pJ7Zd9H, 6.9th), Nýn
// (zdyhBj7pxWG6A8QZ, 8.2nd), Mystôgân (kZnVcJYpKFRChTzb, 8.7th), Västolord
// (z8rQ23NBy4LwM6PZ, 10.7th), Shade (hjHXmdnJFwTPpMtK), Кагэбист
// (7L3RKpavDA8T4MjY), Rogued (1NL29tyvbzGhZgPK), Milkiz (atJRCq3YM8P4KGpD,
// 17–24th); and 20 mid-table players. Spell ids are from those logs'
// masterData.
//
// Talents (from casts, buffs and hits): Trickster on 25 player-pulls (Coup
// de Grace, Unseen Blade, Escalating Blade), Deathstalker on 16 (Darkest
// Night, Deathstalker's Mark); every one of 16 players probed at Vashnik's
// 97th percentile and up is Trickster. Every player: combo points to 7,
// Ancient Arts (1269163), Goremaw's Bite, Shadow Blades, Secret Technique.
// Nobody presses Rupture, Symbols of Death or Shuriken Tornado; one pull
// (Nickledon, Entombed Sentinels) Gloomblade.
//
// ── Energy at the cap (energyCapped) ───────────────────────────────────
// The shared check (shared.ts resourceCapFindings) less the clones'
// Secret Technique casts (282449): two a press, 0.4–0.8s after it, logged
// with the player's Energy and no cost, so each read as a cast at the cap
// with its regen as the gain. They made 21–30 of the "casts at full
// Energy" on the top players (绯弹的亚莉亚 1.08M, 小胖啵 1.12M, Zikli
// 1.08M). Without them: top 0–251k (小胖啵: Shadow Dance, Vanish and the
// Heart pressed at 100), weak 5–712k (Nýn 712k, Milkiz 516k).
//
// ── Big finisher without Ancient Arts (ancientArtsMissed) ──────────────
// Ancient Arts is gained when a builder fills the combo points (93% of
// Shadowstrikes and Shuriken Storms in a dance; outside it, about half of
// the third builder after a finisher: points that Shadow Techniques fills
// grant none) and spent by the next finisher, which echoes under its
// "(Ancient Arts)" id (1269205 Eviscerate, 1269560 Secret Technique,
// 1269565 Black Powder) for ~0.5–0.9× its own hits (Coup de Grace's echo
// 1.2–1.9× the hits we count as its own). So the buff is worth most on the
// big finishers: Secret Technique (echo 0.21–1.0M), Coup de Grace (161–343k)
// and, for Deathstalker, the Eviscerate that spends Darkest Night (169–292k;
// every Darkest Night was spent by an Eviscerate), against 54–163k on an
// ordinary one. A big finisher pressed without it loses its echo, and the
// buff goes to an ordinary finisher instead. Lost per press = its own hits
// × the player's echo ratio for that finisher (their presses with the buff,
// 5 or more; else their plain Eviscerate's ratio, the lower) − the
// player's average ordinary echo − what getting the buff first would have
// cost (main session's timeline question, 2026-10-17): a builder pressed
// at the cap (the player's combo points spent ÷ builders pressed, at their
// plain Eviscerate's damage a point), the finisher a GCD later (that GCD ÷
// the player's average interval for that finisher × its average hits:
// every later one comes that much later), and for a Secret Technique
// whose dance ends within a GCD of it, the player's in-dance − outside
// average. Together 100–170k a press. A press whose echo doesn't beat
// that is a trade and isn't counted. The finisher's own extra crit when
// Cold Blood rode with the buff isn't counted (lenient).
// Zikli's dance-entry Secret Techniques stay losses under this: the dance
// lasts ~8s, so one builder first still lands them in it.
// Premise: top players pair them (Secret Technique with the buff 13 of 14,
// 18/18, 16/16, 16/17, 17/18), Deathstalkers their Darkest Night
// Eviscerates (Nickledon 3 of 32 without, Esra 1 of 35, Кагэбист 0 of 44).
// Measured (lost a pull, netted; before the netting in brackets): top
// 绯弹的亚莉亚, Charrend, Amirmur none, Messerknecht 31k (464k), 唐宋不吃糖
// 90k (282k), 志命韓吉 355k (529k), 小胖啵 621k (2.10M), 水知我 873k
// (1.05M), Zikli 2.58M (4.57M: 9 Secret Techniques, pressed the instant he
// dances at 7 points Shadow Techniques filled, 0:31, 1:16, 2:19);
// Nickledon 0.45M / 1.16M. Weaker: Rogued 4.37M (6.36M; 13 Secret
// Techniques), Feyxd (6kHtGaQXCMWYxFpZ) 2.99M (6.20M; Darkest Night
// Eviscerates from 0:12), Derrieretoi (7pFPAqzc2NHLXjwZ, 85th) 3.39M, Shade
// 2.07M, Mystôgân 1.72M, 棉花糖丨 1.20M, Västolord 1.10M, Nami 1.10M,
// Кагэбист 930k, Nýn 595k, Milkiz 333k, Djamyth 265k. Zikli is the one top
// player who reads high: a real loss, not a trade.
//
// ── Secret Technique just before Shadow Dance (secretTechniqueBeforeDance)
// A Secret Technique in a dance did 342–778k, one outside 23–652k (median
// players ~45% less). One pressed outside a dance (and Shadow Blades) less
// than ST_BEFORE_MS before the next dance would have done the dance's
// average had it waited: lost = average in a dance − average outside −
// the wait ÷ the player's average Secret Technique interval × the average
// in a dance (every later one comes that much later), when positive.
// The top players' outside ones come 13–26s before the next dance
// (holding them would lose a cast) and aren't counted.
// Measured: top none but Zikli 142k; Nickledon 80k; weaker Mystôgân 646k
// (0:05, 0:21, 0:52, 2:58: 0.4–4.7s before the dance), Djamyth 643k
// (4:21, 4:38, 5:00, 5:18), Vespionr (vRPGT4MN6VALQWFh) 364k.
//
// ── Shadow Dance window (danceWindow) ──────────────────────────────────
// burstGcdFindings on the dance's buff (185422): GCDs short in it × the
// average GCD × the window's hit bonus. Top 0–39k, weak 0–222k (Mystôgân,
// 5:52 and 6:38 two short each). Small; idle there costs more than a
// normal GCD, which the gap check prices.
//
// ── Tracked cooldowns' value per use (tracked-cooldowns.ts) ────────────
// Shadow Blades and Goremaw's Bite deal nothing under their cast ids, so
// their drift never showed. Shadow Blades: its own hits (279043), 0.82–
// 1.97M a use (a floor: the full combo points its builders give aren't
// counted). Goremaw's Bite: its hits (426592, 426593) and the echoes its
// 14s window gives the finishers (1309309, 1269217: every one within 14.0s
// of a press), 0.52–1.39M a use, less a GCD. Shadow Dance (185313), newly
// tracked: two charges on a fixed 20.0s recharge (the largest recharge
// every player's casts fit is 20.00s on 37 of 41 player-pulls, 19.75–22
// on the rest; no combo-point reduction shows), valued by feralWindowValue
// (feral.ts): the dance's hit bonus outside Shadow Blades (+1–30%, median
// ~23%) × the damage done in an average dance, 32k–1.32M. A dance does
// ×1.5–5.4 the player's rate outside it, but most of that is pooled Energy
// and points spent there, not damage it adds, so that isn't its value.
// Measured (lost a pull): every top player none for all three. Weaker:
// Shadow Blades drift Rogued 1.21M (21.9s held), Dac (ZvrLTQfk1zbAXMwB,
// Entombed Sentinels) 1.15M, Caedseax (fcj1YgaCJBT2kXFm) 1.36M; Goremaw's
// Bite drift Кагэбист 3.37M (6 uses, room for 9: 141.7s held), 利维坦夜刃
// (K4x8cMZYVpGCDbJH) 1.08M, Caedseax 900k, Västolord 876k, Rogued 744k,
// Sylandri 667k, Nami 431k; Shadow Dance drift Nami 1.86M (54.4s capped,
// 3 uses), Mystôgân 1.52M, Västolord 825k, Milkiz 607k, Shade 445k.
//
// ── Measured and not built ─────────────────────────────────────────────
// - Finishers below 7 points: top 0–7 a pull (~0–111k at the press's
//   Energy spread over fewer points), weak up to 17 (Rogued ~383k).
// - Dance entered below 50 Energy: top 0–5 of 16–21 dances (Amirmur 5,
//   小胖啵 4, Messerknecht 3), weak 0–7 (Djamyth 7). No signal.
// - Shadow Blades with one dance in it: top always two (小胖啵's last at
//   6:05 the exception), weak Dac 3–4 windows, Djamyth 3, Caedseax 4 (a
//   charge at hand), Mystôgân 4. The dance isn't lost, only moved out of
//   Shadow Blades (~13% of its extra damage: ~0.1M a window).
// - Dances without a Secret Technique: top 0–5 a pull, weak 1–10; it
//   overlaps. Secret Technique's cooldown fits no fixed recharge (the
//   largest every cast fits is 12–21s by player, and every player "holds"
//   it 64–160s at 18s): it is pressed with the dances.
// - Vanish: top players 0–4 uses (唐宋不吃糖, 96.6th, none). No per-use
//   value known. Find Weakness is now the player's own buff (1264521, from
//   Shadowstrike), so the early-Vanish rule has no enemy debuff to read.

import type { PlayerEvent, PlayerInfo } from "@/types/PlayerInfo";
import type { JobCheck, Moment } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { forcedPart, mergeWindows, type Window } from "../../timeline";
import { burstGcdFindings, k, observedWindowBonus, primaryResourceCapFindings, s, statusWindows } from "./shared";
import { feralWindowValue } from "./feral";

const EVISCERATE = 196819;
const SECRET_TECHNIQUE = 280719;
const ST_CLONE = 282449;          // the clones' Secret Technique: logged as the player's casts and hits
const BLACK_POWDER = 319175;
const COUP_DE_GRACE = 441776;
const SHADOW_DANCE = 185422;      // the buff (the cast is 185313)
const SHADOW_BLADES = 121471;
const ANCIENT_ARTS = 1269163;
const DARKEST_NIGHT = 457280;
const ECHOES = new Set([1269205, 1269560, 1269565]);   // Eviscerate / Secret Technique / Black Powder (Ancient Arts)
const ST_HITS = new Set([280720, ST_CLONE, 1305994]);  // Secret Technique, the clones', Akaari's Soul's
const FINISHERS = new Set([EVISCERATE, SECRET_TECHNIQUE, BLACK_POWDER, COUP_DE_GRACE]);
// Each finisher's own hits (Shadowed Finishers 328082 and 319190 ride on Eviscerate and Black Powder;
// Coup de Grace hits as six "Eviscerate (Coup de Grace)" ids).
const OWN_HITS = new Map<number, Set<number>>([
  [EVISCERATE, new Set([EVISCERATE, 328082])],
  [SECRET_TECHNIQUE, ST_HITS],
  [BLACK_POWDER, new Set([BLACK_POWDER, 319190])],
  [COUP_DE_GRACE, new Set([462241, 462242, 462243, 462244, 462247, 462248])],
]);

const BUILDERS = new Set([53, 185438, 197835, 426591, 200758, 114014]);   // Backstab, Shadowstrike, Shuriken Storm, Goremaw's Bite, Gloomblade, Shuriken Toss
const CP = 4;
const MAX_CP = 7;
const LAND_MS = 300;
const ECHO_MS = 1_200;
const OWN_MS = 400;
const ST_HIT_MS = 3_000;
const MIN_SAMPLES = 3;
const RATIO_SAMPLES = 5;
const MIN_LOST = 1_000;

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const avg = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / xs.length;

/** One press per spell per instant, before the pull's end. */
function presses(ctx: PlayerCheckContext, ids: Set<number>): PlayerEvent[] {
  const out: PlayerEvent[] = [];
  for (const c of ctx.player.casts.filter((c) => !c.fake && ids.has(c.abilityId) && c.timestamp < ctx.endMs).sort((a, b) => a.timestamp - b.timestamp)) {
    const last = out[out.length - 1];
    if (last && last.abilityId === c.abilityId && c.timestamp - last.timestamp < 100) continue;
    out.push(c);
  }
  return out;
}

/** Whether the player's own status was up just before t (its last event before t wasn't a removal). */
function upBefore(player: PlayerInfo, statusId: number, t: number): boolean {
  let on = false;
  for (const b of (player.buffs ?? []).filter((x) => x.abilityId === statusId && x.source === player.name).sort((a, c) => a.timestamp - c.timestamp)) {
    if (b.timestamp >= t) break;
    on = b.buffStatus !== "removed";
  }
  return on;
}

const inAny = (ws: Window[], t: number) => ws.some((w) => t >= w.startMs && t <= w.endMs);

// ── Energy at the cap ──────────────────────────────────────────────────
// The clones' Secret Technique casts (282449) log the player's Energy, cost
// nothing and come 0.4–0.8s after each press: read as casts at the cap.
const energyCapped: JobCheck = (ctx) => primaryResourceCapFindings(ctx, [ST_CLONE]);

// ── Ancient Arts on the big finishers ──────────────────────────────────

type Kind = "dn" | "st" | "cdg";
const KIND_NAME: Record<Kind, string> = { dn: "Eviscerate under Darkest Night", st: "Secret Technique", cdg: "Coup de Grace" };

const ancientArtsMissed: JobCheck = (ctx) => {
  const fins = presses(ctx, FINISHERS);
  if (fins.length < 10) return [];
  const mine = ctx.player.damageDone.filter((e) => !e.pet);
  const rows = fins.map((c, i) => {
    const next = fins[i + 1]?.timestamp ?? Infinity;
    const sum = (ids: Set<number>, ms: number) => mine.filter((e) => ids.has(e.abilityId) && e.timestamp >= c.timestamp - 20 && e.timestamp < Math.min(next, c.timestamp + ms))
      .reduce((a, e) => a + (e.amount ?? 0), 0);
    const kind: Kind | undefined = c.abilityId === SECRET_TECHNIQUE ? "st" : c.abilityId === COUP_DE_GRACE ? "cdg"
      : c.abilityId === EVISCERATE && upBefore(ctx.player, DARKEST_NIGHT, c.timestamp) ? "dn" : undefined;
    return {
      c, kind, aa: upBefore(ctx.player, ANCIENT_ARTS, c.timestamp),
      echo: sum(ECHOES, ECHO_MS),
      own: sum(OWN_HITS.get(c.abilityId)!, c.abilityId === SECRET_TECHNIQUE ? ST_HIT_MS : OWN_MS),
    };
  });
  const ratio = (rs: typeof rows) => { const own = rs.reduce((a, r) => a + r.own, 0); return own > 0 ? rs.reduce((a, r) => a + r.echo, 0) / own : 0; };
  const ordinary = rows.filter((r) => !r.kind && r.aa);
  const plainEvis = ordinary.filter((r) => r.c.abilityId === EVISCERATE);
  if (ordinary.length < MIN_SAMPLES || plainEvis.length < MIN_SAMPLES) return [];
  const ordEcho = avg(ordinary.map((r) => r.echo));
  const fallback = ratio(plainEvis);
  const forced = mergeWindows(ctx.forced);
  // What getting the buff first would have cost: a builder pressed at the
  // cap (its points wasted) and the finisher a GCD later (every later one
  // of its kind that much later; a Secret Technique pushed out of its dance
  // does the outside average instead).
  const builders = presses(ctx, BUILDERS).length;
  const cpSpent = fins.reduce((a, c) => a + (c.resources?.find((r) => r.type === CP)?.cost ?? 0), 0);
  const cpPerBuilder = builders > 0 ? Math.min(MAX_CP, cpSpent / builders) : 0;
  const perCp = avg(rows.filter((r) => r.c.abilityId === EVISCERATE && r.kind !== "dn").map((r) => r.own)) / MAX_CP;
  const builderCost = cpPerBuilder * (perCp || 0);
  const gcd = ctx.baseGcdMs;
  const dances = statusWindows(ctx, SHADOW_DANCE);
  const stIn = rows.filter((r) => r.kind === "st" && inAny(dances, r.c.timestamp + 5)).map((r) => r.own);
  const stOut = rows.filter((r) => r.kind === "st" && !inAny(dances, r.c.timestamp + 5)).map((r) => r.own);
  const stDrop = stIn.length >= MIN_SAMPLES && stOut.length > 0 ? Math.max(0, avg(stIn) - avg(stOut)) : 0;
  const moments: Moment[] = [];
  const per: string[] = [];
  let lost = 0;
  for (const kind of ["dn", "st", "cdg"] as Kind[]) {
    const all = rows.filter((r) => r.kind === kind);
    const withAA = all.filter((r) => r.aa);
    const own = withAA.length >= RATIO_SAMPLES;
    const r = own ? ratio(withAA) : fallback;
    const interval = all.length > 1 ? (all[all.length - 1].c.timestamp - all[0].c.timestamp) / (all.length - 1) : Infinity;
    const delayCost = gcd / interval * avg(all.map((x) => x.own));
    const missed = rows.filter((x) => x.kind === kind && !x.aa && !inAny(forced, x.c.timestamp));
    let n = 0, sub = 0;
    for (const x of missed) {
      const dance = dances.find((w) => x.c.timestamp + 5 >= w.startMs && x.c.timestamp <= w.endMs);
      const outOfDance = kind === "st" && dance !== undefined && dance.endMs < x.c.timestamp + gcd + LAND_MS ? stDrop : 0;
      const each = r * x.own - ordEcho - builderCost - delayCost - outOfDance;
      if (each <= 0) continue;
      n++; sub += each;
      moments.push({ startMs: x.c.timestamp, endMs: x.c.timestamp, lostDamage: each,
        detail: `${KIND_NAME[kind]} at ${clock(x.c.timestamp)} without Ancient Arts (${k(x.own)} of its own hits)` });
    }
    if (n === 0) continue;
    lost += sub;
    per.push(`${n} ${KIND_NAME[kind]} × (its own hits × ${r.toFixed(2)} (${own ? `the echo ÷ hits of its ${withAA.length} with Ancient Arts` : "the plain Eviscerate's echo ratio"}) − ${k(ordEcho)} − ${k(builderCost + delayCost)} for a builder first and the finisher a GCD later)`);
  }
  if (moments.length === 0 || lost < MIN_LOST) return [];
  moments.sort((a, b) => a.startMs - b.startMs);
  return [finding(ctx, {
    kind: "proc-lost", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Big finisher without Ancient Arts",
    lostDamage: lost,
    basis: `${per.join(" + ")} (an ordinary finisher's echo: it got the Ancient Arts instead)`,
    detail: `${moments.length} big finisher${moments.length > 1 ? "s" : ""} pressed without Ancient Arts (a builder that fills the combo points grants it; the next finisher spends it and echoes)`,
    moments,
  })];
};

// ── Secret Technique just before a dance ───────────────────────────────

const ST_BEFORE_MS = 8_000;

const secretTechniqueBeforeDance: JobCheck = (ctx) => {
  const dances = statusWindows(ctx, SHADOW_DANCE);
  const blades = statusWindows(ctx, SHADOW_BLADES);
  const sts = presses(ctx, new Set([SECRET_TECHNIQUE]));
  if (sts.length < 4 || dances.length === 0) return [];
  const hits = ctx.player.damageDone.filter((e) => !e.pet && ST_HITS.has(e.abilityId));
  const rows = sts.map((c, i) => ({
    t: c.timestamp,
    value: hits.filter((e) => e.timestamp >= c.timestamp && e.timestamp < Math.min(sts[i + 1]?.timestamp ?? Infinity, c.timestamp + ST_HIT_MS)).reduce((a, e) => a + (e.amount ?? 0), 0),
    dance: inAny(dances, c.timestamp + 5), blades: inAny(blades, c.timestamp + 5),
  }));
  const inside = rows.filter((r) => r.dance && !r.blades).map((r) => r.value);
  const outside = rows.filter((r) => !r.dance && !r.blades).map((r) => r.value);
  if (inside.length < MIN_SAMPLES || outside.length === 0) return [];
  const avgIn = avg(inside), avgOut = avg(outside);
  const interval = (sts[sts.length - 1].timestamp - sts[0].timestamp) / (sts.length - 1);
  const moments: Moment[] = [];
  for (const r of rows) {
    if (r.dance || r.blades) continue;
    const next = dances.find((w) => w.startMs > r.t);
    if (!next || next.startMs - r.t > ST_BEFORE_MS) continue;
    const wait = next.startMs - r.t;
    if (forcedPart(r.t, next.startMs, ctx.forced).ms > 0) continue;
    // Held to the dance, it would have done the dance's average, and every later one would come that much later.
    const lost = avgIn - avgOut - wait / interval * avgIn;
    if (lost <= 0) continue;
    moments.push({ startMs: r.t, endMs: next.startMs, lostDamage: lost,
      detail: `Secret Technique at ${clock(r.t)}, ${s(wait)} before the Shadow Dance at ${clock(next.startMs)}` });
  }
  const lost = moments.reduce((a, m) => a + (m.lostDamage ?? 0), 0);
  if (moments.length === 0 || lost < MIN_LOST) return [];
  return [finding(ctx, {
    kind: "burst-window", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Secret Technique just before Shadow Dance",
    lostDamage: lost,
    basis: `each: ${k(avgIn)} an average Secret Technique in a dance − ${k(avgOut)} one outside, less the wait ÷ its ${s(interval)} average interval × ${k(avgIn)} (every later one comes that much later)`,
    detail: `${moments.length} Secret Technique${moments.length > 1 ? "s" : ""} pressed outside Shadow Dance less than ${s(ST_BEFORE_MS)} before the next one (outside Shadow Blades)`,
    moments,
  })];
};

// ── Shadow Dance window (trial) ────────────────────────────────────────
const danceWindow: JobCheck = (ctx) => burstGcdFindings(ctx, {
  statusId: SHADOW_DANCE, name: "Shadow Dance",
  bonus: observedWindowBonus,
  bonusBasis: "the window's bonus read from the player's own hits, inside vs outside, capped at 30%",
  inference: true,
});

/** One Shadow Dance's worth (tracked-cooldowns.ts): its window's hit bonus outside Shadow Blades × the damage inside an average dance. */
export const shadowDanceValue = feralWindowValue(SHADOW_DANCE, "Shadow Dance", [SHADOW_BLADES]);

export const SUBTLETY_CHECKS: JobCheck[] = [energyCapped, ancientArtsMissed, secretTechniqueBeforeDance, danceWindow];
