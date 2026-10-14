"use client";

// components/DamageTimeline.tsx
//
// The Damage dialog's per-player timeline, as labelled SVG lanes over the
// analysed window:
//   - Burst: raid buff windows (gold) over the player's tinctures (violet;
//     a suggested move dashed, with a line from the one played)
//   - GCDs: one block per GCD, its lock long, so a rolling GCD reads solid.
//     GCD drift findings sit here: a gap (1s+) as a red overlay on the
//     blocks (grey when forced), a small delay as a thin red line under
//     them, a triple-weave clip as an amber one (user, 2026-10-14)
//   - Losses: every other counted finding as a dot in its coaching theme's
//     colour, sized by cost; summary findings mark each moment instead
//   - job gauges, one lane each, when the job has any
// Forced time is hatched over every lane, movement a mechanic required is a
// blue tint, phase starts are gold dividers. Hovering anywhere shows the
// raid buffs and tincture up then (with who applied a boss debuff, and the
// seconds left), the GCD in effect (name, when it started, its cast time), what was woven
// after it before the next GCD, the idle after it, and the findings near
// that moment. Clicking a loss dot hands its finding to `onPick`.
//
// Long-span findings and pull-wide rates aren't drawn (user, 2026-10-13):
// a finding without moments over SPAN_MARK_MS is one dot where it starts;
// a pull-wide rate (GCD pace) has no moment; tinctures show in their lane.

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { DamageFinding, GaugeTrack, PlayerDamageSummary, PullDamageAnalysis, TimelineGcd } from "@/lib/damage/types";
import { KIND_THEME } from "@/lib/damage/coaching";
import { THEME_COLOR } from "./ui/DamageGlyphs";
import { fmtTime } from "./MitigationTimeline";

const SPAN_MARK_MS = 10_000;
const BUFF_COLOR = "#d9a441";
export const POT_COLOR = "#b993f5";
export const MOVEMENT_COLOR = "#6f9df2";
const GCD_COLOR = "#6e7f91";
const GAP_COLOR = "#ff6b66";
// A delay from triple weaving, apart from a plain late press.
const CLIP_COLOR = "#f2a65a";
const DRIFT_NEAR_MS = 600;
// Idle after a GCD's lock shorter than this isn't drawn as a break.
const GAP_MIN_MS = 500;
// Findings this close to the cursor are listed in the tooltip.
const NEAR_MS = 3_000;

const GUTTER = 96, RIGHT = 6, LANE_GAP = 6;

const fmtDamage = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : `${Math.round(n)}`;
// Tenths: two GCDs can start within the same second as a weave.
const fmtPrecise = (ms: number) => {
  const s = Math.max(0, ms) / 1000;
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
};

type ActiveBuff = { name: string; icon?: string; leftMs: number; sources: string[]; pot: boolean };
type Marker = { f: DamageFinding; startMs: number; endMs: number; lost: number; detail: string; moment: boolean; drift: boolean };
const DRIFT_KINDS = new Set<DamageFinding["kind"]>(["gcd-delay", "gcd-drift", "gcd-clipping"]);

export default function DamageTimeline({ summary, analysis, highlight, onPick }: {
  summary: PlayerDamageSummary; analysis: PullDamageAnalysis;
  highlight?: DamageFinding | null; onPick?: (f: DamageFinding) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const hatchId = `hatch${useId().replace(/:/g, "")}`;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(320, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const total = Math.max(1, analysis.endMs);
  const pw = width - GUTTER - RIGHT;
  const x = (t: number) => GUTTER + (Math.max(0, Math.min(t, total)) / total) * pw;
  const w = (s: number, e: number) => Math.max(0, x(e) - x(s));
  const tl = summary.timeline;
  const gcds = tl.gcds ?? [];
  const gauges = tl.gauges ?? [];
  const showPhases = analysis.phases.length > 1;

  // Lane geometry, top to bottom.
  const axisH = 16, phaseH = showPhases ? 14 : 0;
  const burstY = axisH + phaseH + 4, burstH = 24;
  const gcdY = burstY + burstH + LANE_GAP, gcdH = 22;
  const lossY = gcdY + gcdH + LANE_GAP, lossH = 34;
  const gaugeY0 = lossY + lossH + LANE_GAP, gaugeH = 18;
  const height = gaugeY0 + gauges.length * (gaugeH + LANE_GAP);
  const lanesTop = burstY, lanesBottom = height - (gauges.length ? LANE_GAP : 0);


  // GCD drift and clipping live in the GCD lane (forced gaps too, in grey);
  // every other counted finding, and movement, in the loss lane.
  const markers = useMemo(() => {
    const out: Marker[] = [];
    for (const f of summary.findings) {
      const drift = DRIFT_KINDS.has(f.kind);
      const counted = !f.forced && f.lostDamage >= 1;
      if (f.pullWide || f.kind === "tincture" || !(counted || (f.movement && f.lostDamage >= 1) || (drift && f.forced))) continue;
      if (f.moments?.length) {
        for (const m of f.moments) out.push({ f, startMs: m.startMs, endMs: m.endMs, lost: m.lostDamage ?? f.lostDamage, detail: m.detail ?? f.detail, moment: true, drift });
      } else {
        out.push({ f, startMs: f.startMs, endMs: !drift && f.endMs - f.startMs > SPAN_MARK_MS ? f.startMs : f.endMs, lost: f.lostDamage, detail: f.detail, moment: false, drift });
      }
    }
    return out;
  }, [summary.findings]);
  const maxLost = Math.max(1, ...markers.filter((m) => !m.moment && !m.drift).map((m) => m.lost));

  const minutes: number[] = [];
  for (let t = 30_000; t < total; t += 30_000) minutes.push(t);

  // Hover: the GCD in effect at the cursor and the findings near it.
  const hoverT = hoverX === null ? null : ((hoverX - GUTTER) / pw) * total;
  let hoverGcd: { g: TimelineGcd; next?: TimelineGcd } | undefined;
  if (hoverT !== null && gcds.length) {
    let i = -1;
    for (let j = 0; j < gcds.length && gcds[j].startMs <= hoverT; j++) i = j;
    if (i >= 0) {
      const g = gcds[i], next = gcds[i + 1];
      // Past the last GCD's lock, or a long idle stretch: only near its start.
      const reach = next ? next.startMs : g.startMs + g.lockMs + 1_500;
      if (hoverT < reach) hoverGcd = { g, next };
    }
  }
  // Drift sits between two GCDs, so only the one under the cursor is listed.
  const near = hoverT === null ? [] : markers.filter((m) => m.drift
    ? hoverT >= m.startMs - DRIFT_NEAR_MS && hoverT <= m.endMs + DRIFT_NEAR_MS
    : Math.abs(m.startMs - hoverT) <= NEAR_MS || (hoverT >= m.startMs && hoverT <= m.endMs));
  const nearFindings = [...new Map(near.map((m) => [m.f, m])).values()];
  const hoverForced = hoverT === null ? undefined : tl.forced.find((f) => hoverT >= f.startMs && hoverT <= f.endMs);
  // Raid buffs and tinctures up at the cursor: one line per buff name (two
  // Dance Partners or a debuff on two boss actors are one), the longest
  // left, with who applied it when the log says.
  const hoverBuffs: ActiveBuff[] = [];
  if (hoverT !== null) {
    const byName = new Map<string, ActiveBuff>();
    for (const b of tl.raidBuffs ?? []) {
      if (hoverT < b.startMs || hoverT > b.endMs) continue;
      const prev = byName.get(b.name);
      const sources = new Set([...(prev?.sources ?? []), ...(b.source ? [b.source] : [])]);
      byName.set(b.name, { name: b.name, icon: prev?.icon ?? b.icon, leftMs: Math.max(prev?.leftMs ?? 0, b.endMs - hoverT), sources: [...sources], pot: false });
    }
    hoverBuffs.push(...byName.values());
    for (const p of tl.potWindows ?? []) {
      if (hoverT >= p.startMs && hoverT <= p.endMs) hoverBuffs.push({ name: p.name ?? "Tincture", icon: p.icon, leftMs: p.endMs - hoverT, sources: [], pot: true });
    }
  }

  const lane = (y: number, h: number, label: string, sub?: string) => (
    <g key={`lane-${label}`}>
      <rect x={GUTTER} y={y} width={pw} height={h} style={{ fill: "var(--ck-bg-deep)", stroke: "var(--ck-line-2)" }} />
      <text x={GUTTER - 10} y={y + h / 2 + (sub ? -1 : 4)} textAnchor="end" fontSize={11.5} fontWeight={600} style={{ fill: "var(--ck-text-2)" }}>{label}</text>
      {sub && <text x={GUTTER - 10} y={y + h / 2 + 11} textAnchor="end" fontSize={10} style={{ fill: "var(--ck-text-3)" }}>{sub}</text>}
    </g>
  );

  return (
    <div ref={wrapRef} style={{ position: "relative", marginBottom: 4 }}
      onMouseLeave={() => setHoverX(null)}>
      <svg width={width} height={height} style={{ display: "block", fontFamily: "var(--font-inter), system-ui, sans-serif" }}
        onMouseMove={(e) => {
          const mx = e.clientX - e.currentTarget.getBoundingClientRect().left;
          setHoverX(mx >= GUTTER && mx <= GUTTER + pw ? mx : null);
        }}>
        <defs>
          <pattern id={hatchId} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width={6} height={6} fill="rgba(255,255,255,0.025)" />
            <line x1={0} y1={0} x2={0} y2={6} stroke="rgba(255,255,255,0.15)" strokeWidth={2} />
          </pattern>
        </defs>

        {lane(burstY, burstH, "Burst", "buffs · pots")}
        {lane(gcdY, gcdH, "GCDs", "drift in red")}
        {lane(lossY, lossH, "Losses", "size = cost")}
        {gauges.map((g, i) => lane(gaugeY0 + i * (gaugeH + LANE_GAP), gaugeH, g.name))}

        {/* 30s grid, minutes labelled; the last label is left out when it would crowd the end. */}
        {minutes.map((t) => (
          <line key={`g${t}`} x1={x(t)} x2={x(t)} y1={lanesTop} y2={lanesBottom}
            stroke={`rgba(255,255,255,${t % 60_000 === 0 ? 0.1 : 0.04})`} />
        ))}
        <text x={GUTTER} y={axisH - 4} fontSize={11} style={{ fill: "var(--ck-text-3)" }}>0:00</text>
        {minutes.filter((t) => t % 60_000 === 0 && total - t > 15_000 && t > 15_000).map((t) => (
          <text key={`l${t}`} x={x(t)} y={axisH - 4} textAnchor="middle" fontSize={11} style={{ fill: "var(--ck-text-3)" }}>{fmtTime(t)}</text>
        ))}
        <text x={GUTTER + pw} y={axisH - 4} textAnchor="end" fontSize={11} style={{ fill: "var(--ck-text-3)" }}>{fmtTime(total)}</text>

        {/* Phases: a gold divider at each start, the name where it fits. */}
        {analysis.phases.map((p, i) => (
          <g key={`p${p.phaseId}-${p.startMs}`}>
            {i > 0 && <line x1={x(p.startMs)} x2={x(p.startMs)} y1={axisH} y2={lanesBottom} style={{ stroke: "var(--ck-frame)" }} />}
            {showPhases && w(p.startMs, p.endMs) > 44 && (
              <text x={x(p.startMs) + 4} y={axisH + phaseH - 3} fontSize={10.5} style={{ fill: "var(--ck-text-gold)" }}>
                {p.name}
                <title>{`${p.name} ${fmtTime(p.startMs)}–${fmtTime(p.endMs)}`}</title>
              </text>
            )}
          </g>
        ))}

        {/* Burst lane: raid buffs on top, tinctures under them. */}
        {tl.buffWindows.map((b, i) => (
          <rect key={`b${i}`} x={x(b.startMs)} y={burstY + 3} width={Math.max(2, w(b.startMs, b.endMs))} height={10} rx={2} fill={BUFF_COLOR} opacity={0.9}>
            <title>{`Raid buffs ${fmtTime(b.startMs)}–${fmtTime(b.endMs)}`}</title>
          </rect>
        ))}
        {(tl.potWindows ?? []).map((b, i) => (
          <rect key={`pot${i}`} x={x(b.startMs)} y={burstY + 15} width={Math.max(2, w(b.startMs, b.endMs))} height={6} rx={2} fill={POT_COLOR}>
            <title>{`Tincture ${fmtTime(b.startMs)}–${fmtTime(b.endMs)}`}</title>
          </rect>
        ))}
        {summary.findings.filter((f) => f.kind === "tincture").flatMap((f, i) => (f.proposals ?? []).map((p, j) => (
          <g key={`pp${i}-${j}`}>
            {p.fromMs !== undefined && (
              <line x1={x(p.fromMs)} x2={x(p.atMs)} y1={burstY + 18} y2={burstY + 18} stroke={POT_COLOR} strokeDasharray="2 2" opacity={0.7} />
            )}
            <rect x={x(p.atMs)} y={burstY + 15} width={Math.max(2, w(p.atMs, p.atMs + p.durationMs))} height={6} rx={2}
              fill="var(--ck-bg-deep)" stroke={POT_COLOR} strokeDasharray="3 2">
              <title>{`Suggested tincture ${fmtTime(p.atMs)}–${fmtTime(p.atMs + p.durationMs)}${p.fromMs !== undefined ? ` (played ${fmtTime(p.fromMs)})` : ""}: ${f.detail}`}</title>
            </rect>
          </g>
        )))}

        {/* GCD lane: a block per GCD, its lock long. */}
        {gcds.map((g, i) => {
          const next = gcds[i + 1];
          const lockEnd = g.startMs + g.lockMs;
          const blockEnd = next ? Math.min(next.startMs, lockEnd) : Math.min(lockEnd, total);
          const hovered = hoverGcd?.g === g;
          return (
            <rect key={`gc${i}`} x={x(g.startMs)} y={gcdY + 4} width={Math.max(0.8, w(g.startMs, blockEnd) - 0.6)} height={gcdH - 11}
              fill={g.heal ? THEME_COLOR.healing : GCD_COLOR} opacity={g.heal ? 0.7 : 1}
              stroke={hovered ? "#fff" : "none"} strokeWidth={hovered ? 1 : 0} />
          );
        })}
        {/* GCD drift: a gap as a red overlay on the blocks (grey when forced),
            a small delay or clip as a thin line under them. */}
        {markers.filter((m) => m.drift).map((m, i) => {
          const hl = highlight === m.f;
          const props = { style: { cursor: onPick ? "pointer" : undefined }, onClick: () => onPick?.(m.f) };
          if (m.f.minor) {
            return (
              <rect key={`d${i}`} x={x(m.startMs)} y={gcdY + gcdH - 5} width={Math.max(2.5, w(m.startMs, m.endMs))} height={hl ? 5 : 3}
                fill={hl ? "#fff" : m.f.kind === "gcd-clipping" ? CLIP_COLOR : GAP_COLOR} opacity={hl ? 1 : 0.9} {...props} />
            );
          }
          return (
            <rect key={`d${i}`} x={x(m.startMs)} y={gcdY + 2} width={Math.max(1.5, w(m.startMs, m.endMs))} height={gcdH - 4}
              fill={m.f.forced ? "rgba(255,255,255,0.18)" : GAP_COLOR} opacity={0.85}
              stroke={hl ? "#fff" : "none"} strokeWidth={hl ? 1.5 : 0} {...props} />
          );
        })}

        {/* Losses lane: moments as short bars at the top, single findings as dots. */}
        {markers.filter((m) => !m.drift).map((m, i) => {
          const color = m.f.movement ? MOVEMENT_COLOR : THEME_COLOR[KIND_THEME[m.f.kind]];
          const hl = highlight === m.f;
          if (m.moment) {
            return (
              <rect key={`m${i}`} x={x(m.startMs) - 1} y={lossY + 4} width={Math.max(2.5, w(m.startMs, m.endMs))} height={8}
                fill={color} opacity={hl ? 1 : 0.6} style={{ cursor: onPick ? "pointer" : undefined }} onClick={() => onPick?.(m.f)} />
            );
          }
          const r = 3.5 + Math.sqrt(m.lost / maxLost) * 8;
          return (
            <circle key={`m${i}`} cx={x(m.startMs)} cy={lossY + lossH / 2 + 3} r={hl ? r + 2.5 : r}
              fill={color} fillOpacity={hl ? 1 : 0.85} stroke={hl ? "#fff" : "var(--ck-bg-deep)"} strokeWidth={hl ? 2 : 1.5}
              style={{ cursor: onPick ? "pointer" : undefined }} onClick={() => onPick?.(m.f)} />
          );
        })}

        {gauges.map((g, i) => <GaugeLane key={g.name} gauge={g} y={gaugeY0 + i * (gaugeH + LANE_GAP)} h={gaugeH} x={x} w={w} total={total} />)}

        {/* Movement a mechanic required, then forced time, over every lane. */}
        {(tl.movement ?? []).map((m, i) => (
          <rect key={`mv${i}`} x={x(m.startMs)} y={lanesTop} width={Math.max(1, w(m.startMs, m.endMs))} height={lanesBottom - lanesTop}
            fill={MOVEMENT_COLOR} opacity={0.13} pointerEvents="none" />
        ))}
        {tl.forced.map((f, i) => (
          <rect key={`f${i}`} x={x(f.startMs)} y={lanesTop} width={Math.max(1, w(f.startMs, f.endMs))} height={lanesBottom - lanesTop}
            fill={`url(#${hatchId})`} pointerEvents="none" />
        ))}

        {hoverX !== null && (
          <line x1={hoverX} x2={hoverX} y1={lanesTop} y2={lanesBottom} stroke="var(--ck-arcane-text)" opacity={0.6} pointerEvents="none" />
        )}
      </svg>

      {hoverX !== null && hoverT !== null && (
        <div style={{
          position: "absolute", top: height + 4, left: Math.max(0, Math.min(hoverX + 12, width - 320)), width: 320, zIndex: 5,
          pointerEvents: "none", background: "#0d1013", border: "1px solid var(--ck-line-2)", borderRadius: 3,
          padding: "7px 9px", fontSize: 12, lineHeight: 1.45, color: "var(--ck-text)", boxShadow: "0 6px 20px rgba(0,0,0,0.5)",
        }}>
          <div className="ck-num" style={{ color: "var(--ck-text-3)", fontSize: 11 }}>
            {fmtTime(hoverT)}{hoverForced ? ` · forced: ${hoverForced.cause}` : ""}
          </div>
          {hoverBuffs.length > 0 && (
            <div style={{ marginTop: 3, paddingBottom: 4, borderBottom: "1px solid var(--ck-line)" }}>
              {hoverBuffs.map((b) => (
                <div key={`${b.pot}-${b.name}`} style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                  {b.icon ? <AbilityIcon src={b.icon} size={15} /> : (
                    <span style={{ width: 15, height: 15, flex: "0 0 auto", display: "grid", placeItems: "center" }}>
                      <span style={{ width: 9, height: 9, borderRadius: 2, background: b.pot ? POT_COLOR : BUFF_COLOR }} />
                    </span>
                  )}
                  <span style={{ color: b.pot ? POT_COLOR : BUFF_COLOR, fontWeight: 600 }}>{b.name}</span>
                  {b.sources.length > 0 && <span style={{ color: "var(--ck-text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{b.sources.join(", ")}</span>}
                  <span className="ck-num" style={{ color: "var(--ck-text-2)", marginLeft: "auto", flex: "0 0 auto" }}>{Math.max(0, b.leftMs / 1000).toFixed(0)}s left</span>
                </div>
              ))}
            </div>
          )}
          {hoverGcd && <GcdTip g={hoverGcd.g} next={hoverGcd.next} />}
          {nearFindings.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "baseline" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", flex: "0 0 auto", alignSelf: "center",
                background: m.f.movement ? MOVEMENT_COLOR : THEME_COLOR[KIND_THEME[m.f.kind]] }} />
              <span style={{ flex: "1 1 auto" }}>{m.detail}</span>
              <span className="ck-num" style={{ color: m.f.movement ? MOVEMENT_COLOR : "var(--ck-loss-soft)", flex: "0 0 auto" }}>
                {fmtDamage(m.lost)}
              </span>
            </div>
          ))}
          {!hoverGcd && nearFindings.length === 0 && hoverBuffs.length === 0 && <div style={{ color: "var(--ck-text-3)" }}>No GCD or loss here</div>}
        </div>
      )}
    </div>
  );
}

function AbilityIcon({ src, size = 16 }: { src?: string; size?: number }) {
  if (!src) return <span style={{ width: size, height: size, display: "inline-block", flex: "0 0 auto" }} />;
  return (
    <img src={src} alt="" width={size} height={size} style={{ display: "block", borderRadius: 2, flex: "0 0 auto" }}
      onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
  );
}

// The hovered GCD: name and start, cast time, the weaves after it, then
// the idle before the next GCD.
function GcdTip({ g, next }: { g: TimelineGcd; next?: TimelineGcd }) {
  const idle = next ? next.startMs - (g.startMs + g.lockMs) : 0;
  return (
    <div style={{ marginTop: 3 }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <AbilityIcon src={g.icon} size={18} />
        <span style={{ fontWeight: 600 }}>{g.name}</span>
        <span className="ck-num" style={{ color: "var(--ck-text-2)" }}>{fmtPrecise(g.startMs)}</span>
        {g.castMs > 0 && <span className="ck-num" style={{ color: "var(--ck-text-3)" }}>{(g.castMs / 1000).toFixed(1)}s cast</span>}
      </div>
      {g.weaves.map((wv, i) => (
        <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: 12, marginTop: 2 }}>
          <span style={{ color: "var(--ck-text-3)" }}>↳</span>
          <AbilityIcon src={wv.icon} size={15} />
          <span style={{ color: "var(--ck-text-2)" }}>{wv.name}</span>
          <span className="ck-num" style={{ color: "var(--ck-text-3)" }}>{fmtPrecise(wv.atMs)}</span>
        </div>
      ))}
      {g.weaves.length === 0 && <div style={{ color: "var(--ck-text-3)", marginLeft: 12, marginTop: 2 }}>No weaves</div>}
      {idle >= 100 && (
        <div className="ck-num" style={{ color: idle >= GAP_MIN_MS ? "var(--ck-loss-soft)" : "var(--ck-text-3)", marginLeft: 12, marginTop: 2 }}>
          {(idle / 1000).toFixed(1)}s idle before {next!.name}
        </div>
      )}
    </div>
  );
}

// A job gauge lane: a bar per step, height by value; the stretches at the
// cap with the timer stopped (generation lost) in amber.
function GaugeLane({ gauge, y, h, x, w, total }: {
  gauge: GaugeTrack; y: number; h: number; x: (t: number) => number; w: (s: number, e: number) => number; total: number;
}) {
  return (
    <g>
      <title>{`${gauge.name}: ${gauge.note}`}</title>
      {gauge.capped.map((c, i) => (
        <rect key={`c${i}`} x={x(c.startMs)} y={y} width={Math.max(1, w(c.startMs, c.endMs))} height={h} fill="rgba(232,168,56,0.3)" />
      ))}
      {gauge.steps.map((s, i) => {
        const end = gauge.steps[i + 1]?.t ?? total;
        const bh = (s.value / gauge.max) * (h - 2);
        return <rect key={`s${i}`} x={x(s.t)} y={y + h - 1 - bh} width={w(s.t, end)} height={bh} style={{ fill: "var(--ck-text-3)" }} opacity={0.5} />;
      })}
    </g>
  );
}
