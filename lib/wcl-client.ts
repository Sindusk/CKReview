// lib/wcl-client.ts
//
// Thin GraphQL client for the WarcraftLogs v2 API.
// All queries are typed end-to-end; raw WCL shapes live here and
// log-transforms.ts converts them into app-internal Pull / DeathEvent types.

import { getAccessToken, refreshWCLAccessToken, logout } from "./log-auth";
import {
  RateLimitTracker,
  buildRateLimitErrorMessage,
  backoffDelayMs,
  sleep,
  SHORT_RETRY_CEILING_SECONDS,
  type RateLimitStatus,
} from "./rate-limit";

const GQL_ENDPOINT = "https://www.warcraftlogs.com/api/v2/user";

// ─── Rate limit tracking ────────────────────────────────────────────────────
//
// See lib/rate-limit.ts for the full explanation of why there are two
// different kinds of 429 here (Cloudflare request-rate limiting vs the
// GraphQL API's own hourly points quota) and why they need different
// handling. This tracker remembers the most recent successful response's
// rateLimitData so a persisted 429 can report an accurate reset estimate
// instead of just "try again later".

const rateLimitTracker = new RateLimitTracker();

/** Best-known current WCL rate-limit status, or null if never observed. */
export function getWCLRateLimitStatus(): RateLimitStatus | null {
  return rateLimitTracker.status();
}

/** True if the last-observed hourly points quota is exhausted. */
export function isWCLQuotaExhausted(): boolean {
  return rateLimitTracker.isQuotaExhausted();
}

// ─── Generic GraphQL runner ───────────────────────────────────────────────────

const MAX_RETRIES = 5;

// `logLabel` tags the raw-response console dump below so individual
// requests are identifiable when scraping sample data from the console —
// e.g. "Midnight Falls Pull 4". Pass `false` to suppress the dump entirely
// (used for fetchFightData's per-page requests, which get ONE merged dump
// at the end instead — see fetchFightData).
async function gql<T>(query: string, variables?: Record<string, unknown>, logLabel?: string | false): Promise<T> {
  let token = await getAccessToken();
  let authRetried = false;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(GQL_ENDPOINT, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (res.status === 401) {
      // 401 despite a locally-unexpired token = revoked server-side (seen
      // 2026-07-17: the Node fetch scripts refreshing on a shared grant
      // lineage revoked the browser's token). Refresh once and retry; if
      // the refresh fails, refreshWCLAccessToken clears the stored session
      // (so the menu shows "Connect WarcraftLogs" again) and throws a
      // login-shaped error. A second 401 after a successful refresh gets
      // the same treatment — the grant itself is dead.
      if (!authRetried) {
        authRetried = true;
        token = await refreshWCLAccessToken();
        attempt--; // don't spend the 429 retry budget on the auth retry
        continue;
      }
      logout();
      throw new Error(
        'WarcraftLogs session expired — open the menu and use "Connect WarcraftLogs" to log in again.'
      );
    }

    if (res.status === 429) {
      // If a recent successful response already told us the hourly quota
      // is exhausted and the reset is more than a minute out, this 429
      // isn't a short burst — retrying for ~30s cannot fix it. Fail fast
      // with an accurate estimate instead of wasting the retry budget.
      const status = rateLimitTracker.status();
      if (rateLimitTracker.isQuotaExhausted() && status && status.secondsUntilReset > SHORT_RETRY_CEILING_SECONDS) {
        throw new Error(buildRateLimitErrorMessage("WCL", status));
      }

      if (attempt === MAX_RETRIES) {
        throw new Error(buildRateLimitErrorMessage("WCL", rateLimitTracker.status()));
      }

      // WCL doesn't reliably send a Retry-After header on 429s, so fall
      // back to exponential backoff + jitter when it's absent.
      const retryAfterHeader = res.headers.get("retry-after");
      const waitMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : backoffDelayMs(attempt);

      console.warn(
        `[WCL] 429 rate limited — retrying in ${Math.round(waitMs)}ms ` +
        `(attempt ${attempt + 1}/${MAX_RETRIES})`
      );

      await sleep(waitMs);
      continue;
    }

    if (!res.ok) {
      throw new Error(`WCL request failed (${res.status}): ${await res.text()}`);
    }

    const json = await res.json();
    rateLimitTracker.capture(json.data);

    // Raw response dump — this is the single choke point every WCL query
    // (report + all per-fight event fetches) passes through, so logging here
    // captures everything. Useful for confirming field names/shapes (e.g. does
    // a damage event actually carry `tick` or `hitPoints`?) directly from a
    // live report instead of guessing from schema docs. Safe to comment out
    // once you're done collecting sample data — it is verbose on large reports.
    if (logLabel !== false) {
      console.log(`[WCL raw response]${logLabel ? ` — ${logLabel}` : ""}`, { query, variables, json });
    }

    if (json.errors?.length) {
      throw new Error(`WCL GraphQL error: ${json.errors[0].message}`);
    }

    return json.data as T;
  }

  // Unreachable — the loop above always returns or throws — but keeps
  // TypeScript happy about a guaranteed return type.
  throw new Error("WCL request failed: exhausted retry loop unexpectedly.");
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
  type:    string;    // "Player" for players; "NPC" or "Pet" for enemies (some
                      // boss-summoned adds come back typed "Pet") — only ever
                      // meaningful as a class label when looked up for a
                      // player actor. Raid-error enemy detection
                      // (error-detection.ts "enemyCast"/"enemyBuffApplied"
                      // rules) treats anything NOT "Player" as a valid enemy
                      // source — see log-transforms.ts.
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
  // log-transforms.ts wclBuildEnemyCastEvents), matching how a real interrupt
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
  // "removedebuffstack" — a stack decrement that leaves the debuff still
  // active with stacks remaining, distinct from "removedebuff" (full
  // removal). See types/PlayerInfo.ts's "stackRemoved" status.
  type:          "applydebuff" | "removedebuff" | "applydebuffstack" | "removedebuffstack";
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
    rateLimitData {
      limitPerHour
      pointsSpentThisHour
      pointsResetIn
    }
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
  const data = await gql<ReportQueryResult>(REPORT_QUERY, { code: reportCode }, `report ${reportCode}`);
  return data.reportData.report;
}

/**
 * Per-boss "Pull N" console labels for every fight in a report, keyed by
 * fight id — the same per-boss-name numbering the UI uses (see
 * renumberPullsByBoss in log-transforms.ts), computed up front so
 * fetchFightData can tag its raw-response console dumps before the Pull
 * objects exist. Callers should pass the same full fight list every time
 * (not a filtered subset) so numbering stays stable across live-poll
 * refetches.
 */
export function buildFightLogLabels(fights: WCLFight[]): Map<number, string> {
  const labels = new Map<number, string>();
  const nameCounters = new Map<string, number>();
  for (const fight of [...fights].sort((a, b) => a.startTime - b.startTime)) {
    const next = (nameCounters.get(fight.name) ?? 0) + 1;
    nameCounters.set(fight.name, next);
    labels.set(fight.id, `${fight.name} Pull ${next}`);
  }
  return labels;
}

// ─── Query: ALL event types for a single fight, merged into one request ─────
//
// Previously this was 9 separate HTTP requests per fight (Deaths,
// CombatantInfo, Casts, DamageDone, DamageTaken, Healing, Debuffs, enemy
// Casts, enemy Buffs), fired via Promise.all in fetchFightData. On a large
// report (many fights × up to 3 fights fetched concurrently, see
// FIGHT_FETCH_CONCURRENCY in app/page.tsx) that's a big burst of HTTP
// requests, which is what actually trips WCL's Cloudflare-level 429 — that's
// a request-RATE limit, distinct from the GraphQL API's own hourly points
// quota (see lib/rate-limit.ts).
//
// GraphQL aliases let us ask for the same `events` field 9 times with
// different arguments in a SINGLE request instead — each event type gets
// its own alias and its own `$xStart` pagination cursor variable (since
// different event types can have entirely different amounts of data and
// therefore need to paginate independently, even though they share the
// same $code/$fightIDs/$endTime).
//
// This also satisfies the "request only the specific fields you need"
// guidance — every one of these 9 fields is actually consumed by
// log-transforms.ts, so nothing extraneous is being pulled in per fight.
const FIGHT_EVENTS_QUERY = /* graphql */`
  query GetFightEvents(
    $code:               String!
    $fightIDs:            [Int]!
    $endTime:             Float!
    $deathsStart:         Float!
    $combatantInfoStart:  Float!
    $castsStart:          Float!
    $damageDoneStart:     Float!
    $damageTakenStart:    Float!
    $healingStart:        Float!
    $debuffsStart:        Float!
    $enemyCastsStart:     Float!
    $enemyBuffsStart:     Float!
  ) {
    rateLimitData {
      limitPerHour
      pointsSpentThisHour
      pointsResetIn
    }
    reportData {
      report(code: $code) {
        deaths: events(
          fightIDs: $fightIDs, startTime: $deathsStart, endTime: $endTime,
          dataType: Deaths, includeResources: true
        ) { data nextPageTimestamp }

        combatantInfo: events(
          fightIDs: $fightIDs, startTime: $combatantInfoStart, endTime: $endTime,
          dataType: CombatantInfo, includeResources: true
        ) { data nextPageTimestamp }

        casts: events(
          fightIDs: $fightIDs, startTime: $castsStart, endTime: $endTime,
          dataType: Casts, includeResources: true
        ) { data nextPageTimestamp }

        damageDone: events(
          fightIDs: $fightIDs, startTime: $damageDoneStart, endTime: $endTime,
          dataType: DamageDone, includeResources: true
        ) { data nextPageTimestamp }

        damageTaken: events(
          fightIDs: $fightIDs, startTime: $damageTakenStart, endTime: $endTime,
          dataType: DamageTaken, includeResources: true
        ) { data nextPageTimestamp }

        healing: events(
          fightIDs: $fightIDs, startTime: $healingStart, endTime: $endTime,
          dataType: Healing, includeResources: true
        ) { data nextPageTimestamp }

        debuffs: events(
          fightIDs: $fightIDs, startTime: $debuffsStart, endTime: $endTime,
          dataType: Debuffs, includeResources: true
        ) { data nextPageTimestamp }

        enemyCasts: events(
          fightIDs: $fightIDs, startTime: $enemyCastsStart, endTime: $endTime,
          dataType: Casts, hostilityType: Enemies, includeResources: true
        ) { data nextPageTimestamp }

        enemyBuffs: events(
          fightIDs: $fightIDs, startTime: $enemyBuffsStart, endTime: $endTime,
          dataType: Buffs, hostilityType: Enemies, includeResources: true
        ) { data nextPageTimestamp }
      }
    }
  }
`;

type EventStream<T> = { data: T[]; nextPageTimestamp: number | null };

type FightEventsQueryResult = {
  reportData: {
    report: {
      deaths:         EventStream<WCLDeathEvent>;
      combatantInfo:  EventStream<WCLCombatantInfoEvent>;
      casts:          EventStream<WCLCastEvent>;
      damageDone:     EventStream<WCLDamageEvent>;
      damageTaken:    EventStream<WCLDamageEvent>;
      healing:        EventStream<WCLHealEvent>;
      debuffs:        EventStream<WCLDebuffEvent>;
      enemyCasts:     EventStream<WCLCastEvent>;
      enemyBuffs:     EventStream<WCLBuffEvent>;
    };
  };
};

// One entry per alias in FIGHT_EVENTS_QUERY above. Order doesn't matter,
// it's just used to loop generically over every stream when paginating.
const STREAM_KEYS = [
  "deaths", "combatantInfo", "casts", "damageDone",
  "damageTaken", "healing", "debuffs", "enemyCasts", "enemyBuffs",
] as const;

type StreamKey = typeof STREAM_KEYS[number];

// Safety valve — an unexpected/never-terminating pagination loop shouldn't
// be able to hang an import forever. 200 pages per fight is already far
// beyond anything a real fight should ever need.
const MAX_PAGES_PER_FIGHT = 200;

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
  enemyCastEvents:   WCLCastEvent[];       // hostilityType: Enemies, feeds "enemyCast" rules
  enemyBuffEvents:   WCLBuffEvent[];       // hostilityType: Enemies, feeds "enemyBuffApplied" rules
};

/**
 * Fetches all event types for a single fight — as ONE merged GraphQL
 * request per page (see FIGHT_EVENTS_QUERY above), instead of the previous
 * 9 parallel requests. Each of the 9 event streams paginates independently
 * via its own cursor: once a stream's nextPageTimestamp comes back null (or
 * >= the fight's endTime) it's "done" and its cursor is pinned to endTime,
 * so subsequent merged requests cost it a cheap empty page instead of a
 * whole separate HTTP round-trip. In the common case (no single event type
 * needs more than one page) this whole function costs exactly ONE request.
 *
 * Actors are passed in from report-level masterData to avoid re-fetching.
 * All data is fetched eagerly so downstream components read from memory only.
 */
export async function fetchFightData(
  reportCode: string,
  fight:      WCLFight,
  actors:     WCLActor[],
  logLabel?:  string,      // e.g. from buildFightLogLabels — tags console dumps
  skipConsoleDump = false  // true for callers (e.g. scripts/fetch-wow-report.js) that
                            // persist the result themselves — the browser UI leaves
                            // this false so the dump stays available for sample-data collection
): Promise<WCLFightData> {
  const endTime = fight.endTime;
  const label   = logLabel ?? `${fight.name} (fight ${fight.id})`;

  const cursors: Record<StreamKey, number> = {
    deaths: fight.startTime, combatantInfo: fight.startTime, casts: fight.startTime,
    damageDone: fight.startTime, damageTaken: fight.startTime, healing: fight.startTime,
    debuffs: fight.startTime, enemyCasts: fight.startTime, enemyBuffs: fight.startTime,
  };
  const done: Record<StreamKey, boolean> = {
    deaths: false, combatantInfo: false, casts: false, damageDone: false,
    damageTaken: false, healing: false, debuffs: false, enemyCasts: false, enemyBuffs: false,
  };
  const collected: { [K in StreamKey]: FightEventsQueryResult["reportData"]["report"][K]["data"] } = {
    deaths: [], combatantInfo: [], casts: [], damageDone: [],
    damageTaken: [], healing: [], debuffs: [], enemyCasts: [], enemyBuffs: [],
  };

  let page = 0;
  while (STREAM_KEYS.some((k) => !done[k]) && page < MAX_PAGES_PER_FIGHT) {
    page += 1;

    const data = await gql<FightEventsQueryResult>(FIGHT_EVENTS_QUERY, {
      code:                reportCode,
      fightIDs:            [fight.id],
      endTime,
      deathsStart:         cursors.deaths,
      combatantInfoStart:  cursors.combatantInfo,
      castsStart:          cursors.casts,
      damageDoneStart:     cursors.damageDone,
      damageTakenStart:    cursors.damageTaken,
      healingStart:        cursors.healing,
      debuffsStart:        cursors.debuffs,
      enemyCastsStart:     cursors.enemyCasts,
      enemyBuffsStart:     cursors.enemyBuffs,
    }, false); // per-page dump suppressed — see the single merged dump below

    const report = data.reportData.report;

    for (const key of STREAM_KEYS) {
      if (done[key]) continue; // already finished — ignore the (cheap, empty) page we still requested for it

      const stream = report[key];
      (collected[key] as unknown[]).push(...stream.data);

      if (!stream.nextPageTimestamp || stream.nextPageTimestamp >= endTime) {
        done[key] = true;
        cursors[key] = endTime;
      } else {
        cursors[key] = stream.nextPageTimestamp;
      }
    }
  }

  // ONE console dump per fight with every stream fully merged across all
  // pages it took — previously each page dumped separately, which for a
  // busy fight (Midnight Falls' damageDone/healing streams commonly need
  // 3-4 pages) meant copying several separate console entries by hand to
  // capture one pull. This single object is in the exact same
  // {query, variables, json} shape a per-page dump used, and json.data.
  // reportData.report.<stream>.data is the FULL merged array — so a file
  // saved from this one log entry is a drop-in replacement for what used
  // to require pasting multiple page files together.
  if (!skipConsoleDump) {
    console.log(`[WCL raw response] — ${label} (${page} page${page === 1 ? "" : "s"} merged)`, {
      query:     FIGHT_EVENTS_QUERY,
      variables: { code: reportCode, fightIDs: [fight.id], endTime },
      json: {
        data: {
          reportData: {
            report: Object.fromEntries(
              STREAM_KEYS.map((key) => [key, { data: collected[key], nextPageTimestamp: null }])
            ),
          },
        },
      },
    });
  }

  return {
    fight,
    actors,
    deathEvents:       collected.deaths,
    combatantInfos:    collected.combatantInfo,
    castEvents:        collected.casts,
    damageDoneEvents:  collected.damageDone,
    damageTakenEvents: collected.damageTaken,
    healingEvents:     collected.healing,
    debuffEvents:      collected.debuffs,
    enemyCastEvents:   collected.enemyCasts,
    enemyBuffEvents:   collected.enemyBuffs,
  };
}
