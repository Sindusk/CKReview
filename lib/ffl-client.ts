// lib/ffl-client.ts
//
// Thin GraphQL client for the FFLogs v2 API.
// All queries are typed end-to-end; raw FFLogs shapes live here and
// ffl-transforms.ts converts them into app-internal Pull / DeathEvent types.
//
// FFLogs GraphQL API mirrors WarcraftLogs API structure closely — the same
// pagination pattern (nextPageTimestamp) applies.

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

  if (json.errors?.length) {
    throw new Error(`FFLogs GraphQL error: ${json.errors[0].message}`);
  }

  console.log("[FFL RAW]", JSON.stringify(json.data, null, 2));
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
};

// FFLogs death events — the killing ability is carried on the event itself.
// `ability` may be absent for environmental/fall deaths; handle defensively.
export type FFLDeathEvent = {
  timestamp:  number;   // ms from report start (NOT fight start)
  type:       "death";
  sourceID:   number;
  targetID:   number;
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
  type:          "cast";
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
  // Resource fields
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

export type FFLEvent =
  | FFLDeathEvent
  | FFLCombatantInfoEvent
  | FFLCastEvent
  | FFLDamageEvent
  | FFLHealEvent
  | FFLDebuffEvent;

export type FFLReport = {
  title:      string;
  code:       string;
  fights:     FFLFight[];
  masterData: {
    actors: FFLActor[];
  };
};

// ─── Query: Report fights + roster ───────────────────────────────────────────

const REPORT_QUERY = /* graphql */`
  query GetFFReport($code: String!) {
    reportData {
      report(code: $code) {
        title
        code
        fights(killType: All) {
          id
          name
          startTime
          endTime
          kill
          friendlyPlayers
        }
        masterData(translate: true) {
          actors(type: "Player") {
            id
            name
            type
            subType
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

const EVENTS_QUERY = /* graphql */`
  query GetFFEvents(
    $code:      String!
    $fightIDs:  [Int]!
    $startTime: Float!
    $endTime:   Float!
    $type:      EventDataType!
  ) {
    reportData {
      report(code: $code) {
        events(
          fightIDs:         $fightIDs
          startTime:        $startTime
          endTime:          $endTime
          dataType:         $type
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

async function fetchAllFFEvents(
  reportCode: string,
  fightId:    number,
  startTime:  number,
  endTime:    number,
  type:       "Deaths" | "Casts" | "CombatantInfo" | "DamageDone" | "DamageTaken" | "Healing" | "Debuffs"
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
  castEvents:        FFLCastEvent[];
  damageDoneEvents:  FFLDamageEvent[];
  damageTakenEvents: FFLDamageEvent[];
  healingEvents:     FFLHealEvent[];
  debuffEvents:      FFLDebuffEvent[];
};

/**
 * Fetches all event types for a single FF fight in parallel.
 * Actors are passed in from report-level masterData to avoid re-fetching.
 * All data is fetched eagerly so downstream components read from memory only.
 */
export async function fetchFFightData(
  reportCode: string,
  fight:      FFLFight,
  actors:     FFLActor[]
): Promise<FFLFightData> {
  const [
    rawDeaths,
    rawCombatantInfos,
    rawCasts,
    rawDamageDone,
    rawDamageTaken,
    rawHealing,
    rawDebuffs,
  ] = await Promise.all([
    fetchAllFFEvents(reportCode, fight.id, fight.startTime, fight.endTime, "Deaths"),
    fetchAllFFEvents(reportCode, fight.id, fight.startTime, fight.endTime, "CombatantInfo"),
    fetchAllFFEvents(reportCode, fight.id, fight.startTime, fight.endTime, "Casts"),
    fetchAllFFEvents(reportCode, fight.id, fight.startTime, fight.endTime, "DamageDone"),
    fetchAllFFEvents(reportCode, fight.id, fight.startTime, fight.endTime, "DamageTaken"),
    fetchAllFFEvents(reportCode, fight.id, fight.startTime, fight.endTime, "Healing"),
    fetchAllFFEvents(reportCode, fight.id, fight.startTime, fight.endTime, "Debuffs"),
  ]);

  return {
    fight,
    actors,
    deathEvents:       rawDeaths          as FFLDeathEvent[],
    combatantInfos:    rawCombatantInfos  as FFLCombatantInfoEvent[],
    castEvents:        rawCasts           as FFLCastEvent[],
    damageDoneEvents:  rawDamageDone      as FFLDamageEvent[],
    damageTakenEvents: rawDamageTaken     as FFLDamageEvent[],
    healingEvents:     rawHealing         as FFLHealEvent[],
    debuffEvents:      rawDebuffs         as FFLDebuffEvent[],
  };
}
