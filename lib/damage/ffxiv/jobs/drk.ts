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
// downtime, so they're forced. MP overcap (one Edge of Shadow) and Dark
// Arts overwrite: below.
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
import type { DamageFinding, GaugeTrack, JobCheck } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { forcedPart, inWindows, mergeWindows, overlapMs, type Window } from "../../timeline";
import { aoeComboOnOneTarget, burstWindowFindings, castHits, fromLevel, gaugeFindings, k, statusWindows, uptimeFindings, type GaugeEvent } from "./shared";
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
/** When The Blackest Night broke (each grants Dark Arts). */
function darkArtsBreaks(ctx: PlayerCheckContext): number[] {
  const tbn = S.BLACKEST_NIGHT?.id;
  if (tbn === undefined) return [];
  const h = (ctx.player.healing ?? []).filter((e) => e.abilityId === tbn && e.timestamp < ctx.endMs);
  const absorbs = h.filter((e) => e.healType === "absorbed");
  return h.filter((e) => e.healType === "removebuff" &&
    absorbs.some((a) => a.target === e.target && Math.abs(a.timestamp - e.timestamp) <= TBN_ABSORB_MS))
    .map((e) => e.timestamp).sort((a, b) => a - b);
}
const darkArtsOverwrite: JobCheck = (ctx) => {
  const breaks = darkArtsBreaks(ctx);
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

// MP over the cap (xivanalysis MPUsage.tsx), read from the log: each cast
// carries the Dark Knight's MP before its effect (FFLogs
// sourceResources.mp; kept since 2026-10-16, so older samples have none and
// this stays silent). Lost:
// - regen, 200 per 3s tick, between two casts both at the cap;
// - a gain landing at or near the cap, by xivanalysis's amounts: Syphon
//   Strike / Stalwart Soul in combo and Carve and Spit 600, a GCD that
//   spends a Blood Weapon stack 600, Scarlet Delirium / Comeuppance /
//   Torcleaver 200, Impalement 500.
// In forced time not counted (MP fills in downtime), nor before the first
// spend (the pull starts full), nor a stretch under one tick (200). 3000
// MP is one Edge of Shadow (her average); one finding per stretch at the
// cap. Also the MP lane (gauges.ts). 2T1HzdPKgbhM43am fight 10 (Toast
// Takelci): ~1900 MP here (12:16-12:20, Comeuppance and Torcleaver into a
// full gauge), xivanalysis "one Edge of Shadow" (3000+): its extra is
// the 7:12 Comeuppance, whose MP the log shows arriving after the 7:12.5
// Blackest Night spent 3000.
const MP_TICK = 200, MP_TICK_MS = 3_000, EDGE_MP = 3_000;
const MP_GAINS: [string, number][] = [
  ["SYPHON_STRIKE", 600], ["STALWART_SOUL", 600], ["CARVE_AND_SPIT", 600],
  ["SCARLET_DELIRIUM", 200], ["COMEUPPANCE", 200], ["TORCLEAVER", 200], ["IMPALEMENT", 500],
];
type MpLoss = { t: number; mp: number; how: string };
const MP_HIT_MS = 1_500, MP_HIT_DEFAULT_MS = 600;
// Between two casts the MP runs from the first's logged value: its own cost
// (The Blackest Night, or an Edge / Flood without Dark Arts: 3000), then
// each gain when its hit lands, then regen at 200 per 3s spread evenly.
// What would pass 10000 is lost only if the next cast still logs 10000:
// 2T1HzdPKgbhM43am fight 10, Comeuppance cast at 10000 (7:11.9) hit after
// the 7:12.5 Blackest Night and its MP arrived (7:13.1 logs 8000);
// Torcleaver at 12:19.6 hit before the 12:20.4 Edge, which logged 10000.
export function drkMpLosses(ctx: PlayerCheckContext): MpLoss[] | undefined {
  const casts = ctx.player.casts.filter((c) => c.mp !== undefined && c.timestamp < ctx.endMs).sort((a, b) => a.timestamp - b.timestamp);
  if (casts.length === 0) return undefined;
  const max = casts[0].maxMp ?? 10_000;
  const gainOf = new Map(MP_GAINS.filter(([key]) => A[key]).map(([key, n]) => [A[key].id, n]));
  const bloodWeapon = (ctx.player.buffs ?? []).filter((b) => b.abilityId === S.BLOOD_WEAPON?.id &&
    (b.buffStatus === "stackRemoved" || b.buffStatus === "removed")).map((b) => b.timestamp);
  const hitAt = (c: (typeof casts)[number]) => ctx.player.damageDone.find((e) => e.abilityId === c.abilityId && !e.isDoT && !e.pet &&
    e.timestamp >= c.timestamp && e.timestamp <= c.timestamp + MP_HIT_MS)?.timestamp ?? c.timestamp + MP_HIT_DEFAULT_MS;
  const gains: { t: number; mp: number; how: string }[] = [];
  for (const c of ctx.player.casts) {
    let gain = gainOf.get(c.abilityId) ?? 0;
    // The combo steps give MP only in combo.
    if ((c.abilityId === id("SYPHON_STRIKE") || c.abilityId === id("STALWART_SOUL")) && !comboLanded(ctx, c.abilityId, c.timestamp)) gain = 0;
    if (bloodWeapon.some((t) => Math.abs(t - c.timestamp) <= 100)) gain += 600;
    if (gain > 0) gains.push({ t: hitAt(c), mp: gain, how: c.abilityName });
  }
  // Dark Arts (darkArtsBreaks) makes the next Edge / Flood free.
  const breaks = darkArtsBreaks(ctx);
  const spenders = new Set([id("EDGE_OF_SHADOW"), id("FLOOD_OF_SHADOW")]);
  let darkArts = false, bi = 0;
  const out: MpLoss[] = [];
  casts.forEach((c, i) => {
    while (bi < breaks.length && breaks[bi] <= c.timestamp) { darkArts = true; bi++; }
    let cost = 0;
    if (c.abilityId === id("THE_BLACKEST_NIGHT")) cost = EDGE_MP;
    else if (spenders.has(c.abilityId)) { cost = darkArts ? 0 : EDGE_MP; darkArts = false; }
    const next = casts[i + 1];
    if (!next || next.mp! < max) return;
    let mp = c.mp! - cost, last = c.timestamp;
    const lost: MpLoss[] = [];
    const add = (t: number, n: number, how: string) => {
      mp += n;
      if (mp > max) { lost.push({ t, mp: mp - max, how }); mp = max; }
    };
    for (const g of gains.filter((x) => x.t > c.timestamp && x.t <= next.timestamp).sort((a, b) => a.t - b.t)) {
      add(g.t, (MP_TICK * (g.t - last)) / MP_TICK_MS, "regen");
      last = g.t;
      add(g.t, g.mp, g.how);
    }
    add(next.timestamp, (MP_TICK * (next.timestamp - last)) / MP_TICK_MS, "regen");
    out.push(...lost.filter((l) => l.mp >= 1));
  });
  return out;
}
const drkMp: JobCheck = (ctx) => {
  const losses = drkMpLosses(ctx);
  if (!losses?.length) return [];
  const forced = mergeWindows(ctx.forced);
  // The pull starts at 10000: regen before the first spend is everyone's.
  const firstSpend = ctx.player.casts.find((c) => [id("EDGE_OF_SHADOW"), id("FLOOD_OF_SHADOW"), id("THE_BLACKEST_NIGHT")].includes(c.abilityId))?.timestamp ?? 0;
  const counted = losses.filter((l) => !inWindows(l.t, forced) && l.t > firstSpend);
  const edge = ctx.values.perUse(id("EDGE_OF_SHADOW"));
  // One finding per stretch: losses less than 10s apart.
  const out: DamageFinding[] = [];
  let group: MpLoss[] = [];
  const flush = () => {
    if (!group.length) return;
    const mp = Math.round(group.reduce((a, l) => a + l.mp, 0));
    const regen = Math.round(group.filter((l) => l.how === "regen").reduce((a, l) => a + l.mp, 0));
    // Under one regen tick is within the model's timing error.
    if (mp < MP_TICK) { group = []; return; }
    out.push(finding(ctx, {
      kind: "gauge-overcap", startMs: group[0].t, endMs: group[group.length - 1].t, forced: false,
      label: "MP over the cap", lostDamage: (mp / EDGE_MP) * edge,
      basis: `${mp} MP ÷ 3000 × ${k(edge)} average Edge of Shadow`,
      detail: `${mp} MP lost at 10000 from ${clock(group[0].t)}` + (regen ? ` (${regen} of it regen)` : "") +
        (mp > regen ? `; gains at the cap: ${[...new Set(group.filter((l) => l.how !== "regen").map((l) => l.how))].join(", ")}` : ""),
    }));
    group = [];
  };
  for (const l of counted) {
    if (group.length && l.t - group[group.length - 1].t > 10_000) flush();
    group.push(l);
  }
  flush();
  return out;
};

/** The Damage dialog's Dark Knight MP lane: the logged MP at each cast. */
export function drkMpTracks(ctx: PlayerCheckContext): GaugeTrack[] {
  const casts = ctx.player.casts.filter((c) => c.mp !== undefined && c.timestamp < ctx.endMs).sort((a, b) => a.timestamp - b.timestamp);
  if (casts.length === 0) return [];
  const max = casts[0].maxMp ?? 10_000;
  const steps: GaugeTrack["steps"] = [];
  const capped: GaugeTrack["capped"] = [];
  let since: number | undefined;
  for (const c of casts) {
    const v = c.mp! / 1000;
    if (!steps.length || steps[steps.length - 1].value !== v) steps.push({ t: Math.max(0, c.timestamp), value: v });
    if (c.mp! >= max) since ??= Math.max(0, c.timestamp);
    else if (since !== undefined) { capped.push({ startMs: since, endMs: c.timestamp }); since = undefined; }
  }
  const losses = drkMpLosses(ctx) ?? [];
  const lost = Math.round(losses.reduce((a, l) => a + l.mp, 0));
  return [{
    name: "MP", max: max / 1000, steps, capped,
    note: `MP in thousands, as logged at each cast; amber at 10000; about ${lost} MP lost at the cap in all (the MP findings count it outside downtime)`,
  }];
}

// fromLevel (shared.ts): Edge / Flood of Shadow are 74 (Edge of Darkness
// before), Salt and Darkness 86.
export const DRK_CHECKS: JobCheck[] = [delirium, fromLevel(74, darkside), blood, aoeCombo, livingShadow, fromLevel(86, saltAndDarkness),
  fromLevel(74, darkArtsOverwrite), fromLevel(74, drkMp)];
