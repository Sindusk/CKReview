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
  // The window's damage bonus, 0.2 = +20%. "observed": measured per window
  // from FFLogs' multiplier, the player's average inside the window over
  // their median outside raid buffs, for windows that line up with the
  // party's buffs (Starry Muse). Crit/DH buffs aren't in it, so it's a floor.
  bonus:         number | "observed";
  bonusBasis:    string;      // where the bonus value comes from
  expectedGcds?: (ctx: PlayerCheckContext) => number;
  expected:      (ctx: PlayerCheckContext, casts: PlayerEvent[]) => ExpectedAction[];
  // The status is a debuff the player puts on the enemy (Kunai's Bane),
  // read from Pull.bossDebuffs instead of the player-buff stream.
  onEnemy?:      boolean;
  inference?:    boolean;
};

/** Windows where the player's own debuff is on any enemy. */
export function enemyStatusWindows(ctx: PlayerCheckContext, statusId: number): Window[] {
  const out: Window[] = [];
  const open = new Map<string, number>();
  for (const e of (ctx.pull.bossDebuffs ?? []).filter((x) => x.statusId === statusId && x.sourceName === ctx.player.name)) {
    const key = `${e.targetActorId}.${e.targetInstance ?? 1}`;
    if (e.status === "removed") {
      const start = open.get(key);
      if (start !== undefined) { out.push({ startMs: start, endMs: e.timestamp }); open.delete(key); }
    } else if (e.status === "applied" && !open.has(key)) {
      open.set(key, e.timestamp);
    }
  }
  for (const start of open.values()) out.push({ startMs: start, endMs: ctx.endMs + 1 });
  return mergeWindows(out);
}

/** The player's average hit multiplier in a window over their median outside raid buffs, minus 1. */
export function observedBonus(ctx: PlayerCheckContext, w: Window): number {
  const hits = ctx.player.damageDone.filter((e) => !e.isDoT && e.multiplier !== undefined && (e.amount ?? 0) > 0);
  const inside = hits.filter((e) => e.timestamp >= w.startMs && e.timestamp <= w.endMs).map((e) => e.multiplier!);
  const outside = hits.filter((e) => !inWindows(e.timestamp, ctx.buffWindows)).map((e) => e.multiplier!).sort((a, b) => a - b);
  if (inside.length === 0 || outside.length === 0) return 0;
  const base = outside[Math.floor(outside.length / 2)];
  return Math.max(0, inside.reduce((a, m) => a + m, 0) / inside.length / base - 1);
}

export function burstWindowFindings(ctx: PlayerCheckContext, specIn: BurstWindowSpec): DamageFinding[] {
  const out: DamageFinding[] = [];
  const windows = specIn.onEnemy ? enemyStatusWindows(ctx, specIn.statusId) : statusWindows(ctx, specIn.statusId);
  for (const w of windows) {
    if (w.endMs > ctx.endMs) continue;
    const spec = { ...specIn, bonus: specIn.bonus === "observed" ? observedBonus(ctx, w) : specIn.bonus };
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
      inference: spec.inference,
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

// ── DoTs ───────────────────────────────────────────────────────────────
// Modelled on xivanalysis's core DoTs module: uptime and clipping of the
// player's own DoT, read from Pull.bossDebuffs (the statuses players put
// on enemies). Uptime counts the DoT on ANY enemy (P3 has two bosses), from
// its first application, less forced time, ignoring gaps under one GCD +
// 1s (time to reapply). Clipping: a refresh with time left overwrites it.
// Lost damage is in the player's own average tick (ticks every 3s).

export type DotSpec = { statusIds: number[]; name: string; durationMs: number };

const DOT_TICK_MS = 3_000;

export function dotFindings(ctx: PlayerCheckContext, spec: DotSpec): DamageFinding[] {
  const out: DamageFinding[] = [];
  const ids = new Set(spec.statusIds);
  const events = (ctx.pull.bossDebuffs ?? [])
    .filter((e) => ids.has(e.statusId) && e.sourceName === ctx.player.name && e.timestamp < ctx.endMs)
    .sort((a, b) => a.timestamp - b.timestamp);
  if (events.length === 0) return out;
  const ticks = ctx.player.damageDone.filter((e) => ids.has(e.abilityId));
  const avgTick = ticks.length ? ticks.reduce((a, e) => a + (e.amount ?? 0), 0) / ticks.length : 0;

  const windows: Window[] = [];
  const open = new Map<string, { start: number; lastApply: number }>();
  const clips = new Map<number | undefined, { ms: number; n: number; start: number; end: number }>();
  for (const e of events) {
    const key = `${e.targetActorId}.${e.targetInstance ?? 1}`;
    const o = open.get(key);
    if (e.status === "removed") {
      if (o) { windows.push({ startMs: o.start, endMs: e.timestamp }); open.delete(key); }
      continue;
    }
    if (o) {
      const left = spec.durationMs - (e.timestamp - o.lastApply);
      if (left > 0) {
        const phaseId = ctx.phaseOf(e.timestamp);
        const c = clips.get(phaseId) ?? { ms: 0, n: 0, start: e.timestamp, end: e.timestamp };
        c.ms += left; c.n++; c.end = e.timestamp;
        clips.set(phaseId, c);
      }
      o.lastApply = e.timestamp;
    } else {
      open.set(key, { start: e.timestamp, lastApply: e.timestamp });
    }
  }
  for (const o of open.values()) windows.push({ startMs: o.start, endMs: ctx.endMs });

  const active = mergeWindows(windows);
  const forced = mergeWindows(ctx.forced);
  const grace = ctx.baseGcdMs + 1_000;
  let cursor = active[0].startMs;
  for (const w of [...active, { startMs: ctx.endMs, endMs: ctx.endMs }]) {
    if (w.startMs > cursor) {
      const len = w.startMs - cursor - overlapMs(cursor, w.startMs, forced);
      if (len >= grace) {
        out.push(finding(ctx, {
          kind: "dot-uptime", startMs: cursor, endMs: w.startMs, forced: false,
          label: `${spec.name} off the boss`,
          lostDamage: (len / DOT_TICK_MS) * avgTick,
          basis: `${s(len)} ÷ 3s ticks × ${k(avgTick)} average tick`,
          detail: `${spec.name} wasn't on the boss for ${s(len)}`,
        }));
      }
    }
    cursor = Math.max(cursor, w.endMs);
  }
  for (const [phaseId, c] of clips) {
    if (c.ms < DOT_CLIP_FINDING_MS) continue;
    out.push(finding(ctx, {
      kind: "dot-clip", startMs: c.start, endMs: c.end, forced: false,
      label: `${spec.name} refreshed early`,
      lostDamage: (c.ms / DOT_TICK_MS) * avgTick,
      basis: `${s(c.ms)} of remaining DoT overwritten ÷ 3s ticks × ${k(avgTick)} average tick`,
      detail: `${spec.name} refreshed early ${c.n} time${c.n > 1 ? "s" : ""} in ${ctx.phaseName(phaseId) ?? "the pull"}, ${s(c.ms)} of ticks overwritten`,
    }));
  }
  return out;
}

// xivanalysis's healer DoT modules start flagging clipping at 6s per minute.
const DOT_CLIP_FINDING_MS = 6_000;

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
