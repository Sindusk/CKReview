// lib/damage/ffxiv/jobs/ranged.ts
//
// Physical ranged checks (ranged batch). The batch's other half is in the
// engine: the rDPS split and buff coverage (lib/damage/buffs.ts), which
// every buffer gets. Ported from xivanalysis
// src/parser/jobs/<job>/modules/:
//
// Dancer (verified on dQ8wmb1VhKt6yBXk), Technicalities.tsx: inside each
// Technical Finish window
//   - Dance of the Dawn, Finishing Move, Starfall Dance and Tillana once
//     each, and four Last Dance / Saber Dance (three when the window has
//     no filler: out of Esprit, one Fountainfall is allowed). A missing
//     one is its average minus the GCD used instead.
//   - one Fan Dance IV, valued at its average × 5% (used outside instead).
//   - no combo or proc fillers (Cascade, Fountain, Reverse Cascade,
//     Windmill, Bladeshower, Rising Windmill; Fountainfall and Bloodshower
//     are allowed, as in xivanalysis): each one beyond the Saber shortfall
//     is the player's average Saber Dance minus the filler's own average.
//   Checked against xivanalysis on qjCMx4bRfgNKwX9T Dancing Mad kill
//   (fight 1, 7.5, 2026-10-13). Until then Fountainfall counted as a filler and
//   four Sabers were always expected, so 0:02, 4:03, 8:03 and 10:03 each
//   read as a missing Saber plus a Fountainfall filler (78k each) where
//   xivanalysis has 3/3; and a filler in a missing Saber's slot was
//   charged twice (6:03). Now its 2/4 and 2/3 windows match. Its 9 broken
//   combos match by time, as do the dropped (12:27) and overwritten
//   (15:59) Symmetry. Not adopted: Standard Step 35/37 (the drift
//   simulation has room for 34); the 0-step Standard Finish at 11:50 and
//   the late Devilment at 14:07 (both in forced stretches, the end-of-P3
//   hold and past P4's check); Esprit and feathers (gauge, not logged).
//   Proc overwrites (xivanalysis Procs.tsx, checked on jN3XDrf2z8PmLgRJ
//   Vamp pull 8): a Silken / Flourishing Symmetry or Flow, Threefold or
//   Fourfold Fan Dance "refreshed" within 600ms of one of the Dancer's casts
//   is a proc that rolled while one was held: one lost. The refresh can
//   log 0.3s after the cast (Fan Dance at 4:15). Fan Dance III / IV are
//   oGCDs, lost outright at their average; a Symmetry or Flow is its
//   consumer's average minus the GCD used instead (inference). Last Dance
//   Ready also logs a "refreshed" 2s after every Finishing Move with no
//   cast near it: a log artifact, not an overwrite, so it isn't tracked.
//   Feathers and Esprit (user, 2026-10-14): simulated as xivanalysis does
//   (jobs/gauges.ts), drawn on the timeline, and their overcap named as
//   "gauge-estimate" findings with no loss: the log shows neither gauge
//   and generation is random. Same for feathers not pooled for Technical
//   Finish (unpooledFeathers).
//   Rechecked on K6qfMamL7rN8yz2Q Vamp Fatale (7.4, 2026-10-14). Matched:
//   every Technical window full; dropped Silken Flow (4:29) and Silken
//   Symmetry (8:30); the Cascade combo run out at 8:29; 1 feather and 1
//   Saber Dance "may have been lost" (the estimates give 1 and 1); the
//   6:08 window not pooled. Its GCD downtime matches ours by time (3:58
//   1.44s our 1.3s; 2:14, 5:20, 6:40 small delays; 5:46, 7:56, 7:59 have
//   movement for the saws and Undead Deathmatch in them). Ours adds 2:00
//   (2.1s after Fountain): Coffinmaker died at 1:58.7, the boss was hit
//   from 2:00.3 and everyone else attacked by 2:01, the Dancer's next GCD
//   was Technical Step at 2:02.7; xivanalysis counts that stretch as
//   downtime. Not adopted: Curing Waltz uses (healing).
//   Rechecked on the same report's Red Hot and Deep Blue kill (Pull 2,
//   2026-10-14), nothing to build. Matched: GCD uptime 98.3%, every
//   Technical window full (8:38 5/5 before the kill), the 0:54 triple
//   weave (2.0s, 31k), the 1:59 gap (1.4s, 21k), Threefold Fan Dance
//   overwritten at 8:49 (36k), 2 feathers and 2-3 Saber Dances "may have
//   been lost" (estimates, not valued). Fixed on the app's side: its
//   tincture finding 8:35 → 6:31 "11s more raid buffs" (16k) came from
//   the kill cutting the 8:35 tincture at 16s; a cut tincture is now
//   compared over the same length (tincture.ts). Not adopted: Shield
//   Samba, Curing Waltz, Second Wind.
//   Rechecked on the same report's The Tyrant kill (Pull 2, 2026-10-15),
//   nothing to build. Matched: cooldowns and Standard Finish 100%, every
//   Technical window full, 4 Saber Dances / 1 feather "may have been
//   lost" and the 6:11 window not pooled (estimates, not valued), Silken
//   Flow dropped 8:30.8, the 6:00 Cascade run out, its GCD downtimes by
//   time (6:03, 6:30, 7:02, 7:39 are Flatliner movement). The 8:09 hold
//   (1.8s after Emboite, Quadruple Technical Finish at 8:11.06, 76k) is
//   in both; ours adds 10:10 (1.2s after Entrechat, 16k). Both Finishes
//   land with the Divinations (8:11.2, 10:11.9). Built (user: judge it by
//   whether holding did more damage): dncTechHoldValue below — 8:09 now
//   9k, 10:10 no finding (the hold paid off). Not adopted:
//   Shield Samba, Improvisation, Curing Waltz, Second Wind.
//   AoE on one target (AoEUsages.ts, 2026-10-15): Windmill, Rising
//   Windmill and Bloodshower against Cascade, Reverse Cascade and
//   Fountainfall. Seen firing, not yet matched against an xivanalysis
//   page: Windmill at jN3XDrf2z8PmLgRJ Red Hot and Deep Blue pull 34 3:59
//   and Bloodshower at bVDR2mTL7YGvMxK1 pull 1 5:18 (the bosses apart,
//   both targetable; 11-12k each); Windmill at d3vRbwfpNBLzJ2Xh pull 2
//   2:42 (Red Hot left as it landed, 11k) and pG319BgHTnPJc6Ft Necron
//   pull 2 3:53 (one Icy Hand, 8k); Rising Windmill at Necron pull 7 2:24
//   and fJxTNgwtRKjYbvZp 7:32.
//   Dances (DirtyDancing.tsx, 2026-10-15): short finishes and wrong steps,
//   `dancerDances` below. Found by searching the lowest Red Hot and Deep
//   Blue rankings; matched against xivanalysis on five of those kills
//   (2026-10-15). It counts a wrong step only past the dance's full step
//   count; the app counts any press the finish didn't use
//   (9zQqtBRL41XhADxG 9:06: 4 presses for a 3-step finish).
//   Devilment outside Technical Finish (Technicalities.tsx "bad
//   Devilments", 2026-10-16): `devilmentMisaligned` below. Not matched
//   against a page yet. Not adopted: Flourishing Starfall / Finish
//   overwrites (both last under their 120s source's cooldown: never
//   refreshed on 442 pulls), Closed Position uptime (never down past a
//   2s partner swap).
// Bard: Caustic Bite / Stormbite (below), Hawk's Eye overwrites, AoE on
//   one target, the burst window, cooldowns (OGCDDowntime.ts).
//   Rechecked on dDar482XvFKBPJYh FRU kill (7.1, 2026-10-12): its 17
//   Hawk's Eye overwrites match by time; Empyreal Arrow 55/59 is 3 by
//   drift; Battle Voice / Radiant Finale / Raging Strikes / Barrage 9/10
//   were ready just before P4's downtime and held for the 14:17 burst;
//   its DoT clipping (1:05 a minute) is Iron Jaws snapshots again; its
//   Army's Muse "4/5 GCDs" is a fifth GCD at the window's edge, the real
//   cost being the weave delays in it (Army's Muse is a haste window now).
//   Checked against xivanalysis on 2T1HzdPKgbhM43am Dancing Mad fight 10
//   (2026-10-09): 4 overwrites, 2 AoE and the window's missing actions
//   match (all its window misses were in forced time). Its DoT clipping
//   (1:06 a minute) is standard Iron Jaws play, not a loss.
//   Rechecked on qjCMx4bRfgNKwX9T fight 16 (7.5, 2026-10-13): its 18
//   burst GCDs and every missed window action (Iron Jaws ×4, Barrage,
//   Resonant ×3, Blast Arrow, Sidewinder, Heartbreak ×2) match window by
//   window; 6:07, 12:08 and 14:08 are forced. Its 15 Hawk's Eye overwrites
//   match by time (3:28 forced). Built: Rain of Death on one target (8:55,
//   hit only Exdeath; oGCD AoEs are now checked, hits matched by their
//   measured delay). Empyreal Arrow 67/69 (31.7s held) was hidden by the
//   drift cap; 1 lost since 2026-10-16 (checks.ts room). Not adopted: DoT
//   clipping 37s a minute (P3's two bosses plus Iron Jaws snapshots);
//   DoTs before invulnerability (3:04 and 11:46 are dot-clip findings,
//   5:40 ticked to 6:15); Army's Muse 3/5 and 4/5 (the burst windows'
//   GCD counts already hold them).
//   6XaWqwMbkZG9pLmx Vamp Fatale (7.4, user, 2026-10-13): after both DoTs
//   lapse (Coffinmaker's death at 1:58) one goes on a GCD after the other,
//   in either order; Stormbite's 5.0s gap read as lost. Now each DoT's
//   uptime grace adds a GCD when the other was applied first (pairedIds).
// Machinist (checked against xivanalysis on three pages, 2026-10-15:
//   Brk8fQGnhJaxFKvb fight 12, jN3XDrf2z8PmLgRJ fight 21,
//   L9BzKkD2nxcVgHTC fight 20; Wildfire, Heat, Battery, Reassemble and
//   combos all matched): Wildfire weaponskills landed (Wildfire.tsx);
//   Hypercharge (Overheated), 5 Heat Blasts / Blazing Shots / Auto
//   Crossbows (Hypercharge.tsx), each missing one its average; cooldowns
//   (GeneralCDDowntime.tsx). Double Check / Checkmate are left out:
//   Heat Blast refunds their cooldown, which the drift check doesn't model.
//   Heat / Battery overcap (Gauge.tsx, `mchGauges`) and Reassemble on a
//   weak GCD (Reassemble.tsx, `reassemble`), 2026-10-15, below. Not
//   adopted: a Queen without Crowned Collider (YassQueen.tsx), which six
//   Red Hot and Deep Blue Machinists miss on the same 1:12-1:18 Queen, the
//   top parse included.
//   AoE on too few targets (MultiHitSkills.ts, 2026-10-15): Bioblaster
//   under 3 against Drill (its DoT ticks count toward what it dealt),
//   Auto Crossbow and Scattergun under 4 against Blazing Shot and the
//   Heated combo. Seen firing, not matched against xivanalysis:
//   jN3XDrf2z8PmLgRJ Vamp Fatale pulls 9 and 12, Bioblaster on the boss
//   after the adds died (5:25, 39k; 5:10, 33k); Scattergun and Auto
//   Crossbow on the adds pass when they hit 3 (more than the single-target
//   average) and flag on 2 (5:00, 11k; 5:04, 1k). Checked against
//   xivanalysis on pull 12: Bioblaster 1 matches. Not adopted: its 5 Auto
//   Crossbows on two targets (31-51k each against Blazing Shot's ~36k,
//   about even; only 5:04 fell short) and the 5:18 Scattergun on three
//   (40k against the combo's ~34k). Its minimum of 4 outruns the damage.
//   djChYqt4b7K8aAfP's Red Hot and Deep Blue kill: Bioblaster on both
//   bosses at 8:48 (27k).
//
//   Copyright (c) 2018 Saxon Landers & contributors
//   MIT License; full text in THIRD_PARTY_NOTICES.md.

import { XIVA_ACTIONS as A, XIVA_STATUSES as S } from "../xiva-data";
import type { PlayerEvent, PlayerInfo } from "@/types/PlayerInfo";
import type { DamageFinding, GaugeTrack, JobCheck } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { aoeComboOnOneTarget, baseValue, burstWindowFindings, clock, critMultOf, dotFindings, fromLevel, gaugeFindings, k, rollGainOf, s, statusWindows, type ExpectedAction, type GaugeEvent, type GaugeSpec } from "./shared";
import { comboLanded } from "./gnb";
import { forcedPart, inWindows, mergeWindows } from "../../timeline";
import { espritGauge, featherGauge } from "./gauges";
import { estimateHitRates } from "../../crit-rates";

const ids = (...keys: string[]) => keys.filter((key) => A[key]).map((key) => A[key].id);
const replacedGcd = (...keys: string[]) => (ctx: PlayerCheckContext) =>
  Math.max(0, Math.max(...ids(...keys).map((x) => ctx.values.perUse(x))) - ctx.values.gcdValue(undefined, false));

// ── Dancer ─────────────────────────────────────────────────────────────

const TECH_EXPECTED: [string, number][] = [
  ["DANCE_OF_THE_DAWN", 1], ["FINISHING_MOVE", 1], ["STARFALL_DANCE", 1], ["TILLANA", 1],
];
// xivanalysis's BAD_TECHNICAL_GCDS: Fountainfall and Bloodshower aren't
// in it (fine when out of Esprit).
const TECH_FILLERS = ["CASCADE", "REVERSE_CASCADE", "FOUNTAIN", "WINDMILL", "RISING_WINDMILL", "BLADESHOWER"];
const SABERS = ["LAST_DANCE", "SABER_DANCE"];
const SABERS_EXPECTED = 4;

// xivanalysis adjustExpectedCounts: a window with no filler GCD in it
// likely ran out of Esprit, so it is allowed one Fountainfall in place of
// the fourth Saber Dance. qjCMx4bRfgNKwX9T kill: 0:02, 4:03, 8:03, 10:03
// each had 3 Sabers and a Fountainfall (its 3/3).
const sabersExpected = (casts: PlayerEvent[]) => {
  const fillers = new Set(ids(...TECH_FILLERS)), sabers = new Set(ids(...SABERS));
  const got = casts.filter((c) => sabers.has(c.abilityId)).length;
  return got < SABERS_EXPECTED && !casts.some((c) => fillers.has(c.abilityId)) ? SABERS_EXPECTED - 1 : SABERS_EXPECTED;
};

// A window whose 20s runs past the end of the pull was cut by the kill (or
// a wipe) and is skipped. vVPtwaTQ62Jg391q Vamp Fatale kill: the 8:11
// Technical Finish, ended by the kill at 8:23, read as 5/8 with Starfall
// Dance and Tillana missing (242k).
const TECH_SPAN_MS = S.TECHNICAL_FINISH.duration ?? 20_000;

// A hold on the last dance step before Technical Finish (DamageGame.
// holdValue), valued by what holding changed, not idle × GCD (user,
// 2026-10-15). Pressed h earlier:
//  - Technical Finish covers the party h earlier: its share gained on each
//    player's hits in the h before it, lost on their hits in its last h
//    (the party's burst peaks there, so this usually favours the hold);
//  - her own hits from the Finish move h earlier, in or out of the other
//    players' buffs (the ledger's measured share of each on her);
//  - she gets h of GCD time back, at her average GCD outside raid buffs.
// K6qfMamL7rN8yz2Q The Tyrant: 8:09's 1.8s cost 21k (39k of GCD time
// back, less 26k of party damage Technical Finish would have lost, plus
// 9k on her own hits), not the 76k of idle × in-buff GCD; 10:10's 1.2s
// paid off. The party's play is taken as logged. Marked inference.
const DANCE_STEP_IDS = new Set(ids("EMBOITE", "ENTRECHAT", "JETE", "PIROUETTE"));
const TECH_FINISH_IDS = new Set(ids("TECHNICAL_FINISH", "SINGLE_TECHNICAL_FINISH", "DOUBLE_TECHNICAL_FINISH",
  "TRIPLE_TECHNICAL_FINISH", "QUADRUPLE_TECHNICAL_FINISH"));
const OWN_SHIFT_TAIL_MS = 30_000;
export function dncTechHoldValue(ctx: PlayerCheckContext, gap: { gcdStartMs: number; toMs: number; idleMs: number }) {
  if (ctx.job !== "Dancer" || !ctx.ledger) return undefined;
  const step = ctx.uses.find((u) => u.startMs === gap.gcdStartMs);
  const fin = ctx.uses.find((u) => u.startMs === gap.toMs);
  if (!step || !fin || !DANCE_STEP_IDS.has(step.action.id) || !TECH_FINISH_IDS.has(fin.action.id)) return undefined;
  const tech = statusWindows(ctx, S.TECHNICAL_FINISH.id).find((w) => w.startMs >= gap.toMs - 500 && w.startMs <= gap.toMs + 2_000);
  if (!tech) return undefined;
  const ledger = ctx.ledger, me = ctx.player, h = gap.idleMs;
  // Its last h only counts while the pull lasts: a window the end cuts
  // short loses nothing by starting earlier.
  const t0 = tech.startMs, t1 = Math.min(tech.endMs, ctx.endMs), tailFrom = tech.endMs - h;
  const direct = (p: PlayerInfo, a: number, b: number) =>
    p.damageDone.filter((e) => !e.isDoT && e.timestamp >= a && e.timestamp < b).reduce((x, e) => x + (e.amount ?? 0), 0);
  let head = 0, tail = 0, techDelta = 0;
  for (const p of ctx.pull.players) {
    if (p === me) continue;
    const share = ledger.share(S.TECHNICAL_FINISH.id, p);
    if (share <= 0 || share >= 1) continue;
    const hd = direct(p, t0 - h, t0), tl = tailFrom < t1 ? direct(p, tailFrom, t1) : 0;
    head += hd; tail += tl;
    techDelta += hd * share / (1 - share) - tl * share;
  }
  // The others' buffs on her, each as a multiplier from its measured share.
  const ext = ledger.casts.filter((c) => c.source !== me.name && c.recipients.has(me.name));
  const multAt = (t: number) => ext.reduce((m, c) => {
    if (t < c.startMs || t >= c.startMs + c.durationMs) return m;
    const share = ledger.share(c.statusId, me);
    return share > 0 && share < 1 ? m / (1 - share) : m;
  }, 1);
  const ownDelta = me.damageDone.filter((e) => e.timestamp >= gap.toMs && e.timestamp < t1 + OWN_SHIFT_TAIL_MS && e.timestamp < ctx.endMs)
    .reduce((x, e) => x + (e.amount ?? 0) * (multAt(e.timestamp - h) / multAt(e.timestamp) - 1), 0);
  const timeBack = h / ctx.baseGcdMs * ctx.values.gcdValue(undefined, false);
  const lost = timeBack + techDelta + ownDelta;
  const sign = (x: number) => (x < 0 ? `− ${k(-x)}` : `+ ${k(x)}`);
  return {
    lostDamage: lost,
    label: "Technical Finish held",
    basis: `${k(timeBack)} for ${s(h)} of GCD time (her average GCD outside raid buffs) ${sign(techDelta)} Technical Finish on the party ` +
      `(${k(head)} of their hits in the ${s(h)} before it gain its share, ${k(tail)} in its last ${s(h)} lose it) ${sign(ownDelta)} ` +
      `her own hits moved ${s(h)} earlier against the others' buffs; the party's play as logged`,
    detail: `${fin.abilityName} held ${s(h)} after ${step.abilityName}: pressing it at once ${lost >= 1 ? "would have done more" : "would have done less"}`,
  };
}

const technical: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.TECHNICAL_FINISH.id, name: "Technical Finish", bonus: 0.05, spanMs: () => TECH_SPAN_MS,
  bonusBasis: "a missing GCD = its average minus the GCD used instead; Fan Dance IV × 5% (Technical Finish, FFLogs multiplier 1.05)",
  expectedGcds: () => 8,
  // The four Sabers are the cap's plan; synced (TEA 80, no Tillana or
  // Starfall Dance) the window is filled otherwise and only its GCD count
  // is judged.
  expected: (c, casts): ExpectedAction[] => [
    ...TECH_EXPECTED.map(([key, count]) => ({ ids: ids(key), count, name: A[key].name, value: replacedGcd(key) })),
    ...(c.level === undefined
      ? [{ ids: ids(...SABERS), count: sabersExpected(casts), name: "Last Dance / Saber Dance", value: replacedGcd("SABER_DANCE") }] : []),
    { ids: ids("FAN_DANCE_IV"), count: 1, name: "Fan Dance IV" },
  ],
});

// A filler that took a missing Saber Dance's slot is already valued by
// `technical` (the Saber's average minus the GCD used instead): only the
// fillers beyond the Saber shortfall count here.
const technicalFillers: JobCheck = (ctx): DamageFinding[] => {
  const fillers = new Set(ids(...TECH_FILLERS)), sabers = new Set(ids(...SABERS));
  const saber = ctx.values.perUse(A.SABER_DANCE.id);
  const out: DamageFinding[] = [];
  for (const w of statusWindows(ctx, S.TECHNICAL_FINISH.id)) {
    if (w.endMs > ctx.endMs || w.startMs + TECH_SPAN_MS > ctx.endMs) continue;
    const casts = ctx.player.casts.filter((c) => c.timestamp >= w.startMs && c.timestamp <= w.endMs);
    const shortfall = Math.max(0, sabersExpected(casts) - casts.filter((c) => sabers.has(c.abilityId)).length);
    const used = ctx.uses.filter((u) => u.startMs >= w.startMs && u.startMs <= w.endMs + 100 && fillers.has(u.action.id))
      .sort((a, b) => ctx.values.perUse(b.action.id) - ctx.values.perUse(a.action.id))
      .slice(shortfall);
    if (used.length === 0) continue;
    const lost = used.reduce((a, u) => a + Math.max(0, saber - ctx.values.perUse(u.action.id)), 0);
    const during = forcedPart(w.startMs, w.endMs, ctx.forced);
    out.push(finding(ctx, {
      kind: "burst-window", startMs: w.startMs, endMs: w.endMs, inference: true,
      forced: during.ms >= 1_500, cause: during.ms >= 1_500 ? during.cause : undefined,
      label: "Fillers in Technical Finish",
      lostDamage: lost,
      basis: `each filler = ${k(saber)} average Saber Dance minus the filler's average` +
        (shortfall > 0 ? `; ${shortfall} more counted as missing Saber Dances` : ""),
      detail: `${used.length} filler GCD${used.length > 1 ? "s" : ""} in Technical Finish: ${used.map((u) => u.abilityName).join(", ")}`,
    }));
  }
  return out;
};

const OVERWRITE_CAST_MS = 600;
// Proc status → its consumers, whether the consumer is an oGCD, and the
// combo GCD a Symmetry or Flow upgrades. Measured against "the GCD used
// instead" (the player's average GCD, Saber Dances and Tillanas in it), a
// Reverse Cascade came out worth nothing: qjCMx4bRfgNKwX9T kill, the
// Silken Symmetry overwritten at 15:59 read 0k.
const DNC_PROCS: [string, string[], boolean, string?][] = [
  ["SILKEN_SYMMETRY", ["REVERSE_CASCADE", "RISING_WINDMILL"], false, "CASCADE"],
  ["FLOURISHING_SYMMETRY", ["REVERSE_CASCADE", "RISING_WINDMILL"], false, "CASCADE"],
  ["SILKEN_FLOW", ["FOUNTAINFALL", "BLOODSHOWER"], false, "FOUNTAIN"],
  ["FLOURISHING_FLOW", ["FOUNTAINFALL", "BLOODSHOWER"], false, "FOUNTAIN"],
  ["THREEFOLD_FAN_DANCE", ["FAN_DANCE_III"], true],
  ["FOURFOLD_FAN_DANCE", ["FAN_DANCE_IV"], true],
];

/** A proc granted again while still held (FFLogs "refreshed" beside a cast): one use lost. */
// The optional fourth entry is the GCD the proc upgrades (Hawk's Eye turns
// a Burst Shot into a Refulgent Arrow): a lost one is the difference.
const procOverwrites = (list: [string, string[], boolean, string?][]): JobCheck => (ctx): DamageFinding[] => {
  const out: DamageFinding[] = [];
  const forced = mergeWindows(ctx.forced);
  const procs = new Map(list.filter(([s]) => S[s]).map(([s, consumers, ogcd, instead]) => [S[s].id, { consumers, ogcd, instead }]));
  for (const e of ctx.player.buffs ?? []) {
    if (e.buffStatus !== "refreshed" || e.source !== ctx.player.name || e.timestamp >= ctx.endMs) continue;
    const proc = procs.get(e.abilityId);
    if (!proc) continue;
    const cast = ctx.player.casts.find((c) => c.timestamp <= e.timestamp + 100 && c.timestamp >= e.timestamp - OVERWRITE_CAST_MS);
    if (!cast) continue;
    const consumerIds = ids(...proc.consumers);
    const best = consumerIds.sort((a, b) => ctx.values.perUse(b) - ctx.values.perUse(a))[0];
    const avg = best === undefined ? 0 : ctx.values.perUse(best);
    const consumerName = ctx.player.casts.find((c) => c.abilityId === best)?.abilityName ?? proc.consumers[0];
    const instead = proc.instead && A[proc.instead] ? ctx.values.perUse(A[proc.instead].id) : undefined;
    const lost = proc.ogcd ? avg : instead !== undefined ? Math.max(0, avg - instead) : replacedGcd(...proc.consumers)(ctx);
    const isForced = inWindows(e.timestamp, forced);
    out.push(finding(ctx, {
      kind: "proc-lost", startMs: e.timestamp, endMs: e.timestamp, forced: isForced, inference: !proc.ogcd,
      cause: isForced ? forcedPart(e.timestamp - 1, e.timestamp + 1, ctx.forced).cause : undefined,
      label: `${e.abilityName} overwritten`,
      lostDamage: lost,
      basis: proc.ogcd
        ? `one ${consumerName} lost (${k(avg)} average)`
        : instead !== undefined ? `${k(avg)} average ${consumerName} − ${k(instead)} average ${A[proc.instead!].name}`
        : `${k(avg)} average ${consumerName} minus the GCD used instead`,
      detail: `${cast.abilityName} gave ${e.abilityName} while one was still held`,
    }));
  }
  return out;
};

const dancerOverwrites = procOverwrites(DNC_PROCS);

// For the generic expired-proc check (checks.ts, DamageGame.procReplaces):
// a GCD proc that expired cost its consumer minus the GCD it would have
// replaced. Last Dance takes a filler's slot, valued as a Cascade.
// qjCMx4bRfgNKwX9T kill: Last Dance Ready, held into the 4:02 Technical
// Finish and run out at 4:06, read as a whole 86k Last Dance.
// Warrior's Inner Release stack: a free Fell Cleave lost is a combo GCD in
// its slot (K6qfMamL7rN8yz2Q Vamp Fatale, 1:26: Primal Ruination at 1:22
// and Maim at 1:27 where Fell Cleave and Ruination fit; was a whole 81k
// Fell Cleave).
export const PROC_REPLACES = new Map(([
  ["REVERSE_CASCADE", "CASCADE"], ["RISING_WINDMILL", "WINDMILL"],
  ["FOUNTAINFALL", "FOUNTAIN"], ["BLOODSHOWER", "BLADESHOWER"],
  ["LAST_DANCE", "CASCADE"], ["REFULGENT_ARROW", "BURST_SHOT"],
  ["FELL_CLEAVE", "MAIM"], ["PRIMAL_REND", "MAIM"], ["PRIMAL_RUINATION", "MAIM"],
  ["HAMMER_STAMP", "FIRE_IN_RED"], ["GRAND_IMPACT", "JOLT_III"], ["SONIC_BREAK", "KEEN_EDGE"],
  // A lost Tendo leaves the plain Midare (its Kaeshi's upgrade not counted).
  ["TENDO_SETSUGEKKA", "MIDARE_SETSUGEKKA"],
  // A lost Sacred Sight stack leaves a Glare III in its slot
  // (3HrGydmRZApkCtXz Chizu Wu: 3 stacks out at 7:14.1 read 191k whole).
  ["GLARE_IV", "GLARE_III"],
] as const).filter(([a, b]) => A[a] && A[b]).map(([a, b]) => [A[a].id, A[b].id]));

// Declared consumers (DamageGame.procConsumers), from xivanalysis's
// war/Procs.tsx. L9BzKkD2nxcVgHTC Necron pull 18 (Widow Shadowimage): two
// of three Primal Rend Ready ran out (1:38.8, 3:17.2), so the one consumed
// fell under the inference's 60% and neither drop was reported
// (xivanalysis: "You missed 2 uses of Primal Rend"). A lost Primal Rend
// also loses the Primal Ruination it unlocks; that isn't valued here.
export const PROC_CONSUMERS = new Map(([
  ["PRIMAL_REND_READY", "PRIMAL_REND"], ["PRIMAL_RUINATION_READY", "PRIMAL_RUINATION"], ["WRATHFUL", "PRIMAL_WRATH"],
  // x7z6cyRZBQYD3nrL (Setzuna Meio): stacks split 11 Fell Cleave / 7
  // Decimate on two bosses, under the 60% the inference needs, so the 4:45
  // and 6:38 expiries went unjudged (xivanalysis: 6 stacks expired).
  // Decimate stays an accepted alternative (PROC_CONSUMER_ALT_SHARE).
  ["INNER_RELEASE", "FELL_CLEAVE"],
  // 9zdH43vCn8Dr2Nqm (Iloya Maeve): Hammer Time ran out with its stacks
  // at 0:33.3, 2:14.9, 4:22.6, unjudged (the three Hammers split its
  // removals). Valued against Fire in Red (PROC_REPLACES).
  ["HAMMER_TIME", "HAMMER_STAMP"],
  // Mg4p7XG9dtrLVwBf (Momo First): Sonic Break once, Ready to Break ran
  // out 6 times, unjudged (1 of 7 removals; xivanalysis 1 / 10).
  ["READY_TO_BREAK", "SONIC_BREAK"],
  // Refulgent Arrow can't be pressed without Hawk's Eye (checks.ts reads a
  // press while held as using it when the log missed the removal).
  ["HAWKS_EYE", "REFULGENT_ARROW"],
  // Gunbreaker's Continuation (xivanalysis gnb/Continuation.tsx); the next
  // weaponskill clears each (PROCS_CLEARED_BY_GCD).
  ["READY_TO_RIP", "JUGULAR_RIP"], ["READY_TO_TEAR", "ABDOMEN_TEAR"], ["READY_TO_GOUGE", "EYE_GOUGE"],
  ["READY_TO_BLAST", "HYPERVELOCITY"], ["READY_TO_RAZE", "FATED_BRAND"],
  // VhyrDATFKNGt8f6M's Samurai let 4 run out and never pressed Ogi
  // Namikiri, so nothing inferred a consumer.
  ["OGI_NAMIKIRI_READY", "OGI_NAMIKIRI"],
  // VhyrDATFKNGt8f6M (Heddy Donc): Tendo split 5 Tendo Setsugekka / 5
  // Tendo Goken, under the 60%, so the one from Meikyo at 4:42.4 that ran
  // out at 5:13.1 went unjudged (xivanalysis: Tendos 20 / 22). Tendo Goken
  // stays an accepted alternative.
  ["TENDO", "TENDO_SETSUGEKKA"],
] as const).filter(([s, a]) => S[s] && A[a]).map(([s, a]) => [S[s].id, A[a].id]));

// DamageGame.procConsumerFallback (2026-10-16): consumers a player may
// never press in a pull, priced from a sibling the same player pressed.
// Ratios are medians over the samples on disk of per-player ratios of
// single-target hits, each with its damage-% multiplier and direct hit
// divided out and compared within one crit class (so forced crits and
// crit rate cancel): Primal Wrath / Fell Cleave 1.197 (194 samples,
// 1.08-1.32), Ogi Namikiri / Midare Setsugekka 1.746 (43, 1.46-1.98),
// Eye Gouge / Jugular Rip 1.362 (160, 1.25-1.45), Primal Rend / Fell
// Cleave 1.241 (200, 1.15-1.53; 24C9awg1fKhFjBPt's Warrior never pressed
// it in 10 Inner Releases, xivanalysis's "9 uses of Primal Rend").
export const PROC_CONSUMER_FALLBACK = new Map(([
  ["PRIMAL_WRATH", "FELL_CLEAVE", 1.2], ["PRIMAL_REND", "FELL_CLEAVE", 1.24], ["OGI_NAMIKIRI", "MIDARE_SETSUGEKKA", 1.75], ["EYE_GOUGE", "JUGULAR_RIP", 1.36],
] as const).filter(([a, b]) => A[a] && A[b]).map(([a, b, ratio]) => [A[a].id, { refId: A[b].id, ratio }]));

// DamageGame.procsClearedByGcd. Mg4p7XG9dtrLVwBf Red Hot and Deep Blue
// (Momo First): Ready to Raze cleared by Demon Slice 9 times, Ready to Rip
// by Fated Circle / Keen Edge / Reign of Beasts, Ready to Blast by Demon
// Slice / Lightning Shot; none reached its expiry, so none was reported.
export const PROCS_CLEARED_BY_GCD = new Set((["READY_TO_RIP", "READY_TO_TEAR", "READY_TO_GOUGE", "READY_TO_BLAST", "READY_TO_RAZE"] as const)
  .filter((s) => S[s]).map((s) => S[s].id));

// ── Bard, Machinist (unverified) ───────────────────────────────────────

// Bard's DoTs. Iron Jaws refreshes both at once, about every 40s and again
// in each burst to snapshot the buffs, so "seconds of ticks overwritten"
// (the old basis) read standard play as 0.5M lost on 2T1HzdPKgbhM43am
// fight 10, counted twice (once per DoT). A refresh loses no ticks; it
// brings the next Iron Jaws closer. So Stormbite is valued like the healer
// DoTs (shared.ts dotApplicationFindings, against Burst Shot, less the
// Iron Jaws hit), a refresh in raid buffs is a snapshot and costs nothing,
// and Caustic Bite, refreshed by the same casts, counts only its uptime.
// After both lapse (an add, downtime), they go back on one GCD apart in
// either order, so each gets a GCD's more grace for the other (pairedIds).
const bardDots: JobCheck = (ctx) => [
  ...dotFindings(ctx, { statusIds: [S.CAUSTIC_BITE.id], name: S.CAUSTIC_BITE.name, durationMs: S.CAUSTIC_BITE.duration ?? 45_000, uptimeOnly: true,
    pairedIds: [S.STORMBITE.id] }),
  ...dotFindings(ctx, {
    statusIds: [S.STORMBITE.id], name: S.STORMBITE.name, durationMs: S.STORMBITE.duration ?? 45_000,
    fillerId: () => ({ id: A.BURST_SHOT.id, name: A.BURST_SHOT.name }),
    castIds: [A.IRON_JAWS.id], snapshotInBuffs: true, pairedIds: [S.CAUSTIC_BITE.id],
  }),
];

// Hawk's Eye granted again while held: a Refulgent Arrow lost
// (xivanalysis: 4 overwritten on 2T1HzdPKgbhM43am fight 10, the same 4).
const bardOverwrites = procOverwrites([["HAWKS_EYE", ["REFULGENT_ARROW"], false, "BURST_SHOT"]]);

// Ladonsbite / Shadowbite on one target, against Burst Shot / Refulgent.
const bardAoe = aoeComboOnOneTarget([[A.LADONSBITE.id, A.BURST_SHOT.id], [A.SHADOWBITE.id, A.REFULGENT_ARROW.id],
  // xivanalysis AoEUsages: Rain of Death needs 2 targets over Heartbreak
  // Shot (qjCMx4bRfgNKwX9T fight 16: one at 8:57 hit only Exdeath).
  [A.RAIN_OF_DEATH.id, A.HEARTBREAK_SHOT.id]]);

// Wildfire (xivanalysis Wildfire.tsx): it detonates 10s after landing for
// 150 potency per weaponskill that hit its target in that time, 6 at
// most. Counted from hits, not casts: a Blazing Shot cast just before the
// detonation lands after it and doesn't count (Brk8fQGnhJaxFKvb 4:17.8
// and 8:20, jN3XDrf2z8PmLgRJ Vamp Fatale pull 9 2:20.4: the detonation is
// a sixth short, xivanalysis's "fewer than 6 GCDs"; casts read 6/6). A
// missing one is worth her detonation damage per counted weaponskill. A
// window cut by forced time or the kill is shown, not counted.
const WILDFIRE_MAX = 6;
const WILDFIRE_MS = 10_700;
const WILDFIRE_APPLY_MS = 650;
const MCH_WEAPONSKILLS = new Set(ids("CHAIN_SAW", "EXCAVATOR", "AIR_ANCHOR", "DRILL", "SCATTERGUN", "BIOBLASTER", "BLAZING_SHOT",
  "HEAT_BLAST", "AUTO_CROSSBOW", "HEATED_SPLIT_SHOT", "HEATED_SLUG_SHOT", "HEATED_CLEAN_SHOT", "FULL_METAL_FIELD", "SPREAD_SHOT"));
const wildfire: JobCheck = (ctx) => {
  const me = ctx.player;
  const windows = me.casts.filter((c) => c.abilityId === A.WILDFIRE.id && c.timestamp < ctx.endMs).map((c) => {
    const det = me.damageDone.find((e) => e.abilityId === S.WILDFIRE.id && e.timestamp > c.timestamp && e.timestamp <= c.timestamp + WILDFIRE_MS);
    const end = det?.timestamp ?? c.timestamp + WILDFIRE_MS;
    // From the status landing (~0.6s after the cast), read from the
    // player's own Wildfire status: a hit between the cast and it doesn't
    // count (Brk8fQGnhJaxFKvb 6:09.32 Chain Saw, status at 6:09.68).
    const start = (me.buffs ?? []).find((b) => b.abilityName === "Wildfire" && b.buffStatus === "applied" &&
      b.timestamp >= c.timestamp && b.timestamp <= c.timestamp + 2_000)?.timestamp ?? c.timestamp + WILDFIRE_APPLY_MS;
    // The first hit of each weaponskill cast on the Wildfire's target.
    const counted = me.casts.filter((x) => MCH_WEAPONSKILLS.has(x.abilityId) && x.timestamp > c.timestamp - 1_000 && x.timestamp < end).filter((x) => {
      const hit = me.damageDone.find((e) => e.abilityId === x.abilityId && !e.isDoT && e.timestamp >= x.timestamp && e.timestamp < x.timestamp + 2_000);
      return hit !== undefined && hit.timestamp >= start && hit.timestamp <= end && (!c.target || hit.target === c.target);
    }).length;
    return { cast: c, det, end, counted: Math.min(WILDFIRE_MAX, counted) };
  });
  const withDet = windows.filter((w) => w.det && w.counted > 0);
  const perGcd = withDet.length ? withDet.reduce((a, w) => a + (w.det!.amount ?? 0), 0) / withDet.reduce((a, w) => a + w.counted, 0) : 0;
  const out: DamageFinding[] = [];
  for (const w of windows) {
    const missing = WILDFIRE_MAX - w.counted;
    if (missing <= 0 || perGcd <= 0) continue;
    const during = forcedPart(w.cast.timestamp, w.end, ctx.forced);
    const cut = w.end >= ctx.endMs;
    out.push(finding(ctx, {
      kind: "burst-window", startMs: w.cast.timestamp, endMs: w.end, forced: during.ms > 0 || cut,
      cause: during.ms > 0 ? during.cause : cut ? "the pull ended" : undefined,
      label: "Wildfire short", lostDamage: missing * perGcd,
      basis: `${missing} × ${k(perGcd)} (her Wildfire detonations per weaponskill counted)`,
      detail: `Wildfire at ${clock(w.cast.timestamp)}: ${w.counted}/${WILDFIRE_MAX} weaponskills landed on ${w.cast.target ?? "its target"} before it detonated` +
        (w.det ? "" : " (it never detonated)"),
    }));
  }
  return out;
};

const hypercharge: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.OVERHEATED.id, name: "Hypercharge", bonus: 0,
  bonusBasis: "a missing Heat Blast / Blazing Shot is its average, lost with the Heat (not yet checked against a log)",
  expected: (): ExpectedAction[] => [{
    ids: ids("HEAT_BLAST", "BLAZING_SHOT", "AUTO_CROSSBOW"), count: 5, name: "Blazing Shot",
    value: (c) => Math.max(...ids("HEAT_BLAST", "BLAZING_SHOT").map((x) => c.values.perUse(x))),
  }],
});

// Feathers and Esprit at the cap, from the estimated gauges (jobs/gauges.ts,
// after xivanalysis's Gauge.tsx): named, never valued (user, 2026-10-14),
// since the log shows neither gauge and their generation is random. One
// finding per gauge once the estimate loses a whole feather or a whole
// Saber Dance's 50 Esprit; each overcap is a moment.
const dancerGaugeEstimates: JobCheck = (ctx) => {
  const out: DamageFinding[] = [];
  const gauges: [string, ReturnType<typeof featherGauge>, number, string][] = [
    ["Feathers", featherGauge(ctx), 1, "feather"],
    ["Esprit", espritGauge(ctx), 50, "Saber Dance"],
  ];
  for (const [name, g, per, unit] of gauges) {
    const n = Math.floor(g.overcap / per);
    if (n < 1 || g.overcaps.length === 0) continue;
    // One moment per stretch at the cap (the party's Esprit comes in
    // fractions, dozens of tiny overcaps a stretch).
    const moments = g.track.capped.map((w) => ({
      startMs: w.startMs, endMs: w.endMs,
      amount: g.overcaps.filter((o) => o.t >= w.startMs && o.t <= w.endMs).reduce((a, o) => a + o.amount, 0),
    })).filter((m) => m.amount > 0);
    if (moments.length === 0) continue;
    out.push(finding(ctx, {
      kind: "gauge-estimate", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
      label: `${name} at the cap (estimated)`, lostDamage: 0,
      moments: moments.map((m) => ({ startMs: m.startMs, endMs: m.endMs, lostDamage: 0, detail: `${name} at the cap, ${Math.round(m.amount * 10) / 10} over (estimated)` })),
      basis: `${g.track.note}. Not counted: the log doesn't show this gauge`,
      detail: `${n} ${unit}${n === 1 ? "" : "s"} may have been lost to ${name} at the cap (${moments.length} time${moments.length === 1 ? "" : "s"}, estimated)`,
    }));
  }
  out.push(...unpooledFeathers(ctx));
  return out;
};

// Feathers not pooled for Technical Finish (xivanalysis
// evaluators/PooledFeathersEvaluator.tsx): a window with under 3 Fan Dance
// / Fan Dance II in it, after any were spent between the previous window's
// end (+0.5s) and its start. The opener isn't judged; a window the kill
// cut short passes with a Fan Dance per GCD it had room for, less one.
// Whether holding them would have overcapped rests on the estimated
// feathers, so it's named, not valued (user, 2026-10-14). K6qfMamL7rN8yz2Q
// Vamp Fatale, 6:09: 2 in it, 3 spent at 5:18-5:47 (its one ✗).
const POOL_FEATHERS = 3;
const POOL_GRACE_MS = 500;
function unpooledFeathers(ctx: PlayerCheckContext): DamageFinding[] {
  const spenders = new Set(ids("FAN_DANCE", "FAN_DANCE_II"));
  const spends = ctx.player.casts.filter((c) => spenders.has(c.abilityId));
  const windows = statusWindows(ctx, S.TECHNICAL_FINISH.id);
  const out: DamageFinding[] = [];
  windows.forEach((w, i) => {
    if (i === 0) return;
    const end = Math.min(w.endMs, ctx.endMs);
    const inside = spends.filter((c) => c.timestamp >= w.startMs && c.timestamp <= end).length;
    if (inside >= POOL_FEATHERS) return;
    if (w.endMs > ctx.endMs && inside >= Math.floor((end - w.startMs) / ctx.baseGcdMs) - 1) return;
    const before = spends.filter((c) => c.timestamp > windows[i - 1].endMs + POOL_GRACE_MS && c.timestamp < w.startMs);
    if (before.length === 0) return;
    const at = (t: number) => `${Math.floor(t / 60000)}:${String(Math.floor(t / 1000) % 60).padStart(2, "0")}`;
    out.push(finding(ctx, {
      kind: "gauge-estimate", startMs: w.startMs, endMs: w.startMs, forced: false, inference: true,
      label: "Feathers not pooled for Technical Finish (estimated)", lostDamage: 0,
      basis: `${inside} Fan Dance${inside === 1 ? "" : "s"} in the window (xivanalysis wants ${POOL_FEATHERS}), ${before.length} spent since the last one at ${before.map((c) => at(c.timestamp)).join(", ")}. ` +
        "Not counted: whether holding them would have overcapped rests on the estimated feathers",
      detail: `Technical Finish at ${at(w.startMs)}: ${inside} Fan Dance${inside === 1 ? "" : "s"} in it after ${before.length} spent between windows (estimated)`,
    }));
  });
  return out;
}

// xivanalysis AoEUsages: the AoE line on one target, each against its
// single-target counterpart.
const dancerAoe = aoeComboOnOneTarget([[A.WINDMILL.id, A.CASCADE.id], [A.RISING_WINDMILL.id, A.REVERSE_CASCADE.id],
  [A.BLOODSHOWER.id, A.FOUNTAINFALL.id]]);

// Dances (xivanalysis DirtyDancing.tsx: CleanDance, Footloose, the zero-step
// evaluators). A dance's step count is in its finisher's id, so both
// mistakes are read from casts:
// - Finished short: fewer steps than Double Standard / Quadruple Technical
//   Finish. The buff is weaker or missing. Measured from FFLogs hit
//   multipliers on 9zQqtBRL41XhADxG, Jv7XZL2zwYgyhdFj, MFGhwLnJ34pz7cWQ:
//   Triple Technical +3% against Quadruple's +5%, Single Standard +2%
//   against Double's +5%, and a zero-step Standard Finish applies nothing
//   (the previous buff just runs on). Valued as the buff gap on every hit
//   the buff's recipients landed while it covered them (the party for
//   Technical, 20s; the Dancer and partner for Standard, up to 60s or the
//   next Standard Finish), plus the finisher's own lower damage against
//   the player's full one, both compared buff-neutrally.
// - Wrong steps: presses beyond the steps the finisher used. Each is a 1s
//   step GCD wasted, valued at her average GCD outside raid buffs
//   (inference: it also delays the finish).
// Pressed in forced time, or with the target leaving within 2s of the
// finish, it's shown, not counted.
const TECH_PCT = [0, 0.01, 0.02, 0.03, 0.05];
const STD_PCT = [0, 0.02, 0.05];
const DANCE_FINISH = new Map<number, { kind: "Technical" | "Standard"; steps: number }>(([
  ["STANDARD_FINISH", "Standard", 0], ["SINGLE_STANDARD_FINISH", "Standard", 1], ["DOUBLE_STANDARD_FINISH", "Standard", 2],
  ["TECHNICAL_FINISH", "Technical", 0], ["SINGLE_TECHNICAL_FINISH", "Technical", 1], ["DOUBLE_TECHNICAL_FINISH", "Technical", 2],
  ["TRIPLE_TECHNICAL_FINISH", "Technical", 3], ["QUADRUPLE_TECHNICAL_FINISH", "Technical", 4],
] as const).filter(([key]) => A[key]).map(([key, kind, steps]) => [A[key].id, { kind, steps }]));
const DANCE_START = new Map(([["STANDARD_STEP", "Standard"], ["TECHNICAL_STEP", "Technical"]] as const)
  .filter(([key]) => A[key]).map(([key, kind]) => [A[key].id, kind]));
const FULL_FINISH = { Standard: A.DOUBLE_STANDARD_FINISH.id, Technical: A.QUADRUPLE_TECHNICAL_FINISH.id };
const STEP_GCD_MS = 1_000;
const BUFF_APPLY_MS = 1_500;
const LEAVING_MS = 2_000;
const STANDARD_SPAN_MS = 60_000;

const dancerDances: JobCheck = (ctx) => {
  const out: DamageFinding[] = [];
  const me = ctx.player;
  const critMult = critMultOf(ctx), gain = rollGainOf(ctx, critMult);
  const casts = me.casts.filter((c) => c.timestamp < ctx.endMs).sort((a, b) => a.timestamp - b.timestamp);
  const finishes = casts.filter((c) => DANCE_FINISH.has(c.abilityId));
  const stdIds = new Set([S.STANDARD_FINISH.id, S.STANDARD_FINISH_PARTNER.id]);
  // A finisher's own hits: its largest base value (the first target; the
  // rest take falloff) per cast, for the full finisher's average.
  const hitsOf = (c: PlayerEvent) => me.damageDone.filter((e) => e.abilityId === c.abilityId && !e.pet &&
    e.timestamp >= c.timestamp && e.timestamp < c.timestamp + 2_000 && (e.amount ?? 0) > 0);
  const topBase = (c: PlayerEvent) => Math.max(0, ...hitsOf(c).map((e) => baseValue(e, critMult)));
  const fullTop = (kind: "Technical" | "Standard") => {
    const tops = finishes.filter((c) => c.abilityId === FULL_FINISH[kind]).map(topBase).filter((v) => v > 0);
    return tops.length ? tops.reduce((a, v) => a + v, 0) / tops.length : 0;
  };
  // Each recipient's hits from t to `until` with the dance buff's share
  // they carried: pct when the hit carries a status of `statusIds`, else 0.
  const buffGap = (recipients: PlayerInfo[], statusIds: Set<number>, t: number, until: number, carried: number, full: number) => {
    let lost = 0;
    for (const p of recipients) {
      for (const e of p.damageDone) {
        if (e.timestamp < t + BUFF_APPLY_MS || e.timestamp >= until || (e.amount ?? 0) <= 0) continue;
        const has = (e.statusIds ?? []).some((id) => statusIds.has(id));
        const pct = has ? carried : 0;
        lost += (e.amount ?? 0) * ((1 + full) / (1 + pct) - 1);
      }
    }
    return lost;
  };
  let dance: { kind: "Technical" | "Standard"; at: number; presses: number } | undefined;
  let lastFinishAt = -Infinity;
  for (const c of casts) {
    const start = DANCE_START.get(c.abilityId);
    if (start) { dance = { kind: start, at: c.timestamp, presses: 0 }; continue; }
    if (DANCE_STEP_IDS.has(c.abilityId)) { if (dance) dance.presses++; continue; }
    const fin = DANCE_FINISH.get(c.abilityId);
    // Technical Finish logs a second id ~0.6s later (33218): one finish.
    if (!fin || c.timestamp - lastFinishAt < 1_000) continue;
    lastFinishAt = c.timestamp;
    const t = c.timestamp;
    const during = forcedPart(t - 1, t + LEAVING_MS, ctx.forced);
    const forced = during.ms > 0;
    const full = fin.kind === "Technical" ? 4 : 2;
    const wrong = dance && dance.kind === fin.kind ? Math.max(0, dance.presses - fin.steps) : 0;
    if (wrong > 0) {
      out.push(finding(ctx, {
        kind: "dance", startMs: dance!.at, endMs: t, forced, cause: forced ? during.cause : undefined, inference: true,
        label: `${wrong} wrong step${wrong > 1 ? "s" : ""} in ${fin.kind} Step`,
        lostDamage: wrong * STEP_GCD_MS / ctx.baseGcdMs * ctx.values.gcdValue(undefined, false),
        basis: `${wrong} × ${s(STEP_GCD_MS)} step GCD × her average GCD outside raid buffs (it also delays the finish)`,
        detail: `${dance!.presses} step presses for a ${fin.steps}-step ${c.abilityName}`,
      }));
    }
    dance = undefined;
    if (fin.steps >= full) continue;
    const pcts = fin.kind === "Technical" ? TECH_PCT : STD_PCT;
    const got = pcts[fin.steps], best = pcts[full];
    let buffLost = 0;
    if (fin.kind === "Technical") {
      const techIds = new Set([S.TECHNICAL_FINISH.id]);
      const applied = ctx.pull.players.filter((p) => (p.buffs ?? []).some((b) => b.abilityId === S.TECHNICAL_FINISH.id &&
        b.source === me.name && b.buffStatus !== "removed" && Math.abs(b.timestamp - t) <= BUFF_APPLY_MS));
      const recipients = applied.length ? applied : ctx.pull.players;
      buffLost = buffGap(recipients, techIds, t, Math.min(t + TECH_SPAN_MS, ctx.endMs), got, best);
    } else {
      // The Dancer and her partner; the next Standard Finish ends the stretch.
      const partner = ctx.pull.players.find((p) => p !== me && (p.buffs ?? []).some((b) =>
        b.abilityId === S.STANDARD_FINISH_PARTNER.id && b.source === me.name));
      const next = finishes.find((x) => x.timestamp > t + 1_000 && DANCE_FINISH.get(x.abilityId)?.kind === "Standard");
      const until = Math.min(t + STANDARD_SPAN_MS, next?.timestamp ?? Infinity, ctx.endMs);
      // A zero-step finish applies nothing: hits still carrying the buff
      // carry the last full one.
      buffLost = buffGap([me, ...(partner ? [partner] : [])], stdIds, t, until, fin.steps === 0 ? best : got, best);
    }
    const top = fullTop(fin.kind);
    const hits = hitsOf(c);
    const mine = hits.reduce((a, e) => a + baseValue(e, critMult), 0);
    const thisTop = topBase(c);
    const mod = hits.length ? hits.reduce((a, e) => a + (e.multiplier && e.multiplier > 0 ? e.multiplier : 1), 0) / hits.length : 1;
    const ownLost = top > 0 && thisTop > 0 && thisTop < top ? mine * (top / thisTop - 1) * mod * gain : 0;
    out.push(finding(ctx, {
      kind: "dance", startMs: t, endMs: t, forced, cause: forced ? during.cause : undefined,
      label: `${c.abilityName}: ${fin.steps} of ${full} steps`,
      lostDamage: buffLost + ownLost,
      basis: `${k(buffLost)} of buff: +${Math.round(got * 100)}% instead of +${Math.round(best * 100)}% on what ` +
        `${fin.kind === "Technical" ? "the party" : "she and her partner"} dealt under it` +
        (ownLost > 0 ? `, plus ${k(ownLost)} on the finish itself against her average full one (buff-neutral)` : ""),
      detail: `${c.abilityName} at ${Math.floor(t / 60000)}:${String(Math.floor(t / 1000) % 60).padStart(2, "0")}, ` +
        `${fin.steps} step${fin.steps === 1 ? "" : "s"} of ${full}`,
    }));
  }
  return out;
};

// Devilment pressed so far from Technical Finish that its 20s covered none
// of the window (xivanalysis Technicalities "bad Devilments"). Its +20%
// crit and direct-hit rate went on the Dancer's and their partner's hits
// in those 20s instead of the window's: the loss is the gain on the
// difference, each hit taken without its crit / direct hit (it keeps
// its damage multipliers, which are what the window is for) and priced
// at each player's own rates. Starfall Dance always crits and direct-hits:
// left out. Only a Technical Finish within DEVILMENT_REACH_MS counts as the
// one it was meant for; with none (a dropped Technical Step) there was
// nothing to hold it for. 1178 Devilments on the 442 Dancer pulls on disk:
// one fits, zPJaZNfkFAKhY42t Red Hot and Deep Blue 6:22 (21s before the
// 6:43 Technical Finish).
const DEVILMENT_REACH_MS = 60_000;
const DEVILMENT_LEAD_MS = 2_500;
const devilmentMisaligned: JobCheck = (ctx): DamageFinding[] => {
  const out: DamageFinding[] = [];
  const buff = ctx.game.partyBuff(S.DEVILMENT.id);
  const spanMs = S.DEVILMENT.duration ?? 20_000;
  const techs = statusWindows(ctx, S.TECHNICAL_FINISH.id);
  const starfall = A.STARFALL_DANCE?.id;
  for (const c of ctx.player.casts.filter((x) => x.abilityId === A.DEVILMENT.id && x.timestamp < ctx.endMs)) {
    const t = c.timestamp;
    if (techs.some((w) => t >= w.startMs - DEVILMENT_LEAD_MS && t <= w.endMs)) continue;
    const near = techs.filter((w) => Math.abs(w.startMs - t) <= DEVILMENT_REACH_MS && w.startMs < ctx.endMs)
      .sort((a, b) => Math.abs(a.startMs - t) - Math.abs(b.startMs - t))[0];
    if (!near) continue;
    const len = Math.min(spanMs, ctx.endMs - t, ctx.endMs - near.startMs);
    if (len <= 0) continue;
    const partner = ctx.pull.players
      .filter((p) => p !== ctx.player)
      .map((p) => ({ p, n: p.damageDone.filter((e) => e.timestamp >= t && e.timestamp <= t + len && e.statusIds?.includes(S.DEVILMENT.id)).length }))
      .sort((a, b) => b.n - a.n)[0];
    const players = [ctx.player, ...(partner && partner.n > 0 ? [partner.p] : [])];
    let lost = 0;
    for (const p of players) {
      const rates = estimateHitRates([p], ctx.game, new Set());
      const c0 = rates?.crit ?? 0.25, d0 = rates?.directHit ?? 0.3, m = rates?.critMult ?? 1.55;
      const expect = (cr: number, dh: number) => (1 + Math.min(1, cr) * (m - 1)) * (1 + Math.min(1, dh) * 0.25);
      const gain = expect(c0 + (buff?.crit ?? 0.2), d0 + (buff?.directHit ?? 0.2)) - expect(c0, d0);
      const sum = (from: number) => p.damageDone
        .filter((e) => e.timestamp >= from && e.timestamp < from + len && !e.isDoT && e.abilityId !== starfall && (e.amount ?? 0) > 0)
        .reduce((a, e) => a + baseValue(e, m) * (e.multiplier && e.multiplier > 0 ? e.multiplier : 1), 0);
      lost += gain * (sum(near.startMs) - sum(t));
    }
    if (lost <= 0) continue;
    // Nothing forces Devilment early; a window that was itself forced
    // (held past a phase's check) is.
    const during = forcedPart(near.startMs, near.startMs + len, ctx.forced);
    const forced = during.ms >= 1_500;
    out.push(finding(ctx, {
      kind: "burst-window", startMs: t, endMs: t, forced, cause: forced ? during.cause : undefined, inference: true,
      label: "Devilment outside Technical Finish",
      lostDamage: lost,
      basis: `Devilment's +20% crit and direct-hit rate on what the Dancer${partner?.n ? " and their partner" : ""} dealt in the ` +
        `Technical Finish window minus in the ${s(len)} it covered (crit and direct hit taken out, damage buffs kept), at their own rates`,
      detail: `Devilment at ${clock(t)}, Technical Finish at ${clock(near.startMs)}`,
    }));
  }
  return out;
};

// fromLevel (shared.ts): the level each rule needs, for synced ultimates.
export const DNC_CHECKS: JobCheck[] = [technical, fromLevel(100, technicalFillers), dancerOverwrites, dancerGaugeEstimates, dancerAoe, dancerDances,
  fromLevel(90, devilmentMisaligned)];
// The burst window (xivanalysis BuffWindows/BurstWindow.tsx): where
// Raging Strikes, Battle Voice and Radiant Finale are all up. 7 GCDs, 8
// when Army's Muse covers 2+ of them; Barrage consumed in it (a Refulgent
// Arrow / Shadowbite, then Barrage's removal, inside it); Iron Jaws once
// per enemy hit in it; Apex Arrow and Blast Arrow after the first minute;
// Radiant Encore, Resonant Arrow, Empyreal Arrow and Sidewinder once;
// three Heartbreak Shots / Rains of Death. Valued at the window's observed
// bonus (the player's multiplier in it over outside raid buffs; Battle
// Voice's direct hit isn't in it, so a floor). A Barrage spent outside it
// loses its two extra Refulgent hits' bonus. Replaces the Raging-Strikes-
// only window. dDar482XvFKBPJYh FRU kill (7.1): checked against its 6
// GCDs, 7 Barrage / Iron Jaws, 3 Sidewinder / Empyreal, 6 Heartbreak, 2
// Apex / Blast and 1 Radiant Encore / Resonant missed.
const BRD_OPENER_MS = 60_000;
const BRD_MUSE_GCDS = 2;
const bardBurst: JobCheck = (ctx) => {
  const muse = statusWindows(ctx, S.ARMYS_MUSE.id);
  const barrageGone = (ctx.player.buffs ?? []).filter((e) => e.abilityId === S.BARRAGE.id && e.buffStatus === "removed").map((e) => e.timestamp);
  const consumers = new Set(ids("REFULGENT_ARROW", "SHADOWBITE"));
  return burstWindowFindings(ctx, {
    statusId: S.RAGING_STRIKES.id, allOf: [S.RAGING_STRIKES.id, S.BATTLE_VOICE.id, S.RADIANT_FINALE.id],
    name: "Burst window", bonus: "observed",
    bonusBasis: "the window's observed bonus (multiplier in it over outside raid buffs; direct-hit buffs aren't in it, so a floor)",
    expectedGcds: (c, casts) => {
      const gcds = casts.filter((x) => c.game.action(x.abilityId)?.onGcd);
      return 7 + (muse.some((m) => gcds.filter((x) => x.timestamp > m.startMs && x.timestamp < m.endMs).length >= BRD_MUSE_GCDS) ? 1 : 0);
    },
    expected: (c, casts): ExpectedAction[] => {
      const opener = casts.length > 0 && casts[0].timestamp <= BRD_OPENER_MS;
      const enemies = new Set(casts.filter((x) => x.target && x.target !== c.player.name).map((x) => x.target)).size;
      return [
        {
          ids: ids("BARRAGE"), count: 1, name: "Barrage", scaled: true,
          value: (cc) => cc.values.perUse(A.REFULGENT_ARROW.id),
          got: (_cc, w, cs) => {
            const first = cs.find((x) => consumers.has(x.abilityId))?.timestamp;
            return first !== undefined && barrageGone.some((t) => t >= first && t <= w.endMs + 200) ? 1 : 0;
          },
        },
        { ids: ids("IRON_JAWS"), count: Math.max(1, enemies), name: "Iron Jaws" },
        ...(opener ? [] : [
          { ids: ids("APEX_ARROW"), count: 1, name: "Apex Arrow" },
          { ids: ids("BLAST_ARROW"), count: 1, name: "Blast Arrow" },
        ]),
        { ids: ids("RADIANT_ENCORE"), count: 1, name: "Radiant Encore" },
        { ids: ids("RESONANT_ARROW"), count: 1, name: "Resonant Arrow" },
        { ids: ids("EMPYREAL_ARROW"), count: 1, name: "Empyreal Arrow" },
        { ids: ids("SIDEWINDER"), count: 1, name: "Sidewinder" },
        { ids: ids("HEARTBREAK_SHOT", "RAIN_OF_DEATH"), count: 3, name: "Heartbreak Shot" },
      ];
    },
  });
};

export const BRD_CHECKS: JobCheck[] = [bardDots, bardOverwrites, bardAoe, bardBurst];
// xivanalysis MultiHitSkills. Bioblaster shares Drill's charges; its DoT
// ticks count toward what it dealt. Scattergun stands in for any step of
// the Heated combo, so it's judged against their average.
const mchAoe = aoeComboOnOneTarget([[A.BIOBLASTER.id, A.DRILL.id, 3, [S.BIOBLASTER.id]],
  [A.AUTO_CROSSBOW.id, A.BLAZING_SHOT.id, 4],
  [A.SCATTERGUN.id, [A.HEATED_SPLIT_SHOT.id, A.HEATED_SLUG_SHOT.id, A.HEATED_CLEAN_SHOT.id], 4]]);

// Heat and Battery (xivanalysis Gauge.tsx), simulated from casts:
// - Heat (cap 100): Heated Split Shot, Spread Shot +5, Heated Slug / Clean
//   Shot +5 when the combo landed, Scattergun +10; Hypercharge spends 50
//   unless Hypercharged (Barrel Stabilizer's free one) is up. 50 lost is a
//   Hypercharge: 5 Blazing Shots in the time of 3 combo GCDs.
// - Battery (cap 100): Air Anchor, Chain Saw, Excavator +20, Heated Clean
//   Shot +10 when the combo landed; Automaton Queen spends it all. Lost
//   Battery is worth her Queen damage per Battery spent.
// A death empties both. Also the Machinist's timeline lanes (gauges.ts).
const HEAT_PER_HYPERCHARGE = 50;
export function mchGaugeSpecs(ctx: PlayerCheckContext): GaugeSpec[] {
  const casts = ctx.player.casts.filter((c) => c.timestamp < ctx.endMs).sort((a, b) => a.timestamp - b.timestamp);
  const hypercharged = statusWindows(ctx, S.HYPERCHARGED.id);
  const landed = (c: PlayerEvent) => comboLanded(ctx, c.abilityId, c.timestamp);
  const heat: GaugeEvent[] = [], battery: GaugeEvent[] = [];
  const heatGain = new Map(([["HEATED_SPLIT_SHOT", 5], ["SPREAD_SHOT", 5], ["SCATTERGUN", 10]] as const)
    .filter(([key]) => A[key]).map(([key, n]) => [A[key].id, n]));
  const comboHeat = new Set(ids("HEATED_SLUG_SHOT", "HEATED_CLEAN_SHOT"));
  const batteryGain = new Set(ids("AIR_ANCHOR", "CHAIN_SAW", "EXCAVATOR"));
  // The Queen spends what's held: a first pass finds how much.
  let held = 0;
  const spent: number[] = [];
  for (const c of casts) {
    if (inWindows(c.timestamp, ctx.dead)) held = 0;
    const gain = batteryGain.has(c.abilityId) ? 20 : c.abilityId === A.HEATED_CLEAN_SHOT.id && landed(c) ? 10 : 0;
    if (gain) {
      held = Math.min(100, held + gain);
      battery.push({ t: c.timestamp, type: "gain", amount: gain, label: `${c.abilityName} at 100 Battery` });
    } else if (c.abilityId === A.AUTOMATON_QUEEN.id) {
      spent.push(held);
      battery.push({ t: c.timestamp, type: "spend", amount: held, label: "Automaton Queen" });
      held = 0;
    }
    const h = heatGain.get(c.abilityId) ?? (comboHeat.has(c.abilityId) && landed(c) ? 5 : 0);
    if (h) heat.push({ t: c.timestamp, type: "gain", amount: h, label: `${c.abilityName} at 100 Heat` });
    else if (c.abilityId === A.HYPERCHARGE.id && !hypercharged.some((w) => c.timestamp > w.startMs && c.timestamp <= w.endMs + 50))
      heat.push({ t: c.timestamp, type: "spend", amount: HEAT_PER_HYPERCHARGE, label: "Hypercharge" });
  }
  for (const d of ctx.dead) { heat.push({ t: d.startMs, type: "reset", label: "death" }); battery.push({ t: d.startMs, type: "reset", label: "death" }); }
  const queenDamage = ctx.player.damageDone.filter((e) => e.pet === "Automaton Queen" && e.timestamp < ctx.endMs + 20_000)
    .reduce((a, e) => a + (e.amount ?? 0), 0);
  const spentTotal = spent.reduce((a, x) => a + x, 0);
  const perBattery = spentTotal > 0 ? queenDamage / spentTotal : 0;
  const blazing = Math.max(...ids("BLAZING_SHOT", "HEAT_BLAST").map((x) => ctx.values.perUse(x)));
  const combo = ids("HEATED_SPLIT_SHOT", "HEATED_SLUG_SHOT", "HEATED_CLEAN_SHOT").map((x) => ctx.values.perUse(x)).filter((v) => v > 0);
  const filler = combo.length ? combo.reduce((a, v) => a + v, 0) / combo.length : 0;
  const hyper = Math.max(0, 5 * blazing - 3 * filler);
  return [
    { name: "Heat", unit: "Heat", cap: 100, unitValue: hyper / HEAT_PER_HYPERCHARGE, events: heat,
      valueBasis: `(5 × ${k(blazing)} average Blazing Shot − 3 × ${k(filler)} average combo GCD in the same time) per 50 Heat` },
    { name: "Battery", unit: "Battery", cap: 100, unitValue: perBattery, events: battery,
      valueBasis: `${k(perBattery * 10)} of her Queen damage per 10 Battery spent` },
  ];
}
const mchGauges: JobCheck = (ctx) => mchGaugeSpecs(ctx).flatMap((spec) => (spec.unitValue > 0 ? gaugeFindings(ctx, spec) : []));

// Double Check / Checkmate charges (xivanalysis oGCDCharges.tsx), simulated
// from casts: 3 charges, one per 30s, and each Blazing Shot / Heat Blast
// takes 15s off both recharges. At 3 the recharge stops, so the time spent
// there and any refund landing there are recharge lost; every 30s of it a
// charge. xivanalysis refunds only on Heat Blast, which level 100 replaces
// with Blazing Shot, so its counts aren't comparable. Time before her
// first action (the pre-pull) and forced time (downtime, death) aren't
// counted. Also the Machinist's timeline lanes (gauges.ts).
const CHARGE_MS = 30_000, CHARGE_REFUND_MS = 15_000, CHARGES_MAX = 3, OPENER_GRACE_MS = 15_000;
export type ChargeTrack = { name: string; spenderId: number; steps: GaugeTrack["steps"]; capped: { startMs: number; endMs: number; refunds: number[] }[] };
export function mchChargeTracks(ctx: PlayerCheckContext): ChargeTrack[] {
  const casts = ctx.player.casts.filter((c) => c.timestamp < ctx.endMs).sort((a, b) => a.timestamp - b.timestamp);
  const refundIds = new Set(ids("BLAZING_SHOT", "HEAT_BLAST"));
  const firstAct = casts[0]?.timestamp ?? 0;
  const run = (name: string, spend: Set<number>, spenderId: number): ChargeTrack => {
    let charges = CHARGES_MAX, progress = 0, at = firstAct;
    const steps: GaugeTrack["steps"] = [{ t: 0, value: CHARGES_MAX }];
    const capped: ChargeTrack["capped"] = [];
    let cap: ChargeTrack["capped"][number] | undefined = { startMs: firstAct, endMs: firstAct, refunds: [] };
    const set = (t: number) => {
      const last = steps[steps.length - 1];
      if (last.value === charges) return;
      if (last.t === t) last.value = charges; else steps.push({ t, value: charges });
    };
    // Recharge up to t (no refunds in between).
    const advance = (t: number) => {
      if (charges >= CHARGES_MAX) { at = t; return; }
      progress += t - at;
      while (progress >= CHARGE_MS && charges < CHARGES_MAX) {
        progress -= CHARGE_MS;
        charges++;
        const filled = t - progress;
        set(filled);
        if (charges === CHARGES_MAX) { cap = { startMs: filled, endMs: filled, refunds: [] }; progress = 0; }
      }
      at = t;
    };
    for (const c of casts) {
      advance(c.timestamp);
      if (spend.has(c.abilityId)) {
        if (cap) { cap.endMs = c.timestamp; capped.push(cap); cap = undefined; }
        charges = Math.max(0, charges - 1);
        set(c.timestamp);
      } else if (refundIds.has(c.abilityId)) {
        if (cap) cap.refunds.push(c.timestamp);
        else {
          progress += CHARGE_REFUND_MS;
          advance(c.timestamp);
        }
      }
    }
    advance(ctx.endMs);
    if (cap) { cap.endMs = ctx.endMs; capped.push(cap); }
    // The opener spends the pre-pull charges within a few GCDs: that first
    // stretch at 3 isn't a loss unless it runs on.
    return { name, spenderId, steps, capped: capped.filter((w) => (w.endMs > w.startMs || w.refunds.length) &&
      !(w.startMs === firstAct && w.endMs - firstAct <= OPENER_GRACE_MS)) };
  };
  return [
    run("Double Check", new Set(ids("DOUBLE_CHECK", "GAUSS_ROUND")), A.DOUBLE_CHECK.id),
    run("Checkmate", new Set(ids("CHECKMATE", "RICOCHET")), A.CHECKMATE.id),
  ];
}
const mchCharges: JobCheck = (ctx) => {
  const out: DamageFinding[] = [];
  for (const track of mchChargeTracks(ctx)) {
    const value = ctx.values.perUse(track.spenderId);
    if (value <= 0) continue;
    for (const w of track.capped) {
      const forcedMs = forcedPart(w.startMs, w.endMs, ctx.forced).ms;
      const refunds = w.refunds.filter((t) => !inWindows(t, ctx.forced)).length;
      const lostMs = Math.max(0, w.endMs - w.startMs - forcedMs) + refunds * CHARGE_REFUND_MS;
      const lost = (lostMs / CHARGE_MS) * value;
      if (lostMs < 1_000 || lost < 1) continue;
      out.push(finding(ctx, {
        kind: "cooldown-drift", startMs: w.startMs, endMs: w.endMs, forced: false, inference: true,
        label: `${track.name} at 3 charges`, lostDamage: lost,
        basis: `${s(lostMs)} of recharge lost (${s(Math.max(0, w.endMs - w.startMs - forcedMs))} at 3 charges` +
          `${refunds ? `, ${refunds} Blazing Shot refund${refunds === 1 ? "" : "s"} of 15s` : ""}) ÷ 30s × ${k(value)} average ${track.name}`,
        detail: `${track.name} sat at 3 charges ${clock(w.startMs)}-${clock(w.endMs)}` + (forcedMs > 0 ? ` (${s(forcedMs)} of it forced, not counted)` : ""),
      }));
    }
  }
  return out;
};

// Reassemble (xivanalysis Reassemble.tsx): its sure crit and direct hit
// belong on Chain Saw, Excavator, Air Anchor or Drill (Scattergun on
// several targets). The GCD at the status's removal consumed it. On
// another GCD it loses (her best of those averages − that GCD's average) ×
// what a sure crit and direct hit add over her average roll. One that ran
// out is checkProcs's (it caught RaM97t3whCZrJBPm 2:47.9). 449 of 464
// Reassembles on disk went on the four; the three that ran out all sit in
// Red Hot and Deep Blue's 2:47 downtime (forced).
const REASSEMBLE_GOOD = ["CHAIN_SAW", "EXCAVATOR", "AIR_ANCHOR", "DRILL", "SCATTERGUN"];
const MCH_GCDS = ["CHAIN_SAW", "EXCAVATOR", "AIR_ANCHOR", "DRILL", "SCATTERGUN", "BIOBLASTER", "BLAZING_SHOT", "HEAT_BLAST",
  "AUTO_CROSSBOW", "HEATED_SPLIT_SHOT", "HEATED_SLUG_SHOT", "HEATED_CLEAN_SHOT", "FULL_METAL_FIELD"];
const reassemble: JobCheck = (ctx) => {
  const out: DamageFinding[] = [];
  const good = new Set(ids(...REASSEMBLE_GOOD));
  const gcds = new Set(ids(...MCH_GCDS));
  const best = Math.max(0, ...ids("CHAIN_SAW", "EXCAVATOR", "AIR_ANCHOR", "DRILL").map((x) => ctx.values.perUse(x)));
  const critMult = critMultOf(ctx), roll = rollGainOf(ctx, critMult);
  const share = Math.max(0, (critMult * 1.25) / roll - 1);
  const shareText = `${Math.round(share * 100)}% (a sure crit and direct hit over her average roll)`;
  for (const e of ctx.player.buffs ?? []) {
    if (e.abilityId !== S.REASSEMBLED.id || e.buffStatus !== "removed" || e.source !== ctx.player.name || e.timestamp >= ctx.endMs) continue;
    const used = ctx.player.casts.find((c) => gcds.has(c.abilityId) && Math.abs(c.timestamp - e.timestamp) <= 100);
    // One that ran out (no GCD at its removal) is checks.ts checkProcs's.
    if (!used || good.has(used.abilityId)) continue;
    const lost = Math.max(0, best - ctx.values.perUse(used.abilityId)) * share;
    if (lost < 1) continue;
    out.push(finding(ctx, {
      kind: "burst-window", startMs: e.timestamp, endMs: e.timestamp, forced: false, inference: true,
      label: `Reassemble on ${used.abilityName}`, lostDamage: lost,
      basis: `(${k(best)} her best of Chain Saw / Excavator / Air Anchor / Drill − ${k(ctx.values.perUse(used.abilityId))} average ${used.abilityName}) × ${shareText}`,
      detail: `Reassemble spent on ${used.abilityName}`,
    }));
  }
  return out;
};

export const MCH_CHECKS: JobCheck[] = [wildfire, hypercharge, mchAoe, fromLevel(96, mchGauges), fromLevel(90, reassemble), fromLevel(92, mchCharges)];
