// lib/mechanics/ffxiv/top/replay.ts
//
// The Omega Protocol's replay spec (lib/replay/fight-spec.ts): shape
// overrides, head markers, tethers and the shapes the log can't place on
// its own. Art in components/replay-art/top.tsx. Ids and timings from the
// phase modules' headers (omega.ts, omega-mf.ts, ...) and checked on
// bNcrLh7Y4dkHxM9q fight 17 (a kill, 2026-10-18); each entry says what it
// fixed. Nothing here is VOD-checked yet: docs/replay-reviews/top.md has
// the open questions.

import type { FightReplay, HeadMarkerDef, Override, TetherKind } from "@/lib/replay/fight-spec";
import type { AoeShape } from "@/lib/replay/action-shapes";
import { poseAt, sampleNear, type ReplayData } from "@/lib/replay/ffxiv-replay";

// ── P1 Omega (omega.ts) ─────────────────────────────────────────────────────

const PROGRAM_LOOP = 31491;
const STORAGE_VIOLATION = 31492, OBLITERATION = 31494;   // tower soaked / tower left empty
const BLASTER = 31498;
const BALLISTIC_IMPACT = 31500;
const MISSILE = 31502, CONDENSED_LINE = 31503;
const DIFFUSE = 31504, WAVE_CANNON = 31505;
// Guided Missile Kyrios Incoming (sets 1-4) and Condensed Wave Cannon
// Kyrios (the line's aim, sets 1-4): both run out as their set fires.
const MISSILE_STATUSES = [1003424, 1003495, 1003496, 1003497];
const LINE_STATUSES = [1003507, 1003508, 1003509, 1003510];

const OVERRIDES: Record<number, Override> = {
  // Program Loop's towers are drawn by p1Towers (from when they appear);
  // the casts' own circles sat on the soaker, not the tower (fight 17
  // 0:29.2: helper at (88.0, 103.0), soaker 2.2y off it).
  [STORAGE_VIOLATION]: { hidden: true }, [OBLITERATION]: { hidden: true },
  // Pantokrator's puddles are drawn by p1Puddles: the helpers casting them
  // log only the boss's spot (100, 90), so 6 of 14 drew there.
  [BALLISTIC_IMPACT]: { hidden: true },
  // Condensed Wave Cannon Kyrios: a line shared by three (header, open
  // question 1: three hit per line in every set of fight 17).
  [CONDENSED_LINE]: { style: "stack" },
  // Diffuse Wave Cannon Kyrios: 120° cones at the two farthest (the
  // Elemental guide; BossMod leaves it open). Facing drew them east at an
  // estimated 180° over five non-tanks (1:50.1-1:52.2); aimed at the tanks
  // they hit, they hold only the tanks.
  [DIFFUSE]: { angle: 120, aim: "hits", style: "tankbuster" },
};

/**
 * Wave Cannon Kyrios' red marker (23), on three non-tanks at a time, 5s
 * before their lines (fight 17 1:43.0 -> 1:48.1, 1:52.0 -> 1:57.1). It
 * pulses five times in game (Elemental guide).
 */
const HEAD_MARKERS: Record<number, HeadMarkerDef> = {
  23: { label: "Wave Cannon", abilities: [WAVE_CANNON] },
};

/**
 * Program Loop's Blaster tether (89), two at once, taken from player to
 * player each round; the holder takes a 15y Blaster when the round
 * resolves (fight 17: 0:21.1 three tethers form for two holders, the
 * rounds' takes at 0:32.1/0:32.4, 0:39.7/0:41.4, 0:49.5/0:49.7, the last
 * Blasters 0:56.8).
 */
const TETHERS: Record<number, TetherKind> = {
  89: { element: "top-blaster", payoff: [BLASTER], passed: 2 },
};

// Towers spawn when the previous set resolves (Elemental guide: "the second
// set of towers will spawn"), the first after Program Loop. Placed at the
// helper casting each tower's resolution: it logs a sample there.
const TOWER_IDS = [STORAGE_VIOLATION, OBLITERATION];
const ROUND_GAP_MS = 3000;
const LOOP_SPAN_MS = 50000;

function p1Towers(data: ReplayData): AoeShape[] {
  const casts = data.enemyCasts ?? [];
  const hits = data.enemyHits ?? [];
  const geo = data.actionGeometry ?? {};
  const actorByKey = new Map(data.actors.map((a) => [a.key, a]));
  const out: AoeShape[] = [];
  const loop = casts.find((c) => c[4] === PROGRAM_LOOP && c[3] === 0);
  if (!loop) return out;
  let roundStart = loop[0], prevResolve = -Infinity;
  for (const c of casts) {
    // P1's four rounds land 14-41s after Program Loop. Storage Violation
    // comes back later in the fight (fight 17 11:07.5), drawn there by its
    // own phase's entry.
    if (c[3] !== 0 || !TOWER_IDS.includes(c[4] ?? 0) || c[0] < loop[0] || c[0] - loop[0] > LOOP_SPAN_MS) continue;
    if (c[0] - prevResolve > ROUND_GAP_MS && prevResolve > 0) roundStart = prevResolve;
    prevResolve = c[0];
    const a = actorByKey.get(c[1]);
    const hit = hits.find((h) => h[2] === c[1] && h[1] === c[4] && h[0] >= c[0] && h[0] - c[0] <= 1500 && h[4] !== null);
    const p = (a && sampleNear(a, c[0], 1500)) ?? (hit ? { x: hit[4]!, y: hit[5]! } : undefined);
    if (!p) continue;
    out.push({
      kind: "circle", x: p.x, y: p.y, bearing: 0, range: (geo[STORAGE_VIOLATION]?.range ?? 3) * 100, width: 0, angle: 0, inner: 0,
      estimated: false, style: "tower", soakers: 1, name: "Storage Violation", start: roundStart, resolve: c[0],
    });
  }
  return out;
}

// Ballistic Impact: one 5y puddle under every player each wave, snapped
// where they stand as its 2.7s cast begins (header: "snapshots locations
// under every player"). Fight 17: eight begincasts every 2s from 1:19.0,
// with no target and helpers that log nothing useful, so each wave goes
// under the eight living players at its begincast.
function p1Puddles(data: ReplayData): AoeShape[] {
  const all = (data.enemyCasts ?? []).filter((c) => c[4] === BALLISTIC_IMPACT);
  const casts = all.filter((c) => c[3] > 0);
  const geo = data.actionGeometry?.[BALLISTIC_IMPACT];
  const players = data.actors.filter((a) => a.kind === "player");
  const out: AoeShape[] = [];
  let last = -Infinity;
  for (const c of casts) {
    if (c[0] - last < 500) continue;   // one wave per burst
    last = c[0];
    // Lands with its logged resolution, 3.0s after the begincast in fight
    // 17 (the cast bar says 2.7s).
    const res = all.find((r) => r[3] === 0 && r[1] === c[1] && Math.abs(r[0] - (c[0] + c[3])) <= 800);
    const resolve = res ? res[0] : c[0] + c[3];
    for (const p of players) {
      const q = poseAt(p, c[0]);
      if (!q || q.hp === 0) continue;
      out.push({
        kind: "circle", x: q.x, y: q.y, bearing: 0, range: (geo?.range ?? 5) * 100, width: 0, angle: 0, inner: 0,
        estimated: false, style: "top-ballistic", name: "Ballistic Impact", start: c[0], resolve,
      });
    }
  }
  return out;
}

// Pantokrator's missile / line sets: the statuses say who carries the
// set's missile (5y, knocks others back) and who the line is aimed at.
// Shown for the last LEAD_MS before the set fires, the missile riding on
// its carrier and the shared line from Omega toward its target where the
// line went (its hits' centre). The statuses themselves show above the
// players all along.
const LEAD_MS = 3000;

function p1Sets(data: ReplayData): AoeShape[] {
  const auras = data.playerAuras ?? [];
  const hits = data.enemyHits ?? [];
  const geo = data.actionGeometry ?? {};
  const actorByKey = new Map(data.actors.map((a) => [a.key, a]));
  const out: AoeShape[] = [];
  for (const a of auras) {
    const missile = MISSILE_STATUSES.includes(a[3]), line = LINE_STATUSES.includes(a[3]);
    if (!missile && !line) continue;
    const end = a[1], start = Math.max(a[0], end - LEAD_MS);
    if (missile) {
      if (!hits.some((h) => h[1] === MISSILE && h[3] === a[2] && Math.abs(h[0] - end) <= 1500)) continue;
      out.push({
        kind: "circle", x: 0, y: 0, bearing: 0, range: (geo[MISSILE]?.range ?? 5) * 100, width: 0, angle: 0, inner: 0,
        estimated: false, style: "drop", name: "Guided Missile Kyrios", start, resolve: end, follow: a[2], noFlash: true,
      });
      continue;
    }
    // The line this holder took: the 31503 hit on them, its caster's spot
    // the origin, the whole volley's hits by that caster its aim.
    const own = hits.find((h) => h[1] === CONDENSED_LINE && h[3] === a[2] && Math.abs(h[0] - end) <= 1500 && h[4] !== null);
    const holder = actorByKey.get(a[2]);
    const hp = holder && poseAt(holder, end);
    if (!own || !hp) continue;
    const group = hits.filter((h) => h[1] === CONDENSED_LINE && h[2] === own[2] && Math.abs(h[0] - own[0]) <= 500);
    const ax = group.reduce((s, h) => s + h[6]!, 0) / group.length, ay = group.reduce((s, h) => s + h[7]!, 0) / group.length;
    const bearing = ((Math.atan2(ax - own[4]!, -(ay - own[5]!)) * 180) / Math.PI + 360) % 360;
    const g = geo[CONDENSED_LINE];
    out.push({
      kind: "rect", x: own[4]!, y: own[5]!, bearing, range: (g?.range ?? 50) * 100, width: (g?.width ?? 6) * 100, angle: 0, inner: 0,
      estimated: false, style: "stack", name: "Condensed Wave Cannon Kyrios", start, resolve: end, noFlash: true,
      lineStack: true, marked: [a[2]],
    });
  }
  return out;
}

function buildShapes(data: ReplayData): AoeShape[] {
  return [...p1Towers(data), ...p1Puddles(data), ...p1Sets(data)];
}

export const TOP_REPLAY: FightReplay = {
  key: "top",
  game: "ffxiv",
  name: "The Omega Protocol",
  signature: [PROGRAM_LOOP, 31499],
  overrides: OVERRIDES,
  headMarkers: HEAD_MARKERS,
  tethers: TETHERS,
  shapes: buildShapes,
};
