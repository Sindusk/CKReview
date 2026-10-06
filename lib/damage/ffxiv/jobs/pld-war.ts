// lib/damage/ffxiv/jobs/pld-war.ts
//
// Paladin and Warrior checks (tank batch). UNVERIFIED: no sample pull has
// either job, so these follow xivanalysis and the 7.x tooltips only.
//
// Paladin, Fight or Flight (+25% from the tooltip), ported from
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
  bonusBasis: "Fight or Flight is +25% (tooltip; not yet checked against a log)",
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
