// lib/mechanics/ffxiv/dancingmad/phase1.ts
//
// Encounter-specific error detection for Phase 1 of FFXIV's Dancing Mad
// (Kefka's Return) ultimate — everything up through the phase transition
// at roughly 3:25 (205s) into the fight.
//
// ── REVOLTING RUIN III THREAT LOSS (confirmed 2026-07-29, Q3GzJNZg64k1hLRm, ─
// ── pull 7) ─────────────────────────────────────────────────────────────
//
// The opening tankbuster pair (~0:11-0:19, 50179 then 50401, both sharing
// the in-game name "Revolting Ruin III"): hit 1 always lands on whoever
// currently holds highest enmity (the MT, in every clean pull sampled);
// hit 2 lands on whoever holds SECOND-highest enmity at that later moment.
// This raid's strategy has the OT provoke right after hit 1 specifically
// so their enmity lead holds through hit 2's resolution, bumping the MT
// back down to 2nd and making the MT eat BOTH hits (confirmed: hit 1 and
// hit 2 land on the same tank in 19 of 20 sampled pulls) — the MT only
// needs to mitigate once, and the OT's own cooldowns stay banked for the
// next tankbuster pair later in the fight. This is a mechanic aimed
// specifically at the OT: if their enmity lead doesn't hold (commonly
// because their tank stance — Iron Will/Defiance/Grit/Royal Guard for
// Paladin/Warrior/Dark Knight/Gunbreaker — was never turned on, so their
// own damage can't out-generate the MT's and enmity slides back before
// hit 2 fires), hit 2 lands on whoever it actually lands on instead — the
// OT themselves (confirmed pull 7: Sayacissa provoked but had no stance
// up, Salty Dango's ongoing damage "ripped" 1st back before hit 2, so
// Sayacissa dropped to 2nd and took it — and died to it, since an
// un-stanced tank can't survive a hit sized for one). Detection doesn't
// need to check stance directly (a pure outcome check is sufficient and
// more robust): if hit 1 resolves to a single clear tank (the MT) and
// hit 2 does NOT also land on that same tank, the OTHER tank (the OT) is
// flagged — the mechanic is built entirely around the OT's own threat
// upkeep, so any deviation from "MT tanks both" is on them, regardless of
// who the hit actually lands on. Self-gates on exactly 2 tanks and a
// single unambiguous hit-1 target; pulls where hit 1 itself already hit
// multiple people (already-scrambled from an earlier problem) are left
// alone rather than guessed at.
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
// ── WAVE CANNON OUT OF POSITION / MITIGATION ISSUE ─────────────────────────
//
// Lives in wave-cannon.ts, NOT here — like Graven Image's spread, which job
// stands where for Wave Cannon turned out to be a raid strategy choice
// (confirmed cross-report), not a hardcoded game constant, so it has to be
// LEARNED from the report at hand rather than baked into a constant table.
// See that module's header for the mechanic, the learning method, and the
// separate raid-wide "Mitigation Issue" call for a death to a single
// unavoidable beam.
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
// an adjacent-slot slip. A second, much closer-in failure mode is also
// confirmed (report xXV3mdnZvFJ8czBP pull 17): a Monk's arrow landed on the
// right corner/edge but short of the ring itself (~8.3 yalms off, an inner
// grid point instead of the outer one) — still enough to break the
// clockwise loop and wipe the raid. Every genuinely clean arrow sampled
// across every report deviates under 6.6 yalms from its predicted slot (one
// consistently "sloppy" Paladin included) — see
// ARROW_OUT_OF_POSITION_THRESHOLD_YALMS for where the line is drawn.
//
// ── MYSTERY MAGIC DEATH -> UNRESOLVABLE WIPE (confirmed 2026-07-28, ─────────
// ── report Q3GzJNZg64k1hLRm, pulls 1/2) ─────────────────────────────────────
//
// Mystery Magic (begincast/cast 47764) fires right after each Graven Image
// and resolves ~5s later with a raid-wide AoE tick in one of two elemental
// flavors — Flagrant Fire III (47778/47779) or Thrumming Thunder III
// (47775/47776/47777). A separate concurrent cast, Blizzard III Blowout
// (BLIZZARD_III_BLOWOUT_ABILITY_IDS above), is also part of the same
// mechanic package. **A death to any of these makes Wave Cannon
// unresolvable** — it already self-gates on exactly 4 live carriers (see
// WAVE_CANNON_TOWER_OVERLAP module comment), so no change was needed there.
//
// What WAS missing: nothing marked the pull as over at the point of death,
// so later incidental errors (e.g. generic Damage Down procs from a raid
// already spiraling toward a call) kept counting as real mistakes. A
// Raid-severity error now fires once, timestamped just after the death,
// functioning purely as the lib/report-data.ts cutoff marker — see that
// file's "once a raid-wide mistake has happened... Major errors after that
// point are dropped" logic, the same mechanism JUMPED_OFF_ARENA relies on
// above.
//
// Note: the Flagrant Fire III spread's own per-player position/overlap
// attribution (who stood in the wrong spot and got a neighbor killed too —
// pull 1's Salty Dango/Sonder Dreams case) is NOT duplicated here — that's
// graven-image.ts's `ffxiv-phase1-graven-image-spread-misplaced` rule,
// which already covers this exact resolution tick with a per-job LEARNED
// position table (more precise than a hardcoded west/east half) and its own
// overlap-plus-death gating. An earlier version of this rule set
// re-implemented that as a coarser role-based half-check and produced a
// duplicate error for the same mistake — removed 2026-07-28.
//
// ── CONFETTI LOST -> UNRESOLVABLE WIPE (confirmed 2026-07-30, same report, ──
// ── pull 9) ─────────────────────────────────────────────────────────────
//
// "Confetti" is this raid's own nickname for the Double-Trouble Trap debuff
// (buff ID 1005078, applied ~45s in, one player per role — confirmed pull
// 9: Kade Kansado and Salty Dango) that follows Wave Cannon. Same
// unresolvable-wipe shape as MYSTERY_MAGIC_DEATH_WIPE above: if a player
// carrying it dies, the mechanic can't resolve and the pull is over from
// there, even though (confirmed pull 9) the raid may visibly struggle on
// for another 30-40s before the actual wipe — a Raid-severity error fires
// once, immediately, purely as the lib/report-data.ts cutoff marker, same
// reasoning as every other rule in this file that does this.
//
// Gated the same way BLIZZARD_III_SILENT_KILL/JUMPED_OFF_ARENA check debuff
// history — "was it ever applied before this death" (ignoring an earlier
// removedebuff) rather than "is it active at the literal instant of death":
// confirmed pull 9's Salty Dango had her Double-Trouble Trap removed 2s
// before the (unrelated Wave Cannon Tower) hit that actually killed her,
// yet the user's own call was still "died carrying Confetti" — so the
// check accepts a short gap between removal and death rather than
// requiring the debuff to still be literally active at the death instant.
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
import { distanceBetween } from "@/lib/mechanics/geometry";

export const BLIZZARD_III_SILENT_KILL_RULE_ID = "ffxiv-phase1-blizzard3-silent-kill";
export const JUMPED_OFF_ARENA_RULE_ID          = "ffxiv-phase1-jumped-off-arena";
export const WAVE_CANNON_TOWER_OVERLAP_RULE_ID   = "ffxiv-phase1-wave-cannon-tower-overlap";
export const TELE_TROUNCING_ARROW_RULE_ID = "ffxiv-phase1-tele-trouncing-arrow-misplaced";
export const MYSTERY_MAGIC_DEATH_WIPE_RULE_ID = "ffxiv-phase1-mystery-magic-death-wipe";
export const REVOLTING_RUIN_THREAT_LOSS_RULE_ID = "ffxiv-phase1-revolting-ruin-threat-loss";
export const CONFETTI_LOST_RULE_ID = "ffxiv-phase1-confetti-lost";

const BLIZZARD_III_BLOWOUT_ABILITY_IDS = new Set([47765, 47768, 47771, 47774]);
const DAMAGE_DOWN_ABILITY_ID = 1002911;

const REVOLTING_RUIN_FIRST_HIT_ABILITY_ID  = 50179;
const REVOLTING_RUIN_SECOND_HIT_ABILITY_ID = 50401;

// "Confetti" — this raid's own nickname for the Double-Trouble Trap debuff.
const DOUBLE_TROUBLE_TRAP_BUFF_ID = 1005078;

// Generous gap between the debuff being applied and a death that should
// still count as "died carrying Confetti" — see module header (confirmed
// pull 9: the debuff's own removedebuff fired 2s before the unrelated hit
// that actually killed the carrier).
const CONFETTI_DEATH_WINDOW_MS = 10_000;

// Tank stance per job — the thing the OT needs active for their post-
// provoke enmity lead to hold through Revolting Ruin III's second hit (see
// module header). Not currently read by detection (a pure outcome check —
// did hit 2 land on the same tank as hit 1 — proved sufficient and more
// robust than checking stance directly), kept here per the user's own
// breakdown for future mitigation-tracking use. Iron Will/Defiance are
// UNCONFIRMED — no sampled report has a Paladin or Warrior tank to verify
// their buff IDs against; only Grit and Royal Guard are confirmed (via
// this report's own debuffs stream).
const TANK_STANCE_BUFF_ID_BY_CLASS_NAME: Readonly<Record<string, number>> = {
  "Dark Knight": 1000743, // Grit
  "Gunbreaker":  1001833, // Royal Guard
  // "Paladin":  <unconfirmed>, // Iron Will
  // "Warrior":  <unconfirmed>, // Defiance
};

// Everything a Mystery Magic death can be credited to — the two confirmed
// raid-wide resolution tick flavors (Flagrant Fire III, Thrumming Thunder
// III) plus Blizzard III Blowout (also part of the same mechanic package —
// see BLIZZARD_III_SILENT_KILL above). Used only to find the death that
// marks the pull as unresolvable, not for attribution (see module comment —
// attribution for the spread tick itself lives in graven-image.ts).
const MYSTERY_MAGIC_DEATH_ABILITY_IDS = new Set([
  47778, 47779,             // Flagrant Fire III
  47775, 47776, 47777,      // Thrumming Thunder III
  ...BLIZZARD_III_BLOWOUT_ABILITY_IDS,
]);

// A single Mystery Magic resolution's hits/deaths span well under 3s
// (observed: first hit to final death ~2.7s in pull 1); the next
// Graven Image/Mystery Magic instance in the same pull is ~10s+ later — wide
// margin on both sides.
const MYSTERY_MAGIC_VOLLEY_CLUSTER_MS = 3000;

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

// NOTE: this module works in RELATIVE YALMS (see toRelativeYalms below),
// not raw centi-yalms — distanceBetween is unit-agnostic, but its results
// here are already yalms, no /100 needed.
const pointDistance = distanceBetween;

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

// Clean max observed (a consistently "sloppy" Paladin's corner arrow) is
// ~6.6 yalms. Originally set to 10 on a wide margin below the confirmed
// failure minimum of ~13.9-18.5 — but that gap turned out to hide a real,
// closer-in failure: report xXV3mdnZvFJ8czBP pull 17's Monk dropped their
// S arrow at only ~8.3 yalms off (still on-angle-adjacent, just short of
// the correct grid cell — landed at an inner (6,-6) point instead of the
// NE corner's (12,-12)), which the old threshold missed entirely and which
// caused a real wipe (a raid member fell through the arena ~9s after the
// last arrow landed, the same "jumped off arena" signature Tele-Trouncing
// failures always produce). 7.5 splits the now 3-tier-confirmed data
// (6.6 clean / 8.3 failure / 13.9+ failure) with margin on both sides of
// the closer gap.
const ARROW_OUT_OF_POSITION_THRESHOLD_YALMS = 7.5;

// "Double-D" (same cardinal direction twice) arrows sit much more tightly
// on their slot than corner arrows across every report sampled — clean max
// observed is ~1.8 yalms (vs corner's ~5.9), so this case gets its OWN,
// much tighter threshold rather than sharing the corner one above.
// Confirmed 2026-07-22 (report G7kTFVxjcAC6p1MN, pull 1): a Paladin's
// double-North arrows, both pulled in too far toward the boss, deviated
// ~4.1 and ~2.4 yalms — comfortably above this line, comfortably below
// what the corner threshold would have required to catch the same mistake.
const ARROW_DOUBLE_OUT_OF_POSITION_THRESHOLD_YALMS = 2;

/**
 * Detects the OT failing to hold enmity through Revolting Ruin III's
 * second hit — see module header for the mechanic and why this is a pure
 * outcome check (hit 2 landed on someone other than hit 1's tank) rather
 * than a stance-buff check.
 */
function detectRevoltingRuinThreatLossErrors(players: PlayerInfo[]): PullError[] {
  const tanks = players.filter((p) => p.role === "Tank");
  if (tanks.length !== 2) return []; // needs the standard 2-tank comp to reason about MT/OT

  const hit1Targets = new Set<string>();
  let hit1Timestamp: number | undefined;
  const hit2Targets = new Set<string>();
  let hit2Timestamp: number | undefined;
  for (const player of players) {
    for (const e of player.damageTaken) {
      if (e.abilityId === REVOLTING_RUIN_FIRST_HIT_ABILITY_ID) {
        hit1Targets.add(player.name);
        hit1Timestamp = hit1Timestamp === undefined ? e.timestamp : Math.min(hit1Timestamp, e.timestamp);
      } else if (e.abilityId === REVOLTING_RUIN_SECOND_HIT_ABILITY_ID) {
        hit2Targets.add(player.name);
        hit2Timestamp = hit2Timestamp === undefined ? e.timestamp : Math.min(hit2Timestamp, e.timestamp);
      }
    }
  }
  // Ambiguous hit 1 (already scrambled by an earlier problem) — don't guess.
  if (hit1Targets.size !== 1 || hit2Timestamp === undefined) return [];

  const mtName = [...hit1Targets][0];
  if (hit2Targets.has(mtName)) return []; // clean — the MT tanked both hits

  const mt = tanks.find((t) => t.name === mtName);
  const ot = tanks.find((t) => t.name !== mtName);
  if (!mt || !ot) return []; // hit 1 didn't land on either tank at all — not this mechanic's usual shape

  return [
    {
      ruleId:      REVOLTING_RUIN_THREAT_LOSS_RULE_ID,
      severity:    "Major",
      name:        "Revolting Ruin III Threat Lost",
      description: `Failed to hold enmity after provoking Revolting Ruin III — the second hit landed on ${[...hit2Targets].join(" and ")} instead of ${mt.name} (${mt.className}) tanking both.`,
      timestamp:   hit2Timestamp,
      player:      ot.name,
      class:       ot.className,
      specId:      ot.specId,
      role:        ot.role,
      abilityId:   REVOLTING_RUIN_SECOND_HIT_ABILITY_ID,
      abilityName: "Revolting Ruin III",
    },
  ];
}

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

/**
 * A death to Mystery Magic's resolution (either spread tick flavor, or
 * Blizzard III Blowout — see MYSTERY_MAGIC_DEATH_ABILITY_IDS) leaves Wave
 * Cannon unresolvable (it already self-gates on 4 live carriers) and marks
 * the pull as over. This fires a single Raid error just after the death
 * (and any Major error(s) it produced) purely to serve as the
 * lib/report-data.ts cutoff — see module comment.
 */
function detectMysteryMagicDeathWipeError(
  deathEvents:      DeathEvent[],
  otherPhase1Errors: PullError[]
): PullError[] {
  const mysteryMagicDeaths = deathEvents.filter((d) => MYSTERY_MAGIC_DEATH_ABILITY_IDS.has(d.killingAbilityGameId));
  if (mysteryMagicDeaths.length === 0) return [];

  const firstDeathTime = Math.min(...mysteryMagicDeaths.map((d) => d.timestamp));
  const clusterEnd = firstDeathTime + MYSTERY_MAGIC_VOLLEY_CLUSTER_MS;

  const clusterDeaths = mysteryMagicDeaths.filter((d) => d.timestamp <= clusterEnd);
  const clusterMajors = otherPhase1Errors.filter(
    (e) => e.severity === "Major" && e.timestamp >= firstDeathTime - MYSTERY_MAGIC_VOLLEY_CLUSTER_MS && e.timestamp <= clusterEnd
  );

  const cutoff = Math.max(
    ...clusterDeaths.map((d) => d.timestamp),
    ...clusterMajors.map((e) => e.timestamp)
  );

  const victims = [...new Set(clusterDeaths.map((d) => d.player))];

  return [
    {
      ruleId:      MYSTERY_MAGIC_DEATH_WIPE_RULE_ID,
      severity:    "Raid",
      name:        "Mystery Magic Wipe",
      description: `${victims.join(" and ")} died during Mystery Magic — unresolvable from here, the raid wiped.`,
      timestamp:   cutoff + 1,
      abilityId:   0,
      abilityName: "Mystery Magic",
    },
  ];
}

/**
 * A player who ever had Double-Trouble Trap ("Confetti") applied dying
 * shortly afterward makes the mechanic unresolvable — a single Raid error
 * fires once, purely as the lib/report-data.ts cutoff marker. See module
 * header for why this checks debuff HISTORY (any application before the
 * death, within a generous window) rather than "still active at death."
 */
function detectConfettiLostError(players: PlayerInfo[], deathEvents: DeathEvent[]): PullError[] {
  const hadConfettiBefore = (playerName: string, atTime: number) => {
    const player = players.find((p) => p.name === playerName);
    if (!player) return false;
    return player.debuffs.some(
      (d) =>
        d.abilityId === DOUBLE_TROUBLE_TRAP_BUFF_ID &&
        d.debuffStatus === "applied" &&
        d.timestamp <= atTime &&
        atTime - d.timestamp <= CONFETTI_DEATH_WINDOW_MS
    );
  };

  const confettiDeath = deathEvents
    .filter((d) => hadConfettiBefore(d.player, d.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp)[0];
  if (!confettiDeath) return [];

  return [
    {
      ruleId:      CONFETTI_LOST_RULE_ID,
      severity:    "Raid",
      name:        "Confetti Lost",
      description: `${confettiDeath.player} died while carrying Double-Trouble Trap ("Confetti") — unresolvable from here, the raid wiped.`,
      timestamp:   confettiDeath.timestamp + 1,
      abilityId:   DOUBLE_TROUBLE_TRAP_BUFF_ID,
      abilityName: "Double-Trouble Trap",
    },
  ];
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
  const blizzardIIISilentKillErrors = detectBlizzardIIIBlowoutSilentKillErrors(players, deathEvents);

  return [
    ...detectRevoltingRuinThreatLossErrors(players),
    ...blizzardIIISilentKillErrors,
    ...detectJumpedOffArenaError(players, deathEvents),
    ...detectWaveCannonTowerOverlapErrors(players, deathEvents),
    ...detectMysteryMagicDeathWipeError(deathEvents, blizzardIIISilentKillErrors),
    ...detectConfettiLostError(players, deathEvents),
    ...detectTeleTrouncingArrowErrors(players),
  ].sort((a, b) => a.timestamp - b.timestamp);
}
