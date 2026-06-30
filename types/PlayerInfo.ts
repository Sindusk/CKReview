// types/PlayerInfo.ts
//
// Stores per-player data derived from WCL CombatantInfo events.
// One PlayerInfo exists per player per pull — fetched eagerly at import time
// and stored in memory alongside the Pull data structure.
//
// This is the single source of truth for a player's spec, role, and class
// within a given pull. It also holds pre-fetched event arrays for each
// tab in the player detail view (DamageDone, DamageTaken, Healing, Debuffs, Casts).

export type PlayerEvent = {
  timestamp:   number;  // ms into the pull
  abilityId:   number;
  abilityName: string;
  amount?:     number;  // damage / healing value when relevant
  extra?:      string;  // e.g. debuff target name, interrupt target
};

export type PlayerInfo = {
  // Identity
  actorId:    number;   // matches WCLActor.id / targetID in events
  name:       string;
  className:  string;   // e.g. "Warrior", "Priest"
  specId:     number;   // Blizzard spec ID — see spec-data.ts
  specName:   string;   // e.g. "Protection", "Holy"

  // Role derived from specId (via spec-data.ts)
  role:       "Tank" | "Healer" | "DPS";
  rangeType:  "Melee" | "Ranged";

  // Pre-fetched event tabs (populated at import, read from memory thereafter)
  damageDone:   PlayerEvent[];
  damageTaken:  PlayerEvent[];
  healing:      PlayerEvent[];
  debuffs:      PlayerEvent[];
  casts:        PlayerEvent[];
};
