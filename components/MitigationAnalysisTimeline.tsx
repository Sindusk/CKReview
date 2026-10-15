"use client";

// components/MitigationAnalysisTimeline.tsx
//
// The Mitigation Analysis view's fight timeline (lib/mitigation/findings.ts),
// on the clock pull's length, kept quiet (user, 2026-10-14: the first cut
// labelled every hit and hatched every idle stretch):
//   - the lowest player's HP after each non-tank raidwide: a bar for the
//     typical (median) pull, a tick for the worst, dashed lines at
//     MARGIN_UNDER and MARGIN_OVER; mechanic and healing failures hatched.
//     A finding's glyph sits on its bar; only under-mitigated hits carry
//     a label and a name. Everything else is in each bar's tooltip.
//   - how many window pulls got that far, with those hits' names on it
//   - lanes for the cooldowns the findings name, all on request: the
//     clock pull's casts (late ones outlined, ones a plan move loses
//     dashed), a thin line while it sat free, a dotted yellow one while it
//     was held for the next cast (user, 2026-10-14), a dot where it sat ready
//     at an under-mitigated hit, the plan's moves and extra uses, ideas
// The selected hit (a finding row or a bar) is a band down the chart and
// lanes. Positions are percentages of the clock, so the plot stretches.

import { useState, type CSSProperties } from "react";
import type { AnalysisFindings, Lane, TimelineHit } from "@/lib/mitigation/findings";
import { MARGIN_OVER, MARGIN_UNDER } from "@/lib/mitigation/analyze";
import { getClassColor } from "@/lib/player-display";
import { readableText } from "./ui/DamageGlyphs";
import { FINDING_COLOR, FindingGlyph } from "./ui/MitigationGlyphs";
import { VERDICT_STYLE, fmtTime } from "./MitigationTimeline";

const LABEL_W = 150;
const CHART_H = 120;     // px for SCALE_MAX of health
const SCALE_MAX = 0.9;
const LANE_H = 26;
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
const firstName = (player: string) => player.split(" ")[0];
export const jobText = (job: string) => readableText(getClassColor("ffxiv", job));

const band: CSSProperties = { display: "grid", gridTemplateColumns: `${LABEL_W}px minmax(0, 1fr)`, columnGap: 10 };
const side: CSSProperties = { fontSize: 11, color: "var(--ck-text-3)", lineHeight: 1.35 };
const abs = (leftPct: number, extra?: CSSProperties): CSSProperties => ({ position: "absolute", left: `${leftPct}%`, ...extra });

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
  const selected = raid.find((h) => h.id === selectedId) ?? f.hits.find((h) => h.id === selectedId);
  const selectBand = selected && (
    <div style={{ position: "absolute", left: `calc(${pct(selected.medianMs)}% - 12px)`, width: 24, top: 0, bottom: 0, background: SELECT_BG }} />
  );
  const shownLanes = allLanes ? f.lanes : f.lanes.filter((l) => l.inFindings);
  const hidden = f.lanes.length - f.lanes.filter((l) => l.inFindings).length;

  return (
    <div style={{ minWidth: 640 }}>
      <Legend analyzed={f.analyzed} clockPull={f.clock?.pullNumber} />

      {/* lowest HP, pins on the bars */}
      <div style={band}>
        <div style={{ ...side, paddingTop: CHART_H / 2 }}>Lowest player HP</div>
        <div style={{ position: "relative", height: CHART_H + 22, borderBottom: "1px solid rgba(255,255,255,.18)" }}>
          {selectBand}
          {[{ m: MARGIN_OVER, c: VERDICT_STYLE.good.color }, { m: MARGIN_UNDER, c: VERDICT_STYLE.under.color }].map(({ m, c }) => (
            <div key={m}>
              <div style={{ position: "absolute", left: 0, right: 0, bottom: y(m), borderTop: `1px dashed color-mix(in srgb, ${c} 40%, transparent)` }} />
              <span style={{ position: "absolute", right: 0, bottom: y(m) + 2, fontSize: 10, color: c, opacity: 0.8 }}>{Math.round(m * 100)}%</span>
            </div>
          ))}
          {raid.map((h) => {
            const color = TONE_COLOR[h.tone];
            const other = h.tone === "other";
            const loud = h.tone === "fail" || h.tone === "tight";
            const height = other ? CHART_H : Math.max(2, y(h.median));
            const tip = `${h.name} ${fmtTime(h.medianMs)}: lowest ${hpText(h.median)}${h.pulls > 1 ? ` typical, ${hpText(h.worst)} worst` : ""}` +
              `${h.deaths ? `, ${h.deaths} death${h.deaths === 1 ? "" : "s"}` : ""} · ${h.pulls} pull${h.pulls === 1 ? "" : "s"}`;
            return (
              <button key={h.id} title={tip} aria-label={tip} onClick={() => onSelect(h.id)} style={{
                position: "absolute", left: `${pct(h.medianMs)}%`, bottom: 0, height: CHART_H + 22, width: 12, marginLeft: -6,
                padding: 0, border: 0, background: "transparent", cursor: "pointer",
              }}>
                <span style={{
                  position: "absolute", left: 2, bottom: 0, width: 8, height, borderRadius: "2px 2px 0 0",
                  background: other ? MUTED_HATCH : color, opacity: loud || other ? 1 : 0.55,
                }} />
                {loud && h.pulls > 1 && h.worst < h.median && (
                  <span style={{ position: "absolute", left: 0, width: 12, height: 2, bottom: y(h.worst), background: h.worst < 0 ? VERDICT_STYLE.fail.color : "var(--ck-text)" }} />
                )}
                {h.pins.length > 0 && (
                  <span style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: Math.min(height, CHART_H) + (loud ? 18 : 3), display: "flex", gap: 1 }}>
                    {h.pins.map((p) => <FindingGlyph key={p} kind={p} size={16} />)}
                  </span>
                )}
                {loud && (
                  <span className="ck-num" style={{
                    position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: Math.min(height, CHART_H) + 3,
                    fontSize: 11, whiteSpace: "nowrap", color: h.tone === "fail" ? FINDING_COLOR.fail : color,
                  }}>{hpText(h.median)}{h.pulls > 1 && h.worst < h.median ? ` · worst ${hpText(h.worst)}` : ""}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* pulls reaching, with the under-mitigated hits' names */}
      <div style={band}>
        <div style={{ ...side, height: 22, display: "flex", alignItems: "center" }}>{f.windowPulls.length > 1 ? "Pulls reaching" : ""}</div>
        <div style={{ position: "relative", height: 22 }}>
          {f.windowPulls.length > 1 && f.reachSteps.map((s, i) => {
            const from = i ? f.reachSteps[i - 1].untilMs : 0;
            return (
              <div key={i} className="ck-num" style={abs(pct(from), {
                width: `${pct(s.untilMs) - pct(from)}%`, top: 4, height: 13, fontSize: 10, lineHeight: "13px", paddingLeft: 4,
                boxSizing: "border-box", overflow: "hidden", whiteSpace: "nowrap", color: "var(--ck-text-2)",
                background: `rgba(83,169,255,${(0.08 + 0.26 * s.pulls / f.windowPulls.length).toFixed(2)})`,
              })}>{s.pulls} pull{s.pulls === 1 ? "" : "s"}</div>
            );
          })}
          {flagged.map((h) => (
            <button key={h.id} onClick={() => onSelect(h.id)} style={abs(pct(h.medianMs), {
              top: 2, transform: "translateX(-50%)", fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap", font: "inherit",
              padding: "0 4px", border: 0, cursor: "pointer", background: "var(--ck-bg-panel)",
              color: h.tone === "fail" ? FINDING_COLOR.fail : FINDING_COLOR.tight,
            })}><span style={{ fontSize: 11.5, fontWeight: 600 }}>{h.name}</span></button>
          ))}
        </div>
      </div>

      {/* cooldown lanes */}
      {f.lanes.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "8px 0 2px", fontSize: 11, color: "var(--ck-text-3)" }}>
            <span style={{ fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" }}>
              {allLanes ? "Party cooldowns" : "Cooldowns in these findings"}
            </span>
            {hidden > 0 && (
              <button onClick={() => setAllLanes((v) => !v)} style={{
                font: "inherit", fontSize: 11, color: "var(--ck-arcane-text)", background: "transparent", border: 0, padding: 0, cursor: "pointer",
              }}>
                {allLanes ? "only the ones in findings ▴" : `${shownLanes.length} of ${f.lanes.length} · show all ▾`}
              </button>
            )}
          </div>
          {shownLanes.length > 0 ? (
            <div style={band}>
              <div>
                {shownLanes.map((l) => (
                  <div key={`${l.player}|${l.key}`} style={{
                    height: LANE_H, display: "flex", alignItems: "center", gap: 6, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden",
                    borderTop: "1px solid rgba(255,255,255,.05)", color: "var(--ck-text)",
                  }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{l.name}</span>
                    <span style={{ color: jobText(l.job), flex: "0 0 auto" }}>{firstName(l.player)}</span>
                  </div>
                ))}
              </div>
              <div style={{ position: "relative" }}>
                {selectBand}
                {flagged.map((h) => (
                  <div key={h.id} style={abs(pct(h.medianMs), {
                    top: 0, bottom: 0, width: 0,
                    borderLeft: `1px dashed ${h.tone === "fail" ? "rgba(239,68,68,.45)" : "rgba(245,158,11,.35)"}`,
                  })} />
                ))}
                {shownLanes.map((l) => <LaneRow key={`${l.player}|${l.key}`} lane={l} pct={pct} />)}
              </div>
            </div>
          ) : <p className="ck-help" style={{ margin: "2px 0 4px" }}>No cooldown is named in these findings.</p>}
        </>
      )}

      {/* time axis */}
      <div style={{ ...band, marginTop: 2 }}>
        <div style={{ ...side, height: 18, display: "flex", alignItems: "center" }}>Fight time</div>
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
  const item: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 5 };
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11, color: "var(--ck-text-3)", marginBottom: 6 }}>
      <span style={item}><span style={{ width: 10, height: 8, background: VERDICT_STYLE.over.color, opacity: 0.55 }} /> lowest HP, typical pull</span>
      <span style={item}><span style={{ width: 12, height: 2, background: "var(--ck-text)" }} /> worst pull</span>
      <span style={item}><span style={{ width: 14, height: 8, borderRadius: 2, background: "#80a0f0" }} /> cast{clockPull !== undefined ? ` (Pull ${clockPull})` : ""}</span>
      <span style={item}><span style={{ width: 16, height: 2, background: IDLE }} /> free</span>
      <span style={item}><span style={{ width: 16, height: 0, borderTop: `2px dotted ${HELD}` }} /> held for the next cast</span>
      <span style={item}><span style={{ width: 8, height: 8, borderRadius: "50%", background: IDEA }} /> ready at a flagged hit</span>
      <span style={item}><span style={{ width: 12, height: 8, borderRadius: 2, outline: `2px solid ${LATE}`, outlineOffset: 1 }} /> late cast</span>
      {analyzed && <span style={{ ...item, color: MOVE }}>○→● plan move · ⊕ extra use</span>}
      {analyzed && <span style={item}><span style={{ width: 8, height: 8, border: `2px dashed ${IDEA}`, borderRadius: "50%" }} /> idea</span>}
    </div>
  );
}

function LaneRow({ lane, pct }: { lane: Lane; pct: (ms: number) => number }) {
  const color = getClassColor("ffxiv", lane.job);
  const tag = (leftPct: number, text: string, c: string) => (
    <span style={{
      position: "absolute", left: `calc(${leftPct}% + 10px)`, top: 6, fontSize: 10.5, whiteSpace: "nowrap", color: c,
      background: "var(--ck-bg-panel)", padding: "0 3px", lineHeight: "14px",
    }}>{text}</span>
  );
  return (
    <div style={{ position: "relative", height: LANE_H, borderTop: "1px solid rgba(255,255,255,.05)" }}>
      {lane.free.map(([a, b]) => (
        <div key={`f${a}`} title={`Free ${fmtTime(a)}–${fmtTime(b)}: a cast here delays nothing`} style={{
          position: "absolute", left: `${pct(a)}%`, width: `${pct(b) - pct(a)}%`, top: 12, height: 2, borderRadius: 1, background: IDLE,
        }} />
      ))}
      {lane.held.map(([a, b]) => (
        <div key={`h${a}`} title={`Held ${fmtTime(a)}–${fmtTime(b)} for the ${fmtTime(b)} cast: a cast here pushes that one back`} style={{
          position: "absolute", left: `${pct(a)}%`, width: `${pct(b) - pct(a)}%`, top: 12, height: 0, borderTop: `2px dotted ${HELD}`,
        }} />
      ))}
      {lane.casts.map((c) => (
        <div key={c.atMs} title={`${lane.name} ${fmtTime(c.atMs)}${c.late ? ` · ${c.late}` : ""}${c.lost ? ` · ${c.lost}` : ""}`} style={{
          position: "absolute", left: `${pct(c.atMs)}%`, width: `max(4px, ${pct(c.atMs + c.durationMs) - pct(c.atMs)}%)`, top: 8, height: 10,
          borderRadius: 2, boxSizing: "border-box",
          background: c.lost ? "transparent" : color, opacity: c.lost ? 1 : 0.85,
          border: c.lost ? `1px dashed ${color}` : undefined,
          outline: c.late ? `2px solid ${LATE}` : undefined, outlineOffset: 1,
        }} />
      ))}
      {lane.readyDots.map((d) => (
        <span key={`dot${d.atMs}`} title={`Ready at ${d.hit} (${fmtTime(d.atMs)}), not used`} style={{
          position: "absolute", left: `${pct(d.atMs)}%`, top: 9, width: 8, height: 8, marginLeft: -4, borderRadius: "50%",
          background: IDEA, boxShadow: "0 0 0 2px var(--ck-bg-panel)",
        }} />
      ))}
      {lane.casts.filter((c) => c.late).map((c) => (
        <span key={`late${c.atMs}`}>{tag(pct(c.atMs + c.durationMs), c.late!, LATE)}</span>
      ))}
      {lane.marks.map((m, i) => {
        if (m.kind === "move") {
          const a = pct(m.fromMs), b = pct(m.toMs);
          const left = Math.min(a, b), right = Math.max(a, b);
          return (
            <span key={i} title={`Plan ${m.letter}: move from ${fmtTime(m.fromMs)} to ${fmtTime(m.toMs)}`}>
              <span style={{
                position: "absolute", top: 12, height: 2, background: MOVE,
                left: `calc(${left}% + 8px)`, width: `max(0px, calc(${right - left}% - 17px))`,
              }}>
                <span style={{
                  position: "absolute", top: -4, [b > a ? "right" : "left"]: -2,
                  borderTop: "5px solid transparent", borderBottom: "5px solid transparent",
                  [b > a ? "borderLeft" : "borderRight"]: `7px solid ${MOVE}`,
                } as CSSProperties} />
              </span>
              <span style={{ position: "absolute", left: `${a}%`, top: 6, width: 10, height: 10, marginLeft: -7, border: `2px solid ${NOW}`, borderRadius: "50%", background: "var(--ck-bg-panel)" }} />
              <span style={{ position: "absolute", left: `${b}%`, top: 6, width: 14, height: 14, marginLeft: -7, borderRadius: "50%", background: MOVE }} />
              {tag(b, `Plan ${m.letter}`, MOVE)}
            </span>
          );
        }
        if (m.kind === "add") {
          const x = pct(m.atMs);
          return (
            <span key={i} title={`Plan ${m.letter}: extra use at ${fmtTime(m.atMs)}`}>
              <span style={{
                position: "absolute", left: `${x}%`, top: 6, width: 14, height: 14, marginLeft: -7, borderRadius: "50%", background: MOVE,
                display: "grid", placeItems: "center", color: "#06120e", fontSize: 12, fontWeight: 700, lineHeight: 1,
              }}>+</span>
              {tag(x, `Plan ${m.letter}`, MOVE)}
            </span>
          );
        }
        const x = pct(m.atMs);
        return (
          <span key={i} title={`Idea, not in the plan: ${m.label}`}>
            <span style={{ position: "absolute", left: `${x}%`, top: 5, width: 12, height: 12, marginLeft: -8, border: `2px dashed ${IDEA}`, borderRadius: "50%" }} />
            {tag(x, "idea", IDEA)}
          </span>
        );
      })}
    </div>
  );
}
