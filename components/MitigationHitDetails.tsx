"use client";

// components/MitigationHitDetails.tsx
//
// The side panel a timeline row opens (components/MitigationTimeline.tsx;
// user, 2026-10-09): what the timeline's single Outcome cell folds away.
// Health before and after with who was lowest, deaths and their cause,
// raw, mitigated, absorbed and taken damage, the mitigation on the hit
// and who cast it, and what could change with the estimated lowest HP
// (lib/mitigation/notes.ts addOptions). For a hit matched across pulls,
// medians plus one line per pull.

import type { CSSProperties, ReactNode } from "react";
import type { HitTarget, MitigationHit } from "@/lib/mitigation/types";
import type { AggregatedHit } from "@/lib/mitigation/aggregate";
import { MARGIN_UNDER, judged } from "@/lib/mitigation/analyze";
import { addOptions, aggregateAddOptions, type AddOption } from "@/lib/mitigation/notes";
import { FFXIV_MITIGATION } from "@/lib/mitigation/ffxiv-catalog";
import { FULL_HEALTH, MechanicLabel, VERDICT_STYLE, afterColor, fmtTime, pctHp } from "./MitigationTimeline";

const PANEL_WIDTH = 340;

const firstName = (player: string) => player.split(" ")[0];
const fmtDamage = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : `${Math.round(n / 1000)}k`);
const dim: CSSProperties = { color: "var(--ck-text-3)" };
const heading: CSSProperties = { color: "var(--ck-text-gold)", fontWeight: 600, fontSize: 11, margin: "12px 0 4px" };
const line: CSSProperties = { fontSize: 12, color: "var(--ck-text-2)", margin: "2px 0" };

const beforeOf = (t: HitTarget) => t.healthBefore / t.maxHealth;
const lowestBy = (targets: HitTarget[], f: (t: HitTarget) => number) => [...judged(targets)].sort((a, b) => f(a) - f(b))[0];

function Hp({ value }: { value: number }) {
  return <span className="ck-num" style={{ color: afterColor(value) }}>{value < 0 ? "dead" : pctHp(value)}</span>;
}

function Verdict({ verdict }: { verdict: MitigationHit["verdict"] }) {
  const v = VERDICT_STYLE[verdict];
  return <span style={{ color: v.color, fontWeight: 600 }}>{v.label}</span>;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ ...line, display: "flex", gap: 8 }}>
      <span style={{ ...dim, width: 92, flex: "0 0 auto" }}>{label}</span>
      <span>{children}</span>
    </div>
  );
}

function DamageRows({ raw, taken, absorbed }: { raw?: number; taken: number; absorbed: number }) {
  const mitigated = raw === undefined ? undefined : Math.max(0, raw - taken - absorbed);
  return (
    <>
      <div style={heading}>Damage per player</div>
      <Row label="Raw">{raw === undefined ? <span style={dim}>not logged</span> : <span className="ck-num">{fmtDamage(raw)}</span>}</Row>
      {mitigated !== undefined && raw !== undefined && raw > 0 && (
        <Row label="Mitigated"><span className="ck-num">{fmtDamage(mitigated)}</span> <span style={dim}>({Math.round((mitigated / raw) * 100)}%)</span></Row>
      )}
      {absorbed > 0 && <Row label="Shields"><span className="ck-num">{fmtDamage(absorbed)}</span></Row>}
      <Row label="Taken"><span className="ck-num">{fmtDamage(taken)}</span></Row>
      <div style={{ ...line, ...dim, fontSize: 11 }}>Averaged over the non-tanks (the tanks on a tank buster).</div>
    </>
  );
}

function Options({ options, perPull }: { options: AddOption[]; perPull?: number }) {
  if (!options.length) return <div style={line}>Nothing else {perPull ? "usually " : ""}free reaches this hit.</div>;
  return (
    <>
      {options.map((o) => (
        <div key={`${o.player}|${o.key}`} style={line}>
          Add <span style={{ color: "var(--ck-text)" }}>{o.name}</span> ({firstName(o.player)})
          {!o.free && <span style={dim}> delays a later use</span>}
          {o.pulls !== undefined && perPull ? <span style={dim}> · free {o.pulls}/{perPull}</span> : null}
          {" → "}
          {o.est === undefined ? <span style={dim}>no estimate (shield)</span> : <>lowest <Hp value={o.est} /></>}
        </div>
      ))}
      <div style={{ ...line, ...dim, fontSize: 11 }}>Estimates from the log; each option on its own.</div>
    </>
  );
}

function Droppable({ hit }: { hit: { droppable: MitigationHit["droppable"] } }) {
  const d = hit.droppable;
  if (d.candidates === 0) return <div style={line}>No planned mitigation on it: it didn&apos;t need any.</div>;
  if (!d.names.length) return <div style={line}>Nothing could go without dropping it below Good.</div>;
  const list = d.names.length === 1 && d.alternatives.length > 1 ? `one of ${d.alternatives.join(", ")}` : d.names.join(" + ");
  return <div style={line}>Could do without {list}; lowest would be <Hp value={d.worstMargin} />.</div>;
}

function Panel({ title, onClose, children }: { title: ReactNode; onClose: () => void; children: ReactNode }) {
  return (
    <div style={{ width: PANEL_WIDTH, flex: "0 0 auto", overflow: "auto", borderLeft: "1px solid var(--ck-line-2)", padding: "8px 12px", background: "var(--ck-bg-deep)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: "1 1 auto", color: "var(--ck-text)", fontWeight: 600, fontSize: 13 }}>{title}</div>
        <button className="ck-btn ck-btn--xs" onClick={onClose} aria-label="Close details">✕</button>
      </div>
      {children}
    </div>
  );
}

export function HitDetails({ hit, onClose }: { hit: MitigationHit; onClose: () => void }) {
  const before = lowestBy(hit.targets, beforeOf);
  const after = lowestBy(hit.targets, (t) => t.margin);
  const dead = hit.targets.filter((t) => t.died);
  return (
    <Panel onClose={onClose} title={<MechanicLabel name={hit.abilityNames.join(" + ")} occurrence={hit.occurrence} waves={hit.waves} tankOnly={hit.tankOnly} />}>
      <div style={{ ...line, marginTop: 4 }}>
        {fmtTime(hit.timestampMs)}{hit.phase ? ` · ${hit.phase}` : ""} · {hit.targets.length} players · {hit.damageColumn ?? "unknown"} damage · <Verdict verdict={hit.verdict} />
      </div>

      <div style={heading}>Health</div>
      {before && (
        <Row label="Lowest before">
          {beforeOf(before) >= FULL_HEALTH ? "Party at full health" : <>{before.player} at <span className="ck-num">{pctHp(beforeOf(before))}</span></>}
        </Row>
      )}
      {after && (
        <Row label="Lowest after">
          {after.player} at <Hp value={after.margin} />
          {after.laterDrop > 0 && <span style={dim}>, {pctHp(after.margin - after.laterDrop)} after follow-up damage</span>}
        </Row>
      )}
      {dead.map((t) => (
        <Row key={t.player} label="Died">
          {t.player}{t.vulnerable ? " (vulnerable)" : ""}
          <span style={dim}> — {t.deathCause === "mitigation" ? "full HP before: a mitigation problem" : "low HP before: healing or timing"}</span>
        </Row>
      ))}
      {hit.targets.filter((t) => t.vulnerable && !t.died).map((t) => <Row key={t.player} label="Left out">{t.player} (vulnerable)</Row>)}
      {hit.targets.filter((t) => t.invulnerable).map((t) => <Row key={t.player} label="Left out">{t.player} (invulnerable)</Row>)}

      <DamageRows raw={hit.rawDamage} taken={hit.takenDamage} absorbed={hit.absorbedDamage} />

      <div style={heading}>On the hit</div>
      {hit.active.length === 0 ? <div style={line}>No mitigation.</div> : hit.active.map((a) => (
        <div key={a.key} style={line}>
          <span style={{ color: "var(--ck-text)" }}>{a.name}</span>
          <span style={dim}> {a.casters.map(firstName).join(", ") || "caster not found"}{a.targets < hit.targets.length ? ` · on ${a.targets}/${hit.targets.length}` : ""}</span>
        </div>
      ))}

      <div style={heading}>What could change</div>
      {hit.verdict === "over" ? <Droppable hit={hit} />
        : hit.verdict === "good" ? <div style={line}>Nothing: it landed Good.</div>
        : <Options options={addOptions(hit, FFXIV_MITIGATION)} />}
    </Panel>
  );
}

export function AggregateDetails({ row, onClose }: { row: AggregatedHit; onClose: () => void }) {
  const first = row.byPull[0].hit;
  return (
    <Panel onClose={onClose} title={<MechanicLabel name={first.abilityNames.join(" + ")} occurrence={row.occurrence}
      waves={Math.max(...row.byPull.map((b) => b.hit.waves))} tankOnly={row.byPull.every((b) => b.hit.tankOnly)} />}>
      <div style={{ ...line, marginTop: 4 }}>
        {fmtTime(row.medianMs)}{row.phase ? ` · ${row.phase}` : ""} · {row.pulls} pulls · {row.damageColumn ?? "unknown"} damage · <Verdict verdict={row.verdict} />
      </div>

      <div style={heading}>Health (median over pulls)</div>
      <Row label="Lowest before"><span className="ck-num">{pctHp(row.lowestBefore)}</span></Row>
      <Row label="Lowest after"><Hp value={row.medianMargin} /> <span style={dim}>median,</span> <Hp value={row.worstMargin} /> <span style={dim}>worst</span></Row>
      {row.deathPulls > 0 && <Row label="Deaths">in {row.deathPulls} of {row.pulls} pulls</Row>}

      <DamageRows raw={row.rawDamage} taken={row.takenDamage} absorbed={row.absorbedDamage} />

      <div style={heading}>Usually on the hit</div>
      {row.active.length === 0 ? <div style={line}>No mitigation.</div> : row.active.map((a) => (
        <div key={a.key} style={line}>
          <span style={{ color: "var(--ck-text)" }}>{a.name}</span>
          <span style={dim}> {a.pulls}/{row.pulls} · {Object.entries(a.casters).sort((x, y) => y[1] - x[1]).map(([c]) => firstName(c)).join(", ")}</span>
        </div>
      ))}

      <div style={heading}>What could change</div>
      {row.verdict === "over" ? <Droppable hit={row} />
        : row.verdict === "good" ? <div style={line}>Nothing on the median{row.worstMargin < MARGIN_UNDER ? "; the worst pull is worth a look" : ""}.</div>
        : <Options options={aggregateAddOptions(row, FFXIV_MITIGATION)} perPull={row.pulls} />}

      <div style={heading}>Per pull</div>
      {row.byPull.map(({ pullNumber, hit }) => {
        const b = lowestBy(hit.targets, beforeOf);
        const a = lowestBy(hit.targets, (t) => t.margin);
        const died = hit.targets.filter((t) => t.died && !t.vulnerable);
        return (
          <div key={pullNumber} style={{ ...line, display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span className="ck-num" style={{ ...dim, width: 52 }}>Pull {pullNumber}</span>
            <span style={{ width: 44 }}><Verdict verdict={hit.verdict} /></span>
            <span>
              {died.length ? <>died: {died.map((t) => firstName(t.player)).join(", ")}</>
                : a ? <>{firstName(a.player)} <Hp value={a.margin} /></> : "—"}
              {b && beforeOf(b) < FULL_HEALTH && <span style={dim}> · {firstName(b.player)} went in at {pctHp(beforeOf(b))}</span>}
            </span>
          </div>
        );
      })}
    </Panel>
  );
}
