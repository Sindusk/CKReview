// lib/mechanics/ffxiv/roles.ts
//
// Cross-mechanic FFXIV role detection — maps every player in a pull's roster
// onto the eight standard party slots (MT, OT, H1, H2, M1, M2, R1, R2).
// Shared by every Dancing Mad mechanic module that needs "who is the tank
// taking tankbuster hits" or "who is the second melee", and by the
// roster, Strategy and Mitigation views for slot order.
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
//       1. Opening auto-attack: whichever tank the boss's first "Attack"
//          (basic auto-attack) damage-taken event of the pull landed on.
//          Only one enemy is ever in combat at the very start of a pull —
//          add phases/boss copies (Dancing Mad's Chaos/Exdeath split) only
//          appear later — so this is naturally scoped to the real boss
//          without needing to name it. Cross-checked against real sample
//          data (2026-07): correct in 100% of pulls across three separate
//          reports (18/18, 16/16, 22/22), and 13/15 on a fourth where the
//          two misses were a pair of pulls with an identical, apparently
//          anomalous opening sequence (both tanks' own first hits arrived
//          within the same ~1s and in the same order — plausibly a
//          checkpoint/practice-tool resume rather than a real pull-in).
//          Total damage taken across the WHOLE pull (the previous rule)
//          was rejected by the user 2026-07-23: this fight's tank-swap-
//          heavy structure means both tanks end up with similar totals,
//          making the split effectively random pull to pull — the opening
//          auto-attack, being a single early snapshot before any swap, does
//          not have that problem.
//     Falls back to roster order (tentative) when no auto-attack was
//     logged. (A second, plan-based vote was removed with the Ikuya
//     mitigation sheet on 2026-10-06.)
//   - M1/M2: no per-job M1-vs-M2 convention exists in FFXIV the way MT/OT
//     does, so the roster alone can't split them. Resolved instead from the
//     raid's own WAVE CANNON conga order, per pull: the four DPS line up
//     M1-M2-R1-R2 west to east for the Wave Cannon towers (already encoded
//     in phase1.ts's DPS_CONGA_ORDER), so whichever melee's own Wave Cannon
//     hit position is further WEST is M1. Falls back to the old arbitrary,
//     tentative roster order when the pull never reaches Wave Cannon or
//     either melee has no logged hit position.
//
//     Confirmed 2026-08-10 against report PM8HY9nJ7kTR4tdQ, where the user
//     stated the ground truth directly ("Sonder in this report is Melee 1,
//     Sachi is Melee 2") and asked for exactly this — slots learned from the
//     assigned spread positions rather than guessed. That report's learned
//     Wave Cannon spots put Sonder Dreams (Reaper) at x=10179 and Sachi Gaen
//     (Samurai) at x=10546: Sonder west, so Sonder is M1. The same west-to-
//     east reading of the SUPPORT conga (H2-H1-OT-MT) independently
//     reproduces that report's MT/OT split — Sage 8238, White Mage 8809,
//     Dark Knight 9271, Paladin 9629, giving OT=Sayacissa Morsaelth and
//     MT=Kup'o Noodles, which is exactly what the (already 100%-validated)
//     opening-auto-attack signal resolves. That cross-check is why the conga
//     order is trusted here; MT/OT itself still comes from the auto-attack,
//     which needs no such derivation.
//
// Off-meta comps (no ranged, double caster, 3+ tanks, ...) degrade
// gracefully: leftover DPS spill into unfilled slots in stable order,
// always tentative, same fallback shape the old resolveMitigationSlots used.

import type { PlayerInfo } from "@/types/PlayerInfo";
import { getFFRosterSortOrder } from "@/lib/ffl-job-data";
import { findPlayerPosition } from "@/lib/mechanics/player-position";
export type FFRoleSlot = "MT" | "OT" | "H1" | "H2" | "M1" | "M2" | "R1" | "R2";

export const FF_ROLE_SLOTS: FFRoleSlot[] = ["MT", "OT", "H1", "H2", "M1", "M2", "R1", "R2"];

export type RoleAssignment = {
  slot:       FFRoleSlot;
  player:     PlayerInfo | null;
  tentative:  boolean;
  // How this slot was resolved — surfaced for the Strategy dialog / future
  // debugging, not load-bearing for detection.
  source:     "job" | "auto-attack" | "wave-cannon" | "order" | "none";
};

const HEALER_JOBS = ["White Mage", "Astrologian", "Scholar", "Sage"];

function sortKey(p: PlayerInfo): number {
  return getFFRosterSortOrder(p.className.replace(/ /g, ""));
}

// Whichever of the two tanks took the EARLIEST "Attack" (boss basic
// auto-attack) hit in the pull — see module header for why this beats
// total damage taken. Returns null if neither tank has a logged "Attack"
// hit at all (shouldn't happen for any real pull that reached combat).
function firstAutoAttackTarget(tanks: PlayerInfo[]): PlayerInfo | null {
  let earliest: { player: PlayerInfo; timestamp: number } | null = null;
  for (const t of tanks) {
    for (const e of t.damageTaken) {
      if (e.abilityName !== "Attack") continue;
      if (!earliest || e.timestamp < earliest.timestamp) earliest = { player: t, timestamp: e.timestamp };
    }
  }
  return earliest?.player ?? null;
}

/**
 * Resolves MT/OT for a two-tank roster: opening auto-attack first (which
 * tank the boss's first basic-attack hit landed on) — see module header for
 * the full reasoning and validation numbers.
 */
function resolveTanks(
  tanks: PlayerInfo[],
): { mt: PlayerInfo | null; ot: PlayerInfo | null; tentative: boolean; source: RoleAssignment["source"] } {
  if (tanks.length === 0) return { mt: null, ot: null, tentative: false, source: "none" };
  if (tanks.length === 1) return { mt: tanks[0], ot: null, tentative: false, source: "job" };

  const sorted = [...tanks].sort((a, b) => sortKey(a) - sortKey(b));
  const [t1, t2] = sorted;

  const mtByAutoAttack = firstAutoAttackTarget(sorted);
  if (mtByAutoAttack) {
    const ot = mtByAutoAttack === t1 ? t2 : t1;
    return { mt: mtByAutoAttack, ot, tentative: false, source: "auto-attack" };
  }

  // No auto-attack logged — can't disambiguate; keep roster order but mark
  // tentative.
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

// ── M1/M2/R1/R2 — melee from Wave Cannon order, ranged/caster by rangeType ─

// Wave Cannon (47784) — the tower volley whose west-to-east conga order the
// M1/M2 split is read from. See module header.
const WAVE_CANNON_ABILITY_ID = 47784;

// Bounds the position lookup around the volley for a melee who took no Wave
// Cannon hit of their own (they were never targeted, or died first). Wide
// enough to reach a sparse stream's nearest sample without drifting into the
// raid's next movement — the conga line is held for several seconds.
const WAVE_CANNON_ROLE_POSITION_WINDOW_MS = 3000;

/** The pull's first Wave Cannon hit on anyone — the volley's own instant. */
function firstWaveCannonTimestamp(players: PlayerInfo[]): number | null {
  let earliest: number | null = null;
  for (const p of players) {
    for (const e of p.damageTaken) {
      if (e.abilityId !== WAVE_CANNON_ABILITY_ID) continue;
      if (earliest === null || e.timestamp < earliest) earliest = e.timestamp;
    }
  }
  return earliest;
}

/**
 * Orders exactly two melee west-to-east by where they stood for the Wave
 * Cannon conga, so index 0 is M1. Each melee's own hit position is used when
 * they were targeted; otherwise their position at the volley is recovered
 * from every stream (see lib/mechanics/player-position.ts). Returns null when
 * either can't be placed — the caller then keeps the old tentative roster
 * order rather than guessing.
 */
function meleeByWaveCannonOrder(melee: PlayerInfo[], players: PlayerInfo[]): PlayerInfo[] | null {
  if (melee.length !== 2) return null;
  const volley = firstWaveCannonTimestamp(players);
  if (volley === null) return null;

  const xs = melee.map((player) => {
    const ownHit = player.damageTaken
      .filter((e) => e.abilityId === WAVE_CANNON_ABILITY_ID && e.x !== undefined)
      .sort((a, b) => a.timestamp - b.timestamp)[0];
    if (ownHit) return { player, x: ownHit.x! };
    const pos = findPlayerPosition(player, volley, { windowMs: WAVE_CANNON_ROLE_POSITION_WINDOW_MS });
    return { player, x: pos?.x ?? null };
  });

  if (xs.some((m) => m.x === null)) return null;
  if (xs[0].x === xs[1].x) return null; // dead tie — no order to read
  return xs.sort((a, b) => a.x! - b.x!).map((m) => m.player);
}

function resolveDps(dps: PlayerInfo[], players: PlayerInfo[]): RoleAssignment[] {
  const meleeByRoster = dps.filter((p) => p.rangeType === "Melee").sort((a, b) => sortKey(a) - sortKey(b));
  const meleeOrdered  = meleeByWaveCannonOrder(meleeByRoster, players);
  const melee   = meleeOrdered ?? meleeByRoster;
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

    // Certain when the category had exactly one candidate (a lone melee is
    // unambiguously M1; a lone ranged/caster unambiguously R1/R2), or — for
    // the melee pair — when the Wave Cannon conga order resolved them. Two
    // melee with no Wave Cannon data left stays arbitrary and tentative.
    const certain =
      preferred !== undefined &&
      (((slot === "M1" || slot === "M2") && (melee.length === 1 || meleeOrdered !== null)) ||
       (slot === "R1" && ranged.length === 1) ||
       (slot === "R2" && casters.length === 1));

    const source: RoleAssignment["source"] = !player
      ? "none"
      : certain
      ? ((slot === "M1" || slot === "M2") && meleeOrdered !== null ? "wave-cannon" : "job")
      : "order";
    return { slot, player, tentative: !certain, source } as RoleAssignment;
  });
}

/**
 * Maps every player in `players` onto the eight standard FFXIV party slots.
 */
export function detectFFRoles(players: PlayerInfo[]): RoleAssignment[] {
  const tanks   = players.filter((p) => p.role === "Tank");
  const healers = players.filter((p) => p.role === "Healer");
  const dps     = players.filter((p) => p.role === "DPS");

  const { mt, ot, tentative: tanksTentative, source: tanksSource } = resolveTanks(tanks);
  const [h1, h2] = resolveHealers(healers);
  const dpsSlots = resolveDps(dps, players);

  return [
    { slot: "MT", player: mt, tentative: tanksTentative, source: mt ? tanksSource : "none" },
    { slot: "OT", player: ot, tentative: tanksTentative, source: ot ? tanksSource : "none" },
    h1,
    h2,
    ...dpsSlots,
  ];
}
