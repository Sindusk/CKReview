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

const LAP_MS = 2600;          // one lap around the boss, counterclockwise (user, 2026-10-17)
const K = 0.6;                // body, flame and glow thickness (user: the first cut was too large)
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

/**
 * A tether in its element (lib/replay/action-shapes.ts's TETHER_KINDS):
 * fire burns with a flickering orange core and sparks drifting toward the
 * player; lightning is a white-hot jagged arc in blue glow, re-forked every
 * few frames. Source end at (x1, y1).
 */
export function ElementTether({ x1, y1, x2, y2, element, t }: { x1: number; y1: number; x2: number; y2: number; element: "fire" | "lightning"; t: number }) {
  const c = COLORS[element === "fire" ? "fire-dragon" : "lightning-dragon"];
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len < 1) return null;
  const ux = (x2 - x1) / len, uy = (y2 - y1) / len;   // along
  const px = -uy, py = ux;                              // across
  const at = (f: number, off: number) => `${x1 + ux * len * f + px * off} ${y1 + uy * len * f + py * off}`;
  if (element === "lightning") {
    const frame = Math.floor(t / BOLT_FRAME_MS);
    const n = Math.max(6, Math.round(len / 22));
    const arc = (seed: number, amp: number) => {
      let d = `M${x1} ${y1}`;
      for (let s = 1; s < n; s++) d += ` L${at(s / n, (rand(seed + s * 1.7) - 0.5) * amp)}`;
      return `${d} L${x2} ${y2}`;
    };
    return (
      <g pointerEvents="none">
        <path d={arc(frame * 7, 18)} fill="none" stroke={c.glow} strokeWidth={10} strokeOpacity={0.55} strokeLinejoin="round" filter="url(#replay-glow)" />
        <path d={arc(frame * 7 + 50, 14)} fill="none" stroke={c.glow} strokeWidth={1.5} strokeOpacity={0.8} strokeLinejoin="round" />
        <path d={arc(frame * 7, 18)} fill="none" stroke={c.hot} strokeWidth={2.5} strokeLinejoin="round" />
        <circle cx={x1} cy={y1} r={6} fill={c.hot} stroke={c.glow} strokeWidth={2} />
      </g>
    );
  }
  const flicker = 0.8 + 0.2 * Math.sin(t / 45);
  return (
    <g pointerEvents="none">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c.glow} strokeWidth={20 * flicker} strokeOpacity={0.55} strokeLinecap="round" filter="url(#replay-glow)" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c.deep} strokeWidth={7} strokeLinecap="round" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c.hot} strokeWidth={3} strokeLinecap="round"
        strokeDasharray="14 8" strokeDashoffset={-(t / 8) % 22} />
      {Array.from({ length: 5 }, (_, k) => {
        // Sparks running from the source to the player.
        const f = ((t / 900) + k / 5) % 1;
        return <circle key={k} cx={x1 + ux * len * f + px * (rand(k + Math.floor(t / 900)) - 0.5) * 8} cy={y1 + uy * len * f + py * (rand(k * 3 + Math.floor(t / 900)) - 0.5) * 8}
          r={2.2} fill={c.hot} fillOpacity={0.9} />;
      })}
      <circle cx={x1} cy={y1} r={6} fill={c.hot} stroke={c.deep} strokeWidth={2} />
    </g>
  );
}

/**
 * A player held aloft in a cage (FRU Floating Fetters): a pale cyan
 * bubble with vertical bars around the icon, a ring at top and bottom, and
 * a swirl turning inside. Snaps in over 150ms and brightens until the hit.
 */
export function JailCage({ x, y, r, t, start, end }: { x: number; y: number; r: number; t: number; start: number; end: number }) {
  const R = r * 1.35;
  const appear = Math.min(1, (t - start) / 150);
  const final = Math.max(0, Math.min(1, (t - start) / Math.max(1, end - start)));   // 0 → 1 as it closes in
  const bars = 5;
  const turn = (t / 15) % 360;
  return (
    <g pointerEvents="none" opacity={appear}>
      <circle cx={x} cy={y} r={R} fill="#7fe3ff" fillOpacity={0.12 + 0.12 * final} stroke="#7fe3ff" strokeWidth={8} strokeOpacity={0.35} filter="url(#replay-glow)" />
      <ellipse cx={x} cy={y} rx={R * 0.95} ry={R * 0.95} fill="none" stroke="#e8fbff" strokeOpacity={0.4} strokeWidth={2}
        strokeDasharray={`${R * 0.6} ${R * 0.35}`} transform={`rotate(${turn} ${x} ${y})`} />
      {Array.from({ length: bars }, (_, k) => {
        // Vertical bars across the bubble, bowed like a sphere's meridians.
        const f = (k + 0.5) / bars * 2 - 1;      // -1..1 across
        const bx = x + f * R * 0.92;
        const h = Math.sqrt(Math.max(0, 1 - f * f)) * R;
        return <line key={k} x1={bx} y1={y - h} x2={bx} y2={y + h} stroke="#d8f7ff" strokeWidth={1.5 + final} strokeOpacity={0.55 + 0.35 * final} strokeLinecap="round" />;
      })}
      <ellipse cx={x} cy={y - R * 0.82} rx={R * 0.58} ry={R * 0.14} fill="none" stroke="#f2fdff" strokeWidth={2.5} />
      <ellipse cx={x} cy={y + R * 0.82} rx={R * 0.58} ry={R * 0.14} fill="none" stroke="#f2fdff" strokeWidth={2.5} />
      <circle cx={x} cy={y} r={R} fill="none" stroke="#f2fdff" strokeWidth={2} strokeOpacity={0.9} />
    </g>
  );
}

/**
 * The arena turned to ice (FRU Thin Ice): a frosted pale-blue sheet over
 * the floor with a crackle of fine fracture lines, a bright sheen sweeping
 * across it, and its meaning written along the top edge. Fades in and out.
 */
export function IceFloor({ e, x, y, r, t }: { e: CasterEffect; x: number; y: number; r: number; t: number }) {
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
export function FrozenMirror({ e, x, y, cx, cy, size, t }: { e: CasterEffect; x: number; y: number; cx: number; cy: number; size: number; t: number }) {
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
