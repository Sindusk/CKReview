"use client";

// components/replay-art/dancingmad.tsx
//
// Dancing Mad's replay art (types.ts), for the cues built in
// lib/mechanics/ffxiv/dancingmad/replay.ts.
//
// MysteryRing: Mystery Magic's element rings around Kefka, two orbs each,
// "?" orbs when the ring is inverted. FakeTelegraph: the floor telegraph an
// inverted ring shows, an empty dashed outline that hits nobody. GravityWell:
// Gravitas's bubble on the floor. ArrowSigil: a Tele-Trouncing sigil.
// StatueEye: Graven Image III's gaze.

import type { AoeShape } from "@/lib/replay/action-shapes";
import { ELEMENT_COLORS, rand } from "@/components/ReplayEffects";
import { poseAt } from "@/lib/replay/ffxiv-replay";
import type { EffectArtProps, FightArt, ShapeArtProps, TetherArtProps } from "./types";

const FADE_MS = 400;
const fade = (t: number, start: number, end: number, ms = FADE_MS) => Math.max(0, Math.min(1, (t - start) / ms, (end - t) / ms));

const ELEMENTS = {
  fire:    { ring: ELEMENT_COLORS.fire.glow, hot: ELEMENT_COLORS.fire.hot, text: ELEMENT_COLORS.fire.text },
  ice:     { ring: "#9fdcff", hot: "#ffffff", text: "#cfeeff" },
  thunder: { ring: "#b06bff", hot: "#efe0ff", text: "#d6b8ff" },   // in game the thunder ring reads violet
};
type Element = keyof typeof ELEMENTS;

const LABEL = { stroke: "rgba(0,0,0,0.8)", strokeWidth: 4, paintOrder: "stroke" as const, fontWeight: 800, textAnchor: "middle" as const };

/** One element ring around the boss, its two orbs turning; "?" on them when inverted. */
function MysteryRing({ e, x, y, t, scale, element, inverted }: EffectArtProps & { element: Element; inverted: boolean }) {
  const o = fade(t, e.start, e.end);
  if (o <= 0) return null;
  const c = ELEMENTS[element];
  const r = (e.radius ?? 400) * scale;
  const spin = ((t - e.start) / 3000) * Math.PI * 2 * (element === "ice" ? -1 : 1);
  const orb = Math.max(7, r * 0.16);
  return (
    <g opacity={o} pointerEvents="none">
      <circle cx={x} cy={y} r={r} fill="none" stroke={c.ring} strokeWidth={9} strokeOpacity={0.35} filter="url(#replay-glow)" />
      <circle cx={x} cy={y} r={r} fill="none" stroke={c.ring} strokeWidth={2.5} strokeDasharray={inverted ? "6 5" : undefined} />
      {[0, Math.PI].map((a0, k) => {
        const a = spin + a0;
        const ox = x + Math.sin(a) * r, oy = y - Math.cos(a) * r;
        return (
          <g key={k}>
            <circle cx={ox} cy={oy} r={orb} fill={c.ring} fillOpacity={0.9} stroke={c.hot} strokeWidth={1.5} filter="url(#replay-glow)" />
            {inverted && <text x={ox} y={oy + orb * 0.45} fontSize={orb * 1.3} fill="#1a1024" {...LABEL} stroke="none">?</text>}
          </g>
        );
      })}
      {e.label && (
        <text x={x} y={y + r + 22} fontSize={14} fill={c.text} {...LABEL}>{e.label}</text>
      )}
    </g>
  );
}

/** SVG path of a cone or rect shape at (x, y), range r (SVG units). */
function shapePath(s: AoeShape, x: number, y: number, r: number, scale: number): string {
  const b = (s.bearing * Math.PI) / 180;
  if (s.kind === "cone") {
    const h = ((s.angle / 2) * Math.PI) / 180;
    const p = (a: number) => `${x + Math.sin(a) * r} ${y - Math.cos(a) * r}`;
    return `M${x} ${y} L${p(b - h)} A${r} ${r} 0 ${s.angle > 180 ? 1 : 0} 1 ${p(b + h)} Z`;
  }
  if (s.kind === "rect") {
    const w = (s.width * scale) / 2;
    const ux = Math.sin(b), uy = -Math.cos(b), px = -uy, py = ux;
    return `M${x + px * w} ${y + py * w} L${x + ux * r + px * w} ${y + uy * r + py * w} L${x + ux * r - px * w} ${y + uy * r - py * w} L${x - px * w} ${y - py * w} Z`;
  }
  return `M${x - r} ${y} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
}

/**
 * The telegraph an inverted Mystery Magic ring shows: what the game draws,
 * but it damages nobody (the real AoE is everything else). An empty dashed
 * outline in the element's colour with "?" marks, gone when the cast ends.
 */
function FakeTelegraph({ s, x, y, r, scale, opacity, resolving, element }: ShapeArtProps & { element: Element }) {
  if (resolving) return null;
  const c = ELEMENTS[element];
  const d = shapePath(s, x, y, r, scale);
  // "?" marks along the shape's middle line.
  const b = (s.bearing * Math.PI) / 180;
  const marks = s.kind === "cone" ? [0.35, 0.65] : [0.3, 0.55, 0.8];
  return (
    <g opacity={opacity} pointerEvents="none">
      <path d={d} fill={c.ring} fillOpacity={0.1} stroke="#1a1024" strokeWidth={6} strokeOpacity={0.35} strokeDasharray="12 8" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={c.ring} strokeWidth={3} strokeDasharray="12 8" strokeLinejoin="round" />
      {marks.map((f, k) => (
        <text key={k} x={x + Math.sin(b) * r * f} y={y - Math.cos(b) * r * f + 8} fontSize={22} fill={c.text} {...LABEL}>?</text>
      ))}
    </g>
  );
}

/** Gravitas's gravity well: a dark violet bubble with a slow swirl, until it's soaked or bursts. */
function GravityWell({ s, x, y, r, t, uid }: ShapeArtProps) {
  const o = fade(t, s.start, s.resolve, 500);
  if (o <= 0) return null;
  const spin = ((t - s.start) / 25) % 360;
  const pulse = 0.5 + 0.5 * Math.sin((t - s.start) / 400);
  const g = `dm-well-${uid}`;
  return (
    <g opacity={o} pointerEvents="none">
      <defs>
        <radialGradient id={g} gradientUnits="userSpaceOnUse" cx={x} cy={y} r={Math.max(1, r)}>
          <stop offset="0%" stopColor="#12061e" stopOpacity={0.75} />
          <stop offset="70%" stopColor="#5a2a9a" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#c08cff" stopOpacity={0.8} />
        </radialGradient>
      </defs>
      <circle cx={x} cy={y} r={r} fill={`url(#${g})`} stroke="#c08cff" strokeWidth={8} strokeOpacity={0.25 + 0.2 * pulse} filter="url(#replay-glow)" />
      <circle cx={x} cy={y} r={r * 0.62} fill="none" stroke="#e2cbff" strokeWidth={2} strokeOpacity={0.7}
        strokeDasharray={`${r * 0.5} ${r * 0.3}`} transform={`rotate(${spin} ${x} ${y})`} />
      <circle cx={x} cy={y} r={r} fill="none" stroke="#e8d6ff" strokeWidth={1.5} />
    </g>
  );
}

/** A Tele-Trouncing sigil: a glowing pad with an arrow pointing where it sends you. */
function ArrowSigil({ s, x, y, t, scale }: ShapeArtProps) {
  const o = fade(t, s.start, s.resolve, 300);
  if (o <= 0) return null;
  const R = Math.max(10, s.range * scale);
  const glow = 0.6 + 0.4 * Math.sin((t - s.start) / 250 + rand(s.start + x) * 6);
  return (
    <g opacity={o} pointerEvents="none" transform={`rotate(${s.bearing} ${x} ${y})`}>
      <circle cx={x} cy={y} r={R} fill="#2a1a4a" fillOpacity={0.55} stroke="#ffd54a" strokeWidth={6} strokeOpacity={0.35 * glow} filter="url(#replay-glow)" />
      <circle cx={x} cy={y} r={R} fill="none" stroke="#ffe48a" strokeWidth={2} />
      <path d={`M${x} ${y - R * 0.8} L${x + R * 0.55} ${y - R * 0.1} L${x + R * 0.2} ${y - R * 0.1} L${x + R * 0.2} ${y + R * 0.7} L${x - R * 0.2} ${y + R * 0.7} L${x - R * 0.2} ${y - R * 0.1} L${x - R * 0.55} ${y - R * 0.1} Z`}
        fill="#ffe48a" stroke="#7a4a00" strokeWidth={1.2} strokeLinejoin="round" />
    </g>
  );
}

/** The statue's eye at the arena edge toward it: gold = look at it, purple = look away. */
function StatueEye({ e, x, y, t, look }: EffectArtProps & { look: boolean }) {
  const o = fade(t, e.start, e.end, 300);
  if (o <= 0) return null;
  const c = look ? { iris: "#ffd54a", glow: "#ffcf3a", text: "#ffe48a" } : { iris: "#b06bff", glow: "#9a4dff", text: "#d6b8ff" };
  const w = 30, h = 15;
  return (
    <g opacity={o} pointerEvents="none">
      <path d={`M${x - w} ${y} Q${x} ${y - h * 1.6} ${x + w} ${y} Q${x} ${y + h * 1.6} ${x - w} ${y} Z`} fill="#140a1e" fillOpacity={0.85}
        stroke={c.glow} strokeWidth={8} strokeOpacity={0.4} filter="url(#replay-glow)" />
      <path d={`M${x - w} ${y} Q${x} ${y - h * 1.6} ${x + w} ${y} Q${x} ${y + h * 1.6} ${x - w} ${y} Z`} fill="none" stroke={c.iris} strokeWidth={2.5} />
      <circle cx={x} cy={y} r={h * 0.7} fill={c.iris} />
      <circle cx={x} cy={y} r={h * 0.3} fill="#140a1e" />
      {look && <text x={x} y={y - h - 8} fontSize={16} fill={c.text} {...LABEL}>?</text>}
      <text x={x} y={y + h + 24} fontSize={14} fill={c.text} {...LABEL}>{e.label}</text>
    </g>
  );
}

/** A statue tether in its hand's colour, a bead of light running down it to the player. */
function StatueTether({ x1, y1, x2, y2, t, color }: TetherArtProps & { color: string }) {
  const f = (t / 900) % 1;
  return (
    <g pointerEvents="none">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={12} strokeOpacity={0.35} strokeLinecap="round" filter="url(#replay-glow)" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={4} strokeLinecap="round" />
      <circle cx={x1 + (x2 - x1) * f} cy={y1 + (y2 - y1) * f} r={5} fill="#fff" fillOpacity={0.9} />
    </g>
  );
}

/**
 * A Trine tip: a thin gold ring with a turning triangle from when its set
 * descends, filling in over its last 2s.
 */
function TrineTip({ s, x, y, r, t, resolving, opacity }: ShapeArtProps) {
  const left = s.resolve - t;
  const fill = resolving ? 0.75 : Math.max(0.06, Math.min(0.5, 0.5 * (1 - left / 2000)));
  const spin = ((t - s.start) / 30) % 360;
  const k = r * 0.45;
  return (
    <g opacity={opacity} pointerEvents="none">
      <circle cx={x} cy={y} r={r} fill={resolving ? "#fff3c4" : "#ffc95a"} fillOpacity={fill} stroke="#ffdf8a" strokeWidth={2} />
      <path d={`M${x} ${y - k} L${x + k * 0.87} ${y + k * 0.5} L${x - k * 0.87} ${y + k * 0.5} Z`} fill="none" stroke="#fff6d8" strokeWidth={2}
        transform={`rotate(${spin} ${x} ${y})`} />
    </g>
  );
}

/**
 * Future's / Past's End: a Kefka clone (a pale ghost ring; Kefka himself
 * has his icon) with the side All Things Ending will cleave marked by a
 * red half-disc: in front for Future's End, behind for Past's. Placed and
 * turned as the caster stood when the cleave went off.
 */
function EndsCaster({ e, x, y, t, scale, actor, past }: EffectArtProps & { past: boolean }) {
  const o = fade(t, e.start, e.end, 300);
  if (o <= 0 || !actor) return null;
  const s = actor.samples.reduce((b, q) => (Math.abs(q[0] - e.end) < Math.abs(b[0] - e.end) ? q : b), actor.samples[0]);
  const now = poseAt(actor, t);
  const at = now && !now.stale ? { x: x + (s[1] - now.x) * scale, y: y + (s[2] - now.y) * scale } : { x, y };
  const bearing = (((s[3] * 180) / Math.PI / 100 + 90) % 360 + 360) % 360 + (past ? 180 : 0);
  const R = Math.max(26, 350 * scale);
  const b = (bearing * Math.PI) / 180;
  const p = (a: number) => `${at.x + Math.sin(a) * R} ${at.y - Math.cos(a) * R}`;
  const boss = actor.samples.length > 50;
  return (
    <g opacity={o} pointerEvents="none">
      <path d={`M${p(b - Math.PI / 2)} A${R} ${R} 0 0 1 ${p(b + Math.PI / 2)} Z`} fill="#d9342b" fillOpacity={0.35} stroke="#ff7a70" strokeWidth={2} />
      {!boss && <circle cx={at.x} cy={at.y} r={R * 0.45} fill="#e9d8ff" fillOpacity={0.35} stroke="#c9a8ff" strokeWidth={2} strokeDasharray="4 3" />}
      {e.label && <text x={at.x} y={at.y + R + 22} fontSize={14} fill="#ffb3ab" {...LABEL}>{e.label}</text>}
    </g>
  );
}

/** Bowels of Agony's sigils on the floor: a fire triangle, a water square, a wind diamond. */
function Sigil({ e, x, y, t, scale, el }: EffectArtProps & { el: "fire" | "water" | "wind" }) {
  const o = fade(t, e.start, e.end);
  if (o <= 0) return null;
  const c = el === "fire" ? { glow: "#ff6a1a", line: "#ffd36b" } : el === "water" ? { glow: "#2f8dff", line: "#bfe3ff" } : { glow: "#3fd08a", line: "#c8ffe0" };
  const R = Math.max(14, 250 * scale);
  const pts = el === "fire" ? [0, 120, 240] : el === "water" ? [45, 135, 225, 315] : [0, 90, 180, 270];
  const spin = ((t - e.start) / 60) % 360;
  const d = pts.map((a, i) => `${i ? "L" : "M"}${x + Math.sin((a * Math.PI) / 180) * R} ${y - Math.cos((a * Math.PI) / 180) * R}`).join(" ") + " Z";
  return (
    <g opacity={o} pointerEvents="none">
      <circle cx={x} cy={y} r={R * 1.25} fill={c.glow} fillOpacity={0.12} stroke={c.glow} strokeWidth={2} strokeOpacity={0.6}
        strokeDasharray="5 4" transform={`rotate(${spin} ${x} ${y})`} />
      <path d={d} fill={c.glow} fillOpacity={0.3} stroke={c.line} strokeWidth={2.5} strokeLinejoin="round" filter="url(#replay-glow)" />
    </g>
  );
}

/** A Limit Cut clone on the rim: a pale Kefka ghost with its number. */
function LimitCutClone({ e, x, y, t }: EffectArtProps) {
  const o = fade(t, e.start, e.end, 250);
  if (o <= 0) return null;
  return (
    <g opacity={o} pointerEvents="none">
      <circle cx={x} cy={y} r={15} fill="#e9d8ff" fillOpacity={0.5} stroke="#c9a8ff" strokeWidth={2.5} strokeDasharray="4 3" />
      {e.label && <text x={x} y={y + 6} fontSize={17} fill="#fff" {...LABEL}>{e.label}</text>}
    </g>
  );
}

/** A Limit Cut number over its player: a violet badge with the number, as the game's. */
function LimitCutNumber({ e, x, y, t }: EffectArtProps) {
  const o = fade(t, e.start, e.end, 200);
  if (o <= 0) return null;
  const by = y - 40;
  return (
    <g opacity={o} pointerEvents="none">
      <path d={`M${x} ${by - 13} L${x + 13} ${by} L${x} ${by + 13} L${x - 13} ${by} Z`} fill="#4a1f8a" stroke="#d6b8ff" strokeWidth={2} filter="url(#replay-glow)" />
      <text x={x} y={by + 6} fontSize={16} fill="#fff" {...LABEL} strokeWidth={3}>{e.label}</text>
    </g>
  );
}

/** A small black hole: a dark swirl with a violet rim. */
function BlackHole({ e, x, y, t }: EffectArtProps) {
  const o = fade(t, e.start, e.end, 300);
  if (o <= 0) return null;
  const spin = ((t - e.start) / 8) % 360;
  return (
    <g opacity={o} pointerEvents="none">
      <circle cx={x} cy={y} r={14} fill="#0a0410" stroke="#8a4dff" strokeWidth={6} strokeOpacity={0.45} filter="url(#replay-glow)" />
      <circle cx={x} cy={y} r={10} fill="none" stroke="#c9a8ff" strokeWidth={2} strokeDasharray="9 6" transform={`rotate(${-spin} ${x} ${y})`} />
    </g>
  );
}

/** A black hole's tether: a thin dark-violet line with a pulse running toward the player. */
function VoidTether({ x1, y1, x2, y2, t }: TetherArtProps) {
  const f = (t / 700) % 1;
  return (
    <g pointerEvents="none">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#5a1fb0" strokeWidth={10} strokeOpacity={0.4} strokeLinecap="round" filter="url(#replay-glow)" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#2a0a4a" strokeWidth={4} strokeLinecap="round" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c9a8ff" strokeWidth={1.5} strokeLinecap="round" />
      <circle cx={x1 + (x2 - x1) * f} cy={y1 + (y2 - y1) * f} r={4} fill="#e2cbff" />
    </g>
  );
}

/** Cursed Shriek on its holder for its last seconds: a violet eye above them (look at or away unknown). */
function ShriekEye({ e, x, y, t }: EffectArtProps) {
  const o = fade(t, e.start, e.end, 250);
  if (o <= 0) return null;
  const by = y - 42, w = 14, h = 7;
  return (
    <g opacity={o} pointerEvents="none">
      <path d={`M${x - w} ${by} Q${x} ${by - h * 1.6} ${x + w} ${by} Q${x} ${by + h * 1.6} ${x - w} ${by} Z`} fill="#140a1e" stroke="#b06bff" strokeWidth={2} filter="url(#replay-glow)" />
      <circle cx={x} cy={by} r={h * 0.65} fill="#d6b8ff" />
    </g>
  );
}

/** A Celestriad tower in its element's colour, with its soaker count. */
function ElementTower({ s, x, y, r, t, opacity, resolving, element }: ShapeArtProps & { element: "fire" | "ice" | "thunder" }) {
  const c = element === "fire" ? { ring: "#ff6a1a", core: "#5a1a08", text: "#ffd36b" }
    : element === "ice" ? { ring: "#9fdcff", core: "#0e2a40", text: "#e6f6ff" } : { ring: "#b06bff", core: "#24103e", text: "#efe0ff" };
  const pulse = 0.5 + 0.5 * Math.sin((t - s.start) / 300);
  return (
    <g opacity={opacity} pointerEvents="none">
      <circle cx={x} cy={y} r={r} fill={c.core} fillOpacity={resolving ? 0.5 : 0.65} stroke={c.ring} strokeWidth={8} strokeOpacity={0.3 + 0.2 * pulse} filter="url(#replay-glow)" />
      <circle cx={x} cy={y} r={r} fill="none" stroke={resolving ? "#ffffff" : c.ring} strokeWidth={3} />
      {s.soakers !== undefined && <text x={x} y={y + 6} fontSize={17} fill={c.text} {...LABEL} strokeWidth={3}>{s.soakers}</text>}
    </g>
  );
}

/** Forsaken's dark ground: a black pool with a violet rim that stays. */
function DarkGround({ s, x, y, r, t }: ShapeArtProps) {
  const o = fade(t, s.start, s.resolve, 400);
  if (o <= 0) return null;
  // Relative to each circle's own box, so every copy of the id is the same
  // gradient (the panel's uids repeat between shapes).
  const g = "dm-dark-ground";
  return (
    <g opacity={o} pointerEvents="none">
      <defs>
        <radialGradient id={g}>
          <stop offset="0%" stopColor="#05020a" stopOpacity={0.85} />
          <stop offset="85%" stopColor="#1a0a2e" stopOpacity={0.8} />
          <stop offset="100%" stopColor="#6a3aa8" stopOpacity={0.9} />
        </radialGradient>
      </defs>
      <circle cx={x} cy={y} r={r} fill={`url(#${g})`} stroke="#8a5ad0" strokeWidth={2} />
    </g>
  );
}

/** Catastrophic Choice's staff on Kefka: yellow earth (Quake) or green wind (Tornado), with what to do. */
function ChoiceStaff({ e, x, y, t, quake }: EffectArtProps & { quake: boolean }) {
  const o = fade(t, e.start, e.end, 300);
  if (o <= 0) return null;
  const c = quake ? { glow: "#e8b83a", text: "#ffe48a" } : { glow: "#3fd08a", text: "#c8ffe0" };
  return (
    <g opacity={o} pointerEvents="none">
      <circle cx={x} cy={y} r={34} fill="none" stroke={c.glow} strokeWidth={8} strokeOpacity={0.45} filter="url(#replay-glow)" />
      <circle cx={x} cy={y} r={34} fill="none" stroke={c.glow} strokeWidth={2.5} strokeDasharray={quake ? undefined : "8 5"} />
      <text x={x} y={y + 58} fontSize={14} fill={c.text} {...LABEL}>{e.label}</text>
    </g>
  );
}

const ring = (element: Element, inverted: boolean) => (p: EffectArtProps) => <MysteryRing {...p} element={element} inverted={inverted} />;

export const DANCING_MAD_ART: FightArt = {
  effects: {
    "dm-ring-fire": ring("fire", false), "dm-ring-fire-inv": ring("fire", true),
    "dm-ring-ice": ring("ice", false), "dm-ring-ice-inv": ring("ice", true),
    "dm-ring-thunder": ring("thunder", false), "dm-ring-thunder-inv": ring("thunder", true),
    "dm-gaze-look": (p) => <StatueEye {...p} look />,
    "dm-gaze-away": (p) => <StatueEye {...p} look={false} />,
    "dm-future": (p) => <EndsCaster {...p} past={false} />,
    "dm-past": (p) => <EndsCaster {...p} past />,
    "dm-sigil-fire": (p) => <Sigil {...p} el="fire" />,
    "dm-sigil-water": (p) => <Sigil {...p} el="water" />,
    "dm-sigil-wind": (p) => <Sigil {...p} el="wind" />,
    "dm-lc-clone": LimitCutClone,
    "dm-lc-number": LimitCutNumber,
    "dm-black-hole": BlackHole,
    "dm-shriek": ShriekEye,
    "dm-choice-quake": (p) => <ChoiceStaff {...p} quake />,
    "dm-choice-tornado": (p) => <ChoiceStaff {...p} quake={false} />,
  },
  // Flood of Naught's Antilights.
  colors: {
    "dm-white": { fill: "#f4f1ea", flash: "#ffffff", rim: "#ffffff", glow: "#fffbe8" },
    "dm-black": { fill: "#1c1424", flash: "#3a2a4a", rim: "#b9a6d6", glow: "#4a2a6a" },
  },
  shapes: {
    "dm-fake-ice": (p) => <FakeTelegraph {...p} element="ice" />,
    "dm-fake-thunder": (p) => <FakeTelegraph {...p} element="thunder" />,
    "dm-well": GravityWell,
    "dm-arrow": ArrowSigil,
    "dm-trine": TrineTip,
    "dm-tower-fire": (p) => <ElementTower {...p} element="fire" />,
    "dm-tower-ice": (p) => <ElementTower {...p} element="ice" />,
    "dm-tower-thunder": (p) => <ElementTower {...p} element="thunder" />,
    "dm-dark-ground": DarkGround,
  },
  tethers: {
    "dm-yellow": (p) => <StatueTether {...p} color="#ffd23a" />,
    "dm-purple": (p) => <StatueTether {...p} color="#a35cff" />,
    "dm-void": VoidTether,
  },
};
