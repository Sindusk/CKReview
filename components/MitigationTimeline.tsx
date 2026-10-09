"use client";

// components/MitigationTimeline.tsx
//
// The Mitigation dialog's timeline (docs/archive/mitigation-redesign.md, UI): one
// row per hit (lib/mitigation/analyze.ts says what counts) in fight order,
// grouped by phase. Columns are grouped
// per player in party-slot order (MT, OT, H1, H2, M1, M2, R1, R2), with a
// rule between players. Each group shows that player's party-wide
// mitigation; personal mitigation is collapsed and expands per player.
// Side columns carry raw and taken damage, the lowest health before and
// after, the verdict and how many mitigations an over hit could do
// without; a Notes column on the far right says what could change. In "all pulls"
// mode each row is a hit matched across pulls (lib/mitigation/aggregate.ts)
// and each cell counts pulls.
//
// All numbers come from lib/mitigation/analyze.ts; this file only lays
// them out. Tooltips use the native `title` attribute.

import type { CSSProperties, ReactNode } from "react";
import type { Pull } from "@/types/Pull";
import type { HitVerdict, MitigationHit, MitigationKind, MitigationState, PlayerMitigation } from "@/lib/mitigation/types";
import type { AggregatedHit } from "@/lib/mitigation/aggregate";
import { MARGIN_OVER, MARGIN_UNDER, verdictFor } from "@/lib/mitigation/analyze";
import { FFXIV_MITIGATION } from "@/lib/mitigation/ffxiv-catalog";
import { detectFFRoles, FF_ROLE_SLOTS } from "@/lib/mechanics/ffxiv/roles";
import { getClassColor } from "@/lib/player-display";
import { getFFAbilityIconUrl } from "@/lib/ability-icons";

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
};

// A dead (or just raised) player's cells keep their cooldown mark on a red
// background, so their stretch of the fight reads as one band.
const DEAD_CELL_BG = "rgba(239, 68, 68, 0.28)";

export const VERDICT_STYLE: Record<HitVerdict, { color: string; label: string }> = {
  fail:  { color: "#ef4444", label: "Fail" },
  under: { color: "#f59e0b", label: "Under" },
  good:  { color: "#22c55e", label: "Good" },
  over:  { color: "#53a9ff", label: "Over" },
};

// Health after a hit, colored like the verdict it lands in.
const afterColor = (margin: number) => VERDICT_STYLE[verdictFor(margin, 0)].color;
// Health going into a hit: full, nearly full, or already dented.
const beforeColor = (health: number) =>
  health >= 0.995 ? VERDICT_STYLE.good.color : health >= 0.8 ? VERDICT_STYLE.over.color : VERDICT_STYLE.under.color;

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

const SIDE_HEADERS = ["Time", "Mechanic", "Raw", "Taken", "HP% Before", "HP% After", "Verdict", "Droppable"];

const HEADER_TIPS: Record<string, string> = {
  "Raw":        "Damage before any mitigation, per player (average over the non-tanks; the tanks on a tank buster). A multi-hit attack's hits are summed.",
  "Taken":      "Damage to health after mitigation and shields, per player, averaged the same way.",
  "HP% Before": "Lowest health before the hit among the players it hit.",
  "HP% After":  "Lowest health after the hit among the players it hit (vulnerable players and invulnerable tanks left out).",
  "Verdict":    `Fail: someone died. Under: someone ended below ${Math.round(MARGIN_UNDER * 100)}%. Good: ${Math.round(MARGIN_UNDER * 100)}-${Math.round(MARGIN_OVER * 100)}%. Over: everyone ${Math.round(MARGIN_OVER * 100)}%+.`,
  "Droppable":  `How many planned mitigations an over hit could do without and still land Good (lowest player ${Math.round(MARGIN_UNDER * 100)}%+ with a 5% damage roll). Party-wide only, plus tank cooldowns on a tank buster.`,
  "Notes":      "What could change on this hit.",
};

function TimelineHead({ groups, expanded, onToggle, aggregate }: {
  groups: VisibleGroup[]; expanded: Set<string>; onToggle: (player: string) => void; aggregate: boolean;
}) {
  return (
    <thead>
      <tr style={{ height: HEAD_ROW_1 }}>
        {SIDE_HEADERS.map((h, i) => (
          <th key={h} rowSpan={2} style={{ ...th, ...(i < 2 ? stickyLeft(i === 0 ? 0 : 44) : {}), zIndex: i < 2 ? 4 : 3, verticalAlign: "bottom" }}
            title={`${HEADER_TIPS[h] ?? ""}${aggregate && i >= 2 && i <= 5 ? " Median over pulls; After also shows the worst pull." : ""}` || undefined}>
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

const pctHp = (x: number) => pct(Math.max(0, x));

/** Who died to the hit, or, when nobody did, who ended lowest. */
function outcomeTip(hit: MitigationHit): string {
  const dead = hit.targets.filter((t) => t.died);
  if (dead.length) {
    return `Died: ${dead.map((t) => `${t.player}${t.vulnerable ? " (vulnerable)" : ""}`).join(", ")}`;
  }
  const graded = hit.targets.filter((t) => !t.vulnerable && !t.invulnerable);
  const low = [...graded].sort((a, b) => a.margin - b.margin)[0];
  return low ? `Lowest after: ${low.player} at ${pctHp(low.margin)}` : "";
}

/** Who went into the hit lowest. */
function beforeTip(hit: MitigationHit): string {
  const graded = hit.targets.filter((t) => !t.vulnerable && !t.invulnerable);
  const low = [...graded].sort((a, b) => a.healthBefore / a.maxHealth - b.healthBefore / b.maxHealth)[0];
  if (!low) return "";
  // Matches the 100% the cell shows: nobody to single out.
  if (pctHp(low.healthBefore / low.maxHealth) === "100%") return "Party at full health";
  return `Lowest before: ${low.player} at ${pctHp(low.healthBefore / low.maxHealth)}`;
}

/** A per-hit tip for each pull that reached the hit. */
function perPullTip(row: AggregatedHit, tip: (hit: MitigationHit) => string): string {
  return row.byPull.map(({ pullNumber, hit }) => `Pull ${pullNumber}: ${tip(hit)}`).join("\n");
}

// Raw, Taken, HP% Before and HP% After.
function NumberCells({ raw, taken, absorbed, before, after, worst, beforeTip, afterTip }: {
  raw?: number; taken: number; absorbed?: number; before: number; after: number; worst?: number; beforeTip: string; afterTip: string;
}) {
  return [
    <td key="raw" style={td} className="ck-num">{raw === undefined ? <span style={{ color: "var(--ck-text-3)" }}>—</span> : fmtDamage(raw)}</td>,
    <td key="taken" style={td} className="ck-num" title={absorbed ? `${fmtDamage(absorbed)} more absorbed by shields` : undefined}>{fmtDamage(taken)}</td>,
    <td key="before" style={{ ...td, color: beforeColor(before), cursor: "help" }} className="ck-num" title={beforeTip}>{pctHp(before)}</td>,
    <td key="after" style={{ ...td, cursor: "help" }} className="ck-num" title={afterTip}>
      <span style={{ color: afterColor(after) }}>{pctHp(after)}</span>
      {worst !== undefined && <span style={{ color: afterColor(worst) }}> / {pctHp(worst)}</span>}
    </td>,
  ];
}

// One line, cut with an ellipsis; the full note is in the tooltip. The
// table is full width and this column takes whatever the others leave
// (width 100% with maxWidth 0), so it grows on pulls with few columns and
// shrinks, down to NOTES_MIN_WIDTH, when personal columns open, instead of
// pushing the table into a horizontal scroll.
const NOTES_MIN_WIDTH = 140;
const notesWidth: CSSProperties = { width: "100%", maxWidth: 0, minWidth: NOTES_MIN_WIDTH };
const tableStyle: CSSProperties = { borderCollapse: "separate", borderSpacing: 0, width: "100%" };

function NoteCell({ note }: { note: string }) {
  return (
    <td title={note || undefined} style={{
      ...td, ...notesWidth, overflow: "hidden", textOverflow: "ellipsis", borderLeft: GROUP_RULE, color: "var(--ck-text)",
    }}>
      {note || <span style={{ color: "var(--ck-text-3)" }}>—</span>}
    </td>
  );
}

function MechanicLabel({ name, occurrence, waves, tankOnly, pulls }: {
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

function VerdictPill({ verdict }: { verdict: HitVerdict }) {
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
  const lines = [`${col.player} — ${col.name}`, ...(s.dead ? ["Dead or just raised"] : []), STATE_STYLE[s.state].label];
  if (s.lastCastMs !== undefined) lines.push(`Last cast ${fmtTime(s.lastCastMs)} (${Math.round((hitMs - s.lastCastMs) / 1000)}s before)`);
  if (s.readyMs !== undefined && Number.isFinite(s.readyMs)) lines.push(`Back at ${fmtTime(s.readyMs)}`);
  if (s.nextCastMs !== undefined) lines.push(`Next cast ${fmtTime(s.nextCastMs)}`);
  if (s.approximate) lines.push("Approximate: gated by another action or a gauge");
  return lines.join("\n");
}

function hitTooltip(hit: MitigationHit): string {
  const lines = [`${hit.abilityNames.join(" + ")} #${hit.occurrence}: ${hit.targets.length} players hit${hit.waves > 1 ? ` up to ${hit.waves} times` : ""}, ${hit.damageColumn ?? "unknown"} damage`];
  lines.push("Active:");
  for (const a of hit.active) lines.push(`  ${a.name} (${a.casters.join(", ") || "caster not found"}) on ${a.targets}`);
  const graded = hit.targets.filter((t) => !t.vulnerable && !t.invulnerable);
  const before = [...graded].sort((a, b) => a.healthBefore / a.maxHealth - b.healthBefore / b.maxHealth)[0];
  const after = [...graded].sort((a, b) => a.margin - b.margin)[0];
  if (before) lines.push(`Lowest before: ${before.player} at ${pctHp(before.healthBefore / before.maxHealth)}`);
  if (after) lines.push(`Lowest after: ${after.player} at ${pctHp(after.margin)}${after.laterDrop > 0 ? `, ${pctHp(after.margin - after.laterDrop)} after follow-up damage` : ""}`);
  for (const t of hit.targets.filter((x) => x.died)) {
    lines.push(`Died: ${t.player}${t.vulnerable ? " (vulnerable)" : ""} — ${t.deathCause === "mitigation" ? "full health before the hit: a mitigation problem" : "low health before the hit: a healing / timing problem"}`);
  }
  for (const t of hit.targets.filter((x) => x.vulnerable && !x.died)) lines.push(`Vulnerable (left out): ${t.player}`);
  for (const t of hit.targets.filter((x) => x.invulnerable)) lines.push(`Invulnerable (left out): ${t.player}`);
  return lines.join("\n");
}

function spanOf(groups: VisibleGroup[]): number {
  return SIDE_HEADERS.length + groups.reduce((s, g) => s + g.columns.length, 0) + 1;
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
    <table style={tableStyle}>
      <TimelineHead groups={visible} expanded={expanded} onToggle={onToggle} aggregate={false} />
      <tbody>
        {hits.map((hit) => {
          const byCol = new Map(hit.players.map((p) => [`${p.player}|${p.key}`, p]));
          const phaseRow = hit.phase !== lastPhase ? <PhaseRow key={`ph-${hit.id}`} phase={hit.phase ?? "—"} span={span} /> : null;
          lastPhase = hit.phase;
          return [
            phaseRow,
            <tr key={hit.id}>
              {sideCells(fmtTime(hit.timestampMs),
                <MechanicLabel name={hit.abilityNames.join(" + ")} occurrence={hit.occurrence} waves={hit.waves} tankOnly={hit.tankOnly} />, hitTooltip(hit))}
              <NumberCells raw={hit.rawDamage} taken={hit.takenDamage} absorbed={hit.absorbedDamage} before={hit.lowestBefore} after={hit.margin}
                beforeTip={beforeTip(hit)} afterTip={outcomeTip(hit)} />
              <td style={{ ...td, cursor: "help" }} title={outcomeTip(hit)}>
                <VerdictPill verdict={hit.verdict} />
              </td>
              <DroppableCell count={hit.droppable.keys.length} worstMargin={hit.droppable.worstMargin} />
              {visible.flatMap(({ group, columns }) => columns.map((c, i) => {
                if (!c) return <td key={`${group.player}|empty`} style={{ ...cellTd, ...ruled(i === 0) }} />;
                const s = byCol.get(colKey(c));
                if (!s) return <td key={colKey(c)} style={{ ...cellTd, ...ruled(i === 0) }} />;
                const st = STATE_STYLE[s.state];
                return (
                  <td key={colKey(c)} title={stateTooltip(c, s, hit.timestampMs)} style={{
                    ...cellTd, ...ruled(i === 0), color: st.color, cursor: "help",
                    ...(s.dead ? { background: DEAD_CELL_BG } : {}),
                  }}>
                    {st.mark}
                  </td>
                );
              }))}
              <NoteCell note={hit.note} />
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
          const usual = row.active.map((a) => `${a.name}: ${a.pulls}/${row.pulls} pulls`).join("\n");
          return [
            phaseRow,
            <tr key={row.id}>
              {sideCells(fmtTime(row.medianMs),
                <MechanicLabel name={row.byPull[0].hit.abilityNames.join(" + ")} occurrence={row.occurrence} pulls={row.pulls}
                  waves={Math.max(...row.byPull.map((b) => b.hit.waves))} tankOnly={row.byPull.every((b) => b.hit.tankOnly)} />,
                `${row.abilityName} #${row.occurrence}, reached in ${row.pulls} pull(s)\nActive:\n${usual}`)}
              <NumberCells raw={row.rawDamage} taken={row.takenDamage} before={row.lowestBefore} after={row.medianMargin} worst={row.worstMargin}
                beforeTip={perPullTip(row, beforeTip)} afterTip={perPullTip(row, outcomeTip)} />
              <td style={{ ...td, cursor: "help" }} title={perPullTip(row, outcomeTip)}>
                <VerdictPill verdict={row.verdict} />
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
              <NoteCell note={row.note} />
            </tr>,
          ];
        })}
      </tbody>
    </table>
  );
}

// Two blocks, in the same order as the table's sections below: the hit
// columns (HP colors, verdicts) on the left, the mitigation marks on the right.
export function TimelineLegend({ aggregate }: { aggregate: boolean }) {
  const under = Math.round(MARGIN_UNDER * 100);
  const over = Math.round(MARGIN_OVER * 100);
  const swatch = (color: string, label: string, text: string) => (
    <span key={label} style={{ marginRight: 12, whiteSpace: "nowrap" }}><span style={{ color }}>{label}</span> {text}</span>
  );
  const heading: CSSProperties = { color: "var(--ck-text-gold)", fontWeight: 600, marginBottom: 2 };
  const line: CSSProperties = { marginBottom: 2 };
  const marks = aggregate
    ? [swatch("var(--ck-text)", "12", "pulls it was used on this hit (greener = more often)"),
       swatch(STATE_STYLE.free.color, "◆", "never used, free in half the pulls or more")]
    : [...(Object.keys(STATE_STYLE) as MitigationState[]).map((s) => swatch(STATE_STYLE[s].color, STATE_STYLE[s].mark, s)),
       <span key="dead" style={{ marginRight: 12, whiteSpace: "nowrap" }}>
         <span style={{ background: DEAD_CELL_BG, padding: "0 5px", borderRadius: 2 }}>&nbsp;</span> dead or just raised
       </span>];
  return (
    <div className="ck-help" style={{ display: "flex", gap: 32, flexWrap: "wrap", marginBottom: 8 }}>
      <div>
        <div style={heading}>Hit</div>
        <div style={line}>
          Verdict on the lowest player after the hit:{" "}
          {swatch(VERDICT_STYLE.fail.color, "Fail", "someone died")}
          {swatch(VERDICT_STYLE.under.color, "Under", `<${under}%`)}
          {swatch(VERDICT_STYLE.good.color, "Good", `${under}–${over}%`)}
          {swatch(VERDICT_STYLE.over.color, "Over", `${over}%+`)}
        </div>
        <div style={line}>
          HP% Before:{" "}
          {swatch(VERDICT_STYLE.good.color, "100%", "full")}
          {swatch(VERDICT_STYLE.over.color, "80%+", "")}
          {swatch(VERDICT_STYLE.under.color, "<80%", "")}
        </div>
      </div>
      <div>
        <div style={heading}>Mitigation</div>
        <div style={line}>{marks}</div>
        <div style={line}>Party-wide mitigation shown; +N on a player opens their personal ones.</div>
      </div>
    </div>
  );
}

/** True when the pull carries the fields the analysis reads (fetched after 2026-10-06). */
export function hasMitigationData(pull: Pull): boolean {
  return pull.players.some((p) => p.damageTaken.some((e) => e.statusIds !== undefined || e.multiplier !== undefined));
}
