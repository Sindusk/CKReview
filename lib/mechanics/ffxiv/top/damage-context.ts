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
// - P4-P6: no module yet; left out. The run's last hard enrage is P6's
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
};

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
    return out;
  },
  mechanicLabel: (key) => mechanicLabelForKey(key) ?? RULE_KEY_LABELS[key],
};
