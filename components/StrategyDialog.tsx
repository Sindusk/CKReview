"use client";

// components/StrategyDialog.tsx
//
// "Strategy" modal opened from the header bar next to the import/log
// controls. Shows raid strategy detected automatically from the loaded
// report's pulls — currently the Midnight Falls Terminate interrupt
// rotation (lib/mechanics/wow/vs-dr-mqd/terminate-kicks.ts) and Dawn
// Crystal carry assignments for WoW, plus the Dancing Mad Black Hole tether
// strategy (DSA / SDA / Double Tether) and a per-pull party-role roster
// (MT/OT/H1/H2/M1/M2/R1/R2 — lib/mechanics/ffxiv/roles.ts) for FFXIV.
//

import { useMemo } from "react";
import { useFFPullSelector } from "@/hooks/useFFPullSelector";
import type { TerminateKickStrategy, KickSlot } from "@/lib/mechanics/wow/vs-dr-mqd/terminate-kicks";
import type { CrystalAssignmentStrategy, CrystalSlot } from "@/lib/mechanics/wow/vs-dr-mqd/crystal-assignments";
import {
  BLACK_HOLE_STRATEGIES,
  type BlackHoleStrategyResult,
  type BlackHoleStrategyId,
} from "@/lib/mechanics/ffxiv/dancingmad/blackhole-strategy";
import { detectFFRoles, type FFRoleSlot } from "@/lib/mechanics/ffxiv/roles";
import { detectGraven2Strategy } from "@/lib/mechanics/ffxiv/dancingmad/graven2-strategy";
import { getClassColor } from "@/lib/player-display";
import type { Pull } from "@/types/Pull";
import { Dialog } from "./ui/Dialog";

type StrategyDialogProps = {
  open:     boolean;
  onClose:  () => void;
  strategy: TerminateKickStrategy | null;
  crystals: CrystalAssignmentStrategy | null;
  // Dancing Mad Black Hole tether strategy — null when no FF Black Hole
  // data exists in the loaded report yet.
  blackHole: BlackHoleStrategyResult | null;
  blackHoleOverrideId: BlackHoleStrategyId | null;
  onBlackHoleOverrideChange: (id: BlackHoleStrategyId | null) => void;
  // Full pull list (drives the role roster's per-pull selector below).
  pulls: Pull[];
  // The app's globally-selected pull — the role roster's dropdown resets to
  // this every time the dialog opens (see hooks/useFFPullSelector.ts).
  currentPullId: number | null;
};

// Column layout for the compact roster table — Tank/Healer/Melee/Ranged
// across, MT-row then OT-row down (2026-07-23, replaced the earlier
// one-slot-per-row list per the user's explicit ask for a more compact
// layout):
//   Tank   Healer   Melee   Ranged
//   MT     H1       M1      R1
//   OT     H2       M2      R2
const ROLE_TABLE_COLUMNS: { label: string; slots: [FFRoleSlot, FFRoleSlot] }[] = [
  { label: "Tank",   slots: ["MT", "OT"] },
  { label: "Healer", slots: ["H1", "H2"] },
  { label: "Melee",  slots: ["M1", "M2"] },
  { label: "Ranged", slots: ["R1", "R2"] },
];

const roleCellStyle = {
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  gap: "2px",
  padding: "6px 4px",
  minWidth: 0,
};

// Roster + auto-detected party role (MT/OT/H1/H2/M1/M2/R1/R2) for one
// selected pull — the foundation the user wants other FF mechanics to
// eventually build on instead of each guessing roles ad hoc. "?" marks a
// slot the roster/auto-attack signals couldn't disambiguate (see
// lib/mechanics/ffxiv/roles.ts's module header for the resolution order).
function RoleRoster({ pull }: { pull: Pull }) {
  const roles = useMemo(() => detectFFRoles(pull.players), [pull]);
  const bySlot = new Map(roles.map((r) => [r.slot, r]));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "6px" }}>
      {ROLE_TABLE_COLUMNS.map((col) => (
        <div
          key={col.label}
          className="ck-label"
          style={{ textAlign: "center", margin: 0 }}
        >
          {col.label}
        </div>
      ))}
      {([0, 1] as const).map((rowIdx) =>
        ROLE_TABLE_COLUMNS.map((col) => {
          const slot = col.slots[rowIdx];
          const assignment = bySlot.get(slot);
          const player = assignment?.player ?? null;
          const color = player ? getClassColor("ffxiv", player.className) : "#94a3b8";
          return (
            <div key={`${rowIdx}-${slot}`} className="ck-card" style={roleCellStyle}>
              <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--ck-text-gold)" }}>{slot}</span>
              <span
                style={{
                  color,
                  fontWeight: 600,
                  fontSize: "12px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                }}
                title={player ? player.name : undefined}
              >
                {player ? player.name : "—"}
                {assignment?.tentative && player ? <span style={{ color: "var(--ck-text-3)" }}> ?</span> : null}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}

// Per-pull Graven 2 strategy readout — see
// lib/mechanics/ffxiv/dancingmad/graven2-strategy.ts's module header. Unlike
// Black Hole's cross-pull learned shape, this is resolved fresh from each
// selected pull's own Gravitas hits (no cross-pull aggregation yet).
function Graven2StrategyView({ pull }: { pull: Pull }) {
  const result = useMemo(() => detectGraven2Strategy(pull.players), [pull]);

  if (!result) {
    return <div style={{ fontSize: "12px", color: "var(--ck-text-3)" }}>Graven 2 not reached this pull.</div>;
  }

  const variantLabel = result.variant === "light-party" ? "Light Party" : result.variant === "eight-stack" ? "8-Player Stack" : "Unrecognized";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ fontSize: "12px" }}>
        <span className="ck-badge ck-badge--plain" style={{ color: "var(--ck-arcane-text)", fontSize: "11px" }}>{variantLabel}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {result.groups.map((group, i) => (
          <div key={i} style={{ fontSize: "12px", color: "var(--ck-text-2)" }}>
            Group {i + 1}: {group.players.join(", ")}
          </div>
        ))}
      </div>
    </div>
  );
}

function KickSlotChip({ slot }: { slot: KickSlot }) {
  const color = slot.className ? getClassColor("wow", slot.className) : "#ccc";
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: "5px", whiteSpace: "nowrap" }}>
      <span style={{ color, fontWeight: 600, fontSize: "13px" }}>{slot.player}</span>
      <span style={{ color: "var(--ck-text-3)", fontSize: "11px" }}>{slot.ability}</span>
    </span>
  );
}

function CrystalSlotChip({ slot }: { slot: CrystalSlot }) {
  const color = slot.className ? getClassColor("wow", slot.className) : "#ccc";
  return (
    <span style={{ color, fontWeight: 600, fontSize: "13px", whiteSpace: "nowrap" }}>
      {slot.player}
    </span>
  );
}

// Row boxes pair with className="ck-card" (background/border come from it).
const mitRowStyle = {
  display: "flex",
  alignItems: "baseline" as const,
  gap: "10px",
  padding: "6px 10px",
};

const strategyRowStyle = {
  display: "flex",
  alignItems: "baseline" as const,
  gap: "10px",
  padding: "8px 12px",
};

const rowLabelColor = "var(--ck-text-gold)";

const strategyRowLabelStyle = {
  fontSize: "11px",
  fontWeight: 700,
  color: rowLabelColor,
  flexShrink: 0,
  width: "84px",
};

export default function StrategyDialog({
  open,
  onClose,
  strategy,
  crystals,
  blackHole,
  blackHoleOverrideId,
  onBlackHoleOverrideChange,
  pulls,
  currentPullId,
}: StrategyDialogProps) {
  // Pull selector for the role roster — only FF pulls with a resolved
  // roster are selectable. Resets to the app's current pull every time the
  // dialog opens (see hooks/useFFPullSelector.ts); self-heals if the
  // selected pull disappears (e.g. a fresh report import).
  const { ffPulls, selectedPullId, setSelectedPullId, selectedPull } =
    useFFPullSelector(pulls, open, currentPullId);

  if (!open) return null;

  const showBlackHole = blackHole !== null;
  const showRoster = ffPulls.length > 0;

  return (
    <Dialog
      title="Strategy"
      width={showBlackHole || showRoster ? "min(680px, 94vw)" : "480px"}
      maxHeight="80vh"
      zIndex={1100}
      onBackdropClick={onClose}
      onClose={onClose}
    >
        {showRoster && selectedPull && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <div className="ck-subheading">Party Roles</div>
              <select
                className="ck-field"
                value={selectedPullId ?? ""}
                onChange={(e) => setSelectedPullId(Number(e.target.value))}
                style={{ padding: "3px 8px" }}
              >
                {ffPulls.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} #{p.pullNumber} ({p.result})
                  </option>
                ))}
              </select>
            </div>
            <div className="ck-help">
              Auto-detected party role for each player in this pull. MT is
              whoever took the boss&apos;s first auto-attack; M1/M2 come from
              the Wave Cannon line-up. A slot that couldn&apos;t be told apart
              is marked with &quot;?&quot;.
            </div>
            <RoleRoster pull={selectedPull} />
          </div>
        )}

        {showRoster && selectedPull && (
          <div style={{ marginBottom: "20px" }}>
            <div className="ck-subheading" style={{ marginBottom: "4px" }}>Graven 2 Strategy</div>
            <div className="ck-help">
              Auto-detected per pull from this pull&apos;s own Gravitas hits —
              Light Party (two 4-player stacks, opposite sides of the arena) vs
              the newer 8-Player Stack. Identification only for now; no
              per-player error detection for the stack/spread step itself yet.
            </div>
            <Graven2StrategyView pull={selectedPull} />
          </div>
        )}

        {showBlackHole && blackHole && (
          <div style={{ marginBottom: strategy || crystals ? "20px" : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px", flexWrap: "wrap" }}>
              <div className="ck-subheading">Black Hole Strategy</div>
              <select
                className="ck-field"
                value={blackHoleOverrideId ?? ""}
                onChange={(e) => onBlackHoleOverrideChange((e.target.value || null) as BlackHoleStrategyId | null)}
                style={{ padding: "3px 8px" }}
              >
                <option value="">Auto-detect</option>
                {BLACK_HOLE_STRATEGIES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              {!blackHoleOverrideId && (
                <span className="ck-badge ck-badge--plain" style={{ color: "var(--ck-arcane-text)" }}>
                  Detected: {BLACK_HOLE_STRATEGIES.find((s) => s.id === blackHole.strategyId)?.label ?? blackHole.strategyId}
                </span>
              )}
            </div>
            <div className="ck-help">
              Shape auto-detected from {blackHole.pullsAnalyzed} pull{blackHole.pullsAnalyzed === 1 ? "" : "s"} of real
              tether hits. The First/Second/Third-in-Line debuffs are handed
              out per pull, not to fixed players, so the lanes below are an
              example from pull #{blackHole.exemplarPullNumber} (the most
              recent resolved one) rather than a permanent roster — error
              detection re-resolves who&apos;s in which lane every pull.
              DSA/SDA share the same schedule and only differ in which job
              holds the earlier First-in-Line lane (a best-effort, cosmetic
              guess); only Double Tether's schedule shape actually differs.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {blackHole.lanes.map((lane) => (
                <div key={lane.slotLabel} className="ck-card" style={mitRowStyle}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: rowLabelColor, flexShrink: 0, width: "140px" }}>
                    {lane.slotLabel}
                  </span>
                  <span style={{ color: getClassColor("ffxiv", lane.className), fontWeight: 600, fontSize: "12px", flexShrink: 0, width: "120px" }}>
                    {lane.player}
                  </span>
                  <span style={{ color: "var(--ck-text-3)", fontSize: "11px" }}>
                    Tether{lane.moments.length > 1 ? "s" : ""} #{lane.moments.join(", #")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!strategy && !crystals ? (
          showBlackHole || showRoster ? null : (
          <p className="ck-dialog-text">
            No strategy detected yet. Import a report with Midnight Falls pulls —
            the Terminate interrupt rotation and Dawn Crystal assignments are
            derived automatically from the raid&apos;s casts and debuffs.
          </p>
          )
        ) : (
          <>
            {strategy && (
            <>
            <div className="ck-subheading" style={{ marginBottom: "4px" }}>Terminate Interrupt Order</div>
            <div className="ck-help">
              Detected from {strategy.pullsAnalyzed} pull{strategy.pullsAnalyzed === 1 ? "" : "s"} ·{" "}
              {strategy.wavesAnalyzed} matrix wave{strategy.wavesAnalyzed === 1 ? "" : "s"}.{" "}
              {strategy.chains
                ? "Each matrix is kicked in the order shown on its boss frame."
                : "Three matrices cast in parallel — each round is one interrupt per matrix. The logs don't record which matrix each player covers, so names within a round aren't ordered."}
            </div>

            {strategy.chains ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {strategy.chains.map((chain) => (
                  <div key={chain.label} className="ck-card" style={strategyRowStyle}>
                    <span style={strategyRowLabelStyle}>
                      {chain.label}
                    </span>
                    <span style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: "8px", rowGap: "4px" }}>
                      {chain.slots.map((slot, i) => (
                        <span key={slot.player} style={{ display: "inline-flex", alignItems: "baseline", gap: "8px" }}>
                          {i > 0 && <span style={{ color: "var(--ck-text-3)", fontSize: "11px" }}>→</span>}
                          <KickSlotChip slot={slot} />
                        </span>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {strategy.rounds.map((round, i) => (
                  <div key={i} className="ck-card" style={strategyRowStyle}>
                    <span style={{ ...strategyRowLabelStyle, width: "56px" }}>
                      Round {i + 1}
                    </span>
                    <span style={{ display: "flex", flexWrap: "wrap", columnGap: "14px", rowGap: "4px" }}>
                      {round.map((slot) => <KickSlotChip key={slot.player} slot={slot} />)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {strategy.fillIns.length > 0 && (
              <div style={{ marginTop: "12px" }}>
                <div className="ck-label">Fill-in / backup kicks</div>
                <div style={{ display: "flex", flexWrap: "wrap", columnGap: "14px", rowGap: "4px" }}>
                  {strategy.fillIns.map((slot) => (
                    <span key={slot.player} style={{ display: "inline-flex", alignItems: "baseline", gap: "5px" }}>
                      <KickSlotChip slot={slot} />
                      <span className="ck-num" style={{ color: "var(--ck-text-3)", fontSize: "10px" }}>
                        {slot.wavesSeen}/{strategy.wavesAnalyzed} waves
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            </>
            )}

            {crystals && (
              <div style={{ marginTop: strategy ? "20px" : 0 }}>
                <div className="ck-subheading" style={{ marginBottom: "4px" }}>Dawn Crystal Assignments</div>
                <div className="ck-help">
                  Detected from {crystals.pullsAnalyzed} pull{crystals.pullsAnalyzed === 1 ? "" : "s"}.{" "}
                  Assigned carriers hold their crystal from its wave until the
                  intermission, when two crystals hand off to the tanks.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div className="ck-card" style={strategyRowStyle}>
                    <span style={strategyRowLabelStyle}>First Set</span>
                    <span style={{ display: "flex", flexWrap: "wrap", columnGap: "14px", rowGap: "4px" }}>
                      {crystals.set1.map((slot) => <CrystalSlotChip key={slot.player} slot={slot} />)}
                    </span>
                  </div>
                  <div className="ck-card" style={strategyRowStyle}>
                    <span style={strategyRowLabelStyle}>Second Set</span>
                    <span style={{ display: "flex", flexWrap: "wrap", columnGap: "14px", rowGap: "4px" }}>
                      {crystals.set2.map((slot) => <CrystalSlotChip key={slot.player} slot={slot} />)}
                    </span>
                  </div>
                  {crystals.swaps.map((swap) => (
                    <div key={`${swap.from.player}-${swap.to.player}`} className="ck-card" style={strategyRowStyle}>
                      <span style={strategyRowLabelStyle}>Intermission</span>
                      <span style={{ display: "inline-flex", alignItems: "baseline", gap: "8px" }}>
                        <CrystalSlotChip slot={swap.from} />
                        <span style={{ color: "var(--ck-text-3)", fontSize: "11px" }}>→</span>
                        <CrystalSlotChip slot={swap.to} />
                        <span className="ck-num" style={{ color: "var(--ck-text-3)", fontSize: "10px" }}>
                          {swap.pullsSeen}/{crystals.pullsAnalyzed} pulls
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
    </Dialog>
  );
}
