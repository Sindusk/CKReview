// lib/replay/wow-shapes.ts
//
// AoE shapes for the WoW replay, in the AoeShape form the panel already
// draws for FFXIV (lib/replay/action-shapes.ts). WCL has nothing like
// XIVAPI's Action sheet, so shapes come from three places:
//
// 1. GAME DATA, per spell (wow-spell-geometry.json, built by
//    scripts/fetch-wow-spell-geometry.js from Blizzard's SpellEffect and
//    SpellRadius db2 tables): the effect radius and implicit target types.
//    Checked against the Vashnik header's log measurements: Plague Froth
//    4.5y, Catalytic Bile 6y, Stygian Burst 3.5y, Umbral Ejection 3y.
// 2. HITS, for where: db2 says how big a circle is, not where a scripted
//    impact landed. A circle whose spell centres on its caster (implicit
//    target 1, 18 or 22) is drawn there; any other one is centred on the
//    players it hit within CLUSTER_MS (one circle per group of players
//    close enough to share it). So an impact that hit nobody isn't drawn,
//    and the shape shows LEAD_MS before its hit lands: the log has no
//    telegraph. These are `estimated`.
// 3. PER-BOSS TABLES, for what the data can't link (below).
//
// Spells with a radius of RAIDWIDE_YARDS or more hit the whole room; they
// get a label (wowRaidwideAt), not a circle.

// A namespace import: scripts/lib/require-ts.js transpiles without
// esModuleInterop, so a default import would be undefined under Node.
import * as geometry from "./wow-spell-geometry.json";
import type { AoeShape } from "./action-shapes";
import { poseAt, sampleNear, type ReplayData } from "./ffxiv-replay";

type SpellGeometry = { r: number; t: number[] };
const GEOMETRY = geometry as unknown as Record<string, SpellGeometry>;

const RAIDWIDE_YARDS = 60;
const CLUSTER_MS = 300;
const LEAD_MS = 1000;
// db2 ImplicitTarget values that put the area on the caster: UNIT_CASTER,
// DEST_CASTER, SRC_CASTER.
const CASTER_TARGETS = new Set([1, 18, 22]);
// A raid-wide spell that lands more often than this is ambient damage
// (Toxic Vapor, Burning Presence), not an event worth a label.
const RAIDWIDE_MIN_GAP_MS = 8000;
const RAIDWIDE_MIN_PLAYERS = 5;

/**
 * Debuffs drawn as a circle around the debuffed player while it lasts,
 * keyed by debuff id: `spell` is the area spell whose radius applies. The
 * replay fetch asks for these debuffs only (wow-replay.ts's filter).
 */
export const WOW_AURA_SHAPES: Record<number, { spell: number; name: string; onRemove?: "axis-lanes" }> = {
  // Vashnik Plague Froth: the 6s debuff 1281913 is a scripted aura with no
  // db2 link to its tick 1281925 (4.5y, centred on the carrier). At expiry
  // the carrier sends Plague Waves along the four world axes, ~2.5y either
  // side of the lane, travelling ~13y/s (vashnik.ts header).
  1281913: { spell: 1281925, name: "Plague Froth", onRemove: "axis-lanes" },
};

// Hits drawn some other way, so not as hit circles.
const HIDDEN_HITS = new Set([
  1281925,   // Plague Froth ticks: the carrier's aura circle
  1295798,   // Plague Wave: the lanes
]);

const LANE_LENGTH = 4000;   // centi-yards: the waves cross the play area
const LANE_WIDTH = 500;
const LANE_WARN_MS = 2000;  // lanes show this long before the debuff ends

export function wowSpellRadius(id: number): number {
  return GEOMETRY[id]?.r ?? 0;
}

/** Every drawable AoE of a WoW pull, sorted by start. */
export function buildWowAoeShapes(data: ReplayData): AoeShape[] {
  const actorByKey = new Map(data.actors.map((a) => [a.key, a]));
  const names = data.abilityNames ?? {};
  const out: AoeShape[] = [];
  const shape = (s: Omit<AoeShape, "bearing" | "width" | "angle" | "inner" | "estimated" | "style"> & Partial<AoeShape>): AoeShape =>
    ({ bearing: 0, width: 0, angle: 0, inner: 0, estimated: false, style: "aoe", ...s });

  // ── Debuff auras ──
  const open = new Map<string, number>();   // "id:target" -> applied at
  for (const [t, id, target, applied] of data.enemyAuras ?? []) {
    const key = `${id}:${target}`;
    if (applied) { open.set(key, t); continue; }
    const from = open.get(key);
    open.delete(key);
    const def = WOW_AURA_SHAPES[id];
    if (from === undefined || !def) continue;
    const r = wowSpellRadius(def.spell) * 100;
    const actor = actorByKey.get(target);
    if (r > 0) out.push(shape({ kind: "circle", x: 0, y: 0, range: r, name: def.name, start: from, resolve: t, follow: target }));
    const p = actor && poseAt(actor, t);
    if (def.onRemove === "axis-lanes" && p) {
      for (const bearing of [0, 90, 180, 270]) {
        out.push(shape({ kind: "rect", x: p.x, y: p.y, bearing, range: LANE_LENGTH, width: LANE_WIDTH,
          name: "Plague Wave", start: t - LANE_WARN_MS, resolve: t, estimated: true }));
      }
    }
  }

  // ── Hit circles ──
  const hits = (data.enemyHits ?? []).filter((h) => !HIDDEN_HITS.has(h[1]));
  const groups = new Map<number, { t: number; hits: typeof hits }>();
  const flush = (id: number) => {
    const g = groups.get(id);
    if (!g) return;
    groups.delete(id);
    const geo = GEOMETRY[id];
    const r = geo.r * 100;
    const name = names[id] ?? String(id);
    const base = { kind: "circle" as const, range: r, name, start: g.t - LEAD_MS, resolve: g.t, estimated: true };
    if (geo.t.some((x) => CASTER_TARGETS.has(x))) {
      const caster = actorByKey.get(g.hits[0][2]);
      const p = caster && sampleNear(caster, g.t, 3000);
      if (p) out.push({ ...shape({ ...base, x: p.x, y: p.y }), estimated: false });
      return;
    }
    // Players close enough to stand in one circle share it.
    const clusters: { x: number; y: number }[][] = [];
    for (const h of g.hits) {
      const target = actorByKey.get(h[3]);
      const p = h[6] !== null && h[7] !== null ? { x: h[6], y: h[7] } : target && poseAt(target, h[0]);
      if (!p) continue;
      const c = clusters.find((cl) => Math.hypot(cl[0].x - p.x, cl[0].y - p.y) <= r * 2);
      if (c) c.push(p); else clusters.push([p]);
    }
    for (const c of clusters) {
      const xs = c.map((p) => p.x), ys = c.map((p) => p.y);
      out.push(shape({ ...base, x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }));
    }
  };
  for (const h of hits) {
    const geo = GEOMETRY[h[1]];
    if (!geo || geo.r <= 0 || geo.r >= RAIDWIDE_YARDS) continue;
    const g = groups.get(h[1]);
    if (g && h[0] - g.t > CLUSTER_MS) flush(h[1]);
    const cur = groups.get(h[1]);
    if (cur) cur.hits.push(h); else groups.set(h[1], { t: h[0], hits: [h] });
  }
  for (const id of [...groups.keys()]) flush(id);

  return out.sort((a, b) => a.start - b.start);
}

export type RaidwideHit = { t: number; name: string; players: number };

/** Raid-wide hits worth a label: a room-sized spell landing on several players at once, and not every few seconds. */
export function buildWowRaidwide(data: ReplayData): RaidwideHit[] {
  const names = data.abilityNames ?? {};
  const byId = new Map<number, RaidwideHit[]>();
  for (const h of data.enemyHits ?? []) {
    const geo = GEOMETRY[h[1]];
    if (!geo || geo.r < RAIDWIDE_YARDS) continue;
    let list = byId.get(h[1]);
    if (!list) byId.set(h[1], (list = []));
    const last = list[list.length - 1];
    if (last && h[0] - last.t <= CLUSTER_MS * 2) last.players++;
    else list.push({ t: h[0], name: names[h[1]] ?? String(h[1]), players: 1 });
  }
  const out: RaidwideHit[] = [];
  for (const list of byId.values()) {
    const big = list.filter((x) => x.players >= RAIDWIDE_MIN_PLAYERS);
    if (big.length === 0 || data.durationMs / big.length < RAIDWIDE_MIN_GAP_MS) continue;
    out.push(...big);
  }
  return out.sort((a, b) => a.t - b.t);
}

const RAIDWIDE_SHOW_MS = 1800;

/** The raid-wide labels showing at `t`, newest first. */
export function wowRaidwideAt(list: RaidwideHit[], t: number): RaidwideHit[] {
  return list.filter((x) => x.t <= t && t - x.t < RAIDWIDE_SHOW_MS).reverse();
}
