"use client";

import { useState } from "react";
import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";

const CLASS_COLOR: Record<string, string> = {
  "Death Knight": "#C41E3A",
  "Demon Hunter": "#A330C9",
  Druid: "#FF7C0A",
  Evoker: "#33937F",
  Hunter: "#AAD372",
  Mage: "#3FC7EB",
  Monk: "#00FF98",
  Paladin: "#F48CBA",
  Priest: "#FFFFFF",
  Rogue: "#FFF468",
  Shaman: "#0070DD",
  Warlock: "#8788EE",
  Warrior: "#C69B3A",
};

function classColor(cls: string): string {
  return CLASS_COLOR[cls] ?? "#aaa";
}

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
  const color = classColor(player.className);
  const roleColor = ROLE_COLOR[player.role] ?? "#aaa";

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={`${player.name} — ${player.specName} ${player.className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
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
        {" · "}
        {player.specName}
      </span>
    </button>
  );
}

function EventRow({ event }: { event: PlayerEvent }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "4px 10px",
        borderBottom: "1px solid #111",
        fontSize: "12px",
      }}
    >
      <span style={{ fontFamily: "monospace", color: "#555", minWidth: "34px", flexShrink: 0 }}>
        {formatMs(event.timestamp)}
      </span>
      <span style={{ color: "#94a3b8", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {event.abilityName}
      </span>
      {event.amount !== undefined && (
        <span style={{ color: "#ccc", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
          {formatAmount(event.amount)}
        </span>
      )}
      {event.extra && (
        <span style={{ color: "#555", flexShrink: 0, fontSize: "11px" }}>
          → {event.extra}
        </span>
      )}
    </div>
  );
}

function PlayerDetail({ player, onBack }: { player: PlayerInfo; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>("DamageDone");
  const color = classColor(player.className);

  const events: PlayerEvent[] = (() => {
    switch (activeTab) {
      case "DamageDone":
        return player.damageDone;
      case "DamageTaken":
        return player.damageTaken;
      case "Healing":
        return player.healing;
      case "Debuffs":
        return player.debuffs;
      case "Casts":
        return player.casts;
    }
  })();

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
            {player.specName} {player.className}
          </span>
        </div>
      </div>

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

      <div style={{ flex: 1, overflowY: "auto" }}>
        {events.length === 0 ? (
          <div style={{ padding: "16px", textAlign: "center", color: "#333", fontSize: "12px" }}>
            No {TAB_LABELS[activeTab].toLowerCase()} events for this pull
          </div>
        ) : (
          events.map((e, i) => <EventRow key={i} event={e} />)
        )}
      </div>
    </div>
  );
}

type RosterPanelProps = {
  players: PlayerInfo[];
};

export default function RosterPanel({ players }: RosterPanelProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerInfo | null>(null);

  // FFLogs includes a synthetic "Multiple Players / LimitBreak" actor that
  // represents the party Limit Break ability. Filter it out — it is not a
  // real player and should never appear in the roster.
  const filteredPlayers = players.filter(
    p =>
      p.name !== "Multiple Players" &&
      p.specName !== "LimitBreak" &&
      p.specName !== "Limit Break"
  );

  if (selectedPlayer) {
    return <PlayerDetail player={selectedPlayer} onBack={() => setSelectedPlayer(null)} />;
  }

  if (filteredPlayers.length === 0) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          color: "#333",
          padding: "12px",
          textAlign: "center",
        }}
      >
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
    <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div
        style={{
          padding: "6px 10px",
          fontSize: "10px",
          color: "#555",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          borderBottom: "1px solid #1a1a1a",
          backgroundColor: "#0d0d0d",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
        }}
      >
        <span>Roster</span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#777", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span>{filteredPlayers.length} players</span>
          {tankCount > 0 && <span style={{ color: ROLE_COLOR.Tank }}>Tanks {tankCount}</span>}
          {healerCount > 0 && <span style={{ color: ROLE_COLOR.Healer }}>Healers {healerCount}</span>}
          {dpsCount > 0 && <span style={{ color: ROLE_COLOR.DPS }}>DPS {dpsCount}</span>}
        </div>
      </div>

      <div
        style={{
          overflowX: needsScroll ? "auto" : "hidden",
          overflowY: "hidden",
          display: "flex",
          gap: "8px",
          padding: "8px",
          boxSizing: "border-box",
        }}
      >
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
