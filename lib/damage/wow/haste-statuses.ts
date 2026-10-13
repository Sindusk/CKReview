// lib/damage/wow/haste-statuses.ts
//
// Buffs that shorten the GCD, for the GCD model (haste.ts) and the
// player-buff stream (buff-stream.ts, which keeps them, gear procs
// included). No imports: the WCL client loads this through buff-stream.ts.
//
// Each entry was picked by haste.ts's fit on unfiltered buffs
// (qpZx3mWaG7gcDdYB fight 5, 2026-10-13); the factor is what it measured
// there (GCD or cast time inside ÷ outside). Cast-time-only buffs
// (Backdraft, Whirling Air, Demonic Art) fit too but aren't haste: the GCD
// doesn't follow them, so they stay out. Add an id only from a measurement.

export const WOW_HASTE_STATUSES: { id: number; name: string; note: string }[] = [
  { id: 266030,  name: "Reverse Entropy",               note: "Destruction; ×0.860 (123 casts)" },
  { id: 387263,  name: "Flashpoint",                    note: "Destruction; ×0.932" },
  { id: 343312,  name: "Furious Gaze",                  note: "Havoc; ×0.950" },
  { id: 162264,  name: "Metamorphosis",                 note: "Havoc; instants ×0.78 raw, collinear with Furious Gaze" },
  { id: 48517,   name: "Eclipse (Solar)",               note: "Balance; ×0.896" },
  { id: 102560,  name: "Incarnation: Chosen of Elune",  note: "Balance; raw ×0.88, collinear with Eclipse" },
  { id: 279709,  name: "Starlord",                      note: "Balance; raw ×0.85" },
  { id: 31884,   name: "Avenging Wrath",                note: "Retribution; instants ×0.84 raw over 115 (without it Polpo's base GCD read 1050ms, his rating says ~1240)" },
  { id: 263806,  name: "Wind Gust",                     note: "Elemental; ×0.923" },
  { id: 173183,  name: "Elemental Blast: Haste",        note: "Elemental; ×0.941" },
  { id: 1307927, name: "Venomcursed Haste",             note: "gear; ×0.940 / ×0.964 (2 players)" },
  { id: 1305360, name: "Soul Fang Alacrity",            note: "gear; ×0.966" },
  { id: 1247578, name: "Halazzi's Swiftness",           note: "gear; ×0.950" },
  { id: 1308012, name: "Slick and Slimy Gralstone",     note: "gear; ×0.92–0.96 (4 players)" },
  { id: 1308013, name: "50-Lb Midnight Salmon",         note: "gear; ×0.943 (1 player)" },
  { id: 1236994, name: "Potion of Recklessness",        note: "potion; ×0.864 (1 player)" },
];

export const WOW_HASTE_STATUS_IDS: number[] = WOW_HASTE_STATUSES.map((s) => s.id);
