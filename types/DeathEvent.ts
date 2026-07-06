// types/DeathEvent.ts

export type DeathEvent = {
  timestamp:            number;  // ms into the pull
  player:               string;
  class:                string;
  specId:               number;  // Blizzard spec ID — for accurate role display
  role:                 "Tank" | "Healer" | "DPS";
  killingAbilityGameId: number;  // raw ability ID from WCL (0 = unknown)
  cause:                string;  // resolved name from spell-data.ts, or "Unknown (ID: X)"
  // Fully-resolved icon URL for the killing ability (via lib/ability-icons.ts),
  // or undefined for environmental deaths / unresolved abilities.
  causeIcon?:           string;
};
