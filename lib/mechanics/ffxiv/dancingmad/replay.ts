// lib/mechanics/ffxiv/dancingmad/replay.ts
//
// Dancing Mad's replay spec (lib/replay/fight-spec.ts): shape overrides,
// head markers, boss cues and the shapes the log can't place on its own.
// Art in components/replay-art/dancingmad.tsx. Ids and timings from the
// phase modules' headers (phase1.ts, graven-image.ts, wave-cannon.ts, ...)
// and checked on two kills, 2T1HzdPKgbhM43am fight 10 and
// yBKPqGwHparm7Tk4 fight 5 (2026-10-18); each entry says what it fixed.
// Only Revolting Ruin III, Blowout 47771 and the towers are from the
// user's VOD review; docs/replay-reviews/dancingmad.md has the open checks.
//
// Arena: centre (100, 100), radius 20y (ffxiv-replay.ts's map note).

import type { AoeShape } from "@/lib/replay/action-shapes";
import type { CasterEffect, FightReplay, HeadMarkerDef, Override, TetherKind } from "@/lib/replay/fight-spec";
import { poseAt, type ReplayData } from "@/lib/replay/ffxiv-replay";

const CENTRE = { x: 10000, y: 10000 };
const ARENA_R = 2000;

// ── P1 Kefka (phase1.ts) ────────────────────────────────────────────────────

// Mystery Magic (thaliak.com/ultimates/umad, materiaraiding.com/ultimate/
// dmu): rings around Kefka through the cast say which elements come and
// whether each is inverted ("?" orbs). Ice and Thunder each come in three
// casts: the normal one (shown and real), and for an inverted ring a shown
// one that hits nobody plus an unshown one that hits the rest. Both kills
// agree on every occurrence (fight 10 0:49.4 ice inverted: players stood
// in 47771's SW/NE quadrants untouched, 47774 fired NW/SE; 3:07.8 thunder
// inverted: all eight stood in 47776's two stripes, 47777's two stripes
// between them hit nobody).
const BLIZZARD_SHOWN = 47768, BLIZZARD_FAKE = 47771, BLIZZARD_REAL = 47774;
const THUNDER_SHOWN = 47775, THUNDER_FAKE = 47776, THUNDER_REAL = 47777;
const FIRE_STACK = 47779, FIRE_SPREAD = 47778;

// The ring markers on Kefka (Lockon m0462trg_c01c..c06c): fire, ice and
// thunder, inverted or not. Read from what resolved after each in both
// kills (P1 0:33, 0:49, 1:23, 3:02 and P4's Kefka Says): 673 -> Flagrant
// Fire on everyone though two had the stack marker, 674 -> fire as marked
// (128 stack markers -> 47779 stacks; no 128 -> 47778 spread), 675 ->
// 47771 + 47774, 676 -> 47768 only, 677 -> 47776 + 47777, 678 -> 47775.
type Ring = { element: "fire" | "ice" | "thunder"; inverted: boolean };
const RINGS: Record<number, Ring> = {
  673: { element: "fire", inverted: true },
  674: { element: "fire", inverted: false },
  675: { element: "ice", inverted: true },
  676: { element: "ice", inverted: false },
  677: { element: "thunder", inverted: true },
  678: { element: "thunder", inverted: false },
};
// What each ring tells the party.
const RING_TEXT: Record<string, string> = {
  "fire": "Fire as marked", "fire?": "Fire ?: stack ↔ spread",
  "ice": "Ice: cleaves as shown", "ice?": "Ice ?: shown quadrants safe",
  "thunder": "Thunder: lines as shown", "thunder?": "Thunder ?: stand in the lines",
};
// Casts that resolve a ring set (Mystery Magic, Graven 2's lone Blowout,
// P4's Thrumming Thunder 50654).
const RING_RESOLVE = [47764, 47765, BLIZZARD_SHOWN, BLIZZARD_FAKE, BLIZZARD_REAL, THUNDER_SHOWN, THUNDER_FAKE, THUNDER_REAL, 50654];
const RING_WINDOW_MS = 9000;

// Double-Trouble Trap (1005078): one support and one DPS carry it; it
// detonates as a 6y four-person stack that knocks everyone in it back,
// then passes to one of them (0:45 -> 0:50, -> 1:59, -> 2:48 in fight 10).
// The cast's helpers sit at stale spots ((100, 112) at 0:50.6, 7y from
// either holder), so the circle rides on the holder for its last seconds
// and flashes there.
const TRAP = 47783, TRAP_STATUS = 1005078;
const TRAP_SHOW_MS = 6000;
const TRAP_MATCH_MS = 1500;

// Graven Image II's Gravitas (47788) leaves a gravity well where it lands
// (thaliak: "leaves a gravity well (a puddle on the ground)"); a spreader's
// Vitrophyre touching one sets off Gravitational Explosion (47789, a wipe),
// and after the second Double-Trouble Trap the wells are soaked: Gravity
// III (47791) four times on each. Fight 10: wells at (99, 88) from 1:28.7
// and (100, 112) from 1:47.1, Gravity III on both at 2:02.0-2:02.2.
const GRAVITAS = 47788, GRAVITY_III = 47791, GRAVITATIONAL_EXPLOSION = 47789;
const WELL_JOIN = 300;          // Gravitas hits this close are one well
const WELL_SOAK_NEAR = 400;     // a Gravity III this close soaks the well
const WELL_MAX_MS = 45000;

// Tele-Trouncing (47801): each player's two Tele-Portent statuses drop an
// arrow sigil at their feet as each runs out (7s, then 10s), pointing the
// status's way (phase1.ts TELE_PORTENT_DIRECTION_BY_ABILITY_ID); stepping
// on one teleports you that way. The drop is logged as a 2y Tele-Trouncing
// 47802 hit on the player (16 per pull, 2:40.8 and 2:43.8 in fight 10).
// The sigils stay until the Confused players have walked them (Indulgent
// Will's Confused, 6s, ends 3:01.5); their real lifetime is a VOD check.
const TELE_DROP = 47802;
const TELE_DIRECTION: Record<number, number> = {
  1004876: 0, 1005079: 0, 1004878: 90, 1005081: 90,
  1004877: 180, 1005080: 180, 1004879: 270, 1005082: 270,
};
const CONFUSED = 1001283;
const ARROW_MAX_MS = 22000;

// Graven Image III's gaze (thaliak): Ave Maria = a glowing yellow eye on
// the statue (look at it), Indolent Will = a purple eye (look away). Only
// the resolution is logged (fight 10 3:08.0, from the statue at (95, 25),
// off the arena to the north); it shows with Mystery Magic's cast, ~5s.
const GAZE_SHOW_MS = 5000;

// Gravitational Wave / Intemperate Will: half-room cleaves from the middle
// (thaliak), between Graven Image II's two rounds. No angle in the data
// (90° was drawn), and the helper's facing is a placeholder in fight 5
// (-472 on every statue sample). The half is the same in every sample:
// Wave hits the west half (fight 10 1:42.5, faced W, all eight east of
// x=100.7; fight 5 1:42.2 and 1:55.3, all eight east of x=101.8), Will
// the east (fight 10 1:55.7, faced E, all eight west of x=97.2).
const GRAVITATIONAL_WAVE = 47793, INTEMPERATE_WILL = 47794;
const HALF_ROOM: Record<number, number> = { [GRAVITATIONAL_WAVE]: 270, [INTEMPERATE_WILL]: 90 };

const OVERRIDES: Record<number, Override> = {
  // Revolting Ruin III, both hits: a 90° tankbuster cone (user, VOD review
  // 2026-10-17). The game data has the cone but not its angle.
  50179: { angle: 90, style: "tankbuster" },
  50401: { angle: 90, style: "tankbuster" },
  // Mystery Magic's floor telegraphs, shown for the whole 4.7s cast as in
  // game. Blizzard III Blowout 47771 damages nobody: in Mystery Magic II,
  // players stood 16° inside its facing untouched (2T1HzdPKgbhM43am fight
  // 10, 0:54) while 47774, cast with it, hit a player 36° off its facing
  // (yBKPqGwHparm7Tk4 fight 3, 0:55). Drawn filled it covered the safe
  // quadrant (user, 2026-10-17); it's the telegraph the game shows for an
  // inverted ring, so it's drawn as an empty dashed outline with a "?"
  // and gone before the real cleaves land.
  [BLIZZARD_SHOWN]: { telegraph: true, style: "ice" },
  [BLIZZARD_FAKE]: { telegraph: true, style: "dm-fake-ice" },
  [BLIZZARD_REAL]: { style: "ice" },
  [THUNDER_SHOWN]: { telegraph: true, style: "lightning" },
  [THUNDER_FAKE]: { telegraph: true, style: "dm-fake-thunder" },
  [THUNDER_REAL]: { style: "lightning" },
  // Flagrant Fire III: two role stacks (47779) or eight spreads (47778).
  [FIRE_STACK]: { style: "stack" },
  // Towers whose rows carry no omen to say so.
  47806: { style: "tower" },   // The Path of Light (Forsaken)
  47939: { style: "tower" }, 47940: { style: "tower" }, 47941: { style: "tower" },  // Celestriad
  // Wave Cannon's towers: one soaker each (phase1.ts).
  47786: { style: "tower", soakers: 1 },
  // Drawn by trapShapes, on the holder.
  [TRAP]: { hidden: true },
  // Hyperdrive: three instant tankbusters on the top of the enmity list.
  49739: { style: "tankbuster" },
  // Graven Image II: Gravitas lands as a stack (all eight in fight 10's
  // eight-stack; light parties in others) and leaves a well (wellShapes).
  [GRAVITAS]: { style: "stack" },
  [GRAVITY_III]: { style: "stack" },
  // Gravitational Wave / Intemperate Will: drawn by halfRoomShapes.
  [GRAVITATIONAL_WAVE]: { hidden: true }, [INTEMPERATE_WILL]: { hidden: true },
  // Drawn by arrowShapes as sigils.
  [TELE_DROP]: { hidden: true },
};

/**
 * 218: Revolting Ruin III's tank marker (fight 10 0:11.1 -> 0:16.2, 1:33.4
 * -> 1:38.6). 128: Flagrant Fire III's stack marker, one support and one
 * DPS (0:33.2 -> 0:39.7); with an inverted fire ring it resolves as a
 * spread on everyone (3:02.8 -> 3:09.3).
 */
const HEAD_MARKERS: Record<number, HeadMarkerDef> = {
  218: { label: "Tank buster", abilities: [50179, 50401] },
  128: { label: "Stack", abilities: [FIRE_STACK, FIRE_SPREAD] },
  // 127: the spread marker, on all eight (yBKPqGwHparm7Tk4 fight 5, 0:33.0
  // -> Flagrant Fire III spreads 0:38.9).
  127: { label: "Spread", abilities: [FIRE_SPREAD, FIRE_STACK] },
  // The ring markers on Kefka (ringEffects draws the rings).
  ...Object.fromEntries(Object.keys(RINGS).map((id) => [id, { label: "Mystery Magic", abilities: RING_RESOLVE }])),
};

/**
 * The statue's tethers (45, every Graven Image): from its right hand
 * yellow, from its left purple (materiaraiding: "tethered to the statue's
 * right (yellow) or left (purple)"). Graven Image II: yellow = Vitrophyre
 * (a point-blank AoE on the player), purple = Gravitas (a stack leaving a
 * well). Graven Image III: yellow = Indulgent Will (Confused), purple =
 * Idyllic Will (an AoE and Sleep). Fight 10: tethers 1:22.2 -> Gravitas
 * 1:28.7 / Vitrophyre 1:33.3, 2:45.8 -> Wills 2:55.5. Graven Image I's
 * tethers (0:30.9) pay off with Pulse Wave's knockback, a cast with no
 * hit, and stay plain.
 */
const TETHERS: Record<number, TetherKind[]> = {
  45: [
    { element: "dm-yellow", payoff: [47792, 47797] },
    { element: "dm-purple", payoff: [GRAVITAS, 47798] },
  ],
};

function ringEffects(data: ReplayData): CasterEffect[] {
  const casts = data.enemyCasts ?? [];
  const actorByKey = new Map(data.actors.map((a) => [a.key, a]));
  const out: CasterEffect[] = [];
  const marks = (data.headMarkers ?? []).filter((m) => RINGS[m[2]] && actorByKey.get(m[1])?.kind === "enemy");
  for (const t of [...new Set(marks.map((m) => m[0]))]) {
    const set = marks.filter((m) => m[0] === t).map((m) => RINGS[m[2]]);
    const end = casts.find((c) => c[3] === 0 && c[0] > t && c[0] - t <= RING_WINDOW_MS && RING_RESOLVE.includes(c[4] ?? 0))?.[0];
    if (end === undefined) continue;
    const boss = actorByKey.get(marks.find((m) => m[0] === t)![1])!;
    const p = poseAt(boss, t);
    // One ring each, nested outward from the boss's hitbox (fire inside,
    // as thaliak's "upper ring is fire"); the first carries the text.
    const rings = set.sort((a, b) => RING_ORDER.indexOf(a.element) - RING_ORDER.indexOf(b.element));
    const base = (boss.hitbox ?? 300) + RING_GAP;
    rings.forEach((r, i) => out.push({
      kind: `dm-ring-${r.element}${r.inverted ? "-inv" : ""}`,
      label: i === 0 ? rings.map((q) => RING_TEXT[q.element + (q.inverted ? "?" : "")]).join(" · ") : "",
      radius: base + i * RING_GAP,
      actor: boss.key, x: p?.x ?? CENTRE.x, y: p?.y ?? CENTRE.y, start: t, end,
    }));
  }
  return out;
}
const RING_ORDER = ["fire", "ice", "thunder"];
const RING_GAP = 150;           // centi-yalms between nested rings

function gazeEffects(data: ReplayData): CasterEffect[] {
  const actorByKey = new Map(data.actors.map((a) => [a.key, a]));
  const out: CasterEffect[] = [];
  for (const c of data.enemyCasts ?? []) {
    const look = c[2] === "Ave Maria" ? true : c[2] === "Indolent Will" ? false : undefined;
    if (look === undefined || c[3] !== 0) continue;
    // On the arena's edge, toward the statue.
    const s = actorByKey.get(c[1])?.samples.reduce((b, x) => (Math.abs(x[0] - c[0]) < Math.abs(b[0] - c[0]) ? x : b));
    const a = s ? Math.atan2(s[1] - CENTRE.x, -(s[2] - CENTRE.y)) : 0;
    out.push({
      kind: look ? "dm-gaze-look" : "dm-gaze-away",
      label: look ? "Ave Maria: look at the statue" : "Indolent Will: look away",
      x: CENTRE.x + Math.sin(a) * (ARENA_R - 300), y: CENTRE.y - Math.cos(a) * (ARENA_R - 300),
      start: c[0] - GAZE_SHOW_MS, end: c[0] + 300,
    });
  }
  return out;
}

const blank = { bearing: 0, width: 0, angle: 0, inner: 0, estimated: false } as const;

function trapShapes(data: ReplayData): AoeShape[] {
  const casts = data.enemyCasts ?? [];
  const range = (data.actionGeometry?.[TRAP]?.range ?? 6) * 100;
  const out: AoeShape[] = [];
  for (const [start, end, key, id] of data.playerAuras ?? []) {
    if (id !== TRAP_STATUS) continue;
    const boom = casts.find((c) => c[4] === TRAP && c[3] === 0 && Math.abs(c[0] - end) <= TRAP_MATCH_MS);
    if (!boom) continue;
    out.push({ ...blank, kind: "circle", x: 0, y: 0, range, style: "stack", name: "Double-Trouble Trap",
      start: Math.max(start, boom[0] - TRAP_SHOW_MS), resolve: boom[0], follow: key });
  }
  return out;
}

function wellShapes(data: ReplayData): AoeShape[] {
  const hits = data.enemyHits ?? [];
  const casts = data.enemyCasts ?? [];
  const range = (data.actionGeometry?.[GRAVITAS]?.range ?? 5) * 100;
  const wells: { x: number; y: number; t: number }[] = [];
  // A Gravitas cast's first hit per spot is where its stack (and well) is.
  for (const h of hits) {
    if (h[1] !== GRAVITAS || h[6] === null) continue;
    if (wells.some((w) => h[0] - w.t < 3000 && Math.hypot(w.x - h[6]!, w.y - h[7]!) < WELL_JOIN)) continue;
    wells.push({ x: h[6]!, y: h[7]!, t: h[0] });
  }
  return wells.map((w) => {
    const soak = hits.find((h) => h[1] === GRAVITY_III && h[0] > w.t && h[0] - w.t < WELL_MAX_MS && h[6] !== null && Math.hypot(h[6]! - w.x, h[7]! - w.y) < WELL_SOAK_NEAR);
    const boom = casts.find((c) => c[4] === GRAVITATIONAL_EXPLOSION && c[3] === 0 && c[0] > w.t && c[0] - w.t < WELL_MAX_MS);
    const end = Math.min(soak?.[0] ?? Infinity, boom?.[0] ?? Infinity, w.t + WELL_MAX_MS);
    return { ...blank, kind: "circle" as const, x: w.x, y: w.y, range, style: "dm-well", name: "Gravity well", start: w.t, resolve: end, noFlash: true };
  });
}

function arrowShapes(data: ReplayData): AoeShape[] {
  const auras = data.playerAuras ?? [];
  const confusedEnd = auras.filter((a) => a[3] === CONFUSED).map((a) => a[1]);
  const out: AoeShape[] = [];
  for (const h of data.enemyHits ?? []) {
    if (h[1] !== TELE_DROP || h[6] === null) continue;
    // The status that just ran out on this player; a double-arrow player
    // logs one status for both drops, so fall back to theirs.
    const mine = auras.filter((a) => a[2] === h[3] && TELE_DIRECTION[a[3]] !== undefined && a[0] < h[0]);
    const s = mine.find((a) => Math.abs(a[1] - h[0]) <= 1200) ?? mine[0];
    if (!s) continue;
    const gone = confusedEnd.find((t) => t > h[0] && t - h[0] < ARROW_MAX_MS) ?? h[0] + ARROW_MAX_MS;
    out.push({ ...blank, kind: "circle", x: h[6]!, y: h[7]!, bearing: TELE_DIRECTION[s[3]], range: 200,
      style: "dm-arrow", name: "Tele-Trouncing sigil", start: h[0], resolve: gone, noFlash: true });
  }
  return out;
}

function halfRoomShapes(data: ReplayData): AoeShape[] {
  return (data.enemyCasts ?? []).filter((c) => c[3] === 0 && HALF_ROOM[c[4] ?? 0] !== undefined).map((c) => ({
    ...blank, kind: "cone" as const, x: CENTRE.x, y: CENTRE.y, bearing: HALF_ROOM[c[4]!], angle: 180, range: ARENA_R + 500,
    style: "aoe", name: c[2], start: c[0] - 300, resolve: c[0],
  }));
}

export const DANCING_MAD_REPLAY: FightReplay = {
  key: "dancingmad",
  game: "ffxiv",
  name: "Dancing Mad",
  signature: [50179, 47764, GRAVITAS],
  overrides: OVERRIDES,
  headMarkers: HEAD_MARKERS,
  tethers: TETHERS,
  effects: (data) => [...ringEffects(data), ...gazeEffects(data)],
  shapes: (data) => [...trapShapes(data), ...wellShapes(data), ...arrowShapes(data), ...halfRoomShapes(data)],
};
