// lib/damage/wow/specs/melee.ts
//
// Melee checks (docs/archive/damage-analysis-plan.md, "WoW build order" step 6, third
// role batch, 2026-10-06). Which cooldowns and windows matter was informed
// by WoWAnalyzer (read, not copied: AGPL); every id is from our own logs
// (lib/damage/wow/spell-data.ts, the status the spec's cooldown puts on
// them). Sample players per spec: Arms 19, Windwalker 10, Havoc 9,
// Retribution 8, Assassination 6, Subtlety 4, Unholy 3, Frost DK 2, Fury 2,
// Feral, Survival and Outlaw 1 each (fewer than 3: unverified).
//
// Every melee spec gets:
// - its main cooldown's window (burstGcdFindings): GCDs that fit vs GCDs
//   pressed. The window's bonus is read from the player's own hits
//   (observedWindowBonus, capped at 30%), so it's inference.
// - its main resource capped (primaryResourceCapFindings): Rage, Fury,
//   Runic Power, Energy or Focus, whichever the player's casts log most;
//   spenders are every cast that logged a cost of it. Energy and Focus
//   regenerate, and their spenders cost them, so most of that waste stays
//   invisible: the check sees only non-spending casts made at the cap.
// Tracked cooldowns are in tracked-cooldowns.ts.
//
// Retribution, checked against WoWAnalyzer on qpZx3mWaG7gcDdYB pull 3
// (Polpo; reference ACmXHMFtaPLR9k8w fight 15's Yenvenger, 99th
// percentile, page saved; checked 2026-10-13):
// - Matched: Holy Power wasted 41.9% vs 12.9% (holyPowerWaste rebuilds
//   33% vs 6% after forced time: 5.62M vs 1.14M); ability uptime 80.1% vs
//   91.3%; one combat potion of two (potion.ts, 1.77M). The pace check
//   finds his base GCD 1.15s against 1.02s from Yenvenger (3.06M).
// - Cooldowns: Avenging Wrath, Execution Sentence 100%; Wake of Ashes 89%
//   (its holds were in Stasis; no lost use). Divine Toll 90%: ~27s of holds
//   outside Stasis cost at most a cast just before the kill; it isn't
//   tracked (resets).
// - Not adopted: Expurgation 88% vs 92% (small).
//
// Havoc, checked against WoWAnalyzer on qpZx3mWaG7gcDdYB pull 3
// (Mythnarra; reference 3Vz6Qt2RyTPXwpJn's Hawkerton, 100th percentile,
// page saved; checked 2026-10-13):
// - Matched: Eternal Hunt 2 good of 6 (eternalHunt below); potions 2/2.
// - Overstated: Metamorphosis 79% (0:09, 2:53, 5:23): the 2:08 → 2:53 hold
//   ran into Stasis, and 5:23 instead of 4:53 still leaves no fourth use
//   before the kill. Eye Beam 99%, The Hunt 100%, Essence Break 93% (the
//   app: one use, 88k).
// - A floor, not his mistake: Fury at the cap (2.24M, mostly Reaver's
//   Glaive) and small GCD delays (2.64M); Hawkerton shows 2.32M and 3.64M.
//   WoWAnalyzer rates both players' Fury waste good (13.7% / 17.5%).

import type { JobCheck } from "../../types";
import { finding } from "../../checks";
import { forcedPart } from "../../timeline";
import { burstGcdFindings, k, observedWindowBonus, primaryResourceCapFindings, spenderSnapshotWaste, spentCooldownDrift } from "./shared";

const window = (statusId: number, name: string): JobCheck => (ctx) => burstGcdFindings(ctx, {
  statusId, name,
  bonus: observedWindowBonus,
  bonusBasis: "the window's bonus read from the player's own hits, inside vs outside, capped at 30%",
  inference: true,
});

// Main cooldown buff per spec (status id as logged on the player).
const MELEE_WINDOWS: Record<string, [number, string]> = {
  "Arms Warrior":           [107574, "Avatar"],
  "Fury Warrior":           [1719, "Recklessness"],
  "Retribution Paladin":    [31884, "Avenging Wrath"],
  "Havoc Demon Hunter":     [162264, "Metamorphosis"],
  "Windwalker Monk":        [123904, "Invoke Xuen"],
  "Frost Death Knight":     [51271, "Pillar of Frost"],
  "Unholy Death Knight":    [1235391, "Dark Transformation"],
  "Assassination Rogue":    [385627, "Kingsbane"],
  "Subtlety Rogue":         [121471, "Shadow Blades"],
  "Outlaw Rogue":           [13750, "Adrenaline Rush"],
  "Feral Druid":            [106951, "Berserk"],
  "Survival Hunter":        [1250646, "Takedown"],
};

// Arms: Avatar and Colossus Smash recharge with Rage spent (shared.ts
// spentCooldownDrift has the measurement). Colossus Smash's window is a
// buff on the Warrior (208086, 13 on Cocomber's 13 casts), not an enemy
// debuff; Bladestorm resets (15–20s comebacks) and stays unjudged.
const ARMS_SPENT: JobCheck[] = [
  (ctx) => spentCooldownDrift(ctx, {
    name: "Avatar", actionIds: [107574], baseMs: 90_000, resourceType: 1, scale: 10, unitsPerSecond: 20,
    firstUseOffsetMs: 3_000, window: { buffId: 107574 },
  }),
  (ctx) => spentCooldownDrift(ctx, {
    name: "Colossus Smash", actionIds: [167105], baseMs: 45_000, resourceType: 1, scale: 10, unitsPerSecond: 20,
    firstUseOffsetMs: 3_000, window: { buffId: 208086 },
  }),
];

// Havoc's Eternal Hunt: The Hunt (370965) grants Empowered Eye Beam
// (1271144, not in our buff stream), consumed by the next Eye Beam. On
// 3Vz6Qt2RyTPXwpJn the 100th-percentile Hawkerton pressed Eye Beam 0.3–4.2s
// after every Hunt, for 1.8–2.6× an ordinary Eye Beam (median ~2.1×).
// Mythnarra (qpZx3mWaG7gcDdYB pull 3) pressed Eye Beam just before four of
// his six Hunts, so the next came 15–20s later at ordinary damage
// (WoWAnalyzer: 2 good, 4 bad); 6.7s after still counted (2.65×). An Eye
// Beam within EMPOWERED_MS of the Hunt counts as empowered (the buff's
// length isn't logged; 6.7s in, 15.1s out). Lost per miss: the player's own
// empowered average less their ordinary average (both measured; 2.1× the
// ordinary when they had no empowered one). Inference.
const THE_HUNT = 370965;
const EMPOWERED_MS = 10_000;
const EMPOWERED_RATIO = 2.1;
const eternalHunt: JobCheck = (ctx) => {
  const hunts = ctx.player.casts.filter((c) => c.abilityId === THE_HUNT && c.timestamp < ctx.endMs).map((c) => c.timestamp);
  const beams = ctx.player.casts.filter((c) => c.abilityName === "Eye Beam").map((c) => c.timestamp).sort((a, b) => a - b);
  if (hunts.length === 0 || beams.length < 3) return [];
  const hits = ctx.player.damageDone.filter((h) => !h.pet && h.abilityName === "Eye Beam");
  const dmgOf = (i: number) => hits.filter((h) => h.timestamp >= beams[i] && h.timestamp < Math.min(beams[i + 1] ?? Infinity, beams[i] + 4_000))
    .reduce((a, h) => a + (h.amount ?? 0), 0);
  const empowered = new Set<number>();
  const missed: number[] = [];
  for (const h of hunts) {
    const i = beams.findIndex((t) => t > h);
    if (i >= 0 && beams[i] - h <= EMPOWERED_MS) empowered.add(i);
    else if (forcedPart(h, h + EMPOWERED_MS, ctx.forced).ms < EMPOWERED_MS / 2) missed.push(h);
  }
  if (missed.length === 0) return [];
  const avg = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / xs.length;
  const ordinary = avg(beams.map((_, i) => i).filter((i) => !empowered.has(i)).map(dmgOf));
  const boosted = empowered.size ? avg([...empowered].map(dmgOf)) : ordinary * EMPOWERED_RATIO;
  const per = Math.max(0, boosted - ordinary);
  const clock = (ms: number) => { const t = Math.round(ms / 1000); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; };
  return [finding(ctx, {
    kind: "proc-lost", startMs: missed[0], endMs: missed[missed.length - 1] + EMPOWERED_MS, forced: false, inference: true,
    label: "Eternal Hunt not used",
    lostDamage: missed.length * per,
    basis: `${missed.length} × (${k(boosted)} empowered Eye Beam${empowered.size ? ` (${empowered.size} here)` : ` (${EMPOWERED_RATIO}× assumed)`} − ${k(ordinary)} ordinary)`,
    detail: `No Eye Beam within ${EMPOWERED_MS / 1000}s of The Hunt at ${missed.map(clock).join(", ")} (${hunts.length - missed.length} of ${hunts.length} used)`,
    moments: missed.map((t) => ({ startMs: t, endMs: t + EMPOWERED_MS, detail: `The Hunt at ${clock(t)}: no Eye Beam within ${EMPOWERED_MS / 1000}s` })),
  })];
};

// Retribution's Holy Power (type 9), logged on spenders only
// (shared.ts spenderSnapshotWaste has the method and its check).
const holyPowerWaste: JobCheck = (ctx) => spenderSnapshotWaste(ctx, { type: 9, name: "Holy Power" });

export const MELEE_CHECKS: Record<string, JobCheck[]> = Object.fromEntries(
  Object.entries(MELEE_WINDOWS).map(([spec, [id, name]]) => [spec, [
    window(id, name), primaryResourceCapFindings, ...(spec === "Arms Warrior" ? ARMS_SPENT : []),
    ...(spec === "Havoc Demon Hunter" ? [eternalHunt] : []),
    ...(spec === "Retribution Paladin" ? [holyPowerWaste] : []),
  ]]),
);
