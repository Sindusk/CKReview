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

import type { EffectArtProps, FightArt, ShapeArtProps, TetherArtProps } from "./types";

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

const fade = (e: { start: number; end: number }, t: number, ms = 400) => Math.max(0, Math.min(1, (t - e.start) / ms, (e.end - t) / 200 + 0.3));

const Label = ({ x, y, text, color }: { x: number; y: number; text: string; color: string }) => text ? (
  <text x={x} y={y} textAnchor="middle" fill={color} fontSize={13} fontWeight={800} stroke="rgba(0,0,0,0.8)" strokeWidth={4} paintOrder="stroke">{text}</text>
) : null;

/**
 * Party Synergy's clones (P2): Omega-M (steel blue) with a sword (10y
 * circle: get out) or a shield (10-40y donut: get in), Omega-F (magenta)
 * with a staff (cross) or bare legs (both sides: stand in her line). Drawn
 * as a glowing figure ring with its weapon, from when it appears until it
 * strikes. Colours are a pick, not the game's (a VOD check).
 */
function Clone({ e, x, y, t }: EffectArtProps) {
  const o = fade(e, t);
  if (o <= 0) return null;
  const weapon = e.kind.slice("top-clone-".length);
  const male = weapon === "sword" || weapon === "shield";
  const col = male ? { glow: "#6aa8ff", rim: "#dbe9ff", deep: "#24407a" } : { glow: "#ff5fc8", rim: "#ffd6f1", deep: "#7a2460" };
  const s = 20;
  const pulse = 1 + 0.08 * Math.sin(t / 160);
  return (
    <g opacity={o} pointerEvents="none">
      <circle cx={x} cy={y} r={s * 1.5 * pulse} fill={col.glow} fillOpacity={0.25} stroke={col.glow} strokeWidth={6} strokeOpacity={0.4} filter="url(#replay-glow)" />
      <circle cx={x} cy={y} r={s * 1.25} fill={col.deep} fillOpacity={0.85} stroke={col.rim} strokeWidth={2} />
      {weapon === "sword" && (
        <g stroke={col.rim} strokeWidth={3} strokeLinecap="round">
          <line x1={x} y1={y - s * 0.95} x2={x} y2={y + s * 0.55} />
          <line x1={x - s * 0.45} y1={y + s * 0.35} x2={x + s * 0.45} y2={y + s * 0.35} />
          <line x1={x} y1={y + s * 0.55} x2={x} y2={y + s * 0.85} strokeWidth={4} />
        </g>
      )}
      {weapon === "shield" && (
        <path d={`M${x} ${y - s * 0.85} L${x + s * 0.7} ${y - s * 0.55} Q${x + s * 0.65} ${y + s * 0.45} ${x} ${y + s * 0.9} Q${x - s * 0.65} ${y + s * 0.45} ${x - s * 0.7} ${y - s * 0.55} Z`}
          fill={col.glow} fillOpacity={0.6} stroke={col.rim} strokeWidth={2.5} strokeLinejoin="round" />
      )}
      {weapon === "staff" && (
        <g>
          <line x1={x - s * 0.55} y1={y + s * 0.8} x2={x + s * 0.4} y2={y - s * 0.55} stroke={col.rim} strokeWidth={3} strokeLinecap="round" />
          <circle cx={x + s * 0.5} cy={y - s * 0.68} r={s * 0.28} fill={col.glow} stroke={col.rim} strokeWidth={2} />
        </g>
      )}
      {weapon === "legs" && (
        <g stroke={col.rim} strokeWidth={3.5} strokeLinecap="round" fill="none">
          <path d={`M${x - s * 0.15} ${y - s * 0.8} L${x - s * 0.35} ${y} L${x - s * 0.75} ${y + s * 0.7}`} />
          <path d={`M${x + s * 0.15} ${y - s * 0.8} L${x + s * 0.35} ${y} L${x + s * 0.75} ${y + s * 0.7}`} />
        </g>
      )}
      <Label x={x} y={y + s * 2.6} text={e.label} color={col.rim} />
    </g>
  );
}

/** The eye (optical unit) on the arena edge: relative north for the symbol rows. */
function Eye({ e, x, y, t }: EffectArtProps) {
  const o = fade(e, t);
  if (o <= 0) return null;
  const w = 26, h = 14;
  const look = Math.sin(t / 700) * 3;
  return (
    <g opacity={o} pointerEvents="none">
      <ellipse cx={x} cy={y} rx={w * 1.3} ry={h * 1.6} fill="#ff2040" fillOpacity={0.25} filter="url(#replay-glow)" />
      <path d={`M${x - w} ${y} Q${x} ${y - h * 1.6} ${x + w} ${y} Q${x} ${y + h * 1.6} ${x - w} ${y} Z`} fill="#f4f1ea" stroke="#5a0010" strokeWidth={2.5} />
      <circle cx={x + look} cy={y} r={h * 0.75} fill="#d01030" stroke="#5a0010" strokeWidth={1.5} />
      <circle cx={x + look} cy={y} r={h * 0.3} fill="#140004" />
      <Label x={x} y={y + h * 2.8} text={e.label} color="#ffb3c0" />
    </g>
  );
}

/** Party Synergy's PlayStation symbols over each pair (markers 416-419), in their usual colours. */
const SYMBOL_COLORS: Record<string, string> = { "416": "#ff4d4d", "417": "#3ddc84", "418": "#e070ff", "419": "#4da3ff" };
function SymbolMarker({ e, x, y, t }: EffectArtProps) {
  const o = fade(e, t, 200);
  if (o <= 0) return null;
  const id = e.kind.slice("top-symbol-".length);
  const c = SYMBOL_COLORS[id] ?? "#fff";
  // Under the player: the effects layer is beneath the icons, and the
  // status row above them would cover it.
  const cy = y + 34, s = 9;
  const shape = id === "416" ? <circle cx={x} cy={cy} r={s} />
    : id === "417" ? <path d={`M${x} ${cy - s * 1.1} L${x + s} ${cy + s * 0.7} L${x - s} ${cy + s * 0.7} Z`} />
    : id === "418" ? <rect x={x - s * 0.85} y={cy - s * 0.85} width={s * 1.7} height={s * 1.7} />
    : <path d={`M${x - s} ${cy - s} L${x + s} ${cy + s} M${x + s} ${cy - s} L${x - s} ${cy + s}`} />;
  return (
    <g opacity={o} pointerEvents="none">
      <circle cx={x} cy={cy} r={s * 1.7} fill="rgba(0,0,0,0.55)" />
      <g fill="none" stroke={c} strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round">{shape}</g>
    </g>
  );
}

/** Party Synergy's partner tether (222): a thin teal line between the two players of a symbol. */
function GlitchTether({ x1, y1, x2, y2, t }: TetherArtProps) {
  return (
    <g pointerEvents="none">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#34e0d0" strokeWidth={7} strokeOpacity={0.25} strokeLinecap="round" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#bff8f2" strokeWidth={2} strokeDasharray="6 6" strokeDashoffset={-(t / 30) % 12} strokeLinecap="round" />
    </g>
  );
}

/** Limitless Synergy's tank tether (84) from an outer clone to the tank who will take its Bladedance cone. */
function BladedanceTether({ x1, y1, x2, y2, t }: TetherArtProps) {
  const flick = 0.85 + 0.15 * Math.sin(t / 60);
  return (
    <g pointerEvents="none">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#b04dff" strokeWidth={12 * flick} strokeOpacity={0.4} strokeLinecap="round" filter="url(#replay-glow)" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f0dcff" strokeWidth={2.5} strokeLinecap="round" />
    </g>
  );
}

export const TOP_ART: FightArt = {
  effects: {
    "top-clone-sword": Clone, "top-clone-shield": Clone, "top-clone-staff": Clone, "top-clone-legs": Clone,
    "top-eye": Eye,
    "top-symbol-416": SymbolMarker, "top-symbol-417": SymbolMarker, "top-symbol-418": SymbolMarker, "top-symbol-419": SymbolMarker,
  },
  tethers: { "top-blaster": BlasterTether, "top-glitch": GlitchTether, "top-bladedance": BladedanceTether },
  shapes: { "top-ballistic": BallisticPuddle },
};
