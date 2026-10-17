// lib/damage/wow/specs/enhancement.ts
//
// Enhancement Shaman's checks (melee.ts gives the spec this list; potions
// and the generic checks come with every spec). Built in the WoWAnalyzer
// audit's phase 3 (docs/wowa-audit/shaman-enhancement.md), every rule
// valued as damage lost. Measured 2026-10-17 on 23 Enhancement
// player-pulls, all Mythic kills: the top parses Jshaman
// (amZr6A4Pn8fWqcN9, Vashnik 100th), Fjedn (dt9xLXJKMZc62hC3, Vashnik
// 99.6th), Kurugh (WDNdyzgKArhYM327, Entombed Sentinels 100th) and
// Zaappers (JQVkMCb8T324yWca, Entombed Sentinels 99.7th), all four fetched
// for this pass; Zamostakos (6kHtGaQXCMWYxFpZ, 89th), Greythunder
// (X618LRt7hPqzbVJj, 84th), Glizzylizzy (hjHXmdnJFwTPpMtK, 81st), Ripzug
// and Lollytotem (~62nd); the weaker Niky (7pFPAqzc2NHLXjwZ, 4.9th),
// Macroos (LCFp3wbHvQqNP4my, 19.8th), Anfall (Ndh2H6Qw4Pp1qaMk, 21.3rd),
// Tolu (atJRCq3YM8P4KGpD, 28.5th), Morkkâ (8kVQMJ4rmpnyRjBH, 31.2nd),
// Vanilla and Toranha (45–49th), the static's Cocroach on four pulls of
// gVDPhzp61Zm29HMw; Zóhrg, Thaw, Throttnuk unranked here. Percentiles
// from WCL's rankings. Spell ids are from those logs' masterData.
//
// Talents (from casts and buffs): every player is the same build:
// Stormbringer (Tempest, Arc Discharge), Ascendance pressed (114051, 3–4 a
// pull), Thorim's Invocation (Windstrike casts a Lightning Bolt, Chain
// Lightning or Tempest), Overflowing Maelstrom (Maelstrom Weapon to 10),
// Voltaic Blaze in place of Flame Shock (no Flame Shock is ever pressed),
// Storm Unleashed, Stormsurge, Stormblast. Nobody presses Doom Winds,
// Feral Spirit, Sundering, Surging Totem or Primordial Storm, and nobody
// has Hot Hand: Doom Winds (466772) is a 10s buff that comes with every
// Ascendance and 1–3 times a pull with a spender (Lightning Bolt, Chain
// Lightning, Tempest), and pulses once a second (its 469270 "casts" and
// hits, never a press).
//
// ── Ascendance drift (tracked-cooldowns.ts; ascendanceValue) ───────────
// 120s: the shortest interval on every player is 120.0–125.9s (Glizzylizzy
// 120.00, Fjedn 119.99). Its 15s window does 6.3–10.1M, 2.6–4.0× the
// player's rate outside Ascendance and Doom Winds, so a use is worth the
// damage in an average window less that rate over the same time:
// 3.5–7.5M (median ~5.5M). The top Vashnik players hold it for the Imbibes
// (Jshaman 0:25, 3:13, 6:01: 168s apart; Lollytotem the same): burstHold.
// Kurugh (Entombed Sentinels 100th) held one 60s but lost no use before
// the kill. Measured: every top and mid player none; Macroos 5.96M (2:13,
// 4:49: 28s held, room for a fourth before the 7:00 kill), Toranha 4.27M
// (31s held).
//
// ── Voltaic Blaze drift (tracked-cooldowns.ts; voltaicBlazeValue) ──────
// A fixed 10s: the shortest interval is 9.98–10.13s on 22 of 23
// player-pulls; the top players' median 10.9–11.9s, the weaker up to 14.3s
// (Niky). It replaces Flame Shock and spreads it, so a late one doesn't
// drop the DoT (Flame Shock uptime stays ~100%: below); what a lost use
// costs is its own hit (69–120k) less a Stormstrike's (36–50k with the
// off-hand), the press that fills the GCD instead. Its 3 Maelstrom Weapon
// stacks aren't counted (a Stormstrike gives stacks too). Held time sits
// mostly outside Ascendance and Doom Winds. The top Vashnik players hold
// it for the Imbibe's Venoms (Jshaman 0:01 → 0:23, Imbibe at 0:24):
// burstHold. Measured (lost a pull): top Kurugh 42k, Fjedn 55k, Zaappers
// 55k, Jshaman 147k; weak Niky 774k (13 uses: 26 presses in 7:14),
// Greythunder 259k, Morkkâ 159k, Anfall 151k, Tolu 141k; Zóhrg 315k.
//
// ── Maelstrom Weapon capped (maelstromCapped) ──────────────────────────
// Maelstrom Weapon (344179) stacks to 10; the log keeps each stack count,
// and a gain at 10 logs as a lone "refreshed" (3,802 of 3,809 lone
// refreshes on the samples came at 10). A press that doesn't spend
// (Stormstrike, Windstrike, Crash Lightning, Lava Lash, Voltaic Blaze),
// made with the bar full for REACT_MS or more, wastes the stacks gained
// until the next press: a spender first would have taken them. Lost per
// press = the stacks wasted × the player's damage per stack spent (their
// Lightning Bolt / Chain Lightning / Tempest hits ÷ the stacks those casts
// spent) × STACK_SHARE, less what pressing it a GCD later costs (a GCD ÷
// its average interval × its average hits: every later one comes that
// much later). STACK_SHARE: a Lightning Bolt at 5 stacks does 0.75 of one
// at 10, Chain Lightning 0.86, Tempest 0.84 (pooled, non-crit first-target
// hits outside Ascendance), so about half a 10-stack spender is its
// stacks. A Stormstrike whose Thorim's spender logs beside it spent first
// and isn't counted. Stacks wasted with no press at 10 (Doom Winds and
// Ascendance pulses, refunds right after a spend) are left alone: top
// players waste 9–18% of what they gain either way.
// Measured (lost a pull): top Zaappers 118k, Kurugh 173k, Jshaman 265k,
// Fjedn 291k; weaker Niky 1.01M (Stormstrike at 10 from 0:20), Anfall
// 824k, Tolu 770k, Morkkâ 424k, Toranha 340k, Macroos 159k; mid Zóhrg
// 1.74M (54 presses), Lollytotem 549k, Vanilla 413k. WoWAnalyzer grades
// waste as a share of what was gained (a dead getter); the share doesn't
// separate the players (top 9–18%, weak 13–24%).
//
// ── Idle in Ascendance (ascendanceIdle) ────────────────────────────────
// burstGcdFindings can't see the window: presses inside Ascendance come a
// median 0.96–1.12s apart against 1.16–1.23s outside (Windstrike and its
// free spenders), so "GCDs that fit" from the ordinary GCD (1.1–1.25s)
// sits under what the top players press, and no window ever read short.
// Instead the gap check's own unforced idle inside the window (stretches
// of DELAY_FINDING_MS+, less forced time and movement) costs, per GCD, a
// Windstrike press (its hits and its Thorim's spender's, 1.2s) less the
// player's average GCD the gap check already priced. The gap check sees
// 0–0.4s of such idle a pull on the top players, up to 2.3s on the weak.
// Measured: top 0–25k (Fjedn); Niky 404k (2:24, 5:11), Cocroach 127k
// (Nek'zali), Vanilla 92k, Anfall 62k, Toranha 37k.
//
// ── Flame Shock uptime (flameShockUptime) ──────────────────────────────
// The shared DoT check on Flame Shock (188389), applied by Voltaic Blaze.
// Top players none; Niky 51k (18s off at 5:26), Thaw 22k. Kept: cheap and
// it would show a player who stops pressing Voltaic Blaze.

import type { PlayerEvent, PlayerInfo } from "@/types/PlayerInfo";
import type { JobCheck, Moment } from "../../types";
import { DELAY_FINDING_MS, GCD_TOLERANCE_MS, finding, type PlayerCheckContext } from "../../checks";
import { gcdLockMs, mergeWindows, overlapMs, type Window } from "../../timeline";
import { dotUptimeFindings, k, s, statusWindows } from "./shared";

const ASCENDANCE = 114051;        // cast and buff
const DOOM_WINDS = 466772;        // the buff (its pulses log as 469270 casts and hits)
const FLAME_SHOCK = 188389;
const VOLTAIC_BLAZE = 470057;     // cast; hits 1259101
const MAELSTROM_WEAPON = 344179;
const MW_MAX = 10;
const ASC_TAIL_MS = 500;
const REACT_MS = 300;
const PAIR_MS = 30;
const SPEND_HIT_MS = 1_200;
const STACK_SHARE = 0.5;
const SPENDERS = new Set(["Lightning Bolt", "Chain Lightning", "Tempest"]);
// Non-spending presses and the hits that are theirs (by name).
const BUILDERS: Record<string, string[]> = {
  "Stormstrike": ["Stormstrike", "Stormstrike Off-Hand"],
  "Windstrike": ["Windstrike", "Windstrike Off-Hand"],
  "Crash Lightning": ["Crash Lightning"],
  "Lava Lash": ["Lava Lash"],
  "Voltaic Blaze": ["Voltaic Blaze"],
};

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : NaN);

function buffWindows(player: PlayerInfo, id: number, endMs: number): Window[] {
  const ws: Window[] = [];
  let st: number | undefined;
  for (const b of (player.buffs ?? []).filter((b) => b.abilityId === id && b.source === player.name).sort((a, c) => a.timestamp - c.timestamp)) {
    if (b.buffStatus === "applied" && st === undefined) st = b.timestamp;
    else if (b.buffStatus === "removed" && st !== undefined) { ws.push({ startMs: st, endMs: b.timestamp }); st = undefined; }
  }
  if (st !== undefined) ws.push({ startMs: st, endMs });
  return ws.filter((w) => w.startMs < endMs);
}
const inAny = (ws: Window[], t: number) => ws.some((w) => t >= w.startMs && t <= w.endMs);

/** One press per spell per instant, before endMs. */
function presses(player: PlayerInfo, endMs: number): PlayerEvent[] {
  const out: PlayerEvent[] = [];
  for (const c of player.casts.filter((c) => !c.fake && c.timestamp < endMs).sort((a, b) => a.timestamp - b.timestamp)) {
    if (out.some((p) => p.abilityName === c.abilityName && c.timestamp - p.timestamp < 100)) continue;
    out.push(c);
  }
  return out;
}

/** A cast's own hits by name over the next `ms` (to the next cast of the same name). */
function castDamage(player: PlayerInfo, casts: PlayerEvent[], c: PlayerEvent, names: string[], ms: number): number {
  const next = casts.find((x) => x.abilityName === c.abilityName && x.timestamp > c.timestamp)?.timestamp ?? Infinity;
  return player.damageDone.filter((e) => !e.pet && names.includes(e.abilityName) && e.timestamp >= c.timestamp && e.timestamp < Math.min(next, c.timestamp + ms))
    .reduce((a, e) => a + (e.amount ?? 0), 0);
}

// ── Ascendance's worth ─────────────────────────────────────────────────

/** One Ascendance (tracked-cooldowns.ts): an average window's damage less the player's rate outside Ascendance and Doom Winds. */
export function ascendanceValue(player: PlayerInfo, endMs: number): { value: number; basis: string } | undefined {
  const asc = buffWindows(player, ASCENDANCE, endMs).filter((w) => w.endMs <= endMs).map((w) => ({ startMs: w.startMs, endMs: w.endMs + ASC_TAIL_MS }));
  if (asc.length === 0) return undefined;
  const dw = buffWindows(player, DOOM_WINDS, endMs).map((w) => ({ startMs: w.startMs, endMs: w.endMs + ASC_TAIL_MS }));
  const hits = player.damageDone.filter((e) => e.timestamp < endMs);
  const inMs = asc.reduce((a, w) => a + w.endMs - w.startMs, 0);
  const inDmg = hits.filter((e) => inAny(asc, e.timestamp)).reduce((a, e) => a + (e.amount ?? 0), 0);
  const out = mergeWindows([...asc, ...dw]);
  const outMs = endMs - overlapMs(0, endMs, out);
  const outDmg = hits.filter((e) => !inAny(out, e.timestamp)).reduce((a, e) => a + (e.amount ?? 0), 0);
  if (!(outMs > 0)) return undefined;
  const each = inDmg / asc.length, base = outDmg / outMs * inMs / asc.length;
  const value = each - base;
  if (!(value > 0)) return undefined;
  return {
    value,
    basis: `${k(value)} that an average Ascendance added (${k(each)} done in each of ${asc.length} windows − ${k(base)} at the player's rate outside Ascendance and Doom Winds)`,
  };
}

// ── Voltaic Blaze's worth ──────────────────────────────────────────────

/** One Voltaic Blaze (tracked-cooldowns.ts): its own hits less a Stormstrike's, the press in its place. */
export function voltaicBlazeValue(player: PlayerInfo, endMs: number): { value: number; basis: string } | undefined {
  const casts = presses(player, endMs);
  const vb = casts.filter((c) => c.abilityId === VOLTAIC_BLAZE);
  const ss = casts.filter((c) => c.abilityName === "Stormstrike");
  if (vb.length < 3 || ss.length < 3) return undefined;
  const sum = (names: string[]) => player.damageDone.filter((e) => !e.pet && names.includes(e.abilityName) && e.timestamp < endMs).reduce((a, e) => a + (e.amount ?? 0), 0);
  const own = sum(BUILDERS["Voltaic Blaze"]) / vb.length;
  const filler = sum(BUILDERS["Stormstrike"]) / ss.length;
  const value = own - filler;
  if (!(value > 0)) return undefined;
  return { value, basis: `(${k(own)} an average Voltaic Blaze − ${k(filler)} an average Stormstrike in its place)` };
}

// ── Maelstrom Weapon capped ────────────────────────────────────────────

type MwPoint = { t: number; n: number; wasted: number };

/** The Maelstrom Weapon count after each of its events, and the gains lost at the cap (lone refreshes at 10). */
function maelstromTimeline(player: PlayerInfo): MwPoint[] {
  const ev = (player.buffs ?? []).filter((b) => b.abilityId === MAELSTROM_WEAPON && b.source === player.name).sort((a, b) => a.timestamp - b.timestamp);
  const out: MwPoint[] = [];
  let n = 0;
  ev.forEach((e, i) => {
    let wasted = 0;
    if (e.buffStatus === "applied") n = e.stack ?? 1;
    else if (e.buffStatus === "stack") n = e.stack ?? n + 1;
    else if (e.buffStatus === "stackRemoved") n = e.stack ?? Math.max(0, n - 1);
    else if (e.buffStatus === "removed") n = 0;
    else if (e.buffStatus === "refreshed") {
      // WCL logs a "refreshed" beside each stack gained; one alone is a gain at the cap.
      const prev = ev[i - 1];
      const beside = prev && prev.buffStatus === "stack" && Math.abs(prev.timestamp - e.timestamp) <= 2;
      if (!beside && n >= MW_MAX) wasted = 1;
    }
    out.push({ t: e.timestamp, n, wasted });
  });
  return out;
}

const maelstromCapped: JobCheck = (ctx) => {
  const tl = maelstromTimeline(ctx.player);
  if (!tl.some((x) => x.wasted)) return [];
  const before = (t: number) => { let n = 0; for (const x of tl) { if (x.t >= t - 1) break; n = x.n; } return n; };
  /** When the bar last reached the cap before t. */
  const fullSince = (t: number) => {
    let since = t;
    for (let i = tl.length - 1; i >= 0; i--) {
      if (tl[i].t >= t - 1) continue;
      if (tl[i].n < MW_MAX) return tl[i + 1]?.t ?? t;
      since = tl[i].t;
    }
    return since;
  };
  const casts = presses(ctx.player, ctx.endMs);
  // The player's damage per stack spent.
  let spentDmg = 0, spentStacks = 0;
  for (const c of casts.filter((c) => SPENDERS.has(c.abilityName))) {
    spentStacks += before(c.timestamp);
    spentDmg += castDamage(ctx.player, casts, c, [c.abilityName], SPEND_HIT_MS);
  }
  if (spentStacks < 50) return [];
  const perStack = spentDmg / spentStacks * STACK_SHARE;
  // Each builder's average hits and interval: what pressing it a GCD later costs.
  const delayCost = new Map<string, number>();
  for (const [name, hitNames] of Object.entries(BUILDERS)) {
    const xs = casts.filter((c) => c.abilityName === name);
    if (xs.length < 3) continue;
    const dmg = ctx.player.damageDone.filter((e) => !e.pet && hitNames.includes(e.abilityName) && e.timestamp < ctx.endMs).reduce((a, e) => a + (e.amount ?? 0), 0);
    const interval = (xs[xs.length - 1].timestamp - xs[0].timestamp) / (xs.length - 1);
    delayCost.set(name, ctx.baseGcdMs / interval * dmg / xs.length);
  }
  const forced = mergeWindows(ctx.forced);
  const uses = ctx.uses.filter((u) => u.startMs < ctx.endMs);
  const spends = casts.filter((c) => SPENDERS.has(c.abilityName)).map((c) => c.timestamp);
  const moments: Moment[] = [];
  let stacks = 0, delays = 0;
  uses.forEach((u, i) => {
    if (!BUILDERS[u.abilityName] || inAny(forced, u.startMs)) return;
    if (before(u.startMs) < MW_MAX || u.startMs - fullSince(u.startMs) < REACT_MS) return;
    // Its Thorim's / Stormstrike spender logged beside it: it spent first.
    if (spends.some((t) => t >= u.startMs - PAIR_MS && t - u.startMs <= PAIR_MS)) return;
    const next = uses[i + 1]?.startMs ?? ctx.endMs;
    const wasted = tl.filter((x) => x.t >= u.startMs && x.t < next).reduce((a, x) => a + x.wasted, 0);
    if (wasted === 0) return;
    const delay = delayCost.get(u.abilityName) ?? 0;
    const lost = wasted * perStack - delay;
    if (lost <= 0) return;
    stacks += wasted; delays += delay;
    moments.push({ startMs: u.startMs, endMs: next, lostDamage: lost,
      detail: `${u.abilityName} at ${clock(u.startMs)} with Maelstrom Weapon at ${MW_MAX}: ${wasted} stack${wasted > 1 ? "s" : ""} wasted before the next press` });
  });
  if (moments.length === 0) return [];
  return [finding(ctx, {
    kind: "gauge-overcap",startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Maelstrom Weapon capped",
    lostDamage: moments.reduce((a, m) => a + (m.lostDamage ?? 0), 0),
    basis: `${stacks} stacks wasted × ${k(perStack)} (the player's spender damage per stack spent × ${STACK_SHARE}, the share a stack adds) − ${k(delays)} for pressing each a GCD later`,
    detail: `${moments.length} non-spending press${moments.length > 1 ? "es" : ""} made at ${MW_MAX} Maelstrom Weapon (full ${REACT_MS / 1000}s+ before), with a spender available`,
    moments,
  })];
};

// ── Idle in Ascendance ─────────────────────────────────────────────────

const ascendanceIdle: JobCheck = (ctx) => {
  const wins = mergeWindows(statusWindows(ctx, ASCENDANCE).filter((w) => w.startMs < ctx.endMs)
    .map((w) => ({ startMs: w.startMs, endMs: Math.min(w.endMs, ctx.endMs) })));
  if (wins.length === 0) return [];
  const casts = presses(ctx.player, ctx.endMs);
  const ws = casts.filter((c) => c.abilityName === "Windstrike" && inAny(wins, c.timestamp));
  if (ws.length < 5) return [];
  // A Windstrike press: its own hits and its Thorim's spender's (logged beside it).
  const pressValue = avg(ws.map((c) => {
    const twin = casts.find((x) => SPENDERS.has(x.abilityName) && Math.abs(x.timestamp - c.timestamp) <= PAIR_MS);
    return castDamage(ctx.player, casts, c, BUILDERS["Windstrike"], SPEND_HIT_MS) + (twin ? castDamage(ctx.player, casts, twin, [twin.abilityName], SPEND_HIT_MS) : 0);
  }));
  const gcdValue = ctx.values.gcdValue(undefined, false);
  const extra = pressValue - gcdValue;
  if (!(extra > 0)) return [];
  const excluded = mergeWindows([...ctx.forced, ...(ctx.movement ?? [])]);
  const uses = ctx.uses.filter((u) => u.startMs < ctx.endMs);
  const moments: Moment[] = [];
  let idleMs = 0;
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
    idleMs += ms;
    moments.push({ startMs: from, endMs: to, lostDamage: ms / gcd * extra, detail: `${s(ms)} idle in Ascendance after ${uses[i].abilityName} at ${clock(from)}` });
  }
  if (moments.length === 0) return [];
  return [finding(ctx, {
    kind: "burst-window", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Idle in Ascendance",
    lostDamage: moments.reduce((a, m) => a + (m.lostDamage ?? 0), 0),
    basis: `${s(idleMs)} idle in Ascendance (outside forced time and movement) ÷ GCD × (${k(pressValue)} a Windstrike press with its Thorim's spender − ${k(gcdValue)} the average GCD the gap check prices)`,
    detail: `${s(idleMs)} idle while Ascendance was up (${moments.length} gap${moments.length > 1 ? "s" : ""})`,
    moments,
  })];
};

// ── Flame Shock uptime ─────────────────────────────────────────────────

const flameShockUptime: JobCheck = (ctx) => dotUptimeFindings(ctx, { statusIds: [FLAME_SHOCK], name: "Flame Shock" });

export const ENHANCEMENT_CHECKS: JobCheck[] = [maelstromCapped, ascendanceIdle, flameShockUptime];
