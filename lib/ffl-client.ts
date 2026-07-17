// lib/ffl-client.ts
//
// Thin GraphQL client for the FFLogs v2 API.
// All queries are typed end-to-end; raw FFLogs shapes live here and
// log-transforms.ts converts them into app-internal Pull / DeathEvent types.
//
// FFLogs GraphQL API mirrors WarcraftLogs API structure closely — the same
// pagination pattern (nextPageTimestamp) and hostilityType argument apply.

import { getFFAccessToken, refreshFFAccessToken, ffLogout } from "./log-auth";
import {
  RateLimitTracker,
  buildRateLimitErrorMessage,
  backoffDelayMs,
  sleep,
  SHORT_RETRY_CEILING_SECONDS,
  type RateLimitStatus,
} from "./rate-limit";

const GQL_ENDPOINT = "https://www.fflogs.com/api/v2/user";

// ─── Rate limit tracking ────────────────────────────────────────────────────
//
// See lib/rate-limit.ts for the full explanation of why there are two
// different kinds of 429 here (Cloudflare request-rate limiting vs the
// GraphQL API's own hourly points quota) and why they need different
// handling. This tracker remembers the most recent successful response's
// rateLimitData so a persisted 429 can report an accurate reset estimate
// instead of just "try again later".

const rateLimitTracker = new RateLimitTracker();

/** Best-known current FFLogs rate-limit status, or null if never observed. */
export function getFFLRateLimitStatus(): RateLimitStatus | null {
  return rateLimitTracker.status();
}

/** True if the last-observed hourly points quota is exhausted. */
export function isFFLQuotaExhausted(): boolean {
  return rateLimitTracker.isQuotaExhausted();
}

// ─── Generic GraphQL runner ───────────────────────────────────────────────────

const MAX_RETRIES = 5;

// `logLabel` tags the raw-response console dump below so individual
// requests are identifiable when scraping sample data from the console —
// e.g. "Kefka's Return Pull 4". Pass `false` to suppress the dump entirely
// (used for fetchFFightData's per-page requests, which get ONE merged
// dump at the end instead — see fetchFFightData).
async function gql<T>(query: string, variables?: Record<string, unknown>, logLabel?: string | false): Promise<T> {
  let token = await getFFAccessToken();
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
      // Same revoked-token recovery as lib/wcl-client.ts's gql — refresh
      // once and retry; a failed refresh (or a second 401) clears the
      // stored session so the menu shows "Connect FFLogs" again, and
      // throws a login-shaped error instead of a raw HTTP failure.
      if (!authRetried) {
        authRetried = true;
        token = await refreshFFAccessToken();
        attempt--; // don't spend the 429 retry budget on the auth retry
        continue;
      }
      ffLogout();
      throw new Error(
        'FFLogs session expired — open the menu and use "Connect FFLogs" to log in again.'
      );
    }

    if (res.status === 429) {
      // If a recent successful response already told us the hourly quota
      // is exhausted and the reset is more than a minute out, this 429
      // isn't a short burst — retrying for ~30s cannot fix it. Fail fast
      // with an accurate estimate instead of wasting the retry budget.
      const status = rateLimitTracker.status();
      if (rateLimitTracker.isQuotaExhausted() && status && status.secondsUntilReset > SHORT_RETRY_CEILING_SECONDS) {
        throw new Error(buildRateLimitErrorMessage("FFLogs", status));
      }

      if (attempt === MAX_RETRIES) {
        throw new Error(buildRateLimitErrorMessage("FFLogs", rateLimitTracker.status()));
      }

      // Cloudflare's 429 challenge page doesn't reliably send a
      // Retry-After header, so fall back to exponential backoff + jitter
      // when it's absent.
      const retryAfterHeader = res.headers.get("retry-after");
      const waitMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : backoffDelayMs(attempt);

      console.warn(
        `[FFL] 429 rate limited — retrying in ${Math.round(waitMs)}ms ` +
        `(attempt ${attempt + 1}/${MAX_RETRIES})`
      );

      await sleep(waitMs);
      continue;
    }

    if (!res.ok) {
      throw new Error(`FFLogs request failed (${res.status}): ${await res.text()}`);
    }

    const json = await res.json();
    rateLimitTracker.capture(json.data);

    // Raw response dump — this is the single choke point every FFLogs query
    // (report + all per-fight event fetches) passes through, so logging here
    // captures everything. Useful for confirming field names/shapes directly
    // from a live report instead of guessing from schema docs. Safe to
    // comment out once you're done collecting sample data — it is verbose
    // on large reports.
    if (logLabel !== false) {
      console.log(`[FFL raw response]${logLabel ? ` — ${logLabel}` : ""}`, { query, variables, json });
    }

    if (json.errors?.length) {
      throw new Error(`FFLogs GraphQL error: ${json.errors[0].message}`);
    }

    return json.data as T;
  }

  // Unreachable — the loop above always returns or throws — but keeps
  // TypeScript happy about a guaranteed return type.
  throw new Error("FFLogs request failed: exhausted retry loop unexpectedly.");
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
                      // "enemyCast" trigger) treats anything NOT `type ===
                      // "Player"` as a valid enemy source (bosses can come
                      // back typed "NPC" or "Boss" depending on the fight) —
                      // see log-transforms.ts fflBuildEnemyCastEvents/fflBuildEnemyBuffEvents.
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
  // "enemyCast" raid-error rule only counts "cast" (see log-transforms.ts
  // fflBuildEnemyCastEvents), since an interrupted cast never reaches "cast".
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
  // "calculateddamage" is FFLogs' preview/prediction record for a hit,
  // normally followed by a "damage" event once it actually lands — except
  // when the hit is fully absorbed to 0 net damage, in which case NO
  // "damage" follow-up ever arrives and the "calculateddamage" record
  // (tagged `unpaired: true`) is the only trace of it. See the onlyLanded
  // filter in fetchFFightData below, which relies on both of these fields.
  type:          "damage" | "calculateddamage";
  sourceID:      number;
  // Distinguishes multiple simultaneous copies of the same NPC actor —
  // e.g. each Forsaken tower is a separate instance of one actor, and this
  // is the only field that says WHICH tower dealt a given soak hit.
  sourceInstance?: number;
  targetID:      number;
  abilityGameID: number;
  ability?: {
    name:        string;
    abilityIcon?: string;
    gameID?:     number;
  } | null;
  amount:        number;
  overkill?:     number;
  // Set on a "calculateddamage" event that never receives a matching
  // "damage" event — see the `type` comment above.
  unpaired?:     boolean;
  tick?:         boolean;   // ← added — mirrors WCLDamageEvent.tick
  // FFLogs nests the post-hit health snapshot here, not as flat fields.
  // x/y are the actor's position at the moment of the hit, in FFLogs'
  // centi-yalm map units (arena center of the Forsaken room = 10000,10000).
  targetResources?: { hitPoints?: number; maxHitPoints?: number; x?: number; y?: number };
  sourceResources?: { hitPoints?: number; maxHitPoints?: number; x?: number; y?: number };
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
  type:          "applydebuff" | "removedebuff" | "applydebuffstack" | "removedebuffstack";
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
    report: FFLReport;
  };
};

export async function fetchFFReport(reportCode: string): Promise<FFLReport> {
  const data = await gql<ReportQueryResult>(REPORT_QUERY, { code: reportCode }, `report ${reportCode}`);
  return data.reportData.report;
}

/**
 * Per-boss "Pull N" console labels for every fight in a report, keyed by
 * fight id — mirrors buildFightLogLabels in wcl-client.ts (see that
 * comment for usage rules).
 */
export function buildFFFightLogLabels(fights: FFLFight[]): Map<number, string> {
  const labels = new Map<number, string>();
  const nameCounters = new Map<string, number>();
  for (const fight of [...fights].sort((a, b) => a.startTime - b.startTime)) {
    const name = fight.name ?? "Unknown Fight";
    const next = (nameCounters.get(name) ?? 0) + 1;
    nameCounters.set(name, next);
    labels.set(fight.id, `${name} Pull ${next}`);
  }
  return labels;
}

// ─── Query: ALL event types for a single fight, merged into one request ─────
//
// Previously this was 9 separate HTTP requests per fight (Deaths,
// CombatantInfo, Casts, DamageDone, DamageTaken, Healing, Debuffs, enemy
// Casts, enemy Buffs), fired via Promise.all in fetchFFightData. On a large
// report (many fights × up to 3 fights fetched concurrently, see
// FIGHT_FETCH_CONCURRENCY in app/page.tsx) that's a big burst of HTTP
// requests, which is what actually trips FFLogs' Cloudflare-level 429 —
// that's a request-RATE limit, distinct from the GraphQL API's own hourly
// points quota (see lib/rate-limit.ts).
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
  query GetFFightEvents(
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
      deaths:         EventStream<FFLDeathEvent>;
      combatantInfo:  EventStream<FFLCombatantInfoEvent>;
      casts:          EventStream<FFLCastEvent>;
      damageDone:     EventStream<FFLDamageEvent>;
      damageTaken:    EventStream<FFLDamageEvent>;
      healing:        EventStream<FFLHealEvent>;
      debuffs:        EventStream<FFLDebuffEvent>;
      enemyCasts:     EventStream<FFLCastEvent>;
      enemyBuffs:     EventStream<FFLBuffEvent>;
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
  enemyCastEvents:   FFLCastEvent[];       // hostilityType: Enemies, feeds "enemyCast" rules
  enemyBuffEvents:   FFLBuffEvent[];       // hostilityType: Enemies, feeds "enemyBuffApplied" rules
};

/**
 * Fetches all event types for a single FF fight — as ONE merged GraphQL
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
export async function fetchFFightData(
  reportCode: string,
  fight:      FFLFight,
  actors:     FFLActor[],
  logLabel?:  string,      // e.g. from buildFFFightLogLabels — tags console dumps
  skipConsoleDump = false  // true for callers (e.g. scripts/fetch-ff-report.js) that
                            // persist the result themselves
): Promise<FFLFightData> {
  const endTime = fight.endTime;
  const label   = logLabel ?? `${fight.name ?? "Unknown Fight"} (fight ${fight.id})`;

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

  // See getFFDamageDone-Sample.json / getFFDamageTaken-Sample.json — FFLogs
  // emits a "calculateddamage" preview alongside the "damage" event that
  // actually lands. Only the latter carries the post-hit targetResources
  // snapshot; keeping both double-counts every hit.
  const onlyLanded = <T extends { type?: string; unpaired?: boolean }>(events: T[]) =>
    events.filter((e) => e.type === "damage" || (e.type === "calculateddamage" && e.unpaired === true));

  // ONE console dump per fight, all pages merged — see the WCL client's
  // fetchFightData for the full rationale. Same {query, variables, json}
  // shape a per-page dump used, so a saved file is a drop-in replacement.
  if (!skipConsoleDump) {
    console.log(`[FFL raw response] — ${label} (${page} page${page === 1 ? "" : "s"} merged)`, {
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
    damageDoneEvents:  onlyLanded(collected.damageDone),
    damageTakenEvents: onlyLanded(collected.damageTaken),
    healingEvents:     collected.healing,
    debuffEvents:      collected.debuffs,
    enemyCastEvents:   collected.enemyCasts,
    enemyBuffEvents:   collected.enemyBuffs,
  };
}
