"use client";

// components/StrategyDialog.tsx
//
// "Strategy" modal opened from the header bar next to the import/log
// controls. Shows raid strategy detected automatically from the loaded
// report's pulls — currently the Midnight Falls Terminate interrupt
// rotation (lib/mechanics/wow/vs-dr-mqd/terminate-kicks.ts) and Dawn
// Crystal carry assignments for WoW, plus the Dancing Mad Black Hole tether
// strategy (DSA / SDA / Double Tether) for FFXIV.
//
// (The Ikuya mitigation-plan timeline used to live in this dialog too — it
// moved to its own MitigationDialog.tsx / "Mitigation" button, since plan
// selection and raid-strategy selection are unrelated concerns.)

import type { TerminateKickStrategy, KickSlot } from "@/lib/mechanics/wow/vs-dr-mqd/terminate-kicks";
import type { CrystalAssignmentStrategy, CrystalSlot } from "@/lib/mechanics/wow/vs-dr-mqd/crystal-assignments";
import {
  BLACK_HOLE_STRATEGIES,
  type BlackHoleStrategyResult,
  type BlackHoleStrategyId,
} from "@/lib/mechanics/ffxiv/dancingmad/blackhole-strategy";
import { getClassColor } from "@/lib/player-display";

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
};

function KickSlotChip({ slot }: { slot: KickSlot }) {
  const color = slot.className ? getClassColor("wow", slot.className) : "#ccc";
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: "5px", whiteSpace: "nowrap" }}>
      <span style={{ color, fontWeight: 600, fontSize: "13px" }}>{slot.player}</span>
      <span style={{ color: "#888", fontSize: "11px" }}>{slot.ability}</span>
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

const mitRowStyle = {
  display: "flex",
  alignItems: "baseline" as const,
  gap: "10px",
  padding: "6px 10px",
  backgroundColor: "#1a1a1a",
  border: "1px solid #333",
  borderRadius: "6px",
};

const strategyRowStyle = {
  display: "flex",
  alignItems: "baseline" as const,
  gap: "10px",
  padding: "8px 12px",
  backgroundColor: "#1a1a1a",
  border: "1px solid #333",
  borderRadius: "6px",
};

const strategyRowLabelStyle = {
  fontSize: "11px",
  fontWeight: 700,
  color: "#60a5fa",
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
}: StrategyDialogProps) {
  if (!open) return null;

  const showBlackHole = blackHole !== null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1100,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#222",
          padding: "22px",
          borderRadius: "10px",
          width: showBlackHole ? "min(680px, 94vw)" : "480px",
          maxHeight: "80vh",
          overflowY: "auto",
          color: "white",
          border: "1px solid #444",
          boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <h3 style={{ margin: 0, fontSize: "16px" }}>Strategy</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              color: "#888",
              fontSize: "18px",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {showBlackHole && blackHole && (
          <div style={{ marginBottom: strategy || crystals ? "18px" : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "2px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>
                Black Hole Strategy
              </div>
              <select
                value={blackHoleOverrideId ?? ""}
                onChange={(e) => onBlackHoleOverrideChange((e.target.value || null) as BlackHoleStrategyId | null)}
                style={{
                  backgroundColor: "#1a1a1a",
                  color: "#e2e8f0",
                  border: "1px solid #444",
                  borderRadius: "5px",
                  padding: "3px 8px",
                  fontSize: "12px",
                }}
              >
                <option value="">Auto-detect</option>
                {BLACK_HOLE_STRATEGIES.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              {!blackHoleOverrideId && (
                <span style={{ fontSize: "11px", color: "#60a5fa", fontWeight: 600 }}>
                  Detected: {BLACK_HOLE_STRATEGIES.find((s) => s.id === blackHole.strategyId)?.label ?? blackHole.strategyId}
                </span>
              )}
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "12px" }}>
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
                <div key={lane.slotLabel} style={mitRowStyle}>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#60a5fa", flexShrink: 0, width: "140px" }}>
                    {lane.slotLabel}
                  </span>
                  <span style={{ color: getClassColor("ffxiv", lane.className), fontWeight: 600, fontSize: "12px", flexShrink: 0, width: "120px" }}>
                    {lane.player}
                  </span>
                  <span style={{ color: "#999", fontSize: "11px" }}>
                    Tether{lane.moments.length > 1 ? "s" : ""} #{lane.moments.join(", #")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!strategy && !crystals ? (
          showBlackHole ? null : (
          <p style={{ fontSize: "13px", color: "#ccc", lineHeight: 1.5 }}>
            No strategy detected yet. Import a report with Midnight Falls pulls —
            the Terminate interrupt rotation and Dawn Crystal assignments are
            derived automatically from the raid&apos;s casts and debuffs.
          </p>
          )
        ) : (
          <>
            {strategy && (
            <>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0", marginBottom: "2px" }}>
              Terminate Interrupt Order
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "12px" }}>
              Detected from {strategy.pullsAnalyzed} pull{strategy.pullsAnalyzed === 1 ? "" : "s"} ·{" "}
              {strategy.wavesAnalyzed} matrix wave{strategy.wavesAnalyzed === 1 ? "" : "s"}.{" "}
              {strategy.chains
                ? "Each matrix is kicked in the order shown on its boss frame."
                : "Three matrices cast in parallel — each round is one interrupt per matrix. The logs don't record which matrix each player covers, so names within a round aren't ordered."}
            </div>

            {strategy.chains ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {strategy.chains.map((chain) => (
                  <div
                    key={chain.label}
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "10px",
                      padding: "8px 12px",
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #333",
                      borderRadius: "6px",
                    }}
                  >
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#60a5fa", flexShrink: 0, width: "84px" }}>
                      {chain.label}
                    </span>
                    <span style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: "8px", rowGap: "4px" }}>
                      {chain.slots.map((slot, i) => (
                        <span key={slot.player} style={{ display: "inline-flex", alignItems: "baseline", gap: "8px" }}>
                          {i > 0 && <span style={{ color: "#555", fontSize: "11px" }}>→</span>}
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
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "10px",
                      padding: "8px 12px",
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #333",
                      borderRadius: "6px",
                    }}
                  >
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#60a5fa", flexShrink: 0, width: "56px" }}>
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
                <div style={{ fontSize: "11px", fontWeight: 600, color: "#94a3b8", marginBottom: "4px" }}>
                  Fill-in / backup kicks
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", columnGap: "14px", rowGap: "4px" }}>
                  {strategy.fillIns.map((slot) => (
                    <span key={slot.player} style={{ display: "inline-flex", alignItems: "baseline", gap: "5px" }}>
                      <KickSlotChip slot={slot} />
                      <span style={{ color: "#666", fontSize: "10px" }}>
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
              <div style={{ marginTop: strategy ? "18px" : 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0", marginBottom: "2px" }}>
                  Dawn Crystal Assignments
                </div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "12px" }}>
                  Detected from {crystals.pullsAnalyzed} pull{crystals.pullsAnalyzed === 1 ? "" : "s"}.{" "}
                  Assigned carriers hold their crystal from its wave until the
                  intermission, when two crystals hand off to the tanks.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={strategyRowStyle}>
                    <span style={strategyRowLabelStyle}>First Set</span>
                    <span style={{ display: "flex", flexWrap: "wrap", columnGap: "14px", rowGap: "4px" }}>
                      {crystals.set1.map((slot) => <CrystalSlotChip key={slot.player} slot={slot} />)}
                    </span>
                  </div>
                  <div style={strategyRowStyle}>
                    <span style={strategyRowLabelStyle}>Second Set</span>
                    <span style={{ display: "flex", flexWrap: "wrap", columnGap: "14px", rowGap: "4px" }}>
                      {crystals.set2.map((slot) => <CrystalSlotChip key={slot.player} slot={slot} />)}
                    </span>
                  </div>
                  {crystals.swaps.map((swap) => (
                    <div key={`${swap.from.player}-${swap.to.player}`} style={strategyRowStyle}>
                      <span style={strategyRowLabelStyle}>Intermission</span>
                      <span style={{ display: "inline-flex", alignItems: "baseline", gap: "8px" }}>
                        <CrystalSlotChip slot={swap.from} />
                        <span style={{ color: "#555", fontSize: "11px" }}>→</span>
                        <CrystalSlotChip slot={swap.to} />
                        <span style={{ color: "#666", fontSize: "10px" }}>
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
      </div>
    </div>
  );
}
