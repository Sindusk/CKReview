// lib/log-transforms.ts
//
// Converts raw WarcraftLogs AND FFLogs API shapes into the app's shared
// internal types (Pull, DeathEvent, PlayerInfo, etc). Formerly two files
// (wcl-transforms.ts / ffl-transforms.ts) with heavily parallel structure —
// merged here since they're always touched together when a new event field
// or display rule is added. Internal helpers are prefixed `wcl`/`ffl` to
// keep the two pipelines distinct; only the public entry points
// (transformFightToPull/transformReportToPulls for WCL,
// transformFFightToPull/transformFFReportToPulls for FFXIV, and
// buildWCLAbilityMap/buildFFLAbilityMap) are exported. Nothing in here
// touches the network.

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
import type {
  FFLFightData,
  FFLActor,
  FFLGameAbility,
  FFLDeathEvent,
  FFLCastEvent,
  FFLDamageEvent,
  FFLHealEvent,
  FFLDebuffEvent,
  FFLBuffEvent,
} from "./ffl-client";
import { getSpellName }                          from "./spell-data";
import { getSpecInfo, getRosterSortOrder }        from "./spec-data";
import { getFFJobByName, getFFRosterSortOrder }   from "./ffl-job-data";
import { detectPullErrors }                       from "./error-detection";

// ─────────────────────────────────────────────────────────────────────────
// ═══ WarcraftLogs (WoW) ═════════════════════════════════════════════════
// ─────────────────────────────────────────────────────────────────────────

export function buildWCLAbilityMap(abilities: WCLGameAbility[]): Map<number, string> {
  return new Map(abilities.map((a) => [a.gameID, a.name]));
}

export type WCLDisplayCastEvent = {
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

function wclBuildActorMap(actors: WCLActor[]): Map<number, WCLActor> {
  return new Map(actors.map((a) => [a.id, a]));
}

// ─── Death transformer ────────────────────────────────────────────────────────
//
// BUGFIX: WCLActor.type is "Player"/"NPC"/"Pet" — the actual WoW class name
// lives on WCLActor.subType (e.g. "DeathKnight"). Reading `actor?.type` here
// produced classes like "Player" (hence deaths/casts showing as
// "Unholy Player" instead of "Unholy Death Knight").

function wclTransformDeath(
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

function wclAbilityName(
  event:      { abilityGameID?: number; ability?: { name?: string } },
  abilityMap: Map<number, string>
): string {
  if (event.ability?.name) return event.ability.name;
  if (event.abilityGameID) {
    return abilityMap.get(event.abilityGameID) ?? getSpellName(event.abilityGameID);
  }
  return "Unknown";
}

function wclTransformCast(
  event:      WCLCastEvent,
  actorMap:   Map<number, WCLActor>,
  specIdMap:  Map<number, number>,
  abilityMap: Map<number, string>,
  fightStart: number
): WCLDisplayCastEvent {
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
    abilityName:    wclAbilityName(event, abilityMap),
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

function wclDamageDoneToPlayerEvent(
  event:      WCLDamageEvent,
  actorMap:   Map<number, WCLActor>,
  abilityMap: Map<number, string>,
  fightStart: number
): PlayerEvent {
  const target = actorMap.get(event.targetID);
  return {
    timestamp:   event.timestamp - fightStart,
    abilityId:   event.abilityGameID ?? 0,
    abilityName: wclAbilityName(event, abilityMap),
    amount:      event.amount,
    target:      target?.name,
    isDoT:       event.tick === true,
  };
}

function wclDamageTakenToPlayerEvent(
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
    abilityName:  wclAbilityName(event, abilityMap),
    amount:       event.amount,
    source:       source?.name,
    healthBefore: before,
    healthAfter:  after,
    maxHealth:    event.maxHitPoints,
    overkill:     event.overkill,
  };
}

function wclHealToPlayerEvent(
  event:      WCLHealEvent,
  actorMap:   Map<number, WCLActor>,
  abilityMap: Map<number, string>,
  fightStart: number
): PlayerEvent {
  const target = actorMap.get(event.targetID);
  return {
    timestamp:   event.timestamp - fightStart,
    abilityId:   event.abilityGameID ?? 0,
    abilityName: wclAbilityName(event, abilityMap),
    amount:      event.amount,
    target:      target?.name,
  };
}

function wclDebuffToPlayerEvent(
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
    abilityName: wclAbilityName(event, abilityMap),
    extra:       source?.name,
    debuffStatus,
  };
}

function wclCastToPlayerEvent(
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
    abilityName: wclAbilityName(event, abilityMap),
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

function wclBuildEnemyCastEvents(
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
      abilityName: wclAbilityName(e, abilityMap),
    }));
}

function wclBuildEnemyBuffEvents(
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
      abilityName: wclAbilityName(e, abilityMap),
    }));
}

function wclBuildPlayers(
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
          .map(e => wclDamageDoneToPlayerEvent(e, actorMap, abilityMap, fightStart)),

        damageTaken: damageTakenEvents
          .filter(e => e.targetID === actorId)
          .map(e => wclDamageTakenToPlayerEvent(e, actorMap, abilityMap, fightStart)),

        healing: healingEvents
          .filter(e => e.sourceID === actorId)
          .filter(e => (e.amount ?? 0) > 0)
          .map(e => wclHealToPlayerEvent(e, actorMap, abilityMap, fightStart)),

        debuffs: debuffEvents
          .filter(e => e.targetID === actorId)
          .map(e => wclDebuffToPlayerEvent(e, actorMap, abilityMap, fightStart)),

        casts: castEvents
          .filter(e => e.sourceID === actorId)
          .map(e => wclCastToPlayerEvent(e, actorMap, abilityMap, fightStart)),
      };
    })
    .sort((a, b) => getRosterSortOrder(a.specId) - getRosterSortOrder(b.specId));
}

export function transformFightToPull(
  data:        WCLFightData,
  abilityMap:  Map<number, string>,
  reportCode:  string,
  idOverride?: number
): Pull & { castEvents: WCLDisplayCastEvent[] } {
  const actorMap  = wclBuildActorMap(data.actors);
  const fightStart = data.fight.startTime;

  const specIdMap = new Map<number, number>();
  for (const ci of data.combatantInfos) {
    if (ci.specID) specIdMap.set(ci.sourceID, ci.specID);
  }

  const deathEvents: DeathEvent[] = data.deathEvents.map((e) =>
    wclTransformDeath(e, actorMap, specIdMap, abilityMap, fightStart)
  );

  // Friendly-player-facing cast list only ever showed completed casts
  // historically — keep that behavior unchanged now that "begincast"
  // events may also come back from the same query.
  const completedCasts = data.castEvents.filter((e) => e.type === "cast");

  const castEvents: WCLDisplayCastEvent[] = completedCasts.map((e) =>
    wclTransformCast(e, actorMap, specIdMap, abilityMap, fightStart)
  );

  const players: PlayerInfo[] = wclBuildPlayers(
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
  const enemyCastEvents = wclBuildEnemyCastEvents(data.enemyCastEvents ?? [], actorMap, abilityMap, fightStart);
  const enemyBuffEvents = wclBuildEnemyBuffEvents(data.enemyBuffEvents ?? [], actorMap, abilityMap, fightStart);

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
): Array<Pull & { castEvents: WCLDisplayCastEvent[] }> {
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

// ─────────────────────────────────────────────────────────────────────────
// ═══ FFLogs (FFXIV) ═════════════════════════════════════════════════════
// ─────────────────────────────────────────────────────────────────────────

export function buildFFLAbilityMap(abilities: FFLGameAbility[]): Map<number, string> {
  return new Map(abilities.map((a) => [a.gameID, a.name]));
}

export type FFLDisplayCastEvent = {
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

function fflBuildActorMap(actors: FFLActor[]): Map<number, FFLActor> {
  return new Map(actors.map((a) => [a.id, a]));
}

function fflAbilityName(
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

function fflTransformDeath(
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

function fflTransformCast(
  event:      FFLCastEvent,
  actorMap:   Map<number, FFLActor>,
  abilityMap: Map<number, string>,
  fightStart: number
): FFLDisplayCastEvent {
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
    abilityName:    fflAbilityName(event, abilityMap),
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

function fflDamageDoneToPlayerEvent(
  event:      FFLDamageEvent,
  actorMap:   Map<number, FFLActor>,
  abilityMap: Map<number, string>,
  fightStart: number
): PlayerEvent {
  const target = actorMap.get(event.targetID);
  return {
    timestamp:   Math.max(0, event.timestamp - fightStart),
    abilityId:   event.abilityGameID ?? 0,
    abilityName: fflAbilityName(event, abilityMap),
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
function fflDamageTakenToPlayerEvent(
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
    abilityName:  fflAbilityName(event, abilityMap),
    amount:       dealt,
    source:       source?.name,
    healthBefore: before,
    healthAfter:  after,
    maxHealth:    event.targetResources?.maxHitPoints ?? event.maxHitPoints,
    overkill:     event.overkill,
  };
}

function fflHealToPlayerEvent(
  event:      FFLHealEvent,
  actorMap:   Map<number, FFLActor>,
  abilityMap: Map<number, string>,
  fightStart: number
): PlayerEvent {
  const target = actorMap.get(event.targetID);
  return {
    timestamp:   Math.max(0, event.timestamp - fightStart),
    abilityId:   event.abilityGameID ?? 0,
    abilityName: fflAbilityName(event, abilityMap),
    amount:      event.amount,
    target:      target?.name,
  };
}

function fflDebuffToPlayerEvent(
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
    abilityName: fflAbilityName(event, abilityMap),
    extra:       source?.name,
    debuffStatus,
  };
}

function fflCastToPlayerEvent(
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
    abilityName: fflAbilityName(event, abilityMap),
    target,
  };
}

// ─── Enemy (raid-wide) event builders ──────────────────────────────────────
//
// Feeds the "enemyCast" / "enemyBuffApplied" raid-error rules. These MUST
// read from data.enemyCastEvents / data.enemyBuffEvents — the ones fetched
// with hostilityType: "Enemies" in ffl-client.ts — NOT from the friendly
// castEvents/debuffEvents streams above, which are scoped to players only
// and will never contain a boss's own casts or buffs no matter how they're
// filtered afterwards.
//
// The actor.type === "NPC" filter here is a defensive extra layer (in case
// the API ever returns something unexpected on the Enemies side); the real
// filtering already happened server-side via hostilityType.

function fflBuildEnemyCastEvents(
  enemyCastEvents: FFLCastEvent[],
  actorMap:        Map<number, FFLActor>,
  abilityMap:      Map<number, string>,
  fightStart:      number
): EnemyEvent[] {
  return enemyCastEvents
    // Only actually-completed casts count — "begincast" is just the start
    // of the wind-up; an interrupted cast never reaches "cast".
    .filter((e) => e.type === "cast")
    .filter((e) => actorMap.get(e.sourceID)?.type === "NPC")
    .map((e) => ({
      timestamp:   Math.max(0, e.timestamp - fightStart),
      actorId:     e.sourceID,
      actorName:   actorMap.get(e.sourceID)?.name ?? `Unknown (${e.sourceID})`,
      abilityId:   e.abilityGameID ?? 0,
      abilityName: fflAbilityName(e, abilityMap),
    }));
}

function fflBuildEnemyBuffEvents(
  enemyBuffEvents: FFLBuffEvent[],
  actorMap:        Map<number, FFLActor>,
  abilityMap:      Map<number, string>,
  fightStart:      number
): EnemyEvent[] {
  return enemyBuffEvents
    .filter((e) => e.type === "applybuff")
    .filter((e) => actorMap.get(e.targetID)?.type === "NPC")
    .map((e) => ({
      timestamp:   Math.max(0, e.timestamp - fightStart),
      actorId:     e.targetID,
      actorName:   actorMap.get(e.targetID)?.name ?? `Unknown (${e.targetID})`,
      abilityId:   e.abilityGameID ?? 0,
      abilityName: fflAbilityName(e, abilityMap),
    }));
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
        specName:  job.name,   // FFXIV has no separate spec from job; UI dedupes via formatSpecClass()
        role:      job.role,
        rangeType: job.rangeType,
        game:      "ffxiv",

        damageDone: damageDoneEvents
          .filter((e) => e.sourceID === actorId)
          .map((e) => fflDamageDoneToPlayerEvent(e, actorMap, abilityMap, fightStart)),

        damageTaken: damageTakenEvents
          .filter((e) => e.targetID === actorId)
          .map((e) => fflDamageTakenToPlayerEvent(e, actorMap, abilityMap, fightStart)),

        healing: healingEvents
          .filter((e) => e.sourceID === actorId)
          .filter((e) => (e.amount ?? 0) > 0)
          .map((e) => fflHealToPlayerEvent(e, actorMap, abilityMap, fightStart)),

        debuffs: debuffEvents
          .filter((e) => e.targetID === actorId)
          .map((e) => fflDebuffToPlayerEvent(e, actorMap, abilityMap, fightStart)),

        casts: castEvents
          .filter((e) => e.sourceID === actorId)
          .map((e) => fflCastToPlayerEvent(e, actorMap, abilityMap, fightStart)),
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
): Pull & { castEvents: FFLDisplayCastEvent[] } {
  const actorMap   = fflBuildActorMap(data.actors);
  const fightStart = data.fight.startTime;

  const deathEvents: DeathEvent[] = data.deathEvents.map((e) =>
    fflTransformDeath(e, actorMap, abilityMap, fightStart)
  );

  // Friendly-player-facing cast list only ever showed completed casts
  // historically — keep that behavior unchanged now that "begincast"
  // events may also come back from the same query.
  const completedCasts = data.castEvents.filter((e) => e.type === "cast");

  const castEvents: FFLDisplayCastEvent[] = completedCasts.map((e) =>
    fflTransformCast(e, actorMap, abilityMap, fightStart)
  );

  const players: PlayerInfo[] = buildFFPlayers(
    data.fight.friendlyPlayers ?? [],
    actorMap,
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
  const enemyCastEvents = fflBuildEnemyCastEvents(data.enemyCastEvents ?? [], actorMap, abilityMap, fightStart);
  const enemyBuffEvents = fflBuildEnemyBuffEvents(data.enemyBuffEvents ?? [], actorMap, abilityMap, fightStart);

  const errors = detectPullErrors(players, enemyCastEvents, enemyBuffEvents);

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
): Array<Pull & { castEvents: FFLDisplayCastEvent[] }> {
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
