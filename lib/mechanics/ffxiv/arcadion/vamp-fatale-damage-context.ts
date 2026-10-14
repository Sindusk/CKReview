// lib/mechanics/ffxiv/arcadion/vamp-fatale-damage-context.ts
//
// Damage context for Vamp Fatale (M9S).
//
// Sources:
// - vamp-fatale.ts header (VERIFIED AGAINST LOGS on jN3XDrf2z8PmLgRJ): a
//   timed script, one boss, no HP transitions; enrage Finale Fatale cast
//   +605 (P6 there). Coffinmaker +68..+125, the boss untargetable while it
//   advances; the add waves (Fatal Flails, Deadly Doornails) +297..+357;
//   Charnel Cells only their inmate can damage.
// - HP measured 2026-10-13 with build-fight-context/tools/phase-hp.js on
//   the kills 6XaWqwMbkZG9pLmx fight 1 (8:36) and 7tb1fYPkjy4RQ2L9 fight 26
//   (9:21).
//
// One phase. The log has no phase segments; phase 0 is the whole pull and
// the deciding phase.
// - Pool: 110.59M, a fixed pool. Both kills took it to 1 HP (+8:35.5,
//   +9:20.2) and dealt 109.5-110.9M; Finale Fatale ends the pull at ~10:05
//   either way, so the pool decides the enrage.
// - Coffinmaker (10.26M) died at 1:58.4 and 1:58.1, killed by damage
//   (10.3-10.4M dealt), and the boss was hit from 1:59.2 / 1:59.7: killing
//   it sooner returns the boss sooner, so damage on it counts. The boss's
//   untargetable stretch is inferred by the analysis.
// - The adds (Flails, Doornails, Cells) must die; damage on them counts.
// - No hold: nothing to hold for in a single-phase fight.
//
// Forced windows:
// - Boss at 1 HP: from that hit to the end.
// The Bard's second DoT after Coffinmaker (user, 2026-10-13: Caustic Bite
// and Stormbite go back on one GCD apart) is handled in the engine
// (shared.ts DotSpec.pairedIds), since it applies after any lapse.

import type { Pull } from "@/types/Pull";
import type { DamageContext, ForcedWindow } from "../../../damage/types";
import { mechanicLabelForKey } from "../../rule-meta";

const BOSS = "Vamp Fatale";
const ONE_HP = 0.001;

const RULE_KEY_LABELS: Record<string, string> = {
  "ffxiv-vf-avoidable":             "avoidable damage",
  "ffxiv-vf-stomp-bat":             "Vamp Stomp",
  "ffxiv-vf-stomp-overlap":         "Vamp Stomp",
  "ffxiv-vf-hardcore-party":        "Hardcore",
  "ffxiv-vf-rain-missed":           "Brutal Rain",
  "ffxiv-vf-rain-wipe":             "Brutal Rain",
  "ffxiv-vf-aetherletting-overlap": "Aetherletting",
  "ffxiv-vf-aetherletting-cross":   "Aetherletting",
  "ffxiv-vf-aetherletting-clip":    "Aetherletting",
  "ffxiv-vf-aetherletting-misplaced": "Aetherletting",
  "ffxiv-vf-saw":                   "the saws",
  "ffxiv-vf-flail-tower":           "Plummet towers",
  "ffxiv-vf-barbed-burst":          "Barbed Burst",
  "ffxiv-vf-doornail":              "Deadly Doornail",
  "ffxiv-vf-cell-tower":            "Hell in a Cell",
  "ffxiv-vf-cell-cone":             "Ultrasonic cones",
  "ffxiv-vf-last-lash":             "Hell in a Cell",
  "ffxiv-vf-deathmatch-tower":      "Undead Deathmatch",
};

export const VAMP_FATALE_DAMAGE_CONTEXT: DamageContext = {
  encounter: BOSS,
  phases: {
    0: { pool: 110_590_000, fixedPool: true, carriesOver: false, decidesEnrage: true,
      note: "Vamp Fatale to 1 HP before Finale Fatale (~10:05)" },
  },
  forcedWindows: (pull: Pull) => {
    const out: ForcedWindow[] = [];
    const end = pull.fightDuration;
    const dead = pull.players.flatMap((p) => p.damageDone)
      .filter((e) => e.target === BOSS && e.healthAfter !== undefined && e.maxHealth && e.healthAfter / e.maxHealth <= ONE_HP)
      .reduce<number | undefined>((min, e) => (min === undefined || e.timestamp < min ? e.timestamp : min), undefined);
    if (dead !== undefined && dead < end) out.push({ startMs: dead, endMs: end, cause: "Vamp Fatale at 1 HP: the check is met" });
    return out;
  },
  mechanicLabel: (key) => mechanicLabelForKey(key) ?? RULE_KEY_LABELS[key],
};
