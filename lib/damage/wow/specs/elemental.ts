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

import type { PlayerEvent } from "@/types/PlayerInfo";
import type { DamageFinding, JobCheck, Moment } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import type { Window } from "../../timeline";
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

export const ELEMENTAL_CHECKS: JobCheck[] = [ascendanceNonOverload, lavaBurstUnshocked];
