// lib/mechanics/ffxiv/top/damage-context.ts
//
// The Omega Protocol (Ultimate)'s fight context for the damage analysis
// (lib/damage/types.ts DamageContext). Built 2026-10-14 from omega.ts's
// header and HP measured from players' hits on report b9FcR6vxAPd3zhkH
// (111 pulls fetched to +2:30; 14 P1 clears, no full kill).
//
// Phases (FFLogs phase ids):
// - P1 Omega, 8.56M on every pull: killed to 1 HP at 2:00.5-2:07.3 in all
//   14 clears (pulls 79 and 64 the extremes), before Atomic Ray (31480)
//   lands at ~+2:08; the four enrage wipes had 1.2-7.0% left (pulls 65,
//   50, 38, 24). The HP curve keeps its pace to the end (pull 31: 10% ->
//   5% in 9.5s, 5% -> 1 HP in 8.9s), so no group holds it. P2 starts on
//   Omega's death (+2:04-2:10.7), so it's a fixed pool and damage past
//   1 HP is wasted. Omega's death to P2's first hit is untargetable time,
//   inferred from the log.
// - P2 Omega-M and Omega-F (added 2026-10-14 from omega-mf.ts's header and
//   reports BKQ92ndywPaLtbMm, 8hnVr24MtBqNvRAb, ZPpBNMGyrnzJ2LRC: 64 P2
//   pulls fetched 2:00-5:30, 22 P2 clears). Two bosses of 4.31M each,
//   both logged as "Omega" with no instance on damage done, so the pool is
//   the pair: 8.62M, fixed (the clears dealt 7.34-8.13M on them, the rest
//   being the pre-Firewall cleave in P1's segment). Both down at +129.9 to
//   +140.9 from Firewall in every clear, before Laser Shower completes at
//   +141.7 (the enrage wipes A57, A74, B9 had 1.3-15.1% left on the
//   survivor). No hold: the clears kill at full pace up to Laser Shower.
//   FFLogs ends the P2 segment at the second death (B18: last real hit
//   4:31.5, P3 from 4:32.0), so nothing in P2 needs forcing past the kill;
//   Party Synergy's untargetable stretch is inferred from the log. Not
//   built: damage into Omega-F while Omega-M's shield makes her invulnerable
//   (Limitless Synergy), since the log can't tell the two bosses apart.
// - P3 Omega Reconfigured (added 2026-10-14 from omega-reconfiguredd.ts's
//   header and its five reports: 42 P3 pulls fetched to 8:00, 13 P3
//   clears). 11.13M on every pull, first hittable ~+23.7 from the
//   transition's first cast (the transition before it is untargetable,
//   inferred from the log). Every clear took it to 1 HP at +166.6 (D26) to
//   +177.8 (E19), before Ion Efflux (begins +178.2; the enrage wipes B63
//   and C17 had 2.5% and 0.1% left). FFLogs ends the P3 segment at a fixed
//   ~+179 (7:28-7:36 into the pull) however early 1 HP came, so it's a
//   fixed pool and damage past 1 HP is wasted. No hold: 10% -> 5% took
//   4.6-9.2s and 5% -> 1 HP 5.5-12.8s across the clears, the same pace as
//   before. Not built: per-player Hello World duties (tower soakers, rot
//   hand-offs, tethers) and the monitor holders: nobody has measured that
//   they cost damage.
// - P4 Blue Screen (added 2026-10-15 from blue-screen.ts's header and its
//   ten reports C-L: 64 P4 pulls fetched to 9:30, 42 passes including the
//   kill bNcrLh7Y4dkHxM9q pull 16). The revived Omega has 4.90M on every
//   pull; Blue Screen (31611, +62.0-62.4 from P4's first cast) passes when
//   it's under 20% (passes 12.5-19.66%, fails 20.45-36.1%), and P5 is a new
//   enemy, so damage past 20% is wasted: forced from the first hit leaving
//   Omega under 20% to the phase end. The passes crossed 20% at +56.3 (L15)
//   to +62.0 (F6) and dealt 17k-358k after it; no hold (50% -> 25% took
//   13-17s, 25% -> 20% 2.7-4.6s, the same pace). The revived Omega's first
//   logged hits can carry a stale near-0 HP (C28, H5, K4 at +7.7-8.0), so
//   the crossing is read from 20s into the phase (50% comes at +35.6 at the
//   earliest). Not built: per-player duties (the stack crossers): nobody
//   has measured that they cost damage.
// - P5 Run: Dynamis (added 2026-10-15 from run-dynamis.ts's header and its
//   reports E-L: 42 P5 pulls fetched to 14.2 min, 9 reached Blind Faith,
//   the kill bNcrLh7Y4dkHxM9q pull 16). One enemy, logged as Omega-M with
//   13.71M on every pull (Omega-F's hits land on it too). Blind Faith
//   (31623, +294.2 from P5's first cast) passes when it's under 20% (passes
//   13.3-19.4% at the cast, the one fail 30.2%, H24), and P6 is a new
//   enemy, so damage past 20% is wasted: forced from the first hit leaving
//   Omega-M under 20% to the phase end. The passes crossed 20% at 13:06.4
//   (K22) to 13:20.1 (J7), 2-16s before the cast; FFLogs ends the segment
//   ~1.2s after it. No hold: 25% -> 20% took 10-13s, the same pace as
//   50% -> 30% (30% -> 25% spans Omega's untargetable clone dodges,
//   inferred from the log). Not built: per-player duties (World holders,
//   monitor and Blaster sit-outs, tower soakers): nobody has measured that
//   they cost damage.
// - P6: no module yet; left out. The run's last hard enrage is P6's
//   (Alpha Omega), so no phase is marked as deciding it until that phase
//   is measured.
//
// Not built: per-player busy windows (Program Loop's tower soakers and
// tether holders, Pantokrator's missile carriers): the module knows who,
// but nobody has measured that the duty costs damage.

import type { Pull } from "@/types/Pull";
import type { DamageContext, ForcedWindow } from "../../../damage/types";
import { phaseSpans } from "../../../damage/wow/context-helpers";
import { mechanicLabelForKey } from "../../rule-meta";

const ONE_HP = 0.001;

// Rule keys with no label in rule-meta.ts, for "gap during X".
const RULE_KEY_LABELS: Record<string, string> = {
  "ffxiv-top1-blaster":     "Program Loop",
  "ffxiv-top1-avoidable":   "Pantokrator",
  "ffxiv-top1-missile":     "Pantokrator",
  "ffxiv-top1-line":        "Pantokrator",
  "ffxiv-top1-diffuse":     "Diffuse Wave Cannon Kyrios",
  "ffxiv-top1-wave-cannon": "Wave Cannon Kyrios",
  "ffxiv-top2-glitch":      "Party Synergy",
  "ffxiv-top2-fire":        "Party Synergy",
  "ffxiv-top2-stack":       "Party Synergy",
  "ffxiv-top2-synergy":     "Party Synergy",
  "ffxiv-top3-avoidable":   "Omega Reconfigured transition",
  "ffxiv-top3-sniper":      "Sniper Cannon",
  "ffxiv-top3-transition":  "Omega Reconfigured transition",
  "ffxiv-top3-rot-pass":    "Hello World",
  "ffxiv-top3-rot-contact": "Hello World",
  "ffxiv-top3-rot-clip":    "Hello World",
  "ffxiv-top3-defamation":  "Hello World",
  "ffxiv-top3-hello-world": "Hello World",
  "ffxiv-top3-monitor":     "Oversampled Wave Cannon",
  "ffxiv-top4-ring":        "Wave Repeater (P4)",
  "ffxiv-top4-protean":     "Wave Cannon proteans",
  "ffxiv-top4-afterimage":  "Wave Cannon afterimages",
  "ffxiv-top4-stack":       "Wave Cannon stacks",
  "ffxiv-top4-wave-cannon": "Wave Cannon (P4)",
  "ffxiv-top4-blue-screen": "Blue Screen",
  "ffxiv-top5-avoidable":   "Run: Dynamis",
  "ffxiv-top5-wall":        "Run: Dynamis",
  "ffxiv-top5-monitor":     "Oversampled Wave Cannon (P5)",
  "ffxiv-top5-world":       "Hello World (P5)",
  "ffxiv-top5-hello-world": "Hello World (P5)",
  "ffxiv-top5-dynamis":     "Hello World (P5)",
  "ffxiv-top5-prey":        "Sigma Wave Cannon",
  "ffxiv-top5-arm":         "Sigma Hyper Pulse",
  "ffxiv-top5-glitch":      "Sigma towers",
  "ffxiv-top5-tower":       "Sigma towers",
  "ffxiv-top5-blaster":     "Blaster (P5)",
  "ffxiv-top5-fist":        "Rocket Punch",
  "ffxiv-top5-raidwide":    "Run: Dynamis",
  "ffxiv-top5-blind-faith": "Blind Faith",
};

// The revived Omega's first P4 hits can log a stale near-0 HP (C28 +7.7):
// read P4's 20% crossing from this far into the phase (50% comes at +35.6
// at the earliest).
const P4_STALE_MS = 20_000;

/** First hit in the span leaving `target` at or under `line` of its max HP. */
function crossed(pull: Pull, span: { startMs: number; endMs: number }, target: string, line: number): number | undefined {
  return pull.players.flatMap((p) => p.damageDone)
    .filter((e) => e.target === target && e.timestamp >= span.startMs && e.timestamp <= span.endMs &&
      e.healthAfter !== undefined && e.maxHealth && e.healthAfter / e.maxHealth <= line)
    .reduce<number | undefined>((min, e) => (min === undefined || e.timestamp < min ? e.timestamp : min), undefined);
}

export const TOP_DAMAGE_CONTEXT: DamageContext = {
  encounter: "The Omega Protocol",
  phases: {
    1: { pool: 8_560_000, fixedPool: true, carriesOver: false, note: "Omega to 1 HP before Atomic Ray (~2:08); no hold" },
    2: { pool: 8_620_000, fixedPool: true, carriesOver: false, multiTarget: true, note: "Omega-M and Omega-F (4.31M each) both down before Laser Shower (Firewall +141.7); no hold" },
    3: { pool: 11_126_000, fixedPool: true, carriesOver: false, note: "Omega Reconfigured to 1 HP before Ion Efflux (~+178 from the transition); the phase ends at a fixed time; no hold" },
    4: { pool: 4_900_000, fixedPool: false, carriesOver: false, note: "Omega under 20% by Blue Screen (+62 from P4's first cast); P5 is a new enemy; no hold" },
    5: { pool: 13_710_000, fixedPool: false, carriesOver: false, note: "Omega-M under 20% by Blind Faith (+294 from P5's first cast); P6 is a new enemy; no hold" },
  },
  forcedWindows: (pull) => {
    const out: ForcedWindow[] = [];
    for (const span of phaseSpans(pull, 1)) {
      const dead = crossed(pull, span, "Omega", ONE_HP);
      if (dead !== undefined) out.push({ startMs: dead, endMs: span.endMs, cause: "P1 done: Omega at 1 HP" });
    }
    for (const span of phaseSpans(pull, 3)) {
      const dead = crossed(pull, span, "Omega", ONE_HP);
      if (dead !== undefined) out.push({ startMs: dead, endMs: span.endMs, cause: "P3 done: Omega Reconfigured at 1 HP" });
    }
    for (const span of phaseSpans(pull, 4)) {
      const under = crossed(pull, { startMs: span.startMs + P4_STALE_MS, endMs: span.endMs }, "Omega", 0.2);
      if (under !== undefined) out.push({ startMs: under, endMs: span.endMs, cause: "P4 check passed: Omega under 20% for Blue Screen" });
    }
    for (const span of phaseSpans(pull, 5)) {
      const under = crossed(pull, span, "Omega-M", 0.2);
      if (under !== undefined) out.push({ startMs: under, endMs: span.endMs, cause: "P5 check passed: Omega-M under 20% for Blind Faith" });
    }
    return out;
  },
  mechanicLabel: (key) => mechanicLabelForKey(key) ?? RULE_KEY_LABELS[key],
};
