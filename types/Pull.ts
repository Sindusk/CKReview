// types/Pull.ts

import type { DeathEvent } from "./DeathEvent";
import type { PlayerInfo } from "./PlayerInfo";
import type { PullError }  from "./PullError";

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
  kefkaFacingSamples: { timestamp: number; x: number; y: number; facing: number }[];
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

  blackHoleGeometry?: BlackHoleGeometry;
};