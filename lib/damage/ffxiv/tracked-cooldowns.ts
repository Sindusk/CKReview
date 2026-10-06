// lib/damage/ffxiv/tracked-cooldowns.ts
//
// Which cooldowns the drift check judges, per job (display names from
// lib/ffl-job-data.ts). Only cooldowns gated by nothing but their recast
// belong here: an action that also needs gauge or a proc (Pictomancer's
// Mog of the Ages, Dancer's Finishing Move, Samurai's Guren) sits "ready"
// on its timer while it can't be used, and reads as drift.
//
// The Monk, Paladin, Pictomancer, Reaper, Sage and Scholar lists (groups
// and first-use offsets) are ported from xivanalysis's per-job
// CooldownDowntime modules (src/parser/jobs/<job>/modules/), the only jobs
// it tracks.
//
//   Copyright (c) 2018 Saxon Landers & contributors
//   MIT License; full text in THIRD_PARTY_NOTICES.md.
//
// Every other job tracks only its two-minute party buff here; the role
// batches (docs/damage-analysis-plan.md, Layer 3) add the rest.

export type TrackedCooldownSpec = {
  actions:           string[];  // xivanalysis action keys; several = one shared recast
  firstUseOffsetMs?: number;    // how late the opener normally uses it
};

export const TRACKED_COOLDOWNS: Record<string, TrackedCooldownSpec[]> = {
  // ── From xivanalysis ────────────────────────────────────────────────
  "Monk": [
    { actions: ["BROTHERHOOD"], firstUseOffsetMs: 7000 },
    { actions: ["PERFECT_BALANCE"], firstUseOffsetMs: 3000 },
    { actions: ["RIDDLE_OF_FIRE"], firstUseOffsetMs: 5000 },
    { actions: ["RIDDLE_OF_WIND"], firstUseOffsetMs: 10000 },
  ],
  "Paladin": [
    { actions: ["FIGHT_OR_FLIGHT"], firstUseOffsetMs: 7500 },
    { actions: ["IMPERATOR"], firstUseOffsetMs: 7500 },
    { actions: ["EXPIACION"], firstUseOffsetMs: 10000 },
    { actions: ["CIRCLE_OF_SCORN"], firstUseOffsetMs: 10000 },
    { actions: ["INTERVENE"], firstUseOffsetMs: 12500 },
  ],
  "Pictomancer": [
    { actions: ["POM_MUSE", "WINGED_MUSE", "CLAWED_MUSE", "FANGED_MUSE"] },
    { actions: ["STRIKING_MUSE"] },
    { actions: ["STARRY_MUSE"] },
  ],
  "Reaper": [
    { actions: ["ARCANE_CIRCLE"], firstUseOffsetMs: 5000 },
    { actions: ["SOUL_SLICE", "SOUL_SCYTHE"], firstUseOffsetMs: 4000 },
    { actions: ["GLUTTONY"], firstUseOffsetMs: 6000 },
  ],
  "Sage": [
    { actions: ["PHLEGMA_III"] },
    { actions: ["PSYCHE"] },
  ],
  "Scholar": [
    { actions: ["CHAIN_STRATAGEM"], firstUseOffsetMs: 10000 },
    { actions: ["AETHERFLOW"], firstUseOffsetMs: 7500 },
  ],

  // ── Party buffs only, until the job's batch ─────────────────────────
  "Astrologian": [{ actions: ["DIVINATION"] }],
  "Dancer":      [{ actions: ["TECHNICAL_STEP"] }],
  "Dragoon":     [{ actions: ["BATTLE_LITANY"] }],
  "Red Mage":    [{ actions: ["EMBOLDEN"] }],
  "Summoner":    [{ actions: ["SEARING_LIGHT"] }],
  "Bard":        [{ actions: ["RADIANT_FINALE"] }, { actions: ["BATTLE_VOICE"] }],
  "Ninja":       [{ actions: ["DOKUMORI"] }],
};
