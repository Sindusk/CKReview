// lib/damage/wow/game.ts
//
// The WoW game layer for the damage analysis (docs/archive/damage-analysis-plan.md,
// "WoW port"). Same role as lib/damage/ffxiv/game.ts, built on our own
// measured table (spell-data.ts, generated from WCL logs) instead of a
// vendored one: WoWAnalyzer is AGPL, so nothing here is taken from it.
//
// ── Actions ────────────────────────────────────────────────────────────
// From spell-data.ts: on-GCD as inferred from cast spacing (null, too few
// casts, counts as off-GCD). An ability id seen in several specs takes the
// entry with the most casts. The GCD lock is the spec's base GCD:
// - 1.0s, not hasted, for every Rogue, Feral, Brewmaster and Windwalker
//   (FIXED_GCD_SPECS; the survey measured exactly 1000ms for all six)
// - 1.5s, hasted, for everyone else (the survey's modes: 940–1380ms)
// The engine measures each player's actual speed: haste.ts fits the GCD
// through the pull from casts and instants (lust, Power Infusion, haste
// procs and gear); timeline.ts speedProfile (one GCD inside lust / Power
// Infusion, one outside) is the fallback for players it can't fit.
//
// ── Engine hooks WoW needs (lib/damage/types.ts, optional fields) ──────
// - jobOf: findings, spec checks and cooldowns key on "<spec> <class>"; the
//   class alone doesn't say what the player plays.
// - speed: haste reaches the 0.75s GCD floor (factor 0.5 of 1.5s), past
//   FFXIV's clamp.
// - hasteStatusIds: Bloodlust and Power Infusion change the GCD inside a
//   pull; one speed factor per player read lust GCDs as normal and every
//   later GCD as slow.
// - isChannel: channels log no end; their lock runs to their last tick.
// - lockStatus: Deep Breath's lock runs to its flight buff's removal
//   (Convoke the Spirits and Soulcoiler Ritual Vessel to theirs).
// - isGcdDamage: a gap is priced at the player's own on-GCD abilities only.
//   Counting every DoT tick and pet hit (FFXIV's rule) valued one
//   Assassination Rogue gap on JZp82Rm7TzycM94a pull 25 at 1.7M per GCD,
//   ~2.6× their average: in WoW procs, trinkets and pets keep going.
//   Except a Beast Mastery press's own pet hits (PET_PRESS_HITS below).
//
// ── Raid buffs ─────────────────────────────────────────────────────────
// The burst windows (raidBuffStatusIds) are the lust family and Power
// Infusion. IDs as logged on our samples (spell-data.ts "external"
// statuses): Heroism 32182 and Bloodlust 2825 (from Shamans), Time Warp
// 80353 (Mages), Fury of the Aspects 390386 (Evokers), Power Infusion 10060
// (Priests). Primal Rage and drums weren't seen; add them from a log.
// Only Power Infusion is a partyBuff (credited to its Priest in the rDPS
// split, +20% haste, an estimate). The lust family is left out of the
// split on purpose: everyone gets it, everyone's lust is on a fixed
// schedule, and crediting one Shaman with a fifth of the raid's damage
// for 40s would swamp every other number.
//
// ── Not modelled yet ───────────────────────────────────────────────────
// - Penalties: no Venomous Abyss damage-dealt penalty is known.
// - Defensives, disengages: empty until the role batches.
// - Augmentation's support damage (Ebon Might, Prescience) isn't in the
//   rDPS split: WCL credits it in its own way, and our streams don't
//   carry it.

import type { PlayerEvent, PlayerInfo } from "@/types/PlayerInfo";
import { SPEC_DATA } from "../../spec-data";
import { WOW_SPELL_DATA } from "./spell-data";
import { WOW_TRACKED_COOLDOWNS } from "./tracked-cooldowns";
import { WOW_SPEC_CHECKS } from "./specs";
import { combatPotion, potionWindows } from "./specs/potion";
import { WOW_HASTE_STATUS_IDS, wowSpeedModels } from "./haste";
import { WOW_MEASURED_PROCS } from "./procs";
import type { DamageGame, GameAction, PartyBuff } from "../types";

// Rogue (Assassination, Outlaw, Subtlety), Feral, Brewmaster, Windwalker.
const FIXED_GCD_SPECS = new Set([259, 260, 261, 103, 268, 269]);
const FIXED_GCD_MS = 1000;
const HASTED_GCD_MS = 1500;

const LUST_IDS = [32182, 2825, 80353, 390386];   // Heroism, Bloodlust, Time Warp, Fury of the Aspects
const POWER_INFUSION = 10060;

// Channelled GCDs (cast ids from spell-data.ts). A channel whose ticks log
// under another id keeps the plain GCD lock until that id is mapped.
const CHANNEL_IDS = new Set([
  15407,   // Mind Flay
  391403,  // Mind Flay: Insanity
  263165,  // Void Torrent
  257044,  // Rapid Fire
  113656,  // Fists of Fury
  101546,  // Spinning Crane Kick
  443028,  // Celestial Conduit
  198013,  // Eye Beam
  452497,  // Abyssal Gaze
  212084,  // Fel Devastation
  356995,  // Disintegrate
  5143,    // Arcane Missiles
  205021,  // Ray of Frost
  1261153, // Malefic Grasp
  198590,  // Drain Soul (not in the survey: DRAIN_SOUL below)
  740,     // Tranquility
  64843,   // Divine Hymn
  446035,  // Bladestorm (ticks as 50622 "Bladestorm"; see BLADESTORM below)
  115175,  // Soothing Mist (Mistweaver; see MISTWEAVER below)
  399491,  // Sheilun's Gift (Mistweaver, not in the survey)
  117952,  // Crackling Jade Lightning (not in the survey)
  // Font of Venomous Rage, an on-use trinket of any spec: a 2s channel
  // whose five hits log under its id at +0, 0.5, 1.0, 1.5, 2.0s; the next
  // GCD came 2.1–2.4s after the use (p10–median, 32 uses on 11 players of
  // 7 specs, fixed-GCD Rogues too; the Beast Mastery pass of the
  // WoWAnalyzer audit, 2026-10-17). Read as a plain GCD, each use was ~1s
  // of idle ("No GCD after Font of Venomous Rage" on the top BM Yaji).
  1297908,
]);

// GCDs that lock the player for as long as a buff of their own: Scalecommander
// Deep Breath flies 1.3–2.4s (its 433874 buff; qpZx3mWaG7gcDdYB pull 3,
// Bragontix's next GCD came 0.0–0.4s after each removal). Read as a plain
// GCD, every flight was a ~1.1s gap.
// Two more from the healer pass of the WoWAnalyzer audit (2026-10-17), each
// read as ~1–2s of idle per press before:
// - Convoke the Spirits (391528, Restoration Druid): a 3.0s channel whose
//   buff (same id) runs cast to removal (2.97–3.04s); its spells log as
//   casts of their own, nothing under Convoke's name, so isChannel can't
//   time it. Next GCD 2.8–4.4s after the cast (median 3.5s, 32 Convokes,
//   six Resto Druids on Vr8dLPtFYWA4G1yg, LckJC7GMhQvD6rdw,
//   GndQ9VFWtLzNjKpk, dG8D9y6WxrfmtgXp, VbAHWZDdPwJBajmx, gVDPhzp61Zm29HMw).
// - Soulcoiler Ritual Vessel (1291894, a healer on-use item): a 2.0s buff
//   (same id, 1.96–2.03s) that locks the player; the next GCD came 2.02s
//   or later after every one of 27 uses (Resto Shamans, Preservation,
//   Resto Druid on the same reports).
const LOCK_STATUSES = new Map<number, number>([
  [433874, 433874],     // Deep Breath
  [391528, 391528],     // Convoke the Spirits
  [1291894, 1291894],   // Soulcoiler Ritual Vessel
  [115294, 115294],     // Mana Tea (Mistweaver; see MISTWEAVER below)
]);

// Mistweaver (the WoWAnalyzer audit's phase 3, 2026-10-17; seven
// Mistweavers on 6kHtGaQXCMWYxFpZ, 7B1wQbjNhgXJDaHC, aZ6NnwL8g9PdpGJ1,
// r9CX1kpRGLmKJH4M, wWx8B1GPZMLghAyz, ZjVtM1vFcrp7w3WC, gVDPhzp61Zm29HMw).
// The survey had two Mistweavers and missed presses that sat inside the
// "idle" gaps: Sheilun's Gift (inside 53 of them, 168s), Detox (50, 83s),
// Revival (5).
// - Sheilun's Gift (399491) is a channel: its cast logs at the start, no
//   begin-cast, its heals land over 1.0s (median; 2.8s at p90) and the
//   next GCD comes 1.1s+ after it (p10, 81 casts).
// - Detox (115450) and Revival (115310): plain hasted GCDs (next GCD p10
//   0.90s and 0.92s).
// - Mana Tea (115294) is a channel whose buff (same id) runs cast to
//   removal, 1.0–3.3s (p10–p90; 101 casts), the next GCD 0.1–0.3s after
//   the removal; it preceded 119s of the "idle".
// - Soothing Mist (115175) is a channel the healer casts Vivify and
//   Enveloping Mist into; its lock runs to its last heal before the next
//   press. Its short GCD is in haste.ts (SHORT_GCD_IDS).
// - Crackling Jade Lightning (117952): a channel (two casts on the samples).
const SHEILUNS_GIFT = 399491;
const DETOX = 115450;
const REVIVAL = 115310;
const CRACKLING_JADE_LIGHTNING = 117952;

// Arms' Bladestorm: a ~4.5s channel that casts Mortal Strike by itself,
// logged as ordinary casts (39–46 of each Arms Warrior's ~75–100 Mortal
// Strikes on qpZx3mWaG7gcDdYB / NK1hBtW9rckdjq36, none of anything else).
// The survey read Bladestorm as off-GCD because those casts followed it at
// once. It's an on-GCD channel, and its Mortal Strikes aren't presses.
const BLADESTORM = 446035;
const MORTAL_STRIKE = 12294;
// Aldrachi Reaver's Reaver's Glaive (442294; Havoc, the WoWAnalyzer audit's
// phase 3, 2026-10-17) isn't in the survey, so each press read as an idle
// GCD. It's an on-GCD press: the next GCD came 0.75s+ after it (median
// 0.99–1.15s; Poetry LckJC7GMhQvD6rdw, Ldh baRCnPv62YQ1dJZN, Mythnarra
// qpZx3mWaG7gcDdYB, 20–26 a pull).
const REAVERS_GLAIVE = 442294;
// Affliction's Drain Soul (198590; the WoWAnalyzer audit's phase 3,
// 2026-10-17) isn't in the survey either, so each channel read as idle: on
// a4kX1DNT27yHGvqJ (Vashnik) Fluffalicous's 44 Drain Souls put his GCD
// uptime at 57% and 25.3M in gaps. It's an on-GCD channel that ticks under
// its own id: 4 ticks, the last 1.4s after the cast, the next cast 0.2–0.6s
// after that (median; Fluffalicous, and 八十參 on 7B1wQbjNhgXJDaHC).
const DRAIN_SOUL = 198590;
// Templar Retribution's Hammer of Light (427453; the WoWAnalyzer audit's
// phase 3, 2026-10-17) isn't in the survey (53 of 58 Retribution
// player-pulls are Herald of the Sun), so each press read as idle. It's an
// on-GCD press, pressed after every Wake of Ashes and on each Light's
// Deliverance: the next GCD came 0.76s+ after it (median 1.00–1.03s;
// Yenvenger ACmXHMFtaPLR9k8w 22 a pull, Polpo gVDPhzp61Zm29HMw Nek'zali
// 17 and 25). The Empyrean Hammers, Divine Hammers and Sacrosanct Crusade
// it logs as casts are procs, not presses.
const HAMMER_OF_LIGHT = 427453;
const CRUSADING_STRIKES = 408385;
// Vengeance's Sigil of Chains (202138; the WoWAnalyzer audit's phase 3,
// 2026-10-17) isn't in the survey, so each press read as an idle GCD. It's
// an on-GCD press: the next GCD came 0.77s+ after it (p10 0.77–1.03s,
// median 1.0–1.6s; Supadh atJRCq3YM8P4KGpD, Felsky 9w3bK4qhrRC82gVX,
// Chajinadh Ftj4vwHf9RazPcqV, Misohornie gVDPhzp61Zm29HMw; 1–5 a pull on
// 11 of 24 Vengeance player-pulls).
const SIGIL_OF_CHAINS = 202138;

// Beast Mastery's presses land through the pet (the WoWAnalyzer audit's
// phase 3, 2026-10-17): Kill Command's attack is the pet's (83381; 1232922
// from the Pack Leader beasts, Kill Cleave 389448 on other enemies), and so
// are Bestial Wrath's hit (344572), Wild Thrash's (1264355) and the Stomp
// (201754) that lands within a second of a Barbed Shot or Bestial Wrath
// (tcdpmV7MBHK1jGYk Yaji: 88 of 88 Kill Command bursts <1s after the cast,
// Stomp 48 of 58 after Barbed Shot / Bestial Wrath). Priced at the player's
// own hits only, a BM GCD read about half its worth (Deathstriker
// qpZx3mWaG7gcDdYB pull 3: 71k of 150k; ×1.8–3.3 on all 37 BM player-pulls
// on disk), so every BM gap was priced at half. Pet melee, Bloodshed's DoT
// and Beast Cleave keep going while the player idles and stay out.
const PET_PRESS_HITS = new Set([83381, 1232922, 389448, 344572, 1264355, 201754]);

// Taunts (spell-data.ts): Dark Command, Hand of Reckoning, Provoke, Torment.
// Warrior Taunt and Growl weren't cast often enough to appear; add them
// from a log.
const TAUNT_IDS = new Set([56222, 62124, 115546, 185245]);

const PARTY_BUFFS = new Map<number, PartyBuff>([
  [POWER_INFUSION, { name: "Power Infusion", haste: 0.20, partyWide: false }],
]);

const ACTIONS = new Map<number, GameAction>();
{
  const best = new Map<number, { casts: number; specId: number; onGcd: boolean }>();
  for (const spec of Object.values(WOW_SPELL_DATA)) {
    for (const a of spec.abilities) {
      const prev = best.get(a.id);
      if (prev && prev.casts >= a.casts) continue;
      best.set(a.id, { casts: a.casts, specId: spec.specId, onGcd: a.onGcd === true });
    }
  }
  const names = new Map<number, string>();
  for (const spec of Object.values(WOW_SPELL_DATA)) for (const a of spec.abilities) names.set(a.id, a.name);
  for (const [id, b] of best) {
    const fixed = FIXED_GCD_SPECS.has(b.specId);
    const recast = b.onGcd ? (fixed ? FIXED_GCD_MS : HASTED_GCD_MS) : 0;
    ACTIONS.set(id, {
      id, name: names.get(id) ?? `Spell ${id}`,
      onGcd:       b.onGcd,
      recastMs:    recast,
      cooldownMs:  recast,
      charges:     1,
      speedScaled: b.onGcd && !fixed,
      // A WoW spell's aura or DoT usually shares its id; heals land under it.
      appliesStatusIds: [id],
    });
  }
}

{
  const bs = ACTIONS.get(BLADESTORM);
  if (bs) ACTIONS.set(BLADESTORM, { ...bs, onGcd: true, recastMs: HASTED_GCD_MS, cooldownMs: HASTED_GCD_MS, speedScaled: true });
  if (!ACTIONS.has(REAVERS_GLAIVE)) ACTIONS.set(REAVERS_GLAIVE, {
    id: REAVERS_GLAIVE, name: "Reaver's Glaive", onGcd: true, recastMs: HASTED_GCD_MS, cooldownMs: HASTED_GCD_MS,
    charges: 1, speedScaled: true, appliesStatusIds: [REAVERS_GLAIVE],
  });
  if (!ACTIONS.has(HAMMER_OF_LIGHT)) ACTIONS.set(HAMMER_OF_LIGHT, {
    id: HAMMER_OF_LIGHT, name: "Hammer of Light", onGcd: true, recastMs: HASTED_GCD_MS, cooldownMs: HASTED_GCD_MS,
    charges: 1, speedScaled: true, appliesStatusIds: [HAMMER_OF_LIGHT],
  });
  if (!ACTIONS.has(DRAIN_SOUL)) ACTIONS.set(DRAIN_SOUL, {
    id: DRAIN_SOUL, name: "Drain Soul", onGcd: true, recastMs: HASTED_GCD_MS, cooldownMs: HASTED_GCD_MS,
    charges: 1, speedScaled: true, appliesStatusIds: [DRAIN_SOUL],
  });
  for (const [id, name] of [[SHEILUNS_GIFT, "Sheilun's Gift"], [DETOX, "Detox"], [REVIVAL, "Revival"], [CRACKLING_JADE_LIGHTNING, "Crackling Jade Lightning"], [SIGIL_OF_CHAINS, "Sigil of Chains"]] as const) {
    if (!ACTIONS.has(id)) ACTIONS.set(id, {
      id, name, onGcd: true, recastMs: HASTED_GCD_MS, cooldownMs: HASTED_GCD_MS,
      charges: 1, speedScaled: true, appliesStatusIds: [id],
    });
  }
  // Retribution's Crusading Strikes replaces the auto-attack and logs a
  // cast per swing (Polpo, 172 of them on gVDPhzp61Zm29HMw Kith'ix pull 2):
  // read as presses, every swing was a weave in gap labels and the
  // dialog's GCD hover.
  const cs = ACTIONS.get(CRUSADING_STRIKES);
  if (cs) ACTIONS.set(CRUSADING_STRIKES, { ...cs, autoAttack: true });
}

/** Mortal Strikes inside the player's own Bladestorm buff. */
function bladestormAutoCasts(player: PlayerInfo): (c: PlayerEvent) => boolean {
  const wins: [number, number][] = [];
  let open: number | undefined;
  for (const e of [...(player.buffs ?? [])].filter((b) => b.abilityId === BLADESTORM).sort((a, b) => a.timestamp - b.timestamp)) {
    if (e.buffStatus === "applied" && open === undefined) open = e.timestamp;
    else if (e.buffStatus === "removed" && open !== undefined) { wins.push([open, e.timestamp]); open = undefined; }
  }
  if (wins.length === 0) return () => false;
  return (c) => c.abilityId === MORTAL_STRIKE && wins.some(([s, e]) => c.timestamp > s && c.timestamp <= e);
}

export function wowJobOf(player: Pick<PlayerInfo, "specId" | "className">): string {
  const spec = SPEC_DATA[player.specId];
  return spec ? `${spec.name} ${spec.className}` : player.className;
}

export const WOW_DAMAGE: DamageGame = {
  action: (id) => ACTIONS.get(id),
  penaltyFactor: () => undefined,
  raidBuffStatusIds: new Set([...LUST_IDS, POWER_INFUSION]),
  partyBuff: (statusId) => PARTY_BUFFS.get(statusId),
  // WCL marks DoT ticks on the event (`tick`, PlayerEvent.isDoT); ids don't.
  isTickAbility: () => false,
  trackedCooldowns: (job) => WOW_TRACKED_COOLDOWNS[job] ?? [],
  isDefensive: () => false,
  tankSwapActionIds: TAUNT_IDS,
  disengageActionIds: new Set(),
  jobChecks: (job) => [...(WOW_SPEC_CHECKS[job] ?? []), combatPotion],
  potWindows: potionWindows,
  jobOf: wowJobOf,
  speed: { minIntervalShare: 0.45, minFactor: 0.5 },
  hasteStatusIds: new Set([...LUST_IDS, POWER_INFUSION]),
  // Haste procs and gear (haste.ts): the GCD follows them through the pull.
  speedModels: (pull, usesOf, endMs) => wowSpeedModels(pull, usesOf, endMs, [...LUST_IDS, POWER_INFUSION, ...WOW_HASTE_STATUS_IDS]),
  isChannel: (id) => CHANNEL_IDS.has(id),
  lockStatus: (id) => LOCK_STATUSES.get(id),
  isAutoCast: bladestormAutoCasts,
  // WCL buff events carry no duration: the procs checkProcs can see run
  // out, with durations measured from our logs (procs.ts).
  measuredProcs: WOW_MEASURED_PROCS,
  // DoT ticks share their spell's id (Agony 980, Shadow Word: Pain 589), so
  // an on-GCD action's ticks count too.
  // Or a hit named like an on-GCD action the player cast: Havoc's Chaos
  // Strike, Annihilation and Eye Beam hit under other ids than their casts,
  // and by id alone Mythnarra's average GCD read 7k of a real ~219k
  // (qpZx3mWaG7gcDdYB pull 3), pricing every gap at a thirtieth.
  // A Beast Mastery press's pet hits too (PET_PRESS_HITS).
  isGcdDamage: (e, gcdNames) => e.pet
    ? PET_PRESS_HITS.has(e.abilityId)
    : ACTIONS.get(e.abilityId)?.onGcd === true || gcdNames.has(e.abilityName),
  compareFromPullStart: true,
  compareRolesPerPlayer: true,
};
