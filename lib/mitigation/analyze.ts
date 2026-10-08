// lib/mitigation/analyze.ts
//
// Per-pull mitigation analysis (docs/archive/mitigation-redesign.md, Model sections
// 1, 3, 4 and 5). Pure: (pull, game) -> MitigationHit[]. Nothing here is a
// PullError; the result only feeds the Mitigation dialog.
//
// ── What a hit is ──────────────────────────────────────────────────────
// One enemy ability's damage landing on RAIDWIDE_MIN_TARGETS+ players,
// consecutive events no more than HIT_CLUSTER_GAP_MS apart (the game
// staggers a raidwide's events ~45ms per target). DoT ticks are left out of
// hit detection but count toward a sequence's later damage. A hit whose
// targets were mostly killed by damage no mitigation saves (beyondMitigation)
// isn't a raidwide: a mechanic hit the wrong players, or an enrage.
//
// ── Where the numbers come from ────────────────────────────────────────
// Everything about the hit itself is read from FFLogs, not estimated:
//   - the active statuses are the damage event's `buffs` snapshot
//     (PlayerEvent.statusIds). It covers boss debuffs too, which a window
//     rebuilt from enemyDebuffs does not: about half of all raidwides are
//     dealt by helper actors that never carry Reprisal/Feint/Addle.
//   - damage before shields is amount + absorbed; FFLogs' multiplier is
//     the total % reduction. The catalog only splits that total among the
//     statuses (and gets checked against it: HitTarget.consistent).
//   - damage type comes from the ability's FFLogs type.
//
// ── Casters and availability ───────────────────────────────────────────
// Who cast an active mitigation is the latest cast of it, by any player who
// has it, within its duration (+ SNAPSHOT_SLACK_MS) before the hit; shields
// name their caster directly through PlayerInfo.shieldAbsorbs. Cooldowns are
// simulated per player from their own casts, with charges recharging one at
// a time and full charges at pull start. A recorded cast that the
// simulation says had no charge is dropped as log noise (a doubled pet
// command was seen: two Fey Illuminations 12.8s apart).
//
// ── Margin, sequences and droppable ────────────────────────────────────
// margin = healthAfter / maxHealth, per target; the hit's margin is the
// lowest, leaving out vulnerable players (they inflate the worst case).
// Hits starting within SEQUENCE_GAP_MS of the previous hit's end form a
// sequence. Each target's laterDrop is how far their health fell after this
// hit until the sequence ended (any enemy damage, DoTs included), so the
// headroom a later hit needs is not offered up as droppable.
// Droppable is greedy: repeatedly remove the active mitigation whose
// removal leaves the lowest player highest, while that player stays at or
// above DROP_FLOOR after the DAMAGE_ROLL_BUFFER. Shields are assumed to
// absorb what they absorbed (their capacity isn't logged), so removing a %
// mitigation in front of a shield is slightly optimistic.

import type { Pull } from "@/types/Pull";
import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type {
  ActiveMitigation, CatalogEntry, DroppableResult, HitTarget, HitVerdict,
  MitigationGame, MitigationHit, MitigationState, PlayerMitigation,
} from "./types";

export const HIT_CLUSTER_GAP_MS    = 1_000;
// A raidwide hits at least this many players AND this share of the living
// party. 4-of-8 spreads and towers (Wave Cannon, The Path of Light) stay out.
export const RAIDWIDE_MIN_TARGETS  = 4;
export const RAIDWIDE_MIN_FRACTION = 0.75;
export const SEQUENCE_GAP_MS       = 5_000;
// A hit's statuses snapshot before its damage lands: Dark Missionary was
// still listed 16.9s after a 15s cast. So a cast covers a hit for its
// duration plus this.
export const SNAPSHOT_SLACK_MS     = 3_000;
// Droppable only considers planned cooldowns; GCD shields and short
// personals (The Blackest Night, Tengentsu) are treated as always used.
export const DROP_MIN_COOLDOWN_MS  = 30_000;
export const CAST_ANCHOR_WINDOW_MS = 12_000;
export const MARGIN_UNDER          = 0.05;
export const MARGIN_OVER           = 0.20;
export const DROP_FLOOR            = 0.05;
export const DAMAGE_ROLL_BUFFER    = 1.05;
export const HEALTH_FULL_FRACTION  = 0.95;
const RESURRECTION_GRACE_MS        = 2_000;
const SAME_HIT_MS                  = 100;

type TargetEvent = { player: PlayerInfo; event: PlayerEvent };

// ── Entry point ─────────────────────────────────────────────────────────

export function analyzePullMitigation(pull: Pull, game: MitigationGame): MitigationHit[] {
  const playerNames = new Set(pull.players.map((p) => p.name));
  const clusters = findRaidwideClusters(pull, playerNames);
  const casts = buildCastTimelines(pull.players, game);

  // Numbered by name within the phase: one mechanic can use several ability
  // IDs (Kefka's Flagrant Fire III variants), and counting per phase keeps
  // the cross-pull match key stable when an earlier phase plays out
  // differently (a skip, or a pull that started from a checkpoint).
  const occurrence = new Map<string, number>();
  const hits: MitigationHit[] = [];
  let sequenceId = 0;
  let lastEnd = -Infinity;

  for (const cluster of clusters) {
    const first = cluster[0].event;
    const counter = `${phaseName(pull, first.timestamp) ?? ""}|${first.abilityName}`;
    const n = (occurrence.get(counter) ?? 0) + 1;
    occurrence.set(counter, n);
    const timestampMs = first.timestamp;
    const endMs = cluster[cluster.length - 1].event.timestamp;
    if (timestampMs - lastEnd > SEQUENCE_GAP_MS) sequenceId++;
    lastEnd = Math.max(lastEnd, endMs);

    hits.push(buildHit(pull, game, cluster, casts, {
      occurrence: n, timestampMs, endMs, sequenceId,
    }));
  }

  applySequenceDrops(hits, pull, playerNames);
  for (const hit of hits) finishHit(hit, game);
  return hits;
}

// ── Hit detection ───────────────────────────────────────────────────────

// Damage before mitigation, as a multiple of max HP, that no mitigation
// survives. Tanks get more room: clean tank busters reach 1.36x (Vamp
// Fatale). Only a hit that killed counts: Dancing Mad's Forsaken and Light
// of Judgment log 1.5x+ raw on players who then survive at 35-52%, so raw
// damage alone can't tell. Vulnerable targets are left to the margin rules.
const BEYOND_MITIGATION_RATIO = 1.5;
const TANK_BEYOND_MITIGATION_RATIO = 2.0;

function beyondMitigation({ player, event }: TargetEvent): boolean {
  if (!event.maxHealth || event.unmitigatedAmount === undefined || !event.overkill) return false;
  if ((event.activeBuffNames ?? []).some((b) => /Vulnerability Up/.test(b))) return false;
  const limit = player.role === "Tank" ? TANK_BEYOND_MITIGATION_RATIO : BEYOND_MITIGATION_RATIO;
  return event.unmitigatedAmount >= limit * event.maxHealth;
}

function findRaidwideClusters(pull: Pull, playerNames: Set<string>): TargetEvent[][] {
  const byAbility = new Map<number, TargetEvent[]>();
  for (const player of pull.players) {
    for (const event of player.damageTaken) {
      if (event.isDoT) continue;
      if (!event.source || playerNames.has(event.source)) continue;
      const list = byAbility.get(event.abilityId) ?? [];
      list.push({ player, event });
      byAbility.set(event.abilityId, list);
    }
  }

  const clusters: TargetEvent[][] = [];
  for (const list of byAbility.values()) {
    list.sort((a, b) => a.event.timestamp - b.event.timestamp);
    let current: TargetEvent[] = [];
    const flush = () => {
      // One event per player: a second hit on the same player in the same
      // cluster is a different resolution (or a stack splash), keep the first.
      const seen = new Set<string>();
      const unique = current.filter((t) => !seen.has(t.player.name) && seen.add(t.player.name));
      const beyond = new Set(current.filter(beyondMitigation).map((t) => t.player.name));
      current = [];
      if (unique.length === 0) return;
      const at = unique[0].event.timestamp;
      const living = pull.players.filter((p) => !isDeadOrFreshlyRevived(p, pull.deathEvents, at)).length;
      const needed = Math.max(RAIDWIDE_MIN_TARGETS, Math.ceil(RAIDWIDE_MIN_FRACTION * living));
      // A hit nobody took damage from (a gaze that was looked away from) is
      // not a damaging mechanic.
      const dealt = unique.some((t) => (t.event.amount ?? 0) + (t.event.absorbed ?? 0) > 0);
      // A hit is no raidwide when most of its targets were killed by damage
      // no mitigation could have saved: they were hit by something not meant
      // for them (Vamp Fatale pull 1 +221.4, a tank buster's 3.4-3.8x max HP
      // killing four non-tanks), or by an enrage.
      const mitigable = unique.filter((t) => !beyond.has(t.player.name));
      if (unique.length >= needed && mitigable.length >= RAIDWIDE_MIN_TARGETS && dealt) clusters.push(unique);
    };
    for (const t of list) {
      const prev = current[current.length - 1];
      if (prev && t.event.timestamp - prev.event.timestamp > HIT_CLUSTER_GAP_MS) flush();
      current.push(t);
    }
    flush();
  }
  return clusters.sort((a, b) => a[0].event.timestamp - b[0].event.timestamp);
}

// ── Cast timelines and cooldown simulation ─────────────────────────────

type CastTimeline = { player: PlayerInfo; entry: CatalogEntry; casts: number[] };

function entriesForJob(game: MitigationGame, job: string): CatalogEntry[] {
  return game.catalog.filter((e) => e.jobs.includes(job));
}

function buildCastTimelines(players: PlayerInfo[], game: MitigationGame): CastTimeline[] {
  const out: CastTimeline[] = [];
  for (const player of players) {
    for (const entry of entriesForJob(game, player.className)) {
      const raw = player.casts
        .filter((c) => entry.actionIds.includes(c.abilityId))
        .map((c) => c.timestamp)
        .sort((a, b) => a - b);
      const casts = entry.cooldownMs > 0 ? simulateCharges(raw, entry).accepted : raw;
      out.push({ player, entry, casts });
    }
  }
  return out;
}

type ChargeState = { charges: number; nextReadyMs: number };

function advance(state: ChargeState, toMs: number, entry: CatalogEntry) {
  const max = entry.charges ?? 1;
  while (state.charges < max && state.nextReadyMs <= toMs) {
    state.charges++;
    state.nextReadyMs = state.charges < max ? state.nextReadyMs + entry.cooldownMs : Infinity;
  }
}

/** Replays casts against the cooldown; casts with no charge left are rejected. */
export function simulateCharges(casts: number[], entry: CatalogEntry): { accepted: number[]; rejected: number[] } {
  const state: ChargeState = { charges: entry.charges ?? 1, nextReadyMs: Infinity };
  const accepted: number[] = [];
  const rejected: number[] = [];
  for (const t of casts) {
    advance(state, t, entry);
    if (state.charges === 0) { rejected.push(t); continue; }
    state.charges--;
    if (state.nextReadyMs === Infinity) state.nextReadyMs = t + entry.cooldownMs;
    accepted.push(t);
  }
  return { accepted, rejected };
}

function chargesAt(casts: number[], entry: CatalogEntry, atMs: number): ChargeState {
  const state: ChargeState = { charges: entry.charges ?? 1, nextReadyMs: Infinity };
  for (const t of casts) {
    if (t > atMs) break;
    advance(state, t, entry);
    state.charges--;
    if (state.nextReadyMs === Infinity) state.nextReadyMs = t + entry.cooldownMs;
  }
  advance(state, atMs, entry);
  return state;
}

// ── Building one hit ────────────────────────────────────────────────────

function buildHit(
  pull: Pull,
  game: MitigationGame,
  cluster: TargetEvent[],
  casts: CastTimeline[],
  at: { occurrence: number; timestampMs: number; endMs: number; sequenceId: number },
): MitigationHit {
  const first = cluster[0].event;
  const column = game.damageColumn(first.damageType);

  const targets: HitTarget[] = [];
  for (const { player, event } of cluster) {
    const target = buildTarget(pull, game, player, event, column);
    if (target) targets.push(target);
  }

  const active = findActive(cluster, game, casts, at.timestampMs, at.endMs);
  const players = buildAvailability(pull, casts, active, cluster, at.timestampMs, at.endMs);
  const castMs = pull.enemyCasts
    ?.filter((c) => c.abilityName === first.abilityName && c.timestamp <= at.timestampMs && at.timestampMs - c.timestamp <= CAST_ANCHOR_WINDOW_MS)
    .reduce<number | undefined>((best, c) => (best === undefined || c.timestamp > best ? c.timestamp : best), undefined);

  return {
    id:           `${phaseName(pull, at.timestampMs) ?? ""}|${first.abilityName}#${at.occurrence}`,
    abilityId:    first.abilityId,
    abilityName:  first.abilityName,
    occurrence:   at.occurrence,
    timestampMs:  at.timestampMs,
    endMs:        at.endMs,
    castMs,
    phase:        phaseName(pull, at.timestampMs),
    damageColumn: column,
    sequenceId:   at.sequenceId,
    targets,
    active,
    players,
    totalDamage:  targets.reduce((s, t) => s + t.damage, 0),
    margin:       0,
    sequenceMargin: 0,
    deaths:       targets.filter((t) => t.died).length,
    cleanDeaths:  targets.filter((t) => t.died && !t.vulnerable).length,
    verdict:      "over",
    droppable:    { keys: [], names: [], worstMargin: 0 },
  };
}

function buildTarget(
  pull: Pull,
  game: MitigationGame,
  player: PlayerInfo,
  event: PlayerEvent,
  column: "physical" | "magical" | "none" | undefined,
): HitTarget | null {
  if (event.healthAfter === undefined || event.healthBefore === undefined || !event.maxHealth) return null;
  const statusIds = (event.statusIds ?? []).filter((id) => game.statusIndex.has(id));
  const catalogProduct = percentProduct(statusIds, game, column);
  const multiplier = event.multiplier;
  const died = (event.overkill ?? 0) > 0 || pull.deathEvents.some((d) =>
    d.player === player.name && Math.abs(d.timestamp - event.timestamp) <= SAME_HIT_MS && d.killingAbilityGameId === event.abilityId);
  const healthAfter = died && event.overkill ? -event.overkill : event.healthAfter;
  const vulnerable = (multiplier !== undefined && multiplier > 1)
    || (event.activeBuffNames ?? []).some((n) => /vulnerability up/i.test(n));

  return {
    player:       player.name,
    job:          player.className,
    maxHealth:    event.maxHealth,
    healthBefore: event.healthBefore,
    healthAfter,
    damage:       event.amount ?? 0,
    absorbed:     event.absorbed ?? 0,
    unmitigated:  event.unmitigatedAmount,
    multiplier,
    catalogProduct,
    consistent:   multiplier === undefined || Math.abs(catalogProduct - multiplier) <= 0.011,
    margin:       healthAfter / event.maxHealth,
    laterDrop:    0,
    died,
    deathCause:   died ? (event.healthBefore / event.maxHealth >= HEALTH_FULL_FRACTION ? "mitigation" : "healing") : undefined,
    vulnerable,
    statusIds,
    shieldAbsorbs: (player.shieldAbsorbs ?? [])
      .filter((a) => a.amount > 0 && Math.abs(a.timestamp - event.timestamp) <= SAME_HIT_MS)
      .map((a) => ({ statusId: a.statusId, caster: a.caster, amount: a.amount })),
  };
}

function percentProduct(statusIds: number[], game: MitigationGame, column: "physical" | "magical" | "none" | undefined): number {
  if (column === "none") return 1;
  let product = 1;
  for (const id of new Set(statusIds)) {
    const s = game.statusIndex.get(id);
    if (!s || s.status.shield || s.entry.kind === "invuln") continue;
    // Unknown damage type: take the smaller of the two columns.
    const r = column ? s.status[column] : Math.min(s.status.physical, s.status.magical);
    product *= 1 - r;
  }
  return product;
}

function findActive(
  cluster: TargetEvent[], game: MitigationGame, casts: CastTimeline[], startMs: number, endMs: number,
): ActiveMitigation[] {
  const byKey = new Map<string, ActiveMitigation>();
  for (const { player, event } of cluster) {
    const keysHere = new Set<string>();
    for (const id of event.statusIds ?? []) {
      const s = game.statusIndex.get(id);
      if (s && !s.status.shield && s.status.physical === 0 && s.status.magical === 0) continue; // marker status
      if (s) keysHere.add(s.entry.key);
    }
    for (const key of keysHere) {
      const entry = game.catalog.find((e) => e.key === key)!;
      const a = byKey.get(key) ?? { key, name: entry.name, kind: entry.kind, casters: [], targets: 0 };
      a.targets++;
      // Shields name their caster on the absorb event.
      for (const abs of player.shieldAbsorbs ?? []) {
        if (Math.abs(abs.timestamp - event.timestamp) <= SAME_HIT_MS && entry.statuses.some((s) => s.id === abs.statusId)
          && abs.caster && !a.casters.includes(abs.caster)) a.casters.push(abs.caster);
      }
      byKey.set(key, a);
    }
  }
  for (const a of byKey.values()) {
    if (a.casters.length > 0) continue;
    for (const tl of casts) {
      if (tl.entry.key !== a.key) continue;
      const window = tl.entry.durationMs + SNAPSHOT_SLACK_MS;
      if (tl.casts.some((t) => t <= endMs + SAME_HIT_MS && startMs - t <= window)) a.casters.push(tl.player.name);
    }
  }
  return [...byKey.values()].sort((a, b) => kindOrder(a.kind) - kindOrder(b.kind) || a.name.localeCompare(b.name));
}

function kindOrder(kind: string): number {
  return ["bossDebuff", "partyBuff", "shield", "personal", "limitBreak", "invuln"].indexOf(kind);
}

function buildAvailability(
  pull: Pull,
  casts: CastTimeline[],
  active: ActiveMitigation[],
  cluster: TargetEvent[],
  atMs: number,
  endMs: number,
): PlayerMitigation[] {
  const out: PlayerMitigation[] = [];
  const targeted = new Set(cluster.map((t) => t.player.name));
  for (const tl of casts) {
    const { player, entry } = tl;
    if (entry.cooldownMs === 0 || entry.kind === "invuln" || entry.kind === "limitBreak") continue;
    if (entry.inSheet === false) continue;
    // A self-only mitigation matters only if this player was hit.
    if (entry.reach === "self" && !targeted.has(player.name)) continue;

    const lastCastMs = [...tl.casts].reverse().find((t) => t <= endMs + SAME_HIT_MS);
    const nextCastMs = tl.casts.find((t) => t > endMs + SAME_HIT_MS);
    const activeHere = active.find((a) => a.key === entry.key);
    const usedByThem = !!activeHere?.casters.includes(player.name);
    const withinDuration = lastCastMs !== undefined && atMs - lastCastMs <= entry.durationMs + SNAPSHOT_SLACK_MS;

    let state: MitigationState;
    let readyMs: number | undefined;
    if (usedByThem && withinDuration) state = "used";
    else if (usedByThem && entry.kind === "shield") state = "used";
    else if (isDeadOrFreshlyRevived(player, pull.deathEvents, atMs)) state = "dead";
    else if (withinDuration && (entry.kind === "bossDebuff" || entry.kind === "partyBuff") && !entry.variableDuration) state = "ineffective";
    else {
      const charges = chargesAt(tl.casts, entry, atMs);
      if (charges.charges === 0) {
        state = "cooldown";
        readyMs = charges.nextReadyMs;
      } else {
        const insert = [...tl.casts, atMs].sort((a, b) => a - b);
        const free = !entry.gated && simulateCharges(insert, entry).rejected.length === 0;
        state = free ? "free" : "available";
      }
    }
    out.push({
      player: player.name, job: player.className, key: entry.key, name: entry.name, kind: entry.kind,
      state, lastCastMs, readyMs, nextCastMs, approximate: !!entry.gated,
    });
  }
  return out;
}

// ── Sequences, margin, verdict, droppable ──────────────────────────────

// laterDrop is measured per player on ALL enemy damage after the hit, not
// just later raidwides: a 4-target spread seconds after a raidwide still
// spends that player's headroom. The follow-up runs while the player's next
// enemy damage arrives within SEQUENCE_GAP_MS, up to FOLLOW_UP_MAX_MS.
export const FOLLOW_UP_MAX_MS = 15_000;

function applySequenceDrops(hits: MitigationHit[], pull: Pull, playerNames: Set<string>) {
  for (const hit of hits) {
    for (const t of hit.targets) {
      const player = pull.players.find((p) => p.name === t.player);
      if (!player || t.died) continue;
      const later = player.damageTaken
        .filter((e) => e.timestamp > hit.endMs + SAME_HIT_MS && e.timestamp <= hit.endMs + FOLLOW_UP_MAX_MS
          && !!e.source && !playerNames.has(e.source))
        .sort((a, b) => a.timestamp - b.timestamp);
      let low = t.healthAfter;
      let last = hit.endMs;
      for (const e of later) {
        if (e.timestamp - last > SEQUENCE_GAP_MS) break;
        last = e.timestamp;
        // A single hit bigger than the player's whole health bar is a failed
        // mechanic, not something headroom could have survived; leave it out.
        // On a fatal hit `amount` stops at the health left, so add overkill
        // (a black hole's Nothingness: 0.2M amount, 9.8M overkill).
        if ((e.amount ?? 0) + (e.overkill ?? 0) >= t.maxHealth) continue;
        const after = e.healthAfter === undefined ? undefined : Math.max(0, e.healthAfter);
        if (after !== undefined && after < low) low = after;
      }
      t.laterDrop = Math.max(0, (t.healthAfter - low) / t.maxHealth);
    }
  }
}

function judged(targets: HitTarget[]): HitTarget[] {
  const clean = targets.filter((t) => !t.vulnerable);
  return clean.length > 0 ? clean : targets;
}

function finishHit(hit: MitigationHit, game: MitigationGame) {
  const pool = judged(hit.targets);
  hit.margin = pool.length ? Math.min(...pool.map((t) => t.margin)) : 0;
  hit.sequenceMargin = pool.length ? Math.min(...pool.map((t) => t.margin - t.laterDrop)) : 0;
  hit.verdict = verdictFor(Math.min(hit.margin, hit.sequenceMargin), hit.cleanDeaths);
  hit.droppable = findDroppable([hit], game);
}

export function verdictFor(margin: number, deaths: number): HitVerdict {
  if (deaths > 0 || margin < MARGIN_UNDER) return "under";
  if (margin < MARGIN_OVER) return "tight";
  return "over";
}

/**
 * A target's margin with the given mitigations removed. Pure, so the later
 * what-if sandbox can reuse it. `rollBuffer` scales the rebuilt damage
 * (DAMAGE_ROLL_BUFFER for planning, 1 for "what would have happened").
 * `sequenceMargin` also scales the target's laterDrop by the removed %
 * mitigations, assuming they covered the follow-up damage too (they
 * usually outlast it; when they didn't, this is conservative).
 */
export function marginWithout(
  target: HitTarget,
  removeKeys: Set<string>,
  game: MitigationGame,
  column: "physical" | "magical" | "none" | undefined,
  rollBuffer = 1,
): { margin: number; sequenceMargin: number } {
  let factor = 1;
  let shieldBack = 0;
  for (const a of target.shieldAbsorbs) {
    const s = game.statusIndex.get(a.statusId);
    if (s && removeKeys.has(s.entry.key)) shieldBack += a.amount;
  }
  for (const id of new Set(target.statusIds)) {
    const s = game.statusIndex.get(id);
    if (!s || !removeKeys.has(s.entry.key) || s.status.shield) continue;
    if (column === "none") continue;
    const r = column ? s.status[column] : Math.min(s.status.physical, s.status.magical);
    if (r < 1) factor *= 1 - r;
  }
  const beforeShields = (target.damage + target.absorbed) / factor * rollBuffer;
  const toHealth = Math.max(0, beforeShields - (target.absorbed - shieldBack));
  const margin = (target.healthBefore - toHealth) / target.maxHealth;
  return { margin, sequenceMargin: margin - target.laterDrop / factor * rollBuffer };
}

/**
 * Greedy droppable set over one hit, or over the same hit in several pulls
 * (the aggregate budgets against the worst of them). Pulls where a
 * non-vulnerable player died to the hit are left out: nothing there can be
 * dropped, and the death is reported on its own.
 */
export function findDroppable(hits: MitigationHit[], game: MitigationGame): DroppableResult {
  const usable = hits
    .filter((h) => h.cleanDeaths === 0)
    .map((h) => ({ hit: h, pool: judged(h.targets).filter((t) => !t.died) }))
    .filter((x) => x.pool.length > 0);
  if (usable.length === 0) {
    return { keys: [], names: [], worstMargin: Math.min(...hits.map((h) => h.sequenceMargin)) };
  }

  const worstWith = (keys: Set<string>) => Math.min(...usable.flatMap(({ hit, pool }) => pool.map((t) =>
    marginWithout(t, keys, game, hit.damageColumn, DAMAGE_ROLL_BUFFER).sequenceMargin)));

  const names = new Map<string, string>();
  for (const { hit } of usable) for (const a of hit.active) names.set(a.key, a.name);

  const removed = new Set<string>();
  const candidates = [...names.keys()].filter((key) => {
    const entry = game.catalog.find((e) => e.key === key);
    // Only party-wide mitigation is offered (user, 2026-10-06): the result
    // is shown as a count of party mitigations the hit could do without.
    if (!entry || entry.reach !== "party" || entry.inSheet === false) return false;
    if (entry.kind === "invuln" || entry.kind === "limitBreak") return false;
    if (entry.cooldownMs < DROP_MIN_COOLDOWN_MS) return false;
    // Skip what had no effect (a % mitigation on an unaspected hit, a
    // shield that absorbed nothing).
    const without = new Set([key]);
    return usable.some(({ hit, pool }) =>
      pool.some((t) => marginWithout(t, without, game, hit.damageColumn).margin < t.margin - 1e-9));
  });
  let worst = worstWith(removed);
  for (;;) {
    let best: { key: string; worst: number } | null = null;
    for (const key of candidates) {
      if (removed.has(key)) continue;
      const w = worstWith(new Set([...removed, key]));
      if (w >= DROP_FLOOR && (!best || w > best.worst)) best = { key, worst: w };
    }
    if (!best) break;
    removed.add(best.key);
    worst = best.worst;
  }
  const keys = [...removed];
  return { keys, names: keys.map((k) => names.get(k)!), worstMargin: worst };
}

// ── Helpers ─────────────────────────────────────────────────────────────

function phaseName(pull: Pull, atMs: number): string | undefined {
  const seg = pull.phaseSegments?.find((s) => atMs >= s.startMs && atMs < s.endMs);
  if (!seg) return undefined;
  return pull.encounterPhases?.find((p) => p.id === seg.phase)?.name ?? `Phase ${seg.phase}`;
}

/** Earliest timestamp after `afterMs` that this player shows any sign of being alive. */
function firstActivityAfter(player: PlayerInfo, afterMs: number): number | undefined {
  let min: number | undefined;
  for (const stream of [player.casts, player.damageTaken, player.healing]) {
    for (const e of stream) {
      if (e.timestamp > afterMs && (min === undefined || e.timestamp < min)) min = e.timestamp;
    }
  }
  return min;
}

/**
 * Dead, or raised too recently to act, at `atMs`. Moved from the retired
 * mitigation-detection.ts (user-confirmed 2026-07-21): there is no raise
 * event, so revival is the first sign of activity after the last death.
 * A death at the hit itself doesn't count; that player was alive for it.
 */
export function isDeadOrFreshlyRevived(player: PlayerInfo, deathEvents: DeathEvent[], atMs: number): boolean {
  const lastDeath = deathEvents
    .filter((d) => d.player === player.name && d.timestamp < atMs)
    .sort((a, b) => b.timestamp - a.timestamp)[0];
  if (!lastDeath) return false;
  const revivedAt = firstActivityAfter(player, lastDeath.timestamp);
  if (revivedAt === undefined || revivedAt > atMs) return true;
  return atMs - revivedAt < RESURRECTION_GRACE_MS;
}
