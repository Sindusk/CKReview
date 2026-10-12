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
//     each, and four Last Dance / Saber Dance. A missing one is its average
//     minus the GCD used instead.
//   - one Fan Dance IV, valued at its average × 5% (used outside instead).
//   - no combo or proc fillers (Cascade, Fountain, Reverse Cascade,
//     Fountainfall, Windmill, Bladeshower, Rising Windmill, Bloodshower):
//     each one is the player's average Saber Dance minus the filler's own
//     average. xivanalysis allows Fountainfall when out of Esprit; this
//     counts it, so treat the filler finding as an upper bound.
//   Proc overwrites (xivanalysis Procs.tsx, checked on jN3XDrf2z8PmLgRJ
//   Vamp pull 8): a Silken / Flourishing Symmetry or Flow, Threefold or
//   Fourfold Fan Dance "refreshed" within 600ms of one of the Dancer's casts
//   is a proc that rolled while one was held: one lost. The refresh can
//   log 0.3s after the cast (Fan Dance at 4:15). Fan Dance III / IV are
//   oGCDs, lost outright at their average; a Symmetry or Flow is its
//   consumer's average minus the GCD used instead (inference). Last Dance
//   Ready also logs a "refreshed" 2s after every Finishing Move with no
//   cast near it: a log artifact, not an overwrite, so it isn't tracked.
//   Not checked: feather overcap. Feathers are gauge, never logged, and
//   come from 50% procs, so a lost one can't be told from the log
//   (xivanalysis says "may have been lost").
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
// Machinist (unverified): Wildfire on the enemy, 6 GCDs (Wildfire.tsx);
//   Hypercharge (Overheated), 5 Heat Blasts / Blazing Shots / Auto
//   Crossbows (Hypercharge.tsx), each missing one its average; cooldowns
//   (GeneralCDDowntime.tsx). Double Check / Checkmate are left out:
//   Heat Blast refunds their cooldown, which the drift check doesn't model.
//
//   Copyright (c) 2018 Saxon Landers & contributors
//   MIT License; full text in THIRD_PARTY_NOTICES.md.

import { XIVA_ACTIONS as A, XIVA_STATUSES as S } from "../xiva-data";
import type { DamageFinding, JobCheck } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { aoeComboOnOneTarget, burstWindowFindings, dotFindings, k, statusWindows, type ExpectedAction } from "./shared";
import { forcedPart, inWindows, mergeWindows } from "../../timeline";

const ids = (...keys: string[]) => keys.filter((key) => A[key]).map((key) => A[key].id);
const replacedGcd = (...keys: string[]) => (ctx: PlayerCheckContext) =>
  Math.max(0, Math.max(...ids(...keys).map((x) => ctx.values.perUse(x))) - ctx.values.gcdValue(undefined, false));

// ── Dancer ─────────────────────────────────────────────────────────────

const TECH_EXPECTED: [string, number][] = [
  ["DANCE_OF_THE_DAWN", 1], ["FINISHING_MOVE", 1], ["STARFALL_DANCE", 1], ["TILLANA", 1],
];
const TECH_FILLERS = ["CASCADE", "REVERSE_CASCADE", "FOUNTAIN", "FOUNTAINFALL", "WINDMILL", "RISING_WINDMILL", "BLADESHOWER", "BLOODSHOWER"];

const technical: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.TECHNICAL_FINISH.id, name: "Technical Finish", bonus: 0.05,
  bonusBasis: "a missing GCD = its average minus the GCD used instead; Fan Dance IV × 5% (Technical Finish, FFLogs multiplier 1.05)",
  expectedGcds: () => 8,
  expected: (): ExpectedAction[] => [
    ...TECH_EXPECTED.map(([key, count]) => ({ ids: ids(key), count, name: A[key].name, value: replacedGcd(key) })),
    { ids: ids("LAST_DANCE", "SABER_DANCE"), count: 4, name: "Last Dance / Saber Dance", value: replacedGcd("SABER_DANCE") },
    { ids: ids("FAN_DANCE_IV"), count: 1, name: "Fan Dance IV" },
  ],
});

const technicalFillers: JobCheck = (ctx): DamageFinding[] => {
  const fillers = new Set(ids(...TECH_FILLERS));
  const saber = ctx.values.perUse(A.SABER_DANCE.id);
  const out: DamageFinding[] = [];
  for (const w of statusWindows(ctx, S.TECHNICAL_FINISH.id)) {
    if (w.endMs > ctx.endMs) continue;
    const used = ctx.uses.filter((u) => u.startMs >= w.startMs && u.startMs <= w.endMs + 100 && fillers.has(u.action.id));
    if (used.length === 0) continue;
    const lost = used.reduce((a, u) => a + Math.max(0, saber - ctx.values.perUse(u.action.id)), 0);
    out.push(finding(ctx, {
      kind: "burst-window", startMs: w.startMs, endMs: w.endMs, forced: false, inference: true,
      label: "Fillers in Technical Finish",
      lostDamage: lost,
      basis: `each filler = ${k(saber)} average Saber Dance minus the filler's average (upper bound: Fountainfall is fine out of Esprit)`,
      detail: `${used.length} filler GCD${used.length > 1 ? "s" : ""} in Technical Finish: ${used.map((u) => u.abilityName).join(", ")}`,
    }));
  }
  return out;
};

const OVERWRITE_CAST_MS = 600;
// Proc status → its consumers, and whether the consumer is an oGCD.
const DNC_PROCS: [string, string[], boolean][] = [
  ["SILKEN_SYMMETRY", ["REVERSE_CASCADE", "RISING_WINDMILL"], false],
  ["FLOURISHING_SYMMETRY", ["REVERSE_CASCADE", "RISING_WINDMILL"], false],
  ["SILKEN_FLOW", ["FOUNTAINFALL", "BLOODSHOWER"], false],
  ["FLOURISHING_FLOW", ["FOUNTAINFALL", "BLOODSHOWER"], false],
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

// ── Bard, Machinist (unverified) ───────────────────────────────────────

// Bard's DoTs. Iron Jaws refreshes both at once, about every 40s and again
// in each burst to snapshot the buffs, so "seconds of ticks overwritten"
// (the old basis) read standard play as 0.5M lost on 2T1HzdPKgbhM43am
// fight 10, counted twice (once per DoT). A refresh loses no ticks; it
// brings the next Iron Jaws closer. So Stormbite is valued like the healer
// DoTs (shared.ts dotApplicationFindings, against Burst Shot, less the
// Iron Jaws hit), a refresh in raid buffs is a snapshot and costs nothing,
// and Caustic Bite, refreshed by the same casts, counts only its uptime.
const bardDots: JobCheck = (ctx) => [
  ...dotFindings(ctx, { statusIds: [S.CAUSTIC_BITE.id], name: S.CAUSTIC_BITE.name, durationMs: S.CAUSTIC_BITE.duration ?? 45_000, uptimeOnly: true }),
  ...dotFindings(ctx, {
    statusIds: [S.STORMBITE.id], name: S.STORMBITE.name, durationMs: S.STORMBITE.duration ?? 45_000,
    fillerId: () => ({ id: A.BURST_SHOT.id, name: A.BURST_SHOT.name }),
    castIds: [A.IRON_JAWS.id], snapshotInBuffs: true,
  }),
];

// Hawk's Eye granted again while held: a Refulgent Arrow lost
// (xivanalysis: 4 overwritten on 2T1HzdPKgbhM43am fight 10, the same 4).
const bardOverwrites = procOverwrites([["HAWKS_EYE", ["REFULGENT_ARROW"], false, "BURST_SHOT"]]);

// Ladonsbite / Shadowbite on one target, against Burst Shot / Refulgent.
const bardAoe = aoeComboOnOneTarget([[A.LADONSBITE.id, A.BURST_SHOT.id], [A.SHADOWBITE.id, A.REFULGENT_ARROW.id]]);

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

export const DNC_CHECKS: JobCheck[] = [technical, technicalFillers, dancerOverwrites];
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
export const MCH_CHECKS: JobCheck[] = [wildfire, hypercharge];
