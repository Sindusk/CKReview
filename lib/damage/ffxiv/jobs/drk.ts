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
// AoE combo on one target (shared.ts aoeComboOnOneTarget, every tank).
// The spenders too (xivanalysis MultiHitSkills.ts, 2026-10-15): Flood of
// Shadow, Quietus, Impalement and Abyssal Drain under 3 targets, against
// Edge of Shadow, Bloodspiller, the Delirium combo and Carve and Spit.
// Seen firing, not matched against xivanalysis: vFY7kHVWK19ZQ24A Lindwurm
// II pull 3 0:40 (Flood, 21k), AYQm9Kd8Ct4FxcGp Lindwurm pull 24 4:51
// (Quietus, 34k), jN3XDrf2z8PmLgRJ Red Hot and Deep Blue pull 44 4:19
// (Abyssal Drain on one boss with the two apart, 24k) and pull 13 3:06
// (Flood on both, 21k). A Flood pressed before the pull is shown, not
// counted (H9fnVZgPA3krpCzY Lindwurm II pull 11). Impalement on both Red
// Hot and Deep Blue bosses: djChYqt4b7K8aAfP 9:38-9:43 (1-21k: two is
// close to the Delirium combo), VrJcQxq4RYPML6Zk 6:38 (6k).
//
// Living Shadow (xivanalysis's Esteem evaluator): Esteem runs a set
// sequence at fixed offsets from the summon (Abyssal Drain, Shadowbringer,
// Edge of Shadow, Bloodspiller, Disesteem: +8, +12, +14, +16.5, +19.5s in
// 7.1). The full sequence is the player's most complete summons, read from
// the pet's hits so it follows the patch; slots are matched by time, not
// name, since in AoE Esteem swaps actions. Each slot a summon missed costs
// that slot's average. Forced when the slot fell in forced time. dDar482XvFKBPJYh FRU kill: the 6:11 summon lost its
// Bloodspiller while Esteem was on the P2 crystals, xivanalysis's one.
//
// Checked against xivanalysis on 2T1HzdPKgbhM43am Dancing Mad fight 10
// (2026-10-08): its 60 Blood overcapped matches; its AoE-on-one-target
// uses (6:20, 14:22) were past a phase's HP check, building Blood before
// downtime, so they're forced. Not built: MP overcap (one Edge of Shadow):
// player MP isn't in the fetched streams. Dark Arts overwrite: below.
// Tinctures are every job's (tincture.ts).
//
// Checked against xivanalysis on qjCMx4bRfgNKwX9T Dancing Mad kill (7.5,
// 2026-10-13). Matched: GCD uptime, cooldowns, Darkside, Delirium, Esteem,
// the death. Built: Salt and Darkness (one unused, 7:36). Not adopted:
// - "7 recommended actions missed in tinctures": its 13:01 tincture is in
//   the one-minute burst (no Living Shadow, so no Disesteem, one
//   Shadowbringer). Four tinctures need the third one before 13:59, so
//   that was the price of a fourth; tincture.ts finds no better placement.
//   Its 18:01 window is short a Bloodspiller and two Edges because the
//   17:20 death emptied Blood and MP (the death and Weakness are counted).
// - "4 incorrect weaves": triple weaves at 6:01, 6:14, 15:24, 18:07 that
//   delayed the next GCD by 0.03-0.10s each, ~0.3s in all.
//
//   Copyright (c) 2018 Saxon Landers & contributors
//   MIT License; full text in THIRD_PARTY_NOTICES.md.

import { XIVA_ACTIONS as A, XIVA_STATUSES as S } from "../xiva-data";
import type { DamageFinding, JobCheck } from "../../types";
import { finding } from "../../checks";
import { forcedPart, inWindows, mergeWindows, overlapMs, type Window } from "../../timeline";
import { aoeComboOnOneTarget, burstWindowFindings, castHits, gaugeFindings, k, statusWindows, uptimeFindings, type GaugeEvent } from "./shared";
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

const aoeCombo = aoeComboOnOneTarget([[id("UNLEASH"), id("HARD_SLASH")], [id("STALWART_SOUL"), id("SYPHON_STRIKE")],
  [id("FLOOD_OF_SHADOW"), id("EDGE_OF_SHADOW"), 3], [id("QUIETUS"), id("BLOODSPILLER"), 3],
  [id("IMPALEMENT"), [id("SCARLET_DELIRIUM"), id("COMEUPPANCE"), id("TORCLEAVER")], 3], [id("ABYSSAL_DRAIN"), id("CARVE_AND_SPIT"), 3]]);

const ESTEEM_IDS = new Set(Object.entries(A).filter(([key]) => key.startsWith("ESTEEM_")).map(([, a]) => a.id));
const SUMMON_SPAN_MS = 30_000;
const ACTION_HIT_MS = 300;
const SLOT_SLACK_MS = 1_200;

const livingShadow: JobCheck = (ctx) => {
  const summons = ctx.player.casts.filter((c) => c.abilityId === id("LIVING_SHADOW")).map((c) => c.timestamp);
  const hits = ctx.player.damageDone.filter((e) => e.pet && ESTEEM_IDS.has(e.abilityId) && (e.amount ?? 0) > 0)
    .sort((a, b) => a.timestamp - b.timestamp);
  if (summons.length === 0 || hits.length === 0) return [];
  // Per summon, Esteem's actions: hits of one id within ACTION_HIT_MS are
  // one action (several targets).
  const runs = summons.map((t, i) => {
    const until = Math.min(summons[i + 1] ?? Infinity, t + SUMMON_SPAN_MS);
    const actions: { offset: number; dealt: number; name: string; id: number }[] = [];
    for (const e of hits) {
      if (e.timestamp < t || e.timestamp >= until) continue;
      const same = actions.find((a) => a.id === e.abilityId && Math.abs(t + a.offset - e.timestamp) <= ACTION_HIT_MS);
      if (same) same.dealt += e.amount ?? 0;
      else actions.push({ offset: e.timestamp - t, dealt: e.amount ?? 0, name: e.abilityName, id: e.abilityId });
    }
    return { t, actions };
  });
  const most = Math.max(...runs.map((r) => r.actions.length));
  const full = runs.filter((r) => r.actions.length === most);
  // Slot k of a full sequence: its usual offset, name and value.
  const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const slots = Array.from({ length: most }, (_, slot) => {
    const names = new Map<string, number>();
    for (const r of full) names.set(r.actions[slot].name, (names.get(r.actions[slot].name) ?? 0) + 1);
    return {
      offset: median(full.map((r) => r.actions[slot].offset)),
      value: full.reduce((a, r) => a + r.actions[slot].dealt, 0) / full.length,
      name: [...names].sort((a, b) => b[1] - a[1])[0][0],
    };
  });
  const forcedAll = mergeWindows(ctx.forced);
  const out: DamageFinding[] = [];
  for (const r of runs) {
    if (r.actions.length === most) continue;
    // A slot is missing when nothing landed near its usual moment. (In AoE
    // Esteem swaps actions: Abyssal Drain lands in Edge of Shadow's or
    // Disesteem's slot on jN3XDrf2z8PmLgRJ Red Hot pulls 1, 5 and 9.)
    const missing = slots
      .filter((sl) => !r.actions.some((a) => Math.abs(a.offset - sl.offset) <= SLOT_SLACK_MS))
      .map((sl) => ({ ...sl, at: r.t + sl.offset }))
      // Cut by the end of the analysis (a kill, a wipe) or a death: not this check's.
      .filter((m) => m.at < ctx.endMs && !inWindows(m.at, ctx.dead));
    for (const forced of [false, true]) {
      const part = missing.filter((m) => inWindows(m.at, forcedAll) === forced);
      if (part.length === 0) continue;
      const cause = forced ? ctx.forced.find((f) => part.some((m) => m.at >= f.startMs && m.at < f.endMs))?.cause : undefined;
      const during = ctx.mechanicAround(r.t, part[part.length - 1].at);
      out.push(finding(ctx, {
        kind: "pet-cut", startMs: r.t, endMs: part[part.length - 1].at, forced,
        cause: cause ?? (during ? `during ${during}` : undefined),
        label: "Living Shadow cut short",
        lostDamage: part.reduce((a, m) => a + m.value, 0),
        basis: `each missing Esteem action × that slot's average in the full summons (${part.map((m) => `${m.name} ${k(m.value)}`).join(", ")}); ` +
          `a full summon lands ${most} actions (${full.length} of ${runs.length} did)`,
        detail: `Living Shadow at ${clock(r.t)}: Esteem's ${part.map((m) => m.name).join(", ")} didn't land`,
      }));
    }
  }
  return out;
};

// Salt and Darkness (xivanalysis SaltAndDarkness.tsx): one per Salted
// Earth. Its 20s recast is always back within Salted Earth's 90s, so a
// Salted Earth with no Salt and Darkness inside it lost one, valued at
// the player's own average (its hits log under 25756, its casts under
// 25755; a damage id logged as a cast within 50ms is the same press).
// Only a Salted Earth that ran its full 15s counts: players press Salt
// and Darkness 6-8s in (qjCMx4bRfgNKwX9T kill), and on FRU wipes
// (FbxL2QZhG7df3Ry4) the status dropped after 0.2-4s at P1's boss jumps,
// which the context doesn't mark forced. A pull that ended inside it isn't
// this check's either. Forced when the whole patch was forced time or
// death. Uses that hit nothing are noDamageCasts' (shared.ts).
// Checked against xivanalysis on qjCMx4bRfgNKwX9T (7.5): its one unused
// Salt and Darkness is the 7:36 Salted Earth, both bosses targetable.
const SALT_PRESS_MS = 50;
const SALT_MIN_FREE_MS = 1_000;
const SALTED_EARTH_FULL_MS = 14_000;

const saltAndDarkness: JobCheck = (ctx) => {
  const castIds = new Set([id("SALT_AND_DARKNESS"), id("SALT_AND_DARKNESS_DAMAGE")]);
  const presses = ctx.player.casts.filter((c) => castIds.has(c.abilityId)).map((c) => c.timestamp).sort((a, b) => a - b)
    .filter((t, i, all) => i === 0 || t - all[i - 1] > SALT_PRESS_MS);
  const dealt = ctx.player.damageDone.filter((e) => e.abilityId === id("SALT_AND_DARKNESS_DAMAGE") && e.timestamp < ctx.endMs)
    .reduce((a, e) => a + (e.amount ?? 0), 0);
  const used = presses.filter((t) => t < ctx.endMs).length;
  if (used === 0 || dealt === 0) return [];
  const avg = dealt / used;
  const out: DamageFinding[] = [];
  for (const w of statusWindows(ctx, S.SALTED_EARTH.id)) {
    const end = w.endMs;
    const span = end - w.startMs;
    if (end > ctx.endMs || span < SALTED_EARTH_FULL_MS) continue;
    if (presses.some((t) => t >= w.startMs - 1_000 && t < w.endMs + 100)) continue;
    const blocked = forcedPart(w.startMs, end, ctx.forced);
    const dead = overlapMs(w.startMs, end, ctx.dead);
    const forced = span - blocked.ms - dead < SALT_MIN_FREE_MS;
    out.push(finding(ctx, {
      kind: "missed-followup", startMs: w.startMs, endMs: end, forced,
      cause: forced ? blocked.cause ?? "dead" : undefined,
      label: "Salt and Darkness not used",
      lostDamage: avg,
      basis: `${k(avg)} average Salt and Darkness (${used} used); its 20s recast is always back inside Salted Earth`,
      detail: `Salted Earth at ${clock(w.startMs)} ended without a Salt and Darkness`,
    }));
  }
  return out;
};

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

// Dark Arts overwritten (xivanalysis MPUsage.tsx): The Blackest Night that
// breaks grants Dark Arts, a free Edge / Flood of Shadow; another break
// before an Edge or Flood spends it loses one: her average Edge of
// Shadow. Neither status is in the buff stream; the shield is in the
// healing one: a break is its "removebuff" at the same instant as an
// absorb on that target. In forced time or with a death between: shown,
// not counted. On disk 14 in 932 breaks (bVDR2mTL7YGvMxK1 The Tyrant pull
// 11, 10:16.8 then 10:41.9); the FFLogs top 38 for Red Hot and Deep Blue 1
// in 226. Not counted: a shield that never breaks (126 of 1,058 on disk,
// 15 of 241 among the top 38): a mitigation call whose cost is MP, which
// the log streams the app fetches don't carry for players.
const TBN_ABSORB_MS = 50;
const darkArtsOverwrite: JobCheck = (ctx) => {
  const tbn = S.BLACKEST_NIGHT?.id;
  if (tbn === undefined) return [];
  const h = (ctx.player.healing ?? []).filter((e) => e.abilityId === tbn && e.timestamp < ctx.endMs);
  const absorbs = h.filter((e) => e.healType === "absorbed");
  const breaks = h.filter((e) => e.healType === "removebuff" &&
    absorbs.some((a) => a.target === e.target && Math.abs(a.timestamp - e.timestamp) <= TBN_ABSORB_MS)).map((e) => e.timestamp);
  const spends = ctx.player.casts.filter((c) => c.abilityId === id("EDGE_OF_SHADOW") || c.abilityId === id("FLOOD_OF_SHADOW")).map((c) => c.timestamp);
  const edge = ctx.values.perUse(id("EDGE_OF_SHADOW"));
  const out: DamageFinding[] = [];
  let held: number | undefined;
  const events = [...breaks.map((t) => ({ t, brk: true })), ...spends.map((t) => ({ t, brk: false }))].sort((a, b) => a.t - b.t);
  for (const e of events) {
    if (!e.brk) { held = undefined; continue; }
    if (held !== undefined) {
      const during = forcedPart(held, e.t, ctx.forced);
      const died = ctx.dead.some((d) => d.startMs >= held! && d.startMs <= e.t);
      out.push(finding(ctx, {
        kind: "proc-lost", startMs: e.t, endMs: e.t, forced: died || during.ms > 0,
        cause: died ? "dead" : during.ms > 0 ? during.cause : undefined,
        label: "Dark Arts overwritten", lostDamage: edge,
        basis: `one free Edge of Shadow lost (${k(edge)} average)`,
        detail: `The Blackest Night broke at ${clock(e.t)} with the Dark Arts from ${clock(held)} still unspent`,
      }));
    }
    held = e.t;
  }
  return out;
};

export const DRK_CHECKS: JobCheck[] = [delirium, darkside, blood, aoeCombo, livingShadow, saltAndDarkness, darkArtsOverwrite];
