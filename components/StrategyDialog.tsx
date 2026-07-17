"use client";

// components/StrategyDialog.tsx
//
// "Strategy" modal opened from the header bar next to the import/log
// controls. Shows raid strategy detected automatically from the loaded
// report's pulls — currently the Midnight Falls Terminate interrupt
// rotation (lib/mechanics/wow/vs-dr-mqd/terminate-kicks.ts). Rounds are
// unranked trios: WCL carries no per-matrix instance data, so WHO kicks
// in each round is known but WHICH of the three matrices each player
// covers is not (see the detection module's header).

import type { TerminateKickStrategy, KickSlot } from "@/lib/mechanics/wow/vs-dr-mqd/terminate-kicks";
import { getClassColor } from "@/lib/player-display";

type StrategyDialogProps = {
  open:     boolean;
  onClose:  () => void;
  strategy: TerminateKickStrategy | null;
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

export default function StrategyDialog({ open, onClose, strategy }: StrategyDialogProps) {
  if (!open) return null;

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
          width: "480px",
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

        {!strategy ? (
          <p style={{ fontSize: "13px", color: "#ccc", lineHeight: 1.5 }}>
            No strategy detected yet. Import a report with Midnight Falls pulls —
            the Terminate interrupt rotation is derived automatically from the
            raid&apos;s interrupt casts.
          </p>
        ) : (
          <>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0", marginBottom: "2px" }}>
              Terminate Interrupt Order
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "12px" }}>
              Detected from {strategy.pullsAnalyzed} pull{strategy.pullsAnalyzed === 1 ? "" : "s"} ·{" "}
              {strategy.wavesAnalyzed} matrix wave{strategy.wavesAnalyzed === 1 ? "" : "s"}. Three matrices
              cast in parallel — each round is one interrupt per matrix. The logs
              don&apos;t record which matrix each player covers, so names within a
              round aren&apos;t ordered.
            </div>

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
      </div>
    </div>
  );
}
