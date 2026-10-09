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
// Unverified (no sample has the job):
//   - Monk: Riddle of Fire, 11 GCDs (RiddleOfFire.tsx), +15% (tooltip).
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
//   - Ninja: Kunai's Bane on the enemy (KunaisBaneWindow.tsx): 7 GCDs
//     plus Dream Within a Dream, +10% damage taken (tooltip).
//   - Reaper: Enshroud (Enshroud.tsx): four Reapings, two Lemure's, one
//     Sacrificium, one Communio. Arcane Circle's window isn't ported:
//     xivanalysis adjusts its expectations in ways that don't carry over.
//
//   Copyright (c) 2018 Saxon Landers & contributors
//   MIT License; full text in THIRD_PARTY_NOTICES.md.

import { XIVA_ACTIONS as A, XIVA_STATUSES as S } from "../xiva-data";
import type { DamageFinding, JobCheck } from "../../types";
import { finding, PROC_CONSUME_MS, PROC_EXPIRY_EARLY_MS, type PlayerCheckContext } from "../../checks";
import { forcedPart, inWindows, mergeWindows } from "../../timeline";
import { burstWindowFindings, dotFindings, gaugeFindings, k, offCooldownIn, statusWindows, uptimeFindings, type ExpectedAction, type GaugeEvent } from "./shared";

const id = (key: string) => A[key].id;
const ids = (...keys: string[]) => keys.filter((key) => A[key]).map(id);

/** A missing GCD that was replaced by another: its average minus the player's average GCD. */
const replacedGcd = (...keys: string[]) => (ctx: PlayerCheckContext) =>
  Math.max(0, Math.max(...ids(...keys).map((x) => ctx.values.perUse(x))) - ctx.values.gcdValue(undefined, false));
/** A missing oGCD is simply lost. */
const lostOgcd = (...keys: string[]) => (ctx: PlayerCheckContext) =>
  Math.max(...ids(...keys).map((x) => ctx.values.perUse(x)));

const uptime = (statusKey: string, bonus: number, bonusBasis: string): JobCheck => (ctx) => {
  const windows = statusWindows(ctx, S[statusKey].id);
  if (windows.length === 0) return [];
  return uptimeFindings(ctx, {
    name: S[statusKey].name, bonus, bonusBasis,
    active: windows, fromMs: windows[0].startMs, graceMs: 2_500,
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

const riddleOfFire: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.RIDDLE_OF_FIRE.id, name: "Riddle of Fire", bonus: 0.15,
  bonusBasis: "Riddle of Fire is +15% (tooltip; not yet checked against a log)",
  expectedGcds: () => 11, expected: () => [],
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
const FORCED_CRIT_SHARE = (1.55 - (1 + 0.25 * 0.55)) / (1 + 0.25 * 0.55);

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

const chaoticSpring: JobCheck = (ctx) => dotFindings(ctx, {
  statusIds: [S.CHAOTIC_SPRING.id], name: S.CHAOTIC_SPRING.name, durationMs: S.CHAOTIC_SPRING.duration ?? 24_000,
});

const kunaisBane: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.KUNAIS_BANE.id, name: "Kunai's Bane", bonus: 0.1, onEnemy: true,
  bonusBasis: "Kunai's Bane is +10% damage taken (tooltip; not yet checked against a log)",
  expectedGcds: () => 7,
  expected: () => [{ ids: ids("DREAM_WITHIN_A_DREAM"), count: 1, name: "Dream Within a Dream" }],
});

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
// - Not built: AoE on too few targets (Whorl of Death at 5:00 hit 2; it
//   needs about 3 to beat Shadow of Death). Needs per-job AoE → single-
//   target pairs.
const arcaneCircle: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.ARCANE_CIRCLE.id, name: "Arcane Circle", bonus: 0.03,
  bonusBasis: "Arcane Circle is +3% (tooltip)",
  expected: (c, casts): ExpectedAction[] => [
    { ids: ids("COMMUNIO"), count: casts.length && casts[0].timestamp < 30_000 ? 1 : 2, name: "Communio" },
    { ids: ids("PLENTIFUL_HARVEST"), count: 1, name: "Plentiful Harvest" },
  ],
});

export const SAM_CHECKS: JobCheck[] = [uptime("FUGETSU", 0.13, "Fugetsu is +13%, FFLogs multiplier"), meikyo];
// Rattling Coil (xivanalysis UncoiledFury): +1 per Vicewinder / Vicepit /
// Serpent's Ire, cap 3, Uncoiled Fury spends 1. Coils left when a kill
// ends are lost too. On 2T1HzdPKgbhM43am fight 10 the cast simulation finds
// xivanalysis's 3 overcapped (12:07, 14:08, 15:23) and 3 left at the end,
// never going below zero.
const rattlingCoils: JobCheck = (ctx) => {
  const gain = new Set(ids("VICEWINDER", "VICEPIT", "SERPENTS_IRE"));
  const spend = new Set(ids("UNCOILED_FURY"));
  const events: GaugeEvent[] = [];
  for (const c of ctx.player.casts) {
    if (gain.has(c.abilityId)) events.push({ t: c.timestamp, type: "gain", amount: 1, label: `${c.abilityName} at 3 coils` });
    else if (spend.has(c.abilityId)) events.push({ t: c.timestamp, type: "spend", amount: 1, label: "Uncoiled Fury" });
  }
  for (const d of ctx.dead) events.push({ t: d.startMs, type: "reset", label: "death" });
  if (ctx.pull.result === "Kill") events.push({ t: ctx.endMs - 1, type: "cap", cap: 0, label: "left when the boss died" });
  // Uncoiled Fury is a GCD: it replaces one, so only its excess counts.
  const perCoil = replacedGcd("UNCOILED_FURY")(ctx) + ctx.values.perUse(id("UNCOILED_TWINFANG")) + ctx.values.perUse(id("UNCOILED_TWINBLOOD"));
  return gaugeFindings(ctx, {
    name: "Rattling Coil", unit: "Rattling Coil", cap: 3, unitValue: perCoil,
    valueBasis: `${k(perCoil)} per coil: Uncoiled Fury less the GCD it replaces, plus its Twinfang and Twinblood`,
    events,
  });
};

export const VPR_CHECKS: JobCheck[] = [uptime("HUNTERS_INSTINCT", 0.1, "Hunter's Instinct is +10%, FFLogs multiplier"), reawaken, venoms, rattlingCoils];
export const MNK_CHECKS: JobCheck[] = [riddleOfFire];
// Firstminds' Focus (xivanalysis FirstmindsFocus): +1 per Raiden Thrust /
// Draconian Fury, cap 2, Wyrmwind Thrust spends 2. A stack gained at 2 is
// half a Wyrmwind. On 2T1HzdPKgbhM43am fight 10 the cast simulation finds
// xivanalysis's 2 lost stacks (3:17, 6:18) and never goes below zero.
const firstmindsFocus: JobCheck = (ctx) => {
  const gain = new Set(ids("RAIDEN_THRUST", "DRACONIAN_FURY"));
  const spend = new Set(ids("WYRMWIND_THRUST"));
  const events: GaugeEvent[] = [];
  for (const c of ctx.player.casts) {
    if (gain.has(c.abilityId)) events.push({ t: c.timestamp, type: "gain", amount: 1, label: `${c.abilityName} at 2 stacks` });
    else if (spend.has(c.abilityId)) events.push({ t: c.timestamp, type: "spend", amount: 2, label: c.abilityName ?? "Wyrmwind Thrust" });
  }
  for (const d of ctx.dead) events.push({ t: d.startMs, type: "reset", label: "death" });
  const perStack = ctx.values.perUse(id("WYRMWIND_THRUST")) / 2;
  return gaugeFindings(ctx, {
    name: "Firstminds' Focus", unit: "Firstminds' Focus", cap: 2, unitValue: perStack,
    valueBasis: `${k(perStack * 2)} average Wyrmwind Thrust per 2`,
    events,
  });
};

export const DRG_CHECKS: JobCheck[] = [uptime("POWER_SURGE", 0.1, "Power Surge is +10% (tooltip)"), lanceCharge, lifeSurge, chaoticSpring, firstmindsFocus];
export const NIN_CHECKS: JobCheck[] = [kunaisBane];
export const RPR_CHECKS: JobCheck[] = [enshroud, arcaneCircle];
