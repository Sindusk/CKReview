// lib/mitigation/ffxiv-catalog.ts
//
// Every FFXIV mitigation the analysis recognizes, shared by all fights
// (docs/archive/mitigation-redesign.md, Model section 2). Keyed by FFLogs IDs:
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
// Shield sizes (check script section 4, 2026-10-11): only The Blackest
// Night scales with the target's max HP, 25.0% on 92% of 1,430
// applications (the rest partly consumed). Guardian's Will, Stem the Tide
// and Brutal Shell are heal-potency barriers (Guardian's Will 20-24%,
// varying with healing buffs), so they keep the median-absorb estimate.
//
// Level sync (2026-10-16): older ultimates sync players below the cap
// (lib/damage/ffxiv/patches.ts levelOf: TEA 80, TOP/DSR 90, UCoB/UwU 70).
// Entries carry `minLevel` and `belowLevel` bands; ffxivMitigationAt(level)
// resolves the catalog the analysis plans with. Checked in TEA (6pzyKv8f…,
// 30 pulls): synced players cast the base actions (Vengeance 44, Raw
// Intuition 3551, Sentinel 17, Sheltron 3542), never the upgrades, and
// Reprisal/Feint/Addle last 10s (Enhanced Reprisal/Feint/Addle are 98).
// Shadow Wall and Nebula seen in TOP and synced dungeons, Third Eye and
// Heart of Stone in synced content. Learn levels match XIVAPI's
// ClassJobLevel (lib/damage/ffxiv/action-levels.ts); trait levels (the
// `below` values) are the 7.x job guides', and a band's `verified` says
// whether its IDs were seen in a log.
//
// Damage type matters: `physical` and `magical` are kept separate (Feint
// 10% physical / 5% magical, Addle the reverse). Unaspected hits (FFLogs
// ability type 32) ignore % mitigation entirely; only shields apply.

import type { CatalogEntry, CatalogStatus, MitigationGame } from "./types";
import { DEPLOYMENT_STATUS_OFFSET } from "./ffxiv-deployment";

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
    kind: "bossDebuff", reach: "party", durationMs: 15_000, cooldownMs: 60_000, verified: true,
    minLevel: 22, belowLevel: [{ below: 98, as: { durationMs: 10_000 } }] },
  { key: "feint",     name: "Feint",     jobs: MELEE,  actionIds: [7549], statuses: [pct(1001195, "Feint", 0.10, 0.05)],
    kind: "bossDebuff", reach: "party", durationMs: 15_000, cooldownMs: 90_000, verified: true,
    minLevel: 22, belowLevel: [{ below: 98, as: { durationMs: 10_000 } }] },
  { key: "addle",     name: "Addle",     jobs: CASTERS, actionIds: [7560], statuses: [pct(1001203, "Addle", 0.05, 0.10)],
    kind: "bossDebuff", reach: "party", durationMs: 15_000, cooldownMs: 90_000, verified: true,
    minLevel: 8, belowLevel: [{ below: 98, as: { durationMs: 10_000 } }] },
  { key: "rampart",   name: "Rampart",   jobs: TANKS,  actionIds: [7531], statuses: [pct(1001191, "Rampart", 0.20)],
    kind: "personal", reach: "self", durationMs: 20_000, cooldownMs: 90_000, verified: true, minLevel: 8 },

  // ── Paladin ─────────────────────────────────────────────────────────
  { key: "divine-veil", name: "Divine Veil", jobs: ["Paladin"], actionIds: [3540], statuses: [shield(1001362, "Divine Veil")],
    kind: "shield", reach: "party", durationMs: 20_000, cooldownMs: 90_000, verified: true, minLevel: 56 },
  { key: "passage-of-arms", name: "Passage of Arms", jobs: ["Paladin"], actionIds: [7385],
    statuses: [pct(1001176, "Arms Up", 0.15), marker(1001175, "Passage of Arms")],
    kind: "partyBuff", reach: "party", durationMs: 18_000, cooldownMs: 120_000, variableDuration: true,
    situational: "channelled, with the party behind the Paladin", verified: true, minLevel: 70 },
  { key: "guardian", name: "Guardian", jobs: ["Paladin"], actionIds: [36920],
    statuses: [pct(1003829, "Guardian", 0.40), shield(1003830, "Guardian's Will")],
    kind: "personal", reach: "self", durationMs: 15_000, cooldownMs: 120_000, verified: true,
    minLevel: 38, belowLevel: [{ below: 92, as: { name: "Sentinel", actionIds: [17],
      statuses: [pct(1000074, "Sentinel", 0.30)], icon: "000000-000151.png", verified: true } }] },
  // Bulwark makes every hit a block; block is outside FFLogs' multiplier.
  { key: "bulwark", name: "Bulwark", jobs: ["Paladin"], actionIds: [22], statuses: [marker(1000077, "Bulwark")],
    kind: "personal", reach: "self", durationMs: 10_000, cooldownMs: 90_000, verified: true, minLevel: 52 },
  { key: "holy-sheltron", name: "Holy Sheltron", jobs: ["Paladin"], actionIds: [25746],
    statuses: [pct(1002674, "Holy Sheltron", 0.15), pct(1002675, "Knight's Resolve", 0.15)],
    kind: "personal", reach: "self", durationMs: 8_000, cooldownMs: 5_000, gated: "Oath Gauge", verified: true,
    minLevel: 35, belowLevel: [{ below: 82, as: { name: "Sheltron", actionIds: [3542],
      statuses: [pct(1001856, "Sheltron", 0.15)], durationMs: 6_000, icon: "002000-002510.png", verified: true } }] },
  // +10% more when the Paladin has Rampart or Guardian up; the base is kept.
  { key: "intervention", name: "Intervention", jobs: ["Paladin"], actionIds: [7382], statuses: [pct(1001174, "Intervention", 0.10)],
    kind: "personal", reach: "target", durationMs: 8_000, cooldownMs: 10_000, gated: "Oath Gauge", verified: true, minLevel: 62 },
  { key: "hallowed-ground", name: "Hallowed Ground", jobs: ["Paladin"], actionIds: [30], statuses: [pct(1000082, "Hallowed Ground", 1)],
    kind: "invuln", reach: "self", durationMs: 10_000, cooldownMs: 420_000, verified: true, minLevel: 50 },

  // ── Warrior (seen only in synced TEA pulls, as Vengeance and Raw Intuition) ──
  { key: "shake-it-off", name: "Shake It Off", jobs: ["Warrior"], actionIds: [7388], statuses: [shield(1001457, "Shake It Off")],
    kind: "shield", reach: "party", durationMs: 30_000, cooldownMs: 90_000, verified: false, minLevel: 68 },
  { key: "damnation", name: "Damnation", jobs: ["Warrior"], actionIds: [36923], statuses: [pct(1003832, "Damnation", 0.40)],
    kind: "personal", reach: "self", durationMs: 15_000, cooldownMs: 120_000, verified: false,
    minLevel: 38, belowLevel: [{ below: 92, as: { name: "Vengeance", actionIds: [44],
      statuses: [pct(1000089, "Vengeance", 0.30)], icon: "000000-000267.png", verified: true } }] },
  { key: "bloodwhetting", name: "Bloodwhetting", jobs: ["Warrior"], actionIds: [25751],
    statuses: [pct(1002678, "Bloodwhetting", 0.10), pct(1002679, "Stem the Flow", 0.10), shield(1002680, "Stem the Tide")],
    kind: "personal", reach: "self", durationMs: 8_000, cooldownMs: 25_000, verified: false,
    minLevel: 56, belowLevel: [{ below: 82, as: { name: "Raw Intuition", actionIds: [3551],
      statuses: [pct(1000735, "Raw Intuition", 0.10)], durationMs: 6_000, icon: "002000-002559.png", verified: true } }] },
  // Below 82 (no Enhanced Nascent Flash) there is no Stem the Flow / Tide.
  { key: "nascent-flash", name: "Nascent Flash", jobs: ["Warrior"], actionIds: [16464],
    statuses: [pct(1001858, "Nascent Glint", 0.10), pct(1002679, "Stem the Flow", 0.10), shield(1002680, "Stem the Tide")],
    kind: "personal", reach: "target", durationMs: 8_000, cooldownMs: 25_000, verified: false,
    minLevel: 76, belowLevel: [{ below: 82, as: { statuses: [pct(1001858, "Nascent Glint", 0.10)], durationMs: 6_000 } }] },
  { key: "holmgang", name: "Holmgang", jobs: ["Warrior"], actionIds: [43], statuses: [pct(1000409, "Holmgang", 1)],
    kind: "invuln", reach: "self", durationMs: 10_000, cooldownMs: 240_000, verified: false, minLevel: 42 },

  // ── Dark Knight ─────────────────────────────────────────────────────
  { key: "dark-missionary", name: "Dark Missionary", jobs: ["Dark Knight"], actionIds: [16471],
    statuses: [pct(1001894, "Dark Missionary", 0.05, 0.10)],
    kind: "partyBuff", reach: "party", durationMs: 15_000, cooldownMs: 90_000, verified: true, minLevel: 66 },
  { key: "dark-mind", name: "Dark Mind", jobs: ["Dark Knight"], actionIds: [3634], statuses: [pct(1000746, "Dark Mind", 0.10, 0.20)],
    kind: "personal", reach: "self", durationMs: 10_000, cooldownMs: 60_000, verified: true, minLevel: 45 },
  { key: "shadowed-vigil", name: "Shadowed Vigil", jobs: ["Dark Knight"], actionIds: [36927],
    statuses: [pct(1003835, "Shadowed Vigil", 0.40), marker(1003902, "Vigilant")],
    kind: "personal", reach: "self", durationMs: 15_000, cooldownMs: 120_000, verified: true,
    minLevel: 38, belowLevel: [{ below: 92, as: { name: "Shadow Wall", actionIds: [3636],
      statuses: [pct(1000747, "Shadow Wall", 0.30)], icon: "003000-003075.png", verified: true } }] },
  { key: "the-blackest-night", name: "The Blackest Night", jobs: ["Dark Knight"], actionIds: [7393],
    statuses: [shield(1001178, "Blackest Night")],
    kind: "shield", reach: "target", durationMs: 7_000, cooldownMs: 15_000, gated: "MP", shieldPctMaxHp: 0.25, verified: true, minLevel: 70 },
  { key: "oblation", name: "Oblation", jobs: ["Dark Knight"], actionIds: [25754], statuses: [pct(1002682, "Oblation", 0.10)],
    kind: "personal", reach: "target", durationMs: 10_000, cooldownMs: 60_000, charges: 2, verified: true, minLevel: 82 },
  { key: "living-dead", name: "Living Dead", jobs: ["Dark Knight"], actionIds: [3638],
    statuses: [pct(1000810, "Living Dead", 1), pct(1000811, "Walking Dead", 1), marker(1003255, "Undead Rebirth")],
    kind: "invuln", reach: "self", durationMs: 10_000, cooldownMs: 300_000, trailingInvulnMs: 10_000, verified: true, minLevel: 50 },

  // ── Gunbreaker ──────────────────────────────────────────────────────
  { key: "heart-of-light", name: "Heart of Light", jobs: ["Gunbreaker"], actionIds: [16160],
    statuses: [pct(1001839, "Heart of Light", 0.05, 0.10)],
    kind: "partyBuff", reach: "party", durationMs: 15_000, cooldownMs: 90_000, verified: true, minLevel: 64 },
  { key: "camouflage", name: "Camouflage", jobs: ["Gunbreaker"], actionIds: [16140], statuses: [pct(1001832, "Camouflage", 0.10)],
    kind: "personal", reach: "self", durationMs: 20_000, cooldownMs: 90_000, verified: true, minLevel: 6 },
  { key: "great-nebula", name: "Great Nebula", jobs: ["Gunbreaker"], actionIds: [36935], statuses: [pct(1003838, "Great Nebula", 0.40)],
    kind: "personal", reach: "self", durationMs: 15_000, cooldownMs: 120_000, verified: true,
    minLevel: 38, belowLevel: [{ below: 92, as: { name: "Nebula", actionIds: [16148],
      statuses: [pct(1001834, "Nebula", 0.30)], icon: "003000-003412.png", verified: true } }] },
  { key: "heart-of-corundum", name: "Heart of Corundum", jobs: ["Gunbreaker"], actionIds: [25758],
    statuses: [pct(1002683, "Heart of Corundum", 0.15), pct(1002684, "Clarity of Corundum", 0.15)],
    kind: "personal", reach: "target", durationMs: 8_000, cooldownMs: 25_000, verified: true,
    minLevel: 68, belowLevel: [{ below: 82, as: { name: "Heart of Stone", actionIds: [16161],
      statuses: [pct(1001840, "Heart of Stone", 0.15)], durationMs: 7_000, icon: "003000-003425.png", verified: true } }] },
  // From the Brutal Shell combo GCD: no cooldown of its own.
  { key: "brutal-shell", name: "Brutal Shell", jobs: ["Gunbreaker"], actionIds: [16139], statuses: [shield(1001898, "Brutal Shell")],
    kind: "shield", reach: "self", durationMs: 30_000, cooldownMs: 0, verified: true, minLevel: 4 },
  { key: "superbolide", name: "Superbolide", jobs: ["Gunbreaker"], actionIds: [16152], statuses: [pct(1001836, "Superbolide", 1)],
    kind: "invuln", reach: "self", durationMs: 10_000, cooldownMs: 360_000, verified: true, minLevel: 50 },

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
    kind: "partyBuff", reach: "party", durationMs: 20_000, cooldownMs: 120_000, verified: true, minLevel: 80 },
  { key: "divine-caress", name: "Divine Caress", jobs: ["White Mage"], actionIds: [37011], statuses: [shield(1003903, "Divine Caress")],
    kind: "shield", reach: "party", durationMs: 10_000, cooldownMs: 120_000, gated: "Temperance", verified: true, minLevel: 100 },
  { key: "aquaveil", name: "Aquaveil", jobs: ["White Mage"], actionIds: [25861], statuses: [pct(1002708, "Aquaveil", 0.15)],
    kind: "personal", reach: "target", durationMs: 8_000, cooldownMs: 60_000, verified: true, minLevel: 86 },
  { key: "divine-benison", name: "Divine Benison", jobs: ["White Mage"], actionIds: [7432], statuses: [shield(1001218, "Divine Benison")],
    kind: "shield", reach: "target", durationMs: 15_000, cooldownMs: 30_000, charges: 2, verified: true,
    minLevel: 66, belowLevel: [{ below: 88, as: { charges: 1 } }] },

  // ── Scholar ─────────────────────────────────────────────────────────
  { key: "sacred-soil", name: "Sacred Soil", jobs: ["Scholar"], actionIds: [188],
    statuses: [pct(1000299, "Sacred Soil", 0.10), marker(1001944, "Sacred Soil")],
    kind: "partyBuff", reach: "party", durationMs: 15_000, cooldownMs: 30_000, gated: "Aetherflow", variableDuration: true, verified: true, minLevel: 50 },
  { key: "expedient", name: "Expedient", jobs: ["Scholar"], actionIds: [25868],
    statuses: [pct(1002711, "Desperate Measures", 0.10), marker(1002712, "Expedience")],
    kind: "partyBuff", reach: "party", durationMs: 20_000, cooldownMs: 120_000, verified: true, minLevel: 90 },
  { key: "fey-illumination", name: "Fey Illumination", jobs: ["Scholar"], actionIds: [16538],
    statuses: [pct(1000317, "Fey Illumination", 0, 0.05), pct(1001875, "Seraphic Illumination", 0, 0.05)],
    kind: "partyBuff", reach: "party", durationMs: 20_000, cooldownMs: 120_000, verified: true, minLevel: 40 },
  { key: "consolation", name: "Consolation", jobs: ["Scholar"], actionIds: [16546], statuses: [shield(1001917, "Seraphic Veil")],
    kind: "shield", reach: "party", durationMs: 30_000, cooldownMs: 30_000, charges: 2, gated: "Seraph", verified: true, minLevel: 80 },
  // Galvanize comes from Adloquium, Succor/Concitation and Accession (GCDs).
  { key: "galvanize", name: "Galvanize", jobs: ["Scholar"], actionIds: [185, 37013, 37016],
    statuses: [shield(1000297, "Galvanize"), shield(1001918, "Catalyze")],
    kind: "shield", reach: "party", durationMs: 30_000, cooldownMs: 0, verified: true },
  // "Spreadlo": Adloquium spread to the party by Deployment Tactics, a
  // planned party shield (user, 2026-10-15). Its statuses are Galvanize and
  // Catalyze renamed by ffxiv-deployment.ts when a Deployment gave them out.
  // Cast 3585 seen in JZ1KXhDbqkNH3jxR and a dozen other FFXIV samples.
  { key: "deployment-tactics", name: "Deployment Tactics", jobs: ["Scholar"], actionIds: [3585],
    statuses: [shield(DEPLOYMENT_STATUS_OFFSET + 1000297, "Galvanize (spread)"), shield(DEPLOYMENT_STATUS_OFFSET + 1001918, "Catalyze (spread)")],
    kind: "shield", reach: "party", durationMs: 30_000, cooldownMs: 90_000, gated: "Adloquium first (a crit for Catalyze)", verified: true,
    minLevel: 56, belowLevel: [{ below: 88, as: { cooldownMs: 120_000 } }] },

  // ── Astrologian ─────────────────────────────────────────────────────
  // A channel of up to 18s; the 10% lingers briefly after it ends.
  // Astrologians cancel the channel almost at once and rely on the linger
  // (user, 2026-10-09), so it is a generic mitigation, not situational.
  { key: "collective-unconscious", name: "Collective Unconscious", jobs: ["Astrologian"], actionIds: [3613],
    statuses: [pct(1000849, "Collective Unconscious", 0.10), pct(1000848, "Collective Unconscious", 0.10)],
    kind: "partyBuff", reach: "party", durationMs: 18_000, cooldownMs: 60_000, variableDuration: true, verified: true, minLevel: 58 },
  // The cast itself only buffs healing; the party shields (status "Neutral
  // Sect") come from the Aspected Helios / Helios Conjunction that follows.
  { key: "neutral-sect", name: "Neutral Sect", jobs: ["Astrologian"], actionIds: [16559],
    statuses: [shield(1001921, "Neutral Sect"), marker(1001892, "Neutral Sect")],
    kind: "shield", reach: "party", durationMs: 20_000, cooldownMs: 120_000, verified: true, minLevel: 80 },
  { key: "sun-sign", name: "Sun Sign", jobs: ["Astrologian"], actionIds: [37031], statuses: [pct(1003896, "Sun Sign", 0.10)],
    kind: "partyBuff", reach: "party", durationMs: 15_000, cooldownMs: 120_000, gated: "Neutral Sect", verified: true, minLevel: 100 },
  { key: "exaltation", name: "Exaltation", jobs: ["Astrologian"], actionIds: [25873], statuses: [pct(1002717, "Exaltation", 0.10)],
    kind: "personal", reach: "target", durationMs: 8_000, cooldownMs: 60_000, verified: true, minLevel: 86 },
  { key: "celestial-intersection", name: "Celestial Intersection", jobs: ["Astrologian"], actionIds: [16556],
    statuses: [shield(1001889, "Intersection")],
    kind: "shield", reach: "target", durationMs: 30_000, cooldownMs: 30_000, charges: 2, verified: true,
    minLevel: 74, belowLevel: [{ below: 88, as: { charges: 1 } }] },
  // Cards are not planned as mitigation (user, 2026-10-06): kept so their
  // statuses are understood on a hit, but out of the sheet.
  { key: "the-bole", name: "The Bole", jobs: ["Astrologian"], actionIds: [37027], statuses: [pct(1003890, "The Bole", 0.10)],
    kind: "personal", reach: "target", durationMs: 15_000, cooldownMs: 60_000, gated: "Card draw", inSheet: false, verified: true },
  { key: "the-spire", name: "The Spire", jobs: ["Astrologian"], actionIds: [37025], statuses: [shield(1003892, "The Spire")],
    kind: "shield", reach: "target", durationMs: 15_000, cooldownMs: 60_000, gated: "Card draw", inSheet: false, verified: true },

  // ── Sage ────────────────────────────────────────────────────────────
  { key: "kerachole", name: "Kerachole", jobs: ["Sage"], actionIds: [24298], statuses: [pct(1002618, "Kerachole", 0.10)],
    kind: "partyBuff", reach: "party", durationMs: 15_000, cooldownMs: 30_000, gated: "Addersgall", verified: true, minLevel: 50 },
  { key: "taurochole", name: "Taurochole", jobs: ["Sage"], actionIds: [24303], statuses: [pct(1002619, "Taurochole", 0.10)],
    kind: "personal", reach: "target", durationMs: 15_000, cooldownMs: 45_000, gated: "Addersgall", verified: true, minLevel: 62 },
  { key: "holos", name: "Holos", jobs: ["Sage"], actionIds: [24310],
    statuses: [pct(1003003, "Holos", 0.10), shield(1003365, "Holosakos")],
    kind: "partyBuff", reach: "party", durationMs: 20_000, cooldownMs: 120_000, verified: true, minLevel: 76 },
  { key: "panhaima", name: "Panhaima", jobs: ["Sage"], actionIds: [24311],
    statuses: [shield(1002613, "Panhaima"), shield(1002643, "Panhaimatinon")],
    kind: "shield", reach: "party", durationMs: 15_000, cooldownMs: 120_000, verified: true, minLevel: 80 },
  // Only the Haimatinon stacks have been seen absorbing; the Haima status ID
  // is unconfirmed.
  { key: "haima", name: "Haima", jobs: ["Sage"], actionIds: [24305],
    statuses: [shield(1002612, "Haima"), shield(1002642, "Haimatinon")],
    kind: "shield", reach: "target", durationMs: 15_000, cooldownMs: 120_000, verified: false, minLevel: 70 },
  { key: "eukrasian-prognosis", name: "Eukrasian Prognosis", jobs: ["Sage"], actionIds: [24292, 37034],
    statuses: [shield(1002609, "Eukrasian Prognosis")],
    kind: "shield", reach: "party", durationMs: 30_000, cooldownMs: 0, verified: true },
  { key: "eukrasian-diagnosis", name: "Eukrasian Diagnosis", jobs: ["Sage"], actionIds: [24291],
    statuses: [shield(1002607, "Eukrasian Diagnosis"), shield(1002608, "Differential Diagnosis")],
    kind: "shield", reach: "target", durationMs: 30_000, cooldownMs: 0, verified: true },

  // ── Physical ranged ─────────────────────────────────────────────────
  // Synced, each is 10%, and 120s below 88 (Enhanced Troubadour / Tactician
  // / Shield Samba). Shield Samba measured: 10% on 75% of 12,000 TEA hits,
  // and on all 15 TOP hits (level 90, casts already 90s apart) where it was
  // the only reduction; casts 120s apart in TEA. The 15% is a trait between 91 and 100; `below: 91` stands for it
  // (no ultimate syncs between). The other two follow the same traits.
  { key: "troubadour", name: "Troubadour", jobs: ["Bard"], actionIds: [7405], statuses: [pct(1001934, "Troubadour", 0.15)],
    kind: "partyBuff", reach: "party", durationMs: 15_000, cooldownMs: 90_000, verified: true, minLevel: 62,
    belowLevel: [{ below: 91, as: { statuses: [pct(1001934, "Troubadour", 0.10)] } }, { below: 88, as: { cooldownMs: 120_000 } }] },
  { key: "tactician", name: "Tactician", jobs: ["Machinist"], actionIds: [16889], statuses: [pct(1001951, "Tactician", 0.15)],
    kind: "partyBuff", reach: "party", durationMs: 15_000, cooldownMs: 90_000, verified: false, minLevel: 56,
    belowLevel: [{ below: 91, as: { statuses: [pct(1001951, "Tactician", 0.10)] } }, { below: 88, as: { cooldownMs: 120_000 } }] },
  { key: "dismantle", name: "Dismantle", jobs: ["Machinist"], actionIds: [2887], statuses: [pct(1000860, "Dismantle", 0.10)],
    kind: "bossDebuff", reach: "party", durationMs: 10_000, cooldownMs: 120_000, verified: false, minLevel: 62 },
  { key: "shield-samba", name: "Shield Samba", jobs: ["Dancer"], actionIds: [16012], statuses: [pct(1001826, "Shield Samba", 0.15)],
    kind: "partyBuff", reach: "party", durationMs: 15_000, cooldownMs: 90_000, verified: true,
    minLevel: 56,
    belowLevel: [{ below: 91, as: { statuses: [pct(1001826, "Shield Samba", 0.10)] } }, { below: 88, as: { cooldownMs: 120_000 } }] },
  // Improvised Finish (25789) is the release, not a second use: only the
  // opening Improvisation starts the cooldown.
  { key: "improvisation", name: "Improvisation", jobs: ["Dancer"], actionIds: [16014], statuses: [shield(1002697, "Improvised Finish")],
    kind: "shield", reach: "party", durationMs: 30_000, cooldownMs: 120_000, verified: true, minLevel: 80 },

  // ── Casters ─────────────────────────────────────────────────────────
  { key: "magick-barrier", name: "Magick Barrier", jobs: ["Red Mage"], actionIds: [25857], statuses: [pct(1002707, "Magick Barrier", 0, 0.10)],
    kind: "partyBuff", reach: "party", durationMs: 10_000, cooldownMs: 120_000, verified: false, minLevel: 86 },
  { key: "manaward", name: "Manaward", jobs: ["Black Mage"], actionIds: [157], statuses: [shield(1000168, "Manaward")],
    kind: "shield", reach: "self", durationMs: 20_000, cooldownMs: 120_000, verified: true, minLevel: 30 },
  { key: "tempera-coat", name: "Tempera Coat", jobs: ["Pictomancer"], actionIds: [34685], statuses: [shield(1003686, "Tempera Coat")],
    kind: "shield", reach: "self", durationMs: 10_000, cooldownMs: 120_000,
    gated: "Cooldown shortens when the shield is fully absorbed (75–100s seen)", verified: true, minLevel: 10 },
  { key: "tempera-grassa", name: "Tempera Grassa", jobs: ["Pictomancer"], actionIds: [34686], statuses: [shield(1003687, "Tempera Grassa")],
    kind: "shield", reach: "party", durationMs: 10_000, cooldownMs: 120_000, gated: "Tempera Coat", verified: true, minLevel: 88 },
  { key: "radiant-aegis", name: "Radiant Aegis", jobs: ["Summoner"], actionIds: [25799], statuses: [shield(1002702, "Radiant Aegis")],
    kind: "shield", reach: "self", durationMs: 30_000, cooldownMs: 60_000, charges: 2, verified: false, minLevel: 2 },

  // ── Melee personals ─────────────────────────────────────────────────
  { key: "tengentsu", name: "Tengentsu", jobs: ["Samurai"], actionIds: [36962],
    statuses: [pct(1003853, "Tengentsu", 0.10), marker(1003854, "Tengentsu's Foresight")],
    kind: "personal", reach: "self", durationMs: 4_000, cooldownMs: 15_000, verified: true,
    minLevel: 6, belowLevel: [{ below: 82, as: { name: "Third Eye", actionIds: [7498],
      statuses: [pct(1001232, "Third Eye", 0.10)], icon: "003000-003153.png", verified: true } }] },
  { key: "arcane-crest", name: "Arcane Crest", jobs: ["Reaper"], actionIds: [24404], statuses: [shield(1002597, "Crest of Time Borrowed")],
    kind: "shield", reach: "self", durationMs: 5_000, cooldownMs: 30_000, verified: true, minLevel: 40 },
  { key: "shade-shift", name: "Shade Shift", jobs: ["Ninja"], actionIds: [2241], statuses: [shield(1000488, "Shade Shift")],
    kind: "shield", reach: "self", durationMs: 20_000, cooldownMs: 120_000, verified: false, minLevel: 2 },
  { key: "riddle-of-earth", name: "Riddle of Earth", jobs: ["Monk"], actionIds: [7394], statuses: [pct(1001179, "Riddle of Earth", 0.20)],
    kind: "personal", reach: "self", durationMs: 10_000, cooldownMs: 120_000, verified: false, minLevel: 64 },
];

// FFLogs icon filename per entry (lib/ability-icons.ts resolves it), from
// the masterData ability lists of the sample reports, 2026-10-08. A new
// entry's filename is the `icon` of its action ID in any report's
// masterData.abilities.
const FFXIV_MITIGATION_ICONS: Record<string, string> = {
  "reprisal": "000000-000806.png", "feint": "000000-000828.png", "addle": "000000-000861.png",
  "rampart": "000000-000801.png", "divine-veil": "002000-002508.png", "passage-of-arms": "002000-002515.png",
  "guardian": "002000-002524.png", "bulwark": "000000-000167.png", "holy-sheltron": "002000-002950.png",
  "intervention": "002000-002512.png", "hallowed-ground": "002000-002502.png", "shake-it-off": "002000-002563.png",
  "damnation": "002000-002573.png", "bloodwhetting": "002000-002569.png", "nascent-flash": "002000-002567.png",
  "holmgang": "000000-000266.png", "dark-missionary": "003000-003087.png", "dark-mind": "003000-003076.png",
  "shadowed-vigil": "003000-003094.png", "the-blackest-night": "003000-003081.png", "oblation": "003000-003089.png",
  "living-dead": "003000-003077.png", "heart-of-light": "003000-003424.png", "camouflage": "003000-003404.png",
  "great-nebula": "003000-003435.png", "heart-of-corundum": "003000-003430.png", "brutal-shell": "003000-003403.png",
  "superbolide": "003000-003416.png", "tank-lb1": "000000-000103.png", "tank-lb2": "000000-000103.png",
  "tank-lb3": "000000-000103.png", "temperance": "002000-002645.png", "divine-caress": "002000-002128.png",
  "aquaveil": "002000-002648.png", "divine-benison": "002000-002638.png", "sacred-soil": "002000-002804.png",
  "expedient": "002000-002878.png", "fey-illumination": "002000-002853.png", "consolation": "002000-002851.png",
  "galvanize": "002000-002801.png", "deployment-tactics": "002000-002808.png", "collective-unconscious": "003000-003140.png", "neutral-sect": "003000-003552.png",
  "sun-sign": "003000-003109.png", "exaltation": "003000-003561.png", "celestial-intersection": "003000-003556.png",
  "the-bole": "003000-003111.png", "the-spire": "003000-003115.png", "kerachole": "003000-003666.png",
  "taurochole": "003000-003671.png", "holos": "003000-003678.png", "panhaima": "003000-003679.png",
  "haima": "003000-003673.png", "eukrasian-prognosis": "003000-003660.png", "eukrasian-diagnosis": "003000-003659.png",
  "troubadour": "002000-002612.png", "tactician": "003000-003040.png", "dismantle": "003000-003011.png",
  "shield-samba": "003000-003469.png", "improvisation": "003000-003477.png", "magick-barrier": "003000-003237.png",
  "manaward": "000000-000463.png", "tempera-coat": "003000-003835.png", "tempera-grassa": "003000-003836.png",
  "radiant-aegis": "002000-002750.png", "tengentsu": "003000-003190.png", "arcane-crest": "003000-003632.png",
  "shade-shift": "000000-000607.png", "riddle-of-earth": "002000-002537.png",
};
for (const entry of FFXIV_MITIGATION_CATALOG) entry.icon = FFXIV_MITIGATION_ICONS[entry.key];

// The catalog as it is at a sync level (undefined = the level cap): entries
// learned above it dropped, trait upgrades undone (CatalogEntry.belowLevel).
// Bands apply highest first, so a lower band's values win.
export function ffxivCatalogAt(level?: number): CatalogEntry[] {
  if (level === undefined) return FFXIV_MITIGATION_CATALOG;
  // A band can raise minLevel: the entry stops being a mitigation there.
  return FFXIV_MITIGATION_CATALOG
    .map((e) => {
      const bands = (e.belowLevel ?? []).filter((b) => level < b.below).sort((a, b) => b.below - a.below);
      return bands.length ? bands.reduce<CatalogEntry>((out, b) => ({ ...out, ...b.as }), e) : e;
    })
    .filter((e) => (e.minLevel ?? 0) <= level);
}

function statusIndexOf(catalog: CatalogEntry[], into = new Map<number, { entry: CatalogEntry; status: CatalogStatus }>()) {
  for (const entry of catalog) {
    for (const status of entry.statuses) {
      if (!into.has(status.id)) into.set(status.id, { entry, status });
    }
  }
  return into;
}
function actionIndexOf(catalog: CatalogEntry[], into = new Map<number, CatalogEntry>()) {
  for (const e of catalog) for (const id of e.actionIds) if (!into.has(id)) into.set(id, e);
  return into;
}

// Every level a downgrade starts at, so the indexes below can list each
// version of an entry.
const BAND_LEVELS = [...new Set(FFXIV_MITIGATION_CATALOG.flatMap((e) => (e.belowLevel ?? []).map((b) => b.below - 1)))]
  .sort((a, b) => b - a);

// Status ID -> (entry, status) and action ID -> entry, across every level:
// for code that only asks "is this a mitigation" (the damage engine's buff
// stream and defensive casts) and the catalog check script. One status
// belongs to exactly one entry; the cap's version wins.
export const FFXIV_STATUS_INDEX = BAND_LEVELS.reduce((m, lv) => statusIndexOf(ffxivCatalogAt(lv), m),
  statusIndexOf(FFXIV_MITIGATION_CATALOG));
export const FFXIV_ACTION_INDEX = BAND_LEVELS.reduce((m, lv) => actionIndexOf(ffxivCatalogAt(lv), m),
  actionIndexOf(FFXIV_MITIGATION_CATALOG));

// FFLogs ability `type` values (masterData). Anything else is treated as
// unknown by the analysis.
export const FFXIV_DAMAGE_TYPE = { physical: 128, magical: 1024, unaspected: 32 } as const;

// Targeted attacks given a row at any target count (analyze.ts
// findHitClusters). Hiemal Ray (FRU intermission, 40257): the crystals'
// tethers hit 1-4 players per wave, 2-4 waves ~2s apart, ~40k raw (25-30%
// of max HP) each, the only damage of a clean intermission (user,
// 2026-10-15, JZ1KXhDbqkNH3jxR).
const FFXIV_TARGETED_HITS = new Set(["Hiemal Ray"]);

const FFXIV_MITIGATION_CAP: MitigationGame = {
  catalog:     FFXIV_MITIGATION_CATALOG,
  statusIndex: statusIndexOf(FFXIV_MITIGATION_CATALOG),
  actionIndex: actionIndexOf(FFXIV_MITIGATION_CATALOG),
  // FFLogs logs DoT damage without the `tick` flag, under the status's ID
  // (1,000,000+, "Sustained Damage", "Flesh Wound") or the 500000
  // "Combined DoTs" pseudo-ability.
  isTick: (abilityId) => abilityId >= 1_000_000 || abilityId === 500_000,
  isAutoAttack: (abilityName) => abilityName === "Attack",
  isTargetedHit: (abilityName) => FFXIV_TARGETED_HITS.has(abilityName),
  damageColumn(type) {
    if (type === FFXIV_DAMAGE_TYPE.physical) return "physical";
    if (type === FFXIV_DAMAGE_TYPE.magical) return "magical";
    if (type === FFXIV_DAMAGE_TYPE.unaspected) return "none";
    return undefined;
  },
};

export const FFXIV_MITIGATION: MitigationGame = FFXIV_MITIGATION_CAP;

// The analysis at a sync level (lib/damage/ffxiv/patches.ts levelOf): what
// the optimizer, the Tanking view and the sheet may plan with. A TEA pull
// (level 80) plans Vengeance, not Damnation (user, 2026-10-16).
const BY_LEVEL = new Map<number, MitigationGame>();
export function ffxivMitigationAt(level?: number): MitigationGame {
  if (level === undefined) return FFXIV_MITIGATION_CAP;
  let game = BY_LEVEL.get(level);
  if (!game) {
    const catalog = ffxivCatalogAt(level);
    game = { ...FFXIV_MITIGATION_CAP, catalog, statusIndex: statusIndexOf(catalog), actionIndex: actionIndexOf(catalog) };
    BY_LEVEL.set(level, game);
  }
  return game;
}
