"use client";

// components/MitigationTimeline.tsx
//
// The Mitigation dialog's timeline (docs/mitigation-redesign.md, UI): one
// row per raidwide hit in fight order, grouped by phase; one column per
// mitigation a party member has (player + ability). Side columns carry the
// damage, the lowest player's margin, the verdict and what could be
// dropped. In "all pulls" mode each row is a hit matched across pulls
// (lib/mitigation/aggregate.ts) and each cell counts pulls.
//
// All numbers come from lib/mitigation/analyze.ts; this file only lays
// them out. Tooltips use the native `title` attribute.

import type { CSSProperties } from "react";
import type { Pull } from "@/types/Pull";
import type { MitigationHit, MitigationKind, MitigationState, PlayerMitigation } from "@/lib/mitigation/types";
import type { AggregatedHit } from "@/lib/mitigation/aggregate";
import { FFXIV_MITIGATION } from "@/lib/mitigation/ffxiv-catalog";
import { getClassColor } from "@/lib/player-display";

export type MitigationColumn = {
  player: string;
  job:    string;
  key:    string;
  name:   string;
  kind:   MitigationKind;
  icon?:  string;
};

const STATE_STYLE: Record<MitigationState, { mark: string; color: string; label: string }> = {
  used:        { mark: "●", color: "#4ade80", label: "Used on this hit" },
  free:        { mark: "◆", color: "#fbbf24", label: "Free: off cooldown, and using it here would not delay the next real use" },
  available:   { mark: "○", color: "#94a3b8", label: "Available, but using it here would delay a later use" },
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

/** Every mitigation column the party has in these pulls (union by player + ability). */
export function buildColumns(pulls: Pull[]): MitigationColumn[] {
  const cols = new Map<string, MitigationColumn>();
  for (const pull of pulls) {
    for (const player of pull.players) {
      for (const entry of FFXIV_MITIGATION.catalog) {
        if (!entry.jobs.includes(player.className)) continue;
        if (entry.cooldownMs === 0 || entry.kind === "invuln" || entry.kind === "limitBreak") continue;
        const k = `${player.name}|${entry.key}`;
        if (cols.has(k)) continue;
        const icon = player.casts.find((c) => entry.actionIds.includes(c.abilityId) && c.abilityIcon)?.abilityIcon;
        cols.set(k, { player: player.name, job: player.className, key: entry.key, name: entry.name, kind: entry.kind, icon });
      }
    }
  }
  return [...cols.values()].sort((a, b) =>
    KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)
    || a.job.localeCompare(b.job) || a.player.localeCompare(b.player) || a.name.localeCompare(b.name));
}

// ── Shared cell styles ─────────────────────────────────────────────────

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

function ColumnHeader({ col }: { col: MitigationColumn }) {
  const color = getClassColor("ffxiv", col.job);
  return (
    <th style={{ ...th, textAlign: "center", padding: "4px 2px", minWidth: 26 }} title={`${col.player} (${col.job}) — ${col.name}`}>
      {col.icon
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={col.icon} alt={col.name} width={20} height={20} style={{ display: "block", margin: "0 auto", borderRadius: 3 }} />
        : <span style={{ fontSize: 9 }}>{col.name.slice(0, 4)}</span>}
      <div style={{ width: 20, height: 3, margin: "3px auto 0", background: color, borderRadius: 1 }} />
    </th>
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

function PhaseRow({ phase, span }: { phase: string; span: number }) {
  return (
    <tr>
      <td colSpan={span} style={{ ...td, color: "var(--ck-text-gold)", fontSize: 11, fontWeight: 600, background: "#101315", paddingTop: 8 }}>
        {phase}
      </td>
    </tr>
  );
}

const SIDE_HEADERS = ["Time", "Mechanic", "Damage", "Lowest", "Verdict", "Droppable"];

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

// ── Single pull ─────────────────────────────────────────────────────────

export function PullTimeline({ hits, columns }: { hits: MitigationHit[]; columns: MitigationColumn[] }) {
  const span = SIDE_HEADERS.length + columns.length;
  let lastPhase: string | undefined;
  return (
    <table style={{ borderCollapse: "separate", borderSpacing: 0 }}>
      <thead>
        <tr>
          {SIDE_HEADERS.map((h, i) => (
            <th key={h} style={{ ...th, ...(i < 2 ? stickyLeft(i === 0 ? 0 : 44) : {}), zIndex: i < 2 ? 3 : 2 }}>{h}</th>
          ))}
          {columns.map((c) => <ColumnHeader key={`${c.player}|${c.key}`} col={c} />)}
        </tr>
      </thead>
      <tbody>
        {hits.map((hit) => {
          const byCol = new Map(hit.players.map((p) => [`${p.player}|${p.key}`, p]));
          const phaseRow = hit.phase !== lastPhase ? <PhaseRow key={`ph-${hit.id}`} phase={hit.phase ?? "—"} span={span} /> : null;
          lastPhase = hit.phase;
          return [
            phaseRow,
            <tr key={hit.id}>
              <td style={{ ...td, ...stickyLeft(0), width: 44 }} className="ck-num">{fmtTime(hit.timestampMs)}</td>
              <td style={{ ...td, ...stickyLeft(44), color: "var(--ck-text)", cursor: "help" }} title={hitTooltip(hit)}>
                {hit.abilityName} <span style={{ color: "var(--ck-text-3)" }}>#{hit.occurrence}</span>
              </td>
              <td style={td} className="ck-num">{fmtDamage(hit.totalDamage)}</td>
              <td style={td}><MarginCell margin={hit.margin} sequenceMargin={hit.sequenceMargin} /></td>
              <td style={td}>
                <VerdictPill verdict={hit.verdict} />
                {hit.deaths > 0 && <span style={{ color: "#ef4444", fontSize: 11 }}> ☠{hit.deaths}</span>}
              </td>
              <td style={{ ...td, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}
                title={hit.droppable.keys.length ? `${hit.droppable.names.join(", ")}\nLowest player still at ${pct(hit.droppable.worstMargin)} (5% damage-roll buffer, follow-up damage included)` : undefined}>
                {hit.droppable.names.join(", ") || <span style={{ color: "var(--ck-text-3)" }}>—</span>}
              </td>
              {columns.map((c) => {
                const s = byCol.get(`${c.player}|${c.key}`);
                if (!s) return <td key={`${c.player}|${c.key}`} style={cellTd} />;
                const st = STATE_STYLE[s.state];
                return (
                  <td key={`${c.player}|${c.key}`} style={{ ...cellTd, color: st.color, cursor: "help" }} title={stateTooltip(c, s, hit.timestampMs)}>
                    {st.mark}
                  </td>
                );
              })}
            </tr>,
          ];
        })}
      </tbody>
    </table>
  );
}

// ── All loaded pulls ────────────────────────────────────────────────────

export function AggregateTimeline({ rows, columns }: { rows: AggregatedHit[]; columns: MitigationColumn[] }) {
  const span = SIDE_HEADERS.length + columns.length;
  let lastPhase: string | undefined;
  return (
    <table style={{ borderCollapse: "separate", borderSpacing: 0 }}>
      <thead>
        <tr>
          {SIDE_HEADERS.map((h, i) => (
            <th key={h} style={{ ...th, ...(i < 2 ? stickyLeft(i === 0 ? 0 : 44) : {}), zIndex: i < 2 ? 3 : 2 }}>
              {h === "Lowest" ? "Lowest (median / worst)" : h}
            </th>
          ))}
          {columns.map((c) => <ColumnHeader key={`${c.player}|${c.key}`} col={c} />)}
        </tr>
      </thead>
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
              <td style={{ ...td, ...stickyLeft(0), width: 44 }} className="ck-num">{fmtTime(row.medianMs)}</td>
              <td style={{ ...td, ...stickyLeft(44), color: "var(--ck-text)", cursor: "help" }}
                title={`${row.abilityName} #${row.occurrence}, reached in ${row.pulls} pull(s)\nActive:\n${usual}`}>
                {row.abilityName} <span style={{ color: "var(--ck-text-3)" }}>#{row.occurrence}</span>
                <span style={{ color: "var(--ck-text-3)", fontSize: 10 }}> ×{row.pulls}</span>
              </td>
              <td style={td} className="ck-num">{fmtDamage(median(row.byPull.map((b) => b.hit.totalDamage)))}</td>
              <td style={td}>
                <span className="ck-num">{pct(row.medianMargin)}</span>
                <span className="ck-num" style={{ color: row.worstMargin < 0.05 ? "#ef4444" : "var(--ck-text-3)" }}> / {pct(row.worstMargin)}</span>
              </td>
              <td style={td} title={row.deaths ? `${row.deaths} death(s) in ${row.deathPulls} pull(s), vulnerable players left out` : undefined}>
                <VerdictPill verdict={row.verdict} />
                {row.deaths > 0 && <span style={{ color: "#ef4444", fontSize: 11 }}> ☠{row.deathPulls}</span>}
              </td>
              <td style={{ ...td, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}
                title={row.droppable.keys.length ? `${row.droppable.names.join(", ")}\nLowest player in the worst pull still at ${pct(row.droppable.worstMargin)}` : undefined}>
                {row.droppable.names.join(", ") || <span style={{ color: "var(--ck-text-3)" }}>—</span>}
              </td>
              {columns.map((c) => {
                const k = `${c.player}|${c.key}`;
                const n = counts.get(k);
                if (!n) return <td key={k} style={cellTd} />;
                const total = row.pulls;
                const used = n.used;
                const shade = used === 0 ? "transparent" : `rgba(74, 222, 128, ${0.12 + 0.5 * (used / total)})`;
                const tip = [`${c.player} — ${c.name}`, `Used ${used}/${total}`, `Free ${n.free}/${total}`, `Available ${n.available}`,
                  `On cooldown ${n.cooldown}`, n.ineffective ? `Ineffective ${n.ineffective}` : "", n.dead ? `Dead ${n.dead}` : ""].filter(Boolean).join("\n");
                return (
                  <td key={k} style={{ ...cellTd, background: shade, cursor: "help" }} title={tip}>
                    {used > 0 ? <span className="ck-num" style={{ color: "var(--ck-text)", fontSize: 11 }}>{used}</span>
                      : n.free > 0 ? <span style={{ color: STATE_STYLE.free.color }}>◆</span>
                      : <span style={{ color: "var(--ck-text-3)" }}>·</span>}
                  </td>
                );
              })}
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
        ? [item("12", "var(--ck-text)", "pulls it was used on this hit (greener = more often)"), item("◆", STATE_STYLE.free.color, "never used here, but free in some pulls")]
        : (Object.keys(STATE_STYLE) as MitigationState[]).map((s) => item(STATE_STYLE[s].mark, STATE_STYLE[s].color, s))}
      <span style={{ whiteSpace: "nowrap" }}>
        Verdict on the lowest player after follow-up damage: {" "}
        <span style={{ color: VERDICT_STYLE.under.color }}>under</span> &lt;5%, <span style={{ color: VERDICT_STYLE.tight.color }}>tight</span> 5–20%,{" "}
        <span style={{ color: VERDICT_STYLE.over.color }}>over</span> 20%+. Hover rows and cells for detail.
      </span>
    </div>
  );
}

/** True when the pull carries the fields the analysis reads (fetched after 2026-10-06). */
export function hasMitigationData(pull: Pull): boolean {
  return pull.players.some((p) => p.damageTaken.some((e) => e.statusIds !== undefined || e.multiplier !== undefined));
}
