// lib/mechanics/wow/va/twin-fangs-damage-context.ts
//
// The Twin Fangs' fight context for the damage analysis
// (docs/archive/damage-analysis-plan.md, "WoW build order" step 4;
// lib/damage/types.ts DamageContext). Measured on 6Jnq8ycwgkYZpHND (kill,
// pull 25) and xKP1M6gwC8WpnrBc (14 wipes), 2026-10-06. The encounter model
// is twin-fangs.ts's header. "Idle" = share of time a DPS player sat in a
// 2.5s+ gap between casts.
//
// - No log phases. Two bosses with separate pools (Vexhul, Ithraz, 734M
//   each), stacked and cleaved: every damage number here is two-target.
//   The engine's multiTarget is per phase and this fight has none, so it
//   isn't set.
// - Submerge: nothing marks it, so it's anchored on Ithraz's Sanguine Storm
//   (cast 1306872; +136.0 and +291.0 every pull, 155s cycle). Both twins
//   are gone from ~3s before the cast (hits drop from ~50/s to 4–15/s), so
//   the whole raid is forced from cast −3.5s to −0.5s. After the cast melee
//   spend the Storm (18s) dodging impacts and Vile Flood: idle 33–67%,
//   ranged 13–21%. Forced for melee, cast to +18s.
// - Coiling Ichor (1290814, ~12s): targets drop Gore at the arena edge
//   (header lines 323–326). Melee holders idle 20–62% vs 7.6%; ranged 9–15%.
//   Forced for melee holders.
// - Not forced (measured): the Ravenous Feast bites (1–2s melee at most),
//   Corrosive Spit, globule pickups, Tainted Blood.
// - Soft enrage: Eternal Venom outpaces Feast around +407s.

import type { DamageContext, ForcedWindow } from "../../../damage/types";
import { castWindows, debuffWindows, isMelee } from "../../../damage/wow/context-helpers";

const SANGUINE_STORM = 1306872;
const COILING_ICHOR = 1290814;

export const TWIN_FANGS_DAMAGE_CONTEXT: DamageContext = {
  encounter: "The Twin Fangs",
  phases: {},
  forcedWindows: (pull) => {
    const out: ForcedWindow[] = [
      ...castWindows(pull, [SANGUINE_STORM], 3_000, "both twins submerged", { offsetMs: -3_500 }),
      ...castWindows(pull, [SANGUINE_STORM], 18_000, "dodging Sanguine Storm", { who: isMelee }),
      ...debuffWindows(pull, [COILING_ICHOR], "dropping Coiling Ichor at the edge", { who: isMelee, maxMs: 13_000 }),
    ];
    return out;
  },
};
