// lib/damage/wow/game.ts
//
// The WoW game layer for the damage analysis (docs/damage-analysis-plan.md,
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
// The engine measures each player's actual speed (timeline.ts
// speedProfile), separately inside and outside haste windows.
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
// - isGcdDamage: a gap is priced at the player's own on-GCD abilities only.
//   Counting every DoT tick and pet hit (FFXIV's rule) valued one
//   Assassination Rogue gap on JZp82Rm7TzycM94a pull 25 at 1.7M per GCD,
//   ~2.6× their average: in WoW procs, trinkets and pets keep going.
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

import type { PlayerInfo } from "@/types/PlayerInfo";
import { SPEC_DATA } from "../../spec-data";
import { WOW_SPELL_DATA } from "./spell-data";
import { WOW_TRACKED_COOLDOWNS } from "./tracked-cooldowns";
import { WOW_SPEC_CHECKS } from "./specs";
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
  740,     // Tranquility
  64843,   // Divine Hymn
]);

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
  jobChecks: (job) => WOW_SPEC_CHECKS[job] ?? [],
  jobOf: wowJobOf,
  speed: { minIntervalShare: 0.45, minFactor: 0.5 },
  hasteStatusIds: new Set([...LUST_IDS, POWER_INFUSION]),
  isChannel: (id) => CHANNEL_IDS.has(id),
  // DoT ticks share their spell's id (Agony 980, Shadow Word: Pain 589), so
  // an on-GCD action's ticks count too.
  isGcdDamage: (e) => !e.pet && ACTIONS.get(e.abilityId)?.onGcd === true,
};
