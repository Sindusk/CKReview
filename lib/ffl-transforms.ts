// lib/ffl-transforms.ts
//
// Converts raw FFLogs API shapes into the app's shared internal types.
// The output types (Pull, DeathEvent, PlayerInfo) are IDENTICAL to those
// produced by wcl-transforms.ts — the rest of the app is log-source agnostic.
//
// Nothing in here touches the network — it's pure data mapping.

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

// ─── Ability name resolution ───────────────────────────────────────────────────
//
// Resolution order for any ability ID:
//   1. Name embedded directly on the event itself (event.ability.name).
//   2. The report's own masterData.abilities list — covers every ability
//      actually used in this report, including ones whose events don't
//      carry an embedded name.
//   3. "Ability {id}" (previous behavior) as the final fallback.

export function buildAbilityMap(abilities: FFLGameAbility[]): Map<number, string> {
  return new Map(abilities.map((a) => [a.gameID, a.name]));
}

// ─── CastEvent (app-internal, used by AnalysisPanel) ─────────────────────────
// Re-exported so AnalysisPanel / page.tsx can type against it without caring
// which log source produced it.

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

// ─── Actor lookup ─────────────────────────────────────────────────────────────

function buildActorMap(actors: FFLActor[]): Map<number, FFLActor> {
  return new Map(actors.map((a) => [a.id, a]));
}

// ─── Safe ability name accessor ───────────────────────────────────────────────
// FFLogs embeds the ability name directly on the event's `ability` object.
// Fall back gracefully when it is absent (environmental / unknown source).

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
// FFLogs carries the killing ability name directly on the death event's
// `ability` field, so no separate spell-data lookup table is needed.
// All accesses are guarded against null/undefined defensively.

function transformDeath(
  event:      FFLDeathEvent,
  actorMap:   Map<number, FFLActor>,
  abilityMap: Map<number, string>,
  fightStart: number
): DeathEvent {
  const actor = actorMap.get(event.targetID);
  const subType = actor?.subType ?? "";
  const job = getFFJobByName(subType);

  // Killing ability name — may be absent for environmental deaths.
  // Resolution order: embedded name → masterData.abilities → "Environmental" → "Unknown".
  let cause = "Unknown";
  try {
    if (event.ability?.name) {
      cause = event.ability.name;
    } else if (event.ability?.gameID && abilityMap.has(event.ability.gameID)) {
      cause = abilityMap.get(event.ability.gameID)!;
    } else if (event.ability === null || event.ability === undefined) {
      cause = "Environmental";
    }
  } catch {
    cause = "Unknown";
  }

  return {
    timestamp:            Math.max(0, event.timestamp - fightStart),
    player:               actor?.name ?? `Unknown (${event.targetID})`,
    class:                job.name,
    specId:               0,        // FFXIV has no numeric specId in the WoW sense
    role:                 job.role,
    killingAbilityGameId: event.ability?.gameID ?? 0,
    cause,
  };
}

// ─── CastEvent transformer ────────────────────────────────────────────────────

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

// ─── PlayerEvent helpers ──────────────────────────────────────────────────────

function damageToPlayerEvent(
  event:      FFLDamageEvent,
  abilityMap: Map<number, string>,
  fightStart: number
): PlayerEvent {
  return {
    timestamp:   Math.max(0, event.timestamp - fightStart),
    abilityId:   event.abilityGameID ?? 0,
    abilityName: abilityName(event, abilityMap),
    amount:      event.amount ?? 0,
  };
}

function healToPlayerEvent(
  event:      FFLHealEvent,
  abilityMap: Map<number, string>,
  fightStart: number
): PlayerEvent {
  return {
    timestamp:   Math.max(0, event.timestamp - fightStart),
    abilityId:   event.abilityGameID ?? 0,
    abilityName: abilityName(event, abilityMap),
    amount:      event.amount ?? 0,
  };
}

function debuffToPlayerEvent(
  event:      FFLDebuffEvent,
  actorMap:   Map<number, FFLActor>,
  abilityMap: Map<number, string>,
  fightStart: number
): PlayerEvent {
  const target = actorMap.get(event.targetID);
  return {
    timestamp:   Math.max(0, event.timestamp - fightStart),
    abilityId:   event.abilityGameID ?? 0,
    abilityName: abilityName(event, abilityMap),
    extra:       target?.name,
  };
}

function castToPlayerEvent(
  event:      FFLCastEvent,
  abilityMap: Map<number, string>,
  fightStart: number
): PlayerEvent {
  return {
    timestamp:   Math.max(0, event.timestamp - fightStart),
    abilityId:   event.abilityGameID ?? 0,
    abilityName: abilityName(event, abilityMap),
  };
}

// ─── Build PlayerInfo array ───────────────────────────────────────────────────
// FFLogs does not have a CombatantInfo event that mirrors WCL's — instead,
// we build the roster directly from the actors list filtered to friendlyPlayers.
// The subType on each actor carries the job name.

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
  // Deduplicate player IDs (friendlyPlayers can contain duplicates in some FF logs)
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
        specId:    0,           // No numeric spec in FFXIV
        specName:  job.name,    // Job name doubles as spec name
        role:      job.role,
        rangeType: job.rangeType,

        damageDone: damageDoneEvents
          .filter((e) => e.sourceID === actorId)
          .map((e) => damageToPlayerEvent(e, abilityMap, fightStart)),

        damageTaken: damageTakenEvents
          .filter((e) => e.targetID === actorId)
          .map((e) => damageToPlayerEvent(e, abilityMap, fightStart)),

        healing: healingEvents
          .filter((e) => e.sourceID === actorId)
          .map((e) => healToPlayerEvent(e, abilityMap, fightStart)),

        debuffs: debuffEvents
          .filter((e) => e.sourceID === actorId)
          .map((e) => debuffToPlayerEvent(e, actorMap, abilityMap, fightStart)),

        casts: castEvents
          .filter((e) => e.sourceID === actorId)
          .map((e) => castToPlayerEvent(e, abilityMap, fightStart)),
      };
    })
    .filter((p): p is PlayerInfo => p !== null)
    .sort((a, b) =>
      getFFRosterSortOrder(
        // Look up the original subType for sort ordering
        actorMap.get(a.actorId)?.subType ?? ""
      ) -
      getFFRosterSortOrder(
        actorMap.get(b.actorId)?.subType ?? ""
      )
    );
}

// ─── Fight → Pull ─────────────────────────────────────────────────────────────

export function transformFFightToPull(
  data:        FFLFightData,
  abilityMap:  Map<number, string>,
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

  const fightDurationMs = data.fight.endTime - data.fight.startTime;
  const startTimeSec    = Math.round(data.fight.startTime / 1000);
  const endTimeSec      = Math.round(data.fight.endTime   / 1000);

  return {
    id:            idOverride ?? data.fight.id,
    name:          data.fight.name ?? "Unknown Fight",
    startTime:     startTimeSec,
    endTime:       endTimeSec,
    result:        data.fight.kill ? "Kill" : "Wipe",
    fightDuration: fightDurationMs,
    deathEvents,
    players,
    castEvents,
  };
}

export function transformFFReportToPulls(
  fightDataList: FFLFightData[],
  abilityMap:    Map<number, string>
): Array<Pull & { castEvents: CastEvent[] }> {
  return fightDataList
    .sort((a, b) => a.fight.startTime - b.fight.startTime)
    .map((data, i) => transformFFightToPull(data, abilityMap, i + 1));
}
