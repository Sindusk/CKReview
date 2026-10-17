// lib/damage/wow/specs/destruction.ts
//
// Destruction Warlock's own checks, beside the shared ones ranged.ts gives
// it (the Malevolence window; Wither uptime; the tracked Summon Infernal,
// Malevolence and Soul Fire cooldowns in tracked-cooldowns.ts, whose worth a
// use for the first two is priced here). Backdraft and Havoc on the main
// target were built in the Wyrmtongues case study (qpZx3mWaG7gcDdYB pull 3,
// 2026-10-13) and moved here from ranged.ts in the WoWAnalyzer audit's
// phase 3 (docs/wowa-audit/warlock-destruction.md), with their output
// unchanged apart from the Havoc fix below. Spell ids are from the logs'
// masterData.
//
// Measured 2026-10-17 on 34 Destruction player-pulls, all Mythic: the top
// Entombed Sentinels parses 극세사이불 (aZ6NnwL8g9PdpGJ1, 99.8th), Kellslocks
// (PAgdKqkXDTRfLnJy, 99.6th), Babybrain (dG8D9y6WxrfmtgXp, 99.5th) and Xyron
// (GndQ9VFWtLzNjKpk, 99.4th); 20 other Entombed Sentinels kills of 217–324k
// DPS (Fisor baRCnPv62YQ1dJZN, Pêntex ZC7YNpr2HVQLtjv1, Lumilol
// L8yGzCABtm6Zx1YR, Phycookie ACmXHMFtaPLR9k8w, Dahlmaestro
// JQVkMCb8T324yWca, Hannumon MLy7nw8kaW1D394Y, Junibacken xN9cWhzbvqTVfrG8,
// Naruke 6kHtGaQXCMWYxFpZ, 淺若晨曦 and 龍蛋蛋 A49h3gvBnRYHZQNX, Dajos, Deadmoon
// and Borny QFTXqD8VNKCvx9jf, Trinketprocs 6Bpq1FmA9aH4WQxc, Dwnx
// vRPGT4MN6VALQWFh, Lowercaseg VWMbYPRyxCAmhZFj, Crittybity
// VBPkNJnWMdZx8wQ1, Demosucc WDNdyzgKArhYM327, Henzillxlock
// ZvrLTQfk1zbAXMwB, Neerthus LCFp3wbHvQqNP4my); the weaker Threefatez
// (dG8D9y6WxrfmtgXp, ~20th, died) and Musclewizärd (nhbCYHXRf1T2qAv9);
// Zyndrøs and Girthgate on Vashnik (kZnVcJYpKFRChTzb, mNkHXhaD6Y2tqQTg);
// and the static's Wyrmtongues (qpZx3mWaG7gcDdYB pull 3 and five
// gVDPhzp61Zm29HMw Entombed Sentinels wipes).
//
// Talents (from casts, buffs and hits; every one of the 34, and three
// probed 20th–59th percentile players): Hellcaller (Wither, Malevolence,
// Blackened Soul), Shadowburn with Fiendish Cruelty (a free Shadowburn
// proc), Soul Fire, Summon Infernal with Crashing Chaos (33 of 34) and the
// Overfiend, Havoc (Zyndrøs has Mayhem instead: 16 Havoc debuffs, no cast).
// Nobody casts Immolate, Channel Demonfire, Ruination or Grimoire of
// Sacrifice, so those rules had no sample (the ledger).
//
// ── Summon Infernal's and Malevolence's worth (tracked-cooldowns.ts) ──
// Both were tracked but worth 0 a use: the drift check priced them by hits
// under the cast's id, and neither has any (Infernal's damage is the pet
// "Infernal" and Infernal Awakening 22703; Malevolence's hit is 446285), so
// their drift never reported.
// - Summon Infernal (1122): the pet's damage and the Awakening per cast,
//   plus what Crashing Chaos (417282, the stacks Infernal grants, spent by
//   Chaos Bolts) adds to Chaos Bolt (116858). Its bonus is read from the
//   player's own hits: Chaos Bolt's median unmitigated hit inside the
//   buff over outside, divided by the same ratio for Incinerate (29722, not
//   empowered: the control for potions, lust and trinkets lined up with
//   Infernal). Chaos Bolt rose ×1.09–1.51, Incinerate ×0.86–1.11; the
//   bonus came out +5–49% (median ~29%), capped at CC_BONUS_CAP. A use:
//   pet 331–859k, Awakening 2–12k, Crashing Chaos 0.21–1.05M; 0.82–1.64M
//   in all (top 0.82–1.51M). Overfiend's damage isn't counted: it also
//   comes on a proc, not only at Infernal.
// - Malevolence (442726): its hit at the cast (446285, 77–316k, all of it
//   within 3s of a cast) plus its Chaos Bolt bonus inside the cast's own
//   20s window, by the same ratio test outside Crashing Chaos (+11–49%),
//   priced over the share of the Malevolence buff time that cast windows
//   make up (the buff also comes on an 8s proc: Kellslocks 0:28.4, 3:41.3,
//   3:57.2 with no cast). 0.16–0.56M a use (top 0.41–0.51M). Its haste
//   isn't counted.
// Both are GCD presses: a lost use freed a GCD, so the player's average
// GCD comes off: 0.56–1.41M an Infernal, 3–294k a Malevolence. Neither
// drift fires on the 34 player-pulls (nobody lost a whole use: the longest
// holds were Crittybity's Infernals, 94.7 / 105.7 / 122.4s apart in 6:06,
// four casts where five fit only by the kill's last seconds); the values
// are there for the pull that does.
//
// ── Havoc on the main target (havocTarget) ─────────────────────────────
// Unchanged from the case study but for one thing: a cast aimed at the
// Havoc target counts only while another enemy was alive, read as a hit
// from anyone in the raid on another enemy within ALT_ALIVE_MS of it. It
// fired on Phycookie (ACmXHMFtaPLR9k8w, 1.36M at 4:52): Havoc on Blood of
// Ula'tek at 4:52.7, then Breath of Ula'tek and the Venom died by 4:56,
// and his last six casts went at the only enemy left. Fisor
// (baRCnPv62YQ1dJZN, 3:11.8 on Breath) and Junibacken (xN9cWhzbvqTVfrG8,
// 0:27.7 on the Venom) stay flagged: both bosses were taking raid damage
// while they attacked the Havoc target.
//
// ── Havoc held (havocHeld) ─────────────────────────────────────────────
// WoWAnalyzer has Havoc's cast efficiency switched off and phase 2 called
// it no-damage, but a Havoc is the biggest thing a Destruction player
// presses: the copies on its target come to 1.2–2.3M a window (hits of the
// Havoc spells on the Havoc target in windows where nothing was aimed at
// it; 0.56M on Vashnik, where the second target is an add). Its cooldown is
// a flat 30s (shortest interval 30.0–30.2s on 20 of the 32 player-pulls
// that press it, never under 30.0s). A second held
// pushes every later Havoc back a second, so held time ÷ 30s is the share
// of a Havoc lost, worth the copies less the press's GCD.
// Held = ready → next press, counted only while two enemies took raid hits
// within ±2s (a second target to copy to), outside forced time and the
// fight's hold windows, not in the last 10s, past HAVOC_ALLOW_MS a cycle:
// the top players' own holds before a press reach 5.5–5.8s (극세사이불 1:27,
// 3:37), the shards they bank for the window. A Havoc pressed before the
// pull counts from the debuff at the start (Wyrmtongues's 0:00).
// Measured (lost a pull): top Kellslocks and Babybrain none, 극세사이불 172k
// (two holds of 1.4–1.5s), Xyron 245k (ready 4:13, pressed 4:35, 4.4s of it
// with two enemies). Others: Neerthus 1.09M (LCFp3wbHvQqNP4my, ready 3:57,
// pressed 4:34), 龍蛋蛋 573k (A49h3gvBnRYHZQNX, 3:44 → 4:02), Henzillxlock
// 307k, Lumilol 299k, Junibacken 169k, Demosucc 154k, Dwnx 107k,
// Lowercaseg 102k, 淺若晨曦 67k, 15 players none; the static's Wyrmtongues
// 89–449k on four of six pulls (gVDPhzp61Zm29HMw Pull 5: ready 0:30,
// pressed 1:01, 8.8s held with both bosses up), none on the case study.
// Girthgate 254k on Vashnik. Mayhem players (no Havoc presses) are skipped.
//
// ── Measured and not built ─────────────────────────────────────────────
// - Conflagrate capped (17962, 2 charges): WoWAnalyzer's 13s ÷ haste
//   recharge doesn't fit the log. The fastest presses need ~9–11s of
//   hasted recharge (the largest recharge under which every press had a
//   charge, with the app's own haste fit: Xyron 9.2s, Kellslocks 9.9s,
//   극세사이불 10.8s; 13s leaves 5–10 presses a pull with no charge), and no
//   logged cut explains it. Under each player's own fitted recharge (the
//   lenient end), time at two charges outside forced time and 1.25s a
//   stretch: top 9.6–23.0s (1.3–3.5 Conflagrates), the others 0.9–41.6s
//   (0.1–7.0) but Demosucc 88s (14.1, 3:39–4:04 on Withers and a
//   defensive) and Henzillxlock 56s (7.4). A Conflagrate is worth 147–204k
//   against an Incinerate's ~80–118k in the same GCD, so most players lose
//   0.1–0.4M, about the top players' floor. Some holds are deliberate:
//   Kellslocks held both charges 3:06.7–3:18.2 with 5 Soul Shards, where
//   a Conflagrate's shards would have been wasted. Not built.
// - Shadowburn (17877) has no cooldown here: shortest intervals 0.73–0.96s
//   (one GCD), and in execute 극세사이불 chains four to seven in a row
//   (3:59–4:05). It is a one-shard spender; Fiendish Cruelty (1245664)
//   makes one free and is always spent (0–1 removed without a Shadowburn
//   a pull, the last at the kill). No cooldown to hold, so no efficiency
//   or kill-reset model.
// - Soul Fire's shard cut: the shortest begin after the previous landing is
//   44.8s with 19–32 shards spent in between, the same as with 12; a 2s
//   cut a shard would have made it ready in under 10s. None seen.
// - Shards spent inside Havoc (WoWAnalyzer's window grades): 60–74% of
//   every Entombed Sentinels player's shards went into Havoc (top 65–71%,
//   Havoc up 49–61% of the pull); the low windows are the pull's last one
//   or a dying add. It doesn't separate players.
// - Spell survey (step 16a): top players' GCD uptime 88–93%; only Dark Pact
//   and a flask follow 0.7s+ gaps, both off the GCD.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { JobCheck, Moment } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { holdWindowsFor, mergeWindows, overlapMs, type Window } from "../../timeline";
import { castTimeProcFindings, k, s } from "./shared";

const SUMMON_INFERNAL = 1122;
const INFERNAL_AWAKENING = 22703;
const INFERNAL_PET = "Infernal";
const CRASHING_CHAOS = 417282;
const MALEVOLENCE = 442726;          // the cast and the player's buff
const MALEVOLENCE_HIT = 446285;
const CHAOS_BOLT = 116858;
const INCINERATE = 29722;
const CONFLAGRATE = 17962;
const SOUL_FIRE = 6353;
const SHADOWBURN = 17877;
const HAVOC = 80240;

const CC_BONUS_CAP = 0.5;
const MAL_WINDOW_MS = 20_000;        // a cast's Malevolence (1:04.0 → 1:24.0 and the like; procs last 8s)
const MIN_HITS = 5;
const ALT_ALIVE_MS = 2_000;

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const inAny = (ws: Window[], t: number) => ws.some((w) => t >= w.startMs && t <= w.endMs);

function buffWindows(player: PlayerInfo, id: number, endMs: number): Window[] {
  const out: Window[] = [];
  let open: number | undefined;
  for (const b of (player.buffs ?? []).filter((x) => x.abilityId === id && x.source === player.name).sort((a, b) => a.timestamp - b.timestamp)) {
    if (b.buffStatus === "applied" && open === undefined) open = b.timestamp;
    else if (b.buffStatus === "removed" && open !== undefined) { out.push({ startMs: open, endMs: b.timestamp }); open = undefined; }
  }
  if (open !== undefined) out.push({ startMs: open, endMs });
  return out;
}

/**
 * What a buff adds to Chaos Bolt: its median unmitigated hit inside ÷
 * outside, over the same ratio for Incinerate (the control), applied to the
 * Chaos Bolt damage inside. Hits inside `exclude` are left out on both sides.
 */
function chaosBoltBonus(player: PlayerInfo, endMs: number, ws: Window[], exclude: Window[] = []) {
  const hits = (id: number) => player.damageDone.filter((e) => !e.pet && !e.isDoT && e.abilityId === id && e.timestamp < endMs && e.unmitigatedAmount && !inAny(exclude, e.timestamp));
  const ratio = (id: number) => {
    const xs = hits(id);
    const i = xs.filter((e) => inAny(ws, e.timestamp)).map((e) => e.unmitigatedAmount!);
    const o = xs.filter((e) => !inAny(ws, e.timestamp)).map((e) => e.unmitigatedAmount!);
    return i.length >= MIN_HITS && o.length >= MIN_HITS ? median(i) / median(o) : undefined;
  };
  const cb = ratio(CHAOS_BOLT), inc = ratio(INCINERATE);
  if (cb === undefined || inc === undefined) return { bonus: 0, added: 0 };
  const bonus = Math.min(CC_BONUS_CAP, Math.max(0, cb / inc - 1));
  const inside = hits(CHAOS_BOLT).filter((e) => inAny(ws, e.timestamp)).reduce((a, e) => a + (e.amount ?? 0), 0);
  return { bonus, added: inside * (1 - 1 / (1 + bonus)) };
}

const pressCount = (player: PlayerInfo, id: number, endMs: number) =>
  player.casts.filter((c) => !c.fake && c.abilityId === id && c.timestamp < endMs).length;

/** One Summon Infernal (tracked-cooldowns.ts): the Infernal, its Awakening and Crashing Chaos's Chaos Bolt bonus, less a GCD. */
export function infernalValue(player: PlayerInfo, endMs: number, gcdValue: number): { value: number; basis: string } | undefined {
  const n = pressCount(player, SUMMON_INFERNAL, endMs);
  if (n === 0) return undefined;
  const sum = (f: (e: PlayerInfo["damageDone"][number]) => boolean) =>
    player.damageDone.filter((e) => e.timestamp < endMs && f(e)).reduce((a, e) => a + (e.amount ?? 0), 0);
  const pet = sum((e) => e.pet === INFERNAL_PET) / n;
  const awakening = sum((e) => !e.pet && e.abilityId === INFERNAL_AWAKENING) / n;
  const cc = chaosBoltBonus(player, endMs, buffWindows(player, CRASHING_CHAOS, endMs));
  const crashing = cc.added / n;
  const value = pet + awakening + crashing - gcdValue;
  if (!(value > 0)) return undefined;
  return {
    value,
    basis: `(${k(pet + awakening)} Infernal and its Awakening + ${k(crashing)} Crashing Chaos adds to Chaos Bolt (+${Math.round(cc.bonus * 100)}%, against Incinerate) a cast, ${n} casts, − ${k(gcdValue)} average GCD)`,
  };
}

/** One Malevolence (tracked-cooldowns.ts): its hit and its Chaos Bolt bonus in the cast's window, less a GCD. */
export function malevolenceValue(player: PlayerInfo, endMs: number, gcdValue: number): { value: number; basis: string } | undefined {
  const casts = player.casts.filter((c) => !c.fake && c.abilityId === MALEVOLENCE && c.timestamp < endMs).map((c) => c.timestamp);
  if (casts.length === 0) return undefined;
  const hit = player.damageDone.filter((e) => !e.pet && e.abilityId === MALEVOLENCE_HIT && e.timestamp < endMs).reduce((a, e) => a + (e.amount ?? 0), 0) / casts.length;
  const buff = buffWindows(player, MALEVOLENCE, endMs);
  const castWins = mergeWindows(casts.map((t) => ({ startMs: t, endMs: Math.min(endMs, t + MAL_WINDOW_MS) })));
  const buffMs = buff.reduce((a, w) => a + w.endMs - w.startMs, 0);
  const castMs = castWins.reduce((a, w) => a + overlapMs(w.startMs, w.endMs, buff), 0);
  const share = buffMs > 0 ? Math.min(1, castMs / buffMs) : 0;
  const mb = chaosBoltBonus(player, endMs, buff, buffWindows(player, CRASHING_CHAOS, endMs));
  const window = mb.added * share / casts.length;
  const value = hit + window - gcdValue;
  if (!(value > 0)) return undefined;
  return {
    value,
    basis: `(${k(hit)} its hit + ${k(window)} its Chaos Bolt bonus (+${Math.round(mb.bonus * 100)}% against Incinerate, outside Crashing Chaos) in the cast's window a cast, ${casts.length} casts, − ${k(gcdValue)} average GCD)`,
  };
}

// ── Backdraft ──────────────────────────────────────────────────────────
// Backdraft (117828): Conflagrate (17962) adds a stack, max 2; Chaos Bolt
// (116858), Incinerate (29722) and Soul Fire (6353) each take one. Ids and
// the max from qpZx3mWaG7gcDdYB pull 3 (applybuffstack 2, then
// refreshbuff on a Conflagrate at 2). Phase 3: top players 0–328k a pull
// (극세사이불's three overcaps at 4:22–4:56 came from Conflagrates in his
// execute Shadowburn chain, which Backdraft doesn't speed), the others
// 0–594k (Crittybity, three overcaps and two expiries).
const backdraft: JobCheck = (ctx) => castTimeProcFindings(ctx, {
  statusId: 117828, name: "Backdraft", maxStacks: 2,
  generatorIds: [CONFLAGRATE], consumerIds: [CHAOS_BOLT, INCINERATE, SOUL_FIRE],
});

// ── Havoc on the main target ───────────────────────────────────────────
// Havoc (80240, a debuff on an enemy, 20s here) copies the player's
// single-target spells onto that enemy, so it belongs on an enemy they're
// NOT attacking. On qpZx3mWaG7gcDdYB pull 3 Wyrmtongues put it on Breath at
// 2:46, then the post-Stasis swap made Breath their main target: 12 of 13
// spells in the window went at the Havoc target and almost nothing was
// copied. The two top Destruction Warlocks on NK1hBtW9rckdjq36 put it on
// the other boss at all 9 of their swaps.
// A window counts when 60%+ of its single-target casts (3+) went at the
// Havoc target while another enemy was alive (see the header) and the
// player hit another enemy within it ±5s. Lost = the share aimed at it ×
// the player's average copied damage per window (hits on the Havoc target
// in windows where nothing was aimed at it), × the window's unforced share.
// Inference: what a proper target would have copied.
const HAVOC_SPELLS = new Set([CHAOS_BOLT, INCINERATE, CONFLAGRATE, SHADOWBURN, SOUL_FIRE]);

type HavocWindow = { startMs: number; endMs: number; target: string };

/** The player's Havoc windows (the debuff on an enemy, apply → remove). */
function havocWindows(ctx: PlayerCheckContext): HavocWindow[] {
  const ev = (ctx.pull.bossDebuffs ?? []).filter((e) => e.statusId === HAVOC && e.sourceName === ctx.player.name)
    .sort((a, b) => a.timestamp - b.timestamp);
  const wins: HavocWindow[] = [];
  for (const e of ev) {
    if (e.status === "applied") wins.push({ startMs: e.timestamp, endMs: ctx.endMs, target: e.targetName });
    else if (e.status === "removed" && wins.length && wins[wins.length - 1].target === e.targetName) wins[wins.length - 1].endMs = e.timestamp;
  }
  return wins;
}

/** The raid's hits by time: whether an enemy other than `not` (or any two enemies) took a hit within ALT_ALIVE_MS of t. */
function raidTargets(ctx: PlayerCheckContext) {
  const raid = ctx.pull.players.flatMap((pl) => pl.damageDone.filter((h) => h.target).map((h) => ({ t: h.timestamp, target: h.target! })))
    .sort((a, b) => a.t - b.t);
  const scan = (t: number, ok: (target: string, seen: Set<string>) => boolean) => {
    let lo = 0, hi = raid.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (raid[mid].t < t - ALT_ALIVE_MS) lo = mid + 1; else hi = mid; }
    const seen = new Set<string>();
    for (let i = lo; i < raid.length && raid[i].t <= t + ALT_ALIVE_MS; i++) { if (ok(raid[i].target, seen)) return true; seen.add(raid[i].target); }
    return false;
  };
  return {
    otherAlive: (t: number, not: string) => scan(t, (target) => target !== not),
    twoAlive: (t: number) => scan(t, (target, seen) => seen.size > 0 && !seen.has(target)),
  };
}

/** Per window: casts, casts at the Havoc target, its copied hits; and the player's copied damage per clean window (nothing aimed at the target). */
function havocStats(ctx: PlayerCheckContext, wins: HavocWindow[], otherAlive: (t: number, not: string) => boolean) {
  const own = ctx.player.damageDone.filter((h) => !h.pet);
  const stats = wins.map((w) => {
    const casts = ctx.player.casts.filter((c) => HAVOC_SPELLS.has(c.abilityId) && c.timestamp >= w.startMs && c.timestamp <= w.endMs);
    const atTarget = casts.filter((c) => c.target === w.target);
    const aimed = atTarget.filter((c) => otherAlive(c.timestamp, w.target)).length;
    const onTarget = own.filter((h) => HAVOC_SPELLS.has(h.abilityId) && h.target === w.target && h.timestamp >= w.startMs && h.timestamp <= w.endMs + 2_000)
      .reduce((a, h) => a + (h.amount ?? 0), 0);
    const other = own.some((h) => h.target !== w.target && h.timestamp >= w.startMs - 5_000 && h.timestamp <= w.endMs + 5_000);
    return { w, casts: casts.length, atTarget: atTarget.length, aimed, onTarget, other };
  });
  const clean = stats.filter((x) => x.casts >= 3 && x.atTarget === 0);
  const perWindow = clean.length ? clean.reduce((a, x) => a + x.onTarget, 0) / clean.length : 0;
  return { stats, clean: clean.length, perWindow };
}

const havocTarget: JobCheck = (ctx) => {
  const wins = havocWindows(ctx);
  if (wins.length === 0) return [];
  const { otherAlive } = raidTargets(ctx);
  const { stats, clean, perWindow } = havocStats(ctx, wins, otherAlive);
  if (clean < 2) return [];
  const forced = mergeWindows(ctx.forced);
  return stats.filter((x) => x.casts >= 3 && x.other && x.aimed / x.casts >= 0.6 && x.w.endMs <= ctx.endMs).map((x) => {
    const len = x.w.endMs - x.w.startMs;
    const unforced = len > 0 ? 1 - overlapMs(x.w.startMs, x.w.endMs, forced) / len : 0;
    const share = x.aimed / x.casts;
    const t = Math.round(x.w.startMs / 1000);
    return finding(ctx, {
      kind: "burst-window", startMs: x.w.startMs, endMs: x.w.endMs, forced: false,
      label: "Havoc on the main target", inference: true,
      lostDamage: share * perWindow * unforced,
      basis: `${x.aimed} of ${x.casts} single-target spells at the Havoc target while another enemy was up (${Math.round(share * 100)}%) × ${k(perWindow)} copied per Havoc on another enemy (${clean} windows)` +
        (unforced < 1 ? ` × ${Math.round(unforced * 100)}% of the window outside forced time` : ""),
      detail: `Havoc at ${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")} on ${x.w.target}, then ${x.aimed} of ${x.casts} spells went at it: nothing to copy them to`,
    });
  });
};

// ── Havoc held (havocHeld) ─────────────────────────────────────────────
// See the header. Held = ready (press + 30s) → next press, counted only
// while two enemies were taking raid hits (a second target to copy to),
// outside forced time and the fight's hold windows (one recharge of them),
// not in the pull's last HAVOC_TAIL_MS, past HAVOC_ALLOW_MS a cycle.
// Lost = held ÷ 30s × (copied per clean window − the press's GCD).
const HAVOC_CD_MS = 30_000;
const HAVOC_ALLOW_MS = 6_000;
const HAVOC_TAIL_MS = 10_000;
const HAVOC_MIN_PRESSES = 3;
const HAVOC_PREPULL_MS = 3_000;
const STEP_MS = 250;
const MIN_HELD_MS = 500;

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

const havocHeld: JobCheck = (ctx) => {
  const presses: number[] = [];
  for (const t of ctx.player.casts.filter((c) => !c.fake && c.abilityId === HAVOC && c.timestamp < ctx.endMs).map((c) => c.timestamp).sort((a, b) => a - b)) {
    if (presses.length && t - presses[presses.length - 1] < 100) continue;
    presses.push(t);
  }
  // Mayhem puts Havoc on enemies by itself: no presses, nothing to judge.
  if (presses.length < HAVOC_MIN_PRESSES) return [];
  const wins = havocWindows(ctx);
  // Pressed before the pull: the debuff is on an enemy at the start with no cast.
  if (wins.length && wins[0].startMs <= HAVOC_PREPULL_MS && wins[0].startMs < presses[0] - 1_000) presses.unshift(wins[0].startMs);
  const { otherAlive, twoAlive } = raidTargets(ctx);
  const { clean, perWindow } = havocStats(ctx, wins, otherAlive);
  if (clean < 2) return [];
  const gcd = ctx.values.gcdValue(undefined, false);
  const value = perWindow - gcd;
  if (!(value > 0)) return [];
  const perMs = value / HAVOC_CD_MS;
  const notCounted = mergeWindows([...ctx.forced, ...holdWindowsFor(ctx.context?.cooldownHoldWindows?.(ctx.pull), HAVOC_CD_MS)]);
  const lastUseful = ctx.endMs - HAVOC_TAIL_MS;
  const moments: Moment[] = [];
  let heldMs = 0;
  presses.forEach((prev, i) => {
    const ready = prev + HAVOC_CD_MS;
    const next = presses[i + 1];
    const until = Math.min(next ?? lastUseful, lastUseful);
    if (until <= ready) return;
    let open = 0;
    for (let t = ready; t < until; t += STEP_MS) if (!inAny(notCounted, t) && twoAlive(t)) open += Math.min(STEP_MS, until - t);
    const held = open - HAVOC_ALLOW_MS;
    if (held < MIN_HELD_MS) return;
    heldMs += held;
    moments.push({ startMs: ready, endMs: next ?? ctx.endMs, lostDamage: held * perMs,
      detail: `Havoc ready at ${clock(ready)}, ${next !== undefined ? `pressed at ${clock(next)}` : "not pressed again"}: ${s(held)} held with a second enemy up` });
  });
  if (moments.length === 0) return [];
  return [finding(ctx, {
    kind: "cooldown-drift", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Havoc held",
    lostDamage: heldMs * perMs,
    basis: `held time (past ${s(HAVOC_ALLOW_MS)} a cycle, with two enemies taking hits, outside forced time) ÷ ${s(HAVOC_CD_MS)} cooldown × (${k(perWindow)} copied per Havoc on another enemy, ${clean} windows, − ${k(gcd)} average GCD)`,
    detail: `Havoc sat ready ${s(heldMs)} past the allowance in ${moments.length} cycle${moments.length > 1 ? "s" : ""} while a second enemy was there to copy onto`,
    moments,
  })];
};

export const DESTRUCTION_CHECKS: JobCheck[] = [backdraft, havocTarget, havocHeld];
