// lib/damage/wow/specs/blood.ts
//
// Blood Death Knight's own checks and values, beside tank.ts's Dancing Rune
// Weapon window and Blood Plague uptime. Built in the WoWAnalyzer audit's
// phase 3 (docs/wowa-audit/deathknight-blood.md, 2026-10-17), every rule
// valued as damage lost. WoWAnalyzer's Blood is `lagging` (12.0.1, partly
// maintained), so its rules were checked against the log, not trusted.
// Mitigation (Death Strike timing, Bone Shield, Vampiric Blood) is out of
// scope. Wired from tank.ts (BLOOD_SPEC_CHECKS) and tracked-cooldowns.ts
// (dancingRuneWeaponValue).
//
// Measured on the 97 Blood DK player-pulls on disk (71 reports, all Mythic
// kills of Vashnik, Entombed Sentinels and one Nek'zali, fetched for other
// specs' passes; no fetch was needed). Top parses: Lyrîa (kZnVcJYpKFRChTzb,
// Vashnik 157k/s), 蕾米蕾米蕾 (J3ckBVtrZNfWv1h7, Vashnik 99.5th), Vipsxo
// (tcdpmV7MBHK1jGYk), Zerdk (X618LRt7hPqzbVJj), Radel (th1Ap4QrBPJyma23),
// Darkdworf (hjHXmdnJFwTPpMtK), Bloodydexter (z8rQ23NBy4LwM6PZ), all
// 142–157k/s against a 99th-percentile Vashnik line of 175k; Yodadkt
// (LckJC7GMhQvD6rdw, Entombed Sentinels 100th). Weaker: Flashdecomp
// (8AFnLQKdrcgawzDC), Sosoevery (wPmFHVKRQb31X97z), Vixyana
// (fcj1YgaCJBT2kXFm), Metalgear (fh6bLKy12gzWvGCH), Gorlad
// (dt9xLXJKMZc62hC3), Cocoá (LCFp3wbHvQqNP4my) and the static's Veinglas
// (qpZx3mWaG7gcDdYB). Spell ids are from those logs' masterData.
//
// Talents (casts, buffs, hit ids): 82 player-pulls play San'layn (Vampiric
// Strike 433895, Essence of the Blood Queen, Blood Beast), 15 Deathbringer
// (Reaper's Mark 439843, Exterminate 441416 / hits 441424 and 441426); every
// top player is San'layn (the best Deathbringer is Brucebones,
// zBb3HQpZCkxAfvqn, 127k/s on Entombed Sentinels). Everyone takes Crimson
// Scourge (81141), Sanguine Ground (391459) and Dancing Rune Weapon. Nobody
// casts Consumption, Bonestorm or Soul Reaper. Bone Shield (195181) stacks
// to 12 in these logs.
//
// ── Dancing Rune Weapon's value (dancingRuneWeaponValue) ───────────────
// The tracked Dancing Rune Weapon drift (tracked-cooldowns.ts) had no
// value: the cast (49028) deals nothing itself and the copies log under the
// "Rune Weapon" pet, so a lost use read 0 and never showed. A use is now
// the Rune Weapon's hits a use less the average GCD the press takes:
// 0.6–2.5M a use (Lyrîa 2.30M, 蕾米蕾米蕾 1.79M; Vixyana 612k). 90s holds:
// shortest interval 90.0s, medians 91–95s on the top players, who never
// lose a use (held 1–30s over a pull). Measured (lost a pull): every top
// player none; Metalgear 3.42M (Vashnik Pull 6: intervals 134s and 151s,
// two uses lost, from 3:45), Flashdecomp 1.61M (182s from 0:01), Ducklord,
// Smellshairy, Mözo, Decoil and Phageborn one use each (1.3–1.5M; Phageborn
// pressed at 6:11 with the kill at 6:26), 15 of 97 player-pulls in all.
//
// ── Reaper's Mark (tracked-cooldowns.ts) ───────────────────────────────
// Deathbringer only. Shortest interval 45s (Hemojoshi ZvrLTQfk1zbAXMwB
// 45–53s every press), two of 32s on Venomdeath (a reset); tracked at 45s
// with its hits (439843, 436304, 439594): 300–510k a use. Fires on
// Flashdecomp 1.10M (3 uses, 147s held), Lablood 348k, Maxd 385k, Lamagram
// 386k; not on Brucebones or Хардбакска. The survey reads it off the GCD
// (game data), though its next press comes 0.78s+ after it: if it's on the
// GCD, a use is priced a GCD high (~4% of a use).
//
// ── Free Death and Decay held (crimsonScourgeHeld) ─────────────────────
// Crimson Scourge (81141, 15.0s: 64 unconsumed removals at 15.0s, none
// longer) makes the next Death and Decay (43265) free. A Death and Decay
// lies 10s (995 of 1,311 casts' last tick at +10s). What a held proc loses
// is ground time: from REACT_MS after the proc to its use, the seconds with
// no Death and Decay down, less forced time, stretches under MIN_BARE_MS
// left out. A ground second is worth the Death and Decay's ticks (the
// player's per cast ÷ 10s: 19–47k a cast) plus Sanguine Ground on the
// player's own hits (SG_BONUS: melee non-crit inside ÷ outside, median 1.04
// over 97 player-pulls, quartiles 1.01–1.08), less the press it costs (the
// average GCD per 10s of ground). For players whose average GCD is worth
// more than that, it's 0 (Cocoá, Hemojoshi on Vashnik). Paid Death and
// Decays come 1–3s apart at times (charges), so its own cooldown isn't
// modelled; the proc is the time the player certainly had one.
// Held with none down (s, before forced time): top 21–48s on Vashnik
// (Zerdk 21, Radel 24, 蕾米蕾米蕾 38, Lyrîa 48), Yodadkt 78s on Entombed
// Sentinels; weak 130–292s (Flashdecomp 292, Cocoá 276, Gorlad 225,
// Smellshairy 181, Hemojoshi 173). Lost a pull: top 1–36k (Lyrîa 36k);
// weak Flashdecomp 346k (Vashnik Pull 6: held 3:32–4:14, 40s with none
// down), Vixyana 276k, Gorlad 208k, 李李巫妖王 200k, 三团鸭鸭呀 152k.
// Expiries alone (what WoWAnalyzer counts) separate less: 0 on the top
// players, 0–4 elsewhere, most of them in Entombed Sentinels' forced time.
//
// ── Measured and not built (numbers in the ledger) ─────────────────────
// - Runic Power at the cap (tank.ts's shared check, removed for Blood):
//   it read 0.34–1.56M on the top players (Zerdk 1.56M) by pricing casts
//   that generate no Runic Power (Blood Boil, Death Grip, Dark Command,
//   Abomination Limb: Blood Boil's Runic Power to the next cast within
//   1.2s is 0 on 1,055 of 1,990 pairs, 2–3 (passive regen) on most of the
//   rest); the generators log runes, not Runic Power (Heart Strike 936 of
//   7,683 casts, Marrowrend 0 of 1,557). Rebuilt from Heart Strike and
//   Vampiric Strike (+15 each) it reads top 0–639k (Zerdk 8.4% of their
//   gain, Lyrîa 5.0%) against weak 0–1.05M: no separation, and a tank pools
//   Runic Power for Death Strike's heal.
// - Marrowrend at high Bone Shield: Bone Shield stacks to 12 now and the
//   top players cast Marrowrend at 9–12 stacks (Lyrîa 16 of 16 at 7+);
//   2 Heart Strikes over a Marrowrend is ~25–45k.
// - Exterminate stacks wasted: 1 expiry (Flashdecomp, 30.0s) and 0–2
//   refreshes a pull on 15 Deathbringer player-pulls; ~270k a stack.
// - Blood Boil presses: top 10–14 a minute on Vashnik, weak down to 2.0
//   (Sosoevery, 113k a press); Boiling Point resets its charges, and no
//   recharge fits (three presses in 5.3–7.7s on the top players).

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { JobCheck, Moment } from "../../types";
import { finding } from "../../checks";
import { mergeWindows, overlapMs } from "../../timeline";
import { k } from "./shared";

const DANCING_RUNE_WEAPON = 49028;
const DEATH_AND_DECAY = 43265;
const DND_HIT = 52212;
const CRIMSON_SCOURGE = 81141;

const DND_GROUND_MS = 10_000;
const REACT_MS = 1_500;
const MIN_BARE_MS = 3_000;
const SG_BONUS = 0.04;
const MIN_PROCS = 10;

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

/**
 * One Dancing Rune Weapon use's worth (tracked-cooldowns.ts): the Rune
 * Weapon's damage a use (every hit logged under the "Rune Weapon" pet),
 * less the average GCD the press took.
 */
export function dancingRuneWeaponValue(player: PlayerInfo, endMs: number, gcdValue: number): { value: number; basis: string } | undefined {
  const casts = player.casts.filter((c) => !c.fake && c.abilityId === DANCING_RUNE_WEAPON && c.timestamp < endMs).length;
  if (casts === 0) return undefined;
  const rune = player.damageDone.filter((e) => e.pet === "Rune Weapon" && e.timestamp < endMs).reduce((a, e) => a + (e.amount ?? 0), 0) / casts;
  const value = rune - gcdValue;
  if (!(value > 0)) return undefined;
  return { value, basis: `(${k(rune)} the Rune Weapon's hits a use, over ${casts} uses, − ${k(gcdValue)} average GCD)` };
}

// ── Free Death and Decay held ──────────────────────────────────────────

const crimsonScourgeHeld: JobCheck = (ctx) => {
  const p = ctx.player;
  const dnd = p.casts.filter((c) => !c.fake && c.abilityId === DEATH_AND_DECAY && c.timestamp < ctx.endMs).map((c) => c.timestamp).sort((a, b) => a - b);
  if (dnd.length < 3) return [];
  const cs = (p.buffs ?? []).filter((b) => b.abilityId === CRIMSON_SCOURGE && b.source === p.name).sort((a, b) => a.timestamp - b.timestamp);
  if (cs.length < MIN_PROCS) return [];
  const dndPer = p.damageDone.filter((e) => !e.pet && e.abilityId === DND_HIT && e.timestamp < ctx.endMs).reduce((a, e) => a + (e.amount ?? 0), 0) / dnd.length;
  const own = p.damageDone.filter((e) => !e.pet && e.abilityId !== DND_HIT && e.timestamp < ctx.endMs).reduce((a, e) => a + (e.amount ?? 0), 0);
  const ownRate = own / Math.max(1, ctx.endMs);
  const gcd = ctx.values.gcdValue(undefined, false);
  // A ground second's worth: the Death and Decay's ticks, plus Sanguine
  // Ground on the player's own hits, less the press it takes (one per 10s).
  const perMs = dndPer / DND_GROUND_MS + SG_BONUS * ownRate - gcd / DND_GROUND_MS;
  if (!(perMs > 0)) return [];
  // Held stretches: from a gain to the removal (or the pull's end).
  const held: { s: number; e: number }[] = [];
  let st: number | undefined;
  for (const b of cs) {
    if ((b.buffStatus === "applied" || b.buffStatus === "refreshed") && st === undefined) st = b.timestamp;
    else if (b.buffStatus === "removed" && st !== undefined) { held.push({ s: st, e: b.timestamp }); st = undefined; }
  }
  if (st !== undefined) held.push({ s: st, e: ctx.endMs });
  const ground = mergeWindows(dnd.map((t) => ({ startMs: t, endMs: t + DND_GROUND_MS })));
  const forced = mergeWindows(ctx.forced);
  const moments: Moment[] = [];
  let lostMs = 0;
  for (const h of held) {
    const s = h.s + REACT_MS, e = Math.min(h.e, ctx.endMs);
    if (e <= s) continue;
    // The bare stretches (no Death and Decay down), less forced time.
    let cur = s, ms = 0;
    for (const g of ground) {
      if (g.endMs <= s || g.startMs >= e) continue;
      if (g.startMs > cur) ms += g.startMs - cur - overlapMs(cur, g.startMs, forced);
      cur = Math.max(cur, g.endMs);
    }
    if (cur < e) ms += e - cur - overlapMs(cur, e, forced);
    if (ms < MIN_BARE_MS) continue;
    lostMs += ms;
    moments.push({ startMs: h.s, endMs: e, lostDamage: ms * perMs,
      detail: `Crimson Scourge held ${clock(h.s)}–${clock(e)} with no Death and Decay on the ground for ${(ms / 1000).toFixed(1)}s` });
  }
  if (moments.length === 0) return [];
  return [finding(ctx, {
    kind: "proc-lost", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Free Death and Decay held",
    lostDamage: lostMs * perMs,
    basis: `${(lostMs / 1000).toFixed(0)}s × ${k(perMs * 1000)}/s (${k(dndPer)} Death and Decay ticks per 10s + ${SG_BONUS * 100}% Sanguine Ground on ${k(ownRate * 1000)}/s own hits − ${k(gcd)} average GCD per 10s)`,
    detail: `A free Death and Decay (Crimson Scourge) was held with none on the ground for ${(lostMs / 1000).toFixed(0)}s in all`,
    moments,
  })];
};

export const BLOOD_SPEC_CHECKS: JobCheck[] = [crimsonScourgeHeld];
