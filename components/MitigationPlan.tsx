"use client";

// components/MitigationPlan.tsx
//
// The Mitigation dialog's Analysis view, laid out like the Damage dialog
// (user, 2026-10-14; it replaced the card-per-group fight clocks): the
// optimizer's OptimizedPlan (lib/mitigation/plan.ts) read as findings by
// lib/mitigation/findings.ts.
//   - Header: the "Last N pulls" input (all-pulls mode; blank = 5), one ⓘ
//     with the disclaimers, the window and the clock pull.
//   - Major findings: a stat strip (failing and tight before → after,
//     unused cooldowns, mistimed windows, plan changes) and the three
//     biggest wins.
//   - The fight timeline (components/MitigationAnalysisTimeline.tsx).
//   - Findings in categories (under-mitigated hits, cooldown plan, unused
//     mitigation, mistimed windows, not mitigation), filter chips over
//     them, each group collapsible, each row with a suggestion: "Try" for
//     the plan's changes, "Idea" for one the plan doesn't make.
// Works on one pull as well as a window (user, 2026-10-14). Clicking a
// hit's time or bar opens it in the Timeline view.

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
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
const sectionLabel: CSSProperties = {
  fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--ck-text-3)",
};
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const INFO = [
  "Estimated from the log: HP margins, damage rolls, snapshot timing and shield sizes can be off. Confirm on VOD before relying on a change.",
  `Make a plan's changes together, at most ${PLAN_MAX_CHANGES} at a time, then re-check after a few pulls: if everyone moves their own cooldowns, the next pull fails the other way.`,
  "Times are each hit's typical (median) time in these pulls; the cooldown lanes show the longest pull's casts. Lowest HP is the lowest player after the hit on a typical pull (worst pull in the tick and the tooltip).",
  "Ideas are changes the plan doesn't make: check them on the Timeline first.",
  "Tank busters are on the Tanking tab.",
].join("\n\n");

function Hp({ value }: { value: number }) {
  return <span className="ck-num" style={{ color: hpColor(value) }}>{hp(value)}</span>;
}
function Before({ from, to }: { from: number; to: number }) {
  return <><Hp value={from} /> <span style={{ ...dim, fontWeight: 400 }}>→</span> <Hp value={to} /></>;
}
function Who({ player, job }: { player: string; job: string }) {
  return <span style={{ color: jobText(job) }}>{firstName(player)}</span>;
}
const At = ({ ms }: { ms: number }) => <span className="ck-num" style={dim}>{fmtTime(ms)}</span>;
const hitLabel = (h: HitRef) => `${h.name}${h.occurrence > 1 ? ` #${h.occurrence}` : ""}`;

// ── Major findings ───────────────────────────────────────────────────────

type Tile = { label: string; value: ReactNode; sub?: string; edge: string; title?: string };

function StatStrip({ tiles }: { tiles: Tile[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(170px, 1fr))`, gap: 6, marginBottom: 8 }}>
      {tiles.map((t) => (
        <div key={t.label} title={t.title} style={{
          background: "var(--ck-bg-card-hi)", border: "1px solid var(--ck-line-2)", borderTop: `2px solid ${t.edge}`,
          borderRadius: 3, padding: "5px 9px", minWidth: 0,
        }}>
          <div style={{ ...dim, fontSize: 11 }}>{t.label}</div>
          <div className="ck-num" style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>{t.value}</div>
          {t.sub && <div style={{ ...dim, fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.sub}</div>}
        </div>
      ))}
    </div>
  );
}

type Win = { key: string; glyph: FindingGlyphKind; title: string; value: ReactNode; line: ReactNode; tip: string };

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

const changeNames = (cs: OptimizedChange[]) => [...new Set(cs.map((c) => c.name))].join(" + ");

function biggestWins(f: AnalysisFindings): Win[] {
  const wins: Win[] = [];
  for (const l of f.letters.filter((x) => x.group.purpose === "fix")) {
    const imp = groupImpact(l);
    const c = l.group.changes[0];
    wins.push({
      key: `plan${l.letter}`, glyph: "plan",
      title: `Plan ${l.letter} · ${l.group.changes.length === 1 ? `${c.name} to ${c.to.name}` : changeNames(l.group.changes)}`,
      value: imp ? <Before from={imp.from} to={imp.to} /> : null,
      line: imp ? <><At ms={imp.hit.medianMs} /> {hitLabel(imp.hit)}{l.group.changes.length > 1 ? ` · ${plural(l.group.changes.length, "change")} together` : ""}</> : null,
      tip: l.group.changes.map(changeLine).join("\n"),
    });
  }
  for (const t of f.timing.filter((x): x is LateFinding => x.kind === "late")) {
    wins.push({
      key: `late${t.player}${t.key}${t.hit.id}`, glyph: "late", title: `${t.name} lands late`,
      value: <span style={{ color: FINDING_COLOR.late }}>{t.casts.length} of {t.pulls}</span>,
      line: <><At ms={t.hit.medianMs} /> cast after {hitLabel(t.hit)}, not on it</>,
      tip: lateLine(t),
    });
  }
  for (const u of f.under.filter((x) => !x.fix && x.idea)) {
    wins.push({
      key: `idea${u.hit.id}`, glyph: "unused", title: `Idea · ${u.idea!.name} on ${hitLabel(u.hit)}`,
      value: u.idea!.est !== undefined ? <Before from={u.median} to={u.idea!.est} /> : <Hp value={u.median} />,
      line: <><At ms={u.hit.medianMs} /> {firstName(u.idea!.player)}&apos;s is free there</>, tip: "Not in the plan: check it on the Timeline.",
    });
  }
  for (const u of f.unused.filter((x) => !x.situational)) {
    wins.push({
      key: `unused${u.player}${u.key}`, glyph: "unused", title: `${u.name} sits unused`,
      value: <span style={{ color: FINDING_COLOR.unused }}>{u.casts} of {u.possible}</span>,
      line: <>{firstName(u.player)} · possible casts over {plural(u.pulls, "pull")}</>, tip: unusedLine(u),
    });
  }
  for (const s of f.timing.filter((x): x is StackedFinding => x.kind === "stacked")) {
    wins.push({
      key: `stack${s.hit.id}`, glyph: "stacked", title: `${hitLabel(s.hit)} over-mitigated`, value: <Hp value={s.median} />,
      line: <><At ms={s.hit.medianMs} /> {plural(s.cooldowns.length, "party cooldown")} on it</>, tip: s.cooldowns.map((c) => c.name).join(", "),
    });
  }
  return wins.slice(0, 3);
}

function BiggestWins({ wins }: { wins: Win[] }) {
  if (!wins.length) return null;
  const line: CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 6, marginBottom: 16 }}>
      {wins.map((w) => (
        <div key={w.key} className="ck-card" title={w.tip} style={{
          position: "relative", boxSizing: "border-box", padding: "7px 10px 9px", overflow: "hidden", display: "grid", gap: 3, minWidth: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <FindingGlyph kind={w.glyph} size={20} />
            <span style={{ ...line, flex: "1 1 auto", fontWeight: 600, fontSize: 12.5, color: "var(--ck-text)" }}>{w.title}</span>
            <span className="ck-num" style={{ fontSize: 14, fontWeight: 700, flex: "0 0 auto" }}>{w.value}</span>
          </div>
          <div style={{ ...line, fontSize: 11.5, color: "var(--ck-text-2)" }}>{w.line}</div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 2, background: FINDING_COLOR[w.glyph] }} />
        </div>
      ))}
    </div>
  );
}

// ── Finding rows ─────────────────────────────────────────────────────────

function changeLine(c: OptimizedChange): string {
  return c.kind === "add"
    ? `${c.name} (${firstName(c.player)}): extra use on ${hitLabel(c.to)} ${fmtTime(c.to.medianMs)}${c.gated ? ` (needs ${c.gated})` : ""}`
    : `${c.name} (${firstName(c.player)}): ${hitLabel(c.from!)} ${fmtTime(c.from!.medianMs)} → ${hitLabel(c.to)} ${fmtTime(c.to.medianMs)}`;
}
function lateLine(t: LateFinding): string {
  return t.casts.map((c) => `Pull ${c.pullNumber}: cast ${fmtTime(c.castMs)}, ${Math.max(1, Math.round((c.castMs - c.hitMs) / 1000))}s after the hit` +
    (c.readyMs <= c.hitMs ? `, ready from ${fmtTime(c.readyMs)}` : `, down until ${fmtTime(c.readyMs)}`)).join("\n");
}
function unusedLine(u: UnusedFinding): string {
  return `${u.name} (${firstName(u.player)}): ${u.casts} of ${u.possible} possible casts; ready at ${u.readyHits} of ${u.totalHits} raidwides`;
}

const ROW: CSSProperties = {
  display: "grid", gridTemplateColumns: "46px 24px minmax(0, 1fr) minmax(0, 360px) 130px", columnGap: 12, alignItems: "start",
  padding: "8px 4px", borderTop: "1px solid var(--ck-line)",
};
const TRY_EDGE: Record<"try" | "idea" | "note", string> = { try: FINDING_COLOR.plan, idea: FINDING_COLOR.unused, note: "var(--ck-line-2)" };

function Row({ time, onTime, glyph, main, basis, suggestion, impact, faded }: {
  time: ReactNode; onTime?: () => void; glyph: ReactNode; main: ReactNode; basis?: ReactNode;
  suggestion?: { kind: "try" | "idea" | "note"; body: ReactNode }; impact?: ReactNode; faded?: boolean;
}) {
  const s = suggestion;
  return (
    <div style={{ ...ROW, opacity: faded ? 0.7 : 1 }}>
      {onTime ? (
        <button className="ck-num" title="Open in the Timeline" onClick={onTime} style={{
          font: "inherit", fontSize: 12, color: "var(--ck-text-2)", background: "transparent", border: 0, padding: "2px 0 0", textAlign: "left", cursor: "pointer",
        }}>{time}</button>
      ) : <span className="ck-num" style={{ fontSize: 12, color: "var(--ck-text-2)", paddingTop: 2 }}>{time}</span>}
      {glyph}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--ck-text)" }}>{main}</div>
        {basis && <div style={{ fontSize: 11.5, ...dim }}>{basis}</div>}
      </div>
      <div style={{ minWidth: 0 }}>
        {s && (
          <div style={{
            fontSize: 12.5, lineHeight: 1.45, color: s.kind === "note" ? "var(--ck-text-2)" : "var(--ck-text)", borderRadius: 3, padding: "5px 9px",
            border: `1px solid ${s.kind === "note" ? TRY_EDGE.note : `color-mix(in srgb, ${TRY_EDGE[s.kind]} 35%, transparent)`}`,
            background: s.kind === "note" ? "transparent" : `color-mix(in srgb, ${TRY_EDGE[s.kind]} 8%, transparent)`,
          }}>
            {s.kind !== "note" && <b style={{ color: TRY_EDGE[s.kind] }}>{s.kind === "try" ? "Try:" : "Idea:"}</b>} {s.body}
          </div>
        )}
      </div>
      <div className="ck-num" style={{ textAlign: "right", fontSize: 13, fontWeight: 600 }}>{impact}</div>
    </div>
  );
}

const Sub = ({ children }: { children: ReactNode }) => <div style={{ fontSize: 11, fontWeight: 400, ...dim }}>{children}</div>;

/** One plan change, told from the hit's side. */
function changeHere(c: OptimizedChange, hitId: string): ReactNode {
  const who = <Who player={c.player} job={c.job} />;
  if (c.kind === "add") return <>{who} adds {c.name}{c.to.id !== hitId ? <> on {hitLabel(c.to)} (<At ms={c.to.medianMs} />)</> : null}</>;
  if (c.to.id === hitId) return <>{who} moves {c.name} here from {hitLabel(c.from!)} (<At ms={c.from!.medianMs} />)</>;
  if (c.from!.id === hitId) return <>{who} moves {c.name} from here to {hitLabel(c.to)} (<At ms={c.to.medianMs} />)</>;
  return <>{who} moves {c.name} from {hitLabel(c.from!)} to {hitLabel(c.to)}</>;
}

function UnderRow({ u, total, onOpenHit }: { u: UnderFinding; total: number; onOpenHit: (id: string) => void }) {
  const single = u.pulls === 1;
  const main = u.failing
    ? <><b>{hitLabel(u.hit)}</b> leaves the lowest player at <Hp value={u.median} />{single ? "" : " on a typical pull"}
        {!single && u.worst < u.median ? <>; <Hp value={u.worst} /> in Pull {u.worstPull}</> : null}.</>
    : <><b>{hitLabel(u.hit)}</b> is tight: <Hp value={u.median} />{single ? "" : <> typical, <Hp value={u.worst} /> in Pull {u.worstPull}</>}.</>;
  const basis = [
    total > 1 ? `Reached in ${u.pulls} of ${total} pulls` : undefined,
    u.column && u.column !== "none" ? u.column : undefined,
    u.deathPulls ? `a death in ${u.deathPulls} of ${plural(u.pulls, "pull")}` : undefined,
    `on it ${single ? "" : "every pull"}: ${u.steady.length ? u.steady.join(", ") : "no party cooldown"}`.replace("on it :", "on it:"),
  ].filter(Boolean).join(" · ");
  let suggestion: Parameters<typeof Row>[0]["suggestion"];
  let impact: ReactNode;
  if (u.fix) {
    suggestion = { kind: "try", body: <>{u.fix.changes.map((c, i) => <span key={i}>{i ? "; " : ""}{changeHere(c, u.hit.id)}</span>)}. <span style={dim}>Plan {u.fix.letter}</span></> };
    impact = <><Before from={u.median} to={u.fix.after.median} />{!single && <Sub>worst {hp(u.worst)} → {hp(u.fix.after.worst)}</Sub>}</>;
  } else if (u.idea) {
    suggestion = { kind: "idea", body: <><Who player={u.idea.player} job={u.idea.job} /> adds {u.idea.name}, free here{single ? "" : ` in ${u.idea.freePulls} of ${u.pulls} pulls`}.</> };
    impact = u.idea.est !== undefined ? <Before from={u.median} to={u.idea.est} /> : <Hp value={u.median} />;
  } else {
    suggestion = { kind: "note", body: `No change within ${PLAN_MAX_CHANGES} fits the cooldowns, and nothing is free here.` };
    impact = <Hp value={u.median} />;
  }
  return <Row time={fmtTime(u.hit.medianMs)} onTime={() => onOpenHit(u.hit.id)} glyph={<FindingGlyph kind={u.failing ? "fail" : "tight"} />}
    main={main} basis={basis} suggestion={suggestion} impact={impact} />;
}

function PlanRow({ l, lost }: { l: PlanLetter; lost: string[] }) {
  const g = l.group;
  const fits = g.changes.map((c) => `${c.legal} of ${c.pulls}`).join(", ");
  const sorted = [...g.hits].sort((a, b) => a.hit.medianMs - b.hit.medianMs);
  return (
    <Row time={<b style={{ color: FINDING_COLOR.plan }}>{l.letter}</b>} glyph={<FindingGlyph kind="plan" />}
      main={g.changes.map((c, i) => (
        <div key={i}>
          <b>{c.name}</b> <Who player={c.player} job={c.job} />:{" "}
          {c.kind === "add"
            ? <>extra use on {hitLabel(c.to)} <At ms={c.to.medianMs} />{c.gated ? <span style={dim}> (needs {c.gated})</span> : null}</>
            : <>{hitLabel(c.from!)} <At ms={c.from!.medianMs} /> → {hitLabel(c.to)} <At ms={c.to.medianMs} /></>}
        </div>
      ))}
      basis={<>Fits the cooldowns in {fits} pulls{lost.length ? ` · ${lost.join(" · ")}` : ""}</>}
      suggestion={{
        kind: "note", body: g.purpose === "free" ? "Nothing failing needs these: they free cooldowns for later mechanics."
          : g.changes.length > 1 ? "Do these on the same pull: each depends on the others." : "Make this change on its own.",
      }}
      impact={<div style={{ fontSize: 12, fontWeight: 400, color: "var(--ck-text-2)" }}>
        {sorted.map((h) => (
          <div key={h.hit.id} title={`Worst pull ${hp(h.before.worst)} → ${hp(h.after.worst)}`}>
            {h.hit.name} <Before from={h.before.median} to={h.after.median} />
          </div>
        ))}
      </div>} />
  );
}

function UnusedRow({ u, hasPlan }: { u: UnusedFinding; hasPlan: boolean }) {
  const none = u.pulls > 1 && u.noCastPulls.length > 0 && u.casts > 0
    ? `; none in Pull ${u.noCastPulls.join(", ")}` : "";
  let suggestion: Parameters<typeof Row>[0]["suggestion"];
  if (u.situational) suggestion = { kind: "note", body: <>Situational ({u.situational}), so it&apos;s never suggested.</> };
  else if (u.inPlan && hasPlan) suggestion = { kind: "try", body: <>as in Plan {u.inPlan}.</> };
  else if (u.idea) {
    suggestion = { kind: "idea", body: <>{hitLabel(u.idea.hit)} (<At ms={u.idea.hit.medianMs} />): free there{u.idea.pulls > 1 ? ` in ${u.idea.freePulls} of ${u.idea.pulls} pulls` : ""}.</> };
  } else suggestion = { kind: "note", body: "Nothing failing has it free; see where it sits ready on the timeline above." };
  return (
    <Row time="—" glyph={<FindingGlyph kind="unused" />} faded={!!u.situational}
      main={<><b>{u.name}</b> <Who player={u.player} job={u.job} />:{" "}
        {u.casts === 0 ? `never cast in ${plural(u.pulls, "pull")}` : `cast ${plural(u.casts, "time")} in ${plural(u.pulls, "pull")}${none}`}.</>}
      basis={`Ready at ${u.readyHits} of ${u.totalHits} raidwides · ${Math.round(u.cooldownMs / 1000)}s cooldown`}
      suggestion={suggestion}
      impact={<span style={{ color: u.situational ? "var(--ck-text-3)" : FINDING_COLOR.unused }}>{u.casts} of {u.possible}<Sub>possible casts</Sub></span>} />
  );
}

function LateRow({ t, onOpenHit }: { t: LateFinding; onOpenHit: (id: string) => void }) {
  const secs = t.casts.map((c) => Math.max(1, Math.round((c.castMs - c.hitMs) / 1000)));
  const lo = Math.min(...secs), hi = Math.max(...secs);
  const down = t.casts.filter((c) => c.readyMs > c.hitMs);
  const ready = t.casts.filter((c) => c.readyMs <= c.hitMs);
  const basis = [
    ...ready.slice(0, 2).map((c) => `ready from ${fmtTime(c.readyMs)} in Pull ${c.pullNumber}`),
    ...down.slice(0, 2).map((c) => `Pull ${c.pullNumber}: down until ${fmtTime(c.readyMs)}${c.prevCastMs !== undefined ? ` after the ${fmtTime(c.prevCastMs)} cast` : ""}`),
  ].join(" · ");
  const hitAt = fmtTime(Math.min(...t.casts.map((c) => c.hitMs)));
  return (
    <Row time={fmtTime(t.hit.medianMs)} onTime={() => onOpenHit(t.hit.id)} glyph={<FindingGlyph kind="late" />}
      main={<><b>{t.name}</b> <Who player={t.player} job={t.job} /> lands just after {hitLabel(t.hit)}: cast {lo === hi ? `${lo}s` : `${lo}–${hi}s`} after it
        {t.pulls > 1 ? ` in ${t.casts.length} of ${t.pulls} pulls` : ""} ({t.casts.map((c) => fmtTime(c.castMs)).join(", ")}).</>}
      basis={basis}
      suggestion={{
        kind: "try", body: ready.length
          ? <>cast it as it comes back, before {hitAt}.{down.length ? " Where it was still down, the cast before it needs to come earlier." : ""}</>
          : <>it was still down at {hitAt}: bring the cast before it earlier so it&apos;s back in time.</>,
      }}
      impact={<span style={{ color: FINDING_COLOR.late }}>{t.casts.length} of {t.pulls}<Sub>{t.pulls === 1 ? "pull" : "pulls"} late</Sub></span>} />
  );
}

function StackedRow({ s, onOpenHit }: { s: StackedFinding; onOpenHit: (id: string) => void }) {
  return (
    <Row time={fmtTime(s.hit.medianMs)} onTime={() => onOpenHit(s.hit.id)} glyph={<FindingGlyph kind="stacked" />}
      main={<><b>{hitLabel(s.hit)}</b> takes {plural(s.cooldowns.length, "party cooldown")} and leaves the lowest player at <Hp value={s.median} />:{" "}
        {s.cooldowns.map((c, i) => <span key={i}>{i ? ", " : ""}{c.name} <Who player={c.player} job={c.job} /></span>)}.</>}
      basis={[s.pulls > 1 ? `worst ${hp(s.worst)}` : undefined, s.alternatives.length ? `any one could go: ${s.alternatives.join(", ")}` : undefined]
        .filter(Boolean).join(" · ")}
      suggestion={s.planMove
        ? { kind: "try", body: <><Who player={s.planMove.change.player} job={s.planMove.change.job} /> moves {s.planMove.change.name} to {hitLabel(s.planMove.change.to)} (<At ms={s.planMove.change.to.medianMs} />). <span style={dim}>Plan {s.planMove.letter}</span></> }
        : s.alternatives.length ? { kind: "idea", body: <>{s.alternatives[0]} can go elsewhere; this hit stays over 30% without it.</> } : undefined}
      impact={s.planMove ? <><Before from={s.median} to={s.planMove.after.median} /><Sub>still {s.planMove.after.median >= 0.3 ? "over" : "good"}</Sub></> : <Hp value={s.median} />} />
  );
}

function OtherRow({ o, onOpenHit }: { o: OtherFinding; onOpenHit: (id: string) => void }) {
  return (
    <Row time={fmtTime(o.hit.medianMs)} onTime={() => onOpenHit(o.hit.id)} glyph={<FindingGlyph kind="other" />}
      main={o.cls === "mechanic"
        ? <><b>{hitLabel(o.hit)}</b>: {plural(o.deaths, "death")}, lowest <Hp value={o.median} />. Far past what mitigation covers: a mechanic failure.</>
        : <><b>{hitLabel(o.hit)}</b>: the deaths came from low health before the hit, a healing or timing problem.</>}
      basis={o.pulls > 1 ? `${plural(o.pulls, "pull")}` : undefined}
      suggestion={{ kind: "note", body: "Check it on VOD; mitigation changes are never made for it." }}
      impact={<span style={{ color: "var(--ck-text-3)" }}>{o.cls}</span>} />
  );
}

// ── Groups ───────────────────────────────────────────────────────────────

type GroupKey = "under" | "plan" | "unused" | "timing" | "other";
const GROUP: Record<GroupKey, { label: string; glyph: FindingGlyphKind; chip: string }> = {
  under:  { label: "Under-mitigated hits", glyph: "fail",    chip: "Under-mitigated" },
  plan:   { label: "Cooldown plan",        glyph: "plan",    chip: "Cooldown plan" },
  unused: { label: "Unused mitigation",    glyph: "unused",  chip: "Unused mitigation" },
  timing: { label: "Mistimed windows",     glyph: "late",    chip: "Mistimed windows" },
  other:  { label: "Not mitigation",       glyph: "other",   chip: "Not mitigation" },
};

function Group({ k, open, onToggle, summary, metric, children }: {
  k: GroupKey; open: boolean; onToggle: () => void; summary: ReactNode; metric: ReactNode; children: ReactNode;
}) {
  const g = GROUP[k];
  return (
    <div style={{ borderTop: "1px solid var(--ck-line)" }}>
      <button onClick={onToggle} style={{
        display: "flex", alignItems: "center", gap: 10, padding: "8px 0", width: "100%", font: "inherit", background: "transparent",
        border: 0, textAlign: "left", color: "inherit", cursor: "pointer", opacity: k === "other" ? 0.8 : 1,
      }}>
        <span style={{ ...dim, fontSize: 11, width: 12, flex: "0 0 auto" }}>{open ? "▾" : "▸"}</span>
        <FindingGlyph kind={g.glyph} size={24} />
        <span style={{ fontWeight: 600, fontSize: 13.5, color: "var(--ck-text)", flex: "0 0 auto" }}>{g.label}</span>
        <span style={{ ...dim, fontSize: 12, flex: "1 1 auto", minWidth: 0 }}>{summary}</span>
        <span className="ck-num" style={{ fontSize: 13, fontWeight: 700, flex: "0 0 auto", color: FINDING_COLOR[g.glyph] }}>{metric}</span>
      </button>
      {open && <div style={{ paddingLeft: 22, paddingBottom: 6 }}>{children}</div>}
    </div>
  );
}

function Findings({ f, plan, onOpenHit }: { f: AnalysisFindings; plan: OptimizedPlan; onOpenHit: (id: string) => void }) {
  const [filter, setFilter] = useState<GroupKey | null>(null);
  const [closed, setClosed] = useState<Set<GroupKey>>(() => new Set(["other"]));
  const toggle = (k: GroupKey) => setClosed((prev) => {
    const next = new Set(prev);
    if (next.has(k)) next.delete(k); else next.add(k);
    return next;
  });
  const lostByLetter = new Map<string, string[]>();
  for (const l of f.lanes) {
    for (const c of l.casts) {
      const letter = c.lost?.match(/plan (\w+)\)$/)?.[1];
      if (letter) lostByLetter.set(letter, [...(lostByLetter.get(letter) ?? []), `Pull ${f.clock?.pullNumber}'s ${l.name} at ${fmtTime(c.atMs)} is lost`]);
    }
  }
  const late = f.timing.filter((t): t is LateFinding => t.kind === "late");
  const stacked = f.timing.filter((t): t is StackedFinding => t.kind === "stacked");
  const counts: Record<GroupKey, number> = {
    under: f.under.length, plan: f.letters.length, unused: f.unused.length, timing: f.timing.length, other: f.other.length,
  };
  const keys = (Object.keys(GROUP) as GroupKey[]).filter((k) => counts[k] > 0 || (k === "other" && f.tankBusters > 0));
  const total = keys.reduce((s, k) => s + counts[k], 0);
  if (!keys.length) return <p className="ck-dialog-text" style={{ margin: "4px 0" }}>Nothing failing, tight, unused or mistimed in {plural(f.windowPulls.length, "pull")}.</p>;
  const fixed = f.under.filter((u) => u.fix).length;
  const failingN = f.under.filter((u) => u.failing).length;
  const chip = (k: GroupKey | null, label: string, n: number, color?: string) => {
    const on = filter === k;
    return (
      <button key={k ?? "all"} onClick={() => setFilter(k)} style={{
        font: "inherit", fontSize: 12, borderRadius: 12, padding: "3px 11px", display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
        color: on ? "var(--ck-text)" : "var(--ck-text-2)", background: on ? "rgba(83,169,255,.14)" : "transparent",
        border: `1px solid ${on ? "var(--ck-arcane-edge)" : "var(--ck-line-2)"}`,
      }}>
        {color && <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />}
        {label} <span className="ck-num" style={dim}>{n}</span>
      </button>
    );
  };
  const shown = (k: GroupKey) => keys.includes(k) && (filter === null || filter === k);
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "0 0 8px" }}>
        <span style={{ ...sectionLabel, marginRight: 6 }}>Findings</span>
        {chip(null, "All", total)}
        {keys.map((k) => chip(k, GROUP[k].chip, counts[k], FINDING_COLOR[GROUP[k].glyph]))}
      </div>
      <div style={{ border: "1px solid var(--ck-line-2)", borderRadius: 3, padding: "0 12px 4px" }}>
        {shown("under") && (
          <Group k="under" open={!closed.has("under")} onToggle={() => toggle("under")}
            summary={[failingN ? `${failingN} failing` : "", f.under.length - failingN ? `${f.under.length - failingN} tight` : ""].filter(Boolean).join(", ")}
            metric={fixed === f.under.length ? `all ${fixed} fixed by the plan` : `${fixed} of ${f.under.length} fixed by the plan`}>
            {f.under.map((u) => <UnderRow key={u.hit.id} u={u} total={f.windowPulls.length} onOpenHit={onOpenHit} />)}
          </Group>
        )}
        {shown("plan") && (
          <Group k="plan" open={!closed.has("plan")} onToggle={() => toggle("plan")}
            summary={`changes to make together, at most ${PLAN_MAX_CHANGES} at a time`}
            metric={`failing ${plan.summary.before.failing} → ${plan.summary.after.failing} · tight ${plan.summary.before.tight} → ${plan.summary.after.tight}`}>
            {f.letters.map((l) => <PlanRow key={l.letter} l={l} lost={lostByLetter.get(l.letter) ?? []} />)}
          </Group>
        )}
        {shown("unused") && (
          <Group k="unused" open={!closed.has("unused")} onToggle={() => toggle("unused")}
            summary="party cooldowns cast under half as often as they could be" metric={plural(f.unused.length, "cooldown")}>
            {f.unused.map((u) => <UnusedRow key={`${u.player}|${u.key}`} u={u} hasPlan={f.letters.length > 0} />)}
          </Group>
        )}
        {shown("timing") && (
          <Group k="timing" open={!closed.has("timing")} onToggle={() => toggle("timing")}
            summary="cast just after the hit, or stacked where it isn't needed"
            metric={[late.length ? `${late.length} late` : "", stacked.length ? `${stacked.length} stacked` : ""].filter(Boolean).join(", ")}>
            {late.map((t) => <LateRow key={`${t.player}|${t.key}|${t.hit.id}`} t={t} onOpenHit={onOpenHit} />)}
            {stacked.map((s) => <StackedRow key={s.hit.id} s={s} onOpenHit={onOpenHit} />)}
          </Group>
        )}
        {shown("other") && (
          <Group k="other" open={!closed.has("other")} onToggle={() => toggle("other")}
            summary={[f.other.length ? "healing and mechanic failures" : "", f.tankBusters ? `${plural(f.tankBusters, "tank buster")} on the Tanking tab` : ""].filter(Boolean).join(" · ")}
            metric={f.other.length || ""}>
            {f.other.map((o) => <OtherRow key={o.hit.id} o={o} onOpenHit={onOpenHit} />)}
          </Group>
        )}
      </div>
    </>
  );
}

// ── The view ─────────────────────────────────────────────────────────────

export function PlanView({ plan, pending, error, window, reach, allPulls, windowInput, onWindowInput, groupPulls, onOpenHit }: {
  plan:          OptimizedPlan | null;
  pending:       boolean;
  error?:        string;
  window:        FindingsWindowPull[];  // the pulls the plan was searched over
  reach?:        DebuffReach;
  allPulls:      boolean;               // false: one pull, no window input
  windowInput:   string;
  onWindowInput: (v: string) => void;
  groupPulls:    number;                // the group's analyzable pulls (the window's ceiling)
  onOpenHit:     (hitId: string) => void;
}) {
  // The plan answers an earlier window while a new one is pending; findings
  // are built only for the window it was searched over.
  const matches = plan !== null && plan.windowPulls.length === window.length && plan.windowPulls.every((id, i) => window[i]?.pullId === id);
  const f = useMemo(() => (plan && matches ? buildAnalysisFindings(window, plan, FFXIV_MITIGATION, reach) : null), [plan, matches, window, reach]);
  const nums = f?.windowPulls ?? window.map((w) => w.pullNumber);
  const windowLabel = nums.length === 1 ? `Pull ${nums[0]}` : `Pulls ${nums[0]}–${nums[nums.length - 1]}`;
  const late = f?.timing.filter((t) => t.kind === "late").length ?? 0;
  const changes = plan?.groups.reduce((s, g) => s + g.changes.length, 0) ?? 0;
  const worstUnused = f?.unused.find((u) => !u.situational);
  return (
    <div style={{ padding: "8px 12px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        {allPulls && (
          <label style={{ fontSize: 12, color: "var(--ck-text-2)", display: "inline-flex", alignItems: "center", gap: 5 }}>
            Last
            <input className="ck-field" type="number" min={PLAN_MIN_PULLS} max={groupPulls} placeholder={String(Math.min(PLAN_WINDOW_DEFAULT, groupPulls))}
              value={windowInput} onChange={(e) => onWindowInput(e.target.value)} style={{ width: 48, padding: "2px 4px" }} />
            pulls
          </label>
        )}
        <span className="ck-num" style={{ ...dim, fontSize: 12 }}>
          {windowLabel}{f?.clock && nums.length > 1 ? ` · longest ${fmtTime(f.clock.durationMs)} (Pull ${f.clock.pullNumber})` : ""}
        </span>
        <span title={INFO} style={{ ...dim, cursor: "help" }}>ⓘ</span>
        {pending && <span style={{ ...dim, fontSize: 12 }}>Working…</span>}
      </div>
      {error && <p style={{ color: VERDICT_STYLE.fail.color, fontSize: 12 }}>The analysis failed: {error}</p>}
      {plan && f && (
        <div style={{ opacity: pending ? 0.5 : 1 }}>
          <div style={{ ...sectionLabel, margin: "0 0 6px" }}>Major findings</div>
          <StatStrip tiles={[
            { label: "Failing hits", edge: VERDICT_STYLE.fail.color, sub: f.under.filter((u) => u.failing).map((u) => u.hit.name).join(", ") || "none",
              value: <>{plan.summary.before.failing} <span style={dim}>→</span> <span style={{ color: FINDING_COLOR.plan }}>{plan.summary.after.failing}</span></>,
              title: "Planned hits failing on the median, now → with the plan" },
            { label: "Tight hits", edge: VERDICT_STYLE.under.color, sub: f.under.filter((u) => !u.failing).map((u) => u.hit.name).join(", ") || "none",
              value: <>{plan.summary.before.tight} <span style={dim}>→</span> <span style={{ color: FINDING_COLOR.plan }}>{plan.summary.after.tight}</span></>,
              title: "Good on the median, under 15% on the worst pull, now → with the plan" },
            { label: "Unused cooldowns", edge: FINDING_COLOR.unused, value: <span style={{ color: FINDING_COLOR.unused }}>{f.unused.length}</span>,
              sub: worstUnused ? `${worstUnused.name} ${worstUnused.casts} of ${worstUnused.possible} possible casts` : undefined },
            { label: "Mistimed windows", edge: FINDING_COLOR.late, value: <span style={{ color: FINDING_COLOR.late }}>{f.timing.length}</span>,
              sub: f.timing.length ? [late ? `${late} late` : "", f.timing.length - late ? `${f.timing.length - late} stacked` : ""].filter(Boolean).join(", ") : undefined },
            { label: "Plan", edge: FINDING_COLOR.plan, value: <span style={{ color: FINDING_COLOR.plan }}>{plural(changes, "change")}</span>,
              sub: f.letters.length ? `in ${plural(f.letters.length, "group")} (${f.letters.map((l) => l.letter).join(", ")})` : "nothing to change" },
          ]} />
          <BiggestWins wins={biggestWins(f)} />
          <div style={{ ...sectionLabel, margin: "0 0 6px", display: "flex", gap: 14, alignItems: "baseline", flexWrap: "wrap" }}>
            <span>Fight timeline</span>
            <Legend />
          </div>
          <div style={{ marginBottom: 16 }}><AnalysisTimeline f={f} onOpenHit={onOpenHit} /></div>
          <Findings f={f} plan={plan} onOpenHit={onOpenHit} />
        </div>
      )}
    </div>
  );
}

function Legend() {
  const item: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5 };
  return (
    <span style={{ fontSize: 11, color: "var(--ck-text-3)", textTransform: "none", letterSpacing: 0, fontWeight: 400, display: "inline-flex", gap: 14, flexWrap: "wrap" }}>
      <span style={item}><span style={{ width: 14, height: 8, borderRadius: 2, background: "#80a0f0" }} /> cast</span>
      <span style={item}><span style={{ width: 18, height: 6, background: "repeating-linear-gradient(135deg, rgba(79,209,197,.6) 0 3px, transparent 3px 6px)" }} /> ready, not used</span>
      <span style={item}><span style={{ width: 8, height: 8, border: "2px solid #8b8f98", borderRadius: "50%" }} /><span style={{ color: FINDING_COLOR.plan }}>→ ●</span> plan: move</span>
      <span style={{ ...item, color: FINDING_COLOR.plan }}>⊕ plan: extra use</span>
      <span style={item}><span style={{ width: 8, height: 8, border: `2px dashed ${FINDING_COLOR.unused}`, borderRadius: "50%" }} /> idea, not in the plan</span>
      <span style={item}><span style={{ width: 12, height: 8, borderRadius: 2, outline: `2px solid ${FINDING_COLOR.late}`, outlineOffset: 1 }} /> late cast</span>
    </span>
  );
}
