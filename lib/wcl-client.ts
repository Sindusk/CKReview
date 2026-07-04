// lib/wcl-client.ts
//
// Thin GraphQL client for the WarcraftLogs v2 API.
// All queries are typed end-to-end; raw WCL shapes live here and
// wcl-transforms.ts converts them into app-internal Pull / DeathEvent types.

import { getAccessToken } from "./wcl-auth";

const GQL_ENDPOINT = "https://www.warcraftlogs.com/api/v2/user";

// ─── Generic GraphQL runner ───────────────────────────────────────────────────

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const token = await getAccessToken();

  const res = await fetch(GQL_ENDPOINT, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`WCL request failed (${res.status}): ${await res.text()}`);
  }

  const json = await res.json();

  // Raw response dump — this is the single choke point every WCL query
  // (report + all 9 event fetches) passes through, so logging here captures
  // everything. Useful for confirming field names/shapes (e.g. does a damage
  // event actually carry `tick` or `hitPoints`?) directly from a live report
  // instead of guessing from schema docs. Safe to comment out once you're
  // done collecting sample data — it is verbose on large reports.
  console.log("[WCL raw response]", { query, variables, json });

  if (json.errors?.length) {
    throw new Error(`WCL GraphQL error: ${json.errors[0].message}`);
  }

  return json.data as T;
}

// ─── Raw WCL types ────────────────────────────────────────────────────────────

export type WCLFight = {
  id:              number;
  name:            string;
  startTime:       number;    // ms from report start
  endTime:         number;    // ms from report start
  kill:            boolean | null;
  friendlyPlayers: number[];
};

export type WCLActor = {
  id:      number;
  name:    string;
  type:    string;    // WoW class name for players (e.g. "Warrior"); "NPC" or
                      // similar for enemies now that masterData.actors is
                      // unfiltered — only ever meaningful as a class label
                      // when looked up for a player actor. Raid-error enemy
                      // detection (error-detection.ts "enemyCast"/
                      // "enemyBuffApplied" rules) relies on this being
                      // exactly "NPC" for bosses/adds — see wcl-transforms.ts.
  subType: string;    // spec name, e.g. "Arms", "Holy" — empty/irrelevant for NPCs
};

// A single ability/spell used anywhere in the report (players, NPCs, bosses —
// everything). Fetched once per report via masterData and used to resolve
// every abilityGameID / killingAbilityGameID we see in events, so we no
// longer depend on a hand-maintained spell-name table.
//
// NOTE: field names (gameID/name/icon) are our best guess based on the WCL
// schema's consistent naming (abilityGameID on events, id/name/type/subType
// on actors). If the live schema uses different field names, GraphQL will
// return a clear "Cannot query field" error — check the API explorer at
// https://www.warcraftlogs.com/api/v2/client if that happens.
export type WCLGameAbility = {
  gameID: number;
  name:   string;
  icon?:  string;
};

export type WCLDeathEvent = {
  timestamp:            number;   // ms from report start (NOT fight start)
  type:                 "death";
  sourceID:             number;
  targetID:             number;
  killingAbilityGameID: number;   // raw ability ID; 0 if unknown
};

export type WCLCombatantInfoEvent = {
  timestamp: number;
  type:      "combatantinfo";
  sourceID:  number;
  specID:    number;
};

export type WCLCastEvent = {
  timestamp:     number;
  // "begincast" is the start of a channeled/cast-time spell; "cast" is the
  // signal that it actually went off. The EventDataType: Casts query can
  // surface both — enemyCast raid-error rules only count "cast" (see
  // wcl-transforms.ts buildEnemyCastEvents), matching how a real interrupt
  // would prevent "cast" from ever firing.
  type:          "cast" | "begincast";
  sourceID:      number;
  targetID?:     number;  // -1 or absent = no meaningful target (self-cast/ground-targeted/etc.)
  abilityGameID: number;
  ability?: {
    name: string;
  };
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

export type WCLDamageEvent = {
  timestamp:     number;
  type:          "damage";
  sourceID:      number;
  targetID:      number;
  abilityGameID: number;
  ability?: {
    name: string;
  };
  amount:        number;
  overkill?:     number;
  tick?:         boolean;  // true = periodic/DoT damage instance
  // Resource snapshot — reflects the target's health AFTER this hit landed.
  hitPoints?:    number;
  maxHitPoints?: number;
};

export type WCLHealEvent = {
  timestamp:     number;
  type:          "heal";
  sourceID:      number;
  targetID:      number;
  abilityGameID: number;
  ability?: {
    name: string;
  };
  amount:        number;
  overheal?:     number;
};

export type WCLDebuffEvent = {
  timestamp:     number;
  type:          "applydebuff" | "removedebuff" | "applydebuffstack";
  sourceID:      number;
  targetID:      number;
  abilityGameID: number;
  ability?: {
    name: string;
  };
};

// Mirrors WCLDebuffEvent, but for buffs. Needed for the "enemyBuffApplied"
// raid-error trigger (e.g. the boss gaining Guardian Edict). Only ever
// fetched with hostilityType: "Enemies" — see fetchFightData below —
// because that's the whole point (a boss gaining a buff, not a player).
export type WCLBuffEvent = {
  timestamp:     number;
  type:          "applybuff" | "removebuff" | "applybuffstack";
  sourceID:      number;
  targetID:      number;
  abilityGameID: number;
  ability?: {
    name: string;
  };
};

export type WCLEvent =
  | WCLDeathEvent
  | WCLCombatantInfoEvent
  | WCLCastEvent
  | WCLDamageEvent
  | WCLHealEvent
  | WCLDebuffEvent
  | WCLBuffEvent;

export type WCLReport = {
  title:      string;
  code:       string;
  fights:     WCLFight[];
  masterData: {
    actors:    WCLActor[];
    abilities: WCLGameAbility[];
  };
};

// ─── Query: Report fights + roster ───────────────────────────────────────────

const REPORT_QUERY = /* graphql */`
  query GetReport($code: String!) {
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
    report: WCLReport;
  };
};

export async function fetchReport(reportCode: string): Promise<WCLReport> {
  const data = await gql<ReportQueryResult>(REPORT_QUERY, { code: reportCode });
  return data.reportData.report;
}

// ─── Query: Events for a single fight ────────────────────────────────────────
//
// WCL paginates events by returning a `nextPageTimestamp`.
// The correct pagination pattern is to pass that value back as the next
// `startTime` — there is NO `after` argument on the events field.
//
// $hostilityType selects Friendlies vs Enemies (mirrors the "hostility=1"
// query param on the WCL website itself). It's nullable/optional — when the
// caller doesn't pass one, fetchAllEvents below simply omits the variable
// from the request body, so the server falls back to its own default
// (Friendlies), which is exactly the behavior every existing call already
// relied on before this field was added. Only the new enemy-side cast/buff
// fetches in fetchFightData pass "Enemies" explicitly.
const EVENTS_QUERY = /* graphql */`
  query GetEvents(
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
          fightIDs:        $fightIDs
          startTime:       $startTime
          endTime:         $endTime
          dataType:        $type
          hostilityType:   $hostilityType
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
        data:              WCLEvent[];
        nextPageTimestamp: number | null;
      };
    };
  };
};

type HostilityType = "Friendlies" | "Enemies";

async function fetchAllEvents(
  reportCode: string,
  fightId:    number,
  startTime:  number,
  endTime:    number,
  type:       "Deaths" | "Casts" | "CombatantInfo" | "DamageDone" | "DamageTaken" | "Healing" | "Debuffs" | "Buffs",
  // Omitted entirely (not even sent as null) when not passed — see the
  // comment on EVENTS_QUERY above for why that matters.
  hostilityType?: HostilityType
): Promise<WCLEvent[]> {
  const allEvents: WCLEvent[] = [];
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

export type WCLFightData = {
  fight:             WCLFight;
  actors:            WCLActor[];
  deathEvents:       WCLDeathEvent[];
  combatantInfos:    WCLCombatantInfoEvent[];
  castEvents:        WCLCastEvent[];       // friendly-hostility casts (players) — unchanged behavior
  damageDoneEvents:  WCLDamageEvent[];
  damageTakenEvents: WCLDamageEvent[];
  healingEvents:     WCLHealEvent[];
  debuffEvents:      WCLDebuffEvent[];     // friendly-hostility debuffs (players) — unchanged behavior
  enemyCastEvents:   WCLCastEvent[];       // NEW — hostilityType: Enemies, feeds "enemyCast" rules
  enemyBuffEvents:   WCLBuffEvent[];       // NEW — hostilityType: Enemies, feeds "enemyBuffApplied" rules
};

/**
 * Fetches all event types for a single fight in parallel.
 * Actors are passed in from report-level masterData to avoid re-fetching.
 * All data is fetched eagerly so downstream components read from memory only.
 */
export async function fetchFightData(
  reportCode: string,
  fight:      WCLFight,
  actors:     WCLActor[]
): Promise<WCLFightData> {
  const [
    rawDeaths,
    rawCombatantInfos,
    rawCasts,
    rawDamageDone,
    rawDamageTaken,
    rawHealing,
    rawDebuffs,
    rawEnemyCasts,
    rawEnemyBuffs,
  ] = await Promise.all([
    fetchAllEvents(reportCode, fight.id, fight.startTime, fight.endTime, "Deaths"),
    fetchAllEvents(reportCode, fight.id, fight.startTime, fight.endTime, "CombatantInfo"),
    fetchAllEvents(reportCode, fight.id, fight.startTime, fight.endTime, "Casts"),
    fetchAllEvents(reportCode, fight.id, fight.startTime, fight.endTime, "DamageDone"),
    fetchAllEvents(reportCode, fight.id, fight.startTime, fight.endTime, "DamageTaken"),
    fetchAllEvents(reportCode, fight.id, fight.startTime, fight.endTime, "Healing"),
    fetchAllEvents(reportCode, fight.id, fight.startTime, fight.endTime, "Debuffs"),
    // NEW — enemy-hostility fetches for raid-wide error detection. Same
    // dataType as above, but hostilityType: "Enemies" so bosses/adds show
    // up instead of being filtered out by the server's default.
    fetchAllEvents(reportCode, fight.id, fight.startTime, fight.endTime, "Casts", "Enemies"),
    fetchAllEvents(reportCode, fight.id, fight.startTime, fight.endTime, "Buffs", "Enemies"),
  ]);

  return {
    fight,
    actors,
    deathEvents:       rawDeaths         as WCLDeathEvent[],
    combatantInfos:    rawCombatantInfos as WCLCombatantInfoEvent[],
    castEvents:        rawCasts          as WCLCastEvent[],
    damageDoneEvents:  rawDamageDone     as WCLDamageEvent[],
    damageTakenEvents: rawDamageTaken    as WCLDamageEvent[],
    healingEvents:     rawHealing        as WCLHealEvent[],
    debuffEvents:      rawDebuffs        as WCLDebuffEvent[],
    enemyCastEvents:   rawEnemyCasts     as WCLCastEvent[],
    enemyBuffEvents:   rawEnemyBuffs     as WCLBuffEvent[],
  };
}
