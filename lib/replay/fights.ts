// lib/replay/fights.ts
//
// Every fight's replay spec (fight-spec.ts), and which ones apply to a
// pull. Each fight in the docs map is registered here already, most with
// an empty spec, so filling one in never touches this file.

import type { FightReplay, Override, WowAuraShape } from "./fight-spec";
import type { ReplayData } from "./ffxiv-replay";
import { FRU_REPLAY } from "@/lib/mechanics/ffxiv/fru/replay";
import { DANCING_MAD_REPLAY } from "@/lib/mechanics/ffxiv/dancingmad/replay";
import { TOP_REPLAY } from "@/lib/mechanics/ffxiv/top/replay";
import { TEA_REPLAY } from "@/lib/mechanics/ffxiv/tea/replay";
import { COILED_ALTAR_REPLAY } from "@/lib/mechanics/wow/va/coiled-altar-replay";
import { ENTOMBED_SENTINELS_REPLAY } from "@/lib/mechanics/wow/va/entombed-sentinels-replay";
import { LOST_EXPLORERS_REPLAY } from "@/lib/mechanics/wow/va/lost-explorers-replay";
import { NEKZALI_REPLAY } from "@/lib/mechanics/wow/va/nekzali-replay";
import { NYMRISSA_REPLAY } from "@/lib/mechanics/wow/va/nymrissa-replay";
import { SSZORAK_REPLAY } from "@/lib/mechanics/wow/va/sszorak-replay";
import { TWIN_FANGS_REPLAY } from "@/lib/mechanics/wow/va/twin-fangs-replay";
import { ULATEK_REPLAY } from "@/lib/mechanics/wow/va/ulatek-replay";
import { VASHNIK_REPLAY } from "@/lib/mechanics/wow/va/vashnik-replay";

export const FIGHT_REPLAYS: FightReplay[] = [
  FRU_REPLAY, DANCING_MAD_REPLAY, TOP_REPLAY, TEA_REPLAY,
  COILED_ALTAR_REPLAY, ENTOMBED_SENTINELS_REPLAY, LOST_EXPLORERS_REPLAY, NEKZALI_REPLAY, NYMRISSA_REPLAY,
  SSZORAK_REPLAY, TWIN_FANGS_REPLAY, ULATEK_REPLAY, VASHNIK_REPLAY,
];

/** The ability ids that say a pull is this fight: its signature plus every id it names. */
function signatureOf(f: FightReplay): Set<number> {
  const ids = new Set<number>(f.signature ?? []);
  for (const id of Object.keys(f.overrides ?? {})) ids.add(Number(id));
  for (const def of Object.values(f.headMarkers ?? {})) for (const id of def.abilities) ids.add(id);
  for (const m of Object.values(f.markerAoes ?? {})) ids.add(m.ability);
  for (const k of Object.values(f.tethers ?? {}).flat()) for (const id of k.payoff) ids.add(id);
  for (const id of Object.keys(f.wowAuraShapes ?? {})) ids.add(Number(id));
  for (const id of f.hiddenHits ?? []) ids.add(id);
  return ids;
}
const SIGNATURES = new Map(FIGHT_REPLAYS.map((f) => [f, signatureOf(f)]));

const cache = new WeakMap<ReplayData, FightReplay[]>();

/** The specs whose abilities show up in this pull. */
export function fightReplaysFor(data: ReplayData): FightReplay[] {
  const hit = cache.get(data);
  if (hit) return hit;
  const seen = new Set<number>();
  for (const c of data.enemyCasts ?? []) if (c[4] !== undefined) seen.add(c[4]);
  for (const h of data.enemyHits ?? []) seen.add(h[1]);
  for (const a of data.enemyAuras ?? []) seen.add(a[1]);
  const game = data.game === "wow" ? "wow" : "ffxiv";
  const out = FIGHT_REPLAYS.filter((f) => f.game === game && [...SIGNATURES.get(f)!].some((id) => seen.has(id)));
  cache.set(data, out);
  return out;
}

const overrideCache = new WeakMap<ReplayData, Record<number, Override>>();

/** The pull's per-ability overrides, from every spec that applies. */
export function overridesFor(data: ReplayData): Record<number, Override> {
  let o = overrideCache.get(data);
  if (!o) overrideCache.set(data, (o = Object.assign({}, ...fightReplaysFor(data).map((f) => f.overrides ?? {}))));
  return o!;
}

/** Every WoW fight's debuff shapes: the replay fetch asks for these debuffs only (wow-replay.ts). */
export function allWowAuraShapes(): Record<number, WowAuraShape> {
  return Object.assign({}, ...FIGHT_REPLAYS.filter((f) => f.game === "wow").map((f) => f.wowAuraShapes ?? {}));
}
