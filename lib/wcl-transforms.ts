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
  WCLDeathEvent,
  WCLCombatantInfoEvent,
  WCLCastEvent,
  WCLDamageEvent,
  WCLHealEvent,
  WCLDebuffEvent,
} from "./wcl-client";
import { getSpellName }                from "./spell-data";
import { getSpecInfo, getRosterSortOrder } from "./spec-data";

// ─── CastEvent (app-internal, used by AnalysisPanel) ─────────────────────────

export type CastEvent = {
  timestamp:   number;
  sourceId:    number;
  sourceName:  string;
  sourceClass: string;
  role:        "Tank" | "Healer" | "DPS";
  abilityId:   number;
  abilityName: string;
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
  fightStart:  number
): DeathEvent {
  const actor  = actorMap.get(event.targetID);
  const specId = specIdMap.get(event.targetID) ?? 0;
  const spec   = getSpecInfo(specId);

  return {
    timestamp:            event.timestamp - fightStart,
    player:               actor?.name ?? `Unknown (${event.targetID})`,
    class:                actor?.type ?? spec.className,
    specId,
    role:                 specId ? spec.role : "DPS",
    killingAbilityGameId: event.killingAbilityGameID ?? 0,
    cause:                getSpellName(event.killingAbilityGameID ?? 0),
  };
}

// ─── Safe ability name accessor ───────────────────────────────────────────────
// WCL does not guarantee `ability` is present on every event (environmental
// damage, some proc events, and mixed-stream events may omit it entirely).

function abilityName(event: { abilityGameID?: number; ability?: { name?: string } }): string {
  if (event.ability?.name) return event.ability.name;
  if (event.abilityGameID) return getSpellName(event.abilityGameID);
  return "Unknown";
}

// ─── CastEvent transformer (for AnalysisPanel cast timeline) ─────────────────

function transformCast(
  event:      WCLCastEvent,
  actorMap:   Map<number, WCLActor>,
  specIdMap:  Map<number, number>,
  fightStart: number
): CastEvent {
  const actor  = actorMap.get(event.sourceID);
  const specId = specIdMap.get(event.sourceID) ?? 0;
  const spec   = getSpecInfo(specId);

  return {
    timestamp:   event.timestamp - fightStart,
    sourceId:    event.sourceID,
    sourceName:  actor?.name ?? `Unknown (${event.sourceID})`,
    sourceClass: actor?.type ?? spec.className,
    role:        specId ? spec.role : "DPS",
    abilityId:   event.abilityGameID,
    abilityName: abilityName(event),
  };
}

// ─── PlayerEvent helpers ──────────────────────────────────────────────────────

function damageToPlayerEvent(
  event:      WCLDamageEvent,
  fightStart: number
): PlayerEvent {
  return {
    timestamp:   event.timestamp - fightStart,
    abilityId:   event.abilityGameID ?? 0,
    abilityName: abilityName(event),
    amount:      event.amount,
  };
}

function healToPlayerEvent(
  event:      WCLHealEvent,
  fightStart: number
): PlayerEvent {
  return {
    timestamp:   event.timestamp - fightStart,
    abilityId:   event.abilityGameID ?? 0,
    abilityName: abilityName(event),
    amount:      event.amount,
  };
}

function debuffToPlayerEvent(
  event:      WCLDebuffEvent,
  actorMap:   Map<number, WCLActor>,
  fightStart: number
): PlayerEvent {
  const target = actorMap.get(event.targetID);
  return {
    timestamp:   event.timestamp - fightStart,
    abilityId:   event.abilityGameID ?? 0,
    abilityName: abilityName(event),
    extra:       target?.name,
  };
}

function castToPlayerEvent(
  event:      WCLCastEvent,
  fightStart: number
): PlayerEvent {
  return {
    timestamp:   event.timestamp - fightStart,
    abilityId:   event.abilityGameID ?? 0,
    abilityName: abilityName(event),
  };
}

// ─── Build PlayerInfo array from CombatantInfo events ────────────────────────

function buildPlayers(
  combatantInfos:    WCLCombatantInfoEvent[],
  actorMap:          Map<number, WCLActor>,
  specIdMap:         Map<number, number>,
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
          .map(e => damageToPlayerEvent(e, fightStart)),

        damageTaken: damageTakenEvents
          .filter(e => e.targetID === actorId)
          .map(e => damageToPlayerEvent(e, fightStart)),

        healing: healingEvents
          .filter(e => e.sourceID === actorId)
          .map(e => healToPlayerEvent(e, fightStart)),

        debuffs: debuffEvents
          .filter(e => e.sourceID === actorId)
          .map(e => debuffToPlayerEvent(e, actorMap, fightStart)),

        casts: castEvents
          .filter(e => e.sourceID === actorId)
          .map(e => castToPlayerEvent(e, fightStart)),
      };
    })
    .sort((a, b) => getRosterSortOrder(a.specId) - getRosterSortOrder(b.specId));
}

// ─── Fight → Pull ─────────────────────────────────────────────────────────────

export function transformFightToPull(
  data:        WCLFightData,
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
    transformDeath(e, actorMap, specIdMap, fightStart)
  );

  const castEvents: CastEvent[] = data.castEvents.map((e) =>
    transformCast(e, actorMap, specIdMap, fightStart)
  );

  const players: PlayerInfo[] = buildPlayers(
    data.combatantInfos,
    actorMap,
    specIdMap,
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
  fightDataList: WCLFightData[]
): Array<Pull & { castEvents: CastEvent[] }> {
  return fightDataList
    .sort((a, b) => a.fight.startTime - b.fight.startTime)
    .map((data, i) => transformFightToPull(data, i + 1));
}
