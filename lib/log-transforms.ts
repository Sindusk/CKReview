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
//
// ABILITY ICONS: masterData.abilities already carries a raw `icon` filename
// per ability (both games) — previously fetched and silently discarded.
// buildWCLAbilityMap/buildFFLAbilityMap now keep it alongside the name, and
// every function that resolves an ability name also resolves its icon (via
// lib/ability-icons.ts, which knows the confirmed per-game CDN base — see
// scripts/test-ability-icon-urls.mjs) onto the same display types that
// already carry abilityName/abilityId. FFLogs additionally sometimes
// carries an icon inline per-event (`ability.abilityIcon`), which is
// preferred over the masterData lookup when present — mirrors how
// fflAbilityName already prefers `ability.name` over the masterData lookup.

import type { Pull, BlackHoleGeometry } from "@/types/Pull";
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
import { getWCLAbilityIconUrl, getFFAbilityIconUrl } from "./ability-icons";
import { detectForsakenTowerErrors } from "./mechanics/ffxiv/dancingmad/forsaken";
import { detectBlackHoleErrors } from "./mechanics/ffxiv/dancingmad/blackhole";
import { detectLimitCutErrors } from "./mechanics/ffxiv/dancingmad/limitcut";
import { detectExdeathErrors } from "./mechanics/ffxiv/dancingmad/exdeath";
import { detectPhase1Errors } from "./mechanics/ffxiv/dancingmad/phase1";
import { detectMidnightFallsErrors } from "./mechanics/wow/vs-dr-mqd/midnightfalls";

// Shared shape for both games' ability maps: gameID -> name + raw icon
// filename (not yet resolved to a URL — that happens per-game via
// getWCLAbilityIconUrl/getFFAbilityIconUrl at the point of use, since the
// same raw filename format could theoretically differ in meaning between
// the two APIs).
type AbilityInfo = { name: string; icon?: string };

// ─────────────────────────────────────────────────────────────────────────
// ═══ WarcraftLogs (WoW) ═════════════════════════════════════════════════
// ─────────────────────────────────────────────────────────────────────────

export function buildWCLAbilityMap(abilities: WCLGameAbility[]): Map<number, AbilityInfo> {
  return new Map(abilities.map((a) => [a.gameID, { name: a.name, icon: a.icon }]));
}

export type WCLDisplayCastEvent = {
  timestamp:     number;
  sourceId:      number;
  sourceName:    string;
  sourceClass:   string;
  role:          "Tank" | "Healer" | "DPS";
  abilityId:     number;
  abilityName:   string;
  abilityIcon?:  string;
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
  abilityMap:  Map<number, AbilityInfo>,
  fightStart:  number
): DeathEvent {
  const actor  = actorMap.get(event.targetID);
  const specId = specIdMap.get(event.targetID) ?? 0;
  const spec   = getSpecInfo(specId);

  const killingId      = event.killingAbilityGameID ?? 0;
  const killingAbility  = killingId ? abilityMap.get(killingId) : undefined;
  const cause = killingId
    ? killingAbility?.name ?? getSpellName(killingId)
    : "Unknown";
  const causeIcon = getWCLAbilityIconUrl(killingAbility?.icon);

  return {
    timestamp:            event.timestamp - fightStart,
    player:               actor?.name ?? `Unknown (${event.targetID})`,
    class:                actor?.subType ?? spec.className,   // was actor?.type
    specId,
    role:                 specId ? spec.role : "DPS",
    killingAbilityGameId: killingId,
    cause,
    causeIcon,
  };
}

function wclAbilityName(
  event:      { abilityGameID?: number; ability?: { name?: string } },
  abilityMap: Map<number, AbilityInfo>
): string {
  if (event.ability?.name) return event.ability.name;
  if (event.abilityGameID) {
    return abilityMap.get(event.abilityGameID)?.name ?? getSpellName(event.abilityGameID);
  }
  return "Unknown";
}

// WCL's inline `ability` object (on cast/damage/heal/debuff events) never
// carries an icon — only `name` — unlike FFLogs' (see fflAbilityIcon below).
// So this always resolves via the report-level ability map, keyed by
// abilityGameID.
function wclAbilityIcon(
  event:      { abilityGameID?: number },
  abilityMap: Map<number, AbilityInfo>
): string | undefined {
  if (!event.abilityGameID) return undefined;
  return getWCLAbilityIconUrl(abilityMap.get(event.abilityGameID)?.icon);
}

function wclTransformCast(
  event:      WCLCastEvent,
  actorMap:   Map<number, WCLActor>,
  specIdMap:  Map<number, number>,
  abilityMap: Map<number, AbilityInfo>,
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
    abilityIcon:    wclAbilityIcon(event, abilityMap),
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
  abilityMap: Map<number, AbilityInfo>,
  fightStart: number
): PlayerEvent {
  const target = actorMap.get(event.targetID);
  return {
    timestamp:   event.timestamp - fightStart,
    abilityId:   event.abilityGameID ?? 0,
    abilityName: wclAbilityName(event, abilityMap),
    abilityIcon: wclAbilityIcon(event, abilityMap),
    amount:      event.amount,
    target:      target?.name,
    isDoT:       event.tick === true,
  };
}

function wclDamageTakenToPlayerEvent(
  event:      WCLDamageEvent,
  actorMap:   Map<number, WCLActor>,
  abilityMap: Map<number, AbilityInfo>,
  fightStart: number
): PlayerEvent {
  const source = actorMap.get(event.sourceID);
  const after  = event.hitPoints;
  const before = after !== undefined ? after + event.amount : undefined;

  return {
    timestamp:    event.timestamp - fightStart,
    abilityId:    event.abilityGameID ?? 0,
    abilityName:  wclAbilityName(event, abilityMap),
    abilityIcon:  wclAbilityIcon(event, abilityMap),
    amount:       event.amount,
    source:       source?.name,
    healthBefore: before,
    healthAfter:  after,
    maxHealth:    event.maxHitPoints,
    overkill:     event.overkill,
    isDoT:        event.tick === true,   // ← added
    x:            event.x,
    y:            event.y,
  };
}

function wclHealToPlayerEvent(
  event:      WCLHealEvent,
  actorMap:   Map<number, WCLActor>,
  abilityMap: Map<number, AbilityInfo>,
  fightStart: number
): PlayerEvent {
  const target = actorMap.get(event.targetID);
  return {
    timestamp:   event.timestamp - fightStart,
    abilityId:   event.abilityGameID ?? 0,
    abilityName: wclAbilityName(event, abilityMap),
    abilityIcon: wclAbilityIcon(event, abilityMap),
    amount:      event.amount,
    target:      target?.name,
  };
}

function wclDebuffToPlayerEvent(
  event:      WCLDebuffEvent,
  actorMap:   Map<number, WCLActor>,
  abilityMap: Map<number, AbilityInfo>,
  fightStart: number
): PlayerEvent {
  const source = actorMap.get(event.sourceID);
  const debuffStatus =
    event.type === "removedebuff"       ? "removed"      :
    event.type === "applydebuffstack"   ? "stack"        :
    event.type === "removedebuffstack"  ? "stackRemoved" :
    "applied";

  return {
    timestamp:   event.timestamp - fightStart,
    abilityId:   event.abilityGameID ?? 0,
    abilityName: wclAbilityName(event, abilityMap),
    abilityIcon: wclAbilityIcon(event, abilityMap),
    extra:       source?.name,
    debuffStatus,
  };
}

function wclCastToPlayerEvent(
  event:      WCLCastEvent,
  actorMap:   Map<number, WCLActor>,
  abilityMap: Map<number, AbilityInfo>,
  fightStart: number
): PlayerEvent {
  const hasTarget = event.targetID !== undefined && event.targetID !== -1;
  const target = hasTarget ? actorMap.get(event.targetID as number)?.name : undefined;

  return {
    timestamp:   event.timestamp - fightStart,
    abilityId:   event.abilityGameID ?? 0,
    abilityName: wclAbilityName(event, abilityMap),
    abilityIcon: wclAbilityIcon(event, abilityMap),
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
// The actor-type filter here is a defensive extra layer (in case the API
// ever returns something unexpected on the Enemies side) — the real
// filtering already happened server-side via hostilityType. It excludes
// "Player" specifically rather than requiring exactly "NPC": some
// boss-summoned adds (e.g. Midnight Falls' termination matrices) come back
// from masterData typed "Pet" rather than "NPC" despite being hostile
// enemies, and requiring "NPC" exactly silently dropped their casts.

function wclBuildEnemyCastEvents(
  enemyCastEvents: WCLCastEvent[],
  actorMap:        Map<number, WCLActor>,
  abilityMap:      Map<number, AbilityInfo>,
  fightStart:      number
): EnemyEvent[] {
  return enemyCastEvents
    // Only actually-completed casts count — an interrupted cast never
    // reaches "cast" (per clarification: "begincast" starts it, "cast"
    // is the signal it went off).
    .filter((e) => e.type === "cast")
    .filter((e) => actorMap.get(e.sourceID)?.type !== "Player")
    .map((e) => ({
      timestamp:   e.timestamp - fightStart,
      actorId:     e.sourceID,
      actorName:   actorMap.get(e.sourceID)?.name ?? `Unknown (${e.sourceID})`,
      abilityId:   e.abilityGameID ?? 0,
      abilityName: wclAbilityName(e, abilityMap),
      abilityIcon: wclAbilityIcon(e, abilityMap),
    }));
}

function wclBuildEnemyBuffEvents(
  enemyBuffEvents: WCLBuffEvent[],
  actorMap:        Map<number, WCLActor>,
  abilityMap:      Map<number, AbilityInfo>,
  fightStart:      number
): EnemyEvent[] {
  return enemyBuffEvents
    .filter((e) => e.type === "applybuff")
    .filter((e) => actorMap.get(e.targetID)?.type !== "Player")
    .map((e) => ({
      timestamp:   e.timestamp - fightStart,
      actorId:     e.targetID,
      actorName:   actorMap.get(e.targetID)?.name ?? `Unknown (${e.targetID})`,
      abilityId:   e.abilityGameID ?? 0,
      abilityName: wclAbilityName(e, abilityMap),
      abilityIcon: wclAbilityIcon(e, abilityMap),
    }));
}

// Damage landing on FRIENDLY NPCs — e.g. Midnight Falls' Dusk Crystals
// damaging themselves with Dimming while unhealed. The damageTaken fetch
// (friendly hostility) includes these; they're invisible to per-player
// streams since the target isn't a player. Same EnemyEvent shape, with
// actor = the NPC that was hit.
function wclBuildFriendlyNpcDamageEvents(
  damageTakenEvents: WCLDamageEvent[],
  actorMap:          Map<number, WCLActor>,
  abilityMap:        Map<number, AbilityInfo>,
  fightStart:        number
): EnemyEvent[] {
  return damageTakenEvents
    .filter((e) => actorMap.get(e.targetID)?.type === "NPC")
    .map((e) => ({
      timestamp:   e.timestamp - fightStart,
      actorId:     e.targetID,
      actorName:   actorMap.get(e.targetID)?.name ?? `Unknown (${e.targetID})`,
      abilityId:   e.abilityGameID ?? 0,
      abilityName: wclAbilityName(e, abilityMap),
      abilityIcon: wclAbilityIcon(e, abilityMap),
    }));
}

function wclBuildPlayers(
  combatantInfos:    WCLCombatantInfoEvent[],
  actorMap:          Map<number, WCLActor>,
  specIdMap:         Map<number, number>,
  abilityMap:        Map<number, AbilityInfo>,
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
  abilityMap:  Map<number, AbilityInfo>,
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
  const friendlyNpcDamageEvents = wclBuildFriendlyNpcDamageEvents(data.damageTakenEvents ?? [], actorMap, abilityMap, fightStart);

  const errors = [
    ...detectPullErrors(players, deathEvents, enemyCastEvents, enemyBuffEvents),
    ...detectMidnightFallsErrors(players, deathEvents, enemyCastEvents, enemyBuffEvents, friendlyNpcDamageEvents),
  ].sort((a, b) => a.timestamp - b.timestamp);

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

// Numbers pulls sequentially per boss name, not globally, so e.g. Rotmire
// pulls read #1–#5 and the next boss's pulls restart at #1. Mutates in
// array order — callers must sort by startTime first. Shared by the bulk
// transforms below and by live-log polling, which recomputes numbering
// across the combined existing+newly-appended pull set.
export function renumberPullsByBoss(pulls: Pull[]): void {
  const nameCounters = new Map<string, number>();
  for (const pull of pulls) {
    const next = (nameCounters.get(pull.name) ?? 0) + 1;
    nameCounters.set(pull.name, next);
    pull.pullNumber = next;
  }
}

export function transformReportToPulls(
  fightDataList: WCLFightData[],
  abilityMap:    Map<number, AbilityInfo>,
  reportCode:    string
): Array<Pull & { castEvents: WCLDisplayCastEvent[] }> {
  const pulls = [...fightDataList]
    .sort((a, b) => a.fight.startTime - b.fight.startTime)
    .map((data, i) => transformFightToPull(data, abilityMap, reportCode, i + 1));

  renumberPullsByBoss(pulls);

  return pulls;
}

// ─────────────────────────────────────────────────────────────────────────
// ═══ FFLogs (FFXIV) ═════════════════════════════════════════════════════
// ─────────────────────────────────────────────────────────────────────────

export function buildFFLAbilityMap(abilities: FFLGameAbility[]): Map<number, AbilityInfo> {
  return new Map(abilities.map((a) => [a.gameID, { name: a.name, icon: a.icon }]));
}

export type FFLDisplayCastEvent = {
  timestamp:      number;
  sourceId:       number;
  sourceName:     string;
  sourceClass:    string;
  role:           "Tank" | "Healer" | "DPS";
  abilityId:      number;
  abilityName:    string;
  abilityIcon?:   string;
  // The cast's TARGET's resources at cast time (FFLogs nests these under
  // targetResources, not flat on the event — an earlier version of this
  // type wrongly declared flat resourceActor/classResources/attackPower/
  // spellPower/armor/x/y/facing/mapID fields that never matched the real
  // API response and were consequently always undefined, dead code nothing
  // downstream ever read).
  hitPoints?:    number;
  maxHitPoints?: number;
  x?:            number;
  y?:            number;
};

function fflBuildActorMap(actors: FFLActor[]): Map<number, FFLActor> {
  return new Map(actors.map((a) => [a.id, a]));
}

function fflAbilityName(
  event: {
    abilityGameID?: number;
    ability?: { name?: string } | null;
  },
  abilityMap: Map<number, AbilityInfo>
): string {
  if (event.ability?.name) return event.ability.name;
  if (event.abilityGameID) {
    return abilityMap.get(event.abilityGameID)?.name ?? `Ability ${event.abilityGameID}`;
  }
  return "Unknown";
}

// FFLogs' inline `ability` object CAN carry its own icon (`abilityIcon`),
// unlike WCL's — preferred when present, same precedence as fflAbilityName
// preferring `ability.name`. Falls back to the report-level ability map.
function fflAbilityIcon(
  event: {
    abilityGameID?: number;
    ability?: { abilityIcon?: string } | null;
  },
  abilityMap: Map<number, AbilityInfo>
): string | undefined {
  if (event.ability?.abilityIcon) {
    return getFFAbilityIconUrl(event.ability.abilityIcon);
  }
  if (event.abilityGameID) {
    return getFFAbilityIconUrl(abilityMap.get(event.abilityGameID)?.icon);
  }
  return undefined;
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
  abilityMap: Map<number, AbilityInfo>,
  fightStart: number
): DeathEvent {
  const actor = actorMap.get(event.targetID);
  const subType = actor?.subType ?? "";
  const job = getFFJobByName(subType);

  const killingId = event.killingAbilityGameID ?? event.ability?.gameID ?? 0;

  let cause: string;
  if (killingId) {
    cause = event.ability?.name ?? abilityMap.get(killingId)?.name ?? `Ability ${killingId}`;
  } else if (event.sourceID === -1) {
    cause = "Environmental";
  } else {
    cause = "Unknown";
  }

  const causeIcon = killingId
    ? getFFAbilityIconUrl(event.ability?.abilityIcon ?? abilityMap.get(killingId)?.icon)
    : undefined;

  return {
    timestamp:            Math.max(0, event.timestamp - fightStart),
    player:               actor?.name ?? `Unknown (${event.targetID})`,
    class:                job.name,
    specId:               0,
    role:                 job.role,
    killingAbilityGameId: killingId,
    cause,
    causeIcon,
  };
}

function fflTransformCast(
  event:      FFLCastEvent,
  actorMap:   Map<number, FFLActor>,
  abilityMap: Map<number, AbilityInfo>,
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
    abilityIcon:    fflAbilityIcon(event, abilityMap),
    hitPoints:      event.targetResources?.hitPoints,
    maxHitPoints:   event.targetResources?.maxHitPoints,
    x:              event.targetResources?.x,
    y:              event.targetResources?.y,
  };
}

function fflDamageDoneToPlayerEvent(
  event:      FFLDamageEvent,
  actorMap:   Map<number, FFLActor>,
  abilityMap: Map<number, AbilityInfo>,
  fightStart: number
): PlayerEvent {
  const target = actorMap.get(event.targetID);
  return {
    timestamp:   Math.max(0, event.timestamp - fightStart),
    abilityId:   event.abilityGameID ?? 0,
    abilityName: fflAbilityName(event, abilityMap),
    abilityIcon: fflAbilityIcon(event, abilityMap),
    amount:      event.amount ?? 0,
    target:      target?.name,
    // Post-hit target HP snapshot (same targetResources nesting as
    // fflDamageTakenToPlayerEvent above) — used by forsaken.ts's enrage
    // check to read the boss's true HP a few seconds after its final
    // Ultimate Embrace cast completes, rather than only at the cast instant.
    healthAfter: event.targetResources?.hitPoints,
    maxHealth:   event.targetResources?.maxHitPoints,
  };
}

// Decodes FFLogs' "1001191.1001832." dot-separated buff-ID string (see the
// `buffs` field comment on FFLDamageEvent) into resolved ability names,
// via the same abilityMap used for cast/damage ability names — buff/status
// IDs live in the same masterData.abilities list as action IDs, so no
// separate lookup table is needed. Unresolvable IDs are dropped rather than
// shown as "Ability N" placeholders, since this list is only ever used for
// membership checks (mitigation-detection.ts), not display.
function fflDecodeActiveBuffNames(
  buffs:      string | undefined,
  abilityMap: Map<number, AbilityInfo>
): string[] | undefined {
  if (!buffs) return undefined;
  const names = buffs
    .split(".")
    .filter(Boolean)
    .map((idStr) => abilityMap.get(Number(idStr))?.name)
    .filter((n): n is string => n !== undefined);
  return names.length > 0 ? names : undefined;
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
  abilityMap: Map<number, AbilityInfo>,
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
    abilityIcon:  fflAbilityIcon(event, abilityMap),
    amount:       dealt,
    source:       source?.name,
    sourceInstance: event.sourceInstance,
    x:            event.targetResources?.x,
    y:            event.targetResources?.y,
    healthBefore: before,
    healthAfter:  after,
    maxHealth:    event.targetResources?.maxHitPoints ?? event.maxHitPoints,
    overkill:     event.overkill,
    isDoT:        event.tick === true,   // ← added
    activeBuffNames: fflDecodeActiveBuffNames(event.buffs, abilityMap),
  };
}

function fflHealToPlayerEvent(
  event:      FFLHealEvent,
  actorMap:   Map<number, FFLActor>,
  abilityMap: Map<number, AbilityInfo>,
  fightStart: number
): PlayerEvent {
  const target = actorMap.get(event.targetID);
  return {
    timestamp:   Math.max(0, event.timestamp - fightStart),
    abilityId:   event.abilityGameID ?? 0,
    abilityName: fflAbilityName(event, abilityMap),
    abilityIcon: fflAbilityIcon(event, abilityMap),
    amount:      event.amount,
    target:      target?.name,
    // The heal TARGET's own position at the moment they were healed — see
    // the type comment on FFLHealEvent.targetResources.
    x:           event.targetResources?.x,
    y:           event.targetResources?.y,
  };
}

function fflDebuffToPlayerEvent(
  event:      FFLDebuffEvent,
  actorMap:   Map<number, FFLActor>,
  abilityMap: Map<number, AbilityInfo>,
  fightStart: number
): PlayerEvent {
  const source = actorMap.get(event.sourceID);
  const debuffStatus =
    event.type === "removedebuff"       ? "removed"      :
    event.type === "applydebuffstack"   ? "stack"        :
    event.type === "removedebuffstack"  ? "stackRemoved" :
    "applied";

  return {
    timestamp:   Math.max(0, event.timestamp - fightStart),
    abilityId:   event.abilityGameID ?? 0,
    abilityName: fflAbilityName(event, abilityMap),
    abilityIcon: fflAbilityIcon(event, abilityMap),
    extra:       source?.name,
    debuffStatus,
    causeAbilityId:   event.extraAbilityGameID,
    causeAbilityName: event.extraAbilityGameID !== undefined
      ? fflAbilityName({ abilityGameID: event.extraAbilityGameID }, abilityMap)
      : undefined,
  };
}

function fflCastToPlayerEvent(
  event:      FFLCastEvent,
  actorMap:   Map<number, FFLActor>,
  abilityMap: Map<number, AbilityInfo>,
  fightStart: number
): PlayerEvent {
  const hasTarget = event.targetID !== undefined && event.targetID !== -1;
  const target = hasTarget ? actorMap.get(event.targetID as number)?.name : undefined;

  return {
    timestamp:   Math.max(0, event.timestamp - fightStart),
    abilityId:   event.abilityGameID ?? 0,
    abilityName: fflAbilityName(event, abilityMap),
    abilityIcon: fflAbilityIcon(event, abilityMap),
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
  abilityMap:      Map<number, AbilityInfo>,
  fightStart:      number
): EnemyEvent[] {
  return enemyCastEvents
    // Only actually-completed casts count — "begincast" is just the start
    // of the wind-up; an interrupted cast never reaches "cast".
    .filter((e) => e.type === "cast")
    .filter((e) => actorMap.get(e.sourceID)?.type !== "Player")
    .map((e) => ({
      timestamp:    Math.max(0, e.timestamp - fightStart),
      actorId:      e.sourceID,
      actorName:    actorMap.get(e.sourceID)?.name ?? `Unknown (${e.sourceID})`,
      abilityId:    e.abilityGameID ?? 0,
      abilityName:  fflAbilityName(e, abilityMap),
      abilityIcon:  fflAbilityIcon(e, abilityMap),
      hitPoints:    e.sourceResources?.hitPoints,
      maxHitPoints: e.sourceResources?.maxHitPoints,
    }));
}

function fflBuildEnemyBuffEvents(
  enemyBuffEvents: FFLBuffEvent[],
  actorMap:        Map<number, FFLActor>,
  abilityMap:      Map<number, AbilityInfo>,
  fightStart:      number
): EnemyEvent[] {
  return enemyBuffEvents
    .filter((e) => e.type === "applybuff")
    .filter((e) => actorMap.get(e.targetID)?.type !== "Player")
    .map((e) => ({
      timestamp:   Math.max(0, e.timestamp - fightStart),
      actorId:     e.targetID,
      actorName:   actorMap.get(e.targetID)?.name ?? `Unknown (${e.targetID})`,
      abilityId:   e.abilityGameID ?? 0,
      abilityName: fflAbilityName(e, abilityMap),
      abilityIcon: fflAbilityIcon(e, abilityMap),
    }));
}

// Raw geometry data for the Black Hole mechanic's direction/priority
// detection (see types/Pull.ts's BlackHoleGeometry + blackhole-strategy.ts's
// module comment). Reads straight from the SAME enemyCastEvents stream
// fflBuildEnemyCastEvents does — just pulling different fields (position/
// facing instead of ability/actor name) — so no extra fetch is needed, only
// extraction that wasn't done before. Actor name match (not subType) is
// deliberate: "Kefka" and "black hole" are both how FFLogs' masterData
// actually names these NPCs, confirmed against report VtdBqhLQkWJXMvDg.
function fflBuildBlackHoleGeometry(
  enemyCastEvents: FFLCastEvent[],
  actorMap:        Map<number, FFLActor>,
  abilityMap:      Map<number, AbilityInfo>,
  fightStart:      number
): BlackHoleGeometry {
  const kefkaIds     = new Set([...actorMap.entries()].filter(([, a]) => a.name === "Kefka").map(([id]) => id));
  const blackHoleIds = new Set([...actorMap.entries()].filter(([, a]) => a.name === "black hole").map(([id]) => id));

  const kefkaFacingSamples = enemyCastEvents
    .filter((e) => e.type === "cast" && kefkaIds.has(e.sourceID) && e.sourceResources?.facing !== undefined && e.sourceResources?.x !== undefined && e.sourceResources?.y !== undefined)
    .map((e) => ({
      timestamp:   Math.max(0, e.timestamp - fightStart),
      x:           e.sourceResources!.x!,
      y:           e.sourceResources!.y!,
      facing:      e.sourceResources!.facing!,
      abilityName: fflAbilityName(e, abilityMap),
    }));

  const spawnCasts = enemyCastEvents
    .filter((e) => e.type === "cast" && blackHoleIds.has(e.sourceID) && e.sourceResources?.x !== undefined && e.sourceResources?.y !== undefined)
    .map((e) => ({
      timestamp:      Math.max(0, e.timestamp - fightStart),
      sourceInstance: e.sourceInstance ?? 0,
      x:              e.sourceResources!.x!,
      y:              e.sourceResources!.y!,
      targetActorId:  e.targetID !== undefined && e.targetID !== -1 ? e.targetID : null,
    }));

  return { kefkaFacingSamples, spawnCasts };
}

function buildFFPlayers(
  friendlyPlayerIds: number[],
  actorMap:          Map<number, FFLActor>,
  abilityMap:        Map<number, AbilityInfo>,
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
      // FFLogs includes a pseudo-actor for the raid's shared Limit Break
      // gauge in fight.friendlyPlayers (subType "LimitBreak", name "Limit
      // Break" or "Multiple Players", oddly tagged type: "Player") — not a
      // real party member. Mechanic checks that scan every entry in
      // `players` (e.g. limitcut.ts's missing-dash-victim detection) would
      // otherwise flag it for never doing anything a real player does.
      if (subType === "LimitBreak") return null;
      const job = getFFJobByName(subType);

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
  abilityMap:  Map<number, AbilityInfo>,
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
  const blackHoleGeometry = fflBuildBlackHoleGeometry(data.enemyCastEvents ?? [], actorMap, abilityMap, fightStart);

  const errors = [
    ...detectPullErrors(players, deathEvents, enemyCastEvents, enemyBuffEvents),
    ...detectForsakenTowerErrors(players, deathEvents, enemyCastEvents),
    ...detectBlackHoleErrors(players, deathEvents),
    ...detectLimitCutErrors(players, deathEvents),
    ...detectExdeathErrors(players, deathEvents),
    ...detectPhase1Errors(players, deathEvents),
  ].sort((a, b) => a.timestamp - b.timestamp);

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
    blackHoleGeometry,
    enemyCasts:    enemyCastEvents,
  };
}

export function transformFFReportToPulls(
  fightDataList: FFLFightData[],
  abilityMap:    Map<number, AbilityInfo>,
  reportCode:    string
): Array<Pull & { castEvents: FFLDisplayCastEvent[] }> {
  const pulls = [...fightDataList]
    .sort((a, b) => a.fight.startTime - b.fight.startTime)
    .map((data, i) => transformFFightToPull(data, abilityMap, reportCode, i + 1));

  renumberPullsByBoss(pulls);

  return pulls;
}
