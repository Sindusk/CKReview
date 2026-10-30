// The Epic of Alexander (Ultimate) -- Phase 2: Brute Justice / Cruise Chaser.
//
// ── DIGEST (read first; detail in the sections it names) ──
// What: BJ/CC phase of TEA, a scripted ~200s timeline from J Kick (Whirlwind
//   +12, Judgment Nisi +15, Link-Up +21, Photon/pass 1 +37, Spin Crusher +47,
//   Water/Lightning 1 +51, Missile Command/mines/ice +58-67, Water/Lightning 2
//   +81, Limit Cut/shield +87, Flarethrower/pass 3 +89, Whirlwind +101,
//   Water/Lightning 3 +110, pass 4, Propeller Wind +128, Gavel +130, Final
//   Sentence +188). Same static and NAUR plan as intermission-limit-cut.ts,
//   which owns pulls ending within 30s of J Kick (LC_HANDOFF_MS). No kill
//   with an error on disk; 11 clears carry none.
// Rules (Major unless noted; ids as spelled in code):
//   ffxiv-bjcc-avoidable (Minor, Major if it killed): Chakram, Hawk Blaster,
//     Spin Crusher, Drainage, Sludge, Frostbite, Propeller Wind, Flarethrower
//     on a non-bait.
//   ffxiv-bjcc-nisi-collision / -wrong-color / -dropped (both players /
//     receiver + donor / DPS of the pair, at pass 4 both); each sets Raid
//     ffxiv-bjcc-nisi-failed. ffxiv-bjcc-nisi-death (Raid): dead at Nisi or
//     last copy of a color lost; later Nisi errors are fallout.
//   ffxiv-bjcc-gavel (Raid): Gavel killed 3+. ffxiv-bjcc-wall: unexplained
//     death (not called wipe, Photon tick, or within 6s of a knockback).
//   ffxiv-bjcc-water-short (Major if killed/Punishing, else Minor): free pool
//     player missing from a Water under 3. ffxiv-bjcc-lightning-alone (on the
//     round's helper), -lightning-extra (Minor, Major if killed),
//     -lightning-swap (Minor, Major if Punishing Thunder followed).
//   ffxiv-bjcc-punishing (Raid), -mine-missed (+ Raid -shrapnel), -mine-clip
//     (Minor/Major), -ice, -flarethrower (Major/Minor, BJ tank),
//     -severe-contamination (Raid), -shield (Raid), -tank-dead (Raid),
//     -chakram-bait (player-less Minor), -chakram-death (Raid).
// Cutoffs (Raid, earliest kept): nisi-death, tank-dead, chakram-death, and
//   generic called-wipe (3+ no-killing-blow deaths in 10s or any within 12s
//   of the end) / collapse (4 dead, pull over within 30s), BJ/CC wipes only.
// Exposure: water-short, lightning-alone, mine-missed, ice, flarethrower are
//   targeted (per instance); the rest are everyone (all eight carry Nisi).
// Key thresholds: WATER_MIN 3 (3-4 takers in 90 of 95 rounds; every 1-2
//   player Water killed its takers); SHIELD_WHIRLWIND_MEDIAN 24k (unbroken
//   shield 22-47k, broken up to 19k); SHIELD_WINDOW_MS 10s (shield broke
//   4.1-8.2s after Limit Cut); knock-into-wall deaths 1.8-4.5s after the hit;
//   NISI_DEATH_YIELD_MS 3s; NISI_LAST_COPY_MS 5s; WALL_PUSH_MS 6s;
//   DRAINAGE_DEATH_MS 5s; PHOTON_DOT_MS 10s.
// Strategy: Lightning goes DPS > MT > Water healer > OT; supports stand still
//   and DPS pass Nisi at pass 3; a tank's death makes the mechanic
//   unresolvable.
// Sections (grep the heading): "VERIFIED AGAINST LOGS (2026-10-16)" reports,
//   clock; "RULES IMPLEMENTED" full rule text, user rulings, VOD reviews;
//   "GUIDE-DERIVED MODEL (2026-10-15)"; "SOURCES CHECKED 2026-10-15";
//   "SHAPE, CLOCK, AND ACTORS" timeline, actor ids; "CANDIDATE IDs, STATUS
//   MAPPING, SEVERITY"; "NAUR SLOTS, CLOCK SPOTS, AND PASS TRAFFIC";
//   "JUDGMENT NISI / VERDICT / GAVEL"; "LINK-UP / COMPRESSED WATER AND
//   LIGHTNING"; "CHAKRAMS / OPTICAL SIGHT / PHOTON / SPIN CRUSHER";
//   "MISSILE COMMAND / MINES / ENUMERATION / ICE"; "PLASMA SHIELD /
//   FLARETHROWER / TORNADO LIFECYCLE"; "PROPELLER WIND / GAVEL / ENDING
//   BUSTERS"; "VARIANTS AND PULL-END STATES"; "OPEN QUESTIONS FOR LOG
//   VERIFICATION" (the largest, ~13k tokens).
// Open items: not built: Enumeration (one failure, followed three deaths),
//   Super Jump / Apocalyptic Ray extras, Water/Lightning hits under their own
//   Resistance Down, fault for a tank's death to autos (mitigation), enrage.
// ── END DIGEST ──
//
// -- VERIFIED AGAINST LOGS (2026-10-16) --
// Same static as intermission-limit-cut.ts, NAUR plan (user), no VODs, no
// kill. Pulls are cited A<n> / B<n> / C<n> = the app's Pull n with the
// whole report imported.
// Report A = 1NG4Zah79yKYHCDv (73 pulls captured --to-minutes 3: its 9 J
//   Kick pulls hold only BJ/CC's first ~35s).
// Report B = HwjvVh3TNAZmMQyq (47 pulls; the 32 that reached phase 2 on
//   disk, 30 reached J Kick; BJ/CC cleared in B28, B46).
// Report C = LxAVFd29kwPm8HnB (30 pulls; the 19 that reached phase 2
//   fetched --min-phase 2 --from-minutes 2.1 --to-minutes 5.7; BJ/CC
//   cleared in C9, C10, C12, C13, C14, C18, C20, C27, C29).
// The 11 clears carry no BJ/CC error (two tanks died to Double Rocket
// Punch after Gavel, C10/C20: mitigation).
// Clock (from J Kick, every pull within ~0.3s): Whirlwind +12.1; Judgment
// Nisi +15.2 (Decree Nisi on all four DPS or all four supports +15.9, 36s);
// Link-Up +21.3 (Water on a healer, Lightning on a DPS, 29s); Optical Sight
// +29.4, Hawk Blaster +34.5, Photon +36.9; pass 1 +38-40; Spin Crusher
// +46.7; Water/Lightning 1 +51.1; Missile Command +58.6; ice Earth Missile
// +66.7 (a random tank); Hidden Mines +66-72; Enumeration +66.7; pass 2
// +68-75; Water/Lightning 2 +80.9; Verdict +82.6 (Final Judgment, 45s);
// Limit Cut (shield) +87.7; Flarethrower +90.0; pass 3 +96-106; Whirlwind
// +101.9; Water/Lightning 3 +110.6; pass 4 +118-128; Propeller Wind +129;
// Gavel +131.1 (every Nisi cleared +133.2); tank Photon +141; Double Rocket
// Punch +149.4; Super Jump +156.8 and Apocalyptic Ray +159 only in the
// slower clears (B46, C14, C27); Temporal Stasis +167 / +182.
// Log IDs: Decree Nisi α/β/γ/δ 1002222/1002223/1002137/1002138; Final
// Judgment α/β/γ/δ 1002224/1002225/1002139/1002140 (refreshed every ~3s);
// Final Sentence 18493 is the Nisi penalty, logged only as the killing
// blow (no damage event); 18518 is the enrage cast (never finished).
// Compressed Water/Lightning 1002142/1002143; Water/Lightning Resistance
// Down II 1002144/1002145 (31s, carrier only); Crashing Wave/Thunder
// 18496/18497; Punishing Wave/Thunder 18498/18499. Hidden Mine 18514 (cast
// target = soaker), Hidden Mine Shrapnel 18515, ice Earth Missile 18511
// (cast target = ice tank), Frostbite 1000285, Sludge 1000287, Drainage
// 18500 (tornado contact), Severe Contamination 18891 (a tornado left
// alive, cast by "liquid rage"), Flarethrower 18502, Eye of the Chakram
// 18517, Propeller Wind 18482 (Confused 1001283, 5s), Brute Justice's
// autos 18811, Cruise Chaser's 18810. Cruise Chaser's Invincibility 1000775
// lifts when the shield breaks (+92.5 to +96.6); Damage Up 1000290 at +96.8
// means it timed out. Damage Down 1002092 comes only from the raid
// penalties (Punishing, Severe Contamination, Shrapnel), so avoidables are
// Minor unless they kill.
// Roles on disk: Brute Justice's tank (most BJ autos) is the Warrior in
// every pull: Lightning 1 helper, Flarethrower bait. Cruise Chaser's tank
// (Paladin) soaks both mines and is Lightning 3's helper.
// Findings:
// - Decree Nisi passes copy the color; the donor keeps theirs until its 36s
//   run out. NAUR pairs held in every clear (phys/OT, M1/MT, caster/shield
//   healer, M2/regen healer). Two colors touching give each player the
//   other's in the same millisecond, and Final Sentence kills both ~0.8s
//   later: B1, B8, B11, B22, B37, B43, C4, C19, C22. Never in a clear.
// - After Verdict every player must hold their Judgment color at Gavel;
//   clear holders may already have run out (C9). Wrong colors picked up
//   after Verdict (B22 +115.6, B31, B40 +121, C8 +99.8, C21) and colors
//   whose last copy ran out (B4 +79.4, B14 +75.0, B19, B25 +51.9, B36, B38,
//   B42 +106.3, C6 +104.3) end in a full-raid Final Sentence at Gavel
//   (B40, B42, C8), as does a player dead at Gavel (B44, the tank killed by
//   autos at +125).
// - A death loses the colors when the player is dead as Judgment Nisi goes
//   out (B1, user: "without all 8 alive it's not resolvable"; C4, raised
//   10s later, still over), or dies holding a color whose other copies run out
//   within 5s (B25 the Paladin walked into the wall 1.8s before the
//   donor's ran out; B31 the Warrior died to a chakram holding the only γ;
//   B36). Nisi errors after it are fallout (user: B1, B31). A player
//   raised before the first pass, or dying beside a lasting copy, is not.
// - Passes 1-3: the supports stand still and the DPS walk to them (NAUR;
//   user, B14: the black mage didn't go to the sage). Pass 4 at the ice is
//   a crowd where players dodge each other ("car crash", B22).
// - No-killing-blow deaths outside a called wipe: walked into the wall
//   (B25, user), or knocked into it 1.6s after a knockback hit, which an
//   invulnerability can log as 0 damage (B11 Spin Crusher, user).
// - Drainage leaves its victim at a few thousand HP: B36's Paladin (ice
//   on him) died to the mine 2.4s after it, the user's Major for the
//   tornado contact.
// - Water 3 is for the DPS and the free healer (user, B24: both melee and
//   the white mage should have joined).
// - Collisions: the position samples (seconds apart for melee) can't show
//   who doubled back. User: B37 the dragoon changed course, B43 the monk
//   moved too far; both still named.
// - Lightning 2 is Brute Justice's tank's to carry at the wall; both melee
//   in it (B22, B24) is the tank's position, Minor (user, B24).
// - Water: 3-4 players in 90 of 95 rounds; 1-2 in B24, B30, C6, C11, C19,
//   all lethal (29-32k each). Lightning: exactly two in 87; three or four
//   in B22, B24, B30, B37, B42, C19, C22 (survivable unless already low);
//   alone once (B15), when Compressed Lightning came straight back onto
//   its carrier under its resistance and Punishing Thunder went off. Every
//   Punishing ended the pull; its usual cause is a carrier's death.
// - Drainage (a tornado) killed in B11, B13, B18, B25, B29, B31, B35, C21,
//   ~5s after a Water explosion or walking through one; the Paladin's 0-dmg
//   hits were Hallowed Ground.
// - Severe Contamination: the first tornado unfrozen at +77 (B14 the ice
//   tank alive, B36 the ice tank dead), the second unburned at +107 (B4,
//   Flarethrower hit five non-tanks and missed the Warrior).
// - Mines: the Paladin soaked both in every clear; Shrapnel when the second
//   went off unsoaked (B38 the Paladin dead to Frostbite, C19 alive). Mines
//   on a non-tank: B31 and B36 (the phys ranged, both died).
// - Plasma Shield timed out in B29, B35, B47, C21; only B47 still had a
//   party, and its Whirlwind hit 22-47k (median 32k, all eight died) vs
//   at most 19k with the shield broken.
// - Photon leaves everyone at 1 HP: a Nisi tick right after killed three in
//   B12 and one in B8 with no killing blow (healing, not a reset).
// - Eye of the Chakram killed in A58, B2, B31; no Hawk Blaster, Spin
//   Crusher (bar one 0-dmg tank hit), Enumeration (bar B13, after three
//   deaths), Super Jump extra or Apocalyptic Ray hit in any pull.
// Cutoffs (34 BJ/CC wipes in B and C, every one has one): Decree Nisi
// failed 14 (B1, B4, B14, B22, B25, B31, B37, B40, B42, B43, C4, C6, C8,
// C22), Punishing Wave 9 (B2, B12, B13, B18, B24, B30, B36, C11, C24),
// Punishing Thunder 3 (B15, B19, B35), both healers dead (ffxiv/common.ts)
// 4 (B11, B29, C21, C30), Shrapnel 2 (B38, C19), Gavel 1 (B44), shield 1
// (B47). In A: healers dead A58, A70; collapse A73 (its deaths are past
// the capture's end). Unexplained: none. Pulls ending within 30s of J
// Kick are intermission-limit-cut.ts's.
//
// -- RULES IMPLEMENTED --
// ffxiv-bjcc-avoidable (Minor; Major if it killed, including a knock into
//   the wall 1.8-4.5s after Spin Crusher / Drainage and any death within
//   5s of Drainage): Eye of the Chakram,
//   Hawk Blaster, Spin Crusher, Drainage, Sludge, Frostbite, Propeller
//   Wind, and Flarethrower on anyone beside the tank who baited it.
// ffxiv-bjcc-nisi-collision (Major, both players: the log can't say who
//   moved), ffxiv-bjcc-nisi-wrong-color (Major, the receiver and the one
//   other-side donor of that color), ffxiv-bjcc-nisi-dropped (Major: at
//   passes 1-3 the DPS of the pair, holder or receiver; at pass 4 both, the
//   receiver being after Verdict the matching Judgment, before it the one
//   free player of the other side). A drop owed to a dead player is
//   fallout (C6). Each sets the Raid ffxiv-bjcc-nisi-failed;
//   ffxiv-bjcc-gavel (Raid) marks a Gavel that killed three or more with
//   nothing earlier.
// ffxiv-bjcc-nisi-death (Raid): a player dead at Judgment Nisi, or a death
//   taking a color with no other copy lasting 5s more. Every Nisi error
//   after it is fallout (not reported, on Limit Cut wipes too). It yields
//   to a penalty within 3s (Punishing on a carrier's death). Deaths after
//   Gavel don't matter for Nisi (user, C10).
// Wrong colors at pass 3 name only the DPS of the pair (user, C8: the
//   supports stand still and the DPS pass).
// ffxiv-bjcc-wall (Major): a no-killing-blow death that's not a called
//   wipe, a Photon-tick death, or within 6s of a Drainage / Propeller Wind
//   hit.
// ffxiv-bjcc-water-short (Major if it killed or Punishing followed, else
//   Minor): every free pool player missing from a Water under 3. Pool:
//   healers and ranged DPS in rounds 1-2, all DPS and healers in round 3, minus the
//   Lightning carrier and helper and anyone under Water Resistance Down.
// ffxiv-bjcc-lightning-alone (Major/Minor), on the round's helper: round 1
//   Brute Justice's tank, round 2 the healer under Water Resistance Down,
//   round 3 Cruise Chaser's tank. ffxiv-bjcc-lightning-extra (Minor; Major
//   if it killed): anyone else in a Lightning with its helper; in round 2
//   carried by Brute Justice's tank, that tank instead (stand at the wall).
// ffxiv-bjcc-punishing (Raid), naming the carrier's death or the
//   re-application; skipped for a reset death in the last 12s (C30).
// ffxiv-bjcc-mine-missed (Major, the first mine's target, if alive at the
//   Shrapnel) with the Raid ffxiv-bjcc-shrapnel; ffxiv-bjcc-mine-clip
//   (Minor/Major) for anyone else hit while the soaker was alive.
// ffxiv-bjcc-ice (Major, the ice tank alive throughout) and
//   ffxiv-bjcc-flarethrower (Major/Minor, Brute Justice's tank when the
//   cone went to others); ffxiv-bjcc-severe-contamination (Raid).
// ffxiv-bjcc-shield (Raid): the Whirlwind after the shield with a median
//   hit of 24k+ on four or more.
// ffxiv-bjcc-tank-dead (Raid): a tank's death between J Kick and Gavel,
//   not a called-wipe reset (user, 2026-10-17, E18 +3:59 the Warrior to
//   autos: "the moment the tank dies, the mechanic becomes unresolvable";
//   E22 +2:41.7). It yields to a Nisi-death or penalty marker within 3s
//   (B31, B36 the color it held; B38 Shrapnel; D8, B19 Punishing). Moved
//   B11, B30, B44, C24 earlier.
// ffxiv-bjcc-chakram-bait (player-less Minor): Eye of the Chakram on a
//   tank is a bad bait by someone unnamed, not the tank's avoidable (user,
//   E22: the tank "didn't make a mistake - the Chakram was baited incorrectly";
//   also B31, D26).
// ffxiv-bjcc-lightning-swap (Major when a Punishing Thunder follows, else
//   Minor): Lightning round 1 or 2 shared without its helper, so it passes
//   off the plan (user's cheat sheet: Lightning goes DPS > MT > Water
//   healer > OT). Later Lightning errors are its fallout. Round 1 names
//   the DPS carrier, who goes to Brute Justice's tank to pass it (user,
//   F13 +3:05.6: the monk "should have gone to" the Warrior, "not" the
//   dragoon's or the Warrior's fault); round 2 names the helper and whoever
//   shared instead (unreviewed, C19). F13's round 2 then went to the tank
//   and round 3 hit the tank alone (Punishing Thunder), which used to name
//   Cruise Chaser's tank. Also B43.
// ffxiv-bjcc-chakram-death (Raid): a non-tank's death to Eye of the
//   Chakram, right before the first Nisi pass (user, F5 +2:44.5: "basically
//   ends the pull. Everyone walks into the wall after"). A tank's is
//   ffxiv-bjcc-tank-dead.
// Generic, BJ/CC wipes only (no Temporal Stasis, ended 30s+ after J Kick),
//   without a mechanic Raid: ffxiv-bjcc-called-wipe (3+ no-killing-blow
//   deaths in 10s or any within 12s of the end; Photon-tick deaths
//   excluded), ffxiv-bjcc-collapse (4 dead, pull over within 30s). Only the
//   earliest Raid marker is kept.
// Exposure: water-short, lightning-alone, mine-missed, ice and flarethrower
//   are targeted (reported per instance); the rest are everyone (all eight
//   carry Nisi).
// Not built: Enumeration (its one failure, B13, followed three deaths);
//   Super Jump / Apocalyptic Ray extras (no failure on disk); Water/Lightning
//   hits under their own Resistance Down (none on disk); who is at fault
//   for a tank's death to autos (C6, C24, B19, B44, E18: mitigation; the
//   death itself is now the cutoff); the enrage (never reached).
// VOD review 2026-10-16 (user): report B pulls 1, 11, 14, 22, 24, 25, 31,
//   36, 37, 43 and report C pulls 4, 8, 11, 19 (the mine tank's first
//   puddle dropped out of position hid the mine: confirmed), 22 (the black
//   mage moved toward the wrong partner; both still named),
//   rulings in expectations/rulings.json. Old questions 3 (B25: the
//   Paladin walked into the wall) and 4 (B24: the tank's position) are
//   answered above; pass 3's wrong color (B31) turned out fallout, and the
//   pass-4 wrong color (B22) was the support running into the DPS, with
//   the user unsure, so both stay named.
// VOD review 2026-10-17 (user): report E = AHw6VfLrZ97Gj1Dn (all 31 pulls
//   on disk) pulls 18, 22, 24, rulings in expectations/rulings.json. E24
//   +4:17.4 pass 4: the white mage (donor) walked into the dancer, who was
//   correct; both still named (see question 3).
// VOD review 2026-10-17 (user): report F = Q9zqJb4VLmjhd1B6 (all 16 pulls
//   on disk) pull 5 (the dragoon not far enough from the chakram's line),
//   and 13 (the first Lightning's carrier), rulings in
//   expectations/rulings.json. F14 followed the Lightning plan up to round
//   3, so Cruise Chaser's tank stays named there (unruled: the user
//   couldn't tell).
// Replay findings (2026-10-18, tea/replay.ts, F4 the kill): Optical Sight's
//   eight Hawk Blasters land where each player stood at their 4.7s
//   begincast (helpers log the middle); Enumeration's helpers stand on the
//   two marked DPS (marker 65); each Water leaves its tornado at the
//   Crashing Wave spot (no actor logged); Cruise Chaser stood 2.4y from
//   the frozen tornado's spot at Propeller Wind, the party lined up east.
// OPEN QUESTIONS:
// 1. Collisions name both players. Who moved (B37 pass 4, B43 +63 two
//    melee in the west Enumeration; C22 +101.5 two ranged at pass 3)?
// 2. A drop at passes 1-3 held by a support with no single free receiver
//    now names nobody (the DPS who should have come is unknown).
// 3. Pass-4 wrong colors name both players. Plan (user, 2026-10-17): the
//    Nisi holders line up in BPOG and stand still; each player without a
//    Nisi walks in to take the matching color. The exception is the
//    off tank on Cruise Chaser, who waits for its cast to lock in (or it
//    moves in and kills everyone), then goes to their Nisi spot. So a
//    receiver at the wrong holder is the receiver's error, and a holder who
//    left the line is the holder's. Both reviewed cases were the holder
//    walking into the receiver (B22, E24), but position samples are too
//    sparse to tell which one moved.
//
// -- GUIDE-DERIVED MODEL (2026-10-15) --
// Research only, no detector and no claims verified against local logs.
// Scope: eight-player level-80 Ultimate (patch 5.11), item-level sync 475.
// Starts at J Kick after Limit Cut; ends when BOTH enemies are defeated.
// Temporal Stasis belongs to alexander-prime.ts. A future VERIFIED AGAINST
// LOGS section takes precedence over these guide/source-derived claims.
// Patch/job changes alter damage and push times; launch damage values and
// mitigation cooldown schedules are not stable mechanic thresholds.
//
// -- SOURCES CHECKED 2026-10-15 --
// [NA] NAUR resource directory / Elina BJCC toolbox:
// https://naurffxiv.com/ultimate/tea
// https://ff14.toolboxgaming.space/?id=492297437831961&preview=1
// [WD] Browser inspection of all eight roles in NAUR/Elinabin BJCC:
// https://wtfdig.info/ultimates/tea#naur
// [IV] Lyra, generalized mechanics plus stacked and split alternatives:
// https://www.icy-veins.com/ffxiv/the-epic-of-alexander-ultimate-guides-brute-justice-and-cruise-chaser
// [US] Split-stack regional execution:
// https://ultistrats.com/guides/tea/
// [OCE] Full written split-boss explanation; regional difference context:
// https://materiaraiding.com/ultimate/tea
// https://materiaraiding.com/resources/visitorsguide
// [BM] Primary event and geometry definitions, master branch:
// https://github.com/awgil/ffxiv_bossmod/tree/master/BossMod.Ultimate/Shadowbringers/Ultimate/TEA
// Read TEAEnums.cs, TEAStates.cs, TEAConfig.cs, P2Nisi.cs,
// P2CompressedWaterLightning.cs, P2MissileCommand.cs, P2PlasmaShield.cs,
// P2Flarethrower.cs, P2SuperJump.cs and ApocalypticRay.cs.
// [CB] Primary reference timeline / triggers, main branch:
// https://github.com/quisquous/cactbot/blob/main/ui/raidboss/data/05-shb/ultimate/the_epic_of_alexander.txt
// Same directory: the_epic_of_alexander.ts. No implementation reproduced.
//
// -- SHAPE, CLOCK, AND ACTORS --
// Both enemies have independent HP and enmity, and must be defeated close
// together. One reaching its defeat threshold accelerates the other's
// enrage; a missing death event alone need not mean an enemy survived:
// [BM] describes the defeated actors becoming untargetable at 1 HP.
// No mechanic resource meter to manage: this is a scripted timeline, with
// independent Nisi timers and three ~30s elemental hand-off rounds.
// Candidate actors: BJ 0x2C4C, CC 0x2C4E, Steam Chakram 0x2C4D,
// Plasma Shield 0x2C4F, Liquid Rage 0x2C49, Gelid Gaol 0x2C81 [BM].
// [CB] below is rebased to J Kick = +0, NOT the synthetic timeline 226.1:
//   +0 J Kick; +3 targetable; +12.2 Whirlwind; +15.2 Judgment Nisi;
//   +21.3 Link-Up; +29.3 Optical Sight; +30.1 Chakrams;
//   +34.5 Hawk Blaster; +36.4 Photon -> first Nisi pass;
//   +46.6 Spin Crusher; +51.2 Water/Lightning 1;
//   +62.5 Earth Missile; +64.5 Hidden Minefield; +66.6 Enumeration/Ice;
//   mine soaks / pass 2; +80.6 Water/Lightning 2;
//   Verdict around this overlap; +87.4 Limit Cut/shield;
//   +89.4 Flarethrower -> pass 3; +101.5 Whirlwind;
//   +110.1 Water/Lightning 3; line up / pass 4;
//   +128.4 Propeller Wind; +130.4 Gavel; Nisi clears shortly later;
//   +140.7 tank Photon; +148.7 Double Rocket Punch; +156.0 Super Jump;
//   +158.3 five Apocalyptic Ray hits; +168.9/+177.0 Whirlwind;
//   +187.6 Final Sentence; +197.6 Eternal Darkness if not pushed.
// Entries are action resolution, not cast starts; Final Sentence and
// Eternal Darkness have 8s casts [BM]. Timer-derived late deadlines need
// a report: BM's late P2 state timing is explicitly incomplete.
//
// -- CANDIDATE IDs, STATUS MAPPING, SEVERITY --
// IDs below are decimal game IDs, not verified FFLogs IDs. Raw statuses
// usually become 1000000 + raw ID in FFLogs; a control cast, aura, helper
// hit and penalty must not be treated as interchangeable events.
// Every failure below is guide/source-inferred, not observed in a report.
// Minor = nonfatal avoidable damage without Damage Down; named Major =
// root cause of death/wipe or confirmed avoidable Damage Down; Raid =
// established unrecoverable state. Correct soak/buster damage deaths are
// mitigation concerns. A casualty is not automatically the responsible
// player; no independent flags for downstream effects of an earlier death.
//
// -- NAUR SLOTS, CLOCK SPOTS, AND PASS TRAFFIC --
// True north unless stated otherwise. NAUR/Elinabin uses split positions
// for much of P2: MT owns BJ north, OT owns CC south, then recenters for
// the final shared buster. This plan is not the stacked/Tollgate variant.
// Opening clock, green floor ring: MT N; M1 NE; shield healer E;
// caster SE; OT S; phys SW; regen healer W; M2 NW.
// DPS rotate CCW after first Photon to the support slot immediately CCW:
// M1<->MT, M2<->regen, caster<->shield, phys<->OT. Repeat those partners
// after mines/Enumerations. Supports plant; DPS move for both early passes.
// Pass 3 uses Verdict color instead of the original partner. Supports
// line N->S: MT / current lightning healer / other healer / OT. Melees
// approach on W half, ranged on E half; crossing the entire line invites
// contact with an unrelated Nisi. Pass 4 occurs at the ice block.
// BPOG color line means Alpha blue / Gamma purple / Beta orange / Delta
// green, NOT alphabetical alpha-beta-gamma-delta order. Line east of the
// west ice block, pair matching colors and hide from CC behind the block.
//
// -- JUDGMENT NISI / VERDICT / GAVEL --
// Candidate casts: Judgment Nisi 18494; Verdict 18491; Gavel 18492;
// penalty/enrage Final Sentence 18518 (specific trigger needs verification).
// Raw transferable Final Decree statuses: alpha 2222, beta 2223,
// gamma 2137, delta 2138. Required Final Judgment statuses from Verdict:
// alpha 2224, beta 2225, gamma 2139, delta 2140. They are distinct auras.
// What happens: four transferable colors begin on either all DPS or all
// supports. Contact COPIES a color to an unmarked player; it does not
// instantly delete the donor's copy. The donor's older timer expires, so
// pass windows temporarily have eight live copies. Different-color
// contact kills the colliding players and normally dooms the phase.
// Keep each color alive via four planned passes, then ensure all eight
// players hold the color their own Verdict requires at Gavel resolution.
// Verdict pairs one DPS and one support per required color. The third and
// fourth contacts therefore follow color matching, not fixed early pairs.
// Correct play: use separate positions within stack radii, plant assigned
// receivers, keep all four colors alive. Wait until all Nisi actually
// disappear after Gavel before freely crossing the party.
// Failure: color collision -> LOG SIGNAL: incompatible transferable
// statuses at contact / immediate deaths / possible Final Sentence;
// FAULT: player who crossed the agreed stationary/traffic assignment if
// known, otherwise both contact candidates unresolved; CONSEQUENCE: Major
// when attributable, Raid for the unrecoverable color/death state.
// Failure: last copy expires -> LOG SIGNAL: last live carrier loses a
// required color before next receiver gains it; FAULT: missed passer or
// receiver only with assignment/timing evidence; CONSEQUENCE: Raid.
// Failure: wrong/missing final color -> LOG SIGNAL: Gavel resolution with
// mismatched Final Decree vs required Final Judgment and wipe penalty;
// FAULT: missed pair duty if established; CONSEQUENCE: Raid + named Major.
// Removal: transfers create new aura applications while old copies expire;
// no Esuna. Gavel eventually clears them. Death removes the copy; if it was
// the last copy, the color cannot be restored. Death-caused loss is fallout.
// Not errors: eight temporary copies, ordinary DoT ticks, donors losing
// Nisi after a good pass, carefully spaced elemental/Enumeration stacks.
//
// -- LINK-UP / COMPRESSED WATER AND LIGHTNING --
// Link-Up control cast 18495. Raw statuses: Compressed Water 2142,
// Compressed Lightning 2143. Resolve hits: Crashing Wave 18496,
// Crashing Thunder 18497. Death penalties: Punishing Wave 18498,
// Punishing Thunder 18499. These penalties are NOT successful soak hits.
// What happens: initial Water on a healer, Lightning on a DPS, ~30s timers.
// Each expires as an 8y-radius split-damage stack. Water is normally 3+
// players, Lightning exactly carrier + one helper. Debuff moves to an
// eligible participant; previous carrier has resistance down and must
// avoid its next same-element explosion. Three rounds precede Gavel.
// Guides call these Water/Lightning Vulnerability Up; BM's event notes
// call them resistance down. Exact names/IDs/durations remain unverified.
// Water's 3+ is the normal safe plan, not a proven hard count gate: [IV]
// mentions a heavily mitigated two-person Water. Lightning's two-person
// normal resolution controls who inherits it. Water/Lightning reaching
// one person together, or a compressed carrier dying, causes raid penalty.
// Each Water also leaves a tornado, which cannot be left indefinitely.
// NAUR hand-offs:
//   Round 1 Water at D (W): first healer + eligible other healer/ranged;
//   Lightning DPS shares with BJ tank N; CC tank stays clear.
//   Round 2 Water at B (NE): eligible healer/ranged; healer who had first
//   Water takes Lightning from MT N. MT must finish recentering BJ first.
//   Round 3 Water remains B: carrier plus eligible ranged/M1, MT can help
//   if fewer than three; Lightning healer shares SW with OT, or SE with
//   the second Water holder according to who must be excluded from Water.
//   Previous Water holders remain out; keep Nisi contact spacing.
// WD supplies the conditional third-Lightning helper alternatives; a
// universal OT-only assignment would be too strict.
// Failure: carrier death -> LOG SIGNAL: 18498/18499 after carrier death;
// FAULT: the cause of that death, not a second flag on carrier's explosion;
// CONSEQUENCE: Raid cutoff; named Major only for the original proven error.
// Failure: wrong/overlapping stack -> LOG SIGNAL: wrong-element repeat,
// simultaneous stack hits or penalty; FAULT: misplaced carrier/helper
// with assignments established; CONSEQUENCE: Major/Raid if lethal.
// Failure: under-share -> LOG SIGNAL: few Crashing hit recipients and
// lethal split; FAULT: missing assigned helper only if established;
// CONSEQUENCE: Major/Raid. Ordinary low HP alone is mitigation, not fault.
// Removal: expiry is the successful explosion/transfer; death is failure;
// no cleanse. Terminal/Gavel clearing is not proof of a missed explosion.
// Not errors: expected Crashing hits, hand-off status changes, deliberate
// spread inside stack radius, planned two-person Water proven survivable.
//
// -- CHAKRAMS / OPTICAL SIGHT / PHOTON / SPIN CRUSHER --
// Eye of the Chakram 18517: two opposite external actors, 6s cast,
// ~6y-wide long lines aimed through baited positions. Opening stack baits
// them through center; clock spreads leave those paths. Optical Sight
// control 18479 produces Hawk Blaster 18481, 10y circles at player baits.
// Photon control 18486 / per-player effect 18487 sets HP to 1. First
// affects whole party; second only tanks. Nisi DoT continues after Photon.
// Spin Crusher 19058: 3s cast, untelegraphed 90-degree frontal, ~5y plus
// CC hitbox. OT points S, then crosses behind CC to dodge without Nisi
// contact. CC autos 18810 are much more threatening than BJ autos 18811.
// Failure: chakram / ground / Crusher hit -> LOG SIGNAL: 18517/18481/
// 19058 damage and positions; FAULT: wrong baiter if misplaced lane,
// otherwise entrant; CONSEQUENCE: Minor/Major by outcome and Damage Down.
// Photon itself and unavoidable Whirlwind 18882 are never dodge errors.
// Removal: ground attacks expire; Photon is an HP set, not a dispellable
// Doom. Death to its following normal Nisi tick does not prove a bad pass.
//
// -- MISSILE COMMAND / MINES / ENUMERATION / ICE --
// Control 18509. Two farthest from BJ bait Earth Missile 18510 (~5y
// ground circles/sludge), then Hidden Minefield 18513 (~5y placement).
// Hidden Mine 18514 is intended tank soak damage, ~8y splash; missed mine
// penalty Hidden Mine Shrapnel 18515 is raidwide. Ice Earth Missile 18511
// marks one tank, ~6y personal AoE, then expanding lethal ice ground.
// Enumeration 18512 is EXACTLY three players including marked DPS, two
// marks on random DPS. BM notes success may have no damage, failure kills
// everyone inside; its 5y modeled radius is explicitly not verified.
// Correct NAUR: OT + phys bait missiles/mines S, step forward out of
// sludge and placement circles. OT mitigates both mines, one after the
// other with healing. Phys waits until both pop before pass to OT.
// Regen + M2 + M1 are W Enumeration; shield + caster + phys E. M1/phys
// swap if both melee or both ranged receive marks, ensuring one mark
// and three players per side. Neither tank joins these Enumerations.
// Ice tank drops outside near W tornado at D so the expanding puddle
// freezes it into Gelid Gaol; do not stand on the tornado to place ice.
// Finish own duties, restore boss position, then conduct Nisi pass 2.
// Failure: unsoaked mine -> LOG SIGNAL: distinct 18515; FAULT: assigned
// mine tank if a living/available duty was missed; CONSEQUENCE: Raid.
// Failure: mine clips party -> LOG SIGNAL: 18514 on nonassigned players;
// FAULT: premature passer/entrant or misplaced mine baiter as established;
// CONSEQUENCE: Minor/Major. Tank's intended two hits are not failures.
// Failure: Enumeration wrong count -> LOG SIGNAL: 18512 deaths in ring,
// wrong occupancy if positions available; FAULT: missing/extra assigned
// person or wrong marked flex, not all victims; CONSEQUENCE: Major, Raid
// when the resulting Nisi/element state is unrecoverable.
// Failure: ice misses tornado -> LOG SIGNAL: no Gelid Gaol / later
// tornado penalty or failed LOS; FAULT: marked ice tank if placement
// evidence settles it; CONSEQUENCE: Raid when objective is lost.
// Removal: mines disappear on soak or timed detonation. Sludge/ice ground
// dissipate after the sequence; frozen pillar persists for Propeller Wind.
// Empty success damage for Enumeration does not establish a missing cast.
//
// -- PLASMA SHIELD / FLARETHROWER / TORNADO LIFECYCLE --
// Limit Cut control 18483, CC boss aura Invincibility raw 775; shield
// Directional Invincibility raw 1125. This is NOT numbered Limit Cut.
// Shield takes damage only from its FRONT; burst it in its short window
// (~5-6s in strategy descriptions). Failure gives CC Damage Up, then a
// lethal Whirlwind. Exact penalty buff mapping/deadline need a report.
// Correct NAUR: OT brings CC SW facing ranged/center; phys, caster and
// OT attack the shield from front. Melees may remain on BJ. Do not assume
// everyone's absence from shield damage is a mechanic error.
// Simultaneous Flarethrower control 18501 / cone damage 18502 targets
// BJ's nearest player, not inherently its tank. MT baits it through the
// second tornado at B and away from shield/ranged. Cone angle in BM is
// provisional; 90 degrees must not be treated as a verified hit boundary.
// Water tornado 1 (W) is frozen by Ice; tornado 2 (NE) is deleted by fire;
// tornado 3 remains until Gavel/phase cleanup. Close contact with a live
// tornado causes Drainage P2 18500, ~6y splash/10y knockback, not P1 soak.
// Unresolved tornado enrage candidate Severe Contamination 18891 is
// commented/unconfirmed in BM; name/ID require log verification.
// Failure: shield left alive -> LOG SIGNAL: shield persists, CC Damage Up
// / lethal 18882; FAULT: collective unless a concrete assigned contribution
// was missed; CONSEQUENCE: Raid. Insufficient damage is not blame-by-rank.
// Failure: wrong-direction shield attack -> LOG SIGNAL: immune attacks
// from outside frontal side; FAULT: attacker if geometry established;
// CONSEQUENCE: Major only when it causes objective failure.
// Failure: wrong fire aim -> LOG SIGNAL: 18502 targets / surviving second
// tornado; FAULT: wrong closest bait or MT aim, as proven; CONSEQUENCE:
// Minor/Major for clipping, Raid for failed tornado objective.
// Removal: shield defeat ends invincibility; correct Ice/fire removes
// tornadoes. Gavel cleanup is normal. No player dispel for any of these.
//
// -- PROPELLER WIND / GAVEL / ENDING BUSTERS --
// Propeller Wind 18482, 6s cast: line-of-sight behind frozen tornado
// relative to CC. Failure confuses the exposed player, risking Nisi
// collision. Correct play: CC opposite pillar from party, BPOG line,
// fourth matching pass, wait for post-Gavel Nisi removal before moving.
// Failure: exposed -> LOG SIGNAL: 18482 effect / confusion status (ID
// unverified); FAULT: player outside proper shadow, or CC tank if it moved
// the source and broke valid LOS; CONSEQUENCE: Major if it causes deaths,
// Raid when Nisi/Gavel can no longer resolve. Forced movement fallout is
// not a second collision accusation. Gavel correctness is described above.
// Double Rocket Punch 18503 is a shared tank buster, 4s cast/~3y splash.
// [IV]'s bullet incorrectly repeats the Super Jump description here;
// BM's definition/state machine and WD agree it is the shared buster.
// Heal tank Photon first, stack tanks near wall, share with mitigation
// or use the agreed invulnerability. Party stays away from tanks.
// Super Jump control 18505 / ground damage 18506: farthest target, ~10y
// circle. NAUR phys baits E wall; everyone else W. Baiter sidesteps after
// jump. Apocalyptic Ray control 18507 / cone pulses 18508, five hits;
// BM approximates ~25.5y/90 degrees with angle unverified, aimed toward
// CC/BJ target logic needing confirmation. Party must stay outside cone.
// Failure: jump/ray clips -> LOG SIGNAL: 18506/18508 extra victims;
// FAULT: bad farthest bait or entrant if established; CONSEQUENCE: Major
// if lethal, otherwise Minor unless Damage Down confirmed.
// Not errors: shared/invulnerable tank buster, assigned jump hit, correctly
// mitigated raidwides. A buster death alone is not a mechanic failure.
//
// -- VARIANTS AND PULL-END STATES --
// Stacked / Strat 5 / Tollgate keeps bosses together for cleave and uses
// different stack/mine routes. Split plans trade that cleave for space;
// NAUR's OT taking BOTH mines is intentional, while another plan may
// split one mine per tank. Nisi passers can be DPS-move, support-move,
// unmarked-move or marked-move. BPOG is a chosen color order, not a rule
// of the encounter; different consistent color lines can satisfy Gavel.
// Nisi collision/lost color, compressed carrier death, unsoaked mine,
// unresolved shield/tornado or failed Gavel normally ends the pull.
// Surviving avoidable ground damage alone does not establish a cutoff.
// Killing one boss too early causes the partner's accelerated enrage;
// ordinary final enrages are 18518 / 18490. Defeat both before completion.
// Early phase kills and omitted late Whirlwinds/jump are not errors.
//
// -- OPEN QUESTIONS FOR LOG VERIFICATION --
// 1. Nisi original/refreshed lifetimes, contact radius, exact collision
//    killing action, and Gavel-vs-timed Final Sentence event signatures.
// 2. Elemental resistance names/durations, hard vs practical soak counts,
//    inheritance eligibility, third-round helper, death/explosion order,
//    and removal/transfer behavior when Gavel clears remaining debuffs.
// 3. Missing-mine and tornado penalty IDs, deadlines, ice growth/LOS width,
//    and whether all relevant ground/pillar actors are exported to FFLogs.
// 4. Enumeration success visibility, failure radius, marked-target data,
//    shield front-angle/deadline, Damage Up aura, actual shield assignees.
// 5. Propeller confusion name/removal and attribution when CC moves;
//    Apocalyptic Ray's exact targeting and geometry after Super Jump.
// 6. Last-boss defeat windows, HP/targetability evidence and exact late
//    enrage clock; distinguish voluntary edge resets and death fallout.

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import type { ReportedOccurrence } from "@/lib/mechanics/occurrences";
import { FF_JOB_BY_NAME } from "@/lib/ffl-job-data";
import { kFmt, joinNames, playerError, playerlessMinor, raidMarker } from "@/lib/mechanics/wow/common";
import {
  DEATH_EVENT_LAG_MS, type Life, bodyHit, buildLife, castsOf, uniq, namesOf, realAmount, resetCluster, isTank,
} from "@/lib/mechanics/ffxiv/fru/common";

export const BJCC_AVOIDABLE_RULE_ID       = "ffxiv-bjcc-avoidable";
export const BJCC_NISI_COLLISION_RULE_ID  = "ffxiv-bjcc-nisi-collision";
export const BJCC_NISI_WRONG_RULE_ID      = "ffxiv-bjcc-nisi-wrong-color";
export const BJCC_NISI_DROPPED_RULE_ID    = "ffxiv-bjcc-nisi-dropped";
export const BJCC_NISI_FAILED_RULE_ID     = "ffxiv-bjcc-nisi-failed";
export const BJCC_NISI_DEATH_RULE_ID      = "ffxiv-bjcc-nisi-death";
export const BJCC_WALL_RULE_ID            = "ffxiv-bjcc-wall";
export const BJCC_GAVEL_RULE_ID           = "ffxiv-bjcc-gavel";
export const BJCC_WATER_SHORT_RULE_ID     = "ffxiv-bjcc-water-short";
export const BJCC_LIGHTNING_ALONE_RULE_ID = "ffxiv-bjcc-lightning-alone";
export const BJCC_LIGHTNING_EXTRA_RULE_ID = "ffxiv-bjcc-lightning-extra";
export const BJCC_PUNISHING_RULE_ID       = "ffxiv-bjcc-punishing";
export const BJCC_MINE_MISSED_RULE_ID     = "ffxiv-bjcc-mine-missed";
export const BJCC_MINE_CLIP_RULE_ID       = "ffxiv-bjcc-mine-clip";
export const BJCC_SHRAPNEL_RULE_ID        = "ffxiv-bjcc-shrapnel";
export const BJCC_ICE_RULE_ID             = "ffxiv-bjcc-ice";
export const BJCC_FLARETHROWER_RULE_ID    = "ffxiv-bjcc-flarethrower";
export const BJCC_CONTAMINATION_RULE_ID   = "ffxiv-bjcc-severe-contamination";
export const BJCC_SHIELD_RULE_ID          = "ffxiv-bjcc-shield";
export const BJCC_CALLED_WIPE_RULE_ID     = "ffxiv-bjcc-called-wipe";
export const BJCC_COLLAPSE_RULE_ID        = "ffxiv-bjcc-collapse";
export const BJCC_TANK_DEAD_RULE_ID       = "ffxiv-bjcc-tank-dead";
export const BJCC_CHAKRAM_BAIT_RULE_ID    = "ffxiv-bjcc-chakram-bait";
export const BJCC_LIGHTNING_SWAP_RULE_ID  = "ffxiv-bjcc-lightning-swap";
export const BJCC_CHAKRAM_DEATH_RULE_ID   = "ffxiv-bjcc-chakram-death";

const J_KICK          = 18516;
const JUDGMENT_NISI   = 18494;
const VERDICT         = 18491;
const GAVEL           = 18492;
const FINAL_SENTENCE  = 18493;     // the Nisi penalty: a death, no damage event
const LIMIT_CUT       = 18483;     // Plasma Shield goes up
const TEMPORAL_STASIS = 18522;     // the next phase's first cast
const CRASHING_WAVE   = 18496;
const CRASHING_THUNDER = 18497;
const PUNISHING_WAVE  = 18498;
const PUNISHING_THUNDER = 18499;
const COMPRESSED_WATER = 1002142;
const COMPRESSED_LIGHTNING = 1002143;
const WATER_RES_DOWN  = 1002144;
const LIGHTNING_RES_DOWN = 1002145;
const ICE_MISSILE     = 18511;     // Earth Missile on a tank: the ice
const HIDDEN_MINE     = 18514;
const MINE_SHRAPNEL   = 18515;
const FLARETHROWER    = 18502;
const SEVERE_CONTAMINATION = 18891; // a tornado left alive
const WHIRLWIND       = 18882;
const BJ_ATTACK       = 18811;
const PHOTON          = 18487;
const CHAKRAM         = 18517;     // Eye of the Chakram

const NISI: Record<number, string> = { 1002222: "α", 1002223: "β", 1002137: "γ", 1002138: "δ" };
const JUDGMENT: Record<number, string> = { 1002224: "α", 1002225: "β", 1002139: "γ", 1002140: "δ" };

type Avoidable = { name: string; advice: string };
// Hits in no BJ/CC clear (11 on disk). Shadowbringers: no Damage Down from
// any of these, so Minor unless the hit killed (PITFALLS).
const AVOIDABLE: Record<number, Avoidable> = {
  18517: { name: "Eye of the Chakram", advice: "the chakrams fire long lines through the center: after baiting them in the stack, step off their paths" },
  18481: { name: "Hawk Blaster", advice: "Optical Sight drops a circle on every player: move out of your own before it lands" },
  19058: { name: "Spin Crusher", advice: "Cruise Chaser's untelegraphed frontal: only its tank stays near the front, and moves behind it during the cast" },
  18500: { name: "Drainage", advice: "every Water explosion leaves a tornado: move off the stack spot right after it goes off and never walk through a tornado" },
  1000287: { name: "Sludge", advice: "the Earth Missile puddles stay on the ground: the missile baiters step out, everyone else stays clear" },
  1000285: { name: "Frostbite", advice: "the ice tank's puddle expands until it freezes the tornado: keep away from it, and the ice tank drops it beside the tornado, not under themselves" },
  18482: { name: "Propeller Wind", advice: "hide behind the frozen tornado, on the side away from Cruise Chaser" },
};

// Water was shared by 3-4 players in 90 of 95 rounds (B, C); every 1- or
// 2-player Water killed its takers (B24, B30, C6, C11, C19).
const WATER_MIN = 3;
// The second Whirlwind with an unbroken shield (Damage Up) hit 22-47k and
// killed all eight (B47); with the shield broken it hit up to 19k (B37).
const SHIELD_WHIRLWIND_MEDIAN = 24_000;
// The Plasma Shield broke 4.1-8.2s after Limit Cut in every pull that broke
// it (timed out at +9.1); the Whirlwind it powers comes at +14.2.
const SHIELD_WINDOW_MS = 10_000;
// Pulls ending within 30s of J Kick are Limit Cut's (intermission-limit-cut.ts).
const LC_HANDOFF_MS = 30_000;
const COLLAPSE_DEAD_COUNT = 4;   // 4 dead -> pull over within 15s in all three reports
const COLLAPSE_END_MS     = 30_000;
const CALLED_WIPE_COUNT   = 3;
const CALLED_WIPE_WINDOW  = 10_000;
const CALLED_WIPE_END_MS  = 12_000;
// Photon leaves everyone at 1 HP; a Nisi tick right after kills with no
// killing blow (B8, B12). That's healing, not a reset.
const PHOTON_DOT_MS = 10_000;
// A Nisi-death cutoff yields to a penalty this soon after it (Punishing on
// a carrier's death lands within ~0.2s).
const NISI_DEATH_YIELD_MS = 3_000;
// A color whose other copies all run out this soon after its holder died
// is lost with them (B25: 1.8s). A fresh copy lasts 36s.
const NISI_LAST_COPY_MS = 5_000;
// A no-killing-blow death this soon after a Drainage knockback or Propeller
// Wind is that hit's (knockbacks off the edge die 2.1-3.4s later elsewhere
// in TEA).
const WALL_PUSH_MS = 6_000;
// Hits that knock back: Spin Crusher, Drainage (10y), and the death event
// of a knock into the wall lands this long after (B11: 3.6s; Limit Cut's
// knock-offs 2.1-3.1s).
const KNOCKBACK = [19058, 18500];
const KNOCKED_MIN_MS = 1_800;
const KNOCKED_MAX_MS = 4_500;
// Drainage's victim dying to anything this soon after (death event; B36:
// 4.4s) died of it.
const DRAINAGE_DEATH_MS = 5_000;

type Iv = { p: PlayerInfo; col: string; a: number; b: number };

const isDps = (p: PlayerInfo) => p.role === "DPS";
const range = (p: PlayerInfo) => FF_JOB_BY_NAME[p.specName.replace(/ /g, "")]?.rangeType;
const ranged = (p: PlayerInfo) => isDps(p) && range(p) !== "Melee";
const sameSide = (a: PlayerInfo, b: PlayerInfo) => isDps(a) === isDps(b);

/** A death's cause for a description: the killing ability, or what it wasn't. */
function causeOf(players: PlayerInfo[], d: DeathEvent): string {
  if (d.killingAbilityGameId) {
    const p = players.find((x) => x.name === d.player);
    const hit = p?.damageTaken.filter((e) => e.abilityId === d.killingAbilityGameId && e.timestamp <= d.timestamp).pop();
    return d.cause || hit?.abilityName || "an attack";
  }
  return afterPhoton(players, d) ? "a Decree Nisi tick at 1 HP after Photon" : "no killing blow";
}

/** One status's intervals on one player, refreshes merged. */
function intervals(p: PlayerInfo, ids: number[]): { id: number; a: number; b: number }[] {
  const out: { id: number; a: number; b: number }[] = [];
  for (const id of ids) {
    let open: number | null = null;
    for (const e of p.debuffs.filter((x) => x.abilityId === id).sort((x, y) => x.timestamp - y.timestamp)) {
      if (e.debuffStatus === "applied") { if (open === null) open = e.timestamp; }
      else if (open !== null) { out.push({ id, a: open, b: e.timestamp }); open = null; }
    }
    if (open !== null) out.push({ id, a: open, b: Infinity });
  }
  return out;
}
const holds = (p: PlayerInfo, id: number, t: number) => intervals(p, [id]).some((w) => w.a <= t && w.b > t);
/** A death soon after Photon left the player at 1 HP: a Nisi tick, not a reset. */
function afterPhoton(players: PlayerInfo[], d: DeathEvent): boolean {
  const p = players.find((x) => x.name === d.player);
  return !!p && p.damageTaken.some((e: PlayerEvent) => e.abilityId === PHOTON && e.timestamp <= d.timestamp && d.timestamp - e.timestamp <= PHOTON_DOT_MS);
}

/**
 * The Epic of Alexander, Phase 2: Brute Justice and Cruise Chaser. Self-gates
 * on Judgment Nisi (only this phase casts it) and covers J Kick to Temporal
 * Stasis, or to the last logged event.
 */
export function detectBjccErrors(
  players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], occurrences?: ReportedOccurrence[],
): PullError[] {
  const nisiCast = castsOf(enemyCasts, JUDGMENT_NISI, Infinity)[0];
  if (!nisiCast) return [];
  const kick = castsOf(enemyCasts, J_KICK, nisiCast.timestamp).pop();
  const start = kick ? kick.timestamp : nisiCast.timestamp - 15_000;
  const stasis = enemyCasts.find((c) => c.abilityId === TEMPORAL_STASIS && c.timestamp > start);
  const lastEvent = Math.max(0, ...players.flatMap((p) => [...p.damageTaken, ...p.casts].map((e) => e.timestamp)));
  const end = stasis ? stasis.timestamp : lastEvent;
  const life = buildLife(players, deathEvents);
  const inWindow = (t: number) => t >= start && t <= end;
  const casts = enemyCasts.filter((c) => inWindow(c.timestamp));

  // Brute Justice's tank: the tank its autos hit most before the Water and
  // Lightning go off (the Warrior in every pull on disk).
  const tanks = players.filter(isTank);
  const bjHits = (p: PlayerInfo) => p.damageTaken.filter((e) => e.abilityId === BJ_ATTACK && e.timestamp >= start && e.timestamp <= start + 50_000).length;
  const mt = [...tanks].sort((a, b) => bjHits(b) - bjHits(a))[0];
  const ot = tanks.find((p) => p !== mt);

  const errors: PullError[] = [];
  const raids: PullError[] = [];
  errors.push(...detectAvoidables(players, life, deathEvents, start, end));
  const resets = resetDeaths(players, deathEvents, start, lastEvent);
  errors.push(...detectWallDeaths(players, deathEvents, start, end, resets));
  const nisi = detectNisi(players, deathEvents, life, casts, start, end, resets);
  errors.push(...nisi.errors);
  raids.push(...nisi.raids);
  const el = detectElements(players, deathEvents, life, casts, mt, ot, lastEvent, occurrences);
  errors.push(...el.errors);
  raids.push(...el.raids);
  const arena = detectArena(players, life, casts, mt, occurrences);
  errors.push(...arena.errors);
  raids.push(...arena.raids);
  // A tank dying before Gavel ends the pull: each tank holds a boss and
  // carries a Lightning helper and the mines (user, 2026-10-17, E18 +3:59:
  // "the moment the tank dies, the mechanic becomes unresolvable"; E22
  // +2:41.7 the Warrior's chakram death). Not on a Limit Cut wipe.
  const gavelT = casts.find((c) => c.abilityId === GAVEL)?.timestamp ?? end;
  const tankDeath = deathEvents.filter((d) => tanks.some((p) => p.name === d.player) && !resets.has(d)
    && d.timestamp - DEATH_EVENT_LAG_MS >= start && d.timestamp - DEATH_EVENT_LAG_MS < gavelT)
    .sort((a, b) => a.timestamp - b.timestamp)[0];
  // A death to Eye of the Chakram, just before the first Nisi pass, ends
  // the pull (user, 2026-10-17, F5 +2:44.5: "the death to the Chakram
  // basically ends the pull. Everyone walks into the wall after").
  // A tank's chakram death is already the tank's cutoff (E22).
  const chakramDeath = deathEvents.filter((d) => d.killingAbilityGameId === CHAKRAM && !resets.has(d) && !tanks.some((p) => p.name === d.player)
    && d.timestamp - DEATH_EVENT_LAG_MS >= start && d.timestamp - DEATH_EVENT_LAG_MS < gavelT)
    .sort((a, b) => a.timestamp - b.timestamp)[0];
  if (chakramDeath && end - start > LC_HANDOFF_MS) raids.push(raidMarker(BJCC_CHAKRAM_DEATH_RULE_ID, "Death to a Chakram",
    `${chakramDeath.player} died to Eye of the Chakram right before the first Decree Nisi pass, which needs everyone. Treated as the cutoff point.`,
    chakramDeath.timestamp - DEATH_EVENT_LAG_MS, CHAKRAM, "Eye of the Chakram"));
  if (tankDeath && end - start > LC_HANDOFF_MS) raids.push(raidMarker(BJCC_TANK_DEAD_RULE_ID, "Tank Died",
    `${tankDeath.player} died (${causeOf(players, tankDeath)}) before Gavel. Each tank holds a boss and has duties (Lightning, mines, Flarethrower, Decree Nisi): the phase can't be resolved without them. Treated as the cutoff point.`,
    tankDeath.timestamp - DEATH_EVENT_LAG_MS, tankDeath.killingAbilityGameId, tankDeath.cause || "Death"));

  // Only the earliest mechanic Raid marker; generic cutoffs only without one,
  // and only for this phase's own wipes.
  raids.sort((a, b) => a.timestamp - b.timestamp);
  let firstRaid = raids[0];
  // A death that also set off Punishing (its carrier) or another mechanic
  // penalty within 3s: that penalty names the same death more precisely.
  // A tank's death yields the same way, and to the Nisi color it took with
  // it (B31, B36) or a penalty it caused (B38 Shrapnel, D8 Punishing).
  const rank = (r: PullError) => (r.ruleId === BJCC_TANK_DEAD_RULE_ID || r.ruleId === BJCC_CHAKRAM_DEATH_RULE_ID ? 0 : r.ruleId === BJCC_NISI_DEATH_RULE_ID ? 1 : 2);
  while (firstRaid && rank(firstRaid) < 2) {
    const from = firstRaid;
    const same = raids.find((r) => r.timestamp >= from.timestamp && r.timestamp - from.timestamp <= NISI_DEATH_YIELD_MS && rank(r) > rank(from));
    if (!same) break;
    firstRaid = same;
  }
  if (firstRaid) errors.push(firstRaid);
  else if (!stasis && lastEvent - start > LC_HANDOFF_MS) {
    const marker = genericCutoff(players, deathEvents, life, start, lastEvent);
    if (marker) errors.push(marker);
  }
  return errors.sort((a, b) => a.timestamp - b.timestamp);
}

/** Avoidable ground and frontal hits: one error per player per ability per 3s. */
function detectAvoidables(players: PlayerInfo[], life: Life, deaths: DeathEvent[], start: number, end: number): PullError[] {
  const out: PullError[] = [];
  for (const p of players) {
    let last: { id: number; t: number } | undefined;
    for (const e of p.damageTaken.filter((x) => AVOIDABLE[x.abilityId] && x.timestamp >= start && x.timestamp <= end && !bodyHit(x)).sort((a, b) => a.timestamp - b.timestamp)) {
      if (!life.hitAlive(p, e.timestamp)) continue;
      if (last && last.id === e.abilityId && e.timestamp - last.t <= 3000) continue;
      // Knocked into the wall: a no-killing-blow death right after a
      // knockback hit, even one an invulnerability took to 0 (user,
      // 2026-10-16, B11 +3:06.6: Spin Crusher for 0, dead 1.6s later).
      const wall = KNOCKBACK.includes(e.abilityId) ? deaths.find((d) => d.player === p.name && !d.killingAbilityGameId && d.timestamp - e.timestamp >= KNOCKED_MIN_MS && d.timestamp - e.timestamp <= KNOCKED_MAX_MS) : undefined;
      // Drainage leaves its victim low: a death within ~3s to anything is
      // its (B36 +3:20.4: 33k, then a mine 2.4s later; user: Major).
      const died = wall ?? life.diedFrom(p, e.timestamp) ?? (e.abilityId === 18500 ? deaths.find((d) => d.player === p.name && d.timestamp >= e.timestamp && d.timestamp - e.timestamp <= DRAINAGE_DEATH_MS) : undefined);
      if (!died && realAmount(e) <= 0) continue;   // an invulnerability
      last = { id: e.abilityId, t: e.timestamp };
      const k = AVOIDABLE[e.abilityId];
      // A chakram on a tank: the tanks hold the bosses where they must, so
      // it was baited wrongly, by someone the log can't name (user,
      // 2026-10-17, E22 +2:41.7: the Warrior "didn't make a mistake").
      if (e.abilityId === CHAKRAM && isTank(p)) {
        out.push(playerlessMinor(BJCC_CHAKRAM_BAIT_RULE_ID, "Chakram Baited Into a Tank",
          `Eye of the Chakram ran through ${p.name}, a tank holding a boss (${kFmt(realAmount(e))})${died ? ", who died" : ""}: the chakrams were baited onto the tanks' line. The log can't say who baited them; the stack baits them through the center, away from both bosses' tanks.`,
          e.timestamp, CHAKRAM, k.name));
        continue;
      }
      out.push(playerError(p, {
        ruleId: BJCC_AVOIDABLE_RULE_ID, severity: died ? "Major" : "Minor", name: `Hit by ${k.name}`,
        description: `Hit by ${k.name}${realAmount(e) > 0 ? ` (${kFmt(realAmount(e))})` : ""}${wall ? ", knocked into the wall and died" : died ? " and died" : ""}: ${k.advice}.`,
        timestamp: e.timestamp, abilityId: e.abilityId, abilityName: k.name,
      }));
    }
  }
  return out;
}

const NISI_ADVICE = "Keep apart from every other Decree Nisi carrier and touch only your partner for the pass";

/**
 * Decree Nisi. Contact copies a color onto an unmarked player; contact
 * between two different colors gives each the other's (same millisecond)
 * and Final Sentence kills both ~0.8s later. After Verdict every player
 * must end on their Final Judgment color at Gavel. The failures:
 * - collision: a player holding two colors at once (B1, B8, B11, B22, B37,
 *   B43, C4, C19, C22; never in a clear);
 * - wrong color: after Verdict a player picks up a color their Judgment
 *   doesn't match (B22, B31, B40, C8, C21) and can't lose it before Gavel;
 * - dropped: a color's last copy runs out on a living player with nobody
 *   taking it (B4, B14, B19, B25, B36, B38, B42, C6).
 * Each dooms the pull: Gavel then kills everyone (B40, B42, C8).
 */
function detectNisi(players: PlayerInfo[], deaths: DeathEvent[], life: Life, casts: EnemyEvent[], start: number, end: number, resets: Set<DeathEvent>) {
  const errors: PullError[] = [];
  const raids: PullError[] = [];
  const ivs: Iv[] = players.flatMap((p) => intervals(p, Object.keys(NISI).map(Number))
    .filter((w) => w.b >= start && w.a <= end).map((w) => ({ p, col: NISI[w.id], a: w.a, b: w.b })));
  const judgment = new Map<PlayerInfo, string>();
  for (const p of players) {
    const j = p.debuffs.find((e) => JUDGMENT[e.abilityId] && e.debuffStatus === "applied" && e.timestamp >= start && e.timestamp <= end);
    if (j) judgment.set(p, JUDGMENT[j.abilityId]);
  }
  const verdict = casts.find((c) => c.abilityId === VERDICT);
  const gavel = casts.find((c) => c.abilityId === GAVEL);
  const sentenced = (p: PlayerInfo, t: number) => deaths.some((d) => d.player === p.name && d.killingAbilityGameId === FINAL_SENTENCE && d.timestamp >= t && d.timestamp <= t + 4000);
  const fail = (t: number, what: string) => raids.push(raidMarker(BJCC_NISI_FAILED_RULE_ID, "Decree Nisi Failed",
    `${what} The Nisi colors can't all reach Gavel from here; unresolvable from here, treated as the cutoff point.`, t, FINAL_SENTENCE, "Final Sentence"));
  const passOf = (t: number) => {
    const rel = t - start;
    return rel < 30_000 ? 0 : rel < 55_000 ? 1 : rel < 82_000 ? 2 : rel < 110_000 ? 3 : 4;
  };
  const passName = (t: number) => ["before the first pass", "at the first pass", "at the second pass", "at the third pass", "at the fourth pass"][passOf(t)];

  // Every player must be alive from Judgment Nisi to Gavel to hold a color
  // (user, 2026-10-16: B1's sage dead since Limit Cut made its first-pass
  // collision fallout; B25 the Paladin's death lost the color it held; B31
  // the dancer's death to a mine made the pass-3 wrong color fallout).
  // Nisi errors after that are its fallout, and the death is the cutoff.
  const applyT = Math.min(...ivs.filter((w) => w.a >= start).map((w) => w.a));
  const lastT = gavel ? gavel.timestamp - 1000 : end;
  let lost: { t: number; text: string } | undefined;
  // Two deaths lose the colors: a player dead when Judgment Nisi goes out
  // (user, 2026-10-16, C4: the black mage dead to J Kick, raised 10s
  // later; "at that point everything was kind of over"), or a death taking
  // a color whose only other copies run out within NISI_LAST_COPY_MS (B25:
  // the donor's copy ran out 1.8s after the Paladin died holding the new
  // one). A raised player can still be passed a color, so other deaths
  // aren't the cutoff.
  const deadIn = Number.isFinite(applyT) ? players.filter((p) => !life.alive(p, applyT + 500)) : [];
  if (deadIn.length) {
    lost = { t: applyT, text: `${namesOf(deadIn)} ${deadIn.length === 1 ? "was" : "were"} dead when Judgment Nisi went out, so not every color can be passed and held to Gavel.` };
  } else if (Number.isFinite(applyT)) {
    for (const d of deaths.filter((x) => x.killingAbilityGameId !== FINAL_SENTENCE && !resets.has(x) && x.timestamp - DEATH_EVENT_LAG_MS > applyT && x.timestamp - DEATH_EVENT_LAG_MS < lastT).sort((a, b) => a.timestamp - b.timestamp)) {
      const t = d.timestamp - DEATH_EVENT_LAG_MS;
      const held = ivs.filter((y) => y.p.name === d.player && y.a <= t + 100 && y.b >= t - 100).map((y) => y.col);
      const gone = held.filter((col) => !ivs.some((y) => y.col === col && y.p.name !== d.player && y.a <= t + 100 && y.b > t + NISI_LAST_COPY_MS && life.alive(y.p, t + 100)));
      if (!gone.length) continue;
      lost = { t, text: `${d.player} died (${causeOf(players, d)}) holding Decree Nisi ${gone.join("/")}, its last lasting copy, so the color is lost before Gavel.` };
      break;
    }
  }
  // The cutoff marker isn't on a Limit Cut wipe (ended within 30s of J
  // Kick: that module's); its fallout still is (C4).
  if (lost && end - start > LC_HANDOFF_MS) raids.push(raidMarker(BJCC_NISI_DEATH_RULE_ID, "Decree Nisi Lost to a Death",
    `${lost.text} Unresolvable from here; treated as the cutoff point.`, lost.t, JUDGMENT_NISI, "Judgment Nisi"));
  const fallout = (t: number) => !!lost && t > lost.t;

  // Collisions: gaining a color while holding another.
  const collided = new Set<PlayerInfo>();
  const hits: { t: number; ps: { p: PlayerInfo; had: string; got: string }[] }[] = [];
  for (const x of ivs) {
    const other = ivs.find((y) => y.p === x.p && y.col !== x.col && y.a < x.a + 50 && y.b > x.a + 50);
    if (!other || !life.alive(x.p, x.a)) continue;
    const g = hits.find((h) => Math.abs(h.t - x.a) <= 300);
    const entry = { p: x.p, had: other.col, got: x.col };
    if (g) { if (!g.ps.some((q) => q.p === x.p)) g.ps.push(entry); } else hits.push({ t: x.a, ps: [entry] });
  }
  for (const h of hits) {
    const who = h.ps.map((q) => q.p);
    who.forEach((p) => collided.add(p));
    if (fallout(h.t)) continue;
    for (const q of h.ps) {
      const others = h.ps.filter((o) => o.p !== q.p);
      const dead = sentenced(q.p, h.t);
      errors.push(playerError(q.p, {
        ruleId: BJCC_NISI_COLLISION_RULE_ID, severity: "Major", name: "Decree Nisi Collision",
        description: `Carrying Decree Nisi ${q.had}, they touched ${others.length ? `${namesOf(others.map((o) => o.p))} (${uniq(others.map((o) => o.had)).join("/")})` : "another color"} ${passName(h.t)}: different colors collide${dead ? " and Final Sentence killed them" : ""}. The log can't say which of the two moved. ${NISI_ADVICE}.`,
        timestamp: h.t, abilityId: FINAL_SENTENCE, abilityName: "Final Sentence",
      }));
    }
    fail(h.t, `${namesOf(who)} collided with different Decree Nisi colors ${passName(h.t)}.`);
  }

  // After Verdict: picking up a color the Judgment doesn't match.
  if (verdict) {
    for (const x of ivs) {
      if (x.a < verdict.timestamp || collided.has(x.p) || fallout(x.a)) continue;
      const need = judgment.get(x.p);
      if (!need || need === x.col || !life.alive(x.p, x.a)) continue;
      const donors = ivs.filter((y) => y.col === x.col && y.p !== x.p && y.a < x.a - 50 && y.b >= x.a - 50 && !sameSide(y.p, x.p)).map((y) => y.p);
      const donor = uniq(donors).length === 1 ? donors[0] : undefined;
      // Pass 3: the supports stand in their line and the DPS walk to them,
      // so the DPS of the pair went to the wrong one (user, 2026-10-16, C8
      // +3:58.1: the dancer passed to the wrong healer).
      const dpsMoves = passOf(x.a) === 3 && !!donor;
      const text = `After Verdict they needed ${need} but took ${x.col}${donor ? ` from ${donor.name}` : ""} ${passName(x.a)}. A wrong color can't be undone before Gavel, so Gavel will fail. Match your Final Judgment color with the partner holding it (the BPOG line at the fourth pass).`;
      if (!dpsMoves || isDps(x.p)) errors.push(playerError(x.p, { ruleId: BJCC_NISI_WRONG_RULE_ID, severity: "Major", name: "Wrong Decree Nisi Color", description: text, timestamp: x.a, abilityId: VERDICT, abilityName: "Verdict" }));
      if (donor && (!dpsMoves || isDps(donor))) errors.push(playerError(donor, {
        ruleId: BJCC_NISI_WRONG_RULE_ID, severity: "Major", name: "Wrong Decree Nisi Color",
        description: `Passed Decree Nisi ${x.col} to ${x.p.name}, whose Final Judgment needed ${need} (${passName(x.a)}).${dpsMoves ? " At this pass the supports stand still and the DPS walk to the one whose Judgment matches their color." : " The log can't say which of the two went to the wrong partner."} Pass each color to the player whose Judgment matches it.`,
        timestamp: x.a, abilityId: VERDICT, abilityName: "Verdict",
      }));
      fail(x.a, `${x.p.name} took Decree Nisi ${x.col} against a ${need} Judgment.`);
    }
  }

  // A color's last copy running out on a living player.
  for (const x of ivs) {
    if (x.b === Infinity || x.b > end || collided.has(x.p) || fallout(x.b)) continue;
    if (gavel && x.b >= gavel.timestamp - 1000) continue;            // Gavel clears them
    if (deaths.some((d) => d.player === x.p.name && d.timestamp >= x.b - 500 && d.timestamp <= x.b + DEATH_EVENT_LAG_MS + 800)) continue;
    if (!life.alive(x.p, x.b - 100)) continue;
    if (ivs.some((y) => y !== x && y.col === x.col && y.a <= x.b + 100 && y.b > x.b + 100)) continue;
    // Who should have taken it: after Verdict, the other side's player with
    // that Judgment; before it, the one living player of the other side
    // holding nothing (the partner, by elimination).
    const otherSide = players.filter((p) => !sameSide(p, x.p) && life.alive(p, x.b));
    const holding = (p: PlayerInfo) => ivs.some((y) => y.p === p && y.a <= x.b && y.b > x.b);
    let receiver: PlayerInfo | undefined;
    const t = x.b;
    if (verdict && x.b > verdict.timestamp) {
      const owed = players.find((p) => !sameSide(p, x.p) && judgment.get(p) === x.col);
      // The player it was owed to had died: fallout of that death (C6, the
      // tank who needed it died 0.6s before).
      if (owed && !life.alive(owed, x.b - 1000)) {
        fail(t, `Decree Nisi ${x.col} ran out on ${x.p.name}: ${owed.name}, whose Judgment needed it, was dead.`);
        continue;
      }
      receiver = owed && !holding(owed) ? owed : undefined;
    } else { const free = otherSide.filter((p) => !holding(p)); if (free.length === 1) receiver = free[0]; }
    // Passes 1-3: the supports plant and the DPS walk to them (NAUR; user,
    // 2026-10-16, B14 +3:35.2: the sage stays, the black mage goes to take
    // it), so the DPS of the pair missed it. Pass 4 at the ice: both named.
    const pass = passOf(t);
    const dpsMoves = pass >= 1 && pass <= 3;
    const carrierBlamed = !dpsMoves || isDps(x.p);
    const receiverBlamed = !!receiver && (!dpsMoves || isDps(receiver));
    const whoMissed = dpsMoves ? " The supports stand still for this pass and the DPS walk to them." : " The log can't say whether the carrier or the receiver missed the pass.";
    if (carrierBlamed) errors.push(playerError(x.p, {
      ruleId: BJCC_NISI_DROPPED_RULE_ID, severity: "Major", name: "Decree Nisi Not Passed",
      description: `Their Decree Nisi ${x.col} ran out ${passName(t)} with nobody else holding ${x.col}${receiver ? `; ${receiver.name} should have taken it` : ""}, so the color is lost and Gavel will fail.${whoMissed} Pass before your timer ends.`,
      timestamp: t, abilityId: JUDGMENT_NISI, abilityName: "Judgment Nisi",
    }));
    if (receiver && receiverBlamed) errors.push(playerError(receiver, {
      ruleId: BJCC_NISI_DROPPED_RULE_ID, severity: "Major", name: "Decree Nisi Not Passed",
      description: `${x.p.name}'s Decree Nisi ${x.col} ran out ${passName(t)} and they were the one to take it (${verdict && t > verdict.timestamp ? `their Judgment is ${x.col}` : "the only player of their side without a color"}).${whoMissed}`,
      timestamp: t, abilityId: JUDGMENT_NISI, abilityName: "Judgment Nisi",
    }));
    fail(t, `Decree Nisi ${x.col} ran out on ${x.p.name} with no other copy.`);
  }

  // Gavel: Final Sentence on three or more right after it.
  if (gavel) {
    const killed = deaths.filter((d) => d.killingAbilityGameId === FINAL_SENTENCE && d.timestamp >= gavel.timestamp && d.timestamp <= gavel.timestamp + 8000);
    if (uniq(killed.map((d) => d.player)).length >= 3) {
      const t = gavel.timestamp;
      const dead = players.filter((p) => judgment.has(p) && !life.alive(p, t));
      const wrong = players.filter((p) => life.alive(p, t) && judgment.has(p)).flatMap((p) => {
        const held = ivs.filter((y) => y.p === p && y.a <= t && y.b > t).map((y) => y.col);
        return held.length && !held.includes(judgment.get(p)!) ? [`${p.name} held ${held.join("/")} for ${judgment.get(p)}`] : [];
      });
      const why = [dead.length ? `${namesOf(dead)} ${dead.length === 1 ? "was" : "were"} dead, so ${dead.length === 1 ? "their Judgment" : "their Judgments"} couldn't be met` : "", ...wrong].filter(Boolean);
      raids.push(raidMarker(BJCC_GAVEL_RULE_ID, "Gavel Failed",
        `Final Sentence at Gavel killed ${uniq(killed.map((d) => d.player)).length}${why.length ? `: ${why.join("; ")}` : ""}. Every Final Judgment must be met by a living player when Gavel resolves. Treated as the cutoff point.`,
        t, GAVEL, "Gavel"));
    }
  }
  return { errors, raids };
}

/**
 * Compressed Water and Lightning, three rounds (+51 / +81 / +111 after J
 * Kick). NAUR's split: Water is shared by 3+ of the healers and ranged in
 * rounds 1-2 and by the DPS in round 3; Lightning by exactly two, its
 * carrier and a fixed helper (round 1 Brute Justice's tank, round 2 the
 * healer under Water Resistance Down, round 3 the other tank). A Lightning
 * shared by nobody comes back onto its carrier under Lightning Resistance
 * Down: Punishing Thunder at once (B15).
 */
function detectElements(players: PlayerInfo[], deaths: DeathEvent[], life: Life, casts: EnemyEvent[], mt: PlayerInfo | undefined, ot: PlayerInfo | undefined, lastEvent: number, occurrences?: ReportedOccurrence[]) {
  const errors: PullError[] = [];
  const raids: PullError[] = [];
  const crash = castsOf(casts, [CRASHING_WAVE, CRASHING_THUNDER], Infinity);
  const rounds: number[] = [];
  for (const c of crash) if (!rounds.some((t) => Math.abs(t - c.timestamp) < 1500)) rounds.push(c.timestamp);
  const carrierOf = (id: number, t: number) => players.find((p) => intervals(p, [id]).some((w) => Math.abs(w.b - t) <= 600));
  const hitBy = (id: number, t: number) => uniq(players.filter((p) => life.alive(p, t - 300) && p.damageTaken.some((e) => e.abilityId === id && e.timestamp >= t - 200 && e.timestamp <= t + 1500 && !bodyHit(e))));
  const dmg = (p: PlayerInfo, id: number, t: number) => p.damageTaken.filter((e) => e.abilityId === id && e.timestamp >= t - 200 && e.timestamp <= t + 1500).reduce((s, e) => s + realAmount(e), 0);
  const punishedAfter = (t: number, id: number) => casts.some((c) => c.abilityId === id && c.timestamp >= t && c.timestamp <= t + 6000);

  let shifted = false;
  rounds.forEach((t, i) => {
    const n = i + 1;
    const wCarrier = carrierOf(COMPRESSED_WATER, t);
    const lCarrier = carrierOf(COMPRESSED_LIGHTNING, t);
    const water = hitBy(CRASHING_WAVE, t);
    const light = hitBy(CRASHING_THUNDER, t);
    const wRes = (p: PlayerInfo) => holds(p, WATER_RES_DOWN, t - 100);
    const healers = players.filter((p) => p.role === "Healer");
    const helper = n === 1 ? mt : n === 2 ? (healers.find(wRes) ?? healers.find((p) => !water.includes(p))) : ot;
    // Round 3: the DPS and any healer still free (user, 2026-10-16, B24
    // +4:13.3: both melee and the white mage should have joined).
    const pool = players.filter((p) => (n < 3 ? p.role === "Healer" || ranged(p) : isDps(p) || p.role === "Healer") &&life.alive(p, t - 300) && !wRes(p) && p !== lCarrier && p !== helper);
    if (helper && lCarrier && helper !== lCarrier) occurrences?.push({ mechanicKey: BJCC_LIGHTNING_ALONE_RULE_ID, timestamp: t, players: [helper.name] });
    occurrences?.push({ mechanicKey: BJCC_WATER_SHORT_RULE_ID, timestamp: t, players: pool.map((p) => p.name) });

    // Water shared by too few.
    if (wCarrier && water.length && water.length < WATER_MIN) {
      const missing = pool.filter((p) => !water.includes(p) && p !== wCarrier);
      const killed = water.filter((p) => life.diedFrom(p, t));
      const severe = killed.length > 0 || punishedAfter(t, PUNISHING_WAVE);
      const each = water.map((p) => `${p.name} ${kFmt(dmg(p, CRASHING_WAVE, t))}`).join(", ");
      for (const p of missing) errors.push(playerError(p, {
        ruleId: BJCC_WATER_SHORT_RULE_ID, severity: severe ? "Major" : "Minor", name: "Missed the Water Stack",
        description: `Water round ${n} was shared by only ${water.length} (${each})${killed.length ? `; ${namesOf(killed)} died` : ""}. They were free to take it (${p.role === "Healer" ? "a healer" : "a DPS"} without Water Resistance Down, not in the Lightning pair)${light.includes(p) ? " but stood in the Lightning stack instead" : ""}. Water needs three or more.`,
        timestamp: t, abilityId: CRASHING_WAVE, abilityName: "Crashing Wave",
      }));
    }

    if (!lCarrier || !light.length || shifted) return;
    // Lightning shared with someone other than its helper: it passes to
    // them, and every later round's carrier and helper are off the plan
    // (DPS > MT > Water healer > OT). F13 round 1: the monk shared with the
    // dragoon instead of Brute Justice's tank; round 2 went to that tank and
    // round 3 hit it alone. Later Lightning errors are its fallout.
    // Rounds 1-2 only: round 3's Lightning has no later round to break.
    if (n < 3 && light.length >= 2 && helper && helper !== lCarrier && !light.includes(helper) && life.alive(helper, t - 300)) {
      shifted = true;
      const subs = light.filter((p) => p !== lCarrier);
      const severe = casts.some((c) => c.abilityId === PUNISHING_THUNDER && c.timestamp > t);
      const role = n === 1 ? "Brute Justice's tank" : n === 2 ? "the healer under Water Resistance Down" : "Cruise Chaser's tank";
      // Round 1: the DPS carrier goes to Brute Justice's tank to pass it,
      // so it's theirs alone (user, 2026-10-17, F13 +3:05.6: the monk
      // should have gone to the Warrior; not the dragoon's fault). Round 2
      // names the helper and whoever shared instead.
      const named = n === 1 ? [lCarrier] : [helper, ...subs];
      for (const p of named) errors.push(playerError(p, {
        ruleId: BJCC_LIGHTNING_SWAP_RULE_ID, severity: severe ? "Major" : "Minor", name: "Lightning Passed to the Wrong Player",
        description: n === 1
          ? `Carrying the first Lightning, they shared it with ${namesOf(subs)} instead of going to ${helper.name}, ${role}, so it passed to the wrong player and every later Lightning round was off the plan (DPS > MT > Water healer > OT)${severe ? "; it ended in Punishing Thunder" : ""}. Take the first Lightning to Brute Justice's tank.`
          : `Lightning round ${n} (carried by ${lCarrier.name}) was shared by ${namesOf(subs)} instead of ${helper.name}, ${role}, so it passed to the wrong player and the last round was off the plan (DPS > MT > Water healer > OT)${severe ? "; it ended in Punishing Thunder" : ""}. The log can't say whether ${helper.name} was late or ${namesOf(subs)} stepped in.`,
        timestamp: t, abilityId: CRASHING_THUNDER, abilityName: "Crashing Thunder",
      }));
      return;
    }
    // Lightning alone: its helper never came.
    if (light.length === 1 && light[0] === lCarrier && helper && helper !== lCarrier && life.alive(helper, t - 300)) {
      const severe = punishedAfter(t, PUNISHING_THUNDER) || !!life.diedFrom(lCarrier, t);
      errors.push(playerError(helper, {
        ruleId: BJCC_LIGHTNING_ALONE_RULE_ID, severity: severe ? "Major" : "Minor", name: "Missed the Lightning Stack",
        description: `Lightning round ${n} hit only its carrier, ${lCarrier.name}${severe ? ", and came straight back onto them under Lightning Resistance Down: Punishing Thunder" : ""}. ${n === 1 ? "Brute Justice's tank" : n === 2 ? "The healer under Water Resistance Down" : "Cruise Chaser's tank"} shares this one with the carrier.`,
        timestamp: t, abilityId: CRASHING_THUNDER, abilityName: "Crashing Thunder",
      }));
    }
    // Lightning taken by extra players.
    if (light.length >= 3 && helper && light.includes(helper)) {
      const extras = light.filter((q) => q !== lCarrier && q !== helper);
      // Round 2's carrier is Brute Justice's tank, who takes it at the wall
      // so the melee on the boss stay out (user, 2026-10-16, B24 +3:43.6:
      // the tank should have been closer to the wall; extra damage, Minor).
      if (n === 2 && lCarrier === mt) {
        const died = extras.filter((p) => life.diedFrom(p, t));
        errors.push(playerError(lCarrier, {
          ruleId: BJCC_LIGHTNING_EXTRA_RULE_ID, severity: died.length ? "Major" : "Minor", name: "Lightning Taken Into the Party",
          description: `Lightning round 2 also hit ${namesOf(extras)} besides ${helper.name}${died.length ? `; ${namesOf(died)} died` : ""}. Holding the Lightning, take it at the wall so only the healer joins you and the melee stay on the boss.`,
          timestamp: t, abilityId: CRASHING_THUNDER, abilityName: "Crashing Thunder",
        }));
        return;
      }
      for (const p of extras) {
        const died = life.diedFrom(p, t);
        errors.push(playerError(p, {
          ruleId: BJCC_LIGHTNING_EXTRA_RULE_ID, severity: died ? "Major" : "Minor", name: "Extra in the Lightning Stack",
          description: `Took Lightning round ${n} (${kFmt(dmg(p, CRASHING_THUNDER, t))}) with its carrier ${lCarrier.name} and ${helper.name}${died ? " and died" : ""}. Lightning is for exactly two: the carrier and ${helper.name}.${n < 3 && (p.role === "Healer" || ranged(p)) ? " You belong in the Water stack." : ""}`,
          timestamp: t, abilityId: CRASHING_THUNDER, abilityName: "Crashing Thunder",
        }));
      }
    }
  });

  // Punishing Wave / Thunder: a carrier died, or the status came back onto
  // a player under its resistance. Raid-wide, every one ended the pull.
  for (const c of castsOf(casts, [PUNISHING_WAVE, PUNISHING_THUNDER], Infinity)) {
    const water = c.abilityId === PUNISHING_WAVE;
    const id = water ? COMPRESSED_WATER : COMPRESSED_LIGHTNING;
    const holder = players.find((p) => intervals(p, [id]).some((w) => w.a <= c.timestamp + 200 && w.b >= c.timestamp - 3000));
    const d = holder && deaths.find((x) => x.player === holder.name && x.timestamp >= c.timestamp - 3000 && x.timestamp <= c.timestamp + DEATH_EVENT_LAG_MS + 1000);
    // A carrier's no-killing-blow death near the end is the reset itself
    // (C30): the called wipe is the cutoff, not its Punishing. Not a Nisi
    // tick at 1 HP after Photon (B12).
    const photon = !!d && afterPhoton(players, d);
    if (d && !d.killingAbilityGameId && !photon && lastEvent - d.timestamp <= CALLED_WIPE_END_MS) continue;
    const how = d ? ` (${causeOf(players, d)})` : "";
    const why = !holder ? "" : d ? ` ${holder.name}, carrying Compressed ${water ? "Water" : "Lightning"}, died${how}.` : ` Compressed ${water ? "Water" : "Lightning"} came back onto ${holder.name} under its own Resistance Down.`;
    raids.push(raidMarker(BJCC_PUNISHING_RULE_ID, water ? "Punishing Wave" : "Punishing Thunder",
      `${water ? "Punishing Wave" : "Punishing Thunder"} hit the raid.${why} Unresolvable from here; treated as the cutoff point.`,
      c.timestamp, c.abilityId, water ? "Punishing Wave" : "Punishing Thunder"));
  }
  return { errors, raids };
}

/**
 * Mines, ice, fire, tornadoes and the shield. Cruise Chaser's tank (the
 * Paladin on disk) baits the missiles and soaks both Hidden Mines; Earth
 * Missile's ice lands on a random tank, who drops it to freeze the first
 * tornado; Brute Justice's tank baits Flarethrower through the second.
 */
function detectArena(players: PlayerInfo[], life: Life, casts: EnemyEvent[], mt: PlayerInfo | undefined, occurrences?: ReportedOccurrence[]) {
  const errors: PullError[] = [];
  const raids: PullError[] = [];
  const byName = (n?: string) => players.find((p) => p.name === n);

  // Hidden Mines: the first mine's target is the soaker.
  const mines = castsOf(casts, HIDDEN_MINE, Infinity);
  const soaker = byName(mines[0]?.target);
  if (soaker) occurrences?.push({ mechanicKey: BJCC_MINE_MISSED_RULE_ID, timestamp: mines[0].timestamp, players: [soaker.name] });
  for (const p of players) {
    if (p === soaker) continue;
    for (const e of p.damageTaken.filter((x) => x.abilityId === HIDDEN_MINE && !bodyHit(x) && mines.length && x.timestamp >= mines[0].timestamp - 200 && x.timestamp <= mines[0].timestamp + 15_000)) {
      if (!soaker || !life.alive(soaker, e.timestamp) || !life.hitAlive(p, e.timestamp)) continue;
      const died = life.diedFrom(p, e.timestamp);
      errors.push(playerError(p, {
        ruleId: BJCC_MINE_CLIP_RULE_ID, severity: died ? "Major" : "Minor", name: "Hit by Hidden Mine",
        description: `Caught a Hidden Mine (${kFmt(realAmount(e))})${died ? " and died" : ""} while ${soaker.name} was soaking them. Only the mine tank stands in the mines: wait until both have gone off before moving in.`,
        timestamp: e.timestamp, abilityId: HIDDEN_MINE, abilityName: "Hidden Mine",
      }));
    }
  }
  const shrapnel = castsOf(casts, MINE_SHRAPNEL, Infinity)[0];
  if (shrapnel) {
    const ok = soaker && life.alive(soaker, shrapnel.timestamp);
    if (ok) errors.push(playerError(soaker!, {
      ruleId: BJCC_MINE_MISSED_RULE_ID, severity: "Major", name: "Hidden Mine Not Soaked",
      description: `A Hidden Mine went off unsoaked (Hidden Mine Shrapnel on the whole raid, with Damage Down) while they were alive. The mine tank soaks both mines, one after the other.`,
      timestamp: shrapnel.timestamp, abilityId: MINE_SHRAPNEL, abilityName: "Hidden Mine Shrapnel",
    }));
    raids.push(raidMarker(BJCC_SHRAPNEL_RULE_ID, "Hidden Mine Shrapnel",
      `A Hidden Mine went off unsoaked${soaker && !ok ? ` (${soaker.name}, the mine tank, was dead)` : ""}: Shrapnel on the whole raid with Damage Down. Unresolvable from here; treated as the cutoff point.`,
      shrapnel.timestamp, MINE_SHRAPNEL, "Hidden Mine Shrapnel"));
  }

  // Flarethrower: Brute Justice's nearest player, its tank in every clear.
  const flare = castsOf(casts, FLARETHROWER, Infinity)[0];
  const contamination = castsOf(casts, SEVERE_CONTAMINATION, Infinity);
  if (flare && mt) {
    occurrences?.push({ mechanicKey: BJCC_FLARETHROWER_RULE_ID, timestamp: flare.timestamp, players: [mt.name] });
    const hit = uniq(players.filter((p) => life.alive(p, flare.timestamp) && p.damageTaken.some((e) => e.abilityId === FLARETHROWER && e.timestamp >= flare.timestamp - 100 && e.timestamp <= flare.timestamp + 1500 && !bodyHit(e))));
    const killed = hit.filter((p) => life.diedFrom(p, flare.timestamp + 500));
    const tornadoLeft = contamination.some((c) => c.timestamp > flare.timestamp && c.timestamp - flare.timestamp <= 25_000);
    const others = hit.filter((p) => p !== mt);
    if (others.length && !hit.includes(mt) && life.alive(mt, flare.timestamp)) {
      errors.push(playerError(mt, {
        ruleId: BJCC_FLARETHROWER_RULE_ID, severity: killed.length || tornadoLeft ? "Major" : "Minor", name: "Flarethrower Not Baited",
        description: `Flarethrower went to ${namesOf(others)} instead of them${killed.length ? `; ${namesOf(killed)} died` : ""}${tornadoLeft ? ", and the second tornado survived it (Severe Contamination)" : ""}. It aims at Brute Justice's nearest player: as its tank, stay closest and point the cone through the second tornado, away from the party.`,
        timestamp: flare.timestamp, abilityId: FLARETHROWER, abilityName: "Flarethrower",
      }));
    } else if (hit.includes(mt)) {
      for (const p of others) errors.push(playerError(p, {
        ruleId: BJCC_AVOIDABLE_RULE_ID, severity: life.diedFrom(p, flare.timestamp + 500) ? "Major" : "Minor", name: "Hit by Flarethrower",
        description: `Stood in Flarethrower, baited by ${mt.name}${life.diedFrom(p, flare.timestamp + 500) ? ", and died" : ""}: stay out of Brute Justice's front while its tank aims the cone at the tornado.`,
        timestamp: flare.timestamp, abilityId: FLARETHROWER, abilityName: "Flarethrower",
      }));
    }
  }

  // Severe Contamination: a tornado left alive. Before Flarethrower it's
  // the first (the ice missed it); after, the second (the fire missed it).
  const ice = castsOf(casts, ICE_MISSILE, Infinity)[0];
  const iceTank = byName(ice?.target);
  if (ice && iceTank) occurrences?.push({ mechanicKey: BJCC_ICE_RULE_ID, timestamp: ice.timestamp, players: [iceTank.name] });
  for (const c of contamination) {
    const first = !flare || c.timestamp < flare.timestamp;
    let cause = first ? "The first tornado wasn't frozen by the ice." : "The second tornado wasn't burned by Flarethrower.";
    if (first && iceTank && ice) {
      if (life.alive(iceTank, ice.timestamp + 3000) && life.alive(iceTank, c.timestamp - 5000)) {
        errors.push(playerError(iceTank, {
          ruleId: BJCC_ICE_RULE_ID, severity: "Major", name: "Ice Missed the Tornado",
          description: `They had the ice (Earth Missile) and the first tornado wasn't frozen: Severe Contamination hit the whole raid with Damage Down. Drop the ice right beside the tornado so the expanding puddle freezes it, without standing on the tornado.`,
          timestamp: c.timestamp, abilityId: SEVERE_CONTAMINATION, abilityName: "Severe Contamination",
        }));
      } else cause += ` ${iceTank.name}, who had the ice, died first.`;
    }
    raids.push(raidMarker(BJCC_CONTAMINATION_RULE_ID, "Severe Contamination",
      `${cause} Severe Contamination hit the whole raid with Damage Down. Unresolvable from here; treated as the cutoff point.`,
      c.timestamp, SEVERE_CONTAMINATION, "Severe Contamination"));
  }

  // Plasma Shield left up: Cruise Chaser's Damage Up Whirlwind.
  const lc = castsOf(casts, LIMIT_CUT, Infinity)[0];
  const ww = lc && casts.find((c) => c.abilityId === WHIRLWIND && c.timestamp > lc.timestamp + SHIELD_WINDOW_MS);
  if (ww) {
    const hs = players.flatMap((p) => p.damageTaken.filter((e) => e.abilityId === WHIRLWIND && e.timestamp >= ww.timestamp - 100 && e.timestamp <= ww.timestamp + 2000 && !bodyHit(e)).map((e) => ({ p, e })));
    const amounts = hs.map((h) => realAmount(h.e)).sort((a, b) => a - b);
    const median = amounts.length ? amounts[Math.floor(amounts.length / 2)] : 0;
    if (hs.length >= 4 && median >= SHIELD_WHIRLWIND_MEDIAN) {
      raids.push(raidMarker(BJCC_SHIELD_RULE_ID, "Plasma Shield Not Broken",
        `The Plasma Shield wasn't broken in time, so Cruise Chaser's Whirlwind came with Damage Up (median ${kFmt(median)} per player). Hit the shield from its front during its short window. Unresolvable from here; treated as the cutoff point.`,
        ww.timestamp, WHIRLWIND, "Whirlwind"));
    }
  }
  return { errors, raids };
}

/**
 * No-killing-blow deaths that are the wipe being called: within 12s of the
 * end or 3+ in 10s. A Nisi tick at 1 HP after Photon is not one.
 */
function resetDeaths(players: PlayerInfo[], deaths: DeathEvent[], start: number, lastEvent: number): Set<DeathEvent> {
  const silent = deaths.filter((d) => !d.killingAbilityGameId && d.timestamp - DEATH_EVENT_LAG_MS >= start && !afterPhoton(players, d));
  const out = new Set<DeathEvent>();
  for (const d of silent) {
    if (lastEvent - d.timestamp <= CALLED_WIPE_END_MS) out.add(d);
    const near = resetCluster(silent.filter((x) => Math.abs(x.timestamp - d.timestamp) <= CALLED_WIPE_WINDOW), deaths);
    if (near.length >= CALLED_WIPE_COUNT) near.forEach((x) => out.add(x));
  }
  return new Set(resetCluster([...out], deaths));
}

/**
 * Any other no-killing-blow death is a walk into the arena's lethal edge
 * (user, 2026-10-16, B25 +3:03.5: the Paladin walked into the wall holding
 * the color it was passed). Not after a knockback (Drainage) or under
 * Propeller Wind's confusion: those are the avoidable hit's.
 */
function detectWallDeaths(players: PlayerInfo[], deaths: DeathEvent[], start: number, end: number, resets: Set<DeathEvent>): PullError[] {
  const out: PullError[] = [];
  for (const d of deaths) {
    const t = d.timestamp - DEATH_EVENT_LAG_MS;
    if (d.killingAbilityGameId || resets.has(d) || t < start + 5000 || t > end || afterPhoton(players, d)) continue;
    const p = players.find((x) => x.name === d.player);
    if (!p) continue;
    const pushed = p.damageTaken.some((e) => ([...KNOCKBACK, 18482].includes(e.abilityId)) &&e.timestamp <= d.timestamp && d.timestamp - e.timestamp <= WALL_PUSH_MS);
    if (pushed) continue;
    out.push(playerError(p, {
      ruleId: BJCC_WALL_RULE_ID, severity: "Major", name: "Walked Into the Wall",
      description: `Died with no killing blow: they walked into the arena's lethal edge. Brute Justice and Cruise Chaser's arena kills at its rim; keep inside the floor ring while passing and baiting.`,
      timestamp: t, abilityId: 0, abilityName: "Wall",
    }));
  }
  return out;
}

/** Called wipe or collapse, when no mechanic marked the cutoff. */
function genericCutoff(players: PlayerInfo[], deaths: DeathEvent[], life: Life, start: number, lastEvent: number): PullError | undefined {
  const generic: PullError[] = [];
  const silent = deaths.filter((d) => !d.killingAbilityGameId && d.timestamp - DEATH_EVENT_LAG_MS >= start + 5000 && !afterPhoton(players, d));
  const called = new Set<DeathEvent>();
  for (const d of silent) {
    if (lastEvent - d.timestamp <= CALLED_WIPE_END_MS) called.add(d);
    const near = resetCluster(silent.filter((x) => Math.abs(x.timestamp - d.timestamp) <= CALLED_WIPE_WINDOW), deaths);
    if (near.length >= CALLED_WIPE_COUNT) near.forEach((x) => called.add(x));
  }
  const calledList = resetCluster([...called], deaths).sort((a, b) => a.timestamp - b.timestamp);
  if (calledList.length >= CALLED_WIPE_COUNT || (calledList.length && lastEvent - calledList[0].timestamp <= CALLED_WIPE_END_MS)) {
    generic.push(raidMarker(BJCC_CALLED_WIPE_RULE_ID, "Wipe Called",
      `${calledList.length} player${calledList.length > 1 ? "s" : ""} died with no killing blow (${joinNames(uniq(calledList.map((d) => d.player)))}) near the end: the wipe was called.`,
      calledList[0].timestamp - DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  const outAt = (t: number) => players.filter((p) => !life.alive(p, t));
  const collapseT = life.outIntervals.map((w) => w.start).filter((t) => t >= start).sort((a, b) => a - b)
    .find((t) => outAt(t).length >= COLLAPSE_DEAD_COUNT && lastEvent - t <= COLLAPSE_END_MS);
  if (collapseT !== undefined) {
    const who = outAt(collapseT).map((p) => p.name);
    generic.push(raidMarker(BJCC_COLLAPSE_RULE_ID, "Party Collapse",
      `${who.length} players were dead at once (${joinNames(who)}). Treated as the cutoff point.`,
      collapseT + DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  return generic.sort((a, b) => a.timestamp - b.timestamp)[0];
}
