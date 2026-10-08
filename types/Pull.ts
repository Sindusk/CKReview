// types/Pull.ts

import type { DeathEvent } from "./DeathEvent";
import type { PlayerInfo } from "./PlayerInfo";
import type { PullError, EnemyEvent }  from "./PullError";
import type { EncounterPhase, PullPhaseSegment } from "../lib/pull-phases";
import type { MechanicOccurrence } from "../lib/mechanics/occurrences";

// Raw positional data for the Dancing Mad (FFXIV) Black Hole mechanic's
// direction/priority detection — see lib/mechanics/ffxiv/dancingmad/
// blackhole-strategy.ts's module comment for the full story. Undefined for
// every non-FF pull (and FF pulls before this mechanic was reached).
export type BlackHoleGeometry = {
  // Every sample of the boss's own FACING + position, straight from its
  // enemyCasts sourceResources. The boss (named "Kefka" in this fight)
  // stays pinned at arena center for the whole Black Hole phase and only
  // rotates to indicate direction — x/y are carried alongside facing so
  // the consumer can restrict to samples where he's actually near center
  // (his facing is only meaningful as a Black Hole reference there; other
  // samples reflect whatever else he's doing elsewhere in the fight).
  // abilityName lets consumers restrict to a specific cast (see
  // blackhole-strategy.ts's "Slap Happy" note) — Kefka fires several
  // different named casts while near center (Slap Happy, Shockwave,
  // Thunder III, Look Upon Me and Despair, ...) and only one of them
  // reliably reflects his Black Hole cardinal reference.
  kefkaFacingSamples: { timestamp: number; x: number; y: number; facing: number; abilityName: string }[];
  // Every "black hole" NPC's own logged spawn: its exact position (always
  // perfectly axis-aligned — one of x/y exactly matches arena center) and
  // its intended target (undefined/no target when nobody claimed it),
  // independent of who actually stood there. One entry per (sourceInstance,
  // cast tick) — a stationary tether's entries all share the same position.
  spawnCasts: { timestamp: number; sourceInstance: number; x: number; y: number; targetActorId: number | null }[];
};

export type Pull = {
  id:            number;    // globally unique, used for selection/keys
  pullNumber:    number;    // sequential per boss name — what the UI displays as "#N"
  name:          string;
  startTime:     number;
  endTime:       number;
  result:        "Wipe" | "Kill";
  fightDuration: number;
  deathEvents:   DeathEvent[];
  players:       PlayerInfo[];
  errors:        PullError[];

  game:          "wow" | "ffxiv";
  reportCode:    string;
  logSource:     "wcl" | "ffl";
  fightId:       number;    // raw fight ID from the log source, for report URLs (?fight=N)

  // WoW only: WCL difficulty id (3 Normal, 4 Heroic, 5 Mythic, 10 Mythic+
  // dungeon). Only Mythic raid pulls are added to a static's stats (see
  // staticEligiblePulls in lib/static-review-data.ts). Undefined for FFXIV
  // and for WoW pulls saved before the field existed.
  difficulty?:   number;

  // Phase segments from the log's fight metadata, ms from pull start (see
  // lib/pull-phases.ts), and the encounter's phase list for naming them.
  // Undefined when the log has no phase data for the encounter, and for
  // pulls saved before the fields existed.
  phaseSegments?:   PullPhaseSegment[];
  encounterPhases?: EncounterPhase[];

  // Every instance of an anchored mechanic the pull reached (see
  // lib/mechanics/occurrences.ts). Undefined for bosses without anchors.
  mechanicOccurrences?: MechanicOccurrence[];

  blackHoleGeometry?: BlackHoleGeometry;

  // The boss's own completed casts for this pull — persisted (unlike the
  // transient enemyCast computations that only live for the duration of
  // import-time detector calls) so the mitigation analysis can attach the
  // boss cast to each raidwide hit (lib/mitigation/analyze.ts, FFXIV) and
  // the WoW damage contexts can find a mechanic's timing (lib/mechanics/
  // wow/va/*-damage-context.ts). WoW since 2026-10-06; undefined on pulls
  // saved before.
  enemyCasts?: EnemyEvent[];
  // WoW only: buffs gained and lost by enemies (the same lists the WoW
  // encounter modules get as enemyBuffs / enemyBuffRemovals), for the damage
  // contexts' untargetable and shielded windows. Undefined on pulls saved
  // before 2026-10-06.
  enemyBuffs?:        EnemyEvent[];
  enemyBuffRemovals?: EnemyEvent[];

  // FFXIV only: every stack change of a status on an enemy that reaches 2+
  // stacks (a counter like Vamp Fatale's Satisfied, which enlarges her
  // tank buster). The fallback model (lib/mechanics/fallback.ts) compares a
  // failure's stacks with the clean resolutions'. Undefined on pulls saved
  // before 2026-10-08.
  enemyStacks?: EnemyStackEvent[];

  // Statuses players put on enemies (FFXIV: Chain Stratagem, DoTs,
  // Reprisal, ...; WoW: DoTs and the debuffs their spells apply, pets'
  // credited to the owner), for the damage analysis. Undefined for pulls
  // fetched without the enemyDebuffs stream.
  bossDebuffs?: BossDebuffEvent[];
};

export type EnemyStackEvent = {
  timestamp:  number;   // ms into the pull
  actorName:  string;
  statusId:   number;
  statusName: string;
  stack:      number;   // the new count; 0 when the status is removed
};

export type BossDebuffEvent = {
  timestamp:       number;   // ms into the pull
  statusId:        number;   // FFLogs status id (+1000000)
  statusName:      string;
  status:          "applied" | "refreshed" | "removed";
  sourceName:      string;   // the player who applied it
  targetActorId:   number;   // the boss is several actors across phases
  targetInstance?: number;
  targetName:      string;
};