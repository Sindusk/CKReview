// lib/mechanics/ffxiv/top/replay.ts
//
// The Omega Protocol's replay spec (lib/replay/fight-spec.ts): shape
// overrides, head markers, tethers and the shapes the log can't place on
// its own. Art in components/replay-art/top.tsx. Ids and timings from the
// phase modules' headers (omega.ts, omega-mf.ts, ...) and checked on
// bNcrLh7Y4dkHxM9q fight 17 (a kill, 2026-10-18); each entry says what it
// fixed. Nothing here is VOD-checked yet: docs/replay-reviews/top.md has
// the open questions.

import type { CasterEffect, FightReplay, HeadMarkerDef, Override, TetherKind } from "@/lib/replay/fight-spec";
import type { AoeShape } from "@/lib/replay/action-shapes";
import { facingToCompassBearing } from "@/lib/mechanics/geometry";
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

// ── P2 Omega-M and Omega-F (omega-mf.ts) ────────────────────────────────────

const SOLAR_RAY = [32362, 32363];
const SWORD = 31526, SHIELD = 31525, STAFF = 31533, LEGS = 31530;   // the clones' attacks
const LEGS_SIDES = [31531, 31532];
const OPTICAL_LASER = 31521, FIRE_III = 31535, DISCHARGER = 31534, SPOTLIGHT = 31536;
const SYMBOL_MARKERS = [416, 417, 418, 419];   // circle, triangle, square, cross
const SPOTLIGHT_MARKER = 100;
const MID_GLITCH = 1003427, REMOTE_GLITCH = 1003428;
const BLADEDANCE = 32629, BLADEDANCE_VISUALS = [31542, 31543];
const ARROW = 31539, BEYOND_DEFENSE = 31528, PILE_PITCH = 31529, METEOR = 31538;

Object.assign(OVERRIDES, {
  // Solar Ray: one 5y buster on each tank (marker 343 5s before; fight 17
  // 2:13.1 -> 2:18.1).
  [SOLAR_RAY[0]]: { style: "tankbuster" }, [SOLAR_RAY[1]]: { style: "tankbuster" },
  // Superliminal Steel's two hits and Beyond Strength's donut are drawn by
  // p2Clones: the data's 36y-wide line along Omega-F's facing is the strip
  // left SAFE (all eight stood in it at 2:44.9, none hit).
  [LEGS_SIDES[0]]: { hidden: true }, [LEGS_SIDES[1]]: { hidden: true }, [SHIELD]: { hidden: true },
  [SPOTLIGHT]: { style: "stack" }, [PILE_PITCH]: { style: "stack" },
  [BEYOND_DEFENSE]: { style: "tankbuster" },
  // Bladedance: a 90° cone (BossMod) from each clone at the tank holding
  // its tether. The data has no angle, and the facing drew them off the
  // tanks; 31542/31543 are the same cones' visuals, hitting nobody.
  [BLADEDANCE]: { angle: 90, aim: "hits", style: "tankbuster" },
  [BLADEDANCE_VISUALS[0]]: { hidden: true }, [BLADEDANCE_VISUALS[1]]: { hidden: true },
  // Sagittarius Arrow: a 10y line baited on the party, its telegraph shown
  // for the whole 7.7s cast (omen general02f). Fight 17: aimed at the party
  // at (97, 106) as it began (3:32.1); they stepped ~5y east by 3:39.8.
  [ARROW]: { telegraph: true },
  // Two 1y circles under the bosses as Limitless Synergy starts (31554 /
  // 31555, 3:29.6 in fight 17): no damage, no meaning to the players.
  31554: { hidden: true }, 31555: { hidden: true },
} satisfies Record<number, Override>);

Object.assign(HEAD_MARKERS, {
  343: { label: "Tank buster", abilities: SOLAR_RAY },
  [SPOTLIGHT_MARKER]: { label: "Stack", abilities: [SPOTLIGHT] },
  // Prey, three players, 8s before the three Optimized Meteors (3:45.7).
  346: { label: "Meteor", abilities: [METEOR] },
} satisfies Record<number, HeadMarkerDef>);

Object.assign(TETHERS, {
  // Party Synergy partners (222, between the two players of each symbol,
  // with the symbols at +27.6). Ended by the Fire spreads, where the
  // pair's distance first counts (fight 17 2:37.5 -> 2:51.3).
  222: { element: "top-glitch", payoff: [FIRE_III] },
  // Limitless Synergy's tank tethers (84) from the two outer clones, taken
  // by the tanks (fight 17: 3:31.7 to the SCH and the DRK, the WAR takes
  // the SCH's at 3:34.2), paid off by Bladedance at 3:39.9.
  84: { element: "top-bladedance", payoff: [BLADEDANCE], passed: 2 },
} satisfies Record<number, TetherKind>);

// The clones show 5.1s before their attacks land (BossMod's
// P2PartySynergyDoubleAOEs: timeline event 0x1E43, activation +5.1s); their
// weapon says what's coming. The log has only the attacks themselves.
const CLONE_SHOW_MS = 5100;
const CLONES: Record<number, { kind: string; label: string }> = {
  [SWORD]:  { kind: "top-clone-sword",  label: "Sword: out" },
  [SHIELD]: { kind: "top-clone-shield", label: "Shield: in" },
  [STAFF]:  { kind: "top-clone-staff",  label: "Staff: cross" },
  [LEGS]:   { kind: "top-clone-legs",   label: "Legs: sides" },
};

const bearingOf = (facing: number) => facingToCompassBearing(facing);
const along = (x: number, y: number, bearing: number, d: number) => {
  const b = (bearing * Math.PI) / 180;
  return { x: x + Math.sin(b) * d, y: y - Math.cos(b) * d };
};

// TOP's arena: 20y around (100, 100) in every phase (the Interdimensional
// Rift map; P1's towers and P2's clones sit inside it).
const ARENA = { x: 10000, y: 10000, r: 2000 };

/** Where a line from (x, y) along `bearing` first crosses the arena's edge. */
function arenaEntry(x: number, y: number, bearing: number): { x: number; y: number } | undefined {
  const b = (bearing * Math.PI) / 180, ux = Math.sin(b), uy = -Math.cos(b);
  const dx = x - ARENA.x, dy = y - ARENA.y;
  const half = dx * ux + dy * uy, c = dx * dx + dy * dy - ARENA.r * ARENA.r;
  const disc = half * half - c;
  if (disc < 0) return undefined;
  const s = -half - Math.sqrt(disc);
  return s >= 0 ? { x: x + ux * s, y: y + uy * s } : undefined;
}

function p2Effects(data: ReplayData): CasterEffect[] {
  const casts = data.enemyCasts ?? [];
  const actorByKey = new Map(data.actors.map((a) => [a.key, a]));
  const out: CasterEffect[] = [];
  const labelled = new Set<string>();
  for (const c of casts) {
    const clone = c[3] === 0 && c[4] !== undefined ? CLONES[c[4]] : undefined;
    const a = clone && actorByKey.get(c[1]);
    const p = a && sampleNear(a, c[0], 1500);
    if (!clone || !p) continue;
    // One label per weapon per volley (the five swords after Discharger).
    const tag = `${clone.kind}@${Math.round(c[0] / 2000)}`;
    out.push({ kind: clone.kind, label: labelled.has(tag) ? "" : clone.label, x: p.x, y: p.y, start: c[0] - CLONE_SHOW_MS, end: c[0] });
    labelled.add(tag);
  }
  // The eye at the edge (the optical unit): relative north for the symbol
  // rows, from the symbols until its laser. The unit logs one position, at
  // its laser: 45y out at (131.8, 131.8) in fight 17, its beam (fit 1 of 1)
  // crossing the arena. Drawn where the beam enters the 20y arena.
  const markers = data.headMarkers ?? [];
  for (const laser of casts.filter((c) => c[4] === OPTICAL_LASER && c[3] === 0)) {
    const eye = actorByKey.get(laser[1]);
    const u = eye && sampleNear(eye, laser[0], 1500);
    const sym = markers.find((m) => SYMBOL_MARKERS.includes(m[2]) && laser[0] - m[0] > 0 && laser[0] - m[0] < 20000);
    if (!u || !sym) continue;
    const p = arenaEntry(u.x, u.y, bearingOf(u.facing)) ?? u;
    const glitch = (data.playerAuras ?? []).find((s) => (s[3] === MID_GLITCH || s[3] === REMOTE_GLITCH) && s[0] <= laser[0] && s[1] >= laser[0]);
    const label = glitch ? (glitch[3] === MID_GLITCH ? "Mid Glitch: partners 20-26y" : "Remote Glitch: partners 35y+") : "";
    out.push({ kind: "top-eye", label, x: p.x, y: p.y, start: sym[0], end: laser[0] + 300 });
  }
  // The four PlayStation symbols over their pairs, until the Fire spreads.
  const fires = casts.filter((c) => c[4] === FIRE_III && c[3] === 0);
  for (const [t, key, id] of markers) {
    if (!SYMBOL_MARKERS.includes(id)) continue;
    const fire = fires.find((c) => c[0] > t && c[0] - t < 20000);
    const who = actorByKey.get(key);
    const p = who && poseAt(who, t);
    if (!p) continue;
    out.push({ kind: `top-symbol-${id}`, label: "", actor: key, x: p.x, y: p.y, start: t, end: fire ? fire[0] : t + 14000 });
  }
  return out;
}

function p2Clones(data: ReplayData): AoeShape[] {
  const casts = data.enemyCasts ?? [];
  const actorByKey = new Map(data.actors.map((a) => [a.key, a]));
  const out: AoeShape[] = [];
  const base = { width: 0, angle: 0, inner: 0, estimated: false, style: "aoe" as const };
  for (const c of casts) {
    if (c[3] !== 0) continue;
    const a = actorByKey.get(c[1]);
    const p = a && sampleNear(a, c[0], 1500);
    if (!p) continue;
    if (LEGS_SIDES.includes(c[4] ?? 0)) {
      // AOEShapeRect(40, 40, -4) turned ±90° off Omega-F's facing: each
      // side from 4y off her line out to 40y, 80y along it, leaving an 8y
      // strip through her (BossMod; the data's 80 x 36 is the same rect).
      const side = (bearingOf(p.facing) + (c[4] === LEGS_SIDES[0] ? 270 : 90)) % 360;
      const o = along(p.x, p.y, side, 400);
      out.push({ ...base, kind: "rect", x: o.x, y: o.y, bearing: side, range: 3600, width: 8000, name: "Superliminal Steel", start: c[0] - 300, resolve: c[0] });
    } else if (c[4] === SHIELD) {
      // Beyond Strength: a 10-40y donut (omen gl_sicle_4010).
      out.push({ ...base, kind: "donut", x: p.x, y: p.y, bearing: 0, range: 4000, inner: 1000, name: "Beyond Strength", start: c[0] - 300, resolve: c[0] });
    }
  }
  return out;
}

// Spotlight: the two marked players' 6y stacks ride on them from the
// marker until they land (fight 17 2:52.2 -> 3:02.8, four in each).
// Discharger: the 13y knockback from the middle (BossMod), drawn as it lands.
function p2Stacks(data: ReplayData): AoeShape[] {
  const casts = data.enemyCasts ?? [];
  const hits = data.enemyHits ?? [];
  const geo = data.actionGeometry ?? {};
  const out: AoeShape[] = [];
  for (const [t, key, id] of data.headMarkers ?? []) {
    if (id !== SPOTLIGHT_MARKER) continue;
    const land = casts.find((c) => c[4] === SPOTLIGHT && c[3] === 0 && c[0] > t && c[0] - t < 12000);
    if (!land) continue;
    out.push({
      kind: "circle", x: 0, y: 0, bearing: 0, range: (geo[SPOTLIGHT]?.range ?? 6) * 100, width: 0, angle: 0, inner: 0,
      estimated: false, style: "stack", name: "Spotlight", start: t, resolve: land[0], follow: key, noFlash: true,
    });
  }
  for (const c of casts) {
    if (c[4] !== DISCHARGER || c[3] !== 0) continue;
    const h = hits.find((x) => x[1] === DISCHARGER && x[0] >= c[0] && x[0] - c[0] < 1500 && x[4] !== null);
    if (!h) continue;
    out.push({
      kind: "circle", x: h[4]!, y: h[5]!, bearing: 0, range: 1300, width: 0, angle: 0, inner: 0,
      estimated: false, style: "knockback", name: "Discharger", start: c[0] - 1500, resolve: c[0],
    });
  }
  return out;
}

// ── P3 Omega Reconfigured (omega-reconfiguredd.ts) ──────────────────────────

const WAVE_REPEATER = [31567, 31568, 31569, 31570];   // 0-6y, then 6-12, 12-18, 18-24y rings
const COLOSSAL_BLOW = 31566;
const SNIPER = 31571, HP_SNIPER = 31572;
const SNIPER_FODDER = 1003425, HP_SNIPER_FODDER = 1003426;
const TOWER_RED = 31583, TOWER_BLUE = 31584;
const STACK_BUG = 31574, DEFAMATION_BUG = 31575;
const STACK_STATUS = 1003524, DEFAMATION_STATUS = 1003525;
const ROT_RED = 31578, ROT_BLUE = 31579;
const ROT_RED_STATUS = 1003526, ROT_BLUE_STATUS = 1003429;
const MONITOR_BOSS: Record<number, "right" | "left"> = { 31595: "right", 31596: "left" };
const MONITOR_STATUS: Record<number, "right" | "left"> = { 1003452: "right", 1003453: "left" };
const MARK_LEAD_MS = 5000;   // spreads, stacks and defamations shown on their owner this long before they go off

Object.assign(OVERRIDES, {
  // The rings are drawn by p3Rings (exact donut holes; the helper casting
  // them logs one sample, 2s before the first).
  ...Object.fromEntries(WAVE_REPEATER.map((id) => [id, { hidden: true }])),
  // Colossal Blow: the arms' 11y blows (BossMod), shown for their 1.7s cast.
  // Unresolved: at the first set (fight 17 4:53.9) all eight stood 6-10y
  // from the logged arms and none was hit; at the second (4:56.4) they
  // stood 11.3-12.1y away.
  [COLOSSAL_BLOW]: { telegraph: true },
  [HP_SNIPER]: { style: "stack" },
  // Hello World's towers are drawn by p3Towers in their colour from their
  // 9.7s begincast, at the helper's spot (the cast's target is its
  // soaker, 2-5y off the tower: fight 17 5:33.2).
  [TOWER_RED]: { hidden: true }, [TOWER_BLUE]: { hidden: true },
  // The stack and the defamation land on their owner, whose bug just ran
  // out; a hit on several players loses the cast target, and the helper
  // casting it sits at (100, 90).
  [STACK_BUG]: { holder: STACK_STATUS, style: "stack" },
  [DEFAMATION_BUG]: { holder: DEFAMATION_STATUS },
  // Rot expiries: no damage to the holder (header), drawn in the rot's colour.
  [ROT_RED]: { style: "top-rot-red" }, [ROT_BLUE]: { style: "top-rot-blue" },
  31558: { hidden: true },   // a 1y circle under the boss before the monitors (7:07.7)
} satisfies Record<number, Override>);

Object.assign(TETHERS, {
  // Hello World's tethers (omega-reconfiguredd.ts; fight 17 5:12.1 on):
  // 200 / 201 the Local / Remote pair's 20s preparation, 224 / 225 the live
  // Local (green) / Remote (blue) tether, broken by closing in / moving
  // apart, which the log shows only as Local / Remote Regression ending.
  200: { element: "top-local-prep", payoff: [], endStatus: [1003503] },
  201: { element: "top-remote-prep", payoff: [], endStatus: [1003441] },
  224: { element: "top-local", payoff: [], endStatus: [1003529] },
  225: { element: "top-remote", payoff: [], endStatus: [1003530] },
} satisfies Record<number, TetherKind>);

const shape = (o: Partial<AoeShape> & Pick<AoeShape, "kind" | "x" | "y" | "range" | "name" | "start" | "resolve" | "style">): AoeShape =>
  ({ bearing: 0, width: 0, angle: 0, inner: 0, estimated: false, ...o });

// Wave Repeater: four rings out from the middle, 2s apart, twice. Each
// shows from the one before it (the first from its 4.7s cast bar), so the
// wave reads as moving out (BossMod radii: 6, 12, 18, 24y).
function p3Rings(data: ReplayData): AoeShape[] {
  const casts = data.enemyCasts ?? [];
  const out: AoeShape[] = [];
  for (const c of casts) {
    const k = c[3] === 0 ? WAVE_REPEATER.indexOf(c[4] ?? 0) : -1;
    if (k < 0) continue;
    let start = c[0] - 2100;
    if (k === 0) {
      const begin = casts.find((b) => b[4] === c[4] && b[3] > 0 && Math.abs(b[0] + b[3] - c[0]) < 800);
      if (begin) start = begin[0];
    }
    out.push(shape({
      kind: k === 0 ? "circle" : "donut", x: ARENA.x, y: ARENA.y, range: 600 * (k + 1), inner: 600 * k,
      name: "Wave Repeater", start, resolve: c[0], style: "aoe",
    }));
  }
  return out;
}

// Hello World's towers: red (31583, for the red rot) and blue (31584), at
// the helper's spot from the begincast until soaked.
function p3Towers(data: ReplayData): AoeShape[] {
  const casts = data.enemyCasts ?? [];
  const hits = data.enemyHits ?? [];
  const actorByKey = new Map(data.actors.map((a) => [a.key, a]));
  const out: AoeShape[] = [];
  for (const c of casts) {
    if (c[3] !== 0 || (c[4] !== TOWER_RED && c[4] !== TOWER_BLUE)) continue;
    const a = actorByKey.get(c[1]);
    const hit = hits.find((h) => h[2] === c[1] && h[1] === c[4] && h[0] >= c[0] && h[0] - c[0] <= 1500 && h[4] !== null);
    const p = (a && sampleNear(a, c[0], 1500)) ?? (hit ? { x: hit[4]!, y: hit[5]! } : undefined);
    const begin = casts.find((b) => b[1] === c[1] && b[4] === c[4] && b[3] > 0 && Math.abs(b[0] + b[3] - c[0]) < 800);
    if (!p) continue;
    out.push(shape({
      kind: "circle", x: p.x, y: p.y, range: 600, soakers: 1, name: c[4] === TOWER_RED ? "Cascading Latent Defect" : "Latent Performance Defect",
      start: begin ? begin[0] : c[0] - 300, resolve: c[0], style: c[4] === TOWER_RED ? "top-tower-red" : "top-tower-blue",
    }));
  }
  return out;
}

// What rides on players: each rot (5y, its colour) for as long as it's
// held; the Sniper marks (6y spreads, 6y High-powered stacks) and Hello
// World's stacks (5y) and defamations (20y) for the last 5s before they go
// off. Statuses that end without their attack (a death) are left out.
function p3Marks(data: ReplayData): AoeShape[] {
  const hits = data.enemyHits ?? [];
  const casts = data.enemyCasts ?? [];
  const out: AoeShape[] = [];
  const MARKS: Record<number, { range: number; style: AoeShape["style"]; name: string; ability: number }> = {
    [SNIPER_FODDER]: { range: 600, style: "top-spread", name: "Sniper Cannon", ability: SNIPER },
    [HP_SNIPER_FODDER]: { range: 600, style: "stack", name: "High-Powered Sniper Cannon", ability: HP_SNIPER },
    [STACK_STATUS]: { range: 500, style: "stack", name: "Critical Synchronization Bug", ability: STACK_BUG },
    [DEFAMATION_STATUS]: { range: 2000, style: "top-spread", name: "Critical Overflow Bug", ability: DEFAMATION_BUG },
  };
  for (const [start, end, key, id] of data.playerAuras ?? []) {
    if (id === ROT_RED_STATUS || id === ROT_BLUE_STATUS) {
      out.push(shape({
        kind: "circle", x: 0, y: 0, range: 500, name: id === ROT_RED_STATUS ? "Critical Underflow Bug" : "Critical Performance Bug",
        start, resolve: end, follow: key, noFlash: true, style: id === ROT_RED_STATUS ? "top-rot-red-held" : "top-rot-blue-held",
      }));
      continue;
    }
    const m = MARKS[id];
    if (!m) continue;
    const fired = casts.some((c) => c[4] === m.ability && c[3] === 0 && Math.abs(c[0] - end) <= 1500)
      || hits.some((h) => h[1] === m.ability && Math.abs(h[0] - end) <= 1500);
    if (!fired) continue;
    out.push(shape({ kind: "circle", x: 0, y: 0, range: m.range, name: m.name, start: Math.max(start, end - MARK_LEAD_MS), resolve: end, follow: key, noFlash: true, style: m.style }));
  }
  return out;
}

// Oversampled Wave Cannon: the boss's monitor (31595 right / 31596 left,
// for its 9.7s cast) and the three players' (Loading right / left), on the
// side each will fire to, turning with its holder.
function p3Monitors(data: ReplayData): CasterEffect[] {
  const casts = data.enemyCasts ?? [];
  const actorByKey = new Map(data.actors.map((a) => [a.key, a]));
  const out: CasterEffect[] = [];
  for (const c of casts) {
    const side = c[3] > 0 && c[4] !== undefined ? MONITOR_BOSS[c[4]] : undefined;
    const a = side && actorByKey.get(c[1]);
    const p = a && poseAt(a, c[0]);
    if (side && p) out.push({ kind: `top-monitor-${side}`, label: "", actor: c[1], x: p.x, y: p.y, start: c[0], end: c[0] + c[3] });
  }
  for (const [start, end, key, id] of data.playerAuras ?? []) {
    const side = MONITOR_STATUS[id];
    const a = side && actorByKey.get(key);
    const p = a && poseAt(a, start);
    if (side && p) out.push({ kind: `top-monitor-${side}`, label: "", actor: key, x: p.x, y: p.y, start, end });
  }
  return out;
}

function buildShapes(data: ReplayData): AoeShape[] {
  return [
    ...p1Towers(data), ...p1Puddles(data), ...p1Sets(data), ...p2Clones(data), ...p2Stacks(data),
    ...p3Rings(data), ...p3Towers(data), ...p3Marks(data),
  ];
}

function buildEffects(data: ReplayData): CasterEffect[] {
  return [...p2Effects(data), ...p3Monitors(data)];
}

export const TOP_REPLAY: FightReplay = {
  key: "top",
  game: "ffxiv",
  name: "The Omega Protocol",
  signature: [PROGRAM_LOOP, 31499, 31550, 31551],
  overrides: OVERRIDES,
  headMarkers: HEAD_MARKERS,
  tethers: TETHERS,
  effects: buildEffects,
  shapes: buildShapes,
};
