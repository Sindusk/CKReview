// lib/damage/wow/specs/protpaladin.ts
//
// Protection Paladin's damage model, from the WoWAnalyzer audit's phase 3
// (docs/wowa-audit/paladin-protection.md, 2026-10-17). Mitigation (Shield
// of the Righteous uptime, Consecration armor, Word of Glory, the
// defensives) is out of scope: only damage is judged here. Wired from
// tank.ts (PROT_PALADIN_SPEC_CHECKS) and tracked-cooldowns.ts
// (sentinelValue, protDivineTollValue). WoWAnalyzer's Protection is
// `stale` (marked unmaintained), so every rule was checked against the log.
//
// Measured on 42 Protection Paladin player-pulls, all Mythic kills of
// Entombed Sentinels and Vashnik: the top parses Redoar (Vr8dLPtFYWA4G1yg,
// Entombed Sentinels 99.7th), Turbodin (bahTK6jXp9kZDzd4, 99.6th), Holyvi
// (VWMbYPRyxCAmhZFj, 99th) and 大忑 (RjL7A9CYbcQKTVng, Vashnik 100th,
// fetched for this pass), with Eluviell (1ZtTkMm4qfF9KBPw), Zeép
// (6DpC2MZN9PRy8VGd) and Divinetrôll (KB1a9CWc6pT4VGqA), the best Vashnik
// kills on disk; the weaker Siukzen (PzG3QDc4g7AKdJw8), Ataxs
// (LnNK1CxVJZQ9kfX3), Relixp (MrVh6X8p1BRAJCYt), 悸动的青春
// (tdPcqXCya18rzVZK), 猴子么么哒 (qTFxBHJKANCR48zD), Jénsénn
// (VJgMTWKFBA7n1j3p, Vashnik 22nd percentile) and the case study's
// Thatapaddlin (qpZx3mWaG7gcDdYB), among 30 others already on disk. Spell
// ids are from those logs' masterData.
//
// Talents (casts, buffs, hit ids): all 42 take Sentinel (no Avenging
// Wrath), Divine Toll with Divine Resonance, Blessed Hammer (no Hammer of
// the Righteous), Grand Crusader and Divine Purpose (223819). 40 are
// Lightsmith (Holy Bulwark 432459 / Sacred Weapon 432472); Athenä
// (mtv6nZTcXF4RDWaf) and 难说 (78hvzrVRXKn6NYMa) are Templar (Hammer of
// Light 427453). Nobody presses Eye of Tyr.
//
// ── Avenger's Shield held (avengersShieldHeld) ─────────────────────────
// Grand Crusader (85416) resets Avenger's Shield (31935) and shows while
// it's ready: it goes when Avenger's Shield is pressed, or at 6.0s (118 of
// 1,184 gains ran out at 5.96–6.07s, none longer; every pressed one
// within 6.0s). The top players press it 1.1–2.2s after the gain
// (median). A run-out means Avenger's Shield sat ready 6s while other
// presses went out, and any reset in that time was wasted. Counted only
// when a Blessed Hammer, Judgment, Hammer of Wrath or Consecration went
// out after the reset, outside forced time and death. Lost = the player's
// own Avenger's Shield press (its hits and Tyr's Enforcer's within 1.2s of
// casts outside Divine Toll / Divine Resonance, whose shields log under the
// same id: 28–56k) less the cheapest of the presses made instead, each by
// its hits ÷ casts: one GCD swapped, a lower bound (the shield's cooldown
// restarts 6s late too). Measured (lost a pull): top Redoar, Holyvi,
// Eluviell none, Turbodin 25k (5:12), Zeép 29k, 大忑 38k (3 run-outs);
// weaker Ataxs 508k (13: 0:18, 0:35, 0:46 ...; Avenger's Shield every 25s
// against the top players' 11–13s), Siukzen 299k (12; 14 presses in 6:57),
// Relixp 171k, 悸动的青春 147k, 오리털 122k (phzkLrdNBgtfCmW9), 猴子么么哒
// 90k, Thatapaddlin 51k (1:41, 2:15, 5:38). WoWAnalyzer's priority list
// asks for the same press, by its own cooldown model.
//
// ── Sentinel and Divine Toll (tracked-cooldowns.ts) ────────────────────
// Both were tracked at 60s and worth 0 a use (Sentinel deals nothing;
// Divine Toll's shields log as Avenger's Shield), so their drift never
// showed. Both 60s fixed: shortest Sentinel 60.0s with 8 to 30 Shields of
// the Righteous between (no Righteous Protector cut shows), Divine Toll
// 60.0s. On Vashnik most players press both every 83–85s, with each Imbibe:
// burstHold (the context's hold windows) excuses that.
// - Sentinel (sentinelValue): Retribution's Avenging Wrath model (the
//   window's bonus read from the player's own non-crit hits, inside vs
//   outside, × the damage inside ÷ (1 + bonus)), capped at 20%: melee
//   swings read +7–31% (median 17%) on 12 players, but the per-ability
//   read runs to +50–98% on some (Unrelenting Edict +239–313% inside the
//   window on Holyvi, Athenä, 범석; cleave on Vashnik reads negative).
//   Damage inside runs 2.6–3.5× outside (Hammer of Wrath is usable only in
//   the window: 17–24 presses a window-minute on everyone, under 2 a minute
//   outside). 0.32–0.67M a use.
// - Divine Toll (protDivineTollValue): its thrown shields (Avenger's
//   Shield, Tyr's Enforcer, within 1.5s) plus Divine Resonance's (386730,
//   a shield every 5s for 15s, no cast), less the average GCD: 0.08–0.15M
//   a use.
// Measured (lost a pull): every top player none. Sentinel: Athenä 666k
// (62s held), 범석 600k (41s; one more use before the kill), Thatapaddlin
// 597k (16s; one more before the kill at 6:36), Jenspala 324k
// (ZTGbp8m9DjJtvAf3, first interval 95s). Divine Toll: 猴子么么哒 243k (3
// presses in 6:40, 115s held), Athenä 153k, Hævñ 104k
// (p4G1xa2yMqCDznZT), Grimi 86k (8kVQMJ4rmpnyRjBH), 범석 83k.
//
// ── Divine Purpose (procs.ts) ──────────────────────────────────────────
// 223819, a free Shield of the Righteous: 12.0s (714 gains, 3 ran out at
// 11.99–12.00s, every other one spent within 11.5s). All three ran out in
// forced time (Shieldboy 0:58, Thatapaddlin 2:39 and 6:10).
//
// ── Measured and not built (numbers in the ledger) ─────────────────────
// - Holy Power at the cap (spenderSnapshotWaste, as Retribution): 0–7% of
//   generation on everyone, top as weak (Eluviell 286k, Zeép 290k; 难说
//   465k, Snakeadin 210k, Siukzen 128k); Shield of the Righteous is a
//   mitigation spend a tank times.
// - Hammer of Light (Templar, two players): pressed 0.9–3.7s after its
//   free buff (Light's Deliverance 433732) on 11 of 12 grants, one 17.5s
//   hold (Athenä 0:46–1:03); the buff never runs out. No top Templar.
// - Shield of the Righteous with no hit: 0–16 a pull, top as weak
//   (Idiafadin 16, Grimi 9; Hævñ 12); pressed for its armor.
// - Holy Armaments: top players press 6–8 a pull, two weaker ones 1–3,
//   but Sacred Weapon's damage doesn't follow the presses (悸动的青春 2.37M
//   from one), so a use's worth can't be read.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { JobCheck, Moment } from "../../types";
import { finding } from "../../checks";
import { forcedPart, mergeWindows, overlapMs } from "../../timeline";
import { k } from "./shared";

const AVENGERS_SHIELD = 31935;
const TYRS_ENFORCER = 378286;          // Avenger's Shield's extra hit
const GRAND_CRUSADER = 85416;          // Avenger's Shield reset, 6.0s
const GC_MS = 6_000;
const EXPIRY_SLACK_MS = 200;
const CONSUME_MS = 300;
const AS_HIT_MS = 1_200;               // an Avenger's Shield's bounces land within this of its cast
const DIVINE_TOLL = 375576;
const TOLL_HIT_MS = 1_500;
const DIVINE_RESONANCE = 386730;       // 15s: an Avenger's Shield every 5s, no cast
const RESONANCE_HIT = 386731;
const SENTINEL = 389539;
// Sentinel's bonus read from the hits, capped at the median melee bonus of
// 12 player-pulls (header): cleave and empowered procs push the per-ability
// read to +50–98% on some players.
const BONUS_CAP = 0.2;
// The GCD presses a held Avenger's Shield's GCD went to.
const BLESSED_HAMMER = 204019;
const JUDGMENT = 275779;
const HAMMER_OF_WRATH = 1241413;
const CONSECRATION = 26573;
const OTHER_PRESSES = [BLESSED_HAMMER, JUDGMENT, HAMMER_OF_WRATH, CONSECRATION];
const SHIELD_NAMES = new Set(["Avenger's Shield", "Tyr's Enforcer"]);

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

type Span = { startMs: number; endMs: number };
const buffWindows = (player: PlayerInfo, id: number, endMs: number): Span[] => {
  const ws: Span[] = [];
  let st: number | undefined;
  for (const b of (player.buffs ?? []).filter((b) => b.abilityId === id && b.source === player.name).sort((a, b) => a.timestamp - b.timestamp)) {
    if (b.buffStatus === "applied" && st === undefined) st = b.timestamp;
    else if (b.buffStatus === "removed" && st !== undefined) { ws.push({ startMs: st, endMs: b.timestamp }); st = undefined; }
  }
  if (st !== undefined) ws.push({ startMs: st, endMs });
  return ws.filter((w) => w.startMs < endMs);
};

/**
 * The player's own Avenger's Shield press: its hits and Tyr's Enforcer's
 * within AS_HIT_MS of each cast, over casts outside Divine Toll and Divine
 * Resonance (whose thrown shields log under the same id).
 */
function shieldPress(player: PlayerInfo, endMs: number): number {
  const res = buffWindows(player, DIVINE_RESONANCE, endMs);
  const tolls = player.casts.filter((c) => c.abilityId === DIVINE_TOLL).map((c) => c.timestamp);
  const casts = player.casts.filter((c) => !c.fake && c.abilityId === AVENGERS_SHIELD && c.timestamp < endMs &&
    !res.some((w) => c.timestamp >= w.startMs && c.timestamp <= w.endMs + AS_HIT_MS) &&
    !tolls.some((t) => Math.abs(c.timestamp - t) <= TOLL_HIT_MS)).map((c) => c.timestamp);
  if (casts.length === 0) return 0;
  const dmg = player.damageDone.filter((h) => !h.pet && SHIELD_NAMES.has(h.abilityName) &&
    casts.some((t) => h.timestamp >= t && h.timestamp <= t + AS_HIT_MS)).reduce((a, h) => a + (h.amount ?? 0), 0);
  return dmg / casts.length;
}

// ── Avenger's Shield held (Grand Crusader ran out) ─────────────────────
const avengersShieldHeld: JobCheck = (ctx) => {
  const p = ctx.player;
  const ev = (p.buffs ?? []).filter((b) => b.source === p.name && b.abilityId === GRAND_CRUSADER)
    .sort((a, b) => a.timestamp - b.timestamp);
  if (ev.length === 0) return [];
  const casts = p.casts.filter((c) => !c.fake && c.timestamp < ctx.endMs);
  const perPress = (id: number) => {
    const name = casts.find((c) => c.abilityId === id)?.abilityName;
    const n = casts.filter((c) => c.abilityId === id).length;
    if (!name || n === 0) return 0;
    return p.damageDone.filter((h) => !h.pet && h.abilityName === name && h.timestamp < ctx.endMs)
      .reduce((a, h) => a + (h.amount ?? 0), 0) / n;
  };
  const shield = shieldPress(p, ctx.endMs);
  if (!(shield > 0)) return [];
  const blocked = mergeWindows([...ctx.forced, ...ctx.dead]);
  const moments: Moment[] = [];
  let lost = 0;
  let gain: number | undefined;
  for (const e of ev) {
    if (e.buffStatus === "applied" || e.buffStatus === "refreshed" || e.buffStatus === "stack") { gain = e.timestamp; continue; }
    if (e.buffStatus !== "removed" || gain === undefined) continue;
    const t = e.timestamp, from = gain;
    gain = undefined;
    if (t >= ctx.endMs || t - from < GC_MS - EXPIRY_SLACK_MS) continue;
    if (casts.some((c) => c.abilityId === AVENGERS_SHIELD && Math.abs(c.timestamp - t) <= CONSUME_MS)) continue;
    if (forcedPart(from, t, ctx.forced).ms > 0 || overlapMs(from, t, blocked) > 0) continue;
    const inside = casts.filter((c) => c.timestamp > from + CONSUME_MS && c.timestamp <= t);
    const pressed = OTHER_PRESSES.filter((id) => inside.some((c) => c.abilityId === id)).map((id) => perPress(id));
    if (pressed.length === 0) continue;
    const value = Math.max(0, shield - Math.min(...pressed));
    if (value <= 0) continue;
    const names = inside.filter((c) => ctx.game.action(c.abilityId)?.onGcd).map((c) => c.abilityName);
    lost += value;
    moments.push({ startMs: from, endMs: t, lostDamage: value,
      detail: `Avenger's Shield reset ${clock(from)}, unpressed for 6s: ${names.join(", ")} instead` });
  }
  if (moments.length === 0) return [];
  return [finding(ctx, {
    kind: "proc-lost", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Avenger's Shield held",
    lostDamage: lost,
    basis: `${moments.length} × (${k(shield)} average Avenger's Shield press − the cheapest press made instead, each at its average)`,
    detail: `Grand Crusader ran out (Avenger's Shield ready 6s, unpressed) ${moments.length} time${moments.length > 1 ? "s" : ""} while other presses went out: ${moments.map((m) => clock(m.endMs)).join(", ")}`,
    moments,
  })];
};

/** One Sentinel's worth: what its window added to the player's hits, per window (as Retribution's Avenging Wrath). */
export function sentinelValue(player: PlayerInfo, endMs: number): { value: number; basis: string } | undefined {
  const ws = buffWindows(player, SENTINEL, endMs);
  if (ws.length === 0) return undefined;
  const inside = (t: number) => ws.some((w) => t >= w.startMs && t <= w.endMs);
  const by = new Map<number, { i: number[]; o: number[] }>();
  for (const e of player.damageDone) {
    if (e.pet || e.isDoT || e.hitType !== 1 || !e.unmitigatedAmount || e.timestamp >= endMs) continue;
    const g = by.get(e.abilityId) ?? { i: [], o: [] };
    (inside(e.timestamp) ? g.i : g.o).push(e.unmitigatedAmount);
    by.set(e.abilityId, g);
  }
  let sum = 0, n = 0;
  for (const g of by.values()) {
    if (g.i.length === 0 || g.o.length < 3) continue;
    sum += (median(g.i) / median(g.o) - 1) * g.i.length;
    n += g.i.length;
  }
  const bonus = n > 0 ? Math.min(BONUS_CAP, Math.max(0, sum / n)) : 0;
  if (bonus <= 0) return undefined;
  const dmg = player.damageDone.filter((e) => e.timestamp < endMs && inside(e.timestamp)).reduce((a, e) => a + (e.amount ?? 0), 0);
  const per = dmg / ws.length;
  return {
    value: per * bonus / (1 + bonus),
    basis: `${k(per * bonus / (1 + bonus))} that an average Sentinel added (${k(per)} done inside each of ${ws.length} windows, ` +
      `+${Math.round(bonus * 100)}% read from the player's own hits, capped at ${BONUS_CAP * 100}%)`,
  };
}

/**
 * One Divine Toll's worth to a Protection Paladin: the Avenger's Shields it
 * throws (logged as Avenger's Shield) and the ones Divine Resonance throws
 * over the next 15s, Tyr's Enforcer with them, less the GCD it took. Hits
 * within AS_HIT_MS of the player's own Avenger's Shield casts aren't counted.
 */
export function protDivineTollValue(player: PlayerInfo, endMs: number, gcdValue: number): { value: number; basis: string } | undefined {
  const tolls = player.casts.filter((c) => c.abilityId === DIVINE_TOLL && c.timestamp < endMs).map((c) => c.timestamp);
  if (tolls.length === 0) return undefined;
  const pressed = player.casts.filter((c) => !c.fake && c.abilityId === AVENGERS_SHIELD).map((c) => c.timestamp);
  const res = buffWindows(player, DIVINE_RESONANCE, endMs + 15_000);
  const ours = (t: number) => !pressed.some((c) => t >= c && t <= c + AS_HIT_MS);
  const hits = player.damageDone.filter((h) => !h.pet && (SHIELD_NAMES.has(h.abilityName) || h.abilityId === RESONANCE_HIT || h.abilityId === DIVINE_TOLL) && ours(h.timestamp));
  let thrown = 0, echo = 0;
  for (const t of tolls) {
    thrown += hits.filter((h) => h.timestamp >= t && h.timestamp <= t + TOLL_HIT_MS).reduce((a, h) => a + (h.amount ?? 0), 0);
    const w = res.find((x) => x.startMs >= t - 50 && x.startMs <= t + 500);
    if (w) echo += hits.filter((h) => h.timestamp > t + TOLL_HIT_MS && h.timestamp <= w.endMs + CONSUME_MS).reduce((a, h) => a + (h.amount ?? 0), 0);
  }
  thrown /= tolls.length; echo /= tolls.length;
  const value = thrown + echo - gcdValue;
  if (value <= 0) return undefined;
  return {
    value,
    basis: `(${k(thrown)} Divine Toll's thrown Avenger's Shields + ${k(echo)} Divine Resonance's over 15s − ${k(gcdValue)} average GCD in its place)`,
  };
}

export const PROT_PALADIN_SPEC_CHECKS: JobCheck[] = [avengersShieldHeld];
