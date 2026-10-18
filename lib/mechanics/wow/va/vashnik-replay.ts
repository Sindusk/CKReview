// lib/mechanics/wow/va/vashnik-replay.ts
//
// Vashnik's replay spec (lib/replay/fight-spec.ts): what WCL's data can't
// link (lib/replay/wow-shapes.ts draws the rest from db2 radii and hits).
// Art in components/replay-art/va.tsx ("va-vashnik-..."). Built from the
// kills 19WyTrzgQRvdc4Z8 fight 5 (6:24) and phzkLrdNBgtfCmW9 fight 54
// (4:31, the first saved with every debuff); review in
// docs/replay-reviews/va.md. Nothing here is VOD-checked yet.
//
// Not drawn, and why:
//   - Malignant Totems (Malignance 1304459): the totems log no position
//     until one completes its 85s cast, and a wave clears them without an
//     event (vashnik.ts header), so neither where they stand nor which
//     lane cleared them can be shown.
//   - Malignant Catalyst's orb over the cavity, and the fountains: the
//     cavity and fountains have no actor or position in the log.
//   - An unsoaked Catalytic Bile (1282616): its raid-wide penalty carries
//     no impact spot; it shows only as the room-wide label.
//   - Stygian Burst (1302489): lands 5-40y from its holder, so the hit
//     circles (db2 3.5y, placed by who it hit) stay as they are.

import type { AoeShape } from "@/lib/replay/action-shapes";
import type { CasterEffect, FightReplay } from "@/lib/replay/fight-spec";
import type { ReplayData } from "@/lib/replay/ffxiv-replay";
import { wowAuraSpans, wowCasts, wowImpacts, wowShape } from "@/lib/replay/wow-helpers";

const CATALYST = 1282516;        // the second Malignant Catalyst cast: launches the Bile
const BILE_SOAK = 1282602;       // a soaker's Catalytic Bile hit (db2 6y)
const BILE_MS = 7000;            // cast to impact: 7.0-7.1s in all 15 volleys of both kills
const DRIPPING_FANGS = 1280935;  // 2s cast on the active tank
const EXPLODING = 1295173;       // Flame infection: a raid-wide Caustic Explosion when it goes
const STYGIAN = 1294994;         // Shadow infection: the holder throws Stygian Bursts until healed

/**
 * Catalytic Bile: every soaked impact shown as a green soak circle for the
 * whole 7s from the Catalyst cast, at the spot its soakers stood when it
 * landed (the log has no telegraph; an impact nobody soaked isn't drawn).
 * Soakers 1-3 yards apart can share one impact, so impacts merge only
 * within 3y. Both kills: 4-5 impacts a volley, 1 soaker each, as the
 * header says.
 */
function bile(data: ReplayData): AoeShape[] {
  const casts = wowCasts(data, [CATALYST]);
  const out: AoeShape[] = [];
  for (const i of wowImpacts(data, [BILE_SOAK], 6, 1500, 3)) {
    const cast = casts.filter((c) => c.t <= i.t && i.t - c.t <= BILE_MS + 1000).pop();
    out.push(wowShape({ kind: "circle", x: i.x, y: i.y, range: 600, name: "Catalytic Bile",
      start: cast ? cast.t : i.t - 2000, resolve: i.t, style: "va-vashnik-bile" }));
  }
  return out;
}

/** Dripping Fangs: a tankbuster ring on its tank for the 2s cast. */
function fangs(data: ReplayData): AoeShape[] {
  return wowCasts(data, [DRIPPING_FANGS]).filter((c) => c.target).map((c) =>
    wowShape({ kind: "circle", x: 0, y: 0, range: 300, name: "Dripping Fangs", start: c.begin ?? c.t - 2000, resolve: c.t,
      follow: c.target, style: "tankbuster", estimated: false }));
}

/**
 * The infections, on their carriers for as long as they last: Exploding
 * (Flame, orange, grows a stack every ~1.5s; its end is a raid-wide
 * explosion) and Stygian (Shadow, purple; the carrier's bursts land around
 * them). Kill phzkLrdNBgtfCmW9 fight 54: 24 of each, first at 0:43.9.
 */
function infections(data: ReplayData): CasterEffect[] {
  return wowAuraSpans(data, [EXPLODING, STYGIAN]).map((s) => ({
    kind: s.id === EXPLODING ? "va-vashnik-exploding" : "va-vashnik-stygian",
    label: s.id === EXPLODING ? "Exploding Infection" : "Stygian Infection",
    actor: s.target, x: 0, y: 0, start: s.start, end: s.end,
  }));
}

export const VASHNIK_REPLAY: FightReplay = {
  key: "va-vashnik",
  game: "wow",
  name: "Vashnik",
  signature: [CATALYST, DRIPPING_FANGS, 1284663],
  // Plague Froth: the 6s debuff 1281913 is a scripted aura with no db2 link
  // to its tick 1281925 (4.5y, centred on the carrier). At expiry the
  // carrier sends Plague Waves along the four world axes, ~2.5y either side
  // of the lane, travelling ~13y/s (vashnik.ts header).
  wowAuraShapes: {
    1281913: { spell: 1281925, name: "Plague Froth", onRemove: "axis-lanes" },
  },
  // Hits drawn some other way, so not as hit circles.
  hiddenHits: [
    1281925,   // Plague Froth ticks: the carrier's aura circle
    1295798,   // Plague Wave: the lanes
    BILE_SOAK, // Catalytic Bile: bile(), from the cast
  ],
  shapes: (data) => [...bile(data), ...fangs(data)],
  effects: (data) => infections(data),
};
