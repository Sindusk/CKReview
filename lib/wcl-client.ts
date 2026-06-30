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
  type:    string;    // WoW class name, e.g. "Warrior", "Priest"
  subType: string;   // spec name, e.g. "Arms", "Holy"
};

export type WCLDeathEvent = {
  timestamp: number;   // ms from report start (NOT fight start)
  type:      "death";
  sourceID:  number;
  targetID:  number;
  killingBlow?: {
    name: string;
  };
};

export type WCLCastEvent = {
  timestamp:     number;
  type:          "cast";
  sourceID:      number;
  abilityGameID: number;
  ability: {
    name: string;
  };
};

export type WCLEvent = WCLDeathEvent | WCLCastEvent;

export type WCLReport = {
  title:      string;
  code:       string;
  fights:     WCLFight[];
  masterData: {
    actors: WCLActor[];
  };
};

// ─── Query: Report fights + roster ───────────────────────────────────────────

const REPORT_QUERY = /* graphql */`
  query GetReport($code: String!) {
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

const EVENTS_QUERY = /* graphql */`
  query GetEvents(
    $code:      String!
    $fightIDs:  [Int]!
    $startTime: Float!
    $endTime:   Float!
    $type:      EventDataType!
  ) {
    reportData {
      report(code: $code) {
        events(
          fightIDs:  $fightIDs
          startTime: $startTime
          endTime:   $endTime
          dataType:  $type
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

async function fetchAllEvents(
  reportCode: string,
  fightId:    number,
  startTime:  number,
  endTime:    number,
  type:       "Deaths" | "Casts"
): Promise<WCLEvent[]> {
  const allEvents: WCLEvent[] = [];
  let pageStart = startTime;

  // Paginate: advance startTime to nextPageTimestamp each page until exhausted.
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

// ─── Public: fetch everything for a fight ─────────────────────────────────────

export type WCLFightData = {
  fight:       WCLFight;
  actors:      WCLActor[];
  deathEvents: WCLDeathEvent[];
  castEvents:  WCLCastEvent[];
};

/**
 * Fetches deaths and casts for a single fight in parallel.
 * Actors are passed in from report-level masterData to avoid re-fetching.
 */
export async function fetchFightData(
  reportCode: string,
  fight:      WCLFight,
  actors:     WCLActor[]
): Promise<WCLFightData> {
  const [rawDeaths, rawCasts] = await Promise.all([
    fetchAllEvents(reportCode, fight.id, fight.startTime, fight.endTime, "Deaths"),
    fetchAllEvents(reportCode, fight.id, fight.startTime, fight.endTime, "Casts"),
  ]);

  return {
    fight,
    actors,
    deathEvents: rawDeaths as WCLDeathEvent[],
    castEvents:  rawCasts  as WCLCastEvent[],
  };
}
