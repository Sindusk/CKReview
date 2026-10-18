// lib/mechanics/wow/va/twin-fangs-replay.ts
//
// The Twin Fangs' replay spec (lib/replay/fight-spec.ts). Art in
// components/replay-art/va.tsx ("va-twin-fangs-..."). Built from the kill
// vRPGT4MN6VALQWFh fight 30 (5:35); review in docs/replay-reviews/va.md.
// Nothing here is VOD-checked yet.
//
// GLOBULES. Each Caustic Deluge throws 15 globules, and each gets a Barbed
// Bulwark actor whose one sample is its spot (0:11.0-0:15.7 in the kill).
// A pickup is an Eternal Venom "cast" (1290336) from Vexhul onto the
// collector: the first Deluge's 15 pickups each stood 1.0-2.9y from a
// Bulwark spot. So a globule lives from its Bulwark's spawn to the first
// Eternal Venom cast on a player within PICKUP_YARDS, or bursts at
// BURST_MS (header: 12.0-16.8s after the Deluge).
//
// Not drawn: Vile Flood's rotation (Vexhul's logged facing doesn't turn
// during the channel), Stir the Depths' waves, Tainted Blood founts (no
// positions), the Noxious Slick.

import type { AoeShape } from "@/lib/replay/action-shapes";
import type { CasterEffect, FightReplay } from "@/lib/replay/fight-spec";
import { poseAt, sampleNear, type ReplayData } from "@/lib/replay/ffxiv-replay";
import { actorMap, wowAuraSpans, wowCasts, wowImpacts, wowShape } from "@/lib/replay/wow-helpers";

const DELUGE = 1289192;
const VENOM_STACK = 1290336;        // Eternal Venom applied: a "cast" with its target
const PICKUP_YARDS = 3.5;
const BURST_MS = 17000;
const STONE_BREAKER = 1288538, STONE_TARGET = 1289092;   // 1.5s cast per impact; the resolve names the soaker
const FEAST_HIT = 1290662;          // a bite, split among players within 14y
const SPIT = 1291478;               // Spawn of Vexhul's 5s line at its marked target
const SPIT_WIDTH = 400;             // assumed; the kill had no unmarked victims
const ICHOR = 1290814;              // Coiling Ichor; Congealed Gore where it ends
const GORE_MS = 120000;             // the journal's "around two minutes"
const FEAST = 1290516;

type Globule = { x: number; y: number; start: number; end: number };

/** The globules (see the header). */
function globules(data: ReplayData): Globule[] {
  const actors = actorMap(data);
  const out: Globule[] = data.actors.filter((a) => a.name.startsWith("Barbed Bulwark") && a.samples.length)
    .map((a) => ({ x: a.samples[0][1], y: a.samples[0][2], start: a.samples[0][0], end: a.samples[0][0] + BURST_MS }));
  for (const c of wowCasts(data, [VENOM_STACK])) {
    const a = actors.get(c.target);
    const p = a && poseAt(a, c.t);
    if (!p) continue;
    const g = out.filter((x) => x.start <= c.t && x.end > c.t)
      .map((x) => ({ x, d: Math.hypot(x.x - p.x, x.y - p.y) })).sort((u, v) => u.d - v.d)[0];
    if (g && g.d <= PICKUP_YARDS * 100) g.x.end = c.t;
  }
  return out;
}

function globuleEffects(data: ReplayData): CasterEffect[] {
  return globules(data).map((g) => ({ kind: "va-twin-fangs-globule", label: "Caustic Globule", x: g.x, y: g.y, start: g.start, end: g.end }));
}

/** Stone Breaker: each impact as a 3y soak circle where its tank stood, from its 1.5s cast. */
function stoneBreaker(data: ReplayData): AoeShape[] {
  const actors = actorMap(data);
  const begins = wowCasts(data, [STONE_BREAKER]);
  return wowCasts(data, [STONE_TARGET]).flatMap((c) => {
    const a = actors.get(c.target);
    const p = a && poseAt(a, c.t);
    if (!p) return [];
    const b = begins.find((x) => Math.abs(x.t - c.t) < 300)?.begin;
    return [wowShape({ kind: "circle", x: p.x, y: p.y, range: 300, name: "Stone Breaker", start: b ?? c.t - 1500, resolve: c.t,
      style: "tower", soakers: 1 })];
  });
}

/** Ravenous Feast: each bite's 14y split where its group stood, 1.5s before it lands. */
function feast(data: ReplayData): AoeShape[] {
  return wowImpacts(data, [FEAST_HIT], 14, 400).map((i) =>
    wowShape({ kind: "circle", x: i.x, y: i.y, range: 1400, name: "Ravenous Feast", start: i.t - 1500, resolve: i.t, style: "stack" }));
}

/** Corrosive Spit: a line from each Spawn of Vexhul to its marked target for the 5s cast. */
function spit(data: ReplayData): AoeShape[] {
  const actors = actorMap(data);
  return wowCasts(data, [SPIT]).filter((c) => c.target).flatMap((c) => {
    const s = actors.get(c.caster), tgt = actors.get(c.target);
    const b = s && sampleNear(s, c.t, 2000), p = tgt && poseAt(tgt, c.t);
    if (!b || !p) return [];
    const bearing = ((Math.atan2(p.x - b.x, -(p.y - b.y)) * 180) / Math.PI + 360) % 360;
    return [wowShape({ kind: "rect", x: b.x, y: b.y, bearing, range: Math.hypot(p.x - b.x, p.y - b.y) + 500, width: SPIT_WIDTH,
      name: "Corrosive Spit", start: c.begin ?? c.t - 5000, resolve: c.t, style: "va-twin-fangs-spit" })];
  });
}

/** Congealed Gore: a pool where each Coiling Ichor ends, for two minutes. */
function gore(data: ReplayData): AoeShape[] {
  const actors = actorMap(data);
  return wowAuraSpans(data, [ICHOR]).flatMap((s) => {
    const a = actors.get(s.target);
    const p = a && poseAt(a, s.end);
    if (!p || s.end >= data.durationMs) return [];
    return [wowShape({ kind: "circle", x: p.x, y: p.y, range: 500, name: "Congealed Gore", start: s.end,
      resolve: Math.min(data.durationMs, s.end + GORE_MS), style: "va-twin-fangs-gore", noFlash: true })];
  });
}

/** Coiling Ichor on its carriers. */
function ichor(data: ReplayData): CasterEffect[] {
  return wowAuraSpans(data, [ICHOR]).map((s) => ({ kind: "va-twin-fangs-ichor", label: "Coiling Ichor", actor: s.target, x: 0, y: 0, start: s.start, end: s.end }));
}

export const TWIN_FANGS_REPLAY: FightReplay = {
  key: "va-twin-fangs",
  game: "wow",
  name: "The Twin Fangs",
  signature: [DELUGE, FEAST, STONE_BREAKER],
  hiddenHits: [FEAST_HIT],
  shapes: (data) => [...stoneBreaker(data), ...feast(data), ...spit(data), ...gore(data)],
  effects: (data) => [...globuleEffects(data), ...ichor(data)],
};
