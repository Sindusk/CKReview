// lib/mechanics/ffxiv/trials/necron-damage-context.ts
//
// Damage context for Necron (The Minstrel's Ballad: Necron's Embrace, Extreme).
//
// Sources:
// - necron.ts header (VERIFIED AGAINST LOGS): the scripted clock, the party
//   add waves (3:20-3:56) and Darkness of Eternity at 4:11 whatever the
//   adds' death times, the individual abyss (~4:25-5:15), and the kills all
//   ending at 9:36-9:42, before Grand Cross #2 and the enrage.
// - HP measured 2026-10-14 with build-fight-context/tools/phase-hp.js on
//   L9BzKkD2nxcVgHTC (kill A6) and pG319BgHTnPJc6Ft (kills B3, B10; wipes).
//
// One phase. The log has no phase segments; phase 0 is the whole pull and
// the deciding phase.
// - Pool: Necron 92.72M, a fixed pool. The kills dealt 91.6-92.7M (A6
//   ended at 1.3% on its last logged hit, B3 at 1 HP at 9:42.5). The best
//   wipes left 21.9% (B9 8:10) and 25.9% (B2 8:58). The research model puts
//   the hard enrage at ~T+380 after the abyss; no pull reached it.
// - Party adds (12 small, 2 big, 0.46M each) are their own check before
//   Darkness of Eternity: damage on them counts. They died by 3:56-4:05 in
//   every pull that passed; Darkness still comes at 4:11, so killing them
//   early doesn't move the clock. Necron is untargetable from the add waves
//   to the return from the abyss; the analysis infers that.
// - The abyss hands (each player's own island; only the logger's are in the
//   log) are left to the inferred downtime.
// - No hold: no HP curve slows before a transition.
//
// Forced windows:
// - Necron at 1 HP: from that hit to the end.
// Not built: movement windows (not measured on these kills).

import type { Pull } from "@/types/Pull";
import type { DamageContext, ForcedWindow } from "../../../damage/types";
import { mechanicLabelForKey } from "../../rule-meta";

const BOSS = "Necron";
const ONE_HP = 0.001;

const RULE_KEY_LABELS: Record<string, string> = {
  "ffxiv-necron-avoidable":   "avoidable damage",
  "ffxiv-necron-mori":        "Memento Mori",
  "ffxiv-necron-hands":       "Fear of Death hands",
  "ffxiv-necron-spread":      "Smite of Gloom / The End's Embrace",
  "ffxiv-necron-grand-cross": "Grand Cross",
  "ffxiv-necron-empty-tower": "Grand Cross towers",
  "ffxiv-necron-shockwave":   "Soul Reaping cones",
  "ffxiv-necron-blue-cleave": "Blue Shockwave",
  "ffxiv-necron-big-hand":    "the add waves",
  "ffxiv-necron-macabre":     "Mass Macabre",
  "ffxiv-necron-abyss":       "the abyss",
  "ffxiv-necron-invitation":  "Invitation",
  "ffxiv-necron-fall":        "a fall",
};

export const NECRON_DAMAGE_CONTEXT: DamageContext = {
  encounter: BOSS,
  phases: {
    0: { pool: 92_720_000, fixedPool: true, carriesOver: false, decidesEnrage: true,
      note: "Necron to 1 HP before Darkness of Eternity (enrage, ~6:20 after the abyss)" },
  },
  forcedWindows: (pull: Pull) => {
    const out: ForcedWindow[] = [];
    const end = pull.fightDuration;
    const dead = pull.players.flatMap((p) => p.damageDone)
      .filter((e) => e.target === BOSS && e.healthAfter !== undefined && e.maxHealth && e.healthAfter / e.maxHealth <= ONE_HP)
      .reduce<number | undefined>((min, e) => (min === undefined || e.timestamp < min ? e.timestamp : min), undefined);
    if (dead !== undefined && dead < end) out.push({ startMs: dead, endMs: end, cause: "Necron at 1 HP: the check is met" });
    return out;
  },
  mechanicLabel: (key) => mechanicLabelForKey(key) ?? RULE_KEY_LABELS[key],
};
