// lib/mechanics/wow/va/ulatek-replay.ts
//
// Ula'tek's replay spec (lib/replay/fight-spec.ts). Art in
// components/replay-art/va.tsx ("va-ulatek-..."). Built from the kill
// A49h3gvBnRYHZQNX fight 48 (9:50); review in docs/replay-reviews/va.md.
// Nothing here is VOD-checked yet.
//
// From the kill:
//   - Spectral Coils: each impact is a "Spectral Coil" actor whose one
//     sample is the impact spot, casting 1299010 (4s) there. The journal's
//     10y zone is drawn there for the cast.
//   - Caustic Waves (stage 1): each wave is cast (1298570, ~2.4s) by its own
//     "Gore Rattle" instance, placed and faced by that cast's sample, at the
//     arena's edge (e.g. 0:38 from x 55 facing west, from x 40 facing
//     WSW). The waves' width, length and speed aren't logged: a lane along
//     the caster's facing, WAVE_WIDTH wide and WAVE_LENGTH long, is drawn for
//     the cast. The 1292403 "hits" are the stacking DoT (1/s on one
//     player), not the wave's path, so they can't place it.
//   - Serpent's Bite (stage 3): 3 targets (hit 1295838; the 1288879 debuff
//     isn't in the fetch). Helpers within 7y clear it; the helpers then
//     carry Volatile Purge (1312967, 5s) and explode within 7y.
// Not drawn: Circling Prey's doomed platform (its centre isn't logged),
// Ula'tek's and the purges' own Caustic Waves, Grasping Fangs tethers
// (rings on the tethered players instead), Toxic Incubation's shots.

import type { AoeShape } from "@/lib/replay/action-shapes";
import type { CasterEffect, FightReplay } from "@/lib/replay/fight-spec";
import { facingToCompassBearing } from "@/lib/mechanics/geometry";
import type { ReplayData } from "@/lib/replay/ffxiv-replay";
import { actorMap, wowAuraSpans, wowCasts, wowCastTargetRings, wowShape } from "@/lib/replay/wow-helpers";

const COIL = 1299010;              // a Spectral Coil impact, 4s cast by its own actor
const COIL_HIT = 1287265;
const WAVE = 1298570;              // stage-1 Caustic Waves from a Gore Rattle instance
const WAVE_WIDTH = 1000, WAVE_LENGTH = 9000;   // assumed
const BITE_HIT = 1295838;          // Serpent's Bite lands on its 3 targets
const BITE_MS = 15000;
const PURGE = 1312967;             // Volatile Purge on a helper, 5s, then a 7y explosion
const SHELL = 1307612;             // carrying an egg (Noxious Shell)
const DOOM_SHELL = 1300312;        // carrying a Doomscale Egg to its cauldron
const FANGS = 1311611;             // Grasping Fangs tether
const MOTHERS_WRATH = 1298367;

/** Spectral Coils: the 10y impact zone at each Coil's spot for its 4s cast. */
function coils(data: ReplayData): AoeShape[] {
  const actors = actorMap(data);
  return wowCasts(data, [COIL]).flatMap((c) => {
    const s = actors.get(c.caster)?.samples[0];
    return s ? [wowShape({ kind: "circle", x: s[1], y: s[2], range: 1000, name: "Spectral Coils", start: c.begin ?? c.t - 4000,
      resolve: c.t, style: "va-ulatek-coil" })] : [];
  });
}

/** Stage-1 Caustic Waves: a lane along each caster's facing for its cast (see the header). */
function waves(data: ReplayData): AoeShape[] {
  const actors = actorMap(data);
  return wowCasts(data, [WAVE]).flatMap((c) => {
    const a = actors.get(c.caster);
    const s = a?.samples.find((x) => Math.abs(x[0] - c.t) < 3000) ?? a?.samples[0];
    if (!s) return [];
    return [wowShape({ kind: "rect", x: s[1], y: s[2], bearing: facingToCompassBearing(s[3]), range: WAVE_LENGTH, width: WAVE_WIDTH,
      name: "Caustic Waves", start: c.begin ?? c.t - 2400, resolve: c.t, style: "va-ulatek-wave" })];
  });
}

/** Serpent's Bite: the 7y helper circle on each target from the bite until its helpers' Purge (or 15s). */
function bite(data: ReplayData): AoeShape[] {
  const purges = wowAuraSpans(data, [PURGE]).map((s) => s.start);
  return (data.enemyHits ?? []).filter((h) => h[1] === BITE_HIT).map((h) => {
    const cleared = purges.find((t) => t > h[0] && t - h[0] <= BITE_MS + 1000);
    return wowShape({ kind: "circle", x: 0, y: 0, range: 700, name: "Serpent's Bite", start: h[0], resolve: cleared ?? h[0] + BITE_MS,
      follow: h[3], style: "stack" });
  });
}

/** Volatile Purge: the 7y blast circle on each helper for its 5s. */
function purge(data: ReplayData): AoeShape[] {
  return wowAuraSpans(data, [PURGE]).map((s) =>
    wowShape({ kind: "circle", x: 0, y: 0, range: 700, name: "Volatile Purge", start: s.start, resolve: s.end, follow: s.target, style: "va-ulatek-purge" }));
}

/** Egg carriers (Noxious Shell, Doomscale Shell) and Grasping Fangs' tethered players. */
function carriers(data: ReplayData): CasterEffect[] {
  return wowAuraSpans(data, [SHELL, DOOM_SHELL, FANGS]).map((s) => ({
    kind: s.id === FANGS ? "va-ulatek-fangs" : s.id === DOOM_SHELL ? "va-ulatek-doomegg" : "va-ulatek-egg",
    label: s.id === FANGS ? "Grasping Fangs" : s.id === DOOM_SHELL ? "Doomscale Shell" : "Noxious Shell",
    actor: s.target, x: 0, y: 0, start: s.start, end: s.end,
  }));
}

export const ULATEK_REPLAY: FightReplay = {
  key: "va-ulatek",
  game: "wow",
  name: "Ula'tek",
  signature: [COIL, WAVE, MOTHERS_WRATH],
  hiddenHits: [COIL_HIT],
  shapes: (data) => [...coils(data), ...waves(data), ...bite(data), ...purge(data),
    ...wowCastTargetRings(data, [MOTHERS_WRATH], "Mother's Wrath", 3, "tankbuster", 5000)],
  effects: (data) => carriers(data),
};
