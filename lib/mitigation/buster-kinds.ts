// lib/mitigation/buster-kinds.ts
//
// What a buster that hits both tanks is (lib/mitigation/tanking.ts), per
// boss and ability name. The log alone can't reliably tell the two apart:
//   - shared: one hit split between the tanks (the full hit lands on one
//     tank if only one takes it)
//   - dual:   a separate hit on each tank
// An ability with no entry is shown as "both tanks". Filled by hand from
// the boss module's research model and the user's answers; never
// generated.

export type BusterLabel = "shared" | "dual";

// Single-tank busters need no entry (Vamp's Ultrasonic Spread tank cone,
// RHDB's Deep Impact and Vertical Blast/Plunge).
export const BUSTER_KINDS: Record<string, Record<string, BusterLabel>> = {
  // vamp-fatale.ts: Hardcore is two circles on the top two enmity (an
  // overlap onto one tank is a mechanic failure); Plummet is one tower per
  // tank, both required (user, 2026-10-11).
  "Vamp Fatale": { "Hardcore": "dual", "Plummet": "dual" },
  // red-hot-deep-blue.ts: both Hot Impacts are shared (user, 2026-10-11);
  // soloing one, usually under an invuln, takes the whole hit.
  "Red Hot and Deep Blue": { "Hot Impact": "shared" },
};

export function busterLabel(boss: string, abilityName: string): BusterLabel | undefined {
  return BUSTER_KINDS[boss]?.[abilityName];
}
