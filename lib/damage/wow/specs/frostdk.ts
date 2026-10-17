// lib/damage/wow/specs/frostdk.ts
//
// Frost Death Knight's own checks and values, beside the shared ones
// melee.ts gives it (the Pillar of Frost window) and the tracked Pillar of
// Frost and Reaper's Mark drift in tracked-cooldowns.ts, Pillar valued
// here). Built in the WoWAnalyzer
// audit's phase 3 (docs/wowa-audit/deathknight-frost.md), every rule
// valued as damage lost. WoWAnalyzer's Frost is `lagging` (12.0.7 against
// a 12.1.0 clone), so its rules were checked against the log, not trusted.
// Measured 2026-10-17 on the 31 Frost DK player-pulls on disk, all Mythic:
// the top parses Winningdk (dG8D9y6WxrfmtgXp, Entombed Sentinels 99.6th),
// Vildk (tcdpmV7MBHK1jGYk, Vashnik 99.5th; NvX17Tb9yMY8QrDf, Entombed
// Sentinels 96.6th), 眼口补偿器 (78hvzrVRXKn6NYMa fight 23, Vashnik 100th,
// fetched for this pass, with 丨伏钥丶 beside him), Jiyeon
// (aZ6NnwL8g9PdpGJ1, 97.9th), 哈克克 (K4x8cMZYVpGCDbJH) and Сацкэх
// (Vr8dLPtFYWA4G1yg, 92.4th); the weaker Bingling (83.7th), 剑尖上独舞
// (82.5th), Arstok (74th), Macdéath (Ftj4vwHf9RazPcqV, 62nd), Quimidki
// (59th), Kãell (56th), Pinkmango and 风格狂 on Vashnik, and the static's
// Veinglas (16 pulls on seven bosses, gVDPhzp61Zm29HMw). Spell ids are from
// those logs' masterData.
//
// Talents (from casts, buffs and hits; CombatantInfo gives talent entry ids
// without names): all 31 play the same build. Deathbringer (Reaper's Mark
// with every Pillar, Exterminate's free Obliterates), Breath of Sindragosa
// (1249658, now a 60 Runic Power press every other Pillar, ~90s),
// Frostwyrm's Fury with Chosen of Frostbrood's second cast (1265384),
// Empower Rune Weapon on a short recharge (20–34 a pull, each granting a
// Killing Machine), Frostreaper (an Obliterate primes the next Frost Strike
// or Glacial Advance to grant Rime), Remorseless Winter as a passive (no
// presses), Killing Machine at two stacks, Frostscythe and Glacial Advance
// on cleave pulls. Nobody plays Rider of the Apocalypse or a two-handed
// build.
//
// ── Killing Machine lost (killingMachineLost) ──────────────────────────
// Killing Machine (51124, two stacks, 10s: procs.ts measured it) empowers
// the next Obliterate: with it 81–118k a press, without 22–44k (medians of
// each player's own presses: hits named Obliterate and Obliterate Off-Hand
// to the next press or 400ms; with = a KM removal 0–150ms after the press).
// So a lost proc costs that difference, ~55–75k, not a whole Obliterate as
// checkProcs priced it (and checkProcs priced it at the hits logged under
// the cast's own id, 0–63k: the "0k" Killing Machine expiries). This check
// replaces procs.ts's entry. Two ways to lose one:
// - it runs out: a removal with no Obliterate, Frostscythe or Exterminate
//   within 200ms, 9.4–11.5s after the last gain (every stack held goes);
// - Empower Rune Weapon (47568) pressed at two stacks. Every ERW grants a
//   Killing Machine (all 24 of Winningdk's, the same on every player), so
//   at the cap it's lost (logged as a refresh). Its gain can log a few ms
//   before the cast, so the stacks are read 150ms before it.
// Natural procs at the cap (melee crits) aren't counted: 20–82 a pull on
// everyone, the top players included (Winningdk 39, 眼口补偿器 60).
// Measured, lost a pull (ERW at the cap + expiries): top Jiyeon none,
// 哈克克 70k (1), Vildk 0–77k, Winningdk 68k, Сацкэх 61k, 眼口补偿器
// 137k (2); weaker Veinglas 58–665k (The Coiled Altar Pull 1: 8 ERWs at
// the cap, the first at 0:10; Ula'tek 537k), Pinkmango 459k (9), 风格狂
// 363k, Macdéath 257k, Kãell 186k, 剑尖上独舞 122k.
//
// ── Rime overwritten (rimeOverwritten) ─────────────────────────────────
// Rime (59052) makes the next Howling Blast free and worth 107–183k (the
// player's own presses that spent it, all hits to the next press or 1.5s)
// against 12–15k without. In this build Rime comes from Frost Strike or
// Glacial Advance pressed with Frostreaper up (57 of Winningdk's 60
// gains), so pressing one while Rime is held logs a "refreshed" Rime and
// loses the held proc: Howling Blast first would have kept both. Each
// gain matches one Howling Blast (Veinglas Vashnik Pull 1: 45 gains, 11
// overwritten, 36 Howling Blasts). Counted: a refresh beside (±150ms) a
// Frost Strike or Glacial Advance press, outside forced time. Lost: the
// player's Rime Howling Blast less their average GCD (the free GCD would
// have gone to something). Rime never runs out (0 of 1,347 gains on the
// samples), so it has no duration and no expiry check.
// Measured, all refreshes of all gains: top Jiyeon, Vildk, Сацкэх 0–2%,
// 哈克克 6%, Winningdk 7%; weaker Veinglas 6–24% (median 13%), Pinkmango
// 15%, 剑尖上独舞 13%, Kãell 11%. Lost a pull (only those beside a Frost
// Strike or Glacial Advance): top Jiyeon, 哈克克, Сацкэх none, Vildk 55k,
// 眼口补偿器 146k (2), Winningdk 246k (3 of 60); weaker Veinglas
// 110k–1.05M (Vashnik Pull 1: 11 of 45, the first at 0:15), Pinkmango
// 777k, 丨伏钥丶 485k, 剑尖上独舞 432k, Kãell 408k.
//
// ── Frostscythe on one enemy (frostscytheOneTarget) ────────────────────
// Frostscythe (207230) costs Obliterate's two runes and spends Killing
// Machine the same way. On one enemy it hits for 21–103k with Killing
// Machine (median ~42k) against the same player's Obliterate with it,
// 81–108k; on two it's about even (51–126k), and from three it wins
// (top players press it on 4–5 enemies: 眼口补偿器 26 presses, 25 on five).
// A press that hit at most one enemy (its hits to the next press or
// 500ms) lost the player's Obliterate (with or without Killing Machine, as
// the press was) less its own damage. Measured (lost a pull): top
// 眼口补偿器, Vildk, 哈克克 none (the Entombed Sentinels top players don't
// press it); 丨伏钥丶 37k. Weaker Macdéath 1.36M (Ftj4vwHf9RazPcqV, 26 of
// 74 presses on one enemy, from 0:27), 风格狂 582k (12 of 25), Veinglas
// 17–217k on 9 of 16 pulls, 剑尖上独舞 115k, Pinkmango 79k.
//
// ── Breath of Sindragosa / Frostwyrm's Fury held (heldPastPillar) ──────
// Both come back in 90s (shortest interval 90.2s and 90.1s, medians 96.3s
// and 96.2s, 16 players) and every player presses them with every other
// Pillar of Frost: Breath 0–5s after it, Frostwyrm's Fury 1–3s after
// Breath. Breath of Sindragosa (1249658, hits 155166) costs 60 Runic
// Power, but every player casts it at 61–100 while overflowing 10–27% of
// what they generate, so the recharge is its gate, not the resource; the
// Runic Power it drains from Frost Strikes in a window came to ~25–100
// (~0.05–0.24M), against 0.56–1.85M of its hits. Tracked at a flat 90s
// they flagged the top players (Winningdk 1.19M and 498k, Vildk 951k on
// Entombed Sentinels), who hold them up to ~30s for the next Pillar.
// Holding one for Pillar pays up to its break-even: Pillar's bonus on one
// use (pillarOfFrostValue's, capped at 30%) against a held second's share
// of a use, i.e. bonus × the 90s recharge (~18–27s). So each cycle runs
// from ready to the press, less that wait when it was pressed with the
// first Pillar after it came back (within WITH_PILLAR_MS), less forced
// time and the fight's hold windows (holdWindowsFor); past HOLD_ALLOW_MS,
// a held second costs 1/90 of a use (Breath's hits; Fury's less the
// player's average GCD, it takes one). Measured (lost a pull): top 0–19k
// (Vildk NvX17Tb9yMY8QrDf 18k + 4k, Сацкэх 19k, Winningdk 8k, 眼口补偿器,
// 哈克克 none); weaker Veinglas 0–990k (Nek'zali Pull 2: the Pillar at
// 3:09 went without Breath, ready since 3:09, pressed at 4:31 with the
// next: 692k + 298k), Kãell 209k (Frostwyrm's Fury 4:50 → 5:19), 风格狂
// 200k, Macdéath 72k.
//
// ── Pillar of Frost's value (pillarOfFrostValue) ───────────────────────
// The tracked Pillar of Frost drift (tracked-cooldowns.ts) had no value:
// Pillar deals nothing itself, so a lost use read 0 and never showed. A
// use is now what its window added to the player's hits: per ability, the
// median non-crit hit inside ÷ outside the window, weighted by hits
// inside, capped at 30% (Breath, Reaper's Mark and the opener line up
// with it, so the raw ratio reads ×1.2–1.5), × the damage done inside each
// window. Reaper's Mark is pressed in the same instant on every pull, so
// its drift fires with Pillar's (its hits now counted under all three ids:
// 439843, 436304, 439594; 223–683k a use). Measured: no top player loses
// a use; 风格狂 (9rGDw4WB3bv6VmnK) 1.08M + 1.60M (Pillar held 136s in all,
// 3 uses), Veinglas The Coiled Altar Pull 1.95M + 563k (one use, from
// 2:31), no other pull.
//
// ── Runic Power at the cap: dropped for Frost (melee.ts) ───────────────
// The shared check read 0.08–2.49M a pull on the top players (Vildk
// Vashnik 2.01M, 哈克克 1.61M) as on the weaker (Veinglas 0.1–1.41M). It
// prices casts made at full Runic Power by a gain measured from the next
// cast's snapshot with zero gains dropped, and almost all it found were
// casts that generate none (zeros kept, bracketed within 1.2s outside
// Breath: Empower Rune Weapon 0 of 25, Pillar of Frost 0 of 28,
// Exterminate 0 of 69); the real generators (Obliterate and Frostscythe
// ~20, Reaper's Mark ~20, Howling Blast ~11) log runes, not Runic Power,
// on their casts. And it priced a unit at every RP spender's damage over
// the RP logged as spent, so Breath's hits over its 60-RP cost made a unit
// worth 4k instead of Frost Strike's 1.6–2.2k. Rebuilt properly (each
// generator's overflow from the snapshot before it, at Frost Strike's
// value), it reads 10–27% of generation on all 31 player-pulls: top 14–20%
// (Winningdk 18%, Vildk 20%, Jiyeon 15%, 眼口补偿器 16%), weaker 10–27%
// (Veinglas 10–22%, Bingling 27%). WoWAnalyzer's own guide calls this
// waste fine when the GCD goes to a rune spender: the spec is GCD-bound,
// so the overflowed RP had no GCD to become a Frost Strike in.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { JobCheck, Moment } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { holdWindowsFor, inWindows, mergeWindows, overlapMs } from "../../timeline";
import { k, s } from "./shared";

const PILLAR = 51271;
const OBLITERATE = 49020;
const FROSTSCYTHE = 207230;
const EXTERMINATE = [441424, 441426];
const ERW = 47568;
const KILLING_MACHINE = 51124;
const RIME = 59052;
const HOWLING_BLAST = 49184;
const FROST_STRIKE = 49143;
const GLACIAL_ADVANCE = 194913;
const BREATH = 1249658;
const BREATH_HIT = 155166;
const FROSTWYRMS_FURY = 279302;     // the press; Chosen of Frostbrood's free second cast is 1265384
const FROSTWYRMS_FURY_HIT = 279303; // both casts' hits
const OBLITERATE_HITS = new Set(["Obliterate", "Obliterate Off-Hand"]);
const KM_CONSUMERS = new Set([OBLITERATE, FROSTSCYTHE, ...EXTERMINATE]);

const KM_MS = 10_000;          // procs.ts
const KM_MAX = 2;
const KM_RATIO = 3.2;          // Obliterate with ÷ without, median of 31 player-pulls (fallback)
const BESIDE_MS = 150;
const CONSUME_MS = 200;
const PRESS_HIT_MS = 400;
const SCYTHE_HIT_MS = 500;
const HB_HIT_MS = 1_500;
const MIN_SHARE = 0.8;
const BONUS_CAP = 0.3;
const ALIGNED_CD_MS = 90_000;  // Breath of Sindragosa, Frostwyrm's Fury (shortest 90.2s / 90.1s on 16 players)
const FIRST_USE_MS = 3_000;
const HOLD_ALLOW_MS = 2_000;
const MIN_HELD_MS = 250;
const WITH_PILLAR_MS = 6_000;  // Breath lands 0–5s after its Pillar (Veinglas Nek'zali Pull 2 1:34.5, 4.8s), Fury 1–3s after Breath
const END_MARGIN_MS = 3_000;

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : NaN);

/** One press per spell per instant, before the pull's end. */
function presses(ctx: PlayerCheckContext, id: number): number[] {
  const out: number[] = [];
  for (const t of ctx.player.casts.filter((c) => !c.fake && c.abilityId === id && c.timestamp < ctx.endMs).map((c) => c.timestamp).sort((a, b) => a - b)) {
    if (out.length && t - out[out.length - 1] < 100) continue;
    out.push(t);
  }
  return out;
}

const kmEvents = (player: PlayerInfo) =>
  (player.buffs ?? []).filter((b) => b.abilityId === KILLING_MACHINE).sort((a, b) => a.timestamp - b.timestamp);

/** Whether a Killing Machine was spent by a press at t (a removal 0–150ms after it). */
const spentKm = (km: ReturnType<typeof kmEvents>, t: number) =>
  km.some((b) => (b.buffStatus === "removed" || b.buffStatus === "stackRemoved") && b.timestamp >= t - 20 && b.timestamp <= t + BESIDE_MS);

type Oblit = { withKm: number; withoutKm: number; basis: string };

/** The player's Obliterate with and without Killing Machine (averages of their own presses). */
function obliterateValues(ctx: PlayerCheckContext): Oblit | undefined {
  const obs = presses(ctx, OBLITERATE);
  if (obs.length < 10) return undefined;
  const km = kmEvents(ctx.player);
  const hits = ctx.player.damageDone.filter((h) => !h.pet && OBLITERATE_HITS.has(h.abilityName));
  const w: number[] = [], wo: number[] = [];
  obs.forEach((t, i) => {
    const d = hits.filter((h) => h.timestamp >= t && h.timestamp < Math.min(obs[i + 1] ?? Infinity, t + PRESS_HIT_MS)).reduce((a, h) => a + (h.amount ?? 0), 0);
    (spentKm(km, t) ? w : wo).push(d);
  });
  if (w.length < 5) return undefined;
  const withKm = avg(w);
  const own = wo.length >= 3;
  const withoutKm = own ? avg(wo) : withKm / KM_RATIO;
  return {
    withKm, withoutKm,
    basis: `${k(withKm)} Obliterate with Killing Machine − ${k(withoutKm)} without` +
      (own ? ` (the player's own, ${w.length} and ${wo.length} presses)` : ` (${KM_RATIO}× less, the samples' ratio: only ${wo.length} without)`),
  };
}

// ── Killing Machine lost ───────────────────────────────────────────────

const killingMachineLost: JobCheck = (ctx) => {
  const km = kmEvents(ctx.player);
  if (km.length < 10) return [];
  const ob = obliterateValues(ctx);
  if (!ob) return [];
  const per = ob.withKm - ob.withoutKm;
  if (!(per > 0)) return [];
  const forced = mergeWindows(ctx.forced);
  const casts = ctx.player.casts.filter((c) => !c.fake);
  const gainBeside = (t: number) => km.some((b) => (b.buffStatus === "applied" || b.buffStatus === "stack") && Math.abs(b.timestamp - t) <= BESIDE_MS);

  // Stacks after each event; a "refreshed" logged with a stackRemoved is the spend's, not a gain.
  const states: { t: number; n: number }[] = [];
  const moments: Moment[] = [];
  let n = 0, lastGain = -Infinity, expired = 0;
  for (const b of km) {
    const paired = km.some((x) => x !== b && x.buffStatus === "stackRemoved" && Math.abs(x.timestamp - b.timestamp) <= 5);
    if (b.buffStatus === "applied") { n = 1; lastGain = b.timestamp; }
    else if (b.buffStatus === "stack") { n = Math.min(KM_MAX, n + 1); lastGain = b.timestamp; }
    else if (b.buffStatus === "refreshed" && !paired) lastGain = b.timestamp;
    else if (b.buffStatus === "stackRemoved") n = Math.max(0, n - 1);
    else if (b.buffStatus === "removed") {
      const used = casts.some((c) => KM_CONSUMERS.has(c.abilityId) && Math.abs(c.timestamp - b.timestamp) <= CONSUME_MS);
      const since = b.timestamp - lastGain;
      if (!used && since >= KM_MS - 600 && since <= KM_MS + 1_500 && b.timestamp < ctx.endMs && !inWindows(b.timestamp, forced)) {
        const lost = Math.max(1, n);
        expired += lost;
        moments.push({ startMs: lastGain, endMs: b.timestamp, lostDamage: lost * per,
          detail: `Killing Machine ran out at ${clock(b.timestamp)}${lost > 1 ? ` with ${lost} stacks` : ""}` });
      }
      n = 0;
    }
    states.push({ t: b.timestamp, n });
  }
  const stacksAt = (t: number) => { let v = 0; for (const s of states) { if (s.t >= t) break; v = s.n; } return v; };

  // Empower Rune Weapon pressed at the cap: only for a player whose ERW grants Killing Machine.
  const erw = presses(ctx, ERW);
  const grants = erw.filter((t) => km.some((b) => b.buffStatus !== "removed" && b.buffStatus !== "stackRemoved" && Math.abs(b.timestamp - t) <= BESIDE_MS)).length;
  let atCap = 0;
  if (erw.length >= 3 && grants >= erw.length * MIN_SHARE) {
    for (const t of erw) {
      if (inWindows(t, forced) || stacksAt(t - BESIDE_MS) < KM_MAX || gainBeside(t)) continue;
      atCap++;
      moments.push({ startMs: t, endMs: t, lostDamage: per,
        detail: `Empower Rune Weapon at ${clock(t)} with two Killing Machines held: its Killing Machine was lost` });
    }
  }
  if (moments.length === 0) return [];
  moments.sort((a, b) => a.startMs - b.startMs);
  const lostN = expired + atCap;
  return [finding(ctx, {
    kind: "proc-lost", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Killing Machine lost",
    lostDamage: lostN * per,
    basis: `${lostN} × (${ob.basis})`,
    detail: [atCap ? `${atCap} Empower Rune Weapon${atCap > 1 ? "s" : ""} pressed with two Killing Machines held (each grants one)` : "",
      expired ? `${expired} Killing Machine${expired > 1 ? "s" : ""} ran out unused` : ""].filter(Boolean).join("; "),
    moments,
  })];
};

// ── Rime overwritten ───────────────────────────────────────────────────

const rimeOverwritten: JobCheck = (ctx) => {
  const rime = (ctx.player.buffs ?? []).filter((b) => b.abilityId === RIME).sort((a, b) => a.timestamp - b.timestamp);
  if (rime.length < 10) return [];
  // The player's Rime Howling Blast: presses that spent it (a removal beside), all hits to the next press or 1.5s.
  const hbs = presses(ctx, HOWLING_BLAST);
  const hits = ctx.player.damageDone.filter((h) => !h.pet && h.abilityName === "Howling Blast");
  const withRime = hbs.map((t, i) => ({ t, i })).filter(({ t }) => rime.some((b) => b.buffStatus === "removed" && Math.abs(b.timestamp - t) <= BESIDE_MS))
    .map(({ t, i }) => hits.filter((h) => h.timestamp >= t && h.timestamp < Math.min(hbs[i + 1] ?? Infinity, t + HB_HIT_MS)).reduce((a, h) => a + (h.amount ?? 0), 0));
  if (withRime.length < 5) return [];
  const hb = avg(withRime);
  const gcd = ctx.values.gcdValue(undefined, false);
  const per = hb - gcd;
  if (!(per > 0)) return [];
  const forced = mergeWindows(ctx.forced);
  const spenders = ctx.player.casts.filter((c) => !c.fake && (c.abilityId === FROST_STRIKE || c.abilityId === GLACIAL_ADVANCE));
  const moments: Moment[] = [];
  for (const b of rime) {
    if (b.buffStatus !== "refreshed" || b.timestamp >= ctx.endMs || inWindows(b.timestamp, forced)) continue;
    const by = spenders.find((c) => Math.abs(c.timestamp - b.timestamp) <= BESIDE_MS);
    if (!by) continue;
    moments.push({ startMs: b.timestamp, endMs: b.timestamp, lostDamage: per,
      detail: `${by.abilityName} at ${clock(by.timestamp)} with Rime held: the new Rime was lost (Howling Blast first keeps both)` });
  }
  if (moments.length === 0) return [];
  const gains = rime.filter((b) => b.buffStatus === "applied" || b.buffStatus === "refreshed").length;
  return [finding(ctx, {
    kind: "proc-lost", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Rime overwritten",
    lostDamage: moments.length * per,
    basis: `${moments.length} × (${k(hb)} the player's Rime Howling Blast − ${k(gcd)} their average GCD, which the free GCD would have gone to)`,
    detail: `${moments.length} of ${gains} Rimes overwritten by a Frost Strike or Glacial Advance pressed while one was held`,
    moments,
  })];
};

// ── Frostscythe on one enemy ───────────────────────────────────────────

const frostscytheOneTarget: JobCheck = (ctx) => {
  const fsc = presses(ctx, FROSTSCYTHE);
  if (fsc.length === 0) return [];
  const ob = obliterateValues(ctx);
  if (!ob) return [];
  const km = kmEvents(ctx.player);
  const forced = mergeWindows(ctx.forced);
  const hits = ctx.player.damageDone.filter((h) => !h.pet && h.abilityId === FROSTSCYTHE);
  const moments: Moment[] = [];
  fsc.forEach((t, i) => {
    if (inWindows(t, forced)) return;
    const mine = hits.filter((h) => h.timestamp >= t && h.timestamp < Math.min(fsc[i + 1] ?? Infinity, t + SCYTHE_HIT_MS));
    const enemies = new Set(mine.map((h) => `${h.targetActorId ?? h.target}.${h.targetInstance ?? 1}`)).size;
    if (enemies > 1) return;
    const dmg = mine.reduce((a, h) => a + (h.amount ?? 0), 0);
    const withKm = spentKm(km, t);
    const instead = withKm ? ob.withKm : ob.withoutKm;
    const lost = instead - dmg;
    if (lost <= 0) return;
    moments.push({ startMs: t, endMs: t, lostDamage: lost,
      detail: `Frostscythe at ${clock(t)} hit ${enemies === 0 ? "nothing" : "one enemy"} for ${k(dmg)}${withKm ? " with Killing Machine" : ""}; an Obliterate does ${k(instead)}` });
  });
  if (moments.length === 0) return [];
  return [finding(ctx, {
    kind: "aoe-single", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Frostscythe on one enemy",
    lostDamage: moments.reduce((a, m) => a + (m.lostDamage ?? 0), 0),
    basis: `each press's own hits against the player's Obliterate in its place (${ob.basis}): it costs the same two runes and spends Killing Machine the same way`,
    detail: `${moments.length} of ${fsc.length} Frostscythes hit one enemy or none`,
    moments,
  })];
};

// ── Breath of Sindragosa / Frostwyrm's Fury held (pillarAlignedHeld) ───

type Aligned = { name: string; id: number; hitIds: number[]; onGcd: boolean };

const heldPastPillar = (spec: Aligned): JobCheck => (ctx) => {
  const uses = presses(ctx, spec.id);
  if (uses.length < 2) return [];
  const hitIds = new Set(spec.hitIds);
  const dmg = ctx.player.damageDone.filter((h) => !h.pet && hitIds.has(h.abilityId) && h.timestamp < ctx.endMs).reduce((a, h) => a + (h.amount ?? 0), 0);
  const perUse = dmg / uses.length - (spec.onGcd ? ctx.values.gcdValue(undefined, false) : 0);
  if (!(perUse > 0)) return [];
  const pillar = pillarOfFrostValue(ctx.player, ctx.endMs);
  const bonus = pillar?.bonus ?? 0;
  // Waiting for the next Pillar pays while it's worth Pillar's bonus on one use: bonus × the recharge.
  const graceMs = bonus * ALIGNED_CD_MS;
  const pillars = presses(ctx, PILLAR);
  const holds = holdWindowsFor(ctx.context?.cooldownHoldWindows?.(ctx.pull), ALIGNED_CD_MS);
  const notHeld = mergeWindows([...ctx.forced, ...holds]);
  const moments: Moment[] = [];
  let heldMs = 0, excusedMs = 0;
  const cycles = uses.map((t, i) => ({ ready: t + ALIGNED_CD_MS, cast: uses[i + 1] ?? ctx.endMs }))
    .filter((c) => c.ready < ctx.endMs - END_MARGIN_MS);
  if (uses[0] > FIRST_USE_MS) cycles.unshift({ ready: FIRST_USE_MS, cast: uses[0] });
  for (const c of cycles) {
    if (c.cast - c.ready <= HOLD_ALLOW_MS) continue;
    // Pressed with the first Pillar after it came back: the wait for that Pillar is excused up to the grace.
    const p = pillars.find((t) => t >= c.ready - HOLD_ALLOW_MS);
    const withPillar = p !== undefined && Math.abs(c.cast - p) <= WITH_PILLAR_MS;
    const excused = withPillar ? Math.min(Math.max(0, p! - c.ready), graceMs) : 0;
    const from = c.ready + excused;
    const span = Math.max(0, c.cast - from - overlapMs(from, c.cast, notHeld));
    const held = span - HOLD_ALLOW_MS;
    excusedMs += excused;
    if (held < MIN_HELD_MS) continue;
    heldMs += held;
    const lost = held / ALIGNED_CD_MS * perUse;
    moments.push({ startMs: c.ready, endMs: c.cast, lostDamage: lost,
      detail: `${spec.name} ready at ${clock(c.ready)}, ${c.cast >= ctx.endMs ? "not pressed again" : `pressed at ${clock(c.cast)}`}: ${s(held)} held` +
        (excused > 0 ? ` (${s(excused)} waiting for the Pillar at ${clock(p!)} excused)` : withPillar ? "" : p !== undefined && p < c.cast - WITH_PILLAR_MS ? ` (the Pillar at ${clock(p)} went without it)` : "") });
  }
  if (moments.length === 0) return [];
  return [finding(ctx, {
    kind: "cooldown-drift", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: `${spec.name} held`,
    lostDamage: moments.reduce((a, m) => a + (m.lostDamage ?? 0), 0),
    basis: `held time (past ${s(HOLD_ALLOW_MS)} a cycle, outside forced time and the fight's hold windows) ÷ ${s(ALIGNED_CD_MS)} recharge × ${k(perUse)} a use` +
      (spec.onGcd ? " (its hits less the player's average GCD)" : " (its hits)") +
      (graceMs > 0 ? `; waiting for the next Pillar of Frost excused up to ${s(graceMs)} (Pillar's +${Math.round(bonus * 100)}% × the recharge)` : ""),
    detail: `${spec.name} sat ready ${s(heldMs)} past the allowance in ${moments.length} cycle${moments.length > 1 ? "s" : ""}` +
      (excusedMs > 0 ? `; ${s(excusedMs)} more waiting for a Pillar excused` : ""),
    moments,
  })];
};

// ── Pillar of Frost's value per use (tracked-cooldowns.ts) ─────────────

/** One Pillar of Frost's worth: what its window added to the player's hits, per window. */
export function pillarOfFrostValue(player: PlayerInfo, endMs: number): { value: number; basis: string; bonus: number } | undefined {
  const ws: { startMs: number; endMs: number }[] = [];
  let st: number | undefined;
  for (const b of (player.buffs ?? []).filter((b) => b.abilityId === PILLAR).sort((a, b) => a.timestamp - b.timestamp)) {
    if (b.buffStatus === "applied" && st === undefined) st = b.timestamp;
    else if (b.buffStatus === "removed" && st !== undefined) { ws.push({ startMs: st, endMs: b.timestamp }); st = undefined; }
  }
  if (st !== undefined) ws.push({ startMs: st, endMs });
  const wins = ws.filter((w) => w.startMs < endMs);
  if (wins.length === 0) return undefined;
  const inside = (t: number) => wins.some((w) => t >= w.startMs && t <= w.endMs);
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
  const each = dmg / wins.length;
  return {
    value: each * bonus / (1 + bonus), bonus,
    basis: `${k(each * bonus / (1 + bonus))} that an average Pillar of Frost added (${k(each)} done inside each of ${wins.length} windows, ` +
      `+${Math.round(bonus * 100)}% read from the player's own hits, capped at ${BONUS_CAP * 100}%)`,
  };
}

export const FROST_DK_CHECKS: JobCheck[] = [
  killingMachineLost, rimeOverwritten, frostscytheOneTarget,
  heldPastPillar({ name: "Breath of Sindragosa", id: BREATH, hitIds: [BREATH_HIT], onGcd: false }),
  heldPastPillar({ name: "Frostwyrm's Fury", id: FROSTWYRMS_FURY, hitIds: [FROSTWYRMS_FURY_HIT], onGcd: true }),
];
