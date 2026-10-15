"use client";

// components/MitigationPlan.tsx
//
// The Mitigation dialog's Analysis view, laid out like the Damage dialog
// (user, 2026-10-14): findings from lib/mitigation/findings.ts beside the
// fight timeline (components/MitigationAnalysisTimeline.tsx), on one
// screen.
//   - The window controls (AnalysisWindowControls) sit in the dialog's top
//     bar (user, 2026-10-14).
//   - Left: three badges, then the findings in groups (under-mitigated,
//     plan, unused, mistimed, not mitigation), two lines a row. Right: the
//     tiles (failing, tight, unused, mistimed, plan; each filters the
//     list), over the timeline. Picking a row or a bar selects that hit in
//     both.
// Opening it reads the log only: facts, no suggestions, so it is quick
// (user, 2026-10-14: the panel supplies information rather than running a
// task). The first badge is an Analyze button; it runs the optimizer
// (lib/mitigation/plan.ts, in the dialog's worker), which fills the badges
// with the biggest wins and adds the plan, each row's "Try" (a plan change)
// or "Idea" (one the plan doesn't make) and the plan's marks on the lanes.
// Works on one pull as well as a window (user, 2026-10-14).

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { HitRef, OptimizedChange, OptimizedPlan } from "@/lib/mitigation/plan";
import { PLAN_MAX_CHANGES, PLAN_MIN_PULLS, PLAN_WINDOW_DEFAULT } from "@/lib/mitigation/plan";
import {
  buildAnalysisFindings, type AnalysisFindings, type FindingsWindowPull, type LateFinding, type OtherFinding,
  type PlanLetter, type StackedFinding, type UnderFinding, type UnusedFinding,
} from "@/lib/mitigation/findings";
import type { DebuffReach } from "@/lib/mitigation/debuff-reach";
import { FFXIV_MITIGATION } from "@/lib/mitigation/ffxiv-catalog";
import { VERDICT_STYLE, afterColor, fmtTime } from "./MitigationTimeline";
import AnalysisTimeline, { jobText } from "./MitigationAnalysisTimeline";
import { FINDING_COLOR, FindingGlyph, type FindingGlyphKind } from "./ui/MitigationGlyphs";

const firstName = (player: string) => player.split(" ")[0];
const hp = (x: number) => (x < 0 ? "dead" : `${Math.round(x * 100)}%`);
const hpColor = (x: number) => (x < 0 ? VERDICT_STYLE.fail.color : afterColor(x));
const dim: CSSProperties = { color: "var(--ck-text-3)" };
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const hitLabel = (h: HitRef) => `${h.name}${h.occurrence > 1 ? ` #${h.occurrence}` : ""}`;
const STACKED_SHOWN = 3;

const INFO = [
  "Opening this view reads the log only. Analyze runs the optimizer over these pulls for changes to try and ideas.",
  "Estimated from the log: HP margins, damage rolls, snapshot timing and shield sizes can be off. Confirm on VOD before relying on a change.",
  `Make a plan's changes together, at most ${PLAN_MAX_CHANGES} at a time, then re-check after a few pulls: if everyone moves their own cooldowns, the next pull fails the other way.`,
  "Times are each hit's typical (median) time in these pulls; the cooldown lanes show the longest pull's casts. Lowest HP is the lowest player after the hit on a typical pull.",
  "Ideas are changes the plan doesn't make: check them on the Timeline first. Tank busters are on the Tanking tab.",
].join("\n\n");

function Hp({ value }: { value: number }) {
  return <span className="ck-num" style={{ color: hpColor(value) }}>{hp(value)}</span>;
}
function Before({ from, to }: { from: number; to: number }) {
  return <><Hp value={from} /><span style={{ ...dim, fontWeight: 400 }}> → </span><Hp value={to} /></>;
}
function Who({ player, job }: { player: string; job: string }) {
  return <span style={{ color: jobText(job) }}>{firstName(player)}</span>;
}
const At = ({ ms }: { ms: number }) => <span className="ck-num" style={dim}>{fmtTime(ms)}</span>;
const Try = ({ idea }: { idea?: boolean }) => <b style={{ color: idea ? FINDING_COLOR.unused : FINDING_COLOR.plan }}>{idea ? "Idea" : "Try"}</b>;

// ── Badges ───────────────────────────────────────────────────────────────

type Win = { key: string; glyph: FindingGlyphKind; title: string; value: ReactNode; tip: string; hitId?: string };

/** The plan group's headline effect: the needy hit it lifts most. */
function groupImpact(l: PlanLetter): { hit: HitRef; from: number; to: number } | undefined {
  let best: { hit: HitRef; from: number; to: number; gain: number } | undefined;
  for (const h of l.group.hits) {
    const failing = h.before.verdict === "fail" || h.before.verdict === "under";
    if (!failing && !h.before.tight) continue;
    const [from, to] = failing ? [h.before.median, h.after.median] : [h.before.worst, h.after.worst];
    if (!best || to - from > best.gain) best = { hit: h.hit, from, to, gain: to - from };
  }
  return best;
}

function changeLine(c: OptimizedChange): string {
  return c.kind === "add"
    ? `${c.name} (${firstName(c.player)}): extra use on ${hitLabel(c.to)} ${fmtTime(c.to.medianMs)}${c.gated ? ` (needs ${c.gated})` : ""}`
    : `${c.name} (${firstName(c.player)}): ${hitLabel(c.from!)} ${fmtTime(c.from!.medianMs)} → ${hitLabel(c.to)} ${fmtTime(c.to.medianMs)}`;
}

function biggestWins(f: AnalysisFindings): Win[] {
  const wins: Win[] = [];
  for (const l of f.letters.filter((x) => x.group.purpose === "fix")) {
    const imp = groupImpact(l);
    const names = [...new Set(l.group.changes.map((c) => c.name))].join(" + ");
    wins.push({
      key: `plan${l.letter}`, glyph: "plan", title: `Plan ${l.letter} · ${names}`, hitId: imp?.hit.id,
      value: imp ? <Before from={imp.from} to={imp.to} /> : null,
      tip: `${imp ? `${hitLabel(imp.hit)} ${fmtTime(imp.hit.medianMs)}\n` : ""}${l.group.changes.map(changeLine).join("\n")}`,
    });
  }
  for (const u of f.under.filter((x) => !x.fix && x.idea)) {
    wins.push({
      key: `idea${u.hit.id}`, glyph: "unused", title: `Idea · ${u.idea!.name}`, hitId: u.hit.id,
      value: u.idea!.est !== undefined ? <Before from={u.median} to={u.idea!.est} /> : <Hp value={u.median} />,
      tip: `${firstName(u.idea!.player)} adds ${u.idea!.name} on ${hitLabel(u.hit)} ${fmtTime(u.hit.medianMs)}. Not in the plan.`,
    });
  }
  for (const t of f.timing.filter((x): x is LateFinding => x.kind === "late")) {
    wins.push({
      key: `late${t.player}${t.key}${t.hit.id}`, glyph: "late", title: `${t.name} late`, hitId: t.hit.id,
      value: <span style={{ color: FINDING_COLOR.late }}>{t.casts.length}/{t.pulls}</span>,
      tip: `${firstName(t.player)}'s ${t.name} lands just after ${hitLabel(t.hit)} ${fmtTime(t.hit.medianMs)}`,
    });
  }
  for (const u of f.unused.filter((x) => !x.situational && x.idea)) {
    wins.push({
      key: `unused${u.player}${u.key}`, glyph: "unused", title: `${u.name} unused`, hitId: u.idea!.hit.id,
      value: <span style={{ color: FINDING_COLOR.unused }}>{u.casts}/{u.possible}</span>,
      tip: `${firstName(u.player)}: ${u.casts} of ${u.possible} possible casts. Idea: ${hitLabel(u.idea!.hit)} ${fmtTime(u.idea!.hit.medianMs)}`,
    });
  }
  return wins.slice(0, 3);
}

const BADGE: CSSProperties = {
  boxSizing: "border-box", height: 48, borderRadius: 3, padding: "5px 8px", minWidth: 0, display: "grid", alignContent: "center", gap: 2,
  font: "inherit", textAlign: "left", position: "relative", overflow: "hidden",
};
const oneLine: CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 };

function Badges({ f, pending, onAnalyze, onSelect }: {
  f: AnalysisFindings; pending: boolean; onAnalyze: () => void; onSelect: (id: string) => void;
}) {
  const wins = f.analyzed ? biggestWins(f) : [];
  const empty = (i: number, body?: ReactNode) => (
    <div key={`empty${i}`} style={{ ...BADGE, border: "1px dashed var(--ck-line-2)", placeItems: "center", color: "var(--ck-text-3)", fontSize: 11.5 }}>{body}</div>
  );
  const slots: ReactNode[] = [];
  if (!f.analyzed) {
    slots.push(
      <button key="analyze" onClick={onAnalyze} disabled={pending} title="Run the optimizer over these pulls for changes to try and ideas" style={{
        ...BADGE, cursor: pending ? "progress" : "pointer", color: "var(--ck-text)",
        border: `1px solid color-mix(in srgb, ${FINDING_COLOR.plan} 55%, transparent)`,
        background: `color-mix(in srgb, ${FINDING_COLOR.plan} 12%, transparent)`,
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <FindingGlyph kind="plan" size={18} />
          <span style={{ fontWeight: 600, fontSize: 13 }}>{pending ? "Working…" : "Analyze"}</span>
        </span>
        <span style={{ ...oneLine, ...dim, fontSize: 11 }}>{pending ? "searching changes" : "find changes to try"}</span>
      </button>,
    );
  } else if (!wins.length) slots.push(empty(0, "Nothing to change"));
  for (const w of wins) {
    slots.push(
      <button key={w.key} className="ck-card ck-card--interactive" title={w.tip} onClick={() => w.hitId && onSelect(w.hitId)}
        style={{ ...BADGE, cursor: "pointer", color: "var(--ck-text)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <FindingGlyph kind={w.glyph} size={16} />
          <span className="ck-num" style={{ fontSize: 13, fontWeight: 700, ...oneLine }}>{w.value}</span>
        </span>
        <span style={{ ...oneLine, fontSize: 11.5, color: "var(--ck-text-2)" }}>{w.title}</span>
        <span style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 2, background: FINDING_COLOR[w.glyph] }} />
      </button>,
    );
  }
  while (slots.length < 3) slots.push(empty(slots.length));
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6, padding: 8 }}>{slots}</div>;
}

// ── Rows ─────────────────────────────────────────────────────────────────

function Row({ glyph, line1, line2, impact, hitId, selected, onSelect, onOpenHit, faded }: {
  glyph: ReactNode; line1: ReactNode; line2?: ReactNode; impact?: ReactNode;
  hitId?: string; selected?: boolean; onSelect?: (id: string) => void; onOpenHit?: (id: string) => void; faded?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selected]);
  return (
    <div ref={ref} onClick={() => hitId && onSelect?.(hitId)} style={{
      display: "grid", gridTemplateColumns: "22px minmax(0, 1fr) auto", columnGap: 9, alignItems: "start", padding: "7px 8px",
      borderTop: "1px solid var(--ck-line)", cursor: hitId ? "pointer" : undefined, opacity: faded ? 0.7 : 1,
      background: selected ? "rgba(83,169,255,.12)" : undefined, boxShadow: selected ? "inset 2px 0 0 var(--ck-arcane)" : undefined,
    }}>
      {glyph}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, lineHeight: 1.4, color: "var(--ck-text)", ...oneLine }}>{line1}</div>
        {line2 && <div style={{ fontSize: 11.5, lineHeight: 1.4, color: "var(--ck-text-2)", marginTop: 1 }}>{line2}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {impact && <span className="ck-num" style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap" }}>{impact}</span>}
        {hitId && onOpenHit && (
          <button title="Open in the Timeline" aria-label="Open in the Timeline" onClick={(e) => { e.stopPropagation(); onOpenHit(hitId); }} style={{
            font: "inherit", fontSize: 12, color: "var(--ck-text-3)", background: "transparent", border: 0, padding: "0 2px", cursor: "pointer",
          }}>↗</button>
        )}
      </div>
    </div>
  );
}

type RowCtx = { analyzed: boolean; selectedId: string | null; onSelect: (id: string) => void; onOpenHit: (id: string) => void; windowPulls: number };
const sel = (ctx: RowCtx, id?: string) => ({ hitId: id, selected: !!id && ctx.selectedId === id, onSelect: ctx.onSelect, onOpenHit: ctx.onOpenHit });

/** One plan change, told from the hit's side. */
function changeHere(c: OptimizedChange, hitId: string): ReactNode {
  const who = <Who player={c.player} job={c.job} />;
  if (c.kind === "add") return <>{who} adds {c.name}{c.to.id !== hitId ? <> on {hitLabel(c.to)}</> : null}</>;
  if (c.to.id === hitId) return <>{who} moves {c.name} here from {hitLabel(c.from!)} (<At ms={c.from!.medianMs} />)</>;
  if (c.from!.id === hitId) return <>{who} moves {c.name} from here to {hitLabel(c.to)} (<At ms={c.to.medianMs} />)</>;
  return <>{who} moves {c.name} from {hitLabel(c.from!)} to {hitLabel(c.to)}</>;
}

function UnderRow({ u, ctx }: { u: UnderFinding; ctx: RowCtx }) {
  const multi = u.pulls > 1;
  const line1 = <>
    <At ms={u.hit.medianMs} /> <b>{hitLabel(u.hit)}</b> · {u.failing ? "lowest" : "tight:"} <Hp value={u.median} />
    {multi && u.worst < u.median ? <>, worst <Hp value={u.worst} /> (Pull {u.worstPull})</> : null}
    {!multi && ctx.windowPulls > 1 ? <span style={dim}> (Pull {u.worstPull} only)</span> : null}
  </>;
  let line2: ReactNode;
  let impact: ReactNode = <Hp value={u.median} />;
  if (!ctx.analyzed) {
    line2 = <>{u.deathPulls ? `A death in ${u.deathPulls} of ${plural(u.pulls, "pull")} · ` : ""}On it{multi ? " every pull" : ""}: {u.steady.length ? u.steady.join(", ") : "no party cooldown"}</>;
  } else if (u.fix) {
    line2 = <><Try /> {u.fix.changes.map((c, i) => <span key={i}>{i ? "; " : ""}{changeHere(c, u.hit.id)}</span>)} <span style={dim}>· Plan {u.fix.letter}</span></>;
    impact = <Before from={u.failing ? u.median : u.worst} to={u.failing ? u.fix.after.median : u.fix.after.worst} />;
  } else if (u.idea) {
    line2 = <><Try idea /> <Who player={u.idea.player} job={u.idea.job} /> adds {u.idea.name}: free here{multi ? ` in ${u.idea.freePulls} of ${u.pulls} pulls` : ""}</>;
    if (u.idea.est !== undefined) impact = <Before from={u.median} to={u.idea.est} />;
  } else line2 = <span style={dim}>No change within {PLAN_MAX_CHANGES} fits the cooldowns, and nothing is free here.</span>;
  return <Row glyph={<FindingGlyph kind={u.failing ? "fail" : "tight"} />} line1={line1} line2={line2} impact={impact} {...sel(ctx, u.hit.id)} />;
}

function PlanRow({ l, lost, ctx }: { l: PlanLetter; lost: string[]; ctx: RowCtx }) {
  const imp = groupImpact(l);
  const fits = l.group.changes.map((c) => `${c.legal}/${c.pulls}`).join(", ");
  return (
    <Row glyph={<FindingGlyph kind="plan" />}
      line1={<><b style={{ color: FINDING_COLOR.plan }}>Plan {l.letter}</b>{l.group.purpose === "free" ? <span style={dim}> · frees cooldowns for later</span> : null}</>}
      line2={<>
        {l.group.changes.map((c, i) => (
          <div key={i}>
            <b style={{ color: "var(--ck-text)", fontWeight: 600 }}>{c.name}</b> <Who player={c.player} job={c.job} />:{" "}
            {c.kind === "add" ? <>extra use on {hitLabel(c.to)} <At ms={c.to.medianMs} /></>
              : <>{hitLabel(c.from!)} <At ms={c.from!.medianMs} /> → {hitLabel(c.to)} <At ms={c.to.medianMs} /></>}
          </div>
        ))}
        <div style={dim}>Fits the cooldowns in {fits} pulls{l.group.changes.length > 1 ? " · do them together" : ""}{lost.length ? ` · ${lost.join(" · ")}` : ""}</div>
      </>}
      impact={imp ? <Before from={imp.from} to={imp.to} /> : null} {...sel(ctx, imp?.hit.id)} />
  );
}

function UnusedRow({ u, ctx }: { u: UnusedFinding; ctx: RowCtx }) {
  const used = u.casts === 0 ? `never cast in ${plural(u.pulls, "pull")}`
    : u.pulls > 1 && u.noCastPulls.length ? `none in Pull ${u.noCastPulls.join(", ")}` : `cast ${plural(u.casts, "time")}`;
  let line2: ReactNode;
  if (u.situational) line2 = <span style={dim}>Situational ({u.situational}), never suggested</span>;
  else if (ctx.analyzed && u.inPlan) line2 = <><Try /> as in Plan {u.inPlan}</>;
  else if (ctx.analyzed && u.idea) line2 = <><Try idea /> {hitLabel(u.idea.hit)} (<At ms={u.idea.hit.medianMs} />): free there{u.idea.pulls > 1 ? ` in ${u.idea.freePulls} of ${u.idea.pulls} pulls` : ""}</>;
  else if (u.readyAt.length) line2 = <>Ready at {u.readyAt.map((h, i) => <span key={h.id}>{i ? ", " : ""}{hitLabel(h)} (<At ms={h.medianMs} />)</span>)}, unused</>;
  else line2 = <>Ready at {u.readyHits} of {u.totalHits} raidwides · {Math.round(u.cooldownMs / 1000)}s cooldown</>;
  return (
    <Row glyph={<FindingGlyph kind="unused" />} faded={!!u.situational}
      line1={<><b>{u.name}</b> <Who player={u.player} job={u.job} /> · {used}</>}
      line2={line2}
      impact={<span style={{ color: u.situational ? "var(--ck-text-3)" : FINDING_COLOR.unused }} title="Casts of possible casts">{u.casts}/{u.possible}</span>}
      {...sel(ctx, (ctx.analyzed && u.idea?.hit.id) || u.readyAt[0]?.id)} />
  );
}

function LateRow({ t, ctx }: { t: LateFinding; ctx: RowCtx }) {
  const secs = t.casts.map((c) => Math.max(1, Math.round((c.castMs - c.hitMs) / 1000)));
  const lo = Math.min(...secs), hi = Math.max(...secs);
  const ready = t.casts.filter((c) => c.readyMs <= c.hitMs);
  const down = t.casts.filter((c) => c.readyMs > c.hitMs);
  const hitAt = fmtTime(Math.min(...t.casts.map((c) => c.hitMs)));
  const facts = [
    ...ready.slice(0, 2).map((c) => `ready from ${fmtTime(c.readyMs)} in Pull ${c.pullNumber}`),
    ...down.slice(0, 2).map((c) => `Pull ${c.pullNumber}: down until ${fmtTime(c.readyMs)}`),
  ].join(" · ");
  return (
    <Row glyph={<FindingGlyph kind="late" />}
      line1={<><At ms={t.hit.medianMs} /> <b>{t.name}</b> <Who player={t.player} job={t.job} /> · {lo === hi ? `${lo}s` : `${lo}–${hi}s`} after {hitLabel(t.hit)}</>}
      line2={ctx.analyzed
        ? <><Try /> {ready.length ? <>cast it as it comes back, before {hitAt}{down.length ? "; where it was still down, bring the cast before it earlier" : ""}</>
          : <>bring the cast before it earlier so it&apos;s back by {hitAt}</>}</>
        : facts}
      impact={<span style={{ color: FINDING_COLOR.late }} title="Pulls with the late cast, of those that had the hit">{t.casts.length}/{t.pulls}</span>}
      {...sel(ctx, t.hit.id)} />
  );
}

function StackedRow({ s, ctx }: { s: StackedFinding; ctx: RowCtx }) {
  const names = s.cooldowns.map((c) => c.name);
  let line2: ReactNode = <>{names.slice(0, 4).join(", ")}{names.length > 4 ? ` +${names.length - 4}` : ""}</>;
  if (ctx.analyzed && s.planMove) {
    const c = s.planMove.change;
    line2 = <><Try /> <Who player={c.player} job={c.job} /> moves {c.name} to {hitLabel(c.to)} (<At ms={c.to.medianMs} />) <span style={dim}>· Plan {s.planMove.letter}</span></>;
  } else if (ctx.analyzed && s.alternatives.length) {
    line2 = <><Try idea /> {s.alternatives[0]} can go elsewhere; the hit stays over 30% without it</>;
  }
  return (
    <Row glyph={<FindingGlyph kind="stacked" />}
      line1={<><At ms={s.hit.medianMs} /> <b>{hitLabel(s.hit)}</b> · {plural(s.cooldowns.length, "party cooldown")}</>}
      line2={line2}
      impact={ctx.analyzed && s.planMove ? <Before from={s.median} to={s.planMove.after.median} /> : <Hp value={s.median} />}
      {...sel(ctx, s.hit.id)} />
  );
}

function OtherRow({ o, ctx }: { o: OtherFinding; ctx: RowCtx }) {
  return (
    <Row glyph={<FindingGlyph kind="other" />}
      line1={<><At ms={o.hit.medianMs} /> <b>{hitLabel(o.hit)}</b> · {o.cls === "mechanic" ? `${plural(o.deaths, "death")}, a mechanic failure` : "deaths from low health before it"}</>}
      line2={<span style={dim}>{o.cls === "mechanic" ? "Far past what mitigation covers" : "A healing or timing problem"}; check it on VOD</span>}
      impact={<span style={dim}>{o.cls}</span>} {...sel(ctx, o.hit.id)} />
  );
}

// ── Groups ───────────────────────────────────────────────────────────────

type GroupKey = "under" | "plan" | "unused" | "timing" | "other";
const GROUP: Record<GroupKey, { label: string; color: string }> = {
  under:  { label: "Under-mitigated",  color: FINDING_COLOR.fail },
  plan:   { label: "Cooldown plan",    color: FINDING_COLOR.plan },
  unused: { label: "Unused mitigation", color: FINDING_COLOR.unused },
  timing: { label: "Mistimed windows", color: FINDING_COLOR.late },
  other:  { label: "Not mitigation",   color: FINDING_COLOR.other },
};

function GroupHead({ k, count, extra, open, onToggle }: { k: GroupKey; count: number; extra?: string; open: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{
      display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 8px 5px", font: "inherit", background: "transparent",
      border: 0, borderTop: "1px solid var(--ck-line)", textAlign: "left", cursor: "pointer",
      fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--ck-text-3)",
    }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: GROUP[k].color, flex: "0 0 auto" }} />
      <span>{GROUP[k].label}{count ? ` · ${count}` : ""}</span>
      {extra && <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400, ...oneLine }}>{extra}</span>}
      <span style={{ marginLeft: "auto" }}>{open ? "▾" : "▸"}</span>
    </button>
  );
}

// ── The view ─────────────────────────────────────────────────────────────

/**
 * The Analysis's window controls, in the dialog's top bar after the pull
 * picker (user, 2026-10-14): the "Last N pulls" input (all-pulls mode;
 * blank = 5), the window and its longest pull, the ⓘ.
 */
export function AnalysisWindowControls({ window, allPulls, windowInput, onWindowInput, groupPulls }: {
  window:        FindingsWindowPull[];
  allPulls:      boolean;               // false: one pull, no window input
  windowInput:   string;
  onWindowInput: (v: string) => void;
  groupPulls:    number;                // the group's analyzable pulls (the window's ceiling)
}) {
  const nums = window.map((w) => w.pullNumber);
  const longest = window.reduce<FindingsWindowPull | undefined>((a, w) =>
    (!a || (w.durationMs ?? 0) >= (a.durationMs ?? 0) ? w : a), undefined);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 12 }}>
      {allPulls && (
        <label style={{ color: "var(--ck-text-2)", display: "inline-flex", alignItems: "center", gap: 5 }}>
          Last
          <input className="ck-field" type="number" min={PLAN_MIN_PULLS} max={groupPulls} placeholder={String(Math.min(PLAN_WINDOW_DEFAULT, groupPulls))}
            value={windowInput} onChange={(e) => onWindowInput(e.target.value)} style={{ width: 48, padding: "2px 4px" }} />
          pulls
        </label>
      )}
      {nums.length > 0 && (
        <span className="ck-num" style={dim}>
          {nums.length === 1 ? `Pull ${nums[0]}` : `Pulls ${nums[0]}–${nums[nums.length - 1]}`}
          {longest && nums.length > 1 && longest.durationMs ? ` · longest ${fmtTime(longest.durationMs)} (Pull ${longest.pullNumber})` : ""}
        </span>
      )}
      <span title={INFO} style={{ ...dim, cursor: "help" }}>ⓘ</span>
    </span>
  );
}

export function PlanView({ plan, pending, error, window, reach, onAnalyze, onOpenHit }: {
  plan:          OptimizedPlan | null;
  pending:       boolean;
  error?:        string;
  window:        FindingsWindowPull[];  // the pulls shown (and planned, on Analyze)
  reach?:        DebuffReach;
  onAnalyze:     () => void;            // runs the optimizer over `window`
  onOpenHit:     (hitId: string) => void;
}) {
  // A plan counts only for the window it was searched over.
  const matches = plan !== null && plan.windowPulls.length === window.length && plan.windowPulls.every((id, i) => window[i]?.pullId === id);
  const base = useMemo(() => buildAnalysisFindings(window, null, FFXIV_MITIGATION, reach), [window, reach]);
  const analyzed = useMemo(() => (plan && matches ? buildAnalysisFindings(window, plan, FFXIV_MITIGATION, reach) : null), [plan, matches, window, reach]);
  const f = analyzed ?? base;
  const [filter, setFilter] = useState<GroupKey | null>(null);
  const [closed, setClosed] = useState<Set<GroupKey>>(() => new Set(["other"]));
  const [allStacked, setAllStacked] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const toggle = (k: GroupKey) => setClosed((prev) => {
    const next = new Set(prev);
    if (next.has(k)) next.delete(k); else next.add(k);
    return next;
  });
  const ctx: RowCtx = {
    analyzed: f.analyzed, selectedId, onOpenHit, windowPulls: f.windowPulls.length,
    onSelect: (id) => setSelectedId((cur) => (cur === id ? null : id)),
  };

  const nums = f.windowPulls;
  const failing = f.under.filter((u) => u.failing);
  const tight = f.under.filter((u) => !u.failing);
  const unused = f.unused.filter((u) => !u.situational);
  const situational = f.unused.filter((u) => u.situational);
  const late = f.timing.filter((t): t is LateFinding => t.kind === "late");
  const stacked = f.timing.filter((t): t is StackedFinding => t.kind === "stacked");
  const changes = analyzed ? plan!.groups.reduce((s, g) => s + g.changes.length, 0) : 0;
  const lostByLetter = new Map<string, string[]>();
  for (const l of f.lanes) {
    for (const c of l.casts) {
      const letter = c.lost?.match(/plan (\w+)\)$/)?.[1];
      if (letter) lostByLetter.set(letter, [...(lostByLetter.get(letter) ?? []), `Pull ${f.clock?.pullNumber}'s ${l.name} at ${fmtTime(c.atMs)} is lost`]);
    }
  }

  const tile = (k: GroupKey, label: string, glyph: FindingGlyphKind, edge: string, value: ReactNode, title?: string) => {
    const on = filter === k;
    return (
      <button key={label} title={title} onClick={() => setFilter(on ? null : k)} style={{
        background: on ? "rgba(83,169,255,.12)" : "var(--ck-bg-card-hi)", border: `1px solid ${on ? "var(--ck-arcane-edge)" : "var(--ck-line-2)"}`,
        borderTop: `2px solid ${edge}`, borderRadius: 3, padding: "5px 10px", display: "flex", alignItems: "center", gap: 9,
        font: "inherit", color: "inherit", textAlign: "left", cursor: "pointer", minWidth: 0,
      }}>
        <FindingGlyph kind={glyph} size={22} />
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 11, ...dim, ...oneLine }}>{label}</span>
          <span className="ck-num" style={{ fontSize: 15, fontWeight: 600 }}>{value}</span>
        </span>
      </button>
    );
  };
  const arrow = (before: number, after?: number) => (after === undefined ? <>{before}</>
    : <>{before}<span style={{ ...dim, fontWeight: 400 }}> → </span><span style={{ color: FINDING_COLOR.plan }}>{after}</span></>);
  const shown = (k: GroupKey) => filter === null || filter === k;

  const tiles = (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 6 }}>
        {tile("under", "Failing hits", "fail", VERDICT_STYLE.fail.color, arrow(failing.length, analyzed ? plan!.summary.after.failing : undefined),
          failing.map((u) => u.hit.name).join(", ") || undefined)}
        {tile("under", "Tight hits", "tight", VERDICT_STYLE.under.color, arrow(tight.length, analyzed ? plan!.summary.after.tight : undefined),
          tight.map((u) => u.hit.name).join(", ") || undefined)}
        {tile("unused", "Unused cooldowns", "unused", FINDING_COLOR.unused, <span style={{ color: FINDING_COLOR.unused }}>{unused.length}</span>)}
        {tile("timing", "Mistimed windows", "late", FINDING_COLOR.late, <span style={{ color: FINDING_COLOR.late }}>{f.timing.length}</span>,
          [late.length ? `${late.length} late` : "", stacked.length ? `${stacked.length} stacked` : ""].filter(Boolean).join(", ") || undefined)}
        {tile("plan", "Plan", "plan", FINDING_COLOR.plan,
          analyzed ? <span style={{ color: FINDING_COLOR.plan }}>{plural(changes, "change")}</span> : <span style={dim}>—</span>,
          analyzed ? undefined : "Click Analyze")}
      </div>
  );

  return (
    <div style={{ height: "100%", boxSizing: "border-box", padding: "8px 12px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
      {error && <p style={{ color: VERDICT_STYLE.fail.color, fontSize: 12, margin: 0 }}>The analysis failed: {error}</p>}
      <div style={{ flex: "1 1 auto", minHeight: 0, display: "grid", gridTemplateColumns: "430px minmax(0, 1fr)", gap: 10 }}>
        <div style={{ minHeight: 0, overflowY: "auto", border: "1px solid var(--ck-line-2)", borderRadius: 3 }}>
          <Badges f={f} pending={pending} onAnalyze={onAnalyze} onSelect={(id) => setSelectedId(id)} />
          {shown("under") && f.under.length > 0 && (
            <>
              <GroupHead k="under" count={f.under.length} open={!closed.has("under")} onToggle={() => toggle("under")} />
              {!closed.has("under") && f.under.map((u) => <UnderRow key={u.hit.id} u={u} ctx={ctx} />)}
            </>
          )}
          {shown("plan") && f.letters.length > 0 && (
            <>
              <GroupHead k="plan" count={f.letters.length} open={!closed.has("plan")} onToggle={() => toggle("plan")}
                extra={`failing ${plan!.summary.before.failing} → ${plan!.summary.after.failing}, tight ${plan!.summary.before.tight} → ${plan!.summary.after.tight}`} />
              {!closed.has("plan") && f.letters.map((l) => <PlanRow key={l.letter} l={l} lost={lostByLetter.get(l.letter) ?? []} ctx={ctx} />)}
            </>
          )}
          {shown("unused") && unused.length > 0 && (
            <>
              <GroupHead k="unused" count={unused.length} open={!closed.has("unused")} onToggle={() => toggle("unused")} />
              {!closed.has("unused") && unused.map((u) => <UnusedRow key={`${u.player}|${u.key}`} u={u} ctx={ctx} />)}
            </>
          )}
          {shown("timing") && f.timing.length > 0 && (
            <>
              <GroupHead k="timing" count={f.timing.length} open={!closed.has("timing")} onToggle={() => toggle("timing")}
                extra={[late.length ? `${late.length} late` : "", stacked.length ? `${stacked.length} stacked` : ""].filter(Boolean).join(", ")} />
              {!closed.has("timing") && (
                <>
                  {late.map((t) => <LateRow key={`${t.player}|${t.key}|${t.hit.id}`} t={t} ctx={ctx} />)}
                  {(allStacked ? stacked : stacked.slice(0, STACKED_SHOWN)).map((s) => <StackedRow key={s.hit.id} s={s} ctx={ctx} />)}
                  {stacked.length > STACKED_SHOWN && (
                    <button onClick={() => setAllStacked((v) => !v)} style={{
                      display: "block", width: "100%", textAlign: "left", font: "inherit", fontSize: 12, color: "var(--ck-text-3)", background: "transparent",
                      border: 0, borderTop: "1px solid var(--ck-line)", padding: "6px 8px 6px 39px", cursor: "pointer",
                    }}>{allStacked ? "fewer ▴" : `+${stacked.length - STACKED_SHOWN} more stacked ▸`}</button>
                  )}
                </>
              )}
            </>
          )}
          {shown("other") && (f.other.length > 0 || situational.length > 0 || f.tankBusters > 0) && (
            <>
              <GroupHead k="other" count={f.other.length + situational.length} open={!closed.has("other")} onToggle={() => toggle("other")}
                extra={f.tankBusters ? `${plural(f.tankBusters, "tank buster")} on the Tanking tab` : undefined} />
              {!closed.has("other") && (
                <>
                  {f.other.map((o) => <OtherRow key={o.hit.id} o={o} ctx={ctx} />)}
                  {situational.map((u) => <UnusedRow key={`${u.player}|${u.key}`} u={u} ctx={ctx} />)}
                </>
              )}
            </>
          )}
          {!f.under.length && !unused.length && !f.timing.length && !f.letters.length && (
            <p className="ck-dialog-text" style={{ margin: 0, padding: "8px 10px", borderTop: "1px solid var(--ck-line)" }}>
              Nothing failing, tight, unused or mistimed in {plural(nums.length, "pull")}.
            </p>
          )}
        </div>
        <div style={{ minHeight: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {tiles}
          <div style={{ flex: "1 1 auto", minHeight: 0, overflow: "auto", border: "1px solid var(--ck-line-2)", borderRadius: 3, padding: "8px 12px", opacity: pending ? 0.6 : 1 }}>
            <AnalysisTimeline f={f} selectedId={selectedId} onSelect={(id) => setSelectedId(id)} />
          </div>
        </div>
      </div>
    </div>
  );
}
