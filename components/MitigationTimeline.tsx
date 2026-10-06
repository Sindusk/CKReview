"use client";

// components/MitigationTimeline.tsx
//
// The Mitigation dialog's timeline (docs/mitigation-redesign.md, UI): one
// row per raidwide hit in fight order, grouped by phase. Columns are grouped
// per player in party-slot order (MT, OT, H1, H2, M1, M2, R1, R2), with a
// rule between players. Each group shows that player's party-wide
// mitigation; personal mitigation is collapsed and expands per player.
// Side columns carry the damage, the lowest player's margin, the verdict
// and how many party mitigations the hit could do without. In "all pulls"
// mode each row is a hit matched across pulls (lib/mitigation/aggregate.ts)
// and each cell counts pulls.
//
// All numbers come from lib/mitigation/analyze.ts; this file only lays
// them out. Tooltips use the native `title` attribute.

import type { CSSProperties, ReactNode } from "react";
import type { Pull } from "@/types/Pull";
import type { MitigationHit, MitigationKind, MitigationState, PlayerMitigation } from "@/lib/mitigation/types";
import type { AggregatedHit } from "@/lib/mitigation/aggregate";
import { FFXIV_MITIGATION } from "@/lib/mitigation/ffxiv-catalog";
import { detectFFRoles, FF_ROLE_SLOTS } from "@/lib/mechanics/ffxiv/roles";
import { getClassColor } from "@/lib/player-display";

export type MitigationColumn = {
  player: string;
  job:    string;
  key:    string;
  name:   string;
  kind:   MitigationKind;
  icon?:  string;
};

export type PlayerGroup = {
  player:   string;
  job:      string;
  slot?:    string;
  party:    MitigationColumn[];
  personal: MitigationColumn[];
};

const STATE_STYLE: Record<MitigationState, { mark: string; color: string; label: string }> = {
  used:        { mark: "●", color: "#4ade80", label: "Used on this hit" },
  free:        { mark: "◆", color: "#fbbf24", label: "Free: a full cooldown since their last cast, and a full cooldown before their next one" },
  available:   { mark: "○", color: "#94a3b8", label: "Available, but using it here would delay their next use" },
  cooldown:    { mark: "·", color: "#475569", label: "On cooldown" },
  ineffective: { mark: "✕", color: "#f87171", label: "Cast and still running, but not on this hit (wrong target or out of range)" },
  dead:        { mark: "–", color: "#666",    label: "Dead or just raised" },
};

const VERDICT_STYLE: Record<string, { color: string; label: string }> = {
  under: { color: "#ef4444", label: "Under" },
  tight: { color: "#22c55e", label: "Tight" },
  over:  { color: "#53a9ff", label: "Over" },
};

const KIND_ORDER: MitigationKind[] = ["bossDebuff", "partyBuff", "shield", "personal", "limitBreak", "invuln"];

export function fmtTime(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const fmtDamage = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : `${Math.round(n / 1000)}k`);
const colKey = (c: MitigationColumn) => `${c.player}|${c.key}`;

/**
 * One group per player, in party-slot order (taken from the latest pull;
 * players only seen in earlier pulls go last), each split into party-wide
 * and personal columns.
 */
export function buildPlayerGroups(pulls: Pull[]): PlayerGroup[] {
  const groups = new Map<string, PlayerGroup>();
  for (const pull of pulls) {
    for (const player of pull.players) {
      const g = groups.get(player.name) ?? { player: player.name, job: player.className, party: [], personal: [] };
      for (const entry of FFXIV_MITIGATION.catalog) {
        if (!entry.jobs.includes(player.className) || entry.inSheet === false) continue;
        if (entry.cooldownMs === 0 || entry.kind === "invuln" || entry.kind === "limitBreak") continue;
        const list = entry.reach === "party" ? g.party : g.personal;
        if (list.some((c) => c.key === entry.key)) continue;
        const icon = player.casts.find((c) => entry.actionIds.includes(c.abilityId) && c.abilityIcon)?.abilityIcon;
        list.push({ player: player.name, job: player.className, key: entry.key, name: entry.name, kind: entry.kind, icon });
      }
      groups.set(player.name, g);
    }
  }
  const latest = pulls[pulls.length - 1];
  if (latest) {
    for (const r of detectFFRoles(latest.players)) {
      const g = r.player && groups.get(r.player.name);
      if (g) g.slot = r.slot;
    }
  }
  const byKind = (a: MitigationColumn, b: MitigationColumn) =>
    KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.name.localeCompare(b.name);
  const slotIndex = (g: PlayerGroup) => (g.slot ? FF_ROLE_SLOTS.indexOf(g.slot as (typeof FF_ROLE_SLOTS)[number]) : 99);
  return [...groups.values()]
    .map((g) => ({ ...g, party: g.party.sort(byKind), personal: g.personal.sort(byKind) }))
    .sort((a, b) => slotIndex(a) - slotIndex(b) || a.player.localeCompare(b.player));
}

type VisibleGroup = { group: PlayerGroup; columns: (MitigationColumn | null)[] };

function visibleGroups(groups: PlayerGroup[], expanded: Set<string>): VisibleGroup[] {
  return groups.map((group) => {
    const cols: (MitigationColumn | null)[] = [...group.party, ...(expanded.has(group.player) ? group.personal : [])];
    // A player with nothing party-wide still gets one (empty) column, so
    // their group and expand toggle stay visible.
    return { group, columns: cols.length ? cols : [null] };
  });
}

// ── Shared cell styles ─────────────────────────────────────────────────

const HEAD_ROW_1 = 26;
const GROUP_RULE = "2px solid var(--ck-frame-soft)";
const th: CSSProperties = {
  position: "sticky", top: 0, zIndex: 2, padding: "4px 6px", fontSize: 10, fontWeight: 600,
  color: "var(--ck-text-gold)", background: "#15191c", borderBottom: "1px solid var(--ck-frame-soft)",
  textAlign: "left", whiteSpace: "nowrap",
};
const td: CSSProperties = {
  padding: "3px 6px", fontSize: 12, color: "var(--ck-text-2)", borderTop: "1px solid var(--ck-line)",
  whiteSpace: "nowrap", background: "var(--ck-bg-deep)",
};
const stickyLeft = (left: number): CSSProperties => ({ position: "sticky", left, zIndex: 1 });
const cellTd: CSSProperties = { ...td, textAlign: "center", padding: "3px 2px", minWidth: 26 };
const ruled = (first: boolean): CSSProperties => (first ? { borderLeft: GROUP_RULE } : {});

const SIDE_HEADERS = ["Time", "Mechanic", "Damage", "Lowest", "Verdict", "Droppable"];

function TimelineHead({ groups, expanded, onToggle, lowestLabel }: {
  groups: VisibleGroup[]; expanded: Set<string>; onToggle: (player: string) => void; lowestLabel: string;
}) {
  return (
    <thead>
      <tr style={{ height: HEAD_ROW_1 }}>
        {SIDE_HEADERS.map((h, i) => (
          <th key={h} rowSpan={2} style={{ ...th, ...(i < 2 ? stickyLeft(i === 0 ? 0 : 44) : {}), zIndex: i < 2 ? 4 : 3, verticalAlign: "bottom" }}
            title={h === "Droppable" ? "How many party-wide mitigations this hit could do without, with the lowest player still at 5%+ after follow-up damage and a 5% damage roll" : undefined}>
            {h === "Lowest" ? lowestLabel : h}
          </th>
        ))}
        {groups.map(({ group, columns }) => {
          const open = expanded.has(group.player);
          return (
            <th key={group.player} colSpan={columns.length}
              style={{ ...th, borderLeft: GROUP_RULE, textAlign: "center", padding: "3px 4px", height: HEAD_ROW_1, boxSizing: "border-box" }}
              title={`${group.player} (${group.job})`}>
              <span style={{ color: getClassColor("ffxiv", group.job) }}>{group.slot ?? group.job.slice(0, 3)}</span>
              {group.personal.length > 0 && (
                <button className="ck-btn ck-btn--sm" onClick={() => onToggle(group.player)}
                  style={{ marginLeft: 4, padding: "0 4px", fontSize: 10, lineHeight: "14px" }}
                  title={open ? "Hide personal mitigation" : `Show ${group.personal.length} personal mitigation${group.personal.length > 1 ? "s" : ""}`}>
                  {open ? "−" : `+${group.personal.length}`}
                </button>
              )}
            </th>
          );
        })}
      </tr>
      <tr>
        {groups.flatMap(({ group, columns }) => columns.map((col, i) => {
          const style: CSSProperties = { ...th, top: HEAD_ROW_1, textAlign: "center", padding: "3px 2px", minWidth: 26, ...ruled(i === 0) };
          if (!col) return <th key={`${group.player}|empty`} style={style} />;
          const personal = group.personal.includes(col);
          return (
            <th key={colKey(col)} style={{ ...style, background: personal ? "#1b1712" : th.background }} title={`${col.player} (${col.job}) — ${col.name}${personal ? " (personal)" : ""}`}>
              {col.icon
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={col.icon} alt={col.name} width={20} height={20} style={{ display: "block", margin: "0 auto", borderRadius: 3 }} />
                : <span style={{ fontSize: 9 }}>{col.name.slice(0, 4)}</span>}
            </th>
          );
        }))}
      </tr>
    </thead>
  );
}

function MarginCell({ margin, sequenceMargin }: { margin: number; sequenceMargin: number }) {
  const low = Math.min(margin, sequenceMargin);
  const color = low < 0.05 ? "#ef4444" : low < 0.2 ? "#f59e0b" : "var(--ck-text-2)";
  return (
    <span className="ck-num" style={{ color }}>
      {pct(margin)}{sequenceMargin < margin - 0.005 ? <span style={{ color: "var(--ck-text-3)" }}> → {pct(sequenceMargin)}</span> : null}
    </span>
  );
}

function VerdictPill({ verdict }: { verdict: string }) {
  const v = VERDICT_STYLE[verdict];
  return <span style={{ color: v.color, fontWeight: 600, fontSize: 11 }}>{v.label}</span>;
}

function DroppableCell({ count, worstMargin }: { count: number; worstMargin: number }) {
  return (
    <td style={{ ...td, textAlign: "center" }} className="ck-num"
      title={count ? `${count} party-wide mitigation${count > 1 ? "s" : ""} could be dropped; the lowest player would still end at ${pct(worstMargin)}` : "None"}>
      {count || <span style={{ color: "var(--ck-text-3)" }}>—</span>}
    </td>
  );
}

// The label sits in a sticky inline block so it stays in view while the
// table scrolls sideways.
function PhaseRow({ phase, span }: { phase: string; span: number }) {
  return (
    <tr>
      <td colSpan={span} style={{ ...td, background: "#101315", paddingTop: 8 }}>
        <span style={{ position: "sticky", left: 6, display: "inline-block", color: "var(--ck-text-gold)", fontSize: 11, fontWeight: 600 }}>
          {phase}
        </span>
      </td>
    </tr>
  );
}

function stateTooltip(col: MitigationColumn, s: PlayerMitigation, hitMs: number): string {
  const lines = [`${col.player} — ${col.name}`, STATE_STYLE[s.state].label];
  if (s.lastCastMs !== undefined) lines.push(`Last cast ${fmtTime(s.lastCastMs)} (${Math.round((hitMs - s.lastCastMs) / 1000)}s before)`);
  if (s.readyMs !== undefined && Number.isFinite(s.readyMs)) lines.push(`Back at ${fmtTime(s.readyMs)}`);
  if (s.nextCastMs !== undefined) lines.push(`Next cast ${fmtTime(s.nextCastMs)}`);
  if (s.approximate) lines.push("Approximate: gated by another action or a gauge");
  return lines.join("\n");
}

function hitTooltip(hit: MitigationHit): string {
  const lines = [`${hit.abilityName} #${hit.occurrence} at ${fmtTime(hit.timestampMs)}, ${hit.targets.length} targets, ${hit.damageColumn ?? "unknown"} damage`];
  if (hit.castMs !== undefined) lines.push(`Boss cast at ${fmtTime(hit.castMs)}`);
  lines.push("Active:");
  for (const a of hit.active) lines.push(`  ${a.name} (${a.casters.join(", ") || "caster not found"}) on ${a.targets}`);
  const low = [...hit.targets].sort((a, b) => (a.margin - a.laterDrop) - (b.margin - b.laterDrop))[0];
  if (low) lines.push(`Lowest: ${low.player} at ${pct(low.margin)}${low.laterDrop > 0 ? `, ${pct(low.margin - low.laterDrop)} after follow-up damage` : ""}`);
  for (const t of hit.targets.filter((x) => x.died)) {
    lines.push(`Died: ${t.player}${t.vulnerable ? " (vulnerable)" : ""} — ${t.deathCause === "mitigation" ? "full health before the hit: a mitigation problem" : "low health before the hit: a healing / timing problem"}`);
  }
  for (const t of hit.targets.filter((x) => x.vulnerable && !x.died)) lines.push(`Vulnerable (left out of the margin): ${t.player}`);
  return lines.join("\n");
}

function spanOf(groups: VisibleGroup[]): number {
  return SIDE_HEADERS.length + groups.reduce((s, g) => s + g.columns.length, 0);
}

function sideCells(time: string, mechanic: ReactNode, mechanicTip: string): ReactNode[] {
  return [
    <td key="t" style={{ ...td, ...stickyLeft(0), width: 44 }} className="ck-num">{time}</td>,
    <td key="m" style={{ ...td, ...stickyLeft(44), color: "var(--ck-text)", cursor: "help" }} title={mechanicTip}>{mechanic}</td>,
  ];
}

type TimelineProps = { groups: PlayerGroup[]; expanded: Set<string>; onToggle: (player: string) => void };

// ── Single pull ─────────────────────────────────────────────────────────

export function PullTimeline({ hits, groups, expanded, onToggle }: TimelineProps & { hits: MitigationHit[] }) {
  const visible = visibleGroups(groups, expanded);
  const span = spanOf(visible);
  let lastPhase: string | undefined;
  return (
    <table style={{ borderCollapse: "separate", borderSpacing: 0 }}>
      <TimelineHead groups={visible} expanded={expanded} onToggle={onToggle} lowestLabel="Lowest" />
      <tbody>
        {hits.map((hit) => {
          const byCol = new Map(hit.players.map((p) => [`${p.player}|${p.key}`, p]));
          const phaseRow = hit.phase !== lastPhase ? <PhaseRow key={`ph-${hit.id}`} phase={hit.phase ?? "—"} span={span} /> : null;
          lastPhase = hit.phase;
          return [
            phaseRow,
            <tr key={hit.id}>
              {sideCells(fmtTime(hit.timestampMs),
                <>{hit.abilityName} <span style={{ color: "var(--ck-text-3)" }}>#{hit.occurrence}</span></>, hitTooltip(hit))}
              <td style={td} className="ck-num">{fmtDamage(hit.totalDamage)}</td>
              <td style={td}><MarginCell margin={hit.margin} sequenceMargin={hit.sequenceMargin} /></td>
              <td style={td}>
                <VerdictPill verdict={hit.verdict} />
                {hit.deaths > 0 && <span style={{ color: "#ef4444", fontSize: 11 }}> ☠{hit.deaths}</span>}
              </td>
              <DroppableCell count={hit.droppable.keys.length} worstMargin={hit.droppable.worstMargin} />
              {visible.flatMap(({ group, columns }) => columns.map((c, i) => {
                if (!c) return <td key={`${group.player}|empty`} style={{ ...cellTd, ...ruled(i === 0) }} />;
                const s = byCol.get(colKey(c));
                if (!s) return <td key={colKey(c)} style={{ ...cellTd, ...ruled(i === 0) }} />;
                const st = STATE_STYLE[s.state];
                return (
                  <td key={colKey(c)} style={{ ...cellTd, ...ruled(i === 0), color: st.color, cursor: "help" }} title={stateTooltip(c, s, hit.timestampMs)}>
                    {st.mark}
                  </td>
                );
              }))}
            </tr>,
          ];
        })}
      </tbody>
    </table>
  );
}

// ── All loaded pulls ────────────────────────────────────────────────────

export function AggregateTimeline({ rows, groups, expanded, onToggle }: TimelineProps & { rows: AggregatedHit[] }) {
  const visible = visibleGroups(groups, expanded);
  const span = spanOf(visible);
  let lastPhase: string | undefined;
  return (
    <table style={{ borderCollapse: "separate", borderSpacing: 0 }}>
      <TimelineHead groups={visible} expanded={expanded} onToggle={onToggle} lowestLabel="Lowest (median / worst)" />
      <tbody>
        {rows.map((row) => {
          const counts = new Map<string, Record<MitigationState, number>>();
          for (const { hit } of row.byPull) {
            for (const p of hit.players) {
              const k = `${p.player}|${p.key}`;
              const c = counts.get(k) ?? { used: 0, free: 0, available: 0, cooldown: 0, ineffective: 0, dead: 0 };
              c[p.state]++;
              counts.set(k, c);
            }
          }
          const phaseRow = row.phase !== lastPhase ? <PhaseRow key={`ph-${row.id}`} phase={row.phase ?? "—"} span={span} /> : null;
          lastPhase = row.phase;
          const usual = row.active.map((a) => `${a.name}: ${a.pulls}/${row.pulls} pulls`).join("\n");
          return [
            phaseRow,
            <tr key={row.id}>
              {sideCells(fmtTime(row.medianMs),
                <>{row.abilityName} <span style={{ color: "var(--ck-text-3)" }}>#{row.occurrence}</span>
                  <span style={{ color: "var(--ck-text-3)", fontSize: 10 }}> ×{row.pulls}</span></>,
                `${row.abilityName} #${row.occurrence}, reached in ${row.pulls} pull(s)\nActive:\n${usual}`)}
              <td style={td} className="ck-num">{fmtDamage(median(row.byPull.map((b) => b.hit.totalDamage)))}</td>
              <td style={td}>
                <span className="ck-num">{pct(row.medianMargin)}</span>
                <span className="ck-num" style={{ color: row.worstMargin < 0.05 ? "#ef4444" : "var(--ck-text-3)" }}> / {pct(row.worstMargin)}</span>
              </td>
              <td style={td} title={row.deaths ? `${row.deaths} death(s) in ${row.deathPulls} pull(s), vulnerable players left out` : undefined}>
                <VerdictPill verdict={row.verdict} />
                {row.deaths > 0 && <span style={{ color: "#ef4444", fontSize: 11 }}> ☠{row.deathPulls}</span>}
              </td>
              <DroppableCell count={row.droppable.keys.length} worstMargin={row.droppable.worstMargin} />
              {visible.flatMap(({ group, columns }) => columns.map((c, i) => {
                if (!c) return <td key={`${group.player}|empty`} style={{ ...cellTd, ...ruled(i === 0) }} />;
                const k = colKey(c);
                const n = counts.get(k);
                if (!n) return <td key={k} style={{ ...cellTd, ...ruled(i === 0) }} />;
                const total = row.pulls;
                const used = n.used;
                const shade = used === 0 ? "var(--ck-bg-deep)" : `rgba(74, 222, 128, ${0.12 + 0.5 * (used / total)})`;
                // A diamond only when it was free in at least half the pulls
                // that reached this hit; once in a while isn't a pattern.
                const usuallyFree = used === 0 && n.free * 2 >= total;
                const tip = [`${c.player} — ${c.name}`, `Used ${used}/${total}`, `Free ${n.free}/${total}`, `Available ${n.available}`,
                  `On cooldown ${n.cooldown}`, n.ineffective ? `Ineffective ${n.ineffective}` : "", n.dead ? `Dead ${n.dead}` : ""].filter(Boolean).join("\n");
                return (
                  <td key={k} style={{ ...cellTd, ...ruled(i === 0), background: shade, cursor: "help" }} title={tip}>
                    {used > 0 ? <span className="ck-num" style={{ color: "var(--ck-text)", fontSize: 11 }}>{used}</span>
                      : usuallyFree ? <span style={{ color: STATE_STYLE.free.color }}>◆</span>
                      : <span style={{ color: "var(--ck-text-3)" }}>·</span>}
                  </td>
                );
              }))}
            </tr>,
          ];
        })}
      </tbody>
    </table>
  );
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function TimelineLegend({ aggregate }: { aggregate: boolean }) {
  const item = (mark: string, color: string, text: string) => (
    <span key={text} style={{ marginRight: 12, whiteSpace: "nowrap" }}><span style={{ color }}>{mark}</span> {text}</span>
  );
  return (
    <div className="ck-help" style={{ marginBottom: 8 }}>
      {aggregate
        ? [item("12", "var(--ck-text)", "pulls it was used on this hit (greener = more often)"), item("◆", STATE_STYLE.free.color, "never used here, and free in at least half the pulls")]
        : (Object.keys(STATE_STYLE) as MitigationState[]).map((s) => item(STATE_STYLE[s].mark, STATE_STYLE[s].color, s))}
      <span style={{ whiteSpace: "nowrap" }}>
        Party-wide mitigation shown; +N on a player opens their personal ones. Verdict on the lowest player after follow-up damage:{" "}
        <span style={{ color: VERDICT_STYLE.under.color }}>under</span> &lt;5%, <span style={{ color: VERDICT_STYLE.tight.color }}>tight</span> 5–20%,{" "}
        <span style={{ color: VERDICT_STYLE.over.color }}>over</span> 20%+.
      </span>
    </div>
  );
}

/** True when the pull carries the fields the analysis reads (fetched after 2026-10-06). */
export function hasMitigationData(pull: Pull): boolean {
  return pull.players.some((p) => p.damageTaken.some((e) => e.statusIds !== undefined || e.multiplier !== undefined));
}
