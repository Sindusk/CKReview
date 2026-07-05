// lib/player-display.ts
//
// Single source of truth for how a player is displayed: name formatting,
// role/class colors, and spec/class/job icons. Consolidates the former
// class-colors.ts and player-icons.ts — colors and icons are both display
// concerns keyed off the same (game, class/spec) inputs, so splitting them
// across files just meant every add/remove touched multiple places.

import { getWowClassIcon, getWowSpecIcon } from "./spec-data";
import { getFFJobIcon } from "./ffl-job-data";

export type GameId = "wow" | "ffxiv";
export type Role = "Tank" | "Healer" | "DPS";

// ─── Name formatting ────────────────────────────────────────────────────────

// WoW class names are stored unspaced internally (WCLActor.subType comes
// back as e.g. "DeathKnight", "DemonHunter" — see log-transforms.ts) since
// that's the raw value from the API and other code (icon lookups, sort
// priority) keys off it consistently either way. This is purely a display
// concern: insert a space before each capital that follows a lowercase
// letter. FFXIV class/job names already have spaces (from ffl-job-data.ts's
// display names) and pass through unchanged — there's never an adjacent
// lowercase-then-uppercase pair with no space between them in those.
export function formatClassName(className: string): string {
  return className.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function formatSpecClass(specName: string, className: string): string {
  const formattedClass = formatClassName(className);
  if (!specName || specName === className || specName === formattedClass) {
    return formattedClass;
  }
  return `${specName} ${formattedClass}`;
}

// ─── Role color ─────────────────────────────────────────────────────────────
//
// Single mapping used anywhere a Tank/Healer/DPS badge or label needs a
// color — previously redefined identically (and independently) in
// RosterPanel, AnalysisPanel, and ReportDialog/ReportPedestal.

const ROLE_COLORS: Record<Role, string> = {
  Tank: "#60a5fa",
  Healer: "#4ade80",
  DPS: "#f87171",
};

export function getRoleColor(role: Role | string | undefined): string {
  if (!role) return "#aaa";
  return ROLE_COLORS[role as Role] ?? "#aaa";
}

// ─── Class / name color ─────────────────────────────────────────────────────
//
// WoW colors are keyed by class name (WCLActor.subType).
// FFXIV colors are keyed by job display name (see ffl-job-data.ts).

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

// ─── Icons ──────────────────────────────────────────────────────────────────
//
// The precise per-spec icon: WoW's spec icon (keyed by Blizzard spec ID), or
// FFXIV's job icon (job doubles as spec in FFXIV, so `specId` is ignored —
// FFXIV players always carry specId 0, which is meaningless there).
export function getPlayerSpecIcon(game: GameId, specId: number, className: string): string {
  if (game === "ffxiv") return getFFJobIcon(className);
  return getWowSpecIcon(specId);
}

// The coarser class-level icon (WoW class icon, or FFXIV job icon — same as
// getPlayerSpecIcon on the FFXIV side, since there's no separate class/spec
// there). Kept as a general-purpose fallback for any spot that only has a
// class-name string and no specId to work with.
export function getPlayerClassIcon(game: GameId, className: string): string {
  if (game === "ffxiv") return getFFJobIcon(className);
  return getWowClassIcon(className);
}
