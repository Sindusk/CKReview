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
// Not built: Addersting. It comes from Eukrasian Diagnosis / Prognosis
// shields breaking, and the shield statuses aren't in the buff stream.
//
//   Copyright (c) 2018 Saxon Landers & contributors
//   MIT License; full text in THIRD_PARTY_NOTICES.md.

import type { GaugeTrack } from "../../types";
import type { PlayerCheckContext } from "../../checks";
import { XIVA_ACTIONS as A } from "../xiva-data";

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

export const JOB_GAUGES: Record<string, ((ctx: PlayerCheckContext) => GaugeTrack[])[]> = {
  "Sage": [addersgall],
  "Paladin": [oathGauge],
};
