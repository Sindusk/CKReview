"use client";

// components/ReplayPanel.tsx
//
// Top-down replay of the selected pull, stage 1: player and enemy dots on a
// blank arena (yalm rings, compass), no map art or AoE shapes. Tracks come
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
import { fitReplayView, poseAt, type ReplayData } from "@/lib/replay/ffxiv-replay";
import { facingToCompassBearing } from "@/lib/mechanics/geometry";
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
};

const SPEEDS = [0.5, 1, 2, 4];
// How far past the last VOD report the panel extrapolates. A little over
// the report interval: if reports stop (paused, buffering), the dots stop.
const MAX_EXTRAPOLATE_MS = 350;

export default function ReplayPanel({ pull, data, loading, progress, error, onLoad, syncedTimeMs, onSeekMs }: Props) {
  const synced = syncedTimeMs !== undefined;
  const durationMs = data?.durationMs ?? (pull ? (pull.endTime - pull.startTime) * 1000 : 0);

  // ── Clock ────────────────────────────────────────────────────────────────
  const [ownTimeMs, setOwnTimeMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [frameMs, setFrameMs] = useState(0);
  const [showHelpers, setShowHelpers] = useState(false);

  const extRef = useRef<{ value: number; at: number; moving: boolean }>({ value: 0, at: 0, moving: false });
  useEffect(() => {
    if (syncedTimeMs === undefined) return;
    const prev = extRef.current;
    extRef.current = { value: syncedTimeMs, at: performance.now(), moving: syncedTimeMs !== prev.value && Math.abs(syncedTimeMs - prev.value) < 2000 };
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

  const seek = (ms: number) => {
    const clamped = Math.max(0, Math.min(durationMs, ms));
    if (synced) onSeekMs?.(clamped);
    else setOwnTimeMs(clamped);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ flex: 1, minHeight: 0, display: "flex", justifyContent: "center", alignItems: "center", padding: 8 }}>
        <svg viewBox={`0 0 ${S} ${S}`} style={{ width: "100%", height: "100%" }}>
          <defs>
            <clipPath id="replay-clip"><rect x={0} y={0} width={S} height={S} rx={8} /></clipPath>
          </defs>
          <rect x={0} y={0} width={S} height={S} rx={8} fill="var(--ck-bg-deep)" />
          <g clipPath="url(#replay-clip)">
            {rings.map((r) => (
              <circle key={r} cx={toX(cx)} cy={toY(cy)} r={r * scale} fill="none" stroke="var(--ck-line)" strokeWidth={1} />
            ))}
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
                <circle cx={x} cy={y} r={r} fill="#8a2d2d" stroke="#e06c6c" strokeWidth={2} />
                {a.targetable && (
                  <>
                    <line x1={x} y1={y} x2={x + Math.sin(b) * (r + 12)} y2={y - Math.cos(b) * (r + 12)} stroke="#e06c6c" strokeWidth={3} />
                    <text x={x} y={y - r - 8} textAnchor="middle" fill="#e8a0a0" fontSize={20}>{a.name}</text>
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
                <circle cx={x} cy={y} r={14} fill={color} stroke={getRoleColor(roleByName.get(a.name))} strokeWidth={4} />
                {dead && (
                  <path d={`M${x - 9} ${y - 9} L${x + 9} ${y + 9} M${x + 9} ${y - 9} L${x - 9} ${y + 9}`} stroke="#111" strokeWidth={4} />
                )}
                <text x={x} y={y + 36} textAnchor="middle" fill="var(--ck-text)" fontSize={20}>{a.name.split(" ")[0]}</text>
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 10px 8px", flexShrink: 0 }}>
        {!synced && (
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
        {synced && <span style={{ color: "var(--ck-text-3)", fontSize: 12 }}>following VOD</span>}
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--ck-text-2)", textAlign: "center", padding: 16 }}>
      {children}
    </div>
  );
}
