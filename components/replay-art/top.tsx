"use client";

// components/replay-art/top.tsx
//
// The Omega Protocol's replay art (types.ts), for the cues built in
// lib/mechanics/ffxiv/top/replay.ts.
//
// BlasterTether: Program Loop's Blaster tether (89), Omega to its holder.
// No guide describes its look in text; drawn as a plain crimson beam with
// pulses running to the holder, so it reads apart from the pink generic
// tethers. A VOD check (docs/replay-reviews/top.md).

import type { FightArt, ShapeArtProps, TetherArtProps } from "./types";

const BLASTER = { glow: "#ff3355", core: "#ffd0d8", deep: "#a0102a" };

function BlasterTether({ x1, y1, x2, y2, t }: TetherArtProps) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 1) return null;
  const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
  return (
    <g pointerEvents="none">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={BLASTER.glow} strokeWidth={12} strokeOpacity={0.4} strokeLinecap="round" filter="url(#replay-glow)" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={BLASTER.deep} strokeWidth={5} strokeLinecap="round" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={BLASTER.core} strokeWidth={2} strokeLinecap="round" />
      {Array.from({ length: 3 }, (_, k) => {
        // Pulses running from Omega to the holder. The log's source end
        // (x1, y1) is the holder (player -> Omega), so they run backward.
        const f = 1 - (((t / 1100) + k / 3) % 1);
        return <circle key={k} cx={x1 + ux * len * f} cy={y1 + uy * len * f} r={3.5} fill={BLASTER.core} stroke={BLASTER.glow} strokeWidth={1.5} />;
      })}
      <circle cx={x1} cy={y1} r={6} fill={BLASTER.glow} stroke={BLASTER.core} strokeWidth={2} />
    </g>
  );
}

/**
 * Pantokrator's Ballistic Impact puddles: eight at a time, two waves
 * overlapping, under the players. Drawn as rings with a faint fill so the
 * players and the Flame Thrower cones stay readable; the ring closes in
 * as the cast bar runs, and the circle flashes as it lands.
 */
function BallisticPuddle({ s, x, y, r, t, opacity, resolving }: ShapeArtProps) {
  const f = Math.max(0, Math.min(1, (t - s.start) / Math.max(1, s.resolve - s.start)));
  return (
    <g opacity={opacity} pointerEvents="none">
      <circle cx={x} cy={y} r={r} fill="#ff5a36" fillOpacity={resolving ? 0.45 : 0.1} stroke="#ffb199" strokeWidth={2} strokeOpacity={0.9} />
      {!resolving && <circle cx={x} cy={y} r={r * (1 - f)} fill="none" stroke="#ff5a36" strokeWidth={1.5} strokeOpacity={0.7} />}
    </g>
  );
}

export const TOP_ART: FightArt = {
  tethers: { "top-blaster": BlasterTether },
  shapes: { "top-ballistic": BallisticPuddle },
};
