// lib/damage/wow/tracked-cooldowns.ts
//
// Which cooldowns the drift check judges, per spec (key: "<spec> <class>",
// e.g. "Fire Mage"; lib/damage/wow/game.ts jobOf). Same rule as FFXIV's
// list: only cooldowns gated by nothing but their recast belong here, or a
// proc- or resource-gated one sits "ready" while unusable and reads as drift.
//
// Empty until the spec batches (docs/damage-analysis-plan.md, "WoW build
// order" step 6). Each entry's cooldown, charges and first-use offset must
// come from real logs (cast spacing in lib/damage/wow/spell-data.ts, or a
// survey), with the source log in a comment. WoWAnalyzer may be read for
// which cooldowns matter, never copied (AGPL).

import type { TrackedCooldown } from "../types";

export const WOW_TRACKED_COOLDOWNS: Record<string, TrackedCooldown[]> = {};
