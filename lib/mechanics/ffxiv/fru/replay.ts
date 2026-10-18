// lib/mechanics/ffxiv/fru/replay.ts
//
// Futures Rewritten's replay spec (lib/replay/fight-spec.ts): shape
// overrides, head markers, tethers and boss cues. Art for the cues is in
// components/replay-art/fru.tsx. Ids and placements from the phase
// modules' headers (fatebreaker.ts, usurper-of-frost.ts, ...) and checked
// on JZ1KXhDbqkNH3jxR fight 24 and M9Nagmnw2LzHZPVq fight 1 (2026-10-17);
// each entry says what it fixed. Built for P1-P2; P3 onward to come.

import type { CasterEffect, FightReplay, FloorStatus, HeadMarkerDef, MarkerAoe, Override, TetherKind } from "@/lib/replay/fight-spec";
import type { AoeShape } from "@/lib/replay/action-shapes";
import { poseAt, sampleNear, type ReplayData } from "@/lib/replay/ffxiv-replay";
import { facingToCompassBearing } from "@/lib/mechanics/geometry";

// ── Shape overrides ─────────────────────────────────────────────────────────

// FRU P2 Bleeding puddles, not in the log: Sinbound Holy's last about 6s
// (user, VOD of M9Nagmnw2LzHZPVq 1, 2026-10-17); Luminous Hammer's and
// Hiemal Ray's are assumed the same, unchecked.
const PUDDLE_GUESS_MS = 6000;
const FRU_STACKS = [
  40147, 40167,      // Sinsmoke: Cyclonic Break pairs, Utopian tether stacks
  40159,             // Sinbound Fire III (Utopian Sky)
  40209, 40211,      // Sinbound Holy, Hallowed Ray (line stack)
  40222, 40217,      // Banish III pairs, Powerful Light
  40287,             // Shell Crusher
  40250,             // Morn Afah (P4)
  40311, 40312,      // P5 Akh Morn light / dark
  40317, 40318,      // Cruel Path of Light / Darkness (line stacks)
];
const OVERRIDES: Record<number, Override> = {
  ...Object.fromEntries(FRU_STACKS.map((id) => [id, { style: "stack" as const }])),
  // Cyclonic Break: eight narrow cones baited on the players, then three
  // repeats where they no longer stand: the bait lanes, the gaps between,
  // the lanes again (user, 2026-10-17: players dodge into the gaps, back
  // to their spots, then out again). Fight 24 agrees: every player stood
  // ±20-24° off their lane at the 1st and 3rd repeats and on it at the 2nd.
  // The helpers' facing points at the players, which drew each repeat
  // onto them. No angle in the data; under 30° by those positions, so half
  // the 45° lane spacing is used.
  40145: { angle: 22.5 }, 40146: { angle: 22.5, repeats: { of: 40145, gap: 22.5 } },
  // Fall of Faith fire: Sinblaze, a 90° cone from the carrier toward the
  // nearest helper, shared by four. The helper casting it sits elsewhere;
  // its hit carries the carrier's spot, and it's aimed at the others hit.
  40156: { angle: 90, style: "stack", aim: "hits" },
  // Fall of Faith lightning: three 120° Bow Shock cones from the carrier
  // (the Sinsmite 40142 target) through each helper. The helpers' own
  // samples lag a tether behind (1:52.6 put one at the previous carrier).
  // Lightning blue, as in game (user, 2026-10-17).
  40143: { angle: 120, originAt: 40142, style: "lightning" },
  // Towers: Burnt Strike towers' Explosion id is the soaker count
  // (lightning 40131/40122/40123/40124, fire 40135/40125/40126/40127).
  40131: { style: "tower", soakers: 1 }, 40122: { style: "tower", soakers: 2 }, 40123: { style: "tower", soakers: 3 }, 40124: { style: "tower", soakers: 4 },
  40135: { style: "tower", soakers: 1 }, 40125: { style: "tower", soakers: 2 }, 40126: { style: "tower", soakers: 3 }, 40127: { style: "tower", soakers: 4 },
  40213: { style: "tower" },              // Bright Hunger: Light Rampant (one each), Darklit (two each)
  40320: { style: "tower", soakers: 2 },  // P5 Paradise Regained Explosion
  // The towers' Burnt Strike and what follows it: Fatebreaker stands in
  // the middle and the line runs through her, cutting the arena in half
  // (she faced N at 2:22.5; drawn from her it covered only the north half;
  // user, 2026-10-17, for Burnout). Fire 40129 then the Blastburn 40130
  // knockback; lightning 40133 then the wide Burnout 40134.
  40129: { twoWay: true }, 40130: { twoWay: true, style: "knockback" },
  40133: { twoWay: true, style: "lightning" }, 40134: { twoWay: true, style: "lightning" },
  40162: { style: "knockback" },          // Utopian Sky Blastburn (no damage, a knockback)
  // Lightning in blue wherever it falls (user: "a common trend through the
  // fight"): Utopian Sky's lightning Burnt Strike and Burnout from the west
  // wall, Sinbound Thunder III and Cyclonic Break's Sinsmite spreads.
  40163: { style: "lightning" }, 40164: { style: "lightning" },
  40160: { style: "lightning" }, 40149: { style: "lightning" },
  // Twin Stillness (270° front, then 90° back) and Twin Silence (90° back,
  // then 270° front), per usurper-of-frost.ts's model; first/second as cast
  // in fight 24 (40194 at 3:50.1, 40195 at 3:52.2). The reflection casting
  // them has one sample 12s earlier and stands still.
  40193: { angle: 270, holdCaster: true }, 40196: { angle: 90, flip: true, holdCaster: true },
  40194: { angle: 90, flip: true, holdCaster: true }, 40195: { angle: 270, holdCaster: true },
  // Spell-in-Waiting resolutions on their holders (P3 Relativity and
  // Refrain, P4 Crystallize Time). Dark Blizzard III's donut hit nobody and
  // its caster has no position, so it wasn't drawn at all.
  40276: { holder: 1002455 },                       // Dark Fire III
  40277: { holder: 1002454, style: "stack" },       // Unholy Darkness
  40279: { holder: 1002462 },                       // Dark Blizzard III
  40271: { holder: 1002461, style: "stack" },       // Dark Water III
  40274: { holder: 1002460 },                       // Dark Eruption
  40280: { holder: 1002463, style: "knockback" },   // Dark Aero III (P4)
  // Diamond Dust's Icicle Impact: 10y circles at the arena edge, shown
  // from their cast bars as the game does (user, 2026-10-17): 2, then 4
  // about 4s later, then the last 2 as the Frigid Stones drop; each lands
  // 8.7s after it begins (both pulls).
  // In white with a turning snowflake until they land (user, 2026-10-17).
  40198: { telegraph: true, style: "ice" },
  // Diamond Dust's House of Light: four cones from Shiva in the middle out
  // through the four nearest players (user, 2026-10-17: two drew from the
  // north and west walls). The helpers casting them last logged a position
  // at the walls in Fall of Faith; Shiva's reflection casts the Scythe /
  // Axe Kick at (100, 100) just before (both pulls). Golden light, as in
  // game.
  // In Mirror, Mirror the same cones come from Shiva and the blue mirror
  // (with her Scythe Kick), then from the two red mirrors (with their
  // Reflected Scythe Kicks 40204/40205), four nearest players each.
  40206: { originCaster: [40202, 40203, 40204, 40205], style: "light" },
  // Glowing Bleeding puddles left where these land (user, 2026-10-17, for
  // Sinbound Holy; the P2 header names Luminous Hammer and Hiemal Ray too).
  // The log has no puddle actor and no Bleeding unless someone stands in
  // one; the lifetime is PUDDLE_GUESS_MS (Holy's checked on VOD).
  40209: { style: "stack", puddleMs: PUDDLE_GUESS_MS },
  40218: { puddleMs: PUDDLE_GUESS_MS },
  40257: { puddleMs: PUDDLE_GUESS_MS },
  // Frigid Needle: each dropped stone shows an 8-way star through its 4.7s
  // cast, pointing where its lines will shoot (user, 2026-10-17): two
  // 40201 crosses per stone (one cardinal, one diagonal: casters face 180
  // and 225 in both pulls) and the 5y 40200 circle under it.
  40201: { telegraph: true, star: true }, 40200: { telegraph: true },
  // P3's Sinbound Meltdown follow-ups and Apocalypse's explosions are
  // placed by relativityShapes / apocalypseShapes below: the helpers'
  // logged facing and positions are stale for both.
  40292: { hidden: true }, 40297: { hidden: true },
  // Tank busters.
  40290: { style: "tankbuster" },                   // Black Halo
  40182: { style: "tankbuster" },                   // Darkest Dance jump
  40284: { style: "tankbuster" }, 40285: { style: "tankbuster" },  // Somber Dance
};

// ── Head markers and tethers ────────────────────────────────────────────────

/**
 * Marker -> hit, from the module headers and JZ1KXhDbqkNH3jxR fight 24:
 * 218 0:20 -> Powder Mark Trail 0:24, 2:49 -> Quadruple Slap 2:54;
 * 345 -> Frigid Stone 8s later; 259 8:39 -> Black Halo 8:44; 184 ~5s
 * before each Refrain Water; 139 on all eight 5s before Apocalypse's
 * Eruptions; 525 on Shiva herself, 6s before her Hallowed Ray. 62 (six
 * players at 8:56) is unplaced.
 */
const HEAD_MARKERS: Record<number, HeadMarkerDef> = {
  218: { label: "Tank buster", abilities: [40168, 40191] },
  345: { label: "Frigid Stone", abilities: [40199] },
  525: { label: "Line stack", abilities: [40211] },
  375: { label: "Luminous Hammer", abilities: [40218] },
  259: { label: "Black Halo", abilities: [40290] },
  184: { label: "Dark Water III", abilities: [40271] },
  139: { label: "Dark Eruption", abilities: [40274] },
};

/**
 * FRU P2 Diamond Dust: 345 on the four Frigid Stone players 8s before their
 * 5y stones 40199 drop at their feet (user, 2026-10-17; M9Nagmnw2LzHZPVq 1
 * marker 3:21.1, stones 3:29.2; JZ1KXhDbqkNH3jxR 24 3:18.8 / 3:26.9).
 */
const MARKER_AOES: Record<number, MarkerAoe> = {
  345: { ability: 40199, name: "Frigid Stone" },
};

/**
 * FRU P1, checked on JZ1KXhDbqkNH3jxR 24 and M9Nagmnw2LzHZPVq 1 (user,
 * 2026-10-17: Fall of Faith's tethers are fire or lightning): 249 fire,
 * paid off by Sinblaze 40156 (Fall of Faith) or Sinsmoke 40167 (Utopian
 * Sky's tether stacks); 287 lightning, by Sinsmite 40142.
 */
const TETHERS: Record<number, TetherKind> = {
  249: { element: "fire", payoff: [40156, 40167] },
  287: { element: "lightning", payoff: [40142] },
  // P3 Ultimate Relativity: Speed's tethers from the boss to the
  // hourglasses, three yellow in a Y (Quicken, fire first) and two purple
  // (Slow, fire last), each with a bright orb in the middle (NAUR guide).
  // JZ1KXhDbqkNH3jxR 24 7:43.8: 134 on the three that took Quicken 40294
  // and fired at 7:56.7, 133 on the two that took Slow 40295 and fired at
  // 8:17.7. Nothing logs their end: shown the default 15s.
  134: { element: "fru-quicken", payoff: [] },
  133: { element: "fru-slow", payoff: [] },
};

// ── Boss cues ───────────────────────────────────────────────────────────────
//
// P1, Cyclonic Break (fatebreaker.ts header): a fire or lightning dragon
// circles Fatebreaker counterclockwise during the cast and is gone when the
// cast bar ends, before the cones go out (user, 2026-10-17; the same for
// every dragon below). Fire = 40144 (boss) / 40329 (image, second set):
// Sinsmoke pairs. Lightning = 40148 / 40330: Sinsmite spreads. Checked
// 2026-10-17: JZ1KXhDbqkNH3jxR fight 24 (40144 then Sinsmoke 0:17.8; 40330
// then Sinsmite 0:59.8) and M9Nagmnw2LzHZPVq fight 1 (40144; 40329 then
// Sinsmoke 0:59.9). The second set's cast comes from "Fatebreaker's image"
// with one position sample, and the header says it's often not logged at
// all, so the effect centres on the bait cones' origin (40145), and with no
// cast logged its element comes from the Sinsmoke / Sinsmite hits after the
// cones.
//
// The same dragon shows through two more casts (user, 2026-10-17;
// CAST_DRAGONS):
// - Utopian Sky on Fatebreaker: 40154 fire = Sinbound Fire III stacks,
//   40155 lightning = Sinbound Thunder III spreads (both pulls: 40155, then
//   Thunder at 0:50.7).
// - Turn of the Heavens on the untargetable clone parked at (100, 92.5)
//   after the second Cyclonic Break: it says which halos explode big.
//   40150 = fire: the flame halos' Brightfire was the 10y 40153, levin the
//   5y 40152 (JZ1KXhDbqkNH3jxR 24); 40151 = lightning: the reverse
//   (M9Nagmnw2LzHZPVq 1). Both parties stood among the small halos.
// - Burnt Strike at the towers (~2:16) on Fatebreaker: 40129 fire = in
//   (the Blastburn knockback follows), 40133 lightning = out (the wide
//   Burnout follows).
// The halos themselves (four "halo of flame", four "halo of levin") show
// as element rings at their Brightfire size from their begincast, 8s
// before they go off (HALO).

const CYCLONIC_FIRE = [40144, 40329];
const CYCLONIC_LIGHTNING = [40148, 40330];
const CYCLONIC_BAIT = 40145;
const SINSMOKE = 40147, SINSMITE = 40149;
const CYCLONIC_CAST_MS = 6700;        // the second set's cast; the first is 6200
const BAIT_AFTER_CAST_MS = 600;       // bait cones land this long after the cast ends

const LABELS = { "fire-dragon": "Fire: pairs", "lightning-dragon": "Lightning: spread" };

// Dragons shown for a cast's own duration, by cast id.
const CAST_DRAGONS: Record<number, { kind: "fire-dragon" | "lightning-dragon"; label: string }> = {
  40154: { kind: "fire-dragon", label: "Fire: stacks" },                 // Utopian Sky
  40155: { kind: "lightning-dragon", label: "Lightning: spread" },
  40150: { kind: "fire-dragon", label: "Fire halos explode: lightning side safe" },   // Turn of the Heavens
  40151: { kind: "lightning-dragon", label: "Lightning halos explode: fire side safe" },
  40129: { kind: "fire-dragon", label: "Fire: in" },                     // the towers' Burnt Strike
  40133: { kind: "lightning-dragon", label: "Lightning: out" },
};
const CASTER_HOLD_MS = 20000;         // parked clones log one sample, often well before the cast

// Statuses that change the whole floor while the party carries them: FRU
// P2's Thin Ice (Shining Armor turns the field to ice and players slide;
// user, 2026-10-17). On all eight at Frost Armor +0.3s for ~12s in both
// pulls. Drawn over the arena: the map's centre (FFLogs offsets) and this
// radius, the FRU arena's 20y.
const FLOOR_STATUSES: Record<number, FloorStatus> = {
  1000911: { kind: "ice-floor", label: "Thin Ice: players slide", radius: 2000 },
};

// Statuses that lift a player into a cage: FRU Floating Fetters, 4s on
// each tethered carrier before their hit (user, 2026-10-17). Lift and
// cage last the whole status (user: a last-second-only cage was wrong).
const JAIL_STATUSES = [1002304];

// FRU P2 Mirror, Mirror 40179: three frozen mirrors on the edge (user,
// 2026-10-17). The blue one fires its Reflected Scythe Kick 40204 with
// Shiva's kick, the two red ones 40205 ten seconds later, each followed by
// four House of Light cones. M9Nagmnw2LzHZPVq 1: blue NE (114, 86), red N
// and W; JZ1KXhDbqkNH3jxR 24: blue NE, red NW and SW.
const MIRROR_MIRROR = 40179;
const BLUE_MIRROR_KICK = 40204, RED_MIRROR_KICK = 40205;
const MIRRORS_WITHIN_MS = 40000;
const MIRROR_AFTER_MS = 900;          // past the kick, through its cones

// Turn of the Heavens' halos: Brightfire casts, element from the actor's name.
const HALO_BRIGHTFIRE = [40152, 40153];

function buildEffects(data: ReplayData): CasterEffect[] {
  const casts = data.enemyCasts ?? [];
  const hits = data.enemyHits ?? [];
  const actorByKey = new Map(data.actors.map((a) => [a.key, a]));
  const out: CasterEffect[] = [];

  for (const c of casts) {
    const dragon = c[4] !== undefined && c[3] > 0 ? CAST_DRAGONS[c[4]] : undefined;
    const halo = c[4] !== undefined && c[3] > 0 && HALO_BRIGHTFIRE.includes(c[4]);
    if (!dragon && !halo) continue;
    const caster = actorByKey.get(c[1]);
    const p = caster && sampleNear(caster, c[0] + c[3], CASTER_HOLD_MS);
    if (!caster || !p) continue;
    if (dragon) {
      out.push({ ...dragon, actor: caster.samples.length > 20 ? caster.key : undefined, x: p.x, y: p.y, start: c[0], end: c[0] + c[3] });
      continue;
    }
    const element = /flame|fire/i.test(caster.name) ? "fire-halo" : /levin|lightning|thunder/i.test(caster.name) ? "lightning-halo" : undefined;
    const range = data.actionGeometry?.[c[4]!]?.range;
    if (element && range) {
      out.push({ kind: element, label: "", radius: range * 100, x: p.x, y: p.y, start: c[0], end: c[0] + c[3] + 200 });
    }
  }

  // Each bait volley (the first 40145 of a burst) is one Cyclonic Break.
  const baits = casts.filter((c) => c[4] === CYCLONIC_BAIT && c[3] === 0);
  const volleys = baits.filter((c, i) => i === 0 || c[0] - baits[i - 1][0] > 2000);
  for (const v of volleys) {
    const t = v[0];
    // The cast that ended just before, and its begincast.
    const end = casts.find((c) => c[3] === 0 && c[4] !== undefined && [...CYCLONIC_FIRE, ...CYCLONIC_LIGHTNING].includes(c[4]) && t - c[0] >= 0 && t - c[0] <= 2000);
    const begin = end && casts.find((c) => c[3] > 0 && c[4] === end[4] && c[1] === end[1] && Math.abs(c[0] + c[3] - end[0]) < 1000);
    let kind: "fire-dragon" | "lightning-dragon" | undefined =
      end ? (CYCLONIC_FIRE.includes(end[4]!) ? "fire-dragon" : "lightning-dragon") : undefined;
    if (!kind) {
      const el = hits.find((h) => (h[1] === SINSMOKE || h[1] === SINSMITE) && h[0] > t && h[0] - t <= 4000);
      if (el) kind = el[1] === SINSMOKE ? "fire-dragon" : "lightning-dragon";
    }
    if (!kind) continue;
    const origin = actorByKey.get(v[1]);
    const o = origin && sampleNear(origin, t, 1500);
    if (!o) continue;
    // Follow the caster only when it's tracked well (the boss, not an image).
    const caster = begin ? actorByKey.get(begin[1]) : undefined;
    out.push({
      kind, label: LABELS[kind],
      actor: caster && caster.samples.length > 20 ? caster.key : undefined,
      x: o.x, y: o.y,
      start: begin ? begin[0] : t - BAIT_AFTER_CAST_MS - CYCLONIC_CAST_MS,
      // Gone when the cast bar ends, before the cones go out (user, 2026-10-17).
      end: end ? end[0] : t - BAIT_AFTER_CAST_MS,
    });
  }
  // Mirror, Mirror's frozen mirrors, from the cast until each one's kick
  // and cones have gone off. Their positions are logged only on those
  // kicks; they don't move.
  for (const mm of casts.filter((c) => c[4] === MIRROR_MIRROR && c[3] === 0)) {
    for (const c of casts) {
      const kind = c[3] === 0 && c[0] > mm[0] && c[0] - mm[0] <= MIRRORS_WITHIN_MS
        ? c[4] === BLUE_MIRROR_KICK ? "blue-mirror" as const : c[4] === RED_MIRROR_KICK ? "red-mirror" as const : undefined
        : undefined;
      const a = kind && actorByKey.get(c[1]);
      const p = a && sampleNear(a, c[0], 1500);
      if (kind && p) out.push({ kind, label: "", x: p.x, y: p.y, start: mm[0], end: c[0] + MIRROR_AFTER_MS });
    }
  }
  out.push(...relativityEffects(data), ...apocalypseEffects(data));
  return out;
}

// ── P3 Oracle of Darkness ───────────────────────────────────────────────────
//
// Built 2026-10-18 on JZ1KXhDbqkNH3jxR fight 24 (P3 7:21-10:02), no VOD
// yet; the look is from the NAUR P3 guide (oracle-of-darkness.ts [N]).
// Fit check after: Dark Fire III, Unholy Darkness, Dark Blizzard III, the
// rewind's Eruptions and Waters, Shell Crusher, Black Halo and Darkest
// Dance all exact once simultaneous casts are compared together (the fit
// check script compares each circle with every same-name hit and so
// reports four exact Eruptions as 0 of 12).

const ARENA_CENTRE = 10000;           // FRU's arena centre (100, 100), centi-yalms

const bearingTo = (ax: number, ay: number, bx: number, by: number) =>
  ((Math.atan2(bx - ax, -(by - ay)) * 180) / Math.PI + 360) % 360;
const wrap = (d: number) => ((d % 360) + 540) % 360 - 180;

// Ultimate Relativity (oracle-of-darkness.ts, "EIGHT HOURGLASSES"): eight
// green hourglasses on the principal directions 9.5y out. Speed tethers
// three yellow (Quicken, fire first) and two purple (Slow, fire third);
// the three untethered fire second. Each fires Sinbound Meltdown: a 3.7s
// begincast 40291 on the hourglass, then the first beam 40235 through the
// nearest player and nine follow-ups 40292 ~1.1s apart, each turned 15° in
// the direction its hourglass shows (yellow arrow clockwise, blue counter-
// clockwise; NAUR guide).
// The hourglass bodies (actors casting 40291) log one sample; the shots
// come from other "delight's hourglass" actors that are reused between
// hourglasses (fight 24's 47.2 fires from SE at 7:56.7 and from E at
// 8:17.7), matched to their hourglass by position.
// Follow-ups: the shooters' logged facing lags or glitches (fight 24, the
// first follow-up at 7:58.8 pointed all three back through the middle and
// "hit" six players who took nothing). Their samples otherwise move 0.26
// rad (15°) a shot, in one direction per hourglass, so each follow-up is
// drawn at the first beam's bearing + k × 15° that way. No follow-up hit
// anyone in fight 24; the first beams were all exact.
const RELATIVITY = 40266;
const QUICKEN = 40294, SLOW = 40295;
const QUICKEN_TETHER = 134, SLOW_TETHER = 133;
const MELTDOWN_BEGIN = 40291, MELTDOWN_FIRST = 40235, MELTDOWN_NEXT = 40292;
const MELTDOWN_STEP = 15;             // degrees per follow-up
const MELTDOWN_SPAN_MS = 12000;       // first beam to last follow-up (~10.6s)
const SAME_SPOT = 100;                // centi-yalms: a shooter on its hourglass

type MeltdownVolley = {
  key: string; x: number; y: number;  // shooter and where it stands
  t: number; bearing: number;         // first beam
  spin: 1 | -1;                       // +1 clockwise
  follow: number[];                   // follow-up cast times
};

function meltdownVolleys(data: ReplayData): MeltdownVolley[] {
  const casts = data.enemyCasts ?? [];
  const hits = data.enemyHits ?? [];
  const actorByKey = new Map(data.actors.map((a) => [a.key, a]));
  const out: MeltdownVolley[] = [];
  for (const c of casts) {
    if (c[4] !== MELTDOWN_FIRST || c[3] !== 0) continue;
    const a = actorByKey.get(c[1]);
    const o = a && sampleNear(a, c[0], 1500);
    if (!a || !o) continue;
    const hit = hits.find((h) => h[1] === MELTDOWN_FIRST && h[2] === c[1] && h[0] >= c[0] && h[0] - c[0] <= 1500 && h[6] !== null);
    const target = c[5] ? actorByKey.get(c[5]) : undefined;
    const tp = hit ? { x: hit[6]!, y: hit[7]! } : target && poseAt(target, c[0]);
    if (!tp) continue;
    const bearing = bearingTo(o.x, o.y, tp.x, tp.y);
    const next = casts.find((n) => n[1] === c[1] && n[4] === MELTDOWN_FIRST && n[3] === 0 && n[0] > c[0]);
    const until = Math.min(c[0] + MELTDOWN_SPAN_MS, next ? next[0] - 1 : Infinity);
    const follow = casts.filter((n) => n[1] === c[1] && n[4] === MELTDOWN_NEXT && n[3] === 0 && n[0] > c[0] && n[0] <= until).map((n) => n[0]);
    // Spin: the majority turn of the shooter's samples from the first beam.
    let vote = 0;
    for (const s of a.samples) {
      if (s[0] <= c[0] + 1500 || s[0] > until) continue;
      const d = wrap(facingToCompassBearing(s[3]) - bearing);
      if (Math.abs(d) >= 10 && Math.abs(d) <= 170) vote += Math.sign(d);
    }
    out.push({ key: c[1], x: o.x, y: o.y, t: c[0], bearing, spin: vote < 0 ? -1 : 1, follow });
  }
  return out;
}

function relativityShapes(data: ReplayData): AoeShape[] {
  const g = data.actionGeometry?.[MELTDOWN_NEXT];
  if (!g) return [];
  const out: AoeShape[] = [];
  for (const v of meltdownVolleys(data)) {
    v.follow.forEach((t, i) => {
      out.push({
        kind: "rect", x: v.x, y: v.y, bearing: (v.bearing + v.spin * MELTDOWN_STEP * (i + 1) + 360) % 360,
        range: g.range * 100, width: g.width * 100, angle: 0, inner: 0, estimated: false, style: "aoe",
        name: data.abilityNames?.[MELTDOWN_NEXT] ?? "Sinbound Meltdown", start: t - 300, resolve: t,
      });
    });
  }
  return out;
}

// Spell-in-Waiting: Return records each player's spot when it runs out
// (a blue marker in game, NAUR guide) and pulls them back there at the
// Stun. Fight 24: five at 7:56.5, three at 8:06.5, all back at 8:20.5.
const RETURN_WAITING = 1002464, RETURN = 1002452;
// Shadoweye: a gaze from its three holders as the Stun lands (8:23.6 in
// fight 24); anyone facing one gets Doom. Shown on the holder for its
// last seconds, while everyone has to face out.
const SHADOWEYE = 1002456;
const SHADOWEYE_SHOW_MS = 5000;

function relativityEffects(data: ReplayData): CasterEffect[] {
  const casts = data.enemyCasts ?? [];
  const tethers = data.tethers ?? [];
  const auras = data.playerAuras ?? [];
  const actorByKey = new Map(data.actors.map((a) => [a.key, a]));
  const out: CasterEffect[] = [];
  const volleys = meltdownVolleys(data);

  // The hourglasses, from their tethers (or Relativity's cast) to their
  // last shot.
  const relativity = casts.find((c) => c[4] === RELATIVITY && c[3] === 0);
  const bodies = [...new Set(casts.filter((c) => c[4] === MELTDOWN_BEGIN && c[3] > 0).map((c) => c[1]))];
  const firstTether = tethers.find((tt) => bodies.includes(tt[1]) || bodies.includes(tt[2]));
  for (const key of bodies) {
    const a = actorByKey.get(key);
    const p = a?.samples[0];
    const begin = casts.find((c) => c[1] === key && c[4] === MELTDOWN_BEGIN && c[3] > 0);
    if (!p || !begin) continue;
    const v = volleys.find((q) => Math.hypot(q.x - p[1], q.y - p[2]) <= SAME_SPOT && q.t >= begin[0] && q.t - begin[0] <= 6000);
    const last = v ? (v.follow[v.follow.length - 1] ?? v.t) : begin[0] + begin[3];
    const start = firstTether?.[0] ?? (relativity ? relativity[0] + 4000 : begin[0] - 9000);
    const tether = tethers.find((tt) => (tt[1] === key || tt[2] === key) && (tt[3] === QUICKEN_TETHER || tt[3] === SLOW_TETHER));
    const speed = casts.find((c) => c[5] === key && (c[4] === QUICKEN || c[4] === SLOW) && c[3] === 0);
    const kind = tether?.[3] === QUICKEN_TETHER || speed?.[4] === QUICKEN ? "fru-hourglass-yellow"
      : tether?.[3] === SLOW_TETHER || speed?.[4] === SLOW ? "fru-hourglass-purple" : "fru-hourglass";
    out.push({ kind, layer: "floor", label: "", x: p[1], y: p[2], start, end: last + 600 });
    // Its turning arrow, from the begincast until the last shot.
    if (v) out.push({ kind: v.spin > 0 ? "fru-spin-cw" : "fru-spin-ccw", layer: "floor", label: "", x: p[1], y: p[2], start: begin[0], end: last + 300 });
  }

  // Return's recorded spots.
  for (const w of auras) {
    if (w[3] !== RETURN_WAITING) continue;
    const ret = auras.find((r) => r[3] === RETURN && r[2] === w[2] && Math.abs(r[0] - w[1]) <= 1000);
    const player = actorByKey.get(w[2]);
    const p = player && poseAt(player, w[1]);
    if (!ret || !p) continue;
    out.push({ kind: "fru-return", layer: "floor", label: "", x: p.x, y: p.y, start: w[1], end: ret[1] + 400 });
  }

  // Shadoweye on its holders.
  for (const s of auras) {
    if (s[3] !== SHADOWEYE || s[1] - s[0] < SHADOWEYE_SHOW_MS) continue;
    const player = actorByKey.get(s[2]);
    const p = player && poseAt(player, s[1]);
    if (!p) continue;
    out.push({ kind: "fru-shadoweye", label: "", actor: s[2], x: p.x, y: p.y, start: s[1] - SHADOWEYE_SHOW_MS, end: s[1] + 300 });
  }
  return out;
}

// Apocalypse (oracle-of-darkness.ts, "SIX APOCALYPSE WAVES"; NAUR guide):
// lights run along the floor's axis lines and outer ring; each time one
// reaches a crossing a circle appears there, a wave every 2s, and the
// waves explode in the same order 2s apart, each ~10.4s after it appeared
// (guide: waves at +10..+20, explosions from +21; Darkest Dance begins at
// +26, which puts +0 at 9:02.4 in fight 24 and the first hits at 9:23.4).
// Two lights start on the ring at opposite points (A0, B0) and run the
// same way round, 45° a wave; two leave the centre along that axis in
// wave 1 and two more in wave 2, following them. So wave k explodes the
// ring points A/B max(0, k-3) .. k-1, and the centre in waves 1 and 2.
// Fight 24 (40297, 9:22.8 to 9:32.9 every ~2s): wave 1 centre, NW, SE;
// wave 2 centre, NW, W, SE, E; waves 4-6 exactly three a side turning
// counterclockwise. Wave 3's helpers all logged (100, 100), stale: by the
// model it's NW/W/SW and SE/E/NE (two of its three hits fit; one hit
// player's logged spot sits 11y off, likely lagging their run in).
// Helpers' positions decide only the start (wave 1) and turn (wave 2).
const APOCALYPSE_HIT = 40297;
const APOCALYPSE_WAVE_GAP_MS = 1000;
const APOCALYPSE_SHOW_MS = 10400;     // a wave's circle shows this long before it explodes
const APOCALYPSE_STEP_MS = 2000;
const RING_MIN = 700;                 // centi-yalms from the centre: a ring point

type ApocalypseModel = { a0: number; dir: 1 | -1; ring: number; waves: number[] };

function apocalypseModel(data: ReplayData): ApocalypseModel | undefined {
  const casts = (data.enemyCasts ?? []).filter((c) => c[4] === APOCALYPSE_HIT && c[3] === 0);
  if (casts.length < 2) return undefined;
  const actorByKey = new Map(data.actors.map((a) => [a.key, a]));
  const waves: (typeof casts)[] = [];
  for (const c of casts) {
    const w = waves[waves.length - 1];
    if (w && c[0] - w[0][0] <= APOCALYPSE_WAVE_GAP_MS) w.push(c); else waves.push([c]);
  }
  if (waves.length < 2) return undefined;
  const ringOf = (w: typeof casts) => w.flatMap((c) => {
    const a = actorByKey.get(c[1]);
    const p = a && sampleNear(a, c[0], 300);
    const r = p ? Math.hypot(p.x - ARENA_CENTRE, p.y - ARENA_CENTRE) : 0;
    return p && r >= RING_MIN ? [{ b: bearingTo(ARENA_CENTRE, ARENA_CENTRE, p.x, p.y), r }] : [];
  });
  const w1 = ringOf(waves[0]), w2 = ringOf(waves[1]);
  if (!w1.length) return undefined;
  const a0 = w1[0].b;
  const step = w2.map((p) => wrap(p.b - a0)).find((d) => Math.abs(d) > 20 && Math.abs(d) < 70);
  if (step === undefined) return undefined;
  const ring = w1.reduce((s, p) => s + p.r, 0) / w1.length;
  return { a0, dir: step > 0 ? 1 : -1, ring, waves: waves.map((w) => w[0][0]) };
}

function apocalypseShapes(data: ReplayData): AoeShape[] {
  const m = apocalypseModel(data);
  const g = data.actionGeometry?.[APOCALYPSE_HIT];
  if (!m || !g) return [];
  const out: AoeShape[] = [];
  m.waves.forEach((t, i) => {
    const k = i + 1;
    const spots: { x: number; y: number }[] = k <= 2 ? [{ x: ARENA_CENTRE, y: ARENA_CENTRE }] : [];
    for (let j = Math.max(0, k - 3); j <= k - 1; j++) {
      for (const side of [0, 180]) {
        const b = ((m.a0 + side + m.dir * 45 * j) * Math.PI) / 180;
        spots.push({ x: ARENA_CENTRE + Math.sin(b) * m.ring, y: ARENA_CENTRE - Math.cos(b) * m.ring });
      }
    }
    for (const p of spots) {
      out.push({
        kind: "circle", x: p.x, y: p.y, bearing: 0, range: g.range * 100, width: 0, angle: 0, inner: 0, estimated: false,
        style: "fru-apocalypse", name: data.abilityNames?.[APOCALYPSE_HIT] ?? "Apocalypse", start: t - APOCALYPSE_SHOW_MS, resolve: t,
      });
    }
  });
  return out;
}

/** The lights running round: one cue at A0, its turn in the kind. */
function apocalypseEffects(data: ReplayData): CasterEffect[] {
  const m = apocalypseModel(data);
  if (!m) return [];
  const start = m.waves[0] - APOCALYPSE_SHOW_MS;
  const b = (m.a0 * Math.PI) / 180;
  return [{
    kind: m.dir > 0 ? "fru-apocalypse-cw" : "fru-apocalypse-ccw", layer: "floor",
    label: m.dir > 0 ? "Apocalypse: lights turn clockwise" : "Apocalypse: lights turn counterclockwise",
    radius: m.ring, x: ARENA_CENTRE + Math.sin(b) * m.ring, y: ARENA_CENTRE - Math.cos(b) * m.ring,
    start, end: start + 5 * APOCALYPSE_STEP_MS + 1000,
  }];
}

export const FRU_REPLAY: FightReplay = {
  key: "fru",
  game: "ffxiv",
  name: "Futures Rewritten",
  signature: [...CYCLONIC_FIRE, ...CYCLONIC_LIGHTNING, CYCLONIC_BAIT, 40265, 40266],
  overrides: OVERRIDES,
  headMarkers: HEAD_MARKERS,
  markerAoes: MARKER_AOES,
  tethers: TETHERS,
  effects: buildEffects,
  shapes: (data) => [...relativityShapes(data), ...apocalypseShapes(data)],
  floorStatuses: FLOOR_STATUSES,
  jailStatuses: JAIL_STATUSES,
};
