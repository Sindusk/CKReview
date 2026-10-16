// lib/damage/ffxiv/jobs/gauges.ts
//
// Job gauges for the Damage dialog's timeline, simulated from casts (the
// log never states them). Display only: no findings.
//
// Sage's Addersgall, after xivanalysis src/parser/jobs/sge/modules/Gauge.tsx:
//   - 3 stacks at most; the pull starts full (the user, 2026-10-12) with
//     the 20s generation timer stopped
//   - Druochole, Ixochole, Kerachole and Taurochole spend 1 and restart the
//     timer if it was stopped
//   - the timer adds 1 when it completes, and stops at 3
//   - Rhizomata adds 1; if that reaches 3, the timer's progress is lost
//   - a death restarts the timer (xivanalysis: "restarts immediately on
//     death, not after raising")
// Time at 3 with the timer stopped is generation lost: one stack per 20s.
// A spend the simulation says had no stack means the model or the log is
// off; the note says how many.
// Addersting is its own lane (addersting, below): the shields aren't in
// the buff stream, but their absorbs and removals are in the healing one.
//
//   Copyright (c) 2018 Saxon Landers & contributors
//   MIT License; full text in THIRD_PARTY_NOTICES.md.

import type { GaugeTrack } from "../../types";
import type { PlayerCheckContext } from "../../checks";
import { XIVA_ACTIONS as A, XIVA_STATUSES as S } from "../xiva-data";
import { beastGaugeSpec } from "./pld-war";
import { blmGaugeTracks, paletteSpec } from "./caster";
import { firstmindsFocusSpec, rattlingCoilSpec } from "./melee";
import { gaugeCastTimes, gaugeTrack, statusWindows } from "./shared";

const ADDERSGALL_MAX = 3;
const ADDERSGALL_TIMER_MS = 20_000;
const ADDERSGALL_SPENDERS = new Set(
  ["DRUOCHOLE", "IXOCHOLE", "KERACHOLE", "TAUROCHOLE"].map((k) => A[k]?.id).filter((id): id is number => id !== undefined),
);

export function addersgall(ctx: PlayerCheckContext): GaugeTrack[] {
  const rhizomata = A.RHIZOMATA?.id;
  type Ev = { t: number; kind: "spend" | "gain" | "death" };
  const events: Ev[] = [
    ...ctx.player.casts.filter((c) => ADDERSGALL_SPENDERS.has(c.abilityId)).map((c) => ({ t: c.timestamp, kind: "spend" as const })),
    ...ctx.player.casts.filter((c) => c.abilityId === rhizomata).map((c) => ({ t: c.timestamp, kind: "gain" as const })),
    ...ctx.dead.map((w) => ({ t: w.startMs, kind: "death" as const })),
  ].filter((e) => e.t < ctx.endMs).sort((a, b) => a.t - b.t);

  let value = ADDERSGALL_MAX;
  let timerFrom: number | null = null;
  let cappedSince: number | null = 0;
  let short = 0;
  const steps: GaugeTrack["steps"] = [{ t: 0, value }];
  const capped: GaugeTrack["capped"] = [];
  const set = (t: number, v: number) => {
    value = v;
    if (steps[steps.length - 1].t === t) steps[steps.length - 1].value = v;
    else steps.push({ t, value: v });
  };
  const stopCapped = (t: number) => {
    if (cappedSince !== null && t > cappedSince) capped.push({ startMs: cappedSince, endMs: t });
    cappedSince = null;
  };
  const advance = (to: number) => {
    while (timerFrom !== null && timerFrom + ADDERSGALL_TIMER_MS <= to) {
      const t = timerFrom + ADDERSGALL_TIMER_MS;
      set(t, Math.min(ADDERSGALL_MAX, value + 1));
      if (value >= ADDERSGALL_MAX) { timerFrom = null; cappedSince = t; } else timerFrom = t;
    }
  };
  for (const e of events) {
    advance(e.t);
    if (e.kind === "spend") {
      if (value <= 0) { short++; continue; }
      set(e.t, value - 1);
      if (timerFrom === null) { stopCapped(e.t); timerFrom = e.t; }
    } else if (e.kind === "gain") {
      set(e.t, Math.min(ADDERSGALL_MAX, value + 1));
      if (value >= ADDERSGALL_MAX && timerFrom !== null) { timerFrom = null; cappedSince = e.t; }
    } else if (value < ADDERSGALL_MAX) {
      // A death restarts the timer (its progress is lost); at the cap it
      // would complete into nothing.
      timerFrom = e.t;
    }
  }
  advance(ctx.endMs);
  stopCapped(ctx.endMs);

  const cappedMs = capped.reduce((a, w) => a + w.endMs - w.startMs, 0);
  const lost = Math.floor(cappedMs / ADDERSGALL_TIMER_MS);
  return [{
    name: "Addersgall", max: ADDERSGALL_MAX, steps, capped,
    note: `${lost} stack${lost === 1 ? "" : "s"} of generation lost at the cap (${Math.round(cappedMs / 1000)}s at 3 with the timer stopped)` +
      (short > 0 ? `; ${short} spend${short === 1 ? "" : "s"} the simulation had no stack for (model or log off)` : ""),
  }];
}

// Sage's Addersting, after xivanalysis sge/modules/Gauge.tsx: 3 at most, the
// pull starts full; +1 when the Sage's Eukrasian Diagnosis on anyone, or
// Eukrasian Prognosis on the Sage, breaks; −1 per Toxikon / Toxikon II. A
// shield breaks when its removal (PlayerInfo.shieldRemovals) comes in the
// same instant as a hit it absorbed; one that ran out, was taken by Pepsis
// or overwritten by another healer's shield ends with no absorb beside it.
// A sting gained at 3 is lost (amber tick). A death empties it (xivanalysis
// resets gauges on death). Display only: Toxikon is the movement GCD.
// Pulls fetched before 2026-10-14 have no shield removals: no lane.
const ADDERSTING_MAX = 3;
const SHIELD_BREAK_MS = 20;

export function addersting(ctx: PlayerCheckContext): GaugeTrack[] {
  const diag = S.EUKRASIAN_DIAGNOSIS?.id, prog = S.EUKRASIAN_PROGNOSIS?.id;
  if (diag === undefined || prog === undefined) return [];
  if (!ctx.pull.players.some((p) => p.shieldRemovals !== undefined)) return [];
  const toxikon = idSet(["TOXIKON", "TOXIKON_II"]);
  type Ev = { t: number; kind: "gain" | "spend" | "death"; label?: string };
  const events: Ev[] = [];
  for (const p of ctx.pull.players) {
    for (const r of p.shieldRemovals ?? []) {
      if (r.caster !== ctx.player.name) continue;
      if (!(r.statusId === diag || (r.statusId === prog && p.name === ctx.player.name))) continue;
      const broke = (p.shieldAbsorbs ?? []).some((a) => a.statusId === r.statusId && a.caster === r.caster &&
        a.amount > 0 && Math.abs(a.timestamp - r.timestamp) <= SHIELD_BREAK_MS);
      if (broke) events.push({ t: r.timestamp, kind: "gain", label: `${r.statusId === diag ? "Eukrasian Diagnosis" : "Eukrasian Prognosis"} broke${p.name !== ctx.player.name ? ` on ${p.name}` : ""}` });
    }
  }
  for (const c of ctx.player.casts) if (toxikon.has(c.abilityId)) events.push({ t: c.timestamp, kind: "spend" });
  for (const d of ctx.dead) events.push({ t: d.startMs, kind: "death" });
  events.sort((a, b) => a.t - b.t);
  let value = ADDERSTING_MAX, lost = 0, short = 0, gained = 0;
  let cappedSince: number | null = 0;
  const steps: GaugeTrack["steps"] = [{ t: 0, value }];
  const capped: GaugeTrack["capped"] = [];
  const marks: NonNullable<GaugeTrack["marks"]> = [];
  const set = (t: number, v: number) => {
    if (cappedSince !== null && v < ADDERSTING_MAX) { if (t > cappedSince) capped.push({ startMs: cappedSince, endMs: t }); cappedSince = null; }
    else if (cappedSince === null && v >= ADDERSTING_MAX) cappedSince = t;
    value = v;
    if (steps[steps.length - 1].t === t) steps[steps.length - 1].value = v;
    else steps.push({ t, value: v });
  };
  for (const e of events) {
    if (e.t >= ctx.endMs) break;
    if (e.kind === "gain") {
      gained++;
      if (value >= ADDERSTING_MAX) { lost++; marks.push({ t: e.t, label: `${e.label}: Addersting lost at the cap`, tone: "lost" }); continue; }
      marks.push({ t: e.t, label: `${e.label}: +1 Addersting`, tone: "use" });
      set(e.t, value + 1);
    } else if (e.kind === "spend") {
      if (value <= 0) { short++; continue; }
      set(e.t, value - 1);
    } else set(e.t, 0);
  }
  if (cappedSince !== null && ctx.endMs > cappedSince) capped.push({ startMs: cappedSince, endMs: ctx.endMs });
  return [{
    name: "Addersting", max: ADDERSTING_MAX, steps, capped, marks,
    note: `${gained} shield${gained === 1 ? "" : "s"} broke, ${lost} Addersting lost at the cap` +
      (short > 0 ? `; ${short} Toxikon${short === 1 ? "" : "s"} the simulation had no Addersting for (model or log off)` : "") +
      "; display only: Toxikon is the movement GCD",
  }];
}

// Paladin's Oath Gauge, after xivanalysis src/parser/jobs/pld/modules/Gauge.tsx:
//   - 100 at most; the pull starts full
//   - +5 per auto-attack; the app keeps autos out of the cast stream, so
//     each Attack hit counts, unlanded ones too (one per swing: they're
//     1.7s+ apart on K6qfMamL7rN8yz2Q's Vamp Fatale kill)
//   - Sheltron, Holy Sheltron, Intervention and Cover spend 50
// Gauge past 100 is lost; it buys Holy Sheltron / Intervention, which is
// mitigation, so it's shown, not counted. Checked on K6qfMamL7rN8yz2Q
// Vamp Fatale: 570 over the cap, as xivanalysis says. Not modelled (nor by
// xivanalysis): a death's effect on the gauge.
const OATH_MAX = 100;
const OATH_PER_AUTO = 5;
const OATH_COST = 50;
const OATH_SPENDERS = new Set(
  ["SHELTRON", "HOLY_SHELTRON", "INTERVENTION", "COVER"].map((k) => A[k]?.id).filter((id): id is number => id !== undefined),
);

export function oathGauge(ctx: PlayerCheckContext): GaugeTrack[] {
  const attack = A.ATTACK?.id;
  const autos = [...ctx.player.damageDone, ...(ctx.player.unlandedHits ?? [])]
    .filter((e) => e.abilityId === attack && !e.pet && e.timestamp < ctx.endMs);
  if (autos.length === 0) return [];
  const events = [
    ...autos.map((e) => ({ t: e.timestamp, spend: false })),
    ...ctx.player.casts.filter((c) => OATH_SPENDERS.has(c.abilityId) && c.timestamp < ctx.endMs).map((c) => ({ t: c.timestamp, spend: true })),
  ].sort((a, b) => a.t - b.t);

  let value = OATH_MAX, over = 0, short = 0;
  let cappedSince: number | null = 0;
  const steps: GaugeTrack["steps"] = [{ t: 0, value }];
  const capped: GaugeTrack["capped"] = [];
  const set = (t: number, v: number) => {
    value = v;
    if (steps[steps.length - 1].t === t) steps[steps.length - 1].value = v;
    else steps.push({ t, value: v });
  };
  for (const e of events) {
    if (e.spend) {
      if (value < OATH_COST) { short++; continue; }
      if (cappedSince !== null && e.t > cappedSince) capped.push({ startMs: cappedSince, endMs: e.t });
      cappedSince = null;
      set(e.t, value - OATH_COST);
    } else if (value + OATH_PER_AUTO > OATH_MAX) {
      over += value + OATH_PER_AUTO - OATH_MAX;
      if (value < OATH_MAX) { set(e.t, OATH_MAX); cappedSince = e.t; }
    } else {
      set(e.t, value + OATH_PER_AUTO);
      if (value >= OATH_MAX) cappedSince = e.t;
    }
  }
  if (cappedSince !== null && ctx.endMs > cappedSince) capped.push({ startMs: cappedSince, endMs: ctx.endMs });

  return [{
    name: "Oath", max: OATH_MAX, steps, capped,
    note: `${over} gauge lost at the cap (${Math.round(over / OATH_COST * 10) / 10} Holy Sheltrons; mitigation, not counted)` +
      (short > 0 ? `; ${short} spend${short === 1 ? "" : "s"} the simulation had no gauge for (model or log off)` : ""),
  }];
}

// Dancer's Feathers and Esprit, after xivanalysis src/parser/jobs/dnc/modules/Gauge.tsx
// (its simulation for logs without gauge events, which FFLogs never has).
// Both are estimates: the log doesn't show the gauge, and generation is
// random, so findings from them name the overcap but carry no loss (user,
// 2026-10-14).
//   Feathers (max 4, start 0): +0.5 per Reverse Cascade, Fountainfall,
//   Rising Windmill or Bloodshower (a 50% proc, as its expected value);
//   −1 per Fan Dance / Fan Dance II.
//   Esprit (max 100, start 0), generated only while the generating player
//   has Esprit (Standard Finish's on the Dancer and partner, Technical
//   Finish's on everyone): the Dancer's Cascade / Fountain / Windmill /
//   Bladeshower +5, Reverse Cascade / Fountainfall / Rising Windmill /
//   Bloodshower +10, Tillana +50; each other player's GCD that hits
//   (one per cast, not per target; Ninjutsu and Tsubame left out) +10 ×
//   their job's rate (0.2, or its tested Monk 0.17, Dragoon 0.18, Ninja
//   0.16, Samurai 0.19, Black Mage 0.25, Red Mage 0.21). −50 per Saber
//   Dance / Dance of the Dawn. None while the Dancer is dead.
// A death empties both (xivanalysis resets gauges on death). A spend with
// too little clamps at 0, as xivanalysis's running value does (it also
// redraws its graph backwards; the overcap is the same).
const FEATHER_MAX = 4;
const FEATHER_GENERATORS = ["REVERSE_CASCADE", "FOUNTAINFALL", "RISING_WINDMILL", "BLOODSHOWER"];
const FEATHER_SPENDERS = ["FAN_DANCE", "FAN_DANCE_II"];
const ESPRIT_MAX = 100;
const ESPRIT_COST = 50;
const ESPRIT_SELF: [string, number][] = [
  ["CASCADE", 5], ["FOUNTAIN", 5], ["WINDMILL", 5], ["BLADESHOWER", 5],
  ["REVERSE_CASCADE", 10], ["FOUNTAINFALL", 10], ["RISING_WINDMILL", 10], ["BLOODSHOWER", 10],
  ["TILLANA", 50],
];
const ESPRIT_SPENDERS = ["SABER_DANCE", "DANCE_OF_THE_DAWN"];
const ESPRIT_PARTY_AMOUNT = 10;
const ESPRIT_PARTY_RATE = 0.2;
const ESPRIT_PARTY_RATES = new Map([
  ["Monk", 0.17], ["Dragoon", 0.18], ["Ninja", 0.16], ["Samurai", 0.19], ["BlackMage", 0.25], ["Black Mage", 0.25], ["RedMage", 0.21], ["Red Mage", 0.21],
]);
const ESPRIT_PARTY_EXCEPTIONS = [
  "FUMA_SHURIKEN", "FUMA_SHURIKEN_TCJ_TEN", "FUMA_SHURIKEN_TCJ_CHI", "FUMA_SHURIKEN_TCJ_JIN", "KATON", "KATON_TCJ",
  "RAITON_TCJ", "HYOTON_TCJ", "GOKA_MEKKYAKU", "HYOSHO_RANRYU", "SUITON", "SUITON_TCJ",
  "KAESHI_GOKEN", "KAESHI_SETSUGEKKA", "KAESHI_NAMIKIRI",
];
const ESPRIT_STATUS_KEYS = ["ESPRIT", "ESPRIT_TECHNICAL"];
const idSet = (keys: string[]) => new Set(keys.map((k) => A[k]?.id).filter((id): id is number => id !== undefined));

export type GaugeOvercap = { t: number; amount: number };
export type SimulatedGauge = { track: GaugeTrack; overcap: number; overcaps: GaugeOvercap[] };

function simulate(name: string, max: number, events: { t: number; delta: number }[], ctx: PlayerCheckContext,
  note: (over: number, short: number) => string): SimulatedGauge {
  const all = [...events, ...ctx.dead.map((w) => ({ t: w.startMs, delta: Number.NEGATIVE_INFINITY }))]
    .filter((e) => e.t < ctx.endMs).sort((a, b) => a.t - b.t);
  let value = 0, over = 0, short = 0;
  let cappedSince: number | null = null;
  const steps: GaugeTrack["steps"] = [{ t: 0, value }];
  const capped: GaugeTrack["capped"] = [];
  const overcaps: GaugeOvercap[] = [];
  const set = (t: number, v: number) => {
    if (cappedSince !== null && v < max) { if (t > cappedSince) capped.push({ startMs: cappedSince, endMs: t }); cappedSince = null; }
    if (cappedSince === null && v >= max && value < max) cappedSince = t;
    value = v;
    if (steps[steps.length - 1].t === t) steps[steps.length - 1].value = v;
    else steps.push({ t, value: v });
  };
  for (const e of all) {
    if (e.delta === Number.NEGATIVE_INFINITY) { set(e.t, 0); continue; }
    const next = value + e.delta;
    if (next > max) { over += next - max; overcaps.push({ t: e.t, amount: next - max }); set(e.t, max); }
    else if (next < 0) { short++; set(e.t, 0); }
    else set(e.t, next);
  }
  if (cappedSince !== null && ctx.endMs > cappedSince) capped.push({ startMs: cappedSince, endMs: ctx.endMs });
  return { track: { name, max, steps, capped, note: note(over, short) }, overcap: over, overcaps };
}

const shortNote = (short: number, unit: string) =>
  short > 0 ? `; ${short} spend${short === 1 ? "" : "s"} with under a ${unit} in the estimate` : "";

export function featherGauge(ctx: PlayerCheckContext): SimulatedGauge {
  const gen = idSet(FEATHER_GENERATORS), spend = idSet(FEATHER_SPENDERS);
  const events = ctx.player.casts.filter((c) => gen.has(c.abilityId) || spend.has(c.abilityId))
    .map((c) => ({ t: c.timestamp, delta: gen.has(c.abilityId) ? 0.5 : -1 }));
  return simulate("Feathers", FEATHER_MAX, events, ctx, (over, short) =>
    `Estimated: ${Math.floor(over)} feather${Math.floor(over) === 1 ? "" : "s"} may have been lost at the cap (each proc counted as half a feather)` + shortNote(short, "feather"));
}

export function espritGauge(ctx: PlayerCheckContext): SimulatedGauge {
  const statusIds = new Set(ESPRIT_STATUS_KEYS.map((k) => S[k]?.id).filter((id): id is number => id !== undefined));
  const hasEsprit = (p: { buffs?: typeof ctx.player.buffs }) => {
    const out: { s: number; e: number }[] = [];
    let open: number | undefined;
    for (const b of [...(p.buffs ?? [])].filter((x) => statusIds.has(x.abilityId)).sort((a, b) => a.timestamp - b.timestamp)) {
      if (b.buffStatus === "removed") { if (open !== undefined) out.push({ s: open, e: b.timestamp }); open = undefined; }
      else if (b.buffStatus === "applied" && open === undefined) open = b.timestamp;
    }
    if (open !== undefined) out.push({ s: open, e: Infinity });
    return (t: number) => out.some((w) => t >= w.s && t <= w.e);
  };
  const self = new Map([...ESPRIT_SELF].filter(([k]) => A[k]).map(([k, n]) => [A[k].id, n]));
  const spend = idSet(ESPRIT_SPENDERS), skip = idSet(ESPRIT_PARTY_EXCEPTIONS);
  const deadAt = (t: number) => ctx.dead.some((w) => t >= w.startMs && t < w.endMs);
  const events: { t: number; delta: number }[] = [];
  const mine = hasEsprit(ctx.player);
  for (const c of ctx.player.casts) {
    const n = self.get(c.abilityId);
    if (n !== undefined && mine(c.timestamp) && !deadAt(c.timestamp)) events.push({ t: c.timestamp, delta: n });
    if (spend.has(c.abilityId)) events.push({ t: c.timestamp, delta: -ESPRIT_COST });
  }
  for (const p of ctx.pull.players) {
    if (p.name === ctx.player.name) continue;
    const has = hasEsprit(p);
    const rate = ESPRIT_PARTY_RATES.get(p.className) ?? ESPRIT_PARTY_RATE;
    let last: { id: number; t: number } | undefined;
    for (const h of [...p.damageDone].sort((a, b) => a.timestamp - b.timestamp)) {
      if (h.pet || h.isDoT || skip.has(h.abilityId) || !ctx.game.action(h.abilityId)?.onGcd) continue;
      if (last && last.id === h.abilityId && h.timestamp - last.t <= 100) continue; // one per cast, not per target
      last = { id: h.abilityId, t: h.timestamp };
      if (has(h.timestamp) && !deadAt(h.timestamp)) events.push({ t: h.timestamp, delta: ESPRIT_PARTY_AMOUNT * rate });
    }
  }
  return simulate("Esprit", ESPRIT_MAX, events, ctx, (over, short) =>
    `Estimated: ${Math.floor(over / ESPRIT_COST)} Saber Dance${Math.floor(over / ESPRIT_COST) === 1 ? "" : "s"} may have been lost at the cap (${Math.round(over)} Esprit over; the party's share is an average rate)` +
    shortNote(short, "Saber Dance's worth"));
}

const dancerGauges = (ctx: PlayerCheckContext): GaugeTrack[] => [featherGauge(ctx).track, espritGauge(ctx).track];

// Astrologian's Arcana (the card spread), after xivanalysis
// src/parser/jobs/ast/modules/ArcanaTracking: Astral Draw deals The Balance,
// The Arrow, The Spire and Lord of Crowns; Umbral Draw The Spear, The Bole,
// The Ewer and Lady of Crowns. Each play takes its card out; the next Draw
// replaces whatever is left. The lane's height is the cards held (0-4);
// each play is a tick naming the card and its target, and each card a Draw
// replaced unplayed is an amber tick. Display only: the damage cards'
// losses are the `cards` check's (healer.ts). The first spread can come
// from a pre-pull Draw: a card played before the first Draw starts the
// pull with that card's whole spread (as xivanalysis approximates it).
// Not modelled: a death (the spread is kept through it in game, as far as
// we know; xivanalysis doesn't reset it either).
const ARCANA_SPREADS: [string, string[]][] = [
  ["ASTRAL_DRAW", ["THE_BALANCE", "THE_ARROW", "THE_SPIRE", "LORD_OF_CROWNS"]],
  ["UMBRAL_DRAW", ["THE_SPEAR", "THE_BOLE", "THE_EWER", "LADY_OF_CROWNS"]],
];

export function arcana(ctx: PlayerCheckContext): GaugeTrack[] {
  const spreads = ARCANA_SPREADS.filter(([d, cs]) => A[d] && cs.every((c) => A[c]))
    .map(([d, cs]) => ({ draw: A[d].id, cards: cs.map((c) => A[c].id) }));
  if (spreads.length < 2) return [];
  const drawOf = new Map(spreads.map((s) => [s.draw, s.cards]));
  const cardIds = new Set(spreads.flatMap((s) => s.cards));
  const events = ctx.player.casts.filter((c) => (drawOf.has(c.abilityId) || cardIds.has(c.abilityId)) && c.timestamp < ctx.endMs)
    .sort((a, b) => a.timestamp - b.timestamp);
  if (events.length === 0) return [];
  const name = (id: number) => ctx.game.action(id)?.name ?? String(id);
  const party = new Set(ctx.pull.players.map((p) => p.name));
  let held = new Set<number>();
  const firstDraw = events.findIndex((e) => drawOf.has(e.abilityId));
  const prePull = events.slice(0, firstDraw < 0 ? events.length : firstDraw).find((e) => cardIds.has(e.abilityId));
  if (prePull) held = new Set(spreads.find((s) => s.cards.includes(prePull.abilityId))!.cards);
  const steps: GaugeTrack["steps"] = [{ t: 0, value: held.size }];
  const marks: NonNullable<GaugeTrack["marks"]> = [];
  const set = (t: number) => {
    if (steps[steps.length - 1].t === t) steps[steps.length - 1].value = held.size;
    else steps.push({ t, value: held.size });
  };
  let plays = 0, lost = 0;
  for (const e of events) {
    const dealt = drawOf.get(e.abilityId);
    if (dealt) {
      for (const c of held) { marks.push({ t: e.timestamp, label: `${name(c)} replaced unplayed by ${e.abilityName}`, tone: "lost" }); lost++; }
      held = new Set(dealt);
    } else {
      held.delete(e.abilityId);
      plays++;
      marks.push({ t: e.timestamp, label: `${e.abilityName}${e.target && party.has(e.target) ? ` on ${e.target === ctx.player.name ? "self" : e.target}` : ""}`, tone: "use" });
    }
    set(e.timestamp);
  }
  return [{
    name: "Arcana", max: 4, steps, capped: [], marks,
    note: `${plays} card${plays === 1 ? "" : "s"} played, ${lost} replaced unplayed by the next Draw (the damage cards' losses are their own findings)`,
  }];
}

// Pictomancer's Paint, after xivanalysis src/parser/jobs/pct/modules/Gauge.tsx
// (5 at most, start 0): a White Paint per Water / Water II in Blue, Thunder /
// Thunder II in Magenta or Rainbow Drip cast (with the cast, hit or not:
// shared.ts gaugeCastTimes; xivanalysis waits for a successful hit); Holy in White spends a
// White, Comet in Black the Black. Subtractive Palette turns a White into
// the Black (or, with none held, the next White comes as the Black); with
// Monochrome Tones still up it does nothing (that overwrite is its own
// finding, caster.ts). A paint generated at 5 is lost: an amber tick. A
// death empties it. Display only: White Paint is mostly the movement
// tool, Holy in White in place of a cast that couldn't be made.
const PAINT_MAX = 5;
const WHITE_GENERATORS = ["WATER_IN_BLUE", "WATER_II_IN_BLUE", "THUNDER_IN_MAGENTA", "THUNDER_II_IN_MAGENTA", "RAINBOW_DRIP"];

export function paint(ctx: PlayerCheckContext): GaugeTrack[] {
  const sp = A.SUBTRACTIVE_PALETTE?.id, holy = A.HOLY_IN_WHITE?.id, comet = A.COMET_IN_BLACK?.id;
  if (sp === undefined || holy === undefined || comet === undefined) return [];
  type Ev = { t: number; kind: "white" | "holy" | "comet" | "sp" | "death" };
  const events: Ev[] = [];
  for (const id of idSet(WHITE_GENERATORS)) for (const t of gaugeCastTimes(ctx, id)) events.push({ t, kind: "white" });
  for (const c of ctx.player.casts) {
    if (c.abilityId === holy) events.push({ t: c.timestamp, kind: "holy" });
    else if (c.abilityId === comet) events.push({ t: c.timestamp, kind: "comet" });
    else if (c.abilityId === sp) events.push({ t: c.timestamp, kind: "sp" });
  }
  if (!events.some((e) => e.kind === "sp")) return [];
  for (const d of ctx.dead) events.push({ t: d.startMs, kind: "death" });
  events.sort((a, b) => a.t - b.t);
  const tones = statusWindows(ctx, S.MONOCHROME_TONES.id);
  let white = 0, black = 0, nextIsBlack = false, lost = 0, short = 0;
  let cappedSince: number | null = null;
  const steps: GaugeTrack["steps"] = [{ t: 0, value: 0 }];
  const capped: GaugeTrack["capped"] = [];
  const marks: NonNullable<GaugeTrack["marks"]> = [];
  const set = (t: number) => {
    const v = white + black;
    if (cappedSince !== null && v < PAINT_MAX) { if (t > cappedSince) capped.push({ startMs: cappedSince, endMs: t }); cappedSince = null; }
    else if (cappedSince === null && v >= PAINT_MAX) cappedSince = t;
    if (steps[steps.length - 1].t === t) steps[steps.length - 1].value = v;
    else steps.push({ t, value: v });
  };
  for (const e of events) {
    if (e.t >= ctx.endMs) break;
    if (e.kind === "white") {
      if (white + black >= PAINT_MAX) { lost++; marks.push({ t: e.t, label: "Paint lost at the cap (5)", tone: "lost" }); continue; }
      if (nextIsBlack) { black++; nextIsBlack = false; } else white++;
    } else if (e.kind === "holy") {
      if (white > 0) white--; else short++;
    } else if (e.kind === "comet") {
      if (black > 0) black--; else short++;
      marks.push({ t: e.t, label: "Comet in Black (the Black Paint)", tone: "use" });
    } else if (e.kind === "sp") {
      if (tones.some((w) => w.startMs < e.t - 50 && w.endMs >= e.t)) continue;
      if (white > 0) { white--; black++; } else nextIsBlack = true;
    } else {
      white = 0; black = 0; nextIsBlack = false;
    }
    set(e.t);
  }
  if (cappedSince !== null && ctx.endMs > cappedSince) capped.push({ startMs: cappedSince, endMs: ctx.endMs });
  return [{
    name: "Paint", max: PAINT_MAX, steps, capped, marks,
    note: `${lost} paint lost at the cap (5)` +
      (short > 0 ? `; ${short} Holy / Comet the simulation had no paint for (model or log off)` : "") +
      "; ticks are Comets in Black. Display only: White Paint is mostly the movement tool",
  }];
}

// Viper's Serpent Offerings, after xivanalysis src/parser/jobs/vpr/modules/snilk.tsx
// (100 at most, start 0): Hunter's / Swiftskin's Coil and Den +5; the four
// finishers (Hindsbane, Hindsting, Flanksbane, Flanksting) and Jagged /
// Bloodied Maw +10; Reawaken −50 unless Ready to Reawaken (Serpent's
// Ire's free one) is up. Offerings gained at 100 are lost (amber tick);
// each Reawaken is a tick. A death empties it (xivanalysis resets gauges
// on death). Display only for now: what lost offerings cost isn't valued.
const OFFERINGS_MAX = 100;
const OFFERINGS_COST = 50;
const OFFERING_GAINS: [string, number][] = [
  ["HUNTERS_COIL", 5], ["SWIFTSKINS_COIL", 5], ["HUNTERS_DEN", 5], ["SWIFTSKINS_DEN", 5],
  ["HINDSBANE_FANG", 10], ["HINDSTING_STRIKE", 10], ["FLANKSBANE_FANG", 10], ["FLANKSTING_STRIKE", 10],
  ["JAGGED_MAW", 10], ["BLOODIED_MAW", 10],
];

export function serpentOfferings(ctx: PlayerCheckContext): GaugeTrack[] {
  const reawaken = A.REAWAKEN?.id, ready = S.READY_TO_REAWAKEN?.id;
  if (reawaken === undefined || ready === undefined) return [];
  const gains = new Map(OFFERING_GAINS.filter(([k]) => A[k]).map(([k, n]) => [A[k].id, n]));
  const free = statusWindows(ctx, ready);
  type Ev = { t: number; delta: number; label?: string; death?: boolean };
  const events: Ev[] = [];
  for (const c of ctx.player.casts) {
    const n = gains.get(c.abilityId);
    if (n !== undefined) events.push({ t: c.timestamp, delta: n });
    else if (c.abilityId === reawaken) {
      const isFree = free.some((w) => c.timestamp >= w.startMs && c.timestamp <= w.endMs + 200);
      events.push({ t: c.timestamp, delta: isFree ? 0 : -OFFERINGS_COST, label: isFree ? "Reawaken (Ready to Reawaken, free)" : "Reawaken (50 Offerings)" });
    }
  }
  for (const d of ctx.dead) events.push({ t: d.startMs, delta: 0, death: true });
  if (!events.some((e) => e.label)) return [];
  events.sort((a, b) => a.t - b.t);
  let value = 0, lost = 0, short = 0;
  let cappedSince: number | null = null;
  const steps: GaugeTrack["steps"] = [{ t: 0, value: 0 }];
  const capped: GaugeTrack["capped"] = [];
  const marks: NonNullable<GaugeTrack["marks"]> = [];
  const set = (t: number, v: number) => {
    if (cappedSince !== null && v < OFFERINGS_MAX) { if (t > cappedSince) capped.push({ startMs: cappedSince, endMs: t }); cappedSince = null; }
    else if (cappedSince === null && v >= OFFERINGS_MAX) cappedSince = t;
    value = v;
    if (steps[steps.length - 1].t === t) steps[steps.length - 1].value = v;
    else steps.push({ t, value: v });
  };
  for (const e of events) {
    if (e.t >= ctx.endMs) break;
    if (e.death) { set(e.t, 0); continue; }
    if (e.label) marks.push({ t: e.t, label: e.label, tone: "use" });
    const next = value + e.delta;
    if (next > OFFERINGS_MAX) {
      lost += next - OFFERINGS_MAX;
      marks.push({ t: e.t, label: `${next - OFFERINGS_MAX} Serpent Offerings lost at the cap`, tone: "lost" });
      set(e.t, OFFERINGS_MAX);
    } else if (next < 0) { short++; set(e.t, 0); }
    else set(e.t, next);
  }
  if (cappedSince !== null && ctx.endMs > cappedSince) capped.push({ startMs: cappedSince, endMs: ctx.endMs });
  return [{
    name: "Offerings", max: OFFERINGS_MAX, steps, capped, marks,
    note: `${lost} Serpent Offerings lost at the cap (${Math.floor(lost / OFFERINGS_COST)} Reawaken${Math.floor(lost / OFFERINGS_COST) === 1 ? "" : "s"}' worth); ${value} held at the end` +
      (short > 0 ? `; ${short} Reawaken${short === 1 ? "" : "s"} the simulation had no Offerings for (model or log off)` : "") +
      "; display only",
  }];
}

const viperGauges = (ctx: PlayerCheckContext): GaugeTrack[] => [gaugeTrack(ctx, rattlingCoilSpec(ctx), "Coils"), ...serpentOfferings(ctx)];

const pictomancerGauges = (ctx: PlayerCheckContext): GaugeTrack[] => {
  const spec = paletteSpec(ctx);
  return [...(spec ? [gaugeTrack(ctx, spec)] : []), ...paint(ctx)];
};

export const JOB_GAUGES: Record<string, ((ctx: PlayerCheckContext) => GaugeTrack[])[]> = {
  "Pictomancer": [pictomancerGauges],
  "Sage": [addersgall, addersting],
  // Firstminds' Focus: the overcap check's own simulation (melee.ts).
  "Dragoon": [(ctx) => [gaugeTrack(ctx, firstmindsFocusSpec(ctx), "Focus")]],
  "Viper": [viperGauges],
  "Paladin": [oathGauge],
  "Dancer": [dancerGauges],
  "Astrologian": [arcana],
  // Polyglot, Astral Fire, Umbral Ice, Hearts, Astral Soul, Paradox (caster.ts blmGauge).
  "Black Mage": [blmGaugeTracks],
  // Beast Gauge: the overcap check's own simulation (pld-war.ts beastGaugeSpec).
  "Warrior": [(ctx) => [gaugeTrack(ctx, beastGaugeSpec(ctx), "Beast")]],
};
