// lib/mechanics/wow/va/nekzali.ts
//
// Mythic Nek'zali the Soulcoiler (The Venomous Abyss) — per-pull error
// detection. Called from transformFightToPull in lib/log-transforms.ts; it
// self-gates on this encounter's aura IDs, so it is safe on any WoW pull.
//
// The second half of this header is the guide-derived encounter model
// (written 2026-09-26 before any log was available). The first half is what
// the logs actually showed; where the two disagree, the log section wins.
//
// ── VERIFIED AGAINST LOGS (report nRGxQ1b8LdMvzC4D, 6 Mythic pulls: five
//    wipes and a kill in pull 6; offsets fight-relative) ─────────────────────
//
// Only six pulls exist (the boss dies quickly), so most thresholds below
// rest on one or two failures. Treat them as first guesses for VOD review.
//
// Timeline (fixed across pulls): Soulcoil Ignition (enemy buff 1285681) at
// +3, ~+77, ~+148; Possession Barrage casts at +34/+70/+105/+141/+176;
// Grasping Depths (enemy buff 1293212 on the Soulcoil Well) at +42.5 and
// +113.5. Ritual of Awakening (cast 1295124) begins at 50% HP (+169 to
// +189); its channel buff 1289683 lands ~21s later and the intermission
// lasts until the second Echo of Jawae dies (Tether of Awakening 1289696
// loses a stack on the first). Uncoiling (enemy buff 1290003) marks phase 2.
//
// Energy (boss classResources type 3, visible on boss casts): phase 1 has
// NO passive gain — only the 15 scripted Ignition Rites (+5 each, 0 -> 75).
// It resets on Uncoiling; phase 2 gains passively plus +5 per Invoke Rite
// (Invoke 1299673 every 32-48s brings a raid-wide Rite with it). Uncoiled
// Rage (1284034) came at exactly Uncoiling +183.4s in both phase 2s that
// reached it (5 +520.4 wipe, 6 +480.6 at 2% HP, killed 13s later): it is the
// phase 2 DPS check. In pull 3 the intermission ran 176.5s (clean: 107-142s)
// and Uncoiled Rage followed Uncoiling by 6s at 100 energy while the Echo
// was still meleeing — the Ritual completed before the Echoes died.
//
// Soulcoil Rite (hit 1288772, stacking DoT): every Rite in this report came
// from Ignition or Invoke. No Amani reached the well and no well death
// caused one, so the "unscheduled Rite" rule is unverified.
//
// Restless Amani: waves of 4-6 from fixed sarcophagi (Gravebound Advance
// cast 1287533 carries the spawn position). Their death burst is Corpse
// Blight (1294729, sourceInstance = the add). A revived corpse casts
// Gravebound Advance again at the same instant it gains Vessel of
// Awakening (1297631, 5s); during those 5s it pulses Vessel of Awakening
// damage (1297630, ~80k per hit) on the whole raid. Revivals came 14.5-16s
// after a Hungering Pyre cast: 1 +239.4 (6 revived, 12 dead), 3 +344.0 (3,
// 6 dead), 4 +337.1 (3, 5 dead), 6 +219.4 (1, nobody died). EVERY revived
// corpse was a first-wave phase 1 kill (+62-85s); the trigger for WHICH
// Pyre revives them isn't recoverable (pulls 3/4 revived only after the
// fourth Pyre; Slithering Flames detonated 0.4-10yd from some corpses that
// still rose), so the revival is player-less.
//
// Hungering Pyre (cast 1289855 by the Echo, hit 1289855 on soakers): soakers
// get a 20s Cremation DoT (1289875) at once; everyone else gets Slithering
// Flame (1294933, 8s), whose expiry gives the carrier the same Cremation.
// Cremation never hit a player other than its carrier (1 exception in a
// collapse). Soak counts: clean kill min 7 (6 +239.6), deaths at 5 (5
// +281.4) and 6 (3 +245.8); 6 soakers also survived once (3 +294.4).
//
// Possession Barrage (debuff 1284103 on the tank, 5 raid hits 1292034):
// median hit 50-68k in every clean cast; 137k in 3 +34.0 (killed a DPS)
// and 613k under Uncoiled Rage.
//
// Essence Rend: pull-in debuff 1287427 (5s), then 1287434 (knockback + DoT)
// which healers dispel within 2-4s. Latent Cultist: a 357k burst when the
// pool spawns (1292899, once) and the pool itself (1288554, ~250k/s). Pool
// contact happened in every pull (55 ticks on 17 players in the kill,
// mostly in phase 2 after Invoke drags pools toward the well).
//
// Mythic well: two fixed teams alternate Grasping Depths windows (entry =
// Soulcoil Well 1285623 + Immortal Coil 1300524/1300521/1299988 debuffs).
// Soulcoiler's Curse (1300238) is kicked ~5s into its cast; a completed
// cast puts Soulcoiled (1290361) on the occupants ~7.5s later and they get
// mind-controlled (5 +327.3: the lone occupant was Soulcoiled 20s, then
// killed by the raid). Soul Exhaustion (1300235, 60s) lands on the team when their Echo
// dies. Re-entering with it is ROUTINE in phase 2 (the kill re-entered with
// 5-13s left every window, taking ~4x Immortal Coil ticks and surviving);
// only 5 +297.9 (8.6s left, entering alone) died from it. Swirling Spirit
// (1300239) ticks on about one well player per window, kill included —
// not flagged. The closed well (1290390, ~90k/s) hit a few players who
// walked in outside a window or stayed after it closed.
//
// Soul Transfer (hit 1295085): the Echo's transfer beam toward the well
// one-shot anyone in its path (4 +277.0, 5 +199.6; 812-816k).
//
// Mythic Invoke silence (debuff 1299722, exactly 3.0s) lands at the Invoke
// cast on players who were mid-cast (4, 11 and 8 per pull in 4/5/6).
//
// Hollowing Strikes (1284109): the Blood DK tank reached 17-18 stacks in
// the kill without dying, so stacks alone mark nothing. A Fury Warrior
// deliberately tanks Amani; add melee on non-tanks is not flagged.
//
// Wipe survey (where each pull was over):
//   Vessel revival     1 +239.4, 3 +344.0, 4 +337.1
//   Ritual completed   3 +372.8 (after the earlier cutoff)
//   Uncoiled Rage      5 +520.4 (and 6 +480.6, 13s before the kill)
//   Generic markers    2 +12.7 (tank took a 556k melee at 1 HP, died; the
//                      pull was reset 10s later)
//
// Not flagged: Ignition/Invoke Rites, Ritual Burn stacks, Uncoiling ticks,
// Corpse Blight, Grasping Depths raid ticks, Cremation, Swirling Spirit,
// Hollowing stacks, Soul Exhaustion re-entry without a death, and anything
// after Uncoiled Rage (the enrage kills everyone it touches).
//
// ── RULES IMPLEMENTED ────────────────────────────────────────────────────────
//
//   wow-nek-vessel-revival     Minor/Raid  unburned corpse revived (player-less)
//   wow-nek-ritual-completed   Raid        Echoes not killed before the Ritual ended
//   wow-nek-uncoiled-rage      Raid        phase 2 energy reached 100
//   wow-nek-pyre-undersoaked   Minor       Hungering Pyre split by <= 6 (player-less)
//   wow-nek-barrage-short      Minor/Major Possession Barrage hit hard (on its tank)
//   wow-nek-latent-cultist     Minor/Major stood in a Latent Cultist pool / burst
//   wow-nek-anguished-echoes   Minor/Major hit by Anguished Echoes
//   wow-nek-soul-transfer      Minor/Major stood in the Soul Transfer beam
//   wow-nek-closed-well        Minor/Major in the Soulcoil Well outside a window
//   wow-nek-curse              Minor       Soulcoiler's Curse completed (player-less)
//   wow-nek-exhausted-death    Major       died in the well after entering exhausted
//   wow-nek-invoke-silence     Minor       casting when Invoke landed
//   wow-nek-unscheduled-rite   Minor       Rite outside Ignition/Invoke (unverified)
//   wow-nek-pull-over          Raid        5+ dead / tank death the pull didn't survive
//
// ── GUIDE-DERIVED MODEL (pre-log) ────────────────────────────────────────────
//
// The spell IDs below come from encounter-journal links; they are
// CANDIDATES — the verified section above takes precedence.
//
// Sources checked 2026-09-26:
//   Mythic guide updated September 22:
//   https://www.method.gg/guides/the-venomous-abyss/nekzali-the-soulcoiler
//   Mythic PTR testing and chronology:
//   https://www.project-one.fun/en/guide/nekzali-the-soulcoiler
//   Encounter journal and linked spells:
//   https://www.wowhead.com/guide/midnight/raids/venomous-abyss-nekzali-the-soulcoiler-boss-strategy-abilities
//
// -- ENCOUNTER SHAPE --------------------------------------------------------
//
// Two boss phases, divided by Ritual of Awakening at 50% health. Nek'zali's
// energy rises passively throughout; an avoidable Soulcoil Rite gives her
// another 5 energy. At 100 energy, Uncoiled Rage makes survival and tanking
// effectively untenable. Health controls the intermission; energy supplies
// a parallel soft enrage. Do not infer a phase from elapsed time alone.
//
// The center Soulcoil Well consumes Restless Amani that reach it and players
// that die inside it. Those failures invoke Soulcoil Rite, which deals raid
// damage, leaves a stacking damage-over-time effect, and accelerates the
// enrage. The Mythic-only Grasping Depths/Drowned Echo forces assigned
// players into the well in all three segments. Intermission fire mechanics
// must dispose of add corpses so they cannot revive. Phase 2 keeps the
// earlier workload while Uncoiling adds sustained raid damage and Invoke
// disturbs the placed pools and spellcasting.
//
// -- ROUGH CHRONOLOGY -------------------------------------------------------
//
// 0. Pull: tank Nek'zali away from the central well and face her away from
//    the raid. Assign magic damage and control to each Amani approach, a
//    rotating well team with an interrupt, Essence Rend dispel spots at the
//    edge, and intermission Pyre soakers/flame carriers.
// 1. Phase 1 (100% to 50%): handle Essence Rend placements, tank Hollowing
//    Strikes/Possession Barrage, and waves of Restless Amani. Stop the adds
//    before the well; kill them with room to absorb Corpse Blight. On Mythic,
//    Grasping Depths periodically opens the well to a team that kills the
//    Drowned Echo and interrupts Soulcoiler's Curse. Soulcoil Ignition is a
//    scripted series of Rite hits with Anguished Echoes to avoid.
// 2. At 50%, Ritual of Awakening begins. The boss is initially attackable
//    during her channel, then becomes unavailable. Kill the Echoes of Jawae
//    in their active order to break Tether of Awakening and end the phase.
//    Amani waves and Mythic Grasping Depths can overlap this work.
// 3. In that intermission, Hungering Pyre is split by nearby soakers. Players
//    not hit by Pyre get Slithering Flame; they place its Cremation on Amani
//    corpses, away from allies. Unburned Vessels of Awakening reanimate as
//    empowered Amani, so clean up corpses before leaving this phase.
// 4. Phase 2 (50% to death): Uncoiling causes continuing raid damage. Repeat
//    Amani, tank, Essence Rend, and Mythic well handling while Invoke pulls
//    Latent Cultist pools toward the well. Stop casting before Mythic Invoke
//    to avoid its 3-second silence. Kill before energy/enrage or accumulated
//    space and healing pressure overwhelm the raid.
//
// This is a dependency sketch, not a promise of exact cast offsets. Method's
// current guide says Grasping Depths appears twice in each of phase 1,
// intermission, and phase 2; confirm counts and phase boundaries in the log.
//
// -- SOULCOIL WELL, RITE, AND ENERGY ---------------------------------------
//
// Soulcoil Well (1284032): an Amani reaching the well, or a player dying
// within it, triggers Soulcoil Rite (1284033). Soulcoiled (1290361) can
// compel a player toward the well and end in a sacrifice/Rite. The Rite
// grants 5 boss energy, inflicts raid damage and a long stacking DoT. Ritual
// Burn (1297624) makes later Rite hits 15% stronger per stack for one minute.
// Preventing the first failure matters because multiple Rites compound.
// Uncoiled Rage (1284034) at full energy grants very large damage and speed
// increases and taunt immunity: treat it as an enrage outcome, not the root
// mistake. Verify the exact energy and stack events in a real report.
//
// Soulcoil Ignition (1285681) intentionally invokes Soulcoil Rite once per
// second for roughly four seconds. Anguished Echoes (1294846) appear during
// that channel and hit/knock back players close to their impact (5 yards in
// the journal). Plan healing and dodge. A Rite occurring during Ignition is
// EXPECTED encounter damage; it must not automatically be labeled an add
// leak or a player death in the well. Correlate the Rite to Ignition and
// direct well triggers before assigning blame. Likewise, Ritual Burn stacks
// alone do not establish a mistake.
//
// -- RESTLESS AMANI AND THEIR CORPSES --------------------------------------
//
// Restless Amani approach from outer sarcophagi in waves, including the
// intermission. Gravebound Advance (1287533) is a magic-damage absorb of
// about 25% of the add's maximum health. While it persists, the add ignores
// normal aggro and advances toward the well; physical damage does not break
// the shield. Apply magic damage promptly. The PTR guide says slows, roots,
// and stuns work even before the shield breaks; do not infer a missed CC
// merely because the absorb is still present. Once free of the absorb, the
// add can be tanked/controlled and killed. Exact spawn count and approach
// points need verification from the log, not a hardcoded PTR assumption.
//
// On death, Corpse Blight (1294729) hits the raid and applies a stacking
// DoT. Several near-simultaneous deaths therefore create a real healing
// event; avoid treating every Corpse Blight as avoidable damage. The corpse
// persists as a Vessel of Awakening (1295263). In the intermission, unburned
// vessels are repossessed and the Amani return empowered. This links phase
// 1 add deaths to later failures: a revival may be due to poor corpse
// placement or a missed Cremation, not simply to the player who last hit an
// add. Multiple revivals together can snowball raid damage on Mythic.
//
// -- MYTHIC GRASPING DEPTHS / DROWNED ECHO ---------------------------------
//
// Grasping Depths (1293212) awakens a Drowned Echo inside the well, pulls
// players toward it, and adds raid-wide Shadow damage while the Echo lives.
// The well becomes enterable during this window. Send an assigned group
// with damage, healing, and an interrupt; Method recommends 3 DPS + 1
// healer per team while the earlier PTR guide used 4 DPS + 1 healer. Team
// size is strategy, not a detector constant. Rotate teams across spawns.
//
// Inside, Immortal Coil (1299988) ticks damage, and Swirling Spirit
// (1300239) hurts on contact. Soulcoiler's Curse (1300238) ejects occupants
// and applies Soulcoiled. The Mythic guides say to interrupt the cast; check
// interruptibility and actual cast/success IDs in a combat log before
// implementing a kick rule. If the Echo is ignored, Method reports it can
// drag a random player to the well, kill them, and cause a Rite; this is a
// guide-observed consequence to verify, not a mandatory timer assumption.
//
// Soul Exhaustion (1300235) is applied AFTER exiting the well and makes
// subsequent well/Immortal Coil damage 300% higher. It is not an entry
// debuff. Re-entry or repeated in/out movement is dangerous; an exit aura
// by itself is expected for a correctly assigned player. Distinguish well
// team deaths, missed Curse interrupts, and unassigned players dragged in
// by the Echo. A Rite after an occupant dies needs the causal death first.
//
// -- TANK AND RAID MECHANICS (PHASES 1 AND 2) -------------------------------
//
// Hollowing Strikes (1284110): stacking tank damage over time and 5% less
// healing/absorption received per stack for about 15 seconds. Swap tanks
// before stacks/healing loss become dangerous. Detect a missed swap from
// stack accumulation or resulting death, not from an arbitrary single hit.
//
// Possession Barrage (1284103): spectral echoes travel to the current tank
// and explode, damaging the raid; damage decreases with travel distance.
// The tank moves away from boss/raid to lengthen the path, while others
// avoid the impact. A raid hit is expected; an unusually heavy cluster of
// hits may indicate poor spacing. Combat-log damage alone may not identify
// which player's positioning caused it without positions.
//
// Essence Rend (1287426): several players are drawn in for about five
// seconds, then knocked away and retain a short debuff. Removal or expiry
// creates Latent Cultist (1287198) at that player's location: a short
// burst near the placement (6 yards in journal) and a persistent damaging,
// slowing pool. Move the target to the edge, then dispel/expire it there.
// Record the debuff, removal, and resulting pool separately. A dispel is
// correct only if the placement is safe; the log may require positional
// data to distinguish a bad central placement from a proper edge drop.
//
// -- 50% INTERMISSION: RITUAL OF AWAKENING ---------------------------------
//
// Nek'zali retreats and channels Ritual of Awakening. She can be damaged
// during the opening channel, then becomes unavailable until the Echoes of
// Jawae die. Soul Transfer (1292248) identifies the active Echo for about
// 15 seconds; Tether of Awakening (1289696) protects the inactive one from
// damage. The PTR guide observed two Echoes killed in sequence. Establish
// the active target from aura/cast/damage evidence rather than treating
// immunity on the other as an execution error. Amani and Grasping Depths
// still require handling during this transition.
//
// Hungering Pyre (1289855): Fire damage divided among players within ten
// yards. The soakers take the hit; players NOT hit by it receive Slithering
// Flame (1294933). The latter damages its carrier and ends in Cremation
// (1289875), which burns corpses/Restless Amani within four yards and hurts
// nearby players. Split the raid into enough Pyre soakers and designated
// flame carriers. Have carriers reach corpses while spacing from allies.
// If corpses remain, look for whether they were unreachable, no carrier
// reached them, a carrier's flame expired early, or the raid lacked a safe
// route. An unsoaked Pyre player receiving Flame is intended, not a failure.
//
// -- PHASE 2: UNCOILING AND INVOKE -----------------------------------------
//
// Uncoiling (1290003) repeatedly ticks raid damage until the kill. The
// center/well becomes increasingly hostile, but the Mythic Drowned Echo
// assignment still has to be handled when Grasping Depths opens access.
// Earlier add and tank work remains active. Invoke (1299673) repositions
// Latent Cultists via Entwined Step (1293497), pulling their pools toward
// the well and reducing safe space. On Mythic, Invoke interrupts spellcasts
// in progress and silences those interrupted for three seconds. Players
// should finish or stop casts before it lands; log detection needs to
// connect the Invoke event to a player's interrupted cast and silence.
// A silence aura without a simultaneous cast may have another cause.
//
// -- DETECTION NOTES FOR THE FUTURE IMPLEMENTATION ------------------------
//
// * First validate NPC IDs, spell IDs, event types, and any renamed spells
//   against a real Mythic log. These linked journal IDs are hypotheses.
// * Derive phases from 50% Ritual of Awakening, Echo/tether sequence, and
//   Uncoiling events. Health and casts are stronger than a fixed timeline.
// * Track boss energy and distinguish passive gain, scripted Ignition
//   Rites, Amani leaks, player deaths inside the well, and Curse-caused
//   Soulcoiled sacrifices. A Rite is a consequence; find its cause.
// * Track each Amani spawn, Gravebound Advance absorb, movement/arrival,
//   death, corpse location, Cremation, and revival. Avoid flagging an add
//   death as bad just because Corpse Blight follows it.
// * For each Grasping Depths, identify the Drowned Echo lifetime, well
//   occupants, Curse casts/interrupts, exit Soul Exhaustion, re-entry, and
//   deaths. The recommended team roster is a raid choice, not an error rule.
// * For Essence Rend, connect each removal to its Latent Cultist and later
//   Invoke movement. Mark unsafe placement only with adequate position or
//   collateral-damage evidence.
// * For Pyre, determine actual soakers and Flame recipients, then link each
//   Cremation to corpses removed. Account for overlapping add and well
//   mechanics before attributing an intermission failure.
// * A cast interrupted by Mythic Invoke and a resulting silence are useful
//   direct signals. Ordinary Uncoiling ticks, planned Rite hits during
//   Ignition, Soul Exhaustion on well exit, and Corpse Blight from planned
//   add kills are expected mechanics, not standalone mistakes.

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import { suppressDuplicateRaidErrors } from "../../../error-detection";
import {
  kFmt, sec, debuffIntervals, joinNames, playerError, lastPlayerEventMs,
  clusterByGap, deadAt, died, hitEpisodes, pullOverMarker,
} from "../common";
import type { WowPullContext } from "../common";

// ─── Ability IDs (log-verified, report nRGxQ1b8LdMvzC4D) ─────────────────────

const SOULCOIL_IGNITION  = 1285681; // enemy buff, 4s of scripted Rites
const SOULCOIL_RITE      = 1288772; // raid hit + stacking DoT
const RITUAL_BURN        = 1297624;
const INVOKE             = 1299673; // boss cast (phase 2)
const INVOKE_SILENCE     = 1299722; // 3s debuff on players who were casting
const RITUAL_CHANNEL     = 1289683; // enemy buff: the intermission channel
const UNCOILING          = 1290003; // enemy buff: phase 2 begins
const UNCOILED_RAGE      = 1284034; // enemy buff: 100 energy
const GRAVEBOUND_ADVANCE = 1287533; // Amani cast on spawn AND on revival
const VESSEL_AWAKENING   = 1297631; // enemy buff on a revived corpse (5s)
const VESSEL_PULSE       = 1297630; // its raid damage
const HUNGERING_PYRE     = 1289855; // Echo cast + soak hit
const BARRAGE_TARGET     = 1284103; // debuff on the tank
const BARRAGE_HIT        = 1292034;
const ESSENCE_REND_PULL  = 1287427;
const LATENT_POOL        = 1288554;
const LATENT_BURST       = 1292899;
const ANGUISHED_ECHOES   = 1294846;
const SOUL_TRANSFER_HIT  = 1295085;
const CLOSED_WELL        = 1290390; // damage for standing in the well outside a window
const SOULCOILERS_CURSE  = 1300238; // Drowned Echo cast
const SOULCOILED         = 1290361; // Curse result on well occupants (mind control)
const WELL_ENTRY         = 1300524; // first Immortal Coil debuff on entering the well
const IN_WELL            = 1299988; // Immortal Coil debuff held while inside
const IMMORTAL_COIL      = 1308227; // in-well damage
const SOUL_EXHAUSTION    = 1300235;

const NEKZALI_SIGNATURE = new Set([RITUAL_BURN, SOULCOIL_RITE, ESSENCE_REND_PULL]);

// ─── Thresholds (report nRGxQ1b8LdMvzC4D) ───────────────────────────────────

// A revival's Gravebound Advance cast and its Vessel buff share a timestamp.
const REVIVAL_MATCH_MS = 50;
const REVIVAL_CLUSTER_MS = 5000;
const VESSEL_DEATH_WINDOW_MS = 8000; // pulses last 5s
// 3+ revived or 3+ killed dooms the pull: 1 revived killed nobody (6 +219.4);
// 3 revived killed 5-6 (3 +344.0, 4 +337.1); 6 killed 12 (1 +239.4).
const VESSEL_RAID_REVIVED = 3;
const VESSEL_RAID_DEATHS = 3;

// Uncoiled Rage this soon after Uncoiling = the Ritual finished, not the
// phase 2 clock (3: 6.2s; the phase 2 enrage came at +183.4s in 5 and 6).
const RITUAL_COMPLETED_MS = 15000;

// Clean kill minimum 7 soakers (6 +239.6, 4 +251.9); a soaker died at 5
// (5 +281.4) and at 6 (3 +245.8).
const PYRE_MAX_UNDERSOAK = 6;
const PYRE_HIT_WINDOW_MS = 500;
const PYRE_DEATH_WINDOW_MS = 1000;

// Median Barrage hit: clean max 68k (6 +348.3), failure 137k (3 +34.0).
const BARRAGE_HEAVY_MEDIAN = 100000;
const BARRAGE_WINDOW_MS = 6000;
const BARRAGE_TARGET_MATCH_MS = 3000;
const BARRAGE_DEATH_WINDOW_MS = 8000;

const POOL_EPISODE_MS = 1500;    // pool ticks every 1s
const HIT_EPISODE_MS = 3000;
const HIT_DEATH_WINDOW_MS = 1500;

const CURSE_SOULCOILED_MS = 12000; // Soulcoiled landed 7.5s after the cast
const SOULCOILED_MAX_MS = 25000;   // held 20s in 5 +334.8

const IGNITION_RITE_WINDOW_MS = 6000; // 4s buff + margin
const INVOKE_RITE_MS = 1500;
const RITE_CLUSTER_MS = 400;
const RITE_MIN_PLAYERS = 5;          // the stray single-hit "pulses" at 3 +374 were collapse noise

const COLLAPSE_DEAD = 5;
const TANK_REZ_GRACE_MS = 15000;
// A tank death only ends the pull when the pull ends soon after (2 +12.7:
// reset 10s later). 5 +452.9 lost a tank with 12% left and fought on 67s.
const TANK_DEATH_END_MS = 30000;

// ─── Small helpers ───────────────────────────────────────────────────────────

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
}

/**
 * Per-player avoidable-damage rule: group each player's hits of `ids` into
 * episodes; Major when a hit of `ids` killed them.
 */
function avoidableHits(
  players: PlayerInfo[], deaths: DeathEvent[], ids: Set<number>, gapMs: number,
  make: (p: PlayerInfo, hits: PlayerEvent[], death: DeathEvent | undefined) => PullError,
): PullError[] {
  return hitEpisodes(players, deaths, (p) => p.damageTaken.filter((e) => ids.has(e.abilityId)), [...ids], gapMs, make, HIT_DEATH_WINDOW_MS);
}

// ─── Vessel of Awakening: unburned corpses revived ───────────────────────────

export const NEK_VESSEL_RULE_ID = "wow-nek-vessel-revival";

function detectVesselRevival(deaths: DeathEvent[], enemyCasts: EnemyEvent[], enemyBuffs: EnemyEvent[]): PullError[] {
  const vessels = enemyBuffs.filter((e) => e.abilityId === VESSEL_AWAKENING);
  const revivals = enemyCasts.filter((c) => c.abilityId === GRAVEBOUND_ADVANCE &&
    vessels.some((v) => Math.abs(v.timestamp - c.timestamp) <= REVIVAL_MATCH_MS));
  const pyres = enemyCasts.filter((e) => e.abilityId === HUNGERING_PYRE);
  return clusterByGap(revivals, (e) => e.timestamp, REVIVAL_CLUSTER_MS).map((g) => {
    const t = g[0].timestamp;
    const killed = deaths.filter((d) => d.killingAbilityGameId === VESSEL_PULSE &&
      d.timestamp >= t && d.timestamp <= g[g.length - 1].timestamp + VESSEL_DEATH_WINDOW_MS);
    const pyre = pyres.filter((e) => e.timestamp < t).pop();
    const raid = g.length >= VESSEL_RAID_REVIVED || killed.length >= VESSEL_RAID_DEATHS;
    return {
      ruleId:      NEK_VESSEL_RULE_ID,
      severity:    raid ? "Raid" : "Minor",
      name:        "Vessel of Awakening",
      description: `${g.length} unburned Amani corpse${g.length === 1 ? "" : "s"} revived` +
        (pyre ? ` ${sec(t - pyre.timestamp)}s after the Hungering Pyre at +${sec(pyre.timestamp)}s` : "") +
        ` and pulsed the raid for 5s` +
        (killed.length ? `, killing ${killed.length}: ${joinNames(killed.map((d) => d.player))}` : "; nobody died") +
        `. Slithering Flame carriers must burn every corpse before this.` +
        (raid ? " Treated as the point the pull was over." : ""),
      timestamp:   t,
      abilityId:   VESSEL_AWAKENING,
      abilityName: "Vessel of Awakening",
      abilityIcon: vessels[0]?.abilityIcon,
    };
  });
}

// ─── Uncoiled Rage: the Ritual completed, or the phase 2 clock ran out ───────

export const NEK_RITUAL_RULE_ID = "wow-nek-ritual-completed";
export const NEK_UNCOILED_RULE_ID = "wow-nek-uncoiled-rage";

function detectUncoiledRage(enemyBuffs: EnemyEvent[]): PullError[] {
  const rage = enemyBuffs.find((e) => e.abilityId === UNCOILED_RAGE);
  if (!rage) return [];
  const p2 = enemyBuffs.filter((e) => e.abilityId === UNCOILING && e.timestamp <= rage.timestamp).pop();
  const channel = enemyBuffs.find((e) => e.abilityId === RITUAL_CHANNEL);
  const base = { severity: "Raid" as const, timestamp: rage.timestamp, abilityId: UNCOILED_RAGE,
    abilityName: "Uncoiled Rage", abilityIcon: rage.abilityIcon };
  if (p2 && rage.timestamp - p2.timestamp <= RITUAL_COMPLETED_MS) {
    return [{
      ...base,
      ruleId:      NEK_RITUAL_RULE_ID,
      name:        "Ritual of Awakening Completed",
      description: "The Echoes of Jawae weren't killed before Ritual of Awakening finished" +
        (channel ? ` (the intermission lasted ${sec(p2.timestamp - channel.timestamp)}s)` : "") +
        `; Nek'zali came out at 100 energy and gained Uncoiled Rage ${sec(rage.timestamp - p2.timestamp)}s later. Unresolvable from here.`,
    }];
  }
  return [{
    ...base,
    ruleId:      NEK_UNCOILED_RULE_ID,
    name:        "Uncoiled Rage",
    description: "Nek'zali reached 100 energy" + (p2 ? ` ${sec(rage.timestamp - p2.timestamp)}s into phase 2` : "") +
      " and gained Uncoiled Rage (the phase 2 enrage). Treated as the cutoff point.",
  }];
}

// ─── Hungering Pyre: under-soaked ────────────────────────────────────────────

export const NEK_PYRE_RULE_ID = "wow-nek-pyre-undersoaked";

function detectPyreSoak(players: PlayerInfo[], deaths: DeathEvent[], enemyCasts: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const c of enemyCasts.filter((e) => e.abilityId === HUNGERING_PYRE)) {
    const soakers = players.filter((p) => p.damageTaken.some((e) =>
      e.abilityId === HUNGERING_PYRE && !e.isDoT && Math.abs(e.timestamp - c.timestamp) <= PYRE_HIT_WINDOW_MS));
    if (soakers.length === 0 || soakers.length > PYRE_MAX_UNDERSOAK) continue;
    const killed = deaths.filter((d) => d.killingAbilityGameId === HUNGERING_PYRE &&
      d.timestamp >= c.timestamp - 100 && d.timestamp <= c.timestamp + PYRE_DEATH_WINDOW_MS);
    const avg = soakers.reduce((s, p) => s + (p.damageTaken.find((e) =>
      e.abilityId === HUNGERING_PYRE && !e.isDoT && Math.abs(e.timestamp - c.timestamp) <= PYRE_HIT_WINDOW_MS)?.amount ?? 0), 0) / soakers.length;
    errors.push({
      ruleId:      NEK_PYRE_RULE_ID,
      severity:    "Minor",
      name:        "Hungering Pyre Under-soaked",
      description: `Only ${soakers.length} players soaked Hungering Pyre (${joinNames(soakers.map((p) => p.name))}; ${kFmt(avg)} each)` +
        (killed.length ? ` — it killed ${joinNames(killed.map((d) => d.player))}.` : ".") +
        " The clean kill never had fewer than 7.",
      timestamp:   c.timestamp,
      abilityId:   HUNGERING_PYRE,
      abilityName: "Hungering Pyre",
      abilityIcon: c.abilityIcon,
    });
  }
  return errors;
}

// ─── Possession Barrage: not taken far enough ────────────────────────────────

export const NEK_BARRAGE_RULE_ID = "wow-nek-barrage-short";

function detectBarrage(players: PlayerInfo[], deaths: DeathEvent[], enemyCasts: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const c of enemyCasts.filter((e) => e.abilityId === BARRAGE_TARGET)) {
    const hits = players.flatMap((p) => p.damageTaken.filter((e) =>
      e.abilityId === BARRAGE_HIT && !e.isDoT && e.timestamp >= c.timestamp && e.timestamp <= c.timestamp + BARRAGE_WINDOW_MS));
    const med = median(hits.map((e) => e.amount ?? 0));
    if (med < BARRAGE_HEAVY_MEDIAN) continue;
    const tank = players.find((p) => p.debuffs.some((e) => e.abilityId === BARRAGE_TARGET && e.debuffStatus === "applied" &&
      Math.abs(e.timestamp - c.timestamp) <= BARRAGE_TARGET_MATCH_MS));
    if (!tank) continue;
    const killed = deaths.filter((d) => d.killingAbilityGameId === BARRAGE_HIT &&
      d.timestamp >= c.timestamp && d.timestamp <= c.timestamp + BARRAGE_DEATH_WINDOW_MS);
    errors.push(playerError(tank, {
      ruleId:      NEK_BARRAGE_RULE_ID,
      severity:    killed.length ? "Major" : "Minor",
      name:        "Possession Barrage Too Close",
      description: `Possession Barrage's echoes travelled a short way to ${tank.name}: the raid's median hit was ${kFmt(med)} ` +
        `(clean casts: 50-68k)` + (killed.length ? `, and it killed ${joinNames(killed.map((d) => d.player))}.` : "."),
      timestamp:   c.timestamp,
      abilityId:   BARRAGE_TARGET,
      abilityName: "Possession Barrage",
      abilityIcon: c.abilityIcon,
    }));
  }
  return errors;
}

// ─── Avoidable damage ────────────────────────────────────────────────────────

export const NEK_LATENT_RULE_ID = "wow-nek-latent-cultist";
export const NEK_ECHOES_RULE_ID = "wow-nek-anguished-echoes";
export const NEK_SOUL_TRANSFER_RULE_ID = "wow-nek-soul-transfer";
export const NEK_CLOSED_WELL_RULE_ID = "wow-nek-closed-well";

// 4+ players stepping into pools within 3s looks like a pool moving onto the
// group (6 +267-270: six at once in the intermission; 6 +449-452: five in
// phase 2) — context for the reviewer, not an exemption.
const POOL_GROUP_MS = 3000;
const POOL_GROUP_MIN = 4;

function detectAvoidable(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const total = (g: PlayerEvent[]) => kFmt(g.reduce((s, e) => s + (e.amount ?? 0), 0));
  const pools = avoidableHits(players, deaths, new Set([LATENT_POOL, LATENT_BURST]), POOL_EPISODE_MS, (p, g, death) => {
    const burst = g.some((e) => e.abilityId === LATENT_BURST);
    const ticks = g.filter((e) => e.abilityId === LATENT_POOL).length;
    return playerError(p, {
      ruleId:      NEK_LATENT_RULE_ID,
      severity:    death ? "Major" : "Minor",
      name:        "Latent Cultist",
      description: (burst ? "Caught a Latent Cultist spawning burst" + (ticks ? " and stood in its pool" : "") : "Stood in a Latent Cultist pool") +
        (ticks ? ` for ${ticks} tick${ticks === 1 ? "" : "s"}` : "") + ` (${total(g)})${died(death, g[0].timestamp)}.`,
      timestamp:   g[0].timestamp,
      abilityId:   g[0].abilityId,
      abilityName: "Latent Cultist",
      abilityIcon: g[0].abilityIcon,
    });
  });
  const withGroup = pools.map((e) => {
    const others = pools.filter((o) => o.player !== e.player && Math.abs(o.timestamp - e.timestamp) <= POOL_GROUP_MS);
    return others.length + 1 >= POOL_GROUP_MIN
      ? { ...e, description: `${e.description} ${others.length} others stepped into pools within ${POOL_GROUP_MS / 1000}s — the pool may have moved onto the group.` }
      : e;
  });
  return [
    ...withGroup,
    ...avoidableHits(players, deaths, new Set([ANGUISHED_ECHOES]), HIT_EPISODE_MS, (p, g, death) => playerError(p, {
      ruleId:      NEK_ECHOES_RULE_ID,
      severity:    death ? "Major" : "Minor",
      name:        "Hit by Anguished Echoes",
      description: `Hit by Anguished Echoes${g.length > 1 ? ` ${g.length} times` : ""} during Soulcoil Ignition (${total(g)})${died(death, g[0].timestamp)}.`,
      timestamp:   g[0].timestamp,
      abilityId:   ANGUISHED_ECHOES,
      abilityName: "Anguished Echoes",
      abilityIcon: g[0].abilityIcon,
    })),
    ...avoidableHits(players, deaths, new Set([SOUL_TRANSFER_HIT]), HIT_EPISODE_MS, (p, g, death) => playerError(p, {
      ruleId:      NEK_SOUL_TRANSFER_RULE_ID,
      severity:    death ? "Major" : "Minor",
      name:        "Hit by Soul Transfer",
      description: `Stood in Soul Transfer's path from the Echo of Jawae to the well (${total(g)})${died(death, g[0].timestamp)}.`,
      timestamp:   g[0].timestamp,
      abilityId:   SOUL_TRANSFER_HIT,
      abilityName: "Soul Transfer",
      abilityIcon: g[0].abilityIcon,
    })),
    ...avoidableHits(players, deaths, new Set([CLOSED_WELL]), POOL_EPISODE_MS, (p, g, death) => playerError(p, {
      ruleId:      NEK_CLOSED_WELL_RULE_ID,
      severity:    death ? "Major" : "Minor",
      name:        "In the Closed Well",
      description: `Stood in the Soulcoil Well outside a Grasping Depths window for ${g.length} tick${g.length === 1 ? "" : "s"} (${total(g)})${died(death, g[0].timestamp)}.`,
      timestamp:   g[0].timestamp,
      abilityId:   CLOSED_WELL,
      abilityName: "Soulcoil Well",
      abilityIcon: g[0].abilityIcon,
    })),
  ];
}

// ─── Mythic well: uninterrupted Curse, exhausted re-entry ────────────────────

export const NEK_CURSE_RULE_ID = "wow-nek-curse";
export const NEK_EXHAUSTED_RULE_ID = "wow-nek-exhausted-death";

function detectCurse(players: PlayerInfo[], deaths: DeathEvent[], enemyCasts: EnemyEvent[]): PullError[] {
  return enemyCasts.filter((e) => e.abilityId === SOULCOILERS_CURSE).map((c) => {
    const inside = players.filter((p) => debuffIntervals(p, IN_WELL).some((iv) => iv.start <= c.timestamp && iv.end >= c.timestamp));
    const coiled = players.flatMap((p) => p.debuffs
      .filter((e) => e.abilityId === SOULCOILED && e.debuffStatus === "applied" && e.timestamp >= c.timestamp && e.timestamp <= c.timestamp + CURSE_SOULCOILED_MS)
      .slice(0, 1).map((e) => ({ p, t: e.timestamp })));
    const lost = coiled.filter(({ p, t }) => deaths.some((d) => d.player === p.name && d.timestamp >= t && d.timestamp <= t + SOULCOILED_MAX_MS));
    return {
      ruleId:      NEK_CURSE_RULE_ID,
      severity:    "Minor" as const,
      name:        "Soulcoiler's Curse Not Interrupted",
      description: "The Drowned Echo completed Soulcoiler's Curse" +
        (inside.length ? ` with ${joinNames(inside.map((p) => p.name))} in the well` : "") +
        (coiled.length ? `; Soulcoiled: ${joinNames(coiled.map(({ p }) => p.name))}` : "") +
        (lost.length ? ` (${joinNames(lost.map(({ p }) => p.name))} died while Soulcoiled)` : "") + ".",
      timestamp:   c.timestamp,
      abilityId:   SOULCOILERS_CURSE,
      abilityName: "Soulcoiler's Curse",
      abilityIcon: c.abilityIcon,
    };
  });
}

function detectExhaustedDeath(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const d of deaths.filter((x) => x.killingAbilityGameId === IMMORTAL_COIL)) {
    const p = players.find((x) => x.name === d.player);
    if (!p) continue;
    // Deaths in the well during a collapse are fallout (1 +245-250: healers dead).
    if (deadAt(players, deaths, d.timestamp - 1).length >= COLLAPSE_DEAD) continue;
    const entry = p.debuffs.filter((e) => e.abilityId === WELL_ENTRY && e.debuffStatus === "applied" && e.timestamp <= d.timestamp).pop();
    if (!entry) continue;
    const exhausted = debuffIntervals(p, SOUL_EXHAUSTION).find((iv) => iv.start < entry.timestamp && iv.end > entry.timestamp);
    if (!exhausted) continue;
    const left = exhausted.end === Infinity || exhausted.end === d.timestamp ? undefined : exhausted.end - entry.timestamp;
    errors.push(playerError(p, {
      ruleId:      NEK_EXHAUSTED_RULE_ID,
      severity:    "Major",
      name:        "Entered the Well Exhausted",
      description: `Entered the well with Soul Exhaustion still up` +
        (left !== undefined ? ` (${sec(left)}s left)` : ` (applied ${sec(entry.timestamp - exhausted.start)}s earlier)`) +
        ` — Immortal Coil hits 300% harder — and died to it ${sec(d.timestamp - entry.timestamp)}s later.`,
      timestamp:   entry.timestamp,
      abilityId:   SOUL_EXHAUSTION,
      abilityName: "Soul Exhaustion",
      abilityIcon: entry.abilityIcon,
    }));
  }
  return errors;
}

// ─── Mythic Invoke: casting through the silence ──────────────────────────────

export const NEK_INVOKE_RULE_ID = "wow-nek-invoke-silence";

function detectInvokeSilence(players: PlayerInfo[]): PullError[] {
  return players.flatMap((p) => p.debuffs
    .filter((e) => e.abilityId === INVOKE_SILENCE && e.debuffStatus === "applied")
    .map((e) => playerError(p, {
      ruleId:      NEK_INVOKE_RULE_ID,
      severity:    "Minor",
      name:        "Silenced by Invoke",
      description: "Was casting when Invoke landed: the cast was interrupted and they were silenced for 3s.",
      timestamp:   e.timestamp,
      abilityId:   INVOKE_SILENCE,
      abilityName: "Invoke",
      abilityIcon: e.abilityIcon,
    })));
}

// ─── Soulcoil Rite outside Ignition / Invoke ─────────────────────────────────

export const NEK_UNSCHEDULED_RITE_RULE_ID = "wow-nek-unscheduled-rite";

function detectUnscheduledRite(players: PlayerInfo[], deaths: DeathEvent[], enemyCasts: EnemyEvent[], enemyBuffs: EnemyEvent[]): PullError[] {
  const ignitions = enemyBuffs.filter((e) => e.abilityId === SOULCOIL_IGNITION).map((e) => e.timestamp);
  const invokes = enemyCasts.filter((e) => e.abilityId === INVOKE).map((e) => e.timestamp);
  const hits = players.flatMap((p) => p.damageTaken.filter((e) => e.abilityId === SOULCOIL_RITE && !e.isDoT).map((e) => ({ p, e })));
  const errors: PullError[] = [];
  for (const g of clusterByGap(hits, (h) => h.e.timestamp, RITE_CLUSTER_MS)) {
    const t = g[0].e.timestamp;
    if (new Set(g.map((h) => h.p.name)).size < RITE_MIN_PLAYERS) continue;
    if (ignitions.some((i) => t >= i - RITE_CLUSTER_MS && t <= i + IGNITION_RITE_WINDOW_MS)) continue;
    if (invokes.some((i) => Math.abs(t - i) <= INVOKE_RITE_MS)) continue;
    const recent = deaths.filter((d) => d.timestamp <= t && d.timestamp >= t - 3000).pop();
    errors.push({
      ruleId:      NEK_UNSCHEDULED_RITE_RULE_ID,
      severity:    "Minor",
      name:        "Unscheduled Soulcoil Rite",
      description: "Soulcoil Rite hit the raid outside Soulcoil Ignition and Invoke — an Amani reached the well or someone died in it (+5 energy)" +
        (recent ? `; ${recent.player} died ${sec(t - recent.timestamp)}s before it` : "") + ".",
      timestamp:   t,
      abilityId:   SOULCOIL_RITE,
      abilityName: "Soulcoil Rite",
      abilityIcon: g[0].e.abilityIcon,
    });
  }
  return errors;
}

// ─── When was the pull over? ─────────────────────────────────────────────────
//
// Only the EARLIEST generic marker is emitted, and only when no mechanic
// Raid error came before it (see vashnik.ts).

export const NEK_PULL_OVER_RULE_ID = "wow-nek-pull-over";

function detectPullOver(players: PlayerInfo[], deaths: DeathEvent[], pullEnd: number): PullError[] {
  return pullOverMarker(players, deaths, pullEnd, {
    ruleId: NEK_PULL_OVER_RULE_ID,
    collapseDead: COLLAPSE_DEAD,
    cause: (d) => (d.killingAbilityGameId ? d.cause : "unknown"),
    tankDeath: { kind: "pullEnded", rezGraceMs: TANK_REZ_GRACE_MS, endMs: TANK_DEATH_END_MS },
  });
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export function detectNekzaliErrors(ctx: WowPullContext): PullError[] {
  const { players, deaths, enemyCasts, enemyBuffs, pullDurationMs } = ctx;
  // Self-gate: tank deaths exist in every fight.
  const isNekzali = players.some((p) => p.debuffs.some((e: PlayerEvent) => NEKZALI_SIGNATURE.has(e.abilityId)));
  if (!isNekzali) return [];

  // Under Uncoiled Rage everything one-shots; per-player errors after it are
  // enrage fallout.
  const rageAt = enemyBuffs.find((e) => e.abilityId === UNCOILED_RAGE)?.timestamp ?? Infinity;
  const errors = [
    ...detectVesselRevival(deaths, enemyCasts, enemyBuffs),
    ...detectUncoiledRage(enemyBuffs),
    ...[
      ...detectPyreSoak(players, deaths, enemyCasts),
      ...detectBarrage(players, deaths, enemyCasts),
      ...detectAvoidable(players, deaths),
      ...detectCurse(players, deaths, enemyCasts),
      ...detectExhaustedDeath(players, deaths),
      ...detectInvokeSilence(players),
      ...detectUnscheduledRite(players, deaths, enemyCasts, enemyBuffs),
    ].filter((e) => e.timestamp < rageAt),
  ];

  const pullEnd = pullDurationMs ?? lastPlayerEventMs(players);
  const firstRaid = Math.min(Infinity, ...errors.filter((e) => e.severity === "Raid").map((e) => e.timestamp));
  errors.push(...detectPullOver(players, deaths, pullEnd).filter((e) => e.timestamp < firstRaid));

  return suppressDuplicateRaidErrors(errors.sort((a, b) => a.timestamp - b.timestamp));
}
