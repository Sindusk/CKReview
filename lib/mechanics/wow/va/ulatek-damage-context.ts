// lib/mechanics/wow/va/ulatek-damage-context.ts
//
// Ula'tek's fight context for the damage analysis (docs/damage-analysis-plan.md,
// "WoW build order" step 4; lib/damage/types.ts DamageContext). Measured on
// JZp82Rm7TzycM94a pull 25 (the 598.6s kill), 2026-10-06. The encounter
// model is ulatek.ts's header.
//
// ── Phases (timed, not pushed: P2 at +174.1, P3 +144.9 later, P4 +53–54) ─
// One shared pool (1673M) across Ula'tek, Gore Rattle and the Venomous
// Heart. The only damage check is that pool before Fury Unleashed (hard
// enrage ~608.8s; the kill had 10s to spare).
// - P1: boss, tail, Wretch, Rawlings, then the first Heart window.
// - P2: adds only (Warden, Clutches, Rawlings, Weakened Doomscales) until
//   Ula'tek returns at ~284.6, then the second Heart window. The adds must
//   die but don't advance the pool, so P2 is multi-target; its damage still
//   counts, since the Heart window (~22% of the pool) is in it.
// - P3 (intermission): eggs and Rawlings only, then the arena shatters and
//   the raid falls. Nothing done here moves the pool: damageCounts false.
// - P4: boss plus waves of adds.
// Heart windows take +200% damage, so a gap there costs about 3×; the
// engine's per-phase GCD value already reflects that only roughly.
//
// ── Forced windows ─────────────────────────────────────────────────────
// - P1 → P2 transition: nothing to hit from the Heart's buff (1299526)
//   going at ~165.5 until the Warden is hittable ~1.6s after P2 starts
//   (all 16 DPS idle, ~10.2s).
// - Circling Prey (cast 1315341): the raid evacuates from the cast for ~5s
//   (idle 440.0–444.9, 491.7–494.6, 553.1–557.2). Movement, the boss stays
//   hittable.
// - Noxious Shell (1307612) in P2: the egg clear (~15 players, 6.5–9.6s,
//   damage ratio ~0). In P1 carriers keep casting (ratio ~1.0): not forced.
// - Doomscale Shell (1300312), the P2 big-egg carry (13.7–19.6s): melee
//   carriers lose ~2/3 of their damage, ranged ~1/2. Forced for melee.
// - Not forced (measured): Coil soaks, Grasping Fangs, Serpent's Bite,
//   Volatile Purge, the tank knockbacks, Mephitic Thrash.

import type { DamageContext, ForcedWindow } from "../../../damage/types";
import { castWindows, debuffWindows, isMelee, phaseSpans } from "../../../damage/wow/context-helpers";

const HEART_EXPOSED = 1299526;
const CIRCLING_PREY = 1315341;
const NOXIOUS_SHELL = 1307612;
const DOOMSCALE_SHELL = 1300312;
const WARDEN_DELAY_MS = 1_600;

export const ULATEK_DAMAGE_CONTEXT: DamageContext = {
  encounter: "Ula'tek",
  phases: {
    1: {},
    2: { multiTarget: true, note: "adds until Ula'tek returns (~110s in), then the second Heart window" },
    3: { damageCounts: false, multiTarget: true, note: "intermission: eggs and Rawlings; doesn't move the pool" },
    4: { multiTarget: true, note: "boss plus add waves; the pool must fall before Fury Unleashed (~608s)" },
  },
  forcedWindows: (pull) => {
    const out: ForcedWindow[] = [];
    const p2 = phaseSpans(pull, 2);
    if (p2.length > 0) {
      const heartGone = (pull.enemyBuffRemovals ?? [])
        .filter((e) => e.abilityId === HEART_EXPOSED && e.timestamp < p2[0].startMs)
        .map((e) => e.timestamp).pop();
      const start = heartGone ?? p2[0].startMs - 8_600;
      out.push({ startMs: start, endMs: p2[0].startMs + WARDEN_DELAY_MS, cause: "P1 → P2 transition (nothing to hit)" });
    }
    out.push(...castWindows(pull, [CIRCLING_PREY], 5_000, "Circling Prey evacuation"));
    out.push(...debuffWindows(pull, [NOXIOUS_SHELL], "carrying an egg (egg clear)", { within: p2, maxMs: 12_000 }));
    out.push(...debuffWindows(pull, [DOOMSCALE_SHELL], "carrying the Doomscale egg", { who: isMelee, maxMs: 22_000 }));
    return out;
  },
};
