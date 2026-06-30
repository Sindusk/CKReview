"use client";

import type { Pull }      from "@/types/Pull";
import type { CastEvent } from "@/lib/wcl-transforms";

type RichPull = Pull & { castEvents?: CastEvent[] };

type AnalysisPanelProps = {
  pull:              RichPull | null;
  playbackTimeMs:    number;
  onSeekToTime?:     (ms: number) => void;  // seeks video to ms-into-pull
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s}s`;
}

// ─── Colour maps ──────────────────────────────────────────────────────────────

const ROLE_COLOR: Record<string, string> = {
  Tank:   "#60a5fa",
  Healer: "#4ade80",
  DPS:    "#f87171",
};

const CLASS_COLOR: Record<string, string> = {
  "Death Knight": "#C41E3A",
  "Demon Hunter": "#A330C9",
  "Druid":        "#FF7C0A",
  "Evoker":       "#33937F",
  "Hunter":       "#AAD372",
  "Mage":         "#3FC7EB",
  "Monk":         "#00FF98",
  "Paladin":      "#F48CBA",
  "Priest":       "#FFFFFF",
  "Rogue":        "#FFF468",
  "Shaman":       "#0070DD",
  "Warlock":      "#8788EE",
  "Warrior":      "#C69B3A",
};

function classColor(cls: string): string {
  return CLASS_COLOR[cls] ?? "#aaa";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ label, count }: { label: string; count?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "12px 0 6px" }}>
      <span style={{ fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </span>
      {count !== undefined && (
        <span
          style={{
            fontSize: "10px", color: "#444",
            backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a",
            borderRadius: "10px", padding: "1px 6px",
          }}
        >
          {count}
        </span>
      )}
      <div style={{ flex: 1, height: "1px", backgroundColor: "#1e1e1e" }} />
    </div>
  );
}

function DeathRow({
  event,
  fightDuration,
  playbackTimeMs,
  onSeek,
}: {
  event:          RichPull["deathEvents"][number];
  fightDuration:  number;
  playbackTimeMs: number;
  onSeek?:        (ms: number) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const hasPassed  = playbackTimeMs >= event.timestamp;
  const pct        = fightDuration > 0 ? Math.round((event.timestamp / fightDuration) * 100) : 0;
  const roleColor  = ROLE_COLOR[event.role] ?? "#aaa";
  const cls        = classColor(event.class);

  // Seek 3 s before the death (clamped to 0)
  const seekTarget = Math.max(0, event.timestamp - 3000);

  return (
    <div
      onClick={() => onSeek?.(seekTarget)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:         "flex",
        alignItems:      "center",
        gap:             "8px",
        padding:         "6px 10px",
        borderRadius:    "5px",
        backgroundColor: hovered
          ? "rgba(248,113,113,0.07)"
          : hasPassed
          ? "rgba(248,113,113,0.10)"
          : "transparent",
        borderLeft:      `2px solid ${hasPassed ? roleColor : "#2a2a2a"}`,
        marginBottom:    "4px",
        cursor:          onSeek ? "pointer" : "default",
        transition:      "background-color 0.2s, border-color 0.3s",
      }}
    >
      {/* Timestamp */}
      <span
        style={{
          fontFamily: "monospace",
          fontSize:   "11px",
          color:      hasPassed ? "#888" : "#444",
          minWidth:   "32px",
          flexShrink: 0,
          transition: "color 0.3s",
        }}
      >
        {formatMs(event.timestamp)}
      </span>

      <span style={{ fontSize: "13px", flexShrink: 0, opacity: hasPassed ? 1 : 0.3, transition: "opacity 0.3s" }}>
        💀
      </span>

      {/* Player + role + class + killing blow */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
          <span
            style={{
              color:      hasPassed ? cls : "#555",
              fontWeight: 600,
              fontSize:   "13px",
              transition: "color 0.3s",
            }}
          >
            {event.player}
          </span>
          <span
            style={{
              fontSize:        "10px",
              color:           hasPassed ? roleColor : "#444",
              border:          `1px solid ${hasPassed ? roleColor + "33" : "#2a2a2a"}`,
              borderRadius:    "3px",
              padding:         "1px 5px",
              backgroundColor: hasPassed ? roleColor + "10" : "transparent",
              flexShrink:      0,
              transition:      "all 0.3s",
            }}
          >
            {event.role}
          </span>
          <span style={{ fontSize: "10px", color: hasPassed ? "#555" : "#333", flexShrink: 0, transition: "color 0.3s" }}>
            {event.class}
          </span>
        </div>
        {/* Killing blow */}
        <div style={{ fontSize: "11px", color: hasPassed ? "#f87171" : "#3a2020", marginTop: "2px", transition: "color 0.3s" }}>
          ⚔ {event.cause}
        </div>
      </div>

      {/* % into pull */}
      <span style={{ fontSize: "10px", color: hasPassed ? "#555" : "#333", flexShrink: 0, transition: "color 0.3s" }}>
        {pct}%
      </span>
    </div>
  );
}

function CastRow({ event }: { event: CastEvent }) {
  const color = classColor(event.sourceClass);
  return (
    <div
      style={{
        display:         "flex",
        alignItems:      "center",
        gap:             "8px",
        padding:         "5px 10px",
        borderRadius:    "5px",
        backgroundColor: "#0d0d0d",
        borderLeft:      "2px solid #2a2a2a",
        marginBottom:    "3px",
      }}
    >
      <span style={{ fontFamily: "monospace", fontSize: "11px", color: "#555", minWidth: "32px", flexShrink: 0 }}>
        {formatMs(event.timestamp)}
      </span>
      <span style={{ fontSize: "12px", flexShrink: 0 }}>🔮</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ color, fontSize: "12px", fontWeight: 500 }}>{event.sourceName}</span>
        <span style={{ color: "#555", fontSize: "12px" }}> cast </span>
        <span style={{ color: "#94a3b8", fontSize: "12px" }}>{event.abilityName}</span>
      </div>
    </div>
  );
}

function StatPill({ label, value, color = "#ccc" }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
      <span style={{ fontSize: "9px", color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </span>
      <span style={{ fontSize: "13px", fontWeight: 600, color }}>{value}</span>
    </div>
  );
}

// ─── useState import (needed for DeathRow hover) ──────────────────────────────
import { useState } from "react";

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AnalysisPanel({ pull, playbackTimeMs, onSeekToTime }: AnalysisPanelProps) {
  if (!pull) {
    return (
      <div
        style={{
          height: "100%", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: "8px", color: "#333", padding: "20px", textAlign: "center",
        }}
      >
        <span style={{ fontSize: "28px" }}>📋</span>
        <span style={{ fontSize: "13px", color: "#555", lineHeight: "1.5" }}>
          Select a pull to see its timeline
        </span>
      </div>
    );
  }

  const deaths        = [...pull.deathEvents].sort((a, b) => a.timestamp - b.timestamp);
  const casts         = [...(pull.castEvents ?? [])].sort((a, b) => a.timestamp - b.timestamp);
  const isKill        = pull.result === "Kill";
  const tankDeaths    = deaths.filter(d => d.role === "Tank").length;
  const healerDeaths  = deaths.filter(d => d.role === "Healer").length;
  const dpsDeaths     = deaths.filter(d => d.role === "DPS").length;

  // Convert ms-into-pull seek to absolute video seek via useTimelineController
  function handleDeathSeek(ms: number) {
    onSeekToTime?.(ms);
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* Pull header */}
      <div style={{ padding: "10px 12px", borderBottom: "1px solid #1e1e1e", backgroundColor: "#111", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, fontSize: "14px", color: "#e2e8f0" }}>{pull.name}</span>
          <span
            style={{
              fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "4px",
              backgroundColor: isKill ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.1)",
              color:  isKill ? "#4ade80" : "#f87171",
              border: `1px solid ${isKill ? "#166534" : "#7f1d1d"}`,
            }}
          >
            {isKill ? "KILL" : "WIPE"}
          </span>
        </div>
      </div>

      {/* Summary stats */}
      <div
        style={{
          display: "flex", gap: "16px", padding: "10px 12px",
          backgroundColor: "#0d0d0d", borderBottom: "1px solid #1a1a1a",
          flexShrink: 0, flexWrap: "wrap",
        }}
      >
        <StatPill label="Duration" value={formatDuration(pull.fightDuration)} />
        <StatPill label="Deaths"   value={String(deaths.length)} color={deaths.length > 0 ? "#f87171" : "#4ade80"} />
        {tankDeaths   > 0 && <StatPill label="Tanks"   value={String(tankDeaths)}   color={ROLE_COLOR.Tank} />}
        {healerDeaths > 0 && <StatPill label="Healers" value={String(healerDeaths)} color={ROLE_COLOR.Healer} />}
        {dpsDeaths    > 0 && <StatPill label="DPS"     value={String(dpsDeaths)}    color={ROLE_COLOR.DPS} />}
        {casts.length > 0 && <StatPill label="Casts"   value={String(casts.length)} color="#94a3b8" />}
      </div>

      {/* Event list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 10px 12px" }}>

        {deaths.length > 0 ? (
          <>
            <SectionLabel label="Deaths" count={deaths.length} />
            {deaths.map((d, i) => (
              <DeathRow
                key={i}
                event={d}
                fightDuration={pull.fightDuration}
                playbackTimeMs={playbackTimeMs}
                onSeek={onSeekToTime ? handleDeathSeek : undefined}
              />
            ))}
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", padding: "16px 0 8px", color: "#4ade80", fontSize: "12px" }}>
            <span style={{ fontSize: "20px" }}>✨</span>
            No deaths this pull
          </div>
        )}

        {casts.length > 0 ? (
          <>
            <SectionLabel label="Cast Timeline" count={casts.length} />
            {casts.map((c, i) => <CastRow key={i} event={c} />)}
          </>
        ) : (
          <div style={{ marginTop: "16px", padding: "10px", borderRadius: "6px", border: "1px dashed #222", color: "#333", fontSize: "11px", textAlign: "center" }}>
            Import a WarcraftLogs report to see cast timeline data
          </div>
        )}
      </div>
    </div>
  );
}
