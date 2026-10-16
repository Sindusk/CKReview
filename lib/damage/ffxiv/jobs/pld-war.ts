// lib/damage/ffxiv/jobs/pld-war.ts
//
// Paladin and Warrior checks (tank batch). Warrior was built from
// xivanalysis and the 7.x tooltips, then checked against xivanalysis on
// qjCMx4bRfgNKwX9T Dancing Mad kill (7.5, 2026-10-13). Matched: GCD
// uptime, Surging Tempest, the two weaving delays (6:09, 15:27), its 6
// Overpowers on one target (3 forced past HP checks), Onslaught drift
// (it says 2 lost; the drift engine 1, the other was the opener's normal
// hold). Built: Beast Gauge, its 60 overcapped exactly (30 from an
// Infuriate at 80 gauge at 16:11; three 10s past HP checks, forced).
// Not adopted:
// - Infuriate 29/30: simulated with its 5s reduction per spender, it sat
//   at two charges only in the P2-P3 downtime (6:31-7:10).
// - Upheaval 33/34: its 62s at full is spread over stretches that each
//   ended in downtime under 30s held; no stretch lost a use.
// - 3 tincture actions: the 1:59 and 13:03 tinctures had two Onslaughts
//   (the third charge went to movement before), worth the tincture's ~5%
//   of one Onslaught; the 18:03 one had one Inner Chaos because the
//   second Infuriate charge wasn't back before the kill.
// Warrior rechecked on K6qfMamL7rN8yz2Q Vamp Fatale (7.4, 2026-10-14).
// Matched: the expired Inner Release stack (1:26: Primal Ruination at
// 1:22 and Maim at 1:27 where Fell Cleave and Ruination fit around two
// forced Tomahawks), now Fell Cleave minus the Maim in its slot
// (procReplaces; was a whole 81k, now 50k); the 3:25 gap (2.0s); its other
// downtimes by time (1:42, 3:52 have Coffinmaker / Bombpyre movement in
// them). Its Beast Gauge shows no suggestion (its tiers start at 20); ours
// finds 10. The Beast Gauge is on the timeline (jobs/gauges.ts, the same
// simulation). Not adopted: the 8:07 tincture's Onslaught 2/3 (the third
// at 8:38.0, 0.3s after it ended) and Inner Chaos 1/2 (~5% of each, a few
// k); weaving at 0:09 (0.14s, inside the tolerance); defensives.
// Warrior rechecked on the same report's Red Hot and Deep Blue kill (Pull
// 2, 2026-10-14). Matched: GCD uptime (97.0%), the Beast Gauge's 30 lost
// (0:14 Infuriate 20, 6:35 Maim 10), the 4:27 and 6:16 broken combos, the
// 3:24 and 4:27 triple weaves, its GCD downtimes by time (0:34, 2:15,
// 6:54, 7:35, 7:54; 3:13, 7:16, 8:03 are Insane Air / Freaky Pyrotation
// movement here), Tomahawk 6 (5 in movement or before the first hit; 4:48
// counted, 1.3s before Hot Aerial began). Built: Nascent Chaos
// overwritten (nascentChaos below; 0:14.4, 36k, the only one across the
// samples). Not adopted: the 0:09 and 6:36 tinctures' Inner Chaos 1/2 and
// Onslaught 0/3 (used just outside them: ~2% of each); Surging Tempest
// (104.6%, its denominator); defensives.
// Warrior rechecked on the same report's The Tyrant kill (Pull 2,
// 2026-10-15). Matched: the 4:20.9 death, the 2:07 broken combo, Tomahawk
// 9 (all in movement or before the first hit), its GCD downtimes by time
// (2:27 1.6s, 3:16 1.1s; 6:03, 6:29, 7:02, 7:40, 9:28 are Flatliner and
// Stampede movement). Fixed in the boss's context: 6:45's 2.33s (after a
// Tomahawk at 6:45.2, melee GCD 6:50.0) fell past the Fire Breath lines'
// movement window, which ended at the last filler; it now runs to the
// walk back (tyrant-damage-context.ts): 36k → 1.1s movement + 1.1s his.
// Not adopted: Upheaval 20/21 (27s held beyond the opener, under one 30s
// recast) and Onslaught 22/23 (8.4s after the raise); the 6:02
// tincture's Onslaught 1/3 and Inner Chaos 1/2 (5:33 / 5:49 Onslaughts
// before it, the Tomahawk at 6:30 in the towers: a few k); the 10:33
// tincture with 2 GCDs (drunk at 10:33.6 when it came back, 4.4s before
// the kill: valuing it asks him to predict the kill, the tincture rule);
// defensives.
// Warrior's spenders on too few targets (xivanalysis AoE.ts, 2026-10-15):
// Chaotic Cyclone and Decimate under 3, against Inner Chaos and Fell
// Cleave (warAoeCombo). Seen firing, not matched against xivanalysis:
// L9BzKkD2nxcVgHTC Necron pull 15 (Decimate ×4 and Chaotic Cyclone on the
// boss alone, 0:33-2:28, 41-51k each), n6zTGPJh8wkLFRZ9 Vamp Fatale pull 1
// (Decimate 5:20 on the boss, 51k; 5:17 and 5:22 on two, 22-24k).
// Infuriate drift with its 5s refunds (OGCDDowntime.ts, 2026-10-16):
// `infuriateHeld` below. Not matched against a page yet.
//
// Paladin, checked against xivanalysis on jN3XDrf2z8PmLgRJ Vamp pull 8
// (2026-10-08): the window counts match its 7 missed actions and 1
// missed GCD. Fight or Flight is +25%, the FFLogs multiplier on a hit
// with only it up. Not checked here: Oath gauge overcap (xivanalysis
// reports it; it costs Holy Sheltrons, which is mitigation, not damage).
// Rechecked on 2T1HzdPKgbhM43am Dancing Mad fight 10 (2026-10-08): its 6
// missed GCDs and 10 missed fillers match these windows (the last window,
// cut by the kill, is skipped here). Its one missed Requiescat window was
// the Confiteor chain held past the P1 HP check into P2, which is right;
// its lost Expiacion / Circle of Scorn / Intervene uses were held across
// downtime into the next Fight or Flight.
// Rechecked on qjCMx4bRfgNKwX9T fight 16 (7.5, 2026-10-13): its 10 missed
// GCDs, 12 missed combo GCDs and 14 missed oGCDs match once the pre-pull
// Fight or Flight (pressed at −2.2s, 7/8) is seen (statusWindows now
// opens a status whose first event is its removal). Divine Might 38/42:
// 2 expired in downtime (forced), 12:21 ran out 0.17s before a Blade of
// Valor, which read as consumed until checkProcs required a consumer
// beside the removal; the fourth was granted at 18:25 and the kill came
// after Atonement / Supplication / Sepulchre (worth a Holy Spirit over an
// Atonement, a few k; not built). Supplication / Sepulchre 41/42 are one
// chain expired in P2's downtime (forced). Intervene 35/38: 40s of its
// full time is the 11:20-12:06 end-of-P3 hold and transition (forced);
// the rest is the ~1 use the drift finding counts. Not adopted: Oath
// gauge (mitigation); "6 tincture actions" (the tincture placement
// finding: 0:04 and 7:43 would have covered more at 1:57 and 7:53).
// Rechecked on K6qfMamL7rN8yz2Q Vamp Fatale (7.4, 2026-10-14). Matched:
// Fight or Flight 1:11 (Intervene) and 8:20 (1/3 Royal Authority-type),
// the 0:35 uncomboed Riot Blade, Intervene drift (its 11/19, our room for
// 18, ~6 lost), its last two GCD downtimes (8:19, 8:31: under our 0.15s
// tolerance once it's taken off, 0.0s drift). Built: the Atonement chain
// left at the kill (its 21/22; atonementChainAtKill). Not adopted:
// - GCD downtime 0:31, 1:40, 3:49: movement every melee shared (Bombpyre,
//   Coffinmaker's blades), forced in the damage context; 4:54 (0.97s,
//   Rampart + Holy Sheltron) and 5:47 (1.2s, the Flail died under the
//   Atonement) sit in the lenient saws/towers/adds window, though no
//   other melee idled at 4:54 (raised with the user).
// - Weaving 2:14, 5:53 (0.08s each): inside the 0.15s tolerance.
// - Oath gauge (570 lost) and defensives: mitigation. The Oath Gauge is
//   on the timeline (jobs/gauges.ts oathGauge, 570 there too), not counted.
// Rechecked on the same report's Red Hot and Deep Blue kill (Pull 2,
// 2026-10-14). Matched: GCD uptime (93.7% / 94.0%); every Fight or Flight
// window's misses (its 7 Royal Authority-type and 11 oGCDs: 1:10, 2:10,
// 3:10, 4:11, 5:12, 6:35, 7:35, and 8:36 now that kill-cut windows are
// judged; its 2/3 there is the kill); Intervene ~5 lost (13/19),
// Expiacion and Circle of Scorn 1 each (15/17); the Divine Might expired
// at 5:17 (granted 4:46, then 11s of Hot Aerial with no GCD, where the
// instant Holy Spirit is ranged). Built: the tincture placement search
// (tincture.ts): 6:43 → 6:33, before the 6:34 Fight or Flight (10k);
// the best placement had picked 6:17 in the prison, which the
// raid-buff rule rejected, hiding it. Not adopted: Divine Might 17/20's
// other two (8:06.7, dropped by a Holy Spirit that never went off as the
// bosses jumped for Insane Air, movement; 8:33's at the kill); Sepulchre
// 19/20 (the kill); 6:50-6:57 (1.7s gap, Shield Lobs at 6:52 and 6:55,
// 140k) counted as his, raised with the user: the other melee hit Deep
// Blue then, but Kade's CABrk9zXLfJG8h6R kill has a 3.5s gap at 6:50.7
// too, before the arena divides at 6:56.
// Rechecked on the same report's The Tyrant kill (Pull 2, 2026-10-15).
// Matched: its Fight or Flight misses one for one (6:13 and 9:17 at 7/8;
// Royal Authority-group steps short at 6:13, 7:13, 9:17 ×2; Intervene at
// 3:12, 4:13, 5:13, 7:13, 8:15; Expiacion 8:15, 9:17), Intervene ~7 lost
// (15/23), the 2:32 broken combo, its GCD downtimes and the 1:06 tank-swap
// triple weave by time. Built: Sepulchre 24/26 — Royal Authority at
// 9:40.9 with Sepulchre Ready up removes it (atonementChainDropped, 26k;
// the other was gained at the kill's last instant). Across the samples,
// 54 drops, nearly all Royal Authority with Supplication or Sepulchre
// Ready up. Fixed in the engine: the 6:29 (Rampart / Holy Sheltron /
// Intervene) and 7:39 (Holy Sheltron / Intervene / Sprint) triple weaves
// in the Flatliner towers, 103k as weaving delays, are movement: Sprint
// and gap closers don't make a gap a clip (checks.ts; the raid idled to
// 6:34.5 and 7:44.4). Not adopted: Expiacion and Circle of Scorn 20/21
// (the extra use was ready 12-13s before the kill, under the kill rule's
// 15s); the 6:03 tincture's 10/12 GCDs (the 6:01 Flatliner launch and
// 6:29 towers); Oath gauge (Holy Sheltron is mitigation); defensives.
//
// Fight or Flight, ported from
// xivanalysis src/parser/jobs/pld/modules/FightOrFlight.tsx: 8 GCDs;
// Goring Blade, Confiteor and the three Blades once each; Blade of Honor,
// Expiacion, Circle of Scorn and Intervene once each; three of Royal
// Authority / Atonement / Supplication / Sepulchre / Holy Spirit. A Blade
// that never came at all is requiescatChainLost's (below).
//
// Warrior, Surging Tempest (+10%, xivanalysis
// src/parser/jobs/war/modules/SurgingTempest.tsx tracks its uptime): drops
// of 2.5s+ after it first goes up.
//
//   Copyright (c) 2018 Saxon Landers & contributors
//   MIT License; full text in THIRD_PARTY_NOTICES.md.

import { XIVA_ACTIONS as A, XIVA_STATUSES as S } from "../xiva-data";
import type { DamageFinding, JobCheck } from "../../types";
import { COOLDOWN_HOLD_MS, finding, PROC_CONSUME_MS, PROC_EXPIRY_EARLY_MS, type PlayerCheckContext } from "../../checks";
import { forcedPart, inWindows, mergeWindows } from "../../timeline";
import { aoeComboOnOneTarget, burstWindowFindings, castHits, clock, gaugeFindings, k, statusWindows, uptimeFindings, type GaugeEvent, type GaugeSpec } from "./shared";
import { comboLanded } from "./gnb";

const id = (key: string) => A[key].id;

const fightOrFlight: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.FIGHT_OR_FLIGHT.id,
  name: "Fight or Flight",
  bonus: 0.25,
  bonusBasis: "Fight or Flight is +25% (FFLogs multiplier with it alone: 1.25)",
  expectedGcds: () => 8,
  expected: () => [
    { ids: [id("GORING_BLADE")], count: 1, name: "Goring Blade" },
    { ids: [id("CONFITEOR")], count: 1, name: "Confiteor" },
    { ids: [id("BLADE_OF_FAITH")], count: 1, name: "Blade of Faith" },
    { ids: [id("BLADE_OF_TRUTH")], count: 1, name: "Blade of Truth" },
    { ids: [id("BLADE_OF_VALOR")], count: 1, name: "Blade of Valor" },
    { ids: [id("BLADE_OF_HONOR")], count: 1, name: "Blade of Honor" },
    { ids: [id("EXPIACION")], count: 1, name: "Expiacion" },
    { ids: [id("CIRCLE_OF_SCORN")], count: 1, name: "Circle of Scorn" },
    { ids: [id("INTERVENE")], count: 1, name: "Intervene" },
    {
      ids: ["ROYAL_AUTHORITY", "ATONEMENT", "SUPPLICATION", "SEPULCHRE", "HOLY_SPIRIT"].filter((x) => A[x]).map(id),
      count: 3, name: "Royal Authority / Atonement combo GCD",
    },
  ],
});

const surgingTempest: JobCheck = (ctx) => {
  const windows = statusWindows(ctx, S.SURGING_TEMPEST.id);
  if (windows.length === 0) return [];
  return uptimeFindings(ctx, {
    name: "Surging Tempest", bonus: 0.1, bonusBasis: "Surging Tempest is +10% (tooltip)",
    active: windows, fromMs: windows[0].startMs, graceMs: 2_500,
  });
};

// Beast Gauge (cap 100), xivanalysis war/modules/Gauge.tsx: +10 combo'd
// Maim / Storm's Eye, +20 combo'd Storm's Path / Mythril Tempest, +50
// Infuriate; −50 Fell Cleave / Decimate (free under Inner Release),
// Inner Chaos / Chaotic Cyclone. Combo read from bonusPercent, as for GNB.
// 50 gauge is worth one average Fell Cleave.
// The timeline draws the same simulation (jobs/gauges.ts, gaugeTrack).
export function beastGaugeSpec(ctx: PlayerCheckContext): GaugeSpec {
  const events: GaugeEvent[] = [];
  const gains = new Map([["MAIM", 10], ["STORMS_EYE", 10], ["STORMS_PATH", 20], ["MYTHRIL_TEMPEST", 20]].map(([k, n]) => [id(k as string), n as number]));
  const freeUnderIr = new Set([id("FELL_CLEAVE"), id("DECIMATE")]);
  const spenders = new Set([...freeUnderIr, id("INNER_CHAOS"), id("CHAOTIC_CYCLONE")]);
  const ir = statusWindows(ctx, S.INNER_RELEASE.id).map((w) => ({ startMs: w.startMs, endMs: w.endMs + 100 }));
  for (const c of ctx.player.casts) {
    const gain = gains.get(c.abilityId);
    if (gain && comboLanded(ctx, c.abilityId, c.timestamp)) {
      events.push({ t: c.timestamp, type: "gain", amount: gain, label: `${c.abilityName} at high gauge` });
    }
    if (c.abilityId === id("INFURIATE")) events.push({ t: c.timestamp, type: "gain", amount: 50, label: "Infuriate above 50 gauge" });
    if (spenders.has(c.abilityId) && !(freeUnderIr.has(c.abilityId) && inWindows(c.timestamp, ir))) {
      events.push({ t: c.timestamp, type: "spend", amount: 50, label: c.abilityName });
    }
  }
  for (const d of ctx.dead) events.push({ t: d.startMs, type: "reset", label: "death" });
  // Outside Inner Release: its Fell Cleaves are guaranteed crit and direct
  // hit, and the gauge lost would have paid for one outside it.
  const plain = castHits(ctx, id("FELL_CLEAVE")).filter((h) => !inWindows(h.timestamp, ir));
  const avg = plain.length > 0 ? plain.reduce((a, h) => a + (h.amount ?? 0), 0) / plain.length : ctx.values.perUse(id("FELL_CLEAVE"));
  const perPoint = avg / 50;
  return {
    name: "Beast Gauge", unit: "gauge", cap: 100, unitValue: perPoint,
    valueBasis: `${k(avg)} average Fell Cleave outside Inner Release per 50`,
    events,
  };
}
const beastGauge: JobCheck = (ctx) => gaugeFindings(ctx, beastGaugeSpec(ctx));

// Nascent Chaos overwritten (xivanalysis "Infuriate with Nascent Chaos
// applied"): an Infuriate pressed while the last one's Nascent Chaos was
// unused refreshes it, so one Inner Chaos became a Fell Cleave. Its gauge
// still counts (the overcap finding values any lost). K6qfMamL7rN8yz2Q
// Red Hot and Deep Blue: Infuriate at 0:01.4, Inner Release's free Fell
// Cleaves, Infuriate again at 0:14.4 before an Inner Chaos.
const nascentChaos: JobCheck = (ctx): DamageFinding[] => {
  const st = S.NASCENT_CHAOS?.id;
  if (st === undefined) return [];
  const ir = statusWindows(ctx, S.INNER_RELEASE.id).map((w) => ({ startMs: w.startMs, endMs: w.endMs + 100 }));
  const plain = castHits(ctx, id("FELL_CLEAVE")).filter((h) => !inWindows(h.timestamp, ir));
  const fell = plain.length ? plain.reduce((a, h) => a + (h.amount ?? 0), 0) / plain.length : ctx.values.perUse(id("FELL_CLEAVE"));
  const value = Math.max(0, ctx.values.perUse(id("INNER_CHAOS")) - fell);
  if (value <= 0) return [];
  const forced = mergeWindows(ctx.forced);
  return (ctx.player.buffs ?? []).filter((e) => e.abilityId === st && e.buffStatus === "refreshed" && e.timestamp < ctx.endMs)
    .map((e) => finding(ctx, {
      kind: "proc-lost", startMs: e.timestamp, endMs: e.timestamp, forced: inWindows(e.timestamp, forced),
      label: "Nascent Chaos overwritten",
      lostDamage: value,
      basis: `${k(ctx.values.perUse(id("INNER_CHAOS")))} average Inner Chaos − ${k(fell)} average Fell Cleave outside Inner Release`,
      detail: `Infuriate at ${clock(e.timestamp)} with the last one's Nascent Chaos unused: one Inner Chaos lost`,
    }));
};

// The Atonement chain still up at the kill while combo fillers went out
// (K6qfMamL7rN8yz2Q Vamp Fatale, 8:19: Atonement Ready from the last
// Royal Authority, then Fast Blade 8:37 and Riot Blade 8:39 before the
// kill at 8:41; xivanalysis's Atonement / Supplication / Sepulchre 21/22).
// Each filler pressed while a step was left, from the last Royal
// Authority to the kill, is one step lost: the step's
// average minus the filler's, both outside Fight or Flight, whose window
// finding already counts the 25% on those slots. Fillers in forced time
// don't count. checkProcs sees no expiry here: the status is never removed.
const CHAIN: [string, string[]][] = [
  ["ATONEMENT_READY", ["ATONEMENT", "SUPPLICATION", "SEPULCHRE"]],
  ["SUPPLICATION_READY", ["SUPPLICATION", "SEPULCHRE"]],
  ["SEPULCHRE_READY", ["SEPULCHRE"]],
];
const COMBO_FILLERS = ["FAST_BLADE", "RIOT_BLADE", "TOTAL_ECLIPSE", "PROMINENCE"];
const atonementChainAtKill: JobCheck = (ctx) => {
  // Kills only: fillers with the chain up are normal play to line it up
  // with Fight or Flight, and a wipe ends before it comes (jN3XDrf2z8PmLgRJ
  // pulls at 3:35 and 5:05).
  if (ctx.pull.result !== "Kill") return [];
  const fof = statusWindows(ctx, S.FIGHT_OR_FLIGHT.id);
  const avgOutside = (actionId: number) => {
    const hits = castHits(ctx, actionId).filter((h) => !inWindows(h.timestamp, fof));
    return hits.length ? hits.reduce((a, h) => a + (h.amount ?? 0), 0) / hits.length : ctx.values.perUse(actionId);
  };
  const fillerIds = new Set(COMBO_FILLERS.filter((x) => A[x]).map(id));
  for (const [status, steps] of CHAIN) {
    const w = statusWindows(ctx, S[status].id).find((x) => x.endMs > ctx.endMs);
    if (!w) continue;
    const fillers = ctx.uses.filter((u) => u.startMs > w.startMs && u.startMs < ctx.endMs &&
      fillerIds.has(u.action.id) && forcedPart(u.startMs, u.startMs + 1, ctx.forced).ms === 0).slice(0, steps.length);
    if (fillers.length === 0) return [];
    const pairs = fillers.map((f, i) => ({ step: A[steps[i]], filler: f, lost: Math.max(0, avgOutside(id(steps[i])) - avgOutside(f.action.id)) }));
    const lost = pairs.reduce((a, p) => a + p.lost, 0);
    if (lost < 1) return [];
    return [finding(ctx, {
      kind: "proc-lost", startMs: w.startMs, endMs: fillers[fillers.length - 1].startMs,
      forced: false, label: "Atonement chain left at the kill", lostDamage: lost,
      basis: pairs.map((p) => `${k(avgOutside(p.step.id))} ${p.step.name} − ${k(avgOutside(p.filler.action.id))} ${p.filler.abilityName}`).join("; ") +
        " (averages outside Fight or Flight; its window finding counts the 25%)",
      detail: `${S[status].name} was up from ${clock(w.startMs)} to the kill; ${pairs.map((p) => `${p.filler.abilityName} at ${clock(p.filler.startMs)}`).join(" and ")} went out instead of ${pairs.map((p) => p.step.name).join(" and ")}`,
    })];
  }
  return [];
};

// A chain step dropped by another press: Royal Authority with Sepulchre
// Ready up removes it (K6qfMamL7rN8yz2Q The Tyrant, 9:40.9, Supplication
// at 9:38.4; xivanalysis's Sepulchre 24/26, the other one gained at the
// kill). checkProcs only sees expiries. The steps left are lost, each its
// average minus a combo filler's (the GCD that ends up in its place),
// outside Fight or Flight as above.
const atonementChainDropped: JobCheck = (ctx) => {
  const out: DamageFinding[] = [];
  const fof = statusWindows(ctx, S.FIGHT_OR_FLIGHT.id);
  const avgOutside = (actionId: number) => {
    const hits = castHits(ctx, actionId).filter((h) => !inWindows(h.timestamp, fof));
    return hits.length ? hits.reduce((a, h) => a + (h.amount ?? 0), 0) / hits.length : ctx.values.perUse(actionId);
  };
  const fillers = COMBO_FILLERS.filter((x) => A[x]).map(id).filter((x) => castHits(ctx, x).length > 0);
  const filler = fillers.length ? fillers.reduce((a, x) => a + avgOutside(x), 0) / fillers.length : 0;
  const gcdIds = new Set(ctx.uses.map((u) => u.action.id));
  for (const [status, steps] of CHAIN) {
    const sid = S[status].id, stepIds = new Set(steps.map(id));
    for (const e of ctx.player.buffs ?? []) {
      if (e.abilityId !== sid || e.buffStatus !== "removed" || e.timestamp >= ctx.endMs || inWindows(e.timestamp, ctx.dead)) continue;
      const at = ctx.player.casts.find((c) => gcdIds.has(c.abilityId) && Math.abs(c.timestamp - e.timestamp) <= PROC_CONSUME_MS);
      if (!at || stepIds.has(at.abilityId)) continue;
      // Re-applied in the same instant: the chain restarted, not dropped.
      if ((ctx.player.buffs ?? []).some((x) => x.abilityId === sid && x.buffStatus !== "removed" && Math.abs(x.timestamp - e.timestamp) <= PROC_CONSUME_MS)) continue;
      // Run out: checkProcs counts the expiry.
      const applied = [...(ctx.player.buffs ?? [])].reverse().find((x) => x.abilityId === sid && x.buffStatus !== "removed" && x.timestamp < e.timestamp);
      if (applied?.durationMs && e.timestamp >= applied.timestamp + applied.durationMs - PROC_EXPIRY_EARLY_MS) continue;
      const lost = steps.reduce((a, st) => a + Math.max(0, avgOutside(id(st)) - filler), 0);
      if (lost < 1) continue;
      const forced = inWindows(e.timestamp, mergeWindows(ctx.forced));
      out.push(finding(ctx, {
        kind: "proc-lost", startMs: e.timestamp, endMs: e.timestamp, forced,
        cause: forced ? forcedPart(e.timestamp - 1, e.timestamp + 1, ctx.forced).cause : undefined,
        label: `${S[status].name} dropped`, lostDamage: lost,
        basis: steps.map((st) => `${k(avgOutside(id(st)))} ${A[st].name}`).join(" + ") +
          ` − ${steps.length} × ${k(filler)} average combo filler (outside Fight or Flight)`,
        detail: `${S[status].name} dropped: ${at.abilityName} at ${clock(at.timestamp)} went first`,
      }));
    }
  }
  return out;
};

// The Confiteor chain run out (2026-10-16): Requiescat's stacks pay for
// Confiteor and the three Blades; when it ends, each step not pressed
// since it went up is lost, its average minus a combo filler's, outside
// Fight or Flight as above (the window finding counts the 25%, and read
// those steps as "used outside the window"). xivanalysis's Confiteor
// timeout watches only Confiteor Ready, always used on the samples.
// 7HVZra4GNRxfpKzT (Koneko Ashi): Requiescat 4:24.9, Confiteor 4:26.6,
// Blade of Faith 4:41.0, a Holy Spirit took a stack at 4:48.2, ran out
// 4:56.2 with Blade of Truth and Valor never pressed.
const REQUIESCAT_STEPS = ["CONFITEOR", "BLADE_OF_FAITH", "BLADE_OF_TRUTH", "BLADE_OF_VALOR"].filter((x) => A[x]);
const requiescatChainLost: JobCheck = (ctx) => {
  const out: DamageFinding[] = [];
  const fof = statusWindows(ctx, S.FIGHT_OR_FLIGHT.id);
  const avgOutside = (actionId: number) => {
    const hits = castHits(ctx, actionId).filter((h) => !inWindows(h.timestamp, fof));
    return hits.length ? hits.reduce((a, h) => a + (h.amount ?? 0), 0) / hits.length : ctx.values.perUse(actionId);
  };
  const fillers = COMBO_FILLERS.filter((x) => A[x]).map(id).filter((x) => castHits(ctx, x).length > 0);
  const filler = fillers.length ? fillers.reduce((a, x) => a + avgOutside(x), 0) / fillers.length : 0;
  for (const w of statusWindows(ctx, S.REQUIESCAT.id)) {
    if (w.endMs >= ctx.endMs || inWindows(w.endMs, ctx.dead) || ctx.dead.some((d) => d.startMs >= w.endMs && d.startMs - w.endMs <= 3_000)) continue;
    // Its 30s expiry, or its last stack spent at a cast; any other end is
    // the log stripping every buff at a death or wipe (d3vRbwfpNBLzJ2Xh
    // The Tyrant pull 15, 1:09.4).
    const expired = w.endMs - w.startMs >= (S.REQUIESCAT.duration ?? 30_000) - PROC_EXPIRY_EARLY_MS;
    if (!expired && !ctx.player.casts.some((c) => Math.abs(c.timestamp - w.endMs) <= PROC_CONSUME_MS)) continue;
    const missing = REQUIESCAT_STEPS.filter((st) => !ctx.player.casts.some((c) =>
      c.abilityId === id(st) && c.timestamp >= w.startMs - PROC_CONSUME_MS && c.timestamp <= w.endMs + PROC_CONSUME_MS));
    const lost = missing.reduce((a, st) => a + Math.max(0, avgOutside(id(st)) - filler), 0);
    if (missing.length === 0 || lost < 1) continue;
    const forced = inWindows(w.endMs, mergeWindows(ctx.forced));
    out.push(finding(ctx, {
      kind: "proc-lost", startMs: w.endMs, endMs: w.endMs, forced,
      cause: forced ? forcedPart(w.endMs - 1, w.endMs + 1, ctx.forced).cause : undefined,
      label: "Requiescat ran out", lostDamage: lost,
      basis: missing.map((st) => `${k(avgOutside(id(st)))} ${A[st].name}`).join(" + ") +
        ` − ${missing.length} × ${k(filler)} average combo filler (outside Fight or Flight; its window finding counts the 25%)`,
      detail: `Requiescat from ${clock(w.startMs)} ran out at ${clock(w.endMs)} without ${missing.map((st) => A[st].name).join(", ")}`,
    }));
  }
  return out;
};

const pldAoeCombo =aoeComboOnOneTarget([[id("TOTAL_ECLIPSE"), id("FAST_BLADE")], [id("PROMINENCE"), id("RIOT_BLADE")]]);
const warAoeCombo = aoeComboOnOneTarget([[id("OVERPOWER"), id("HEAVY_SWING")], [id("MYTHRIL_TEMPEST"), id("MAIM")],
  [id("CHAOTIC_CYCLONE"), id("INNER_CHAOS"), 3], [id("DECIMATE"), id("FELL_CLEAVE"), 3]]);

export const PLD_CHECKS: JobCheck[] = [fightOrFlight, pldAoeCombo, atonementChainAtKill, atonementChainDropped, requiescatChainLost];
// Infuriate held at two charges (xivanalysis OGCDDowntime.ts with
// `resetBy`): not in tracked-cooldowns.ts, because each Fell Cleave,
// Decimate, Inner Chaos or Chaotic Cyclone takes 5s off its recharge,
// which the drift check can't model. Simulated here: two charges at the
// pull, 60s recharge less the refunds. Time at two charges, past the 2.5s
// opener allowance and 1.25s per stretch, outside forced time and death,
// is held; each whole recharge of it is a use lost, worth one Inner Chaos
// over the combo GCD it would have replaced (Infuriate's 50 gauge and
// Nascent Chaos are one more Inner Chaos). Marked inference: the
// simulation can be off, and says so when an Infuriate was pressed at 0
// charges. 43 of the 164 Warrior pulls on disk sat at two charges for
// 15s+ before forced time was taken out (2026-10-16). A spender pressed
// at two charges wasted its refund, which counts as 5s more held.
// Against xivanalysis on L9BzKkD2nxcVgHTC Necron pull 18 (Widow
// Shadowimage): its checklist says 4 / 7, the app 1 lost (111.5s held:
// Infuriate at 0:05 and 0:14, then not until 3:12). Its 7 assumes refunds
// the player never earned (200 Beast gauge lost at the cap, few Fell
// Cleaves) and runs to the wipe's end; not adopted.
const INFURIATE_REFUND_MS = 5_000;
const INFURIATE_OPENER_MS = 2_500;
const infuriateHeld: JobCheck = (ctx) => {
  const inf = A.INFURIATE;
  if (!inf) return [];
  const recast = inf.cooldown ?? 60_000, max = inf.charges ?? 2;
  const refunds = new Set(["FELL_CLEAVE", "DECIMATE", "INNER_CHAOS", "CHAOTIC_CYCLONE"].filter((x) => A[x]).map(id));
  let charges = max, next: number | null = null, capFrom = 0, negatives = 0, uses = 0;
  const wasted: number[] = [];
  const capped: { startMs: number; endMs: number }[] = [];
  const advance = (t: number) => {
    while (next !== null && next <= t) {
      charges++;
      if (charges >= max) { charges = max; capFrom = next; next = null; } else next += recast;
    }
  };
  for (const c of ctx.player.casts) {
    if (c.timestamp >= ctx.endMs) break;
    if (c.abilityId === inf.id) {
      uses++;
      advance(c.timestamp);
      if (charges === max) { capped.push({ startMs: capFrom, endMs: c.timestamp }); next = c.timestamp + recast; }
      if (charges === 0) negatives++;
      charges = Math.max(0, charges - 1);
    } else if (refunds.has(c.abilityId)) {
      advance(c.timestamp);
      if (next !== null) { next -= INFURIATE_REFUND_MS; advance(c.timestamp); }
      else wasted.push(c.timestamp);
    }
  }
  if (uses === 0) return [];
  advance(ctx.endMs);
  if (charges === max) capped.push({ startMs: capFrom, endMs: ctx.endMs });
  const blockers = [...ctx.forced, ...ctx.dead.map((w) => ({ ...w, cause: "dead" }))];
  let held = 0, longest: { startMs: number; endMs: number; held: number } | undefined;
  for (const w of capped) {
    const allowance = COOLDOWN_HOLD_MS + (w.startMs === 0 ? INFURIATE_OPENER_MS : 0);
    // A spender pressed at two charges wasted its 5s refund too.
    const refundsLost = wasted.filter((t) => t > w.startMs + allowance && t <= w.endMs && !inWindows(t, blockers)).length;
    const h = Math.max(0, w.endMs - w.startMs - forcedPart(w.startMs, w.endMs, blockers).ms - allowance) + refundsLost * INFURIATE_REFUND_MS;
    held += h;
    if (h > 0 && (!longest || h > longest.held)) longest = { ...w, held: h };
  }
  const lostUses = Math.floor(held / recast);
  if (lostUses < 1 || !longest) return [];
  const each = Math.max(0, ctx.values.perUse(id("INNER_CHAOS")) - ctx.values.gcdValue(undefined, false));
  if (each <= 0) return [];
  return [finding(ctx, {
    kind: "cooldown-drift", startMs: longest.startMs, endMs: longest.endMs, forced: false, inference: true,
    label: "Infuriate drift",
    lostDamage: lostUses * each,
    basis: `${lostUses} use${lostUses > 1 ? "s" : ""} × (${k(ctx.values.perUse(id("INNER_CHAOS")))} average Inner Chaos − ` +
      `${k(ctx.values.gcdValue(undefined, false))} average GCD outside raid buffs); recharge simulated with the 5s refunds` +
      (negatives ? ` (${negatives} press${negatives > 1 ? "es" : ""} at 0 simulated charges: the simulation is off)` : ""),
    detail: `Infuriate sat at two charges for ${(held / 1000).toFixed(1)}s in total (${uses} uses): about ${lostUses} use${lostUses > 1 ? "s" : ""} lost`,
  })];
};

export const WAR_CHECKS: JobCheck[] = [surgingTempest, warAoeCombo, beastGauge, nascentChaos, infuriateHeld];
