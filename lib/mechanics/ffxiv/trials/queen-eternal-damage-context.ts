// lib/mechanics/ffxiv/trials/queen-eternal-damage-context.ts
//
// Damage context for Queen Eternal (Sphene's Burden, Extreme).
//
// Sources:
// - queen-eternal.ts header (VERIFIED AGAINST LOGS and the model): P1 runs
//   to Authority Eternal, which needs the Queen at 0.1% before its cast ends
//   (failure 41036 = enrage); P2 (the second boss form, HP refilled) ends in
//   Preservation 41053. Neither enrage was ever seen.
// - HP measured 2026-10-14 with build-fight-context/tools/phase-hp.js on
//   r83YhVvDwpzBkLyF (kill A16; wipes) and rFQT8XZckzvH1LNx (kills B3, B13;
//   wipes).
//
// The log splits the pull in three phases:
// - 1 (P1): a fixed 65.34M pool. Every push took her to 1 HP: 6:30.0 (B3),
//   6:35.4 (A16), 6:40.4 (A13), 6:44.3 (B13), 6:50.2 (A15). The best wipes
//   short of it left 8.8% (A12 6:35) and 9.8% (A6 6:35). No hold: the HP
//   curve keeps its pace into the push (A16 10% 6:05.7, 5% 6:20.7).
// - 2: the transition after Authority Eternal; the Queen sits at 0 HP and
//   leaves. Damage there doesn't count.
// - 3 (P2): a fresh 18.11M pool, killed 9:23.6 (B3), 9:43.1 (A16), 9:49.1
//   (B13); the deciding phase (Preservation).
//
// Forced windows:
// - each phase's boss at 1 HP: from that hit to the phase's end.
// Not built: movement windows (Freezing Up, Ice tethers, Earth flight),
// not measured on these kills.

import type { Pull } from "@/types/Pull";
import type { DamageContext, ForcedWindow } from "../../../damage/types";
import { mechanicLabelForKey } from "../../rule-meta";
import { phaseSpans } from "../../../damage/wow/context-helpers";

const BOSS = "Queen Eternal";
const ONE_HP = 0.001;

const RULE_KEY_LABELS: Record<string, string> = {
  "ffxiv-queen-eternal-avoidable":    "avoidable damage",
  "ffxiv-queen-eternal-freeze":       "Deep Freeze",
  "ffxiv-queen-eternal-share":        "Retribute / Aeroquell",
  "ffxiv-queen-eternal-spread":       "spreads and baits",
  "ffxiv-queen-eternal-earth":        "Earth towers",
  "ffxiv-queen-eternal-empty-tower":  "Earth towers",
  "ffxiv-queen-eternal-rush":         "Laws of Ice tethers",
  "ffxiv-queen-eternal-ice-dart":     "Drear Rising",
  "ffxiv-queen-eternal-meteor":       "Meteor Impact",
  "ffxiv-queen-eternal-weighty-blow": "Weighty Blow",
  "ffxiv-queen-eternal-fall":         "a death",
};

export const QUEEN_ETERNAL_DAMAGE_CONTEXT: DamageContext = {
  encounter: BOSS,
  phases: {
    1: { pool: 65_340_000, fixedPool: true, carriesOver: false,
      note: "Queen Eternal to 0.1% before Authority Eternal finishes casting" },
    2: { fixedPool: false, carriesOver: false, damageCounts: false, note: "transition after Authority Eternal" },
    3: { pool: 18_110_000, fixedPool: true, carriesOver: false, decidesEnrage: true,
      note: "Queen Eternal to 0 before Preservation" },
  },
  forcedWindows: (pull: Pull) => {
    const out: ForcedWindow[] = [];
    const hits = pull.players.flatMap((p) => p.damageDone)
      .filter((e) => e.target === BOSS && e.healthAfter !== undefined && e.maxHealth && e.healthAfter / e.maxHealth <= ONE_HP);
    for (const phase of [1, 3]) {
      for (const span of phaseSpans(pull, phase)) {
        const t = hits.filter((e) => e.timestamp >= span.startMs && e.timestamp < span.endMs)
          .reduce<number | undefined>((min, e) => (min === undefined || e.timestamp < min ? e.timestamp : min), undefined);
        if (t !== undefined && t < span.endMs) out.push({ startMs: t, endMs: span.endMs, cause: "Queen Eternal at 1 HP: the check is met" });
      }
    }
    return out;
  },
  mechanicLabel: (key) => mechanicLabelForKey(key) ?? RULE_KEY_LABELS[key],
};
