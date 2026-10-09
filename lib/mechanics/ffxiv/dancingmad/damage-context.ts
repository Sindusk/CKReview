// lib/mechanics/ffxiv/dancingmad/damage-context.ts
//
// Dancing Mad's fight context for the damage analysis
// (docs/archive/damage-analysis-plan.md, Layer 2; lib/damage/types.ts DamageContext).
//
// Phase pools are from the first DPS study (docs/dps-analysis.md, method
// step 1): every log showed the same damage total for P2, P3 and P5, so
// those pools are fixed. Only P5's DPS decides the enrage, so a cooldown
// held from an earlier phase into P5 is not drift.
//
// P2's pool is a kill to 0% (HP_CHECKS below). P1 and P4 are threshold
// checks: Kefka must be under 15% HP when he goes
// untargetable at the end of P1 (phase1.ts "ENRAGE CHECK"), and under 25%
// by his final Ultima Upsurge in P4 (kefka-says.ts header, "PHASE END").
// Neither phase's damage carries over (the next pool is fixed), so once
// he's under the line the rest of the phase is forced: losses there change
// nothing (user, 2026-10-08). The study first read P4's varying total as
// "P4 damage doesn't count" and missed the check. Measured on
// 2T1HzdPKgbhM43am fight 10: P1 under 15% at about +184 (a Paladin rightly
// held the Confiteor chain for P2); P4 under 25% at +859.5, 17.35% at the
// final Upsurge (+868.4).
//
// The end of P3 is a hold: groups stop attacking at Stompies, with both
// bosses low, to time the transition so cooldowns are back for P4 (user,
// 2026-10-08: "This is common"). The P3 pool is fixed, so the hold costs
// nothing. Forced from Stompies' start marker (Kefka's Earthquake just
// before Exdeath's Blizzard III bait, stompies.ts) to the end of P3. On
// 2T1HzdPKgbhM43am fight 10 the marker is +694.3 and players' last hits
// fall +691-703, with Chaos at 0.4% and Exdeath at 2%.
//
// Forced downtime: the transitions and untargetable stretches come from
// the engine's log-inferred raid downtime. Per-player busy windows (tower
// soakers, debuff carriers, baits) are the next step; until then a gap
// during a mechanic is labelled with it ("during Towers (P5)") but still
// counted.

import type { DamageContext, ForcedWindow } from "../../../damage/types";
import { phaseSpans } from "../../../damage/wow/context-helpers";
import { mechanicLabelForKey } from "../../rule-meta";

// Occurrence keys that are single rules, not grouped mechanics.
const RULE_KEY_LABELS: Record<string, string> = {
  "ffxiv-phase1-hyperdrive-out-of-position": "Hyperdrive",
  "ffxiv-exdeath-thunder3-wrong-tank":       "Thunder III (tankbuster)",
  "ffxiv-exdeath-shockwave-silent-kill":     "Shockwave",
  "ffxiv-uk-apocalypse":                     "Stray Apocalypse",
};

// The HP share Kefka must reach, by phase. P2's pool is a kill: he sits
// at 0% until Ultimate Embrace (forsaken.ts), so the rest is wasted too
// (2T1HzdPKgbhM43am fight 10: 0% at +378.4, a Dark Knight then built Blood
// with the AoE combo before the downtime).
const HP_CHECKS: Record<number, number> = { 1: 0.15, 2: 0, 4: 0.25 };

const EARTHQUAKE = 47866;          // Stompies' start marker when Kefka casts it
const STOMPIES_BAIT = 47887;       // Exdeath's Blizzard III bait, Stompies wave 1
const MARKER_LOOKBACK_MS = 15_000;

export const DANCING_MAD_DAMAGE_CONTEXT: DamageContext = {
  encounter: "Dancing Mad",
  phases: {
    1: { note: "Kefka must be under 15% when he goes untargetable" },
    2: { pool: 44_100_000, fixedPool: true, carriesOver: false },
    3: { pool: 75_100_000, fixedPool: true, carriesOver: false, multiTarget: true, note: "Exdeath and Chaos" },
    4: { fixedPool: false, carriesOver: false, note: "Kefka must be under 25% by the final Ultima Upsurge" },
    5: { pool: 56_900_000, fixedPool: true, decidesEnrage: true },
  },
  // Past a check: from the first hit that leaves Kefka under the line to
  // the end of the phase. A pull that never got him there has no window.
  forcedWindows: (pull) => {
    const out: ForcedWindow[] = [];
    for (const [phase, line] of Object.entries(HP_CHECKS)) {
      for (const span of phaseSpans(pull, Number(phase))) {
        const crossed = pull.players
          .flatMap((p) => p.damageDone)
          .filter((e) => e.timestamp >= span.startMs && e.timestamp <= span.endMs
            && e.target === "Kefka" && e.healthAfter !== undefined && e.maxHealth
            && e.healthAfter / e.maxHealth <= line)
          .reduce<number | undefined>((min, e) => (min === undefined || e.timestamp < min ? e.timestamp : min), undefined);
        const reached = line === 0 ? "at 0%" : `under ${line * 100}%`;
        if (crossed !== undefined) out.push({ startMs: crossed, endMs: span.endMs, cause: `P${phase} check passed: Kefka ${reached}` });
      }
    }
    // The end-of-P3 hold, from Stompies' start to the end of the phase.
    const casts = pull.enemyCasts ?? [];
    for (const span of phaseSpans(pull, 3)) {
      const bait = casts.find((e) => e.abilityId === STOMPIES_BAIT && e.timestamp >= span.startMs && e.timestamp <= span.endMs);
      if (!bait) continue;
      const marker = casts.filter((e) => e.abilityId === EARTHQUAKE && e.actorName === "Kefka"
        && e.timestamp <= bait.timestamp && e.timestamp >= bait.timestamp - MARKER_LOOKBACK_MS).pop();
      out.push({ startMs: marker?.timestamp ?? bait.timestamp, endMs: span.endMs, cause: "end-of-P3 hold for P4 timing (Stompies)" });
    }
    return out;
  },
  mechanicLabel: (key) => mechanicLabelForKey(key) ?? RULE_KEY_LABELS[key],
};
