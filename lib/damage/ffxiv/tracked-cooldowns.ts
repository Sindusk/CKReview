// lib/damage/ffxiv/tracked-cooldowns.ts
//
// Which cooldowns the drift check judges, per job (display names from
// lib/ffl-job-data.ts). Only cooldowns gated by nothing but their recast
// belong here: an action that also needs gauge or a proc (Pictomancer's
// Mog of the Ages, Dancer's Finishing Move, Samurai's Guren) sits "ready"
// on its timer while it can't be used, and reads as drift.
//
// The lists below are ported from xivanalysis's per-job cooldown modules
// (src/parser/jobs/<job>/modules/CooldownDowntime.ts, and the tanks'
// Cooldowns / OGCDDowntime): groups, first-use offsets and hold allowances.
//
//   Copyright (c) 2018 Saxon Landers & contributors
//   MIT License; full text in THIRD_PARTY_NOTICES.md.
//
// Jobs whose batch hasn't come yet track only their two-minute party buff;
// the role batches (docs/damage-analysis-plan.md, Layer 3) add the rest.

export type TrackedCooldownSpec = {
  actions:           string[];  // xivanalysis action keys; several = one shared recast
  firstUseOffsetMs?: number;    // how late the opener normally uses it
  holdMs?:           number;    // allowed hold per ready stretch (xivanalysis allowedAverageDowntime)
};

export const TRACKED_COOLDOWNS: Record<string, TrackedCooldownSpec[]> = {
  // ── Tanks (from xivanalysis gnb/Cooldowns.tsx, drk/OGCDDowntime.ts,
  //    war/OGCDDowntime.ts; its 7.4 values) ───────────────────────────
  // Sonic Break is left out: in 7.x it needs Ready to Break from No Mercy,
  // so its "drift" only repeats No Mercy's.
  "Gunbreaker": [
    { actions: ["GNASHING_FANG"], firstUseOffsetMs: 12500 },
    { actions: ["BLASTING_ZONE", "DANGER_ZONE"], firstUseOffsetMs: 12500 },
    { actions: ["NO_MERCY"], firstUseOffsetMs: 5000 },
    { actions: ["BOW_SHOCK"], firstUseOffsetMs: 10000 },
    { actions: ["DOUBLE_DOWN"], firstUseOffsetMs: 10000 },
    { actions: ["BLOODFEST"], firstUseOffsetMs: 2500, holdMs: 0 },
  ],
  "Dark Knight": [
    { actions: ["DELIRIUM"], firstUseOffsetMs: 10000 },
    { actions: ["SALTED_EARTH"], firstUseOffsetMs: 12500 },
    { actions: ["CARVE_AND_SPIT", "ABYSSAL_DRAIN"], firstUseOffsetMs: 17500 },
    { actions: ["SHADOWBRINGER"], firstUseOffsetMs: 20000 },
    { actions: ["LIVING_SHADOW"], firstUseOffsetMs: 5000 },
  ],
  // Infuriate is left out: Fell Cleave and its kin refund 5s of its
  // cooldown, which the drift check doesn't model.
  "Warrior": [
    { actions: ["INNER_RELEASE"], firstUseOffsetMs: 15000, holdMs: 2500 },
    { actions: ["UPHEAVAL", "OROGENY"], firstUseOffsetMs: 12500 },
    { actions: ["ONSLAUGHT"], firstUseOffsetMs: 18500 },
  ],

  // ── Melee (from xivanalysis sam/vpr/drg/nin OGCDDowntime) ───────────
  // Samurai and Viper allow 2.18s of hold (one GCD), Meikyo two.
  "Samurai": [
    { actions: ["MEIKYO_SHISUI"], holdMs: 4360 },
    { actions: ["HISSATSU_GUREN", "HISSATSU_SENEI"], firstUseOffsetMs: 13400, holdMs: 2180 },
    { actions: ["IKISHOTEN"], firstUseOffsetMs: 2500, holdMs: 2180 },
  ],
  "Viper": [
    { actions: ["SERPENTS_IRE"], firstUseOffsetMs: 2500, holdMs: 2180 },
    { actions: ["VICEWINDER", "VICEPIT"], firstUseOffsetMs: 7500, holdMs: 2180 },
  ],
  "Dragoon": [
    { actions: ["HIGH_JUMP"], firstUseOffsetMs: 14500 },
    { actions: ["GEIRSKOGUL"], firstUseOffsetMs: 14500 },
    { actions: ["DRAGONFIRE_DIVE"], firstUseOffsetMs: 14500 },
    { actions: ["LIFE_SURGE"], firstUseOffsetMs: 12000 },
    { actions: ["LANCE_CHARGE"], firstUseOffsetMs: 7000 },
    { actions: ["BATTLE_LITANY"], firstUseOffsetMs: 7000 },
  ],
  "Ninja": [
    { actions: ["KASSATSU"], firstUseOffsetMs: 1000 },
    { actions: ["DOKUMORI"], firstUseOffsetMs: 6000 },
    { actions: ["BUNSHIN"], firstUseOffsetMs: 7000 },
    { actions: ["KUNAIS_BANE"], firstUseOffsetMs: 10000 },
    { actions: ["DREAM_WITHIN_A_DREAM"], firstUseOffsetMs: 12250 },
    { actions: ["TEN_CHI_JIN"], firstUseOffsetMs: 17250 },
    { actions: ["MEISUI"], firstUseOffsetMs: 20750 },
  ],

  // ── Physical ranged (from xivanalysis dnc/OGCDDowntime, brd/OGCDDowntime,
  //    mch/GeneralCDDowntime) ─────────────────────────────────────────
  // Their negative first-use offsets (Standard Step, Reassemble: used
  // before the pull) become 0 here.
  "Dancer": [
    { actions: ["TECHNICAL_STEP"], holdMs: 250 },
    { actions: ["STANDARD_STEP", "FINISHING_MOVE"], holdMs: 250 },
    { actions: ["DEVILMENT"] },
    { actions: ["FLOURISH"] },
  ],
  "Bard": [
    { actions: ["EMPYREAL_ARROW"], firstUseOffsetMs: 4000, holdMs: 1 },
    { actions: ["BATTLE_VOICE"], firstUseOffsetMs: 7500 },
    { actions: ["RADIANT_FINALE"], firstUseOffsetMs: 7500, holdMs: 10000 },
    { actions: ["RAGING_STRIKES"], firstUseOffsetMs: 2500 },
    { actions: ["BARRAGE"], firstUseOffsetMs: 12000 },
    { actions: ["SIDEWINDER"], firstUseOffsetMs: 12000 },
  ],
  "Machinist": [
    { actions: ["WILDFIRE"], firstUseOffsetMs: 10000 },
    { actions: ["BARREL_STABILIZER"], firstUseOffsetMs: 3000 },
    { actions: ["REASSEMBLE"], holdMs: 5000 },
    { actions: ["AIR_ANCHOR"], holdMs: 100 },
    { actions: ["DRILL", "BIOBLASTER"], firstUseOffsetMs: 2500, holdMs: 100 },
    { actions: ["CHAIN_SAW"], firstUseOffsetMs: 12500, holdMs: 100 },
  ],

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
  // Not in xivanalysis; unverified (no White Mage in any sample).
  "White Mage":  [{ actions: ["PRESENCE_OF_MIND"] }],
  "Red Mage":    [{ actions: ["EMBOLDEN"] }],
  "Summoner":    [{ actions: ["SEARING_LIGHT"] }],
};
