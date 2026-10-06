// lib/mechanics/wow/va/coiled-altar-damage-context.ts
//
// The Coiled Altar's fight context for the damage analysis
// (docs/damage-analysis-plan.md, "WoW build order" step 4;
// lib/damage/types.ts DamageContext). Measured on wThYvpJkbK6Pjrdc pulls
// 1–17 (wipes; the kill is only in the spell survey), 2026-10-06. The
// encounter model is coiled-altar.ts's header. These captures carry no
// phase data, so the log's phase ids are unknown and phases are left
// empty; refetch a pull to add them.
//
// ── Stages (names from the header) ─────────────────────────────────────
// S1 Serpent's Bargain (Zul'jan), S2 Usurper's Reprisal (Malacrass, from
// Dreadful Presence 1288624 at ~+177s), an intermission (The Claimed
// Vessel, Deathguard 1304028 at ~+388s, 35s: everyone on Zul'jan, who takes
// +100%), S3 Coiled Union (both bosses; Soulbound gives the survivor ~+500%,
// so health has to stay balanced).
//
// ── Forced windows ─────────────────────────────────────────────────────
// - S1 → S2: nothing to hit from Zul'jan's last hit to Malacrass's first,
//   0.1–0.5s after Dreadful Presence; 7.1–8.8s (median 7.7s, 11 pulls).
//   No log event marks the start, so: Dreadful Presence − 8s to + 0.5s.
// - S2 → intermission: Malacrass goes immune (Deathguard) and Zul'jan is
//   hittable 3.7–4.7s later. Deathguard to + 4.2s.
// - Dreadmarch (1297445, median 2.4s, up to 7s): possessed players walk
//   off the edge; nobody casts (rate 0.00).
// - Wail of Terror fear (1286399, 5s): a full lockout, after a completed
//   Wail, which is a missed kick rather than the feared player's mistake.
// - Not forced: Gloombomb marks (melee rate 0.60, partial), the orb
//   carriers, Unnerving Fixation, fragment collection, Guillotine.

import type { DamageContext, ForcedWindow } from "../../../damage/types";
import { debuffWindows } from "../../../damage/wow/context-helpers";

const DREADFUL_PRESENCE = 1288624;
const DEATHGUARD = 1304028;
const DREADMARCH = 1297445;
const WAIL_FEAR = 1286399;

export const COILED_ALTAR_DAMAGE_CONTEXT: DamageContext = {
  encounter: "The Coiled Altar",
  phases: {},
  forcedWindows: (pull) => {
    const first = (id: number) => [...(pull.enemyCasts ?? []), ...(pull.enemyBuffs ?? [])]
      .filter((e) => e.abilityId === id).map((e) => e.timestamp).sort((a, b) => a - b)[0];
    const out: ForcedWindow[] = [
      ...debuffWindows(pull, [DREADMARCH], "possessed (Dreadmarch)", { maxMs: 8_000 }),
      ...debuffWindows(pull, [WAIL_FEAR], "feared (Wail of Terror)", { maxMs: 5_500 }),
    ];
    const presence = first(DREADFUL_PRESENCE);
    if (presence !== undefined) out.push({ startMs: presence - 8_000, endMs: presence + 500, cause: "S1 → S2 transition (nothing to hit)" });
    const deathguard = first(DEATHGUARD);
    if (deathguard !== undefined) out.push({ startMs: deathguard, endMs: deathguard + 4_200, cause: "Malacrass immune, Zul'jan not yet hittable" });
    return out;
  },
};
