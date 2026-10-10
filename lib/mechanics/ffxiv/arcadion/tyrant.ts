// lib/mechanics/ffxiv/arcadion/tyrant.ts
//
// The Tyrant (M11S) per-pull rules. Entry point: detectTyrantErrors.
// Self-gates on the boss's signature casts, so it is safe on every pull.
//
// -- VERIFIED AGAINST LOGS (2026-10-09) --
// One static, week-1 progression, 88 pulls over three reports. Cited as
// B23 +9:36 (report letter, pull, mm:ss from pull start):
//   A = d3vRbwfpNBLzJ2Xh (33 wipes, never past One and Only ~4:05),
//   B = L3YxvqnNVdzBcj7t (35 wipes, roster change; enraged 4 times),
//   C = gmX1Ac9PqWdfDR7B (19 wipes + the kill, C20, 11:01).
// Roster slots (user): MT PLD, OT DRK, H1 AST, H2 SGE, M1 RPR, M2 DRG,
// R1 DNC, R2 caster; the OT and R2 players changed between reports. Mostly
// Hector (user, "can't recall for sure"). Slots come from roles.ts with
// MT/OT and M1/M2 re-read from the pull's own spreads (resolveSlots); the
// boss's first auto-attack picked the OT in some pulls.
// VOD review 2026-10-09 (user): report A pulls 1-29, rulings in
// expectations/rulings.json. It set the spread-spot attribution, raise
// grace, Eye partners, Sharp Taste side, tank sides and the doomed-stack
// gate below.
//
// Clock (kill; every pull within ~1s): Crown +0:11, Raw Steel +0:25,
// weapons +0:51/+0:56/+1:01, Stardust +1:21 (Comet/Crushing Comet +1:30 or
// +1:57), weapons +1:36/+1:41/+1:46, Crown +2:03, Dance +2:22, Eye pairs
// +2:32, Raw Steel +2:45, Charybdistopia +3:01, Ultimate weapons
// +3:16..+3:42, Gust +3:48, One and Only +4:02, Wall +4:16/+4:19, Fire and
// Fury +4:38, Meteorain +4:54 (fireballs +5:02/+5:12/+5:22/+5:32, comet
// drops +5:03/+5:13/+5:23, tethers +5:11/+5:21/+5:31), Flatliner +6:04,
// towers +6:32/+7:04/+7:42, breaths/tethers +6:47/+7:19, Massive Meteor
// +7:29..+7:35, Avalanche +7:52, Crown +8:03, Wall +8:15, Fire and Fury
// +8:37, Crown +8:46, Stampede +8:58 (Mammoth +9:06, towers +9:21,
// tethers +9:31, Two/Four-Way +9:35), Crown +9:43, kicks +9:57/+10:16/
// +10:37, Heartbreaker +10:54 cast, lands +11:05 (enrage).
//
// Log IDs (the model's [ID] candidates were right for every cast checked):
// - Damage Down causes: Cometite 46099, axe 46104 / sword 46106 hazards,
//   Dance Explosion 46112, Charybdis 46118 (tornado contact), Fire and Fury
//   46128/46129 (front/back, not tank-targeted: the kill's OT got Damage Down
//   from it), Orbital Omen 46131, spent-comet Explosion 46136 (Comet actor),
//   Majestic Meteor 46145 (split) / 46165 (Stampede), Meteorain lane 46146.
//   The scythe's donut 46105 never gave Damage Down: 33 of 35 hits killed,
//   the 2 survivors were invulnerable. Arcadion Avalanche 46155/46159 always
//   killed (6 deaths).
// - Raw Steel: axe 46091 shared buster + Impact 46092 on the other six;
//   scythe 46095 tank cones (cast targets = top two enmity) + Heavy Hitter
//   46096 shared by the six. Axe or scythe comes first at random.
// - Weapons: Heavy Weight 46107 (one party stack), Sweeping Victory 46108
//   (a cone per player, cast-targeted), Sharp Taste 46109 (two line stacks
//   aimed at the healers; cast facing = line direction).
// - Comet 46100 (spreads), Crushing Comet 46101 (stack), Eye of the Hurricane
//   46116 (four pairs, Magic Vulnerability Up), Powerful Gust 46119 (eight
//   cast-targeted cones).
// - Great Wall 46124: Wall 1 the OT solo under Living Dead (~900k twice),
//   Wall 2 shared by both tanks; Fire Resistance Down II 1002937.
// - Meteorain: comet drop Cosmic Kiss 46133 (Comet actor, two hits clean),
//   Fearsome Fireball 46138 (clean soak counts 6/4/4/6: tanks join the first,
//   the next drop's two baiters sit each out), Foregone Fatality 46134 on the
//   tanks every time. Shockwave 46141 logged no player damage in any pull.
// - Flatliner: towers 46148 (4 x 2), short tower Unmitigated Explosion 46149
//   + Sustained Damage 1004149 (raid DoT; B4 +6:32 killed 5), breaths 46151 +
//   tethers 46147 (one line each), Massive Meteor 46153 (2 x 4, five hits).
// - Stampede: Mammoth Meteor 46163 (proximity, kill max ~75k), Atomic Impact
//   46164 cast-targeted at the two carriers six times each, lava = Burns
//   1003065/1003066, towers Cosmic Kiss 46166 (tank) / Weighty Impact 46167
//   (pair), short tower 46168, tethers 46169 (Fire Resistance Down II),
//   Two-Way 47038 (2 x 4) / Four-Way 46171 (4 x 2).
// - Kicks: tank-only in every pull (kick 1 OT under Living Dead, kick 2 MT
//   invulnerable after the OT's first hit, kick 3 both tanks). Tough Break
//   46177 = an empty tower: killed the raid (B16, B23). Heartbreaker
//   46178/46179 = hard enrage (B13, B19, B20, B26, C3, C7, C10).
// - Huge (1-5M) amounts are FFLogs' unpaired previews of lethal hits;
//   counted as hits, never compared as amounts.
//
// Failure findings:
// - Weapon hazards were the top killer (93 deaths, 28 first deaths).
// - Proximity baits retarget once anyone is dead: two survivors took seven
//   tornado cones (A9 +3:47), so Gust and Fire Breath overlaps need all 8 up.
// - Doubled Sharp Taste: 7 of 9 followed a healer's death (the line went to
//   someone in the group); A18 +1:35 and C5 +3:21 had both lines within 4
//   degrees (healers on one side).
// - Comet drops on the party: B1 +5:13 (healers), B4 +5:23 (ranged); four
//   non-baiters hit each time, the melee's comet vulnerability killed them.
// - Raw Steel: A8 +0:26 a tank cone with no tank in it killed five (the OT
//   held no cone: enmity); A3 +0:26 and A26 +2:45 both tanks in both cones.
// - Atomic Impact went through everyone once both carriers died to Mammoth
//   Meteor (C13 +9:06): fallout.
// - No-killing-blow deaths: almost all are the raid walking off to reset;
//   the earliest came 10.6s before the pull's end (A15). Mid-pull falls:
//   tower knockbacks off an island (B7 +7:03, B26 +7:41, 4.4s each).
// - The kill's only death: the M2 took Two-Way's front with Fire Resistance
//   Down II (C20 +9:35) while the H2 joined no line.
//
// Cutoffs (first Raid error): collapse 41, called wipe 37, enrage 7,
// Flatliner tower 1 (B4), Tough Break 1 (B16); the kill has none.
//
// -- RULES IMPLEMENTED --
// ffxiv-tyrant-avoidable (Major on Damage Down or death; Minor otherwise):
//   AVOIDABLE. Fully mitigated 0-damage hits without Damage Down skipped.
// ffxiv-tyrant-overlap (Major if anyone involved died to it, else Minor):
//   one-bait-per-player families (PERSONAL). A player hit by another
//   player's instance or by two at once names the victim; a known owner
//   (cast target, or the only player the instance hit, or the one player it
//   hit who took nothing else) is named too. Impact and scythe cones have
//   assigned spots (IMPACT_SPOTS absolute, SCYTHE_CLOCK around the scythe):
//   when one player of the incident was clearly the farthest off, only they
//   are named. Instances that hit a player in raise grace are dropped. Gust /
//   Fire Breath only with all 8 alive; Impact only with both tanks holding
//   enmity.
// ffxiv-tyrant-stack (Major on deaths): standing in two instances of a
//   stack (STACKS); a stack that killed someone names living eligible players
//   in none (not those who just took an avoidable hit, and nobody with 3+
//   dead); one or two players taking it while 3+ were elsewhere names the
//   takers instead. Sharp Taste: skipped with a healer down; a healer in both
//   lines (wrong side) is named alone. Eye of the Hurricane: a marked player
//   whose stack missed their Hector partner (MT/M1, OT/M2, H1/R1, H2/R2). A
//   Two/Four-Way death with Fire Resistance Down II on the line's largest
//   hit took the front.
// ffxiv-tyrant-buster: a non-tank in the axe's Raw Steel, Great Wall or
//   Foregone Fatality with both tanks up; scythe cones: both tanks in both
//   (the one on the other's side, MT west / OT east, else both), a cone
//   through 3+ non-tanks (its tank, or the tank holding no cone when no tank
//   was in it), 1-2 non-tanks in a cone (them).
// ffxiv-tyrant-meteorain: comet drop k (melee, healers, ranged) hitting 3+
//   others names its two baiters, 1-2 others name those; skipped once a
//   baiter is dead. A lethal Fearsome Fireball names living non-tanks out of
//   it, except the next drop's baiters.
// ffxiv-tyrant-tower: a short Flatliner / Stampede tower names eligible
//   living players in no tower (Stampede: not the carriers); player-less
//   Minor when all were in; Raid when its explosion and DoT killed 3+. Tough
//   Break is a Raid. A non-tank killed in a kick tower with both tanks up.
// ffxiv-tyrant-stampede: Atomic Impact on a non-carrier (both carriers up),
//   lava (Minor; Major only when Burns killed), a lethal Mammoth Meteor.
// ffxiv-tyrant-fall (Major): a no-killing-blow death outside a called wipe,
//   "knocked" after a tower / Flatliner / tornado knockback in the 5s
//   before. Walking Dead running out is a player-less Minor.
// ffxiv-tyrant-enrage, -called-wipe (3+ no-killing-blow deaths within 10s,
//   or any within 12s of the end), -collapse (5 dead, pull over within 45s):
//   Raid, only before any other Raid.
// The Damage Down causes are excluded from ffxiv-damage-down (error-rules.ts).
//
// Not built: Shockwave line-of-sight (no damage logged), rock collisions,
// clock-spot attribution of scythe cone / Gust overlaps (both players named),
// Wall front swaps (the static invulns Wall 1), kick cooldown timing, tank
// deaths to their own busters (mitigation).
//
// -- GUIDE-DERIVED MODEL: THE TYRANT (M11S) --
// AAC Heavyweight M3 (Savage), Arcadion, patch 7.4; Savage only.
// Research stage, checked 2026-10-08, before any report was analyzed: the
// log signals below are the researcher's hypotheses. VERIFIED AGAINST LOGS
// above wins every disagreement.
// User-selected strategy: WTFDIG Hector (Toxic / Hector No Buddies).
//
// -- SOURCES AND CONFIDENCE --
// [H] Current Hector preset; all eight role selectors and tornado, split,
//     marker-flex and two/four-way Fireball diagrams inspected:
//     https://wtfdig.info/74/m11s#hector
//     Hector video linked there: https://www.youtube.com/watch?v=w1uuwzhyf5A
// [TF] Toxic Friends diagrams linked/rendered by H:
//      https://raidplan.io/plan/HJAbE7fuWodELUSB
// H now uses Hector video frames for the split. Its older Kindred raidplan
// is an alternative, not the selected split assignment:
//      https://raidplan.io/plan/hvbysrfwvrc55ahz
// Kitten ERP mechanic explanations; JP positions/priorities differ from H:
// [KR] https://kitten-erp-guides.moe/savage/m11s/raw_steel_trophy
// [KW] https://kitten-erp-guides.moe/savage/m11s/trophy_weapons
// [KV] https://kitten-erp-guides.moe/savage/m11s/void_stardust
// [KD] https://kitten-erp-guides.moe/savage/m11s/dominion
// [KU] https://kitten-erp-guides.moe/savage/m11s/ultimate_trophy_weapons
// [KO] https://kitten-erp-guides.moe/savage/m11s/orbital_omen
// [KM] https://kitten-erp-guides.moe/savage/m11s/meteorain
// [KS] https://kitten-erp-guides.moe/savage/m11s/majestic_meteor
// [KE] https://kitten-erp-guides.moe/savage/m11s/ecliptic_stampede
// [KH] https://kitten-erp-guides.moe/savage/m11s/heartbreak_kick
// [IV] Lyra, updated 2026-01-19; raid damage, weapon names, kick counts:
//      https://www.icy-veins.com/ffxiv/aac-heavyweight-m3-savage-raid-guide
// [TL] A'rhaeda Vhil, updated 2026-01-31; provisional reference clock:
//      https://thaliak.com/raids/m11s/
// [ID] Splatoon presets, candidate game actions/geometry, NOT FFLogs proof:
//      https://github.com/PunishXIV/Splatoon/blob/main/Presets/Dawntrail/Raids/The%20Arcadion%2011%20Savage.md
// No confirmed mechanic-changing hotfix established here. Later-patch
// damage, durations, counts and target selection still need verification.
//
// -- SEVERITY, ATTRIBUTION AND LOG VOCABULARY --
// README's FFXIV exception: attributable Damage Down is Major even survived.
// Avoidable damage WITHOUT Damage Down stays Minor unless it causes death
// or the pull's loss. Major always names a root-cause player. Raid marks an
// unresolvable pull; unknown assignment/cause remains player-less.
// Receiving a misplaced attack is not proof of victim fault. Death-driven
// retargets, missing helpers and redistributed soaks are unflagged fallout.
// Unless a block says otherwise, its named-player failure is Major on death
// or Damage Down, otherwise Minor; Raid requires an unresolvable outcome.
// Cast, damage, periodic and player/boss aura IDs differ. [ID] candidates
// below mean begincast/cast, never a verified resolving damage ID.
// Player auras: Physical Vulnerability Up, Magic Vulnerability Up, Fire
// Resistance Down II, Damage Down, Sustained Damage; boss aura: Damage Up.
// Their game/FFLogs IDs and removal timing remain unknown here.
// NPCNameIDs Tyrant 14305/tornado 14307 and zone 1325 are NOT spell IDs.
// Victim coordinates show the hit location, not necessarily the bait owner.
// Weapon models, portals, tethers, prey markers and platform animations may
// not appear in the application's captured events. Geometry needs evidence.
//
// -- SHAPE, REFERENCE CLOCK AND SHARED ASSIGNMENTS --
// One boss: weapons -> transformed fire/meteor section -> two islands ->
// restored arena -> Stampede -> escalating kicks. Guide-derived timed
// script, no established boss-HP transitions; no energy/resource bar.
// Square arena permits fatal falls; Flatliner removes the N-S center strip.
// [TL] Approximate mm:ss from pull; hit times where labeled, otherwise
// reference mechanic events, not a proven cast-start/impact distinction:
//   Crown 0:10; Raw Steel 0:24-0:25; weapons 0:50/0:56/1:01;
//   Stardust 1:20, finish 1:30; weapons 1:35/1:40/1:45, finish 1:57;
//   Crown 2:03; Dance 2:15, pairs 2:31; Raw Steel 2:43-2:44;
//   HP=1 2:59; six Apex hits 3:15/3:20/3:25/3:30/3:35/3:41;
//   Gust 3:47; One and Only 4:01; Wall 4:13; Omen hits 4:36-4:41;
//   Meteorain 4:53; fireballs 5:01/5:11/5:21/5:31;
//   comet drops 5:02/5:12/5:22; tethers 5:10/5:20/5:30;
//   Tyrannhilation 5:44, Shockwaves 5:45/5:46/5:48; Flatliner 6:03;
//   towers 6:30/7:02/7:40; split lines 6:45/7:17; stacks 7:28-7:34;
//   Avalanche 7:51; Crown 8:02; Wall 8:13/8:16; Omen 8:35-8:40;
//   Crown 8:44; Stampede 8:57; towers 9:20; tethers 9:29;
//   two/four-way 9:34; Crown 9:42; kick towers 9:55/10:14/10:36;
//   final kick ends ~10:49; Heartbreaker hard enrage ~11:02.
// [H] G1=MT/H1/M1/R1, G2=OT/H2/M2/R2; actual roster mapping unsupplied.
// Weapon scythe BOSS-relative clocks: MT N, OT S, H1 W, H2 E, M1 SW,
// M2 SE, R1 NW, R2 NE. Sword: G1 left/G2 right facing the landing boss.
// Different mechanics use different orientations; these are not universal
// true-north slots. Split starts G1 west/G2 east, T/R north and H/M south.
//
// -- CROWN / DANCE PULSES / CHARYBDISTOPIA / ONE AND ONLY [IV, KU] --
// What happens: Crown of Arcadia, Dance of Domination pulses/finale and
// One and Only are physical raid damage. Charybdistopia sets HP to 1;
// healing is required before Apex hits. Immortal Reign is the transformation.
// Correct play: heal/mitigate the scripted hits; physical party mitigation
// matters. Crown after Avalanche restores floor. Outer hazards/falls remain
// dangerous even when a boss animation changes the arena.
// Failure: recovery fails -> LOG SIGNAL: next required hit kills multiple
// players after HP=1/raid pulses; FAULT: not established from deaths alone;
// CONSEQUENCE: player-less Raid only at unresolvable group loss.
// Removal: no dispel objective; HP=1 and transformation are scripted states.
// Not errors: these hits, HP=1, larger physical hits on low-defense jobs,
// or deliberate mitigation/burst choices that still survive.
//
// -- RAW STEEL TROPHY / RAW STEEL / IMPACT / HEAVY HITTER [KR, H, ID] --
// Candidate cast: axe 46114, scythe 46115. Two instances, opposite weapons.
// What happens: axe shares a physical buster on EITHER top-two enmity player
// plus six Impact circles on everyone else. Scythe hits both enmity leaders
// with separate tank cones and a shared Heavy Hitter cone on one of the
// other six players; selection follows enmity, not a guaranteed job filter.
// Correct play: tanks establish top-two threat. Axe tanks stack, others
// spread; scythe MT NW/OT NE and six-player stack south. H axe drops M1/M2
// SW/SE max melee, H1/H2 SSW/SSE far, R1/R2 WSW/ESE far.
// Failure: non-tank buster -> LOG SIGNAL: Raw Steel on a non-tank while tank
// gets Impact; FAULT: tank missing enmity if supported, not the chosen DPS.
// Overlap/missing share -> LOG SIGNAL: double hits under physical vuln or
// reduced shared recipients; FAULT: misplaced carrier/helper if established;
// CONSEQUENCE: Major on casualties, otherwise Minor without Damage Down.
// Removal: intended Physical Vulnerability Up expires; no planned dispel.
// Not errors: tank shares/cones, six personal hits/party stack, their vulns.
// One preselected tank's invuln cannot guarantee solo axe: either can target.
//
// -- TROPHY WEAPONS / ASSAULT EVOLVED [KW, H, ID] --
// Candidate casts: Assault Evolved 46103; axe 46104, scythe 46105,
// sword 46106. Preset geometry: axe radius 8y, scythe safe radius 5y,
// personal scythe cones ~30 degrees, sword cross width ~10y; unverified.
// What happens: one of each weapon forms a triangle; boss faces first,
// then executes all three clockwise, twice in opening. Axe Heavy Weight=
// point-blank danger plus party circle stack; sword Sharp Taste=plus-shaped
// danger plus healer line stacks; scythe Sweeping Victory=donut danger plus
// eight personal cones. These expected hits apply physical vulnerability.
// Correct play: axe share outside circle, sword four per healer off cross,
// scythe clock spread inside donut; follow landing orientation each time.
// Failure: hazard hit -> LOG SIGNAL: weapon AoE damage/Damage Down;
// FAULT: exposed player if intended route remained available. Wrong cone/
// share -> LOG SIGNAL: multiple hits, deficient recipient set or vuln death;
// FAULT: misplaced bait/helper if established; Major on death/DD else Minor.
// Removal: weapons resolve once; intended vulnerabilities expire between
// hits. Death/retarget behavior is not established by these guides.
// Not errors: assigned weapon hits, healer stacks and their vulnerabilities.
//
// -- VOID STARDUST / COMETITE / COMET / CRUSHING COMET [KV, H] --
// What happens: three ground baits per player, then eight personal Comets
// OR a party Crushing Comet stack. Assault Evolved intervenes, then three
// more baits and the opposite finish. No persistent blocking rocks here.
// Correct play: H starts north, moves clockwise; dodge each old bait,
// then resolve actual spread/stack markers after the third drop.
// Failure: old bait hit -> LOG SIGNAL: Cometite avoidable damage/DD;
// FAULT: lingering player. Wrong finish -> LOG SIGNAL: extra Comet hits
// or Crushing Comet missing helpers/deaths; FAULT: misplaced carrier or
// absent required helper if established; Major on death/DD, otherwise Minor.
// Removal: old baits detonate; intended finish vulnerabilities expire.
// Not errors: intended personal/shared finish hits, independent safe ranged
// baits rather than the party's exact movement path.
//
// -- DANCE OF DOMINATION TROPHY / EYE OF THE HURRICANE [KD, H, ID] --
// Candidate line-helper cast 47036; resolving Explosion IDs unconfirmed.
// What happens: raid pulses, ground lines, then four two-person stacks on
// supports OR DPS together with wide line explosions. One open arena edge.
// Correct play: H makes OPEN EDGE NEW SOUTH (JP guide uses new north).
// Pairs relative to that south: MT/M1 W, OT/M2 E (inner letter markers),
// H1/R1 SW, H2/R2 SE. Stand in gaps, keep distinct pairs separated.
// Failure: line hit -> LOG SIGNAL: ground Explosion damage/DD; FAULT:
// exposed player. Missed/overlapped pair -> LOG SIGNAL: Eye of the Hurricane
// unusual recipients/vuln death; FAULT: wrong assigned partner/placement if
// established; Major on death/DD, else Minor. A generic Explosion name
// alone cannot distinguish this hazard from later comet/tower explosions.
// Removal: pulses/lines resolve; intended stack vulnerabilities expire.
// Not errors: raid pulses and pair hits; rotating safe pairs by this plan.
//
// -- ULTIMATE TROPHY WEAPONS / ASSAULT APEX / POWERFUL GUST [KU, TF] --
// What happens: six weapons execute in spawn order; direction can be CW or
// CCW. Last four leave one tornado at each cardinal; final weapon north.
// Each tornado later fires two nearest-player cones. Contact knocks back
// and gives Damage Down. Eight living baiters are normally required.
// Correct play: resolve weapons as above, then bait cones OUTWARD with H's
// pairs: N MT/R1, E H2/R2, S OT/M2, W H1/M1. Separate each pair's cones.
// Failure: cross-cone/repeat hit -> LOG SIGNAL: extra Gust hits under magic
// vuln; FAULT: misplaced bait/entrant if established. Contact -> LOG SIGNAL:
// tornado hit/KB plus DD; FAULT: entrant, including early return through it;
// Major. Missing baiter -> LOG SIGNAL: another player takes extra cones;
// FAULT: earlier death cause, not its redistributed cone victims; Raid if
// the remaining players cannot resolve the body check.
// Removal: cone magic vuln expires; tornadoes remain briefly after cones.
// Not errors: eight assigned Gust hits/vulns; CW or CCW weapon order.
//
// -- GREAT WALL OF FIRE / ORBITAL OMEN / FIRE AND FURY [KO, H, ID] --
// Candidate Orbital line cast 46131. Wall: two line tankbusters on enmity
// leader; front tank gets Fire Resistance Down II, next hit must have the
// other tank in front. Each leaves a delayed line AoE giving Damage Down.
// Correct play: H MT front first, rotate 45 degrees CW/swap front for second;
// first Wall often solo invulned, second normally shared. Avoid both trails.
// Omen: four N/E portal pairs make crossing lines; boss remains north-facing
// so Fire and Fury front/back cones leave flanks safe. Dodge into already
// resolved intersections; patterns require single early/delayed or double
// dodge. A white guide line is not itself the damaging projectile.
// Failure: wrong Wall front -> LOG SIGNAL: second front hit under fire vuln;
// FAULT: front-position/target-change cause if established; Major if lethal.
// Trail/portal/cleave hit -> LOG SIGNAL: Wall AoE, Omen or Fire and Fury
// damage/DD; FAULT: entrant or unexpected boss-facing cause if established;
// Major on DD/death. Changing enmity can redirect the second Wall.
// Removal: line trails detonate; front-hit fire vulnerability expires.
// Not errors: intended Wall hits/vuln, safe solo invuln, portal visual lines.
//
// -- METEORAIN / COSMIC KISS / FOREGONE FATALITY [KM, H, TF] --
// What happens: two nearest players (planned non-tanks) place rocks three
// times (six total), taking Cosmic Kiss/Physical Vulnerability Up. Four
// Fearsome Fireball charges; first tanks lead, later rocks absorb front hit.
// Three paired Foregone Fatality tethers target rocks until tanks intercept.
// Rocks block line of sight for Triple Tyrannhilation's three Shockwaves;
// each consumes a shield rock. Overlapping drops or tankbustered rocks wipe.
// Correct play: H M -> H -> R; M1 NE/M2 SW, H1 NW/H2 SW, R1 SW/R2 NE.
// SW rocks form separated boss-to-corner line. Party fireball stacks NW ->
// behind NE rock -> behind NW rock -> behind NE rock. MT takes NE/NW
// tethers, OT SW; taken tether does not return to rock, so safe uptime is
// possible. After fourth fireball, hide behind rearmost SW rock for all hits.
// Failure: stolen/repeated bait -> LOG SIGNAL: wrong Cosmic Kiss recipients
// or second Kiss under physical vuln; FAULT: wrong proximity bait if known.
// Rock collision/unintercepted tether -> LOG SIGNAL: premature rock
// destruction, rock-target Foregone Fatality, wipe Explosion (ID unknown);
// FAULT: drop owner or assigned tank if established; Major plus Raid when
// shields are irretrievably lost. Mere Explosion occurrence is insufficient:
// consumed fireball rocks also explode as part of the intended sequence.
// Wrong front/LOS -> LOG SIGNAL: lethal Fearsome Fireball or Shockwave;
// FAULT: exposed player, misplaced stack bait or earlier lost rock owner if
// established; Major, Raid if the shielding chain is no longer resolvable.
// Removal: consumed rocks disappear; Kiss vuln lasts through the mechanic.
// Carrier death/raise, rock explosion radius and chain effects unestablished.
// Not errors: six intended Kiss hits/vulns, tank-front first charge,
// intercepted busters, rock absorption/destruction, leaving melee for LOS.
//
// -- FLATLINER / MAJESTIC METEOR / FIRE BREATH [KS, H] --
// What happens: Flatliner damages/knocks players to islands. Three waves of
// four two-person towers knock soakers away from tower centers. First two
// waves also assign four unpassable portal tethers, two per island, then
// four nearest Fire Breath markers, three puddle baits each and simultaneous
// Majestic Meteowrath tether lines / Fire Breath / Majestic Meteorain lanes.
// Correct play: stand INSIDE Flatliner's launch area, G1 W/G2 E, T/R north
// and H/M south. Each player soaks. Same-island portal tether crosses to
// opposite island; opposite-island tether or no tether stays. Untethered
// players alone enter hitbox to bait Fire Breath; then all bait puddles,
// splitting north/south using tether direction and non-tether body language.
// H finishes tethers at edges, breaths at OUTER safe corner of numbered
// markers (newer raidplan inner-corner convention differs). Keep each lane
// separate and clear the north portal's unsafe half. Second/third towers
// use quadrant where the player resolved the previous lines, not old slots.
// Failure: wrong launch -> LOG SIGNAL: death/fall or wrong island before
// required soak; FAULT: launch position if established; Major on death.
// Missing tower -> LOG SIGNAL: tower Explosion with raid-wide Sustained
// Damage (penalty aura/tick IDs unknown); FAULT: missing eligible soaker if
// actual landing/assignment establishes it; Major on casualties, Raid at
// unresolvable body check. Intended tower Explosion damage is not the miss.
// Stolen breath/short tether/crossfire -> LOG SIGNAL: combined line hits,
// lethal Meteowrath or repeated hits under magic vuln; FAULT: proximity bait
// or line owner/entrant if established; Major. Without markers/endpoints,
// a dead victim's position alone cannot prove who aimed the stray line.
// Removal: tower launch and personal lines resolve; intended vulns expire.
// Death-driven tether/breath redistribution is not a fresh assignment error.
// Not errors: Flatliner launch damage, two-person tower hits, one assigned
// personal line per player, intentional island crossing, changed later slots.
//
// -- MASSIVE METEOR / ARCADION AVALANCHE [KS, H] --
// What happens: two five-hit light-party stacks, then third tower launches;
// boss lifts facing island, kills its occupants and throws it at other
// island, leaving a small safe corner indicated by grip/swing direction.
// Correct play: share four per stack, take tower from previous quadrant,
// launch EVERYONE onto the island behind boss. Dodge to side opposite throw;
// hitbox/animation gives earlier cue than the final ground telegraph.
// Failure: short stack -> LOG SIGNAL: Massive Meteor increased per-player
// damage/missing helpers; FAULT: missing living helper if established;
// Major on casualties. Wrong island/corner -> LOG SIGNAL: Avalanche or
// environmental lethal hit; FAULT: launch/dodge owner if established; Major,
// Raid at unresolvable group loss. Boss animation may lack a logged cue.
// Removal: Crown restores arena; no persistent platform assignment aura.
// Not errors: ten intended stack hits across both groups, third tower KB,
// correctly mitigated three-player recovery/tank LB after an earlier death.
//
// -- ECLIPTIC STAMPEDE / ATOMIC IMPACT / TOWERS [KE, H, TF] --
// What happens: Mammoth Meteor proximity hits at opposite corners; two of
// four farthest players marked for six Atomic Impact hits/lava puddles.
// Other six bait six Majestic Meteor puddles, then soak two random solo
// Cosmic Kiss tank towers and two random two-person Weighty Impact towers.
// One player per tower then receives a distance portal tether/fire vuln.
// Correct play: T/M center; R1 NW, R2 NE, H1 SW, H2 SE for far baits.
// Marked players use safe N/S wall routes; if both are on one side, the
// one nearer that side's proximity danger flexes. Unmarked group baits
// center -> north -> CW. MT first tank tower CW from N, OT first CCW;
// unmarked H/R pair first pair tower CW, M1/M2 first pair tower CCW.
// Both puddle carriers are exempt from towers. Tethers stretch across then
// CW to corner; remaining unvulnerable players return near boss for charges.
// Failure: bad fire bait/ground dodge -> LOG SIGNAL: collateral Atomic
// Impact, lava ticks or Majestic Meteor damage/DD; FAULT: bait owner or
// entrant if established; Major on death/DD, Minor otherwise. Tower miss
// -> LOG SIGNAL: missing intended recipients and distinct tower penalty
// (name/ID unknown); FAULT: absent assigned tank/pair if established;
// Major on casualties, Raid only at unresolvable outcome. Short/crossed
// tether -> LOG SIGNAL: lethal Meteowrath or extra fire-vuln victims;
// FAULT: tether owner or line entrant if established; Major on deaths.
// Removal: Atomic markers finish after six hits; lava persists through
// following movement. Fire vulnerability remains for the charge sequence.
// Not errors: six carrier hits, tank/pair tower damage, intended tether
// damage/fire vuln; a fire carrier missing a tower is the selected plan.
//
// -- TWO-WAY / FOUR-WAY FIREBALL [KE, TF] --
// What happens: Two-way aims two nearest-player lines requiring four each,
// with TWO front players absorbing the wild charge. Four-way aims four
// nearest-player lines requiring two each, with ONE front per line.
// Portal-tether fire vulnerability makes front position lethal.
// Correct play: TF Two-way E/W pairs, one bait closer to boss than the
// other unvulnerable front helper, so both lines do not aim at one side;
// tether players join BEHIND the two fronts on their side. Four-way four
// unvulnerable baits aim intercardinal lines at four tether players behind.
// These are proximity/body-language choices, not fixed original G1/G2.
// Failure: wrong closest/front or absent rear -> LOG SIGNAL: double lines,
// front hit on fire-vuln player or undersized charge recipient set;
// FAULT: extra close bait, wrong front or missing helper if established;
// Major on death, otherwise Minor without DD. Four victims dying to one
// wrong aim do not establish four separate positioning mistakes.
// Removal: intended charge vulnerabilities expire; no cleanse objective.
// Not errors: all eight shared charge hits, heavy front hits, tether
// carriers safely sharing from behind, adapting the bait to actual players.
//
// -- HEARTBREAK KICK / DAMAGE UP / HEARTBREAKER [KH, IV] --
// What happens: three central shared towers hit 5/6/7 times, approximately
// 9/11/13s spans. Boss gains one scripted Damage Up stack per tower;
// increasing hits/damage are soft enrage. Heartbreaker ~11:02 ends pull.
// Correct play: H preset does not declare kick assignments. Common 822:
// first all eight, second tanks alternate invulns MT -> OT (one invuln
// cannot cover full second tower), third both tanks mitigate/heal heavily.
// 828/all-party variants also work with suitable mitigation; actual tank
// cooldown plan is unsupplied. Required helper count follows chosen plan.
// Failure: empty/failed coverage -> LOG SIGNAL: missing tower hits on
// intended recipients, lethal Kick or separate miss penalty (unconfirmed);
// FAULT: absent helper/late invuln if established; Major on deaths. Tower
// damage alone cannot blame healers or prove an invulnerability handoff miss.
// Heartbreaker -> LOG SIGNAL: completed enrage/lethal raid damage; FAULT:
// collective damage shortfall; CONSEQUENCE: player-less Raid cutoff.
// Removal: no player method to reduce scripted Damage Up established.
// Not errors: scheduled buffs, deliberately tank-only towers, intended
// Kick hits and delayed final burst; low soaker count alone is not a miss.
//
// -- STRATEGY VARIANCE AND OPEN QUESTIONS FOR LOG VERIFICATION --
// Variants: JP H-R-M rocks vs selected M-H-R; new-north vs H new-south Dance;
// static melee Dance; Kindred support/DPS split vs H T/R north; buddies vs
// body language; inner/corner-safe marker layouts; Toxic vs Fixed/TotanV2/
// DXA Stampede tower priorities and N/S vs E/W two-way; 822/828/812/182 kicks.
// A supported alternative position/soak count/invuln is not itself an error.
// 1. Map each cast, intended hit, avoidable AoE, periodic, player/boss aura
//    and penalty ID; verify ID candidates. Explosion and Cosmic Kiss names
//    recur in different contexts; which distinct IDs separate their uses?
// 2. What are cone/line widths, stack split rules, distance thresholds,
//    snapshots, kick tick offsets, vuln duration and tornado return grace?
//    Which avoidable hits actually apply Damage Down vs healable damage only?
// 3. What are unsoaked/under-soaked tower penalties, Sustained Damage stack
//    rules and objective expiry times? When is a body check unresolvable?
// 4. Which events identify prey, numbered weapons, portal endpoints, comet
//    positions and intercepted Foregone Fatality owner? Is it truly single
//    target? What happens to assigned effects if their carrier dies/raises?
// 5. Can rock collisions/early destruction be distinguished from normal
//    fireball consumption/explosions? What exactly chains and whom it hits?
// 6. Are second split tethers always the previously untethered players?
//    Which split patterns require adjusted corner baits with these markers?
//    Which animation/cast IDs reveal Avalanche's safe platform and corner?
// 7. Which pair-tower player gets Stampede tether? Sources disagree between
//    nearest tower center and nearest wall; neither is log-verified here.
//    Which opposite corners can Mammoth Meteor choose, fixed or variable?
// 8. What roster matches H slots, actual kick plan and mitigation handoffs?
//    Which failures are observed, and which no-ability deaths are resets?

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import { yd, kFmt, sec, joinNames, playerError, playerlessMinor, raidMarker, rezzedAt, clusterByGap, debuffIntervals } from "@/lib/mechanics/wow/common";
import { angularDistance, facingToCompassBearing } from "@/lib/mechanics/geometry";
import { detectFFRoles, type FFRoleSlot } from "@/lib/mechanics/ffxiv/roles";

export const TYRANT_AVOIDABLE_RULE_ID   = "ffxiv-tyrant-avoidable";
export const TYRANT_OVERLAP_RULE_ID     = "ffxiv-tyrant-overlap";
export const TYRANT_STACK_RULE_ID       = "ffxiv-tyrant-stack";
export const TYRANT_BUSTER_RULE_ID      = "ffxiv-tyrant-buster";
export const TYRANT_METEORAIN_RULE_ID   = "ffxiv-tyrant-meteorain";
export const TYRANT_TOWER_RULE_ID       = "ffxiv-tyrant-tower";
export const TYRANT_STAMPEDE_RULE_ID    = "ffxiv-tyrant-stampede";
export const TYRANT_FALL_RULE_ID        = "ffxiv-tyrant-fall";
export const TYRANT_ENRAGE_RULE_ID      = "ffxiv-tyrant-enrage";
export const TYRANT_COLLAPSE_RULE_ID    = "ffxiv-tyrant-collapse";
export const TYRANT_CALLED_WIPE_RULE_ID = "ffxiv-tyrant-called-wipe";

// ── log IDs (see VERIFIED AGAINST LOGS) ─────────────────────────────────────

// Crown of Arcadia, Raw Steel Trophy (axe/scythe), Trophy Weapons, Meteorain,
// Flatliner, Ecliptic Stampede: no other fight in the sample set casts these.
const SIGNATURE           = [46086, 46114, 46115, 46102, 46132, 46143, 46162];
const DAMAGE_DOWN         = 1002911;
const FIRE_RES_DOWN       = 1002937; // Great Wall front hit, Meteowrath tethers
const WALKING_DEAD        = 1000811; // Dark Knight's Living Dead follow-up
const WALKING_DEAD_FULL_MS = 9500;
const BURNS               = [1003065, 1003066]; // Stampede lava
const RAW_STEEL_AXE       = 46091; // shared buster on the top two enmity
const RAW_STEEL_SCYTHE    = 46095; // one cone per top-two enmity player
const HEAVY_HITTER        = 46096; // the scythe version's shared cone on the other six
const GREAT_WALL          = 46124;
const COSMIC_KISS_DROP    = 46133; // Meteorain comet landing on its two baiters
const FEARSOME_FIREBALL   = 46138;
const FOREGONE_FATALITY   = 46134;
const FLATLINER_TOWER     = 46148;
const FLATLINER_UNSOAKED  = 46149; // Unmitigated Explosion: a Flatliner tower short
const STAMPEDE_TOWERS     = [46166, 46167]; // Cosmic Kiss (tank) / Weighty Impact (pair)
const STAMPEDE_UNSOAKED   = 46168;
const SUSTAINED_DAMAGE    = 1004149; // the unsoaked tower's raid DoT
const ATOMIC_IMPACT       = 46164;
const MAMMOTH_METEOR      = 46163;
const TWO_WAY             = 47038;
const FOUR_WAY            = 46171;
const HEARTBREAK_KICK     = 46174;
const TOUGH_BREAK         = 46177; // a Heartbreak Kick tower left empty
const HEARTBREAKER        = [46178, 46179]; // hard enrage

// Knockbacks that can throw a player off an island or the arena edge.
const KNOCKBACKS: Record<number, string> = {
  [FLATLINER_TOWER]: "a Flatliner tower's knockback", 47760: "Flatliner", 46118: "the tornado (Charybdis)",
};

// Avoidable hits. Every one hands out Damage Down when survived except the
// Avalanche (always lethal in the sample) and the scythe's donut (lethal 33 of
// 35 hits; the two survivors were invulnerable).
type Avoidable = { name: string; hit: string; why: string };
const AVOIDABLE: Record<number, Avoidable> = {
  46104: { name: "Axe (Assault Evolved)", hit: "Hit by the axe's point-blank circle (Assault Evolved)",
    why: "The axe smashes everything close to where it lands; share Heavy Weight outside its circle." },
  46105: { name: "Scythe (Assault Evolved)", hit: "Hit by the scythe's donut (Assault Evolved)",
    why: "The scythe hits everything outside its small safe circle; stand inside it for the cones." },
  46106: { name: "Sword (Assault Evolved)", hit: "Hit by the sword's cross (Assault Evolved)",
    why: "The sword cleaves a plus shape through where it lands; take the healer lines off the cross." },
  46099: { name: "Cometite", hit: "Hit by a Cometite bait",
    why: "Each Cometite lands where it was baited a moment earlier; keep moving away from the old drops." },
  46112: { name: "Explosion (Dance of Domination)", hit: "Hit by a Dance of Domination line explosion",
    why: "The ground lines explode after the pulses; stand in the gaps for the pair stacks." },
  46118: { name: "Charybdis", hit: "Touched a tornado (Charybdis)",
    why: "The tornadoes left by Ultimate Trophy Weapons knock back and hand out Damage Down; bait the Gusts without walking into one." },
  46131: { name: "Orbital Omen", hit: "Hit by an Orbital Omen line",
    why: "The portal lines fire in pairs; dodge into an intersection that has already gone off." },
  46128: { name: "Fire and Fury", hit: "Hit by Fire and Fury (the boss's front/back cones)",
    why: "Fire and Fury cleaves the boss's front and back; stand on its flanks." },
  46129: { name: "Fire and Fury", hit: "Hit by Fire and Fury (the boss's front/back cones)",
    why: "Fire and Fury cleaves the boss's front and back; stand on its flanks." },
  46136: { name: "Explosion (spent comet)", hit: "Caught in a spent Meteorain comet's explosion",
    why: "A comet that absorbed a Fearsome Fireball explodes a moment later; step away from it." },
  46145: { name: "Majestic Meteor", hit: "Hit by a Majestic Meteor puddle",
    why: "The Fire Breath markers bait three puddles each; keep clear of where they land." },
  46146: { name: "Majestic Meteorain", hit: "Hit by a Majestic Meteorain lane",
    why: "The meteor lanes fire with the breaths and tethers; stay out of the lanes." },
  46165: { name: "Majestic Meteor", hit: "Hit by a Stampede Majestic Meteor puddle",
    why: "The six unmarked players bait these puddles in a line; keep moving with the group, off the old drops." },
  46155: { name: "Arcadion Avalanche", hit: "Caught by Arcadion Avalanche",
    why: "The boss throws the island it faces; be on the island behind it, in the corner opposite the throw." },
  46159: { name: "Arcadion Avalanche", hit: "Caught by Arcadion Avalanche",
    why: "The boss throws the island it faces; be on the island behind it, in the corner opposite the throw." },
};

// One bait per player per instance: a player hit by another player's
// instance, or by two at once, is an overlap.
// `proximity`: aimed at the nearest players, so with anyone dead the baits
// pile onto the survivors (A9 +3:47: two players left took 7 tornado cones).
// `tankEnmity`: aimed at everyone but the top two on enmity, so a tank who
// just died or was raised takes one (A29 +2:45: user, nobody at fault).
// `spot`: assigned spread spots; an overlap names only the player clearly
// farthest from theirs (see spreadDeviation).
type Family = { name: string; ids: number[]; what: string; why: string; gap?: number; proximity?: boolean; tankEnmity?: boolean; spot?: "impact" | "scytheClock" };
const PERSONAL: Family[] = [
  { name: "Impact", ids: [46092], what: "Impact circle", tankEnmity: true, spot: "impact",
    why: "The axe's Raw Steel drops a circle on each of the six non-tanks; spread to your own spot." },
  { name: "Sweeping Victory", ids: [46108], what: "scythe cone", spot: "scytheClock",
    why: "The scythe fires a cone at every player; spread around it on your clock spot so no cone crosses another player." },
  { name: "Comet", ids: [46100], what: "Comet",
    why: "Void Stardust's Comets are spreads on every player; stand apart." },
  { name: "Powerful Gust", ids: [46119], what: "tornado cone", proximity: true,
    why: "Each tornado fires a cone at its two nearest players; aim them outward and apart." },
  { name: "Fire Breath / Meteowrath", ids: [46151, 46147], what: "Fire Breath or tether line", proximity: true,
    why: "Each player takes exactly one line: the tethered players stretch theirs, the others bait one breath each; keep the lines apart." },
  { name: "Majestic Meteowrath", ids: [46169], what: "tether line",
    why: "Each tower soaker stretches their own tether across the arena; keep the lines apart." },
];

// Shared stacks: standing in two instances is an overlap; a stack that killed
// someone while a living eligible player stood in none names that player.
// `healerLines`: one line per healer, aimed from the sword at them. With a
// healer down the line retargets onto the group (fallout); a healer standing
// in both lines was on the wrong side (user, 2026-10-09, A11 +1:35).
// `pairs`: Eye of the Hurricane, judged by assigned partners (eyePartnerErrors).
type Stack = Family & { eligible?: "all" | "nonTank" | "pairTower"; healerLines?: boolean; pairs?: boolean };
const STACKS: Stack[] = [
  { name: "Heavy Weight", ids: [46107], what: "axe stack",
    why: "The axe's Heavy Weight is one party stack; everyone shares it." },
  { name: "Heavy Hitter", ids: [HEAVY_HITTER], what: "shared cone", eligible: "nonTank",
    why: "The scythe's Heavy Hitter is shared by all six non-tanks while the tanks take their own cones." },
  { name: "Sharp Taste", ids: [46109], what: "healer line stack", healerLines: true,
    why: "The sword's Sharp Taste is two line stacks, four players on each healer." },
  { name: "Crushing Comet", ids: [46101], what: "party stack",
    why: "Crushing Comet is one party stack; everyone shares it." },
  { name: "Eye of the Hurricane", ids: [46116], what: "pair stack", pairs: true,
    why: "Eye of the Hurricane is four two-person stacks; each player stands in exactly one, with their partner." },
  { name: "Massive Meteor", ids: [46153], what: "light-party stack", gap: 700,
    why: "Massive Meteor is two five-hit light-party stacks; each stack needs its four players." },
  { name: "Two-Way Fireball", ids: [TWO_WAY], what: "charge line",
    why: "Two-Way Fireball is two four-player charge lines; everyone joins one." },
  { name: "Four-Way Fireball", ids: [FOUR_WAY], what: "charge line",
    why: "Four-Way Fireball is four two-player charge lines; everyone joins one." },
  { name: "Weighty Impact", ids: [46167], what: "pair tower", eligible: "pairTower",
    why: "Each Weighty Impact tower needs two players; the four players without fire or a tank tower take them." },
];

// FFLogs logs the death event ~2.0s after the fatal hit (README).
const DEATH_EVENT_LAG_MS = 2000;
const DIED_FROM_HIT_MS   = 3000;
// A no-killing-blow death this soon after a knockback hit was thrown off
// (tower knockbacks off an island: 4.4s, B7 +427.7 and B26 +465.7).
const FALL_KNOCKBACK_MS  = 5000;
// No-killing-blow deaths this close to the pull's end are the wipe being
// called (the raid walks off the edge to reset; the earliest such death came
// 10.6s before the end, A15). The mid-pull falls ended 18.8s+ before it.
const CALLED_WIPE_END_MS = 12_000;
const CALLED_WIPE_COUNT  = 3;
const CALLED_WIPE_WINDOW = 10_000;
const COLLAPSE_DEAD_COUNT = 5;
const COLLAPSE_END_MS     = 45_000;
// A tank dead in this window before a buster has lost enmity.
const TANK_ENMITY_LOST_MS = 30_000;
// Deaths to one unsoaked tower that end the pull.
const MASS_DEATHS         = 3;
// Hits this large are FFLogs' unpaired previews of lethal hits (README):
// counted as hits, never compared as amounts.
const PREVIEW_AMOUNT      = 1_500_000;
// A Cosmic Kiss drop hitting this many players besides its two baiters was
// dropped on the group (B1 +313.8 and B4 +323.9 hit 4; clean drops hit only
// their two baiters, with a third player clipped 3 times in 17 pulls).
const KISS_ON_GROUP       = 3;
// A stack taken by one or two players while this many eligible players stood
// elsewhere went to the wrong place itself.
const STACK_LEFT_GROUP = 3;
// With this many dead a stack is doomed anyway: nobody is named for missing it
// (user, 2026-10-09, A14 +1:40 with three dead).
const STACK_DOOMED_DEAD = 3;
// A player raised this recently may still be in their raise grace (immune):
// baits they draw from where they were raised are bad luck, not an overlap
// (user, 2026-10-09, A20 +1:46).
const RAISE_GRACE_MS = 10_000;
// Hector spread spots for the axe Raw Steel's Impact circles, absolute arena
// units (the boss is always centered facing north for both Raw Steels).
// Medians of the clean resolutions over all three reports, 22-35 per slot.
const IMPACT_SPOTS: Partial<Record<FFRoleSlot, { x: number; y: number }>> = {
  M1: { x: 9530, y: 10440 }, M2: { x: 10550, y: 10290 }, H1: { x: 9560, y: 11250 },
  H2: { x: 10340, y: 11320 }, R1: { x: 8370, y: 9860 }, R2: { x: 11200, y: 11050 },
};
// Hector scythe clock: degrees clockwise from the scythe's logged facing
// (which points at the OT). Clean medians over all reports: OT 4, M2 -38,
// H2 -85, R2 -128, MT 180, R1 136, H1 83, M1 46 (p10-p90 within ~15).
const SCYTHE_CLOCK: Record<FFRoleSlot, number> = { OT: 0, M2: -45, H2: -90, R2: -135, MT: 180, R1: 135, H1: 90, M1: 45 };
const SCYTHE_CAST = 46105;
// An overlap names only its worst-placed player when they were at least this
// far off and clearly worse than the next (Impact A1 the R2 1500 units off,
// next 170; A5 330 vs 120; A15 1250 vs 650. Scythe A7 the R2 20 deg vs 5,
// A17 77 vs 8, A32 52 vs 6; ambiguous A21 20 vs 17).
const SPOT_MIN = { impact: 250, scytheClock: 15 };
const SPOT_CLEAR = { impact: (w: number, s: number) => w >= 1.8 * s, scytheClock: (w: number, s: number) => w - s >= 10 };
// Eye of the Hurricane partners (Hector): MT/M1, OT/M2, H1/R1, H2/R2.
const EYE_PARTNER: Record<FFRoleSlot, FFRoleSlot> = { MT: "M1", M1: "MT", OT: "M2", M2: "OT", H1: "R1", R1: "H1", H2: "R2", R2: "H2" };
// Hits closer together than this are one avoidable episode for a player.
const EPISODE_MS          = 3000;

// ── shared helpers ──────────────────────────────────────────────────────────

type Hit = { p: PlayerInfo; e: PlayerEvent };

type Life = {
  alive: (p: PlayerInfo, t: number) => boolean;
  hitAlive: (p: PlayerInfo, hitT: number) => boolean;
  diedFrom: (p: PlayerInfo, hitT: number) => DeathEvent | undefined;
  outIntervals: { p: PlayerInfo; start: number; end: number }[];
};

function buildLife(players: PlayerInfo[], deaths: DeathEvent[]): Life {
  const outIntervals: Life["outIntervals"] = [];
  for (const p of players) {
    const own = deaths.filter((d) => d.player === p.name).sort((a, b) => a.timestamp - b.timestamp);
    own.forEach((d, i) => {
      const next = own[i + 1]?.timestamp ?? Infinity;
      const end = rezzedAt(p, d.timestamp, next) ?? next - DEATH_EVENT_LAG_MS - 100;
      outIntervals.push({ p, start: d.timestamp - DEATH_EVENT_LAG_MS - 100, end });
    });
  }
  const alive = (p: PlayerInfo, t: number) => !outIntervals.some((w) => w.p === p && t >= w.start && t < w.end);
  return {
    outIntervals,
    alive,
    hitAlive: (p, hitT) => alive(p, hitT - 500),
    diedFrom: (p, hitT) => deaths.find((d) => d.player === p.name && d.timestamp >= hitT && d.timestamp <= hitT + DIED_FROM_HIT_MS),
  };
}

/** Hits on living players (a dead body still logs 0-damage hits). */
function hitsOf(players: PlayerInfo[], life: Life, ids: number | number[], from = -Infinity, to = Infinity): Hit[] {
  const set = new Set(Array.isArray(ids) ? ids : [ids]);
  const out: Hit[] = [];
  for (const p of players) {
    for (const e of p.damageTaken) {
      if (!set.has(e.abilityId) || e.timestamp < from || e.timestamp > to || e.healthBefore === 0) continue;
      if (life.hitAlive(p, e.timestamp)) out.push({ p, e });
    }
  }
  return out.sort((a, b) => a.e.timestamp - b.e.timestamp);
}

const castsOf = (casts: EnemyEvent[], ids: number | number[]) => {
  const set = new Set(Array.isArray(ids) ? ids : [ids]);
  return casts.filter((c) => set.has(c.abilityId)).sort((a, b) => a.timestamp - b.timestamp);
};

function gotDamageDown(p: PlayerInfo, t: number): boolean {
  return p.debuffs.some((e) => e.abilityId === DAMAGE_DOWN && e.debuffStatus === "applied" && Math.abs(e.timestamp - t) <= 1500);
}

/** The aura was on the player at `t`. */
function hasAura(p: PlayerInfo, id: number, t: number): boolean {
  return debuffIntervals(p, id).some((w) => w.start <= t && w.end > t);
}

const uniq = <T,>(xs: T[]) => [...new Set(xs)];
const namesOf = (ps: PlayerInfo[]) => joinNames(uniq(ps).map((p) => p.name));
const isTank = (p: PlayerInfo) => p.role === "Tank";
const realAmount = (e: PlayerEvent) => ((e.amount ?? 0) >= PREVIEW_AMOUNT ? 0 : e.amount ?? 0);
const instanceKey = (e: PlayerEvent) => `${e.source}#${e.sourceInstance}`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** A tank whose recent death (or raise) cost them enmity before `t`. */
function tankOutRecently(life: Life, p: PlayerInfo, t: number): boolean {
  return !life.hitAlive(p, t) || life.outIntervals.some((w) => w.p === p && w.start <= t && w.end >= t - TANK_ENMITY_LOST_MS);
}

/** Both tanks alive and holding enmity at `t` (otherwise busters retarget as fallout). */
function tanksHealthy(players: PlayerInfo[], life: Life, t: number): boolean {
  const tanks = players.filter(isTank);
  return tanks.length >= 2 && tanks.every((p) => !tankOutRecently(life, p, t));
}

/** Raised within RAISE_GRACE_MS before `t` (or still out at `t`). */
function inRaiseGrace(life: Life, p: PlayerInfo, t: number): boolean {
  return !life.hitAlive(p, t) || life.outIntervals.some((w) => w.p === p && w.end <= t && t - w.end < RAISE_GRACE_MS);
}

type Slots = Map<PlayerInfo, FFRoleSlot>;

/**
 * Party slots: roles.ts (H1 the pure healer, R1 physical ranged, R2
 * caster), with MT/OT and M1/M2 read from this pull's own spreads, which
 * agree in every clean resolution (user, 2026-10-09: PLD MT, DRK OT, RPR M1,
 * DRG M2). The boss's first auto-attack, roles.ts's MT signal, picked the OT
 * in some pulls (A13, A26).
 * - MT stands in front of the scythe (180 from its facing), OT behind (0);
 *   MT takes the west Raw Steel cone.
 * - M1 sits west of M2 for Impact and on the scythe's +45 side.
 */
function resolveSlots(players: PlayerInfo[], life: Life, casts: EnemyEvent[]): Slots {
  const slots: Slots = new Map();
  for (const a of detectFFRoles(players)) if (a.player) slots.set(a.player, a.slot);
  const pair = (first: FFRoleSlot, second: FFRoleSlot, vote: (p: PlayerInfo) => number) => {
    const two = players.filter((p) => slots.get(p) === first || slots.get(p) === second);
    if (two.length !== 2) return;
    const d = vote(two[0]) - vote(two[1]);
    if (d === 0) return;
    slots.set(d > 0 ? two[0] : two[1], first);
    slots.set(d > 0 ? two[1] : two[0], second);
  };
  // Votes for the first slot of each pair.
  pair("MT", "OT", (p) => {
    let v = 0;
    for (const h of hitsOf([p], life, 46108)) {
      const rel = scytheAngle(casts, h.e);
      if (rel !== undefined) v += Math.abs(rel) > 120 ? 1 : Math.abs(rel) < 60 ? -1 : 0;
    }
    for (const h of hitsOf([p], life, RAW_STEEL_SCYTHE)) if (h.e.x !== undefined) v += h.e.x < 10000 ? 1 : -1;
    return v;
  });
  pair("M1", "M2", (p) => {
    let v = 0;
    for (const h of hitsOf([p], life, 46092)) if (h.e.x !== undefined) v += h.e.x < 10000 ? 1 : -1;
    for (const h of hitsOf([p], life, 46108)) {
      const rel = scytheAngle(casts, h.e);
      if (rel !== undefined && Math.abs(rel) < 90) v += rel > 0 ? 1 : -1;
    }
    return v;
  });
  return slots;
}

/** A hit's angle around the scythe, degrees clockwise from its facing (-180..180). */
function scytheAngle(casts: EnemyEvent[], e: PlayerEvent): number | undefined {
  const sc = casts.filter((c) => c.abilityId === SCYTHE_CAST && c.timestamp <= e.timestamp + 200 && c.timestamp > e.timestamp - 4000 && c.x !== undefined && c.facing !== undefined).pop();
  if (!sc || e.x === undefined || e.y === undefined) return undefined;
  const bearing = (Math.atan2(e.x - sc.x!, -(e.y - sc.y!)) * 180 / Math.PI + 360) % 360;
  const rel = bearing - facingToCompassBearing(sc.facing!);
  return ((rel % 360) + 540) % 360 - 180;
}

/** How far a player was from their assigned spread spot (units or degrees). */
function spreadDeviation(kind: "impact" | "scytheClock", slots: Slots, casts: EnemyEvent[], h: Hit): number | undefined {
  const slot = slots.get(h.p);
  if (!slot || h.e.x === undefined || h.e.y === undefined) return undefined;
  if (kind === "impact") {
    const s = IMPACT_SPOTS[slot];
    return s ? Math.hypot(h.e.x - s.x, h.e.y - s.y) : undefined;
  }
  const rel = scytheAngle(casts, h.e);
  return rel === undefined ? undefined : angularDistance(rel, SCYTHE_CLOCK[slot]);
}

const spotText = (kind: "impact" | "scytheClock", dev: number) => (kind === "impact" ? `~${yd(dev)} yalms` : `${Math.round(dev)} degrees`);

/** Players who took a listed avoidable hit within 2s of `t`: already flagged for it. */
function inAvoidable(p: PlayerInfo, t: number): boolean {
  return p.damageTaken.some((e) => AVOIDABLE[e.abilityId] && Math.abs(e.timestamp - t) <= 2000 && realAmount(e) > 0);
}

/** Cast target of each instance among the casts just before a resolution's hits. */
function castOwners(casts: EnemyEvent[], ids: number[], res: Hit[], players: PlayerInfo[]): Map<string, PlayerInfo> {
  const t0 = res[0].e.timestamp, t1 = res[res.length - 1].e.timestamp;
  const out = new Map<string, PlayerInfo>();
  for (const c of casts) {
    if (!ids.includes(c.abilityId) || c.timestamp < t0 - 2000 || c.timestamp > t1 || c.sourceInstance === undefined || !c.target) continue;
    const p = players.find((x) => x.name === c.target);
    if (p) out.set(`${c.actorName}#${c.sourceInstance}`, p);
  }
  return out;
}

// ── plain avoidable hits ────────────────────────────────────────────────────

function detectAvoidable(players: PlayerInfo[], life: Life): PullError[] {
  const errors: PullError[] = [];
  const ids = Object.keys(AVOIDABLE).map(Number);
  for (const p of players) {
    // A fully mitigated hit (invulnerable, 0 damage, no Damage Down) is no loss.
    const hits = p.damageTaken.filter((e) => ids.includes(e.abilityId) && e.healthBefore !== 0 && life.hitAlive(p, e.timestamp) &&
      (realAmount(e) > 0 || (e.amount ?? 0) >= PREVIEW_AMOUNT || gotDamageDown(p, e.timestamp)));
    for (const g of clusterByGap(hits, (e) => e.timestamp, EPISODE_MS)) {
      const kinds = uniq(g.map((e) => AVOIDABLE[e.abilityId]));
      const total = g.reduce((s, e) => s + realAmount(e), 0);
      const death = life.diedFrom(p, g[g.length - 1].timestamp);
      const dd = g.some((e) => gotDamageDown(p, e.timestamp));
      const hit = kinds.map((k, i) => (i === 0 ? k.hit : k.hit.charAt(0).toLowerCase() + k.hit.slice(1))).join(", and ");
      const outcome = [dd ? "got Damage Down" : "", death ? "died" : ""].filter(Boolean).join(" and ");
      errors.push(playerError(p, {
        ruleId: TYRANT_AVOIDABLE_RULE_ID, severity: dd || death ? "Major" : "Minor", name: `Hit by ${uniq(kinds.map((k) => k.name)).join(" / ")}`,
        description: `${hit} (${g.length > 1 ? `${g.length} hits, ` : ""}${kFmt(total)}).${outcome ? ` They ${outcome}.` : ""} ${uniq(kinds.map((k) => k.why)).join(" ")}`,
        timestamp: g[0].timestamp, abilityId: g[0].abilityId, abilityName: g[0].abilityName,
      }));
    }
  }
  return errors;
}

// ── overlapping personal baits ──────────────────────────────────────────────

/**
 * Per resolution of a one-bait-per-player family: who owns each instance (the
 * cast target; failing that, the only player it hit, or the one player it hit
 * who took nothing else), and who was hit by an instance that isn't theirs or
 * by two at once. Names the victim and, when known, the owner (README
 * philosophy 3: both are candidates) — unless the family has assigned spots
 * and one player of the incident was clearly the farthest off theirs, who is
 * then named alone (user, 2026-10-09: A1, A5, A7 the R2).
 */
function detectPersonalOverlaps(players: PlayerInfo[], life: Life, casts: EnemyEvent[], slots: Slots): PullError[] {
  const errors: PullError[] = [];
  for (const fam of PERSONAL) {
    for (const res of clusterByGap(hitsOf(players, life, fam.ids), (h) => h.e.timestamp, fam.gap ?? 1500)) {
      const t0 = res[0].e.timestamp, t1 = res[res.length - 1].e.timestamp;
      if (fam.proximity && players.some((p) => !life.hitAlive(p, t0))) continue;
      // A tank dying to this same Raw Steel still held enmity at the cast.
      if (fam.tankEnmity && !tanksHealthy(players, life, t0 - DIED_FROM_HIT_MS)) continue;
      // Instances that also hit someone dead or in raise grace are that
      // player's bait drawn from where they were raised: drop them.
      const tainted = new Set<string>();
      for (const p of players) {
        for (const e of p.damageTaken) {
          // A grace-immune player's 0-damage hits log early (A20: 0.7s before).
          if (fam.ids.includes(e.abilityId) && e.timestamp >= t0 - 1500 && e.timestamp <= t1 + 500 && inRaiseGrace(life, p, e.timestamp)) tainted.add(instanceKey(e));
        }
      }
      const byInst = new Map<string, Hit[]>();
      const byPlayer = new Map<PlayerInfo, Set<string>>();
      for (const h of res) {
        const k = instanceKey(h.e);
        if (tainted.has(k)) continue;
        byInst.set(k, [...(byInst.get(k) ?? []), h]);
        byPlayer.set(h.p, (byPlayer.get(h.p) ?? new Set()).add(k));
      }
      if (!byInst.size) continue;
      const owners = castOwners(casts, fam.ids, res, players);
      for (const [k, hs] of byInst) {
        if (owners.has(k)) continue;
        const only = uniq(hs.map((h) => h.p)).filter((p) => byPlayer.get(p)!.size === 1);
        if (hs.length === 1) owners.set(k, hs[0].p);
        else if (only.length === 1 && uniq(hs.map((h) => h.p)).length > 1) owners.set(k, only[0]);
      }
      const t = t0;
      // Who is involved with whom: victims with the owners / co-victims of
      // the instances that hit them, and owners whose bait hit someone else.
      const links = new Map<PlayerInfo, Set<PlayerInfo>>();
      const link = (a: PlayerInfo, b: PlayerInfo) => {
        links.set(a, (links.get(a) ?? new Set()).add(b));
        links.set(b, (links.get(b) ?? new Set()).add(a));
      };
      const hitTwice = new Set<PlayerInfo>();
      for (const [p, ks] of byPlayer) {
        const foreign = [...ks].filter((k) => owners.get(k) !== p);
        if (ks.size < 2 && foreign.length === 0) continue;
        if (ks.size >= 2) hitTwice.add(p);
        if (!links.has(p)) links.set(p, new Set());
        for (const k of ks) {
          const o = owners.get(k);
          if (o) { if (o !== p) link(p, o); }
          else for (const h of byInst.get(k)!) if (h.p !== p) link(p, h.p);
        }
      }
      if (!links.size) continue;
      // Split into incidents (connected groups).
      const seen = new Set<PlayerInfo>();
      for (const start of links.keys()) {
        if (seen.has(start)) continue;
        const group: PlayerInfo[] = [];
        const stack = [start];
        while (stack.length) {
          const p = stack.pop()!;
          if (seen.has(p)) continue;
          seen.add(p);
          group.push(p);
          for (const q of links.get(p) ?? []) stack.push(q);
        }
        const killed = group.filter((p) => {
          const last = res.filter((h) => h.p === p).pop()?.e.timestamp ?? t;
          const d = life.diedFrom(p, last);
          return d && fam.ids.includes(d.killingAbilityGameId);
        });
        const severity = killed.length ? "Major" : "Minor";
        const deathText = killed.length ? ` ${namesOf(killed)} died.` : "";
        // The worst-placed player, when the family has spots and it's clear.
        let culprit: { p: PlayerInfo; dev: number; next?: number } | undefined;
        if (fam.spot) {
          const devs = group.map((p) => ({ p, dev: spreadDeviation(fam.spot!, slots, casts, res.find((h) => h.p === p)!) }));
          if (devs.every((d) => d.dev !== undefined)) {
            const sorted = (devs as { p: PlayerInfo; dev: number }[]).sort((a, b) => b.dev - a.dev);
            const [w, s] = sorted;
            if (w.dev >= SPOT_MIN[fam.spot] && (!s || SPOT_CLEAR[fam.spot](w.dev, s.dev))) culprit = { ...w, next: s?.dev };
          }
        }
        if (culprit) {
          const others = group.filter((p) => p !== culprit!.p);
          errors.push(playerError(culprit.p, {
            ruleId: TYRANT_OVERLAP_RULE_ID, severity, name: `${fam.name} Overlap`,
            description: `Was ${spotText(fam.spot!, culprit.dev)} off their ${fam.what} spot${culprit.next !== undefined ? ` (the others involved: ${spotText(fam.spot!, culprit.next)} at most)` : ""}, so their ${fam.what} and ${namesOf(others)}'s overlapped.${deathText} ${fam.why}`,
            timestamp: t, abilityId: fam.ids[0], abilityName: fam.name,
          }));
          continue;
        }
        for (const p of group) {
          const others = [...(links.get(p) ?? [])];
          const n = byPlayer.get(p)?.size ?? 0;
          const description = hitTwice.has(p) || [...(byPlayer.get(p) ?? [])].some((k) => owners.get(k) !== p)
            ? `Hit by ${n > 1 ? `${n} ${fam.what}s at once` : `another player's ${fam.what}`}${others.length ? ` (with ${namesOf(others)})` : ""}.`
            : `Their ${fam.what} also hit ${namesOf(others)}.`;
          errors.push(playerError(p, {
            ruleId: TYRANT_OVERLAP_RULE_ID, severity, name: `${fam.name} Overlap`,
            description: `${description}${deathText} ${fam.why}`,
            timestamp: t, abilityId: fam.ids[0], abilityName: fam.name,
          }));
        }
      }
    }
  }
  return errors;
}

// ── shared stacks ───────────────────────────────────────────────────────────

/**
 * Stampede fire carriers: the players Atomic Impact's casts target (six
 * each). Counting hits instead fails when the puddles chain through the
 * group (C13: six players took 3+).
 */
function atomicCarriers(players: PlayerInfo[], casts: EnemyEvent[]): Set<PlayerInfo> {
  const counts = new Map<string, number>();
  for (const c of castsOf(casts, ATOMIC_IMPACT)) if (c.target) counts.set(c.target, (counts.get(c.target) ?? 0) + 1);
  return new Set(players.filter((p) => (counts.get(p.name) ?? 0) >= 3));
}

/**
 * Eye of the Hurricane by partner: the four marked players (all supports or
 * all DPS, read from the casts' targets) each bring their stack to their
 * Hector partner. A marked player whose stack missed their partner is the
 * one out of place (user, 2026-10-09, A13 +2:31: the R1 alone and the M1 on
 * the M2's stack; the unmarked partners and the M2 were where they belonged).
 * Undefined when the markers can't be read: the generic rules apply.
 */
function eyePartnerErrors(fam: Stack, res: Hit[], players: PlayerInfo[], life: Life, casts: EnemyEvent[], slots: Slots, killed: PlayerInfo[]): PullError[] | undefined {
  const t = res[0].e.timestamp;
  const targets = castsOf(casts, fam.ids).filter((c) => c.timestamp >= t - 2000 && c.timestamp <= t && c.target)
    .map((c) => players.find((p) => p.name === c.target)).filter((p): p is PlayerInfo => !!p);
  if (!targets.length || slots.size < 8) return undefined;
  const dpsMarked = targets[0].role === "DPS";
  const marked = players.filter((p) => (p.role === "DPS") === dpsMarked);
  const instancesOf = (p: PlayerInfo) => new Set(res.filter((h) => h.p === p).map((h) => instanceKey(h.e)));
  const deathText = killed.length ? ` ${namesOf(killed)} died.` : "";
  const errors: PullError[] = [];
  for (const m of marked) {
    const partner = players.find((p) => slots.get(p) === EYE_PARTNER[slots.get(m)!]);
    if (!partner || !life.hitAlive(m, t) || !life.hitAlive(partner, t) || inAvoidable(m, t)) continue;
    const mine = instancesOf(m);
    if ([...instancesOf(partner)].some((k) => mine.has(k))) continue;
    const with_ = uniq(res.filter((h) => mine.has(instanceKey(h.e)) && h.p !== m).map((h) => h.p));
    errors.push(playerError(m, {
      ruleId: TYRANT_STACK_RULE_ID, severity: killed.length ? "Major" : "Minor", name: "Eye of the Hurricane Away From Partner",
      description: `Took their Eye of the Hurricane stack ${with_.length ? `to ${namesOf(with_)}` : "alone"} instead of to their partner ${partner.name} (${slots.get(m)} with ${slots.get(partner)}).${deathText} ${fam.why}`,
      timestamp: t, abilityId: fam.ids[0], abilityName: fam.name,
    }));
  }
  return errors;
}

function detectStacks(players: PlayerInfo[], life: Life, casts: EnemyEvent[], carriers: Set<PlayerInfo>, slots: Slots): PullError[] {
  const errors: PullError[] = [];
  for (const fam of STACKS) {
    for (const res of clusterByGap(hitsOf(players, life, fam.ids), (h) => h.e.timestamp, fam.gap ?? 1500)) {
      const t = res[0].e.timestamp;
      const byPlayer = new Map<PlayerInfo, Set<string>>();
      for (const h of res) byPlayer.set(h.p, (byPlayer.get(h.p) ?? new Set()).add(instanceKey(h.e)));
      const killed = uniq(res.map((h) => h.p)).filter((p) => {
        const d = life.diedFrom(p, res.filter((h) => h.p === p).pop()!.e.timestamp);
        return d && fam.ids.includes(d.killingAbilityGameId);
      });
      const deathText = killed.length ? ` ${namesOf(killed)} died.` : "";
      const doubled = [...byPlayer].filter(([, ks]) => ks.size >= 2).map(([p]) => p);
      if (fam.pairs) {
        const pairErrors = eyePartnerErrors(fam, res, players, life, casts, slots, killed);
        if (pairErrors) {
          errors.push(...pairErrors);
          continue;
        }
      }
      if (fam.healerLines) {
        // 7 of 9 doubled Sharp Tastes followed a healer's death (A12, A16,
        // A19, A24, A28, B2): the line retargeted onto the group.
        const healers = players.filter((p) => p.role === "Healer");
        if (healers.some((p) => !life.hitAlive(p, t))) continue;
        // A healer in both lines stood on the other healer's side, which put
        // both lines through the same players (A11 +1:35, A18, C5).
        const wrongSide = doubled.filter((p) => p.role === "Healer");
        if (wrongSide.length) {
          for (const p of wrongSide) {
            errors.push(playerError(p, {
              ruleId: TYRANT_STACK_RULE_ID, severity: killed.length ? "Major" : "Minor", name: "Sharp Taste Wrong Side",
              description: `Stood in both Sharp Taste lines, on the other healer's side, so both lines fired through the same players (${namesOf(doubled)} took both).${deathText} Each line aims at a healer; the two healers stand on opposite sides of the sword so the lines split the party four and four.`,
              timestamp: t, abilityId: fam.ids[0], abilityName: fam.name,
            }));
          }
          continue;
        }
      }
      for (const [p, ks] of byPlayer) {
        if (ks.size < 2) continue;
        errors.push(playerError(p, {
          ruleId: TYRANT_STACK_RULE_ID, severity: killed.length ? "Major" : "Minor", name: `${fam.name}: Two Stacks`,
          description: `Stood in ${ks.size} ${fam.what}s at once.${deathText} ${fam.why}`,
          timestamp: t, abilityId: fam.ids[0], abilityName: fam.name,
        }));
      }
      if (!killed.length) continue;
      if (players.filter((p) => !life.alive(p, t)).length >= STACK_DOOMED_DEAD) continue;
      const eligible = (p: PlayerInfo) =>
        fam.eligible === "nonTank" ? !isTank(p)
        : fam.eligible === "pairTower" ? !isTank(p) && !carriers.has(p)
        : true;
      const absent = players.filter((p) => eligible(p) && !byPlayer.has(p) && life.hitAlive(p, t) && !inAvoidable(p, t));
      // One or two players took it while most of the party was elsewhere:
      // the stack left the group, not the other way round (B17 +1:41, C18
      // +3:31: one player under Heavy Weight, the rest absent).
      if (absent.length >= STACK_LEFT_GROUP && byPlayer.size <= 2) {
        for (const p of byPlayer.keys()) {
          errors.push(playerError(p, {
            ruleId: TYRANT_STACK_RULE_ID, severity: "Major", name: `${fam.name} Away From the Group`,
            description: `Took the ${fam.what} ${byPlayer.size === 1 ? "alone" : `with only ${namesOf([...byPlayer.keys()].filter((x) => x !== p))}`} while ${plural(absent.length, "player")} (${namesOf(absent)}) were elsewhere.${deathText} ${fam.why}`,
            timestamp: t, abilityId: fam.ids[0], abilityName: fam.name,
          }));
        }
        continue;
      }
      for (const p of absent) {
        errors.push(playerError(p, {
          ruleId: TYRANT_STACK_RULE_ID, severity: "Major", name: `Missed ${fam.name}`,
          description: `Wasn't in any ${fam.what}; ${plural(byPlayer.size, "player")} shared it and ${namesOf(killed)} died to the extra damage. ${fam.why}`,
          timestamp: t, abilityId: fam.ids[0], abilityName: fam.name,
        }));
      }
    }
  }
  return errors;
}

/**
 * Two-Way / Four-Way Fireball: a player with Fire Resistance Down II (their
 * Meteowrath tether) who died taking the biggest hit of their line stood in
 * front of it (the kill's only death, C20 +9:37).
 */
function detectFireballFronts(players: PlayerInfo[], life: Life): PullError[] {
  const errors: PullError[] = [];
  for (const res of clusterByGap(hitsOf(players, life, [TWO_WAY, FOUR_WAY]), (h) => h.e.timestamp, 1500)) {
    const named = new Set<PlayerInfo>();
    for (const h of res) {
      if (named.has(h.p)) continue;
      const d = life.diedFrom(h.p, h.e.timestamp);
      if (!d || ![TWO_WAY, FOUR_WAY].includes(d.killingAbilityGameId) || !hasAura(h.p, FIRE_RES_DOWN, h.e.timestamp - 200)) continue;
      const line = res.filter((x) => instanceKey(x.e) === instanceKey(h.e));
      if (line.some((x) => realAmount(x.e) > realAmount(h.e))) continue;
      named.add(h.p);
      errors.push(playerError(h.p, {
        ruleId: TYRANT_STACK_RULE_ID, severity: "Major", name: "Fireball Front With Fire Vulnerability",
        description: `Took the front of ${h.e.abilityName} (${kFmt(realAmount(h.e))}, the largest hit of their line) while carrying Fire Resistance Down II from their tether, and died. The front of each charge takes far more damage; the tether players stand behind a player without the vulnerability.`,
        timestamp: h.e.timestamp, abilityId: h.e.abilityId, abilityName: h.e.abilityName,
      }));
    }
  }
  return errors;
}

// ── tank busters ────────────────────────────────────────────────────────────

function detectBusters(players: PlayerInfo[], life: Life, casts: EnemyEvent[], slots: Slots): PullError[] {
  const errors: PullError[] = [];
  const diedText = (p: PlayerInfo, t: number) => (life.diedFrom(p, t) ? ", and died" : "");
  // Axe Raw Steel: one shared buster on the tanks. A non-tank in it stood
  // with the tanks (with a tank down it retargets: fallout).
  for (const res of clusterByGap(hitsOf(players, life, RAW_STEEL_AXE), (h) => h.e.timestamp, 1500)) {
    const t = res[0].e.timestamp;
    if (!tanksHealthy(players, life, t)) continue;
    for (const h of res.filter((x) => !isTank(x.p))) {
      errors.push(playerError(h.p, {
        ruleId: TYRANT_BUSTER_RULE_ID, severity: life.diedFrom(h.p, t) ? "Major" : "Minor", name: "In the Tank Buster",
        description: `Stood in the axe's Raw Steel, the tanks' shared buster (${kFmt(realAmount(h.e))})${diedText(h.p, t)}. Only the two tanks share it; everyone else spreads for their Impact circle.`,
        timestamp: t, abilityId: RAW_STEEL_AXE, abilityName: "Raw Steel",
      }));
    }
  }
  // Scythe Raw Steel: a cone on each of the top two enmity players.
  for (const res of clusterByGap(hitsOf(players, life, RAW_STEEL_SCYTHE), (h) => h.e.timestamp, 1500)) {
    const t = res[0].e.timestamp;
    if (!tanksHealthy(players, life, t)) continue;
    const owners = castOwners(casts, [RAW_STEEL_SCYTHE], res, players);
    const byInst = new Map<string, Hit[]>();
    for (const h of res) byInst.set(instanceKey(h.e), [...(byInst.get(instanceKey(h.e)) ?? []), h]);
    const tanks = players.filter(isTank);
    // Both tanks in both cones: they stood together (A3 +0:26, both died).
    // MT takes the west (northwest) cone, OT the east; a tank on the other's
    // side is the one out of place (user, 2026-10-09, A26 +2:45: the OT).
    let doubled = tanks.filter((p) => uniq(res.filter((h) => h.p === p).map((h) => instanceKey(h.e))).length >= 2);
    const boss = castsOf(casts, [46093, 46094]).filter((c) => c.timestamp <= t && c.timestamp > t - 4000 && c.x !== undefined).pop();
    if (doubled.length === 2 && boss) {
      const wrong = doubled.filter((p) => {
        const x = res.find((h) => h.p === p)?.e.x;
        return x !== undefined && (slots.get(p) === "MT" ? x > boss.x! : x < boss.x!);
      });
      if (wrong.length === 1) doubled = wrong;
    }
    for (const p of doubled) {
      errors.push(playerError(p, {
        ruleId: TYRANT_BUSTER_RULE_ID, severity: life.diedFrom(p, t) ? "Major" : "Minor", name: "Tank Cones Overlapped",
        description: `Took both tanks' Raw Steel cones${diedText(p, t)}. Each tank takes their own cone away from the other (Hector: MT northwest, OT northeast).`,
        timestamp: t, abilityId: RAW_STEEL_SCYTHE, abilityName: "Raw Steel",
      }));
    }
    for (const [k, hs] of byInst) {
      const party = uniq(hs.map((h) => h.p).filter((p) => !isTank(p)));
      if (!party.length) continue;
      const owner = owners.get(k);
      const killed = party.filter((p) => life.diedFrom(p, t));
      const severity = killed.length ? "Major" : "Minor";
      const deathText = killed.length ? ` ${namesOf(killed)} died.` : "";
      if (owner && !isTank(owner)) {
        // The cone went to a non-tank: a tank didn't hold second enmity.
        const lost = tanks.filter((p) => !res.some((h) => h.p === p));
        for (const p of lost.length ? lost : []) {
          errors.push(playerError(p, {
            ruleId: TYRANT_BUSTER_RULE_ID, severity, name: "Lost Enmity for Raw Steel",
            description: `A Raw Steel tank cone targeted ${owner.name} instead of a tank, hitting ${namesOf(party)}.${deathText} The cones go to the top two on enmity; both tanks need to hold it.`,
            timestamp: t, abilityId: RAW_STEEL_SCYTHE, abilityName: "Raw Steel",
          }));
        }
        continue;
      }
      if (party.length >= 3) {
        // A cone through most of the party: its tank pointed it at the group.
        const tank = owner ?? tanks.find((p) => hs.some((h) => h.p === p));
        // No tank in it at all: it went to a non-tank, so the tank who took
        // no cone didn't hold enmity (A8 +0:26, five dead).
        const noCone = tanks.filter((p) => !res.some((h) => h.p === p));
        if (!tank && noCone.length) {
          for (const p of noCone) {
            errors.push(playerError(p, {
              ruleId: TYRANT_BUSTER_RULE_ID, severity, name: "Lost Enmity for Raw Steel",
              description: `Took no Raw Steel cone while one went through ${plural(party.length, "party member")} (${namesOf(party)}).${deathText} The cones go to the top two on enmity; both tanks need to hold it and face their cone away from the party.`,
              timestamp: t, abilityId: RAW_STEEL_SCYTHE, abilityName: "Raw Steel",
            }));
          }
          continue;
        }
        if (tank) {
          errors.push(playerError(tank, {
            ruleId: TYRANT_BUSTER_RULE_ID, severity, name: "Raw Steel Cone Into the Party",
            description: `Their Raw Steel cone hit ${plural(party.length, "party member")} (${namesOf(party)}).${deathText} Each tank faces their cone away from the party stack (Hector: MT northwest, OT northeast, party south).`,
            timestamp: t, abilityId: RAW_STEEL_SCYTHE, abilityName: "Raw Steel",
          }));
          continue;
        }
      }
      for (const p of party) {
        errors.push(playerError(p, {
          ruleId: TYRANT_BUSTER_RULE_ID, severity: life.diedFrom(p, t) ? "Major" : "Minor", name: "In a Tank Cone",
          description: `Stood in a tank's Raw Steel cone${owner ? ` (aimed at ${owner.name})` : ""}${diedText(p, t)}. The non-tanks stack for Heavy Hitter away from both tank cones.`,
          timestamp: t, abilityId: RAW_STEEL_SCYTHE, abilityName: "Raw Steel",
        }));
      }
    }
  }
  // Great Wall of Fire, Foregone Fatality: tank-only.
  for (const [id, name, why] of [
    [GREAT_WALL, "Great Wall of Fire", "Great Wall of Fire is a line buster on the main tank; everyone else stays off the line."],
    [FOREGONE_FATALITY, "Foregone Fatality", "The tanks intercept every Foregone Fatality tether; nobody else takes one."],
  ] as const) {
    for (const h of hitsOf(players, life, id)) {
      if (isTank(h.p) || !tanksHealthy(players, life, h.e.timestamp)) continue;
      errors.push(playerError(h.p, {
        ruleId: TYRANT_BUSTER_RULE_ID, severity: life.diedFrom(h.p, h.e.timestamp) ? "Major" : "Minor", name: `Took ${name}`,
        description: `Took ${name} (${kFmt(realAmount(h.e))}) while both tanks were up${diedText(h.p, h.e.timestamp)}. ${why}`,
        timestamp: h.e.timestamp, abilityId: id, abilityName: name,
      }));
    }
  }
  return errors;
}

// ── Meteorain ───────────────────────────────────────────────────────────────

/**
 * The three comet drops go melee -> healers -> ranged (Hector; every clean
 * drop in the sample). A drop that hit the group means its baiters didn't
 * leave the party; one or two extra players clipped stood too close. Fearsome
 * Fireball charges are shared by every non-tank except the next drop's
 * baiters (clean: 6 / 4 / 4 / 6, tanks on the first).
 */
function detectMeteorain(players: PlayerInfo[], life: Life): PullError[] {
  const errors: PullError[] = [];
  const isBaiter = (p: PlayerInfo, k: number) =>
    p.role === (k === 1 ? "Healer" : "DPS") && (k === 1 || (k === 0 ? p.rangeType === "Melee" : p.rangeType !== "Melee"));
  const drops = clusterByGap(hitsOf(players, life, COSMIC_KISS_DROP), (h) => h.e.timestamp, 3000);
  drops.forEach((res, k) => {
    if (k > 2) return;
    const t = res[0].e.timestamp;
    const baiters = players.filter((p) => isBaiter(p, k));
    if (baiters.length !== 2 || !baiters.every((p) => life.hitAlive(p, t))) return; // retargeted: fallout
    const extra = uniq(res.map((h) => h.p)).filter((p) => !baiters.includes(p));
    if (!extra.length) return;
    const killed = uniq(res.map((h) => h.p)).filter((p) => life.diedFrom(p, t)?.killingAbilityGameId === COSMIC_KISS_DROP);
    const severity = killed.length ? "Major" : "Minor";
    const deathText = killed.length ? ` ${namesOf(killed)} died (the earlier comets' Physical Vulnerability Up makes a second hit deadly).` : "";
    const role = ["melee", "healer", "ranged"][k];
    if (extra.length >= KISS_ON_GROUP) {
      for (const p of baiters) {
        errors.push(playerError(p, {
          ruleId: TYRANT_METEORAIN_RULE_ID, severity, name: "Dropped Comet on the Party",
          description: `Comet drop ${k + 1} (the ${role} pair: ${namesOf(baiters)}) also hit ${namesOf(extra)}.${deathText} The baiters carry their comets out to their own corners before they land.`,
          timestamp: t, abilityId: COSMIC_KISS_DROP, abilityName: "Cosmic Kiss",
        }));
      }
      return;
    }
    for (const p of extra) {
      errors.push(playerError(p, {
        ruleId: TYRANT_METEORAIN_RULE_ID, severity: life.diedFrom(p, t) ? "Major" : "Minor", name: "Clipped by a Comet",
        description: `Stood under comet drop ${k + 1}, the ${role} pair's (${namesOf(baiters)}).${deathText} Only the two baiters may be under each comet.`,
        timestamp: t, abilityId: COSMIC_KISS_DROP, abilityName: "Cosmic Kiss",
      }));
    }
  });
  for (const res of clusterByGap(hitsOf(players, life, FEARSOME_FIREBALL), (h) => h.e.timestamp, 1500)) {
    const t = res[0].e.timestamp;
    const killed = uniq(res.map((h) => h.p)).filter((p) => life.diedFrom(p, t)?.killingAbilityGameId === FEARSOME_FIREBALL);
    if (!killed.length) continue;
    const nextBaiters = new Set(hitsOf(players, life, COSMIC_KISS_DROP, t, t + 2500).map((h) => h.p));
    const absent = players.filter((p) => !isTank(p) && !nextBaiters.has(p) && !res.some((h) => h.p === p) && life.hitAlive(p, t) && !inAvoidable(p, t));
    for (const p of absent) {
      errors.push(playerError(p, {
        ruleId: TYRANT_METEORAIN_RULE_ID, severity: "Major", name: "Missed Fearsome Fireball",
        description: `Wasn't in the Fearsome Fireball charge; ${plural(res.length, "player")} shared it and ${namesOf(killed)} died. Every non-tank except the next comet's two baiters shares each charge behind the rock.`,
        timestamp: t, abilityId: FEARSOME_FIREBALL, abilityName: "Fearsome Fireball",
      }));
    }
  }
  return errors;
}

// ── towers ──────────────────────────────────────────────────────────────────

function detectTowers(players: PlayerInfo[], life: Life, casts: EnemyEvent[], deaths: DeathEvent[], carriers: Set<PlayerInfo>): PullError[] {
  const errors: PullError[] = [];
  const waves: { penalty: number; soak: number[]; window: number; eligible: (p: PlayerInfo) => boolean; label: string; why: string }[] = [
    { penalty: FLATLINER_UNSOAKED, soak: [FLATLINER_TOWER], window: 2500, eligible: () => true, label: "Flatliner tower",
      why: "Every player soaks a two-person tower in each of the three waves; a short tower explodes and hands the raid a heavy damage-over-time." },
    { penalty: STAMPEDE_UNSOAKED, soak: STAMPEDE_TOWERS, window: 3000, eligible: (p) => !carriers.has(p), label: "Stampede tower",
      why: "The two tanks take the solo towers and the four players without fire take the pair towers." },
  ];
  for (const w of waves) {
    for (const g of clusterByGap(castsOf(casts, w.penalty), (c) => c.timestamp, 3000)) {
      const t = g[0].timestamp;
      const soakers = new Set(hitsOf(players, life, w.soak, t - w.window, t).map((h) => h.p));
      const absent = players.filter((p) => w.eligible(p) && !soakers.has(p) && life.hitAlive(p, t - 1000) && !inAvoidable(p, t - 1000));
      const killed = uniq(deaths.filter((d) => [w.penalty, SUSTAINED_DAMAGE].includes(d.killingAbilityGameId) && d.timestamp >= t && d.timestamp <= t + 10_000).map((d) => d.player));
      const deathText = killed.length ? ` ${joinNames(killed)} died to the explosion and its damage-over-time.` : "";
      for (const p of absent) {
        errors.push(playerError(p, {
          ruleId: TYRANT_TOWER_RULE_ID, severity: "Major", name: `Missed ${w.label}`,
          description: `Soaked no tower in a wave where ${plural(g.length, "tower")} went off short (Unmitigated Explosion).${deathText} ${w.why}`,
          timestamp: t, abilityId: w.penalty, abilityName: "Unmitigated Explosion",
        }));
      }
      if (!absent.length) {
        errors.push(playerlessMinor(TYRANT_TOWER_RULE_ID, `${w.label} Short`,
          `${plural(g.length, w.label)} went off short (Unmitigated Explosion) with every living player already in a tower: earlier deaths left too few soakers.${deathText}`,
          t, w.penalty, "Unmitigated Explosion"));
      }
      if (killed.length >= MASS_DEATHS) {
        errors.push(raidMarker(TYRANT_TOWER_RULE_ID, `${w.label} Short`,
          `The unsoaked ${w.label} killed ${killed.length} (${joinNames(killed)}). Unresolvable from here.`, t, w.penalty, "Unmitigated Explosion"));
      }
    }
  }
  // Heartbreak Kick: the static's towers are tank-only (both tanks in every
  // pull that reached them). An empty tower is Tough Break.
  const tough = castsOf(casts, TOUGH_BREAK)[0];
  if (tough) {
    errors.push(raidMarker(TYRANT_TOWER_RULE_ID, "Heartbreak Kick Tower Failed",
      "A Heartbreak Kick tower was left empty and Tough Break hit the raid. Unresolvable from here.", tough.timestamp, TOUGH_BREAK, "Tough Break"));
  }
  for (const h of hitsOf(players, life, HEARTBREAK_KICK)) {
    const d = life.diedFrom(h.p, h.e.timestamp);
    if (isTank(h.p) || d?.killingAbilityGameId !== HEARTBREAK_KICK || !tanksHealthy(players, life, h.e.timestamp)) continue;
    errors.push(playerError(h.p, {
      ruleId: TYRANT_TOWER_RULE_ID, severity: "Major", name: "Entered a Tank Kick Tower",
      description: `Stepped into a Heartbreak Kick tower (${kFmt(realAmount(h.e))}) and died. The tanks cover the kick towers with their cooldowns and invulnerabilities; everyone else stays out.`,
      timestamp: h.e.timestamp, abilityId: HEARTBREAK_KICK, abilityName: "Heartbreak Kick",
    }));
  }
  return errors;
}

// ── Ecliptic Stampede ───────────────────────────────────────────────────────

function detectStampede(players: PlayerInfo[], life: Life, deaths: DeathEvent[], called: Set<DeathEvent>, carriers: Set<PlayerInfo>): PullError[] {
  const errors: PullError[] = [];
  // Atomic Impact on anyone but its two carriers: too close to a carrier.
  // With a carrier dead the puddles land on whoever is left (C13 +9:06: both
  // carriers died to Mammoth Meteor and Atomic Impact went through everyone).
  const carriersUp = (t: number) => carriers.size === 2 && [...carriers].every((c) => life.hitAlive(c, t));
  for (const p of players) {
    if (carriers.has(p)) continue;
    const hits = hitsOf([p], life, ATOMIC_IMPACT).filter((h) => realAmount(h.e) > 0 && carriersUp(h.e.timestamp));
    for (const g of clusterByGap(hits, (h) => h.e.timestamp, EPISODE_MS)) {
      const t = g[0].e.timestamp;
      const death = life.diedFrom(p, g[g.length - 1].e.timestamp);
      const dd = g.some((h) => gotDamageDown(p, h.e.timestamp));
      errors.push(playerError(p, {
        ruleId: TYRANT_STAMPEDE_RULE_ID, severity: death || dd ? "Major" : "Minor", name: "Hit by Atomic Impact",
        description: `Hit by a fire carrier's Atomic Impact (${g.length > 1 ? `${g.length} hits, ` : ""}${kFmt(g.reduce((s, h) => s + realAmount(h.e), 0))})${carriers.size ? `; the carriers were ${namesOf([...carriers])}` : ""}.${death ? " They died." : dd ? " They got Damage Down." : ""} The two marked players run their own routes along the walls; everyone else keeps away from them.`,
        timestamp: t, abilityId: ATOMIC_IMPACT, abilityName: "Atomic Impact",
      }));
    }
  }
  // Lava left by Atomic Impact (Burns): healable, Minor unless it killed.
  for (const p of players) {
    const spans = BURNS.flatMap((id) => debuffIntervals(p, id)).filter((w) => life.hitAlive(p, w.start)).sort((a, b) => a.start - b.start);
    for (const ep of clusterByGap(spans, (w) => w.start, 1500)) {
      const start = ep[0].start, end = Math.max(...ep.map((w) => w.end));
      const death = deaths.find((d) => d.player === p.name && d.timestamp - DEATH_EVENT_LAG_MS >= start - 500 && d.timestamp - DEATH_EVENT_LAG_MS <= end + 1000);
      if (death && called.has(death)) continue;
      // Only a death to the Burns ticks themselves is the lava's doing.
      const burned = death && BURNS.includes(death.killingAbilityGameId);
      errors.push(playerError(p, {
        ruleId: TYRANT_STAMPEDE_RULE_ID, severity: burned ? "Major" : "Minor", name: "Stood in Lava",
        description: `${carriers.has(p) ? "Stood in their own Atomic Impact lava" : "Walked into the lava Atomic Impact leaves behind"} and took Burns (${sec(Math.min(end, start + 60_000) - start)}s). The lava stays through the towers and tethers; ${carriers.has(p) ? "keep moving along your route so the puddles land behind you" : "route around it"}.${burned ? " They died to the burn." : death ? " They died while burning." : ""}`,
        timestamp: start, abilityId: BURNS[0], abilityName: "Burns",
      }));
    }
  }
  // Mammoth Meteor hits everyone by distance; only a lethal hit is an error
  // (clean max ~75k in the kill; the two deaths took 133k+, C13 +9:06).
  for (const h of hitsOf(players, life, MAMMOTH_METEOR)) {
    if (life.diedFrom(h.p, h.e.timestamp)?.killingAbilityGameId !== MAMMOTH_METEOR) continue;
    errors.push(playerError(h.p, {
      ruleId: TYRANT_STAMPEDE_RULE_ID, severity: "Major", name: "Too Close to Mammoth Meteor",
      description: `Killed by Mammoth Meteor (${kFmt(realAmount(h.e))}). It hits harder the closer you are to where it lands in its corner; start the Stampede far from both meteors.`,
      timestamp: h.e.timestamp, abilityId: MAMMOTH_METEOR, abilityName: "Mammoth Meteor",
    }));
  }
  return errors;
}

// ── deaths with no killing blow: falls ──────────────────────────────────────

/** No-killing-blow deaths that are the wipe being called, not mistakes. */
function calledWipeDeaths(deaths: DeathEvent[], pullEnd: number): Set<DeathEvent> {
  const silent = deaths.filter((d) => !d.killingAbilityGameId);
  const out = new Set<DeathEvent>();
  for (const d of silent) {
    if (pullEnd - d.timestamp <= CALLED_WIPE_END_MS) out.add(d);
    const near = silent.filter((x) => Math.abs(x.timestamp - d.timestamp) <= CALLED_WIPE_WINDOW);
    if (near.length >= CALLED_WIPE_COUNT) near.forEach((x) => out.add(x));
  }
  return out;
}

function detectFalls(players: PlayerInfo[], deaths: DeathEvent[], called: Set<DeathEvent>): PullError[] {
  const errors: PullError[] = [];
  for (const d of deaths) {
    if (d.killingAbilityGameId || called.has(d)) continue;
    const p = players.find((x) => x.name === d.player);
    if (!p) continue;
    const hitT = d.timestamp - DEATH_EVENT_LAG_MS;
    // Living Dead's Walking Dead ran its full 10s without the tank being
    // healed back up: the healing, not a fall.
    const wd = debuffIntervals(p, WALKING_DEAD).find((w) => Math.abs(w.end - hitT) <= 500 && w.end - w.start >= WALKING_DEAD_FULL_MS);
    if (wd) {
      errors.push(playerlessMinor(TYRANT_FALL_RULE_ID, "Walking Dead Ran Out",
        `${p.name}'s Walking Dead (from Living Dead) expired before they were healed back to full, and they died. The healers have to heal the Walking Dead tank to full within its 10s.`,
        wd.end, WALKING_DEAD, "Walking Dead"));
      continue;
    }
    const kb = p.damageTaken.filter((e) => KNOCKBACKS[e.abilityId] && e.timestamp <= d.timestamp && e.timestamp >= d.timestamp - FALL_KNOCKBACK_MS).pop();
    errors.push(playerError(p, {
      ruleId: TYRANT_FALL_RULE_ID, severity: "Major", name: kb ? "Knocked Off the Edge" : "Fell Off the Edge",
      description: kb
        ? `Knocked off the edge by ${KNOCKBACKS[kb.abilityId]} (${sec(d.timestamp - kb.timestamp)}s before the death). Stand so the knockback carries you onto your island, not past its edge.`
        : "Died with no killing blow mid-pull: fell off the edge of the arena or an island.",
      timestamp: kb ? kb.timestamp : hitT, abilityId: kb?.abilityId ?? 0, abilityName: kb ? KNOCKBACKS[kb.abilityId] : "Fall",
    }));
  }
  return errors;
}

// ── entry point ─────────────────────────────────────────────────────────────

/**
 * The Tyrant (M11S) errors. Self-gates on the boss's signature casts, which
 * no other fight in the sample set uses.
 */
export function detectTyrantErrors(players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[]): PullError[] {
  if (!enemyCasts.some((c) => SIGNATURE.includes(c.abilityId))) return [];
  const life = buildLife(players, deathEvents);
  const pullEnd = Math.max(0, ...players.flatMap((p) => [...p.damageTaken, ...p.casts].map((e) => e.timestamp)), ...deathEvents.map((d) => d.timestamp));
  const called = calledWipeDeaths(deathEvents, pullEnd);
  const carriers = atomicCarriers(players, enemyCasts);
  const slots = resolveSlots(players, life, enemyCasts);

  const errors = [
    ...detectAvoidable(players, life),
    ...detectPersonalOverlaps(players, life, enemyCasts, slots),
    ...detectStacks(players, life, enemyCasts, carriers, slots),
    ...detectFireballFronts(players, life),
    ...detectBusters(players, life, enemyCasts, slots),
    ...detectMeteorain(players, life),
    ...detectTowers(players, life, enemyCasts, deathEvents, carriers),
    ...detectStampede(players, life, deathEvents, called, carriers),
    ...detectFalls(players, deathEvents, called),
  ];

  const firstRaid = () => Math.min(...errors.filter((e) => e.severity === "Raid").map((e) => e.timestamp));
  const enrage = castsOf(enemyCasts, HEARTBREAKER)[0];
  if (enrage && enrage.timestamp < firstRaid()) {
    const left = enrage.hitPoints !== undefined && enrage.maxHitPoints
      ? ` ${enrage.actorName} still had ${(100 * enrage.hitPoints / enrage.maxHitPoints).toFixed(1)}% HP left.` : "";
    errors.push(raidMarker(TYRANT_ENRAGE_RULE_ID, "Heartbreaker (Enrage)",
      `Heartbreaker, the hard enrage, went off. The DPS check wasn't met.${left}`,
      enrage.timestamp, enrage.abilityId, "Heartbreaker"));
  }
  // A called wipe: several no-killing-blow deaths together, before any
  // mechanic cutoff.
  const calledList = deathEvents.filter((d) => called.has(d)).sort((a, b) => a.timestamp - b.timestamp);
  if (calledList.length >= CALLED_WIPE_COUNT && calledList[0].timestamp - DEATH_EVENT_LAG_MS < firstRaid()) {
    errors.push(raidMarker(TYRANT_CALLED_WIPE_RULE_ID, "Wipe Called",
      `${calledList.length} players died with no killing blow at the end of the pull (${joinNames(uniq(calledList.map((d) => d.player)))}): the wipe was called and the raid reset off the edge.`,
      calledList[0].timestamp - DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  // Pull-over marker: 5 dead at once with the pull ending soon after.
  const outAt = (t: number) => players.filter((p) => !life.alive(p, t));
  const collapseT = life.outIntervals.map((w) => w.start).sort((a, b) => a - b)
    .find((t) => outAt(t).length >= COLLAPSE_DEAD_COUNT && pullEnd - t <= COLLAPSE_END_MS);
  if (collapseT !== undefined && collapseT + DEATH_EVENT_LAG_MS < firstRaid()) {
    const who = outAt(collapseT).map((p) => p.name);
    errors.push(raidMarker(TYRANT_COLLAPSE_RULE_ID, "Party Collapse",
      `${who.length} players were dead at once (${joinNames(who)}). Treated as the cutoff point.`,
      collapseT + DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
