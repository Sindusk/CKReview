// lib/mechanics/wow/va/sszorak-replay.ts
//
// Sszorak's replay spec (lib/replay/fight-spec.ts). Art in
// components/replay-art/va.tsx ("va-sszorak-..."). Built from the kill
// nHavrDhPVtBYkMXA fight 43 (4:55), refined on the kill dqKJB9rgXpRPyVTj
// fight 7 (6:18, the user has its VOD); review in docs/replay-reviews/va.md.
// Nothing here is VOD-checked yet.
//
// Not drawn: Tempest's tornadoes between hits (no actors; a swirl marks
// where each one struck a player), the Maelstrom's gale order and the wind
// tunnels' motes (no events).

import type { AoeShape } from "@/lib/replay/action-shapes";
import type { CasterEffect, FightReplay } from "@/lib/replay/fight-spec";
import { poseAt, sampleNear, type ReplayData } from "@/lib/replay/ffxiv-replay";
import { facingToCompassBearing } from "@/lib/mechanics/geometry";
import { actorMap, wowAuraSpans, wowCasts, wowLastAuraNear, wowShape } from "@/lib/replay/wow-helpers";

const MUTILATE_BEGIN = 1277027, MUTILATE = 1277031, MUTILATE_HIT = 1285999;
const MUTILATE_RANGE = 2500;        // the tank cones' length (tankCones)
const RAVAGE_BEGIN = 1277002, RAVAGE = 1277101;
const FURY_MARK = 1305621;          // Serpent's Fury: stack 14 within 8y of the mark
const VIRULENCE = [1297707, 1299899];
const VIRULENCE_BURST = 1300089;    // a burst's hit on another player (re-infects them)
const VIRULENCE_LINE = 1500;        // each burst line's length, centi-yards
const SURGE = 1305963;              // 10s; a Viscous Cyst where it ends
const CYST_POP = 1287205;           // a pop puts this on every living player at once
const CROSSWINDS_A = [1297096, 1297111];   // pairs that clear each other's Gusts (header)
const CROSSWINDS_B = [1285425, 1285453];
const TEMPEST = 1287083;            // direct hit: debuff on the player
const TEMPEST_CAST = 1287072;       // the 3.5s channel
const CLAWS = 1305998, RESIDUE = 1296667;

/** A cast whose begincast and resolve carry different ids: its begin, resolve and target. */
function pairedCasts(data: ReplayData, beginId: number, resolveId: number) {
  const begins = wowCasts(data, [beginId]);
  return wowCasts(data, [resolveId]).map((c) => ({ ...c, begin: begins.find((b) => Math.abs(b.t - c.t) < 300)?.begin }));
}

/**
 * Ravage (white) and Mutilate (green, shared by the soak group): a cone from
 * Sszorak that tracks the tank through the 3s cast bar and is gone with the
 * hit, as in game (user's VOD of dqKJB9rgXpRPyVTj fight 7, 2026-10-19).
 * The tank is the resolve's target. Mutilate 70°, 25y: in the kill
 * nHavrDhPVtBYkMXA fight 43 all 96 soaker hits stood within 36° of the
 * boss->tank line, 5-25y out. Ravage hits only its tank; its 50° and 25y
 * are read off the VOD stills (art in va.tsx).
 */
function tankCones(data: ReplayData): CasterEffect[] {
  const cone = (begin: number, id: number, kind: string, label: string) =>
    pairedCasts(data, begin, id).filter((c) => c.target && c.target !== c.caster).map((c) => ({
      kind, label, actor: c.caster, aimAt: c.target, x: 0, y: 0, radius: MUTILATE_RANGE, start: c.begin ?? c.t - 3000, end: c.t,
    }));
  return [...cone(RAVAGE_BEGIN, RAVAGE, "va-sszorak-ravage", "Ravage"), ...cone(MUTILATE_BEGIN, MUTILATE, "va-sszorak-mutilate", "Mutilate")];
}

/**
 * Serpent's Fury: a mark icon on its holder for the whole debuff, and the
 * 8y stack circle only for the last FURY_STACK_MS before the charge. The
 * mark sits on one player 40-70s at a time and goes back on ~6s after each
 * charge (kill dqKJB9rgXpRPyVTj fight 7: the same player all fight), so a
 * circle for the whole span covered them all fight (user, 2026-10-19).
 */
const FURY_STACK_MS = 8000;
function fury(data: ReplayData): AoeShape[] {
  return wowAuraSpans(data, [FURY_MARK]).map((s) =>
    wowShape({ kind: "circle", x: 0, y: 0, range: 800, name: "Serpent's Fury", start: Math.max(s.start, s.end - FURY_STACK_MS), resolve: s.end,
      follow: s.target, style: "stack" }));
}

function furyMarks(data: ReplayData): CasterEffect[] {
  return wowAuraSpans(data, [FURY_MARK]).map((s) => ({
    kind: "va-sszorak-fury", label: "Serpent's Fury", actor: s.target, x: 0, y: 0, start: s.start, end: s.end,
  }));
}

// Each Crosswinds aura throws its holder one fixed way (map bearing, 0 =
// north, clockwise), 15° off the cardinals with the arena. Kill
// dqKJB9rgXpRPyVTj fight 7: in the first 0.6s after every one of the 47
// logged blasts (0:47.7 ... 5:48.8), the holder moved 4-23y on exactly this
// bearing (±1°, one Druid at 259° for 285°); partners are opposites.
const CROSSWINDS_BEARING: Record<number, number> = { 1285425: 15, 1285453: 195, 1297096: 105, 1297111: 285 };

/** Crosswinds' arrow on each holder for its 8s, pointing where the blast will throw them. */
function crosswindArrows(data: ReplayData): CasterEffect[] {
  return wowAuraSpans(data, Object.keys(CROSSWINDS_BEARING).map(Number)).map((s) => ({
    kind: `va-sszorak-arrow-${CROSSWINDS_BEARING[s.id]}`, label: "Raging Crosswinds", actor: s.target, x: 0, y: 0, start: s.start, end: s.end,
  }));
}

/** Crosswinds: the ~6y blast circle on each holder for its 8s, coloured by the pair that clears each other. */
function crosswinds(data: ReplayData): AoeShape[] {
  return wowAuraSpans(data, [...CROSSWINDS_A, ...CROSSWINDS_B]).map((s) =>
    wowShape({ kind: "circle", x: 0, y: 0, range: 600, name: "Raging Crosswinds", start: s.start, resolve: s.end, follow: s.target,
      style: CROSSWINDS_A.includes(s.id) ? "va-sszorak-wind-a" : "va-sszorak-wind-b" }));
}

type Cyst = { x: number; y: number; start: number; end: number };

/**
 * Viscous Cysts: dropped where each Venomous Surge ends, until a pop (the
 * Viscous Cyst debuff landing on the raid at once) is matched to it: the
 * live cyst with a player nearest to it at that moment.
 */
function cysts(data: ReplayData): Cyst[] {
  const actors = actorMap(data);
  const out: Cyst[] = [];
  for (const s of wowAuraSpans(data, [SURGE])) {
    const a = actors.get(s.target);
    const p = a && poseAt(a, s.end);
    if (p && s.end < data.durationMs) out.push({ x: p.x, y: p.y, start: s.end, end: data.durationMs });
  }
  const pops: number[] = [];
  for (const [t, id, , applied] of data.enemyAuras ?? []) {
    if (id !== CYST_POP || !applied) continue;
    if (!pops.length || t - pops[pops.length - 1] > 1000) pops.push(t);
  }
  const players = data.actors.filter((a) => a.kind === "player");
  for (const t of pops) {
    let best: { c: Cyst; d: number } | undefined;
    for (const c of out) {
      if (c.start > t || c.end <= t) continue;
      for (const pl of players) {
        const p = poseAt(pl, t);
        if (!p || p.hp === 0) continue;
        const d = Math.hypot(p.x - c.x, p.y - c.y);
        if (!best || d < best.d) best = { c, d };
      }
    }
    if (best) best.c.end = t;
  }
  return out;
}

/**
 * A cyst at its trigger size, 5y: at each of the kill's 11 pops the nearest
 * player stood 1.7-5.4y from it (samples up to ~1s old). Each drop also
 * flashes Surge's blast where it lands.
 */
const CYST_RADIUS = 500;
function cystEffects(data: ReplayData): CasterEffect[] {
  return cysts(data).flatMap((c) => [
    { kind: "va-sszorak-cyst", label: "Viscous Cyst", x: c.x, y: c.y, radius: CYST_RADIUS, start: c.start, end: c.end },
    { kind: "va-sszorak-surge-blast", label: "Venomous Surge", x: c.x, y: c.y, radius: SURGE_RADIUS, start: c.start, end: c.start + 900 },
  ]);
}

/**
 * Venomous Surge on its carriers: a shimmering green aura (user's VOD),
 * SURGE_RADIUS across, the size its blast is drawn at too. The log can't
 * size it: the blast hits the whole raid (one pull with amounts: the holder
 * 360-395k, 1.5y away 172k, 24-72y away 50-170k with no clear falloff) and
 * nobody stood 2-23y from a holder. 8y is a guess for the VOD to settle.
 */
const SURGE_RADIUS = 800;
function carriers(data: ReplayData): CasterEffect[] {
  return wowAuraSpans(data, [SURGE]).map((s) => ({
    kind: "va-sszorak-surge", label: "Venomous Surge", actor: s.target, x: 0, y: 0, radius: SURGE_RADIUS, start: s.start, end: s.end,
  }));
}

/**
 * Virulence: the game shows each carrier's burst as four lines, a + for one
 * id and an X for the other (user's VOD, 0:27). Lines fixed to the map, 15y.
 * Measured on dqKJB9rgXpRPyVTj fight 7 and nHavrDhPVtBYkMXA fight 43 from
 * where players spread: at each expiry, players within 15y of a 1297707
 * carrier avoided bearings 0/90/180/270 (±7°) and those near a 1299899
 * carrier avoided 45/135/225/315; within 6° of a line sat 0-6% of neighbours
 * inside 15y against 10-17% beyond (13% by chance).
 */
const VIRULENCE_PLUS = 1297707;
function virulence(data: ReplayData): CasterEffect[] {
  return wowAuraSpans(data, VIRULENCE).map((s) => ({
    kind: s.id === VIRULENCE_PLUS ? "va-sszorak-virulence-plus" : "va-sszorak-virulence-x",
    label: "Virulence", actor: s.target, x: 0, y: 0, radius: VIRULENCE_LINE, start: s.start, end: s.end + 400,
  }));
}

/** A flashing green X on a player a Virulence burst hit (re-infected: the spread failed). */
function virulenceFails(data: ReplayData): CasterEffect[] {
  return (data.enemyHits ?? []).filter((h) => h[1] === VIRULENCE_BURST).map((h) => ({
    kind: "va-sszorak-virulence-fail", label: "Virulence hit", actor: h[3], x: h[6] ?? 0, y: h[7] ?? 0, start: h[0], end: h[0] + 2000,
  }));
}

/** A tornado's swirl where Tempest struck a player. */
function tempestHits(data: ReplayData): CasterEffect[] {
  const actors = actorMap(data);
  return wowAuraSpans(data, [TEMPEST]).flatMap((s) => {
    const a = actors.get(s.target);
    const p = a && poseAt(a, s.start);
    return p ? [{ kind: "va-sszorak-tornado", label: "Tempest", x: p.x, y: p.y, start: s.start - 500, end: s.start + 1200 }] : [];
  });
}

/**
 * Tempest's tornadoes, MODELLED (no actors in the log). In game (user's
 * VOD) they form around Sszorak during the 3.5s channel, hold still, and at
 * the cast's end go straight out from him, bouncing off the arena's edge
 * for most of the phase. Here: TORNADOES on a 10y ring (the first hits at
 * +0.6-1.0s were 8-12y from him), the first at his facing, 7y/s (user's
 * VOD stills at 0:23.6 / 0:26 / 0:29 after the 0:20.5 launch: the farthest
 * ~36y out at +3.1s and ~50y at +5.5s, scaled by Virulence's 15y lines;
 * 2y/s was too slow, user 2026-10-19), reflecting off a 50y circle (players' farthest samples
 * per 15° sector: 40-62y, most 48-56), for 40s (the latest hits came at
 * +36s). A fit of count, speed and angle to the 65 first hits in both kills
 * found nothing clearly better than chance, so the paths after launch are
 * a picture of the mechanic, not where each tornado was.
 */
const TORNADOES = 8, TORNADO_RING = 1000, TORNADO_SPEED = 700 /* centi-yards a second */, TORNADO_LIFE_MS = 40000;
const ARENA = { x: -40650, y: -38680, r: 5000 };
function tornadoes(data: ReplayData): CasterEffect[] {
  const actors = actorMap(data);
  return wowCasts(data, [TEMPEST_CAST]).flatMap((c) => {
    const boss = actors.get(c.caster);
    const b = boss && sampleNear(boss, c.t, 2000);
    if (!b) return [];
    const face = facingToCompassBearing(b.facing);
    return Array.from({ length: TORNADOES }, (_, k) => {
      const a = ((face + (k * 360) / TORNADOES) * Math.PI) / 180;
      let x = b.x + Math.sin(a) * TORNADO_RING, y = b.y - Math.cos(a) * TORNADO_RING;
      let vx = Math.sin(a) * TORNADO_SPEED, vy = -Math.cos(a) * TORNADO_SPEED;
      const path = [{ t: c.t, x, y }];
      const STEP = 250;
      for (let t = STEP; t <= TORNADO_LIFE_MS; t += STEP) {
        x += (vx * STEP) / 1000; y += (vy * STEP) / 1000;
        const rx = x - ARENA.x, ry = y - ARENA.y, r = Math.hypot(rx, ry);
        if (r > ARENA.r) {
          const nx = rx / r, ny = ry / r, dot = vx * nx + vy * ny;
          if (dot > 0) { vx -= 2 * dot * nx; vy -= 2 * dot * ny; }
        }
        path.push({ t: c.t + t, x, y });
      }
      return { kind: "va-sszorak-whirl", label: "Tempest", x: path[0].x, y: path[0].y, path,
        start: c.begin ?? c.t - 3500, end: c.t + TORNADO_LIFE_MS };
    });
  });
}

/** Caustic Claws' impact, then its Caustic Residue pool until the last player stepped in it. */
function residue(data: ReplayData): AoeShape[] {
  const actors = actorMap(data);
  return (data.enemyHits ?? []).filter((h) => h[1] === CLAWS).flatMap((h) => {
    const a = actors.get(h[3]);
    const p = h[6] !== null && h[7] !== null ? { x: h[6], y: h[7] } : a && poseAt(a, h[0]);
    if (!p) return [];
    const last = wowLastAuraNear(data, [RESIDUE], p, h[0], 6, 90000);
    return [wowShape({ kind: "circle", x: p.x, y: p.y, range: 600, name: "Caustic Residue", start: h[0],
      resolve: Math.max(h[0] + 5000, (last ?? 0) + 1000), style: "va-sszorak-residue", noFlash: true })];
  });
}

export const SSZORAK_REPLAY: FightReplay = {
  key: "va-sszorak",
  game: "wow",
  name: "Sszorak",
  signature: [MUTILATE_BEGIN, SURGE, FURY_MARK],
  hiddenHits: [MUTILATE_HIT],
  shapes: (data) => [...fury(data), ...crosswinds(data), ...residue(data)],
  effects: (data) => [...tankCones(data), ...furyMarks(data), ...cystEffects(data), ...carriers(data), ...virulence(data), ...virulenceFails(data),
    ...tornadoes(data), ...tempestHits(data), ...crosswindArrows(data)],
};
