// lib/damage/wow/buff-stream.ts
//
// What the WoW damage-analysis streams fetch (FIGHT_EVENTS_QUERY's
// playerBuffs and enemyDebuffs aliases in lib/wcl-client.ts), and which
// aura ids the transform keeps from each hit's aura snapshot. Same role as
// lib/damage/ffxiv/buff-stream.ts. Data check: docs/damage-analysis-plan.md,
// "WoW port".
//
// All ids come from lib/damage/wow/spell-data.ts, which is measured from
// real logs (scripts/build-wow-spell-data.js):
// - Player buffs: every spec's "class" and "external" statuses (procs,
//   cooldown buffs, talent auras; Heroism, Power Infusion, Ebon Might).
//   "gear" statuses (trinkets, augment runes, potions) are left out: they
//   were most of the unfiltered stream's volume, ~160 events/s for 20
//   players, and no check reads them yet. Filtered, the survey fights
//   average ~150 events per player-minute.
// - Enemy debuffs: each spec's DoTs and the debuffs its spells apply.
//   Unfiltered it's ~53 events/s, most of them trinket and raid-wide
//   debuffs no check reads.
// - The snapshot keeps the same player-buff ids, so a hit records which
//   tracked auras were on the attacker (WCL lists ~14 per hit, ~107 bytes;
//   all of them would be ~8.6MB per long pull).

import { WOW_SPELL_DATA } from "./spell-data";

export const WOW_PLAYER_BUFF_IDS: number[] = [...new Set(
  Object.values(WOW_SPELL_DATA).flatMap((s) => s.statuses.filter((st) => st.kind !== "gear").map((st) => st.id)),
)].sort((a, b) => a - b);

export const WOW_ENEMY_DEBUFF_IDS: number[] = [...new Set(
  Object.values(WOW_SPELL_DATA).flatMap((s) => s.enemyDebuffs.map((d) => d.id)),
)].sort((a, b) => a - b);

export const WOW_PLAYER_BUFF_FILTER  = `ability.id in (${WOW_PLAYER_BUFF_IDS.join(",")})`;
export const WOW_ENEMY_DEBUFF_FILTER = `ability.id in (${WOW_ENEMY_DEBUFF_IDS.join(",")})`;

const SNAPSHOT_IDS = new Set(WOW_PLAYER_BUFF_IDS);

/**
 * WCL's "id.id.id." aura snapshot → the tracked ids in it ([] when none
 * are tracked), or undefined when the hit carried no snapshot (pulls
 * fetched before it was kept).
 */
export function decodeWowSnapshot(buffs: string | undefined): number[] | undefined {
  if (buffs === undefined) return undefined;
  const out: number[] = [];
  for (const part of buffs.split(".")) {
    if (!part) continue;
    const id = Number(part);
    if (SNAPSHOT_IDS.has(id) && !out.includes(id)) out.push(id);
  }
  return out;
}
