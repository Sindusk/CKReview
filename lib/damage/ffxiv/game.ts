// lib/damage/ffxiv/game.ts
//
// The FFXIV game layer for the damage analysis: action timing from the
// vendored xivanalysis tables (xiva-data.ts), the raid-buff list, and the
// penalty debuffs.
//
// RAID_BUFF_KEYS is adapted from xivanalysis's
// src/parser/core/modules/RaidBuffs.ts (TRACKED_STATUSES), minus the Blue
// Mage statuses, Embolden's self-buff, and the dance-partner-only buffs
// (Standard Finish, Devilment), which are up most of the fight and would
// make every GCD look "in burst".
//
//   Copyright (c) 2018 Saxon Landers & contributors
//   MIT License; full text in THIRD_PARTY_NOTICES.md.
//
// Penalties, measured from FFLogs' per-hit multiplier on Dancing Mad
// (dQ8wmb1VhKt6yBXk pull 11, 2026-10-06):
//   - Damage Down 1002911 (the ultimate's): ×0.10. A hit under No Mercy,
//     Technical Finish, Divination and Starry Muse (×1.40 together) logged
//     ×0.14.
//   - Weakness 1000043 (after a raise): ×0.75.
//   - Brink of Death 1000044: ×0.50 from the tooltip, not seen in a log.

import { XIVA_ACTIONS, XIVA_STATUSES, type XivaAction } from "./xiva-data";
import { TRACKED_COOLDOWNS } from "./tracked-cooldowns";
import { JOB_CHECKS } from "./jobs";
import { FFXIV_ACTION_INDEX } from "../../mitigation/ffxiv-catalog";
import type { DamageGame, GameAction, PartyBuff, TrackedCooldown } from "../types";

const RAID_BUFF_KEYS = [
  "THE_BALANCE", "THE_SPEAR", "DIVINATION", "BATTLE_LITANY", "BATTLE_VOICE",
  "BROTHERHOOD", "CHAIN_STRATAGEM", "EMBOLDEN_PARTY", "TECHNICAL_FINISH",
  "ARCANE_CIRCLE", "SEARING_LIGHT", "RADIANT_FINALE", "MUG", "DOKUMORI",
  "STARRY_MUSE",
];

// Fallbacks only: checkPenalties measures each penalty per pull from hit
// multipliers (lib/damage/checks.ts), since Damage Down varies by fight.
const PENALTIES = new Map<number, number>([
  [1002911, 0.75], // Damage Down: 0.75 in Vamp Fatale, 0.10 in Dancing Mad
  [1000043, 0.75], // Weakness (measured 0.75, Vamp Fatale kill)
  [1000044, 0.50], // Brink of Death (measured 0.50, Vamp Fatale kill)
]);

const GCD_BASE_MS = 2500;

// Party buffs (7.x tooltips). The damage % values for Technical Finish,
// Standard Finish, Divination and Starry Muse match FFLogs' multiplier on
// dQ8wmb1VhKt6yBXk (1.05, 1.05, 1.06, 1.05); the engine also re-measures
// each % buff per pull from hits that carry it alone (lib/damage/buffs.ts),
// which covers Radiant Finale's 2/4/6% and the cards' role split.
const PARTY_BUFFS: Record<string, Omit<PartyBuff, "name">> = {
  TECHNICAL_FINISH:        { damage: 0.05, partyWide: true },
  STANDARD_FINISH_PARTNER: { damage: 0.05, partyWide: false },
  DIVINATION:              { damage: 0.06, partyWide: true },
  STARRY_MUSE:             { damage: 0.05, partyWide: true },
  EMBOLDEN_PARTY:          { damage: 0.05, partyWide: true },
  BROTHERHOOD:             { damage: 0.05, partyWide: true },
  SEARING_LIGHT:           { damage: 0.05, partyWide: true },
  ARCANE_CIRCLE:           { damage: 0.03, partyWide: true },
  RADIANT_FINALE:          { damage: 0.06, partyWide: true },
  DOKUMORI:                { damage: 0.05, partyWide: true },
  MUG:                     { damage: 0.05, partyWide: true },
  THE_BALANCE:             { damageByRange: { melee: 0.06, ranged: 0.03 }, partyWide: false },
  THE_SPEAR:               { damageByRange: { melee: 0.03, ranged: 0.06 }, partyWide: false },
  CHAIN_STRATAGEM:         { crit: 0.10, partyWide: true },
  BATTLE_LITANY:           { crit: 0.10, partyWide: true },
  BATTLE_VOICE:            { directHit: 0.20, partyWide: true },
  DEVILMENT:               { crit: 0.20, directHit: 0.20, partyWide: false },
};
const PARTY_BUFF_BY_ID = new Map<number, PartyBuff>(
  Object.entries(PARTY_BUFFS).flatMap(([key, b]) => {
    const st = XIVA_STATUSES[key];
    return st ? [[st.id, { name: st.name, ...b }] as const] : [];
  }),
);

function toGameAction(a: XivaAction): GameAction {
  const onGcd = a.onGcd === true;
  const cooldown = a.cooldown ?? 0;
  const recast = onGcd ? (a.gcdRecast ?? (cooldown > 0 && cooldown <= 5000 ? cooldown : GCD_BASE_MS)) : 0;
  return {
    id:          a.id,
    name:        a.name,
    onGcd,
    recastMs:    recast,
    cooldownMs:  cooldown,
    charges:     a.charges ?? 1,
    speedScaled: a.speedAttribute !== undefined,
    appliesStatusIds: (a.statusesApplied ?? [])
      .map((key) => XIVA_STATUSES[key]?.id)
      .filter((id): id is number => id !== undefined),
    limitBreak:  a.job === "LIMIT_BREAK" ? true : undefined,
    comboFrom:   a.combo?.from === undefined ? undefined : Array.isArray(a.combo.from) ? a.combo.from : [a.combo.from],
    autoAttack:  a.autoAttack,
    positional:  positionalInfo(a),
  };
}

// Ported from xivanalysis src/parser/core/modules/Positionals.tsx
// (missedPositionalBonusPercents): a hit missed its positional when its
// bonusPercent is one a non-positional potency pair produces, 0 included.
// Checked on dQ8wmb1VhKt6yBXk: the SAM's Gekko shows 61 = 1 − 160/420
// (combo + positional).
function positionalInfo(a: XivaAction): GameAction["positional"] {
  const pots = a.potencies ?? [];
  if (!pots.some((p) => p.bonusModifiers.includes("POSITIONAL"))) return undefined;
  const missed = new Set<number>([0]);
  const bases = pots.filter((p) => p.bonusModifiers.length === 0 ||
    (p.bonusModifiers.length === 1 && p.bonusModifiers[0] === "COMBO"));
  // Only potencies in the same base state pair up: Executioner's Gibbet's
  // Enhanced 760 isn't a bonus over its plain 700. Pairing them made 7%,
  // the bonus a hit positional shows (1 − 700/760, 1 − 760/820), read as
  // a miss: "8 of 8 missed" on the Vamp Fatale kill (jN3XDrf2z8PmLgRJ).
  const baseState = (p: (typeof pots)[number]) => (p.baseModifiers ?? []).join();
  for (const base of bases) {
    for (const bonus of pots) {
      if (bonus.bonusModifiers.includes("POSITIONAL") || bonus.value <= base.value || baseState(bonus) !== baseState(base)) continue;
      missed.add(Math.trunc(100 * (1 - base.value / bonus.value)));
    }
  }
  const hit = pots.filter((p) => p.bonusModifiers.includes("POSITIONAL")).sort((x, y) => y.value - x.value)[0];
  const sameState = (p: (typeof pots)[number]) =>
    p.bonusModifiers.includes("COMBO") === hit.bonusModifiers.includes("COMBO") &&
    (p.baseModifiers ?? []).join() === (hit.baseModifiers ?? []).join();
  const miss = pots.filter((p) => !p.bonusModifiers.includes("POSITIONAL") && sameState(p)).sort((x, y) => y.value - x.value)[0];
  return { missedBonus: [...missed], missCost: miss ? hit.value / miss.value - 1 : 0 };
}

const ACTIONS = new Map<number, GameAction>(
  Object.values(XIVA_ACTIONS).map((a) => [a.id, toGameAction(a)]),
);

const TRACKED = new Map<string, TrackedCooldown[]>(
  Object.entries(TRACKED_COOLDOWNS).map(([job, specs]) => [job, specs.flatMap((spec) => {
    const actions = spec.actions.map((key) => XIVA_ACTIONS[key]).filter((a): a is XivaAction => a !== undefined);
    if (actions.length === 0) return [];
    return [{
      name:             actions.map((a) => a.name).join(" / "),
      actionIds:        actions.map((a) => a.id),
      cooldownMs:       actions[0].cooldown ?? 0,
      charges:          actions[0].charges ?? 1,
      firstUseOffsetMs: spec.firstUseOffsetMs ?? 0,
      holdMs:           spec.holdMs,
      prePullEvidenceIds: spec.prePullEvidence?.map((key) => XIVA_ACTIONS[key]?.id).filter((id): id is number => id !== undefined),
    }];
  })]),
);

const ids = (keys: string[]) => new Set(keys.map((k) => XIVA_ACTIONS[k]?.id).filter((id): id is number => id !== undefined));
const TANK_SWAP_IDS = ids(["PROVOKE", "SHIRK"]);
// xivanalysis's DisengageGcds tracks Lightning Shot and Tomahawk; Unmend and
// Shield Lob are the DRK and PLD equivalents, and the melee have their own
// (xivanalysis's VPR Snaps module tracks Writhing Snap).
const DISENGAGE_IDS = ids(["LIGHTNING_SHOT", "TOMAHAWK", "UNMEND", "SHIELD_LOB",
  "ENPI", "PIERCING_TALON", "THROWING_DAGGER", "HARPE", "WRITHING_SNAP"]);

export const FFXIV_DAMAGE: DamageGame = {
  action: (id) => ACTIONS.get(id),
  penaltyFactor: (statusId) => PENALTIES.get(statusId),
  raidBuffStatusIds: new Set(
    RAID_BUFF_KEYS.map((k) => XIVA_STATUSES[k]?.id).filter((id): id is number => id !== undefined),
  ),
  partyBuff: (statusId) => PARTY_BUFF_BY_ID.get(statusId),
  // FFLogs logs DoT ticks under the status id (+1000000).
  isTickAbility: (abilityId) => abilityId >= 1_000_000,
  trackedCooldowns: (job) => TRACKED.get(job) ?? [],
  isDefensive: (actionId) => FFXIV_ACTION_INDEX.has(actionId),
  tankSwapActionIds: TANK_SWAP_IDS,
  disengageActionIds: DISENGAGE_IDS,
  jobChecks: (job) => JOB_CHECKS[job] ?? [],
};
