// lib/ffl-job-data.ts
//
// Maps every FFXIV job ID (as used by FFLogs) to its display name, role,
// and whether it is melee or ranged. Used by the RosterPanel to sort players
// into the correct column (Tank → Healer → Melee DPS → Ranged DPS).
//
// HOW TO EDIT:
//   - Each entry is a plain object — just change the values inline.
//   - `role` is one of: "Tank" | "Healer" | "DPS"
//   - `rangeType` is one of: "Melee" | "Ranged"
//   - FFLogs uses numeric job IDs that correspond to FFXIV's internal ClassJob IDs.
//   - Source: https://xivapi.com/ClassJob (for ID reference)
//
// New jobs added in future patches: add an entry with the new ID below.
//
// NOTE: FFLogs reports the job on actor objects as a `subType` string (e.g. "WhiteMage")
// and as a numeric `gameID` in some contexts. The string-keyed lookup (FF_JOB_BY_NAME)
// is the primary path since FFLogs GraphQL returns subType as a PascalCase job name.

export type FFJobInfo = {
  name:      string;   // Display name, e.g. "White Mage"
  role:      "Tank" | "Healer" | "DPS";
  rangeType: "Melee" | "Ranged";
};

// ─── Lookup by FFLogs subType string (PascalCase) ────────────────────────────
//
// FFLogs actor.subType is a PascalCase job name string, e.g. "WhiteMage", "DarkKnight".
// This is the primary lookup used in ffl-transforms.ts.

export const FF_JOB_BY_NAME: Record<string, FFJobInfo> = {

  // ── Tanks ─────────────────────────────────────────────────────────────────
  Paladin:      { name: "Paladin",      role: "Tank",   rangeType: "Melee"  },
  Warrior:      { name: "Warrior",      role: "Tank",   rangeType: "Melee"  },
  DarkKnight:   { name: "Dark Knight",  role: "Tank",   rangeType: "Melee"  },
  Gunbreaker:   { name: "Gunbreaker",   role: "Tank",   rangeType: "Melee"  },

  // ── Healers ───────────────────────────────────────────────────────────────
  WhiteMage:    { name: "White Mage",   role: "Healer", rangeType: "Ranged" },
  Scholar:      { name: "Scholar",      role: "Healer", rangeType: "Ranged" },
  Astrologian:  { name: "Astrologian",  role: "Healer", rangeType: "Ranged" },
  Sage:         { name: "Sage",         role: "Healer", rangeType: "Ranged" },

  // ── Melee DPS ─────────────────────────────────────────────────────────────
  Monk:         { name: "Monk",         role: "DPS",    rangeType: "Melee"  },
  Dragoon:      { name: "Dragoon",      role: "DPS",    rangeType: "Melee"  },
  Ninja:        { name: "Ninja",        role: "DPS",    rangeType: "Melee"  },
  Samurai:      { name: "Samurai",      role: "DPS",    rangeType: "Melee"  },
  Reaper:       { name: "Reaper",       role: "DPS",    rangeType: "Melee"  },
  Viper:        { name: "Viper",        role: "DPS",    rangeType: "Melee"  },

  // ── Physical Ranged DPS ───────────────────────────────────────────────────
  Bard:         { name: "Bard",         role: "DPS",    rangeType: "Ranged" },
  Machinist:    { name: "Machinist",    role: "DPS",    rangeType: "Ranged" },
  Dancer:       { name: "Dancer",       role: "DPS",    rangeType: "Ranged" },

  // ── Magical Ranged DPS ────────────────────────────────────────────────────
  BlackMage:    { name: "Black Mage",   role: "DPS",    rangeType: "Ranged" },
  Summoner:     { name: "Summoner",     role: "DPS",    rangeType: "Ranged" },
  RedMage:      { name: "Red Mage",     role: "DPS",    rangeType: "Ranged" },
  Pictomancer:  { name: "Pictomancer",  role: "DPS",    rangeType: "Ranged" },
  BlueMage:     { name: "Blue Mage",    role: "DPS",    rangeType: "Ranged" },

  // ── Legacy / base classes (FFLogs may report these for old content) ────────
  Gladiator:    { name: "Gladiator",    role: "Tank",   rangeType: "Melee"  },
  Marauder:     { name: "Marauder",     role: "Tank",   rangeType: "Melee"  },
  Conjurer:     { name: "Conjurer",     role: "Healer", rangeType: "Ranged" },
  Pugilist:     { name: "Pugilist",     role: "DPS",    rangeType: "Melee"  },
  Lancer:       { name: "Lancer",       role: "DPS",    rangeType: "Melee"  },
  Rogue:        { name: "Rogue",        role: "DPS",    rangeType: "Melee"  },
  Arcanist:     { name: "Arcanist",     role: "DPS",    rangeType: "Ranged" },
  Thaumaturge:  { name: "Thaumaturge",  role: "DPS",    rangeType: "Ranged" },
  Archer:       { name: "Archer",       role: "DPS",    rangeType: "Ranged" },
};

// ─── Lookup by FFLogs numeric gameID ─────────────────────────────────────────
//
// FFLogs may also expose a numeric job/class ID on some event or actor fields.
// These correspond to FFXIV's internal ClassJob sheet IDs.
// Add additional IDs here as they are discovered from API responses.

export const FF_JOB_BY_ID: Record<number, FFJobInfo> = {
  // Tanks
  19: { name: "Paladin",      role: "Tank",   rangeType: "Melee"  },
  21: { name: "Warrior",      role: "Tank",   rangeType: "Melee"  },
  32: { name: "Dark Knight",  role: "Tank",   rangeType: "Melee"  },
  37: { name: "Gunbreaker",   role: "Tank",   rangeType: "Melee"  },

  // Healers
  24: { name: "White Mage",   role: "Healer", rangeType: "Ranged" },
  28: { name: "Scholar",      role: "Healer", rangeType: "Ranged" },
  33: { name: "Astrologian",  role: "Healer", rangeType: "Ranged" },
  40: { name: "Sage",         role: "Healer", rangeType: "Ranged" },

  // Melee DPS
  20: { name: "Monk",         role: "DPS",    rangeType: "Melee"  },
  22: { name: "Dragoon",      role: "DPS",    rangeType: "Melee"  },
  30: { name: "Ninja",        role: "DPS",    rangeType: "Melee"  },
  34: { name: "Samurai",      role: "DPS",    rangeType: "Melee"  },
  39: { name: "Reaper",       role: "DPS",    rangeType: "Melee"  },
  41: { name: "Viper",        role: "DPS",    rangeType: "Melee"  },

  // Physical Ranged DPS
  23: { name: "Bard",         role: "DPS",    rangeType: "Ranged" },
  31: { name: "Machinist",    role: "DPS",    rangeType: "Ranged" },
  38: { name: "Dancer",       role: "DPS",    rangeType: "Ranged" },

  // Magical Ranged DPS
  25: { name: "Black Mage",   role: "DPS",    rangeType: "Ranged" },
  27: { name: "Summoner",     role: "DPS",    rangeType: "Ranged" },
  35: { name: "Red Mage",     role: "DPS",    rangeType: "Ranged" },
  42: { name: "Pictomancer",  role: "DPS",    rangeType: "Ranged" },
  36: { name: "Blue Mage",    role: "DPS",    rangeType: "Ranged" },

  // Base classes
  1:  { name: "Gladiator",    role: "Tank",   rangeType: "Melee"  },
  3:  { name: "Marauder",     role: "Tank",   rangeType: "Melee"  },
  6:  { name: "Conjurer",     role: "Healer", rangeType: "Ranged" },
  2:  { name: "Pugilist",     role: "DPS",    rangeType: "Melee"  },
  4:  { name: "Lancer",       role: "DPS",    rangeType: "Melee"  },
  29: { name: "Rogue",        role: "DPS",    rangeType: "Melee"  },
  26: { name: "Arcanist",     role: "DPS",    rangeType: "Ranged" },
  7:  { name: "Thaumaturge",  role: "DPS",    rangeType: "Ranged" },
  5:  { name: "Archer",       role: "DPS",    rangeType: "Ranged" },
};

// ─── Public helpers ───────────────────────────────────────────────────────────

/**
 * Returns job info for a given FFLogs subType string (PascalCase).
 * Falls back gracefully if the job is unrecognised.
 */
export function getFFJobByName(subType: string): FFJobInfo {
  return FF_JOB_BY_NAME[subType] ?? {
    name:      subType || "Unknown",
    role:      "DPS",
    rangeType: "Melee",
  };
}

/**
 * Returns job info for a given numeric FFXIV ClassJob ID.
 * Falls back gracefully if the ID is unrecognised.
 */
export function getFFJobById(gameId: number): FFJobInfo {
  return FF_JOB_BY_ID[gameId] ?? {
    name:      `Unknown Job (${gameId})`,
    role:      "DPS",
    rangeType: "Melee",
  };
}

/**
 * Returns the roster sort priority for a given FFLogs subType string.
 * Tank (0) → Healer (1) → Melee DPS (2) → Ranged DPS (3)
 */
export function getFFRosterSortOrder(subType: string): number {
  const info = getFFJobByName(subType);
  if (info.role === "Tank")                                return 0;
  if (info.role === "Healer")                              return 1;
  if (info.role === "DPS" && info.rangeType === "Melee")   return 2;
  return 3;
}
