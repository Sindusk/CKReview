// lib/replay/action-shapes.ts
//
// AoE shapes for the replay, from the game's own data instead of per-boss
// models. XIVAPI v2's Action sheet gives each ability's area:
//
//   CastType      shape: 1 single target (no area), 2/6/7 circle, 5 circle
//                 around the caster, 3/13 cone, 4/8/12 rectangle, 10 donut,
//                 11 cross
//   EffectRange   radius, or length for rectangles and cones (yalms)
//   XAxisModifier rectangle / cross width (yalms)
//   Omen.Path     the telegraph art; empty for rows still named "_rsv_..."
//
// Checked against the Dancing Mad detection headers (2026-10-17): Path of
// Light towers are r=4, Celestriad towers r=3, Limit Cut dashes and Black
// Hole tethers 6y-wide lines to their player, Flare Diffusion r=25 (the
// header's open question: non-tanks were hit 20-26y out).
//
// Two things the sheet doesn't give, estimated per pull and drawn DASHED:
// - Cone angle (lives in the Omen art, empty for new rows): the narrowest
//   standard angle that holds every player the cone hit. No hits: 90°.
// - Donut inner radius (same): the nearest player the donut hit, else a
//   third of the outer radius.
//
// Cone angles in the omen's art name ("gl_fan20_...") are read as given.
//
// Placement: a circle sits on its target player when the cast names one,
// else on the caster. Cones and rectangles start at the caster and point at
// the targeted player, else along the caster's facing. Circles of 30y or
// more are raidwides and aren't drawn.
//
// OVERRIDES fixes what that gets wrong, per ability: an angle, the style
// (stack, tower with its soaker count, tank buster, knockback), a line
// through its caster, a cone pointing behind, an origin taken from another
// cast's target or from a Spell-in-Waiting's holder (playerAuras). Futures
// Rewritten's entries (FRU_OVERRIDES) were checked on JZ1KXhDbqkNH3jxR
// fight 24; each says what it fixed. Head marker names live here too
// (buildHeadMarkers).

import { facingToCompassBearing } from "@/lib/mechanics/geometry";
import { poseAt, sampleNear, type ReplayActor, type ReplayData } from "@/lib/replay/ffxiv-replay";

export type ActionGeometry = { castType: number; range: number; width: number; omen: string };

/** Fetches the Action rows for `ids` from XIVAPI v2. */
export async function fetchActionGeometry(ids: number[]): Promise<Record<number, ActionGeometry>> {
  const unique = [...new Set(ids)].filter((id) => id > 0);
  const rows = await xivRows<{ CastType: number; EffectRange: number; XAxisModifier: number; Omen?: { fields?: { Path?: string } } }>(
    "Action", unique, "CastType,EffectRange,XAxisModifier,Omen.Path");
  const out: Record<number, ActionGeometry> = {};
  for (const [id, f] of Object.entries(rows)) {
    out[Number(id)] = { castType: f.CastType, range: f.EffectRange, width: f.XAxisModifier, omen: f.Omen?.fields?.Path ?? "" };
  }
  return out;
}

/** Ability ids worth looking up: every enemy cast that resolves. */
export function replayActionIds(data: ReplayData): number[] {
  return (data.enemyCasts ?? []).filter((c) => c[3] === 0 && c[4] !== undefined).map((c) => c[4]!);
}

const PLAYER_HITBOX = 50; // centi-yalms: every player's hitbox is 0.5y

/**
 * Hitbox radius per BNpcBase id, in centi-yalms. The game sizes a monster's
 * hitbox as its skeleton's Radius times the BNpc's Scale (ModelChara type
 * 3); other model types get 0.5y times Scale. Checked on Dancing Mad
 * 2T1HzdPKgbhM43am fight 10: Kefka P1 2.7y, Exdeath 3.8y, and melee players'
 * median distance from each sits at hitbox + 3y, the edge of melee range.
 */
export async function fetchHitboxes(gameIds: number[]): Promise<Record<number, number>> {
  const unique = [...new Set(gameIds)].filter((id) => id > 0 && id < 1000000);
  if (unique.length === 0) return {};
  const base = await xivRows<{ Scale: number; ModelChara?: { fields?: { Model: number; Type: number } } }>(
    "BNpcBase", unique, "Scale,ModelChara.Model,ModelChara.Type");
  const models = [...new Set(Object.values(base).filter((b) => b.ModelChara?.fields?.Type === 3).map((b) => b.ModelChara!.fields!.Model))];
  const skel = models.length ? await xivRows<{ Radius: number }>("ModelSkeleton", models, "Radius") : {};
  const out: Record<number, number> = {};
  for (const [id, b] of Object.entries(base)) {
    const m = b.ModelChara?.fields;
    const radius = m?.Type === 3 && skel[m.Model] ? skel[m.Model].Radius : 0.5;
    out[Number(id)] = Math.round(radius * (b.Scale || 1) * 100);
  }
  return out;
}

async function xivRows<T>(sheet: string, ids: number[], fields: string): Promise<Record<number, T>> {
  const out: Record<number, T> = {};
  for (let i = 0; i < ids.length; i += 100) {
    const res = await fetch(`https://v2.xivapi.com/api/sheet/${sheet}?rows=${ids.slice(i, i + 100).join(",")}&fields=${fields}`);
    if (!res.ok) throw new Error(`XIVAPI ${sheet} lookup failed (${res.status})`);
    const json = await res.json() as { rows: { row_id: number; fields: T }[] };
    for (const r of json.rows) out[r.row_id] = r.fields;
  }
  return out;
}

/**
 * Adds the game data the replay draws from (AoE geometry, hitboxes) to
 * freshly fetched tracks. A failed lookup leaves the replay usable: dots
 * and casts still draw, just without shapes or hitbox rings.
 */
export async function enrichReplayData(data: ReplayData): Promise<ReplayData> {
  const [actionGeometry, hitboxes] = await Promise.all([
    fetchActionGeometry(replayActionIds(data)).catch(() => ({} as Record<number, ActionGeometry>)),
    fetchHitboxes(data.actors.filter((a) => a.kind === "enemy" && a.gameId).map((a) => a.gameId!)).catch(() => ({} as Record<number, number>)),
  ]);
  return {
    ...data,
    actionGeometry,
    actors: data.actors.map((a) => ({
      ...a,
      hitbox: a.kind === "player" ? PLAYER_HITBOX : a.gameId !== undefined ? hitboxes[a.gameId] : undefined,
    })),
  };
}

export type AoeShape = {
  kind:   "circle" | "cone" | "rect" | "donut" | "cross";
  x: number; y: number;          // origin, centi-yalms
  bearing: number;               // compass degrees (cones, rects, crosses)
  range: number;                 // centi-yalms
  width: number;                 // rect / cross width, centi-yalms
  angle: number;                 // cone full angle, degrees
  inner: number;                 // donut inner radius, centi-yalms
  estimated: boolean;            // angle or inner radius guessed (not drawn differently)
  style: "aoe" | "tower" | "tankbuster" | "stack" | "knockback" | "lightning" | "drop" | "light" | "ice" | "puddle";
  soakers?: number;              // towers: players it needs, when the ability says
  name: string;
  start: number; resolve: number; // ms from pull start: telegraph start, resolution
  // WoW: the shape rides on this actor (an aura around a debuffed player)
  // instead of staying at x/y.
  follow?: string;
  // Gone at `resolve` with no flash: a marker's circle riding on its
  // player, whose drop is drawn by its own cast (FRU Frigid Stone).
  noFlash?: boolean;
  star?: boolean;                // cross: star points while telegraphed (FRU Frigid Needle)
  lineStack?: boolean;           // rect: a line stack, chevrons until it fires (marker 525)
};

/**
 * Per-ability corrections the game data can't give, each from a log or the
 * user's VOD review. Keyed by ability id.
 */
type Override = {
  angle?:   number;
  style?:   AoeShape["style"];
  hidden?:  boolean;
  soakers?: number;          // towers: the number drawn in the middle
  twoWay?:  boolean;         // a line through its caster, not from it
  flip?:    boolean;         // a cone pointing behind the caster
  // The caster is a parked helper with no sample near the cast: use its
  // last one within HOLD_CASTER_MS.
  holdCaster?: boolean;
  aim?:     "hits";          // a cone aimed at the players it hit, not the caster's facing
  // Starts at the target of the latest cast of this ability within 1.5s
  // (the caster's own position is stale).
  originAt?: number;
  // Centred on the player whose status (FFLogs id) ended at the cast:
  // a Spell-in-Waiting resolving on its holder. Needs playerAuras.
  holder?:  number;
  // A repeat of the same caster's earlier baited cast `of`: it fires from
  // the bait's origin, alternating between the bait's lane (1st, 3rd
  // repeat) and the lane turned by `gap` degrees (2nd). The caster's logged
  // facing follows the players instead.
  repeats?: { of: number; gap: number };
  // A ground telegraph shown for its whole cast bar, not just as it lands:
  // a fixed spot the players read ahead of time.
  telegraph?: boolean;
  star?:    boolean;         // a cross telegraphed as star points until it fires
  // Starts where the caster of the latest of these abilities (within 8s)
  // stood: the boss these cones really come from, not the helper casting.
  originCaster?: number[];
  // Leaves a puddle where it landed for this long (ms).
  puddleMs?: number;
};

// Futures Rewritten (lib/mechanics/ffxiv/fru/*.ts headers; ids and
// placements checked on JZ1KXhDbqkNH3jxR fight 24, 2026-10-17).
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
const FRU_OVERRIDES: Record<number, Override> = {
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
  // Tank busters.
  40290: { style: "tankbuster" },                   // Black Halo
  40182: { style: "tankbuster" },                   // Darkest Dance jump
  40284: { style: "tankbuster" }, 40285: { style: "tankbuster" },  // Somber Dance
};

const OVERRIDES: Record<number, Override> = {
  ...FRU_OVERRIDES,
  // Dancing Mad Revolting Ruin III, both hits: a 90° tankbuster cone (user,
  // VOD review 2026-10-17). The game data has the cone but not its angle.
  50179: { angle: 90, style: "tankbuster" },
  50401: { angle: 90, style: "tankbuster" },
  // Dancing Mad Blizzard III Blowout 47771 damages nobody: in Mystery Magic
  // II, players stood 16° inside its facing untouched (2T1HzdPKgbhM43am
  // fight 10, 0:54) while 47774, cast with it, hit a player 36° off its
  // facing (yBKPqGwHparm7Tk4 fight 3, 0:55). Drawing it covered the safe
  // quadrant.
  47771: { hidden: true },
  // Towers whose rows carry no omen to say so.
  47806: { style: "tower" },   // The Path of Light (Forsaken)
  47939: { style: "tower" }, 47940: { style: "tower" }, 47941: { style: "tower" },  // Celestriad
};

const RAIDWIDE_RANGE = 30;
const FLASH_BEFORE_MS = 300;     // an AoE fades in this long before its cast lands
const HIT_WINDOW_MS = 1500;      // a cast's hits land within this of it
const STANDARD_ANGLES = [30, 45, 60, 90, 120, 150, 180, 270];
const HOLD_CASTER_MS = 20000;
const HOLDER_WINDOW_MS = 1200;   // a Spell-in-Waiting ends within this of its cast

/** A cone omen's angle from its art name ("gl_fan20_1bwf_v" = 20°), else undefined. */
function omenAngle(omen: string): number | undefined {
  const m = omen.match(/fan(\d{2,3})/i);
  const a = m ? Number(m[1]) : NaN;
  return a > 0 && a <= 360 ? a : undefined;
}

const bearingTo = (ax: number, ay: number, bx: number, by: number) =>
  ((Math.atan2(bx - ax, -(by - ay)) * 180) / Math.PI + 360) % 360;
const angDiff = (a: number, b: number) => Math.abs(((a - b) % 360 + 540) % 360 - 180);

/** Every drawable AoE of the pull, sorted by telegraph start. */
export function buildAoeShapes(data: ReplayData): AoeShape[] {
  const geo = data.actionGeometry ?? {};
  const casts = data.enemyCasts ?? [];
  const hits = data.enemyHits ?? [];
  const actorByKey = new Map(data.actors.map((a) => [a.key, a]));
  const auras = data.playerAuras ?? [];
  const usedHolder = new Set<(typeof auras)[number]>();
  const out: AoeShape[] = [];

  for (let i = 0; i < casts.length; i++) {
    const [t, key, name, dur, id, targetKey] = casts[i];
    if (dur !== 0 || id === undefined) continue;
    const g = geo[id];
    const over = OVERRIDES[id] ?? {};
    if (!g || over.hidden || g.castType === 1 || g.range <= 0) continue;
    const isCircle = g.castType === 2 || g.castType === 5 || g.castType === 6 || g.castType === 7;
    if (isCircle && g.range >= RAIDWIDE_RANGE) continue;
    const style: AoeShape["style"] = over.style ?? (/trap/i.test(g.omen) ? "tower" : "aoe");

    // This cast's hits: who it landed on, and (from the hit) where its
    // caster stood, for helpers with no position sample near the cast.
    const own = hits.filter((h) => h[1] === id && h[2] === key && h[0] >= t - 200 && h[0] - t <= HIT_WINDOW_MS && h[6] !== null);

    const caster = actorByKey.get(key);
    let casterPose: { x: number; y: number; facing: number } | undefined = caster && sampleNear(caster, t, 1500);
    if (!casterPose && over.holdCaster && caster) casterPose = sampleNear(caster, t, HOLD_CASTER_MS);
    if (!casterPose && own[0]?.[4] != null) casterPose = { x: own[0][4]!, y: own[0][5]!, facing: 0 };
    if (over.originCaster) {
      // Several sources at once (Shiva and a mirror in Mirror, Mirror): the
      // one nearest the targeted player, among those that just fired.
      const tp = targetKey ? actorByKey.get(targetKey) : undefined;
      const tpos = tp && poseAt(tp, t);
      const recent: { x: number; y: number; facing: number }[] = [];
      for (let j = i; j >= 0 && t - casts[j][0] <= 8000; j--) {
        const c = casts[j];
        const who = c[3] === 0 && c[4] !== undefined && over.originCaster.includes(c[4]) ? actorByKey.get(c[1]) : undefined;
        const p = who && sampleNear(who, c[0], 4000);
        if (!p) continue;
        if (recent.length && casts[j][0] < t - 1500) break;   // the latest burst only
        recent.push({ x: p.x, y: p.y, facing: p.facing });
      }
      const pick = tpos && recent.length > 1
        ? recent.reduce((b, p) => (Math.hypot(p.x - tpos.x, p.y - tpos.y) < Math.hypot(b.x - tpos.x, b.y - tpos.y) ? p : b))
        : recent[0];
      if (pick) casterPose = pick;
    }
    if (over.originAt !== undefined) {
      for (let j = i; j >= 0 && t - casts[j][0] <= 1500; j--) {
        const c = casts[j];
        const who = c[4] === over.originAt && c[3] === 0 && c[5] ? actorByKey.get(c[5]) : undefined;
        const p = who && poseAt(who, t);
        if (p) { casterPose = { x: p.x, y: p.y, facing: casterPose?.facing ?? 0 }; break; }
      }
    }
    const target = targetKey ? actorByKey.get(targetKey) : undefined;
    let targetPose = target && target.kind === "player" ? poseAt(target, t) : undefined;
    // A Spell-in-Waiting lands on the player whose status just ended.
    if (over.holder !== undefined && !targetPose) {
      const ended = auras.filter((a) => a[3] === over.holder && Math.abs(a[1] - t) <= HOLDER_WINDOW_MS && !usedHolder.has(a));
      const pick = ended.find((a) => own.some((h) => h[3] === a[2])) ?? ended[0];
      const holder = pick && actorByKey.get(pick[2]);
      const p = holder && poseAt(holder, t);
      if (p) { usedHolder.add(pick); targetPose = p; casterPose = { x: p.x, y: p.y, facing: 0 }; }
    }
    // A repeat fires from its bait's origin along a lane worked out from it.
    let repeatBearing: number | undefined;
    if (over.repeats) {
      let k = 1;
      for (let j = i - 1; j >= 0 && t - casts[j][0] <= 12000; j--) {
        const c = casts[j];
        if (c[1] !== key || c[3] !== 0) continue;
        if (c[4] === id) { k++; continue; }
        if (c[4] !== over.repeats.of) continue;
        const from = caster && sampleNear(caster, c[0], 1500);
        const bait = c[5] ? actorByKey.get(c[5]) : undefined;
        const bp = bait && poseAt(bait, c[0]);
        if (from && bp) {
          casterPose = from;
          repeatBearing = (bearingTo(from.x, from.y, bp.x, bp.y) + (k % 2 === 0 ? over.repeats.gap : 0)) % 360;
        }
        break;
      }
    }
    if (!casterPose && !(isCircle && targetPose)) continue;

    // AoEs flash on the cast that lands them, not across the castbar: a
    // shape fixed at castbar start points where the target WAS (Revolting
    // Ruin sat at the top of the arena while the tank walked into place;
    // user, 2026-10-17). Towers are objects on the floor, so they show
    // from their begincast.
    let start = t - FLASH_BEFORE_MS;
    if (style === "tower") {
      for (let j = i - 1; j >= 0 && t - casts[j][0] < 15000; j--) {
        const b = casts[j];
        if (b[1] === key && b[3] > 0 && Math.abs(b[0] + b[3] - t) < 800) { start = b[0]; break; }
      }
    } else if (over.telegraph) {
      // From its begincast: the same ability's cast bar ending now, by any
      // caster (Icicle Impact begins on one helper and lands from another).
      for (let j = i - 1; j >= 0 && t - casts[j][0] < 15000; j--) {
        const b = casts[j];
        if (b[4] === id && b[3] > 0 && Math.abs(b[0] + b[3] - t) < 800) { start = b[0]; break; }
      }
    }

    const base = { name, start, resolve: t, width: g.width * 100, range: g.range * 100, angle: 0, inner: 0, estimated: false, style, soakers: over.soakers };
    if (isCircle) {
      let o: { x: number; y: number } = targetPose ?? casterPose!;
      // A stack or knockback cast by a helper parked elsewhere (Flagrant
      // Fire III and Double-Trouble Trap come from (100, 90)) lands on the
      // players it hit, not on the helper: centre it on them.
      if (!targetPose && own.length) {
        const mx = own.reduce((s, h) => s + h[6]!, 0) / own.length;
        const my = own.reduce((s, h) => s + h[7]!, 0) / own.length;
        // A stack is always on a player (user, 2026-10-17: a Cyclonic
        // Break Sinsmoke pair standing within 6y of the middle drew it on
        // Fatebreaker): its first player hit, the one it was placed on.
        if (style === "stack") o = { x: own[0][6]!, y: own[0][7]! };
        else if (Math.hypot(mx - o.x, my - o.y) > base.range) o = { x: mx, y: my };
      }
      // A stack with no target and nobody hit has no player to sit on.
      if (style === "stack" && !targetPose && !own.length) continue;
      // CastType 5 grows with the caster's hitbox; the hitbox is unknown
      // for helpers, so it's drawn at the listed range.
      out.push({ ...base, kind: "circle", x: o.x, y: o.y, bearing: 0 });
      if (over.puddleMs) {
        out.push({ ...base, kind: "circle", x: o.x, y: o.y, bearing: 0, style: "puddle", name: `${name} puddle`,
          start: t, resolve: t + over.puddleMs, noFlash: true });
      }
      continue;
    }
    const cp = casterPose!;
    // Aimed at the players hit: their centre, leaving out anyone standing
    // on the origin (Sinblaze's carrier).
    // A line stack (the game's standard marker 525 on the caster or its
    // target within the last 12s) is aimed at the party it hit, shown from
    // the marker, and drawn as a stack.
    const lineStack = !isCircle && g.castType !== 3 && g.castType !== 13 && g.castType !== 10 && g.castType !== 11
      ? (data.headMarkers ?? []).find((m) => m[2] === LINE_STACK_MARKER && (m[1] === key || m[1] === targetKey) && t - m[0] > 0 && t - m[0] <= 12000)
      : undefined;
    const aimed = over.aim === "hits" || lineStack ? own.filter((h) => Math.hypot(h[6]! - cp.x, h[7]! - cp.y) > 100) : [];
    let bearing = targetPose && over.holder === undefined ? bearingTo(cp.x, cp.y, targetPose.x, targetPose.y)
      : aimed.length ? bearingTo(cp.x, cp.y, aimed.reduce((s, h) => s + h[6]!, 0) / aimed.length, aimed.reduce((s, h) => s + h[7]!, 0) / aimed.length)
      : own.length && !caster?.samples.length ? bearingTo(cp.x, cp.y, own[0][6]!, own[0][7]!)
      : facingToCompassBearing(cp.facing);
    if (repeatBearing !== undefined) bearing = repeatBearing;
    if (over.flip) bearing = (bearing + 180) % 360;
    if (g.castType === 3 || g.castType === 13) {
      // Angle: the override, else the omen art's, else the narrowest
      // standard one holding every player it hit, else 90°.
      let widest = 0;
      for (const h of own) widest = Math.max(widest, angDiff(bearingTo(cp.x, cp.y, h[6]!, h[7]!), bearing) * 2);
      const known = over.angle ?? omenAngle(g.omen);
      const angle = known ?? (own.length ? STANDARD_ANGLES.find((a) => a >= widest - 3) ?? 360 : 90);
      out.push({ ...base, kind: "cone", x: cp.x, y: cp.y, bearing, angle, estimated: known === undefined });
    } else if (g.castType === 10) {
      let nearest = Infinity;
      for (const h of own) nearest = Math.min(nearest, Math.hypot(h[6]! - cp.x, h[7]! - cp.y));
      const inner = Number.isFinite(nearest) ? Math.max(100, nearest - 50) : base.range / 3;
      out.push({ ...base, kind: "donut", x: cp.x, y: cp.y, bearing: 0, inner, estimated: true });
    } else if (g.castType === 11) {
      out.push({ ...base, kind: "cross", x: cp.x, y: cp.y, bearing, star: over.star });
    } else if (over.twoWay) {
      // Start a range behind the caster and run twice its length.
      const b = (bearing * Math.PI) / 180;
      out.push({ ...base, kind: "rect", x: cp.x - Math.sin(b) * base.range, y: cp.y + Math.cos(b) * base.range, bearing, range: base.range * 2 });
    } else {
      out.push(lineStack
        ? { ...base, kind: "rect", x: cp.x, y: cp.y, bearing, start: Math.min(base.start, lineStack[0]), style: "stack", lineStack: true }
        : { ...base, kind: "rect", x: cp.x, y: cp.y, bearing });
    }
  }
  // A head marker that puts an AoE on its player: the circle rides on them
  // from the marker until it drops.
  for (const [mt, target, markerId] of data.headMarkers ?? []) {
    const m = MARKER_AOES[markerId];
    const g = m && geo[m.ability];
    if (!m || !g || g.range <= 0) continue;
    const drop = casts.find((c) => c[4] === m.ability && c[3] === 0 && c[0] > mt && c[0] - mt <= 12000);
    if (!drop || !actorByKey.get(target)) continue;
    out.push({
      kind: "circle", x: 0, y: 0, bearing: 0, range: g.range * 100, width: 0, angle: 0, inner: 0, estimated: false,
      // A drop to place, not a hit being taken (user, 2026-10-17).
      style: "drop", name: m.name, start: mt, resolve: drop[0], follow: target, noFlash: true,
    });
  }
  return out.sort((a, b) => a.start - b.start);
}

/**
 * Head markers that put a circle on their player until it drops (the
 * drop itself is the ability's own cast, drawn where it lands). FRU P2
 * Diamond Dust: 345 on the four Frigid Stone players 8s before their
 * 5y stones 40199 drop at their feet (user, 2026-10-17; M9Nagmnw2LzHZPVq 1
 * marker 3:21.1, stones 3:29.2; JZ1KXhDbqkNH3jxR 24 3:18.8 / 3:26.9).
 */
const MARKER_AOES: Record<number, { ability: number; name: string }> = {
  345: { ability: 40199, name: "Frigid Stone" },
};

export type TetherSpan = {
  source: string; target: string; id: number; start: number; end: number;
  element?: "fire" | "lightning";   // drawn in its element (TETHER_KINDS)
};

const TETHER_MAX_MS = 15000;
const TETHER_GRACE_MS = 500;

/**
 * Tether ids with a known meaning: their element, and the abilities that
 * resolve them on the tethered player (cast by another actor, so the
 * source's own payoff cast never comes). FRU P1, checked on
 * JZ1KXhDbqkNH3jxR 24 and M9Nagmnw2LzHZPVq 1 (user, 2026-10-17: Fall of
 * Faith's tethers are fire or lightning): 249 fire, paid off by Sinblaze
 * 40156 (Fall of Faith) or Sinsmoke 40167 (Utopian Sky's tether stacks);
 * 287 lightning, by Sinsmite 40142.
 */
const TETHER_KINDS: Record<number, { element: "fire" | "lightning"; payoff: number[] }> = {
  249: { element: "fire", payoff: [40156, 40167] },
  287: { element: "lightning", payoff: [40142] },
};

/**
 * When each tether shows. The log marks only when a tether forms, so it
 * ends at its source's next cast on the tethered actor (Dancing Mad's
 * Graven Image tethers pay off with Pulse Wave), or at a known payoff
 * hitting the tethered player (TETHER_KINDS), else at the source's next
 * tether, else after 15s.
 */
export function buildTethers(data: ReplayData): TetherSpan[] {
  const casts = data.enemyCasts ?? [];
  const hits = data.enemyHits ?? [];
  const tethers = data.tethers ?? [];
  return tethers.map(([t, source, target, id]) => {
    let end = t + TETHER_MAX_MS;
    const kind = TETHER_KINDS[id];
    if (kind) {
      // Only its own payoff ends it: the boss's other casts on the player
      // (Fall of Faith's first tether) and the clones' are unrelated.
      const hit = hits.find((h) => h[3] === target && h[0] > t && h[0] < end && kind.payoff.includes(h[1]));
      if (hit) end = hit[0] + TETHER_GRACE_MS;
      return { source, target, id, start: t, end, element: kind.element };
    }
    const next = tethers.find((o) => o[1] === source && o[0] > t);
    if (next) end = Math.min(end, next[0]);
    const payoff = casts.find((c) => c[1] === source && c[0] > t && c[3] === 0 && c[5] === target);
    if (payoff) end = Math.min(end, payoff[0] + TETHER_GRACE_MS);
    return { source, target, id, start: t, end };
  });
}

/**
 * Where a tether's end sits at `t`. A sparse actor (a parked clone) is
 * placed by its sample nearest `t` within the tether's own span: FRU's
 * clones hold the Utopian Sky tethers from the south, move to the north
 * wall for Fall of Faith, and log nothing between, so plain
 * interpolation kept them in the south for the whole tether.
 */
export function tetherEndAt(actor: ReplayActor, span: TetherSpan, t: number, lookupMs: number): { x: number; y: number } | undefined {
  if (actor.kind === "enemy") {
    let best: (typeof actor.samples)[number] | undefined;
    for (const s of actor.samples) {
      if (s[0] < span.start - 500 || s[0] > span.end + 3000) continue;
      if (!best || Math.abs(s[0] - t) < Math.abs(best[0] - t)) best = s;
    }
    if (best) return { x: best[1], y: best[2] };
  }
  return poseAt(actor, t) ?? sampleNear(actor, t, lookupMs);
}

export type HeadMarkerSpan = { target: string; id: number; start: number; end: number; label: string };

/**
 * Head marker ids and the abilities they announce. Marker ids are the
 * game's icons and may mean something else in another fight, so a label
 * applies only when one of its abilities then hits the marked player.
 * FRU, from the module headers and JZ1KXhDbqkNH3jxR fight 24 (marker ->
 * hit): 218 0:20 -> Powder Mark Trail 0:24, 2:49 -> Quadruple Slap 2:54;
 * 345 -> Frigid Stone 8s later; 259 8:39 -> Black Halo 8:44; 184 ~5s
 * before each Refrain Water; 139 on all eight 5s before Apocalypse's
 * Eruptions; 525 on Shiva herself, 6s before her Hallowed Ray. 62 (six
 * players at 8:56) is unplaced.
 */
const HEAD_MARKERS: Record<number, { label: string; abilities: number[] }> = {
  218: { label: "Tank buster", abilities: [40168, 40191] },
  345: { label: "Frigid Stone", abilities: [40199] },
  525: { label: "Line stack", abilities: [40211] },
  375: { label: "Luminous Hammer", abilities: [40218] },
  259: { label: "Black Halo", abilities: [40290] },
  184: { label: "Dark Water III", abilities: [40271] },
  139: { label: "Dark Eruption", abilities: [40274] },
};
const HEAD_MARKER_LOOKAHEAD_MS = 12000;
// The game's standard line-stack marker, used in many fights (user,
// 2026-10-17). FRU puts it on Shiva herself 5.5s before Hallowed Ray's
// beam. A rect cast by the marked actor (or at it) becomes a line stack.
const LINE_STACK_MARKER = 525;

/**
 * When each head marker shows and what it reads: a known marker until the
 * hit it announced, else "Marker <id>" for `plainMs`. Once one of a
 * marker's hits is seen in the pull, its other instances keep the label
 * even when theirs is missing (an invulnerable tank's Quadruple Slap, a
 * dodged Hallowed Ray target, a dead player).
 */
export function buildHeadMarkers(data: ReplayData, plainMs: number): HeadMarkerSpan[] {
  const hits = data.enemyHits ?? [];
  const casts = data.enemyCasts ?? [];
  const soon = (at: number, t: number) => at > t && at - t <= HEAD_MARKER_LOOKAHEAD_MS;
  const spans = (data.headMarkers ?? []).map(([t, target, id]) => {
    const known = HEAD_MARKERS[id];
    // The marked player takes the hit, or (Hallowed Ray's 525 sits on
    // Shiva herself) the marked enemy casts it.
    const at = known && (hits.find((h) => h[3] === target && soon(h[0], t) && known.abilities.includes(h[1]))?.[0]
      ?? casts.find((c) => c[1] === target && c[3] === 0 && soon(c[0], t) && known.abilities.includes(c[4] ?? 0))?.[0]);
    return { target, id, start: t, end: at ?? t + plainMs, matched: at !== undefined };
  });
  const confirmed = new Set(spans.filter((s) => s.matched).map((s) => s.id));
  return spans.map(({ target, id, start, end }) => ({ target, id, start, end, label: confirmed.has(id) ? HEAD_MARKERS[id].label : `Marker ${id}` }));
}

const AFTER_MS = 800;             // and fades out over this after it

/** Shapes showing at `t`, with opacity: telegraph ramps up, flash fades out. */
export function aoesAt(shapes: AoeShape[], t: number): { s: AoeShape; opacity: number; resolving: boolean }[] {
  const out: { s: AoeShape; opacity: number; resolving: boolean }[] = [];
  for (const s of shapes) {
    if (s.start > t) break;
    if (t > s.resolve + AFTER_MS || (s.noFlash && t >= s.resolve)) continue;
    if (t >= s.resolve) out.push({ s, opacity: 1 - (t - s.resolve) / AFTER_MS, resolving: true });
    else out.push({ s, opacity: 0.45 + 0.4 * ((t - s.start) / Math.max(1, s.resolve - s.start)), resolving: false });
  }
  return out;
}
