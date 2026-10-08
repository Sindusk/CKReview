// lib/mechanics/wow/common.ts
//
// Small helpers shared by WoW encounter modules (first used by
// va/entombed-sentinels.ts and va/vashnik.ts): debuff windows, formatting,
// player error construction, battle-rez detection, and the shared "pull was
// over" marker (pullOverMarker).
//
// The FFXIV encounter modules don't use these: they read absolute report
// timestamps and different event shapes. The fallback model
// (lib/mechanics/fallback.ts) does, since it works on fight-relative Pulls
// of either game.

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";

/**
 * Everything a per-pull WoW encounter module receives (see registry.ts).
 * Timestamps are fight-relative ms. enemyCasts holds completed casts only;
 * enemyBuffs holds applybuff only, and enemyBuffRemovals the removebuffs.
 */
export type WowPullContext = {
  players:           PlayerInfo[];
  deaths:            DeathEvent[];
  enemyCasts:        EnemyEvent[];
  enemyBuffs:        EnemyEvent[];
  enemyBuffRemovals: EnemyEvent[];
  /** Damage landing on friendly NPCs (Midnight Falls' crystals). */
  friendlyNpcDamage: EnemyEvent[];
  /** fight.endTime - fight.startTime (the harness approximates it from events). */
  pullDurationMs:    number;
};

// A Raid marker usually shares its millisecond with the Major errors that
// caused it. AnalysisPanel lists raids before majors and then stable-sorts
// by timestamp, so an exact tie shows the marker FIRST; 1ms later orders it
// after its causes without affecting the cutoff (which keeps errors at or
// before the marker). Same fix as kefka-says.ts's DEATH_MARKER_SORT_OFFSET_MS.
export const RAID_MARKER_SORT_OFFSET_MS = 1;

export const yd   = (units: number) => (units / 100).toFixed(1);
export const kFmt = (n: number) => `~${Math.round(n / 1000)}k`;
export const sec  = (ms: number) => (ms / 1000).toFixed(1);

export type Interval = { start: number; end: number }; // end = Infinity while still active

/** Active windows of `abilityId` on `player` (refresh/stack events keep a window open). */
export function debuffIntervals(player: PlayerInfo, abilityId: number): Interval[] {
  const out: Interval[] = [];
  let open: number | null = null;
  for (const e of player.debuffs) {
    if (e.abilityId !== abilityId) continue;
    if (e.debuffStatus === "removed") {
      if (open !== null) out.push({ start: open, end: e.timestamp });
      open = null;
    } else if (open === null) {
      open = e.timestamp;
    }
  }
  if (open !== null) out.push({ start: open, end: Infinity });
  return out;
}

export function hitsOf(player: PlayerInfo, abilityId: number): PlayerEvent[] {
  return player.damageTaken.filter((e) => e.abilityId === abilityId);
}

export function deathOf(deaths: DeathEvent[], name: string): DeathEvent | undefined {
  return deaths.find((d) => d.player === name);
}

export function joinNames(names: string[]): string {
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function playerError(
  p: PlayerInfo,
  e: Omit<PullError, "player" | "class" | "specId" | "role">
): PullError {
  return { ...e, player: p.name, class: p.className, specId: p.specId, role: p.role };
}

/** When this player was next active (hit or casting) after dying — i.e. battle-rezzed — if ever. */
export function rezzedAt(p: PlayerInfo, deathT: number, nextDeathT: number): number | undefined {
  const t = [...p.damageTaken, ...p.casts]
    .map((e) => e.timestamp)
    .filter((x) => x > deathT + 2000 && x < nextDeathT)
    .sort((a, b) => a - b)[0];
  return t;
}

/** Split time-sorted items wherever consecutive items are more than `gapMs` apart. */
export function clusterByGap<T>(items: T[], at: (x: T) => number, gapMs: number): T[][] {
  const groups: T[][] = [];
  let lastT = -Infinity;
  for (const x of [...items].sort((a, b) => at(a) - at(b))) {
    if (at(x) - lastT > gapMs || groups.length === 0) groups.push([x]);
    else groups[groups.length - 1].push(x);
    lastT = at(x);
  }
  return groups;
}

/** Players dead at `t`, net of battle-rezzes. */
export function deadAt(players: PlayerInfo[], deaths: DeathEvent[], t: number): DeathEvent[] {
  const byName = new Map(players.map((p) => [p.name, p]));
  const sorted = [...deaths].sort((a, b) => a.timestamp - b.timestamp);
  return sorted.filter((d) => {
    if (d.timestamp > t) return false;
    const next = sorted.find((o) => o.player === d.player && o.timestamp > d.timestamp)?.timestamp ?? Infinity;
    if (next <= t) return false; // a later death supersedes this one
    const p = byName.get(d.player);
    const rez = p ? rezzedAt(p, d.timestamp, next) : undefined;
    return rez === undefined || rez > t;
  });
}

/** Last event timestamp across every player — a fallback pull length. */
export function lastPlayerEventMs(players: PlayerInfo[]): number {
  return players.reduce((m, p) =>
    [...p.damageTaken, ...p.casts].reduce((mm, e) => Math.max(mm, e.timestamp), m), 0);
}

// ─── Event helpers ───────────────────────────────────────────────────────────

/** The hit did damage (an immunity logs 0). */
export const landed = (e: PlayerEvent) => (e.amount ?? 0) > 0;

/** Summed damage of a group of hits, formatted like "~450k". */
export const total = (g: PlayerEvent[]) => kFmt(g.reduce((s, e) => s + (e.amount ?? 0), 0));

/** Description suffix for a death after a hit: " and died to it" / " and died 1.2s later". */
export const died = (d: DeathEvent | undefined, from: number) =>
  !d ? "" : d.timestamp - from < 100 ? " and died to it" : ` and died ${sec(d.timestamp - from)}s later`;

/** Deaths credited to any of `ids` between `from` (-100ms) and `to`. */
export const deathsBy = (deaths: DeathEvent[], ids: number[], from: number, to: number) =>
  deaths.filter((d) => ids.includes(d.killingAbilityGameId) && d.timestamp >= from - 100 && d.timestamp <= to);

/** A player's "applied" debuff events (refreshes included) / "removed" events. */
export const applied = (p: PlayerInfo, id: number) => p.debuffs.filter((e) => e.abilityId === id && e.debuffStatus === "applied");
export const removed = (p: PlayerInfo, id: number) => p.debuffs.filter((e) => e.abilityId === id && e.debuffStatus === "removed");

/** Predicate: an event within `ms` of `t`. */
export const near = (t: number, ms: number) => (e: { timestamp: number }) => Math.abs(e.timestamp - t) <= ms;

/** A player-less Raid error, sorted just after the Majors that share its millisecond. */
export function raidMarker(ruleId: string, name: string, description: string, timestamp: number, abilityId: number, abilityName: string): PullError {
  return { ruleId, severity: "Raid", name, description, timestamp: timestamp + RAID_MARKER_SORT_OFFSET_MS, abilityId, abilityName };
}

/** A player-less Minor error (a failure the log can't pin on anyone). */
export function playerlessMinor(ruleId: string, name: string, description: string, timestamp: number, abilityId: number, abilityName: string): PullError {
  return { ruleId, severity: "Minor", name, description, timestamp, abilityId, abilityName };
}

/** Whether the player is alive at `t` (never died, or battle-rezzed since their last death). */
export function aliveAt(p: PlayerInfo, deaths: DeathEvent[], t: number): boolean {
  const mine = deaths.filter((d) => d.player === p.name).sort((a, b) => a.timestamp - b.timestamp);
  const last = mine.filter((d) => d.timestamp <= t).pop();
  if (!last) return true;
  const next = mine.find((d) => d.timestamp > last.timestamp)?.timestamp ?? Infinity;
  const rez = rezzedAt(p, last.timestamp, next);
  return rez !== undefined && rez <= t;
}

/**
 * Avoidable-damage episodes: each player's hits (from `hitsOf`) clustered by
 * `gapMs`, with the death credited to `killIds` during the episode (up to
 * `deathWindowMs` after its last hit). `make` turns one episode into an error.
 */
export function hitEpisodes(
  players: PlayerInfo[], deaths: DeathEvent[], hitsOf: (p: PlayerInfo) => PlayerEvent[], killIds: number[], gapMs: number,
  make: (p: PlayerInfo, hits: PlayerEvent[], death: DeathEvent | undefined) => PullError,
  deathWindowMs = 1500,
): PullError[] {
  const errors: PullError[] = [];
  for (const p of players) {
    for (const g of clusterByGap(hitsOf(p), (e) => e.timestamp, gapMs)) {
      const death = deaths.find((d) => d.player === p.name && killIds.includes(d.killingAbilityGameId) &&
        d.timestamp >= g[0].timestamp - 100 && d.timestamp <= g[g.length - 1].timestamp + deathWindowMs);
      errors.push(make(p, g, death));
    }
  }
  return errors;
}

/** Append `note(others)` to errors that `min`+ players got within `windowMs` of each other. */
export function annotateGroups(errors: PullError[], note: (others: number) => string, windowMs: number, min: number): PullError[] {
  return errors.map((e) => {
    const others = errors.filter((o) => o.player !== e.player && Math.abs(o.timestamp - e.timestamp) <= windowMs);
    return others.length + 1 >= min ? { ...e, description: `${e.description} ${note(others.length)}` } : e;
  });
}

// ─── "The pull was over" marker ──────────────────────────────────────────────
//
// Every WoW boss module ends with one generic Raid marker for wipes no
// mechanic explains: N players dead at once, a tank death the raid didn't
// recover from, or a called wipe. Modules tune the thresholds per boss (see
// each module's header for the evidence) and can add their own candidates
// (Berserk, an untanked boss, a boss-specific tank rule). The earliest
// candidate wins; within 1s a specific cause beats the generic head-count.

export type PullOverOptions = {
  ruleId: string;
  /** Players dead at once (net of battle-rezzes) that ends the pull. */
  collapseDead: number;
  /** Also require the pull to end within this long of that death. */
  collapseEndMs?: number;
  /** Cause text for a death; defaults to DeathEvent.cause. */
  cause?: (d: DeathEvent) => string;
  /**
   * Built-in tank-death marker:
   *  - "pullEnded": skip a tank rezzed within rezGraceMs; otherwise mark it
   *    when the pull ended within endMs.
   *  - "recovered": skip a tank rezzed within rezGraceMs whose pull went on
   *    at least continueMs; otherwise mark it. noRezText replaces
   *    " and wasn't rezzed.".
   * Omit it and pass a module-specific rule through `extra` instead.
   */
  tankDeath?:
    | { kind: "pullEnded"; rezGraceMs: number; endMs: number }
    | { kind: "recovered"; rezGraceMs: number; continueMs: number; noRezText?: string };
  /** A called wipe the module detected; deaths from `at` on are ignored. */
  calledWipe?: { at: number; marker: PullError };
  /** Module-specific candidates, ranked after the built-in ones on ties. */
  extra?: PullError[];
};

/**
 * A called wipe: `count`+ deaths with no killing blow within `windowMs`
 * (players resetting at full health). `exclude` drops deaths that have their
 * own explanation (e.g. falls off a platform).
 */
export function calledWipe(
  deaths: DeathEvent[], ruleId: string, count: number, windowMs: number, exclude: (d: DeathEvent) => boolean = () => false
): PullOverOptions["calledWipe"] {
  const silent = [...deaths].sort((a, b) => a.timestamp - b.timestamp).filter((d) => !d.killingAbilityGameId && !exclude(d));
  for (let i = 0; i + count - 1 < silent.length; i++) {
    if (silent[i + count - 1].timestamp - silent[i].timestamp <= windowMs) {
      const at = silent[i].timestamp;
      return { at, marker: raidMarker(ruleId, "Wipe Called",
        `${count}+ players died with no killing blow within ${windowMs / 1000}s — the raid reset. Treated as the point the pull was over.`,
        at, 0, "Wipe") };
    }
  }
  return undefined;
}

export function pullOverMarker(players: PlayerInfo[], deaths: DeathEvent[], pullEnd: number, o: PullOverOptions): PullError[] {
  const candidates: PullError[] = [];
  const byName = new Map(players.map((p) => [p.name, p]));
  const cause = o.cause ?? ((d: DeathEvent) => d.cause);
  const all = [...deaths].sort((a, b) => a.timestamp - b.timestamp);
  const cutoff = o.calledWipe?.at ?? Infinity;
  if (o.calledWipe) candidates.push(o.calledWipe.marker);
  const sorted = all.filter((d) => d.timestamp < cutoff);

  for (const d of sorted) {
    const dead = deadAt(players, deaths, d.timestamp);
    if (dead.length >= o.collapseDead && (o.collapseEndMs === undefined || pullEnd - d.timestamp <= o.collapseEndMs)) {
      candidates.push(raidMarker(o.ruleId, "Raid Collapse",
        `${dead.length} players dead at once: ${joinNames(dead.map((x) => `${x.player} (${cause(x)}, +${sec(x.timestamp)}s)`))}. ` +
        "Treated as the point the pull was over.", d.timestamp, d.killingAbilityGameId, cause(d)));
      break;
    }
  }

  const tank = o.tankDeath;
  if (tank) {
    for (const d of sorted) {
      if (byName.get(d.player)?.role !== "Tank") continue;
      const next = all.find((x) => x.player === d.player && x.timestamp > d.timestamp)?.timestamp ?? Infinity;
      const rez = rezzedAt(byName.get(d.player)!, d.timestamp, next);
      const rezzedInTime = rez !== undefined && rez - d.timestamp <= tank.rezGraceMs;
      let text: string;
      if (tank.kind === "pullEnded") {
        if (rezzedInTime || pullEnd - d.timestamp > tank.endMs) continue;
        text = `Tank ${d.player} died (${cause(d)})` + (rez !== undefined ? ` and wasn't rezzed until ${sec(rez - d.timestamp)}s later` : " and wasn't rezzed") +
          `; the pull ended ${sec(pullEnd - d.timestamp)}s after. Treated as the point the pull was over.`;
      } else {
        if (rezzedInTime && pullEnd - d.timestamp >= tank.continueMs) continue;
        text = `Tank ${d.player} died (${cause(d)})` +
          (rez !== undefined ? ` — rezzed ${sec(rez - d.timestamp)}s later, but the pull ended ${sec(pullEnd - d.timestamp)}s after the death.`
                             : (tank.noRezText ?? " and wasn't rezzed.")) +
          " Treated as the point the pull was over.";
      }
      candidates.push(raidMarker(o.ruleId, "Tank Died", text, d.timestamp, d.killingAbilityGameId, cause(d)));
    }
  }

  candidates.push(...(o.extra ?? []));
  const rank = (e: PullError) => e.timestamp + (e.name === "Raid Collapse" ? 1000 : 0);
  return candidates.sort((a, b) => rank(a) - rank(b)).slice(0, 1);
}
