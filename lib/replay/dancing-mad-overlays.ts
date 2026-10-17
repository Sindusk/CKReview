// lib/replay/dancing-mad-overlays.ts
//
// AoE overlays for the Dancing Mad replay: what to draw at time T, in log
// units (centi-yalms, +y south), built from the replay's enemy casts and
// hits. Only geometry the detection modules have VERIFIED is drawn as
// such; sizes nobody has measured are drawn dashed and say so. Source of
// each fact, by mechanic:
//
// - Limit Cut dashes (Ultima Blaster 47843 placement / 47844 dash):
//   clones on the rim at r=20y, one per k·45°, instance = bait number; the
//   dash is a line from the clone to wherever its player stands
//   (limitcut.ts header). Line width unknown: drawn as a plain line.
// - Black Hole tethers (Nothingness 47868): a line from the black hole to
//   the player it hits (blackhole.ts header). Hole positions come from the
//   hit's source. Radius unknown.
// - Forsaken towers (The Path of Light 47806): centred on fixed spawn
//   points r=8y from centre (forsaken.ts, VERIFIED). Radius not stated;
//   clean soakers stood up to ~3.9y from the centre, so the ring is drawn
//   dashed at 3y as a position marker, not a size.
// - Celestriad towers (Fire III 47939 / Blizzard III 47940 / Thunder III
//   47941): positions from the cast source on a ~10y ring
//   (ultimate-kefka.ts, VERIFIED). Same dashed marker.
// - Flood of Naught + White/Black Antilight (50068/50069): the Flood
//   starts at an arena edge and crosses it; the Antilight helpers stand
//   ±9.5y either side of the travel axis at that edge (kefka-says.ts,
//   VERIFIED on one pull). Drawn as the travel arrow plus the two lanes.
//   How far each half reaches past the axis isn't stated, so no shading.
//
// Everything else gets the generic hit ring: a small ring on each player
// an enemy ability landed on, labelled when it hit at most three players
// (a targeted mechanic rather than a raidwide).
//
// Timing: towers and lanes have no logged spawn event with a position, so
// they show for TELEGRAPH_MS before the hit that reveals them. The replay
// can look ahead; a live game couldn't.

import { sampleNear, type ReplayData } from "@/lib/replay/ffxiv-replay";

// `hit` marks the generic hit rings, which have their own toggle.
export type OverlayShape =
  | { kind: "circle"; x: number; y: number; r: number; color: string; dashed?: boolean; fill?: boolean; label?: string; opacity: number; hit?: boolean }
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number; color: string; width: number; dashed?: boolean; arrow?: boolean; label?: string; opacity: number; hit?: boolean };

const TELEGRAPH_MS = 3000;
const AFTER_MS     = 600;
const HIT_RING_MS  = 1000;

const LIMIT_CUT_PLACE = 47843;
const LIMIT_CUT_DASH  = 47844;
const NOTHINGNESS     = 47868;
const PATH_OF_LIGHT   = 47806;
const CELESTRIAD: Record<number, string> = { 47939: "#ff6a3d", 47940: "#5fb4ff", 47941: "#c08bff" };
const WHITE_ANTILIGHT = 50068;
const BLACK_ANTILIGHT = 50069;
const SPECIFIC = new Set([LIMIT_CUT_DASH, NOTHINGNESS, PATH_OF_LIGHT, WHITE_ANTILIGHT, BLACK_ANTILIGHT, ...Object.keys(CELESTRIAD).map(Number)]);

/** Fade in over the telegraph, hold, fade out after the hit. */
function fade(t: number, hit: number, before: number, after: number): number {
  if (t < hit - before || t > hit + after) return 0;
  if (t > hit) return 1 - (t - hit) / after;
  return Math.min(1, 0.35 + 0.65 * (1 - (hit - t) / before));
}

/**
 * Groups hits by (ability, source key) within `gapMs`: one tower or dash
 * hits several players at once. Returns the first hit of each group.
 */
function groupHits(hits: NonNullable<ReplayData["enemyHits"]>, gapMs: number) {
  const groups: typeof hits = [];
  const lastByKey = new Map<string, number>();
  for (const h of hits) {
    const k = `${h[1]}|${h[2]}`;
    const last = lastByKey.get(k);
    if (last === undefined || h[0] - last > gapMs) groups.push(h);
    lastByKey.set(k, h[0]);
  }
  return groups;
}

export type OverlayIndex = ReturnType<typeof indexOverlays>;

/** Precomputes the per-pull lists the per-frame query reads. */
export function indexOverlays(data: ReplayData) {
  const hits = data.enemyHits ?? [];
  const casts = data.enemyCasts ?? [];
  const actorByKey = new Map(data.actors.map((a) => [a.key, a]));
  const towers = groupHits(hits.filter((h) => h[1] === PATH_OF_LIGHT || CELESTRIAD[h[1]]), 1000);
  const lanes = groupHits(hits.filter((h) => h[1] === WHITE_ANTILIGHT || h[1] === BLACK_ANTILIGHT), 2000);
  const dashes = hits.filter((h) => h[1] === LIMIT_CUT_DASH);
  const tethers = hits.filter((h) => h[1] === NOTHINGNESS);
  // Clone placements, each shown until its own dash.
  const clones = casts
    .filter((c) => c[4] === LIMIT_CUT_PLACE && c[3] === 0)
    .map((c) => {
      const dash = dashes.find((d) => d[2] === c[1] && d[0] > c[0]);
      const pose = actorByKey.get(c[1]) && sampleNear(actorByKey.get(c[1])!, c[0], 100);
      const inst = Number(c[1].split(".")[1] ?? 1);
      return pose ? { t: c[0], end: dash ? dash[0] : c[0] + 20000, x: pose.x, y: pose.y, inst } : null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);
  const floods = casts.filter((c) => c[2] === "Flood of Naught" && c[3] === 0);
  // Victims per (ability, 300ms bucket), to label only targeted hits.
  const victims = new Map<string, number>();
  for (const h of hits) {
    const k = `${h[1]}|${Math.floor(h[0] / 300)}`;
    victims.set(k, (victims.get(k) ?? 0) + 1);
  }
  return { data, hits, towers, lanes, dashes, tethers, clones, floods, victims, actorByKey };
}

/** Shapes to draw at `t` ms into the pull. */
export function overlaysAt(ix: OverlayIndex, t: number, showHits: boolean): OverlayShape[] {
  const out: OverlayShape[] = [];
  const names = ix.data.abilityNames ?? {};

  for (const c of ix.clones) {
    if (t < c.t || t > c.end + 300) continue;
    out.push({ kind: "circle", x: c.x, y: c.y, r: 90, color: "#ff5a5a", fill: true, label: String(c.inst), opacity: 0.95 });
  }
  for (const h of ix.dashes) {
    const o = fade(t, h[0], 500, AFTER_MS);
    if (!o || h[4] === null || h[6] === null) continue;
    out.push({ kind: "line", x1: h[4], y1: h[5]!, x2: h[6], y2: h[7]!, color: "#ff5a5a", width: 5, arrow: true, opacity: o });
  }
  for (const h of ix.tethers) {
    const o = fade(t, h[0], 1500, AFTER_MS);
    if (!o || h[4] === null || h[6] === null) continue;
    out.push({ kind: "line", x1: h[4], y1: h[5]!, x2: h[6], y2: h[7]!, color: "#b066ff", width: 4, opacity: o });
    out.push({ kind: "circle", x: h[4], y: h[5]!, r: 120, color: "#2a0d3d", fill: true, opacity: o });
  }
  for (const h of ix.towers) {
    const o = fade(t, h[0], TELEGRAPH_MS, AFTER_MS);
    if (!o || h[4] === null) continue;
    const color = CELESTRIAD[h[1]] ?? "#ffe27a";
    out.push({ kind: "circle", x: h[4], y: h[5]!, r: 300, color, dashed: true, fill: true, label: names[h[1]] ?? "Tower", opacity: o });
  }
  for (const f of ix.floods) {
    const lanesNow = ix.lanes.filter((h) => Math.abs(h[0] - f[0]) < 3000 && h[4] !== null);
    const o = fade(t, f[0], 5000, 1200);
    if (!o) continue;
    const src = ix.actorByKey.get(f[1]);
    const p = src && sampleNear(src, f[0], 200);
    // The axis runs from the source edge through the arena centre.
    const sx = p?.x ?? lanesNow[0]?.[4];
    const sy = p?.y ?? lanesNow[0]?.[5];
    if (sx == null || sy == null) continue;
    const ex = 20000 - sx, ey = 20000 - sy;
    out.push({ kind: "line", x1: sx, y1: sy, x2: ex, y2: ey, color: "#7fd3ff", width: 6, arrow: true, label: "Flood of Naught", opacity: o });
    for (const h of lanesNow) {
      const white = h[1] === WHITE_ANTILIGHT;
      const dx = ex - sx, dy = ey - sy;
      out.push({ kind: "line", x1: h[4]!, y1: h[5]!, x2: h[4]! + dx, y2: h[5]! + dy, color: white ? "#f4f4f4" : "#222",
        width: 3, dashed: true, label: white ? "White Antilight" : "Black Antilight", opacity: o * 0.9 });
    }
  }
  if (showHits) {
    for (let i = lowerBound(ix.hits, t - HIT_RING_MS); i < ix.hits.length && ix.hits[i][0] <= t; i++) {
      const h = ix.hits[i];
      if (SPECIFIC.has(h[1]) || h[6] === null) continue;
      const o = 1 - (t - h[0]) / HIT_RING_MS;
      const targeted = (ix.victims.get(`${h[1]}|${Math.floor(h[0] / 300)}`) ?? 0) <= 3;
      const name = names[h[1]];
      out.push({ kind: "circle", x: h[6], y: h[7]!, r: 160, color: "#ff9d3a", opacity: o * (targeted ? 1 : 0.5), hit: true,
        label: targeted && name && name !== "Attack" ? name : undefined });
    }
  }
  return out;
}

function lowerBound(hits: NonNullable<ReplayData["enemyHits"]>, t: number): number {
  let lo = 0, hi = hits.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (hits[m][0] < t) lo = m + 1; else hi = m; }
  return lo;
}
