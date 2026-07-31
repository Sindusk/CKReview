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
// Two DIFFERENT overlap shapes both count as "compromised," not just one:
// pull 3's shape is a player hit by 2+ DISTINCT instances (their own beam
// plus a neighbor's). Confirmed 2026-07-29 (pull 9): a second shape exists
// where ONE instance simply hits 2 players who stood stacked on top of
// each other — Salty Dango and Sayacissa Morsaelth shared a single
// instance, each with only ONE total instance apiece, which an earlier
// version of `compromised` (instances.size >= 2 per player) completely
// missed. Fixed by checking every instance a player was hit by for 2+
// total distinct members, not just counting how many DISTINCT instances
// hit them. When two players are fully stacked like this there's no way
// to tell who the beam's real "primary" target was — per the user,
// attribution has to fall back to pure position (whoever deviates from
// their own learned spot, same as always) rather than trying to reason
// about which one "owned" the instance.
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
//
// ── POSITION IS READ ~0.65s BEFORE THE DAMAGE EVENT, NOT AT IT (confirmed ──
// ── 2026-07-31, report h2JvDkntZCaBgmLF, pull 3) ───────────────────────────
//
// Per the user, the beam's targeting actually snapshots each player's
// position ~0.65s before the damage number appears — the damage TIMESTAMP
// lags the real targeting moment. Confirmed failure: Azura Salus (WHM) and
// Archidel Del'archi (SGE) were both hit by the same beam instance, but
// read at their OWN hit-tick position, neither deviated past the
// out-of-position threshold (Azura ~0.2y, Archidel ~1.7y off their learned
// spots) — an unresolvable, silent case. Archidel's own position samples
// in the surrounding seconds showed her still walking steadily toward her
// spot right through the hit tick, while Azura had already been stationary
// on hers for 578ms+ before it. Interpolating each player's position back
// to hitTimestamp − 650ms (WAVE_CANNON_SNAPSHOT_OFFSET_MS) via the shared
// `interpolatePlayerPosition` — using the same damageTaken/self-heal
// streams as `findPlayerPosition`, just walking the timeline back before
// using it — widens the gap between them (Azura ~0.4y, Archidel ~2.3y off
// their own learned spots after `learnWaveCannonLayout` is rebuilt from the
// same pre-snapshot positions). Falls back to the raw hit-tick position
// when no bracketing sample exists within the window (idle player near the
// very start of a pull, no damage/self-heal yet) rather than dropping the
// sample outright.
//
// ── ATTRIBUTION IS RELATIVE TO THE OVERLAP PARTNER, NOT A FIXED YALM ───────
// ── CUTOFF (confirmed 2026-07-31, same report/pull) ────────────────────────
//
// Reading positions ~0.65s earlier makes EVERY player's absolute deviation
// noisier (most players are still mid-correction at that point, not fully
// settled), so the report-wide compromised-vs-clean gap that used to
// justify OUT_OF_POSITION_THRESHOLD_CENTIYALMS collapses: across every
// sample report, compromised pairs' deviations form a smooth continuum from
// ~0.3y to ~11.6y with no natural gap, and Azura/Archidel's own absolute
// numbers (0.4y / 2.3y) are both individually unremarkable against that
// spread — no single fixed cutoff both catches Archidel here and leaves
// every other report's already-reviewed pulls alone.
//
// What DOES hold up: Archidel's deviation is ~6x Azura's, decisively larger
// than her own overlap partner's, even though neither number alone stands
// out globally. `detectWaveCannonPositionErrors` groups compromised players
// into overlap CLUSTERS (union-find over shared tower-beam instance
// membership, so a 3+-way pileup is compared as one group, not pairwise),
// then within each cluster flags only the member(s) whose deviation clears
// BOTH `CULPRIT_MARGIN_RATIO` (this player's deviation vs. the cluster's
// best-positioned member) AND `CULPRIT_MARGIN_ABS_CENTIYALMS` (an absolute
// floor so two near-identical good positions, e.g. 0.3y vs 0.6y, never spuriously
// trip the ratio alone). A cluster where nobody clears both — or where a
// member's class has no learned layout spot to compare against — flags
// nobody, same "ambiguous means silent" philosophy as everywhere else in
// this codebase, rather than guessing. This is the same "nearest-of-4,
// decisive by a wide margin" reasoning phase1.ts's tower-soak matching
// already uses instead of an absolute distance table.

import type { Pull } from "@/types/Pull";
import type { PlayerInfo } from "@/types/PlayerInfo";
import type { PullError } from "@/types/PullError";
import type { DeathEvent } from "@/types/DeathEvent";
import { interpolatePlayerPosition } from "@/lib/mechanics/player-position";

export const WAVE_CANNON_POSITION_RULE_ID = "ffxiv-phase1-wave-cannon-out-of-position";
export const WAVE_CANNON_MITIGATION_ISSUE_RULE_ID = "ffxiv-phase1-wave-cannon-mitigation-issue";

const WAVE_CANNON_ABILITY_ID = 47784;

// Volley hits on different targets land within tens of ms of each other on
// real logs (observed: <50ms apart); generous without risking merging two
// genuinely separate Wave Cannon activations.
const WAVE_CANNON_VOLLEY_CLUSTER_MS = 250;

// Only pulls lasting this long feed the learned layout — see module header.
const CLEAN_LEARNING_PULL_DURATION_MS = 120_000;

// See module header's "POSITION IS READ ~0.65s BEFORE THE DAMAGE EVENT"
// section — the beam's real targeting snapshot lags the damage event by
// this much.
const WAVE_CANNON_SNAPSHOT_OFFSET_MS = 650;

// Bounds interpolatePlayerPosition's search on EACH side of the snapshot
// moment. Comfortably above the largest real gap observed between position
// samples around this window (~1.1s, h2JvDkntZCaBgmLF pull 3).
const WAVE_CANNON_POSITION_WINDOW_MS = 2000;

type Point = { x: number; y: number };

export type WaveCannonLayout = Readonly<Record<string, Point | null>>;

type RawHit = { actorId: number; player: PlayerInfo; timestamp: number; sourceInstance?: number; x: number; y: number };

function extractHits(players: PlayerInfo[]): RawHit[] {
  const hits: RawHit[] = [];
  for (const player of players) {
    for (const e of player.damageTaken) {
      if (e.abilityId !== WAVE_CANNON_ABILITY_ID || e.x === undefined || e.y === undefined) continue;
      const snapshot = interpolatePlayerPosition(player, e.timestamp - WAVE_CANNON_SNAPSHOT_OFFSET_MS, {
        windowMs: WAVE_CANNON_POSITION_WINDOW_MS,
        healing:  "self",
      });
      const { x, y } = snapshot ?? { x: e.x, y: e.y };
      hits.push({ actorId: player.actorId, player, timestamp: e.timestamp, sourceInstance: e.sourceInstance, x, y });
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

// "Compromised" means EITHER overlap shape — this player was hit by 2+
// distinct instances, OR at least one of their instance(s) also hit
// someone else (2+ distinct players stacked on one instance) — see module
// header. A per-player instance COUNT alone misses the second shape.
function markCompromised(grouped: ReturnType<typeof groupByPlayer>) {
  const membersByInstance = new Map<number, Set<number>>();
  for (const g of grouped) {
    for (const inst of g.instances) {
      const members = membersByInstance.get(inst) ?? new Set<number>();
      members.add(g.player.actorId);
      membersByInstance.set(inst, members);
    }
  }
  return grouped.map((g) => ({
    ...g,
    compromised: [...g.instances].some((inst) => (membersByInstance.get(inst)?.size ?? 0) >= 2),
  }));
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
    const grouped = markCompromised(groupByPlayer(extractHits(pull.players)));
    for (const { player, x, y, compromised } of grouped) {
      if (compromised) continue; // not a clean sample — see markCompromised
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

// Groups compromised players into overlap clusters via union-find over
// shared beam-instance membership, so a 3+-way pileup is compared as one
// group instead of pairwise. See module header's "ATTRIBUTION IS RELATIVE"
// section for why clusters (not a fixed yalm cutoff) decide who flags.
function buildOverlapClusters(
  compromised: ReturnType<typeof markCompromised>
): ReturnType<typeof markCompromised>[number][][] {
  const parent = new Map<number, number>();
  const find = (id: number): number => {
    if (!parent.has(id)) parent.set(id, id);
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    parent.set(id, root);
    return root;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  const membersByInstance = new Map<number, number[]>();
  for (const g of compromised) {
    find(g.player.actorId);
    for (const inst of g.instances) {
      const list = membersByInstance.get(inst) ?? [];
      list.push(g.player.actorId);
      membersByInstance.set(inst, list);
    }
  }
  for (const ids of membersByInstance.values()) {
    for (let i = 1; i < ids.length; i++) union(ids[0], ids[i]);
  }

  const clusters = new Map<number, ReturnType<typeof markCompromised>[number][]>();
  for (const g of compromised) {
    const root = find(g.player.actorId);
    const list = clusters.get(root) ?? [];
    list.push(g);
    clusters.set(root, list);
  }
  return [...clusters.values()];
}

// The cluster's WORST-deviating member must beat its best-positioned member
// by BOTH this ratio AND the absolute floor below to count as the culprit
// — see module header. The ratio alone would flag e.g. 0.3y vs 0.6y
// (technically 2x, but both are fine); the absolute floor alone would flag
// a whole cluster that's uniformly a few yalms off together.
const CULPRIT_MARGIN_RATIO = 2;
const CULPRIT_MARGIN_ABS_CENTIYALMS = 100;

// Only the worst-deviating cluster member(s) flag, not everyone who merely
// clears the margin over the baseline — confirmed necessary (Q3GzJNZg64k1hLRm
// pull 3): a 3-way beam pileup put Salty Dango (~10.8y off, the true root
// cause) and Kade Kansado (~5.1y off, standing correctly at HIS OWN spot,
// just caught by Salty's overlap) both past the ratio/floor over the
// cluster's best member (Sonder Dreams, ~2.5y) — Kade is explicitly
// documented above as NOT flagged. Comparing only to the WORST member
// (within this tie tolerance) instead of to the baseline correctly leaves
// Kade silent (10.8 vs 5.1 isn't a tie) while still catching genuine
// same-severity double mistakes as a tie if they ever occur.
const CULPRIT_TIE_EPSILON_CENTIYALMS = 50;

/**
 * Per-pull: only ever flags the WORST-deviating player (or exact ties) in
 * a Wave Cannon overlap cluster (either compromised shape — see
 * markCompromised) — from `layout`, built once across the report by
 * learnWaveCannonLayout — see module header's "ATTRIBUTION IS RELATIVE"
 * section. A cluster flags nobody when its worst member doesn't clear both
 * margins over its best-positioned member, or when a member's class has no
 * learned spot to compare against — same "ambiguous means silent"
 * philosophy as everywhere else in this codebase.
 */
export function detectWaveCannonPositionErrors(
  players:     PlayerInfo[],
  deathEvents: DeathEvent[],
  layout:      WaveCannonLayout
): PullError[] {
  const grouped = markCompromised(groupByPlayer(extractHits(players)));
  if (grouped.length === 0) return [];

  const compromised = grouped.filter((g) => g.compromised);
  if (compromised.length === 0) return [];

  const diedToWaveCannon = (playerName: string, aroundMs: number) =>
    deathEvents.some(
      (d) =>
        d.player === playerName &&
        d.killingAbilityGameId === WAVE_CANNON_ABILITY_ID &&
        Math.abs(d.timestamp - aroundMs) <= WAVE_CANNON_VOLLEY_CLUSTER_MS + 5000
    );

  const errors: PullError[] = [];

  for (const cluster of buildOverlapClusters(compromised)) {
    const withDistance = cluster
      .map((c) => {
        const spot = layout[c.player.className];
        return spot === null || spot === undefined ? null : { ...c, distance: Math.hypot(c.x - spot.x, c.y - spot.y) };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    // Need at least 2 known spots in the cluster to compare — a lone known
    // spot (or none) can't establish a baseline.
    if (withDistance.length < 2) continue;

    const baseline = Math.min(...withDistance.map((c) => c.distance));
    const worst = Math.max(...withDistance.map((c) => c.distance));
    const decisive = worst - baseline >= CULPRIT_MARGIN_ABS_CENTIYALMS && worst >= baseline * CULPRIT_MARGIN_RATIO;
    const culprits = decisive
      ? withDistance.filter((c) => worst - c.distance <= CULPRIT_TIE_EPSILON_CENTIYALMS)
      : [];
    if (culprits.length === 0) continue;

    const others = cluster
      .map((c) => c.player.name)
      .filter((name) => !culprits.some((o) => o.player.name === name));

    for (const c of culprits) {
      const yalmsOff = (c.distance / 100).toFixed(1);
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
  const grouped = markCompromised(groupByPlayer(extractHits(players)));
  if (grouped.length === 0) return [];

  const victims = grouped.filter((g) => {
    if (g.compromised) return false; // overlap — covered by the position rule instead
    return deathEvents.some((d) => d.player === g.player.name && d.killingAbilityGameId === WAVE_CANNON_ABILITY_ID);
  });
  if (victims.length === 0) return [];

  const names = victims.map((v) => v.player.name);
  // Anchor on the DEATH, not the beam hit — confirmed (h2JvDkntZCaBgmLF pull
  // 5) the two can be ~2s apart (a delayed kill), and mitigation-detection.ts's
  // own "Missed Mitigation" Minor error for the same death anchors on the
  // death too. Anchoring this Raid error on the earlier hit instead put it
  // BEFORE the Minor error that explains it, so report-data.ts's raid-cutoff
  // (anything after the earliest Raid error is dropped) silently ate the
  // real root-cause Minor error. Same "anchor on the latest thing this error
  // depends on" pattern phase1.ts's REVOLTING_RUIN_NON_TANK_DEATH already uses.
  const timestamp = Math.max(
    ...victims.map((v) => {
      const death = deathEvents.find((d) => d.player === v.player.name && d.killingAbilityGameId === WAVE_CANNON_ABILITY_ID);
      return death ? death.timestamp : v.timestamp;
    })
  );

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
