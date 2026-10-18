// lib/replay/ffxiv-effects.ts
//
// Boss visual cues the replay draws because the log names them only
// through a cast id: an effect around the caster that tells the players
// what is coming, the way the game shows it. Each fight builds its own in
// its replay spec (`effects`, `floorStatuses`; lib/replay/fight-spec.ts);
// this file gathers them for a pull. Pure code; the SVG art is in
// components/replay-art/, looked up by the effect's `kind`.

import type { CasterEffect } from "./fight-spec";
import { FIGHT_REPLAYS, fightReplaysFor } from "./fights";
import type { ReplayData } from "./ffxiv-replay";

export type { CasterEffect } from "./fight-spec";

export function buildCasterEffects(data: ReplayData): CasterEffect[] {
  const specs = fightReplaysFor(data);
  const out: CasterEffect[] = specs.flatMap((f) => f.effects?.(data) ?? []);

  // Floor statuses: one effect per burst of applications (within 2s), from
  // the first to the last one ending, centred on the map (FFLogs offsets).
  const cx = data.map ? -data.map.offsetX * 100 : 10000, cy = data.map ? -data.map.offsetY * 100 : 10000;
  for (const f of specs) {
    for (const [id, floor] of Object.entries(f.floorStatuses ?? {})) {
      const spans = (data.playerAuras ?? []).filter((a) => a[3] === Number(id)).sort((a, b) => a[0] - b[0]);
      let i = 0;
      while (i < spans.length) {
        let j = i, end = spans[i][1];
        while (j + 1 < spans.length && spans[j + 1][0] - spans[i][0] <= 2000) { j++; end = Math.max(end, spans[j][1]); }
        out.push({ kind: floor.kind, layer: "floor", label: floor.label, radius: floor.radius, x: cx, y: cy, start: spans[i][0], end });
        i = j + 1;
      }
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

/** Statuses that leave a slide trail behind a moving player: every floor status, plus any listed. Status ids are unique across fights. */
export const SLIDE_STATUSES = new Set(FIGHT_REPLAYS.flatMap((f) => [...Object.keys(f.floorStatuses ?? {}).map(Number), ...(f.slideStatuses ?? [])]));

/** Statuses that lift a player into a cage (FRU Floating Fetters). */
export const JAIL_STATUSES = new Set(FIGHT_REPLAYS.flatMap((f) => f.jailStatuses ?? []));
