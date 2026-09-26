// lib/mechanics/wow/va/entombed-sentinels.ts
//
// Mythic Entombed Sentinels encounter model for future combat-log detection.
// This file intentionally contains no detectors yet. The mechanics and spell
// links below describe the Mythic fight; spell IDs are guide/journal IDs, NOT
// verified FFLogs event IDs. Before implementing a rule, inspect a Mythic pull
// for its actual event type, source/target, aura ID, and damage ID. In particular,
// a cast ID need not equal its debuff or explosion ID. Never infer a failure
// solely from a player's death or from the damage amount of an ordinary hit.
//
// Sources checked 2026-09-25:
//   Mythic strategy: https://www.method.gg/guides/the-venomous-abyss/entombed-sentinels
//   Encounter journal and spells:
//   https://www.wowhead.com/guide/midnight/raids/venomous-abyss-entombed-sentinels-boss-strategy-abilities
//   Additional Mythic notes: https://www.icy-veins.com/wow/entombed-sentinels-raid-guide
// The journal gives ability behavior. Method gives the Mythic-only rules,
// observed severity, and practical solutions. No sample Mythic log is included
// in this file, so timings below are relative order, not exact cast schedules.
//
// -- ENCOUNTER SHAPE ---------------------------------------------------------
//
// This is a 20-player, two-boss encounter in The Venomous Abyss. Breath of
// Ula'tek (green/acid) and Blood of Ula'tek (red/blood) have separate health
// pools. Split the raid into roughly equal teams, one on each boss. Keep the
// bosses well separated (practically >= 40 yards): Ula'tek's Dominance makes
// them take 99% less damage when close. The two bosses' mechanics run in
// parallel. Players should normally stay with their assigned team, with a
// temporary cross-room movement only when the Mythic Protovenom pair requires
// it. Balance boss damage before each intermission: Vitriolic Stasis heals the
// lower-health boss UP to the higher-health boss.
//
// Each nearby player gains a stacking Mark of Acid or Mark of Blood from that
// Sentinel. The marks cause increasing periodic raid damage. At 100 energy,
// both bosses rush together for the Vitriolic Stasis intermission. After it,
// teams return to their original sides but the tanks take the OPPOSITE boss,
// allowing their former mark to expire. The main-phase/intermission cycle
// repeats until both Sentinels die. There is no separate final phase.
//
// -- ROUGH CHRONOLOGY OF ONE CYCLE ------------------------------------------
//
// 1. Pull: park Breath and Blood apart, assign one tank and half the raid to
//    each, and start balanced damage. Marks begin stacking on nearby players.
// 2. Main phase, simultaneous lanes:
//      Breath: Toxic Droplets -> clear little orbs before Noxious Blast;
//              Venom Coagulation -> kill the large slime before Contaminate
//              pulses overwhelm the raid; Empowering Slam ramps on its tank.
//      Blood:  Unstable Miasma -> group soak, then place Clinging Murk/Blood
//              Venom puddles at a controlled edge; dispel Blighted Blood;
//              Bloodvenom Injection ramps on its tank.
//      Both:   Mythic Shifting Protovenom assigns eight circle players.
//              Marked players must pair with other marked players, while
//              unmarked players make space. This can cross the two teams.
//    These events overlap; the list is a dependency sketch, not a claim that
//    each cast always occurs in precisely this order. The second green slime
//    set can occur just before the intermission, so finish it promptly.
// 3. At 100 energy: Vitriolic Stasis lasts about 30 seconds. The bosses
//    converge, take 99% less damage, and equalize health upward. Everyone
//    receives Helical Toxins with 1, 2, or 3 applications. On Mythic the
//    visible orb count flashes briefly and is then hidden. Pair counts to
//    total EXACTLY four (1+3 or 2+2) before the 28-second expiry.
// 4. Intermission end: raid teams return to their original areas. Tanks swap
//    which boss they tank. Re-establish separation, repeat the main phase,
//    keep the floor usable, and kill both bosses without a large HP gap.
//
// -- SHARED AND MYTHIC MECHANICS --------------------------------------------
//
// Shifting Protovenom (1296878, Mythic-only): Vashnik contaminates eight
// random players with a circular, ticking Plague debuff. Two currently marked
// players touching neutralize BOTH debuffs harmlessly. A marked player
// touching an unmarked player instead triggers Protovenom Eruption (1296962):
// heavy damage and knockback around the collision, with the venom still to
// clear. A chain reaction near a stacked raid is lethal. Pre-spread before
// each application, identify other marked players, pair in open space, and
// leave lanes for pairs to reach one another. Do not assume each side receives
// an even number of marks; a player may need to cross to the opposite team.
// Detection should distinguish a correct pair's debuff removals from an
// eruption, and should not treat a lingering debuff or incidental movement
// alone as proof of a wrong collision. The eruption damage event is a strong
// failure signal once its actual log ID is verified.
//
// Ula'tek's Dominance (1290193): both bosses get 99% damage reduction when
// close. Mark of Acid (1284494) and Mark of Blood (1284503) accumulate near
// their respective bosses. These are state/context signals, not errors by
// themselves. Avoid hard-coding a compass side or requiring one raid layout.
//
// -- BREATH OF ULA'TEK (GREEN) ----------------------------------------------
//
// Toxic Droplets (1284434): small orbs appear and explode as Noxious Blast
// (1284452) after about 12 seconds if not destroyed by a player stepping on
// each orb. On Mythic the pickup costs serious damage; one player collecting
// too many can die. Assign players to clear all orbs and rotate mobile
// immunities for dense sets, especially those in Blood Venom puddles or near
// intermission. A cleared orb releases Living Venom (1284207), which travels
// back to Breath after about four seconds; keep its return paths out of the
// raid. In Mythic, a missed orb's blast or a hit by a returning projectile is
// often lethal. A verified Noxious Blast damage event would indicate a missed
// orb; do not blame a collector merely for taking the intended pickup hit.
//
// Venom Coagulation (1284251): spawns a large slime. While alive it repeatedly
// deals raid damage with Contaminate (1284257), about every three seconds in
// the journal. Kill it quickly, especially the set immediately before Stasis.
// Contaminate ticks establish time alive but are not individually avoidable
// player mistakes. A future detector needs an add spawn/death window and a
// validated threshold before assigning responsibility for slow add damage.
//
// Empowering Slam (1284458): large physical tank hit. Repeated slams on the
// same target increase subsequent physical damage until another target is
// slammed. The ordinary solution is defensive planning through the main
// phase, with the encounter-wide tank swap after Stasis. A large tank hit or
// death alone does not prove a missed swap or missed mitigation.
//
// -- BLOOD OF ULA'TEK (RED) --------------------------------------------------
//
// Unstable Miasma (1288232): marks one player, then after about eight seconds
// splits a large hit among players within 7.5 yards. Assemble the Blood-side
// team in the soak while leaving room for Protovenom pairs. Too few soakers
// is often fatal on Mythic. The hit spreads Clinging Murk (1288297) to the
// soakers. When Murk expires, it produces Blood Venom pools (1284208); place
// these near an edge or existing pools so the arena remains usable for future
// orbs and pairings. Do not require a particular world-marker layout. If a
// detector counts soakers, tie damage to the marked player and resolution
// time, then verify the actual split-damage event in a Mythic log.
//
// Blighted Blood (1284471): dispellable Shadow DoT, shown as an 18-second
// debuff in the journal. Healers should dispel promptly. A natural expiry can
// leave a Blood Venom pool, so a player still carrying it should move to the
// planned puddle area. Do not equate every expiration with a dispel failure
// until the Mythic log confirms whether expiry and dispel generate distinct
// removal events and when the puddle is spawned.
//
// Bloodvenom Injection (1284487): large physical tank hit plus a stacking
// Shadow DoT. Plan mitigation as stacks rise and account for a delayed pool
// when the tank debuff expires, potentially after the intermission. The tank
// swaps bosses after Stasis; a high stack or death is not independently a
// player error without a verified expected swap window.
//
// -- VITRIOLIC STASIS / HELICAL TOXINS --------------------------------------
//
// Vitriolic Stasis (1284588) starts at 100 energy: about 30 seconds of 99%
// boss damage reduction, boss convergence, and healing of the weaker boss to
// the stronger boss's health. Do not score low damage during Stasis as poor
// play; the effective DPS loss was created by unequal HP before the phase.
//
// Helical Toxins (1284590): every player receives a 1-, 2-, or 3-application
// assignment. Collision combines toxin strength; exactly four clears it
// harmlessly. Thus 1 pairs with 3 and 2 pairs with 2. On Mythic, the visible
// count quickly disappears, so players must remember it or use the raid frame.
// One practical call: 3s hold still/ping, 1s seek a 3, and 2s meet in an open
// central area. Wrong combinations, especially a sum above four, can kill;
// an unresolved toxin expires into Cultivated Burst (1284941) with severe
// damage and lasting consequences. Pairing must finish before the roughly
// 28-second debuff expiry. A correct detector needs initial stack counts,
// collision/removal ordering, and a way to distinguish successful clears from
// death-stripped auras. Cultivated Burst is a strong failure signal, while
// Stasis healing and Helical Toxins application are normal phase events.
//
// -- FUTURE DETECTION / VALIDATION CHECKLIST --------------------------------
//
// Gate this model to Mythic Entombed Sentinels. Identify both bosses by each
// report's actor IDs/names, never stable numeric actor IDs. Separate repeated
// main phases with the 1284588 Stasis windows rather than assuming one fixed
// timestamp. Verify these candidate spell IDs against Mythic FFLogs:
//
//   Strong failure candidates: Protovenom Eruption, Noxious Blast, an
//   unpaired Helical Toxins -> Cultivated Burst, Living Venom hits, and a
//   thin Unstable Miasma soak if its damage/targets expose the soak count.
//   Context or normal damage: marks, Protovenom application, intentional
//   Toxic Droplet pickup, Contaminate ticks, planned Miasma soak, tank hits,
//   Stasis, and toxin applications/removals.
//
// Also confirm which events reveal orb spawn versus pickup, green slime spawn
// versus death, puddle placement, the 1/2/3 toxin count, and both bosses'
// health at Stasis entry. Correlate simultaneous damage events into one raid
// error where appropriate. Account for immunities, deaths, logging gaps, and
// partial pulls; return unknown when the required signal is absent. Player
// assignments and puddle locations are strategy choices, not absolute rules.
