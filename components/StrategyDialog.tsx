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
//
// For FFXIV (Dancing Mad) reports it additionally offers mitigation-plan
// selection (lib/mechanics/ffxiv/dancingmad/mitigation-plan.ts — currently
// the Ikuya sheet) and renders the selected plan as a timeline of expected
// mitigation casts per player, with the sheet's party slots mapped onto the
// loaded roster. Tentative mappings (MT vs OT, D1 vs D2 with two melee) are
// marked with "?" — display only; future Mitigation error detection must not
// blame individuals through a tentative slot.

import { useMemo } from "react";
import type { TerminateKickStrategy, KickSlot } from "@/lib/mechanics/wow/vs-dr-mqd/terminate-kicks";
import type { CrystalAssignmentStrategy, CrystalSlot } from "@/lib/mechanics/wow/vs-dr-mqd/crystal-assignments";
import {
  MITIGATION_PLANS,
  getMitigationPlan,
  resolveMitigationSlots,
  type PlanEntry,
  type PlanMechanic,
  type PlanNotes,
  type SlotAssignment,
} from "@/lib/mechanics/ffxiv/dancingmad/mitigation-plan";
import type { PlayerInfo } from "@/types/PlayerInfo";
import { getClassColor } from "@/lib/player-display";

type StrategyDialogProps = {
  open:     boolean;
  onClose:  () => void;
  strategy: TerminateKickStrategy | null;
  crystals: CrystalAssignmentStrategy | null;
  // FFXIV roster of the loaded report (first Dancing Mad pull), or null when
  // no FF report is loaded — gates the mitigation-plan section.
  ffPlayers: PlayerInfo[] | null;
  mitigationPlanId: string | null;
  onMitigationPlanChange: (id: string | null) => void;
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

// ─── Mitigation plan timeline ────────────────────────────────────────────────

function formatEntryText(entries: PlanEntry[]): string {
  return entries
    .map((e) => {
      const abilities = e.abilities
        .map((a) => a.name + (a.qualifier ? ` (${a.qualifier})` : ""))
        .join(" + ");
      return (e.carryOver ? "➔ " : "") + (e.qualifier ? `[${e.qualifier}] ` : "") + abilities;
    })
    .join("  ·  ");
}

// Tooltip text for a chip: the sheet footnotes referenced by its abilities.
function footnoteTitle(entries: PlanEntry[], notes: PlanNotes | null): string | undefined {
  if (!notes) return undefined;
  const refs = new Set<number>();
  for (const e of entries) for (const a of e.abilities) for (const f of a.footnotes ?? []) refs.add(f);
  const texts = [...refs].sort((a, b) => a - b).map((n) => notes.footnotes[String(n)]).filter(Boolean);
  return texts.length ? texts.join("\n") : undefined;
}

function SlotChip({
  slotLabel,
  assignment,
  entries,
  notes,
}: {
  slotLabel:  string;
  assignment: SlotAssignment | undefined;
  entries:    PlanEntry[];
  notes:      PlanNotes | null;
}) {
  const player = assignment?.player ?? null;
  const color = player ? getClassColor("ffxiv", player.className) : "#94a3b8";
  // Carry-over-only chips are context, not an expected cast — dim them.
  const allCarryOver = entries.every((e) => e.carryOver);
  return (
    <span
      title={footnoteTitle(entries, notes)}
      style={{ display: "inline-flex", alignItems: "baseline", gap: "5px", whiteSpace: "nowrap", opacity: allCarryOver ? 0.5 : 1 }}
    >
      <span style={{ color: "#64748b", fontSize: "9px", fontWeight: 700 }}>{slotLabel}</span>
      <span style={{ color, fontWeight: 600, fontSize: "12px" }}>
        {player ? player.name : "—"}
        {assignment?.tentative ? <span style={{ color: "#64748b" }}>?</span> : null}
      </span>
      <span style={{ color: "#999", fontSize: "11px", whiteSpace: "normal" }}>{formatEntryText(entries)}</span>
    </span>
  );
}

function MechanicRow({
  mech,
  slots,
  notes,
}: {
  mech:  PlanMechanic;
  slots: Map<string, SlotAssignment>;
  notes: PlanNotes | null;
}) {
  // Prose rows (Accretions rules, Forsaken preamble) have a note, no time.
  if (mech.note !== undefined) {
    return (
      <div style={{ ...mitRowStyle, flexDirection: "column" as const, gap: "4px" }}>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#facc15" }}>{mech.name}</span>
        <span style={{ fontSize: "11px", color: "#94a3b8", whiteSpace: "pre-line" }}>{mech.note}</span>
      </div>
    );
  }

  // Sheet columns to display, in the sheet's own order, skipping "Extras"
  // (extra opt-in mits — out of scope) and healer-job columns the party
  // doesn't field (the sheet lists all four healer jobs; a party has two —
  // an absent job's assignments can't apply to this roster).
  const HEALER_JOBS = ["White Mage", "Astrologian", "Scholar", "Sage"];
  const slotLabels = Object.keys(mech.assignments ?? {}).filter(
    (s) => s !== "Extras" && !(HEALER_JOBS.includes(s) && !slots.has(s))
  );

  return (
    <div style={mitRowStyle}>
      <span style={{ fontSize: "11px", fontWeight: 700, color: "#60a5fa", flexShrink: 0, width: "38px" }}>
        {/* mech.time already carries a trailing "+" for open-ended rows */}
        {mech.time ?? ""}
      </span>
      <span
        title={notes && mech.footnotes?.length ? mech.footnotes.map((n) => notes.footnotes[String(n)]).filter(Boolean).join("\n") : undefined}
        style={{ fontSize: "12px", fontWeight: 600, color: "#e2e8f0", flexShrink: 0, width: "150px" }}
      >
        {mech.name}
      </span>
      <span style={{ display: "flex", flexWrap: "wrap", columnGap: "16px", rowGap: "4px", minWidth: 0 }}>
        {slotLabels.map((slot) => (
          <SlotChip
            key={slot}
            slotLabel={slot}
            assignment={slots.get(slot)}
            entries={mech.assignments![slot]}
            notes={notes}
          />
        ))}
      </span>
    </div>
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
  ffPlayers,
  mitigationPlanId,
  onMitigationPlanChange,
}: StrategyDialogProps) {
  const plan = getMitigationPlan(mitigationPlanId);

  // Sheet party slots mapped onto the loaded FF roster (see mitigation-plan.ts).
  const slotMap = useMemo(() => {
    const map = new Map<string, SlotAssignment>();
    if (ffPlayers) for (const a of resolveMitigationSlots(ffPlayers)) map.set(a.slot, a);
    return map;
  }, [ffPlayers]);

  if (!open) return null;

  const showMitigation = ffPlayers !== null && ffPlayers.length > 0;

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
          width: showMitigation ? "min(880px, 94vw)" : "480px",
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

        {showMitigation && (
          <div style={{ marginBottom: strategy || crystals ? "18px" : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "2px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0" }}>
                Mitigation Plan
              </div>
              <select
                value={mitigationPlanId ?? ""}
                onChange={(e) => onMitigationPlanChange(e.target.value || null)}
                style={{
                  backgroundColor: "#1a1a1a",
                  color: "#e2e8f0",
                  border: "1px solid #444",
                  borderRadius: "5px",
                  padding: "3px 8px",
                  fontSize: "12px",
                }}
              >
                <option value="">None</option>
                {MITIGATION_PLANS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>

            {plan ? (
              <>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "12px" }}>
                  Expected mitigation casts per player, from the {plan.label} sheet.
                  Party slots are mapped onto this report&apos;s roster; a &quot;?&quot; marks
                  mappings the roster can&apos;t disambiguate (MT vs OT, D1 vs D2).
                  Dimmed ➔ entries carry over from an earlier cast. Hover for
                  sheet footnotes.
                </div>
                {plan.data.phases.map((phase) => (
                  <div key={phase.gid} style={{ marginBottom: "14px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#facc15", margin: "0 0 6px" }}>
                      {phase.title}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {phase.mechanics.map((mech, i) => (
                        <MechanicRow key={`${mech.name}-${i}`} mech={mech} slots={slotMap} notes={phase.notes} />
                      ))}
                    </div>
                  </div>
                ))}
                {plan.data.tank && (
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0", margin: "4px 0 2px" }}>
                      Tank Cooldowns
                    </div>
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "10px" }}>
                      Generic cooldown slots (Kitchen Sink, 40%, 90s, Short Mit, …)
                      from the sheet&apos;s tank table. P3/P5 columns are invuln
                      priority orders, not MT/OT.
                    </div>
                    {plan.data.tank.sections.map((section, si) => (
                      <div key={si} style={{ marginBottom: "12px" }}>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#facc15", margin: "0 0 6px" }}>
                          {section.title ?? `Section ${si + 1}`}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {section.mechanics.map((mech, i) => (
                            <MechanicRow key={`${mech.name}-${i}`} mech={mech} slots={slotMap} notes={section.notes} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p style={{ fontSize: "12px", color: "#94a3b8", margin: "6px 0 0" }}>
                Select a mitigation plan to see the expected mitigation casts for
                each player across the fight timeline.
              </p>
            )}
          </div>
        )}

        {!strategy && !crystals ? (
          showMitigation ? null : (
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
