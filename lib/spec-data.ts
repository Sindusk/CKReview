// lib/spec-data.ts
//
// Maps every WoW retail specialization ID to its display name, class, role,
// and whether it's melee or ranged. Used by the RosterPanel to sort players
// into the correct column (Tank → Healer → Melee DPS → Ranged DPS).
//
// HOW TO EDIT:
//   - Each entry is a plain object — just change the values inline.
//   - `role` is one of: "Tank" | "Healer" | "DPS"
//   - `rangeType` is one of: "Melee" | "Ranged" (only meaningful when role === "DPS")
//   - Source: https://wowpedia.fandom.com/wiki/SpecializationID
//
// New specs added in future patches: add an entry with the new ID below.

export type SpecInfo = {
  name:      string;
  className: string;
  role:      "Tank" | "Healer" | "DPS";
  rangeType: "Melee" | "Ranged";
};

export const SPEC_DATA: Record<number, SpecInfo> = {

  // ── Death Knight ──────────────────────────────────────────────────────────
  250: { name: "Blood",        className: "Death Knight", role: "Tank",   rangeType: "Melee"  },
  251: { name: "Frost",        className: "Death Knight", role: "DPS",    rangeType: "Melee"  },
  252: { name: "Unholy",       className: "Death Knight", role: "DPS",    rangeType: "Melee"  },

  // ── Demon Hunter ─────────────────────────────────────────────────────────
  577: { name: "Havoc",        className: "Demon Hunter", role: "DPS",    rangeType: "Melee"  },
  581: { name: "Vengeance",    className: "Demon Hunter", role: "Tank",   rangeType: "Melee"  },
  // Devourer — 3rd DH spec, added in the Midnight expansion. Spec ID
  // confirmed via a real WCL CombatantInfo log (the only specID present
  // that didn't match an existing entry here, on a glaive-wielding,
  // Intellect-dominant-stat combatant — matching every published
  // description of Devourer as the Int-caster DH spec).
  1480: { name: "Devourer",   className: "Demon Hunter", role: "DPS",    rangeType: "Ranged" },

  // ── Druid ─────────────────────────────────────────────────────────────────
  102: { name: "Balance",      className: "Druid",        role: "DPS",    rangeType: "Ranged" },
  103: { name: "Feral",        className: "Druid",        role: "DPS",    rangeType: "Melee"  },
  104: { name: "Guardian",     className: "Druid",        role: "Tank",   rangeType: "Melee"  },
  105: { name: "Restoration",  className: "Druid",        role: "Healer", rangeType: "Ranged" },

  // ── Evoker ────────────────────────────────────────────────────────────────
  1467: { name: "Devastation",  className: "Evoker",      role: "DPS",    rangeType: "Ranged" },
  1468: { name: "Preservation", className: "Evoker",      role: "Healer", rangeType: "Ranged" },
  1473: { name: "Augmentation", className: "Evoker",      role: "DPS",    rangeType: "Ranged" },

  // ── Hunter ────────────────────────────────────────────────────────────────
  253: { name: "Beast Mastery", className: "Hunter",      role: "DPS",    rangeType: "Ranged" },
  254: { name: "Marksmanship",  className: "Hunter",      role: "DPS",    rangeType: "Ranged" },
  255: { name: "Survival",      className: "Hunter",      role: "DPS",    rangeType: "Melee"  },

  // ── Mage ──────────────────────────────────────────────────────────────────
  62: { name: "Arcane",        className: "Mage",         role: "DPS",    rangeType: "Ranged" },
  63: { name: "Fire",          className: "Mage",         role: "DPS",    rangeType: "Ranged" },
  64: { name: "Frost",         className: "Mage",         role: "DPS",    rangeType: "Ranged" },

  // ── Monk ──────────────────────────────────────────────────────────────────
  268: { name: "Brewmaster",   className: "Monk",         role: "Tank",   rangeType: "Melee"  },
  270: { name: "Mistweaver",   className: "Monk",         role: "Healer", rangeType: "Melee"  },
  269: { name: "Windwalker",   className: "Monk",         role: "DPS",    rangeType: "Melee"  },

  // ── Paladin ───────────────────────────────────────────────────────────────
  65: { name: "Holy",          className: "Paladin",      role: "Healer", rangeType: "Melee"  },
  66: { name: "Protection",    className: "Paladin",      role: "Tank",   rangeType: "Melee"  },
  70: { name: "Retribution",   className: "Paladin",      role: "DPS",    rangeType: "Melee"  },

  // ── Priest ────────────────────────────────────────────────────────────────
  256: { name: "Discipline",   className: "Priest",       role: "Healer", rangeType: "Ranged" },
  257: { name: "Holy",         className: "Priest",       role: "Healer", rangeType: "Ranged" },
  258: { name: "Shadow",       className: "Priest",       role: "DPS",    rangeType: "Ranged" },

  // ── Rogue ─────────────────────────────────────────────────────────────────
  259: { name: "Assassination", className: "Rogue",       role: "DPS",    rangeType: "Melee"  },
  260: { name: "Outlaw",        className: "Rogue",       role: "DPS",    rangeType: "Melee"  },
  261: { name: "Subtlety",      className: "Rogue",       role: "DPS",    rangeType: "Melee"  },

  // ── Shaman ────────────────────────────────────────────────────────────────
  262: { name: "Elemental",    className: "Shaman",       role: "DPS",    rangeType: "Ranged" },
  263: { name: "Enhancement",  className: "Shaman",       role: "DPS",    rangeType: "Melee"  },
  264: { name: "Restoration",  className: "Shaman",       role: "Healer", rangeType: "Ranged" },

  // ── Warlock ───────────────────────────────────────────────────────────────
  265: { name: "Affliction",   className: "Warlock",      role: "DPS",    rangeType: "Ranged" },
  266: { name: "Demonology",   className: "Warlock",      role: "DPS",    rangeType: "Ranged" },
  267: { name: "Destruction",  className: "Warlock",      role: "DPS",    rangeType: "Ranged" },

  // ── Warrior ───────────────────────────────────────────────────────────────
  71: { name: "Arms",          className: "Warrior",      role: "DPS",    rangeType: "Melee"  },
  72: { name: "Fury",          className: "Warrior",      role: "DPS",    rangeType: "Melee"  },
  73: { name: "Protection",    className: "Warrior",      role: "Tank",   rangeType: "Melee"  },
};

/**
 * Returns spec info for a given specId, or a sensible fallback if unknown.
 */
export function getSpecInfo(specId: number): SpecInfo {
  return SPEC_DATA[specId] ?? {
    name:      "Unknown",
    className: "Unknown",
    role:      "DPS",
    rangeType: "Melee",
  };
}

// ── Class-grouping priority (secondary sort) ────────────────────────────────
//
// Applied AFTER the Tank → Healer → Melee DPS → Ranged DPS grouping below —
// within each of those groups, players are further grouped by class in this
// order. Classes not listed (shouldn't happen — this covers all 13) fall
// back to the end.
const WOW_CLASS_SORT_PRIORITY = [
  "Death Knight", "Monk", "Paladin", "Warrior", "Rogue",
  "Demon Hunter", "Druid", "Evoker", "Hunter", "Shaman",
  "Priest", "Mage", "Warlock",
];

function normalizeClassKey(name: string): string {
  return name.replace(/\s+/g, "").toLowerCase();
}

const WOW_CLASS_PRIORITY_MAP = new Map(
  WOW_CLASS_SORT_PRIORITY.map((name, index) => [normalizeClassKey(name), index])
);

function getWowClassPriority(className: string): number {
  return WOW_CLASS_PRIORITY_MAP.get(normalizeClassKey(className)) ?? WOW_CLASS_SORT_PRIORITY.length;
}

/**
 * Returns the sort priority for the roster grid:
 *   Tank (0) → Healer (1) → Melee DPS (2) → Ranged DPS (3) as the primary
 *   grouping, then WOW_CLASS_SORT_PRIORITY as a secondary tiebreaker within
 *   each group. Encoded as roleOrder * 100 + classPriority so the existing
 *   `.sort((a, b) => getRosterSortOrder(a) - getRosterSortOrder(b))` call
 *   sites need no changes — classPriority (0–13) always fits well within one
 *   "roleOrder" bucket's span of 100.
 */
export function getRosterSortOrder(specId: number): number {
  const info = getSpecInfo(specId);
  const roleOrder =
    info.role === "Tank"                                  ? 0 :
    info.role === "Healer"                                ? 1 :
    info.role === "DPS" && info.rangeType === "Melee"     ? 2 :
                                                             3;
  return roleOrder * 100 + getWowClassPriority(info.className);
}
