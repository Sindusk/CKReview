// lib/mechanics/wow/va/sszorak.ts
//
// Mythic Sszorak (The Venomous Abyss) — per-pull error detection. Called
// from transformFightToPull in lib/log-transforms.ts; it self-gates on this
// encounter's aura IDs, so it is safe on any WoW pull.
//
// The second half of this header is the guide-derived encounter model
// (written 2026-09-26 before any log was available). The first half is what
// the logs actually showed; where the two disagree, the log section wins.
//
// ── VERIFIED AGAINST LOGS (report rNL38zFGMbyADRTh, 36 Mythic pulls, all
//    wipes, longest +289s; offsets fight-relative) ───────────────────────────
//
// Timeline (fixed across pulls): Serpent's Fury at +0, charge ~+26; Surge
// +29 (drops +42/+44); Crosswinds +40 (expire +47.8); Fury charge ~+75;
// Surge +76 (drops +89/+91); Crosswinds +87 (expire +94.7); Howling
// Maelstrom with Dig In at +100 exactly; then the loop repeats (Fury charge
// ~+152, Surge +156, Crosswinds +167, Fury ~+201, Surge +203, Crosswinds
// +214, Dig In +227). No cast event exists for Maelstrom, To the Slaughter,
// Caustic Claws or Apex Predator; Dig In (enemy buff 1286033) marks the
// Maelstrom.
//
// Serpent's Fury: debuff 1305621 on the mark (always the same player in
// this report). Its REMOVAL is the charge: 0.8s later every player in the
// stack gets Virulence, alternating 1297707 / 1299899 in path order, 9+9 of
// 18 with the healers usually out of it. The charge came ~26s after the
// first mark and ~42s after later ones; Unbound Ferocity (enemy buff
// 1296898) landed 46-47s after a mark (excluding the 25s Dig In, which
// pauses it) — 11 pulls, each an instant 8-18 death wipe. Positions can't
// show who was missing from the stack: successful charges measured only
// 4-16 players within 8yd of the mark (samples are 1-2s stale), so this is
// a player-less Raid error.
//
// Virulence (5s): expiry OR death bursts on players within ~10yd who no
// longer hold that same Virulence ID, re-infecting them (1300089, 350-700k)
// ~10-60ms after the spreader's removal. 78 reinfections in 36 pulls,
// matched spreaders 2-12yd away. Death-triggered bursts chain (pull 11
// +129: six dead in 100ms) — those are death fallout, not flagged.
//
// Mutilate (hit 1285999, split): soak groups are FIXED per tank — the same
// 9 players always soak with each tank (10 soakers normal; 123 of 197 had
// exactly 10). Deaths only at <=5 soakers (~0.9-1.1M each) or on a soaker
// who still had Mutilated Gash (1277051, +500% Mutilate damage) from their
// own group's soak ~4-16s earlier (pulls 21/23/31: all died).
//
// Ravage (hit 1277101, debuff 1277105 ~25s): only ever hits its target. A
// non-tank Ravage only happened after both tanks were dead. Two
// applydebuffstack (a tank took a second Ravage while debuffed): 21 +147,
// 36 +270, neither died.
//
// Tempest (1287083): ~320k per direct hit plus a stacking DoT; tornadoes
// persist ~40s. Two hits are usually fatal (65 deaths in 28 pulls).
//
// Raging Crosswinds: 8 players get one of four direction auras (1285425 /
// 1285453 / 1297096 / 1297111, two each; 1312219 ticks) for 8s, then a
// blast (1285616, ~350k) and a knockback with Turbulent Gusts (1285447).
// Partners pair by direction: 1297096<->1297111 and 1285425<->1285453
// lose Gusts at the same moment when they collide. A non-holder was
// caught in a blast 15 times in 79 sets. Ability-less deaths 4.6-5.6s
// after the blast at healthy HP are falls off the platform (holders or
// blasted players: pulls 1/4/9/14/19/22/25/27).
//
// Venomous Surge (debuff 1305963, 10s; two players per cast, 2s apart):
// expiry detonates on the whole raid (1306120, ~150k flat) and leaves a
// Viscous Cyst where the holder stood (also when the holder dies). No cyst
// actor is logged. A cyst POP hits EVERY player at once (1287205 hit +
// 5s DoT debuff); a second pop inside those 5s stacks it (applydebuffstack)
// and killed 12-19 at a time. Maelstrom (clean): exactly four pops at Dig
// In +3/+12/+20/+28, one per cyst, each hitting all alive players. The
// popper can be located by position: at a pop the nearest player stood
// 0.4-6yd from a live cyst's drop spot.
//
// Failures seen:
//   · Early pops (before Dig In): Crosswinds knockbacks into a cyst (12
//     +95.8 then +97.1, 12 dead), a cyst dropped among the raid or melee
//     (35 +86.5/+87.4), a pop just before Dig In (25 +99.7). Each costs a
//     Maelstrom gale its cyst.
//   · Two cysts popped in one gale (15 +112/+113 drops only 10yd apart,
//     19 dead; 9 +111.6-113.2, 15 dead; 2 +120.4 drops 17yd apart).
//   · A gale with no cyst: the raid is blown off (ability-less deaths
//     ~4-7s later: 1 +106.8 13 dead, 14 +106.8 14 dead, 25 +126.7,
//     32 +124.2).
//   · A pop within 0.5s of a Surge expiry: the holder dropped the cyst
//     where it went off at once (13 +87.2, 35 +87.4).
//
// Wipe survey (where each pull was over):
//   Unbound Ferocity   5, 6, 16, 18, 24, 27 (and 3/19/22/26/36 after an
//                      earlier cutoff; 36's is its only one)
//   Maelstrom falls    1, 14, 25
//   Cysts in one gale  9, 10, 15
//   Early cyst pops    12, 35
//   Generic markers    2 (Tempest/Surge deaths), 3, 4 (tank died to a
//                      5-man Mutilate), 7 (Tempest), 11/17/23/28/29/34
//                      (Virulence chains), 13, 19, 20, 21, 22, 26, 30,
//                      31, 32, 33 (tank fell after an early pop)
//   Unexplained        8 — wipe called at +57.7 with 2 dead
//
// Not flagged: Caustic Claws (1305998 — no target/cast event; 48 of 99
// impacts hit one player, which is the target), Caustic Residue (pool
// debuff flickers on every walk-through; 1 death in 36 pulls), Surge
// ticks/detonation, Ula'tek's Presence, Corroding Venom, Gash ticks,
// Crosswinds ticks, the charge's Virulence, a normal Maelstrom pop.
//
// ── RULES IMPLEMENTED ────────────────────────────────────────────────────────
//
//   wow-ssz-unbound-ferocity   Raid        Fury stack missed (100 rage)
//   wow-ssz-virulence-spread   Minor/Major reinfected, and the spreader
//   wow-ssz-mutilate-missed    Minor/Major absent from own group's soak
//   wow-ssz-mutilate-repeat    Minor/Major soaked with Gash still active
//   wow-ssz-ravage-swap        Minor/Major other tank didn't take Ravage
//   wow-ssz-tempest            Minor/Major hit by a tornado
//   wow-ssz-crosswinds-blast   Minor/Major non-holder in a Crosswinds blast
//   wow-ssz-crosswinds-fall    Major       holder knocked off the platform
//   wow-ssz-cyst-early         Minor/Major popped a cyst before Maelstrom
//   wow-ssz-cyst-double        Minor/Raid  two cysts popped in one gale
//   wow-ssz-maelstrom-fall     Major/Raid  blown off during Maelstrom
//   wow-ssz-pull-over          Raid        5+ dead / unrecovered tank death / Berserk
//
// ── GUIDE-DERIVED MODEL (pre-log) ────────────────────────────────────────────
//
// The spell IDs below come from encounter-journal links; they are
// CANDIDATES — the verified section above takes precedence.
//
// Sources checked 2026-09-26:
//   Encounter journal with explicit Mythic rules and spell links:
//   https://www.wowhead.com/guide/midnight/raids/venomous-abyss-sszorak-boss-strategy-abilities
//   Mythic changes and full-fight explanation:
//   https://www.icy-veins.com/wow/sszorak-raid-guide
//   Mythic preparation notes:
//   https://raidstrats.gg/guides/sszorak/mythic
// The model covers ONLY the Mythic encounter, including mechanics inherited
// into Mythic. No Heroic/Normal detection path is intended. The timing and
// assignment claims below are provisional until checked against a real log.
//
// -- ENCOUNTER SHAPE ---------------------------------------------------------
//
// Sszorak is a single-target fight with a repeating main-phase/intermission
// loop. The boss executes rapid Apex Predator tank combos, marks players to
// drop Viscous Cysts, and the Altar of Six Winds gives Raging Crosswinds.
// Later, Howling Maelstrom pushes the whole raid across the arena in a
// telegraphed three-gale order. Players use their PREPLACED Cysts as bumpers
// to knock themselves back toward the middle. During the wind sequence,
// Sszorak's Dig In increases damage taken for a roughly 25-second burn.
//
// The additional Mythic clock is Serpent's Fury: a marked player and rising
// boss rage force the raid to form a 14-player stack within 8 yards of that
// mark. This triggers To the Slaughter, consumes rage, and charges the stack.
// Charge victims then receive Virulence and must spread before its delayed
// bursts can re-infect other players. If rage reaches 100 first, Unbound
// Ferocity is effectively a wipe. Main-phase mechanics continue around this
// sequence, so a successful stack must leave time and space for the spread.
//
// -- ROUGH CHRONOLOGY / PLAYER SOLUTION -------------------------------------
//
// 0. Before pull, identify the wind tunnels showing one, two, and three
//    motes. Those predict the order of Maelstrom gales. Assign two Mutilate
//    soak groups of at least five and cyst drop positions opposite the
//    corresponding tunnels. The exact compass positions vary by pull.
// 1. During the main phase, tank Sszorak so Ravage faces away from the raid
//    and Mutilate faces a fresh assigned soak group. The Apex Predator combo
//    contains two Ravages, two Mutilates, and one Tempest in varying order;
//    tanks exchange threat during the combo so one tank does not repeat the
//    same vulnerable hit. Dodge Tempest tornadoes. Continue controlling
//    Corroding Venom stacks from boss melees.
// 2. Venomous Surge targets move to planned positions and let their debuffs
//    expire, creating one Cyst at each required location. The detonation is
//    raid-wide but diminishes with distance. Keep the raid away from cysts
//    until the intended wind, and keep the boss and Caustic Residue pools
//    away from those paths. The cysts must remain available for Maelstrom.
// 3. Raging Crosswinds gives several players directional arrows. On Mythic
//    there are four cardinal knockback directions. Players with compatible
//    opposite directions meet in the air to remove Turbulent Gusts and land
//    safely. Spread before each wind expires to avoid its nearby blast.
// 4. Mythic Serpent's Fury marks a player and starts/continues the rage
//    timer. Bring at least 14 players within 8 yards of the marked player
//    BEFORE 100 rage. To the Slaughter then charges through those players
//    and resets the rage. Everyone struck spreads out for the five-second
//    Virulence expiry; its burst can pass the debuff to anyone hit.
// 5. At Howling Maelstrom, regroup near the middle. The tunnel with one
//    mote blows first, then two, then three. Each gale pushes the raid away
//    from its tunnel into the corresponding Cyst; the cyst explosion sends
//    players back toward the middle. Repeat for all gales. During Dig In,
//    Sszorak takes roughly 30% increased damage for about 25 seconds.
//    Regroup, reassess wind indicators, replace cysts, and repeat the loop.
//
// Guides put Maelstrom at roughly two-minute intervals and describe about
// two main-phase mechanic rounds before it. Treat that as raid-leading
// orientation, not an exact timer for detection. The Mythic Fury/charge may
// interrupt or overlap the ordering above; associate by actual log events.
//
// -- MYTHIC SERPENT'S FURY / CHARGE / VIRULENCE ------------------------------
//
// Serpent's Fury (1297367) marks one player and accumulates boss rage. Icy
// Veins reports that the marked player appeared to be the FURTHEST from the
// boss in testing. This is a hypothesis, not a guaranteed targeting rule;
// do not accuse a player of baiting incorrectly based on distance alone.
// The journal's firm condition is >=14 players within 8 yards of the mark.
// Upon reaching it, Sszorak consumes rage and casts To the Slaughter
// (1297414), charging toward the marked player. The marked player can move
// into a prepared stack; the charge path and exact strike radius need logs.
// With fewer than 14, the raid can still recover while rage remains below
// 100. At 100, Unbound Ferocity (1296898) increases damage by 500% and
// attack speed by 50%, so a verified application is a strong failure/wipe
// signal. Do not conflate a normal To the Slaughter hit with this failure.
//
// Players hit by To the Slaughter get Virulence (1297707). The journal says
// Virulence lasts five seconds with periodic damage and bursts ON REMOVAL,
// hitting nearby players and infecting those struck with Virulence again.
// Thus the required call is "stack to trigger, then spread". A charge hit
// and the first Virulence application are expected. Secondary applications
// and burst damage to another player are strong spread-failure candidates.
// A detector should pair the first aura application with the charge, then
// inspect each removal and secondary application in timestamp order; do not
// label an original charge victim as a spread failure for merely receiving
// Virulence. Check whether death removal also triggers a burst in the log.
// A multi-player burst can chain, so deduplicate raid-wide/cascade errors
// while retaining identifiable spreaders and victims where possible.
//
// -- APEX PREDATOR AND TANKS -------------------------------------------------
//
// Apex Predator (1277025) is a quick five-attack combo with two Ravages
// (1277002), two Mutilates (1277027), and one Tempest (1287072), in variable
// order. Taunts can change the victim even during casts. Icy Veins says
// Tempest is not first or last, but verify this before using a sequence
// validator. Match each completed attack to its actual targets rather than
// assuming a fixed Ravage/Mutilate order.
//
// Ravage is a frontal physical hit that should strike the tank alone and
// face AWAY from the raid. It applies a stacking 600% increase to further
// Ravage damage for about 25 seconds. A non-tank Ravage hit is a plausible
// avoidable frontal error. A second Ravage on a still-vulnerable tank can
// be fatal and may indicate a failed handoff, but check mitigations and
// whether the first hit's aura was present before blaming either tank.
//
// Mutilate is a frontal Nature hit SPLIT among the players it strikes. If
// fewer than five are hit, the journal says it deals deadly damage. A
// proper soak includes a tank plus enough assigned players. Mutilated Gash
// (1277051) continues damaging the group for about 22 seconds and increases
// subsequent Mutilate damage taken by 500%. Mythic groups therefore use two
// fresh, alternating soak groups; the first should not eat the next
// Mutilate. Identify the soak by damage/auras, not world markers. A thin
// soak or repeat soaker is a possible error; the routine initial Mutilate
// and Gash ticks are intentional damage.
//
// Tempest sends poisonous vortices around the arena. Players dodge their
// paths; the damage, movement slow, and DoT can stack. Corroding Venom
// (1282869) increases a tank's Physical damage taken by about 3% per boss
// melee for 12 seconds. Both tanks coordinate ordinary swaps with the
// combo and those stacks. A tank death, a high stack, or a tornado hit near
// a forced movement overlap needs evidence before causal attribution.
//
// -- VENOMOUS SURGE, CYSTS, AND CAUSTIC RESIDUE ------------------------------
//
// Venomous Surge (1305959) applies to several players for roughly ten
// seconds, ticking Nature damage. On expiry, each holder detonates for
// distance-falloff raid damage and spawns a Viscous Cyst (1287008) at their
// position. Assign separate drops opposite the one-, two-, and three-mote
// tunnels so each Maelstrom gale has a bumper. Do not insist on exact marker
// coordinates; the wind directions can vary, and more than one valid cyst
// arrangement may work. A cyst lasts about two minutes unless contacted
// or expired. Contact/expiry knocks players away and applies short damage
// and slow; the knockback is DELIBERATE in the Maelstrom. An early trigger
// can waste a required cyst and endanger the later wind sequence.
//
// In Mythic, Caustic Claws (1305998) also lands around this part of the
// cycle. Its impact hurts players within about six yards and creates
// Caustic Residue (1296602). The ground pool ticks and increases damage
// taken by 30%. Keep pools away from cyst approach lanes; the Maelstrom
// winds can clear pools pushed off the platform. Distinguish a deliberate
// cyst detonation from someone standing in Residue or being hit by a claw
// impact. A single unavoidable tick when a pool forms under its target
// may need an exemption if Mythic logs show it, as with the Sentinels pools.
//
// -- RAGING CROSSWINDS AND HOWLING MAELSTROM --------------------------------
//
// Raging Crosswinds (1285419) gives a short DoT, then an explosion within
// about six yards and a knockback in the target's indicated direction.
// Turbulent Gusts (1285447) slows falling for around ten seconds. Touching
// another player also carrying Gusts dissipates it, so players aim
// compatible knockbacks toward each other. Mythic permits four cardinal
// directions, complicating pair selection. A correct player may still take
// initial wind damage; look for missed midair collisions, fall deaths, or
// nearby expiry damage after verifying direction events/positions. If the
// log omits arrows, do not invent pair assignments from resulting movement.
// Knockback immunities can be a valid alternate solution but can disrupt a
// partner; classify them only after the actual pairing and outcome are known.
//
// Howling Maelstrom (1285732) uses the preannounced wind-tunnel order.
// Between gales, the raid recenters and lets each push send it into the
// matching Viscous Cyst. The cyst burst sends players back against the wind
// and applies a brief slowing/grounding effect. Dig In (1286033) increases
// damage taken by the boss by 30% for about 25 seconds. This is a normal
// damage window, not a reason to flag ordinary wind/cyst damage. A fall
// from the platform can stem from a missing cyst, an early cyst pop, poor
// alignment, or a player failing to re-center. Map cyst spawn/expiration/
// contact and player positions before blaming the dropper or popper.
//
// Ula'tek's Presence (1285961) is the altar's ambient raid tick, about
// every two seconds. It and the normal Venomous Surge detonation are
// context for survivability, not standalone player mistakes.
//
// -- FUTURE LOG VALIDATION / ERROR CANDIDATES -------------------------------
//
// Gate to Mythic Sszorak. Map Sszorak, the altar/wind sources, cysts, and
// players from report-specific actors, not stable actor IDs. Verify the
// actual spell ID and event type for: Serpent's Fury target and boss rage;
// To the Slaughter cast/charge hits; initial versus propagated Virulence;
// all five Apex Predator subcasts and Gash; Surge aura/detonation/cyst
// spawn; Caustic Claws/Residue; each Crosswinds arrow/knockback/Gusts;
// Maelstrom gale order, cyst burst, Dig In, and fall/death events. A spell
// link above may describe a cast while the combat-log damage uses another
// ID. Do not use a fixed phase timestamp or infer a wind direction merely
// from the room marker.
//
// Strong candidate failures after verification: Unbound Ferocity from a
// missed Fury stack; Virulence reapplication to someone outside the charge;
// a non-tank Ravage hit; fewer than five Mutilate targets; a repeat Gash
// soaker on the next Mutilate; tornado/Residue hits; and a Maelstrom fall
// tied to a missing or prematurely burst cyst. The first To the Slaughter,
// initial Virulence, correct Mutilate soak/Gash ticks, Surge drops, planned
// cyst detonations, and ambient Presence are expected mechanics.
//
// Severity and blame require the real pull: cluster raid-wide events, mark
// direct player mistakes separately from the point a pull becomes lost,
// suppress post-wipe noise, and allow unknown when position, arrow, aura,
// or target data is unavailable. A first-death cutoff would be too crude
// here; the Sentinels detector's first actual wipe-marker approach is the
// relevant precedent. Do not hard-code one set of markers, a static cyst
// popper assignment, an exact tank taunt plan, or an unverified rage timer.

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent, ErrorSeverity } from "@/types/PullError";
import { suppressDuplicateRaidErrors } from "../../../error-detection";
import { interpolatePlayerPosition, type Position } from "../../player-position";
import { distanceBetween } from "../../geometry";
import {
  RAID_MARKER_SORT_OFFSET_MS, kFmt, sec, yd, debuffIntervals, joinNames, playerError, rezzedAt, lastPlayerEventMs,
} from "../common";

// ─── Ability IDs (log-verified, report rNL38zFGMbyADRTh) ─────────────────────

const SERPENTS_FURY      = 1305621; // debuff on the mark; its removal = the charge
const UNBOUND_FEROCITY   = 1296898; // enemy buff: rage hit 100
const DIG_IN             = 1286033; // enemy buff: marks Howling Maelstrom
const VIRULENCE          = new Set([1297707, 1299899]);
const VIRULENCE_BURST    = 1300089; // a reinfection's hit
const VIRULENCE_DAMAGE   = new Set([VIRULENCE_BURST, 1312189 /* DoT tick */]);
const MUTILATE_HIT       = 1285999;
const MUTILATED_GASH     = 1277051;
const RAVAGE_DEBUFF      = 1277105;
const TEMPEST            = 1287083; // tornado hit + its DoT
const CROSSWINDS_BLAST   = 1285616;
const VENOMOUS_SURGE     = 1305963; // holder's debuff; expiry drops a cyst
const VISCOUS_CYST       = 1287205; // pop hit + DoT on every player
const BERSERK            = 26662;

// Crosswinds direction auras, each mapped to the direction it pairs with.
const CROSSWINDS_PARTNER = new Map([
  [1297096, 1297111], [1297111, 1297096],
  [1285425, 1285453], [1285453, 1285425],
]);

// Pops and deaths from Viscous Cyst, and the aura/debuff checks around them.
const SSZORAK_SIGNATURE = new Set([SERPENTS_FURY, VENOMOUS_SURGE, MUTILATED_GASH]);

// ─── Thresholds ──────────────────────────────────────────────────────────────

// Kills at which a raid-wide mechanic is treated as the wipe.
const RAID_WIPE_KILLS = 3;
const UNBOUND_KILL_WINDOW_MS = 5000;
// The charge applies Virulence to the stack within 0.8s of the Fury removal;
// the earliest reinfection seen was 2.7s after it.
const CHARGE_SWEEP_MS = 2000;
// A reinfection lands ~10-60ms after the spreader's removal (max seen 400ms
// when several expired together; -50ms from clock skew).
const BURST_MATCH_BEFORE_MS = 400;
const BURST_MATCH_AFTER_MS = 60;
const VIRULENCE_DEATH_WINDOW_MS = 5500;
const VIRULENCE_ANY_DEATH_MS = 1000;
const DEATH_REMOVAL_MS = 300;
// Mutilate: one soak's hits land within ~1s. Groups are learned from soaks
// with 7+ players (clean soaks had 9-10; failures 1-5).
const MUTILATE_CLUSTER_MS = 1500;
const GROUP_LEARN_MIN_SOAKERS = 7;
const MUTILATE_DEATH_WINDOW_MS = 3000;
// The +55 soak lands 7s after the first Crosswinds knockback.
const BUSY_KNOCKBACK_MS = 10000;
const RAVAGE_DEATH_WINDOW_MS = 10000;
// Tempest: hits closer than this are one pass through a tornado.
const TEMPEST_EPISODE_MS = 3000;
const TEMPEST_DEATH_WINDOW_MS = 8000;
// Crosswinds: the blast lands with the aura removal; falls died 4.6-5.6s later.
const CROSSWINDS_SET_MS = 1000;
const CROSSWINDS_DEATH_WINDOW_MS = 8000;
const CROSSWINDS_FALL_MIN_MS = 2500;
const CROSSWINDS_FALL_MAX_MS = 9000;
// A cyst pop's hits all land within ~0.3s; the next pop is >= 0.9s later.
const POP_GAP_MS = 700;
// The popper stood 0.4-6yd from the drop spot (samples up to 2s old).
const POP_BLAME_RADIUS = 800;
const POP_TIE_MARGIN = 150;
const INSTANT_POP_MS = 500;
const CYST_DEATH_WINDOW_MS = 8000;
// A pop's DoT lasts 5s; another pop inside it stacks (applydebuffstack).
const CYST_DOT_MS = 5000;
// Maelstrom gales pop cysts at Dig In +3/+12/+20/+28 (latest +31.8); falls
// from a gale die 4-7s later (first seen at +5.9, last gale's by ~+36).
const MAELSTROM_WINDOW_MS = 36000;
const FIRST_GALE_MS = 2000;
const FIRST_FALL_MS = 5000;
const MAELSTROM_POP_WINDOW_MS = 34000;
// Two pops this close inside Maelstrom = one gale hit two cysts.
const DOUBLE_POP_MS = 2500;
const MASS_FALL_MS = 3000;
// Ability-less death at healthy HP = fell off the platform. Real falls had
// 30-100% HP on their last hit; ability-less deaths inside a damage spike
// (Tempest ticks) sat below 15%.
const FALL_MIN_HP_FRACTION = 0.25;
const FALL_HP_LOOKBACK_MS = 4000;
// Generic pull-over markers (same semantics as vashnik.ts).
const COLLAPSE_DEAD = 5;
const TANK_REZ_GRACE_MS = 15000;
const TANK_DEATH_CONTINUE_MS = 30000;

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

function posAt(p: PlayerInfo, t: number): Position | undefined {
  return interpolatePlayerPosition(p, t, { windowMs: 2500, maxSpanMs: 3000 });
}

function distYd(a: Position | undefined, b: Position | undefined): number | undefined {
  return a && b ? distanceBetween(a, b) : undefined;
}

/** Whether `p` is alive at `t`, allowing for battle-rezzes. */
function aliveAt(p: PlayerInfo, deaths: DeathEvent[], t: number): boolean {
  const mine = deaths.filter((d) => d.player === p.name).sort((a, b) => a.timestamp - b.timestamp);
  const last = mine.filter((d) => d.timestamp <= t).pop();
  if (!last) return true;
  const next = mine.find((d) => d.timestamp > last.timestamp)?.timestamp ?? Infinity;
  const rez = rezzedAt(p, last.timestamp, next);
  return rez !== undefined && rez <= t;
}

function deathIn(deaths: DeathEvent[], name: string, from: number, to: number): DeathEvent | undefined {
  return deaths.find((d) => d.player === name && d.timestamp >= from && d.timestamp <= to);
}

/** Ability-less death at healthy HP: knocked off the platform. */
function isFall(p: PlayerInfo | undefined, d: DeathEvent): boolean {
  if (d.killingAbilityGameId !== 0 || !p) return false;
  const last = p.damageTaken
    .filter((e) => e.timestamp <= d.timestamp && e.timestamp >= d.timestamp - FALL_HP_LOOKBACK_MS && e.healthAfter !== undefined && e.maxHealth)
    .pop();
  return !last || last.healthAfter! / last.maxHealth! >= FALL_MIN_HP_FRACTION;
}

/**
 * Mechanics that may have kept `p` away from a soak at `t` — context for the
 * reviewer, not an excuse the detector applies (the user decides).
 */
function busyWith(p: PlayerInfo, t: number): string {
  const within = (id: number, before: number) =>
    debuffIntervals(p, id).find((iv) => iv.start <= t && iv.end >= t - before);
  const cw = [...CROSSWINDS_PARTNER.keys()].map((id) => within(id, BUSY_KNOCKBACK_MS)).find((iv) => iv);
  const reasons = [
    cw ? `knocked back by Raging Crosswinds ${sec(t - cw.end)}s earlier` : "",
    within(SERPENTS_FURY, 0) ? "holding the Serpent's Fury mark" : "",
    within(VENOMOUS_SURGE, 0) ? "carrying Venomous Surge" : "",
  ].filter(Boolean);
  return reasons.length ? ` (was ${joinNames(reasons)})` : "";
}

const died = (d: DeathEvent | undefined, from: number) =>
  d ? ` and died ${sec(d.timestamp - from)}s later (${d.killingAbilityGameId ? d.cause : "fell"})` : "";

// ─── Serpent's Fury: Unbound Ferocity ────────────────────────────────────────

export const SSZ_UNBOUND_RULE_ID = "wow-ssz-unbound-ferocity";

function detectUnbound(players: PlayerInfo[], deaths: DeathEvent[], enemyBuffs: EnemyEvent[]): PullError[] {
  const ub = enemyBuffs.find((e) => e.abilityId === UNBOUND_FEROCITY);
  if (!ub) return [];
  // The mark moves when its holder dies, so time the cycle from the first
  // mark after the last successful charge (a Fury removal that put
  // Virulence on the stack).
  const marks = players.flatMap((p) => p.debuffs
    .filter((e) => e.abilityId === SERPENTS_FURY && e.timestamp <= ub.timestamp)
    .map((e) => ({ name: p.name, e })))
    .sort((a, b) => a.e.timestamp - b.e.timestamp);
  const charged = (t: number) => players.some((p) => p.debuffs.some((e) =>
    VIRULENCE.has(e.abilityId) && e.debuffStatus === "applied" && e.timestamp >= t && e.timestamp <= t + CHARGE_SWEEP_MS));
  const lastCharge = marks.filter((m) => m.e.debuffStatus === "removed" && charged(m.e.timestamp)).pop()?.e.timestamp ?? -Infinity;
  const cycle = marks.filter((m) => m.e.debuffStatus === "applied" && m.e.timestamp >= lastCharge);
  const current = cycle[cycle.length - 1];
  const killed = deaths.filter((d) => d.timestamp >= ub.timestamp && d.timestamp <= ub.timestamp + UNBOUND_KILL_WINDOW_MS).length;
  return [{
    ruleId:      SSZ_UNBOUND_RULE_ID,
    severity:    "Raid",
    name:        "Unbound Ferocity",
    description: "Sszorak reached 100 rage before 14 players stacked on the Serpent's Fury mark" +
      (current ? ` (${current.name}; this Fury began ${sec(ub.timestamp - cycle[0].e.timestamp)}s earlier)` : "") +
      ` and gained Unbound Ferocity (+500% damage); ${killed} players died within ${UNBOUND_KILL_WINDOW_MS / 1000}s. Unresolvable from here.`,
    timestamp:   ub.timestamp,
    abilityId:   UNBOUND_FEROCITY,
    abilityName: "Unbound Ferocity",
    abilityIcon: ub.abilityIcon,
  }];
}

// ─── Virulence: didn't spread after the charge ───────────────────────────────

export const SSZ_VIRULENCE_RULE_ID = "wow-ssz-virulence-spread";

function detectVirulence(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const charges = players
    .flatMap((p) => p.debuffs.filter((e) => e.abilityId === SERPENTS_FURY && e.debuffStatus === "removed").map((e) => e.timestamp))
    .sort((a, b) => a - b);
  const removals = players.flatMap((p) =>
    p.debuffs.filter((e) => VIRULENCE.has(e.abilityId) && e.debuffStatus === "removed").map((e) => ({ p, e })));

  // One error per player per charge, keeping the worst.
  const worst = new Map<string, PullError>();
  const keep = (key: string, err: PullError) => {
    const prev = worst.get(key);
    if (!prev || (prev.severity === "Minor" && err.severity === "Major")) worst.set(key, err);
  };

  for (const victim of players) {
    for (const a of victim.debuffs) {
      if (!VIRULENCE.has(a.abilityId) || a.debuffStatus !== "applied") continue;
      const charge = charges.filter((t) => t <= a.timestamp).pop();
      if (charge === undefined || a.timestamp - charge <= CHARGE_SWEEP_MS) continue;

      // Several holders often expire within the match window: the spreader
      // is the closest one (matched spreaders stood 2-12yd away), falling
      // back to the latest removal when positions are missing.
      const here = posAt(victim, a.timestamp);
      const src = removals
        .filter((r) => r.p !== victim && r.e.abilityId === a.abilityId &&
          r.e.timestamp >= a.timestamp - BURST_MATCH_BEFORE_MS && r.e.timestamp <= a.timestamp + BURST_MATCH_AFTER_MS)
        .map((r) => ({ ...r, d: distYd(posAt(r.p, a.timestamp), here) ?? Infinity }))
        .sort((x, y) => x.d - y.d || y.e.timestamp - x.e.timestamp)[0];
      // A dying holder's burst is death fallout.
      if (src && deaths.some((d) => d.player === src.p.name && Math.abs(d.timestamp - src.e.timestamp) <= DEATH_REMOVAL_MS)) continue;

      const hit = victim.damageTaken.find((e) => e.abilityId === VIRULENCE_BURST && Math.abs(e.timestamp - a.timestamp) <= 300);
      // Only a death the reinfection caused: to Virulence itself, or right
      // after the burst hit (not a Tempest 3s later, as in 2 +86.4).
      const death = deaths.find((d) => d.player === victim.name && d.timestamp >= a.timestamp - 100 &&
        (d.timestamp <= a.timestamp + VIRULENCE_ANY_DEATH_MS ||
         (d.timestamp <= a.timestamp + VIRULENCE_DEATH_WINDOW_MS && VIRULENCE_DAMAGE.has(d.killingAbilityGameId))));
      const severity: ErrorSeverity = death ? "Major" : "Minor";
      const apart = src && src.d !== Infinity ? ` (~${yd(src.d)}yd apart)` : "";
      const after = `${sec(a.timestamp - charge)}s after the charge`;
      const base = { ruleId: SSZ_VIRULENCE_RULE_ID, severity, name: "Virulence Not Spread", timestamp: a.timestamp,
        abilityId: a.abilityId, abilityName: "Virulence", abilityIcon: a.abilityIcon };

      keep(`${victim.name}|${charge}`, playerError(victim, {
        ...base,
        description: (src ? `Caught ${src.p.name}'s Virulence burst${apart}` : "Caught a Virulence burst") +
          `${hit?.amount ? ` for ${kFmt(hit.amount)}` : ""} ${after} and was re-infected` +
          (death ? `; died ${sec(death.timestamp - a.timestamp)}s later (${death.cause}).` : "."),
      }));
      if (src) {
        keep(`${src.p.name}|${charge}`, playerError(src.p, {
          ...base,
          description: `Virulence expired next to ${victim.name}${apart} ${after} and re-infected them` +
            (death ? `; ${victim.name} died ${sec(death.timestamp - a.timestamp)}s later (${death.cause}).` : "."),
        }));
      }
    }
  }
  return [...worst.values()];
}

// ─── Mutilate: missed and repeated soaks ─────────────────────────────────────

export const SSZ_MUTILATE_MISSED_RULE_ID = "wow-ssz-mutilate-missed";
export const SSZ_MUTILATE_REPEAT_RULE_ID = "wow-ssz-mutilate-repeat";

function detectMutilate(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const hits = players.flatMap((p) => p.damageTaken.filter((e) => e.abilityId === MUTILATE_HIT).map((e) => ({ p, e })));
  const soaks = clusterByGap(hits, (h) => h.e.timestamp, MUTILATE_CLUSTER_MS).map((g) => {
    const soakers = [...new Set(g.map((h) => h.p))];
    return { t: g[0].e.timestamp, soakers, tank: soakers.find((p) => p.role === "Tank"), hits: g };
  });

  // Soak groups are fixed per tank: learn them from this pull's clean soaks.
  const tally = new Map<string, Map<string, number>>();
  for (const s of soaks) {
    if (!s.tank || s.soakers.length < GROUP_LEARN_MIN_SOAKERS) continue;
    for (const p of s.soakers) {
      if (p === s.tank) continue;
      const m = tally.get(p.name) ?? new Map<string, number>();
      m.set(s.tank.name, (m.get(s.tank.name) ?? 0) + 1);
      tally.set(p.name, m);
    }
  }
  const groupOf = (name: string) =>
    [...(tally.get(name) ?? new Map<string, number>())].sort((a, b) => b[1] - a[1])[0]?.[0];

  const errors: PullError[] = [];
  for (const s of soaks) {
    if (!s.tank) continue; // no tank in it: both tanks were already dead
    const icon = s.hits[0].e.abilityIcon;
    const killed = deaths.filter((d) => d.killingAbilityGameId === MUTILATE_HIT && d.timestamp >= s.t - 100 && d.timestamp <= s.t + MUTILATE_DEATH_WINDOW_MS);
    const each = s.hits.filter((h) => h.p !== s.tank).map((h) => h.e.amount ?? 0);
    const avg = each.length ? each.reduce((x, y) => x + y, 0) / each.length : 0;

    for (const p of s.soakers) {
      const gashed = debuffIntervals(p, MUTILATED_GASH).some((iv) => iv.start < s.t - 100 && iv.end > s.t - 50);
      if (!gashed) continue;
      const death = deathIn(deaths, p.name, s.t - 100, s.t + MUTILATE_DEATH_WINDOW_MS);
      const own = groupOf(p.name);
      errors.push(playerError(p, {
        ruleId:      SSZ_MUTILATE_REPEAT_RULE_ID,
        severity:    death ? "Major" : "Minor",
        name:        "Mutilate With Gash",
        description: `Soaked ${s.tank.name}'s Mutilate while still carrying Mutilated Gash (+500% Mutilate damage)` +
          (own && own !== s.tank.name ? ` — they soak with ${own}` : "") + `${died(death, s.t)}.`,
        timestamp:   s.t,
        abilityId:   MUTILATE_HIT,
        abilityName: "Mutilate",
        abilityIcon: icon,
      }));
    }

    const missing = players.filter((p) =>
      p !== s.tank && groupOf(p.name) === s.tank!.name && !s.soakers.includes(p) && aliveAt(p, deaths, s.t - 50));
    const soak = s.soakers.length === 1 ? "the tank soaked it alone" : `${s.soakers.length} soakers took ${kFmt(avg)} each`;
    for (const p of missing) {
      errors.push(playerError(p, {
        ruleId:      SSZ_MUTILATE_MISSED_RULE_ID,
        severity:    killed.length ? "Major" : "Minor",
        name:        "Missed Mutilate Soak",
        description: `Wasn't in ${s.tank.name}'s Mutilate soak (their group)${busyWith(p, s.t)} — ${soak}` +
          (killed.length ? `; ${joinNames(killed.map((d) => d.player))} died to it.` : "."),
        timestamp:   s.t,
        abilityId:   MUTILATE_HIT,
        abilityName: "Mutilate",
        abilityIcon: icon,
      }));
    }
  }
  return errors;
}

// ─── Ravage: missed tank swap ────────────────────────────────────────────────

export const SSZ_RAVAGE_SWAP_RULE_ID = "wow-ssz-ravage-swap";

function detectRavageSwap(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const tanks = players.filter((p) => p.role === "Tank");
  const errors: PullError[] = [];
  for (const tank of tanks) {
    for (const e of tank.debuffs) {
      if (e.abilityId !== RAVAGE_DEBUFF || e.debuffStatus !== "stack" || (e.stack ?? 0) < 2) continue;
      const death = deathIn(deaths, tank.name, e.timestamp, e.timestamp + RAVAGE_DEATH_WINDOW_MS);
      for (const other of tanks.filter((o) => o !== tank && aliveAt(o, deaths, e.timestamp))) {
        errors.push(playerError(other, {
          ruleId:      SSZ_RAVAGE_SWAP_RULE_ID,
          severity:    death ? "Major" : "Minor",
          name:        "Missed Ravage Swap",
          description: `Didn't take Ravage — ${tank.name} took a second one while still debuffed (+600% Ravage damage)${died(death, e.timestamp).replace(" and", ", and they")}.`,
          timestamp:   e.timestamp,
          abilityId:   RAVAGE_DEBUFF,
          abilityName: "Ravage",
          abilityIcon: e.abilityIcon,
        }));
      }
    }
  }
  return errors;
}

// ─── Tempest tornadoes ───────────────────────────────────────────────────────

export const SSZ_TEMPEST_RULE_ID = "wow-ssz-tempest";

function detectTempest(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const p of players) {
    const hits = p.damageTaken.filter((e) => e.abilityId === TEMPEST && !e.isDoT);
    for (const g of clusterByGap(hits, (e) => e.timestamp, TEMPEST_EPISODE_MS)) {
      const t = g[0].timestamp;
      const death = deaths.find((d) => d.player === p.name && d.killingAbilityGameId === TEMPEST &&
        d.timestamp >= t && d.timestamp <= g[g.length - 1].timestamp + TEMPEST_DEATH_WINDOW_MS);
      const total = g.reduce((s, e) => s + (e.amount ?? 0), 0);
      errors.push(playerError(p, {
        ruleId:      SSZ_TEMPEST_RULE_ID,
        severity:    death ? "Major" : "Minor",
        name:        "Hit by Tempest",
        description: `Hit by a Tempest tornado${g.length > 1 ? ` ${g.length} times` : ""} (${kFmt(total)})${died(death, t)}.`,
        timestamp:   t,
        abilityId:   TEMPEST,
        abilityName: "Tempest",
        abilityIcon: g[0].abilityIcon,
      }));
    }
  }
  return errors;
}

// ─── Raging Crosswinds ───────────────────────────────────────────────────────

export const SSZ_CROSSWINDS_BLAST_RULE_ID = "wow-ssz-crosswinds-blast";
export const SSZ_CROSSWINDS_FALL_RULE_ID = "wow-ssz-crosswinds-fall";

function detectCrosswinds(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const removals = players.flatMap((p) =>
    p.debuffs.filter((e) => CROSSWINDS_PARTNER.has(e.abilityId) && e.debuffStatus === "removed").map((e) => ({ p, e })));
  const errors: PullError[] = [];
  for (const set of clusterByGap(removals, (r) => r.e.timestamp, CROSSWINDS_SET_MS)) {
    const t = set[0].e.timestamp;
    const holders = new Set(set.map((r) => r.p));

    for (const p of players) {
      if (holders.has(p)) continue;
      const blast = p.damageTaken.find((e) => e.abilityId === CROSSWINDS_BLAST && e.timestamp >= t - 200 && e.timestamp <= t + 1000);
      if (!blast) continue;
      const here = posAt(p, blast.timestamp);
      const nearest = set
        .map((r) => ({ name: r.p.name, d: distYd(posAt(r.p, blast.timestamp), here) }))
        .filter((x) => x.d !== undefined)
        .sort((a, b) => a.d! - b.d!)[0];
      const death = deathIn(deaths, p.name, blast.timestamp, blast.timestamp + CROSSWINDS_DEATH_WINDOW_MS);
      errors.push(playerError(p, {
        ruleId:      SSZ_CROSSWINDS_BLAST_RULE_ID,
        severity:    death ? "Major" : "Minor",
        name:        "Crosswinds Blast",
        description: `Stood in a Raging Crosswinds blast without the debuff (${kFmt(blast.amount ?? 0)})` +
          (nearest ? ` — ~${yd(nearest.d!)}yd from ${nearest.name}` : "") + `${died(death, blast.timestamp)}.`,
        timestamp:   blast.timestamp,
        abilityId:   CROSSWINDS_BLAST,
        abilityName: "Raging Crosswinds",
        abilityIcon: blast.abilityIcon,
      }));
    }

    for (const r of set) {
      const d = deathIn(deaths, r.p.name, t + CROSSWINDS_FALL_MIN_MS, t + CROSSWINDS_FALL_MAX_MS);
      if (!d || !isFall(r.p, d)) continue;
      const partners = set.filter((o) => o.e.abilityId === CROSSWINDS_PARTNER.get(r.e.abilityId)).map((o) => o.p.name);
      errors.push(playerError(r.p, {
        ruleId:      SSZ_CROSSWINDS_FALL_RULE_ID,
        severity:    "Major",
        name:        "Crosswinds Fall",
        description: `Knocked off the platform by their own Raging Crosswinds — died ${sec(d.timestamp - t)}s after the knockback` +
          (partners.length ? ` (opposite-direction partners: ${joinNames(partners)}).` : "."),
        timestamp:   d.timestamp,
        abilityId:   r.e.abilityId,
        abilityName: "Raging Crosswinds",
        abilityIcon: r.e.abilityIcon,
      }));
    }
  }
  return errors;
}

// ─── Viscous Cysts and Howling Maelstrom ─────────────────────────────────────

export const SSZ_CYST_EARLY_RULE_ID = "wow-ssz-cyst-early";
export const SSZ_CYST_DOUBLE_RULE_ID = "wow-ssz-cyst-double";
export const SSZ_MAELSTROM_FALL_RULE_ID = "wow-ssz-maelstrom-fall";

type Cyst = { dropper: string; t: number; pos?: Position; poppedAt?: number };
type Pop = { t: number; icon?: string; cyst?: Cyst; nearest: { p: PlayerInfo; d: number }[] };

function detectCysts(players: PlayerInfo[], deaths: DeathEvent[], enemyBuffs: EnemyEvent[]): PullError[] {
  const byName = new Map(players.map((p) => [p.name, p]));
  const maelstroms = enemyBuffs.filter((e) => e.abilityId === DIG_IN).map((e) => e.timestamp);
  // Gales pop cysts from Dig In +2.8s; a pop just before that is early (25 +99.7).
  const inGales = (t: number) => maelstroms.find((m) => t >= m + FIRST_GALE_MS && t <= m + MAELSTROM_POP_WINDOW_MS);
  // A gale's fall lands 4-7s after it; earlier ability-less deaths come from
  // pre-Maelstrom knockbacks (12 +101.1, 22 +100.1, 25 +104.5).
  const inFallWindow = (t: number) => maelstroms.find((m) => t >= m + FIRST_FALL_MS && t <= m + MAELSTROM_WINDOW_MS);

  // A cyst appears where each Venomous Surge holder stood when it expired.
  const cysts: Cyst[] = players.flatMap((p) => p.debuffs
    .filter((e) => e.abilityId === VENOMOUS_SURGE && e.debuffStatus === "removed")
    .map((e) => ({ dropper: p.name, t: e.timestamp, pos: posAt(p, e.timestamp) })))
    .sort((a, b) => a.t - b.t);

  const cystEvents = players.flatMap((p) => p.debuffs
    .filter((e) => e.abilityId === VISCOUS_CYST && (e.debuffStatus === "applied" || e.debuffStatus === "stack"))
    .map((e) => ({ p, e })));
  const pops: Pop[] = clusterByGap(cystEvents, (x) => x.e.timestamp, POP_GAP_MS).map((g) => {
    const t = g[0].e.timestamp;
    // Which live cyst popped: the one with a player closest to its drop spot.
    let best: Pop = { t, icon: g[0].e.abilityIcon, nearest: [] };
    for (const c of cysts) {
      if (c.t >= t || c.poppedAt !== undefined || !c.pos) continue;
      const near = players
        .filter((p) => aliveAt(p, deaths, t))
        .map((p) => ({ p, d: distYd(posAt(p, t), c.pos) }))
        .filter((x): x is { p: PlayerInfo; d: number } => x.d !== undefined)
        .sort((a, b) => a.d - b.d);
      if (near.length && (!best.nearest.length || near[0].d < best.nearest[0].d)) best = { t, icon: best.icon, cyst: c, nearest: near };
    }
    if (best.cyst && best.nearest[0].d <= POP_BLAME_RADIUS) best.cyst.poppedAt = t;
    else best = { t, icon: best.icon, nearest: [] };
    return best;
  });

  // Cyst deaths belong to the latest pop before them (a stacked DoT's
  // deaths go to the pop that stacked it).
  const cystDeaths = (i: number) => deaths.filter((d) => d.killingAbilityGameId === VISCOUS_CYST &&
    d.timestamp >= pops[i].t && d.timestamp <= Math.min(pops[i + 1]?.t ?? Infinity, pops[i].t + CYST_DEATH_WINDOW_MS));

  // Falls during Maelstrom: a mass fall is a Raid error, a lone one Major.
  const errors: PullError[] = [];
  const falls = deaths.filter((d) => inFallWindow(d.timestamp) !== undefined && isFall(byName.get(d.player), d));
  const massFallAt: number[] = [];
  for (const g of clusterByGap(falls, (d) => d.timestamp, MASS_FALL_MS)) {
    const m = inFallWindow(g[0].timestamp)!;
    const gales = pops.filter((p) => inGales(p.t) === m && p.t < g[0].timestamp).length;
    const early = pops.filter((p) => p.cyst && inGales(p.t) === undefined && p.t < g[0].timestamp);
    // Once the raid went over the edge, later falls in the same Maelstrom are fallout.
    if (massFallAt.some((t) => t >= m && t < g[0].timestamp)) continue;
    if (g.length >= RAID_WIPE_KILLS) {
      massFallAt.push(g[0].timestamp);
      errors.push({
        ruleId:      SSZ_MAELSTROM_FALL_RULE_ID,
        severity:    "Raid",
        name:        "Blown Off in Maelstrom",
        description: `${g.length} players were blown off the platform during Howling Maelstrom: ${joinNames(g.map((d) => d.player))}. ` +
          `${gales} cyst pop(s) had caught a gale so far` +
          (early.length ? `; ${joinNames(early.map((p) => `${p.cyst!.dropper}'s cyst was popped early at +${sec(p.t)}s`))}.` : ".") +
          " Unresolvable from here.",
        timestamp:   g[0].timestamp + RAID_MARKER_SORT_OFFSET_MS,
        abilityId:   VISCOUS_CYST,
        abilityName: "Howling Maelstrom",
      });
    } else {
      for (const d of g) {
        errors.push(playerError(byName.get(d.player)!, {
          ruleId:      SSZ_MAELSTROM_FALL_RULE_ID,
          severity:    "Major",
          name:        "Blown Off in Maelstrom",
          description: `Blown off the platform during Howling Maelstrom (${sec(d.timestamp - m)}s into Dig In) ` +
            `after ${gales} cyst pop(s) had caught the raid.`,
          timestamp:   d.timestamp,
          abilityId:   VISCOUS_CYST,
          abilityName: "Howling Maelstrom",
        }));
      }
    }
  }

  // Popped outside the gales: a raid-wide hit, and one fewer bumper.
  for (let i = 0; i < pops.length; i++) {
    const pop = pops[i];
    if (inGales(pop.t) === undefined) {
      const killed = cystDeaths(i);
      const next = pops[i + 1];
      const stacked = next && next.t - pop.t <= CYST_DOT_MS;
      const lostGale = massFallAt.some((t) => t > pop.t);
      const severity: ErrorSeverity = killed.length || stacked || lostGale ? "Major" : "Minor";
      const consequence = (killed.length ? `; ${joinNames(killed.map((d) => d.player))} died to it` : "") +
        (stacked ? `; another cyst popped ${sec(next.t - pop.t)}s later and stacked the DoT` : "") +
        (lostGale ? "; a later Maelstrom gale had no cyst" : "");
      if (killed.length >= RAID_WIPE_KILLS) {
        errors.push({ ruleId: SSZ_CYST_EARLY_RULE_ID, severity: "Raid", name: "Cyst Popped Early",
          description: `A Viscous Cyst popped before Howling Maelstrom` +
            (pops[i - 1] && pop.t - pops[i - 1].t <= CYST_DOT_MS ? " on top of another pop's DoT" : "") +
            ` and killed ${killed.length}: ${joinNames(killed.map((d) => d.player))}. Unresolvable from here.`,
          timestamp: pop.t + RAID_MARKER_SORT_OFFSET_MS, abilityId: VISCOUS_CYST, abilityName: "Viscous Cyst", abilityIcon: pop.icon });
      }
      if (!pop.cyst) {
        errors.push({ ruleId: SSZ_CYST_EARLY_RULE_ID, severity: "Minor", name: "Cyst Popped Early",
          description: `A Viscous Cyst popped before Howling Maelstrom and hit the whole raid; no player was within ${yd(POP_BLAME_RADIUS)}yd of a known cyst${consequence}.`,
          timestamp: pop.t, abilityId: VISCOUS_CYST, abilityName: "Viscous Cyst", abilityIcon: pop.icon });
        continue;
      }
      // Popped as it spawned: the holder dropped it where it went off at once
      // (13 +87.2, 35 +87.4). Their own position IS the drop spot, so
      // distance says nothing — the dropper is the one to flag.
      const dropper = byName.get(pop.cyst.dropper);
      if (pop.t - pop.cyst.t <= INSTANT_POP_MS && dropper) {
        errors.push(playerError(dropper, {
          ruleId:      SSZ_CYST_EARLY_RULE_ID,
          severity,
          name:        "Cyst Popped Early",
          description: `Their Venomous Surge dropped its Viscous Cyst where it popped the moment it spawned — ` +
            `the whole raid took a Cyst hit and the cyst was lost${consequence}.`,
          timestamp:   pop.t,
          abilityId:   VISCOUS_CYST,
          abilityName: "Viscous Cyst",
          abilityIcon: pop.icon,
        }));
        continue;
      }
      const blamed = pop.nearest.filter((x) => x.d <= POP_BLAME_RADIUS && x.d <= pop.nearest[0].d + POP_TIE_MARGIN);
      for (const { p, d } of blamed) {
        errors.push(playerError(p, {
          ruleId:      SSZ_CYST_EARLY_RULE_ID,
          severity,
          name:        "Cyst Popped Early",
          description: `Popped ${pop.cyst.dropper === p.name ? "their own" : `${pop.cyst.dropper}'s`} Viscous Cyst before Howling Maelstrom ` +
            `(~${yd(d)}yd from its drop spot${blamed.length > 1 ? `, as close as ${joinNames(blamed.filter((b) => b.p !== p).map((b) => b.p.name))}` : ""}) — ` +
            `the whole raid took a Cyst hit and the cyst was lost${consequence}.`,
          timestamp:   pop.t,
          abilityId:   VISCOUS_CYST,
          abilityName: "Viscous Cyst",
          abilityIcon: pop.icon,
        }));
      }
    }
  }

  // Inside Maelstrom: one gale that popped more than one cyst.
  const galePops = pops.map((p, i) => ({ p, i })).filter(({ p }) => inGales(p.t) !== undefined);
  for (const gale of clusterByGap(galePops, (x) => x.p.t, DOUBLE_POP_MS)) {
    if (gale.length < 2) continue;
    const first = gale[0].p, last = gale[gale.length - 1].p;
    const killed = gale.flatMap((x) => cystDeaths(x.i));
    const raid = killed.length >= RAID_WIPE_KILLS;
    const known = gale.map((x) => x.p.cyst).filter((c): c is Cyst => c !== undefined);
    const apart = known.length === 2 && known[0].pos && known[1].pos ? ` (dropped ~${yd(distanceBetween(known[0].pos, known[1].pos))}yd apart)` : "";
    errors.push({
      ruleId:      SSZ_CYST_DOUBLE_RULE_ID,
      severity:    raid ? "Raid" : "Minor",
      name:        "Cysts Stacked in One Gale",
      description: `${gale.length} Viscous Cysts popped within ${sec(last.t - first.t)}s in one Howling Maelstrom gale` +
        (known.length ? ` — ${joinNames(known.map((c) => `${c.dropper}'s`))}${apart}` : "") +
        `; the raid took a stacked Cyst DoT and lost a bumper for a later gale` +
        (killed.length ? `. ${killed.length} died to it${raid ? " — unresolvable from here" : ""}.` : "."),
      // Timed at the pop that stacked the DoT.
      timestamp:   gale[1].p.t + (raid ? RAID_MARKER_SORT_OFFSET_MS : 0),
      abilityId:   VISCOUS_CYST,
      abilityName: "Viscous Cyst",
      abilityIcon: last.icon,
    });
  }
  return errors;
}

// ─── When was the pull over? ─────────────────────────────────────────────────
//
// Only the EARLIEST generic marker is emitted, and only when no mechanic
// Raid error came before it (see vashnik.ts).

export const SSZ_PULL_OVER_RULE_ID = "wow-ssz-pull-over";

function detectPullOver(players: PlayerInfo[], deaths: DeathEvent[], enemyCasts: EnemyEvent[], pullEnd: number): PullError[] {
  const candidates: PullError[] = [];
  const marker = (timestamp: number, name: string, description: string, abilityId: number, abilityName: string) =>
    candidates.push({ ruleId: SSZ_PULL_OVER_RULE_ID, severity: "Raid", name, description, timestamp: timestamp + RAID_MARKER_SORT_OFFSET_MS, abilityId, abilityName });
  const byName = new Map(players.map((p) => [p.name, p]));
  const sorted = [...deaths].sort((a, b) => a.timestamp - b.timestamp);
  const lives = sorted.map((d) => {
    const next = sorted.find((o) => o.player === d.player && o.timestamp > d.timestamp)?.timestamp ?? Infinity;
    const p = byName.get(d.player);
    return { d, rez: p ? rezzedAt(p, d.timestamp, next) : undefined };
  });
  const cause = (d: DeathEvent) => (d.killingAbilityGameId ? d.cause : isFall(byName.get(d.player), d) ? "fell" : "unknown");

  for (const { d } of lives) {
    const dead = lives.filter((l) => l.d.timestamp <= d.timestamp && (l.rez === undefined || l.rez > d.timestamp));
    if (dead.length >= COLLAPSE_DEAD) {
      marker(d.timestamp, "Raid Collapse",
        `${dead.length} players dead at once: ${joinNames(dead.map((l) => `${l.d.player} (${cause(l.d)}, +${sec(l.d.timestamp)}s)`))}. ` +
        "Treated as the point the pull was over.",
        d.killingAbilityGameId, cause(d));
      break;
    }
  }

  // The other tank holds Sszorak alone until the next Apex Predator combo
  // (Mutilate needs both tanks' groups), so a rez before then also counts
  // (36 +241: a tank fell in Maelstrom, rezzed 31s later before the combo).
  const mutilates = players.flatMap((p) => p.damageTaken.filter((e) => e.abilityId === MUTILATE_HIT).map((e) => e.timestamp));
  for (const { d, rez } of lives) {
    if (byName.get(d.player)?.role !== "Tank") continue;
    const nextCombo = Math.min(Infinity, ...mutilates.filter((t) => t > d.timestamp + MUTILATE_CLUSTER_MS));
    const recovered = rez !== undefined && (rez - d.timestamp <= TANK_REZ_GRACE_MS || rez < nextCombo) &&
      pullEnd - d.timestamp >= TANK_DEATH_CONTINUE_MS;
    if (recovered) continue;
    marker(d.timestamp, "Tank Died",
      `Tank ${d.player} died (${cause(d)})` +
      (rez !== undefined ? ` — rezzed ${sec(rez - d.timestamp)}s later, but not before the next tank combo or the pull ended ${sec(pullEnd - d.timestamp)}s after the death.`
                         : " and wasn't rezzed.") +
      " Treated as the point the pull was over.",
      d.killingAbilityGameId, cause(d));
  }

  const berserk = enemyCasts.find((e) => e.abilityId === BERSERK && e.actorName === "Sszorak");
  if (berserk) marker(berserk.timestamp, "Berserk", "Sszorak went Berserk (enrage timer).", BERSERK, "Berserk");

  // Earliest wins; within 1s a specific cause beats the generic head-count.
  const rank = (e: PullError) => e.timestamp + (e.name === "Raid Collapse" ? 1000 : 0);
  return candidates.sort((a, b) => rank(a) - rank(b)).slice(0, 1);
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export function detectSszorakErrors(
  players:         PlayerInfo[],
  deaths:          DeathEvent[] = [],
  enemyCasts:      EnemyEvent[] = [],
  enemyBuffs:      EnemyEvent[] = [],
  pullDurationMs?: number
): PullError[] {
  // Self-gate: tank deaths / Berserk exist in every fight.
  const isSszorak = players.some((p) => p.debuffs.some((e: PlayerEvent) => SSZORAK_SIGNATURE.has(e.abilityId)));
  if (!isSszorak) return [];

  const errors = [
    ...detectUnbound(players, deaths, enemyBuffs),
    ...detectVirulence(players, deaths),
    ...detectMutilate(players, deaths),
    ...detectRavageSwap(players, deaths),
    ...detectTempest(players, deaths),
    ...detectCrosswinds(players, deaths),
    ...detectCysts(players, deaths, enemyBuffs),
  ];

  const pullEnd = pullDurationMs ?? lastPlayerEventMs(players);
  const firstRaid = Math.min(Infinity, ...errors.filter((e) => e.severity === "Raid").map((e) => e.timestamp));
  errors.push(...detectPullOver(players, deaths, enemyCasts, pullEnd).filter((e) => e.timestamp < firstRaid));

  return suppressDuplicateRaidErrors(errors.sort((a, b) => a.timestamp - b.timestamp));
}
