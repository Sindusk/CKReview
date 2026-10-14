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
//
// Fight or Flight, ported from
// xivanalysis src/parser/jobs/pld/modules/FightOrFlight.tsx: 8 GCDs;
// Goring Blade, Confiteor and the three Blades once each; Blade of Honor,
// Expiacion, Circle of Scorn and Intervene once each; three of Royal
// Authority / Atonement / Supplication / Sepulchre / Holy Spirit.
//
// Warrior, Surging Tempest (+10%, xivanalysis
// src/parser/jobs/war/modules/SurgingTempest.tsx tracks its uptime): drops
// of 2.5s+ after it first goes up.
//
//   Copyright (c) 2018 Saxon Landers & contributors
//   MIT License; full text in THIRD_PARTY_NOTICES.md.

import { XIVA_ACTIONS as A, XIVA_STATUSES as S } from "../xiva-data";
import type { JobCheck } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { forcedPart, inWindows } from "../../timeline";
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

const pldAoeCombo =aoeComboOnOneTarget([[id("TOTAL_ECLIPSE"), id("FAST_BLADE")], [id("PROMINENCE"), id("RIOT_BLADE")]]);
const warAoeCombo = aoeComboOnOneTarget([[id("OVERPOWER"), id("HEAVY_SWING")], [id("MYTHRIL_TEMPEST"), id("MAIM")]]);

export const PLD_CHECKS: JobCheck[] = [fightOrFlight, pldAoeCombo, atonementChainAtKill];
export const WAR_CHECKS: JobCheck[] = [surgingTempest, warAoeCombo, beastGauge];
