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
// ── What an attack is ──────────────────────────────────────────────────
// An ability name AND the actor that dealt it. One name can be two attacks
// landing together: Red Hot and Deep Blue each cast their own Divers' Dare
// at the same moment, and a debuff on one boss reduces only that boss's
// copy (user, 2026-10-11). The source only tells attacks apart; whether a
// debuff on a boss reaches the attack is still decided by attempts.
//
// ── Evidence ───────────────────────────────────────────────────────────
// Built from every loaded pull of the boss (more attempts, fewer unknowns).
// Windows come from Pull.bossDebuffs: per enemy actor and status, open from
// the first apply until the last source's remove (or the catalog duration
// when the log has no remove). An attempt is one wave of one attack: its
// damage events on players, no more than HIT_CLUSTER_GAP_MS apart (DoT
// ticks, auto-attacks, dead bodies and unaspected damage left out), with a
// window of the debuff open on some boss at the wave's first event and not
// within SNAPSHOT_SLACK_MS of that window's apply or remove (the `buffs`
// snapshot lags). For each such (boss, debuff):
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
// One cast's applies within CAST_GROUP_MS are one landing (Reprisal lands
// on every boss in range); a landing is for the first hit it covered
// (analyze.ts hitSpans, within its duration + SNAPSHOT_SLACK_MS). For a
// planned cast on a hit (user, 2026-10-11: per hit), every boss that
// player's landings for that same hit, in any loaded pull, were on in at
// least half of them. Never cast for that hit: the same over their
// landings in the hit's phase; none there either, the bosses anyone's
// landings in the phase were on most; then the same over the whole pull
// set. An ineffective cast on the timeline uses the bosses that cast
// really landed on.
//
// ── Consumers ──────────────────────────────────────────────────────────
// An added or moved boss debuff reduces a damage part only when
// reachesPart() says "reaches" for the part's attack and the bosses the
// player debuffs: any boss whose key reaches, or, for a player whose debuff
// lands on several bosses, shared attempts outnumbering every one of those
// bosses' misses. Unknown counts as no reduction (conservative). Used by
// notes.ts add options, the timeline's ineffective tooltip and the
// optimizer.

import type { Pull } from "@/types/Pull";
import type { CatalogEntry, HitPart, MitigationGame, MitigationHit } from "./types";
import { HIT_CLUSTER_GAP_MS, SNAPSHOT_SLACK_MS, hitSpans, judged, phaseName } from "./analyze";
import { DEBUFF_REACH_OVERRIDES } from "./debuff-reach-overrides";

// Applies of one cast on several enemies land within this of each other.
const CAST_GROUP_MS = 1_000;
// The multiplier agrees with a listed status within FFLogs' rounding.
const MULTIPLIER_TOLERANCE = 0.011;

export type ReachState = "reaches" | "misses" | "unknown";
type Outcome = "reached" | "missed" | "shared" | "inconclusive";

export type ReachEvidence = {
  ability:  string;
  source:   string;  // the actor that dealt it ("*" on an override for every source)
  boss:     string;
  debuff:   string;  // catalog key
  statusId: number;
  reached:  number;
  missed:   number;
  shared:   number;
  inconclusive: number;
  state:    ReachState;  // overrides applied
  override?: boolean;
};

type Landing = {
  pullId: number; atMs: number; player: string; phase?: string; statusId: number; bosses: string[];
  hitId?: string;  // the first hit it covered
};

export type DebuffReach = {
  evidence: Map<string, ReachEvidence>;  // reachKey(ability, source, boss, statusId)
  landings: Landing[];
};

export const reachKey = (ability: string, source: string, boss: string, statusId: number) =>
  `${ability}|${source}|${boss}|${statusId}`;

/** Catalog boss debuffs by status id. */
function debuffStatuses(game: MitigationGame): Map<number, CatalogEntry> {
  const m = new Map<number, CatalogEntry>();
  for (const e of game.catalog) if (e.kind === "bossDebuff") for (const s of e.statuses) m.set(s.id, e);
  return m;
}

/** The override for this key, if any: one naming the source wins over one for every source. */
function overrideFor(ability: string, source: string, boss: string, debuff: string) {
  const matches = DEBUFF_REACH_OVERRIDES.filter((o) => o.ability === ability && o.boss === boss && o.debuff === debuff
    && (o.source === undefined || o.source === source));
  return matches.find((o) => o.source !== undefined) ?? matches[0];
}

type Window = { boss: string; statusId: number; startMs: number; endMs: number; casters: string[] };

function buildWindows(pull: Pull, statuses: Map<number, CatalogEntry>): Window[] {
  const out: Window[] = [];
  const open = new Map<string, { boss: string; statusId: number; startMs: number; sources: Set<string>; casters: string[]; lastApply: number }>();
  const events = (pull.bossDebuffs ?? []).filter((e) => statuses.has(e.statusId)).sort((a, b) => a.timestamp - b.timestamp);
  for (const e of events) {
    const k = `${e.targetActorId}|${e.targetInstance ?? 0}|${e.statusId}`;
    const w = open.get(k);
    if (e.status === "removed") {
      if (!w) continue;
      w.sources.delete(e.sourceName);
      if (w.sources.size === 0) {
        out.push({ boss: w.boss, statusId: w.statusId, startMs: w.startMs, endMs: e.timestamp, casters: w.casters });
        open.delete(k);
      }
    } else if (w) {
      w.sources.add(e.sourceName);
      if (!w.casters.includes(e.sourceName)) w.casters.push(e.sourceName);
      w.lastApply = e.timestamp;
    } else {
      open.set(k, { boss: e.targetName, statusId: e.statusId, startMs: e.timestamp, sources: new Set([e.sourceName]),
        casters: [e.sourceName], lastApply: e.timestamp });
    }
  }
  for (const w of open.values()) {
    out.push({ boss: w.boss, statusId: w.statusId, startMs: w.startMs, endMs: w.lastApply + statuses.get(w.statusId)!.durationMs, casters: w.casters });
  }
  return out;
}

function buildLandings(pull: Pull, statuses: Map<number, CatalogEntry>, game: MitigationGame): Landing[] {
  const out: Landing[] = [];
  const hits = hitSpans(pull, game);
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
    const reachMs = statuses.get(e.statusId)!.durationMs + SNAPSHOT_SLACK_MS;
    const landing: Landing = {
      pullId: pull.id, atMs: e.timestamp, player: e.sourceName, phase: phaseName(pull, e.timestamp),
      statusId: e.statusId, bosses: [e.targetName],
      hitId: hits.find((h) => h.endMs >= e.timestamp && h.timestampMs - e.timestamp <= reachMs)?.id,
    };
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

type WaveEvent = { t: number; statusIds: number[]; multiplier?: number; column: "physical" | "magical" };
type Wave = { ability: string; source: string; startMs: number; events: WaveEvent[] };

function buildWaves(pull: Pull, game: MitigationGame): Wave[] {
  const players = new Set(pull.players.map((p) => p.name));
  const byAttack = new Map<string, { ability: string; source: string; list: WaveEvent[] }>();
  for (const player of pull.players) {
    for (const e of player.damageTaken) {
      if (e.isDoT || game.isTick(e.abilityId) || game.isAutoAttack(e.abilityName)) continue;
      if (!e.source || players.has(e.source) || e.healthBefore === 0) continue;
      const column = game.damageColumn(e.damageType);
      if (column !== "physical" && column !== "magical") continue;
      const k = `${e.abilityName}|${e.source}`;
      const g = byAttack.get(k) ?? { ability: e.abilityName, source: e.source, list: [] };
      g.list.push({ t: e.timestamp, statusIds: e.statusIds ?? [], multiplier: e.multiplier, column });
      byAttack.set(k, g);
    }
  }
  const out: Wave[] = [];
  for (const { ability, source, list } of byAttack.values()) {
    list.sort((a, b) => a.t - b.t);
    let wave: Wave | null = null;
    let lastT = -Infinity;
    for (const ev of list) {
      if (!wave || ev.t - lastT > HIT_CLUSTER_GAP_MS) {
        wave = { ability, source, startMs: ev.t, events: [] };
        out.push(wave);
      }
      wave.events.push(ev);
      lastT = ev.t;
    }
  }
  return out;
}

/** One counted attempt, for debug prints (the `onAttempt` hook). */
export type ReachAttempt = {
  pull: Pull; atMs: number; ability: string; source: string; boss: string; statusId: number;
  outcome: Outcome; casters: string[];
};

/** Reach evidence from every loaded pull of one boss. */
export function buildDebuffReach(pulls: Pull[], game: MitigationGame, onAttempt?: (a: ReachAttempt) => void): DebuffReach {
  const statuses = debuffStatuses(game);
  const evidence = new Map<string, ReachEvidence>();
  const landings: Landing[] = [];
  const fresh = (ability: string, source: string, boss: string, debuff: string, statusId: number): ReachEvidence =>
    ({ ability, source, boss, debuff, statusId, reached: 0, missed: 0, shared: 0, inconclusive: 0, state: "unknown" });

  for (const pull of pulls) {
    const windows = buildWindows(pull, statuses);
    landings.push(...buildLandings(pull, statuses, game));
    if (windows.length === 0) continue;
    for (const wave of buildWaves(pull, game)) {
      const t = wave.startMs;
      const openAt = windows.filter((w) => w.startMs <= t && t <= w.endMs);
      for (const statusId of new Set(openAt.map((w) => w.statusId))) {
        const all = openAt.filter((w) => w.statusId === statusId);
        const clean = all.filter((w) => t - w.startMs > SNAPSHOT_SLACK_MS && w.endMs - t > SNAPSHOT_SLACK_MS);
        if (clean.length === 0) continue;
        const count = (ws: Window[], outcome: Outcome) => {
          for (const w of ws) {
            const k = reachKey(wave.ability, wave.source, w.boss, statusId);
            const ev = evidence.get(k) ?? fresh(wave.ability, wave.source, w.boss, statuses.get(statusId)!.key, statusId);
            ev[outcome]++;
            evidence.set(k, ev);
            onAttempt?.({ pull, atMs: t, ability: wave.ability, source: wave.source, boss: w.boss, statusId, outcome, casters: w.casters });
          }
        };
        const listed = wave.events.filter((e) => e.statusIds.includes(statusId));
        if (listed.length === 0) {
          count(clean, "missed");
          continue;
        }
        // Another boss's copy near its own edge could also be the one that
        // applied: only a reach with a single open copy names the boss.
        const bosses = [...new Map(all.map((w) => [w.boss, w])).values()];
        if (!listed.some((e) => multiplierAgrees(e.statusIds, e.multiplier, statusId, game, e.column))) {
          count(bosses, "inconclusive");
          continue;
        }
        count(bosses, bosses.length > 1 ? "shared" : "reached");
      }
    }
  }

  for (const ev of evidence.values()) {
    const o = overrideFor(ev.ability, ev.source, ev.boss, ev.debuff);
    if (o) {
      ev.state = o.reaches ? "reaches" : "misses";
      ev.override = true;
    } else {
      ev.state = ev.reached > ev.missed ? "reaches" : ev.missed > ev.reached ? "misses" : "unknown";
    }
  }
  // Overrides for keys the log never tried, so a print lists them too.
  for (const o of DEBUFF_REACH_OVERRIDES) {
    const entry = game.catalog.find((e) => e.key === o.debuff);
    if (!entry) continue;
    for (const s of entry.statuses) {
      const source = o.source ?? "*";
      if ([...evidence.values()].some((e) => e.ability === o.ability && e.boss === o.boss && e.statusId === s.id
        && (o.source === undefined || e.source === o.source))) continue;
      const ev = fresh(o.ability, source, o.boss, o.debuff, s.id);
      ev.state = o.reaches ? "reaches" : "misses";
      ev.override = true;
      evidence.set(reachKey(o.ability, source, o.boss, s.id), ev);
    }
  }
  return { evidence, landings };
}

/** The bosses `player` would put this status on for this hit (see header). */
export function bossesFor(reach: DebuffReach, player: string, statusId: number, phase: string | undefined, hitId?: string): string[] {
  const counts = (list: Landing[]) => {
    const m = new Map<string, number>();
    for (const l of list) for (const b of l.bosses) m.set(b, (m.get(b) ?? 0) + 1);
    return m;
  };
  const majority = (list: Landing[]) => [...counts(list)].filter(([, n]) => n * 2 >= list.length).map(([b]) => b);
  const top = (list: Landing[]) => {
    const m = counts(list);
    const best = Math.max(0, ...m.values());
    return [...m].filter(([, n]) => n === best && n > 0).map(([b]) => b);
  };
  const same = reach.landings.filter((l) => l.statusId === statusId);
  const mine = same.filter((l) => l.player === player);
  const forHit = hitId === undefined ? [] : mine.filter((l) => l.hitId === hitId);
  if (forHit.length) return majority(forHit);
  const minePhase = mine.filter((l) => l.phase === phase);
  if (minePhase.length) return majority(minePhase);
  const inPhase = same.filter((l) => l.phase === phase);
  return inPhase.length ? top(inPhase) : top(same);
}

/** The bosses a real cast landed on: this player's landing in this pull that was up at `atMs`. */
function castBosses(reach: DebuffReach, entry: CatalogEntry, pullId: number, player: string, statusId: number, atMs: number): string[] | undefined {
  const reachMs = entry.durationMs + SNAPSHOT_SLACK_MS;
  return [...reach.landings].reverse().find((l) => l.pullId === pullId && l.player === player && l.statusId === statusId
    && l.atMs <= atMs && atMs - l.atMs <= reachMs)?.bosses;
}

/** One (attack, boss, status) key's state, overrides first. */
function stateOf(reach: DebuffReach, ability: string, source: string, boss: string, statusId: number, debuff: string):
  { state: ReachState; ev?: ReachEvidence; override: boolean } {
  const ev = reach.evidence.get(reachKey(ability, source, boss, statusId));
  const o = overrideFor(ability, source, boss, debuff);
  if (o) return { state: o.reaches ? "reaches" : "misses", ev, override: true };
  return { state: ev?.state ?? "unknown", ev, override: false };
}

/** Whether a debuff on these bosses reduces this attack (see header); `seen` is the attempts behind it. */
export function reachState(reach: DebuffReach, entry: CatalogEntry, statusId: number,
  ability: string, source: string, bosses: string[]): { state: ReachState; seen: number } {
  const states = bosses.map((b) => stateOf(reach, ability, source, b, statusId, entry.key));
  const hit = states.find((s) => s.state === "reaches");
  if (hit) return { state: "reaches", seen: (hit.ev?.reached ?? 0) + (hit.ev?.shared ?? 0) };
  if (bosses.length > 1 && !states.some((s) => s.override)) {
    const shared = Math.min(...states.map((s) => s.ev?.shared ?? 0));
    const missed = Math.max(...states.map((s) => s.ev?.missed ?? 0));
    if (shared > missed) return { state: "reaches", seen: shared };
  }
  if (states.length && states.every((s) => s.state === "misses")) {
    return { state: "misses", seen: Math.min(...states.map((s) => s.ev?.missed ?? 0)) };
  }
  return { state: "unknown", seen: 0 };
}

/** Where a planned cast goes: the hit it is for. */
export type ReachHit = { id: string; phase?: string };

/**
 * Whether `player` casting this boss debuff for `hit` would reduce this
 * damage part: "reaches" only with evidence for it. Other entries always
 * reach.
 */
export function reachesPart(reach: DebuffReach | undefined, entry: CatalogEntry, player: string,
  part: Pick<HitPart, "abilityName" | "source">, hit: ReachHit): boolean {
  if (entry.kind !== "bossDebuff") return true;
  if (!reach || !part.source) return false;
  return entry.statuses.some((s) => reachState(reach, entry, s.id, part.abilityName, part.source!,
    bossesFor(reach, player, s.id, hit.phase, hit.id)).state === "reaches");
}

/** Whether the debuff would reduce any judged target's damage on this hit. */
export function reachesHit(reach: DebuffReach | undefined, entry: CatalogEntry, player: string, hit: MitigationHit): boolean {
  if (entry.kind !== "bossDebuff") return true;
  return judged(hit.targets).some((t) => t.parts.some((p) => reachesPart(reach, entry, player, p, hit)));
}

/**
 * For an ineffective boss debuff (cast and up, not on the hit): the
 * attempts showing it never reduces any of the hit's attacks from the boss
 * it was on, or undefined when the evidence doesn't say so.
 */
export function ineffectiveMisses(reach: DebuffReach, entry: CatalogEntry, pullId: number, player: string,
  attacks: { abilityName: string; source?: string }[], atMs: number): number | undefined {
  let seen = Infinity;
  for (const s of entry.statuses) {
    const bosses = castBosses(reach, entry, pullId, player, s.id, atMs);
    if (!bosses) return undefined;
    for (const a of attacks) {
      if (!a.source) return undefined;
      const r = reachState(reach, entry, s.id, a.abilityName, a.source, bosses);
      if (r.state !== "misses") return undefined;
      seen = Math.min(seen, r.seen);
    }
  }
  return Number.isFinite(seen) ? seen : undefined;
}
