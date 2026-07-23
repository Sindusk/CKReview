// lib/mechanics/ffxiv/roles.ts
//
// Cross-mechanic FFXIV role detection — maps every player in a pull's roster
// onto the eight standard party slots (MT, OT, H1, H2, M1, M2, R1, R2).
// Pulled out of the Mitigation system's roster-slot mapping (mitigation-
// plan.ts's resolveMitigationSlots, which now delegates here) so any other
// Dancing Mad mechanic module can resolve "who is the tank taking tankbuster
// hits" or "who is the second melee" without depending on the mitigation
// plan at all — a MitigationPlan is an OPTIONAL extra signal, not a
// requirement (mechanics with no plan loaded still get MT/OT/H1/H2/M1/M2/
// R1/R2, just with a lower-confidence tank split).
//
// Resolution strategy per slot, cheapest/most-certain signal first:
//   - H1/H2: healer JOB alone is enough (a party fields exactly one of each
//     of the two needed healer jobs), no ambiguity to resolve. Ordered by
//     FF_HEALER_PRIORITY (pure healer before shield healer) purely for a
//     stable, predictable H1/H2 label — not a claim about which healer
//     "matters more."
//   - R1/R2: same story — physical ranged and caster are different jobs,
//     so role+rangeType alone identifies each with certainty in a standard
//     comp. R1 = physical ranged, R2 = caster (standard party-slot naming).
//   - MT/OT: NOT resolvable from role alone (both tanks share role="Tank").
//     Two independent signals, applied in order:
//       1. Plan-based: if a MitigationPlan is supplied, tally which tank's
//          JOB the plan's "MT"/"OT" phase-mechanic columns name via a
//          job-gated ability qualifier ("Party Mit (GNB/DRK)"). Only trusted
//          when the two columns' votes name two DIFFERENT tank jobs with a
//          clear majority each — real sheets sometimes list both tank jobs'
//          mitigations under the same column (raid-wide mits are up
//          regardless of who's "MT" for threat purposes), which produces no
//          majority and safely falls through to signal 2 instead of a wrong
//          guess.
//       2. Damage-taken: the user's own heuristic — whichever tank has taken
//          more total damage across the pull is almost always the one
//          holding aggro, i.e. the Main Tank. Used whenever the plan signal
//          didn't resolve, and as the ONLY signal when no plan is loaded.
//     Falls back to roster order (tentative) only if both tanks somehow took
//     identical total damage (extremely unlikely in practice).
//   - M1/M2: genuinely unresolvable from the roster alone when two melee
//     DPS share... nothing distinguishing (no per-job M1-vs-M2 convention
//     exists in FFXIV the way MT/OT does) — stays tentative, arbitrary
//     stable order. Room to improve later (e.g. raid-marker position) but
//     no signal for it yet.
//
// Off-meta comps (no ranged, double caster, 3+ tanks, ...) degrade
// gracefully: leftover DPS spill into unfilled slots in stable order,
// always tentative, same fallback shape the old resolveMitigationSlots used.

import type { PlayerInfo } from "@/types/PlayerInfo";
import { getFFRosterSortOrder } from "@/lib/ffl-job-data";
// Type-only — avoids a runtime circular dependency with mitigation-plan.ts,
// which imports THIS module's detectFFRoles/TANK_JOB_ABBREVIATIONS.
import type { MitigationPlan } from "./dancingmad/mitigation-plan";

// Sheet/tank-table qualifiers name jobs by 3-letter abbreviation ("GNB",
// "WAR", ...) rather than PlayerInfo.className's display name. Lives here
// (not mitigation-plan.ts) since it's needed by both this module's plan-
// based MT/OT vote and mitigation-plan.ts's resolveTankPriorityColumn.
export const TANK_JOB_ABBREVIATIONS: Record<string, string> = {
  WAR: "Warrior",
  DRK: "Dark Knight",
  GNB: "Gunbreaker",
  PLD: "Paladin",
};

export type FFRoleSlot = "MT" | "OT" | "H1" | "H2" | "M1" | "M2" | "R1" | "R2";

export const FF_ROLE_SLOTS: FFRoleSlot[] = ["MT", "OT", "H1", "H2", "M1", "M2", "R1", "R2"];

export type RoleAssignment = {
  slot:       FFRoleSlot;
  player:     PlayerInfo | null;
  tentative:  boolean;
  // How this slot was resolved — surfaced for the Strategy dialog / future
  // debugging, not load-bearing for detection.
  source:     "job" | "plan" | "damage" | "order" | "none";
};

const HEALER_JOBS = ["White Mage", "Astrologian", "Scholar", "Sage"];

function sortKey(p: PlayerInfo): number {
  return getFFRosterSortOrder(p.className.replace(/ /g, ""));
}

// ── MT/OT — plan-based job vote ──────────────────────────────────────────

/**
 * Tallies which tank JOB the plan's "MT"/"OT" phase-mechanic columns name,
 * via job-gated ability qualifiers like "Party Mit (GNB/DRK)". Returns null
 * unless both columns resolve to a clear, DIFFERENT majority job — see
 * module header for why a mixed/ambiguous signal must fall through rather
 * than guess.
 */
function resolveTanksFromPlan(tanks: PlayerInfo[], plan: MitigationPlan): { mt: PlayerInfo; ot: PlayerInfo } | null {
  if (tanks.length !== 2) return null;

  const votes: Record<"MT" | "OT", Map<string, number>> = { MT: new Map(), OT: new Map() };

  for (const phase of plan.data.phases) {
    for (const mech of phase.mechanics) {
      if (!mech.assignments) continue;
      for (const col of ["MT", "OT"] as const) {
        const entries = mech.assignments[col];
        if (!entries) continue;
        for (const entry of entries) {
          for (const ability of entry.abilities) {
            const abbrevs = ability.qualifier?.match(/[A-Z]{3}/g);
            if (!abbrevs) continue;
            const matches = tanks.filter((t) => abbrevs.some((a) => TANK_JOB_ABBREVIATIONS[a] === t.className));
            if (matches.length !== 1) continue; // names both/neither of our tanks — not decisive
            const job = matches[0].className;
            votes[col].set(job, (votes[col].get(job) ?? 0) + 1);
          }
        }
      }
    }
  }

  const argmax = (m: Map<string, number>): string | null => {
    let best: string | null = null;
    let bestCount = 0;
    let tied = false;
    for (const [job, count] of m) {
      if (count > bestCount) { best = job; bestCount = count; tied = false; }
      else if (count === bestCount) tied = true;
    }
    return tied ? null : best;
  };

  const mtJob = argmax(votes.MT);
  const otJob = argmax(votes.OT);
  if (!mtJob || !otJob || mtJob === otJob) return null;

  const mt = tanks.find((t) => t.className === mtJob);
  const ot = tanks.find((t) => t.className === otJob);
  if (!mt || !ot) return null;
  return { mt, ot };
}

function totalDamageTaken(p: PlayerInfo): number {
  return p.damageTaken.reduce((sum, e) => sum + (e.amount ?? 0), 0);
}

/**
 * Resolves MT/OT for a two-tank roster: plan-based job vote first (if a
 * plan is supplied and decisive), then whichever tank took more total
 * damage across the pull (the user's own heuristic — the tank holding
 * aggro is almost always the one eating the boss's autos/tankbusters).
 */
function resolveTanks(
  tanks: PlayerInfo[],
  plan:  MitigationPlan | null | undefined
): { mt: PlayerInfo | null; ot: PlayerInfo | null; tentative: boolean; source: RoleAssignment["source"] } {
  if (tanks.length === 0) return { mt: null, ot: null, tentative: false, source: "none" };
  if (tanks.length === 1) return { mt: tanks[0], ot: null, tentative: false, source: "job" };

  const sorted = [...tanks].sort((a, b) => sortKey(a) - sortKey(b));
  const [t1, t2] = sorted;

  if (plan) {
    const fromPlan = resolveTanksFromPlan(sorted, plan);
    if (fromPlan) return { mt: fromPlan.mt, ot: fromPlan.ot, tentative: false, source: "plan" };
  }

  const d1 = totalDamageTaken(t1);
  const d2 = totalDamageTaken(t2);
  if (d1 !== d2) {
    return d1 > d2
      ? { mt: t1, ot: t2, tentative: false, source: "damage" }
      : { mt: t2, ot: t1, tentative: false, source: "damage" };
  }

  // Identical damage taken (no combat data, or a genuine tie) — can't
  // disambiguate; keep roster order but mark tentative.
  return { mt: t1, ot: t2, tentative: true, source: "order" };
}

// ── H1/H2 — job alone is decisive ────────────────────────────────────────

function resolveHealers(healers: PlayerInfo[]): [RoleAssignment, RoleAssignment] {
  const sorted = [...healers].sort((a, b) => sortKey(a) - sortKey(b));
  return [
    { slot: "H1", player: sorted[0] ?? null, tentative: false, source: sorted[0] ? "job" : "none" },
    { slot: "H2", player: sorted[1] ?? null, tentative: false, source: sorted[1] ? "job" : "none" },
  ];
}

// ── M1/M2/R1/R2 — melee unresolvable, ranged/caster decisive by rangeType ─

function resolveDps(dps: PlayerInfo[]): RoleAssignment[] {
  const melee   = dps.filter((p) => p.rangeType === "Melee").sort((a, b) => sortKey(a) - sortKey(b));
  const ranged  = dps.filter((p) => p.rangeType === "Ranged").sort((a, b) => sortKey(a) - sortKey(b));
  const casters = dps.filter((p) => p.rangeType === "Caster").sort((a, b) => sortKey(a) - sortKey(b));

  const pools: Record<"M1" | "M2" | "R1" | "R2", PlayerInfo[]> = {
    M1: melee, M2: melee.slice(1), R1: ranged, R2: casters,
  };

  const used = new Set<PlayerInfo>();
  const leftovers = () => dps.filter((p) => !used.has(p));

  return (["M1", "M2", "R1", "R2"] as const).map((slot) => {
    const preferred = pools[slot].find((p) => !used.has(p));
    const player = preferred ?? leftovers()[0] ?? null;
    if (player) used.add(player);

    // Certain only when the category had exactly one candidate: a lone
    // melee is unambiguously M1 (M2 empty); a lone ranged/caster is
    // unambiguously R1/R2. Two melee (the standard comp) leaves M1 vs M2
    // genuinely arbitrary — see module header.
    const certain =
      preferred !== undefined &&
      ((slot === "M1" && melee.length === 1) ||
       (slot === "R1" && ranged.length === 1) ||
       (slot === "R2" && casters.length === 1));

    return { slot, player, tentative: !certain, source: player ? (certain ? "job" : "order") : "none" } as RoleAssignment;
  });
}

/**
 * Maps every player in `players` onto the eight standard FFXIV party slots.
 * `plan` is an optional extra signal for MT/OT disambiguation (see module
 * header) — omit it (or pass null) to get a damage-taken-only split.
 */
export function detectFFRoles(players: PlayerInfo[], plan?: MitigationPlan | null): RoleAssignment[] {
  const tanks   = players.filter((p) => p.role === "Tank");
  const healers = players.filter((p) => p.role === "Healer");
  const dps     = players.filter((p) => p.role === "DPS");

  const { mt, ot, tentative: tanksTentative, source: tanksSource } = resolveTanks(tanks, plan);
  const [h1, h2] = resolveHealers(healers);
  const dpsSlots = resolveDps(dps);

  return [
    { slot: "MT", player: mt, tentative: tanksTentative, source: mt ? tanksSource : "none" },
    { slot: "OT", player: ot, tentative: tanksTentative, source: ot ? tanksSource : "none" },
    h1,
    h2,
    ...dpsSlots,
  ];
}
