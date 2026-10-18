// lib/mechanics/wow/va/coiled-altar-replay.ts
//
// The Coiled Altar's replay spec (lib/replay/fight-spec.ts). Art in
// components/replay-art/va.tsx ("va-coiled-altar-..."). Built from the kill
// vRPGT4MN6VALQWFh fight 38 (8:20); review in docs/replay-reviews/va.md.
// Nothing here is VOD-checked yet.
//
// ORBS. Every Coalesced Venom (green) and Virulent Mutation (purple) orb is
// its own actor ("Coalesced Venom Stalker", "Virulent Mutation") whose only
// sample is its spawn, from its 1282403 / 1309742 cast: 3s after Toxic
// Deluge, and again wherever a carrier's Volatile Venom 1282419 / Mutagenic
// Venom 1310498 runs out (the drop, same millisecond). So an orb lives
// from its spawn until (in this order of checks):
//   - a player picks it up: the carrier debuff goes on within PICKUP_YARDS;
//     the nearest orb of that colour ends;
//   - a Sever / Blighted Sever cone covers it at the cast (60° assumed,
//     db2 35y / 45y, aimed at the tank it hit);
//   - Venom Rupture lands on the raid away from a Sever (Zul'jan's defeat
//     clears every orb, header): all orbs end.
// Kill check: orbs ended by each Sever vs Venom Rupture stacks at that
// millisecond is in docs/replay-reviews/va.md.

import type { AoeShape } from "@/lib/replay/action-shapes";
import type { CasterEffect, FightReplay } from "@/lib/replay/fight-spec";
import { poseAt, sampleNear, type ReplayData } from "@/lib/replay/ffxiv-replay";
import { actorMap, wowAuraSpans, wowCasts, wowShape } from "@/lib/replay/wow-helpers";
import { facingToCompassBearing } from "@/lib/mechanics/geometry";

const DELUGE = 1299960;
const ORB_CAST = 1282403;          // Coalesced Venom: a green orb appears (its stalker's spawn)
const MUTATION_CAST = 1309742;     // Virulent Mutation: a purple orb appears
const VOLATILE = 1282419;          // carrying a green orb, 5s; pulses 1282288 (db2 5y)
const MUTAGENIC = 1310498;         // carrying a purple orb, 5s; pulses 1310691 (db2 6y)
const SEVER = 1299684;             // stage 1 tank frontal, db2 35y cone
const BLIGHTED_SEVER = 1307292;    // stage 3, db2 45y cone
const SOUL_SEVER = 1286620;        // stage 2 (Malacrass), db2 45y cone
const RUPTURE = 1299838;           // a stack per destroyed orb on every player
const GUILLOTINE_MARK = 1283485, GUILLOTINE_HIT = 1283594;           // 9y, 5+ soakers
const GRIM_MARK = 1299266, GRIM_HIT = 1299296;                       // stage 3, 9y
const GLOOMBOMB_MARK = 1310881, GLOOMBOMB_HIT = 1310883;             // 5s mark, db2 15y
const FIXATION = 1285911;          // a Manifestation of Dread is fixated on this player
const AXE_HIT = 1285017;           // a roaming axe struck this player (cast by the axe actor)
const PICKUP_YARDS = 6;
const RUPTURE_TICK_MS = 2000;
const CONE_ANGLE = 60;

type Orb = { purple: boolean; x: number; y: number; start: number; end: number };
type Sever = { t: number; begin?: number; x: number; y: number; bearing: number; range: number; id: number; hit: boolean };

/**
 * Every Sever / Blighted Sever: from Zul'jan toward the tank it hit, or
 * along his facing when it hit nobody (the kill's last Blighted Sever,
 * 7:54.3, with 4 orbs out).
 */
function severs(data: ReplayData): Sever[] {
  const actors = actorMap(data);
  const out: Sever[] = [];
  for (const c of wowCasts(data, [SEVER, BLIGHTED_SEVER])) {
    const boss = actors.get(c.caster);
    const b = boss && sampleNear(boss, c.t, 3000);
    if (!b) continue;
    const h = (data.enemyHits ?? []).find((x) => x[1] === c.id && Math.abs(x[0] - c.t) <= 500);
    const tank = h && actors.get(h[3]);
    const p = tank && poseAt(tank, h![0]);
    const bearing = p ? (Math.atan2(p.x - b.x, -(p.y - b.y)) * 180) / Math.PI : facingToCompassBearing(b.facing);
    out.push({ t: h ? h[0] : c.t, begin: c.begin, x: b.x, y: b.y, bearing, range: (c.id === SEVER ? 35 : 45) * 100, id: c.id, hit: !!p });
  }
  return out;
}

/** The Severs that hit nobody, which the engine (placing cones by hits) can't draw. */
function unhitSevers(data: ReplayData): AoeShape[] {
  return severs(data).filter((s) => !s.hit).map((s) => wowShape({ kind: "cone", x: s.x, y: s.y, bearing: s.bearing,
    range: s.range, angle: CONE_ANGLE, name: s.id === SEVER ? "Sever" : "Blighted Sever", start: s.begin ?? s.t - 3000, resolve: s.t }));
}

/** Every orb's spot and lifetime (see the header). */
export function coiledAltarOrbs(data: ReplayData): Orb[] {
  const actors = actorMap(data);
  const orbs: Orb[] = [];
  for (const c of wowCasts(data, [ORB_CAST, MUTATION_CAST])) {
    const s = actors.get(c.caster)?.samples[0];
    if (s) orbs.push({ purple: c.id === MUTATION_CAST, x: s[1], y: s[2], start: c.t, end: data.durationMs });
  }
  type Ev = { t: number; f: () => void };
  const evs: Ev[] = [];
  const live = (t: number) => orbs.filter((o) => o.start <= t && o.end > t);
  for (const sp of wowAuraSpans(data, [VOLATILE, MUTAGENIC])) {
    evs.push({ t: sp.start, f: () => {
      const a = actors.get(sp.target);
      const p = a && poseAt(a, sp.start);
      if (!p) return;
      const near = live(sp.start).filter((o) => o.purple === (sp.id === MUTAGENIC))
        .map((o) => ({ o, d: Math.hypot(o.x - p.x, o.y - p.y) })).sort((x, y) => x.d - y.d)[0];
      if (near && near.d <= PICKUP_YARDS * 100) near.o.end = sp.start;
    } });
  }
  // Sever cones: from Zul'jan toward the tank they hit.
  const severAt = new Set<number>();
  for (const s of severs(data)) {
    severAt.add(s.t);
    evs.push({ t: s.t, f: () => {
      for (const o of live(s.t)) {
        const d = Math.hypot(o.x - s.x, o.y - s.y);
        const brg = (Math.atan2(o.x - s.x, -(o.y - s.y)) * 180) / Math.PI;
        if (d <= s.range && Math.abs(((brg - s.bearing) % 360 + 540) % 360 - 180) <= CONE_ANGLE / 2) o.end = s.t;
      }
    } });
  }
  // Venom Rupture on the raid away from any Sever: every orb popped at once.
  const ruptureTimes = new Map<number, number>();
  for (const h of data.enemyHits ?? []) if (h[1] === RUPTURE) ruptureTimes.set(h[0], (ruptureTimes.get(h[0]) ?? 0) + 1);
  // Its ticks land every 2s after the hit that applied it, on everyone at
  // once too, so a burst on a 2s beat from an earlier Sever or pop is a tick.
  const sources = [...severAt];
  const onBeat = (t: number) => sources.some((s) => {
    const k = Math.round((t - s) / RUPTURE_TICK_MS);
    return k >= 1 && k <= 6 && Math.abs(t - s - k * RUPTURE_TICK_MS) <= 150;
  });
  for (const [t, n] of [...ruptureTimes].sort((a, b) => a[0] - b[0])) {
    if (n < 10 || sources.some((s) => Math.abs(s - t) < 500) || onBeat(t)) continue;
    sources.push(t);
    evs.push({ t, f: () => { for (const o of live(t)) o.end = t; } });
  }
  evs.sort((a, b) => a.t - b.t);
  for (const e of evs) e.f();
  return orbs;
}

function orbEffects(data: ReplayData): CasterEffect[] {
  return coiledAltarOrbs(data).map((o) => ({
    kind: o.purple ? "va-coiled-altar-mutation" : "va-coiled-altar-orb",
    layer: "floor" as const, label: o.purple ? "Virulent Mutation" : "Coalesced Venom",
    x: o.x, y: o.y, start: o.start, end: o.end,
  }));
}

/** Toxic Deluge: each orb's landing spot shown from the cast until the orb appears (3s). */
function delugeDrops(data: ReplayData): AoeShape[] {
  const deluges = wowCasts(data, [DELUGE]);
  const out: AoeShape[] = [];
  for (const o of coiledAltarOrbs(data)) {
    const cast = deluges.filter((c) => c.t <= o.start && o.start - c.t <= 4000).pop();
    if (cast) out.push(wowShape({ kind: "circle", x: o.x, y: o.y, range: 400, name: "Toxic Deluge", start: cast.t, resolve: o.start, style: "drop" }));
  }
  return out;
}

/** A circle riding on each debuffed player until it ends (or `hit` lands on them). */
function carried(data: ReplayData, mark: number, range: number, name: string, style: string, hit?: number, noFlash = false): AoeShape[] {
  const hits = hit ? (data.enemyHits ?? []).filter((h) => h[1] === hit) : [];
  return wowAuraSpans(data, [mark]).map((s) => {
    const land = hits.find((h) => h[0] >= s.start)?.[0];
    const end = land !== undefined && land < s.end + 2000 ? land : s.end;
    return wowShape({ kind: "circle", x: 0, y: 0, range, name, start: s.start, resolve: end, follow: s.target, style, noFlash });
  });
}

/** Where a roaming axe struck a player: an axe glyph there for a moment. */
function axes(data: ReplayData): CasterEffect[] {
  const actors = actorMap(data);
  const out: CasterEffect[] = [];
  for (const c of wowCasts(data, [AXE_HIT])) {
    const s = actors.get(c.caster)?.samples.find((x) => Math.abs(x[0] - c.t) < 300);
    if (s) out.push({ kind: "va-coiled-altar-axe", label: "Axegrinder", x: s[1], y: s[2], start: c.t - 600, end: c.t + 900 });
  }
  return out;
}

function fixations(data: ReplayData): CasterEffect[] {
  return wowAuraSpans(data, [FIXATION]).map((s) => ({
    kind: "va-coiled-altar-fixate", label: "Unnerving Fixation", actor: s.target, x: 0, y: 0, start: s.start, end: s.end,
  }));
}

export const COILED_ALTAR_REPLAY: FightReplay = {
  key: "va-coiled-altar",
  game: "wow",
  name: "The Coiled Altar",
  signature: [DELUGE, SEVER, ORB_CAST],
  overrides: {
    [SEVER]: { angle: CONE_ANGLE },
    [BLIGHTED_SEVER]: { angle: CONE_ANGLE },
    [SOUL_SEVER]: { angle: CONE_ANGLE },
  },
  hiddenHits: [
    1282288, 1310691,              // carrier pulses: the carrier circles
    GUILLOTINE_HIT, GRIM_HIT,      // the mark circles
    GLOOMBOMB_HIT,                 // the bomb circles
  ],
  shapes: (data) => [
    ...delugeDrops(data),
    ...unhitSevers(data),
    ...carried(data, VOLATILE, 500, "Volatile Venom", "va-coiled-altar-volatile", undefined, true),
    ...carried(data, MUTAGENIC, 600, "Mutagenic Venom", "va-coiled-altar-mutagenic", undefined, true),
    ...carried(data, GUILLOTINE_MARK, 900, "Guillotine", "stack", GUILLOTINE_HIT),
    ...carried(data, GRIM_MARK, 900, "Grim Guillotine", "stack", GRIM_HIT),
    ...carried(data, GLOOMBOMB_MARK, 1500, "Gloombomb", "va-coiled-altar-gloombomb", GLOOMBOMB_HIT),
  ],
  effects: (data) => [...orbEffects(data), ...axes(data), ...fixations(data)],
};
