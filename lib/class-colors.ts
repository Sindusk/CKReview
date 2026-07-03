// lib/class-colors.ts
//
// Single source of truth for name colors in the Roster and Analysis panels.
// WoW colors are keyed by class name (WCLActor.subType).
// FFXIV colors are keyed by job display name (see ffl-job-data.ts).

export type GameId = "wow" | "ffxiv";

export const WOW_CLASS_COLORS: Record<string, string> = {
  "Death Knight": "#C41E3A",
  "Demon Hunter": "#A330C9",
  Druid: "#FF7C0A",
  Evoker: "#33937F",
  Hunter: "#AAD372",
  Mage: "#3FC7EB",
  Monk: "#00FF98",
  Paladin: "#F48CBA",
  Priest: "#FFFFFF",
  Rogue: "#FFF468",
  Shaman: "#0070DD",
  Warlock: "#8788EE",
  Warrior: "#C69B3A",
};

// Approximate FFLogs-style job colors — adjust to taste, these are just
// distinct and reasonably on-brand per job.
export const FF_JOB_COLORS: Record<string, string> = {
  // Tanks
  Paladin: "#A8D2E6",
  Warrior: "#C41F3B",
  "Dark Knight": "#D21F3C",
  Gunbreaker: "#796D30",
  // Healers
  "White Mage": "#FFF0DC",
  Scholar: "#8657FF",
  Astrologian: "#FFE00A",
  Sage: "#80A0F0",
  // Melee DPS
  Monk: "#D69C00",
  Dragoon: "#4164CD",
  Ninja: "#AF1964",
  Samurai: "#E46D04",
  Reaper: "#965A90",
  Viper: "#63783D",
  // Physical Ranged DPS
  Bard: "#91BA5E",
  Machinist: "#6EE1D6",
  Dancer: "#E2B0AF",
  // Magical Ranged DPS
  "Black Mage": "#A579D6",
  Summoner: "#2D9B78",
  "Red Mage": "#E87B7B",
  Pictomancer: "#FF99DD",
  "Blue Mage": "#2A9DC7",
};

// Strips whitespace and lowercases — lets us match names regardless of
// spacing/casing differences between data sources (e.g. WCL's actor.subType
// sometimes comes through as "DeathKnight"/"DemonHunter" with no space,
// while our lookup tables above use the display form "Death Knight").
function normalizeKey(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

function buildNormalizedTable(table: Record<string, string>): Map<string, string> {
  const map = new Map<string, string>();
  for (const [key, color] of Object.entries(table)) {
    map.set(normalizeKey(key), color);
  }
  return map;
}

const WOW_CLASS_COLORS_NORMALIZED = buildNormalizedTable(WOW_CLASS_COLORS);
const FF_JOB_COLORS_NORMALIZED = buildNormalizedTable(FF_JOB_COLORS);

export function getClassColor(game: GameId | undefined, name: string): string {
  const table = game === "ffxiv" ? FF_JOB_COLORS_NORMALIZED : WOW_CLASS_COLORS_NORMALIZED;
  return table.get(normalizeKey(name)) ?? "#aaa";
}