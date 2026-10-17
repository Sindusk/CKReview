// lib/damage/wow/specs/havoc.ts
//
// Havoc Demon Hunter's own checks, beside the shared ones melee.ts gives it
// (Metamorphosis window, Fury at the cap, Eternal Hunt, the tracked Essence
// Break, The Hunt and Metamorphosis cooldowns). Built in the WoWAnalyzer
// audit's phase 3 (docs/wowa-audit/demonhunter-havoc.md), every rule valued
// as damage lost. Measured 2026-10-17 on Entombed Sentinels Mythic kills:
// the top parses Poetry (LckJC7GMhQvD6rdw, 99.9th), Maryjanedh
// (Vr8dLPtFYWA4G1yg, 99.5th), Nereo (GndQ9VFWtLzNjKpk, 98.9th), Ldh
// (baRCnPv62YQ1dJZN, 98.6th) and Vairuh (ACmXHMFtaPLR9k8w), with the other
// Havoc players on those kills; the weaker Mythnarra (qpZx3mWaG7gcDdYB, 47th,
// the case study, and his static's 16 pulls in gVDPhzp61Zm29HMw) and Hertydh
// (v8bmgMAdcnBCj9Ya). Spell ids are from those logs' masterData.
//
// Talents: every one of the 16 sample players runs Aldrachi Reaver with
// Demonic, Cycle of Hatred, Furious Gaze, Essence Break, Initiative, Exergy
// and Eternal Hunt; Hertydh alone is Fel-scarred. None takes Inertia or
// Unbound Chaos.
//
// ── Eye Beam held (eyeBeamHeld) ────────────────────────────────────────
// Eye Beam (198013) is the spec's biggest cooldown: with Demonic it opens a
// Metamorphosis window (162264) of ~8s besides its own beam (hits 198030,
// 1287949). Its cooldown isn't a fixed recast, and not what WoWAnalyzer
// models (a cut per spender): Cycle of Hatred (1214887) is a buff that
// stacks to four in the first three Eye Beams and stays, and each stack
// takes EYE_BEAM_STACK_MS off the 40s base. On the five top players the
// casts after four stacks came 20.0–32.3s apart, the shortest exactly 20.0s
// whether 4 or 14 spenders came between, and haste doesn't move it; the
// second Eye Beam (three stacks) came 25.1–29.4s after the first. A
// Metamorphosis cast (200166) resets it (a talent, Chaotic Transformation):
// the Aldrachi players pressed Eye Beam 0.3–3.7s after one, but Hertydh
// never did (cast at 0:09.8, next beam 0:39.6), so the reset applies only
// for a player whose log shows an early beam after a Metamorphosis cast.
// Rebuilt this way, no cast on any of the 16 players came before the ready
// time.
//
// Held = ready → next Eye Beam (or the pull's end), less forced time,
// movement, the context's hold windows and EYE_BEAM_ALLOW_MS a cycle (the
// top players' ordinary 0–3.8s: a Vengeful Retreat or Reaver's Glaive
// first, the Metamorphosis cast's own GCD). A held second costs that share
// of a use: held ÷ the player's average cooldown (not the reset cycles) ×
// what a use is worth, read from the player's own Demonic windows (a
// Metamorphosis window that an Eye Beam opened and no Metamorphosis cast
// joined): the damage in it less the player's rate outside Metamorphosis
// over the same time. That holds the beam, the Annihilations and Death
// Sweeps it upgrades and the window's haste.
//
// Held for The Hunt: with Eternal Hunt, The Hunt empowers the next Eye Beam
// (Empowered Eye Beam, 1271144, gone at the beam; melee.ts eternalHunt), so
// a ready Eye Beam held for a Hunt pays up to a point. A hold that ends in
// an empowered beam, with The Hunt pressed after the beam was ready, is
// excused up to its break-even: (the player's empowered − ordinary beam) ÷
// a held second's worth, and never past one cooldown. Poetry held 7.7s at
// 0:57 for The Hunt at 1:03.8; every top player does this.
//
// Measured (lost a pull): top Entombed Sentinels kills Poetry, Maryjanedh,
// Ldh none; Vairuh 20k; Nereo 87k and Bentwo 88k (both 4:31 on
// GndQ9VFWtLzNjKpk: a beam pressed 5–8s after the Metamorphosis reset);
// Ollidan 12k, Bobybigplays 25k, Аййамэ 47k. Weaker: Mythnarra 59k on the
// case study (6:07: ready, pressed at 6:17, 1.9s past forced time and the
// allowance) and 0–432k on each of his static's 16 pulls, 1.39M in all (432k
// at Entombed Sentinels Pull 1, 1:44 and 4:27; 316k at Coiled Altar 2:51 and
// 3:00); Célestiia (Vashnik) 232k; Hertydh 123k. A use was worth 0.17–1.42M
// (median ~0.8M). Eye Beam is well kept by everyone (case study 99%): this
// is a small loss, not a habit.

import type { PlayerEvent } from "@/types/PlayerInfo";
import type { DamageFinding, JobCheck, Moment } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { mergeWindows, overlapMs, type Window } from "../../timeline";
import { k, s, statusWindows } from "./shared";

const EYE_BEAM = 198013;
const METAMORPHOSIS_CAST = 200166;
const METAMORPHOSIS = 162264;
const CYCLE_OF_HATRED = 1214887;
const EMPOWERED_EYE_BEAM = 1271144;
const THE_HUNT = 370965;

const EYE_BEAM_BASE_MS = 40_000;
const EYE_BEAM_STACK_MS = 5_000;
const CYCLE_MAX_STACKS = 4;
const EYE_BEAM_ALLOW_MS = 3_000;
const EYE_BEAM_SPAN_MS = 4_000;
const MIN_HELD_MS = 250;
const RESET_SEEN_MS = 1_000;

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const inside = (ws: Window[], t: number) => ws.some((w) => t >= w.startMs && t <= w.endMs);
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : NaN);

/** One press per spell per instant (a press can log twice), before the pull's end. */
function presses(ctx: PlayerCheckContext, id: number): PlayerEvent[] {
  const out: PlayerEvent[] = [];
  for (const c of ctx.player.casts.filter((c) => !c.fake && c.abilityId === id && c.timestamp < ctx.endMs).sort((a, b) => a.timestamp - b.timestamp)) {
    if (out.length && c.timestamp - out[out.length - 1].timestamp < 100) continue;
    out.push(c);
  }
  return out;
}

/** Cycle of Hatred stacks just after t (a stack the cast itself adds counts toward the next cooldown). */
function cycleStacksAt(ctx: PlayerCheckContext, t: number): number {
  let st = 0;
  for (const b of (ctx.player.buffs ?? []).filter((b) => b.abilityId === CYCLE_OF_HATRED).sort((a, b) => a.timestamp - b.timestamp)) {
    if (b.timestamp > t + 300) break;
    if (b.buffStatus === "applied") st = 1;
    else if (b.buffStatus === "stack") st++;
    else if (b.buffStatus === "stackRemoved") st = Math.max(0, st - 1);
    else if (b.buffStatus === "removed") st = 0;
  }
  return Math.min(CYCLE_MAX_STACKS, st);
}

/** The player's Demonic windows: Metamorphosis windows an Eye Beam opened, with no Metamorphosis cast inside. */
function demonicWindows(ctx: PlayerCheckContext, beams: number[], metaCasts: number[]): Window[] {
  return statusWindows(ctx, METAMORPHOSIS).filter((w) => w.endMs <= ctx.endMs
    && beams.some((t) => Math.abs(t - w.startMs) <= 150)
    && !metaCasts.some((t) => t >= w.startMs - 1_500 && t <= w.endMs));
}

/** One Eye Beam use's worth: its Demonic window's damage over the player's rate outside Metamorphosis. */
function eyeBeamUseValue(ctx: PlayerCheckContext, beams: number[], metaCasts: number[]): { value: number; basis: string } | undefined {
  const demonic = demonicWindows(ctx, beams, metaCasts);
  if (demonic.length < 3) return undefined;
  const meta = statusWindows(ctx, METAMORPHOSIS);
  const excluded = mergeWindows([...ctx.forced, ...meta]);
  const outsideMs = ctx.endMs - overlapMs(0, ctx.endMs, excluded);
  if (outsideMs < 30_000) return undefined;
  const hits = ctx.player.damageDone.filter((e) => e.timestamp < ctx.endMs);
  const outsideRate = hits.filter((e) => !inside(excluded, e.timestamp)).reduce((a, e) => a + (e.amount ?? 0), 0) / outsideMs;
  const gains = demonic.map((w) => hits.filter((e) => e.timestamp >= w.startMs && e.timestamp < w.endMs).reduce((a, e) => a + (e.amount ?? 0), 0)
    - outsideRate * (w.endMs - w.startMs));
  const value = avg(gains);
  if (!(value > 0)) return undefined;
  const len = avg(demonic.map((w) => w.endMs - w.startMs));
  return { value, basis: `${k(value)} a use (its ${s(len)} Demonic window over ${k(outsideRate * 1000)}/s outside Metamorphosis, ${demonic.length} windows)` };
}

const eyeBeamHeld: JobCheck = (ctx) => {
  const beams = presses(ctx, EYE_BEAM).map((c) => c.timestamp);
  if (beams.length < 5) return [];
  const metaCasts = presses(ctx, METAMORPHOSIS_CAST).map((c) => c.timestamp);
  const use = eyeBeamUseValue(ctx, beams, metaCasts);
  if (!use) return [];

  // Empowered (Eternal Hunt) vs ordinary beams, for the hold-for-The-Hunt excuse.
  const beamHits = ctx.player.damageDone.filter((e) => !e.pet && e.abilityName === "Eye Beam");
  const beamDmg = beams.map((t, i) => beamHits.filter((e) => e.timestamp >= t && e.timestamp < Math.min(beams[i + 1] ?? Infinity, t + EYE_BEAM_SPAN_MS))
    .reduce((a, e) => a + (e.amount ?? 0), 0));
  const empowered = statusWindows(ctx, EMPOWERED_EYE_BEAM);
  const isEmp = beams.map((t) => empowered.some((w) => t >= w.startMs && t <= w.endMs + 150));
  const empV = avg(beamDmg.filter((_, i) => isEmp[i]));
  const ordV = avg(beamDmg.filter((_, i) => !isEmp[i]));
  const hunts = presses(ctx, THE_HUNT).map((c) => c.timestamp);

  const excluded = mergeWindows([...ctx.forced, ...(ctx.movement ?? []), ...(ctx.context?.cooldownHoldWindows?.(ctx.pull) ?? [])]);
  type Cycle = { prev: number; ready: number; next: number; cdMs: number; reset: boolean };
  const cdAt = (t: number) => EYE_BEAM_BASE_MS - EYE_BEAM_STACK_MS * cycleStacksAt(ctx, t);
  // The reset is a talent (Chaotic Transformation): only a player who has
  // pressed Eye Beam early after a Metamorphosis cast gets it.
  const resets = beams.some((prev, i) => i + 1 < beams.length && beams[i + 1] < prev + cdAt(prev) - RESET_SEEN_MS
    && metaCasts.some((t) => t > prev && t < beams[i + 1]));
  const cycles: Cycle[] = beams.map((prev, i) => {
    const cdMs = cdAt(prev);
    const next = beams[i + 1] ?? ctx.endMs;
    const reset = resets ? metaCasts.find((t) => t > prev && t < next && t < prev + cdMs) : undefined;
    return { prev, ready: reset ?? prev + cdMs, next, cdMs, reset: reset !== undefined };
  });
  const cooldown = avg(cycles.map((c) => c.cdMs));
  const perMs = use.value / cooldown;

  const moments: Moment[] = [];
  let heldMs = 0, excusedMs = 0;
  for (const [i, c] of cycles.entries()) {
    if (c.next <= c.ready) continue;
    let held = c.next - c.ready - overlapMs(c.ready, c.next, excluded) - EYE_BEAM_ALLOW_MS;
    if (held <= 0) continue;
    // Held for The Hunt: the beam that ended the hold was empowered by a Hunt pressed after it was ready.
    let excused = 0;
    const last = i + 1 >= beams.length;
    if (!last && isEmp[i + 1] && hunts.some((h) => h > c.ready && h <= c.next) && empV > ordV) {
      excused = Math.min(held, (empV - ordV) / perMs, cooldown);
      held -= excused;
    }
    excusedMs += excused;
    if (held < MIN_HELD_MS) continue;
    heldMs += held;
    moments.push({ startMs: c.ready, endMs: c.next, lostDamage: held * perMs,
      detail: `Eye Beam ready at ${clock(c.ready)}${c.reset ? " (Metamorphosis reset it)" : ""}, ${last ? "not pressed again" : `pressed at ${clock(c.next)}`}: ${s(held)} held` +
        (excused > 0 ? ` (${s(excused)} more excused: held for The Hunt)` : "") });
  }
  if (moments.length === 0) return [];
  const lost = heldMs * perMs;
  return [finding(ctx, {
    kind: "cooldown-drift", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Eye Beam held",
    lostDamage: lost,
    basis: `held time (past ${s(EYE_BEAM_ALLOW_MS)} a cycle, outside forced time and movement) ÷ ${s(cooldown)}, the player's average Eye Beam cooldown, × ${use.basis}` +
      (excusedMs > 0 ? `; ${s(excusedMs)} held for The Hunt excused up to its break-even (empowered ${k(empV)} vs ordinary ${k(ordV)} beam)` : ""),
    detail: `Eye Beam sat ready ${s(heldMs)} past the allowance in ${moments.length} cycle${moments.length > 1 ? "s" : ""} (cooldown 40s less 5s per Cycle of Hatred stack; Metamorphosis resets it)`,
    moments,
  })];
};

export const HAVOC_CHECKS: JobCheck[] = [eyeBeamHeld];
