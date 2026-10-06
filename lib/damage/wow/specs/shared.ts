// lib/damage/wow/specs/shared.ts
//
// Building blocks for the WoW spec checks (docs/damage-analysis-plan.md,
// "WoW build order" step 6). Same role as lib/damage/ffxiv/jobs/shared.ts,
// whose game-neutral parts (statusWindows, castsIn, the number formats) are
// reused; these replace the parts that lean on FFLogs (the hit multiplier,
// fixed 3s DoT ticks). Every value is measured from the pull itself.
//
// ── Burst windows (burstGcdFindings) ───────────────────────────────────
// A window is the player's own buff (apply → remove, player-buff stream).
// GCDs that fit = the window's length ÷ the player's GCD at that time, less
// one (the window rarely starts on a GCD boundary). Each GCD short is
// valued at the player's average GCD × the window's bonus: only the bonus
// part, because the gap itself is already a GCD-gap finding. The bonus
// comes from the spec (measured per window where possible).
//
// ── DoT uptime (dotUptimeFindings) ─────────────────────────────────────
// The player's DoT on any enemy (Pull.bossDebuffs), from its first
// application, less forced time; gaps under one GCD + 1s are ignored (time
// to reapply). Lost = the gap × the DoT's own damage per second of uptime
// over the pull (WoW ticks are hasted, so no fixed tick length).
//
// ── Resource cap (resourceCapFindings) ─────────────────────────────────
// WCL logs a resource on a cast as its amount before the cast (types/
// PlayerInfo.ts `resources`). A cast that doesn't spend it, made at the
// resource's max, generated into a full bar: what it would have added is
// lost. Each ability's gain is measured from the pull: the amount on the
// next cast (within 3s) minus this cast's amount after its cost, median
// over casts that weren't near the cap. Lost = units wasted × the player's
// damage per unit from the resource's spenders.

import type { DamageFinding } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { forcedPart, inWindows, mergeWindows, overlapMs, type Window } from "../../timeline";
import { k, s, statusWindows } from "../../ffxiv/jobs/shared";

export { k, s, statusWindows };

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

// ── Burst windows ──────────────────────────────────────────────────────

export type BurstGcdSpec = {
  statusId:   number;
  name:       string;
  bonus(ctx: PlayerCheckContext, w: Window): number;  // 0.2 = +20%
  bonusBasis: string;
  inference?: boolean;
};

export function burstGcdFindings(ctx: PlayerCheckContext, spec: BurstGcdSpec): DamageFinding[] {
  const out: DamageFinding[] = [];
  for (const w of statusWindows(ctx, spec.statusId)) {
    if (w.endMs > ctx.endMs) continue;
    const gcdMs = ctx.baseGcdMs / ctx.factor * ctx.factorAt(w.startMs);
    const fit = Math.max(0, Math.floor((w.endMs - w.startMs) / gcdMs) - 1);
    const got = ctx.uses.filter((u) => u.startMs >= w.startMs && u.startMs <= w.endMs).length;
    const missing = fit - got;
    if (missing <= 0) continue;
    const bonus = spec.bonus(ctx, w);
    const value = ctx.values.gcdValue(ctx.phaseOf(w.startMs), inWindows(w.startMs, ctx.buffWindows));
    const forced = forcedPart(w.startMs, w.endMs, ctx.forced);
    out.push(finding(ctx, {
      kind: "burst-window", startMs: w.startMs, endMs: w.endMs,
      forced: forced.ms >= 1_500, cause: forced.ms >= 1_500 ? forced.cause : undefined,
      label: `${spec.name} window`,
      lostDamage: missing * value * bonus,
      inference: spec.inference,
      basis: `${missing} GCD${missing > 1 ? "s" : ""} short × ${k(value)} average GCD × ${Math.round(bonus * 100)}% (${spec.bonusBasis})`,
      detail: `${spec.name} at ${clock(w.startMs)}: ${got} of ${fit} GCDs that fit`,
    }));
  }
  return out;
}

/**
 * A window's damage bonus read from the hits themselves: for each ability
 * hit both inside and outside the window, the median unmitigatedAmount of
 * its non-crit hits inside ÷ outside, weighted by hits inside. 0 when there's
 * nothing to compare. Capped at OBSERVED_BONUS_CAP: everything lined up with
 * the window (trinkets, potions, lust-aligned procs) reads as its bonus too;
 * Sentinel measured +118% uncapped on nRGxQ1b8LdMvzC4D pull 6.
 */
export function observedWindowBonus(ctx: PlayerCheckContext, w: Window): number {
  const by = new Map<number, { inside: number[]; outside: number[] }>();
  for (const e of ctx.player.damageDone) {
    if (e.pet || e.isDoT || e.hitType !== 1 || !e.unmitigatedAmount) continue;
    const g = by.get(e.abilityId) ?? { inside: [], outside: [] };
    (e.timestamp >= w.startMs && e.timestamp <= w.endMs ? g.inside : g.outside).push(e.unmitigatedAmount);
    by.set(e.abilityId, g);
  }
  const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  let sum = 0, n = 0;
  for (const g of by.values()) {
    if (g.inside.length === 0 || g.outside.length < 3) continue;
    sum += (med(g.inside) / med(g.outside) - 1) * g.inside.length;
    n += g.inside.length;
  }
  return n > 0 ? Math.min(OBSERVED_BONUS_CAP, Math.max(0, sum / n)) : 0;
}

const OBSERVED_BONUS_CAP = 0.3;

// ── DoT uptime ─────────────────────────────────────────────────────────

export function dotUptimeFindings(ctx: PlayerCheckContext, spec: { statusIds: number[]; name: string }): DamageFinding[] {
  const ids = new Set(spec.statusIds);
  const events = (ctx.pull.bossDebuffs ?? [])
    .filter((e) => ids.has(e.statusId) && e.sourceName === ctx.player.name && e.timestamp < ctx.endMs)
    .sort((a, b) => a.timestamp - b.timestamp);
  if (events.length === 0) return [];
  const windows: Window[] = [];
  const open = new Map<string, number>();
  for (const e of events) {
    const key = `${e.targetActorId}.${e.targetInstance ?? 1}`;
    if (e.status === "removed") {
      const st = open.get(key);
      if (st !== undefined) { windows.push({ startMs: st, endMs: e.timestamp }); open.delete(key); }
    } else if (!open.has(key)) open.set(key, e.timestamp);
  }
  for (const st of open.values()) windows.push({ startMs: st, endMs: ctx.endMs });
  const active = mergeWindows(windows);
  const upMs = active.reduce((a, w) => a + Math.min(w.endMs, ctx.endMs) - w.startMs, 0);
  const dotDamage = ctx.player.damageDone.filter((e) => !e.pet && e.isDoT && ids.has(e.abilityId)).reduce((a, e) => a + (e.amount ?? 0), 0);
  const perMs = upMs > 0 ? dotDamage / upMs : 0;
  const forced = mergeWindows(ctx.forced);
  const grace = ctx.baseGcdMs + 1_000;
  const out: DamageFinding[] = [];
  let cursor = active[0].startMs;
  for (const w of [...active, { startMs: ctx.endMs, endMs: ctx.endMs }]) {
    if (w.startMs > cursor) {
      const len = w.startMs - cursor - overlapMs(cursor, w.startMs, forced);
      if (len >= grace) {
        out.push(finding(ctx, {
          kind: "dot-uptime", startMs: cursor, endMs: w.startMs, forced: false,
          label: `${spec.name} off the boss`,
          lostDamage: len * perMs,
          basis: `${s(len)} × ${k(perMs * 1000)}/s (${spec.name}'s damage per second of uptime this pull)`,
          detail: `${spec.name} wasn't on any enemy for ${s(len)}`,
        }));
      }
    }
    cursor = Math.max(cursor, w.endMs);
  }
  return out;
}

// ── Resource cap ───────────────────────────────────────────────────────

export type ResourceCapSpec = {
  type:        number;     // WCL classResources type (6 Runic Power)
  name:        string;     // "Runic Power"
  scale:       number;     // logged units per displayed unit (Runic Power logs ×10)
  // Abilities that spend it (value per unit comes from these); "auto": every
  // cast that logged a cost of it.
  spenderIds:  number[] | "auto";
};

// WCL classResources types logged on every cast (builders included) in the
// 2026-10-06 samples, and how they're scaled: Rage, Runic Power and Astral
// Power ×10 (max 1000 / 1250 / 1000–1400), Insanity ×100 (max 10000).
// Mana is left out (casters' only resource for Mages; not a damage
// resource), and Soul Shards, Holy Power, combo points and Essence are
// logged on their spenders only, so they can't show waste.
export const PRIMARY_RESOURCES: Record<number, { name: string; scale: number }> = {
  1:  { name: "Rage", scale: 10 },
  2:  { name: "Focus", scale: 1 },
  3:  { name: "Energy", scale: 1 },
  6:  { name: "Runic Power", scale: 10 },
  8:  { name: "Astral Power", scale: 10 },
  11: { name: "Maelstrom", scale: 1 },
  13: { name: "Insanity", scale: 100 },
  17: { name: "Fury", scale: 1 },
};

/** The player's most-logged resource among PRIMARY_RESOURCES, capped (resourceCapFindings). */
export function primaryResourceCapFindings(ctx: PlayerCheckContext): DamageFinding[] {
  const counts = new Map<number, number>();
  for (const c of ctx.player.casts) for (const r of c.resources ?? []) if (PRIMARY_RESOURCES[r.type]) counts.set(r.type, (counts.get(r.type) ?? 0) + 1);
  const type = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (type === undefined) return [];
  return resourceCapFindings(ctx, { type, ...PRIMARY_RESOURCES[type], spenderIds: "auto" });
}

const GAIN_PAIR_MS = 3_000;

export function resourceCapFindings(ctx: PlayerCheckContext, spec: ResourceCapSpec): DamageFinding[] {
  const casts = ctx.player.casts
    .filter((c) => !c.fake && c.timestamp < ctx.endMs)
    .map((c) => ({ c, r: c.resources?.find((x) => x.type === spec.type) }))
    .filter((x): x is { c: typeof x.c; r: NonNullable<typeof x.r> } => x.r !== undefined);
  if (casts.length < 10) return [];
  const max = casts[0].r.max;

  // Gain per ability, measured.
  const gains = new Map<number, number[]>();
  for (let i = 0; i + 1 < casts.length; i++) {
    const a = casts[i], b = casts[i + 1];
    if (b.c.timestamp - a.c.timestamp > GAIN_PAIR_MS || a.r.amount > max * 0.75) continue;
    const g = b.r.amount - (a.r.amount - (a.r.cost ?? 0));
    if (g <= 0) continue;
    const list = gains.get(a.c.abilityId) ?? [];
    list.push(g);
    gains.set(a.c.abilityId, list);
  }
  const gainOf = (id: number) => {
    const xs = gains.get(id);
    return xs && xs.length >= 3 ? [...xs].sort((p, q) => p - q)[Math.floor(xs.length / 2)] : undefined;
  };

  // Damage per unit from the spenders. An ability is a spender if any of its
  // casts logged a cost (some casts of Mortal Strike log none). Its damage
  // is matched by name: Annihilation's hits log under another id than its
  // cast.
  const spenderIds = new Set(spec.spenderIds === "auto"
    ? casts.filter((x) => (x.r.cost ?? 0) > 0).map((x) => x.c.abilityId)
    : spec.spenderIds);
  const damageByName = new Map<string, number>();
  for (const e of ctx.player.damageDone) {
    if (e.pet || e.timestamp >= ctx.endMs) continue;
    damageByName.set(e.abilityName, (damageByName.get(e.abilityName) ?? 0) + (e.amount ?? 0));
  }
  let spentUnits = 0, spenderDamage = 0;
  const countedNames = new Set<string>();
  for (const x of casts) {
    if (!spenderIds.has(x.c.abilityId)) continue;
    spentUnits += x.r.cost ?? 0;
    if (!countedNames.has(x.c.abilityName)) { countedNames.add(x.c.abilityName); spenderDamage += damageByName.get(x.c.abilityName) ?? 0; }
  }
  const perUnit = spentUnits > 0 ? spenderDamage / spentUnits : 0;

  const forced = mergeWindows(ctx.forced);
  const byPhase = new Map<number | undefined, { units: number; n: number; start: number; end: number; names: Map<string, number> }>();
  for (const x of casts) {
    if (spenderIds.has(x.c.abilityId) || x.r.amount < max) continue;
    const gain = gainOf(x.c.abilityId);
    if (!gain || inWindows(x.c.timestamp, forced)) continue;
    const ph = ctx.phaseOf(x.c.timestamp);
    const g = byPhase.get(ph) ?? { units: 0, n: 0, start: x.c.timestamp, end: x.c.timestamp, names: new Map() };
    g.units += gain; g.n++; g.end = x.c.timestamp;
    g.names.set(x.c.abilityName, (g.names.get(x.c.abilityName) ?? 0) + 1);
    byPhase.set(ph, g);
  }
  const out: DamageFinding[] = [];
  for (const [ph, g] of byPhase) {
    const shown = g.units / spec.scale;
    const names = [...g.names].sort((a, b) => b[1] - a[1]).map(([n, c]) => `${n} ×${c}`).join(", ");
    out.push(finding(ctx, {
      kind: "gauge-overcap", startMs: g.start, endMs: g.end, forced: false,
      label: `${spec.name} capped`,
      lostDamage: g.units * perUnit,
      basis: `${Math.round(shown)} ${spec.name} generated at the cap (each ability's gain measured from the pull) × ${k(perUnit * spec.scale)} per ${spec.name} from its spenders`,
      detail: `${g.n} casts at full ${spec.name} in ${ctx.phaseName(ph) ?? "the pull"}, ~${Math.round(shown)} lost: ${names}`,
    }));
  }
  return out;
}
