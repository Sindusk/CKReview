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
//   ranged 10% vs 6%. Movement (user, 2026-10-19, replacing the forced
//   window for melee): every holder from the aura's application (its circle
//   appears) +4s to get into position, and the 2s after the blast while
//   they're thrown into the air.
// - Venomous Surge (1305963, 10s, always ranged or healers, lines 63–68):
//   holders idle 18.5% vs 3.8%. Movement, not forced (user, 2026-10-19):
//   the 10s plus 3s after the drop, which can leave the holder across the
//   arena from the boss.
// - Charge / Virulence (Serpent's Fury 1305621 removal; Virulence 1297707 /
//   1299899 0.8s later, 5s, lines 23–37): every melee idles 17–25% from +1s
//   to +7s after the removal (baseline 2–4%). Forced for melee, removal
//   +1s to +7s. Also movement (user, 2026-10-19): everyone a Virulence goes
//   on (the charge's and any re-infection), the 3s after it, to spread.
// - Not forced (measured): the Serpent's Fury mark itself, Mutilate soaks,
//   Tempest, Turbulent Gusts, the Maelstrom gales.
// - Enrage unobserved (longest pull 288.8s).

import type { DamageContext, ForcedWindow } from "../../../damage/types";
import type { Pull } from "@/types/Pull";
import { debuffWindows, isMelee } from "../../../damage/wow/context-helpers";

const RAGING_CROSSWINDS = [1285425, 1285453, 1297096, 1297111];
const VENOMOUS_SURGE = 1305963;
const SERPENTS_FURY = 1305621;
const VIRULENCE = [1297707, 1299899];
const CROSSWINDS_SETUP_MS = 4_000, CROSSWINDS_AIR_MS = 2_000, SURGE_DROP_MS = 3_000, VIRULENCE_SPREAD_MS = 3_000;

/** Each Crosswinds holder's 2s in the air after their blast (the aura's removal). */
function crosswindsAirborne(pull: Pull): ForcedWindow[] {
  return pull.players.flatMap((p) => p.debuffs
    .filter((e) => RAGING_CROSSWINDS.includes(e.abilityId) && e.debuffStatus === "removed")
    .map((e) => ({ startMs: e.timestamp, endMs: e.timestamp + CROSSWINDS_AIR_MS, cause: "thrown into the air by Raging Crosswinds", players: [p.name] })));
}

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
    ...debuffWindows(pull, RAGING_CROSSWINDS, "lining up Raging Crosswinds", { maxMs: CROSSWINDS_SETUP_MS }),
    ...crosswindsAirborne(pull),
    ...debuffWindows(pull, [VENOMOUS_SURGE], "carrying Venomous Surge", { maxMs: 11_000, tailMs: SURGE_DROP_MS }),
    ...debuffWindows(pull, VIRULENCE, "spreading Virulence", { maxMs: VIRULENCE_SPREAD_MS }),
  ],
};
