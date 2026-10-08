"use client";

// components/RosterPullPicker.tsx
//
// The Mitigation dialog's Pull picker. A native <select> can't color text
// per name, so this is a small .ck-menu dropdown: one section per group
// (exact roster), headed by its players in party-slot order with their job
// icon and job-colored first name, then "All pulls" and each pull.

import { useEffect, useRef, useState } from "react";
import type { Pull } from "@/types/Pull";
import type { PlayerInfo } from "@/types/PlayerInfo";
import { detectFFRoles } from "@/lib/mechanics/ffxiv/roles";
import { getClassColor } from "@/lib/player-display";
import { getFFJobIcon } from "@/lib/ffl-job-data";

export type RosterGroup = { key: string; pulls: Pull[] };

// All of one group's pulls, or one pull.
export type PullPick = { kind: "all"; roster: string } | { kind: "pull"; pullId: number };

type Props = {
  rosters:    RosterGroup[];
  value:      PullPick;
  onChange:   (pick: PullPick) => void;
  // Whether a pull has the data the view needs; others are marked.
  usable:     (pull: Pull) => boolean;
};

/** Players in party-slot order (MT, OT, H1, H2, M1, M2, R1, R2). */
function partyOrder(players: PlayerInfo[]): PlayerInfo[] {
  const slotted = detectFFRoles(players).map((r) => r.player).filter((p): p is PlayerInfo => !!p);
  return [...slotted, ...players.filter((p) => !slotted.includes(p))];
}

function Roster({ players }: { players: PlayerInfo[] }) {
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: "2px 10px" }}>
      {partyOrder(players).map((p) => (
        <span key={p.name} title={`${p.name} (${p.className})`} style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={getFFJobIcon(p.className)} alt={p.className} width={14} height={14} />
          <span style={{ color: getClassColor("ffxiv", p.className) }}>{p.name.split(" ")[0]}</span>
        </span>
      ))}
    </span>
  );
}

export default function RosterPullPicker({ rosters, value, onChange, usable }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const several = rosters.length > 1;
  const groupNo = (key: string) => rosters.findIndex((r) => r.key === key) + 1;
  const allLabel = (r: RosterGroup) =>
    `All pulls${several ? `, group ${groupNo(r.key)}` : ""} (${r.pulls.filter(usable).length})`;
  const pullLabel = (p: Pull) => `#${p.pullNumber} (${p.result})${usable(p) ? "" : " — needs re-fetch"}`;

  let current = "";
  if (value.kind === "all") {
    const r = rosters.find((x) => x.key === value.roster);
    if (r) current = allLabel(r);
  } else {
    const p = rosters.flatMap((r) => r.pulls).find((x) => x.id === value.pullId);
    if (p) current = several ? `${pullLabel(p)}, group ${groupNo(rosters.find((r) => r.pulls.includes(p))!.key)}` : pullLabel(p);
  }

  const pick = (next: PullPick) => { onChange(next); setOpen(false); };
  const item = (selected: boolean, label: string, onClick: () => void, key: string) => (
    <button key={key} className={`ck-menu-item${selected ? " ck-menu-item--selected" : ""}`} onClick={onClick}
      style={{ padding: "5px 12px 5px 22px" }}>
      {label}
    </button>
  );

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="ck-field" onClick={() => setOpen((o) => !o)} style={{ padding: "3px 8px", cursor: "pointer", minWidth: 160, textAlign: "left" }}>
        {current} <span style={{ color: "var(--ck-text-3)", marginLeft: 6 }}>▾</span>
      </button>
      {open && (
        <div className="ck-menu" style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 20, minWidth: 320, maxWidth: 520,
          maxHeight: "60vh", overflowY: "auto", padding: "4px 0",
        }}>
          {rosters.map((r, i) => (
            <div key={r.key}>
              {i > 0 && <div className="ck-menu-divider" />}
              <div style={{ padding: "6px 12px 4px", fontSize: 12 }}>
                {several && <div className="ck-menu-label" style={{ padding: "0 0 3px" }}>Group {i + 1}</div>}
                <Roster players={r.pulls[0].players} />
              </div>
              {item(value.kind === "all" && value.roster === r.key, allLabel(r), () => pick({ kind: "all", roster: r.key }), `all:${r.key}`)}
              {r.pulls.map((p) => item(value.kind === "pull" && value.pullId === p.id, pullLabel(p),
                () => pick({ kind: "pull", pullId: p.id }), String(p.id)))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
