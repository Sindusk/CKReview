// lib/damage/ffxiv/jobs/shared.ts
//
// Building blocks for the job checks (docs/archive/damage-analysis-plan.md,
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
// Delirium's last stack goes at the same instant as the GCD using it), but
// nothing after it. A
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
// ── Casts that did no damage ───────────────────────────────────────────
// Every job gets this (game.ts jobChecks). An action is a damage action
// when at least NO_DAMAGE_MIN_CASTS casts were followed by a direct hit
// of the same name or id within NO_DAMAGE_HIT_MS, for NO_DAMAGE_SHARE of
// its casts. (Name, because the cast and the damage can log under
// different ids: Salt and Darkness 25755 casts, 25756 hits.) A cast of
// it with no hit (target invulnerable, out of the area, already dead) is
// lost, at the action's average per cast. Same-name casts within 50ms
// are one press: FFLogs also logs the damage id as a "cast" when it hits
// nothing. From xivanalysis's Salt and Darkness check, on jN3XDrf2z8PmLgRJ
// Vamp pull 8 (8:39, no hit while Salted Earth stopped ticking). Marked
// inference: the cooldown may have come back in time to use anyway. A
// cast in forced time is forced: Standard Finish is pressed in downtime
// for its buff. Seen across the samples: spells finishing on a target
// that went invulnerable (Fall Malefic on Charnel Cell hit for 0), Circle
// of Scorn out of range, single-target GCDs on a dead add.
//
//   Copyright (c) 2018 Saxon Landers & contributors (the window model)
//   MIT License; full text in THIRD_PARTY_NOTICES.md.

import type { PlayerEvent } from "@/types/PlayerInfo";
import type { DamageFinding, GaugeTrack, JobCheck, Moment } from "../../types";
import { finding, measuredPenaltyFactor, type PlayerCheckContext } from "../../checks";
import { forcedPart, gcdKinds, inWindows, mergeWindows, overlapMs, type Window } from "../../timeline";
import { estimateHitRates } from "../../crit-rates";

// The removal's own timestamp, no later. A 100ms allowance counted a
// Paladin's Sepulchre cast 40ms after Fight or Flight fell off
// (jN3XDrf2z8PmLgRJ Vamp pull 8, 5:38), whose hit logged ×1.00. Every
// cast 40-90ms after a Fight or Flight, Divination or Lance Charge
// removal on jN3XDrf2z8PmLgRJ and dQ8wmb1VhKt6yBXk (about 30) hit
// without the status in its snapshot.
const SAME_TIMESTAMP_MS = 0;

export const s = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
export const k = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : `${Math.round(n / 1000)}k`);
export const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

/** Windows where a status is on the player, from the player-buff stream. */
const PRE_PULL_SLACK_MS = 1_000;
const SAME_INSTANT_MS = 20;

export function statusWindows(ctx: PlayerCheckContext, statusId: number): Window[] {
  const out: Window[] = [];
  let open: number | undefined;
  const events = [...(ctx.player.buffs ?? [])].filter((e) => e.abilityId === statusId).sort((a, b) => a.timestamp - b.timestamp);
  // A status applied before the pull shows only its removal: start it
  // one duration (from a later application) earlier, when that falls
  // before the pull. qjCMx4bRfgNKwX9T fight 16's Paladin pressed Fight
  // or Flight at −2.2s; the window was invisible (xivanalysis: 7/8 GCDs).
  // A late-start capture's first removal lands mid-pull and stays out.
  const durationMs = events.find((e) => e.buffStatus === "applied" && e.durationMs)?.durationMs;
  const first = events[0];
  if (first?.buffStatus === "removed" && durationMs && first.timestamp - durationMs <= PRE_PULL_SLACK_MS) open = first.timestamp - durationMs;
  for (const e of events) {
    if (e.buffStatus === "removed") {
      if (open !== undefined) { out.push({ startMs: open, endMs: e.timestamp }); open = undefined; }
    } else if (e.buffStatus === "applied" && open === undefined) {
      // Removed and re-applied in the same instant is one window: WoW logs
      // Devastation's Animosity extending Dragonrage that way
      // (qpZx3mWaG7gcDdYB pull 3, 2:55–3:16), which cut the 2:46 window
      // into five and kept only the 3:05 piece.
      const last = out[out.length - 1];
      if (last && e.timestamp - last.endMs <= SAME_INSTANT_MS) open = out.pop()!.startMs;
      else open = e.timestamp;
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

/**
 * When each completed cast of an action went off. A gauge the action
 * builds comes with the cast, hit or not, not ~1s later with the hit:
 * K6qfMamL7rN8yz2Q Vamp Fatale, the Pictomancer's 3:19.17 Water in Blue
 * hit at 3:20.15, after the 3:19.84 Subtractive Palette it paid for; Red
 * Hot and Deep Blue, a 6:31.49 Water at a Watery Grave never landed, and a
 * later Subtractive needed its 25. (xivanalysis counts only successful
 * hits.)
 */
export function gaugeCastTimes(ctx: PlayerCheckContext, abilityId: number): number[] {
  return ctx.player.casts.filter((c) => c.abilityId === abilityId).map((c) => c.timestamp);
}

// ── Burst windows ──────────────────────────────────────────────────────

export type ExpectedAction = {
  ids:    number[];
  count:  number;
  name:   string;
  // How a missing one is valued; default = its average × the window bonus
  // (it was used outside the window instead).
  value?: (ctx: PlayerCheckContext) => number;
  // Whether it could have been used in this window. Default: an action on
  // a longer cooldown than the window's own cycle (one charge) is expected
  // only if it came off cooldown by the window's end. A 60s Lance Charge
  // can't hold a 120s Dragonfire Dive every time (jN3XDrf2z8PmLgRJ Vamp
  // pull 8: every odd-minute window "missed" it; xivanalysis expects it
  // every other window). Actions on the window's cycle or shorter (a 60s
  // Double Down in a 60s No Mercy) are always expected: pressed early,
  // they're misaligned, not unavailable.
  availableIf?: (ctx: PlayerCheckContext, w: Window, cycleMs: number) => boolean;
  // How many it got in the window, when not a count of its casts (Bard's
  // Barrage counts when consumed inside it).
  got?:   (ctx: PlayerCheckContext, w: Window, casts: PlayerEvent[]) => number;
  // `value` is the action's worth before the window's bonus: multiply it in.
  scaled?: boolean;
  // How many this window expects, when it depends on the window (Monk's
  // Blitzes: one per Perfect Balance charge it had time for). Overrides count.
  countIn?: (ctx: PlayerCheckContext, w: Window) => number;
  // When a use at t is next possible, for a window the kill cut short (see
  // burstWindowFindings). Default: t + its cooldown (an action with charges
  // is never judged there: a banked charge may have been coming). Lord of
  // Crowns: the next Astral Draw.
  readyAgain?: (ctx: PlayerCheckContext, t: number) => number;
};

// Pressed this soon before the window, it could have been held for it.
const HOLDABLE_MS = 10_000;

/**
 * Whether any of these actions was off cooldown at some point in the window
 * (or pressed just before it, when it could have been held). Only actions
 * on a cooldown longer than cycleMs are ever unavailable.
 */
export function offCooldownIn(ctx: PlayerCheckContext, ids: number[], w: Window, cycleMs: number): boolean {
  return ids.some((id) => {
    const a = ctx.game.action(id);
    if (!a || a.charges > 1 || a.cooldownMs <= cycleMs * 1.1) return true;
    const last = ctx.player.casts.filter((c) => c.abilityId === id && c.timestamp < w.startMs).pop();
    return !last || last.timestamp + a.cooldownMs <= w.endMs || w.startMs - last.timestamp <= HOLDABLE_MS;
  });
}

export type BurstWindowSpec = {
  statusId:      number;
  name:          string;
  // The window's damage bonus, 0.2 = +20%. "observed": measured per window
  // from FFLogs' multiplier, the player's average inside the window over
  // their median outside raid buffs, for windows that line up with the
  // party's buffs (Starry Muse). Crit/DH buffs aren't in it, so it's a floor.
  bonus:         number | "observed";
  bonusBasis:    string;      // where the bonus value comes from
  // `casts`: the player's casts in the window (Ten Chi Jin in a Kunai's
  // Bane window adds a GCD).
  expectedGcds?: (ctx: PlayerCheckContext, casts: PlayerEvent[]) => number;
  // GCDs that don't count toward expectedGcds (Ninja's mudras).
  ignoreGcdIds?: Set<number>;
  expected:      (ctx: PlayerCheckContext, casts: PlayerEvent[]) => ExpectedAction[];
  // The status is a debuff the player puts on the enemy (Kunai's Bane),
  // read from Pull.bossDebuffs instead of the player-buff stream.
  onEnemy?:      boolean;
  // The window is where every one of these statuses (the player's own) is
  // up at once, instead of statusId's (Bard: Raging Strikes, Battle Voice
  // and Radiant Finale together).
  allOf?:        number[];
  inference?:    boolean;
  // How long the full window takes from its start, for a window its own
  // last action ends early (Reawaken, ended by Ouroboros). One whose full
  // span runs past the end of the pull was cut by the kill (see
  // burstWindowFindings).
  spanMs?:       (ctx: PlayerCheckContext) => number;
  // The windows themselves, for a status only the hit snapshots carry
  // (Dragoon's Life of the Dragon: 20s from each Geirskogul). Overrides
  // statusId / allOf / onEnemy.
  windows?:      (ctx: PlayerCheckContext) => Window[];
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
  const hits = ctx.player.damageDone.filter((e) => !e.pet && !e.isDoT && e.multiplier !== undefined && (e.amount ?? 0) > 0);
  const inside = hits.filter((e) => e.timestamp >= w.startMs && e.timestamp <= w.endMs).map((e) => e.multiplier!);
  const outside = hits.filter((e) => !inWindows(e.timestamp, ctx.buffWindows)).map((e) => e.multiplier!).sort((a, b) => a - b);
  if (inside.length === 0 || outside.length === 0) return 0;
  const base = outside[Math.floor(outside.length / 2)];
  return Math.max(0, inside.reduce((a, m) => a + m, 0) / inside.length / base - 1);
}

/** Where every list has a window at once. */
function overlapWindows(lists: Window[][]): Window[] {
  if (lists.length === 0) return [];
  let out = lists[0];
  for (const next of lists.slice(1)) {
    const both: Window[] = [];
    for (const a of out) {
      for (const b of next) {
        const s = Math.max(a.startMs, b.startMs), e = Math.min(a.endMs, b.endMs);
        if (e > s) both.push({ startMs: s, endMs: e });
      }
    }
    out = both;
  }
  return out.sort((a, b) => a.startMs - b.startMs);
}

export function burstWindowFindings(ctx: PlayerCheckContext, specIn: BurstWindowSpec): DamageFinding[] {
  const out: DamageFinding[] = [];
  const windows = specIn.windows ? specIn.windows(ctx)
    : specIn.allOf ? overlapWindows(specIn.allOf.map((id) => statusWindows(ctx, id)))
    : specIn.onEnemy ? enemyStatusWindows(ctx, specIn.statusId) : statusWindows(ctx, specIn.statusId);
  // The window's own cycle: the shortest gap between window starts (its
  // recast, give or take drift). With one window, nothing is unavailable.
  const starts = windows.map((w) => w.startMs);
  const cycleMs = starts.length > 1 ? Math.min(...starts.slice(1).map((t, i) => t - starts[i])) : Infinity;
  // Heal GCDs don't fill a burst window (xivanalysis's Fight or Flight
  // ignores Clemency: two at 5:14 on the dDar482XvFKBPJYh FRU kill made
  // its 4/8 our 6/8).
  const kinds = gcdKinds(ctx.player, ctx.pull, ctx.uses);
  // A window the kill cut short (still up at the end, or its full span runs
  // past it) is judged only on what the kill didn't take away (user,
  // 2026-10-14): the GCDs that fit before the kill, and an expected action
  // only if the player spent it outside the window since the previous one
  // and it couldn't have come back before the kill (it was the window's
  // use, pressed early). An action still to come when the boss died isn't
  // a miss: vVPtwaTQ62Jg391q Vamp Fatale's 8:11 Technical Finish, ended at
  // 8:23 with Starfall Dance and Tillana unpressed (once read as 242k).
  // K6qfMamL7rN8yz2Q Red Hot and Deep Blue: the AST's 8:41 Divination,
  // with the Lord of Crowns from the 7:35 Astral Draw played at 7:45.
  windows.forEach((w, wi) => {
    const cut = w.endMs > ctx.endMs || (specIn.spanMs !== undefined && w.startMs + specIn.spanMs(ctx) > ctx.endMs);
    if (cut && w.startMs >= ctx.endMs) return;
    const prevEnd = wi > 0 ? windows[wi - 1].endMs : -Infinity;
    judge(cut ? { startMs: w.startMs, endMs: Math.min(w.endMs, ctx.endMs) } : w, cut, prevEnd);
  });
  return out;

  function judge(w: Window, cut: boolean, prevEnd: number) {
    const spec ={ ...specIn, bonus: specIn.bonus === "observed" ? observedBonus(ctx, w) : specIn.bonus };
    // Inclusive end: a stack-consumed buff (Delirium) loses its last stack
    // at the same timestamp as the cast that used it.
    // Timed buffs too: a GCD cast at the removal instant snapshots it
    // (4 of 4 such casts on the samples carry the status in the hit;
    // K6qfMamL7rN8yz2Q's Hammer Brush at 8:30.12 as Starry Muse ended,
    // where xivanalysis says it missed the window).
    const end = w.endMs + SAME_TIMESTAMP_MS;
    const gcds = ctx.uses.filter((u) => u.startMs >= w.startMs && u.startMs <= end && kinds.get(u.action.id) !== "heal" &&
      !spec.ignoreGcdIds?.has(u.action.id));
    const casts = ctx.player.casts.filter((c) => c.timestamp >= w.startMs && c.timestamp <= end);
    const fullGcds = spec.expectedGcds?.(ctx, casts);
    // Cut by the kill: only the GCDs that fit before it.
    const expectedGcds = fullGcds !== undefined && cut ? Math.min(fullGcds, Math.floor((w.endMs - w.startMs) / ctx.baseGcdMs)) : fullGcds;
    const missingGcds = expectedGcds !== undefined ? Math.max(0, expectedGcds - gcds.length) : 0;
    const missing: { name: string; n: number; value: number }[] = [];
    for (const e of spec.expected(ctx, casts)) {
      if (!(e.availableIf ? e.availableIf(ctx, w, cycleMs) : offCooldownIn(ctx, e.ids, w, cycleMs))) continue;
      const got = e.got ? e.got(ctx, w, casts) : casts.filter((c) => e.ids.includes(c.abilityId)).length;
      let n = Math.max(0, (e.countIn ? e.countIn(ctx, w) : e.count) - got);
      if (cut && n > 0) {
        // Only uses spent since the previous window that couldn't have come
        // back before the kill: the window's own, pressed early.
        const readyAgain = e.readyAgain ?? ((c: PlayerCheckContext, t: number) => {
          const a = ctx.game.action(e.ids.find((id) => ctx.game.action(id)) ?? -1);
          return !a || a.charges > 1 ? -Infinity : t + a.cooldownMs;
        });
        n = Math.min(n, ctx.player.casts.filter((c) => e.ids.includes(c.abilityId) && c.timestamp > prevEnd && c.timestamp < w.startMs &&
          readyAgain(ctx, c.timestamp) > w.endMs).length);
      }
      if (n === 0) continue;
      const each = e.value ? e.value(ctx) * (e.scaled ? spec.bonus : 1) : Math.max(...e.ids.map((id) => ctx.values.perUse(id))) * spec.bonus;
      missing.push({ name: e.name, n, value: n * each });
    }
    if (missingGcds === 0 && missing.length === 0) return;

    const phaseId = ctx.phaseOf(w.startMs);
    const gcdValue = ctx.values.gcdValue(phaseId, inWindows(w.startMs, ctx.buffWindows));
    const lostGcds = missingGcds * gcdValue * spec.bonus;
    const forced = forcedPart(w.startMs, w.endMs, ctx.forced);
    const parts = [
      // Only a shortfall is worth saying ("9/8" read as an error).
      missingGcds > 0 ? `${gcds.length}/${expectedGcds} GCDs` : undefined,
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
      detail: `${spec.name} at ${clock(w.startMs)}${cut ? ` (cut by the ${ctx.pull.result === "Kill" ? "kill" : "wipe"})` : ""}: ${parts.join("; ")}`,
    }));
  }
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
  // What re-applying it costs, for a stretch that forced time cuts off
  // (a downtime, an HP check passed): there it's only worth the bonus on
  // what was dealt before the cut, less this (Dragoon's Power Surge: the
  // Spiral Blow route in place of Lance Barrage → Heavens' Thrust).
  refreshCost?: (ctx: PlayerCheckContext, fromMs: number, toMs: number) => number;
  // Extra time to bring it back after a long forced stretch, past graceMs
  // (a combo step that grants it).
  reapplyMs?: number;
  // The combo's starters: after a long forced stretch the ramp counts from
  // the first one (a combo held through the stretch is finished first).
  restartIds?: number[];
};

// A forced stretch shorter than this doesn't cut a buff or DoT gap off:
// the player can still re-apply after it (vVPtwaTQ62Jg391q 8:21.9, a 0.3s
// blip inside a Power Surge gap).
const CUT_MIN_MS = 5_000;

// The first combo starter (restartIds) pressed in [fromMs, toMs), else fromMs.
function restartAt(ctx: PlayerCheckContext, restartIds: number[] | undefined, fromMs: number, toMs: number): number {
  if (!restartIds?.length) return fromMs;
  const u = ctx.uses.find((x) => x.startMs >= fromMs && x.startMs < toMs && restartIds.includes(x.action.id));
  return u ? u.startMs : fromMs;
}

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
    // Only what was dealt outside forced time: past a phase's HP check the
    // damage was wasted anyway (2T1HzdPKgbhM43am fight 10, Power Surge
    // down from 6:11 into P2's 0% stretch).
    const dealtIn = (a: number, b: number) => ctx.values.damageIn(a, b) - forced
      .filter((f) => f.endMs > a && f.startMs < b)
      .reduce((x, f) => x + ctx.values.damageIn(Math.max(f.startMs, a), Math.min(f.endMs, b)), 0);
    const dealt = dealtIn(g.startMs, g.endMs);
    // Stretches forced time cuts off are worth their bonus less the
    // refresh's cost. yBKPqGwHparm7Tk4 fight 5, Dragoon's Power Surge
    // 3:05.2-3:10.7 (P1 check passed): 23k of bonus against ~33k for the
    // Spiral Blow route (user, 2026-10-13).
    let cutOff = 0, at = g.startMs;
    for (const f of forced) {
      if (f.endMs <= at || f.startMs >= g.endMs || f.endMs - f.startMs < CUT_MIN_MS) continue;
      if (f.startMs > at) {
        const cost = spec.refreshCost ? Math.max(0, spec.refreshCost(ctx, at, f.startMs)) : 0;
        cutOff += Math.min(cost, dealtIn(at, f.startMs) * spec.bonus);
      }
      at = Math.max(at, f.endMs);
    }
    // After a long forced stretch the buff comes back through its rotation
    // (Power Surge on the 2nd GCD after Raiden Thrust): the ramp isn't a
    // loss (yBKPqGwHparm7Tk4 fight 5, P3 opening 7:09.9 → 7:12.3).
    // Counted from the combo's restart when it held through (end of P3).
    if (at > g.startMs && at < g.endMs) {
      const restart = restartAt(ctx, spec.restartIds, at, g.endMs);
      const tailFree = g.endMs - restart - overlapMs(restart, g.endMs, forced);
      cutOff += dealtIn(at, tailFree < spec.graceMs + (spec.reapplyMs ?? 0) ? g.endMs : restart) * spec.bonus;
    }
    const lost = dealt * spec.bonus - cutOff;
    if (lost < 1) continue;
    out.push(finding(ctx, {
      kind: "buff-uptime", startMs: g.startMs, endMs: g.endMs, forced: false,
      label: `${spec.name} down`,
      lostDamage: lost,
      inference: spec.inference,
      basis: `${k(dealt)} dealt while it was down × ${Math.round(spec.bonus * 100)}% (${spec.bonusBasis})` +
        (cutOff ? `, less ${k(cutOff)}: stretches cut off by forced time are worth only what re-applying it gained over its cost, and its return after one is on time` : ""),
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
//
// With a filler (healers), each application is valued against the filler
// at the same buff state (in or out of raid buffs), two ways:
// - The DoT ran its course on a live enemy: an early refresh didn't lose
//   ticks (the new one ticks at the same rate), it made the next refresh
//   come sooner. L seconds early = L ÷ duration of an extra DoT cast in
//   place of a filler. Summed per phase ("refreshed early"). Only what
//   pressing it one or more GCDs later would have gained counts, less the
//   ticks that delay drops (expected: lapse ÷ 3s × average tick), plus
//   what the delay changes in buffs: the snapshot the new DoT takes and
//   the GCDs it pushes one slot earlier (buffFactors; penalties already
//   counted by the penalty finding are left out). Inside
//   one GCD of expiry a refresh is on time unless the lapse a delay causes
//   is short (AST: under ~0.8s still favours waiting). User, 2026-10-13;
//   vVPtwaTQ62Jg391q The Tyrant kill, the Sage's 11 refreshes, 14.0s
//   clipped, are now one, the 0:25 re-dot with 8s left.
// - It was cut short (the status came off, the enemy took no ticks for
//   4.5s+, or a kill ended): no later refresh was coming, so the choice was
//   this DoT or a filler. What it added = its direct hit + its ticks after
//   the previous application would have run out; below the filler, it
//   loses the difference. On jN3XDrf2z8PmLgRJ Vamp pull 8 the AST's
//   Combust III at 0:57 added 3 ticks (25k) before the boss left for 20s,
//   against a 30k Fall Malefic (xivanalysis's 20s "invulnerable").
// Ticks for 0 (an invulnerable enemy) don't count. An application whose
// run reaches the end of a wipe's analysis is skipped (unknowable); on a
// kill it counts. The DoTs are instants: when moving, no filler was
// possible, which the basis says.

export type DotSpec = {
  statusIds:   number[];
  name:        string;
  durationMs:  number;
  fillerId?:   (ctx: PlayerCheckContext) => { id: number; name: string } | undefined;
  // Only the uptime: another DoT's spec values the refreshes they share
  // (Bard's Caustic Bite, refreshed with Stormbite by Iron Jaws).
  uptimeOnly?: boolean;
  // Other casts that apply or refresh it (Iron Jaws).
  castIds?:    number[];
  // An early refresh in raid buffs is a snapshot, not a cost: the new DoT
  // ticks under the buffs for its whole duration (Bard's burst Iron Jaws).
  snapshotInBuffs?: boolean;
  // The job's other DoTs, each needing its own GCD to apply once all have
  // lapsed (Bard's Caustic Bite and Stormbite after an add or downtime):
  // each one the player applied first in a gap adds a GCD to its grace.
  pairedIds?:  number[];
  // What applying it costs over not applying it, for a gap that forced
  // time cuts short. Default: its own hit against an average GCD; a DoT
  // on a combo route costs the route it displaces (Dragoon).
  applyCost?:  (ctx: PlayerCheckContext) => number;
  // GCDs its combo needs before it can go back on after a long forced
  // stretch (Dragoon: Raiden Thrust, Spiral Blow), added to the grace.
  reapplyGcds?: number;
  restartIds?:  number[];   // as UptimeSpec.restartIds
};

const DOT_CAST_MS = 1_500;   // cast → status applied
const DOT_HIT_MS = 2_000;    // cast → its direct hit
const DOT_SILENT_MS = 4_500; // no tick for longer than a tick and a half
const DOT_MIN_SHORTFALL = 0.05; // under 5% of a filler is noise (crit variance)
const SLOT_HIT_MS = 1_500;      // a GCD's land → its hit
const NEAR_HIT_MS = 3_000;      // fallback: any hit this close reads the buffs
const DH_MULT = 1.25;
const MAX_DELAY_GCDS = 20;

/**
 * What a hit at a moment is worth relative to an unbuffed one: FFLogs'
 * multiplier (damage buffs, the DoT's snapshot on its ticks) times the
 * expected gain from the crit / direct-hit buffs it carried, at the
 * player's estimated rates. A DoT tick carries its snapshot (vVPtwaTQ62Jg391q
 * The Tyrant kill: the Sage's 0:25 Eukrasian Dosis ticked at 1.23 with
 * Battle Litany through 0:53, long after the buffs fell off).
 */
// A snapshot: the hit's factor and the penalty debuffs (Weakness, Damage
// Down) in it.
type Snap = { f: number; pens: number[] };

function buffFactors(ctx: PlayerCheckContext) {
  const rates = estimateHitRates([ctx.player], ctx.game, new Set());
  const c0 = rates?.crit ?? 0.25, d0 = rates?.directHit ?? 0.3, m = rates?.critMult ?? 1.55;
  const expect = (c: number, d: number) => (1 + Math.min(1, c) * (m - 1)) * (1 + Math.min(1, d) * (DH_MULT - 1));
  const base = expect(c0, d0);
  const factor = (e: PlayerEvent) => {
    let c = c0, d = d0;
    for (const id of e.statusIds ?? []) { const b = ctx.game.partyBuff(id); c += b?.crit ?? 0; d += b?.directHit ?? 0; }
    return (e.multiplier ?? 1) * expect(c, d) / base;
  };
  // The penalty finding (checks.ts checkPenalties) already counts every hit
  // carrying a penalty up to 1s past its end, DoT ticks included: those
  // hits are valued here as if unpenalized, so only a snapshot that
  // outlives the debuff counts again.
  const penEnd = new Map<number, Window[]>();
  const opened = new Map<number, number>();
  for (const e of [...ctx.player.debuffs].sort((a, b) => a.timestamp - b.timestamp)) {
    if (ctx.game.penaltyFactor(e.abilityId) === undefined) continue;
    if (e.debuffStatus === "removed") {
      const st = opened.get(e.abilityId);
      if (st !== undefined) { penEnd.set(e.abilityId, [...(penEnd.get(e.abilityId) ?? []), { startMs: st, endMs: e.timestamp + 1_000 }]); opened.delete(e.abilityId); }
    } else if (!opened.has(e.abilityId)) opened.set(e.abilityId, e.timestamp);
  }
  for (const [id, st] of opened) penEnd.set(id, [...(penEnd.get(id) ?? []), { startMs: st, endMs: Infinity }]);
  const penFactor = (id: number) => measuredPenaltyFactor(ctx.pull, id)?.factor ?? ctx.game.penaltyFactor(id) ?? 1;
  const snap = (e: PlayerEvent): Snap => ({ f: factor(e), pens: (e.statusIds ?? []).filter((id) => penEnd.has(id)) });
  /** A snapshot's worth on a hit landing at t: penalties the penalty finding counts there are taken out. */
  const worth = (s: Snap, t: number) =>
    s.pens.reduce((f, id) => (inWindows(t, penEnd.get(id)!) ? f / penFactor(id) : f), s.f);
  const direct = ctx.player.damageDone
    .filter((e) => !e.pet && !e.isDoT && !ctx.game.isTickAbility(e.abilityId) && (e.amount ?? 0) > 0)
    .sort((a, b) => a.timestamp - b.timestamp);
  /** The buffs a hit landing at t would have had, read from the player's own hits then. */
  const at = (t: number): Snap => {
    const after = direct.find((e) => e.timestamp >= t && e.timestamp <= t + SLOT_HIT_MS);
    if (after) return snap(after);
    let best: PlayerEvent | undefined;
    for (const e of direct) if (Math.abs(e.timestamp - t) <= NEAR_HIT_MS && (!best || Math.abs(e.timestamp - t) < Math.abs(best.timestamp - t))) best = e;
    return best ? snap(best) : { f: 1, pens: [] };
  };
  // An action's average damage per cast with buffs taken out (crit luck
  // averages out over its casts); multi-target hits within 500ms are one cast.
  const norm = new Map<number, number>();
  const unbuffedPerCast = (id: number) => {
    if (norm.has(id)) return norm.get(id)!;
    const casts: number[] = [];
    let last = -Infinity;
    for (const e of direct) {
      if (e.abilityId !== id) continue;
      if (e.timestamp - last >= 500) casts.push(0);
      casts[casts.length - 1] += (e.amount ?? 0) / factor(e);
      last = e.timestamp;
    }
    const v = casts.length ? casts.reduce((a, x) => a + x, 0) / casts.length : 0;
    norm.set(id, v);
    return v;
  };
  return { factor, snap, worth, at, direct, unbuffedPerCast };
}

function dotApplicationFindings(ctx: PlayerCheckContext, spec: DotSpec, filler: { id: number; name: string }): DamageFinding[] {
  const out: DamageFinding[] = [];
  const ids = new Set(spec.statusIds);
  const events = (ctx.pull.bossDebuffs ?? [])
    .filter((e) => ids.has(e.statusId) && e.sourceName === ctx.player.name)
    .sort((a, b) => a.timestamp - b.timestamp);
  const keyOf = (e: { targetActorId?: number; targetInstance?: number }) => `${e.targetActorId}.${e.targetInstance ?? 1}`;
  // An invulnerable enemy still logs ticks, for 0 (Chaos on dQ8wmb1VhKt6yBXk
  // P3): those aren't ticks the DoT got.
  const ticks = ctx.player.damageDone.filter((e) => ids.has(e.abilityId) && (e.amount ?? 0) > 0);
  const tickAvg = ticks.length ? ticks.reduce((a, e) => a + (e.amount ?? 0), 0) / ticks.length : 0;
  const bf = buffFactors(ctx);
  const gcdSlots = [...ctx.uses].sort((a, b) => a.startMs - b.startMs);
  const fillerHits = ctx.player.damageDone.filter((e) => e.abilityId === filler.id && !e.isDoT);
  const fillerAvg = (buffed: boolean) => {
    const own = fillerHits.filter((e) => inWindows(e.timestamp, ctx.buffWindows) === buffed);
    const pool = own.length >= 3 ? own : fillerHits;
    return pool.length ? pool.reduce((a, e) => a + (e.amount ?? 0), 0) / pool.length : 0;
  };
  const dotCasts = ctx.player.casts.filter((c) => spec.castIds?.includes(c.abilityId) ||
    ctx.game.action(c.abilityId)?.appliesStatusIds.some((id) => ids.has(id)));
  const lastApply = new Map<string, number>();
  const steady = new Map<number | undefined, { ms: number; lost: number; n: number; start: number; end: number; moments: Moment[] }>();
  // One record per target the application landed on. An AoE DoT (High
  // Thunder II on both P3 bosses, 2T1HzdPKgbhM43am fight 10) is one cast
  // and one GCD: its records are judged together below, not once each.
  type Rec = {
    castAt: number; appliedAt: number; key: string; targetName?: string; until: number; removal: number; left: number; cut: number; silent: number;
    gained: number; hit: number; newTicks: number; hasHit: boolean; isSteady: boolean;
  };
  const byCast = new Map<number, Rec[]>();
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const key = keyOf(e);
    if (e.status === "removed") { lastApply.delete(key); continue; }
    const prev = lastApply.get(key);
    lastApply.set(key, e.timestamp);
    if (e.timestamp >= ctx.endMs) continue;
    const from = prev === undefined ? e.timestamp : Math.max(e.timestamp, prev + spec.durationMs);
    const removal = events.slice(i + 1).find((x) => x.status === "removed" && keyOf(x) === key)?.timestamp ?? Infinity;
    const runsOut = e.timestamp + spec.durationMs;
    const until = Math.min(runsOut, removal, ctx.endMs);
    if (until === ctx.endMs && ctx.pull.result !== "Kill") continue;
    const added = ticks.filter((t) => keyOf(t) === key && t.timestamp > from && t.timestamp <= until + 500);
    const cast = [...dotCasts].reverse().find((c) => c.timestamp <= e.timestamp && e.timestamp - c.timestamp <= DOT_CAST_MS);
    const direct = cast ? ctx.player.damageDone.filter((h) => h.abilityId === cast.abilityId && !h.isDoT &&
      !ctx.game.isTickAbility(h.abilityId) && keyOf(h) === key && h.timestamp >= cast.timestamp && h.timestamp <= cast.timestamp + DOT_HIT_MS) : [];
    const castAt = cast?.timestamp ?? e.timestamp;
    const lastTick = ticks.filter((t) => keyOf(t) === key && t.timestamp > e.timestamp && t.timestamp <= until + 500).pop()?.timestamp ?? e.timestamp;
    const silent = until - lastTick;
    const cut = runsOut - until;
    const hit = direct.reduce((a, h) => a + (h.amount ?? 0), 0);
    const recs = byCast.get(castAt) ?? [];
    recs.push({
      castAt, appliedAt: e.timestamp, key, targetName: e.targetName, until, removal, cut, silent, hit,
      left: prev !== undefined ? prev + spec.durationMs - e.timestamp : 0,
      gained: hit + added.reduce((a, h) => a + (h.amount ?? 0), 0),
      newTicks: added.length, hasHit: direct.length > 0,
      isSteady: cut < DOT_TICK_MS && silent < DOT_SILENT_MS,
    });
    byCast.set(castAt, recs);
  }

  for (const [castAt, recs] of byCast) {
    const buffed = inWindows(castAt, ctx.buffWindows);
    const fill = fillerAvg(buffed);
    if (fill <= 0) continue;
    const forced = forcedPart(castAt - 1, castAt + 1, ctx.forced);

    // The DoT ran its course on some target: an early refresh only brought
    // the next one closer. One cost per cast, at its longest overwrite.
    // Summed per phase below.
    const ran = recs.filter((r) => r.isSteady);
    if (ran.length > 0) {
      const r = ran.reduce((a, b) => (b.left > a.left ? b : a));
      if (r.left <= 0 || forced.ms > 0 || (spec.snapshotInBuffs && buffed)) continue;
      const hit = Math.max(...recs.map((x) => x.hit));
      // Refreshes come on the GCD grid, so a DoT rarely runs out exactly on
      // a GCD (user, 2026-10-13: Sage at 2.45s against a 30s DoT). The
      // alternative to a refresh is the same press k GCDs later: it saves
      // k GCDs of clipping, and past the time left it drops ticks. Only
      // the best such delay counts; none better means it was on time.
      //
      // Delaying also changes what the buffs touch (user, 2026-10-13): the
      // new DoT snapshots the buffs of the later moment for all its ticks,
      // and each GCD in between moves one slot earlier, into the buffs of
      // the slot before it. Both are read from the log: the DoT's snapshot
      // from its ticks, each slot's from that GCD's own hit (bf.at as a
      // fallback), values with buffs taken out (bf.unbuffedPerCast). The
      // Sage's 0:25 re-dot in buffs on The Tyrant kill came out about even
      // against three GCDs later (+20k snapshot, −9k Dosis III out of the
      // buffs, −12k clip).
      const per = Math.max(0, fillerAvg(false) - hit) / spec.durationMs;
      const at = gcdSlots.findIndex((u) => Math.abs(u.startMs - castAt) <= 100);
      // Ticks after the application are the new DoT's (its snapshot).
      const newTicks = ticks.filter((t) => keyOf(t) === r.key && t.timestamp > r.appliedAt && t.timestamp <= r.appliedAt + spec.durationMs + 500);
      const prevTick = [...ticks].reverse().find((t) => keyOf(t) === r.key && t.timestamp <= r.appliedAt);
      const tickNorm = ticks.length ? ticks.reduce((a, e) => a + (e.amount ?? 0) / bf.factor(e), 0) / ticks.length : 0;
      // Each slot: when it lands and what it snapshots. Slot 0 is the
      // refresh itself (its own ticks); slot i the i-th GCD after it.
      const slotAt = (i: number) => (i === 0 ? castAt : gcdSlots[at + i].startMs);
      const slotSnap = (i: number): Snap => {
        if (i === 0) return newTicks[0] ? bf.snap(newTicks[0]) : bf.at(castAt);
        const u = gcdSlots[at + i];
        const own = bf.direct.find((e) => e.abilityId === u.action.id && e.timestamp >= u.startMs && e.timestamp <= u.startMs + u.castMs + SLOT_HIT_MS);
        return own ? bf.snap(own) : bf.at(u.startMs + u.castMs);
      };
      // The new DoT's ticks as played, and the same ticks delayMs later.
      const offsets = newTicks.length ? newTicks.map((t) => t.timestamp - castAt)
        : Array.from({ length: spec.durationMs / DOT_TICK_MS }, (_, i) => (i + 1) * DOT_TICK_MS);
      const ticksWorth = (s: Snap, shiftMs: number) => offsets.reduce((a, o) => a + tickNorm * bf.worth(s, castAt + shiftMs + o), 0);
      let best = { gain: 0, delays: 0, delayMs: 0, clip: 0, lapse: 0, snap: 0, shift: 0 };
      if (at >= 0) {
        const sn = [slotSnap(0)];
        const played = ticksWorth(sn[0], 0);
        let shift = 0;
        for (let d = 1; d <= MAX_DELAY_GCDS && at + d < gcdSlots.length; d++) {
          const delayMs = slotAt(d) - castAt;
          if (delayMs > r.left + DOT_TICK_MS) break;
          sn.push(slotSnap(d));
          // GCD d moves into slot d − 1.
          shift += bf.unbuffedPerCast(gcdSlots[at + d].action.id) *
            (bf.worth(sn[d - 1], slotAt(d - 1)) - bf.worth(sn[d], slotAt(d)));
          const clip = delayMs * per;
          const lapse = (Math.max(0, delayMs - r.left) / DOT_TICK_MS) * tickNorm *
            (prevTick ? bf.worth(bf.snap(prevTick), castAt + r.left) : 1);
          const snap = (ticksWorth(sn[d], delayMs) - played) * ran.length;
          const gain = clip - lapse + snap + shift;
          if (gain > best.gain) best = { gain, delays: d, delayMs, clip, lapse, snap, shift };
        }
      } else {
        for (let d = 1; d <= Math.floor(r.left / ctx.baseGcdMs) + 1; d++) {
          const delayMs = d * ctx.baseGcdMs, clip = delayMs * per;
          const lapse = (Math.max(0, delayMs - r.left) / DOT_TICK_MS) * tickAvg;
          if (clip - lapse > best.gain) best = { gain: clip - lapse, delays: d, delayMs, clip, lapse, snap: 0, shift: 0 };
        }
      }
      if (best.gain <= 0) continue;
      const phaseId = ctx.phaseOf(castAt);
      const b = steady.get(phaseId) ?? { ms: 0, lost: 0, n: 0, start: castAt, end: castAt, moments: [] };
      const avoidable = Math.min(r.left, best.delayMs);
      b.ms += avoidable; b.n++; b.end = castAt;
      b.lost += best.gain;
      const sign = (v: number) => `${v >= 0 ? "+" : "−"}${k(Math.abs(v))}`;
      b.moments.push({ startMs: castAt, endMs: castAt, lostDamage: best.gain,
        detail: `${spec.name} refreshed with ${s(r.left)} left on ${r.targetName}; ` +
          `${best.delays} GCD${best.delays > 1 ? "s" : ""} later would have done ${k(best.gain)} more ` +
          `(clip ${sign(best.clip)}` +
          (best.snap ? `, snapshot ${sign(best.snap)}` : "") +
          (best.shift ? `, GCDs moved into other buffs ${sign(best.shift)}` : "") +
          (best.lapse ? `, ticks dropped ${sign(-best.lapse)}` : "") + ")" });
      steady.set(phaseId, b);
      continue;
    }

    // Cut short everywhere: no later refresh was coming, so the choice was
    // this DoT or a filler. Its value is what it added on every target.
    const gained = recs.reduce((a, r) => a + r.gained, 0);
    if (fill - gained < fill * DOT_MIN_SHORTFALL) continue;
    const r = recs[0];
    const newTicks = recs.reduce((a, x) => a + x.newTicks, 0);
    const n = `${newTicks} new tick${newTicks === 1 ? "" : "s"}${recs.length > 1 ? ` on ${recs.length} enemies` : ""}`;
    const why = [
      r.left > 0 ? `refreshed with ${s(r.left)} left` : undefined,
      r.silent >= DOT_SILENT_MS && r.cut < 1_000 ? `${r.targetName} took no ticks for the last ${s(r.silent)} (out of reach or invulnerable)` : undefined,
      r.cut >= 1_000 ? (r.until === ctx.endMs || r.removal >= ctx.endMs - 1_000 ? `the pull ended ${s(r.cut)} before it ran out`
        : `it came off ${recs.length > 1 ? "them" : r.targetName} ${s(r.cut)} before it ran out (the enemy died or left)`) : undefined,
    ].filter(Boolean).join("; ") || "few ticks";
    out.push(finding(ctx, {
      kind: "dot-clip", startMs: castAt, endMs: Math.max(...recs.map((x) => x.until)), forced: forced.ms > 0,
      cause: forced.ms > 0 ? forced.cause : undefined,
      label: `${spec.name} worth less than ${filler.name}`,
      lostDamage: fill - gained,
      basis: `${k(fill)} average ${filler.name}${buffed ? " in raid buffs" : ""} − ${k(gained)} the ${spec.name} added ` +
        `(its ticks after the previous one would have run out${recs.some((x) => x.hasHit) ? ", plus its hit" : ""}); ` +
        `${spec.name} is instant, so if you were moving no ${filler.name} was possible`,
      detail: `${spec.name} added ${k(gained)} (${n}), less than a ${filler.name}: ${why}`,
    }));
  }
  for (const [phaseId, b] of steady) {
    // xivanalysis's 6s gate is about clipped seconds; a refresh that missed
    // raid buffs by a GCD or two clips little but can cost a GCD or more.
    if (b.ms < DOT_CLIP_FINDING_MS && b.lost < fillerAvg(false)) continue;
    out.push(finding(ctx, {
      kind: "dot-clip", startMs: b.start, endMs: b.end, forced: false, moments: b.moments,
      label: `${spec.name} refreshed early`,
      lostDamage: b.lost,
      basis: `each refresh made the next one come that much sooner: ${s(b.ms)} ÷ ${s(spec.durationMs)} = ` +
        `${(b.ms / spec.durationMs).toFixed(1)} extra ${spec.name} casts, each in place of a ${filler.name} ` +
        `(${k(fillerAvg(false))} average${b.n ? ", less the DoT's own hit" : ""}); only refreshes where pressing it ` +
        `one or more GCDs (${s(ctx.baseGcdMs)}) later would have done more, less any ticks that delay would have dropped`,
      detail: `${spec.name} refreshed early ${b.n} time${b.n > 1 ? "s" : ""} in ${ctx.phaseName(phaseId) ?? "the pull"}, ${s(b.ms)} avoidable`,
    }));
  }
  return out;
}

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
  const clips = new Map<number | undefined, { ms: number; n: number; start: number; end: number; moments: Moment[] }>();
  for (const e of events) {
    const key = `${e.targetActorId}.${e.targetInstance ?? 1}`;
    const o = open.get(key);
    if (e.status === "removed") {
      if (o) { windows.push({ startMs: o.start, endMs: e.timestamp }); open.delete(key); }
      continue;
    }
    // Ran out with no removal logged: close it at its expiry.
    if (o && e.timestamp > o.lastApply + spec.durationMs) {
      windows.push({ startMs: o.start, endMs: o.lastApply + spec.durationMs });
      open.set(key, { start: e.timestamp, lastApply: e.timestamp });
      continue;
    }
    if (o) {
      const left = spec.durationMs - (e.timestamp - o.lastApply);
      if (left > 0) {
        const phaseId = ctx.phaseOf(e.timestamp);
        const c = clips.get(phaseId) ?? { ms: 0, n: 0, start: e.timestamp, end: e.timestamp, moments: [] };
        c.ms += left; c.n++; c.end = e.timestamp;
        c.moments.push({ startMs: e.timestamp, endMs: e.timestamp, lostDamage: (left / DOT_TICK_MS) * avgTick,
          detail: `${spec.name} refreshed with ${s(left)} left on ${e.targetName}` });
        clips.set(phaseId, c);
      }
      o.lastApply = e.timestamp;
    } else {
      open.set(key, { start: e.timestamp, lastApply: e.timestamp });
    }
  }
  // No removal logged (the enemy left at a phase change, 2T1HzdPKgbhM43am
  // fight 10's Exdeath at 11:55): it ran at most its duration, not to the
  // end of the pull, which hid every later gap.
  for (const o of open.values()) windows.push({ startMs: o.start, endMs: Math.min(ctx.endMs, o.lastApply + spec.durationMs) });

  const active = mergeWindows(windows);
  // Only removals in range (a checkpoint-resume pull that starts with the
  // DoT already ticking, H9fnVZgPA3krpCzY fight 4): no window to judge.
  if (!active.length) return out;
  const forced = mergeWindows(ctx.forced);
  const grace = ctx.baseGcdMs + 1_000;
  // Fresh applications of the paired DoTs (an Iron Jaws refresh logs
  // "refreshed", so only a lapsed one counts).
  const paired = new Set(spec.pairedIds ?? []);
  const pairedApplies = paired.size ? (ctx.pull.bossDebuffs ?? [])
    .filter((e) => paired.has(e.statusId) && e.sourceName === ctx.player.name && e.status === "applied")
    : [];
  // A stretch of the gap that forced time cuts off (downtime, an HP check
  // passed) only had the ticks a fresh DoT could get before it, and that
  // DoT cost a GCD: its own hit against an average GCD. yBKPqGwHparm7Tk4
  // fight 5, Dragoon at 3:01: 8.7s between Kefka targetable again and the
  // P1 check passing; 2 ticks (12k) against the Spiral Blow → Chaotic
  // Spring route in place of Lance Barrage → Heavens' Thrust, ~33k less
  // (user, 2026-10-13: "the boss is dead basically 10 seconds afterwards").
  const applier = (() => {
    const counts = new Map<number, number>();
    for (const e of events) {
      if (e.status !== "applied" && e.status !== "refreshed") continue;
      const c = ctx.player.casts.filter((x) => x.timestamp <= e.timestamp && x.timestamp >= e.timestamp - DOT_CAST_MS).pop();
      if (c) counts.set(c.abilityId, (counts.get(c.abilityId) ?? 0) + 1);
    }
    return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
  })();
  const applyCostAt = (at: number) => spec.applyCost ? Math.max(0, spec.applyCost(ctx)) : applier === undefined ? 0
    : Math.max(0, ctx.values.gcdValue(ctx.phaseOf(at), false) - ctx.values.perUse(applier));
  const cutValue = (ms: number, at: number) => Math.max(0, Math.floor(ms / DOT_TICK_MS) * avgTick - applyCostAt(at));
  // No enemy to target at all cuts a gap however short: every DoT ended
  // there (K6qfMamL7rN8yz2Q Red Hot and Deep Blue, the Sage's Eukrasian
  // Dosis on Watery Grave, run out at 6:12, then the prison breaking at
  // 6:31.9 with 3.6s of no target: one 33.4s gap, 124k, before this).
  const noTarget = ctx.forced.filter((f) => f.cause?.startsWith("no target"));
  const cuts = (f: Window) => f.endMs - f.startMs >= CUT_MIN_MS || noTarget.some((n) => n.startMs < f.endMs && n.endMs > f.startMs);
  let cursor = active[0].startMs;
  for (const w of [...active, { startMs: ctx.endMs, endMs: ctx.endMs }]) {
    if (w.startMs > cursor) {
      // Unforced stretches of the gap; those ending in forced time are cut.
      const free: Window[] = [];
      let at = cursor;
      for (const f of forced) {
        if (f.endMs <= at || f.startMs >= w.startMs || !cuts(f)) continue;
        if (f.startMs > at) free.push({ startMs: at, endMs: f.startMs });
        at = Math.max(at, f.endMs);
      }
      // Short forced blips don't cut the gap; their time still isn't counted.
      const freeMs = (a: number, b: number) => b - a - overlapMs(a, b, forced);
      // After a long forced stretch, counted from the combo's restart: a
      // combo held through it is finished first (yBKPqGwHparm7Tk4 fight 5,
      // P3 → P4: Lance Barrage 11:53 held, Heavens' Thrust / Fang and Claw
      // / Drakesbane, Raiden Thrust 12:24.8, Chaotic Spring 12:30.2).
      const tailFrom = at > cursor && at < w.startMs ? restartAt(ctx, spec.restartIds, at, w.startMs) : at;
      const tail = tailFrom < w.startMs ? freeMs(tailFrom, w.startMs) : 0;
      const cut = free.reduce((a, x) => a + cutValue(freeMs(x.startMs, x.endMs), x.startMs), 0);
      const cutMs = free.reduce((a, x) => a + (cutValue(freeMs(x.startMs, x.endMs), x.startMs) > 0 ? freeMs(x.startMs, x.endMs) : 0), 0);
      // 6XaWqwMbkZG9pLmx Vamp Fatale 1:58: both of the Bard's DoTs came off
      // with Coffinmaker; Caustic Bite went on 2.9s later, Stormbite a GCD
      // after it (5.0s), which the plain grace read as lost (user, 2026-10-13).
      // One GCD per paired DoT, however many enemies it went on.
      const firsts = new Set(pairedApplies.filter((e) => e.timestamp >= cursor && e.timestamp < w.startMs).map((e) => e.statusId)).size;
      // A ranged GCD forced by a mechanic's movement (Dancing Mad's outer
      // Forsaken spots) pushed the combo that re-applies the DoT back a GCD:
      // yBKPqGwHparm7Tk4 fight 5, Dragoon's Piercing Talon 4:19.4 → Chaotic
      // Spring 4:24.5 instead of 4:21.9 (user, 2026-10-13). That lateness
      // is movement, not a loss.
      const moveGcds = (ctx.uses ?? []).filter((u) => ctx.game.disengageActionIds.has(u.action.id)
        && u.startMs >= cursor - spec.durationMs && u.startMs < w.startMs);
      const moveWin = moveGcds.map((u) => (ctx.movement ?? []).find((m) => u.startMs >= m.startMs && u.startMs <= m.endMs)).filter(Boolean)[0];
      const moveCount = moveGcds.filter((u) => (ctx.movement ?? []).some((m) => u.startMs >= m.startMs && u.startMs <= m.endMs)).length;
      // After a long forced stretch the DoT returns through its combo
      // (Chaotic Spring is the 3rd GCD after Raiden Thrust): yBKPqGwHparm7Tk4
      // fight 5, P3 opening 7:09.9 → 7:14.8 is on time.
      const afterCut = at > cursor ? (spec.reapplyGcds ?? 0) * ctx.baseGcdMs : 0;
      const needed = grace + firsts * ctx.baseGcdMs + afterCut;
      if (moveWin && tail >= needed && tail < needed + moveCount * ctx.baseGcdMs) {
        out.push(finding(ctx, {
          kind: "dot-uptime", startMs: cursor, endMs: w.startMs, forced: true, movement: true, cause: moveWin.cause,
          label: `${spec.name} off the boss`,
          lostDamage: (tail / DOT_TICK_MS) * avgTick,
          basis: `${s(tail)} ÷ 3s ticks × ${k(avgTick)} average tick; within a GCD of on time but for ${moveCount} ranged GCD${moveCount > 1 ? "s" : ""} in ${moveWin.cause}`,
          detail: `${spec.name} wasn't on the boss for ${s(tail)}`,
        }));
      }
      const tailMs = tail >= needed + (moveWin ? moveCount * ctx.baseGcdMs : 0) ? tail : 0;
      const len = tailMs + cutMs;
      // A gap that runs to the end of the pull had no later refresh to
      // push back: re-applying was this DoT's ticks to the end against the
      // GCD it took, like a cut (K6qfMamL7rN8yz2Q Red Hot and Deep Blue,
      // the AST's last 17.1s: 5 ticks, 45k, against a 37k Fall Malefic,
      // read as 53k lost).
      // One application per duration; one that can't pay for its GCD
      // wouldn't have been pressed.
      const atEnd = w.startMs >= ctx.endMs;
      let tailLost = 0, applies = 0;
      if (!atEnd) tailLost = (tailMs / DOT_TICK_MS) * avgTick;
      else for (let left = tailMs; left > 0; left -= spec.durationMs) {
        const v = Math.floor(Math.min(left, spec.durationMs) / DOT_TICK_MS) * avgTick - applyCostAt(tailFrom);
        if (v > 0) { tailLost += v; applies++; }
      }
      const lost = tailLost + cut;
      if (lost > 0) {
        out.push(finding(ctx, {
          kind: "dot-uptime", startMs: cutMs ? cursor : at, endMs: w.startMs, forced: false,
          label: `${spec.name} off the boss`,
          lostDamage: lost,
          basis: `${s(len)} ÷ 3s ticks × ${k(avgTick)} average tick` +
            (atEnd && applies ? `; it ran to the end of the pull, so less ${k(applies * applyCostAt(tailFrom))} for the GCD${applies > 1 ? "s" : ""} re-applying it would have taken` : "") +
            (cutMs ? `; ${s(cutMs)} of it cut short by forced time, counted as the ticks a fresh ${spec.name} gets there less its GCD's cost against an average GCD` : ""),
          detail: `${spec.name} wasn't on the boss for ${s(len)}`,
        }));
      }
    }
    cursor = Math.max(cursor, w.endMs);
  }
  if (spec.uptimeOnly) return out;
  const filler = spec.fillerId?.(ctx);
  if (filler) return [...out, ...dotApplicationFindings(ctx, spec, filler)];
  for (const [phaseId, c] of clips) {
    if (c.ms < DOT_CLIP_FINDING_MS) continue;
    out.push(finding(ctx, {
      kind: "dot-clip", startMs: c.start, endMs: c.end, forced: false, moments: c.moments,
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
  /** Units still held when the boss died, valued as the spender minus the GCD it would have replaced. Kills only. */
  leftAtKill?: { unitValue: number; valueBasis: string };
};

type GaugeRun = {
  value: number; negatives: number;
  waste: { t: number; amount: number; label: string; unitValue?: number; valueBasis?: string }[];
  steps: GaugeTrack["steps"]; capped: GaugeTrack["capped"];
};

/** The gauge simulation gaugeFindings and gaugeTrack share. */
function runGauge(ctx: PlayerCheckContext, spec: GaugeSpec): GaugeRun {
  const events = [...spec.events].filter((e) => e.t < ctx.endMs).sort((a, b) => a.t - b.t);
  let value = 0, cap = spec.cap, negatives = 0;
  let cappedSince: number | null = null;
  const waste: GaugeRun["waste"] = [];
  const steps: GaugeTrack["steps"] = [{ t: 0, value: 0 }];
  const capped: GaugeTrack["capped"] = [];
  const step = (t: number) => {
    if (cappedSince !== null && value < cap) { if (t > cappedSince) capped.push({ startMs: cappedSince, endMs: t }); cappedSince = null; }
    else if (cappedSince === null && value >= cap && cap > 0) cappedSince = t;
    if (steps[steps.length - 1].t === t) steps[steps.length - 1].value = value;
    else steps.push({ t, value });
  };
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
    step(e.t);
  }
  if (cappedSince !== null && ctx.endMs > cappedSince) capped.push({ startMs: cappedSince, endMs: ctx.endMs });
  return { value, negatives, waste, steps, capped };
}

/**
 * The same gauge as a timeline lane (display only). `name` is the lane's
 * label, short enough for the timeline's 96px gutter ("Focus", not
 * "Firstminds' Focus", which it cut to "stminds' Focus").
 */
export function gaugeTrack(ctx: PlayerCheckContext, spec: GaugeSpec, name = spec.name): GaugeTrack {
  const run = runGauge(ctx, spec);
  const lost = run.waste.reduce((a, w) => a + w.amount, 0);
  return {
    name, max: spec.cap, steps: run.steps, capped: run.capped,
    note: `${lost} ${spec.unit} lost at the cap (the overcap findings value it)` +
      (run.negatives > 0 ? `; ${run.negatives} spend${run.negatives === 1 ? "" : "s"} the simulation had no gauge for (model or log off)` : ""),
  };
}

export function gaugeFindings(ctx: PlayerCheckContext, spec: GaugeSpec): DamageFinding[] {
  const { value, negatives, waste } = runGauge(ctx, spec);
  // xivanalysis's "ending the fight with cartridges loaded" (Ammo.tsx):
  // what's held at the kill was never spent.
  if (spec.leftAtKill && ctx.pull.result === "Kill" && value > 0) {
    waste.push({ t: ctx.endMs, amount: value, label: "left at the kill", ...spec.leftAtKill });
  }
  const forced = mergeWindows(ctx.forced);
  // Gauge left at the kill is judged by the time it was held, not the
  // kill's instant (always forced when a "boss at 1 HP" window ends the
  // pull): forced only if, from the gauge's last change, there was under a
  // GCD of unforced time to spend it. K6qfMamL7rN8yz2Q Vamp Fatale, the
  // Viper's Rattling Coil, held for ~10s before the 8:41.5 check, read as
  // forced; xivanalysis's "1 rattling coil remaining".
  const { steps } = runGauge(ctx, spec);
  const lastChange = steps[steps.length - 1]?.t ?? 0;
  const heldUnforced = ctx.endMs - lastChange - overlapMs(lastChange, ctx.endMs, forced);
  const isForced = (w: { t: number; label: string }) =>
    w.label === "left at the kill" ? heldUnforced < ctx.baseGcdMs : inWindows(w.t, forced);
  return waste.map((w) => finding(ctx, {
    kind: "gauge-overcap", startMs: w.label === "left at the kill" ? lastChange : w.t, endMs: w.t,
    forced: isForced(w), cause: isForced(w) ? forcedPart(w.t - 1, w.t + 1, ctx.forced).cause : undefined,
    label: w.label === "left at the kill" ? `${spec.name} left at the kill` : `${spec.name} overcap (${w.label})`,
    lostDamage: w.amount * (w.unitValue ?? spec.unitValue),
    inference: negatives > 0 ? true : undefined,
    basis: `${w.amount} ${spec.unit} × ${w.valueBasis ?? spec.valueBasis}` +
      (negatives > 0 ? `; the gauge simulation went below zero ${negatives} time${negatives > 1 ? "s" : ""}, so treat this as inference` : ""),
    detail: `${w.amount} ${spec.unit} lost: ${w.label}`,
  }));
}

// ── AoE GCDs on one target ─────────────────────────────────────────────

const AOE_HIT_MS = 2_000;

/**
 * An AoE GCD that hit one enemy and dealt less than the single-target GCD
 * it stood in for (`against`: the healer's filler, a tank's combo step).
 * One pressed in forced time is shown, not counted: past a phase's HP
 * check a tank builds gauge with the AoE combo before downtime
 * (2T1HzdPKgbhM43am fight 10, Dark Knight at 6:20 and 14:22).
 */
const HIT_DELAY_SLACK_MS = 500;

/** An oGCD's typical delay from press to first hit: the median over its casts. */
function hitDelayMs(ctx: PlayerCheckContext, abilityId: number): number {
  const hits = ctx.player.damageDone.filter((e) => e.abilityId === abilityId).map((e) => e.timestamp);
  const delays = ctx.player.casts.filter((c) => c.abilityId === abilityId)
    .map((c) => (hits.find((t) => t >= c.timestamp && t <= c.timestamp + 3_000) ?? Infinity) - c.timestamp)
    .filter((d) => Number.isFinite(d)).sort((a, b) => a - b);
  return delays.length ? delays[Math.floor(delays.length / 2)] : 0;
}

export function aoeOnOneTargetFindings(
  ctx: PlayerCheckContext,
  aoeIds: number[],
  against: (aoeId: number) => { name: string; value: number } | undefined,
  minTargets: (aoeId: number) => number | undefined = () => undefined,
): DamageFinding[] {
  const out: DamageFinding[] = [];
  const aoe = new Set(aoeIds);
  // GCDs, plus oGCD AoEs (Bard's Rain of Death against Heartbreak Shot).
  const uses = [
    ...ctx.uses.filter((u) => u.startMs < ctx.endMs)
      .map((u) => ({ action: { id: u.action.id }, startMs: u.startMs, castMs: u.castMs, abilityName: u.abilityName, ogcd: false })),
    ...ctx.player.casts.filter((c) => aoe.has(c.abilityId) && c.timestamp < ctx.endMs && ctx.game.action(c.abilityId)?.onGcd === false)
      .map((c) => ({ action: { id: c.abilityId }, startMs: c.timestamp, castMs: hitDelayMs(ctx, c.abilityId), abilityName: c.abilityName, ogcd: true })),
  ].sort((a, b) => a.startMs - b.startMs);
  uses.forEach((u, i) => {
    if (!aoe.has(u.action.id)) return;
    const alt = against(u.action.id);
    if (!alt || alt.value <= 0) return;
    // For an oGCD, castMs is its measured hit delay: Rain of Death hits
    // 1.65s after the press, after the next press when they're stacked
    // (fight 16's Bard: 8:08.15, 8:09.84, hits 8:09.80 / 8:09.93).
    const landed = u.startMs + u.castMs;
    // Up to the next cast of the same AoE, not the next GCD: a Bard's
    // Shadowbite lands 1.4s after its cast and the second target's hit
    // 0.15s after that, past the next GCD's start.
    // (When it lands, not starts: a Black Mage's next Flare begins casting
    // before this one's second hit.)
    const next = uses.slice(i + 1).find((x) => x.action.id === u.action.id);
    const nextSame = next ? next.startMs + next.castMs : Infinity;
    const until = Math.min(nextSame, landed + AOE_HIT_MS);
    const hits = ctx.player.damageDone.filter((e) => e.abilityId === u.action.id && e.timestamp >= (u.ogcd ? landed - HIT_DELAY_SLACK_MS : u.startMs) && e.timestamp < until);
    // A hit for nothing isn't a target: under Dancing Mad P3's Epic Hero /
    // Fated Hero only one boss takes your damage, and the other logs a 0
    // (yBKPqGwHparm7Tk4 fight 5, 9:06-12:05: a Sage's Toxikon IIs read as
    // two-target).
    const landedHits = hits.filter((e) => (e.amount ?? 0) > 0 || (e.absorbed ?? 0) > 0);
    const targets = new Set(landedHits.map((e) => `${e.targetActorId ?? e.target}.${e.targetInstance ?? 1}`));
    // Some AoEs lose on two targets too (Freeze, 120 a target against
    // Blizzard IV's 300): minTargets. Judging every two-target AoE by its
    // damage against the single-target average flagged Gravity IIs worth
    // 1-6k less, which is buff and crit noise.
    if (targets.size === 0 || targets.size >= (minTargets(u.action.id) ?? 2)) return;
    const dealt = hits.reduce((a, e) => a + (e.amount ?? 0), 0);
    if (dealt >= alt.value) return;
    const during = forcedPart(u.startMs - 1, u.startMs + 1, ctx.forced);
    out.push(finding(ctx, {
      kind: "aoe-single", startMs: u.startMs, endMs: landed,
      forced: during.ms > 0, cause: during.ms > 0 ? during.cause : undefined,
      label: `${u.abilityName} on ${targets.size === 1 ? "one target" : "too few targets"}`,
      lostDamage: alt.value - dealt,
      basis: `${k(alt.value)} average ${alt.name} − ${k(dealt)} this ${u.abilityName} dealt`,
      detail: targets.size === 1 ? `${u.abilityName} hit only ${landedHits[0].target ?? "one enemy"}`
        : `${u.abilityName} hit ${targets.size} enemies for less than a ${alt.name}`,
    }));
  });
  return out;
}

/**
 * A tank's AoE combo on one target, each step against the single-target
 * step it replaces ([AoE id, single-target id] pairs), at the player's own
 * average for it. From xivanalysis's AoE-usage check (Unleash and Stalwart
 * Soul on one target).
 */
export const aoeComboOnOneTarget = (pairs: [aoe: number, single: number, minTargets?: number][]): JobCheck => (ctx) => {
  const st = new Map(pairs.map(([a, b]) => [a, b]));
  const min = new Map(pairs.map(([a, , m]) => [a, m]));
  return aoeOnOneTargetFindings(ctx, pairs.map(([a]) => a), (aoeId) => {
    const id = st.get(aoeId)!;
    return { name: ctx.game.action(id)?.name ?? "single-target GCD", value: ctx.values.perUse(id) };
  }, (aoeId) => min.get(aoeId));
};

// ── Casts that did no damage ───────────────────────────────────────────

const NO_DAMAGE_HIT_MS = 3_000;
const NO_DAMAGE_MIN_CASTS = 3;
const NO_DAMAGE_SHARE = 0.8;
const SAME_PRESS_MS = 50;
// Technical Finish logs 16196 and then 33218 about 0.7s later.
const SAME_NAME_OTHER_ID_MS = 1_000;

export const noDamageCasts: JobCheck = (ctx) => {
  const out: DamageFinding[] = [];
  // Ticks share the action's name (Eukrasian Dosis III) and older samples
  // don't mark them isDoT, so tick ids are left out too. Pet hits share
  // names with the owner's actions (Esteem's Edge of Shadow).
  const hits = ctx.player.damageDone.filter((e) => !e.pet && !e.isDoT && !ctx.game.isTickAbility(e.abilityId) && (e.amount ?? 0) > 0);
  const presses = new Map<string, PlayerEvent[]>();
  for (const c of ctx.player.casts) {
    const list = presses.get(c.abilityName) ?? [];
    const last = list[list.length - 1];
    if (last && (c.timestamp - last.timestamp <= SAME_PRESS_MS ||
      (c.abilityId !== last.abilityId && c.timestamp - last.timestamp <= SAME_NAME_OTHER_ID_MS))) continue;
    list.push(c);
    presses.set(c.abilityName, list);
  }
  for (const [name, casts] of presses) {
    const ids = new Set(casts.map((c) => c.abilityId));
    const dealt = casts.map((c) => hits
      .filter((e) => (e.abilityName === name || ids.has(e.abilityId)) &&
        e.timestamp >= c.timestamp && e.timestamp <= c.timestamp + NO_DAMAGE_HIT_MS)
      .reduce((a, e) => a + (e.amount ?? 0), 0));
    const landed = dealt.filter((d) => d > 0);
    if (landed.length < NO_DAMAGE_MIN_CASTS || landed.length < casts.length * NO_DAMAGE_SHARE) continue;
    const average = landed.reduce((a, d) => a + d, 0) / landed.length;
    casts.forEach((c, i) => {
      if (dealt[i] > 0 || c.timestamp >= ctx.endMs || inWindows(c.timestamp, ctx.dead)) return;
      // Would have landed after a kill: the boss was already dead.
      if (ctx.pull.result === "Kill" && c.timestamp + NO_DAMAGE_HIT_MS >= ctx.endMs) return;
      // Pressed during forced time (boss untargetable): shown, not
      // counted. Dancers refresh Standard Finish there for its buff.
      const during = forcedPart(c.timestamp - 1, c.timestamp + 1, ctx.forced);
      // FFLogs previewed the hit but it never landed: the target went
      // invulnerable or untargetable before it applied (yBKPqGwHparm7Tk4
      // fight 5: presses 6:15.3-6:16.9 as Kefka hit 0%, the Hero debuffs
      // in P3). Not the player's doing, so shown, not counted.
      const previewed = (ctx.player.unlandedHits ?? []).some((e) => !e.pet &&
        (e.abilityName === name || ids.has(e.abilityId)) && e.timestamp >= c.timestamp && e.timestamp <= c.timestamp + NO_DAMAGE_HIT_MS);
      const forced = during.ms > 0 || previewed;
      out.push(finding(ctx, {
        kind: "no-damage", startMs: c.timestamp, endMs: c.timestamp, forced, inference: true,
        cause: during.ms > 0 ? during.cause : previewed ? "the target turned immune before it landed" : undefined,
        label: `${name} did no damage`,
        lostDamage: average,
        basis: `${k(average)} average ${name} (${landed.length} of ${casts.length} casts hit something)`,
        detail: `${name} hit nothing`,
      }));
    });
  }
  return out;
};
