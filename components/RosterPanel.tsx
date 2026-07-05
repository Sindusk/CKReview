"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import { getClassColor } from "@/lib/class-colors";
import { formatSpecClass, formatClassName } from "@/lib/player-display";
import { getPlayerSpecIcon } from "@/lib/player-icons";

const ROLE_COLOR: Record<string, string> = {
  Tank: "#60a5fa",
  Healer: "#4ade80",
  DPS: "#f87171",
};

type Tab = "DamageDone" | "DamageTaken" | "Healing" | "Debuffs" | "Casts";
const TABS: Tab[] = ["DamageDone", "DamageTaken", "Healing", "Debuffs", "Casts"];

const TAB_LABELS: Record<Tab, string> = {
  DamageDone: "Damage Done",
  DamageTaken: "Damage Taken",
  Healing: "Healing",
  Debuffs: "Debuffs",
  Casts: "Casts",
};

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatAmount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function PlayerButton({ player, onClick }: { player: PlayerInfo; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const color = getClassColor(player.game, player.className);
  const roleColor = ROLE_COLOR[player.role] ?? "#aaa";
  const iconSrc = getPlayerSpecIcon(player.game, player.specId, player.className);

  // FFXIV has no separate spec from job — specName === className there, so
  // the "different from class" check below always hid it. Show the job
  // itself in that case; WoW keeps its existing spec-vs-class behavior.
  const specLabel =
    player.game === "ffxiv"
      ? formatClassName(player.className)
      : player.specName && player.specName !== player.className
      ? player.specName
      : null;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`${player.name} — ${formatSpecClass(player.specName, player.className)}`}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "6px",
        padding: "5px 7px",
        borderRadius: "4px",
        border: `1px solid ${hovered ? color + "66" : "#2a2a2a"}`,
        backgroundColor: hovered ? "#1a1a1a" : "#0d0d0d",
        cursor: "pointer",
        minWidth: 0,
        transition: "border-color 0.15s, background-color 0.15s",
        width: "100%",
      }}
    >
      <img
        src={iconSrc}
        alt=""
        width={22}
        height={22}
        style={{ borderRadius: "4px", flexShrink: 0, border: `1px solid ${color}44` }}
        onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
      />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 0, flex: 1 }}>
        <span
          style={{
            color,
            fontWeight: 600,
            fontSize: "12px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            width: "100%",
            textAlign: "left",
          }}
        >
          {player.name}
        </span>
        <span style={{ fontSize: "10px", color: "#555", whiteSpace: "nowrap" }}>
          <span style={{ color: roleColor }}>{player.role}</span>
          {specLabel && <>{" · "}{specLabel}</>}
        </span>
      </div>
    </button>
  );
}

function rowBackground(hasPassed: boolean): string {
  return hasPassed ? "rgba(255,255,255,0.035)" : "transparent";
}

const rowShellStyle: CSSProperties = {
  padding: "5px 10px",
  borderBottom: "1px solid #111",
  transition: "background-color 0.3s",
};

const line1Style: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "12px",
};

const timeStyle: CSSProperties = {
  fontFamily: "monospace",
  color: "#555",
  minWidth: "34px",
  flexShrink: 0,
};

const abilityStyle: CSSProperties = {
  color: "#94a3b8",
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const line2Style: CSSProperties = {
  fontSize: "11px",
  color: "#555",
  paddingLeft: "42px",
  marginTop: "1px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

function DamageDoneRow({ event, playbackTimeMs }: { event: PlayerEvent; playbackTimeMs: number }) {
  const hasPassed = playbackTimeMs >= event.timestamp;
  return (
    <div style={{ ...rowShellStyle, backgroundColor: rowBackground(hasPassed) }}>
      <div style={line1Style}>
        <span style={timeStyle}>{formatMs(event.timestamp)}</span>
        <span style={abilityStyle}>{event.abilityName}</span>
        {event.isDoT && (
          <span style={{ fontSize: "9px", fontWeight: 700, color: "#a78bfa", border: "1px solid #a78bfa44", borderRadius: "3px", padding: "0 4px", flexShrink: 0 }}>
            DoT
          </span>
        )}
        {event.amount !== undefined && (
          <span style={{ color: "#ccc", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
            {formatAmount(event.amount)}
          </span>
        )}
      </div>
      {event.target && <div style={line2Style}>→ {event.target}</div>}
    </div>
  );
}

function DamageTakenRow({ event, playbackTimeMs }: { event: PlayerEvent; playbackTimeMs: number }) {
  const hasPassed = playbackTimeMs >= event.timestamp;
  const isFatal = (event.overkill ?? 0) > 0;
  const hasHealth = event.healthBefore !== undefined || event.healthAfter !== undefined;

  return (
    <div style={{ ...rowShellStyle, backgroundColor: rowBackground(hasPassed) }}>
      <div style={line1Style}>
        <span style={timeStyle}>{formatMs(event.timestamp)}</span>
        <span style={abilityStyle}>
          {event.abilityName}
          {event.source && <span style={{ color: "#555" }}> ({event.source})</span>}
        </span>
        {event.amount !== undefined && (
          <span style={{ color: "#ccc", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
            {formatAmount(event.amount)}
          </span>
        )}
      </div>
      {hasHealth && (
        <div style={line2Style}>
          {formatAmount(event.healthBefore ?? 0)} → {formatAmount(event.healthAfter ?? 0)}
          {isFatal && (
            <span style={{ color: "#f87171", marginLeft: "6px" }}>
              +{formatAmount(event.overkill!)} overkill
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function HealingRow({ event, playbackTimeMs }: { event: PlayerEvent; playbackTimeMs: number }) {
  const hasPassed = playbackTimeMs >= event.timestamp;
  return (
    <div style={{ ...rowShellStyle, backgroundColor: rowBackground(hasPassed) }}>
      <div style={line1Style}>
        <span style={timeStyle}>{formatMs(event.timestamp)}</span>
        <span style={abilityStyle}>{event.abilityName}</span>
        {event.amount !== undefined && (
          <span style={{ color: "#ccc", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
            {formatAmount(event.amount)}
          </span>
        )}
      </div>
      {event.target && <div style={line2Style}>→ {event.target}</div>}
    </div>
  );
}

function CastRow({ event, playbackTimeMs }: { event: PlayerEvent; playbackTimeMs: number }) {
  const hasPassed = playbackTimeMs >= event.timestamp;
  return (
    <div style={{ ...rowShellStyle, backgroundColor: rowBackground(hasPassed) }}>
      <div style={line1Style}>
        <span style={timeStyle}>{formatMs(event.timestamp)}</span>
        <span style={abilityStyle}>{event.abilityName}</span>
      </div>
      {event.target && <div style={line2Style}>→ {event.target}</div>}
    </div>
  );
}

// #9 — show whether the debuff was applied, refreshed, or removed instead
// of just listing every raw application/removal with no context.
const DEBUFF_STATUS_STYLE: Record<string, { label: string; color: string }> = {
  applied: { label: "Applied", color: "#4ade80" },
  stack:   { label: "Stack",   color: "#fbbf24" },
  removed: { label: "Removed", color: "#f87171" },
};

function DebuffRow({ event, playbackTimeMs }: { event: PlayerEvent; playbackTimeMs: number }) {
  const hasPassed = playbackTimeMs >= event.timestamp;
  const status = DEBUFF_STATUS_STYLE[event.debuffStatus ?? "applied"];

  return (
    <div style={{ ...rowShellStyle, backgroundColor: rowBackground(hasPassed) }}>
      <div style={line1Style}>
        <span style={timeStyle}>{formatMs(event.timestamp)}</span>
        <span style={abilityStyle}>{event.abilityName}</span>
        <span
          style={{
            fontSize: "9px",
            fontWeight: 700,
            color: status.color,
            border: `1px solid ${status.color}44`,
            borderRadius: "3px",
            padding: "0 4px",
            flexShrink: 0,
          }}
        >
          {status.label}
        </span>
      </div>
      {event.extra && <div style={line2Style}>from {event.extra}</div>}
    </div>
  );
}

function PlayerDetail({
  player,
  onBack,
  playbackTimeMs,
}: {
  player: PlayerInfo;
  onBack: () => void;
  playbackTimeMs: number;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("DamageDone");
  const [search, setSearch] = useState("");
  const color = getClassColor(player.game, player.className);

  const events: PlayerEvent[] = (() => {
    switch (activeTab) {
      case "DamageDone":  return player.damageDone;
      case "DamageTaken": return player.damageTaken;
      case "Healing":     return player.healing;
      case "Debuffs":     return player.debuffs;
      case "Casts":       return player.casts;
    }
  })();

  // #4 — filter by ability/debuff name
  const query = search.trim().toLowerCase();
  const filteredEvents = query
    ? events.filter((e) => e.abilityName.toLowerCase().includes(query))
    : events;

  function renderRow(event: PlayerEvent, i: number) {
    switch (activeTab) {
      case "DamageDone":  return <DamageDoneRow key={i} event={event} playbackTimeMs={playbackTimeMs} />;
      case "DamageTaken": return <DamageTakenRow key={i} event={event} playbackTimeMs={playbackTimeMs} />;
      case "Healing":     return <HealingRow key={i} event={event} playbackTimeMs={playbackTimeMs} />;
      case "Debuffs":     return <DebuffRow key={i} event={event} playbackTimeMs={playbackTimeMs} />;
      case "Casts":       return <CastRow key={i} event={event} playbackTimeMs={playbackTimeMs} />;
    }
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 8px",
          borderBottom: "1px solid #1e1e1e",
          backgroundColor: "#111",
          flexShrink: 0,
        }}
      >
        <button
          onClick={onBack}
          style={{
            padding: "3px 8px",
            fontSize: "11px",
            backgroundColor: "#1e1e1e",
            border: "1px solid #333",
            borderRadius: "4px",
            color: "#888",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          ← Back
        </button>
        <div style={{ minWidth: 0 }}>
          <span style={{ color, fontWeight: 700, fontSize: "13px" }}>{player.name}</span>
          <span style={{ color: "#555", fontSize: "11px", marginLeft: "6px" }}>
            {formatSpecClass(player.specName, player.className)}
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          padding: "4px 6px",
          backgroundColor: "#0d0d0d",
          borderBottom: "1px solid #1e1e1e",
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: "2px", flexWrap: "wrap" }}>
          {TABS.map(tab => {
            const active = tab === activeTab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "3px 8px",
                  fontSize: "11px",
                  borderRadius: "3px",
                  border: active ? `1px solid ${color}44` : "1px solid #222",
                  backgroundColor: active ? color + "18" : "transparent",
                  color: active ? color : "#555",
                  cursor: "pointer",
                  fontWeight: active ? 600 : 400,
                  whiteSpace: "nowrap",
                }}
              >
                {TAB_LABELS[tab]}
              </button>
            );
          })}
        </div>

        {/* #4 — search/filter by ability name */}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by ability…"
          style={{
            padding: "3px 8px",
            fontSize: "11px",
            backgroundColor: "#111",
            border: "1px solid #333",
            borderRadius: "4px",
            color: "#ccc",
            outline: "none",
            minWidth: "140px",
          }}
        />
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {filteredEvents.length === 0 ? (
          <div style={{ padding: "16px", textAlign: "center", color: "#333", fontSize: "12px" }}>
            {events.length === 0
              ? `No ${TAB_LABELS[activeTab].toLowerCase()} events for this pull`
              : `No results matching "${search}"`}
          </div>
        ) : (
          filteredEvents.map((e, i) => renderRow(e, i))
        )}
      </div>
    </div>
  );
}

type RosterPanelProps = {
  players: PlayerInfo[];
  playbackTimeMs: number;
};

export default function RosterPanel({ players, playbackTimeMs }: RosterPanelProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerInfo | null>(null);

  const filteredPlayers = players.filter(
    p =>
      p.name !== "Multiple Players" &&
      p.specName !== "LimitBreak" &&
      p.specName !== "Limit Break"
  );

  if (selectedPlayer) {
    return (
      <PlayerDetail
        player={selectedPlayer}
        onBack={() => setSelectedPlayer(null)}
        playbackTimeMs={playbackTimeMs}
      />
    );
  }

  if (filteredPlayers.length === 0) {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px", color: "#333", padding: "12px", textAlign: "center" }}>
        <span style={{ fontSize: "22px" }}>👥</span>
        <span style={{ fontSize: "12px", color: "#444", lineHeight: "1.5" }}>
          Select a pull to see the roster
        </span>
      </div>
    );
  }

  const tankCount = filteredPlayers.filter(player => player.role === "Tank").length;
  const healerCount = filteredPlayers.filter(player => player.role === "Healer").length;
  const dpsCount = filteredPlayers.filter(player => player.role === "DPS").length;

  const COLS = 4;
  const ROWS = 5;
  const GROUP_SIZE = COLS * ROWS;

  const groups: PlayerInfo[][] = [];
  for (let i = 0; i < filteredPlayers.length; i += GROUP_SIZE) {
    groups.push(filteredPlayers.slice(i, i + GROUP_SIZE));
  }

  const needsScroll = filteredPlayers.length > GROUP_SIZE;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ padding: "6px 10px", fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid #1a1a1a", backgroundColor: "#0d0d0d", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <span>Roster</span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#777", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span>{filteredPlayers.length} players</span>
          {tankCount > 0 && <span style={{ color: ROLE_COLOR.Tank }}>Tanks {tankCount}</span>}
          {healerCount > 0 && <span style={{ color: ROLE_COLOR.Healer }}>Healers {healerCount}</span>}
          {dpsCount > 0 && <span style={{ color: ROLE_COLOR.DPS }}>DPS {dpsCount}</span>}
        </div>
      </div>

      <div style={{ overflowX: needsScroll ? "auto" : "hidden", overflowY: "hidden", display: "flex", gap: "8px", padding: "8px", boxSizing: "border-box" }}>
        {groups.map((group, gi) => (
          <div
            key={gi}
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${ROWS}, auto)`,
              gridAutoFlow: "column",
              gap: "4px",
              flexShrink: 0,
              width: gi === 0 && !needsScroll ? "100%" : `${COLS * 80}px`,
              minWidth: `${COLS * 72}px`,
            }}
          >
            {group.map(player => (
              <PlayerButton key={player.actorId} player={player} onClick={() => setSelectedPlayer(player)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}