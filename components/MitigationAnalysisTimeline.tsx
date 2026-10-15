"use client";

// components/MitigationAnalysisTimeline.tsx
//
// The Mitigation Analysis view's fight timeline (lib/mitigation/findings.ts),
// on the clock pull's length, kept quiet (user, 2026-10-14): no text on the
// plot. Numbers and names are in tooltips, the legend behind a hover.
//   - the lowest player's HP after each non-tank raidwide: a bar for the
//     typical (median) pull, a tick for the worst on under-mitigated hits,
//     dashed lines at MARGIN_UNDER and MARGIN_OVER; mechanic and healing
//     failures hatched; a finding's glyph on its bar
//   - how many window pulls got that far, and the selected hit's name
//   - lanes for the cooldowns the findings name (all on request), each
//     labelled with its job and skill icon: the clock pull's casts (late
//     ones outlined, ones a plan move loses dashed), a thin line while it
//     sat free, a dotted yellow one while it was held for the next cast
//     (user, 2026-10-14), a dot where it sat ready at an under-mitigated
//     hit; the plan's targets as the skill's icon in a green ring (a move
//     from a hollow "now" ring), ideas in a dashed ring
// The selected hit (a finding row or a bar) is a band down the chart and
// lanes. Positions are percentages of the clock, so the plot stretches.

import { useState, type CSSProperties } from "react";
import type { AnalysisFindings, Lane, LaneMark, TimelineHit } from "@/lib/mitigation/findings";
import { MARGIN_OVER, MARGIN_UNDER } from "@/lib/mitigation/analyze";
import { getClassColor } from "@/lib/player-display";
import { InfoTip } from "./ui/InfoTip";
import { FINDING_COLOR, FindingGlyph, JobIcon, SkillIcon } from "./ui/MitigationGlyphs";
import { VERDICT_STYLE, fmtTime } from "./MitigationTimeline";

const LABEL_W = 150;
const CHART_H = 120;     // px for SCALE_MAX of health
const SCALE_MAX = 0.9;
const LANE_H = 28;
const MOVE = FINDING_COLOR.plan;
const IDEA = FINDING_COLOR.unused;
const LATE = FINDING_COLOR.late;
const NOW = "#8b8f98";
const IDLE = "rgba(79,209,197,.45)";
const HELD = "#e3c34a";
const MUTED_HATCH = "repeating-linear-gradient(135deg, rgba(157,161,168,.5) 0 3px, transparent 3px 7px)";
const SELECT_BG = "rgba(83,169,255,.14)";

const TONE_COLOR: Record<TimelineHit["tone"], string> = {
  fail: VERDICT_STYLE.fail.color, tight: VERDICT_STYLE.under.color, good: VERDICT_STYLE.good.color,
  over: VERDICT_STYLE.over.color, other: "#9da1a8",
};
const hpText = (x: number) => (x < 0 ? "dead" : `${Math.round(x * 100)}%`);

const band: CSSProperties = { display: "grid", gridTemplateColumns: `${LABEL_W}px minmax(0, 1fr)`, columnGap: 10 };
const side: CSSProperties = { fontSize: 11, color: "var(--ck-text-3)", lineHeight: 1.35 };
const abs = (leftPct: number, extra?: CSSProperties): CSSProperties => ({ position: "absolute", left: `${leftPct}%`, ...extra });

function hitTip(h: TimelineHit): string {
  return `${h.name} ${fmtTime(h.medianMs)}: lowest ${hpText(h.median)}${h.pulls > 1 ? ` typical, ${hpText(h.worst)} worst` : ""}` +
    `${h.deaths ? `, ${h.deaths} death${h.deaths === 1 ? "" : "s"}` : ""} · ${h.pulls} pull${h.pulls === 1 ? "" : "s"}`;
}

export default function AnalysisTimeline({ f, selectedId, onSelect }: {
  f: AnalysisFindings; selectedId: string | null; onSelect: (hitId: string) => void;
}) {
  const [allLanes, setAllLanes] = useState(false);
  const endMs = Math.max(f.clock?.durationMs ?? 0, ...f.hits.map((h) => h.medianMs + 5_000));
  if (endMs <= 0) return null;
  const pct = (ms: number) => Math.max(0, Math.min(100, (ms / endMs) * 100));
  const raid = f.hits.filter((h) => !h.tank);
  const flagged = raid.filter((h) => h.tone === "fail" || h.tone === "tight");
  const y = (m: number) => Math.max(0, Math.min(1, m / SCALE_MAX)) * CHART_H;
  const ticks: number[] = [];
  const step = endMs > 10 * 60_000 ? 120_000 : endMs > 4 * 60_000 ? 60_000 : 30_000;
  for (let t = 0; t < endMs; t += step) ticks.push(t);
  const selected = f.hits.find((h) => h.id === selectedId);
  const selectBand = selected && (
    <div style={{ position: "absolute", left: `calc(${pct(selected.medianMs)}% - 12px)`, width: 24, top: 0, bottom: 0, background: SELECT_BG }} />
  );
  const inFindings = f.lanes.filter((l) => l.inFindings);
  const shownLanes = allLanes ? f.lanes : inFindings;
  const selPct = selected ? pct(selected.medianMs) : 0;

  return (
    <div style={{ minWidth: 640 }}>
      {/* lowest HP, pins on the bars */}
      <div style={band}>
        <div style={{ ...side, paddingTop: CHART_H / 2 }}>Lowest player HP</div>
        <div style={{ position: "relative", height: CHART_H + 20, borderBottom: "1px solid rgba(255,255,255,.18)" }}>
          {selectBand}
          {[{ m: MARGIN_OVER, c: VERDICT_STYLE.good.color }, { m: MARGIN_UNDER, c: VERDICT_STYLE.under.color }].map(({ m, c }) => (
            <div key={m} title={`${Math.round(m * 100)}% lowest HP`} style={{
              position: "absolute", left: 0, right: 0, bottom: y(m), borderTop: `1px dashed color-mix(in srgb, ${c} 40%, transparent)`,
            }} />
          ))}
          {raid.map((h) => {
            const color = TONE_COLOR[h.tone];
            const other = h.tone === "other";
            const loud = h.tone === "fail" || h.tone === "tight";
            const height = other ? CHART_H : Math.max(2, y(h.median));
            const tip = hitTip(h);
            return (
              <button key={h.id} title={tip} aria-label={tip} onClick={() => onSelect(h.id)} style={{
                position: "absolute", left: `${pct(h.medianMs)}%`, bottom: 0, height: CHART_H + 20, width: 12, marginLeft: -6,
                padding: 0, border: 0, background: "transparent", cursor: "pointer",
              }}>
                <span style={{
                  position: "absolute", left: 2, bottom: 0, width: 8, height, borderRadius: "2px 2px 0 0",
                  background: other ? MUTED_HATCH : color, opacity: loud || other ? 1 : 0.5,
                }} />
                {loud && h.pulls > 1 && h.worst < h.median && (
                  <span style={{ position: "absolute", left: 0, width: 12, height: 2, bottom: y(h.worst), background: h.worst < 0 ? VERDICT_STYLE.fail.color : "var(--ck-text)" }} />
                )}
                {h.pins.length > 0 && (
                  <span style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: Math.min(height, CHART_H) + 3, display: "flex", gap: 1 }}>
                    {h.pins.map((p) => <FindingGlyph key={p} kind={p} size={16} />)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* pulls reaching; the selected hit's name */}
      <div style={band}>
        <div style={{ ...side, height: 22, display: "flex", alignItems: "center" }}>{f.windowPulls.length > 1 ? "Pulls reaching" : ""}</div>
        <div style={{ position: "relative", height: 22 }}>
          {f.windowPulls.length > 1 && f.reachSteps.map((s, i) => {
            const from = i ? f.reachSteps[i - 1].untilMs : 0;
            const tip = `${s.pulls} of ${f.windowPulls.length} pulls reached ${fmtTime(from)}–${fmtTime(s.untilMs)}`;
            return (
              <div key={i} className="ck-num" title={tip} style={abs(pct(from), {
                width: `${pct(s.untilMs) - pct(from)}%`, top: 5, height: 12, fontSize: 10, lineHeight: "12px", paddingLeft: 4,
                boxSizing: "border-box", overflow: "hidden", whiteSpace: "nowrap", color: "var(--ck-text-2)",
                background: `rgba(83,169,255,${(0.08 + 0.26 * s.pulls / f.windowPulls.length).toFixed(2)})`,
              })}>{s.pulls}</div>
            );
          })}
          {selected && (
            <span className="ck-num" style={abs(selPct, {
              top: 2, transform: selPct > 80 ? "translateX(-100%)" : selPct < 20 ? undefined : "translateX(-50%)",
              fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap", padding: "0 5px", borderRadius: 3,
              background: "var(--ck-bg-panel)", border: "1px solid var(--ck-arcane-edge)", color: TONE_COLOR[selected.tone],
            })}>
              {selected.name} <span style={{ fontWeight: 400, color: "var(--ck-text-2)" }}>{fmtTime(selected.medianMs)} · {hpText(selected.median)}
                {selected.pulls > 1 && selected.worst < selected.median ? `, worst ${hpText(selected.worst)}` : ""}</span>
            </span>
          )}
        </div>
      </div>

      {/* cooldown lanes */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "8px 0 2px", fontSize: 11, color: "var(--ck-text-3)" }}>
        <span style={{ fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" }}>
          {allLanes ? "Party cooldowns" : "Cooldowns in these findings"}
        </span>
        {f.lanes.length > inFindings.length && (
          <button onClick={() => setAllLanes((v) => !v)} style={{
            font: "inherit", fontSize: 11, color: "var(--ck-arcane-text)", background: "transparent", border: 0, padding: 0, cursor: "pointer",
          }}>{allLanes ? "fewer ▴" : `${inFindings.length} of ${f.lanes.length} · show all ▾`}</button>
        )}
        <span style={{ marginLeft: "auto" }}>
          <InfoTip label="Timeline legend" maxWidth={320} content={<Legend analyzed={f.analyzed} clockPull={f.clock?.pullNumber} />}
            trigger={<span className="ck-badge" style={{ fontSize: 10.5, cursor: "help" }}>Legend</span>} />
        </span>
      </div>
      {shownLanes.length > 0 ? (
        <div style={band}>
          <div>
            {shownLanes.map((l) => (
              <div key={`${l.player}|${l.key}`} title={`${l.name} · ${l.player}`} style={{
                height: LANE_H, display: "flex", alignItems: "center", gap: 5, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden",
                borderTop: "1px solid rgba(255,255,255,.05)", color: "var(--ck-text)",
              }}>
                <JobIcon job={l.job} player={l.player} size={20} />
                <SkillIcon entryKey={l.key} name={l.name} size={20} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{l.name}</span>
              </div>
            ))}
          </div>
          <div style={{ position: "relative" }}>
            {selectBand}
            {flagged.map((h) => (
              <div key={h.id} title={hitTip(h)} style={abs(pct(h.medianMs), {
                top: 0, bottom: 0, width: 0,
                borderLeft: `1px dashed ${h.tone === "fail" ? "rgba(239,68,68,.45)" : "rgba(245,158,11,.35)"}`,
              })} />
            ))}
            {shownLanes.map((l) => <LaneRow key={`${l.player}|${l.key}`} lane={l} pct={pct} />)}
          </div>
        </div>
      ) : <p className="ck-help" style={{ margin: "2px 0 4px" }}>No cooldown is named in these findings.</p>}

      {/* time axis */}
      <div style={{ ...band, marginTop: 2 }}>
        <div />
        <div className="ck-num" style={{ position: "relative", height: 18, borderTop: "1px solid rgba(255,255,255,.18)", fontSize: 10.5, color: "var(--ck-text-3)" }}>
          {ticks.map((t) => (
            <span key={t} style={abs(pct(t), { top: 3, transform: t ? "translateX(-50%)" : undefined })}>{fmtTime(t)}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Legend({ analyzed, clockPull }: { analyzed: boolean; clockPull?: number }) {
  const item: CSSProperties = { display: "flex", alignItems: "center", gap: 8, fontSize: 12, lineHeight: 1.7 };
  const key: CSSProperties = { width: 26, display: "inline-flex", justifyContent: "center", flex: "0 0 auto" };
  return (
    <div>
      <div style={item}><span style={key}><span style={{ width: 8, height: 12, background: VERDICT_STYLE.over.color, opacity: 0.6 }} /></span>Lowest player HP, typical pull</div>
      <div style={item}><span style={key}><span style={{ width: 12, height: 2, background: "var(--ck-text)" }} /></span>Worst pull</div>
      <div style={item}><span style={key}><span style={{ width: 18, height: 8, borderRadius: 2, background: "#80a0f0" }} /></span>Cast{clockPull !== undefined ? ` (Pull ${clockPull})` : ""}</div>
      <div style={item}><span style={key}><span style={{ width: 20, height: 2, background: IDLE }} /></span>Free: a cast here delays nothing</div>
      <div style={item}><span style={key}><span style={{ width: 20, borderTop: `2px dotted ${HELD}` }} /></span>Held for the next cast</div>
      <div style={item}><span style={key}><span style={{ width: 8, height: 8, borderRadius: "50%", background: IDEA }} /></span>Ready at a flagged hit, unused</div>
      <div style={item}><span style={key}><span style={{ width: 14, height: 8, borderRadius: 2, outline: `2px solid ${LATE}`, outlineOffset: 1 }} /></span>Cast just after a hit</div>
      {analyzed && <>
        <div style={item}><span style={key}><span style={{ width: 10, height: 10, borderRadius: "50%", border: `2px solid ${NOW}` }} /></span>Plan: where it is used now</div>
        <div style={item}><span style={key}><span style={{ width: 14, height: 14, borderRadius: 4, boxShadow: `0 0 0 2px ${MOVE}` }} /></span>Plan: use it here</div>
        <div style={item}><span style={key}><span style={{ width: 14, height: 14, borderRadius: 4, outline: `2px dashed ${IDEA}`, outlineOffset: 1 }} /></span>Idea, not in the plan</div>
      </>}
    </div>
  );
}

function Target({ lane, m }: { lane: Lane; m: Exclude<LaneMark, { kind: "move" }> | { kind: "move"; toMs: number; letter: string } }) {
  const idea = m.kind === "idea";
  return (
    <span style={{
      position: "absolute", top: 4, marginLeft: -10, display: "inline-flex", borderRadius: 4,
      ...(idea ? { outline: `2px dashed ${IDEA}`, outlineOffset: 1 } : { boxShadow: `0 0 0 2px ${MOVE}` }),
    }}>
      <SkillIcon entryKey={lane.key} name={lane.name} size={20} />
    </span>
  );
}

function LaneRow({ lane, pct }: { lane: Lane; pct: (ms: number) => number }) {
  const color = getClassColor("ffxiv", lane.job);
  return (
    <div style={{ position: "relative", height: LANE_H, borderTop: "1px solid rgba(255,255,255,.05)" }}>
      {lane.free.map(([a, b]) => (
        <div key={`f${a}`} title={`Free ${fmtTime(a)}–${fmtTime(b)}: a cast here delays nothing`} style={{
          position: "absolute", left: `${pct(a)}%`, width: `${pct(b) - pct(a)}%`, top: 13, height: 2, borderRadius: 1, background: IDLE,
        }} />
      ))}
      {lane.held.map(([a, b]) => (
        <div key={`h${a}`} title={`Held ${fmtTime(a)}–${fmtTime(b)} for the ${fmtTime(b)} cast: a cast here pushes that one back`} style={{
          position: "absolute", left: `${pct(a)}%`, width: `${pct(b) - pct(a)}%`, top: 13, height: 0, borderTop: `2px dotted ${HELD}`,
        }} />
      ))}
      {lane.casts.map((c) => (
        <div key={c.atMs} title={`${lane.name} ${fmtTime(c.atMs)}${c.late ? ` · ${c.late}` : ""}${c.lost ? ` · ${c.lost}` : ""}`} style={{
          position: "absolute", left: `${pct(c.atMs)}%`, width: `max(4px, ${pct(c.atMs + c.durationMs) - pct(c.atMs)}%)`, top: 9, height: 10,
          borderRadius: 2, boxSizing: "border-box",
          background: c.lost ? "transparent" : color, opacity: c.lost ? 1 : 0.85,
          border: c.lost ? `1px dashed ${color}` : undefined,
          outline: c.late ? `2px solid ${LATE}` : undefined, outlineOffset: 1,
        }} />
      ))}
      {lane.readyDots.map((d) => (
        <span key={`dot${d.atMs}`} title={`Ready at ${d.hit} (${fmtTime(d.atMs)}), not used`} style={{
          position: "absolute", left: `${pct(d.atMs)}%`, top: 10, width: 8, height: 8, marginLeft: -4, borderRadius: "50%",
          background: IDEA, boxShadow: "0 0 0 2px var(--ck-bg-panel)",
        }} />
      ))}
      {lane.marks.map((m, i) => {
        if (m.kind === "move") {
          const a = pct(m.fromMs), b = pct(m.toMs);
          const left = Math.min(a, b), right = Math.max(a, b);
          return (
            <span key={i} title={`Plan ${m.letter}: move ${lane.name} from ${fmtTime(m.fromMs)} to ${fmtTime(m.toMs)}`}>
              <span style={{
                position: "absolute", top: 13, height: 2, background: MOVE,
                left: `calc(${left}% + 8px)`, width: `max(0px, calc(${right - left}% - 20px))`,
              }} />
              <span style={{ position: "absolute", left: `${a}%`, top: 8, width: 10, height: 10, marginLeft: -7, border: `2px solid ${NOW}`, borderRadius: "50%", background: "var(--ck-bg-panel)" }} />
              <span style={abs(b, { top: 0 })}><Target lane={lane} m={m} /></span>
            </span>
          );
        }
        return (
          <span key={i} title={m.kind === "add" ? `Plan ${m.letter}: extra ${lane.name} at ${fmtTime(m.atMs)}` : `Idea, not in the plan: ${lane.name} on ${m.label}`}
            style={abs(pct(m.atMs), { top: 0 })}>
            <Target lane={lane} m={m} />
          </span>
        );
      })}
    </div>
  );
}
