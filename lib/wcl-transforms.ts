// lib/wcl-transforms.ts
//
// Converts raw WarcraftLogs API shapes into the app's internal types.
// Nothing in here touches the network — it's pure data mapping.

import type { Pull }       from "@/types/Pull";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type {
  WCLFightData,
  WCLActor,
  WCLGameAbility,
  WCLDeathEvent,
  WCLCombatantInfoEvent,
  WCLCastEvent,
  WCLDamageEvent,
  WCLHealEvent,
  WCLDebuffEvent,
} from "./wcl-client";
import { getSpellName }                from "./spell-data";
import { getSpecInfo, getRosterSortOrder } from "./spec-data";

// ─── Ability name resolution ───────────────────────────────────────────────────
//
// Resolution order for any ability ID:
//   1. Name embedded directly on the event itself (event.ability.name) — WCL
//      already includes this on most event types.
//   2. The report's own masterData.abilities list — covers every ability
//      actually used in this report, including ones that never carry an
//      embedded name (e.g. killingAbilityGameID on death events).
//   3. The hand-maintained spell-data.ts table — last-resort fallback for
//      the rare ID that's missing from both of the above.
//   4. "Unknown (ID: X)".

export function buildAbilityMap(abilities: WCLGameAbility[]): Map<number, string> {
  return new Map(abilities.map((a) => [a.gameID, a.name]));
}

// ─── CastEvent (app-internal, used by AnalysisPanel) ─────────────────────────

export type CastEvent = {
  timestamp:     number;
  sourceId:      number;
  sourceName:    string;
  sourceClass:   string;
  role:          "Tank" | "Healer" | "DPS";
  abilityId:     number;
  abilityName:   string;
  resourceActor?: number;
  classResources?: Array<{
    amount: number;
    max: number;
    type: number;
    cost?: number;
  }>;
  hitPoints?: number;
  maxHitPoints?: number;
  attackPower?: number;
  spellPower?: number;
  armor?: number;
  absorb?: number;
  x?: number;
  y?: number;
  facing?: number;
  mapID?: number;
  versatility?: number;
  avoidance?: number;
  itemLevel?: number;
};

// ─── Actor lookup ─────────────────────────────────────────────────────────────

function buildActorMap(actors: WCLActor[]): Map<number, WCLActor> {
  return new Map(actors.map((a) => [a.id, a]));
}

// ─── Death transformer ────────────────────────────────────────────────────────
// Uses killingAbilityGameID (the real field from the API) + spell-data lookup.
// Uses specId from CombatantInfo for accurate role, falling back to class heuristic.

function transformDeath(
  event:       WCLDeathEvent,
  actorMap:    Map<number, WCLActor>,
  specIdMap:   Map<number, number>,   // actorId → specId
  abilityMap:  Map<number, string>,   // gameID → name, from masterData.abilities
  fightStart:  number
): DeathEvent {
  const actor  = actorMap.get(event.targetID);
  const specId = specIdMap.get(event.targetID) ?? 0;
  const spec   = getSpecInfo(specId);

  const killingId = event.killingAbilityGameID ?? 0;
  const cause = killingId
    ? abilityMap.get(killingId) ?? getSpellName(killingId)
    : "Unknown";

  return {
    timestamp:            event.timestamp - fightStart,
    player:               actor?.name ?? `Unknown (${event.targetID})`,
    class:                actor?.type ?? spec.className,
    specId,
    role:                 specId ? spec.role : "DPS",
    killingAbilityGameId: killingId,
    cause,
  };
}

// ─── Safe ability name accessor ───────────────────────────────────────────────
// WCL does not guarantee `ability` is present on every event (environmental
// damage, some proc events, and mixed-stream events may omit it entirely).
// Resolution order: embedded name → report's masterData.abilities → the
// hand-maintained spell-data.ts table → "Unknown".

function abilityName(
  event:      { abilityGameID?: number; ability?: { name?: string } },
  abilityMap: Map<number, string>
): string {
  if (event.ability?.name) return event.ability.name;
  if (event.abilityGameID) {
    return abilityMap.get(event.abilityGameID) ?? getSpellName(event.abilityGameID);
  }
  return "Unknown";
}

// ─── CastEvent transformer (for AnalysisPanel cast timeline) ─────────────────

function transformCast(
  event:      WCLCastEvent,
  actorMap:   Map<number, WCLActor>,
  specIdMap:  Map<number, number>,
  abilityMap: Map<number, string>,
  fightStart: number
): CastEvent {
  const actor  = actorMap.get(event.sourceID);
  const specId = specIdMap.get(event.sourceID) ?? 0;
  const spec   = getSpecInfo(specId);

  return {
    timestamp:      event.timestamp - fightStart,
    sourceId:       event.sourceID,
    sourceName:     actor?.name ?? `Unknown (${event.sourceID})`,
    sourceClass:    actor?.type ?? spec.className,
    role:           specId ? spec.role : "DPS",
    abilityId:      event.abilityGameID,
    abilityName:    abilityName(event, abilityMap),
    resourceActor:  event.resourceActor,
    classResources: event.classResources,
    hitPoints:      event.hitPoints,
    maxHitPoints:   event.maxHitPoints,
    attackPower:    event.attackPower,
    spellPower:     event.spellPower,
    armor:          event.armor,
    absorb:         event.absorb,
    x:              event.x,
    y:              event.y,
    facing:         event.facing,
    mapID:          event.mapID,
    versatility:    event.versatility,
    avoidance:      event.avoidance,
    itemLevel:      event.itemLevel,
  };
}

// ─── PlayerEvent helpers ──────────────────────────────────────────────────────

function damageDoneToPlayerEvent(
  event:      WCLDamageEvent,
  actorMap:   Map<number, WCLActor>,
  abilityMap: Map<number, string>,
  fightStart: number
): PlayerEvent {
  const target = actorMap.get(event.targetID);
  return {
    timestamp:   event.timestamp - fightStart,
    abilityId:   event.abilityGameID ?? 0,
    abilityName: abilityName(event, abilityMap),
    amount:      event.amount,
    target:      target?.name,
    isDoT:       event.tick === true,
  };
}

// hitPoints on a WCL damage event reflects the target's health AFTER the hit
// landed, so "before" is reconstructed as after + amount. If the hit was
// fatal, `amount` is the effective (capped) damage and `overkill` is the
// portion beyond the target's remaining health.
function damageTakenToPlayerEvent(
  event:      WCLDamageEvent,
  actorMap:   Map<number, WCLActor>,
  abilityMap: Map<number, string>,
  fightStart: number
): PlayerEvent {
  const source = actorMap.get(event.sourceID);
  const after  = event.hitPoints;
  const before = after !== undefined ? after + event.amount : undefined;

  return {
    timestamp:    event.timestamp - fightStart,
    abilityId:    event.abilityGameID ?? 0,
    abilityName:  abilityName(event, abilityMap),
    amount:       event.amount,
    source:       source?.name,
    healthBefore: before,
    healthAfter:  after,
    maxHealth:    event.maxHitPoints,
    overkill:     event.overkill,
  };
}

function healToPlayerEvent(
  event:      WCLHealEvent,
  actorMap:   Map<number, WCLActor>,
  abilityMap: Map<number, string>,
  fightStart: number
): PlayerEvent {
  const target = actorMap.get(event.targetID);
  return {
    timestamp:   event.timestamp - fightStart,
    abilityId:   event.abilityGameID ?? 0,
    abilityName: abilityName(event, abilityMap),
    amount:      event.amount,
    target:      target?.name,
  };
}

function debuffToPlayerEvent(
  event:      WCLDebuffEvent,
  actorMap:   Map<number, WCLActor>,
  abilityMap: Map<number, string>,
  fightStart: number
): PlayerEvent {
  const target = actorMap.get(event.targetID);
  return {
    timestamp:   event.timestamp - fightStart,
    abilityId:   event.abilityGameID ?? 0,
    abilityName: abilityName(event, abilityMap),
    extra:       target?.name,
  };
}

function castToPlayerEvent(
  event:      WCLCastEvent,
  actorMap:   Map<number, WCLActor>,
  abilityMap: Map<number, string>,
  fightStart: number
): PlayerEvent {
  const hasTarget = event.targetID !== undefined && event.targetID !== -1;
  const target = hasTarget ? actorMap.get(event.targetID as number)?.name : undefined;

  return {
    timestamp:   event.timestamp - fightStart,
    abilityId:   event.abilityGameID ?? 0,
    abilityName: abilityName(event, abilityMap),
    target,
  };
}

// ─── Build PlayerInfo array from CombatantInfo events ────────────────────────

function buildPlayers(
  combatantInfos:    WCLCombatantInfoEvent[],
  actorMap:          Map<number, WCLActor>,
  specIdMap:         Map<number, number>,
  abilityMap:        Map<number, string>,
  castEvents:        WCLCastEvent[],
  damageDoneEvents:  WCLDamageEvent[],
  damageTakenEvents: WCLDamageEvent[],
  healingEvents:     WCLHealEvent[],
  debuffEvents:      WCLDebuffEvent[],
  fightStart:        number
): PlayerInfo[] {
  return combatantInfos
    .map((ci): PlayerInfo => {
      const actor  = actorMap.get(ci.sourceID);
      const specId = ci.specID ?? 0;
      const spec   = getSpecInfo(specId);

      const actorId = ci.sourceID;

      return {
        actorId,
        name:       actor?.name      ?? `Unknown (${actorId})`,
        className:  actor?.type      ?? spec.className,
        specId,
        specName:   spec.name,
        role:       spec.role,
        rangeType:  spec.rangeType,

        damageDone: damageDoneEvents
          .filter(e => e.sourceID === actorId)
          .map(e => damageDoneToPlayerEvent(e, actorMap, abilityMap, fightStart)),

        damageTaken: damageTakenEvents
          .filter(e => e.targetID === actorId)
          .map(e => damageTakenToPlayerEvent(e, actorMap, abilityMap, fightStart)),

        healing: healingEvents
          .filter(e => e.sourceID === actorId)
          // Drop pure-overheal (or entirely blank-amount) instances — they
          // had zero effective healing impact on the target.
          .filter(e => (e.amount ?? 0) > 0)
          .map(e => healToPlayerEvent(e, actorMap, abilityMap, fightStart)),

        debuffs: debuffEvents
          .filter(e => e.sourceID === actorId)
          .map(e => debuffToPlayerEvent(e, actorMap, abilityMap, fightStart)),

        casts: castEvents
          .filter(e => e.sourceID === actorId)
          .map(e => castToPlayerEvent(e, actorMap, abilityMap, fightStart)),
      };
    })
    .sort((a, b) => getRosterSortOrder(a.specId) - getRosterSortOrder(b.specId));
}

// ─── Fight → Pull ─────────────────────────────────────────────────────────────

export function transformFightToPull(
  data:        WCLFightData,
  abilityMap:  Map<number, string>,
  idOverride?: number
): Pull & { castEvents: CastEvent[] } {
  const actorMap  = buildActorMap(data.actors);
  const fightStart = data.fight.startTime;

  // Build specId lookup from CombatantInfo events: actorId → specId
  const specIdMap = new Map<number, number>();
  for (const ci of data.combatantInfos) {
    if (ci.specID) specIdMap.set(ci.sourceID, ci.specID);
  }

  const deathEvents: DeathEvent[] = data.deathEvents.map((e) =>
    transformDeath(e, actorMap, specIdMap, abilityMap, fightStart)
  );

  const castEvents: CastEvent[] = data.castEvents.map((e) =>
    transformCast(e, actorMap, specIdMap, abilityMap, fightStart)
  );

  const players: PlayerInfo[] = buildPlayers(
    data.combatantInfos,
    actorMap,
    specIdMap,
    abilityMap,
    data.castEvents,
    data.damageDoneEvents,
    data.damageTakenEvents,
    data.healingEvents,
    data.debuffEvents,
    fightStart
  );

  const fightDurationMs = data.fight.endTime - data.fight.startTime;
  const startTimeSec    = Math.round(data.fight.startTime / 1000);
  const endTimeSec      = Math.round(data.fight.endTime   / 1000);

  return {
    id:            idOverride ?? data.fight.id,
    name:          data.fight.name,
    startTime:     startTimeSec,
    endTime:       endTimeSec,
    result:        data.fight.kill ? "Kill" : "Wipe",
    fightDuration: fightDurationMs,
    deathEvents,
    players,
    castEvents,
  };
}

export function transformReportToPulls(
  fightDataList: WCLFightData[],
  abilityMap:    Map<number, string>
): Array<Pull & { castEvents: CastEvent[] }> {
  return fightDataList
    .sort((a, b) => a.fight.startTime - b.fight.startTime)
    .map((data, i) => transformFightToPull(data, abilityMap, i + 1));
}
