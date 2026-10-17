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
import { aoesAt, buildAoeShapes, type AoeShape } from "@/lib/replay/action-shapes";
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
// Guide-style AoE colours: translucent blue fill, white rim.
const AOE_FILL = "#2f5bff";
const AOE_RIM = "#ffffff";
const PLAYER_ICON = 34;   // SVG units
const BOSS_ICON = 46;

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
          </defs>
          <rect x={0} y={0} width={S} height={S} rx={8} fill="var(--ck-bg-deep)" />
          <g clipPath="url(#replay-clip)">
            {showMap && mapUrl && mapBox && (
              <image href={mapUrl} x={toX(mapBox.x)} y={toY(mapBox.y)} width={mapBox.size * scale} height={mapBox.size * scale}
                preserveAspectRatio="none" />
            )}
            {showAoes && aoesAt(aoes, t).map(({ s, opacity, resolving }, i) => (
              <Aoe key={i} s={s} opacity={opacity} resolving={resolving} toX={toX} toY={toY} scale={scale} />
            ))}
          </g>
          <text x={S / 2} y={24} textAnchor="middle" fill="#fff" fontSize={20} fontWeight={700} {...LABEL}>N</text>

          {/* Bosses: hitbox ring with a front marker, FFLogs' Boss icon. */}
          {live.filter((l) => l.a.kind === "enemy").map(({ a, p }) => {
            const x = toX(p.x), y = toY(p.y);
            const b = (facingToCompassBearing(p.facing) * Math.PI) / 180;
            const ring = Math.max(BOSS_ICON / 2 + 6, (a.hitbox ?? 0) * scale);
            const size = a.targetable ? BOSS_ICON : 18;
            return (
              <g key={a.key} style={{ cursor: "pointer" }} opacity={a.targetable ? 1 : 0.55}
                onMouseEnter={() => setHoverKey(a.key)} onMouseLeave={() => setHoverKey((k) => (k === a.key ? null : k))}
                onClick={(e) => { e.stopPropagation(); setSelectedKey(a.key); }}>
                {a.targetable && <TargetRing x={x} y={y} r={ring} b={b} color="#ff6b5e" strong={selectedKey === a.key} />}
                <image href={FFLOGS_ICON(a.icon === "Boss" ? "Boss" : "NPC")} x={x - size / 2} y={y - size / 2} width={size} height={size} />
              </g>
            );
          })}

          {/* Players: job icon in a role-coloured ring, facing wedge. */}
          {live.filter((l) => l.a.kind === "player").map(({ a, p }) => {
            const x = toX(p.x), y = toY(p.y);
            const dead = p.hp === 0;
            const info = players.get(a.name);
            const roleColor = getRoleColor(info?.role);
            const b = (facingToCompassBearing(p.facing) * Math.PI) / 180;
            const r = PLAYER_ICON / 2;
            return (
              <g key={a.key} style={{ cursor: "pointer" }} opacity={dead ? 0.5 : p.stale ? 0.75 : 1}
                onMouseEnter={() => setHoverKey(a.key)} onMouseLeave={() => setHoverKey((k) => (k === a.key ? null : k))}
                onClick={(e) => { e.stopPropagation(); setSelectedKey(a.key); }}>
                {selectedKey === a.key && <TargetRing x={x} y={y} r={Math.max(r + 8, (a.hitbox ?? 50) * scale)} b={b} color="#ffd34d" strong />}
                {!dead && <FacingWedge x={x} y={y} r={r + 2} b={b} color={roleColor} size={9} />}
                <circle cx={x} cy={y} r={r + 2} fill="#10131a" stroke={roleColor} strokeWidth={4} />
                <image href={getPlayerClassIcon("ffxiv", info?.className ?? a.job ?? "")} x={x - r} y={y - r} width={PLAYER_ICON} height={PLAYER_ICON}
                  filter={dead ? "url(#replay-gray)" : undefined} />
                {dead && (
                  <path d={`M${x - 10} ${y - 10} L${x + 10} ${y + 10} M${x + 10} ${y - 10} L${x - 10} ${y + 10}`} stroke="#ff4d4d" strokeWidth={4} strokeLinecap="round" />
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
            <Toggle label="AoEs" title="Enemy AoEs at their game-data size. Dashed: cone angle or donut hole estimated" checked={showAoes} onChange={setShowAoes} />
            {mapUrl && <Toggle label="Map" title={`In-game map: ${data.map!.name}`} checked={showMap} onChange={setShowMap} />}
            <Toggle label="Helper actors" title="Untargetable actors that place AoEs" checked={showHelpers} onChange={setShowHelpers} />
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

/** An in-game style target ring: the hitbox circle with a front notch. */
function TargetRing({ x, y, r, b, color, strong }: { x: number; y: number; r: number; b: number; color: string; strong?: boolean }) {
  const fx = x + Math.sin(b) * r, fy = y - Math.cos(b) * r;
  const n = 11;
  return (
    <g pointerEvents="none">
      <circle cx={x} cy={y} r={r} fill={color} fillOpacity={strong ? 0.14 : 0.06} stroke={color} strokeWidth={strong ? 4 : 3} strokeOpacity={strong ? 1 : 0.75} />
      <path d={`M${fx + Math.sin(b) * n} ${fy - Math.cos(b) * n} L${fx + Math.cos(b) * n * 0.8} ${fy + Math.sin(b) * n * 0.8} L${fx - Math.cos(b) * n * 0.8} ${fy - Math.sin(b) * n * 0.8} Z`}
        fill={color} stroke="rgba(0,0,0,0.6)" strokeWidth={1.5} />
    </g>
  );
}

/** One AoE in guide style: blue fill, white rim; brighter as it resolves. */
function Aoe({ s, opacity, resolving, toX, toY, scale }: { s: AoeShape; opacity: number; resolving: boolean; toX: (x: number) => number; toY: (y: number) => number; scale: number }) {
  const x = toX(s.x), y = toY(s.y);
  const r = s.range * scale;
  const b = (s.bearing * Math.PI) / 180;
  const fill = resolving ? "#7fa2ff" : AOE_FILL;
  const common = { fill, fillOpacity: resolving ? 0.8 : 0.62, stroke: AOE_RIM, strokeWidth: 3.5, strokeDasharray: s.estimated ? "12 8" : undefined } as const;
  let d: string;
  if (s.kind === "circle") {
    return <g opacity={opacity} pointerEvents="none"><circle cx={x} cy={y} r={r} {...common} /></g>;
  } else if (s.kind === "donut") {
    const ri = s.inner * scale;
    d = `M${x - r} ${y} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z M${x - ri} ${y} a${ri} ${ri} 0 1 1 ${2 * ri} 0 a${ri} ${ri} 0 1 1 ${-2 * ri} 0 Z`;
    return <g opacity={opacity} pointerEvents="none"><path d={d} fillRule="evenodd" {...common} /></g>;
  } else if (s.kind === "cone") {
    const h = ((s.angle / 2) * Math.PI) / 180;
    if (s.angle >= 360) return <g opacity={opacity} pointerEvents="none"><circle cx={x} cy={y} r={r} {...common} /></g>;
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
  return <g opacity={opacity} pointerEvents="none"><path d={d} {...common} /></g>;
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
