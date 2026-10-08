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
// Bard (unverified): Caustic Bite / Stormbite uptime and clipping
//   (DoTs.tsx), cooldowns (OGCDDowntime.ts).
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
import { burstWindowFindings, dotFindings, k, statusWindows, type ExpectedAction } from "./shared";

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

const dancerOverwrites: JobCheck = (ctx): DamageFinding[] => {
  const out: DamageFinding[] = [];
  const procs = new Map(DNC_PROCS.filter(([s]) => S[s]).map(([s, consumers, ogcd]) => [S[s].id, { consumers, ogcd }]));
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
    const lost = proc.ogcd ? avg : replacedGcd(...proc.consumers)(ctx);
    out.push(finding(ctx, {
      kind: "proc-lost", startMs: e.timestamp, endMs: e.timestamp, forced: false, inference: !proc.ogcd,
      label: `${e.abilityName} overwritten`,
      lostDamage: lost,
      basis: proc.ogcd
        ? `one ${consumerName} lost (${k(avg)} average)`
        : `${k(avg)} average ${consumerName} minus the GCD used instead`,
      detail: `${cast.abilityName} gave ${e.abilityName} while one was still held`,
    }));
  }
  return out;
};

// ── Bard, Machinist (unverified) ───────────────────────────────────────

const bardDots: JobCheck = (ctx) => [
  ...dotFindings(ctx, { statusIds: [S.CAUSTIC_BITE.id], name: S.CAUSTIC_BITE.name, durationMs: S.CAUSTIC_BITE.duration ?? 45_000 }),
  ...dotFindings(ctx, { statusIds: [S.STORMBITE.id], name: S.STORMBITE.name, durationMs: S.STORMBITE.duration ?? 45_000 }),
];

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
export const BRD_CHECKS: JobCheck[] = [bardDots];
export const MCH_CHECKS: JobCheck[] = [wildfire, hypercharge];
