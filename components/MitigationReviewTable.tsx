"use client";

// components/MitigationReviewTable.tsx
//
// "Review" tab of MitigationDialog.tsx — a per-pull audit table: players
// across the top (labeled by their auto-detected party role), EVERY
// mitigation-plan mechanic across the whole fight down the side (boss-cast-
// matched real time for ones this pull reached, the sheet's own static time
// for ones it didn't — see lib/mechanics/ffxiv/dancingmad/mitigation-
// review.ts), and a hit/missed/unresolved/dead/future mark per cell. A cell
// requiring multiple abilities (e.g. "Reprisal + Party Mit") shows each as
// its OWN line with its own mark and ability name (2026-07-23, per the
// user's explicit ask — one being cast and the other not now shows a check
// on one and an X on the other, with both names visible in the table
// instead of hidden in the tooltip). Mechanics the pull never reached still
// render (2026-07-23, per the user's ask to preview the whole fight every
// time) — the whole row and every check dim to gray with a "-" mark
// instead of a real verdict. First-pass prototype per the user's explicit
// ask (2026-07-23) — expect refinement once real reports surface sheet-term
// ambiguities that need mapping.

import type { Pull } from "@/types/Pull";
import type { MitigationReviewRow, MitigationCellStatus } from "@/lib/mechanics/ffxiv/dancingmad/mitigation-review";
import { detectFFRoles, FF_ROLE_SLOTS, type FFRoleSlot } from "@/lib/mechanics/ffxiv/roles";
import type { MitigationPlan } from "@/lib/mechanics/ffxiv/dancingmad/mitigation-plan";
import { getClassColor } from "@/lib/player-display";

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const STATUS_DISPLAY: Record<MitigationCellStatus, { symbol: string; color: string; label: string }> = {
  hit:        { symbol: "✓", color: "#4ade80", label: "Hit" },
  missed:     { symbol: "✗", color: "#f87171", label: "Missed" },
  unresolved: { symbol: "?", color: "#64748b", label: "Unresolved — ambiguous sheet term for this job" },
  dead:       { symbol: "–", color: "#666",    label: "Already dead / just revived — not counted" },
  future:     { symbol: "-", color: "#444",    label: "Not reached this pull yet" },
  // Manual override for sheet mechanics confirmed (via raw event data, not
  // the sheet's own timeline) to be dealt by a different enemy entity than
  // whichever the mitigation was cast on — see NO_EFFECT_OVERRIDES in
  // mitigation-detection.ts. Never a real hit/miss, so distinct dash + color
  // from both "future" (just hasn't happened yet) and "dead" (player's own
  // exemption).
  noEffect:   { symbol: "–", color: "#b45309", label: "Does not affect this attack" },
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
  padding: "4px 8px",
  verticalAlign: "top" as const,
  borderBottom: "1px solid #333",
};

const checkLineStyle = {
  display: "flex",
  alignItems: "baseline" as const,
  gap: "4px",
  fontSize: "11px",
  whiteSpace: "nowrap" as const,
  lineHeight: 1.5,
};

export default function MitigationReviewTable({
  pull,
  plan,
  rows,
}: {
  pull: Pull;
  plan: MitigationPlan | null;
  rows: MitigationReviewRow[];
}) {
  const roles = detectFFRoles(pull.players, plan);
  const bySlot = new Map(roles.map((r) => [r.slot, r]));
  const columns = FF_ROLE_SLOTS
    .map((slot) => ({ slot, assignment: bySlot.get(slot) }))
    .filter((c): c is { slot: FFRoleSlot; assignment: NonNullable<typeof c.assignment> } => c.assignment?.player != null);

  if (rows.length === 0) {
    return (
      <p style={{ fontSize: "12px", color: "#94a3b8", margin: "6px 0 0" }}>
        No reviewable mechanics found for this pull — either the boss&apos;s
        own casts weren&apos;t matched to any sheet mechanic (this pull may
        not have reached far enough), or this pull was fetched before enemy
        cast data was persisted (re-fetch the report to pick it up).
      </p>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      {/* table-layout: auto (the default) sizes each column to its own
          content — a column whose checks are all short ("Feint") stays
          narrow instead of matching the widest one, which is what was
          forcing a horizontal scrollbar with a lot of wasted whitespace
          per column (2026-07-23 fix). */}
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={{ ...headerCellStyle, textAlign: "left" }}>Mechanic</th>
            {columns.map(({ slot, assignment }) => {
              const player = assignment.player!;
              const color = getClassColor("ffxiv", player.className);
              return (
                <th key={slot} style={{ ...headerCellStyle, textAlign: "left" }} title={player.name}>
                  <div style={{ color: "#60a5fa" }}>{slot}{assignment.tentative ? "?" : ""}</div>
                  <div style={{ color, fontWeight: 600 }}>
                    {player.name}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.mech.name}-${i}`} style={{ opacity: row.reached ? 1 : 0.5 }}>
              <td style={rowLabelCellStyle}>
                <div>
                  <span style={{ color: row.reached ? "#60a5fa" : "#666", fontWeight: 700, marginRight: "6px" }}>{formatMs(row.anchorMs)}</span>
                  <span style={{ color: row.reached ? "#e2e8f0" : "#888" }}>{row.mech.name}</span>
                </div>
                <div style={{ color: "#555", fontSize: "10px" }}>({row.phaseTitle})</div>
              </td>
              {columns.map(({ slot, assignment }) => {
                const cell = row.cellsByActorId.get(assignment.player!.actorId);
                if (!cell) return <td key={slot} style={bodyCellStyle} />;
                return (
                  <td key={slot} style={bodyCellStyle}>
                    {cell.checks.map((check, ci) => {
                      const display = STATUS_DISPLAY[check.status];
                      const lastCastLine =
                        check.status === "hit" || check.status === "missed"
                          ? check.lastCastMs != null
                            ? `Last Cast: ${formatMs(check.lastCastMs)}`
                            : "Not Cast Yet This Pull"
                          : undefined;
                      const title = [
                        `${display.label}${cell.slotLabel ? ` (${cell.slotLabel})` : ""}`,
                        lastCastLine,
                        cell.tentativeSlot ? "Tentative slot assignment — roster couldn't fully disambiguate" : undefined,
                      ].filter(Boolean).join("\n");
                      return (
                        <div key={ci} style={{ ...checkLineStyle, opacity: check.carryOver ? 0.55 : 1 }} title={title}>
                          <span style={{ color: display.color, fontWeight: 700, flexShrink: 0 }}>{display.symbol}</span>
                          <span style={{ color: row.reached ? "#cbd5e1" : "#666", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {check.carryOver ? "➔ " : ""}{check.abilityName}
                          </span>
                        </div>
                      );
                    })}
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
