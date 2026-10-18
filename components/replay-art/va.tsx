"use client";

// components/replay-art/va.tsx
//
// The Venomous Abyss's replay art (types.ts), one file for the raid's
// bosses (lib/mechanics/wow/va/<boss>-replay.ts). Kinds and styles are
// named "va-<boss>-...".
//
// CarrierRing: a debuff riding on its player, a ring in the debuff's
// colour around their icon with a few motes circling it, small enough to
// leave the player readable. `stackMs` adds a mote per stack (a debuff
// that grows on a clock, Vashnik's Exploding Infection).

import { rand } from "@/components/ReplayEffects";
import type { AoeColors, EffectArtProps, FightArt } from "./types";

const FADE_MS = 300;
const RING = 24;   // SVG units around a 1000-unit arena: just outside a player icon

type Ring = { color: string; glow: string; motes: number; stackMs?: number; maxMotes?: number; spinMs: number };

function CarrierRing({ e, x, y, t, ring }: EffectArtProps & { ring: Ring }) {
  const opacity = Math.max(0, Math.min(1, (t - e.start) / FADE_MS, (e.end - t) / FADE_MS));
  if (opacity <= 0) return null;
  const motes = ring.stackMs ? Math.min(ring.maxMotes ?? 12, 1 + Math.floor((t - e.start) / ring.stackMs)) : ring.motes;
  const spin = ((t - e.start) / ring.spinMs) * Math.PI * 2;
  const pulse = 1 + 0.08 * Math.sin(t / 180);
  return (
    <g opacity={opacity} pointerEvents="none">
      <circle cx={x} cy={y} r={RING * pulse} fill="none" stroke={ring.glow} strokeWidth={9} strokeOpacity={0.45} filter="url(#replay-glow)" />
      <circle cx={x} cy={y} r={RING * pulse} fill="none" stroke={ring.color} strokeWidth={2.5} />
      {Array.from({ length: motes }, (_, k) => {
        const a = spin + (k / motes) * Math.PI * 2;
        const wob = 1 + 0.15 * (rand(k * 3.7 + Math.floor(t / 250)) - 0.5);
        return <circle key={k} cx={x + Math.sin(a) * RING * wob} cy={y - Math.cos(a) * RING * wob} r={3} fill={ring.color} />;
      })}
    </g>
  );
}

const ring = (r: Ring) => function RingArt(p: EffectArtProps) { return <CarrierRing {...p} ring={r} />; };

// ── Vashnik ──
// Exploding Infection (Flame fountain, fire orange): a mote per stack, one
// every ~1.5s (vashnik.ts header). Stygian Infection (Shadow, purple).
const VASHNIK_EXPLODING = ring({ color: "#ff8a2a", glow: "#ff5a00", motes: 1, stackMs: 1500, maxMotes: 14, spinMs: 2400 });
const VASHNIK_STYGIAN = ring({ color: "#b07bff", glow: "#6a2bd9", motes: 4, spinMs: 3200 });
// Catalytic Bile: a plague-green soak circle (the Catalyst's Nature/plague
// colour; Plague Froth's lanes keep the standard red).
const VASHNIK_BILE: AoeColors = { fill: "#4fd14a", flash: "#a6ff8a", rim: "#d9ffc8", glow: "#2fae3a" };

export const VA_ART: FightArt = {
  effects: {
    "va-vashnik-exploding": VASHNIK_EXPLODING,
    "va-vashnik-stygian": VASHNIK_STYGIAN,
  },
  colors: {
    "va-vashnik-bile": VASHNIK_BILE,
  },
};
