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

/** A ground pool that stays put: a flat shimmering disc in its colours, no flash. */
const pool = (fill: string, rim: string) => function Pool({ s, x, y, r, t }: ShapeArtProps) {
  const fade = Math.max(0, Math.min(1, (t - s.start) / 400, (s.resolve - t) / 800));
  const shimmer = 0.5 + 0.5 * Math.sin(t / 300 + x);
  return (
    <g opacity={fade} pointerEvents="none">
      <circle cx={x} cy={y} r={r} fill={fill} fillOpacity={0.35 + 0.08 * shimmer} stroke={rim} strokeWidth={1.5} strokeOpacity={0.8} />
    </g>
  );
};

/** A Blood Venom pool: dark red. */
const BloodPool = pool("#8a0f1c", "#d4283a");

const ES_PROTOVENOM = ring({ color: "#e05cff", glow: "#8a1fb0", motes: 3, spinMs: 2000 });

// ── The Lost Explorers ──

/**
 * Mor'zahi's Final Ascension clock: a ring around him that fills clockwise
 * over the 60s charge, then flashes red through the 5s cast. It ends when a
 * fed explorer's Command stops it.
 */
function AscensionClock({ e, x, y, t, scale }: EffectArtProps) {
  const r = Math.max(18, (e.radius ?? 400) * scale);
  const f = Math.min(1, (t - e.start) / 60000);
  const casting = t - e.start > 60000;
  const a = f * Math.PI * 2;
  const end = { x: x + Math.sin(a) * r, y: y - Math.cos(a) * r };
  const color = casting ? "#ff3b3b" : f > 0.85 ? "#ffb02e" : "#c9a8ff";
  return (
    <g pointerEvents="none">
      <circle cx={x} cy={y} r={r} fill="none" stroke="#000" strokeOpacity={0.45} strokeWidth={6} />
      {f >= 1 ? <circle cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={5} opacity={casting ? 0.6 + 0.4 * Math.sin(t / 80) : 1} />
        : <path d={`M${x} ${y - r} A${r} ${r} 0 ${a > Math.PI ? 1 : 0} 1 ${end.x} ${end.y}`} fill="none" stroke={color} strokeWidth={5} />}
      <text x={x} y={y + r + 14} textAnchor="middle" fill={color} fontSize={12} fontWeight={700} stroke="#000" strokeWidth={3} paintOrder="stroke">
        {casting ? "Final Ascension!" : `${Math.max(0, Math.ceil(60 - (t - e.start) / 1000))}s`}
      </text>
    </g>
  );
}

/** A Creepy Statue: a small stone pillar with two glowing eyes. */
function Statue({ x, y }: EffectArtProps) {
  return (
    <g pointerEvents="none">
      <rect x={x - 6} y={y - 8} width={12} height={16} rx={2} fill="#5d5a52" stroke="#2c2a26" strokeWidth={1} />
      <circle cx={x - 2.5} cy={y - 3} r={1.6} fill="#7dffb0" />
      <circle cx={x + 2.5} cy={y - 3} r={1.6} fill="#7dffb0" />
    </g>
  );
}

/** The Disgusting Fish, where its crate was opened. */
function Fish({ e, x, y, t }: EffectArtProps) {
  const opacity = Math.max(0, Math.min(1, (t - e.start) / 200, (e.end - t) / 600));
  const bob = Math.sin(t / 200) * 2;
  return (
    <g opacity={opacity} pointerEvents="none" transform={`translate(${x} ${y + bob})`}>
      <ellipse cx={0} cy={0} rx={11} ry={6} fill="#9fb86a" stroke="#3c4a22" strokeWidth={1.2} />
      <path d="M10 0 L17 -6 L17 6 Z" fill="#7e9650" stroke="#3c4a22" strokeWidth={1} />
      <circle cx={-6} cy={-1.5} r={1.5} fill="#1a1a1a" />
    </g>
  );
}

const LE_BLINK = ring({ color: "#6fd3ff", glow: "#1f7fd9", motes: 5, spinMs: 1400 });
const LE_BURNING = ring({ color: "#ff7a2a", glow: "#d94a00", motes: 3, spinMs: 2200 });
const LE_PIERCING = ring({ color: "#bfe8ff", glow: "#3fa0e0", motes: 3, spinMs: 2600 });
// ── Nek'zali ──

/** The Soulcoil Well: a dark teal pool with a slow swirl; brighter and rimmed while Grasping Depths has it open. */
function SoulcoilWell({ e, x, y, t, scale }: EffectArtProps) {
  const r = (e.radius ?? 800) * scale;
  const open = e.kind === "va-nekzali-well-open";
  const spin = (t / 40) % 360;
  if (open) {
    return (
      <g pointerEvents="none">
        <circle cx={x} cy={y} r={r} fill="#3fe0c8" fillOpacity={0.18} stroke="#7dffe9" strokeWidth={3} strokeOpacity={0.6 + 0.3 * Math.sin(t / 250)} filter="url(#replay-glow)" />
        <circle cx={x} cy={y} r={r} fill="none" stroke="#bffff4" strokeWidth={1.5} strokeDasharray="6 6" transform={`rotate(${-spin} ${x} ${y})`} />
      </g>
    );
  }
  return (
    <g pointerEvents="none">
      <circle cx={x} cy={y} r={r} fill="#0e3b3a" fillOpacity={0.55} stroke="#1f6e66" strokeWidth={2} />
      <path d={`M${x - r * 0.6} ${y} A${r * 0.6} ${r * 0.6} 0 0 1 ${x + r * 0.6} ${y}`} fill="none" stroke="#2fa597" strokeWidth={2} strokeOpacity={0.6}
        transform={`rotate(${spin} ${x} ${y})`} />
    </g>
  );
}

/** A Vessel of Awakening: an Amani corpse, a dark mound with a faint green soul glow, until burned or risen. */
function Corpse({ e, x, y, t }: EffectArtProps) {
  const opacity = Math.max(0, Math.min(1, (t - e.start) / 400, (e.end - t) / 400));
  return (
    <g opacity={opacity} pointerEvents="none">
      <ellipse cx={x} cy={y} rx={10} ry={6} fill="#3a2f28" stroke="#7fe08a" strokeWidth={1} strokeOpacity={0.35 + 0.25 * Math.sin(t / 400 + x)} />
      <path d={`M${x - 5} ${y - 1} L${x + 5} ${y + 1} M${x - 4} ${y + 2} L${x + 4} ${y - 2}`} stroke="#c8b8a0" strokeWidth={1.2} />
    </g>
  );
}

const NEK_FLAME = ring({ color: "#ff9a3a", glow: "#e05a00", motes: 4, spinMs: 1800 });
const NEK_BARRAGE = ring({ color: "#9ad7ff", glow: "#3b7fc4", motes: 5, spinMs: 1200 });

// ── Nymrissa ──

/** A Frost Orb waiting to be soaked: an icy sphere with a slow pulse. */
function FrostOrb({ e, x, y, t, scale }: EffectArtProps) {
  const opacity = Math.max(0, Math.min(1, (t - e.start) / FADE_MS, (e.end - t) / 150));
  if (opacity <= 0) return null;
  const r = Math.max(7, 120 * scale) * (1 + 0.06 * Math.sin(t / 220));
  return (
    <g opacity={opacity} pointerEvents="none">
      <circle cx={x} cy={y} r={r * 1.7} fill="#9fe0ff" fillOpacity={0.25} filter="url(#replay-glow)" />
      <circle cx={x} cy={y} r={r} fill="#2b8fd9" stroke="#e8f8ff" strokeWidth={1.5} />
      <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.3} fill="#e8f8ff" fillOpacity={0.8} />
    </g>
  );
}

const NYM_CHILL = ring({ color: "#cfefff", glow: "#4aa8e0", motes: 3, spinMs: 2400 });

// ── Sszorak ──

/** A Viscous Cyst: a lumpy green sac on the floor, the Maelstrom's bumper. */
/**
 * A Viscous Cyst as in game (user's VOD): a swirling green ring on the floor
 * at its trigger size (`e.radius`), a glossy venom orb bobbing above its
 * shadow in the middle.
 */
function Cyst({ e, x, y, t, scale }: EffectArtProps) {
  const opacity = Math.max(0, Math.min(1, (t - e.start) / FADE_MS, (e.end - t) / 150));
  if (opacity <= 0) return null;
  const R = (e.radius ?? 500) * scale;
  const orb = Math.max(7, R * 0.28);
  const bob = Math.sin(t / 420 + x) * orb * 0.25;
  const spin = (t / 30 + x) % 360;
  const arc = (r: number, from: number, to: number) => {
    const a0 = (from * Math.PI) / 180, a1 = (to * Math.PI) / 180;
    return `M${x + Math.sin(a0) * r} ${y - Math.cos(a0) * r} A${r} ${r} 0 0 1 ${x + Math.sin(a1) * r} ${y - Math.cos(a1) * r}`;
  };
  return (
    <g opacity={opacity} pointerEvents="none">
      <circle cx={x} cy={y} r={R} fill="#4fbf2a" fillOpacity={0.14} stroke="#0f2a08" strokeWidth={4} strokeOpacity={0.6} />
      <circle cx={x} cy={y} r={R} fill="none" stroke="#7fe04a" strokeWidth={2} />
      <g transform={`rotate(${spin} ${x} ${y})`}>
        {[0, 120, 240].map((a) => (
          <path key={a} d={arc(R * 0.86, a, a + 75)} fill="none" stroke="#c8ff8a" strokeWidth={2.5} strokeLinecap="round" />
        ))}
      </g>
      <ellipse cx={x} cy={y + orb * 0.55} rx={orb * 0.9} ry={orb * 0.35} fill="#0f2a08" fillOpacity={0.55} />
      <circle cx={x} cy={y - orb * 0.6 + bob} r={orb} fill="#9cff3a" stroke="#2f6b12" strokeWidth={1.5} filter="url(#replay-glow)" />
      <circle cx={x - orb * 0.35} cy={y - orb * 0.95 + bob} r={orb * 0.32} fill="#f4ffd0" fillOpacity={0.85} />
    </g>
  );
}

/**
 * Venomous Surge's aura on its carrier: a shimmering green field `e.radius`
 * across (user's VOD), sparkles drifting in it, a solid rim.
 */
function SurgeAura({ e, x, y, t, scale }: EffectArtProps) {
  const opacity = Math.max(0, Math.min(1, (t - e.start) / FADE_MS, (e.end - t) / 150));
  if (opacity <= 0) return null;
  const R = (e.radius ?? 800) * scale;
  const tick = Math.floor(t / 160);
  const pulse = 1 + 0.03 * Math.sin(t / 200);
  return (
    <g opacity={opacity} pointerEvents="none">
      <circle cx={x} cy={y} r={R * pulse} fill="#6fe03a" fillOpacity={0.16} />
      <circle cx={x} cy={y} r={R * 0.6} fill="#9cff5a" fillOpacity={0.1} />
      <circle cx={x} cy={y} r={R * pulse} fill="none" stroke="#b8ff6a" strokeWidth={2} strokeOpacity={0.9} filter="url(#replay-glow)" />
      {Array.from({ length: 10 }, (_, k) => {
        const a = rand(k * 7.1 + tick * 0.37) * Math.PI * 2, d = Math.sqrt(rand(k * 3.3 + tick * 0.91)) * R * 0.92;
        return <circle key={k} cx={x + Math.sin(a) * d} cy={y - Math.cos(a) * d} r={1.6 + 1.8 * rand(k + tick)} fill="#eaffc0" fillOpacity={0.9} />;
      })}
    </g>
  );
}

/** Venomous Surge's blast as the cyst drops: a green shockwave out to `e.radius` with a bright core. */
function SurgeBlast({ e, x, y, t, scale }: EffectArtProps) {
  const f = (t - e.start) / Math.max(1, e.end - e.start);
  if (f < 0 || f > 1) return null;
  const R = (e.radius ?? 800) * scale;
  const r = R * (0.35 + 0.65 * Math.sqrt(f));
  return (
    <g pointerEvents="none" opacity={1 - f * f}>
      <circle cx={x} cy={y} r={r} fill="#c8ff6a" fillOpacity={0.35 * (1 - f)} />
      <circle cx={x} cy={y} r={r} fill="none" stroke="#f4ffd0" strokeWidth={5 * (1 - f) + 1.5} filter="url(#replay-glow)" />
      <circle cx={x} cy={y} r={R * 0.25 * (1 - f)} fill="#ffffff" fillOpacity={0.8} />
    </g>
  );
}

/** Where a Tempest tornado struck a player: a green-grey swirl. */
function Tornado({ e, x, y, t }: EffectArtProps) {
  const opacity = Math.max(0, Math.min(1, (t - e.start) / 250, (e.end - t) / 400));
  if (opacity <= 0) return null;
  const a = (t / 3) % 360;
  return (
    <g opacity={opacity} pointerEvents="none" transform={`rotate(${a} ${x} ${y})`}>
      {[14, 10, 6].map((r, i) => (
        <path key={i} d={`M${x - r} ${y} A${r} ${r} 0 1 1 ${x} ${y + r}`} fill="none" stroke={i === 1 ? "#9fd88a" : "#cfe8c8"} strokeWidth={2.5 - i * 0.5} />
      ))}
    </g>
  );
}

/**
 * Raging Crosswinds' arrow on its holder: a chevron on the rim of their 6y
 * blast circle pointing where the blast throws them (map bearing, clockwise
 * from north), white or teal by pair like the circles, dark-edged so it
 * reads over them. A thin shaft runs to it from the player.
 */
function windArrow(bearing: number, color: string, glow: string) {
  return function WindArrow({ e, x, y, t, scale }: EffectArtProps) {
    const opacity = Math.max(0, Math.min(1, (t - e.start) / FADE_MS, (e.end - t) / 150));
    if (opacity <= 0) return null;
    const d = Math.max(RING + 6, 600 * scale - 4);
    return (
      <g opacity={opacity} pointerEvents="none" transform={`rotate(${bearing} ${x} ${y})`}>
        <line x1={x} y1={y - RING} x2={x} y2={y - d} stroke="#0d1a24" strokeWidth={5} strokeOpacity={0.7} />
        <line x1={x} y1={y - RING} x2={x} y2={y - d} stroke={color} strokeWidth={2.5} />
        <path d={`M${x} ${y - d - 18} L${x + 13} ${y - d + 2} L${x} ${y - d - 4} L${x - 13} ${y - d + 2} Z`}
          fill={color} stroke="#0d1a24" strokeWidth={2} />
        <path d={`M${x} ${y - d - 18} L${x + 13} ${y - d + 2} L${x} ${y - d - 4} L${x - 13} ${y - d + 2} Z`}
          fill="none" stroke={glow} strokeWidth={4} strokeOpacity={0.35} filter="url(#replay-glow)" />
      </g>
    );
  };
}


/**
 * Ravage (white) / Mutilate (venom green): a cone from Sszorak toward the
 * tank (`aim`) that tracks them through the cast bar, `e.radius` long,
 * brightening toward the hit.
 */
function tankCone(angle: number, fill: string, rim: string) {
  return function TankCone({ e, x, y, t, scale, aim }: EffectArtProps) {
    if (!aim) return null;
    const opacity = Math.max(0, Math.min(1, (t - e.start) / FADE_MS, (e.end - t) / 120));
    if (opacity <= 0) return null;
    const r = (e.radius ?? 2500) * scale;
    const b = Math.atan2(aim.x - x, -(aim.y - y));
    const h = (angle / 2) * (Math.PI / 180);
    const pt = (a: number) => `${x + Math.sin(a) * r} ${y - Math.cos(a) * r}`;
    const d = `M${x} ${y} L${pt(b - h)} A${r} ${r} 0 0 1 ${pt(b + h)} Z`;
    const grow = Math.max(0, Math.min(1, (t - e.start) / Math.max(1, e.end - e.start)));
    return (
      <g opacity={opacity} pointerEvents="none">
        <path d={d} fill={fill} fillOpacity={0.12 + 0.16 * grow} stroke={rim} strokeWidth={2.5} strokeOpacity={0.85} />
        <path d={d} fill="none" stroke={fill} strokeWidth={8} strokeOpacity={0.3} filter="url(#replay-glow)" />
      </g>
    );
  };
}

/**
 * Virulence on its carrier: four venom lines `e.radius` long through them,
 * a + or an X fixed to the map as in game (user's VOD, 0:27). Each arm is
 * a solid venom spike, wide at the player and pointed at its 15y tip with
 * a dark outline, its fill pulsing gently between two greens over 1.4s
 * (never faint: any paused frame reads, user 2026-10-19), white-hot as it bursts
 * at the aura's end (the spec ends the effect 0.4s after).
 */
/** `a` to `b` (#rrggbb) by `k` in 0..1. */
function mix(a: string, b: string, k: number): string {
  const c = (s: string, i: number) => parseInt(s.slice(1 + i * 2, 3 + i * 2), 16);
  return "#" + [0, 1, 2].map((i) => Math.round(c(a, i) + (c(b, i) - c(a, i)) * k).toString(16).padStart(2, "0")).join("");
}

function virulenceCross(offset: number) {
  return function VirulenceCross({ e, x, y, t, scale }: EffectArtProps) {
    const burstAt = e.end - 400;
    const opacity = Math.max(0, Math.min(1, (t - e.start) / FADE_MS, (e.end - t) / 400));
    if (opacity <= 0) return null;
    const len = (e.radius ?? 1500) * scale;
    const burst = t >= burstAt;
    // A slow, gentle pulse between two close greens (user, 2026-10-19: a hard
    // dark/light flash was too noisy).
    const k = 0.5 - 0.5 * Math.cos(((t - e.start) / 1400) * Math.PI * 2);
    const fill = burst ? "#f4ffc8" : mix("#5fc82a", "#9ce83f", k);
    const core = burst ? "#ffffff" : mix("#b8f07a", "#e4ffb0", k);
    const w = burst ? 9 : 6;   // half-width at the player, SVG units
    // One arm pointing up from the player: a tapered spike with a diamond tip.
    const arm = `M${x - w} ${y - 10} L${x - 1.5} ${y - len + 8} L${x} ${y - len - 4} L${x + 1.5} ${y - len + 8} L${x + w} ${y - 10} Z`;
    return (
      <g opacity={opacity} pointerEvents="none" transform={`rotate(${offset} ${x} ${y})`}>
        {[0, 90, 180, 270].map((a) => (
          <g key={a} transform={`rotate(${a} ${x} ${y})`}>
            {burst && <path d={arm} fill="#c8ff2a" opacity={0.6} filter="url(#replay-glow)" />}
            <path d={arm} fill={fill} stroke="#0b2406" strokeWidth={2} strokeLinejoin="round" />
            <line x1={x} y1={y - 12} x2={x} y2={y - len + 6} stroke={core} strokeWidth={1.2} />
          </g>
        ))}
        <circle cx={x} cy={y} r={9} fill="none" stroke="#0b2406" strokeWidth={4} />
        <circle cx={x} cy={y} r={9} fill="none" stroke={fill} strokeWidth={2} />
      </g>
    );
  };
}

/**
 * A player struck by a tank hit (the spec also jolts their icon): Ravage
 * rakes three white claw slashes across them, Mutilate bursts a green
 * splash ring with droplets. Both flash in and fade over the effect.
 */
function struckArt(kind: "claw" | "splash") {
  return function Struck({ e, x, y, t }: EffectArtProps) {
    const f = (t - e.start) / Math.max(1, e.end - e.start);
    if (f < 0 || f > 1) return null;
    const o = 1 - f * f;
    if (kind === "claw") {
      const draw = Math.min(1, f * 4);   // the slashes rake across in the first quarter
      return (
        <g opacity={o} pointerEvents="none">
          <circle cx={x} cy={y} r={26 + 14 * f} fill="#ffffff" fillOpacity={0.3 * (1 - f)} stroke="#ffffff" strokeWidth={2} strokeOpacity={1 - f} />
          {/* Longer than the icon (34 units), which is drawn over them. */}
          {[-13, 0, 13].map((dx, i) => {
            const x0 = x + dx - 22, y0 = y - 30, x1 = x + dx + 22, y1 = y + 30;
            return (
              <g key={i}>
                <line x1={x0} y1={y0} x2={x0 + (x1 - x0) * draw} y2={y0 + (y1 - y0) * draw} stroke="#3a0a0a" strokeWidth={6} strokeLinecap="round" />
                <line x1={x0} y1={y0} x2={x0 + (x1 - x0) * draw} y2={y0 + (y1 - y0) * draw} stroke="#ffd0d0" strokeWidth={8} strokeOpacity={0.4} strokeLinecap="round" filter="url(#replay-glow)" />
                <line x1={x0} y1={y0} x2={x0 + (x1 - x0) * draw} y2={y0 + (y1 - y0) * draw} stroke="#ffffff" strokeWidth={3} strokeLinecap="round" />
              </g>
            );
          })}
        </g>
      );
    }
    const r = 20 + 20 * Math.sqrt(f);
    return (
      <g opacity={o} pointerEvents="none">
        <circle cx={x} cy={y} r={r} fill="#6fe03a" fillOpacity={0.22 * (1 - f)} stroke="#c8ff8a" strokeWidth={3 * (1 - f) + 1} filter="url(#replay-glow)" />
        {Array.from({ length: 6 }, (_, k) => {
          const a = (k / 6) * Math.PI * 2 + rand(e.start + k) * 0.6;
          const d = 10 + 22 * f;
          return <circle key={k} cx={x + Math.sin(a) * d} cy={y - Math.cos(a) * d} r={3.2 * (1 - f) + 1} fill="#9cff3a" stroke="#1f4a0a" strokeWidth={1} />;
        })}
      </g>
    );
  };
}

/** Serpent's Fury's mark: a red-orange fang badge above its holder's icon. */
function FuryMark({ e, x, y, t }: EffectArtProps) {
  const opacity = Math.max(0, Math.min(1, (t - e.start) / FADE_MS, (e.end - t) / 150));
  if (opacity <= 0) return null;
  const by = y - 34;
  return (
    <g opacity={opacity} pointerEvents="none">
      <circle cx={x} cy={by} r={11} fill="#b8260f" stroke="#ffb04a" strokeWidth={2} filter="url(#replay-glow)" />
      <path d={`M${x - 5} ${by - 5} L${x - 2} ${by + 6} L${x} ${by - 2} L${x + 2} ${by + 6} L${x + 5} ${by - 5} Z`} fill="#fff4e0" />
    </g>
  );
}

/** A player a Virulence burst hit: a green X flashing over their icon for 2s. */
function VirulenceFail({ e, x, y, t }: EffectArtProps) {
  const age = t - e.start;
  if (age < 0 || t > e.end) return null;
  const on = Math.floor(age / 200) % 2 === 0;
  // Wider than the player icon (34 units), which is drawn over it.
  const s = 30 + 10 * Math.max(0, 1 - age / 400);
  const opacity = Math.min(1, (e.end - t) / 300);
  return (
    <g opacity={opacity} pointerEvents="none">
      <path d={`M${x - s} ${y - s} L${x + s} ${y + s} M${x + s} ${y - s} L${x - s} ${y + s}`} stroke="#0d1a0a" strokeWidth={12} strokeLinecap="round" />
      <path d={`M${x - s} ${y - s} L${x + s} ${y + s} M${x + s} ${y - s} L${x - s} ${y + s}`} stroke={on ? "#7dff3a" : "#2fae1a"} strokeWidth={7} strokeLinecap="round"
        filter={on ? "url(#replay-glow)" : undefined} />
    </g>
  );
}

/**
 * A Tempest tornado on its modelled path (sszorak-replay.ts tornadoes): a
 * green funnel at one strength for its whole life (user, 2026-10-19: a
 * fade made the late ones too hard to see), fading only as it ends.
 */
function Whirl({ e, x, y, t, scale }: EffectArtProps) {
  const opacity = Math.max(0, Math.min(1, (t - e.start) / 400, (e.end - t) / 1500));
  if (opacity <= 0) return null;
  const r = Math.max(9, 250 * scale);
  const a = (t / 2.5) % 360;
  return (
    <g opacity={opacity} pointerEvents="none">
      <circle cx={x} cy={y} r={r} fill="#5fd13a" fillOpacity={0.18} stroke="#9fe86a" strokeWidth={1.5} strokeOpacity={0.6} />
      <g transform={`rotate(${a} ${x} ${y})`}>
        {[0.9, 0.62, 0.34].map((f, i) => (
          <path key={i} d={`M${x - r * f} ${y} A${r * f} ${r * f} 0 1 1 ${x} ${y + r * f}`} fill="none" stroke={i === 1 ? "#7fe04a" : "#cfeec0"} strokeWidth={2.2 - i * 0.4} />
        ))}
      </g>
    </g>
  );
}

// ── The Twin Fangs ──

/** A Caustic Globule under its Barbed Bulwark: a green droplet inside a ring of red thorns. */
function Globule({ e, x, y, t }: EffectArtProps) {
  const opacity = Math.max(0, Math.min(1, (t - e.start) / FADE_MS, (e.end - t) / 150));
  if (opacity <= 0) return null;
  const left = e.end - t;
  const urgent = left < 3000 && left > 0;
  return (
    <g opacity={opacity} pointerEvents="none">
      <circle cx={x} cy={y} r={9} fill="none" stroke="#c0283a" strokeWidth={1.5} strokeDasharray="2 2.5" />
      <circle cx={x} cy={y} r={5.5} fill={urgent && Math.floor(t / 150) % 2 ? "#d6ff7a" : "#5fd13a"} stroke="#e4ffc8" strokeWidth={1} />
    </g>
  );
}

const TF_ICHOR = ring({ color: "#c0283a", glow: "#7a0f1c", motes: 4, spinMs: 2000 });

// ── Ula'tek ──
// An egg on its carrier (pale green), a Doomscale Egg (dark, bigger motes),
// a Grasping Fangs tether (shadow purple).
const ULA_EGG = ring({ color: "#cfe8a0", glow: "#6e9e2a", motes: 1, spinMs: 3000 });
const ULA_DOOMEGG = ring({ color: "#8a6bd9", glow: "#3a1f8a", motes: 2, spinMs: 2400 });
const ULA_FANGS = ring({ color: "#b07bff", glow: "#4a1f9e", motes: 2, spinMs: 1200 });

// Shell Spin: Nama's target (sea green, three shells circling) and a stun (grey).
const LE_SHELL = ring({ color: "#3fd6b0", glow: "#1a8f74", motes: 3, spinMs: 900 });
const LE_STUN = ring({ color: "#d8d8d8", glow: "#7a7a7a", motes: 4, spinMs: 700 });

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
    "va-lost-explorers-clock": AscensionClock,
    "va-lost-explorers-statue": Statue,
    "va-lost-explorers-fish": Fish,
    "va-lost-explorers-blink": LE_BLINK,
    "va-lost-explorers-burning": LE_BURNING,
    "va-lost-explorers-piercing": LE_PIERCING,
    "va-lost-explorers-shell": LE_SHELL,
    "va-lost-explorers-stun": LE_STUN,
    "va-nekzali-well": SoulcoilWell,
    "va-nekzali-well-open": SoulcoilWell,
    "va-nekzali-corpse": Corpse,
    "va-nekzali-flame": NEK_FLAME,
    "va-nekzali-barrage": NEK_BARRAGE,
    "va-nymrissa-orb": FrostOrb,
    "va-nymrissa-chill": NYM_CHILL,
    "va-sszorak-cyst": Cyst,
    "va-sszorak-tornado": Tornado,
    "va-sszorak-surge": SurgeAura,
    "va-sszorak-surge-blast": SurgeBlast,
    "va-sszorak-virulence-plus": virulenceCross(0),
    "va-sszorak-virulence-x": virulenceCross(45),
    "va-sszorak-virulence-fail": VirulenceFail,
    "va-sszorak-fury": FuryMark,
    "va-sszorak-ravage-hit": struckArt("claw"),
    "va-sszorak-mutilate-hit": struckArt("splash"),
    "va-sszorak-whirl": Whirl,
    // Tank cones (sszorak-replay.ts tankCones): Ravage white, Mutilate green.
    "va-sszorak-ravage": tankCone(50, "#f4f8ff", "#ffffff"),
    "va-sszorak-mutilate": tankCone(70, "#5fe03a", "#c8ffa8"),
    // Crosswinds arrows (sszorak-replay.ts CROSSWINDS_BEARING): N/S teal, E/W white.
    "va-sszorak-arrow-15": windArrow(15, "#7fe0d0", "#2fa597"),
    "va-sszorak-arrow-195": windArrow(195, "#7fe0d0", "#2fa597"),
    "va-sszorak-arrow-105": windArrow(105, "#ffffff", "#9fb4c8"),
    "va-sszorak-arrow-285": windArrow(285, "#ffffff", "#9fb4c8"),
    "va-twin-fangs-globule": Globule,
    "va-twin-fangs-ichor": TF_ICHOR,
    "va-ulatek-egg": ULA_EGG,
    "va-ulatek-doomegg": ULA_DOOMEGG,
    "va-ulatek-fangs": ULA_FANGS,
  },
  shapes: {
    "va-entombed-sentinels-pool": BloodPool,
    "va-lost-explorers-fire-patch": pool("#c2410c", "#ff8a3d"),
    "va-lost-explorers-frost-patch": pool("#1d5f9e", "#9fd8ff"),
    "va-lost-explorers-aftershock": pool("#6b4a2a", "#c99a5e"),
    "va-nekzali-cultist": pool("#3a1f5e", "#9b6bff"),
    "va-nymrissa-frost": pool("#7fc8f0", "#e8f8ff"),
    "va-twin-fangs-gore": pool("#5e0d16", "#b0283a"),
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
    // Frostfire Volley's fire missiles (the frost ones use the built-in ice).
    "va-lost-explorers-fire": { fill: "#ff6a1a", flash: "#ffc070", rim: "#ffe0b0", glow: "#d94a00" },
    // Soul Transfer: the Echo's spirit beam.
    "va-nekzali-beam": { fill: "#59e0d0", flash: "#c8fff6", rim: "#e0fffa", glow: "#1fa597" },
    // Water Jet: sea blue.
    "va-nymrissa-jet": { fill: "#1f8fe0", flash: "#9fd8ff", rim: "#d8f0ff", glow: "#0a5fa8" },
    // Raging Crosswinds holders, by the pair whose Gusts clear each other.
    "va-sszorak-wind-a": { fill: "#e0e8f0", flash: "#ffffff", rim: "#ffffff", glow: "#9fb4c8" },
    "va-sszorak-wind-b": { fill: "#7fe0d0", flash: "#d0fff8", rim: "#e8fffb", glow: "#2fa597" },
    // Corrosive Spit: Vexhul's acid line.
    "va-twin-fangs-spit": { fill: "#8fe03a", flash: "#d8ff9a", rim: "#eaffc8", glow: "#4a9e1a" },
    // Ula'tek: the Coils' spectral blue soak, the Caustic Waves' venom
    // green, Volatile Purge's acid yellow.
    "va-ulatek-coil": { fill: "#6fb8ff", flash: "#d0e8ff", rim: "#e8f4ff", glow: "#2f6fd9" },
    "va-ulatek-wave": { fill: "#3fbf5a", flash: "#a6ffb0", rim: "#d8ffe0", glow: "#1a8f3a" },
    "va-ulatek-purge": { fill: "#e0d43a", flash: "#fff59a", rim: "#fffbd0", glow: "#a89a00" },
  },
};
