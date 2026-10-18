"use client";

// components/replay-art/fru.tsx
//
// Futures Rewritten's replay art (types.ts), for the cues built in
// lib/mechanics/ffxiv/fru/replay.ts.
//
// ElementDragon: Cyclonic Break's dragon, after the game's: a white
// serpent with dark bands circling the boss, wrapped in its element. Fire
// trails flames and embers; lightning crackles with bolts off its body.
// ElementHalo: Turn of the Heavens' fire and lightning halos on the floor.
// IceFloor: P2's Thin Ice. FrozenMirror: Mirror, Mirror's mirrors.

import type { CasterEffect } from "@/lib/replay/fight-spec";
import { ELEMENT_COLORS as COLORS, BOLT_FRAME_MS, rand } from "@/components/ReplayEffects";
import { BOSS_ICON, type EffectArtProps, type FightArt, type ShapeArtProps, type TetherArtProps } from "./types";

const LAP_MS = 2600;          // one lap around the boss, counterclockwise (user, 2026-10-17)
const K = 0.6;                // body, flame and glow thickness (user: the first cut was too large)
const SEGMENTS = 40;
const SPAN = Math.PI * 1.55;  // how much of the circle the body covers
const FADE_MS = 500;
const MIRROR_SIZE = 600;      // centi-yalms across: the frozen mirrors

function ElementDragon({ e, x, y, r, t }: { e: CasterEffect; x: number; y: number; r: number; t: number }) {
  const c = COLORS[e.kind === "fire-dragon" || e.kind === "fire-halo" ? "fire" : "lightning"];
  const opacity = Math.max(0, Math.min(1, (t - e.start) / FADE_MS, (e.end - t) / FADE_MS));
  if (opacity <= 0) return null;

  // Body points, head first, running counterclockwise (decreasing compass
  // angle, the tail behind at larger angles) and weaving in and out.
  const head = -((t - e.start) / LAP_MS) * Math.PI * 2;
  const pts: { x: number; y: number; w: number; a: number }[] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const u = i / SEGMENTS;
    const a = head + u * SPAN;
    const rho = r * (1 + 0.11 * Math.sin(u * Math.PI * 4 - (t / 300)));
    pts.push({ x: x + Math.sin(a) * rho, y: y - Math.cos(a) * rho, w: ((1 - u) * 13 + 3) * K, a });
  }
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const frame = Math.floor(t / BOLT_FRAME_MS);

  return (
    <g opacity={opacity} pointerEvents="none">
      {/* Elemental aura along the body. */}
      <path d={line} fill="none" stroke={c.glow} strokeWidth={46 * K} strokeOpacity={0.5} strokeLinecap="round" filter="url(#replay-glow)" />
      <path d={line} fill="none" stroke={c.hot} strokeWidth={24 * K} strokeOpacity={0.45} strokeLinecap="round" filter="url(#replay-glow)" />

      {e.kind === "fire-dragon" && pts.map((p, i) => {
        if (i % 2 !== 1) return null;
        // A flame licking off the body and back, alternating outside and
        // inside the circle, flickering.
        const flick = 0.7 + 0.5 * rand(i * 7.3 + Math.floor(t / 70));
        const len = (26 + (1 - i / SEGMENTS) * 26) * flick * K;
        const out = i % 4 === 1 ? p.a + 0.8 : p.a + Math.PI - 0.8;   // trailing (travel is -a)
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
        const f = (t / 400) % 1;
        return <circle key={`e${k}`} cx={p.x + (rand(k + 1.7) - 0.5) * 20 * K} cy={p.y - (f * 18 + rand(k) * 8) * K} r={(1.5 + rand(k * 5.5) * 2) * K + 0.5} fill={c.hot} fillOpacity={0.9 - f * 0.75} />;
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
          const jag = (rand(seed + s * 3.3) - 0.5) * 16 * K;
          d += ` L${p.x + Math.sin(dir) * along + Math.cos(dir) * jag} ${p.y - Math.cos(dir) * along + Math.sin(dir) * jag}`;
        }
        return (
          <g key={`b${k}`}>
            <path d={d} fill="none" stroke={c.glow} strokeWidth={10 * K} strokeOpacity={0.7} strokeLinejoin="round" filter="url(#replay-glow)" />
            <path d={d} fill="none" stroke={c.hot} strokeWidth={2} strokeLinejoin="round" />
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

      <text x={x} y={y + r * 1.15 + 20} textAnchor="middle" fill={c.text} fontSize={14} fontWeight={800}
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
function ElementHalo({ e, x, y, r, t }: { e: CasterEffect; x: number; y: number; r: number; t: number }) {
  const c = COLORS[e.kind === "fire-halo" ? "fire" : "lightning"];
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

/**
 * The arena turned to ice (FRU Thin Ice): a frosted pale-blue sheet over
 * the floor with a crackle of fine fracture lines, a bright sheen sweeping
 * across it, and its meaning written along the top edge. Fades in and out.
 */
function IceFloor({ e, x, y, r, t }: { e: CasterEffect; x: number; y: number; r: number; t: number }) {
  const opacity = Math.max(0, Math.min(1, (t - e.start) / 600, (e.end - t) / 600));
  if (opacity <= 0) return null;
  const id = `ice-${e.start}`;
  // Fracture lines: fixed per effect, so they don't crawl.
  const cracks: string[] = [];
  for (let k = 0; k < 26; k++) {
    const a = rand(e.start + k * 3.1) * Math.PI * 2;
    const d0 = r * (0.1 + 0.85 * rand(e.start + k * 7.7));
    let px = x + Math.sin(a) * d0, py = y - Math.cos(a) * d0;
    let d = `M${px.toFixed(1)} ${py.toFixed(1)}`;
    let dir = rand(e.start + k * 1.3) * Math.PI * 2;
    for (let s = 0; s < 3; s++) {
      const len = r * (0.06 + 0.08 * rand(e.start + k * 11 + s));
      dir += (rand(e.start + k * 5 + s) - 0.5) * 1.4;
      px += Math.sin(dir) * len; py -= Math.cos(dir) * len;
      d += ` L${px.toFixed(1)} ${py.toFixed(1)}`;
    }
    cracks.push(d);
  }
  // The sheen: a soft diagonal band sliding across every 2.4s.
  const sweep = ((t - e.start) % 2400) / 2400;
  const sx = x - r * 1.6 + sweep * r * 3.2;
  return (
    <g opacity={opacity} pointerEvents="none">
      <defs>
        <clipPath id={`${id}-clip`}><circle cx={x} cy={y} r={r} /></clipPath>
        <radialGradient id={`${id}-fill`} gradientUnits="userSpaceOnUse" cx={x} cy={y} r={r}>
          <stop offset="0%" stopColor="#e8f8ff" stopOpacity={0.16} />
          <stop offset="80%" stopColor="#bfe8ff" stopOpacity={0.26} />
          <stop offset="100%" stopColor="#9fd8ff" stopOpacity={0.45} />
        </radialGradient>
        <linearGradient id={`${id}-sheen`} gradientUnits="userSpaceOnUse" x1={sx - r * 0.25} y1={y} x2={sx + r * 0.25} y2={y}>
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0} />
          <stop offset="50%" stopColor="#ffffff" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
        </linearGradient>
      </defs>
      <circle cx={x} cy={y} r={r} fill={`url(#${id}-fill)`} />
      <g clipPath={`url(#${id}-clip)`}>
        {cracks.map((d, k) => <path key={k} d={d} fill="none" stroke="#f4fcff" strokeOpacity={0.45} strokeWidth={1.2} />)}
        <rect x={sx - r * 0.25} y={y - r} width={r * 0.5} height={r * 2} fill={`url(#${id}-sheen)`} transform={`rotate(25 ${sx} ${y})`} />
      </g>
      <circle cx={x} cy={y} r={r} fill="none" stroke="#dff5ff" strokeWidth={3} strokeOpacity={0.7} />
      <text x={x} y={y - r + 26} textAnchor="middle" fill="#dff5ff" fontSize={15} fontWeight={800}
        stroke="rgba(0,0,0,0.75)" strokeWidth={4} paintOrder="stroke">{e.label}</text>
    </g>
  );
}

/**
 * One of Mirror, Mirror's frozen mirrors on the arena edge, seen from
 * above: a tall slab of ice standing across the line to the centre, with
 * a frosted face, a glowing outline in its colour (blue fires first, with
 * Shiva; red after) and a slow glint. `cx, cy` is the arena centre it faces.
 */
function FrozenMirror({ e, x, y, cx, cy, size, t }: { e: CasterEffect; x: number; y: number; cx: number; cy: number; size: number; t: number }) {
  const opacity = Math.max(0, Math.min(1, (t - e.start) / 500, (e.end - t) / 300));
  if (opacity <= 0) return null;
  const col = e.kind === "blue-mirror" ? { glow: "#3d9bff", rim: "#bfe3ff" } : { glow: "#ff4d5e", rim: "#ffc4cb" };
  const deg = (Math.atan2(cx - x, -(cy - y)) * 180) / Math.PI;   // facing the centre
  const w = size, h = size * 0.34;
  const glint = ((t - e.start) % 2200) / 2200;
  return (
    <g opacity={opacity} pointerEvents="none" transform={`rotate(${deg} ${x} ${y})`}>
      <path d={`M${x - w / 2} ${y} L${x - w / 2 + h * 0.6} ${y - h / 2} L${x + w / 2 - h * 0.6} ${y - h / 2} L${x + w / 2} ${y} L${x + w / 2 - h * 0.6} ${y + h / 2} L${x - w / 2 + h * 0.6} ${y + h / 2} Z`}
        fill={col.glow} fillOpacity={0.35} stroke={col.glow} strokeWidth={12} strokeOpacity={0.45} filter="url(#replay-glow)" />
      <path d={`M${x - w / 2} ${y} L${x - w / 2 + h * 0.6} ${y - h / 2} L${x + w / 2 - h * 0.6} ${y - h / 2} L${x + w / 2} ${y} L${x + w / 2 - h * 0.6} ${y + h / 2} L${x - w / 2 + h * 0.6} ${y + h / 2} Z`}
        fill="#e9f6ff" fillOpacity={0.55} stroke={col.rim} strokeWidth={3} strokeLinejoin="round" />
      <line x1={x - w / 2 + h * 0.6} y1={y} x2={x + w / 2 - h * 0.6} y2={y} stroke="#ffffff" strokeOpacity={0.6} strokeWidth={1.5} />
      <line x1={x - w / 2 + w * glint} y1={y - h / 2 + 2} x2={x - w / 2 + w * glint - h * 0.5} y2={y + h / 2 - 2} stroke="#ffffff" strokeOpacity={0.8 * Math.sin(glint * Math.PI)} strokeWidth={3} strokeLinecap="round" />
    </g>
  );
}

/** The head: a horned wedge pointing along the direction of travel. */
function DragonHead({ p, c }: { p: { x: number; y: number; w: number; a: number }; c: (typeof COLORS)[keyof typeof COLORS] }) {
  // Travel is counterclockwise: the head faces along -a's tangent.
  const deg = (p.a * 180) / Math.PI - 90;
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

// ── P3 Oracle of Darkness ───────────────────────────────────────────────────

const fade = (e: CasterEffect, t: number, inMs: number, outMs: number) =>
  Math.max(0, Math.min(1, (t - e.start) / inMs, (e.end - t) / outMs));

const SPEED_COLORS = {
  "fru-hourglass-yellow": { glow: "#ffd23a", rim: "#fff1a8" },
  "fru-hourglass-purple": { glow: "#b45cff", rim: "#e6c8ff" },
  "fru-hourglass":        { glow: "#5fd16a", rim: "#d6ffd9" },
} as const;
const HOURGLASS_SIZE = 130;    // centi-yalms, body radius

/**
 * Ultimate Relativity's hourglass seen from above: three green glass lobes
 * round a dark core, ringed in its Speed colour (yellow fires first,
 * purple last, plain green in between), sand trickling in the middle.
 */
function Hourglass({ e, x, y, t, scale }: EffectArtProps) {
  const opacity = fade(e, t, 500, 400);
  if (opacity <= 0) return null;
  const c = SPEED_COLORS[e.kind as keyof typeof SPEED_COLORS] ?? SPEED_COLORS["fru-hourglass"];
  const r = HOURGLASS_SIZE * scale;
  const pulse = 0.75 + 0.25 * Math.sin(t / 260);
  return (
    <g opacity={opacity} pointerEvents="none">
      <circle cx={x} cy={y} r={r * 1.25} fill={c.glow} fillOpacity={0.18} stroke={c.glow} strokeWidth={6} strokeOpacity={0.55 * pulse} filter="url(#replay-glow)" />
      {[0, 120, 240].map((a) => {
        const b = (a * Math.PI) / 180;
        return <ellipse key={a} cx={x + Math.sin(b) * r * 0.5} cy={y - Math.cos(b) * r * 0.5} rx={r * 0.42} ry={r * 0.55}
          transform={`rotate(${a} ${x + Math.sin(b) * r * 0.5} ${y - Math.cos(b) * r * 0.5})`}
          fill="#7fe08a" fillOpacity={0.55} stroke="#d6ffd9" strokeWidth={1.5} />;
      })}
      <circle cx={x} cy={y} r={r * 0.22} fill="#2a3a2c" stroke={c.rim} strokeWidth={1.5} />
      <circle cx={x} cy={y} r={r * 1.25} fill="none" stroke={c.rim} strokeWidth={2} />
    </g>
  );
}

/**
 * The hourglass's turn: an arrow circling it, yellow clockwise or blue
 * counterclockwise as in game, crawling the way its beam will sweep.
 */
function SpinArrow({ e, x, y, t, scale }: EffectArtProps) {
  const opacity = fade(e, t, 300, 300);
  if (opacity <= 0) return null;
  const cw = e.kind === "fru-spin-cw";
  const col = cw ? "#ffd23a" : "#4aa8ff";
  const r = HOURGLASS_SIZE * scale * 1.8;
  const turn = (((t - e.start) / 1800) * 360 * (cw ? 1 : -1)) % 360;
  const span = 250;   // degrees of arc
  const p = (deg: number) => { const b = (deg * Math.PI) / 180; return `${x + Math.sin(b) * r} ${y - Math.cos(b) * r}`; };
  const a0 = cw ? 0 : span, a1 = cw ? span : 0;
  // Head at a1, pointing along the turn.
  const hb = (a1 * Math.PI) / 180, tx = Math.cos(hb) * (cw ? 1 : -1), ty = Math.sin(hb) * (cw ? 1 : -1);
  const hx = x + Math.sin(hb) * r, hy = y - Math.cos(hb) * r, s = 9;
  return (
    <g opacity={opacity} pointerEvents="none" transform={`rotate(${turn} ${x} ${y})`}>
      <path d={`M${p(a0)} A${r} ${r} 0 1 ${cw ? 1 : 0} ${p(a1)}`} fill="none" stroke={col} strokeWidth={8} strokeOpacity={0.4} filter="url(#replay-glow)" />
      <path d={`M${p(a0)} A${r} ${r} 0 1 ${cw ? 1 : 0} ${p(a1)}`} fill="none" stroke={col} strokeWidth={3} strokeLinecap="round" />
      <path d={`M${hx + tx * s} ${hy + ty * s} L${hx - ty * s * 0.7} ${hy + tx * s * 0.7} L${hx + ty * s * 0.7} ${hy - tx * s * 0.7} Z`} fill={col} />
    </g>
  );
}

/** Return's recorded spot: a blue clock face on the floor, hands ticking. */
function ReturnMarker({ e, x, y, t, scale }: EffectArtProps) {
  const opacity = fade(e, t, 300, 400);
  if (opacity <= 0) return null;
  const r = 90 * scale;
  const a = ((t - e.start) / 1000) * 30;   // the hand: 30° a second
  const hand = (deg: number, len: number) => { const b = (deg * Math.PI) / 180; return `M${x} ${y} L${x + Math.sin(b) * len} ${y - Math.cos(b) * len}`; };
  return (
    <g opacity={opacity} pointerEvents="none">
      <circle cx={x} cy={y} r={r} fill="#2f7dff" fillOpacity={0.25} stroke="#4aa8ff" strokeWidth={6} strokeOpacity={0.5} filter="url(#replay-glow)" />
      <circle cx={x} cy={y} r={r} fill="none" stroke="#bfe0ff" strokeWidth={2} />
      <path d={hand(a, r * 0.8)} stroke="#eaf6ff" strokeWidth={2} strokeLinecap="round" />
      <path d={hand(a / 12, r * 0.5)} stroke="#eaf6ff" strokeWidth={2.5} strokeLinecap="round" />
    </g>
  );
}

/**
 * Shadoweye about to go off on its holder: a red-violet eye beside the
 * player and a pulsing ring around them (anyone facing it gets Doom).
 */
function Shadoweye({ e, x, y, t }: EffectArtProps) {
  const opacity = fade(e, t, 400, 300);
  if (opacity <= 0) return null;
  const pulse = 0.6 + 0.4 * Math.sin(t / 180);
  const ex = x + 30, ey = y - 22, w = 13, h = 8;
  return (
    <g opacity={opacity} pointerEvents="none">
      <circle cx={x} cy={y} r={24} fill="none" stroke="#d1305f" strokeWidth={3} strokeOpacity={0.5 + 0.4 * pulse} filter="url(#replay-glow)" />
      <path d={`M${ex - w} ${ey} Q${ex} ${ey - h * 1.6} ${ex + w} ${ey} Q${ex} ${ey + h * 1.6} ${ex - w} ${ey} Z`} fill="#1a0610" stroke="#ff5a8a" strokeWidth={2} />
      <circle cx={ex} cy={ey} r={h * 0.75} fill="#ff2d6a" />
      <circle cx={ex} cy={ey} r={h * 0.3} fill="#1a0610" />
    </g>
  );
}

/**
 * Apocalypse's lights: on each side one starts on the ring at A0/B0 and
 * two leave the centre along that axis (one at the start, one 2s later),
 * all running round 45° every 2s until the sixth wave appears.
 */
const APOC_STEP_MS = 2000;
function ApocalypseLights({ e, x, y, t, scale, cx, cy }: EffectArtProps) {
  const opacity = fade(e, t, 300, 800);
  if (opacity <= 0) return null;
  const dir = e.kind === "fru-apocalypse-cw" ? 1 : -1;
  const ring = (e.radius ?? 1400) * scale;
  const a0 = Math.atan2(x - cx, -(y - cy));
  const run = Math.min(t - e.start, 5 * APOC_STEP_MS);
  const orbs: { x: number; y: number }[] = [];
  for (const side of [0, Math.PI]) {
    for (let i = 0; i < 3; i++) {
      const arrive = i * APOC_STEP_MS;           // reaches the ring at A0
      const leave = (i - 1) * APOC_STEP_MS;      // leaves the centre (the lead starts on the ring)
      if (run < Math.max(0, leave)) continue;
      let px: number, py: number;
      if (run < arrive) {
        const f = (run - leave) / APOC_STEP_MS;
        px = cx + Math.sin(a0 + side) * ring * f; py = cy - Math.cos(a0 + side) * ring * f;
      } else {
        const b = a0 + side + dir * (Math.PI / 4) * ((run - arrive) / APOC_STEP_MS);
        px = cx + Math.sin(b) * ring; py = cy - Math.cos(b) * ring;
      }
      orbs.push({ x: px, y: py });
    }
  }
  return (
    <g opacity={opacity} pointerEvents="none">
      {orbs.map((o, k) => (
        <g key={k}>
          <circle cx={o.x} cy={o.y} r={22} fill="#fff6d0" fillOpacity={0.6} filter="url(#replay-glow)" />
          <circle cx={o.x} cy={o.y} r={8} fill="#ffffff" stroke="#ffc94a" strokeWidth={2.5} />
        </g>
      ))}
      <text x={cx} y={cy + ring + 70 * scale + 18} textAnchor="middle" fill="#fff3c4" fontSize={14} fontWeight={800}
        stroke="rgba(0,0,0,0.8)" strokeWidth={4} paintOrder="stroke">{e.label}</text>
    </g>
  );
}

/**
 * An Apocalypse circle: in game a white circle expanding from where a
 * light crossed, shown ~10s before it explodes. Drawn as a thin pale ring
 * so six waves of them don't bury the party, filling in over its last 2s,
 * then a white-gold flash.
 */
function ApocalypseCircle({ s, x, y, r, t, opacity, resolving }: ShapeArtProps) {
  if (resolving) {
    return (
      <g opacity={opacity} pointerEvents="none">
        <circle cx={x} cy={y} r={r} fill="#fff1b8" fillOpacity={0.7} stroke="#ffe27a" strokeWidth={10} strokeOpacity={0.5} filter="url(#replay-glow)" />
        <circle cx={x} cy={y} r={r} fill="none" stroke="#ffffff" strokeWidth={2.5} />
      </g>
    );
  }
  const left = s.resolve - t;
  const grow = Math.min(1, (t - s.start) / 600);           // expands in as it appears
  const soon = Math.max(0, 1 - left / 2000);              // its last 2s
  return (
    <g pointerEvents="none">
      <circle cx={x} cy={y} r={r * grow} fill="#fff8e0" fillOpacity={0.3 * soon} stroke="#ffffff" strokeWidth={1.5 + 1.5 * soon} strokeOpacity={0.4 + 0.5 * soon} />
    </g>
  );
}

/** Speed's tethers: yellow (Quicken) or purple (Slow) with a bright orb in the middle. */
function speedTether(col: string) {
  return function SpeedTether({ x1, y1, x2, y2, t }: TetherArtProps) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const pulse = 0.8 + 0.2 * Math.sin(t / 150);
    return (
      <g pointerEvents="none">
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth={9} strokeOpacity={0.4} filter="url(#replay-glow)" />
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth={2.5} />
        <circle cx={mx} cy={my} r={9 * pulse} fill={col} fillOpacity={0.6} filter="url(#replay-glow)" />
        <circle cx={mx} cy={my} r={4} fill="#ffffff" />
      </g>
    );
  };
}

// The dragon circles just outside the boss's hitbox (the boss icon when
// the hitbox is small or unknown).
const Dragon = ({ e, x, y, t, scale, actor }: EffectArtProps) =>
  <ElementDragon e={e} x={x} y={y} r={Math.max(BOSS_ICON / 2 + 20, (actor?.hitbox ?? 500) * scale * 0.6)} t={t} />;
const Halo = ({ e, x, y, t, scale }: EffectArtProps) => <ElementHalo e={e} x={x} y={y} r={(e.radius ?? 0) * scale} t={t} />;
const Mirror = ({ e, x, y, t, scale, cx, cy }: EffectArtProps) => <FrozenMirror e={e} x={x} y={y} cx={cx} cy={cy} size={MIRROR_SIZE * scale} t={t} />;
const Ice = ({ e, x, y, t, scale }: EffectArtProps) => <IceFloor e={e} x={x} y={y} r={(e.radius ?? 2000) * scale} t={t} />;

export const FRU_ART: FightArt = {
  effects: {
    "fire-dragon": Dragon, "lightning-dragon": Dragon,
    "fire-halo": Halo, "lightning-halo": Halo,
    "blue-mirror": Mirror, "red-mirror": Mirror,
    "ice-floor": Ice,
    "fru-hourglass": Hourglass, "fru-hourglass-yellow": Hourglass, "fru-hourglass-purple": Hourglass,
    "fru-spin-cw": SpinArrow, "fru-spin-ccw": SpinArrow,
    "fru-return": ReturnMarker,
    "fru-shadoweye": Shadoweye,
    "fru-apocalypse-cw": ApocalypseLights, "fru-apocalypse-ccw": ApocalypseLights,
  },
  shapes: { "fru-apocalypse": ApocalypseCircle },
  tethers: { "fru-quicken": speedTether("#ffd23a"), "fru-slow": speedTether("#b45cff") },
};
