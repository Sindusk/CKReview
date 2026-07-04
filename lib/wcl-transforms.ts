// lib/wcl-transforms.ts
//
// Converts raw WarcraftLogs API shapes into the app's internal types.
// Nothing in here touches the network — it's pure data mapping.

import type { Pull }       from "@/types/Pull";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { EnemyEvent } from "@/types/PullError";
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
  WCLBuffEvent,
} from "./wcl-client";
import { getSpellName }                from "./spell-data";
import { getSpecInfo, getRosterSortOrder } from "./spec-data";
import { detectPullErrors }            from "./error-detection";

export function buildAbilityMap(abilities: WCLGameAbility[]): Map<number, string> {
  return new Map(abilities.map((a) => [a.gameID, a.name]));
}

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

function buildActorMap(actors: WCLActor[]): Map<number, WCLActor> {
  return new Map(actors.map((a) => [a.id, a]));
}

// ─── Death transformer ────────────────────────────────────────────────────────
//
// BUGFIX: WCLActor.type is "Player"/"NPC"/"Pet" — the actual WoW class name
// lives on WCLActor.subType (e.g. "DeathKnight"). Reading `actor?.type` here
// produced classes like "Player" (hence deaths/casts showing as
// "Unholy Player" instead of "Unholy Death Knight").

function transformDeath(
  event:       WCLDeathEvent,
  actorMap:    Map<number, WCLActor>,
  specIdMap:   Map<number, number>,
  abilityMap:  Map<number, string>,
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
    class:                actor?.subType ?? spec.className,   // was actor?.type
    specId,
    role:                 specId ? spec.role : "DPS",
    killingAbilityGameId: killingId,
    cause,
  };
}

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
    sourceClass:    actor?.subType ?? spec.className,   // was actor?.type
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
  const source = actorMap.get(event.sourceID);
  const debuffStatus =
    event.type === "removedebuff"      ? "removed" :
    event.type === "applydebuffstack"  ? "stack"   :
    "applied";

  return {
    timestamp:   event.timestamp - fightStart,
    abilityId:   event.abilityGameID ?? 0,
    abilityName: abilityName(event, abilityMap),
    extra:       source?.name,
    debuffStatus,
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

// ─── Enemy (raid-wide) event builders ──────────────────────────────────────
//
// Feeds the "enemyCast" / "enemyBuffApplied" raid-error rules. These MUST
// read from data.enemyCastEvents / data.enemyBuffEvents — the ones fetched
// with hostilityType: "Enemies" in wcl-client.ts — NOT from the friendly
// castEvents/debuffEvents streams above, which are scoped to players only
// and will never contain a boss's own casts or buffs no matter how they're
// filtered afterwards.
//
// The actor.type === "NPC" filter here is a defensive extra layer (in case
// the API ever returns something unexpected on the Enemies side, e.g. a
// hostile pet); the real filtering already happened server-side via
// hostilityType.

function buildEnemyCastEvents(
  enemyCastEvents: WCLCastEvent[],
  actorMap:        Map<number, WCLActor>,
  abilityMap:      Map<number, string>,
  fightStart:      number
): EnemyEvent[] {
  return enemyCastEvents
    // Only actually-completed casts count — an interrupted cast never
    // reaches "cast" (per clarification: "begincast" starts it, "cast"
    // is the signal it went off).
    .filter((e) => e.type === "cast")
    .filter((e) => actorMap.get(e.sourceID)?.type === "NPC")
    .map((e) => ({
      timestamp:   e.timestamp - fightStart,
      actorId:     e.sourceID,
      actorName:   actorMap.get(e.sourceID)?.name ?? `Unknown (${e.sourceID})`,
      abilityId:   e.abilityGameID ?? 0,
      abilityName: abilityName(e, abilityMap),
    }));
}

function buildEnemyBuffEvents(
  enemyBuffEvents: WCLBuffEvent[],
  actorMap:        Map<number, WCLActor>,
  abilityMap:      Map<number, string>,
  fightStart:      number
): EnemyEvent[] {
  return enemyBuffEvents
    .filter((e) => e.type === "applybuff")
    .filter((e) => actorMap.get(e.targetID)?.type === "NPC")
    .map((e) => ({
      timestamp:   e.timestamp - fightStart,
      actorId:     e.targetID,
      actorName:   actorMap.get(e.targetID)?.name ?? `Unknown (${e.targetID})`,
      abilityId:   e.abilityGameID ?? 0,
      abilityName: abilityName(e, abilityMap),
    }));
}

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
        className:  actor?.subType   ?? spec.className,   // was actor?.type
        specId,
        specName:   spec.name,
        role:       spec.role,
        rangeType:  spec.rangeType,
        game:       "wow",

        damageDone: damageDoneEvents
          .filter(e => e.sourceID === actorId)
          .map(e => damageDoneToPlayerEvent(e, actorMap, abilityMap, fightStart)),

        damageTaken: damageTakenEvents
          .filter(e => e.targetID === actorId)
          .map(e => damageTakenToPlayerEvent(e, actorMap, abilityMap, fightStart)),

        healing: healingEvents
          .filter(e => e.sourceID === actorId)
          .filter(e => (e.amount ?? 0) > 0)
          .map(e => healToPlayerEvent(e, actorMap, abilityMap, fightStart)),

        debuffs: debuffEvents
          .filter(e => e.targetID === actorId)
          .map(e => debuffToPlayerEvent(e, actorMap, abilityMap, fightStart)),

        casts: castEvents
          .filter(e => e.sourceID === actorId)
          .map(e => castToPlayerEvent(e, actorMap, abilityMap, fightStart)),
      };
    })
    .sort((a, b) => getRosterSortOrder(a.specId) - getRosterSortOrder(b.specId));
}

export function transformFightToPull(
  data:        WCLFightData,
  abilityMap:  Map<number, string>,
  reportCode:  string,
  idOverride?: number
): Pull & { castEvents: CastEvent[] } {
  const actorMap  = buildActorMap(data.actors);
  const fightStart = data.fight.startTime;

  const specIdMap = new Map<number, number>();
  for (const ci of data.combatantInfos) {
    if (ci.specID) specIdMap.set(ci.sourceID, ci.specID);
  }

  const deathEvents: DeathEvent[] = data.deathEvents.map((e) =>
    transformDeath(e, actorMap, specIdMap, abilityMap, fightStart)
  );

  // Friendly-player-facing cast list only ever showed completed casts
  // historically — keep that behavior unchanged now that "begincast"
  // events may also come back from the same query.
  const completedCasts = data.castEvents.filter((e) => e.type === "cast");

  const castEvents: CastEvent[] = completedCasts.map((e) =>
    transformCast(e, actorMap, specIdMap, abilityMap, fightStart)
  );

  const players: PlayerInfo[] = buildPlayers(
    data.combatantInfos,
    actorMap,
    specIdMap,
    abilityMap,
    completedCasts,
    data.damageDoneEvents,
    data.damageTakenEvents,
    data.healingEvents,
    data.debuffEvents,
    fightStart
  );

  // NOTE: sourced from data.enemyCastEvents / data.enemyBuffEvents — the
  // hostilityType: "Enemies" fetches — NOT data.castEvents/debuffEvents.
  const enemyCastEvents = buildEnemyCastEvents(data.enemyCastEvents ?? [], actorMap, abilityMap, fightStart);
  const enemyBuffEvents = buildEnemyBuffEvents(data.enemyBuffEvents ?? [], actorMap, abilityMap, fightStart);

  const errors = detectPullErrors(players, enemyCastEvents, enemyBuffEvents);

  const fightDurationMs = data.fight.endTime - data.fight.startTime;
  const startTimeSec    = Math.round(data.fight.startTime / 1000);
  const endTimeSec      = Math.round(data.fight.endTime   / 1000);

  return {
    id:            idOverride ?? data.fight.id,
    pullNumber:    0, // filled in by transformReportToPulls (per-boss numbering)
    name:          data.fight.name,
    startTime:     startTimeSec,
    endTime:       endTimeSec,
    result:        data.fight.kill ? "Kill" : "Wipe",
    fightDuration: fightDurationMs,
    deathEvents,
    players,
    errors,
    game:          "wow",
    reportCode,
    logSource:     "wcl",
    fightId:       data.fight.id,
    castEvents,
  };
}

export function transformReportToPulls(
  fightDataList: WCLFightData[],
  abilityMap:    Map<number, string>,
  reportCode:    string
): Array<Pull & { castEvents: CastEvent[] }> {
  const pulls = [...fightDataList]
    .sort((a, b) => a.fight.startTime - b.fight.startTime)
    .map((data, i) => transformFightToPull(data, abilityMap, reportCode, i + 1));

  // Number pulls sequentially per boss name, not globally, so e.g. Rotmire
  // pulls read #1–#5 and the next boss's pulls restart at #1.
  const nameCounters = new Map<string, number>();
  for (const pull of pulls) {
    const next = (nameCounters.get(pull.name) ?? 0) + 1;
    nameCounters.set(pull.name, next);
    pull.pullNumber = next;
  }

  return pulls;
}
