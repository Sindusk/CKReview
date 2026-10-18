// lib/damage/wow/specs/survival.ts
//
// Survival Hunter's own checks, beside the shared ones melee.ts gives it
// (the Takedown window). Built in the WoWAnalyzer audit's phase 3
// (docs/wowa-audit/hunter-survival.md), every rule valued as damage lost.
// WoWAnalyzer's Survival is `lagging` (12.0.7 against the game's 12.1.0) and
// its priority checker is switched off, so each rule was tested against the
// log first. Measured 2026-10-17 on 13 Survival player-pulls, all Mythic
// kills (the pooled ratios below on the first 10): the top parses Joeexotíc (kyjBDGFrv3M2HJ6p fight 44,
// Entombed Sentinels, 100th), Дэсака (61GjZcKngrFwvJCp fight 20, Entombed
// Sentinels, 99.2th), Calemba (zqaGQTgWXkmfvnVN fight 25, Vashnik, 100th)
// and Glemon (qTFxBHJKANCR48zD fight 23, Vashnik, 98.9th), all four
// fetched for this pass; the weaker Ajunlucky (9w3bK4qhrRC82gVX), Katilena
// (PCMfNtnbrVxpwYhk), Benethir (wWx8B1GPZMLghAyz), Reggienoble
// (zQq63GHTRwPgt2Bp) and Nhymz (ZvrLTQfk1zbAXMwB, Entombed Sentinels and
// Vashnik), 172–238k/s against the top players' 214–266k/s, and the
// 16th–20th percentile Fugginmoo (HahcwNqy7AJzTmgW fight 19), Imjustpika and
// Huntâbow (mtv6nZTcXF4RDWaf fight 22), fetched for it. Spell ids are from
// those logs' masterData.
//
// Talents (from casts, buffs and CombatantInfo): every player takes
// Boomstick (1261193), Raptor Swipe (1262293) and the two-stack Kill Command
// (Primal Surge: each Kill Command takes Tip of the Spear from 0 to 2). Ten
// player-pulls are Sentinel (Moonlight Chakram pressed once after each
// Takedown, Lunar Storm), three Pack Leader (Calemba, Reggienoble, Nhymz on
// Vashnik: Howl of the Pack Leader beasts, Stampede, Hogstrider). Nobody
// presses Mongoose Bite, Butchery, Flanking Strike, Coordinated Assault or
// Spearhead: none is in any log. Takedown's cooldown is a talent choice: 60s
// for the nine who take one talent-tree entry (135511) at rank 2, ~75s for
// Glemon at rank 1, 90s for Joeexotíc and Katilena without it (shortest
// intervals 60.0–71.1s, 82.6s, 91.8–92.2s). The three 20th-percentile
// players were fetched after the first ten and are in the numbers below.
//
// What Survival's buttons do, read from the log:
// - Kill Command (259489) is the pet's attack (259277, 36–87k; game.ts counts
//   it as the press's damage) and gives two Tip of the Spear stacks (260286,
//   cap 3). Wildfire Bomb (259495), Raptor Strike (186270, 265189 in Aspect
//   of the Eagle), Raptor Swipe (1262293, 1262343), Boomstick, Takedown and
//   the Moonlight Chakram each take one: 1,761 of 1,808 presses holding a
//   stack were followed by a stack's removal within 1s (the bomb's at its
//   impact, 0.2–0.6s after the cast).
// - Focus never limits the spec: casts under 30 Focus (a Raptor Strike's
//   cost) are 0–11 of 244–347 a pull, nearly all bombs (10) or off-GCD
//   casts, and 11–43% of casts come at the cap (125 for most, 100
//   for Reggienoble) on each of the first ten, top included. So Survival gets no Focus cap check (melee.ts): it read
//   0.61–1.30M on the four top players (Glemon 1.30M, 13 Kill Commands at the
//   cap) by pricing the Kill Command's Focus at 7–12k a point, when no
//   spender ever waited for Focus. The Kill Command's real cost at the cap is
//   its Tip stacks (below).
//
// ── Tip of the Spear wasted / spender without Tip (tipOfTheSpear) ──────
// A Kill Command pressed while two stacks are held loses one of its two (at
// three, both): Joeexotíc 0:14 "stack=3" from 1, fine; Ajunlucky
// (9w3bK4qhrRC82gVX) presses 27 at two stacks and 5 at three. The stack
// count before each press is read from the Tip events (WCL logs the new
// count on each stack gained or spent; an "applied" is the Kill Command's 2,
// a "refreshed" at the same instant as a "stackRemoved" is its twin). A
// Kill Command under 30 Focus (no Raptor Strike affordable) and one in
// forced time aren't counted.
// The bonus a stack gives, from the players' own non-crit hits with and
// without Tip on them (statusIds), pooled over the 10 player-pulls,
// untipped ÷ tipped: Wildfire Bomb 0.81 (24 untipped hits), Raptor Strike
// 0.91 (13), Raptor Swipe 0.93 (15), Takedown 0.80 (6). Boomstick can't be
// read (its later ticks carry Tip from the next stack; 1.00).
// What a wasted stack costs: it is one tipped press fewer later, either a
// spender that goes out untipped or an extra Kill Command GCD to refill.
// The cheapest of those is a Raptor Strike going untipped, so a wasted
// stack is priced at that: the player's average Raptor Strike × (1 −
// 1/bonus), 10–15k (lenient; an extra Kill Command GCD in place of a
// 130k Raptor Strike would cost more). A spender pressed at no stack after
// the first TIP_OPENER_MS is priced at its own hits × (1 − 1/bonus) (bomb
// 13–200k, Raptor Strike 5–25k, Swipe 5–42k); nearly every one is followed
// by a Kill Command at the next press, so pressing that first would have
// tipped it. Wasted stacks already paid for by an untipped spender aren't
// counted twice: the waste finding prices only the wasted stacks beyond the
// untipped presses.
// Measured (lost a pull, "wasted" + "without Tip"):
// - top: Дэсака 0 + 0; Joeexotíc 52k (4 Kill Commands: 0:21, 1:19, 2:59,
//   6:19) + 19k (a Swipe at 4:11); Glemon 0 + 151k (a bomb at 0:26, 124k);
//   Calemba 66k (6) + 98k (a bomb at 3:19).
// - weak: Ajunlucky 274k + 303k (bombs at 0:12, 2:26, 4:13, 4:19, 5:00,
//   6:12); Reggienoble 319k (23 Kill Commands, 26 stacks: 1:34 and 1:38
//   both at two stacks; none untipped: he refilled with Kill Command, 104
//   a pull, the most) + 0; Benethir 0 (15 wasted, all paid by his 23
//   untipped) + 334k; Katilena 78k + 0; Nhymz 0 + 159k (Entombed
//   Sentinels) and 93k + 68k (Vashnik). The 20th-percentile Entombed
//   Sentinels kills read low here: Imjustpika (mtv6nZTcXF4RDWaf fight 22)
//   59k + 25k, Huntâbow beside him 0 + 41k, Fugginmoo (HahcwNqy7AJzTmgW
//   fight 19) 11k + 10k; their losses are idle and Takedown (below).
// WoWAnalyzer's Kill Command grade fails a press at two stacks or more and
// passes one at one stack when Takedown is next (Sentinel) or a Howl beast
// is up (Pack Leader); a press at one stack loses nothing with Primal Surge
// (1 + 2 = 3), so neither branch matters here. Its untipped list excuses
// the first bomb in 5s and Boomstick in 10s; TIP_OPENER_MS covers both.
//
// ── Takedown held (takedownHeld) ───────────────────────────────────────
// Replaces the tracked-cooldown drift (tracked-cooldowns.ts), which priced a
// use by the cast id's own hits (0: Takedown hits under 1253859 and the
// pet's 1253862) and assumed one 61s cooldown, where the talent makes it 60,
// 75 or 90s. The cooldown here is the player's shortest interval snapped
// down to 60 / 75 / 90s (1.5s slack), 90s with one press: a player who holds
// every Takedown 15s+ reads the next talent up, which errs lenient.
// A use is worth its hits plus what its window (the 8s Pack Leader / 10s
// Sentinel buff, 1250646) adds to the player's and pet's hits: non-crit
// medians inside vs outside per ability, capped ×TD_MAX_RATIO each (potions
// and lust line up with it in the opener): 0.70–1.58M a use (Calemba 0.70M,
// his Takedown hits absorbed on Vashnik; Ajunlucky 1.58M).
// Held = ready → next press (or the pull's last TD_TAIL_MS), less forced
// time, the fight's hold windows (holdWindowsFor: Vashnik's Imbibes),
// time whose next TD_LOOKAHEAD_MS is mostly forced, and TD_ALLOW_MS a cycle
// (the top 60s players press 60.0–63s apart). The opener counts from
// TD_FIRST_MS (the top Entombed Sentinels players press it at 0:00–0:01). A
// held second is that share of a use: held ÷ cooldown × (use − the
// player's average GCD, the GCD it takes). Dead time is the death finding's.
// Measured (lost a pull):
// - top: Calemba, Glemon none (Vashnik: each Takedown pressed in an Imbibe
//   hold window, 83–86s apart); Дэсака 16k; Joeexotíc 215k, 200k of it one
//   cycle (90s Takedown ready 4:37, pressed 5:03).
// - weak: Benethir 910k (0:03 → 0:22 opener, 2:30 → 3:03, 5:04 → 5:17),
//   Huntâbow 845k (2:13 → 3:05), Reggienoble 778k (four holds of 8–12s),
//   Imjustpika 734k, Fugginmoo 733k (3:45 → 5:09 around a 47s death),
//   Nhymz 569k (Entombed Sentinels; none on Vashnik), Katilena 142k (90s,
//   4:52 → 5:09), Ajunlucky 72k. Five Entombed Sentinels players hold the
//   one ready at ~2:15–2:30 to ~3:03, where the top players press theirs at
//   2:05 (Дэсака) or come back after (Joeexotíc's 90s).
//
// ── Moonlight Chakram expired unused (chakramExpired) ──────────────────
// For a Sentinel Survival player each Takedown grants the Moonlight Chakram
// buff (1264946) that the press (1264949; hits 1266081) needs, as Trueshot
// does for Marksmanship. On Survival it runs out at 15.0s, not
// Marksmanship's 17s (Imjustpika mtv6nZTcXF4RDWaf 2:22.21 → 2:37.21,
// Huntâbow beside him 15.01s, no press beside either; every other span on
// the 10 Sentinel player-pulls ends at a press, max 11.4s), so procs.ts's
// 17s entry never sees a Survival expiry. A Chakram is 0.68–0.95M a press
// on the Sentinel players (Glemon's 57k, his hits absorbed on Vashnik), so
// a lost one is priced at the player's average Chakram less their average
// GCD. Not counted when most of its 15s was forced or dead.
// Measured: the top players and the weaker ones press one after every
// Takedown (37 of 37 buffs used on the first 10 player-pulls); Imjustpika
// 535k (2:37, the Takedown at 2:22 into Vitriolic Stasis at 2:34; 12s to
// press it first); Huntâbow's at 4:24 ran mostly in forced time.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { JobCheck, Moment } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { holdWindowsFor, inWindows, mergeWindows, overlapMs, type Window } from "../../timeline";
import { k, s } from "./shared";

const KILL_COMMAND = 259489;
const TIP = 260286;
const TAKEDOWN = 1250646;               // the cast and the player's buff
const TAKEDOWN_HITS = new Set([1253859, 1253862]);   // the player's hit, the pet's
const FOCUS = 2;

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[xs.length >> 1];
const inside = (ws: Window[], t: number) => ws.some((w) => t >= w.startMs && t <= w.endMs);

/** One press per instant, before the pull's end. */
function presses(ctx: PlayerCheckContext, ids: number[]) {
  const out: { t: number; focus?: number }[] = [];
  for (const c of ctx.player.casts.filter((c) => !c.fake && ids.includes(c.abilityId) && c.timestamp < ctx.endMs).sort((a, b) => a.timestamp - b.timestamp)) {
    if (out.length && c.timestamp - out[out.length - 1].t < 100) continue;
    out.push({ t: c.timestamp, focus: c.resources?.find((r) => r.type === FOCUS)?.amount });
  }
  return out;
}

// ── Tip of the Spear ───────────────────────────────────────────────────

const TIP_CAP = 3;
const TIP_OPENER_MS = 10_000;
const TIP_MIN_FOCUS = 30;               // a Raptor Strike's cost
const TIP_HIT_MS = 1_000;
const TIP_MIN_HITS = 5;
const TIP_MAX_RATIO = 1.6;

type Spender = { name: string; ids: number[]; hit: string; ratio: number };
// Untipped ÷ tipped non-crit hits, pooled over the sample players (header); inverted here.
const SPENDERS: Spender[] = [
  { name: "Wildfire Bomb", ids: [259495], hit: "Wildfire Bomb", ratio: 1 / 0.81 },
  { name: "Raptor Strike", ids: [186270, 265189], hit: "Raptor Strike", ratio: 1 / 0.914 },
  { name: "Raptor Swipe", ids: [1262293, 1262343], hit: "Raptor Swipe", ratio: 1 / 0.927 },
];

/** The Tip of the Spear stack count after each of the player's Tip events. */
function tipTimeline(player: PlayerInfo): { timeline: { t: number; n: number }[]; gain: number } {
  const ev = (player.buffs ?? []).filter((b) => b.abilityId === TIP && b.source === player.name).sort((a, b) => a.timestamp - b.timestamp);
  const rows: { t: number; kind: string; n: number | undefined }[] = [];
  for (const b of ev) {
    if (b.buffStatus === "refreshed") continue;   // a same-instant twin of a stackRemoved, or a gain at the cap
    const n = b.buffStatus === "removed" ? 0 : b.buffStatus === "applied" ? undefined : b.stack;
    rows.push({ t: b.timestamp, kind: b.buffStatus ?? "", n });
  }
  // An "applied" carries no count: the next spend's count + 1 tells it.
  const applied: number[] = [];
  rows.forEach((r, i) => {
    if (r.n !== undefined) return;
    const nx = rows[i + 1];
    r.n = nx?.kind === "stackRemoved" && nx.n !== undefined ? nx.n + 1 : nx?.kind === "removed" ? 1 : 2;
    applied.push(r.n);
  });
  const counts = new Map<number, number>();
  for (const n of applied) counts.set(n, (counts.get(n) ?? 0) + 1);
  const gain = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 2;
  return { timeline: rows.map((r) => ({ t: r.t, n: r.n ?? 0 })), gain: Math.min(TIP_CAP, Math.max(1, gain)) };
}

function stacksAt(timeline: { t: number; n: number }[], t: number): number {
  let n = 0;
  for (const e of timeline) { if (e.t > t) break; n = e.n; }
  return n;
}

/** A spender's average press and its Tip bonus: the player's own non-crit hits with vs without Tip, else the pooled ratio. */
function spenderValue(player: PlayerInfo, endMs: number, sp: Spender) {
  const casts = player.casts.filter((c) => !c.fake && sp.ids.includes(c.abilityId) && c.timestamp < endMs).sort((a, b) => a.timestamp - b.timestamp);
  const hits = player.damageDone.filter((h) => !h.pet && !h.isDoT && h.abilityName === sp.hit && h.timestamp < endMs + TIP_HIT_MS);
  const w = hits.filter((h) => h.hitType === 1 && h.unmitigatedAmount && h.statusIds?.includes(TIP)).map((h) => h.unmitigatedAmount!);
  const o = hits.filter((h) => h.hitType === 1 && h.unmitigatedAmount && !h.statusIds?.includes(TIP)).map((h) => h.unmitigatedAmount!);
  const own = w.length >= TIP_MIN_HITS && o.length >= TIP_MIN_HITS;
  const ratio = own ? Math.min(TIP_MAX_RATIO, Math.max(1, median(w) / median(o))) : sp.ratio;
  const pressDmg = (t: number, next: number) => hits.filter((h) => h.timestamp >= t && h.timestamp < Math.min(t + TIP_HIT_MS, next)).reduce((a, h) => a + (h.amount ?? 0), 0);
  const avg = casts.length ? casts.reduce((a, c, i) => a + pressDmg(c.timestamp, casts[i + 1]?.timestamp ?? Infinity), 0) / casts.length : 0;
  return { ratio, own, avg, pressDmg };
}

const tipOfTheSpear: JobCheck = (ctx) => {
  const p = ctx.player;
  const { timeline, gain } = tipTimeline(p);
  if (timeline.length === 0) return [];
  const forced = mergeWindows(ctx.forced);
  const rs = spenderValue(p, ctx.endMs, SPENDERS[1]);
  const rsTip = rs.avg * (1 - 1 / rs.ratio);
  const out = [];

  // Spenders pressed without a stack.
  const untipped: Moment[] = [];
  for (const sp of SPENDERS) {
    const v = spenderValue(p, ctx.endMs, sp);
    const ps = presses(ctx, sp.ids);
    ps.forEach((c, i) => {
      if (c.t < TIP_OPENER_MS || inWindows(c.t, forced) || stacksAt(timeline, c.t - 1) > 0) return;
      const dmg = v.pressDmg(c.t, ps[i + 1]?.t ?? Infinity);
      const lost = dmg * (1 - 1 / v.ratio);
      if (!(lost > 0)) return;
      untipped.push({ startMs: c.t, endMs: c.t, lostDamage: lost, detail: `${sp.name} at ${clock(c.t)} without Tip of the Spear (${k(dmg)}, ×${v.ratio.toFixed(2)} with it)` });
    });
  }
  untipped.sort((a, b) => a.startMs - b.startMs);
  if (untipped.length) out.push(finding(ctx, {
    kind: "combo-broken", startMs: untipped[0].startMs, endMs: untipped[untipped.length - 1].startMs, forced: false, inference: true,
    label: "Spender without Tip of the Spear",
    lostDamage: untipped.reduce((a, m) => a + (m.lostDamage ?? 0), 0),
    basis: `each one's hits × (1 − 1/bonus): the bonus from the player's own non-crit hits with vs without Tip where ${TIP_MIN_HITS}+ each, else measured on the sample players (bomb ×1.23, Raptor Strike ×1.09, Raptor Swipe ×1.08)`,
    detail: `${untipped.length} Wildfire Bomb / Raptor Strike / Raptor Swipe press${untipped.length > 1 ? "es" : ""} with no Tip of the Spear stack: a Kill Command first would have tipped ${untipped.length > 1 ? "them" : "it"}`,
    moments: untipped,
  }));

  // Kill Commands at two stacks or more.
  const waste: { t: number; n: number }[] = [];
  for (const c of presses(ctx, [KILL_COMMAND])) {
    if (inWindows(c.t, forced) || (c.focus !== undefined && c.focus < TIP_MIN_FOCUS)) continue;
    const n = stacksAt(timeline, c.t - 1) + gain - TIP_CAP;
    if (n > 0) waste.push({ t: c.t, n });
  }
  const wasted = waste.reduce((a, w) => a + w.n, 0);
  const priced = Math.max(0, wasted - untipped.length);
  if (wasted > 0 && priced > 0 && rsTip > 0) {
    const share = priced / wasted;
    const moments: Moment[] = waste.map((w) => ({ startMs: w.t, endMs: w.t, lostDamage: w.n * rsTip * share,
      detail: `Kill Command at ${clock(w.t)} with ${TIP_CAP - gain + w.n} Tip of the Spear stacks held: ${w.n} of its ${gain} lost to the cap of ${TIP_CAP}` }));
    out.push(finding(ctx, {
      kind: "gauge-overcap", startMs: waste[0].t, endMs: waste[waste.length - 1].t, forced: false, inference: true,
      label: "Tip of the Spear wasted",
      lostDamage: priced * rsTip,
      basis: `${priced} stack${priced > 1 ? "s" : ""} (${wasted} wasted, less ${untipped.length} untipped spender${untipped.length === 1 ? "" : "s"} already counted) × ${k(rsTip)}, the Tip bonus on the player's average Raptor Strike (${k(rs.avg)} × (1 − 1/${rs.ratio.toFixed(2)})${rs.own ? ", their own hits" : ", the sample players' bonus"}): the cheapest press to lose it from`,
      detail: `${waste.length} Kill Command${waste.length > 1 ? "s" : ""} pressed with ${TIP_CAP - gain + 1}+ Tip of the Spear stacks: a spender first would have kept ${wasted > 1 ? "them" : "it"}`,
      moments,
    }));
  }
  return out;
};

// ── Takedown held ──────────────────────────────────────────────────────

const TD_COOLDOWNS = [60_000, 75_000, 90_000];
const TD_SNAP_SLACK_MS = 1_500;
const TD_FIRST_MS = 3_000;
const TD_ALLOW_MS = 3_000;
const TD_TAIL_MS = 10_000;
const TD_LOOKAHEAD_MS = 10_000;
const TD_STEP_MS = 250;
const TD_MIN_HELD_MS = 250;
const TD_MAX_RATIO = 1.3;

/** The player's Takedown cooldown: their shortest interval, snapped down to a talent's 60 / 75 / 90s. */
function takedownCooldown(ts: number[]): number {
  const iv = ts.slice(1).map((t, i) => t - ts[i]);
  if (iv.length === 0) return TD_COOLDOWNS[TD_COOLDOWNS.length - 1];
  const shortest = Math.min(...iv);
  return [...TD_COOLDOWNS].reverse().find((c) => c <= shortest + TD_SNAP_SLACK_MS) ?? TD_COOLDOWNS[0];
}

/** One Takedown's worth: its own hits (player and pet) plus what its windows added to the player's and pet's hits. */
export function takedownValue(player: PlayerInfo, endMs: number): { value: number; basis: string } | undefined {
  const casts = player.casts.filter((c) => !c.fake && c.abilityId === TAKEDOWN && c.timestamp < endMs).length;
  if (casts === 0) return undefined;
  const wins: Window[] = [];
  let open: number | undefined;
  for (const b of (player.buffs ?? []).filter((x) => x.source === player.name && x.abilityId === TAKEDOWN).sort((a, b) => a.timestamp - b.timestamp)) {
    if (b.buffStatus === "applied" && open === undefined) open = b.timestamp;
    else if (b.buffStatus === "removed" && open !== undefined) { wins.push({ startMs: open, endMs: b.timestamp }); open = undefined; }
  }
  if (open !== undefined) wins.push({ startMs: open, endMs });
  const inW = (t: number) => inside(wins, t);
  const all = player.damageDone.filter((e) => e.timestamp < endMs);
  const own = all.filter((e) => TAKEDOWN_HITS.has(e.abilityId)).reduce((a, e) => a + (e.amount ?? 0), 0);
  const by = new Map<string, { i: number[]; o: number[] }>();
  for (const e of all) {
    if (e.isDoT || e.hitType !== 1 || !e.unmitigatedAmount || TAKEDOWN_HITS.has(e.abilityId)) continue;
    const key = `${e.pet ? "pet:" : ""}${e.abilityId}`;
    const g = by.get(key) ?? { i: [], o: [] };
    (inW(e.timestamp) ? g.i : g.o).push(e.unmitigatedAmount);
    by.set(key, g);
  }
  let sum = 0, n = 0;
  for (const g of by.values()) {
    if (g.i.length < 5 || g.o.length < 5) continue;
    sum += (Math.min(TD_MAX_RATIO, Math.max(1, median(g.i) / median(g.o))) - 1) * g.i.length;
    n += g.i.length;
  }
  const ratio = n >= 20 ? 1 + sum / n : 1;
  const inDmg = all.filter((e) => !TAKEDOWN_HITS.has(e.abilityId) && inW(e.timestamp)).reduce((a, e) => a + (e.amount ?? 0), 0);
  const added = inDmg * (1 - 1 / ratio);
  const value = (own + added) / casts;
  if (!(value > 0)) return undefined;
  return {
    value,
    basis: `${k(value)} a use (its hits, the player's and the pet's, ${k(own / casts)} a cast, + ${k(added / casts)} its window added to their other hits: ×${ratio.toFixed(2)} inside vs outside, non-crit medians; ${casts} casts)`,
  };
}

const takedownHeld: JobCheck = (ctx) => {
  const td = presses(ctx, [TAKEDOWN]).map((c) => c.t);
  if (td.length === 0) return [];
  const use = takedownValue(ctx.player, ctx.endMs);
  if (!use) return [];
  const cd = takedownCooldown(td);
  const gcd = ctx.values.gcdValue(undefined, false);
  const value = use.value - gcd;
  if (!(value > 0)) return [];
  // Dead time is the death finding's, not a hold.
  const notHeld = mergeWindows([...ctx.forced, ...ctx.dead, ...holdWindowsFor(ctx.context?.cooldownHoldWindows?.(ctx.pull), cd)]);
  const lastUseful = ctx.endMs - TD_TAIL_MS;
  const counts = (t: number) => t < lastUseful && !inside(notHeld, t) && overlapMs(t, t + TD_LOOKAHEAD_MS, notHeld) <= TD_LOOKAHEAD_MS / 2;
  const perMs = value / cd;
  const moments: Moment[] = [];
  let heldMs = 0;
  const stretches = [{ ready: TD_FIRST_MS, next: td[0] as number | undefined }, ...td.map((t, i) => ({ ready: t + cd, next: td[i + 1] }))];
  for (const { ready, next } of stretches) {
    const until = Math.min(next ?? lastUseful, lastUseful);
    if (until <= ready) continue;
    let open = 0;
    for (let t = ready; t < until; t += TD_STEP_MS) if (counts(t)) open += Math.min(TD_STEP_MS, until - t);
    const held = open - TD_ALLOW_MS;
    if (held < TD_MIN_HELD_MS) continue;
    heldMs += held;
    moments.push({ startMs: ready, endMs: next ?? ctx.endMs, lostDamage: held * perMs,
      detail: `Takedown ready at ${clock(ready)}, ${next !== undefined ? `pressed at ${clock(next)}` : "not pressed again"}: ${s(held)} held` });
  }
  if (moments.length === 0) return [];
  return [finding(ctx, {
    kind: "cooldown-drift", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Takedown held",
    lostDamage: heldMs * perMs,
    basis: `held time (past ${s(TD_ALLOW_MS)} a cycle, outside forced time and the fight's hold windows) ÷ ${s(cd)} cooldown (the player's shortest interval, snapped to 60 / 75 / 90s) × (${use.basis} − ${k(gcd)} average GCD)`,
    detail: `Takedown sat ready ${s(heldMs)} past the allowance in ${moments.length} cycle${moments.length > 1 ? "s" : ""} (${cd / 1000}s cooldown)`,
    moments,
  })];
};

// ── Moonlight Chakram expired unused (chakramExpired) ──────────────────

const CHAKRAM_BUFF = 1264946;
const CHAKRAM = 1264949;
const CHAKRAM_HIT = 1266081;
const CHAKRAM_MS = 15_000;
const CHAKRAM_EARLY_MS = 600;
const CHAKRAM_NEAR_MS = 200;

const chakramExpired: JobCheck = (ctx) => {
  const p = ctx.player;
  const ev = (p.buffs ?? []).filter((b) => b.abilityId === CHAKRAM_BUFF && b.source === p.name).sort((a, b) => a.timestamp - b.timestamp);
  if (ev.length === 0) return [];
  const casts = p.casts.filter((c) => !c.fake && c.abilityId === CHAKRAM);
  const notCounted = mergeWindows([...ctx.forced, ...ctx.dead]);
  const lost: number[] = [];
  let gained: number | undefined;
  for (const b of ev) {
    if (b.timestamp >= ctx.endMs) break;
    if (b.buffStatus === "applied") gained = b.timestamp;
    else if (b.buffStatus === "removed" && gained !== undefined) {
      const used = casts.some((c) => Math.abs(c.timestamp - b.timestamp) <= CHAKRAM_NEAR_MS || (c.timestamp > gained! && c.timestamp < b.timestamp));
      // Not counted when most of its 15s was forced or dead: there was no time to press it.
      if (!used && b.timestamp - gained >= CHAKRAM_MS - CHAKRAM_EARLY_MS && overlapMs(gained, b.timestamp, notCounted) <= CHAKRAM_MS / 2) lost.push(b.timestamp);
      gained = undefined;
    }
  }
  if (lost.length === 0) return [];
  const n = casts.filter((c) => c.timestamp < ctx.endMs).length;
  const hits = p.damageDone.filter((h) => !h.pet && h.abilityId === CHAKRAM_HIT && h.timestamp < ctx.endMs + 5_000).reduce((a, h) => a + (h.amount ?? 0), 0);
  if (n === 0 || !(hits > 0)) return [];
  const gcd = ctx.values.gcdValue(undefined, false);
  const per = hits / n - gcd;
  if (!(per > 0)) return [];
  return [finding(ctx, {
    kind: "proc-lost", startMs: lost[0] - CHAKRAM_MS, endMs: lost[lost.length - 1], forced: false, inference: true,
    label: "Moonlight Chakram expired unused",
    lostDamage: lost.length * per,
    basis: `${lost.length} × (${k(hits / n)} the player's average Moonlight Chakram − ${k(gcd)} average GCD, the GCD it takes)`,
    detail: `The Moonlight Chakram a Takedown grants ran out unused ${lost.map((t) => `at ${clock(t)}`).join(", ")} (${CHAKRAM_MS / 1000}s for Survival)`,
    moments: lost.map((t) => ({ startMs: t - CHAKRAM_MS, endMs: t, lostDamage: per, detail: `Moonlight Chakram ran out at ${clock(t)}` })),
  })];
};

export const SURVIVAL_CHECKS: JobCheck[] = [tipOfTheSpear, takedownHeld, chakramExpired];
