// lib/mechanics/wow/va/vashnik-replay.ts
//
// Vashnik's replay spec (lib/replay/fight-spec.ts): what WCL's data can't
// link (lib/replay/wow-shapes.ts draws the rest from db2 radii and hits).
// Art, if any, is in components/replay-art/va.tsx.

import type { FightReplay } from "@/lib/replay/fight-spec";

export const VASHNIK_REPLAY: FightReplay = {
  key: "va-vashnik",
  game: "wow",
  name: "Vashnik",
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
  ],
};
