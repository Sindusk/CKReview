// lib/damage/ffxiv/jobs/drk.ts
//
// Dark Knight checks (tank batch). Ported from xivanalysis
// src/parser/jobs/drk/modules/Delirium.tsx, Darkside.tsx and BloodGauge.tsx:
//
// Delirium: three Delirium GCDs per window: Scarlet Delirium, Comeuppance
// and Torcleaver, or Impalements in their place (AoE). A missing one is
// valued at the difference between the player's average Delirium GCD and
// their average GCD: the GCD pressed instead still did damage.
//
// Darkside (+10%): a gauge timer, not a status, and FFLogs' multiplier
// doesn't include it (DRK hits with no listed statuses log ×1.00). So it
// is simulated: each Edge or Flood of Shadow hit adds 30s, capped at 60s;
// death drops it. Drops shorter than 2.5s are ignored (xivanalysis's
// forgiveness). Findings are marked inference.
//
// Blood (cap 100): +20 per combo'd Souleater / Stalwart Soul (combo read
// from bonusPercent, as for GNB), +10 per Blood Weapon stack a GCD
// consumes (read from the stack removals), −50 per Bloodspiller / Quietus
// outside Delirium. 50 Blood is worth one average Bloodspiller.
//
//   Copyright (c) 2018 Saxon Landers & contributors
//   MIT License; full text in THIRD_PARTY_NOTICES.md.

import { XIVA_ACTIONS as A, XIVA_STATUSES as S } from "../xiva-data";
import type { JobCheck } from "../../types";
import { inWindows, type Window } from "../../timeline";
import { burstWindowFindings, castHits, gaugeFindings, k, statusWindows, uptimeFindings, type GaugeEvent } from "./shared";
import { comboLanded } from "./gnb";

const id = (key: string) => A[key].id;
const DELIRIUM_GCDS = ["SCARLET_DELIRIUM", "COMEUPPANCE", "TORCLEAVER", "IMPALEMENT"].map(id);

const delirium: JobCheck = (ctx) => {
  const avgDelirium = Math.max(...DELIRIUM_GCDS.map((x) => ctx.values.perUse(x)));
  return burstWindowFindings(ctx, {
    statusId: S.DELIRIUM.id,
    name: "Delirium",
    bonus: 0,
    bonusBasis: "a missing Delirium GCD = the player's best average Delirium GCD minus their average GCD",
    expected: () => [{
      ids: DELIRIUM_GCDS, count: 3, name: "Delirium GCD",
      value: (c) => Math.max(0, avgDelirium - c.values.gcdValue(undefined, false)),
    }],
  });
};

const DARKSIDE_EXTEND_MS = 30_000;
const DARKSIDE_MAX_MS = 60_000;

const darkside: JobCheck = (ctx) => {
  const hits = [...castHits(ctx, id("EDGE_OF_SHADOW")), ...castHits(ctx, id("FLOOD_OF_SHADOW"))]
    .map((h) => h.timestamp).sort((a, b) => a - b);
  if (hits.length === 0) return [];
  const windows: Window[] = [];
  let start: number | undefined, expiry = 0;
  for (const t of hits) {
    const deathBefore = ctx.dead.find((d) => d.startMs < t && d.startMs >= (start ?? 0) && d.startMs < expiry);
    if (start !== undefined && deathBefore) { windows.push({ startMs: start, endMs: deathBefore.startMs }); start = undefined; expiry = 0; }
    if (start === undefined || t > expiry) {
      if (start !== undefined) windows.push({ startMs: start, endMs: expiry });
      start = t;
      expiry = t + DARKSIDE_EXTEND_MS;
    } else {
      expiry = t + Math.min(DARKSIDE_MAX_MS, expiry - t + DARKSIDE_EXTEND_MS);
    }
  }
  if (start !== undefined) {
    const death = ctx.dead.find((d) => d.startMs > start! && d.startMs < expiry);
    windows.push({ startMs: start, endMs: death ? death.startMs : expiry });
  }
  return uptimeFindings(ctx, {
    name: "Darkside", bonus: 0.1, bonusBasis: "Darkside is +10%, simulated from Edge/Flood hits",
    active: windows, fromMs: hits[0], graceMs: 2_500, inference: true,
  });
};

const blood: JobCheck = (ctx) => {
  const events: GaugeEvent[] = [];
  const builders = new Set([id("SOULEATER"), id("STALWART_SOUL")]);
  const spenders = new Set([id("BLOODSPILLER"), id("QUIETUS")]);
  const deliriumWindows = statusWindows(ctx, S.DELIRIUM.id)
    .map((w) => ({ startMs: w.startMs, endMs: w.endMs + 100 }));
  // Each Blood Weapon stack a weaponskill consumes is +10: read from the
  // stack's own removal, when it coincides with a GCD.
  for (const e of ctx.player.buffs ?? []) {
    if (e.abilityId !== S.BLOOD_WEAPON.id || (e.buffStatus !== "stackRemoved" && e.buffStatus !== "removed")) continue;
    const gcd = ctx.uses.find((u) => Math.abs(u.startMs + u.castMs - e.timestamp) <= 200 || Math.abs(u.startMs - e.timestamp) <= 200);
    if (gcd) events.push({ t: e.timestamp, type: "gain", amount: 10, label: `${gcd.abilityName} under Blood Weapon at full Blood` });
  }
  for (const c of ctx.player.casts) {
    if (builders.has(c.abilityId) && comboLanded(ctx, c.abilityId, c.timestamp)) {
      events.push({ t: c.timestamp, type: "gain", amount: 20, label: `${c.abilityName} at high Blood` });
    }
    if (spenders.has(c.abilityId) && !inWindows(c.timestamp, deliriumWindows)) {
      events.push({ t: c.timestamp, type: "spend", amount: 50, label: c.abilityName });
    }
  }
  for (const d of ctx.dead) events.push({ t: d.startMs, type: "reset", label: "death" });
  const perPoint = ctx.values.perUse(id("BLOODSPILLER")) / 50;
  return gaugeFindings(ctx, {
    name: "Blood", unit: "Blood", cap: 100, unitValue: perPoint,
    valueBasis: `${k(perPoint * 50)} average Bloodspiller per 50`,
    events,
  });
};

export const DRK_CHECKS: JobCheck[] = [delirium, darkside, blood];
