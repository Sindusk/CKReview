// lib/mechanics/ffxiv/arcadion/tyrant.ts
//
// -- GUIDE-DERIVED MODEL: THE TYRANT (M11S) --
// AAC Heavyweight M3 (Savage), Arcadion, patch 7.4; Savage only.
// Research stage, checked 2026-10-08. Comments only; no detector registered.
// No report supplied or analyzed. ALL log signals below are hypotheses,
// including lethal failures; none are observed-log findings.
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
