// lib/mechanics/wow/va/nekzali-damage-context.ts
//
// Nek'zali the Soulcoiler's fight context for the damage analysis
// (docs/damage-analysis-plan.md, "WoW build order" step 4;
// lib/damage/types.ts DamageContext). Measured on nRGxQ1b8LdMvzC4D pull 6
// (the 494.0s kill) and pulls 1, 3–5, 2026-10-06. The encounter model is
// nekzali.ts's header.
//
// ── Phases ─────────────────────────────────────────────────────────────
// - 1 Stage One: one boss pool. The Ritual starts at ~50%; damage below 50%
//   before the channel carries over.
// - 2 Intermission (Ritual of Awakening, boss buff 1289683): the boss is
//   untargetable but the two Echoes of Jawae (99M each) are not, so it's no
//   raid downtime. Echo damage decides whether the Ritual completes, not the
//   boss pool.
// - 3 Stage Two: decides the enrage. Uncoiled Rage (1284034) comes at
//   Uncoiling + 183.4s; the kill had 13s to spare (~1.73M raid DPS needed,
//   inferred).
//
// ── Forced windows ─────────────────────────────────────────────────────
// - Well team (header lines 69–80): two fixed teams of 4 alternate into the
//   well (entry 1300524, held Immortal Coil 1299988) and hit only the
//   Drowned Echo. Gaps cluster around the trip: 5–9s getting in (~6s before
//   the entry debuff), 8–10s getting out (to ~4s after the coil goes).
//   Forced: entry − 6s to coil removal + 4.5s.
// - Soulcoiled (1290361, header lines 72–74): mind control, 9–20s. The
//   failure is the missed kick, which is no one player's.
// - Essence Rend knockback (1287434, after the 5s pull-in 1287427): melee
//   targets lose 3.5–5.3s getting back; ranged keep casting. Forced for
//   melee, to the debuff's removal + 1.5s.
// - Hungering Pyre flame carriers (1294933, 8s, header lines 52–55): every
//   carrier in these logs was ranged or a healer (2–8s gaps). Forced for
//   melee (inferred).
// - Not forced: Possession Barrage, Grasping Depths' raid debuff, Ignition,
//   the Invoke silence (already a Minor error).

import type { DamageContext, ForcedWindow } from "../../../damage/types";
import { debuffWindows, isMelee } from "../../../damage/wow/context-helpers";

const WELL_ENTRY = 1300524;
const IMMORTAL_COIL = 1299988;
const SOULCOILED = 1290361;
const ESSENCE_REND_KNOCKBACK = 1287434;
const SLITHERING_FLAME = 1294933;

export const NEKZALI_DAMAGE_CONTEXT: DamageContext = {
  encounter: "Nek'zali the Soulcoiler",
  phases: {
    1: {},
    2: { multiTarget: true, note: "intermission: the Echoes of Jawae; the boss is untargetable" },
    3: { decidesEnrage: true, note: "Uncoiled Rage at Uncoiling + 183s" },
  },
  forcedWindows: (pull) => {
    const out: ForcedWindow[] = [
      ...debuffWindows(pull, [SOULCOILED], "mind controlled (Soulcoiled)", { maxMs: 25_000 }),
      ...debuffWindows(pull, [ESSENCE_REND_KNOCKBACK], "knocked back by Essence Rend", { who: isMelee, maxMs: 8_000, tailMs: 1_500 }),
      ...debuffWindows(pull, [SLITHERING_FLAME], "carrying a Pyre flame", { who: isMelee, maxMs: 8_500 }),
    ];
    for (const p of pull.players) {
      const entries = p.debuffs.filter((e) => e.abilityId === WELL_ENTRY && e.debuffStatus === "applied");
      for (const entry of entries) {
        const exit = p.debuffs.find((e) => e.abilityId === IMMORTAL_COIL && e.debuffStatus === "removed" && e.timestamp > entry.timestamp);
        if (!exit || exit.timestamp - entry.timestamp > 60_000) continue;
        out.push({ startMs: entry.timestamp - 6_000, endMs: exit.timestamp + 4_500, cause: "well team", players: [p.name] });
      }
    }
    return out;
  },
};
