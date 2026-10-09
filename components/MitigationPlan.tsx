"use client";

// components/MitigationPlan.tsx
//
// The Mitigation dialog's Plan view: lib/mitigation/plan.ts laid out for a
// raid lead. A few coordinated changes first (one per short or tight hit,
// at most PLAN_MAX_CHANGES), then the hits that need a look without a
// mitigation change, then where mitigation is spare. Framed as what the
// group could change, never as who failed, and marked as inferred from the
// log (user-approved design, 2026-10-09).
//
// The role filter only dims what doesn't involve that role. Every item
// stays visible and worded the same, so it never reads as personal orders.

import { useState, type CSSProperties, type ReactNode } from "react";
import type { MitigationPlan, PlanHitRef, PlanIssue, PlanSpare } from "@/lib/mitigation/plan";
import { PLAN_MAX_CHANGES } from "@/lib/mitigation/plan";
import { MARGIN_UNDER, verdictFor } from "@/lib/mitigation/analyze";
import { VERDICT_STYLE, fmtTime } from "./MitigationTimeline";

export type RoleFilter = "all" | "tank" | "healer" | "melee" | "ranged";

export const ROLE_FILTERS: { value: RoleFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "tank", label: "Tanks" },
  { value: "healer", label: "Healers" },
  { value: "melee", label: "Melee" },
  { value: "ranged", label: "Ranged" },
];

/** The role filter a party slot (MT, H1, ...) belongs to. */
export function roleOfSlot(slot: string | undefined): RoleFilter | undefined {
  if (slot === "MT" || slot === "OT") return "tank";
  return ({ H: "healer", M: "melee", R: "ranged" } as Record<string, RoleFilter>)[slot?.[0] ?? ""];
}

const SPARE_SHOWN = 5;
const DIMMED = 0.4;

const firstName = (player: string) => player.split(" ")[0];
const hp = (x: number) => (x < 0 ? "dead" : `${Math.round(x * 100)}%`);

const STATUS_STYLE: Record<PlanIssue["status"], { label: string; color: string }> = {
  short:    { label: "Short", color: VERDICT_STYLE.under.color },
  tight:    { label: "Tight", color: "#eab308" },
  healing:  { label: "Healing", color: VERDICT_STYLE.fail.color },
  mechanic: { label: "Mechanic", color: VERDICT_STYLE.fail.color },
};

const section: CSSProperties = { color: "var(--ck-text-gold)", fontWeight: 600, fontSize: 12, margin: "14px 0 6px" };
const dim: CSSProperties = { color: "var(--ck-text-3)" };

function Hp({ value }: { value: number }) {
  return <span className="ck-num" style={{ color: VERDICT_STYLE[verdictFor(value, value < 0 ? 1 : 0)].color }}>{hp(value)}</span>;
}

function HitName({ hit }: { hit: PlanHitRef }) {
  return (
    <>
      <span style={{ color: "var(--ck-text)", fontWeight: 600 }}>{hit.name} <span style={dim}>#{hit.occurrence}</span></span>
      <span style={{ ...dim, fontSize: 11 }}> {hit.phase ? `${hit.phase} · ` : ""}{fmtTime(hit.medianMs)}{hit.tankOnly ? " · tanks" : ""}</span>
    </>
  );
}

function HitStats({ hit }: { hit: PlanHitRef }) {
  return (
    <span style={{ fontSize: 11, color: "var(--ck-text-2)", whiteSpace: "nowrap" }}
      title="Lowest player's HP after the hit: the median over pulls, then the worst pull.">
      lowest <Hp value={hit.medianMargin} /> median, <Hp value={hit.worstMargin} /> worst
      <span style={dim}> · {hit.pulls} pulls{hit.deathPulls ? ` · deaths in ${hit.deathPulls}` : ""}</span>
    </span>
  );
}

function StatusBadge({ status }: { status: PlanIssue["status"] }) {
  const s = STATUS_STYLE[status];
  return <span className="ck-badge" style={{ color: s.color, minWidth: 54, justifyContent: "center" }}>{s.label}</span>;
}

function ChangeCard({ issue, index, active }: { issue: PlanIssue; index: number; active: (player: string) => boolean }) {
  const c = issue.change!;
  const est = issue.status === "short" ? c.estMargin : c.estWorst;
  const stillShort = est !== undefined && est < MARGIN_UNDER;
  const who = <span style={{ color: active(c.player) ? "var(--ck-text-gold)" : "var(--ck-text)" }}>{firstName(c.player)}</span>;
  return (
    <div className="ck-card" style={{ padding: "8px 10px", marginBottom: 6, opacity: active(c.player) ? 1 : DIMMED }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span className="ck-num" style={{ ...dim, width: 14 }}>{index}</span>
        <StatusBadge status={issue.status} />
        <span style={{ flex: "1 1 auto" }}><HitName hit={issue.hit} /></span>
        <HitStats hit={issue.hit} />
      </div>
      <div style={{ margin: "5px 0 0 22px", fontSize: 13, color: "var(--ck-text)" }}>
        {c.kind === "add"
          ? <>→ Add <b>{c.name}</b> ({who}). It is free here.</>
          : <>→ Move <b>{c.name}</b> ({who}) here from <HitName hit={c.from!} />.</>}
      </div>
      <div style={{ margin: "3px 0 0 22px", fontSize: 11, color: "var(--ck-text-2)" }}>
        {est === undefined
          ? <span>No estimate (this shield never absorbed anything in these pulls).</span>
          : <span>
              Estimated after: <Hp value={est} /> {issue.status === "short" ? "median" : "in the worst pull"}
              {stillShort && <span style={{ color: VERDICT_STYLE.under.color }}> (still short, but closer)</span>}
            </span>}
        {c.from && <span> · {c.from.name} #{c.from.occurrence} stays at <Hp value={c.from.estMargin} /></span>}
        <span style={dim}> · fits the cooldowns in {c.fits}/{c.pulls} pulls</span>
      </div>
    </div>
  );
}

function IssueRow({ issue }: { issue: PlanIssue }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "4px 0", borderTop: "1px solid var(--ck-line)", flexWrap: "wrap" }}>
      <StatusBadge status={issue.status} />
      <span><HitName hit={issue.hit} /></span>
      <HitStats hit={issue.hit} />
      <span style={{ flexBasis: "100%", marginLeft: 62, fontSize: 11, color: "var(--ck-text-2)" }}>{issue.reason}</span>
    </div>
  );
}

function SpareRow({ spare, active }: { spare: PlanSpare; active: (player: string) => boolean }) {
  const involved = spare.items.some((x) => x.player && active(x.player));
  return (
    <div style={{ padding: "4px 0", borderTop: "1px solid var(--ck-line)", opacity: involved ? 1 : DIMMED, fontSize: 12 }}>
      <HitName hit={spare.hit} />
      <span style={{ color: "var(--ck-text-2)" }}> — could do without </span>
      {spare.items.map((x, i) => (
        <span key={x.name}>
          {i > 0 && ", "}
          <span style={{ color: "var(--ck-text)" }}>{x.name}</span>
          {x.player && <span style={{ color: active(x.player) ? "var(--ck-text-gold)" : "var(--ck-text-3)" }}> ({firstName(x.player)})</span>}
        </span>
      ))}
      <span style={{ color: "var(--ck-text-2)" }}> · lowest would be <Hp value={spare.worstMargin} /> in the worst pull</span>
    </div>
  );
}

function Toggle({ open, onClick, children }: { open: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button className="ck-btn ck-btn--xs" onClick={onClick} style={{ marginLeft: 8 }}>
      {open ? "Hide" : children}
    </button>
  );
}

export function PlanView({ plan, roleOf, role }: {
  plan: MitigationPlan;
  // The role filter each player belongs to (undefined: unknown slot, never dimmed).
  roleOf: (player: string) => RoleFilter | undefined;
  role: RoleFilter;
}) {
  const [showDeferred, setShowDeferred] = useState(false);
  const [showAllSpare, setShowAllSpare] = useState(false);
  const active = (player: string) => role === "all" || (roleOf(player) ?? role) === role;

  const changes = plan.issues.filter((i) => i.change);
  const deferred = plan.issues.filter((i) => !i.change && i.reason?.startsWith("Not planned"));
  const others = plan.issues.filter((i) => !i.change && !deferred.includes(i));
  const spare = [...plan.spare].sort((a, b) => b.items.length - a.items.length || b.worstMargin - a.worstMargin);
  const spareShown = showAllSpare ? spare : spare.slice(0, SPARE_SHOWN);

  return (
    <div style={{ padding: "4px 12px 12px" }}>
      <p className="ck-help" style={{ margin: "6px 0 0" }}>
        Proposed changes for the raid lead, from {plan.pulls} pulls. Make them together, at most {PLAN_MAX_CHANGES} at a time,
        then re-check after a few pulls: if everyone moves their own cooldowns, the next pull fails the other way.
      </p>
      <p className="ck-help" style={{ margin: "4px 0 0", ...dim }}>
        Read from the log: HP margins, estimates and cooldown checks can be off (damage rolls, snapshot timing,
        shields whose size isn&apos;t logged). Confirm a change on VOD before relying on it.
      </p>

      <div style={section}>Changes ({changes.length})</div>
      {changes.length === 0
        ? <p className="ck-dialog-text" style={{ margin: 0 }}>
            {plan.issues.some((i) => i.status === "short" || i.status === "tight")
              ? "No change found that fits the cooldowns. See below."
              : "Nothing short or tight across these pulls."}
          </p>
        : changes.map((issue, i) => <ChangeCard key={issue.hit.id} issue={issue} index={i + 1} active={active} />)}

      {(others.length > 0 || deferred.length > 0) && (
        <>
          <div style={section}>Also worth a look</div>
          {others.map((issue) => <IssueRow key={issue.hit.id} issue={issue} />)}
          {deferred.length > 0 && (
            <div className="ck-help" style={{ padding: "6px 0", borderTop: "1px solid var(--ck-line)" }}>
              {deferred.length} more short or tight hit{deferred.length > 1 ? "s" : ""}, left for the next round so the group
              doesn&apos;t change too much at once.
              <Toggle open={showDeferred} onClick={() => setShowDeferred((s) => !s)}>Show</Toggle>
            </div>
          )}
          {showDeferred && deferred.map((issue) => <IssueRow key={issue.hit.id} issue={issue} />)}
        </>
      )}

      {spare.length > 0 && (
        <>
          <div style={section}>Spare mitigation ({spare.length} hits)</div>
          <p className="ck-help" style={{ margin: "0 0 4px" }}>
            Hits that would still land Good with these removed: room to move cooldowns from, not a list to drop.
          </p>
          {spareShown.map((s) => <SpareRow key={s.hit.id} spare={s} active={active} />)}
          {spare.length > SPARE_SHOWN && (
            <div className="ck-help" style={{ paddingTop: 6 }}>
              <Toggle open={showAllSpare} onClick={() => setShowAllSpare((s) => !s)}>Show all {spare.length}</Toggle>
            </div>
          )}
        </>
      )}
    </div>
  );
}
