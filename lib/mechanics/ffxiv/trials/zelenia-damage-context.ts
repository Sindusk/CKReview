// lib/mechanics/ffxiv/trials/zelenia-damage-context.ts
//
// Damage context for Zelenia (Recollection, Extreme).
//
// Sources:
// - zelenia.ts header (VERIFIED AGAINST LOGS): the scripted clock (every
//   pull within ~1s), the party adds 1:35-2:28 with Perfumed Quietus at
//   2:31 whatever the drops' death times, the kills ending 8:22-9:50, Rose
//   Red (the research model's ~10:45 hard enrage) never reached.
// - HP measured 2026-10-14 with build-fight-context/tools/phase-hp.js on
//   Y9Fh2BHyj3xAqZ6V (kills A3, A5, A7, A8; wipes A1, A2, A4, A6) and
//   wNHvD38WTbFtGJKr (kills B6, B10, B11, B13; nine wipes).
//
// One phase. The log has no phase segments; phase 0 is the whole pull and
// the deciding phase.
// - Pool: Zelenia 85.83M, a fixed pool. The kills dealt 84.7-85.8M and
//   took her to 1 HP at 8:21.0 (A5) to 9:49.6 (B10). The best wipes left
//   12.9% (B5 8:47) and 16.0% (B8 8:57), both to mechanics, not the enrage.
// - Roseblood Drops (four, 1.56M each) are the add phase's own check: damage
//   on them counts. They died by 2:02.8-2:25.4 in every pull that passed;
//   Quietus still comes at 2:31, so killing them early doesn't move the
//   clock. Zelenia is untargetable from 1:35 to ~2:28; the analysis infers
//   that.
// - No hold: no HP curve slows before a transition.
//
// Forced windows:
// - Zelenia at 1 HP: from that hit to the end.
// Not built: movement windows (Blooms, Escelons' Fall, the Thorns stretch),
// not measured on these kills.

import type { Pull } from "@/types/Pull";
import type { DamageContext, ForcedWindow } from "../../../damage/types";
import { mechanicLabelForKey } from "../../rule-meta";

const BOSS = "Zelenia";
const ONE_HP = 0.001;

const RULE_KEY_LABELS: Record<string, string> = {
  "ffxiv-zelenia-avoidable":    "avoidable damage",
  "ffxiv-zelenia-center":       "Queen's Crusade's center",
  "ffxiv-zelenia-spearpoint":   "the party adds",
  "ffxiv-zelenia-escelons":     "Escelons' Fall",
  "ffxiv-zelenia-thunder-drop": "Alexandrian Thunder III",
  "ffxiv-zelenia-magic-break":  "Emblazon",
  "ffxiv-zelenia-tower":        "the Bloom towers",
  "ffxiv-zelenia-empty-tower":  "the towers",
  "ffxiv-zelenia-share":        "the stacks",
  "ffxiv-zelenia-fall":         "a fall",
};

export const ZELENIA_DAMAGE_CONTEXT: DamageContext = {
  encounter: BOSS,
  phases: {
    0: { pool: 85_830_000, fixedPool: true, carriesOver: false, decidesEnrage: true,
      note: "Zelenia to 1 HP before Rose Red (hard enrage, ~10:45)" },
  },
  forcedWindows: (pull: Pull) => {
    const out: ForcedWindow[] = [];
    const end = pull.fightDuration;
    const dead = pull.players.flatMap((p) => p.damageDone)
      .filter((e) => e.target === BOSS && e.healthAfter !== undefined && e.maxHealth && e.healthAfter / e.maxHealth <= ONE_HP)
      .reduce<number | undefined>((min, e) => (min === undefined || e.timestamp < min ? e.timestamp : min), undefined);
    if (dead !== undefined && dead < end) out.push({ startMs: dead, endMs: end, cause: "Zelenia at 1 HP: the check is met" });
    return out;
  },
  mechanicLabel: (key) => mechanicLabelForKey(key) ?? RULE_KEY_LABELS[key],
};
