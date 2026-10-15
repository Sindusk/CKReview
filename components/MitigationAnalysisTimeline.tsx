"use client";

// components/MitigationAnalysisTimeline.tsx
//
// The Mitigation Analysis view's fight timeline (lib/mitigation/findings.ts,
// user, 2026-10-14), on the clock pull's length:
//   - finding pins over each hit
//   - the lowest player's HP after each non-tank raidwide: a bar for the
//     typical (median) pull, a tick for the worst, dashed lines at
//     MARGIN_UNDER and MARGIN_OVER; mechanic and healing failures hatched;
//     hits only one pull had are faded
//   - hit names (two staggered rows) and tank busters as "T"
//   - how many window pulls got that far
//   - one lane per party cooldown: the clock pull's casts (late ones
//     outlined, ones a plan move loses dashed), the stretches it sat ready
//     (hatched), the plan's moves and extra uses, and ideas
// Positions are percentages of the clock, so the plot stretches to the
// dialog. Clicking a hit opens it in the Timeline view.

import type { CSSProperties } from "react";
import type { AnalysisFindings, Lane, TimelineHit } from "@/lib/mitigation/findings";
import { MARGIN_OVER, MARGIN_UNDER } from "@/lib/mitigation/analyze";
import { getClassColor } from "@/lib/player-display";
import { readableText } from "./ui/DamageGlyphs";
import { FINDING_COLOR, FindingGlyph } from "./ui/MitigationGlyphs";
import { VERDICT_STYLE, fmtTime } from "./MitigationTimeline";

const LABEL_W = 190;
const CHART_H = 110;     // px for SCALE_MAX of health
const SCALE_MAX = 0.7;
const LANE_H = 24;
const MOVE = FINDING_COLOR.plan;
const IDEA = FINDING_COLOR.unused;
const LATE = FINDING_COLOR.late;
const NOW = "#8b8f98";
const HATCH = "repeating-linear-gradient(135deg, rgba(79,209,197,.5) 0 3px, transparent 3px 6px)";
const MUTED_HATCH = "repeating-linear-gradient(135deg, rgba(157,161,168,.5) 0 3px, transparent 3px 7px)";

const TONE_COLOR: Record<TimelineHit["tone"], string> = {
  fail: VERDICT_STYLE.fail.color, tight: VERDICT_STYLE.under.color, good: VERDICT_STYLE.good.color,
  over: VERDICT_STYLE.over.color, other: "#9da1a8",
};
const hpText = (x: number) => (x < 0 ? "dead" : `${Math.round(x * 100)}%`);
const firstName = (player: string) => player.split(" ")[0];
export const jobText = (job: string) => readableText(getClassColor("ffxiv", job));

const band: CSSProperties = { display: "grid", gridTemplateColumns: `${LABEL_W}px minmax(0, 1fr)`, columnGap: 12 };
const side: CSSProperties = { fontSize: 11, color: "var(--ck-text-3)", lineHeight: 1.4 };
const abs = (leftPct: number, extra?: CSSProperties): CSSProperties => ({ position: "absolute", left: `${leftPct}%`, ...extra });

/** Hit names alternate between two rows when they'd collide. */
function stagger(hits: TimelineHit[], pct: (ms: number) => number): Map<string, number> {
  const rows = new Map<string, number>();
  const last = [-Infinity, -Infinity];
  for (const h of hits) {
    const x = pct(h.medianMs);
    const row = x - last[0] >= 10 ? 0 : x - last[1] >= 10 ? 1 : last[0] <= last[1] ? 0 : 1;
    last[row] = x;
    rows.set(h.id, row);
  }
  return rows;
}

export default function AnalysisTimeline({ f, onOpenHit }: { f: AnalysisFindings; onOpenHit: (id: string) => void }) {
  const endMs = Math.max(f.clock?.durationMs ?? 0, ...f.hits.map((h) => h.medianMs + 5_000));
  if (endMs <= 0) return null;
  const pct = (ms: number) => Math.max(0, Math.min(100, (ms / endMs) * 100));
  const raid = f.hits.filter((h) => !h.tank);
  const tanks = f.hits.filter((h) => h.tank);
  const rows = stagger(raid, pct);
  const y = (m: number) => Math.max(0, Math.min(1, m / SCALE_MAX)) * CHART_H;
  const ticks: number[] = [];
  const step = endMs > 8 * 60_000 ? 60_000 : 30_000;
  for (let t = 0; t < endMs; t += step) ticks.push(t);
  const guide = (h: TimelineHit) => (
    <div key={h.id} style={abs(pct(h.medianMs), {
      top: 0, bottom: 0, width: 0, borderLeft: `1px dashed ${h.tone === "fail" ? "rgba(239,68,68,.45)" : "rgba(255,255,255,.10)"}`,
    })} />
  );
  const failBand = (h: TimelineHit) => h.tone === "fail" && (
    <div key={`${h.id}-band`} style={{ position: "absolute", left: `calc(${pct(h.medianMs)}% - 11px)`, width: 22, top: 0, bottom: 0, background: "rgba(239,68,68,.08)" }} />
  );

  return (
    <div style={{ border: "1px solid var(--ck-line-2)", borderRadius: 3, padding: "10px 12px 8px", overflowX: "auto" }}>
      <div style={{ minWidth: 980 }}>
        {/* finding pins */}
        <div style={band}>
          <div style={{ ...side, height: 26, display: "flex", alignItems: "center" }}>Findings</div>
          <div style={{ position: "relative", height: 26 }}>
            {f.hits.filter((h) => h.pins.length).map((h) => (
              <span key={h.id} style={abs(pct(h.medianMs), { top: 2, transform: "translateX(-50%)", display: "flex", gap: 2 })}>
                {h.pins.map((c) => <FindingGlyph key={c} kind={c} size={20} title={`${h.name} ${fmtTime(h.medianMs)}`} />)}
              </span>
            ))}
          </div>
        </div>

        {/* lowest HP */}
        <div style={band}>
          <div style={{ ...side, paddingTop: 30 }}>
            Lowest player HP<br />after each raidwide<br />
            <span style={{ color: "var(--ck-text-3)", opacity: 0.85 }}>bar: typical pull<br />tick: worst pull</span>
          </div>
          <div style={{ position: "relative", height: CHART_H + 10, borderBottom: "1px solid rgba(255,255,255,.18)" }}>
            {[{ m: MARGIN_OVER, c: VERDICT_STYLE.good.color }, { m: MARGIN_UNDER, c: VERDICT_STYLE.under.color }].map(({ m, c }) => (
              <div key={m}>
                <div style={{ position: "absolute", left: 0, right: 0, bottom: y(m), borderTop: `1px dashed color-mix(in srgb, ${c} 45%, transparent)` }} />
                <span style={{ position: "absolute", right: 0, bottom: y(m) + 2, fontSize: 10, color: c, opacity: 0.85 }}>{Math.round(m * 100)}%</span>
              </div>
            ))}
            {raid.map(failBand)}
            {raid.map((h) => {
              const x = pct(h.medianMs);
              const color = TONE_COLOR[h.tone];
              const faded = h.pulls === 1 && f.windowPulls.length > 1;
              const tip = `${h.name} ${fmtTime(h.medianMs)}: lowest ${hpText(h.median)} typical, ${hpText(h.worst)} worst` +
                `${h.deaths ? `, ${h.deaths} death${h.deaths === 1 ? "" : "s"}` : ""} · ${h.pulls} pull${h.pulls === 1 ? "" : "s"}\nClick: open in the Timeline`;
              const other = h.tone === "other";
              const height = other ? CHART_H : Math.max(2, y(h.median));
              const label = other ? `${h.deaths} death${h.deaths === 1 ? "" : "s"}`
                : `${hpText(h.median)}${h.tone === "fail" && h.deaths ? " · a death" : ""}${faded ? " · 1 pull" : ""}`;
              return (
                <button key={h.id} title={tip} onClick={() => onOpenHit(h.id)} style={{
                  position: "absolute", left: `${x}%`, bottom: 0, height: CHART_H + 10, width: 24, marginLeft: -12,
                  padding: 0, border: 0, background: "transparent", cursor: "pointer",
                }}>
                  <span style={{
                    position: "absolute", left: 5, bottom: 0, width: 14, height, borderRadius: "2px 2px 0 0",
                    background: other ? MUTED_HATCH : color, opacity: faded ? 0.4 : 1,
                  }} />
                  {!other && h.worst < h.median && (
                    <span style={{ position: "absolute", left: 2, width: 20, height: 2, bottom: y(h.worst), borderRadius: 1, background: h.worst < 0 ? VERDICT_STYLE.fail.color : "var(--ck-text)" }} />
                  )}
                  <span className="ck-num" style={{
                    position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: Math.min(height, CHART_H) + 3,
                    fontSize: 11, whiteSpace: "nowrap", color: faded || other ? "var(--ck-text-3)" : color,
                  }}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* hit names and tank busters */}
        <div style={band}>
          <div style={{ ...side, height: 40, paddingTop: 4, boxSizing: "border-box" }}>Raidwides<br /><span style={{ opacity: 0.85 }}>T = tank buster</span></div>
          <div style={{ position: "relative", height: 40 }}>
            {tanks.map((h, i) => (
              <span key={h.id} title={`${h.name} ${fmtTime(h.medianMs)} · on the Tanking tab`} style={abs(pct(h.medianMs), {
                top: i % 2 ? 22 : 4, transform: "translateX(-50%)", fontSize: 9.5, fontWeight: 700, color: "var(--ck-text-3)",
                border: "1px solid var(--ck-line-2)", borderRadius: 3, padding: "0 3px", lineHeight: "14px",
              })}>T</span>
            ))}
            {raid.map((h) => (
              <button key={h.id} onClick={() => onOpenHit(h.id)} title={`${h.name} ${fmtTime(h.medianMs)} · open in the Timeline`} style={abs(pct(h.medianMs), {
                top: rows.get(h.id) ? 21 : 3, transform: "translateX(-50%)", fontSize: 11.5, whiteSpace: "nowrap", maxWidth: 150,
                overflow: "hidden", textOverflow: "ellipsis", padding: 0, border: 0, background: "transparent", cursor: "pointer", font: "inherit",
                color: h.tone === "fail" ? FINDING_COLOR.fail : "var(--ck-text-2)", fontWeight: h.tone === "fail" ? 600 : 400,
              })}><span style={{ fontSize: 11.5 }}>{h.name}</span></button>
            ))}
          </div>
        </div>

        {/* pulls reaching */}
        {f.windowPulls.length > 1 && (
          <div style={{ ...band, marginBottom: 8 }}>
            <div style={{ ...side, height: 18, display: "flex", alignItems: "center" }}>Pulls reaching here</div>
            <div style={{ position: "relative", height: 18 }}>
              {f.reachSteps.map((s, i) => {
                const from = i ? f.reachSteps[i - 1].untilMs : 0;
                return (
                  <div key={i} className="ck-num" style={abs(pct(from), {
                    width: `${pct(s.untilMs) - pct(from)}%`, top: 3, height: 12, fontSize: 10, lineHeight: "12px", paddingLeft: 4,
                    boxSizing: "border-box", overflow: "hidden",
                    background: `rgba(83,169,255,${(0.1 + 0.32 * s.pulls / f.windowPulls.length).toFixed(2)})`,
                  })}>{s.pulls}</div>
                );
              })}
            </div>
          </div>
        )}

        {/* cooldown lanes */}
        {f.lanes.length > 0 && (
          <div style={band}>
            <div>
              {f.lanes.map((l) => (
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
              {raid.map(guide)}
              {raid.map(failBand)}
              {f.lanes.map((l) => <LaneRow key={`${l.player}|${l.key}`} lane={l} pct={pct} />)}
            </div>
          </div>
        )}

        {/* time axis */}
        <div style={band}>
          <div style={{ ...side, height: 20, display: "flex", alignItems: "center" }}>
            {f.clock ? `Casts: Pull ${f.clock.pullNumber}` : "Fight time"}
          </div>
          <div className="ck-num" style={{ position: "relative", height: 20, borderTop: "1px solid rgba(255,255,255,.18)", fontSize: 10.5, color: "var(--ck-text-3)" }}>
            {ticks.map((t) => (
              <span key={t} style={abs(pct(t), { top: 4, transform: t ? "translateX(-50%)" : undefined })}>{fmtTime(t)}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LaneRow({ lane, pct }: { lane: Lane; pct: (ms: number) => number }) {
  const color = getClassColor("ffxiv", lane.job);
  const tag = (leftPct: number, text: string, c: string) => (
    <span style={{
      position: "absolute", left: `calc(${leftPct}% + 10px)`, top: 5, fontSize: 10.5, whiteSpace: "nowrap", color: c,
      background: "var(--ck-bg-panel)", padding: "0 3px", lineHeight: "14px",
    }}>{text}</span>
  );
  return (
    <div style={{ position: "relative", height: LANE_H, borderTop: "1px solid rgba(255,255,255,.05)" }}>
      {lane.ready.map(([a, b]) => (
        <div key={a} title={`Ready ${fmtTime(a)}–${fmtTime(b)}, not used`} style={{
          position: "absolute", left: `${pct(a)}%`, width: `${pct(b) - pct(a)}%`, top: 9, height: 6, borderRadius: 2, background: HATCH,
        }} />
      ))}
      {lane.casts.map((c) => (
        <div key={c.atMs} title={`${lane.name} ${fmtTime(c.atMs)}${c.late ? ` · ${c.late}` : ""}${c.lost ? ` · ${c.lost}` : ""}`} style={{
          position: "absolute", left: `${pct(c.atMs)}%`, width: `max(4px, ${pct(c.atMs + c.durationMs) - pct(c.atMs)}%)`, top: 7, height: 10,
          borderRadius: 2, boxSizing: "border-box",
          background: c.lost ? "transparent" : color, opacity: c.lost ? 1 : 0.8,
          border: c.lost ? `1px dashed ${color}` : undefined,
          outline: c.late ? `2px solid ${LATE}` : undefined, outlineOffset: 1,
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
                position: "absolute", top: 11, height: 2, background: MOVE,
                left: `calc(${left}% + 8px)`, width: `max(0px, calc(${right - left}% - 17px))`,
              }}>
                <span style={{
                  position: "absolute", top: -4, [b > a ? "right" : "left"]: -2,
                  borderTop: "5px solid transparent", borderBottom: "5px solid transparent",
                  [b > a ? "borderLeft" : "borderRight"]: `7px solid ${MOVE}`,
                } as CSSProperties} />
              </span>
              <span style={{ position: "absolute", left: `${a}%`, top: 5, width: 10, height: 10, marginLeft: -7, border: `2px solid ${NOW}`, borderRadius: "50%", background: "var(--ck-bg-panel)" }} />
              <span style={{ position: "absolute", left: `${b}%`, top: 5, width: 14, height: 14, marginLeft: -7, borderRadius: "50%", background: MOVE }} />
              {tag(b, `Plan ${m.letter}`, MOVE)}
            </span>
          );
        }
        if (m.kind === "add") {
          const x = pct(m.atMs);
          return (
            <span key={i} title={`Plan ${m.letter}: extra use at ${fmtTime(m.atMs)}`}>
              <span style={{
                position: "absolute", left: `${x}%`, top: 5, width: 14, height: 14, marginLeft: -7, borderRadius: "50%", background: MOVE,
                display: "grid", placeItems: "center", color: "#06120e", fontSize: 12, fontWeight: 700, lineHeight: 1,
              }}>+</span>
              {tag(x, `Plan ${m.letter}: extra use`, MOVE)}
            </span>
          );
        }
        const x = pct(m.atMs);
        return (
          <span key={i} title={`Idea, not in the plan: ${m.label}`}>
            <span style={{ position: "absolute", left: `${x}%`, top: 4, width: 12, height: 12, marginLeft: -8, border: `2px dashed ${IDEA}`, borderRadius: "50%" }} />
            {tag(x, `idea: ${m.label}`, IDEA)}
          </span>
        );
      })}
    </div>
  );
}
