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

// ── P2 Kefka: Forsaken, Trines (forsaken.ts) ────────────────────────────────

// Forsaken (47804): sixteen towers in eight pairs on the r=8 ring, soaked
// two each (The Path of Light 47806 on the soakers). Each soaker's spell
// (1005084 stack, 1005085 circle, 1005086 cone; forsaken.ts) is planted
// where they soak and fires ~0.6s later: Spelldriver 47808 (a 5y stack),
// Spellscatter 47809 (5y on the holder), Spellwave 47810 (a cone at the
// nearest player; thaliak: "a close spread ... about 90°"). The follow-ups'
// helpers log stale spots ((99.3, 87.7) at 4:11.4 in fight 10, the
// Paladin's plant at (104.5, 104.7)), so they're drawn from the soak.
// When each tower pair appears isn't logged; the replay shows it from the
// previous pair's resolution (the first from Forsaken's cast), a VOD check.
const FORSAKEN = 47804, PATH_OF_LIGHT = 47806;
const SPELLDRIVER = 47808, SPELLSCATTER = 47809, SPELLWAVE = 47810;
const SPELL_OF: Record<number, number> = { 1005084: SPELLDRIVER, 1005085: SPELLSCATTER, 1005086: SPELLWAVE };
const SPELLWAVE_ANGLE = 90;
const TOWER_SET_GAP_MS = 15000;

// Future's End / Past's End (47826 / 47827): Kefka and three clones jump
// on the four nearest players (47830-47833), then All Things Ending
// (47836 after Future's, 47837 after Past's) cleaves half the room in
// front of each (Future) or behind (Past) (thaliak). Fight 10: Future's
// End 4:19.8 then 47836 at 4:31.0, every caster facing N-ish (3-12°) with
// the party south; Past's End 5:02.0 then 47837 at 5:13.1 facing N
// (344-10°) with the party north. The clones are actors 17.x.
const FUTURES_END = 47826, PASTS_END = 47827;
const ENDS_JUMPS = [47830, 47831, 47832, 47833];
const ENDS_CLEAVES: Record<number, "future" | "past"> = { 47836: "future", 47837: "past" };

// Trine (47839): three sets of triangles descend; their tips (47840, 6y)
// explode 12s later in spawn order (thaliak; fight 10 6:07.4, 6:09.4,
// 6:11.4). The tip helpers are reused between sets and log a position
// only at some casts, so a tip is drawn only from a sample at its own
// explosion that sits on the triangle grid (x every 8.66y, y every 5y
// from the centre); fight 10's first set has none, fight 5's third none.
const TRINE = 47840;
const TRINE_SHOW_MS = 12000;
const TRINE_GRID = { x: 866, y: 500, snap: 60 };

// Wings of Destruction's half-room (thaliak: "one of Kefka's wings glows
// and cleaves that half"): an 80x40 rect in the data, drawn from Kefka
// along his facing it covered the north half with players in it. The id
// says the wing: 47822 = right (fight 10 6:01.7, facing N, all eight west
// of x=98), 47821 = left (fight 5 6:01.6, facing N, all eight east of
// x=101). So the rect runs from Kefka to his right or left, shown through
// the 3.7s cast while the wing glows.
const WING_RIGHT = 47822, WING_LEFT = 47821;

// Aero III Assault (50167): a knockback from the middle on everyone, then
// Down for the Count (thaliak); 2.7s cast, 40y in the data.
const AERO_ASSAULT = 50167;

// ── P3 Exdeath and Chaos (exdeath.ts, limitcut.ts, blackhole.ts, ───────────
// ── stompies.ts) ─────────────────────────────────────────────────────────────

// Bowels of Agony (47858): three sigils 90° apart on the intercardinals
// (thaliak: a water square, a wind diamond, a fire triangle), each firing
// at the nearest players when its debuff is cleansed: fire = Inferno
// 47860 (a 10y donut on the two nearest), water = Tsunami 47861 (5y on
// the two nearest, a knockback), wind = Cyclone 47864 (a partner stack on
// the sigil). A sigil's spot is its helper's sample at its own cast when
// that sits 14y out on a diagonal: fight 10 fire NW (90.1, 90.1), wind SW,
// water SE; fight 5 fire NE, wind NW, water unlogged (its Tsunami came
// from reused Trine helpers).
const BOWELS = 47858;
const SIGILS: Record<number, "fire" | "water" | "wind"> = { 47860: "fire", 47861: "water", 47864: "wind" };
const INFERNO = 47860;
const SIGIL_R = 1400, SIGIL_TOL = 80;

// Latitudinal Implosion (47870): Chaos's Shockwave cones (47871), first
// out of his sides, then front and back (thaliak; Longitudinal is the
// reverse, not in either log). Fight 5: Chaos facing 314°, the pairs at
// 44/224 then 134/314; fight 10's first pair came from helpers last seen
// 2s and 14s earlier (one 9y off), so the cones are drawn from Chaos.
const LATITUDINAL = 47870, IMPLOSION_SHOCKWAVE = 47871;
const SHOCKWAVE_ANGLE = 90;

// Limit Cut: eight clones on the rim pulse (Ultima Blaster 47843, every
// 2s from 8:29.0 in fight 10) and then dash at their numbered player in
// the same order (47844, 8:51.4-8:53.0). The numbers are head markers:
// 336-339 = 1-4, 437-440 = 5-8 (fight 10: dash k hit marker k's player,
// all eight).
const LC_PULSE = 47843, LC_DASH = 47844;
const LC_NUMBERS: Record<number, number> = { 336: 1, 337: 2, 338: 3, 339: 4, 437: 5, 438: 6, 439: 7, 440: 8 };

// Vacuum Wave (47891): Exdeath knocks everyone back (7.7s cast; 100y in
// the data, so the engine skips it as raidwide).
const VACUUM_WAVE = 47891;

// Black Hole: the small black holes (actors "black hole", 17y out on the
// cardinals) tether their players (84) and fire Nothingness (47868) down
// the tether.
const NOTHINGNESS = 47868, BLACK_HOLE_TETHER = 84;

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
  // Towers whose rows carry no omen to say so (Forsaken's The Path of
  // Light 47806 is drawn by forsakenShapes).
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
  // P2. Ultimate Embrace: a tankbuster shared with the other tank.
  49740: { style: "tankbuster" },
  // Forsaken's towers and planted spells: forsakenShapes.
  [PATH_OF_LIGHT]: { hidden: true },
  [SPELLDRIVER]: { hidden: true }, [SPELLSCATTER]: { hidden: true }, [SPELLWAVE]: { hidden: true },
  // All Things Ending: half the room, in front (Future's End) or behind
  // (Past's). With no angle the cones were 90°, and Past's drew in front:
  // 6-8 players inside at 5:13.0-5:13.2 in fight 10, none hit.
  47836: { angle: 180 }, 47837: { angle: 180, flip: true },
  // Trine tips: trineShapes. Wings of Destruction's half-room: wingShapes;
  // then 7y tankbusters on the nearest and farthest (47823).
  [TRINE]: { hidden: true },
  [WING_RIGHT]: { hidden: true }, [WING_LEFT]: { hidden: true },
  47823: { style: "tankbuster" },
  // P3. Inferno and the Implosion cones: p3Shapes.
  [INFERNO]: { hidden: true },
  [IMPLOSION_SHOCKWAVE]: { hidden: true },
  // Stray Spray: a 10y donut on each Dynamic Fluid holder as it's cleansed
  // (thaliak). Its helpers had no sample near the cast (fight 10, 8:17.9:
  // the last 2.1s earlier, 7y off), so it wasn't drawn.
  47862: { holder: 1001601 },
  47864: { style: "stack" },                    // Cyclone, at the wind sigil
  47884: { style: "tankbuster" },               // Thunder III on the tank nearest Exdeath
  // Slap Happy's Shockwave (47851) hits all eight in both slaps (fight 10
  // 9:39.7, 10:10.1): raidwide. Drawn as two 180-270° cones it covered the
  // arena.
  47851: { hidden: true },
  // Ground telegraphs with an omen, shown through their cast bars: Slap
  // Happy's 6y burst (47849, general_1bf, 1.2s), Damning Edict (47873, a
  // 60x80 rect from Chaos), Look upon Me and Despair (47854, a 16y-wide
  // line from Kefka).
  47849: { telegraph: true },
  47873: { telegraph: true },
  47854: { telegraph: true },
  // Stompies (stompies.ts): Exdeath's Blizzard III puddles drop under every
  // player and go off 2.7s later; Stomp-a-Mole's towers take two; Knock
  // Down is a stack, Big Bang lands on its spots.
  47885: { telegraph: true, style: "ice" },
  47856: { style: "tower", soakers: 2 },
  47875: { style: "stack" },
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
  // P2. 259: Ultimate Embrace's tank marker (fight 10 3:36.7 -> 3:41.7).
  259: { label: "Shared tank buster", abilities: [49740] },
  // Forsaken's spell markers, shown as each spell is handed out; they
  // match the holder's status in every case of fight 10 (8 / 12 / 12):
  // 715 stack, 716 circle, 717 cone. Labelled until the holder's next
  // soak or spell, else 5s.
  715: { label: "Stack", abilities: [PATH_OF_LIGHT, SPELLDRIVER] },
  716: { label: "Circle", abilities: [PATH_OF_LIGHT, SPELLSCATTER] },
  717: { label: "Cone", abilities: [PATH_OF_LIGHT, SPELLWAVE] },
  // P3. Limit Cut's numbers (LC_NUMBERS): their dash lands 12.5-14s
  // later, past the label's 12s look-ahead, so p3Effects draws the number
  // on the player until it; the label here only stops "Marker 336" from
  // showing, ending at the first Ultima Blaster pulse (47843, raidwide,
  // 0.1s after the markers in fight 10).
  ...Object.fromEntries(Object.entries(LC_NUMBERS).map(([id, n]) => [id, { label: String(n), abilities: [LC_DASH, LC_PULSE] }])),
  // 161: Knock Down's stack marker (fight 10 11:42.1 -> 11:47.2, 11:47.6
  // -> 11:52.7).
  161: { label: "Stack", abilities: [47875] },
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
const TETHERS: Record<number, TetherKind | TetherKind[]> = {
  45: [
    { element: "dm-yellow", payoff: [47792, 47797] },
    { element: "dm-purple", payoff: [GRAVITAS, 47798] },
  ],
  // P3 Black Hole: a black hole's tether, paid off by its Nothingness.
  [BLACK_HOLE_TETHER]: { element: "dm-void", payoff: [NOTHINGNESS] },
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

function forsakenShapes(data: ReplayData): AoeShape[] {
  const casts = data.enemyCasts ?? [];
  const hits = data.enemyHits ?? [];
  const auras = data.playerAuras ?? [];
  const geo = data.actionGeometry ?? {};
  const actorByKey = new Map(data.actors.map((a) => [a.key, a]));
  const out: AoeShape[] = [];
  const forsaken = casts.filter((c) => c[4] === FORSAKEN && c[3] === 0).map((c) => c[0]);
  // Towers: each Path of Light cast at its helper (it logs a sample there).
  const towers = casts.filter((c) => c[4] === PATH_OF_LIGHT && c[3] === 0);
  const r = (geo[PATH_OF_LIGHT]?.range ?? 4) * 100;
  for (const c of towers) {
    const h = hits.find((x) => x[1] === PATH_OF_LIGHT && x[2] === c[1] && Math.abs(x[0] - c[0]) < 1000 && x[4] !== null);
    const p = h ? { x: h[4]!, y: h[5]! } : actorByKey.get(c[1]) && poseAt(actorByKey.get(c[1])!, c[0]);
    if (!p) continue;
    const prev = towers.filter((o) => o[0] < c[0] - 2000 && c[0] - o[0] < TOWER_SET_GAP_MS).pop()?.[0];
    const first = forsaken.filter((t) => t < c[0] && c[0] - t < TOWER_SET_GAP_MS).pop();
    const start = prev ?? first ?? c[0] - 3000;
    out.push({ ...blank, kind: "circle", x: p.x, y: p.y, range: r, style: "tower", soakers: 2, name: "The Path of Light", start, resolve: c[0] });
  }
  // Planted spells: each soaker's spell, at their soak spot. The spell's
  // status runs out as it's planted (0.6s after the tower in fight 10);
  // a soak's own Path of Light hit is sometimes missing or late, so the
  // spot is that hit's when there is one, else the player's.
  for (const [, end, key, status] of auras) {
    const id = SPELL_OF[status];
    const fire = id && casts.find((c) => c[4] === id && c[3] === 0 && Math.abs(c[0] - end) <= 1500);
    if (!id || !fire) continue;
    const h = hits.find((x) => x[1] === PATH_OF_LIGHT && x[3] === key && x[0] >= end - 2000 && x[0] <= end + 500 && x[6] !== null);
    const player = actorByKey.get(key);
    const pp = player && poseAt(player, end - 600);
    const at = h ? { x: h[6]!, y: h[7]! } : pp;
    if (!at) continue;
    const range = (geo[id]?.range ?? 5) * 100;
    const land = hits.filter((x) => x[1] === id && x[0] >= fire[0] && x[0] - fire[0] < 1500);
    const base = { ...blank, x: at.x, y: at.y, range, name: data.abilityNames?.[id] ?? fire[2], start: Math.min(end - 600, fire[0] - 300), resolve: fire[0] };
    if (id === SPELLWAVE) {
      // Aimed at its victim: the Spellwave hit nearest the plant.
      const v = land.filter((x) => x[6] !== null).sort((a, b) => Math.hypot(a[6]! - at.x, a[7]! - at.y) - Math.hypot(b[6]! - at.x, b[7]! - at.y))[0];
      if (!v) continue;
      const bearing = (Math.atan2(v[6]! - at.x, -(v[7]! - at.y)) * 180 / Math.PI + 360) % 360;
      out.push({ ...base, kind: "cone", bearing, angle: SPELLWAVE_ANGLE, estimated: true, style: "aoe" });
    } else {
      out.push({ ...base, kind: "circle", style: id === SPELLDRIVER ? "stack" : "aoe" });
    }
  }
  return out;
}

function trineShapes(data: ReplayData): AoeShape[] {
  const actorByKey = new Map(data.actors.map((a) => [a.key, a]));
  const range = (data.actionGeometry?.[TRINE]?.range ?? 6) * 100;
  const out: AoeShape[] = [];
  for (const c of data.enemyCasts ?? []) {
    if (c[4] !== TRINE || c[3] !== 0) continue;
    const s = actorByKey.get(c[1])?.samples.find((x) => Math.abs(x[0] - c[0]) <= 300);
    if (!s) continue;
    const gx = (s[1] - CENTRE.x) / TRINE_GRID.x, gy = (s[2] - CENTRE.y) / TRINE_GRID.y;
    if (Math.abs(gx - Math.round(gx)) * TRINE_GRID.x > TRINE_GRID.snap || Math.abs(gy - Math.round(gy)) * TRINE_GRID.y > TRINE_GRID.snap) continue;
    out.push({ ...blank, kind: "circle", x: s[1], y: s[2], range, style: "dm-trine", name: "Trine", start: c[0] - TRINE_SHOW_MS, resolve: c[0] });
  }
  return out;
}

function wingShapes(data: ReplayData): AoeShape[] {
  const casts = data.enemyCasts ?? [];
  const actorByKey = new Map(data.actors.map((a) => [a.key, a]));
  const out: AoeShape[] = [];
  for (const c of casts) {
    if ((c[4] !== WING_RIGHT && c[4] !== WING_LEFT) || c[3] !== 0) continue;
    const boss = actorByKey.get(c[1]);
    const p = boss && poseAt(boss, c[0]);
    const g = data.actionGeometry?.[c[4]];
    if (!p || !g) continue;
    const begin = casts.find((b) => b[4] === c[4] && b[1] === c[1] && b[3] > 0 && Math.abs(b[0] + b[3] - c[0]) < 800);
    const facing = ((((p.facing * 180) / Math.PI / 100 + 90) % 360) + 360) % 360;
    out.push({ ...blank, kind: "rect", x: p.x, y: p.y, bearing: (facing + (c[4] === WING_RIGHT ? 90 : 270)) % 360,
      range: g.range * 100, width: g.width * 100, style: "aoe", name: c[2], start: begin?.[0] ?? c[0] - 300, resolve: c[0] });
  }
  return out;
}

function aeroShapes(data: ReplayData): AoeShape[] {
  return (data.enemyCasts ?? []).filter((c) => c[4] === AERO_ASSAULT && c[3] > 0).map((c) => ({
    ...blank, kind: "circle" as const, x: CENTRE.x, y: CENTRE.y, range: ARENA_R, style: "knockback", name: c[2], start: c[0], resolve: c[0] + c[3],
  }));
}

/** Future's / Past's End: the clones and Kefka from their jump to All Things Ending, cleave side marked. */
function endsEffects(data: ReplayData): CasterEffect[] {
  const casts = data.enemyCasts ?? [];
  const actorByKey = new Map(data.actors.map((a) => [a.key, a]));
  const out: CasterEffect[] = [];
  for (const c of casts) {
    const side = c[3] === 0 ? ENDS_CLEAVES[c[4] ?? 0] : undefined;
    const a = side && actorByKey.get(c[1]);
    if (!side || !a) continue;
    const jump = casts.filter((j) => j[1] === c[1] && ENDS_JUMPS.includes(j[4] ?? 0) && j[0] < c[0] && c[0] - j[0] < 15000).pop();
    const begin = casts.filter((j) => (j[4] === FUTURES_END || j[4] === PASTS_END) && j[3] > 0 && j[0] < c[0] && c[0] - j[0] < 25000).pop();
    const s = a.samples.reduce<(typeof a.samples)[number] | undefined>((b, x) => (!b || Math.abs(x[0] - c[0]) < Math.abs(b[0] - c[0]) ? x : b), undefined);
    if (!s || !jump) continue;
    const boss = a.kind === "enemy" && a.samples.length > 50;
    out.push({
      kind: side === "future" ? "dm-future" : "dm-past",
      label: boss ? (side === "future" ? "Future's End: cleaves in front" : "Past's End: cleaves behind") : "",
      actor: a.key, x: s[1], y: s[2],
      start: boss && begin ? begin[0] : jump[0], end: c[0],
    });
  }
  return out;
}

const nearestSample = (a: ReplayData["actors"][number], t: number) =>
  a.samples.reduce<(typeof a.samples)[number] | undefined>((b, x) => (!b || Math.abs(x[0] - t) < Math.abs(b[0] - t) ? x : b), undefined);
const facingBearing = (f: number) => ((((f * 180) / Math.PI / 100 + 90) % 360) + 360) % 360;

function p3Shapes(data: ReplayData): AoeShape[] {
  const casts = data.enemyCasts ?? [];
  const geo = data.actionGeometry ?? {};
  const actorByKey = new Map(data.actors.map((a) => [a.key, a]));
  const players = data.actors.filter((a) => a.kind === "player");
  const out: AoeShape[] = [];
  for (const c of casts) {
    if (c[3] !== 0) continue;
    if (c[4] === INFERNO) {
      // On the two players nearest the fire sigil (once per cast pair).
      if (out.some((s) => s.name === c[2] && s.resolve === c[0])) continue;
      const a = actorByKey.get(c[1]);
      const s = a && nearestSample(a, c[0]);
      if (!s || Math.abs(s[0] - c[0]) > 300) continue;
      const near = players.map((p) => ({ p, at: poseAt(p, c[0]) })).filter((x) => x.at && x.at.hp !== 0)
        .sort((x, y) => Math.hypot(x.at!.x - s[1], x.at!.y - s[2]) - Math.hypot(y.at!.x - s[1], y.at!.y - s[2])).slice(0, 2);
      const range = (geo[INFERNO]?.range ?? 10) * 100;
      for (const n of near) {
        out.push({ ...blank, kind: "donut", x: n.at!.x, y: n.at!.y, range, inner: range / 3, estimated: true,
          style: "aoe", name: c[2], start: c[0] - 300, resolve: c[0], follow: n.p.key });
      }
    }
    if (c[4] === LATITUDINAL) {
      const chaos = actorByKey.get(c[1]);
      const p = chaos && poseAt(chaos, c[0]);
      if (!p) continue;
      const f = facingBearing(p.facing);
      const waves = [...new Set(casts.filter((w) => w[4] === IMPLOSION_SHOCKWAVE && w[3] === 0 && w[0] > c[0] && w[0] - c[0] < 5000).map((w) => w[0]))]
        .filter((t, i, all) => i === 0 || t - all[i - 1] > 1000).slice(0, 2);
      const range = (geo[IMPLOSION_SHOCKWAVE]?.range ?? 40) * 100;
      waves.forEach((t, i) => {
        for (const b of i === 0 ? [f + 90, f + 270] : [f, f + 180]) {
          out.push({ ...blank, kind: "cone", x: p.x, y: p.y, bearing: b % 360, angle: SHOCKWAVE_ANGLE, estimated: true, range,
            style: "aoe", name: "Shockwave", start: i === 0 ? c[0] - c[3] : waves[0], resolve: t });
        }
      });
    }
  }
  // Vacuum Wave: a knockback from Exdeath through its cast.
  for (const c of casts) {
    if (c[4] !== VACUUM_WAVE || c[3] <= 0) continue;
    const a = actorByKey.get(c[1]);
    const p = a && poseAt(a, c[0] + c[3]);
    if (p) out.push({ ...blank, kind: "circle", x: p.x, y: p.y, range: ARENA_R, style: "knockback", name: c[2], start: c[0], resolve: c[0] + c[3] });
  }
  return out;
}

function p3Effects(data: ReplayData): CasterEffect[] {
  const casts = data.enemyCasts ?? [];
  const actorByKey = new Map(data.actors.map((a) => [a.key, a]));
  const out: CasterEffect[] = [];
  // Sigils, from Bowels of Agony to their element's cast.
  for (const b of casts.filter((c) => c[4] === BOWELS && c[3] === 0)) {
    for (const [id, el] of Object.entries(SIGILS)) {
      const c = casts.find((x) => x[4] === Number(id) && x[3] === 0 && x[0] > b[0] && x[0] - b[0] < 90000
        && actorByKey.get(x[1]) && (() => {
          const s = nearestSample(actorByKey.get(x[1])!, x[0]);
          if (!s || Math.abs(s[0] - x[0]) > 300) return false;
          const r = Math.hypot(s[1] - CENTRE.x, s[2] - CENTRE.y);
          return Math.abs(r - SIGIL_R) < SIGIL_TOL && Math.abs(Math.abs(s[1] - CENTRE.x) - Math.abs(s[2] - CENTRE.y)) < SIGIL_TOL;
        })());
      if (!c) continue;
      const s = nearestSample(actorByKey.get(c[1])!, c[0])!;
      out.push({ kind: `dm-sigil-${el}`, label: "", x: s[1], y: s[2], start: b[0], end: c[0] + 500 });
    }
  }
  // Limit Cut clones: from their pulse to their dash, numbered.
  const markers = (data.headMarkers ?? []).filter((m) => LC_NUMBERS[m[2]]);
  for (const p of casts.filter((c) => c[4] === LC_PULSE && c[3] === 0)) {
    const a = actorByKey.get(p[1]);
    const s = a && nearestSample(a, p[0]);
    const dash = casts.find((c) => c[4] === LC_DASH && c[3] === 0 && c[1] === p[1] && c[0] > p[0] && c[0] - p[0] < 40000);
    if (!s || !dash || Math.abs(s[0] - p[0]) > 300) continue;
    // Its number: the marker on the player its dash hit.
    const hit = (data.enemyHits ?? []).find((h) => h[1] === LC_DASH && h[2] === p[1] && h[0] >= dash[0] && h[0] - dash[0] < 1500);
    const m = hit && markers.find((x) => x[1] === hit[3] && hit[0] - x[0] < 20000 && hit[0] > x[0]);
    out.push({ kind: "dm-lc-clone", label: m ? String(LC_NUMBERS[m[2]]) : "", x: s[1], y: s[2], start: p[0] - 300, end: dash[0] + 400 });
  }
  // Limit Cut numbers on the players, from the marker to their dash.
  for (const m of markers) {
    const hit = (data.enemyHits ?? []).find((h) => h[1] === LC_DASH && h[3] === m[1] && h[0] > m[0] && h[0] - m[0] < 20000);
    const p = actorByKey.get(m[1]);
    const at = p && poseAt(p, m[0]);
    if (!at) continue;
    out.push({ kind: "dm-lc-number", label: String(LC_NUMBERS[m[2]]), actor: m[1], x: at.x, y: at.y, start: m[0], end: hit?.[0] ?? m[0] + 15000 });
  }
  // Black holes: from their tether until it fires.
  for (const t of (data.tethers ?? []).filter((x) => x[3] === BLACK_HOLE_TETHER)) {
    const hole = actorByKey.get(t[1]);
    const hit = (data.enemyHits ?? []).find((h) => h[1] === NOTHINGNESS && h[3] === t[2] && h[0] > t[0] && h[0] - t[0] < 15000);
    const s = hole && nearestSample(hole, hit?.[0] ?? t[0]);
    if (!s) continue;
    out.push({ kind: "dm-black-hole", label: "", x: s[1], y: s[2], start: t[0], end: (hit?.[0] ?? t[0] + 8000) + 300 });
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
  effects: (data) => [...ringEffects(data), ...gazeEffects(data), ...endsEffects(data), ...p3Effects(data)],
  shapes: (data) => [
    ...trapShapes(data), ...wellShapes(data), ...arrowShapes(data), ...halfRoomShapes(data),
    ...forsakenShapes(data), ...trineShapes(data), ...wingShapes(data), ...aeroShapes(data), ...p3Shapes(data),
  ],
};
