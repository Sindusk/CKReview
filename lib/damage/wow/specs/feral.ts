// lib/damage/wow/specs/feral.ts
//
// Feral Druid's own checks and cooldown values, beside the shared ones
// melee.ts gives it (the Berserk window, Energy at the cap). Built in the
// WoWAnalyzer audit's phase 3 (docs/wowa-audit/druid-feral.md), every rule
// valued as damage lost. Measured 2026-10-17 on 14 Feral player-pulls of
// 13 players, all Mythic kills fetched for this pass: the top parses
// Catalyà and Orog (X618LRt7hPqzbVJj, Vashnik 100th), 万花通灵
// (yrFd7CYZvt6XAz3T, 99.3rd), Vydal (fh6bLKy12gzWvGCH, 98.6th), Scaricat
// (6Bpq1FmA9aH4WQxc, Entombed Sentinels 100th), Samarae (QFTXqD8VNKCvx9jf,
// 99.5th), 小奶酱丶 (RbhPKYWd6t1nAC3f, 94th, and the survey's Vashnik
// pull); the weaker Cheezywizzy (ZvrLTQfk1zbAXMwB, Vashnik 3rd and
// Entombed Sentinels 20th), Chesteria (C4Kxpn3FtrvjWMAP, 3rd), Lylyvienne
// (KB1a9CWc6pT4VGqA, 16th), Munchkinz (nhbCYHXRf1T2qAv9, 16th) and Tyger
// (RwxWC6PF2pJ7Zd9H, 18th). Spell ids are from those logs' masterData.
//
// Talents (from casts, buffs and hits): every one but Lylyvienne plays
// Wildstalker (Bloodseeker Vines, Bursting Growth); she plays Druid of the
// Claw (Ravage 441591). All take Circle of Life and Death (Rake's
// untouched span is 12.0s, not 15). Nobody takes Bloodtalons (no buff),
// Thrash, Brutal Slash or Chomp. Two builds: Berserk with Convoke the
// Spirits on one 120s cooldown (Convoke pressed ~2s after each Berserk)
// and Apex Predator's Craving (free Bites), or Incarnation (91s) without
// Convoke (Vydal, 小奶酱丶 on Vashnik, Lylyvienne). Lunar Inspiration
// (Moonfire 155625, pressed) on the Entombed Sentinels kills only; Primal
// Wrath and Swipe on Vashnik. Feral Frenzy on a 30s cooldown for all but
// Chesteria (none) and Lylyvienne (Frantic Frenzy, 1243807).
//
// ── Tracked cooldowns' value per use (tracked-cooldowns.ts) ────────────
// None of the four tracked cooldowns had one, so their drift never showed:
// Tiger's Fury and Berserk deal nothing themselves, Convoke's hits log
// under the spells it casts, Feral Frenzy's under 274838.
// - Tiger's Fury, Berserk, Incarnation (feralWindowValue): the window's
//   bonus from the player's direct non-crit hits (TF's outside Berserk,
//   Berserk's outside TF, against neither) × the damage done inside an
//   average window. TF read +12–27% (no Energy of its own: the cast after
//   it shows only regen, 6–19 Energy in 0.3–1.0s); its bleeds keep the
//   snapshot (Rip ×1.24, Rake ×1.21, Moonfire ×1.25, ticks after the
//   window, medians of 14 players) and that tail isn't counted. Per use:
//   TF 0.40–0.97M, Berserk (25s with the tier set) 1.08–2.49M,
//   Incarnation 1.64–1.94M.
// - Convoke (convokeValue): its direct hits in the ~4.3s channel, less the
//   player's direct-hit rate outside it: 0.67–1.39M a use.
// - Feral Frenzy (feralFrenzyValue): its own presses' hits in the 6s
//   after, less a GCD: 155–529k. A player who never presses it gets
//   nothing, though Convoke casts Frenzies under the same hit id.
// Re-measured cooldowns (shortest / median interval): TF 30.0 / 30.8s,
// Frenzy 30.0 / 32.4s, Convoke 120.0 / 125.5s (the survey's 61s was a
// build nobody here plays), Berserk 120.5 / 124.2s, Incarnation 91.1 /
// 92.1s (newly tracked).
// Measured (lost a pull): Feral Frenzy drift on Catalyà 600k (top: 11
// presses 35–41s apart, 61.6s held, two uses), Cheezywizzy 353k / 736k,
// Tyger 664k, Munchkinz 299k, none on the other top players; Tiger's Fury
// drift on Cheezywizzy's Vashnik kill only (397k, 26s held). Berserk,
// Incarnation and Convoke lose no whole use on anyone (Scaricat held
// Berserk and Convoke 35s once on Entombed Sentinels).
//
// Bleed durations, from the enemy debuff stream (spans no refresh or death
// cut short): Rip 0.8 × 4s × (combo points + 1) (5 points 19.2s), Primal
// Wrath's Rip 0.8 × 2s × (points + 1) (9.6s), Rake 12.0s, Moonfire 14.4s;
// a refresh carries over up to 30% of the new duration (longest spans
// 25.0, 15.6, 18.7s) and never shortens one. Every Rip a Rip press left
// alone ended within 50ms of that model: nothing else extends it.
//
// ── Rip off every enemy (ripOff) ───────────────────────────────────────
// Assassination's bleedGaps model (assassination.ts): Rip on no enemy,
// from the player's first press after it fell off to the next
// application, less forced time, movement, the pull's last TAIL_MS and the
// reapplying GCD. Lost = that time × (Rip's damage per second on one enemy
// this pull − what the Rip press's resources were worth: its combo points
// as Ferocious Bite at the player's damage per point (the Bite's hit and
// Rampant Ferocity's, paid Bites only, 20–44k a point) and its 20 Energy
// as Shred (Shred's hit plus a point as Bite, ÷ 40: 1.7–2.7k an Energy),
// over the Rip's duration). ~21–28k/s of Rip against ~6–10k/s of
// resources.
// Measured (lost a pull): every top player none. Weaker: Cheezywizzy
// (ZvrLTQfk1zbAXMwB) 241k on Vashnik (18.8s in five gaps, 3:27–3:35 the
// longest) and 80k on Entombed Sentinels, Tyger 126k (5:11–5:22), Chesteria
// 54k, Lylyvienne 47k. Everyone keeps Rip up; a small loss.
// Rake, judged the same way (its 35 Energy as Shred less its own hit and
// point), read 0.22–1.50M on three top players (Vydal fh6bLKy12gzWvGCH
// 88.6s off in 11 gaps, 4:32–5:03 the longest; 万花通灵 448k; 小奶酱丶
// 219k) against 0.01–0.27M on the weak: not built.
//
// ── Ferocious Bite below 5 points (biteLowPoints) ──────────────────────
// A paid Bite (not Apex Predator's Craving's free one, which spends
// nothing) below 5 combo points. Its damage is linear in the points spent,
// so the points aren't lost; the press's fixed cost is: its 25 Energy (the
// logged cost; the extra Energy it drains isn't logged, lenient) spread
// over fewer points. Lost = (5 − points) ÷ 5 × 25 Energy as Shred. A
// target that dies within DYING_MS (finishing an add) and the pull's last
// TAIL_MS aren't counted.
// Measured (lost a pull): top 0–3 a pull at 4 points (Vydal 37k: 0:37 and
// two on a Shrouded Venom at 3:14; Catalyà 27k; 小奶酱丶 12–22k; 万花通灵
// 13k), Orog, Scaricat and Samarae none. Weaker: Cheezywizzy 11 on
// Vashnik (332k: 1-point Bites on the boss at 1:10, 1:41 and 2:46 with
// 79–100 Energy), Chesteria 15 (286k, 3:17 one point with 111 Energy),
// Tyger 4 (84k), Cheezywizzy 5 on Entombed Sentinels (69k), Munchkinz 1
// (12k), Lylyvienne none.
//
// ── Measured and not built ─────────────────────────────────────────────
// - Rip refreshed early (past the 30% carry-over), valued like Rupture
//   (assassination.ts): top players clip as much as the weak. Vydal 13
//   presses, 89s paid for and overwritten (1.25M); 小奶酱丶 0.75 / 1.06M;
//   Catalyà 509k; Scaricat 305k; Samarae 41k. Weaker 0.14–1.02M
//   (Cheezywizzy Vashnik 1.02M, Tyger 475k). Mostly not a snapshot
//   upgrade (Tiger's Fury over a Rip without it: Vydal 12 of the 89s,
//   小奶酱丶 19–27s of 75–80s; Scaricat 28 of 30s the exception), and the
//   tick size after a clip doesn't rise (median ×0.94 over 42 clips).
// - Rip refreshed below 5 points (4 in Berserk): 0–4 a pull on the top
//   players, 0–6 on the weak, each worth the lost fraction of a 20-Energy
//   press (under 20k).
// - Rake refreshed early: same-snapshot excess 0–45s a pull on the top
//   players (小奶酱丶 45s, 万花通灵 39s), 6–112s on the weak (Cheezywizzy
//   112s, Lylyvienne 84s), ~7k a second (35 Energy as Shred over 12s): top
//   up to ~0.3M, weak up to ~0.8M; overlapping. Tiger's Fury downgrades
//   (a Rake without it over one with it, time left): top 0–8s, weak 0–20s.
//   Moonfire the same: top 0–26s, weak 31–52s.
// - Bite below 50 Energy: 0–5 paid Bites a pull on the top players
//   (Catalyà 5), 0–6 on the weak. The extra Energy is worth ~1.7k a point
//   to Bite (5-point Bites at 50+ Energy ~86k, ~43k at 25), against
//   1.4–2.7k as Shred depending on what a combo point is worth: unsettled.
// - Convoke outside Tiger's Fury: Catalyà 3 of 4 (top), others 0–1 of 3;
//   about the TF bonus on a ~1M Convoke (~150k). Convoke always inside
//   Berserk (24 of 24), so the Berserk pairing fires on nothing.
// - Feral Frenzy outside Tiger's Fury (Focused Frenzy): its hits do
//   ×1.3–1.6 inside TF (snapshot). Top 0–3 a pull, Cheezywizzy 6; none
//   pressed while TF was ready (TF came back 1.4–14.2s later), so each was
//   a hold of that long against ~100–200k: small either way.
// - Swipe / Primal Wrath on no enemy: none in 14 pulls; on one enemy 0–4.

import type { PlayerEvent, PlayerInfo } from "@/types/PlayerInfo";
import type { DamageFinding, JobCheck, Moment } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { mergeWindows, overlapMs, statusWindows, type Window } from "../../timeline";
import { k, s } from "./shared";

const RIP = 1079;
const RAKE = 155722;         // the bleed
const BITE = 22568;
const RAMPANT_FEROCITY = 391710;
const SHRED = 5221;
const APEX = 391882;         // Apex Predator's Craving: a free Bite
const CP = 4;                // combo points' resource type (logged on finishers only)
const ENERGY = 3;
const MAX_CP = 5;
const SHRED_ENERGY = 40;
const RIP_ENERGY = 20;
const BITE_ENERGY = 25;
const RIP_MS_PER_CP = 4_000;   // 4s a point + 4s, before Circle of Life and Death
const RAKE_MS = 15_000;
const BITE_LAND_MS = 400;
const LINK_MS = 50;
const TAIL_MS = 10_000;
const MIN_GAP_MS = 500;
const DYING_MS = 5_000;
const MIN_LOST = 1_000;
const CONVOKE = 391528;
const FERAL_FRENZY = 274837;
const FRENZY_HIT = 274838;
const FRENZY_SPAN_MS = 6_000;
const BONUS_CAP = 0.3;
const CONVOKE_LAND_MS = 300;

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const median = (xs: number[]) => { const v = [...xs].sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
const inAny = (ws: Window[], t: number) => ws.some((w) => t >= w.startMs && t <= w.endMs);

/**
 * One use of a damage window (Tiger's Fury, Berserk, Incarnation): what it
 * added to the player's hits. The bonus is read from the player's own
 * direct non-crit hits inside this window but outside `others`, against
 * hits outside both (per ability, weighted by hits inside), capped at
 * BONUS_CAP; the value is the damage done inside an average window ×
 * bonus ÷ (1 + bonus). Undefined for a player who never had the window.
 */
export function feralWindowValue(statusId: number, name: string, others: number[]) {
  return (player: PlayerInfo, endMs: number): { value: number; basis: string } | undefined => {
    const wins = statusWindows(player, new Set([statusId]), endMs).filter((w) => w.startMs < endMs);
    if (wins.length === 0) return undefined;
    const other = statusWindows(player, new Set(others), endMs);
    const by = new Map<number, { i: number[]; o: number[] }>();
    for (const e of player.damageDone) {
      if (e.pet || e.isDoT || e.hitType !== 1 || !e.unmitigatedAmount || e.timestamp >= endMs) continue;
      const inOther = inAny(other, e.timestamp), inThis = inAny(wins, e.timestamp);
      if (inOther && inThis) continue;
      const g = by.get(e.abilityId) ?? { i: [], o: [] };
      if (inThis) g.i.push(e.unmitigatedAmount); else if (!inOther) g.o.push(e.unmitigatedAmount);
      by.set(e.abilityId, g);
    }
    let sum = 0, n = 0;
    for (const g of by.values()) {
      if (g.i.length === 0 || g.o.length < 3) continue;
      sum += (median(g.i) / median(g.o) - 1) * g.i.length;
      n += g.i.length;
    }
    const bonus = n > 0 ? Math.min(BONUS_CAP, Math.max(0, sum / n)) : 0;
    if (bonus <= 0) return undefined;
    const dmg = player.damageDone.filter((e) => e.timestamp < endMs && inAny(wins, e.timestamp)).reduce((a, e) => a + (e.amount ?? 0), 0);
    const each = dmg / wins.length;
    const value = each * bonus / (1 + bonus);
    return {
      value,
      basis: `${k(value)} that an average ${name} added (${k(each)} done inside each of ${wins.length} windows, ` +
        `+${Math.round(bonus * 100)}% read from the player's own direct hits, capped at ${BONUS_CAP * 100}%)`,
    };
  };
}

/**
 * One Convoke the Spirits: the direct hits (no ticks, no melee swings, no
 * pet) landing in its channel, to CONVOKE_LAND_MS after it, less the
 * player's own direct-hit rate outside the channels over the same time.
 * The bleeds it lays tick on after it and aren't counted (lenient).
 */
export function convokeValue(player: PlayerInfo, endMs: number): { value: number; basis: string } | undefined {
  const wins = statusWindows(player, new Set([CONVOKE]), endMs).filter((w) => w.endMs <= endMs)
    .map((w) => ({ startMs: w.startMs, endMs: w.endMs + CONVOKE_LAND_MS }));
  if (wins.length === 0) return undefined;
  const direct = player.damageDone.filter((e) => !e.pet && !e.isDoT && e.abilityId !== 1 && e.timestamp < endMs);
  const inMs = wins.reduce((a, w) => a + w.endMs - w.startMs, 0);
  const inDmg = direct.filter((e) => inAny(wins, e.timestamp)).reduce((a, e) => a + (e.amount ?? 0), 0);
  const outRate = direct.filter((e) => !inAny(wins, e.timestamp)).reduce((a, e) => a + (e.amount ?? 0), 0) / Math.max(1, endMs - inMs);
  const value = (inDmg - inMs * outRate) / wins.length;
  if (!(value > 0)) return undefined;
  return {
    value,
    basis: `${k(value)} an average Convoke the Spirits (${k(inDmg / wins.length)} of direct hits in its ${(inMs / wins.length / 1000).toFixed(1)}s channel − ${k(inMs / wins.length * outRate)} at the player's direct-hit rate outside it)`,
  };
}

/**
 * One Feral Frenzy: its hits (FRENZY_HIT, a bleed) from each of the
 * player's own presses to the next or FRENZY_SPAN_MS, less the GCD it
 * took. Convoke the Spirits casts Frenzies too, under the same hit id; a
 * player who never presses it (Chesteria C4Kxpn3FtrvjWMAP: 485k of
 * Convoke Frenzy hits, no press) has no use to lose.
 */
export function feralFrenzyValue(player: PlayerInfo, endMs: number, gcdValue: number): { value: number; basis: string } | undefined {
  const casts = player.casts.filter((c) => !c.fake && c.abilityId === FERAL_FRENZY && c.timestamp < endMs).map((c) => c.timestamp).sort((a, b) => a - b);
  if (casts.length === 0) return undefined;
  const hits = player.damageDone.filter((e) => !e.pet && e.abilityId === FRENZY_HIT);
  const own = casts.reduce((a, t, i) => a + hits.filter((e) => e.timestamp >= t && e.timestamp < Math.min(casts[i + 1] ?? Infinity, t + FRENZY_SPAN_MS))
    .reduce((b, e) => b + (e.amount ?? 0), 0), 0) / casts.length;
  const value = own - gcdValue;
  if (!(value > 0)) return undefined;
  return { value, basis: `(${k(own)} an average Feral Frenzy, its hits in the ${FRENZY_SPAN_MS / 1000}s after the press, − ${k(gcdValue)} average GCD in its place)` };
}

// ── Resources as damage ────────────────────────────────────────────────

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
const energyOf = (c: PlayerEvent) => c.resources?.find((r) => r.type === ENERGY);

/** Bites that cost nothing: Apex Predator's Craving spent at the press, or no Energy cost logged (Convoke). */
function paidBites(ctx: PlayerCheckContext): PlayerEvent[] {
  const apex = (ctx.player.buffs ?? []).filter((b) => b.abilityId === APEX && (b.buffStatus === "removed" || b.buffStatus === "stackRemoved")).map((b) => b.timestamp);
  return presses(ctx, BITE).filter((c) => !apex.some((t) => Math.abs(t - c.timestamp) <= LINK_MS) && energyOf(c)?.cost && cpOf(c));
}

/** The player's damage per combo point on a paid Ferocious Bite (its hit and Rampant Ferocity's, to BITE_LAND_MS after). */
function bitePerCp(ctx: PlayerCheckContext): number {
  const bites = paidBites(ctx);
  const hits = ctx.player.damageDone.filter((e) => !e.pet && (e.abilityId === BITE || e.abilityId === RAMPANT_FEROCITY));
  const dmg = bites.reduce((a, c) => a + hits.filter((e) => e.timestamp >= c.timestamp - 20 && e.timestamp <= c.timestamp + BITE_LAND_MS).reduce((b, e) => b + (e.amount ?? 0), 0), 0);
  const cps = bites.reduce((a, c) => a + (cpOf(c) ?? 0), 0);
  return cps > 0 ? dmg / cps : 0;
}

/** The player's Shred per Energy, its combo point valued as Bite. */
function shredPerEnergy(ctx: PlayerCheckContext, perCp: number): number {
  const n = presses(ctx, SHRED).length;
  if (n === 0) return 0;
  const dmg = ctx.player.damageDone.filter((e) => !e.pet && e.abilityId === SHRED && e.timestamp < ctx.endMs).reduce((a, e) => a + (e.amount ?? 0), 0);
  return (dmg / n + perCp) / SHRED_ENERGY;
}

// ── Rip / Rake off every enemy ─────────────────────────────────────────

type Span = { startMs: number; endMs: number };

/** The bleed's spans on any enemy (applied → removed), from the enemy debuff stream. */
function bleedSpans(ctx: PlayerCheckContext, id: number): Span[] {
  const ev = (ctx.pull.bossDebuffs ?? []).filter((e) => e.statusId === id && e.sourceName === ctx.player.name && e.timestamp < ctx.endMs)
    .sort((a, b) => a.timestamp - b.timestamp);
  const open = new Map<string, number>();
  const out: Span[] = [];
  for (const e of ev) {
    const key = `${e.targetActorId}.${e.targetInstance ?? 1}`;
    if (e.status === "removed") {
      const st = open.get(key);
      if (st !== undefined) { out.push({ startMs: st, endMs: e.timestamp }); open.delete(key); }
    } else if (!open.has(key)) open.set(key, e.timestamp);
  }
  for (const [, st] of open) out.push({ startMs: st, endMs: ctx.endMs });
  return out;
}

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
    // From the first press after it fell off (not the walk from a dead target), less the press that reapplies it.
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

// Rake isn't judged: the same model read 0.22–1.50M on three of the top
// players (Vydal fh6bLKy12gzWvGCH 88.6s off in 11 gaps), as much as on the
// weak (header).
const ripOff: JobCheck = (ctx) => {
  const perCp = bitePerCp(ctx);
  const perEnergy = shredPerEnergy(ctx, perCp);
  if (!(perCp > 0 && perEnergy > 0)) return [];
  const ripCps = presses(ctx, RIP).map(cpOf).filter((x): x is number => x !== undefined);
  const cp = ripCps.length ? ripCps.reduce((a, x) => a + x, 0) / ripCps.length : MAX_CP;
  const ripMs = colad(ctx) * RIP_MS_PER_CP * (cp + 1);
  return bleedGaps(ctx, RIP, "Rip", {
    perMs: (perCp * cp + RIP_ENERGY * perEnergy) / ripMs,
    basis: `the Bite its ${cp.toFixed(1)} combo points and the Shred its ${RIP_ENERGY} Energy would have been, over its ${s(ripMs)}`,
  });
};

/** Circle of Life and Death: bleeds run 0.8× as long (Rake's untouched span 12.0s instead of 15s). */
function colad(ctx: PlayerCheckContext): number {
  const spans = bleedSpans(ctx, RAKE).map((w) => w.endMs - w.startMs);
  return spans.some((x) => x > RAKE_MS * 0.9) ? 1 : 0.8;
}

// ── Ferocious Bite below 5 combo points ────────────────────────────────

const biteLowPoints: JobCheck = (ctx) => {
  const perCp = bitePerCp(ctx);
  const perEnergy = shredPerEnergy(ctx, perCp);
  if (!(perEnergy > 0)) return [];
  // A target that dies within DYING_MS takes whatever finishes it.
  const lastHit = new Map<string, number>();
  for (const p of ctx.pull.players) for (const e of p.damageDone) {
    const key = `${e.target}.${e.targetInstance ?? 1}`;
    lastHit.set(key, Math.max(lastHit.get(key) ?? 0, e.timestamp));
  }
  const hit = (c: PlayerEvent) => ctx.player.damageDone.find((e) => e.abilityId === BITE && Math.abs(e.timestamp - c.timestamp) <= BITE_LAND_MS);
  const forced = mergeWindows(ctx.forced);
  const moments: Moment[] = [];
  for (const c of paidBites(ctx)) {
    const cp = cpOf(c)!;
    if (cp >= MAX_CP || c.timestamp >= ctx.endMs - TAIL_MS) continue;
    if (forced.some((w) => c.timestamp >= w.startMs && c.timestamp <= w.endMs)) continue;
    const h = hit(c);
    const dies = lastHit.get(`${c.target}.${h?.targetInstance ?? 1}`);
    if (dies !== undefined && dies - c.timestamp <= DYING_MS && dies < ctx.endMs - 1_000) continue;
    const lost = (MAX_CP - cp) / MAX_CP * BITE_ENERGY * perEnergy;
    moments.push({ startMs: c.timestamp, endMs: c.timestamp, lostDamage: lost,
      detail: `Ferocious Bite at ${clock(c.timestamp)} with ${cp} point${cp > 1 ? "s" : ""} on ${c.target ?? "?"} (${energyOf(c)?.amount ?? "?"} Energy)` });
  }
  const lost = moments.reduce((a, m) => a + (m.lostDamage ?? 0), 0);
  if (moments.length === 0 || lost < MIN_LOST) return [];
  return [finding(ctx, {
    kind: "wrong-gcd", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Ferocious Bite below 5 points",
    lostDamage: lost,
    basis: `each Bite's missing points ÷ ${MAX_CP} × its ${BITE_ENERGY} Energy as Shred (${(perEnergy / 1000).toFixed(2)}k an Energy, its point as Bite at ${k(perCp)}): the press's cost spread over fewer points`,
    detail: `${moments.length} paid Ferocious Bite${moments.length > 1 ? "s" : ""} below ${MAX_CP} combo points (free Apex Predator's Craving Bites, a target dying within ${s(DYING_MS)} and the pull's last ${s(TAIL_MS)} excluded)`,
    moments,
  })];
};

export const FERAL_CHECKS: JobCheck[] = [ripOff, biteLowPoints];
