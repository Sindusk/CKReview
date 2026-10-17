// lib/damage/wow/game.ts
//
// The WoW game layer for the damage analysis (docs/archive/damage-analysis-plan.md,
// "WoW port"). Same role as lib/damage/ffxiv/game.ts, built on our own
// measured table (spell-data.ts, generated from WCL logs) instead of a
// vendored one: WoWAnalyzer is AGPL, so nothing here is taken from it.
//
// ── Actions ────────────────────────────────────────────────────────────
// From spell-data.ts: on-GCD as inferred from cast spacing (null, too few
// casts, counts as off-GCD). An ability id seen in several specs takes the
// entry with the most casts. The GCD lock is the spec's base GCD:
// - 1.0s, not hasted, for every Rogue, Feral, Brewmaster and Windwalker
//   (FIXED_GCD_SPECS; the survey measured exactly 1000ms for all six)
// - 1.5s, hasted, for everyone else (the survey's modes: 940–1380ms)
// The engine measures each player's actual speed: haste.ts fits the GCD
// through the pull from casts and instants (lust, Power Infusion, haste
// procs and gear); timeline.ts speedProfile (one GCD inside lust / Power
// Infusion, one outside) is the fallback for players it can't fit.
//
// ── Engine hooks WoW needs (lib/damage/types.ts, optional fields) ──────
// - jobOf: findings, spec checks and cooldowns key on "<spec> <class>"; the
//   class alone doesn't say what the player plays.
// - speed: haste reaches the 0.75s GCD floor (factor 0.5 of 1.5s), past
//   FFXIV's clamp.
// - hasteStatusIds: Bloodlust and Power Infusion change the GCD inside a
//   pull; one speed factor per player read lust GCDs as normal and every
//   later GCD as slow.
// - isChannel: channels log no end; their lock runs to their last tick.
// - lockStatus: Deep Breath's lock runs to its flight buff's removal
//   (Convoke the Spirits and Soulcoiler Ritual Vessel to theirs).
// - isAutoCast: casts the log writes for a press that fired them
//   (Bladestorm's Mortal Strikes, Windstrike's spells, Pistol Shot's
//   extra shots) aren't presses.
// - Presses the survey missed: SWEEP_PRESSES, from one sweep over every
//   WoW report on disk (rerun: sampledata/wow/_scratch/survey-sweep.js).
// - isGcdDamage: a gap is priced at the player's own on-GCD abilities only.
//   Counting every DoT tick and pet hit (FFXIV's rule) valued one
//   Assassination Rogue gap on JZp82Rm7TzycM94a pull 25 at 1.7M per GCD,
//   ~2.6× their average: in WoW procs, trinkets and pets keep going.
//   Except a Beast Mastery press's own pet hits (PET_PRESS_HITS below).
//
// ── Raid buffs ─────────────────────────────────────────────────────────
// The burst windows (raidBuffStatusIds) are the lust family and Power
// Infusion. IDs as logged on our samples (spell-data.ts "external"
// statuses): Heroism 32182 and Bloodlust 2825 (from Shamans), Time Warp
// 80353 (Mages), Fury of the Aspects 390386 (Evokers), Power Infusion 10060
// (Priests). Primal Rage and drums weren't seen; add them from a log.
// Only Power Infusion is a partyBuff (credited to its Priest in the rDPS
// split, +20% haste, an estimate). The lust family is left out of the
// split on purpose: everyone gets it, everyone's lust is on a fixed
// schedule, and crediting one Shaman with a fifth of the raid's damage
// for 40s would swamp every other number.
//
// ── Not modelled yet ───────────────────────────────────────────────────
// - Penalties: no Venomous Abyss damage-dealt penalty is known.
// - Defensives, disengages: empty until the role batches.
// - Augmentation's support damage (Ebon Might, Prescience) isn't in the
//   rDPS split as buffs given: Warcraft Logs writes it as the Evoker's own
//   hits under the buffs' ids (about three quarters of an Augmentation's
//   damage), so it
//   counts as their damage done already (AUG_SUPPORT_HITS below).

import type { PlayerEvent, PlayerInfo } from "@/types/PlayerInfo";
import { SPEC_DATA } from "../../spec-data";
import { WOW_SPELL_DATA } from "./spell-data";
import { WOW_TRACKED_COOLDOWNS } from "./tracked-cooldowns";
import { WOW_SPEC_CHECKS } from "./specs";
import { combatPotion, potionWindows } from "./specs/potion";
import { WOW_HASTE_STATUS_IDS, wowSpeedModels } from "./haste";
import { WOW_MEASURED_PROCS } from "./procs";
import type { DamageGame, GameAction, PartyBuff } from "../types";

// Rogue (Assassination, Outlaw, Subtlety), Feral, Brewmaster, Windwalker.
const FIXED_GCD_SPECS = new Set([259, 260, 261, 103, 268, 269]);
const FIXED_GCD_MS = 1000;
const HASTED_GCD_MS = 1500;

const LUST_IDS = [32182, 2825, 80353, 390386];   // Heroism, Bloodlust, Time Warp, Fury of the Aspects
const POWER_INFUSION = 10060;

// Channelled GCDs (cast ids from spell-data.ts). A channel whose ticks log
// under another id keeps the plain GCD lock until that id is mapped.
const CHANNEL_IDS = new Set([
  15407,   // Mind Flay
  391403,  // Mind Flay: Insanity
  263165,  // Void Torrent
  257044,  // Rapid Fire
  113656,  // Fists of Fury
  101546,  // Spinning Crane Kick
  443028,  // Celestial Conduit
  198013,  // Eye Beam
  452497,  // Abyssal Gaze
  212084,  // Fel Devastation
  356995,  // Disintegrate
  5143,    // Arcane Missiles
  205021,  // Ray of Frost
  1261153, // Malefic Grasp
  198590,  // Drain Soul (not in the survey: DRAIN_SOUL below)
  740,     // Tranquility
  64843,   // Divine Hymn
  446035,  // Bladestorm (ticks as 50622 "Bladestorm"; see BLADESTORM below)
  115175,  // Soothing Mist (Mistweaver; see MISTWEAVER below)
  399491,  // Sheilun's Gift (Mistweaver, not in the survey)
  117952,  // Crackling Jade Lightning (not in the survey)
  // Font of Venomous Rage, an on-use trinket of any spec: a 2s channel
  // whose five hits log under its id at +0, 0.5, 1.0, 1.5, 2.0s; the next
  // GCD came 2.1–2.4s after the use (p10–median, 32 uses on 11 players of
  // 7 specs, fixed-GCD Rogues too; the Beast Mastery pass of the
  // WoWAnalyzer audit, 2026-10-17). Read as a plain GCD, each use was ~1s
  // of idle ("No GCD after Font of Venomous Rage" on the top BM Yaji).
  1297908,
  47540,   // Penance (Discipline; SWEEP_PRESSES)
  234153,  // Drain Life (SWEEP_PRESSES)
]);

// GCDs that lock the player for as long as a buff of their own: Scalecommander
// Deep Breath flies 1.3–2.4s (its 433874 buff; qpZx3mWaG7gcDdYB pull 3,
// Bragontix's next GCD came 0.0–0.4s after each removal). Read as a plain
// GCD, every flight was a ~1.1s gap.
// Two more from the healer pass of the WoWAnalyzer audit (2026-10-17), each
// read as ~1–2s of idle per press before:
// - Convoke the Spirits (391528, Restoration Druid): a 3.0s channel whose
//   buff (same id) runs cast to removal (2.97–3.04s); its spells log as
//   casts of their own, nothing under Convoke's name, so isChannel can't
//   time it. Next GCD 2.8–4.4s after the cast (median 3.5s, 32 Convokes,
//   six Resto Druids on Vr8dLPtFYWA4G1yg, LckJC7GMhQvD6rdw,
//   GndQ9VFWtLzNjKpk, dG8D9y6WxrfmtgXp, VbAHWZDdPwJBajmx, gVDPhzp61Zm29HMw).
// - Soulcoiler Ritual Vessel (1291894, a healer on-use item): a 2.0s buff
//   (same id, 1.96–2.03s) that locks the player; the next GCD came 2.02s
//   or later after every one of 27 uses (Resto Shamans, Preservation,
//   Resto Druid on the same reports).
const LOCK_STATUSES = new Map<number, number>([
  [433874, 433874],     // Deep Breath
  [391528, 391528],     // Convoke the Spirits
  [1291894, 1291894],   // Soulcoiler Ritual Vessel
  [115294, 115294],     // Mana Tea (Mistweaver; see MISTWEAVER below)
  // From the survey sweep (2026-10-17): presses the survey had as plain
  // GCDs whose next press came 2s+ later at the median. Each puts a buff of
  // its own id on the player at the cast and removes it when the player is
  // free (cast → removal p10–p90; next GCD p10–p50 after the cast):
  // - Void Ray (Devourer): 1.64–2.21s; next GCD 2.2–3.1s (121 casts,
  //   Konudh 8kVQMJ4rmpnyRjBH, Jexro and Chelx a4kX1DNT27yHGvqJ). Read as a
  //   plain GCD it preceded 286s of their "idle". Open: its hits (Void Ray
  //   1213649 / 1214595) also end by 2.1–2.2s, yet the next press still
  //   comes 0.84–1.11s after the removal on 23 of 25 on Konudh, whatever
  //   it is; unexplained, so still read as delay (Devourer's top players
  //   sit at 80–82% uptime).
  // - Dark Harvest (Affliction): 1.48–2.10s; next 1.7–2.2s (27 casts on
  //   6kHtGaQXCMWYxFpZ, 7B1wQbjNhgXJDaHC, a4kX1DNT27yHGvqJ).
  // - Breath of Eons (Augmentation, a flight like Deep Breath): 1.60–2.75s;
  //   next 2.0–2.8s (14 casts on 7pFPAqzc2NHLXjwZ, 8kVQMJ4rmpnyRjBH,
  //   a4kX1DNT27yHGvqJ).
  // - Time Skip (Augmentation): 2.87–3.02s; next 2.9–3.4s (8 casts, same).
  // - Killing Spree (Outlaw): 1.73–2.27s; next 1.9–2.4s (22 casts on
  //   a4kX1DNT27yHGvqJ, Kag91qVZ2YJ7MQAb).
  // - Boomstick (Survival): 1.97–2.65s; next 2.2–2.9s (17 casts on
  //   9w3bK4qhrRC82gVX, wWx8B1GPZMLghAyz).
  [473728, 473728],     // Void Ray
  [1257052, 1257052],   // Dark Harvest
  [403631, 403631],     // Breath of Eons
  [404977, 404977],     // Time Skip
  [51690, 51690],       // Killing Spree
  [1261193, 1261193],   // Boomstick
]);

// Mistweaver (the WoWAnalyzer audit's phase 3, 2026-10-17; seven
// Mistweavers on 6kHtGaQXCMWYxFpZ, 7B1wQbjNhgXJDaHC, aZ6NnwL8g9PdpGJ1,
// r9CX1kpRGLmKJH4M, wWx8B1GPZMLghAyz, ZjVtM1vFcrp7w3WC, gVDPhzp61Zm29HMw).
// The survey had two Mistweavers and missed presses that sat inside the
// "idle" gaps: Sheilun's Gift (inside 53 of them, 168s), Detox (50, 83s),
// Revival (5).
// - Sheilun's Gift (399491) is a channel: its cast logs at the start, no
//   begin-cast, its heals land over 1.0s (median; 2.8s at p90) and the
//   next GCD comes 1.1s+ after it (p10, 81 casts).
// - Detox (115450) and Revival (115310): plain hasted GCDs (next GCD p10
//   0.90s and 0.92s).
// - Mana Tea (115294) is a channel whose buff (same id) runs cast to
//   removal, 1.0–3.3s (p10–p90; 101 casts), the next GCD 0.1–0.3s after
//   the removal; it preceded 119s of the "idle".
// - Soothing Mist (115175) is a channel the healer casts Vivify and
//   Enveloping Mist into; its lock runs to its last heal before the next
//   press. Its short GCD is in haste.ts (SHORT_GCD_IDS).
// - Crackling Jade Lightning (117952): a channel (two casts on the samples).
const SHEILUNS_GIFT = 399491;
const DETOX = 115450;
const REVIVAL = 115310;
const CRACKLING_JADE_LIGHTNING = 117952;

// Arms' Bladestorm: a ~4.5s channel that casts Mortal Strike by itself,
// logged as ordinary casts (39–46 of each Arms Warrior's ~75–100 Mortal
// Strikes on qpZx3mWaG7gcDdYB / NK1hBtW9rckdjq36, none of anything else).
// The survey read Bladestorm as off-GCD because those casts followed it at
// once. It's an on-GCD channel, and its Mortal Strikes aren't presses.
const BLADESTORM = 446035;
const MORTAL_STRIKE = 12294;
// Aldrachi Reaver's Reaver's Glaive (442294; Havoc, the WoWAnalyzer audit's
// phase 3, 2026-10-17) isn't in the survey, so each press read as an idle
// GCD. It's an on-GCD press: the next GCD came 0.75s+ after it (median
// 0.99–1.15s; Poetry LckJC7GMhQvD6rdw, Ldh baRCnPv62YQ1dJZN, Mythnarra
// qpZx3mWaG7gcDdYB, 20–26 a pull).
const REAVERS_GLAIVE = 442294;
// Affliction's Drain Soul (198590; the WoWAnalyzer audit's phase 3,
// 2026-10-17) isn't in the survey either, so each channel read as idle: on
// a4kX1DNT27yHGvqJ (Vashnik) Fluffalicous's 44 Drain Souls put his GCD
// uptime at 57% and 25.3M in gaps. It's an on-GCD channel that ticks under
// its own id: 4 ticks, the last 1.4s after the cast, the next cast 0.2–0.6s
// after that (median; Fluffalicous, and 八十參 on 7B1wQbjNhgXJDaHC).
const DRAIN_SOUL = 198590;
// Templar Retribution's Hammer of Light (427453; the WoWAnalyzer audit's
// phase 3, 2026-10-17) isn't in the survey (53 of 58 Retribution
// player-pulls are Herald of the Sun), so each press read as idle. It's an
// on-GCD press, pressed after every Wake of Ashes and on each Light's
// Deliverance: the next GCD came 0.76s+ after it (median 1.00–1.03s;
// Yenvenger ACmXHMFtaPLR9k8w 22 a pull, Polpo gVDPhzp61Zm29HMw Nek'zali
// 17 and 25). The Empyrean Hammers, Divine Hammers and Sacrosanct Crusade
// it logs as casts are procs, not presses.
const HAMMER_OF_LIGHT = 427453;
const CRUSADING_STRIKES = 408385;
// Vengeance's Sigil of Chains (202138; the WoWAnalyzer audit's phase 3,
// 2026-10-17) isn't in the survey, so each press read as an idle GCD. It's
// an on-GCD press: the next GCD came 0.77s+ after it (p10 0.77–1.03s,
// median 1.0–1.6s; Supadh atJRCq3YM8P4KGpD, Felsky 9w3bK4qhrRC82gVX,
// Chajinadh Ftj4vwHf9RazPcqV, Misohornie gVDPhzp61Zm29HMw; 1–5 a pull on
// 11 of 24 Vengeance player-pulls).
const SIGIL_OF_CHAINS = 202138;
// Guardian Druid (the WoWAnalyzer audit's phase 3, 2026-10-17): no Guardian
// was in the survey, so none of its bear presses were actions and every
// one read as idle (the 100th-percentile 주황양배추 aZ6NnwL8g9PdpGJ1: 4.5%
// GCD uptime, 19.0M "lost"). On-GCD presses, the next cast of any
// candidate press coming 0.82s+ after each (p05; median 1.09–1.10s; 25
// player-pulls of 9 Guardians on aZ6NnwL8g9PdpGJ1, mNkHXhaD6Y2tqQTg,
// Ndh2H6Qw4Pp1qaMk, L8yGzCABtm6Zx1YR, hjHXmdnJFwTPpMtK, J3ckBVtrZNfWv1h7,
// JvQpZk3CXj78Dx2f): Mangle (916 casts), Thrash (720), Swipe (180), Maul
// (64), Lunar Beam (63; its 1270292 cast is a fake twin), Red Moon (56),
// Raze (38). Off the GCD (next press under 0.3s on 8–111 casts each):
// Ironfur, Incarnation: Guardian of Ursoc and the Wild Guardian it casts,
// Growl, Barkskin, Survival Instincts.
const GUARDIAN_PRESSES: [number, string][] = [
  [33917, "Mangle"], [77758, "Thrash"], [213771, "Swipe"], [6807, "Maul"],
  [204066, "Lunar Beam"], [1252871, "Red Moon"], [400254, "Raze"],
];

// ── The survey sweep (step 16a of the WoWAnalyzer audit, 2026-10-17) ────
// One pass over all 47 WoW reports on disk (sampledata/wow/_scratch/
// survey-sweep.js, survey-spec.js, survey-hits.js) for presses the survey
// (12 fights) missed or read as off-GCD. A press is on the GCD when the
// nearest other press, start to start, sits 0.75s+ away at p05 across
// several players ("near" below; an off-GCD weave sits under 0.5s); a cast
// logged within 30ms of another press is the log's twin, not a press
// (Dire Beast 1308188, Chi Explosion, Rejuvenation (Germination), Healing
// Stream Totem stay off). Three specs had no survey entry at all and read
// as mostly idle: Protection Warrior (1–3% GCD uptime on all six),
// Enhancement Shaman (29–39%) and Discipline Priest (23–29%).
// Each row: id, name, then the evidence (casts, players, near p05).
type SweepPress = [id: number, name: string];
const SWEEP_PRESSES: { spec: string; specId: number; ids: SweepPress[] }[] = [
  // 6 Prot Warriors, 7B1wQbjNhgXJDaHC 9rGDw4WB3bv6VmnK 9w3bK4qhrRC82gVX
  // mNkHXhaD6Y2tqQTg RbhPKYWd6t1nAC3f xN9cWhzbvqTVfrG8: near p05 0.75–1.02s
  // (Shield Slam 604 casts, Revenge 411, Thunder Clap 351, Thunder Blast
  // 278, Demoralizing Shout 59, Shield Charge 41, Execute 30, Heroic Throw
  // 10). Off the GCD (near p05 0.07–0.14s): Ignore Pain, Shield Block,
  // Avatar, Shield Wall, Taunt.
  { spec: "Protection Warrior", specId: 73, ids: [
    [23922, "Shield Slam"], [6572, "Revenge"], [6343, "Thunder Clap"], [435222, "Thunder Blast"],
    [163201, "Execute"], [1160, "Demoralizing Shout"], [385952, "Shield Charge"], [57755, "Heroic Throw"],
  ] },
  // 7 Enhancement Shamans (6kHtGaQXCMWYxFpZ, 8kVQMJ4rmpnyRjBH,
  // mNkHXhaD6Y2tqQTg, hjHXmdnJFwTPpMtK and 3 more): near p05 0.76–0.91s
  // (Stormstrike 693, Crash Lightning 374, Windstrike 235, Tempest 188,
  // Lava Lash 109, Ascendance 23). Doom Winds is off (0.06s). Windstrike
  // casts a Lightning Bolt, Chain Lightning or Tempest in the same
  // instant (93% of Windstrikes): those are COINCIDENT_AUTO below.
  { spec: "Enhancement Shaman", specId: 263, ids: [
    [17364, "Stormstrike"], [115356, "Windstrike"], [187874, "Crash Lightning"], [60103, "Lava Lash"],
    [452201, "Tempest"], [114051, "Ascendance"],
  ] },
  // 3 Discipline Priests (Reínuky 6kHtGaQXCMWYxFpZ, Indeed hjHXmdnJFwTPpMtK,
  // Fistofpell VWMbYPRyxCAmhZFj): near p05 0.73–0.78s at the 0.75s floor
  // (Void Blast 356, Penance 138, Void Shield 97, Power Word: Radiance 71,
  // Evangelism 12). Penance is a channel (CHANNEL_IDS): its bolts log as
  // "Penance", the last 1.19s after the cast (median). Evangelism casts a
  // Radiance in the same instant (12 of 12): COINCIDENT_AUTO.
  { spec: "Discipline Priest", specId: 256, ids: [
    [450215, "Void Blast"], [47540, "Penance"], [1253593, "Void Shield"], [194509, "Power Word: Radiance"],
    [472433, "Evangelism"],
  ] },
  // Devourer (8 on 7B1wQbjNhgXJDaHC, 8kVQMJ4rmpnyRjBH, a4kX1DNT27yHGvqJ,
  // LCFp3wbHvQqNP4my, zdyhBj7pxWG6A8QZ, VBPkNJnWMdZx8wQ1): Collapsing Star
  // is a 1.9s hard cast (136, near p05 0.75s; 98s of Konudh/Jexro/Chelx
  // "idle" sat around it). Voidblade 1245414 (13, near 1.02s; the 1245412
  // twin and Pierce the Veil log with it) and Reaper's Toll (17 on Kraa
  // LCFp3wbHvQqNP4my, near 0.74s) are presses. Void Ray: LOCK_STATUSES.
  { spec: "Devourer Demon Hunter", specId: 1480, ids: [
    [1221150, "Collapsing Star"], [1245414, "Voidblade"], [1245470, "Reaper's Toll"],
  ] },
  // Frost Mage (Babymage hjHXmdnJFwTPpMtK, Noribert NvX17Tb9yMY8QrDf,
  // Huggmark PAgdKqkXDTRfLnJy): Frostbolt, a 1.35s cast (94, near p05
  // 0.86s), was missing; it sat inside 113s of Babymage's "idle".
  { spec: "Frost Mage", specId: 64, ids: [[116, "Frostbolt"]] },
  // Fire: Flamestrike (Katbelle Ndh2H6Qw4Pp1qaMk, 22, near 1.01s; inside
  // 185s of her "idle").
  { spec: "Fire Mage", specId: 63, ids: [[2120, "Flamestrike"]] },
  // Destruction (16 players): Havoc (178, near p05 0.79–0.81s) and Summon
  // Infernal (77; near p05 0.75s on PAgdKqkXDTRfLnJy, baRCnPv62YQ1dJZN,
  // GndQ9VFWtLzNjKpk, gVDPhzp61Zm29HMw). The survey had one Destruction
  // Warlock and 3–4 casts of each.
  { spec: "Destruction Warlock", specId: 267, ids: [[80240, "Havoc"], [1122, "Summon Infernal"]] },
  // Affliction: Drain Life is a channel (Wyrmtongues gVDPhzp61Zm29HMw, 11,
  // last tick 1.32s after the cast, near p05 1.11s).
  { spec: "Affliction Warlock", specId: 265, ids: [[234153, "Drain Life"]] },
  // Demonology: Singe Magic, the imp's dispel (10 casts, 7 players, near
  // p05 0.77s).
  { spec: "Demonology Warlock", specId: 266, ids: [[132411, "Singe Magic"]] },
  // Arms: Rend (15, 4 players, near p05 0.76s). Storm Bolt (110 casts, near
  // p05 0.86s) stays off: all 39 on tcdpmV7MBHK1jGYk, Vr8dLPtFYWA4G1yg,
  // J3ckBVtrZNfWv1h7 and r9CX1kpRGLmKJH4M were cast inside Bladestorm, and
  // as a press it cut the channel's lock (Arms gaps 2.5M → 3.0M a pull).
  { spec: "Arms Warrior", specId: 71, ids: [[772, "Rend"]] },
  // Fury: Execute 280735 (Bekon wWx8B1GPZMLghAyz, 45, near p05 0.76s).
  { spec: "Fury Warrior", specId: 72, ids: [[280735, "Execute"]] },
  // Hunters: Freezing Trap (50 BM + 19 MM, near p05 1.00–1.10s) and
  // Binding Shot (BM 29, 0.91s).
  { spec: "Beast Mastery Hunter", specId: 253, ids: [[187650, "Freezing Trap"], [109248, "Binding Shot"]] },
  // Balance: Typhoon (25 casts, 11 players, near p05 0.88s). Guardian:
  // Stampeding Roar 77761 (38, 10 players, 0.85s).
  { spec: "Balance Druid", specId: 102, ids: [[61391, "Typhoon"], [77761, "Stampeding Roar"]] },
  // Feral (小奶酱丶 RbhPKYWd6t1nAC3f, the only one): Swipe (18, near p05
  // 0.97s) and Primal Wrath (8, p25 0.98s) sat inside 51s of "idle".
  // Feral's phase 3 (2026-10-17, 14 player-pulls on 11 reports): Lunar
  // Inspiration's Moonfire 155625 (243 casts on the four Entombed
  // Sentinels players who take it, ~30 a pull, near p05 0.74s), Frantic
  // Frenzy 1243807 (Lylyvienne KB1a9CWc6pT4VGqA, 6, near p05 0.96s) and
  // Feral's Stampeding Roar 77764 (13 casts, 8 players, near p05 0.74s).
  { spec: "Feral Druid", specId: 103, ids: [
    [106785, "Swipe"], [285381, "Primal Wrath"], [155625, "Moonfire"], [1243807, "Frantic Frenzy"], [77764, "Stampeding Roar"],
  ] },
  // Rogues (fixed 1.0s GCD): Poisoned Knife (Assassination, 8, near p05
  // 0.99s), Gloomblade (Subtlety, Nickledon, 49, 0.99s), Pistol Shot
  // (Outlaw Buffoutlaw a4kX1DNT27yHGvqJ, Loktark Kag91qVZ2YJ7MQAb: 294
  // casts, two thirds of them the extra shots logged 0.1–0.3s after the
  // first: COINCIDENT_AUTO's follow-up rule).
  { spec: "Assassination Rogue", specId: 259, ids: [[185565, "Poisoned Knife"]] },
  { spec: "Subtlety Rogue", specId: 261, ids: [[200758, "Gloomblade"]] },
  { spec: "Outlaw Rogue", specId: 260, ids: [[185763, "Pistol Shot"]] },
  // Healers: Holy Priest Mass Dispel (19 casts, 13 players, 1.23s cast,
  // near p05 0.99s) and Prayer of Healing (11, 1.06s); Paladins' Hammer of
  // Justice (32 across Holy, Protection and Retribution, near p05
  // 0.98–1.08s) and Intercession (11, 11 players, 1.56s cast); Resto
  // Shaman Earthgrab Totem (8, 5 players, 0.97s); Mistweaver Restoral (32,
  // 6 players, 0.74s at the floor) and Invoke Chi-Ji (18, 5 players,
  // 0.74s). Unity Within stays off: it's pressed inside Celestial
  // Conduit, whose ticks run on 1.8s after it (median, 13 casts), and as
  // a press it would cut the channel's lock short.
  { spec: "Holy Priest", specId: 257, ids: [[32375, "Mass Dispel"], [596, "Prayer of Healing"]] },
  { spec: "Holy Paladin", specId: 65, ids: [[853, "Hammer of Justice"], [391054, "Intercession"]] },
  { spec: "Restoration Shaman", specId: 264, ids: [[51485, "Earthgrab Totem"]] },
  { spec: "Mistweaver Monk", specId: 270, ids: [[388615, "Restoral"], [325197, "Invoke Chi-Ji, the Red Crane"]] },
];

// Felblade (Havoc and Vengeance) has a 0.5s GCD of its own, not hasted:
// the nearest press sat 0.48–0.50s away at p05–p25 (87 casts on four
// Havocs LckJC7GMhQvD6rdw, tcdpmV7MBHK1jGYk, K4x8cMZYVpGCDbJH,
// qpZx3mWaG7gcDdYB; 382 on three Vengeance atJRCq3YM8P4KGpD,
// 9w3bK4qhrRC82gVX, gVDPhzp61Zm29HMw). The survey read it as off-GCD, so
// its half second sat inside 102s of Havoc "idle".
// It can also be pressed inside the previous press's GCD (previous press →
// Felblade p05 0.17s, p25 0.93s; 104 Felblades on LckJC7GMhQvD6rdw,
// tcdpmV7MBHK1jGYk, K4x8cMZYVpGCDbJH, atJRCq3YM8P4KGpD): such a Felblade
// is a weave, not a press (isAutoCast), or it cut that GCD's lock short and
// read as drift (Backendorse K4x8cMZYVpGCDbJH: drift 21 → 84 findings).
const FELBLADE = 232893;
const FELBLADE_GCD_MS = 500;
const FELBLADE_WEAVE_MS = 700;

// Casts the log writes in the same instant as a press (within 30ms), fired
// by it: the press's own GCD covers them (isAutoCast).
// - Windstrike → Lightning Bolt, Chain Lightning, Tempest (Enhancement;
//   94, 63 and 62 of 235 Windstrikes).
// - Blade Dance / Death Sweep → Throw Glaive (Havoc; 153 of 173 Death
//   Sweeps, 34 of 35 Blade Dances).
// - Evangelism → Power Word: Radiance (Discipline; 12 of 12).
// Dropping Havoc's twins cuts its GCD count (Backendorse K4x8cMZYVpGCDbJH
// 300 → 280), so each GCD is worth more and a few Havoc gap totals rose
// (his 3.78M → 4.30M; Mythnarra gVDPhzp61Zm29HMw +0.6–1.3M a pull).
const COINCIDENT_AUTO = new Map<number, number[]>([
  [115356, [188196, 188443, 452201]],
  [188499, [185123]], [210152, [185123]],
  [472433, [194509]],
]);
const COINCIDENT_MS = 30;
// Outlaw's Pistol Shot logs each extra shot as a cast 0.1–0.3s after the
// first (110 of 166 intervals on Buffoutlaw under 0.3s, the rest 1.0s+).
const PISTOL_SHOT = 185763;
const PISTOL_FOLLOW_MS = 500;

// Beast Mastery's presses land through the pet (the WoWAnalyzer audit's
// phase 3, 2026-10-17): Kill Command's attack is the pet's (83381; 1232922
// from the Pack Leader beasts, Kill Cleave 389448 on other enemies), and so
// are Bestial Wrath's hit (344572), Wild Thrash's (1264355) and the Stomp
// (201754) that lands within a second of a Barbed Shot or Bestial Wrath
// (tcdpmV7MBHK1jGYk Yaji: 88 of 88 Kill Command bursts <1s after the cast,
// Stomp 48 of 58 after Barbed Shot / Bestial Wrath). Priced at the player's
// own hits only, a BM GCD read about half its worth (Deathstriker
// qpZx3mWaG7gcDdYB pull 3: 71k of 150k; ×1.8–3.3 on all 37 BM player-pulls
// on disk), so every BM gap was priced at half. Pet melee, Bloodshed's DoT
// and Beast Cleave keep going while the player idles and stay out.
const PET_PRESS_HITS = new Set([83381, 1232922, 389448, 344572, 1264355, 201754]);

// Augmentation's support damage (the WoWAnalyzer audit's phase 3,
// 2026-10-17): Warcraft Logs writes what Ebon Might and Prescience add to
// allies as the Evoker's own hits, under the buffs' ids (Ebon Might 395152,
// Prescience 410089; also Shifting Sands, Fate Mirror and Inferno's
// Blessing, which match no press). Ebon Might's id is its cast's and
// Prescience's name is its cast's, so isGcdDamage counted 25–40% of the
// Evoker's damage as GCD damage, though it keeps landing while the Evoker
// idles (92–94k/s against 103k/s whole-pull on 第十九个布丁 K4x8cMZYVpGCDbJH
// in his 1.5s+ gaps; 56k/s against 68k/s on Имродорми 7L3RKpavDA8T4MjY).
// Counted, an Augmentation GCD read 148–221k on 31 player-pulls against
// 45–92k for its own presses, pricing every gap ~3× high. Ebon Might down
// and Prescience held are judged by their own checks (specs/augmentation.ts).
const AUG_SUPPORT_HITS = new Set([395152, 410089]);

// Taunts (spell-data.ts): Dark Command, Hand of Reckoning, Provoke, Torment.
// Warrior Taunt and Growl weren't cast often enough to appear; add them
// from a log.
const TAUNT_IDS = new Set([56222, 62124, 115546, 185245]);

const PARTY_BUFFS = new Map<number, PartyBuff>([
  [POWER_INFUSION, { name: "Power Infusion", haste: 0.20, partyWide: false }],
]);

const ACTIONS = new Map<number, GameAction>();
{
  const best = new Map<number, { casts: number; specId: number; onGcd: boolean }>();
  for (const spec of Object.values(WOW_SPELL_DATA)) {
    for (const a of spec.abilities) {
      const prev = best.get(a.id);
      if (prev && prev.casts >= a.casts) continue;
      best.set(a.id, { casts: a.casts, specId: spec.specId, onGcd: a.onGcd === true });
    }
  }
  const names = new Map<number, string>();
  for (const spec of Object.values(WOW_SPELL_DATA)) for (const a of spec.abilities) names.set(a.id, a.name);
  for (const [id, b] of best) {
    const fixed = FIXED_GCD_SPECS.has(b.specId);
    const recast = b.onGcd ? (fixed ? FIXED_GCD_MS : HASTED_GCD_MS) : 0;
    ACTIONS.set(id, {
      id, name: names.get(id) ?? `Spell ${id}`,
      onGcd:       b.onGcd,
      recastMs:    recast,
      cooldownMs:  recast,
      charges:     1,
      speedScaled: b.onGcd && !fixed,
      // A WoW spell's aura or DoT usually shares its id; heals land under it.
      appliesStatusIds: [id],
    });
  }
}

{
  const bs = ACTIONS.get(BLADESTORM);
  if (bs) ACTIONS.set(BLADESTORM, { ...bs, onGcd: true, recastMs: HASTED_GCD_MS, cooldownMs: HASTED_GCD_MS, speedScaled: true });
  if (!ACTIONS.has(REAVERS_GLAIVE)) ACTIONS.set(REAVERS_GLAIVE, {
    id: REAVERS_GLAIVE, name: "Reaver's Glaive", onGcd: true, recastMs: HASTED_GCD_MS, cooldownMs: HASTED_GCD_MS,
    charges: 1, speedScaled: true, appliesStatusIds: [REAVERS_GLAIVE],
  });
  if (!ACTIONS.has(HAMMER_OF_LIGHT)) ACTIONS.set(HAMMER_OF_LIGHT, {
    id: HAMMER_OF_LIGHT, name: "Hammer of Light", onGcd: true, recastMs: HASTED_GCD_MS, cooldownMs: HASTED_GCD_MS,
    charges: 1, speedScaled: true, appliesStatusIds: [HAMMER_OF_LIGHT],
  });
  if (!ACTIONS.has(DRAIN_SOUL)) ACTIONS.set(DRAIN_SOUL, {
    id: DRAIN_SOUL, name: "Drain Soul", onGcd: true, recastMs: HASTED_GCD_MS, cooldownMs: HASTED_GCD_MS,
    charges: 1, speedScaled: true, appliesStatusIds: [DRAIN_SOUL],
  });
  for (const [id, name] of [[SHEILUNS_GIFT, "Sheilun's Gift"], [DETOX, "Detox"], [REVIVAL, "Revival"], [CRACKLING_JADE_LIGHTNING, "Crackling Jade Lightning"], [SIGIL_OF_CHAINS, "Sigil of Chains"], ...GUARDIAN_PRESSES] as const) {
    if (!ACTIONS.has(id)) ACTIONS.set(id, {
      id, name, onGcd: true, recastMs: HASTED_GCD_MS, cooldownMs: HASTED_GCD_MS,
      charges: 1, speedScaled: true, appliesStatusIds: [id],
    });
  }
  // The survey sweep's presses: on the GCD whatever the survey said.
  for (const { specId, ids } of SWEEP_PRESSES) {
    const fixed = FIXED_GCD_SPECS.has(specId);
    const recast = fixed ? FIXED_GCD_MS : HASTED_GCD_MS;
    for (const [id, name] of ids) {
      const prev = ACTIONS.get(id);
      ACTIONS.set(id, {
        ...(prev ?? { id, name, charges: 1, appliesStatusIds: [id] }),
        onGcd: true, recastMs: recast, cooldownMs: recast, speedScaled: !fixed,
      });
    }
  }
  const fb = ACTIONS.get(FELBLADE);
  ACTIONS.set(FELBLADE, {
    ...(fb ?? { id: FELBLADE, name: "Felblade", charges: 1, appliesStatusIds: [FELBLADE] }),
    onGcd: true, recastMs: FELBLADE_GCD_MS, cooldownMs: FELBLADE_GCD_MS, speedScaled: false,
  });
  // Retribution's Crusading Strikes replaces the auto-attack and logs a
  // cast per swing (Polpo, 172 of them on gVDPhzp61Zm29HMw Kith'ix pull 2):
  // read as presses, every swing was a weave in gap labels and the
  // dialog's GCD hover.
  const cs = ACTIONS.get(CRUSADING_STRIKES);
  if (cs) ACTIONS.set(CRUSADING_STRIKES, { ...cs, autoAttack: true });
}

/**
 * Casts another press fired: Mortal Strikes inside the player's own
 * Bladestorm buff, the COINCIDENT_AUTO twins, Pistol Shot's extra shots,
 * a Felblade woven inside the previous GCD.
 */
function autoCasts(player: PlayerInfo): (c: PlayerEvent) => boolean {
  const bs = bladestormAutoCasts(player);
  const casts = player.casts.filter((c) => !c.fake);
  const twinOf = new Map<number, number[]>();   // auto id → trigger cast times
  for (const c of casts) {
    for (const id of COINCIDENT_AUTO.get(c.abilityId) ?? []) {
      const l = twinOf.get(id) ?? [];
      l.push(c.timestamp);
      twinOf.set(id, l);
    }
  }
  const pistol = casts.filter((c) => c.abilityId === PISTOL_SHOT).map((c) => c.timestamp).sort((a, b) => a - b);
  const presses = casts.filter((c) => c.abilityId !== FELBLADE && ACTIONS.get(c.abilityId)?.onGcd).map((c) => c.timestamp);
  return (c) => {
    if (bs(c)) return true;
    if (c.abilityId === FELBLADE) return presses.some((t) => t < c.timestamp && c.timestamp - t < FELBLADE_WEAVE_MS);
    const t = twinOf.get(c.abilityId);
    if (t?.some((x) => Math.abs(x - c.timestamp) <= COINCIDENT_MS)) return true;
    if (c.abilityId === PISTOL_SHOT) return pistol.some((x) => x < c.timestamp && c.timestamp - x <= PISTOL_FOLLOW_MS);
    return false;
  };
}

/** Mortal Strikes inside the player's own Bladestorm buff. */
function bladestormAutoCasts(player: PlayerInfo): (c: PlayerEvent) => boolean {
  const wins: [number, number][] = [];
  let open: number | undefined;
  for (const e of [...(player.buffs ?? [])].filter((b) => b.abilityId === BLADESTORM).sort((a, b) => a.timestamp - b.timestamp)) {
    if (e.buffStatus === "applied" && open === undefined) open = e.timestamp;
    else if (e.buffStatus === "removed" && open !== undefined) { wins.push([open, e.timestamp]); open = undefined; }
  }
  if (wins.length === 0) return () => false;
  return (c) => c.abilityId === MORTAL_STRIKE && wins.some(([s, e]) => c.timestamp > s && c.timestamp <= e);
}

export function wowJobOf(player: Pick<PlayerInfo, "specId" | "className">): string {
  const spec = SPEC_DATA[player.specId];
  return spec ? `${spec.name} ${spec.className}` : player.className;
}

export const WOW_DAMAGE: DamageGame = {
  action: (id) => ACTIONS.get(id),
  penaltyFactor: () => undefined,
  raidBuffStatusIds: new Set([...LUST_IDS, POWER_INFUSION]),
  partyBuff: (statusId) => PARTY_BUFFS.get(statusId),
  // WCL marks DoT ticks on the event (`tick`, PlayerEvent.isDoT); ids don't.
  isTickAbility: () => false,
  trackedCooldowns: (job) => WOW_TRACKED_COOLDOWNS[job] ?? [],
  isDefensive: () => false,
  tankSwapActionIds: TAUNT_IDS,
  disengageActionIds: new Set(),
  jobChecks: (job) => [...(WOW_SPEC_CHECKS[job] ?? []), combatPotion],
  potWindows: potionWindows,
  jobOf: wowJobOf,
  speed: { minIntervalShare: 0.45, minFactor: 0.5 },
  hasteStatusIds: new Set([...LUST_IDS, POWER_INFUSION]),
  // Haste procs and gear (haste.ts): the GCD follows them through the pull.
  speedModels: (pull, usesOf, endMs) => wowSpeedModels(pull, usesOf, endMs, [...LUST_IDS, POWER_INFUSION, ...WOW_HASTE_STATUS_IDS]),
  isChannel: (id) => CHANNEL_IDS.has(id),
  lockStatus: (id) => LOCK_STATUSES.get(id),
  isAutoCast: autoCasts,
  // WCL buff events carry no duration: the procs checkProcs can see run
  // out, with durations measured from our logs (procs.ts).
  measuredProcs: WOW_MEASURED_PROCS,
  // DoT ticks share their spell's id (Agony 980, Shadow Word: Pain 589), so
  // an on-GCD action's ticks count too.
  // Or a hit named like an on-GCD action the player cast: Havoc's Chaos
  // Strike, Annihilation and Eye Beam hit under other ids than their casts,
  // and by id alone Mythnarra's average GCD read 7k of a real ~219k
  // (qpZx3mWaG7gcDdYB pull 3), pricing every gap at a thirtieth.
  // A Beast Mastery press's pet hits too (PET_PRESS_HITS). Never
  // Augmentation's support hits (AUG_SUPPORT_HITS).
  isGcdDamage: (e, gcdNames) => e.pet
    ? PET_PRESS_HITS.has(e.abilityId)
    : !AUG_SUPPORT_HITS.has(e.abilityId) && (ACTIONS.get(e.abilityId)?.onGcd === true || gcdNames.has(e.abilityName)),
  compareFromPullStart: true,
  compareRolesPerPlayer: true,
};
