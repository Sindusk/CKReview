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
import { baseValue } from "./jobs/shared";
import { ratesFromStats } from "../crit-rates";

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
  // The level it's learned at (TrackedCooldown.minLevel).
  minLevel?:         number;
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

// Cooldowns worth what they unlock (2026-10-16): with no damage of their
// own, a held one was never reported (on disk: Meisui, Kassatsu,
// Delirium, Amplifier, Acceleration, Reassemble, Striking Muse, Presence
// of Mind, Flourish; MzjZgVWBaLw7tHyT Natalie Suki's Meisui 4 / 5 on
// xivanalysis). A lost use is the player's averages of what it grants
// (`plus`, each key once per use) less what those GCDs replace (`minus`).
// A granted key never pressed in the pull counts 0, so the estimate errs
// low; no plus at all, or a replaced key never pressed, no value.
// Later (2026-10-16): Perfect Balance, Meikyo Shisui, Serpent's Ire and
// Manafication. A group of keys is one use
// of any of them, averaged over all their uses: Monk's Blitzes, Red
// Mage's Verflare or Verholy, a job's filler GCDs.
type UnlockKey = string | { keys: string[]; label: string };
function unlockValue(plus: UnlockKey[], minus: UnlockKey[]) {
  return (player: PlayerInfo, endMs: number): { value: number; basis: string } | undefined => {
    const avg = (key: UnlockKey) => {
      const ids = new Set((typeof key === "string" ? [key] : key.keys).map((k) => XIVA_ACTIONS[k]?.id).filter((id) => id !== undefined));
      const hits = player.damageDone.filter((e) => ids.has(e.abilityId) && !e.isDoT && !e.pet && e.timestamp < endMs && (e.amount ?? 0) > 0);
      // Per cast: several targets' hits within a second are one use.
      let uses = 0, last = -Infinity;
      for (const e of hits) { if (e.timestamp - last > 1_000) uses++; last = e.timestamp; }
      return uses ? hits.reduce((a, e) => a + (e.amount ?? 0), 0) / uses : 0;
    };
    const gain = plus.reduce((a, key) => a + avg(key), 0);
    if (gain <= 0) return undefined;
    // A replaced GCD never pressed would price the gain whole: no value
    // (L9BzKkD2nxcVgHTC Necron pull 13, a 2:15 wipe with Tendo but no plain
    // Midare yet, read 349k for one Meikyo).
    if (minus.some((key) => avg(key) <= 0)) return undefined;
    const cost = minus.reduce((a, key) => a + avg(key), 0);
    const value = gain - cost;
    if (value <= 0) return undefined;
    const k = (n: number) => `${Math.round(n / 1000)}k`;
    const name = (key: UnlockKey) => (typeof key === "string" ? XIVA_ACTIONS[key]?.name ?? key : key.label);
    // Repeated keys print once with a count ("6 × filler GCD").
    const names = (keys: UnlockKey[]) => {
      const counts = new Map<string, number>();
      for (const key of keys) counts.set(name(key), (counts.get(name(key)) ?? 0) + 1);
      return [...counts].map(([n, c]) => (c > 1 ? `${c} × ${n}` : n)).join(" + ");
    };
    return { value, basis: `(${k(gain)} ${names(plus)}${minus.length ? ` − ${k(cost)} ${names(minus)} in their place` : ""}, the player's averages)` };
  };
}

// Groups for unlockValue: GCDs a granted one replaces.
const MNK_FORM_GCD = { label: "form GCD", keys: ["BOOTSHINE", "DRAGON_KICK", "LEAPING_OPO", "TRUE_STRIKE", "TWIN_SNAKES", "RISING_RAPTOR", "DEMOLISH", "SNAP_PUNCH", "POUNCING_COEURL"] };
const MNK_BLITZ = { label: "Blitz", keys: ["ELIXIR_FIELD", "ELIXIR_BURST", "FLINT_STRIKE", "RISING_PHOENIX", "TORNADO_KICK", "PHANTOM_RUSH"] };
const VPR_DUAL_WIELD_GCD = { label: "dual-wield GCD", keys: ["STEEL_FANGS", "REAVING_FANGS", "HUNTERS_STING", "SWIFTSKINS_STING", "FLANKSTING_STRIKE", "FLANKSBANE_FANG", "HINDSTING_STRIKE", "HINDSBANE_FANG"] };
const RDM_FILLER_GCD = { label: "Jolt / Ver- GCD", keys: ["JOLT_III", "VERAERO_III", "VERTHUNDER_III", "VERFIRE", "VERSTONE"] };

// Ley Lines (2026-10-16): no damage of its own; its Circle of Power cuts
// cast and recast times by 15% (xivanalysis CIRCLE_OF_POWER.speedModifier
// 0.85) while the Black Mage stands in it. A lost use is 15% of what they
// dealt inside the circle in an average Ley Lines window: those GCDs
// would have taken 1 / 0.85 as long. Time spent outside the circle is
// already left out, so a player who leaves it is valued at what they used.
function leyLinesValue(player: PlayerInfo, endMs: number): { value: number; basis: string } | undefined {
  const lines = XIVA_STATUSES.LEY_LINES?.id, circle = XIVA_STATUSES.CIRCLE_OF_POWER?.id;
  if (lines === undefined || circle === undefined) return undefined;
  const windowsOf = (statusId: number) => {
    const out: [number, number][] = [];
    let open: number | undefined;
    for (const e of (player.buffs ?? []).filter((b) => b.abilityId === statusId && b.source === player.name).sort((a, b) => a.timestamp - b.timestamp)) {
      if (e.buffStatus === "applied" && open === undefined) open = e.timestamp;
      else if (e.buffStatus === "removed" && open !== undefined) { if (e.timestamp <= endMs) out.push([open, e.timestamp]); open = undefined; }
    }
    return out;
  };
  const uses = windowsOf(lines).length;
  if (uses === 0) return undefined;
  const inCircle = windowsOf(circle);
  const dealt = player.damageDone
    .filter((e) => (e.amount ?? 0) > 0 && !e.isDoT && !e.pet && inCircle.some(([s, t]) => e.timestamp >= s && e.timestamp <= t + 500))
    .reduce((a, e) => a + (e.amount ?? 0), 0) / uses;
  if (dealt <= 0) return undefined;
  return { value: dealt * 0.15, basis: `${Math.round(dealt / 1000)}k dealt in Circle of Power in an average Ley Lines window × 15% (its faster casts)` };
}

// Macrocosmos (xivanalysis Macrocosmos.tsx, 2026-10-18): a GCD worth only
// its extra targets. On one enemy it's level with the Fall Malefic it
// replaces (551 casts on disk: base hit 1.003× the player's Fall Malefic,
// p10-p90 0.96-1.04), so a held one there costs nothing. On two it's
// 1.58× (44 casts), against Gravity II's 1.54× on the same two. A lost use
// is priced from the player's own casts in the pull: each cast that hit
// two or more enemies gains its base damage over the better of Fall
// Malefic and Gravity II on that many targets, one-target casts gain
// nothing, averaged over every cast and priced at their average Fall
// Malefic (crit and direct hit back in). A player who used it only on one
// enemy gets no finding.
function macrocosmosValue(player: PlayerInfo, endMs: number): { value: number; basis: string } | undefined {
  const macro = XIVA_ACTIONS.MACROCOSMOS?.id, fall = XIVA_ACTIONS.FALL_MALEFIC?.id, grav = XIVA_ACTIONS.GRAVITY_II?.id;
  if (macro === undefined || fall === undefined) return undefined;
  const critMult = player.stats ? ratesFromStats(player.stats.criticalHit, player.stats.directHit).critMult : 1.55;
  const hits = player.damageDone.filter((e) => !e.isDoT && !e.pet && e.timestamp < endMs && (e.amount ?? 0) > 0);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : 0);
  const fallHits = hits.filter((e) => e.abilityId === fall);
  const fallBase = avg(fallHits.map((e) => baseValue(e, critMult)));
  const fallRolled = avg(fallHits.map((e) => e.amount ?? 0));
  if (fallBase <= 0) return undefined;
  const gravBase = avg(hits.filter((e) => e.abilityId === grav).map((e) => baseValue(e, critMult)));
  const casts = player.casts.filter((c) => c.abilityId === macro && c.timestamp < endMs);
  if (casts.length === 0) return undefined;
  let gain = 0, multi = 0;
  for (const c of casts) {
    const own = hits.filter((e) => e.abilityId === macro && e.timestamp >= c.timestamp && e.timestamp < c.timestamp + 1_500);
    const targets = new Set(own.map((e) => `${e.targetActorId ?? e.target}.${e.targetInstance ?? 1}`)).size;
    if (targets < 2) continue;
    multi++;
    const instead = Math.max(fallBase, gravBase * targets);
    gain += Math.max(0, own.reduce((a, e) => a + baseValue(e, critMult), 0) - instead);
  }
  if (gain <= 0) return undefined;
  const value = (gain / casts.length) * (fallRolled / fallBase);
  const k = (n: number) => `${Math.round(n / 1000)}k`;
  return {
    value,
    basis: `${k(value)}: what an average Macrocosmos gained over Fall Malefic / Gravity II in its place (${multi} of ${casts.length} casts hit two or more enemies; one enemy gains nothing)`,
  };
}

// Reassemble: a forced crit and direct hit on the best tool, as Life Surge.
function reassembleValue(player: PlayerInfo, endMs: number): { value: number; basis: string } | undefined {
  const best = Math.max(...["DRILL", "AIR_ANCHOR", "CHAIN_SAW", "EXCAVATOR"].map((key) => {
    const id = XIVA_ACTIONS[key]?.id;
    const hits = player.damageDone.filter((e) => e.abilityId === id && !e.isDoT && !e.pet && e.timestamp < endMs && (e.amount ?? 0) > 0);
    return hits.length ? hits.reduce((a, e) => a + (e.amount ?? 0), 0) / hits.length : 0;
  }));
  if (best <= 0) return undefined;
  return { value: best * FORCED_CRIT_SHARE, basis: `${Math.round(best / 1000)}k best of Drill / Air Anchor / Chain Saw / Excavator × ${Math.round(FORCED_CRIT_SHARE * 100)}% (a forced crit over an average hit, estimated)` };
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
    { actions: ["DELIRIUM"], firstUseOffsetMs: 10000,
      valuePerUse: unlockValue(["SCARLET_DELIRIUM", "COMEUPPANCE", "TORCLEAVER", "DISESTEEM"], ["HARD_SLASH", "SYPHON_STRIKE", "SOULEATER", "HARD_SLASH"]) },
    { actions: ["SALTED_EARTH"], firstUseOffsetMs: 12500 },
    { actions: ["CARVE_AND_SPIT", "ABYSSAL_DRAIN"], firstUseOffsetMs: 17500 },
    { actions: ["SHADOWBRINGER"], firstUseOffsetMs: 20000 },
    // Its damage is Esteem's (the only Dark Knight pet). Esteem acting
    // before the first cast shows one pressed before the pull
    // (gNBGDwLzva1JdHXA Cryptknight Myth: Esteem at 0:05.5, first cast
    // 5:10; read as 2 uses, 3 lost at 401k, three runs over two casts;
    // xivanalysis 3 / 5).
    { actions: ["LIVING_SHADOW"], firstUseOffsetMs: 5000, petDamage: true,
      prePullEvidence: ["ESTEEM_ABYSSAL_DRAIN", "ESTEEM_SHADOWBRINGER", "ESTEEM_EDGE_OF_SHADOW", "ESTEEM_BLOODSPILLER", "ESTEEM_DISESTEEM"] },
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
    // Valued by its Tendo alone (xivanalysis ReadyProcs: Meikyo grants
    // Tendo, which turns the next Midare Setsugekka and its Kaeshi into
    // the Tendo ones), the upgrade over the plain pair. The three Sen it
    // gives in three GCDs aren't counted, so this errs low; below level
    // 100 (no Tendo) it has no value.
    { actions: ["MEIKYO_SHISUI"], holdMs: 4360,
      valuePerUse: unlockValue(["TENDO_SETSUGEKKA", "TENDO_KAESHI_SETSUGEKKA"], ["MIDARE_SETSUGEKKA", "KAESHI_SETSUGEKKA"]) },
    { actions: ["HISSATSU_GUREN", "HISSATSU_SENEI"], firstUseOffsetMs: 13400, holdMs: 2180 },
    { actions: ["IKISHOTEN"], firstUseOffsetMs: 2500, holdMs: 2180 },
  ],
  "Viper": [
    // A lost use is one Reawaken (its Ready to Reawaken makes one free of
    // Serpent Offerings, so the pull has one fewer) and one Rattling Coil
    // (xivanalysis RattlingCoil.tsx): the Reawaken sequence and Uncoiled
    // Fury with their oGCDs, against seven dual-wield GCDs in their slots.
    // GCD lengths aren't weighed.
    { actions: ["SERPENTS_IRE"], firstUseOffsetMs: 2500, holdMs: 2180,
      valuePerUse: unlockValue(
        ["REAWAKEN", "FIRST_GENERATION", "SECOND_GENERATION", "THIRD_GENERATION", "FOURTH_GENERATION", "OUROBOROS",
          "FIRST_LEGACY", "SECOND_LEGACY", "THIRD_LEGACY", "FOURTH_LEGACY", "UNCOILED_FURY", "UNCOILED_TWINFANG", "UNCOILED_TWINBLOOD"],
        Array(7).fill(VPR_DUAL_WIELD_GCD)) },
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
    { actions: ["KASSATSU"], firstUseOffsetMs: 1000, valuePerUse: unlockValue(["HYOSHO_RANRYU"], ["RAITON"]) },
    { actions: ["DOKUMORI"], firstUseOffsetMs: 6000 },
    // Bunshin's damage is its shadow's (pet hits, Phantom Kamaitachi included).
    { actions: ["BUNSHIN"], firstUseOffsetMs: 7000, petDamage: true },
    { actions: ["KUNAIS_BANE"], firstUseOffsetMs: 10000 },
    { actions: ["DREAM_WITHIN_A_DREAM"], firstUseOffsetMs: 12250 },
    { actions: ["TEN_CHI_JIN"], firstUseOffsetMs: 17250 },
    { actions: ["MEISUI"], firstUseOffsetMs: 20750, valuePerUse: unlockValue(["ZESHO_MEPPO"], []) },
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
    { actions: ["FLOURISH"], valuePerUse: unlockValue(["FAN_DANCE_III", "FAN_DANCE_IV", "FOUNTAINFALL", "REVERSE_CASCADE"], ["FOUNTAIN", "CASCADE"]) },
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
    { actions: ["REASSEMBLE"], holdMs: 5000, valuePerUse: reassembleValue },
    { actions: ["AIR_ANCHOR"], holdMs: 100 },
    { actions: ["DRILL", "BIOBLASTER"], firstUseOffsetMs: 2500, holdMs: 100 },
    { actions: ["CHAIN_SAW"], firstUseOffsetMs: 12500, holdMs: 100 },
  ],

  // ── Casters (from xivanalysis blm/OGCDDowntime, smn/GeneralCDDowntime,
  //    rdm/GeneralCDDowntime) ─────────────────────────────────────────
  // Black Mage allows 5s of hold and a 15s first-use offset by default.
  "Black Mage": [
    // One charge before 7.1.
    { actions: ["LEY_LINES"], firstUseOffsetMs: 15000, holdMs: 5000, recastOnPatches: onPatches(PRE_7_1, { charges: 1 }), valuePerUse: leyLinesValue },
    // Manafont and Triplecast stay unvalued: Manafont's worth is an extra
    // Astral Fire phase (MP, Umbral Hearts, Thunderhead, Paradox), with no
    // single action to average; Triplecast only makes casts instant, worth
    // something only where the fight forces movement.
    { actions: ["MANAFONT"], firstUseOffsetMs: 25000, holdMs: 5000 },
    { actions: ["TRIPLECAST"], firstUseOffsetMs: 15000, holdMs: 5000 },
    // Learned at 86: TEA's Black Mage (80) read as 1-3 uses lost a pull.
    { actions: ["AMPLIFIER"], firstUseOffsetMs: 15000, holdMs: 5000, minLevel: 86, valuePerUse: unlockValue(["XENOGLOSSY"], ["FIRE_IV"]) },
  ],
  "Summoner": [
    { actions: ["SUMMON_BAHAMUT", "SUMMON_PHOENIX", "SUMMON_SOLAR_BAHAMUT"], firstUseOffsetMs: 4500 },
    { actions: ["SMN_ENERGY_DRAIN", "ENERGY_SIPHON"], firstUseOffsetMs: 7500 },
    { actions: ["SEARING_LIGHT"], firstUseOffsetMs: 3500 },
  ],
  // Red Mage allows 1s of hold by default.
  "Red Mage": [
    { actions: ["ACCELERATION"], holdMs: 4000, valuePerUse: unlockValue(["GRAND_IMPACT"], ["JOLT_III"]) },
    // A lost use is one melee combo (Magicked Swordplay makes one free of
    // mana, so the pull has one fewer) with its finishers, and Prefulgence
    // (xivanalysis: Manafication applies Magicked Swordplay ×3 and
    // Prefulgence Ready), against six filler GCDs. Its +5% on six GCDs
    // isn't counted, nor GCD lengths.
    { actions: ["MANAFICATION"], firstUseOffsetMs: 17500, holdMs: 1000,
      valuePerUse: unlockValue(
        ["MANAFICATION_ENCHANTED_RIPOSTE", "MANAFICATION_ENCHANTED_ZWERCHHAU", "MANAFICATION_ENCHANTED_REDOUBLEMENT",
          { label: "Verflare / Verholy", keys: ["VERFLARE", "VERHOLY"] }, "SCORCH", "RESOLUTION", "PREFULGENCE"],
        Array(6).fill(RDM_FILLER_GCD)) },
    { actions: ["EMBOLDEN"], firstUseOffsetMs: 7500, holdMs: 1000 },
    { actions: ["FLECHE"], holdMs: 1000 },
    { actions: ["CONTRE_SIXTE"], holdMs: 1000 },
    { actions: ["CORPS_A_CORPS"], holdMs: 1000 },
    { actions: ["ENGAGEMENT", "DISPLACEMENT"], holdMs: 1000 },
  ],

  // ── From xivanalysis ────────────────────────────────────────────────
  "Monk": [
    { actions: ["BROTHERHOOD"], firstUseOffsetMs: 7000 },
    // A lost use is a Blitz against the form GCD in its slot, as mnkBlitz
    // (jobs/melee.ts) values one lost to a Perfect Balance run out.
    { actions: ["PERFECT_BALANCE"], firstUseOffsetMs: 3000, valuePerUse: unlockValue([MNK_BLITZ], [MNK_FORM_GCD]) },
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
    { actions: ["STRIKING_MUSE"], notOnPatches: ["7.2"],
      valuePerUse: unlockValue(["HAMMER_STAMP", "HAMMER_BRUSH", "POLISHING_HAMMER"], ["FIRE_IN_RED", "FIRE_IN_RED", "FIRE_IN_RED"]) },
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
    { actions: ["MACROCOSMOS"], valuePerUse: macrocosmosValue, minLevel: 90 },
  ],
  // Assize added 2026-10-16 (xivanalysis oGCDs.tsx checklist; a damage
  // oGCD). The FFLogs top 15 for Red Hot and Deep Blue press the first at
  // 0:01-0:10 (most ~0:09, in the burst) and hold 11-45s in all over 13
  // uses.
  "White Mage":  [{ actions: ["PRESENCE_OF_MIND"], valuePerUse: unlockValue(["GLARE_IV", "GLARE_IV", "GLARE_IV"], ["GLARE_III", "GLARE_III", "GLARE_III"]) }, { actions: ["ASSIZE"], firstUseOffsetMs: 10000 }],
};
