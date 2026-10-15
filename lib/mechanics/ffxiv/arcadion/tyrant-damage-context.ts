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
//
// Movement windows (measured 2026-10-14 on the kills CABrk9zXLfJG8h6R pull 4,
// kC7Y3WbzvKcZrBxT pull 1 (FFLogs fight 2), vVPtwaTQ62Jg391q pull 4, and the
// wipes CABrk9zXLfJG8h6R 1/3, vVPtwaTQ62Jg391q 2/3). Method: every player's
// GCD gaps and ranged fillers (Shield Lob, Unmend, Tomahawk, Piercing Talon,
// Enpi, Writhing Snap ...) with no movement windows, binned to find stretches
// where 3+ players idled at once or several melee disengaged together, then
// matched to the enemy cast that explains them. Movement stays lenient
// (docs/dps-analysis.md): idle in a window beyond the player's own usual
// rate is shown as movement, not counted. Times below are CABrk pull 4 unless
// noted; the other kills sit within ~1.5s.
// - Flatliner launch (47760), everyone, 1s before to 4.5s after: all eight
//   idle 6:03.8-6:08.5 (pull 4), 6:03.0-6:06.0 (kC7Y), 6:04.0-6:06.5 (vVPt).
//   The knockback throws the raid onto the islands.
// - Flatliner towers (46148, three waves), everyone, 2s before to 4.5s after:
//   each tower knocks its soakers away. Six to eight players idle 6:31.1-
//   6:35.6, 7:03.3-7:07.6, 7:40.1-7:45.9 (towers 6:31.4 / 7:03.5 / 7:41.6);
//   the melee's ranged fillers walking out land 1.2-1.5s before the hit
//   (6:30.2 DRG/DRK/PLD, 7:39.9 DRK). Same in both other kills (7-8 idle).
//   The largest movement (1.1-1.5M per pull).
// - Powerful Gust (46119), melee, 3s before to 1.5s after: the melee bait
//   the tornado cones outward, so 3-5 melee press a ranged filler 3:45.5-
//   3:49.0 in every kill (Gust 3:46.8-3:48.2), and in the wipes that reached it.
// - Triple Tyrannhilation (46140), melee, to 5.5s after: hiding behind the
//   rocks for the three Shockwaves (+1.1 / +2.7 / +4.3s) takes the melee out
//   of reach; 2-4 melee ranged fillers 5:45.5-5:48.1 in every kill. The
//   model's "leaving melee for LOS" (METEORAIN block).
// - Fire Breath / Meteowrath lines (46151, both split rounds), melee, 3s
//   before to 1.5s after: melee resolving their lines on the islands press
//   fillers 6:44.4-6:47.7 and 7:17.3 (lines 6:46.2 / 7:18.3); kC7Y and
//   vVPt alike (2-4 melee each round). To 2.5s after, not 1.5s (2026-10-15):
//   the last filler is +1.5s, but the walk back takes longer. Melee who
//   didn't fill late landed their first melee GCD +1.2-2.4s after the cast
//   on all four kills (those who did, +3-4s); K6qf's Warrior idled
//   +1.5-+3.8s after a Tomahawk at -1.0s (xivanalysis 6:45, 2.33s).
// - Arcadion Avalanche throw (the second Avalanche cast, ~9.5s after the
//   first), melee, 4s before to 1s after: the dodge to the safe corner;
//   melee fillers 7:49.6 (throw 7:52.1), kC7Y 7:48.0-7:51.0, vVPt 7:48.5-
//   7:50.0.
// - Stampede tethers (46169 hit on each holder), that player, 4s before to
//   2s after: the holder stretches the tether across and to a corner. 11 of
//   the 16 holders across the three kills and CABrk pull 1 idled 1.5s+ or
//   pressed a filler there (pull 4: DRK Unmend 9:27.0 / 9:30.7, DRG Piercing
//   Talon 9:28.9, PCT 9:27.0-9:28.4 and 9:31.0-9:32.4; tethers 9:31.1).
// Kill CABrk pull 4: unforced 4.32M -> 2.65M, forced (movement left out)
// 1.07M -> 0.31M (shared-filler disengages now read as movement), movement
// 0 -> 2.44M. kC7Y: 9.52M -> 7.31M unforced, movement 2.62M; vVPt: 7.26M ->
// 5.90M, movement 2.49M.
// Checked and left out: Meteorain (4:54-5:32; no shared idle or fillers,
// matching the comet-baiter measurement above); weapon hazards and Assault
// Evolved (one melee filler at a time, 0:50 / 1:39 / 3:29 / 3:34, never
// shared); Orbital Omen / Fire and Fury (3 idle at 4:37 in vVPt only);
// Stampede towers (9:19-9:21, one filler in one kill) and Two-/Four-Way
// (no shared idle). The carriers' route is already forced above.

import type { Pull } from "@/types/Pull";
import type { DamageContext, ForcedWindow } from "../../../damage/types";
import { mechanicLabelForKey } from "../../rule-meta";

const BOSS = "The Tyrant";
const ONE_HP = 0.001;
const ATOMIC_IMPACT = 46164;
const CARRIER_MIN_HITS = 4;
const BEFORE_FIRST_MS = 3_000;
const AFTER_LAST_MS = 1_000;

// Movement windows (header "Movement windows"): [anchor, ms before, ms after, melee only].
const POWERFUL_GUST = 46119;
const TYRANNHILATION = 46140;
const FLATLINER_LAUNCH = 47760;
const FLATLINER_TOWER = 46148;
const FIRE_BREATH = 46151;
const AVALANCHE = "Arcadion Avalanche";
const WAVE_MS = 3_000;                 // one wave's casts land together; the next is 30s+ later
type MoveDef = { cause: string; before: number; after: number; meleeOnly: boolean };
const GUST: MoveDef = { cause: "Powerful Gust (melee bait the cones outward)", before: 3_000, after: 1_500, meleeOnly: true };
const SHOCKWAVES: MoveDef = { cause: "Triple Tyrannhilation (melee hide behind the rocks)", before: 0, after: 5_500, meleeOnly: true };
const LAUNCH: MoveDef = { cause: "Flatliner knockback to the islands", before: 1_000, after: 4_500, meleeOnly: false };
const TOWERS: MoveDef = { cause: "Flatliner towers (knockback)", before: 2_000, after: 4_500, meleeOnly: false };
const BREATHS: MoveDef = { cause: "Fire Breath / Meteowrath lines (melee out of reach)", before: 3_000, after: 2_500, meleeOnly: true };
const THROW: MoveDef = { cause: "Arcadion Avalanche (melee dodge to the safe corner)", before: 4_000, after: 1_000, meleeOnly: true };
const STAMPEDE_TETHER = 46169;         // Majestic Meteowrath on each tower's tether holder
const TETHER_BEFORE_MS = 4_000;
const TETHER_AFTER_MS = 2_000;
const TETHER_CAUSE = "Stampede tether (stretching it to the corner)";

/** First timestamp of each wave of an enemy cast. */
function waves(pull: Pull, match: (abilityId: number, name: string) => boolean): number[] {
  const ts = (pull.enemyCasts ?? []).filter((e) => match(e.abilityId, e.abilityName)).map((e) => e.timestamp).sort((a, b) => a - b);
  return ts.filter((t, i) => i === 0 || t - ts[i - 1] > WAVE_MS);
}

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
  movementWindows: (pull: Pull) => {
    const melee = pull.players.filter((p) => p.rangeType === "Melee").map((p) => p.name);
    const at = (ts: number[], d: MoveDef): ForcedWindow[] => ts.map((t) => ({
      startMs: Math.max(0, t - d.before), endMs: Math.min(pull.fightDuration, t + d.after), cause: d.cause,
      ...(d.meleeOnly ? { players: melee } : {}),
    }));
    // Avalanche is two casts ~9.5s apart (start, then the throw); the throw is the second.
    const avalanche = waves(pull, (_, n) => n === AVALANCHE);
    return [
      ...at(waves(pull, (id) => id === POWERFUL_GUST), GUST),
      ...at(waves(pull, (id) => id === TYRANNHILATION), SHOCKWAVES),
      ...at(waves(pull, (id) => id === FLATLINER_LAUNCH), LAUNCH),
      ...at(waves(pull, (id) => id === FLATLINER_TOWER), TOWERS),
      ...at(waves(pull, (id) => id === FIRE_BREATH), BREATHS),
      ...at(avalanche.filter((t, i) => i > 0 && t - avalanche[i - 1] < 15_000), THROW),
      ...pull.players.flatMap((p) => {
        const t = p.damageTaken.find((e) => e.abilityId === STAMPEDE_TETHER)?.timestamp;
        return t === undefined ? [] : [{ startMs: Math.max(0, t - TETHER_BEFORE_MS), endMs: Math.min(pull.fightDuration, t + TETHER_AFTER_MS),
          cause: TETHER_CAUSE, players: [p.name] }];
      }),
    ].filter((w) => w.endMs > w.startMs && (!w.players || w.players.length > 0));
  },
  mechanicLabel: (key) => mechanicLabelForKey(key) ?? RULE_KEY_LABELS[key],
};
