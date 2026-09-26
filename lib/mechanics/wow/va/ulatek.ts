// lib/mechanics/wow/va/ulatek.ts
//
// Mythic Ula'tek (The Venomous Abyss): research model for later combat-log
// detection. There is deliberately no detector here. Spell IDs below are
// journal/guide LINK CANDIDATES, not combat-log-verified event IDs. Confirm
// variants, actor GUIDs, aura behavior, and timings against a current Mythic
// report before turning any observation into a rule.
//
// Sources checked 2026-09-26:
//   Blizzard hotfix history through September 24 (current tuning and fixes):
//   https://us.forums.blizzard.com/en/wow/t/world-of-warcraft-midnight-hotfixes-september-24/2336376
//   Blizzard September 15 Venomous Abyss raid tuning:
//   https://us.forums.blizzard.com/en/wow/t/the-venomous-abyss-raid-tuning-september-15/2349528
//   Wowhead's encounter-journal transcription, especially its Mythic branches:
//   https://www.wowhead.com/guide/midnight/raids/venomous-abyss-ulatek-boss-strategy-abilities
//   Project One strategy, used ONLY for the shared phase order and broad plan:
//   https://www.project-one.fun/en/guide/ulatek
//   Its illustrated kill/timeline is Heroic, so neither its numeric timings
//   nor its soaker counts establish Mythic behavior.
//
// -- CURRENT-PATCH GUARDRAILS -----------------------------------------------
//
// September 15 changed Mythic Stage 1 Serpent's Call from 13 to 8 eggs PER
// wave, Stage 2 from 14 to 12 eggs PER SIDE, and intermission Serpent's Call
// from 14 to 8 eggs (the note does not specify "per side" there). Mythic
// Putrid Membrane now lasts 30s, not the 1h still printed in the journal.
// Stone Venom was reduced September 15 and another 40% with the September 21
// weekly restart. A September 21 fix restored Stone Venom damage to players
// far from Ula'tek. Do not set damage thresholds from older reports.
//
// September 2 reduced Mythic Soul Constrictor to 5s and Blight Vein damage
// by 25%. Earlier fixes removed occasional extra Blight Vein/Toxic Burn
// damage; another corrected Blight Vein stack scaling on Mythic. August 25
// made Calcified Corpse radiate massive raid damage on Heroic/Mythic, fixed
// an erroneous extra Stone Venom stack, and lowered Serpent's Bite's soak
// requirement. The 5s Malice cast and fixed three Grasping Fangs targets per
// side in other hotfixes apply to Raid Finder/Heroic, NOT Mythic. September 3
// removed the possibility of swimming under Caustic Waves. Boiling Venom's
// September 21 change was UI emphasis, not a new Mythic ability.
//
// -- FIGHT SHAPE / ROUGH CHRONOLOGY -----------------------------------------
//
// 1. Stage One, Fury of the Serpent Mother: Ula'tek and Gore Rattle (tail)
//    share health. Keep a tank in melee of each. Handle center eggs and later
//    Serpent's Call waves: first break Hardened shields, then carry eggs
//    separately away from venom and shatter them with staffed Spectral Coil
//    impacts. Kill resulting Rawlings before Boiling Venom. Dodge boss/tail
//    Caustic Waves. Mythic adds a falling Wretch and four Toxic Incubation
//    shots to intercept. Mother's Wrath requires a tank in range. The stage
//    ends with Rage of the Shackled and a Venomous Heart damage window.
// 2. Stage Two, Children of the Doomscale: the raid divides across two side
//    platforms. Each group kills a Doomscale Warden, interrupts Malice,
//    staggers Grasping Fangs breaks, and destroys clutches created by Shadow
//    Molt / Writhing Gestation. After the Warden dies, remove small eggs
//    before touching that side's Doomscale Egg. Carry the big egg to its
//    cauldron within its pickup timer. This produces a Weakened Doomscale;
//    kill both near together because Mythic Revenge empowers the survivor.
//    A second Rage/Heart exposure follows.
// 3. The Shattering intermission: more eggs fall; players arrange protected
//    carries and alternate Spectral Coil mitigation groups while destroying
//    eggs and Rawlings. Soul Constrictor and Necrotic Vapors continue. The
//    arena then breaks into smaller platforms.
// 4. Stage Three, Ula'tek's Ascension: handle Slithering Clutches, Shriekers,
//    Wretches, and eggs as safe space shrinks. Helpers leech Serpent's Bite
//    before it expires, then spread their Volatile Purges; on Mythic each
//    purging player also originates Caustic Waves. Dodge boss waves and
//    leave the platform targeted by Circling Prey. Rage exposes the Heart
//    again; Fury Unleashed is the terminal raid-damage enrage.
//
// Stage durations, exact health pushes, egg routes, quadrant order, and
// personal assignments need a Mythic log. Guide timestamps are Heroic.
// Identify phase boundaries from casts/actors/platform events; health
// backstops and past transition bugs make rigid clock windows unreliable.
//
// -- EGGS: THE ENCOUNTER'S CENTRAL STATE MACHINE ---------------------------
//
// Blightscale Spawn eggs can either BREAK into a manageable Blightscale
// Rawling or HATCH into a much more dangerous Blightscale Viper. Hatching can
// follow gestation expiry, contact with venom/Caustic Waves, a carrier
// collision, or later loss of safe platform. A broken egg is not the same
// outcome as a hatched egg. Track each egg by GUID if possible: spawn,
// Hardened shield, pickup/carrier, break/cauldron, hatch, and resulting add.
// A damage-to-zero break is another possible outcome after the shield is
// removed; Coil is the planned Stage 1/intermission way to break carried
// eggs. Do not equate every egg despawn with success.
//
// Mythic Hardened (1299650) is a ~4.6m damage absorb on a new Blightscale
// Spawn. The egg cannot be moved until that absorb is broken. Picking it up
// gives Noxious Shell (1307612): periodic carrier damage, and carriers who
// come within 3 yards of EACH OTHER cause Noxious Splash (1307635), an
// immediate hatch plus heavy carrier damage/DoT. Once the shell is removed,
// Rancid Yolk (1312150) increases subsequent Noxious Shell damage by 200%
// for 20s. The solution is assigned shield breaks, separated carrier lanes,
// prompt egg disposal, and rotation away from players with Rancid Yolk.
// Multiple pickup records from one egg were a fixed bug; log verification
// should still deduplicate by egg/carrier transition.
//
// Each hatched Viper applies raid-wide Putrid Membrane (1301268), currently
// 30s on Mythic, and attacks with Acidic Burst and Petrifying Sting. Sting
// affects players within 10 yards of its target with a healing absorb and
// damage; spread and prioritize a Viper that escaped. A broken Rawling uses
// stacking Poisonous Bite; on Mythic its Boiling Venom (1313757) starts at
// about 25s alive, doubling haste and damage and enabling Acidic Expulsion
// (1313531), a long raid DoT. Breaking eggs correctly creates an add-clear
// obligation, not an immediately clean state. A pile of simultaneous
// Rawlings is dangerous if it lives through the 25s limit.
//
// Caustic Waves (1292403) deal impact damage and a stacking DoT to players
// in their path and INSTANTLY hatch eggs they cross. They can come from
// Ula'tek, Gore Rattle, a Toxic Incubation interception target, and in Stage
// Three from each Mythic Volatile Purge expiry. For detection, infer origin
// from the parent cast/aura and stage where possible; egg hatching during a
// deliberate interception wave is still a positioning failure. Do not use
// post-hotfix underwater movement as a valid avoidance assumption.
//
// -- STAGE ONE: TANKS, COILS, WRETCH ----------------------------------------
//
// Ula'tek's Bond (1302505) shares damage among boss, tail, and Heart.
// Damage to multiple active components is useful. If Ula'tek cannot melee
// when she is not casting/channeling, Unchecked Rage (1286945) hits the
// raid; if Gore Rattle lacks a melee target, Rattler Slam (1299206) does
// likewise. Keep one tank engaged at each, including around movement and
// wave casts. Gore Rattle's Mephitic Thrash has a strong <=35-yard hit and
// knockback, with a different outside-35-yard hit and DoT; the distant band
// is not a generic safe zone.
//
// Mother's Wrath (1298367) knocks back/marks the boss's current tank, then
// bites targets in melee reach during its ~3s window. The bite applies
// stacking Stone Venom (1298417, ~1.7m) and Hobbled (1300938, 55% slow).
// If the tank is OUT of reach, the effect hits the entire raid. Plan a tank
// swap and stay in reach after knockback; raid-wide Stone Venom is a strong
// missed-soak signal. Do not infer a miss merely from one tank's stacks.
// Sustained Necrotic Vapors (1286834) is unavoidable stacking background
// damage and should not be labeled as a player mistake by itself.
//
// Spectral Coils (1287265) impact a 10-yard zone and deal raid-wide damage
// reduced by eligible players in that zone. Blizzard now says 40% of the
// raid must participate for MINIMUM damage (about eight of 20 players),
// rather than declaring every smaller group an automatic wipe. Mythic Soul
// Constrictor (1300685, currently 5s) prevents a recent mitigator from
// contributing to the next Coil. Use alternating eligible groups, arrange
// egg carriers in the impact to shatter held eggs, then kill the Rawlings.
// Evaluate actual eligible soakers per impact and resulting damage; standing
// in the circle while constricted is not effective mitigation. A Coil that
// breaks eggs is expected; its own raid damage is expected as well.
//
// Call of the Serpent (1304012 candidate for Stage One) drops new eggs; as
// of September 15 the Mythic count is eight per wave. Egg impacts hurt
// within 4 yards. Do not assume the Heroic guide's initial or second wave
// timing holds in Mythic. Boss and tail waves can overlap carrier routes;
// teams keep those routes clear until a Coil/break window.
//
// Mythic Toxic Womb (1310738) drops a Blightscale Wretch, hurting players
// within 7 yards of impact. It awakens after about 20s. If it lives ~30s,
// Boiling Venom doubles its haste/damage. Fester Burst (1310763) hits players
// FARTHER than 10 yards from the Wretch, with a follow-up DoT; a close group
// or killing the Wretch before the cast is preferable to blindly spreading.
// Toxic Incubation (1299757) then sends four one-second venom impacts from a
// spectral Ula'tek toward that Wretch. An unintercepted impact gives the
// Wretch Mother's Boon: per stack -10% damage taken and +15% damage done.
// A player can intercept instead, taking stacking Toxic Burn (1302842).
// EVERY impact also launches Caustic Waves from its target, so interceptors
// must position the new wave origin away from eggs and other players. Audit
// four shots individually; interception damage/Burn is the intended cost,
// while Boon stacks and bad wave paths are distinct failure modes.
//
// Rage of the Shackled (1286860) is a ~20s raid-damage window with Falling
// Debris (1286885; dodge 7-yard impacts). Venomous Heart (1299526) appears
// and takes +200% damage, i.e. THREE TIMES baseline damage to that target;
// older guides loosely call this "double." Focus Heart while cleaving shared
// health and surviving ongoing raid damage. The first such window leads to
// the Stage Two split; another follows Stage Two and one may occur late in
// Stage Three. Count the actual cast/Heart GUIDs in a Mythic log.
//
// -- STAGE TWO: TWO WARDENS, TWO CAULDRONS ----------------------------------
//
// The raid divides into left/right groups. Current Mythic setup has 12
// Blightscale Spawn per side. Each Doomscale Warden's Protection (1306858)
// makes nearby eggs untouchable and pulses damage within 7 yards until the
// Warden dies. The Warden's Malice (1290779) is a dangerous raid channel;
// interrupt it. Virulent Spit (1302982) targets several impact locations;
// avoid the 4-yard circles. Crossing the venom to these platforms has had
// targeting protections added, so older Virulent Spit clips need context.
//
// Grasping Fangs (1301117) tether/slows targets until they move far enough
// to break it. On Mythic EACH break applies Blight Vein (1311609), a 6s,
// stacking, raid-wide DoT. Breaking multiple tethers at once stacks the
// damage; coordinate breaks and heal through each. The journal's other
// Blight Vein variant is for lower difficulties and should not be used for
// Mythic detection. Shadow Molt (1301213) moves the Warden; Writhing
// Gestation (1290990) turns nearby eggs into Blightscale Clutches (1289962)
// that hatch after ~20s unless destroyed. Break/kill activated clutches
// promptly while finishing the Warden. An early Shadow Molt no longer
// resets the Warden's spell schedule, so don't predict the next cast solely
// by spacing from a previous movement.
//
// After Warden's Protection ends, collect/resolve ALL reachable small eggs
// on that side before disturbing its Doomscale Egg. Mass Gestation (1308038)
// on the big egg activates Writhing Gestation on every remaining small egg
// on the same side. A Doomscale Egg also has an untouched hatch timer; once
// picked up, Doomscale Shell (1300312) gives only ~20s to deliver it to the
// Doomscale Cauldron (1313355). Verify the untouched timer in Mythic logs
// rather than importing the Heroic guide's 90s. A failed big-egg route
// hatches a Ravenous Doomscale whose Dread Roar (1305775) stuns and heavily
// damages the raid. Cauldron delivery instead produces a Weakened Doomscale
// (Defect: Weakened, 1303410), taking +100% damage and unable to Dread Roar.
// It still needs Anguished Cry (1305650) interrupts and its Desperate Thrash
// (1305709) cone kept off the group.
//
// Mythic Revenge (1307941): when one Weakened Doomscale dies, its clutchmate
// gains +100% haste and damage. Coordinate health across the two sides and
// kill them close together, or prepare to handle the empowered survivor.
// Don't treat a single side's add death as the end of the stage. After the
// progeny are cleared, Rage of the Shackled exposes the Heart a second time.
//
// -- THE SHATTERING INTERMISSION --------------------------------------------
//
// Serpent's Call drops eight eggs on current Mythic (September 15 wording).
// Clear Hardened shields, assign separated carriers, and shatter eggs with
// Spectral Coils while rotating around 5s Soul Constrictor. Kill Rawlings
// before Boiling Venom/Acidic Expulsion and maintain healing against
// Necrotic Vapors and Coil damage. The sequence ends when Ula'tek shatters
// the arena into the smaller Stage Three platforms. Model Coil impacts,
// constrictor applications, and egg outcomes from events; do not assume a
// fixed count of soaks or duration from the Heroic strategy.
//
// -- STAGE THREE: SHRINKING ARENA AND PLAYER-ORIGIN WAVES -------------------
//
// Call of the Serpent (1300751 candidate here) creates Slithering Clutches,
// which MOVE toward venom. Damage/break them before they reach it or finish
// gestating. Rawlings retain Mythic Boiling Venom at ~25s. Blightscale
// Shriekers can also spawn; their Vicious Echoes (1310764) stuns/damages
// players, and after ~30s their Boiling Venom (1315342) doubles haste/damage
// and enables Acidic Expulsion (1313531). A hatched Viper remains costly
// through Putrid Membrane, Acidic Burst, and Petrifying Sting. Toxic Womb
// and Toxic Incubation can repeat: use the same four-shot interception plan
// while considering much less safe floor for the resulting waves.
//
// Serpent's Bite (1295905) marks several players for ~15s. Nearby helpers
// within 7 yards leech enough venom to remove the Bite; each helper then
// receives Volatile Purge (1306086). An unresolved Bite creates Calcified
// Corpse (1306119), which stuns and damages through immunities and, after
// August 25, radiates massive raid damage on Mythic. The exact count of
// targets/helpers and completion threshold need log validation. Volatile
// Purge expires about 5s later and hits players within 7 yards. On MYTHIC,
// Caustic Waves also erupt from EACH purging player. Helpers save the Bite
// target, then spread and aim their wave origins away from the raid, eggs,
// and the next travel path. Overlapping Bite soaks can be a strategy but
// cannot excuse Purge overlaps or resulting egg hatches.
//
// Ula'tek also casts Caustic Waves from her own location. Circling Prey
// (1301510) destroys the occupied portion of platform: players within
// 13 yards take much heavier damage and a knockback; those outside still
// take lesser damage. Evacuate to another safe quadrant before the platform
// falls, then re-engage while controlling adds and new eggs. Loss of a safe
// platform can force an egg into venom, making an otherwise harmless egg
// state become a Viper. Mother's Wrath/Stone Venom tank coverage, the Heart
// exposure, and unavoidable Necrotic Vapors continue. Fury Unleashed
// (1286905) is the final rapidly ticking raid-damage enrage.
//
// -- LOG INTERPRETATION / FUTURE DETECTION ----------------------------------
//
// Highest-confidence candidate failures: Noxious Splash from two carriers
// meeting; an egg hatching into a Viper plus Putrid Membrane; Wretch gaining
// Mother's Boon from an unintercepted Incubation shot; raid-wide Stone
// Venom from a missed Mother's Wrath; an unmitigated/understaffed Coil;
// Malice or Anguished Cry finishing; Mass Gestation on uncleared small eggs;
// Ravenous Doomscale/Dread Roar; Calcified Corpse; Volatile Purge overlap
// or purge-origin waves hatching eggs; add survival into Boiling Venom;
// and failure to leave Circling Prey's doomed platform. Separate causes
// from effects: Putrid Membrane is an egg-hatch consequence, Blight Vein is
// the expected tether-break cost, and Toxic Burn is the expected successful
// interception cost.
//
// Required Mythic-log checks before implementation: encounter/difficulty
// ID; all cast/aura/damage ID variants; whether eggs/clutches/cauldrons log
// as units, summons, or environment objects; per-egg carrier correlation;
// which Coil events actually mitigate and shatter eggs; source/origin for
// four categories of Caustic Waves; Wretch shot target and Boon stack
// semantics; stage transitions/Heart GUIDs; Warden and Doomscale pairing;
// Revenge recipients; actual Bite soak threshold and purge-wave geometry;
// and what remains observable when an egg is destroyed by platform loss.
// If positions or direct pickup events are absent, report uncertain egg
// attribution instead of fabricating an individual carrier error.
