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
import type { DamageGame, GameAction, TrackedCooldown } from "../types";

const RAID_BUFF_KEYS = [
  "THE_BALANCE", "THE_SPEAR", "DIVINATION", "BATTLE_LITANY", "BATTLE_VOICE",
  "BROTHERHOOD", "CHAIN_STRATAGEM", "EMBOLDEN_PARTY", "TECHNICAL_FINISH",
  "ARCANE_CIRCLE", "SEARING_LIGHT", "RADIANT_FINALE", "MUG", "DOKUMORI",
  "STARRY_MUSE",
];

const PENALTIES = new Map<number, number>([
  [1002911, 0.10], // Damage Down (Dancing Mad)
  [1000043, 0.75], // Weakness
  [1000044, 0.50], // Brink of Death (unverified)
]);

const GCD_BASE_MS = 2500;

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
  };
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
    }];
  })]),
);

const ids = (keys: string[]) => new Set(keys.map((k) => XIVA_ACTIONS[k]?.id).filter((id): id is number => id !== undefined));
const TANK_SWAP_IDS = ids(["PROVOKE", "SHIRK"]);
// xivanalysis's DisengageGcds tracks Lightning Shot and Tomahawk; Unmend and
// Shield Lob are the DRK and PLD equivalents.
const DISENGAGE_IDS = ids(["LIGHTNING_SHOT", "TOMAHAWK", "UNMEND", "SHIELD_LOB"]);

export const FFXIV_DAMAGE: DamageGame = {
  action: (id) => ACTIONS.get(id),
  penaltyFactor: (statusId) => PENALTIES.get(statusId),
  raidBuffStatusIds: new Set(
    RAID_BUFF_KEYS.map((k) => XIVA_STATUSES[k]?.id).filter((id): id is number => id !== undefined),
  ),
  // FFLogs logs DoT ticks under the status id (+1000000).
  isTickAbility: (abilityId) => abilityId >= 1_000_000,
  trackedCooldowns: (job) => TRACKED.get(job) ?? [],
  isDefensive: (actionId) => FFXIV_ACTION_INDEX.has(actionId),
  tankSwapActionIds: TANK_SWAP_IDS,
  disengageActionIds: DISENGAGE_IDS,
  jobChecks: (job) => JOB_CHECKS[job] ?? [],
};
