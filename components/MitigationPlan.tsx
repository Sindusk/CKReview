"use client";

// components/MitigationPlan.tsx
//
// The Mitigation dialog's Analysis view: lib/mitigation/plan.ts's
// OptimizedPlan laid out for a raid lead to read in ten seconds, with no
// paragraphs (user, 2026-10-11; docs/archive/mitigation-optimizer-plan.md
// "UI").
//   - Header: the "Last N pulls" input (blank = 5), one ⓘ holding the
//     disclaimers and the legend, and the before → after counts.
//   - One card per "do together" group, drawn on the fight clock (user
//     picked this over a sentence list, 2026-10-11, asking that it be
//     clear when each cooldown is used now and when it should be): the
//     hits involved on a time line, then one lane per cooldown that
//     changes (name and player in job colour) with a hollow "now" dot
//     where it is used today, an arrow to a filled "use here" dot, or a
//     "+ extra use" dot for an add. A legend line on each card says what
//     the marks mean. Below, the lowest HP before → after on each hit the
//     group changes (typical pull; the worst pull in the tooltip); each
//     lane's tooltip says "fits N/M pulls".
//   - Footer: the hits that need healing or mechanics rather than
//     mitigation, and the ones no plan within budget fixes, each collapsed
//     to one line; expanded, each hit opens in the Timeline.
// A picked player sees only a checklist of their own changes and the
// summary line.

import { useState, type CSSProperties, type ReactNode } from "react";
import type { HitRef, OptimizedChange, OptimizedPlan, PlanGroup } from "@/lib/mitigation/plan";
import { PLAN_MAX_CHANGES, PLAN_MIN_PULLS, PLAN_WINDOW_DEFAULT } from "@/lib/mitigation/plan";
import { verdictFor } from "@/lib/mitigation/analyze";
import { getClassColor } from "@/lib/player-display";
import { VERDICT_STYLE, fmtTime } from "./MitigationTimeline";

const firstName = (player: string) => player.split(" ")[0];
const hp = (x: number) => (x < 0 ? "dead" : `${Math.round(x * 100)}%`);
const dim: CSSProperties = { color: "var(--ck-text-3)" };

const INFO = [
  "Estimated from the log: HP margins, damage rolls, snapshot timing and shield sizes can be off. Confirm on VOD before relying on a change.",
  `Make a card's changes together, at most ${PLAN_MAX_CHANGES} at a time, then re-check after a few pulls: if everyone moves their own cooldowns, the next pull fails the other way.`,
  "Times are the typical (median) time of each hit in these pulls. Red hit: failing; amber: tight. Lowest HP is the lowest player after the hit on a typical pull (the worst pull in the tooltip).",
].join("\n\n");

function Hp({ value }: { value: number }) {
  return <span className="ck-num" style={{ color: VERDICT_STYLE[verdictFor(value, value < 0 ? 1 : 0)].color }}>{hp(value)}</span>;
}

function changeTip(c: OptimizedChange): string {
  const what = c.kind === "add" ? `Add on ${c.to.name} #${c.to.occurrence}` : `Move from ${c.from!.name} #${c.from!.occurrence} to ${c.to.name} #${c.to.occurrence}`;
  return `${c.name} (${c.player}): ${what}\nFits the cooldowns in ${c.legal}/${c.pulls} pulls${c.gated ? `\nNeeds ${c.gated}: check the gauge` : ""}`;
}

// The fight clock's geometry (SVG units; the card scales it to its width).
const CLOCK_W = 760;
const LABEL_W = 190;   // the cooldown names on the left
const PLOT_L = LABEL_W + 20;
const PLOT_R = CLOCK_W - 40;
const AXIS_Y = 46;     // the fight's time line, hits on it
const LANE_H = 34;
const MOVE_COLOR = "#2bb38a";
const NOW_COLOR = "#8b8f98";

/** The hit a change is for: red when it needs help, grey otherwise. */
function hitColor(group: PlanGroup, id: string): string {
  const o = group.hits.find((h) => h.hit.id === id);
  if (!o) return NOW_COLOR;
  const b = o.before;
  if (b.verdict === "fail" || b.verdict === "under") return VERDICT_STYLE.fail.color;
  return b.tight ? VERDICT_STYLE.under.color : NOW_COLOR;
}

/**
 * One group on the fight clock: the hits it involves on a time line, and
 * one lane per cooldown with a hollow dot where it is used now, a filled dot
 * where to use it instead, and an arrow between (a new use: a filled dot
 * with a plus).
 */
function FightClock({ group }: { group: PlanGroup }) {
  const hits = new Map<string, HitRef>();
  for (const c of group.changes) {
    hits.set(c.to.id, c.to);
    if (c.from) hits.set(c.from.id, c.from);
  }
  const marks = [...hits.values()].sort((a, b) => a.medianMs - b.medianMs);
  const t0 = marks[0].medianMs;
  const t1 = marks[marks.length - 1].medianMs;
  const pad = Math.max(10_000, (t1 - t0) * 0.06);
  const x = (ms: number) => PLOT_L + ((ms - (t0 - pad)) / (t1 - t0 + 2 * pad)) * (PLOT_R - PLOT_L);
  // Hit labels alternate above the line when two would collide.
  let lastX = -Infinity;
  let row = 0;
  const labelled = marks.map((h) => {
    const hx = x(h.medianMs);
    row = hx - lastX < 150 ? 1 - row : 0;
    lastX = hx;
    return { h, hx, ly: AXIS_Y - 10 - row * 15 };
  });
  const height = AXIS_Y + 22 + group.changes.length * LANE_H;
  const text = { fontSize: 12, fill: "var(--ck-text-2)" };
  return (
    <svg viewBox={`0 0 ${CLOCK_W} ${height}`} width="100%" style={{ display: "block", maxWidth: CLOCK_W }}>
      <defs>
        <marker id="ck-move-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0,0L10,5L0,10z" fill={MOVE_COLOR} />
        </marker>
      </defs>
      <text x={0} y={AXIS_Y + 4} style={{ ...text, fill: "var(--ck-text-3)" }}>Fight time</text>
      <line x1={PLOT_L - 10} y1={AXIS_Y} x2={PLOT_R + 10} y2={AXIS_Y} stroke="var(--ck-line-2)" />
      {labelled.map(({ h, hx, ly }) => (
        <g key={h.id}>
          <line x1={hx} y1={AXIS_Y} x2={hx} y2={height - 6} stroke="var(--ck-line)" strokeDasharray="2 4" />
          <circle cx={hx} cy={AXIS_Y} r={5} fill={hitColor(group, h.id)} />
          <text x={hx} y={ly} textAnchor="middle" style={{ ...text, fill: "var(--ck-text)" }}>
            {h.name} #{h.occurrence} <tspan style={{ fill: "var(--ck-text-3)" }}>{fmtTime(h.medianMs)}</tspan>
          </text>
        </g>
      ))}
      {group.changes.map((c, i) => {
        const y = AXIS_Y + 30 + i * LANE_H;
        const tx = x(c.to.medianMs);
        const fx = c.from ? x(c.from.medianMs) : undefined;
        const tip = changeTip(c);
        const color = getClassColor("ffxiv", c.job);
        return (
          <g key={i}>
            <title>{tip}</title>
            <text x={0} y={y + 4} style={{ ...text, fill: "var(--ck-text)" }}>
              {c.name} <tspan style={{ fill: color }}>{firstName(c.player)}</tspan>
            </text>
            {fx !== undefined ? (
              <>
                <line x1={fx + (tx > fx ? 7 : -7)} y1={y} x2={tx + (tx > fx ? -9 : 9)} y2={y}
                  stroke={MOVE_COLOR} strokeWidth={2} markerEnd="url(#ck-move-arrow)" />
                <circle cx={fx} cy={y} r={6} fill="none" stroke={NOW_COLOR} strokeWidth={2} />
                <text x={fx} y={y + 19} textAnchor="middle" style={{ ...text, fontSize: 11, fill: "var(--ck-text-3)" }}>now</text>
                <circle cx={tx} cy={y} r={6} fill={MOVE_COLOR} />
                <text x={tx} y={y + 19} textAnchor="middle" style={{ ...text, fontSize: 11, fill: MOVE_COLOR }}>use here</text>
              </>
            ) : (
              <>
                <circle cx={tx} cy={y} r={7} fill={MOVE_COLOR} />
                <text x={tx} y={y + 4} textAnchor="middle" style={{ fontSize: 13, fontWeight: 700, fill: "#0b0b0b" }}>+</text>
                <text x={tx} y={y + 20} textAnchor="middle" style={{ ...text, fontSize: 11, fill: MOVE_COLOR }}>
                  extra use{c.gated ? ` (needs ${c.gated})` : ""}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** What the group does to each hit it changes, in fight order. */
function Effects({ group }: { group: PlanGroup }) {
  const list = [...group.hits].sort((a, b) => a.hit.medianMs - b.hit.medianMs);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: 12, marginTop: 6, color: "var(--ck-text-2)" }}>
      <span style={dim}>Lowest HP, typical pull:</span>
      {list.map(({ hit, before, after }) => (
        <span key={hit.id} title={`Worst pull ${hp(before.worst)} → ${hp(after.worst)}`}>
          {hit.name} #{hit.occurrence} <Hp value={before.median} /> <span style={dim}>→</span> <Hp value={after.median} />
        </span>
      ))}
    </div>
  );
}

function GroupCard({ group }: { group: PlanGroup }) {
  const moves = group.changes.some((c) => c.kind === "move");
  const adds = group.changes.some((c) => c.kind === "add");
  return (
    <div className="ck-card" style={{ padding: "8px 10px", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 2 }}>
        <span style={{ color: "var(--ck-text-gold)", fontWeight: 600, fontSize: 12 }}>
          {group.purpose === "fix" ? "Do these together" : "Frees cooldowns for later mechanics"}
        </span>
        <span style={{ ...dim, fontSize: 11 }}>
          {moves && <>
            <span style={{ color: NOW_COLOR }}>○ now</span>: where it&apos;s used today{" · "}
            <span style={{ color: MOVE_COLOR }}>→ ● use here</span>: move it to this hit instead
          </>}
          {moves && adds && " · "}
          {adds && <span style={{ color: MOVE_COLOR }}>+ extra use</span>}
          {adds && ": cast it one more time here"}
        </span>
      </div>
      <FightClock group={group} />
      <Effects group={group} />
    </div>
  );
}

function Collapsible({ label, hits, onOpenHit }: { label: string; hits: HitRef[]; onOpenHit: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  if (!hits.length) return null;
  return (
    <div style={{ marginTop: 6, fontSize: 12 }}>
      <button className="ck-btn ck-btn--xs" onClick={() => setOpen((o) => !o)}>{label} {open ? "‹" : "›"}</button>
      {open && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
          {hits.map((h) => (
            <button key={h.id} className="ck-btn ck-btn--xs" title="Open in the Timeline" onClick={() => onOpenHit(h.id)}>
              {h.name} #{h.occurrence} <span style={dim}>{fmtTime(h.medianMs)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Summary({ plan }: { plan: OptimizedPlan }) {
  const { before, after } = plan.summary;
  const n = plan.groups.reduce((s, g) => s + g.changes.length, 0);
  return (
    <span style={{ fontSize: 12, color: "var(--ck-text-2)", whiteSpace: "nowrap" }}>
      Failing <b style={{ color: "var(--ck-text)" }}>{before.failing} → {after.failing}</b>
      {" · "}Tight <b style={{ color: "var(--ck-text)" }}>{before.tight} → {after.tight}</b>
      {" · "}{n} change{n === 1 ? "" : "s"}
    </span>
  );
}

function Checklist({ plan, player }: { plan: OptimizedPlan; player: string }) {
  const mine = plan.groups.flatMap((g) => g.changes).filter((c) => c.player === player);
  if (!mine.length) return <p className="ck-dialog-text" style={{ margin: "10px 0 0" }}>No change for {firstName(player)} this round.</p>;
  return (
    <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 13, color: "var(--ck-text)" }}>
      {mine.map((c, i) => (
        <li key={i} title={changeTip(c)} style={{ marginBottom: 4 }}>
          <b>{c.name}</b>: {c.from ? <>{c.from.name} #{c.from.occurrence} → </> : "add on "}{c.to.name} #{c.to.occurrence}
          <span style={dim}> ({fmtTime(c.to.medianMs)}){c.gated ? ` · needs ${c.gated}` : ""}</span>
        </li>
      ))}
    </ul>
  );
}

export function PlanView({ plan, pending, error, focus, windowInput, onWindowInput, groupPulls, onOpenHit }: {
  plan:          OptimizedPlan | null;
  pending:       boolean;
  error?:        string;
  focus:         string | null;  // the selected player; null: everything
  windowInput:   string;
  onWindowInput: (v: string) => void;
  groupPulls:    number;         // the group's analyzable pulls (the window's ceiling)
  onOpenHit:     (hitId: string) => void;
}) {
  const nothing = plan && plan.summary.before.failing + plan.summary.before.tight === 0;
  let body: ReactNode = null;
  if (plan && focus) body = <Checklist plan={plan} player={focus} />;
  else if (plan) {
    body = (
      <>
        {nothing && <p className="ck-dialog-text" style={{ margin: "10px 0 8px" }}>Nothing failing or tight in the last {plan.windowPulls.length} pulls.</p>}
        {!nothing && plan.groups.length === 0 && <p className="ck-dialog-text" style={{ margin: "10px 0 8px" }}>No change within {PLAN_MAX_CHANGES} fits the cooldowns.</p>}
        <div style={{ marginTop: 10 }}>{plan.groups.map((g, i) => <GroupCard key={i} group={g} />)}</div>
        <Collapsible label={plan.notMitigation.length === 1 ? "1 hit needs healing or mechanics, not mitigation"
            : `${plan.notMitigation.length} hits need healing or mechanics, not mitigation`}
          hits={plan.notMitigation} onOpenHit={onOpenHit} />
        <Collapsible label={`${plan.unfixed.length} not fixable within ${PLAN_MAX_CHANGES} changes`} hits={plan.unfixed} onOpenHit={onOpenHit} />
      </>
    );
  }
  return (
    <div style={{ padding: "8px 12px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <label style={{ fontSize: 12, color: "var(--ck-text-2)", display: "inline-flex", alignItems: "center", gap: 5 }}>
          Last
          <input className="ck-field" type="number" min={PLAN_MIN_PULLS} max={groupPulls} placeholder={String(Math.min(PLAN_WINDOW_DEFAULT, groupPulls))}
            value={windowInput} onChange={(e) => onWindowInput(e.target.value)} style={{ width: 48, padding: "2px 4px" }} />
          pulls
        </label>
        <span title={INFO} style={{ ...dim, cursor: "help" }}>ⓘ</span>
        {pending && <span style={{ ...dim, fontSize: 12 }}>Working…</span>}
        <span style={{ flex: "1 1 auto" }} />
        {plan && <Summary plan={plan} />}
      </div>
      {error && <p style={{ color: VERDICT_STYLE.fail.color, fontSize: 12 }}>The analysis failed: {error}</p>}
      <div style={{ opacity: pending ? 0.5 : 1 }}>{body}</div>
    </div>
  );
}
