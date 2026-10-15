"use client";

// components/MitigationTanking.tsx
//
// The Mitigation dialog's Tanking view (docs/archive/tanking-panel-plan.md, "UI";
// layout C picked by the user over a lanes-first and an advice-first
// mockup, 2026-10-11, then cleaned up after a Dancing Mad kill buried it,
// 2026-10-12). Every amount is a % of the tank's max HP.
//   - Header: the "Last N pulls" input (blank = 5), one ⓘ, and the summary:
//     busters failing and tight before → after, tank damage saved per pull.
//   - Left: both tanks on one fight clock, phases named along the top. The
//     tank holding the boss most is above the axis, the other below.
//       - Bars: damage taken per bin, coloured autos / busters / raidwides
//         and mechanics / DoTs. The bin widens with the pull (about
//         TARGET_BINS across it, at least 2s); a bin of 100% max HP fills
//         its half, and a taller one is clipped with a white cap.
//       - Cooldown rows outside the bars (the MT's above, the OT's below):
//         one per cooldown, named once in the left margin, grey blocks
//         (invulns blue), the co-tank's casts on this tank as their own
//         "X ← caster" rows, short cooldowns as dots. Job colour is only on
//         the tank's name.
//       - Busters: a triangle on the axis coloured by margin; only those
//         under TANK_MARGIN_OVER get a name, staggered when close.
//       - Proposed changes: a dashed box in the cooldown's row.
//     Under it: buster chips grouped by ability (worst margin, who, when);
//     abilities all 30%+ or under an invuln fold into one "more" chip that
//     expands to every buster. Clicking a buster opens it in the Timeline.
//     Then the short cooldowns line.
//   - Right: one card per "do together" group (lib/mitigation/tanking-plan.ts),
//     who casts what on whom, buster margins and tank damage before →
//     after. Hovering a card fills its new spots green and outlines the
//     current use grey.
// In all-pulls mode the clock shows the window pull that got furthest
// (tanking-plan.ts clockPull; the median pull hid most of a long fight,
// user, 2026-10-12) and the chips and cards the whole window; in one-pull
// mode, that pull, with no cards (the changes read a group's pulls). The
// dialog's picker here holds just the two tanks side by side (user,
// 2026-10-11): a picked tank sees only their lane, chips and cards; "Both",
// everything.

import { useState, type CSSProperties, type ReactNode } from "react";
import type { Pull } from "@/types/Pull";
import { FFXIV_MITIGATION } from "@/lib/mitigation/ffxiv-catalog";
import { phaseSpans } from "@/lib/mitigation/analyze";
import { CAST_LEAD_MS } from "@/lib/mitigation/optimize";
import { PLAN_MAX_CHANGES, PLAN_WINDOW_DEFAULT } from "@/lib/mitigation/plan";
import { TANK_MIN_PULLS } from "@/lib/mitigation/tanking-plan";
import {
  TANK_MARGIN_OVER, TANK_MARGIN_UNDER, tankCasts,
  type AggregatedBuster, type Buster, type BusterKind, type PullTanking, type TankCast, type TankVerdict, type UnusedSummary,
} from "@/lib/mitigation/tanking";
import type { TankChange, TankPlanGroup, TankingPlan } from "@/lib/mitigation/tanking-plan";
import { getClassColor } from "@/lib/player-display";
import { VERDICT_STYLE, fmtTime } from "./MitigationTimeline";
import { SkillTip } from "./ui/MitigationGlyphs";

const firstName = (player: string) => player.split(" ")[0];
const pct = (x: number) => `${Math.round(x * 100)}%`;
const dim: CSSProperties = { color: "var(--ck-text-3)" };

const KIND_COLOR = { auto: "#b98632", buster: "#ef6b6b", other: "#53a9ff", tick: "#8a7ad6" } as const;
const KIND_LABEL = { auto: "autos", buster: "busters", other: "raidwides and mechanics", tick: "DoTs" } as const;
const STACK = ["auto", "tick", "other", "buster"] as const;
const COOLDOWN_COLOR = "#9aa0a8";
const MOVE_COLOR = "#2bb38a";
const NOW_COLOR = "#8b8f98";
const INVULN_COLOR = "#53a9ff";
const BUSTER_LABEL: Record<BusterKind, string> = { single: "single", shared: "shared", dual: "dual", both: "both tanks", solo: "taken alone" };

const INFO = [
  "Estimated from the log: margins, damage rolls and snapshot timing can be off. Confirm on VOD before relying on a change.",
  "A buster's margin is the tank's HP left, starting from full, after the buster and everything they take in the next 10s, with no healing. Under 15%: under; 15-30%: good; over 30%: over.",
  "All pulls: the clock shows the window pull that got furthest; the chips and the changes cover the whole window, at each anchor's typical time.",
  "A full-height bar is 100% of max HP in that bar's span; a white cap marks one clipped above that.",
  `Make a card's changes together, at most ${PLAN_MAX_CHANGES} at a time. Short cooldowns (Holy Sheltron, Heart of Corundum, The Blackest Night, Bloodwhetting) are expected on cooldown and never moved.`,
].join("\n\n");

function tankVerdictColor(v: TankVerdict): string {
  return v === "invuln" ? INVULN_COLOR : VERDICT_STYLE[v].color;
}
function marginVerdict(m: number): TankVerdict {
  return m < 0 ? "fail" : m < TANK_MARGIN_UNDER ? "under" : m < TANK_MARGIN_OVER ? "good" : "over";
}

// ── The clock ──────────────────────────────────────────────────────────

const W = 1000;
const LEFT = 150;       // the cooldown names
const RIGHT = 12;
const PHASE_H = 16;
const BAR_H = 70;
const ROW_H = 13;
const TARGET_BINS = 200;
const BIN_STEPS = [2, 3, 4, 5, 6, 8, 10, 15, 20, 30].map((s) => s * 1000);
// Cooldown rows, top to bottom: invulns, the big ones, then the rest.
const ROW_ORDER = ["hallowed-ground", "living-dead", "holmgang", "superbolide", "guardian", "shadowed-vigil", "damnation",
  "great-nebula", "rampart", "bulwark", "dark-mind", "camouflage", "oblation"];

type Lane = { player: string; job: string; up: boolean };
type Row = { label: string; key: string; casts: TankCast[]; dots?: boolean; co?: boolean };

/** Where a change puts a cooldown, on whose lane, and the use it replaces. */
function placement(c: TankChange) {
  const entry = FFXIV_MITIGATION.catalog.find((e) => e.key === c.key);
  const on = c.receiver ?? (entry?.reach === "self" ? c.player : c.to.tank ?? c.player);
  return {
    on, durationMs: entry?.durationMs ?? 10_000,
    atMs: Math.max(0, c.to.medianMs - CAST_LEAD_MS),
    fromMs: c.from ? Math.max(0, c.from.medianMs - CAST_LEAD_MS) : undefined,
  };
}

/** A tank's cooldown rows: own cooldowns, the co-tank's on them, then short ones as dots; plus rows for proposed changes. */
function rowsFor(pull: Pull, tank: string, changes: TankChange[]): Row[] {
  const casts = tankCasts(pull, FFXIV_MITIGATION, tank);
  const rank = (key: string) => (ROW_ORDER.indexOf(key) + 1 || ROW_ORDER.length + 1);
  const rows: Row[] = [];
  const own = casts.filter((c) => c.kind !== "short" && c.by === tank);
  const keys = [...new Set([...own.map((c) => c.key), ...changes.filter((c) => placement(c).on === tank && c.player === tank).map((c) => c.key)])]
    .sort((a, b) => rank(a) - rank(b));
  for (const key of keys) {
    const name = own.find((c) => c.key === key)?.name ?? changes.find((c) => c.key === key)!.name;
    rows.push({ label: name, key, casts: own.filter((c) => c.key === key) });
  }
  const co = casts.filter((c) => c.kind !== "short" && c.by !== tank);
  for (const key of [...new Set(co.map((c) => c.key))]) {
    const xs = co.filter((c) => c.key === key);
    rows.push({ label: `${xs[0].name} ← ${firstName(xs[0].by)}`, key, casts: xs, co: true });
  }
  for (const c of changes.filter((c) => placement(c).on === tank && c.player !== tank)) {
    if (!rows.some((r) => r.co && r.key === c.key)) rows.push({ label: `${c.name} ← ${firstName(c.player)}`, key: c.key, casts: [], co: true });
  }
  const shorts = casts.filter((c) => c.kind === "short");
  for (const by of [tank, ...new Set(shorts.filter((c) => c.by !== tank).map((c) => c.by))]) {
    for (const key of [...new Set(shorts.filter((c) => c.by === by).map((c) => c.key))]) {
      const xs = shorts.filter((c) => c.by === by && c.key === key);
      rows.push({ label: by === tank ? xs[0].name : `${xs[0].name} ← ${firstName(by)}`, key, casts: xs, dots: true, co: by !== tank });
    }
  }
  return rows;
}

function Clock({ pull, tanking, lanes, changes, hover }: {
  pull: Pull; tanking: PullTanking; lanes: Lane[]; changes: TankChange[]; hover: Set<TankChange>;
}) {
  const dur = pull.fightDuration;
  const x = (ms: number) => LEFT + (Math.min(Math.max(ms, 0), dur) / dur) * (W - LEFT - RIGHT);
  const bin = BIN_STEPS.find((s) => dur / s <= TARGET_BINS) ?? BIN_STEPS[BIN_STEPS.length - 1];
  const binW = Math.max(1, x(bin) - x(0) - 0.6);
  const upper = lanes.find((l) => l.up);
  const lower = lanes.find((l) => !l.up);
  const upperRows = upper ? rowsFor(pull, upper.player, changes) : [];
  const lowerRows = lower ? rowsFor(pull, lower.player, changes) : [];
  const upperRowsY = PHASE_H + 6;
  const upperBase = upperRowsY + upperRows.length * ROW_H + 6 + (upper ? BAR_H : 0);
  const axis = upperBase + (upper ? 10 : 30);
  const lowerBase = axis + 10;
  const lowerRowsY = lowerBase + (lower ? BAR_H + 6 : 0);
  const height = lowerRowsY + lowerRows.length * ROW_H + 6;
  const text = { fontSize: 10, fill: "var(--ck-text-3)" };
  const halo = { paintOrder: "stroke" as const, stroke: "var(--ck-bg-panel)", strokeWidth: 3 };

  // Phases: contiguous runs of one phase name.
  const phases: { name: string; start: number; end: number }[] = [];
  for (const seg of phaseSpans(pull)) {
    const last = phases[phases.length - 1];
    if (last && last.name === seg.name) last.end = seg.endMs; else phases.push({ name: seg.name, start: seg.startMs, end: seg.endMs });
  }
  const tickMs = dur > 10 * 60_000 ? 60_000 : 30_000;
  const labelEvery = dur > 10 * 60_000 ? 2 : dur > 4 * 60_000 ? 2 : 1;
  const ticks: number[] = [];
  for (let s = 0; s <= dur; s += tickMs) ticks.push(s);

  const lane = (l: Lane, rows: Row[], base: number, rowsY: number) => {
    const color = getClassColor("ffxiv", l.job);
    const stream = tanking.tanks.find((s) => s.player === l.player);
    const bins = new Map<number, Record<(typeof STACK)[number], number>>();
    for (const e of stream?.events ?? []) {
      const i = Math.floor(e.timestampMs / bin);
      const b = bins.get(i) ?? { auto: 0, buster: 0, other: 0, tick: 0 };
      b[e.kind] += e.taken;
      bins.set(i, b);
    }
    return (
      <g key={l.player}>
        <text x={0} y={l.up ? base - 30 : base + 26} style={{ fontSize: 14, fontWeight: 600, fill: color }}>{firstName(l.player)}</text>
        <text x={0} y={l.up ? base - 15 : base + 41} style={text}>{l.up ? "MT" : "OT"} · {l.job}</text>
        {[...bins].map(([i, b]) => {
          const total = STACK.reduce((s, k) => s + b[k], 0);
          let off = 0;
          return (
            <g key={i}>
              <title>{`${firstName(l.player)} ${fmtTime(i * bin)}–${fmtTime((i + 1) * bin)}: ${STACK.filter((k) => b[k] > 0).map((k) => `${KIND_LABEL[k]} ${pct(b[k])}`).join(", ")} of max HP`}</title>
              {STACK.filter((k) => b[k] > 0).map((k) => {
                if (off >= BAR_H) return null;
                const h = Math.min(BAR_H - off, b[k] * BAR_H);
                const y = l.up ? base - off - h : base + off;
                off += h;
                return <rect key={k} x={x(i * bin) + 0.3} y={y} width={binW} height={h} fill={KIND_COLOR[k]} />;
              })}
              {total > 1 && <rect x={x(i * bin)} y={l.up ? base - BAR_H - 3 : base + BAR_H + 1} width={Math.max(2, binW)} height={2} fill="var(--ck-text)" />}
            </g>
          );
        })}
        {rows.map((r, k) => {
          const y = rowsY + k * ROW_H;
          return (
            <g key={`${r.label}${k}`}>
              <text x={LEFT - 6} y={y + 9} textAnchor="end" style={{ ...text, fill: r.co ? "var(--ck-text-3)" : "var(--ck-text-2)" }}>{r.label}</text>
              <line x1={LEFT} x2={W - RIGHT} y1={y + 11.5} y2={y + 11.5} stroke="var(--ck-line)" />
              {r.casts.map((c, i) => r.dots ? (
                <circle key={i} cx={x(c.atMs)} cy={y + 6} r={2.2} fill={COOLDOWN_COLOR} opacity={0.8}>
                  <title>{`${c.name}${r.co ? ` (${firstName(c.by)})` : ""} ${fmtTime(c.atMs)}`}</title>
                </circle>
              ) : (
                <rect key={i} x={x(c.atMs)} y={y + 2} width={Math.max(2, x(c.atMs + c.durationMs) - x(c.atMs))} height={8} rx={1}
                  fill={c.kind === "invuln" ? INVULN_COLOR : COOLDOWN_COLOR} opacity={c.kind === "invuln" ? 0.9 : 0.55}>
                  <title>{`${c.name}${r.co ? ` (${firstName(c.by)})` : ""} ${fmtTime(c.atMs)}–${fmtTime(c.atMs + c.durationMs)}`}</title>
                </rect>
              ))}
              {!r.dots && changes.filter((c) => c.key === r.key && placement(c).on === l.player && (c.player === l.player) !== !!r.co).map((c, i) => {
                const p = placement(c);
                const lit = hover.has(c);
                return (
                  <g key={`p${i}`}>
                    <title>{`${firstName(c.player)}${c.receiver ? ` → ${firstName(c.receiver)}` : ""}: ${c.name} ${c.kind === "add" ? "extra use" : "use here"} at ${fmtTime(p.atMs)}`}</title>
                    <rect x={x(p.atMs)} y={y + 0.5} width={x(p.atMs + p.durationMs) - x(p.atMs)} height={11} rx={1}
                      fill={lit ? MOVE_COLOR : "none"} fillOpacity={0.35} stroke={MOVE_COLOR} strokeWidth={1.5} strokeDasharray="3 2" />
                    {lit && p.fromMs !== undefined && (
                      <rect x={x(p.fromMs)} y={y + 0.5} width={x(p.fromMs + p.durationMs) - x(p.fromMs)} height={11} rx={1}
                        fill="none" stroke={NOW_COLOR} strokeWidth={1.5} strokeDasharray="2 2" />
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </g>
    );
  };

  // Buster names only under TANK_MARGIN_OVER, stacked upward when close.
  let lastLabelX = -Infinity;
  let level = 0;
  const shownBusters = tanking.busters.filter((b) => b.tanks.some((t) => lanes.some((l) => l.player === t.player)));

  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" style={{ display: "block", minWidth: 760 }}>
      {phases.map((p, i) => (
        <g key={i}>
          {i % 2 === 1 && <rect x={x(p.start)} y={PHASE_H} width={x(p.end) - x(p.start)} height={height - PHASE_H} fill="#ffffff" opacity={0.025} />}
          <line x1={x(p.start)} x2={x(p.start)} y1={2} y2={height} stroke="var(--ck-line-2)" />
          <text x={x(p.start) + 4} y={11} style={{ ...text, fontSize: 10.5 }}>{p.name}</text>
        </g>
      ))}
      {upper && lane(upper, upperRows, upperBase, upperRowsY)}
      {lower && lane(lower, lowerRows, lowerBase, lowerRowsY)}
      <line x1={LEFT} x2={W - RIGHT} y1={axis} y2={axis} stroke="var(--ck-line-2)" />
      {ticks.map((s, i) => (
        <g key={s}>
          <line x1={x(s)} x2={x(s)} y1={axis - 4} y2={axis + 4} stroke={i % labelEvery === 0 ? "var(--ck-text-3)" : "var(--ck-line-2)"} />
          {i % labelEvery === 0 && <text x={x(s)} y={axis + 3.5} textAnchor="middle" style={{ ...text, ...halo, strokeWidth: 4 }}>{fmtTime(s)}</text>}
        </g>
      ))}
      {shownBusters.map((b) => {
        const mortal = b.tanks.filter((t) => !t.invuln && lanes.some((l) => l.player === t.player));
        const worst = mortal.length ? Math.min(...mortal.map((t) => t.margin)) : undefined;
        const color = tankVerdictColor(worst === undefined ? "invuln" : marginVerdict(worst));
        const bx = x(b.timestampMs);
        let label: ReactNode = null;
        if (worst !== undefined && worst < TANK_MARGIN_OVER) {
          level = bx - lastLabelX < 130 ? level + 1 : 0;
          lastLabelX = bx;
          const ly = axis - 9 - level * 12;
          label = (
            <>
              {level > 0 && <line x1={bx} x2={bx} y1={ly + 2} y2={axis - 5} stroke={color} opacity={0.6} />}
              <text x={bx + 2} y={ly} style={{ fontSize: 10, fill: color, ...halo }}>{b.abilityName} #{b.occurrence} {pct(worst)}</text>
            </>
          );
        }
        return (
          <g key={b.id}>
            <title>{`${b.abilityName} #${b.occurrence} ${fmtTime(b.timestampMs)}: ${b.tanks.map((t) => `${firstName(t.player)} ${t.invuln ? "invuln" : pct(t.margin)}`).join(", ")}`}</title>
            <path d={`M${bx},${axis - 5} l4,7 h-8 z`} fill={color} />
            {label}
          </g>
        );
      })}
    </svg>
  );
}

function Legend() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", fontSize: 11, ...dim }}>
      {STACK.map((k) => (
        <span key={k}><Swatch color={KIND_COLOR[k]} />{KIND_LABEL[k]}</span>
      ))}
      <span><Swatch color={COOLDOWN_COLOR} />cooldowns</span>
      <span><Swatch color={INVULN_COLOR} />invulns</span>
      <span style={{ color: MOVE_COLOR }}>┅ proposed</span>
      <span>▲ buster, coloured by margin</span>
    </div>
  );
}
function Swatch({ color }: { color: string }) {
  return <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 1, background: color, marginRight: 4, verticalAlign: -1 }} />;
}

// ── Chips, short cooldowns, cards ──────────────────────────────────────

export type BusterChip = {
  id: string; name: string; abilityName: string; atMs: number; kind: BusterKind; pulls: number;
  tanks: { player: string; margin?: number; invulnPulls: number; pulls: number }[];
};

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Chips from busters matched across pulls (overlaps and rare ones left out). */
export function chipsFromAggregate(rows: AggregatedBuster[]): BusterChip[] {
  return rows.filter((r) => !r.rare).map((r) => {
    const byTank = new Map<string, { margins: number[]; invuln: number; pulls: number }>();
    for (const { buster } of r.byPull) {
      if (buster.overlap) continue;
      for (const t of buster.tanks) {
        const x = byTank.get(t.player) ?? { margins: [], invuln: 0, pulls: 0 };
        x.pulls++;
        if (t.invuln) x.invuln++; else x.margins.push(t.margin);
        byTank.set(t.player, x);
      }
    }
    return {
      id: r.id, name: `${r.abilityName} #${r.occurrence}`, abilityName: r.abilityName, atMs: r.medianMs, kind: r.kind, pulls: r.pulls,
      tanks: [...byTank].map(([player, x]) => ({ player, margin: x.margins.length ? median(x.margins) : undefined, invulnPulls: x.invuln, pulls: x.pulls })),
    };
  });
}
/** Chips from one pull's busters. */
export function chipsFromPull(busters: Buster[]): BusterChip[] {
  return busters.map((b) => ({
    id: b.id, name: `${b.abilityName} #${b.occurrence}`, abilityName: b.abilityName, atMs: b.timestampMs, kind: b.kind, pulls: 1,
    tanks: b.tanks.map((t) => ({ player: t.player, margin: t.invuln ? undefined : t.margin, invulnPulls: t.invuln ? 1 : 0, pulls: 1 })),
  }));
}

/** One ability's busters: the worst margin (who, when) and how many were under an invuln. */
type ChipGroup = { abilityName: string; kind: BusterKind; chips: BusterChip[]; worst?: { margin: number; player: string; atMs: number; id: string }; invuln: number };

function groupChips(chips: BusterChip[]): ChipGroup[] {
  const groups = new Map<string, ChipGroup>();
  for (const c of chips) {
    const g = groups.get(c.abilityName) ?? { abilityName: c.abilityName, kind: c.kind, chips: [], invuln: 0 };
    g.chips.push(c);
    for (const t of c.tanks) {
      if (t.margin === undefined) { g.invuln++; continue; }
      if (!g.worst || t.margin < g.worst.margin) g.worst = { margin: t.margin, player: t.player, atMs: c.atMs, id: c.id };
    }
    groups.set(c.abilityName, g);
  }
  return [...groups.values()];
}

function OneChip({ c, onOpen }: { c: BusterChip; onOpen: (id: string) => void }) {
  return (
    <button className="ck-btn ck-btn--xs" title="Open in the Timeline" onClick={() => onOpen(c.id)}
      style={{ display: "inline-flex", gap: 6, alignItems: "baseline" }}>
      <span>{c.name}</span>
      <span style={dim}>{fmtTime(c.atMs)} · {BUSTER_LABEL[c.kind]}</span>
      {c.tanks.map((t) => {
        const invuln = t.margin === undefined;
        return (
          <span key={t.player} title={t.invulnPulls ? `Under an invuln in ${t.invulnPulls} of ${t.pulls} pulls` : undefined}>
            {c.tanks.length > 1 && <span style={dim}>{firstName(t.player)} </span>}
            <span className="ck-num" style={{ color: invuln ? INVULN_COLOR : tankVerdictColor(marginVerdict(t.margin!)) }}>{invuln ? "invuln" : pct(t.margin!)}</span>
          </span>
        );
      })}
    </button>
  );
}

function Chips({ chips, onOpen }: { chips: BusterChip[]; onOpen: (id: string) => void }) {
  const [all, setAll] = useState(false);
  if (!chips.length) return null;
  const groups = groupChips(chips);
  const attention = groups.filter((g) => g.worst && g.worst.margin < TANK_MARGIN_OVER).sort((a, b) => a.worst!.margin - b.worst!.margin);
  const fine = groups.filter((g) => !attention.includes(g));
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        {attention.map((g) => (
          <button key={g.abilityName} className="ck-btn ck-btn--xs" title="Open the worst one in the Timeline" onClick={() => onOpen(g.worst!.id)}
            style={{ display: "inline-flex", gap: 6, alignItems: "baseline" }}>
            <span>{g.abilityName}{g.chips.length > 1 ? ` ×${g.chips.length}` : ""}</span>
            <span style={dim}>{BUSTER_LABEL[g.kind]}</span>
            <span>worst <b className="ck-num" style={{ color: tankVerdictColor(marginVerdict(g.worst!.margin)) }}>{pct(g.worst!.margin)}</b></span>
            <span style={dim}>{firstName(g.worst!.player)} {fmtTime(g.worst!.atMs)}{g.invuln ? ` · invuln ${g.invuln}×` : ""}</span>
          </button>
        ))}
        {(fine.length > 0 || attention.length > 0) && (
          <button className="ck-btn ck-btn--xs" onClick={() => setAll((v) => !v)} style={{ borderStyle: "dashed", ...dim }}>
            {all ? "Hide the list ‹" : fine.length
              ? `+ ${fine.length} more fine: ${fine.map((g) => `${g.abilityName}${g.chips.length > 1 ? ` ×${g.chips.length}` : ""}`).join(", ")} ›`
              : "Every buster ›"}
          </button>
        )}
      </div>
      {all && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {[...chips].sort((a, b) => a.atMs - b.atMs).map((c) => <OneChip key={c.id} c={c} onOpen={onOpen} />)}
        </div>
      )}
    </div>
  );
}

function ShortCooldowns({ unused }: { unused: UnusedSummary[] }) {
  if (!unused.length) return null;
  return (
    <div style={{ fontSize: 12, color: "var(--ck-text-2)" }}>
      <span style={dim}>Short cooldowns · </span>
      {unused.map((u, i) => (
        <span key={i}>
          {i > 0 && " · "}
          <b style={{ color: "var(--ck-text)" }}>{firstName(u.player)}</b> <SkillTip entryKey={u.key}>{u.name}</SkillTip>:{" "}
          {u.basis === "mp"
            ? <>{u.used.toFixed(1)} per pull{u.everyMs ? `, one per ${Math.round(u.everyMs / 1000)}s` : ""} <span style={dim} title="MP isn't in the log and is shared with damage, so there's no fair count of possible uses">(MP)</span></>
            : u.unused >= 0.5
              ? <>≈ {u.unused.toFixed(1)} unused per pull{u.savedPerUse !== undefined && <span style={dim}> (≈ {pct(u.unused * u.savedPerUse)} HP)</span>}</>
              : <span style={{ color: VERDICT_STYLE.good.color }}>on cooldown</span>}
        </span>
      ))}
    </div>
  );
}

function changeLine(c: TankChange): ReactNode {
  const who = <b style={{ color: getClassColor("ffxiv", c.job) }}>{firstName(c.player)}</b>;
  const where = (r: TankChange["to"]) => r.kind === "autos" ? `autos ${fmtTime(r.medianMs)}–${fmtTime(r.endMs ?? r.medianMs)}` : `${r.name} (${fmtTime(r.medianMs)})`;
  return (
    <>
      {who}{c.receiver && <> → <b>{firstName(c.receiver)}</b></>}: <SkillTip entryKey={c.key}><b>{c.name}</b></SkillTip>{" "}
      {c.kind === "add" ? <>extra use on {where(c.to)}</> : <>{where(c.from!)} → {where(c.to)}</>}
      {c.invuln && <span style={{ color: INVULN_COLOR }}> (invuln)</span>}
      <span style={dim}> · fits {c.legal}/{c.pulls}</span>
    </>
  );
}

function Card({ group, onHover }: { group: TankPlanGroup; onHover: (g: TankPlanGroup | null) => void }) {
  const saved = group.damage.before - group.damage.after;
  const players = [...new Set(group.changes.map((c) => c.player))];
  return (
    <div className="ck-card" style={{ padding: "8px 10px", display: "grid", gap: 4 }}
      onMouseEnter={() => onHover(group)} onMouseLeave={() => onHover(null)}>
      <span style={{ color: "var(--ck-text-gold)", fontWeight: 600, fontSize: 12 }}>
        {group.together ? "Do together" : firstName(players[0])}
      </span>
      {group.changes.map((c, i) => <div key={i} style={{ fontSize: 13 }}>{changeLine(c)}</div>)}
      {group.busters.map((b) => (
        <div key={b.buster.id} style={{ fontSize: 12 }} title={`Worst pull ${pct(b.before.worst)} → ${pct(b.after.worst)}`}>
          {b.buster.name} <span className="ck-num" style={{ color: tankVerdictColor(marginVerdict(b.before.median)) }}>{pct(b.before.median)}</span>
          <span style={dim}> → </span>
          <span className="ck-num" style={{ color: tankVerdictColor(marginVerdict(b.after.median)) }}>{pct(b.after.median)}</span>
        </div>
      ))}
      {saved > 0.005 && <div style={{ fontSize: 12, ...dim }}>Tank damage −{pct(saved)} HP per pull</div>}
    </div>
  );
}

// ── View ───────────────────────────────────────────────────────────────

export function TankingView({ plan, pending, error, shown, shownLabel, chips, unused, focus, allPulls,
  windowInput, onWindowInput, groupPulls, windowPulls, onOpenBuster }: {
  plan:        TankingPlan | null;
  pending:     boolean;
  error?:      string;
  shown?:      { pull: Pull; tanking: PullTanking };  // the clock's pull
  shownLabel:  string;
  chips:       BusterChip[];
  unused:      UnusedSummary[];
  focus:       string | null;
  allPulls:    boolean;
  windowInput: string;
  onWindowInput: (v: string) => void;
  groupPulls:  number;  // the group's analyzable pulls
  windowPulls: number;  // pulls with the latest tank jobs (0: not enough)
  onOpenBuster: (id: string) => void;
}) {
  const [hover, setHover] = useState<TankPlanGroup | null>(null);
  const tankNames = shown ? shown.tanking.tanks.map((t) => t.player) : [];
  const focusTank = focus && tankNames.includes(focus) ? focus : null;
  // The tank holding the boss most goes on top.
  const autos = (p: string) => shown?.tanking.tanking.filter((s) => s.player === p).reduce((n, s) => n + s.autos, 0) ?? 0;
  const ordered = [...tankNames].sort((a, b) => autos(b) - autos(a));
  const lanes: Lane[] = ordered
    .filter((p) => !focusTank || p === focusTank)
    .map((p) => ({ player: p, job: shown!.pull.players.find((x) => x.name === p)?.className ?? "", up: p === ordered[0] }));
  const involves = (g: TankPlanGroup) => !focusTank || g.changes.some((c) => c.player === focusTank || c.receiver === focusTank);
  const groups = (allPulls && plan ? plan.groups : []).filter(involves);
  const changes = groups.flatMap((g) => g.changes);
  const shownChips = focusTank ? chips.filter((c) => c.tanks.some((t) => t.player === focusTank))
    .map((c) => ({ ...c, tanks: c.tanks.filter((t) => t.player === focusTank) })) : chips;
  const shownUnused = focusTank ? unused.filter((u) => u.player === focusTank) : unused;
  const s = plan?.summary;

  let advice: ReactNode;
  if (!allPulls) advice = <p className="ck-dialog-text" style={{ margin: 0 }}>Changes read all of a group&apos;s pulls: pick &ldquo;All pulls&rdquo; to see them.</p>;
  else if (!windowPulls) advice = <p className="ck-dialog-text" style={{ margin: 0 }}>Changes need {TANK_MIN_PULLS} pulls with the tanks on their current jobs.</p>;
  else if (plan && !groups.length) advice = <p className="ck-dialog-text" style={{ margin: 0 }}>{focusTank ? `No change for ${firstName(focusTank)} this round.` : "No change worth making in these pulls."}</p>;
  else advice = groups.map((g, i) => <Card key={i} group={g} onHover={setHover} />);

  return (
    <div style={{ padding: "8px 12px 12px", display: "grid", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {allPulls && (
          <label style={{ fontSize: 12, color: "var(--ck-text-2)", display: "inline-flex", alignItems: "center", gap: 5 }}>
            Last
            <input className="ck-field" type="number" min={TANK_MIN_PULLS} max={groupPulls} placeholder={String(Math.min(PLAN_WINDOW_DEFAULT, groupPulls))}
              value={windowInput} onChange={(e) => onWindowInput(e.target.value)} style={{ width: 48, padding: "2px 4px" }} />
            pulls
          </label>
        )}
        <span title={INFO} style={{ ...dim, cursor: "help" }}>ⓘ</span>
        <span style={{ fontSize: 12, ...dim }}>{shownLabel}</span>
        {pending && <span style={{ ...dim, fontSize: 12 }}>Working…</span>}
        <span style={{ flex: "1 1 auto" }} />
        {allPulls && s && (
          <span style={{ fontSize: 12, color: "var(--ck-text-2)", whiteSpace: "nowrap" }}>
            Busters failing <b style={{ color: "var(--ck-text)" }}>{s.before.failing} → {s.after.failing}</b>
            {" · "}tight <b style={{ color: "var(--ck-text)" }}>{s.before.tight} → {s.after.tight}</b>
            {s.before.damage - s.after.damage > 0.005 && <>{" · "}Tank damage <b style={{ color: "var(--ck-text)" }}>−{pct(s.before.damage - s.after.damage)} HP</b> per pull</>}
          </span>
        )}
      </div>
      {error && <p style={{ color: VERDICT_STYLE.fail.color, fontSize: 12, margin: 0 }}>The tanking analysis failed: {error}</p>}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start", opacity: pending ? 0.6 : 1 }}>
        <div style={{ flex: "1 1 760px", minWidth: 0, display: "grid", gap: 8 }}>
          <Legend />
          {shown && lanes.length > 0
            ? <div style={{ overflowX: "auto" }}><Clock pull={shown.pull} tanking={shown.tanking} lanes={lanes} changes={changes} hover={new Set(hover?.changes ?? [])} /></div>
            : <p className="ck-dialog-text" style={{ margin: 0 }}>No tank damage in this pull.</p>}
          <Chips chips={shownChips} onOpen={onOpenBuster} />
          <ShortCooldowns unused={shownUnused} />
        </div>
        <div style={{ flex: "0 1 300px", minWidth: 240, display: "grid", gap: 8, alignContent: "start" }}>
          {advice}
          {groups.length > 0 && <span style={{ fontSize: 11, ...dim }}>Hover a card: its new spot fills green, the current use is outlined grey.</span>}
        </div>
      </div>
    </div>
  );
}
