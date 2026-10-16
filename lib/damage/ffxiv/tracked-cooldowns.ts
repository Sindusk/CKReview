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
// the role batches (docs/archive/damage-analysis-plan.md, Layer 3) add the rest.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { TrackedCooldown } from "../types";
import { XIVA_ACTIONS } from "./xiva-data";
import { FORCED_CRIT_SHARE } from "./jobs/melee";

export type TrackedCooldownSpec = {
  actions:           string[];  // xivanalysis action keys; several = one shared recast
  firstUseOffsetMs?: number;    // how late the opener normally uses it
  holdMs?:           number;    // allowed hold per ready stretch (xivanalysis allowedAverageDowntime)
  // Action keys that only follow this cooldown: cast (or hitting) before
  // its first use in the pull, they show it was used before the pull.
  prePullEvidence?:  string[];
  // Action keys its damage logs under, when not its own (a pet's hits).
  damage?:           string[];
  // Its effect lands this long after the press (checks.ts roomForUses).
  landDelayMs?:      number;
  // Its damage is the player's pet hits (Bunshin's shadow).
  petDamage?:        boolean;
  // A cooldown worth what it does to another action (TrackedCooldown.valuePerUse).
  valuePerUse?:      TrackedCooldown["valuePerUse"];
  // Patches where holding it costs nothing (TrackedCooldown.notOnPatches).
  notOnPatches?:     string[];
  // Its hold allowance on these patches (TrackedCooldown.holdMsOnPatches).
  holdMsOnPatches?:  Record<string, number>;
};

// Life Surge: a forced crit on the best GCD, as the Life Surge check values
// one misspent (jobs/melee.ts): the best of Drakesbane / Heavens' Thrust's
// averages × FORCED_CRIT_SHARE. Without it a held Life Surge read as
// nothing (no damage of its own): K6qfMamL7rN8yz2Q Vamp Fatale, 41.9s at
// both charges from 7:41.6, xivanalysis's 13/14.
function lifeSurgeValue(player: PlayerInfo, endMs: number): { value: number; basis: string } | undefined {
  const avg = (key: string) => {
    const id = XIVA_ACTIONS[key]?.id;
    const hits = player.damageDone.filter((e) => e.abilityId === id && !e.isDoT && !e.pet && e.timestamp < endMs && (e.amount ?? 0) > 0);
    return hits.length ? hits.reduce((a, e) => a + (e.amount ?? 0), 0) / hits.length : 0;
  };
  const best = Math.max(avg("DRAKESBANE"), avg("HEAVENS_THRUST"));
  if (best <= 0) return undefined;
  return {
    value: best * FORCED_CRIT_SHARE,
    basis: `${Math.round(best / 1000)}k best of Drakesbane / Heavens' Thrust × ${Math.round(FORCED_CRIT_SHARE * 100)}% (a forced crit over an average hit, estimated)`,
  };
}

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
    // Before 7.4 Bloodfest waited for No Mercy: xivanalysis allows 10s.
    { actions: ["BLOODFEST"], firstUseOffsetMs: 2500, holdMs: 0,
      holdMsOnPatches: Object.fromEntries(["7.0", "7.01", "7.05", "7.1", "7.2", "7.3"].map((p) => [p, 10_000])) },
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
    { actions: ["LIFE_SURGE"], firstUseOffsetMs: 12000, valuePerUse: lifeSurgeValue },
    { actions: ["LANCE_CHARGE"], firstUseOffsetMs: 7000 },
    { actions: ["BATTLE_LITANY"], firstUseOffsetMs: 7000 },
  ],
  "Ninja": [
    { actions: ["KASSATSU"], firstUseOffsetMs: 1000 },
    { actions: ["DOKUMORI"], firstUseOffsetMs: 6000 },
    // Bunshin's damage is its shadow's (pet hits, Phantom Kamaitachi included).
    { actions: ["BUNSHIN"], firstUseOffsetMs: 7000, petDamage: true },
    { actions: ["KUNAIS_BANE"], firstUseOffsetMs: 10000 },
    { actions: ["DREAM_WITHIN_A_DREAM"], firstUseOffsetMs: 12250 },
    { actions: ["TEN_CHI_JIN"], firstUseOffsetMs: 17250 },
    { actions: ["MEISUI"], firstUseOffsetMs: 20750 },
  ],

  // ── Physical ranged (from xivanalysis dnc/OGCDDowntime, brd/OGCDDowntime,
  //    mch/GeneralCDDowntime) ─────────────────────────────────────────
  // Their negative first-use offsets (Standard Step, Reassemble: used
  // before the pull) become 0 here; Standard Step's pre-pull use is read
  // from a Standard Finish before the first Step (Vamp kill: Finish at
  // 0:00.8, first Finishing Move at 0:21.8).
  "Dancer": [
    { actions: ["TECHNICAL_STEP"], holdMs: 250 },
    { actions: ["STANDARD_STEP", "FINISHING_MOVE"], holdMs: 250,
      prePullEvidence: ["STANDARD_FINISH", "SINGLE_STANDARD_FINISH", "DOUBLE_STANDARD_FINISH"] },
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

  // ── Casters (from xivanalysis blm/OGCDDowntime, smn/GeneralCDDowntime,
  //    rdm/GeneralCDDowntime) ─────────────────────────────────────────
  // Black Mage allows 5s of hold and a 15s first-use offset by default.
  "Black Mage": [
    { actions: ["LEY_LINES"], firstUseOffsetMs: 15000, holdMs: 5000 },
    { actions: ["MANAFONT"], firstUseOffsetMs: 25000, holdMs: 5000 },
    { actions: ["TRIPLECAST"], firstUseOffsetMs: 15000, holdMs: 5000 },
    { actions: ["AMPLIFIER"], firstUseOffsetMs: 15000, holdMs: 5000 },
  ],
  "Summoner": [
    { actions: ["SUMMON_BAHAMUT", "SUMMON_PHOENIX", "SUMMON_SOLAR_BAHAMUT"], firstUseOffsetMs: 4500 },
    { actions: ["SMN_ENERGY_DRAIN", "ENERGY_SIPHON"], firstUseOffsetMs: 7500 },
    { actions: ["SEARING_LIGHT"], firstUseOffsetMs: 3500 },
  ],
  // Red Mage allows 1s of hold by default.
  "Red Mage": [
    { actions: ["ACCELERATION"], holdMs: 4000 },
    { actions: ["MANAFICATION"], firstUseOffsetMs: 17500, holdMs: 1000 },
    { actions: ["EMBOLDEN"], firstUseOffsetMs: 7500, holdMs: 1000 },
    { actions: ["FLECHE"], holdMs: 1000 },
    { actions: ["CONTRE_SIXTE"], holdMs: 1000 },
    { actions: ["CORPS_A_CORPS"], holdMs: 1000 },
    { actions: ["ENGAGEMENT", "DISPLACEMENT"], holdMs: 1000 },
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
    // xivanalysis drops it on 7.2 ("not strictly a gain for that patch").
    { actions: ["STRIKING_MUSE"], notOnPatches: ["7.2"] },
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
    // Valued from Energy Drain (the damaging use of its stacks; the rest
    // go to Sacred Soil and other heals, and Dissipation's stacks also
    // feed it, so the average per press is slightly high). Its stacks need
    // a weave to spend: a press in the last GCD of the pull is no use.
    { actions: ["AETHERFLOW"], firstUseOffsetMs: 7500, damage: ["SCH_ENERGY_DRAIN"], landDelayMs: 2_500 },
  ],

  // ── Jobs xivanalysis doesn't track: party buff only ─────────────────
  // Earthly Star (xivanalysis's EarthlyStar module: drift past its 60s):
  // its damage is the pet's Stellar Explosion, or Stellar Burst when
  // detonated early. One placed before the pull shows as an explosion
  // before the first cast (dDar482XvFKBPJYh FRU kill: 0:18, first cast
  // 1:21). Worth ~22-46k a use there, one target.
  "Astrologian": [
    { actions: ["DIVINATION"] },
    { actions: ["EARTHLY_STAR"], prePullEvidence: ["STELLAR_EXPLOSION", "STELLAR_BURST"], damage: ["STELLAR_EXPLOSION", "STELLAR_BURST"], landDelayMs: 10_000 },
  ],
  // Assize added 2026-10-16 (xivanalysis oGCDs.tsx checklist; a damage
  // oGCD). The FFLogs top 15 for Red Hot and Deep Blue press the first at
  // 0:01-0:10 (most ~0:09, in the burst) and hold 11-45s in all over 13
  // uses.
  "White Mage":  [{ actions: ["PRESENCE_OF_MIND"] }, { actions: ["ASSIZE"], firstUseOffsetMs: 10000 }],
};
