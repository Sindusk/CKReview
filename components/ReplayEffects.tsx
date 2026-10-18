"use client";

// components/ReplayEffects.tsx
//
// Shared replay art any fight can use, drawn inside ReplayPanel's SVG (it
// uses the panel's #replay-glow filter) and animated from the replay's
// clock `t`, so scrubbing and pausing hold the frame. Fight-specific art
// lives in components/replay-art/<fight>.tsx.
//
// ElementTether: a fire or lightning tether. JailCage: a player held in a
// cage. ELEMENT_COLORS and rand for art in the same style.

export const BOLT_FRAME_MS = 90;     // lightning re-forks this often

export const ELEMENT_COLORS = {
  fire:      { glow: "#ff6a1a", hot: "#ffd36b", deep: "#c4280c", text: "#ffb066" },
  lightning: { glow: "#3d9bff", hot: "#e6f4ff", deep: "#2056d8", text: "#8cc8ff" },
};
const COLORS = ELEMENT_COLORS;

/** Deterministic 0..1 noise, so a paused frame doesn't shimmer. */
export const rand = (seed: number) => { const v = Math.sin(seed * 12.9898) * 43758.5453; return v - Math.floor(v); };

/**
 * A tether in its element (a fight spec's `tethers`): fire burns with a
 * flickering orange core and sparks drifting toward the player; lightning
 * is a white-hot jagged arc in blue glow, re-forked every few frames.
 * Source end at (x1, y1).
 */
export function ElementTether({ x1, y1, x2, y2, element, t }: { x1: number; y1: number; x2: number; y2: number; element: "fire" | "lightning"; t: number }) {
  const c = COLORS[element];
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
