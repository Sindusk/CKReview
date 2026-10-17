// lib/damage/wow/specs/assassination.ts
//
// Assassination Rogue's own checks, beside the shared ones melee.ts gives
// it (the Kingsbane window, Energy at the cap) and the tracked Kingsbane,
// Deathmark and Vanish cooldowns (tracked-cooldowns.ts; Vanish valued by
// the Garrote it empowers). Built in the WoWAnalyzer audit's phase 3
// (docs/wowa-audit/rogue-assassination.md), every rule valued as damage
// lost. WoWAnalyzer's Assassination is `stale` (12.0.0, partly maintained),
// so each rule was tested against the log before its source. Measured
// 2026-10-17 on the 46 Assassination player-pulls on disk, all Mythic: the
// top parses 遗伤 (v6NnRz4KDtYCJ3Mw, Vashnik 100th), Ireath
// (z8rQ23NBy4LwM6PZ, 99.8th), Kvá (yQ1DNYpG7XFZMzk2, 99.4th), Lokistar
// (ZC7YNpr2HVQLtjv1, Entombed Sentinels 100th), all four fetched for
// this pass, Auxeus (ACmXHMFtaPLR9k8w, 99th) and
// 무법은장식 (aZ6NnwL8g9PdpGJ1, 98th); mid-table Entombed Sentinels and
// Vashnik kills (Loobster, Paprze, Mischíef, Vro, Misshides, Gustenrogue,
// Калимист, Izanami ×2, Domirogue, Sellathurus, Natvg, 欧先森, 风从哪里来,
// 盗拾六, Demo, Morllinor, Flyce, 自然死亡); the weaker Vallkillgash,
// Hofix, Antilyr, Shiddlesz; and the static's Nearby (16 pulls on seven
// bosses, gVDPhzp61Zm29HMw, and the case study qpZx3mWaG7gcDdYB). Spell
// ids are from those logs' masterData.
//
// Talents (from casts, buffs and hits; every one of the 46): Fatebound
// (Fatebound Coin casts and buffs), Deathmark, Kingsbane, Improved
// Garrote (392401 / 392403 after stealth), Implacable Strikes, Crimson
// Tempest as a 60-Energy builder that applies Garrote to the enemies it
// hits (its casts log Energy only; Auxeus 0:01.4 put a Garrote on the
// second Sentinel), combo points to 7 (type 4, logged on finishers only).
// Nobody takes Subterfuge or Blindside (no buff, no Ambush outside two
// Vanishes) or Echoing Reprimand. Shiv is pressed by 27 of 46.
//
// Bleed durations, from the enemy debuff stream (spans applied →
// removed that no refresh or death cut short): Rupture 4 × (combo points
// + 1) seconds (5 points 24.0s, 7 points 32.0s), Garrote 24.0s, and a
// refresh carries over up to 30% of the new duration (the longest spans
// are 31.2, 36.4 and 41.6s = 1.3 × 24, 28 and 32). A refresh never
// shortens one: Flyce (zdyhBj7pxWG6A8QZ) pressed a 1-point Rupture over a
// 7-point one at 3:51.6, and it ran on to his 4:25.6 refresh.
// WoWAnalyzer's Garrote model (18s) is out of date.
//
// ── Rupture / Garrote off every enemy (bleedGaps) ──────────────────────
// A bleed that was on no enemy, from the player's first press after it
// fell off (a target that died: the walk to the next isn't counted) to
// the next application, less forced time, movement, the pull's last
// TAIL_MS and the GCD the reapplication takes. Lost = that time × (the
// bleed's damage per second on one enemy this pull − what the resources
// of the press it saves were worth: a Rupture's combo points as Envenom at
// the player's damage per point, over its duration; a Garrote's 45 Energy
// as Mutilate, its two points included, over 24s; ~3k/s against a
// ~20k/s Garrote, ~7k/s against a ~20–26k/s Rupture). Envenom's poison
// buff isn't in that price, so it runs a little high.
// Measured (lost a pull): top 遗伤, Kvá, Lokistar, Auxeus, 무법은장식,
// Loobster none; Ireath 20k (Garrote, 1:14). Mid and weak: Demo
// (8AFnLQKdrcgawzDC) 315k (Garrote off 18.1s in four gaps, 7.4s of it
// 5:30–5:39), Antilyr (r9CX1kpRGLmKJH4M) 223k (Rupture off 5:12–5:28),
// Natvg 198k, 欧先森 88k, Domirogue 93k, Vallkillgash 60k; Nearby 0–164k
// on his 16 pulls (Nek'zali Pull 2 164k; 10 of 16 none). Everyone keeps the
// bleeds up well, so this is a small loss. The shared dotUptimeFindings
// (any gap past one GCD + 1s, at the whole bleed rate, the tail and the
// walk from a dead target counted) read up to 1.44M (Vallkillgash: the
// last 20s after Blood of Ula'tek died) and flagged Lokistar 176k in the
// kill's last 5s; it isn't used.
//
// ── Rupture refreshed early (ruptureClipped) ───────────────────────────
// A Rupture pressed on an enemy whose Rupture had more left than the 30%
// the new one can carry over: the excess (at most the new one's whole
// duration, since a refresh never shortens it) is time the new Rupture's
// resources paid for and lost. Counted per refresh past CLIP_ALLOW_MS,
// from OPENER_MS (the opener reapplies at more points: Kvá's 0:10).
// Lost = the excess ÷ the new Rupture's duration × (its combo points as
// Envenom at the player's damage per point + its 25 Energy as Mutilate).
// Measured (lost a pull): top 遗伤, Ireath, Kvá, Lokistar, 무법은장식
// none; Auxeus 90k (4:14: 7 points with 20.3s left, 10.7s wasted),
// Loobster 111k (2:36). Mid and weak: Antilyr 457k (eight, 67s; a 1-point
// Rupture at 0:24 over one with 34.8s left), Vro (xN9cWhzbvqTVfrG8) 435k
// (three in 15s on Blood of Ula'tek, 4:09–4:24), 欧先森 280k, Flyce 202k
// (two 1-point Ruptures pressed a second after a 7-point one), Sellathurus
// 186k, Hofix 175k, 盗拾六 175k; Nearby 0–260k (Vashnik Pull 4 260k, 6 of
// 16 none).
//
// ── Measured and not built ─────────────────────────────────────────────
// - Improved Garrote overwritten (an ordinary Garrote over one pressed in
//   stealth): 0–18s of it a pull, top players too (무법은장식 17.7s: 2:32,
//   pressed while the boss took ~500-damage ticks). Its price can't be
//   separated from Deathmark: the Vanish Garrote sits in Deathmark, so the
//   player's improved vs ordinary rate (48k vs 15k/s) is mostly the window,
//   and a trial priced 무법은장식 at 591k.
// - Ordinary Garrote over ordinary: past the opener's Improved Garrote
//   re-press (every top player re-presses within the 6s buff), 0–10s a pull
//   for the top players and ~20s at most (Hofix), at ~3k a second.
// - Combo points at the cap (shared.ts spenderSnapshotWaste on type 4):
//   top Vashnik players read 5–6% (遗伤 2.38M, Ireath 1.54M, Kvá 1.60M),
//   Entombed Sentinels top 1–4% (Auxeus 571k, Loobster 812k), the weaker
//   1–2% (Nearby 309k, Hofix 538k) save Antilyr 15% (4.05M). Seal Fate's
//   crit points and the cleave builders make the fit noisy (Sprint 3.7,
//   Cloak of Shadows 2.7 "points"), and it fires on the top players as much.
// - Envenom below the cap: top players finish at 5 points 12–33% of the
//   time (遗伤 11 of 95, Auxeus 22 of 66), the weaker 5–28% (Hofix 3 of 56);
//   below 5 points almost never. No signal.
// - Fan of Knives on one enemy: 0–8 presses a pull at ~12k against
//   Mutilate's ~19k and two points (~13k a press). On two enemies it beats
//   Mutilate per Energy (~23k and two points for 35 Energy), so the rule's
//   two-target line holds; nobody takes Blindside for its three.

import type { PlayerEvent } from "@/types/PlayerInfo";
import type { DamageFinding, JobCheck, Moment } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { mergeWindows, overlapMs } from "../../timeline";
import { k, s } from "./shared";

const RUPTURE = 1943;
const GARROTE = 703;
const ENVENOM = 32645;
const MUTILATE = 1329;
const MUTILATE_HITS = [5374, 27576];   // main-hand, off-hand
const CP = 4;   // combo points' resource type
const ENERGY = 3;

const GARROTE_MS = 24_000;
const PANDEMIC = 0.3;
const TAIL_MS = 10_000;
const MIN_GAP_MS = 500;
const CLIP_ALLOW_MS = 1_000;
const OPENER_MS = 20_000;
const LINK_MS = 120;
const MIN_LOST = 1_000;

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const median = (xs: number[]) => {
  const v = [...xs].sort((a, b) => a - b);
  return v.length ? v[Math.floor(v.length / 2)] : NaN;
};
const ruptureMs = (cp: number) => 4_000 * (cp + 1);

/** One press per spell per instant, before the pull's end. */
function presses(ctx: PlayerCheckContext, id: number): PlayerEvent[] {
  const out: PlayerEvent[] = [];
  for (const c of ctx.player.casts.filter((c) => !c.fake && c.abilityId === id && c.timestamp < ctx.endMs).sort((a, b) => a.timestamp - b.timestamp)) {
    if (out.length && c.timestamp - out[out.length - 1].timestamp < 100) continue;
    out.push(c);
  }
  return out;
}

const cpOf = (c: PlayerEvent) => c.resources?.find((r) => r.type === CP)?.amount;
const energyCost = (c: PlayerEvent) => c.resources?.find((r) => r.type === ENERGY)?.cost;

/** The player's damage per combo point spent on Envenom (its own hits). */
function envenomPerCp(ctx: PlayerCheckContext): number {
  const cps = presses(ctx, ENVENOM).reduce((a, c) => a + (cpOf(c) ?? 0), 0);
  const dmg = ctx.player.damageDone.filter((e) => !e.pet && e.abilityId === ENVENOM && e.timestamp < ctx.endMs).reduce((a, e) => a + (e.amount ?? 0), 0);
  return cps > 0 ? dmg / cps : 0;
}

/** The player's Mutilate per Energy, its two combo points valued as Envenom. */
function mutilatePerEnergy(ctx: PlayerCheckContext, perCp: number): number {
  const ms = presses(ctx, MUTILATE);
  if (ms.length === 0) return 0;
  const dmg = ctx.player.damageDone.filter((e) => !e.pet && MUTILATE_HITS.includes(e.abilityId) && e.timestamp < ctx.endMs).reduce((a, e) => a + (e.amount ?? 0), 0);
  const cost = median(ms.map(energyCost).filter((x): x is number => x !== undefined)) || 50;
  return (dmg / ms.length + 2 * perCp) / cost;
}

type Span = { key: string; startMs: number; endMs: number };

/** The bleed's spans per enemy (applied → removed), from the enemy debuff stream. */
function bleedSpans(ctx: PlayerCheckContext, id: number): Span[] {
  const ev = (ctx.pull.bossDebuffs ?? []).filter((e) => e.statusId === id && e.sourceName === ctx.player.name && e.timestamp < ctx.endMs)
    .sort((a, b) => a.timestamp - b.timestamp);
  const open = new Map<string, number>();
  const out: Span[] = [];
  for (const e of ev) {
    const key = `${e.targetActorId}.${e.targetInstance ?? 1}`;
    if (e.status === "removed") {
      const st = open.get(key);
      if (st !== undefined) { out.push({ key, startMs: st, endMs: e.timestamp }); open.delete(key); }
    } else if (!open.has(key)) open.set(key, e.timestamp);
  }
  for (const [key, st] of open) out.push({ key, startMs: st, endMs: ctx.endMs });
  return out;
}

// ── Rupture / Garrote off every enemy ──────────────────────────────────

function bleedGaps(ctx: PlayerCheckContext, id: number, name: string, saved: { perMs: number; basis: string }): DamageFinding[] {
  const spans = bleedSpans(ctx, id);
  if (spans.length === 0) return [];
  const targetMs = spans.reduce((a, w) => a + w.endMs - w.startMs, 0);
  const dmg = ctx.player.damageDone.filter((e) => !e.pet && e.abilityId === id && e.timestamp < ctx.endMs).reduce((a, e) => a + (e.amount ?? 0), 0);
  const ratePerMs = targetMs > 0 ? dmg / targetMs : 0;
  const netPerMs = ratePerMs - saved.perMs;
  if (!(netPerMs > 0)) return [];
  const active = mergeWindows(spans);
  const excluded = mergeWindows([...ctx.forced, ...(ctx.movement ?? []), { startMs: ctx.endMs - TAIL_MS, endMs: ctx.endMs }]);
  const casts = ctx.player.casts.filter((c) => !c.fake).map((c) => c.timestamp).sort((a, b) => a - b);
  const moments: Moment[] = [];
  let lostMs = 0;
  const gap = (off: number, on: number, tail: boolean) => {
    // From the first press after it fell off, less the press that reapplies it.
    const from = casts.find((t) => t >= off) ?? off;
    if (from >= on) return;
    const len = on - from - overlapMs(from, on, excluded) - ctx.baseGcdMs;
    if (len < MIN_GAP_MS) return;
    lostMs += len;
    moments.push({ startMs: off, endMs: on, lostDamage: len * netPerMs,
      detail: tail ? `${name} off every enemy from ${clock(off)}, not reapplied: ${s(len)} counted` : `${name} off every enemy ${clock(off)}–${clock(on)}: ${s(len)} counted` });
  };
  for (let i = 0; i + 1 < active.length; i++) gap(active[i].endMs, active[i + 1].startMs, false);
  const last = active[active.length - 1];
  if (last.endMs < ctx.endMs - TAIL_MS) gap(last.endMs, ctx.endMs, true);
  if (moments.length === 0 || lostMs * netPerMs < MIN_LOST) return [];
  return [finding(ctx, {
    kind: "dot-uptime", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: `${name} off every enemy`,
    lostDamage: lostMs * netPerMs,
    basis: `${s(lostMs)} × (${k(ratePerMs * 1000)}/s, ${name}'s damage per second on one enemy this pull, − ${k(saved.perMs * 1000)}/s, ${saved.basis})`,
    detail: `${name} wasn't on any enemy for ${s(lostMs)} (${moments.length} gap${moments.length > 1 ? "s" : ""}; past the GCD to reapply it, outside forced time, movement and the pull's last ${s(TAIL_MS)})`,
    moments,
  })];
}

const bleedsOff: JobCheck = (ctx) => {
  const perCp = envenomPerCp(ctx);
  const perEnergy = mutilatePerEnergy(ctx, perCp);
  const rupCps = presses(ctx, RUPTURE).map(cpOf).filter((x): x is number => x !== undefined);
  const cp = rupCps.length ? rupCps.reduce((a, x) => a + x, 0) / rupCps.length : 6;
  return [
    ...bleedGaps(ctx, RUPTURE, "Rupture", {
      perMs: (perCp * cp + 25 * perEnergy) / ruptureMs(cp),
      basis: `the Envenom its ${cp.toFixed(1)} combo points and the Mutilate its 25 Energy would have been, over its ${s(ruptureMs(cp))}`,
    }),
    ...bleedGaps(ctx, GARROTE, "Garrote", {
      perMs: 45 * perEnergy / GARROTE_MS,
      basis: `the Mutilate its 45 Energy would have been, over its ${s(GARROTE_MS)}`,
    }),
  ];
};

// ── Rupture refreshed early ────────────────────────────────────────────

const ruptureClipped: JobCheck = (ctx) => {
  const perCp = envenomPerCp(ctx);
  const perEnergy = mutilatePerEnergy(ctx, perCp);
  if (!(perCp > 0)) return [];
  const debuffs = (ctx.pull.bossDebuffs ?? []).filter((e) => e.sourceName === ctx.player.name && e.timestamp < ctx.endMs && e.statusId === RUPTURE)
    .sort((a, b) => a.timestamp - b.timestamp);
  const linked = (t: number, target: string) => ctx.player.casts.find((c) => !c.fake && c.abilityId === RUPTURE && Math.abs(c.timestamp - t) <= LINK_MS && c.target === target);
  const ends = new Map<string, number>();
  const moments: Moment[] = [];
  let clipMs = 0, clipLost = 0;
  for (const e of debuffs) {
    const key = `${e.targetActorId}.${e.targetInstance ?? 1}`;
    if (e.status === "removed") { ends.delete(key); continue; }
    const cast = linked(e.timestamp, e.targetName);
    const cp = cast ? cpOf(cast) : undefined;
    if (!cp) { ends.delete(key); continue; }   // spread, or no combo points logged: no duration to track
    const dur = ruptureMs(cp);
    const prevEnd = e.status === "refreshed" ? ends.get(key) : undefined;
    const left = prevEnd !== undefined ? Math.max(0, prevEnd - e.timestamp) : 0;
    const carry = Math.min(left, PANDEMIC * dur);
    // A refresh never shortens it (Flyce zdyhBj7pxWG6A8QZ 3:51.6: a 1-point Rupture over a 7-point one, still up at 4:25).
    ends.set(key, Math.max(prevEnd ?? 0, e.timestamp + dur + carry));
    const excess = Math.min(dur, left - carry);
    if (excess > CLIP_ALLOW_MS && e.timestamp >= OPENER_MS) {
      const cost = cp * perCp + (energyCost(cast!) ?? 25) * perEnergy;
      const lost = excess / dur * cost;
      clipMs += excess; clipLost += lost;
      moments.push({ startMs: e.timestamp, endMs: e.timestamp, lostDamage: lost,
        detail: `Rupture (${cp} points) at ${clock(e.timestamp)} on ${e.targetName} with ${s(left)} left: ${s(excess)} of its ${s(dur)} wasted (it carries over ${s(carry)})` });
    }
  }
  if (moments.length === 0 || clipLost < MIN_LOST) return [];
  return [finding(ctx, {
    kind: "dot-clip", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Rupture refreshed early",
    lostDamage: clipLost,
    basis: `${s(clipMs)} of Rupture paid for and overwritten (past the 30% carry-over) ÷ each Rupture's duration × (its combo points as Envenom at ${k(perCp)} a point + its Energy as Mutilate at ${(perEnergy / 1000).toFixed(2)}k an Energy)`,
    detail: `${moments.length} Rupture${moments.length > 1 ? "s" : ""} pressed with more left than ${moments.length > 1 ? "they" : "it"} can carry over, ${s(clipMs)} wasted (from ${clock(OPENER_MS)}; Rupture lasts 4s a combo point + 4s)`,
    moments,
  })];
};

export const ASSASSINATION_CHECKS: JobCheck[] = [bleedsOff, ruptureClipped];
