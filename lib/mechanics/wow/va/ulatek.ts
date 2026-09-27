// lib/mechanics/wow/va/ulatek.ts
//
// Mythic Ula'tek (The Venomous Abyss) — per-pull error detection. Called
// from transformFightToPull in lib/log-transforms.ts; it self-gates on this
// encounter's debuff IDs, so it is safe on any WoW pull.
//
// The second half of this header is the guide-derived encounter model
// (written 2026-09-26 before any log was available). The first half is what
// the log actually showed; where the two disagree, the log section wins.
//
// ── VERIFIED AGAINST LOGS (offsets fight-relative) ──────────────────────────
//
//   Report JZp82Rm7TzycM94a: 25 pulls, the kill in pull 25 (+598.6). Pulls
//   1-20 and the kill were fetched first; 21-24 hit the WCL rate limit.
//
// The clock is fixed to the tenth of a second in every pull (the kill):
//   Stage 1: Toxic Womb +3/+72, Call of the Serpent (1304012) +5/+75 (8
//   eggs land +10/+80), Toxic Incubation +15/+84, Mother's Wrath +27/+97,
//   Gore Rattle Spectral Coils +33/+127 -> impacts +40.5/+43.5 and
//   +134.5/+137.5, Ula'tek + Gore Rattle Caustic Waves +56/+113, Rage of
//   the Shackled + Venomous Heart +145.5 (20s).
//   Stage 2: four Doomscale Eggs begin Hatching Doom +174.2 (never
//   completed), Shadow Molt +181, Writhing Gestation +185, Malice +186,
//   Grasping Fangs +198, Doomscale Shell carries +251-275, four Weakened
//   Doomscales +270-275, Anguished Cry every ~16s, second Rage +294.5.
//   Intermission: Call (1315541) +323, 8 Coil impacts +336-355.
//   Stage 3: Call (1300751) +381/+411/+509 (Slithering Clutches), Mother's
//   Wrath +387/+472/+540, Serpent's Bite +402/+466/+570, Ula'tek Caustic
//   Waves (1292211) +427/+482/+532/+576, Circling Prey +440/+491/+552,
//   Shriekers' Acidic Expulsion ~+519, third Rage +583.7, and the hard
//   enrage Fury Unleashed at +608.8 (P13, P17, P18; Berserk buff +611).
//
// EGGS. Blightscale Spawn actors (Hardened absorb 4.6M) land 8 per stage-1
// wave and 8 in the intermission; each Coil impact shatters the eggs in it
// into Rawlings (stage 1: 6 + 2 per pair; intermission 1-3 per impact).
// Carriers hold Noxious Shell (1307612), then Rancid Yolk (1312150). A hatch
// is visible only as Putrid Membrane (1301268) on the whole raid (16-20
// players); the Viper actor appears ~3.5s later. The kill had NO hatches.
// Causes, from the carrier's events at the hatch millisecond:
//   - Caustic Waves on a carrier (Noxious Shell removed at the hit): the
//     stage-1 wave-2 danger window, Ula'tek's +113 waves reach carriers at
//     +117-129 (P1 +121.3, P6 +117.2, P10 +118.9/+122.6, P15 +121.0/+128.9).
//   - Noxious Splash (1307635) on two carriers (P1 +132.5, P10 +128.0).
//   - The carrier dying (P8 +342.5/+344.5 to Coils, P14 +244.1 to Noxious
//     Shell ticks, and the Unchecked Rage deaths of collapsing pulls).
//   - No carrier event: P3 +413.9 a Slithering Clutch hatched 1.7s after
//     spawning (its gestation buff 1313754 dropped at that instant); P19
//     +379.9 unexplained, at the intermission -> stage 3 platform break.
// Every stage-1 hatch was followed by the wipe within 14-46s.
//
// RAWLINGS carry a Boiling Venom countdown (1313758) from spawn; at ~24-25s
// it becomes the enraged 1313757 (11 Rawlings in the kill, harmless). A
// Rawling casting Acidic Expulsion (1313531) happened only in wipes (P2
// +561, P4 +288.9, P8 +379.8, P16 +233.3). SHRIEKERS: both cast Acidic
// Expulsion once at ~+519 in every stage-3 pull, the kill included; a
// second cast (P2 +551.3, which killed 3; P3 +552.2) means one lived on.
//
// SPECTRAL COILS hit all 20 players every impact (1287265, ~250-430k
// median). Mitigators are the Soul Constrictor (1300685) recipients: stage
// 1 impacts 9-10 (worst clean 7, P7 +137.6), intermission 5-8 alternating
// (worst clean 5: P8, P11, P19). Under-soaks were 0-3 (P20 +336.3 3, +338.8
// 3, then 0-1). Lethal impacts with normal soaks also happened: P11 +355.1
// (5 soakers, 6 dead), P8 +355.0 (1 soaker, 4 dead).
//
// SERPENT'S BITE: 3 targets (debuff 1288879, hit 1295838); helpers get
// Ingested Venom (1313529), one application per Bite target they stand by,
// all at the Bite millisecond. Resolved Bites had 4 helpers (cleared at
// 14s) or 5 (cleared at 11s). P5 +570.7 had 3 helpers: the Bite expired at
// 15s and all three targets calcified. A target dying also calcifies (P2
// +570.7, P3 +570.0 — P3's player died as the Bite went out). Calcified
// Corpse (1306119) then pulses 1318329 on the raid ~1.1s later, 300-900k
// each: 15-17 dead. The corpse was a wipe every time.
// VOLATILE PURGE: the helpers get 1312967 when the Bite clears, explode 5s
// later (1305878, ~1.0-1.2M on themselves; 200-500k with a defensive),
// then a DoT (1316356/1316357). One helper died to it in the kill (+421.8)
// and in P3, P12, P17, P18. Tanks overlap each other's purge in most pulls
// (the kill too); no bystander without a purge was ever hit.
//
// MOTHER'S WRATH (1298367) bit only its tank in every cast (9 hits of
// 1298369, Stone Venom 1298417) until the tanks were gone: then Stone
// Venom landed on 7-10 players with the raid version 1301122 (P12 +540.2
// with both tanks dead, 9 killed; P19 +387.2 with both alive but out of
// reach during a collapse, 6 killed). Unchecked Rage (1301007) only ever
// followed tank deaths. TOXIC INCUBATION: every cast put 5 hits (1299919)
// on one interceptor; Mother's Boon never appears in the ability table.
//
// STAGE 2. Grasping Fangs tethers 6 players (1311611); every clean pull
// broke one at ~+206 and the other five together at +213-215, peaking at 5
// Blight Vein stacks (1311609, ticks 1317955) with no deaths. P16: two
// tethered players died to Fangs (1311612) at +211.0/+212.8 and the last
// broke at +220.0 -> 6 stacks, 12 dead. Four fixed players carried the four
// Doomscale Eggs (Doomscale Shell 1300312, 15-19s) in every pull, never
// failed. The Weakened Doomscales died 2.1s apart in the kill and 3-11s
// apart in wipes; Revenge (1307941) went on the survivors at the first
// death, with no visible consequence. Malice was kicked in every pull but
// P16 (+236.1); Anguished Cry completed only in P9 (+331.1, twice).
// Desperate Thrash hits only tanks in clean pulls.
//
// Circling Prey (1301510) hits all 20: outside 13yd peaked ~500k, inside
// 0.7-1.2M. Falling Debris (1286885) hits are 0.5-1.6M, a few per pull
// (the kill: 3 on a tank). Fester Burst hit one player per cast in clean
// pulls; P18 +70.6 hit 9. Deadly Venom (arena edge) ticks ~70-100k and is
// routine (17 applications in the kill); only deaths are flagged.
//
// Pulls that reach 7 dead end within 28s, except P2 (13 players fought on
// for 90s in stage 3) — the collapse marker also needs the pull to end
// within 45s. No deaths without a killing blow were logged.
//
// Wipe survey (the earliest Raid error of each wipe):
//   Viper hatch          P1 +121.3, P6 +117.2, P10 +118.9, P15 +121.0 (all
//                        a carrier in Caustic Waves), P19 +379.9 (no carrier)
//   Calcified Corpse     P3 +570.0 (target died), P5 +585.7 (3 helpers)
//   Spectral Coils       P8 +355.0, P11 +355.1, P20 +338.8
//   Blight Vein          P16 +220.6
//   Shrieker 2nd Expel   P2 +551.3
//   Tank died            P4 +286.0, P7 +174.0 (Falling Debris), P12 +526.1,
//                        P13 +588.8 and P18 +590.0 (both then enraged)
//   7 dead               P9 +318.2 (second Rage), P14 +247.1 (a carrier
//                        died with an egg at +244.1), P17 +588.8 (enraged)
//
// Not flagged (volume or no evidence of error): Necrotic Vapors (constant),
// Mephitic Thrash (~40 hits per cast), Noxious Shell ticks on carriers,
// Warden's Protection pulses, Poisonous Bite, Acidic Burst/Petrifying
// Sting, Toxic Burn on interceptors, Blight Vein at <=5 stacks, the
// Weakened Doomscale death spread, Unchecked Rage (always tank-death
// fallout), Deadly Venom ticks that didn't kill.
//
// ── RULES IMPLEMENTED ────────────────────────────────────────────────────────
//
//   wow-ula-egg-hatch        Minor/Major/Raid  a Viper hatched; blames the
//                                              carrier(s) in Caustic Waves
//                                              or Noxious Splash, else
//                                              player-less
//   wow-ula-caustic-waves    Minor/Major  hit by Caustic Waves (tanks too)
//   wow-ula-spectral-coils   Minor/Raid   <=3 mitigators, or 3+ Coil deaths
//   wow-ula-calcified-corpse Raid         a Serpent's Bite calcified
//   wow-ula-volatile-purge   Minor/Major  died to own purge; non-tank overlap
//   wow-ula-mothers-wrath    Minor/Raid   Stone Venom on 4+ players
//   wow-ula-blight-vein      Major/Raid   died tethered; 3+ Blight Vein deaths
//   wow-ula-add-cast         Minor/Raid   Malice / Anguished Cry / Hatching
//                                        Doom completed, a Rawling's Acidic
//                                        Expulsion, a Shrieker's second one
//   wow-ula-avoidable        Minor/Major  Falling Debris, Virulent Spit,
//                                        Desperate Thrash (non-tanks), heavy
//                                        Circling Prey, Fester Burst (3+ hit),
//                                        deaths to Deadly Venom
//   wow-ula-enrage           Raid         Fury Unleashed
//   wow-ula-pull-over        Raid         7 dead / tank death / called wipe
//
// ── GUIDE-DERIVED MODEL (pre-log) ────────────────────────────────────────────
//
// Guide- and journal-derived encounter model. Linked spell IDs are
// CANDIDATES — the verified section above takes precedence.
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

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import { suppressDuplicateRaidErrors } from "../../../error-detection";
import {
  kFmt, sec, joinNames, playerError, lastPlayerEventMs, clusterByGap, deadAt,
  landed, total, died, deathsBy, applied, removed, near, raidMarker, playerlessMinor,
  pullOverMarker, calledWipe,
} from "../common";

// ─── Ability IDs (log-verified, report JZp82Rm7TzycM94a) ────────────────────

const NOXIOUS_SHELL       = 1307612; // egg-carrier debuff
const NOXIOUS_SPLASH      = 1307635; // two carriers within 3yd
const RANCID_YOLK         = 1312150; // after a carry
const PUTRID_MEMBRANE     = 1301268; // raid debuff = an egg hatched into a Viper
const CAUSTIC_WAVES       = 1292403; // player debuff + damage
const SOUL_CONSTRICTOR    = 1300685; // one per player who mitigated a Coil impact
const COIL_IMPACT         = 1299010; // Spectral Coil cast at each impact
const COIL_DAMAGE         = 1287265;
const STONE_VENOM         = 1298417;
const MOTHERS_WRATH       = 1298367; // cast
const MW_HITS             = [1298369, 1301122]; // tank bite / raid-wide version
const BITE_DEBUFF         = 1288879; // Serpent's Bite on its 3 targets
const INGESTED_VENOM      = 1313529; // a helper leeching a Bite
const CALCIFIED_CORPSE    = 1306119;
const CORPSE_PULSE        = 1318329; // the corpse's raid-wide hit
const VOLATILE_PURGE      = 1312967; // helper's 5s debuff after a Bite
const PURGE_HIT           = 1305878;
const PURGE_DOT           = 1316357;
const CIRCLING_PREY       = 1301510;
const GRASPING_FANGS      = 1311611; // tether debuff
const FANGS_DAMAGE        = 1311612;
const BLIGHT_VEIN_IDS     = [1311609, 1317955];
const MALICE              = 1290779;
const ANGUISHED_CRY       = 1305650;
const HATCHING_DOOM       = 1306862;
const ACIDIC_EXPULSION    = 1313531;
const SLITHERING_GESTATION = 1313754;
const FURY_UNLEASHED      = [1286905, 1295004];
const FALLING_DEBRIS      = 1286885;
const VIRULENT_SPIT       = 1302982;
const DESPERATE_THRASH    = 1305709;
const FESTER_BURST        = 1310763;
const DEADLY_VENOM        = 1297338;
const VIPER_IDS           = [1308275, 1301800, 1303414]; // Membrane tick, Acidic Burst, Petrifying Sting

const ULATEK_SIGNATURE = new Set([NOXIOUS_SHELL, SOUL_CONSTRICTOR, STONE_VENOM, RANCID_YOLK]);

// ─── Thresholds (evidence in the header; P = pull of JZp82Rm7TzycM94a) ──────

const HATCH_MIN_PLAYERS = 5;       // a hatch puts Membrane on the whole raid (16-20)
const HATCH_CAUSE_MS = 600;        // carrier events around the hatch millisecond
const HATCH_WIPE_MS = 50000;       // P6 hatch +117.2, pull over +163.0 (45.8s)
const HATCH_WIPE_DEATHS = 5;
const HATCH_FALLOUT_MS = 30000;
const COIL_UNDERSOAK = 3;          // clean min 5 (intermission), 7 (stage 1); failures 0-3
const COIL_MIN_ALIVE = 12;         // skip impacts after the raid already collapsed
const BITE_HELPERS = 4;            // every resolved Bite had 4-5; P5 +570.7 had 3
const PREY_HEAVY = 600_000;        // outside 13yd peaks ~500k; inside 0.7-1.2M
const RAID_DEATHS = 3;
const HIT_DEATH_MS = 1500;
const EPISODE_MS = 3000;
const STONE_RAID_MIN = 4;          // the tank alone gets Stone Venom normally
const FESTER_GROUP = 3;            // the kill: 1 player per Fester Burst; P18 +70.6: 9
const COLLAPSE_DEAD = 7;
const COLLAPSE_END_MS = 45000;     // P2 fought on 90s with 7 dead in stage 3; others ended within 28s
const TANK_REZ_GRACE_MS = 15000;
const TANK_DEATH_END_MS = 30000;
const CALLED_WIPE_DEATHS = 4;
const CALLED_WIPE_WINDOW_MS = 10000;

// ─── Eggs hatching into Vipers ───────────────────────────────────────────────
//
// A hatch shows only as Putrid Membrane landing on the whole raid (the Viper
// actor appears ~3.5s later). The cause is whatever happened to a carrier at
// that millisecond: Noxious Splash (two carriers met), a Caustic Waves hit
// on a carrier, or the carrier dying with the egg. With no carrier event it
// was an unattended egg or a Slithering Clutch reaching the venom.

export const ULA_HATCH_RULE_ID = "wow-ula-egg-hatch";

type HatchBlame = { player: string; t: number };

function detectHatches(
  players: PlayerInfo[], deaths: DeathEvent[], enemyBuffRemovals: EnemyEvent[], pullEnd: number, blamed: HatchBlame[]
): PullError[] {
  const events = players.flatMap((p) => p.debuffs
    .filter((e) => e.abilityId === PUTRID_MEMBRANE && (e.debuffStatus === "applied" || e.debuffStatus === "stack"))
    .map((e) => ({ p, t: e.timestamp })));
  const bursts = clusterByGap(events, (x) => x.t, 1000)
    .filter((g) => new Set(g.map((x) => x.p.name)).size >= HATCH_MIN_PLAYERS);

  const errors: PullError[] = [];
  let wipeMarked = false;
  for (const g of bursts) {
    const t = g[0].t;
    const W = HATCH_CAUSE_MS;
    const splash = players.filter((p) => p.damageTaken.some((e) => e.abilityId === NOXIOUS_SPLASH && Math.abs(e.timestamp - t) <= W));
    const carriers = players.filter((p) => removed(p, NOXIOUS_SHELL).some(near(t, W)));
    const deathOf = (p: PlayerInfo) => deaths.find((d) => d.player === p.name && Math.abs(d.timestamp - t) <= 400);
    const waved = carriers.filter((p) => !splash.includes(p) &&
      p.damageTaken.some((e) => e.abilityId === CAUSTIC_WAVES && Math.abs(e.timestamp - t) <= 300));
    const fellWith = carriers.filter((p) => !splash.includes(p) && !waved.includes(p) && deathOf(p));
    const clutch = enemyBuffRemovals.find((e) => e.abilityId === SLITHERING_GESTATION && Math.abs(e.timestamp - t) <= 300);

    const after = deaths.filter((d) => d.timestamp > t - 100 && d.timestamp <= pullEnd);
    const viperDeaths = deathsBy(deaths, [...VIPER_IDS, PUTRID_MEMBRANE, NOXIOUS_SPLASH], t, t + HATCH_FALLOUT_MS);
    const wipe = !wipeMarked && pullEnd - t <= HATCH_WIPE_MS && after.length >= HATCH_WIPE_DEATHS;
    const blameable = splash.length > 0 || waved.length > 0;
    const consequence = wipe || viperDeaths.length > 0;
    const fallout = viperDeaths.length ? `; ${viperDeaths.length} died to the Viper/Membrane within 30s` : "";

    if (splash.length) {
      for (const p of splash) {
        const others = splash.filter((o) => o !== p).map((o) => o.name);
        const d = deathOf(p);
        blamed.push({ player: p.name, t });
        errors.push(playerError(p, {
          ruleId: ULA_HATCH_RULE_ID, severity: consequence || d ? "Major" : "Minor", name: "Egg Carriers Collided",
          description: `Carried an egg within 3yd of another carrier${others.length ? ` (${joinNames(others)})` : ""}: ` +
            `Noxious Splash hatched it into a Viper${d ? ` and killed them` : ""}${fallout}.`,
          timestamp: t, abilityId: NOXIOUS_SPLASH, abilityName: "Noxious Splash",
        }));
      }
    } else if (waved.length) {
      for (const p of waved) {
        const d = deathOf(p);
        blamed.push({ player: p.name, t });
        errors.push(playerError(p, {
          ruleId: ULA_HATCH_RULE_ID, severity: consequence || d ? "Major" : "Minor", name: "Egg Hatched in Caustic Waves",
          description: `Was hit by Caustic Waves while carrying an egg, which hatched into a Viper` +
            `${d ? ` (they died to the wave)` : ""}${fallout}.`,
          timestamp: t, abilityId: CAUSTIC_WAVES, abilityName: "Caustic Waves",
        }));
      }
    } else {
      const why = fellWith.length
        ? `${joinNames(fellWith.map((p) => `${p.name} (${deathOf(p)!.cause})`))} died carrying an egg, which hatched into a Viper`
        : clutch
          ? "A Slithering Clutch hatched into a Viper (it wasn't broken before it reached the venom)"
          : "An egg hatched into a Viper with no carrier event logged (left unattended, or a clutch reached the venom)";
      errors.push(playerlessMinor(ULA_HATCH_RULE_ID, "Egg Hatched", `${why}${fallout}.`, t, PUTRID_MEMBRANE, "Putrid Membrane"));
    }

    if (wipe && (blameable || !fellWith.length)) {
      wipeMarked = true;
      errors.push(raidMarker(ULA_HATCH_RULE_ID, "Viper Hatched",
        `A Viper hatch at +${sec(t)}s (Putrid Membrane on ${new Set(g.map((x) => x.p.name)).size} players) was followed by ` +
        `${after.length} deaths before the pull ended ${sec(pullEnd - t)}s later. Treated as the point the pull was over.`,
        t, PUTRID_MEMBRANE, "Putrid Membrane"));
    }
  }
  return errors;
}

// ─── Caustic Waves hits ──────────────────────────────────────────────────────

export const ULA_WAVES_RULE_ID = "wow-ula-caustic-waves";

function detectWaves(players: PlayerInfo[], deaths: DeathEvent[], blamed: HatchBlame[]): PullError[] {
  const errors: PullError[] = [];
  for (const p of players) {
    for (const g of clusterByGap(p.damageTaken.filter((e) => e.abilityId === CAUSTIC_WAVES), (e) => e.timestamp, EPISODE_MS)) {
      const t = g[0].timestamp;
      const death = deathsBy(deaths, [CAUSTIC_WAVES], t, g[g.length - 1].timestamp + HIT_DEATH_MS).find((d) => d.player === p.name);
      if (!landed(g[0]) && !death) continue; // an immunity
      if (blamed.some((b) => b.player === p.name && Math.abs(b.t - t) <= 1000)) continue; // flagged as the hatch
      errors.push(playerError(p, {
        ruleId: ULA_WAVES_RULE_ID, severity: death ? "Major" : "Minor", name: "Hit by Caustic Waves",
        description: `Was hit by Caustic Waves (${kFmt(g[0].amount ?? 0)}, ${total(g)} with the DoT)${died(death, t)}.`,
        timestamp: t, abilityId: CAUSTIC_WAVES, abilityIcon: g[0].abilityIcon, abilityName: "Caustic Waves",
      }));
    }
  }
  return errors;
}

// ─── Spectral Coils impacts ──────────────────────────────────────────────────

export const ULA_COILS_RULE_ID = "wow-ula-spectral-coils";

function detectCoils(players: PlayerInfo[], deaths: DeathEvent[], enemyCasts: EnemyEvent[]): PullError[] {
  const impacts = clusterByGap(enemyCasts.filter((c) => c.abilityId === COIL_IMPACT), (c) => c.timestamp, 500).map((g) => g[0].timestamp);
  const errors: PullError[] = [];
  let raided = false;
  for (const t of impacts) {
    const soakers = players.filter((p) => applied(p, SOUL_CONSTRICTOR).some(near(t, 500)));
    const alive = players.length - deadAt(players, deaths, t - 100).length;
    const killed = deathsBy(deaths, [COIL_DAMAGE], t, t + 1000);
    const who = soakers.length ? `: ${joinNames(soakers.map((p) => p.name))}` : "";
    if (killed.length >= RAID_DEATHS && !raided) {
      raided = true; // later impacts of the same collapse stay silent
      errors.push(raidMarker(ULA_COILS_RULE_ID, "Spectral Coils Deaths",
        `A Spectral Coils impact with ${soakers.length} mitigating player${soakers.length === 1 ? "" : "s"}${who} killed ` +
        `${killed.length} (${joinNames(killed.map((d) => d.player))}). Treated as the point the pull was over.`,
        t, COIL_DAMAGE, "Spectral Coils"));
    } else if (soakers.length <= COIL_UNDERSOAK && alive >= COIL_MIN_ALIVE) {
      errors.push(playerlessMinor(ULA_COILS_RULE_ID, "Spectral Coils Under-Soaked",
        `Only ${soakers.length} player${soakers.length === 1 ? "" : "s"} mitigated a Spectral Coils impact${who} ` +
        `(clean impacts had 5-10)${killed.length ? `; it killed ${joinNames(killed.map((d) => d.player))}` : ""}.`,
        t, COIL_DAMAGE, "Spectral Coils"));
    }
  }
  return errors;
}

// ─── Serpent's Bite -> Calcified Corpse ──────────────────────────────────────

export const ULA_CORPSE_RULE_ID = "wow-ula-calcified-corpse";

function detectCorpse(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const events = players.flatMap((p) => applied(p, CALCIFIED_CORPSE).map((e) => ({ p, t: e.timestamp })));
  return clusterByGap(events, (x) => x.t, 3000).map((g) => {
    const t = g[0].t;
    // The Bite that produced it: the latest Serpent's Bite application before the corpse.
    const biteT = players.flatMap((p) => applied(p, BITE_DEBUFF).map((e) => e.timestamp))
      .filter((x) => x <= t + 1000 && x >= t - 16000).sort((a, b) => b - a)[0];
    const targets = biteT === undefined ? [] : players.filter((p) => applied(p, BITE_DEBUFF).some(near(biteT, 300)));
    const helpers = biteT === undefined ? [] : players.filter((p) => applied(p, INGESTED_VENOM).some(near(biteT, 300)));
    const holders = [...new Set(g.map((x) => x.p))];
    const dead = holders.filter((p) => deaths.some((d) => d.player === p.name && Math.abs(d.timestamp - t) <= 1000 && d.killingAbilityGameId !== CORPSE_PULSE && d.killingAbilityGameId !== CALCIFIED_CORPSE));
    const killed = deathsBy(deaths, [CORPSE_PULSE, CALCIFIED_CORPSE], t, t + 5000);
    const helperText = `${helpers.length} helper${helpers.length === 1 ? "" : "s"} leeched it` +
      `${helpers.length ? ` (${joinNames(helpers.map((p) => p.name))})` : ""}; resolved Bites had ${BITE_HELPERS}-5`;
    const why = dead.length
      ? `${joinNames(dead.map((p) => `${p.name} (${deaths.find((d) => d.player === p.name && Math.abs(d.timestamp - t) <= 1000)!.cause})`))} ` +
        `died as Serpent's Bite resolved and calcified`
      : `Serpent's Bite on ${joinNames(targets.map((p) => p.name))} expired without being cleared: ${helperText}`;
    return raidMarker(ULA_CORPSE_RULE_ID, "Calcified Corpse",
      `${why}. Calcified Corpse hit the raid${killed.length ? ` and killed ${killed.length}` : ""}. Treated as the point the pull was over.`,
      t, CALCIFIED_CORPSE, "Calcified Corpse");
  });
}

// ─── Volatile Purge ──────────────────────────────────────────────────────────

export const ULA_PURGE_RULE_ID = "wow-ula-volatile-purge";

function detectPurge(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const p of players) {
    for (const g of clusterByGap(p.damageTaken.filter((e) => e.abilityId === PURGE_HIT), (e) => e.timestamp, 300)) {
      const t = g[0].timestamp;
      const death = deathsBy(deaths, [PURGE_HIT, PURGE_DOT], t, t + 8000).find((d) => d.player === p.name);
      const overlap = g.filter(landed).length >= 2;
      if (!death && !(overlap && p.role !== "Tank")) continue; // tanks overlap routinely (the kill too)
      const others = players.filter((o) => o !== p && removed(o, VOLATILE_PURGE).some(near(t, 300))).map((o) => o.name);
      errors.push(playerError(p, {
        ruleId: ULA_PURGE_RULE_ID, severity: death ? "Major" : "Minor", name: overlap ? "Volatile Purge Overlap" : "Died to Volatile Purge",
        description: `${overlap ? `Took ${g.length} Volatile Purge explosions at once (stood within 7yd of another purging player)` : "Took their Volatile Purge explosion"} ` +
          `(${total(g)})${died(death, t)}.${others.length ? ` Other purges: ${joinNames(others)}.` : ""}`,
        timestamp: t, abilityId: PURGE_HIT, abilityIcon: g[0].abilityIcon, abilityName: "Volatile Purge",
      }));
    }
  }
  return errors;
}

// ─── Mother's Wrath with no tank in reach ────────────────────────────────────

export const ULA_WRATH_RULE_ID = "wow-ula-mothers-wrath";

function detectWrath(players: PlayerInfo[], deaths: DeathEvent[], enemyCasts: EnemyEvent[]): PullError[] {
  return enemyCasts.filter((c) => c.abilityId === MOTHERS_WRATH).flatMap((c) => {
    const stoned = players.filter((p) => applied(p, STONE_VENOM).some((e) => e.timestamp >= c.timestamp && e.timestamp <= c.timestamp + 1500));
    if (stoned.length < STONE_RAID_MIN) return [];
    const tanksAlive = players.filter((p) => p.role === "Tank" && !deadAt(players, deaths, c.timestamp).some((d) => d.player === p.name));
    const killed = deathsBy(deaths, MW_HITS, c.timestamp, c.timestamp + 4000);
    const desc = `Mother's Wrath found no tank in reach (${tanksAlive.length} tank${tanksAlive.length === 1 ? "" : "s"} alive) and bit the raid: ` +
      `Stone Venom on ${stoned.length} players${killed.length ? `, killing ${killed.length}` : ""}.`;
    return [killed.length >= RAID_DEATHS
      ? raidMarker(ULA_WRATH_RULE_ID, "Mother's Wrath on the Raid", `${desc} Treated as the point the pull was over.`, c.timestamp, MOTHERS_WRATH, "Mother's Wrath")
      : playerlessMinor(ULA_WRATH_RULE_ID, "Mother's Wrath on the Raid", desc, c.timestamp, MOTHERS_WRATH, "Mother's Wrath")];
  });
}

// ─── Grasping Fangs / Blight Vein ────────────────────────────────────────────

export const ULA_BLIGHT_RULE_ID = "wow-ula-blight-vein";

function detectBlightVein(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];
  // A tethered player dying before they broke free.
  for (const d of deaths.filter((x) => x.killingAbilityGameId === FANGS_DAMAGE)) {
    const p = players.find((x) => x.name === d.player);
    if (!p) continue;
    const start = applied(p, GRASPING_FANGS).filter((e) => e.timestamp <= d.timestamp).pop()?.timestamp;
    errors.push(playerError(p, {
      ruleId: ULA_BLIGHT_RULE_ID, severity: "Major", name: "Died to Grasping Fangs",
      description: `Died to Grasping Fangs${start !== undefined ? ` ${sec(d.timestamp - start)}s after being tethered` : ""} without breaking the tether; ` +
        "the death broke it and added a Blight Vein stack to the raid.",
      timestamp: d.timestamp, abilityId: FANGS_DAMAGE, abilityName: "Grasping Fangs",
    }));
  }
  // A mass Blight Vein death: list when each tether broke.
  for (const g of clusterByGap(deaths.filter((d) => BLIGHT_VEIN_IDS.includes(d.killingAbilityGameId)), (d) => d.timestamp, 10000)) {
    if (g.length < RAID_DEATHS) continue;
    const t = g[0].timestamp;
    const breaks = players.flatMap((p) => removed(p, GRASPING_FANGS).filter((e) => e.timestamp <= t && e.timestamp > t - 20000)
      .map((e) => ({ p, t: e.timestamp }))).sort((a, b) => a.t - b.t);
    const maxStack = Math.max(0, ...players.flatMap((p) => p.debuffs.filter((e) => e.abilityId === BLIGHT_VEIN_IDS[0] && e.timestamp <= t).map((e) => e.stack ?? 1)));
    errors.push(raidMarker(ULA_BLIGHT_RULE_ID, "Blight Vein Deaths",
      `Blight Vein reached ${maxStack} stacks and killed ${g.length} (clean pulls broke one tether ~7s early and the other five together, peaking at 5). ` +
      `Tethers broke at ${breaks.map((b) => `+${sec(b.t)} ${b.p.name}`).join(", ")}. Treated as the point the pull was over.`,
      t, BLIGHT_VEIN_IDS[1], "Blight Vein"));
  }
  return errors;
}

// ─── Add casts that should never finish ──────────────────────────────────────

export const ULA_ADD_CAST_RULE_ID = "wow-ula-add-cast";

function detectAddCasts(deaths: DeathEvent[], enemyCasts: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  const shriekerCasts = new Map<number, number>();
  for (const c of enemyCasts) {
    let what: string | undefined;
    if (c.abilityId === MALICE) what = "Malice wasn't interrupted";
    else if (c.abilityId === ANGUISHED_CRY) what = "Anguished Cry wasn't interrupted";
    else if (c.abilityId === HATCHING_DOOM) what = "the Doomscale Egg finished Hatching Doom (a Ravenous Doomscale)";
    else if (c.abilityId === ACIDIC_EXPULSION && /Rawling/.test(c.actorName)) what = "a Blightscale Rawling lived long enough to cast Acidic Expulsion";
    else if (c.abilityId === ACIDIC_EXPULSION && /Shrieker/.test(c.actorName)) {
      // Every Stage 3 pull (the kill too) let both Shriekers expel once at ~+519.
      const n = (shriekerCasts.get(c.sourceInstance ?? 0) ?? 0) + 1;
      shriekerCasts.set(c.sourceInstance ?? 0, n);
      if (n >= 2) what = "a Blightscale Shrieker lived to cast Acidic Expulsion a second time";
    }
    if (!what) continue;
    const killed = deathsBy(deaths, [c.abilityId], c.timestamp, c.timestamp + 10000);
    const desc = `${c.actorName}${c.sourceInstance ? ` #${c.sourceInstance}` : ""}: ${what}` +
      `${killed.length ? `; ${killed.length} died to it (${joinNames(killed.map((d) => d.player))})` : ""}.`;
    errors.push(killed.length >= RAID_DEATHS
      ? raidMarker(ULA_ADD_CAST_RULE_ID, `${c.abilityName} Completed`, `${desc} Treated as the point the pull was over.`, c.timestamp, c.abilityId, c.abilityName)
      : playerlessMinor(ULA_ADD_CAST_RULE_ID, `${c.abilityName} Completed`, desc, c.timestamp, c.abilityId, c.abilityName));
  }
  return errors;
}

// ─── Avoidable damage ────────────────────────────────────────────────────────

export const ULA_AVOIDABLE_RULE_ID = "wow-ula-avoidable";

function detectAvoidable(players: PlayerInfo[], deaths: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];
  const episodes = (id: number, name: string, what: string, opts: { deathsOnly?: boolean; skipTanks?: boolean; minHit?: number } = {}) => {
    for (const p of players) {
      if (opts.skipTanks && p.role === "Tank") continue;
      const hits = p.damageTaken.filter((e) => e.abilityId === id && (opts.minHit === undefined || (e.amount ?? 0) + (e.overkill ?? 0) >= opts.minHit));
      for (const g of clusterByGap(hits, (e) => e.timestamp, EPISODE_MS)) {
        const death = deathsBy(deaths, [id], g[0].timestamp, g[g.length - 1].timestamp + HIT_DEATH_MS).find((d) => d.player === p.name);
        if (!death && (opts.deathsOnly || !g.some(landed))) continue;
        errors.push(playerError(p, {
          ruleId: ULA_AVOIDABLE_RULE_ID, severity: death ? "Major" : "Minor", name: `Hit by ${name}`,
          description: `${what}${g.length > 1 ? ` ${g.length} times` : ""} (${total(g)})${died(death, g[0].timestamp)}.`,
          timestamp: g[0].timestamp, abilityId: id, abilityIcon: g[0].abilityIcon, abilityName: name,
        }));
      }
    }
  };
  episodes(FALLING_DEBRIS, "Falling Debris", "Stood under Falling Debris during Rage of the Shackled");
  episodes(VIRULENT_SPIT, "Virulent Spit", "Stood in a Virulent Spit impact");
  episodes(DESPERATE_THRASH, "Desperate Thrash", "Stood in a Weakened Doomscale's Desperate Thrash cone", { skipTanks: true });
  episodes(CIRCLING_PREY, "Circling Prey", "Was within 13yd of the platform Circling Prey destroyed", { minHit: PREY_HEAVY });
  episodes(DEADLY_VENOM, "Deadly Venom", "Stood in the venom", { deathsOnly: true });

  // Fester Burst hits players far from the Wretch; the kill had one per cast.
  const fester = players.flatMap((p) => clusterByGap(p.damageTaken.filter((e) => e.abilityId === FESTER_BURST), (e) => e.timestamp, 6000)
    .map((g) => ({ p, g, t: g[0].timestamp })));
  for (const cast of clusterByGap(fester, (x) => x.t, 1500)) {
    if (cast.length < FESTER_GROUP) continue;
    for (const { p, g, t } of cast) {
      const death = deathsBy(deaths, [FESTER_BURST], t, g[g.length - 1].timestamp + HIT_DEATH_MS).find((d) => d.player === p.name);
      errors.push(playerError(p, {
        ruleId: ULA_AVOIDABLE_RULE_ID, severity: death ? "Major" : "Minor", name: "Hit by Fester Burst",
        description: `Was more than 10yd from the Blightscale Wretch when Fester Burst went off (${cast.length} players hit; ${total(g)})${died(death, t)}.`,
        timestamp: t, abilityId: FESTER_BURST, abilityIcon: g[0].abilityIcon, abilityName: "Fester Burst",
      }));
    }
  }
  return errors;
}

// ─── Hard enrage ─────────────────────────────────────────────────────────────

export const ULA_ENRAGE_RULE_ID = "wow-ula-enrage";

function detectEnrage(players: PlayerInfo[]): PullError[] {
  const first = players.flatMap((p) => p.damageTaken.filter((e) => FURY_UNLEASHED.includes(e.abilityId)))
    .sort((a, b) => a.timestamp - b.timestamp)[0];
  if (!first) return [];
  return [raidMarker(ULA_ENRAGE_RULE_ID, "Fury Unleashed",
    `Ula'tek reached her hard enrage (Fury Unleashed at +${sec(first.timestamp)}s; the kill ended at +598.6s). Treated as the point the pull was over.`,
    first.timestamp, FURY_UNLEASHED[0], "Fury Unleashed")];
}

// ─── Pull over: called wipe / N dead / tank death ────────────────────────────

export const ULA_PULL_OVER_RULE_ID = "wow-ula-pull-over";

function detectPullOver(players: PlayerInfo[], deaths: DeathEvent[], pullEnd: number): PullError[] {
  return pullOverMarker(players, deaths, pullEnd, {
    ruleId: ULA_PULL_OVER_RULE_ID,
    collapseDead: COLLAPSE_DEAD,
    collapseEndMs: COLLAPSE_END_MS,
    cause: (d) => (d.killingAbilityGameId ? d.cause : "no killing blow logged"),
    tankDeath: { kind: "pullEnded", rezGraceMs: TANK_REZ_GRACE_MS, endMs: TANK_DEATH_END_MS },
    calledWipe: calledWipe(deaths, ULA_PULL_OVER_RULE_ID, CALLED_WIPE_DEATHS, CALLED_WIPE_WINDOW_MS),
  });
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export function detectUlatekErrors(
  players:           PlayerInfo[],
  deaths:            DeathEvent[] = [],
  enemyCasts:        EnemyEvent[] = [],
  enemyBuffRemovals: EnemyEvent[] = [],
  pullDurationMs?:   number
): PullError[] {
  // Self-gate: Deadly Venom and generic deaths exist in other Venomous Abyss fights.
  const isUlatek = players.some((p) => p.debuffs.some((e) => ULATEK_SIGNATURE.has(e.abilityId)));
  if (!isUlatek) return [];

  const pullEnd = pullDurationMs ?? lastPlayerEventMs(players);
  const blamed: HatchBlame[] = [];

  const errors = [
    ...detectHatches(players, deaths, enemyBuffRemovals, pullEnd, blamed),
    ...detectCoils(players, deaths, enemyCasts),
    ...detectCorpse(players, deaths),
    ...detectPurge(players, deaths),
    ...detectWrath(players, deaths, enemyCasts),
    ...detectBlightVein(players, deaths),
    ...detectAddCasts(deaths, enemyCasts),
    ...detectAvoidable(players, deaths),
    ...detectEnrage(players),
  ];
  errors.push(...detectWaves(players, deaths, blamed));

  const firstRaid = Math.min(Infinity, ...errors.filter((e) => e.severity === "Raid").map((e) => e.timestamp));
  errors.push(...detectPullOver(players, deaths, pullEnd).filter((e) => e.timestamp < firstRaid));

  return suppressDuplicateRaidErrors(errors.sort((a, b) => a.timestamp - b.timestamp));
}
