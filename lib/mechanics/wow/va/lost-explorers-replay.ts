// lib/mechanics/wow/va/lost-explorers-replay.ts
//
// The Lost Explorers' replay spec (lib/replay/fight-spec.ts). Art in
// components/replay-art/va.tsx ("va-lost-explorers-..."). Built from the
// kill nHavrDhPVtBYkMXA fight 37 (4:17: Iku fed at 0:59, Nama at 3:00, no
// Gebbo window); review in docs/replay-reviews/va.md. Nothing here is
// VOD-checked yet.
//
// Not drawn: crates (no actors; a landing shows only as Throw Junk's 3y
// hit circle on whoever it hit), who stomped them, the fish's carrier,
// United Defense's range, Gebbo's bombs and mushrooms (not in this kill).

import type { AoeShape } from "@/lib/replay/action-shapes";
import type { CasterEffect, FightReplay } from "@/lib/replay/fight-spec";
import { poseAt, type ReplayData } from "@/lib/replay/ffxiv-replay";
import { actorMap, wowAuraSpans, wowCasts, wowImpacts, wowShape } from "@/lib/replay/wow-helpers";

const CHARGE = 1297075;            // Mor'zahi gains the Final Ascension charge: the 60s clock starts
const COMMANDS = [1296975, 1297022, 1297024];   // Nama, Iku, Gebbo fed: the clock stops
const CLOCK_MS = 65000;            // 60s to the cast, 5s cast
const FISH = 1292490;              // the fish's actor appears (its crate opened)
const BLINK_MARK = 1296025;        // 7s on the player Iku blinks to
const SHELL_SPIN = 1296062;        // Nama, 4s cast, three shells toward its target
const SHELL_STUN = 1291918;
const FIRE_MISSILE = 1295893, FROST_MISSILE = 1295985;   // db2 10y
const BURNING = 1295928, PIERCING = 1295954;    // the element a missile left on a player
const FIRE_PATCH = 1297649, FROST_PATCH = 1297648;      // "debuffs" for standing in a patch
const THUD_CAST = 1296094;         // Mighty Thud: 10s cast, then a leap at each mark
const THUD_LEAP = 1296133;         // a leap, target = the marked player
const THUD_HIT = 1300237;          // the split
const AFTERSHOCK = 1310500;        // debuff for standing in a leap's Aftershock
const STATUE_FLAMES = 1292796;     // the Creepy Statues' cast at the pull: where they stand

/** Mor'zahi's Final Ascension clock, from each charge to the Command that stops it. */
function clock(data: ReplayData): CasterEffect[] {
  const charges = wowCasts(data, [CHARGE]);
  const commands = wowCasts(data, COMMANDS);
  const mor = data.actors.find((a) => a.name === "Mor'zahi");
  const p = mor?.samples[0];
  if (!p) return [];
  return charges.map((c) => {
    const stop = commands.find((m) => m.t > c.t)?.t;
    return { kind: "va-lost-explorers-clock", label: "Final Ascension", x: p[1], y: p[2], radius: 400,
      start: c.t, end: Math.min(stop ?? c.t + CLOCK_MS, c.t + CLOCK_MS) };
  });
}

/** The seven Creepy Statues, where their Evil Eyes come from, for the whole pull. */
function statues(data: ReplayData): CasterEffect[] {
  const actors = actorMap(data);
  const seen = new Set<string>();
  const out: CasterEffect[] = [];
  for (const c of wowCasts(data, [STATUE_FLAMES])) {
    const s = actors.get(c.caster)?.samples[0];
    if (!s || seen.has(c.caster)) continue;
    seen.add(c.caster);
    out.push({ kind: "va-lost-explorers-statue", layer: "floor", label: "Creepy Statue", x: s[1], y: s[2], start: 0, end: data.durationMs });
  }
  return out;
}

/** The fish where its crate opened, for a few seconds. */
function fish(data: ReplayData): CasterEffect[] {
  const actors = actorMap(data);
  return wowCasts(data, [FISH]).flatMap((c) => {
    const s = actors.get(c.caster)?.samples[0];
    return s ? [{ kind: "va-lost-explorers-fish", label: "Disgusting Fish", x: s[1], y: s[2], start: c.t, end: c.t + 4000 }] : [];
  });
}

/** Blink Nova: a ring on the player Iku will blink to, for the 7s mark. */
function blink(data: ReplayData): CasterEffect[] {
  return wowAuraSpans(data, [BLINK_MARK]).map((s) => ({
    kind: "va-lost-explorers-blink", label: "Blink Nova", actor: s.target, x: 0, y: 0, start: s.start, end: s.end,
  }));
}

/**
 * Shell Spin: not a cone. In the kill the players standing on the line
 * from Nama to the cast's target, 4-21y out, were NOT stunned (e.g. 0:53:
 * five players within 7° of it), and only 3 stuns landed in 8 casts, so
 * the shells travel in a way the log can't place. Drawn instead: a ring
 * on the player the cast names for its 4s, and a ring on each player
 * stunned (Shell Spin stun 1291918, 4s).
 */
function shellSpin(data: ReplayData): CasterEffect[] {
  const out: CasterEffect[] = wowCasts(data, [SHELL_SPIN]).filter((c) => c.target).map((c) => ({
    kind: "va-lost-explorers-shell", label: "Shell Spin", actor: c.target, x: 0, y: 0, start: c.begin ?? c.t - 4000, end: c.t,
  }));
  for (const s of wowAuraSpans(data, [SHELL_STUN])) {
    out.push({ kind: "va-lost-explorers-stun", label: "Stunned", actor: s.target, x: 0, y: 0, start: s.start, end: s.end });
  }
  return out;
}

/**
 * Frostfire Volley's patches: one where each missile landed (its hits'
 * middle), lasting until the last Fire / Frost Patch tick on a player
 * within PATCH_YARDS of it (the patches clear when an opposite element
 * meets them), at least 3s.
 */
const PATCH_YARDS = 6;
function patches(data: ReplayData): AoeShape[] {
  const actors = actorMap(data);
  const out: AoeShape[] = [];
  for (const [missile, patch, style, name] of [
    [FIRE_MISSILE, FIRE_PATCH, "va-lost-explorers-fire-patch", "Fire Patch"],
    [FROST_MISSILE, FROST_PATCH, "va-lost-explorers-frost-patch", "Frost Patch"],
  ] as const) {
    const ticks = (data.enemyAuras ?? []).filter((a) => a[1] === patch && a[3] === 1)
      .map((a) => ({ t: a[0], p: actors.get(a[2]) && poseAt(actors.get(a[2])!, a[0]) }));
    for (const i of wowImpacts(data, [missile], 10, 400, 4)) {
      let end = i.t + 3000;
      for (const k of ticks) if (k.p && k.t > i.t && k.t - i.t < 40000 && Math.hypot(k.p.x - i.x, k.p.y - i.y) <= PATCH_YARDS * 100) end = Math.max(end, k.t + 1000);
      out.push(wowShape({ kind: "circle", x: i.x, y: i.y, range: 400, name, start: i.t, resolve: end, style, noFlash: true }));
    }
  }
  return out;
}

/**
 * Frostfire Volley's missiles: each hit exactly one player in the kill
 * (5 Fire, then 5 Frost ~0.5s later, per volley), so one 10y circle per
 * struck player, shown for the 2s flight after the cast.
 */
function missiles(data: ReplayData): AoeShape[] {
  return [FIRE_MISSILE, FROST_MISSILE].flatMap((id) => wowImpacts(data, [id], 10, 400, 0.5).map((i) =>
    wowShape({ kind: "circle", x: i.x, y: i.y, range: 1000, name: "Frostfire Volley", start: i.t - 2000, resolve: i.t,
      style: id === FIRE_MISSILE ? "va-lost-explorers-fire" : "ice" })));
}

/** Burning Flames / Piercing Frost on the players carrying them. */
function elements(data: ReplayData): CasterEffect[] {
  return wowAuraSpans(data, [BURNING, PIERCING]).map((s) => ({
    kind: s.id === BURNING ? "va-lost-explorers-burning" : "va-lost-explorers-piercing",
    label: s.id === BURNING ? "Burning Flames" : "Piercing Frost", actor: s.target, x: 0, y: 0, start: s.start, end: s.end,
  }));
}

/**
 * Mighty Thud: a soak circle (6y, the journal's) on each of the three
 * players Nama leaps to, from the 10s cast's start to their leap, then an
 * Aftershock pool where it landed until the last player steps out of it
 * (the Aftershock debuff within 6y; at least 5s).
 */
function thud(data: ReplayData): AoeShape[] {
  const actors = actorMap(data);
  const casts = wowCasts(data, [THUD_CAST]);
  const shocks = (data.enemyAuras ?? []).filter((a) => a[1] === AFTERSHOCK && a[3] === 1)
    .map((a) => ({ t: a[0], p: actors.get(a[2]) && poseAt(actors.get(a[2])!, a[0]) }));
  const out: AoeShape[] = [];
  for (const leap of wowCasts(data, [THUD_LEAP])) {
    const cast = casts.filter((c) => c.t <= leap.t && leap.t - c.t < 8000).pop();
    if (!cast || !leap.target) continue;
    out.push(wowShape({ kind: "circle", x: 0, y: 0, range: 600, name: "Mighty Thud", start: cast.begin ?? cast.t - 10000,
      resolve: leap.t, follow: leap.target, style: "stack" }));
    const a = actors.get(leap.target);
    const p = a && poseAt(a, leap.t);
    if (!p) continue;
    let end = leap.t + 5000;
    for (const k of shocks) if (k.p && k.t > leap.t && k.t - leap.t < 60000 && Math.hypot(k.p.x - p.x, k.p.y - p.y) <= 600) end = Math.max(end, k.t + 1000);
    out.push(wowShape({ kind: "circle", x: p.x, y: p.y, range: 500, name: "Aftershock", start: leap.t, resolve: end,
      style: "va-lost-explorers-aftershock", noFlash: true }));
  }
  return out;
}

export const LOST_EXPLORERS_REPLAY: FightReplay = {
  key: "va-lost-explorers",
  game: "wow",
  name: "The Lost Explorers",
  signature: [CHARGE, SHELL_SPIN, BLINK_MARK],
  hiddenHits: [THUD_HIT, FIRE_MISSILE, FROST_MISSILE],
  shapes: (data) => [...missiles(data), ...patches(data), ...thud(data)],
  effects: (data) => [...clock(data), ...statues(data), ...fish(data), ...blink(data), ...elements(data), ...shellSpin(data)],
};
