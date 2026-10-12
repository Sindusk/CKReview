// lib/mitigation/analyze.ts
//
// Per-pull mitigation analysis (docs/archive/mitigation-redesign.md, Model sections
// 1, 3, 4 and 5). Pure: (pull, game) -> MitigationHit[]. Nothing here is a
// PullError; the result only feeds the Mitigation dialog.
//
// ── What a hit is ──────────────────────────────────────────────────────
// One enemy ability's damage, consecutive events no more than
// HIT_CLUSTER_GAP_MS apart (the game staggers a hit's events ~45ms per
// target), landing on HIT_MIN_TARGETS+ players or on tanks only (a tank
// buster: TANK_HIT_MIN_RAW, or taken under an invuln). A multi-hit attack's waves fall inside the
// gap, and hits starting within JOIN_GAP_MS of the previous one's end are
// joined to it whatever the ability, so either way one hit can give its
// targets several parts (HitPart). Each target is judged as if every part
// landed at once: health before the first part minus all their damage,
// with no healing in between (user, 2026-10-08). DoT ticks and
// auto-attacks are never hits (MitigationGame.isTick / isAutoAttack) but
// count toward a sequence's later damage. Dead players' bodies still log
// hits (immune, at 0 HP); those are left out. A hit whose targets were
// mostly killed by damage no mitigation saves (beyondMitigation) isn't
// graded: a mechanic hit the wrong players, or an enrage.
//
// Raw and taken damage are averages per target over the non-tanks (the
// tanks on a tank-only hit); health before and after are the lowest of
// everyone hit. Vulnerable players and invulnerable tanks are left out of
// both.
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
// ── Margin, verdict, sequences and droppable ───────────────────────────
// margin = all-at-once health after (above) / maxHealth, per target; the hit's
// margin is the lowest, leaving out vulnerable players (they inflate the
// worst case). Verdict (user, 2026-10-08): fail when a non-vulnerable
// player died, under below MARGIN_UNDER (someone else should add a safety
// net), good up to MARGIN_OVER, over above it.
// Hits starting within SEQUENCE_GAP_MS of the previous hit's end form a
// sequence. Each target's laterDrop is how far their health fell after this
// hit until the sequence ended (any enemy damage, DoTs included), so the
// headroom a later hit needs is not offered up as droppable.
// Droppable, only on an over hit, is greedy: repeatedly remove the active
// mitigation whose removal leaves the lowest player highest, while that
// player stays good (MARGIN_UNDER+) after the DAMAGE_ROLL_BUFFER and above
// SEQUENCE_FLOOR after follow-up damage. Shields are assumed to absorb what
// they absorbed (their capacity isn't logged), so removing a % mitigation
// in front of a shield is slightly optimistic.
//
// ── What-ifs and boss-debuff reach ─────────────────────────────────────
// marginWith is the one what-if: mitigations removed and added on a target
// in one pass (the optimizer, optimize.ts); marginWithout and
// marginWithAdded are its one-sided wrappers. Given the boss's reach
// evidence (debuff-reach.ts), an added boss debuff reduces only the parts
// of attacks it is known to reach, and an ineffective boss debuff on the
// timeline carries how many attempts showed it never reaches this hit's
// attacks (PlayerMitigation.reachMisses). Each HitPart names its attack
// (ability and dealing actor) for this.

import type { Pull } from "@/types/Pull";
import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type {
  ActiveMitigation, CatalogEntry, DroppableResult, HitPart, HitTarget, HitVerdict,
  MitigationGame, MitigationHit, MitigationState, PlayerMitigation,
} from "./types";
import { hitNote } from "./notes";
import { ineffectiveMisses, reachesPart, type DebuffReach } from "./debuff-reach";

export const HIT_CLUSTER_GAP_MS    = 1_000;
// A hit on non-tanks reaches at least this many players (light-party
// stacks and 4-player spreads count; a mechanic clipping one or two players
// is a mistake, not something to mitigate).
export const HIT_MIN_TARGETS       = 4;
export const SEQUENCE_GAP_MS       = 5_000;
// A hit's statuses snapshot before its damage lands: Dark Missionary was
// still listed 16.9s after a 15s cast. So a cast covers a hit for its
// duration plus this.
export const SNAPSHOT_SLACK_MS     = 3_000;
// Droppable only considers planned cooldowns; GCD shields and short
// personals (The Blackest Night, Tengentsu) are treated as always used.
export const DROP_MIN_COOLDOWN_MS  = 30_000;
export const CAST_ANCHOR_WINDOW_MS = 12_000;
export const MARGIN_UNDER          = 0.15;
export const MARGIN_OVER           = 0.30;
export const SEQUENCE_FLOOR        = 0.05;
export const DAMAGE_ROLL_BUFFER    = 1.05;
export const HEALTH_FULL_FRACTION  = 0.95;
const RESURRECTION_GRACE_MS        = 2_000;
const SAME_HIT_MS                  = 100;

type TargetEvent = { player: PlayerInfo; event: PlayerEvent };

// ── Entry point ─────────────────────────────────────────────────────────

export function analyzePullMitigation(pull: Pull, game: MitigationGame, reach?: DebuffReach): MitigationHit[] {
  const playerNames = new Set(pull.players.map((p) => p.name));
  const casts = buildCastTimelines(pull.players, game);
  const hits: MitigationHit[] = [];
  let sequenceId = 0;
  let lastEnd = -Infinity;

  for (const span of spans(pull, playerNames, game)) {
    if (span.timestampMs - lastEnd > SEQUENCE_GAP_MS) sequenceId++;
    lastEnd = Math.max(lastEnd, span.endMs);
    hits.push(buildHit(pull, game, span.cluster, casts, { ...span, sequenceId }, reach));
  }

  applySequenceDrops(hits, pull, playerNames);
  for (const hit of hits) finishHit(hit, game, reach);
  return hits;
}

type Span = { cluster: TargetEvent[]; id: string; occurrence: number; timestampMs: number; endMs: number };

function spans(pull: Pull, playerNames: Set<string>, game: MitigationGame): Span[] {
  // Numbered by name within the phase: one mechanic can use several ability
  // IDs (Kefka's Flagrant Fire III variants), and counting per phase keeps
  // the cross-pull match key stable when an earlier phase plays out
  // differently (a skip, or a pull that started from a checkpoint).
  const occurrence = new Map<string, number>();
  return joinClusters(findHitClusters(pull, playerNames, game)).map((cluster) => {
    const first = cluster[0].event;
    const counter = `${phaseName(pull, first.timestamp) ?? ""}|${first.abilityName}`;
    const n = (occurrence.get(counter) ?? 0) + 1;
    occurrence.set(counter, n);
    return {
      cluster, id: `${counter}#${n}`, occurrence: n,
      timestampMs: first.timestamp, endMs: Math.max(...cluster.map((t) => t.event.timestamp)),
    };
  });
}

/** Each hit's cross-pull id and time span, without the analysis (debuff-reach.ts ties debuff casts to hits with it). */
export function hitSpans(pull: Pull, game: MitigationGame): { id: string; timestampMs: number; endMs: number }[] {
  return spans(pull, new Set(pull.players.map((p) => p.name)), game)
    .map(({ id, timestampMs, endMs }) => ({ id, timestampMs, endMs }));
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

// A tank-only hit is graded only when it is a tank buster: raw damage on
// some tank of at least this share of their max HP. Vamp Fatale's busters
// (Hardcore, Plummet, Ultrasonic Spread on a tank) are 0.49-1.5x; a spread
// or cleave that happened to land on a tank alone (Blood Lash, Explosion,
// Coffinfiller) is 0.18-0.31x.
const TANK_HIT_MIN_RAW = 0.4;

export function rawOf(event: PlayerEvent): number | undefined {
  return event.unmitigatedAmount
    ?? (event.multiplier ? ((event.amount ?? 0) + (event.absorbed ?? 0) + (event.overkill ?? 0)) / event.multiplier : undefined);
}

function busterSized(hit: TargetEvent[]): boolean {
  const byPlayer = new Map<string, { raw: number; max: number }>();
  for (const { player, event } of hit) {
    const raw = rawOf(event);
    if (raw === undefined || !event.maxHealth) continue;
    const b = byPlayer.get(player.name) ?? { raw: 0, max: event.maxHealth };
    b.raw += raw;
    byPlayer.set(player.name, b);
  }
  return [...byPlayer.values()].some((b) => b.raw >= TANK_HIT_MIN_RAW * b.max);
}

function findHitClusters(pull: Pull, playerNames: Set<string>, game: MitigationGame): TargetEvent[][] {
  const byAbility = new Map<number, TargetEvent[]>();
  for (const player of pull.players) {
    for (const event of player.damageTaken) {
      if (event.isDoT || game.isTick(event.abilityId) || game.isAutoAttack(event.abilityName)) continue;
      if (!event.source || playerNames.has(event.source)) continue;
      // A dead player's body still logs the hit, as an immune 0 at 0 HP
      // (Vamp Fatale pull 8, Brutal Rain on a player dead 10s earlier).
      if (event.healthBefore === 0) continue;
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
      // Every event is kept: a second hit on the same player is the next
      // wave of a multi-hit attack (or a stack splash), and it is damage
      // the mitigation had to cover.
      const hit = current;
      current = [];
      if (hit.length === 0) return;
      const names = [...new Set(hit.map((t) => t.player.name))];
      const beyond = new Set(hit.filter(beyondMitigation).map((t) => t.player.name));
      const tankOnly = hit.every((t) => t.player.role === "Tank");
      // A hit nobody took damage from (a gaze that was looked away from) is
      // not a damaging mechanic.
      const dealt = hit.some((t) => (t.event.amount ?? 0) + (t.event.absorbed ?? 0) > 0);
      // A hit isn't graded when most of its targets were killed by damage
      // no mitigation could have saved: they were hit by something not meant
      // for them (Vamp Fatale pull 1 +221.4, a tank buster's 3.4-3.8x max HP
      // killing four non-tanks), or by an enrage.
      const mitigable = names.filter((n) => !beyond.has(n)).length;
      const needed = tankOnly ? 1 : HIT_MIN_TARGETS;
      // A tank-only hit taken under an invuln is a buster even when it logs
      // no damage or raw size: Red Hot and Deep Blue pull A23's opening Hot
      // Impact, taken alone under Hallowed Ground for 0 (the Tanking view
      // needs it, and the next Hot Impact keeps its occurrence number).
      const invulned = tankOnly && hit.some((t) => (t.event.statusIds ?? [])
        .some((id) => game.statusIndex.get(id)?.entry.kind === "invuln"));
      if (tankOnly && !busterSized(hit) && !invulned) return;
      if (names.length >= needed && mitigable >= needed && (dealt || invulned)) clusters.push(hit);
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

// Hits in quick succession are judged as one (user, 2026-10-08): a cluster
// starting within JOIN_GAP_MS of the previous one's end joins it, whatever
// the ability (Red Hot and Deep Blue's Pyrotation: three 4-target hits 2s
// apart). A chain stops growing at JOIN_MAX_SPAN_MS, so a long run of
// small hits can't fold a whole phase into one row.
export const JOIN_GAP_MS = 3_000;
export const JOIN_MAX_SPAN_MS = 10_000;

function joinClusters(clusters: TargetEvent[][]): TargetEvent[][] {
  const out: TargetEvent[][] = [];
  for (const cluster of clusters) {
    const prev = out[out.length - 1];
    const start = cluster[0].event.timestamp;
    if (prev) {
      const prevStart = prev[0].event.timestamp;
      const prevEnd = Math.max(...prev.map((t) => t.event.timestamp));
      if (start - prevEnd <= JOIN_GAP_MS && start - prevStart <= JOIN_MAX_SPAN_MS) {
        prev.push(...cluster);
        continue;
      }
    }
    out.push([...cluster]);
  }
  for (const hit of out) hit.sort((a, b) => a.event.timestamp - b.event.timestamp);
  return out;
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
      out.push({ player, entry, casts: playerCasts(player, entry) });
    }
  }
  return out;
}

/** A player's casts of an entry, in order, with casts the cooldown rules out dropped as log noise. */
export function playerCasts(player: PlayerInfo, entry: CatalogEntry): number[] {
  const raw = player.casts
    .filter((c) => entry.actionIds.includes(c.abilityId))
    .map((c) => c.timestamp)
    .sort((a, b) => a - b);
  return entry.cooldownMs > 0 ? simulateCharges(raw, entry).accepted : raw;
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

/** Charges left at `atMs` and when the next one comes back (Infinity when full). */
export function chargesAt(casts: number[], entry: CatalogEntry, atMs: number): ChargeState {
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
  at: { id: string; occurrence: number; timestampMs: number; endMs: number; sequenceId: number },
  reach: DebuffReach | undefined,
): MitigationHit {
  const first = cluster[0].event;
  const column = game.damageColumn(first.damageType);

  const byPlayer = new Map<string, { player: PlayerInfo; events: PlayerEvent[] }>();
  for (const { player, event } of cluster) {
    const g = byPlayer.get(player.name) ?? { player, events: [] };
    g.events.push(event);
    byPlayer.set(player.name, g);
  }
  const targets: HitTarget[] = [];
  for (const { player, events } of byPlayer.values()) {
    const target = buildTarget(pull, game, player, events, column);
    if (target) targets.push(target);
  }
  const pool = judged(targets);
  const tankOnly = targets.length > 0 && targets.every((t) => t.tank);
  const scope = tankOnly ? pool : pool.filter((t) => !t.tank);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
  const raws = scope.map((t) => t.unmitigated).filter((x): x is number => x !== undefined);

  const active = findActive(byPlayer, game, casts, at.timestampMs, at.endMs);
  const players = buildAvailability(pull, casts, active, cluster, at.timestampMs, at.endMs);
  if (reach) markReachMisses(players, cluster, reach, game, pull.id, at.timestampMs);
  const castMs = pull.enemyCasts
    ?.filter((c) => c.abilityName === first.abilityName && c.timestamp <= at.timestampMs && at.timestampMs - c.timestamp <= CAST_ANCHOR_WINDOW_MS)
    .reduce<number | undefined>((best, c) => (best === undefined || c.timestamp > best ? c.timestamp : best), undefined);

  return {
    id:           at.id,
    abilityId:    first.abilityId,
    abilityName:  first.abilityName,
    abilityNames: [...new Set(cluster.map((t) => t.event.abilityName))],
    occurrence:   at.occurrence,
    timestampMs:  at.timestampMs,
    endMs:        at.endMs,
    castMs,
    phase:        phaseName(pull, at.timestampMs),
    damageColumn: column,
    sequenceId:   at.sequenceId,
    waves:        Math.max(1, ...targets.map((t) => t.parts.length)),
    tankOnly,
    targets,
    active,
    players,
    totalDamage:  targets.reduce((s, t) => s + t.damage, 0),
    rawDamage:    raws.length ? avg(raws) : undefined,
    takenDamage:  avg(scope.map((t) => t.damage)),
    absorbedDamage: avg(scope.map((t) => t.absorbed)),
    lowestBefore: pool.length ? Math.min(...pool.map((t) => t.healthBefore / t.maxHealth)) : 1,
    margin:       0,
    sequenceMargin: 0,
    deaths:       targets.filter((t) => t.died).length,
    cleanDeaths:  targets.filter((t) => t.died && !t.vulnerable).length,
    verdict:      "over",
    droppable:    { keys: [], names: [], worstMargin: 0, alternatives: [], candidates: 0 },
    note:         "",
  };
}

function buildTarget(
  pull: Pull,
  game: MitigationGame,
  player: PlayerInfo,
  events: PlayerEvent[],
  column: "physical" | "magical" | "none" | undefined,
): HitTarget | null {
  const usable = events.filter((e) => e.healthAfter !== undefined && e.healthBefore !== undefined && e.maxHealth);
  if (usable.length === 0) return null;
  const first = usable[0];
  const maxHealth = first.maxHealth!;

  // Health before the part that killed, for telling a mitigation death
  // (from full) from a healing one.
  let fatalBefore: number | undefined;
  let unmitigated: number | undefined = 0;
  const parts: HitPart[] = [];
  for (const event of usable) {
    const fatal = (event.overkill ?? 0) > 0 || pull.deathEvents.some((d) =>
      d.player === player.name && Math.abs(d.timestamp - event.timestamp) <= SAME_HIT_MS && d.killingAbilityGameId === event.abilityId);
    if (fatal && fatalBefore === undefined) fatalBefore = event.healthBefore!;
    const overkill = event.overkill ?? 0;
    const raw = rawOf(event);
    unmitigated = unmitigated === undefined || raw === undefined ? undefined : unmitigated + raw;
    parts.push({
      abilityName: event.abilityName,
      source:      event.source,
      timestampMs: event.timestamp,
      damage:      (event.amount ?? 0) + overkill,
      absorbed:    event.absorbed ?? 0,
      healthAfter: fatal && overkill ? -overkill : event.healthAfter!,
      column:      game.damageColumn(event.damageType),
      statusIds:   (event.statusIds ?? []).filter((id) => game.statusIndex.has(id)),
      shieldAbsorbs: (player.shieldAbsorbs ?? [])
        .filter((a) => a.amount > 0 && Math.abs(a.timestamp - event.timestamp) <= SAME_HIT_MS)
        .map((a) => ({ statusId: a.statusId, caster: a.caster, amount: a.amount })),
    });
  }
  // As if every part landed at once: no healing between them counts.
  const healthAfter = first.healthBefore! - parts.reduce((s, p) => s + p.damage, 0);
  const died = fatalBefore !== undefined;
  const catalogProduct = percentProduct(parts[0].statusIds, game, column);
  const multiplier = first.multiplier;
  const vulnerable = usable.some((e) => (e.multiplier !== undefined && e.multiplier > 1)
    || (e.activeBuffNames ?? []).some((n) => /vulnerability up/i.test(n)));

  return {
    player:       player.name,
    job:          player.className,
    tank:         player.role === "Tank",
    maxHealth,
    healthBefore: first.healthBefore!,
    healthAfter,
    damage:       parts.reduce((s, p) => s + p.damage, 0),
    absorbed:     parts.reduce((s, p) => s + p.absorbed, 0),
    unmitigated,
    multiplier,
    catalogProduct,
    consistent:   multiplier === undefined || Math.abs(catalogProduct - multiplier) <= 0.011,
    parts,
    margin:       healthAfter / maxHealth,
    laterDrop:    0,
    died,
    deathCause:   fatalBefore === undefined ? undefined
      : fatalBefore / maxHealth >= HEALTH_FULL_FRACTION ? "mitigation" : "healing",
    vulnerable,
    invulnerable: parts.some((p) => p.statusIds.some((id) => game.statusIndex.get(id)?.entry.kind === "invuln"))
      || (!died && underTrailingInvuln(player, game, first.timestamp)),
    statusIds:    [...new Set(parts.flatMap((p) => p.statusIds))],
    shieldAbsorbs: parts.flatMap((p) => p.shieldAbsorbs),
  };
}

/** Within an unlisted invulnerability (CatalogEntry.trailingInvulnMs) from this player's own cast. */
export function underTrailingInvuln(player: PlayerInfo, game: MitigationGame, atMs: number): boolean {
  return !!trailingInvulnAt(player, game, atMs);
}

/** The entry whose unlisted trailing invulnerability covers `atMs`, if any. */
export function trailingInvulnAt(player: PlayerInfo, game: MitigationGame, atMs: number): CatalogEntry | undefined {
  return game.catalog.find((e) => e.trailingInvulnMs && e.jobs.includes(player.className)
    && player.casts.some((c) => e.actionIds.includes(c.abilityId) && c.timestamp <= atMs
      && atMs - c.timestamp <= e.durationMs + e.trailingInvulnMs!));
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
  byPlayer: Map<string, { player: PlayerInfo; events: PlayerEvent[] }>,
  game: MitigationGame, casts: CastTimeline[], startMs: number, endMs: number,
): ActiveMitigation[] {
  const byKey = new Map<string, ActiveMitigation>();
  for (const { player, events } of byPlayer.values()) {
    const keysHere = new Set<string>();
    for (const event of events) {
      for (const id of event.statusIds ?? []) {
        const s = game.statusIndex.get(id);
        if (s && !s.status.shield && s.status.physical === 0 && s.status.magical === 0) continue; // marker status
        if (s) keysHere.add(s.entry.key);
      }
    }
    for (const key of keysHere) {
      const entry = game.catalog.find((e) => e.key === key)!;
      const a = byKey.get(key) ?? { key, name: entry.name, kind: entry.kind, casters: [], targets: 0 };
      a.targets++;
      // Shields name their caster on the absorb event.
      for (const abs of player.shieldAbsorbs ?? []) {
        if (events.some((e) => Math.abs(abs.timestamp - e.timestamp) <= SAME_HIT_MS) && entry.statuses.some((s) => s.id === abs.statusId)
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
      state, dead: isDeadOrFreshlyRevived(player, pull.deathEvents, atMs),
      lastCastMs, readyMs, nextCastMs, approximate: !!entry.gated,
    });
  }
  return out;
}

/** Tags ineffective boss debuffs the reach evidence says can't reduce this hit's attacks (the timeline tooltip). */
function markReachMisses(players: PlayerMitigation[], cluster: TargetEvent[], reach: DebuffReach, game: MitigationGame,
  pullId: number, atMs: number) {
  const attacks = [...new Map(cluster.map((t) => [`${t.event.abilityName}|${t.event.source}`,
    { abilityName: t.event.abilityName, source: t.event.source }])).values()];
  for (const p of players) {
    if (p.state !== "ineffective" || p.kind !== "bossDebuff") continue;
    const entry = game.catalog.find((e) => e.key === p.key);
    if (entry) p.reachMisses = ineffectiveMisses(reach, entry, pullId, p.player, attacks, atMs);
  }
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
      // From the health actually logged after the last part: later events'
      // health is real too, unlike the all-at-once healthAfter.
      const start = t.parts[t.parts.length - 1].healthAfter;
      let low = start;
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
      t.laterDrop = Math.max(0, (start - low) / t.maxHealth);
    }
  }
}

// The targets a hit is graded on: never an invulnerable tank, and
// vulnerable players only when everyone hit was vulnerable.
export function judged(targets: HitTarget[]): HitTarget[] {
  const mortal = targets.filter((t) => !t.invulnerable);
  const clean = mortal.filter((t) => !t.vulnerable);
  return clean.length > 0 ? clean : mortal;
}

function finishHit(hit: MitigationHit, game: MitigationGame, reach: DebuffReach | undefined) {
  const pool = judged(hit.targets);
  if (pool.length === 0) {
    // Everyone hit was invulnerable: nothing to grade.
    hit.margin = hit.sequenceMargin = 1;
    hit.verdict = "good";
    hit.note = "Taken with an invulnerability.";
    return;
  }
  hit.margin = Math.min(...pool.map((t) => t.margin));
  hit.sequenceMargin = Math.min(...pool.map((t) => t.margin - t.laterDrop));
  hit.verdict = verdictFor(hit.margin, hit.cleanDeaths);
  if (hit.verdict === "over") hit.droppable = findDroppable([hit], game);
  hit.note = hitNote(hit, game, reach);
}

export function verdictFor(margin: number, deaths: number): HitVerdict {
  if (deaths > 0) return "fail";
  if (margin < MARGIN_UNDER) return "under";
  if (margin < MARGIN_OVER) return "good";
  return "over";
}

type Column = "physical" | "magical" | "none" | undefined;

/** The % reduction a status gives against this damage column (0 for shields and unaspected hits). */
export function statusReduction(statusId: number, game: MitigationGame, column: Column): number {
  const s = game.statusIndex.get(statusId);
  if (!s || s.status.shield || column === "none") return 0;
  return column ? s.status[column] : Math.min(s.status.physical, s.status.magical);
}

/**
 * A target's margin with the given mitigations removed. Pure, so the later
 * what-if sandbox can reuse it. `rollBuffer` scales the rebuilt damage
 * (DAMAGE_ROLL_BUFFER for planning, 1 for "what would have happened").
 * Like the margin itself, every part is taken to land at once, each with
 * its own damage type. `column` is only the fallback for a part without one.
 * `sequenceMargin` also scales the target's laterDrop by the removed %
 * mitigations, assuming they covered the follow-up damage too (they
 * usually outlast it; when they didn't, this is conservative).
 */
export function marginWithout(
  target: HitTarget,
  removeKeys: Set<string>,
  game: MitigationGame,
  column: Column,
  rollBuffer = 1,
): { margin: number; sequenceMargin: number } {
  return marginWith(target, removeKeys, [], game, column, rollBuffer);
}

/** A mitigation added to a target in marginWith. */
export type AddedMitigation = {
  entry:   CatalogEntry;
  // What an added shield absorbs (its capacity isn't logged, so the caller
  // estimates it); ignored for an entry with no shield status.
  shield:  number;
  // Limits the % to some parts (a boss debuff reaches only the attacks its
  // evidence allows: debuff-reach.ts). Default: every part.
  applies?: (part: HitPart) => boolean;
};

/**
 * A target's margin with some mitigations removed and others added, in one
 * pass (the optimizer's evaluation; marginWithout and marginWithAdded are
 * the one-sided cases). Per part, every part taken to land at once:
 *   - a removed % status divides out of the logged damage before shields;
 *     a removed shield gives back what it absorbed.
 *   - an added % status scales that damage by the part's own column
 *     (`column` is the fallback); unaspected ("none") damage takes shields
 *     only.
 *   - `rollBuffer` scales the rebuilt damage (DAMAGE_ROLL_BUFFER for
 *     planning, 1 for "what would have happened").
 * Added shields then subtract their size from the target's total.
 * `sequenceMargin` also scales the target's laterDrop by the removed %
 * mitigations (assumed to cover the follow-up too; conservative when they
 * didn't). Added ones don't scale it.
 * `game` is needed only when something is removed.
 */
export function marginWith(
  target: HitTarget,
  removeKeys: Set<string>,
  add: AddedMitigation[],
  game: MitigationGame | undefined,
  column: Column,
  rollBuffer = 1,
): { margin: number; sequenceMargin: number } {
  let toHealthTotal = 0;
  let factor = 1;
  for (const part of target.parts) {
    let shieldBack = 0;
    factor = 1;
    if (removeKeys.size > 0) {
      for (const a of part.shieldAbsorbs) {
        const s = game!.statusIndex.get(a.statusId);
        if (s && removeKeys.has(s.entry.key)) shieldBack += a.amount;
      }
      for (const id of new Set(part.statusIds)) {
        const s = game!.statusIndex.get(id);
        if (!s || !removeKeys.has(s.entry.key)) continue;
        const r = statusReduction(id, game!, part.column ?? column);
        if (r < 1) factor *= 1 - r;
      }
    }
    const col = part.column ?? column;
    let added = 1;
    if (col !== "none") {
      for (const a of add) {
        if (a.applies && !a.applies(part)) continue;
        for (const s of a.entry.statuses) {
          if (s.shield) continue;
          added *= 1 - (col ? s[col] : Math.min(s.physical, s.magical));
        }
      }
    }
    const beforeShields = (part.damage + part.absorbed) / factor * rollBuffer * added;
    toHealthTotal += Math.max(0, beforeShields - (part.absorbed - shieldBack));
  }
  const shields = add.reduce((s, a) => s + (a.entry.statuses.some((x) => x.shield) ? a.shield : 0), 0);
  toHealthTotal = Math.max(0, toHealthTotal - shields);
  const margin = (target.healthBefore - toHealthTotal) / target.maxHealth;
  return { margin, sequenceMargin: margin - target.laterDrop / factor * rollBuffer };
}

/**
 * A target's margin with an entry added: an added % mitigation scales each
 * part's logged damage before shields; an added shield subtracts
 * `shieldAmount` (its capacity isn't logged, so the caller estimates it).
 * `applies` limits the % to some parts (a boss debuff reaches only the
 * attacks its evidence allows: debuff-reach.ts).
 */
export function marginWithAdded(t: HitTarget, entry: CatalogEntry, shieldAmount: number, column: Column,
  applies?: (part: HitPart) => boolean): number {
  return marginWith(t, new Set(), [{ entry, shield: shieldAmount, applies }], undefined, column).margin;
}

/**
 * The hit's lowest HP with `player` casting `entry` on it: a party entry
 * reaches everyone, a self one only its caster, a target one the lowest
 * player. A boss debuff counts only on the attacks its reach evidence
 * says it reduces (none without evidence). Infinity when nobody hit is
 * graded.
 */
export function lowestWithAdded(hit: MitigationHit, entry: CatalogEntry, player: string, shieldAmount: number,
  reach?: DebuffReach): number {
  const pool = judged(hit.targets);
  const lowest = [...pool].sort((a, b) => a.margin - b.margin)[0];
  const gets = (t: HitTarget) => entry.reach === "party" || (entry.reach === "self" ? t.player === player : t === lowest);
  const applies = (part: HitPart) => reachesPart(reach, entry, player, part, hit);
  return Math.min(...pool.map((t) => (gets(t) ? marginWithAdded(t, entry, shieldAmount, hit.damageColumn, applies) : t.margin)));
}

/** Whether removing this catalog entry is ever offered as droppable on this hit. */
export function droppableEntry(entry: CatalogEntry | undefined, tankOnly: boolean): boolean {
  if (!entry || entry.inSheet === false) return false;
  // Party-wide mitigation only (user, 2026-10-06), except on a tank-only
  // hit, where the tanks' own cooldowns are what gets planned.
  if (entry.reach !== "party" && !tankOnly) return false;
  if (entry.kind === "invuln" || entry.kind === "limitBreak") return false;
  return entry.cooldownMs >= DROP_MIN_COOLDOWN_MS;
}

/**
 * Greedy droppable set over one hit, or over the same hit in several pulls
 * (the aggregate budgets against the worst of them): what an over hit can
 * do without and still land good. Pulls where a non-vulnerable player died
 * to the hit are left out: nothing there can be dropped, and the death is
 * reported on its own.
 */
export function findDroppable(hits: MitigationHit[], game: MitigationGame): DroppableResult {
  const usable = hits
    .filter((h) => h.cleanDeaths === 0)
    .map((h) => ({ hit: h, pool: judged(h.targets).filter((t) => !t.died) }))
    .filter((x) => x.pool.length > 0);
  if (usable.length === 0) {
    return { keys: [], names: [], worstMargin: Math.min(...hits.map((h) => h.margin)), alternatives: [], candidates: 0 };
  }

  const worstWith = (keys: Set<string>) => {
    let margin = Infinity;
    let sequence = Infinity;
    for (const { hit, pool } of usable) {
      for (const t of pool) {
        const m = marginWithout(t, keys, game, hit.damageColumn, DAMAGE_ROLL_BUFFER);
        margin = Math.min(margin, m.margin);
        sequence = Math.min(sequence, m.sequenceMargin);
      }
    }
    return { margin, ok: margin >= MARGIN_UNDER && sequence >= SEQUENCE_FLOOR };
  };

  const names = new Map<string, string>();
  for (const { hit } of usable) for (const a of hit.active) names.set(a.key, a.name);

  const tankOnly = usable.every(({ hit }) => hit.tankOnly);
  const removed = new Set<string>();
  const candidates = [...names.keys()].filter((key) => {
    if (!droppableEntry(game.catalog.find((e) => e.key === key), tankOnly)) return false;
    // Skip what had no effect (a % mitigation on an unaspected hit, a
    // shield that absorbed nothing).
    const without = new Set([key]);
    return usable.some(({ hit, pool }) =>
      pool.some((t) => marginWithout(t, without, game, hit.damageColumn).margin < t.margin - 1e-9));
  });
  const alternatives = candidates.filter((key) => worstWith(new Set([key])).ok);
  let worst = worstWith(removed).margin;
  for (;;) {
    let best: { key: string; worst: number } | null = null;
    for (const key of candidates) {
      if (removed.has(key)) continue;
      const w = worstWith(new Set([...removed, key]));
      if (w.ok && (!best || w.margin > best.worst)) best = { key, worst: w.margin };
    }
    if (!best) break;
    removed.add(best.key);
    worst = best.worst;
  }
  const keys = [...removed];
  return {
    keys, names: keys.map((k) => names.get(k)!), worstMargin: worst,
    alternatives: alternatives.map((k) => names.get(k)!),
    candidates: candidates.length,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────

export function phaseName(pull: Pull, atMs: number): string | undefined {
  const seg = pull.phaseSegments?.find((s) => atMs >= s.startMs && atMs < s.endMs);
  if (!seg) return undefined;
  return pull.encounterPhases?.find((p) => p.id === seg.phase)?.name ?? `Phase ${seg.phase}`;
}

/** Earliest timestamp after `afterMs` that this player shows any sign of being alive. */
export function firstActivityAfter(player: PlayerInfo, afterMs: number): number | undefined {
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
