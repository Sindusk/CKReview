// lib/mechanics/wow/va/entombed-sentinels-replay.ts
//
// Entombed Sentinels' replay spec (lib/replay/fight-spec.ts). Art in
// components/replay-art/va.tsx ("va-entombed-sentinels-..."). Built from
// the kill nHavrDhPVtBYkMXA fight 48 (4:22); review in
// docs/replay-reviews/va.md. Nothing here is VOD-checked yet.
//
// Not drawn: missed Toxic Droplets (an orb only shows where it was picked
// up), Helical Toxins (the fetch shows no 1284590 debuff, and WCL never
// shows the 1/2/3 count anyway), Ula'tek's Dominance range.

import type { AoeShape } from "@/lib/replay/action-shapes";
import type { CasterEffect, FightReplay } from "@/lib/replay/fight-spec";
import { poseAt, sampleNear, type ReplayData } from "@/lib/replay/ffxiv-replay";
import { actorMap, wowAuraSpans, wowCasts, wowCastTargetRings, wowShape } from "@/lib/replay/wow-helpers";

const DROPLETS = 1284434;          // Toxic Droplets cast: 20 orbs
const PICKUP = 1284451;            // an orb picked up: damage on the collector
const LIVING_VENOM = 1284209;      // the line from a pickup to Breath, 4.0s later
const VENOM_DELAY_MS = 4000;
const MIASMA_MARK = 1288260;       // 8.5s on the target; split hit 1288282 (db2 7.5y)
const MIASMA_HIT = 1288282;
const MURK = 1288297;              // on Miasma's soakers; a Blood Venom pool where it ends
const BLIGHTED = 1284471;          // dispellable; a pool if it runs its 18s
const INJECTION_DOT = 1284491;     // the Blood tank's DoT; a pool when it ends
const PROTOVENOM = 1296880;        // Mythic: 8 players, pair two marked to clear
const EMPOWERING_SLAM = 1284458, BLOODVENOM_INJECTION = 1284487;
const POOL_RADIUS = 400;           // centi-yards; owners' first ticks land 0-5y from the drop spot
const POOL_MS = 60000;             // assumed: the log shows players entering pools 35-47s old

/**
 * Toxic Droplets: each picked-up orb from the cast to its pickup, at the
 * collector's spot; then Living Venom's line from there to Breath, shown
 * for the 4s until it fires. Kill: the hits sit within 1.6y of a
 * pickup->Breath line and land within ~50ms of +4.0s along its whole
 * length (52y out at +16ms), so it's a line that fires at once, not a
 * travelling bolt.
 */
function droplets(data: ReplayData): { orbs: CasterEffect[]; lanes: AoeShape[] } {
  const actors = actorMap(data);
  const casts = wowCasts(data, [DROPLETS]);
  const breath = data.actors.find((a) => a.name === "Breath of Ula'tek");
  const orbs: CasterEffect[] = [], lanes: AoeShape[] = [];
  for (const h of (data.enemyHits ?? []).filter((x) => x[1] === PICKUP)) {
    const a = actors.get(h[3]);
    const p = h[6] !== null && h[7] !== null ? { x: h[6], y: h[7] } : a && poseAt(a, h[0]);
    if (!p) continue;
    const cast = casts.filter((c) => c.t <= h[0] && h[0] - c.t < 16000).pop();
    if (cast) orbs.push({ kind: "va-entombed-sentinels-droplet", layer: "floor", label: "Toxic Droplet", x: p.x, y: p.y, start: cast.t, end: h[0] });
    const launch = h[0] + VENOM_DELAY_MS;
    const b = breath && sampleNear(breath, launch, 2000);
    if (!b) continue;
    const bearing = ((Math.atan2(b.x - p.x, -(b.y - p.y)) * 180) / Math.PI + 360) % 360;
    lanes.push(wowShape({ kind: "rect", x: p.x, y: p.y, bearing, range: Math.hypot(b.x - p.x, b.y - p.y), width: 300,
      name: "Living Venom", start: h[0], resolve: launch, style: "va-entombed-sentinels-venom" }));
  }
  return { orbs, lanes };
}

/**
 * Blood Venom pools: under each player whose Clinging Murk ends, whose
 * Blighted Blood runs its full 18s (not dispelled), or whose Bloodvenom
 * Injection DoT ends (header). The first tick lands ~1.05s after.
 */
function pools(data: ReplayData): AoeShape[] {
  const actors = actorMap(data);
  const out: AoeShape[] = [];
  for (const s of wowAuraSpans(data, [MURK, BLIGHTED, INJECTION_DOT])) {
    if (s.end >= data.durationMs) continue;
    if (s.id === BLIGHTED && s.end - s.start < 17500) continue;   // dispelled
    const a = actors.get(s.target);
    const p = a && poseAt(a, s.end);
    if (!p) continue;
    out.push(wowShape({ kind: "circle", x: p.x, y: p.y, range: POOL_RADIUS, name: "Blood Venom",
      start: s.end, resolve: s.end + POOL_MS, style: "va-entombed-sentinels-pool", noFlash: true }));
  }
  return out;
}

/** Unstable Miasma: the soak circle on its target until the split hit lands. */
function miasma(data: ReplayData): AoeShape[] {
  const hits = (data.enemyHits ?? []).filter((h) => h[1] === MIASMA_HIT);
  return wowAuraSpans(data, [MIASMA_MARK]).map((s) => {
    const land = hits.find((h) => h[0] >= s.start)?.[0];
    return wowShape({ kind: "circle", x: 0, y: 0, range: 750, name: "Unstable Miasma", start: s.start,
      resolve: land !== undefined && land < s.end + 2000 ? land : s.end, follow: s.target, style: "stack" });
  });
}

/** Shifting Protovenom: a ring on each marked player until they pair up. */
function protovenom(data: ReplayData): CasterEffect[] {
  return wowAuraSpans(data, [PROTOVENOM]).map((s) => ({
    kind: "va-entombed-sentinels-protovenom", label: "Shifting Protovenom", actor: s.target, x: 0, y: 0, start: s.start, end: s.end,
  }));
}

export const ENTOMBED_SENTINELS_REPLAY: FightReplay = {
  key: "va-entombed-sentinels",
  game: "wow",
  name: "Entombed Sentinels",
  signature: [DROPLETS, 1284606, 1284588],
  hiddenHits: [
    1284500, 1284506,   // Mark of Acid / Blood: 40y around each boss every tick, not an AoE to dodge
    LIVING_VENOM,       // the lanes
    MIASMA_HIT,         // the soak circle
  ],
  shapes: (data) => [
    ...droplets(data).lanes,
    ...pools(data),
    ...miasma(data),
    ...wowCastTargetRings(data, [EMPOWERING_SLAM], "Empowering Slam", 3),
    ...wowCastTargetRings(data, [BLOODVENOM_INJECTION], "Bloodvenom Injection", 3),
  ],
  effects: (data) => [...droplets(data).orbs, ...protovenom(data)],
};
