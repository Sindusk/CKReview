"use client";

import type { PlayerReportStats } from "@/lib/report-data";
import { getClassColor } from "@/lib/class-colors";
import { formatClassName } from "@/lib/player-display";
import { getPlayerSpecIcon } from "@/lib/player-icons";

const ROLE_COLOR: Record<string, string> = {
  Tank: "#60a5fa",
  Healer: "#4ade80",
  DPS: "#f87171",
};

type PedestalSlot = {
  place:      1 | 2 | 3;
  medal:      string;
  height:     string;
  order:      number;   // visual left-to-right order: 2nd, 1st, 3rd
  labelColor: string;
};

const SLOTS: PedestalSlot[] = [
  { place: 2, medal: "🥈", height: "78px",  order: 0, labelColor: "#c0c0c0" },
  { place: 1, medal: "🥇", height: "108px", order: 1, labelColor: "#facc15" },
  { place: 3, medal: "🥉", height: "56px",  order: 2, labelColor: "#cd7f32" },
];

function PedestalCard({
  slot,
  player,
}: {
  slot: PedestalSlot;
  player: PlayerReportStats | undefined;
}) {
  const color = player ? getClassColor(player.game, player.className) : "#555";
  const roleColor = player ? ROLE_COLOR[player.role] ?? "#aaa" : "#555";

  return (
    <div
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "flex-end",
        order:          slot.order,
        width:          "140px",
      }}
    >
      <span style={{ fontSize: slot.place === 1 ? "30px" : "24px", marginBottom: "4px" }}>
        {slot.medal}
      </span>

      <div
        style={{
          display:      "flex",
          alignItems:   "center",
          gap:          "5px",
          maxWidth:     "130px",
          marginBottom: "2px",
        }}
      >
        {player && (
          <img
            src={getPlayerSpecIcon(player.game, player.specId, player.className)}
            alt=""
            width={16}
            height={16}
            style={{ borderRadius: "3px", flexShrink: 0 }}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        )}
        <span
          style={{
            fontWeight:   700,
            fontSize:     slot.place === 1 ? "14px" : "13px",
            color:        player ? color : "#444",
            whiteSpace:   "nowrap",
            overflow:     "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {player?.name ?? "—"}
        </span>
      </div>

      {player && (
        <div style={{ fontSize: "10px", color: roleColor, marginBottom: "6px" }}>
          {player.role} · {formatClassName(player.className)}
        </div>
      )}

      {player && (
        <div style={{ fontSize: "10px", color: "#777", marginBottom: "8px" }}>
          {player.combinedScore} early mistake{player.combinedScore === 1 ? "" : "s"}
        </div>
      )}

      <div
        style={{
          width:           "100%",
          height:          slot.height,
          borderRadius:    "6px 6px 0 0",
          background:      `linear-gradient(180deg, ${slot.labelColor}22, ${slot.labelColor}0d)`,
          border:          `1px solid ${slot.labelColor}55`,
          borderBottom:    "none",
          display:         "flex",
          alignItems:      "flex-start",
          justifyContent:  "center",
          paddingTop:      "6px",
        }}
      >
        <span style={{ fontSize: "18px", fontWeight: 800, color: slot.labelColor }}>
          {slot.place}
        </span>
      </div>
    </div>
  );
}

export default function ReportPedestal({ players }: { players: PlayerReportStats[] }) {
  const byPlace = new Map(players.map((p, i) => [i + 1, p]));

  return (
    <div
      style={{
        display:        "flex",
        alignItems:     "flex-end",
        justifyContent: "center",
        gap:            "18px",
        padding:        "18px 10px 0",
      }}
    >
      {players.length === 0 ? (
        <div style={{ color: "#555", fontSize: "13px", padding: "20px 0" }}>
          Not enough data yet to crown an MVP.
        </div>
      ) : (
        SLOTS.map((slot) => (
          <PedestalCard key={slot.place} slot={slot} player={byPlace.get(slot.place)} />
        ))
      )}
    </div>
  );
}
