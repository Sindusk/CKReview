"use client";

// components/replay-art/tea.tsx
//
// The Epic of Alexander's replay art (types.ts), for the kinds and styles
// in lib/mechanics/ffxiv/tea/replay.ts.
//
// Tornado: Cascade's tornado in its puddle, a turning water swirl.
// Embolus: Pressurize's small dark orb drifting toward the bosses.
// HandGesture: Liquid Hand's fist (Prayer) or open palm (Parting).
// WaterTether: Drainage's tether from a tornado to a tank.

import { rand } from "@/components/ReplayEffects";
import { facingToCompassBearing } from "@/lib/mechanics/geometry";
import { poseAt, sampleNear } from "@/lib/replay/ffxiv-replay";
import type { EffectArtProps, FightArt, TetherArtProps } from "./types";

const WATER = { glow: "#2fa8ff", hot: "#bfeaff", deep: "#0b4f8f", text: "#9fdcff" };
const FADE_MS = 400;

const fade = (t: number, start: number, end: number, ms = FADE_MS) =>
  Math.max(0, Math.min(1, (t - start) / ms, (end - t) / ms));

/** A tornado in its puddle: deep-blue pool, three swirl arms turning, foam rim. */
function Tornado({ e, x, y, t, scale }: EffectArtProps) {
  const r = (e.radius ?? 400) * scale;
  const o = fade(t, e.start, e.end, 600);
  if (o <= 0) return null;
  const spin = (t / 8) % 360;
  const arm = (k: number) => {
    let d = "";
    for (let s = 0; s <= 12; s++) {
      const f = s / 12;
      const a = (k * 120 + f * 220) * Math.PI / 180;
      const rr = r * (0.15 + 0.8 * f);
      d += `${s ? " L" : "M"}${(x + Math.sin(a) * rr).toFixed(1)} ${(y - Math.cos(a) * rr).toFixed(1)}`;
    }
    return d;
  };
  return (
    <g opacity={o * 0.85} pointerEvents="none">
      <circle cx={x} cy={y} r={r} fill={WATER.deep} fillOpacity={0.35} stroke={WATER.glow} strokeWidth={8} strokeOpacity={0.3} filter="url(#replay-glow)" />
      <g transform={`rotate(${-spin} ${x} ${y})`}>
        {[0, 1, 2].map((k) => <path key={k} d={arm(k)} fill="none" stroke={WATER.hot} strokeOpacity={0.55} strokeWidth={2.5} strokeLinecap="round" />)}
      </g>
      <circle cx={x} cy={y} r={r} fill="none" stroke={WATER.hot} strokeOpacity={0.7} strokeWidth={1.5} strokeDasharray={`${r * 0.3} ${r * 0.15}`}
        transform={`rotate(${spin * 0.5} ${x} ${y})`} />
    </g>
  );
}

/** Embolus: a small dark-blue orb with a pale core and a pulsing ring (guides: "quite small", easy to miss). */
function Embolus({ e, x, y, t, scale }: EffectArtProps) {
  const r = Math.max(7, 90 * scale);
  const pulse = 0.5 + 0.5 * Math.sin(t / 180);
  return (
    <g pointerEvents="none">
      <circle cx={x} cy={y} r={r * (1.6 + 0.4 * pulse)} fill="none" stroke={WATER.glow} strokeOpacity={0.35 + 0.3 * pulse} strokeWidth={2} />
      <circle cx={x} cy={y} r={r} fill={WATER.deep} stroke={WATER.glow} strokeWidth={3} filter="url(#replay-glow)" />
      <circle cx={x - r * 0.25} cy={y - r * 0.25} r={r * 0.35} fill={WATER.hot} fillOpacity={0.85} />
      {e.label && (
        <text x={x} y={y + r * 2 + 12} textAnchor="middle" fill={WATER.text} fontSize={12} fontWeight={700}
          stroke="rgba(0,0,0,0.8)" strokeWidth={3} paintOrder="stroke">{e.label}</text>
      )}
    </g>
  );
}

/** Liquid Hand's gesture above it: a closed fist or an open palm, in water blue, with its meaning. */
function HandGesture({ e, x, y, t }: EffectArtProps) {
  const o = fade(t, e.start, e.end, 300);
  if (o <= 0) return null;
  const s = 1 + 0.05 * Math.sin(t / 150);
  const hy = y - 52;
  const fist = e.kind === "tea-hand-fist";
  return (
    <g opacity={o} pointerEvents="none">
      <g transform={`translate(${x} ${hy}) scale(${s})`}>
        <circle r={24} fill={WATER.deep} fillOpacity={0.75} stroke={WATER.glow} strokeWidth={3} filter="url(#replay-glow)" />
        {fist ? (
          // Knuckles over a fist.
          <g fill={WATER.hot} stroke={WATER.deep} strokeWidth={1.2}>
            <rect x={-11} y={-6} width={22} height={16} rx={5} />
            {[-8, -2.7, 2.7, 8].map((fx) => <rect key={fx} x={fx - 2.7} y={-12} width={5.4} height={9} rx={2.6} />)}
            <rect x={-14} y={-2} width={6} height={10} rx={3} />
          </g>
        ) : (
          // An open palm: spread fingers.
          <g fill={WATER.hot} stroke={WATER.deep} strokeWidth={1.2}>
            <rect x={-9} y={-3} width={18} height={15} rx={5} />
            {[-7, -2.3, 2.3, 7].map((fx, k) => <rect key={fx} x={fx - 2.2} y={-17 + (k === 0 || k === 3 ? 3 : 0)} width={4.4} height={15} rx={2.2} transform={`rotate(${(fx) * 1.6} ${fx} -3)`} />)}
            <rect x={-16} y={0} width={4.4} height={11} rx={2.2} transform="rotate(-40 -12 6)" />
          </g>
        )}
      </g>
      <text x={x} y={hy - 32} textAnchor="middle" fill={WATER.text} fontSize={14} fontWeight={800}
        stroke="rgba(0,0,0,0.8)" strokeWidth={4} paintOrder="stroke">{e.label}</text>
    </g>
  );
}

/** A tether of running water: a blue band with a wavy pale current flowing to the player. */
function WaterTether({ x1, y1, x2, y2, t }: TetherArtProps) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 1) return null;
  const ux = (x2 - x1) / len, uy = (y2 - y1) / len, px = -uy, py = ux;
  const n = Math.max(8, Math.round(len / 12));
  let d = `M${x1} ${y1}`;
  for (let s = 1; s <= n; s++) {
    const f = s / n, w = Math.sin(f * Math.PI * 6 - t / 120) * 4;
    d += ` L${x1 + ux * len * f + px * w} ${y1 + uy * len * f + py * w}`;
  }
  return (
    <g pointerEvents="none">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={WATER.glow} strokeWidth={14} strokeOpacity={0.45} strokeLinecap="round" filter="url(#replay-glow)" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={WATER.deep} strokeWidth={6} strokeLinecap="round" />
      <path d={d} fill="none" stroke={WATER.hot} strokeWidth={2} strokeLinejoin="round" />
      {Array.from({ length: 4 }, (_, k) => {
        const f = ((t / 700) + k / 4) % 1;
        return <circle key={k} cx={x1 + ux * len * f + px * (rand(k) - 0.5) * 6} cy={y1 + uy * len * f + py * (rand(k + 9) - 0.5) * 6} r={2} fill={WATER.hot} />;
      })}
      <circle cx={x1} cy={y1} r={6} fill={WATER.hot} stroke={WATER.deep} strokeWidth={2} />
    </g>
  );
}

/** The tornado frozen into Gelid Gaol: a pale ice block with facets and a frost rim (Propeller Wind's cover). */
function IcePillar({ e, x, y, t, scale }: EffectArtProps) {
  const r = (e.radius ?? 400) * scale;
  const o = fade(t, e.start, e.end, 500);
  if (o <= 0) return null;
  const pts = Array.from({ length: 7 }, (_, k) => {
    const a = (k / 7) * Math.PI * 2 + 0.3;
    const rr = r * (0.82 + 0.18 * rand(k * 3.7));
    return `${(x + Math.sin(a) * rr).toFixed(1)},${(y - Math.cos(a) * rr).toFixed(1)}`;
  }).join(" ");
  return (
    <g opacity={o} pointerEvents="none">
      <circle cx={x} cy={y} r={r * 1.15} fill="#cfeeff" fillOpacity={0.18} stroke="#cfeeff" strokeWidth={8} strokeOpacity={0.35} filter="url(#replay-glow)" />
      <polygon points={pts} fill="#e9f7ff" fillOpacity={0.85} stroke="#ffffff" strokeWidth={2} strokeLinejoin="round" />
      <path d={`M${x - r * 0.4} ${y - r * 0.5} L${x + r * 0.1} ${y} L${x - r * 0.2} ${y + r * 0.55} M${x + r * 0.1} ${y} L${x + r * 0.6} ${y - r * 0.2}`}
        fill="none" stroke="#9fd8ff" strokeWidth={1.5} />
    </g>
  );
}

/** Plasma Shield's damageable front: a glowing arc on its facing side, the rest dim. */
function ShieldFront({ e, x, y, t, scale, actor }: EffectArtProps) {
  const o = fade(t, e.start, e.end, 300);
  if (o <= 0 || !actor) return null;
  const pose = poseAt(actor, t) ?? sampleNear(actor, t, 5000);
  if (!pose) return null;
  const r = ((actor.hitbox ?? 500) + 150) * scale;
  const b = facingToCompassBearing(pose.facing);
  const arc = (from: number, to: number) => {
    const a0 = (from * Math.PI) / 180, a1 = (to * Math.PI) / 180;
    return `M${x + Math.sin(a0) * r} ${y - Math.cos(a0) * r} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x + Math.sin(a1) * r} ${y - Math.cos(a1) * r}`;
  };
  return (
    <g opacity={o} pointerEvents="none">
      <path d={arc(b + 60, b + 300)} fill="none" stroke="#7f8ca8" strokeWidth={4} strokeOpacity={0.5} strokeDasharray="6 6" />
      <path d={arc(b - 60, b + 60)} fill="none" stroke="#7cf0ff" strokeWidth={14} strokeOpacity={0.45} filter="url(#replay-glow)" />
      <path d={arc(b - 60, b + 60)} fill="none" stroke="#e6fdff" strokeWidth={4} />
      <text x={x} y={y + r + 18} textAnchor="middle" fill="#bff6ff" fontSize={13} fontWeight={800}
        stroke="rgba(0,0,0,0.8)" strokeWidth={4} paintOrder="stroke">{e.label}</text>
    </g>
  );
}

// Decree Nisi colours, the BPOG line (bj-cc.ts).
const NISI_COLORS: Record<string, string> = { a: "#3d8bff", b: "#ff9a2e", g: "#b45cff", d: "#3fd46a" };

/**
 * A Nisi colour on its carrier: a solid ring in the colour with its Greek
 * letter in a badge at the lower right. A Final Judgment (the colour the
 * player needs at Gavel) is a dashed outer ring and a badge lower left.
 */
function NisiRing({ e, x, y, t }: EffectArtProps) {
  const judgment = e.kind.startsWith("tea-judgment-");
  const col = NISI_COLORS[e.kind.slice(-1)] ?? "#ffffff";
  const o = fade(t, e.start, e.end, 200);
  if (o <= 0) return null;
  const r = judgment ? 25 : 20;
  const bx = x + (judgment ? -17 : 17), by = y + 17;
  return (
    <g opacity={o} pointerEvents="none">
      <circle cx={x} cy={y} r={r} fill="none" stroke={col} strokeWidth={judgment ? 2.5 : 3.5}
        strokeDasharray={judgment ? "5 4" : undefined} strokeOpacity={0.95} />
      <circle cx={bx} cy={by} r={7} fill={judgment ? "#15161c" : col} stroke={col} strokeWidth={1.5} />
      <text x={bx} y={by + 4} textAnchor="middle" fontSize={11} fontWeight={800} fill={judgment ? col : "#0d0e12"}>{e.label}</text>
    </g>
  );
}

const NISI_ART = Object.fromEntries(["a", "b", "g", "d"].flatMap((k) => [[`tea-nisi-${k}`, NisiRing], [`tea-judgment-${k}`, NisiRing]]));

export const TEA_ART: FightArt = {
  effects: {
    "tea-tornado": Tornado,
    "tea-embolus": Embolus,
    "tea-hand-fist": HandGesture, "tea-hand-palm": HandGesture,
    "tea-ice-pillar": IcePillar,
    "tea-shield-front": ShieldFront,
    ...NISI_ART,
  },
  colors: {
    // Compressed Water's stack: sea blue. Flarethrower: fire orange.
    // Propeller Wind's shadow: a safe spot, green.
    "tea-water": { fill: "#1f8fe0", flash: "#8fd6ff", rim: "#dff4ff", glow: "#3fb0ff" },
    "tea-fire":  { fill: "#ff5a1a", flash: "#ffb36b", rim: "#ffe4c8", glow: "#ff7a2a" },
    "tea-safe":  { fill: "#2fbf6a", flash: "#8ff0b4", rim: "#d8ffe6", glow: "#4ad88a" },
    // Enumeration: a stack, in the built-in stack orange.
    "tea-enum":  { fill: "#f08a24", flash: "#ffc070", rim: "#fff0d8", glow: "#ffa040" },
  },
  tethers: { "tea-water": WaterTether },
};
