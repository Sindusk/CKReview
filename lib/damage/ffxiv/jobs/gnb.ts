// lib/damage/ffxiv/jobs/gnb.ts
//
// Gunbreaker checks (tank batch). Ported from xivanalysis
// src/parser/jobs/gnb/modules/NoMercy.tsx and Ammo.tsx, their 7.4 rules:
//
// No Mercy (+20%, confirmed by FFLogs' multiplier: No Mercy alone = 1.20):
//   - 9 GCDs, or 8 when the GCD is 2.47s or slower
//   - Savage Claw, Wicked Talon, Double Down, Sonic Break, Blasting Zone,
//     Bow Shock and Lion Heart once each. Gnashing Fang is expected only
//     when the GCD is slow or the player used it inside (xivanalysis
//     allows the fast-GCD variant that starts the combo before No Mercy).
//
// Cartridges (cap 3; 6 while the Bloodfest status is up, which also grants
// 3 on apply, and anything over 3 is lost when it ends):
//   - +1 per combo'd Solid Barrel / Demon Slaughter. Combo'd is read from
//     the hit's bonusPercent when the action shows one in the pull (every
//     Solid Barrel in dQ8wmb1VhKt6yBXk pull 11 had 47), not guessed.
//   - −1 Burst Strike, Fated Circle, Gnashing Fang; −2 Double Down.
//   A lost cartridge is worth one average Burst Strike.
//
//   Copyright (c) 2018 Saxon Landers & contributors
//   MIT License; full text in THIRD_PARTY_NOTICES.md.

import { XIVA_ACTIONS as A, XIVA_STATUSES as S } from "../xiva-data";
import type { DamageFinding, JobCheck } from "../../types";
import type { PlayerCheckContext } from "../../checks";
import { aoeComboOnOneTarget, burstWindowFindings, castHits, gaugeFindings, k, statusWindows, type GaugeEvent } from "./shared";

const id = (key: string) => A[key].id;
const GCD_SLOW_MS = 2470;

const noMercy: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.NO_MERCY.id,
  name: "No Mercy",
  bonus: 0.2,
  bonusBasis: "No Mercy is +20% (FFLogs multiplier 1.20)",
  expectedGcds: (c) => (c.baseGcdMs >= GCD_SLOW_MS ? 8 : 9),
  expected: (c, casts) => [
    { ids: [id("SAVAGE_CLAW")], count: 1, name: "Savage Claw" },
    { ids: [id("WICKED_TALON")], count: 1, name: "Wicked Talon" },
    { ids: [id("DOUBLE_DOWN")], count: 1, name: "Double Down" },
    { ids: [id("SONIC_BREAK")], count: 1, name: "Sonic Break" },
    { ids: [id("BLASTING_ZONE"), id("DANGER_ZONE")], count: 1, name: "Blasting Zone" },
    { ids: [id("BOW_SHOCK")], count: 1, name: "Bow Shock" },
    { ids: [id("LION_HEART")], count: 1, name: "Lion Heart" },
    {
      ids: [id("GNASHING_FANG")], name: "Gnashing Fang",
      count: c.baseGcdMs >= GCD_SLOW_MS || casts.some((x) => x.abilityId === id("GNASHING_FANG")) ? 1 : 0,
    },
  ],
});

/** Did this cast's hit land combo'd? Unknown (no bonus data for the ability) counts as yes. */
export function comboLanded(ctx: PlayerCheckContext, abilityId: number, t: number): boolean {
  const hits = castHits(ctx, abilityId);
  if (!hits.some((h) => h.bonusPercent !== undefined)) return true;
  const hit = hits.find((h) => h.timestamp >= t && h.timestamp <= t + 1_500);
  return hit === undefined || hit.bonusPercent !== undefined;
}

const cartridges: JobCheck = (ctx): DamageFinding[] => {
  const events: GaugeEvent[] = [];
  const gain = new Set([id("SOLID_BARREL"), id("DEMON_SLAUGHTER")]);
  const spend = new Map([[id("BURST_STRIKE"), 1], [id("FATED_CIRCLE"), 1], [id("GNASHING_FANG"), 1], [id("DOUBLE_DOWN"), 2]]);
  for (const c of ctx.player.casts) {
    if (gain.has(c.abilityId) && comboLanded(ctx, c.abilityId, c.timestamp)) {
      events.push({ t: c.timestamp, type: "gain", amount: 1, label: `${c.abilityName} at full cartridges` });
    }
    const cost = spend.get(c.abilityId);
    if (cost) events.push({ t: c.timestamp, type: "spend", amount: cost, label: c.abilityName });
  }
  for (const w of statusWindows(ctx, S.BLOODFEST.id)) {
    events.push({ t: w.startMs, type: "cap", cap: 6, label: "Bloodfest" });
    events.push({ t: w.startMs + 0.1, type: "gain", amount: 3, label: "Bloodfest with cartridges loaded" });
    if (w.endMs <= ctx.endMs) events.push({ t: w.endMs, type: "cap", cap: 3, label: "over 3 when Bloodfest ended" });
  }
  for (const d of ctx.dead) events.push({ t: d.startMs, type: "reset", label: "death" });
  const perCart = ctx.values.perUse(id("BURST_STRIKE"));
  return gaugeFindings(ctx, {
    name: "Cartridge", unit: "cartridge", cap: 3, unitValue: perCart,
    valueBasis: `${k(perCart)} average Burst Strike`,
    events,
  });
};

const aoeCombo = aoeComboOnOneTarget([[A.DEMON_SLICE.id, A.KEEN_EDGE.id], [A.DEMON_SLAUGHTER.id, A.BRUTAL_SHELL.id]]);

export const GNB_CHECKS: JobCheck[] = [noMercy, cartridges, aoeCombo];
