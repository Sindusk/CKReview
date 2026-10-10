"use client";

// components/MitigationPlayerPicker.tsx
//
// The Mitigation dialog's player selector (user, 2026-10-09; replaced the
// role filter): a 4 × 2 grid of job icon, job-colored name and gray slot,
// light party 1 (MT H1 M1 R1) across the top and light party 2 (OT H2 M2
// R2) across the bottom. Picking a player narrows the timeline to their
// columns, personal ones open, and removes Analysis items that don't involve
// them. Picking them again, or All, clears it. Players without a detected
// slot fill the empty cells in order.

import type { CSSProperties } from "react";
import type { PlayerGroup } from "./MitigationTimeline";
import { getClassColor, getPlayerClassIcon } from "@/lib/player-display";

const GRID_ORDER = ["MT", "H1", "M1", "R1", "OT", "H2", "M2", "R2"];
const CELL_WIDTH = 128;

const cell = (active: boolean): CSSProperties => ({
  display: "flex", alignItems: "center", gap: 5, width: CELL_WIDTH, boxSizing: "border-box",
  padding: "1px 6px", fontSize: 11, lineHeight: "18px", cursor: "pointer", textAlign: "left",
  border: `1px solid ${active ? "var(--ck-text-gold)" : "var(--ck-line-2)"}`, borderRadius: 3,
  background: active ? "rgba(212, 175, 55, 0.12)" : "transparent",
});

export function PlayerPicker({ groups, focus, onPick }: {
  groups: PlayerGroup[];
  focus:  string | null;
  onPick: (player: string | null) => void;
}) {
  const cells: (PlayerGroup | null)[] = GRID_ORDER.map((slot) => groups.find((g) => g.slot === slot) ?? null);
  for (const g of groups.filter((x) => !x.slot || !GRID_ORDER.includes(x.slot))) {
    const free = cells.indexOf(null);
    if (free >= 0) cells[free] = g; else cells.push(g);
  }
  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 4 }}>
      <button style={{ ...cell(focus === null), width: "auto", justifyContent: "center" }} onClick={() => onPick(null)}>All</button>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(4, ${CELL_WIDTH}px)`, gap: 3 }}>
        {cells.map((g, i) => g === null ? <span key={`empty${i}`} /> : (
          <button key={g.player} style={cell(focus === g.player)} title={`${g.player} (${g.job})`}
            onClick={() => onPick(focus === g.player ? null : g.player)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={getPlayerClassIcon("ffxiv", g.job)} alt={g.job} width={16} height={16} style={{ flex: "0 0 auto" }} />
            <span style={{ color: getClassColor("ffxiv", g.job), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: "1 1 auto" }}>
              {g.player}
            </span>
            {g.slot && <span style={{ color: "var(--ck-text-3)", fontSize: 10, flex: "0 0 auto" }}>{g.slot}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
