// types/Pull.ts

import type { DeathEvent } from "./DeathEvent";
import type { PlayerInfo } from "./PlayerInfo";

export type Pull = {
  id:            number;
  name:          string;
  startTime:     number;    // seconds from report start
  endTime:       number;    // seconds from report start
  result:        "Wipe" | "Kill";
  fightDuration: number;    // actual fight length in ms (from logs)
  deathEvents:   DeathEvent[];
  players:       PlayerInfo[];  // roster for this pull, from CombatantInfo
};
