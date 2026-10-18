"use client";

// components/ReplayPanel.tsx
//
// Top-down replay of the selected pull, styled after strategy-guide
// diagrams: the fight's in-game map (XIVAPI's copy of the texture), job
// icons for players, FFLogs' Boss icon for bosses with their hitbox ring
// and front marker, and every enemy AoE at its game-data size as a red
// shape with a white rim (lib/replay/action-shapes.ts; dashed = cone angle
// or donut hole estimated). Hovering an actor shows its name, strategy
// slot (MT, OT, H1 ... from lib/mechanics/ffxiv/roles.ts), coordinates and
// HP; clicking one pins its hitbox ring. FFXIV players carry their
// statuses in a row above (icon, seconds left, stacks) and head
// markers as a label above. Tracks come from
// lib/replay/ffxiv-replay.ts; page.tsx loads them only when the user
// clicks Load replay (one FFLogs fetch per pull, never on navigation).
//
// WoW pulls (lib/replay/wow-replay.ts, same ReplayData) draw on the zone's
// in-game map, which this app's server builds from Blizzard's tiles
// (lib/wow-map-art.ts), or a blank arena when it can't. No tethers or
// hitboxes yet. AoEs come
// from lib/replay/wow-shapes.ts (db2 radii placed by hits), and raid-wide
// hits show as labels top right. Players get spec icons, enemies WCL's own
// icon; units read as yards.
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
// The page uses only the own clock (user, 2026-10-17: following the VOD
// made scrubbing wait on the video). Opening the replay pauses the VOD and
// starts the clock at its time (`startTimeMs`); going back to Video seeks
// the VOD to the replay's time and plays it if the replay was playing.

import { useEffect, useMemo, useRef, useState } from "react";
import type { Pull } from "@/types/Pull";
import { ffMapImageUrl, fitReplayView, mapImageBounds, poseAt, type ReplayActor, type ReplayData, type ReplayPose } from "@/lib/replay/ffxiv-replay";
import { aoesAt, buildAoeShapes, buildHeadMarkers, buildTethers, tetherEndAt, type AoeShape } from "@/lib/replay/action-shapes";
import { getFFAbilityIconUrl } from "@/lib/ability-icons";
import { buildCasterEffects, SLIDE_STATUSES } from "@/lib/replay/ffxiv-effects";
import { ElementDragon, ElementHalo, ElementTether, IceFloor, JailCage } from "@/components/ReplayEffects";
import { sampleNear } from "@/lib/replay/ffxiv-replay";
import { facingToCompassBearing } from "@/lib/mechanics/geometry";
import { detectFFRoles } from "@/lib/mechanics/ffxiv/roles";
import { getClassColor, getPlayerClassIcon, getPlayerSpecIcon, getRoleColor } from "@/lib/player-display";
import { wowEnemyIconUrl } from "@/lib/replay/wow-replay";
import { buildWowAoeShapes, buildWowRaidwide, wowRaidwideAt } from "@/lib/replay/wow-shapes";
import type { PlayerInfo } from "@/types/PlayerInfo";

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
  // The replay's current time, reported a few times a second (the roster
  // shows HP and MP for this moment).
  onTimeChange?: (ms: number) => void;
  // Moves the panel's own clock (no VOD synced): a new `n` seeks to `ms`.
  seekRequest?:  { ms: number; n: number };
  // Where the own clock starts when the panel mounts (the paused VOD's time).
  startTimeMs?:  number;
  // The own clock's play state, so the page can resume the VOD the same way.
  onPlayingChange?: (playing: boolean) => void;
};

const SPEEDS = [0.5, 1, 2, 4];
// How far past the last VOD report the panel extrapolates. A little over
// the report interval: if reports stop (paused, buffering), the dots stop.
const MAX_EXTRAPOLATE_MS = 350;
// FFLogs' own actor icons ("Boss", "NPC"), the CDN the app already uses
// for ability icons (lib/ability-icons.ts).
const FFLOGS_ICON = (name: string) => `https://assets.rpglogs.com/img/ff/icons/${name}.png`;
// AoE colours by kind: red AoEs (user, 2026-10-17; were guide-style
// blue), yellow towers, purple tankbusters, orange stacks (shared hits:
// stand in them), pale blue knockbacks; light rims. `flash` is the fill as
// it resolves. Lightning-element cleaves are blue.
const AOE_COLORS: Record<AoeShape["style"], { fill: string; flash: string; rim: string; glow: string }> = {
  aoe:        { fill: "#d9342b", flash: "#ff7a70", rim: "#ffe1dc", glow: "#ff5a4a" },
  tower:      { fill: "#f2c230", flash: "#ffe27a", rim: "#fff6c8", glow: "#ffb84a" },   // non-circle towers only; circles use Tower
  tankbuster: { fill: "#8a3dff", flash: "#c99bff", rim: "#f1e2ff", glow: "#b47bff" },
  stack:      { fill: "#f08a24", flash: "#ffc070", rim: "#fff0d8", glow: "#ffa040" },
  knockback:  { fill: "#5fb4e8", flash: "#a8dcff", rim: "#e6f6ff", glow: "#7cc8ff" },
  lightning:  { fill: "#2f7dff", flash: "#9fd0ff", rim: "#eaf6ff", glow: "#4aa8ff" },   // FRU Bow Shock
  drop:       { fill: "#ffd84a", flash: "#fff2a8", rim: "#ffe680", glow: "#ffcc33" },   // DropRing only
  light:      { fill: "#ffc95a", flash: "#fff3c4", rim: "#fffaf0", glow: "#ffdf8a" },   // FRU House of Light
  ice:        { fill: "#a8dcff", flash: "#ffffff", rim: "#ffffff", glow: "#cfeeff" },   // FRU Icicle Impact (IceCircle until it lands)
  puddle:     { fill: "#fff1b8", flash: "#ffffff", rim: "#fff8dc", glow: "#ffe27a" },   // Puddle only
};
// Status icons under each player: at most this many, mechanic statuses
// before the common ones (vulnerabilities, Weakness) that a raid carries
// all the time.
const MAX_STATUS_ICONS = 5;
const COMMON_STATUSES = new Set([1002941, 1002940, 1004162, 1000043, 1000044]);
// Head markers show from the marker until the hit it announced
// (action-shapes.ts's buildHeadMarkers), or this long when unknown.
const HEAD_MARKER_PLAIN_MS = 5000;
// Statuses that lift a player into a cage: FRU Floating Fetters, 4s on
// each tethered carrier before their hit (user, 2026-10-17). Lift and
// cage last the whole status (user: a last-second-only cage was wrong).
const JAIL_STATUSES = new Set([1002304]);
const STATUS_W = 15, STATUS_H = 20;   // SVG units at icon scale 1 (the game's icons are 24x32)
const PLAYER_ICON = 34;   // SVG units, at icon scale 1
const BOSS_ICON = 46;
const TETHER_COLOR = "#ff5fd2";
// A tether's source is often a helper with sparse samples; take its
// nearest one within this window.
const TETHER_LOOKUP_MS = 20000;
const GRID_STEP = 500;    // 5y, centi-yalms

export default function ReplayPanel({ pull, data, loading, progress, error, onLoad, syncedTimeMs, vodPlaying = false, onVodPlay, onVodPause, onTimeChange, seekRequest, startTimeMs = 0, onPlayingChange }: Props) {
  const synced = syncedTimeMs !== undefined;
  const durationMs = data?.durationMs ?? (pull ? (pull.endTime - pull.startTime) * 1000 : 0);

  // ── Clock ────────────────────────────────────────────────────────────────
  const [ownTimeMs, setOwnTimeMs] = useState(startTimeMs);
  const [playing, setPlaying] = useState(false);
  useEffect(() => { onPlayingChange?.(playing); }, [playing, onPlayingChange]);
  const [speed, setSpeed] = useState(1);
  const [frameMs, setFrameMs] = useState(0);

  // ── Layers and interaction ───────────────────────────────────────────────
  const [showMap, setShowMap] = useState(true);
  const [showAoes, setShowAoes] = useState(true);
  const [showHelpers, setShowHelpers] = useState(false);
  const [showRings, setShowRings] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showStatuses, setShowStatuses] = useState(true);
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

  // A pull change restarts the clock; the first run is the mount, which
  // keeps startTimeMs.
  const mountedPullRef = useRef(pull?.id);
  useEffect(() => {
    if (mountedPullRef.current === pull?.id) return;
    mountedPullRef.current = pull?.id;
    setOwnTimeMs(0); setPlaying(false); setSelectedKey(null);
  }, [pull?.id]);

  // Only a new request seeks: the panel remounting with an old one doesn't.
  const lastSeekRef = useRef(seekRequest?.n ?? 0);
  useEffect(() => {
    if (!seekRequest || seekRequest.n === lastSeekRef.current) return;
    lastSeekRef.current = seekRequest.n;
    setOwnTimeMs(Math.max(0, Math.min(durationMs, seekRequest.ms)));
  }, [seekRequest, durationMs]);

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

  // Report the time at most every 200ms: the roster and analysis panels
  // don't need 60fps. A skipped report is sent when the 200ms is up, so a
  // small seek while paused still lands.
  const lastReportRef = useRef({ at: 0, value: -1 });
  useEffect(() => {
    if (!onTimeChange) return;
    const send = () => { lastReportRef.current = { at: performance.now(), value: t }; onTimeChange(t); };
    const last = lastReportRef.current;
    const wait = 200 - (performance.now() - last.at);
    if (wait <= 0 || Math.abs(t - last.value) >= 2000) { send(); return; }
    const id = setTimeout(send, wait);
    return () => clearTimeout(id);
  }, [t, onTimeChange]);

  // ── Per-pull precomputation ──────────────────────────────────────────────
  const wow = data?.game === "wow";
  const view = useMemo(() => (data ? fitReplayView(data) : null), [data]);
  const aoes = useMemo(() => (!data ? [] : data.game === "wow" ? buildWowAoeShapes(data) : buildAoeShapes(data)), [data]);
  const raidwide = useMemo(() => (data?.game === "wow" ? buildWowRaidwide(data) : []), [data]);
  const tethers = useMemo(() => (data && data.game !== "wow" ? buildTethers(data) : []), [data]);
  const players = useMemo(() => new Map((pull?.players ?? []).map((p) => [p.name, p])), [pull]);
  const slotByName = useMemo(() => {
    const m = new Map<string, string>();
    if (pull?.game === "ffxiv") for (const r of detectFFRoles(pull.players)) if (r.player) m.set(r.player.name, r.slot + (r.tentative ? "?" : ""));
    return m;
  }, [pull]);
  const actorByKey = useMemo(() => new Map((data?.actors ?? []).map((a) => [a.key, a])), [data]);
  const casterEffects = useMemo(() => (data && data.game !== "wow" ? buildCasterEffects(data) : []), [data]);
  const headMarkers = useMemo(() => (data && data.game !== "wow" ? buildHeadMarkers(data, HEAD_MARKER_PLAIN_MS) : []), [data]);
  const aurasByKey = useMemo(() => {
    const m = new Map<string, NonNullable<ReplayData["playerAuras"]>>();
    for (const s of data?.playerAuras ?? []) m.set(s[2], [...(m.get(s[2]) ?? []), s]);
    return m;
  }, [data]);

  if (!pull) return <Empty>Select a pull to see its replay.</Empty>;
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

  const game = wow ? "wow" : "ffxiv";
  const unit = wow ? "yards" : "yalms";
  const playerColor = (a: ReplayActor) => getClassColor(game, players.get(a.name)?.className ?? a.job ?? "");
  const mapUrl = data.map ? ffMapImageUrl(data.map.filename) : null;
  const wowMap = wow ? data.wowMap : undefined;
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
            {showMap && wowMap && (
              <image href={`/api/wow-map/${wowMap.uiMapId}/image`} x={toX(wowMap.x)} y={toY(wowMap.y)}
                width={wowMap.width * scale} height={wowMap.height * scale} preserveAspectRatio="none" />
            )}
            {showGrid && <Grid cx={cx} cy={cy} half={half} toX={toX} toY={toY} S={S} />}
            {showRings && <Rings cx={cx} cy={cy} half={half} toX={toX} toY={toY} scale={scale} />}
            {/* Floor effects (FRU Thin Ice) under everything else. */}
            {showAoes && casterEffects.filter((e) => e.kind === "ice-floor" && t >= e.start && t <= e.end).map((e) => (
              <IceFloor key={`floor-${e.start}`} e={e} x={toX(e.x)} y={toY(e.y)} r={(e.radius ?? 2000) * scale} t={t} />
            ))}
            {showAoes && aoesAt(aoes, t).map(({ s, opacity, resolving }, i) => {
              // An aura shape rides on its actor (WoW Plague Froth).
              const rider = s.follow ? actorByKey.get(s.follow) : undefined;
              const at = rider && poseAt(rider, t);
              if (s.follow && !at) return null;
              return <Aoe key={i} uid={`${i}-${s.resolve}`} s={at ? { ...s, x: at.x, y: at.y } : s} opacity={opacity} resolving={resolving} toX={toX} toY={toY} scale={scale} t={t} />;
            })}
            {tethers.filter((tt) => t >= tt.start && t <= tt.end).map((tt, i) => {
              const src = actorByKey.get(tt.source), dst = actorByKey.get(tt.target);
              const a = src && tetherEndAt(src, tt, t, TETHER_LOOKUP_MS);
              const b = dst && tetherEndAt(dst, tt, t, TETHER_LOOKUP_MS);
              if (!a || !b) return null;
              const line = { x1: toX(a.x), y1: toY(a.y), x2: toX(b.x), y2: toY(b.y) };
              if (tt.element) return <ElementTether key={i} {...line} element={tt.element} t={t} />;
              return (
                <g key={i} pointerEvents="none">
                  <line {...line} stroke={TETHER_COLOR} strokeWidth={12} strokeOpacity={0.35} strokeLinecap="round" filter="url(#replay-glow)" />
                  <line {...line} stroke={TETHER_COLOR} strokeWidth={4} strokeLinecap="round" />
                  <circle cx={line.x1} cy={line.y1} r={7} fill={TETHER_COLOR} stroke="#fff" strokeWidth={2} />
                </g>
              );
            })}
            {/* Boss cues (FRU Cyclonic Break's dragon), around the caster. */}
            {showAoes && casterEffects.filter((e) => e.kind !== "ice-floor" && t >= e.start && t <= e.end).map((e) => {
              const follow = e.actor ? actorByKey.get(e.actor) : undefined;
              const p = follow && poseAt(follow, t);
              const at = p && !p.stale ? p : e;
              if (e.radius !== undefined) return <ElementHalo key={`${e.kind}-${e.start}-${e.x}-${e.y}`} e={e} x={toX(e.x)} y={toY(e.y)} r={e.radius * scale} t={t} />;
              const hitbox = follow?.hitbox ?? 500;
              return <ElementDragon key={`${e.kind}-${e.start}-${e.x}`} e={e} x={toX(at.x)} y={toY(at.y)} r={Math.max(BOSS_ICON / 2 + 20, hitbox * scale * 0.6)} t={t} />;
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
                {wow && a.icon?.startsWith("custom-icon-") ? (
                  // WCL's enemy icons are square ability icons: framed like the roster's.
                  <g filter="url(#replay-shadow)">
                    <image href={wowEnemyIconUrl(a.icon)} x={x - size / 2} y={y - size / 2} width={size} height={size} />
                    <rect x={x - size / 2} y={y - size / 2} width={size} height={size} rx={3} fill="none" stroke="#ff8a80" strokeWidth={2} />
                  </g>
                ) : (
                  <image href={FFLOGS_ICON(a.icon === "Boss" ? "Boss" : "NPC")} x={x - size / 2} y={y - size / 2} width={size} height={size} />
                )}
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
            // Lifted and jailed (FRU Floating Fetters): the icon rises off
            // its spot, which keeps a shadow, inside a cage.
            const jail = !dead ? (aurasByKey.get(a.key) ?? []).find((s) => JAIL_STATUSES.has(s[3]) && s[0] <= t && t < s[1]) : undefined;
            const lift = jail ? Math.min(1, (t - jail[0]) / 400) * 12 * iconScale : 0;
            const iy = y - lift;
            return (
              <g key={a.key} style={{ cursor: "pointer" }} opacity={dead ? 0.5 : p.stale ? 0.75 : 1}
                onMouseEnter={() => setHoverKey(a.key)} onMouseLeave={() => setHoverKey((k) => (k === a.key ? null : k))}
                onClick={(e) => { e.stopPropagation(); setSelectedKey(a.key); }}>
                {selectedKey === a.key && <TargetRing x={x} y={y} r={Math.max(r + 10, (a.hitbox ?? 50) * scale)} deg={deg} />}
                {!dead && showAoes && <SlideTrail a={a} t={t} toX={toX} toY={toY} auras={aurasByKey.get(a.key)} />}
                {jail &&<ellipse cx={x} cy={y + r * 0.7} rx={r * 0.8} ry={r * 0.28} fill="#000" fillOpacity={0.45} />}
                {!dead && <FacingWedge x={x} y={iy} r={r} b={(deg * Math.PI) / 180} color={roleColor} size={8 * iconScale} />}
                <image href={wow && info ? getPlayerSpecIcon("wow", info.specId, info.className) : getPlayerClassIcon(game, info?.className ?? a.job ?? "")}
                  x={x - r} y={iy - r} width={size} height={size}
                  filter={dead ? "url(#replay-gray)" : "url(#replay-shadow)"} />
                {jail && <JailCage x={x} y={iy} r={r} t={t} start={jail[0]} end={jail[1]} />}
                {dead && (
                  <path d={`M${x - r * 0.6} ${y - r * 0.6} L${x + r * 0.6} ${y + r * 0.6} M${x + r * 0.6} ${y - r * 0.6} L${x - r * 0.6} ${y + r * 0.6}`} stroke="#ff4d4d" strokeWidth={4} strokeLinecap="round" />
                )}
                {showStatuses && !dead && (
                  <StatusRow x={x} bottom={iy - r - 2} t={t} scale={iconScale} spans={activeStatuses(aurasByKey.get(a.key), t, data.durationMs)} info={data.auraInfo ?? {}} />
                )}
              </g>
            );
          })}

          {/* Head markers: a label over the marked actor. */}
          {showStatuses && headMarkers.filter((m) => t >= m.start && t <= m.end).map((m, i) => {
            const at = live.find((l) => l.a.key === m.target);
            if (!at) return null;
            // Above the player's status row when they have one.
            const statuses = at.a.kind === "player" && at.p.hp !== 0 && activeStatuses(aurasByKey.get(at.a.key), t, data.durationMs).length > 0;
            const top = toY(at.p.y) - (at.a.kind === "player" ? PLAYER_ICON * iconScale / 2 : BOSS_ICON / 2) - 8 - (statuses ? statusRowHeight(iconScale) : 0);
            return <MarkerLabel key={`${m.target}-${m.start}-${i}`} x={toX(at.p.x)} y={top} label={m.label} known={!m.label.startsWith("Marker ")} />;
          })}

          {hovered && (
            <Tooltip x={toX(hovered.p.x)} y={toY(hovered.p.y)} S={S}
              lines={[...tooltipLines(hovered.a, hovered.p, slotByName, players, wow), ...statusLines(aurasByKey.get(hovered.a.key), t, data)]}
              color={hovered.a.kind === "player" ? playerColor(hovered.a) : "#ff8a80"} />
          )}
          {selected && !hovered && (
            <Tooltip x={toX(selected.p.x)} y={toY(selected.p.y)} S={S}
              lines={[...tooltipLines(selected.a, selected.p, slotByName, players, wow), ...statusLines(aurasByKey.get(selected.a.key), t, data)]}
              color={selected.a.kind === "player" ? playerColor(selected.a) : "#ff8a80"} />
          )}
        </svg>

        {showAoes && raidwide.length > 0 && (
          <div style={{ position: "absolute", top: 14, right: 14, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, pointerEvents: "none" }}>
            {wowRaidwideAt(raidwide, t).slice(0, 3).map((r) => (
              <div key={`${r.t}-${r.name}`} style={{ background: "rgba(60,20,90,0.85)", border: "1px solid #b47bff", borderRadius: 4, padding: "3px 8px", fontSize: 12, color: "#f1e2ff", whiteSpace: "nowrap" }}
                title="A room-wide hit">
                {r.name} <span style={{ color: "#c99bff" }}>· {r.players} hit</span>
              </div>
            ))}
          </div>
        )}
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
            <Toggle label="AoEs" title={wow ? "Enemy AoEs at their game-data size, placed where they hit" : "Enemy AoEs at their game-data size"} checked={showAoes} onChange={setShowAoes} />
            {mapUrl && <Toggle label="Map" title={`In-game map: ${data.map!.name}`} checked={showMap} onChange={setShowMap} />}
            {wowMap && <Toggle label="Map" title={`In-game map: ${data.mapName ?? "zone map"} (Blizzard's art, about 1px per yard)`} checked={showMap} onChange={setShowMap} />}
            <Toggle label="5y rings" title={`Rings every 5 ${unit} from the ${wow ? "party's median position" : "arena centre"}`} checked={showRings} onChange={setShowRings} />
            <Toggle label="5y grid" title={`A 5-${unit.slice(0, -1)} grid with 0,0 at the ${wow ? "party's median position" : "arena centre"}`} checked={showGrid} onChange={setShowGrid} />
            <Toggle label="Helper actors" title="Untargetable actors that place AoEs" checked={showHelpers} onChange={setShowHelpers} />
            {!wow && <Toggle label="Statuses" title="Debuffs enemies put on each player, with time left and stacks, and head markers" checked={showStatuses} onChange={setShowStatuses} />}
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

/**
 * Name, slot (FFXIV) or role and spec (WoW), coordinates and HP for the
 * hover card. Coordinates are the log's own: yalms, or WCL's yards with +y
 * north (the track stores y negated, see wow-replay.ts).
 */
function tooltipLines(a: ReplayActor, p: ReplayPose, slots: Map<string, string>, players: Map<string, PlayerInfo>, wow: boolean): string[] {
  const where = `X ${(p.x / 100).toFixed(1)}  Y ${((wow ? -p.y : p.y) / 100).toFixed(1)}`;
  const hp = p.hp >= 0 ? `HP ${Math.round(p.hp * 100)}%` : "";
  if (a.kind === "player") {
    const info = players.get(a.name);
    const who = wow
      ? [info?.role, [info?.specName, info?.className ?? a.job].filter(Boolean).join(" ")]
      : [slots.get(a.name), info?.className ?? a.job];
    return [a.name, who.filter(Boolean).join(" · "), [where, hp].filter(Boolean).join("   ")];
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
/**
 * A knockback as the push it is, not an area to avoid: pale blue arrows
 * pointing the way players are thrown. A line (Blastburn) pushes out to
 * both sides of its centreline; a circle pushes out from its centre. A
 * filled 50y-wide Blastburn covered the whole arena (user, 2026-10-17).
 */
const KB_SPACING = 500;     // centi-yalms between arrows along a line, or around a ring
const KB_ARROW = 350;       // arrow length, centi-yalms
function Knockback({ s, x, y, r, scale, opacity }: { s: AoeShape; x: number; y: number; r: number; scale: number; opacity: number }) {
  const c = AOE_COLORS.knockback;
  const len = KB_ARROW * scale;
  const arrow = (ax: number, ay: number, dx: number, dy: number, k: string) => {
    const bx = ax + dx * len, by = ay + dy * len;
    const hx = -dy * len * 0.28, hy = dx * len * 0.28;
    return (
      <g key={k}>
        <line x1={ax} y1={ay} x2={bx} y2={by} stroke={c.glow} strokeWidth={7} strokeOpacity={0.4} strokeLinecap="round" />
        <line x1={ax} y1={ay} x2={bx - dx * len * 0.2} y2={by - dy * len * 0.2} stroke={c.rim} strokeWidth={3} strokeLinecap="round" />
        <path d={`M${bx} ${by} L${bx - dx * len * 0.38 + hx} ${by - dy * len * 0.38 + hy} L${bx - dx * len * 0.38 - hx} ${by - dy * len * 0.38 - hy} Z`} fill={c.rim} />
      </g>
    );
  };
  const out: React.ReactNode[] = [];
  if (s.kind === "rect") {
    const b = (s.bearing * Math.PI) / 180;
    const ux = Math.sin(b), uy = -Math.cos(b);   // along the line (screen)
    const px = -uy, py = ux;                       // across it
    const n = Math.floor(s.range / KB_SPACING);
    const off = 120 * scale;                       // start just off the centreline
    for (let k = 1; k < n; k++) {
      const ax = x + ux * k * KB_SPACING * scale, ay = y + uy * k * KB_SPACING * scale;
      // Only over the arena: the view's inscribed circle (lines run 80y).
      if (Math.hypot(ax - 500, ay - 500) > 430) continue;
      out.push(arrow(ax + px * off, ay + py * off, px, py, `a${k}`), arrow(ax - px * off, ay - py * off, -px, -py, `b${k}`));
    }
    out.unshift(<line key="c" x1={x} y1={y} x2={x + ux * r} y2={y + uy * r} stroke={c.rim} strokeWidth={2} strokeOpacity={0.6} strokeDasharray="8 8" />);
  } else {
    const ring = Math.max(r * 0.5, 150 * scale);
    const n = Math.max(6, Math.min(12, Math.round((2 * Math.PI * ring) / (KB_SPACING * scale))));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      out.push(arrow(x + Math.sin(a) * ring, y - Math.cos(a) * ring, Math.sin(a), -Math.cos(a), `r${k}`));
    }
    out.unshift(<circle key="c" cx={x} cy={y} r={6} fill={c.rim} />);
  }
  return <g opacity={opacity} pointerEvents="none">{out}</g>;
}

/**
 * A cross while it's still telegraphed, as the game's star (FRU Frigid
 * Needle): four golden points out of its centre along the arms, each
 * tipped with an arrow, and a faint guide along the line it will shoot.
 * Two crosses on one spot (cardinal + diagonal) make the 8-way star.
 */
const STAR_POINT = 650;     // centi-yalms
function StarPoints({ s, x, y, r, scale, opacity }: { s: AoeShape; x: number; y: number; r: number; scale: number; opacity: number }) {
  const len = STAR_POINT * scale, base = 90 * scale;
  return (
    <g opacity={opacity} pointerEvents="none">
      {[0, 90, 180, 270].map((d) => {
        const b = ((s.bearing + d) * Math.PI) / 180;
        const ux = Math.sin(b), uy = -Math.cos(b), px = -uy, py = ux;
        const tip = { x: x + ux * len, y: y + uy * len };
        const head = 0.32 * len;
        return (
          <g key={d}>
            <line x1={x} y1={y} x2={x + ux * r} y2={y + uy * r} stroke="#ffd36b" strokeOpacity={0.45} strokeWidth={1.5} strokeDasharray="6 8" />
            <path d={`M${x + px * base} ${y + py * base} L${tip.x - ux * head * 0.6} ${tip.y - uy * head * 0.6} L${x - px * base} ${y - py * base} Z`}
              fill="#ff9a2e" fillOpacity={0.85} stroke="#fff0c8" strokeWidth={1.5} strokeLinejoin="round" />
            <path d={`M${tip.x} ${tip.y} L${tip.x - ux * head + px * head * 0.45} ${tip.y - uy * head + py * head * 0.45} L${tip.x - ux * head - px * head * 0.45} ${tip.y - uy * head - py * head * 0.45} Z`}
              fill="#ffe08a" stroke="#c4560c" strokeWidth={1.5} strokeLinejoin="round" />
          </g>
        );
      })}
    </g>
  );
}

/**
 * A drop someone is carrying (FRU Frigid Stone): a yellow outline around
 * the player that pulses gently, so it doesn't read as damage being taken
 * (user, 2026-10-17). Full strength from the start, unlike a telegraph.
 */
function DropRing({ x, y, r, t }: { x: number; y: number; r: number; t: number }) {
  const c = AOE_COLORS.drop;
  const pulse = 0.5 + 0.5 * Math.sin(t / 160);   // ~1 beat a second
  return (
    <g pointerEvents="none">
      <circle cx={x} cy={y} r={r * (1 + 0.04 * pulse)} fill={c.fill} fillOpacity={0.06 + 0.06 * pulse}
        stroke={c.glow} strokeWidth={8} strokeOpacity={0.25 + 0.25 * pulse} filter="url(#replay-glow)" />
      <circle cx={x} cy={y} r={r * (1 + 0.04 * pulse)} fill="none" stroke={c.rim} strokeWidth={2.5} strokeOpacity={0.75 + 0.25 * pulse} />
    </g>
  );
}

/**
 * An ice circle still being prepared (FRU Icicle Impact): a white ring
 * with a frosted fill and a snowflake turning in the middle. The ring
 * closes in from a wider dashed one as the cast fills, so it reads as
 * coming, not landed (user, 2026-10-17).
 */
function IceCircle({ x, y, r, t, s, opacity }: { x: number; y: number; r: number; t: number; s: AoeShape; opacity: number }) {
  const c = AOE_COLORS.ice;
  const f = Math.max(0, Math.min(1, (t - s.start) / Math.max(1, s.resolve - s.start)));   // cast progress
  const spin = (t / 25) % 360;
  const flake = r * 0.42;
  const arm = (a: number) => {
    const rad = (a * Math.PI) / 180, ux = Math.sin(rad), uy = -Math.cos(rad), px = -uy, py = ux;
    const at = (d: number) => ({ x: x + ux * d, y: y + uy * d });
    const b1 = at(flake * 0.45), b2 = at(flake * 0.72), tip = at(flake);
    const br = flake * 0.22;
    return (
      <g key={a}>
        <line x1={x} y1={y} x2={tip.x} y2={tip.y} />
        <path d={`M${b1.x + (ux + px) * br * 0.7} ${b1.y + (uy + py) * br * 0.7} L${b1.x} ${b1.y} L${b1.x + (ux - px) * br * 0.7} ${b1.y + (uy - py) * br * 0.7}`} fill="none" />
        <path d={`M${b2.x + (ux + px) * br * 0.5} ${b2.y + (uy + py) * br * 0.5} L${b2.x} ${b2.y} L${b2.x + (ux - px) * br * 0.5} ${b2.y + (uy - py) * br * 0.5}`} fill="none" />
      </g>
    );
  };
  return (
    <g opacity={Math.max(0.6, opacity)} pointerEvents="none">
      <circle cx={x} cy={y} r={r} fill={c.fill} fillOpacity={0.12 + 0.18 * f} stroke={c.glow} strokeWidth={10} strokeOpacity={0.35} filter="url(#replay-glow)" />
      <circle cx={x} cy={y} r={r * (1.18 - 0.18 * f)} fill="none" stroke={c.rim} strokeOpacity={0.5 * (1 - f)} strokeWidth={2} strokeDasharray="10 8" />
      <circle cx={x} cy={y} r={r} fill="none" stroke={c.rim} strokeWidth={2.5} />
      <g transform={`rotate(${spin} ${x} ${y})`} stroke={c.rim} strokeWidth={Math.max(2, r * 0.035)} strokeLinecap="round" opacity={0.6 + 0.4 * f}>
        {[0, 60, 120, 180, 240, 300].map(arm)}
      </g>
    </g>
  );
}

/**
 * A line stack while it's coming, as the game's standard marker: orange
 * chevrons in a row along the beam, all pointing back at the caster and
 * drifting toward it, inside a faint outline of the beam's width (marker
 * 525; user, 2026-10-17). The beam itself flashes as a stack when it fires.
 */
const CHEVRON_STEP = 300;   // centi-yalms between chevrons
function LineStackChevrons({ s, x, y, r, scale, t, opacity }: { s: AoeShape; x: number; y: number; r: number; scale: number; t: number; opacity: number }) {
  const c = AOE_COLORS.stack;
  const b = (s.bearing * Math.PI) / 180;
  const ux = Math.sin(b), uy = -Math.cos(b), px = -uy, py = ux;
  const half = Math.max(8, (s.width * scale) / 2);
  const step = CHEVRON_STEP * scale;
  const drift = ((t / 600) % 1) * step;      // flowing toward the caster
  const out: React.ReactNode[] = [];
  for (let d = step - drift; d < r; d += step) {
    const cx = x + ux * d, cy = y + uy * d;
    if (Math.hypot(cx - 500, cy - 500) > 440) continue;   // over the arena only
    const tip = { x: cx - ux * half * 0.6, y: cy - uy * half * 0.6 };
    out.push(
      <path key={d.toFixed(1)} d={`M${cx + px * half} ${cy + py * half} L${tip.x} ${tip.y} L${cx - px * half} ${cy - py * half}`}
        fill="none" stroke={c.fill} strokeWidth={Math.max(3, half * 0.35)} strokeLinecap="round" strokeLinejoin="round" />,
    );
  }
  const end = { x: x + ux * r, y: y + uy * r };
  const edge = (k: number) => `M${x + px * half * k} ${y + py * half * k} L${end.x + px * half * k} ${end.y + py * half * k}`;
  return (
    <g opacity={Math.max(0.7, opacity)} pointerEvents="none">
      <path d={`${edge(1)} ${edge(-1)}`} stroke={c.rim} strokeOpacity={0.35} strokeWidth={1.5} strokeDasharray="6 6" fill="none" />
      <g filter="url(#replay-shadow)">{out}</g>
    </g>
  );
}

/**
 * A glowing puddle left on the floor (FRU Sinbound Holy's Bleeding): a
 * soft white-gold pool, brightest at its edge, shimmering slightly, fading
 * out over its last half second.
 */
function Puddle({ x, y, r, t, s, uid }: { x: number; y: number; r: number; t: number; s: AoeShape; uid: string }) {
  const c = AOE_COLORS.puddle;
  const fade = Math.max(0, Math.min(1, (t - s.start) / 200, (s.resolve - t) / 500));
  const shimmer = 0.5 + 0.5 * Math.sin(t / 220 + x);
  const grad = `pd-${uid}`;
  return (
    <g opacity={fade} pointerEvents="none">
      <defs>
        <radialGradient id={grad} gradientUnits="userSpaceOnUse" cx={x} cy={y} r={Math.max(1, r)}>
          <stop offset="0%" stopColor={c.fill} stopOpacity={0.18} />
          <stop offset="75%" stopColor={c.fill} stopOpacity={0.32 + 0.1 * shimmer} />
          <stop offset="100%" stopColor={c.glow} stopOpacity={0.6} />
        </radialGradient>
      </defs>
      <circle cx={x} cy={y} r={r} fill={`url(#${grad})`} stroke={c.glow} strokeWidth={8} strokeOpacity={0.3 + 0.15 * shimmer} filter="url(#replay-glow)" />
      <circle cx={x} cy={y} r={r} fill="none" stroke={c.rim} strokeWidth={1.5} strokeOpacity={0.8} />
    </g>
  );
}

function Aoe({ s, opacity, resolving, toX, toY, scale, uid, t }: { s: AoeShape; opacity: number; resolving: boolean; toX: (x: number) => number; toY: (y: number) => number; scale: number; uid: string; t: number }) {
  const x = toX(s.x), y = toY(s.y);
  const r = s.range * scale;
  const b = (s.bearing * Math.PI) / 180;
  if (s.style === "tower" && s.kind === "circle") return <Tower x={x} y={y} r={r} opacity={opacity} resolving={resolving} uid={uid} soakers={s.soakers} />;
  if (s.style === "knockback") return <Knockback s={s} x={x} y={y} r={r} scale={scale} opacity={opacity} />;
  if (s.kind === "cross" && s.star && !resolving) return <StarPoints s={s} x={x} y={y} r={r} scale={scale} opacity={opacity} />;
  if (s.style === "drop") return <DropRing x={x} y={y} r={r} t={t} />;
  if (s.kind === "rect" && s.lineStack && !resolving) return <LineStackChevrons s={s} x={x} y={y} r={r} scale={scale} t={t} opacity={opacity} />;
  if (s.style === "puddle") return <Puddle x={x} y={y} r={r} t={t} s={s} uid={uid} />;
  if (s.style === "ice" && s.kind === "circle" && !resolving) return <IceCircle x={x} y={y} r={r} t={t} s={s} opacity={opacity} />;
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
function Tower({ x, y, r, opacity, resolving, uid, soakers }: { x: number; y: number; r: number; opacity: number; resolving: boolean; uid: string; soakers?: number }) {
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
      {/* Soakers needed, beside the pillar (FRU P1's Explosion ids say). */}
      {soakers !== undefined && (
        <text x={x + r * 0.45} y={y + r * 0.55} textAnchor="middle" fill="#fff" fontSize={Math.max(16, r * 0.7)} fontWeight={800} {...LABEL}>{soakers}</text>
      )}
    </g>
  );
}

type AuraSpan = NonNullable<ReplayData["playerAuras"]>[number];

/**
 * A player sliding on ice (FRU Thin Ice): a fading pale-blue streak along
 * where they were over the last 0.8s, drawn only while they move.
 */
const SLIDE_TRAIL_MS = 800;
function SlideTrail({ a, t, toX, toY, auras }: { a: ReplayActor; t: number; toX: (x: number) => number; toY: (y: number) => number; auras: AuraSpan[] | undefined }) {
  if (!auras?.some((s) => SLIDE_STATUSES.has(s[3]) && s[0] <= t && t < s[1])) return null;
  const pts: { x: number; y: number }[] = [];
  for (let k = 4; k >= 0; k--) {
    const p = poseAt(a, t - (SLIDE_TRAIL_MS * k) / 4);
    if (p) pts.push({ x: toX(p.x), y: toY(p.y) });
  }
  if (pts.length < 2 || Math.hypot(pts[0].x - pts[pts.length - 1].x, pts[0].y - pts[pts.length - 1].y) < 6) return null;
  return (
    <g pointerEvents="none">
      {pts.slice(1).map((p, i) => (
        <line key={i} x1={pts[i].x} y1={pts[i].y} x2={p.x} y2={p.y} stroke="#dff5ff"
          strokeWidth={3 + i * 2.5} strokeOpacity={0.15 + i * 0.15} strokeLinecap="round" />
      ))}
    </g>
  );
}

/** Hover-card lines naming every status up at `t`: "Prey", "Lightsteeped ×3  12s". */
function statusLines(spans: AuraSpan[] | undefined, t: number, data: ReplayData): string[] {
  return activeStatuses(spans, t, data.durationMs).map(({ s, open }) =>
    `${data.auraInfo?.[s[3]]?.name ?? `Status ${s[3]}`}${s[4] > 0 ? ` ×${s[4]}` : ""}${open ? "" : `  ${Math.ceil((s[1] - t) / 1000)}s`}`);
}

/** The statuses up at `t`, mechanic ones first (newest first), at most MAX_STATUS_ICONS. */
function activeStatuses(spans: AuraSpan[] | undefined, t: number, durationMs: number): { s: AuraSpan; open: boolean }[] {
  if (!spans) return [];
  const up = spans.filter((s) => s[0] <= t && t < s[1]);
  up.sort((p, q) => Number(COMMON_STATUSES.has(p[3])) - Number(COMMON_STATUSES.has(q[3])) || q[0] - p[0]);
  // A span running to the pull's end has no real end: no timer.
  return up.slice(0, MAX_STATUS_ICONS).map((s) => ({ s, open: s[1] >= durationMs }));
}

/** Height of a status row (icons plus the timers under them), SVG units. */
const statusRowHeight = (scale: number) => (STATUS_H + 11) * Math.max(0.8, scale);

/**
 * A player's statuses in a row above their icon (user, 2026-10-17), like
 * the game's party list: the status icon, seconds left under it (to the
 * status's end in the log, which is its real expiry or removal), stacks in
 * its corner. `bottom` is where the row ends, just above the icon.
 */
function StatusRow({ x, bottom, t, scale, spans, info }: { x: number; bottom: number; t: number; scale: number; spans: { s: AuraSpan; open: boolean }[]; info: Record<number, { name: string; icon?: string }> }) {
  if (!spans.length) return null;
  const w = STATUS_W * Math.max(0.8, scale), h = STATUS_H * Math.max(0.8, scale), gap = 2;
  const y = bottom - statusRowHeight(scale);
  const left = x - (spans.length * w + (spans.length - 1) * gap) / 2;
  return (
    <g pointerEvents="none">
      {spans.map(({ s, open }, i) => {
        const ix = left + i * (w + gap);
        const url = getFFAbilityIconUrl(info[s[3]]?.icon);
        const left_s = Math.ceil((s[1] - t) / 1000);
        return (
          <g key={`${s[0]}-${s[3]}`}>
            {url ? <image href={url} x={ix} y={y} width={w} height={h} preserveAspectRatio="xMidYMid meet" />
              : <rect x={ix} y={y} width={w} height={h} rx={2} fill="#3a3f4a" stroke="#888" />}
            {s[4] > 0 && <text x={ix + w - 1} y={y + h - 2} textAnchor="end" fill="#fff" fontSize={11 * Math.max(0.8, scale)} fontWeight={800} {...LABEL}>{s[4]}</text>}
            {!open && left_s <= 99 && (
              <text x={ix + w / 2} y={y + h + 10 * Math.max(0.8, scale)} textAnchor="middle" fill="#fff" fontSize={10 * Math.max(0.8, scale)} {...LABEL}>{left_s}</text>
            )}
          </g>
        );
      })}
    </g>
  );
}

/** A head marker's name in a pill above the marked actor; unknown ids show dimmer. */
function MarkerLabel({ x, y, label, known }: { x: number; y: number; label: string; known: boolean }) {
  const w = label.length * 8.2 + 14, h = 20;
  return (
    <g pointerEvents="none" opacity={known ? 1 : 0.8}>
      <rect x={x - w / 2} y={y - h} width={w} height={h} rx={10} fill={known ? "rgba(255,214,90,0.92)" : "rgba(40,40,48,0.88)"} stroke={known ? "#7a5200" : "#aaa"} strokeWidth={1.5} />
      <text x={x} y={y - 5.5} textAnchor="middle" fill={known ? "#2a1a00" : "#eee"} fontSize={13} fontWeight={700}>{label}</text>
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
