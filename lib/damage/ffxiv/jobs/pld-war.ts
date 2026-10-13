// lib/damage/ffxiv/jobs/pld-war.ts
//
// Paladin and Warrior checks (tank batch). Warrior was built from
// xivanalysis and the 7.x tooltips, then checked against xivanalysis on
// qjCMx4bRfgNKwX9T Dancing Mad kill (7.5, 2026-10-13). Matched: GCD
// uptime, Surging Tempest, the two weaving delays (6:09, 15:27), its 6
// Overpowers on one target (3 forced past HP checks), Onslaught drift
// (it says 2 lost; the drift engine 1, the other was the opener's normal
// hold). Built: Beast Gauge, its 60 overcapped exactly (30 from an
// Infuriate at 80 gauge at 16:11; three 10s past HP checks, forced).
// Not adopted:
// - Infuriate 29/30: simulated with its 5s reduction per spender, it sat
//   at two charges only in the P2-P3 downtime (6:31-7:10).
// - Upheaval 33/34: its 62s at full is spread over stretches that each
//   ended in downtime under 30s held; no stretch lost a use.
// - 3 tincture actions: the 1:59 and 13:03 tinctures had two Onslaughts
//   (the third charge went to movement before), worth the tincture's ~5%
//   of one Onslaught; the 18:03 one had one Inner Chaos because the
//   second Infuriate charge wasn't back before the kill.
//
// Paladin, checked against xivanalysis on jN3XDrf2z8PmLgRJ Vamp pull 8
// (2026-10-08): the window counts match its 7 missed actions and 1
// missed GCD. Fight or Flight is +25%, the FFLogs multiplier on a hit
// with only it up. Not checked here: Oath gauge overcap (xivanalysis
// reports it; it costs Holy Sheltrons, which is mitigation, not damage).
// Rechecked on 2T1HzdPKgbhM43am Dancing Mad fight 10 (2026-10-08): its 6
// missed GCDs and 10 missed fillers match these windows (the last window,
// cut by the kill, is skipped here). Its one missed Requiescat window was
// the Confiteor chain held past the P1 HP check into P2, which is right;
// its lost Expiacion / Circle of Scorn / Intervene uses were held across
// downtime into the next Fight or Flight.
//
// Fight or Flight, ported from
// xivanalysis src/parser/jobs/pld/modules/FightOrFlight.tsx: 8 GCDs;
// Goring Blade, Confiteor and the three Blades once each; Blade of Honor,
// Expiacion, Circle of Scorn and Intervene once each; three of Royal
// Authority / Atonement / Supplication / Sepulchre / Holy Spirit.
//
// Warrior, Surging Tempest (+10%, xivanalysis
// src/parser/jobs/war/modules/SurgingTempest.tsx tracks its uptime): drops
// of 2.5s+ after it first goes up.
//
//   Copyright (c) 2018 Saxon Landers & contributors
//   MIT License; full text in THIRD_PARTY_NOTICES.md.

import { XIVA_ACTIONS as A, XIVA_STATUSES as S } from "../xiva-data";
import type { JobCheck } from "../../types";
import { inWindows } from "../../timeline";
import { aoeComboOnOneTarget, burstWindowFindings, castHits, gaugeFindings, k, statusWindows, uptimeFindings, type GaugeEvent } from "./shared";
import { comboLanded } from "./gnb";

const id = (key: string) => A[key].id;

const fightOrFlight: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.FIGHT_OR_FLIGHT.id,
  name: "Fight or Flight",
  bonus: 0.25,
  bonusBasis: "Fight or Flight is +25% (FFLogs multiplier with it alone: 1.25)",
  expectedGcds: () => 8,
  expected: () => [
    { ids: [id("GORING_BLADE")], count: 1, name: "Goring Blade" },
    { ids: [id("CONFITEOR")], count: 1, name: "Confiteor" },
    { ids: [id("BLADE_OF_FAITH")], count: 1, name: "Blade of Faith" },
    { ids: [id("BLADE_OF_TRUTH")], count: 1, name: "Blade of Truth" },
    { ids: [id("BLADE_OF_VALOR")], count: 1, name: "Blade of Valor" },
    { ids: [id("BLADE_OF_HONOR")], count: 1, name: "Blade of Honor" },
    { ids: [id("EXPIACION")], count: 1, name: "Expiacion" },
    { ids: [id("CIRCLE_OF_SCORN")], count: 1, name: "Circle of Scorn" },
    { ids: [id("INTERVENE")], count: 1, name: "Intervene" },
    {
      ids: ["ROYAL_AUTHORITY", "ATONEMENT", "SUPPLICATION", "SEPULCHRE", "HOLY_SPIRIT"].filter((x) => A[x]).map(id),
      count: 3, name: "Royal Authority / Atonement combo GCD",
    },
  ],
});

const surgingTempest: JobCheck = (ctx) => {
  const windows = statusWindows(ctx, S.SURGING_TEMPEST.id);
  if (windows.length === 0) return [];
  return uptimeFindings(ctx, {
    name: "Surging Tempest", bonus: 0.1, bonusBasis: "Surging Tempest is +10% (tooltip)",
    active: windows, fromMs: windows[0].startMs, graceMs: 2_500,
  });
};

// Beast Gauge (cap 100), xivanalysis war/modules/Gauge.tsx: +10 combo'd
// Maim / Storm's Eye, +20 combo'd Storm's Path / Mythril Tempest, +50
// Infuriate; −50 Fell Cleave / Decimate (free under Inner Release),
// Inner Chaos / Chaotic Cyclone. Combo read from bonusPercent, as for GNB.
// 50 gauge is worth one average Fell Cleave.
const beastGauge: JobCheck = (ctx) => {
  const events: GaugeEvent[] = [];
  const gains = new Map([["MAIM", 10], ["STORMS_EYE", 10], ["STORMS_PATH", 20], ["MYTHRIL_TEMPEST", 20]].map(([k, n]) => [id(k as string), n as number]));
  const freeUnderIr = new Set([id("FELL_CLEAVE"), id("DECIMATE")]);
  const spenders = new Set([...freeUnderIr, id("INNER_CHAOS"), id("CHAOTIC_CYCLONE")]);
  const ir = statusWindows(ctx, S.INNER_RELEASE.id).map((w) => ({ startMs: w.startMs, endMs: w.endMs + 100 }));
  for (const c of ctx.player.casts) {
    const gain = gains.get(c.abilityId);
    if (gain && comboLanded(ctx, c.abilityId, c.timestamp)) {
      events.push({ t: c.timestamp, type: "gain", amount: gain, label: `${c.abilityName} at high gauge` });
    }
    if (c.abilityId === id("INFURIATE")) events.push({ t: c.timestamp, type: "gain", amount: 50, label: "Infuriate above 50 gauge" });
    if (spenders.has(c.abilityId) && !(freeUnderIr.has(c.abilityId) && inWindows(c.timestamp, ir))) {
      events.push({ t: c.timestamp, type: "spend", amount: 50, label: c.abilityName });
    }
  }
  for (const d of ctx.dead) events.push({ t: d.startMs, type: "reset", label: "death" });
  // Outside Inner Release: its Fell Cleaves are guaranteed crit and direct
  // hit, and the gauge lost would have paid for one outside it.
  const plain = castHits(ctx, id("FELL_CLEAVE")).filter((h) => !inWindows(h.timestamp, ir));
  const avg = plain.length > 0 ? plain.reduce((a, h) => a + (h.amount ?? 0), 0) / plain.length : ctx.values.perUse(id("FELL_CLEAVE"));
  const perPoint = avg / 50;
  return gaugeFindings(ctx, {
    name: "Beast Gauge", unit: "gauge", cap: 100, unitValue: perPoint,
    valueBasis: `${k(avg)} average Fell Cleave outside Inner Release per 50`,
    events,
  });
};

const pldAoeCombo =aoeComboOnOneTarget([[id("TOTAL_ECLIPSE"), id("FAST_BLADE")], [id("PROMINENCE"), id("RIOT_BLADE")]]);
const warAoeCombo = aoeComboOnOneTarget([[id("OVERPOWER"), id("HEAVY_SWING")], [id("MYTHRIL_TEMPEST"), id("MAIM")]]);

export const PLD_CHECKS: JobCheck[] = [fightOrFlight, pldAoeCombo];
export const WAR_CHECKS: JobCheck[] = [surgingTempest, warAoeCombo, beastGauge];
