// lib/replay/ffxiv-replay.ts
//
// Top-down replay of one FFXIV pull: player and enemy dots on the fight's
// in-game map, with enemy casts (no AoE shapes yet). Pure code: turns raw
// FFLogs events into per-actor position tracks and a cast list, and
// answers "where was this actor at time T". lib/ffl-client.ts fetches the events (fetchFFReplayEvents),
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
// geometry.ts's facingToCompassBearing (corrected 2026-10-17 with this
// replay's auto-attack check and a VOD review).
//
// ── INTERPOLATION ─────────────────────────────────────────────────────────
//
// Between two samples an actor moves in a straight line, the same guess
// FFLogs' replay makes. Past MAX_INTERP_GAP_MS between samples the actor
// is held at the earlier sample instead: a long gap usually means a stretch
// with no casts (a knockback, a cutscene, a dead player), and sliding the
// dot across it would draw a path nobody walked.

import type { FFLActor } from "@/lib/ffl-client";
import type { ActionGeometry } from "@/lib/replay/action-shapes";

/** Server-side filter for the replay fetch: event types that carry resources. */
export const REPLAY_EVENT_FILTER =
  `type in ("cast", "begincast", "damage", "calculateddamage", "heal", "calculatedheal", "death", "tether", "headmarker")`;

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
  abilityGameID?:  number;
  tetherID?:       number;   // tether: the tether's kind
  markerID?:       number;   // headmarker: the marker's kind
  duration?:       number;   // begincast: cast time in ms
  unpaired?:       boolean;  // calculateddamage with no landed "damage" event
  packetID?:       number;
  sourceResources?: ReplayRawResources;
  targetResources?: ReplayRawResources;
};

type ReplayRawResources = {
  x?: number; y?: number; facing?: number;
  hitPoints?: number; maxHitPoints?: number;
  mp?: number; maxMP?: number;
};

/** [ms from pull start, x, y, facing (centi-rad), HP fraction 0..1 or -1 unknown] */
export type ReplaySample = [number, number, number, number, number, number?];
// (6th field: MP fraction 0..1, -1 unknown; absent on tracks saved before 2026-10-17.)

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
  gameId?:  number;     // enemies: BNpcBase id (FFLActor.gameID); WoW: creature id
  icon?:    string;     // the log's icon name: "Boss", "NPC", WoW "custom-icon-<ability icon>.jpg"
  hitbox?:  number;     // radius in centi-yalms (action-shapes.ts's enrichReplayData)
  // WoW players: the primary resource's power type (0 mana, 1 rage, 3
  // energy, 6 runic power, 17 fury, ...), which colours the roster's second bar.
  powerType?: number;
  samples:  ReplaySample[];
};

/**
 * The fight's in-game map (FFLogs `fights.maps` + `gameData.map`). The map
 * texture is 2048px square; a log coordinate lands on pixel
 * `(x/100 + offsetX) * sizeFactor/100 + 1024` (same for y). Checked on
 * Dancing Mad (Sigmascape V4.0, sizeFactor 400): the arena disc spans
 * 160px, a 20-yalm radius, matching the edge the module headers use.
 */
export type ReplayMap = {
  id:         number;
  name:       string;
  filename:   string;   // e.g. "m-z3oy-z3oy.00.jpg"
  sizeFactor: number;
  offsetX:    number;
  offsetY:    number;
};

/**
 * One enemy cast: [ms from pull start, actor key, ability name, cast time
 * in ms (0 = instant), abilityGameID, target actor key ("" = none)]. A
 * begincast and its matching cast are both kept; the panel draws a bar for
 * the first and a flash for the second. Tracks saved before 2026-10-17
 * have only the first four fields.
 */
export type ReplayCast = [number, string, string, number, number?, string?];

/**
 * One enemy hit that landed on a player: [ms from pull start, abilityGameID,
 * source actor key, target player key, source x, source y, target x,
 * target y]. Positions are the snapshot FFLogs attaches to the hit; a
 * missing one is null. The source is often an invisible helper standing
 * where the AoE is anchored (a tower centre, a Limit Cut clone).
 */
export type ReplayHit = [number, number, string, string, number | null, number | null, number | null, number | null];

export type ReplayData = {
  version:     1;
  // Absent = FFXIV. WoW tracks come from lib/replay/wow-replay.ts, already
  // turned into this file's units and axes (+x east, +y south, centi-yards).
  game?:       "wow";
  mapName?:    string;  // WoW: the zone's name (WCL has no map art or calibration)
  reportCode:  string;
  fightId:     number;
  durationMs:  number;
  actors:      ReplayActor[];
  // Absent on tracks saved before the map, casts and hits were added.
  map?:        ReplayMap | null;
  enemyCasts?: ReplayCast[];
  enemyHits?:  ReplayHit[];
  // [ms, source actor key, target actor key, tetherID]. The log marks only
  // when a tether forms, never when it breaks.
  tethers?:    [number, string, string, number][];
  // [ms, marked actor key, markerID].
  headMarkers?: [number, string, number][];
  abilityNames?: Record<number, string>;   // names of the abilities in enemyHits
  // Game data looked up after the fetch (lib/replay/action-shapes.ts).
  actionGeometry?: Record<number, ActionGeometry>;
};

/** XIVAPI v2 URL of a map texture from its FFLogs filename, or null if the name doesn't parse. */
export function ffMapImageUrl(filename: string): string | null {
  const m = filename.match(/^m-[^-]+-([a-z0-9]+)\.(\d+)\.jpg$/i);
  return m ? `https://v2.xivapi.com/api/asset/map/${m[1]}/${m[2]}` : null;
}

/** The map texture's square in log units (centi-yalms): left/top edge and side length. */
export function mapImageBounds(map: ReplayMap): { x: number; y: number; size: number } {
  const pxPerYalm = map.sizeFactor / 100;
  return {
    x:    (-1024 / pxPerYalm - map.offsetX) * 100,
    y:    (-1024 / pxPerYalm - map.offsetY) * 100,
    size: (2048 / pxPerYalm) * 100,
  };
}

/**
 * Builds per-actor tracks from raw events. `fightStartMs` / `fightEndMs`
 * are report-relative ms (FFLFight.startTime / endTime). `abilityNames`
 * maps abilityGameID to a name for the enemy cast list.
 */
export function buildReplayData(
  reportCode: string,
  fightId:    number,
  fightStartMs: number,
  fightEndMs:   number,
  events:     ReplayRawEvent[],
  actors:     FFLActor[],
  abilityNames: Map<number, string> = new Map(),
  map:        ReplayMap | null = null,
): ReplayData {
  const actorById = new Map(actors.map((a) => [a.id, a]));
  const enemyCasts: ReplayCast[] = [];
  const enemyHits: ReplayHit[] = [];
  const hitNames: Record<number, string> = {};
  const previewSource = new Map<number, ReplayRawResources>();
  const tethers: [number, string, string, number][] = [];
  const headMarkers: [number, string, number][] = [];
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
        ...(isPlayer ? { job: actor.subType } : { gameId: actor.gameID, icon: actor.icon }),
        samples: [],
      };
      byKey.set(key, track);
    }
    const hp = res.maxHitPoints ? Math.max(0, Math.min(1, (res.hitPoints ?? 0) / res.maxHitPoints)) : -1;
    const mp = res.maxMP ? Math.max(0, Math.min(1, (res.mp ?? 0) / res.maxMP)) : -1;
    track.samples.push([t - fightStartMs, res.x, res.y, res.facing ?? 0, hp, mp]);
  }

  for (const e of events) {
    if (e.timestamp < fightStartMs || e.timestamp > fightEndMs) continue;
    add(e.sourceID, e.sourceInstance, e.sourceResources, e.timestamp);
    add(e.targetID, e.targetInstance, e.targetResources, e.timestamp);
    if ((e.type === "begincast" || e.type === "cast") && e.sourceID !== undefined && e.abilityGameID !== undefined) {
      const source = actorById.get(e.sourceID);
      if (source && source.type !== "Player" && source.type !== "Pet") {
        const name = abilityNames.get(e.abilityGameID);
        // Unnamed ids are auto-attacks and server-side helpers ("attack",
        // numeric names): noise in a cast list.
        if (name && !/^(attack|\d+)$/i.test(name)) {
          const t = e.timestamp - fightStartMs;
          const dur = e.type === "begincast" ? e.duration ?? 0 : 0;
          // Every caster is kept: simultaneous helpers each place their
          // own AoE. The panel merges same-name bars.
          const target = e.targetID !== undefined && e.targetID >= 0 ? actorById.get(e.targetID) : undefined;
          enemyCasts.push([t, keyFor(e.sourceID, e.sourceInstance, false), name, dur, e.abilityGameID,
            target ? keyFor(e.targetID!, e.targetInstance, target.type === "Player") : ""]);
        }
      }
    }
    if (e.type === "tether" && e.sourceID !== undefined && e.targetID !== undefined && e.tetherID !== undefined) {
      const s = actorById.get(e.sourceID), d = actorById.get(e.targetID);
      if (s && d) tethers.push([e.timestamp - fightStartMs, keyFor(e.sourceID, e.sourceInstance, s.type === "Player"),
        keyFor(e.targetID, e.targetInstance, d.type === "Player"), e.tetherID]);
    }
    if (e.type === "headmarker" && e.markerID !== undefined) {
      // The marked actor is the source when there's no target (-1).
      const id = e.targetID !== undefined && e.targetID >= 0 ? e.targetID : e.sourceID;
      const inst = e.targetID !== undefined && e.targetID >= 0 ? e.targetInstance : e.sourceInstance;
      const m = id !== undefined ? actorById.get(id) : undefined;
      if (m) headMarkers.push([e.timestamp - fightStartMs, keyFor(id!, inst, m.type === "Player"), e.markerID]);
    }
    if (e.type === "calculateddamage" && e.packetID !== undefined && e.sourceResources?.x !== undefined) {
      previewSource.set(e.packetID, e.sourceResources);
    }
    // Landed hits only: FFLogs previews each hit as "calculateddamage" and
    // lands it as "damage"; an unpaired preview never got a landed event
    // (see fetchFFightData's onlyLanded).
    if ((e.type === "damage" || (e.type === "calculateddamage" && e.unpaired)) &&
        e.sourceID !== undefined && e.targetID !== undefined && e.abilityGameID !== undefined) {
      const source = actorById.get(e.sourceID);
      const target = actorById.get(e.targetID);
      if (source && source.type !== "Player" && source.type !== "Pet" && target?.type === "Player") {
        // The landed event usually drops sourceResources; its preview in
        // the same packet carries them.
        const s = e.sourceResources?.x !== undefined ? e.sourceResources : (e.packetID !== undefined ? previewSource.get(e.packetID) : undefined);
        const d = e.targetResources;
        enemyHits.push([e.timestamp - fightStartMs, e.abilityGameID, keyFor(e.sourceID, e.sourceInstance, false), String(e.targetID),
          s?.x ?? null, s?.y ?? null, d?.x ?? null, d?.y ?? null]);
        const name = abilityNames.get(e.abilityGameID);
        if (name) hitNames[e.abilityGameID] = name;
      }
    }
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
      if (last && last[1] === s[1] && last[2] === s[2] && last[3] === s[3] && last[4] === s[4] && last[5] === s[5]) continue;
      kept.push(s);
    }
    track.samples = kept;
    if (track.kind === "enemy") track.targetable = damagedEnemies.has(track.key);
    out.push(track);
  }
  out.sort((a, b) => (a.kind === b.kind ? a.actorId - b.actorId : a.kind === "player" ? -1 : 1));

  return { version: 1, reportCode, fightId, durationMs: fightEndMs - fightStartMs, actors: out, map, enemyCasts, enemyHits, abilityNames: hitNames, tethers, headMarkers };
}

export type ReplayPose = {
  x: number; y: number; facing: number;
  hp: number;          // 0..1, -1 unknown
  mp: number;          // 0..1, -1 unknown
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
    return { x: s[0][1], y: s[0][2], facing: s[0][3], hp: s[0][4], mp: s[0][5] ?? -1, stale: true };
  }
  const a = s[i];
  const b = s[i + 1];
  if (!b || b[0] - a[0] > MAX_INTERP_GAP_MS) {
    return { x: a[1], y: a[2], facing: a[3], hp: a[4], mp: a[5] ?? -1, stale: !b ? t - a[0] > MAX_INTERP_GAP_MS : true };
  }
  const f = (t - a[0]) / (b[0] - a[0]);
  return { x: a[1] + (b[1] - a[1]) * f, y: a[2] + (b[2] - a[2]) * f, facing: a[3], hp: a[4], mp: a[5] ?? -1, stale: false };
}

export type PlayerVitals = { hp: number; mp: number; powerType?: number };

/** Each player's HP and MP (WoW: primary resource) fraction at `t` (-1 where unknown), by name. */
export function playerVitalsAt(data: ReplayData, t: number): Map<string, PlayerVitals> {
  const out = new Map<string, PlayerVitals>();
  for (const a of data.actors) {
    if (a.kind !== "player") continue;
    const p = poseAt(a, t);
    if (p) out.set(a.name, { hp: p.hp, mp: p.mp, powerType: a.powerType });
  }
  return out;
}

/**
 * The actor's position nearest `t` within `windowMs` either side, with no
 * interpolation. For AoE origins: a begincast carries no resources, and
 * the helper that casts it usually only reports a position on the cast
 * that resolves it, a few seconds later, without having moved.
 */
export function sampleNear(actor: ReplayActor, t: number, windowMs: number): ReplayPose | undefined {
  const s = actor.samples;
  const i = sampleIndexAt(s, t);
  let best: ReplaySample | undefined;
  for (const j of [i, i + 1]) {
    const c = s[j];
    if (c && Math.abs(c[0] - t) <= windowMs && (!best || Math.abs(c[0] - t) < Math.abs(best[0] - t))) best = c;
  }
  return best && { x: best[1], y: best[2], facing: best[3], hp: best[4], mp: best[5] ?? -1, stale: false };
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
  // WoW arenas don't: there the rings centre on the party's median.
  const snap = (v: number) => (data.game === "wow" ? Math.round(v) : Math.round(v / 1000) * 1000);
  const cx = snap(median(xs));
  const cy = snap(median(ys));
  const d = xs.map((x, i) => Math.hypot(x - cx, ys[i] - cy)).sort((p, q) => p - q);
  const r99 = d[Math.min(d.length - 1, Math.floor(d.length * 0.99))];
  return { cx, cy, half: Math.max(1000, r99 + 300) };
}
