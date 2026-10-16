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
import { XIVA_ACTIONS, XIVA_STATUSES } from "./xiva-data";
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
  // Status keys of a party buff a use leads to (TrackedCooldown.partyBuffStatusIds).
  partyBuffs?:       string[];
  // Patches where holding it costs nothing (TrackedCooldown.notOnPatches).
  notOnPatches?:     string[];
  // Its hold allowance on these patches (TrackedCooldown.holdMsOnPatches).
  holdMsOnPatches?:  Record<string, number>;
  // Its recast / charges on these patches (TrackedCooldown.recastOnPatches).
  recastOnPatches?:  TrackedCooldown["recastOnPatches"];
};

// Patches before a given one, for the per-patch overrides below.
const PRE_7_1 = ["7.0", "7.01", "7.05"];
const PRE_7_4 = [...PRE_7_1, "7.1", "7.2", "7.3"];
const onPatches = <T,>(patches: string[], v: T): Record<string, T> => Object.fromEntries(patches.map((p) => [p, v]));

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

// Bloodfest: no damage of its own, so without this its drift was never
// reported (perUse 0). One lost use is 3 cartridges and the Reign of Beasts
// combo (3 GCDs). The 6 GCDs they'd have taken go to the 1-2-3 combo, whose
// Solid Barrels give back a cartridge every 3 GCDs, spent on a Burst Strike
// in a GCD of its own: 4.5 combo GCDs and 1.5 Burst Strikes fill the 6, so
// 1.5 cartridges are lost net, not 3. Value: Reign combo + 1.5 × (Burst
// Strike + Hypervelocity) − 4.5 × the average combo GCD, the player's own
// averages (raw; Bloodfest sits in No Mercy, so the real loss runs higher).
function bloodfestValue(player: PlayerInfo, endMs: number): { value: number; basis: string } | undefined {
  const avg = (key: string) => {
    const id = XIVA_ACTIONS[key]?.id;
    const hits = player.damageDone.filter((e) => e.abilityId === id && !e.isDoT && !e.pet && e.timestamp < endMs && (e.amount ?? 0) > 0);
    return hits.length ? hits.reduce((a, e) => a + (e.amount ?? 0), 0) / hits.length : 0;
  };
  const reign = avg("REIGN_OF_BEASTS") + avg("NOBLE_BLOOD") + avg("LION_HEART");
  const burst = avg("BURST_STRIKE") + avg("HYPERVELOCITY");
  const combo = ["KEEN_EDGE", "BRUTAL_SHELL", "SOLID_BARREL"].map(avg);
  if (reign <= 0 || burst <= 0 || combo.some((c) => c <= 0)) return undefined;
  const comboAvg = combo.reduce((a, c) => a + c, 0) / 3;
  const value = reign + 1.5 * burst - 4.5 * comboAvg;
  if (value <= 0) return undefined;
  const k = (n: number) => `${Math.round(n / 1000)}k`;
  return {
    value,
    basis: `(${k(reign)} Reign of Beasts combo + 1.5 × ${k(burst)} Burst Strike and Hypervelocity − 4.5 × ${k(comboAvg)} average combo GCD; ` +
      `the 3 cartridges come back 1.5 net through extra Solid Barrels, estimated)`,
  };
}

// Gnashing Fang: valued alone (its hit against the GCD in its slot) a lost
// use came to 0 and was never reported (Mg4p7XG9dtrLVwBf Momo First, 8
// casts, room for 21, xivanalysis 8 / 21; qjCMx4bRfgNKwX9T fight 16's 1).
// A lost use is the combo: Gnashing Fang, Savage Claw, Wicked Talon and
// their three Continuations, less what the cartridge buys instead (a
// Burst Strike and Hypervelocity) and the two combo GCDs in the other
// slots. The player's own averages; a step never pressed counts 0.
function gnashingFangValue(player: PlayerInfo, endMs: number): { value: number; basis: string } | undefined {
  const avg = (key: string) => {
    const id = XIVA_ACTIONS[key]?.id;
    const hits = player.damageDone.filter((e) => e.abilityId === id && !e.isDoT && !e.pet && e.timestamp < endMs && (e.amount ?? 0) > 0);
    if (!hits.length) return 0;
    return hits.reduce((a, e) => a + (e.amount ?? 0), 0) / hits.length;
  };
  const combo = ["GNASHING_FANG", "SAVAGE_CLAW", "WICKED_TALON", "JUGULAR_RIP", "ABDOMEN_TEAR", "EYE_GOUGE"].reduce((a, key) => a + avg(key), 0);
  const cartridge = avg("BURST_STRIKE") + avg("HYPERVELOCITY");
  const filler = ["KEEN_EDGE", "BRUTAL_SHELL", "SOLID_BARREL"].map(avg);
  if (avg("GNASHING_FANG") <= 0 || cartridge <= 0 || filler.some((c) => c <= 0)) return undefined;
  const fillerAvg = filler.reduce((a, c) => a + c, 0) / 3;
  const value = combo - cartridge - 2 * fillerAvg;
  if (value <= 0) return undefined;
  const k = (n: number) => `${Math.round(n / 1000)}k`;
  return {
    value,
    basis: `(${k(combo)} Gnashing Fang combo with its Continuations − ${k(cartridge)} Burst Strike and Hypervelocity the cartridge buys instead − 2 × ${k(fillerAvg)} average combo GCD)`,
  };
}

// Inner Release: no damage of its own, so its drift was never reported
// (L9BzKkD2nxcVgHTC Necron pull 7, Widow Shadowimage: xivanalysis 2 / 3).
// A lost use is its three free Fell Cleaves (sure crit and direct hit)
// and the Primal Rend, Primal Ruination and Primal Wrath it unlocks, the
// GCDs each against the Maim in its slot. The player's own averages (Fell
// Cleave under Inner Release); one never pressed counts 0.
function innerReleaseValue(player: PlayerInfo, endMs: number): { value: number; basis: string } | undefined {
  const irId = XIVA_STATUSES.INNER_RELEASE?.id;
  const avg = (key: string, underIr?: boolean) => {
    const id = XIVA_ACTIONS[key]?.id;
    const hits = player.damageDone.filter((e) => e.abilityId === id && !e.isDoT && !e.pet && e.timestamp < endMs && (e.amount ?? 0) > 0 &&
      (underIr === undefined || (e.statusIds ?? []).includes(irId ?? -1) === underIr));
    return hits.length ? hits.reduce((a, e) => a + (e.amount ?? 0), 0) / hits.length : 0;
  };
  const maim = avg("MAIM");
  const cleave = avg("FELL_CLEAVE", true) || avg("FELL_CLEAVE");
  if (maim <= 0 || cleave <= 0) return undefined;
  const gcds = 3 * (cleave - maim) + Math.max(0, avg("PRIMAL_REND") - maim) + Math.max(0, avg("PRIMAL_RUINATION") - maim);
  const value = gcds + avg("PRIMAL_WRATH");
  if (value <= 0) return undefined;
  const k = (n: number) => `${Math.round(n / 1000)}k`;
  return {
    value,
    basis: `(3 × (${k(cleave)} Fell Cleave in Inner Release − ${k(maim)} Maim) + Primal Rend and Primal Ruination over Maim + ${k(avg("PRIMAL_WRATH"))} Primal Wrath, estimated)`,
  };
}

// A self damage buff (No Mercy +20%, Fight or Flight +25%, Riddle of Fire
// and Raging Strikes +15%, Lance Charge +10%): no damage of its own, so
// its drift was never reported (perUse 0). One lost use is the bonus's
// share of what the player dealt in an average window of it, from their
// own windows in the pull (raw: what it multiplied). Mg4p7XG9dtrLVwBf
// (Momo First): No Mercy 0:06 ... 5:57, then 8:58 (7 uses, room for 10;
// xivanalysis 7 / 10), unreported until this.
function selfBuffValue(statusKey: string, bonus: number) {
  return (player: PlayerInfo, endMs: number): { value: number; basis: string } | undefined => {
    const status = XIVA_STATUSES[statusKey];
    if (!status) return undefined;
    const events = (player.buffs ?? []).filter((e) => e.abilityId === status.id && e.source === player.name).sort((a, b) => a.timestamp - b.timestamp);
    const windows: [number, number][] = [];
    let open: number | undefined;
    for (const e of events) {
      if (e.buffStatus === "applied" && open === undefined) open = e.timestamp;
      else if (e.buffStatus === "removed" && open !== undefined) { if (e.timestamp <= endMs) windows.push([open, e.timestamp]); open = undefined; }
    }
    if (windows.length === 0) return undefined;
    const dealt = windows.reduce((a, [s, t]) => a + player.damageDone
      .filter((e) => e.timestamp >= s && e.timestamp <= t + 500 && (e.amount ?? 0) > 0)
      .reduce((b, e) => b + (e.amount ?? 0), 0), 0) / windows.length;
    if (dealt <= 0) return undefined;
    const share = bonus / (1 + bonus);
    return {
      value: dealt * share,
      basis: `${Math.round(dealt / 1000)}k dealt in an average ${status.name} window × ${Math.round(bonus * 100)}/${Math.round((1 + bonus) * 100)} (its +${Math.round(bonus * 100)}%)`,
    };
  };
}

export const TRACKED_COOLDOWNS: Record<string, TrackedCooldownSpec[]> = {
  // ── Tanks (from xivanalysis gnb/Cooldowns.tsx, drk/OGCDDowntime.ts,
  //    war/OGCDDowntime.ts; its 7.4 values) ───────────────────────────
  // Sonic Break is left out: in 7.x it needs Ready to Break from No Mercy,
  // so its "drift" only repeats No Mercy's.
  "Gunbreaker": [
    // One charge before 7.4 (xivanalysis's patch 7.4 layer).
    { actions: ["GNASHING_FANG"], firstUseOffsetMs: 12500, recastOnPatches: onPatches(PRE_7_4, { charges: 1 }), valuePerUse: gnashingFangValue },
    { actions: ["BLASTING_ZONE", "DANGER_ZONE"], firstUseOffsetMs: 12500 },
    { actions: ["NO_MERCY"], firstUseOffsetMs: 5000, valuePerUse: selfBuffValue("NO_MERCY", 0.2) },
    { actions: ["BOW_SHOCK"], firstUseOffsetMs: 10000 },
    { actions: ["DOUBLE_DOWN"], firstUseOffsetMs: 10000 },
    // Before 7.4 Bloodfest had a 120s recast and waited for No Mercy:
    // xivanalysis allows 10s. Judged at 60s there, the 7.2 Zelenia kills
    // read as 3 uses lost from a Bloodfest every two minutes.
    { actions: ["BLOODFEST"], firstUseOffsetMs: 2500, holdMs: 0, valuePerUse: bloodfestValue,
      holdMsOnPatches: onPatches(PRE_7_4, 10_000), recastOnPatches: onPatches(PRE_7_4, { cooldownMs: 120_000 }) },
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
    { actions: ["INNER_RELEASE"], firstUseOffsetMs: 15000, holdMs: 2500, valuePerUse: innerReleaseValue },
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
    { actions: ["LANCE_CHARGE"], firstUseOffsetMs: 7000, valuePerUse: selfBuffValue("LANCE_CHARGE", 0.1) },
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
    { actions: ["TECHNICAL_STEP"], holdMs: 250, partyBuffs: ["TECHNICAL_FINISH"] },
    { actions: ["STANDARD_STEP", "FINISHING_MOVE"], holdMs: 250,
      prePullEvidence: ["STANDARD_FINISH", "SINGLE_STANDARD_FINISH", "DOUBLE_STANDARD_FINISH"] },
    { actions: ["DEVILMENT"] },
    { actions: ["FLOURISH"] },
  ],
  "Bard": [
    { actions: ["EMPYREAL_ARROW"], firstUseOffsetMs: 4000, holdMs: 1 },
    { actions: ["BATTLE_VOICE"], firstUseOffsetMs: 7500 },
    { actions: ["RADIANT_FINALE"], firstUseOffsetMs: 7500, holdMs: 10000 },
    { actions: ["RAGING_STRIKES"], firstUseOffsetMs: 2500, valuePerUse: selfBuffValue("RAGING_STRIKES", 0.15) },
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
    // One charge before 7.1.
    { actions: ["LEY_LINES"], firstUseOffsetMs: 15000, holdMs: 5000, recastOnPatches: onPatches(PRE_7_1, { charges: 1 }) },
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
    { actions: ["RIDDLE_OF_FIRE"], firstUseOffsetMs: 5000, valuePerUse: selfBuffValue("RIDDLE_OF_FIRE", 0.15) },
    { actions: ["RIDDLE_OF_WIND"], firstUseOffsetMs: 10000 },
  ],
  "Paladin": [
    { actions: ["FIGHT_OR_FLIGHT"], firstUseOffsetMs: 7500, valuePerUse: selfBuffValue("FIGHT_OR_FLIGHT", 0.25) },
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
