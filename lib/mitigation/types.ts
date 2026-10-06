// lib/mitigation/types.ts
//
// Game-neutral shapes for the mitigation analysis
// (docs/mitigation-redesign.md). A game supplies a catalog of these
// entries; lib/mitigation/analyze.ts does the rest.

export type MitigationKind =
  | "bossDebuff"  // on the enemy: Reprisal, Feint, Addle, Dismantle
  | "partyBuff"   // % reduction on the party: Troubadour, Kerachole, Holos
  | "shield"      // absorbs a fixed amount instead of a %
  | "personal"    // self or single-target %: Rampart, Third Eye, Aquaveil
  | "invuln"      // tank invulnerabilities (later phase; kept so a hit under one is recognized)
  | "limitBreak"; // tank LB: no cooldown to track

export type MitigationReach = "self" | "target" | "party";

// One status an entry can put on a hit. Some casts apply several (Holy
// Sheltron: Holy Sheltron 15% plus Knight's Resolve 15% for the first 4s),
// and the reductions multiply.
export type CatalogStatus = {
  id:        number;
  name:      string;
  physical:  number;   // fraction, 0.1 = 10%
  magical:   number;
  shield?:   boolean;  // absorbs instead of reducing
};

export type CatalogEntry = {
  key:        string;    // stable id, e.g. "reprisal"
  name:       string;    // the action's name
  jobs:       string[];  // job display names (lib/ffl-job-data.ts), e.g. "Dark Knight"
  actionIds:  number[];  // casts that start it
  statuses:   CatalogStatus[];
  kind:       MitigationKind;
  reach:      MitigationReach;
  durationMs: number;
  cooldownMs: number;    // 0 for GCD shields (always available, never "free")
  charges?:   number;    // default 1
  // Gated by a gauge or by another action (Sun Sign needs Neutral Sect,
  // Divine Caress follows Temperance): availability is approximate.
  gated?:     string;
  // True once the action and status IDs were seen in a real log.
  verified:   boolean;
};
