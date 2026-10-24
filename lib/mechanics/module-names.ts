// lib/mechanics/module-names.ts
//
// Display names of the encounter modules that cover each fight, keyed by
// the log's fight name (Pull.name), for the "i" tip in the analysis panel
// and the fight-context badge in the Damage dialog. A multi-phase fight
// lists one line per phase its modules cover ("Dancing Mad - P1 - Kefka").
//
// A new boss module adds its fight here as well as to fallback.ts
// COVERED_ENCOUNTERS (or MODULE_PHASES); a fight missing from this list
// shows the "no module detected" alert.

const DANCING_MAD = [
  "Dancing Mad - P1 - Kefka",
  "Dancing Mad - P2 - Forsaken Kefka",
  "Dancing Mad - P3 - Exdeath & Chaos",
  "Dancing Mad - P4 - Kefka Says",
  "Dancing Mad - P5 - Ultima Kefka",
];

const FRU = [
  "Futures Rewritten - P1 - Fatebreaker",
  "Futures Rewritten - P2 - Usurper of Frost",
  "Futures Rewritten - P3 - Oracle of Darkness",
  "Futures Rewritten - P4 - Enter the Dragon",
  "Futures Rewritten - P5 - Pandora",
];

const TOP = [
  "The Omega Protocol - P1 - Omega",
  "The Omega Protocol - P2 - Omega-M and Omega-F",
  "The Omega Protocol - P3 - Omega Reconfigured",
  "The Omega Protocol - P4 - Blue Screen",
  "The Omega Protocol - P5 - Run: Dynamis",
  "The Omega Protocol - P6 - Alpha Omega",
];

const TEA = [
  "The Epic of Alexander - P1 - Living Liquid",
  "The Epic of Alexander - Intermission - Limit Cut",
  "The Epic of Alexander - P2 - Brute Justice / Cruise Chaser",
  "The Epic of Alexander - P3 - Alexander Prime",
  "The Epic of Alexander - P4 - Perfect Alexander",
];

const VA = (boss: string) => [`The Venomous Abyss - ${boss}`];

const MODULE_NAMES: Record<string, string[]> = {
  // FFXIV ultimates
  "Dancing Mad": DANCING_MAD,
  "Futures Rewritten": FRU,
  "The Omega Protocol": TOP,
  "The Epic of Alexander": TEA,
  // FFXIV savage (AAC Heavyweight)
  "Vamp Fatale": ["M9S - Vamp Fatale"],
  "Red Hot and Deep Blue": ["M10S - Red Hot and Deep Blue"],
  "Red Hot / Deep Blue": ["M10S - Red Hot and Deep Blue"],
  "The Tyrant": ["M11S - The Tyrant"],
  "Lindwurm": ["M12S - P1 - Lindwurm"],
  "Lindwurm II": ["M12S - P2 - Lindwurm II"],
  // FFXIV extreme trials
  "Doomtrain": ["Doomtrain (Extreme)"],
  "Necron": ["Necron (Extreme)"],
  "Zelenia": ["Zelenia (Extreme)"],
  "Enuo": ["Enuo (Extreme)"],
  "Queen Eternal": ["Queen Eternal (Extreme)"],
  // WoW
  "Entombed Sentinels": VA("Entombed Sentinels"),
  "Vashnik the Malignant": VA("Vashnik the Malignant"),
  "Sszorak": VA("Sszorak"),
  "Nek'zali the Soulcoiler": VA("Nek'zali the Soulcoiler"),
  "The Lost Explorers": VA("The Lost Explorers"),
  "The Twin Fangs": VA("The Twin Fangs"),
  "The Coiled Altar": VA("The Coiled Altar"),
  "Ula'tek": VA("Ula'tek"),
  "Midnight Falls": ["Midnight Falls"],
};

/** The encounter modules that cover this fight, by display name; empty when none does. */
export function moduleNamesFor(fightName: string): string[] {
  return MODULE_NAMES[fightName] ?? [];
}
