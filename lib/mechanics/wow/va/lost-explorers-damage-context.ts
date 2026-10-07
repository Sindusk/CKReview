// lib/mechanics/wow/va/lost-explorers-damage-context.ts
//
// The Lost Explorers' fight context for the damage analysis
// (docs/archive/damage-analysis-plan.md, "WoW build order" step 4;
// lib/damage/types.ts DamageContext). Measured on 8PQFgdDh3R9BW71t pull 20
// (the 409.3s kill) and nRGxQ1b8LdMvzC4D pulls 11, 12 and 15 (phase ids),
// 2026-10-06. The encounter model is lost-explorers.ts's header.
//
// ── Phases ─────────────────────────────────────────────────────────────
// A council: Iku, Nama and Gebbo, separate pools (423M / 455M / 390M),
// killed together. Phases go 1 → 2 → 1 → 3 → 1 → 4 → 1; each 2/3/4 segment
// is exactly one 60s Mor'zahi's Command (buffs 1296975 / 1297022 /
// 1297024). Every phase is multi-target. No explorer is ever untargetable.
// The enrage is the 4th Final Ascension (~425–437s): total damage across
// the three pools decides it, not one phase.
//
// ── Forced windows ─────────────────────────────────────────────────────
// - Blink Nova target (1296025, 7s, header lines 47–52): the target walks
//   away before Iku blinks to them (gaps 0–7s, median ~3s). Forced for
//   melee.
// - Explosive Surprise carrier (1297625, 10s, header lines 54–57): both
//   carriers in the kill were ranged (2–3s lost). Forced for melee
//   (inferred).
// - Fish carrier (header lines 24–27): only the throw is logged (player cast
//   1296535). Carriers lost 3–6.4s in the 25s before it and 2.3–4.5s after.
//   Forced for the thrower: throw − 20s to throw + 4s (inferred, partial).
// - Gebbo's Blast Wave (Bounce 1299854, 1.5s, on 14–15 players): 2–5s gaps
//   per player, from 2.5s before the bounce to 1s after it.
// - Not excused: the Shell Spin stun (1291918, 4s) is avoidable (header
//   lines 95, 260–264), so the lost time is the player's. Iku's Volley
//   debuffs and Nama's Mighty Thud regroups cost little (measured).

import type { DamageContext, ForcedWindow } from "../../../damage/types";
import { debuffWindows, isMelee } from "../../../damage/wow/context-helpers";

const BLINK_NOVA_MARK = 1296025;
const EXPLOSIVE_SURPRISE = 1297625;
const DISGUSTING_FISH = 1296535;
const BOUNCE = 1299854;

export const LOST_EXPLORERS_DAMAGE_CONTEXT: DamageContext = {
  encounter: "The Lost Explorers",
  phases: {
    1: { multiTarget: true },
    2: { multiTarget: true, note: "Mor'zahi's Command" },
    3: { multiTarget: true, note: "Mor'zahi's Command" },
    4: { multiTarget: true, note: "Mor'zahi's Command" },
  },
  forcedWindows: (pull) => {
    const out: ForcedWindow[] = [
      ...debuffWindows(pull, [BLINK_NOVA_MARK], "Blink Nova target", { who: isMelee, maxMs: 8_000 }),
      ...debuffWindows(pull, [EXPLOSIVE_SURPRISE], "carrying Explosive Surprise", { who: isMelee, maxMs: 11_000 }),
    ];
    for (const p of pull.players) {
      for (const e of p.debuffs) {
        if (e.abilityId !== BOUNCE || e.debuffStatus !== "applied") continue;
        const off = p.debuffs.find((x) => x.abilityId === BOUNCE && x.debuffStatus === "removed" && x.timestamp >= e.timestamp);
        out.push({ startMs: e.timestamp - 2_500, endMs: (off?.timestamp ?? e.timestamp + 1_500) + 1_000, cause: "Blast Wave bounce", players: [p.name] });
      }
      for (const c of p.casts) {
        if (c.abilityId !== DISGUSTING_FISH) continue;
        out.push({ startMs: c.timestamp - 20_000, endMs: c.timestamp + 4_000, cause: "carrying the fish", players: [p.name] });
      }
    }
    return out;
  },
};
