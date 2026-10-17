// lib/damage/wow/specs/elemental.ts
//
// Elemental Shaman's own checks, beside the shared ones ranged.ts gives it
// (Ascendance window, Maelstrom at the cap, Flame Shock uptime). Built in
// the WoWAnalyzer audit's phase 3 (docs/wowa-audit/shaman-elemental.md),
// every rule valued as damage lost and measured 2026-10-16 on Cocroach's 12
// Elemental pulls of gVDPhzp61Zm29HMw and seven top Mythic parses
// (Vr8dLPtFYWA4G1yg Malegusxd, baRCnPv62YQ1dJZN Fauni, JvQpZk3CXj78Dx2f
// Kullingen and Spongêbob on Entombed Sentinels; r9CX1kpRGLmKJH4M Elemeta
// and Unlucky, 9w3bK4qhrRC82gVX Shaziggla on Vashnik the Malignant).
// Spell ids are from r9CX1kpRGLmKJH4M's masterData unless noted.
//
// ── Casts that can't overload, inside Ascendance (ascendanceNonOverload) ──
// Ascendance (the buff 1219480) makes the overloading spells (Lightning
// Bolt, Lava Burst, Chain Lightning, Elemental Blast, Earthquake) overload
// far more: they did 246–477k a second inside, against 62–107k a second
// for Lightning Bolt outside. Flame Shock, Frost Shock and Voltaic Blaze
// can't overload. Such a cast is moved, not lost: it still happens after
// the window, in a GCD a Lightning Bolt would have filled. So it costs
// (the window's rate for overloading casts − the player's Lightning Bolt
// rate outside) × the time the cast took. Stormkeeper inside is the drift
// check's. Netted against what holding it would have cost:
// - Voltaic Blaze (470057) grants Purging Flames (1259491, every cast):
//   the next Lava Burst also hits the other Flame Shocked enemies. That
//   cleaved damage is worth more inside: the extra targets' Lava Bursts
//   did 365k inside vs 197k outside (12 vs 104 casts on the Vashnik
//   pulls), the same ratio as the player's one-target Lava Bursts (289k vs
//   158k). So the extra targets' damage of the Purging Flames Lava Burst
//   in the window × (1 − the player's outside ÷ inside Lava Burst) comes
//   off. This is what WoWAnalyzer's two-target excuse stands for; it pays
//   back about 165k of a ~250k cast, not all of it.
// - Voltaic Blaze recharges in ~7.5s (shortest interval on every player).
//   One pressed within a GCD of coming back was being used on recharge:
//   holding it to the window's end costs that share of a use (hold ÷
//   recharge, at most one), worth the player's average Voltaic Blaze less
//   their Lightning Bolt.
// - A Flame Shock that put a new DoT on an enemy, or refreshed one that
//   would have run out before the window ends, is needed now (Lava Burst
//   only crits on a shocked target): not counted.
// Measured: top players 0–5 a pull (Voltaic Blaze 3–5 on Vashnik), Cocroach
// 11 in 12 pulls (4 at Ula'tek).
//
// ── Lava Burst without Flame Shock (lavaBurstUnshocked) ────────────────
// Every Lava Burst on an enemy carrying the player's own Flame Shock
// (188389, 470411; enemy debuff events by target and instance) crit:
// 1,487 of 1,487. A non-crit Lava Burst (285452; the pet's 447419 is the
// Ancestor's) on an enemy without it lost the player's shocked Lava Burst
// average less what it did, overloads (285466, 77451) included on both:
// ~120k each. An enemy that took no more hits within UNSHOCKED_DIES_MS is
// excused: a Flame Shock first costs a GCD its DoT can't pay back.
// Measured: top seven 0–4 a pull, Cocroach 15 in 12 pulls (5 on one add at
// Coiled Altar 2:48–3:11).
//
// ── Idle with the Ancestors out (ancestorIdle) ─────────────────────────
// Call of the Ancestors (447244 on the player; the pet is "Ancestor")
// mirrors the player: each cast makes every Ancestor out cast once, ~1s
// later (two Lava Bursts after each Lightning Bolt at two stacks, Elemeta
// 1:07–1:12). 75–93% of their damage lands 0.6–1.7s after a player GCD, and
// almost none more than 1.6s after the last one, so idle stops them too.
// Each idle GCD in a window loses a round of their casts: unforced idle
// (the gap check's stretches of DELAY_FINDING_MS+, inside the window, less
// forced time and movement) ÷ GCD × the player's Ancestor damage per GCD
// in the windows (54–90k). That's on top of checkGcdGaps, which prices the
// player's own GCD. WoWAnalyzer grades active time per window instead
// (forced time included). An earlier per-second split (58.4k/s casting vs
// 25.7k/s idle, top seven) undercounted: the last cast's echo lands in the
// idle that follows it.
//
// ── Spender before an instant Lava Burst (spenderWithoutMote) ──────────
// Each Lava Burst grants Master of the Elements (260734), which the next
// spell takes: an Elemental Blast (117014) or Earthquake (61882), but also
// a Lightning Bolt, Chain Lightning, Voltaic Blaze or Flame Shock (Elemeta:
// 25 Elemental Blasts, 16 Lightning Bolts, 8 Earthquakes, 8 Chain
// Lightnings). It's never wasted, only spent on a weaker spell. So a
// spender cast without it while an instant Lava Burst was ready (Lava Surge
// 77762, outside Ascendance) loses the bonus on the difference: the
// spender − the cast that took the next buff instead (nothing when a
// spender took it). Two spenders in a row lost one buff, not two. The bonus is
// MOTE_BONUS. Excused when a Lava Burst first would have capped Maelstrom
// (its gain measured from the casts' Maelstrom, ~9). WoWAnalyzer counts the
// whole spender; this is ~5–35k each, 0–123k a pull on the eight players.
//
// ── Chain Lightning on one enemy (chainLightningOneTarget) ─────────────
// A Chain Lightning (188443; overloads 45297) whose own hits found one
// enemy, against the player's one-target Lightning Bolt (188196; overloads
// 45284) in the same Ascendance state, outside Stormkeeper (its own check).
// With the Ancestors out it costs their answer too: they cast Lava Burst
// ~1s after a Lightning Bolt (53–94k a cast here) but only a Chain
// Lightning of their own, at once, after a Chain Lightning (~16k on one
// enemy). The Maelstrom difference isn't counted (too few casts to measure
// it). ~20–110k each; top players 0–4 a pull.
//
// ── Flame Shock refreshed early (flameShockEarly) ──────────────────────
// Flame Shock lasts 18s (measured), and a refresh carries up to 30% over
// (pandemic). The DoT ticks either way, so clipping only brings the next
// Flame Shock GCD sooner: each clipped second is that share of a GCD,
// worth a Lightning Bolt with overloads less the Flame Shock hit. A
// refresh the enemy (or the pull) didn't outlive the old DoT for costs the
// whole GCD. Only Flame Shock casts count, standing: Voltaic Blaze
// spreading Flame Shock costs nothing, and while moving no cast-time
// spell fits (position from the hits the player took, over 2 yd/s).
// Measured 5–64k a pull; more for a player who refreshes often or early.
//
// ── Overcharge overwritten (overchargeRefreshed) ───────────────────────
// The Midnight season 2 tier set's Overcharge! (1300222) makes the next
// spender free: Elemental Blasts with it paid 0.4 Maelstrom on average,
// without it 90 (247 vs 240 casts, outside Ascendance); it doesn't raise
// the hit (170k vs 170k non-crit). It doesn't stack: after a refresh
// while up, one free Elemental Blast follows and the next pays 90
// (Cocroach Entombed Sentinels Pull 3, 2:19–2:25). So a refresh while up
// loses a free spender, worth the next spender that paid Maelstrom
// (its damage with overloads; Earthquake at the player's average). Not
// counted: a refresh landing within OVERCHARGE_SEEN_MS of the proc or by a
// cast begun before it, and one with no paid spender left in the pull.
// WoWAnalyzer only counts the refreshes. Cocroach 6 in 12 pulls (1.69M);
// top players none (Shaziggla's one was a cast already under way).

import type { PlayerEvent } from "@/types/PlayerInfo";
import type { DamageFinding, JobCheck, Moment } from "../../types";
import { DELAY_FINDING_MS, GCD_TOLERANCE_MS, finding, type PlayerCheckContext } from "../../checks";
import { gcdLockMs, mergeWindows, overlapMs, type Window } from "../../timeline";
import { k, s, statusWindows } from "./shared";

const ASCENDANCE = 1219480;
const VOLTAIC_BLAZE = 470057;
const PURGING_FLAMES = 1259491;
const LAVA_BURST = 51505;
const FLAME_SHOCK = 188389;
const FLAME_SHOCK_DEBUFFS = new Set([188389, 470411]);
const FLAME_SHOCK_MS = 18_000;
const PANDEMIC_MS = 0.3 * FLAME_SHOCK_MS;
const OVERLOADING = new Set(["Lightning Bolt", "Lava Burst", "Chain Lightning", "Elemental Blast", "Earthquake"]);
const NO_OVERLOAD: Record<number, string> = { 188389: "Flame Shock", 196840: "Frost Shock", 470057: "Voltaic Blaze" };   // Frost Shock from Vr8dLPtFYWA4G1yg
const VB_RECHARGE_MS = 7_500;
const FILLER_AFTER_MS = 30_000;
const UNSHOCKED_DIES_MS = 5_000;
const CALL_OF_THE_ANCESTORS = 447244;
const ANCESTOR_LAG_MS = 1_500;
const ANCESTOR_MIN_CASTS = 10;
const MASTER_OF_THE_ELEMENTS = 260734;
const LAVA_SURGE = 77762;
const MAELSTROM = 11;   // WCL classResources type
const SPENDERS = new Set(["Elemental Blast", "Earthquake"]);
// Non-crit Elemental Blast hits, buffed vs unbuffed at the cast, pooled over
// the eight players' pulls above (212 vs 82 hits, 192.6k vs 180.9k). A pull
// has too few to read it: the hits' aura snapshot gave 0.35–1.14.
const MOTE_BONUS = 0.065;
// Lava Surge that appeared this soon before the spender wasn't seen in time.
const SURGE_REACT_MS = 500;
const STORMKEEPER = 191634;
// The Ancestors' casts that answer one of the player's land this soon after it.
const ECHO_MS = 1_700;
const MOVING_YD_S = 2;
// A refresh this close to the pandemic point is press timing.
const CLIP_SLACK_MS = 500;
const OVERCHARGE = 1300222;
// A refresh by a cast begun within OVERCHARGE_REACT_MS of the proc, or
// landing within OVERCHARGE_SEEN_MS of it, came before the player could react.
const OVERCHARGE_REACT_MS = 300;
const OVERCHARGE_SEEN_MS = 700;

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const inside = (ws: Window[], t: number) => ws.some((w) => t >= w.startMs && t <= w.endMs);
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : NaN);
const baseName = (n: string) => n.replace(/ Overload$/, "");

/** The player's presses before the pull's end: one per spell per instant (a press can log under two ids). */
function presses(ctx: PlayerCheckContext): PlayerEvent[] {
  const out: PlayerEvent[] = [];
  for (const c of [...ctx.player.casts].filter((c) => !c.fake && c.timestamp < ctx.endMs).sort((a, b) => a.timestamp - b.timestamp)) {
    if (out.some((p) => p.abilityName === c.abilityName && c.timestamp - p.timestamp < 100)) continue;
    out.push(c);
  }
  return out;
}

type Tools = {
  casts: PlayerEvent[];
  /** The time a cast took: its cast time, or for an instant the player's GCD then (idle after it is the gap check's). */
  used(c: PlayerEvent): number;
  /** A cast's own direct hits (its overloads included) over the next `ms`. */
  damage(c: PlayerEvent, ms: number): number;
};

function tools(ctx: PlayerCheckContext): Tools {
  const casts = presses(ctx);
  const begins = ctx.player.beginCasts ?? [];
  const direct = ctx.player.damageDone.filter((e) => !e.pet && !e.isDoT);
  return {
    casts,
    used(c) {
      const b = begins.filter((x) => x.abilityId === c.abilityId && x.timestamp <= c.timestamp && c.timestamp - x.timestamp < 5_000).pop();
      const gcd = ctx.baseGcdMs / ctx.factor * ctx.factorAt(c.timestamp);
      return b && c.timestamp - b.timestamp > gcd ? c.timestamp - b.timestamp : gcd;
    },
    damage(c, ms) {
      return direct.filter((e) => e.timestamp >= c.timestamp && e.timestamp < c.timestamp + ms && baseName(e.abilityName) === c.abilityName)
        .reduce((a, e) => a + (e.amount ?? 0), 0);
    },
  };
}

/** The player's Flame Shock on each enemy (target.instance → windows), from the enemy debuff events. */
function flameShockWindows(ctx: PlayerCheckContext): Map<string, Window[]> {
  const out = new Map<string, Window[]>();
  const open = new Map<string, number>();
  const events = (ctx.pull.bossDebuffs ?? []).filter((e) => FLAME_SHOCK_DEBUFFS.has(e.statusId) && e.sourceName === ctx.player.name)
    .sort((a, b) => a.timestamp - b.timestamp);
  for (const e of events) {
    const key = `${e.targetActorId}.${e.targetInstance ?? 1}`;
    if (e.status === "removed") {
      const st = open.get(key);
      if (st !== undefined) { out.set(key, [...(out.get(key) ?? []), { startMs: st, endMs: e.timestamp }]); open.delete(key); }
    } else if (!open.has(key)) open.set(key, e.timestamp);
  }
  for (const [key, st] of open) out.set(key, [...(out.get(key) ?? []), { startMs: st, endMs: Infinity }]);
  return out;
}

type FlameShockRefresh = { t: number; key: string; target: string; remainingMs: number; applied: boolean };

/** Every application and refresh of the player's Flame Shock, with the time the old DoT had left (pandemic: 30% carries over). */
function flameShockRefreshes(ctx: PlayerCheckContext): FlameShockRefresh[] {
  const expires = new Map<string, number>();
  const out: FlameShockRefresh[] = [];
  const events = (ctx.pull.bossDebuffs ?? []).filter((e) => FLAME_SHOCK_DEBUFFS.has(e.statusId) && e.sourceName === ctx.player.name)
    .sort((a, b) => a.timestamp - b.timestamp);
  for (const e of events) {
    const key = `${e.targetActorId}.${e.targetInstance ?? 1}`;
    if (e.status === "removed") { expires.delete(key); continue; }
    const old = expires.get(key);
    if (e.status === "applied" || old === undefined) {
      out.push({ t: e.timestamp, key, target: e.targetName, remainingMs: 0, applied: e.status === "applied" });
      expires.set(key, e.timestamp + FLAME_SHOCK_MS);
    } else {
      const rem = Math.max(0, old - e.timestamp);
      out.push({ t: e.timestamp, key, target: e.targetName, remainingMs: rem, applied: false });
      expires.set(key, e.timestamp + FLAME_SHOCK_MS + Math.min(rem, PANDEMIC_MS));
    }
  }
  return out;
}

// ── Casts that can't overload, inside Ascendance ───────────────────────

const ascendanceNonOverload: JobCheck = (ctx) => {
  const wins = statusWindows(ctx, ASCENDANCE).filter((w) => w.endMs <= ctx.endMs);
  if (wins.length === 0) return [];
  const T = tools(ctx);
  const lbOut = T.casts.filter((c) => c.abilityName === "Lightning Bolt" && !inside(wins, c.timestamp));
  const lbPerCast = avg(lbOut.map((c) => T.damage(c, 1_200)));
  // The filler a moved cast displaces: Lightning Bolt, or Chain Lightning on
  // adds. Its rate from the player's own fillers in the FILLER_AFTER_MS after
  // the window (where the moved cast lands), else over the whole pull.
  const fillers = T.casts.filter((c) => (c.abilityName === "Lightning Bolt" || c.abilityName === "Chain Lightning") && !inside(wins, c.timestamp))
    .map((c) => ({ t: c.timestamp, v: T.damage(c, c.abilityName === "Lightning Bolt" ? 1_200 : 1_500), used: T.used(c) }));
  const rate = (xs: typeof fillers) => xs.reduce((a, x) => a + x.v, 0) / xs.reduce((a, x) => a + x.used, 0);
  if (fillers.length < 3 || !(lbPerCast > 0)) return [];
  const fillerPerMs = (w: Window) => {
    const near = fillers.filter((x) => x.t > w.endMs && x.t <= w.endMs + FILLER_AFTER_MS);
    return near.length >= 3 ? rate(near) : rate(fillers);
  };

  // Voltaic Blaze: its worth, its recharge, and whether it was being used on recharge.
  const vbs = T.casts.filter((c) => c.abilityId === VOLTAIC_BLAZE);
  const vbAvg = avg(vbs.map((c) => T.damage(c, 1_500)));
  const vbGaps = vbs.slice(1).map((c, i) => c.timestamp - vbs[i].timestamp);
  const recharge = vbGaps.length >= 2 ? Math.min(...vbGaps) : VB_RECHARGE_MS;
  // Lava Burst on one enemy, inside vs outside: what the window adds to a cleaved target.
  const lvbs = T.casts.filter((c) => c.abilityId === LAVA_BURST);
  const lvbByTarget = (c: PlayerEvent) => {
    const next = lvbs.find((x) => x.timestamp > c.timestamp)?.timestamp ?? Infinity;
    const by = new Map<string, number>();
    for (const e of ctx.player.damageDone) {
      if (e.pet || e.isDoT || baseName(e.abilityName) !== "Lava Burst" || e.timestamp < c.timestamp || e.timestamp >= Math.min(next, c.timestamp + 2_500)) continue;
      const key = `${e.targetActorId}.${e.targetInstance ?? 1}`;
      by.set(key, (by.get(key) ?? 0) + (e.amount ?? 0));
    }
    return [...by.values()].sort((a, b) => b - a);
  };
  const single = lvbs.map((c) => ({ c, v: lvbByTarget(c) })).filter((x) => x.v.length === 1);
  const lvbIn = single.filter((x) => inside(wins, x.c.timestamp)).map((x) => x.v[0]);
  const lvbOutAvg = avg(single.filter((x) => !inside(wins, x.c.timestamp)).map((x) => x.v[0]));
  const cleaveShare = lvbIn.length >= 3 && avg(lvbIn) > lvbOutAvg ? 1 - lvbOutAvg / avg(lvbIn) : 0;
  const pfUsed = (ctx.player.buffs ?? []).filter((b) => b.abilityId === PURGING_FLAMES && b.buffStatus === "removed").map((b) => b.timestamp);
  const refreshes = flameShockRefreshes(ctx);

  const out: DamageFinding[] = [];
  for (const w of wins) {
    const inWin = T.casts.filter((c) => c.timestamp >= w.startMs && c.timestamp <= w.endMs);
    const ovl = inWin.filter((c) => OVERLOADING.has(c.abilityName)).map((c) => ({ v: T.damage(c, 1_500), used: T.used(c) })).filter((x) => x.v > 0);
    const ovlUsed = ovl.reduce((a, x) => a + x.used, 0);
    if (ovl.length < 3 || ovlUsed <= 0) continue;
    const winPerMs = ovl.reduce((a, x) => a + x.v, 0) / ovlUsed;
    const lbPerMs = fillerPerMs(w);
    if (winPerMs <= lbPerMs) continue;
    const moments: Moment[] = [];
    let lost = 0;
    const notes: string[] = [];
    for (const c of inWin.filter((c) => NO_OVERLOAD[c.abilityId])) {
      const name = NO_OVERLOAD[c.abilityId];
      if (c.abilityId === FLAME_SHOCK) {
        const r = refreshes.filter((x) => Math.abs(x.t - c.timestamp) <= 250);
        if (r.length === 0 || r.some((x) => x.applied || x.remainingMs === 0 || x.t + x.remainingMs < w.endMs)) continue;
      }
      const used = T.used(c);
      const moved = (winPerMs - lbPerMs) * used;
      let back = 0;
      const why: string[] = [];
      if (c.abilityId === VOLTAIC_BLAZE) {
        const next = lvbs.find((x) => x.timestamp > c.timestamp);
        if (cleaveShare > 0 && next && next.timestamp <= w.endMs && pfUsed.some((t) => Math.abs(t - next.timestamp) <= 100)) {
          const extra = lvbByTarget(next).slice(1).reduce((a, x) => a + x, 0);
          if (extra > 0) { back += extra * cleaveShare; why.push(`its Purging Flames Lava Burst cleaved ${k(extra)} × ${Math.round(cleaveShare * 100)}% (the window's share)`); }
        }
        const prev = [...vbs].reverse().find((x) => x.timestamp < c.timestamp);
        if (prev && c.timestamp - prev.timestamp <= recharge + ctx.baseGcdMs && vbAvg > lbPerCast) {
          const share = Math.min(1, (w.endMs - c.timestamp) / recharge);
          back += share * (vbAvg - lbPerCast);
          why.push(`on recharge: holding it ${s(w.endMs - c.timestamp)} would cost ${Math.round(share * 100)}% of a use (${k(vbAvg)} − ${k(lbPerCast)} Lightning Bolt)`);
        }
      }
      // Under a tenth left after netting: paid back.
      const loss = Math.max(0, moved - back);
      if (loss < 0.1 * moved) continue;
      lost += loss;
      moments.push({ startMs: c.timestamp, endMs: c.timestamp, lostDamage: loss,
        detail: `${name} at ${clock(c.timestamp)}: ${k(moved)} moved out of the window${why.length ? `, less ${k(back)} (${why.join("; ")})` : ""}` });
      notes.push(name);
    }
    if (moments.length === 0) continue;
    const names = [...new Set(notes)].map((n) => `${notes.filter((x) => x === n).length} ${n}`).join(", ");
    out.push(finding(ctx, {
      kind: "burst-window", startMs: w.startMs, endMs: w.endMs, forced: false, inference: true,
      label: "Ascendance: casts that can't overload",
      lostDamage: lost,
      basis: `each cast's time × (${k(winPerMs * 1000)}/s from the window's overloading casts − ${k(lbPerMs * 1000)}/s from the player's Lightning Bolt / Chain Lightning after it), less what holding it would have cost`,
      detail: `Ascendance at ${clock(w.startMs)}: ${names} inside the window`,
      moments,
    }));
  }
  return out;
};

// ── Lava Burst without Flame Shock ─────────────────────────────────────

const lavaBurstUnshocked: JobCheck = (ctx) => {
  const fs = flameShockWindows(ctx);
  if (fs.size === 0) return [];
  const hits = ctx.player.damageDone.filter((e) => !e.pet && !e.isDoT && e.timestamp < ctx.endMs && (e.amount ?? 0) > 0);
  const keyOf = (e: PlayerEvent) => `${e.targetActorId}.${e.targetInstance ?? 1}`;
  const direct = hits.filter((e) => e.abilityName === "Lava Burst");
  // Each overload belongs to the latest Lava Burst on its enemy (Ascendance
  // fires them ~1s apart, so a fixed span would count one twice).
  const over = new Map<PlayerEvent, number>();
  for (const o of hits.filter((e) => e.abilityName === "Lava Burst Overload")) {
    const key = keyOf(o);
    const owner = direct.filter((e) => keyOf(e) === key && e.timestamp <= o.timestamp + 100 && o.timestamp - e.timestamp < 1_200).pop();
    if (owner) over.set(owner, (over.get(owner) ?? 0) + (o.amount ?? 0));
  }
  // Only the player's presses: Ascendance's own Lava Bursts at its cast aren't one.
  const pressed = ctx.player.casts.filter((c) => c.abilityId === LAVA_BURST).map((c) => c.timestamp);
  const rows = direct.filter((e) => pressed.some((t) => t <= e.timestamp && e.timestamp - t <= 1_500)).map((e) => {
    const key = keyOf(e);
    const shocked = (fs.get(key) ?? []).some((w) => e.timestamp >= w.startMs && e.timestamp <= w.endMs);
    return { e, key, shocked, crit: e.hitType === 2, v: (e.amount ?? 0) + (over.get(e) ?? 0) };
  });
  const shockedAvg = avg(rows.filter((r) => r.shocked).map((r) => r.v));
  if (!(shockedAvg > 0)) return [];
  // When each enemy last took a hit from anyone: an add that dies within seconds is excused.
  const lastHit = new Map<string, number>();
  for (const p of ctx.pull.players) for (const e of p.damageDone) {
    const key = keyOf(e);
    if (e.timestamp > (lastHit.get(key) ?? -1)) lastHit.set(key, e.timestamp);
  }
  const bad = rows.filter((r) => !r.shocked && !r.crit && r.v < shockedAvg)
    .filter((r) => (lastHit.get(r.key) ?? 0) > r.e.timestamp + UNSHOCKED_DIES_MS || r.e.timestamp + UNSHOCKED_DIES_MS >= ctx.endMs);
  if (bad.length === 0) return [];
  const moments = bad.map((r) => ({ startMs: r.e.timestamp, endMs: r.e.timestamp, lostDamage: shockedAvg - r.v,
    detail: `Lava Burst on ${r.e.target ?? "an enemy"} at ${clock(r.e.timestamp)} without Flame Shock: ${k(r.v)}, didn't crit` }));
  const lost = moments.reduce((a, m) => a + m.lostDamage, 0);
  return [finding(ctx, {
    kind: "wrong-gcd", startMs: bad[0].e.timestamp, endMs: bad[bad.length - 1].e.timestamp, forced: false,
    label: "Lava Burst without Flame Shock",
    lostDamage: lost,
    basis: `${bad.length} × (${k(shockedAvg)}, the player's Lava Burst with overloads on a Flame Shocked enemy, where it always crits − what it did)`,
    detail: `${bad.length} Lava Burst${bad.length > 1 ? "s" : ""} on an enemy without the player's Flame Shock (${[...new Set(bad.map((r) => r.e.target ?? "?"))].join(", ")})`,
    moments,
  })];
};

// ── Idle with the Ancestors out ────────────────────────────────────────

const ancestorIdle: JobCheck = (ctx) => {
  const wins = mergeWindows(statusWindows(ctx, CALL_OF_THE_ANCESTORS).filter((w) => w.startMs < ctx.endMs)
    .map((w) => ({ startMs: w.startMs, endMs: Math.min(w.endMs, ctx.endMs) })));
  if (wins.length === 0) return [];
  const uses = ctx.uses.filter((u) => u.startMs < ctx.endMs);
  const castsIn = uses.filter((u) => inside(wins, u.startMs)).length;
  // The Ancestors' casts land ~1s after the player's: count their hits to ANCESTOR_LAG_MS past the window.
  const ancestor = ctx.player.damageDone.filter((e) => e.pet === "Ancestor" && wins.some((w) => e.timestamp >= w.startMs && e.timestamp <= w.endMs + ANCESTOR_LAG_MS))
    .reduce((a, e) => a + (e.amount ?? 0), 0);
  if (castsIn < ANCESTOR_MIN_CASTS || ancestor <= 0) return [];
  const perCast = ancestor / castsIn;
  const excluded = mergeWindows([...ctx.forced, ...(ctx.movement ?? [])]);
  const moments: Moment[] = [];
  let idleMs = 0, lost = 0;
  for (let i = 0; i + 1 < uses.length; i++) {
    const from = uses[i].startMs + gcdLockMs(uses[i], ctx.factorAt(uses[i].startMs));
    const to = uses[i + 1].startMs - GCD_TOLERANCE_MS;
    if (to - from < DELAY_FINDING_MS) continue;
    let ms = 0;
    for (const w of wins) {
      const a = Math.max(from, w.startMs), b = Math.min(to, w.endMs);
      if (b > a) ms += b - a - overlapMs(a, b, excluded);
    }
    if (ms < DELAY_FINDING_MS) continue;
    const gcd = ctx.baseGcdMs / ctx.factor * ctx.factorAt(from);
    const v = ms / gcd * perCast;
    idleMs += ms; lost += v;
    moments.push({ startMs: from, endMs: to, lostDamage: v, detail: `${s(ms)} idle after ${uses[i].abilityName} at ${clock(from)} with the Ancestors out` });
  }
  if (moments.length === 0) return [];
  return [finding(ctx, {
    kind: "burst-window", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Idle with the Ancestors out",
    lostDamage: lost,
    basis: `${s(idleMs)} idle in Call of the Ancestors windows (outside forced time and movement) ÷ GCD × ${k(perCast)} of Ancestor damage per player GCD in the windows (${castsIn} GCDs); on top of the gap check's own GCD value`,
    detail: `${s(idleMs)} idle while the Ancestors were out (${moments.length} gaps): each GCD not cast is a round of Ancestor casts not cast`,
    moments,
  })];
};

// ── Spender without Master of the Elements, Lava Surge up ──────────────

/** The player's average damage per cast of a spell, its overloads included (Earthquake's hits run 6s+ and overlap). */
function perCast(ctx: PlayerCheckContext, name: string): number {
  const n = presses(ctx).filter((c) => c.abilityName === name).length;
  const dmg = ctx.player.damageDone.filter((e) => !e.pet && e.timestamp < ctx.endMs && baseName(e.abilityName) === name).reduce((a, e) => a + (e.amount ?? 0), 0);
  return n > 0 ? dmg / n : 0;
}

const spenderWithoutMote: JobCheck = (ctx) => {
  const T = tools(ctx);
  const asc = statusWindows(ctx, ASCENDANCE);
  const mote = statusWindows(ctx, MASTER_OF_THE_ELEMENTS);
  const surge = statusWindows(ctx, LAVA_SURGE);
  const moteUsed = (ctx.player.buffs ?? []).filter((b) => b.abilityId === MASTER_OF_THE_ELEMENTS && b.buffStatus === "removed").map((b) => b.timestamp).sort((a, b) => a - b);
  // Lava Burst's Maelstrom, measured: the next cast's amount (within 3s) − this one's after its cost, median.
  const res = (c: PlayerEvent) => c.resources?.find((r) => r.type === MAELSTROM);
  const gains = T.casts.flatMap((c, i) => {
    const a = res(c), next = T.casts[i + 1], b = next && res(next);
    if (c.abilityId !== LAVA_BURST || !a || !b || next.timestamp - c.timestamp > 3_000 || a.amount > a.max * 0.75) return [];
    const g = b.amount - (a.amount - (a.cost ?? 0));
    return g > 0 ? [g] : [];
  }).sort((a, b) => a - b);
  const lvbGain = gains.length >= 3 ? gains[Math.floor(gains.length / 2)] : undefined;
  const eqAvg = perCast(ctx, "Earthquake");
  const value = (c: PlayerEvent) => (c.abilityName === "Earthquake" ? eqAvg : T.damage(c, c.abilityName === "Chain Lightning" ? 1_500 : 1_200));
  const moments: Moment[] = [];
  let capped = 0;
  const takers = new Set<PlayerEvent>();
  for (const c of T.casts.filter((c) => SPENDERS.has(c.abilityName))) {
    const t = c.timestamp;
    if (inside(asc, t) || inside(mote, t)) continue;
    if (!surge.some((w) => t >= w.startMs + SURGE_REACT_MS && t <= w.endMs)) continue;
    const r = res(c);
    if (r && lvbGain !== undefined && r.amount + lvbGain > r.max) { capped++; continue; }
    // The buff it skipped went to whatever took the next one instead.
    const usedAt = moteUsed.find((x) => x > t + 100);
    const taker = usedAt === undefined ? undefined : T.casts.filter((x) => Math.abs(x.timestamp - usedAt) <= 150 && x.abilityName !== "Lava Burst" && ctx.game.action(x.abilityId)?.onGcd)[0];
    // One Lava Burst buffs one spender: two spenders in a row lost one buff.
    if (taker && (SPENDERS.has(taker.abilityName) || takers.has(taker))) continue;
    if (taker) takers.add(taker);
    const takerValue = taker ? value(taker) : 0;
    const loss = MOTE_BONUS * Math.max(0, value(c) - takerValue);
    if (loss < 1) continue;
    moments.push({ startMs: t, endMs: t, lostDamage: loss,
      detail: `${c.abilityName} at ${clock(t)} without Master of the Elements, Lava Surge up: the buff went to ${taker ? `${taker.abilityName} (${k(takerValue)})` : "nothing"} instead of ${k(value(c))}` });
  }
  if (moments.length === 0) return [];
  const lost = moments.reduce((a, m) => a + m.lostDamage, 0);
  return [finding(ctx, {
    kind: "wrong-gcd", startMs: moments[0].startMs, endMs: moments[moments.length - 1].startMs, forced: false, inference: true,
    label: "Spender before an instant Lava Burst",
    lostDamage: lost,
    basis: `${moments.length} × ${(MOTE_BONUS * 100).toFixed(1)}% (Master of the Elements, measured on Elemental Blast) × (the spender − the cast that took the buff instead)` +
      (capped ? `; ${capped} more excused: a Lava Burst first (+${lvbGain} Maelstrom) would have capped` : ""),
    detail: `${moments.length} Elemental Blast / Earthquake cast outside Ascendance with an instant Lava Burst ready and no Master of the Elements`,
    moments,
  })];
};

// ── Chain Lightning on one enemy ───────────────────────────────────────

const chainLightningOneTarget: JobCheck = (ctx) => {
  const T = tools(ctx);
  const asc = statusWindows(ctx, ASCENDANCE);
  const sk = statusWindows(ctx, STORMKEEPER);
  const anc = statusWindows(ctx, CALL_OF_THE_ANCESTORS);
  const fillers = T.casts.filter((c) => c.abilityName === "Lightning Bolt" || c.abilityName === "Chain Lightning");
  // The Ancestors answer a Lightning Bolt with Lava Bursts ~1s later, a Chain Lightning with their own at once.
  const echo = (c: PlayerEvent) => {
    const bolt = c.abilityName === "Lightning Bolt";
    const from = c.timestamp + (bolt ? 500 : -50), to = c.timestamp + (bolt ? ECHO_MS : 300);
    return ctx.player.damageDone.filter((e) => e.pet === "Ancestor" && e.abilityName === (bolt ? "Lava Burst" : "Chain Lightning") && e.timestamp >= from && e.timestamp <= to)
      .reduce((a, e) => a + (e.amount ?? 0), 0);
  };
  const rows = fillers.filter((c) => !inside(sk, c.timestamp)).map((c) => {
    const next = fillers.find((x) => x.timestamp > c.timestamp)?.timestamp ?? Infinity;
    const hits = ctx.player.damageDone.filter((e) => !e.pet && !e.isDoT && e.timestamp >= c.timestamp && e.timestamp < Math.min(next, c.timestamp + 1_500) && baseName(e.abilityName) === c.abilityName);
    const targets = new Set(hits.filter((e) => e.abilityName === c.abilityName).map((e) => `${e.targetActorId}.${e.targetInstance ?? 1}`)).size;
    return { c, targets, asc: inside(asc, c.timestamp), anc: inside(anc, c.timestamp), own: hits.reduce((a, e) => a + (e.amount ?? 0), 0), echo: echo(c) };
  });
  const bolts = rows.filter((r) => r.c.abilityName === "Lightning Bolt" && r.targets === 1);
  const boltAvg = (inAsc: boolean) => {
    const same = bolts.filter((r) => r.asc === inAsc);
    return avg((same.length >= 3 ? same : bolts).map((r) => r.own));
  };
  const boltEcho = avg(bolts.filter((r) => r.anc).map((r) => r.echo));
  const moments: Moment[] = [];
  for (const r of rows.filter((r) => r.c.abilityName === "Chain Lightning" && r.targets === 1)) {
    const lb = boltAvg(r.asc);
    if (!(lb > 0)) continue;
    const ancestors = r.anc && boltEcho > 0 ? Math.max(0, boltEcho - r.echo) : 0;
    const loss = Math.max(0, lb - r.own) + ancestors;
    if (loss < 1) continue;
    moments.push({ startMs: r.c.timestamp, endMs: r.c.timestamp, lostDamage: loss,
      detail: `Chain Lightning on ${r.c.target ?? "one enemy"} at ${clock(r.c.timestamp)}: ${k(r.own)} against a Lightning Bolt's ${k(lb)}` +
        (ancestors ? `, and the Ancestors' ${k(r.echo)} against ${k(boltEcho)}` : "") });
  }
  if (moments.length === 0) return [];
  return [finding(ctx, {
    kind: "aoe-single", startMs: moments[0].startMs, endMs: moments[moments.length - 1].startMs, forced: false,
    label: "Chain Lightning on one enemy",
    lostDamage: moments.reduce((a, m) => a + m.lostDamage, 0),
    basis: `${moments.length} × (the player's one-target Lightning Bolt with overloads, in or out of Ascendance as the cast was − the Chain Lightning)` +
      ` + with the Ancestors out, their casts after it against after a Lightning Bolt (${k(boltEcho)})`,
    detail: `${moments.length} Chain Lightning${moments.length > 1 ? "s" : ""} that hit one enemy`,
    moments,
  })];
};

// ── Flame Shock refreshed early ────────────────────────────────────────

/** Whether the player was moving at t, from the positions on hits they took (yards ÷ 100 per second). */
function movingAt(ctx: PlayerCheckContext, t: number): boolean | undefined {
  const pos = (ctx.player.damageTaken ?? []).filter((e) => e.x != null && e.y != null && Math.abs(e.timestamp - t) < 2_000)
    .sort((a, b) => a.timestamp - b.timestamp);
  if (pos.length < 2) return undefined;
  const a = pos[0], b = pos[pos.length - 1];
  const dt = (b.timestamp - a.timestamp) / 1000;
  if (dt <= 0.4) return undefined;
  return Math.hypot(b.x! - a.x!, b.y! - a.y!) / 100 / dt > MOVING_YD_S;
}

const flameShockEarly: JobCheck = (ctx) => {
  const T = tools(ctx);
  const fsCasts = T.casts.filter((c) => c.abilityId === FLAME_SHOCK);
  if (fsCasts.length === 0) return [];
  const vb = T.casts.filter((c) => c.abilityId === VOLTAIC_BLAZE).map((c) => c.timestamp);
  const fsHit = avg(ctx.player.damageDone.filter((e) => !e.pet && !e.isDoT && e.abilityId === FLAME_SHOCK).map((e) => e.amount ?? 0));
  const lb = avg(T.casts.filter((c) => c.abilityName === "Lightning Bolt").map((c) => T.damage(c, 1_200)));
  const gcdWorth = Math.max(0, lb - (fsHit || 0));
  if (!(gcdWorth > 0)) return [];
  const removals = (ctx.pull.bossDebuffs ?? []).filter((e) => FLAME_SHOCK_DEBUFFS.has(e.statusId) && e.sourceName === ctx.player.name && e.status === "removed");
  const moments: Moment[] = [];
  let moving = 0;
  const seen = new Set<PlayerEvent>();
  for (const r of flameShockRefreshes(ctx)) {
    if (r.applied || r.remainingMs <= PANDEMIC_MS + CLIP_SLACK_MS || r.t >= ctx.endMs) continue;
    const cast = fsCasts.find((c) => Math.abs(c.timestamp - r.t) <= 250);
    if (!cast || seen.has(cast) || vb.some((t) => Math.abs(t - r.t) <= 250)) continue;
    seen.add(cast);
    if (movingAt(ctx, r.t) === true) { moving++; continue; }
    // Never needed: the enemy (or the pull) was gone before the old DoT ran out.
    const gone = removals.find((e) => `${e.targetActorId}.${e.targetInstance ?? 1}` === r.key && e.timestamp > r.t)?.timestamp ?? ctx.endMs;
    const unneeded = gone <= r.t + r.remainingMs + 500;
    const clipped = r.remainingMs - PANDEMIC_MS;
    const loss = unneeded ? gcdWorth : clipped / FLAME_SHOCK_MS * gcdWorth;
    moments.push({ startMs: r.t, endMs: r.t, lostDamage: loss,
      detail: unneeded
        ? `Flame Shock on ${r.target} at ${clock(r.t)} with ${s(r.remainingMs)} left, gone ${s(gone - r.t)} later: a whole GCD`
        : `Flame Shock on ${r.target} at ${clock(r.t)} with ${s(r.remainingMs)} left: ${s(clipped)} clipped past the pandemic` });
  }
  if (moments.length === 0) return [];
  return [finding(ctx, {
    kind: "dot-clip", startMs: moments[0].startMs, endMs: moments[moments.length - 1].startMs, forced: false, inference: true,
    label: "Flame Shock refreshed early",
    lostDamage: moments.reduce((a, m) => a + m.lostDamage, 0),
    basis: `clipped seconds past the ${s(PANDEMIC_MS)} pandemic ÷ ${s(FLAME_SHOCK_MS)} × ${k(gcdWorth)} (a Lightning Bolt with overloads − the Flame Shock hit); the whole of it when the enemy or pull was gone before the old DoT ran out` +
      (moving ? `; ${moving} more while moving, not counted` : ""),
    detail: `${moments.length} Flame Shock cast${moments.length > 1 ? "s" : ""} with more than ${s(PANDEMIC_MS)} left, standing`,
    moments,
  })];
};

// ── Overcharge refreshed ───────────────────────────────────────────────

const overchargeRefreshed: JobCheck = (ctx) => {
  const ev = (ctx.player.buffs ?? []).filter((b) => b.abilityId === OVERCHARGE && b.timestamp < ctx.endMs).sort((a, b) => a.timestamp - b.timestamp);
  if (!ev.some((b) => b.buffStatus === "refreshed")) return [];
  const T = tools(ctx);
  const begins = ctx.player.beginCasts ?? [];
  const eqAvg = perCast(ctx, "Earthquake");
  const value = (c: PlayerEvent) => (c.abilityName === "Earthquake" ? eqAvg : T.damage(c, 1_200));
  const costed = T.casts.filter((c) => SPENDERS.has(c.abilityName) && (c.resources?.find((r) => r.type === MAELSTROM)?.cost ?? 0) > 0);
  const moments: Moment[] = [];
  let since: number | undefined, late = 0;
  for (const b of ev) {
    if (b.buffStatus === "applied") { since = b.timestamp; continue; }
    if (b.buffStatus === "removed") { since = undefined; continue; }
    if (b.buffStatus !== "refreshed" || since === undefined) continue;
    // The cast that refreshed it began before the proc could be seen.
    const by = T.casts.find((c) => Math.abs(c.timestamp - b.timestamp) <= 150 && ctx.game.action(c.abilityId)?.onGcd);
    const began = by && begins.filter((x) => x.abilityId === by.abilityId && x.timestamp <= by.timestamp && by.timestamp - x.timestamp < 5_000).pop()?.timestamp;
    if (b.timestamp - since < OVERCHARGE_SEEN_MS || (began !== undefined && began < since + OVERCHARGE_REACT_MS)) { late++; since = b.timestamp; continue; }
    // Worth the spender it would have paid for: the next one that paid
    // Maelstrom. None after it (the pull ended): nothing to buy.
    const paid = costed.find((c) => c.timestamp > b.timestamp);
    const v = paid ? value(paid) : 0;
    if (!(v > 0)) { since = b.timestamp; continue; }
    moments.push({ startMs: since, endMs: b.timestamp, lostDamage: v,
      detail: `Overcharge from ${clock(since)} refreshed at ${clock(b.timestamp)} by ${by?.abilityName ?? "a cast"} before a spender took it: a free ${paid?.abilityName ?? "spender"} lost (${k(v)})` });
    since = b.timestamp;
  }
  if (moments.length === 0) return [];
  return [finding(ctx, {
    kind: "proc-lost", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Overcharge overwritten",
    lostDamage: moments.reduce((a, m) => a + m.lostDamage, 0),
    basis: `${moments.length} × the spender the lost proc would have paid for (the next one that cost Maelstrom: its damage with overloads; an Earthquake at the player's average)` +
      (late ? `; ${late} more refreshed by a cast already under way when it came, not counted` : ""),
    detail: `Overcharge (a free spender) refreshed ${moments.length} time${moments.length > 1 ? "s" : ""} while up`,
    moments,
  })];
};

export const ELEMENTAL_CHECKS: JobCheck[] = [ascendanceNonOverload, lavaBurstUnshocked, ancestorIdle, spenderWithoutMote, chainLightningOneTarget, flameShockEarly, overchargeRefreshed];
