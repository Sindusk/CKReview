// lib/damage/wow/specs/brewmaster.ts
//
// Brewmaster Monk's damage model, from the WoWAnalyzer audit's phase 3
// (docs/wowa-audit/monk-brewmaster.md, 2026-10-17). Mitigation (Stagger,
// Purifying / Celestial Brew, Shuffle, Fortifying Brew) is out of scope:
// only damage is judged here. Wired from tank.ts (BREWMASTER_CHECKS).
//
// Measured on 9 Brewmaster player-pulls, all Mythic kills: the top parses
// Fluffytail (kZnVcJYpKFRChTzb, Vashnik 100th), Melstout
// (PCMfNtnbrVxpwYhk, Vashnik 99.7th), Bus (th1Ap4QrBPJyma23, Vashnik
// 99.5th) and Blueregard (zpRGrxBgjJH7A3yk, Nek'zali 100th); the weaker
// Vashnik kills on disk: Kegroit (Ftj4vwHf9RazPcqV), Lootchi
// (a4kX1DNT27yHGvqJ), Fluffÿ (r9CX1kpRGLmKJH4M), Sinamonk
// (zdyhBj7pxWG6A8QZ) and Qywsi (VbAHWZDdPwJBajmx, 89k/s, 21st percentile).
// Spell ids are from those logs' masterData.
//
// Talents (casts, buffs, hit ids): seven play Shado-Pan (Flurry Strike
// hits 451250 / 450620 / 450617), Kegroit and Qywsi Master of Harmony
// (Aspect of Harmony, Harmonic Surge). Everyone takes Blackout Combo
// (228563), Exploding Keg, Invoke Niuzao, Touch of Death and the Keg Smash
// → Breath of Fire reset; Fuel on the Fire (Exploding Keg's buff 1262035,
// hits 1262159) on six, Empty the Cellar (1263438, after each Keg) on seven.
//
// ── Breath of Fire reset lost (bofResetLost) ───────────────────────────
// Each Keg Smash (121253) makes Breath of Fire (115181) ready: over the 9
// player-pulls no Breath of Fire was ever pressed twice without a Keg
// Smash between (0 of 661 presses), and the top players press one after
// nearly every Keg Smash (Melstout 90 / 90, Kegroit 91 / 91). A Keg Smash
// pressed while the last one's Breath of Fire is still unpressed resets a
// Breath of Fire that was already ready: one Breath of Fire lost. There's
// no other cost on the timeline (Breath of Fire has nothing to come back).
//
// Worth the player's own Breath of Fire a press: its hit plus Dragonfire
// Brew's (387621), 37–52k across the samples; its DoT (123725, 4–8k a
// press) and the Flurry Strikes a press adds inside Niuzao (Shado-Pan) are
// left out, so it's a lower bound. A lost reset whose stretch (Keg Smash to
// Keg Smash) held an idle GCD (IDLE_COVERED_MS unforced) isn't counted:
// the Breath of Fire would have filled that idle, which the GCD-gap check
// already prices at the average GCD. Stretches mostly in forced time
// aren't counted either. A player whose Breath of Fire comes back without
// a Keg Smash (BOF_FREE_MAX pairs or more) plays another build: skipped.
//
// Measured (lost resets / counted, value):
// - top: Fluffytail 6 / 5 (240k; 1:21, 2:18, and 3:42 / 5:50 / 6:49
//   around a Celestial Infusion), Melstout 1 / 1 (52k, 1:52), Bus 1 / 1 (44k,
//   1:30), Blueregard 1 / 1 (37k, 3:45);
// - weaker: Qywsi 28 / 15 (656k; 0:53, 2:47, 4:43, 4:59 two Keg Smashes
//   1.0s apart), Sinamonk 14 / 13 (556k; eight are two Keg Smashes 1.0s
//   apart, 0:15 the first), Fluffÿ 8 / 6 (285k, 0:34), Kegroit 1 / 1
//   (43k), Lootchi 0.
// The probe of the 20th-percentile Revacholiere (PxyRY4dMkzTAj8Cv,
// Nek'zali) shows 61 Keg Smashes against 50 Breaths of Fire.
// WoWAnalyzer's priority list scores the same thing (Keg Smash while
// Breath of Fire is ready).
//
// ── Niuzao (tracked-cooldowns.ts, niuzaoValue) ─────────────────────────
// Invoke Niuzao (132578, a 25s buff of the same id) recharges in 95s for
// the seven Shado-Pan players (shortest 95.0–97.1s) and 120s for the two
// Master of Harmony (121.0, 120.4); the talent can't be read from the
// log, so it's tracked at 120s, lenient for the 95s players. A use is
// worth Niuzao's own hits (89–238k a use) plus, for Shado-Pan, the Flurry
// Strikes the window adds: 47–83k/s inside against 14–21k/s outside
// (Wisdom of the Wall), 0.79–1.38M a use; less the GCD, a use is worth
// 0.84–1.39M on Shado-Pan, 31–87k on Master of Harmony. No sample player
// loses a whole use: the top press it every 95–99s; the weakest gaps are
// Lootchi's 127s and Qywsi's 135s. The 20th-percentile Revacholiere
// (probe) pressed it twice in 5:27 (0:19, 3:27), 82s held at 120s.
//
// ── Measured and not built (numbers in the ledger) ─────────────────────
// - Blackout Combo spent on Keg Smash: a Tiger Palm with it hits 2–3× one
//   without (Melstout 127k vs 63k), Keg Smash gains nothing (78k vs 82k).
//   Outside Niuzao, Melstout (99.7th) spends 15 on Keg Smash, the weaker
//   Fluffÿ and Sinamonk 23; Melstout's Keg Smash-first order keeps every
//   Breath of Fire reset (90 / 90). Fires on the top as on the weak.
// - Breath of Fire count in a Niuzao window: the 100th-percentile
//   Fluffytail has 4–6, like the weaker Lootchi (4–6) and Fluffÿ (5);
//   what it measures is the reset above.
// - Touch of Death: 0.43–1.43M a press, on Venoms under 15% (Vashnik);
//   top players also leave low Venoms with it ready (Fluffytail 16
//   stretches, Melstout 19). Not separable, as for Windwalker.
// - Energy: 17–25% of the top players' casts at 100, 10–28% the weaker.
// - Chi Burst (30s): 49–111k a press against a ~74k GCD; Blueregard
//   (100th) presses it every 63s.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { JobCheck, Moment } from "../../types";
import { finding } from "../../checks";
import { gcdLockMs, mergeWindows, overlapMs } from "../../timeline";
import { k } from "./shared";

const KEG_SMASH = 121253;
const BREATH_OF_FIRE = 115181;
const BOF_HITS = new Set([115181, 387621]);   // Breath of Fire, Dragonfire Brew
const IDLE_COVERED_MS = 850;
const GCD_TOLERANCE_MS = 150;
const BOF_FREE_MAX = 3;
const MIN_BOF = 10;

const NIUZAO = 132578;
const FLURRY_HITS = new Set([451250, 450620, 450617]);

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

/** One press per spell per instant (a press can log twice), before the pull's end. */
function presses(player: PlayerInfo, id: number, endMs: number): number[] {
  const out: number[] = [];
  for (const t of player.casts.filter((c) => !c.fake && c.abilityId === id && c.timestamp < endMs).map((c) => c.timestamp).sort((a, b) => a - b)) {
    if (out.length && t - out[out.length - 1] < 100) continue;
    out.push(t);
  }
  return out;
}

const bofResetLost: JobCheck = (ctx) => {
  const p = ctx.player;
  const ks = presses(p, KEG_SMASH, ctx.endMs);
  const bof = presses(p, BREATH_OF_FIRE, ctx.endMs);
  if (bof.length < MIN_BOF || ks.length < MIN_BOF) return [];
  const seq = [...ks.map((t) => ({ t, ks: true })), ...bof.map((t) => ({ t, ks: false }))].sort((a, b) => a.t - b.t);
  const free = seq.filter((e, i) => i > 0 && !e.ks && !seq[i - 1].ks).length;
  if (free >= BOF_FREE_MAX) return [];
  const value = p.damageDone.filter((e) => !e.pet && BOF_HITS.has(e.abilityId) && e.timestamp < ctx.endMs)
    .reduce((a, e) => a + (e.amount ?? 0), 0) / bof.length;
  if (!(value > 0)) return [];
  const forced = mergeWindows(ctx.forced);
  const uses = [...ctx.uses].sort((a, b) => a.startMs - b.startMs);
  const moments: Moment[] = [];
  let lost = 0, idleSkipped = 0;
  for (let i = 1; i < seq.length; i++) {
    if (!seq[i - 1].ks || !seq[i].ks) continue;
    const s = seq[i - 1].t, e = seq[i].t;
    lost++;
    if (overlapMs(s, e, forced) * 2 > e - s) continue;
    // Unforced idle between the GCDs of the stretch: the gap check's.
    const inner = uses.filter((u) => u.startMs >= s - 50 && u.startMs <= e + 50);
    let idle = 0;
    for (let j = 1; j < inner.length; j++) {
      const end = inner[j - 1].startMs + gcdLockMs(inner[j - 1], ctx.factorAt(inner[j - 1].startMs)) + GCD_TOLERANCE_MS;
      if (inner[j].startMs > end) idle += inner[j].startMs - end - overlapMs(end, inner[j].startMs, forced);
    }
    if (idle >= IDLE_COVERED_MS) { idleSkipped++; continue; }
    moments.push({ startMs: s, endMs: e, lostDamage: value,
      detail: `Keg Smash at ${clock(s)}, then Keg Smash again at ${clock(e)} (${((e - s) / 1000).toFixed(1)}s) with no Breath of Fire between` });
  }
  if (moments.length === 0) return [];
  return [finding(ctx, {
    kind: "proc-lost", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Breath of Fire reset lost",
    lostDamage: moments.length * value,
    basis: `${moments.length} × ${k(value)}, the player's Breath of Fire a press (its hit and Dragonfire Brew, over ${bof.length} presses; DoT left out)` +
      (idleSkipped ? `; ${idleSkipped} more with an idle GCD in the stretch, priced as GCD gaps` : ""),
    detail: `${lost} Keg Smash${lost > 1 ? "es" : ""} pressed while the last one's Breath of Fire was still ready: each Keg Smash resets Breath of Fire, so the second reset was wasted`,
    moments,
  })];
};

/**
 * One Invoke Niuzao use's worth (tracked-cooldowns.ts): Niuzao's own hits
 * a use, plus the Flurry Strikes its window adds (the player's rate inside
 * the windows less outside, × the average window), less the average GCD the
 * press took.
 */
export function niuzaoValue(player: PlayerInfo, endMs: number, gcdValue: number): { value: number; basis: string } | undefined {
  const buffs = (player.buffs ?? []).filter((b) => b.source === player.name && b.abilityId === NIUZAO && b.timestamp < endMs)
    .sort((a, b) => a.timestamp - b.timestamp);
  const wins: { startMs: number; endMs: number }[] = [];
  for (const b of buffs) {
    if (b.buffStatus === "applied") wins.push({ startMs: b.timestamp, endMs: endMs });
    else if (b.buffStatus === "removed" && wins.length && wins[wins.length - 1].endMs === endMs) wins[wins.length - 1].endMs = b.timestamp;
  }
  if (wins.length === 0) return undefined;
  const inMs = wins.reduce((a, w) => a + w.endMs - w.startMs, 0);
  const outMs = endMs - inMs;
  if (inMs <= 0 || outMs <= 0) return undefined;
  const inside = (t: number) => wins.some((w) => t >= w.startMs && t <= w.endMs);
  const pet = player.damageDone.filter((e) => e.pet && /Niuzao/.test(e.pet) && e.timestamp < endMs).reduce((a, e) => a + (e.amount ?? 0), 0) / wins.length;
  let fIn = 0, fOut = 0;
  for (const e of player.damageDone) {
    if (e.pet || !FLURRY_HITS.has(e.abilityId) || e.timestamp >= endMs) continue;
    if (inside(e.timestamp)) fIn += e.amount ?? 0; else fOut += e.amount ?? 0;
  }
  const avgWin = inMs / wins.length;
  const flurry = Math.max(0, (fIn / inMs - fOut / outMs) * avgWin);
  const value = pet + flurry - gcdValue;
  if (!(value > 0)) return undefined;
  return {
    value,
    basis: `(${k(pet)} Niuzao's hits a use${flurry > 0 ? ` + ${k(flurry)} Flurry Strikes the window adds (${k(fIn / inMs * 1000)}/s inside vs ${k(fOut / outMs * 1000)}/s outside)` : ""} − ${k(gcdValue)} average GCD)`,
  };
}

export const BREWMASTER_CHECKS: JobCheck[] = [bofResetLost];
