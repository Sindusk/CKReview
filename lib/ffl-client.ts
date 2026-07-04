// lib/ffl-client.ts
//
// Thin GraphQL client for the FFLogs v2 API.
// All queries are typed end-to-end; raw FFLogs shapes live here and
// ffl-transforms.ts converts them into app-internal Pull / DeathEvent types.
//
// FFLogs GraphQL API mirrors WarcraftLogs API structure closely — the same
// pagination pattern (nextPageTimestamp) and hostilityType argument apply.

import { getFFAccessToken } from "./ffl-auth";

const GQL_ENDPOINT = "https://www.fflogs.com/api/v2/user";

// ─── Generic GraphQL runner ───────────────────────────────────────────────────

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const token = await getFFAccessToken();

  const res = await fetch(GQL_ENDPOINT, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`FFLogs request failed (${res.status}): ${await res.text()}`);
  }

  const json = await res.json();

  // Raw response dump — this is the single choke point every FFLogs query
  // (report + all 9 event fetches) passes through, so logging here captures
  // everything. Useful for confirming field names/shapes directly from a
  // live report instead of guessing from schema docs. Safe to comment out
  // once you're done collecting sample data — it is verbose on large reports.
  console.log("[FFL raw response]", { query, variables, json });

  if (json.errors?.length) {
    throw new Error(`FFLogs GraphQL error: ${json.errors[0].message}`);
  }

  return json.data as T;
}

// ─── Raw FFLogs types ─────────────────────────────────────────────────────────

export type FFLFight = {
  id:              number;
  name:            string;
  startTime:       number;    // ms from report start
  endTime:         number;    // ms from report start
  kill:            boolean | null;
  friendlyPlayers: number[];
};

export type FFLActor = {
  id:      number;
  name:    string;
  type:    string;    // e.g. "Player", "NPC", "Boss"
  subType: string;    // FFXIV job name in PascalCase, e.g. "WhiteMage", "DarkKnight"
                      // May be "Unknown" for NPC actors
                      //
                      // Raid-error enemy detection (error-detection.ts
                      // "enemyCast" trigger) relies on `type === "NPC"` to
                      // separate boss/add actors from players and pets — see
                      // ffl-transforms.ts buildEnemyCastEvents/buildEnemyBuffEvents.
};

// A single ability/action used anywhere in the report. Fetched once per
// report via masterData and used to resolve abilityGameID on any event that
// doesn't already carry an embedded ability.name — replacing the previous
// "Ability {id}" fallback with a real name in the vast majority of cases.
//
// NOTE: field names are a best guess, mirrored from the WCL schema (FFLogs
// and WarcraftLogs share the same GraphQL platform/schema conventions). If
// the live schema differs, GraphQL will surface a "Cannot query field"
// error — verify via the API explorer at https://www.fflogs.com/api/v2/client.
export type FFLGameAbility = {
  gameID: number;
  name:   string;
  icon?:  string;
};

// FFLogs death events — the killing ability is carried on the event itself.
// `ability` may be absent for environmental/fall deaths; handle defensively.
// 2) Death event shape (#10)
export type FFLDeathEvent = {
  timestamp:  number;
  type:       "death";
  sourceID:   number;
  targetID:   number;
  abilityGameID?: number;
  // FFLogs' actual killing-blow field — mirrors WCL's killingAbilityGameID.
  // Absent for environmental deaths (sourceID === -1).
  killingAbilityGameID?: number;
  killerID?:       number;
  killerInstance?: number;
  ability?:   {
    name:     string;
    abilityIcon?: string;
    gameID?:  number;
  } | null;
};

// FFLogs combatant info — carries the job ID for each player.
export type FFLCombatantInfoEvent = {
  timestamp: number;
  type:      "combatantinfo";
  sourceID:  number;
  // FFLogs may expose specID or a job field; we rely on the actor.subType
  // from masterData which is more reliably populated.
};

export type FFLCastEvent = {
  timestamp:     number;
  // "begincast" is the start of a cast-time action; "cast" is the signal
  // that it actually went off. The events query can surface both — an
  // "enemyCast" raid-error rule only counts "cast" (see ffl-transforms.ts
  // buildEnemyCastEvents), since an interrupted cast never reaches "cast".
  type:          "cast" | "begincast";
  sourceID:      number;
  targetID?:     number;
  abilityGameID: number;
  ability?: {
    name:       string;
    abilityIcon?: string;
    gameID?:    number;
  } | null;
  // Resource fields (present when includeResources: true)
  resourceActor?:   number;
  classResources?:  Array<{
    amount:  number;
    max:     number;
    type:    number;
    cost?:   number;
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

// 3) Damage event shape (#8) — nested resources, not flat
export type FFLDamageEvent = {
  timestamp:     number;
  type:          "damage";
  sourceID:      number;
  targetID:      number;
  abilityGameID: number;
  ability?: {
    name:        string;
    abilityIcon?: string;
    gameID?:     number;
  } | null;
  amount:        number;
  overkill?:     number;
  // FFLogs nests the post-hit health snapshot here, not as flat fields.
  targetResources?: { hitPoints?: number; maxHitPoints?: number };
  sourceResources?: { hitPoints?: number; maxHitPoints?: number };
  // Kept as a fallback only — rarely populated on FFLogs "damage" events.
  hitPoints?:    number;
  maxHitPoints?: number;
};

export type FFLHealEvent = {
  timestamp:     number;
  type:          "heal";
  sourceID:      number;
  targetID:      number;
  abilityGameID: number;
  ability?: {
    name:        string;
    abilityIcon?: string;
    gameID?:     number;
  } | null;
  amount:        number;
  overheal?:     number;
};

export type FFLDebuffEvent = {
  timestamp:     number;
  type:          "applydebuff" | "removedebuff" | "applydebuffstack";
  sourceID:      number;
  targetID:      number;
  abilityGameID: number;
  ability?: {
    name:        string;
    abilityIcon?: string;
    gameID?:     number;
  } | null;
};

// Mirrors FFLDebuffEvent, but for buffs. Needed for the "enemyBuffApplied"
// raid-error trigger. Only ever fetched with hostilityType: "Enemies" — see
// fetchFFightData below — because that's the whole point (a boss gaining a
// buff, not a player).
export type FFLBuffEvent = {
  timestamp:     number;
  type:          "applybuff" | "removebuff" | "applybuffstack";
  sourceID:      number;
  targetID:      number;
  abilityGameID: number;
  ability?: {
    name:        string;
    abilityIcon?: string;
    gameID?:     number;
  } | null;
};

export type FFLEvent =
  | FFLDeathEvent
  | FFLCombatantInfoEvent
  | FFLCastEvent
  | FFLDamageEvent
  | FFLHealEvent
  | FFLDebuffEvent
  | FFLBuffEvent;

export type FFLReport = {
  title:      string;
  code:       string;
  fights:     FFLFight[];
  masterData: {
    actors:    FFLActor[];
    abilities: FFLGameAbility[];
  };
};

// ─── Query: Report fights + roster ───────────────────────────────────────────

const REPORT_QUERY = /* graphql */`
  query GetFFReport($code: String!) {
    reportData {
      report(code: $code) {
        title
        code
        fights(killType: Encounters) {
          id
          name
          startTime
          endTime
          kill
          friendlyPlayers
        }
        masterData(translate: true) {
          actors {
            id
            name
            type
            subType
          }
          abilities {
            gameID
            name
            icon
          }
        }
      }
    }
  }
`;

type ReportQueryResult = {
  reportData: {
    report: FFLReport;
  };
};

export async function fetchFFReport(reportCode: string): Promise<FFLReport> {
  const data = await gql<ReportQueryResult>(REPORT_QUERY, { code: reportCode });
  return data.reportData.report;
}

// ─── Query: Events for a single fight ────────────────────────────────────────
//
// FFLogs uses the same pagination approach as WarcraftLogs:
// pass nextPageTimestamp back as the next startTime — there is no `after` arg.
//
// includeResources: true is set on all queries to maximise data richness.
//
// $hostilityType selects Friendlies vs Enemies. It's nullable/optional —
// when the caller doesn't pass one, fetchAllFFEvents below simply omits the
// variable from the request body, so the server falls back to its default
// (Friendlies), matching every existing call's prior behavior. Only the new
// enemy-side cast/buff fetches in fetchFFightData pass "Enemies" explicitly.
const EVENTS_QUERY = /* graphql */`
  query GetFFEvents(
    $code:          String!
    $fightIDs:      [Int]!
    $startTime:     Float!
    $endTime:       Float!
    $type:          EventDataType!
    $hostilityType: HostilityType
  ) {
    reportData {
      report(code: $code) {
        events(
          fightIDs:         $fightIDs
          startTime:        $startTime
          endTime:          $endTime
          dataType:         $type
          hostilityType:    $hostilityType
          includeResources: true
        ) {
          data
          nextPageTimestamp
        }
      }
    }
  }
`;

type EventsQueryResult = {
  reportData: {
    report: {
      events: {
        data:              FFLEvent[];
        nextPageTimestamp: number | null;
      };
    };
  };
};

type HostilityType = "Friendlies" | "Enemies";

async function fetchAllFFEvents(
  reportCode: string,
  fightId:    number,
  startTime:  number,
  endTime:    number,
  type:       "Deaths" | "Casts" | "CombatantInfo" | "DamageDone" | "DamageTaken" | "Healing" | "Debuffs" | "Buffs",
  // Omitted entirely (not even sent as null) when not passed — see the
  // comment on EVENTS_QUERY above for why that matters.
  hostilityType?: HostilityType
): Promise<FFLEvent[]> {
  const allEvents: FFLEvent[] = [];
  let pageStart = startTime;

  while (true) {
    const data = await gql<EventsQueryResult>(EVENTS_QUERY, {
      code:      reportCode,
      fightIDs:  [fightId],
      startTime: pageStart,
      endTime,
      type,
      hostilityType,
    });

    const page = data.reportData.report.events;
    allEvents.push(...page.data);

    if (!page.nextPageTimestamp || page.nextPageTimestamp >= endTime) break;
    pageStart = page.nextPageTimestamp;
  }

  return allEvents;
}

// ─── Public: fetch everything for a fight ────────────────────────────────────

export type FFLFightData = {
  fight:             FFLFight;
  actors:            FFLActor[];
  deathEvents:       FFLDeathEvent[];
  combatantInfos:    FFLCombatantInfoEvent[];
  castEvents:        FFLCastEvent[];       // friendly-hostility casts (players) — unchanged behavior
  damageDoneEvents:  FFLDamageEvent[];
  damageTakenEvents: FFLDamageEvent[];
  healingEvents:     FFLHealEvent[];
  debuffEvents:      FFLDebuffEvent[];     // friendly-hostility debuffs (players) — unchanged behavior
  enemyCastEvents:   FFLCastEvent[];       // NEW — hostilityType: Enemies, feeds "enemyCast" rules
  enemyBuffEvents:   FFLBuffEvent[];       // NEW — hostilityType: Enemies, feeds "enemyBuffApplied" rules
};

/**
 * Fetches all event types for a single FF fight in parallel.
 * Actors are passed in from report-level masterData to avoid re-fetching.
 * All data is fetched eagerly so downstream components read from memory only.
 */
// 4) fetchFFightData — drop the duplicate "calculateddamage" preview
//    entries FFLogs streams alongside the real "damage" event (#8, and
//    fixes doubled damage-done/taken totals as a side effect):
export async function fetchFFightData(
  reportCode: string,
  fight:      FFLFight,
  actors:     FFLActor[]
): Promise<FFLFightData> {
  const [
    rawDeaths, rawCombatantInfos, rawCasts,
    rawDamageDone, rawDamageTaken, rawHealing, rawDebuffs,
    rawEnemyCasts, rawEnemyBuffs,
  ] = await Promise.all([
    fetchAllFFEvents(reportCode, fight.id, fight.startTime, fight.endTime, "Deaths"),
    fetchAllFFEvents(reportCode, fight.id, fight.startTime, fight.endTime, "CombatantInfo"),
    fetchAllFFEvents(reportCode, fight.id, fight.startTime, fight.endTime, "Casts"),
    fetchAllFFEvents(reportCode, fight.id, fight.startTime, fight.endTime, "DamageDone"),
    fetchAllFFEvents(reportCode, fight.id, fight.startTime, fight.endTime, "DamageTaken"),
    fetchAllFFEvents(reportCode, fight.id, fight.startTime, fight.endTime, "Healing"),
    fetchAllFFEvents(reportCode, fight.id, fight.startTime, fight.endTime, "Debuffs"),
    // NEW — enemy-hostility fetches for raid-wide error detection.
    fetchAllFFEvents(reportCode, fight.id, fight.startTime, fight.endTime, "Casts", "Enemies"),
    fetchAllFFEvents(reportCode, fight.id, fight.startTime, fight.endTime, "Buffs", "Enemies"),
  ]);

  // See getFFDamageDone-Sample.json / getFFDamageTaken-Sample.json — FFLogs
  // emits a "calculateddamage" preview alongside the "damage" event that
  // actually lands. Only the latter carries the post-hit targetResources
  // snapshot; keeping both double-counts every hit.
  const onlyLanded = (events: any[]) => events.filter((e) => e.type === "damage");

  return {
    fight,
    actors,
    deathEvents:       rawDeaths                as FFLDeathEvent[],
    combatantInfos:    rawCombatantInfos         as FFLCombatantInfoEvent[],
    castEvents:        rawCasts                  as FFLCastEvent[],
    damageDoneEvents:  onlyLanded(rawDamageDone)  as FFLDamageEvent[],
    damageTakenEvents: onlyLanded(rawDamageTaken) as FFLDamageEvent[],
    healingEvents:     rawHealing                as FFLHealEvent[],
    debuffEvents:      rawDebuffs                as FFLDebuffEvent[],
    enemyCastEvents:   rawEnemyCasts             as FFLCastEvent[],
    enemyBuffEvents:   rawEnemyBuffs             as FFLBuffEvent[],
  };
}
