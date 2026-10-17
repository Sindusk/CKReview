// lib/damage/wow/specs/retribution.ts
//
// Retribution Paladin's own checks and cooldown values, beside the shared
// ones melee.ts gives it (Avenging Wrath window, Holy Power capped, the
// main-resource cap) and its tracked cooldowns (tracked-cooldowns.ts:
// Wake of Ashes, Avenging Wrath, Execution Sentence, Divine Toll). Built in
// the WoWAnalyzer audit's phase 3 (docs/wowa-audit/paladin-retribution.md),
// every rule valued as damage lost, measured 2026-10-17 on the 58
// Retribution player-pulls on disk, all Mythic: the top parses Tracer
// (GndQ9VFWtLzNjKpk, 100th on Entombed Sentinels), Blabang
// (aZ6NnwL8g9PdpGJ1, 99.0th), Yenvenger (ACmXHMFtaPLR9k8w, 99th), Yappin
// (MLy7nw8kaW1D394Y, 98.6th), Pipala (7pFPAqzc2NHLXjwZ fight 21, 100th on
// Vashnik) and Pçpaladin (1NL29tyvbzGhZgPK fight 18, 99.8th); the weaker
// Vengadora (91.3th) and Ifeepaladin (81.1th), the Vashnik kills under the
// 80th (Dogsxxt, 欸那個誰, Rhetorica, 耶叶蓝, Hèff, Dêko, Solidjen,
// 乌克兰外星人, Zebroz, 半夏丶, Ësoria) and the other Entombed Sentinels kills
// (Sonnypala, Blëss, Xeg, Goredin, Relentlessxd, Mushtard); and the static's
// Polpo and Jgwentworth (16 pulls each on seven bosses, gVDPhzp61Zm29HMw,
// and the case study qpZx3mWaG7gcDdYB). Spell ids are from those logs'
// masterData.
//
// Talents (from casts, buffs and hits; CombatantInfo carries talent entry
// ids without names): every player takes Crusading Strikes (no Crusader
// Strike press), Execution Sentence, Divine Toll with Divine Resonance,
// Wake of Ashes, Art of War, Divine Purpose, Divine Arbiter and Expurgation.
// 53 of 58 are Herald of the Sun (Dawnlight, Sun's Avatar, Blessing of
// An'she); Yenvenger and Polpo at Nek'zali (two pulls) are Templar
// (Hammer of Light, Light's Deliverance, Empyrean Hammer). Jgwentworth
// played Radiant Glory on four pulls (Avenging Wrath 454351 from Wake,
// Avenging Wrath every ~30s, no Execution Sentence).
//
// ── Tracked cooldowns: each use's value ────────────────────────────────
// Before this pass Avenging Wrath and Execution Sentence were worth 0 a
// use (Avenging Wrath deals nothing; Execution Sentence's cast 343527 hits
// as 387113 and 1260251), so their drift never showed; Wake of Ashes was
// valued by its 255937 hit alone. Now:
// - Wake of Ashes: 255937, 405345, 405350 and its Truth's Wake DoT
//   (403695). 160–410k a use.
// - Execution Sentence: 387113 and 1260251. 0.3–2.2M a use (it stores a
//   share of the player's damage on the target; 19–20% of it on one
//   enemy, measured as the hit ÷ the player's damage on the target during
//   the debuff).
// - Avenging Wrath (avengingWrathValue): the window's bonus read from the
//   player's own non-crit hits, inside vs outside (capped at 30%, as
//   observedWindowBonus), × the damage inside ÷ (1 + bonus), per window.
//   Uncapped it reads +38–49% on the top players (most hits ×1.2, Final
//   Verdict ×1.4–1.5, crit rate 48–58% against 37–38%), so the cap is the
//   conservative side. 1.2–3.1M a use.
// - Divine Toll (divineTollValue, newly tracked: 60s, first use ~6s; its
//   intervals on Retribution are 60.0s at the shortest, 62–75s typical, so
//   the survey's 30s minimum was another spec's): its own thrown hits
//   (Hammer of Wrath 1279408, or Judgment 406957 when Hammer of Wrath
//   isn't usable), plus Divine Resonance (1266308, three stacks, up to
//   30s): each stack makes the next Hammer of Wrath or Judgment hit about
//   twice as hard (Tracer 230k against 117k), so the gain over the
//   player's ordinary press of the same spell counts, less the average GCD
//   the press took. 0.13–0.33M a use.
// All four are burstHold (checks.ts): on Vashnik the 99.8th-percentile
// Pçpaladin pressed all four 2–3s after each Imbibe, 84s apart (the
// context's hold window: 30s before an Imbibe to 5s after). Counted as
// holds they read 10.3M lost; excused, 0. Pipala (100th) uses them on
// cooldown and holds only into the 3:12, 4:36 and 6:00 Imbibes. On
// Ula'tek both static Paladins pressed Avenging Wrath at the two Hearts
// (+200%); Polpo held his through the P2 adds, which read 4.8M before
// Ula'tek's context got its hold windows (ulatek-damage-context.ts).
// Measured with the values (lost a pull, unforced): every top player none;
// Mushtard 2.64M (wWx8B1GPZMLghAyz, Avenging Wrath and Execution Sentence
// held 19.8s, one more use before the kill, 3:06), Polpo 0.48M at Coiled
// Altar Pull 1 (Divine Toll 81.5s, 2:10) and 0.13M on the case study
// (Divine Toll), Hèff 0.42M, Jgwentworth 0.11–0.45M on five pulls,
// 欸那個誰 0.12M, Xeg 69k (Wake of Ashes).
//
// ── Divine Arbiter expired (divineArbiterExpired) ──────────────────────
// Divine Arbiter has two halves: Final Verdict grants 1306161, which the
// next Divine Storm consumes; Divine Storm grants 1306162, which the next
// Final Verdict consumes. Either one adds a Divine Arbiter hit (1306923,
// 80–210k on one enemy, more spread on cleave) to its consumer. Each runs
// out at 20s (spans of 20.00–20.02s, never longer): 1,084 and 554
// removals, 169 and 9 with no cast beside them. An expiry lost the
// player's average Divine Arbiter hit (per consumption, all targets), less,
// for the half Divine Storm consumes, what a Divine Storm costs against
// the Final Verdict it would replace (Final Verdict's average press minus
// Divine Storm's, when positive). Not counted: an expiry whose 20s was
// mostly forced time or death.
// Measured (lost a pull): every top player none; Jgwentworth on seven of
// his 16 pulls, 0.21–0.63M (Vashnik Pull 4: three, 4:07, 5:42, 6:28);
// Zebroz 0.74M (r9CX1kpRGLmKJH4M, three: 2:50, 3:36, 4:33), Solidjen
// 0.56M (hjHXmdnJFwTPpMtK, 2:35 and 6:00). Polpo's two (Entombed Sentinels
// Pull 4 and the case study) ran out mostly in Vitriolic Stasis.
//
// ── Measured and not built (numbers in the ledger) ─────────────────────
// - Hammer of Light after Wake of Ashes: both Templar players pressed it
//   1.0–3.5s after every Wake (33 of 33).
// - Expurgation uptime (383346): 18–62k a pull on the top players, 0–186k
//   on the weaker ones (Jgwentworth's Ula'tek 459k, mostly target swaps).
// - Execution Sentence before Wake of Ashes: a Wake pressed 1–5s before
//   the Execution Sentence misses ~19% of its damage, 13–54k each; never
//   on the top players, at most 0.18M a pull (半夏丶, 乌克兰外星人).
// - Melee swings missed (Crusading Strikes casts a swing): outside forced
//   and movement windows 50–100k on the top Entombed Sentinels players,
//   but 1.12M on Pipala (100th, Vashnik) against Zebroz's 0.98M.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { JobCheck, Moment } from "../../types";
import { finding } from "../../checks";
import { mergeWindows, overlapMs } from "../../timeline";
import { k } from "./shared";

const AVENGING_WRATH = 31884;
const DIVINE_TOLL = 375576;
const TOLL_HITS = new Set([1279408, 406957]);      // Divine Toll's thrown Hammer of Wrath / Judgment
const DIVINE_RESONANCE = 1266308;
const RESONANCE_CONSUMERS = new Set([24275, 20271]); // Hammer of Wrath, Judgment
const FINAL_VERDICT = 383328;
const DIVINE_STORM = 53385;
const ARBITER_FROM_VERDICT = 1306161;  // consumed by Divine Storm
const ARBITER_FROM_STORM = 1306162;    // consumed by Final Verdict
const ARBITER_HIT = 1306923;
const ARBITER_MS = 20_000;
const BONUS_CAP = 0.3;

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const buffWindows = (player: PlayerInfo, id: number, endMs: number) => {
  const ws: { startMs: number; endMs: number }[] = [];
  let st: number | undefined;
  for (const b of (player.buffs ?? []).filter((b) => b.abilityId === id).sort((a, b) => a.timestamp - b.timestamp)) {
    if (b.buffStatus === "applied" && st === undefined) st = b.timestamp;
    else if (b.buffStatus === "removed" && st !== undefined) { ws.push({ startMs: st, endMs: b.timestamp }); st = undefined; }
  }
  if (st !== undefined) ws.push({ startMs: st, endMs });
  return ws.filter((w) => w.startMs < endMs);
};

/** One Avenging Wrath's worth: what its window added to the player's hits, per window. */
export function avengingWrathValue(player: PlayerInfo, endMs: number): { value: number; basis: string } | undefined {
  const ws = buffWindows(player, AVENGING_WRATH, endMs);
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
    basis: `${k(per * bonus / (1 + bonus))} that an average Avenging Wrath added (${k(per)} done inside each of ${ws.length} windows, ` +
      `+${Math.round(bonus * 100)}% read from the player's own hits, capped at ${BONUS_CAP * 100}%)`,
  };
}

/**
 * One Divine Toll's worth: its thrown hits, plus what its Divine Resonance
 * stacks added to the Hammers of Wrath and Judgments they empowered (each
 * against the player's ordinary press of that spell), less the GCD it took.
 */
export function divineTollValue(player: PlayerInfo, endMs: number, gcdValue: number): { value: number; basis: string } | undefined {
  const tolls = player.casts.filter((c) => c.abilityId === DIVINE_TOLL && c.timestamp < endMs).map((c) => c.timestamp);
  if (tolls.length === 0) return undefined;
  const own = player.damageDone
    .filter((h) => TOLL_HITS.has(h.abilityId) && tolls.some((t) => h.timestamp >= t && h.timestamp <= t + 1_500))
    .reduce((a, h) => a + (h.amount ?? 0), 0) / tolls.length;
  const spent = (player.buffs ?? []).filter((b) => b.abilityId === DIVINE_RESONANCE &&
    (b.buffStatus === "stackRemoved" || b.buffStatus === "removed")).map((b) => b.timestamp);
  const presses = player.casts.filter((c) => RESONANCE_CONSUMERS.has(c.abilityId) && c.timestamp < endMs);
  const dmgOf = (c: (typeof presses)[number]) => player.damageDone
    .filter((h) => !TOLL_HITS.has(h.abilityId) && h.abilityName === c.abilityName && h.timestamp >= c.timestamp && h.timestamp < c.timestamp + 900)
    .reduce((a, h) => a + (h.amount ?? 0), 0);
  const empowered = presses.filter((c) => spent.some((t) => Math.abs(t - c.timestamp) <= 50));
  let gain = 0;
  for (const id of RESONANCE_CONSUMERS) {
    const ord = presses.filter((c) => c.abilityId === id && !empowered.includes(c)).map(dmgOf);
    if (ord.length < 3) continue;
    const avg = ord.reduce((a, x) => a + x, 0) / ord.length;
    gain += empowered.filter((c) => c.abilityId === id).reduce((a, c) => a + Math.max(0, dmgOf(c) - avg), 0);
  }
  gain /= tolls.length;
  const value = own + gain - gcdValue;
  if (value <= 0) return undefined;
  return {
    value,
    basis: `(${k(own)} Divine Toll's own hits + ${k(gain)} its Divine Resonance added to Hammer of Wrath / Judgment − ${k(gcdValue)} average GCD in its place)`,
  };
}

// Divine Arbiter's two halves run out at 20s unless the other spender
// follows (header).
const divineArbiterExpired: JobCheck = (ctx) => {
  const p = ctx.player;
  const casts = p.casts.filter((c) => c.timestamp < ctx.endMs);
  const pressAvg = (id: number, name: string) => {
    const n = casts.filter((c) => c.abilityId === id).length;
    const dmg = p.damageDone.filter((h) => !h.pet && h.abilityName === name && h.timestamp < ctx.endMs).reduce((a, h) => a + (h.amount ?? 0), 0);
    return n > 0 ? dmg / n : 0;
  };
  const stormCost = Math.max(0, pressAvg(FINAL_VERDICT, "Final Verdict") - pressAvg(DIVINE_STORM, "Divine Storm"));
  const blocked = mergeWindows([...ctx.forced, ...ctx.dead]);
  const consumedAt: number[] = [];
  const expired: { t: number; id: number }[] = [];
  for (const [id, consumer] of [[ARBITER_FROM_VERDICT, DIVINE_STORM], [ARBITER_FROM_STORM, FINAL_VERDICT]] as const) {
    let gain: number | undefined;
    for (const b of (p.buffs ?? []).filter((b) => b.abilityId === id).sort((a, b) => a.timestamp - b.timestamp)) {
      if (b.buffStatus === "applied" || b.buffStatus === "refreshed") { gain = b.timestamp; continue; }
      if (b.buffStatus !== "removed" || gain === undefined) continue;
      if (casts.some((c) => c.abilityId === consumer && Math.abs(c.timestamp - b.timestamp) <= 200)) consumedAt.push(b.timestamp);
      else if (b.timestamp - gain >= ARBITER_MS - 500 && b.timestamp - gain <= ARBITER_MS + 500 && b.timestamp < ctx.endMs &&
        overlapMs(gain, b.timestamp, blocked) < ARBITER_MS / 2) expired.push({ t: b.timestamp, id });
      gain = undefined;
    }
  }
  if (expired.length === 0 || consumedAt.length < 3) return [];
  const hit = p.damageDone.filter((h) => h.abilityId === ARBITER_HIT && consumedAt.some((t) => h.timestamp >= t && h.timestamp <= t + 500))
    .reduce((a, h) => a + (h.amount ?? 0), 0) / consumedAt.length;
  const lossOf = (id: number) => Math.max(0, hit - (id === ARBITER_FROM_VERDICT ? stormCost : 0));
  const moments: Moment[] = expired.map((x) => ({
    startMs: x.t - ARBITER_MS, endMs: x.t, lostDamage: lossOf(x.id),
    detail: `Divine Arbiter from ${x.id === ARBITER_FROM_VERDICT ? "Final Verdict ran out at " + clock(x.t) + " with no Divine Storm" : "Divine Storm ran out at " + clock(x.t) + " with no Final Verdict"}`,
  }));
  const lost = moments.reduce((a, m) => a + (m.lostDamage ?? 0), 0);
  if (lost <= 0) return [];
  return [finding(ctx, {
    kind: "proc-lost", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Divine Arbiter expired unused",
    lostDamage: lost,
    basis: `${expired.length} × ${k(hit)} average Divine Arbiter hit` +
      (stormCost > 0 && expired.some((x) => x.id === ARBITER_FROM_VERDICT) ? ` (less ${k(stormCost)} for a Divine Storm in a Final Verdict's place)` : ""),
    detail: `${expired.length} Divine Arbiter${expired.length > 1 ? "s" : ""} ran out after 20s unspent (${consumedAt.length} spent)`,
    moments,
  })];
};

export const RETRIBUTION_CHECKS: JobCheck[] = [divineArbiterExpired];
