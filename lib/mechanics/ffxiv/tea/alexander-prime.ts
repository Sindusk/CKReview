// The Epic of Alexander (Ultimate) -- Phase 3: Alexander Prime.
// Includes entry Temporal Stasis and the Divine Judgment transition.
//
// -- VERIFIED AGAINST LOGS (2026-10-16) --
// Same static as the other tea/ modules, NAUR plan (user), roles.ts
// slots roughly right (user), no VODs. Pulls are cited by the app's Pull
// n with the whole report imported (B and C as in bj-cc.ts).
// Report B = HwjvVh3TNAZmMQyq: B28, B46 reached Temporal Stasis (whole
//   capture). Report C = LxAVFd29kwPm8HnB: C9, C10, C12, C13, C14, C18, C20,
//   C27, C29, refetched --from-minutes 2.1 --to-minutes 10.
// Reports D = 6pzyKv8fnYBZ2XGa (16 pulls), E = AHw6VfLrZ97Gj1Dn (15),
//   F = Q9zqJb4VLmjhd1B6 (11): --min-phase 3 --from-minutes 4.6
//   --to-minutes 10, the pulls that reached Perfect Alexander to 11.5.
// 53 pulls reached Stasis; 10 cleared the phase (E10, E21, E27, E28, E31,
// F3, F4, F12 and the kills F4, F11, F16). FFLogs phases: 4 = Temporal
// Stasis (+4:39 to +5:03 into the pull), 5 = Alexander Prime, 6 = Perfect
// Alexander.
// Clock (from Temporal Stasis's cast completing; every pull within ~0.3s,
// matching [CB]): Plaints +3.0 (hits +3.7); swords +5.0 / 6.1 / 7.2; fires
// +5.3 / 7.6; Chastening Heat +21.5; Inception Formation +38; crystal head
// markers +53.2; Judgment Crystal drops +58.2; orbs taken +59.4 to +62.6;
// Tetrashatter +65 / +66; Flarethrowers +69.6 / 71.7 / 73.9; Inception
// +81.2; Plaints and Sacrament +89.2 / +89.5; swords +95.5 / 96.6 / 97.7;
// Super Jump +98.6; Heat +110.9; Wormhole Formation +129.4 (Wormhole's own
// clock in the constants: numbers +12.3, soaks +26.4 / 30.6 / 34.8);
// Incinerating Heat +170.2; Enumeration +174.9; Mega Holy +183 / +190;
// Summon Alexander +199.8; J Storm +206; J Waves every ~3.05s; Divine
// Judgment success 18553 at +275 to +278 in the clears, transition hit
// 18554 15.4s later (17-31k on everyone; no tank LB in any clear).
// Log IDs: Temporal Stasis 18522; House Arrest / Restraining Order /
// Aggravated Assault / Shared Sentence 1001123 / 1001124 / 1001121 /
// 1001122 (Temporal Displacement 1001119); Plaint of Surety 18531 (1-7
// damage when the tether holds), Severity 18529 (Assault holders), Solidarity
// 18530 (the shared stack: both tanks + Shared Sentence); Alpha Sword 18539
// (Stasis and Inception), Flarethrower 18540, Fire Resistance Down II
// 1002098 (applied 0.3-0.9s before its own fire's damage); Chastening Heat
// 19072, Divine Spear 19074; crystal head marker 96, Judgment Crystal 18523
// / 18524, Tetrashatter 19080 (32 proximity hits per clean pull);
// Aetheroplasm 18546 (cast target = the player who took the orb),
// Electromagnetic Burst 18548; Heavy 1001796 (orb residue, routine);
// true heart success 19024; Sacrament 18527 (Inception) / 18519
// (Wormhole), lethal (2-3M preview hits); Super Jump 18506; Wormhole
// 18542, Limit Cut numbers = head markers 79..86, Alpha Sword 18484 (the
// intermission's ID, reused), Super Blassty Charge 18883, Apocalyptic Ray
// 18508, Eye of the Chakram 18517, Repentance 18537 / 18536 / 18535 (first
// / second / third soak; cast target = soaker), Confession 18538 (cast at
// the unsoaked puddle, often twice); Incinerating Heat 19025 (head marker
// 93); Enumeration 18512 (damage only on a wrong count; marks = head
// marker 65); J Storm 18550, J Wave 18551, Eternal Darkness 18549 and
// Divine Judgment 18552 (completed casts only when an enrage finished).
// Damage Down 1002092 comes only from Confession and Electromagnetic Burst
// (raid penalties): avoidables are Minor unless they kill.
// Findings:
// - Temporal Stasis (NAUR, all 37 clean freezes): Cruise Chaser and Brute
//   Justice ~6y east/west of center. House Arrest flanks the east boss
//   north/south, no debuff the west boss, Aggravated Assault at Brute
//   Justice's wall, Restraining Order players at opposite walls; the one
//   on Cruise Chaser's side, 7-9y from it, takes its third sword. Failures
//   (all ended in deaths): an Assault holder on Cruise Chaser's side (B28,
//   D7, F4 in the kill); a near-pair player off the north-south line so
//   the cone ran through the far tether behind (C12, C13, C27, E4: 0.8-1.6y
//   off; D16: 3y past the boss); the far tether at the wall, 12y from
//   Cruise Chaser and no closer than the far pair, so the third sword
//   crossed the arena (C10); a no-debuff player at the east wall (E30).
//   Surety failed once: B46's House Arrest pair (32k / 47k, both died).
// - Inception: Electromagnetic Burst at the last orb, 6 dead each time
//   (C27, D5, D16); the orbs were taken where the clean pulls take them, and
//   the orbs' own paths aren't logged. Fires: Paladin, Warrior, then the
//   party; C10's first fire hit four (two died at the third under Fire
//   Resistance Down), D10's both tanks, B28's MT stayed in the second.
//   C18: Sacrament hit all eight (wrong safe spot). Swords: regen healer
//   north, shield healer south, far-tether DPS west of Cruise Chaser, the
//   Paladin's Super Jump at the east wall; failures C9 (an Assault holder
//   1.8y from Cruise Chaser), C14 and C20 (the far-tether DPS east of it,
//   C20's cone through five); jump extras 9-14y from the Paladin (B28, C9,
//   C12, D2, E30; C9's knocked off).
// - Tetrashatter: tanks and the sage stand by a crystal and take 22-38k
//   where the stack takes ~10k; it killed the sage in D12 and F15 (survived
//   at 26.8k in D7) and a crystal player in B28. User (D12): a death to it
//   is standing too close, now flagged. A clean Inception has four
//   Tetrashatter casts (32 hits); three or fewer is a missed crystal.
// - Heat / Spear: Hallowed Ground on the first set, Holmgang on the second.
//   Deaths to them (D7 reversed order, F1, F11's late Hallowed Ground) are
//   the targeted tank's mistimed invulnerability (user, 2026-10-17, F1:
//   the Warrior "mistimed invulnerability"; this overturns the earlier note that
//   called them Mitigation Analysis territory). F1's spears killed the
//   Paladin on the second set and then cut through the party.
// - Wormhole: odd numbers' swords hit at the NW/SW dots, even charges at
//   NE/SE. The holder's facing isn't usable as a fixed axis (clean sword
//   axes 15 median / 76 p90 degrees off "outward"), so aim is read from
//   the outcome: a victim 10y+ down the cone means the holder aimed it into
//   the waiting group (12.9-28.5y: D2, D10, D12, D13, D19, E2, F2, F7, the
//   #3 sword five times); victims within 7.2y stood too close (D11, D28,
//   F6). A charge hitting the odd number whose sword just preceded it
//   (Cruise Chaser came out on their wall side): D17, E14, E31, F11 (kill).
//   Knock-offs: no-killing-blow deaths 2.1-3.4s after an own sword/charge
//   (D2, D7, D25, E14, E16, E20, E26) or a jump (C14, C29: #6 and #8
//   standing by the jump baiter).
//   Soaks: 5/6, 7/8, 1/2, odds west; a wrong-round soaker took a check that
//   wasn't theirs and died to its vulnerability (D12 #8, D21 #2, E13 #2, F6
//   #4); D12's #8 then couldn't soak their own: Confession. Every Confession
//   ended the pull (15). Apocalyptic Ray killed the jump partner #3/#4
//   (C14, E9, E20, E26) or #5 (D17, F9); Sacrament killed #3 (E2) and #4
//   (E30); Eye of the Chakram killed #3 (D7) and #7 (D10).
// - Incinerating Heat: E14 had five in it with six alive (three died).
//   Other Heat deaths (E4, E10, E13, E30, F15) were a full stack on players
//   still under the soak/number vulnerabilities: healing.
// - Enumeration: D20, a healer in the tanks' circle (four vs two), six died.
// - Final check: the clears killed Brute Justice after 10-11 J Waves with
//   nobody dying to them; D24, E30, F15 died from the 10th to 12th wave.
//   E4 let Eternal Darkness finish. Mega Holy / J Storm deaths on short or
//   low parties (E13, E16, E29) end as collapse or both healers dead.
// Cutoffs (43 phase-3 wipes, every one has one): Confession 15 (C12, C14,
// C29, D11, D12, D13, D21, D25, D28, E9, E20, E26, F2, F6, F7); both
// healers dead (ffxiv/common.ts) 15 (B28, B46, C9, C13, D2, D7, D10, D17,
// D19, E2, E4, E13, E29, F1, F9); Electromagnetic Burst 3 (C27, D5, D16);
// J Waves 3 (D24, E30, F15); called wipe 3 (C10, D23, E14); collapse 2 (C20,
// E16); party in Sacrament 1 (C18); Enumeration 1 (D20). Unexplained: D23,
// four no-killing-blow deaths right after the orbs (+71 to +74) with the
// heart never awakening.
//
// -- RULES IMPLEMENTED --
// Self-gates on Temporal Stasis; runs from its cast start to the
// transition hit (or Perfect Alexander's first cast, or the last event).
// ffxiv-ap-stasis-cone (Major when a Stasis cone killed, else Minor): in
//   order, the player on the wrong side for their debuff; the owner who
//   wasn't there to take their cone; else the owner whose cone ran through
//   others. Also Minor for anyone frozen on the wrong side whom no cone
//   reached (C10's Paladin, user). Skipped with anyone dead at the first
//   cone (not the cast: C10's Paladin was raised 4s into it); a cone
//   hitting only players already hit is fallout.
// ffxiv-ap-tetrashatter (Major): died to a crystal's burst (user, D12; the
//   earlier note calling these deaths mitigation is overturned), not after
//   Electromagnetic Burst (D16, user: the pull is over).
// ffxiv-ap-true-heart (Raid): fewer than four Tetrashatter casts in
//   Inception, so the Heart missed a crystal and can't turn gold (D23,
//   user; also C10 two, C18 three; every other Inception on disk had four).
// ffxiv-ap-wall (Major): a no-killing-blow death not within 10s of a
//   sword / charge / jump hit, not a called-wipe reset, with fewer than 4
//   others dead (D12, user: the white mage, twice).
// ffxiv-ap-wormhole-death (Raid): the first death in Wormhole before its
//   third soak, still dead at Wormhole's end, on a pull that never reaches
//   J Storm; every later Wormhole error is fallout (user, D10: "the first
//   death during Wormhole indicates a wipe, unless it's at the very end";
//   E30 raised theirs and played on, so it's excluded).
// ffxiv-ap-stasis-deaths (Raid, fallback): 2+ Stasis deaths with two or
//   more players still dead at Inception Formation (D16's one was
//   recovered from, user), on a pull that never reaches
//   Wormhole, when earlier than any mechanic Raid (C10, user: "over after multiple
//   deaths"; E4 and E30 played on to the final check after the same shape).
// ffxiv-ap-stasis-tether (Major, both players: the log can't say who
//   moved): Plaint of Surety for 100+ damage or killing.
// ffxiv-ap-electromagnetic-burst (Raid, player-less).
// ffxiv-ap-fire (Minor; Major if they died within 10s): anyone beside the
//   tank in the first two fires, and anyone hit under an earlier fire's
//   Fire Resistance Down. With a player dead the tank fires' extras (and
//   their later repeat) are fallout (C10, user); a tank's repeat isn't.
// ffxiv-ap-sacrament (Major when it killed) and ffxiv-ap-sacrament-party
//   (Raid, 4+ in one cross).
// ffxiv-ap-inception-sword (Minor/Major): with two or more in a sword, the
//   victim nearest Cruise Chaser (it set the cone's direction), plus any
//   other non-baiter within 4y. Skipped with anyone dead.
// ffxiv-ap-super-jump (Minor; Major if killed or knocked off): anyone in
//   the jump besides its baiter (Inception: the farthest, 12y+ out;
//   Wormhole: #3 or #4, skipped when that player was already hit by
//   another number's attack).
// ffxiv-ap-wormhole-aim (on the holder): a sword victim 10y+ down the cone,
//   or a charge through two or more others (those are named too).
//   ffxiv-ap-wormhole-stray: everyone else hit by another number's attack,
//   including the odd number caught by the charge after their sword.
//   ffxiv-ap-wormhole-knockback (Major): knocked off by their own attack.
//   Attacks whose holder was dead or already hit are fallout.
// ffxiv-ap-avoidable (Minor; Major if it killed, later pulses included):
//   Apocalyptic Ray, Eye of the Chakram.
// ffxiv-ap-soak-extra (Minor; Major if they died within 10s): soaking a
//   check owed to a living number. ffxiv-ap-soak-missed (Major): the owed
//   number, alive and unhit, missed the puddle, unless anyone died earlier
//   in Wormhole (C12, user: fallout of #1's sword killing a healer).
//   ffxiv-ap-confession (Raid).
// ffxiv-ap-heat-stack (Minor; Major if the stack killed): alive and outside
//   Incinerating Heat.
// ffxiv-ap-enumeration (Major: a healer in the tanks' circle, a tank in the
//   healers', an unmarked DPS in either) and ffxiv-ap-enumeration-failed
//   (Raid).
// ffxiv-ap-j-wave (Raid: 3+ J Wave deaths starting at wave 9 or later),
//   ffxiv-ap-enrage (Raid: Eternal Darkness or Divine Judgment completed).
// Generic, phase-3 wipes without a mechanic Raid: ffxiv-ap-called-wipe (3+
//   no-killing-blow deaths in 10s or any within 12s of the end, knock-offs
//   excluded), ffxiv-ap-collapse (4 dead, pull over within 30s). Only the
//   earliest Raid marker is kept; ffxiv-ap-wormhole-dead-going-in (Raid) when
//   a number has no holder.
// Exposure: wormhole-aim and wormhole-knockback are targeted (each attack's
//   holder), soak-missed targeted (each check's two owed numbers); the rest
//   are everyone.
// ffxiv-ap-tank-buster (Major): a tank killed by the Chastening Heat or
//   Divine Spear aimed at them (F1, F11, D7, B28, C9).
// Not built: Plaint of Solidarity short (one case, B28, in a
//   cascade); the transition hit (no LB in any clear, 17-31k).
// VOD review 2026-10-16 (user): report C pulls 9, 10, 12, 14, 29 and
//   report D = 6pzyKv8fnYBZ2XGa (all 28 pulls on disk, full captures)
//   pulls 2, 10, 11, 12, 16, 17, 21, 23, rulings in
//   expectations/rulings.json. D17: the odd number caught by the charge
//   should step slightly toward the wormhole. D21: the soak-extra healer
//   tried to get across while the wormhole went off. D28 (#7 at 7.2y from
//   #5's strike point) the VOD couldn't settle. Confirmed as detected: the Inception
//   sword on a dragoon nearest Cruise Chaser (C9 with Assault, C14 off the
//   west side), C12's Stasis cone not baited cleanly south, C29's jump
//   extras too close. C14's jump extras: probably, the VOD can't confirm.
//   C27's Electromagnetic Burst: the warrior and the white mage moved to
//   the wrong orb positions (user), but every orb take sat on the four
//   clean spots and no take order or timing separates the burst pulls
//   (C27, D5, D16) from clean ones, so it stays player-less. D16 (user):
//   the white mage didn't go to the red dot. The crystal players form a
//   clean four-corner box in every pull (D16 too; that healer had no
//   crystal), so the orb route is the likely meaning; still unreadable.
// VOD review 2026-10-17 (user): report E (all 31 pulls now on disk, full
//   captures) pulls 2, 4, 14, 30, rulings in expectations/rulings.json.
//   E2: #1's sword into the group was the holder's. E4: the near-pair
//   player off the line (answers old question 4 for E4). E14: #4 didn't
//   use knockback resist (Major, not the cutoff: raised), and #5 walked
//   into the charge after their own sword (answers old question 3 for
//   E14: the odd number's). E30: the no-debuff player should have been
//   north of Cruise Chaser. The user reads Stasis positions as compass
//   points with a bearing, so the cone descriptions give those. Apocalyptic
//   Ray aims at the player farthest from Brute Justice, not the jump
//   baiter (user; NAUR's red dot); E9 (#4 in it) the VOD couldn't show.
// VOD review 2026-10-17 (user): report F (all 16 pulls now on disk, full
//   captures) pulls 1, 4, 6, 7, 11, 15, rulings in expectations/rulings.json.
//   F6: #1's stray was the waiting player too close (should move south
//   along the wall); F7: #3 aimed into the group (answers question 2 for
//   F7); F11 #7 caught by the charge after their sword. Facing Cruise
//   Chaser shortens its knockback a lot (user).
// OPEN QUESTIONS:
// 5. F1: the Paladin also died to the second Spear set (6:49): his too?
// 1. Electromagnetic Burst names nobody (C27, D5, D16): can the orbs'
//    paths be read from anything the log keeps?
// 2. Wormhole #3's sword into the waiting group (D13, D19, F2, F7; D10
//    was fallout of an earlier death): #3's facing, or #1/#5/#7 standing
//    in its path?
// 3. Charges hitting the odd number before them (D17, F11) name the odd
//    number: E14 (walked into the dash) and E31 (should have faced out at
//    a different angle) were theirs; the others? E16: #6 didn't use
//    knockback resist (user).
// 4. Stasis near-pair players 0.8-1.6y off the line (C13, C27): C12 and
//    E4 were the near player's; same for the others?
//
// -- GUIDE-DERIVED MODEL (2026-10-15) --
// Research only: no detector, live-report verification or VOD rulings.
// Eight-player level-80 Ultimate (5.11), item-level sync 475. This model
// ends after the tank-LB transition hit; Perfect Alexander has its own
// file. A future VERIFIED AGAINST LOGS section takes precedence.
// All failure signals are guide/source-derived and unobserved locally.
// Later job changes affect damage checks and cooldown coverage. Historic
// invulnerability timings and launch healing numbers are not invariants.
//
// -- SOURCES CHECKED 2026-10-15 --
// [NA] Current NAUR directory and linked phase toolboxes:
// https://naurffxiv.com/ultimate/tea
// https://ff14.toolboxgaming.space/?id=860745463802461&preview=1
// https://ff14.toolboxgaming.space/?id=537197026169861&preview=1
// [WD] Browser, NAUR/Elinabin Timestop/Inception and Wormhole tabs;
// Wormhole initial diagram visually inspected to settle true north:
// https://wtfdig.info/ultimates/tea#naur
// [IV] Lyra, alternate Stasis/Inception sides and PUG Wormhole:
// https://www.icy-veins.com/ffxiv/the-epic-of-alexander-ultimate-guides-alexander-prime
// [US] Relative-Alex-north Wormhole / Christmas-right Stasis:
// https://ultistrats.com/guides/tea/
// [OCE] Written true-north Wormhole, crystal/orb and debuff reasoning:
// https://materiaraiding.com/ultimate/tea
// [BM] Primary actor/action/status definitions, geometry and event order:
// https://github.com/awgil/ffxiv_bossmod/tree/master/BossMod.Ultimate/Shadowbringers/Ultimate/TEA
// Read TEAEnums.cs, TEAStates.cs, P3TemporalStasis.cs, P3Inception1-4.cs,
// P3Wormhole.cs, LimitCut.cs, ApocalypticRay.cs and P2SuperJump.cs.
// [CB] Primary reference timeline and trigger IDs, main branch:
// https://github.com/quisquous/cactbot/blob/main/ui/raidboss/data/05-shb/ultimate/the_epic_of_alexander.txt
// Same path: the_epic_of_alexander.ts. No implementation code reproduced.
//
// -- SHAPE, CLOCK, AND ENCOUNTER PUZZLE --
// BJ+CC defeat triggers Temporal Stasis, then Alexander Prime (AP) becomes
// attackable between formations. Formation starts and resolves on a
// script, not HP thresholds. Boss damage affects the eventual final check.
// Inception's True Heart must collect four crystals and awaken to grant
// the Enigma Codex used to see Fate Projection in P4. This is a mechanic
// objective, not an add to kill. Standard progression preserves it.
// End sequence defeats CC, then BJ, then AP before their deadlines;
// actual finish and tank-LB transition depend on kill times.
// [CB] t=0 here is Temporal Stasis RESOLUTION (synthetic timeline 500).
// Its 8s cast begins at -8; this anchor is not pull time or first AP auto:
//   +3.1 debuff resolution; +5.1..7.2 three swords / two fire cones;
//   +11.4 targetable; +21.5 Heat; +24.6/+26.7/+28.8 Spears.
//   +37.9 Inception Formation; +41.0 untargetable;
//   +52.4 Judgment Crystal control; +58.2 crystal drops / True Heart;
//   +69.5/+71.7/+73.8 three Flarethrowers; +81.0 Inception;
//   +89.1 debuffs resolve, +89.4 Sacrament;
//   +95.3/+96.4/+97.5 swords; +98.3 Super Jump; +100.3 targetable;
//   +110.9 Heat; +116.0/+118.1/+120.2 Spears (longer delay).
//   +129.3 Wormhole Formation; +132.3 untargetable; +137.7 Limit Cut;
//   +140.7 Link-Up; +143.7 Void; +149.5 Chakrams; +150.9 jump/#1;
//   +152.4 #2; +155.2 #3; +155.6 soak 1; +156.7 #4;
//   +157.9 Sacrament; +159.5 #5; +159.7 soak 2; +160.8 #6;
//   +163.6 #7; +164.0 soak 3; +165.1 #8;
//   +166.4 Missile Command; +170.0 Incinerating Heat;
//   +174.2 targetable; +174.6 Enumerations; +182.9/+190.0 Mega Holy;
//   +199.4 Summon Alexander; +205.7 J Storm, adds ~+206.8 targetable.
// These are reference resolving-action times, not verified cutoffs. A
// source clock that resynchronizes on kill events cannot establish a
// globally fixed Divine Judgment or P4 start time.
//
// -- IDs, GEOMETRY, AND ATTRIBUTION --
// Decimal action IDs are candidates from BM/CB, not verified FFLogs IDs.
// Raw status IDs usually map to FFLogs 1000000 + raw. Tethers/headmarkers
// visible in client tools may be absent from the app's exported streams.
// AP actor 0x2C53, Shanoa 0x2C51, True Heart 0x2C52, Plasmasphere 0x2C50,
// crystal 0x2C54, giant Alexander transition actor 0x18D6.
// Minor: nonfatal avoidable damage/no Damage Down. Major: named root
// cause of death/wipe or confirmed avoidable Damage Down. Raid: genuinely
// unrecoverable state, no invented individual for an invisible assignment.
// Correct tank/raid/soak damage deaths are mitigation analysis. A prior
// death's lost baits and redistributed mechanics are fallout, not new fault.
//
// -- TEMPORAL STASIS --
// Candidate cast 18522 (8s); Temporal Displacement raw 1119 freezes the
// players. Per role group, one support + one DPS receive each assignment:
// House Arrest raw 1123 (close), Restraining Order 1124 (far), Aggravated
// Assault 1121 (no extra damage), or no debuff. Four pairs = eight players.
// Candidate resolution hits: Plaint of Surety 18531 (tether check),
// Plaint of Severity 18529 (expected hit/vulnerability on Assault).
// House Arrest game tether 28, Restraining Order 29. BM uses <=5y close
// and ~30y far; cited examples pass 4.93y / fail 5.34y for close and fail
// 25.45y / pass 31.25y for far. These bracket, not prove exact thresholds.
// CC Alpha Sword 18539 aims three successive cones at its closest three
// players. BJ Flarethrower 18540 aims two successive cones at its closest
// two. Baiters must not overlap cones or include Assault players.
// NAUR / Christmas-right plan: House Arrest pair stays E of center,
// support just N / DPS just S of the EAST boss, whichever boss that is;
// no-debuff pair similarly N/S of WEST boss. Assault pair stays at the
// BJ-side wall. Far tether pair splits opposite sides; player on CC side
// is near its outside marker to take the third sword, BJ side at wall.
// WD describes the far pair as FFA: support is NOT always E or W.
// Thus House Arrest baits CC if CC E, BJ if CC W; no-debuff pair does the
// other boss. Freeze locks the correct setup for the entire resolution.
// Failure: tether distance -> LOG SIGNAL: lethal 18531 / failed pair
// check rather than its possible 1-damage success; FAULT: off-position
// endpoint if plan known, otherwise unresolved pair; CONSEQUENCE: Major.
// Failure: wrong/overlapping cone -> LOG SIGNAL: extra 18539/18540 victim
// or repeated element during vulnerability; FAULT: wrong nearest bait or
// lane entrant as established; CONSEQUENCE: Major if lethal, Raid when
// the full mechanic can no longer resolve. Assault victim is not assumed
// to have moved wrong simply because a cone hit them.
// Removal: scripted expiry/resolution and unfreeze; no cleanse. Death
// removes statuses, but frozen-player immobility itself is expected.
// Not errors: assigned cones, Severity hit, successful tether check.
//
// -- CHASTENING HEAT / DIVINE SPEAR / MEGA HOLY --
// Heat cast/damage 19072, 5s / ~5y tank circle, Magic Vulnerability Up.
// Spear 19074, three magical frontal cleaves, ~2.1s apart. First set starts
// ~3.2s after Heat; second ~5.2s. Face away, swap after Heat or coordinate
// invulnerability coverage. Longer second set can outlast an invuln used
// on Heat; tank may mitigate Heat then invuln Spears. Job-specific
// exceptions must be checked against current level-80 ability behavior.
// Mega Holy 19075: two unavoidable raidwides after Wormhole, 7.1s apart.
// Failure: party cleave / invalid swap -> LOG SIGNAL: 19074 nonassigned
// victims or vulnerable tank continues taking it with a demonstrated
// missed swap; FAULT: responsible tank if assignment established;
// CONSEQUENCE: Major if lethal. A planned invulnerable vulnerable tank
// is not a missed swap. Raw buster or Holy deaths alone are not flags.
// Removal: vulnerability times out; no dispel/raid explosion sourced.
//
// -- INCEPTION: ORBS, CRYSTALS, HEART --
// Inception Formation 18543. Four Plasmaspheres tether four random
// players (game tether 12). Remaining four get crystal marker (raw icon
// 96): control 18523, drop damage 18524, 5y circles. Crystal ground and
// orb ground actors are 0x1E9E3C / 0x1EA1C9; not ordinary player auras.
// Aetheroplasm 18546 is each orb's ~6y explosion; Electromagnetic Burst
// 18548 is the raid penalty for intersecting explosions/ground effects.
// Orbs shrink/weaken with time; kite across arena before deliberately
// intercepting own orb. Early interception hurts, incidental interception
// changes the puzzle, and overlapping orb explosions/green residue is bad.
// Exact collision test (explosions vs residual zones) remains unverified.
// NAUR: initial AP N or S becomes relative N, Shanoa opposite. Two orbs
// from each E/W side; cross tether paths so their owners take opposite
// long routes, using N intercardinal then E/W red floor dots. Crystal
// players go relative S and form a four-corner box in True Heart's path.
// Initial crystal circles must not overlap (5y radii -> nominal 10y
// separation). Box is centered on Heart's line, away from initial AP.
// Wall pair plants first; inner pair aligns to it. Watch traveling orbs.
// Shanoa's Undying Affection 19020 summons True Heart; Heart moves toward
// AP, touches all FOUR crystals, awakens golden and later reveals AP's
// new location. Do not destroy Heart. Gauge-building attacks on its
// invulnerable state are legitimate; no obligation to deal real HP damage.
// Candidate normal crystal burst Tetrashatter 19080; failed crystal cast
// Tetrashatter 18525 (5.5s). Candidate Heart success action 19024, player
// Enigma Codex raw 2146; Heart's own Codex raw 2147 is a DIFFERENT aura.
// Crystal bursts are proximity damage: leave the crystal side toward AP
// after placement. Four normal Heart-triggered bursts are intended.
// Failure: early/intersecting orb -> LOG SIGNAL: 18546 unusually early /
// 18548 raid penalty, orb/tether positions if available; FAULT: intercepted
// path or bad explosion placement if established; CONSEQUENCE: Major/Raid.
// Failure: overlapping/wrong crystal -> LOG SIGNAL: 18525 or premature
// bursts / failed four-crystal awakening; FAULT: misplaced marked player
// only if box geometry/assignment establishes it; CONSEQUENCE: Raid for
// lost required objective, Major when attributable.
// Failure: Heart not awakened -> LOG SIGNAL: fewer consumed crystals,
// no success/2146 buff; FAULT: unresolved unless placement cause proven;
// CONSEQUENCE: standard-plan progression failure, but absence of Codex
// alone does not establish an immediate wipe (see P4 visibility caveat).
// Removal: orbs consumed on contact, green ground lingers; crystals
// disappear on burst/consumption; Heart exits after its scripted journey.
// Dead marked-player orb/crystal behavior is an open question. No Esuna.
//
// -- INCEPTION: THREE FIRE BAITS, SACRAMENT, DEBUFFS, SWORDS/JUMP --
// Three closest-player Flarethrowers 18540 occur after orbs. NAUR takes
// them tank 1 / tank 2 / remaining party, avoiding repeated Fire weakness.
// MT far / OT middle in strategy terminology identifies which fire
// position is used; the selected target must actually be nearest for its
// own snapshot. After each shot that baiter leaves the next bait's path.
// New debuffs: one tank + one DPS Restraining Order; one DPS Shared
// Sentence raw 1122; other two DPS Assault. Healers have no such debuff.
// Shared Sentence resolves as Plaint of Solidarity 18530, ~4y split stack
// (three-player normal plan); Severity 18529 hits Assaults, Surety 18531
// checks the far pair. Inception control 18526 is not the damaging
// Sacrament hit 18527, a cross of 16y-wide lanes from AP's new position.
// NAUR: awakened Heart's destination becomes new relative N. Both tanks
// + Shared DPS go relative W (LEFT facing Heart), five others relative E.
// Use the wall for far-tether distance, and stand outside Sacrament lanes.
// After resolution, return to TRUE coordinates: CC center, BJ W. Regen
// healer N of CC, shield S, far-tether DPS W are the three close sword
// baiters; Assault/shared players stay out. A tank (normally first
// invuln tank) baits BJ's farthest Super Jump at E wall; others near 1
// marker move inward as swords begin so they avoid the ~10y jump splash.
// Super Jump: controller 18505, damage 18506. The expected tank jump hit
// is not a numbered charge and does not need the same prevention logic.
// Failure: fire repeats / clips -> LOG SIGNAL: 18540 on previous baiter
// or party in wrong volley; FAULT: wrong nearest bait/entrant as proven;
// CONSEQUENCE: Minor/Major, Raid only for an unrecoverable cascade.
// Failure: shared/far/Assault -> LOG SIGNAL: lethal 18530/18531 or Assault
// plus unintended damage; FAULT: off-position assigned member, not every
// stack casualty; CONSEQUENCE: Major/Raid. Normal Plaint hits are expected.
// Failure: Sacrament -> LOG SIGNAL: 18527; FAULT: lane entrant unless
// earlier forced movement caused it; CONSEQUENCE: Minor/Major by outcome.
// Failure: wrong sword/jump bait -> LOG SIGNAL: 18539/18506 targets and
// extra victims; FAULT: wrong nearest/farthest bait or off-slot bystander;
// CONSEQUENCE: Major if lethal. All geometry requires the correct frame.
// Removal: debuffs resolve on the scripted check; no cleanse. Their
// temporary vulnerabilities restrict who can bait the subsequent swords.
//
// -- WORMHOLE: NAUR TRUE-COORDINATE PLAN --
// Wormhole Formation 18542; numbered Limit Cut control 19215. Actual
// TRUE layout: AP S, BJ/CC NW/NE (can swap), not AP N. Everyone baits
// Chakrams at center before leaving. Chakrams spawn N and BJ-side E/W,
// cutting the center on perpendicular axes; Link-Up 18495 here does NOT
// apply Compressed Water/Lightning. Eye of the Chakram hit 18517.
// Odds W, evens E. 1/2 initially NW/NE red dots; 3/4 SW/SE, with the
// player farthest from BJ exactly on its red dot to bait jump, partner
// closer to wall as appropriate. 5/6/7/8 wait on northern side near
// wall, not center or an active void. All travel along wall to avoid rays.
// CC teleports behind odd facing; odd aim the cone out, evens prevent
// knockback on dash. Alpha Sword 18484 is reused, but this phase's Super
// Blassty Charge is 18883, NOT intermission 19279. Pair intervals are
// shorter (~2.7s charge -> next sword vs ~3.2s in intermission).
// BJ jumps 3 or 4 as #1 is hit, then aims five Apocalyptic Ray 18508
// pulses toward center. Jump baiter steps toward wall after landing;
// #1/#2 stay correctly placed so the center-pointed beam leaves room.
// BM's ray angle is provisional. Sacrament 18519: AP's 6s cast, 16y-wide
// cross; #3/#4 move along wall AWAY FROM AP after their hits to avoid it.
// WD warns to preserve facing while moving around the edge: a new odd
// facing can put CC on the wrong side and point the cone into the party.
//
// -- WORMHOLE: VOID OF REPENTANCE / CONFESSION --
// Void control 18534 creates TWO diagonally offset side puddles, near
// NW/SE or NE/SW rather than exactly on both cardinal points. Each needs
// one player in EACH of three successive checks: SIX correct soaks total.
// BM models radii 8 -> 6 -> 3y as they shrink. Candidate soak hits:
// first Repentance 18537, second 18536, third 18535. These reverse ID
// order is intentional. Unsoaked penalty Confession 18538 is raidwide.
// Soaks inflict short vulnerability, preventing immediate LC/soak overlap.
// NAUR / common PUG order, one number per side at each check:
//   5/6 soak FIRST near #3 sword, then move to original 1/2 NW/NE spots.
//   7/8 soak SECOND near #5 sword, then go to 3/4 SW/SE spots.
//   1/2 soak THIRD near #7 sword after their LC vulnerability expires.
//   3/4 never soak. After final soak, freed players gather center while
//   7/8 still finish their own attacks, then all eight take Heat stack.
// Stand toward wall inside puddle and use wall routes entering/leaving;
// cutting toward middle can cross both ray and Sacrament.
// Failure: missed puddle -> LOG SIGNAL: 18538; FAULT: assigned number on
// failed side only if number/side occupancy known; CONSEQUENCE: Raid.
// Failure: double/early soak or charge overlap -> LOG SIGNAL: extra soak
// recipients / LC plus Repentance during vulnerability; FAULT: early
// entrant or wrong assigned number if established; CONSEQUENCE: Major.
// Failure: mis-aimed sword/dash / wrong jump / ray / Sacrament / chakram
// -> LOG SIGNAL: corresponding 18484/18883/18506/18508/18519/18517 hits;
// FAULT: responsible baiter or entrant as proven, not automatically the
// victim; CONSEQUENCE: Minor/Major by result, Raid when sequence is lost.
// Removal: each correct check shrinks puddle, third deletes it; failed
// check triggers Confession. Short vulnerability expires, not dispelled.
// Numbered attacks on a dead target and resulting missing soaks are
// fallout if an earlier death already caused that missing assignment.
// Not errors: six intended Repentance hits, own sword/dash, planned jump
// hit, prevention, waiting outside center through #8 despite others moving.
//
// -- POST-WORMHOLE HEAT / ENUMERATIONS --
// Incinerating Heat 19025 is a 5s cast, ~5y stack on a random player:
// all eight gather. Missile Command 18509 only creates two three-person
// Enumeration marks here, NOT P2's mines/ice. Enumeration 18512 follows
// Heat; markers may appear immediately before Heat resolves.
// NAUR: marked DPS split W/E, BOTH healers help W, BOTH tanks help E;
// two unmarked DPS stay out. This is not P2's M1/phys flex grouping.
// Failure: missing Heat helpers -> LOG SIGNAL: lethal small 19025 split;
// FAULT: assigned absentee only if proven; CONSEQUENCE: Major; normal
// correctly shared damage belongs to mitigation. Enumeration wrong count
// -> LOG SIGNAL: 18512 penalty deaths; FAULT: missed helper/extra DPS/
// misplaced marked DPS if occupancy is settled; CONSEQUENCE: Major/Raid.
// Removal: stack resolves; Enumeration may deal no damage on success.
// Not errors: unmarked DPS deliberately absent from Enumeration, two
// Mega Holies on whole party following a clean split.
//
// -- SUMMON ALEXANDER / J WAVES / DIVINE JUDGMENT --
// Summon Alexander 19029 starts a distinct final check. CC SE casts
// Eternal Darkness 18549, 25s; BJ SW applies J Storm 18550 then repeated
// J Wave 18551, ~3s intervals with increasing Damage Up; AP protected
// until both die, casts Divine Judgment 18552, 75s [BM]. Kill CC first,
// then BJ to stop escalating Waves, then AP to stop the fatal cast.
// J Wave count is kill-dependent; CB displays a 16-wave reference train,
// not a required count or a pass/fail threshold. No fixed wave number is
// intrinsically an individual error. Spend healing/mitigation accordingly.
// AP reaching its defeat threshold produces success action 18553, then
// giant Alexander uses transition raid damage 18554. Tank LB3 + shields /
// other mitigation cover this unavoidable hit; normal cue is countdown 3.
// CB calls its 0x4879 (18553) sync "Divine Judgment Enrage", while BM
// calls that action the SUCCESS event. A timeline label is not proof of
// failure: 18552 completion, 18553 success, 18554 normal transition must
// be distinguished in the actual log. The success sync permits large
// timing variation; later P4 timings are therefore not fixed pull offsets.
// Failure: CC/AP deadline -> LOG SIGNAL: completed fatal 18549/18552
// and wipe result; FAULT: collective unless concrete root cause proven;
// CONSEQUENCE: Raid. Begincast alone is expected and not an enrage failure.
// Failure: late BJ kill -> LOG SIGNAL: escalating 18551 casualties;
// FAULT: no named player from damage taken alone; CONSEQUENCE: mitigation
// concern / Raid only when survival is no longer possible.
// Failure: absent/mistimed required LB -> LOG SIGNAL: 18554 with no
// covering tank LB3 aura/cast and raid loss; FAULT: named tank only if
// assigned, alive and LB available; CONSEQUENCE: Major + Raid if proven.
// Removal: BJ defeat stops Waves; CC defeat stops its cast and AP loses
// protection when both are defeated. Scripted transition stun/Down for
// the Count and cinematic inactivity are expected, not player deaths.
//
// -- STRATEGY VARIANCE AND NON-ERRORS --
// Stasis can be debuff-fixed east/west (NAUR Christmas-right/nothing-left)
// or boss-relative, e.g. always close pair at BJ / unmarked at CC [IV].
// Far tethers can have fixed support/DPS sides or FFA. These change who
// baits the third sword; they are not interchangeable attribution plans.
// Inception tanks+Shared can go left (NAUR/OCE) or right (IV) facing Heart;
// the other group takes the opposite safe side. Both satisfy the puzzle.
// Wormhole can be described in true north (AP S, odd W) or rotated 180
// degrees with AP as relative N (odd relative E, evens relative W).
// US says "Alex north, evens left, odds right"; this describes the SAME
// geometry, not a reversal of NAUR's true-coordinate plan. Different
// actual routes exist, but exact uninspected routes are not asserted here.
// Tank fire order, jump tank, paired buster invulns and healing plan vary.
// Expected damage includes successful tether checks, Severity/Solidarity,
// crystal proximity bursts, orb intercepts, assigned cones/soaks, Heat,
// Holy, J Storm/Waves and properly mitigated transition Judgment.
//
// -- WHAT ENDS A PULL / OPEN QUESTIONS FOR LOG VERIFICATION --
// Confession, overlapping orb penalty, destroyed numbered/soak sequence,
// lost required crystal setup or completed final enrage normally ends
// standard progression. Failed Codex visibility and individual deaths
// need their actual remaining state assessed, not automatic blanket cutoff.
// 1. Map Plaint variants, resistance debuffs, all penalties and Damage
//    Down; settle close/far and cone/collision thresholds with clean/fail
//    samples and confirm which assignment/actor/facing streams exist.
// 2. Heart four-crystal count, good/bad Tetrashatter distinction, orb
//    weakening, overlap test, death retarget/removal behavior and Codex
//    persistence/reapplication after death/raise.
// 3. Confirm Stasis far-pair convention, fire order, jump tank and the
//    exact Inception sides; frame changes must be recorded with slots.
// 4. Wormhole icon availability, dead numbered targets, puddle centers,
//    true soak radii, exact vulnerability duration, damage shares and
//    unsoaked Confession timing. Confirm six hits vs three time steps.
// 5. Tank LB3 coverage, final cast begin/end/interrupt IDs, 18553 success,
//    18554 transition source, J Wave scaling and kill-dependent anchors.

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import type { ReportedOccurrence } from "@/lib/mechanics/occurrences";
import type { HeadMarker } from "@/lib/mechanics/ffxiv/fru/usurper-of-frost";
import { kFmt, joinNames, playerError, raidMarker } from "@/lib/mechanics/wow/common";
import {
  DEATH_EVENT_LAG_MS, type Life, bodyHit, buildLife, castsOf, uniq, namesOf, realAmount, resetCluster, isTank,
} from "@/lib/mechanics/ffxiv/fru/common";

export const AP_STASIS_TETHER_RULE_ID   = "ffxiv-ap-stasis-tether";
export const AP_STASIS_CONE_RULE_ID     = "ffxiv-ap-stasis-cone";
export const AP_STASIS_DEATHS_RULE_ID   = "ffxiv-ap-stasis-deaths";
export const AP_WH_DEATH_RULE_ID        = "ffxiv-ap-wormhole-death";
export const AP_WALL_RULE_ID            = "ffxiv-ap-wall";
export const AP_TRUE_HEART_RULE_ID      = "ffxiv-ap-true-heart";
export const AP_TETRASHATTER_RULE_ID    = "ffxiv-ap-tetrashatter";
export const AP_TANK_BUSTER_RULE_ID     = "ffxiv-ap-tank-buster";
const TETRASHATTER = 19080;
const CHASTENING_HEAT = 19072;
const DIVINE_SPEAR = 19074;
const J_STORM = 18550;
// Wormhole's numbers and soaks are done ~40s after its cast.
const WORMHOLE_SPAN_MS = 45_000;
// A death this soon after a knockback hit is that flight's, not the wall's.
const WALL_KNOCK_MS = 10_000;
// Temporal Stasis's cones resolve within ~10s of its cast completing.
const STASIS_DEATH_MS = 14_000;
export const AP_EMB_RULE_ID             = "ffxiv-ap-electromagnetic-burst";
export const AP_FIRE_RULE_ID            = "ffxiv-ap-fire";
export const AP_SACRAMENT_RULE_ID       = "ffxiv-ap-sacrament";
export const AP_SACRAMENT_RAID_RULE_ID  = "ffxiv-ap-sacrament-party";
export const AP_INCEPTION_SWORD_RULE_ID = "ffxiv-ap-inception-sword";
export const AP_JUMP_RULE_ID            = "ffxiv-ap-super-jump";
export const AP_WH_AIM_RULE_ID          = "ffxiv-ap-wormhole-aim";
export const AP_WH_STRAY_RULE_ID        = "ffxiv-ap-wormhole-stray";
export const AP_WH_KNOCKBACK_RULE_ID    = "ffxiv-ap-wormhole-knockback";
export const AP_WH_DEAD_GOING_IN_RULE_ID = "ffxiv-ap-wormhole-dead-going-in";
export const AP_AVOIDABLE_RULE_ID       = "ffxiv-ap-avoidable";
export const AP_SOAK_EXTRA_RULE_ID      = "ffxiv-ap-soak-extra";
export const AP_SOAK_MISSED_RULE_ID     = "ffxiv-ap-soak-missed";
export const AP_CONFESSION_RULE_ID      = "ffxiv-ap-confession";
export const AP_HEAT_RULE_ID            = "ffxiv-ap-heat-stack";
export const AP_ENUMERATION_RULE_ID     = "ffxiv-ap-enumeration";
export const AP_ENUMERATION_RAID_RULE_ID = "ffxiv-ap-enumeration-failed";
export const AP_J_WAVE_RULE_ID          = "ffxiv-ap-j-wave";
export const AP_ENRAGE_RULE_ID          = "ffxiv-ap-enrage";
export const AP_CALLED_WIPE_RULE_ID     = "ffxiv-ap-called-wipe";
export const AP_COLLAPSE_RULE_ID        = "ffxiv-ap-collapse";

const TEMPORAL_STASIS = 18522;
const HOUSE_ARREST    = 1001123;
const RESTRAINING     = 1001124;
const AGGRAVATED      = 1001121;
const SHARED_SENTENCE = 1001122;
const SURETY          = 18531;   // Plaint of Surety: the tether check (1 damage when it holds)
const ALPHA_SWORD_P3  = 18539;   // Stasis / Inception swords (Wormhole's are 18484)
const FLARETHROWER_P3 = 18540;
const INCEPTION_FORMATION = 18543;
const INCEPTION       = 18526;
const EMB             = 18548;   // Electromagnetic Burst
const FIRE_RES_DOWN   = 1002098;
const SACRAMENT       = [18527, 18519]; // Inception's cross / Wormhole's cross
const SUPER_JUMP      = 18506;
const WORMHOLE        = 18542;
const WH_SWORD        = 18484;
const WH_CHARGE       = 18883;
const REPENTANCE      = [18537, 18536, 18535]; // first / second / third soak
const CONFESSION      = 18538;
const INCINERATING_HEAT = 19025;
const ENUMERATION     = 18512;
const J_WAVE          = 18551;
const ETERNAL_DARKNESS = 18549;
const DIVINE_JUDGMENT_ENRAGE = 18552;
const TRANSITION      = 18554;   // giant Alexander's Divine Judgment: the phase is over
const FINAL_WORD      = 18557;   // Perfect Alexander's first cast

const FIRST_NUMBER_MARKER = 79;  // head markers 79..86 = Limit Cut numbers 1..8
const ENUMERATION_MARKER = 65;

type Avoidable = { name: string; advice: string };
// Never in a clean Wormhole (B, C, D, E, F); no Damage Down (Shadowbringers).
const AVOIDABLE: Record<number, Avoidable> = {
  18508: { name: "Apocalyptic Ray", advice: "after landing, Brute Justice fires five pulses at the player farthest from it (not the jump baiter; NAUR's red dot): everyone else steps out of that line" },
  18517: { name: "Eye of the Chakram", advice: "bait the chakrams in the center together, then leave along the wall before they fire" },
};

// Wormhole soaks, by round: [west owner, east owner] (odds soak west).
const SOAK_OWNERS: [number, number][] = [[5, 6], [7, 8], [1, 2]];
// Wormhole clock from Wormhole Formation, every pull within ~0.2s: numbers
// +12.3, first sword +21.7, jump +22.7, soaks +26.4 / +30.6 / +34.8.
const SOAK_AT_MS = [26_400, 30_600, 34_800];
// A sword extra this far down the cone means the holder aimed it into the
// waiting group: 12.9-28.5y in D2, D10, D12, D13, D19, E2, F2, F7. Extras
// standing near the holder were 4.1-7.2y (D11, D28, F6).
const AIM_EXTRA_MIN_Y = 10;
// Knocked off the arena by a sword/charge/jump: a death with no killing
// blow 1.8-3.6s after the hit (C14, C29, D2, D28; Limit Cut: 2.1-3.1s).
const KNOCKOFF_MIN_MS = 1_800;
const KNOCKOFF_MAX_MS = 3_600;
// A Super Jump baiter stands at the wall (17-18y out); a closer "farthest
// player" means the baiter was dead and the jump went elsewhere.
const JUMP_BAIT_MIN_Y = 12;
// Inception swords: a non-baiter within this of Cruise Chaser took a bait.
const BAIT_ZONE_Y = 4;
// Clean Plaint of Surety hits are 1-7 damage; failures 32-47k (B46).
const SURETY_FAIL_MIN = 100;
const J_WAVE_DEATHS = 3;
// The clears killed Brute Justice after 10-11 waves with nobody dying to
// them; slow kills lost players from the 10th on (D24, E30, F15). Deaths
// after a wave or two are a short-handed party (E14), not the check.
const J_WAVE_LATE = 9;
const COLLAPSE_DEAD_COUNT = 4;
const COLLAPSE_END_MS     = 30_000;
const CALLED_WIPE_COUNT   = 3;
const CALLED_WIPE_WINDOW  = 10_000;
const CALLED_WIPE_END_MS  = 12_000;

const dist = (a: { x?: number; y?: number }, b: { x?: number; y?: number }) =>
  a.x === undefined || a.y === undefined || b.x === undefined || b.y === undefined ? NaN : Math.hypot(a.x - b.x, a.y - b.y) / 100;
const fromCenter = (e: { x?: number; y?: number }) => dist(e, { x: 10000, y: 10000 });
const yd = (n: number) => `~${n.toFixed(1)}y`;
const COMPASS = ["north", "north-northeast", "northeast", "east-northeast", "east", "east-southeast", "southeast", "south-southeast",
  "south", "south-southwest", "southwest", "west-southwest", "west", "west-northwest", "northwest", "north-northwest"];
/** "northwest (bearing 318°), ~2.1y" of a player from a boss: the user reads positions as compass points (2026-10-17). */
const whereFrom = (e: { x?: number; y?: number } | undefined, boss: { x?: number; y?: number }) => {
  if (!e || e.x === undefined || e.y === undefined || boss.x === undefined || boss.y === undefined) return undefined;
  const b = (Math.atan2(e.x - boss.x, -(e.y - boss.y)) * 180 / Math.PI + 360) % 360;
  return `${yd(dist(e, boss))} ${COMPASS[Math.round(b / 22.5) % 16]} of it (bearing ${b.toFixed(0)}°)`;
};
const side = (x: number | undefined) => (x === undefined ? "?" : x > 10000 ? "E" : "W");

/** Hits of one ability on living players in [a, b]. */
function hitsIn(players: PlayerInfo[], life: Life, ids: number | number[], a: number, b: number): { p: PlayerInfo; e: PlayerEvent }[] {
  const set = new Set(Array.isArray(ids) ? ids : [ids]);
  const out: { p: PlayerInfo; e: PlayerEvent }[] = [];
  for (const p of players) for (const e of p.damageTaken) {
    if (!set.has(e.abilityId) || e.timestamp < a || e.timestamp > b || bodyHit(e)) continue;
    if (life.hitAlive(p, e.timestamp)) out.push({ p, e });
  }
  return out.sort((x, y) => x.e.timestamp - y.e.timestamp);
}

/** A death with no killing blow shortly after a hit: knocked off the arena. */
function knockedOff(deaths: DeathEvent[], p: PlayerInfo, hitT: number): DeathEvent | undefined {
  return deaths.find((d) => d.player === p.name && !d.killingAbilityGameId && d.timestamp - hitT >= KNOCKOFF_MIN_MS && d.timestamp - hitT <= KNOCKOFF_MAX_MS);
}

/** The status (one of `ids`) a player gained in [a, b]. */
function statusIn(p: PlayerInfo, ids: number[], a: number, b: number): number | undefined {
  return p.debuffs.find((e) => ids.includes(e.abilityId) && e.debuffStatus === "applied" && e.timestamp >= a && e.timestamp <= b)?.abilityId;
}

function holds(p: PlayerInfo, id: number, t: number): boolean {
  let on = false;
  for (const e of p.debuffs.filter((x) => x.abilityId === id && x.timestamp <= t).sort((a, b) => a.timestamp - b.timestamp)) on = e.debuffStatus === "applied";
  return on;
}

type Ctx = {
  players: PlayerInfo[];
  deaths: DeathEvent[];
  life: Life;
  casts: EnemyEvent[];
  errors: PullError[];
  raids: PullError[];
  occurrences?: ReportedOccurrence[];
};

const diedSoon = (c: Ctx, p: PlayerInfo, t: number, ms: number) => c.deaths.some((d) => d.player === p.name && d.timestamp >= t && d.timestamp <= t + ms + DEATH_EVENT_LAG_MS);

/**
 * The Epic of Alexander, Phase 3: Alexander Prime, from Temporal Stasis to
 * the transition hit. Self-gates on Temporal Stasis (only this phase casts
 * it).
 */
export function detectAlexanderPrimeErrors(
  players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], headMarkers: HeadMarker[] = [], occurrences?: ReportedOccurrence[],
): PullError[] {
  const stasis = castsOf(enemyCasts, TEMPORAL_STASIS, Infinity)[0];
  if (!stasis) return [];
  const t0 = stasis.timestamp;
  const start = t0 - 9_000;   // the 8s cast begins at -8
  const lastEvent = Math.max(0, ...players.flatMap((p) => [...p.damageTaken, ...p.casts].map((e) => e.timestamp)));
  const transition = enemyCasts.find((x) => x.abilityId === TRANSITION && x.timestamp > t0);
  const finalWord = enemyCasts.find((x) => x.abilityId === FINAL_WORD && x.timestamp > t0);
  const end = Math.min(transition ? transition.timestamp + 3_000 : Infinity, finalWord ? finalWord.timestamp : Infinity, lastEvent);
  const life = buildLife(players, deathEvents);
  const casts = enemyCasts.filter((x) => x.timestamp >= start && x.timestamp <= end);
  const c: Ctx = { players, deaths: deathEvents, life, casts, errors: [], raids: [], occurrences };

  detectStasis(c, t0);
  detectSurety(c, start, end);
  const formation = casts.find((x) => x.abilityId === INCEPTION_FORMATION);
  // Two or more Temporal Stasis deaths with a player still dead at
  // Inception Formation: the rest of the phase can't be played (user,
  // 2026-10-16, C10: "over after multiple deaths"; raised by Inception it's
  // "kind of recoverable"). A fallback cutoff: only without a mechanic Raid
  // and on pulls that never reached Wormhole (E4 and E30 went on to the
  // final check after the same shape).
  let stasisRaid: PullError | undefined;
  const stasisDeaths = deathEvents.filter((d) => d.timestamp - DEATH_EVENT_LAG_MS >= t0 && d.timestamp - DEATH_EVENT_LAG_MS <= t0 + STASIS_DEATH_MS)
    .sort((a, b) => a.timestamp - b.timestamp);
  const stasisDead = uniq(stasisDeaths.map((d) => d.player));
  if (formation && stasisDead.length >= 2) {
    // Two or more still down: C10 had three; D16's one was recovered from
    // and the raid wiped later, to Electromagnetic Burst (user).
    const still = players.filter((p) => !life.alive(p, formation.timestamp));
    if (still.length >= 2) {
      const second = stasisDeaths.find((d) => d.player === stasisDead[1])!;
      stasisRaid = (raidMarker(AP_STASIS_DEATHS_RULE_ID, "Temporal Stasis Deaths",
        `${joinNames(stasisDead)} died in Temporal Stasis and ${namesOf(still)} ${still.length === 1 ? "was" : "were"} still dead at Inception Formation: Inception's baits and fires need the whole party. Unresolvable from here; treated as the cutoff point.`,
        second.timestamp - DEATH_EVENT_LAG_MS, second.killingAbilityGameId, second.cause || "Temporal Stasis"));
    }
  }
  if (formation) detectInception(c, formation.timestamp, casts.find((x) => x.abilityId === INCEPTION)?.timestamp);
  const wormhole = casts.find((x) => x.abilityId === WORMHOLE);
  if (wormhole) {
    detectWormhole(c, wormhole.timestamp, headMarkers, end);
    // The first death in Wormhole is the wipe unless it comes at the very
    // end (after the third soak), and everything after it is fallout (user,
    // 2026-10-16, D10: a dragoon died to a chakram, then #3's sword went
    // into the group). The attack that caused it is kept.
    // Not when they were back up by Wormhole's end: E30 raised its first
    // Wormhole death and played on to the J Waves.
    const wh = wormhole.timestamp;
    const whEnd = Math.min(wh + WORMHOLE_SPAN_MS, lastEvent);
    const first = deathEvents.filter((d) => d.timestamp - DEATH_EVENT_LAG_MS >= wh && d.timestamp - DEATH_EVENT_LAG_MS < wh + SOAK_AT_MS[2])
      .sort((a, b) => a.timestamp - b.timestamp)
      .find((d) => { const p = players.find((x) => x.name === d.player); return !p || !life.alive(p, whEnd); });
    // Nor on a pull that played on to the final check (J Storm): it wasn't
    // the wipe there (E30, a short party to the J Waves).
    const finalCheck = casts.some((x) => x.abilityId === J_STORM && x.timestamp > wh);
    if (first && !finalCheck) {
      const t = first.timestamp - DEATH_EVENT_LAG_MS;
      const whRules = new Set([AP_WH_AIM_RULE_ID, AP_WH_STRAY_RULE_ID, AP_WH_KNOCKBACK_RULE_ID, AP_SOAK_EXTRA_RULE_ID, AP_SOAK_MISSED_RULE_ID, AP_JUMP_RULE_ID, AP_AVOIDABLE_RULE_ID]);
      c.errors = c.errors.filter((e) => !(whRules.has(e.ruleId) && e.timestamp > t + 500 && e.timestamp <= wh + WORMHOLE_SPAN_MS));
      const fp = players.find((p) => p.name === first.player);
      const killer = fp?.damageTaken.filter((e) => e.abilityId === first.killingAbilityGameId && e.timestamp <= first.timestamp).pop()?.abilityName;
      c.raids.push(raidMarker(AP_WH_DEATH_RULE_ID, "Death in Wormhole",
        `${first.player} died (${first.killingAbilityGameId ? first.cause || killer || "an attack" : "no killing blow"}) during Wormhole: with a number down, the soaks and the rest of the sequence can't all be covered, so later hits are its fallout. Treated as the cutoff point.`,
        t, first.killingAbilityGameId, first.cause || killer || "Death"));
    }
  }
  detectApWall(c, start, end, lastEvent);
  detectTankBuster(c, start, end);
  detectSacrament(c, start, end);
  detectEnding(c, headMarkers, wormhole?.timestamp, end);

  const errors = c.errors;
  const firstRaid = c.raids.sort((a, b) => a.timestamp - b.timestamp)[0];
  // The Stasis fallback wins when earlier than a mechanic Raid (C10: its
  // True Heart Raid came after the Stasis deaths).
  if (stasisRaid && !wormhole && (!firstRaid || stasisRaid.timestamp < firstRaid.timestamp)) errors.push(stasisRaid);
  else if (firstRaid) errors.push(firstRaid);
  else if (!transition) {
    const marker = genericCutoff(c, start, lastEvent);
    if (marker) errors.push(marker);
  }
  return errors.sort((a, b) => a.timestamp - b.timestamp);
}

// ── Temporal Stasis ─────────────────────────────────────────────────────────

const STASIS_ROLE: Record<number, string> = { [HOUSE_ARREST]: "House Arrest", [RESTRAINING]: "Restraining Order", [AGGRAVATED]: "Aggravated Assault" };
const ORD = ["first", "second", "third"];

/**
 * Temporal Stasis freezes everyone, then Cruise Chaser cuts its three
 * nearest players with Alpha Sword and Brute Justice its two nearest with
 * Flarethrower. NAUR (the static's plan in every clean pull): House Arrest
 * flanks the east boss north/south, no debuff the west boss, Aggravated
 * Assault waits at Brute Justice's wall, and the Restraining Order on
 * Cruise Chaser's side stands at its inner marker for the third sword.
 * A cone that hits two players, an Assault holder or someone it isn't
 * meant for names, in order: whoever stood on the wrong side; the owner who
 * wasn't there to take it; else the owner whose cone ran through the
 * others (stood off the north-south line).
 */
function detectStasis(c: Ctx, t0: number) {
  const { players, life } = c;
  const firstCone = c.casts.find((x) => (x.abilityId === ALPHA_SWORD_P3 || x.abilityId === FLARETHROWER_P3) && x.timestamp > t0);
  // A dead player shifts every bait. Read at the first cone, not the cast:
  // C10's Paladin was raised 4s into it, before the swords (user: his
  // wrong side and the far tether's distance were the errors).
  if (!firstCone || players.some((p) => !life.alive(p, firstCone.timestamp - 300))) return;
  const role = new Map<PlayerInfo, number | undefined>(players.map((p) => [p, statusIn(p, [HOUSE_ARREST, RESTRAINING, AGGRAVATED], t0 - 12_000, t0 + 3_000)]));
  if (![...role.values()].some((r) => r === HOUSE_ARREST)) return;
  // Frozen positions: any hit during the freeze.
  const pos = new Map<PlayerInfo, PlayerEvent>();
  for (const p of players) {
    const e = p.damageTaken.find((x) => x.timestamp >= t0 + 2_000 && x.timestamp <= t0 + 9_000 && x.x !== undefined);
    if (e) pos.set(p, e);
  }
  const swords = c.casts.filter((x) => x.abilityId === ALPHA_SWORD_P3 && x.timestamp > t0 && x.timestamp <= t0 + 12_000);
  const flares = c.casts.filter((x) => x.abilityId === FLARETHROWER_P3 && x.timestamp > t0 && x.timestamp <= t0 + 12_000);
  if (!swords.length || swords[0].x === undefined) return;
  const ccSide = side(swords[0].x);
  const bjSide = ccSide === "E" ? "W" : "E";
  const boss = (s: string) => (s === ccSide ? "Cruise Chaser" : "Brute Justice");
  const expectedSide = (p: PlayerInfo): string | undefined => {
    const r = role.get(p);
    return r === HOUSE_ARREST ? "E" : r === undefined ? "W" : r === AGGRAVATED ? bjSide : undefined;
  };
  const roleName = (p: PlayerInfo) => STASIS_ROLE[role.get(p) ?? 0] ?? "no debuff";
  const nearPair = (s: string) => players.filter((p) => (s === "E" ? role.get(p) === HOUSE_ARREST : role.get(p) === undefined));
  const ccRO = players.filter((p) => role.get(p) === RESTRAINING && side(pos.get(p)?.x) === ccSide);

  type Cone = { cast: EnemyEvent; name: string; idx: number; owners: PlayerInfo[]; hits: { p: PlayerInfo; e: PlayerEvent }[] };
  const cones: Cone[] = [];
  const build = (list: EnemyEvent[], name: string, bossSide: string) => list.forEach((cast, idx) => {
    const next = list[idx + 1]?.timestamp ?? cast.timestamp + 1_500;
    const hits = hitsIn(players, life, cast.abilityId, cast.timestamp, Math.min(next, cast.timestamp + 1_500));
    const owners = bossSide === ccSide && idx === 2 ? ccRO : nearPair(bossSide);
    cones.push({ cast, name, idx, owners, hits });
  });
  build(swords, "Alpha Sword", ccSide);
  build(flares, "Flarethrower", bjSide);
  cones.sort((a, b) => a.cast.timestamp - b.cast.timestamp);

  const flagged = new Set<PlayerInfo>();
  const tainted = new Set<PlayerInfo>();   // already hit by a failed cone
  const stasisEnd = t0 + 14_000;
  for (const k of cones) {
    const victims = uniq(k.hits.map((h) => h.p));
    if (!victims.length) continue;
    const earlier = cones.filter((o) => o.cast.abilityId === k.cast.abilityId && o.idx < k.idx).flatMap((o) => o.hits.map((h) => h.p));
    const wrongVictim = victims.some((p) => !k.owners.includes(p));
    if (victims.length < 2 && !wrongVictim) continue;
    if (victims.every((p) => tainted.has(p))) continue;   // the same pair again: fallout
    victims.forEach((p) => tainted.add(p));
    const coneName = `${boss(side(k.cast.x))}'s ${ORD[k.idx]} ${k.name}`;
    const deaths = victims.filter((p) => diedSoon(c, p, k.cast.timestamp, stasisEnd - k.cast.timestamp));
    // A misplaced bait usually kills at a later cone of the same freeze (E30).
    const severe = deaths.length > 0 || c.deaths.some((d) => [ALPHA_SWORD_P3, FLARETHROWER_P3].includes(d.killingAbilityGameId)
      && d.timestamp >= k.cast.timestamp && d.timestamp <= stasisEnd + DEATH_EVENT_LAG_MS);
    const outcome = (who: PlayerInfo[]) => {
      const others = who.length ? ` and hit ${namesOf(who)}` : "";
      return `${others}${severe ? `; ${namesOf(deaths)} died under its vulnerability` : ""}`;
    };
    const push = (p: PlayerInfo, name: string, description: string) => {
      if (flagged.has(p)) return;
      flagged.add(p);
      c.errors.push(playerError(p, {
        ruleId: AP_STASIS_CONE_RULE_ID, severity: severe ? "Major" : "Minor", name, description,
        timestamp: k.cast.timestamp, abilityId: k.cast.abilityId, abilityName: k.name,
      }));
    };
    // (a) Standing on the wrong side.
    const wrongSide = victims.filter((p) => { const s = expectedSide(p); return s !== undefined && side(pos.get(p)?.x) !== s; });
    if (wrongSide.length) {
      for (const p of wrongSide) {
        push(p, "Temporal Stasis: Wrong Side",
          `With ${roleName(p)} they were frozen on the ${side(pos.get(p)?.x) === "E" ? "east" : "west"} side, by ${boss(side(pos.get(p)?.x))}: ${coneName} reached them${outcome(victims.filter((v) => v !== p))}. NAUR: Aggravated Assault waits at Brute Justice's wall, House Arrest flanks the east boss, no debuff the west boss.`);
      }
      continue;
    }
    // (b) The owner wasn't there: the bait went to the next-nearest player.
    const available = k.owners.filter((p) => life.alive(p, k.cast.timestamp) && !earlier.includes(p));
    if (!victims.some((p) => k.owners.includes(p)) && available.length) {
      for (const p of available) {
        const at = whereFrom(pos.get(p), k.cast);
        const v = victims.map((q) => dist(pos.get(q) ?? {}, k.cast)).filter((x) => !isNaN(x));
        push(p, "Temporal Stasis: Missed Bait",
          `${coneName} was theirs (${roleName(p)}), but they were frozen ${at ?? "too far from it"}${v.length ? `, no closer than ${namesOf(victims)} (${yd(Math.min(...v))})` : ""}: the cone went to the nearest players instead${outcome(victims)}. ${k.idx === 2 ? "The Restraining Order on Cruise Chaser's side stands at its inner marker, closer than the far boss's pair." : "Stand right beside your boss, north or south of it."}`);
      }
      continue;
    }
    // (c) The owner's cone ran through someone else.
    const owner = victims.filter((p) => k.owners.includes(p)).sort((a, b) => dist(pos.get(a) ?? {}, k.cast) - dist(pos.get(b) ?? {}, k.cast))[0];
    if (!owner) continue;
    const at = whereFrom(pos.get(owner), k.cast);
    push(owner, "Temporal Stasis: Cone Through Others",
      `${coneName}, their bait, also hit ${namesOf(victims.filter((v) => v !== owner))}${severe ? `; ${namesOf(deaths)} died under its vulnerability` : ""}. They were frozen ${at ?? "off the line"}, not straight north or south of it (bearing 0° or 180°), so the cone ran toward the wall spots behind them.`);
  }
  // Frozen on the wrong side with no cone reaching them: still the plan
  // broken (user, 2026-10-16, C10 +5:11: the Paladin's Assault at Cruise
  // Chaser's wall). Minor: the cones went elsewhere.
  for (const p of players) {
    const s = expectedSide(p);
    if (s === undefined || flagged.has(p) || !pos.has(p) || side(pos.get(p)!.x) === s) continue;
    flagged.add(p);
    c.errors.push(playerError(p, {
      ruleId: AP_STASIS_CONE_RULE_ID, severity: "Minor", name: "Temporal Stasis: Wrong Side",
      description: `With ${roleName(p)} they were frozen on the ${side(pos.get(p)!.x) === "E" ? "east" : "west"} side, by ${boss(side(pos.get(p)!.x))}. NAUR: Aggravated Assault waits at Brute Justice's wall, House Arrest flanks the east boss, no debuff the west boss.`,
      timestamp: swords[0].timestamp, abilityId: TEMPORAL_STASIS, abilityName: "Temporal Stasis",
    }));
  }
}

/** Plaint of Surety deals 1 damage when the tether holds; a failed check hits each end hard. */
function detectSurety(c: Ctx, start: number, end: number) {
  const hits = hitsIn(c.players, c.life, SURETY, start, end).filter((h) => (h.e.amount ?? 0) >= SURETY_FAIL_MIN
    || c.deaths.some((d) => d.player === h.p.name && d.killingAbilityGameId === SURETY && d.timestamp >= h.e.timestamp && d.timestamp <= h.e.timestamp + 3_000));
  const seen = new Set<string>();
  for (const h of hits) {
    const key = `${h.e.sourceInstance}@${Math.round(h.e.timestamp / 2000)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const pair = hits.filter((x) => x.e.sourceInstance === h.e.sourceInstance && Math.abs(x.e.timestamp - h.e.timestamp) <= 1_000);
    const who = uniq(pair.map((x) => x.p));
    // House Arrest comes off at the resolution, just before the check's hit.
    const close = who.some((p) => statusIn(p, [HOUSE_ARREST], h.e.timestamp - 15_000, h.e.timestamp) !== undefined);
    const killed = who.filter((p) => c.life.diedFrom(p, h.e.timestamp));
    const sep = who.length === 2 ? dist(pair[0].e, pair[1].e) : NaN;
    for (const p of who) {
      c.errors.push(playerError(p, {
        ruleId: AP_STASIS_TETHER_RULE_ID, severity: "Major", name: close ? "House Arrest Too Far" : "Restraining Order Too Close",
        description: `Plaint of Surety punished their ${close ? "House Arrest" : "Restraining Order"} tether (${kFmt(realAmount(pair.find((x) => x.p === p)!.e))}${isNaN(sep) ? "" : `, ${yd(sep)} apart`})${killed.length ? `; ${namesOf(killed)} died` : ""}. ${close ? "House Arrest partners stand together, within ~5y" : "Restraining Order partners go to opposite walls"}. The log can't say which of the two moved.`,
        timestamp: h.e.timestamp, abilityId: SURETY, abilityName: "Plaint of Surety",
      }));
    }
  }
}

// ── Inception ───────────────────────────────────────────────────────────────

function detectInception(c: Ctx, formation: number, inception: number | undefined) {
  const { players, life } = c;
  // Electromagnetic Burst: the plasmaspheres' penalty, a raid-wide wipe.
  const emb = c.casts.find((x) => x.abilityId === EMB && x.timestamp > formation && x.timestamp <= formation + 40_000);
  if (emb) {
    const killed = players.filter((p) => c.deaths.some((d) => d.player === p.name && d.killingAbilityGameId === EMB));
    c.raids.push(raidMarker(AP_EMB_RULE_ID, "Electromagnetic Burst",
      `Electromagnetic Burst went off as the plasmaspheres were taken${killed.length ? ` and killed ${killed.length}` : ""}: the raid penalty when the orbs' explosions meet. The orb pops sat where the clean pulls' do, and the log doesn't track the orbs' paths, so it can't say whose orb. Unresolvable from here; treated as the cutoff point.`,
      emb.timestamp, EMB, "Electromagnetic Burst"));
  }

  // The True Heart touches all four crystals; each bursts (Tetrashatter
  // 19080). Fewer than four bursts: the Heart missed one and never turns
  // gold, so Perfect Alexander can't be cleared (user, 2026-10-16, D23).
  // Every other Inception on disk had four (C10 two, C18 and D23 three).
  const pullEnd = Math.max(0, ...players.flatMap((p) => p.damageTaken.map((e) => e.timestamp)));
  const bursts = c.casts.filter((x) => x.abilityId === TETRASHATTER && x.timestamp > formation + 15_000 && x.timestamp <= formation + 40_000);
  if (!emb && bursts.length && bursts.length < 4 && pullEnd > formation + 35_000) {
    c.raids.push(raidMarker(AP_TRUE_HEART_RULE_ID, "True Heart Not Awakened",
      `Only ${bursts.length} of the four Judgment Crystals burst: the True Heart missed one and didn't turn gold, so its Enigma Codex is lost and Perfect Alexander can't be cleared. Unresolvable from here; treated as the cutoff point.`,
      bursts[bursts.length - 1].timestamp + 1_000, TETRASHATTER, "Tetrashatter"));
  }
  // Dying to a crystal's burst is standing too close to it (user, D12
  // +6:07.3: the sage, two crystals' bursts).
  // Not after Electromagnetic Burst: the pull is over (D16, user).
  for (const d of c.deaths.filter((x) => x.killingAbilityGameId === TETRASHATTER && x.timestamp >= formation && x.timestamp <= formation + 45_000 && !(emb && x.timestamp > emb.timestamp))) {
    const p = players.find((x) => x.name === d.player);
    if (p) c.errors.push(playerError(p, {
      ruleId: AP_TETRASHATTER_RULE_ID, severity: "Major", name: "Killed by a Crystal Burst",
      description: "Died to Tetrashatter, the Judgment Crystals' proximity burst when the True Heart touches them: after placing or passing a crystal, step away from it toward Alexander Prime.",
      timestamp: d.timestamp - DEATH_EVENT_LAG_MS, abilityId: TETRASHATTER, abilityName: "Tetrashatter",
    }));
  }

  // Three Flarethrowers after the orbs: two tank baits, then the party.
  const fires = c.casts.filter((x) => x.abilityId === FLARETHROWER_P3 && x.timestamp > formation + 20_000 && x.timestamp <= formation + 45_000);
  const flagged = new Set<PlayerInfo>();
  const excused = new Set<PlayerInfo>();   // a short party's tank-fire extras: their later repeat too
  fires.forEach((f, i) => {
    const hits = hitsIn(players, life, FLARETHROWER_P3, f.timestamp, Math.min(fires[i + 1]?.timestamp ?? Infinity, f.timestamp + 1_800));
    const victims = uniq(hits.map((h) => h.p));
    if (!victims.length) return;
    // A short party can't keep the fire order: the tank fires' extras are
    // fallout (user, 2026-10-16, C10 +6:13.4, a black mage still dead from
    // Temporal Stasis). A repeat under Fire Resistance Down is still flagged.
    const short = players.some((p) => !life.alive(p, f.timestamp - 300));
    if (short && i < 2) victims.filter((p) => p.name !== f.target).forEach((p) => excused.add(p));
    // The next fire under Fire Resistance Down kills: C10's first-fire
    // extras died at the third, 4.5s later.
    const died = (p: PlayerInfo) => diedSoon(c, p, f.timestamp, 10_000);
    if (i < 2 && !short) {
      const baiter = victims.find((p) => p.name === f.target) ?? [...victims].sort((a, b) => dist(hits.find((h) => h.p === a)!.e, f) - dist(hits.find((h) => h.p === b)!.e, f))[0];
      for (const p of victims.filter((v) => v !== baiter)) {
        flagged.add(p);
        c.errors.push(playerError(p, {
          ruleId: AP_FIRE_RULE_ID, severity: died(p) ? "Major" : "Minor", name: "In a Tank's Flarethrower",
          description: `Hit by the ${ORD[i]} Flarethrower, ${baiter.name}'s bait${died(p) ? ", and died (Fire Resistance Down II made the next fire lethal)" : ""}. The first two fires go to the tanks one at a time; everyone else waits away from Brute Justice for the third.`,
          timestamp: f.timestamp, abilityId: FLARETHROWER_P3, abilityName: "Flarethrower",
        }));
      }
    }
    for (const h of hits) {
      // Fire Resistance Down lands ~0.3-0.9s before its own fire's damage:
      // read it at the cast.
      if (flagged.has(h.p) || excused.has(h.p) || !holds(h.p, FIRE_RES_DOWN, f.timestamp - 200)) continue;
      flagged.add(h.p);
      c.errors.push(playerError(h.p, {
        ruleId: AP_FIRE_RULE_ID, severity: died(h.p) ? "Major" : "Minor", name: "Fire Under Fire Resistance Down",
        description: `Hit by the ${ORD[i]} Flarethrower (${kFmt(realAmount(h.e))}) while still under Fire Resistance Down II from an earlier one${died(h.p) ? ", and died" : ""}. After taking a fire, leave the next bait's path.`,
        timestamp: h.e.timestamp, abilityId: FLARETHROWER_P3, abilityName: "Flarethrower",
      }));
    }
  });

  if (inception === undefined) return;
  // Inception's three swords: two baiters near Cruise Chaser plus the
  // non-tank far tether. Baiters: non-tanks with no debuff, or the far tether.
  const debuff = new Map<PlayerInfo, number | undefined>(players.map((p) => [p, statusIn(p, [RESTRAINING, AGGRAVATED, SHARED_SENTENCE], inception - 20_000, inception + 2_000)]));
  const baiterRole = (p: PlayerInfo) => !isTank(p) && (debuff.get(p) === undefined || debuff.get(p) === RESTRAINING);
  const swords = c.casts.filter((x) => x.abilityId === ALPHA_SWORD_P3 && x.timestamp > inception && x.timestamp <= inception + 20_000);
  if (players.every((p) => life.alive(p, swords[0]?.timestamp ?? inception))) {
    const tainted = new Set<PlayerInfo>();
    swords.forEach((s, i) => {
      const hits = hitsIn(players, life, ALPHA_SWORD_P3, s.timestamp, Math.min(swords[i + 1]?.timestamp ?? Infinity, s.timestamp + 1_000));
      if (hits.length < 2 || hits.every((h) => tainted.has(h.p))) return;
      hits.forEach((h) => tainted.add(h.p));
      const byDist = [...hits].sort((a, b) => dist(a.e, s) - dist(b.e, s));
      const owner = byDist[0];
      const others = byDist.slice(1).map((h) => h.p);
      const killed = hits.filter((h) => diedSoon(c, h.p, s.timestamp, 8_000)).map((h) => h.p);
      const d = dist(owner.e, s);
      const what = baiterRole(owner.p)
        ? `They were nearest Cruise Chaser (${yd(d)}) and its cone ran through ${namesOf(others)}. NAUR's three baiters stand close in: regen healer north, shield healer south, far-tether DPS west, so each cone points away from the rest`
        : `With ${debuff.get(owner.p) === SHARED_SENTENCE ? "Shared Sentence" : debuff.get(owner.p) === AGGRAVATED ? "Aggravated Assault" : "a tank's role"} they don't bait a sword, but stood ${yd(d)} from Cruise Chaser, nearest: the sword took them and ${namesOf(others)}`;
      c.errors.push(playerError(owner.p, {
        ruleId: AP_INCEPTION_SWORD_RULE_ID, severity: killed.length ? "Major" : "Minor", name: "Inception Sword Through Others",
        description: `${ORD[i][0].toUpperCase()}${ORD[i].slice(1)} Alpha Sword after Inception. ${what}.${killed.length ? ` ${namesOf(killed)} died under its vulnerability.` : ""}`,
        timestamp: s.timestamp, abilityId: ALPHA_SWORD_P3, abilityName: "Alpha Sword",
      }));
      // A second non-baiter standing in the bait zone too.
      for (const h of byDist.slice(1)) {
        if (baiterRole(h.p) || dist(h.e, s) > BAIT_ZONE_Y || !baiterRole(owner.p)) continue;
        c.errors.push(playerError(h.p, {
          ruleId: AP_INCEPTION_SWORD_RULE_ID, severity: killed.includes(h.p) ? "Major" : "Minor", name: "Inception Sword Through Others",
          description: `They don't bait a sword but stood ${yd(dist(h.e, s))} from Cruise Chaser and took ${owner.p.name}'s cone.`,
          timestamp: s.timestamp, abilityId: ALPHA_SWORD_P3, abilityName: "Alpha Sword",
        }));
      }
    });
  }
  // Super Jump after the swords: the jump tank at the east wall.
  detectJump(c, inception + 5_000, inception + 22_000, undefined);
}

/** Super Jump: the farthest player baits it at the wall; anyone else in its circle stood too close. */
function detectJump(c: Ctx, a: number, b: number, owners: PlayerInfo[] | undefined, displaced?: (p: PlayerInfo, t: number) => boolean) {
  const jump = c.casts.find((x) => x.abilityId === SUPER_JUMP && x.timestamp >= a && x.timestamp <= b);
  if (!jump) return;
  const hits = hitsIn(c.players, c.life, SUPER_JUMP, jump.timestamp, jump.timestamp + 2_000);
  if (hits.length < 2) return;
  const baiter = owners
    ? hits.find((h) => owners.includes(h.p))
    : [...hits].sort((x, y) => fromCenter(y.e) - fromCenter(x.e))[0];
  if (!baiter || fromCenter(baiter.e) < JUMP_BAIT_MIN_Y || displaced?.(baiter.p, jump.timestamp)) return;
  for (const h of hits.filter((x) => x !== baiter && x.p !== baiter.p)) {
    const off = knockedOff(c.deaths, h.p, h.e.timestamp);
    const died = !!c.life.diedFrom(h.p, h.e.timestamp) || !!off;
    c.errors.push(playerError(h.p, {
      ruleId: AP_JUMP_RULE_ID, severity: died ? "Major" : "Minor", name: "Hit by Super Jump",
      description: `Caught in Super Jump on ${baiter.p.name} (${yd(dist(h.e, baiter.e))} from them, ${kFmt(realAmount(h.e))})${off ? " and knocked off the arena" : died ? " and died" : ""}. Only the jump baiter stands at the wall; everyone else keeps ~10y away from them.`,
      timestamp: h.e.timestamp, abilityId: SUPER_JUMP, abilityName: "Super Jump",
    }));
  }
}

/** Sacrament's cross is lethal; four or more inside it at once is the party on the wrong safe spot. */
function detectSacrament(c: Ctx, start: number, end: number) {
  const hits = hitsIn(c.players, c.life, SACRAMENT, start, end);
  const groups: (typeof hits)[] = [];
  for (const h of hits) {
    const g = groups[groups.length - 1];
    if (g && h.e.timestamp - g[0].e.timestamp <= 1_500) g.push(h); else groups.push([h]);
  }
  for (const g of groups) {
    const who = uniq(g.map((h) => h.p));
    const t = g[0].e.timestamp;
    if (who.length >= 4) {
      c.raids.push(raidMarker(AP_SACRAMENT_RAID_RULE_ID, "Party in Sacrament",
        `Sacrament's cross hit ${who.length} players (${namesOf(who)}): the party stood in its lanes, a wrong safe spot rather than one player's mistake. Unresolvable from here; treated as the cutoff point.`,
        t, g[0].e.abilityId, "Sacrament"));
      continue;
    }
    for (const p of who) {
      const died = !!c.life.diedFrom(p, t) || diedSoon(c, p, t, 3_000);
      c.errors.push(playerError(p, {
        ruleId: AP_SACRAMENT_RULE_ID, severity: died ? "Major" : "Minor", name: "Hit by Sacrament",
        description: `Hit by Sacrament${died ? " and died" : ""}: Alexander Prime's cross covers 16y-wide lanes through its new spot. ${g[0].e.abilityId === 18519 ? "In Wormhole, #3 and #4 move along the wall away from Alexander Prime after their hits." : "Stand on the far-tether or stack spot outside both lanes."}`,
        timestamp: t, abilityId: g[0].e.abilityId, abilityName: "Sacrament",
      }));
    }
  }
}

// ── Wormhole ────────────────────────────────────────────────────────────────

type Attack = { n: number; sword: boolean; cast: EnemyEvent; holder?: PlayerInfo; hits: { p: PlayerInfo; e: PlayerEvent }[] };

/**
 * Wormhole: Limit Cut numbers from head markers. Odd numbers take Cruise
 * Chaser's sword (it teleports behind them; the cone runs along their
 * facing), even numbers its charge. Two puddles need one soaker each at
 * three checks: 5/6, then 7/8, then 1/2 (odds west, evens east); a missed
 * check is Confession, a raid-wide wipe.
 */
function detectWormhole(c: Ctx, wh: number, headMarkers: HeadMarker[], end: number) {
  const { players, life } = c;
  const marks = headMarkers.filter((m) => m.markerId >= FIRST_NUMBER_MARKER && m.markerId <= FIRST_NUMBER_MARKER + 7 && m.timestamp >= wh && m.timestamp <= wh + 20_000);
  const number = new Map<PlayerInfo, number>();
  for (const m of marks) {
    const p = players.find((x) => x.name === m.player);
    if (p) number.set(p, m.markerId - FIRST_NUMBER_MARKER + 1);
  }
  const holderOf = (n: number) => [...number.entries()].find(([, k]) => k === n)?.[0];
  const markT = marks.length ? Math.min(...marks.map((m) => m.timestamp)) : wh + 12_300;
  if (marks.length) {
    const unmarked = players.filter((p) => !number.has(p) && !life.alive(p, markT));
    if (unmarked.length) {
      c.raids.push(raidMarker(AP_WH_DEAD_GOING_IN_RULE_ID, "Player Dead Going Into Wormhole",
        `${namesOf(unmarked)} ${unmarked.length === 1 ? "was" : "were"} dead when the Wormhole numbers went out: ${unmarked.length === 1 ? "a number has" : "numbers have"} no holder and the puddle soaks can't all be covered. Unresolvable from here; treated as the cutoff point.`,
        markT, 0, "Limit Cut"));
    }
  }

  // Numbered attacks, in order: sword #1, charge #2, sword #3, ...
  const atkCasts = c.casts.filter((x) => (x.abilityId === WH_SWORD || x.abilityId === WH_CHARGE) && x.timestamp >= wh && x.timestamp <= wh + 45_000);
  const attacks: Attack[] = atkCasts.map((cast, i) => {
    const hits = hitsIn(players, life, cast.abilityId, cast.timestamp, Math.min(atkCasts[i + 1]?.timestamp ?? Infinity, cast.timestamp + 900));
    return { n: i + 1, sword: cast.abilityId === WH_SWORD, cast, holder: holderOf(i + 1), hits };
  });
  // Hit by someone else's attack (or a beam): their later deaths are that hit's.
  const doomedAt = new Map<PlayerInfo, number>();
  const doomed = { has: (p: PlayerInfo, t: number) => (doomedAt.get(p) ?? Infinity) <= t, add: (p: PlayerInfo, t: number) => { if (!doomedAt.has(p)) doomedAt.set(p, t); } };
  const flagged = new Set<string>();
  const deathAfter = (p: PlayerInfo, t: number) => diedSoon(c, p, t, 15_000);
  const push = (p: PlayerInfo, ruleId: string, severity: PullError["severity"], name: string, description: string, a: Attack) => {
    const key = `${ruleId}|${p.name}`;
    if (flagged.has(key)) return;
    flagged.add(key);
    c.errors.push(playerError(p, { ruleId, severity, name, description, timestamp: a.cast.timestamp, abilityId: a.cast.abilityId, abilityName: a.sword ? "Alpha Sword" : "Super Blassty Charge" }));
  };
  let prev: Attack | undefined;
  for (const a of attacks) {
    const h = a.holder;
    if (h) c.occurrences?.push({ mechanicKey: AP_WH_AIM_RULE_ID, timestamp: a.cast.timestamp, players: [h.name] });
    const label = `${a.sword ? "Alpha Sword" : "Super Blassty Charge"} (#${a.n})`;
    if (!h || !life.hitAlive(h, a.cast.timestamp) || doomed.has(h, a.cast.timestamp)) {   // retargets: fallout
      a.hits.filter((x) => x.p !== h).forEach((x) => doomed.add(x.p, a.cast.timestamp));
      prev = a;
      continue;
    }
    const victims = uniq(a.hits.map((x) => x.p));
    const extras = victims.filter((p) => p !== h && !doomed.has(p, a.cast.timestamp));
    const ownHit = a.hits.find((x) => x.p === h);
    if (!extras.length) {
      const off = ownHit ? knockedOff(c.deaths, h, ownHit.e.timestamp) : undefined;
      if (off && !victims.some((p) => p !== h)) {
        push(h, AP_WH_KNOCKBACK_RULE_ID, "Major", "Knocked Off by Own Attack",
          `Their own ${label} knocked them off the arena; they died ${((off.timestamp - ownHit!.e.timestamp) / 1000).toFixed(1)}s later. Use knockback immunity (Arm's Length / Surecast) for it, or face Cruise Chaser, which shortens the knockback a lot.`, a);
      }
      prev = a;
      continue;
    }
    const dead = extras.filter((p) => deathAfter(p, a.cast.timestamp));
    const deadText = dead.length ? ` ${namesOf(dead)} died (a second numbered hit under the vulnerability kills, and the sword and charge knock back).` : "";
    const sev: PullError["severity"] = dead.length ? "Major" : "Minor";
    const strike = { x: a.cast.x, y: a.cast.y };
    if (a.sword) {
      const far = extras.filter((p) => dist(a.hits.find((x) => x.p === p)!.e, strike) >= AIM_EXTRA_MIN_Y);
      if (far.length) {
        const ds = far.map((p) => dist(a.hits.find((x) => x.p === p)!.e, strike));
        push(h, AP_WH_AIM_RULE_ID, sev, "Wormhole Sword Aimed Into the Party",
          `Their ${label} ran ${yd(Math.max(...ds))} down the cone into ${namesOf(extras)}.${deadText} Cruise Chaser appears behind you and cuts along your facing: face out toward the wall so the cone points away from the players waiting on the north side.`, a);
      } else {
        for (const p of extras) {
          push(p, AP_WH_STRAY_RULE_ID, deathAfter(p, a.cast.timestamp) ? "Major" : "Minor", "Hit by Another Number's Attack",
            `Hit by #${a.n}'s ${label} while standing ${yd(dist(a.hits.find((x) => x.p === p)!.e, strike))} from where Cruise Chaser struck${deathAfter(p, a.cast.timestamp) ? ", and died" : ""}. Wait at your own spot along the wall, clear of the active number.`, a);
        }
      }
    } else {
      const partner = prev && prev.sword && a.cast.timestamp - prev.cast.timestamp <= 2_500 ? prev.holder : undefined;
      if (partner && extras.includes(partner)) {
        push(partner, AP_WH_STRAY_RULE_ID, deathAfter(partner, a.cast.timestamp) ? "Major" : "Minor", "In the Charge After Own Sword",
          `After their own sword (#${a.n - 1}), Cruise Chaser charged #${a.n} from beside them and the line hit them${deathAfter(partner, a.cast.timestamp) ? "; they died under the sword's vulnerability" : ""}. Face out so Cruise Chaser appears on the inner side, then step away from its line to #${a.n}.`, a);
      }
      const rest = extras.filter((p) => p !== partner);
      if (rest.length >= 2) {
        push(h, AP_WH_AIM_RULE_ID, sev, "Wormhole Charge Through the Party",
          `Their ${label} hit ${namesOf(rest)} on its way to them.${deadText} The log can't say whether the line came to the group or the group stood on the line, so the players hit are named too.`, a);
      }
      for (const p of rest) {
        push(p, AP_WH_STRAY_RULE_ID, deathAfter(p, a.cast.timestamp) ? "Major" : "Minor", "Hit by Another Number's Attack",
          `Hit by #${a.n}'s ${label}${deathAfter(p, a.cast.timestamp) ? ", and died" : ""}. Stay off the line between Cruise Chaser and the even number it charges.`, a);
      }
    }
    extras.forEach((p) => doomed.add(p, a.cast.timestamp));
    prev = a;
  }

  // Super Jump on #3 or #4, whichever is farther from Brute Justice.
  // A baiter already knocked about by another number's attack drags the
  // jump onto the waiting players: that's the earlier hit's (C12, D7).
  const jumpOwners = [holderOf(3), holderOf(4)].filter((p): p is PlayerInfo => !!p);
  detectJump(c, wh + 15_000, wh + 26_000, jumpOwners, (p, t) => doomed.has(p, t));

  // Avoidable ground and beam hits.
  for (const [id, k] of Object.entries(AVOIDABLE)) {
    for (const x of hitsIn(players, life, Number(id), wh, Math.min(end, wh + 45_000))) {
      if (flagged.has(`${AP_AVOIDABLE_RULE_ID}|${x.p.name}|${id}`)) continue;
      flagged.add(`${AP_AVOIDABLE_RULE_ID}|${x.p.name}|${id}`);
      // Apocalyptic Ray pulses five times: a later pulse can be the lethal one (C14).
      const died = !!life.diedFrom(x.p, x.e.timestamp)
        || c.deaths.some((d) => d.player === x.p.name && d.killingAbilityGameId === x.e.abilityId && d.timestamp >= x.e.timestamp && d.timestamp <= x.e.timestamp + 8_000);
      c.errors.push(playerError(x.p, {
        ruleId: AP_AVOIDABLE_RULE_ID, severity: died ? "Major" : "Minor", name: `Hit by ${k.name}`,
        description: `Hit by ${k.name} (${kFmt(realAmount(x.e))})${died ? " and died" : ""}: ${k.advice}.`,
        timestamp: x.e.timestamp, abilityId: x.e.abilityId, abilityName: k.name,
      }));
      doomed.add(x.p, x.e.timestamp);
    }
  }

  // Puddle soaks.
  const wrongSoak = new Set<PlayerInfo>();
  REPENTANCE.forEach((id, r) => {
    const at = wh + SOAK_AT_MS[r];
    const owed = SOAK_OWNERS[r];
    const owners = owed.map((n) => holderOf(n));
    const live = owners.filter((p): p is PlayerInfo => !!p && life.alive(p, at - 500));
    if (live.length) c.occurrences?.push({ mechanicKey: AP_SOAK_MISSED_RULE_ID, timestamp: at - 1_000, players: live.map((p) => p.name) });
    const soaks = hitsIn(players, life, id, at - 1_500, at + 1_500);
    for (const s of soaks) {
      const n = number.get(s.p);
      const sideIdx = side(s.e.x) === "W" ? 0 : 1;
      if (n === owed[sideIdx]) continue;
      const owner = owners[sideIdx];
      if (!owner || !life.alive(owner, at - 500) || doomed.has(owner, at)) continue;   // covering for a missing soaker
      wrongSoak.add(s.p);
      const died = diedSoon(c, s.p, s.e.timestamp, 10_000);
      const theirs = n === undefined ? "" : n === 3 || n === 4 ? ` #${n} never soaks.` : ` #${n} soaks ${["first", "second", "third"][SOAK_OWNERS.findIndex((o) => o.includes(n))]}.`;
      c.errors.push(playerError(s.p, {
        ruleId: AP_SOAK_EXTRA_RULE_ID, severity: died ? "Major" : "Minor", name: "Soaked the Wrong Puddle Check",
        description: `Soaked the ${["first", "second", "third"][r]} Void of Repentance check on the ${sideIdx ? "east" : "west"} puddle, which was #${owed[sideIdx]}'s (${owner.name}).${theirs}${died ? " The soak's vulnerability then killed them." : ""}`,
        timestamp: s.e.timestamp, abilityId: id, abilityName: "Repentance",
      }));
    }
    // Confession: a puddle left unsoaked (often two casts per puddle).
    const confSides = new Set<number>();
    for (const conf of c.casts.filter((x) => x.abilityId === CONFESSION && Math.abs(x.timestamp - at) <= 1_500)) {
      const sideIdx = side(conf.x) === "W" ? 0 : 1;
      if (confSides.has(sideIdx)) continue;
      confSides.add(sideIdx);
      const owner = owners[sideIdx];
      const ownerOk = !!owner && life.alive(owner, at - 500) && !doomed.has(owner, at) && !wrongSoak.has(owner);
      const soaked = soaks.some((s) => s.p === owner);
      // A death earlier in Wormhole throws the soak order off: the miss is
      // its fallout (user, 2026-10-16, C12 +7:43: #7's miss after a healer
      // died to #1's sword at +7:34).
      const earlierDeath = c.deaths.find((d) => d.timestamp - DEATH_EVENT_LAG_MS >= wh && d.timestamp - DEATH_EVENT_LAG_MS < at - 500);
      if (owner && ownerOk && !soaked && !earlierDeath) {
        c.errors.push(playerError(owner, {
          ruleId: AP_SOAK_MISSED_RULE_ID, severity: "Major", name: "Missed Puddle Soak",
          description: `As #${owed[sideIdx]} they owed the ${["first", "second", "third"][r]} soak of the ${sideIdx ? "east" : "west"} puddle and weren't in it: Confession hit the whole raid.`,
          timestamp: conf.timestamp, abilityId: CONFESSION, abilityName: "Confession",
        }));
      }
      const why = !owner ? `#${owed[sideIdx]} had no holder`
        : ownerOk && earlierDeath ? `#${owed[sideIdx]} (${owner.name}) didn't soak it, after ${earlierDeath.player}'s death had thrown the order off`
        : ownerOk ? `#${owed[sideIdx]} (${owner.name}) didn't soak it`
        : wrongSoak.has(owner) ? `#${owed[sideIdx]} (${owner.name}) had soaked an earlier check by mistake`
        : `#${owed[sideIdx]} (${owner.name}) was already dead or hit by another number's attack`;
      c.raids.push(raidMarker(AP_CONFESSION_RULE_ID, "Confession",
        `The ${["first", "second", "third"][r]} Void of Repentance check went unsoaked on the ${sideIdx ? "east" : "west"} puddle (${why}): Confession hit the raid. Unresolvable from here; treated as the cutoff point.`,
        conf.timestamp, CONFESSION, "Confession"));
    }
  });
}

// ── Enumeration and the final check ─────────────────────────────────────────

function detectEnding(c: Ctx, headMarkers: HeadMarker[], wh: number | undefined, end: number) {
  const { players, life } = c;
  // Enumeration deals damage only when a circle has the wrong count.
  const heat = c.casts.find((x) => x.abilityId === INCINERATING_HEAT && (wh === undefined || x.timestamp > wh));
  if (heat) {
    // Incinerating Heat: all eight share it. A living player outside it
    // leaves it to fewer (E14: five took it with six alive, three died).
    const heatHits = hitsIn(players, life, INCINERATING_HEAT, heat.timestamp - 200, heat.timestamp + 2_000);
    if (heatHits.length) {
      const t = heatHits[0].e.timestamp;
      const inStack = new Set(heatHits.map((h) => h.p));
      const killed = uniq(heatHits.filter((h) => life.diedFrom(h.p, h.e.timestamp)).map((h) => h.p));
      for (const p of players.filter((q) => !inStack.has(q) && life.alive(q, t) && life.alive(q, t - 5_000))) {
        c.errors.push(playerError(p, {
          ruleId: AP_HEAT_RULE_ID, severity: killed.length ? "Major" : "Minor", name: "Missed the Incinerating Heat Stack",
          description: `Alive but outside Incinerating Heat, which ${inStack.size} shared${killed.length ? `; ${namesOf(killed)} died` : ""}. After the last soak everyone gathers in the center for it, the 7/8 pair as soon as their attacks are done.`,
          timestamp: t, abilityId: INCINERATING_HEAT, abilityName: "Incinerating Heat",
        }));
      }
    }
    const hits = hitsIn(players, life, ENUMERATION, heat.timestamp, heat.timestamp + 10_000);
    if (hits.length) {
      const marked = new Set(headMarkers.filter((m) => m.markerId === ENUMERATION_MARKER && Math.abs(m.timestamp - heat.timestamp) <= 10_000).map((m) => m.player));
      const circles = new Map<number, PlayerInfo[]>();
      for (const h of hits) circles.set(h.e.sourceInstance ?? 0, uniq([...(circles.get(h.e.sourceInstance ?? 0) ?? []), h.p]));
      const t = hits[0].e.timestamp;
      const blamed: PlayerInfo[] = [];
      for (const members of circles.values()) {
        const tanks = members.filter(isTank).length, healers = members.filter((p) => p.role === "Healer").length;
        for (const p of members) {
          const why = p.role === "DPS" && !marked.has(p.name) ? "an unmarked DPS stays out of both circles"
            : p.role === "Healer" && tanks > healers ? "both healers help the west circle, the tanks the east one"
            : isTank(p) && healers > tanks ? "both tanks help the east circle, the healers the west one" : "";
          if (!why) continue;
          blamed.push(p);
          c.errors.push(playerError(p, {
            ruleId: AP_ENUMERATION_RULE_ID, severity: "Major", name: "Wrong Enumeration Circle",
            description: `In an Enumeration circle with ${namesOf(members.filter((q) => q !== p))}, which went off with the wrong count: NAUR, ${why}. Each circle takes exactly three.`,
            timestamp: t, abilityId: ENUMERATION, abilityName: "Enumeration",
          }));
        }
      }
      const killed = uniq(hits.filter((h) => life.diedFrom(h.p, h.e.timestamp)).map((h) => h.p));
      c.raids.push(raidMarker(AP_ENUMERATION_RAID_RULE_ID, "Enumeration Failed",
        `Enumeration went off with the wrong count${killed.length ? ` and killed ${namesOf(killed)}` : ""}${blamed.length ? "" : " (no one was in the wrong circle by role: the count was short)"}. Unresolvable from here; treated as the cutoff point.`,
        t, ENUMERATION, "Enumeration"));
    }
  }
  // The final check: kill Cruise Chaser before Eternal Darkness, Brute
  // Justice before its J Waves outgrow the healing, then Alexander Prime.
  const ed = c.casts.find((x) => x.abilityId === ETERNAL_DARKNESS);
  if (ed) c.raids.push(raidMarker(AP_ENRAGE_RULE_ID, "Eternal Darkness", "Cruise Chaser finished Eternal Darkness: it wasn't killed in time. Treated as the cutoff point.", ed.timestamp, ETERNAL_DARKNESS, "Eternal Darkness"));
  const dj = c.casts.find((x) => x.abilityId === DIVINE_JUDGMENT_ENRAGE);
  if (dj) c.raids.push(raidMarker(AP_ENRAGE_RULE_ID, "Divine Judgment", "Alexander Prime finished Divine Judgment: it wasn't killed in time. Treated as the cutoff point.", dj.timestamp, DIVINE_JUDGMENT_ENRAGE, "Divine Judgment"));
  const waveDeaths = c.deaths.filter((d) => d.killingAbilityGameId === J_WAVE && d.timestamp <= end + DEATH_EVENT_LAG_MS).sort((a, b) => a.timestamp - b.timestamp);
  const waves = waveDeaths.length ? c.casts.filter((x) => x.abilityId === J_WAVE && x.timestamp <= waveDeaths[0].timestamp).length : 0;
  if (waveDeaths.length >= J_WAVE_DEATHS && waves >= J_WAVE_LATE) {
    c.raids.push(raidMarker(AP_J_WAVE_RULE_ID, "J Waves Overwhelmed the Raid",
      `J Wave killed ${uniq(waveDeaths.map((d) => d.player)).length} players, the first after ${waves} waves (the clears killed Brute Justice by the 10th or 11th): its damage grows every wave until it dies. Treated as the cutoff point.`,
      waveDeaths[0].timestamp - DEATH_EVENT_LAG_MS, J_WAVE, "J Wave"));
  }
}

/**
 * Generic cutoffs for wipes in this phase with no mechanic Raid error:
 * a called wipe (3+ no-killing-blow deaths in 10s, or any within 12s of
 * the end, knock-offs excluded) or a collapse (4 dead, pull over in 30s).
 */
/** No-killing-blow deaths: knock-offs (after a sword, charge, jump) and called-wipe resets. */
function silentDeaths(c: Ctx, start: number, lastEvent: number) {
  const { players, deaths } = c;
  const knock = new Set(deaths.filter((d) => players.some((p) => p.name === d.player && p.damageTaken.some((e) =>
    [WH_SWORD, WH_CHARGE, SUPER_JUMP, ALPHA_SWORD_P3].includes(e.abilityId) && d.timestamp - e.timestamp >= KNOCKOFF_MIN_MS && d.timestamp - e.timestamp <= KNOCKOFF_MAX_MS))));
  const silent = deaths.filter((d) => !d.killingAbilityGameId && !knock.has(d) && d.timestamp - DEATH_EVENT_LAG_MS >= start);
  const called = new Set<DeathEvent>();
  for (const d of silent) {
    if (lastEvent - d.timestamp <= CALLED_WIPE_END_MS) called.add(d);
    const near = resetCluster(silent.filter((x) => Math.abs(x.timestamp - d.timestamp) <= CALLED_WIPE_WINDOW), deaths);
    if (near.length >= CALLED_WIPE_COUNT) near.forEach((x) => called.add(x));
  }
  return { silent, called };
}

/**
 * Any other no-killing-blow death walked into the arena's lethal edge
 * (user, 2026-10-16, D12 +6:29.8 and +6:46.0: the white mage, twice in
 * Inception, no hit before either).
 */
/**
 * Chastening Heat and Divine Spear target a tank, who takes the set under an
 * invulnerability (Hallowed Ground the first, Holmgang the second). A tank
 * killed by the set aimed at them mistimed it (user, 2026-10-17, F1
 * +5:21.8: the Warrior "mistimed invulnerability"; the earlier note calling these
 * deaths cooldown territory is overturned).
 */
function detectTankBuster(c: Ctx, start: number, end: number) {
  for (const d of c.deaths.filter((x) => (x.killingAbilityGameId === CHASTENING_HEAT || x.killingAbilityGameId === DIVINE_SPEAR)
    && x.timestamp - DEATH_EVENT_LAG_MS >= start && x.timestamp - DEATH_EVENT_LAG_MS <= end)) {
    const p = c.players.find((x) => x.name === d.player);
    if (!p || !isTank(p)) continue;
    const hit = p.damageTaken.filter((e) => e.abilityId === d.killingAbilityGameId && e.timestamp <= d.timestamp).pop();
    const cast = hit && c.casts.filter((x) => x.abilityId === d.killingAbilityGameId && x.timestamp <= hit.timestamp && hit.timestamp - x.timestamp <= 1_500).pop();
    if (!hit || !cast || cast.target !== p.name) continue;
    const name = d.killingAbilityGameId === CHASTENING_HEAT ? "Chastening Heat" : "Divine Spear";
    c.errors.push(playerError(p, {
      ruleId: AP_TANK_BUSTER_RULE_ID, severity: "Major", name: "Died to the Tank Buster",
      description: `Died to ${name}, aimed at them. Chastening Heat and its three Divine Spears go on one tank, who takes the whole set under an invulnerability (Hallowed Ground the first set, Holmgang the second): time it to cover the last Spear.`,
      timestamp: hit.timestamp, abilityId: d.killingAbilityGameId, abilityName: name,
    }));
  }
}

function detectApWall(c: Ctx, start: number, end: number, lastEvent: number) {
  const { silent, called } = silentDeaths(c, start, lastEvent);
  for (const d of silent) {
    const t = d.timestamp - DEATH_EVENT_LAG_MS;
    if (called.has(d) || t > end) continue;
    const p = c.players.find((x) => x.name === d.player);
    if (!p) continue;
    // Not a knock-off from a longer flight (C9: a Super Jump 8s before),
    // nor a reset once the pull is over (4+ already dead: E30, B28).
    if (p.damageTaken.some((e) => [WH_SWORD, WH_CHARGE, SUPER_JUMP, ALPHA_SWORD_P3].includes(e.abilityId) && e.timestamp <= d.timestamp && d.timestamp - e.timestamp <= WALL_KNOCK_MS)) continue;
    if (c.players.filter((q) => q !== p && !c.life.alive(q, t)).length >= 4) continue;
    c.errors.push(playerError(p, {
      ruleId: AP_WALL_RULE_ID, severity: "Major", name: "Walked Into the Wall",
      description: "Died with no killing blow and no knockback before it: they walked into the arena's lethal edge.",
      timestamp: t, abilityId: 0, abilityName: "Wall",
    }));
  }
}

function genericCutoff(c: Ctx, start: number, lastEvent: number): PullError | undefined {
  const { players, deaths, life } = c;
  const { called } = silentDeaths(c, start, lastEvent);
  const out: PullError[] = [];
  const calledList = resetCluster([...called], deaths).sort((a, b) => a.timestamp - b.timestamp);
  if (calledList.length >= CALLED_WIPE_COUNT || (calledList.length && lastEvent - calledList[0].timestamp <= CALLED_WIPE_END_MS)) {
    out.push(raidMarker(AP_CALLED_WIPE_RULE_ID, "Wipe Called",
      `${calledList.length} player${calledList.length > 1 ? "s" : ""} died with no killing blow (${joinNames(uniq(calledList.map((d) => d.player)))}) near the end: the wipe was called.`,
      calledList[0].timestamp - DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  const outAt = (t: number) => players.filter((p) => !life.alive(p, t));
  const collapseT = life.outIntervals.map((w) => w.start).filter((t) => t >= start).sort((a, b) => a - b)
    .find((t) => outAt(t).length >= COLLAPSE_DEAD_COUNT && lastEvent - t <= COLLAPSE_END_MS);
  if (collapseT !== undefined) {
    const who = outAt(collapseT).map((p) => p.name);
    out.push(raidMarker(AP_COLLAPSE_RULE_ID, "Party Collapse",
      `${who.length} players were dead at once (${joinNames(who)}). Treated as the cutoff point.`,
      collapseT + DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  return out.sort((a, b) => a.timestamp - b.timestamp)[0];
}
