// lib/damage/coaching.ts
//
// The Damage dialog's "Biggest wins" summary: every finding kind belongs to
// one coaching theme (keep the GCD rolling, burst windows, ...), and a
// player's top three themes by counted loss are what they can gain the most
// from, each with one actionable tip and its single worst instance. Pure;
// colours and glyphs live in components/ui/DamageGlyphs.tsx.

import type { DamageFinding, FindingKind } from "./types";

export type CoachingTheme = "gcd" | "burst" | "uptime" | "resources" | "healing" | "death";

export const THEME_NAME: Record<CoachingTheme, string> = {
  gcd:       "Keep the GCD rolling",
  burst:     "Burst windows",
  uptime:    "Uptime on the boss",
  resources: "Gauge and procs",
  healing:   "Healing GCDs",
  death:     "Deaths and penalties",
};

// A Record, so a new FindingKind fails to compile until it has a theme.
export const KIND_THEME: Record<FindingKind, CoachingTheme> = {
  "gcd-delay":        "gcd",
  "gcd-drift":        "gcd",
  "gcd-pace":        "gcd",
  "gcd-clipping":     "gcd",
  "interrupted-cast": "gcd",
  "burst-window":     "burst",
  "buff-coverage":    "burst",
  "tincture":         "burst",
  "cooldown-drift":   "burst",
  "dot-uptime":       "uptime",
  "dot-clip":         "uptime",
  "buff-uptime":      "uptime",
  "disengage":        "uptime",
  "positional":       "uptime",
  "movement":         "uptime",
  "gauge-overcap":    "resources",
  "gauge-estimate":   "resources",
  "proc-lost":        "resources",
  "combo-broken":     "resources",
  "missed-followup":  "resources",
  "dance":            "burst",
  "pet-cut":          "resources",
  "aoe-single":       "resources",
  "heal-gcd":         "healing",
  "death":            "death",
  "penalty":          "death",
  "no-damage":        "death",
};

// One line a player can act on, by the theme's costliest kind.
const TIP: Record<FindingKind, string> = {
  "gcd-delay":        "Keep the next GCD queued. When off-GCDs pile up, weave two and hold the rest.",
  "gcd-drift":        "Many small delays add up: press the next GCD before the lock ends, not after it.",
  "gcd-pace":         "Same-spec players pressed faster. Look for a slower GCD setup or late presses.",
  "gcd-clipping":     "Three weaves push the GCD back. Move one off-GCD into the next window.",
  "interrupted-cast": "Cancelled casts are lost time. Start a cast only when you can finish it.",
  "burst-window":     "Fit the full burst sequence inside the buff.",
  "buff-coverage":    "Line your hardest hits up with the raid buffs.",
  "tincture":         "Use the pot with the raid buffs.",
  "cooldown-drift":   "It sat ready for long stretches. Use it on cooldown.",
  "dot-uptime":       "Reapply the DoT as soon as the boss is back.",
  "dot-clip":         "Don't refresh the DoT early, or in the last seconds of the pull.",
  "buff-uptime":      "Keep the self-buff up through the pull.",
  "disengage":        "Stay in range of the boss. Ranged filler is a weak GCD.",
  "positional":       "Hit the positional, or save True North for it.",
  "movement":         "Movement the mechanic required. It isn't counted.",
  "gauge-overcap":    "Spend gauge before it caps.",
  "gauge-estimate":   "Spend gauge before it caps (an estimate: the log doesn't show this gauge).",
  "proc-lost":        "Spend the proc before it runs out.",
  "combo-broken":     "Finish the combo before its timer runs out.",
  "missed-followup":  "Press the follow-up while it's available.",
  "dance":            "Finish every dance with all its steps: a short one weakens the party buff.",
  "pet-cut":          "Let the summon run its full duration.",
  "aoe-single":       "On one target, the single-target button does more.",
  "heal-gcd":         "Those heals mostly overhealed. A damage GCD would have done more.",
  "death":            "The death is the single biggest loss. Review what killed you.",
  "penalty":          "Damage dealt under the penalty debuff cost extra.",
  "no-damage":        "That action hit nothing. Check range and invulnerability.",
};

export type CoachingWin = {
  theme:      CoachingTheme;
  lostDamage: number;    // counted loss in the theme (per pull for aggregates)
  share:      number;    // of the player's counted loss, 0-1
  count:      number;    // findings (or recurring rows) in it
  topKind:    FindingKind;
  tip:        string;
  worst:      DamageFinding;
};

export type CoachingItem = { kind: FindingKind; lostDamage: number; forced: boolean; example: DamageFinding };

/** The top `n` themes by counted loss. Forced and movement findings never count. */
export function biggestWins(items: CoachingItem[], n = 3): CoachingWin[] {
  const counted = items.filter((i) => !i.forced && i.lostDamage >= 1);
  const total = counted.reduce((a, i) => a + i.lostDamage, 0);
  if (total <= 0) return [];
  const byTheme = new Map<CoachingTheme, CoachingItem[]>();
  for (const i of counted) {
    const t = KIND_THEME[i.kind];
    byTheme.set(t, [...(byTheme.get(t) ?? []), i]);
  }
  return [...byTheme].map(([theme, list]) => {
    const lost = list.reduce((a, i) => a + i.lostDamage, 0);
    const byKind = new Map<FindingKind, number>();
    for (const i of list) byKind.set(i.kind, (byKind.get(i.kind) ?? 0) + i.lostDamage);
    const topKind = [...byKind].sort((a, b) => b[1] - a[1])[0][0];
    const worst = list.filter((i) => i.kind === topKind).sort((a, b) => b.example.lostDamage - a.example.lostDamage)[0].example;
    return { theme, lostDamage: lost, share: lost / total, count: list.length, topKind, tip: TIP[topKind], worst };
  }).sort((a, b) => b.lostDamage - a.lostDamage).slice(0, n);
}

export const findingItems = (findings: DamageFinding[]): CoachingItem[] =>
  findings.map((f) => ({ kind: f.kind, lostDamage: f.lostDamage, forced: f.forced, example: f }));
