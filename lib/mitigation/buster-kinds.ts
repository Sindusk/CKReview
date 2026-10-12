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

export const BUSTER_KINDS: Record<string, Record<string, BusterLabel>> = {};

export function busterLabel(boss: string, abilityName: string): BusterLabel | undefined {
  return BUSTER_KINDS[boss]?.[abilityName];
}
