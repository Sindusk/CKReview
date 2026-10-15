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
//   A lost cartridge is worth one average Burst Strike. Cartridges left at
//   a kill are worth Burst Strike + Hypervelocity minus a Keen Edge.
//
// Checked against xivanalysis on qjCMx4bRfgNKwX9T fight 16 (7.5,
// 2026-10-13; xivanalysis's GNB rules are 7.4's, no 7.5 changes):
// - No Mercy: its 7 missed GCDs and 13 missed actions match these windows
//   when the 8-or-9 rule reads the GCD as xivanalysis does (its saved
//   page shows "Estimated GCD 2.47s", so 8). The 3:04, 6:06 and 14:13
//   windows are past HP checks or cut by downtime (forced); 5:06's Double
//   Down was pressed 0.1s before No Mercy applied and hit without it
//   (multiplier 1.01).
// - Not adopted: its 2.47s GCD. The player is a 2.45s tier (timeline.ts
//   gcdTierMs: 208 intervals at 2.44-2.46, 123 one ~44ms log step later
//   at 2.49-2.50; 2.50s recorders never log two 2.45s in a row). 2.47s is
//   that mix's mean. At 2.45s the rule expects 9, and the player landed 9
//   in 9 of the 18 windows (0:03, 1:03, 2:03, 4:05, 7:10, 9:10, 11:12,
//   12:13, 13:13), so the 8-GCD windows at 10:11, 15:14 and 16:15 count.
//   Settled 2026-10-13 with RmCphLTDaMXyAf2r (the recorder's 2.50s GCD).
// - 1 cartridge left at the kill: built (leftAtKill).
// Not adopted:
// - Gnashing Fang 37/38: the lost charge sat full in the P2-P3 downtime
//   (6:36-7:12), forced. Sonic Break 18/19: the 14:13 Ready to Break
//   expired in P4's downtime past the HP check (forced proc-lost).
// - "4 recommended actions missed in tinctures": one Gnashing Fang of two
//   in each. GF was pressed on cooldown, so a second one meant holding a
//   charge ~20s into the tincture: worth the tincture's ~3% of one GF
//   combo (~6k each), the same call as WAR's Onslaughts (pld-war.ts).
// - Weaving: 8 of its 13 are 0.02-0.2s (jitter); 9 of the 13 are a
//   defensive or Sprint woven with Bloodfest + No Mercy before the burst.
//   6:03, 8:07 and 11:08 are the triple-weave findings, 17:12 (0.4s) is in
//   P5's small delays, 14:10 is past P4's HP check, 13:10 (0.45s past
//   tolerance) is under the phase's 0.5s floor. Its "Lightning Shots 9"
//   are the app's 9 disengages (6 unforced, 3 in the end-of-P3 hold).
//   The 8:09 window's two Fated Circles hit both P3 bosses (right).
// - Continuations 100%: none lost, so nothing to value.
// Fated Circle on one target (xivanalysis AoE.ts, 2026-10-15), against
// Burst Strike (aoeCombo). Seen firing, not matched against xivanalysis:
// L9BzKkD2nxcVgHTC Necron pulls 7-21, a Gunbreaker spending the opener's
// Bloodfest cartridges on Necron alone (pull 14: 0:11, 0:14, 0:17) and on
// single Icy / Beckoning Hands in the adds (pull 18: 3:35, 3:53), 0-18k
// each. A pull with no Burst Strike (pull 10, a 31s wipe) has no average
// to compare against, so its four don't show.
//
//   Copyright (c) 2018 Saxon Landers & contributors
//   MIT License; full text in THIRD_PARTY_NOTICES.md.

import { XIVA_ACTIONS as A, XIVA_STATUSES as S } from "../xiva-data";
import type { DamageFinding, JobCheck } from "../../types";
import type { PlayerCheckContext } from "../../checks";
import { aoeComboOnOneTarget, burstWindowFindings, castHits, gaugeFindings, k, statusWindows, type GaugeEvent } from "./shared";

const id = (key: string) => A[key].id;
const GCD_SLOW_MS = 2470;

/**
 * The GCD the 8-or-9 rule reads: the player's GCD tier (timeline.ts
 * gcdTierMs), not the mean interval xivanalysis estimates from. Logged
 * intervals add ~44ms steps to some GCDs; the mean of a 2.45s Gunbreaker
 * delayed on a third of them reads 2.47s (see the header).
 */
function ruleGcdMs(ctx: PlayerCheckContext): number {
  return Math.round(ctx.baseGcdMs);
}

const noMercy: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.NO_MERCY.id,
  name: "No Mercy",
  bonus: 0.2,
  bonusBasis: "No Mercy is +20% (FFLogs multiplier 1.20)",
  expectedGcds: (c) => (ruleGcdMs(c) >= GCD_SLOW_MS ? 8 : 9),
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
      count: ruleGcdMs(c) >= GCD_SLOW_MS || casts.some((x) => x.abilityId === id("GNASHING_FANG")) ? 1 : 0,
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
  // At the kill the cartridge's Burst Strike + Hypervelocity would have
  // replaced a combo GCD (qjCMx4bRfgNKwX9T fight 16: Keen Edge at 18:15
  // with one loaded, none spent after Bloodfest's three).
  const blast = perCart + ctx.values.perUse(id("HYPERVELOCITY"));
  const filler = ctx.values.perUse(id("KEEN_EDGE"));
  return gaugeFindings(ctx, {
    name: "Cartridge", unit: "cartridge", cap: 3, unitValue: perCart,
    valueBasis: `${k(perCart)} average Burst Strike`,
    events,
    leftAtKill: {
      unitValue: Math.max(0, blast - filler),
      valueBasis: `(${k(blast)} average Burst Strike + Hypervelocity − ${k(filler)} average Keen Edge it would have replaced)`,
    },
  });
};

const aoeCombo = aoeComboOnOneTarget([[A.DEMON_SLICE.id, A.KEEN_EDGE.id], [A.DEMON_SLAUGHTER.id, A.BRUTAL_SHELL.id],
  [A.FATED_CIRCLE.id, A.BURST_STRIKE.id]]);

export const GNB_CHECKS: JobCheck[] = [noMercy, cartridges, aoeCombo];
