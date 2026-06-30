// lib/wcl-transforms.ts
//
// Converts raw WarcraftLogs API shapes into the app's internal types.
// Nothing in here touches the network — it's pure data mapping.
//
// Input:  WCLFightData  (from wcl-client.ts)
// Output: Pull[]        (compatible with existing Pull.ts / DeathEvent.ts types)

import type { Pull }       from "@/types/Pull";
import type { DeathEvent } from "@/types/DeathEvent";
import type { WCLFightData, WCLActor, WCLDeathEvent, WCLCastEvent } from "./wcl-client";

// ─── Cast event (app-internal, extensible) ────────────────────────────────────

export type CastEvent = {
  timestamp:   number;   // ms into the pull
  sourceId:    number;
  sourceName:  string;
  sourceClass: string;
  role:        "Tank" | "Healer" | "DPS";
  abilityId:   number;
  abilityName: string;
};

// ─── WoW class → role heuristic ───────────────────────────────────────────────

const TANK_SPECS   = new Set(["Death Knight", "Demon Hunter", "Druid", "Monk", "Paladin", "Warrior"]);
const HEALER_SPECS = new Set(["Druid", "Evoker", "Monk", "Paladin", "Priest", "Shaman"]);

function guessRole(className: string): "Tank" | "Healer" | "DPS" {
  if (TANK_SPECS.has(className) && !HEALER_SPECS.has(className)) return "Tank";
  return "DPS";
}

// ─── Actor lookup ─────────────────────────────────────────────────────────────

function buildActorMap(actors: WCLActor[]): Map<number, WCLActor> {
  return new Map(actors.map((a) => [a.id, a]));
}

// ─── Death transformer ────────────────────────────────────────────────────────

function transformDeath(
  event:    WCLDeathEvent,
  actorMap: Map<number, WCLActor>
): DeathEvent {
  const actor = actorMap.get(event.targetID);

  return {
    timestamp: event.timestamp,
    player:    actor?.name ?? `Unknown (${event.targetID})`,
    class:     actor?.type ?? "Unknown",
    role:      actor ? guessRole(actor.type) : "DPS",
    cause:     event.killingBlow?.name,
  };
}

// ─── Cast transformer ─────────────────────────────────────────────────────────

function transformCast(
  event:    WCLCastEvent,
  actorMap: Map<number, WCLActor>
): CastEvent | null {
  // WCL can return cast events where `ability` is null/undefined
  // (pet actions, auto-attacks, environment procs). Skip them.
  if (!event.ability?.name) return null;

  const actor = actorMap.get(event.sourceID);

  return {
    timestamp:   event.timestamp,
    sourceId:    event.sourceID,
    sourceName:  actor?.name ?? `Unknown (${event.sourceID})`,
    sourceClass: actor?.type ?? "Unknown",
    role:        actor ? guessRole(actor.type) : "DPS",
    abilityId:   event.abilityGameID,
    abilityName: event.ability.name,
  };
}

// ─── Fight → Pull ─────────────────────────────────────────────────────────────

export function transformFightToPull(
  data:        WCLFightData,
  idOverride?: number
): Pull & { castEvents: CastEvent[] } {
  const actorMap   = buildActorMap(data.actors);
  const fightStart = data.fight.startTime;

  const deathEvents: DeathEvent[] = data.deathEvents.map((e) =>
    transformDeath({ ...e, timestamp: e.timestamp - fightStart }, actorMap)
  );

  // Filter out nulls from events with missing ability data
  const castEvents: CastEvent[] = data.castEvents
    .map((e) => transformCast({ ...e, timestamp: e.timestamp - fightStart }, actorMap))
    .filter((e): e is CastEvent => e !== null);

  const fightDurationMs = data.fight.endTime - data.fight.startTime;
  const startTimeSec    = Math.round(data.fight.startTime / 1000);
  const endTimeSec      = Math.round(data.fight.endTime   / 1000);

  // kill is true for kills, false for wipes, null for trash/unknown
  const result: "Kill" | "Wipe" = data.fight.kill === true ? "Kill" : "Wipe";

  return {
    id:            idOverride ?? data.fight.id,
    name:          data.fight.name,
    startTime:     startTimeSec,
    endTime:       endTimeSec,
    result,
    fightDuration: fightDurationMs,
    deathEvents,
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