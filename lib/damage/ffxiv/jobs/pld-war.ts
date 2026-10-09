// lib/damage/ffxiv/jobs/pld-war.ts
//
// Paladin and Warrior checks (tank batch). Warrior is UNVERIFIED (no
// sample has it) and follows xivanalysis and the 7.x tooltips only.
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
import { burstWindowFindings, statusWindows, uptimeFindings } from "./shared";

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

export const PLD_CHECKS: JobCheck[] = [fightOrFlight];
export const WAR_CHECKS: JobCheck[] = [surgingTempest];
