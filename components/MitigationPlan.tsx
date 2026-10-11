"use client";

// components/MitigationPlan.tsx
//
// The Mitigation dialog's Analysis view: lib/mitigation/plan.ts's
// OptimizedPlan. Interim list layout while the optimizer is wired in
// (docs/mitigation-optimizer-plan.md build step 6); the card layout follows.

import type { OptimizedPlan } from "@/lib/mitigation/plan";
import { PLAN_MIN_PULLS, PLAN_WINDOW_DEFAULT } from "@/lib/mitigation/plan";
import { fmtTime } from "./MitigationTimeline";

const firstName = (player: string) => player.split(" ")[0];
const pct = (x: number) => `${Math.round(x * 100)}%`;

export function PlanView({ plan, pending, error, focus, windowInput, onWindowInput, groupPulls }: {
  plan:          OptimizedPlan | null;
  pending:       boolean;
  error?:        string;
  focus:         string | null;  // the selected player; null: everything
  windowInput:   string;
  onWindowInput: (v: string) => void;
  groupPulls:    number;
  onOpenHit:     (hitId: string) => void;
}) {
  return (
    <div style={{ padding: "8px 12px 12px", fontSize: 12 }}>
      <label style={{ color: "var(--ck-text-2)" }}>
        Last{" "}
        <input className="ck-field" type="number" min={PLAN_MIN_PULLS} max={groupPulls} placeholder={String(PLAN_WINDOW_DEFAULT)}
          value={windowInput} onChange={(e) => onWindowInput(e.target.value)} style={{ width: 52, padding: "2px 4px" }} />{" "}
        pulls
      </label>
      {pending && <span style={{ marginLeft: 10, color: "var(--ck-text-3)" }}>Working…</span>}
      {error && <p style={{ color: "#f87171" }}>{error}</p>}
      {plan && (
        <>
          <p>Failing {plan.summary.before.failing} → {plan.summary.after.failing} · Tight {plan.summary.before.tight} → {plan.summary.after.tight}</p>
          {plan.groups.map((g, i) => (
            <div key={i} className="ck-card" style={{ padding: 8, marginBottom: 6 }}>
              {g.changes.filter((c) => !focus || c.player === focus).map((c, j) => (
                <div key={j}>
                  {c.name} ({firstName(c.player)}): {c.from ? `${c.from.name} #${c.from.occurrence} → ` : "add on "}
                  {c.to.name} #{c.to.occurrence} ({fmtTime(c.to.medianMs)}){c.gated ? ` · needs ${c.gated}` : ""}
                </div>
              ))}
              {g.hits.map((h) => (
                <div key={h.hit.id} style={{ color: "var(--ck-text-2)" }}>
                  {h.hit.name} #{h.hit.occurrence}: {pct(h.before.median)} → {pct(h.after.median)}
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
