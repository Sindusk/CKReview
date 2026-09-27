// lib/mechanics/wow/va/vashnik.ts
//
// Mythic Vashnik the Malignant (The Venomous Abyss) — per-pull error
// detection. Called from transformFightToPull in lib/log-transforms.ts; it
// self-gates on this encounter's ability IDs, so it is safe on any WoW pull.
//
// The second half of this header is the guide-derived encounter model
// (written 2026-09-26 before any log was available). The first half is what
// the logs actually showed; where the two disagree, the log section wins.
//
// ── VERIFIED AGAINST LOGS (report kGVX7tafBT2pM1N3, 19 Mythic pulls, kill
//    on pull 19; offsets fight-relative) ─────────────────────────────────────
//
// Strategy seen: the static Flame + Shadow plan (Infusions 1293971/1293968
// every Imbibe; Blood appeared once). Always match by ability ID.
//
// Cycle: Imbibe (cast 1284663) at +24 then every 84s. Malignant Catalyst
// cast 1282509 then 1282516 5s later, twice per cycle; each 1282516 launches
// FIVE Catalytic Bile impacts ~7s later. Plague Froth (debuff 1281913 on 5
// players, 6s) at ~+13/+54/+87 then every ~33-51s. Exploding + Stygian
// Infection sets at ~+43/+95 and every ~52s after. Dripping Fangs every
// ~28s alternating tanks.
//
// Malignant Totems (actors "Malignant Totem", two actor IDs — one per
// fountain): ~24 spawn 3-4s after each Imbibe, each beginning an 85.0s
// Malignance cast (1304459). A totem cleared by a Plague Wave simply stops;
// one left standing COMPLETES the cast (enemy "cast" event, with the
// totem's x/y) exactly 85s after spawning, ~4s after the next Imbibe, and
// hits the raid. Every pull with a completed Malignance wiped (14/18 wipes;
// the kill had none). Missed totems cannot be tied to a Froth carrier: the
// nearest carrier lane missed each one by 3-10yd, and cleared totems leave
// no position, so this is a raid-wide error.
//
// Plague Froth: 1281925 ticks ~1/s on every player within ~4.5yd of each
// carrier (the carrier included). The first tick (+1s) catches whoever was
// standing near the carriers at application; after that 443 of 489
// non-carrier sets took 0-1 ticks, so 2+ = stayed near a carrier. At expiry
// each carrier sends Plague Waves (1295798, ~300-600k) along the four
// AXIS-ALIGNED directions (world x/y): 250 of 258 hits sit within 2.5yd of
// a carrier's lane, travelling ~13yd/s. Carriers lined up on one axis hit
// each other at expiry.
//
// Exploding Infection (1295173, +1 stack every ~1.5s): its removal — a
// dispel OR the carrier's death — fires Caustic Explosion (1295209), ~150k
// to the whole raid. Dispels are staggered (the kill: 2-16s after
// application). Two explosions stacked are survivable; the wipes came
// from the ~+95 set still being carried into the next Imbibe: carriers at
// 9-12 stacks die to the expulsion or the DoT, their explosions land
// together, and 5-12 players die at once (pulls 8/9/12/13/14/18).
//
// Stygian Burst (1302489, ~400-470k): lands 3.5-5s after Stygian Infection
// (1294994) goes on if its absorb wasn't healed through, on the holder or
// on other players 5-40yd away (107 of 126 hits were on non-holders).
//
// Catalytic Bile: 1282602 = a soaker's hit; 1282616 = an unsoaked impact's
// raid-wide penalty (~200-500k each). Every Catalyst in the kill had 4-5
// soakers; pull 10's had none and the penalty killed 14.
//
// Malignant Burst (1280189, cast by a Burning or Shrouded Venom reaching the
// cavity) killed 5-10 players every time (pulls 4/5/6/9/11).
//
// Dripping Fangs: hit 1280935, debuff 1280934 (32s, ~every 2s). A second
// hit while still debuffed = applydebuffstack; the other tank didn't taunt.
//
// Not flagged: Burning Presence / Caustic Surge (add upkeep; no Surge
// overlap ever killed), Congealing Bolt (Shrouded Venom casts don't appear
// in the enemy stream), Virulent Fumes (7-15k ticks), Deadly Venom (the
// arena-edge venom, 1297338: only ever in the last ~10s of a wipe, up to
// 15 players at once, never in the kill — the raid running out after the
// wipe was called, not a mistake), Toxic Vapor and the
// Imbibe expulsions (chosen fountain cost), infection ticks, Bile soaks.
//
// ── RULES IMPLEMENTED ────────────────────────────────────────────────────────
//
//   wow-vash-malignance          Raid     totem(s) not cleared
//   wow-vash-malignant-burst     Raid     a venom reached the cavity
//   wow-vash-bile-unsoaked       Minor/Raid  missed Bile impact (Raid at 3+ kills)
//   wow-vash-exploding-infection Minor/Raid  carrier(s) died still infected
//   wow-vash-dispel-overlap      Major    stacked dispel explosions that killed
//   wow-vash-plague-wave         Minor/Major victim of a wave
//   wow-vash-plague-froth        Minor/Major stayed near / overlapped a carrier
//   wow-vash-stygian-burst       Minor/Major non-holder hit by Stygian Burst
//   wow-vash-umbral-ejection     Minor/Major hit by a Shrouded Venom's death impact
//   wow-vash-fangs-swap          Minor/Major other tank didn't taunt Dripping Fangs
//   wow-vash-pull-over           Raid     5+ dead / unrecovered tank death / Berserk
//
// ── GUIDE-DERIVED MODEL (pre-log) ────────────────────────────────────────────
//
// The spell IDs below come from linked encounter-journal spells; they are
// CANDIDATES — the verified section above takes precedence.
//
// Sources checked 2026-09-26:
//   Mythic strategy (including the static Fire + Shadow solution):
//   https://www.method.gg/guides/the-venomous-abyss/vashnik-the-malignant
//   Encounter journal, spell links, and Mythic tags:
//   https://www.wowhead.com/guide/midnight/raids/venomous-abyss-vashnik-the-malignant-boss-strategy-abilities
//   Supplementary Mythic notes:
//   https://www.icy-veins.com/wow/vashnik-raid-guide/
// The aim is to model the fight actually played on MYTHIC, including mechanics
// that persist into that difficulty. Do not implement a Normal/Heroic variant
// from these notes. No timings or failure thresholds below are log-calibrated.
//
// -- ENCOUNTER SHAPE AND CENTRAL CHOICE -------------------------------------
//
// Single boss, one repeating phase, with adds. The arena has three fountains:
// Blood (red), Shadow (purple), and Flame/Fire (orange). At 100 energy Vashnik
// uses Imbibe (1283164), drawing from the TWO closest fountains. Position at
// the instant of that cast determines the pair; a floor-sector boundary alone
// does not necessarily predict which fountains are closer. Each selected
// fountain deals an expulsion hit to the raid, grants Vashnik its Infusion,
// and summons that fountain's living venoms. The Infusions last about 90s
// and stack: each stack adds 100% to that fountain's expulsion damage and
// 50% to the matching venoms' maximum health. Imbibe also adds a stack of
// Toxic Vapor, the encounter's increasing ambient raid damage. Living
// venoms path toward the central Malignant Cavity; one reaching it causes
// Malignant Burst, a severe raid hit and stacking DoT.
//
// On Mythic, Imbibe ALSO creates Malignant Totems/Tumors around the played
// area. The sources and journal use both nouns for these objects. Their
// Malignance cast is the defining Mythic wipe pressure. Plague Froth targets
// must aim the waves they emit at the objects before the next Imbibe. This
// changes Plague Froth from a pure dodge into the raid's clearing tool.
//
// Fountain choice is a STRATEGY, not a correctness rule. The rotating plan
// alternates pairs (e.g. Flame+Shadow, Flame+Blood, Blood+Shadow) so no
// Infusion becomes too high. A current Mythic plan instead holds Vashnik by
// the Shadow fountain in the Flame+Shadow section for the whole fight and
// heals through the growing stacks, simplifying movement and add control.
// Both are valid if the raid survives. Never flag a repeated fountain pair,
// high Infusion count, or a static boss position by itself.
//
// -- ROUGH CHRONOLOGY OF A CYCLE --------------------------------------------
//
// 0. Pull: tank Vashnik at the position chosen for the first fountain pair;
//    loosely arrange the raid for Plague Froth lanes and Catalytic Bile
//    coverage. There can be a Plague Froth before the regular Imbibe cadence;
//    confirm that in the Mythic log rather than anchoring on a fixed offset.
// 1. At 100 energy, Imbibe selects two fountains. Expect their expulsion
//    damage, their Infusions, new living venoms, another Toxic Vapor stack,
//    and the Mythic totem/tumor objects. Heal for the expulsion overlap.
// 2. Control and kill living venoms before they enter the central cavity.
//    Kill Flame adds with separation in time; finish Blood's split chain;
//    break Shadow add absorbs and dodge their death effects. These run
//    alongside the boss's tank and player-targeted abilities.
// 3. Plague Froth goes on several players. Spread for its short aura, aim
//    their outgoing cardinal Plague Waves through the Mythic objects, and
//    keep the wave paths clear of other players. Method reports two Froth
//    sets to clean up a totem set before the next Imbibe. The first can be
//    preplanned; the second adapts to remaining objects.
// 4. Malignant Catalyst launches Catalytic Bile soak circles. Every impact
//    needs at least one player. Adaptive Infection variants depend on the
//    active Infusions and overlap the add/soak/wave jobs. Dripping Fangs
//    continues to force tank swaps.
// 5. Before the next Imbibe, clear surviving totems and stabilize the raid.
//    Any uncleared one can fire Malignance, a raid hit plus long stacking
//    DoT. Then Imbibe and the same cycle repeat until Vashnik dies.
//
// This is an ordering model, not a second-by-second timeline. In particular,
// correlate each mechanic with its actual cast/application/expiration window
// before assigning a failed soak, missed wave, or late add kill.
//
// -- MYTHIC TOTEMS/TUMORS AND PLAGUE FROTH ----------------------------------
//
// Imbibe's Mythic objects are called "Malignant Totem" under the journal's
// Imbibe entry, but "Malignant Tumor" under Plague Wave. Method describes
// them as not directly attackable and removed by a wave. Icy Veins describes
// a 99% damage-reduction Hardened Tumor shield that a wave removes before
// the tumor can be killed. This discrepancy requires direct log validation:
// identify spawn actor(s), shield auras, wave hits, removals/deaths, and any
// follow-up damage to determine whether the wave kills or only exposes.
// Do not assume a miss because no DPS hit appears if the wave itself clears.
//
// Plague Froth (1281907) ticks on players within roughly 4.5 yards of each
// target for six seconds. At expiry it sends Plague Waves in four cardinal
// directions from each target. Plague Wave (candidate 1295798; the journal
// also links a separate damage spell) hits players in the paths and, on
// Mythic, interacts with the objects. Marked players spread out, choose a
// location so at least one lane crosses a remaining object, and avoid aiming
// a lane through the raid. The raid may use fixed markers for the first wave
// set and live adjustment for the second; those positions are not universal
// correctness conditions. Method notes that a totem glows white when a wave
// is aligned with it, but that visual cue may have no log event.
//
// An uncleared totem can emit Malignance (1304459): heavy Nature damage to
// all players and a one-minute stacking DoT. Method says it happens by the
// next Imbibe; one application can be survived, two often wipe. A Malignance
// damage/debuff application is a strong missed-object signal, but determine
// from logs whether several totems pulse at the same instant and deduplicate
// the resulting per-player events into the right number of raid errors. Do
// not label the Froth carrier automatically without a position/path match:
// multiple carriers and wave directions may have been able to cover one
// object, and an unobservable shield state may be involved.
//
// -- SHARED MECHANICS PRESENT ON MYTHIC -------------------------------------
//
// Malignant Catalyst (1282525) detonates an orb above the central cavity,
// dealing a normal raid hit and launching Catalytic Bile (1282601/1282602
// candidate spell links). Each Bile impact has a roughly six-yard soak area.
// At least one player must catch EACH impact; an empty circle instead deals
// a raid-wide penalty. Spread coverage around the boss. Correct soakers
// take intentional damage, so a Bile hit on its own is not an error. A
// future check needs the number/locations of projectiles and a distinct
// unsoaked penalty event; do not infer a miss solely from raid damage.
//
// Dripping Fangs (1280935) is Vashnik's tank hit and a roughly 32-second
// Nature DoT with a large, stacking Physical vulnerability. Swap after each
// hit so the next one lands on the other tank. A tank death alone does not
// prove a failed swap; examine stacks, targeting, defensives, and any other
// simultaneous raid damage first.
//
// Toxic Vapor (1284561) is ambient damage that stacks with Imbibes. The
// fountain expulsions are Hemo (1298582), Gloom (1298583), and Conflagrating
// (1298587). Their increased damage is an expected cost of fountain choice,
// especially the static Mythic plan. Avoid marking those hits, the normal
// Catalyst blast, or routine infection ticks as player mistakes in isolation.
//
// Adaptive Infection (1282117) chooses an infection matching each current
// fountain affinity. Check the actual aura and player targets in logs; one
// cast can produce different debuffs, and debuff removals may be dispels,
// healing clears, expiry, or death.
//
// BLOOD: Siphoning Infection (1299941/1295224 candidate links) gives its
// holder a large healing absorb and prevents ordinary healing while active.
// Siphon Blood (1295229) drains nearby allies to heal the holder and clear
// the absorb. Players deliberately enter the holder's circle; their Siphon
// Blood hits are normal assistance, not friendly-fire errors. On Mythic,
// Thinned Blood (1314273) increases damage from repeated Siphon hits, so
// rotate/help without killing helpers. An uncleared absorb or Siphon death
// needs context before assigning blame to the holder or nearby players.
//
// SHADOW: Stygian Infection (1294994) is a DoT and healing absorb. Until
// healed through it periodically makes the holder cast Stygian Burst
// (1302489), a damaging ground impact near their position. Healers clear
// the absorb promptly; holders keep moving and avoid laying impacts under
// other players while remaining healable. A Stygian Burst hit on someone
// other than the holder is a possible avoidable hit, but its exact impact
// radius/timing and normal overlap need a Mythic log check.
//
// FLAME: Exploding Infection (1295173) is a fire DoT that gains another
// stack roughly every 1.5 seconds on Mythic until dispelled. Its removal
// causes Caustic Explosion (1295209), a raid-wide hit. The infected player
// moves away from the raid; healers stagger dispels when raid health is
// stable. Do not treat EVERY Caustic Explosion as an error: an explosion
// is unavoidable when clearing the debuff. Assess delayed dispels, stacked
// simultaneous explosions, and blast damage only after the log reveals the
// exact falloff and removal reason. A death-stripped aura is not a dispel.
//
// -- THE THREE FOUNTAIN ADD FAMILIES ----------------------------------------
//
// All living venoms move toward the Malignant Cavity. Malignant Burst
// (1280189) means at least one reached it, causing a large raid hit and a
// stacking 30-second DoT. This is a strong add-control failure candidate;
// correlate each Burst with add positions/despawns, and do not misidentify
// it as Malignance (which comes from a Mythic totem/tumor).
//
// FLAME: Mythic summons THREE Burning Venoms when Flame is selected (the
// count is from Method). Burning Presence (1305902) pulses raid damage while
// each is alive. Killing one triggers Caustic Surge (1285979), a raid hit
// plus a short stacking DoT. Keep the deaths separated rather than killing
// multiple at once. Control and reposition adds with grips/banish if the
// composition permits; Hardened Venom (1314837) makes an add immune to CC
// and faster after about 60 seconds. The static strategy banishes one and
// brings the others to Vashnik one at a time. Caustic Surge is expected on
// each kill; overlapping Surges or prolonged Burning Presence may be a
// failure, but require log-calibrated windows and survival context.
//
// BLOOD: One large Clotting Venom initially appears, protected by
// Sanguineous Fortitude (1291530) against crowd control. It moves slowly;
// its death causes Splitting Clot (1286631/1286630), creating smaller
// versions which can split again. Kill the whole family before any child
// reaches the cavity. A parent death is NOT completion of this add set.
// Count child spawns/deaths or Malignant Bursts before declaring it handled.
//
// SHADOW: Several Shrouded Venoms spawn (guides describe five) with Miasmic
// Coating (1312366), a large damage absorb. They can be slowed/controlled
// while higher-priority adds die. On death, Umbral Ejection
// (1286737/1286736) creates damaging impact locations; players dodge them.
// Their shield extends time-to-kill, so compare add lifetime against an
// appropriate Shadow-set baseline instead of a blanket deadline.
//
// -- STRATEGY VARIANCE AND WHAT A DETECTOR SHOULD MEASURE -------------------
//
// A rotating-fountain raid may see all three infection types and add sets.
// A static Flame+Shadow raid may NEVER see Blood mechanics; their absence is
// normal. Under the static plan, repeated Flame/Shadow Infusions and Toxic
// Vapor stacks are deliberate. In either plan, prioritize consequences that
// expose actual mistakes: Malignance from uncleared Mythic objects, a living
// venom's Malignant Burst, an unsoaked Bile penalty, a Froth wave hitting a
// player, Shadow add death impact hits, or a tank taking consecutive Fangs
// while still vulnerable. Distinguish these from intentional soak/dispels,
// add-death explosions, normal ambient damage, and chosen fountain effects.
//
// For log work, first map Vashnik, fountain, totem/tumor, and each venom add
// by report-specific actor ID/name and verify every candidate ability ID by
// event type. Segment cycles by Imbibe cast time and track fountain Infusion
// auras, not just estimated boss coordinates. Resolve pairs of Froth aura
// expirations and wave casts to the active Mythic objects; determine if a
// wave hit removes a shield or kills the object. Track individual add spawn,
// split, death, and cavity arrival. Track Bile projectile impacts and their
// soakers separately from the initial Catalyst blast. Correlate a damage
// cluster into one mechanic failure where the entire raid is hit, but retain
// multiple missed totems/orbs when the log supports multiple sources. Use
// missing-data/partial-pull guards, first-wipe cutoff, and established
// Minor/Major/Raid semantics from the Sentinels detector. Return unknown
// when attribution needs positions, aura stacks, or events that the report
// does not expose. Do not hard-code Method's markers, grip assignments,
// fountain order, healer count, or a precise timing before a real Mythic log
// confirms the raid's strategy and this encounter's event sequence.

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent, ErrorSeverity } from "@/types/PullError";
import { suppressDuplicateRaidErrors } from "../../../error-detection";
import {
  kFmt, sec, debuffIntervals, hitsOf, joinNames, playerError, lastPlayerEventMs,
  aliveAt, raidMarker, pullOverMarker,
} from "../common";
import type { WowPullContext } from "../common";

// ─── Ability IDs (log-verified, report kGVX7tafBT2pM1N3) ─────────────────────

const IMBIBE                = 1284663;
const MALIGNANCE            = 1304459; // totem cast; completes = totem not cleared
const MALIGNANT_BURST       = 1280189; // venom reached the cavity
const BILE_LAUNCH           = 1282516; // second Malignant Catalyst cast — launches the Bile
const BILE_SOAK             = 1282602;
const BILE_PENALTY          = 1282616; // unsoaked impact, raid-wide
const EXPLODING_INFECTION   = 1295173;
const CAUSTIC_EXPLOSION     = 1295209;
const STYGIAN_INFECTION     = 1294994;
const STYGIAN_BURST         = 1302489;
const PLAGUE_FROTH          = 1281913; // the 6s carrier debuff (1281910 is a 0-2s companion)
const PLAGUE_FROTH_TICK     = 1281925;
const PLAGUE_WAVE           = 1295798;
const UMBRAL_EJECTION       = 1286737;
const DRIPPING_FANGS_DEBUFF = 1280934;
const BERSERK               = 26662;

// Player dispels that can clear Exploding Infection (the log's were Purify,
// Purify Spirit, Naturalize and Cleanse).
const DISPELS = new Set([
  527,    // Purify
  77130,  // Purify Spirit
  360823, // Naturalize
  4987,   // Cleanse
  88423,  // Nature's Cure
  115450, // Detox (Mistweaver)
  218164, // Detox
  213644, // Cleanse Toxins
  365585, // Expunge
  374251, // Cauterizing Flame
  2782,   // Remove Corruption
  51886,  // Cleanse Spirit
  32375,  // Mass Dispel
]);

// ─── Thresholds ──────────────────────────────────────────────────────────────

// Kills at which a raid-wide mechanic is treated as the wipe.
const RAID_WIPE_KILLS = 3;
// Every Bile launch in the log had exactly five impacts (82 of 103
// launches had 5 soakers; the rest had 4 or 0 with a penalty).
const BILE_IMPACTS = 5;
const BILE_WINDOW_MS = 12000;
// A Plague Wave lane is axis-aligned from the carrier's spot at expiry: 250
// of 258 hits sat within 2.5yd of one.
const WAVE_LANE_HALF_WIDTH = 300;
const WAVE_TRAVEL_MS = 6000;
// Plague Froth's first tick (+1s) lands before anyone could spread; after
// that 443 of 489 non-carrier sets took 0-1 ticks.
const FROTH_SPREAD_GRACE_MS = 1500;
const FROTH_MIN_TICKS = 2;
// Removal-by-death: the aura drops within this of the death event.
const DEATH_REMOVAL_MS = 300;
// Explosions this close together count as one stacked blast.
const EXPLOSION_STACK_MS = 1500;
const DISPEL_MATCH_MS = 300;
// A double-stacked Dripping Fangs tank dying this soon died to the missed swap.
const FANGS_DEATH_WINDOW_MS = 10000;
// Generic pull-over markers (same semantics as entombed-sentinels.ts).
const COLLAPSE_DEAD = 5;
const TANK_REZ_GRACE_MS = 15000;
const TANK_DEATH_CONTINUE_MS = 30000;

// ─── Small helpers ───────────────────────────────────────────────────────────

function killsBy(deaths: DeathEvent[], abilityId: number, from: number, to: number): DeathEvent[] {
  return deaths.filter((d) => d.killingAbilityGameId === abilityId && d.timestamp >= from && d.timestamp <= to);
}

/** Group time-sorted items whose timestamp is within `windowMs` of the group's first item. */
function groupByTime<T>(items: T[], at: (x: T) => number, windowMs: number): T[][] {
  const groups: T[][] = [];
  for (const x of [...items].sort((a, b) => at(a) - at(b))) {
    const g = groups[groups.length - 1];
    if (g && at(x) - at(g[0]) <= windowMs) g.push(x);
    else groups.push([x]);
  }
  return groups;
}

/** Latest position this player's damage events carried at or before `t` (within `maxAgeMs`). */
function positionAt(p: PlayerInfo, t: number, maxAgeMs = 3000): { x: number; y: number } | undefined {
  let best: PlayerEvent | undefined;
  for (const e of p.damageTaken) {
    if (e.x === undefined || e.y === undefined) continue;
    if (e.timestamp > t + 50) break;
    if (e.timestamp >= t - maxAgeMs) best = e;
  }
  return best ? { x: best.x!, y: best.y! } : undefined;
}

/** The player's death at `t` (±ms), if the log has one. */
function diedAt(deaths: DeathEvent[], name: string, t: number, ms: number): DeathEvent | undefined {
  return deaths.find((d) => d.player === name && Math.abs(d.timestamp - t) <= ms);
}

function maxStack(p: PlayerInfo, abilityId: number, start: number, end: number): number {
  return p.debuffs
    .filter((e) => e.abilityId === abilityId && e.timestamp >= start && e.timestamp <= end)
    .reduce((m, e) => Math.max(m, e.stack ?? 1), 1);
}

const hitTotal = (hits: PlayerEvent[]) => hits.reduce((s, e) => s + (e.amount ?? 0), 0);

// ─── Malignant Totems left standing (Malignance) ─────────────────────────────

export const VASH_MALIGNANCE_RULE_ID = "wow-vash-malignance";

function detectMalignance(enemyCasts: EnemyEvent[], deaths: DeathEvent[]): PullError[] {
  const casts = enemyCasts.filter((e) => e.abilityId === MALIGNANCE);
  return groupByTime(casts, (e) => e.timestamp, 2000).map((g) => {
    const start = g[0].timestamp;
    const killed = killsBy(deaths, MALIGNANCE, start - 200, start + 5000).map((d) => d.player);
    return {
      ruleId:      VASH_MALIGNANCE_RULE_ID,
      severity:    "Raid" as ErrorSeverity,
      name:        "Malignant Totem Not Cleared",
      description: `${g.length} Malignant Totem${g.length === 1 ? " was" : "s were"} never hit by a Plague Wave and finished casting ` +
        `Malignance on the raid` + (killed.length ? `; it killed ${joinNames(killed)}` : "") +
        ". Every Malignance in the log ended the pull; treated as a cutoff point.",
      timestamp:   start,
      abilityId:   MALIGNANCE,
      abilityName: "Malignance",
      abilityIcon: g[0].abilityIcon,
    };
  });
}

// ─── A living venom reached the cavity (Malignant Burst) ─────────────────────

export const VASH_MALIGNANT_BURST_RULE_ID = "wow-vash-malignant-burst";

function detectMalignantBurst(enemyCasts: EnemyEvent[], deaths: DeathEvent[]): PullError[] {
  const casts = enemyCasts.filter((e) => e.abilityId === MALIGNANT_BURST);
  return groupByTime(casts, (e) => e.timestamp, 3000).map((g) => {
    const start = g[0].timestamp;
    const adds = [...new Set(g.map((e) => e.actorName))];
    const killed = killsBy(deaths, MALIGNANT_BURST, start - 200, g[g.length - 1].timestamp + 3000).map((d) => d.player);
    return {
      ruleId:      VASH_MALIGNANT_BURST_RULE_ID,
      severity:    "Raid" as ErrorSeverity,
      name:        "Venom Reached the Cavity",
      description: `${g.length} living venom${g.length === 1 ? "" : "s"} (${joinNames(adds)}) reached the Malignant Cavity and cast Malignant Burst` +
        (killed.length ? `, killing ${joinNames(killed)}` : "") + ". Treated as a cutoff point.",
      timestamp:   start,
      abilityId:   MALIGNANT_BURST,
      abilityName: "Malignant Burst",
      abilityIcon: g[0].abilityIcon,
    };
  });
}

// ─── Catalytic Bile: impact nobody soaked ────────────────────────────────────
//
// No log signal says who was assigned an impact, so this is raid-wide.

export const VASH_BILE_RULE_ID = "wow-vash-bile-unsoaked";

function detectBile(players: PlayerInfo[], enemyCasts: EnemyEvent[], deaths: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const launch of enemyCasts.filter((e) => e.abilityId === BILE_LAUNCH)) {
    const inWindow = (e: PlayerEvent) => e.timestamp > launch.timestamp && e.timestamp <= launch.timestamp + BILE_WINDOW_MS;
    const penalty = players.flatMap((p) => hitsOf(p, BILE_PENALTY).filter(inWindow));
    if (penalty.length === 0) continue;
    const soakers = players.filter((p) => hitsOf(p, BILE_SOAK).some(inWindow)).map((p) => p.name);
    const first = Math.min(...penalty.map((e) => e.timestamp));
    const missed = Math.max(1, BILE_IMPACTS - soakers.length);
    const killed = killsBy(deaths, BILE_PENALTY, first - 200, first + 3000).map((d) => d.player);
    const raid = killed.length >= RAID_WIPE_KILLS;
    errors.push({
      ruleId:      VASH_BILE_RULE_ID,
      severity:    raid ? "Raid" : "Minor",
      name:        "Catalytic Bile Not Soaked",
      description: `${missed} Catalytic Bile impact${missed === 1 ? " was" : "s were"} not soaked (${soakers.length} of ${BILE_IMPACTS} soaked` +
        (soakers.length ? `: ${joinNames(soakers)}` : "") + `) — the raid took the unsoaked penalty` +
        (killed.length ? `; it killed ${joinNames(killed)}.` : ".") + (raid ? " Unresolvable from here; treated as a cutoff point." : ""),
      timestamp:   first,
      abilityId:   BILE_PENALTY,
      abilityName: "Catalytic Bile",
      abilityIcon: penalty[0].abilityIcon,
    });
  }
  return errors;
}

// ─── Exploding Infection: removals, and who they killed ──────────────────────

type InfectionRemoval = {
  p: PlayerInfo;
  start: number;
  t: number;
  stacks: number;
  death?: DeathEvent;       // removed by the carrier's death
  dispellers: PlayerInfo[]; // removed by these players' dispel casts
};

function infectionRemovals(players: PlayerInfo[], deaths: DeathEvent[]): InfectionRemoval[] {
  const out: InfectionRemoval[] = [];
  for (const p of players) {
    for (const iv of debuffIntervals(p, EXPLODING_INFECTION)) {
      if (!Number.isFinite(iv.end)) continue;
      const death = diedAt(deaths, p.name, iv.end, DEATH_REMOVAL_MS);
      const dispellers = death ? [] : players.filter((o) => o.casts.some((c) =>
        DISPELS.has(c.abilityId) && c.target === p.name && Math.abs(c.timestamp - iv.end) <= DISPEL_MATCH_MS));
      out.push({ p, start: iv.start, t: iv.end, stacks: maxStack(p, EXPLODING_INFECTION, iv.start, iv.end), death, dispellers });
    }
  }
  return out.sort((a, b) => a.t - b.t);
}

export const VASH_EXPLODING_INFECTION_RULE_ID = "wow-vash-exploding-infection";

// Carriers who died still infected. Who should have dispelled them isn't in
// the log, so this is raid-wide.
function detectInfectionDeaths(removals: InfectionRemoval[], deaths: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const g of groupByTime(removals.filter((r) => r.death), (r) => r.t, EXPLOSION_STACK_MS)) {
    const start = g[0].t;
    const end = g[g.length - 1].t;
    const carriers = new Set(g.map((r) => r.p.name));
    const killed = killsBy(deaths, CAUSTIC_EXPLOSION, start - 50, end + EXPLOSION_STACK_MS).filter((d) => !carriers.has(d.player));
    const dotDeaths = g.filter((r) => r.death!.killingAbilityGameId === EXPLODING_INFECTION);
    // A carrier killed by something else with no knock-on kills is fallout
    // of whatever killed them.
    if (killed.length === 0 && dotDeaths.length === 0) continue;
    const raid = killed.length >= RAID_WIPE_KILLS;
    const who = g.map((r) => `${r.p.name} (${r.stacks} stack${r.stacks === 1 ? "" : "s"} after ${sec(r.t - r.start)}s, died to ${r.death!.cause})`);
    errors.push({
      ruleId:      VASH_EXPLODING_INFECTION_RULE_ID,
      severity:    raid ? "Raid" : "Minor",
      name:        "Exploding Infection Not Dispelled",
      description: `${joinNames(who)} died still carrying Exploding Infection` +
        (g.length > 1 ? ` — ${g.length} Caustic Explosions went off together` : "") +
        (killed.length ? `; the explosions killed ${joinNames(killed.map((d) => d.player))}.` : ".") +
        (raid ? " Unresolvable from here; treated as a cutoff point." : ""),
      timestamp:   start,
      abilityId:   EXPLODING_INFECTION,
      abilityName: "Exploding Infection",
    });
  }
  return errors;
}

export const VASH_DISPEL_OVERLAP_RULE_ID = "wow-vash-dispel-overlap";

// Two or more dispels close enough that their Caustic Explosions stacked,
// and someone died to them: every dispeller involved is flagged (the log
// can't say which one was meant to wait).
function detectDispelOverlap(removals: InfectionRemoval[], deaths: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const g of groupByTime(removals, (r) => r.t, EXPLOSION_STACK_MS)) {
    const dispelled = g.filter((r) => r.dispellers.length > 0);
    if (g.length < 2 || dispelled.length === 0) continue;
    const killed = killsBy(deaths, CAUSTIC_EXPLOSION, g[0].t - 50, g[g.length - 1].t + EXPLOSION_STACK_MS).map((d) => d.player);
    if (killed.length === 0) continue;
    for (const r of dispelled) {
      const others = g.filter((o) => o !== r).map((o) => o.death ? `${o.p.name}'s death` : `${joinNames(o.dispellers.map((d) => d.name))}'s dispel of ${o.p.name}`);
      for (const d of r.dispellers) {
        errors.push(playerError(d, {
          ruleId:      VASH_DISPEL_OVERLAP_RULE_ID,
          severity:    "Major",
          name:        "Stacked Infection Dispels",
          description: `Dispelled Exploding Infection off ${r.p.name} within ${sec(Math.max(...g.map((o) => Math.abs(o.t - r.t))))}s of ` +
            `${joinNames(others)} — the Caustic Explosions stacked and killed ${joinNames(killed)}. Stagger dispels.`,
          timestamp:   r.t,
          abilityId:   CAUSTIC_EXPLOSION,
          abilityName: "Caustic Explosion",
        }));
      }
    }
  }
  return errors;
}

// ─── Plague Froth / Plague Wave ──────────────────────────────────────────────

type FrothExpiry = { p: PlayerInfo; t: number; pos?: { x: number; y: number } };

function frothExpiries(players: PlayerInfo[]): FrothExpiry[] {
  return players.flatMap((p) => debuffIntervals(p, PLAGUE_FROTH)
    .filter((iv) => Number.isFinite(iv.end))
    .map((iv) => ({ p, t: iv.end, pos: positionAt(p, iv.end) })));
}

export const VASH_PLAGUE_WAVE_RULE_ID = "wow-vash-plague-wave";

function detectPlagueWave(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const expiries = frothExpiries(players);
  const errors: PullError[] = [];
  for (const p of players) {
    for (const hits of groupByTime(hitsOf(p, PLAGUE_WAVE), (e) => e.timestamp, 1500)) {
      const first = hits[0];
      const total = hitTotal(hits);
      const died = hits.some((h) => diedAt(deaths, p.name, h.timestamp, 500)?.killingAbilityGameId === PLAGUE_WAVE);
      if (total === 0 && !died) continue; // immune
      // The carrier whose lane this hit sits on.
      const source = first.x === undefined ? undefined : expiries
        .filter((x) => x.p !== p && x.pos && first.timestamp >= x.t - 200 && first.timestamp <= x.t + WAVE_TRAVEL_MS)
        .map((x) => ({ x, off: Math.min(Math.abs(first.x! - x.pos!.x), Math.abs(first.y! - x.pos!.y)) }))
        .filter((c) => c.off <= WAVE_LANE_HALF_WIDTH)
        .sort((a, b) => a.off - b.off)[0]?.x;
      const ownExpiry = expiries.some((x) => x.p === p && Math.abs(x.t - first.timestamp) <= 1000);
      errors.push(playerError(p, {
        ruleId:      VASH_PLAGUE_WAVE_RULE_ID,
        severity:    died ? "Major" : "Minor",
        name:        "Hit by Plague Wave",
        description: `Hit by ${hits.length === 1 ? "a Plague Wave" : `${hits.length} Plague Waves`}` +
          (source ? ` from ${source.p.name}'s Plague Froth` : "") + ` (${kFmt(total)})` +
          (died ? " and died to it" : "") +
          (ownExpiry && source ? " — both were Froth carriers lined up on the same axis." : "."),
        timestamp:   first.timestamp,
        abilityId:   PLAGUE_WAVE,
        abilityName: "Plague Wave",
        abilityIcon: first.abilityIcon,
        amount:      total,
      }));
    }
  }
  return errors;
}

export const VASH_PLAGUE_FROTH_RULE_ID = "wow-vash-plague-froth";

function detectPlagueFroth(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  type Carry = { p: PlayerInfo; start: number; end: number };
  const carries: Carry[] = players.flatMap((p) => debuffIntervals(p, PLAGUE_FROTH).map((iv) => ({ p, start: iv.start, end: iv.end })));
  const errors: PullError[] = [];
  for (const set of groupByTime(carries, (c) => c.start, 1000)) {
    const start = set[0].start;
    const end = Math.max(...set.map((c) => (Number.isFinite(c.end) ? c.end : c.start + 6000)));
    const carriers = new Map(set.map((c) => [c.p, c]));
    for (const p of players) {
      const carry = carriers.get(p);
      const ticks = hitsOf(p, PLAGUE_FROTH_TICK).filter((e) => e.timestamp > start + FROTH_SPREAD_GRACE_MS && e.timestamp <= end + 300);
      // A carrier takes its own tick every second; extra ticks in the same
      // instant are another carrier's aura overlapping theirs.
      const counted = carry
        ? ticks.filter((e, i) => ticks.slice(0, i).some((o) => e.timestamp - o.timestamp <= 300))
        : ticks;
      if (counted.length < FROTH_MIN_TICKS) continue;
      const total = hitTotal(counted);
      const died = diedAt(deaths, p.name, counted[counted.length - 1].timestamp, 500)?.killingAbilityGameId === PLAGUE_FROTH_TICK;
      if (total === 0 && !died) continue;
      // Nearest carrier at the first counted tick — whose aura they were in.
      const at = counted[0];
      const near = at.x === undefined ? undefined : set
        .filter((c) => c.p !== p)
        .map((c) => ({ c, pos: positionAt(c.p, at.timestamp, 1500) }))
        .filter((o) => o.pos)
        .map((o) => ({ name: o.c.p.name, d: Math.hypot(o.pos!.x - at.x!, o.pos!.y - at.y!) }))
        .sort((a, b) => a.d - b.d)[0]?.name;
      errors.push(playerError(p, {
        ruleId:      VASH_PLAGUE_FROTH_RULE_ID,
        severity:    died ? "Major" : "Minor",
        name:        carry ? "Froth Carriers Overlapped" : "Stood Near Plague Froth",
        description: carry
          ? `Carried Plague Froth inside ${near ? `${near}'s` : "another carrier's"} range — ${counted.length} extra ticks (${kFmt(total)})` +
            (died ? " and died to it." : ". Carriers must spread.")
          : `Stayed within ${near ? `${near}'s` : "a carrier's"} Plague Froth for ${counted.length} ticks after the spread (${kFmt(total)})` +
            (died ? " and died to it." : "."),
        timestamp:   at.timestamp,
        abilityId:   PLAGUE_FROTH_TICK,
        abilityName: "Plague Froth",
        abilityIcon: at.abilityIcon,
        amount:      total,
      }));
    }
  }
  return errors;
}

// ─── Stygian Burst on a non-holder ───────────────────────────────────────────

export const VASH_STYGIAN_BURST_RULE_ID = "wow-vash-stygian-burst";

function detectStygianBurst(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const holding = (p: PlayerInfo, t: number) =>
    debuffIntervals(p, STYGIAN_INFECTION).some((iv) => iv.start <= t && iv.end >= t - 500);
  const errors: PullError[] = [];
  for (const p of players) {
    for (const hits of groupByTime(hitsOf(p, STYGIAN_BURST), (e) => e.timestamp, 1000)) {
      const first = hits[0];
      if (holding(p, first.timestamp)) continue; // the holder's own impact
      const total = hitTotal(hits);
      const died = diedAt(deaths, p.name, first.timestamp, 500)?.killingAbilityGameId === STYGIAN_BURST;
      if (total === 0 && !died) continue;
      const holders = players.filter((o) => o !== p && holding(o, first.timestamp)).map((o) => o.name);
      errors.push(playerError(p, {
        ruleId:      VASH_STYGIAN_BURST_RULE_ID,
        severity:    died ? "Major" : "Minor",
        name:        "Hit by Stygian Burst",
        description: `Hit by a Stygian Burst impact (${kFmt(total)})` +
          (holders.length ? ` from ${joinNames(holders)}'s Stygian Infection` : "") + (died ? " and died to it." : "."),
        timestamp:   first.timestamp,
        abilityId:   STYGIAN_BURST,
        abilityName: "Stygian Burst",
        abilityIcon: first.abilityIcon,
        amount:      total,
      }));
    }
  }
  return errors;
}

// ─── Umbral Ejection (Shrouded Venom death impacts) ──────────────────────────

export const VASH_UMBRAL_EJECTION_RULE_ID = "wow-vash-umbral-ejection";

function detectUmbralEjection(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const p of players) {
    for (const hits of groupByTime(hitsOf(p, UMBRAL_EJECTION), (e) => e.timestamp, 1000)) {
      const total = hitTotal(hits);
      const died = hits.some((h) => diedAt(deaths, p.name, h.timestamp, 500)?.killingAbilityGameId === UMBRAL_EJECTION);
      if (total === 0 && !died) continue;
      errors.push(playerError(p, {
        ruleId:      VASH_UMBRAL_EJECTION_RULE_ID,
        severity:    died ? "Major" : "Minor",
        name:        "Hit by Umbral Ejection",
        description: `Hit by a Shrouded Venom's Umbral Ejection impact (${kFmt(total)})${died ? " and died to it." : "."}`,
        timestamp:   hits[0].timestamp,
        abilityId:   UMBRAL_EJECTION,
        abilityName: "Umbral Ejection",
        abilityIcon: hits[0].abilityIcon,
        amount:      total,
      }));
    }
  }
  return errors;
}

// ─── Dripping Fangs: missed tank swap ────────────────────────────────────────

export const VASH_FANGS_SWAP_RULE_ID = "wow-vash-fangs-swap";

function detectFangsSwap(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const tanks = players.filter((p) => p.role === "Tank");
  const errors: PullError[] = [];
  for (const tank of tanks) {
    for (const e of tank.debuffs) {
      if (e.abilityId !== DRIPPING_FANGS_DEBUFF || e.debuffStatus !== "stack" || (e.stack ?? 0) < 2) continue;
      const died = deaths.find((d) => d.player === tank.name && d.timestamp >= e.timestamp && d.timestamp <= e.timestamp + FANGS_DEATH_WINDOW_MS);
      // The other tank was dead: no swap was possible.
      for (const other of tanks.filter((o) => o !== tank && aliveAt(o, deaths, e.timestamp))) {
        errors.push(playerError(other, {
          ruleId:      VASH_FANGS_SWAP_RULE_ID,
          severity:    died ? "Major" : "Minor",
          name:        "Missed Dripping Fangs Swap",
          description: `Didn't taunt Vashnik — ${tank.name} took a second Dripping Fangs while still debuffed (${e.stack} stacks)` +
            (died ? ` and died ${sec(died.timestamp - e.timestamp)}s later (${died.cause}).` : "."),
          timestamp:   e.timestamp,
          abilityId:   DRIPPING_FANGS_DEBUFF,
          abilityName: "Dripping Fangs",
          abilityIcon: e.abilityIcon,
        }));
      }
    }
  }
  return errors;
}


// ─── When was the pull over? ─────────────────────────────────────────────────
//
// Surveyed every wipe of kGVX7tafBT2pM1N3. The mechanic Raid errors above
// cover 16 of 18: Malignance (1/2/3/4/5/7/11/16/17), the Exploding Infection
// chain at Imbibe (8/9/12/13/18), Bile (10 — after a tank death). The
// generic markers below catch the rest, and win when earlier:
//
//   · A tank death not recovered by a quick battle-rez (pull 6 +380, pull
//     14 +99 nine seconds before the Imbibe chain, pull 10 +152).
//   · 5+ players dead at once, net of battle-rezzes (pull 15 +394: the
//     raid ran out of healing late and Froth/Waves finished it).
//   · Berserk.
//
// Only the EARLIEST generic marker is emitted, and only when no mechanic
// Raid error came before it.

export const VASH_PULL_OVER_RULE_ID = "wow-vash-pull-over";

function detectPullOver(players: PlayerInfo[], deaths: DeathEvent[], enemyCasts: EnemyEvent[], pullEnd: number): PullError[] {
  const berserk = enemyCasts.find((e) => e.abilityId === BERSERK && e.actorName === "Vashnik");
  return pullOverMarker(players, deaths, pullEnd, {
    ruleId: VASH_PULL_OVER_RULE_ID,
    collapseDead: COLLAPSE_DEAD,
    tankDeath: { kind: "recovered", rezGraceMs: TANK_REZ_GRACE_MS, continueMs: TANK_DEATH_CONTINUE_MS },
    extra: berserk ? [raidMarker(VASH_PULL_OVER_RULE_ID, "Berserk", "Vashnik went Berserk (enrage timer).", berserk.timestamp, BERSERK, "Berserk")] : [],
  });
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export function detectVashnikErrors(ctx: WowPullContext): PullError[] {
  const { players, deaths, enemyCasts, pullDurationMs } = ctx;
  // Self-gate: tank deaths / Berserk exist in every fight.
  const isVashnik = enemyCasts.some((e) => e.abilityId === IMBIBE) ||
    players.some((p) => p.debuffs.some((e) => e.abilityId === PLAGUE_FROTH || e.abilityId === DRIPPING_FANGS_DEBUFF));
  if (!isVashnik) return [];

  const removals = infectionRemovals(players, deaths);
  const errors = [
    ...detectMalignance(enemyCasts, deaths),
    ...detectMalignantBurst(enemyCasts, deaths),
    ...detectBile(players, enemyCasts, deaths),
    ...detectInfectionDeaths(removals, deaths),
    ...detectDispelOverlap(removals, deaths),
    ...detectPlagueWave(players, deaths),
    ...detectPlagueFroth(players, deaths),
    ...detectStygianBurst(players, deaths),
    ...detectUmbralEjection(players, deaths),
    ...detectFangsSwap(players, deaths),
  ];

  const pullEnd = pullDurationMs ?? lastPlayerEventMs(players);
  const firstRaid = Math.min(Infinity, ...errors.filter((e) => e.severity === "Raid").map((e) => e.timestamp));
  errors.push(...detectPullOver(players, deaths, enemyCasts, pullEnd).filter((e) => e.timestamp < firstRaid));

  return suppressDuplicateRaidErrors(errors.sort((a, b) => a.timestamp - b.timestamp));
}
