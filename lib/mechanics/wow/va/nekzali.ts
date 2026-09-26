// lib/mechanics/wow/va/nekzali.ts
//
// Mythic Nek'zali the Soulcoiler (The Venomous Abyss): guide-derived encounter
// model for later combat-log detection. This file intentionally contains no
// detector. Spell IDs below are linked journal IDs, not verified Warcraft
// Logs cast/debuff/damage IDs. Add a separate log-verified section when a
// Mythic report is available, and let observed events override guide timing.
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
