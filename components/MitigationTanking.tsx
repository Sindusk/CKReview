"use client";

// components/MitigationTanking.tsx
//
// The Mitigation dialog's Tanking view (docs/tanking-panel-plan.md, "UI";
// layout C picked by the user over a lanes-first and an advice-first
// mockup, 2026-10-11). Every amount is a % of the tank's max HP.
//   - Header: the "Last N pulls" input (blank = 5), one ⓘ, and the summary:
//     busters failing and tight before → after, tank damage saved per pull.
//   - Left: both tanks on one fight clock. The tank holding the boss most
//     is above the axis, the other below. Bars are damage taken per 2s,
//     coloured autos / busters / raidwides and mechanics / DoTs; behind
//     them, shaded bands for each tank's cooldowns (invulns in blue) with
//     the co-tank's casts on them labelled with the caster; proposed
//     changes are dashed boxes in place. Busters are dashed verticals with
//     their margin. Under it: one chip per buster (margin per tank, or
//     "invuln"; clicking opens it in the Timeline) and the short cooldowns
//     line.
//   - Right: one card per "do together" group (lib/mitigation/tanking-plan.ts),
//     who casts what on whom, buster margins and tank damage before →
//     after. Hovering a card outlines its changes on the clock, with the
//     current use in grey.
// In all-pulls mode the clock shows the window's median pull (by total tank
// damage) and the chips and cards the whole window; in one-pull mode, that
// pull, with no cards (the changes read a group's pulls). A picked tank
// sees only their lane, chips and cards; a picked non-tank sees everything.

import { useState, type CSSProperties, type ReactNode } from "react";
import type { Pull } from "@/types/Pull";
import { FFXIV_MITIGATION } from "@/lib/mitigation/ffxiv-catalog";
import { CAST_LEAD_MS } from "@/lib/mitigation/optimize";
import { PLAN_MAX_CHANGES, PLAN_MIN_PULLS, PLAN_WINDOW_DEFAULT } from "@/lib/mitigation/plan";
import {
  TANK_MARGIN_OVER, TANK_MARGIN_UNDER, tankCasts,
  type AggregatedBuster, type Buster, type BusterKind, type PullTanking, type TankVerdict, type UnusedSummary,
} from "@/lib/mitigation/tanking";
import type { TankChange, TankPlanGroup, TankingPlan } from "@/lib/mitigation/tanking-plan";
import { getClassColor } from "@/lib/player-display";
import { VERDICT_STYLE, fmtTime } from "./MitigationTimeline";

const firstName = (player: string) => player.split(" ")[0];
const pct = (x: number) => `${Math.round(x * 100)}%`;
const dim: CSSProperties = { color: "var(--ck-text-3)" };

const KIND_COLOR = { auto: "#b98632", buster: "#ef6b6b", other: "#53a9ff", tick: "#8a7ad6" } as const;
const KIND_LABEL = { auto: "autos", buster: "busters", other: "raidwides and mechanics", tick: "DoTs" } as const;
const STACK = ["auto", "tick", "other", "buster"] as const;
const MOVE_COLOR = "#2bb38a";
const NOW_COLOR = "#8b8f98";
const INVULN_COLOR = "#53a9ff";
const BUSTER_LABEL: Record<BusterKind, string> = { single: "single", shared: "shared", dual: "dual", both: "both tanks", solo: "taken alone" };

const INFO = [
  "Estimated from the log: margins, damage rolls and snapshot timing can be off. Confirm on VOD before relying on a change.",
  "A buster's margin is the tank's HP left, starting from full, after the buster and everything they take in the next 10s, with no healing. Under 15%: under; 15-30%: good; over 30%: over.",
  "All pulls: the clock shows the window's median pull by total tank damage; the chips and the changes cover the whole window, at each anchor's typical time.",
  `Make a card's changes together, at most ${PLAN_MAX_CHANGES} at a time. Short cooldowns (Holy Sheltron, Heart of Corundum, The Blackest Night, Bloodwhetting) are expected on cooldown and never moved.`,
].join("\n\n");

function tankVerdictColor(v: TankVerdict): string {
  return v === "invuln" ? INVULN_COLOR : VERDICT_STYLE[v].color;
}
function marginVerdict(m: number): TankVerdict {
  return m < 0 ? "fail" : m < TANK_MARGIN_UNDER ? "under" : m < TANK_MARGIN_OVER ? "good" : "over";
}

// ── The clock ──────────────────────────────────────────────────────────

const W = 900;
const LEFT = 70;
const HALF = 100;   // each tank's height
const GAP = 9;      // between the axis and the bars
const BAR_FULL = 0.9;  // a 2s bin of 90% max HP fills the half

type Lane = { player: string; job: string; up: boolean };

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

function Clock({ pull, tanking, lanes, changes, hover }: {
  pull: Pull; tanking: PullTanking; lanes: Lane[]; changes: TankChange[]; hover: Set<TankChange>;
}) {
  const dur = pull.fightDuration;
  const mid = lanes.some((l) => l.up) ? HALF + 14 : 4;
  const height = mid + (lanes.some((l) => !l.up) ? HALF + 14 : 14);
  const x = (ms: number) => LEFT + (Math.min(ms, dur) / dur) * (W - LEFT - 20);
  const binW = Math.max(1, x(2000) - x(0) - 1);
  const text = { fontSize: 10, fill: "var(--ck-text-3)" };
  const ticks: number[] = [];
  for (let s = 0; s <= dur; s += 30_000) ticks.push(s);

  return (
    <svg viewBox={`0 0 ${W} ${height}`} width="100%" style={{ display: "block", minWidth: 620 }}>
      {ticks.map((s) => (
        <g key={s}>
          <line x1={x(s)} x2={x(s)} y1={mid - HALF} y2={mid + HALF} stroke="var(--ck-line)" />
          <text x={x(s)} y={mid + 4} textAnchor="middle" style={text}>{fmtTime(s)}</text>
        </g>
      ))}
      {lanes.map((lane) => {
        const stream = tanking.tanks.find((s) => s.player === lane.player);
        const color = getClassColor("ffxiv", lane.job);
        const sign = lane.up ? -1 : 1;
        const base = mid + sign * GAP;
        const bandY = lane.up ? mid - HALF : base;
        const bandH = HALF - GAP;
        const casts = tankCasts(pull, FFXIV_MITIGATION, lane.player);
        const bins = new Map<number, Record<(typeof STACK)[number], number>>();
        for (const e of stream?.events ?? []) {
          const i = Math.floor(e.timestampMs / 2000);
          const b = bins.get(i) ?? { auto: 0, buster: 0, other: 0, tick: 0 };
          b[e.kind] += e.taken;
          bins.set(i, b);
        }
        const holds = tanking.tanking.filter((s) => s.player === lane.player && s.autos >= 3);
        const mine = changes.filter((c) => placement(c).on === lane.player);
        return (
          <g key={lane.player}>
            <text x={0} y={lane.up ? mid - 60 : mid + 70} style={{ fontSize: 13, fontWeight: 600, fill: color }}>{firstName(lane.player)}</text>
            <text x={0} y={lane.up ? mid - 45 : mid + 85} style={text}>{lane.up ? "MT" : "OT"} · {lane.job}</text>
            {holds.map((h, i) => (
              <g key={i}>
                <title>{`${firstName(lane.player)} holds ${h.source} ${fmtTime(h.startMs)}–${fmtTime(h.endMs)}`}</title>
                <rect x={x(h.startMs)} y={lane.up ? mid - HALF - 4 : mid + HALF + 1} width={Math.max(1, x(h.endMs) - x(h.startMs))} height={3}
                  fill="var(--ck-text-3)" opacity={0.5} />
              </g>
            ))}
            {casts.filter((c) => c.kind !== "short").map((c, i) => {
              const fill = c.kind === "invuln" ? INVULN_COLOR : getClassColor("ffxiv", pull.players.find((p) => p.name === c.by)?.className ?? lane.job);
              const by = c.by !== lane.player ? ` (${firstName(c.by)})` : "";
              return (
                <g key={i}>
                  <title>{`${c.name}${by} ${fmtTime(c.atMs)}–${fmtTime(c.atMs + c.durationMs)}`}</title>
                  <rect x={x(c.atMs)} y={bandY} width={Math.max(1, x(c.atMs + c.durationMs) - x(c.atMs))} height={bandH} fill={fill} opacity={0.12} />
                  <text x={x(c.atMs) + 2} y={lane.up ? mid - HALF + 10 + (i % 2) * 10 : mid + HALF - 2 - (i % 2) * 10}
                    style={{ fontSize: 9, fill }}>{c.name}{by}</text>
                </g>
              );
            })}
            {[...bins].map(([i, b]) => {
              let off = 0;
              return STACK.filter((k) => b[k] > 0).map((k) => {
                const h = Math.min(bandH - 3, (b[k] / BAR_FULL) * (bandH - 3));
                const y = lane.up ? base - off - h : base + off;
                off += h;
                return (
                  <rect key={`${i}${k}`} x={x(i * 2000) + 0.5} y={y} width={binW} height={h} fill={KIND_COLOR[k]}>
                    <title>{`${firstName(lane.player)} ${fmtTime(i * 2000)}: ${KIND_LABEL[k]} ${pct(b[k])} of max HP`}</title>
                  </rect>
                );
              });
            })}
            {casts.filter((c) => c.kind === "short").map((c, i) => (
              <circle key={i} cx={x(c.atMs)} cy={lane.up ? mid - GAP + 3 : mid + GAP - 3} r={1.8} fill={color} opacity={0.8}>
                <title>{`${c.name}${c.by !== lane.player ? ` (${firstName(c.by)})` : ""} ${fmtTime(c.atMs)}`}</title>
              </circle>
            ))}
            {mine.map((c, i) => {
              const p = placement(c);
              const lit = hover.size === 0 || hover.has(c);
              return (
                <g key={i} opacity={lit ? 1 : 0.3}>
                  <title>{`${firstName(c.player)}${c.receiver ? ` → ${firstName(c.receiver)}` : ""}: ${c.name} ${c.kind === "add" ? "extra use" : "use here"} at ${fmtTime(p.atMs)}`}</title>
                  <rect x={x(p.atMs)} y={bandY} width={x(p.atMs + p.durationMs) - x(p.atMs)} height={bandH} fill="none"
                    stroke={MOVE_COLOR} strokeWidth={hover.has(c) ? 2.5 : 1.5} strokeDasharray="4 3" />
                  <text x={x(p.atMs) + 2} y={lane.up ? mid - HALF - 7 : mid + HALF + 12} style={{ fontSize: 10, fill: MOVE_COLOR }}>
                    {c.kind === "add" ? "+ " : "→ "}{c.name}
                  </text>
                  {hover.has(c) && p.fromMs !== undefined && (
                    <rect x={x(p.fromMs)} y={bandY} width={x(p.fromMs + p.durationMs) - x(p.fromMs)} height={bandH} fill="none"
                      stroke={NOW_COLOR} strokeWidth={1.5} strokeDasharray="2 3" />
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
      {tanking.busters.filter((b) => b.tanks.some((t) => lanes.some((l) => l.player === t.player))).map((b) => {
        const mortal = b.tanks.filter((t) => !t.invuln && lanes.some((l) => l.player === t.player));
        const worst = mortal.length ? Math.min(...mortal.map((t) => t.margin)) : undefined;
        const v: TankVerdict = worst === undefined ? "invuln" : marginVerdict(worst);
        return (
          <g key={b.id}>
            <title>{`${b.abilityName} #${b.occurrence} ${fmtTime(b.timestampMs)}: ${b.tanks.map((t) => `${firstName(t.player)} ${t.invuln ? "invuln" : pct(t.margin)}`).join(", ")}`}</title>
            <line x1={x(b.timestampMs)} x2={x(b.timestampMs)} y1={mid - HALF} y2={mid + HALF} stroke={KIND_COLOR.buster} strokeDasharray="2 3" />
            <text x={x(b.timestampMs) + 3} y={lanes.some((l) => l.up) ? mid - HALF + 22 : mid + 22} style={{ fontSize: 10, fill: tankVerdictColor(v) }}>
              {b.abilityName} #{b.occurrence} {worst === undefined ? "invuln" : pct(worst)}
            </text>
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
      <span><Swatch color="var(--ck-text-3)" />cooldown bands</span>
      <span><Swatch color={INVULN_COLOR} />invulns</span>
      <span style={{ color: MOVE_COLOR }}>┅ proposed</span>
    </div>
  );
}
function Swatch({ color }: { color: string }) {
  return <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 1, background: color, marginRight: 4, verticalAlign: -1 }} />;
}

// ── Chips, short cooldowns, cards ──────────────────────────────────────

export type BusterChip = {
  id: string; name: string; atMs: number; kind: BusterKind; pulls: number;
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
      id: r.id, name: `${r.abilityName} #${r.occurrence}`, atMs: r.medianMs, kind: r.kind, pulls: r.pulls,
      tanks: [...byTank].map(([player, x]) => ({ player, margin: x.margins.length ? median(x.margins) : undefined, invulnPulls: x.invuln, pulls: x.pulls })),
    };
  });
}
/** Chips from one pull's busters. */
export function chipsFromPull(busters: Buster[]): BusterChip[] {
  return busters.map((b) => ({
    id: b.id, name: `${b.abilityName} #${b.occurrence}`, atMs: b.timestampMs, kind: b.kind, pulls: 1,
    tanks: b.tanks.map((t) => ({ player: t.player, margin: t.invuln ? undefined : t.margin, invulnPulls: t.invuln ? 1 : 0, pulls: 1 })),
  }));
}

function Chips({ chips, onOpen }: { chips: BusterChip[]; onOpen: (id: string) => void }) {
  if (!chips.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {chips.map((c) => (
        <button key={c.id} className="ck-btn ck-btn--xs" title="Open in the Timeline" onClick={() => onOpen(c.id)}
          style={{ display: "inline-flex", gap: 6, alignItems: "baseline" }}>
          <span>{c.name}</span>
          <span style={dim}>{fmtTime(c.atMs)} · {BUSTER_LABEL[c.kind]}</span>
          {c.tanks.map((t) => {
            const invuln = t.margin === undefined;
            const color = invuln ? INVULN_COLOR : tankVerdictColor(marginVerdict(t.margin!));
            return (
              <span key={t.player} title={t.invulnPulls ? `Under an invuln in ${t.invulnPulls} of ${t.pulls} pulls` : undefined}>
                {c.tanks.length > 1 && <span style={dim}>{firstName(t.player)} </span>}
                <span className="ck-num" style={{ color }}>{invuln ? "invuln" : pct(t.margin!)}</span>
              </span>
            );
          })}
        </button>
      ))}
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
          <b style={{ color: "var(--ck-text)" }}>{firstName(u.player)}</b> {u.name}:{" "}
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
      {who}{c.receiver && <> → <b>{firstName(c.receiver)}</b></>}: <b>{c.name}</b>{" "}
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
  else if (!windowPulls) advice = <p className="ck-dialog-text" style={{ margin: 0 }}>Changes need {PLAN_MIN_PULLS} pulls with the tanks on their current jobs.</p>;
  else if (plan && !groups.length) advice = <p className="ck-dialog-text" style={{ margin: 0 }}>{focusTank ? `No change for ${firstName(focusTank)} this round.` : "No change worth making in these pulls."}</p>;
  else advice = groups.map((g, i) => <Card key={i} group={g} onHover={setHover} />);

  return (
    <div style={{ padding: "8px 12px 12px", display: "grid", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {allPulls && (
          <label style={{ fontSize: 12, color: "var(--ck-text-2)", display: "inline-flex", alignItems: "center", gap: 5 }}>
            Last
            <input className="ck-field" type="number" min={PLAN_MIN_PULLS} max={groupPulls} placeholder={String(Math.min(PLAN_WINDOW_DEFAULT, groupPulls))}
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
        <div style={{ flex: "1 1 620px", minWidth: 0, display: "grid", gap: 8 }}>
          <Legend />
          {shown && lanes.length > 0
            ? <div style={{ overflowX: "auto" }}><Clock pull={shown.pull} tanking={shown.tanking} lanes={lanes} changes={changes} hover={new Set(hover?.changes ?? [])} /></div>
            : <p className="ck-dialog-text" style={{ margin: 0 }}>No tank damage in this pull.</p>}
          <Chips chips={shownChips} onOpen={onOpenBuster} />
          <ShortCooldowns unused={shownUnused} />
        </div>
        <div style={{ flex: "0 1 320px", minWidth: 260, display: "grid", gap: 8, alignContent: "start" }}>{advice}</div>
      </div>
    </div>
  );
}
