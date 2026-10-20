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
//   ranged 10% vs 6%.
// - Re-measured 2026-10-19 on the kill dqKJB9rgXpRPyVTj fight 7 plus
//   1bM6VzcZpkqxYtAK pull 1 (DPS; idle = in a 2.5s+ cast gap), per 0.5s
//   from each event, affected players against every other DPS at that
//   moment. The user asked for the windows to follow the data, for every
//   player, as movement (not forced):
//   - Crosswinds, from the aura's application: melee holders idle 32-41%
//     vs 18-23% from +1.5s to +9.5s, level by +10s (the blast is at ~+7.9,
//     so ~2s after it, in the air and walking back). Ranged holders only
//     +2-6 points early and after the blast. Window: application to the
//     blast + CROSSWINDS_AFTER_MS, for every holder.
//   - Venomous Surge, from the drop: holders 46-62% vs 16-36% from -8s
//     (2s after the debuff) to +1.5s, below the rest from +2s. Window: the
//     debuff to the drop + SURGE_AFTER_MS.
//   - Virulence: nearly every DPS holds it at once, so against the moment
//     before: ranged idle climbs from ~15% to 45% at +3.5-4s and is back by
//     +5.5-6s, the debuff's 5s to its burst; melee move little (their charge
//     window below covers them). Window: the debuff's span, for everyone
//     who gets it (the charge's and any re-infection).
// - Charge / Virulence (Serpent's Fury 1305621 removal; Virulence 1297707 /
//   1299899 0.8s later, 5s, lines 23–37): every melee idles 17–25% from +1s
//   to +7s after the removal (baseline 2–4%). Forced for melee, removal
//   +1s to +7s.
// - Not forced (measured): the Serpent's Fury mark itself, Mutilate soaks,
//   Tempest, Turbulent Gusts, the Maelstrom gales.
// - Enrage unobserved (longest pull 288.8s).

import type { DamageContext, ForcedWindow } from "../../../damage/types";
import { debuffWindows, isMelee } from "../../../damage/wow/context-helpers";

const RAGING_CROSSWINDS = [1285425, 1285453, 1297096, 1297111];
const VENOMOUS_SURGE = 1305963;
const SERPENTS_FURY = 1305621;
const VIRULENCE = [1297707, 1299899];
// Measured tails after each mechanic ends (header).
const CROSSWINDS_AFTER_MS = 2_000, SURGE_AFTER_MS = 1_500;

export const SSZORAK_DAMAGE_CONTEXT: DamageContext = {
  encounter: "Sszorak",
  phases: {
    1: {},
    2: { note: "Dig In: Sszorak takes +30% damage" },
  },
  forcedWindows: (pull) => {
    const out: ForcedWindow[] = [];
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
  movementWindows: (pull) => [
    ...debuffWindows(pull, RAGING_CROSSWINDS, "Raging Crosswinds", { maxMs: 9_000, tailMs: CROSSWINDS_AFTER_MS }),
    ...debuffWindows(pull, [VENOMOUS_SURGE], "carrying Venomous Surge", { maxMs: 11_000, tailMs: SURGE_AFTER_MS }),
    ...debuffWindows(pull, VIRULENCE, "spreading Virulence", { maxMs: 6_000 }),
  ],
};
