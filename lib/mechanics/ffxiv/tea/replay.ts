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

import { facingToCompassBearing } from "@/lib/mechanics/geometry";
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

// ── Intermission: Limit Cut ─────────────────────────────────────────────────

const HAWK_BLASTER = 18480;
const ALPHA_SWORD = 18484, BLASSTY_CHARGE = 19279;

// Alpha Sword: CC's 90° cone ([BM]) from behind each odd number along its
// facing; the data has no angle. Fit check exact, all four on the kill.
OVERRIDES[ALPHA_SWORD] = { angle: 90 };
// Hawk Blaster: drawn by hawkBlaster() below.
OVERRIDES[HAWK_BLASTER] = { hidden: true };

/**
 * Limit Cut's numbers: head markers 79..86 = 1..8 (intermission-limit-cut.ts),
 * shown until the holder's sword (odd) or charge (even) lands: 9.5s (#1)
 * to 25s (#8) after the markers on the kill (1:45.1 -> 2:10.0).
 */
const LIMIT_CUT_MARKERS = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map((n) =>
  [78 + n, { label: String(n), abilities: n % 2 ? [ALPHA_SWORD] : [BLASSTY_CHARGE], lookaheadMs: 30000 }]));

// Optical Sight's Hawk Blaster: two sets of four steps 2.2s apart, each a
// pair of opposite 10y circles turning 45° per step, then one in the
// middle (header). The casts don't place them (both helpers stand in the
// middle and log one sample), but a hit's source position is its circle's
// centre: 1NG4Zah79yKYHCDv 36 (Pull 35) 2:20.7, (85.0, 100.0), 15y west
// of the middle ([BM] said ~14y). Each set's first pair and turning
// direction are fitted to the pull: hit sources must sit on a drawn
// centre, then the fewest living players inside a circle as it lands.
// Q9zqJb4VLmjhd1B6 4: clockwise from NE/SW in both sets, nobody inside;
// Pull 35's second set starts W/E (its hit), so sets are fitted apart.
const HAWK_RING = 1500, HAWK_RADIUS = 1000;
const HAWK_STEP_MS = 2200;
// Shown this long before landing: a guess (VOD check). Under one step, so
// only the next pair shows (3s stacked two steps of circles).
const HAWK_LEAD_MS = 2000;
const HAWK_DAMAGE_LAG_MS = 600;

function hawkBlaster(data: ReplayData): AoeShape[] {
  const casts = (data.enemyCasts ?? []).filter((c) => c[4] === HAWK_BLASTER && c[3] === 0);
  if (!casts.length) return [];
  const hits = (data.enemyHits ?? []).filter((h) => h[1] === HAWK_BLASTER && h[6] !== null);
  const cx = data.map ? -data.map.offsetX * 100 : 10000, cy = data.map ? -data.map.offsetY * 100 : 10000;
  // Steps: casts within 0.5s; one cast = the middle one.
  const steps: { t: number; n: number }[] = [];
  for (const c of casts) {
    const s = steps.find((x) => Math.abs(x.t - c[0]) < 500);
    if (s) s.n++; else steps.push({ t: c[0], n: 1 });
  }
  steps.sort((a, b) => a.t - b.t);
  // Sets: the outer steps before each middle one (a cutoff pull may end mid-set).
  const sets: { t: number; k: number }[][] = [];
  let cur: { t: number; k: number }[] = [];
  const middles: number[] = [];
  for (const s of steps) {
    if (s.n === 1 && cur.length) { middles.push(s.t); sets.push(cur); cur = []; continue; }
    if (s.n === 1) { middles.push(s.t); continue; }
    if (cur.length && s.t - cur[cur.length - 1].t > HAWK_STEP_MS * 1.6) { sets.push(cur); cur = []; }
    cur.push({ t: s.t, k: 0 });
  }
  if (cur.length) sets.push(cur);
  for (const set of sets) {
    // Number the steps from the set's middle blast, so a missing cast
    // doesn't shift the turn.
    const mid = middles.find((m) => m > set[0].t && m - set[set.length - 1].t < HAWK_STEP_MS * 1.6);
    for (const s of set) s.k = mid !== undefined ? 4 - Math.round((mid - s.t) / HAWK_STEP_MS) : Math.round((s.t - set[0].t) / HAWK_STEP_MS);
  }
  const players = data.actors.filter((a) => a.kind === "player");
  const centres = (start: number, dir: number, k: number) => [1, -1].map((g) => {
    const a = ((start + dir * 45 * k) * Math.PI) / 180;
    return { x: cx + g * Math.sin(a) * HAWK_RING, y: cy - g * Math.cos(a) * HAWK_RING };
  });
  const out: AoeShape[] = [];
  const circle = (x: number, y: number, t: number): AoeShape => ({
    kind: "circle", x, y, bearing: 0, range: HAWK_RADIUS, width: 0, angle: 0, inner: 0, estimated: false,
    style: "aoe", name: "Hawk Blaster", start: t - HAWK_LEAD_MS, resolve: t,
  });
  for (const set of sets) {
    let best = { start: 0, dir: 1, cost: Infinity };
    for (const dir of [1, -1]) for (const start of [0, 45, 90, 135]) {
      let cost = dir === 1 ? 0 : 0.5;   // the guides' clockwise wins a tie
      for (const s of set) {
        const cs = centres(start, dir, s.k);
        for (const p of players) {
          const q = poseAt(p, s.t + HAWK_DAMAGE_LAG_MS);
          if (q && q.hp !== 0 && cs.some((c) => Math.hypot(q.x - c.x, q.y - c.y) < HAWK_RADIUS + 50)) cost++;
        }
        for (const h of hits) {
          if (Math.abs(h[0] - s.t - HAWK_DAMAGE_LAG_MS) >= 700 || h[4] === null) continue;
          if (!cs.some((c) => Math.hypot(h[4]! - c.x, h[5]! - c.y) < 200)) cost += 20;
        }
      }
      if (cost < best.cost) best = { start, dir, cost };
    }
    for (const s of set) for (const c of centres(best.start, best.dir, s.k)) out.push(circle(c.x, c.y, s.t));
  }
  for (const m of middles) out.push(circle(cx, cy, m));
  return out;
}

// ── Phase 2: Brute Justice and Cruise Chaser ────────────────────────────────
//
// Ids from bj-cc.ts's header; placements checked on Q9zqJb4VLmjhd1B6 4
// (2:13 to 4:38).

const OPTICAL_HAWK = 18481;
const EYE_OF_THE_CHAKRAM = 18517;
const SPIN_CRUSHER = 19058;
const CRASHING_WAVE = 18496, CRASHING_THUNDER = 18497;
const EARTH_MISSILE = 18510, ICE_MISSILE = 18511, HIDDEN_MINEFIELD = 18513, HIDDEN_MINE = 18514, ENUMERATION = 18512;
const FLARETHROWER = 18502;
const PROPELLER_WIND = 18482, GAVEL = 18492;
const PLASMA_LIMIT_CUT = 18483;
const COMPRESSED_WATER = 1002142, COMPRESSED_LIGHTNING = 1002143;

// Optical Sight's Hawk Blaster: drawn by opticalSight() (the casts sit on
// helpers in the middle).
OVERRIDES[OPTICAL_HAWK] = { hidden: true };
// Eye of the Chakram: the two 6y lines across the arena, baited through
// the middle; shown for their 5.7s cast as the game telegraphs them. Fit
// exact on the kill (2:43.3, nobody hit).
OVERRIDES[EYE_OF_THE_CHAKRAM] = { telegraph: true };
// Spin Crusher: drawn by spinCrusher() (the data's 5y doesn't reach out of
// Cruise Chaser's 5y hitbox).
OVERRIDES[SPIN_CRUSHER] = { hidden: true };
// Water and Lightning: 8y stacks on their carriers (exact on all six).
// Water is shared by three or more, Lightning by exactly two.
OVERRIDES[CRASHING_WAVE] = { style: "tea-water" };
OVERRIDES[CRASHING_THUNDER] = { style: "lightning" };
// Missile Command: two 5y Earth Missiles on the two farthest from Brute
// Justice, then the Hidden Minefield under them, both telegraphed through
// their 2.7s casts (the helpers stand where they land: exact).
OVERRIDES[EARTH_MISSILE] = { telegraph: true };
OVERRIDES[HIDDEN_MINEFIELD] = { telegraph: true, style: "drop" };
// The mines themselves: drawn by mines() as one-soaker towers.
OVERRIDES[HIDDEN_MINE] = { hidden: true };
// Ice Earth Missile on the marked tank, which freezes the first tornado.
OVERRIDES[ICE_MISSILE] = { style: "ice" };
// Enumeration: a 5y stack of exactly three on each marked DPS (marker 65).
// Its helpers stand on the two marked players at the cast (kill 3:19.9:
// the dancer and black mage); a clean one logs no damage. Its own style
// (stack orange): the engine skips a "stack" with no target and no hits.
OVERRIDES[ENUMERATION] = { style: "tea-enum" };
// Flarethrower: Brute Justice's fire cone at its nearest player, aimed
// through the second tornado to burn it. 90° per [BM] (provisional there);
// one hit on the kill (the warrior), so the data can't say.
OVERRIDES[FLARETHROWER] = { angle: 90, style: "tea-fire" };

/** Water / Lightning carriers (head markers 68 / 69 as each status lands, kill 2:35.3 ...). */
const BJCC_MARKERS = {
  68: { label: "Water", abilities: [CRASHING_WAVE], lookaheadMs: 31000 },
  69: { label: "Lightning", abilities: [CRASHING_THUNDER], lookaheadMs: 31000 },
  67: { label: "Ice", abilities: [ICE_MISSILE] },
};
/** Enumeration's ring rides on each marked DPS until it resolves (marker 65 at 3:14.7 -> 3:19.9 on the kill). */
const MARKER_AOES = { 65: { ability: ENUMERATION, name: "Enumeration: 3" } };

// Decree Nisi colours, the BPOG line (bj-cc.ts: Alpha blue, Gamma purple,
// Beta orange, Delta green): the colour a player carries now, and the one
// Verdict says they must hold at Gavel.
const NISI: Record<number, string> = { 1002222: "a", 1002223: "b", 1002137: "g", 1002138: "d" };
const JUDGMENT: Record<number, string> = { 1002224: "a", 1002225: "b", 1002139: "g", 1002140: "d" };
const NISI_LETTER: Record<string, string> = { a: "α", b: "β", g: "γ", d: "δ" };

const OPTICAL_RADIUS = 1000;
const CARRIER_SHOW_MS = 5000;      // a Water / Lightning ring on its carrier for its last 5s
const PILLAR_RADIUS = 400;         // the frozen tornado; its true size isn't in the log
const SHADOW_LENGTH = 2500;

/**
 * Optical Sight: eight 10y Hawk Blasters on where each player stood when
 * the 4.7s cast began, shown through it (kill 2:42.7: the party spread on
 * the clock 17y out, then gathered in the middle; nobody was hit). The
 * helpers casting them all log the middle.
 */
function opticalSight(data: ReplayData): AoeShape[] {
  const out: AoeShape[] = [];
  const casts = data.enemyCasts ?? [];
  for (const b of bursts(data, OPTICAL_HAWK)) {
    if (!casts.some((c) => c[4] === OPTICAL_HAWK && c[3] === 0 && Math.abs(c[0] - (b.t + b.dur)) < 800)) continue;
    for (const { p } of living(data, b.t)) {
      out.push({ kind: "circle", x: p.x, y: p.y, bearing: 0, range: OPTICAL_RADIUS, width: 0, angle: 0, inner: 0, estimated: false,
        style: "aoe", name: "Hawk Blaster", start: b.t, resolve: b.t + b.dur });
    }
  }
  return out;
}

/** Spin Crusher: Cruise Chaser's 90° frontal ([BM]), its 5y plus the hitbox, as it lands (no telegraph in game). */
function spinCrusher(data: ReplayData): AoeShape[] {
  const out: AoeShape[] = [];
  const range = (data.actionGeometry?.[SPIN_CRUSHER]?.range ?? 5) * 100;
  for (const c of data.enemyCasts ?? []) {
    if (c[4] !== SPIN_CRUSHER || c[3] !== 0) continue;
    const cc = data.actors.find((a) => a.key === c[1]);
    const p = cc && (sampleNear(cc, c[0], 1500) ?? poseAt(cc, c[0]));
    if (!cc || !p) continue;
    out.push({ kind: "cone", x: p.x, y: p.y, bearing: facingToCompassBearing(p.facing),
      range: range + (cc.hitbox ?? 500), width: 0, angle: 90, inner: 0, estimated: false, style: "aoe", name: "Spin Crusher",
      start: c[0] - 300, resolve: c[0] });
  }
  return out;
}

/**
 * Hidden Mines: a one-soaker mine on each Minefield spot from its 2.7s
 * cast until the tank sets it off (kill: placed 3:17.8 at (98.2, 113.3)
 * and (102.2, 113.1), the paladin set them off 3:20.7 and 3:21.7 from 3.1y
 * and 2.9y). Drawn at the Minefield's 5y.
 */
function mines(data: ReplayData): AoeShape[] {
  const out: AoeShape[] = [];
  const casts = data.enemyCasts ?? [];
  const spots = casts.filter((c) => c[4] === HIDDEN_MINEFIELD && c[3] === 0).map((c) => {
    const a = data.actors.find((x) => x.key === c[1]);
    return { t: c[0], p: a && sampleNear(a, c[0], 1500) };
  }).filter((s): s is { t: number; p: NonNullable<ReturnType<typeof sampleNear>> } => !!s.p);
  const booms = casts.filter((c) => c[4] === HIDDEN_MINE && c[3] === 0).map((c) => {
    const a = data.actors.find((x) => x.key === c[1]);
    return { t: c[0], p: a && sampleNear(a, c[0], 1500) };
  });
  for (const s of spots) {
    const boom = booms.find((b) => b.t > s.t && b.t - s.t < 15000 && b.p && Math.hypot(b.p.x - s.p.x, b.p.y - s.p.y) < 200);
    const begin = casts.find((c) => c[4] === HIDDEN_MINEFIELD && c[3] > 0 && Math.abs(c[0] + c[3] - s.t) < 800);
    out.push({ kind: "circle", x: s.p.x, y: s.p.y, bearing: 0, range: 500, width: 0, angle: 0, inner: 0, estimated: false,
      style: "tower", soakers: 1, name: "Hidden Mine", start: begin ? begin[0] : s.t, resolve: boom ? boom.t : s.t + 10000 });
  }
  return out;
}

/** Water / Lightning: the 8y ring on its carrier for the last seconds before it goes off. */
function carriers(data: ReplayData): AoeShape[] {
  const out: AoeShape[] = [];
  for (const [start, end, target, id] of data.playerAuras ?? []) {
    if (id !== COMPRESSED_WATER && id !== COMPRESSED_LIGHTNING) continue;
    const water = id === COMPRESSED_WATER;
    // Only a status that went off as its stack, not one a death or Gavel
    // removed (kill: the fourth pair, 4:04.5 to Gavel, never resolves).
    const blast = water ? CRASHING_WAVE : CRASHING_THUNDER;
    if (!(data.enemyCasts ?? []).some((c) => c[4] === blast && c[3] === 0 && Math.abs(c[0] - end) < 1500)) continue;
    out.push({ kind: "circle", x: 0, y: 0, bearing: 0, range: 800, width: 0, angle: 0, inner: 0, estimated: false,
      style: water ? "tea-water" : "lightning", name: water ? "Compressed Water" : "Compressed Lightning",
      start: Math.max(start, end - CARRIER_SHOW_MS), resolve: end, follow: target, noFlash: true });
  }
  return out;
}

/**
 * Propeller Wind's shadow: the strip behind the frozen tornado, away from
 * Cruise Chaser, where the party hides through the 5.7s cast (kill 4:16.2:
 * Cruise Chaser at the west wall, the pillar at (86.2, 100.1), all seven
 * others in a line at y 99.9-100.6 east of it).
 */
function propellerShadow(data: ReplayData): AoeShape[] {
  const out: AoeShape[] = [];
  const casts = data.enemyCasts ?? [];
  const pillar = frozenPillar(data);
  if (!pillar) return out;
  for (const c of casts) {
    if (c[4] !== PROPELLER_WIND || c[3] <= 0) continue;
    const cc = data.actors.find((a) => a.key === c[1]);
    const p = cc && (sampleNear(cc, c[0], 2000) ?? poseAt(cc, c[0]));
    if (!p) continue;
    // Away from Cruise Chaser through the pillar. On the kill it stood 2.4y
    // from the pillar's logged spot, too close to aim by, so then the strip
    // runs from the wall it stands at toward the middle.
    const cx = data.map ? -data.map.offsetX * 100 : 10000, cy = data.map ? -data.map.offsetY * 100 : 10000;
    const bearing = Math.hypot(pillar.x - p.x, pillar.y - p.y) > 600 ? bearingTo(p.x, p.y, pillar.x, pillar.y) : bearingTo(p.x, p.y, cx, cy);
    out.push({ kind: "rect", x: pillar.x, y: pillar.y, bearing, range: SHADOW_LENGTH,
      width: PILLAR_RADIUS * 2, angle: 0, inner: 0, estimated: false, style: "tea-safe", name: "Propeller Wind: hide here",
      start: c[0], resolve: c[0] + c[3], noFlash: true });
  }
  return out;
}

/** The Water tornadoes: one at each Crashing Wave (the Water stack's spot). */
function waterTornadoes(data: ReplayData) {
  return (data.enemyCasts ?? []).filter((c) => c[4] === CRASHING_WAVE && c[3] === 0).map((c) => {
    const a = data.actors.find((x) => x.key === c[1]);
    return { t: c[0], p: a && sampleNear(a, c[0], 1500) };
  }).filter((x): x is { t: number; p: NonNullable<ReturnType<typeof sampleNear>> } => !!x.p);
}

/** The tornado the ice tank froze: the one nearest the ice Earth Missile's hit. */
function frozenPillar(data: ReplayData): { x: number; y: number; t: number } | undefined {
  const ice = (data.enemyHits ?? []).find((h) => h[1] === ICE_MISSILE && h[6] !== null);
  if (!ice) return undefined;
  const near = waterTornadoes(data).filter((w) => w.t < ice[0])
    .sort((a, b) => Math.hypot(a.p.x - ice[6]!, a.p.y - ice[7]!) - Math.hypot(b.p.x - ice[6]!, b.p.y - ice[7]!))[0];
  return near && Math.hypot(near.p.x - ice[6]!, near.p.y - ice[7]!) < 1500 ? { x: near.p.x, y: near.p.y, t: ice[0] } : undefined;
}

function phaseTwoEffects(data: ReplayData): CasterEffect[] {
  const out: CasterEffect[] = [];
  const casts = data.enemyCasts ?? [];
  const gavel = casts.find((c) => c[4] === GAVEL && c[3] === 0)?.[0];
  const bj = data.actors.find((a) => a.kind === "enemy" && a.targetable && a.name === "Brute Justice");
  const phaseEnd = gavel ?? (bj?.samples.length ? bj.samples[bj.samples.length - 1][0] : data.durationMs);

  // Water tornadoes (bj-cc.ts): the first frozen by the ice, the second
  // burned by Flarethrower, the third left until Gavel. Kill: W (86.2,
  // 100.1) at 3:04.3, frozen 3:20.5; NE (113.6, 92.2) at 3:34.1, burned
  // 3:43.2; NE again at 4:03.8.
  const pillar = frozenPillar(data);
  const fire = casts.find((c) => c[4] === FLARETHROWER && c[3] === 0);
  const tornadoes = waterTornadoes(data);
  let burned = false;
  for (const w of tornadoes) {
    let end = phaseEnd;
    if (pillar && w.p.x === pillar.x && w.p.y === pillar.y) {
      end = pillar.t;
      out.push({ kind: "tea-ice-pillar", layer: "floor", label: "", radius: PILLAR_RADIUS, x: w.p.x, y: w.p.y, start: pillar.t, end: phaseEnd });
    } else if (fire && !burned && fire[0] > w.t) {
      end = fire[0] + 500;
      burned = true;
    }
    out.push({ kind: "tea-tornado", layer: "floor", label: "", radius: PILLAR_RADIUS, x: w.p.x, y: w.p.y, start: w.t, end });
  }

  // Plasma Shield (Cruise Chaser's "Limit Cut" 18483): only its front can be
  // hurt, so its front arc is drawn while it lives (kill: 3:44.8 to 3:46.1).
  const shield = data.actors.find((a) => a.kind === "enemy" && a.name === "plasma shield");
  const lc = casts.find((c) => c[4] === PLASMA_LIMIT_CUT && c[3] === 0);
  if (shield?.samples.length && lc) {
    const s0 = shield.samples[0];
    const dead = shield.samples.find((s) => s[4] === 0)?.[0] ?? shield.samples[shield.samples.length - 1][0];
    out.push({ kind: "tea-shield-front", label: "Shield: hit its front", actor: shield.key, x: s0[1], y: s0[2], start: Math.min(lc[0], s0[0]), end: dead });
  }

  // Nisi colours on their carriers, and the colour Verdict requires.
  for (const [start, end, target, id] of data.playerAuras ?? []) {
    const n = NISI[id], j = JUDGMENT[id];
    if (!n && !j) continue;
    const who = data.actors.find((a) => a.key === target);
    const p = who && poseAt(who, start);
    if (!p) continue;
    out.push({ kind: n ? `tea-nisi-${n}` : `tea-judgment-${j}`, label: NISI_LETTER[n ?? j], actor: target, x: p.x, y: p.y, start, end: Math.min(end, phaseEnd + 2500) });
  }
  return out;
}

// ── Phase 3: Alexander Prime (with Temporal Stasis) ─────────────────────────
//
// Ids from alexander-prime.ts's header; checked on Q9zqJb4VLmjhd1B6 4
// (Stasis 4:38, Alexander Prime 5:04 to 10:42).

const STASIS_SWORD = 18539, STASIS_FIRE = 18540;
const PLAINT_OF_SURETY = 18531, PLAINT_OF_SOLIDARITY = 18530;
const CHASTENING_HEAT = 19072, DIVINE_SPEAR = 19074;
const INCEPTION = 18526, SACRAMENT_INCEPTION = 18527, SACRAMENT_WORMHOLE = 18519;
const JUDGMENT_CRYSTAL = 18524, TETRASHATTER = 19080;
const WORMHOLE_CHARGE = 18883;
const VOID_OF_REPENTANCE = 18534;
const REPENTANCE = [18537, 18536, 18535];   // first, second, third soak (8y, 6y, 3y)
const INCINERATING_HEAT = 19025;
const APOCALYPTIC_RAY = 18508;

// Temporal Stasis: Cruise Chaser's three swords at its three nearest, Brute
// Justice's two fires at its two nearest, frozen players baiting them. 90°
// ([BM]); the data has no angle, and the estimate from who was hit spread
// to 180-360° on the kill (4:58.1-5:00.3, two or three hit each, the
// Aggravated Assault holder on Cruise Chaser's side: header).
// A cast with no target (the third sword, 5:00.3, hit the sage and paladin
// at the west wall; facing said south) is aimed at who it hit.
OVERRIDES[STASIS_SWORD] = { angle: 90, aim: "hits" };
// The same fire cone in Stasis and Inception (three at 6:02.7-6:07.0; the
// third, the party's, has no target and hit six north-east of Brute
// Justice at bearings 30-45° while its facing pointed east).
OVERRIDES[STASIS_FIRE] = { angle: 90, style: "tea-fire", aim: "hits" };
// The shared stack on the Shared Sentence player (Inception).
OVERRIDES[PLAINT_OF_SOLIDARITY] = { style: "stack" };
// Chastening Heat (5y on the tank) and its three Divine Spears.
OVERRIDES[CHASTENING_HEAT] = { style: "tankbuster" };
OVERRIDES[DIVINE_SPEAR] = { style: "tankbuster" };
// Inception 18526 is the control cast for Sacrament 18527 (the cross that
// hits, exact): its own cross drew at Alexander Prime's old spot.
OVERRIDES[INCEPTION] = { hidden: true };
// Wormhole's Sacrament: a 5.7s cast; the 16y cross shown through it.
OVERRIDES[SACRAMENT_WORMHOLE] = { telegraph: true };
// Inception's crystals: drawn by crystals() (the drop circles are the
// game data's, on the marked players).
// Void of Repentance: drawn by repentance() as the puddles' three soaks.
for (const id of REPENTANCE) OVERRIDES[id] = { hidden: true };
// Incinerating Heat: the stack everyone shares (marker 93), its 4.7s cast.
OVERRIDES[INCINERATING_HEAT] = { style: "stack", telegraph: true };
// Wormhole's Limit Cut charge has its own id; the numbers' markers name it.
for (const n of [80, 82, 84, 86]) (LIMIT_CUT_MARKERS[n] as { abilities: number[] }).abilities.push(WORMHOLE_CHARGE);

const AP_MARKERS = {
  96: { label: "Crystal", abilities: [JUDGMENT_CRYSTAL] },
  93: { label: "Stack", abilities: [INCINERATING_HEAT] },
};
/** The crystal's 5y drop rides on each marked player (marker 96, 5:46.3 -> 5:51.4 on the kill). */
const AP_MARKER_AOES = { 96: { ability: JUDGMENT_CRYSTAL, name: "Crystal" } };

/** House Arrest (28: stay within ~5y) and Restraining Order (29: stay ~30y apart), checked by Plaint of Surety. */
const AP_TETHERS: Record<number, TetherKind> = {
  28: { element: "tea-close", payoff: [PLAINT_OF_SURETY] },
  29: { element: "tea-far", payoff: [PLAINT_OF_SURETY] },
};

/**
 * Void of Repentance: two puddles, each soaked three times by one player,
 * shrinking 8y -> 6y -> 3y. Each soak shows as a one-soaker tower from the
 * previous check (the first from Void's cast) until it lands, at the spot
 * its helper logs on landing (kill: E (115.9, 100.5) / W (82.5, 98.7) at
 * 7:28.8, then 7:33.1 and 7:37.3). The game data's circle flashed only as
 * each landed.
 */
function repentance(data: ReplayData): AoeShape[] {
  const out: AoeShape[] = [];
  const casts = data.enemyCasts ?? [];
  for (const v of casts.filter((c) => c[4] === VOID_OF_REPENTANCE && c[3] === 0)) {
    let prev = new Map<number, number>();   // side (-1 west, 1 east) -> last check time
    REPENTANCE.forEach((id, k) => {
      const checks = casts.filter((c) => c[4] === id && c[3] === 0 && c[0] > v[0] && c[0] - v[0] < 40000);
      const next = new Map<number, number>();
      for (const c of checks) {
        const a = data.actors.find((x) => x.key === c[1]);
        const hit = (data.enemyHits ?? []).find((h) => h[1] === id && h[2] === c[1] && h[4] !== null);
        const p = (a && sampleNear(a, c[0], 1500)) ?? (hit ? { x: hit[4]!, y: hit[5]! } : undefined);
        if (!p) continue;
        const side = p.x < 10000 ? -1 : 1;
        const range = (data.actionGeometry?.[id]?.range ?? [8, 6, 3][k]) * 100;
        out.push({ kind: "circle", x: p.x, y: p.y, bearing: 0, range, width: 0, angle: 0, inner: 0, estimated: false,
          style: "tower", soakers: 1, name: "Repentance", start: prev.get(side) ?? v[0], resolve: c[0] });
        next.set(side, c[0]);
      }
      prev = next;
    });
  }
  return out;
}

/**
 * Inception's Judgment Crystals: each sits where it dropped until the True
 * Heart reaches it and it shatters (Tetrashatter). The crystal actors log
 * one sample, as they shatter (kill: drops 5:51.4, shatters 5:57.4-5:58.1).
 */
function crystals(data: ReplayData): CasterEffect[] {
  const out: CasterEffect[] = [];
  const casts = data.enemyCasts ?? [];
  const drop = casts.find((c) => c[4] === JUDGMENT_CRYSTAL && c[3] === 0);
  if (!drop) return out;
  for (const c of casts) {
    if (c[4] !== TETRASHATTER || c[3] !== 0 || c[0] < drop[0] || c[0] - drop[0] > 20000) continue;
    const a = data.actors.find((x) => x.key === c[1]);
    const p = a && sampleNear(a, c[0], 1500);
    if (p) out.push({ kind: "tea-crystal", label: "", x: p.x, y: p.y, start: drop[0], end: c[0] + 300 });
  }
  return out;
}

// ── Phase 4: Perfect Alexander ──────────────────────────────────────────────
//
// Ids from perfect-alexander.ts's header; checked on Q9zqJb4VLmjhd1B6 4
// (10:42 to 15:46).

const ORDAINED_MOTION = [18558, 18859], ORDAINED_STILLNESS = [18559, 18860];
const COLLECTIVE_REPROBATION = 18573, INDIVIDUAL_REPROBATION = 18572;
const PLAINT_OF_OBLOQUY = 18528;
const PREVIEW_SACRAMENT = 18591, PA_SACRAMENT = 18569;
const RADIANT_SACRAMENT = 18566;
const CAPITAL_PUNISHMENT = 18579, ORDAINED_PUNISHMENT = 18577;
const ALMIGHTY_PREVIEW = 18575, ALMIGHTY_JUDGMENT = 18576;
const IRRESISTIBLE_GRACE = 18580;

// Optical Sight: Collective Reprobation is the two 6y stacks.
OVERRIDES[COLLECTIVE_REPROBATION] = { style: "stack" };
// Capital Punishment (three shared 4y hits) and Punishment on the tanks.
OVERRIDES[CAPITAL_PUNISHMENT] = { style: "tankbuster" };
OVERRIDES[ORDAINED_PUNISHMENT] = { style: "tankbuster" };
// Irresistible Grace: the 6y stack all eight share after each trine,
// through its 4.7s cast.
OVERRIDES[IRRESISTIBLE_GRACE] = { style: "stack", telegraph: true };
// Almighty Judgment: drawn by almightyJudgment() from each circle's reveal.
OVERRIDES[ALMIGHTY_PREVIEW] = { hidden: true };
OVERRIDES[ALMIGHTY_JUDGMENT] = { hidden: true };
// Radiant Sacrament: drawn by radiantSacrament() (the donut's 8y safe
// middle isn't in the data; with nobody hit the estimate made it 20y).
OVERRIDES[RADIANT_SACRAMENT] = { hidden: true };

/** Optical Sight markers: 62 on the two stack targets, 139 on all eight for the spread (kill 11:21.9 / 11:28.1). */
const PA_MARKERS = {
  62: { label: "Stack", abilities: [COLLECTIVE_REPROBATION] },
  139: { label: "Spread", abilities: [INDIVIDUAL_REPROBATION] },
};
const PA_MARKER_AOES = {
  62: { ability: COLLECTIVE_REPROBATION, name: "Stack" },
  139: { ability: INDIVIDUAL_REPROBATION, name: "Spread" },
};

// The Final Word's and Fate Calibration β's march roles (status ids, the
// word and its Ordained replacement for the march itself): light beacon,
// light follower (marches toward it), dark beacon, dark follower (marches
// away from it).
const MARCH: Record<number, string> = {
  1002153: "tea-light-beacon", 1003056: "tea-light-beacon",
  1002152: "tea-light-follower", 1003055: "tea-light-follower",
  1002155: "tea-dark-beacon", 1003058: "tea-dark-beacon",
  1002154: "tea-dark-follower", 1003057: "tea-dark-follower",
};
const ORDAINED_CUE_MS = 3000;      // α's checks have no cast bar: label them this long before

/**
 * Almighty Judgment: three sets of 6y circles revealed 2s apart (preview
 * 18575, 1.2s) and exploding in the same order 6.6s later (18576), each
 * shown from its reveal. Each explosion is cast by the helper that
 * revealed it 6.6s before (kill: helper 42 reveals (84, 100) at 14:40.6
 * and explodes it at 14:47.2); only 26 of the 50 explosions log a
 * position against 44 of 50 reveals, so either places it.
 */
const ALMIGHTY_DELAY_MS = 6600;
function almightyJudgment(data: ReplayData): AoeShape[] {
  const out: AoeShape[] = [];
  const casts = data.enemyCasts ?? [];
  const at = (c: (typeof casts)[number]) => {
    const a = data.actors.find((x) => x.key === c[1]);
    return a && sampleNear(a, c[0], 1500);
  };
  const reveals = casts.filter((c) => c[4] === ALMIGHTY_PREVIEW && c[3] === 0).map((c) => ({ t: c[0], key: c[1], p: at(c) }));
  for (const c of casts) {
    if (c[4] !== ALMIGHTY_JUDGMENT || c[3] !== 0) continue;
    const reveal = reveals.find((r) => r.key === c[1] && Math.abs(c[0] - r.t - ALMIGHTY_DELAY_MS) < 800);
    const p = reveal?.p ?? at(c);
    if (!p) continue;
    // Which of its trine's three sets: by the explosions 2s apart. Once all
    // three are out they overlap, so each set gets its own shade (first
    // red, second orange, third yellow) to show the order to walk.
    const first = casts.find((x) => x[4] === ALMIGHTY_JUDGMENT && x[3] === 0 && c[0] - x[0] >= 0 && c[0] - x[0] < 5000)!;
    const set = Math.min(2, Math.round((c[0] - first[0]) / 2000));
    out.push({ kind: "circle", x: p.x, y: p.y, bearing: 0, range: (data.actionGeometry?.[ALMIGHTY_JUDGMENT]?.range ?? 6) * 100,
      width: 0, angle: 0, inner: 0, estimated: false, style: `tea-trine-${set + 1}`, name: "Almighty Judgment", start: reveal ? reveal.t : c[0] - 300, resolve: c[0] });
  }
  return out;
}

/** Fate Calibration β's Radiant Sacrament: a donut from its clone, safe within 8y ([BM]; the header: safe circle ~6y+). */
function radiantSacrament(data: ReplayData): AoeShape[] {
  const out: AoeShape[] = [];
  for (const c of data.enemyCasts ?? []) {
    if (c[4] !== RADIANT_SACRAMENT || c[3] !== 0) continue;
    const a = data.actors.find((x) => x.key === c[1]);
    const p = a && sampleNear(a, c[0], 1500);
    if (!p) continue;
    out.push({ kind: "donut", x: p.x, y: p.y, bearing: 0, range: (data.actionGeometry?.[RADIANT_SACRAMENT]?.range ?? 60) * 100,
      width: 0, angle: 0, inner: 800, estimated: false, style: "aoe", name: "Radiant Sacrament", start: c[0] - 300, resolve: c[0] });
  }
  return out;
}

/**
 * Plaint of Obloquy (Defamation): a 30y circle on its holder, which the
 * engine skips as a raidwide (30y+). Kill: on the warrior at (107.2, 83.6),
 * 12:21.4, hitting only them. Fate Calibration α's preview crosses (18591)
 * flash on the three firing clones, faint, as the game plays them.
 */
function phaseFourShapes(data: ReplayData): AoeShape[] {
  const out: AoeShape[] = [];
  const g = data.actionGeometry ?? {};
  for (const c of data.enemyCasts ?? []) {
    if (c[3] !== 0) continue;
    if (c[4] === PLAINT_OF_OBLOQUY) {
      const hit = (data.enemyHits ?? []).find((h) => h[1] === PLAINT_OF_OBLOQUY && h[0] >= c[0] && h[0] - c[0] < 1500 && h[6] !== null);
      const who = c[5] ? data.actors.find((a) => a.key === c[5]) : undefined;
      const p = (who && poseAt(who, c[0])) ?? (hit ? { x: hit[6]!, y: hit[7]! } : undefined);
      if (!p) continue;
      out.push({ kind: "circle", x: p.x, y: p.y, bearing: 0, range: (g[PLAINT_OF_OBLOQUY]?.range ?? 30) * 100, width: 0, angle: 0, inner: 0,
        estimated: false, style: "tea-defamation", name: "Plaint of Obloquy", start: c[0] - 300, resolve: c[0] });
    } else if (c[4] === PREVIEW_SACRAMENT) {
      const a = data.actors.find((x) => x.key === c[1]);
      const p = a && sampleNear(a, c[0], 15000);
      const real = g[PA_SACRAMENT];
      if (!p || !real) continue;
      out.push({ kind: "cross", x: p.x, y: p.y, bearing: facingToCompassBearing(p.facing), range: real.range * 100, width: real.width * 100,
        angle: 0, inner: 0, estimated: false, style: "tea-preview", name: "Sacrament (preview)", start: c[0] - 300, resolve: c[0] });
    }
  }
  return out;
}

function phaseFourEffects(data: ReplayData): CasterEffect[] {
  const out: CasterEffect[] = [];
  const casts = data.enemyCasts ?? [];
  const pa = data.actors.find((a) => a.kind === "enemy" && a.targetable && a.name === "Perfect Alexander");

  // March roles on their players.
  for (const [start, end, target, id] of data.playerAuras ?? []) {
    const kind = MARCH[id];
    if (!kind) continue;
    const who = data.actors.find((a) => a.key === target);
    const p = who && poseAt(who, start);
    if (!p) continue;
    const label = kind.endsWith("beacon") ? (kind.includes("light") ? "Light beacon" : "Dark beacon") : "";
    out.push({ kind, label, actor: target, x: p.x, y: p.y, start, end });
  }

  // Ordained Motion / Stillness: the Final Word's two checks have cast
  // bars (kill 11:03.6 Motion, 11:14.7 Stillness); Fate Calibration α's
  // two are cast by clones with none (12:18.3 Motion, 12:22.5 Stillness),
  // remembered from the preview. Labelled over Perfect Alexander.
  for (const c of casts) {
    if (c[4] === undefined || c[3] !== 0) continue;
    const motion = ORDAINED_MOTION.includes(c[4]);
    if (!motion && !ORDAINED_STILLNESS.includes(c[4])) continue;
    const begin = casts.find((b) => b[4] === c[4] && b[3] > 0 && Math.abs(b[0] + b[3] - c[0]) < 800);
    const anchor = pa && (poseAt(pa, c[0]) ?? sampleNear(pa, c[0], 30000));
    if (!anchor) continue;
    out.push({ kind: motion ? "tea-motion" : "tea-stillness", label: motion ? "Motion: keep moving" : "Stillness: stand still",
      actor: pa!.key, x: anchor.x, y: anchor.y, start: begin ? begin[0] : c[0] - ORDAINED_CUE_MS, end: c[0] + 300 });
  }
  return out;
}

export const TEA_REPLAY: FightReplay = {
  key: "tea",
  game: "ffxiv",
  name: "The Epic of Alexander",
  signature: [FLUID_SWING, CASCADE, WAVE_BOSS_VISIBLE, WAVE_TORNADO_VISIBLE],
  overrides: OVERRIDES,
  headMarkers: { ...LIMIT_CUT_MARKERS, ...BJCC_MARKERS, ...AP_MARKERS, ...PA_MARKERS },
  markerAoes: { ...MARKER_AOES, ...AP_MARKER_AOES, ...PA_MARKER_AOES },
  tethers: { ...TETHERS, ...AP_TETHERS },
  effects: (data) => [...phaseOneEffects(data), ...phaseTwoEffects(data), ...crystals(data), ...phaseFourEffects(data)],
  shapes: (data) => [
    ...protean(data), ...sluice(data), ...hawkBlaster(data),
    ...opticalSight(data), ...spinCrusher(data), ...mines(data), ...carriers(data), ...propellerShadow(data),
    ...repentance(data),
    ...almightyJudgment(data), ...radiantSacrament(data), ...phaseFourShapes(data),
  ],
};
