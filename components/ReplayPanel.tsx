"use client";

// components/ReplayPanel.tsx
//
// Top-down replay of the selected pull: player and enemy dots on the
// fight's in-game map (XIVAPI's copy of the texture) with yalm rings, a
// cast bar for enemy casts in progress, AoE overlays for the mechanics
// lib/replay/dancing-mad-overlays.ts knows (dashed = position only, size
// unknown), and a ring on each player an enemy hit. Tracks come
// from lib/replay/ffxiv-replay.ts; page.tsx loads them only when the user
// clicks Load replay (one FFLogs fetch per pull, never on navigation).
//
// Two clocks:
// - `syncedTimeMs` set: the VOD drives the replay (playback time from
//   useTimelineController), and the scrubber seeks the video through
//   `onSeekMs`. The video reports its time ~5 times a second, so between
//   reports the panel runs the clock forward itself while the video is
//   playing, which keeps the dots moving smoothly instead of hopping.
// - No VOD synced: the panel keeps its own clock with play/pause and speed.

import { useEffect, useMemo, useRef, useState } from "react";
import type { Pull } from "@/types/Pull";
import { ffMapImageUrl, fitReplayView, mapImageBounds, poseAt, type ReplayData } from "@/lib/replay/ffxiv-replay";
import { facingToCompassBearing } from "@/lib/mechanics/geometry";
import { indexOverlays, overlaysAt, type OverlayShape } from "@/lib/replay/dancing-mad-overlays";
import { getClassColor, getRoleColor } from "@/lib/player-display";

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
  onSeekMs?:     (ms: number) => void;
  onVodPlay?:    () => void;        // play/pause drive the hidden video when synced
  onVodPause?:   () => void;
};

const SPEEDS = [0.5, 1, 2, 4];
// How far past the last VOD report the panel extrapolates. A little over
// the report interval: if reports stop (paused, buffering), the dots stop.
const MAX_EXTRAPOLATE_MS = 350;
// Labels sit on a light map or a dark background: a dark halo keeps them
// readable on both.
const LABEL = { stroke: "rgba(0,0,0,0.75)", strokeWidth: 4, paintOrder: "stroke" } as const;

export default function ReplayPanel({ pull, data, loading, progress, error, onLoad, syncedTimeMs, onSeekMs, onVodPlay, onVodPause }: Props) {
  const synced = syncedTimeMs !== undefined;
  const durationMs = data?.durationMs ?? (pull ? (pull.endTime - pull.startTime) * 1000 : 0);

  // ── Clock ────────────────────────────────────────────────────────────────
  const [ownTimeMs, setOwnTimeMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [frameMs, setFrameMs] = useState(0);
  const [showHelpers, setShowHelpers] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [showAoes, setShowAoes] = useState(true);
  const [showHits, setShowHits] = useState(true);

  const extRef = useRef<{ value: number; at: number; moving: boolean }>({ value: 0, at: 0, moving: false });
  // Whether the synced video is playing, read from its time reports: it
  // reports ~5 times a second whether playing or not, so a report that
  // repeats the last time means paused.
  const [vodPlaying, setVodPlaying] = useState(false);
  useEffect(() => {
    if (syncedTimeMs === undefined) return;
    const prev = extRef.current;
    const moving = syncedTimeMs !== prev.value && Math.abs(syncedTimeMs - prev.value) < 2000;
    extRef.current = { value: syncedTimeMs, at: performance.now(), moving };
    setVodPlaying(moving);
  }, [syncedTimeMs]);

  useEffect(() => { setOwnTimeMs(0); setPlaying(false); }, [pull?.id]);

  useEffect(() => {
    if (!data) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (synced) {
        const e = extRef.current;
        setFrameMs(e.moving ? e.value + Math.min(now - e.at, MAX_EXTRAPOLATE_MS) : e.value);
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

  // ── Geometry ─────────────────────────────────────────────────────────────
  const view = useMemo(() => (data ? fitReplayView(data) : null), [data]);
  const roleByName = useMemo(() => new Map((pull?.players ?? []).map((p) => [p.name, p.role])), [pull]);
  const overlayIndex = useMemo(() => (data ? indexOverlays(data) : null), [data]);

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
  const ringStep = half > 2500 ? 1000 : 500; // 10y or 5y rings

  const rings: number[] = [];
  for (let r = ringStep; r <= half * 1.42; r += ringStep) rings.push(r);

  const enemies = data.actors.filter((a) => a.kind === "enemy" && (a.targetable || showHelpers));
  const players = data.actors.filter((a) => a.kind === "player");

  const mapUrl = data.map ? ffMapImageUrl(data.map.filename) : null;
  const mapBox = data.map ? mapImageBounds(data.map) : null;

  // Enemy casts in progress, one bar per ability.
  const casts = data.enemyCasts ?? [];
  const actorByKey = overlayIndex!.actorByKey;
  let ci = casts.length;
  { let lo = 0, hi = casts.length; while (lo < hi) { const m = (lo + hi) >> 1; if (casts[m][0] <= t) lo = m + 1; else hi = m; } ci = lo; }
  const casting: { name: string; actor: string; f: number; key: string }[] = [];
  for (let i = ci - 1; i >= 0 && t - casts[i][0] < 12000; i--) {
    const [ct, key, name, dur] = casts[i];
    if (dur > 0 && t < ct + dur && !casting.some((c) => c.name === name)) {
      casting.push({ name, actor: actorByKey.get(key)?.name.replace(/ \d+$/, "") ?? "", f: (t - ct) / dur, key: `${i}` });
    }
  }

  const shapes = overlaysAt(overlayIndex!, t, showHits).filter((s) => showAoes || s.hit);

  const seek = (ms: number) => {
    const clamped = Math.max(0, Math.min(durationMs, ms));
    if (synced) onSeekMs?.(clamped);
    else setOwnTimeMs(clamped);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", justifyContent: "center", alignItems: "center", padding: 8, position: "relative" }}>
        <svg viewBox={`0 0 ${S} ${S}`} style={{ width: "100%", height: "100%" }}>
          <defs>
            <clipPath id="replay-clip"><rect x={0} y={0} width={S} height={S} rx={8} /></clipPath>
          </defs>
          <rect x={0} y={0} width={S} height={S} rx={8} fill="var(--ck-bg-deep)" />
          <g clipPath="url(#replay-clip)">
            {showMap && mapUrl && mapBox && (
              <image href={mapUrl} x={toX(mapBox.x)} y={toY(mapBox.y)} width={mapBox.size * scale} height={mapBox.size * scale}
                preserveAspectRatio="none" opacity={0.85} />
            )}
            {rings.map((r) => (
              <circle key={r} cx={toX(cx)} cy={toY(cy)} r={r * scale} fill="none" stroke={showMap && mapUrl ? "rgba(0,0,0,0.18)" : "var(--ck-line)"} strokeWidth={1} />
            ))}
            {shapes.map((s, i) => <Shape key={i} s={s} toX={toX} toY={toY} scale={scale} />)}
          </g>
          <line x1={toX(cx)} y1={0} x2={toX(cx)} y2={S} stroke="var(--ck-line)" strokeWidth={1} strokeDasharray="4 6" />
          <line x1={0} y1={toY(cy)} x2={S} y2={toY(cy)} stroke="var(--ck-line)" strokeWidth={1} strokeDasharray="4 6" />
          <text x={S / 2} y={22} textAnchor="middle" fill="var(--ck-text-3)" fontSize={18}>N</text>
          <text x={S - 14} y={toY(cy) - 6} textAnchor="end" fill="var(--ck-text-3)" fontSize={14}>{ringStep / 100}y rings</text>

          {enemies.map((a) => {
            const p = poseAt(a, t);
            // An enemy past its last sample has left the fight (a phase's
            // Kefka replaced by the next one); don't leave it standing.
            if (!p || (p.stale && a.samples[a.samples.length - 1][0] < t)) return null;
            const x = toX(p.x), y = toY(p.y);
            const r = a.targetable ? 16 : 6;
            const b = (facingToCompassBearing(p.facing) * Math.PI) / 180;
            return (
              <g key={a.key} opacity={a.targetable ? 1 : 0.5}>
                {a.targetable && (
                  // A faint 90° front arc: which way the boss faces at a glance.
                  <path d={arcPath(x, y, r + 46, b, Math.PI / 4)} fill="#e06c6c" fillOpacity={0.22} stroke="none" />
                )}
                <circle cx={x} cy={y} r={r} fill="#8a2d2d" stroke="#e06c6c" strokeWidth={2} />
                {a.targetable && (
                  <>
                    <FacingWedge x={x} y={y} r={r} b={b} color="#e06c6c" size={11} />
                    <text x={x} y={y - r - 8} textAnchor="middle" fill="#e8a0a0" fontSize={20} {...LABEL}>{a.name}</text>
                  </>
                )}
              </g>
            );
          })}

          {players.map((a) => {
            const p = poseAt(a, t);
            if (!p) return null;
            const x = toX(p.x), y = toY(p.y);
            const dead = p.hp === 0;
            const color = getClassColor("ffxiv", a.job ?? "");
            return (
              <g key={a.key} opacity={dead ? 0.45 : p.stale ? 0.7 : 1}>
                {!dead && <FacingWedge x={x} y={y} r={14} b={(facingToCompassBearing(p.facing) * Math.PI) / 180} color={color} size={9} />}
                <circle cx={x} cy={y} r={14} fill={color} stroke={getRoleColor(roleByName.get(a.name))} strokeWidth={4} />
                {dead && (
                  <path d={`M${x - 9} ${y - 9} L${x + 9} ${y + 9} M${x + 9} ${y - 9} L${x - 9} ${y + 9}`} stroke="#111" strokeWidth={4} />
                )}
                <text x={x} y={y + 36} textAnchor="middle" fill="#f2efe6" fontSize={20} {...LABEL}>{a.name.split(" ")[0]}</text>
              </g>
            );
          })}
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

      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 10px 8px", flexShrink: 0 }}>
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
        <span className="ck-num" style={{ color: "var(--ck-text-2)", minWidth: 90 }}>
          {formatMs(t)} / {formatMs(durationMs)}
        </span>
        <input
          type="range" min={0} max={durationMs} step={100} value={Math.min(t, durationMs)}
          onChange={(e) => seek(Number(e.target.value))}
          style={{ flex: 1 }}
          disabled={synced && !onSeekMs}
        />
        <label style={{ color: "var(--ck-text-3)", fontSize: 12, whiteSpace: "nowrap" }} title="Untargetable actors that place AoEs">
          <input type="checkbox" checked={showHelpers} onChange={(e) => setShowHelpers(e.target.checked)} /> helpers
        </label>
        <label style={{ color: "var(--ck-text-3)", fontSize: 12, whiteSpace: "nowrap" }} title="Mechanic shapes. Dashed: position known, size not measured">
          <input type="checkbox" checked={showAoes} onChange={(e) => setShowAoes(e.target.checked)} /> AoEs
        </label>
        <label style={{ color: "var(--ck-text-3)", fontSize: 12, whiteSpace: "nowrap" }} title="A ring on each player an enemy ability hit">
          <input type="checkbox" checked={showHits} onChange={(e) => setShowHits(e.target.checked)} /> hits
        </label>
        {mapUrl && (
          <label style={{ color: "var(--ck-text-3)", fontSize: 12, whiteSpace: "nowrap" }} title={`In-game map: ${data.map!.name}`}>
            <input type="checkbox" checked={showMap} onChange={(e) => setShowMap(e.target.checked)} /> map
          </label>
        )}
        {synced && <span style={{ color: "var(--ck-text-3)", fontSize: 12 }}>following VOD</span>}
      </div>
    </div>
  );
}

/** A small triangle just outside a dot, pointing along compass bearing `b` (radians, 0 = N). */
function FacingWedge({ x, y, r, b, color, size }: { x: number; y: number; r: number; b: number; color: string; size: number }) {
  const at = (dist: number, ang: number) => `${x + Math.sin(ang) * dist} ${y - Math.cos(ang) * dist}`;
  const spread = size / (r + 2);
  return <path d={`M${at(r + size + 4, b)} L${at(r + 1, b - spread)} L${at(r + 1, b + spread)} Z`} fill={color} stroke="rgba(0,0,0,0.7)" strokeWidth={1.5} />;
}

/** Pie slice of radius `rad` centred on bearing `b`, `half` radians either side. */
function arcPath(x: number, y: number, rad: number, b: number, half: number): string {
  const p = (ang: number) => `${x + Math.sin(ang) * rad} ${y - Math.cos(ang) * rad}`;
  return `M${x} ${y} L${p(b - half)} A${rad} ${rad} 0 0 1 ${p(b + half)} Z`;
}

/** One overlay shape (lib/replay/dancing-mad-overlays.ts), in SVG units. */
function Shape({ s, toX, toY, scale }: { s: OverlayShape; toX: (x: number) => number; toY: (y: number) => number; scale: number }) {
  const dash = s.dashed ? "10 7" : undefined;
  if (s.kind === "circle") {
    const x = toX(s.x), y = toY(s.y), r = Math.max(4, s.r * scale);
    return (
      <g opacity={s.opacity}>
        <circle cx={x} cy={y} r={r} fill={s.fill ? s.color : "none"} fillOpacity={s.fill ? 0.25 : 0} stroke={s.color} strokeWidth={3} strokeDasharray={dash} />
        {s.label && <text x={x} y={y - r - 6} textAnchor="middle" fill={s.color} fontSize={16} {...LABEL}>{s.label}</text>}
      </g>
    );
  }
  const x1 = toX(s.x1), y1 = toY(s.y1), x2 = toX(s.x2), y2 = toY(s.y2);
  const a = Math.atan2(y2 - y1, x2 - x1);
  const head = 16;
  return (
    <g opacity={s.opacity}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={s.color} strokeWidth={s.width} strokeDasharray={dash} strokeLinecap="round" />
      {s.arrow && (
        <path d={`M${x2} ${y2} L${x2 - head * Math.cos(a - 0.45)} ${y2 - head * Math.sin(a - 0.45)} L${x2 - head * Math.cos(a + 0.45)} ${y2 - head * Math.sin(a + 0.45)} Z`} fill={s.color} />
      )}
      {s.label && <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 10} textAnchor="middle" fill={s.color} fontSize={16} {...LABEL}>{s.label}</text>}
    </g>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--ck-text-2)", textAlign: "center", padding: 16 }}>
      {children}
    </div>
  );
}
