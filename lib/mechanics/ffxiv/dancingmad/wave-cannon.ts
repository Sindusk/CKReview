// lib/mechanics/ffxiv/dancingmad/wave-cannon.ts
//
// Cross-pull detection for Phase 1's Wave Cannon beam mechanic (~0:44, boss
// ability "Wave Cannon", 47784 — hits exactly 4 of the 8 players while the
// other 4 handle the follow-up towers, see phase1.ts's
// WAVE_CANNON_TOWER_OVERLAP). Split out from phase1.ts for the same reason
// graven-image.ts is: "the correct spot" is a raid strategy choice, not a
// game-mechanic constant, so it has to be LEARNED from the report at hand.
//
// ── WHY THIS MOVED OUT OF A HARDCODED TABLE (confirmed 2026-07-29, report ──
// ── Q3GzJNZg64k1hLRm) ────────────────────────────────────────────────────
//
// An earlier version hardcoded a per-job position table from a single
// report (VtdBqhLQkWJXMvDg). Checking Q3GzJNZg64k1hLRm's own clean pulls
// showed every job's canonical spot sitting several yalms from that
// table's values — a different raid team, a different physical
// arrangement, same reasoning as Graven Image's spread (see that module's
// header). Naively pooling every non-overlapping hit across ALL of a
// report's pulls doesn't work either: pulls that wipe early (to an earlier
// mechanic, or to a solo Wave Cannon mistake that happens not to overlap
// anyone) still contribute a "clean-looking" single hit, and several
// classes' samples showed a second, much worse spread of positions once
// every pull was pooled that way (one job ranged up to 14.6 yalms from its
// own median). Restricting the learning set to pulls lasting 2+ minutes —
// long enough that the raid clearly wasn't derailed by an earlier mistake
// — collapses every job down to one tight cluster (worst clean deviation
// observed in this report: 4.6 yalms).
//
// ── THE MECHANIC ────────────────────────────────────────────────────────
//
// Same overlap signature as every other spread check here: FFLogs'
// `sourceInstance` identifies which of the 4 concurrent beams landed on a
// target; a clean hit is exactly one instance per player. Confirmed
// failure (pull 3): Salty Dango stood ~10.6 yalms from her learned spot —
// most of an arena-half away — overlapping into a beam meant for a
// neighboring job's spot and getting both of them killed (that beam ended
// up hitting a THIRD player too, Kade Kansado, who is not flagged — see
// below). Gated on that overlap outcome, position used only for
// attribution, matching every other "gate on outcome" check in this
// codebase.
//
// ── WAVE CANNON MITIGATION ISSUE (confirmed 2026-07-29, same report, ─────
// ── pull 3) ────────────────────────────────────────────────────────────
//
// Chauzey Solstice and Kade Kansado each died to their OWN single beam —
// exactly one sourceInstance, no overlap, nobody out of position — in the
// same pull. That's not a positioning mistake: standing in the right spot
// and still dying to one beam means the raid's mitigation/healing on Wave
// Cannon wasn't enough, a raid-wide problem with no single player to
// root-cause. A Raid-severity error fires once per pull for the set of
// such victims — same severity philosophy as phase1.ts's
// MYSTERY_MAGIC_DEATH_WIPE — separately from any position error above.

import type { Pull } from "@/types/Pull";
import type { PlayerInfo } from "@/types/PlayerInfo";
import type { PullError } from "@/types/PullError";
import type { DeathEvent } from "@/types/DeathEvent";

export const WAVE_CANNON_POSITION_RULE_ID = "ffxiv-phase1-wave-cannon-out-of-position";
export const WAVE_CANNON_MITIGATION_ISSUE_RULE_ID = "ffxiv-phase1-wave-cannon-mitigation-issue";

const WAVE_CANNON_ABILITY_ID = 47784;

// Volley hits on different targets land within tens of ms of each other on
// real logs (observed: <50ms apart); generous without risking merging two
// genuinely separate Wave Cannon activations.
const WAVE_CANNON_VOLLEY_CLUSTER_MS = 250;

// Only pulls lasting this long feed the learned layout — see module header.
const CLEAN_LEARNING_PULL_DURATION_MS = 120_000;

// Comfortably above the worst clean deviation observed in this report (4.6
// yalms, WhiteMage), comfortably below the confirmed failure (10.6 yalms,
// pull 3's Salty Dango).
const OUT_OF_POSITION_THRESHOLD_CENTIYALMS = 500;

type Point = { x: number; y: number };

export type WaveCannonLayout = Readonly<Record<string, Point | null>>;

type RawHit = { actorId: number; player: PlayerInfo; timestamp: number; sourceInstance?: number; x: number; y: number };

function extractHits(players: PlayerInfo[]): RawHit[] {
  const hits: RawHit[] = [];
  for (const player of players) {
    for (const e of player.damageTaken) {
      if (e.abilityId !== WAVE_CANNON_ABILITY_ID || e.x === undefined || e.y === undefined) continue;
      hits.push({ actorId: player.actorId, player, timestamp: e.timestamp, sourceInstance: e.sourceInstance, x: e.x, y: e.y });
    }
  }
  return hits;
}

// One entry per player: earliest hit this volley (their own position — a
// later, second hit from a neighbor's overlap lands within ~50ms at
// essentially the same spot), plus the full set of sourceInstances that hit
// them (1 = clean, 2+ = compromised/overlapping).
function groupByPlayer(hits: RawHit[]) {
  const byPlayer = new Map<number, { player: PlayerInfo; timestamp: number; x: number; y: number; instances: Set<number> }>();
  for (const h of hits.sort((a, b) => a.timestamp - b.timestamp)) {
    const entry = byPlayer.get(h.actorId);
    if (!entry) {
      byPlayer.set(h.actorId, { player: h.player, timestamp: h.timestamp, x: h.x, y: h.y, instances: new Set(h.sourceInstance !== undefined ? [h.sourceInstance] : []) });
    } else if (h.sourceInstance !== undefined) {
      entry.instances.add(h.sourceInstance);
    }
  }
  return [...byPlayer.values()];
}

/**
 * Learns each job's canonical Wave Cannon spot from this SAME report's own
 * long (2+ minute) pulls — see module header for why short pulls
 * contaminate the sample. Median of every uncompromised (single-instance)
 * sample; a job with no qualifying samples yields null, which callers must
 * treat as "can't attribute," not "zero deviation."
 */
export function learnWaveCannonLayout(pulls: Pull[]): WaveCannonLayout {
  const samplesByClass = new Map<string, Point[]>();

  for (const pull of pulls) {
    if (pull.fightDuration < CLEAN_LEARNING_PULL_DURATION_MS) continue;
    const grouped = groupByPlayer(extractHits(pull.players));
    for (const { player, x, y, instances } of grouped) {
      if (instances.size >= 2) continue; // compromised this pull — not a clean sample
      const list = samplesByClass.get(player.className) ?? [];
      list.push({ x, y });
      samplesByClass.set(player.className, list);
    }
  }

  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const layout: Record<string, Point | null> = {};
  for (const [className, points] of samplesByClass) {
    layout[className] = points.length === 0 ? null : { x: median(points.map((p) => p.x)), y: median(points.map((p) => p.y)) };
  }
  return layout;
}

/**
 * Per-pull: only ever flags a player hit by 2+ distinct Wave Cannon
 * instances this volley (overlapping a neighbor) whose actual position
 * deviates well beyond normal jitter from their learned spot (from
 * `layout`, built once across the report by learnWaveCannonLayout) — see
 * module header. A victim standing correctly who just got caught by a
 * neighbor's misplacement stays unflagged.
 */
export function detectWaveCannonPositionErrors(
  players:     PlayerInfo[],
  deathEvents: DeathEvent[],
  layout:      WaveCannonLayout
): PullError[] {
  const grouped = groupByPlayer(extractHits(players));
  if (grouped.length === 0) return [];

  const compromised = grouped.filter((g) => g.instances.size >= 2);
  if (compromised.length === 0) return [];

  const withDeviation = compromised.map((c) => {
    const spot = layout[c.player.className];
    const distance = spot ? Math.hypot(c.x - spot.x, c.y - spot.y) : null;
    return { ...c, distance };
  });

  const outOfPosition = withDeviation.filter(
    (c) => c.distance !== null && c.distance > OUT_OF_POSITION_THRESHOLD_CENTIYALMS
  );
  // A victim standing correctly who just got caught by a neighbor's
  // mistake stays unflagged — only the one(s) actually off their spot are.
  if (outOfPosition.length === 0) return [];

  const others = compromised
    .map((c) => c.player.name)
    .filter((name) => !outOfPosition.some((o) => o.player.name === name));

  const diedToWaveCannon = (playerName: string, aroundMs: number) =>
    deathEvents.some(
      (d) =>
        d.player === playerName &&
        d.killingAbilityGameId === WAVE_CANNON_ABILITY_ID &&
        Math.abs(d.timestamp - aroundMs) <= WAVE_CANNON_VOLLEY_CLUSTER_MS + 5000
    );

  const errors: PullError[] = [];
  for (const c of outOfPosition) {
    const yalmsOff = (c.distance! / 100).toFixed(1);
    const deadOthers = others.filter((name) => diedToWaveCannon(name, c.timestamp));
    const selfDied = diedToWaveCannon(c.player.name, c.timestamp);

    let overlapNote = "";
    if (others.length > 0) {
      overlapNote = ` Overlapped with ${others.join(" and ")}'s Wave Cannon`;
      const bothDied = selfDied && deadOthers.length > 0;
      if (bothDied) overlapNote += `, killing them both`;
      else if (deadOthers.length > 0) overlapNote += `, killing ${deadOthers.join(" and ")}`;
      overlapNote += ".";
    }

    errors.push({
      ruleId:      WAVE_CANNON_POSITION_RULE_ID,
      severity:    "Major",
      name:        "Wave Cannon Incorrect Position",
      description: `Was roughly ${yalmsOff} yalms off their expected Wave Cannon spot.${overlapNote}`,
      timestamp:   c.timestamp,
      player:      c.player.name,
      class:       c.player.className,
      specId:      c.player.specId,
      role:        c.player.role,
      abilityId:   WAVE_CANNON_ABILITY_ID,
      abilityName: "Wave Cannon",
    });
  }

  return errors;
}

/**
 * A player killed by exactly ONE Wave Cannon beam (no overlap) died despite
 * standing correctly — a raid mitigation/healing shortfall, not anyone's
 * personal mistake. Bundles every such victim in the pull into one Raid
 * error. See module header.
 */
export function detectWaveCannonMitigationIssueErrors(players: PlayerInfo[], deathEvents: DeathEvent[]): PullError[] {
  const grouped = groupByPlayer(extractHits(players));
  if (grouped.length === 0) return [];

  const victims = grouped.filter((g) => {
    if (g.instances.size >= 2) return false; // overlap — covered by the position rule instead
    return deathEvents.some((d) => d.player === g.player.name && d.killingAbilityGameId === WAVE_CANNON_ABILITY_ID);
  });
  if (victims.length === 0) return [];

  const names = victims.map((v) => v.player.name);
  const timestamp = Math.max(...victims.map((v) => v.timestamp));

  return [
    {
      ruleId:      WAVE_CANNON_MITIGATION_ISSUE_RULE_ID,
      severity:    "Raid",
      name:        "Wave Cannon Mitigation Issue",
      description: `${names.join(" and ")} died to a single, unavoidable Wave Cannon beam — no positioning overlap involved, so the raid's mitigation/healing on it wasn't enough.`,
      timestamp:   timestamp + 1,
      abilityId:   WAVE_CANNON_ABILITY_ID,
      abilityName: "Wave Cannon",
    },
  ];
}
