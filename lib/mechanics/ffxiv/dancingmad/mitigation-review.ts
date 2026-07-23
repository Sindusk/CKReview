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
// real timestamp instead.
//
// ── Future mechanics: shown, not omitted (2026-07-23) ─────────────────────
//
// A mechanic with no matching boss cast in this pull's enemyCasts (never
// reached before a wipe — the far more common case than a genuine sheet-
// name mismatch) is NOT omitted — the user wants every pull's table to
// show the fight in its entirety, so the row still renders (using the
// sheet's own static time as a display-only stand-in anchor, `reached:
// false`), just with every cell's checks forced to "future" instead of
// being evaluated against casts that can't possibly exist yet. The table
// component grays these rows out with a "-" mark per the user's request.
//
// ── Ambiguity: reused from mitigation-detection.ts, but per-ability now ───
//
// Sheet shorthand this app can't yet resolve to a real per-job ability
// (generic tank-table terms, unmapped jobs, "LB3", "✔", ...) makes
// `resolveRequiredAbilityNames` return null. A mechanic's slot can require
// MULTIPLE abilities at once (e.g. "Reprisal + Party Mit") — each is its
// OWN independently-evaluated check (2026-07-23, per the user's explicit
// ask: casting one but not the other should show a hit mark on one and a
// miss on the other, not collapse to one verdict for the whole cell). An
// unresolved sheet term only makes THAT ONE check a "?" — it no longer
// drags down an otherwise-resolvable sibling requirement in the same cell.

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
  expandRequiredAbilities,
  findCastNear,
  isDeadOrFreshlyRevived,
} from "./mitigation-detection";

export type MitigationCellStatus = "hit" | "missed" | "unresolved" | "dead" | "future";

// One independently-evaluated required ability within a cell. `abilityName`
// is the SPECIFIC real cast that satisfied it on "hit" (useful for an
// either-of group like Spreadlo's Succor/Deployment Tactics — shows which
// one was actually used), or the sheet's own term / joined candidate list
// otherwise (so "missed"/"unresolved" still shows what was expected).
export type MitigationReviewCheck = {
  status:      MitigationCellStatus;
  abilityName: string;
  carryOver:   boolean;  // true if this requirement carries over from an earlier mechanic (dimmed in the table, same convention as the Plan tab)
};

export type MitigationReviewCell = {
  slotLabel:      string;   // sheet column this cell came from (MT, White Mage, D1, ...)
  tentativeSlot:  boolean;  // true if the slot→player mapping itself was tentative (e.g. M1 vs M2)
  checks:         MitigationReviewCheck[];
};

export type MitigationReviewRow = {
  phaseTitle:      string;
  mech:            PlanMechanic;
  anchorMs:        number;
  // False when this mechanic never happened in this pull (no matching boss
  // cast found — see module header) — `anchorMs` is then just the sheet's
  // own static time, for display/sort order only, not a real moment to
  // check anything against. The table grays these rows out.
  reached:         boolean;
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
  const dead = isDeadOrFreshlyRevived(player, pull.deathEvents, anchorMs);
  const checks: MitigationReviewCheck[] = [];

  for (const entry of entries) {
    for (const rawAbility of entry.abilities) {
      // "Kitchen Sink" expands to 3 independent requirements (Rampart +
      // 40% + Short Mit) rather than being one OR-group — see
      // expandRequiredAbilities's header. A no-op for every other term.
      for (const ability of expandRequiredAbilities(rawAbility)) {
        const candidates = resolveRequiredAbilityNames(ability, player);

        if (!candidates) {
          checks.push({ status: "unresolved", abilityName: ability.name, carryOver: entry.carryOver });
          continue;
        }
        if (dead) {
          checks.push({ status: "dead", abilityName: candidates.join(" / "), carryOver: entry.carryOver });
          continue;
        }

        const matched = findCastNear(player, candidates, anchorMs);
        checks.push({
          status:      matched ? "hit" : "missed",
          abilityName: matched ?? candidates.join(" / "),
          carryOver:   entry.carryOver,
        });
      }
    }
  }

  return { slotLabel, tentativeSlot: tentative, checks };
}

// A mechanic that never happened this pull — no casts to check, so every
// required ability is just previewed (real name if resolvable, else the
// sheet's own term) with a "future" status rather than a real verdict.
function buildFutureCell(slotLabel: string, player: PlayerInfo, tentative: boolean, entries: PlanEntry[]): MitigationReviewCell {
  const checks: MitigationReviewCheck[] = [];

  for (const entry of entries) {
    for (const rawAbility of entry.abilities) {
      for (const ability of expandRequiredAbilities(rawAbility)) {
        const candidates = resolveRequiredAbilityNames(ability, player);
        checks.push({
          status:      "future",
          abilityName: candidates ? candidates.join(" / ") : ability.name,
          carryOver:   entry.carryOver,
        });
      }
    }
  }

  return { slotLabel, tentativeSlot: tentative, checks };
}

function buildRowsFrom(flat: FlatMechanic[], pull: Pull, plan: MitigationPlan, enemyCasts: { timestamp: number; abilityName: string }[]): MitigationReviewRow[] {
  const slots = resolveMitigationSlots(pull.players, plan);
  const slotByLabel = new Map(slots.map((s) => [s.slot, s]));

  const rows: MitigationReviewRow[] = [];

  for (const { phaseTitle, mech } of flat) {
    const bossAnchor = findBossCastAnchor(mech, enemyCasts);
    const reached = bossAnchor !== null;
    // mech.timeSeconds is always defined here — flattenPhaseMechanics/
    // flattenTankMechanics already filter out mechanics without one.
    const anchorMs = bossAnchor ?? mech.timeSeconds! * 1000;

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

      cellsByActorId.set(
        player.actorId,
        reached
          ? buildCell(slotLabel, player, tentative, entries, pull, anchorMs)
          : buildFutureCell(slotLabel, player, tentative, entries)
      );
    }

    if (cellsByActorId.size > 0) rows.push({ phaseTitle, mech, anchorMs, reached, cellsByActorId });
  }

  return rows;
}

/**
 * Builds the Mitigation Review table's rows for one pull: EVERY plan
 * mechanic across the whole fight, each with a per-player hit/missed/
 * unresolved/dead/future cell. Mechanics the pull actually reached are
 * boss-cast-matched and fully evaluated (`reached: true`); ones it never
 * reached still show up (`reached: false`, every cell "future") so the
 * table always previews the entire fight. Empty when there's no plan or no
 * FF roster to resolve slots against.
 */
export function buildMitigationReview(pull: Pull, plan: MitigationPlan | null): MitigationReviewRow[] {
  if (!plan || pull.game !== "ffxiv" || pull.players.length === 0) return [];
  const enemyCasts = pull.enemyCasts ?? [];

  const rows = [
    ...buildRowsFrom(flattenPhaseMechanics(plan), pull, plan, enemyCasts),
    ...buildRowsFrom(flattenTankMechanics(plan), pull, plan, enemyCasts),
  ];

  return rows.sort((a, b) => a.anchorMs - b.anchorMs);
}
