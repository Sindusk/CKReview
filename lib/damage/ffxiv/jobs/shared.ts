// lib/damage/ffxiv/jobs/shared.ts
//
// Building blocks for the job checks (docs/damage-analysis-plan.md,
// Layer 3): a job's own burst window, a job damage buff's uptime, and a
// job gauge simulated from casts. Each returns findings in the engine's
// shape and states its basis.
//
// ── Burst windows ──────────────────────────────────────────────────────
// Modelled on xivanalysis's BuffWindow + ExpectedGcdCount/ExpectedActions
// evaluators (src/parser/core/modules/ActionWindow). A window is the
// status on the player (apply → remove, from the player-buff stream).
// GCDs count when they start inside it; actions when cast inside it, the
// removal's own timestamp included (xivanalysis's 'SAME-TIMESTAMP' mode:
// Delirium's last stack goes at the same instant as the GCD using it). A
// window still open at the end of the analysis is skipped (xivanalysis's
// "rushed end of pull"). One that overlaps forced time by 1.5s+ is shown
// as forced.
//
// ── Gauges ─────────────────────────────────────────────────────────────
// Simulated from casts, which docs/dps-analysis.md warns can be wrong.
// So the simulation checks itself: a spender that would take the gauge
// below zero means the model or the log is off (gauge carried in from
// before the log, an unlogged combo). Then every overcap finding from that
// gauge is marked inference and says how many times it happened.
//
//   Copyright (c) 2018 Saxon Landers & contributors (the window model)
//   MIT License; full text in THIRD_PARTY_NOTICES.md.

import type { PlayerEvent } from "@/types/PlayerInfo";
import type { DamageFinding } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { forcedPart, inWindows, mergeWindows, overlapMs, type Window } from "../../timeline";

const SAME_TIMESTAMP_MS = 100;

export const s = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
export const k = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : `${Math.round(n / 1000)}k`);
const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

/** Windows where a status is on the player, from the player-buff stream. */
export function statusWindows(ctx: PlayerCheckContext, statusId: number): Window[] {
  const out: Window[] = [];
  let open: number | undefined;
  for (const e of [...(ctx.player.buffs ?? [])].sort((a, b) => a.timestamp - b.timestamp)) {
    if (e.abilityId !== statusId) continue;
    if (e.buffStatus === "removed") {
      if (open !== undefined) { out.push({ startMs: open, endMs: e.timestamp }); open = undefined; }
    } else if (e.buffStatus === "applied" && open === undefined) {
      open = e.timestamp;
    }
  }
  if (open !== undefined) out.push({ startMs: open, endMs: ctx.endMs + 1 });
  return out;
}

export function castsIn(ctx: PlayerCheckContext, ids: number[], startMs: number, endMs: number): PlayerEvent[] {
  const set = new Set(ids);
  return ctx.player.casts.filter((c) => set.has(c.abilityId) && c.timestamp >= startMs && c.timestamp < endMs);
}

/** The first hit of each cast of an ability (multi-target casts count once). */
export function castHits(ctx: PlayerCheckContext, abilityId: number): PlayerEvent[] {
  const out: PlayerEvent[] = [];
  for (const e of ctx.player.damageDone) {
    if (e.abilityId !== abilityId || e.isDoT) continue;
    const last = out[out.length - 1];
    if (last && e.timestamp - last.timestamp < 500) continue;
    out.push(e);
  }
  return out;
}

// ── Burst windows ──────────────────────────────────────────────────────

export type ExpectedAction = {
  ids:    number[];
  count:  number;
  name:   string;
  // How a missing one is valued; default = its average × the window bonus
  // (it was used outside the window instead).
  value?: (ctx: PlayerCheckContext) => number;
};

export type BurstWindowSpec = {
  statusId:      number;
  name:          string;
  bonus:         number;      // the window's damage bonus, 0.2 = +20%
  bonusBasis:    string;      // where the bonus value comes from
  expectedGcds?: (ctx: PlayerCheckContext) => number;
  expected:      (ctx: PlayerCheckContext, casts: PlayerEvent[]) => ExpectedAction[];
};

export function burstWindowFindings(ctx: PlayerCheckContext, spec: BurstWindowSpec): DamageFinding[] {
  const out: DamageFinding[] = [];
  for (const w of statusWindows(ctx, spec.statusId)) {
    if (w.endMs > ctx.endMs) continue;
    // Inclusive end: a stack-consumed buff (Delirium) loses its last stack
    // at the same timestamp as the cast that used it.
    const end = w.endMs + SAME_TIMESTAMP_MS;
    const gcds = ctx.uses.filter((u) => u.startMs >= w.startMs && u.startMs <= end);
    const casts = ctx.player.casts.filter((c) => c.timestamp >= w.startMs && c.timestamp <= end);
    const expectedGcds = spec.expectedGcds?.(ctx);
    const missingGcds = expectedGcds !== undefined ? Math.max(0, expectedGcds - gcds.length) : 0;
    const missing: { name: string; n: number; value: number }[] = [];
    for (const e of spec.expected(ctx, casts)) {
      const got = casts.filter((c) => e.ids.includes(c.abilityId)).length;
      const n = Math.max(0, e.count - got);
      if (n === 0) continue;
      const each = e.value ? e.value(ctx) : Math.max(...e.ids.map((id) => ctx.values.perUse(id))) * spec.bonus;
      missing.push({ name: e.name, n, value: n * each });
    }
    if (missingGcds === 0 && missing.length === 0) continue;

    const phaseId = ctx.phaseOf(w.startMs);
    const gcdValue = ctx.values.gcdValue(phaseId, inWindows(w.startMs, ctx.buffWindows));
    const lostGcds = missingGcds * gcdValue * spec.bonus;
    const forced = forcedPart(w.startMs, w.endMs, ctx.forced);
    const parts = [
      expectedGcds !== undefined ? `${gcds.length}/${expectedGcds} GCDs` : undefined,
      missing.length ? `missing ${missing.map((m) => (m.n > 1 ? `${m.name} ×${m.n}` : m.name)).join(", ")}` : undefined,
    ].filter(Boolean);
    out.push(finding(ctx, {
      kind: "burst-window", startMs: w.startMs, endMs: w.endMs,
      forced: forced.ms >= 1_500, cause: forced.ms >= 1_500 ? forced.cause : undefined,
      label: `${spec.name} window`,
      lostDamage: lostGcds + missing.reduce((a, m) => a + m.value, 0),
      basis: [
        missingGcds ? `${missingGcds} GCD${missingGcds > 1 ? "s" : ""} × ${k(gcdValue)} average × ${Math.round(spec.bonus * 100)}%` : undefined,
        missing.length ? `each missing action × its average × ${Math.round(spec.bonus * 100)}% (used outside the window instead; a never-used one shows as drift)` : undefined,
        spec.bonusBasis,
      ].filter(Boolean).join("; "),
      detail: `${spec.name} at ${clock(w.startMs)}: ${parts.join("; ")}`,
    }));
  }
  return out;
}

// ── Buff uptime ────────────────────────────────────────────────────────

export type UptimeSpec = {
  name:       string;
  bonus:      number;
  bonusBasis: string;
  active:     Window[];
  fromMs:     number;     // when the buff should first be up
  graceMs:    number;     // drops shorter than this are ignored
  inference?: boolean;    // the windows are simulated, not logged
};

export function uptimeFindings(ctx: PlayerCheckContext, spec: UptimeSpec): DamageFinding[] {
  const out: DamageFinding[] = [];
  const active = mergeWindows(spec.active);
  const forced = mergeWindows(ctx.forced);
  let cursor = spec.fromMs;
  const gaps: Window[] = [];
  for (const w of active) {
    if (w.startMs > cursor) gaps.push({ startMs: cursor, endMs: Math.min(w.startMs, ctx.endMs) });
    cursor = Math.max(cursor, w.endMs);
  }
  if (cursor < ctx.endMs) gaps.push({ startMs: cursor, endMs: ctx.endMs });
  for (const g of gaps) {
    const len = g.endMs - g.startMs;
    const forcedMs = overlapMs(g.startMs, g.endMs, forced);
    if (len - forcedMs < spec.graceMs) continue;
    const dealt = ctx.values.damageIn(g.startMs, g.endMs);
    out.push(finding(ctx, {
      kind: "buff-uptime", startMs: g.startMs, endMs: g.endMs, forced: false,
      label: `${spec.name} down`,
      lostDamage: dealt * spec.bonus,
      inference: spec.inference,
      basis: `${k(dealt)} dealt while it was down × ${Math.round(spec.bonus * 100)}% (${spec.bonusBasis})`,
      detail: `${spec.name} down for ${s(len - forcedMs)}${forcedMs > 0 ? ` (plus ${s(forcedMs)} forced)` : ""}`,
    }));
  }
  return out;
}

// ── Gauges ─────────────────────────────────────────────────────────────

export type GaugeEvent =
  | { t: number; type: "gain"; amount: number; label: string }
  | { t: number; type: "spend"; amount: number; label: string }
  | { t: number; type: "cap"; cap: number; label: string }   // cap change; excess above it is lost
  | { t: number; type: "reset"; label: string };             // death

export type GaugeSpec = {
  name:      string;       // "Cartridge"
  unit:      string;       // "cartridge" / "Blood"
  cap:       number;       // starting cap
  unitValue: number;       // damage per unit
  valueBasis: string;
  events:    GaugeEvent[];
};

export function gaugeFindings(ctx: PlayerCheckContext, spec: GaugeSpec): DamageFinding[] {
  const events = [...spec.events].filter((e) => e.t < ctx.endMs).sort((a, b) => a.t - b.t);
  let value = 0, cap = spec.cap, negatives = 0;
  const waste: { t: number; amount: number; label: string }[] = [];
  for (const e of events) {
    if (e.type === "gain") {
      const over = Math.max(0, value + e.amount - cap);
      if (over > 0) waste.push({ t: e.t, amount: over, label: e.label });
      value = Math.min(cap, value + e.amount);
    } else if (e.type === "spend") {
      if (value - e.amount < 0) { negatives++; value = 0; } else value -= e.amount;
    } else if (e.type === "cap") {
      cap = e.cap;
      if (value > cap) { waste.push({ t: e.t, amount: value - cap, label: e.label }); value = cap; }
    } else {
      value = 0;
    }
  }
  const forced = mergeWindows(ctx.forced);
  return waste.map((w) => finding(ctx, {
    kind: "gauge-overcap", startMs: w.t, endMs: w.t,
    forced: inWindows(w.t, forced), cause: inWindows(w.t, forced) ? forcedPart(w.t - 1, w.t + 1, ctx.forced).cause : undefined,
    label: `${spec.name} overcap (${w.label})`,
    lostDamage: w.amount * spec.unitValue,
    inference: negatives > 0 ? true : undefined,
    basis: `${w.amount} ${spec.unit} × ${spec.valueBasis}` +
      (negatives > 0 ? `; the gauge simulation went below zero ${negatives} time${negatives > 1 ? "s" : ""}, so treat this as inference` : ""),
    detail: `${w.amount} ${spec.unit} lost: ${w.label}`,
  }));
}
