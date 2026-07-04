// scripts/icon-sources.mjs
//
// Source-of-truth mapping tables for the icon downloader (download-class-spec-icons.mjs).
// Keep these in sync with lib/spec-data.ts and lib/ffl-job-data.ts — the KEYS here
// (spec IDs / job names) are intentionally identical to the keys used in those files,
// so the generated lib/spec-icons.ts + lib/ffl-job-icons.ts lookups line up 1:1.

// ─── WoW ────────────────────────────────────────────────────────────────────
//
// Zamimg (Wowhead's icon CDN) serves icons at:
//   https://wow.zamimg.com/images/wow/icons/large/{slug}.jpg
//
// Confirmed working: spell_holy_holybolt -> Holy Paladin.
//
// These slugs are the "classic" spec icons Blizzard has used since each spec's
// introduction/rework and are generally stable, but a few of the newer ones
// (Evoker, modern Hunter/Rogue reworks) are lower-confidence guesses — the
// downloader reports any 404s clearly so you can fix just those entries.

export const WOW_CLASS_ICON_SLUGS = {
  "Death Knight": "classicon_deathknight",
  "Demon Hunter": "classicon_demonhunter",
  "Druid":        "classicon_druid",
  "Evoker":       "classicon_evoker",
  "Hunter":       "classicon_hunter",
  "Mage":         "classicon_mage",
  "Monk":         "classicon_monk",
  "Paladin":      "classicon_paladin",
  "Priest":       "classicon_priest",
  "Rogue":        "classicon_rogue",
  "Shaman":       "classicon_shaman",
  "Warlock":      "classicon_warlock",
  "Warrior":      "classicon_warrior",
};

// ─── Pending specs (not yet in lib/spec-data.ts) ───────────────────────────
//
// (empty — Devourer's spec ID was confirmed as 1480 via a real WCL
// CombatantInfo log and moved into WOW_SPEC_ICON_SLUGS below. Kept as an
// empty export so download-class-spec-icons.mjs doesn't need changes if
// this ever needs to hold a future not-yet-known spec again.)
export const WOW_PENDING_SPEC_ICON_SLUGS = {};

// Keyed by spec ID — matches lib/spec-data.ts SPEC_DATA keys exactly.
export const WOW_SPEC_ICON_SLUGS = {
  // Death Knight
  250: "spell_deathknight_bloodpresence",
  251: "spell_deathknight_frostpresence",
  252: "spell_deathknight_unholypresence",

  // Demon Hunter
  577: "ability_demonhunter_specdps",
  581: "ability_demonhunter_spectank",
  // Devourer — confirmed via WCL CombatantInfo sample: specID 1480 is the
  // only ID in a real log that doesn't match an existing spec-data.ts entry,
  // its gear includes a glaive (DH-exclusive weapon), and its stat block is
  // Intellect-dominant (2791 Int vs. the Agility Havoc/Vengeance use) —
  // matching every published description of Devourer as the Int-caster DH
  // spec. Icon confirmed separately via Wowhead (see prior note).
  1480: "classicon_demonhunter_void",

  // Druid
  102: "spell_nature_starfall",
  103: "ability_druid_catform",
  104: "ability_racial_bearform",
  105: "spell_nature_healingtouch",

  // Evoker  (lower confidence — verify these three first)
  1467: "classicon_evoker_devastation",
  1468: "classicon_evoker_preservation",
  1473: "classicon_evoker_augmentation",

  // Hunter
  253: "ability_hunter_bestialdiscipline",
  254: "ability_hunter_focusedaim",
  255: "ability_hunter_camouflage",

  // Mage
  62: "spell_holy_magicalsentry",
  63: "spell_fire_firebolt02",
  64: "spell_frost_frostbolt02",

  // Monk
  268: "monk_stance_drunkenox",
  270: "monk_stance_wiseserpent",
  269: "monk_stance_whitetiger",

  // Paladin
  65: "spell_holy_holybolt",              // confirmed working
  66: "ability_paladin_shieldofthetemplar",
  70: "spell_holy_auraoflight",

  // Priest
  256: "spell_holy_powerwordshield",
  257: "spell_holy_guardianspirit",
  258: "spell_shadow_shadowwordpain",

  // Rogue
  259: "ability_rogue_deadlybrew",
  260: "ability_rogue_waylay",
  261: "ability_stealth",

  // Shaman
  262: "spell_nature_lightning",
  263: "spell_shaman_improvedstormstrike",
  264: "spell_nature_magicimmunity",

  // Warlock
  265: "spell_shadow_deathcoil",
  266: "spell_shadow_metamorphosis",
  267: "spell_shadow_rainoffire",

  // Warrior
  71: "ability_warrior_savageblow",
  72: "ability_warrior_innerrage",
  73: "ability_warrior_defensivestance",
};

// ─── FFXIV ──────────────────────────────────────────────────────────────────
//
// Source: https://github.com/xivapi/classjob-icons (icons/ folder) via
// GitHub's raw CDN. Filenames are just the job name, lowercased, no spaces —
// which happens to be exactly `key.toLowerCase()` for every key already in
// lib/ffl-job-data.ts's FF_JOB_BY_NAME, so no separate mapping table is
// needed here. We just reuse that list of keys directly in the downloader.
//
// NOTE: this repo was last updated Dec 2024. Dawntrail jobs (Viper,
// Pictomancer) SHOULD be present, but if either 404s, that's the reason —
// let me know and we'll source those two from somewhere else.

export const FFXIV_ICON_BASE =
  "https://raw.githubusercontent.com/xivapi/classjob-icons/master/icons";

export const FF_JOB_KEYS = [
  "Paladin", "Warrior", "DarkKnight", "Gunbreaker",
  "WhiteMage", "Scholar", "Astrologian", "Sage",
  "Monk", "Dragoon", "Ninja", "Samurai", "Reaper", "Viper",
  "Bard", "Machinist", "Dancer",
  "BlackMage", "Summoner", "RedMage", "Pictomancer", "BlueMage",
  "Gladiator", "Marauder", "Conjurer", "Pugilist", "Lancer",
  "Rogue", "Arcanist", "Thaumaturge", "Archer",
];
