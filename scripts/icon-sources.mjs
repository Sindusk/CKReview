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
// REWRITE NOTE (was: raw.githubusercontent.com/xivapi/classjob-icons):
// That repo is community fan art — flat/outline icons, not the filled,
// colored icons the game actually uses — and is missing Viper/Pictomancer
// entirely, which is what caused the 404 that prompted this change.
//
// New source: XIVAPI v2 (v2.xivapi.com), specifically each job's Soul
// Crystal item icon (ClassJob.ItemSoulCrystal.Icon). Confirmed via a live
// test against all 12 mapped jobs below (including Viper/Pictomancer) —
// every one resolved to a real texture path, and the rendered PNG is the
// actual in-game filled job-crystal icon, not fan art.
//
// download-class-spec-icons.mjs queries XIVAPI live for each ID below
// rather than hardcoding icon numbers, so this table only needs to track
// ClassJob IDs (which are stable / don't change) — not icon IDs (which we
// have no reason to assume are stable across patches).
//
// IDs sourced from the FFXIV ClassJob sheet and cross-checked against the
// numeric keys already in lib/ffl-job-data.ts's FF_JOB_BY_ID — keep these
// two tables in sync if a new job is ever added.
//
// Base classes (Gladiator, Marauder, Conjurer, Pugilist, Lancer, Rogue,
// Arcanist, Thaumaturge, Archer) are intentionally EXCLUDED here: they
// have no Soul Crystal (that only exists once a class upgrades to its
// job at level 30), so there's no equivalent "filled icon" to fetch this
// way. They're a legacy-log-only edge case per the comment in
// ffl-job-data.ts, and getFFJobIcon() will simply 404 gracefully in the
// rare case one shows up — same fallback behavior as any other missing
// icon file today.

export const FF_JOB_CLASSJOB_IDS = {
  // Tanks
  Paladin:     19,
  Warrior:     21,
  DarkKnight:  32,
  Gunbreaker:  37,

  // Healers
  WhiteMage:   24,
  Scholar:     28,
  Astrologian: 33,
  Sage:        40,

  // Melee DPS
  Monk:        20,
  Dragoon:     22,
  Ninja:       30,
  Samurai:     34,
  Reaper:      39,
  Viper:       41,

  // Physical Ranged DPS
  Bard:        23,
  Machinist:   31,
  Dancer:      38,

  // Magical Ranged DPS
  BlackMage:   25,
  Summoner:    27,
  RedMage:     35,
  Pictomancer: 42,
  BlueMage:    36,
};
