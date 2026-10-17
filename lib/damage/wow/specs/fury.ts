// lib/damage/wow/specs/fury.ts
//
// Fury Warrior's own checks (melee.ts gives the spec this list beside the
// Recklessness window; potions and the generic checks come with every
// spec). Built in the WoWAnalyzer audit's phase 3
// (docs/wowa-audit/warrior-fury.md), every rule valued as damage lost.
// Measured 2026-10-17 on 18 Fury player-pulls, all Mythic kills: the top
// parses Naxxio (zBb3HQpZCkxAfvqn, Entombed Sentinels 100th), Toýmaker
// (ZTGbp8m9DjJtvAf3, Entombed Sentinels 99.2th), Golgatron
// (dp6am4TQhG3cKFxR, Vashnik 100th) and 沐川內枯 (19WyTrzgQRvdc4Z8, Vashnik
// 99.4th), all fetched for this pass, with Kratos (vRPGT4MN6VALQWFh, 94.0th)
// and Mauleon (X618LRt7hPqzbVJj, 92.8th); the weaker Grogrin
// (zQq63GHTRwPgt2Bp, 6.8th), Tenebrionnu (CdMnBQWKX3gLYxym, 8.3th),
// Thimfury (NrAkz46XQFvB7dT2, 14.4th) and Celex (nXkTwgWmDKAvQ7qx, 16.7th),
// fetched too; Sigmardoom (on Golgatron's kill, 116k/s), and Абсентофф
// (7L3RKpavDA8T4MjY), Luxurécrase (7pFPAqzc2NHLXjwZ), Øuranøse
// (C4Kxpn3FtrvjWMAP), Tente (v8bmgMAdcnBCj9Ya), Bekon (wWx8B1GPZMLghAyz),
// Fulgørr (ZjVtM1vFcrp7w3WC), 残乁梦 (yrFd7CYZvt6XAz3T) already on disk.
// Percentiles from WCL's rankings. Spell ids are from those logs'
// masterData.
//
// Talents (from casts, buffs and hits): 16 of 18 are Slayer (Bladestorm
// 446035 pressed 5–10 times a pull, Slayer's Strike, Executioner, Sudden
// Death); 残乁梦 and Celex are Mountain Thane (Avatar pressed with every
// Recklessness, Thunder Blast, Lightning Strike). Everyone has Reckless
// Abandon (Recklessness turns Raging Blow into Crushing Blow and
// Bloodthirst into Bloodbath); everyone but Celex presses Odyn's Fury.
// Nobody presses Ravager or Champion's Spear. Only Rampage spends Rage
// (80, logged as cost 800); every other press logs a cost of 0.
//
// ── Recklessness held (recklessnessDrift) ──────────────────────────────
// Recklessness (1719) is a 24.0s buff. Its cooldown comes back faster the
// more Rage is spent: over the 117 intervals between two casts, elapsed +
// Rage spent ÷ R is tightest at R = 35–42 (its 25th percentile 4.6–5.0%
// above its minimum; fixed, 19%), and at R = 40 the top players' quick
// recasts sit at 74.5–77 (Kratos 36.9s after 1,520 Rage, Øuranøse 46.5s
// after 1,120), the lowest 72.7. So 72s less 1s per 40 Rage spent, the
// most lenient value the log allows: no cast comes before the rebuilt
// ready time (the shortest hold 0.6s). The tracked fixed 41s it replaces
// sat above the 36.9s shortest interval, and a use was worth 0 there (it
// does no damage itself), so its drift never reported. A use is worth the
// player's rate inside the windows less outside them, forced time out, ×
// the window's length, without Odyn's Fury, Bladestorm and Reap the Storm
// (pressed with it, valued on their own): ×1.5–1.8 inside on the top
// players, 1.7–4.0M a use. Vashnik's Imbibe holds are excused (shared.ts
// spentCooldownDrift: one recharge before each). Measured: none on any of
// the 18 player-pulls; the long waits (Mauleon 70–85s, Tente 63–67s,
// Thimfury 55–71s) are Stasis, Imbibe holds, or under a whole recharge.
//
// ── Rampage held while unenraged (rampageUnenraged) ────────────────────
// Enrage (184362) is the spec's damage engine: the player's non-crit hits
// without it against the same hits with it, outside Recklessness, read
// ×1.4–1.8 per hit name (melee, Whirlwind, Raging Blow), ×1.24–1.89 pooled
// a player. Rampage restores it, at 80 Rage. A press made with Enrage down
// and Rampage affordable (a builder, Execute, Bladestorm or Odyn's Fury)
// kept Enrage off until it came back: lost = the player's hits from the
// press to Enrage's return (or forced time) × (ratio − 1). Pressing
// Rampage first only moves the builder one GCD later. Not counted: a press
// within one GCD of Enrage running out (already queued: the top players'
// Executes 0.5–1s after it fell), Whirlwind or Thunder Clap with no cleave
// stacks up (setting up a Rampage that cleaves), Bladestorm's own
// Bloodthirsts, forced time. Unforced Enrage uptime: top 96–98% (Mauleon
// 90%), weak 87–92%. Measured (lost a pull): top Naxxio none, Golgatron
// 22k, Kratos 27k, 沐川內枯 81k, Toýmaker 116k (Raging Blow at 1:47 and
// 3:24), Mauleon 285k; Bekon 64k, 残乁梦 85k, Øuranøse 112k; weaker
// Tenebrionnu 575k, Celex 490k (Raging Blow at 1:24 with 103 Rage,
// Enrage back 3.0s later: 390k), Абсентофф 475k, Thimfury 385k (three
// Bladestorms pressed unenraged at 126–130 Rage), Fulgørr 379k,
// Luxurécrase 317k, Tente 262k, Grogrin 173k. Covers WoWAnalyzer's
// Bladestorm-while-not-enraged (every one on the samples came at 94+
// Rage) and the Bloodbath / Crushing Blow unenraged rows where a Rampage
// was affordable.
//
// ── Rage capped, outside Recklessness (rageCapped) ─────────────────────
// The shared cap check (shared.ts) read 0.47–1.01M on the top players
// (Naxxio 1.01M: 44 casts at full Rage), most of it Bloodbath. Two
// reasons, both measured:
// - Bladestorm casts its own Bloodthirst / Bloodbath every ~0.73s, 3–4 a
//   channel (22–38 of a top player's 26–38 Bloodbaths): not presses, so
//   not a choice made at the cap (game.ts now treats them as the channel's).
// - Inside Recklessness the builders out-hit the spender: Crushing Blow
//   175–225k and Bloodbath 183–238k a press against Rampage's 90–122k
//   (top players), and Rage comes ~30 a press against ~18 outside. A
//   builder at the cap there would cost a big hit to save Rage worth half
//   as much; the top players cap on 15–34% of their presses inside it,
//   1–12% outside.
// So casts inside Recklessness or a Bladestorm channel aren't judged (their
// gain still counts for the fit), nor Odyn's Fury's three extra cast ids.
// Measured: top 0–81k (Naxxio and Toýmaker 81k, Golgatron 79k; Mauleon,
// Øuranøse, Bekon, Tente none); weaker 19–294k (残乁梦 294k, Thimfury
// 262k: 14 casts, Luxurécrase 252k, Абсентофф and Grogrin 211k).

import type { JobCheck, Moment } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { mergeWindows, overlapMs, type Window } from "../../timeline";
import { k, primaryResourceCapFindings, s, spentCooldownDrift, statusWindows } from "./shared";

const RECKLESSNESS = 1719;     // the cast and its 24s buff
const ENRAGE = 184362;
const WHIRLWIND_BUFF = 85739;  // Whirlwind's cleave stacks
const BLADESTORM = 446035;     // Slayer's channel (its buff), which casts Bloodthirsts itself
// An Odyn's Fury press (385059) logs three more casts beside it: its hits, not presses.
const ODYNS_FURY_TWINS = [385060, 385061, 385062];
const RAGE = 1;               // WCL classResources type, logged ×10
// Hits of the cooldowns pressed with Recklessness: left out of its window's worth.
const ALIGNED = /^(Odyn's Fury|Bladestorm|Reap the Storm)/;
// Presses that could have been a Rampage instead.
const BUILDERS = new Set(["Bloodthirst", "Bloodbath", "Raging Blow", "Crushing Blow", "Execute", "Whirlwind", "Thunder Clap",
  "Thunder Blast", "Odyn's Fury", "Bladestorm"]);
const CLEAVE_SETUP = new Set(["Whirlwind", "Thunder Clap"]);
const MAX_RATIO = 2;
const MIN_UNENRAGED_HITS = 8;

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const inside = (ws: Window[], t: number) => ws.some((w) => t >= w.startMs && t <= w.endMs);
// After a Bladestorm press, inside its channel (game.ts: the casts there are its own).
const inChannel = (ws: Window[], t: number) => ws.some((w) => t > w.startMs && t <= w.endMs + 50);
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const rageOf = (c: { resources?: { type: number; amount: number; cost?: number }[] }) => c.resources?.find((r) => r.type === RAGE);

// ── Recklessness held (the Rage-spent recharge, valued by its window) ──

/** One Recklessness: (the player's rate inside its windows − outside them, forced time out) × its average length. */
function recklessnessValue(ctx: PlayerCheckContext): { value: number; basis: string } | undefined {
  const wins = statusWindows(ctx, RECKLESSNESS).filter((w) => w.endMs <= ctx.endMs && w.endMs > w.startMs);
  if (wins.length < 2) return undefined;
  const forced = mergeWindows(ctx.forced);
  const inMs = wins.reduce((a, w) => a + w.endMs - w.startMs - overlapMs(w.startMs, w.endMs, forced), 0);
  const out = mergeWindows([...wins, ...forced]);
  const outMs = ctx.endMs - overlapMs(0, ctx.endMs, out);
  if (!(inMs > 0) || outMs < 30_000) return undefined;
  let dIn = 0, dOut = 0;
  for (const h of ctx.player.damageDone) {
    if (h.pet || h.timestamp >= ctx.endMs || ALIGNED.test(h.abilityName) || inside(forced, h.timestamp)) continue;
    if (inside(wins, h.timestamp)) dIn += h.amount ?? 0; else dOut += h.amount ?? 0;
  }
  const rIn = dIn / inMs, rOut = dOut / outMs;
  const len = wins.reduce((a, w) => a + w.endMs - w.startMs, 0) / wins.length;
  const value = (rIn - rOut) * len;
  if (!(value > 0)) return undefined;
  return {
    value,
    basis: `${k(value)} a use (${k(rIn * 1000)}/s inside its ${wins.length} windows − ${k(rOut * 1000)}/s outside, over ${s(len)}; Odyn's Fury and Bladestorm hits left out)`,
  };
}

const recklessnessDrift: JobCheck = (ctx) => spentCooldownDrift(ctx, {
  name: "Recklessness", actionIds: [RECKLESSNESS], baseMs: 72_000, resourceType: RAGE, scale: 10, unitsPerSecond: 40,
  firstUseOffsetMs: 3_000, window: { buffId: RECKLESSNESS }, valuePerUse: recklessnessValue,
});

// ── Rampage held while unenraged ───────────────────────────────────────

/** The player's Enrage bonus: per hit name, median non-crit hit with ÷ without, outside Recklessness; pooled by hits without. */
function enrageRatio(ctx: PlayerCheckContext, enrage: Window[], reck: Window[]): { ratio: number; hits: number } | undefined {
  const by = new Map<string, { i: number[]; o: number[] }>();
  for (const h of ctx.player.damageDone) {
    if (h.pet || h.isDoT || h.hitType !== 1 || !(h.amount! > 0) || h.timestamp >= ctx.endMs || inside(reck, h.timestamp)) continue;
    const g = by.get(h.abilityName) ?? { i: [], o: [] };
    (inside(enrage, h.timestamp) ? g.i : g.o).push(h.amount!);
    by.set(h.abilityName, g);
  }
  let sum = 0, n = 0;
  for (const g of by.values()) {
    if (g.i.length < 5 || g.o.length < 3) continue;
    const r = Math.min(MAX_RATIO, Math.max(1, median(g.i) / median(g.o)));
    sum += (r - 1) * g.o.length; n += g.o.length;
  }
  return n >= MIN_UNENRAGED_HITS ? { ratio: 1 + sum / n, hits: n } : undefined;
}

const rampageUnenraged: JobCheck = (ctx) => {
  const casts = ctx.player.casts.filter((c) => !c.fake && c.timestamp < ctx.endMs).sort((a, b) => a.timestamp - b.timestamp);
  const costs = casts.filter((c) => c.abilityName === "Rampage").map((c) => rageOf(c)?.cost ?? 0).filter((x) => x > 0);
  if (costs.length < 10) return [];
  const cost = median(costs);
  const enrage = statusWindows(ctx, ENRAGE);
  if (enrage.length === 0) return [];
  const ratio = enrageRatio(ctx, enrage, statusWindows(ctx, RECKLESSNESS));
  if (!ratio) return [];
  const cleave = statusWindows(ctx, WHIRLWIND_BUFF);
  const storms = statusWindows(ctx, BLADESTORM);
  const forced = mergeWindows(ctx.forced);
  const back = (t: number) => Math.min(
    enrage.find((w) => w.startMs > t)?.startMs ?? ctx.endMs,
    forced.find((w) => w.startMs > t)?.startMs ?? ctx.endMs,
    ctx.endMs);
  const moments: Moment[] = [];
  let until = -1;
  for (const c of casts) {
    if (!BUILDERS.has(c.abilityName) || ODYNS_FURY_TWINS.includes(c.abilityId) || c.timestamp <= until || inside(forced, c.timestamp)) continue;
    // Bladestorm's own Bloodthirsts (no Rampage fits inside the channel).
    if (inChannel(storms, c.timestamp)) continue;
    if (inside(enrage, c.timestamp + 5)) continue;
    if ((rageOf(c)?.amount ?? 0) < cost) continue;
    // Pressed within a GCD of Enrage running out: already queued.
    const fell = enrage.filter((w) => w.endMs <= c.timestamp).pop()?.endMs;
    if (fell !== undefined && c.timestamp - fell < ctx.baseGcdMs) continue;
    // Whirlwind first on a pack, so the Rampage after it cleaves.
    if (CLEAVE_SETUP.has(c.abilityName) && !inside(cleave, c.timestamp - 5)) continue;
    const end = back(c.timestamp);
    until = end;
    const dmg = ctx.player.damageDone.filter((h) => !h.pet && h.timestamp >= c.timestamp && h.timestamp < end).reduce((a, h) => a + (h.amount ?? 0), 0);
    const lost = dmg * (ratio.ratio - 1);
    if (lost <= 0) continue;
    moments.push({ startMs: c.timestamp, endMs: end, lostDamage: lost,
      detail: `${c.abilityName} at ${clock(c.timestamp)} with no Enrage and ${Math.round((rageOf(c)!.amount) / 10)} Rage: Enrage back ${s(end - c.timestamp)} later` });
  }
  if (moments.length === 0) return [];
  const ms = moments.reduce((a, m) => a + m.endMs - m.startMs, 0);
  return [finding(ctx, {
    kind: "burst-window", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Rampage held while unenraged",
    lostDamage: moments.reduce((a, m) => a + (m.lostDamage ?? 0), 0),
    basis: `the player's hits over the ${s(ms)} from each press to Enrage's return × ${Math.round((ratio.ratio - 1) * 100)}% (Enrage's bonus read from the player's ${ratio.hits} non-crit hits without it, against the same hits with it, outside Recklessness)`,
    detail: `${moments.length} press${moments.length > 1 ? "es" : ""} made with Enrage down and Rampage affordable (${Math.round(cost / 10)} Rage)`,
    moments,
  })];
};

// ── Rage capped, outside Recklessness ──────────────────────────────────

const rageCapped: JobCheck = (ctx) => {
  const reck = statusWindows(ctx, RECKLESSNESS);
  const storms = statusWindows(ctx, BLADESTORM);
  return primaryResourceCapFindings(ctx, ODYNS_FURY_TWINS, {
    skipAtCap: (c) => inside(reck, c.timestamp) || inChannel(storms, c.timestamp),
    skipNote: "outside Recklessness",
  });
};

export const FURY_CHECKS: JobCheck[] = [rageCapped, recklessnessDrift, rampageUnenraged];
