// lib/mechanics/wow/va/sszorak-replay.ts
//
// Sszorak's replay spec (lib/replay/fight-spec.ts). Art in
// components/replay-art/va.tsx ("va-sszorak-..."). Built from the kill
// nHavrDhPVtBYkMXA fight 43 (4:55); review in docs/replay-reviews/va.md.
// Nothing here is VOD-checked yet.
//
// Not drawn: Tempest's tornadoes between hits (no actors; a swirl marks
// where each one struck a player), the Maelstrom's gale order and the wind
// tunnels' motes (no events), Crosswinds' arrow directions (the four auras
// are drawn by pair: in the kill the holders' movement after the blast
// didn't settle which aura points which way, as partners collide midair).

import type { AoeShape } from "@/lib/replay/action-shapes";
import type { CasterEffect, FightReplay } from "@/lib/replay/fight-spec";
import { poseAt, sampleNear, type ReplayData } from "@/lib/replay/ffxiv-replay";
import { actorMap, wowAuraSpans, wowCasts, wowLastAuraNear, wowShape } from "@/lib/replay/wow-helpers";

const MUTILATE_BEGIN = 1277027, MUTILATE = 1277031, MUTILATE_HIT = 1285999;
const MUTILATE_ANGLE = 70;          // kill: all 96 soaker hits within 36° of the boss->tank line, 5-25y out
const MUTILATE_RANGE = 2500;
const RAVAGE_BEGIN = 1277002, RAVAGE = 1277101;
const FURY_MARK = 1305621;          // Serpent's Fury: stack 14 within 8y of the mark
const VIRULENCE = [1297707, 1299899];
const SURGE = 1305963;              // 10s; a Viscous Cyst where it ends
const CYST_POP = 1287205;           // a pop puts this on every living player at once
const CROSSWINDS_A = [1297096, 1297111];   // pairs that clear each other's Gusts (header)
const CROSSWINDS_B = [1285425, 1285453];
const TEMPEST = 1287083;            // direct hit: debuff on the player
const CLAWS = 1305998, RESIDUE = 1296667;

/** A cast whose begincast and resolve carry different ids: its begin, resolve and target. */
function pairedCasts(data: ReplayData, beginId: number, resolveId: number) {
  const begins = wowCasts(data, [beginId]);
  return wowCasts(data, [resolveId]).map((c) => ({ ...c, begin: begins.find((b) => Math.abs(b.t - c.t) < 300)?.begin }));
}

/** Mutilate: the soak cone from Sszorak to the tank for its 3s cast. */
function mutilate(data: ReplayData): AoeShape[] {
  const actors = actorMap(data);
  return pairedCasts(data, MUTILATE_BEGIN, MUTILATE).flatMap((c) => {
    const boss = actors.get(c.caster), tank = actors.get(c.target);
    const b = boss && sampleNear(boss, c.t, 2000), p = tank && poseAt(tank, c.t);
    if (!b || !p) return [];
    const bearing = ((Math.atan2(p.x - b.x, -(p.y - b.y)) * 180) / Math.PI + 360) % 360;
    return [wowShape({ kind: "cone", x: b.x, y: b.y, bearing, angle: MUTILATE_ANGLE, range: MUTILATE_RANGE,
      name: "Mutilate", start: c.begin ?? c.t - 3000, resolve: c.t, style: "stack" })];
  });
}

/** Ravage: a tankbuster ring on its tank for the 3s cast. */
function ravage(data: ReplayData): AoeShape[] {
  return pairedCasts(data, RAVAGE_BEGIN, RAVAGE).filter((c) => c.target).map((c) =>
    wowShape({ kind: "circle", x: 0, y: 0, range: 300, name: "Ravage", start: c.begin ?? c.t - 3000, resolve: c.t,
      follow: c.target, style: "tankbuster", estimated: false }));
}

/** Serpent's Fury: the 8y stack circle on the mark until the charge. */
function fury(data: ReplayData): AoeShape[] {
  return wowAuraSpans(data, [FURY_MARK]).map((s) =>
    wowShape({ kind: "circle", x: 0, y: 0, range: 800, name: "Serpent's Fury", start: s.start, resolve: s.end, follow: s.target, style: "stack" }));
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

function cystEffects(data: ReplayData): CasterEffect[] {
  return cysts(data).map((c) => ({ kind: "va-sszorak-cyst", label: "Viscous Cyst", x: c.x, y: c.y, start: c.start, end: c.end }));
}

/** Venomous Surge and Virulence on their carriers. */
function carriers(data: ReplayData): CasterEffect[] {
  return wowAuraSpans(data, [SURGE, ...VIRULENCE]).map((s) => ({
    kind: s.id === SURGE ? "va-sszorak-surge" : "va-sszorak-virulence",
    label: s.id === SURGE ? "Venomous Surge" : "Virulence", actor: s.target, x: 0, y: 0, start: s.start, end: s.end,
  }));
}

/** A tornado's swirl where Tempest struck a player. */
function tempest(data: ReplayData): CasterEffect[] {
  const actors = actorMap(data);
  return wowAuraSpans(data, [TEMPEST]).flatMap((s) => {
    const a = actors.get(s.target);
    const p = a && poseAt(a, s.start);
    return p ? [{ kind: "va-sszorak-tornado", label: "Tempest", x: p.x, y: p.y, start: s.start - 500, end: s.start + 1200 }] : [];
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
  shapes: (data) => [...mutilate(data), ...ravage(data), ...fury(data), ...crosswinds(data), ...residue(data)],
  effects: (data) => [...cystEffects(data), ...carriers(data), ...tempest(data)],
};
