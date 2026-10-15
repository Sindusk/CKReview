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
//   (7.5, 2026-10-13). Until then Fountainfall counted as a filler and
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
//   Blue rankings; not yet matched against xivanalysis.
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
//   measured delay). Open: Empyreal Arrow 67/69 (31.7s held; the drift
//   cap hides it, docs/open-items.md "cooldown room"). Not adopted: DoT
//   clipping 37s a minute (P3's two bosses plus Iron Jaws snapshots);
//   DoTs before invulnerability (3:04 and 11:46 are dot-clip findings,
//   5:40 ticked to 6:15); Army's Muse 3/5 and 4/5 (the burst windows'
//   GCD counts already hold them).
//   6XaWqwMbkZG9pLmx Vamp Fatale (7.4, user, 2026-10-13): after both DoTs
//   lapse (Coffinmaker's death at 1:58) one goes on a GCD after the other,
//   in either order; Stormbite's 5.0s gap read as lost. Now each DoT's
//   uptime grace adds a GCD when the other was applied first (pairedIds).
// Machinist (unverified): Wildfire on the enemy, 6 GCDs (Wildfire.tsx);
//   Hypercharge (Overheated), 5 Heat Blasts / Blazing Shots / Auto
//   Crossbows (Hypercharge.tsx), each missing one its average; cooldowns
//   (GeneralCDDowntime.tsx). Double Check / Checkmate are left out:
//   Heat Blast refunds their cooldown, which the drift check doesn't model.
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
import type { DamageFinding, JobCheck } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { aoeComboOnOneTarget, baseValue, burstWindowFindings, critMultOf, dotFindings, k, rollGainOf, s, statusWindows, type ExpectedAction } from "./shared";
import { forcedPart, inWindows, mergeWindows } from "../../timeline";
import { espritGauge, featherGauge } from "./gauges";

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
  expected: (_ctx, casts): ExpectedAction[] => [
    ...TECH_EXPECTED.map(([key, count]) => ({ ids: ids(key), count, name: A[key].name, value: replacedGcd(key) })),
    { ids: ids(...SABERS), count: sabersExpected(casts), name: "Last Dance / Saber Dance", value: replacedGcd("SABER_DANCE") },
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
  ["FELL_CLEAVE", "MAIM"],
] as const).filter(([a, b]) => A[a] && A[b]).map(([a, b]) => [A[a].id, A[b].id]));

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

const wildfire: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.WILDFIRE.id, name: "Wildfire", bonus: 0, onEnemy: true,
  bonusBasis: "Wildfire adds potency per weaponskill landed; a missing one is valued at the player's average GCD (not yet checked against a log)",
  expectedGcds: () => 6,
  expected: () => [],
});

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

export const DNC_CHECKS: JobCheck[] = [technical, technicalFillers, dancerOverwrites, dancerGaugeEstimates, dancerAoe, dancerDances];
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

export const MCH_CHECKS: JobCheck[] = [wildfire, hypercharge, mchAoe];
