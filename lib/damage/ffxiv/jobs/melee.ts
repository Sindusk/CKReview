// lib/damage/ffxiv/jobs/melee.ts
//
// Melee checks (melee batch). Positionals, broken combos and disengage
// GCDs (Enpi, Writhing Snap, ...) are generic engine checks
// (lib/damage/checks.ts); this file holds each job's own windows and buff
// uptimes, ported from xivanalysis src/parser/jobs/<job>/modules/:
//
// Samurai (verified on dQ8wmb1VhKt6yBXk):
//   - Fugetsu uptime (Buffs.tsx). +13%: FFLogs' multiplier for Standard
//     Finish + Fugetsu is 1.19 = 1.05 × 1.13.
//   - Meikyo Shisui (Meikyo.tsx): three Sen GCDs per window. A missing one
//     loses a Sen, valued at a third of the player's average Midare or
//     Tendo Setsugekka (inference).
// Viper, checked against xivanalysis on K6qfMamL7rN8yz2Q Vamp Fatale (7.4,
// 2026-10-14): the death at 5:30 (and its Weakness) and its 6 positional
// misses match; the coil left at the kill (gained 8:36, ~2 GCDs before
// the 8:41.5 check) read as forced because leftovers were judged at the
// kill's instant (shared.ts gaugeFindings now judges the time held; 58k).
// Not adopted, all from the death: Honed Reavers / Hindstung Venom dropped
// at 5:28.3 with every buff; the 6:04 Serpent's Ire and 6:06 tincture with
// one Reawaken (the gauge emptied; the free one was all there was);
// Vicewinder 13/14 (two charges banked while dead); Uncoiled Fury 15/18
// (coils lost at the death, plus the one at the kill). Built: the Rattling
// Coil and Serpent Offerings lanes (jobs/gauges.ts; 20 Offerings over
// the cap, under its 25 threshold). Feint, Bloodbath, Second Wind: mitigation.
// Viper (verified on dQ8wmb1VhKt6yBXk):
//   - Hunter's Instinct uptime (Buffs.tsx), +10% (multiplier 1.10).
//   - Reawaken (Reawaken.tsx): four Generations, four Legacies, one
//     Ouroboros. A missing Legacy is lost outright (its average); a missing
//     Generation or Ouroboros is its average minus the GCD used instead.
//   - Venoms and Honed buffs, Rattling Coil (below), and positionals (the
//     finishers' miss value, game.ts POSITIONAL_MISSED_EXTRA). Checked
//     against xivanalysis on 2T1HzdPKgbhM43am Dancing Mad fight 10
//     (2026-10-09): venoms 7, Honed 3 + 1 overwrite, coils 3 + 3 left,
//     positionals and the Reawaken at 6:05 all match. Not built: Serpent's
//     Ire pooling (9 actions) and Death Rattle (1).
//     Rechecked on qjCMx4bRfgNKwX9T fight 16 (7.5, 2026-10-13): Honed
//     Reavers 30/31 (7:17 expiry), Third Legacy 24/25 (0:55), the 6:06
//     Reawaken cut to two Generations (Kefka hit 0% at 6:15, after the
//     window's natural end), 1 coil left at the kill, 8 positionals and
//     the 16:02 combo all match. Fixed: the 18:27 Reawaken, ended by an
//     early Ouroboros 1.6s before the kill, read as 2 Generations + 2
//     Legacies missing (158k); a window whose full span runs past the
//     kill is skipped now (spanMs). Not adopted: "8 missed in Serpent's
//     Ire windows" (at 2:01, 4:01, 8:02 and 18:16 the first Reawaken was
//     pressed one GCD before Serpent's Ire; both are inside the buffs;
//     6:02 is the cut Reawaken; 14:03's second one would land past P4's
//     HP check at 14:09); Vicewinder 28/29 (its banked charge capped in
//     P2's downtime, 35s held in all, under one 40s recharge).
// Monk (checked against xivanalysis on qjCMx4bRfgNKwX9T fight 16, 7.5,
// 2026-10-13, the first Monk sample):
//   - Riddle of Fire (RiddleOfFire.tsx): 11 GCDs; +15% (FFLogs multiplier
//     1.16 beside 1.01 from a Bard song outside it); Masterful Blitzes,
//     one per Perfect Balance it had time for (blitzesExpected, below).
//   - Matches: its 3 short windows (3:02, 6:02, 7:03; past HP checks or
//     downtime, forced), 7 positionals, the 13:02 delay. Built: Blitzes in
//     Riddle of Fire. The opener's second Perfect Balance came at 0:17 and
//     its Elixir Burst at 0:24, 1.2s after Riddle of Fire (27k); 12:04's at
//     12:28 (forced: 5s of that window was the P3-P4 transition).
//   - Not adopted: 18:17 Blitz and "1 Perfect Balance GCD" (cut by the
//     kill; Six-sided Star to finish is right); Riddle of Wind 12/13 (66s
//     held in all, under one 90s recharge; room is 12); 11:49 and the 12:02
//     triple weave (end-of-P3 hold). Not built: "Perfect Balance after
//     Opo-opo 22/29" (form order; its cost depends on the Blitz planned
//     and isn't measurable from one press).
//   - Dragoon (checked against xivanalysis on jN3XDrf2z8PmLgRJ Vamp pull 8:
//     Lance Charge and positionals match): Power Surge uptime, +10%
//     (tooltip); Chaotic Spring DoT uptime; Life Surge (below); Lance Charge
//     (LanceCharge.tsx): 8 GCDs plus High Jump, Mirage Dive, Dragonfire
//     Dive, Rise of the Dragon, Geirskogul, Nastrond, Stardiver and
//     Starcross, +10% (tooltip); Firstminds' Focus overcap (below).
//     Rechecked on 2T1HzdPKgbhM43am Dancing Mad fight 10 (2026-10-09):
//     its 9 missed Lance Charge GCDs and 13 missed positionals match; most
//     of the GCDs were in forced windows. Life of the Dragon and Battle
//     Litany windows aren't separate checks: they fall with Lance Charge.
//     Rechecked on qjCMx4bRfgNKwX9T Dancing Mad kill (7.5, 2026-10-13):
//     its 17 missed positionals match by action (Chaotic Spring 7,
//     Wheeling Thrust 5, Fang and Claw 5), as do Power Surge, the one
//     poor Life Surge (Lance Barrage, 14:13) and the 2.8s gap at 13:44.
//     Its missed window GCDs are all at 3:01-3:03, 6:03, 7:06 and 14:08,
//     which run into downtime or past an HP check (forced here). Not
//     adopted: "Chaotic Spring before invulnerability" (it's a combo
//     step, not an optional DoT GCD).
//     Rechecked on K6qfMamL7rN8yz2Q Vamp Fatale (7.4, 2026-10-14). Matched:
//     its 5 missed positionals by time, Power Surge (93.7%), Chaotic
//     Spring uptime, every Lance Charge / Battle Litany window full, its
//     GCD downtimes by time (most are Bombpyre / saws movement, or Piercing
//     Talons forced out of reach). Built: Life of the Dragon, +15% (below;
//     its 5:11 and 7:12 at 7/8); Life Surge drift valued as a forced crit
//     (tracked-cooldowns.ts; its 13/14, 1 use, 25k); the Firstminds' Focus
//     lane (jobs/gauges.ts; 0 lost, as it says). Not adopted: Chaotic
//     Spring before invulnerability (above); Feint, Bloodbath, Second Wind.
//   - Ninja: Kunai's Bane window, Ninki and Kazematoi (below). Checked
//     against xivanalysis on dDar482XvFKBPJYh FRU kill (7.1, 2026-10-12):
//     its 9 Kazematoi lost and 1 unbuffed Aeolian Edge match; Ninki ~300
//     simulated vs its 250; Bunshin 2 lost (its 3 counts burst
//     alignment); Dokumori, Ten Chi Jin and Meisui's missing uses were
//     ready a few seconds before P4's downtime and held for the 14:17
//     burst (no extra use fit before the kill); Armor Crush under Kunai's
//     Bane with stacks isn't built (the stack goes to a later Aeolian
//     Edge: ~10% of 100 potency each).
//   - Reaper: Enshroud (Enshroud.tsx): four Reapings, two Lemure's, one
//     Sacrificium, one Communio. Arcane Circle, Death's Design, Harvest
//     Moon, Shroud and Whorl of Death below. Checked against xivanalysis
//     on dDar482XvFKBPJYh FRU kill (7.1, 2026-10-12): its 27 missing
//     Arcane Circle actions, 10 Shroud lost, 8 positionals, 4 expired
//     combos and Whorl of Death match; its Soul Slice 36/38 recharged
//     through P4's downtime with nothing banked (not counted); its Arcane
//     Circle 9/10 was ready 18s before that downtime and held for the
//     14:18 burst.
//
//   Copyright (c) 2018 Saxon Landers & contributors
//   MIT License; full text in THIRD_PARTY_NOTICES.md.

import { XIVA_ACTIONS as A, XIVA_STATUSES as S } from "../xiva-data";
import type { DamageFinding, JobCheck } from "../../types";
import { chargesAt, finding, PROC_CONSUME_MS, PROC_EXPIRY_EARLY_MS, type PlayerCheckContext } from "../../checks";
import { forcedPart, inWindows, mergeWindows } from "../../timeline";
import { aoeOnOneTargetFindings, burstWindowFindings, castHits, dotFindings, gaugeFindings, k, offCooldownIn, s, statusWindows, uptimeFindings, type ExpectedAction, type GaugeEvent, type GaugeSpec } from "./shared";
import { comboLanded } from "./gnb";

const id = (key: string) => A[key].id;
const ids = (...keys: string[]) => keys.filter((key) => A[key]).map(id);

/** A missing GCD that was replaced by another: its average minus the player's average GCD. */
const replacedGcd = (...keys: string[]) => (ctx: PlayerCheckContext) =>
  Math.max(0, Math.max(...ids(...keys).map((x) => ctx.values.perUse(x))) - ctx.values.gcdValue(undefined, false));
/** A missing oGCD is simply lost. */
const lostOgcd = (...keys: string[]) => (ctx: PlayerCheckContext) =>
  Math.max(...ids(...keys).map((x) => ctx.values.perUse(x)));

const uptime = (statusKey: string, bonus: number, bonusBasis: string,
  refresh?: { cost: (ctx: PlayerCheckContext, fromMs: number, toMs: number) => number; reapplyGcds: number; restartIds?: number[] }): JobCheck => (ctx) => {
  const windows = statusWindows(ctx, S[statusKey].id);
  if (windows.length === 0) return [];
  return uptimeFindings(ctx, {
    name: S[statusKey].name, bonus, bonusBasis,
    active: windows, fromMs: windows[0].startMs, graceMs: 2_500,
    refreshCost: refresh?.cost, reapplyMs: refresh ? refresh.reapplyGcds * ctx.baseGcdMs : undefined,
    restartIds: refresh?.restartIds,
  });
};

// ── Samurai ────────────────────────────────────────────────────────────

const meikyo: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.MEIKYO_SHISUI.id, name: "Meikyo Shisui", bonus: 0, inference: true,
  bonusBasis: "a missing Sen GCD is valued at a third of the player's average Midare / Tendo Setsugekka",
  expected: () => [{
    ids: ids("GEKKO", "KASHA", "YUKIKAZE", "MANGETSU", "OKA"), count: 3, name: "Sen GCD",
    value: (c) => Math.max(c.values.perUse(id("MIDARE_SETSUGEKKA")), c.values.perUse(id("TENDO_SETSUGEKKA"))) / 3,
  }],
});

// ── Viper ──────────────────────────────────────────────────────────────

const reawaken: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.REAWAKENED.id, name: "Reawaken", bonus: 0,
  // Reawaken's own GCD (2.2s) and four Generations (2.0s), at the player's
  // speed; Ouroboros ends it. On qjCMx4bRfgNKwX9T fight 16 the 18:27 one
  // had 6.9s left and went First, Second, Ouroboros: right at a kill.
  spanMs: (c) => ((A.REAWAKEN.gcdRecast ?? 2200) + 4 * (A.FIRST_GENERATION.gcdRecast ?? 2000)) * c.factor,
  bonusBasis: "a missing Generation or Ouroboros = its average minus the GCD used instead; a missing Legacy = its average",
  expected: (): ExpectedAction[] => [
    { ids: ids("FIRST_GENERATION", "SECOND_GENERATION", "THIRD_GENERATION", "FOURTH_GENERATION"), count: 4, name: "Generation",
      value: replacedGcd("FIRST_GENERATION", "SECOND_GENERATION", "THIRD_GENERATION", "FOURTH_GENERATION") },
    { ids: ids("FIRST_LEGACY", "SECOND_LEGACY", "THIRD_LEGACY", "FOURTH_LEGACY"), count: 4, name: "Legacy",
      value: lostOgcd("FIRST_LEGACY", "SECOND_LEGACY", "THIRD_LEGACY", "FOURTH_LEGACY") },
    { ids: ids("OUROBOROS"), count: 1, name: "Ouroboros", value: replacedGcd("OUROBOROS") },
  ],
});

// Venoms and Honed buffs (xivanalysis Venoms / Honed procs): each boosts
// one action by 100 potency and falls off when another combo step goes
// first. The generic proc check missed those drops (the removal sits on a
// cast, so it read as consumed) and valued an expiry at the whole finisher,
// though the finisher is still pressed. On 2T1HzdPKgbhM43am fight 10 the
// Hindstung drops are Hindsbane Fangs pressed instead (2:02, 4:45, 11:35,
// 12:04) plus one expiry (13:17): xivanalysis's 5.
const VENOM_PROCS: [status: string, consumer: string, share: number][] = [
  // 500 vs 400 potency (combo, positional) from the finishers' potency tables.
  ["HINDSTUNG_VENOM", "HINDSTING_STRIKE", 0.2],
  ["HINDSBANE_VENOM", "HINDSBANE_FANG", 0.2],
  ["FLANKSTUNG_VENOM", "FLANKSTING_STRIKE", 0.2],
  ["FLANKSBANE_VENOM", "FLANKSBANE_FANG", 0.2],
  // Steel Fangs / Reaving Fangs: 300 vs 200 (tooltip).
  ["HONED_STEEL", "STEEL_FANGS", 1 / 3],
  ["HONED_REAVERS", "REAVING_FANGS", 1 / 3],
];

/** Statuses the venom check owns; the generic proc check skips them (game.ts). */
export const VPR_PROC_STATUS_IDS = new Set(VENOM_PROCS.map(([st]) => S[st]?.id).filter((x): x is number => x !== undefined));

/** Melee statuses the generic proc check skips (game.ts): the venoms (their
 *  own check) and Dragoon's Enhanced Piercing Talon, a ranged insurance the
 *  Dragoon banks for a bad outcome, never a loss when it expires (user,
 *  2026-10-13; yBKPqGwHparm7Tk4 fight 5 flagged one at 1:50). */
export const MELEE_PROC_SKIP_IDS = new Set([...VPR_PROC_STATUS_IDS, S.ENHANCED_PIERCING_TALON.id]);

const venoms: JobCheck = (ctx) => {
  const out: DamageFinding[] = [];
  const forced = mergeWindows(ctx.forced);
  const gcdCasts = ctx.player.casts.filter((c) => ctx.game.action(c.abilityId)?.onGcd);
  for (const [statusKey, consumerKey, share] of VENOM_PROCS) {
    const status = S[statusKey], consumer = A[consumerKey];
    if (!status || !consumer) continue;
    const value = ctx.values.perUse(consumer.id) * share;
    if (value <= 0) continue;
    const lose = (t: number, how: string) => {
      const isForced = inWindows(t, forced);
      out.push(finding(ctx, {
        kind: "proc-lost", startMs: t, endMs: t, forced: isForced,
        cause: isForced ? forcedPart(t - 1, t + 1, ctx.forced).cause : undefined,
        label: `${status.name} ${how.startsWith("dropped") ? "dropped" : how}`,
        lostDamage: value,
        basis: `${k(ctx.values.perUse(consumer.id))} average ${consumer.name} × ${Math.round(share * 100)}% (its 100 potency bonus)`,
        detail: `${status.name} ${how}`,
      }));
    };
    let expiresAt: number | undefined;
    for (const e of [...(ctx.player.buffs ?? [])].sort((a, b) => a.timestamp - b.timestamp)) {
      if (e.abilityId !== status.id || e.source !== ctx.player.name || e.timestamp >= ctx.endMs) continue;
      if (e.buffStatus === "applied" || e.buffStatus === "refreshed") {
        if (expiresAt !== undefined && e.timestamp < expiresAt - PROC_EXPIRY_EARLY_MS) lose(e.timestamp, "overwritten before use");
        expiresAt = e.durationMs ? e.timestamp + e.durationMs : undefined;
      } else if (e.buffStatus === "removed") {
        const at = gcdCasts.find((c) => Math.abs(c.timestamp - e.timestamp) <= PROC_CONSUME_MS);
        if (at && at.abilityId !== consumer.id && !inWindows(e.timestamp, ctx.dead)) lose(e.timestamp, `dropped: ${at.abilityName} went first`);
        // No upper bound: the 13:17 removal logged 1.6s after its 60s ran
        // out, past the generic check's 1.5s.
        else if (!at && expiresAt !== undefined && e.timestamp >= expiresAt - PROC_EXPIRY_EARLY_MS &&
          !inWindows(e.timestamp, ctx.dead)) lose(e.timestamp, "expired unused");
        expiresAt = undefined;
      }
    }
  }
  return out;
};

// ── Monk, Dragoon, Ninja, Reaper (unverified) ──────────────────────────

// Blitzes in Riddle of Fire, from xivanalysis BlitzEvaluator.tsx: one per
// Perfect Balance it had time for, at most two: the charges held when the
// window opened, one already running, and one regained 8s or more before
// it ended (room for 3 Balance GCDs and the Blitz). A late one was pressed
// after the window, so it costs the window's bonus on it.
const BLITZ_KEYS = ["TORNADO_KICK", "ELIXIR_FIELD", "CELESTIAL_REVOLUTION", "FLINT_STRIKE", "RISING_PHOENIX", "PHANTOM_RUSH", "ELIXIR_BURST"];
const BLITZ_END_TOLERANCE_MS = 8_000;

function blitzesExpected(ctx: PlayerCheckContext, w: { startMs: number; endMs: number }): number {
  const pb = A.PERFECT_BALANCE;
  const cd = pb.cooldown ?? 40_000, max = pb.charges ?? 2;
  const casts = ctx.player.casts.filter((c) => c.abilityId === pb.id).map((c) => c.timestamp);
  const held = chargesAt(casts.filter((t) => t < w.startMs), cd, max, w.startMs);
  const running = statusWindows(ctx, S.PERFECT_BALANCE.id).some((b) => b.startMs < w.startMs && b.endMs > w.startMs);
  const regained = chargesAt(casts, cd, max, w.endMs - BLITZ_END_TOLERANCE_MS) >
    chargesAt(casts.filter((t) => t < w.startMs), cd, max, w.startMs) - casts.filter((t) => t >= w.startMs && t < w.endMs - BLITZ_END_TOLERANCE_MS).length;
  return Math.min(2, held + (running ? 1 : 0) + (regained ? 1 : 0));
}

const riddleOfFire: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.RIDDLE_OF_FIRE.id, name: "Riddle of Fire", bonus: 0.15,
  bonusBasis: "Riddle of Fire is +15% (FFLogs multiplier 1.16 against 1.01 outside it)",
  expectedGcds: () => 11,
  expected: () => [{
    ids: ids(...BLITZ_KEYS.filter((key) => A[key])), count: 0, countIn: blitzesExpected, name: "Masterful Blitz",
    // The player's average Blitz (a late one still landed, so the window's
    // bonus on it is the loss).
    value: (c) => {
      const used = ids(...BLITZ_KEYS.filter((key) => A[key])).map((i) => ({ v: c.values.perUse(i), n: c.player.casts.filter((x) => x.abilityId === i).length }));
      const n = used.reduce((a, u) => a + u.n, 0);
      return n > 0 ? used.reduce((a, u) => a + u.v * u.n, 0) / n : 0;
    },
    scaled: true,
  }],
});

const lanceCharge: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.LANCE_CHARGE.id, name: "Lance Charge", bonus: 0.1,
  bonusBasis: "Lance Charge is +10% (tooltip; not yet checked against a log)",
  expectedGcds: () => 8,
  expected: () => ["HIGH_JUMP", "MIRAGE_DIVE", "DRAGONFIRE_DIVE", "RISE_OF_THE_DRAGON", "GEIRSKOGUL", "NASTROND", "STARDIVER", "STARCROSS"]
    .filter((key) => A[key]).map((key): ExpectedAction => ({
      ids: [id(key)], count: 1, name: A[key].name,
      // Follow-ups are available when what grants them was.
      availableIf: key === "RISE_OF_THE_DRAGON" ? (c, w, cycle) => offCooldownIn(c, ids("DRAGONFIRE_DIVE"), w, cycle)
        : key === "MIRAGE_DIVE" ? (c, w, cycle) => offCooldownIn(c, ids("HIGH_JUMP"), w, cycle)
        : undefined,
    })),
});

// Life of the Dragon (xivanalysis BloodOfTheDragon.tsx): 8 GCDs in the 20s
// from each Geirskogul. It's +15%: the FFLogs multiplier with only it and
// Power Surge is 1.26 (1.10 × 1.15), with Lance Charge too 1.39, on all
// three Vamp Fatale kills checked (K6qfMamL7rN8yz2Q, grK2z6ptfZWGmVdj,
// vVPtwaTQ62Jg391q). The status (1003177) is in the hit snapshots only,
// never the buff stream, so the window is the Geirskogul cast + 20s (the
// last hit carrying it lands 19-21.6s after, hits trailing their casts).
// GCDs only: its oGCDs are Lance Charge's (above), which starts ~2s
// before it, so they'd be counted twice. K6qfMamL7rN8yz2Q: 5:11 and 7:12
// at 7/8, xivanalysis's two.
const LOTD_MS = 20_000;
const lifeOfTheDragon: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: 1_003_177, name: "Life of the Dragon", bonus: 0.15,
  bonusBasis: "Life of the Dragon is +15% (FFLogs multiplier: 1.26 with Power Surge alone)",
  windows: (c) => c.player.casts.filter((x) => x.abilityId === id("GEIRSKOGUL"))
    .map((x) => ({ startMs: x.timestamp, endMs: x.timestamp + LOTD_MS })),
  expectedGcds: () => 8,
  expected: () => [],
});

// Life Surge (xivanalysis LifeSurge.ts): its guaranteed crit belongs on
// Drakesbane or Heavens' Thrust (Coerthan Torment in AoE). The GCD that
// consumed it is the cast at the status's removal. xivanalysis also
// accepts the other strong steps, Fang and Claw, Wheeling Thrust and
// Chaotic Spring: its consumer table for jN3XDrf2z8PmLgRJ Vamp pull 8
// (Drakesbane 6, Heavens' Thrust 1, Fang and Claw 3, Chaotic Spring 1,
// Other 4) matches the log, and only the 4 "Other" (Raiden Thrust ×2,
// Lance Barrage, Spiral Blow) were called non-optimal. Those lose (the
// best GCD's average − its average) × the crit's share, estimated as for
// crit buffs (lib/damage/buffs.ts: ×1.55 at a 25% base rate, so a forced
// crit adds 36% over an average hit). Marked inference.
const LIFE_SURGE_GOOD = ["DRAKESBANE", "HEAVENS_THRUST", "COERTHAN_TORMENT", "FANG_AND_CLAW", "WHEELING_THRUST", "CHAOTIC_SPRING"];
export const FORCED_CRIT_SHARE = (1.55 - (1 + 0.25 * 0.55)) / (1 + 0.25 * 0.55);

const lifeSurge: JobCheck = (ctx): DamageFinding[] => {
  const out: DamageFinding[] = [];
  const good = new Set(ids(...LIFE_SURGE_GOOD));
  const best = Math.max(...ids("DRAKESBANE", "HEAVENS_THRUST").map((x) => ctx.values.perUse(x)));
  for (const e of ctx.player.buffs ?? []) {
    if (e.abilityId !== S.LIFE_SURGE.id || e.buffStatus !== "removed" || e.source !== ctx.player.name || e.timestamp >= ctx.endMs) continue;
    const used = ctx.uses.find((u) => Math.abs(u.startMs - e.timestamp) <= 100);
    if (!used || good.has(used.action.id)) continue;
    const lost = Math.max(0, best - ctx.values.perUse(used.action.id)) * FORCED_CRIT_SHARE;
    if (lost <= 0) continue;
    out.push(finding(ctx, {
      kind: "burst-window", startMs: e.timestamp, endMs: e.timestamp, forced: false, inference: true,
      label: `Life Surge on ${used.abilityName}`,
      lostDamage: lost,
      basis: `(${k(best)} best of Drakesbane / Heavens' Thrust − ${k(ctx.values.perUse(used.action.id))} average ${used.abilityName}) × ` +
        `${Math.round(FORCED_CRIT_SHARE * 100)}% (a forced crit over an average hit, estimated)`,
      detail: `Life Surge spent on ${used.abilityName}, a weak combo step`,
    }));
  }
  return out;
};

// Chaotic Spring and Power Surge both come from the Spiral Blow route; going
// that way in place of Lance Barrage → Heavens' Thrust costs the difference.
function drgSpiralRouteCost(ctx: PlayerCheckContext): number {
  const v = (...keys: string[]) => ids(...keys).reduce((a, x) => a + ctx.values.perUse(x), 0);
  return v("LANCE_BARRAGE", "HEAVENS_THRUST") - v("SPIRAL_BLOW", "CHAOTIC_SPRING");
}

// Power Surge down in a stretch forced time cuts off (from → to): the
// choice was the Lance Barrage pressed after a Raiden Thrust, which Spiral
// Blow could have replaced. The first such slot whose Power Surge would
// reach into the stretch is the counterfactual: Spiral there (the route
// cost), Power Surge from its hit (the bonus before that couldn't be had:
// added to the cost), Chaotic Spring a GCD later (its ticks to the cut,
// where the DoT was off: taken off the cost). So Power Surge + DoT − route
// is counted once: the DoT check values its own cut stretch at ticks −
// route, ≤ 0 unless long. No such slot: nothing could be done (cost ∞).
// yBKPqGwHparm7Tk4 fight 5 (user, 2026-10-13):
// - 6:04.5 Lance Barrage again instead of Spiral Blow: Power Surge off
//   6:10.9-6:16.9 (~39k) + 3 ticks (~21k) − route (~37k) ≈ 23k.
// - 3:06.4: Spiral there restores it only from ~3:07.1 and the DoT lands
//   ~3:09.6, no tick before the check at 3:10.7: worth less than the route.
const DOT_TICK_MS = 3_000;
const SPIRAL_HIT_MS = 700;
const POWER_SURGE_MS = 30_000;
function drgPowerSurgeRefreshCost(ctx: PlayerCheckContext, fromMs: number, toMs: number): number {
  const raiden = new Set(ids("RAIDEN_THRUST", "TRUE_THRUST"));
  const barrage = new Set(ids("LANCE_BARRAGE", "VORPAL_THRUST"));
  const uses = ctx.uses;
  // Only a slot that broke the alternation (Lance Barrage after a Lance
  // Barrage route) is a choice: Spiral Blow twice in a row to stretch
  // Power Surge isn't something a Dragoon would be asked to do (3:05 here:
  // Spiral 2:33.9, Lance Barrage 2:49.5 was the rotation; the second Lance
  // Barrage at 3:06.4 was the choice). The first such slot that could have
  // had it up in the stretch: before it, nothing could; after it, later
  // slots keep it going.
  const spiral = new Set(ids("SPIRAL_BLOW", "DISEMBOWEL"));
  let prevRoute: "spiral" | "barrage" | undefined;
  let slot: (typeof uses)[number] | undefined;
  for (let i = 1; i < uses.length && !slot; i++) {
    const u = uses[i];
    if (!raiden.has(uses[i - 1].action.id)) continue;
    const route = barrage.has(u.action.id) ? "barrage" : spiral.has(u.action.id) ? "spiral" : undefined;
    if (!route) continue;
    if (route === "barrage" && prevRoute === "barrage" && u.startMs < toMs && u.startMs + POWER_SURGE_MS >= fromMs) slot = u;
    prevRoute = route;
  }
  if (!slot) return Infinity;
  const psFrom = slot.startMs + SPIRAL_HIT_MS;
  const early = psFrom > fromMs ? ctx.values.damageIn(fromMs, Math.min(psFrom, toMs)) * 0.1 : 0;
  const route = drgSpiralRouteCost(ctx) + early;
  const from = slot.startMs + ctx.baseGcdMs + SPIRAL_HIT_MS;
  const evs = (ctx.pull.bossDebuffs ?? [])
    .filter((e) => e.statusId === S.CHAOTIC_SPRING.id && e.sourceName === ctx.player.name)
    .sort((a, b) => a.timestamp - b.timestamp);
  const duration = S.CHAOTIC_SPRING.duration ?? 24_000;
  const up: { startMs: number; endMs: number }[] = [];
  let lastApply: number | undefined, open: number | undefined;
  for (const e of evs) {
    if (e.status === "removed") { if (open !== undefined) up.push({ startMs: open, endMs: e.timestamp }); open = lastApply = undefined; continue; }
    if (open === undefined || (lastApply !== undefined && e.timestamp > lastApply + duration)) {
      if (open !== undefined && lastApply !== undefined) up.push({ startMs: open, endMs: lastApply + duration });
      open = e.timestamp;
    }
    lastApply = e.timestamp;
  }
  if (open !== undefined && lastApply !== undefined) up.push({ startMs: open, endMs: lastApply + duration });
  const merged = mergeWindows(up);
  const downMs = Math.max(0, toMs - Math.max(from, 0)) - merged.reduce((a, w) => a + Math.max(0, Math.min(w.endMs, toMs) - Math.max(w.startMs, from)), 0);
  const ticks = ctx.player.damageDone.filter((e) => e.abilityId === S.CHAOTIC_SPRING.id && e.isDoT);
  const avgTick = ticks.length ? ticks.reduce((a, e) => a + (e.amount ?? 0), 0) / ticks.length : 0;
  return route - Math.floor(downMs / DOT_TICK_MS) * avgTick;
}

const chaoticSpring: JobCheck = (ctx) => dotFindings(ctx, {
  statusIds: [S.CHAOTIC_SPRING.id], name: S.CHAOTIC_SPRING.name, durationMs: S.CHAOTIC_SPRING.duration ?? 24_000,
  // Before a downtime or a passed check, Chaotic Spring means the Spiral
  // Blow route instead of Lance Barrage → Heavens' Thrust (yBKPqGwHparm7Tk4
  // fight 5 at 3:01: ~33k for 2 ticks).
  applyCost: (ctx) => drgSpiralRouteCost(ctx),
  reapplyGcds: 2,   // Raiden Thrust, Spiral Blow
  restartIds: ids("RAIDEN_THRUST", "TRUE_THRUST"),
});

// Kunai's Bane, from xivanalysis KunaisBaneWindow.tsx: 7 GCDs, mudras not
// counted (with them, a 6/7 window read 7+), 8 with Ten Chi Jin in it;
// Hyosho Ranryu or Goka Mekkyaku once; Raiton twice (once in the opener,
// where one goes before the window for an extra Bhavacakra); Dream Within
// a Dream once; Tenri Jindo when Ten Chi Jin is in it.
const MUDRA_IDS = new Set(ids("TEN", "CHI", "JIN", "TEN_KASSATSU", "CHI_KASSATSU", "JIN_KASSATSU"));
const KB_OPENER_MS = 12_000;
const kunaisBane: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.KUNAIS_BANE.id, name: "Kunai's Bane", bonus: 0.1, onEnemy: true,
  bonusBasis: "Kunai's Bane is +10% damage taken (tooltip; not yet checked against a log)",
  ignoreGcdIds: MUDRA_IDS,
  expectedGcds: (_c, casts) => (casts.some((c) => c.abilityId === id("TEN_CHI_JIN")) ? 8 : 7),
  expected: (_c, casts) => {
    const opener = casts.length > 0 && casts[0].timestamp <= KB_OPENER_MS;
    const tcj = casts.some((c) => c.abilityId === id("TEN_CHI_JIN"));
    return [
      { ids: ids("DREAM_WITHIN_A_DREAM"), count: 1, name: "Dream Within a Dream" },
      { ids: ids("HYOSHO_RANRYU", "GOKA_MEKKYAKU"), count: 1, name: "Hyosho Ranryu" },
      { ids: ids("RAITON"), count: opener ? 1 : 2, name: "Raiton" },
      ...(tcj ? [{ ids: ids("TENRI_JINDO"), count: 1, name: "Tenri Jindo" }] : []),
    ];
  },
});

// Ninki (cap 100), from xivanalysis Ninki.tsx: +5 Spinning Edge, Gust
// Slash, Death Blossom, Hakke Mujinsatsu; +15 Aeolian Edge, Armor Crush
// (combo'd steps only, read from bonusPercent); +5 per Raiju and Throwing
// Dagger hit; +40 Mug / Dokumori; +50 Meisui; +5 per Bunshin shadow hit
// (+10 its Phantom Kamaitachi); −50 Bhavacakra, Zesho Meppo, Hellfrog,
// Deathfrog, Bunshin. Starts at 0; a death empties it. 50 Ninki is one
// average Bhavacakra.
const NINKI_COMBO = new Map([
  ...ids("SPINNING_EDGE", "GUST_SLASH", "DEATH_BLOSSOM", "HAKKE_MUJINSATSU").map((x) => [x, 5] as const),
  ...ids("AEOLIAN_EDGE", "ARMOR_CRUSH").map((x) => [x, 15] as const),
]);
const NINKI_HIT = new Map([
  ...ids("FORKED_RAIJU", "FLEETING_RAIJU", "THROWING_DAGGER").map((x) => [x, 5] as const),
  ...ids("MUG", "DOKUMORI").map((x) => [x, 40] as const),
]);
const NINKI_SPEND = new Set(ids("BHAVACAKRA", "ZESHO_MEPPO", "HELLFROG_MEDIUM", "DEATHFROG_MEDIUM", "BUNSHIN"));
const ninki: JobCheck = (ctx) => {
  const events: GaugeEvent[] = [];
  for (const c of ctx.player.casts) {
    const combo = NINKI_COMBO.get(c.abilityId);
    if (combo !== undefined && (c.abilityId === id("SPINNING_EDGE") || c.abilityId === id("DEATH_BLOSSOM") ||
      comboLanded(ctx, c.abilityId, c.timestamp))) {
      events.push({ t: c.timestamp, type: "gain", amount: combo, label: `${c.abilityName} at high Ninki` });
    }
    if (c.abilityId === id("MEISUI")) events.push({ t: c.timestamp, type: "gain", amount: 50, label: "Meisui at high Ninki" });
    if (NINKI_SPEND.has(c.abilityId)) events.push({ t: c.timestamp, type: "spend", amount: 50, label: c.abilityName });
  }
  // One gain per hit cast (several targets = one), from the player's hits.
  for (const [aid, amount] of NINKI_HIT) {
    for (const h of castHits(ctx, aid)) events.push({ t: h.timestamp, type: "gain", amount, label: `${h.abilityName} at high Ninki` });
  }
  for (const e of ctx.player.damageDone) {
    if (!e.pet || !(e.amount && e.amount > 0)) continue;
    events.push({ t: e.timestamp, type: "gain", amount: e.abilityId === id("PHANTOM_KAMAITACHI_BUNSHIN") ? 10 : 5, label: "Bunshin hit at high Ninki" });
  }
  for (const d of ctx.dead) events.push({ t: d.startMs, type: "reset", label: "death" });
  const perPoint = ctx.values.perUse(id("BHAVACAKRA")) / 50;
  return gaugeFindings(ctx, {
    name: "Ninki", unit: "Ninki", cap: 100, unitValue: perPoint,
    valueBasis: `${k(perPoint * 50)} average Bhavacakra per 50`,
    events,
  });
};

// Kazematoi (cap 5), from xivanalysis Kazematoi.tsx: a combo'd Armor
// Crush adds 2, Aeolian Edge spends 1. Stacks over the cap are lost, each
// worth one buffed Aeolian Edge over the Armor Crush that replaced it
// (the player's averages). An Aeolian Edge at 0 stacks loses the average
// Armor Crush minus that Aeolian Edge.
const kazematoi: JobCheck = (ctx) => {
  const ac = id("ARMOR_CRUSH"), ae = id("AEOLIAN_EDGE");
  const casts = ctx.player.casts.filter((c) => (c.abilityId === ac && comboLanded(ctx, ac, c.timestamp)) || c.abilityId === ae)
    .sort((a, b) => a.timestamp - b.timestamp);
  if (!casts.some((c) => c.abilityId === ae)) return [];
  const aeHits = castHits(ctx, ae), acAvg = ctx.values.perUse(ac);
  const hitOf = (t: number) => aeHits.find((h) => h.timestamp >= t && h.timestamp <= t + 1_500)?.amount ?? 0;
  let stacks = 0;
  const buffed: number[] = [];
  const unbuffed: { t: number; dealt: number }[] = [];
  const events: GaugeEvent[] = [];
  for (const c of casts) {
    if (inWindows(c.timestamp, ctx.dead)) continue;
    if (c.abilityId === ac) {
      events.push({ t: c.timestamp, type: "gain", amount: 2, label: "Armor Crush at 4+ Kazematoi" });
      stacks = Math.min(5, stacks + 2);
    } else if (stacks > 0) {
      events.push({ t: c.timestamp, type: "spend", amount: 1, label: "Aeolian Edge" });
      stacks--;
      buffed.push(hitOf(c.timestamp));
    } else {
      unbuffed.push({ t: c.timestamp, dealt: hitOf(c.timestamp) });
    }
  }
  for (const d of ctx.dead) events.push({ t: d.startMs, type: "reset", label: "death" });
  const buffedAvg = buffed.length ? buffed.reduce((a, x) => a + x, 0) / buffed.length : 0;
  const perStack = Math.max(0, buffedAvg - acAvg);
  const out = gaugeFindings(ctx, {
    name: "Kazematoi", unit: "Kazematoi", cap: 5, unitValue: perStack,
    valueBasis: `(${k(buffedAvg)} average buffed Aeolian Edge − ${k(acAvg)} average Armor Crush)`,
    events,
  });
  const forced = mergeWindows(ctx.forced);
  for (const u of unbuffed) {
    if (u.t >= ctx.endMs) continue;
    const lost = Math.max(0, acAvg - u.dealt);
    out.push(finding(ctx, {
      kind: "gauge-overcap", startMs: u.t, endMs: u.t, forced: inWindows(u.t, forced),
      label: "Aeolian Edge without Kazematoi",
      lostDamage: lost, inference: true,
      basis: `${k(acAvg)} average Armor Crush − ${k(u.dealt)} this Aeolian Edge (Kazematoi simulated from casts)`,
      detail: "Aeolian Edge at 0 Kazematoi (Armor Crush does more unbuffed)",
    }));
  }
  return out;
};

const enshroud: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.ENSHROUDED.id, name: "Enshroud", bonus: 0,
  bonusBasis: "a missing Reaping or Communio = its average minus the GCD used instead; a missing oGCD = its average",
  expected: (): ExpectedAction[] => [
    { ids: ids("CROSS_REAPING", "VOID_REAPING", "GRIM_REAPING"), count: 4, name: "Reaping", value: replacedGcd("CROSS_REAPING", "VOID_REAPING") },
    { ids: ids("LEMURES_SLICE", "LEMURES_SCYTHE"), count: 2, name: "Lemure's Slice", value: lostOgcd("LEMURES_SLICE") },
    { ids: ids("SACRIFICIUM"), count: 1, name: "Sacrificium", value: lostOgcd("SACRIFICIUM") },
    { ids: ids("COMMUNIO"), count: 1, name: "Communio", value: replacedGcd("COMMUNIO") },
  ],
});

// Reaper, checked against xivanalysis on jN3XDrf2z8PmLgRJ Vamp pull 8
// (positionals, cancelled Harpes and broken combos already matched):
// - Arcane Circle (xivanalysis ArcaneCircle.ts): two Communios and one
//   Plentiful Harvest, one Communio in the opener (the first window).
//   +3% from the tooltip. A missing one was used outside the window.
// - Not built: Soul gauge overcap (xivanalysis: 20 lost). Simulated from
//   casts (+10 per combo step, +50 per Soul Slice, −50 per spender) the
//   kill gains 1800 and spends 1850, going below zero 4 times: some gains
//   aren't casts (likely +10 when an enemy dies under Death's Design), so
//   a cast simulation runs short and would hide overcaps.
// - AoE on too few targets (Whorl of Death at 5:00 hit 2; it needs about
//   3 to beat Shadow of Death): `whorl` below.
// Rechecked on qjCMx4bRfgNKwX9T Dancing Mad kill (7.5, 2026-10-13):
// GCD uptime, Harvest Moon 5/4, Death's Design, its 14 missed
// positionals (same split by action), 2 Whorls on too few targets, the
// cancelled Communio and its weaving gaps all match. Its 6 missed
// Enshroud actions are the 6:12 Enshroud, cashed with Sacrificium and
// Communio 9s before P2's downtime (counted: holding the Shroud through
// the downtime would have kept the Reapings). Its "2 Communios missed in
// tinctures" (1:58, 17:48) is the tincture placement finding. Not
// adopted: Gluttony drift (31s and 25s at two-minute marks; 18/18, no
// use lost); Soul gauge 20 (the cast simulation's reason above stands).
// Arcane Circle, from xivanalysis ArcaneCircle.tsx: the two-minute burst
// is a double Enshroud inside the window: 7 Reapings, 4 Lemure's, 2
// Sacrificium, 1 Plentiful Harvest, 2 Communio; the opener half of that
// (Plentiful Harvest still 1). Valued at the window's observed bonus (it
// lines up with the party's buffs): a Reaping done just after it lost the
// whole raid-buff stack, not Arcane Circle's 3%. dDar482XvFKBPJYh FRU kill:
// xivanalysis's 27 missing match (8:30, 10:37, 14:18, 16:18, 18:18 single
// Enshrouds in the window).
const AC_OPENER_MS = 30_000;
const arcaneCircle: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.ARCANE_CIRCLE.id, name: "Arcane Circle", bonus: "observed",
  bonusBasis: "the window's observed bonus (the player's multiplier in it over their median outside raid buffs)",
  expected: (c, casts): ExpectedAction[] => {
    const half = casts.length > 0 && casts[0].timestamp < AC_OPENER_MS ? 0.5 : 1;
    return [
      { ids: ids("CROSS_REAPING", "VOID_REAPING", "GRIM_REAPING"), count: Math.ceil(7 * half), name: "Reaping" },
      { ids: ids("LEMURES_SLICE", "LEMURES_SCYTHE"), count: 4 * half, name: "Lemure's Slice" },
      { ids: ids("SACRIFICIUM"), count: 2 * half, name: "Sacrificium" },
      { ids: ids("PLENTIFUL_HARVEST"), count: 1, name: "Plentiful Harvest" },
      { ids: ids("COMMUNIO"), count: 2 * half, name: "Communio" },
    ];
  },
});

// Death's Design (+10% on the Reaper's own damage to the target, xivanalysis
// DeathsDesign.tsx: uptime). Measured from the Reaper's own hits: each hit
// whose snapshot lacks it, from the first one that has it, outside forced
// time, lost 10% of itself. Per target, so P3/P4's second boss counts.
// Summed per phase, with each stretch as a moment.
const DD_STRETCH_GAP_MS = 5_000;
const deathsDesign: JobCheck = (ctx) => {
  const dd = S.DEATHS_DESIGN?.id;
  if (dd === undefined) return [];
  const hits = ctx.player.damageDone.filter((e) => !e.pet && (e.amount ?? 0) > 0 && e.timestamp < ctx.endMs && e.statusIds);
  const first = hits.find((e) => e.statusIds!.includes(dd))?.timestamp;
  if (first === undefined) return [];
  const forced = mergeWindows(ctx.forced);
  const bare = hits.filter((e) => e.timestamp > first && !e.statusIds!.includes(dd) && !inWindows(e.timestamp, forced));
  const byPhase = new Map<number | undefined, typeof bare>();
  for (const e of bare) {
    const ph = ctx.phaseOf(e.timestamp);
    byPhase.set(ph, [...(byPhase.get(ph) ?? []), e]);
  }
  const out: DamageFinding[] = [];
  for (const [, list] of byPhase) {
    const stretches: { startMs: number; endMs: number; dealt: number; n: number }[] = [];
    for (const e of list) {
      const last = stretches[stretches.length - 1];
      if (last && e.timestamp - last.endMs <= DD_STRETCH_GAP_MS) { last.endMs = e.timestamp; last.dealt += e.amount ?? 0; last.n++; }
      else stretches.push({ startMs: e.timestamp, endMs: e.timestamp, dealt: e.amount ?? 0, n: 1 });
    }
    const dealt = stretches.reduce((a, x) => a + x.dealt, 0);
    out.push(finding(ctx, {
      kind: "buff-uptime", startMs: stretches[0].startMs, endMs: stretches[stretches.length - 1].endMs, forced: false,
      label: "Death's Design down",
      lostDamage: dealt * 0.1,
      basis: `${k(dealt)} dealt in ${list.length} hits without Death's Design on the target × 10% (tooltip)`,
      detail: `${list.length} hits without Death's Design in ${ctx.phaseName(ctx.phaseOf(list[0].timestamp)) ?? "the pull"}`,
      moments: stretches.map((x) => ({
        startMs: x.startMs, endMs: x.endMs, lostDamage: x.dealt * 0.1,
        detail: `${x.n} hit${x.n === 1 ? "" : "s"} without Death's Design`,
      })),
    }));
  }
  return out;
};

// Harvest Moon (xivanalysis HarvestMoon.tsx: one per downtime long enough
// to cast Soulsow, plus the pre-pull one). Each boss-untargetable stretch
// of SOULSOW_WINDOW_MS+ with targetable time after it is a chance: Soulsow
// cast in it, and Harvest Moon fired before the next. One with no Soulsow
// cast in it was wasted, whether Soulsow wasn't up (never recast) or was
// (the last Harvest Moon was held through it). Each costs the average
// Harvest Moon minus the GCD it would have replaced. dDar482XvFKBPJYh FRU
// kill: 3:20 (not recast), 5:50 and 12:55 (held; the 12:25 Soulsow's
// Harvest Moon went at 18:28). xivanalysis counts 7 chances, from its
// invulnerability windows; the boss-untargetable windows give 9.
const SOULSOW_WINDOW_MS = 6_000;
const harvestMoon: JobCheck = (ctx) => {
  const soulsow = id("SOULSOW"), moon = id("HARVEST_MOON");
  if (!ctx.player.casts.some((c) => c.abilityId === moon || c.abilityId === soulsow)) return [];
  const downtime = mergeWindows(ctx.forced.filter((f) => f.cause === "boss untargetable"))
    .filter((w) => w.endMs - w.startMs >= SOULSOW_WINDOW_MS && w.endMs + ctx.baseGcdMs < ctx.endMs);
  const value = Math.max(0, ctx.values.perUse(moon) - ctx.values.gcdValue(undefined, false));
  if (value <= 0) return [];
  const out: DamageFinding[] = [];
  for (const w of downtime) {
    if (ctx.player.casts.some((c) => c.abilityId === soulsow && c.timestamp >= w.startMs - 1_000 && c.timestamp <= w.endMs)) continue;
    if (inWindows(w.startMs, ctx.dead)) continue;
    const up = statusWindows(ctx, S.SOULSOW.id).some((s) => s.startMs <= w.startMs && s.endMs >= w.endMs);
    out.push(finding(ctx, {
      kind: "proc-lost", startMs: w.startMs, endMs: w.endMs, forced: false, inference: true,
      label: "Harvest Moon chance missed",
      lostDamage: value,
      basis: `${k(ctx.values.perUse(moon))} average Harvest Moon − ${k(ctx.values.gcdValue(undefined, false))} average GCD it replaces`,
      detail: up
        ? `Soulsow was still up through ${s(w.endMs - w.startMs)} of downtime: Harvest Moon before it, then Soulsow in it, is one more`
        : `No Soulsow cast in ${s(w.endMs - w.startMs)} of downtime`,
    }));
  }
  return out;
};

// Shroud (cap 100), from xivanalysis OtherGauges.tsx: +10 per Gibbet,
// Gallows, Guillotine (Executioner's too); Enshroud spends 50 unless Ideal
// Host is up (Plentiful Harvest's free Enshroud). 50 Shroud is one
// Enshroud: worth the player's average Enshroud window (Reapings, Lemure's,
// Sacrificium, Communio dealt in it) minus the same time's average GCDs.
const SHROUD_GAIN = new Set(ids("GIBBET", "GALLOWS", "GUILLOTINE", "EXECUTIONERS_GIBBET", "EXECUTIONERS_GALLOWS", "EXECUTIONERS_GUILLOTINE"));
const ENSHROUD_CONTENT = new Set(ids("CROSS_REAPING", "VOID_REAPING", "GRIM_REAPING", "LEMURES_SLICE", "LEMURES_SCYTHE", "SACRIFICIUM", "COMMUNIO"));
const shroud: JobCheck = (ctx) => {
  const enshroud = id("ENSHROUD");
  const idealHost = statusWindows(ctx, S.IDEAL_HOST.id);
  const events: GaugeEvent[] = [];
  for (const c of ctx.player.casts) {
    if (SHROUD_GAIN.has(c.abilityId)) events.push({ t: c.timestamp, type: "gain", amount: 10, label: `${c.abilityName} at full Shroud` });
    if (c.abilityId === enshroud && !idealHost.some((w) => c.timestamp >= w.startMs && c.timestamp <= w.endMs + 200)) {
      events.push({ t: c.timestamp, type: "spend", amount: 50, label: "Enshroud" });
    }
  }
  for (const d of ctx.dead) events.push({ t: d.startMs, type: "reset", label: "death" });
  const windows = statusWindows(ctx, S.ENSHROUDED.id).filter((w) => w.endMs <= ctx.endMs);
  if (windows.length === 0) return [];
  const content = windows.reduce((a, w) => a + ctx.player.damageDone
    .filter((e) => ENSHROUD_CONTENT.has(e.abilityId) && e.timestamp >= w.startMs && e.timestamp <= w.endMs + 1_000)
    .reduce((x, e) => x + (e.amount ?? 0), 0), 0) / windows.length;
  const span = windows.reduce((a, w) => a + w.endMs - w.startMs, 0) / windows.length;
  const plain = (span / ctx.baseGcdMs) * ctx.values.gcdValue(undefined, false);
  const perEnshroud = Math.max(0, content - plain);
  return gaugeFindings(ctx, {
    name: "Shroud", unit: "Shroud", cap: 100, unitValue: perEnshroud / 50,
    valueBasis: `(${k(content)} average Enshroud window − ${k(plain)} of average GCDs in its ${s(span)}) per 50`,
    events,
  });
};

// Whorl of Death on too few targets: Shadow of Death does more under 3
// (xivanalysis AoE.ts). Judged by what it dealt against the average
// Shadow of Death, so a patch's potency change moves the verdict with it.
const whorl: JobCheck = (ctx) => aoeOnOneTargetFindings(ctx, ids("WHORL_OF_DEATH"),
  () => ({ name: "Shadow of Death", value: ctx.values.perUse(id("SHADOW_OF_DEATH")) }), () => 3);

export const SAM_CHECKS: JobCheck[] = [uptime("FUGETSU", 0.13, "Fugetsu is +13%, FFLogs multiplier"), meikyo];
// Rattling Coil (xivanalysis UncoiledFury): +1 per Vicewinder / Vicepit /
// Serpent's Ire, cap 3, Uncoiled Fury spends 1. Coils left when a kill
// ends are lost too. On 2T1HzdPKgbhM43am fight 10 the cast simulation finds
// xivanalysis's 3 overcapped (12:07, 14:08, 15:23) and 3 left at the end,
// never going below zero.
// Coils left at a kill are leftAtKill (judged by how long they were held,
// shared.ts gaugeFindings). The timeline draws the same simulation.
export function rattlingCoilSpec(ctx: PlayerCheckContext): GaugeSpec {
  const gain = new Set(ids("VICEWINDER", "VICEPIT", "SERPENTS_IRE"));
  const spend = new Set(ids("UNCOILED_FURY"));
  const events: GaugeEvent[] = [];
  for (const c of ctx.player.casts) {
    if (gain.has(c.abilityId)) events.push({ t: c.timestamp, type: "gain", amount: 1, label: `${c.abilityName} at 3 coils` });
    else if (spend.has(c.abilityId)) events.push({ t: c.timestamp, type: "spend", amount: 1, label: "Uncoiled Fury" });
  }
  for (const d of ctx.dead) events.push({ t: d.startMs, type: "reset", label: "death" });
  // Uncoiled Fury is a GCD: it replaces one, so only its excess counts.
  const perCoil = replacedGcd("UNCOILED_FURY")(ctx) + ctx.values.perUse(id("UNCOILED_TWINFANG")) + ctx.values.perUse(id("UNCOILED_TWINBLOOD"));
  const basis = `${k(perCoil)} per coil: Uncoiled Fury less the GCD it replaces, plus its Twinfang and Twinblood`;
  return {
    name: "Rattling Coil", unit: "Rattling Coil", cap: 3, unitValue: perCoil, valueBasis: basis, events,
    leftAtKill: { unitValue: perCoil, valueBasis: basis },
  };
}
const rattlingCoils: JobCheck = (ctx) => gaugeFindings(ctx, rattlingCoilSpec(ctx));

export const VPR_CHECKS: JobCheck[] = [uptime("HUNTERS_INSTINCT", 0.1, "Hunter's Instinct is +10%, FFLogs multiplier"), reawaken, venoms, rattlingCoils];
export const MNK_CHECKS: JobCheck[] = [riddleOfFire];
// Firstminds' Focus (xivanalysis FirstmindsFocus): +1 per Raiden Thrust /
// Draconian Fury, cap 2, Wyrmwind Thrust spends 2. A stack gained at 2 is
// half a Wyrmwind. On 2T1HzdPKgbhM43am fight 10 the cast simulation finds
// xivanalysis's 2 lost stacks (3:17, 6:18) and never goes below zero.
// The timeline draws the same simulation (jobs/gauges.ts, gaugeTrack).
export function firstmindsFocusSpec(ctx: PlayerCheckContext): GaugeSpec {
  const gain = new Set(ids("RAIDEN_THRUST", "DRACONIAN_FURY"));
  const spend = new Set(ids("WYRMWIND_THRUST"));
  const events: GaugeEvent[] = [];
  for (const c of ctx.player.casts) {
    if (gain.has(c.abilityId)) events.push({ t: c.timestamp, type: "gain", amount: 1, label: `${c.abilityName} at 2 stacks` });
    else if (spend.has(c.abilityId)) events.push({ t: c.timestamp, type: "spend", amount: 2, label: c.abilityName ?? "Wyrmwind Thrust" });
  }
  for (const d of ctx.dead) events.push({ t: d.startMs, type: "reset", label: "death" });
  const perStack = ctx.values.perUse(id("WYRMWIND_THRUST")) / 2;
  return {
    name: "Firstminds' Focus", unit: "Firstminds' Focus", cap: 2, unitValue: perStack,
    valueBasis: `${k(perStack * 2)} average Wyrmwind Thrust per 2`,
    events,
  };
}
const firstmindsFocus: JobCheck = (ctx) => gaugeFindings(ctx, firstmindsFocusSpec(ctx));

export const DRG_CHECKS: JobCheck[] = [uptime("POWER_SURGE", 0.1, "Power Surge is +10% (tooltip)", { cost: drgPowerSurgeRefreshCost, reapplyGcds: 1, restartIds: ids("RAIDEN_THRUST", "TRUE_THRUST") }), lanceCharge, lifeOfTheDragon, lifeSurge, chaoticSpring, firstmindsFocus];
export const NIN_CHECKS: JobCheck[] = [kunaisBane, ninki, kazematoi];
export const RPR_CHECKS: JobCheck[] = [enshroud, arcaneCircle, deathsDesign, harvestMoon, shroud, whorl];
