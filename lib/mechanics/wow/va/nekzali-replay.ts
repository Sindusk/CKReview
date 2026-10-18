// lib/mechanics/wow/va/nekzali-replay.ts
//
// Nek'zali the Soulcoiler's replay spec (lib/replay/fight-spec.ts). Art in
// components/replay-art/va.tsx ("va-nekzali-..."). Built from the kill
// vRPGT4MN6VALQWFh fight 7 (4:22); review in docs/replay-reviews/va.md.
// Nothing here is VOD-checked yet.
//
// THE WELL. The Soulcoil Well has no actor in the replay, but the four
// Ritual Drummers stand symmetrically around it (their one sample each:
// x ±45-47, y -168/-245) and an Amani that reached it in the kill stood at
// (0, -207) at 2:38 (Restless Amani 5, alive at 74%). So the well is the
// drummers' middle. Its radius isn't in the log: WELL_RADIUS is a guess.
// Grasping Depths windows (when the Mythic team may enter) are read from
// its raid ticks (1293214): 0:43-1:25, 2:10-2:45, 3:14-4:21 in the kill.
//
// Not drawn: the Drowned Echo and Soulcoiler's Curse (inside the well, no
// positions), Latent Cultist pools after an Invoke moves them (their new
// spot isn't logged, so a pool is drawn only until the next Invoke).

import type { AoeShape } from "@/lib/replay/action-shapes";
import type { CasterEffect, FightReplay } from "@/lib/replay/fight-spec";
import { poseAt, sampleNear, type ReplayData } from "@/lib/replay/ffxiv-replay";
import { actorMap, wowAuraSpans, wowCasts, wowImpacts, wowShape } from "@/lib/replay/wow-helpers";

const WELL_RADIUS = 800;            // centi-yards, assumed
const GRASPING_TICK = 1293214;      // Grasping Depths raid ticks while the well is open
const ADVANCE = 1287533;            // Gravebound Advance: an Amani (re)spawns
const SLITHERING = 1294933;         // 8s; its expiry is Cremation, which burns corpses within 4y
const CREMATION_YARDS = 4;
const PYRE = 1289855;               // Hungering Pyre: 7.5s cast, split among players within 10y
const REND_KNOCK = 1287434;         // Essence Rend's knockback debuff; a Latent Cultist pool where it ends
const INVOKE = 1299673;
const SOUL_TRANSFER = 1292248;      // the Echo's 15s beam to the well
const BEAM_WIDTH = 1000;            // kill: the 4 victims stood 0-6.4y off the Echo->well line
const BARRAGE = 1284103;            // Possession Barrage: 6s, echoes fly to the tank
const SIGNATURE = [1285681, 1295124, ADVANCE];

/** The well's centre: the middle of the Ritual Drummers. */
function wellAt(data: ReplayData): { x: number; y: number } | undefined {
  const drums = data.actors.filter((a) => a.name.startsWith("Ritual Drummer") && a.samples.length);
  if (drums.length < 3) return undefined;
  return {
    x: drums.reduce((s, a) => s + a.samples[0][1], 0) / drums.length,
    y: drums.reduce((s, a) => s + a.samples[0][2], 0) / drums.length,
  };
}

/** The well all pull (floor), glowing open while Grasping Depths ticks (gaps under 5s join). */
function well(data: ReplayData): CasterEffect[] {
  const w = wellAt(data);
  if (!w) return [];
  const out: CasterEffect[] = [{ kind: "va-nekzali-well", layer: "floor", label: "Soulcoil Well", radius: WELL_RADIUS, x: w.x, y: w.y, start: 0, end: data.durationMs }];
  const ticks = (data.enemyHits ?? []).filter((h) => h[1] === GRASPING_TICK).map((h) => h[0]);
  let from = ticks[0], last = ticks[0];
  for (const t of [...ticks.slice(1), Infinity]) {
    if (t - last > 5000) {
      out.push({ kind: "va-nekzali-well-open", layer: "floor", label: "Grasping Depths", radius: WELL_RADIUS, x: w.x, y: w.y, start: from, end: last });
      from = t;
    }
    last = t;
  }
  return out;
}

/**
 * Restless Amani corpses (Vessels of Awakening): where each Amani died,
 * until a Slithering Flame expires within 4y of it (Cremation burns it), it
 * rises again (a new Gravebound Advance from the same actor), or the pull
 * ends.
 */
function corpses(data: ReplayData): CasterEffect[] {
  const actors = actorMap(data);
  const burns = wowAuraSpans(data, [SLITHERING]).map((s) => {
    const a = actors.get(s.target);
    return { t: s.end, p: a && poseAt(a, s.end) };
  });
  const rises = wowCasts(data, [ADVANCE]);
  const out: CasterEffect[] = [];
  for (const a of data.actors.filter((x) => x.name.startsWith("Restless Amani"))) {
    const dead = a.samples.find((s) => s[4] === 0);
    if (!dead) continue;
    let end = data.durationMs;
    const rise = rises.find((c) => c.caster === a.key && c.t > dead[0]);
    if (rise) end = rise.t;
    for (const b of burns) {
      if (b.t > dead[0] && b.t < end && b.p && Math.hypot(b.p.x - dead[1], b.p.y - dead[2]) <= CREMATION_YARDS * 100) end = b.t;
    }
    out.push({ kind: "va-nekzali-corpse", layer: "floor", label: "Vessel of Awakening", x: dead[1], y: dead[2], start: dead[0], end });
  }
  return out;
}

/** Slithering Flame: an orange ring on each carrier for its 8s. */
function slithering(data: ReplayData): CasterEffect[] {
  return wowAuraSpans(data, [SLITHERING]).map((s) => ({
    kind: "va-nekzali-flame", label: "Slithering Flame", actor: s.target, x: 0, y: 0, start: s.start, end: s.end,
  }));
}

/** Hungering Pyre: the 10y soak where it landed, shown from its 7.5s cast. */
function pyre(data: ReplayData): AoeShape[] {
  const casts = wowCasts(data, [PYRE]);
  return wowImpacts(data, [PYRE], 10, 400).map((i) => {
    const c = casts.filter((x) => x.t <= i.t + 300).pop();
    return wowShape({ kind: "circle", x: i.x, y: i.y, range: 1000, name: "Hungering Pyre", start: c?.begin ?? i.t - 2000, resolve: i.t, style: "stack" });
  });
}

/** Latent Cultist pools: where each Essence Rend knockback ended, until the next Invoke moves them. */
function cultists(data: ReplayData): AoeShape[] {
  const actors = actorMap(data);
  const invokes = wowCasts(data, [INVOKE]).map((c) => c.t);
  return wowAuraSpans(data, [REND_KNOCK]).flatMap((s) => {
    const a = actors.get(s.target);
    const p = a && poseAt(a, s.end);
    if (!p || s.end >= data.durationMs) return [];
    const moved = invokes.find((t) => t > s.end);
    return [wowShape({ kind: "circle", x: p.x, y: p.y, range: 600, name: "Latent Cultist", start: s.end,
      resolve: moved ?? data.durationMs, style: "va-nekzali-cultist", noFlash: true })];
  });
}

/** Soul Transfer: the Echo's beam to the well, for its 15s cast; it one-shots anyone in it. */
function soulTransfer(data: ReplayData): AoeShape[] {
  const w = wellAt(data);
  const actors = actorMap(data);
  if (!w) return [];
  return wowCasts(data, [SOUL_TRANSFER]).flatMap((c) => {
    const e = actors.get(c.caster);
    const p = e && sampleNear(e, c.t, 3000);
    if (!p) return [];
    const bearing = ((Math.atan2(w.x - p.x, -(w.y - p.y)) * 180) / Math.PI + 360) % 360;
    return [wowShape({ kind: "rect", x: p.x, y: p.y, bearing, range: Math.hypot(w.x - p.x, w.y - p.y), width: BEAM_WIDTH,
      name: "Soul Transfer", start: c.begin ?? c.t - 15000, resolve: c.t, style: "va-nekzali-beam" })];
  });
}

/** Possession Barrage: a ring on the tank the echoes fly to, for the 6s cast. */
function barrage(data: ReplayData): CasterEffect[] {
  return wowCasts(data, [BARRAGE]).filter((c) => c.target).map((c) => ({
    kind: "va-nekzali-barrage", label: "Possession Barrage", actor: c.target, x: 0, y: 0, start: c.begin ?? c.t - 6000, end: c.t,
  }));
}

export const NEKZALI_REPLAY: FightReplay = {
  key: "va-nekzali",
  game: "wow",
  name: "Nek'zali the Soulcoiler",
  signature: SIGNATURE,
  hiddenHits: [PYRE, 1295085 /* Soul Transfer hits: the beam */],
  shapes: (data) => [...pyre(data), ...cultists(data), ...soulTransfer(data)],
  effects: (data) => [...well(data), ...corpses(data), ...slithering(data), ...barrage(data)],
};
