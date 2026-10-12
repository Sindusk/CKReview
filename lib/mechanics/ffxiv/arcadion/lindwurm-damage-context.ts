// lib/mechanics/ffxiv/arcadion/lindwurm-damage-context.ts
//
// Damage context for Lindwurm (M12S door boss). Lindwurm II is its own
// fight in the log and has no context yet.
//
// Sources:
// - lindwurm-1.ts header (VERIFIED AGAINST LOGS): the clock, Refreshing
//   Overkill as the timed check (+7:17, lethal at +7:24 in all four
//   enrages), Act 2's In Line chain pairs, Act 3's untargetable stretch.
// - HP measured with build-fight-context/tools/phase-hp.js on
//   H9fnVZgPA3krpCzY (16 pulls, kill B3) and vFY7kHVWK19ZQ24A (kill C1).
// - Duty cost measured 2026-10-12 on B3, C1 and the six wipes that reached
//   Refreshing Overkill or Slaughtershed (B1, B9, B14, B15, A28, A77):
//   casts/s of the duty players against everyone else in the same window.
//
// One phase. The log has no phase segments; the analysis treats the pull
// as one span, and phase 0 here is the documentation and the deciding
// phase.
// - Pool: 104.59M, a fixed pool. The kills took it to 1 HP: C1 at +7:13.1,
//   ended +7:13.8; B3 0.5% at +7:17.7, ended +7:17.8. Refreshing Overkill
//   ends the fight either way, so the whole pool must go before ~+7:17.
//   Wipes at the check: B1 4.1% and B9 2.0% at +7:19 (enraged), so this
//   phase decides the enrage. No hold: the slowdown from 10% to 5% (C1 26s,
//   B3 22s) shows in the enrage wipes too (B9 33s), so it's the fight, not
//   the raid waiting.
// - Untargetable time (Act 3, +3:29-3:42) is inferred by the analysis.
//
// Forced windows:
// - Boss at 1 HP: from that hit to the end (C1: 0.7s).
// - Act 2 chain runs, melee only. From a pair's Unbreakable Flesh to 1.5s
//   after it breaks, alpha leaves Cruel Coil through its opening and beta
//   holds the center. Melee cast 0.68x the others' rate over 31 runs
//   (alpha 0.69, beta 0.67); physical ranged 0.97 (24 runs), casters 0.90
//   (8 runs), so only melee are excused. Curtain Call's chains break all
//   eight at once and have no comparison group: not excused.
// Measured as no loss, so not excused: Act 2 tower soaks (1.03x),
// Mortal Slayer baits (green 1.09x, purple 1.04x), Curtain Call's Rotting
// Flesh holders running into Ravenous Reach (1.14x).

import type { Pull } from "@/types/Pull";
import type { DamageContext, ForcedWindow } from "../../../damage/types";
import { mechanicLabelForKey } from "../../rule-meta";

const BOSS = "Lindwurm";
const ONE_HP = 0.001;
const UNBREAKABLE = [1004753, 1004755];
// Act 2 (+2:00) to Constrictor (+2:57): the In Line pairs break one at a time.
const ACT_2 = 48830;
const ACT_2_SPAN_MS = 70_000;
const AFTER_BREAK_MS = 1_500;

const RULE_KEY_LABELS: Record<string, string> = {
  "ffxiv-lw1-avoidable":   "avoidable damage",
  "ffxiv-lw1-cone":        "Act 1 cones",
  "ffxiv-lw1-overlap":     "spreads",
  "ffxiv-lw1-orb":         "Mortal Slayer",
  "ffxiv-lw1-chain-clip":  "chain explosions",
  "ffxiv-lw1-stack":       "Fourth-Wall Fusion",
  "ffxiv-lw1-buster":      "Visceral Burst",
  "ffxiv-lw1-chain":       "Act 2 chains",
  "ffxiv-lw1-tower":       "Act 2 towers",
  "ffxiv-lw1-metamitosis": "Act 3 towers",
  "ffxiv-lw1-fall":        "a fall",
};

export const LINDWURM_DAMAGE_CONTEXT: DamageContext = {
  encounter: BOSS,
  phases: {
    0: { pool: 104_590_000, fixedPool: true, carriesOver: false, decidesEnrage: true,
      note: "Lindwurm to 1 HP before Refreshing Overkill (~7:17)" },
  },
  forcedWindows: (pull: Pull) => {
    const out: ForcedWindow[] = [];
    const end = pull.fightDuration;
    const dead = pull.players.flatMap((p) => p.damageDone)
      .filter((e) => e.target === BOSS && e.healthAfter !== undefined && e.maxHealth && e.healthAfter / e.maxHealth <= ONE_HP)
      .reduce<number | undefined>((min, e) => (min === undefined || e.timestamp < min ? e.timestamp : min), undefined);
    if (dead !== undefined && dead < end) out.push({ startMs: dead, endMs: end, cause: "Lindwurm at 1 HP: the check is met" });

    const act2 = (pull.enemyCasts ?? []).find((e) => e.abilityId === ACT_2)?.timestamp;
    if (act2 !== undefined) {
      for (const p of pull.players) {
        if (p.rangeType !== "Melee") continue;
        for (const on of p.debuffs.filter((e) => UNBREAKABLE.includes(e.abilityId) && e.debuffStatus === "applied" &&
          e.timestamp >= act2 && e.timestamp <= act2 + ACT_2_SPAN_MS)) {
          const off = p.debuffs.find((e) => e.abilityId === on.abilityId && e.debuffStatus === "removed" && e.timestamp > on.timestamp);
          if (!off) continue;
          out.push({ startMs: on.timestamp, endMs: off.timestamp + AFTER_BREAK_MS, cause: "Act 2 chain run (leaving or holding Cruel Coil)", players: [p.name] });
        }
      }
    }
    return out;
  },
  mechanicLabel: (key) => mechanicLabelForKey(key) ?? RULE_KEY_LABELS[key],
};
