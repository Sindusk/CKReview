"use client";

import { useState } from "react";
import type { Pull } from "@/types/Pull";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError } from "@/types/PullError";
import { getClassColor } from "@/lib/class-colors";

type AnalysisPanelProps = {
  pull: Pull | null;
  playbackTimeMs: number;
  onSeekToTime?: (ms: number) => void;
};

type Tab = "Overall" | "Deaths" | "Major" | "Minor";
const TABS: Tab[] = ["Overall", "Deaths", "Major", "Minor"];

// Unified shape for anything that can appear in the timeline feed —
// a death, a Major error, or a Minor error.
type FeedKind = "Death" | "Major" | "Minor";

// FeedEntry needs the game so FeedRow can pick the right color table:
type FeedEntry = {
  kind:      FeedKind;
  timestamp: number;
  player:    string;
  class:     string;
  role:      "Tank" | "Healer" | "DPS";
  title:     string;
  subtitle?: string;
  game:      "wow" | "ffxiv";   // NEW
};

function deathToFeedEntry(d: DeathEvent, game: "wow" | "ffxiv"): FeedEntry {
  return { kind: "Death", timestamp: d.timestamp, player: d.player, class: d.class, role: d.role, title: d.cause, game };
}

function errorToFeedEntry(e: PullError, game: "wow" | "ffxiv"): FeedEntry {
  return { kind: e.severity, timestamp: e.timestamp, player: e.player, class: e.class, role: e.role, title: e.name, subtitle: e.description, game };
}

const FEED_KIND_STYLE: Record<FeedKind, { icon: string; color: string; label: string }> = {
  Death: { icon: "💀", color: "#f87171", label: "Death" },
  Major: { icon: "⛔", color: "#fb923c", label: "Major" },
  Minor: { icon: "⚠️", color: "#fbbf24", label: "Minor" },
};

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

const ROLE_COLOR: Record<string, string> = {
  Tank: "#60a5fa",
  Healer: "#4ade80",
  DPS: "#f87171",
};

function SectionLabel({ label, count }: { label: string; count?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "12px 0 6px" }}>
      <span style={{ fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </span>
      {count !== undefined && (
        <span
          style={{
            fontSize: "10px",
            color: "#444",
            backgroundColor: "#1a1a1a",
            border: "1px solid #2a2a2a",
            borderRadius: "10px",
            padding: "1px 6px",
          }}
        >
          {count}
        </span>
      )}
      <div style={{ flex: 1, height: "1px", backgroundColor: "#1e1e1e" }} />
    </div>
  );
}

function FeedRow({
  entry,
  fightDuration,
  playbackTimeMs,
  onSeek,
  showKindBadge,
}: {
  entry: FeedEntry;
  fightDuration: number;
  playbackTimeMs: number;
  onSeek?: (ms: number) => void;
  showKindBadge?: boolean;   // show a Death/Major/Minor tag — used on the Overall tab
}) {
  const [hovered, setHovered] = useState(false);
  const hasPassed = playbackTimeMs >= entry.timestamp;
  const pct = fightDuration > 0 ? Math.round((entry.timestamp / fightDuration) * 100) : 0;
  const roleColor = ROLE_COLOR[entry.role] ?? "#aaa";
  const cls = getClassColor(entry.game, entry.class);
  const style = FEED_KIND_STYLE[entry.kind];
  const seekTarget = Math.max(0, entry.timestamp - 3000);

  return (
    <div
      onClick={() => onSeek?.(seekTarget)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 10px",
        borderRadius: "5px",
        backgroundColor: hovered ? style.color + "12" : hasPassed ? style.color + "18" : "transparent",
        borderLeft: `2px solid ${hasPassed ? roleColor : "#2a2a2a"}`,
        marginBottom: "4px",
        cursor: onSeek ? "pointer" : "default",
        transition: "background-color 0.2s, border-color 0.3s",
      }}
    >
      <span
        style={{
          fontFamily: "monospace",
          fontSize: "11px",
          color: hasPassed ? "#888" : "#444",
          minWidth: "32px",
          flexShrink: 0,
          transition: "color 0.3s",
        }}
      >
        {formatMs(entry.timestamp)}
      </span>

      <span style={{ fontSize: "13px", flexShrink: 0, opacity: hasPassed ? 1 : 0.3, transition: "opacity 0.3s" }}>
        {style.icon}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
          <span
            style={{
              color: hasPassed ? cls : "#555",
              fontWeight: 600,
              fontSize: "13px",
              transition: "color 0.3s",
            }}
          >
            {entry.player}
          </span>
          <span
            style={{
              fontSize: "10px",
              color: hasPassed ? roleColor : "#444",
              border: `1px solid ${hasPassed ? roleColor + "33" : "#2a2a2a"}`,
              borderRadius: "3px",
              padding: "1px 5px",
              backgroundColor: hasPassed ? roleColor + "10" : "transparent",
              flexShrink: 0,
              transition: "all 0.3s",
            }}
          >
            {entry.role}
          </span>
          <span style={{ fontSize: "10px", color: hasPassed ? "#555" : "#333", flexShrink: 0, transition: "color 0.3s" }}>
            {entry.class}
          </span>
          {showKindBadge && (
            <span
              style={{
                fontSize: "9px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                color: hasPassed ? style.color : "#444",
                border: `1px solid ${hasPassed ? style.color + "44" : "#2a2a2a"}`,
                borderRadius: "3px",
                padding: "1px 5px",
                flexShrink: 0,
              }}
            >
              {style.label}
            </span>
          )}
        </div>
        <div style={{ fontSize: "11px", color: hasPassed ? style.color : "#3a3a20", marginTop: "2px", transition: "color 0.3s" }}>
          {entry.kind === "Death" ? "⚔ " : ""}{entry.title}
        </div>
        {entry.subtitle && (
          <div style={{ fontSize: "10px", color: hasPassed ? "#666" : "#333", marginTop: "1px", transition: "color 0.3s" }}>
            {entry.subtitle}
          </div>
        )}
      </div>

      <span style={{ fontSize: "10px", color: hasPassed ? "#555" : "#333", flexShrink: 0, transition: "color 0.3s" }}>
        {pct}%
      </span>
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

function TabBar({ value, onChange, counts }: { value: Tab; onChange: (t: Tab) => void; counts: Record<Tab, number> }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "2px",
        padding: "4px 6px",
        backgroundColor: "#0d0d0d",
        borderBottom: "1px solid #1e1e1e",
        flexShrink: 0,
        flexWrap: "wrap",
      }}
    >
      {TABS.map((tab) => {
        const active = tab === value;
        const count = counts[tab];
        const badgeColor =
          tab === "Major" ? "#fb923c" :
          tab === "Minor" ? "#fbbf24" :
          tab === "Deaths" ? "#f87171" :
          "#94a3b8";

        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "3px 8px",
              fontSize: "11px",
              borderRadius: "3px",
              border: active ? `1px solid ${badgeColor}44` : "1px solid #222",
              backgroundColor: active ? badgeColor + "18" : "transparent",
              color: active ? badgeColor : "#555",
              cursor: "pointer",
              fontWeight: active ? 600 : 400,
              whiteSpace: "nowrap",
            }}
          >
            {tab}
            {count > 0 && (
              <span
                style={{
                  fontSize: "9px",
                  color: active ? badgeColor : "#555",
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #2a2a2a",
                  borderRadius: "10px",
                  padding: "0 5px",
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function AnalysisPanel({ pull, playbackTimeMs, onSeekToTime }: AnalysisPanelProps) {
  // Hooks must run unconditionally on every render — declared before the
  // early "no pull selected" return below.
  const [activeTab, setActiveTab] = useState<Tab>("Overall");

  if (!pull) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          color: "#333",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: "28px" }}>📋</span>
        <span style={{ fontSize: "13px", color: "#555", lineHeight: "1.5" }}>
          Select a pull to see its timeline
        </span>
      </div>
    );
  }

  const isKill = pull.result === "Kill";

  const deaths = [...pull.deathEvents].sort((a, b) => a.timestamp - b.timestamp);
  const majors = pull.errors.filter((e) => e.severity === "Major").sort((a, b) => a.timestamp - b.timestamp);
  const minors = pull.errors.filter((e) => e.severity === "Minor").sort((a, b) => a.timestamp - b.timestamp);

  const counts: Record<Tab, number> = {
    Overall: deaths.length + majors.length + minors.length,
    Deaths:  deaths.length,
    Major:   majors.length,
    Minor:   minors.length,
  };

  function handleSeek(ms: number) {
    onSeekToTime?.(ms);
  }

  const feed: FeedEntry[] = (() => {
    switch (activeTab) {
      case "Overall":
        return [
          ...deaths.map((d) => deathToFeedEntry(d, pull.game)),
          ...majors.map((e) => errorToFeedEntry(e, pull.game)),
          ...minors.map((e) => errorToFeedEntry(e, pull.game)),
        ].sort((a, b) => a.timestamp - b.timestamp);
      case "Deaths":
        return deaths.map((d) => deathToFeedEntry(d, pull.game));
      case "Major":
        return majors.map((e) => errorToFeedEntry(e, pull.game));
      case "Minor":
        return minors.map((e) => errorToFeedEntry(e, pull.game));
    }
  })();

  const emptyState: Record<Tab, { icon: string; text: string; color: string }> = {
    Overall: { icon: "✨", text: "No deaths or errors this pull", color: "#4ade80" },
    Deaths:  { icon: "✨", text: "No deaths this pull", color: "#4ade80" },
    Major:   { icon: "✨", text: "No major errors this pull", color: "#4ade80" },
    Minor:   { icon: "✨", text: "No minor errors this pull", color: "#4ade80" },
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "10px 12px", borderBottom: "1px solid #1e1e1e", backgroundColor: "#111", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontWeight: 700, fontSize: "14px", color: "#e2e8f0" }}>{pull.name}</span>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "4px",
              backgroundColor: isKill ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.1)",
              color: isKill ? "#4ade80" : "#f87171",
              border: `1px solid ${isKill ? "#166534" : "#7f1d1d"}`,
            }}
          >
            {isKill ? "KILL" : "WIPE"}
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "16px",
          padding: "10px 12px",
          backgroundColor: "#0d0d0d",
          borderBottom: "1px solid #1a1a1a",
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        <StatPill label="Duration" value={formatDuration(pull.fightDuration)} />
        <StatPill label="Deaths" value={String(deaths.length)} color={deaths.length > 0 ? "#f87171" : "#4ade80"} />
        <StatPill label="Major" value={String(majors.length)} color={majors.length > 0 ? "#fb923c" : "#4ade80"} />
        <StatPill label="Minor" value={String(minors.length)} color={minors.length > 0 ? "#fbbf24" : "#4ade80"} />
      </div>

      <TabBar value={activeTab} onChange={setActiveTab} counts={counts} />

      <div style={{ flex: 1, overflowY: "auto", padding: "4px 10px 12px" }}>
        {feed.length > 0 ? (
          <>
            <SectionLabel label={activeTab} count={feed.length} />
            {feed.map((entry, i) => (
              <FeedRow
                key={i}
                entry={entry}
                fightDuration={pull.fightDuration}
                playbackTimeMs={playbackTimeMs}
                onSeek={onSeekToTime ? handleSeek : undefined}
                showKindBadge={activeTab === "Overall"}
              />
            ))}
          </>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              padding: "16px 0 8px",
              color: emptyState[activeTab].color,
              fontSize: "12px",
            }}
          >
            <span style={{ fontSize: "20px" }}>{emptyState[activeTab].icon}</span>
            {emptyState[activeTab].text}
          </div>
        )}
      </div>
    </div>
  );
}
