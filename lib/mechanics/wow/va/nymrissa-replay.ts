// lib/mechanics/wow/va/nymrissa-replay.ts
//
// Nymrissa Wavecaller's replay spec (lib/replay/fight-spec.ts). Art in
// components/replay-art/va.tsx ("va-nymrissa-..."). She has no detection
// module, so the model is Method's Mythic guide (the Tidebound Grotto lair,
// https://www.method.gg/guides/the-tidebound-grotto/nymrissa-wavecaller,
// read 2026-10-18) checked against the kill Kag91qVZ2YJ7MQAb fight 22
// (3:49); review in docs/replay-reviews/va.md. Nothing is VOD-checked.
//
// From the kill:
//   - Chilling Frost (debuff 1313393, 3 players, ~4.5s): each drops a Frost
//     Orb where they stand when it ends.
//   - Frost Orb: soaking it puts debuff 1313448 (12-16s) on the soaker and
//     leaves Lingering Frost (players standing in it get 1257654). An orb
//     nobody soaks Shatters (raid-wide; none in the kill).
//   - Water Jet (3s cast; 6s debuff 1258901 on the tank, then a 40s
//     stacking 1260637): a jet from Nymrissa that pushes the tank back and,
//     per Method, washes Lingering Frost away.
// Not drawn: the Alluring Bubble and the Swirling Whirlpools (no actor or
// position in the log; the murlocs are drawn as adds), Pop!.

import type { AoeShape } from "@/lib/replay/action-shapes";
import type { CasterEffect, FightReplay } from "@/lib/replay/fight-spec";
import { poseAt, sampleNear, type ReplayData } from "@/lib/replay/ffxiv-replay";
import { actorMap, wowAuraSpans, wowCasts, wowLastAuraNear, wowShape } from "@/lib/replay/wow-helpers";

const CHILLING = 1313393;
const ORB_SOAK = 1313448;
const LINGERING = 1257654;
const WATER_JET = 1281951;          // 3s cast
const JET_DEBUFF = 1258901;         // the 6s push on the tank
const SOAK_YARDS = 4;               // assumed: a soaker within this of an orb took it
const PATCH_YARDS = 5;              // assumed Lingering Frost radius

type Orb = { x: number; y: number; start: number; end: number; soaked: boolean };

/** Every Frost Orb: dropped at a Chilling Frost carrier's feet, until the first soak within SOAK_YARDS. */
function orbs(data: ReplayData): Orb[] {
  const actors = actorMap(data);
  const soaks = wowAuraSpans(data, [ORB_SOAK]).map((s) => ({ t: s.start, p: actors.get(s.target) && poseAt(actors.get(s.target)!, s.start) }));
  const used = new Set<number>();
  const out: Orb[] = [];
  for (const c of wowAuraSpans(data, [CHILLING])) {
    const a = actors.get(c.target);
    const p = a && poseAt(a, c.end);
    if (!p) continue;
    const i = soaks.findIndex((s, k) => !used.has(k) && s.p && s.t >= c.end - 500 && Math.hypot(s.p.x - p.x, s.p.y - p.y) <= SOAK_YARDS * 100);
    if (i >= 0) used.add(i);
    out.push({ x: p.x, y: p.y, start: c.end, end: i >= 0 ? soaks[i].t : Math.min(data.durationMs, c.end + 30000), soaked: i >= 0 });
  }
  return out;
}

function orbEffects(data: ReplayData): CasterEffect[] {
  return orbs(data).map((o) => ({ kind: "va-nymrissa-orb", label: "Frost Orb", x: o.x, y: o.y, start: o.start, end: o.end }));
}

/** Lingering Frost where each orb was soaked, until the last player slid in it (at least 5s). */
function lingering(data: ReplayData): AoeShape[] {
  return orbs(data).filter((o) => o.soaked).map((o) => {
    const last = wowLastAuraNear(data, [LINGERING], o, o.end, PATCH_YARDS, 60000);
    return wowShape({ kind: "circle", x: o.x, y: o.y, range: PATCH_YARDS * 100, name: "Lingering Frost", start: o.end,
      resolve: Math.max(o.end + 5000, (last ?? 0) + 1000), style: "va-nymrissa-frost", noFlash: true });
  });
}

/** Chilling Frost: a pale blue ring on each target until their orb drops. */
function chilling(data: ReplayData): CasterEffect[] {
  return wowAuraSpans(data, [CHILLING]).map((s) => ({ kind: "va-nymrissa-chill", label: "Chilling Frost", actor: s.target, x: 0, y: 0, start: s.start, end: s.end }));
}

/** Water Jet: a 4y jet from Nymrissa through the tank, from the cast to the end of the push. */
function waterJet(data: ReplayData): AoeShape[] {
  const actors = actorMap(data);
  const pushes = wowAuraSpans(data, [JET_DEBUFF]);
  return wowCasts(data, [WATER_JET]).flatMap((c) => {
    const push = pushes.find((p) => Math.abs(p.start - c.t) < 1000);
    const boss = actors.get(c.caster), tank = push && actors.get(push.target);
    const b = boss && sampleNear(boss, c.t, 2000), p = tank && poseAt(tank, c.t);
    if (!b || !p || !push) return [];
    const bearing = ((Math.atan2(p.x - b.x, -(p.y - b.y)) * 180) / Math.PI + 360) % 360;
    return [wowShape({ kind: "rect", x: b.x, y: b.y, bearing, range: Math.hypot(p.x - b.x, p.y - b.y) + 1000, width: 400,
      name: "Water Jet", start: c.begin ?? c.t - 3000, resolve: push.end, style: "va-nymrissa-jet" })];
  });
}

export const NYMRISSA_REPLAY: FightReplay = {
  key: "va-nymrissa",
  game: "wow",
  name: "Nymrissa Wavecaller",
  signature: [CHILLING, WATER_JET, 1260837],
  shapes: (data) => [...lingering(data), ...waterJet(data)],
  effects: (data) => [...orbEffects(data), ...chilling(data)],
};
