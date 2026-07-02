// lib/ffl-transforms.ts
//
// Converts raw FFLogs API shapes into the app's shared internal types.

import type { Pull }                    from "@/types/Pull";
import type { DeathEvent }              from "@/types/DeathEvent";
import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type {
  FFLFightData,
  FFLActor,
  FFLGameAbility,
  FFLDeathEvent,
  FFLCastEvent,
  FFLDamageEvent,
  FFLHealEvent,
  FFLDebuffEvent,
} from "./ffl-client";
import { getFFJobByName, getFFRosterSortOrder } from "./ffl-job-data";
import { detectPullErrors }                     from "./error-detection";

export function buildAbilityMap(abilities: FFLGameAbility[]): Map<number, string> {
  return new Map(abilities.map((a) => [a.gameID, a.name]));
}

export type CastEvent = {
  timestamp:      number;
  sourceId:       number;
  sourceName:     string;
  sourceClass:    string;
  role:           "Tank" | "Healer" | "DPS";
  abilityId:      number;
  abilityName:    string;
  resourceActor?: number;
  classResources?: Array<{
    amount: number;
    max:    number;
    type:   number;
    cost?:  number;
  }>;
  hitPoints?:    number;
  maxHitPoints?: number;
  attackPower?:  number;
  spellPower?:   number;
  armor?:        number;
  absorb?:       number;
  x?:            number;
  y?:            number;
  facing?:       number;
  mapID?:        number;
};

function buildActorMap(actors: FFLActor[]): Map<number, FFLActor> {
  return new Map(actors.map((a) => [a.id, a]));
}

function abilityName(
  event: {
    abilityGameID?: number;
    ability?: { name?: string } | null;
  },
  abilityMap: Map<number, string>
): string {
  if (event.ability?.name) return event.ability.name;
  if (event.abilityGameID) {
    return abilityMap.get(event.abilityGameID) ?? `Ability ${event.abilityGameID}`;
  }
  return "Unknown";
}

// ─── Death transformer ────────────────────────────────────────────────────────
//
// BUGFIX: FFLogs puts the killing blow's ability on `killingAbilityGameID`
// at the top level of the death event (see getFFDeaths-Sample.json) — it
// does NOT embed an `ability` object the way this code previously assumed.
// Because `event.ability` was always undefined, every death fell through to
// the "Environmental" fallback. We now resolve killingAbilityGameID against
// the report's ability map, same as WCL, and only call it "Environmental"
// when there truly is no killer (sourceID === -1, e.g. falls/fire).

function transformDeath(
  event:      FFLDeathEvent,
  actorMap:   Map<number, FFLActor>,
  abilityMap: Map<number, string>,
  fightStart: number
): DeathEvent {
  const actor = actorMap.get(event.targetID);
  const subType = actor?.subType ?? "";
  const job = getFFJobByName(subType);

  const killingId = event.killingAbilityGameID ?? event.ability?.gameID ?? 0;

  let cause: string;
  if (killingId) {
    cause = event.ability?.name ?? abilityMap.get(killingId) ?? `Ability ${killingId}`;
  } else if (event.sourceID === -1) {
    cause = "Environmental";
  } else {
    cause = "Unknown";
  }

  return {
    timestamp:            Math.max(0, event.timestamp - fightStart),
    player:               actor?.name ?? `Unknown (${event.targetID})`,
    class:                job.name,
    specId:               0,
    role:                 job.role,
    killingAbilityGameId: killingId,
    cause,
  };
}

function transformCast(
  event:      FFLCastEvent,
  actorMap:   Map<number, FFLActor>,
  abilityMap: Map<number, string>,
  fightStart: number
): CastEvent {
  const actor  = actorMap.get(event.sourceID);
  const subType = actor?.subType ?? "";
  const job    = getFFJobByName(subType);

  return {
    timestamp:      Math.max(0, event.timestamp - fightStart),
    sourceId:       event.sourceID,
    sourceName:     actor?.name ?? `Unknown (${event.sourceID})`,
    sourceClass:    job.name,
    role:           job.role,
    abilityId:      event.abilityGameID ?? 0,
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
  };
}

function damageDoneToPlayerEvent(
  event:      FFLDamageEvent,
  actorMap:   Map<number, FFLActor>,
  abilityMap: Map<number, string>,
  fightStart: number
): PlayerEvent {
  const target = actorMap.get(event.targetID);
  return {
    timestamp:   Math.max(0, event.timestamp - fightStart),
    abilityId:   event.abilityGameID ?? 0,
    abilityName: abilityName(event, abilityMap),
    amount:      event.amount ?? 0,
    target:      target?.name,
  };
}

// BUGFIX: FFLogs nests the post-hit health snapshot under
// `targetResources.hitPoints` / `targetResources.maxHitPoints`, not flat
// `hitPoints`/`maxHitPoints` on the event the way WCL does (see
// getFFDamageTaken-Sample.json). The flat fields are essentially never
// present on FFLogs "damage" events, so healthBefore/healthAfter always
// came out undefined.
function damageTakenToPlayerEvent(
  event:      FFLDamageEvent,
  actorMap:   Map<number, FFLActor>,
  abilityMap: Map<number, string>,
  fightStart: number
): PlayerEvent {
  const source = actorMap.get(event.sourceID);
  const dealt  = event.amount ?? 0;
  const after  = event.targetResources?.hitPoints ?? event.hitPoints;
  const before = after !== undefined ? after + dealt : undefined;

  return {
    timestamp:    Math.max(0, event.timestamp - fightStart),
    abilityId:    event.abilityGameID ?? 0,
    abilityName:  abilityName(event, abilityMap),
    amount:       dealt,
    source:       source?.name,
    healthBefore: before,
    healthAfter:  after,
    maxHealth:    event.targetResources?.maxHitPoints ?? event.maxHitPoints,
    overkill:     event.overkill,
  };
}

function healToPlayerEvent(
  event:      FFLHealEvent,
  actorMap:   Map<number, FFLActor>,
  abilityMap: Map<number, string>,
  fightStart: number
): PlayerEvent {
  const target = actorMap.get(event.targetID);
  return {
    timestamp:   Math.max(0, event.timestamp - fightStart),
    abilityId:   event.abilityGameID ?? 0,
    abilityName: abilityName(event, abilityMap),
    amount:      event.amount,
    target:      target?.name,
  };
}

function debuffToPlayerEvent(
  event:      FFLDebuffEvent,
  actorMap:   Map<number, FFLActor>,
  abilityMap: Map<number, string>,
  fightStart: number
): PlayerEvent {
  const source = actorMap.get(event.sourceID);
  const debuffStatus =
    event.type === "removedebuff"      ? "removed" :
    event.type === "applydebuffstack"  ? "stack"   :
    "applied";

  return {
    timestamp:   Math.max(0, event.timestamp - fightStart),
    abilityId:   event.abilityGameID ?? 0,
    abilityName: abilityName(event, abilityMap),
    extra:       source?.name,
    debuffStatus,
  };
}

function castToPlayerEvent(
  event:      FFLCastEvent,
  actorMap:   Map<number, FFLActor>,
  abilityMap: Map<number, string>,
  fightStart: number
): PlayerEvent {
  const hasTarget = event.targetID !== undefined && event.targetID !== -1;
  const target = hasTarget ? actorMap.get(event.targetID as number)?.name : undefined;

  return {
    timestamp:   Math.max(0, event.timestamp - fightStart),
    abilityId:   event.abilityGameID ?? 0,
    abilityName: abilityName(event, abilityMap),
    target,
  };
}

function buildFFPlayers(
  friendlyPlayerIds: number[],
  actorMap:          Map<number, FFLActor>,
  abilityMap:        Map<number, string>,
  castEvents:        FFLCastEvent[],
  damageDoneEvents:  FFLDamageEvent[],
  damageTakenEvents: FFLDamageEvent[],
  healingEvents:     FFLHealEvent[],
  debuffEvents:      FFLDebuffEvent[],
  fightStart:        number
): PlayerInfo[] {
  const uniqueIds = [...new Set(friendlyPlayerIds)];

  return uniqueIds
    .map((actorId): PlayerInfo | null => {
      const actor = actorMap.get(actorId);
      if (!actor) return null;

      const subType = actor.subType ?? "";
      const job     = getFFJobByName(subType);

      return {
        actorId,
        name:      actor.name,
        className: job.name,
        specId:    0,
        specName:  job.name,   // FFXIV has no separate spec; UI dedupes via formatSpecClass()
        role:      job.role,
        rangeType: job.rangeType,
        game:      "ffxiv",

        damageDone: damageDoneEvents
          .filter((e) => e.sourceID === actorId)
          .map((e) => damageDoneToPlayerEvent(e, actorMap, abilityMap, fightStart)),

        damageTaken: damageTakenEvents
          .filter((e) => e.targetID === actorId)
          .map((e) => damageTakenToPlayerEvent(e, actorMap, abilityMap, fightStart)),

        healing: healingEvents
          .filter((e) => e.sourceID === actorId)
          .filter((e) => (e.amount ?? 0) > 0)
          .map((e) => healToPlayerEvent(e, actorMap, abilityMap, fightStart)),

        debuffs: debuffEvents
          .filter((e) => e.targetID === actorId)
          .map((e) => debuffToPlayerEvent(e, actorMap, abilityMap, fightStart)),

        casts: castEvents
          .filter((e) => e.sourceID === actorId)
          .map((e) => castToPlayerEvent(e, actorMap, abilityMap, fightStart)),
      };
    })
    .filter((p): p is PlayerInfo => p !== null)
    .sort((a, b) =>
      getFFRosterSortOrder(actorMap.get(a.actorId)?.subType ?? "") -
      getFFRosterSortOrder(actorMap.get(b.actorId)?.subType ?? "")
    );
}

export function transformFFightToPull(
  data:        FFLFightData,
  abilityMap:  Map<number, string>,
  reportCode:  string,
  idOverride?: number
): Pull & { castEvents: CastEvent[] } {
  const actorMap   = buildActorMap(data.actors);
  const fightStart = data.fight.startTime;

  const deathEvents: DeathEvent[] = data.deathEvents.map((e) =>
    transformDeath(e, actorMap, abilityMap, fightStart)
  );

  const castEvents: CastEvent[] = data.castEvents.map((e) =>
    transformCast(e, actorMap, abilityMap, fightStart)
  );

  const players: PlayerInfo[] = buildFFPlayers(
    data.fight.friendlyPlayers ?? [],
    actorMap,
    abilityMap,
    data.castEvents,
    data.damageDoneEvents,
    data.damageTakenEvents,
    data.healingEvents,
    data.debuffEvents,
    fightStart
  );

  const errors = detectPullErrors(players);

  const fightDurationMs = data.fight.endTime - data.fight.startTime;
  const startTimeSec    = Math.round(data.fight.startTime / 1000);
  const endTimeSec      = Math.round(data.fight.endTime   / 1000);

  return {
    id:            idOverride ?? data.fight.id,
    pullNumber:    0, // filled in by transformFFReportToPulls (per-boss numbering)
    name:          data.fight.name ?? "Unknown Fight",
    startTime:     startTimeSec,
    endTime:       endTimeSec,
    result:        data.fight.kill ? "Kill" : "Wipe",
    fightDuration: fightDurationMs,
    deathEvents,
    players,
    errors,
    game:          "ffxiv",
    reportCode,
    logSource:     "ffl",
    fightId:       data.fight.id,
    castEvents,
  };
}

export function transformFFReportToPulls(
  fightDataList: FFLFightData[],
  abilityMap:    Map<number, string>,
  reportCode:    string
): Array<Pull & { castEvents: CastEvent[] }> {
  const pulls = [...fightDataList]
    .sort((a, b) => a.fight.startTime - b.fight.startTime)
    .map((data, i) => transformFFightToPull(data, abilityMap, reportCode, i + 1));

  const nameCounters = new Map<string, number>();
  for (const pull of pulls) {
    const next = (nameCounters.get(pull.name) ?? 0) + 1;
    nameCounters.set(pull.name, next);
    pull.pullNumber = next;
  }

  return pulls;
}