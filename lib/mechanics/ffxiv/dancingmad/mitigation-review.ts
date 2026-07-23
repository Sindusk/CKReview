// lib/mechanics/ffxiv/dancingmad/mitigation-review.ts
//
// "Mitigation Review" — a per-pull audit table (MitigationDialog's new
// "Review" tab): for every mitigation-plan mechanic that actually happened
// in a specific pull, which assigned player hit their cast and which
// didn't. Distinct from mitigation-detection.ts's `detectMitigationErrors`:
// that one is death-grounded (only flags a mechanic the raid actually died
// to, as a PullError) and skips tentative slot assignments entirely to
// avoid false blame. This module is a REVIEW tool, not a blame tool — it
// shows every mechanic regardless of whether anyone died, and still shows
// tentative-slot cells (labeled as such) so the user can eyeball and
// correct them via VOD, per the "prototype first, refine together" pattern
// used throughout this app's mechanic detection (see the ff-role-detection
// memory / mechanic-detection-workflow notes).
//
// ── Anchoring: boss-cast-matched (the accurate, expensive option) ─────────
//
// The sheet only gives an idealized static time per mechanic ("10:37"),
// which drifts from a real pull's actual timing (extra deaths/downtime
// earlier push everything later). Rather than using that static time
// directly, or anchoring only on nearby deaths (accurate but only available
// for mechanics that actually killed someone — most don't), this module
// searches the boss's own persisted `enemyCasts` (types/Pull.ts, populated
// in log-transforms.ts's transformFFightToPull) for a cast whose ability
// name matches the mechanic and whose timestamp falls within
// MECHANIC_MATCH_WINDOW_MS of the sheet's static time, and anchors on THAT
// real timestamp instead. A mechanic with no matching boss cast in this
// pull's enemyCasts (never reached before a wipe, or a sheet-name mismatch)
// is simply omitted from the table — no anchor means no real time to check
// casts against, and "never happened this pull" is exactly what an omitted
// row should communicate.
//
// ── Ambiguity: reused verbatim from mitigation-detection.ts ───────────────
//
// Sheet shorthand this app can't yet resolve to a real per-job ability
// (generic tank-table terms, unmapped jobs, "LB3", "✔", ...) makes
// `resolveRequiredAbilityNames` return null. Per the user's explicit
// instruction, ANY unresolved ability in a cell's requirement makes the
// WHOLE cell "unresolved" (a "?") rather than guessing or partially
// evaluating — safer than reporting "hit" on a half-understood requirement.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { Pull } from "@/types/Pull";
import {
  type MitigationPlan,
  type PlanMechanic,
  type PlanEntry,
  resolveMitigationSlots,
  resolveTankPriorityColumn,
} from "./mitigation-plan";
import {
  type FlatMechanic,
  MECHANIC_MATCH_WINDOW_MS,
  flattenPhaseMechanics,
  flattenTankMechanics,
  mechanicMatchesAbilityName,
  resolveRequiredAbilityNames,
  hasCastNear,
  isDeadOrFreshlyRevived,
} from "./mitigation-detection";

export type MitigationCellStatus = "hit" | "missed" | "unresolved" | "dead";

export type MitigationReviewCell = {
  status:        MitigationCellStatus;
  slotLabel:      string;    // sheet column this cell came from (MT, White Mage, D1, ...)
  abilityNames:   string[];  // resolved required ability name(s) — empty when unresolved
  tentativeSlot:  boolean;   // true if the slot→player mapping itself was tentative (e.g. M1 vs M2)
};

export type MitigationReviewRow = {
  phaseTitle:      string;
  mech:            PlanMechanic;
  anchorMs:        number;
  cellsByActorId:  Map<number, MitigationReviewCell>;
};

/**
 * Finds the boss's own real cast time for `mech` in this pull — the
 * nearest `enemyCasts` entry (within MECHANIC_MATCH_WINDOW_MS) whose
 * ability name matches the mechanic. Returns null if no such cast exists
 * (mechanic never reached this pull, or its sheet name doesn't match any
 * logged boss ability).
 */
function findBossCastAnchor(mech: PlanMechanic, enemyCasts: { timestamp: number; abilityName: string }[]): number | null {
  if (mech.timeSeconds === undefined) return null;
  const sheetMs = mech.timeSeconds * 1000;

  let best: { ts: number; diff: number } | null = null;
  for (const cast of enemyCasts) {
    if (!mechanicMatchesAbilityName(mech, cast.abilityName)) continue;
    const diff = Math.abs(cast.timestamp - sheetMs);
    if (diff > MECHANIC_MATCH_WINDOW_MS) continue;
    if (!best || diff < best.diff) best = { ts: cast.timestamp, diff };
  }
  return best?.ts ?? null;
}

function buildCell(
  slotLabel: string,
  player:    PlayerInfo,
  tentative: boolean,
  entries:   PlanEntry[],
  pull:      Pull,
  anchorMs:  number
): MitigationReviewCell {
  // One "requirement group" per ability slot in this cell — satisfied if
  // the player cast ANY name within its own group (mirrors
  // mitigation-detection.ts's either-of handling, e.g. Spreadlo's
  // Succor/Deployment Tactics pair).
  const requiredGroups: string[][] = [];
  let unresolved = false;

  for (const entry of entries) {
    for (const ability of entry.abilities) {
      const candidates = resolveRequiredAbilityNames(ability, player);
      if (!candidates) { unresolved = true; continue; }
      requiredGroups.push(candidates);
    }
  }

  const abilityNames = requiredGroups.map((g) => g[0]);

  if (unresolved || requiredGroups.length === 0) {
    return { status: "unresolved", slotLabel, abilityNames, tentativeSlot: tentative };
  }
  if (isDeadOrFreshlyRevived(player, pull.deathEvents, anchorMs)) {
    return { status: "dead", slotLabel, abilityNames, tentativeSlot: tentative };
  }

  const allSatisfied = requiredGroups.every((group) => hasCastNear(player, group, anchorMs));
  return { status: allSatisfied ? "hit" : "missed", slotLabel, abilityNames, tentativeSlot: tentative };
}

function buildRowsFrom(flat: FlatMechanic[], pull: Pull, plan: MitigationPlan, enemyCasts: { timestamp: number; abilityName: string }[]): MitigationReviewRow[] {
  const slots = resolveMitigationSlots(pull.players, plan);
  const slotByLabel = new Map(slots.map((s) => [s.slot, s]));

  const rows: MitigationReviewRow[] = [];

  for (const { phaseTitle, mech } of flat) {
    const anchorMs = findBossCastAnchor(mech, enemyCasts);
    if (anchorMs === null) continue; // never happened this pull — omit the row entirely

    const cellsByActorId = new Map<number, MitigationReviewCell>();
    for (const [slotLabel, entries] of Object.entries(mech.assignments ?? {})) {
      if (slotLabel === "Extras") continue;

      const partySlot = slotByLabel.get(slotLabel);
      let player: PlayerInfo | null;
      let tentative = false;
      if (partySlot) {
        player = partySlot.player;
        tentative = partySlot.tentative;
      } else {
        player = resolveTankPriorityColumn(slotLabel, pull.players);
      }
      if (!player) continue;

      cellsByActorId.set(player.actorId, buildCell(slotLabel, player, tentative, entries, pull, anchorMs));
    }

    if (cellsByActorId.size > 0) rows.push({ phaseTitle, mech, anchorMs, cellsByActorId });
  }

  return rows;
}

/**
 * Builds the Mitigation Review table's rows for one pull: every plan
 * mechanic that actually happened (boss-cast-matched — see module header),
 * with a per-player hit/missed/unresolved/dead cell. Empty when there's no
 * plan, no FF roster, or no persisted enemyCasts to anchor against (older
 * cached sample data fetched before this field existed).
 */
export function buildMitigationReview(pull: Pull, plan: MitigationPlan | null): MitigationReviewRow[] {
  if (!plan || pull.game !== "ffxiv" || pull.players.length === 0) return [];
  const enemyCasts = pull.enemyCasts ?? [];
  if (enemyCasts.length === 0) return [];

  const rows = [
    ...buildRowsFrom(flattenPhaseMechanics(plan), pull, plan, enemyCasts),
    ...buildRowsFrom(flattenTankMechanics(plan), pull, plan, enemyCasts),
  ];

  return rows.sort((a, b) => a.anchorMs - b.anchorMs);
}
