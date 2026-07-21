// lib/mechanics/ffxiv/dancingmad/forsaken.ts
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
// ── PHASE 2: POSITIONING DETECTION (see bottom of file) ─────────────────────
//
// Beyond "did you soak at all", two positioning rules are enforced,
// confirmed across every clean tower soak in five real logs (80 of them):
// (1) each tower's two soakers must hold two DIFFERENT assignment debuffs
// (1005084/1005085/1005086 — the rotating per-player mechanic
// assignments), and (2) each soaker must stand at the specific SPOT their
// debuff owns at that tower, because their follow-up aoe is planted at
// their exact soak position. Both observed failing for real exactly once:
// a two-player tower swap (same-debuff pairs on both towers), and a
// 1005086 holder soaking too far in so their proximity cone latched onto
// the wrong bait and cleaved half the raid. See the Phase-2 section below
// for the full geometry model and attribution rules.
//
// ── WHAT THIS DOES NOT DO YET ───────────────────────────────────────────────
//
// It does not directly verify where the follow-up aoes (47808/47809/47810
// — the stack/single aoes planted at each soaker's position) actually
// land, or whether they hit the wrong number of people. Those are
// downstream consequences of the tower errors already detected here at
// their root cause, so modeling them would mostly re-flag the same
// mistakes.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { PullError, EnemyEvent } from "@/types/PullError";
import type { DeathEvent } from "@/types/DeathEvent";

const SPELLS_TROUBLE_ABILITY_ID = 1005083; // "Spell's Trouble" stack counter
const PATH_OF_LIGHT_ABILITY_ID  = 47806;   // "Path of Light" — the tower-soak damage tick

// "Ultimate Embrace" (Phase 2's enrage check) — Kefka casts this ability
// TWICE over the course of Phase 2: once early (~92% HP, not the check),
// and once as the phase's final cast. The raid must have brought his HP
// down to nearly 0 by the moment that SECOND cast completes, or the fight
// enrages shortly after. Confirmed against report VtdBqhLQkWJXMvDg's own
// enemyCasts (2026-07-21): every clean pull's final 49740 completes with
// Kefka at 0.000-1.06% HP; the one confirmed-failed pull (#3, "a few
// percentage points off" per the user) completed at 2.69%.
const ULTIMATE_EMBRACE_ABILITY_ID = 49740;
const ENRAGE_CHECK_MAX_HP_PERCENT = 1.5; // clean max observed 1.06%, failure observed 2.69%

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
export const FORSAKEN_ENRAGE_CHECK_RULE_ID = "ffxiv-forsaken-enrage-check-missed";

/**
 * Phase 2's enrage check: Kefka's HP must be brought down to nearly 0 by
 * the moment his SECOND "Ultimate Embrace" (49740) cast completes. Raid-wide
 * — nobody in particular is at fault, so this is a "Raid" severity error
 * with no player attribution, same convention as error-rules.ts's raid-wide
 * "enemyCast" rules. Takes the LAST 49740 completion in the pull (there are
 * two per Phase 2 in every log seen so far; a pull that wipes before the
 * second one simply has only one, which is correctly ignored here — no
 * enrage check was reached at all).
 */
function detectEnrageCheckError(enemyCasts: EnemyEvent[]): PullError[] {
  const embraceCasts = enemyCasts.filter(
    (e) => e.abilityId === ULTIMATE_EMBRACE_ABILITY_ID && e.hitPoints !== undefined && e.maxHitPoints
  );
  if (embraceCasts.length < 2) return [];

  const finalCast = embraceCasts[embraceCasts.length - 1];
  const hpPercent = (finalCast.hitPoints! / finalCast.maxHitPoints!) * 100;
  if (hpPercent <= ENRAGE_CHECK_MAX_HP_PERCENT) return [];

  return [
    {
      ruleId:      FORSAKEN_ENRAGE_CHECK_RULE_ID,
      severity:    "Raid",
      name:        "Missed Enrage Check",
      description: `Kefka was at ${hpPercent.toFixed(1)}% HP when the final Ultimate Embrace finished casting — should be brought to nearly 0% by then.`,
      timestamp:   finalCast.timestamp,
      abilityId:   ULTIMATE_EMBRACE_ABILITY_ID,
      abilityName: "Ultimate Embrace",
    },
  ];
}

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

// ── Wipe-cleanup removals must not count as resolutions ────────────────────
//
// When a pull wipes mid-Forsaken, the encounter strips Spell's Trouble from
// every player SIMULTANEOUSLY — both teams at once, including players whose
// remaining towers never even spawned (observed on a real wipe: all 8
// players' removals on the same millisecond, seconds after the last tower).
//
// This CANNOT be handled by discarding individual loss events that sit far
// from any tower, because a genuine miss produces exactly such an event:
// the player who skips their tower keeps their stack until that same
// cleanup instant (observed on a real log — all three legitimate missed-
// tower losses WERE the cleanup removals). What tells the two situations
// apart is the team's CONSENSUS slot, not the individual loss:
//
//   • A consensus timestamp with Path of Light landing on somebody near it
//     is a tower that really resolved — teammates' losses anchor it, and a
//     player carried to cleanup against that slot genuinely missed.
//   • A consensus timestamp with no Path of Light anywhere near it is a
//     phantom slot made entirely of cleanup removals (the tower never
//     spawned) — nobody can miss a tower that never existed.
//
// So phantom slots are dropped wholesale after consensus-building, and the
// per-player check below additionally accepts a Path of Light hit at the
// team's consensus moment: a player whose own stack decrement was delayed —
// or outright swallowed by an intruding extra player at an overcrowded
// tower (observed: the game decremented the intruder instead) — still
// demonstrably stood in the tower when it resolved.
function isNearAnyPathOfLight(allPathOfLightTimestamps: number[], timestamp: number): boolean {
  return allPathOfLightTimestamps.some(
    (t) => Math.abs(t - timestamp) <= PATH_OF_LIGHT_WINDOW_MS
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
export function detectForsakenTowerErrors(
  players:     PlayerInfo[],
  deathEvents: DeathEvent[] = [],
  enemyCasts:  EnemyEvent[] = []
): PullError[] {
  // Every Path of Light hit on ANYONE — the reference for which stack-loss
  // instants correspond to a tower that actually resolved (see the
  // wipe-cleanup comment above isNearAnyPathOfLight).
  const allPathOfLightTimestamps = players.flatMap((p) =>
    p.damageTaken
      .filter((e) => e.abilityId === PATH_OF_LIGHT_ABILITY_ID)
      .map((e) => e.timestamp)
  );

  const lossesByPlayer = new Map<number, number[]>();

  for (const player of players) {
    const losses = collectPlayerStackLossEvents(player);
    if (losses.length === 0) continue;

    lossesByPlayer.set(player.actorId, losses);
  }

  if (lossesByPlayer.size === 0) return detectEnrageCheckError(enemyCasts);

  const teamByPlayer = inferPlayerTeams(lossesByPlayer);
  const labelsByPlayer = buildTowerLabelsByPlayer(lossesByPlayer, teamByPlayer);
  const expectedTimestamps = buildExpectedTimestamps(lossesByPlayer, teamByPlayer);

  // Drop phantom slots — consensus instants where no tower actually fired
  // (see the wipe-cleanup comment above isNearAnyPathOfLight). Downstream
  // consumers (missed-tower, extra-player, wrong-position) all anchor on
  // this map, so pruning here keeps every rule blind to cleanup artifacts.
  for (const [key, consensus] of expectedTimestamps) {
    if (!isNearAnyPathOfLight(allPathOfLightTimestamps, consensus)) {
      expectedTimestamps.delete(key);
    }
  }

  const errors: PullError[] = [];

  for (const player of players) {
    const losses = lossesByPlayer.get(player.actorId);
    if (!losses) continue;

    const team = teamByPlayer.get(player.actorId);
    const labels = labelsByPlayer.get(player.actorId) ?? [];

    losses.forEach((lossTimestamp, i) => {
      // Pass/fail is first checked against the player's OWN timestamp —
      // that's what tells "resolved late but for real" apart from "never
      // resolved at all" (see module comment above).
      if (hasPathOfLightNear(player, lossTimestamp)) return;

      const consensusTimestamp = team ? expectedTimestamps.get(`${team}-${i}`) : undefined;

      // No surviving consensus for this slot, and the player's own loss
      // sits nowhere near any tower either → this "loss" is a wipe-cleanup
      // removal for a tower that never spawned (the slot was pruned as a
      // phantom above). Not a miss — the pull just ended first.
      if (
        consensusTimestamp === undefined &&
        !isNearAnyPathOfLight(allPathOfLightTimestamps, lossTimestamp)
      ) {
        return;
      }

      // A Path of Light hit at the TEAM's consensus moment also counts as
      // having soaked: a player's own decrement can be delayed — or, at an
      // overcrowded tower, swallowed entirely by the intruding extra
      // player (the game hands them the decrement) — while the hit itself
      // proves the player stood in the tower when it resolved.
      if (consensusTimestamp !== undefined && hasPathOfLightNear(player, consensusTimestamp)) return;

      // The REPORTED time is the consensus moment the tower actually
      // resolved for the team, not whenever this player's own debuff
      // eventually caught up — a real miss should show up when it
      // happened, not whenever it was cleaned up after the fact. Falls
      // back to the player's own timestamp only if no teammate data
      // exists for this slot at all (e.g. every single player on the team
      // missed the same tower — no "on time" instant to anchor to).
      const expectedTimestamp = consensusTimestamp ?? lossTimestamp;

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

  // Wrong-position detection runs FIRST because it can decisively resolve
  // overcrowded towers using debuff+geometry evidence (see
  // pickLegitimatePair below) — strictly more reliable than the raw
  // timestamp-based team inference detectOvercrowdedTowerErrors falls back
  // on. Its confirmedLegitKeys tells the team-based check which players are
  // already proven innocent, so it doesn't re-flag them under a
  // mis-inferred team (see the "stolen stack decrement" case below).
  const { errors: wrongPositionErrors, confirmedLegitKeys, misattributedConeDeaths } = detectWrongTowerPositionErrors(players, expectedTimestamps, deathEvents);
  errors.push(...detectOvercrowdedTowerErrors(players, teamByPlayer, labelsByPlayer, expectedTimestamps, confirmedLegitKeys));
  errors.push(...wrongPositionErrors);
  errors.push(...detectLethalConeBaitErrors(players, deathEvents, expectedTimestamps, misattributedConeDeaths));
  errors.push(...detectEnrageCheckError(enemyCasts));

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
//
// Team inference (inferPlayerTeams, above) is only as good as each
// player's OWN first stack-loss timestamp — and that signal breaks under
// the exact "intruding extra player steals the stack decrement" quirk
// this rule exists to catch (see the module comment on wipe-cleanup
// removals). Observed for real (report rXBbzFV49hd1QPwf pull 1): an
// intruder's stack got decremented at the tower's resolution instant
// (stealing the legitimate soaker's decrement), while the legitimate
// soaker's own stack-loss never fired until the later wipe-cleanup —
// making the LEGITIMATE player's firstLoss land on the wrong team's
// timing and get themselves mis-teamed and flagged as "extra," while the
// real intruder went unflagged. `confirmedLegitKeys` (from
// detectWrongTowerPositionErrors, which resolves overcrowded towers with
// debuff+geometry evidence instead of timestamps) overrides that
// mis-teaming for any player it could decisively clear.

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
  expectedTimestamps: Map<string, number>,
  confirmedLegitKeys: Set<string>
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

      // Already decisively cleared by debuff+geometry evidence — trust
      // that over the timestamp-based team inference (see comment above).
      if (confirmedLegitKeys.has(`${player.actorId}@${consensusTimestamp}`)) continue;

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
export const FORSAKEN_WRONG_SPOT_RULE_ID     = "ffxiv-forsaken-wrong-spot-in-tower";

// ── Phase 2: positioning detection (wrong tower / wrong spot in tower) ──────
//
// Every Forsaken resolution spawns TWO simultaneous towers (two separate
// instances of the same NPC actor — telling them apart is exactly what the
// sourceInstance field on Path of Light hits exists for), and each is
// soaked by 2 of the resolving team's 4 players. Two rules, both confirmed
// against every clean tower soak across five real logs (80 of them):
//
// The three rotating assignment debuffs and what they mean (semantics
// confirmed for 85/86; 84 inferred from its follow-up hitting 3 players):
//
//     1005084  "Stack"  — plants 47808, the 3-player stack aoe
//     1005085  "Spread" — plants 47809; nobody may be near them when it
//                         resolves (hits exactly 1 player when clean)
//     1005086  "Cone"   — plants 47810, a conal aoe fired at the closest
//                         player in proximity when it resolves
//
// (1) WRONG TOWER: the two soakers of one tower must hold two DIFFERENT
//     assignment debuffs. A same-debuff pair means two players from
//     opposite towers swapped — observed once for real, and the raid
//     wiped within seconds.
//
// (2) WRONG SPOT: each soaker plants their debuff's follow-up aoe at
//     their exact soak position (fires ~0.6s later), so even in a
//     correctly-paired tower each debuff owns a fixed SPOT at that tower.
//     Standing at the wrong spot misplaces the planted aoe: observed once
//     for real — a Cone (1005086) holder soaked ~150 units from the tower
//     instead of ~250 beyond it, their proximity cone latched onto the
//     on-tower partner instead of the designated far bait, cleaved five
//     players and wiped the raid.
//
// The spot geometry (FFLogs centi-yalm units; arena center 10000,10000;
// all 8 tower spawn points sit on the r=800 ring at 45° spacing and are
// identical across every log seen):
//
//     debuff           paired with      spot       dist to tower   dist to center
//     1005084 Stack    1005085 Spread   inner      ~280-359        ~449-586
//     1005084 Stack    1005086 Cone     on-tower   ~90-311         ~576-740
//     1005085 Spread   anything         outer      ~264-369        ~1002-1150
//     1005086 Cone     1005085 Spread   inner      ~339-386        ~485-560
//     1005086 Cone     1005084 Stack    flare      ~204-298        ~1002-1120
//
// "inner" vs "outer" is which side of the r=800 tower ring the soaker
// stands on. The "flare" spot (the 1005086 proximity-cone plant beyond an
// on-tower anchor) is special: plant GEOMETRY alone cannot tell a failure
// from a success. The observed wrong-spot failure stood at r 944, 147 from
// the tower — but a fully clean pull later showed a flare at r 894, only
// 96 from the tower, with the cone resolving perfectly (ForsakenSuccessPull7
// tower #5). What actually decides the outcome is who the planted cone
// latches when it fires ~0.5-1.6s after the resolution: every clean cone
// hit EXACTLY ONE victim standing at r 1012+ (the designated far bait),
// while the failure's cones cleaved five players at r 356-640. So a
// shallow-looking flare (inside r 975 and not beyond its anchor) is only
// FLAGGED when the resolution's cone outcome actually went bad — a 47810
// victim inside the r=800 ring, or more victims than there were cone
// plants. The tower's own position is recovered by snapping the soakers'
// centroid to the nearest spawn point — clean pairs snap within ~110 units
// while neighboring spawn points are 612+ apart, so the snap cannot
// realistically pick the wrong tower.
//
// Attribution for rule (1): only ONE member of each broken tower actually
// swapped (the other stands exactly where their own assignment belongs),
// so the soaker found at their debuff's own spot type is innocent and the
// other gets the error. If the geometry is too ambiguous to single one
// out — both or neither at the expected spot, the intended partner debuff
// unknowable, or no usable tower snap — every member of the same-debuff
// pair is flagged rather than guessing.

const ASSIGNMENT_DEBUFF_IDS = new Set([1005084, 1005085, 1005086]);

// The proximity cone planted by a 1005086 holder (see the flare-outcome
// comment above). Fires at its closest player ~0.5-1.6s after the cone
// holder's own resolution — the window below covers every observed fire
// while ending far before the next resolution 10s later.
const CONE_FOLLOWUP_ABILITY_ID = 47810;
const CONE_FIRE_WINDOW_MS      = 3000;

// The 3-player stack aoe planted by a 1005084 (Stack) holder at their soak
// spot (see the Stack-clip section near the pair loop below). Every clean
// resolution observed hits EXACTLY 3 people — the Stack holder plus the
// team's other two non-soaking members; the tower's actual soak PARTNER
// (whichever debuff they hold) is expected to stand clear of it, same as
// every other soaker's own spot. When the partner strays too close and
// gets caught in the plant anyway, the headcount goes to 4+ and the split
// that normally keeps the hit survivable breaks down.
const STACK_FOLLOWUP_ABILITY_ID = 47808;
const STACK_ASSIGNMENT_DEBUFF_ID = 1005084; // "Stack" — see ASSIGNMENT_DEBUFF_IDS above
const STACK_CLIP_DEATH_WINDOW_MS = 3000;    // fatal hit → death event lag (matches CONE_DEATH_WINDOW_MS)
const STACK_VOLLEY_GAP_MS        = 200;     // one volley's hits land within ~130ms of each other

const ARENA_CENTER = 10000;

// The 8 fixed tower spawn points: 4 diagonal + 4 cardinal, all on the
// r=800 ring around arena center. Identical across every log observed.
const TOWER_SPAWN_POINTS: ReadonlyArray<readonly [number, number]> = [
  [9434, 9434], [10566, 9434], [9434, 10566], [10566, 10566],
  [10000, 9200], [9200, 10000], [10800, 10000], [10000, 10800],
];

// A clean pair's centroid lands within ~110 units of its spawn point (a
// degraded 2-of-4 resolution was observed at 230); anything further means
// the geometry is unusable, not that a 612+-distant neighbor was meant.
const TOWER_SNAP_MAX_DIST = 400;

/** Recovers the tower's position from its two soakers' centroid, or undefined if nothing snaps. */
function snapToTowerSpawn(soaks: TowerSoak[]): readonly [number, number] | undefined {
  const cx = soaks.reduce((sum, s) => sum + s.x, 0) / soaks.length;
  const cy = soaks.reduce((sum, s) => sum + s.y, 0) / soaks.length;

  let best: readonly [number, number] | undefined;
  let bestDist = Infinity;
  for (const spawn of TOWER_SPAWN_POINTS) {
    const dist = Math.hypot(cx - spawn[0], cy - spawn[1]);
    if (dist < bestDist) {
      bestDist = dist;
      best = spawn;
    }
  }
  return bestDist <= TOWER_SNAP_MAX_DIST ? best : undefined;
}

type SpotType = "inner" | "on-tower" | "outer" | "flare";

// On-tower anchors stand within ~201 of the tower; every legitimate
// standing-off spot begins at 204.
const ON_TOWER_MAX_DIST = 210;

// A flare (1005086 cone plant beyond an on-tower anchor) is legitimate at
// r 1002+ from center; the observed too-shallow failure sat at 944.
const FLARE_MIN_CENTER_DIST = 975;

// The "outer" spot (1005085 Spread, always) only needs to clear the r=800
// tower ring, but real logs land right on top of that line: a fully clean
// Spread resolution (report rXBbzFV49hd1QPwf pull 5 — single-victim 47809
// self-hit, no deaths) sat at r=795, just inside the naive r>=800 cutoff,
// and an earlier clean pull already put one at r=828. A flat 800 boundary
// is narrower than the ring's actual measurement fuzz, so "outer" clears
// at r>=770 instead — still well clear of every "inner"/"on-tower" spot's
// clean band (max observed r=740), just no longer false-flagging landings
// that sit within a few units of the line on a resolution that visibly
// worked.
const OUTER_MIN_CENTER_DIST = 770;

/** The spot type a debuff's holder should occupy, given their partner's debuff (see table above). */
function expectedSpotFor(debuffId: number, partnerDebuffId: number | undefined): SpotType | undefined {
  if (debuffId === 1005085) return "outer";   // outer regardless of partner
  if (partnerDebuffId === undefined) return undefined;
  if (debuffId === 1005084) return partnerDebuffId === 1005085 ? "inner" : "on-tower";
  if (debuffId === 1005086) return partnerDebuffId === 1005085 ? "inner" : "flare";
  return undefined;
}

/**
 * Whether a soaker is standing at the given spot type. The flare test is
 * the only one that needs the partner: a flare that hugs the r=975 line is
 * still fine as long as it sits beyond its on-tower anchor (see the
 * geometry comment above), so it fails only when BOTH signals say "too far
 * in" — shallower than every clean flare AND closer to the tower than the
 * anchor.
 */
function isAtSpot(
  soak:    TowerSoak,
  spot:    SpotType,
  tower:   readonly [number, number],
  partner: TowerSoak | undefined
): boolean {
  const distToTower  = Math.hypot(soak.x - tower[0], soak.y - tower[1]);
  const distToCenter = Math.hypot(soak.x - ARENA_CENTER, soak.y - ARENA_CENTER);

  switch (spot) {
    // The Stack-with-Cone anchor isn't required to hug the tower: a clean
    // log (ForsakenSuccessPull1, tower #7) showed the anchor standing 311
    // from the tower on the inner side (r=576 from center) with the whole
    // resolution — including both follow-up aoes — executing perfectly.
    // What the pair actually needs is the Cone planted beyond the ring, so
    // the anchor is fine anywhere inward of it: on the tower itself
    // (observed r up to 740 from center) or deeper toward the middle.
    case "on-tower": return distToTower <= ON_TOWER_MAX_DIST || distToCenter < 800;
    case "inner":    return distToCenter < 800;
    case "outer":    return distToCenter >= OUTER_MIN_CENTER_DIST;
    case "flare": {
      if (distToCenter < 800) return false;
      if (distToCenter >= FLARE_MIN_CENTER_DIST) return true;
      const partnerDistToTower =
        partner !== undefined ? Math.hypot(partner.x - tower[0], partner.y - tower[1]) : undefined;
      return partnerDistToTower !== undefined && distToTower >= partnerDistToTower;
    }
  }
}

/** Human phrasing of where a soaker actually stood, for error descriptions. */
function describeStanding(soak: TowerSoak, tower: readonly [number, number]): string {
  if (Math.hypot(soak.x - tower[0], soak.y - tower[1]) <= ON_TOWER_MAX_DIST) return "directly on the tower";
  return Math.hypot(soak.x - ARENA_CENTER, soak.y - ARENA_CENTER) < 800
    ? "off the tower toward the arena center"
    : "off the tower away from the arena center";
}

const SPOT_PHRASES: Record<SpotType, string> = {
  "on-tower": "directly on the tower",
  "inner":    "off the tower toward the arena center",
  "outer":    "off the tower away from the arena center",
  "flare":    "well beyond the tower away from the arena center",
};

// Ideal standing point per spot type, expressed as an offset along the
// tower's outward ray (negative = toward arena center), taken from the
// middle of each observed clean band. Only used for ATTRIBUTION — deciding
// which of several structurally-interchangeable players is the one out of
// position — never for flagging directly, so its precision is uncritical.
const SPOT_IDEAL_OFFSET: Record<SpotType, number> = {
  "on-tower": -150,
  "inner":    -350,
  "outer":    +320,
  "flare":    +260,
};

/** Distance from a soaker to the ideal point of a spot type at the given tower. */
function distToIdealSpot(soak: TowerSoak, spot: SpotType, tower: readonly [number, number]): number {
  const ringDist = Math.hypot(tower[0] - ARENA_CENTER, tower[1] - ARENA_CENTER);
  const outX = (tower[0] - ARENA_CENTER) / ringDist;
  const outY = (tower[1] - ARENA_CENTER) / ringDist;
  const offset = SPOT_IDEAL_OFFSET[spot];
  return Math.hypot(soak.x - (tower[0] + outX * offset), soak.y - (tower[1] + outY * offset));
}

// ── Pure overcrowding: a tower with no waiting lone partner elsewhere ───────
//
// The 3+1 split (below) handles an intruder who abandoned their OWN tower
// to join another, leaving their real partner stranded alone — solvable
// structurally (removing the intruder must leave both towers valid pairs).
// But a genuinely uninvolved outsider (their team's OTHER 3 members never
// got the chance to resolve at all — e.g. the pull wiped after only one
// team's first tower) leaves no such lone partner to anchor on: it's just
// one tower sitting at 3 (or more) soakers with no matching orphan.
//
// Position ALONE is not reliably decisive here (learned the hard way on a
// real case, report rXBbzFV49hd1QPwf pull 1): an outsider standing near
// the tower can accidentally land close enough to a DIFFERENT valid spot
// that two candidate pairings score within a hair of each other. The
// strong signal instead is which player's assignment debuff actually
// ROTATED at this resolution: a genuine soaker's held debuff interval
// ends almost exactly at the team's consensus stack-loss instant (both
// driven by the same "you resolved" event — observed exact-millisecond
// matches on real logs), while an outsider's debuff keeps its PRE-
// resolution value until whenever it's eventually cleared (a later real
// resolution or the wipe-cleanup instant). In the confirmed case, the
// legitimate 2nd soaker's debuff rotated in lockstep with their teammate's
// while the outsider's didn't rotate until the wipe 8+ seconds later —
// unambiguous, unlike the 137-vs-172 units the two candidates' positions
// scored. Position is kept ONLY as a fallback for the rarer case where
// rotation evidence can't cleanly pick a pair (e.g. the debuff-removed
// event is missing from the log, or more than 2 candidates show it).
const ROTATION_TOLERANCE_MS = 100; // matches EXPECTED_TIMESTAMP_CLUSTER_MS

// A player's Spell's Trouble (1005083) decrement landing right at the
// resolution's own consensus instant is the "stolen decrement" itself
// (see the wipe-quirk comment near the top of the file) — the game
// credited THEM with the stack-loss instead of the legitimate 2nd soaker,
// whose own loss stays pending until whenever it's later cleaned up. So
// among two candidates where only one has an assignment-debuff rotation
// (the confirmed 1st soaker), the candidate WITHOUT a matching stack-loss
// here is the true partner (their loss got stolen); the one WITH it is
// the intruder who took it. Wider tolerance than ROTATION_TOLERANCE_MS
// since this is corroborating evidence, not the primary signal.
const STOLEN_LOSS_TOLERANCE_MS = 500;

function hasStackLossNear(player: PlayerInfo, timestamp: number): boolean {
  return player.debuffs.some(
    (d) =>
      d.abilityId === SPELLS_TROUBLE_ABILITY_ID &&
      (d.debuffStatus === "removed" || d.debuffStatus === "stackRemoved") &&
      Math.abs(d.timestamp - timestamp) <= STOLEN_LOSS_TOLERANCE_MS
  );
}

/**
 * Given a >2-person tower group, finds the 2-player subset that are the
 * real soakers. Prefers whichever players' debuffs demonstrably rotated
 * at this resolution's consensus instant (decisive on its own, or — when
 * only ONE candidate rotated — corroborated by which of the rest DIDN'T
 * also take an anomalous stack-loss here, see hasStackLossNear above).
 * Falls back to whichever differing-debuff subset's combined distance to
 * their ideal spots is lowest. Returns `decisive: false` when none of
 * these can single out a pair confidently — the caller should leave the
 * group to the (weaker) team-inference fallback rather than risk
 * misattribution.
 */
function pickLegitimatePair(
  group:              TowerSoak[],
  assignments:        AssignmentInterval[],
  tower:              readonly [number, number],
  consensusTimestamp: number | undefined
): { pairIdx: [number, number]; extraIdx: number[]; decisive: boolean } | undefined {
  if (consensusTimestamp !== undefined) {
    const rotatedIdx = group
      .map((_, i) => i)
      .filter(
        (i) =>
          assignments[i].end !== Infinity &&
          Math.abs(assignments[i].end - consensusTimestamp) <= ROTATION_TOLERANCE_MS
      );

    if (
      rotatedIdx.length === 2 &&
      assignments[rotatedIdx[0]].abilityId !== assignments[rotatedIdx[1]].abilityId
    ) {
      const extraIdx = group.map((_, i) => i).filter((i) => !rotatedIdx.includes(i));
      return { pairIdx: [rotatedIdx[0], rotatedIdx[1]], extraIdx, decisive: true };
    }

    if (rotatedIdx.length === 1) {
      const confirmedIdx = rotatedIdx[0];
      const others = group.map((_, i) => i).filter((i) => i !== confirmedIdx);
      const withoutAnomalousLoss = others.filter(
        (i) => !hasStackLossNear(group[i].player, consensusTimestamp)
      );

      if (
        withoutAnomalousLoss.length === 1 &&
        assignments[confirmedIdx].abilityId !== assignments[withoutAnomalousLoss[0]].abilityId
      ) {
        const partnerIdx = withoutAnomalousLoss[0];
        const extraIdx = group.map((_, i) => i).filter((i) => i !== confirmedIdx && i !== partnerIdx);
        return { pairIdx: [confirmedIdx, partnerIdx], extraIdx, decisive: true };
      }
    }
  }

  const PAIR_FIT_MARGIN = 150;
  const scored: Array<{ pair: [number, number]; score: number }> = [];
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      if (assignments[i].abilityId === assignments[j].abilityId) continue;
      const spotI = expectedSpotFor(assignments[i].abilityId, assignments[j].abilityId);
      const spotJ = expectedSpotFor(assignments[j].abilityId, assignments[i].abilityId);
      const distI = spotI !== undefined ? distToIdealSpot(group[i], spotI, tower) : Infinity;
      const distJ = spotJ !== undefined ? distToIdealSpot(group[j], spotJ, tower) : Infinity;
      scored.push({ pair: [i, j], score: distI + distJ });
    }
  }
  if (scored.length === 0) return undefined;

  scored.sort((a, b) => a.score - b.score);
  const best = scored[0];
  const runnerUp = scored[1];
  const decisive = runnerUp === undefined || runnerUp.score - best.score > PAIR_FIT_MARGIN;

  const extraIdx = group.map((_, i) => i).filter((i) => !best.pair.includes(i));
  return { pairIdx: best.pair, extraIdx, decisive };
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

/**
 * Best-effort position for a player at a given moment, for players who
 * aren't necessarily taking damage right then (an idle Forsaken cone-bait
 * candidate has no soak of their own to snapshot from). Checks damageTaken
 * first (most precise when available), then falls back to incoming heals —
 * an idle player is almost always getting topped by raid healing nearby,
 * and FFLogs reports the heal TARGET's own position on those events too.
 * Returns the closest-in-time match within the window, or undefined if
 * neither stream has anything close enough to trust.
 */
function findNearestPosition(
  player:    PlayerInfo,
  timestamp: number,
  windowMs:  number
): { x: number; y: number } | undefined {
  let best: { x: number; y: number; delta: number } | undefined;
  const consider = (t: number, x: number | undefined, y: number | undefined) => {
    if (x === undefined || y === undefined) return;
    const delta = Math.abs(t - timestamp);
    if (delta > windowMs) return;
    if (best === undefined || delta < best.delta) best = { x, y, delta };
  };
  for (const e of player.damageTaken) consider(e.timestamp, e.x, e.y);
  for (const e of player.healing) consider(e.timestamp, e.x, e.y);
  return best;
}

function detectWrongTowerPositionErrors(
  players:            PlayerInfo[],
  expectedTimestamps: Map<string, number>,
  deathEvents:        DeathEvent[] = []
): { errors: PullError[]; confirmedLegitKeys: Set<string>; misattributedConeDeaths: Set<string> } {
  // Every PoL hit that carries the tower instance and a position snapshot.
  const soaks: TowerSoak[] = [];
  for (const player of players) {
    for (const e of player.damageTaken) {
      if (e.abilityId !== PATH_OF_LIGHT_ABILITY_ID) continue;
      if (e.sourceInstance === undefined || e.x === undefined || e.y === undefined) continue;
      soaks.push({ player, timestamp: e.timestamp, towerInstance: e.sourceInstance, x: e.x, y: e.y });
    }
  }
  if (soaks.length === 0) return { errors: [], confirmedLegitKeys: new Set(), misattributedConeDeaths: new Set() };

  // Every 47808 (Stack follow-up) hit on anyone, keeping the ability's own
  // sourceInstance — used below to reconstruct each Stack volley's full
  // victim list (see the Stack-clip section near the pair loop).
  type StackHit = { timestamp: number; instance: number | undefined; actorId: number };
  const stackHits: StackHit[] = [];
  for (const player of players) {
    for (const e of player.damageTaken) {
      if (e.abilityId !== STACK_FOLLOWUP_ABILITY_ID) continue;
      stackHits.push({ timestamp: e.timestamp, instance: e.sourceInstance, actorId: player.actorId });
    }
  }

  // Every planted-cone (47810) hit on a player, with the victim's distance
  // from arena center — the outcome evidence for the flare check (see the
  // flare-outcome comment above the spot table).
  const coneHits: Array<{ timestamp: number; victimCenterDist: number; actorId: number }> = [];
  for (const player of players) {
    for (const e of player.damageTaken) {
      if (e.abilityId !== CONE_FOLLOWUP_ABILITY_ID) continue;
      if (e.x === undefined || e.y === undefined) continue;
      coneHits.push({
        timestamp:        e.timestamp,
        victimCenterDist: Math.hypot(e.x - ARENA_CENTER, e.y - ARENA_CENTER),
        actorId:          player.actorId,
      });
    }
  }

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

  // Every player confirmed (by debuff+geometry, not timestamp-based team
  // inference) to be a legitimate soaker of SOME tower at a given
  // consensus/cluster timestamp — populated once `pairs` is finalized for
  // each resolution below. Handed back to detectOvercrowdedTowerErrors so
  // it doesn't re-flag someone this function already proved innocent under
  // a mis-inferred team (see the comment on that function).
  const confirmedLegitKeys = new Set<string>();

  // A resolution is compromised — and the cone-bait-too-far check below
  // sits out — once a death has already landed shortly beforehand (mirrors
  // the wipe-suppression convention used in blackhole.ts). Observed for
  // real (report Bb4wQtHA6VNmkMFq pull 12): a missed tower a few seconds
  // earlier already had the raid collapsing, and the resulting cone hit on
  // the Spread partner is cascade fallout, not a fresh "bait stood too
  // far" mistake — the two idle-ranged candidates it would otherwise
  // implicate are innocent.
  const WIPE_DEATH_WINDOW_MS = 15000;
  const isResolutionCompromised = (t: number): boolean =>
    deathEvents.some((d) => d.timestamp <= t && t - d.timestamp <= WIPE_DEATH_WINDOW_MS);

  // Player names whose death to the Cone follow-up is a MISATTRIBUTED
  // outcome — see the cone-bait-too-far section near the pair loop below —
  // so detectLethalConeBaitErrors doesn't also flag them as "stood too
  // close" when the real cause is someone else entirely.
  const misattributedConeDeaths = new Set<string>();

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

    // Cone-outcome evidence for this resolution: each Cone (1005086) soaker
    // plants one cone, and every clean cone hits exactly one victim at the
    // far bait spot (r 1012+ observed). More victims than plants, or any
    // victim inside the r=800 ring, means a cone latched the wrong player —
    // the confirmation required before flagging a shallow flare plant.
    const conePlantCount = [...seenPlayers].filter(
      (actorId) => assignmentAt(intervalsByPlayer.get(actorId) ?? [], assignmentQueryTime)?.abilityId === 1005086
    ).length;
    const windowConeHits = coneHits.filter(
      (h) => h.timestamp >= clusterTime && h.timestamp <= clusterTime + CONE_FIRE_WINDOW_MS
    );
    const coneOutcomeBad =
      conePlantCount > 0 &&
      (windowConeHits.length > conePlantCount ||
        windowConeHits.some((h) => h.victimCenterDist < 800));

    // Resolve each tower group to its soakers' held assignment debuffs and
    // its snapped tower position. 2-person groups are the normal case;
    // the 3+1 split (one player joined the wrong tower, leaving their
    // partner to soak alone) is untangled below; anything else is
    // missed-soak / overcrowding territory — already covered by the
    // Phase-1 rules above.
    type TowerGroup = {
      soaks:       TowerSoak[];
      assignments: AssignmentInterval[];
      tower:       readonly [number, number] | undefined;
    };
    const buildGroup = (group: TowerSoak[]): TowerGroup | undefined => {
      const assignments = group.map((s) =>
        assignmentAt(intervalsByPlayer.get(s.player.actorId) ?? [], assignmentQueryTime)
      );
      if (assignments.some((a) => a === undefined)) return undefined;
      return {
        soaks:       group,
        assignments: assignments as AssignmentInterval[],
        tower:       snapToTowerSpawn(group),
      };
    };

    const pairs: TowerGroup[] = [];
    for (const group of towers.values()) {
      if (group.length !== 2) continue;
      const built = buildGroup(group);
      if (built) pairs.push(built);
    }

    const reportTimestamp = consensusTimestamp ?? clusterTime;
    const towerLabel = towerNumber !== undefined ? ` (tower #${towerNumber})` : "";

    // ── The 3+1 split: one soaker joined the wrong tower ──────────────────
    //
    // Observed for real: three players stacked into one tower while the
    // fourth soaked the other alone (standing, tellingly, at the spot the
    // missing partner's debuff owns). The intruder is identified in two
    // steps: structurally, moving them to the lone tower must leave BOTH
    // towers as valid different-debuff pairs; among structural candidates,
    // geometry decides — the candidate standing farthest from their own
    // debuff's ideal point at the crowded tower is the one who doesn't
    // belong there (in the real case the two candidates measured 420 vs
    // 209, with the legitimate one sitting square in the clean band).
    const groupList = [...towers.values()];
    if (groupList.length === 2 && groupList.some((g) => g.length === 3) && groupList.some((g) => g.length === 1)) {
      const trio = buildGroup(groupList.find((g) => g.length === 3)!);
      const lone = buildGroup(groupList.find((g) => g.length === 1)!);

      if (trio && lone && trio.tower) {
        const loneDebuff = lone.assignments[0];

        // Structural candidates: removing them leaves the trio a valid
        // pair, and they pair validly with the lone soaker.
        const candidates = trio.soaks
          .map((_, i) => i)
          .filter((i) => {
            const moved = trio.assignments[i];
            if (moved.abilityId === loneDebuff.abilityId) return false;
            const remaining = trio.assignments.filter((_, j) => j !== i);
            return remaining[0].abilityId !== remaining[1].abilityId;
          });

        if (candidates.length > 0) {
          // Geometric attribution: the candidate farthest from their own
          // spot's ideal point is the intruder. If the runner-up is within
          // 100 units of the same distance, the call is too close — flag
          // every candidate rather than guess.
          const distances = candidates.map((i) => {
            const partnerDebuffId = trio.assignments.find((a, j) => j !== i && a.abilityId !== trio.assignments[i].abilityId)?.abilityId;
            const spot = expectedSpotFor(trio.assignments[i].abilityId, partnerDebuffId);
            return spot !== undefined ? distToIdealSpot(trio.soaks[i], spot, trio.tower!) : 0;
          });
          const maxDist = Math.max(...distances);
          const intruders = candidates.filter(
            (_, k) => distances[k] > maxDist - 100
          );

          for (const i of intruders) {
            errors.push({
              ruleId:      FORSAKEN_WRONG_POSITION_RULE_ID,
              severity:    "Major",
              name:        "Wrong Tower Position",
              description: `Went to the wrong Forsaken tower${towerLabel}: joined a tower that already had its two soakers, leaving their intended partner to take a tower alone.`,
              timestamp:   reportTimestamp,
              player:      trio.soaks[i].player.name,
              class:       trio.soaks[i].player.className,
              specId:      trio.soaks[i].player.specId,
              role:        trio.soaks[i].player.role,
              abilityId:   trio.assignments[i].abilityId,
              abilityName: trio.assignments[i].abilityName,
            });
          }

          // With the intruder(s) known, the rest of the resolution can be
          // spot-checked as if the towers had been paired properly: the
          // trio minus a single unambiguous intruder is a normal pair, and
          // the lone soaker's intended partner debuff is the intruder's.
          if (intruders.length === 1) {
            const remaining = trio.soaks.filter((_, j) => j !== intruders[0]);
            const remainingBuilt = buildGroup(remaining);
            if (remainingBuilt) pairs.push(remainingBuilt);

            const intruderDebuffId = trio.assignments[intruders[0]].abilityId;
            const expected = expectedSpotFor(loneDebuff.abilityId, intruderDebuffId);
            if (expected !== undefined && lone.tower !== undefined &&
                !isAtSpot(lone.soaks[0], expected, lone.tower, undefined)) {
              errors.push({
                ruleId:      FORSAKEN_WRONG_SPOT_RULE_ID,
                severity:    "Major",
                name:        "Wrong Spot In Tower",
                description: `Soaked the right Forsaken tower${towerLabel} but stood at the wrong spot for their debuff — ${describeStanding(lone.soaks[0], lone.tower)} instead of ${SPOT_PHRASES[expected]} — misplacing the follow-up aoe planted at their position.`,
                timestamp:   reportTimestamp,
                player:      lone.soaks[0].player.name,
                class:       lone.soaks[0].player.className,
                specId:      lone.soaks[0].player.specId,
                role:        lone.soaks[0].player.role,
                abilityId:   loneDebuff.abilityId,
                abilityName: loneDebuff.abilityName,
              });
            }
          }
        }
      }
    }

    // ── Pure overcrowding: no waiting lone partner elsewhere ──────────────
    //
    // A tower sitting at 3+ soakers that ISN'T part of the 3+1 split above
    // (no matching lone group this resolution) means the extra player's
    // real team never got a chance to resolve at all — e.g. the pull
    // wiped after only one team's first tower. See pickLegitimatePair for
    // the geometric method and the real case it was built from.
    const handledAsSplit =
      groupList.length === 2 && groupList.some((g) => g.length === 3) && groupList.some((g) => g.length === 1);

    if (!handledAsSplit) {
      for (const group of towers.values()) {
        if (group.length < 3) continue;
        const built = buildGroup(group);
        if (!built || !built.tower) continue;

        const fit = pickLegitimatePair(built.soaks, built.assignments, built.tower, consensusTimestamp);
        if (!fit || !fit.decisive) continue;

        const [i, j] = fit.pairIdx;
        pairs.push({
          soaks:       [built.soaks[i], built.soaks[j]],
          assignments: [built.assignments[i], built.assignments[j]],
          tower:       built.tower,
        });

        for (const idx of fit.extraIdx) {
          const soak = built.soaks[idx];
          errors.push({
            ruleId:      FORSAKEN_EXTRA_PLAYER_RULE_ID,
            severity:    "Major",
            name:        "Extra Player In Tower",
            description: `Stood in a Forsaken tower${towerLabel} that already had its two legitimate soakers (confirmed by debuff + position), turning it into a 3+ person tower.`,
            timestamp:   reportTimestamp,
            player:      soak.player.name,
            class:       soak.player.className,
            specId:      soak.player.specId,
            role:        soak.player.role,
            abilityId:   built.assignments[idx].abilityId,
            abilityName: built.assignments[idx].abilityName,
          });
        }
      }
    }

    // Every soaker in a resolved pair (natural 2-person, 3+1-split
    // remainder, or pure-overcrowding remainder) is proven legitimate —
    // record them before the rule checks below so detectOvercrowdedTowerErrors
    // can trust it over its own weaker team inference.
    for (const pair of pairs) {
      for (const soak of pair.soaks) {
        confirmedLegitKeys.add(`${soak.player.actorId}@${reportTimestamp}`);
      }
    }

    for (const pair of pairs) {
      const [a, b] = pair.assignments;

      if (a.abilityId === b.abilityId) {
        // Rule (1) — same-debuff pair: someone here swapped with the other
        // tower. The intended partner debuff is only knowable when the
        // resolution's other tower is ALSO a same-debuff pair (a straight
        // two-player swap breaks both towers symmetrically — the observed
        // real-log case).
        const other = pairs.find((p) => p !== pair);
        const otherIsSamePair =
          other !== undefined && other.assignments[0].abilityId === other.assignments[1].abilityId;
        const partnerDebuffId = otherIsSamePair ? other!.assignments[0].abilityId : undefined;

        const expectedSpot = expectedSpotFor(a.abilityId, partnerDebuffId);
        const atOwnSpot = pair.soaks.map(
          (s, i) =>
            expectedSpot !== undefined &&
            pair.tower !== undefined &&
            isAtSpot(s, expectedSpot, pair.tower, pair.soaks[1 - i])
        );

        // Exactly one soaker standing at their own debuff's spot → the
        // other one is the player who went to the wrong tower. Anything
        // murkier → flag both rather than guess.
        const culprits =
          atOwnSpot[0] !== atOwnSpot[1]
            ? [pair.soaks[atOwnSpot[0] ? 1 : 0]]
            : pair.soaks;

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
        continue;
      }

      // Rule (2) — correctly-paired tower: verify each soaker stands at
      // their own debuff's spot, since their follow-up aoe is planted at
      // their exact soak position (a misplaced plant re-aims the aoe at
      // the wrong bait — the observed case cleaved five players).
      if (pair.tower === undefined) continue;

      pair.soaks.forEach((soak, i) => {
        const debuff   = pair.assignments[i];
        const partner  = pair.assignments[1 - i];
        const expected = expectedSpotFor(debuff.abilityId, partner.abilityId);
        if (expected === undefined) return;

        if (isAtSpot(soak, expected, pair.tower!, pair.soaks[1 - i])) return;

        // A shallow flare plant is only an error when the cone actually
        // misbehaved — a clean pull planted one at just 96 from the tower
        // (r 894) and the cone still hit only its far bait (see the
        // flare-outcome comment above the spot table).
        if (expected === "flare" && !coneOutcomeBad) return;

        errors.push({
          ruleId:      FORSAKEN_WRONG_SPOT_RULE_ID,
          severity:    "Major",
          name:        "Wrong Spot In Tower",
          description: `Soaked the right Forsaken tower${towerLabel} but stood at the wrong spot for their debuff — ${describeStanding(soak, pair.tower!)} instead of ${SPOT_PHRASES[expected]} — misplacing the follow-up aoe planted at their position.`,
          timestamp:   reportTimestamp,
          player:      soak.player.name,
          class:       soak.player.className,
          specId:      soak.player.specId,
          role:        soak.player.role,
          abilityId:   debuff.abilityId,
          abilityName: debuff.abilityName,
        });
      });

      // ── Stack clip: the soak partner strayed into the Stack plant ────────
      //
      // The two rules above already confirm both soakers cleared their own
      // spot's distance thresholds — but those thresholds only check
      // distance from the tower/center, not from EACH OTHER. Observed for
      // real (report rXBbzFV49hd1QPwf pull 10): a Spread partner sat well
      // inside their own "outer" distance-to-center requirement, yet still
      // ended up only ~493 units from the Stack holder — close enough to be
      // swept into the plant's blast (a clean Stack+Cone pairing the same
      // pull kept its partner 712 away). The extra body pushed that
      // volley's hit count to 4 instead of the design's 3, and the split
      // that normally keeps everyone alive broke down: the Stack holder
      // (standing exactly where their debuff requires) and the too-close
      // partner both died outright, while the pull's other two players hit
      // by the same volley (ordinary idle teammates, not soakers) survived
      // on the normal shared amount.
      //
      // So this is gated the same way as the cone-bait rule: geometry alone
      // (a single "safe" partner-to-holder distance) isn't trustworthy off
      // one sample, so the flag requires the OUTCOME to have actually gone
      // bad — the partner died to 47808 AND that volley hit more than the
      // clean design's 3 people. The Stack holder itself is never flagged:
      // they stood at their own required spot, same as any clean pull.
      const stackIdx = pair.assignments.findIndex((a) => a.abilityId === STACK_ASSIGNMENT_DEBUFF_ID);
      if (stackIdx !== -1) {
        const holderSoak  = pair.soaks[stackIdx];
        const partnerSoak = pair.soaks[1 - stackIdx];

        const partnerDeath = deathEvents.find(
          (d) =>
            d.player === partnerSoak.player.name &&
            d.killingAbilityGameId === STACK_FOLLOWUP_ABILITY_ID &&
            d.timestamp >= reportTimestamp &&
            d.timestamp <= reportTimestamp + STACK_CLIP_DEATH_WINDOW_MS
        );

        if (partnerDeath) {
          // Reconstruct the volley the Stack holder's own plant fired in,
          // via its sourceInstance, to get the true victim headcount.
          const holderHit = stackHits.find(
            (h) =>
              h.actorId === holderSoak.player.actorId &&
              h.timestamp >= reportTimestamp &&
              h.timestamp <= reportTimestamp + STACK_CLIP_DEATH_WINDOW_MS
          );

          if (holderHit && holderHit.instance !== undefined) {
            const volleyVictims = new Set(
              stackHits
                .filter(
                  (h) =>
                    h.instance === holderHit.instance &&
                    Math.abs(h.timestamp - holderHit.timestamp) <= STACK_VOLLEY_GAP_MS
                )
                .map((h) => h.actorId)
            );

            if (volleyVictims.size > 3) {
              errors.push({
                ruleId:      FORSAKEN_LETHAL_STACK_CLIP_RULE_ID,
                severity:    "Major",
                name:        "Stack Clipped Too Close",
                description: `Stood too close to a planted Forsaken stack${towerLabel} while soaking alongside the Stack holder — the extra body broke the aoe's 3-player split and its full, unmitigated damage killed them outright.`,
                timestamp:   partnerDeath.timestamp,
                player:      partnerSoak.player.name,
                class:       partnerSoak.player.className,
                specId:      partnerSoak.player.specId,
                role:        partnerSoak.player.role,
                abilityId:   STACK_FOLLOWUP_ABILITY_ID,
                abilityName: "Forsaken Stack",
              });
            }
          }
        }
      }

      // ── Cone bait too far: the wrong (soaking) player caught the cone ────
      //
      // The Cone follow-up (47810) fires at the closest player in
      // proximity — but on every confirmed-clean Cone+Spread pairing across
      // three real reports (80+ resolutions surveyed), that closest player
      // is NEVER the tower's own Spread partner (who's deliberately far
      // away, per Spread's "outer"/isolation requirement — see the spot
      // table). It's always a THIRD, idle non-melee ("ranged") player from
      // the OTHER team, standing deliberately close (clean band ~410-670
      // units from the Cone holder) to intentionally bait the cone away
      // from the raid. Confirmed for real (report VtdBqhLQkWJXMvDg pull 5):
      // when that designated bait stands just barely too far (674 units —
      // a hair past the clean maximum), the Spread partner becomes the
      // closest player instead and takes the point-blank one-shot meant
      // for the bait. The Spread partner did nothing wrong (they were
      // exactly where Spread requires); the actual mistake is the bait's
      // positioning.
      //
      // Attribution needs no distance threshold at all: whichever idle
      // non-melee player ISN'T already accounted for as a DIFFERENT cone's
      // victim this same resolution (the raid's other simultaneous
      // Cone+Spread tower has its own bait, confirmed hit) is the one who
      // should have been standing close enough to take this one instead.
      const coneIdx = pair.assignments.findIndex((a) => a.abilityId === 1005086);
      if (coneIdx !== -1 && pair.assignments[1 - coneIdx].abilityId === 1005085) {
        const holderSoak  = pair.soaks[coneIdx];
        const partnerSoak = pair.soaks[1 - coneIdx];

        const partnerDeath = deathEvents.find(
          (d) =>
            d.player === partnerSoak.player.name &&
            d.killingAbilityGameId === CONE_FOLLOWUP_ABILITY_ID &&
            d.timestamp >= reportTimestamp &&
            d.timestamp <= reportTimestamp + CONE_FIRE_WINDOW_MS + PATH_OF_LIGHT_WINDOW_MS
        );

        if (partnerDeath) {
          // The Spread partner is innocent either way (they were exactly
          // where their debuff requires) — always keep the OLD "stood too
          // close" rule from re-flagging them, even when the resolution
          // turns out to be too compromised by wipe chaos to confidently
          // name the real bait below.
          misattributedConeDeaths.add(partnerSoak.player.name);

          if (isResolutionCompromised(reportTimestamp)) continue;

          const alreadyAccountedFor = new Set(
            coneHits
              .filter(
                (h) =>
                  h.timestamp >= clusterTime &&
                  h.timestamp <= clusterTime + CONE_FIRE_WINDOW_MS &&
                  h.actorId !== partnerSoak.player.actorId
              )
              .map((h) => h.actorId)
          );

          const candidates = players.filter(
            (p) =>
              !seenPlayers.has(p.actorId) &&
              p.rangeType !== "Melee" &&
              !alreadyAccountedFor.has(p.actorId)
          );

          // The partner's OWN cone-hit record (not their earlier PoL soak
          // position) is the precise distance that actually killed them —
          // fall back to the soak position only if that hit is missing.
          const partnerHit = partnerSoak.player.damageTaken.find(
            (e) =>
              e.abilityId === CONE_FOLLOWUP_ABILITY_ID &&
              Math.abs(e.timestamp - partnerDeath.timestamp) <= CONE_FIRE_WINDOW_MS &&
              e.x !== undefined &&
              e.y !== undefined
          );
          const partnerDist = Math.round(
            Math.hypot(
              (partnerHit?.x ?? partnerSoak.x) - holderSoak.x,
              (partnerHit?.y ?? partnerSoak.y) - holderSoak.y
            )
          );

          for (const candidate of candidates) {
            // Best-effort position for the candidate at the moment of the
            // plant: they're idle, so damageTaken is usually empty — fall
            // back to their own incoming-heal position (see PlayerEvent.x/y
            // on the healing tab, added for exactly this case), since an
            // idle bait candidate is almost always getting topped by raid
            // heals nearby. Distance omitted from the description if
            // neither source has anything close enough in time.
            const candidatePos = findNearestPosition(candidate, reportTimestamp, CONE_FIRE_WINDOW_MS + PATH_OF_LIGHT_WINDOW_MS);
            const candidateDist =
              candidatePos !== undefined
                ? Math.round(Math.hypot(candidatePos.x - holderSoak.x, candidatePos.y - holderSoak.y))
                : undefined;

            const distanceNote =
              candidateDist !== undefined
                ? ` (stood ~${candidateDist} units away — too far to be the closest player, versus ${partnerSoak.player.name}'s ~${partnerDist})`
                : ` (${partnerSoak.player.name} ended up the closest player instead, at ~${partnerDist} units)`;

            errors.push({
              ruleId:      FORSAKEN_CONE_BAIT_TOO_FAR_RULE_ID,
              severity:    "Major",
              name:        "Cone Bait Too Far",
              description: `Should have been standing close enough to draw the Forsaken cone${towerLabel} away from the tower${distanceNote} — instead it latched onto ${partnerSoak.player.name}, the Spread partner soaking alongside the Cone holder, who was never meant to be near it.`,
              timestamp:   partnerDeath.timestamp,
              player:      candidate.name,
              class:       candidate.className,
              specId:      candidate.specId,
              role:        candidate.role,
              abilityId:   CONE_FOLLOWUP_ABILITY_ID,
              abilityName: "Forsaken Cone",
            });
          }
        }
      }
    }
  }

  return { errors, confirmedLegitKeys, misattributedConeDeaths };
}

export const FORSAKEN_LETHAL_STACK_CLIP_RULE_ID = "ffxiv-forsaken-stack-clipped-too-close";
export const FORSAKEN_CONE_BAIT_TOO_FAR_RULE_ID  = "ffxiv-forsaken-cone-bait-too-far";

export const FORSAKEN_LETHAL_CONE_BAIT_RULE_ID = "ffxiv-forsaken-baited-cone-too-close";

// ── Lethal cone bait: standing too close to a planted cone ──────────────────
//
// The 47810 proximity cone fires from its plant at the closest player, and
// its damage scales with how close that player is. A designated bait at
// proper range takes a survivable hit (every clean bait across six logs
// survived, at plant distances anywhere from 175 to 660 — the geometry
// bands of good and bad baits fully overlap, so position alone CANNOT
// flag this). Standing right up against the plant is what kills: the one
// confirmed case took a hit equal to their entire max HP and died two
// seconds later, credited to 47810.
//
// So the rule is outcome-based: a death credited to 47810 where the
// killing cone struck EXACTLY ONE player. The single-victim requirement
// is what separates "bait stood too close" (the victim's own positioning
// error) from a cone that CLEAVED several players — that's the planter's
// misplant (already flagged by the wrong-spot rule) or mid-wipe chaos,
// and its victims are not to blame (observed: a wipe-collapse cone that
// swept four players, killing two — correctly skipped here).
const CONE_FOLLOWUP_VOLLEY_GAP_MS = 1500; // hits of one firing land ~130ms apart; volleys are 10s apart
const CONE_DEATH_WINDOW_MS        = 3000; // fatal hit → death event lag (observed ~2s)

function detectLethalConeBaitErrors(
  players:                 PlayerInfo[],
  deathEvents:             DeathEvent[],
  expectedTimestamps:      Map<string, number>,
  misattributedConeDeaths: Set<string> = new Set()
): PullError[] {
  type ConeHit = { player: PlayerInfo; timestamp: number; instance?: number };
  const coneHits: ConeHit[] = [];
  for (const player of players) {
    for (const e of player.damageTaken) {
      if (e.abilityId !== CONE_FOLLOWUP_ABILITY_ID) continue;
      coneHits.push({ player, timestamp: e.timestamp, instance: e.sourceInstance });
    }
  }
  if (coneHits.length === 0) return [];

  // Group hits into per-cone firings: same source instance, close in time
  // (instances are reused across resolutions, so time matters too).
  coneHits.sort((a, b) => a.timestamp - b.timestamp);
  const volleys: ConeHit[][] = [];
  for (const hit of coneHits) {
    const current = volleys.find(
      (v) =>
        v[0].instance === hit.instance &&
        hit.timestamp - v[v.length - 1].timestamp <= CONE_FOLLOWUP_VOLLEY_GAP_MS
    );
    if (current) current.push(hit);
    else volleys.push([hit]);
  }

  const errors: PullError[] = [];

  for (const death of deathEvents) {
    if (death.killingAbilityGameId !== CONE_FOLLOWUP_ABILITY_ID) continue;

    // Already explained (and correctly attributed elsewhere) by
    // detectWrongTowerPositionErrors's cone-bait-too-far check: this
    // victim was the Cone holder's own Spread partner, not someone who
    // stood too close of their own accord — see that function's comment.
    if (misattributedConeDeaths.has(death.player)) continue;

    // The volley containing the fatal hit on this player.
    const volley = volleys.find((v) =>
      v.some(
        (h) =>
          h.player.name === death.player &&
          death.timestamp - h.timestamp >= 0 &&
          death.timestamp - h.timestamp <= CONE_DEATH_WINDOW_MS
      )
    );
    if (!volley) continue;

    const distinctVictims = new Set(volley.map((h) => h.player.actorId));
    if (distinctVictims.size !== 1) continue; // a cleave — the planter's error, not the bait's

    const victimHit = volley.find((h) => h.player.name === death.player)!;

    // Tower label: the resolution whose consensus stack-loss immediately
    // precedes this volley (cones fire ~1.2s after their own resolution).
    let towerLabel = "";
    for (const [key, consensus] of expectedTimestamps) {
      const delta = victimHit.timestamp - consensus;
      if (delta < 0 || delta > PATH_OF_LIGHT_WINDOW_MS + 1500) continue;
      const [team, slotIndexStr] = key.split("-") as ["first" | "second", string];
      const towerNumber = (team === "first" ? TOWER_ORDER_FIRST_TEAM : TOWER_ORDER_SECOND_TEAM)[Number(slotIndexStr)];
      if (towerNumber !== undefined) towerLabel = ` (tower #${towerNumber})`;
      break;
    }

    errors.push({
      ruleId:      FORSAKEN_LETHAL_CONE_BAIT_RULE_ID,
      severity:    "Major",
      name:        "Baited Cone Too Close",
      description: `Stood too close to a planted Forsaken cone${towerLabel} — the proximity aoe latched onto them at point-blank range, and its distance-scaled damage killed them outright.`,
      timestamp:   victimHit.timestamp,
      player:      victimHit.player.name,
      class:       victimHit.player.className,
      specId:      victimHit.player.specId,
      role:        victimHit.player.role,
      abilityId:   CONE_FOLLOWUP_ABILITY_ID,
      abilityName: "Forsaken Cone",
    });
  }

  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
