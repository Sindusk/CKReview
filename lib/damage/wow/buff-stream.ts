// lib/damage/wow/buff-stream.ts
//
// What the WoW damage-analysis streams fetch (FIGHT_EVENTS_QUERY's
// playerBuffs and enemyDebuffs aliases in lib/wcl-client.ts), and which
// aura ids the transform keeps from each hit's aura snapshot. Same role as
// lib/damage/ffxiv/buff-stream.ts. Data check: docs/archive/damage-analysis-plan.md,
// "WoW port".
//
// All ids come from lib/damage/wow/spell-data.ts, which is measured from
// real logs (scripts/build-wow-spell-data.js):
// - Player buffs: every spec's "class" and "external" statuses (procs,
//   cooldown buffs, talent auras; Heroism, Power Infusion, Ebon Might).
//   "gear" statuses others apply (trinkets, augment runes) are left out:
//   they were most of the unfiltered stream's volume, ~160 events/s for 20
//   players. Since 2026-10-13 every self-applied buff is kept as well
//   (WOW_PLAYER_BUFF_FILTER below), gear procs included.
// - Enemy debuffs: each spec's DoTs and the debuffs its spells apply.
//   Unfiltered it's ~53 events/s, most of them trinket and raid-wide
//   debuffs no check reads.
// - The snapshot keeps the same player-buff ids, so a hit records which
//   tracked auras were on the attacker (WCL lists ~14 per hit, ~107 bytes;
//   all of them would be ~8.6MB per long pull).
// Data slack (from docs/open-items.md 2026-10-15): a few non-DoT debuffs
// pass the enemy-debuff filter (Rune of Lingering, Banish, Mortal Coil)
// because they share an id with something a spec casts.

import { WOW_SPELL_DATA } from "./spell-data";
import { WOW_HASTE_STATUS_IDS } from "./haste-statuses";

// Midnight combat potions (30s, 5-minute cooldown not shared with health
// potions), for the potion check: Light's Potential (primary stat) and
// Potion of Recklessness (secondary stats; also a measured haste status).
export const WOW_COMBAT_POTION_IDS: number[] = [1236616, 1236994, 1236998];   // + Draught of Rampant Abandon

// Plus the measured haste statuses (haste.ts), gear procs included: the
// GCD model needs their windows. And the combat potions.
export const WOW_PLAYER_BUFF_IDS: number[] = [...new Set([
  ...Object.values(WOW_SPELL_DATA).flatMap((s) => s.statuses.filter((st) => st.kind !== "gear").map((st) => st.id)),
  ...WOW_HASTE_STATUS_IDS,
  ...WOW_COMBAT_POTION_IDS,
])].sort((a, b) => a - b);

export const WOW_ENEMY_DEBUFF_IDS: number[] = [...new Set(
  Object.values(WOW_SPELL_DATA).flatMap((s) => s.enemyDebuffs.map((d) => d.id)),
)].sort((a, b) => a - b);

// Plus every buff a player puts on themselves (user, 2026-10-13: keep useful
// streams rather than discard them). The id list came from a 2026-10-06
// survey and missed later talents: Windwalker Blkphnx (qpZx3mWaG7gcDdYB
// pull 3) kept 24 of his 80 buff ids, losing Hit Combo, the per-ability
// Combo Strikes mastery buffs, Tigereye Brew and the Rushing Wind Kick
// proc. Self-applied roughly doubles the stream (his 1,320 events → 3,362;
// ~2MB → ~5MB a long pull). `source.id = target.id` is accepted by WCL's
// filter language (checked on that fight). Others' buffs on the player
// (healers' HoTs, Power Infusion) still come only from the list.
export const WOW_PLAYER_BUFF_FILTER  = `ability.id in (${WOW_PLAYER_BUFF_IDS.join(",")}) or source.id = target.id`;
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
