// lib/damage/wow/tracked-cooldowns.ts
//
// Which cooldowns the drift check judges, per spec (key: "<spec> <class>",
// e.g. "Fire Mage"; lib/damage/wow/game.ts jobOf). Same rule as FFXIV's
// list: only cooldowns gated by nothing but their recast belong here, or a
// proc- or resource-gated one sits "ready" while unusable and reads as drift.
// WoWAnalyzer may be read for which cooldowns matter, never copied (AGPL).
//
// Every number is measured (lib/damage/wow/spell-data.ts, survey of 12
// fights, 2026-10-06):
// - cooldownMs: the shortest interval between one player's casts, rounded
//   to the second. That's an upper bound on the real recast, so the check
//   errs lenient: a talent that shortens it more than the samples show
//   would hide drift, never invent it.
// - firstUseOffsetMs: how late the opener uses it, from the median first
//   cast across the survey (rounded up).
// Defensives are left out: holding them is a choice.

import type { TrackedCooldown } from "../types";

export const WOW_TRACKED_COOLDOWNS: Record<string, TrackedCooldown[]> = {
  // ── Tanks ───────────────────────────────────────────────────────────
  "Blood Death Knight": [
    // min interval 90.0s (69 casts), first use median 2.1s (15 players)
    { name: "Dancing Rune Weapon", actionIds: [49028], cooldownMs: 90_000, charges: 1, firstUseOffsetMs: 3_000 },
    // min 120.0s (37 casts), first use median 2.1s
    { name: "Raise Dead", actionIds: [46585], cooldownMs: 120_000, charges: 1, firstUseOffsetMs: 3_000 },
  ],
  "Protection Paladin": [
    // min 59.9s (51 casts), first use median 1.7s (8 players)
    { name: "Sentinel", actionIds: [389539], cooldownMs: 60_000, charges: 1, firstUseOffsetMs: 3_000 },
    // min 60.0s (47 casts), first use median 8.5s (25 players across specs)
    { name: "Divine Toll", actionIds: [375576], cooldownMs: 60_000, charges: 1, firstUseOffsetMs: 10_000 },
  ],
  // Unverified (2 players): min 60.0s (9 casts), first use 6.0s.
  "Brewmaster Monk": [
    { name: "Exploding Keg", actionIds: [325153], cooldownMs: 60_000, charges: 1, firstUseOffsetMs: 7_000 },
  ],
  // Unverified (1 player): Sigil of Spite min 63.0s, first use 4.4s; Sigil
  // of Flame min 30.9s.
  "Vengeance Demon Hunter": [
    { name: "Sigil of Spite", actionIds: [390163], cooldownMs: 63_000, charges: 1, firstUseOffsetMs: 5_000 },
    { name: "Sigil of Flame", actionIds: [204596], cooldownMs: 31_000, charges: 1, firstUseOffsetMs: 5_000 },
  ],
};
