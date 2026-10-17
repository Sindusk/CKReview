// lib/replay/action-shapes.ts
//
// AoE shapes for the replay, from the game's own data instead of per-boss
// models. XIVAPI v2's Action sheet gives each ability's area:
//
//   CastType      shape: 1 single target (no area), 2/6/7 circle, 5 circle
//                 around the caster, 3/13 cone, 4/8/12 rectangle, 10 donut,
//                 11 cross
//   EffectRange   radius, or length for rectangles and cones (yalms)
//   XAxisModifier rectangle / cross width (yalms)
//   Omen.Path     the telegraph art; empty for rows still named "_rsv_..."
//
// Checked against the Dancing Mad detection headers (2026-10-17): Path of
// Light towers are r=4, Celestriad towers r=3, Limit Cut dashes and Black
// Hole tethers 6y-wide lines to their player, Flare Diffusion r=25 (the
// header's open question: non-tanks were hit 20-26y out).
//
// Two things the sheet doesn't give, estimated per pull and drawn DASHED:
// - Cone angle (lives in the Omen art, empty for new rows): the narrowest
//   standard angle that holds every player the cone hit. No hits: 90°.
// - Donut inner radius (same): the nearest player the donut hit, else a
//   third of the outer radius.
//
// Placement: a circle sits on its target player when the cast names one,
// else on the caster. Cones and rectangles start at the caster and point at
// the targeted player, else along the caster's facing. Circles of 30y or
// more are raidwides and aren't drawn.

import { facingToCompassBearing } from "@/lib/mechanics/geometry";
import { poseAt, sampleNear, type ReplayData } from "@/lib/replay/ffxiv-replay";

export type ActionGeometry = { castType: number; range: number; width: number; omen: string };

/** Fetches the Action rows for `ids` from XIVAPI v2. */
export async function fetchActionGeometry(ids: number[]): Promise<Record<number, ActionGeometry>> {
  const unique = [...new Set(ids)].filter((id) => id > 0);
  const rows = await xivRows<{ CastType: number; EffectRange: number; XAxisModifier: number; Omen?: { fields?: { Path?: string } } }>(
    "Action", unique, "CastType,EffectRange,XAxisModifier,Omen.Path");
  const out: Record<number, ActionGeometry> = {};
  for (const [id, f] of Object.entries(rows)) {
    out[Number(id)] = { castType: f.CastType, range: f.EffectRange, width: f.XAxisModifier, omen: f.Omen?.fields?.Path ?? "" };
  }
  return out;
}

/** Ability ids worth looking up: every enemy cast that resolves. */
export function replayActionIds(data: ReplayData): number[] {
  return (data.enemyCasts ?? []).filter((c) => c[3] === 0 && c[4] !== undefined).map((c) => c[4]!);
}

const PLAYER_HITBOX = 50; // centi-yalms: every player's hitbox is 0.5y

/**
 * Hitbox radius per BNpcBase id, in centi-yalms. The game sizes a monster's
 * hitbox as its skeleton's Radius times the BNpc's Scale (ModelChara type
 * 3); other model types get 0.5y times Scale. Checked on Dancing Mad
 * 2T1HzdPKgbhM43am fight 10: Kefka P1 2.7y, Exdeath 3.8y, and melee players'
 * median distance from each sits at hitbox + 3y, the edge of melee range.
 */
export async function fetchHitboxes(gameIds: number[]): Promise<Record<number, number>> {
  const unique = [...new Set(gameIds)].filter((id) => id > 0 && id < 1000000);
  if (unique.length === 0) return {};
  const base = await xivRows<{ Scale: number; ModelChara?: { fields?: { Model: number; Type: number } } }>(
    "BNpcBase", unique, "Scale,ModelChara.Model,ModelChara.Type");
  const models = [...new Set(Object.values(base).filter((b) => b.ModelChara?.fields?.Type === 3).map((b) => b.ModelChara!.fields!.Model))];
  const skel = models.length ? await xivRows<{ Radius: number }>("ModelSkeleton", models, "Radius") : {};
  const out: Record<number, number> = {};
  for (const [id, b] of Object.entries(base)) {
    const m = b.ModelChara?.fields;
    const radius = m?.Type === 3 && skel[m.Model] ? skel[m.Model].Radius : 0.5;
    out[Number(id)] = Math.round(radius * (b.Scale || 1) * 100);
  }
  return out;
}

async function xivRows<T>(sheet: string, ids: number[], fields: string): Promise<Record<number, T>> {
  const out: Record<number, T> = {};
  for (let i = 0; i < ids.length; i += 100) {
    const res = await fetch(`https://v2.xivapi.com/api/sheet/${sheet}?rows=${ids.slice(i, i + 100).join(",")}&fields=${fields}`);
    if (!res.ok) throw new Error(`XIVAPI ${sheet} lookup failed (${res.status})`);
    const json = await res.json() as { rows: { row_id: number; fields: T }[] };
    for (const r of json.rows) out[r.row_id] = r.fields;
  }
  return out;
}

/**
 * Adds the game data the replay draws from (AoE geometry, hitboxes) to
 * freshly fetched tracks. A failed lookup leaves the replay usable: dots
 * and casts still draw, just without shapes or hitbox rings.
 */
export async function enrichReplayData(data: ReplayData): Promise<ReplayData> {
  const [actionGeometry, hitboxes] = await Promise.all([
    fetchActionGeometry(replayActionIds(data)).catch(() => ({} as Record<number, ActionGeometry>)),
    fetchHitboxes(data.actors.filter((a) => a.kind === "enemy" && a.gameId).map((a) => a.gameId!)).catch(() => ({} as Record<number, number>)),
  ]);
  return {
    ...data,
    actionGeometry,
    actors: data.actors.map((a) => ({
      ...a,
      hitbox: a.kind === "player" ? PLAYER_HITBOX : a.gameId !== undefined ? hitboxes[a.gameId] : undefined,
    })),
  };
}

export type AoeShape = {
  kind:   "circle" | "cone" | "rect" | "donut" | "cross";
  x: number; y: number;          // origin, centi-yalms
  bearing: number;               // compass degrees (cones, rects, crosses)
  range: number;                 // centi-yalms
  width: number;                 // rect / cross width, centi-yalms
  angle: number;                 // cone full angle, degrees
  inner: number;                 // donut inner radius, centi-yalms
  estimated: boolean;            // angle or inner radius guessed: draw dashed
  name: string;
  start: number; resolve: number; // ms from pull start: telegraph start, resolution
};

const RAIDWIDE_RANGE = 30;
const FLASH_BEFORE_MS = 900;     // instant casts: shown this long before resolving
const STANDARD_ANGLES = [30, 45, 60, 90, 120, 150, 180, 270];

const bearingTo = (ax: number, ay: number, bx: number, by: number) =>
  ((Math.atan2(bx - ax, -(by - ay)) * 180) / Math.PI + 360) % 360;
const angDiff = (a: number, b: number) => Math.abs(((a - b) % 360 + 540) % 360 - 180);

/** Every drawable AoE of the pull, sorted by telegraph start. */
export function buildAoeShapes(data: ReplayData): AoeShape[] {
  const geo = data.actionGeometry ?? {};
  const casts = data.enemyCasts ?? [];
  const hits = data.enemyHits ?? [];
  const actorByKey = new Map(data.actors.map((a) => [a.key, a]));
  const out: AoeShape[] = [];

  for (let i = 0; i < casts.length; i++) {
    const [t, key, name, dur, id, targetKey] = casts[i];
    if (dur !== 0 || id === undefined) continue;
    const g = geo[id];
    if (!g || g.castType === 1 || g.range <= 0) continue;
    const isCircle = g.castType === 2 || g.castType === 5 || g.castType === 6 || g.castType === 7;
    if (isCircle && g.range >= RAIDWIDE_RANGE) continue;

    const caster = actorByKey.get(key);
    const casterPose = caster && sampleNear(caster, t, 1500);
    const target = targetKey ? actorByKey.get(targetKey) : undefined;
    const targetPose = target && target.kind === "player" ? poseAt(target, t) : undefined;
    if (!casterPose && !(isCircle && targetPose)) continue;

    // The telegraph: this caster's begincast that ends at this resolution.
    let start = t - FLASH_BEFORE_MS;
    for (let j = i - 1; j >= 0 && t - casts[j][0] < 15000; j--) {
      const b = casts[j];
      if (b[1] === key && b[3] > 0 && Math.abs(b[0] + b[3] - t) < 800) { start = b[0]; break; }
    }

    const base = { name, start, resolve: t, width: g.width * 100, range: g.range * 100, angle: 0, inner: 0, estimated: false };
    if (isCircle) {
      const o = targetPose ?? casterPose!;
      // CastType 5 grows with the caster's hitbox; the hitbox is unknown
      // for helpers, so it's drawn at the listed range.
      out.push({ ...base, kind: "circle", x: o.x, y: o.y, bearing: 0 });
      continue;
    }
    const cp = casterPose!;
    const bearing = targetPose ? bearingTo(cp.x, cp.y, targetPose.x, targetPose.y) : facingToCompassBearing(cp.facing);
    if (g.castType === 3 || g.castType === 13) {
      // Angle: the narrowest standard one holding every player it hit.
      let widest = 0, any = false;
      for (const h of hits) {
        if (h[1] !== id || h[2] !== key || Math.abs(h[0] - t) > 1500 || h[6] === null) continue;
        any = true;
        widest = Math.max(widest, angDiff(bearingTo(cp.x, cp.y, h[6], h[7]!), bearing) * 2);
      }
      const angle = any ? STANDARD_ANGLES.find((a) => a >= widest - 3) ?? 360 : 90;
      out.push({ ...base, kind: "cone", x: cp.x, y: cp.y, bearing, angle, estimated: true });
    } else if (g.castType === 10) {
      let nearest = Infinity;
      for (const h of hits) {
        if (h[1] !== id || h[2] !== key || Math.abs(h[0] - t) > 1500 || h[6] === null) continue;
        nearest = Math.min(nearest, Math.hypot(h[6] - cp.x, h[7]! - cp.y));
      }
      const inner = Number.isFinite(nearest) ? Math.max(100, nearest - 50) : base.range / 3;
      out.push({ ...base, kind: "donut", x: cp.x, y: cp.y, bearing: 0, inner, estimated: true });
    } else if (g.castType === 11) {
      out.push({ ...base, kind: "cross", x: cp.x, y: cp.y, bearing });
    } else {
      out.push({ ...base, kind: "rect", x: cp.x, y: cp.y, bearing });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

const AFTER_MS = 500;

/** Shapes showing at `t`, with opacity: telegraph ramps up, flash fades out. */
export function aoesAt(shapes: AoeShape[], t: number): { s: AoeShape; opacity: number; resolving: boolean }[] {
  const out: { s: AoeShape; opacity: number; resolving: boolean }[] = [];
  for (const s of shapes) {
    if (s.start > t) break;
    if (t > s.resolve + AFTER_MS) continue;
    if (t >= s.resolve) out.push({ s, opacity: 1 - (t - s.resolve) / AFTER_MS, resolving: true });
    else out.push({ s, opacity: 0.45 + 0.4 * ((t - s.start) / Math.max(1, s.resolve - s.start)), resolving: false });
  }
  return out;
}
