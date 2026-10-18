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
import type { AoeColors, EffectArtProps, FightArt, ShapeArtProps } from "./types";

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

// ── The Coiled Altar ──

/**
 * A venom orb on the floor: a glossy blob that wobbles, green for
 * Coalesced Venom, purple for a Virulent Mutation (the guides' colours).
 * About 2y across: the orb itself, not its damage area.
 */
function VenomOrb({ e, x, y, t, scale }: EffectArtProps) {
  const purple = e.kind === "va-coiled-altar-mutation";
  const opacity = Math.max(0, Math.min(1, (t - e.start) / FADE_MS, (e.end - t) / FADE_MS));
  if (opacity <= 0) return null;
  const r = Math.max(7, 110 * scale);
  const k = (e.x * 7 + e.y * 3) % 97;
  const w = 1 + 0.07 * Math.sin(t / 260 + k);
  const [deep, mid, hot] = purple ? ["#5a1f9e", "#9d4dff", "#e3c4ff"] : ["#1f7a2a", "#56d64a", "#d6ffc4"];
  return (
    <g opacity={opacity} pointerEvents="none">
      <ellipse cx={x} cy={y} rx={r * 1.5 * w} ry={r * 1.5 / w} fill={mid} fillOpacity={0.3} filter="url(#replay-glow)" />
      <ellipse cx={x} cy={y} rx={r * w} ry={r / w} fill={deep} stroke={mid} strokeWidth={1.5} />
      <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.3} fill={hot} fillOpacity={0.7} />
    </g>
  );
}

/** A roaming axe where it struck a player: a spinning double-bladed axe. */
function Axe({ e, x, y, t }: EffectArtProps) {
  const opacity = Math.max(0, Math.min(1, (t - e.start) / 200, (e.end - t) / 400));
  if (opacity <= 0) return null;
  const a = (t / 4) % 360;
  return (
    <g opacity={opacity} transform={`translate(${x} ${y}) rotate(${a})`} pointerEvents="none">
      <line x1={0} y1={-13} x2={0} y2={13} stroke="#8a6a44" strokeWidth={3} />
      <path d="M0 -12 Q11 -14 12 -4 Q6 -6 0 -6 Z M0 -12 Q-11 -14 -12 -4 Q-6 -6 0 -6 Z" fill="#c9d0d6" stroke="#40484f" strokeWidth={1} />
    </g>
  );
}

const CA_FIXATE = ring({ color: "#c7b6ff", glow: "#5b3fbf", motes: 2, spinMs: 1600 });

// ── Entombed Sentinels ──

/** A Toxic Droplet: a small green bead, until a player collects it. */
function Droplet({ e, x, y, t, scale }: EffectArtProps) {
  const opacity = Math.max(0, Math.min(1, (t - e.start) / FADE_MS, (e.end - t) / 150));
  if (opacity <= 0) return null;
  const r = Math.max(5, 70 * scale);
  return (
    <g opacity={opacity} pointerEvents="none">
      <circle cx={x} cy={y} r={r * 1.8} fill="#7dff5a" fillOpacity={0.25} filter="url(#replay-glow)" />
      <path d={`M${x} ${y - r * 1.4} Q${x + r} ${y} ${x} ${y + r} Q${x - r} ${y} ${x} ${y - r * 1.4} Z`} fill="#4fd14a" stroke="#d6ffc4" strokeWidth={1} />
    </g>
  );
}

/** A Blood Venom pool: a dark red puddle that stays put. */
function BloodPool({ s, x, y, r, t }: ShapeArtProps) {
  const fade = Math.max(0, Math.min(1, (t - s.start) / 400, (s.resolve - t) / 800));
  const shimmer = 0.5 + 0.5 * Math.sin(t / 300 + x);
  return (
    <g opacity={fade} pointerEvents="none">
      <circle cx={x} cy={y} r={r} fill="#8a0f1c" fillOpacity={0.35 + 0.08 * shimmer} stroke="#d4283a" strokeWidth={1.5} strokeOpacity={0.8} />
    </g>
  );
}

const ES_PROTOVENOM = ring({ color: "#e05cff", glow: "#8a1fb0", motes: 3, spinMs: 2000 });

export const VA_ART: FightArt = {
  effects: {
    "va-vashnik-exploding": VASHNIK_EXPLODING,
    "va-vashnik-stygian": VASHNIK_STYGIAN,
    "va-coiled-altar-orb": VenomOrb,
    "va-coiled-altar-mutation": VenomOrb,
    "va-coiled-altar-axe": Axe,
    "va-coiled-altar-fixate": CA_FIXATE,
    "va-entombed-sentinels-droplet": Droplet,
    "va-entombed-sentinels-protovenom": ES_PROTOVENOM,
  },
  shapes: {
    "va-entombed-sentinels-pool": BloodPool,
  },
  colors: {
    "va-vashnik-bile": VASHNIK_BILE,
    // Orb carriers' pulse areas: green Volatile, purple Mutagenic.
    "va-coiled-altar-volatile": { fill: "#3fbf3a", flash: "#a6ff8a", rim: "#bff5b0", glow: "#2a8f2a" },
    "va-coiled-altar-mutagenic": { fill: "#8a3dff", flash: "#c99bff", rim: "#e2ccff", glow: "#6a2bd9" },
    // Gloombomb: Malacrass's shadow bomb.
    "va-coiled-altar-gloombomb": { fill: "#3b2a6b", flash: "#8f6bff", rim: "#b9a6ff", glow: "#2a1a5e" },
    // Living Venom: the acid line back to Breath.
    "va-entombed-sentinels-venom": { fill: "#6fe03a", flash: "#c8ff8a", rim: "#e4ffc8", glow: "#3a9e1a" },
  },
};
