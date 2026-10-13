// lib/mechanics/wow/va/entombed-sentinels-damage-context.ts
//
// Entombed Sentinels' fight context for the damage analysis
// (docs/archive/damage-analysis-plan.md, "WoW build order" step 4;
// lib/damage/types.ts DamageContext). Measured on Mvz3r1AnVKYpdFTH (30
// Mythic wipes), 2026-10-06. The encounter model is entombed-sentinels.ts's
// header.
//
// - Phases: 1 "Stage One: Entombed Sentinels", 2 "Intermission: Vitriolic
//   Stasis", alternating (2 at ~+46s, then every ~104–110s). Two bosses with
//   separate pools (Blood and Breath of Ula'tek), one team each, 40yd+ apart:
//   no cleave between them. The Venom Coagulation adds take ~20% of damage.
// - Vitriolic Stasis (phase 2, boss buffs 1284588 / 1284606; median 15s,
//   6–29s) is 99% damage reduction: hits do ~4 damage. Its damage doesn't
//   count, so the phase is damageCounts false.
// - The bosses rush together ~1.1s before Stasis (their Mark buffs 1284494 /
//   1284503 drop; the median last real hit is 1.3s before), and the teams
//   swap bosses after it (first real hit a median 3.0s after Stasis ends).
//   Forced: phase 2 start − 1.5s, and phase 2 end + 3s.
// - Not forced: Shifting Protovenom and Clinging Murk cost partial movement
//   only (cast rate 0.66–0.86); Unstable Miasma, Blighted Blood and the
//   droplet pickups cost nothing measurable.
// - Movement (movementWindows; idle inside beyond the player's own usual
//   rate is movement, not counted). Measured 2026-10-13 on two kills
//   (qpZx3mWaG7gcDdYB pull 3, NK1hBtW9rckdjq36 pull 2; 30 DPS), idle share
//   inside the window minus the player's own outside every candidate:
//   - Protovenom carriers (debuff 1296880 on → off, 15s cap): +8 points
//     median, the 8 most active players +8 too.
//   - Clinging Murk carriers (1288297 on → off + 1.5s to drop the pool):
//     +6 (most active +4).
//   - Miasma soakers (cast 1288232 → their 1288282 hit): +4.
//   - Everyone 0–6s after Shifting Protovenom (1296878: unmarked players
//     clear lanes) 18% idle, after Contaminate (1284257, the slime: target
//     swap) 17%, against 14.3% across the fight.
//   Droplet collectors measured +4 (most active −1): not movement.
//   Most of a top player's idle (~13%) isn't any mechanic's: it stays
//   counted, and a reference clear shows it as the floor.
// - Berserk (26662) at +420.2 on both bosses (one sample). Stasis heals the
//   lower boss up to the higher, so health has to stay balanced.

import type { Pull } from "@/types/Pull";
import type { DamageContext, ForcedWindow } from "../../../damage/types";
import { castWindows, debuffWindows, phaseSpans } from "../../../damage/wow/context-helpers";

const RUSH_MS = 1_500;
const SWAP_MS = 3_000;

const PROTOVENOM_CAST = 1296878, PROTOVENOM_DEBUFF = 1296880;
const MURK = 1288297;
const MIASMA_CAST = 1288232, MIASMA_SPLIT = 1288282;
const CONTAMINATE = 1284257;
const AFTER_CAST_MS = 6_000;

/** Each Miasma soaker: from the cast to the split hit that landed on them. */
function miasmaSoakers(pull: Pull): ForcedWindow[] {
  const casts = (pull.enemyCasts ?? []).filter((e) => e.abilityId === MIASMA_CAST).map((e) => e.timestamp).sort((a, b) => a - b);
  const out: ForcedWindow[] = [];
  for (const p of pull.players) {
    for (const hit of p.damageTaken.filter((e) => e.abilityId === MIASMA_SPLIT)) {
      const cast = [...casts].reverse().find((t) => t <= hit.timestamp && hit.timestamp - t <= 12_000);
      if (cast !== undefined) out.push({ startMs: cast, endMs: hit.timestamp, cause: "soaking Unstable Miasma", players: [p.name] });
    }
  }
  // one window per soaker per cast (the split can hit twice in an instant)
  return out.filter((w, i) => out.findIndex((x) => x.players![0] === w.players![0] && x.startMs === w.startMs) === i);
}

export const ENTOMBED_SENTINELS_DAMAGE_CONTEXT: DamageContext = {
  encounter: "Entombed Sentinels",
  phases: {
    1: { note: "two bosses, one team each" },
    2: { damageCounts: false, note: "Vitriolic Stasis: 99% damage reduction" },
  },
  forcedWindows: (pull) => phaseSpans(pull, 2).flatMap((s): ForcedWindow[] => [
    { startMs: s.startMs - RUSH_MS, endMs: s.startMs, cause: "bosses rushing together (Stasis)" },
    { startMs: s.endMs, endMs: s.endMs + SWAP_MS, cause: "swapping bosses after Stasis" },
  ]),
  movementWindows: (pull) => [
    ...debuffWindows(pull, [PROTOVENOM_DEBUFF], "pairing Shifting Protovenom", { maxMs: 15_000 }),
    ...debuffWindows(pull, [MURK], "dropping Clinging Murk", { tailMs: 1_500, maxMs: 12_000 }),
    ...miasmaSoakers(pull),
    ...castWindows(pull, [PROTOVENOM_CAST], AFTER_CAST_MS, "clearing lanes for Protovenom"),
    ...castWindows(pull, [CONTAMINATE], AFTER_CAST_MS, "switching to the slime"),
  ],
};
