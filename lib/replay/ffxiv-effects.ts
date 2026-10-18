// lib/replay/ffxiv-effects.ts
//
// Boss visual cues the replay draws because the log names them only
// through a cast id: an effect around the caster that tells the players
// what is coming, the way the game shows it. Pure code; the SVG art is in
// components/ReplayEffects.tsx.
//
// Futures Rewritten P1, Cyclonic Break (fatebreaker.ts header): a fire or
// lightning dragon circles Fatebreaker counterclockwise during the cast and
// is gone when the cast bar ends, before the cones go out (user,
// 2026-10-17; the same for every dragon below). Fire = 40144
// (boss) / 40329 (image, second set): Sinsmoke pairs. Lightning = 40148 /
// 40330: Sinsmite spreads. Checked 2026-10-17: JZ1KXhDbqkNH3jxR fight 24
// (40144 then Sinsmoke 0:17.8; 40330 then Sinsmite 0:59.8) and
// M9Nagmnw2LzHZPVq fight 1 (40144; 40329 then Sinsmoke 0:59.9). The
// second set's cast comes from "Fatebreaker's image" with one position
// sample, and the header says it's often not logged at all, so the effect
// centres on the bait cones' origin (40145), and with no cast logged its
// element comes from the Sinsmoke / Sinsmite hits after the cones.
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
// The halos themselves (four "halo of flame", four "halo of levin") show
// as element rings at their Brightfire size from their begincast, 8s
// before they go off (HALO).

import { sampleNear, type ReplayData } from "@/lib/replay/ffxiv-replay";

export type CasterEffect = {
  kind:    "fire-dragon" | "lightning-dragon" | "fire-halo" | "lightning-halo";
  radius?: number;              // halos: the Brightfire it will cast (centi-yalms)
  label:   string;              // what it means, under the boss
  actor?:  string;              // follows this actor while it has samples
  x: number; y: number;         // else stays here (centi-yalms)
  start: number; end: number;   // ms from pull start
};

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
};
const CASTER_HOLD_MS = 20000;         // parked clones log one sample, often well before the cast

// Turn of the Heavens' halos: Brightfire casts, element from the actor's name.
const HALO_BRIGHTFIRE = [40152, 40153];

export function buildCasterEffects(data: ReplayData): CasterEffect[] {
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
    let kind: CasterEffect["kind"] | undefined =
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
  return out.sort((a, b) => a.start - b.start);
}
