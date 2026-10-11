// lib/mitigation/debuff-reach-overrides.ts
//
// Hand-edited corrections to the boss-debuff reach evidence
// (debuff-reach.ts). VOD review is ground truth (CLAUDE.md): when the user
// says a debuff does or doesn't reduce an attack, the entry goes here and
// wins over whatever the log shows. Keyed like the evidence: the attack's
// ability name, the boss the debuff is on, and the catalog key of the
// debuff ("reprisal", "feint", "addle", "dismantle").

export type DebuffReachOverride = {
  ability: string;   // the attack, as the log names it
  boss:    string;   // the enemy carrying the debuff, as the log names it
  debuff:  string;   // catalog key
  reaches: boolean;
  note?:   string;   // who said so, and when
};

export const DEBUFF_REACH_OVERRIDES: DebuffReachOverride[] = [];
