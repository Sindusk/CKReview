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
  // Fully-resolved icon URL (via lib/ability-icons.ts), or undefined if the
  // report's masterData didn't carry an icon for this ability. UI code
  // should render this optimistically and hide on load failure, same
  // pattern already used for spec/class icons.
  abilityIcon?: string;
  amount?:     number;  // damage / healing value when relevant
  extra?:      string;  // e.g. debuff source (caster) name — intentionally not rendered in the UI

  // Target/source labeling — populated depending on tab, see usage below.
  target?:       string;  // target actor name — Damage Done, Healing, Casts (blank = no target)
  source?:       string;  // damage source actor name — Damage Taken only

  // Damage Done / Damage Taken
  isDoT?:        boolean; // marks a periodic/tick damage instance (WCL only for now)

  // Damage Taken
  // FFXIV only — which instance of the source NPC dealt the hit (e.g. which
  // of several simultaneous Forsaken towers), plus the victim's own x/y
  // position snapshot at the moment of the hit (FFLogs centi-yalm units).
  // Consumed by mechanics/forsaken.ts; not rendered in the UI.
  sourceInstance?: number;
  x?:            number;
  y?:            number;
  healthBefore?: number;  // target's health immediately before this hit
  healthAfter?:  number;  // target's health immediately after this hit
  maxHealth?:    number;  // for context/formatting
  overkill?:     number;  // set only on fatal hits

  // Damage Taken — FFXIV only. Resolved (via abilityMap) names of every
  // buff active on the player at the moment this hit landed — FFLogs' own
  // ground truth for "was a mitigation actually up when this damage hit,"
  // strictly more reliable than inferring it from cast timing + an assumed
  // buff duration. Consumed by mitigation-detection.ts; not rendered in the
  // UI. Undefined on WCL events and on FF events fetched before this field
  // existed (older cached sample data).
  activeBuffNames?: string[];

  // Debuffs — carries which side of the on/off transition this event
  // represents, so error-detection.ts can reconstruct uptime windows
  // ("was this debuff active on the player at time T?").
  debuffStatus?: "applied" | "removed" | "stack" | "stackRemoved";
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
  // "Caster" only occurs for FFXIV magical-ranged DPS; WoW specs and FF
  // healers are always plain "Melee"/"Ranged".
  rangeType:  "Melee" | "Ranged" | "Caster";
  game:       "wow" | "ffxiv";   // NEW — used to pick the right color table

  // Pre-fetched event tabs (populated at import, read from memory thereafter)
  damageDone:   PlayerEvent[];
  damageTaken:  PlayerEvent[];
  healing:      PlayerEvent[];
  debuffs:      PlayerEvent[];
  casts:        PlayerEvent[];
};
