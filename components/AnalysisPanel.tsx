"use client";

import { useState } from "react";
import type { Pull } from "@/types/Pull";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError } from "@/types/PullError";
import { CALL_WIPE_RULE_ID } from "@/types/PullError";
import { getClassColor, getRoleColor, formatClassName, getPlayerSpecIcon } from "@/lib/player-display";
import { getSpecInfo } from "@/lib/spec-data";

type AnalysisPanelProps = {
  pull: Pull | null;
  playbackTimeMs: number;
  onSeekToTime?: (ms: number) => void;
  // Fires when the user clicks "Call Wipe" — page.tsx appends a manual
  // Raid error (createCallWipeError) to this pull at the given timestamp.
  onCallWipe?: (pullId: number, timestampMs: number) => void;
};

type Tab = "Overall" | "Deaths" | "Raid" | "Major" | "Minor";
const TABS: Tab[] = ["Overall", "Deaths", "Raid", "Major", "Minor"];

// Unified shape for anything that can appear in the timeline feed —
// a death, or a Raid/Major/Minor error.
type FeedKind = "Death" | "Raid" | "Major" | "Minor";

// FeedEntry needs the game so FeedRow can pick the right color table.
// player/class/role are optional — Raid errors are raid-wide mistakes not
// attributable to any one person (see types/PullError.ts).
type FeedEntry = {
  kind:      FeedKind;
  timestamp: number;
  player?:   string;
  class?:    string;
  specId?:   number;
  role?:     "Tank" | "Healer" | "DPS";
  title:     string;
  subtitle?: string;
  game:      "wow" | "ffxiv";
};

function deathToFeedEntry(d: DeathEvent, game: "wow" | "ffxiv"): FeedEntry {
  return { kind: "Death", timestamp: d.timestamp, player: d.player, class: d.class, specId: d.specId, role: d.role, title: d.cause, game };
}

function errorToFeedEntry(e: PullError, game: "wow" | "ffxiv"): FeedEntry {
  return { kind: e.severity, timestamp: e.timestamp, player: e.player, class: e.class, specId: e.specId, role: e.role, title: e.name, subtitle: e.description, game };
}

const FEED_KIND_STYLE: Record<FeedKind, { icon: string; color: string; label: string }> = {
  Death: { icon: "💀", color: "#f87171", label: "Death" },
  Raid:  { icon: "🚨", color: "#c084fc", label: "Raid" },
  Major: { icon: "⛔", color: "#fb923c", label: "Major" },
  Minor: { icon: "⚠️", color: "#fbbf24", label: "Minor" },
};

// #10 — show hundredths of a second (M:SS.ss) so events that land within
// the same second can still be told apart.
function formatMs(ms: number): string {
  const totalSec = Math.max(0, ms) / 1000;
  const m = Math.floor(totalSec / 60);
  const s = totalSec - m * 60;
  return `${m}:${s.toFixed(2).padStart(5, "0")}`;
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s}s`;
}

// Short M:SS form used for the "Call Wipe" / "Wipe called at" header label.
function formatCallTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Resolves the specialization label shown under a player's name in the
// feed. WoW carries a real specId (e.g. "Unholy"); FFXIV has no separate
// spec from job, so `class` already holds the display-ready job name.
function getSpecLabel(game: "wow" | "ffxiv", specId: number | undefined, className: string): string {
  if (game === "wow") return getSpecInfo(specId ?? 0).name;
  return formatClassName(className);
}

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
  playbackTimeMs,
  onSeek,
  showKindBadge,
}: {
  entry: FeedEntry;
  playbackTimeMs: number;
  onSeek?: (ms: number) => void;
  showKindBadge?: boolean;   // show a Death/Raid/Major/Minor tag — used on the Overall tab
}) {
  const [hovered, setHovered] = useState(false);
  const hasPassed = playbackTimeMs >= entry.timestamp;
  const style = FEED_KIND_STYLE[entry.kind];
  // Raid errors have no player/class/role — fall back to the kind's own
  // color instead of looking up a role color that doesn't exist.
  const roleColor = entry.role ? getRoleColor(entry.role) : style.color;
  const cls = entry.class ? getClassColor(entry.game, entry.class) : style.color;
  // entry.specId defaults to 0 when absent (raid-wide entries) — harmless,
  // since the icon/label are only rendered when entry.class is also
  // present below, and a real specId always accompanies a real class on
  // player-attributable entries (see error-detection.ts / log-transforms.ts).
  const specIcon = entry.class ? getPlayerSpecIcon(entry.game, entry.specId ?? 0, entry.class) : null;
  const specLabel = entry.class ? getSpecLabel(entry.game, entry.specId, entry.class) : null;
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
          minWidth: "50px",
          flexShrink: 0,
          transition: "color 0.3s",
        }}
      >
        {formatMs(entry.timestamp)}
      </span>

      <span style={{ fontSize: "13px", flexShrink: 0, opacity: hasPassed ? 1 : 0.3, transition: "opacity 0.3s" }}>
        {style.icon}
      </span>

      {specIcon && (
        <img
          src={specIcon}
          alt=""
          width={18}
          height={18}
          style={{ borderRadius: "3px", flexShrink: 0, opacity: hasPassed ? 1 : 0.4, transition: "opacity 0.3s" }}
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      )}

      {/* Main content (left) + kind/role column (right) */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
            <span
              style={{
                color: hasPassed ? cls : "#555",
                fontWeight: 600,
                fontSize: "13px",
                transition: "color 0.3s",
              }}
            >
              {entry.player ?? "Raid-Wide"}
            </span>
            {specLabel && (
              <span style={{ fontSize: "10px", color: hasPassed ? "#555" : "#333", flexShrink: 0, transition: "color 0.3s" }}>
                {specLabel}
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

        {/* Kind badge (top) + role (below), right-aligned */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px", flexShrink: 0 }}>
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
                whiteSpace: "nowrap",
              }}
            >
              {style.label}
            </span>
          )}
          {entry.role && (
            <span
              style={{
                fontSize: "10px",
                color: hasPassed ? roleColor : "#444",
                border: `1px solid ${hasPassed ? roleColor + "33" : "#2a2a2a"}`,
                borderRadius: "3px",
                padding: "1px 5px",
                backgroundColor: hasPassed ? roleColor + "10" : "transparent",
                whiteSpace: "nowrap",
                transition: "all 0.3s",
              }}
            >
              {entry.role}
            </span>
          )}
        </div>
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
          tab === "Raid" ? "#c084fc" :
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

export default function AnalysisPanel({ pull, playbackTimeMs, onSeekToTime, onCallWipe }: AnalysisPanelProps) {
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
  const raids  = pull.errors.filter((e) => e.severity === "Raid").sort((a, b) => a.timestamp - b.timestamp);
  const majors = pull.errors.filter((e) => e.severity === "Major").sort((a, b) => a.timestamp - b.timestamp);
  const minors = pull.errors.filter((e) => e.severity === "Minor").sort((a, b) => a.timestamp - b.timestamp);

  const callWipeError = pull.errors.find((e) => e.ruleId === CALL_WIPE_RULE_ID);

  const counts: Record<Tab, number> = {
    Overall: deaths.length + raids.length + majors.length + minors.length,
    Deaths:  deaths.length,
    Raid:    raids.length,
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
          ...raids.map((e) => errorToFeedEntry(e, pull.game)),
          ...majors.map((e) => errorToFeedEntry(e, pull.game)),
          ...minors.map((e) => errorToFeedEntry(e, pull.game)),
        ].sort((a, b) => a.timestamp - b.timestamp);
      case "Deaths":
        return deaths.map((d) => deathToFeedEntry(d, pull.game));
      case "Raid":
        return raids.map((e) => errorToFeedEntry(e, pull.game));
      case "Major":
        return majors.map((e) => errorToFeedEntry(e, pull.game));
      case "Minor":
        return minors.map((e) => errorToFeedEntry(e, pull.game));
    }
  })();

  const emptyState: Record<Tab, { icon: string; text: string; color: string }> = {
    Overall: { icon: "✨", text: "No deaths or errors this pull", color: "#4ade80" },
    Deaths:  { icon: "✨", text: "No deaths this pull", color: "#4ade80" },
    Raid:    { icon: "✨", text: "No raid-wide errors this pull", color: "#4ade80" },
    Major:   { icon: "✨", text: "No major errors this pull", color: "#4ade80" },
    Minor:   { icon: "✨", text: "No minor errors this pull", color: "#4ade80" },
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "10px 12px", borderBottom: "1px solid #1e1e1e", backgroundColor: "#111", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
          <span style={{ fontWeight: 700, fontSize: "14px", color: "#e2e8f0" }}>{pull.name}</span>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "4px",
                backgroundColor: isKill ? "rgba(74,222,128,0.12)" : "rgba(248,113,113,0.1)",
                color: isKill ? "#4ade80" : "#f87171",
                border: `1px solid ${isKill ? "#166534" : "#7f1d1d"}`,
                whiteSpace: "nowrap",
              }}
            >
              {isKill ? "KILL" : "WIPE"}
            </span>

            {/* "Call Wipe" — creates a manual Raid error at the current
                playback time. Once one exists on this pull, it's replaced
                by the time it was called, per product decision this is
                independent of any auto-detected Raid errors. */}
            {callWipeError ? (
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#c084fc",
                  border: "1px solid #6b21a8",
                  borderRadius: "4px",
                  padding: "3px 8px",
                  backgroundColor: "rgba(192,132,252,0.1)",
                  whiteSpace: "nowrap",
                }}
              >
                Wipe called {formatCallTime(callWipeError.timestamp)}
              </span>
            ) : (
              onCallWipe && (
                <button
                  onClick={() => onCallWipe(pull.id, playbackTimeMs)}
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "#c084fc",
                    border: "1px solid #6b21a8",
                    borderRadius: "4px",
                    padding: "3px 8px",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Call Wipe
                </button>
              )
            )}
          </div>
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
        <StatPill label="Raid" value={String(raids.length)} color={raids.length > 0 ? "#c084fc" : "#4ade80"} />
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
