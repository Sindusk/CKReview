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
// Each fight's replay spec (lib/replay/fight-spec.ts, one file per fight
// beside its detection modules) fixes what that gets wrong, per ability
// (`overrides`): an angle, the style (stack, tower with its soaker count,
// tank buster, knockback), a line through its caster, a cone pointing
// behind, an origin taken from another cast's target or from a
// Spell-in-Waiting's holder (playerAuras). Its head marker names, marker
// circles and tether meanings are read here too (buildHeadMarkers,
// buildTethers); only the specs whose abilities show up in the pull apply.

import { facingToCompassBearing } from "@/lib/mechanics/geometry";
import { poseAt, sampleNear, type ReplayActor, type ReplayData, type ReplayHit } from "@/lib/replay/ffxiv-replay";
import type { HeadMarkerDef, MarkerAoe, TetherKind } from "@/lib/replay/fight-spec";
import { fightReplaysFor, overridesFor } from "@/lib/replay/fights";

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
  // The built-in looks (ReplayPanel's AOE_COLORS and art); a fight can add
  // its own, with colours or art in its components/replay-art file.
  style: "aoe" | "tower" | "tankbuster" | "stack" | "knockback" | "lightning" | "drop" | "light" | "ice" | "puddle" | (string & {});
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
  lineStack?: boolean;           // rect: a line stack, its marker shown until it fires (marker 525)
  marked?: string[];             // line stack: the marked player, or the group it sits in the middle of
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
  const OVERRIDES = overridesFor(data);
  const specs = fightReplaysFor(data);
  const MARKER_AOES: Record<number, MarkerAoe> = Object.assign({}, ...specs.map((f) => f.markerAoes ?? {}));

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
        ? { ...base, kind: "rect", x: cp.x, y: cp.y, bearing, start: Math.min(base.start, lineStack[0]), style: "stack", lineStack: true, marked: lineStackTarget(lineStack[1], own, actorByKey) }
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
  // Shapes a fight builds itself, for what the overrides can't express.
  for (const f of specs) if (f.shapes) out.push(...f.shapes(data));
  return out.sort((a, b) => a.start - b.start);
}

/**
 * Where a line stack's marker sits. In game it's on a player (user,
 * 2026-10-17). FRU's log puts it on Shiva instead and nothing else names
 * the player (her facing stays north through the channel; the user
 * couldn't tell from VOD either), so then it rides on the centre of
 * everyone the beam hit rather than on a guessed player.
 */
function lineStackTarget(markedKey: string, hits: ReplayHit[], actorByKey: Map<string, ReplayActor>): string[] | undefined {
  if (actorByKey.get(markedKey)?.kind === "player") return [markedKey];
  return hits.length ? [...new Set(hits.map((h) => h[3]))] : undefined;
}

export type TetherSpan = {
  source: string; target: string; id: number; start: number; end: number;
  element?: string;   // drawn in its element (the fight spec's `tethers`)
};

const TETHER_MAX_MS = 15000;
const TETHER_GRACE_MS = 500;

/**
 * When each tether shows. The log marks only when a tether forms, so it
 * ends at its source's next cast on the tethered actor (Dancing Mad's
 * Graven Image tethers pay off with Pulse Wave), or at a known payoff
 * hitting the tethered player (a fight spec's `tethers`: ids with a known
 * meaning, their element and the abilities that resolve them on the
 * tethered player, cast by another actor so the source's own payoff cast
 * never comes), else at the source's next tether, else after 15s.
 */
export function buildTethers(data: ReplayData): TetherSpan[] {
  const casts = data.enemyCasts ?? [];
  const hits = data.enemyHits ?? [];
  const tethers = data.tethers ?? [];
  const TETHER_KINDS: Record<number, TetherKind> = Object.assign({}, ...fightReplaysFor(data).map((f) => f.tethers ?? {}));
  const passedAt = passedTethers(data, TETHER_KINDS);
  return tethers.map(([t, source, target, id], i) => {
    let end = t + TETHER_MAX_MS;
    const kind = TETHER_KINDS[id];
    if (kind?.passed) {
      const holder = playerEnd(data, source, target);
      const taken = passedAt.get(i);
      const hit = taken === undefined ? hits.find((h) => h[3] === holder && h[0] > t && h[0] < end && kind.payoff.includes(h[1])) : undefined;
      end = taken ?? (hit ? hit[0] + TETHER_GRACE_MS : end);
      return { source, target, id, start: t, end, element: kind.element };
    }
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

const playerEnd = (data: ReplayData, source: string, target: string) =>
  data.actors.find((a) => a.key === source)?.kind === "player" ? source : target;

/**
 * Passed tethers (TetherKind.passed): tether index -> when it was taken.
 * A new tether beyond the count takes the live one whose holder stood
 * nearest the new holder.
 */
function passedTethers(data: ReplayData, kinds: Record<number, TetherKind>): Map<number, number> {
  const out = new Map<number, number>();
  const actorByKey = new Map(data.actors.map((a) => [a.key, a]));
  const live = new Map<number, number[]>();   // tether id -> live indices
  (data.tethers ?? []).forEach(([t, source, target, id], i) => {
    const n = kinds[id]?.passed;
    if (!n) return;
    const list = (live.get(id) ?? []).filter((j) => t - data.tethers![j][0] <= TETHER_MAX_MS);
    if (list.length >= n) {
      const at = (j: number) => { const [, s, g] = data.tethers![j]; const a = actorByKey.get(playerEnd(data, s, g)); return a && poseAt(a, t); };
      // From the same enemy if one is live (TOP's Bladedance: one tether
      // per clone), else from any.
      const other = (j: number) => { const [, s, g] = data.tethers![j]; return playerEnd(data, s, g) === s ? g : s; };
      const mine = other(i);
      const same = list.some((j) => other(j) === mine);
      const me = at(i);
      let pick = 0, best = Infinity;
      list.forEach((j, k) => {
        if (same && other(j) !== mine) return;
        const p = at(j);
        const dd = me && p ? Math.hypot(p.x - me.x, p.y - me.y) : k;
        if (dd < best) { best = dd; pick = k; }
      });
      out.set(list[pick], t);
      list.splice(pick, 1);
    }
    list.push(i);
    live.set(id, list);
  });
  return out;
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

const HEAD_MARKER_LOOKAHEAD_MS = 12000;
// The game's standard line-stack marker, used in many fights (user,
// 2026-10-17). FRU puts it on Shiva herself 5.5s before Hallowed Ray's
// beam. A rect cast by the marked actor (or at it) becomes a line stack.
const LINE_STACK_MARKER = 525;

/**
 * When each head marker shows and what it reads: a known marker (the
 * fight spec's `headMarkers`) until the hit it announced, else "Marker
 * <id>" for `plainMs`. Marker ids are the game's icons and may mean
 * something else in another fight, so a label applies only when one of
 * its abilities then hits the marked player. Once one of a marker's hits
 * is seen in the pull, its other instances keep the label even when
 * theirs is missing (an invulnerable tank's Quadruple Slap, a dodged
 * Hallowed Ray target, a dead player).
 */
export function buildHeadMarkers(data: ReplayData, plainMs: number): HeadMarkerSpan[] {
  const hits = data.enemyHits ?? [];
  const casts = data.enemyCasts ?? [];
  const HEAD_MARKERS: Record<number, HeadMarkerDef> = Object.assign({}, ...fightReplaysFor(data).map((f) => f.headMarkers ?? {}));
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
