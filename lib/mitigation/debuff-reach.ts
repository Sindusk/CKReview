// lib/mitigation/debuff-reach.ts
//
// Which attacks a boss debuff (Reprisal, Feint, Addle, Dismantle) actually
// reduces, learned from attempts in the log (lib/mechanics/README.md, "FFXIV
// boss debuffs don't reach every attack"). A debuff sits on one enemy and
// reduces only that enemy's attacks, but which attacks count as "that
// enemy's" can't be read from the attack's source actor: helpers the game
// treats as the boss deal about half of all raidwides, some attacks are
// never reduced, and with two bosses (Red Hot and Deep Blue) a debuff on one
// doesn't touch the other's attacks.
//
// ── Evidence ───────────────────────────────────────────────────────────
// Built from every loaded pull of the boss (more attempts, fewer unknowns).
// Windows come from Pull.bossDebuffs: per enemy actor and status, open from
// the first apply until the last source's remove (or the catalog duration
// when the log has no remove). An attempt is one wave of one ability: its
// enemy damage events on players, no more than HIT_CLUSTER_GAP_MS apart
// (DoT ticks, auto-attacks, dead bodies and unaspected damage left out),
// with a window of the debuff open on some boss at the wave's first event
// and not within SNAPSHOT_SLACK_MS of that window's apply or remove (the
// `buffs` snapshot lags). For each such (boss, debuff):
//   - reached: some target's `buffs` lists the status and the target's
//     FFLogs multiplier agrees (the catalog product matches it, or the
//     multiplier divided by the other statuses leaves this one's %).
//     Listed but disagreeing on every target is inconclusive: counted
//     apart, never toward the state.
//   - missed: no target lists it.
//   - shared: reached, but the same status was open on several bosses at
//     once (Reprisal is an area action and usually lands on both bosses),
//     so which boss's copy reached can't be told. Counted on each of them.
// A key's state goes with the majority of reached vs missed; a tie or no
// attempts is unknown. Overrides (debuff-reach-overrides.ts, from VOD
// review) win over the log.
//
// ── Which boss a player debuffs ────────────────────────────────────────
// Per phase: every boss that player's casts of it landed on in at least
// half their casts there (one cast's applies within CAST_GROUP_MS are one
// landing; Reprisal lands on every boss in range). With no cast of theirs
// in that phase, the bosses anyone's casts landed on most there; with
// nothing in the phase either, the same over the whole pull set.
//
// ── Consumers ──────────────────────────────────────────────────────────
// An added or moved boss debuff reduces a damage part only when
// reachesPart() says "reaches" for the part's ability and the bosses the
// player debuffs: any boss whose key reaches, or, for a player whose debuff
// lands on several bosses, shared attempts outnumbering every one of those
// bosses' misses. Unknown counts as no reduction (conservative). Used by
// notes.ts add options, the timeline's ineffective tooltip and the
// optimizer.

import type { Pull } from "@/types/Pull";
import type { CatalogEntry, MitigationGame } from "./types";
import { HIT_CLUSTER_GAP_MS, SNAPSHOT_SLACK_MS, phaseName } from "./analyze";
import { DEBUFF_REACH_OVERRIDES } from "./debuff-reach-overrides";

// Applies of one cast on several enemies land within this of each other.
const CAST_GROUP_MS = 1_000;
// The multiplier agrees with a listed status within FFLogs' rounding.
const MULTIPLIER_TOLERANCE = 0.011;

export type ReachState = "reaches" | "misses" | "unknown";

export type ReachEvidence = {
  ability:  string;
  boss:     string;
  debuff:   string;  // catalog key
  statusId: number;
  reached:  number;
  missed:   number;
  shared:   number;
  inconclusive: number;
  state:    ReachState;
  // Set when an override decided the state.
  override?: boolean;
};

type Landing = { player: string; phase?: string; statusId: number; bosses: string[] };

export type DebuffReach = {
  evidence: Map<string, ReachEvidence>;  // reachKey(ability, boss, statusId)
  landings: Landing[];
};

export const reachKey = (ability: string, boss: string, statusId: number) => `${ability}|${boss}|${statusId}`;

/** Catalog boss debuffs by status id. */
function debuffStatuses(game: MitigationGame): Map<number, CatalogEntry> {
  const m = new Map<number, CatalogEntry>();
  for (const e of game.catalog) if (e.kind === "bossDebuff") for (const s of e.statuses) m.set(s.id, e);
  return m;
}

type Window = { boss: string; statusId: number; startMs: number; endMs: number };

function buildWindows(pull: Pull, statuses: Map<number, CatalogEntry>): Window[] {
  const out: Window[] = [];
  const open = new Map<string, { boss: string; statusId: number; startMs: number; sources: Set<string>; lastApply: number }>();
  const events = (pull.bossDebuffs ?? []).filter((e) => statuses.has(e.statusId)).sort((a, b) => a.timestamp - b.timestamp);
  for (const e of events) {
    const k = `${e.targetActorId}|${e.targetInstance ?? 0}|${e.statusId}`;
    const w = open.get(k);
    if (e.status === "removed") {
      if (!w) continue;
      w.sources.delete(e.sourceName);
      if (w.sources.size === 0) {
        out.push({ boss: w.boss, statusId: w.statusId, startMs: w.startMs, endMs: e.timestamp });
        open.delete(k);
      }
    } else if (w) {
      w.sources.add(e.sourceName);
      w.lastApply = e.timestamp;
    } else {
      open.set(k, { boss: e.targetName, statusId: e.statusId, startMs: e.timestamp, sources: new Set([e.sourceName]), lastApply: e.timestamp });
    }
  }
  for (const w of open.values()) {
    out.push({ boss: w.boss, statusId: w.statusId, startMs: w.startMs, endMs: w.lastApply + statuses.get(w.statusId)!.durationMs });
  }
  return out;
}

function buildLandings(pull: Pull, statuses: Map<number, CatalogEntry>): Landing[] {
  const out: Landing[] = [];
  const applies = (pull.bossDebuffs ?? [])
    .filter((e) => statuses.has(e.statusId) && e.status !== "removed")
    .sort((a, b) => a.timestamp - b.timestamp);
  const last = new Map<string, { t: number; landing: Landing }>();
  for (const e of applies) {
    const k = `${e.sourceName}|${e.statusId}`;
    const prev = last.get(k);
    if (prev && e.timestamp - prev.t <= CAST_GROUP_MS) {
      if (!prev.landing.bosses.includes(e.targetName)) prev.landing.bosses.push(e.targetName);
      continue;
    }
    const landing = { player: e.sourceName, phase: phaseName(pull, e.timestamp), statusId: e.statusId, bosses: [e.targetName] };
    out.push(landing);
    last.set(k, { t: e.timestamp, landing });
  }
  return out;
}

/** Whether a target's logged multiplier agrees with this status having applied. */
function multiplierAgrees(statusIds: number[], multiplier: number | undefined, statusId: number,
  game: MitigationGame, column: "physical" | "magical"): boolean {
  if (multiplier === undefined) return true;
  let product = 1;
  let own = 1;
  for (const id of new Set(statusIds)) {
    const s = game.statusIndex.get(id);
    if (!s || s.status.shield || s.entry.kind === "invuln") continue;
    const f = 1 - s.status[column];
    product *= f;
    if (id === statusId) own = f;
  }
  if (Math.abs(product - multiplier) <= MULTIPLIER_TOLERANCE) return true;
  // Other listed statuses may not have applied (snapshot lag): check this
  // one's share on its own.
  return Math.abs(multiplier / (product / own) - own) <= MULTIPLIER_TOLERANCE
    || Math.abs(multiplier - own) <= MULTIPLIER_TOLERANCE;
}

type Wave = { ability: string; startMs: number; events: { statusIds: number[]; multiplier?: number; column: "physical" | "magical" }[] };

function buildWaves(pull: Pull, game: MitigationGame): Wave[] {
  const players = new Set(pull.players.map((p) => p.name));
  const byAbility = new Map<string, { t: number; statusIds: number[]; multiplier?: number; column: "physical" | "magical" }[]>();
  for (const player of pull.players) {
    for (const e of player.damageTaken) {
      if (e.isDoT || game.isTick(e.abilityId) || game.isAutoAttack(e.abilityName)) continue;
      if (!e.source || players.has(e.source) || e.healthBefore === 0) continue;
      const column = game.damageColumn(e.damageType);
      if (column !== "physical" && column !== "magical") continue;
      const list = byAbility.get(e.abilityName) ?? [];
      list.push({ t: e.timestamp, statusIds: e.statusIds ?? [], multiplier: e.multiplier, column });
      byAbility.set(e.abilityName, list);
    }
  }
  const out: Wave[] = [];
  for (const [ability, list] of byAbility) {
    list.sort((a, b) => a.t - b.t);
    let wave: Wave | null = null;
    let lastT = -Infinity;
    for (const ev of list) {
      if (!wave || ev.t - lastT > HIT_CLUSTER_GAP_MS) {
        wave = { ability, startMs: ev.t, events: [] };
        out.push(wave);
      }
      wave.events.push(ev);
      lastT = ev.t;
    }
  }
  return out;
}

/** Reach evidence from every loaded pull of one boss. */
export function buildDebuffReach(pulls: Pull[], game: MitigationGame): DebuffReach {
  const statuses = debuffStatuses(game);
  const evidence = new Map<string, ReachEvidence>();
  const landings: Landing[] = [];
  const fresh = (ability: string, boss: string, debuff: string, statusId: number): ReachEvidence =>
    ({ ability, boss, debuff, statusId, reached: 0, missed: 0, shared: 0, inconclusive: 0, state: "unknown" });
  const tally = (ability: string, boss: string, statusId: number, field: "reached" | "missed" | "shared" | "inconclusive") => {
    const k = reachKey(ability, boss, statusId);
    const ev = evidence.get(k) ?? fresh(ability, boss, statuses.get(statusId)!.key, statusId);
    ev[field]++;
    evidence.set(k, ev);
  };

  for (const pull of pulls) {
    const windows = buildWindows(pull, statuses);
    landings.push(...buildLandings(pull, statuses));
    if (windows.length === 0) continue;
    for (const wave of buildWaves(pull, game)) {
      const t = wave.startMs;
      const openAt = windows.filter((w) => w.startMs <= t && t <= w.endMs);
      for (const statusId of new Set(openAt.map((w) => w.statusId))) {
        const all = openAt.filter((w) => w.statusId === statusId);
        const clean = all.filter((w) => t - w.startMs > SNAPSHOT_SLACK_MS && w.endMs - t > SNAPSHOT_SLACK_MS);
        if (clean.length === 0) continue;
        const listed = wave.events.filter((e) => e.statusIds.includes(statusId));
        if (listed.length === 0) {
          for (const w of clean) tally(wave.ability, w.boss, statusId, "missed");
          continue;
        }
        // Another boss's copy near its own edge could also be the one that
        // applied: only a reach with a single open copy names the boss.
        const bosses = [...new Set(all.map((w) => w.boss))];
        if (!listed.some((e) => multiplierAgrees(e.statusIds, e.multiplier, statusId, game, e.column))) {
          for (const b of bosses) tally(wave.ability, b, statusId, "inconclusive");
          continue;
        }
        if (bosses.length > 1) for (const b of bosses) tally(wave.ability, b, statusId, "shared");
        else tally(wave.ability, bosses[0], statusId, "reached");
      }
    }
  }

  for (const ev of evidence.values()) {
    ev.state = ev.reached > ev.missed ? "reaches" : ev.missed > ev.reached ? "misses" : "unknown";
  }
  for (const o of DEBUFF_REACH_OVERRIDES) {
    const entry = game.catalog.find((e) => e.key === o.debuff);
    if (!entry) continue;
    for (const s of entry.statuses) {
      const k = reachKey(o.ability, o.boss, s.id);
      const ev = evidence.get(k) ?? fresh(o.ability, o.boss, o.debuff, s.id);
      ev.state = o.reaches ? "reaches" : "misses";
      ev.override = true;
      evidence.set(k, ev);
    }
  }
  return { evidence, landings };
}

/** The bosses `player`'s casts of this status land on in this phase (see header). */
export function bossesFor(reach: DebuffReach, player: string, statusId: number, phase: string | undefined): string[] {
  const majority = (list: Landing[]) => {
    const counts = new Map<string, number>();
    for (const l of list) for (const b of l.bosses) counts.set(b, (counts.get(b) ?? 0) + 1);
    return [...counts].filter(([, n]) => n * 2 >= list.length).map(([b]) => b);
  };
  const same = reach.landings.filter((l) => l.statusId === statusId);
  const mine = same.filter((l) => l.player === player && l.phase === phase);
  if (mine.length) return majority(mine);
  const inPhase = same.filter((l) => l.phase === phase);
  const top = (list: Landing[]) => {
    const counts = new Map<string, number>();
    for (const l of list) for (const b of l.bosses) counts.set(b, (counts.get(b) ?? 0) + 1);
    const best = Math.max(0, ...counts.values());
    return [...counts].filter(([, n]) => n === best && n > 0).map(([b]) => b);
  };
  return inPhase.length ? top(inPhase) : top(same);
}

/** Whether a debuff on these bosses reduces this ability (see header). */
export function reachState(reach: DebuffReach, ability: string, bosses: string[], statusId: number): { state: ReachState; seen: number } {
  const evs = bosses.map((b) => reach.evidence.get(reachKey(ability, b, statusId)));
  const hit = evs.find((e) => e?.state === "reaches");
  if (hit) return { state: "reaches", seen: hit.reached + hit.shared };
  const overridden = evs.filter((e) => e?.override);
  if (overridden.length && overridden.length === evs.length) return { state: "misses", seen: 0 };
  if (bosses.length > 1) {
    const shared = Math.min(...evs.map((e) => e?.shared ?? 0));
    const missed = Math.max(...evs.map((e) => e?.missed ?? 0));
    if (shared > missed && !evs.some((e) => e?.override)) return { state: "reaches", seen: shared };
  }
  if (evs.length && evs.every((e) => e?.state === "misses")) {
    return { state: "misses", seen: Math.min(...evs.map((e) => e!.missed)) };
  }
  return { state: "unknown", seen: 0 };
}

/**
 * Whether `player` casting this boss debuff would reduce a part of this
 * ability: "reaches" only with evidence for it. Non-debuff entries always
 * reach.
 */
export function reachesPart(reach: DebuffReach | undefined, entry: CatalogEntry, player: string,
  ability: string | undefined, phase: string | undefined): boolean {
  if (entry.kind !== "bossDebuff") return true;
  if (!reach || !ability) return false;
  return entry.statuses.some((s) => reachState(reach, ability, bossesFor(reach, player, s.id, phase), s.id).state === "reaches");
}
