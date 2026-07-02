// types/Pull.ts

import type { DeathEvent } from "./DeathEvent";
import type { PlayerInfo } from "./PlayerInfo";
import type { PullError }  from "./PullError";

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
};