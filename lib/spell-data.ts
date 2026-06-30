// lib/spell-data.ts
//
// Manual lookup table mapping WoW ability game IDs to human-readable names.
// Used to display killing blow names on death events, since the WCL API only
// returns killingAbilityGameID (a number) — not the name string.
//
// HOW TO ADD ENTRIES:
//   1. Check the browser console after importing a report. Death events log
//      `killingAbilityGameID` values you haven't seen before.
//   2. Look up the ID on wowhead.com/spell=<ID> to get the name.
//   3. Add an entry below in the format:  [ID]: "Spell Name",
//
// If an ID is not in this table, the UI will display "Unknown (ID: XXXX)".

export const SPELL_NAMES: Record<number, string> = {
  // ── Populate these from the first imported log ────────────────────────────
  // IDs observed in initial test log (fill in names from wowhead.com/spell=ID):
  1243866: "",   // wowhead.com/spell=1243866
  1241646: "",   // wowhead.com/spell=1241646
  1242094: "",   // wowhead.com/spell=1242094
  1262736: "",   // wowhead.com/spell=1262736
  1242991: "",   // wowhead.com/spell=1242991

  // ── Common WoW environmental / generic kills ──────────────────────────────
  // (These are safe to leave as-is)
  3: "Fall Damage",
  6: "Drowning",
  17: "Fatigue",
};

/**
 * Returns the human-readable spell name for a given ability game ID.
 * Falls back to "Unknown (ID: XXXX)" if not found in the table.
 */
export function getSpellName(abilityGameId: number): string {
  if (abilityGameId === 0) return "Unknown";
  const name = SPELL_NAMES[abilityGameId];
  if (name) return name;
  return `Unknown (ID: ${abilityGameId})`;
}
