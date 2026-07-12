// lib/mechanics/blackhole.ts
//
// Encounter-specific error detection for Black Hole ("Earthquake"), the
// tether conga-line mechanic in FFXIV's Dancing Mad (Kefka's Return)
// ultimate, beginning ~9:23 into the fight. Like mechanics/forsaken.ts it
// correlates multiple per-player event streams (assignment debuffs + a
// specific damage tick), which the declarative ERROR_RULES table can't
// express, so it lives as its own module called from log-transforms.ts.
//
// ── THE MECHANIC (reverse-engineered from real logs, confirmed against a
//    raid-plan cheatsheet) ────────────────────────────────────────────────
//
// At one instant ("the burst") every player simultaneously receives:
//
//   1005454  "Primordial Crust"    — all 8 players; its DURATION encodes the
//                                    player's line: 72s / 106s / 139s for
//                                    First / Second / Third in Line.
//   1003004  "First in Line"       — 3 players   (matches the 72s crusts)
//   1003005  "Second in Line"      — 3 players   (matches the 106s crusts)
//   1003006  "Third in Line"       — 2 players   (matches the 139s crusts)
//   1001604  "Accretion"           — exactly 2 players: one First in Line
//                                    and one Second in Line. Nominally 14s,
//                                    but it drops off early (observed ~3s on
//                                    one holder, ~11s on the other, in both
//                                    logs) — the cheatsheet even warns "the
//                                    Accretion debuff WILL fall off", so
//                                    holders must remember it. Detection
//                                    keys off the APPLICATION, never uptime.
//
// Then 4 sets of tethers spawn (each tether a separate sourceInstance of
// one NPC actor) and fire ability 47868 ("Nothingness") at their holder at
// 10 fixed "tether moments", locked to the burst with sub-100ms precision
// in every log seen:
//
//   set 1: m1  +24.3s   m2  +31.4s               (m2 fires TWO tethers)
//   set 2: m3  +54.8s   m4  +59.9s   m5  +65.0s  (3 concurrent tethers)
//   set 3: m6  +89.1s   m7  +94.1s   m8  +99.2s  (3 concurrent tethers)
//   set 4: m9 +122.1s   m10 ~+129s               (mirror of set 1; m10's
//                                                 exact offset never seen
//                                                 clean — every log wiped)
//
// Each player must be hit by Nothingness exactly 3 times, at consecutive
// moments, forming a conga line: one new player takes over a tether each
// moment as the previous holder finishes their 3rd hit (the 3rd hit does
// ~10-20x the damage of the first two). The entry order is fully
// determined by the debuffs:
//
//   entrant  role                          hit at moments
//   p1       First in Line, no Accretion   1, 3, 4     (skips m2)
//   p2       First in Line, no Accretion   2, 2, 3     (BOTH m2 tethers)
//   p3       First in Line + Accretion     3, 4, 5
//   p4       Second in Line, no Accretion  4, 5, 6
//   p5       Second in Line, no Accretion  5, 6, 7
//   p6       Second in Line + Accretion    6, 7, 8
//   p7       Third in Line                 7, 8, 9
//   p8       Third in Line                 8, 9, 10
//
// Which of the two same-role players is p1 vs p2 (likewise p4/p5, p7/p8)
// is positional strategy (clockwise from the boss), not knowable from
// debuffs — so each player is checked against the UNION of their role
// pair's moments. That union is exactly what both sample logs validate:
// e.g. the confirmed failure was a First-in-Line + Accretion player
// (assigned moments 3-5) taking a Nothingness hit at moment 1. An extra
// hit still gets game credit — 1005452 ("soaked once") / 1005453 ("soaked
// twice") was applied to the erroneous soaker just like a legitimate one —
// and the un-soaked hit resurfaces later as a doubled earthquake that
// wipes the raid. Flagging the out-of-schedule hit reports the root cause.
//
// ── WHAT THIS DOES NOT DO YET ───────────────────────────────────────────
//
// It doesn't flag MISSED tether hits (fewer than 3), nor verify the p1/p2
// ordering within a role pair, nor check the earthquake/Accretion soak
// positioning that follows — every failure observed so far roots in an
// out-of-schedule hit, which is what's detected here.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { PullError } from "@/types/PullError";
import type { DeathEvent } from "@/types/DeathEvent";

const FIRST_IN_LINE_ID  = 1003004;
const SECOND_IN_LINE_ID = 1003005;
const THIRD_IN_LINE_ID  = 1003006;
const ACCRETION_ID      = 1001604;
const NOTHINGNESS_ABILITY_ID = 47868; // the tether hit

export const BLACKHOLE_INCORRECT_TETHER_RULE_ID = "ffxiv-blackhole-soaked-incorrect-tether";

// The 10 tether moments, as offsets from the debuff burst (see the
// timetable above). Matched across two independent logs to within 100ms.
const TETHER_MOMENT_OFFSETS_MS: readonly number[] = [
  24300, 31400,                 // set 1
  54800, 59900, 65000,          // set 2
  89100, 94100, 99200,          // set 3
  122100, 129200,               // set 4 (m10 extrapolated — see above)
];

// A Nothingness hit further than this from every scheduled moment is left
// unclassified (and unflagged) rather than guessed at — moments are 5.1s
// apart at their closest, so ±3s can never straddle two of them.
const TETHER_MOMENT_TOLERANCE_MS = 3000;

// An Accretion application belongs to the burst if it lands within this
// window of it (observed: same millisecond).
const BURST_MATCH_WINDOW_MS = 2000;

// ── Wipe suppression ────────────────────────────────────────────────────
//
// When holders start dying mid-mechanic the surviving tethers retarget
// whoever is closest, producing out-of-schedule hits that are fallout, not
// the mistake itself (observed: a tether hitting a long-since-finished
// player seconds after three deaths). A moment is considered compromised —
// and exempt from flagging — once 2+ players died shortly before it. A
// single death doesn't suppress: one player dying elsewhere leaves the
// remaining tethers on their normal targets.
const WIPE_DEATHS_WINDOW_MS = 15000;
const WIPE_DEATHS_THRESHOLD = 2;

type LineNumber = 1 | 2 | 3;

type BlackHoleAssignment = {
  line:         LineNumber;
  hasAccretion: boolean;
  /** 1-based tether moments this player may legitimately be hit at (role-pair union — see module comment). */
  allowedMoments: ReadonlySet<number>;
  /** Human phrasing of the assignment, for error descriptions. */
  label:        string;
  assignedSpan: string;
};

const ROLE_TABLE: ReadonlyArray<{
  line: LineNumber; hasAccretion: boolean;
  moments: readonly number[]; label: string; assignedSpan: string;
}> = [
  { line: 1, hasAccretion: false, moments: [1, 2, 3, 4],  label: "First in Line",              assignedSpan: "tethers 1-4" },
  { line: 1, hasAccretion: true,  moments: [3, 4, 5],     label: "First in Line + Accretion",  assignedSpan: "tethers 3-5" },
  { line: 2, hasAccretion: false, moments: [4, 5, 6, 7],  label: "Second in Line",             assignedSpan: "tethers 4-7" },
  { line: 2, hasAccretion: true,  moments: [6, 7, 8],     label: "Second in Line + Accretion", assignedSpan: "tethers 6-8" },
  { line: 3, hasAccretion: false, moments: [7, 8, 9, 10], label: "Third in Line",              assignedSpan: "tethers 7-10" },
];

/** The burst instant: the earliest "(N) in Line" application in the pull, or undefined if Black Hole never happened. */
function findBurstTimestamp(players: PlayerInfo[]): number | undefined {
  let earliest: number | undefined;
  for (const player of players) {
    for (const d of player.debuffs) {
      if (d.debuffStatus !== "applied") continue;
      if (d.abilityId !== FIRST_IN_LINE_ID && d.abilityId !== SECOND_IN_LINE_ID && d.abilityId !== THIRD_IN_LINE_ID) continue;
      if (earliest === undefined || d.timestamp < earliest) earliest = d.timestamp;
    }
  }
  return earliest;
}

/**
 * Resolves every player's Black Hole assignment from the burst, or
 * undefined if the composition doesn't match the only pattern the schedule
 * is known for (3 First / 3 Second / 2 Third, with exactly one Accretion
 * on a First and one on a Second). An unrecognized composition means the
 * entry order can't be trusted, and guessing it would risk flagging clean
 * players — so detection bows out entirely instead.
 */
function buildAssignments(
  players: PlayerInfo[],
  burstTimestamp: number
): Map<number, BlackHoleAssignment> | undefined {
  const lineByPlayer = new Map<number, LineNumber>();
  const accretionPlayers = new Set<number>();

  for (const player of players) {
    for (const d of player.debuffs) {
      if (d.debuffStatus !== "applied") continue;
      if (Math.abs(d.timestamp - burstTimestamp) > BURST_MATCH_WINDOW_MS) continue;

      if (d.abilityId === FIRST_IN_LINE_ID)  lineByPlayer.set(player.actorId, 1);
      if (d.abilityId === SECOND_IN_LINE_ID) lineByPlayer.set(player.actorId, 2);
      if (d.abilityId === THIRD_IN_LINE_ID)  lineByPlayer.set(player.actorId, 3);
      if (d.abilityId === ACCRETION_ID)      accretionPlayers.add(player.actorId);
    }
  }

  const lineCounts = { 1: 0, 2: 0, 3: 0 };
  const accretionLines: LineNumber[] = [];
  for (const [actorId, line] of lineByPlayer) {
    lineCounts[line]++;
    if (accretionPlayers.has(actorId)) accretionLines.push(line);
  }

  const isKnownComposition =
    lineCounts[1] === 3 && lineCounts[2] === 3 && lineCounts[3] === 2 &&
    accretionLines.length === 2 && accretionLines.includes(1) && accretionLines.includes(2);
  if (!isKnownComposition) return undefined;

  const assignments = new Map<number, BlackHoleAssignment>();
  for (const [actorId, line] of lineByPlayer) {
    const hasAccretion = accretionPlayers.has(actorId);
    const role = ROLE_TABLE.find((r) => r.line === line && r.hasAccretion === hasAccretion);
    if (!role) return undefined; // Accretion on a Third in Line — no known schedule
    assignments.set(actorId, {
      line,
      hasAccretion,
      allowedMoments: new Set(role.moments),
      label:          role.label,
      assignedSpan:   role.assignedSpan,
    });
  }
  return assignments;
}

/** Maps a hit timestamp to its 1-based tether moment, or undefined when it's not near any scheduled moment. */
function momentIndexFor(hitTimestamp: number, burstTimestamp: number): number | undefined {
  const offset = hitTimestamp - burstTimestamp;
  for (let i = 0; i < TETHER_MOMENT_OFFSETS_MS.length; i++) {
    if (Math.abs(offset - TETHER_MOMENT_OFFSETS_MS[i]) <= TETHER_MOMENT_TOLERANCE_MS) return i + 1;
  }
  return undefined;
}

/**
 * Detects Black Hole tether failures: a Nothingness hit landing on a
 * player at a tether moment their debuff assignment doesn't cover.
 *
 * Returns [] immediately for any pull that never reaches Black Hole —
 * self-gating on the "(N) in Line" debuffs rather than an encounter-name
 * check, so it's safe to always call regardless of fight.
 */
export function detectBlackHoleErrors(
  players:     PlayerInfo[],
  deathEvents: DeathEvent[]
): PullError[] {
  const burstTimestamp = findBurstTimestamp(players);
  if (burstTimestamp === undefined) return [];

  const assignments = buildAssignments(players, burstTimestamp);
  if (assignments === undefined) return [];

  const deathTimestamps = deathEvents.map((d) => d.timestamp);
  const isCompromisedMoment = (momentTimestamp: number) =>
    deathTimestamps.filter(
      (t) => t <= momentTimestamp && momentTimestamp - t <= WIPE_DEATHS_WINDOW_MS
    ).length >= WIPE_DEATHS_THRESHOLD;

  const errors: PullError[] = [];

  for (const player of players) {
    const assignment = assignments.get(player.actorId);
    if (!assignment) continue;

    // One error per (player, moment) — a single tether firing can surface
    // as multiple damage records (and m2/m10 legitimately fire two tethers
    // at the same holder), but it's one mistake either way.
    const flaggedMoments = new Set<number>();

    for (const e of player.damageTaken) {
      if (e.abilityId !== NOTHINGNESS_ABILITY_ID) continue;

      const moment = momentIndexFor(e.timestamp, burstTimestamp);
      if (moment === undefined) continue;
      if (assignment.allowedMoments.has(moment)) continue;
      if (flaggedMoments.has(moment)) continue;
      if (isCompromisedMoment(e.timestamp)) continue;

      flaggedMoments.add(moment);
      errors.push({
        ruleId:      BLACKHOLE_INCORRECT_TETHER_RULE_ID,
        severity:    "Major",
        name:        "Soaked Incorrect Tether",
        description: `Was hit by Black Hole tether #${moment}, but their assignment (${assignment.label}) covers ${assignment.assignedSpan} — the stolen hit resurfaces later as a doubled earthquake.`,
        timestamp:   e.timestamp,
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
