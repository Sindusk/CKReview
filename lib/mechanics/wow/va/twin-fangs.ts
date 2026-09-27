// lib/mechanics/wow/va/twin-fangs.ts
//
// Mythic The Twin Fangs (The Venomous Abyss) — per-pull error detection.
// Called from transformFightToPull in lib/log-transforms.ts; it self-gates on
// this encounter's debuff IDs, so it is safe on any WoW pull.
//
// The second half of this header is the guide-derived encounter model
// (written 2026-09-26 before any log was available). The first half is what
// the logs actually showed; where the two disagree, the log section wins.
//
// ── VERIFIED AGAINST LOGS (offsets fight-relative) ──────────────────────────
//
//   A = report 6Jnq8ycwgkYZpHND, 24 wipes and a kill in pull 25.
//   B = report xKP1M6gwC8WpnrBc, 14 wipes (a different raid).
//
// The clock is completely fixed (identical offsets in every pull; energy is
// time-driven, 0 -> 100 over ~130s, not raid-controlled). A 155s cycle:
//   +9    Caustic Deluge (Vexhul) + Blood Torrent (Ithraz)
//   +24.5 / +27.5 / +30.5  Stone Breaker impacts
//   +36   Venomous Emergence + Rouse the Brood
//   +43   Coiling Ichor      +47  Stir the Depths (6s, pulses every 2s)
//   +61.2 Ravenous Feast (bites at +0 / +2.0 / +3.5)
//   +70   the same half-cycle again (Deluge ... Feast +122.2)
//   +136  Sanguine Storm (18s) and +140 Vile Flood (14s): the Submerge
//   +164  next cycle (Deluge +164, +225, +319, +380; Feast +216, +277, +371).
// There is no Submerge cast or buff in the log; Storm/Flood mark it.
//
// Eternal Venom (debuff 1290336): each application is an applied/stack
// event at the same millisecond as the hit that caused it. The 10th has no
// debuff event — the player dies to 1292348 "Eternal Venom" 0-0.2s after the
// hit (1.1s once). Sources, by the hit at that millisecond: globule pickup
// 1289201, globule burst 1290338, Venomous Emergence 1308122/1307764 (every
// player, every 61s), Corrosive Spit 1293295, Stir wave 1292807 (a debuff;
// the damage event is often absent), Vile Flood 1294605, Deluge splash
// 1289994. Ravenous Feast removes one per bite (removedebuffstack at the
// bite's millisecond). Kill A25's whole-raid tally: 118 Emergence, 95
// pickups, 24 waves, 16 Spits, 1 Flood; Feast removed 4-6 per player. With
// +1 per Emergence, -1 per Feast and ~0.75 pickups per player per Deluge,
// stacks only climb: the +407 Emergence capped 2 in the kill, 5 in A11
// (+394.3), and several in A15/A23 — the soft enrage. The kill ended at
// +411.6, 4.5s after it.
//
// Caustic Globules: every Deluge ejects 15 (casts of 1289994 by Vexhul);
// the raid picks up all 15 within 4-13s in the kill. Untouched, one bursts
// 12.0-16.8s after the Deluge (1290338 on every living player, ~400k + a
// stack). Every player who dies with Eternal Venom releases 3 more globules
// ~2s later (A3 +84.2: 5 deaths -> 15 ejects at +86.1). This is the fight's
// cascade: bursts of death-released globules killed 13-18 at A1 +58.5, A5
// +153.8, A12 +300.8, B8 +126.5, B13 +155.3. A lone Deluge-globule miss was
// survived every time it killed 0-1 (A1 +25.8, A7 +82.9, B1 +24.4, B10
// +22.4). Pickup deaths (1289201 killing blow, 52): mostly two or three
// pickups within 2s at low health; double pickups within 1.5s were also
// survived 47 times, so a double pickup alone isn't flagged. Barbed Bulwark
// (NPC with absorb buff 1303378, 12-15 per Deluge) sits on the globules;
// touching one hits 1307363.
//
// Other IDs: Uncoiled Wrath is enemy buff 1308711 (not the journal's
// 1308583; the kill's survivor had it 0.4s, A23's Vexhul 7s). A "Writhing
// Behemoth" NPC gains Corrosive Effluvium (1303373) about twice per pull but
// never damages a player; it isn't in the model.
//
// Ravenous Feast: the kill's bites hit 8/6/6 (clean range 4-9). A bite with
// fewer than 4 targets makes the NEXT strike hit the whole raid (15-19
// players, ~700-900k each): A13 +375.2 (the +3.5 bite found 1 immune player,
// +0.4s later 15 were hit), A14 +61.6, B1 +63.6, B11 +126.1, B12 +124.6 — a
// wipe every time. Feasted (1310096) players bitten again take ~900k+
// (A9 +63.3, +64.8; A13 +61 and +122, the same DPS both times).
//
// Rouse the Brood: 10 broodlings (one Broodling of Ithraz actor, instances
// 1-10) begin Visceral Burst one per second from +1.5s. Each is a 3s cast;
// kicked, it's gone; completed (cast 1308385), it hits the raid with a
// stacking DoT (1308386) and recasts every 5s. The kill completed none. One
// completion killed 1-5; A7/A10/A16/B4/B6 had a broodling recasting 3-7
// times and lost 10-16. Player casts at the broodling carry targetInstance;
// the kick order was different in every pull (no fixed slot per kicker).
//
// Stone Breaker (cast 1288538 per impact): one tank soaked all three impacts
// of a set (1310371, ~400-800k growing per impact) and the tanks alternated
// sets. An empty impact hits the raid (1289153): A4 +24.5 (both tanks died
// at +4-7 to melee/Spittle, 9 killed), A11 +395.6, B3 +88.5, B5 +88.5.
//
// Corrosive Spit: three Spawn of Vexhul per Emergence; each 5s cast marks
// its target (debuff 1293979) and the marked player always takes the hit.
// Unmarked players hit: 22 (A), 17 (B), none in the kill.
//
// Tainted Burst (1310105): only 5 occurrences, all after deaths had thinned
// the raid (A8 +380.6, A9 +73.1, A13, B8). Tainted Blood (1310102) is the
// debuff on players absorbing a fount's healing — expected.
//
// Deaths never lacked a killing blow: no pull ended in a called reset. The
// raid died out in 10-15s once 4 were dead, usually through the globule
// cascade. 6 dead was the collapse point (A8 lived 30.6s after, the most).
//
// Stir the Depths: 1292806 is the unavoidable pulse (every 2s for 6s). The
// "wave" 1292807 debuff lands throughout the pull, not only in the Stir
// window (kill: 21 wave debuffs, several on tanks) — what it is on screen
// is an open question.
//
// Wipe survey (the earliest Raid error of each wipe):
//   Globule burst     A3 +84.2, A21 +240.3 (Deluge globules); A1 +58.5, A5
//                     +153.8 (after 5 Vile Flood deaths), A12 +300.8, B8
//                     +126.5, B13 +155.3, B14 +164.2 (death-released)
//   Visceral Burst    A6 +47.5, A7 +103.5, A10 +260.5, A15 +411.6, A16
//                     +41.5, A17 +258.5, A18 +110.5, A19 +200.5, A20
//                     +263.5, A22 +263.5, B4 +41.5, B6 +47.5, B9 +107.5,
//                     B10 +47.5
//   Feast raid bite   A13 +375.2, A14 +61.6, B1 +63.6, B11 +126.1, B12 +124.6
//   Tainted Burst     A8 +380.6
//   6 dead            A2 +50.3, A4 +24.0 (both tanks dead at +4-7), A9 +73.4
//                     (two Feasted double bites, then Tainted Burst), A23
//                     +413.1 (venom soft enrage), A24 +88.5 (pickup deaths),
//                     B2 +14.1 (no tank in range at the pull), B7 +108.1
//   Tank died         A11 +385.6, B5 +83.4
//   (B3 +84.3 globule burst after a +82.9 burst killed 2.)
//
// ── RULES IMPLEMENTED ────────────────────────────────────────────────────────
//
//   wow-tf-venom-cap              Major       died at 10 Eternal Venom (not
//                                             from a burst); stack history
//   wow-tf-venom-overflow         Raid        one Emergence capped 3+ players
//   wow-tf-globule-burst          Minor/Raid  a globule burst (player-less)
//   wow-tf-globule-pickup-death   Major       died to a globule pickup
//   wow-tf-feast-double-bite      Minor/Major bitten while Feasted
//   wow-tf-feast-raid-bite        Raid        a bite hit 12+ (under-soaked)
//   wow-tf-tainted-burst          Minor/Raid  a fount burst (player-less)
//   wow-tf-visceral-burst         Minor/Raid  broodlings finished the cast
//   wow-tf-stone-breaker-unsoaked Minor/Major/Raid  on the tank whose set it was
//   wow-tf-corrosive-spit         Minor/Major unmarked player in a Spit line
//   wow-tf-stir-wave, -deluge-splash, -vile-flood, -sanguine-storm,
//   -congealed-gore, -noxious-slick, -barbed-bulwark, -deadly-venom
//                                 Minor/Major avoidable hits
//   wow-tf-out-of-range           Minor       Concentrated Spittle / Clotted
//                                             Bolt (no tank in melee range)
//   wow-tf-uncoiled-wrath         Raid        a twin outlived the other 5s+
//   wow-tf-pull-over              Raid        6 dead / a tank death the pull
//                                             didn't survive
//
// ── GUIDE-DERIVED MODEL (pre-log) ────────────────────────────────────────────
//
// The spell IDs below come from encounter-journal links; they are
// CANDIDATES — the verified section above takes precedence.
//
// Sources checked 2026-09-26:
//   Encounter journal and spell links:
//   https://www.wowhead.com/guide/midnight/raids/venomous-abyss-twin-fangs-boss-strategy-abilities
//   Mythic encounter model based on PTR testing:
//   https://www.project-one.fun/en/guide/the-twin-fangs
//   September 1 hotfix (see Twin Fangs in the running Blizzard post):
//   https://us.forums.blizzard.com/en/wow/t/world-of-warcraft-midnight-hotfixes-september-24/2336376
//   September 15 Blizzard raid tuning:
//   https://us.forums.blizzard.com/en/wow/t/the-venomous-abyss-raid-tuning-september-15/2349528
// Older guides and parts of the journal still say 9 Eternal Venom stacks
// kill on Mythic and describe 14 Broodlings. The September hotfixes changed
// those to TEN stacks before death, and TEN Broodlings per Rouse the Brood.
// They also raised the minimum Ravenous Feast target count to FOUR and
// lengthened Visceral Burst's cast by 0.5s. Verify these against the
// specific Mythic log/patch before making a threshold-based rule.
//
// -- ENCOUNTER SHAPE AND RESOURCE LOOP -------------------------------------
//
// Vexhul (green) and Ithraz (red) have separate health pools. Fight both in
// one repeating main-phase/submerge cycle. Eternal Venom is the central
// resource: many poison hits give a PERMANENT stacking DoT, and reaching
// 10 applications on current Mythic kills the player. It does not naturally
// decay or dispel. The only intended removal is Ithraz's Ravenous Feast,
// which consumes one stack per player struck by a bite. A player dying with
// Eternal Venom on Mythic also spawns extra Caustic Globules, which can
// spread stacks to the surviving raid. Avoidable damage thus has a lasting
// cost even when it does not immediately kill.
//
// Vexhul makes globules, adds, and waves; Ithraz provides Feast, tank
// impact soaks, Ichor pools, and Mythic broodlings. At 100 energy both
// Submerge and reposition, leaving Noxious Slick that reduces usable space.
// During the transition Vexhul channels Vile Flood while Ithraz bombards
// the platform with Sanguine Storm. After relocation the main loop resumes.
// Space shrinks with repeats. Bring the two bosses to similar health near
// the kill: when one dies, the survivor gains stacking Uncoiled Wrath.
//
// -- ROUGH CHRONOLOGY OF A CYCLE --------------------------------------------
//
// 0. Pull with a globule interception plan, three distinct Feast bite
//    groups, Tainted Blood fount healers/soakers, Stone Breaker coverage,
//    and interrupts for the current ten Broodlings. Keep bosses in melee
//    reach where possible and position for cleave without aiming Vexhul's
//    tank splash or Spawn of Vexhul lines through the raid.
// 1. Main phase: Vexhul channels Caustic Deluge on her tank. Nearby acid
//    impacts generate Caustic Globules; the Mythic Barbed Bulwarks around
//    them must be stopped before players can intercept the globules. Each
//    globule has a short timer; a deliberate player pickup confines the
//    Venom stack to that player, while an unattended burst hits everyone.
// 2. Ithraz executes Ravenous Feast: three quick group bites. A fresh group
//    covers each bite, earning one Eternal Venom stack removal per player
//    and Feasted, which makes a repeat bite dangerous and unproductive.
//    Mythic Tainted Blood founts appear alongside Feast and need healing
//    absorbed within their short lifetime, or Tainted Burst hits the raid.
// 3. Other overlapping main-phase mechanics: Vexhul's Venomous Emergence
//    applies an unavoidable raid stack and calls Spawn of Vexhul; kill them
//    and dodge Corrosive Spit lines. Stir the Depths pulses raid damage and
//    sends avoidable stack-giving waves. Ithraz's Stone Breaker needs its
//    ordered impact circles covered; Coiling Ichor targets place long-lived
//    Congealed Gore at the arena edge. Mythic Blood Torrent/Barbed Bulwark
//    and Rouse the Brood add the interrupt workload. This is a dependency
//    sketch, not a promise of one exact cast order.
// 4. Around 100 energy, both Submerge. Avoid entry impacts and the Noxious
//    Slick left by their previous position. During relocation, stay ahead
//    of Vexhul's rotating Vile Flood and dodge Ithraz's Sanguine Storm
//    impacts and short Gore pools. Re-establish the main-phase position.
// 5. Repeat while tracking Venom, raid space, and both bosses' HP. Kill
//    them near together so Uncoiled Wrath does not ramp for long.
//
// A PTR-based guide estimates a submerge about every two minutes and says
// the platform becomes untenable after about three. Treat those as rough
// raid-planning limits, not fixed log cutoffs or proof of an automatic wipe.
//
// -- ETERNAL VENOM: TRACK THE CAUSE, NOT JUST THE DEATH ----------------------
//
// Eternal Venom (1290336 linked journal spell): one stack per relevant
// poison event; ticks every second and persists until Feast consumes it or
// the player dies. Current Mythic death threshold is 10 applications, per
// Blizzard's September 1 hotfix; the older journal/PTR guides say 9. A
// death at the cap is a consequence, so reconstruct the stack history to
// distinguish unavoidable raid-wide sources, intended globule pickups,
// and avoidable wave, splash, spit, or Flood hits. Do not flag every stack
// as an error. More globules after a venomous death can create a cascade;
// distinguish the initiating avoidable stack from downstream cleanup.
//
// Venomous Emergence (1291404) gives the raid an expected stack. A missed
// Caustic Globule gives the whole raid an avoidable stack. A player who
// intentionally intercepts one takes the stack instead, which may be
// correct if their current count is safe. Feast is the only repeatable
// stack reduction; monitor its actual aura stack change rather than
// assuming every nominal soaker lost a stack (immunity/death/log format
// may differ). If a player already at the cap takes a planned pickup,
// investigate assignment rather than blaming all globule collection.
//
// -- VEXHUL: DELUGE, GLOBULES, ADDS, WAVES ---------------------------------
//
// Caustic Deluge (1289192) channels for about five seconds on Vexhul's
// current tank with frequent Nature hits. It ejects acid near that tank;
// each impact hurts players within roughly four yards, adds Eternal Venom,
// and forms a Caustic Globule (1289993) at the impact location. Keep
// other players away from these splashes and swap/mitigate for Envenomed
// (1310360), the stacking +10% Deluge damage-taken effect. Deluge tank
// ticks are expected; splash hits on other players are failure candidates.
//
// A globule ruptures after about ten seconds if not intercepted: raid
// damage and one Eternal Venom on every player. Touching it beforehand
// redirects that cost to the soaker. On Mythic, Ithraz's Blood Torrent
// (1303230) forms Barbed Bulwark (1303378) around globules. The barrier
// knocks/damages players and must be interrupted to destroy it before
// safe pickup. The journal says interrupting; PTR testing reports that
// stuns worked while grips/knockbacks did not. Verify the actual cast,
// aura, crowd-control event, and removal in live logs; a generic interrupt
// event may not be emitted when an AoE stun is used. Match each globule's
// spawn, barrier clear, pickup, or timeout. A raid-wide globule burst is a
// stronger miss signal than an intentional one-player pickup hit.
//
// Venomous Emergence calls Spawn of Vexhul and applies a normal stack to
// the raid. PTR testing reports three spawns per cast; verify live counts.
// Each Spawn uses Corrosive Spit (1291478), a targeted frontal line that
// damages and applies Eternal Venom to anyone hit. Kill them promptly;
// only the intended target/path may be forced, while extra players hit by
// the line are avoidable. September 15 reduced Spit's Mythic DAMAGE by
// 20%, not its stack or targeting rule. Do not hard-code damage amounts.
//
// Stir the Depths (1290956) causes a short period of unavoidable raid
// pulses and traveling waves. The waves damage and add Venom to players
// struck. Separate the unavoidable pulse ID from the traveling-wave hit
// before flagging a player; the linked cast ID may be neither damage ID.
// During transition, Vile Flood (1294293) is a rotating 14-second toxin
// frontal. Follow its rotation to move the short safe path; every beam
// contact can add Venom. Concentrated Spittle (1295107) is Vexhul's
// out-of-range tank punishment and needs tank-position context.
//
// -- ITHRAZ: FEAST, BLOOD, BROODLINGS, STONE -------------------------------
//
// Ravenous Feast (1290516) strikes three times, splitting physical damage
// among players within about 14 yards, knocking them back, and consuming
// ONE Eternal Venom stack per player hit. Current Mythic requires at least
// FOUR targets for the bite; practical groups can be larger to split its
// damage. Feasted (1310096) lasts roughly eight seconds, increases damage
// from another bite by 800%, and prevents another stack consumption.
// Assign three distinct bite groups or a log-proven immunity strategy. A
// player taking a second bite with Feasted is a strong error candidate;
// a player receiving the first planned hit and stack reduction is not.
// A thin bite is a raid-level candidate only when the actual number hit is
// below the current Mythic minimum and the resulting penalty is observed.
//
// Tainted Blood (1310099) is Mythic-only and appears during Feast as
// several blood founts. For up to about eight seconds each fount absorbs
// healing from players within five yards (journal wording). Fully exhaust
// each before expiry. An unresolved fount emits Tainted Burst (1310105),
// a large raid-wide Shadow hit. This is a strong missed-fount signal, but
// attribute to the fount/raid until log events show which players were
// assigned and who could reach it. Do not confuse intentional healing
// absorption with a failed heal or mark its normal ticks as an error.
//
// Blood Torrent (1303230, Mythic) channels on Ithraz's current target for
// five seconds, adding a healing absorb each second. Its expelled blood
// creates the Barbed Bulwarks at Caustic Globules. Track it as the cause
// of the barriers and as tank/healer pressure, not a player error merely
// because the target carries several absorb applications.
//
// Rouse the Brood (1308356, Mythic) deals an initial raid hit and summons
// Broodlings of Ithraz. CURRENT count is 10 after the September 15 hotfix;
// old PTR guides say 14. Each broodling starts Visceral Burst (1308385),
// a raid hit plus stacking six-second DoT if it completes. Interrupting
// the cast makes that broodling retreat. Assign distributed interrupts
// with backups and cover every active broodling, not an old fixed quota.
// A completed Visceral Burst cast/damage is a strong missed-interrupt
// signal once source actors and cast-success semantics are verified.
// Do not blame a specific interrupter from an unassigned log alone.
//
// Stone Breaker (1288538) pushes the raid out, then marks successive small
// impact circles. Each must strike at least one player or its hit instead
// damages and knocks the whole raid, ignoring armor. Soaks take increased
// subsequent Stone Breaker damage (about +33% per stack for 90 seconds),
// so tanks plan the numbered order and mitigation; the two tanks may
// alternate. A normal, deliberately soaked impact is not a player error.
// A verified no-target raid hit is a strong missed-soak signal. Identify
// each impact separately and do not infer a miss from the opening pushback.
//
// Coiling Ichor (1290809) marks several players for increasing Shadow
// damage and shrinking area; expiry leaves Congealed Gore (1292505), a
// damaging, slowing pool lasting around two minutes. Place pools toward
// safe outer edges without blocking globule or Feast paths. A later pool
// tick may be caused by someone else entering it, not necessarily by the
// original dropper. Ithraz's out-of-range Clotted Bolt (1295115) needs
// tank-position context before it becomes a detected failure.
//
// -- SUBMERGE, SPACE, AND KILL ORDER ----------------------------------------
//
// At 100 energy, Submerge (1308556) moves both serpents. Entry impacts
// hurt near their landing spots and form Noxious Slick (1309471), which
// ticks and increases damage taken by 30%. Avoid those locations and move
// toward the next safe area. Vexhul's Vile Flood beam and Ithraz's
// Sanguine Storm (1306872) run together after relocation. Storm impacts
// hit within about four yards and leave short Congealed Gore (1306922)
// pools on Mythic. Dodge both while staying out of older Slick; the
// long-lived area denial is why the number of cycles matters.
//
// Toxic Fumes (1295049) is the encounter's routine raid pulse about every
// two seconds. Once either serpent dies, the survivor gains Uncoiled Wrath
// (1308583), +30% damage every four seconds. Balance boss health before
// the finish. Uncoiled Wrath application is expected after the first death;
// prolonged stacks can explain a wipe, but do not classify the first
// stack as a player error without an actual bad HP gap and survival limit.
//
// -- FUTURE DETECTION / LOG VALIDATION --------------------------------------
//
// Gate all rules to MYTHIC Twin Fangs. Resolve Vexhul, Ithraz, globules,
// bulwarks, Spawn of Vexhul, broodlings, blood founts, and environmental
// effects by report-specific actor/instance IDs and names, not fixed actor
// IDs. Identify each phase via both bosses' Submerge casts and each Feast
// and Deluge via actual cast/aura windows. Verify the real event ID and
// event type for every spell above; cast, periodic damage, aura, and
// triggered explosion may have different IDs. Check whether globule/fount
// despawn or death corresponds to success, timeout, or a pull ending.
//
// First promising failure signals: unattended globule bursts; Visceral
// Burst completions; Tainted Burst; unsoaked Stone Breaker impacts;
// Feasted repeat bites; avoidable Corrosive Spit, Stir waves, Deluge
// splash, Vile Flood, storm/pool hits; and cap deaths after an avoidable
// Eternal Venom gain. Context/expected: Venomous Emergence stacks, planned
// globule pickups, initial Feast hits, routine Fumes, Deluge tank damage,
// Blood Torrent absorb, and the first Uncoiled Wrath application.
//
// Reconstruct a per-player Venom ledger in timestamp order: apply stack,
// remove at Feast, then classify cap death by its most recent causes. Track
// healer/fount events and globule/bulwark interactions separately; a
// missing fount or shield event should produce unknown, not a fabricated
// assignment error. Deduplicate one raid-wide damage pulse across all its
// victims while preserving multiple missed sources when visible. Distinguish
// a mechanic failure from deaths after the pull was already lost. Use the
// established Minor/Major/Raid severity and wipe-marker behavior in the
// neighboring Sentinels detector, but calibrate any death window, stack
// threshold, soak count, or late-add timing on CURRENT Mythic logs.

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import { suppressDuplicateRaidErrors } from "../../../error-detection";
import {
  RAID_MARKER_SORT_OFFSET_MS, kFmt, sec, joinNames, playerError, rezzedAt, lastPlayerEventMs,
} from "../common";

// ─── Ability IDs (log-verified, reports 6Jnq8ycwgkYZpHND + xKP1M6gwC8WpnrBc) ─

const ETERNAL_VENOM       = 1290336; // player debuff, one stack per application
const VENOM_CAP_DEATH     = 1292348; // the killing blow at the 10th application
const ENVENOMED           = 1310360; // Deluge tank debuff
const COILING_ICHOR_MARK  = 1290814; // debuff on the Ichor targets
const CAUSTIC_DELUGE      = 1289192; // Vexhul cast, and the debuff on her tank
const DELUGE_SPLASH       = 1289994; // acid impact that forms a globule
const GLOBULE_PICKUP      = 1289201; // a player touched a globule
const GLOBULE_BURST       = 1290338; // an untouched globule hit the raid
const VENOMOUS_EMERGENCE  = 1291404; // Vexhul cast: a raid-wide stack
const EMERGENCE_HITS      = new Set([1308122, 1307764]);
const CORROSIVE_SPIT_MARK = 1293979; // debuff on the Spawn's target for the 5s cast
const CORROSIVE_SPIT_HIT  = 1293295;
const STIR_WAVE           = 1292807; // debuff (+ occasional damage) per wave hit
const VILE_FLOOD_HIT      = 1294605;
const RAVENOUS_FEAST      = 1290516; // Ithraz cast; bites at +0 / +2.0 / +3.5
const FEAST_BITE          = 1290662;
const FEASTED             = 1310096;
const TAINTED_BURST       = 1310105;
const STONE_BREAKER       = 1288538; // Ithraz cast, one per impact (3 per set)
const STONE_SOAK          = 1310371; // the soaker's hit
const STONE_UNSOAKED      = 1289153; // an empty impact hits the raid
const ROUSE_THE_BROOD     = 1308356;
const VISCERAL_BURST      = 1308385; // broodling cast; completing it = missed kick
const VISCERAL_BURST_HIT  = 1308386;
const SANGUINE_STORM_HIT  = 1306876;
const CONGEALED_GORE      = new Set([1292552, 1306925]); // Ichor pools / Storm pools
const NOXIOUS_SLICK       = 1309471;
const BARBED_BULWARK_HITS = new Set([1307363, 1307538]);
const DEADLY_VENOM        = 1297338; // arena-edge venom (shared across the raid)
const OUT_OF_RANGE_CASTS  = new Set([1295107, 1295115]); // Concentrated Spittle / Clotted Bolt
const UNCOILED_WRATH      = 1308711;

const TWIN_FANGS_SIGNATURE = new Set([ENVENOMED, COILING_ICHOR_MARK, FEASTED]);

// ─── Thresholds ──────────────────────────────────────────────────────────────

// Burst hits within this gap are one burst (two globules at once still share
// one cluster: A12 +300.8 hit 39).
const BURST_CLUSTER_MS = 500;
// Deaths a globule burst must cause before it ends the pull. Survived: 20
// hits and 0-1 deaths every time a single Deluge globule was missed (A1
// +25.8, A7 +82.9, A19 +82.0, B1 +24.4, B10 +22.4). Pulls that lost 5+ to
// one burst (A3 +84.2, A21 +240.3, A12 +300.8, B3 +82.9) never recovered.
const BURST_RAID_DEATHS = 3;
// A burst this long after Caustic Deluge came from the Deluge's own
// globules (every one landed 12.0-16.8s after the cast); other bursts were
// globules released by venomous deaths (B14 +164.2 burst 0.2s after a
// Deluge, from deaths during the transition).
const DELUGE_BURST_MIN_MS = 11000;
const DELUGE_BURST_WINDOW_MS = 17000;
const HIT_DEATH_WINDOW_MS = 1500;

// The 10th stack has no debuff event; the killing blow follows the stack's
// source by 0-0.2s (1.1s once, A1 +60.3).
const CAP_SOURCE_WINDOW_MS = 1200;
const EMERGENCE_STACK_MS = 1500;
// Venomous Emergence capping this many players at once is the fight's soft
// enrage: stacks outpace Feast (A11 +394.3 five, A23 +407.5, the kill lost
// two at +407.9).
const OVERFLOW_RAID_DEATHS = 3;

// Clean bites hit 4-9 players (kill: 8/6/6). A bite that strikes fewer than
// four sends the next strike into the whole raid: 15-19 players, ~800k each.
const FEAST_RAID_BITE = 12;
const FEAST_WINDOW_MS = 6000;
const BITE_CLUSTER_MS = 250;

// Visceral Burst deaths that end the pull: a single completion killed 1-5.
const BROOD_RAID_DEATHS = 3;
const BROOD_WINDOW_MS = 25000;
const BROOD_DEATH_TAIL_MS = 8000; // the burst leaves a 6s stacking DoT

const STONE_SET_GAP_MS = 5000;
const STONE_HIT_MS = 700;

const SPIT_MARK_LOOKBACK_MS = 6500; // 5s cast
const EPISODE_MS = 3000;
const POOL_EPISODE_MS = 1500;
const GROUP_HIT_MS = 1000;
const GROUP_HIT_MIN = 4;

// Every pull that reached 6 dead ended within 31s (A8 +360.2: 30.6s; A13
// fought 27s on with 5 dead, A8 39s).
const COLLAPSE_DEAD = 6;
const TANK_REZ_GRACE_MS = 15000;
const TANK_DEATH_END_MS = 30000;
// Uncoiled Wrath only matters when the survivor lived on (the kill's
// survivor died 0.4s after it gained the buff).
const WRATH_MIN_SURVIVAL_MS = 5000;

// ─── Small helpers ───────────────────────────────────────────────────────────

/** Split time-sorted items wherever consecutive items are more than `gapMs` apart. */
function clusterByGap<T>(items: T[], at: (x: T) => number, gapMs: number): T[][] {
  const groups: T[][] = [];
  let lastT = -Infinity;
  for (const x of [...items].sort((a, b) => at(a) - at(b))) {
    if (at(x) - lastT > gapMs || groups.length === 0) groups.push([x]);
    else groups[groups.length - 1].push(x);
    lastT = at(x);
  }
  return groups;
}

/** Players dead at `t`, net of battle-rezzes. */
function deadAt(players: PlayerInfo[], deaths: DeathEvent[], t: number): DeathEvent[] {
  const byName = new Map(players.map((p) => [p.name, p]));
  const sorted = [...deaths].sort((a, b) => a.timestamp - b.timestamp);
  return sorted.filter((d) => {
    if (d.timestamp > t) return false;
    const next = sorted.find((o) => o.player === d.player && o.timestamp > d.timestamp)?.timestamp ?? Infinity;
    if (next <= t) return false; // a later death supersedes this one
    const p = byName.get(d.player);
    const rez = p ? rezzedAt(p, d.timestamp, next) : undefined;
    return rez === undefined || rez > t;
  });
}

const died = (d: DeathEvent | undefined, from: number) =>
  !d ? "" : d.timestamp - from < 100 ? " and died to it" : ` and died ${sec(d.timestamp - from)}s later`;

const landed = (e: PlayerEvent) => (e.amount ?? 0) > 0;
const total = (g: PlayerEvent[]) => kFmt(g.reduce((s, e) => s + (e.amount ?? 0), 0));
const killedBy = (deaths: DeathEvent[], ids: number[], from: number, to: number) =>
  deaths.filter((d) => ids.includes(d.killingAbilityGameId) && d.timestamp >= from - 100 && d.timestamp <= to);

// ─── Eternal Venom sources ───────────────────────────────────────────────────
//
// Every application is a debuff event on the player (applied, then stack
// 2..9) at the same millisecond as the hit that caused it. The 10th has no
// debuff event: the player dies to 1292348 instead, 0-0.2s after the hit.

type VenomSource = "pickup" | "burst" | "emergence" | "spit" | "wave" | "flood" | "splash" | "other";

const SOURCE_BY_HIT = new Map<number, VenomSource>([
  [GLOBULE_PICKUP, "pickup"], [GLOBULE_BURST, "burst"], [CORROSIVE_SPIT_HIT, "spit"],
  [VILE_FLOOD_HIT, "flood"], [DELUGE_SPLASH, "splash"], [STIR_WAVE, "wave"],
  ...[...EMERGENCE_HITS].map((id) => [id, "emergence"] as [number, VenomSource]),
]);

const SOURCE_LABEL: Record<VenomSource, string> = {
  pickup: "a globule pickup", burst: "a globule burst", emergence: "Venomous Emergence",
  spit: "Corrosive Spit", wave: "a Stir the Depths wave", flood: "Vile Flood",
  splash: "a Caustic Deluge splash", other: "an unlogged source",
};

/** What gave this player the Eternal Venom application at `t` (a debuff event's time). */
function venomSourceAt(p: PlayerInfo, t: number, emergences: number[]): VenomSource {
  const hit = p.damageTaken.find((e) => SOURCE_BY_HIT.has(e.abilityId) && Math.abs(e.timestamp - t) <= 80);
  if (hit) return SOURCE_BY_HIT.get(hit.abilityId)!;
  if (p.debuffs.some((e) => e.abilityId === STIR_WAVE && e.debuffStatus === "applied" && Math.abs(e.timestamp - t) <= 80)) return "wave";
  if (emergences.some((c) => t >= c && t - c <= EMERGENCE_STACK_MS)) return "emergence";
  return "other";
}

/**
 * The source of the fatal 10th application: the latest venom-applying hit in
 * the window before the death that did NOT already produce a logged stack.
 */
function capSource(p: PlayerInfo, death: number, emergences: number[]): { source: VenomSource; t: number } {
  const stackTimes = p.debuffs.filter((e) => e.abilityId === ETERNAL_VENOM && e.debuffStatus !== "removed" && e.debuffStatus !== "stackRemoved")
    .map((e) => e.timestamp);
  const fresh = (t: number) => !stackTimes.some((s) => Math.abs(s - t) <= 80);
  const hits = [
    ...p.damageTaken.filter((e) => SOURCE_BY_HIT.has(e.abilityId)).map((e) => ({ t: e.timestamp, source: SOURCE_BY_HIT.get(e.abilityId)! })),
    ...p.debuffs.filter((e) => e.abilityId === STIR_WAVE && e.debuffStatus === "applied").map((e) => ({ t: e.timestamp, source: "wave" as VenomSource })),
  ].filter((h) => h.t <= death + 50 && h.t >= death - CAP_SOURCE_WINDOW_MS && fresh(h.t)).sort((a, b) => a.t - b.t);
  if (hits.length) return hits[hits.length - 1];
  const em = emergences.filter((c) => death >= c && death - c <= EMERGENCE_STACK_MS).pop();
  return em !== undefined ? { source: "emergence", t: em } : { source: "other", t: death };
}

/** "6 Venomous Emergence, 3 globule pickups, ..." for one player's applications before `until`. */
function venomLedger(p: PlayerInfo, until: number, emergences: number[]): string {
  // Count from the debuff's latest fresh application (a death and rez clears it).
  const since = p.debuffs.filter((e) => e.abilityId === ETERNAL_VENOM && e.debuffStatus === "applied" && e.timestamp < until).pop()?.timestamp ?? 0;
  const gains = p.debuffs.filter((e) => e.abilityId === ETERNAL_VENOM && e.timestamp >= since && e.timestamp < until && (e.debuffStatus === "applied" || e.debuffStatus === "stack"));
  const counts = new Map<VenomSource, number>();
  for (const g of gains) {
    const s = venomSourceAt(p, g.timestamp, emergences);
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  // Most removals are Feast bites; the rest carry no hit at their millisecond.
  const removed = p.debuffs.filter((e) => e.abilityId === ETERNAL_VENOM && e.debuffStatus === "stackRemoved" && e.timestamp >= since && e.timestamp < until - 300).length;
  const parts = [...counts].sort((a, b) => b[1] - a[1]).map(([s, n]) => `${n}x ${SOURCE_LABEL[s]}`);
  return `${gains.length} applications before this (${parts.join(", ") || "none"}), ${removed} removed (mostly by Ravenous Feast)`;
}

const AVOIDABLE_SOURCES = new Set<VenomSource>(["spit", "wave", "flood", "splash"]);

// ─── Venom cap deaths ────────────────────────────────────────────────────────
//
// Reaching 10 applications kills. A cap death from a globule burst belongs
// to the burst (a raid failure, counted in its killed list). Three or more
// capped by one Venomous Emergence is the soft enrage. Every other cap death
// names the player, with their stack history in the description.

export const TF_VENOM_CAP_RULE_ID = "wow-tf-venom-cap";
export const TF_VENOM_OVERFLOW_RULE_ID = "wow-tf-venom-overflow";

function detectVenomCap(players: PlayerInfo[], deaths: DeathEvent[], emergences: number[]): PullError[] {
  const errors: PullError[] = [];
  const byName = new Map(players.map((p) => [p.name, p]));
  const caps = deaths.filter((d) => d.killingAbilityGameId === VENOM_CAP_DEATH && byName.has(d.player))
    .map((d) => ({ d, p: byName.get(d.player)!, ...capSource(byName.get(d.player)!, d.timestamp, emergences) }));

  const overflowAt = new Set<number>();
  for (const em of emergences) {
    const capped = caps.filter((c) => c.source === "emergence" && c.t === em);
    if (capped.length < OVERFLOW_RAID_DEATHS) continue;
    overflowAt.add(em);
    errors.push({
      ruleId:      TF_VENOM_OVERFLOW_RULE_ID,
      severity:    "Raid",
      name:        "Eternal Venom Overflow",
      description: `Venomous Emergence at +${sec(em)}s capped ${capped.length} players at 10 Eternal Venom: ${joinNames(capped.map((c) => c.p.name))}. ` +
        "The raid's stacks outgrew what Ravenous Feast removes — the fight's soft enrage. Treated as the cutoff point.",
      timestamp:   capped[0].d.timestamp + RAID_MARKER_SORT_OFFSET_MS,
      abilityId:   VENOM_CAP_DEATH,
      abilityName: "Eternal Venom",
    });
  }

  for (const c of caps) {
    if (c.source === "burst") continue;
    if (c.source === "emergence" && overflowAt.has(c.t)) continue;
    const how = c.source === "pickup"
      ? "picked up a Caustic Globule while already at 9 stacks"
      : `took the 10th stack from ${SOURCE_LABEL[c.source]}`;
    errors.push(playerError(c.p, {
      ruleId:      TF_VENOM_CAP_RULE_ID,
      severity:    "Major",
      name:        "Died at the Eternal Venom Cap",
      description: `Died at 10 Eternal Venom: ${how}${AVOIDABLE_SOURCES.has(c.source) ? " (avoidable)" : ""}. ` +
        `${venomLedger(c.p, c.d.timestamp, emergences)}.`,
      timestamp:   c.d.timestamp,
      abilityId:   VENOM_CAP_DEATH,
      abilityName: "Eternal Venom",
    }));
  }
  return errors;
}

// ─── Caustic Globules ────────────────────────────────────────────────────────
//
// Every Caustic Deluge ejects 15 globules; each venomous death releases 3
// more ~2s later. Untouched, a globule bursts 12-17s after the Deluge for
// ~400k and one stack on every player. Who was meant to take it isn't in the
// log, so a burst is player-less.

export const TF_GLOBULE_BURST_RULE_ID = "wow-tf-globule-burst";
export const TF_GLOBULE_PICKUP_DEATH_RULE_ID = "wow-tf-globule-pickup-death";

function detectGlobuleBursts(players: PlayerInfo[], deaths: DeathEvent[], deluges: number[], emergences: number[]): PullError[] {
  const byName = new Map(players.map((p) => [p.name, p]));
  const hits = players.flatMap((p) => p.damageTaken.filter((e) => e.abilityId === GLOBULE_BURST));
  const clusters = clusterByGap(hits, (e) => e.timestamp, BURST_CLUSTER_MS);
  // A cap death counts when a burst gave the 10th stack.
  const burstDeaths = deaths.filter((d) => d.killingAbilityGameId === GLOBULE_BURST ||
    (d.killingAbilityGameId === VENOM_CAP_DEATH && byName.has(d.player) && capSource(byName.get(d.player)!, d.timestamp, emergences).source === "burst"));
  return clusters.map((g, i) => {
    const t = g[0].timestamp;
    const until = Math.min(g[g.length - 1].timestamp + HIT_DEATH_WINDOW_MS, clusters[i + 1]?.[0].timestamp ?? Infinity);
    const killed = burstDeaths.filter((d) => d.timestamp >= t - 100 && d.timestamp < until);
    const raid = killed.length >= BURST_RAID_DEATHS;
    const deluge = deluges.filter((d) => d <= t).pop();
    const recentDeaths = deaths.filter((d) => d.timestamp < t && d.timestamp >= t - DELUGE_BURST_WINDOW_MS).length;
    const fromDeluge = deluge !== undefined && t - deluge >= DELUGE_BURST_MIN_MS && t - deluge <= DELUGE_BURST_WINDOW_MS;
    const origin = fromDeluge ? `${sec(t - deluge!)}s after Caustic Deluge` : "from globules released by players who died with Eternal Venom";
    // Each globule hits every living player once, so repeat victims mean several globules.
    const perPlayer = new Map<string, number>();
    for (const p of players) {
      const n = p.damageTaken.filter((e) => e.abilityId === GLOBULE_BURST && e.timestamp >= t && e.timestamp <= g[g.length - 1].timestamp).length;
      if (n) perPlayer.set(p.name, n);
    }
    const globules = Math.max(1, ...perPlayer.values());
    return {
      ruleId:      TF_GLOBULE_BURST_RULE_ID,
      severity:    raid ? "Raid" as const : "Minor" as const,
      name:        "Caustic Globule Burst",
      description: `${globules === 1 ? "A Caustic Globule" : `${globules} Caustic Globules`} nobody picked up burst ${origin}, hitting ${perPlayer.size} player${perPlayer.size === 1 ? "" : "s"}` +
        ` (${kFmt(g.reduce((s, e) => s + (e.amount ?? 0), 0) / g.length)} and an Eternal Venom stack per globule)` +
        (killed.length ? ` and killing ${killed.length}: ${joinNames(killed.map((d) => d.player))}` : "") + "." +
        (recentDeaths ? ` ${recentDeaths} player${recentDeaths === 1 ? "" : "s"} had died in the ${sec(DELUGE_BURST_WINDOW_MS)}s before, each releasing extra globules.` : "") +
        (raid ? " Treated as the point the pull was over." : ""),
      timestamp:   t,
      abilityId:   GLOBULE_BURST,
      abilityName: "Caustic Globule",
      abilityIcon: g[0].abilityIcon,
    };
  });
}

function detectPickupDeaths(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const byName = new Map(players.map((p) => [p.name, p]));
  return deaths.filter((d) => d.killingAbilityGameId === GLOBULE_PICKUP && byName.has(d.player)).map((d) => {
    const p = byName.get(d.player)!;
    const recent = p.damageTaken.filter((e) => e.abilityId === GLOBULE_PICKUP && e.timestamp <= d.timestamp + 50 && e.timestamp >= d.timestamp - EPISODE_MS);
    const last = recent[recent.length - 1];
    const hp = last?.healthBefore !== undefined && last.maxHealth ? ` at ${Math.round((100 * last.healthBefore) / last.maxHealth)}% health` : "";
    return playerError(p, {
      ruleId:      TF_GLOBULE_PICKUP_DEATH_RULE_ID,
      severity:    "Major",
      name:        "Died Picking Up a Globule",
      description: (recent.length > 1
        ? `Picked up ${recent.length} Caustic Globules within ${sec(d.timestamp - recent[0].timestamp)}s`
        : "Picked up a Caustic Globule") + `${hp} (${total(recent)}) and died to it.`,
      timestamp:   d.timestamp,
      abilityId:   GLOBULE_PICKUP,
      abilityName: "Caustic Globule",
      abilityIcon: last?.abilityIcon,
    });
  });
}

// ─── Ravenous Feast ──────────────────────────────────────────────────────────
//
// Three bites at cast +0 / +2.0 / +3.5, each split across the players in
// front of Ithraz and removing one Venom stack from each. A bitten player
// gets Feasted (8s); a second bite on them hits ~800k+ and removes nothing.
// A bite that finds fewer than four players strikes the whole raid instead.

export const TF_FEAST_DOUBLE_RULE_ID = "wow-tf-feast-double-bite";
export const TF_FEAST_RAID_RULE_ID = "wow-tf-feast-raid-bite";

function detectFeast(players: PlayerInfo[], deaths: DeathEvent[], feasts: number[]): PullError[] {
  const errors: PullError[] = [];
  for (const f of feasts) {
    const hits = players.flatMap((p) => p.damageTaken.filter((e) => e.abilityId === FEAST_BITE && e.timestamp >= f - 50 && e.timestamp <= f + FEAST_WINDOW_MS).map((e) => ({ p, e })));
    const bites = clusterByGap(hits, (h) => h.e.timestamp, BITE_CLUSTER_MS);
    bites.forEach((bite, i) => {
      const t = bite[0].e.timestamp;
      const end = bite[bite.length - 1].e.timestamp + HIT_DEATH_WINDOW_MS;
      if (bite.length >= FEAST_RAID_BITE) {
        const killed = killedBy(deaths, [FEAST_BITE], t, end);
        const prev = bites[i - 1];
        errors.push({
          ruleId:      TF_FEAST_RAID_RULE_ID,
          severity:    "Raid",
          name:        "Ravenous Feast Hit the Raid",
          description: `A Ravenous Feast bite +${sec(t - f)}s into the Feast struck ${bite.length} players for ${kFmt(bite.reduce((s, h) => s + (h.e.amount ?? 0), 0) / bite.length)} each` +
            (killed.length ? `, killing ${killed.length}` : "") + ". A bite that reaches fewer than 4 players strikes the whole raid" +
            (prev && t - prev[prev.length - 1].e.timestamp < 1000 ? ` (the bite just before it reached ${prev.length})` : "") +
            ". Treated as the point the pull was over.",
          timestamp:   t,
          abilityId:   FEAST_BITE,
          abilityName: "Ravenous Feast",
          abilityIcon: bite[0].e.abilityIcon,
        });
        return;
      }
      for (const { p, e } of bite) {
        const feasted = p.debuffs.find((d) => d.abilityId === FEASTED && d.debuffStatus === "applied" && d.timestamp >= f - 50 && d.timestamp < t - 200);
        if (!feasted) continue;
        const death = deaths.find((d) => d.player === p.name && d.killingAbilityGameId === FEAST_BITE && d.timestamp >= t - 100 && d.timestamp <= end);
        errors.push(playerError(p, {
          ruleId:      TF_FEAST_DOUBLE_RULE_ID,
          severity:    death ? "Major" : "Minor",
          name:        "Bitten Twice by Ravenous Feast",
          description: `Took a second Ravenous Feast bite +${sec(t - f)}s into the Feast while still Feasted from the one at +${sec(feasted.timestamp - f)}s ` +
            `(${kFmt(e.amount ?? 0)}; a Feasted player takes +800% and loses no stack)${died(death, e.timestamp)}.`,
          timestamp:   e.timestamp,
          abilityId:   FEAST_BITE,
          abilityName: "Ravenous Feast",
          abilityIcon: e.abilityIcon,
        }));
      }
    });
  }
  return errors;
}

// ─── Tainted Burst: a blood fount wasn't healed out ──────────────────────────

export const TF_TAINTED_BURST_RULE_ID = "wow-tf-tainted-burst";

function detectTaintedBurst(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const hits = players.flatMap((p) => p.damageTaken.filter((e) => e.abilityId === TAINTED_BURST));
  return clusterByGap(hits, (e) => e.timestamp, BURST_CLUSTER_MS).map((g) => {
    const t = g[0].timestamp;
    const killed = killedBy(deaths, [TAINTED_BURST], t, g[g.length - 1].timestamp + HIT_DEATH_WINDOW_MS);
    const raid = killed.length >= BURST_RAID_DEATHS;
    return {
      ruleId:      TF_TAINTED_BURST_RULE_ID,
      severity:    raid ? "Raid" as const : "Minor" as const,
      name:        "Tainted Burst",
      description: `A Tainted Blood fount wasn't healed out in time and burst, hitting ${g.length} players` +
        (killed.length ? ` and killing ${killed.length}: ${joinNames(killed.map((d) => d.player))}` : "") + "." +
        (raid ? " Treated as the point the pull was over." : ""),
      timestamp:   t,
      abilityId:   TAINTED_BURST,
      abilityName: "Tainted Burst",
      abilityIcon: g[0].abilityIcon,
    };
  });
}

// ─── Rouse the Brood: a broodling finished Visceral Burst ────────────────────
//
// Ten broodlings spawn one per second from Rouse +1.5s, each starting a 3s
// Visceral Burst. Interrupted, it retreats; otherwise it recasts every 5s
// until kicked. The kick order changed from pull to pull, so a missed kick
// has no owner in the log.

export const TF_VISCERAL_BURST_RULE_ID = "wow-tf-visceral-burst";

function detectVisceralBurst(deaths: DeathEvent[], enemyCasts: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const rouse of enemyCasts.filter((e) => e.abilityId === ROUSE_THE_BROOD)) {
    const done = enemyCasts.filter((e) => e.abilityId === VISCERAL_BURST && e.timestamp > rouse.timestamp && e.timestamp <= rouse.timestamp + BROOD_WINDOW_MS);
    if (done.length === 0) continue;
    const broodlings = new Set(done.map((e) => e.sourceInstance ?? e.timestamp)).size;
    const t = done[0].timestamp;
    const killed = killedBy(deaths, [VISCERAL_BURST_HIT], t, done[done.length - 1].timestamp + BROOD_DEATH_TAIL_MS);
    const raid = killed.length >= BROOD_RAID_DEATHS;
    errors.push({
      ruleId:      TF_VISCERAL_BURST_RULE_ID,
      severity:    raid ? "Raid" : "Minor",
      name:        "Visceral Burst Not Interrupted",
      description: `${broodlings === 1 ? "A Broodling of Ithraz" : `${broodlings} Broodlings of Ithraz`} finished Visceral Burst ` +
        `${sec(t - rouse.timestamp)}s after Rouse the Brood` + (done.length > broodlings ? ` and kept casting (${done.length} completions)` : "") +
        (killed.length ? `; it killed ${killed.length}: ${joinNames(killed.map((d) => d.player))}` : "") + "." +
        (raid ? " Treated as the point the pull was over." : ""),
      timestamp:   t,
      abilityId:   VISCERAL_BURST,
      abilityName: "Visceral Burst",
      abilityIcon: done[0].abilityIcon,
    });
  }
  return errors;
}

// ─── Stone Breaker: an impact nobody soaked ──────────────────────────────────
//
// Three impacts 3s apart (+24.5 / +27.5 / +30.5 in each half-cycle). In
// every clean set one tank soaked all three, and the tanks alternated sets.
// An empty impact hits the raid instead (1289153). The owner is the tank
// soaking this set, or, when nobody soaked any of it, the tank whose turn it
// was (the one who didn't soak the previous set).

export const TF_STONE_BREAKER_RULE_ID = "wow-tf-stone-breaker-unsoaked";

function detectStoneBreaker(players: PlayerInfo[], deaths: DeathEvent[], enemyCasts: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  const tanks = players.filter((p) => p.role === "Tank");
  const soakersAt = (t: number) => players.filter((p) => p.damageTaken.some((e) => e.abilityId === STONE_SOAK && e.timestamp >= t - 100 && e.timestamp <= t + STONE_HIT_MS));
  const casts = enemyCasts.filter((e) => e.abilityId === STONE_BREAKER).map((e) => e.timestamp);
  let lastSetTank: PlayerInfo | undefined;
  for (const set of clusterByGap(casts, (t) => t, STONE_SET_GAP_MS)) {
    const setTanks = [...new Set(set.flatMap((t) => soakersAt(t)).filter((p) => p.role === "Tank"))];
    const duty = setTanks.length === 1 ? setTanks[0]
      : setTanks.length === 0 && lastSetTank ? tanks.find((p) => p !== lastSetTank) : undefined;
    for (const [i, t] of set.entries()) {
      const hit = players.flatMap((p) => p.damageTaken.filter((e) => e.abilityId === STONE_UNSOAKED && e.timestamp >= t - 100 && e.timestamp <= t + STONE_HIT_MS));
      if (hit.length === 0) continue;
      const killed = killedBy(deaths, [STONE_UNSOAKED], t, t + HIT_DEATH_WINDOW_MS);
      const dutyDead = duty && deadAt(players, deaths, t).some((d) => d.player === duty.name);
      const outcome = `hit ${hit.length} players` + (killed.length ? ` and killed ${killed.length}: ${joinNames(killed.map((d) => d.player))}` : "");
      const base = { ruleId: TF_STONE_BREAKER_RULE_ID, name: "Stone Breaker Not Soaked", timestamp: t, abilityId: STONE_UNSOAKED, abilityName: "Stone Breaker", abilityIcon: hit[0].abilityIcon };
      if (duty && !dutyDead) {
        errors.push(playerError(duty, {
          ...base, severity: killed.length ? "Major" : "Minor",
          description: `Nobody soaked Stone Breaker impact ${i + 1} of ${set.length}` +
            (setTanks.includes(duty) ? ` (${duty.name} soaked the others in this set)` : ` (${duty.name}'s set: the other tank soaked the previous one)`) +
            `; the empty impact ${outcome}.`,
        }));
      } else {
        errors.push({
          ...base, severity: "Minor",
          description: `Nobody soaked Stone Breaker impact ${i + 1} of ${set.length}` + (duty ? ` (${duty.name}, whose set it was, was dead)` : "") + `; the empty impact ${outcome}.`,
        });
      }
      if (killed.length >= BURST_RAID_DEATHS) {
        errors.push({
          ...base, severity: "Raid", timestamp: t + RAID_MARKER_SORT_OFFSET_MS,
          description: `An unsoaked Stone Breaker killed ${killed.length}. Treated as the point the pull was over.`,
        });
      }
    }
    if (setTanks.length === 1) lastSetTank = setTanks[0];
    else if (setTanks.length === 0 && duty) lastSetTank = duty;
  }
  return errors;
}

// ─── Avoidable damage ────────────────────────────────────────────────────────

export const TF_SPIT_RULE_ID = "wow-tf-corrosive-spit";
export const TF_WAVE_RULE_ID = "wow-tf-stir-wave";
export const TF_SPLASH_RULE_ID = "wow-tf-deluge-splash";
export const TF_FLOOD_RULE_ID = "wow-tf-vile-flood";
export const TF_STORM_RULE_ID = "wow-tf-sanguine-storm";
export const TF_GORE_RULE_ID = "wow-tf-congealed-gore";
export const TF_SLICK_RULE_ID = "wow-tf-noxious-slick";
export const TF_BULWARK_RULE_ID = "wow-tf-barbed-bulwark";
export const TF_DEADLY_VENOM_RULE_ID = "wow-tf-deadly-venom";

/**
 * Per-player avoidable-damage rule: group each player's qualifying hits into
 * episodes. A death is the one those hits (or the Venom cap, when one of them
 * gave the 10th stack) delivered.
 */
function avoidableHits(
  players: PlayerInfo[], deaths: DeathEvent[], hitsOf: (p: PlayerInfo) => PlayerEvent[], killIds: number[], gapMs: number,
  make: (p: PlayerInfo, hits: PlayerEvent[], death: DeathEvent | undefined) => PullError,
): PullError[] {
  const errors: PullError[] = [];
  for (const p of players) {
    for (const g of clusterByGap(hitsOf(p), (e) => e.timestamp, gapMs)) {
      const death = deaths.find((d) => d.player === p.name && killIds.includes(d.killingAbilityGameId) &&
        d.timestamp >= g[0].timestamp - 100 && d.timestamp <= g[g.length - 1].timestamp + HIT_DEATH_WINDOW_MS);
      errors.push(make(p, g, death));
    }
  }
  return errors;
}

/** Annotate errors of one rule that happened to 4+ players within a second. */
function annotateGroups(errors: PullError[], note: (others: number) => string): PullError[] {
  return errors.map((e) => {
    const others = errors.filter((o) => o.player !== e.player && Math.abs(o.timestamp - e.timestamp) <= GROUP_HIT_MS);
    return others.length + 1 >= GROUP_HIT_MIN ? { ...e, description: `${e.description} ${note(others.length)}` } : e;
  });
}

function detectAvoidable(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  // A hit that gave the 10th stack is reported by the cap rule; keep it Minor here.
  const simple = (
    hitsOf: (p: PlayerInfo) => PlayerEvent[], killIds: number[], gapMs: number,
    ruleId: string, name: string, abilityName: string, what: (g: PlayerEvent[]) => string,
  ) => avoidableHits(players, deaths, hitsOf, killIds, gapMs, (p, g, death) => playerError(p, {
    ruleId, name, abilityName,
    severity:    death ? "Major" : "Minor",
    description: `${what(g)}${g.some(landed) ? ` (${total(g)})` : ""}${died(death, g[0].timestamp)}.`,
    timestamp:   g[0].timestamp,
    abilityId:   g[0].abilityId,
    abilityIcon: g[0].abilityIcon,
  }));
  const times = (g: PlayerEvent[]) => (g.length > 1 ? ` ${g.length} times` : "");
  const ticks = (g: PlayerEvent[]) => `${g.length} tick${g.length === 1 ? "" : "s"}`;
  const hitsOfIds = (ids: Set<number>) => (p: PlayerInfo) => p.damageTaken.filter((e) => ids.has(e.abilityId) && landed(e));

  // Corrosive Spit: the marked target always takes it; anyone else in the line didn't have to.
  const spitHits = (p: PlayerInfo) => p.damageTaken.filter((e) => e.abilityId === CORROSIVE_SPIT_HIT && landed(e) &&
    !p.debuffs.some((d) => d.abilityId === CORROSIVE_SPIT_MARK && d.debuffStatus === "applied" && d.timestamp <= e.timestamp + 100 && d.timestamp >= e.timestamp - SPIT_MARK_LOOKBACK_MS));
  const spitTarget = (t: number) => players.find((o) => o.debuffs.some((d) => d.abilityId === CORROSIVE_SPIT_MARK && d.debuffStatus === "applied" &&
    d.timestamp <= t + 100 && d.timestamp >= t - SPIT_MARK_LOOKBACK_MS) && o.damageTaken.some((e) => e.abilityId === CORROSIVE_SPIT_HIT && Math.abs(e.timestamp - t) <= 100))?.name;

  // Stir the Depths waves show as a debuff per hit (the damage is often absorbed or missing).
  const waveHits = (p: PlayerInfo) => p.debuffs.filter((e) => e.abilityId === STIR_WAVE && e.debuffStatus === "applied");

  // Caustic Deluge splash: the tank holding the Deluge is its intended target.
  const splashHits = (p: PlayerInfo) => p.damageTaken.filter((e) => e.abilityId === DELUGE_SPLASH && landed(e) &&
    !p.debuffs.some((d) => d.abilityId === CAUSTIC_DELUGE && d.debuffStatus === "applied" && d.timestamp <= e.timestamp && d.timestamp >= e.timestamp - 7000));

  return [
    ...simple(spitHits, [CORROSIVE_SPIT_HIT], EPISODE_MS, TF_SPIT_RULE_ID, "Hit by Corrosive Spit", "Corrosive Spit",
      (g) => { const tgt = spitTarget(g[0].timestamp); return `Stood in a Spawn of Vexhul's Corrosive Spit line${tgt ? ` aimed at ${tgt}` : ""}${times(g)}, gaining Eternal Venom`; }),
    ...annotateGroups(
      simple(waveHits, [STIR_WAVE], EPISODE_MS, TF_WAVE_RULE_ID, "Hit by a Stir the Depths Wave", "Stir the Depths",
        (g) => `Hit by a Stir the Depths wave${times(g)}, gaining Eternal Venom`),
      (n) => `${n} others were hit by waves in the same second.`,
    ),
    ...simple(splashHits, [DELUGE_SPLASH], EPISODE_MS, TF_SPLASH_RULE_ID, "Hit by Caustic Deluge", "Caustic Deluge",
      (g) => `Stood near Vexhul's tank and was splashed by Caustic Deluge${times(g)}, gaining Eternal Venom`),
    ...simple(hitsOfIds(new Set([VILE_FLOOD_HIT])), [VILE_FLOOD_HIT], POOL_EPISODE_MS, TF_FLOOD_RULE_ID, "Hit by Vile Flood", "Vile Flood",
      (g) => `Caught by Vexhul's Vile Flood beam for ${ticks(g)}, gaining Eternal Venom`),
    ...simple(hitsOfIds(new Set([SANGUINE_STORM_HIT])), [SANGUINE_STORM_HIT], EPISODE_MS, TF_STORM_RULE_ID, "Hit by Sanguine Storm", "Sanguine Storm",
      (g) => `Hit by a Sanguine Storm impact${times(g)}`),
    ...simple(hitsOfIds(CONGEALED_GORE), [...CONGEALED_GORE], POOL_EPISODE_MS, TF_GORE_RULE_ID, "Stood in Congealed Gore", "Congealed Gore",
      (g) => `Stood in Congealed Gore for ${ticks(g)}`),
    ...simple(hitsOfIds(new Set([NOXIOUS_SLICK])), [NOXIOUS_SLICK], POOL_EPISODE_MS, TF_SLICK_RULE_ID, "Stood in Noxious Slick", "Noxious Slick",
      (g) => `Stood in the Noxious Slick left by a Submerge for ${ticks(g)}`),
    ...simple(hitsOfIds(BARBED_BULWARK_HITS), [...BARBED_BULWARK_HITS], EPISODE_MS, TF_BULWARK_RULE_ID, "Hit by a Barbed Bulwark", "Barbed Bulwark",
      (g) => `Touched a Barbed Bulwark around a globule before it was broken${times(g)}`),
    ...simple(hitsOfIds(new Set([DEADLY_VENOM])), [DEADLY_VENOM], POOL_EPISODE_MS, TF_DEADLY_VENOM_RULE_ID, "Stood in Deadly Venom", "Deadly Venom",
      (g) => `Stood in the Deadly Venom at the arena edge for ${ticks(g)}`),
  ];
}

// ─── Boss out of range: Concentrated Spittle / Clotted Bolt ─────────────────

export const TF_OUT_OF_RANGE_RULE_ID = "wow-tf-out-of-range";

function detectOutOfRange(players: PlayerInfo[], deaths: DeathEvent[], enemyCasts: EnemyEvent[]): PullError[] {
  return enemyCasts.filter((e) => OUT_OF_RANGE_CASTS.has(e.abilityId)).flatMap((c) => {
    const hit = players.filter((p) => p.damageTaken.some((e) => e.abilityId === c.abilityId && landed(e) && Math.abs(e.timestamp - c.timestamp) <= 1500));
    if (hit.length === 0) return [];
    const killed = killedBy(deaths, [c.abilityId], c.timestamp, c.timestamp + 3000);
    return [{
      ruleId:      TF_OUT_OF_RANGE_RULE_ID,
      severity:    "Minor" as const,
      name:        `${c.abilityName} (No Tank in Range)`,
      description: `${c.actorName} had no tank in melee range and cast ${c.abilityName} on ${joinNames(hit.map((p) => p.name))}` +
        (killed.length ? `, killing ${joinNames(killed.map((d) => d.player))}` : "") + ".",
      timestamp:   c.timestamp,
      abilityId:   c.abilityId,
      abilityName: c.abilityName,
      abilityIcon: c.abilityIcon,
    }];
  });
}

// ─── Uncoiled Wrath: one serpent died well before the other ──────────────────

export const TF_UNCOILED_WRATH_RULE_ID = "wow-tf-uncoiled-wrath";

function detectUncoiledWrath(enemyBuffs: EnemyEvent[], pullEnd: number): PullError[] {
  const first = enemyBuffs.find((e) => e.abilityId === UNCOILED_WRATH);
  if (!first || pullEnd - first.timestamp < WRATH_MIN_SURVIVAL_MS) return [];
  return [{
    ruleId:      TF_UNCOILED_WRATH_RULE_ID,
    severity:    "Raid",
    name:        "Uncoiled Wrath",
    description: `${first.actorName} gained Uncoiled Wrath (+30% damage every 4s) when its twin died, and lived ${sec(pullEnd - first.timestamp)}s more. ` +
      "The two health pools weren't brought down together. Treated as the cutoff point.",
    timestamp:   first.timestamp,
    abilityId:   UNCOILED_WRATH,
    abilityName: "Uncoiled Wrath",
    abilityIcon: first.abilityIcon,
  }];
}

// ─── When was the pull over? ─────────────────────────────────────────────────
//
// Only the EARLIEST generic marker is emitted, and only when no mechanic
// Raid error came before it (see vashnik.ts). No pull in either report ended
// with a called wipe (every death had a killing blow).

export const TF_PULL_OVER_RULE_ID = "wow-tf-pull-over";

function detectPullOver(players: PlayerInfo[], deaths: DeathEvent[], pullEnd: number): PullError[] {
  const candidates: PullError[] = [];
  const marker = (timestamp: number, name: string, description: string, abilityId: number, abilityName: string) =>
    candidates.push({ ruleId: TF_PULL_OVER_RULE_ID, severity: "Raid", name, description, timestamp: timestamp + RAID_MARKER_SORT_OFFSET_MS, abilityId, abilityName });
  const byName = new Map(players.map((p) => [p.name, p]));
  const cause = (d: DeathEvent) => (d.killingAbilityGameId ? d.cause : "no killing blow logged");
  const sorted = [...deaths].sort((a, b) => a.timestamp - b.timestamp);

  for (const d of sorted) {
    const dead = deadAt(players, deaths, d.timestamp);
    if (dead.length >= COLLAPSE_DEAD) {
      marker(d.timestamp, "Raid Collapse",
        `${dead.length} players dead at once: ${joinNames(dead.map((x) => `${x.player} (${cause(x)}, +${sec(x.timestamp)}s)`))}. ` +
        "Treated as the point the pull was over.",
        d.killingAbilityGameId, cause(d));
      break;
    }
  }

  for (const d of sorted) {
    if (byName.get(d.player)?.role !== "Tank") continue;
    const next = sorted.find((o) => o.player === d.player && o.timestamp > d.timestamp)?.timestamp ?? Infinity;
    const rez = rezzedAt(byName.get(d.player)!, d.timestamp, next);
    if (rez !== undefined && rez - d.timestamp <= TANK_REZ_GRACE_MS) continue;
    if (pullEnd - d.timestamp > TANK_DEATH_END_MS) continue;
    marker(d.timestamp, "Tank Died",
      `Tank ${d.player} died (${cause(d)})` + (rez !== undefined ? ` and wasn't rezzed until ${sec(rez - d.timestamp)}s later` : " and wasn't rezzed") +
      `; the pull ended ${sec(pullEnd - d.timestamp)}s after. Treated as the point the pull was over.`,
      d.killingAbilityGameId, cause(d));
  }

  // Earliest wins; within 1s a specific cause beats the generic head-count.
  const rank = (e: PullError) => e.timestamp + (e.name === "Raid Collapse" ? 1000 : 0);
  return candidates.sort((a, b) => rank(a) - rank(b)).slice(0, 1);
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export function detectTwinFangsErrors(
  players:         PlayerInfo[],
  deaths:          DeathEvent[] = [],
  enemyCasts:      EnemyEvent[] = [],
  enemyBuffs:      EnemyEvent[] = [],
  pullDurationMs?: number
): PullError[] {
  // Self-gate: tank deaths and generic damage exist in every fight.
  const isTwinFangs = players.some((p) => p.debuffs.some((e: PlayerEvent) => TWIN_FANGS_SIGNATURE.has(e.abilityId)));
  if (!isTwinFangs) return [];

  const castTimes = (id: number) => enemyCasts.filter((e) => e.abilityId === id).map((e) => e.timestamp);
  const emergences = castTimes(VENOMOUS_EMERGENCE);
  const pullEnd = pullDurationMs ?? lastPlayerEventMs(players);

  const errors = [
    ...detectVenomCap(players, deaths, emergences),
    ...detectGlobuleBursts(players, deaths, castTimes(CAUSTIC_DELUGE), emergences),
    ...detectPickupDeaths(players, deaths),
    ...detectFeast(players, deaths, castTimes(RAVENOUS_FEAST)),
    ...detectTaintedBurst(players, deaths),
    ...detectVisceralBurst(deaths, enemyCasts),
    ...detectStoneBreaker(players, deaths, enemyCasts),
    ...detectAvoidable(players, deaths),
    ...detectOutOfRange(players, deaths, enemyCasts),
    ...detectUncoiledWrath(enemyBuffs, pullEnd),
  ];

  const firstRaid = Math.min(Infinity, ...errors.filter((e) => e.severity === "Raid").map((e) => e.timestamp));
  errors.push(...detectPullOver(players, deaths, pullEnd).filter((e) => e.timestamp < firstRaid));

  return suppressDuplicateRaidErrors(errors.sort((a, b) => a.timestamp - b.timestamp));
}
