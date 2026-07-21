// lib/mechanics/ffxiv/dancingmad/blackhole-strategy.ts
//
// Report-level strategy detection for the Black Hole tether conga (see
// blackhole.ts for the mechanic model). Where blackhole.ts's schedule check
// only knows the per-ROLE union of moments a player's debuff assignment
// covers (e.g. "First in Line" = {1,2,3,4}), this module figures out the
// raid's actual convention — which of the three documented cheatsheet
// strategies (sampledata/ff/BlackHoleDSA.png / BlackHoleSDA.png /
// BlackHoleDoubleTether.png) is being run — by scoring which shape best
// explains every pull's real tether hits.
//
// ── WHY THE THREE STRATEGIES COLLAPSE TO TWO SHAPES ─────────────────────
//
// All three cheatsheets agree on Second-in-Line, Third-in-Line, and the two
// Accretion lanes — DSA/SDA/DoubleTether only disagree on how the two
// non-Accretion First-in-Line players split moments 1-4 (m2 fires two
// concurrent tethers):
//
//   DSA / SDA ("Split"):  laneA {1,2,3}         laneB {2,3,4}
//                         (both players take one of the two m2 tethers)
//   Double Tether:        primary {1,3,4}       double {2,2,3}
//                         (one player skips m2 entirely, the other takes
//                          BOTH of its tethers)
//
// DSA and SDA are the SAME shape — they only differ in which physical job
// (DPS-labeled vs Support-labeled column on the cheatsheet) is assigned
// laneA vs laneB, which has no bearing on which moments are correct. So
// there are really only two detectable SHAPES ("split" / "double-tether"),
// and "dsa" vs "sda" is a cosmetic sub-label guessed from whichever player
// took laneA's role (DPS vs Healer) — best-effort, unconfirmed against the
// real naming convention, and never affects which moments get flagged.
//
// ── WHY LANE ASSIGNMENT IS RESOLVED PER-PULL, NOT PER-PLAYER-IDENTITY ────
//
// The first cut of this module tried to learn "this named player always
// takes lane A" by aggregating hit history per player name across the
// whole report (mirroring how terminate-kicks.ts/crystal-assignments.ts
// detect a stable WoW kick rotation). Real Dancing Mad data broke that
// assumption immediately: report rXBbzFV49hd1QPwf's 4 recognized pulls show
// the SAME player as First-in-Line twice, Second once, Third once — the
// game hands out the First/Second/Third-in-Line debuffs per pull (likely
// positionally, per the cheatsheets' "First Tether CW from Kefka" framing),
// not to a fixed roster slot. So there is no persistent "who" to learn —
// only a persistent SHAPE (split vs double-tether), which any two players
// sharing a line role follow that pull.
//
// Given that, this module only cross-pull-detects the SHAPE (summing each
// pull's own best-fit score for split vs double-tether — whichever
// hypothesis fits the real data better across every pull wins). Once a
// shape is known (auto-detected or user-forced), `detectMissedAssignedTether
// Errors` resolves each PULL'S OWN lane assignment independently, from that
// pull's own hits, the same way an experienced raid-lead would eyeball a
// single log: given the shape, whichever of the two candidates has more of
// slotA's hits is slotA. A total miss (0 hits at every one of a role's
// moments) still resolves cleanly by elimination — the other candidate's
// hits fully explain themselves, leaving the truant candidate assigned by
// default and flagged for every moment they never touched.

import type { Pull } from "@/types/Pull";
import type { PullError } from "@/types/PullError";
import {
  findBurstTimestamp,
  buildAssignments,
  momentIndexFor,
  isCompromisedMoment,
  NOTHINGNESS_ABILITY_ID,
  TETHER_MOMENT_OFFSETS_MS,
  type LineNumber,
  type BlackHoleAssignment,
} from "./blackhole";

export type BlackHoleStrategyId = "dsa" | "sda" | "double-tether";

export const BLACK_HOLE_STRATEGIES: ReadonlyArray<{ id: BlackHoleStrategyId; label: string }> = [
  { id: "dsa",           label: "DSA" },
  { id: "sda",           label: "SDA" },
  { id: "double-tether", label: "Double Tether" },
];

// A resolved lane in the exemplar pull: a named player and the exact
// ordered moments (with multiplicity — Double Tether's double lane hits m2
// twice) they were hit at that pull.
export type BlackHoleLane = {
  slotLabel: string;       // e.g. "First (Lane A)", "First (Accretion)"
  player:    string;
  className: string;
  role:      "Tank" | "Healer" | "DPS";
  moments:   readonly number[]; // 1-based, may repeat (Double Tether's double lane: [2,2,3])
};

export type BlackHoleStrategyResult = {
  shape:            "split" | "double-tether";
  // Cosmetic label only — see module comment. Always "double-tether" when
  // shape is "double-tether" (no DSA/SDA distinction applies there).
  strategyId:       BlackHoleStrategyId;
  pullsAnalyzed:    number;
  // Illustrative only — the lane assignment from the most recent pull with
  // a recognized composition. Shown in the Strategy dialog as "how it
  // looked last time", not a persistent per-player commitment (see module
  // comment on why identity isn't stable pull-to-pull).
  exemplarPullNumber: number;
  lanes:            BlackHoleLane[];
};

// ── Slot templates ──────────────────────────────────────────────────────

const SECOND_A: readonly number[] = [4, 5, 6];
const SECOND_B: readonly number[] = [5, 6, 7];
const SECOND_ACC: readonly number[] = [6, 7, 8];
const THIRD_A: readonly number[] = [7, 8, 9];
const THIRD_B: readonly number[] = [8, 9, 10];
const FIRST_ACC: readonly number[] = [3, 4, 5];

const SPLIT_FIRST_A: readonly number[] = [1, 2, 3];
const SPLIT_FIRST_B: readonly number[] = [2, 3, 4];
const DOUBLE_FIRST_PRIMARY: readonly number[] = [1, 3, 4];
const DOUBLE_FIRST_DOUBLE: readonly number[] = [2, 2, 3];

type NamedPlayer = { name: string; className: string; role: "Tank" | "Healer" | "DPS" };

/** Every Nothingness hit this specific player took THIS pull, bucketed by moment (compromised moments excluded). */
function hitCountsForPull(player: Pull["players"][number], burstTimestamp: number, deathEvents: Pull["deathEvents"]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const e of player.damageTaken) {
    if (e.abilityId !== NOTHINGNESS_ABILITY_ID) continue;
    const moment = momentIndexFor(e.timestamp, burstTimestamp);
    if (moment === undefined) continue;
    if (isCompromisedMoment(deathEvents, e.timestamp)) continue;
    counts.set(moment, (counts.get(moment) ?? 0) + 1);
  }
  return counts;
}

/**
 * Whether a player was already dead (and never showed a sign of being
 * alive again) at the given moment — same precedent as mitigation-
 * detection.ts's dead-before-mechanic exemption: a player who died earlier
 * in a wipe cascade can't be blamed for a tether that fired on a corpse.
 * Confirmed necessary in practice: report Bb4wQtHA6VNmkMFq pull 2 wiped
 * entirely by t=2207814, and without this check every one of the 3
 * remaining un-fired tether moments (8/9/10) flagged 2-3 players each —
 * pure wipe fallout, not a real mistake. Uses strict `<` for the death
 * lookup (not `<=`) so a death landing at the exact moment timestamp — that
 * mechanic killing them, plausibly BECAUSE they missed it — stays
 * checkable rather than exempted.
 */
function isDeadAtMoment(pull: Pull, playerName: string, momentTimestamp: number): boolean {
  const deaths = pull.deathEvents.filter((d) => d.player === playerName && d.timestamp < momentTimestamp);
  if (deaths.length === 0) return false;
  const lastDeath = Math.max(...deaths.map((d) => d.timestamp));

  const player = pull.players.find((p) => p.name === playerName);
  if (!player) return false;

  const showedSignOfLife = (events: { timestamp: number }[]) =>
    events.some((e) => e.timestamp > lastDeath && e.timestamp < momentTimestamp);

  return !(
    showedSignOfLife(player.casts) ||
    showedSignOfLife(player.damageTaken) ||
    showedSignOfLife(player.healing)
  );
}

function score(hitCounts: Map<number, number>, moments: readonly number[]): number {
  let total = 0;
  for (const m of moments) total += hitCounts.get(m) ?? 0;
  return total;
}

/** Assigns two candidates to two slots, picking whichever pairing scores higher (ties keep the given order). */
function bestPairing<T extends NamedPlayer>(
  players: [T, Map<number, number>][],
  slotAMoments: readonly number[],
  slotBMoments: readonly number[]
): { a: T; b: T; totalScore: number } {
  const [[p1, c1], [p2, c2]] = players;
  const straight = score(c1, slotAMoments) + score(c2, slotBMoments);
  const swapped  = score(c2, slotAMoments) + score(c1, slotBMoments);
  return straight >= swapped ? { a: p1, b: p2, totalScore: straight } : { a: p2, b: p1, totalScore: swapped };
}

type PullBHData = {
  pull: Pull;
  burstTimestamp: number;
  assignments: Map<number, BlackHoleAssignment>;
};

/** Every pull with a recognized Black Hole composition (see blackhole.ts's buildAssignments) — bows out per-pull rather than guessing when the roster/comp doesn't match the only known pattern. */
function resolvableBlackHolePulls(pulls: Pull[]): PullBHData[] {
  const out: PullBHData[] = [];
  for (const pull of pulls) {
    if (pull.game !== "ffxiv") continue;
    const burstTimestamp = findBurstTimestamp(pull.players);
    if (burstTimestamp === undefined) continue;
    const assignments = buildAssignments(pull.players, burstTimestamp);
    if (!assignments) continue;
    out.push({ pull, burstTimestamp, assignments });
  }
  return out;
}

/** Splits one pull's assigned players into the 8 role groups the schedule needs, or null if the shape doesn't match (shouldn't happen given buildAssignments' own 3/3/2 gate, but keeps this function total). */
function groupByRole(data: PullBHData): {
  firstNonAcc: [NamedPlayer, Map<number, number>][];
  secondNonAcc: [NamedPlayer, Map<number, number>][];
  thirdPlayers: [NamedPlayer, Map<number, number>][];
  // Guaranteed defined by the guard clause right before the return below —
  // both are only left undefined when the group counts are wrong, which
  // returns null instead.
  firstAcc: [NamedPlayer, Map<number, number>];
  secondAcc: [NamedPlayer, Map<number, number>];
} | null {
  const firstNonAcc: [NamedPlayer, Map<number, number>][] = [];
  const secondNonAcc: [NamedPlayer, Map<number, number>][] = [];
  const thirdPlayers: [NamedPlayer, Map<number, number>][] = [];
  let firstAcc: [NamedPlayer, Map<number, number>] | undefined;
  let secondAcc: [NamedPlayer, Map<number, number>] | undefined;

  for (const player of data.pull.players) {
    const assignment = data.assignments.get(player.actorId);
    if (!assignment) continue;
    const named: NamedPlayer = { name: player.name, className: player.className, role: player.role };
    const counts = hitCountsForPull(player, data.burstTimestamp, data.pull.deathEvents);
    const entry: [NamedPlayer, Map<number, number>] = [named, counts];

    if (assignment.line === 1) { if (assignment.hasAccretion) firstAcc = entry; else firstNonAcc.push(entry); }
    else if (assignment.line === 2) { if (assignment.hasAccretion) secondAcc = entry; else secondNonAcc.push(entry); }
    else thirdPlayers.push(entry);
  }

  if (firstNonAcc.length !== 2 || secondNonAcc.length !== 2 || thirdPlayers.length !== 2 || !firstAcc || !secondAcc) return null;
  return { firstNonAcc, secondNonAcc, thirdPlayers, firstAcc, secondAcc };
}

/**
 * Resolves the Black Hole strategy from a report's pulls: which shape
 * (split vs double-tether) best explains every recognized pull's real
 * tether hits, summed across all of them, plus an illustrative lane list
 * from the most recent resolvable pull. Returns null when no pull has a
 * recognized Black Hole composition yet.
 *
 * `forcedId` skips the shape comparison — used when the user overrides the
 * auto-detected strategy in the Strategy dialog.
 */
export function detectBlackHoleStrategy(pulls: Pull[], forcedId?: BlackHoleStrategyId | null): BlackHoleStrategyResult | null {
  const resolvable = resolvableBlackHolePulls(pulls);
  if (resolvable.length === 0) return null;

  let splitScoreTotal = 0;
  let doubleScoreTotal = 0;
  let exemplar: { pullNumber: number; groups: NonNullable<ReturnType<typeof groupByRole>> } | undefined;

  for (const data of resolvable) {
    const groups = groupByRole(data);
    if (!groups) continue;

    splitScoreTotal  += bestPairing(groups.firstNonAcc, SPLIT_FIRST_A, SPLIT_FIRST_B).totalScore;
    doubleScoreTotal += bestPairing(groups.firstNonAcc, DOUBLE_FIRST_PRIMARY, DOUBLE_FIRST_DOUBLE).totalScore;

    // Keep the latest resolvable pull as the illustrative exemplar.
    exemplar = { pullNumber: data.pull.pullNumber, groups };
  }

  if (!exemplar) return null;

  let shape: "split" | "double-tether";
  if (forcedId === "double-tether") shape = "double-tether";
  else if (forcedId === "dsa" || forcedId === "sda") shape = "split";
  else shape = doubleScoreTotal > splitScoreTotal ? "double-tether" : "split";

  const { groups } = exemplar;
  const secondPairing = bestPairing(groups.secondNonAcc, SECOND_A, SECOND_B);
  const thirdPairing  = bestPairing(groups.thirdPlayers, THIRD_A, THIRD_B);

  const lanes: BlackHoleLane[] = [];
  function addLane(slotLabel: string, p: NamedPlayer, moments: readonly number[]) {
    lanes.push({ slotLabel, player: p.name, className: p.className, role: p.role, moments });
  }

  let strategyId: BlackHoleStrategyId;
  if (shape === "double-tether") {
    strategyId = "double-tether";
    const pairing = bestPairing(groups.firstNonAcc, DOUBLE_FIRST_PRIMARY, DOUBLE_FIRST_DOUBLE);
    addLane("First (Skip m2)", pairing.a, DOUBLE_FIRST_PRIMARY);
    addLane("First (Double m2)", pairing.b, DOUBLE_FIRST_DOUBLE);
  } else {
    const pairing = bestPairing(groups.firstNonAcc, SPLIT_FIRST_A, SPLIT_FIRST_B);
    // Cosmetic DSA/SDA guess: whichever lane-A player is a Healer reads as
    // "SDA" (Support-DPS-Accretion), otherwise "DSA" — unconfirmed against
    // the real cheatsheet naming, doesn't affect moment assignment.
    strategyId = forcedId === "dsa" || forcedId === "sda" ? forcedId : (pairing.a.role === "Healer" ? "sda" : "dsa");
    addLane("First (Lane A)", pairing.a, SPLIT_FIRST_A);
    addLane("First (Lane B)", pairing.b, SPLIT_FIRST_B);
  }
  addLane("First (Accretion)", groups.firstAcc[0], FIRST_ACC);
  addLane("Second (Lane A)", secondPairing.a, SECOND_A);
  addLane("Second (Lane B)", secondPairing.b, SECOND_B);
  addLane("Second (Accretion)", groups.secondAcc[0], SECOND_ACC);
  addLane("Third (Lane A)", thirdPairing.a, THIRD_A);
  addLane("Third (Lane B)", thirdPairing.b, THIRD_B);

  return { shape, strategyId, pullsAnalyzed: resolvable.length, exemplarPullNumber: exemplar.pullNumber, lanes };
}

function slotLabelFor(moments: readonly number[]): string {
  return moments === DOUBLE_FIRST_PRIMARY ? "First (Skip m2)"
    : moments === DOUBLE_FIRST_DOUBLE ? "First (Double m2)"
    : moments === SPLIT_FIRST_A ? "First (Lane A)"
    : moments === SPLIT_FIRST_B ? "First (Lane B)"
    : moments === FIRST_ACC ? "First (Accretion)"
    : moments === SECOND_A ? "Second (Lane A)"
    : moments === SECOND_B ? "Second (Lane B)"
    : moments === SECOND_ACC ? "Second (Accretion)"
    : moments === THIRD_A ? "Third (Lane A)"
    : "Third (Lane B)";
}

/**
 * Resolves THIS pull's own lane assignment independently from its own hit
 * data (see module comment on why lane identity isn't reused across
 * pulls), under the given strategy's SHAPE. Shared by both per-pull checks
 * below. Returns null when this pull never reaches Black Hole or its
 * composition is unrecognized.
 */
function resolvePullSchedule(
  pull: Pull,
  shape: "split" | "double-tether"
): { burstTimestamp: number; schedule: [NamedPlayer, readonly number[]][] } | null {
  const burstTimestamp = findBurstTimestamp(pull.players);
  if (burstTimestamp === undefined) return null;
  const assignments = buildAssignments(pull.players, burstTimestamp);
  if (!assignments) return null;

  const groups = groupByRole({ pull, burstTimestamp, assignments });
  if (!groups) return null;

  const schedule: [NamedPlayer, readonly number[]][] = [];
  if (shape === "double-tether") {
    const pairing = bestPairing(groups.firstNonAcc, DOUBLE_FIRST_PRIMARY, DOUBLE_FIRST_DOUBLE);
    schedule.push([pairing.a, DOUBLE_FIRST_PRIMARY], [pairing.b, DOUBLE_FIRST_DOUBLE]);
  } else {
    const pairing = bestPairing(groups.firstNonAcc, SPLIT_FIRST_A, SPLIT_FIRST_B);
    schedule.push([pairing.a, SPLIT_FIRST_A], [pairing.b, SPLIT_FIRST_B]);
  }
  schedule.push([groups.firstAcc[0], FIRST_ACC]);
  const secondPairing = bestPairing(groups.secondNonAcc, SECOND_A, SECOND_B);
  schedule.push([secondPairing.a, SECOND_A], [secondPairing.b, SECOND_B]);
  schedule.push([groups.secondAcc[0], SECOND_ACC]);
  const thirdPairing = bestPairing(groups.thirdPlayers, THIRD_A, THIRD_B);
  schedule.push([thirdPairing.a, THIRD_A], [thirdPairing.b, THIRD_B]);

  return { burstTimestamp, schedule };
}

export const BLACKHOLE_MISSED_ASSIGNED_RULE_ID = "ffxiv-blackhole-missed-assigned-tether";

/**
 * Per-pull check driven by a resolved BlackHoleStrategyResult's SHAPE (not
 * its exemplar lanes — see module comment on why lane identity isn't
 * reused across pulls). Independently resolves THIS pull's own lane
 * assignment from its own hit data, then confirms each assigned player was
 * actually hit at each of their moments (counting multiplicity — Double
 * Tether's double lane needs TWO hits at moment 2). A missing hit means
 * either they were out of position when their tether fired, or it
 * retargeted onto someone else entirely — either way the root cause is the
 * assigned player not being where the mechanic needed them, which is what
 * gets flagged (replacing the old raid-wide "hit multiple players" error,
 * which named only who got hit, never who should have been).
 *
 * Returns [] when this pull never reaches Black Hole, its composition is
 * unrecognized, or `strategy` is null (no cross-pull data yet to know the
 * shape — see detectBlackHoleStrategy).
 */
export function detectMissedAssignedTetherErrors(pull: Pull, strategy: BlackHoleStrategyResult | null): PullError[] {
  if (!strategy) return [];
  if (pull.game !== "ffxiv") return [];

  const resolved = resolvePullSchedule(pull, strategy.shape);
  if (!resolved) return [];
  const { burstTimestamp, schedule } = resolved;

  const errors: PullError[] = [];

  for (const [named, moments] of schedule) {
    const player = pull.players.find((p) => p.name === named.name);
    if (!player) continue;

    const hitCounts = hitCountsForPull(player, burstTimestamp, pull.deathEvents);
    const required = new Map<number, number>();
    for (const m of moments) required.set(m, (required.get(m) ?? 0) + 1);
    const slotLabel = slotLabelFor(moments);

    for (const [moment, needed] of required) {
      if ((hitCounts.get(moment) ?? 0) >= needed) continue;

      const momentTimestamp = burstTimestamp + TETHER_MOMENT_OFFSETS_MS[moment - 1];
      if (isCompromisedMoment(pull.deathEvents, momentTimestamp)) continue;
      if (isDeadAtMoment(pull, player.name, momentTimestamp)) continue;

      errors.push({
        ruleId:      BLACKHOLE_MISSED_ASSIGNED_RULE_ID,
        severity:    "Major",
        name:        "Missed Assigned Black Hole Tether",
        description: `Assigned tether #${moment} (${slotLabel}) but wasn't hit by it — either out of position when it fired, or it retargeted onto someone else, straining the raid's soak schedule.`,
        timestamp:   momentTimestamp,
        player:      player.name,
        class:       player.className,
        specId:      player.specId,
        role:        player.role,
        abilityId:   NOTHINGNESS_ABILITY_ID,
        abilityName: "Nothingness",
      });
    }
  }

  return errors.sort((a, b) => a.timestamp - b.timestamp);
}

export const BLACKHOLE_CLIPPED_BY_NEIGHBOR_RULE_ID = "ffxiv-blackhole-clipped-by-neighboring-tether";

/**
 * Per-pull check, the mirror image of detectMissedAssignedTetherErrors: a
 * player hit MORE times at a moment than their own resolved schedule
 * requires. Confirmed 2026-07 (report VtdBqhLQkWJXMvDg pull 7, Black Hole
 * moment 6/7): the Sage was correctly soaking their own East tether
 * (instance 8) but ALSO took two extra hits from the Dancer's neighboring
 * North tether (instance 7) at the same moments — the Sage hadn't moved
 * their own black hole clockwise to its intercardinal position, so the
 * Dancer's tether (angling toward the eastern black hole) clipped them.
 * That extra hit isn't "outside their role band" (moments 6/7 ARE within
 * the Sage's own valid window — it's their own tether firing on schedule),
 * so blackhole.ts's role-band `soaked-incorrect-tether` check can't catch
 * it, and detectMissedAssignedTetherErrors only checks for a SHORTFALL —
 * hence a dedicated check for the opposite direction (a surplus).
 *
 * Root-caused to the CLIPPED player, not the tether that reached them —
 * per the user's correction, the mistake is standing too close to your own
 * black hole's origin, not the neighbor's positioning.
 *
 * ISOLATION GATE — required after regression-testing against every sample
 * report turned up widespread false positives: a moment only gets flagged
 * when the surplus is the ONLY discrepancy anywhere in the pull's resolved
 * schedule at that moment (no other player short OR over their own count).
 * Two real fallout patterns needed this: (1) a mass wipe-cascade retarget
 * (report VtdBqhLQkWJXMvDg pull 16 — one player's earlier death left 5
 * OTHER players simultaneously surplus at the same moment as the tethers
 * redistributed; isCompromisedMoment's 2+-death threshold didn't catch it
 * since only ONE distinct player had died) and (2) a paired retarget (pull
 * 20 — one player's shortfall (missed-assigned-tether, already flagged)
 * exactly matches another player's surplus at the same moment; that's one
 * mistake surfacing from two sides, not two). Neither is the isolated
 * "stood too close to my own origin" case pull 7 actually is, where the
 * clipped player is the ONLY anomaly at that moment and everyone else's
 * count is exactly right.
 */
export function detectClippedByNeighborTetherErrors(pull: Pull, strategy: BlackHoleStrategyResult | null): PullError[] {
  if (!strategy) return [];
  if (pull.game !== "ffxiv") return [];

  const resolved = resolvePullSchedule(pull, strategy.shape);
  if (!resolved) return [];
  const { burstTimestamp, schedule } = resolved;

  // Every (player, moment) discrepancy across the whole resolved schedule,
  // bucketed by moment — the isolation gate needs to see the full picture
  // before deciding any single surplus is safe to flag.
  type Discrepancy = { player: Pull["players"][number]; slotLabel: string; kind: "missing" | "extra" };
  const byMoment = new Map<number, Discrepancy[]>();

  for (const [named, moments] of schedule) {
    const player = pull.players.find((p) => p.name === named.name);
    if (!player) continue;

    const hitCounts = hitCountsForPull(player, burstTimestamp, pull.deathEvents);
    const required = new Map<number, number>();
    for (const m of moments) required.set(m, (required.get(m) ?? 0) + 1);
    const slotLabel = slotLabelFor(moments);

    const allMoments = new Set([...required.keys(), ...hitCounts.keys()]);
    for (const moment of allMoments) {
      const needed = required.get(moment) ?? 0;
      const actual = hitCounts.get(moment) ?? 0;
      if (actual === needed) continue;
      const arr = byMoment.get(moment) ?? [];
      arr.push({ player, slotLabel, kind: actual > needed ? "extra" : "missing" });
      byMoment.set(moment, arr);
    }
  }

  const errors: PullError[] = [];

  for (const [moment, discrepancies] of byMoment) {
    if (discrepancies.length !== 1) continue; // not isolated — mass retarget or a paired miss elsewhere
    const [only] = discrepancies;
    if (only.kind !== "extra") continue; // the lone discrepancy is a miss, handled by detectMissedAssignedTetherErrors

    const momentTimestamp = burstTimestamp + TETHER_MOMENT_OFFSETS_MS[moment - 1];
    if (isCompromisedMoment(pull.deathEvents, momentTimestamp)) continue;
    if (isDeadAtMoment(pull, only.player.name, momentTimestamp)) continue;

    errors.push({
      ruleId:      BLACKHOLE_CLIPPED_BY_NEIGHBOR_RULE_ID,
      severity:    "Major",
      name:        "Clipped By Neighboring Black Hole",
      description: `Took an extra hit from a neighboring Black Hole tether at #${moment} on top of their own (${only.slotLabel}) — standing too close to their own black hole's origin let the adjacent tether's beam reach them.`,
      timestamp:   momentTimestamp,
      player:      only.player.name,
      class:       only.player.className,
      specId:      only.player.specId,
      role:        only.player.role,
      abilityId:   NOTHINGNESS_ABILITY_ID,
      abilityName: "Nothingness",
    });
  }

  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
