// lib/mechanics/ffxiv/tea/replay.ts
//
// The Epic of Alexander's replay spec (lib/replay/fight-spec.ts): shape
// overrides, tethers, boss cues and shapes the game data can't place. Art
// for the cues is in components/replay-art/tea.tsx. Ids and timings from
// the phase modules' headers (living-liquid.ts, ...). Checked on
// Q9zqJb4VLmjhd1B6 fight 4 (a kill), 1NG4Zah79yKYHCDv fights 36 and 74
// (the app's Pulls 35 and 70; Phase 1 to its end), 1NG4Zah79yKYHCDv 19 and HwjvVh3TNAZmMQyq 21 (the
// two Embolus collisions on disk), 2026-10-18; each entry says what it
// fixed. Nothing here is VOD-verified yet: docs/replay-reviews/tea.md has
// the checks.

import type { AoeShape } from "@/lib/replay/action-shapes";
import type { CasterEffect, FightReplay, Override, TetherKind } from "@/lib/replay/fight-spec";
import { poseAt, sampleNear, type ReplayActor, type ReplayData } from "@/lib/replay/ffxiv-replay";

// ── Phase 1: Living Liquid ──────────────────────────────────────────────────

const FLUID_SWING = 18864, FLUID_STRIKE = 18871;
const CASCADE = 18470;
const WAVE_BOSS_VISIBLE = 18466, WAVE_HELPER_VISIBLE = 18468, WAVE_FRONTAL = 18467, WAVE_BOSS_HIDDEN = 18469;
const WAVE_TORNADO_VISIBLE = 18869, WAVE_TORNADO_HIDDEN = 18870;
const SLUICE = 18865;
const DRAINAGE = 18471;
const PRESSURIZE = 18473, OUTBURST = 18474;
const HAND_OF_PRAYER = 18475, HAND_OF_PARTING = 18476;

// Protean Wave: 40y cones 30° wide ([BM] in living-liquid.ts's header; the
// omen m0260sp03o0c has no angle in its name). Every wave in the pulls on
// disk fits 30°: the hidden boss volleys' four cones on their four nearest
// players (Q9zqJb4VLmjhd1B6 4, 1:11.5 and 1:14.6), the tornado ones on
// their nearest (0:38.2).
const WAVE_ANGLE = 30;

const OVERRIDES: Record<number, Override> = {
  // Tank cleaves, 90° ([BM]); exact in the fit check on fight 4 (0:10.8,
  // 0:37.1, 0:56.2 and the Hand's 0:37.2, 0:56.5).
  [FLUID_SWING]: { angle: 90, style: "tankbuster" },
  [FLUID_STRIKE]: { angle: 90, style: "tankbuster" },
  // The visible waves are drawn by protean() below, from their cast bars:
  // the boss's eight cones point at the eight players where they stood when
  // the cast began, and players then step out of them (fight 4 at 1:06.4,
  // fight 36 at 1:44.0: everyone stood inside their own cone at the
  // begincast and outside every cone 3s later; nobody was hit). The seven
  // helpers casting the other seven (18468) log a facing that points north
  // or south only. Each tornado's visible cone points at its nearest player
  // at the begincast (fight 4 0:33.1: the black mage, dancer and warrior,
  // the same three its hidden wave then hit at 0:38.2).
  [WAVE_BOSS_VISIBLE]: { hidden: true },
  [WAVE_HELPER_VISIBLE]: { hidden: true },
  [WAVE_TORNADO_VISIBLE]: { hidden: true },
  // The hidden waves have no telegraph in game (that's the mechanic): a
  // flash as they land. The boss volleys' four cones and the tornadoes'
  // name their target; a tornado wave sometimes doesn't (fight 36 1:55.1,
  // whose hit names the sage), and is then aimed at who it hit.
  [WAVE_BOSS_HIDDEN]: { angle: WAVE_ANGLE },
  [WAVE_TORNADO_HIDDEN]: { angle: WAVE_ANGLE, aim: "hits" },
  // The unbaited frontal "shadow" wave along Living Liquid's facing.
  [WAVE_FRONTAL]: { angle: WAVE_ANGLE },
  // Sluice: drawn by sluice() below. Its four helpers sit on the boss with
  // no target, and the fourth logs the same dummy spot (97.4, 108.4) in
  // every pull.
  [SLUICE]: { hidden: true },
  // Drainage: a 6y tank buster on each tether holder (both tanks every
  // clean pull, per the header); exact on fight 4 at 1:26.2 / 1:26.4.
  [DRAINAGE]: { style: "tankbuster" },
};

/**
 * Drainage's tethers: game tether 3 from two tornadoes to the tanks, 7s
 * before the Drainage hit on each holder (fight 4: 1:19.1 -> 1:26.2 /
 * 1:26.4). Drawn as water.
 */
const TETHERS: Record<number, TetherKind> = {
  3: { element: "tea-water", payoff: [DRAINAGE] },
};

const RANGE_WAVE = 4000;           // centi-yalms
const SLUICE_RADIUS = 500;
const TORNADO_RADIUS = 400;        // the tornado actors' 4.0y hitbox; the puddle's real size is a VOD check
// Embolus speed: HwjvVh3TNAZmMQyq 21, the orb from the north tornado
// (110.6, 89.4) burst 10.0y along the line to the bosses 11.2s after
// Pressurize (0:41.4 -> 0:52.6): 0.9y/s.
const EMBOLUS_SPEED = 0.9;         // yalms per second
const EMBOLUS_STEP_MS = 250;
const HAND_CUE_MS = 4000;          // the Hand's fist / palm before its check: length not in the log

const living = (data: ReplayData, t: number) =>
  data.actors.filter((a) => a.kind === "player").map((a) => ({ a, p: poseAt(a, t) })).filter((x): x is { a: ReplayActor; p: NonNullable<ReturnType<typeof poseAt>> } => !!x.p && x.p.hp !== 0);
const bearingTo = (ax: number, ay: number, bx: number, by: number) =>
  ((Math.atan2(bx - ax, -(by - ay)) * 180) / Math.PI + 360) % 360;
const byName = (data: ReplayData, re: RegExp) => data.actors.filter((a) => a.kind === "enemy" && re.test(a.name));
const livingLiquid = (data: ReplayData) => data.actors.find((a) => a.kind === "enemy" && a.targetable && a.name === "living liquid");
const liquidHand = (data: ReplayData) => data.actors.find((a) => a.kind === "enemy" && a.targetable && a.name === "liquid hand");

/** Begincasts of `id`, one per burst (several helpers begin the same cast together). */
function bursts(data: ReplayData, id: number, gapMs = 1500) {
  const out: { t: number; dur: number }[] = [];
  for (const c of data.enemyCasts ?? []) {
    if (c[4] !== id || c[3] <= 0) continue;
    if (out.length && c[0] - out[out.length - 1].t < gapMs) continue;
    out.push({ t: c[0], dur: c[3] });
  }
  return out;
}

/** The visible Protean Waves, telegraphed through their 2.7s cast bars (see OVERRIDES). */
function protean(data: ReplayData): AoeShape[] {
  const out: AoeShape[] = [];
  const casts = data.enemyCasts ?? [];
  const base = { kind: "cone" as const, range: RANGE_WAVE, width: 0, angle: WAVE_ANGLE, inner: 0, estimated: false, style: "aoe" as const, name: "Protean Wave" };
  const ll = livingLiquid(data);
  for (const b of bursts(data, WAVE_BOSS_VISIBLE)) {
    const o = ll && poseAt(ll, b.t);
    const landed = casts.some((c) => c[4] === WAVE_BOSS_VISIBLE && c[3] === 0 && Math.abs(c[0] - (b.t + b.dur)) < 800);
    if (!o || !landed) continue;
    for (const { p } of living(data, b.t)) {
      out.push({ ...base, x: o.x, y: o.y, bearing: bearingTo(o.x, o.y, p.x, p.y), start: b.t, resolve: b.t + b.dur });
    }
  }
  // Tornadoes: each landing cast's caster is placed; its begincast often
  // comes from an unplaced actor.
  for (const b of bursts(data, WAVE_TORNADO_VISIBLE)) {
    const players = living(data, b.t);
    for (const c of casts) {
      if (c[4] !== WAVE_TORNADO_VISIBLE || c[3] !== 0 || Math.abs(c[0] - (b.t + b.dur)) >= 800) continue;
      const tornado = data.actors.find((a) => a.key === c[1]);
      const o = tornado && sampleNear(tornado, c[0], 1500);
      if (!o || !players.length) continue;
      const near = players.reduce((m, x) => (Math.hypot(x.p.x - o.x, x.p.y - o.y) < Math.hypot(m.p.x - o.x, m.p.y - o.y) ? x : m));
      out.push({ ...base, x: o.x, y: o.y, bearing: bearingTo(o.x, o.y, near.p.x, near.p.y), start: b.t, resolve: c[0] });
    }
  }
  return out;
}

/**
 * Sluice: 5y circles on the four players farthest from Living Liquid,
 * placed when the cast begins (header [BM]; Materia: "on the 4 players
 * furthest from the boss"), shown through the 2.7s cast. Fight 4 1:11.5:
 * the dancer, sage, white mage and black mage stood 12-14y out, the rest
 * 3.5-4.5y; nobody was hit at 1:14.5, everyone having moved in.
 */
function sluice(data: ReplayData): AoeShape[] {
  const out: AoeShape[] = [];
  const ll = livingLiquid(data);
  const casts = data.enemyCasts ?? [];
  for (const b of bursts(data, SLUICE)) {
    const o = ll && poseAt(ll, b.t);
    const landed = casts.some((c) => c[4] === SLUICE && c[3] === 0 && Math.abs(c[0] - (b.t + b.dur)) < 800);
    if (!o || !landed) continue;
    const far = living(data, b.t).sort((p, q) => Math.hypot(q.p.x - o.x, q.p.y - o.y) - Math.hypot(p.p.x - o.x, p.p.y - o.y)).slice(0, 4);
    for (const { p } of far) {
      out.push({ kind: "circle", x: p.x, y: p.y, bearing: 0, range: SLUICE_RADIUS, width: 0, angle: 0, inner: 0, estimated: false,
        style: "aoe", name: "Sluice", start: b.t, resolve: b.t + b.dur });
    }
  }
  return out;
}

/** Ends of Living Liquid's phase: its last sample (it died, or the pull ended). */
const phaseOneEnd = (data: ReplayData) => {
  const ll = livingLiquid(data);
  return ll?.samples.length ? ll.samples[ll.samples.length - 1][0] : data.durationMs;
};

function phaseOneEffects(data: ReplayData): CasterEffect[] {
  const casts = data.enemyCasts ?? [];
  const out: CasterEffect[] = [];
  const llEnd = phaseOneEnd(data);
  const cascades = casts.filter((c) => c[4] === CASCADE && c[3] === 0).map((c) => c[0]);

  // Cascade's three tornadoes and their puddles, cardinal or intercardinal
  // (fight 4: S, N, E; fight 74: NW, NE, SW), until Drainage clears them
  // (Materia: Drainage "clears the tornado puddles") or the next Cascade
  // or Living Liquid's death. Their places come from the "liquid rage"
  // helpers' few samples (one or two each, as they cast).
  const rages = byName(data, /^liquid rage/);
  cascades.forEach((t0, i) => {
    const next = cascades[i + 1] ?? Infinity;
    const drain = casts.filter((c) => c[4] === DRAINAGE && c[3] === 0 && c[0] > t0 && c[0] < next).map((c) => c[0]);
    const end = Math.min(drain.length ? Math.max(...drain) + 500 : Infinity, next, llEnd);
    const spots: { x: number; y: number }[] = [];
    for (const a of rages) for (const s of a.samples) {
      if (s[0] < t0 || s[0] > Math.min(next, llEnd + 2000)) continue;
      if (!spots.some((p) => Math.hypot(p.x - s[1], p.y - s[2]) < 200)) spots.push({ x: s[1], y: s[2] });
    }
    for (const p of spots.slice(0, 3)) out.push({ kind: "tea-tornado", layer: "floor", label: "", radius: TORNADO_RADIUS, x: p.x, y: p.y, start: t0, end });
  });

  // Embolus: Pressurize spawns an orb at each of two tornadoes; each drifts
  // toward where Living Liquid or the Hand stood at that moment (one each)
  // and bursts on whoever touches it (Outburst). The log places an orb only
  // when it bursts, so the path is drawn from the speed above, in short
  // steps, until it bursts, the tornadoes go, or the phase ends.
  const ll = livingLiquid(data), hand = liquidHand(data);
  const bursts = casts.filter((c) => c[4] === OUTBURST && c[3] === 0);
  const pressurize = casts.filter((c) => c[4] === PRESSURIZE && c[3] === 0);
  const groups = pressurize.filter((c, i) => i === 0 || c[0] - pressurize[i - 1][0] > 2000).map((g) => pressurize.filter((c) => Math.abs(c[0] - g[0]) <= 2000));
  for (const group of groups) {
    const t0 = group[0][0];
    const next = cascades.find((c) => c > t0) ?? Infinity;
    const drain = casts.find((c) => c[4] === DRAINAGE && c[3] === 0 && c[0] > t0 && c[0] < next)?.[0] ?? Infinity;
    const stop = Math.min(next, drain, llEnd);
    const targets = [ll, hand].map((a) => a && poseAt(a, t0)).filter((p): p is NonNullable<typeof p> => !!p);
    const used = new Set<number>();
    for (const c of group) {
      const tornado = data.actors.find((a) => a.key === c[1]);
      // Tornadoes don't move; their helpers log a sample only when they
      // cast (fight 36: Liquid Gaol at 1:35.9, Pressurize at 1:59.1).
      const o = tornado && sampleNear(tornado, t0, 40000);
      if (!o || !targets.length) continue;
      let k = targets.findIndex((_, j) => !used.has(j));
      targets.forEach((p, j) => { if (!used.has(j) && Math.hypot(p.x - o.x, p.y - o.y) < Math.hypot(targets[k].x - o.x, targets[k].y - o.y)) k = j; });
      used.add(k);
      const dest = targets[k];
      const len = Math.hypot(dest.x - o.x, dest.y - o.y);
      const arrive = t0 + (len / 100 / EMBOLUS_SPEED) * 1000;
      const at = (t: number) => { const f = Math.min(1, (t - t0) / Math.max(1, arrive - t0)); return { x: o.x + (dest.x - o.x) * f, y: o.y + (dest.y - o.y) * f }; };
      // Its burst: an Outburst near its path.
      const pop = bursts.find((b) => {
        if (b[0] < t0 || b[0] > stop) return false;
        const who = data.actors.find((a) => a.key === b[1]);
        const bp = who && sampleNear(who, b[0], 1500);
        if (!bp) return false;
        const p = at(b[0]);
        return Math.hypot(bp.x - p.x, bp.y - p.y) < 500 || Math.hypot(bp.x - o.x, bp.y - o.y) < 200;
      });
      const end = Math.min(stop, pop ? pop[0] : Infinity);
      for (let t = t0; t < end; t += EMBOLUS_STEP_MS) {
        const p = at(t);
        out.push({ kind: "tea-embolus", label: t === t0 ? "Embolus" : "", x: p.x, y: p.y, start: t, end: Math.min(end, t + EMBOLUS_STEP_MS) });
      }
    }
  }

  // Hand of Prayer (closed fist: move the bosses apart) / Parting (open
  // palm: bring them together), shown on the Hand before its check. The log
  // has only the resolving cast (fight 4: Parting 0:35.1, no begincast);
  // the gesture's lead time is a guess (HAND_CUE_MS).
  for (const c of casts) {
    if ((c[4] !== HAND_OF_PRAYER && c[4] !== HAND_OF_PARTING) || c[3] !== 0) continue;
    const h = data.actors.find((a) => a.key === c[1]);
    const p = h && (poseAt(h, c[0]) ?? sampleNear(h, c[0], 3000));
    if (!h || !p) continue;
    const fist = c[4] === HAND_OF_PRAYER;
    out.push({
      kind: fist ? "tea-hand-fist" : "tea-hand-palm", label: fist ? "Fist: bosses apart" : "Palm: bosses together",
      actor: h.key, x: p.x, y: p.y, start: c[0] - HAND_CUE_MS, end: c[0] + 300,
    });
  }
  return out;
}

export const TEA_REPLAY: FightReplay = {
  key: "tea",
  game: "ffxiv",
  name: "The Epic of Alexander",
  signature: [FLUID_SWING, CASCADE, WAVE_BOSS_VISIBLE, WAVE_TORNADO_VISIBLE],
  overrides: OVERRIDES,
  tethers: TETHERS,
  effects: (data) => [...phaseOneEffects(data)],
  shapes: (data) => [...protean(data), ...sluice(data)],
};
