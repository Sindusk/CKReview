// lib/mechanics/forsaken.ts
//
// Encounter-specific error detection for Forsaken, the tower-soak mechanic
// in FFXIV's Dancing Mad (Kefka's Return) ultimate. Unlike the declarative
// rules in error-rules.ts — which only ever need "one ability ID, maybe
// gated by a single debuff" — this mechanic requires correlating TWO
// separate per-player event streams (a stack-counter debuff and a specific
// damage tick) to determine whether a player actually stood in their
// assigned tower. ERROR_RULES/error-detection.ts has no way to express
// that kind of correlation, so this lives as its own module and is called
// directly from log-transforms.ts for FFXIV pulls, rather than being
// folded into the generic rule table.
//
// Nothing in here touches the network — it operates purely on the
// already-fetched PlayerInfo[] (specifically each player's `debuffs` and
// `damageTaken` arrays), same inputs error-detection.ts uses.
//
// ── HOW THE DETECTION WORKS (confirmed against real Forsaken logs) ─────────
//
// Every player who participates in Forsaken carries ability 1005083
// ("Spell's Trouble"), a stack counter that starts at some N stacks (4 in
// every log seen so far) at the start of Forsaken, and loses exactly one
// stack every time THEY resolve a tower — ending in a final full removal
// once it hits 0. Each of these personal stack-loss events (whether a
// partial "stackRemoved" or the final "removed") is checked independently,
// per player, against ability 47806 ("Path of Light") — the actual "you
// are standing in the tower, soaking a stack" damage tick (fires with a 0
// or non-zero amount either way). On a clean resolution, Path of Light
// lands on that player roughly 550-650ms before their own stack-loss
// timestamp. If a player's stack drops with no Path of Light hit on them
// shortly before it, they weren't actually standing in the tower for that
// resolution.
//
// Deliberately NOT modeled as "did this player's whole team resolve
// together" — a delayed-but-real resolution (a player who soaks late, but
// did soak) still shows a genuine Path of Light hit right before their own
// delayed stack-loss, and correctly should NOT be flagged. Cross-player
// clustering was tried first and rejected: it produces false confidence
// about "the team's shared tower moment" that doesn't hold up once a real
// pull's timing gets messy near a mistake, and the per-player check alone
// already correctly distinguishes "resolved late but for real" from
// "never resolved at all" on real logs (validated against a known-good and
// a known-bad pull).
//
// A separate, later pass assigns each error a human-readable "tower #N"
// label based on team identity (see the "Tower labeling" section below) —
// it has no bearing on detection itself, so it can't cause a false
// negative or positive, only get the display number wrong if it's ever
// wrong at all.
//
// ── PHASE 2: WRONG-TOWER-POSITION DETECTION (see bottom of file) ────────────
//
// Beyond "did you soak at all", each tower's two soakers must hold two
// DIFFERENT assignment debuffs (1005084/1005085/1005086 — the rotating
// per-player mechanic assignments). Confirmed across all 64 clean tower
// soaks in four real logs: every clean tower pairs two different debuffs,
// and the one observed positioning wipe (two players swapping towers) shows
// up as one tower with two 1005086 holders and the other with two 1005085
// holders. Which of the two same-debuff holders is the one actually out of
// position is attributed geometrically — see the Phase-2 section below.
//
// ── WHAT THIS DOES NOT DO YET ───────────────────────────────────────────────
//
// It does not verify the follow-up bait placements (47808/47809/47810 —
// the stack/single aoes planted at each soaker's position and detonated at
// the next resolution), or whether those aoes hit the wrong number of
// people. Those are downstream consequences of the tower errors already
// detected here, so modeling them would mostly re-flag the same mistakes.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { PullError } from "@/types/PullError";

const SPELLS_TROUBLE_ABILITY_ID = 1005083; // "Spell's Trouble" stack counter
const PATH_OF_LIGHT_ABILITY_ID  = 47806;   // "Path of Light" — the tower-soak damage tick

// Path of Light's associated damage event typically lands ~550-650ms
// BEFORE the paired stack-loss timestamp — but occasionally the specific
// event that survives FFLogs' damage-dedup (see the onlyLanded fix in
// fetchFFightData, lib/ffl-client.ts) is the "landed" tick rather than the
// "calculateddamage" preview, and that landed tick can arrive a little
// AFTER the stack-loss instant instead of before it (observed up to ~90ms
// late on real logs). So this checks a window on BOTH sides of the loss
// timestamp, rather than only looking backward — generous enough to cover
// both cases, while nowhere near wide enough to bleed into a neighboring
// tower (towers are seconds apart at minimum for the same player).
const PATH_OF_LIGHT_WINDOW_MS = 2000;

export const FORSAKEN_MISSED_TOWER_RULE_ID = "ffxiv-forsaken-missed-tower";

/** Every 1005083 stack-loss instant for one player — both a partial decrement and the final removal. */
function collectPlayerStackLossEvents(player: PlayerInfo): number[] {
  return player.debuffs
    .filter(
      (d) =>
        d.abilityId === SPELLS_TROUBLE_ABILITY_ID &&
        (d.debuffStatus === "removed" || d.debuffStatus === "stackRemoved")
    )
    .map((d) => d.timestamp)
    .sort((a, b) => a - b);
}

/** Did this player take a Path of Light hit at roughly the same moment as this stack-loss instant? */
function hasPathOfLightNear(player: PlayerInfo, lossTimestamp: number): boolean {
  return player.damageTaken.some(
    (e) =>
      e.abilityId === PATH_OF_LIGHT_ABILITY_ID &&
      Math.abs(e.timestamp - lossTimestamp) <= PATH_OF_LIGHT_WINDOW_MS
  );
}

// ── Expected resolution timestamp (for accurate error timing) ──────────────
//
// A player who misses a tower doesn't necessarily get their own 1005083
// stack removed at the moment the mistake happened — on a real log, a
// straggler's stack-loss can be delayed well past when everyone else
// resolved that same tower (observed: a whole raid-second or more later).
// Reporting the error at the player's OWN stack-loss timestamp would show
// the mistake as happening much later than it actually did. Instead, for
// each (team, slot) combination, this derives the CONSENSUS timestamp —
// whatever instant the majority of that team's players resolved that slot
// at — and reports a miss there instead. A lone straggler's own outlier
// timestamp naturally loses to the larger, tightly-clustered group of
// teammates who resolved on schedule.
const EXPECTED_TIMESTAMP_CLUSTER_MS = 100;

/** Given every timestamp recorded for one (team, slot) combination, finds the instant most of them agree on. */
function findConsensusTimestamp(timestamps: number[]): number {
  const sorted = [...timestamps].sort((a, b) => a - b);

  const clusters: number[][] = [];
  for (const ts of sorted) {
    const currentCluster = clusters[clusters.length - 1];
    if (currentCluster && ts - currentCluster[currentCluster.length - 1] <= EXPECTED_TIMESTAMP_CLUSTER_MS) {
      currentCluster.push(ts);
    } else {
      clusters.push([ts]);
    }
  }

  // Largest cluster wins — a lone straggler's very different timestamp
  // forms its own single-element cluster and can't outweigh the group.
  clusters.sort((a, b) => b.length - a.length);
  return clusters[0][0];
}

/**
 * Builds a lookup of "the real, consensus resolution timestamp" for every
 * (team, slot-index) combination that actually occurred, so a missed
 * resolution can be reported at the moment it truly happened rather than
 * whenever the affected player's own debuff eventually cleared.
 */
function buildExpectedTimestamps(
  lossesByPlayer: Map<number, number[]>,
  teamByPlayer: Map<number, "first" | "second">
): Map<string, number> {
  const timestampsBySlot = new Map<string, number[]>();

  for (const [actorId, losses] of lossesByPlayer) {
    const team = teamByPlayer.get(actorId);
    if (!team) continue;

    losses.forEach((timestamp, i) => {
      const key = `${team}-${i}`;
      const existing = timestampsBySlot.get(key) ?? [];
      existing.push(timestamp);
      timestampsBySlot.set(key, existing);
    });
  }

  const expectedBySlot = new Map<string, number>();
  for (const [key, timestamps] of timestampsBySlot) {
    expectedBySlot.set(key, findConsensusTimestamp(timestamps));
  }

  return expectedBySlot;
}

// ── Tower labeling (display only — never affects detection) ────────────────
//
// Confirmed community-standard tower order ("AAABBBBA"): whichever team's
// first stack-loss happens earliest is the team that starts on an
// ODD-numbered tower, and takes global tower slots 1, 2, 3, and 8. The
// other team starts on an EVEN-numbered tower and takes slots 4, 5, 6, 7.
// This is a STRATEGY convention (confirmed directly, not inferred), not an
// encounter rule — a group using a different tower order would get a
// mislabeled "tower #N" here, but detection itself never depends on this
// ordering, so it can't produce a false positive/negative either way.
const TOWER_ORDER_FIRST_TEAM:  readonly number[] = [1, 2, 3, 8];
const TOWER_ORDER_SECOND_TEAM: readonly number[] = [4, 5, 6, 7];

// Two players' own FIRST-ever stack-loss timestamps this close together
// are considered "the same team, starting together" for team-inference
// purposes. Real teammates' first tower lands within a couple ms of each
// other; the other team's first tower is a full multi-tower block (tens of
// seconds) later. Deliberately based only on each player's EARLIEST
// resolution — the one moment in the fight virtually guaranteed to be
// clean — so a chaotic tail full of delayed resolutions later in the pull
// can never corrupt team identity or mislabel an earlier, unrelated tower.
const TEAM_INFERENCE_TOLERANCE_MS = 500;

/** Infers each player's team ("first" or "second" to resolve) from their own earliest stack-loss instant. */
function inferPlayerTeams(lossesByPlayer: Map<number, number[]>): Map<number, "first" | "second"> {
  const firstLossByPlayer = new Map<number, number>();
  for (const [actorId, losses] of lossesByPlayer) {
    if (losses.length > 0) firstLossByPlayer.set(actorId, losses[0]);
  }

  const teamByPlayer = new Map<number, "first" | "second">();
  if (firstLossByPlayer.size === 0) return teamByPlayer;

  const globalEarliest = Math.min(...firstLossByPlayer.values());

  for (const [actorId, firstLoss] of firstLossByPlayer) {
    const isFirstTeam = Math.abs(firstLoss - globalEarliest) <= TEAM_INFERENCE_TOLERANCE_MS;
    teamByPlayer.set(actorId, isFirstTeam ? "first" : "second");
  }

  return teamByPlayer;
}

/**
 * Assigns each player a global "tower #N" label for each of their personal
 * resolutions, based on which team they're inferred to be on (see above).
 */
function buildTowerLabelsByPlayer(
  lossesByPlayer: Map<number, number[]>,
  teamByPlayer: Map<number, "first" | "second">
): Map<number, number[]> {
  const labelsByPlayer = new Map<number, number[]>();

  for (const [actorId, losses] of lossesByPlayer) {
    const team = teamByPlayer.get(actorId);
    const order = team === "first" ? TOWER_ORDER_FIRST_TEAM : TOWER_ORDER_SECOND_TEAM;

    labelsByPlayer.set(actorId, losses.map((_, i) => order[i]));
  }

  return labelsByPlayer;
}

/**
 * Detects Forsaken tower-soak failures: for every stack-loss instant on
 * every player's own 1005083 timeline, flags it if there was no
 * corresponding Path of Light hit shortly beforehand — meaning that
 * specific resolution happened without the player actually standing in
 * their tower.
 *
 * Returns [] immediately (and cheaply) for any pull that never touches
 * Forsaken at all — self-gating on the presence of 1005083 rather than an
 * encounter-name check, so it's safe to always call regardless of fight.
 */
export function detectForsakenTowerErrors(players: PlayerInfo[]): PullError[] {
  const lossesByPlayer = new Map<number, number[]>();

  for (const player of players) {
    const losses = collectPlayerStackLossEvents(player);
    if (losses.length === 0) continue;

    lossesByPlayer.set(player.actorId, losses);
  }

  if (lossesByPlayer.size === 0) return [];

  const teamByPlayer = inferPlayerTeams(lossesByPlayer);
  const labelsByPlayer = buildTowerLabelsByPlayer(lossesByPlayer, teamByPlayer);
  const expectedTimestamps = buildExpectedTimestamps(lossesByPlayer, teamByPlayer);

  const errors: PullError[] = [];

  for (const player of players) {
    const losses = lossesByPlayer.get(player.actorId);
    if (!losses) continue;

    const team = teamByPlayer.get(player.actorId);
    const labels = labelsByPlayer.get(player.actorId) ?? [];

    losses.forEach((lossTimestamp, i) => {
      // Pass/fail is always checked against the player's OWN timestamp —
      // that's what tells "resolved late but for real" apart from "never
      // resolved at all" (see module comment above).
      if (hasPathOfLightNear(player, lossTimestamp)) return;

      // But the REPORTED time is the consensus moment the tower actually
      // resolved for the team, not whenever this player's own debuff
      // eventually caught up — a real miss should show up when it
      // happened, not whenever it was cleaned up after the fact. Falls
      // back to the player's own timestamp only if no teammate data
      // exists for this slot at all (e.g. every single player on the team
      // missed the same tower — no "on time" instant to anchor to).
      const expectedTimestamp = team
        ? expectedTimestamps.get(`${team}-${i}`) ?? lossTimestamp
        : lossTimestamp;

      const towerNumber = labels[i];
      const towerLabel = towerNumber !== undefined ? ` (tower #${towerNumber})` : "";

      errors.push({
        ruleId:      FORSAKEN_MISSED_TOWER_RULE_ID,
        severity:    "Major",
        name:        "Missed Tower Soak",
        description: `Did not appear to stand in the assigned tower for a Forsaken resolution${towerLabel}.`,
        timestamp:   expectedTimestamp,
        player:      player.name,
        class:       player.className,
        specId:      player.specId,
        role:        player.role,
        abilityId:   PATH_OF_LIGHT_ABILITY_ID,
        abilityName: "Path of Light",
      });
    });
  }

  errors.push(...detectOvercrowdedTowerErrors(players, teamByPlayer, labelsByPlayer, expectedTimestamps));
  errors.push(...detectWrongTowerPositionErrors(players, expectedTimestamps));

  return errors.sort((a, b) => a.timestamp - b.timestamp);
}

export const FORSAKEN_EXTRA_PLAYER_RULE_ID = "ffxiv-forsaken-extra-player-in-tower";

// ── Overcrowded tower detection ─────────────────────────────────────────────
//
// A clean tower resolution's Path of Light always hits exactly the
// resolving team's own 4 members — confirmed across every clean round
// observed. If a 5th (or more) player also takes a Path of Light hit at
// that same moment, and that player isn't on the resolving team's roster,
// they physically stood in a tower that wasn't theirs — turning what
// should be a 2-person tower into a 3+ person one. Observed on a real log:
// a team's clean 3rd-tower resolution picking up a 5th recipient who
// belonged to the OTHER team's roster entirely, immediately followed by a
// catastrophic (~1-2 million) damage spike — consistent with the raid-plan
// cheatsheet's description of towers misbehaving when overcrowded.
//
// This only flags players who are NOT on the resolving team — a normal
// team member is always expected to show up, so their presence is never
// "extra." A player is attributed as many "extra" occurrences as they
// wrongly appear in throughout the pull, each at the tower it happened.

/** Every Path of Light hit timestamp for one player. */
function collectPathOfLightHits(player: PlayerInfo): number[] {
  return player.damageTaken
    .filter((e) => e.abilityId === PATH_OF_LIGHT_ABILITY_ID)
    .map((e) => e.timestamp);
}

function detectOvercrowdedTowerErrors(
  players: PlayerInfo[],
  teamByPlayer: Map<number, "first" | "second">,
  labelsByPlayer: Map<number, number[]>,
  expectedTimestamps: Map<string, number>
): PullError[] {
  const pathOfLightHitsByPlayer = new Map<number, number[]>();
  for (const player of players) {
    pathOfLightHitsByPlayer.set(player.actorId, collectPathOfLightHits(player));
  }

  const errors: PullError[] = [];

  for (const [key, consensusTimestamp] of expectedTimestamps) {
    const [team, slotIndexStr] = key.split("-") as ["first" | "second", string];
    const slotIndex = Number(slotIndexStr);

    for (const player of players) {
      // Only players NOT on the resolving team can ever be "extra" —
      // a real team member showing up at their own slot is expected.
      if (teamByPlayer.get(player.actorId) === team) continue;

      const hits = pathOfLightHitsByPlayer.get(player.actorId) ?? [];
      const wasPresent = hits.some(
        (hitTimestamp) => Math.abs(hitTimestamp - consensusTimestamp) <= PATH_OF_LIGHT_WINDOW_MS
      );
      if (!wasPresent) continue;

      const towerNumber = (team === "first" ? TOWER_ORDER_FIRST_TEAM : TOWER_ORDER_SECOND_TEAM)[slotIndex];
      const towerLabel = towerNumber !== undefined ? ` (tower #${towerNumber})` : "";

      errors.push({
        ruleId:      FORSAKEN_EXTRA_PLAYER_RULE_ID,
        severity:    "Major",
        name:        "Extra Player In Tower",
        description: `Stood in a Forsaken tower assigned to the other team${towerLabel}, turning it into a 3+ person tower.`,
        timestamp:   consensusTimestamp,
        player:      player.name,
        class:       player.className,
        specId:      player.specId,
        role:        player.role,
        abilityId:   PATH_OF_LIGHT_ABILITY_ID,
        abilityName: "Path of Light",
      });
    }
  }

  return errors;
}

export const FORSAKEN_WRONG_POSITION_RULE_ID = "ffxiv-forsaken-wrong-tower-position";

// ── Phase 2: wrong-tower-position detection ─────────────────────────────────
//
// Every Forsaken resolution spawns TWO simultaneous towers (two separate
// instances of the same NPC actor — telling them apart is exactly what the
// sourceInstance field on Path of Light hits exists for), and each is
// soaked by 2 of the resolving team's 4 players. The pairing rule,
// confirmed against all 64 clean tower soaks across four real logs: the
// two soakers of one tower must hold two DIFFERENT assignment debuffs
// (1005084 / 1005085 / 1005086 — the rotating per-player mechanic
// assignments; each soaker plants a follow-up aoe of their debuff's type
// at their soak spot, and a tower resolved by a same-debuff pair plants
// two copies of one aoe where the raid plan expects one of each — the
// observed result being a raid wipe within seconds).
//
// A same-debuff pair means two players from opposite towers swapped — but
// only ONE member of each broken tower is actually out of position (the
// other is standing exactly where their own assignment belongs). Blaming
// both would flag two innocent players, so attribution falls to geometry:
// each debuff owns a fixed SPOT TYPE at its tower, measurable purely as
// the soaker's distance from the arena center (10000,10000 in FFLogs'
// centi-yalm units; all 8 tower spawn points sit on the r=800 ring):
//
//     debuff    paired with     spot                observed radius
//     1005084   1005085         inner  (~r 485-530)
//     1005084   1005086         on-tower (~r 620-740)
//     1005085   anything        outer  (~r 1010-1150)   ← always outer
//     1005086   1005085         inner  (~r 485-560)
//     1005086   1005084         outer  (~r 1030-1090)
//
// The radius bands below split those clusters at their widest gaps. In a
// same-debuff tower, the soaker standing at their debuff's own spot type
// is innocent; the other one went to the wrong tower and gets the error.
// (Validated: the known positioning wipe resolves to exactly the two
// players confirmed to have swapped, and no clean log produces any flag.)
// If the geometry is too ambiguous to single one out — both or neither at
// the expected spot, or the intended partner debuff unknowable — every
// member of the same-debuff pair is flagged rather than guessing.

const ASSIGNMENT_DEBUFF_IDS = new Set([1005084, 1005085, 1005086]);

const ARENA_CENTER = 10000;

type SpotType = "inner" | "on-tower" | "outer";

// Observed radii: inner tops out ~560, on-tower spans ~620-740, outer
// starts ~1010 — the cutoffs sit in the middle of each gap.
const INNER_MAX_RADIUS    = 590;
const ON_TOWER_MAX_RADIUS = 900;

function classifySpot(x: number, y: number): SpotType {
  const radius = Math.hypot(x - ARENA_CENTER, y - ARENA_CENTER);
  if (radius <= INNER_MAX_RADIUS)    return "inner";
  if (radius <= ON_TOWER_MAX_RADIUS) return "on-tower";
  return "outer";
}

/** The spot type a debuff's holder should occupy, given their partner's debuff (see table above). */
function expectedSpotFor(debuffId: number, partnerDebuffId: number | undefined): SpotType | undefined {
  if (debuffId === 1005085) return "outer";   // outer regardless of partner
  if (partnerDebuffId === undefined) return undefined;
  if (debuffId === 1005084) return partnerDebuffId === 1005085 ? "inner" : "on-tower";
  if (debuffId === 1005086) return partnerDebuffId === 1005085 ? "inner" : "outer";
  return undefined;
}

type AssignmentInterval = { abilityId: number; abilityName: string; start: number; end: number };

/** Reconstructs which assignment debuff (1005084/85/86) a player held over time from their apply/remove events. */
function collectAssignmentIntervals(player: PlayerInfo): AssignmentInterval[] {
  const intervals: AssignmentInterval[] = [];
  const openSince = new Map<number, { start: number; abilityName: string }>();

  const events = [...player.debuffs]
    .filter((d) => ASSIGNMENT_DEBUFF_IDS.has(d.abilityId))
    .sort((a, b) => a.timestamp - b.timestamp);

  for (const e of events) {
    if (e.debuffStatus === "applied") {
      openSince.set(e.abilityId, { start: e.timestamp, abilityName: e.abilityName });
    } else if (e.debuffStatus === "removed") {
      const open = openSince.get(e.abilityId);
      intervals.push({
        abilityId:   e.abilityId,
        abilityName: open?.abilityName ?? e.abilityName,
        start:       open?.start ?? 0,
        end:         e.timestamp,
      });
      openSince.delete(e.abilityId);
    }
  }
  for (const [abilityId, open] of openSince) {
    intervals.push({ abilityId, abilityName: open.abilityName, start: open.start, end: Infinity });
  }

  return intervals;
}

function assignmentAt(intervals: AssignmentInterval[], timestamp: number): AssignmentInterval | undefined {
  return intervals.find((iv) => iv.start <= timestamp && timestamp < iv.end);
}

type TowerSoak = {
  player:        PlayerInfo;
  timestamp:     number;
  towerInstance: number;
  x:             number;
  y:             number;
};

// Path of Light hits within one resolution land within ~700ms of each other
// (the "calculateddamage"/"damage" split); the same player's next
// resolution is 10+ seconds away. Anything inside this gap is one
// resolution moment.
const RESOLUTION_CLUSTER_GAP_MS = 3000;

function detectWrongTowerPositionErrors(
  players:            PlayerInfo[],
  expectedTimestamps: Map<string, number>
): PullError[] {
  // Every PoL hit that carries the tower instance and a position snapshot.
  const soaks: TowerSoak[] = [];
  for (const player of players) {
    for (const e of player.damageTaken) {
      if (e.abilityId !== PATH_OF_LIGHT_ABILITY_ID) continue;
      if (e.sourceInstance === undefined || e.x === undefined || e.y === undefined) continue;
      soaks.push({ player, timestamp: e.timestamp, towerInstance: e.sourceInstance, x: e.x, y: e.y });
    }
  }
  if (soaks.length === 0) return [];

  // Group into resolution moments, keeping only each player's FIRST hit per
  // moment (the earliest event is the closest snapshot to the actual soak —
  // a "damage" record landing ~700ms later may already show them moving away).
  soaks.sort((a, b) => a.timestamp - b.timestamp);
  const clusters: TowerSoak[][] = [];
  for (const soak of soaks) {
    const current = clusters[clusters.length - 1];
    if (current && soak.timestamp - current[current.length - 1].timestamp <= RESOLUTION_CLUSTER_GAP_MS) {
      current.push(soak);
    } else {
      clusters.push([soak]);
    }
  }

  const intervalsByPlayer = new Map<number, AssignmentInterval[]>();
  for (const player of players) {
    intervalsByPlayer.set(player.actorId, collectAssignmentIntervals(player));
  }

  const errors: PullError[] = [];

  for (const cluster of clusters) {
    const clusterTime = cluster[0].timestamp;

    // Match this resolution to its consensus (team, slot) stack-loss
    // timestamp up front — it anchors BOTH the display label and, more
    // importantly, the assignment-debuff lookup below.
    let towerNumber: number | undefined;
    let consensusTimestamp: number | undefined;
    for (const [key, consensus] of expectedTimestamps) {
      if (Math.abs(consensus - clusterTime) > PATH_OF_LIGHT_WINDOW_MS) continue;
      const [team, slotIndexStr] = key.split("-") as ["first" | "second", string];
      towerNumber = (team === "first" ? TOWER_ORDER_FIRST_TEAM : TOWER_ORDER_SECOND_TEAM)[Number(slotIndexStr)];
      consensusTimestamp = consensus;
      break;
    }

    // The assignment debuffs ROTATE at the stack-loss instant, ~580ms after
    // the soak itself — and when a player's only surviving Path of Light
    // record is the late-arriving "landed" tick (~670ms after the soak),
    // its timestamp already sits PAST that rotation. Querying there returns
    // the player's NEXT assignment and mislabels a clean tower as a
    // same-debuff pair. So the lookup is pinned to just before the
    // resolution's consensus stack-loss — the last instant the soak-time
    // assignments were still in effect.
    const assignmentQueryTime =
      consensusTimestamp !== undefined ? Math.min(clusterTime, consensusTimestamp - 1) : clusterTime;

    const towers = new Map<number, TowerSoak[]>();
    const seenPlayers = new Set<number>();
    for (const soak of cluster) {
      if (seenPlayers.has(soak.player.actorId)) continue;
      seenPlayers.add(soak.player.actorId);
      const group = towers.get(soak.towerInstance) ?? [];
      group.push(soak);
      towers.set(soak.towerInstance, group);
    }

    // Resolve each 2-person tower to its pair of held assignment debuffs.
    // Other group sizes are missed-soak / overcrowding territory — already
    // covered by the Phase-1 rules above, so they're skipped here.
    type TowerPair = { soaks: TowerSoak[]; assignments: AssignmentInterval[] };
    const pairs: TowerPair[] = [];
    for (const group of towers.values()) {
      if (group.length !== 2) continue;
      const assignments = group.map((s) =>
        assignmentAt(intervalsByPlayer.get(s.player.actorId) ?? [], assignmentQueryTime)
      );
      if (assignments[0] === undefined || assignments[1] === undefined) continue;
      pairs.push({ soaks: group, assignments: assignments as AssignmentInterval[] });
    }

    for (const pair of pairs) {
      const [a, b] = pair.assignments;
      if (a.abilityId !== b.abilityId) continue;   // clean tower — two different debuffs

      // Same-debuff pair: someone here swapped with the other tower. The
      // intended partner debuff is only knowable when the resolution's
      // other tower is ALSO a same-debuff pair (a straight two-player swap
      // breaks both towers symmetrically — the observed real-log case).
      const other = pairs.find((p) => p !== pair);
      const otherIsSamePair =
        other !== undefined && other.assignments[0].abilityId === other.assignments[1].abilityId;
      const partnerDebuffId = otherIsSamePair ? other!.assignments[0].abilityId : undefined;

      const expectedSpot = expectedSpotFor(a.abilityId, partnerDebuffId);
      const atOwnSpot = pair.soaks.map(
        (s) => expectedSpot !== undefined && classifySpot(s.x, s.y) === expectedSpot
      );

      // Exactly one soaker standing at their own debuff's spot → the other
      // one is the player who went to the wrong tower. Anything murkier →
      // flag both rather than guess.
      const culprits =
        atOwnSpot[0] !== atOwnSpot[1]
          ? [pair.soaks[atOwnSpot[0] ? 1 : 0]]
          : pair.soaks;

      const reportTimestamp = consensusTimestamp ?? clusterTime;
      const towerLabel = towerNumber !== undefined ? ` (tower #${towerNumber})` : "";

      for (const soak of culprits) {
        errors.push({
          ruleId:      FORSAKEN_WRONG_POSITION_RULE_ID,
          severity:    "Major",
          name:        "Wrong Tower Position",
          description: `Went to the wrong Forsaken tower${towerLabel}: both of its soakers held the same debuff, and this player was standing at the spot their swapped partner's debuff owns.`,
          timestamp:   reportTimestamp,
          player:      soak.player.name,
          class:       soak.player.className,
          specId:      soak.player.specId,
          role:        soak.player.role,
          abilityId:   a.abilityId,
          abilityName: a.abilityName,
        });
      }
    }
  }

  return errors;
}
