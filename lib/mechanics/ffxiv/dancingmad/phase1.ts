// lib/mechanics/ffxiv/dancingmad/phase1.ts
//
// Encounter-specific error detection for Phase 1 of FFXIV's Dancing Mad
// (Kefka's Return) ultimate — everything up through the phase transition
// at roughly 3:25 (205s) into the fight.
//
// ── BLIZZARD III BLOWOUT SILENT KILL (confirmed 2026-07, VtdBqhLQkWJXMvDg) ──
//
// Blizzard III Blowout (ability IDs vary — 47765/47768/47771/47774, all
// sharing the in-game name "Blizzard III Blowout") normally punishes a
// missed mechanic by applying Damage Down (1002911), already caught by the
// generic `ffxiv-damage-down` rule in error-rules.ts. Confirmed across
// every OTHER hit by this ability in this report: every survivor picked up
// Damage Down at the same instant as the hit. But when the hit is also the
// killing blow, the debuff application can lose the race with death and
// never actually land — the generic rule then has nothing to fire on, even
// though the mechanic was clearly missed. This rule covers that gap the
// same way exdeath.ts's Shockwave silent-kill check does: a death credited
// to Blizzard III Blowout with no preceding Damage Down application is
// flagged directly.
//
// ── JUMPED OFF THE ARENA (confirmed 2026-07, same report) ──────────────────
//
// When Phase 1 goes badly enough that the raid calls it, players commonly
// jump off the arena's edge to force an instant wipe/reset rather than
// waiting out the boss's remaining kit. FFLogs logs this as a "death" event
// with sourceID -1 and no killingAbilityGameID — fflTransformDeath already
// resolves that combination to DeathEvent.cause "Environmental" (no other
// death shape reaches this code path here; every other confirmed cause in
// this report's Phase 1 carries a real killingAbilityGameId). Once one
// player jumps, the rest of the raid typically follows suit within a few
// seconds — those are fallout of the same decision, not independent
// mistakes, so only the FIRST such death in Phase 1 gets a Raid-severity
// error naming that player; every later one in the same pull is suppressed.
//
// **Exception (confirmed 2026-07-22, report G7kTFVxjcAC6p1MN, pull 1):** a
// player who already has a Damage Down debuff (1002911) at the moment they
// jump is deliberately clearing that debuff, not signaling a raid reset —
// jumping is a valid, intentional fix for a mistake they already made and
// are now correcting. That jump is excluded from consideration entirely
// (not flagged, and doesn't count as "the first jump" for suppression
// purposes) — the rule only looks for the first jump among players who did
// NOT have Damage Down at the time.
//
// ── WAVE CANNON OUT OF POSITION (confirmed 2026-07, same report, pull 4) ───
//
// Wave Cannon (47784) hits exactly 4 players — one per fixed arena spot —
// while the other 4 handle towers elsewhere. Each of the 8 possible spots
// is tied to a specific JOB, not a specific person or a rotating debuff:
// across every clean resolution in this report (21 of 22 pulls), whichever
// player happened to be playing a given job always took Wave Cannon at the
// same spot (centi-yalm coordinates, tight to within ~1.5 yalms of natural
// standing jitter) — see WAVE_CANNON_JOB_POSITIONS. FFLogs' `sourceInstance`
// on each hit identifies which of the 4 concurrent beams landed on a
// target; a clean hit is always exactly one instance per player. The one
// confirmed failure (pull 4): the Viper stood ~6.9 yalms off their own
// job's spot, well inside the neighboring Pictomancer's beam — both players
// took TWO distinct sourceInstance hits that volley (their own plus each
// other's overlap) and both died. Detection is gated on that overlap
// outcome (2+ distinct instances hitting the same target in one volley),
// per this codebase's usual "gate on outcome, use position for attribution"
// approach — a player standing slightly off their spot with no overlap
// isn't flagged. Among the overlapping players, only the one whose ACTUAL
// position deviates well beyond normal jitter from their own job's spot is
// named; a victim who was standing correctly and just got caught by a
// neighbor's mistake is not flagged (this codebase's root-cause-only
// attribution philosophy).
//
// Known open item: 3 other pulls in this report (9, 13, 18) show one job
// each landing at a visibly different spot with no confirmed VOD ground
// truth and no overlap/death — left unexplained rather than guessed at;
// WAVE_CANNON_JOB_POSITIONS was built excluding those outliers.
//
// ── WAVE CANNON TOWER OVERLAP (confirmed 2026-07-22, same report, pull 12) ─
//
// Each of the 4 Wave Cannon carriers drops a tower (47786) at their own
// feet the instant they're hit — 4 concurrent tower NPCs (sourceInstance
// 1-4), resolving ~3s later onto whichever of the OTHER 4 players is
// standing at that spot to soak it. Clean: 4 towers, 4 distinct soakers,
// one hit each. Confirmed failure (pull 12): the Pictomancer (Ayumi Emi)
// stood in the crossing point between two towers' soak spots and was hit
// by BOTH (sourceInstance 3 and 4, 43ms apart) — one tower's worth of
// damage would have been fine, but taking two killed her. Detection is
// gated purely on that outcome (2+ distinct tower instances hitting one
// target) — the same "gate on outcome" approach as Wave Cannon itself
// above, just without a position table (there's no single "wrong spot" to
// measure against; standing between two towers is the mistake).
//
// Self-gates on the mechanic having actually resolved cleanly: exactly 4
// distinct players hit by Wave Cannon itself, none of whom died before
// their own tower could resolve. Both other overlap-shaped pulls in this
// report (4, 13) turned out to be fallout of an EARLIER, already-flagged
// problem rather than a fresh tower mistake — pull 4's Wave Cannon
// mis-position (see above) killed 2 of the 4 carriers outright, and pull 13
// had already lost players to an earlier mechanic (Graven Image) before
// Wave Cannon even fired; both leave too few live carriers to cover 4
// towers, scrambling who gets hit by what. Excluding both keeps this rule
// to the one genuinely fresh positioning mistake it was built for.
//
// ── TELE-TROUNCING ARROW PLACEMENT (confirmed 2026-07, pulls 6/15) ─────────
//
// At ~2:33, all 8 players get 2 stacks of "Tele-Portent" (8 distinct ability
// IDs — 4 cardinal directions x 2 duration tiers, ~7s and ~10s — see
// TELE_PORTENT_DIRECTION_BY_ABILITY_ID). When a stack's timer runs out, it
// drops a directional arrow on the ground at the player's CURRENT position
// (confirmed by cross-checking analyzer.wtfdig.info's own reverse-engineered
// formula — see below). All 16 arrows (8 players x 2) must form one
// continuous clockwise loop around the arena's outer ring so the raid can
// teleport through it without landing on/killing a confused teammate.
//
// The loop lives on a fixed 5-point grid per axis (yalms, relative to arena
// center 10000,10000): -12, -6, 0, +6, +12 — the outer ring of that 5x5
// grid (16 cells: 4 corners + 4 edges x 3 middle cells) is exactly the 16
// arrow slots. Each edge has its own fixed flow direction (clockwise): the
// N edge (y=-12) flows E, the E edge (x=+12) flows S, the S edge (y=+12)
// flows W, the W edge (x=-12) flows N. A player's assignment is fully
// determined by their own 2 debuff directions, independent of every other
// player — no cross-player resolution needed:
//   - SAME direction twice ("double-D"): their 2 arrows fill the 2 middle
//     cells of D's edge that AREN'T claimed by a neighboring corner's
//     approach arrow (see ARROW_DOUBLE_SLOTS_BY_DIRECTION).
//   - TWO DIFFERENT directions ("corner player"): the pair is always one of
//     4 valid clockwise-adjacent combinations (see ARROW_CORNER_TABLE), each
//     mapping to exactly one arena corner. One direction (the edge that
//     STARTS there, continuing the clockwise flow) occupies the corner cell
//     itself; the other (the edge that ENDS there) occupies that edge's
//     middle cell closest to the corner, pointing into it — e.g. an E+S
//     player's S arrow sits in the NE corner while their E arrow sits one
//     cell west of it along the N edge, pointing east into the corner.
//
// Position is sampled the same way analyzer.wtfdig.info's own bundle does
// (reverse-engineered by fetching and reading its minified JS, same
// technique as blackhole-strategy.ts's cardinal-direction work): the
// player's x/y from whichever damageTaken/healing event is CLOSEST in time
// to their Tele-Portent removedebuff. Verified byte-for-byte (to a decimal
// place) against the analyzer's own displayed table for pull 6.
//
// Confirmed failure (pull 6): the Dark Knight's pair was (E, S) — the NE
// corner — but both arrows landed on the arena's WEST side instead (14-21
// yalms from their expected slots), an entirely different corner, not just
// an adjacent-slot slip. Every other player in every other pull sampled
// (21 of 22) deviates under 6 yalms from their predicted slot (one
// consistently "sloppy" Paladin included) — see
// ARROW_OUT_OF_POSITION_THRESHOLD_YALMS for where the line is drawn.
//
// Graven Image's spread mechanic (~0:38, cast "Graven Image", 48370) lives
// in its own file, graven-image.ts, NOT here — unlike everything else in
// this module, its "ideal position" can't be hardcoded: which specific job
// occupies which physical spot is a raid's own strategy choice (confirmed
// by cross-report testing — a different report's White Mage/Paladin stood
// somewhere completely different from this report's, consistently, not by
// mistake). It's cross-pull/learned-per-report instead, same reason
// blackhole-strategy.ts is split out from blackhole.ts.

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { PullError } from "@/types/PullError";
import type { DeathEvent } from "@/types/DeathEvent";

export const BLIZZARD_III_SILENT_KILL_RULE_ID = "ffxiv-phase1-blizzard3-silent-kill";
export const JUMPED_OFF_ARENA_RULE_ID          = "ffxiv-phase1-jumped-off-arena";
export const WAVE_CANNON_OUT_OF_POSITION_RULE_ID = "ffxiv-phase1-wave-cannon-out-of-position";
export const WAVE_CANNON_TOWER_OVERLAP_RULE_ID   = "ffxiv-phase1-wave-cannon-tower-overlap";
export const TELE_TROUNCING_ARROW_RULE_ID = "ffxiv-phase1-tele-trouncing-arrow-misplaced";

const BLIZZARD_III_BLOWOUT_ABILITY_IDS = new Set([47765, 47768, 47771, 47774]);
const DAMAGE_DOWN_ABILITY_ID = 1002911;

// Phase 1 runs roughly 0-205s (the "~3:25" phase transition the user's own
// mitigation plan already anchors on — see mitigation-plans/ikuya.json's
// phaseTimeSeconds: 205 entry for Phase 2's start). Generous past that
// point costs nothing (a genuine jump this late would still be a fair
// catch), so this is a soft upper bound, not a tight one.
const PHASE_1_END_MS = 210_000;

const WAVE_CANNON_ABILITY_ID = 47784;

// Volley hits on different targets land within tens of ms of each other on
// real logs (observed: <50ms apart); generous without risking merging two
// genuinely separate Wave Cannon activations (which never recur this close
// together in Phase 1).
const WAVE_CANNON_VOLLEY_CLUSTER_MS = 250;

// Each job's fixed Wave Cannon spot, centi-yalms (arena center 10000,10000)
// — centroid of every clean hit in this report (outliers >4y from the
// per-job median excluded; see module comment). Natural per-pull jitter
// within a job's own clean cluster tops out around 1.5 yalms (150).
const WAVE_CANNON_JOB_POSITIONS: Readonly<Record<string, { x: number; y: number }>> = {
  "Dancer":      { x: 11762, y: 9853 },
  "Viper":       { x: 10694, y: 10353 },
  "White Mage":  { x: 8767,  y: 10030 },
  "Sage":        { x: 8213,  y: 10063 },
  "Pictomancer": { x: 11219, y: 10011 },
  "Dark Knight": { x: 9261,  y: 10036 },
  "Reaper":      { x: 10186, y: 10668 },
  "Paladin":     { x: 9613,  y: 10427 },
};

// Comfortably above the ~1.5-yalm natural jitter seen in every clean job
// cluster, comfortably below the confirmed failure's ~6.9-yalm deviation.
const WAVE_CANNON_OUT_OF_POSITION_THRESHOLD_CENTIYALMS = 400;

// The tower each of the 4 Wave Cannon carriers drops at their own feet the
// instant they're hit (begincast fires at the same timestamp as the Wave
// Cannon hit itself), resolving ~3s later onto whichever of the other 4
// players is standing there to soak it — see WAVE_CANNON_TOWER_OVERLAP
// module comment below.
const WAVE_CANNON_TOWER_ABILITY_ID = 47786;

type Cardinal = "N" | "E" | "S" | "W";
type Point = { x: number; y: number };

// abilityId -> which cardinal direction the resulting arrow points. Each
// direction has a short (~7s) and long (~10s) duration variant, which is
// why there are 8 IDs for 4 directions — see module header.
const TELE_PORTENT_DIRECTION_BY_ABILITY_ID: Readonly<Record<number, Cardinal>> = {
  1004876: "N", 1005079: "N",
  1004878: "E", 1005081: "E",
  1004877: "S", 1005080: "S",
  1004879: "W", 1005082: "W",
};

// The short-duration debuffs on all 8 players expire within ~100ms of each
// other, then the long-duration ones ~3s later — comfortably inside this
// window without risking merging the two waves together.
const TELE_PORTENT_WAVE_CLUSTER_MS = 1500;

const ARROW_GRID_FAR_YALMS = 12;
const ARROW_GRID_MID_YALMS = 6;

// sorted-pair key -> which of the 2 directions occupies the corner cell
// itself (the edge that STARTS its clockwise flow there) vs. the adjacent
// edge's middle cell closest to that corner (the edge that ENDS there),
// plus the corner cell's [signX, signY] — see module header for the
// underlying rule. Only these 4 combinations are valid; any other pairing
// (e.g. opposite directions N+S) never occurs in real data.
const ARROW_CORNER_TABLE: Readonly<Record<string, { cornerDir: Cardinal; approachDir: Cardinal; signX: number; signY: number }>> = {
  "E,N": { cornerDir: "E", approachDir: "N", signX: -1, signY: -1 }, // NW
  "E,S": { cornerDir: "S", approachDir: "E", signX: 1,  signY: -1 }, // NE
  "S,W": { cornerDir: "W", approachDir: "S", signX: 1,  signY: 1 },  // SE
  "N,W": { cornerDir: "N", approachDir: "W", signX: -1, signY: 1 },  // SW
};

function predictCornerSlots(d1: Cardinal, d2: Cardinal) {
  const key = [d1, d2].sort().join(",");
  const c = ARROW_CORNER_TABLE[key];
  if (!c) return null;
  const cornerPos: Point = { x: c.signX * ARROW_GRID_FAR_YALMS, y: c.signY * ARROW_GRID_FAR_YALMS };
  const approachPos: Point = c.approachDir === "N" || c.approachDir === "S"
    ? { x: c.signX * ARROW_GRID_FAR_YALMS, y: c.signY * ARROW_GRID_MID_YALMS }
    : { x: c.signX * ARROW_GRID_MID_YALMS, y: c.signY * ARROW_GRID_FAR_YALMS };
  return { cornerDir: c.cornerDir, cornerPos, approachDir: c.approachDir, approachPos };
}

// A "double-D" player's 2 arrows fill whichever 2 of D's edge's 3 middle
// cells aren't already claimed by a neighboring corner's approach arrow.
function predictDoubleSlots(dir: Cardinal): [Point, Point] {
  switch (dir) {
    case "N": return [{ x: -ARROW_GRID_FAR_YALMS, y: 0 }, { x: -ARROW_GRID_FAR_YALMS, y: ARROW_GRID_MID_YALMS }];
    case "E": return [{ x: -ARROW_GRID_MID_YALMS, y: -ARROW_GRID_FAR_YALMS }, { x: 0, y: -ARROW_GRID_FAR_YALMS }];
    case "S": return [{ x: ARROW_GRID_FAR_YALMS, y: -ARROW_GRID_MID_YALMS }, { x: ARROW_GRID_FAR_YALMS, y: 0 }];
    case "W": return [{ x: 0, y: ARROW_GRID_FAR_YALMS }, { x: ARROW_GRID_MID_YALMS, y: ARROW_GRID_FAR_YALMS }];
  }
}

function pointDistance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// FFLogs position (centi-yalms, arena center 10000,10000) -> yalms relative
// to center, matching analyzer.wtfdig.info's own Ol()/ty() helpers.
function toRelativeYalms(xRaw: number, yRaw: number): Point {
  return { x: xRaw / 100 - 100, y: yRaw / 100 - 100 };
}

function nearestPlayerPosition(events: PlayerEvent[], timestamp: number): Point | null {
  let best: PlayerEvent | null = null;
  let bestDiff = Infinity;
  for (const e of events) {
    if (e.x === undefined || e.y === undefined) continue;
    const diff = Math.abs(e.timestamp - timestamp);
    if (diff < bestDiff) { bestDiff = diff; best = e; }
  }
  return best ? toRelativeYalms(best.x!, best.y!) : null;
}

// Clean max observed (a consistently "sloppy" Paladin's corner arrow, pull
// 6) is ~5.9 yalms; the confirmed failure's minimum deviation is ~18.5 —
// wide margin either side of this line.
const ARROW_OUT_OF_POSITION_THRESHOLD_YALMS = 10;

// "Double-D" (same cardinal direction twice) arrows sit much more tightly
// on their slot than corner arrows across every report sampled — clean max
// observed is ~1.8 yalms (vs corner's ~5.9), so this case gets its OWN,
// much tighter threshold rather than sharing the corner one above.
// Confirmed 2026-07-22 (report G7kTFVxjcAC6p1MN, pull 1): a Paladin's
// double-North arrows, both pulled in too far toward the boss, deviated
// ~4.1 and ~2.4 yalms — comfortably above this line, comfortably below
// what the corner threshold would have required to catch the same mistake.
const ARROW_DOUBLE_OUT_OF_POSITION_THRESHOLD_YALMS = 2;

function detectBlizzardIIIBlowoutSilentKillErrors(players: PlayerInfo[], deathEvents: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];

  for (const death of deathEvents) {
    if (!BLIZZARD_III_BLOWOUT_ABILITY_IDS.has(death.killingAbilityGameId)) continue;

    const victim = players.find((p) => p.name === death.player);
    if (!victim) continue;

    const everHadDamageDown = victim.debuffs.some(
      (d) =>
        d.abilityId === DAMAGE_DOWN_ABILITY_ID &&
        d.debuffStatus === "applied" &&
        d.timestamp <= death.timestamp
    );
    if (everHadDamageDown) continue; // the generic ffxiv-damage-down rule already covers this

    errors.push({
      ruleId:      BLIZZARD_III_SILENT_KILL_RULE_ID,
      severity:    "Major",
      name:        "Blizzard III Blowout Killed Instantly",
      description: "Died to Blizzard III Blowout without ever receiving the Damage Down debuff it normally applies — the mechanic was missed badly enough to kill outright instead of just punishing with the debuff.",
      timestamp:   death.timestamp,
      player:      death.player,
      class:       death.class,
      specId:      death.specId,
      role:        death.role,
      abilityId:   death.killingAbilityGameId,
      abilityName: "Blizzard III Blowout",
    });
  }

  return errors;
}

function detectJumpedOffArenaError(players: PlayerInfo[], deathEvents: DeathEvent[]): PullError[] {
  const hadDamageDownAt = (playerName: string, timestamp: number) => {
    const player = players.find((p) => p.name === playerName);
    if (!player) return false;
    return player.debuffs.some(
      (d) =>
        d.abilityId === DAMAGE_DOWN_ABILITY_ID &&
        d.debuffStatus === "applied" &&
        d.timestamp <= timestamp
    );
  };

  const jump = deathEvents
    .filter((d) => d.timestamp <= PHASE_1_END_MS && d.cause === "Environmental")
    .filter((d) => !hadDamageDownAt(d.player, d.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp)[0];
  if (!jump) return [];

  return [
    {
      ruleId:      JUMPED_OFF_ARENA_RULE_ID,
      severity:    "Raid",
      name:        "Jumped Off The Arena",
      description: `${jump.player} jumped off the arena, signaling a raid wipe and reset.`,
      timestamp:   jump.timestamp,
      abilityId:   0,
      abilityName: "Jumped Off The Arena",
    },
  ];
}

function detectWaveCannonOutOfPositionErrors(players: PlayerInfo[], deathEvents: DeathEvent[]): PullError[] {
  type Hit = { player: PlayerInfo; timestamp: number; sourceInstance: number; x?: number; y?: number };
  const hits: Hit[] = [];
  for (const player of players) {
    for (const e of player.damageTaken) {
      if (e.abilityId !== WAVE_CANNON_ABILITY_ID || e.sourceInstance === undefined) continue;
      hits.push({ player, timestamp: e.timestamp, sourceInstance: e.sourceInstance, x: e.x, y: e.y });
    }
  }
  if (hits.length === 0) return [];

  hits.sort((a, b) => a.timestamp - b.timestamp);
  const clusters: Hit[][] = [];
  for (const hit of hits) {
    const current = clusters[clusters.length - 1];
    if (current && hit.timestamp - current[current.length - 1].timestamp <= WAVE_CANNON_VOLLEY_CLUSTER_MS) {
      current.push(hit);
    } else {
      clusters.push([hit]);
    }
  }

  const errors: PullError[] = [];

  for (const cluster of clusters) {
    const byPlayer = new Map<number, Hit[]>();
    for (const h of cluster) {
      const list = byPlayer.get(h.player.actorId) ?? [];
      list.push(h);
      byPlayer.set(h.player.actorId, list);
    }

    const compromised = [...byPlayer.values()].filter(
      (hs) => new Set(hs.map((h) => h.sourceInstance)).size >= 2
    );
    if (compromised.length === 0) continue; // every hit landed as a clean single beam

    const candidates = compromised
      .map((hs) => {
        const canonical = WAVE_CANNON_JOB_POSITIONS[hs[0].player.className];
        if (!canonical || hs[0].x === undefined || hs[0].y === undefined) return null;
        const distanceCentiyalms = Math.hypot(hs[0].x - canonical.x, hs[0].y - canonical.y);
        return { player: hs[0].player, timestamp: hs[0].timestamp, distanceCentiyalms };
      })
      .filter((c): c is { player: PlayerInfo; timestamp: number; distanceCentiyalms: number } => c !== null);

    const outOfPosition = candidates.filter(
      (c) => c.distanceCentiyalms > WAVE_CANNON_OUT_OF_POSITION_THRESHOLD_CENTIYALMS
    );
    // A victim standing correctly who just got caught by a neighbor's
    // mistake stays unflagged — only the one(s) actually off their spot are.
    if (outOfPosition.length === 0) continue;

    const others = compromised
      .flatMap((hs) => hs[0].player.name)
      .filter((name) => !outOfPosition.some((c) => c.player.name === name));

    const diedToWaveCannon = (playerName: string, aroundMs: number) =>
      deathEvents.some(
        (d) =>
          d.player === playerName &&
          d.killingAbilityGameId === WAVE_CANNON_ABILITY_ID &&
          Math.abs(d.timestamp - aroundMs) <= WAVE_CANNON_VOLLEY_CLUSTER_MS + 5000
      );

    for (const { player, timestamp, distanceCentiyalms } of outOfPosition) {
      const yalmsOff = (distanceCentiyalms / 100).toFixed(1);
      const deadOthers = others.filter((name) => diedToWaveCannon(name, timestamp));
      const selfDied = diedToWaveCannon(player.name, timestamp);

      let overlapNote = "";
      if (others.length > 0) {
        overlapNote = ` Overlapped with ${others.join(" and ")}'s Wave Cannon`;
        const bothDied = selfDied && deadOthers.length > 0;
        if (bothDied) overlapNote += `, killing them both`;
        else if (deadOthers.length > 0) overlapNote += `, killing ${deadOthers.join(" and ")}`;
        overlapNote += ".";
      }

      errors.push({
        ruleId:      WAVE_CANNON_OUT_OF_POSITION_RULE_ID,
        severity:    "Major",
        name:        "Wave Cannon Incorrect Position",
        description: `Was roughly ${yalmsOff} yalms off their expected Wave Cannon spot.${overlapNote}`,
        timestamp,
        player:      player.name,
        class:       player.className,
        specId:      player.specId,
        role:        player.role,
        abilityId:   WAVE_CANNON_ABILITY_ID,
        abilityName: "Wave Cannon",
      });
    }
  }

  return errors;
}

/**
 * Detects a player caught standing in the overlap between two Wave Cannon
 * towers, soaking both instead of the one they were meant to. See the
 * module comment for the mechanic and its cascade-suppression gates.
 */
function detectWaveCannonTowerOverlapErrors(players: PlayerInfo[], deathEvents: DeathEvent[]): PullError[] {
  const waveCannonHitTimestamps: number[] = [];
  const waveCannonCarriers = new Set<string>();
  for (const player of players) {
    for (const e of player.damageTaken) {
      if (e.abilityId !== WAVE_CANNON_ABILITY_ID) continue;
      waveCannonCarriers.add(player.name);
      waveCannonHitTimestamps.push(e.timestamp);
    }
  }
  if (waveCannonHitTimestamps.length === 0) return [];

  // Fewer than 4 carriers means the mechanic didn't resolve as designed —
  // some players never reached it (an earlier wipe already underway) —
  // and the remaining towers can't be trusted to mean anything.
  if (waveCannonCarriers.size !== 4) return [];

  const waveCannonTime = Math.min(...waveCannonHitTimestamps);

  // A carrier who dies before their own tower resolves leaves it to
  // re-target/scramble the remaining soakers — same cascade-suppression
  // pattern as limitcut.ts's dead-before-the-dash check.
  const carrierDiedBeforeTowerResolved = deathEvents.some(
    (d) =>
      waveCannonCarriers.has(d.player) &&
      d.timestamp >= waveCannonTime &&
      d.timestamp <= waveCannonTime + WAVE_CANNON_VOLLEY_CLUSTER_MS + 5000
  );
  if (carrierDiedBeforeTowerResolved) return [];

  const errors: PullError[] = [];
  for (const player of players) {
    const towerHits = player.damageTaken.filter((e) => e.abilityId === WAVE_CANNON_TOWER_ABILITY_ID);
    const distinctInstances = new Set(towerHits.map((e) => e.sourceInstance).filter((i) => i !== undefined));
    if (distinctInstances.size < 2) continue;

    errors.push({
      ruleId:      WAVE_CANNON_TOWER_OVERLAP_RULE_ID,
      severity:    "Major",
      name:        "Soaked Multiple Wave Cannon Towers",
      description: `Stood in the overlap between ${distinctInstances.size} Wave Cannon towers and soaked all of them — should only ever take one.`,
      timestamp:   Math.min(...towerHits.map((e) => e.timestamp)),
      player:      player.name,
      class:       player.className,
      specId:      player.specId,
      role:        player.role,
      abilityId:   WAVE_CANNON_TOWER_ABILITY_ID,
      abilityName: "Wave Cannon Tower",
    });
  }
  return errors;
}

function detectTeleTrouncingArrowErrors(players: PlayerInfo[]): PullError[] {
  type Removal = { player: PlayerInfo; timestamp: number; dir: Cardinal };
  const removals: Removal[] = [];
  for (const player of players) {
    for (const d of player.debuffs) {
      const dir = TELE_PORTENT_DIRECTION_BY_ABILITY_ID[d.abilityId];
      if (!dir || d.debuffStatus !== "removed") continue;
      removals.push({ player, timestamp: d.timestamp, dir });
    }
  }
  if (removals.length === 0) return [];

  removals.sort((a, b) => a.timestamp - b.timestamp);
  const waves: Removal[][] = [];
  for (const r of removals) {
    const current = waves[waves.length - 1];
    if (current && r.timestamp - current[current.length - 1].timestamp <= TELE_PORTENT_WAVE_CLUSTER_MS) {
      current.push(r);
    } else {
      waves.push([r]);
    }
  }

  // Each player should appear in exactly 2 waves (one arrow apiece) — group
  // their 2 removals back together regardless of which wave they landed in.
  const byPlayer = new Map<number, { player: PlayerInfo; arrows: { timestamp: number; dir: Cardinal }[] }>();
  for (const wave of waves) {
    for (const r of wave) {
      const entry = byPlayer.get(r.player.actorId) ?? { player: r.player, arrows: [] };
      entry.arrows.push({ timestamp: r.timestamp, dir: r.dir });
      byPlayer.set(r.player.actorId, entry);
    }
  }

  const errors: PullError[] = [];

  for (const { player, arrows } of byPlayer.values()) {
    if (arrows.length !== 2) continue; // incomplete data — fail closed

    // damageTaken's x/y is this player's OWN position (the hit victim).
    // player.healing is NOT usable here despite carrying x/y too — those
    // coordinates belong to whoever THIS player healed, not to this player
    // themselves (see fflHealToPlayerEvent's comment on FFLHealEvent.
    // targetResources) — confirmed as the exact cause of a false positive
    // (Sage flagged 18y off in pull 6): the nearest-in-time event to one of
    // their removedebuffs was their own outgoing heal on a raid-wide
    // support cast (Kardia) whose target was standing across the arena.
    const withPos = arrows.map((a) => ({ ...a, pos: nearestPlayerPosition(player.damageTaken, a.timestamp) }));
    if (withPos.some((a) => a.pos === null)) continue;
    const [a1, a2] = withPos as { timestamp: number; dir: Cardinal; pos: Point }[];

    const flagIfOutOfPosition = (arrow: { timestamp: number; dir: Cardinal; pos: Point }, expected: Point, threshold: number) => {
      const deviation = pointDistance(arrow.pos, expected);
      if (deviation <= threshold) return;
      errors.push({
        ruleId:      TELE_TROUNCING_ARROW_RULE_ID,
        severity:    "Major",
        name:        "Tele-Trouncing Arrow Misplaced",
        description: `Dropped their ${arrow.dir}-facing arrow roughly ${deviation.toFixed(1)} yalms from its expected spot in the clockwise arrow path.`,
        timestamp:   arrow.timestamp,
        player:      player.name,
        class:       player.className,
        specId:      player.specId,
        role:        player.role,
        abilityId:   47801,
        abilityName: "Tele-Trouncing",
      });
    };

    if (a1.dir === a2.dir) {
      const [slotA, slotB] = predictDoubleSlots(a1.dir);
      const straight = pointDistance(a1.pos, slotA) + pointDistance(a2.pos, slotB);
      const swapped  = pointDistance(a1.pos, slotB) + pointDistance(a2.pos, slotA);
      const [p1, p2] = straight <= swapped ? [slotA, slotB] : [slotB, slotA];
      flagIfOutOfPosition(a1, p1, ARROW_DOUBLE_OUT_OF_POSITION_THRESHOLD_YALMS);
      flagIfOutOfPosition(a2, p2, ARROW_DOUBLE_OUT_OF_POSITION_THRESHOLD_YALMS);
    } else {
      const predicted = predictCornerSlots(a1.dir, a2.dir);
      if (!predicted) continue; // not a valid clockwise-adjacent pair — unexpected data, skip
      for (const arrow of [a1, a2]) {
        const expected = arrow.dir === predicted.cornerDir ? predicted.cornerPos : predicted.approachPos;
        flagIfOutOfPosition(arrow, expected, ARROW_OUT_OF_POSITION_THRESHOLD_YALMS);
      }
    }
  }

  return errors;
}

/**
 * Returns [] immediately for any pull that never touches Phase 1's tracked
 * abilities — self-gating the same way exdeath.ts does, so it's safe to
 * always call.
 */
export function detectPhase1Errors(players: PlayerInfo[], deathEvents: DeathEvent[]): PullError[] {
  return [
    ...detectBlizzardIIIBlowoutSilentKillErrors(players, deathEvents),
    ...detectJumpedOffArenaError(players, deathEvents),
    ...detectWaveCannonOutOfPositionErrors(players, deathEvents),
    ...detectWaveCannonTowerOverlapErrors(players, deathEvents),
    ...detectTeleTrouncingArrowErrors(players),
  ].sort((a, b) => a.timestamp - b.timestamp);
}
