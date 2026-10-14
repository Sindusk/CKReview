// lib/mechanics/ffxiv/trials/enuo-damage-context.ts
//
// Damage context for Enuo (The Unmaking, Extreme).
//
// Sources:
// - enuo.ts header (VERIFIED AGAINST LOGS): the scripted clock to All for
//   Naught (2:35), the intermission (Looming Shadow, the personal duels, the
//   Beacon in the Dark) whose duty gauge ends in Apeiron, the final phase
//   starting ~8s after the Beacon dies, the kills ending 8:30-10:08 before
//   the final Almagest; neither enrage was ever seen.
// - HP measured 2026-10-14 with build-fight-context/tools/phase-hp.js on
//   Xk2DKZwVp4Ar6d7y (kills A3, A4, A10, A11; wipes) and pnLBzfbH8NjGAJRg
//   (kills B7-B12, B14, B15; wipes).
//
// One phase. The log has no phase segments; phase 0 is the whole pull and
// the deciding phase.
// - Pool: Enuo 107.94M, a fixed pool carried through the intermission (she
//   leaves at ~61% and comes back there). The kills dealt 106.4-107.9M and
//   took her to 1 HP at 8:30 (B11, 1.3% on its last logged hit) to 10:07.7
//   (A4). The best wipes left 15.4% (A6 7:54) and 31.0% (B6 7:12), both to
//   mechanics.
// - The intermission adds count: the Looming Shadow (9.86M, dead 3:53-4:21),
//   the personal shadows (0.22-0.32M each, every player their own) and the
//   Beacon in the Dark (1.66M, dead 4:04-4:31). Killing the Beacon sooner
//   brings Enuo back sooner, so damage on them is never wasted. Enuo is
//   untargetable from ~2:37 until she returns; the analysis infers that.
// - No hold: no HP curve slows before a transition.
//
// Forced windows:
// - Enuo at 1 HP: from that hit to the end.
// Not built: movement windows (Freezing Up, Naught Hunts runners, orb
// soaks), not measured on these kills.

import type { Pull } from "@/types/Pull";
import type { DamageContext, ForcedWindow } from "../../../damage/types";
import { mechanicLabelForKey } from "../../rule-meta";

const BOSS = "Enuo";
const ONE_HP = 0.001;

const RULE_KEY_LABELS: Record<string, string> = {
  "ffxiv-enuo-avoidable":    "avoidable damage",
  "ffxiv-enuo-chains":       "Meltdown's chains",
  "ffxiv-enuo-freeze":       "Deep Freeze",
  "ffxiv-enuo-petrify":      "Demon Eye",
  "ffxiv-enuo-share":        "Emptiness cones / Return lines",
  "ffxiv-enuo-return-front": "Return to Nothing",
  "ffxiv-enuo-dimension":    "Dimension Zero",
  "ffxiv-enuo-spread":       "Meltdown",
  "ffxiv-enuo-turbulence":   "Voidal Turbulence",
  "ffxiv-enuo-empty-tower":  "Empty Shadow towers",
  "ffxiv-enuo-orb":          "Gaze of the Void orbs",
  "ffxiv-enuo-fall":         "a death",
};

export const ENUO_DAMAGE_CONTEXT: DamageContext = {
  encounter: BOSS,
  phases: {
    0: { pool: 107_940_000, fixedPool: true, carriesOver: false, decidesEnrage: true,
      note: "Enuo to 1 HP before the final Almagest; the intermission adds count (the Beacon's death brings her back)" },
  },
  forcedWindows: (pull: Pull) => {
    const out: ForcedWindow[] = [];
    const end = pull.fightDuration;
    const dead = pull.players.flatMap((p) => p.damageDone)
      .filter((e) => e.target === BOSS && e.healthAfter !== undefined && e.maxHealth && e.healthAfter / e.maxHealth <= ONE_HP)
      .reduce<number | undefined>((min, e) => (min === undefined || e.timestamp < min ? e.timestamp : min), undefined);
    if (dead !== undefined && dead < end) out.push({ startMs: dead, endMs: end, cause: "Enuo at 1 HP: the check is met" });
    return out;
  },
  mechanicLabel: (key) => mechanicLabelForKey(key) ?? RULE_KEY_LABELS[key],
};
