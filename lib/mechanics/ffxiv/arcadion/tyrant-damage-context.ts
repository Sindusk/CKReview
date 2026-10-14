// lib/mechanics/ffxiv/arcadion/tyrant-damage-context.ts
//
// Damage context for The Tyrant (M11S).
//
// Sources:
// - tyrant.ts header (VERIFIED AGAINST LOGS): the timed script, Heartbreaker
//   as the hard enrage (cast +10:54, lands +11:05), Stampede's Atomic Impact
//   carriers (46164, six hits each), Meteorain's comet baiters (46133).
// - HP measured 2026-10-13 with build-fight-context/tools/phase-hp.js on
//   kC7Y3WbzvKcZrBxT (kill, pull 2 in FFLogs) and vVPtwaTQ62Jg391q (kill
//   pull 6, wipes 3-5).
// - Duty cost measured 2026-10-13 on those two kills and the 9:39 wipe:
//   each player's casts on the boss in the duty window against their own
//   whole-pull rate, duty players against everyone else.
//
// One phase. The log has no phase segments; phase 0 is the whole pull and
// the deciding phase.
// - Pool: 154.29M, a fixed pool. Both kills took it to 1 HP (+10:21.9,
//   +10:24.5) and dealt 153.1-154.2M; the 9:39 wipe left 11.4%. Heartbreaker
//   ends the pull at +11:05 either way, so the pool decides the enrage.
// - No hold: the raid's casts on the boss stay at 21-57 per 10s through
//   both kills, and the slow last 10% (34s + 24s, both kills alike) is the
//   kicks' burst-free stretch, not waiting. Untargetable time is inferred
//   by the analysis (none showed in these pulls).
//
// Forced windows:
// - Boss at 1 HP: from that hit to the end (kill: 0.4s).
// - Stampede Atomic Impact carriers: from 3s before their first hit to 1s
//   after their sixth. They run the far wall route dropping lava; they cast
//   at 0.79/0.75 (SCH, DNC) against the others' 0.95, and 0.44/0.92 (AST,
//   PCT) against 1.04, so 0.73x overall. Carriers are the players with 4+
//   hits; a wipe where Atomic Impact hits everyone (both carriers dead,
//   tyrant.ts C13) excuses nobody.
// Measured as no loss, so not excused: Meteorain comet baiters (melee
// 0.68-0.99 against others' 0.82-1.06, healers and ranged at or above the
// others).

import type { Pull } from "@/types/Pull";
import type { DamageContext, ForcedWindow } from "../../../damage/types";
import { mechanicLabelForKey } from "../../rule-meta";

const BOSS = "The Tyrant";
const ONE_HP = 0.001;
const ATOMIC_IMPACT = 46164;
const CARRIER_MIN_HITS = 4;
const BEFORE_FIRST_MS = 3_000;
const AFTER_LAST_MS = 1_000;

const RULE_KEY_LABELS: Record<string, string> = {
  "ffxiv-tyrant-avoidable":  "avoidable damage",
  "ffxiv-tyrant-overlap":    "bait overlaps",
  "ffxiv-tyrant-stack":      "stacks",
  "ffxiv-tyrant-meteorain":  "Meteorain",
  "ffxiv-tyrant-tower":      "towers",
  "ffxiv-tyrant-stampede":   "Ecliptic Stampede",
  "ffxiv-tyrant-fall":       "a fall",
};

export const TYRANT_DAMAGE_CONTEXT: DamageContext = {
  encounter: BOSS,
  phases: {
    0: { pool: 154_290_000, fixedPool: true, carriesOver: false, decidesEnrage: true,
      note: "The Tyrant to 1 HP before Heartbreaker (~11:05)" },
  },
  forcedWindows: (pull: Pull) => {
    const out: ForcedWindow[] = [];
    const end = pull.fightDuration;
    const dead = pull.players.flatMap((p) => p.damageDone)
      .filter((e) => e.target === BOSS && e.healthAfter !== undefined && e.maxHealth && e.healthAfter / e.maxHealth <= ONE_HP)
      .reduce<number | undefined>((min, e) => (min === undefined || e.timestamp < min ? e.timestamp : min), undefined);
    if (dead !== undefined && dead < end) out.push({ startMs: dead, endMs: end, cause: "The Tyrant at 1 HP: the check is met" });

    const hits = pull.players.map((p) => ({ p, ts: p.damageTaken.filter((e) => e.abilityId === ATOMIC_IMPACT).map((e) => e.timestamp) }));
    const carriers = hits.filter((h) => h.ts.length >= CARRIER_MIN_HITS);
    if (carriers.length <= 2) {
      for (const { p, ts } of carriers) {
        out.push({ startMs: Math.max(0, Math.min(...ts) - BEFORE_FIRST_MS), endMs: Math.min(end, Math.max(...ts) + AFTER_LAST_MS),
          cause: "Atomic Impact carrier (running the lava route)", players: [p.name] });
      }
    }
    return out;
  },
  mechanicLabel: (key) => mechanicLabelForKey(key) ?? RULE_KEY_LABELS[key],
};
