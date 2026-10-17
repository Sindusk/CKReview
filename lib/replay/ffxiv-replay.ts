// lib/replay/ffxiv-replay.ts
//
// Top-down replay of one FFXIV pull (stage 1: player and enemy dots on a
// blank arena, no map art, no AoE shapes). Pure code: turns raw FFLogs
// events into per-actor position tracks and answers "where was this actor
// at time T". lib/ffl-client.ts fetches the events (fetchFFReplayEvents),
// components/ReplayPanel.tsx draws them.
//
// ── WHERE THE POSITIONS COME FROM ─────────────────────────────────────────
//
// The pull's normal fetch keeps only the positions detection needs (mostly
// targetResources, see player-position.ts), and slim-report.js drops the
// rest from sample data. FFLogs attaches BOTH sourceResources and
// targetResources to every cast, damage and heal event when queried with
// `dataType: All, includeResources: true` — the same stream FFLogs' and
// Tomestone's own replays draw from. A player casting on the boss gives
// their own position about once per GCD and on every oGCD, so the replay
// gets its own fetch instead of reusing the pull's streams. Buffs, debuffs
// and markers carry no resources and are filtered out server-side.
//
// Units are the log's: centi-yalms, +x east, +y SOUTH (see
// lib/mechanics/geometry.ts). `facing` is centi-radians; convert with
// geometry.ts's facingToCompassBearing.
//
// ── INTERPOLATION ─────────────────────────────────────────────────────────
//
// Between two samples an actor moves in a straight line, the same guess
// FFLogs' replay makes. Past MAX_INTERP_GAP_MS between samples the actor
// is held at the earlier sample instead: a long gap usually means a stretch
// with no casts (a knockback, a cutscene, a dead player), and sliding the
// dot across it would draw a path nobody walked.

import type { FFLActor } from "@/lib/ffl-client";

/** Server-side filter for the replay fetch: event types that carry resources. */
export const REPLAY_EVENT_FILTER =
  `type in ("cast", "begincast", "damage", "calculateddamage", "heal", "calculatedheal", "death")`;

const MAX_INTERP_GAP_MS = 4000;

/** The fields of a raw FFLogs event the replay reads. */
export type ReplayRawEvent = {
  timestamp:       number;
  type:            string;
  sourceID?:       number;
  sourceInstance?: number;
  targetID?:       number;
  targetInstance?: number;
  hitType?:        number;
  amount?:         number;
  sourceResources?: ReplayRawResources;
  targetResources?: ReplayRawResources;
};

type ReplayRawResources = {
  x?: number; y?: number; facing?: number;
  hitPoints?: number; maxHitPoints?: number;
};

/** [ms from pull start, x, y, facing (centi-rad), HP fraction 0..1 or -1 unknown] */
export type ReplaySample = [number, number, number, number, number];

export type ReplayActor = {
  key:      string;     // "actorId" or "actorId.instance" for enemy instances
  actorId:  number;
  name:     string;
  kind:     "player" | "enemy";
  job?:     string;     // FFLActor.subType for players
  // Enemies only: true when a player damaged it during the pull. Enemies
  // that never take damage are mostly invisible helper actors that place
  // AoEs; the panel hides them by default.
  targetable?: boolean;
  samples:  ReplaySample[];
};

export type ReplayData = {
  version:     1;
  reportCode:  string;
  fightId:     number;
  durationMs:  number;
  actors:      ReplayActor[];
};

/**
 * Builds per-actor tracks from raw events. `fightStartMs` / `fightEndMs`
 * are report-relative ms (FFLFight.startTime / endTime).
 */
export function buildReplayData(
  reportCode: string,
  fightId:    number,
  fightStartMs: number,
  fightEndMs:   number,
  events:     ReplayRawEvent[],
  actors:     FFLActor[],
): ReplayData {
  const actorById = new Map(actors.map((a) => [a.id, a]));
  const byKey = new Map<string, ReplayActor>();
  const damagedEnemies = new Set<string>();

  const keyFor = (id: number, instance: number | undefined, isPlayer: boolean) =>
    isPlayer || !instance || instance <= 1 ? String(id) : `${id}.${instance}`;

  function add(id: number | undefined, instance: number | undefined, res: ReplayRawResources | undefined, t: number) {
    if (id === undefined || id < 0 || !res || res.x === undefined || res.y === undefined) return;
    const actor = actorById.get(id);
    // Pets (fairies, Earthly Star, Bunshin) and anything FFLogs didn't name
    // are left out of stage 1.
    if (!actor || actor.type === "Pet") return;
    const isPlayer = actor.type === "Player";
    const key = keyFor(id, instance, isPlayer);
    let track = byKey.get(key);
    if (!track) {
      track = {
        key, actorId: id,
        name: instance && instance > 1 && !isPlayer ? `${actor.name} ${instance}` : actor.name,
        kind: isPlayer ? "player" : "enemy",
        ...(isPlayer ? { job: actor.subType } : {}),
        samples: [],
      };
      byKey.set(key, track);
    }
    const hp = res.maxHitPoints ? Math.max(0, Math.min(1, (res.hitPoints ?? 0) / res.maxHitPoints)) : -1;
    track.samples.push([t - fightStartMs, res.x, res.y, res.facing ?? 0, hp]);
  }

  for (const e of events) {
    if (e.timestamp < fightStartMs || e.timestamp > fightEndMs) continue;
    add(e.sourceID, e.sourceInstance, e.sourceResources, e.timestamp);
    add(e.targetID, e.targetInstance, e.targetResources, e.timestamp);
    if (e.type === "damage" && e.sourceID !== undefined && e.targetID !== undefined) {
      const source = actorById.get(e.sourceID);
      const target = actorById.get(e.targetID);
      if (source && (source.type === "Player" || source.type === "Pet") && target && target.type !== "Player" && target.type !== "Pet") {
        damagedEnemies.add(keyFor(e.targetID, e.targetInstance, false));
      }
    }
  }

  const out: ReplayActor[] = [];
  for (const track of byKey.values()) {
    track.samples.sort((a, b) => a[0] - b[0]);
    // Collapse repeats: the same packet often reports the same snapshot on
    // its cast, calculated and landed events.
    const kept: ReplaySample[] = [];
    for (const s of track.samples) {
      const last = kept[kept.length - 1];
      if (last && last[0] === s[0]) { kept[kept.length - 1] = s; continue; }
      if (last && last[1] === s[1] && last[2] === s[2] && last[3] === s[3] && last[4] === s[4]) continue;
      kept.push(s);
    }
    track.samples = kept;
    if (track.kind === "enemy") track.targetable = damagedEnemies.has(track.key);
    out.push(track);
  }
  out.sort((a, b) => (a.kind === b.kind ? a.actorId - b.actorId : a.kind === "player" ? -1 : 1));

  return { version: 1, reportCode, fightId, durationMs: fightEndMs - fightStartMs, actors: out };
}

export type ReplayPose = {
  x: number; y: number; facing: number;
  hp: number;          // 0..1, -1 unknown
  stale: boolean;      // held across a gap longer than MAX_INTERP_GAP_MS
};

/** Index of the last sample at or before `t`, or -1. */
function sampleIndexAt(samples: ReplaySample[], t: number): number {
  let lo = 0, hi = samples.length - 1, ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid][0] <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return ans;
}

/**
 * Where the actor was at `t` ms into the pull. Before its first sample a
 * player is shown where that sample puts them (they were at the pull's
 * start, just not casting yet); an enemy is undefined (not spawned yet).
 */
export function poseAt(actor: ReplayActor, t: number): ReplayPose | undefined {
  const s = actor.samples;
  const i = sampleIndexAt(s, t);
  if (i < 0) {
    if (actor.kind !== "player" || s.length === 0) return undefined;
    return { x: s[0][1], y: s[0][2], facing: s[0][3], hp: s[0][4], stale: true };
  }
  const a = s[i];
  const b = s[i + 1];
  if (!b || b[0] - a[0] > MAX_INTERP_GAP_MS) {
    return { x: a[1], y: a[2], facing: a[3], hp: a[4], stale: !b ? t - a[0] > MAX_INTERP_GAP_MS : true };
  }
  const f = (t - a[0]) / (b[0] - a[0]);
  return { x: a[1] + (b[1] - a[1]) * f, y: a[2] + (b[2] - a[2]) * f, facing: a[3], hp: a[4], stale: false };
}

/**
 * A square view (center and half-size, centi-yalms) that holds where the
 * players actually stood: the 99th percentile of their distance from the
 * median position, plus a margin. Outliers (a knocked-off corpse) don't
 * blow up the zoom.
 */
export function fitReplayView(data: ReplayData): { cx: number; cy: number; half: number } {
  const xs: number[] = [], ys: number[] = [];
  for (const a of data.actors) {
    if (a.kind !== "player") continue;
    for (const s of a.samples) { xs.push(s[1]); ys.push(s[2]); }
  }
  if (xs.length === 0) return { cx: 10000, cy: 10000, half: 2500 };
  const median = (v: number[]) => [...v].sort((p, q) => p - q)[v.length >> 1];
  // FFXIV arenas sit on round coordinates (Dancing Mad: 100,100 yalms).
  // Snap the median to the nearest 10 yalms so the rings stay concentric
  // with the arena rather than with where the party happened to stand.
  const cx = Math.round(median(xs) / 1000) * 1000;
  const cy = Math.round(median(ys) / 1000) * 1000;
  const d = xs.map((x, i) => Math.hypot(x - cx, ys[i] - cy)).sort((p, q) => p - q);
  const r99 = d[Math.min(d.length - 1, Math.floor(d.length * 0.99))];
  return { cx, cy, half: Math.max(1000, r99 + 300) };
}
