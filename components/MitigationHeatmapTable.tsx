"use client";

// components/MitigationHeatmapTable.tsx
//
// "Heatmap" tab of MitigationDialog.tsx — replaces the old static "Plan" tab
// (2026-07-24, see lib/mechanics/ffxiv/dancingmad/mitigation-heatmap.ts's
// header for the full rationale). One row per mitigation-plan mechanic
// reached in at least one loaded pull, one column per party-role slot (same
// MT/OT/H1/H2/M1/M2/R1/R2 labeling as the Review tab), each cell colored
// red->amber->green by pass rate across every loaded pull, with an "x/y"
// fraction. Hover a cell for the exact per-pull breakdown — hit/missed/
// exempt plus real cast timing relative to that pull's own anchor (the
// literal "when did they cast it" the heatmap is named for).

import type { Pull } from "@/types/Pull";
import { cellPassRate, type HeatmapRow } from "@/lib/mechanics/ffxiv/dancingmad/mitigation-heatmap";
import { detectFFRoles, FF_ROLE_SLOTS, type FFRoleSlot } from "@/lib/mechanics/ffxiv/roles";
import type { MitigationPlan } from "@/lib/mechanics/ffxiv/dancingmad/mitigation-plan";
import { getClassColor } from "@/lib/player-display";

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function offsetLabel(lastCastMs: number | null | undefined, anchorMs: number): string {
  if (lastCastMs == null) return "not cast yet";
  const deltaS = (anchorMs - lastCastMs) / 1000;
  return deltaS >= 0 ? `${deltaS.toFixed(1)}s before` : `${Math.abs(deltaS).toFixed(1)}s after`;
}

function lerp(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

const RED:   [number, number, number] = [239, 68, 68];
const AMBER: [number, number, number] = [245, 158, 11];
const GREEN: [number, number, number] = [34, 197, 94];

// Red (0%) -> amber (50%) -> green (100%); alpha scales up with sample count
// so a single-pull cell reads as tentative rather than falsely confident.
function cellColor(rate: number, countable: number): string {
  const [r, g, b] = rate <= 0.5 ? lerp(RED, AMBER, rate / 0.5) : lerp(AMBER, GREEN, (rate - 0.5) / 0.5);
  const alpha = Math.min(1, 0.35 + countable * 0.13);
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha.toFixed(2)})`;
}

const OUTCOME_LABEL: Record<string, string> = {
  pass:       "Hit",
  fail:       "Missed",
  exempt:     "Exempt (dead / no effect)",
  unresolved: "Unresolved sheet term",
};

const headerCellStyle = {
  padding: "5px 8px",
  textAlign: "center" as const,
  fontSize: "11px",
  fontWeight: 700,
  borderBottom: "1px solid #3a3a3a",
  whiteSpace: "nowrap" as const,
};

const rowLabelCellStyle = {
  padding: "4px 8px",
  verticalAlign: "top" as const,
  fontSize: "11px",
  color: "#e2e8f0",
  borderBottom: "1px solid #333",
  whiteSpace: "nowrap" as const,
};

const bodyCellStyle = {
  padding: "0",
  verticalAlign: "middle" as const,
  borderBottom: "1px solid #333",
  textAlign: "center" as const,
};

export default function MitigationHeatmapTable({
  representativePull,
  plan,
  rows,
}: {
  representativePull: Pull;
  plan:                MitigationPlan | null;
  rows:                HeatmapRow[];
}) {
  const roles = detectFFRoles(representativePull.players, plan);
  const bySlot = new Map(roles.map((r) => [r.slot, r]));
  const columns = FF_ROLE_SLOTS
    .map((slot) => ({ slot, assignment: bySlot.get(slot) }))
    .filter((c): c is { slot: FFRoleSlot; assignment: NonNullable<typeof c.assignment> } => c.assignment?.player != null);

  if (rows.length === 0) {
    return (
      <p style={{ fontSize: "12px", color: "#94a3b8", margin: "6px 0 0" }}>
        No reviewable mechanics found across the loaded pulls yet — either
        none of them reached far enough, or these pulls were fetched before
        enemy cast data was persisted (re-fetch the report to pick it up).
      </p>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={{ ...headerCellStyle, textAlign: "left" }}>Mechanic</th>
            {columns.map(({ slot, assignment }) => {
              const player = assignment.player!;
              const color = getClassColor("ffxiv", player.className);
              return (
                <th key={slot} style={headerCellStyle} title={player.name}>
                  <div style={{ color: "#60a5fa" }}>{slot}{assignment.tentative ? "?" : ""}</div>
                  <div style={{ color, fontWeight: 600 }}>{player.name}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.mech.name}-${i}`}>
              <td style={rowLabelCellStyle}>
                <div>
                  <span style={{ color: "#60a5fa", fontWeight: 700, marginRight: "6px" }}>{row.mech.time ?? ""}</span>
                  <span style={{ color: "#e2e8f0" }}>{row.mech.name}</span>
                </div>
                <div style={{ color: "#555", fontSize: "10px" }}>({row.phaseTitle})</div>
              </td>
              {columns.map(({ slot, assignment }) => {
                const cell = row.cellsByActorId.get(assignment.player!.actorId);
                if (!cell) return <td key={slot} style={bodyCellStyle} />;

                const { passed, countable } = cellPassRate(cell);
                const rate = countable > 0 ? passed / countable : null;
                const bg = rate !== null ? cellColor(rate, countable) : "transparent";

                const title = [
                  `${cell.slotLabel}${cell.tentativeSlot ? " (tentative slot)" : ""}`,
                  ...cell.samples.map((s) => {
                    const abilityBits = s.checks
                      .map((c) => `${c.abilityName}${c.status === "hit" || c.status === "missed" ? ` (${offsetLabel(c.lastCastMs, s.anchorMs)})` : ""}`)
                      .join(", ");
                    return `Pull ${s.pullNumber} [${formatMs(s.anchorMs)}]: ${OUTCOME_LABEL[s.outcome]} — ${abilityBits}`;
                  }),
                ].join("\n");

                return (
                  <td key={slot} style={{ ...bodyCellStyle, backgroundColor: bg }} title={title}>
                    <div style={{ padding: "6px 8px", fontSize: "11px", fontWeight: 700, color: "#0a0a0a" }}>
                      {rate !== null ? `${passed}/${countable}` : "–"}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
