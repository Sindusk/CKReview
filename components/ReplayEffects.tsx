"use client";

// components/ReplayEffects.tsx
//
// SVG art for the boss cues in lib/replay/ffxiv-effects.ts, drawn inside
// ReplayPanel's SVG (it uses the panel's #replay-glow filter). Animated
// from the replay's clock `t`, so scrubbing and pausing hold the frame.
//
// ElementDragon: FRU Cyclonic Break's dragon, after the game's: a white
// serpent with dark bands circling the boss, wrapped in its element. Fire
// trails flames and embers; lightning crackles with bolts off its body.
// ElementHalo: Turn of the Heavens' fire and lightning halos on the floor.

import type { CasterEffect } from "@/lib/replay/ffxiv-effects";

const LAP_MS = 2600;          // one lap around the boss
const SEGMENTS = 40;
const SPAN = Math.PI * 1.55;  // how much of the circle the body covers
const FADE_MS = 500;
const BOLT_FRAME_MS = 90;     // lightning re-forks this often

const COLORS = {
  "fire-dragon":      { glow: "#ff6a1a", hot: "#ffd36b", deep: "#c4280c", text: "#ffb066" },
  "lightning-dragon": { glow: "#3d9bff", hot: "#e6f4ff", deep: "#2056d8", text: "#8cc8ff" },
};

/** Deterministic 0..1 noise, so a paused frame doesn't shimmer. */
const rand = (seed: number) => { const v = Math.sin(seed * 12.9898) * 43758.5453; return v - Math.floor(v); };

export function ElementDragon({ e, x, y, r, t }: { e: CasterEffect; x: number; y: number; r: number; t: number }) {
  const c = COLORS[e.kind === "fire-dragon" || e.kind === "fire-halo" ? "fire-dragon" : "lightning-dragon"];
  const opacity = Math.max(0, Math.min(1, (t - e.start) / FADE_MS, (e.end - t) / FADE_MS));
  if (opacity <= 0) return null;

  // Body points, head first, running clockwise and weaving in and out.
  const head = ((t - e.start) / LAP_MS) * Math.PI * 2;
  const pts: { x: number; y: number; w: number; a: number }[] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const u = i / SEGMENTS;
    const a = head - u * SPAN;
    const rho = r * (1 + 0.11 * Math.sin(u * Math.PI * 4 - (t / 300)));
    pts.push({ x: x + Math.sin(a) * rho, y: y - Math.cos(a) * rho, w: (1 - u) * 13 + 3, a });
  }
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const frame = Math.floor(t / BOLT_FRAME_MS);

  return (
    <g opacity={opacity} pointerEvents="none">
      {/* Elemental aura along the body. */}
      <path d={line} fill="none" stroke={c.glow} strokeWidth={46} strokeOpacity={0.5} strokeLinecap="round" filter="url(#replay-glow)" />
      <path d={line} fill="none" stroke={c.hot} strokeWidth={24} strokeOpacity={0.45} strokeLinecap="round" filter="url(#replay-glow)" />

      {e.kind === "fire-dragon" && pts.map((p, i) => {
        if (i % 2 !== 1) return null;
        // A flame licking off the body and back, alternating outside and
        // inside the circle, flickering.
        const flick = 0.7 + 0.5 * rand(i * 7.3 + Math.floor(t / 70));
        const len = (26 + (1 - i / SEGMENTS) * 26) * flick;
        const out = (i % 4 === 1 ? p.a : p.a + Math.PI) - (i % 4 === 1 ? 0.8 : -0.8);   // trailing (travel is +a)
        const tipX = p.x + Math.sin(out) * len, tipY = p.y - Math.cos(out) * len;
        const side = p.w * 0.9;
        const nx = Math.cos(out) * side, ny = Math.sin(out) * side;   // across the flame
        return (
          <g key={`f${i}`}>
            <path d={`M${p.x + nx} ${p.y + ny} Q${(p.x + tipX) / 2 + nx} ${(p.y + tipY) / 2 + ny} ${tipX} ${tipY} Q${(p.x + tipX) / 2 - nx} ${(p.y + tipY) / 2 - ny} ${p.x - nx} ${p.y - ny} Z`}
              fill={c.deep} fillOpacity={0.75} />
            <path d={`M${p.x + nx * 0.5} ${p.y + ny * 0.5} Q${(p.x + tipX) / 2} ${(p.y + tipY) / 2} ${p.x + (tipX - p.x) * 0.7} ${p.y + (tipY - p.y) * 0.7} Q${(p.x + tipX) / 2} ${(p.y + tipY) / 2} ${p.x - nx * 0.5} ${p.y - ny * 0.5} Z`}
              fill={c.hot} fillOpacity={0.85} />
          </g>
        );
      })}
      {e.kind === "fire-dragon" && Array.from({ length: 10 }, (_, k) => {
        // Embers drifting off the tail half.
        const p = pts[Math.floor(SEGMENTS * (0.35 + 0.6 * rand(k * 3.1 + Math.floor(t / 400))))];
        const drift = ((t / 400) % 1) * 18;
        return <circle key={`e${k}`} cx={p.x + (rand(k + 1.7) - 0.5) * 20} cy={p.y - drift - rand(k) * 8} r={1.5 + rand(k * 5.5) * 2} fill={c.hot} fillOpacity={0.9 - drift / 24} />;
      })}

      {e.kind === "lightning-dragon" && Array.from({ length: 6 }, (_, k) => {
        // Bolts forking off the body, re-drawn every few frames.
        const seed = frame * 13 + k * 101;
        const p = pts[Math.floor(rand(seed) * (SEGMENTS - 4)) + 2];
        const dir = p.a + (rand(seed + 1) - 0.5) * 2.4;
        const len = r * (0.35 + rand(seed + 2) * 0.45);
        let d = `M${p.x} ${p.y}`;
        for (let s = 1; s <= 5; s++) {
          const along = (len * s) / 5;
          const jag = (rand(seed + s * 3.3) - 0.5) * 16;
          d += ` L${p.x + Math.sin(dir) * along + Math.cos(dir) * jag} ${p.y - Math.cos(dir) * along + Math.sin(dir) * jag}`;
        }
        return (
          <g key={`b${k}`}>
            <path d={d} fill="none" stroke={c.glow} strokeWidth={10} strokeOpacity={0.7} strokeLinejoin="round" filter="url(#replay-glow)" />
            <path d={d} fill="none" stroke={c.hot} strokeWidth={3} strokeLinejoin="round" />
          </g>
        );
      })}

      {/* The serpent: tapering ivory body with dark bands. */}
      {pts.slice(1).map((p, i) => {
        const q = pts[i];
        return <line key={`s${i}`} x1={q.x} y1={q.y} x2={p.x} y2={p.y} stroke="#f3eee4" strokeWidth={q.w} strokeLinecap="round" />;
      })}
      {pts.map((p, i) => {
        if (i < 3 || i % 2 !== 0) return null;
        // Across the body: the radial direction at its angle.
        const nx = Math.sin(p.a) * p.w * 0.45, ny = -Math.cos(p.a) * p.w * 0.45;
        return <line key={`k${i}`} x1={p.x - nx} y1={p.y - ny} x2={p.x + nx} y2={p.y + ny} stroke="#24242c" strokeWidth={Math.max(1.5, p.w * 0.28)} strokeLinecap="round" />;
      })}
      {e.kind === "lightning-dragon" && (
        // Current crawling along the body.
        <path d={line} fill="none" stroke={c.hot} strokeWidth={2} strokeDasharray="10 14" strokeDashoffset={-(t / 6) % 24} strokeLinecap="round" />
      )}

      <DragonHead p={pts[0]} c={c} />

      <text x={x} y={y + r * 1.15 + 26} textAnchor="middle" fill={c.text} fontSize={16} fontWeight={800}
        stroke="rgba(0,0,0,0.8)" strokeWidth={4} paintOrder="stroke">{e.label}</text>
    </g>
  );
}

/**
 * One of Turn of the Heavens' halos: an element ring on the floor at the
 * size of the Brightfire it will cast (5y or 10y), with a slow-turning
 * dashed inner ring and the element's glyph in the middle. The big ones
 * (the dragon's element) are the dangerous side.
 */
export function ElementHalo({ e, x, y, r, t }: { e: CasterEffect; x: number; y: number; r: number; t: number }) {
  const c = COLORS[e.kind === "fire-halo" ? "fire-dragon" : "lightning-dragon"];
  const opacity = Math.max(0, Math.min(1, (t - e.start) / FADE_MS, (e.end - t) / 200));
  if (opacity <= 0) return null;
  const spin = ((t - e.start) / 40) % 360;
  const g = Math.max(8, r * 0.28);   // glyph size
  return (
    <g opacity={opacity} pointerEvents="none">
      <circle cx={x} cy={y} r={r} fill={c.glow} fillOpacity={0.14} stroke={c.glow} strokeWidth={10} strokeOpacity={0.35} filter="url(#replay-glow)" />
      <circle cx={x} cy={y} r={r} fill="none" stroke={c.hot} strokeWidth={2.5} />
      <circle cx={x} cy={y} r={r * 0.8} fill="none" stroke={c.glow} strokeWidth={2} strokeOpacity={0.8}
        strokeDasharray={`${r * 0.25} ${r * 0.12}`} transform={`rotate(${spin} ${x} ${y})`} />
      {e.kind === "fire-halo" ? (
        <path d={`M${x} ${y - g} Q${x + g * 0.9} ${y - g * 0.1} ${x + g * 0.5} ${y + g * 0.6} Q${x} ${y + g} ${x - g * 0.5} ${y + g * 0.6} Q${x - g * 0.9} ${y - g * 0.1} ${x} ${y - g} Z`}
          fill={c.deep} stroke={c.hot} strokeWidth={1.5} />
      ) : (
        <path d={`M${x + g * 0.2} ${y - g} L${x - g * 0.5} ${y + g * 0.1} L${x} ${y + g * 0.1} L${x - g * 0.2} ${y + g} L${x + g * 0.5} ${y - g * 0.1} L${x} ${y - g * 0.1} Z`}
          fill={c.hot} stroke={c.deep} strokeWidth={1.5} />
      )}
    </g>
  );
}

/** The head: a horned wedge pointing along the direction of travel. */
function DragonHead({ p, c }: { p: { x: number; y: number; w: number; a: number }; c: (typeof COLORS)[keyof typeof COLORS] }) {
  // Travel is clockwise: the head faces along +a's tangent.
  const deg = (p.a * 180) / Math.PI + 90;
  const s = (p.w / 13) * 1.3;
  return (
    <g transform={`translate(${p.x} ${p.y}) rotate(${deg}) scale(${s})`}>
      {/* Swept-back horns, a broad skull, a long snout, glowing eyes. */}
      <path d="M-7 -4 Q-16 4 -20 18 M7 -4 Q16 4 20 18" fill="none" stroke="#f3eee4" strokeWidth={3.5} strokeLinecap="round" />
      <path d="M0 -30 Q6 -28 7 -18 L12 -6 Q13 6 6 10 L-6 10 Q-13 6 -12 -6 L-7 -18 Q-6 -28 0 -30 Z" fill="#f3eee4" stroke={c.glow} strokeWidth={2.5} />
      <path d="M-3 -24 L3 -24" stroke="#24242c" strokeWidth={2} strokeLinecap="round" />
      <ellipse cx={-5.5} cy={-6} rx={2.8} ry={1.8} fill={c.glow} stroke={c.deep} strokeWidth={1} />
      <ellipse cx={5.5} cy={-6} rx={2.8} ry={1.8} fill={c.glow} stroke={c.deep} strokeWidth={1} />
    </g>
  );
}
