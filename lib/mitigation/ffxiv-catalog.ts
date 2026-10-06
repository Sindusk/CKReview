// lib/mitigation/ffxiv-catalog.ts
//
// Every FFXIV mitigation the analysis recognizes, shared by all fights
// (docs/mitigation-redesign.md, Model section 2). Keyed by FFLogs IDs:
// action IDs are the cast's abilityGameID; status IDs are FFLogs' status
// IDs (game status ID + 1,000,000), the values in a damage event's `buffs`.
//
// Values are for patch 7.x (Dawntrail), checked 2026-10-06:
//   - `verified: true` means the action and status IDs were seen in real
//     Dancing Mad logs. Entries for jobs that never appeared in a sample
//     pull (Warrior, Machinist, Red Mage, Ninja, Monk, Summoner) are from
//     the 7.x tooltips and stay `verified: false` until a log confirms them.
//   - Percentages were cross-checked against FFLogs' own per-hit
//     `multiplier` (scripts/check-mitigation-catalog.js) over ~11,000 hits
//     in three reports. Every % status that appears lands on its catalog
//     value on 77–100% of hits. Most of the rest is snapshot lag: the
//     status is listed in `buffs` but did not apply (implied factor 1.00).
//     So the logged multiplier, not this table, is the truth for a hit's
//     total; the table splits that total among the statuses.
//   - Known gap: Knight's Resolve (1002675) is 15% from Holy Sheltron but
//     10% from Intervention, under the same status ID. The table uses 15%.
//   - Reprisal, Feint and Addle durations (15s) come from the log's own
//     applydebuff `duration`. Other durations and cooldowns are tooltip
//     values. The check script's shortest real cast gaps match every
//     ungated cooldown to within 1s.
//   - Folded in from the retired mitigation-detection.ts duration table
//     (user-confirmed 2026-07-24): The Blackest Night 7s, Divine Caress 10s,
//     Addle 15s. Its Divine Veil 20s is kept: the shield is consumed long
//     before either 20s or the 30s tooltip matters. Liturgy of the Bell and
//     Plenary Indulgence (status "Confession") are heals, not mitigation,
//     and are left out, as are Second Wind and Bloodbath.
//
// Damage type matters: `physical` and `magical` are kept separate (Feint
// 10% physical / 5% magical, Addle the reverse). Unaspected hits (FFLogs
// ability type 32) ignore % mitigation entirely; only shields apply.

import type { CatalogEntry, CatalogStatus, MitigationGame } from "./types";

const pct = (id: number, name: string, physical: number, magical = physical): CatalogStatus =>
  ({ id, name, physical, magical });
const shield = (id: number, name: string): CatalogStatus =>
  ({ id, name, physical: 0, magical: 0, shield: true });
const marker = (id: number, name: string): CatalogStatus =>
  ({ id, name, physical: 0, magical: 0 });

const TANKS = ["Paladin", "Warrior", "Dark Knight", "Gunbreaker"];
const MELEE = ["Monk", "Dragoon", "Ninja", "Samurai", "Reaper", "Viper"];
const CASTERS = ["Black Mage", "Summoner", "Red Mage", "Pictomancer"];

export const FFXIV_MITIGATION_CATALOG: CatalogEntry[] = [
  // ── Role actions ────────────────────────────────────────────────────
  { key: "reprisal",  name: "Reprisal",  jobs: TANKS,  actionIds: [7535], statuses: [pct(1001193, "Reprisal", 0.10)],
    kind: "bossDebuff", reach: "party", durationMs: 15_000, cooldownMs: 60_000, verified: true },
  { key: "feint",     name: "Feint",     jobs: MELEE,  actionIds: [7549], statuses: [pct(1001195, "Feint", 0.10, 0.05)],
    kind: "bossDebuff", reach: "party", durationMs: 15_000, cooldownMs: 90_000, verified: true },
  { key: "addle",     name: "Addle",     jobs: CASTERS, actionIds: [7560], statuses: [pct(1001203, "Addle", 0.05, 0.10)],
    kind: "bossDebuff", reach: "party", durationMs: 15_000, cooldownMs: 90_000, verified: true },
  { key: "rampart",   name: "Rampart",   jobs: TANKS,  actionIds: [7531], statuses: [pct(1001191, "Rampart", 0.20)],
    kind: "personal", reach: "self", durationMs: 20_000, cooldownMs: 90_000, verified: true },

  // ── Paladin ─────────────────────────────────────────────────────────
  { key: "divine-veil", name: "Divine Veil", jobs: ["Paladin"], actionIds: [3540], statuses: [shield(1001362, "Divine Veil")],
    kind: "shield", reach: "party", durationMs: 20_000, cooldownMs: 90_000, verified: true },
  { key: "passage-of-arms", name: "Passage of Arms", jobs: ["Paladin"], actionIds: [7385],
    statuses: [pct(1001176, "Arms Up", 0.15), marker(1001175, "Passage of Arms")],
    kind: "partyBuff", reach: "party", durationMs: 18_000, cooldownMs: 120_000, variableDuration: true, verified: true },
  { key: "guardian", name: "Guardian", jobs: ["Paladin"], actionIds: [36920],
    statuses: [pct(1003829, "Guardian", 0.40), shield(1003830, "Guardian's Will")],
    kind: "personal", reach: "self", durationMs: 15_000, cooldownMs: 120_000, verified: true },
  // Bulwark makes every hit a block; block is outside FFLogs' multiplier.
  { key: "bulwark", name: "Bulwark", jobs: ["Paladin"], actionIds: [22], statuses: [marker(1000077, "Bulwark")],
    kind: "personal", reach: "self", durationMs: 10_000, cooldownMs: 90_000, verified: true },
  { key: "holy-sheltron", name: "Holy Sheltron", jobs: ["Paladin"], actionIds: [25746],
    statuses: [pct(1002674, "Holy Sheltron", 0.15), pct(1002675, "Knight's Resolve", 0.15)],
    kind: "personal", reach: "self", durationMs: 8_000, cooldownMs: 5_000, gated: "Oath Gauge", verified: true },
  // +10% more when the Paladin has Rampart or Guardian up; the base is kept.
  { key: "intervention", name: "Intervention", jobs: ["Paladin"], actionIds: [7382], statuses: [pct(1001174, "Intervention", 0.10)],
    kind: "personal", reach: "target", durationMs: 8_000, cooldownMs: 10_000, gated: "Oath Gauge", verified: true },
  { key: "hallowed-ground", name: "Hallowed Ground", jobs: ["Paladin"], actionIds: [30], statuses: [pct(1000082, "Hallowed Ground", 1)],
    kind: "invuln", reach: "self", durationMs: 10_000, cooldownMs: 420_000, verified: true },

  // ── Warrior (not seen in any sample pull) ───────────────────────────
  { key: "shake-it-off", name: "Shake It Off", jobs: ["Warrior"], actionIds: [7388], statuses: [shield(1001457, "Shake It Off")],
    kind: "shield", reach: "party", durationMs: 30_000, cooldownMs: 90_000, verified: false },
  { key: "damnation", name: "Damnation", jobs: ["Warrior"], actionIds: [36923], statuses: [pct(1003832, "Damnation", 0.40)],
    kind: "personal", reach: "self", durationMs: 15_000, cooldownMs: 120_000, verified: false },
  { key: "bloodwhetting", name: "Bloodwhetting", jobs: ["Warrior"], actionIds: [25751],
    statuses: [pct(1002678, "Bloodwhetting", 0.10), pct(1002679, "Stem the Flow", 0.10), shield(1002680, "Stem the Tide")],
    kind: "personal", reach: "self", durationMs: 8_000, cooldownMs: 25_000, verified: false },
  { key: "nascent-flash", name: "Nascent Flash", jobs: ["Warrior"], actionIds: [16464],
    statuses: [pct(1001858, "Nascent Glint", 0.10), pct(1002679, "Stem the Flow", 0.10), shield(1002680, "Stem the Tide")],
    kind: "personal", reach: "target", durationMs: 8_000, cooldownMs: 25_000, verified: false },
  { key: "holmgang", name: "Holmgang", jobs: ["Warrior"], actionIds: [43], statuses: [pct(1000409, "Holmgang", 1)],
    kind: "invuln", reach: "self", durationMs: 10_000, cooldownMs: 240_000, verified: false },

  // ── Dark Knight ─────────────────────────────────────────────────────
  { key: "dark-missionary", name: "Dark Missionary", jobs: ["Dark Knight"], actionIds: [16471],
    statuses: [pct(1001894, "Dark Missionary", 0.05, 0.10)],
    kind: "partyBuff", reach: "party", durationMs: 15_000, cooldownMs: 90_000, verified: true },
  { key: "dark-mind", name: "Dark Mind", jobs: ["Dark Knight"], actionIds: [3634], statuses: [pct(1000746, "Dark Mind", 0.10, 0.20)],
    kind: "personal", reach: "self", durationMs: 10_000, cooldownMs: 60_000, verified: true },
  { key: "shadowed-vigil", name: "Shadowed Vigil", jobs: ["Dark Knight"], actionIds: [36927],
    statuses: [pct(1003835, "Shadowed Vigil", 0.40), marker(1003902, "Vigilant")],
    kind: "personal", reach: "self", durationMs: 15_000, cooldownMs: 120_000, verified: true },
  { key: "the-blackest-night", name: "The Blackest Night", jobs: ["Dark Knight"], actionIds: [7393],
    statuses: [shield(1001178, "Blackest Night")],
    kind: "shield", reach: "target", durationMs: 7_000, cooldownMs: 15_000, gated: "MP", verified: true },
  { key: "oblation", name: "Oblation", jobs: ["Dark Knight"], actionIds: [25754], statuses: [pct(1002682, "Oblation", 0.10)],
    kind: "personal", reach: "target", durationMs: 10_000, cooldownMs: 60_000, charges: 2, verified: true },
  { key: "living-dead", name: "Living Dead", jobs: ["Dark Knight"], actionIds: [3638],
    statuses: [pct(1000810, "Living Dead", 1), pct(1000811, "Walking Dead", 1), marker(1003255, "Undead Rebirth")],
    kind: "invuln", reach: "self", durationMs: 10_000, cooldownMs: 300_000, verified: true },

  // ── Gunbreaker ──────────────────────────────────────────────────────
  { key: "heart-of-light", name: "Heart of Light", jobs: ["Gunbreaker"], actionIds: [16160],
    statuses: [pct(1001839, "Heart of Light", 0.05, 0.10)],
    kind: "partyBuff", reach: "party", durationMs: 15_000, cooldownMs: 90_000, verified: true },
  { key: "camouflage", name: "Camouflage", jobs: ["Gunbreaker"], actionIds: [16140], statuses: [pct(1001832, "Camouflage", 0.10)],
    kind: "personal", reach: "self", durationMs: 20_000, cooldownMs: 90_000, verified: true },
  { key: "great-nebula", name: "Great Nebula", jobs: ["Gunbreaker"], actionIds: [36935], statuses: [pct(1003838, "Great Nebula", 0.40)],
    kind: "personal", reach: "self", durationMs: 15_000, cooldownMs: 120_000, verified: true },
  { key: "heart-of-corundum", name: "Heart of Corundum", jobs: ["Gunbreaker"], actionIds: [25758],
    statuses: [pct(1002683, "Heart of Corundum", 0.15), pct(1002684, "Clarity of Corundum", 0.15)],
    kind: "personal", reach: "target", durationMs: 8_000, cooldownMs: 25_000, verified: true },
  // From the Brutal Shell combo GCD: no cooldown of its own.
  { key: "brutal-shell", name: "Brutal Shell", jobs: ["Gunbreaker"], actionIds: [16139], statuses: [shield(1001898, "Brutal Shell")],
    kind: "shield", reach: "self", durationMs: 30_000, cooldownMs: 0, verified: true },
  { key: "superbolide", name: "Superbolide", jobs: ["Gunbreaker"], actionIds: [16152], statuses: [pct(1001836, "Superbolide", 1)],
    kind: "invuln", reach: "self", durationMs: 10_000, cooldownMs: 360_000, verified: true },

  // ── Tank limit breaks (LB1/LB2 shared names; each job's own LB3) ────
  { key: "tank-lb1", name: "Shield Wall", jobs: TANKS, actionIds: [197], statuses: [pct(1000194, "Shield Wall", 0.20)],
    kind: "limitBreak", reach: "party", durationMs: 10_000, cooldownMs: 0, verified: true },
  { key: "tank-lb2", name: "Stronghold", jobs: TANKS, actionIds: [198], statuses: [pct(1000195, "Stronghold", 0.40)],
    kind: "limitBreak", reach: "party", durationMs: 12_000, cooldownMs: 0, verified: true },
  // Paladin and Dark Knight LB3 seen in logs; Warrior (Land Waker) and
  // Gunbreaker (Gunmetal Soul) IDs are unconfirmed.
  { key: "tank-lb3", name: "Tank LB3", jobs: TANKS, actionIds: [199, 4240, 4241, 17105],
    statuses: [pct(1000196, "Last Bastion", 0.80), pct(1000863, "Land Waker", 0.80), pct(1000864, "Dark Force", 0.80), pct(1001931, "Gunmetal Soul", 0.80)],
    kind: "limitBreak", reach: "party", durationMs: 8_000, cooldownMs: 0, verified: false },

  // ── White Mage ──────────────────────────────────────────────────────
  { key: "temperance", name: "Temperance", jobs: ["White Mage"], actionIds: [16536],
    statuses: [pct(1001873, "Temperance", 0.10), marker(1001872, "Temperance")],
    kind: "partyBuff", reach: "party", durationMs: 20_000, cooldownMs: 120_000, verified: true },
  { key: "divine-caress", name: "Divine Caress", jobs: ["White Mage"], actionIds: [37011], statuses: [shield(1003903, "Divine Caress")],
    kind: "shield", reach: "party", durationMs: 10_000, cooldownMs: 120_000, gated: "Temperance", verified: true },
  { key: "aquaveil", name: "Aquaveil", jobs: ["White Mage"], actionIds: [25861], statuses: [pct(1002708, "Aquaveil", 0.15)],
    kind: "personal", reach: "target", durationMs: 8_000, cooldownMs: 60_000, verified: true },
  { key: "divine-benison", name: "Divine Benison", jobs: ["White Mage"], actionIds: [7432], statuses: [shield(1001218, "Divine Benison")],
    kind: "shield", reach: "target", durationMs: 15_000, cooldownMs: 30_000, charges: 2, verified: true },

  // ── Scholar ─────────────────────────────────────────────────────────
  { key: "sacred-soil", name: "Sacred Soil", jobs: ["Scholar"], actionIds: [188],
    statuses: [pct(1000299, "Sacred Soil", 0.10), marker(1001944, "Sacred Soil")],
    kind: "partyBuff", reach: "party", durationMs: 15_000, cooldownMs: 30_000, gated: "Aetherflow", variableDuration: true, verified: true },
  { key: "expedient", name: "Expedient", jobs: ["Scholar"], actionIds: [25868],
    statuses: [pct(1002711, "Desperate Measures", 0.10), marker(1002712, "Expedience")],
    kind: "partyBuff", reach: "party", durationMs: 20_000, cooldownMs: 120_000, verified: true },
  { key: "fey-illumination", name: "Fey Illumination", jobs: ["Scholar"], actionIds: [16538],
    statuses: [pct(1000317, "Fey Illumination", 0, 0.05), pct(1001875, "Seraphic Illumination", 0, 0.05)],
    kind: "partyBuff", reach: "party", durationMs: 20_000, cooldownMs: 120_000, verified: true },
  { key: "consolation", name: "Consolation", jobs: ["Scholar"], actionIds: [16546], statuses: [shield(1001917, "Seraphic Veil")],
    kind: "shield", reach: "party", durationMs: 30_000, cooldownMs: 30_000, charges: 2, gated: "Seraph", verified: true },
  // Galvanize comes from Adloquium, Succor/Concitation and Accession (GCDs).
  { key: "galvanize", name: "Galvanize", jobs: ["Scholar"], actionIds: [185, 37013, 37016],
    statuses: [shield(1000297, "Galvanize"), shield(1001918, "Catalyze")],
    kind: "shield", reach: "party", durationMs: 30_000, cooldownMs: 0, verified: true },

  // ── Astrologian ─────────────────────────────────────────────────────
  // A channel of up to 18s; the 10% lingers briefly after it ends.
  { key: "collective-unconscious", name: "Collective Unconscious", jobs: ["Astrologian"], actionIds: [3613],
    statuses: [pct(1000849, "Collective Unconscious", 0.10), pct(1000848, "Collective Unconscious", 0.10)],
    kind: "partyBuff", reach: "party", durationMs: 18_000, cooldownMs: 60_000, variableDuration: true, verified: true },
  // The cast itself only buffs healing; the party shields (status "Neutral
  // Sect") come from the Aspected Helios / Helios Conjunction that follows.
  { key: "neutral-sect", name: "Neutral Sect", jobs: ["Astrologian"], actionIds: [16559],
    statuses: [shield(1001921, "Neutral Sect"), marker(1001892, "Neutral Sect")],
    kind: "shield", reach: "party", durationMs: 20_000, cooldownMs: 120_000, verified: true },
  { key: "sun-sign", name: "Sun Sign", jobs: ["Astrologian"], actionIds: [37031], statuses: [pct(1003896, "Sun Sign", 0.10)],
    kind: "partyBuff", reach: "party", durationMs: 15_000, cooldownMs: 120_000, gated: "Neutral Sect", verified: true },
  { key: "exaltation", name: "Exaltation", jobs: ["Astrologian"], actionIds: [25873], statuses: [pct(1002717, "Exaltation", 0.10)],
    kind: "personal", reach: "target", durationMs: 8_000, cooldownMs: 60_000, verified: true },
  { key: "celestial-intersection", name: "Celestial Intersection", jobs: ["Astrologian"], actionIds: [16556],
    statuses: [shield(1001889, "Intersection")],
    kind: "shield", reach: "target", durationMs: 30_000, cooldownMs: 30_000, charges: 2, verified: true },
  { key: "the-bole", name: "The Bole", jobs: ["Astrologian"], actionIds: [37027], statuses: [pct(1003890, "The Bole", 0.10)],
    kind: "personal", reach: "target", durationMs: 15_000, cooldownMs: 60_000, gated: "Card draw", verified: true },
  { key: "the-spire", name: "The Spire", jobs: ["Astrologian"], actionIds: [37025], statuses: [shield(1003892, "The Spire")],
    kind: "shield", reach: "target", durationMs: 15_000, cooldownMs: 60_000, gated: "Card draw", verified: true },

  // ── Sage ────────────────────────────────────────────────────────────
  { key: "kerachole", name: "Kerachole", jobs: ["Sage"], actionIds: [24298], statuses: [pct(1002618, "Kerachole", 0.10)],
    kind: "partyBuff", reach: "party", durationMs: 15_000, cooldownMs: 30_000, gated: "Addersgall", verified: true },
  { key: "taurochole", name: "Taurochole", jobs: ["Sage"], actionIds: [24303], statuses: [pct(1002619, "Taurochole", 0.10)],
    kind: "personal", reach: "target", durationMs: 15_000, cooldownMs: 45_000, gated: "Addersgall", verified: true },
  { key: "holos", name: "Holos", jobs: ["Sage"], actionIds: [24310],
    statuses: [pct(1003003, "Holos", 0.10), shield(1003365, "Holosakos")],
    kind: "partyBuff", reach: "party", durationMs: 20_000, cooldownMs: 120_000, verified: true },
  { key: "panhaima", name: "Panhaima", jobs: ["Sage"], actionIds: [24311],
    statuses: [shield(1002613, "Panhaima"), shield(1002643, "Panhaimatinon")],
    kind: "shield", reach: "party", durationMs: 15_000, cooldownMs: 120_000, verified: true },
  // Only the Haimatinon stacks have been seen absorbing; the Haima status ID
  // is unconfirmed.
  { key: "haima", name: "Haima", jobs: ["Sage"], actionIds: [24305],
    statuses: [shield(1002612, "Haima"), shield(1002642, "Haimatinon")],
    kind: "shield", reach: "target", durationMs: 15_000, cooldownMs: 120_000, verified: false },
  { key: "eukrasian-prognosis", name: "Eukrasian Prognosis", jobs: ["Sage"], actionIds: [24292, 37034],
    statuses: [shield(1002609, "Eukrasian Prognosis")],
    kind: "shield", reach: "party", durationMs: 30_000, cooldownMs: 0, verified: true },
  { key: "eukrasian-diagnosis", name: "Eukrasian Diagnosis", jobs: ["Sage"], actionIds: [24291],
    statuses: [shield(1002607, "Eukrasian Diagnosis"), shield(1002608, "Differential Diagnosis")],
    kind: "shield", reach: "target", durationMs: 30_000, cooldownMs: 0, verified: true },

  // ── Physical ranged ─────────────────────────────────────────────────
  { key: "troubadour", name: "Troubadour", jobs: ["Bard"], actionIds: [7405], statuses: [pct(1001934, "Troubadour", 0.15)],
    kind: "partyBuff", reach: "party", durationMs: 15_000, cooldownMs: 90_000, verified: true },
  { key: "tactician", name: "Tactician", jobs: ["Machinist"], actionIds: [16889], statuses: [pct(1001951, "Tactician", 0.15)],
    kind: "partyBuff", reach: "party", durationMs: 15_000, cooldownMs: 90_000, verified: false },
  { key: "dismantle", name: "Dismantle", jobs: ["Machinist"], actionIds: [2887], statuses: [pct(1000860, "Dismantle", 0.10)],
    kind: "bossDebuff", reach: "party", durationMs: 10_000, cooldownMs: 120_000, verified: false },
  { key: "shield-samba", name: "Shield Samba", jobs: ["Dancer"], actionIds: [16012], statuses: [pct(1001826, "Shield Samba", 0.15)],
    kind: "partyBuff", reach: "party", durationMs: 15_000, cooldownMs: 90_000, verified: true },
  // Improvised Finish (25789) is the release, not a second use: only the
  // opening Improvisation starts the cooldown.
  { key: "improvisation", name: "Improvisation", jobs: ["Dancer"], actionIds: [16014], statuses: [shield(1002697, "Improvised Finish")],
    kind: "shield", reach: "party", durationMs: 30_000, cooldownMs: 120_000, verified: true },

  // ── Casters ─────────────────────────────────────────────────────────
  { key: "magick-barrier", name: "Magick Barrier", jobs: ["Red Mage"], actionIds: [25857], statuses: [pct(1002707, "Magick Barrier", 0, 0.10)],
    kind: "partyBuff", reach: "party", durationMs: 10_000, cooldownMs: 120_000, verified: false },
  { key: "manaward", name: "Manaward", jobs: ["Black Mage"], actionIds: [157], statuses: [shield(1000168, "Manaward")],
    kind: "shield", reach: "self", durationMs: 20_000, cooldownMs: 120_000, verified: true },
  { key: "tempera-coat", name: "Tempera Coat", jobs: ["Pictomancer"], actionIds: [34685], statuses: [shield(1003686, "Tempera Coat")],
    kind: "shield", reach: "self", durationMs: 10_000, cooldownMs: 120_000,
    gated: "Cooldown shortens when the shield is fully absorbed (75–100s seen)", verified: true },
  { key: "tempera-grassa", name: "Tempera Grassa", jobs: ["Pictomancer"], actionIds: [34686], statuses: [shield(1003687, "Tempera Grassa")],
    kind: "shield", reach: "party", durationMs: 10_000, cooldownMs: 120_000, gated: "Tempera Coat", verified: true },
  { key: "radiant-aegis", name: "Radiant Aegis", jobs: ["Summoner"], actionIds: [25799], statuses: [shield(1002702, "Radiant Aegis")],
    kind: "shield", reach: "self", durationMs: 30_000, cooldownMs: 60_000, charges: 2, verified: false },

  // ── Melee personals ─────────────────────────────────────────────────
  { key: "tengentsu", name: "Tengentsu", jobs: ["Samurai"], actionIds: [36962],
    statuses: [pct(1003853, "Tengentsu", 0.10), marker(1003854, "Tengentsu's Foresight")],
    kind: "personal", reach: "self", durationMs: 4_000, cooldownMs: 15_000, verified: true },
  { key: "arcane-crest", name: "Arcane Crest", jobs: ["Reaper"], actionIds: [24404], statuses: [shield(1002597, "Crest of Time Borrowed")],
    kind: "shield", reach: "self", durationMs: 5_000, cooldownMs: 30_000, verified: true },
  { key: "shade-shift", name: "Shade Shift", jobs: ["Ninja"], actionIds: [2241], statuses: [shield(1000488, "Shade Shift")],
    kind: "shield", reach: "self", durationMs: 20_000, cooldownMs: 120_000, verified: false },
  { key: "riddle-of-earth", name: "Riddle of Earth", jobs: ["Monk"], actionIds: [7394], statuses: [pct(1001179, "Riddle of Earth", 0.20)],
    kind: "personal", reach: "self", durationMs: 10_000, cooldownMs: 120_000, verified: false },
];

// Status ID -> (entry, status). One status belongs to exactly one entry.
export const FFXIV_STATUS_INDEX: Map<number, { entry: CatalogEntry; status: CatalogStatus }> = (() => {
  const m = new Map<number, { entry: CatalogEntry; status: CatalogStatus }>();
  for (const entry of FFXIV_MITIGATION_CATALOG) {
    for (const status of entry.statuses) {
      if (!m.has(status.id)) m.set(status.id, { entry, status });
    }
  }
  return m;
})();

// Action ID -> entry.
export const FFXIV_ACTION_INDEX: Map<number, CatalogEntry> = new Map(
  FFXIV_MITIGATION_CATALOG.flatMap((e) => e.actionIds.map((id) => [id, e] as const))
);

// FFLogs ability `type` values (masterData). Anything else is treated as
// unknown by the analysis.
export const FFXIV_DAMAGE_TYPE = { physical: 128, magical: 1024, unaspected: 32 } as const;

export const FFXIV_MITIGATION: MitigationGame = {
  catalog:     FFXIV_MITIGATION_CATALOG,
  statusIndex: FFXIV_STATUS_INDEX,
  actionIndex: FFXIV_ACTION_INDEX,
  damageColumn(type) {
    if (type === FFXIV_DAMAGE_TYPE.physical) return "physical";
    if (type === FFXIV_DAMAGE_TYPE.magical) return "magical";
    if (type === FFXIV_DAMAGE_TYPE.unaspected) return "none";
    return undefined;
  },
};
