// lib/mechanics/ffxiv/dancingmad/mitigation-plan.ts
//
// Mitigation plans for Dancing Mad Ultimate — published raid-wide mitigation
// timelines (who casts what, at which mechanic) imported from community
// spreadsheets. Currently one plan: the Ikuya sheet, fetched/normalized by
// scripts/fetch-mitigation-sheet.js into mitigation-plans/ikuya.json (a
// committed copy — sampledata/ is gitignored).
//
// Consumed by components/StrategyDialog.tsx to display the expectation per
// player over the fight timeline, and (planned) by a "Mitigation" Raid-error
// detection: a death to expected damage is a mitigation-plan failure, not the
// victim's error, so it will surface as a Raid-severity error with a
// "Mitigation" rule category rather than a player-attributed one.
//
// Slot → player mapping: the sheet's columns are party SLOTS, not names.
//   - Healer columns name exact jobs (White Mage / Astrologian / Scholar /
//     Sage) — a party fields two of the four, so absent-job columns are
//     dropped and present ones resolve unambiguously.
//   - D1/D2 are melee DPS, D3 physical ranged, D4 caster (standard FFXIV
//     party-list convention). When a category has more members than its
//     slots can distinguish (two melee: which is D1?), the mapping is
//     TENTATIVE — display-worthy, but detection must not blame an individual
//     on the strength of a tentative slot.
//   - MT/OT can't be told apart from the roster at all; both tanks are
//     mapped in roster-sort order and marked tentative.
//   - "Extras" (opt-in extra party mit like Magic Barrier/Dismantle) is
//     intentionally ignored per product decision — personal/extra mits are
//     out of scope for the mitigation system.

import type { PlayerInfo } from "@/types/PlayerInfo";
import { getFFRosterSortOrder } from "@/lib/ffl-job-data";
import ikuyaData from "./mitigation-plans/ikuya.json";

// ─── Plan data shapes (mirror scripts/fetch-mitigation-sheet.js output) ─────

export type PlanAbility = {
  name:       string;
  qualifier?: string;   // e.g. "WAR/PLD", "Chaos", "Close"
  footnotes?: number[];
};

// One line of an assignment cell: either fresh casts for this mechanic or a
// carry-over (cast at an earlier mechanic, still active here).
export type PlanEntry = {
  raw:        string;
  carryOver:  boolean;
  abilities:  PlanAbility[];
  qualifier?: string;   // tank tab target-order lines ("First Hit")
};

export type PlanMechanic = {
  name:              string;
  footnotes?:        number[];
  note?:             string;             // prose rows (Accretions, Forsaken preamble)
  time?:             string;             // fight-absolute "mm:ss"
  timeSeconds?:      number;
  timeOpenEnded?:    boolean;            // "12:13+"
  phaseTime?:        string;             // phase-relative "m:ss"
  phaseTimeSeconds?: number;
  assignments?:      Record<string, PlanEntry[]>;  // keyed by column label
};

export type PlanNotes = {
  general:   string[];
  footnotes: Record<string, string>;
};

export type PlanPhase = {
  gid:       number;
  title:     string;
  jobs:      string[];        // column labels: MT, OT, White Mage, ..., D4, Extras
  mechanics: PlanMechanic[];
  notes:     PlanNotes | null;
};

export type PlanTankSection = {
  title:     string | null;
  columns:   string[];        // MT/OT, or invuln priority orders in P3/P5
  mechanics: PlanMechanic[];
  notes:     PlanNotes | null;
};

export type MitigationPlanData = {
  sheetId:   string;
  sheetUrl:  string;
  fetchedAt: string;
  phases:    PlanPhase[];
  tank:      { gid: number; sections: PlanTankSection[] } | null;
};

export type MitigationPlan = {
  id:    string;
  label: string;
  data:  MitigationPlanData;
};

export const MITIGATION_PLANS: MitigationPlan[] = [
  { id: "ikuya", label: "Ikuya", data: ikuyaData as MitigationPlanData },
];

export function getMitigationPlan(id: string | null): MitigationPlan | null {
  return MITIGATION_PLANS.find((p) => p.id === id) ?? null;
}

// ─── Slot → player resolution ────────────────────────────────────────────────

export type SlotAssignment = {
  slot:      string;             // sheet column label
  player:    PlayerInfo | null;  // null = no roster member fits this slot
  tentative: boolean;            // true when the roster can't disambiguate
};

// Column labels the party-slot resolver understands. "Extras" is excluded
// deliberately (see header).
const HEALER_SLOTS = ["White Mage", "Astrologian", "Scholar", "Sage"];

/**
 * Maps the sheet's party-slot columns onto the loaded report's roster.
 * Returns one SlotAssignment per RESOLVABLE column in sheet order —
 * healer columns for jobs the party doesn't field are omitted entirely
 * (the sheet lists all four healer jobs; a party has two).
 */
// Tank-table priority columns (mitigation-plans/ikuya.json's `tank`
// section — P3/P5) name jobs by their 3-letter abbreviation, not the
// PlayerInfo.className display name.
const TANK_JOB_ABBREVIATIONS: Record<string, string> = {
  WAR: "Warrior",
  DRK: "Dark Knight",
  GNB: "Gunbreaker",
  PLD: "Paladin",
};

/**
 * Resolves a tank-table priority-order column label — e.g.
 * `"Chaos (WAR > DRK > GNB > PLD)"`, or P5's bare `"WAR > DRK > GNB >
 * PLD"` — to whichever tank in the roster ranks highest in the listed
 * order. Unlike MT/OT (which the roster alone can't disambiguate — see
 * resolveMitigationSlots), this IS deterministic: the sheet's priority
 * list literally means "whichever of these jobs the party brings, on this
 * side," so the first listed job present among the roster's tanks is
 * unambiguously correct, not a guess. Returns null for anything that
 * isn't a priority-order column (plain "MT"/"OT" — use
 * resolveMitigationSlots for those) or when none of the listed jobs are
 * present among the roster's tanks.
 */
export function resolveTankPriorityColumn(label: string, players: PlayerInfo[]): PlayerInfo | null {
  const abbrevs = label.match(/[A-Z]{3}/g);
  if (!abbrevs || abbrevs.length < 2) return null; // not a priority-order column

  const tanks = players.filter((p) => p.role === "Tank");
  for (const abbr of abbrevs) {
    const className = TANK_JOB_ABBREVIATIONS[abbr];
    if (!className) continue;
    const found = tanks.find((p) => p.className === className);
    if (found) return found;
  }
  return null;
}

export function resolveMitigationSlots(players: PlayerInfo[]): SlotAssignment[] {
  // getFFRosterSortOrder expects FFLogs subType keys ("DarkKnight");
  // PlayerInfo.className is the display name ("Dark Knight").
  const sortKey = (p: PlayerInfo) => getFFRosterSortOrder(p.className.replace(/ /g, ""));
  const roster = [...players].sort((a, b) => sortKey(a) - sortKey(b));

  const tanks   = roster.filter((p) => p.role === "Tank");
  const dps     = roster.filter((p) => p.role === "DPS");
  const melee   = dps.filter((p) => p.rangeType === "Melee");
  const ranged  = dps.filter((p) => p.rangeType === "Ranged");
  const casters = dps.filter((p) => p.rangeType === "Caster");

  const out: SlotAssignment[] = [];

  out.push({ slot: "MT", player: tanks[0] ?? null, tentative: tanks.length > 1 });
  out.push({ slot: "OT", player: tanks[1] ?? null, tentative: tanks.length > 1 });

  for (const job of HEALER_SLOTS) {
    const match = roster.find((p) => p.className === job);
    if (match) out.push({ slot: job, player: match, tentative: false });
  }

  // D1/D2 melee, D3 physical ranged, D4 caster. Off-meta comps (double
  // caster, no ranged, ...) spill leftover DPS into the unfilled slots in
  // order, always tentatively.
  const dSlotPools: PlayerInfo[][] = [melee, melee.slice(1), ranged, casters];
  const used = new Set<PlayerInfo>();
  const leftovers = () => dps.filter((p) => !used.has(p));

  ["D1", "D2", "D3", "D4"].forEach((slot, i) => {
    const preferred = dSlotPools[i].find((p) => !used.has(p));
    const fallback  = leftovers()[0];
    const player    = preferred ?? fallback ?? null;
    if (player) used.add(player);
    // A slot is certain only when its category had exactly one candidate
    // (e.g. one caster → D4). The standard two-melee comp leaves both D1
    // and D2 ambiguous — the roster alone can't say which melee is which.
    const certain =
      preferred !== undefined &&
      ((i === 0 && melee.length === 1) ||
       (i === 2 && ranged.length === 1) ||
       (i === 3 && casters.length === 1));
    out.push({ slot, player, tentative: !certain });
  });

  return out;
}
