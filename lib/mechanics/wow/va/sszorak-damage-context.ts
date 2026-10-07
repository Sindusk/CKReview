// lib/mechanics/wow/va/sszorak-damage-context.ts
//
// Sszorak's fight context for the damage analysis (docs/archive/damage-analysis-plan.md,
// "WoW build order" step 4; lib/damage/types.ts DamageContext). Measured on
// rNL38zFGMbyADRTh (36 Mythic wipes; no kill on disk), 2026-10-06. The
// encounter model is sszorak.ts's header. "Idle" below = share of time a
// DPS player sat in a 2.5s+ gap between casts, holders vs the rest.
//
// - Phases alternate: 1 "Sszorak" and 2 "Howling Maelstrom" (Dig In, buff
//   1286033, 25s, at +100 and +227). One boss, one fixed pool, never
//   untargetable. Dig In is a burn window: he takes +30% damage.
// - Raging Crosswinds (1285425 / 1285453 / 1297096 / 1297111, ~7.9s, 8
//   players per set, header lines 54–61): melee holders idle 38% vs 7%;
//   ranged 10% vs 6%. Forced for melee.
// - Venomous Surge (1305963, 10s, always ranged or healers, lines 63–68):
//   holders idle 18.5% vs 3.8%. Forced for its holders.
// - Charge / Virulence (Serpent's Fury 1305621 removal; Virulence 1297707 /
//   1299899 0.8s later, 5s, lines 23–37): every melee idles 17–25% from +1s
//   to +7s after the removal (baseline 2–4%). Forced for melee, removal
//   +1s to +7s; the Virulence debuffs fall inside it.
// - Not forced (measured): the Serpent's Fury mark itself, Mutilate soaks,
//   Tempest, Turbulent Gusts, the Maelstrom gales.
// - Enrage unobserved (longest pull 288.8s).

import type { DamageContext, ForcedWindow } from "../../../damage/types";
import { debuffWindows, isMelee } from "../../../damage/wow/context-helpers";

const RAGING_CROSSWINDS = [1285425, 1285453, 1297096, 1297111];
const VENOMOUS_SURGE = 1305963;
const SERPENTS_FURY = 1305621;

export const SSZORAK_DAMAGE_CONTEXT: DamageContext = {
  encounter: "Sszorak",
  phases: {
    1: {},
    2: { note: "Dig In: Sszorak takes +30% damage" },
  },
  forcedWindows: (pull) => {
    const out: ForcedWindow[] = [
      ...debuffWindows(pull, RAGING_CROSSWINDS, "Raging Crosswinds", { who: isMelee, maxMs: 9_000 }),
      ...debuffWindows(pull, [VENOMOUS_SURGE], "carrying Venomous Surge", { maxMs: 11_000 }),
    ];
    const melee = pull.players.filter(isMelee).map((p) => p.name);
    const charges = pull.players.flatMap((p) => p.debuffs)
      .filter((e) => e.abilityId === SERPENTS_FURY && e.debuffStatus === "removed")
      .map((e) => e.timestamp).sort((a, b) => a - b);
    let last = -Infinity;
    for (const t of charges) {
      if (t - last < 5_000) continue;
      last = t;
      out.push({ startMs: t + 1_000, endMs: t + 7_000, cause: "Sszorak's charge (Virulence)", players: melee });
    }
    return out;
  },
};
