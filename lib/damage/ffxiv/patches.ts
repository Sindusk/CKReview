// lib/damage/ffxiv/patches.ts
//
// Which FFXIV patch a log was played on, from the report's start time
// (Pull.reportStartedAt). Job rules change between patches, and a check
// that encodes one (what a burst window should hold) has to follow the
// log's patch, not today's. Checks valued from the log's own damage (GCD
// gaps, tincture placement, AoE against the single-target average) carry
// across patches without this (docs/dps-analysis.md).
//
// Global release dates, from xivanalysis src/data/PATCHES/patches.ts
// (GameEdition.GLOBAL). Korean and Chinese servers ran some patches later;
// logs from them would read as a later patch than they were played on.
//
//   Copyright (c) 2018 Saxon Landers & contributors
//   MIT License; full text in THIRD_PARTY_NOTICES.md.

import type { Pull } from "@/types/Pull";
import { ACTION_LEVELS } from "./action-levels";

const PATCHES: [patch: string, startsSec: number][] = [
  ["7.0", 1719565200],  // 28/06/24
  ["7.01", 1721113200], // 16/07/24
  ["7.05", 1722333600], // 30/07/24
  ["7.1", 1731398400],  // 12/11/24
  ["7.2", 1742889600],  // 25/03/25
  ["7.3", 1754380800],  // 05/08/25
  ["7.4", 1765872000],  // 16/12/25
  ["7.5", 1777363200],  // 28/04/26
];

// Older ultimates sync players below the cap: skills learned above it
// can't be pressed there (Black Mage's Amplifier, level 86, in TEA).
const SYNC_LEVELS: Record<string, number> = {
  "The Unending Coil of Bahamut": 70,
  "The Weapon's Refrain": 70,
  "The Epic of Alexander": 80,
  "Dragonsong's Reprise": 90,
  "The Omega Protocol": 90,
  // Endwalker savage and extreme fights (FFLogs fight names), played synced
  // (pQN92wtfWMqCR3zj: a solo Hephaistos kill, base substats 400, the
  // level-90 value). Only Hephaistos is checked against a log so far.
  ...Object.fromEntries([
    "Erichthonios", "Hippokampos", "Phoinix", "Hesperos", "Hesperos II",
    "Proto-Carbuncle", "Hegemone", "Agdistis", "Hephaistos", "Hephaistos II",
    "Kokytos", "Pandæmonium", "Themis", "Athena", "Pallas Athena",
    "Zodiark", "Hydaelyn", "Endsinger", "Barbariccia", "Rubicante", "Golbez", "Zeromus",
  ].map((n) => [n, 90])),
};

/**
 * The level the encounter syncs to, or undefined at the current cap. A
 * pull where anyone pressed an action learned above that level was played
 * unsynced (old content can be): judged at the cap.
 */
export function levelOf(pull: Pull): number | undefined {
  const level = SYNC_LEVELS[pull.name];
  if (level === undefined) return undefined;
  const above = pull.players.some((p) => p.casts.some((c) => (ACTION_LEVELS[c.abilityId] ?? 0) > level));
  return above ? undefined : level;
}

/** The patch live when the log started, or undefined when the date isn't known. */
export function patchOf(pull: Pull): string | undefined {
  const t = pull.reportStartedAt;
  if (!t) return undefined;
  let out: string | undefined;
  for (const [patch, starts] of PATCHES) if (t >= starts * 1000) out = patch;
  return out;
}
