"use client";

// components/ReplayPanel.tsx
//
// Top-down replay of the selected pull, styled after strategy-guide
// diagrams: the fight's in-game map (XIVAPI's copy of the texture), job
// icons for players, FFLogs' Boss icon for bosses with their hitbox ring
// and front marker, and every enemy AoE at its game-data size as a blue
// shape with a white rim (lib/replay/action-shapes.ts; dashed = cone angle
// or donut hole estimated). Hovering an actor shows its name, strategy
// slot (MT, OT, H1 ... from lib/mechanics/ffxiv/roles.ts), coordinates and
// HP; clicking one pins its hitbox ring. Tracks come from
// lib/replay/ffxiv-replay.ts; page.tsx loads them only when the user
// clicks Load replay (one FFLogs fetch per pull, never on navigation).
//
// Two clocks:
// - `syncedTimeMs` set: the VOD drives the replay (playback time from
//   useTimelineController). The page's own timeline bar stays under the
//   replay, so seeking is done there; this panel only adds play/pause for
//   the hidden video. The video reports its time ~5 times a second, so
//   between reports the panel runs the clock forward itself while the
//   video is playing, which keeps the dots moving smoothly.
// - No VOD synced: the panel keeps its own clock with play/pause, speed
//   and scrubber.

import { useEffect, useMemo, useRef, useState } from "react";
import type { Pull } from "@/types/Pull";
import { ffMapImageUrl, fitReplayView, mapImageBounds, poseAt, type ReplayActor, type ReplayData, type ReplayPose } from "@/lib/replay/ffxiv-replay";
import { aoesAt, buildAoeShapes, buildTethers, type AoeShape } from "@/lib/replay/action-shapes";
import { sampleNear } from "@/lib/replay/ffxiv-replay";
import { facingToCompassBearing } from "@/lib/mechanics/geometry";
import { detectFFRoles } from "@/lib/mechanics/ffxiv/roles";
import { getClassColor, getPlayerClassIcon, getRoleColor } from "@/lib/player-display";

function formatMs(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

type Props = {
  pull:          Pull | null;
  data:          ReplayData | null;
  loading:       boolean;
  progress:      number | null;   // 0..1 while a live fetch pages through
  error:         string | null;
  onLoad:        () => void;
  syncedTimeMs?: number;          // VOD playback time; undefined = own clock
  vodPlaying?:   boolean;         // the synced video's own play state
  onVodPlay?:    () => void;      // play/pause drive the hidden video when synced
  onVodPause?:   () => void;
};

const SPEEDS = [0.5, 1, 2, 4];
// How far past the last VOD report the panel extrapolates. A little over
// the report interval: if reports stop (paused, buffering), the dots stop.
const MAX_EXTRAPOLATE_MS = 350;
// FFLogs' own actor icons ("Boss", "NPC"), the CDN the app already uses
// for ability icons (lib/ability-icons.ts).
const FFLOGS_ICON = (name: string) => `https://assets.rpglogs.com/img/ff/icons/${name}.png`;
// Guide-style AoE colours by kind: blue AoEs, yellow towers, purple
// tankbusters; white rims. `flash` is the fill as it resolves.
const AOE_COLORS: Record<AoeShape["style"], { fill: string; flash: string; rim: string; glow: string }> = {
  aoe:        { fill: "#2f5bff", flash: "#7fa2ff", rim: "#dfe8ff", glow: "#5f8bff" },
  tower:      { fill: "#f2c230", flash: "#ffe27a", rim: "#fff6c8", glow: "#ffb84a" },   // non-circle towers only; circles use Tower
  tankbuster: { fill: "#8a3dff", flash: "#c99bff", rim: "#f1e2ff", glow: "#b47bff" },
};
const PLAYER_ICON = 34;   // SVG units, at icon scale 1
const BOSS_ICON = 46;
const TETHER_COLOR = "#ff5fd2";
// A tether's source is often a helper with sparse samples; take its
// nearest one within this window.
const TETHER_LOOKUP_MS = 20000;
const GRID_STEP = 500;    // 5y, centi-yalms

export default function ReplayPanel({ pull, data, loading, progress, error, onLoad, syncedTimeMs, vodPlaying = false, onVodPlay, onVodPause }: Props) {
  const synced = syncedTimeMs !== undefined;
  const durationMs = data?.durationMs ?? (pull ? (pull.endTime - pull.startTime) * 1000 : 0);

  // ── Clock ────────────────────────────────────────────────────────────────
  const [ownTimeMs, setOwnTimeMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [frameMs, setFrameMs] = useState(0);

  // ── Layers and interaction ───────────────────────────────────────────────
  const [showMap, setShowMap] = useState(true);
  const [showAoes, setShowAoes] = useState(true);
  const [showHelpers, setShowHelpers] = useState(false);
  const [showRings, setShowRings] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [iconScale, setIconScale] = useState(1);
  const [layersOpen, setLayersOpen] = useState(false);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // The last VOD time report and when it arrived. Whether the video plays
  // comes from the player itself (`vodPlaying`): a paused player's repeated
  // reading never re-renders anything, so the time can't tell.
  const extRef = useRef<{ value: number; at: number }>({ value: 0, at: 0 });
  const vodPlayingRef = useRef(vodPlaying);
  vodPlayingRef.current = vodPlaying;
  useEffect(() => {
    if (syncedTimeMs === undefined) return;
    extRef.current = { value: syncedTimeMs, at: performance.now() };
  }, [syncedTimeMs]);

  useEffect(() => { setOwnTimeMs(0); setPlaying(false); setSelectedKey(null); }, [pull?.id]);

  useEffect(() => {
    if (!data) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (synced) {
        const e = extRef.current;
        setFrameMs(vodPlayingRef.current ? e.value + Math.min(now - e.at, MAX_EXTRAPOLATE_MS) : e.value);
      } else if (playing) {
        setOwnTimeMs((t) => {
          const next = t + dt * speed;
          if (next >= durationMs) { setPlaying(false); return durationMs; }
          return next;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [data, synced, playing, speed, durationMs]);

  const t = synced ? frameMs : ownTimeMs;

  // ── Per-pull precomputation ──────────────────────────────────────────────
  const view = useMemo(() => (data ? fitReplayView(data) : null), [data]);
  const aoes = useMemo(() => (data ? buildAoeShapes(data) : []), [data]);
  const tethers = useMemo(() => (data ? buildTethers(data) : []), [data]);
  const players = useMemo(() => new Map((pull?.players ?? []).map((p) => [p.name, p])), [pull]);
  const slotByName = useMemo(() => {
    const m = new Map<string, string>();
    if (pull?.game === "ffxiv") for (const r of detectFFRoles(pull.players)) if (r.player) m.set(r.player.name, r.slot + (r.tentative ? "?" : ""));
    return m;
  }, [pull]);
  const actorByKey = useMemo(() => new Map((data?.actors ?? []).map((a) => [a.key, a])), [data]);

  if (!pull) return <Empty>Select a pull to see its replay.</Empty>;
  if (pull.game !== "ffxiv") return <Empty>Replay is FFXIV-only for now.</Empty>;
  if (!data) {
    return (
      <Empty>
        <div style={{ marginBottom: 10 }}>Positions for this pull aren&apos;t loaded yet.</div>
        <button className="ck-btn" onClick={onLoad} disabled={loading}>
          {loading ? `Loading replay${progress !== null ? ` ${Math.round(progress * 100)}%` : "…"}` : "Load replay"}
        </button>
        {error && <div style={{ marginTop: 10, color: "#e06c6c", maxWidth: 420 }}>{error}</div>}
      </Empty>
    );
  }

  const { cx, cy, half } = view!;
  const S = 1000; // SVG viewBox size
  const toX = (x: number) => ((x - (cx - half)) / (2 * half)) * S;
  const toY = (y: number) => ((y - (cy - half)) / (2 * half)) * S;
  const scale = S / (2 * half);              // svg units per centi-yalm

  const mapUrl = data.map ? ffMapImageUrl(data.map.filename) : null;
  const mapBox = data.map ? mapImageBounds(data.map) : null;

  // Enemy casts in progress, one bar per ability.
  const casts = data.enemyCasts ?? [];
  let ci = casts.length;
  { let lo = 0, hi = casts.length; while (lo < hi) { const m = (lo + hi) >> 1; if (casts[m][0] <= t) lo = m + 1; else hi = m; } ci = lo; }
  const casting: { name: string; actor: string; f: number; key: string }[] = [];
  for (let i = ci - 1; i >= 0 && t - casts[i][0] < 12000; i--) {
    const [ct, key, name, dur] = casts[i];
    if (dur > 0 && t < ct + dur && !casting.some((c) => c.name === name)) {
      casting.push({ name, actor: actorByKey.get(key)?.name.replace(/ \d+$/, "") ?? "", f: (t - ct) / dur, key: `${i}` });
    }
  }

  // Who is on the field now. An enemy past its last sample has left (a
  // phase's Kefka replaced by the next one), so it isn't drawn.
  const live: { a: ReplayActor; p: ReplayPose }[] = [];
  for (const a of data.actors) {
    if (a.kind === "enemy" && !(a.targetable || showHelpers)) continue;
    const p = poseAt(a, t);
    if (!p) continue;
    if (a.kind === "enemy" && p.stale && a.samples[a.samples.length - 1][0] < t) continue;
    live.push({ a, p });
  }
  const hovered = live.find((l) => l.a.key === hoverKey);
  const selected = live.find((l) => l.a.key === selectedKey);

  const seek = (ms: number) => setOwnTimeMs(Math.max(0, Math.min(durationMs, ms)));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", justifyContent: "center", alignItems: "center", padding: 8, position: "relative" }}>
        <svg viewBox={`0 0 ${S} ${S}`} style={{ width: "100%", height: "100%" }} onClick={() => setSelectedKey(null)}>
          <defs>
            <clipPath id="replay-clip"><rect x={0} y={0} width={S} height={S} rx={8} /></clipPath>
            <filter id="replay-gray"><feColorMatrix type="saturate" values="0" /></filter>
            <filter id="replay-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#000" floodOpacity="0.85" />
            </filter>
            <filter id="replay-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>
          <rect x={0} y={0} width={S} height={S} rx={8} fill="var(--ck-bg-deep)" />
          <g clipPath="url(#replay-clip)">
            {showMap && mapUrl && mapBox && (
              <image href={mapUrl} x={toX(mapBox.x)} y={toY(mapBox.y)} width={mapBox.size * scale} height={mapBox.size * scale}
                preserveAspectRatio="none" />
            )}
            {showGrid && <Grid cx={cx} cy={cy} half={half} toX={toX} toY={toY} S={S} />}
            {showRings && <Rings cx={cx} cy={cy} half={half} toX={toX} toY={toY} scale={scale} />}
            {showAoes && aoesAt(aoes, t).map(({ s, opacity, resolving }, i) => (
              <Aoe key={i} uid={`${i}-${s.resolve}`} s={s} opacity={opacity} resolving={resolving} toX={toX} toY={toY} scale={scale} />
            ))}
            {tethers.filter((tt) => t >= tt.start && t <= tt.end).map((tt, i) => {
              const src = actorByKey.get(tt.source), dst = actorByKey.get(tt.target);
              const a = src && (poseAt(src, t) ?? sampleNear(src, t, TETHER_LOOKUP_MS));
              const b = dst && (poseAt(dst, t) ?? sampleNear(dst, t, TETHER_LOOKUP_MS));
              if (!a || !b) return null;
              const line = { x1: toX(a.x), y1: toY(a.y), x2: toX(b.x), y2: toY(b.y) };
              return (
                <g key={i} pointerEvents="none">
                  <line {...line} stroke={TETHER_COLOR} strokeWidth={12} strokeOpacity={0.35} strokeLinecap="round" filter="url(#replay-glow)" />
                  <line {...line} stroke={TETHER_COLOR} strokeWidth={4} strokeLinecap="round" />
                  <circle cx={line.x1} cy={line.y1} r={7} fill={TETHER_COLOR} stroke="#fff" strokeWidth={2} />
                </g>
              );
            })}
          </g>
          <text x={S / 2} y={24} textAnchor="middle" fill="#fff" fontSize={20} fontWeight={700} {...LABEL}>N</text>

          {/* Bosses: the game's target ring at hitbox size, FFLogs' Boss icon. */}
          {live.filter((l) => l.a.kind === "enemy").map(({ a, p }) => {
            const x = toX(p.x), y = toY(p.y);
            const deg = facingToCompassBearing(p.facing);
            const ring = Math.max(BOSS_ICON / 2 + 8, (a.hitbox ?? 0) * scale);
            const size = a.targetable ? BOSS_ICON : 18;
            return (
              <g key={a.key} style={{ cursor: "pointer" }} opacity={a.targetable ? 1 : 0.55}
                onMouseEnter={() => setHoverKey(a.key)} onMouseLeave={() => setHoverKey((k) => (k === a.key ? null : k))}
                onClick={(e) => { e.stopPropagation(); setSelectedKey(a.key); }}>
                {a.targetable && <TargetRing x={x} y={y} r={ring} deg={deg} />}
                <image href={FFLOGS_ICON(a.icon === "Boss" ? "Boss" : "NPC")} x={x - size / 2} y={y - size / 2} width={size} height={size} />
              </g>
            );
          })}

          {/* Players: job icon with a drop shadow, a facing wedge in role colour. */}
          {live.filter((l) => l.a.kind === "player").map(({ a, p }) => {
            const x = toX(p.x), y = toY(p.y);
            const dead = p.hp === 0;
            const info = players.get(a.name);
            const roleColor = getRoleColor(info?.role);
            const deg = facingToCompassBearing(p.facing);
            const size = PLAYER_ICON * iconScale;
            const r = size / 2;
            return (
              <g key={a.key} style={{ cursor: "pointer" }} opacity={dead ? 0.5 : p.stale ? 0.75 : 1}
                onMouseEnter={() => setHoverKey(a.key)} onMouseLeave={() => setHoverKey((k) => (k === a.key ? null : k))}
                onClick={(e) => { e.stopPropagation(); setSelectedKey(a.key); }}>
                {selectedKey === a.key && <TargetRing x={x} y={y} r={Math.max(r + 10, (a.hitbox ?? 50) * scale)} deg={deg} />}
                {!dead && <FacingWedge x={x} y={y} r={r} b={(deg * Math.PI) / 180} color={roleColor} size={8 * iconScale} />}
                <image href={getPlayerClassIcon("ffxiv", info?.className ?? a.job ?? "")} x={x - r} y={y - r} width={size} height={size}
                  filter={dead ? "url(#replay-gray)" : "url(#replay-shadow)"} />
                {dead && (
                  <path d={`M${x - r * 0.6} ${y - r * 0.6} L${x + r * 0.6} ${y + r * 0.6} M${x + r * 0.6} ${y - r * 0.6} L${x - r * 0.6} ${y + r * 0.6}`} stroke="#ff4d4d" strokeWidth={4} strokeLinecap="round" />
                )}
              </g>
            );
          })}

          {hovered && (
            <Tooltip x={toX(hovered.p.x)} y={toY(hovered.p.y)} S={S}
              lines={tooltipLines(hovered.a, hovered.p, slotByName, players)}
              color={hovered.a.kind === "player" ? getClassColor("ffxiv", players.get(hovered.a.name)?.className ?? hovered.a.job ?? "") : "#ff8a80"} />
          )}
          {selected && !hovered && (
            <Tooltip x={toX(selected.p.x)} y={toY(selected.p.y)} S={S}
              lines={tooltipLines(selected.a, selected.p, slotByName, players)}
              color={selected.a.kind === "player" ? getClassColor("ffxiv", players.get(selected.a.name)?.className ?? selected.a.job ?? "") : "#ff8a80"} />
          )}
        </svg>

        {casting.length > 0 && (
          <div style={{ position: "absolute", top: 14, left: 14, display: "flex", flexDirection: "column", gap: 4, pointerEvents: "none", maxWidth: "45%" }}>
            {casting.slice(0, 4).map((c) => (
              <div key={c.key} style={{ background: "rgba(10,10,14,0.82)", border: "1px solid var(--ck-line)", borderRadius: 4, padding: "3px 6px", fontSize: 12 }}>
                <div style={{ color: "var(--ck-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  <span style={{ color: "#e8a0a0" }}>{c.actor}</span> {c.name}
                </div>
                <div style={{ height: 4, background: "var(--ck-line)", borderRadius: 2, marginTop: 3 }}>
                  <div style={{ width: `${Math.min(100, c.f * 100)}%`, height: "100%", background: "#ffb347", borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 10px 8px", flexShrink: 0, position: "relative" }}>
        {synced ? (
          <button className="ck-btn" onClick={() => (vodPlaying ? onVodPause?.() : onVodPlay?.())} style={{ minWidth: 64 }}
            title="Plays and pauses the synced VOD">
            {vodPlaying ? "Pause" : "Play"}
          </button>
        ) : (
          <>
            <button className="ck-btn" onClick={() => { if (ownTimeMs >= durationMs) setOwnTimeMs(0); setPlaying((v) => !v); }} style={{ minWidth: 64 }}>
              {playing ? "Pause" : "Play"}
            </button>
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} title="Playback speed">
              {SPEEDS.map((s) => <option key={s} value={s}>{s}×</option>)}
            </select>
          </>
        )}
        {/* Synced, the page's timeline bar below is the scrubber. */}
        {synced ? <div style={{ flex: 1 }} /> : (
          <>
            <span className="ck-num" style={{ color: "var(--ck-text-2)", minWidth: 90 }}>
              {formatMs(t)} / {formatMs(durationMs)}
            </span>
            <input
              type="range" min={0} max={durationMs} step={100} value={Math.min(t, durationMs)}
              onChange={(e) => seek(Number(e.target.value))}
              style={{ flex: 1 }}
            />
          </>
        )}
        <button className="ck-btn" onClick={() => setLayersOpen((v) => !v)} aria-expanded={layersOpen}>Layers ▾</button>
        {layersOpen && (
          <div className="ck-menu" style={{ position: "absolute", right: 10, bottom: "100%", marginBottom: 4, zIndex: 5, padding: "6px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
            <Toggle label="AoEs" title="Enemy AoEs at their game-data size" checked={showAoes} onChange={setShowAoes} />
            {mapUrl && <Toggle label="Map" title={`In-game map: ${data.map!.name}`} checked={showMap} onChange={setShowMap} />}
            <Toggle label="5y rings" title="Rings every 5 yalms from the arena centre" checked={showRings} onChange={setShowRings} />
            <Toggle label="5y grid" title="A 5-yalm grid with 0,0 at the arena centre" checked={showGrid} onChange={setShowGrid} />
            <Toggle label="Helper actors" title="Untargetable actors that place AoEs" checked={showHelpers} onChange={setShowHelpers} />
            <label style={{ color: "var(--ck-text-2)", fontSize: 13, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }} title="Size of the player icons">
              Icons
              <input type="range" min={0.5} max={2} step={0.1} value={iconScale} onChange={(e) => setIconScale(Number(e.target.value))} style={{ width: 90 }} />
              <span className="ck-num">{Math.round(iconScale * 100)}%</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

/** Name, slot, job, coordinates (yalms) and HP for the hover card. */
function tooltipLines(a: ReplayActor, p: ReplayPose, slots: Map<string, string>, players: Map<string, { className: string }>): string[] {
  const where = `X ${(p.x / 100).toFixed(1)}  Y ${(p.y / 100).toFixed(1)}`;
  const hp = p.hp >= 0 ? `HP ${Math.round(p.hp * 100)}%` : "";
  if (a.kind === "player") {
    const slot = slots.get(a.name);
    return [a.name, [slot, players.get(a.name)?.className ?? a.job].filter(Boolean).join(" · "), [where, hp].filter(Boolean).join("   ")];
  }
  return [a.name, [where, a.hitbox ? `hitbox ${(a.hitbox / 100).toFixed(1)}y` : ""].filter(Boolean).join("   "), hp].filter(Boolean);
}

function Tooltip({ x, y, S, lines, color }: { x: number; y: number; S: number; lines: string[]; color: string }) {
  const w = Math.max(...lines.map((l) => l.length)) * 10.5 + 24;
  const h = lines.length * 24 + 14;
  const left = Math.min(S - w - 6, Math.max(6, x + 24));
  const top = Math.min(S - h - 6, Math.max(6, y - h - 18));
  return (
    <g pointerEvents="none">
      <rect x={left} y={top} width={w} height={h} rx={6} fill="rgba(12,14,20,0.92)" stroke={color} strokeWidth={2} />
      {lines.map((l, i) => (
        <text key={i} x={left + 12} y={top + 26 + i * 24} fill={i === 0 ? color : "#e8e6df"} fontSize={i === 0 ? 19 : 17} fontWeight={i === 0 ? 700 : 400}>{l}</text>
      ))}
    </g>
  );
}

/**
 * The game's target ring, drawn after it: a glowing orange arc at the
 * hitbox radius, open at the back, a thin inner ring, a pointed marker at
 * the front, and double chevrons at each side pointing forward. Drawn
 * front-up and rotated to the actor's facing (`deg`, compass).
 */
function TargetRing({ x, y, r, deg }: { x: number; y: number; r: number; deg: number }) {
  const GAP = 32;                 // half the back opening, degrees
  const p = (a: number, rad: number) => `${x + Math.sin((a * Math.PI) / 180) * rad} ${y - Math.cos((a * Math.PI) / 180) * rad}`;
  const arc = `M${p(-180 + GAP, r)} A${r} ${r} 0 1 1 ${p(180 - GAP, r)}`;
  const top = y - r;
  const chevron = (sx: number, dy: number) => `M${sx - 8} ${y + dy + 5} L${sx} ${y + dy - 4} L${sx + 8} ${y + dy + 5}`;
  return (
    <g pointerEvents="none" transform={`rotate(${deg} ${x} ${y})`}>
      <circle cx={x} cy={y} r={r * 0.8} fill="rgba(20,8,4,0.28)" stroke="#ffb76b" strokeOpacity={0.55} strokeWidth={1.5} />
      <path d={arc} fill="none" stroke="#ff9d3c" strokeWidth={14} strokeOpacity={0.45} filter="url(#replay-glow)" />
      <path d={arc} fill="none" stroke="#ffc27a" strokeWidth={5} strokeLinecap="round" />
      <path d={`M${x} ${top - 30} Q${x + 15} ${top - 14} ${x + 10} ${top + 4} L${x} ${top - 3} L${x - 10} ${top + 4} Q${x - 15} ${top - 14} ${x} ${top - 30} Z`}
        fill="#ffd9a3" stroke="#ff9d3c" strokeWidth={2} />
      <path d={`M${x} ${top - 22} L${x} ${top - 9}`} stroke="#c2581b" strokeWidth={3} strokeLinecap="round" />
      {[-r, r].map((dx) => (
        <g key={dx} fill="none" stroke="#ffd9a3" strokeWidth={2.5} strokeLinejoin="round">
          <path d={chevron(x + dx, -3)} />
          <path d={chevron(x + dx, 6)} />
        </g>
      ))}
    </g>
  );
}

/** A 5y grid, origin at the arena centre, labelled in yalms along the top and left. */
function Grid({ cx, cy, half, toX, toY, S }: { cx: number; cy: number; half: number; toX: (x: number) => number; toY: (y: number) => number; S: number }) {
  const n = Math.ceil(half / GRID_STEP) + 1;
  const lines = [];
  for (let k = -n; k <= n; k++) {
    const gx = toX(cx + k * GRID_STEP), gy = toY(cy + k * GRID_STEP);
    const axis = k === 0;
    const stroke = { stroke: "#ffffff", strokeOpacity: axis ? 0.75 : 0.32, strokeWidth: axis ? 2 : 1 };
    lines.push(<line key={`v${k}`} x1={gx} y1={0} x2={gx} y2={S} {...stroke} />, <line key={`h${k}`} x1={0} y1={gy} x2={S} y2={gy} {...stroke} />);
    if (k !== 0 && k % 2 === 0) {
      lines.push(
        <text key={`tx${k}`} x={gx} y={44} textAnchor="middle" fill="#fff" fontSize={14} {...LABEL}>{k * 5}</text>,
        <text key={`ty${k}`} x={8} y={gy + 5} fill="#fff" fontSize={14} {...LABEL}>{k * 5}</text>,
      );
    }
  }
  return <g pointerEvents="none">{lines}</g>;
}

/** Concentric rings every 5y from the arena centre, labelled along the east axis. */
function Rings({ cx, cy, half, toX, toY, scale }: { cx: number; cy: number; half: number; toX: (x: number) => number; toY: (y: number) => number; scale: number }) {
  const out = [];
  for (let r = GRID_STEP, k = 1; r <= half * 1.45; r += GRID_STEP, k++) {
    out.push(<circle key={r} cx={toX(cx)} cy={toY(cy)} r={r * scale} fill="none" stroke="#ffffff" strokeOpacity={k % 2 === 0 ? 0.5 : 0.3} strokeWidth={k % 2 === 0 ? 1.5 : 1} />);
    if (k % 2 === 0) out.push(<text key={`l${r}`} x={toX(cx + r) + 4} y={toY(cy) - 5} fill="#fff" fontSize={13} {...LABEL}>{k * 5}y</text>);
  }
  return <g pointerEvents="none">{out}</g>;
}

/**
 * One AoE, drawn like the game's telegraphs: a gradient fill that is
 * faint at the origin and strongest at the edge, a soft glow just outside
 * the rim, and a crisp rim line. Brighter as it resolves. Towers get their
 * own art (Tower). `uid` keeps each shape's gradient id unique.
 */
function Aoe({ s, opacity, resolving, toX, toY, scale, uid }: { s: AoeShape; opacity: number; resolving: boolean; toX: (x: number) => number; toY: (y: number) => number; scale: number; uid: string }) {
  const x = toX(s.x), y = toY(s.y);
  const r = s.range * scale;
  const b = (s.bearing * Math.PI) / 180;
  if (s.style === "tower" && s.kind === "circle") return <Tower x={x} y={y} r={r} opacity={opacity} resolving={resolving} uid={uid} />;
  const c = AOE_COLORS[s.style];
  const base = resolving ? c.flash : c.fill;
  const grad = `aoe-${uid}`;
  // Radial shapes shade outward from their origin; lines across their width.
  const radial = s.kind === "circle" || s.kind === "donut" || s.kind === "cone";
  let d: string;
  let evenOdd = false;
  if (s.kind === "circle" || (s.kind === "cone" && s.angle >= 360)) {
    d = `M${x - r} ${y} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z`;
  } else if (s.kind === "donut") {
    const ri = s.inner * scale;
    d = `M${x - r} ${y} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z M${x - ri} ${y} a${ri} ${ri} 0 1 1 ${2 * ri} 0 a${ri} ${ri} 0 1 1 ${-2 * ri} 0 Z`;
    evenOdd = true;
  } else if (s.kind === "cone") {
    const h = ((s.angle / 2) * Math.PI) / 180;
    const p = (a: number) => `${x + Math.sin(a) * r} ${y - Math.cos(a) * r}`;
    d = `M${x} ${y} L${p(b - h)} A${r} ${r} 0 ${s.angle > 180 ? 1 : 0} 1 ${p(b + h)} Z`;
  } else if (s.kind === "cross") {
    const w = (s.width * scale) / 2;
    const arm = (a: number) => {
      const ux = Math.sin(a), uy = -Math.cos(a), px = -uy, py = ux;
      return `M${x - ux * r + px * w} ${y - uy * r + py * w} L${x + ux * r + px * w} ${y + uy * r + py * w} L${x + ux * r - px * w} ${y + uy * r - py * w} L${x - ux * r - px * w} ${y - uy * r - py * w} Z`;
    };
    d = `${arm(b)} ${arm(b + Math.PI / 2)}`;
  } else {
    // Rectangle from the caster along the bearing.
    const w = (s.width * scale) / 2;
    const ux = Math.sin(b), uy = -Math.cos(b), px = -uy, py = ux;
    d = `M${x + px * w} ${y + py * w} L${x + ux * r + px * w} ${y + uy * r + py * w} L${x + ux * r - px * w} ${y + uy * r - py * w} L${x - px * w} ${y - py * w} Z`;
  }
  const w = (s.width * scale) / 2;
  const ux = Math.sin(b), uy = -Math.cos(b);
  return (
    <g opacity={opacity} pointerEvents="none">
      <defs>
        {radial ? (
          <radialGradient id={grad} gradientUnits="userSpaceOnUse" cx={x} cy={y} r={Math.max(1, r)}>
            <stop offset="0%" stopColor={base} stopOpacity={resolving ? 0.55 : 0.32} />
            <stop offset="65%" stopColor={base} stopOpacity={resolving ? 0.7 : 0.5} />
            <stop offset="100%" stopColor={base} stopOpacity={resolving ? 0.95 : 0.82} />
          </radialGradient>
        ) : (
          // Across the line's width: strong at both long edges, faint mid.
          <linearGradient id={grad} gradientUnits="userSpaceOnUse" x1={x + uy * w} y1={y - ux * w} x2={x - uy * w} y2={y + ux * w}>
            <stop offset="0%" stopColor={base} stopOpacity={resolving ? 0.95 : 0.82} />
            <stop offset="50%" stopColor={base} stopOpacity={resolving ? 0.6 : 0.38} />
            <stop offset="100%" stopColor={base} stopOpacity={resolving ? 0.95 : 0.82} />
          </linearGradient>
        )}
      </defs>
      <path d={d} fill="none" stroke={c.glow} strokeWidth={11} strokeOpacity={0.4} strokeLinejoin="round" />
      <path d={d} fill={`url(#${grad})`} fillRule={evenOdd ? "evenodd" : undefined} stroke={c.rim} strokeWidth={2.5} strokeLinejoin="round" />
    </g>
  );
}

/**
 * A tower, after the ones Dancing Mad drops in P1: a scorched orange ring
 * on the floor with a dark centre and rune-like dashes, and a violet pillar
 * of light rising from its middle (seen from above, leaning north as in
 * strategy-guide art). Flares white as it resolves.
 */
function Tower({ x, y, r, opacity, resolving, uid }: { x: number; y: number; r: number; opacity: number; resolving: boolean; uid: string }) {
  const floor = `tw-floor-${uid}`, beam = `tw-beam-${uid}`;
  const pw = Math.max(6, r * 0.3);        // pillar width
  const ph = r * 1.05;                     // pillar length (toward north)
  return (
    <g opacity={opacity} pointerEvents="none">
      <defs>
        <radialGradient id={floor} gradientUnits="userSpaceOnUse" cx={x} cy={y} r={Math.max(1, r)}>
          <stop offset="0%" stopColor="#1c0828" stopOpacity={0.72} />
          <stop offset="62%" stopColor="#4a1030" stopOpacity={0.62} />
          <stop offset="86%" stopColor="#ff6a1f" stopOpacity={resolving ? 0.95 : 0.75} />
          <stop offset="100%" stopColor="#ffb14a" stopOpacity={resolving ? 1 : 0.9} />
        </radialGradient>
        <linearGradient id={beam} gradientUnits="userSpaceOnUse" x1={x} y1={y} x2={x} y2={y - ph}>
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0.95} />
          <stop offset="35%" stopColor={resolving ? "#f3e6ff" : "#c48bff"} stopOpacity={0.85} />
          <stop offset="100%" stopColor="#8a3dff" stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* Floor: glow, gradient disc, swirling rune dashes, rim. */}
      <circle cx={x} cy={y} r={r} fill="none" stroke="#ff7a2a" strokeWidth={12} strokeOpacity={0.45} />
      <circle cx={x} cy={y} r={r} fill={`url(#${floor})`} stroke="#ffc074" strokeWidth={2.5} />
      <circle cx={x} cy={y} r={r * 0.82} fill="none" stroke="#ffcf8a" strokeOpacity={0.75} strokeWidth={2} strokeDasharray={`${r * 0.35} ${r * 0.18}`} />
      <circle cx={x} cy={y} r={r * 0.62} fill="none" stroke="#ff8a3d" strokeOpacity={0.5} strokeWidth={1.5} strokeDasharray={`${r * 0.12} ${r * 0.2}`} />
      {/* Pillar of light. */}
      <rect x={x - pw * 0.9} y={y - ph} width={pw * 1.8} height={ph} rx={pw * 0.9} fill="#a65cff" fillOpacity={0.25} />
      <rect x={x - pw / 2} y={y - ph} width={pw} height={ph} rx={pw / 2} fill={`url(#${beam})`} />
      <circle cx={x} cy={y} r={pw * 0.75} fill="#ffffff" fillOpacity={resolving ? 1 : 0.9} stroke="#d6b0ff" strokeWidth={3} />
    </g>
  );
}

/** A small triangle just outside a dot, pointing along compass bearing `b` (radians, 0 = N). */
function FacingWedge({ x, y, r, b, color, size }: { x: number; y: number; r: number; b: number; color: string; size: number }) {
  const at = (dist: number, ang: number) => `${x + Math.sin(ang) * dist} ${y - Math.cos(ang) * dist}`;
  const spread = size / (r + 2);
  return <path d={`M${at(r + size + 4, b)} L${at(r + 1, b - spread)} L${at(r + 1, b + spread)} Z`} fill={color} stroke="rgba(0,0,0,0.7)" strokeWidth={1.5} pointerEvents="none" />;
}

function Toggle({ label, title, checked, onChange }: { label: string; title: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label title={title} style={{ color: "var(--ck-text-2)", fontSize: 13, whiteSpace: "nowrap", cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );
}

// Labels sit on a light map or a dark background: a dark halo keeps them
// readable on both.
const LABEL = { stroke: "rgba(0,0,0,0.75)", strokeWidth: 4, paintOrder: "stroke" } as const;

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--ck-text-2)", textAlign: "center", padding: 16 }}>
      {children}
    </div>
  );
}
