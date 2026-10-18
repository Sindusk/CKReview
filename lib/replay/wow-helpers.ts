// lib/replay/wow-helpers.ts
//
// Small readers over a WoW pull's ReplayData (wow-replay.ts) for the boss
// specs' `shapes` and `effects` builders (lib/mechanics/wow/va/*-replay.ts):
// debuff spans, casts, and impacts placed by the players they hit. Kept
// apart from wow-shapes.ts, which imports every spec through fights.ts.

import type { AoeShape } from "./action-shapes";
import { poseAt, type ReplayActor, type ReplayData } from "./ffxiv-replay";

export type AuraSpan = { id: number; target: string; start: number; end: number };

/** Each debuff of `ids` on a player, applied to removed (or the pull's end). */
export function wowAuraSpans(data: ReplayData, ids: number[]): AuraSpan[] {
  const want = new Set(ids);
  const open = new Map<string, number>();
  const out: AuraSpan[] = [];
  for (const [t, id, target, applied] of data.enemyAuras ?? []) {
    if (!want.has(id)) continue;
    const key = `${id}:${target}`;
    if (applied) { if (!open.has(key)) open.set(key, t); continue; }
    const from = open.get(key);
    if (from === undefined) continue;
    open.delete(key);
    out.push({ id, target, start: from, end: t });
  }
  for (const [key, from] of open) {
    const [id, target] = [Number(key.slice(0, key.indexOf(":"))), key.slice(key.indexOf(":") + 1)];
    out.push({ id, target, start: from, end: data.durationMs });
  }
  return out.sort((a, b) => a.start - b.start);
}

export type WowCast = { t: number; caster: string; target: string; id: number; begin?: number };

/** Completed casts of `ids`, with their begincast time when there was one. */
export function wowCasts(data: ReplayData, ids: number[]): WowCast[] {
  const want = new Set(ids);
  const out: WowCast[] = [];
  const openBegin = new Map<string, number>();
  for (const c of data.enemyCasts ?? []) {
    const id = c[4];
    if (id === undefined || !want.has(id)) continue;
    const key = `${c[1]}:${id}`;
    if (c[3] > 0) { openBegin.set(key, c[0]); continue; }
    const begin = openBegin.get(key);
    openBegin.delete(key);
    out.push({ t: c[0], caster: c[1], target: c[5] ?? "", id, begin: begin !== undefined && c[0] - begin < 20000 ? begin : undefined });
  }
  return out;
}

export function actorMap(data: ReplayData): Map<string, ReplayActor> {
  return new Map(data.actors.map((a) => [a.key, a]));
}

/** Where a hit's player stood: the hit's own position, else the track. */
function hitSpot(data: ReplayData, actors: Map<string, ReplayActor>, h: NonNullable<ReplayData["enemyHits"]>[number]) {
  if (h[6] !== null && h[7] !== null) return { x: h[6], y: h[7] };
  const a = actors.get(h[3]);
  const p = a && poseAt(a, h[0]);
  return p ? { x: p.x, y: p.y } : undefined;
}

export type Impact = { t: number; x: number; y: number; players: string[] };

/**
 * Impacts of `ids` placed by the players they hit: hits within `windowMs`
 * of the first are one volley, and players within 2 radii of a cluster's
 * first player share its impact (the middle of the cluster); `joinYards`
 * narrows that for impacts that land side by side.
 */
export function wowImpacts(data: ReplayData, ids: number[], radiusYards: number, windowMs = 400, joinYards = radiusYards * 2): Impact[] {
  const want = new Set(ids);
  const actors = actorMap(data);
  const hits = (data.enemyHits ?? []).filter((h) => want.has(h[1]));
  const out: Impact[] = [];
  let i = 0;
  while (i < hits.length) {
    const t0 = hits[i][0];
    const clusters: { pts: { x: number; y: number }[]; players: string[] }[] = [];
    let j = i;
    for (; j < hits.length && hits[j][0] - t0 <= windowMs; j++) {
      const p = hitSpot(data, actors, hits[j]);
      if (!p) continue;
      const c = clusters.find((cl) => Math.hypot(cl.pts[0].x - p.x, cl.pts[0].y - p.y) <= joinYards * 100);
      if (c) { c.pts.push(p); if (!c.players.includes(hits[j][3])) c.players.push(hits[j][3]); }
      else clusters.push({ pts: [p], players: [hits[j][3]] });
    }
    for (const c of clusters) {
      const xs = c.pts.map((p) => p.x), ys = c.pts.map((p) => p.y);
      out.push({ t: t0, x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2, players: c.players });
    }
    i = j;
  }
  return out;
}

/**
 * A ring riding on each cast's target for its cast bar (a tank hit, a
 * targeted bolt): `style` "tankbuster" for tank hits.
 */
export function wowCastTargetRings(data: ReplayData, ids: number[], name: string, rangeYards: number, style: AoeShape["style"] = "tankbuster", fallbackMs = 1500): AoeShape[] {
  return wowCasts(data, ids).filter((c) => c.target && c.target !== c.caster).map((c) =>
    wowShape({ kind: "circle", x: 0, y: 0, range: rangeYards * 100, name, start: c.begin ?? c.t - fallbackMs, resolve: c.t,
      follow: c.target, style, estimated: false }));
}

/** An AoeShape with the fields a WoW builder rarely sets filled in. */
export function wowShape(s: Pick<AoeShape, "kind" | "x" | "y" | "range" | "name" | "start" | "resolve"> & Partial<AoeShape>): AoeShape {
  return { bearing: 0, width: 0, angle: 0, inner: 0, estimated: true, style: "aoe", ...s };
}
