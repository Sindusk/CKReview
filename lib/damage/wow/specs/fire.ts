// lib/damage/wow/specs/fire.ts
//
// Fire Mage's own checks (ranged.ts wires them; its shared Combustion window
// is replaced by the one here), and the value of the tracked Combustion
// (tracked-cooldowns.ts takes its value per use from here). Built in the WoWAnalyzer audit's
// phase 3 (docs/wowa-audit/mage-fire.md), every rule valued as damage lost.
// WoWAnalyzer's Fire is `lagging` (12.0.7 against the game's 12.1.0), so
// each rule was tested against the log first. Fire is rare: 28 ranked
// Mythic kills on Entombed Sentinels, 24 on Vashnik. Measured 2026-10-17 on
// 12 Fire player-pulls, all Mythic kills: the top Émptinêss
// (W427KLQwB9hXqAfz fight 22, Entombed Sentinels, 100th), 小鸟游小埋
// (R9HCnxJzBgXraKMb fight 10, Entombed Sentinels, 96.4th; jhdCVyFKxJwG2qQr
// fight 4, Vashnik, 95.8th), Broadum (FAfJNjrknD9QGaLw fight 22, Entombed
// Sentinels, 92.9th), Tinghao (rYNXvKqbzVQDmgPJ fight 14, Vashnik, 100th),
// Экседо (mGAyZR62qcFhKCT7 fight 16, Vashnik, 91.7th), Reinyy
// (6kHtGaQXCMWYxFpZ, Entombed Sentinels, 89.3th); the weaker Portalscroll
// (JQVkMCb8T324yWca, Entombed Sentinels, 39.3th), Sikeyzlol
// (f892cqQTxC6wMktL fight 43, Entombed Sentinels, 10.7th), Katbelle
// (Ndh2H6Qw4Pp1qaMk, Vashnik, 8.3th), Splean (fqTXM7bjZ1AzPW4a fight 36,
// Vashnik, 4.2th) and Wardaalsahra (bahTK6jXp9kZDzd4 fight 15, Entombed
// Sentinels, 3.6th). Spell ids are from those logs' masterData.
//
// Talents (from casts and buffs): 11 of 12 are Sunfury (Spellfire Sphere,
// Arcane Phoenix's Greater Pyroblast); Sikeyzlol is Frostfire (Frostfire
// Bolt 431044 is his filler, no Fireball or Scorch, no Heat Shimmer).
// Nobody presses Phoenix Flames. Everyone takes Meteor (one into each
// Combustion, one between), Hyperthermia (a 4s buff once a Combustion
// cycle), Pyroclasm, Fired Up and Glorious Incandescence; all but Sikeyzlol
// take Heat Shimmer.
//
// ── The Hot Streak engine, as the log shows it ─────────────────────────
// Heating Up (48107) comes from a crit of a Fire spell; a second crit turns
// it into Hot Streak! (48108), an instant Pyroblast or Flamestrike. Fire
// Blast (108853, off the GCD, charges) always crits. A crit while Hot Streak
// is up makes nothing: on all 12 player-pulls no Heating Up was ever applied
// while Hot Streak was up (0 of 1,679 gains), and no Fire Blast hit under it
// was followed by one. Hot Streak never ran out (1 of 1,591 removals without
// a Pyroblast or Flamestrike beside it, 0.13s before Portalscroll's death;
// longest span 13.3s), so it has no measured duration and isn't in procs.ts.
// Heating Up converts on 89–99% of its removals for everyone (Katbelle 117
// of 131, the top players 132–158 of 134–160).
//
// ── Fire Blast under Hot Streak (fireBlastUnderHotStreak) ──────────────
// A Fire Blast pressed while Hot Streak is already up spends its guaranteed
// crit on nothing: the Pyroblast first, then the Fire Blast, would have
// turned the Pyroblast's Heating Up into the next Hot Streak. The common
// shape is a double press (two Fire Blasts 0.5s apart after a Pyroblast,
// Katbelle 9 of her 18), or a Fire Blast pressed while a Pyroblast that
// lands as a crit is in flight. A press within REACT_MS of the Hot Streak
// gain isn't counted (no one can react to it).
// Value: one crit lost, half a Hot Streak, since every Hot Streak takes two
// crits: half of (the player's average Pyroblast hit − their average filler
// hit: Scorch, Fireball, Frostfire Bolt), in or out of Combustion as the
// press was, × their Ignite factor (1 + Ignite ÷ their direct core-spell
// damage: ×1.36–1.59). 53–74k a press outside Combustion, 97–135k inside.
// Inside Combustion a Fire Blast is often worth a whole Hot Streak (each
// Pyroblast's own crit makes the Heating Up a Fire Blast converts), but
// a player who double-presses Fire Blast there usually has charges to
// spare (Katbelle cast 17 Fire Blasts to 13 Pyroblasts at 0:15), so the
// half is kept there too.
// Measured (lost a pull): top players Émptinêss and Tinghao none, Экседо 40k
// (1), Reinyy 74k (1, 3:57), 小鸟游小埋 97k (1) and 213k (2), Broadum 304k (3;
// 1:20). Weaker: Katbelle 1.60M (16, 10 in Combustion; Vashnik 0:15.7–0:21.0,
// four double presses), Splean 547k (7), Wardaalsahra 227k (3), Portalscroll
// 135k (1), Sikeyzlol 57k (2). A small loss the top players make too, two to
// five times larger on the weaker.
//
// ── Combustion window (combustionWindow) ───────────────────────────────
// burstGcdFindings on the Combustion buff (190319), as ranged.ts's shared
// window was, but the premium is the player's own core damage per GCD press
// inside Combustion ÷ outside, less one (+72–280% on the 12; see below). The
// shared bonus read only non-crit hits, nearly none inside Combustion, and
// capped at 30%. Measured: none on the seven top players; Splean 2.25M (0:25
// on Vashnik: 8 of 13 GCDs, four Fire Blasts back to back), Wardaalsahra
// 331k (2:08), Sikeyzlol 215k (0:09), Katbelle 187k (1:25, 3:29). With the
// shared bonus these read 41–347k.
//
// ── Combustion's worth per use (combustionValue) ───────────────────────
// The tracked Combustion (60s; tracked-cooldowns.ts) had no hits of its own,
// so a lost use was worth 0 and its drift never showed. Its cooldown is a
// flat 60s on every top player outside Stasis (60.0–63.9s between presses
// on Entombed Sentinels; Vashnik's top players press every 83–86s, held for
// the Venoms after each Imbibe, which the fight's hold windows excuse;
// Splean on Vashnik pressed at 60.0s and 63.3s). The crits it adds don't
// shorten it (32–55 crits per cycle, interval unchanged).
// A use is worth what its window adds: the player's core damage per GCD
// press (Pyroblast, Fire Blast, Scorch, Fireball, Flamestrike, Frostfire
// Bolt hits) inside Combustion minus outside, × their presses per window,
// × their Ignite factor. Per press, so downtime outside doesn't inflate it;
// Meteor, trinkets and pets are left out. Measured ×1.7–3.8 per press: a
// use is 1.4–2.8M on Entombed Sentinels (Émptinêss 2.56M), 1.8–7.8M on
// Vashnik (Flamestrike into the Venoms' adds: Tinghao 6.14M, 小鸟游小埋
// 7.77M).

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { JobCheck, Moment } from "../../types";
import { finding } from "../../checks";
import { mergeWindows, inWindows } from "../../timeline";
import { burstGcdFindings, k } from "./shared";

const COMBUSTION = 190319;
const HOT_STREAK = 48108;
const FIRE_BLAST = 108853;
const REACT_MS = 150;
const HIT_TRAVEL_MS = 1_000;
// Core spells: their hits (by name) price Combustion and Hot Streak.
const CORE = new Set(["Pyroblast", "Fire Blast", "Scorch", "Fireball", "Flamestrike", "Frostfire Bolt", "Phoenix Flames"]);
const FILLERS = new Set(["Scorch", "Fireball", "Frostfire Bolt"]);
// GCD presses: Pyroblast, Scorch, Fireball, Flamestrike, Frostfire Bolt, Phoenix Flames.
const GCD_PRESSES = new Set([11366, 2948, 133, 2120, 431044, 257541]);

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
// Mean, not median: a Pyroblast crit is ~3× its normal hit, so a median
// of that two-humped set lands on one side or the other.
const mean = (xs: number[]) => xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : NaN;

function ownWindows(player: PlayerInfo, id: number, endMs: number) {
  const ws: { startMs: number; endMs: number }[] = [];
  let st: number | undefined;
  for (const b of (player.buffs ?? []).filter((b) => b.abilityId === id && b.source === player.name).sort((a, b) => a.timestamp - b.timestamp)) {
    if (b.buffStatus === "applied" && st === undefined) st = b.timestamp;
    else if (b.buffStatus === "removed" && st !== undefined) { ws.push({ startMs: st, endMs: b.timestamp }); st = undefined; }
  }
  if (st !== undefined) ws.push({ startMs: st, endMs });
  return ws.filter((w) => w.startMs < endMs);
}

/** Ignite ÷ the player's direct core-spell damage: what each Fire hit adds again as Ignite. */
function igniteFactor(player: PlayerInfo, endMs: number): number {
  const own = player.damageDone.filter((e) => !e.pet && e.timestamp < endMs);
  const ignite = own.filter((e) => e.abilityName === "Ignite").reduce((a, e) => a + (e.amount ?? 0), 0);
  const core = own.filter((e) => !e.isDoT && CORE.has(e.abilityName)).reduce((a, e) => a + (e.amount ?? 0), 0);
  return core > 0 ? 1 + ignite / core : 1;
}

/** Core damage per GCD press inside Combustion and outside it, and the presses inside. */
function combustionPresses(player: PlayerInfo, endMs: number) {
  const ws = ownWindows(player, COMBUSTION, endMs).filter((w) => w.endMs <= endMs);
  if (ws.length === 0) return undefined;
  const pressedIn = (t: number) => ws.some((w) => t >= w.startMs && t <= w.endMs);
  const hitIn = (t: number) => ws.some((w) => t >= w.startMs && t <= w.endMs + HIT_TRAVEL_MS);
  let dIn = 0, dOut = 0;
  for (const e of player.damageDone) {
    if (e.pet || e.isDoT || e.timestamp >= endMs || !CORE.has(e.abilityName)) continue;
    if (hitIn(e.timestamp)) dIn += e.amount ?? 0; else dOut += e.amount ?? 0;
  }
  const presses = player.casts.filter((c) => !c.fake && GCD_PRESSES.has(c.abilityId) && c.timestamp < endMs);
  const nIn = presses.filter((c) => pressedIn(c.timestamp)).length;
  const nOut = presses.length - nIn;
  if (nIn === 0 || nOut === 0) return undefined;
  return { perIn: dIn / nIn, perOut: dOut / nOut, nIn, windows: ws.length };
}

/** One Combustion's worth: core damage per GCD press inside it minus outside, × presses per window, × Ignite. */
export function combustionValue(player: PlayerInfo, endMs: number): { value: number; basis: string } | undefined {
  const m = combustionPresses(player, endMs);
  if (!m) return undefined;
  const fac = igniteFactor(player, endMs);
  const value = (m.perIn - m.perOut) * (m.nIn / m.windows) * fac;
  if (!(value > 0)) return undefined;
  return {
    value,
    basis: `${k(value)} a Combustion: (${k(m.perIn)} core damage per press inside − ${k(m.perOut)} outside) × ${(m.nIn / m.windows).toFixed(1)} presses a window (${m.windows} windows) × ${fac.toFixed(2)} Ignite`,
  };
}

// Idle inside Combustion: burstGcdFindings with the window's premium per
// press measured as above (inside ÷ outside − 1), in place of the shared
// observedWindowBonus, which reads only non-crit hits (nearly none inside
// Combustion) and caps at 30%.
const combustionWindow: JobCheck = (ctx) => {
  const m = combustionPresses(ctx.player, ctx.endMs);
  const bonus = m && m.perOut > 0 ? Math.max(0, m.perIn / m.perOut - 1) : 0;
  if (!m || bonus <= 0) return [];
  return burstGcdFindings(ctx, {
    statusId: COMBUSTION, name: "Combustion",
    bonus: () => bonus,
    bonusBasis: `the player's core damage per press inside Combustion ${k(m.perIn)} ÷ outside ${k(m.perOut)}, less one`,
    inference: true,
  });
};

const fireBlastUnderHotStreak: JobCheck = (ctx) => {
  const p = ctx.player;
  const hs = ownWindows(p, HOT_STREAK, ctx.endMs);
  if (hs.length === 0) return [];
  const comb = ownWindows(p, COMBUSTION, ctx.endMs);
  const inComb = (t: number) => comb.some((w) => t >= w.startMs && t <= w.endMs);
  const forced = mergeWindows(ctx.forced);
  const fac = igniteFactor(p, ctx.endMs);
  const hits = (names: Set<string>, c: boolean) => p.damageDone
    .filter((e) => !e.pet && !e.isDoT && names.has(e.abilityName) && e.timestamp < ctx.endMs &&
      comb.some((w) => e.timestamp >= w.startMs && e.timestamp <= w.endMs + HIT_TRAVEL_MS) === c)
    .map((e) => e.amount ?? 0);
  const PYRO = new Set(["Pyroblast"]);
  const priced = (c: boolean) => {
    const pyro = mean(hits(PYRO, c)), fill = mean(hits(FILLERS, c));
    const pyroAny = Number.isFinite(pyro) ? pyro : mean(hits(PYRO, !c));
    const fillAny = Number.isFinite(fill) ? fill : mean(hits(FILLERS, !c));
    if (!Number.isFinite(pyroAny) || !Number.isFinite(fillAny)) return { each: 0, pyro: 0, fill: 0 };
    return { each: Math.max(0, 0.5 * (pyroAny - fillAny) * fac), pyro: pyroAny, fill: fillAny };
  };
  const price = { in: priced(true), out: priced(false) };
  const moments: Moment[] = [];
  for (const c of p.casts) {
    if (c.fake || c.abilityId !== FIRE_BLAST || c.timestamp >= ctx.endMs || inWindows(c.timestamp, forced)) continue;
    const w = hs.find((x) => c.timestamp >= x.startMs + REACT_MS && c.timestamp < x.endMs - 5);
    if (!w) continue;
    const ic = inComb(c.timestamp);
    const v = ic ? price.in : price.out;
    if (v.each <= 0) continue;
    moments.push({ startMs: c.timestamp, endMs: c.timestamp, lostDamage: v.each,
      detail: `Fire Blast at ${clock(c.timestamp)}${ic ? " in Combustion" : ""}, ${((c.timestamp - w.startMs) / 1000).toFixed(2)}s into a Hot Streak: its crit made nothing` });
  }
  if (moments.length === 0) return [];
  const nIn = moments.filter((m) => inComb(m.startMs)).length;
  return [finding(ctx, {
    kind: "proc-lost", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Fire Blast under Hot Streak",
    lostDamage: moments.reduce((a, m) => a + (m.lostDamage ?? 0), 0),
    basis: `each a lost crit, half a Hot Streak: ½ × (average Pyroblast − average filler hit) × ${fac.toFixed(2)} Ignite; ` +
      `${k(price.out.each)} outside Combustion (${k(price.out.pyro)} − ${k(price.out.fill)}), ${k(price.in.each)} inside (${k(price.in.pyro)} − ${k(price.in.fill)})`,
    detail: `${moments.length} Fire Blast${moments.length > 1 ? "s" : ""} pressed while Hot Streak was already up (${nIn} in Combustion): a Pyroblast first would have let ${moments.length > 1 ? "them" : "it"} make the next Hot Streak`,
    moments,
  })];
};

export const FIRE_CHECKS: JobCheck[] = [combustionWindow, fireBlastUnderHotStreak];
