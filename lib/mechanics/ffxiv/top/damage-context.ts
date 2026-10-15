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
// - P3-P6: no module yet; left out. The run's last hard enrage is P6's
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
  },
  forcedWindows: (pull) => {
    const out: ForcedWindow[] = [];
    for (const span of phaseSpans(pull, 1)) {
      const dead = crossed(pull, span, "Omega", ONE_HP);
      if (dead !== undefined) out.push({ startMs: dead, endMs: span.endMs, cause: "P1 done: Omega at 1 HP" });
    }
    return out;
  },
  mechanicLabel: (key) => mechanicLabelForKey(key) ?? RULE_KEY_LABELS[key],
};
