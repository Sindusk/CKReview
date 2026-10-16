// lib/mechanics/ffxiv/tea/damage-context.ts
//
// The Epic of Alexander (Ultimate)'s fight context for the damage analysis
// (lib/damage/types.ts DamageContext). Phase 1 and the Limit Cut
// intermission, built 2026-10-16 from living-liquid.ts's header and HP
// measured from players' hits on report 1NG4Zah79yKYHCDv (73 pulls, no
// kill, 27 Phase 1 clears; fetched to 3:00). Phase 2 (BJ/CC) is below;
// the later phases get log-inferred downtime only.
//
// - P1 Living Liquid: Cascade (+0:19) splits Living Liquid's 3.36M between
//   it and Liquid Hand (the Hand appears at ~39%). Only Living Liquid has to
//   die; on the 27 clears the raid dealt it 2.02-2.09M and the Hand
//   1.15-1.23M, leaving the Hand at 2.2-4.3% (living-liquid.ts: "Liquid
//   Hand does not also need to die"). The phase is HP-gated, not scripted:
//   Living Liquid reached 1 HP anywhere from 1:49.0 (Pull 73) to 2:03.7
//   (Pull 35), with no slow stretch before it (5% to 1 HP took 12-17s,
//   like 10% to 5%), so no hold. Phase 2 starts ~5s after Living Liquid
//   reaches 1 HP (Pull 47: 1:56.7 -> 2:01.8); damage in that gap changes
//   nothing. The Hand's damage only keeps Hand of Pain's HP gap closed, so
//   P1 is multi-target. The enrage Cascade (~+2:22) never happened on disk.
//   The deciding phase is the fight's last (Perfect Alexander), not P1.
//
// - Intermission: Limit Cut (phase 2, intermission-limit-cut.ts): nothing
//   is targetable from Living Liquid's death to ~3s after J Kick. No
//   player damage landed in any of report HwjvVh3TNAZmMQyq's 32 Limit Cuts;
//   the first hit on Brute Justice / Cruise Chaser came 3.6-4.1s after J
//   Kick, just after FFLogs' phase 3 starts. Damage doesn't count; the
//   downtime itself is inferred from the log.
//
// - P2 Brute Justice / Cruise Chaser (phase 3, bj-cc.ts), added 2026-10-16
//   from report LxAVFd29kwPm8HnB's 9 BJ/CC clears (Pulls 9, 10, 12, 13, 14,
//   18, 20, 27, 29; report HwjvVh3TNAZmMQyq's damage capture stops short of
//   its two clears). Two separate 2.17M bosses, both to 1 HP in every clear
//   (2.17M dealt to each): a fixed 4.34M pool over two targets. bj-cc.ts's
//   model: killing one early speeds the other's enrage, so the raid keeps
//   them level; the second reached 1 HP 0.3-3.3s after the first (Pull 27:
//   4:50.2 / 4:50.5; Pull 10: 4:42.4 / 4:45.0). The phase is HP-gated:
//   Temporal Stasis came 3.3s (Pull 9) to 13.3s (Pull 27) after both were
//   at 1 HP, so that wait is forced. Super Jump / Apocalyptic Ray only in
//   the slower clears (Pulls 14, 27). Plasma Shield (30k) is part of the
//   phase's damage and counts. Not built: per-player duties (Nisi passes,
//   the mine tank, Water/Lightning moves): no measurement yet that they cost
//   damage.
//
// Not built: the doll owners' and the raid's deliberate damage control
// (dolls fed under 25%, balancing the two bosses for Hand of Pain): the log
// can't separate a planned hold from a lazy one.

import type { DamageContext, ForcedWindow } from "../../../damage/types";
import { phaseSpans } from "../../../damage/wow/context-helpers";
import { mechanicLabelForKey } from "../../rule-meta";

// Rule keys with no label in rule-meta.ts, for "gap during X".
const RULE_KEY_LABELS: Record<string, string> = {
  "ffxiv-ll-avoidable":  "Living Liquid avoidables",
  "ffxiv-ll-wave-bait":  "Protean Wave",
  "ffxiv-ll-exhaust":    "Jagd Doll Exhaust",
  "ffxiv-ll-doll-kill":  "Jagd Dolls",
  "ffxiv-ll-hand":       "Hand of Parting / Prayer",
  "ffxiv-ll-pain":       "Hand of Pain",
  "ffxiv-lc-stray":      "Limit Cut swords and charges",
  "ffxiv-lc-hawk-blaster": "Hawk Blaster",
};

export const TEA_DAMAGE_CONTEXT: DamageContext = {
  encounter: "The Epic of Alexander",
  phases: {
    1: { pool: 3_360_000, fixedPool: true, carriesOver: false, multiTarget: true,
      note: "Living Liquid to 0 (Cascade splits its HP with Liquid Hand, which needn't die); HP-gated, no hold" },
    2: { damageCounts: false, note: "Limit Cut: nothing targetable until ~3s after J Kick" },
    3: { pool: 4_340_000, fixedPool: true, carriesOver: false, multiTarget: true,
      note: "Brute Justice and Cruise Chaser, 2.17M each, both to 1 HP and kept level; HP-gated" },
  },
  forcedWindows: (pull) => {
    const out: ForcedWindow[] = [];
    for (const span of phaseSpans(pull, 3)) {
      const atOne = (name: string) => pull.players.flatMap((p) => p.damageDone)
        .filter((e) => e.target?.toLowerCase() === name && e.timestamp >= span.startMs && e.timestamp <= span.endMs && e.healthAfter !== undefined && e.maxHealth && e.healthAfter / e.maxHealth <= 0.001)
        .reduce<number | undefined>((min, e) => (min === undefined || e.timestamp < min ? e.timestamp : min), undefined);
      const bj = atOne("brute justice");
      const cc = atOne("cruise chaser");
      if (bj !== undefined && cc !== undefined && Math.max(bj, cc) < span.endMs) out.push({ startMs: Math.max(bj, cc), endMs: span.endMs, cause: "P2 over: both Brute Justice and Cruise Chaser at 1 HP, waiting for the transition" });
    }
    for (const span of phaseSpans(pull, 1)) {
      const dead = pull.players.flatMap((p) => p.damageDone)
        .filter((e) => e.target === "living liquid" && e.timestamp >= span.startMs && e.timestamp <= span.endMs && e.healthAfter !== undefined && e.maxHealth && e.healthAfter / e.maxHealth <= 0.001)
        .reduce<number | undefined>((min, e) => (min === undefined || e.timestamp < min ? e.timestamp : min), undefined);
      if (dead !== undefined && dead < span.endMs) out.push({ startMs: dead, endMs: span.endMs, cause: "P1 over: Living Liquid at 1 HP, waiting for the transition" });
    }
    return out;
  },
  mechanicLabel: (key) => mechanicLabelForKey(key) ?? RULE_KEY_LABELS[key],
};
