// lib/player-icons.ts
//
// Single entry point for "what icon represents this player" across the app,
// so RosterPanel/AnalysisPanel/ReportDialog/ReportPedestal don't each need
// to know about WoW vs FFXIV icon path differences.

import { getWowClassIcon, getWowSpecIcon } from "./spec-icons";
import { getFFJobIcon } from "./ffl-job-icons";

type IconGame = "wow" | "ffxiv";

/**
 * The precise per-spec icon: WoW's spec icon (keyed by Blizzard spec ID), or
 * FFXIV's job icon (job doubles as spec in FFXIV, so `specId` is ignored —
 * FFXIV players always carry specId 0, which is meaningless there).
 *
 * Used everywhere a real `specId` is available — currently just
 * RosterPanel/PlayerInfo, and anywhere carrying a PullError/DeathEvent's
 * `specId` (AnalysisPanel) or a PlayerReportStats' `specId` (ReportDialog,
 * ReportPedestal).
 */
export function getPlayerSpecIcon(game: IconGame, specId: number, className: string): string {
  if (game === "ffxiv") return getFFJobIcon(className);
  return getWowSpecIcon(specId);
}

/**
 * The coarser class-level icon (WoW class icon, or FFXIV job icon — same as
 * getPlayerSpecIcon on the FFXIV side, since there's no separate class/spec
 * there). Kept as a general-purpose fallback for any future spot that only
 * has a class-name string and no specId to work with.
 */
export function getPlayerClassIcon(game: IconGame, className: string): string {
  if (game === "ffxiv") return getFFJobIcon(className);
  return getWowClassIcon(className);
}
