"use client";

// components/MitigationTimeline.tsx
//
// The Mitigation dialog's timeline (docs/archive/mitigation-redesign.md, UI): one
// row per hit (lib/mitigation/analyze.ts says what counts) in fight order,
// grouped by phase. Columns are grouped
// per player in party-slot order (MT, OT, H1, H2, M1, M2, R1, R2), with a
// rule between players. Each group shows that player's party-wide
// mitigation; personal mitigation is collapsed and expands per player.
// Beside the time and mechanic, one Outcome column shows the lowest
// player's HP after the hit and the verdict; a Notes column on the far
// right says what could change. Clicking a row opens its details
// (components/MitigationHitDetails.tsx): health before and after with who
// was lowest, raw, mitigated and taken damage, and the options with their
// estimates (user, 2026-10-09). In "all pulls" mode each row is a hit
// matched across pulls (lib/mitigation/aggregate.ts) and each cell counts
// pulls.
//
// Cells mark only what can be acted on (user, 2026-10-09): used, cast but
// not on the hit, and free only on a hit that went short (under or fail).
// Cooldown and plain availability stay in the cell's tooltip.
//
// All numbers come from lib/mitigation/analyze.ts; this file only lays
// them out. Cell tooltips use the native `title` attribute.

import type { CSSProperties, ReactNode } from "react";
import type { Pull } from "@/types/Pull";
import type { HitVerdict, MitigationHit, MitigationKind, MitigationState, PlayerMitigation } from "@/lib/mitigation/types";
import type { AggregatedHit } from "@/lib/mitigation/aggregate";
import { MARGIN_OVER, MARGIN_UNDER, verdictFor } from "@/lib/mitigation/analyze";
import { FFXIV_MITIGATION } from "@/lib/mitigation/ffxiv-catalog";
import { detectFFRoles, FF_ROLE_SLOTS } from "@/lib/mechanics/ffxiv/roles";
import { getClassColor } from "@/lib/player-display";
import { getFFAbilityIconUrl } from "@/lib/ability-icons";
import { InfoTip } from "./ui/InfoTip";

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

export const STATE_STYLE: Record<MitigationState, { mark: string; color: string; label: string }> = {
  used:        { mark: "●", color: "#4ade80", label: "Used on this hit" },
  free:        { mark: "◆", color: "#fbbf24", label: "Free: a full cooldown since their last cast, and a full cooldown before their next one" },
  available:   { mark: "○", color: "#94a3b8", label: "Available, but using it here would delay their next use" },
  cooldown:    { mark: "·", color: "#475569", label: "On cooldown" },
  ineffective: { mark: "✕", color: "#f87171", label: "Cast and still running, but not on this hit (wrong target or out of range)" },
};

// A dead (or just raised) player's cells keep their red background, so
// their stretch of the fight reads as one band.
const DEAD_CELL_BG = "rgba(239, 68, 68, 0.28)";
const SELECTED_BG = "#1c2833";

export const VERDICT_STYLE: Record<HitVerdict, { color: string; label: string }> = {
  fail:  { color: "#ef4444", label: "Fail" },
  under: { color: "#f59e0b", label: "Under" },
  good:  { color: "#22c55e", label: "Good" },
  over:  { color: "#53a9ff", label: "Over" },
};

/** HP after a hit, colored like the verdict it lands in. */
export const afterColor = (margin: number) => VERDICT_STYLE[verdictFor(margin, 0)].color;

// Health at or above this counts as full going into a hit.
export const FULL_HEALTH = 0.995;

const KIND_ORDER: MitigationKind[] = ["bossDebuff", "partyBuff", "shield", "personal", "limitBreak", "invuln"];

export function fmtTime(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export const pctHp = (x: number) => `${Math.round(Math.max(0, x) * 100)}%`;
const colKey = (c: MitigationColumn) => `${c.player}|${c.key}`;
const short = (v: HitVerdict) => v === "under" || v === "fail";

/**
 * A raid hit nobody died to, taken at full health: nothing to look at
 * (user, 2026-10-09). Tank busters always stay.
 */
export const uneventful = (hit: MitigationHit) => !hit.tankOnly && hit.deaths === 0 && hit.lowestBefore >= FULL_HEALTH;
export const rowUneventful = (row: AggregatedHit) => row.byPull.every((b) => uneventful(b.hit));

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
        // From the catalog, so a column has its icon even when nobody cast
        // it in these pulls; a cast's own icon is the fallback.
        const icon = getFFAbilityIconUrl(entry.icon)
          ?? player.casts.find((c) => entry.actionIds.includes(c.abilityId) && c.abilityIcon)?.abilityIcon;
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
const selectedBg = (selected: boolean): CSSProperties => (selected ? { background: SELECTED_BG } : {});

const TIME_WIDTH = 44;
const SIDE_HEADERS = ["Time", "Mechanic", "Outcome"];

const HEADER_TIPS: Record<string, string> = {
  "Outcome": `Lowest player's HP after the hit (vulnerable players and invulnerable tanks left out), and the verdict. Fail: someone died. Under: below ${Math.round(MARGIN_UNDER * 100)}%. Good: ${Math.round(MARGIN_UNDER * 100)}-${Math.round(MARGIN_OVER * 100)}%. Over: ${Math.round(MARGIN_OVER * 100)}%+.`,
  "Notes":   "What could change on this hit.",
};

function TimelineHead({ groups, expanded, onToggle, aggregate }: {
  groups: VisibleGroup[]; expanded: Set<string>; onToggle: (player: string) => void; aggregate: boolean;
}) {
  return (
    <thead>
      <tr style={{ height: HEAD_ROW_1 }}>
        {SIDE_HEADERS.map((h, i) => (
          <th key={h} rowSpan={2} style={{ ...th, ...(i < 2 ? stickyLeft(i === 0 ? 0 : TIME_WIDTH) : {}), zIndex: i < 2 ? 4 : 3, verticalAlign: "bottom" }}
            title={h === "Outcome" ? `${HEADER_TIPS.Outcome}${aggregate ? " Median over pulls, then the worst pull." : ""}` : undefined}>
            {h}
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
        <th rowSpan={2} style={{ ...th, ...notesWidth, zIndex: 3, verticalAlign: "bottom", borderLeft: GROUP_RULE }} title={HEADER_TIPS.Notes}>Notes</th>
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

const BAR_WIDTH = 36;

/** A small HP bar, its percentage, an optional worst-pull percentage, and the verdict word. */
function OutcomeCell({ after, worst, verdict, selected }: { after: number; worst?: number; verdict: HitVerdict; selected: boolean }) {
  const v = VERDICT_STYLE[verdict];
  return (
    <td style={{ ...td, ...selectedBg(selected) }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: BAR_WIDTH, height: 6, borderRadius: 2, background: "var(--ck-line-2)", overflow: "hidden", flex: "0 0 auto" }}>
          <span style={{ display: "block", height: "100%", width: `${Math.min(1, Math.max(0, after)) * 100}%`, background: afterColor(after) }} />
        </span>
        <span className="ck-num" style={{ color: afterColor(after), minWidth: 30 }}>{pctHp(after)}</span>
        {worst !== undefined && <span className="ck-num" style={{ color: afterColor(worst), fontSize: 11 }}>/ {pctHp(worst)}</span>}
        <span style={{ color: v.color, fontWeight: 600, fontSize: 11 }}>{v.label}</span>
      </span>
    </td>
  );
}

// One line, cut with an ellipsis; the full note is in the tooltip. The
// table is full width and this column takes whatever the others leave
// (width 100% with maxWidth 0), so it grows on pulls with few columns and
// shrinks, down to NOTES_MIN_WIDTH, when personal columns open, instead of
// pushing the table into a horizontal scroll.
const NOTES_MIN_WIDTH = 140;
const notesWidth: CSSProperties = { width: "100%", maxWidth: 0, minWidth: NOTES_MIN_WIDTH };
const tableStyle: CSSProperties = { borderCollapse: "separate", borderSpacing: 0, width: "100%" };

function NoteCell({ note, selected }: { note: string; selected: boolean }) {
  return (
    <td title={note || undefined} style={{
      ...td, ...notesWidth, overflow: "hidden", textOverflow: "ellipsis", borderLeft: GROUP_RULE, color: "var(--ck-text)",
      ...selectedBg(selected),
    }}>
      {note || <span style={{ color: "var(--ck-text-3)" }}>—</span>}
    </td>
  );
}

export function MechanicLabel({ name, occurrence, waves, tankOnly, pulls }: {
  name: string; occurrence: number; waves: number; tankOnly: boolean; pulls?: number;
}) {
  const dim = { color: "var(--ck-text-3)" };
  return (
    <>
      {name} <span style={dim}>#{occurrence}</span>
      {waves > 1 && <span style={{ ...dim, fontSize: 10 }}> {waves} hits</span>}
      {tankOnly && <span style={{ ...dim, fontSize: 10 }}> tanks</span>}
      {pulls !== undefined && <span style={{ ...dim, fontSize: 10 }}> ×{pulls}</span>}
    </>
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
  const lines = [`${col.player} — ${col.name}`, ...(s.dead ? ["Dead or just raised"] : []), STATE_STYLE[s.state].label];
  if (s.lastCastMs !== undefined) lines.push(`Last cast ${fmtTime(s.lastCastMs)} (${Math.round((hitMs - s.lastCastMs) / 1000)}s before)`);
  if (s.readyMs !== undefined && Number.isFinite(s.readyMs)) lines.push(`Back at ${fmtTime(s.readyMs)}`);
  if (s.nextCastMs !== undefined) lines.push(`Next cast ${fmtTime(s.nextCastMs)}`);
  if (s.approximate) lines.push("Approximate: gated by another action or a gauge");
  return lines.join("\n");
}

function spanOf(groups: VisibleGroup[]): number {
  return SIDE_HEADERS.length + groups.reduce((s, g) => s + g.columns.length, 0) + 1;
}

function sideCells(time: string, mechanic: ReactNode, selected: boolean): ReactNode[] {
  return [
    <td key="t" style={{ ...td, ...stickyLeft(0), width: TIME_WIDTH, ...selectedBg(selected) }} className="ck-num">{time}</td>,
    <td key="m" style={{ ...td, ...stickyLeft(TIME_WIDTH), color: "var(--ck-text)", ...selectedBg(selected) }}>{mechanic}</td>,
  ];
}

type TimelineProps = {
  groups:     PlayerGroup[];
  expanded:   Set<string>;
  onToggle:   (player: string) => void;
  selectedId: string | null;
  // Clicking the selected row again closes its details.
  onSelect:   (id: string | null) => void;
};

const rowStyle: CSSProperties = { cursor: "pointer" };

// ── Single pull ─────────────────────────────────────────────────────────

export function PullTimeline({ hits, groups, expanded, onToggle, selectedId, onSelect }: TimelineProps & { hits: MitigationHit[] }) {
  const visible = visibleGroups(groups, expanded);
  const span = spanOf(visible);
  let lastPhase: string | undefined;
  return (
    <table style={tableStyle}>
      <TimelineHead groups={visible} expanded={expanded} onToggle={onToggle} aggregate={false} />
      <tbody>
        {hits.map((hit) => {
          const byCol = new Map(hit.players.map((p) => [`${p.player}|${p.key}`, p]));
          const phaseRow = hit.phase !== lastPhase ? <PhaseRow key={`ph-${hit.id}`} phase={hit.phase ?? "—"} span={span} /> : null;
          lastPhase = hit.phase;
          const selected = hit.id === selectedId;
          return [
            phaseRow,
            <tr key={hit.id} style={rowStyle} onClick={() => onSelect(selected ? null : hit.id)}>
              {sideCells(fmtTime(hit.timestampMs),
                <MechanicLabel name={hit.abilityNames.join(" + ")} occurrence={hit.occurrence} waves={hit.waves} tankOnly={hit.tankOnly} />, selected)}
              <OutcomeCell after={hit.margin} verdict={hit.verdict} selected={selected} />
              {visible.flatMap(({ group, columns }) => columns.map((c, i) => {
                const base = { ...cellTd, ...ruled(i === 0), ...selectedBg(selected) };
                if (!c) return <td key={`${group.player}|empty`} style={base} />;
                const s = byCol.get(colKey(c));
                if (!s) return <td key={colKey(c)} style={base} />;
                const st = STATE_STYLE[s.state];
                const shown = s.state === "used" || s.state === "ineffective" || (s.state === "free" && short(hit.verdict));
                return (
                  <td key={colKey(c)} title={stateTooltip(c, s, hit.timestampMs)} style={{
                    ...base, color: st.color, ...(s.dead ? { background: DEAD_CELL_BG } : {}),
                  }}>
                    {shown ? st.mark : ""}
                  </td>
                );
              }))}
              <NoteCell note={hit.note} selected={selected} />
            </tr>,
          ];
        })}
      </tbody>
    </table>
  );
}

// ── All loaded pulls ────────────────────────────────────────────────────

export function AggregateTimeline({ rows, groups, expanded, onToggle, selectedId, onSelect }: TimelineProps & { rows: AggregatedHit[] }) {
  const visible = visibleGroups(groups, expanded);
  const span = spanOf(visible);
  let lastPhase: string | undefined;
  return (
    <table style={tableStyle}>
      <TimelineHead groups={visible} expanded={expanded} onToggle={onToggle} aggregate />
      <tbody>
        {rows.map((row) => {
          const counts = new Map<string, Record<MitigationState | "dead", number>>();
          for (const { hit } of row.byPull) {
            for (const p of hit.players) {
              const k = `${p.player}|${p.key}`;
              const c = counts.get(k) ?? { used: 0, free: 0, available: 0, cooldown: 0, ineffective: 0, dead: 0 };
              c[p.state]++;
              if (p.dead) c.dead++;
              counts.set(k, c);
            }
          }
          const phaseRow = row.phase !== lastPhase ? <PhaseRow key={`ph-${row.id}`} phase={row.phase ?? "—"} span={span} /> : null;
          lastPhase = row.phase;
          const selected = row.id === selectedId;
          return [
            phaseRow,
            <tr key={row.id} style={rowStyle} onClick={() => onSelect(selected ? null : row.id)}>
              {sideCells(fmtTime(row.medianMs),
                <MechanicLabel name={row.byPull[0].hit.abilityNames.join(" + ")} occurrence={row.occurrence} pulls={row.pulls}
                  waves={Math.max(...row.byPull.map((b) => b.hit.waves))} tankOnly={row.byPull.every((b) => b.hit.tankOnly)} />, selected)}
              <OutcomeCell after={row.medianMargin} worst={row.worstMargin} verdict={row.verdict} selected={selected} />
              {visible.flatMap(({ group, columns }) => columns.map((c, i) => {
                const base = { ...cellTd, ...ruled(i === 0), ...selectedBg(selected) };
                if (!c) return <td key={`${group.player}|empty`} style={base} />;
                const k = colKey(c);
                const n = counts.get(k);
                if (!n) return <td key={k} style={base} />;
                const total = row.pulls;
                const used = n.used;
                const shade = used === 0 ? undefined : `rgba(74, 222, 128, ${0.12 + 0.5 * (used / total)})`;
                // A diamond only on a short hit, and only when it was free
                // in at least half the pulls that reached it; once in a
                // while isn't a pattern.
                const usuallyFree = used === 0 && n.free * 2 >= total && short(row.verdict);
                const tip = [`${c.player} — ${c.name}`, `Used ${used}/${total}`, `Free ${n.free}/${total}`, `Available ${n.available}`,
                  `On cooldown ${n.cooldown}`, n.ineffective ? `Ineffective ${n.ineffective}` : "", n.dead ? `Dead ${n.dead}` : ""].filter(Boolean).join("\n");
                return (
                  <td key={k} style={{ ...base, ...(shade ? { background: shade } : {}) }} title={tip}>
                    {used > 0 ? <span className="ck-num" style={{ color: "var(--ck-text)", fontSize: 11 }}>{used}</span>
                      : usuallyFree ? <span style={{ color: STATE_STYLE.free.color }}>◆</span>
                      : ""}
                  </td>
                );
              }))}
              <NoteCell note={row.note} selected={selected} />
            </tr>,
          ];
        })}
      </tbody>
    </table>
  );
}

/** One line of marks; the verdict bands sit behind the info icon. */
export function TimelineLegend({ aggregate }: { aggregate: boolean }) {
  const under = Math.round(MARGIN_UNDER * 100);
  const over = Math.round(MARGIN_OVER * 100);
  const item = (mark: ReactNode, text: string) => (
    <span key={text} style={{ whiteSpace: "nowrap" }}>{mark} {text}</span>
  );
  const marks = aggregate
    ? [item(<span style={{ color: "var(--ck-text)" }}>3</span>, "pulls it was used (greener = more often)"),
       item(<span style={{ color: STATE_STYLE.free.color }}>◆</span>, "usually free on a short hit")]
    : [item(<span style={{ color: STATE_STYLE.used.color }}>●</span>, "used"),
       item(<span style={{ color: STATE_STYLE.free.color }}>◆</span>, "free on a short hit"),
       item(<span style={{ color: STATE_STYLE.ineffective.color }}>✕</span>, "cast, but not on the hit"),
       item(<span style={{ background: DEAD_CELL_BG, padding: "0 5px", borderRadius: 2 }}>&nbsp;</span>, "dead or just raised")];
  return (
    <div className="ck-help" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 8 }}>
      {marks}
      <span style={{ color: "var(--ck-text-3)" }}>Click a hit for details · +N on a player shows personal mitigation</span>
      <InfoTip
        label={`Outcome is the lowest player's HP after the hit. Fail: someone died. Under: below ${under}%. Good: ${under} to ${over}%. Over: ${over}% or more.`}
        content={
          <>
            <b>Outcome</b> is the lowest player&apos;s HP after the hit.
            <div><span style={{ color: VERDICT_STYLE.fail.color }}>Fail</span>: someone died</div>
            <div><span style={{ color: VERDICT_STYLE.under.color }}>Under</span>: below {under}%</div>
            <div><span style={{ color: VERDICT_STYLE.good.color }}>Good</span>: {under}–{over}%</div>
            <div><span style={{ color: VERDICT_STYLE.over.color }}>Over</span>: {over}% or more</div>
            <div style={{ marginTop: 4 }}>Hover a cell for its cooldown: when it was last cast and when it was back.</div>
          </>
        }
      />
    </div>
  );
}

/** True when the pull carries the fields the analysis reads (fetched after 2026-10-06). */
export function hasMitigationData(pull: Pull): boolean {
  return pull.players.some((p) => p.damageTaken.some((e) => e.statusIds !== undefined || e.multiplier !== undefined));
}
