// lib/damage/ffxiv/buff-stream.ts
//
// Which player statuses the friendly Buffs stream fetches
// (FIGHT_EVENTS_QUERY's playerBuffs alias in lib/ffl-client.ts). The
// damage-done `buffs` snapshot lists damage modifiers only, never procs,
// so proc, job-buff and buff-window checks need apply/remove events
// (docs/damage-analysis-plan.md, "Data check findings").
//
// The list is every xivanalysis player status (lib/damage/ffxiv/xiva-data.ts)
// except mitigation and shields (the damage-taken snapshot already answers
// those, and shields are the bulk of the unfiltered stream), Well Fed
// (fight-long) and enemy statuses. Filtering on the server keeps the
// per-fight cost down: unfiltered, the stream is ~11 events/s.

import { XIVA_STATUSES } from "./xiva-data";
import { FFXIV_STATUS_INDEX } from "../../mitigation/ffxiv-catalog";

const WELL_FED = 1000048;

export const PLAYER_BUFF_STATUS_IDS: number[] = [...new Set(
  Object.values(XIVA_STATUSES)
    .filter((s) => s.job !== "ENEMY")
    .map((s) => s.id)
    .filter((id) => id !== WELL_FED && !FFXIV_STATUS_INDEX.has(id)),
)].sort((a, b) => a - b);

export const PLAYER_BUFF_FILTER =
  `ability.id in (${PLAYER_BUFF_STATUS_IDS.join(",")})`;
