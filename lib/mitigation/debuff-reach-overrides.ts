// lib/mitigation/debuff-reach-overrides.ts
//
// Hand-edited corrections to the boss-debuff reach evidence
// (debuff-reach.ts). VOD review is ground truth (CLAUDE.md): when the user
// says a debuff does or doesn't reduce an attack, the entry goes here and
// wins over whatever the log shows. Keyed like the evidence: the attack
// (its ability name, and optionally the actor that dealt it, for a name two
// bosses both use), the boss the debuff is on, and the catalog key of the
// debuff ("reprisal", "feint", "addle", "dismantle"). An entry naming the
// source wins over one that doesn't.

export type DebuffReachOverride = {
  ability: string;   // the attack, as the log names it
  source?: string;   // the actor that dealt it; omitted = every source
  boss:    string;   // the enemy carrying the debuff, as the log names it
  debuff:  string;   // catalog key
  reaches: boolean;
  note?:   string;   // who said so, and when
};

const DEBUFFS = ["reprisal", "feint", "addle"] as const;

/** Every debuff on `boss` reaches (or misses) this attack. */
const all = (ability: string, boss: string, reaches: boolean, note: string, source?: string): DebuffReachOverride[] =>
  DEBUFFS.map((debuff) => ({ ability, source, boss, debuff, reaches, note }));

// Red Hot and Deep Blue (M10S): each boss's debuffs reduce only its own
// attacks (user, 2026-10-11, reviewing report jN3XDrf2z8PmLgRJ).
const M10S = "user, 2026-10-11 (M10S)";

export const DEBUFF_REACH_OVERRIDES: DebuffReachOverride[] = [
  { ability: "Deep Impact", boss: "Deep Blue", debuff: "feint", reaches: true, note: M10S },
  { ability: "Hot Impact", boss: "Red Hot", debuff: "reprisal", reaches: true, note: M10S },
  // Hot Aerial is Red Hot's attack.
  ...all("Hot Aerial", "Deep Blue", false, M10S),
  // Sick Swell is Deep Blue's.
  { ability: "Sick Swell", boss: "Deep Blue", debuff: "reprisal", reaches: true, note: M10S },
  ...all("Sick Swell", "Red Hot", false, M10S),
  // Firesnaking is Red Hot's, Watersnaking Deep Blue's.
  ...all("Firesnaking", "Red Hot", true, M10S),
  ...all("Firesnaking", "Deep Blue", false, M10S),
  ...all("Watersnaking", "Deep Blue", true, M10S),
  ...all("Watersnaking", "Red Hot", false, M10S),
  { ability: "Alley-Oop Inferno", boss: "Red Hot", debuff: "reprisal", reaches: true, note: M10S },
  // Divers' Dare is two attacks landing together, one from each boss.
  ...all("Divers' Dare", "Red Hot", true, M10S, "Red Hot"),
  ...all("Divers' Dare", "Deep Blue", false, M10S, "Red Hot"),
  ...all("Divers' Dare", "Deep Blue", true, M10S, "Deep Blue"),
  ...all("Divers' Dare", "Red Hot", false, M10S, "Deep Blue"),
];
