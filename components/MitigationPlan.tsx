"use client";

// components/MitigationPlan.tsx
//
// The Mitigation dialog's Analysis view: lib/mitigation/plan.ts's
// OptimizedPlan laid out for a raid lead to read in ten seconds, with no
// paragraphs (user, 2026-10-11; docs/archive/mitigation-optimizer-plan.md
// "UI").
//   - Header: the "Last N pulls" input (blank = 5), one ⓘ holding the
//     disclaimers and the legend, and the before → after counts.
//   - One card per "do together" group. Columns are only the hits the
//     group touches, in fight order; rows are only the cooldowns that
//     change, labelled with the cooldown and the player's first name in
//     their job colour. ○ is where a moved cooldown was, ● where it goes,
//     ✚ an add. The last row is the lowest HP before → after (median),
//     coloured by verdict; the worst pull is in the cell's tooltip, and
//     "fits N/M pulls" in each change's.
//   - Footer: the hits that need healing or mechanics rather than
//     mitigation, and the ones no plan within budget fixes, each collapsed
//     to one line; expanded, each hit opens in the Timeline.
// A picked player sees only a checklist of their own changes and the
// summary line.

import { useState, type CSSProperties, type ReactNode } from "react";
import type { HitOutcome, HitRef, OptimizedChange, OptimizedPlan, PlanGroup } from "@/lib/mitigation/plan";
import { PLAN_MAX_CHANGES, PLAN_MIN_PULLS, PLAN_WINDOW_DEFAULT } from "@/lib/mitigation/plan";
import { verdictFor } from "@/lib/mitigation/analyze";
import { FFXIV_MITIGATION } from "@/lib/mitigation/ffxiv-catalog";
import { getClassColor } from "@/lib/player-display";
import { getFFAbilityIconUrl } from "@/lib/ability-icons";
import { VERDICT_STYLE, fmtTime } from "./MitigationTimeline";

const firstName = (player: string) => player.split(" ")[0];
const hp = (x: number) => (x < 0 ? "dead" : `${Math.round(x * 100)}%`);
const dim: CSSProperties = { color: "var(--ck-text-3)" };
const cell: CSSProperties = { padding: "4px 10px", textAlign: "center", whiteSpace: "nowrap" };

const INFO = [
  "Estimated from the log: HP margins, damage rolls, snapshot timing and shield sizes can be off. Confirm on VOD before relying on a change.",
  `Make a card's changes together, at most ${PLAN_MAX_CHANGES} at a time, then re-check after a few pulls: if everyone moves their own cooldowns, the next pull fails the other way.`,
  "○ where a cooldown was · ● where it goes · ✚ a new use · HP: lowest player after the hit, median over the pulls (the worst pull in the tooltip).",
].join("\n\n");

function Hp({ value }: { value: number }) {
  return <span className="ck-num" style={{ color: VERDICT_STYLE[verdictFor(value, value < 0 ? 1 : 0)].color }}>{hp(value)}</span>;
}

function HitHead({ hit }: { hit: HitRef }) {
  return (
    <>
      <div style={{ color: "var(--ck-text)", fontWeight: 600 }}>{hit.name} <span style={dim}>#{hit.occurrence}</span></div>
      <div style={{ ...dim, fontSize: 11, fontWeight: 400 }}>{fmtTime(hit.medianMs)}</div>
    </>
  );
}

function CooldownLabel({ change }: { change: OptimizedChange }) {
  const entry = FFXIV_MITIGATION.catalog.find((e) => e.key === change.key);
  const icon = getFFAbilityIconUrl(entry?.icon);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
      {icon && <img src={icon} alt="" width={18} height={18} style={{ borderRadius: 3 }} />}
      <span style={{ color: "var(--ck-text)" }}>{change.name}</span>
      <span style={{ color: getClassColor("ffxiv", change.job) }}>{firstName(change.player)}</span>
      {change.gated && <span style={{ ...dim, fontSize: 11 }}>needs {change.gated}</span>}
    </span>
  );
}

function changeTip(c: OptimizedChange): string {
  const what = c.kind === "add" ? `Add on ${c.to.name} #${c.to.occurrence}` : `Move from ${c.from!.name} #${c.from!.occurrence} to ${c.to.name} #${c.to.occurrence}`;
  return `${c.name} (${c.player}): ${what}\nFits the cooldowns in ${c.legal}/${c.pulls} pulls${c.gated ? `\nNeeds ${c.gated}: check the gauge` : ""}`;
}

/** One row's mark in one column. */
function Mark({ change, col, cols }: { change: OptimizedChange; col: number; cols: HitRef[] }) {
  const to = cols.findIndex((h) => h.id === change.to.id);
  const tip = changeTip(change);
  if (change.kind === "add") {
    return col === to ? <span title={tip} style={{ color: VERDICT_STYLE.good.color, fontWeight: 700 }}>✚</span> : null;
  }
  const from = cols.findIndex((h) => h.id === change.from!.id);
  const line = { color: "var(--ck-text-3)" };
  if (col === from) return <span title={tip} style={line}>○</span>;
  if (col === to) return <span title={tip} style={{ color: "var(--ck-text-gold)", fontWeight: 700 }}>{to > from ? "► ●" : "● ◄"}</span>;
  if (col > Math.min(from, to) && col < Math.max(from, to)) return <span style={line}>────</span>;
  return null;
}

function HpCell({ outcome }: { outcome?: HitOutcome }) {
  if (!outcome) return <span style={dim}>no change</span>;
  const { before, after } = outcome;
  return (
    <span title={`Median ${hp(before.median)} → ${hp(after.median)}\nWorst pull ${hp(before.worst)} → ${hp(after.worst)}`}>
      <Hp value={before.median} /> <span style={dim}>→</span> <Hp value={after.median} />
    </span>
  );
}

function GroupCard({ group }: { group: PlanGroup }) {
  const byId = new Map<string, HitRef>();
  for (const c of group.changes) {
    byId.set(c.to.id, c.to);
    if (c.from) byId.set(c.from.id, c.from);
  }
  for (const h of group.hits) byId.set(h.hit.id, h.hit);
  const cols = [...byId.values()].sort((a, b) => a.medianMs - b.medianMs);
  const outcome = new Map(group.hits.map((h) => [h.hit.id, h]));
  const th: CSSProperties = { ...cell, fontWeight: 600, verticalAlign: "bottom" };
  return (
    <div className="ck-card" style={{ padding: "6px 8px 8px", marginBottom: 8, overflowX: "auto" }}>
      <div style={{ color: "var(--ck-text-gold)", fontWeight: 600, fontSize: 12, marginBottom: 4 }}>
        {group.purpose === "fix" ? "Do together" : "Frees cooldowns for later mechanics"}
      </div>
      <table style={{ borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ ...th, textAlign: "left" }} />
            {cols.map((h) => <th key={h.id} style={th}><HitHead hit={h} /></th>)}
          </tr>
        </thead>
        <tbody>
          {group.changes.map((c, i) => (
            <tr key={i} style={{ borderTop: "1px solid var(--ck-line)" }}>
              <td style={{ ...cell, textAlign: "left" }} title={changeTip(c)}><CooldownLabel change={c} /></td>
              {cols.map((h, col) => <td key={h.id} style={cell}><Mark change={c} col={col} cols={cols} /></td>)}
            </tr>
          ))}
          <tr style={{ borderTop: "1px solid var(--ck-line-2)" }}>
            <td style={{ ...cell, textAlign: "left", color: "var(--ck-text-2)" }}>Lowest HP</td>
            {cols.map((h) => <td key={h.id} style={cell}><HpCell outcome={outcome.get(h.id)} /></td>)}
          </tr>
        </tbody>
      </table>
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
