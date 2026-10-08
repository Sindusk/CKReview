// lib/mechanics/ffxiv/arcadion/vamp-fatale.ts
//
// Vamp Fatale (M9S) per-pull rules. Entry point: detectVampFataleErrors.
// Self-gates on Killer Voice / Vamp Stomp, so it is safe on every pull.
//
// -- VERIFIED AGAINST LOGS (2026-10-08) --
// Report jN3XDrf2z8PmLgRJ: 13 pulls, kill = P8 (586.9s). P1-P8 are one
// roster, P9-P13 a second one (alts) running the same Toxic/Hector plan.
// Cited as P<n> +<seconds from pull start>. No VOD review yet.
//
// Clock (identical every pull, +/-0.3s; the model's order is wrong after
// Aetherletting): Killer Voice +11, Hardcore +21.7, Stomp #1 +30.5 (cleanses
// +35..+41), Rain +48 (3 hits), Screech +61, Coffinmaker +68..+125 (Half
// Moon/Coffinfiller pairs +76/+79, +94/+97, +111/+114, +121/+124), Screech
// +138, Crowd Kill +148, Finale +172, Aetherletting +191 (drops +194/+196/
// +198/+200, lines +208/+210/+212/+214), Hardcore +221.7, Stomp #2 +230.6,
// Rain +258 (4 hits), Thirst +269, Screech +284, Plummet towers +297/+315/
// +334, Killer Voice +306/+325, Barbed Burst deadline +350, Screech +357,
// Crowd Kill +367, Finale +390, Hell in a Cell +401/+423 (Spread/Amp +410/
// +417, +432/+439), Undead Deathmatch +454 (towers +455), Scratch +462..+493,
// Rain +500 (6 hits), Stomp #3 +512, Hardcore +539 (always enlarged), Thirst
// +569, Crowd Kill +581; enrage Finale Fatale +605 (P6). The Coffinmaker
// section is timed (Dead Wake at fixed times), not kill-dependent.
//
// Log IDs (model candidates mostly confirmed; corrections in brackets):
// - Bombpyre player aura 1004729. Own explosion = Blast Beat 45942 (boss
//   source), landing 0.5-0.6s after the carrier's Bombpyre removal; bats =
//   Blast Beat 45941 (Vampette Fatale), Damage Down + Magic Vuln.
// - Hardcore 45951 normal / 45952 enlarged; casts target the two busters.
// - Brutal Rain cast 45917, hits 45955 (3 / 4 / 6 per occurrence: the TL
//   count was right). Each hit lands on every living player.
// - Coffinfiller 45928/45929/45930 and Half Moon 45943-45950 hits all hand
//   out Damage Down. Dead Wake does no logged damage.
// - Aetherletting: 45969 = rotating cones; 45970 = each marked player's own
//   drop (expected damage); 45971 = the puddle's delayed plus/X line (cast
//   at the puddle's position); [45972 = the puddle-OVERLAP penalty, cast
//   repeatedly at the touching puddles' positions and hitting everyone].
// - Plummet 45963 (one cast per tower, targets the soaker), Massive Impact
//   45964 + Sustained Damage 1004149 when a tower is empty; Barbed Burst
//   45965 cast = a Flail survived; Deadly Doornail death-explosion 45966.
//   Saws: Gravegrazer 45931/45932 + Flesh Wound 1002942 DoT; Doornail
//   puddle: Electrocution 1003073 -> 1003074 DoT. Neither gives Damage Down.
// - Hell in a Cell 45973; soakers take Bloody Bondage 45974 and Hell in a
//   Cell 1004731-1004738; an empty tower = Unmitigated Explosion 45975 +
//   Sustained Damage. Spread: tank cone 47235, healer/DPS cones 45982; Amp
//   45983. Naughty Knot 45976 hits an inmate (Damage Down). Cell enrage =
//   Last Lash 46855 (begun 5x, finished once: P4).
// - Undead Deathmatch 45984; towers Bloody Bondage 45985 (8 soakers when
//   all live); chain Explosion 45987 (Damage Down, repeats ~3s while a
//   chain stays bad); Sanguine Scratch 45989/45991; Breakdown Drop 45992/
//   45994 and Breakwing Beat 45993/45995 (bat circle/donut).
// - Enrage: Finale Fatale 45934 cast / 45937 hits (P6 +605).
//
// Toxic/Hector positions hold exactly in the log (every clean Stomp and
// drop in P8 within ~15 degrees): Stomp clock MT N, OT S, M1 W, M2 E, H1 SW,
// H2 SE, R1 NW, R2 NE; drops at the wall (18.3-19.6y) MT NNW, R2 NNE, H2
// ENE, M2 ESE, OT SSE, M1 SSW, H1 WSW, R1 WNW. Cells: G1 (MT/H1/M1/R1)
// soaked the first set in every pull. H1 = Astrologian, H2 = Sage, R1 =
// physical ranged, R2 = caster held in both rosters, so roles.ts's job
// convention supplies those slots; tanks and melee are paired by where they
// stood (resolveSlots).
//
// Failure findings:
// - Stomp: a bat hit's Magic Vuln makes the carrier's own explosion lethal
//   a second later (P1/P2/P4/P6/P7/P8 deaths). Overlaps: P3 +37.9 the OT
//   cleansed NNE at 4.4y (164 degrees off S), killing the MT and M2; P1
//   +238 the same (killing the MT); P13 +36.7 the OT's explosion ESE
//   killed the M2.
// - Aetherletting overlap ended P2 (OT dropped 11y off SSE, onto M2's
//   puddle), P10 (MT dropped N, 8y off NNW) and P13 (whole group dropped
//   near the center). Lines: the stack under the boss was hit in P3/P11/
//   P12 (victims 0.1-0.6y from the boss); everyone else hit stood 1.4-16y
//   out.
// - Hardcore: P1/P11's second Hardcore was already ENLARGED (earlier deaths
//   pushed Satisfied to 8) and caught 4-5 of the party: both wipes. The
//   kill's third Hardcore is enlarged by schedule and clean. P5/P6's third
//   went to a non-tank after the OT died (fallout).
// - Rain: the third Rain (6 hits) killed 3-4 with 7-8 sharing in P5/P7 (a
//   healing check; the kill survived it with 7). P6's H2 skipped it alive.
// - Plummet: P3 +315.6 the OT's tower went empty (Massive Impact); P3 lived
//   on. Barbed Burst completed in P7, P8 (the kill) and P12, so it's Minor.
//   P12's Doornail exploded (+357.4) and killed 6.
// - Saw/puddle contact happened 4x even in the kill; deaths with the DoT
//   ticking: P4 (x4), P5, P7, P12, and P3/P6's M1 finished by Killer
//   Voice at +327.
// - Cells: empty towers P3 (M1, set 1), P5 (R2, set 2), P9. P3 +432 the MT
//   aimed the tank cone into two inmates (both died). P4 M2 died to Last
//   Lash. Deathmatch: P4 (M1 + H2) and P6 (both healers) skipped the towers
//   alive and an under-soaked tower killed someone.
// - Collapse: 5 dead (net of raises) ended every pull within 42s; 4 dead
//   was survived 87s (P6), so the marker is 5 plus "ended within 45s".
//
// Cutoff per pull (first Raid error): P1 Hardcore party +221.4, P2 overlap
// +198.5, P3 cell tower +402.0, P4 collapse +483.5, P5 cell tower +424.6,
// P6 enrage +604.9, P7 Rain +505.5, P8 kill (none), P9 cell tower +401.8,
// P10 overlap
// +200.2, P11 Hardcore party +221.1, P12 Doornail +357.4, P13 overlap
// +200.1. No wipe is unexplained.
//
// -- RULES IMPLEMENTED --
// ffxiv-vf-avoidable (Major): Coffinfiller, Half Moon, Pulping Pulse,
//   Aetherletting cone, Naughty Knot, chain Explosion, Sanguine Scratch,
//   Breakdown Drop, Breakwing Beat. One error per resolution (3s; chain
//   Explosions 8s).
// ffxiv-vf-stomp-bat (Major); ffxiv-vf-stomp-overlap (Major: whoever of
//   carrier/victim is further (45+ degrees) off their clock spot; both if
//   neither is).
// ffxiv-vf-hardcore (Major, non-tank hit with both tanks alive and not
//   dead in the last 30s); ffxiv-vf-hardcore-party (Raid, 3+ non-tanks;
//   names nobody, per the user).
// ffxiv-vf-rain-missed (Major); ffxiv-vf-rain-wipe (Raid, 3+ Rain deaths).
// ffxiv-vf-aetherletting-overlap (Major on the latest drop furthest from
//   its spot + Raid); -cross (Major on the puddle owner when a victim was
//   within 1y of the boss, else on the victim); -clip (Major on whichever
//   of dropper/victim is further from their spot).
// ffxiv-vf-saw (Minor: avoidable but no Damage Down, healable; Major when
//   the player died with the DoT on).
// ffxiv-vf-flail-tower (Major on the living tank who soaked no Plummet);
//   ffxiv-vf-barbed-burst (player-less Minor; Raid if 3+ died);
//   ffxiv-vf-doornail (Raid).
// ffxiv-vf-cell-tower (Major on living set-group members who didn't soak,
//   then a Raid cutoff: a missed cell tower ends the pull, per the user);
//   ffxiv-vf-cell-cone (Major on the outside tank whose cone hit an inmate
//   or another outside player: the tank's spot aims it; Amp/45982 on an
//   inmate is player-less Minor); ffxiv-vf-last-lash (Major on the inmate).
// ffxiv-vf-deathmatch-tower (Major on living non-soakers).
// ffxiv-vf-enrage, ffxiv-vf-collapse (Raid, only before any other Raid).
// Their Damage Down causes are excluded from ffxiv-damage-down
// (error-rules.ts), so a hit is one error.
//
// -- GUIDE-DERIVED MODEL: VAMP FATALE (M9S) --
// AAC Heavyweight M1 (Savage), Arcadion, patch 7.4; Savage only.
// Research stage, checked 2026-10-08. Written before any report was
// analyzed; VERIFIED AGAINST LOGS above wins every disagreement.
// The user's reference plan is Toxic/Hector, not an inferred party strategy.
//
// -- SOURCES AND CONFIDENCE --
// [TF] User-selected WTFDIG Toxic/Hector, all eight role selectors and
//      Aetherletting/cell diagrams inspected in the browser:
//      https://wtfdig.info/74/m9s#toxic
//      Original diagrams: https://raidplan.io/plan/c2L5iJfuYIWXk1v7
// [IV] Lyra's guide, updated 2026-01-12 (overall sequence/raid damage):
//      https://www.icy-veins.com/ffxiv/aac-heavyweight-m1-savage-raid-guide
// [K1] Coffinmaker and Bombpyre explanation:
//      https://kitten-erp-guides.moe/savage/m9s/screech_1
// [KA] Aetherletting targets and placement:
//      https://kitten-erp-guides.moe/savage/m9s/aetherletting
// [K2] Saws and three add waves:
//      https://kitten-erp-guides.moe/savage/m9s/screech_2
// [KC] Cells and outside cones (JP priority differs from TF):
//      https://kitten-erp-guides.moe/savage/m9s/hell_in_a_cell
// [KU] Bat chains, tower splits and movement:
//      https://kitten-erp-guides.moe/savage/m9s/undead_deathmatch
// [TL] A'rhaeda Vhil's timeline, updated 2026-01-31; approximate resolutions:
//      https://thaliak.com/raids/m9s/
// [ID] Splatoon encounter presets (candidate game IDs/geometry, NOT FFLogs):
//      https://github.com/PunishXIV/Splatoon/blob/main/Presets/Dawntrail/Raids/The%20Arcadion%209%20Savage.md
// No confirmed mechanic-changing hotfix was established by these sources.
// Patch-7.4 counts/timers remain provisional for later-patch reports.
//
// -- SEVERITY, ATTRIBUTION AND LOG VOCABULARY --
// README's FFXIV exception applies: attributable avoidable hits/Damage Down
// are Major even if survived. Major always names the root-cause player.
// Raid means the pull is unresolvable; it may be player-less. An ambiguous
// failure is player-less Minor unless its outcome warrants a Raid cutoff.
// Receiving another player's misplaced attack does not prove victim fault.
// Death-driven retargets/redistributed soaks are fallout, not new mistakes.
// Candidate action IDs below mean begincast/cast, not damage IDs. Status
// 4729 is a game status; its candidate FFLogs player-aura ID is 1004729.
// Other cast, damage, periodic, boss-aura and penalty IDs are unknown unless
// stated. Damage Down/Magic Vulnerability Up names alone are not mechanics.
// Positions are victim positions; markers, chains and glowing blades may
// have no event in the application's current FFLogs capture.
//
// -- SHAPE, CLOCK AND ASSIGNMENTS --
// One boss, two weapon sections; no guide-established boss-HP transitions.
// Square arena -> narrow weapon arena -> circle -> narrow weapon arena ->
// circle -> square for finish. Removed floor/edges can cause fatal falls.
// [TL] Reference resolution times, mm:ss from pull, NOT cast-start times:
//   0:10 Killer Voice, 0:21 Hardcore, 0:31 Stomp, 0:46 Rain, 1:01 Screech.
//   1:08 Coffinmaker appears; advance 1:08/1:26/1:43, final advance 2:13.
//   Reference Coffinmaker death C=2:13; killing it restores targetability.
//   2:33 Crowd Kill, 2:52 Finale, 3:10 Aetherletting, 3:40 Hardcore,
//   3:51 Stomp, 4:07 Half Moon, 4:16 Rain, 4:31 Thirst, 4:44 Screech.
//   Add/tower waves 4:57/5:15/5:33; return Screech 5:57, Crowd Kill 6:11,
//   Finale 6:30, Cells 6:40/7:02, Deathmatch 7:33, Scratch 7:40/7:59,
//   Rain 8:18, Stomp 8:32, Half Moon 8:48, Hardcore 8:58, Scratch 9:10,
//   Thirst 9:31, final Crowd Kill 9:46, enrage Finale 10:05.
// C is kill-dependent; reference offsets after C are not a proven fixed
// pull clock. The two add sections' timing dependencies need verification.
// [TF] G1=MT/H1/M1/R1; G2=OT/H2/M2/R2; roster-to-slot mapping unsupplied.
// Stomp clocks: MT N, OT S, M1 W, M2 E, H1 SW, H2 SE, R1 NW, R2 NE.
// Static Aetherletting drops: MT NNW, R2 NNE, H2 ENE, M2 ESE, OT SSE,
// M1 SSW, H1 WSW, R1 WNW. These are separate mechanic-specific positions.
// Cells: G1 first, G2 second; towers clockwise from N in T-H-M-R order.
// Deathmatch: four G1 players N/W, four G2 players S/E.
//
// -- SATISFIED / CROWD KILL [IV, KC] --
// What happens: boss aura Satisfied starts at zero. Mistakes/deaths raise
// it; the first two Crowd Kills add four each, so >=8 is normal late fight.
// At >=8, Hardcore circles and Half Moon cleaves enlarge. Boss damage also
// rises. KC reports a 16-stack cap; exact gain triggers/multiplier unknown.
// Correct play: execute mechanics cleanly, anticipate the enlarged attacks.
// Failure: early stack gain -> LOG SIGNAL: boss aura stack increase beside
// avoidable hit/death; FAULT: original mistake, not every raid-damage victim;
// CONSEQUENCE: Major if attributable, not automatically an inevitable wipe.
// Removal: no guide-established player method to reduce Satisfied.
// Not errors: scheduled +4 gains and enlarged attacks after Crowd Kill #2.
// Final Crowd Kill's More than Satisfied is the enrage state [TL].
//
// -- KILLER VOICE / SCREECH / THIRST / FINALE / PULPING PULSE [IV] --
// What happens: Killer Voice, Sadistic Screech, Insatiable Thirst, Crowd Kill
// and early Finale Fatale are intended raid damage. Screech changes the
// arena; Finale makes a circle, Thirst restores the square. Pulping Pulse
// is the separate ground-circle hazard around later sequences [TL].
// Correct play: heal/mitigate pulses and stay on surviving floor; dodge
// ground circles. Finale's final enrage use is different from earlier uses.
// Failure: ground hit -> LOG SIGNAL: Pulping Pulse damage + Damage Down;
// FAULT: standing player absent a forced-movement cause; CONSEQUENCE: Major.
// Failure: fall -> LOG SIGNAL: death may lack a killing ability; FAULT:
// uncertain without current arena/position evidence; CONSEQUENCE: Major
// only if attributable, Raid only if the remaining mechanic is unresolvable.
// Removal: no personal resolution aura established; penalty expiry/death
// does not prove a mechanic was corrected. Not errors: raidwide hits.
//
// -- HARDCORE [IV] --
// What happens: AoE tankbusters on the top TWO enmity targets, not a shared
// tank stack. At >=8 Satisfied, tanks need much more separation from party.
// Correct play: both tanks hold top enmity and isolate/mitigate their hits.
// Failure: overlap -> LOG SIGNAL: Hardcore hits unintended players or both
// busters hit one tank; FAULT: misplaced tank/party member only if position
// evidence distinguishes them; CONSEQUENCE: Major, Raid if unrecoverable.
// Failure: wrong enmity -> LOG SIGNAL: non-tank targeted; FAULT: tank duty
// requires enmity evidence, not simply the killed DPS; CONSEQUENCE: Major
// if attributable. Removal: no swap debuff established by the guides.
// Not errors: both intended tank hits; invulnerability use is not a failure.
//
// -- VAMP STOMP / CURSE OF THE BOMBPYRE / BLAST BEAT [K1, TL] --
// Candidate player aura: Curse of the Bombpyre 4729 / FFLogs 1004729 [ID].
// What happens: THREE Stomps per full fight. Initial center circle, orbiting
// bats, expanding ring; eight players receive Bombpyre. Ring contact clears
// it and causes a personal explosion. Bats explode at ring contact too.
// Correct play: avoid initial circle, spread, cleanse without overlaps.
// TF clocks above; melee/tanks can resolve earlier than healers/ranged.
// Failure: bat contact -> LOG SIGNAL: bat Blast Beat damage + Damage Down;
// FAULT: hit player unless another mechanic forced it; CONSEQUENCE: Major.
// Failure: player explosions overlap -> LOG SIGNAL: extra Blast Beat hits
// around Bombpyre removals, possibly fatal under Magic Vulnerability Up;
// FAULT: overlapping carriers, not necessarily the victim; CONSEQUENCE:
// Major if geometry/ownership supports it; Raid only on unrecoverable loss.
// Removal: ring contact consumes Bombpyre; re-entering after cleanse does
// not create another personal explosion. Death/expiry effects unestablished.
// Not errors: own cleanse explosion and its brief Magic Vulnerability Up;
// a clean self-hit is fundamentally different from another bomb's hit.
//
// -- BRUTAL RAIN [IV; COUNT DISPUTED BY TL] --
// What happens: repeated shared stack on a healer; initial set has 3 hits.
// TL lists 3/4/5 across the three occurrences; IV/K1 link count to Satisfied.
// Correct play: live party shares successive hits, healing between them.
// Failure: inadequate stack -> LOG SIGNAL: reduced recipient count and
// lethal Rain damage; FAULT: absent living assigned soaker or misplaced
// marker holder only with evidence; CONSEQUENCE: Major, or player-less
// Raid if the party cannot continue. Reduced count after a death is fallout.
// Removal: resolves through the full volley; no cleanse aura established.
// Not errors: every intended stack hit; extra hits alone prove no mistake.
//
// -- COFFINMAKER / COFFINFILLER / DEAD WAKE / HALF MOON [K1] --
// Candidate casts [ID]: Coffinfiller 45928/45929/45930; Half Moon normal
// 45943/45944/45947/45948, enlarged 45945/45946/45949/45950.
// What happens: Screech #1 removes side floor; boss untargetable while ONE
// Coffinmaker advances down the lane. Two glowing blades attack, then the
// other pair; boss simultaneously cleaves alternating halves. Late cleaves
// come from the south. Final Dead Wake exhausts the floor if add lives.
// Correct play: damage add, dodge both blade/cleave patterns, stay ahead of
// its advancing row. Dodge remaining Half Moons even after the add dies.
// Failure: blade/cleave hit -> LOG SIGNAL: Coffinfiller/Half Moon damage,
// usually Damage Down; FAULT: hit player; CONSEQUENCE: Major.
// Failure: advance contact -> LOG SIGNAL: Dead Wake damage/knockback or
// fall death; FAULT: hit player if not already wipe fallout; CONSEQUENCE:
// Major. Final advance with add alive -> Raid, no individual DPS blame.
// Removal: add death ends weapon section, not an already-running cleave.
// Not errors: targeting the add, boss downtime, intended return Screech.
// Standalone Half Moon uses the same two-cleave dodge later in the fight.
//
// -- AETHERLETTING [KA, TF] --
// Candidate casts [ID]: rotating cones 45967/45969, cross/plus 45971;
// matching spread damage/mark and helper IDs remain unmapped.
// What happens: rotating cones plus FOUR pairs of marked drops (eight
// players, one support + one DPS per pair per KA). ~5s marker-to-drop.
// Each drop leaves a plus/X explosion; all eight eventually resolve.
// Correct play: TF's static drop map above; place near wall between slices,
// dodge cones locally, then stack exactly center for the delayed lines.
// Failure: cone hit -> LOG SIGNAL: cone damage/penalty; FAULT: hit player;
// CONSEQUENCE: Major. Failure: bad drop -> LOG SIGNAL: drop position then
// delayed cross/plus hits through intended safe center; FAULT: drop owner
// only if marker/drop/source link proves it; CONSEQUENCE: Major, Raid if
// outcome is unresolvable. Failure: clipped spread -> LOG SIGNAL: multiple
// victims on one marked drop; FAULT: carrier vs bystander needs geometry;
// CONSEQUENCE: Major if attributable. Removal: marks consumed by drops;
// mark death/expiry and whether dropped objects persist are unestablished.
// Not errors: a carrier's intended drop damage; plus vs X is random.
//
// -- PLUMMET / FATAL FLAIL / DEADLY DOORNAIL / SAWS [K2, TL] --
// What happens: Screech #2; two large and two small moving saws, THREE waves
// of two towers + one Doornail: SIX Flails, THREE Doornails total. Each
// soaked tower spawns a Flail. Barbed Burst has a ~16s kill deadline.
// Doornail creates an expanding puddle; leftover nail at return Screech
// can detonate per K2 (exact damage name unconfirmed). No revival described.
// Correct play: TF MT north/OT south; tanks hit Flails, others focus nail,
// melee switch when puddle blocks access. Help Flails before their deadline.
// Failure: empty tower -> LOG SIGNAL: Massive Impact/Sustained Damage;
// FAULT: assigned living tank only if tower identity/position is known;
// CONSEQUENCE: Major if attributable, Raid only if unresolvable.
// Failure: Flail survives -> LOG SIGNAL: completed Barbed Burst and raid
// Damage Down; FAULT: collective kill failure, not every penalty recipient;
// CONSEQUENCE: player-less Minor or Raid according to actual survivability.
// Failure: saw/puddle contact -> LOG SIGNAL: Gravegrazer/Flesh Wound or
// Electrocution application/ticks; FAULT: contacting player if avoidable;
// CONSEQUENCE: Major. Removal: hazard DoTs' expiry/dispel rules unknown;
// add death removes its hazard, with any on-death effect still unverified.
// Not errors: correct Plummet soak damage; unavoidable Killer Voice.
//
// -- HELL IN A CELL / BLOODY BONDAGE / CHARNEL CELL [KC] --
// What happens: TWO sets of FOUR single-player towers. Soak creates own
// Charnel Cell; only inmate can damage it. Hell in a Cell restrains player;
// Hell Awaits is a repeat-soak lockout. Blood Lash is expected inmate damage;
// Heel of the Cell is the cell's aura [TL]; no guide-proven escape deadline.
// Correct play: TF G1 then G2, T-H-M-R clockwise from north; kill own cell.
// Failure: missing/invalid soak -> LOG SIGNAL: incomplete inmate/soak set
// plus tower penalty (name unknown); FAULT: assigned player only with tower
// mapping; CONSEQUENCE: Major if attributable, Raid if unresolvable.
// Failure: failed escape -> LOG SIGNAL: cell remains/inmate restraint and
// sustained Blood Lash; FAULT: inmate only after a verified deadline and
// adequate survival evidence; CONSEQUENCE: Major, Raid if unresolvable.
// Removal: cell death frees inmate; Hell Awaits outlasts release. Death,
// expiry and duplicate-soak consequences not established by these sources.
// Not errors: imprisonment, lockout, Blood Lash, no outside cell damage.
//
// -- ULTRASONIC AMP / ULTRASONIC SPREAD [KC, TF] --
// Candidate casts [ID]: Spread 45980, Amp 45981; hit IDs unknown.
// What happens: both casts each cell set, random order; only four outside
// players resolve them. Amp is a wide shared cone; Spread has THREE role
// cones, tank/healer/DPS. DPS pair belongs together, not individual spreads.
// Correct play: wide gap for tank/Amp, healer CW gap, both DPS CCW gap;
// keep every cone off inmates. Swap outside/inside groups for second set.
// Failure: cone clips inmate/other role -> LOG SIGNAL: wrong-role/inmate
// ultrasonic damage; FAULT: mis-aimed target or misplaced outside player,
// never inmate merely for being hit; CONSEQUENCE: Major, possibly Raid.
// Failure: undershared Amp -> LOG SIGNAL: too few outside recipients/lethal
// share; FAULT: missing living soaker vs bad aim requires position evidence;
// CONSEQUENCE: Major if attributable. Removal: snapshot hits, no resolution
// aura established. Not errors: proper role hits, shared DPS cone, tank mit.
//
// -- UNDEAD DEATHMATCH / BAT CHAINS / SANGUINE SCRATCH [KU] --
// Candidate bat casts [ID]: Breakdown Drop 45994, Breakwing Beat 45995.
// What happens: TWO four-player towers spawn one bat each. G1 N/W, G2 S/E.
// Four chains per bat; a 5/3 split can assign an opposite-side chain. Bats
// rotate CW/CCW while Scratch alternates cones. After each half-circle,
// circle/donut resolves; TWO movement legs, possible direction change.
// Correct play: stay close to own bat, move through cone safes, stand near
// bat for donut or nearer boss for circle. Last Scratch repeats without bats.
// Failure: wrong split -> LOG SIGNAL: wrong-side chain + immediate Explosion
// damage/Damage Down [TL]; FAULT: wrong assigned tower occupant, not an
// arbitrary tether victim; CONSEQUENCE: Major if mapping proves it.
// Failure: overstretch -> LOG SIGNAL: Explosion/penalty mid-leg; FAULT: chain
// holder only after normal attachment established; CONSEQUENCE: Major.
// Failure: bat AoE/Scratch hit -> LOG SIGNAL: Breakdown Drop/Breakwing Beat/
// Sanguine Scratch damage/penalty; FAULT: hit player if not chain fallout;
// CONSEQUENCE: Major. Removal: chains end after sequence; death/retarget
// semantics unestablished. Not errors: tower damage; following either turn.
//
// -- PULL END, VARIANTS AND NOT-ERROR SUMMARY --
// Hard enrage: final Crowd Kill -> More than Satisfied -> Finale Fatale,
// ~10:05 reference [IV, TL]. Earlier Finale casts are survivable raidwides.
// Weapon DPS failures: final Coffinmaker advance; unhandled Flail Bursts;
// surviving nails/blocked tower access. Cells and chains can become
// unresolvable through role loss; one death alone is not a proven cutoff.
// Satisfied is escalating pressure, not a demonstrated fixed-stack wipe.
// Falls and deliberate reset deaths may lack killing abilities; called-wipe
// context cannot be recovered reliably from that absence alone.
// Variants: rotating role drops vs static Aetherletting; JP snake cell
// priority T-M-R-H vs TF T-H-M-R CW; Stomp cleanse timing/uptime plans;
// add-focus splits and emergency non-tank tower rescue. Strategy != error.
// TF role-selector text contains stale partner/tank labels for G1's outside
// turn; shared diagram means CURRENT outside tank/healer/DPS, not G2 forever.
// Expected costs: Bombpyre self-cleanse/vuln, marked drops, tank/stack/tower
// hits, Blood Lash and all intended raidwides. Missing events are not proof
// of missed jobs; Damage Down from a raid penalty does not blame its victims.
//
// -- OPEN QUESTIONS FOR LOG VERIFICATION --
// 1. Actual cast/damage/aura/penalty IDs per stream, including source actors;
//    which same-name Bloody Bondage/Blast Beat IDs distinguish their uses?
// 2. Exact Satisfied triggers, cap/multiplier/removal, Damage Down duration
//    and magnitude; Rain count vs occurrence, stack level or both?
// 3. Timing after early Coffinmaker kills and weapon-section completion;
//    true hard-enrage clock; Scratch volley count/cadence per occurrence?
// 4. Stomp bat counts/radii, vuln duration, self vs collateral damage IDs;
//    Bombpyre death/expiry behavior; does death cause early detonation?
// 5. Hardcore and enlarged Half Moon geometry; Amp target and split formula;
//    enmity/role retargets with dead players and exact DPS-cone sharing?
// 6. Aetherletting actual pair selection, spread radius/delay, object source
//    ownership, line geometry and marker death/expiry behavior?
// 7. Tower miss/re-soak penalties, cell/lockout durations, inmate death and
//    cell persistence; nail terminal spell; DoT removals/on-death effects?
// 8. Chains available in captured events? Range threshold, nearest-player
//    selection, death reassignment and circle/donut radii? Which failures
//    are salvageable in practice, versus a justified Raid cutoff?
// 9. Real roster-to-MT/OT/H1/H2/M1/M2/R1/R2 assignments and assignment
//    changes across pulls; positions/visual objects absent from the log?

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import { angularDistance, compassBearingOf, distanceFromCenter } from "@/lib/mechanics/geometry";
import { detectFFRoles, type FFRoleSlot } from "@/lib/mechanics/ffxiv/roles";
import {
  yd, kFmt, joinNames, playerError, playerlessMinor, raidMarker, rezzedAt, clusterByGap, debuffIntervals,
} from "@/lib/mechanics/wow/common";

export const VF_AVOIDABLE_RULE_ID         = "ffxiv-vf-avoidable";
export const VF_STOMP_BAT_RULE_ID         = "ffxiv-vf-stomp-bat";
export const VF_STOMP_OVERLAP_RULE_ID     = "ffxiv-vf-stomp-overlap";
export const VF_HARDCORE_RULE_ID          = "ffxiv-vf-hardcore";
export const VF_HARDCORE_PARTY_RULE_ID    = "ffxiv-vf-hardcore-party";
export const VF_RAIN_MISSED_RULE_ID       = "ffxiv-vf-rain-missed";
export const VF_RAIN_WIPE_RULE_ID         = "ffxiv-vf-rain-wipe";
export const VF_AETH_OVERLAP_RULE_ID      = "ffxiv-vf-aetherletting-overlap";
export const VF_AETH_CROSS_RULE_ID        = "ffxiv-vf-aetherletting-cross";
export const VF_AETH_CLIP_RULE_ID         = "ffxiv-vf-aetherletting-clip";
export const VF_SAW_RULE_ID               = "ffxiv-vf-saw";
export const VF_FLAIL_TOWER_RULE_ID       = "ffxiv-vf-flail-tower";
export const VF_BARBED_BURST_RULE_ID      = "ffxiv-vf-barbed-burst";
export const VF_DOORNAIL_RULE_ID          = "ffxiv-vf-doornail";
export const VF_CELL_TOWER_RULE_ID        = "ffxiv-vf-cell-tower";
export const VF_CELL_CONE_RULE_ID         = "ffxiv-vf-cell-cone";
export const VF_LAST_LASH_RULE_ID         = "ffxiv-vf-last-lash";
export const VF_DEATHMATCH_TOWER_RULE_ID  = "ffxiv-vf-deathmatch-tower";
export const VF_ENRAGE_RULE_ID            = "ffxiv-vf-enrage";
export const VF_COLLAPSE_RULE_ID          = "ffxiv-vf-collapse";

// ── IDs (see VERIFIED AGAINST LOGS) ─────────────────────────────────────────

const KILLER_VOICE        = 45956; // signature cast (every pull, +11s)
const VAMP_STOMP          = 45898;
const BOMBPYRE            = 1004729;
const BLAST_BEAT_PLAYER   = 45942; // a Bombpyre carrier's own explosion
const BLAST_BEAT_BAT      = 45941;
const HARDCORE            = [45951, 45952]; // normal, enlarged (Satisfied >= 8)
const BRUTAL_RAIN_HIT     = 45955;
const AETH_CONE           = 45969; // rotating cones, cast from the boss
const AETH_DROP           = 45970; // each marked player's own drop
const AETH_CROSS          = 45971; // the dropped puddle's delayed plus/X
const AETH_OVERLAP        = 45972; // two puddles touching: raid-wide repeats
const PLUMMET             = 45963;
const MASSIVE_IMPACT      = 45964;
const BARBED_BURST        = 45965;
const DOORNAIL_EXPLOSION  = 45966;
const GRAVEGRAZER         = [45931, 45932];
const FLESH_WOUND         = 1002942;
const ELECTROCUTION       = [1003073, 1003074];
const HELL_IN_A_CELL      = 45973;
const CELL_SOAK           = 45974; // Bloody Bondage on each cell-tower soaker
const UNMITIGATED_EXPL    = 45975; // an unsoaked cell tower
const HELL_IN_A_CELL_AURA_MIN = 1004731, HELL_IN_A_CELL_AURA_MAX = 1004738;
const SPREAD_TANK         = 47235;
const SPREAD_OTHER        = 45982;
const AMP                 = 45983;
const LAST_LASH           = 46855;
const UNDEAD_DEATHMATCH   = 45984;
const DEATHMATCH_TOWER    = 45985;
const FINALE_ENRAGE       = [45934, 45937];
const DAMAGE_DOWN         = 1002911;
const CHAIN_EXPLOSION     = 45987;
// Raid-wide failures that kill whoever is standing: never another rule's death.
const RAID_KILLS          = [45965, 45966]; // Barbed Burst, Doornail Explosion

// Hits that are the hit player's own fault (each also hands out Damage Down,
// which is why ffxiv-damage-down excludes their causes; see error-rules.ts).
// `hit` says what happened; `why`, when set, is the one-line correct play.
type Avoidable = { name: string; hit: string; why?: string };
const COFFINFILLER: Avoidable = { name: "Coffinfiller", hit: "Hit by the Coffinmaker's Coffinfiller blades",
  why: "Its glowing blades fire a pair at a time as it advances down the lane; stand clear of the lit pair." };
const HALF_MOON: Avoidable = { name: "Half Moon", hit: "Caught in Half Moon, the boss's half-arena cleave",
  why: "It cleaves one half and then the other; move to the safe half before each one lands." };
const SCRATCH: Avoidable = { name: "Sanguine Scratch", hit: "Caught by Sanguine Scratch, the boss's cones during Undead Deathmatch",
  why: "Move into the gap between the cones while staying with your bat." };
const BREAKDOWN: Avoidable = { name: "Breakdown Drop", hit: "Hit by a bat's Breakdown Drop, a circle around the bat",
  why: "For the circle, stand away from your bat, toward the boss." };
const BREAKWING: Avoidable = { name: "Breakwing Beat", hit: "Hit by a bat's Breakwing Beat, a donut around the bat",
  why: "For the donut, stand right next to your bat." };
const AVOIDABLE: Record<number, Avoidable> = {
  45928: COFFINFILLER, 45929: COFFINFILLER, 45930: COFFINFILLER,
  45943: HALF_MOON, 45944: HALF_MOON, 45945: HALF_MOON, 45946: HALF_MOON,
  45947: HALF_MOON, 45948: HALF_MOON, 45949: HALF_MOON, 45950: HALF_MOON,
  45939: { name: "Pulping Pulse", hit: "Stood in a Pulping Pulse ground circle" },
  45969: { name: "Aetherletting Cone", hit: "Caught by one of Aetherletting's rotating cones",
    why: "The cones fire in sequence around the arena; dodge locally into the gap that has already fired." },
  45976: { name: "Naughty Knot", hit: "Hit by Naughty Knot while bound inside a Charnel Cell" },
  45987: { name: "Bat Chain Explosion", hit: "Their bat chain exploded on them",
    why: "The chain breaks when it's stretched too far from its bat (or taken from the wrong side's tower); stay close to your own bat as it circles." },
  45989: SCRATCH, 45991: SCRATCH,
  45992: BREAKDOWN, 45994: BREAKDOWN,
  45993: BREAKWING, 45995: BREAKWING,
};

// FFLogs logs the death event ~2.0s after the fatal hit (same as Dancing
// Mad; README "Lessons from Ultimate Kefka").
const DEATH_EVENT_LAG_MS = 2000;
const DIED_FROM_HIT_MS   = 3000;
// 5 dead at once ended every pull within 42s (P9); 4 dead was survived for
// 87s (P6) — see header.
const COLLAPSE_DEAD_COUNT = 5;
const COLLAPSE_END_MS     = 45_000;
// A tank dead at any point in this window before a Hardcore has lost enmity.
const TANK_ENMITY_LOST_MS = 30_000;

// ── party slots (Toxic/Hector) ──────────────────────────────────────────────

// Compass bearings of each slot's Vamp Stomp clock spot and static
// Aetherletting drop (model's [TF] section; confirmed in every clean pull).
const STOMP_SPOT: Record<FFRoleSlot, number> = { MT: 0, OT: 180, M1: 270, M2: 90, H1: 225, H2: 135, R1: 315, R2: 45 };
const DROP_SPOT: Record<FFRoleSlot, number>  = { MT: 337.5, OT: 157.5, M1: 202.5, M2: 112.5, H1: 247.5, H2: 67.5, R1: 292.5, R2: 22.5 };
// Aetherletting drops sit against the wall: clean drops were 18.3-19.6y out.
const DROP_RADIUS = 1890;
// Under the boss for Aetherletting's delayed lines (user, 2026-10-08):
// within 1y, a line hit is the dropper's fault; further out, the player's.
const UNDER_BOSS = 100;
const G1: FFRoleSlot[] = ["MT", "H1", "M1", "R1"];
const G2: FFRoleSlot[] = ["OT", "H2", "M2", "R2"];

type Spot = { p: PlayerInfo; x: number; y: number; t: number };
type Slots = Map<PlayerInfo, FFRoleSlot>;

const bearing = (s: { x: number; y: number }) => compassBearingOf(s.x, s.y);
const dirName = (b: number) => ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"][Math.round(b / 22.5) % 16];
function dropSpotDistance(s: { x: number; y: number }, slot: FFRoleSlot): number {
  const rad = DROP_SPOT[slot] * Math.PI / 180;
  return Math.hypot(s.x - (10000 + DROP_RADIUS * Math.sin(rad)), s.y - (10000 - DROP_RADIUS * Math.cos(rad)));
}

// ── shared helpers ──────────────────────────────────────────────────────────

type Hit = { p: PlayerInfo; e: PlayerEvent };

type Life = {
  alive: (p: PlayerInfo, t: number) => boolean;
  /** Alive when this hit landed: the fatal hit itself precedes the death event by ~2s. */
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

function hitsOf(players: PlayerInfo[], ids: number | number[], from = -Infinity, to = Infinity): Hit[] {
  const set = new Set(Array.isArray(ids) ? ids : [ids]);
  const out: Hit[] = [];
  for (const p of players) {
    for (const e of p.damageTaken) if (set.has(e.abilityId) && e.timestamp >= from && e.timestamp <= to) out.push({ p, e });
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

const uniq = <T,>(xs: T[]) => [...new Set(xs)];
const namesOf = (ps: PlayerInfo[]) => joinNames(uniq(ps).map((p) => p.name));
const diedText = (d: DeathEvent | undefined) => (d ? ", and died" : "");

/** Clusters hits by source instance + time: one cluster = one explosion/drop. */
function byInstance(hits: Hit[], gapMs: number): Hit[][] {
  const out: Hit[][] = [];
  for (const h of hits) {
    const g = out.find((c) => c[0].e.sourceInstance === h.e.sourceInstance && h.e.timestamp - c[c.length - 1].e.timestamp <= gapMs);
    if (g) g.push(h); else out.push([h]);
  }
  return out;
}

// ── Vamp Stomp explosions and Aetherletting drops ───────────────────────────

type Explosion = { owner: PlayerInfo; at: Spot; victims: Hit[]; t: number };

/**
 * Each Bombpyre carrier's own Blast Beat. The owner is the hit player whose
 * Bombpyre came off closest to 0.55s before the hit (every clean explosion
 * landed 0.5-0.6s after its carrier's cleanse); everyone else the same
 * explosion hit is a victim.
 */
function stompExplosions(players: PlayerInfo[], life: Life): Explosion[] {
  const out: Explosion[] = [];
  for (const g of byInstance(hitsOf(players, BLAST_BEAT_PLAYER), 400)) {
    const t = g[0].e.timestamp;
    const lag = (h: Hit) => Math.min(...h.p.debuffs
      .filter((d) => d.abilityId === BOMBPYRE && d.debuffStatus === "removed" && d.timestamp <= h.e.timestamp && d.timestamp >= h.e.timestamp - 1200)
      .map((d) => Math.abs(h.e.timestamp - d.timestamp - 550)));
    const o = [...g].filter((h) => lag(h) <= 400).sort((a, b) => lag(a) - lag(b))[0];
    if (!o) continue;
    if (o.e.x === undefined || o.e.y === undefined) continue;
    out.push({ owner: o.p, at: { p: o.p, x: o.e.x, y: o.e.y, t }, victims: g.filter((h) => h !== o && life.hitAlive(h.p, h.e.timestamp)), t });
  }
  return out;
}

/**
 * Each marked player's own Aetherletting drop. A player hit by one drop
 * only owns it; the rest are resolved by elimination (each player drops
 * once, each drop has one owner).
 */
function aetherDrops(players: PlayerInfo[]): Explosion[] {
  const clusters = byInstance(hitsOf(players, AETH_DROP), 600);
  const owned = new Map<Hit[], PlayerInfo>();
  const used = new Set<PlayerInfo>();
  for (let changed = true; changed;) {
    changed = false;
    for (const c of clusters) {
      if (owned.has(c)) continue;
      const cands = uniq(c.map((h) => h.p)).filter((p) => !used.has(p) &&
        clusters.filter((o) => !owned.has(o) && o.some((h) => h.p === p)).length === 1);
      const open = uniq(c.map((h) => h.p)).filter((p) => !used.has(p));
      const pick = open.length === 1 ? open[0] : cands.length === 1 ? cands[0] : undefined;
      if (pick) { owned.set(c, pick); used.add(pick); changed = true; }
    }
  }
  const out: Explosion[] = [];
  for (const [c, owner] of owned) {
    const own = c.find((h) => h.p === owner)!;
    if (own.e.x === undefined || own.e.y === undefined) continue;
    out.push({ owner, at: { p: owner, x: own.e.x, y: own.e.y, t: own.e.timestamp }, victims: c.filter((h) => h.p !== owner), t: c[0].e.timestamp });
  }
  return out.sort((a, b) => a.t - b.t);
}

/**
 * Party slots for this pull. Healers and ranged come from their jobs
 * (roles.ts). Tanks and melee are paired by where they stood for Vamp
 * Stomp and their Aetherletting drop: the pairing with the smaller total
 * deviation from the plan's spots wins, so one misplaced Stomp can't swap
 * a pair that the rest of the pull places correctly. No evidence: roles.ts.
 */
function resolveSlots(players: PlayerInfo[], explosions: Explosion[], drops: Explosion[]): Slots {
  const roles = detectFFRoles(players);
  const slots: Slots = new Map();
  for (const r of roles) if (r.player) slots.set(r.player, r.slot);
  const deviation = (p: PlayerInfo, slot: FFRoleSlot) =>
    explosions.filter((x) => x.owner === p).reduce((s, x) => s + angularDistance(bearing(x.at), STOMP_SPOT[slot]), 0) +
    drops.filter((x) => x.owner === p).reduce((s, x) => s + angularDistance(bearing(x.at), DROP_SPOT[slot]), 0);
  for (const [a, b] of [["MT", "OT"], ["M1", "M2"]] as [FFRoleSlot, FFRoleSlot][]) {
    const pa = roles.find((r) => r.slot === a)?.player, pb = roles.find((r) => r.slot === b)?.player;
    if (!pa || !pb) continue;
    const keep = deviation(pa, a) + deviation(pb, b);
    const swap = deviation(pa, b) + deviation(pb, a);
    if (swap < keep) { slots.set(pa, b); slots.set(pb, a); }
  }
  return slots;
}

function detectStomp(players: PlayerInfo[], life: Life, explosions: Explosion[], slots: Slots): PullError[] {
  const errors: PullError[] = [];
  // A bat's Blast Beat. The Magic Vulnerability Up it leaves usually makes
  // the player's own Bombpyre explosion lethal a second later.
  for (const g of clusterByGap(hitsOf(players, BLAST_BEAT_BAT), (h) => h.e.timestamp, 0)) {
    for (const { p, e } of g) {
      if (!life.hitAlive(p, e.timestamp) || ((e.amount ?? 0) === 0 && !gotDamageDown(p, e.timestamp))) continue;
      if (errors.some((x) => x.player === p.name && x.ruleId === VF_STOMP_BAT_RULE_ID && e.timestamp - x.timestamp < 5000)) continue;
      const death = life.diedFrom(p, e.timestamp);
      const how = !death ? ""
        : death.timestamp - e.timestamp > 1000
          ? " With that vulnerability still on, their own Bombpyre explosion a moment later killed them."
          : " The bat's hit killed them.";
      errors.push(playerError(p, {
        ruleId: VF_STOMP_BAT_RULE_ID, severity: "Major", name: "Hit by a Bat (Vamp Stomp)",
        description: `Stood where an orbiting Vamp Stomp bat exploded (Blast Beat, ${kFmt(e.amount ?? 0)})${gotDamageDown(p, e.timestamp) ? " and got Damage Down" : ""} plus Magic Vulnerability Up. The bats burst when the expanding ring reaches them; keep your spot clear of their path.${how}`,
        timestamp: e.timestamp, abilityId: BLAST_BEAT_BAT, abilityName: "Blast Beat",
      }));
    }
  }
  // Another carrier's explosion. Blame whoever of the two stood further
  // from their clock spot; when neither is clearly off (45 degrees), name
  // both.
  for (const x of explosions) {
    for (const v of x.victims) {
      const os = slots.get(x.owner), vs = slots.get(v.p);
      if (!os || !vs || v.e.x === undefined || v.e.y === undefined) continue;
      const od = angularDistance(bearing(x.at), STOMP_SPOT[os]);
      const vd = angularDistance(bearing(v.e as { x: number; y: number }), STOMP_SPOT[vs]);
      const death = life.diedFrom(v.p, v.e.timestamp);
      const where = `${x.owner.name} (${os}) exploded ${dirName(bearing(x.at))} at ${yd(distanceFromCenter(x.at.x, x.at.y))}y, ${Math.round(od)}° off their ${dirName(STOMP_SPOT[os])} spot; ${v.p.name} (${vs}) stood ${dirName(bearing(v.e as { x: number; y: number }))}, ${Math.round(vd)}° off ${dirName(STOMP_SPOT[vs])}`;
      const blame = od >= 45 && od >= vd ? [x.owner] : vd >= 45 ? [v.p] : [x.owner, v.p];
      for (const p of blame) {
        errors.push(playerError(p, {
          ruleId: VF_STOMP_OVERLAP_RULE_ID, severity: "Major", name: "Bombpyre Explosions Overlapped",
          description: `${p === x.owner ? `Their Bombpyre explosion hit ${v.p.name}` : `Stood in ${x.owner.name}'s Bombpyre explosion`} (${kFmt(v.e.amount ?? 0)}${death ? `, ${v.p.name} died` : ""}). Each carrier explodes when the ring reaches them and must be alone at their own clock spot. ${where}.${blame.length > 1 ? " Neither was clearly off their spot, so both are flagged." : ""}`,
          timestamp: v.e.timestamp, abilityId: BLAST_BEAT_PLAYER, abilityName: "Blast Beat",
        }));
      }
    }
  }
  return errors;
}

// ── plain avoidable hits ────────────────────────────────────────────────────

function detectAvoidable(players: PlayerInfo[], life: Life): PullError[] {
  const errors: PullError[] = [];
  const ids = Object.keys(AVOIDABLE).map(Number);
  for (const p of players) {
    const hits = p.damageTaken.filter((e) => ids.includes(e.abilityId) && life.hitAlive(p, e.timestamp) &&
      ((e.amount ?? 0) > 0 || gotDamageDown(p, e.timestamp)));
    // One error per resolution: hits within 3s (Coffinfiller and Half Moon
    // land together). Bat-chain Explosions repeat every ~3s while a chain
    // stays stretched, so they merge over a longer gap.
    const chain = hits.filter((e) => e.abilityId === CHAIN_EXPLOSION);
    for (const g of [...clusterByGap(hits.filter((e) => e.abilityId !== CHAIN_EXPLOSION), (e) => e.timestamp, 3000),
                     ...clusterByGap(chain, (e) => e.timestamp, 8000)]) {
      const kinds = uniq(g.map((e) => AVOIDABLE[e.abilityId]));
      const total = g.reduce((s, e) => s + (e.amount ?? 0), 0);
      const death = life.diedFrom(p, g[g.length - 1].timestamp);
      const dd = g.some((e) => gotDamageDown(p, e.timestamp));
      const hit = kinds.map((k, i) => (i === 0 ? k.hit : k.hit.charAt(0).toLowerCase() + k.hit.slice(1))).join(", and ");
      const times = g.length > 1 ? `${g.length} hits, ` : "";
      const outcome = [dd ? "got Damage Down" : "", death ? "died" : ""].filter(Boolean).join(" and ");
      const why = kinds.map((k) => k.why).filter(Boolean).join(" ");
      errors.push(playerError(p, {
        ruleId: VF_AVOIDABLE_RULE_ID, severity: "Major", name: `Hit by ${kinds.map((k) => k.name).join(" / ")}`,
        description: `${hit} (${times}${kFmt(total)}).${outcome ? ` They ${outcome}.` : ""}${why ? ` ${why}` : ""}`,
        timestamp: g[0].timestamp, abilityId: g[0].abilityId, abilityName: g[0].abilityName,
      }));
    }
  }
  return errors;
}

// ── saws and Doornail puddles ───────────────────────────────────────────────

/**
 * Saw contact (Gravegrazer + Flesh Wound) and Doornail puddle contact
 * (Electrocution). No Damage Down, and the kill had three of each, so it is
 * Minor unless the player died while it was ticking.
 */
function detectSaws(players: PlayerInfo[], life: Life, deaths: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];
  const isTick = (e: PlayerEvent) => GRAVEGRAZER.includes(e.abilityId) || e.abilityId === FLESH_WOUND || ELECTROCUTION.includes(e.abilityId);
  for (const p of players) {
    // Each contact is its DoT's lifetime (Electrocution's two IDs follow one
    // another); a Gravegrazer hit outside any Flesh Wound stands alone.
    const spans = [
      ...debuffIntervals(p, FLESH_WOUND).map((w) => ({ ...w, kind: "saw" })),
      ...ELECTROCUTION.flatMap((id) => debuffIntervals(p, id)).map((w) => ({ ...w, kind: "puddle" })),
    ];
    for (const e of p.damageTaken.filter((x) => GRAVEGRAZER.includes(x.abilityId))) {
      if (!spans.some((w) => e.timestamp >= w.start - 1000 && e.timestamp <= w.end)) spans.push({ start: e.timestamp, end: e.timestamp, kind: "saw" });
    }
    const episodes: { start: number; end: number; kinds: string[] }[] = [];
    for (const w of spans.filter((s) => life.hitAlive(p, s.start)).sort((a, b) => a.start - b.start)) {
      const last = episodes[episodes.length - 1];
      if (last && w.start <= last.end + 1000) { last.end = Math.max(last.end, w.end); last.kinds.push(w.kind); }
      else episodes.push({ start: w.start, end: w.end, kinds: [w.kind] });
    }
    for (const ep of episodes) {
      const ticks = p.damageTaken.filter((e) => isTick(e) && e.timestamp >= ep.start - 100 && e.timestamp <= ep.end + 100);
      // The fatal hit precedes the death event by ~2s. A raid-wide (Killer
      // Voice) finishing a player while the DoT is on them counts (P3/P6
      // +327); a wipe mechanic killing everyone doesn't.
      const death = deaths.find((d) => d.player === p.name && !RAID_KILLS.includes(d.killingAbilityGameId) &&
        d.timestamp - DEATH_EVENT_LAG_MS >= ep.start && d.timestamp - DEATH_EVENT_LAG_MS <= ep.end + 1000);
      const what = joinNames(uniq(ep.kinds.map((k) => (k === "saw" ? "a saw (Flesh Wound)" : "the Doornail puddle (Electrocution)"))));
      const total = ticks.reduce((s, e) => s + (e.amount ?? 0), 0);
      errors.push(playerError(p, {
        ruleId: VF_SAW_RULE_ID, severity: death ? "Major" : "Minor", name: "Saw / Puddle Contact",
        description: `Touched ${what} (${kFmt(total)} over ${ticks.length} hit${ticks.length === 1 ? "" : "s"}). The saws run along their lanes and the Doornail's puddle keeps growing; step around them. ${death ? "They died while the damage-over-time was still ticking." : "No Damage Down, and the healers can heal through it, so it's minor."}`,
        timestamp: ep.start, abilityId: ep.kinds[0] === "saw" ? FLESH_WOUND : ELECTROCUTION[0], abilityName: ep.kinds[0] === "saw" ? "Flesh Wound" : "Electrocution",
      }));
    }
  }
  return errors;
}

// ── Hardcore ────────────────────────────────────────────────────────────────

function detectHardcore(players: PlayerInfo[], life: Life): PullError[] {
  const errors: PullError[] = [];
  const tanks = players.filter((p) => p.role === "Tank");
  for (const g of clusterByGap(hitsOf(players, HARDCORE), (h) => h.e.timestamp, 1500)) {
    const t = g[0].e.timestamp;
    const others = uniq(g.filter((h) => h.p.role !== "Tank" && life.hitAlive(h.p, h.e.timestamp)).map((h) => h.p));
    if (others.length === 0) continue;
    const killed = others.filter((p) => life.diedFrom(p, g[g.length - 1].e.timestamp));
    const enlarged = g.some((h) => h.e.abilityId === HARDCORE[1]);
    if (others.length >= 3) {
      errors.push(raidMarker(VF_HARDCORE_PARTY_RULE_ID, "Hardcore Hit the Party",
        `${enlarged ? "Enlarged " : ""}Hardcore hit ${others.length} non-tanks (${namesOf(others)})${killed.length ? `, killing ${killed.length}` : ""}. The tanks and the party weren't separated.${enlarged ? " Once Satisfied reaches 8 stacks (earlier deaths and mistakes add to it), Hardcore's circles grow much larger, so the tanks have to take it far from the party." : ""} Unresolvable from here.`,
        t, g[0].e.abilityId, "Hardcore"));
      continue;
    }
    // A dead tank sends the buster to the next enmity target, and so does a
    // freshly raised one (no enmity yet: P6's third Hardcore, 16s after the
    // OT's death): fallout.
    if (tanks.length < 2 || tanks.some((p) => !life.hitAlive(p, t) ||
      life.outIntervals.some((w) => w.p === p && w.start <= t && w.end >= t - TANK_ENMITY_LOST_MS))) continue;
    for (const p of others) {
      const e = g.find((h) => h.p === p)!.e;
      errors.push(playerError(p, {
        ruleId: VF_HARDCORE_RULE_ID, severity: "Major", name: "Hit by Hardcore",
        description: `Took ${enlarged ? "an enlarged" : "a"} Hardcore tankbuster (${kFmt(e.amount ?? 0)}) with both tanks alive${diedText(life.diedFrom(p, e.timestamp))}. Hardcore drops a circle on each of the top two enmity targets (the tanks); everyone else has to stay out of both${enlarged ? ", and the enlarged circles reach much further" : ""}.`,
        timestamp: e.timestamp, abilityId: e.abilityId, abilityName: "Hardcore",
      }));
    }
  }
  return errors;
}

// ── Brutal Rain ─────────────────────────────────────────────────────────────

function detectRain(players: PlayerInfo[], life: Life, deaths: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const seq of clusterByGap(hitsOf(players, BRUTAL_RAIN_HIT), (h) => h.e.timestamp, 3000)) {
    const from = seq[0].e.timestamp, to = seq[seq.length - 1].e.timestamp;
    const hit = new Set(seq.map((h) => h.p));
    for (const p of players) {
      if (hit.has(p) || !life.hitAlive(p, from) || !life.hitAlive(p, to)) continue;
      errors.push(playerError(p, {
        ruleId: VF_RAIN_MISSED_RULE_ID, severity: "Major", name: "Missed the Brutal Rain Stack",
        description: `Alive but took none of Brutal Rain's ${uniq(seq.map((h) => Math.round(h.e.timestamp / 900))).length} stack hits. Brutal Rain is a repeated party stack on a healer that splits its damage among everyone in it; missing it leaves the rest to take more.`,
        timestamp: from, abilityId: BRUTAL_RAIN_HIT, abilityName: "Brutal Rain",
      }));
    }
    const killed = deaths.filter((d) => d.killingAbilityGameId === BRUTAL_RAIN_HIT && d.timestamp >= from && d.timestamp <= to + DIED_FROM_HIT_MS);
    if (killed.length >= 3) {
      errors.push(raidMarker(VF_RAIN_WIPE_RULE_ID, "Brutal Rain Killed the Party",
        `Brutal Rain killed ${killed.length} (${joinNames(killed.map((d) => d.player))}) with ${hit.size} sharing it: the party wasn't healed and mitigated enough between its hits. Unresolvable from here.`,
        killed[0].timestamp - DEATH_EVENT_LAG_MS, BRUTAL_RAIN_HIT, "Brutal Rain"));
    }
  }
  return errors;
}

// ── Aetherletting ───────────────────────────────────────────────────────────

function detectAetherletting(players: PlayerInfo[], life: Life, casts: EnemyEvent[], drops: Explosion[], slots: Slots): PullError[] {
  const errors: PullError[] = [];
  const dropOff = (d: Explosion) => {
    const slot = slots.get(d.owner);
    return slot ? dropSpotDistance(d.at, slot) : 0;
  };
  const dropText = (d: Explosion) => {
    const slot = slots.get(d.owner);
    return `${d.owner.name}${slot ? ` (${slot})` : ""} dropped ${dirName(bearing(d.at))} at ${yd(distanceFromCenter(d.at.x, d.at.y))}y${slot ? `, ${yd(dropSpotDistance(d.at, slot))}y from their ${dirName(DROP_SPOT[slot])} spot` : ""}`;
  };

  // Two puddles touching: the raid-wide overlap penalty, repeated. Every
  // occurrence ended its pull (P2/P10/P13). Blame the drop of the pair that
  // just landed which is furthest from its spot; one Raid marker per
  // Aetherletting.
  let marked = -Infinity;
  for (const g of clusterByGap(castsOf(casts, AETH_OVERLAP), (c) => c.timestamp, 1000)) {
    const t = g[0].timestamp;
    const recent = drops.filter((d) => d.t <= t + 100 && d.t >= t - 1500);
    const culprit = [...recent].sort((a, b) => dropOff(b) - dropOff(a))[0];
    if (culprit && life.hitAlive(culprit.owner, t)) {
      errors.push(playerError(culprit.owner, {
        ruleId: VF_AETH_OVERLAP_RULE_ID, severity: "Major", name: "Aetherletting Puddles Overlapped",
        description: `Their Aetherletting drop touched another puddle, setting off the raid-wide overlap explosions. Each marked player drops against the wall at their own assigned spot so the puddles stay apart. ${dropText(culprit)}.`,
        timestamp: t, abilityId: AETH_OVERLAP, abilityName: "Aetherletting",
      }));
    }
    if (t - marked < 30_000) continue;
    marked = t;
    errors.push(raidMarker(VF_AETH_OVERLAP_RULE_ID, "Aetherletting Puddles Overlapped",
      `Two Aetherletting puddles touched and exploded across the arena repeatedly${culprit ? ` (latest drop: ${culprit.owner.name})` : ""}. Unresolvable from here.`,
      t, AETH_OVERLAP, "Aetherletting"));
  }

  // A drop that clipped someone else: the one further from their spot.
  for (const d of drops) {
    for (const v of d.victims) {
      if (!life.hitAlive(v.p, v.e.timestamp)) continue;
      if (errors.some((x) => x.ruleId === VF_AETH_OVERLAP_RULE_ID && Math.abs(x.timestamp - v.e.timestamp) < 3000)) continue;
      const vSlot = slots.get(v.p);
      const vOff = vSlot && v.e.x !== undefined && v.e.y !== undefined ? dropSpotDistance(v.e as { x: number; y: number }, vSlot) : 0;
      const blame = dropOff(d) >= vOff ? d.owner : v.p;
      errors.push(playerError(blame, {
        ruleId: VF_AETH_CLIP_RULE_ID, severity: "Major", name: "Aetherletting Drop Clipped Someone",
        description: `${blame === d.owner ? `Their Aetherletting drop hit ${v.p.name}` : `Stood in ${d.owner.name}'s Aetherletting drop`} (${kFmt(v.e.amount ?? 0)}${life.diedFrom(v.p, v.e.timestamp) ? `, ${v.p.name} died` : ""}). Each drop is a spread that must land on its owner alone at their spot. ${dropText(d)}; ${v.p.name} was ${yd(vOff)}y from their own spot.`,
        timestamp: v.e.timestamp, abilityId: AETH_DROP, abilityName: "Aetherletting",
      }));
    }
  }

  // The puddles' delayed plus/X lines. The safe spot is under the boss: a
  // victim within 1y of the boss means the drop's angle put a line through
  // the stack (its owner's fault); a victim anywhere else should have been
  // under the boss (user ruling, 2026-10-08).
  for (const c of castsOf(casts, AETH_CROSS)) {
    const victims = hitsOf(players, AETH_CROSS, c.timestamp, c.timestamp + 1500)
      .filter((h) => h.e.sourceInstance === c.sourceInstance && life.hitAlive(h.p, h.e.timestamp) && h.e.x !== undefined && h.e.y !== undefined);
    if (victims.length === 0 || c.x === undefined || c.y === undefined) continue;
    const px = c.x, py = c.y;
    // The boss's own position: the rotating cones are cast from it.
    const boss = castsOf(casts, AETH_CONE).filter((b) => b.timestamp < c.timestamp && b.x !== undefined).pop();
    const bx = boss?.x ?? 10000, by = boss?.y ?? 10000;
    const fromBoss = (h: Hit) => Math.hypot(h.e.x! - bx, h.e.y! - by);
    const owner = drops.filter((d) => d.t < c.timestamp && Math.hypot(d.at.x - px, d.at.y - py) <= 300)[0];
    const centered = victims.filter((h) => fromBoss(h) <= UNDER_BOSS);
    for (const v of victims.filter((h) => !centered.includes(h))) {
      errors.push(playerError(v.p, {
        ruleId: VF_AETH_CROSS_RULE_ID, severity: "Major", name: "Hit by an Aetherletting Line",
        description: `Hit by ${!owner ? "a" : owner.owner === v.p ? "their own" : `${owner.owner.name}'s`} puddle's delayed line (${kFmt(v.e.amount ?? 0)})${gotDamageDown(v.p, v.e.timestamp) ? " and got Damage Down" : ""}${diedText(life.diedFrom(v.p, v.e.timestamp))}. They stood ${yd(fromBoss(v))}y from the boss; the only safe spot for the puddles' lines is right under the boss.`,
        timestamp: v.e.timestamp, abilityId: AETH_CROSS, abilityName: "Aetherletting",
      }));
    }
    if (centered.length && owner) {
      const killed = centered.filter((h) => life.diedFrom(h.p, h.e.timestamp)).map((h) => h.p);
      errors.push(playerError(owner.owner, {
        ruleId: VF_AETH_CROSS_RULE_ID, severity: "Major", name: "Aetherletting Line Through the Center",
        description: `Their puddle's delayed line crossed the stack under the boss, hitting ${namesOf(centered.map((h) => h.p))}${killed.length ? ` (${namesOf(killed)} died)` : ""}. A puddle dropped at its assigned spot sends its lines past the boss; a drop at the wrong angle runs a line through it. ${dropText(owner)}.`,
        timestamp: centered[0].e.timestamp, abilityId: AETH_CROSS, abilityName: "Aetherletting",
      }));
    } else if (centered.length) {
      errors.push(playerlessMinor(VF_AETH_CROSS_RULE_ID, "Aetherletting Line Through the Center",
        `A puddle's delayed line crossed the stack under the boss, hitting ${namesOf(centered.map((h) => h.p))}; its drop couldn't be matched to a player.`,
        centered[0].e.timestamp, AETH_CROSS, "Aetherletting"));
    }
  }
  return errors;
}

// ── Plummet towers, Fatal Flails, Deadly Doornail ───────────────────────────

function detectAdds(players: PlayerInfo[], life: Life, casts: EnemyEvent[], deaths: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];
  const tanks = players.filter((p) => p.role === "Tank");
  // A Plummet tower nobody soaked: the cast lands with no player hit, then
  // Massive Impact + Sustained Damage on everyone. MT soaks north, OT south,
  // so with one tower missed the living tank who took no Plummet is the one.
  for (const wave of clusterByGap(castsOf(casts, PLUMMET), (c) => c.timestamp, 1000)) {
    const t = wave[0].timestamp;
    const soakers = uniq(hitsOf(players, PLUMMET, t - 200, t + 1000).map((h) => h.p));
    const missed = wave.length - soakers.length;
    if (missed <= 0) continue;
    const impact = hitsOf(players, MASSIVE_IMPACT, t, t + 3000).length > 0;
    const absent = tanks.filter((p) => !soakers.includes(p) && life.hitAlive(p, t));
    if (absent.length === missed) {
      for (const p of absent) {
        errors.push(playerError(p, {
          ruleId: VF_FLAIL_TOWER_RULE_ID, severity: "Major", name: "Missed a Plummet Tower",
          description: `Alive but didn't soak their Plummet tower${soakers.length ? ` (${namesOf(soakers)} took the other)` : ""}. Each tank soaks one tower (MT north, OT south)${impact ? "; the empty one went off as Massive Impact on the party and left Sustained Damage on everyone" : ""}.`,
          timestamp: t, abilityId: PLUMMET, abilityName: "Plummet",
        }));
      }
    } else {
      errors.push(playerlessMinor(VF_FLAIL_TOWER_RULE_ID, "Missed a Plummet Tower",
        `${missed} Plummet tower${missed > 1 ? "s" : ""} went unsoaked${impact ? " (Massive Impact)" : ""}; no living tank was free to blame.`,
        t, PLUMMET, "Plummet"));
    }
  }
  // A Fatal Flail lived to finish Barbed Burst: raid-wide damage and Damage
  // Down on everyone. Happened in the kill too, so it's Minor unless lethal.
  for (const c of castsOf(casts, BARBED_BURST)) {
    const killed = deaths.filter((d) => d.killingAbilityGameId === BARBED_BURST && d.timestamp >= c.timestamp && d.timestamp <= c.timestamp + 4000);
    const text = `A Fatal Flail wasn't killed in time and finished Barbed Burst: raid-wide damage and Damage Down on everyone${killed.length ? `, killing ${joinNames(killed.map((d) => d.player))}` : ""}. Each soaked Plummet tower spawns a Flail that has to die within ~16s.`;
    errors.push(killed.length >= 3
      ? raidMarker(VF_BARBED_BURST_RULE_ID, "Barbed Burst", `${text} Unresolvable from here.`, c.timestamp, BARBED_BURST, "Barbed Burst")
      : playerlessMinor(VF_BARBED_BURST_RULE_ID, "Barbed Burst", text, c.timestamp, BARBED_BURST, "Barbed Burst"));
  }
  for (const c of castsOf(casts, DOORNAIL_EXPLOSION)) {
    const killed = deaths.filter((d) => d.killingAbilityGameId === DOORNAIL_EXPLOSION && d.timestamp <= c.timestamp + 4000 && d.timestamp >= c.timestamp);
    errors.push(raidMarker(VF_DOORNAIL_RULE_ID, "Deadly Doornail Exploded",
      `The Deadly Doornail wasn't killed before the next Screech and exploded${killed.length ? `, killing ${killed.length} (${joinNames(killed.map((d) => d.player))})` : ""}. The party has to burn the nail down during the add waves. Unresolvable from here.`,
      c.timestamp, DOORNAIL_EXPLOSION, "Explosion"));
  }
  return errors;
}

// ── Hell in a Cell ──────────────────────────────────────────────────────────

function isInmate(p: PlayerInfo, t: number): boolean {
  const ev = p.debuffs.filter((e) => e.abilityId >= HELL_IN_A_CELL_AURA_MIN && e.abilityId <= HELL_IN_A_CELL_AURA_MAX)
    .sort((a, b) => a.timestamp - b.timestamp);
  const last = ev.filter((e) => e.timestamp <= t + 50).pop();
  // A removal at the hit's own millisecond is the hit killing the inmate.
  return !!last && (last.debuffStatus === "applied" || Math.abs(last.timestamp - t) <= 150);
}

function detectCells(players: PlayerInfo[], life: Life, casts: EnemyEvent[], slots: Slots): PullError[] {
  const errors: PullError[] = [];
  const sets = castsOf(casts, HELL_IN_A_CELL);
  sets.forEach((c, i) => {
    const t = c.timestamp;
    const soakers = uniq(hitsOf(players, CELL_SOAK, t, t + 3000).map((h) => h.p));
    const unsoaked = castsOf(casts, UNMITIGATED_EXPL).filter((u) => u.timestamp >= t && u.timestamp <= t + 5000).length;
    const group = i === 0 ? G1 : G2;
    const absent = unsoaked > 0
      ? players.filter((p) => group.includes(slots.get(p)!) && !soakers.includes(p) && life.hitAlive(p, t + 1000))
      : [];
    if (unsoaked > 0) {
      for (const p of absent) {
        errors.push(playerError(p, {
          ruleId: VF_CELL_TOWER_RULE_ID, severity: "Major", name: "Missed a Cell Tower",
          description: `Alive but didn't soak their Hell in a Cell tower. As ${slots.get(p)} they're in group ${i === 0 ? "1 (MT/H1/M1/R1), which soaks the first set" : "2 (OT/H2/M2/R2), which soaks the second set"}. The empty tower went off as Unmitigated Explosion on the party and left Sustained Damage on everyone.`,
          timestamp: t + 1200, abilityId: UNMITIGATED_EXPL, abilityName: "Unmitigated Explosion",
        }));
      }
      // A missed cell tower is the cutoff (user, 2026-10-08): the raid can
      // sometimes outgear it, but nothing after it is worth reviewing.
      if (!errors.some((e) => e.severity === "Raid" && e.ruleId === VF_CELL_TOWER_RULE_ID)) errors.push(raidMarker(VF_CELL_TOWER_RULE_ID, "Missed a Cell Tower",
        `${unsoaked} Hell in a Cell tower${unsoaked > 1 ? "s" : ""} went unsoaked${absent.length ? ` (${namesOf(absent)})` : " (their soakers were dead)"}: Unmitigated Explosion and Sustained Damage on everyone. Treated as the cutoff point.`,
        t + 1200, UNMITIGATED_EXPL, "Unmitigated Explosion"));
      {
      }
    }

    // Ultrasonic Spread/Amp, aimed by the four outside players.
    const end = sets[i + 1]?.timestamp ?? t + 22_000;
    const coneHits = hitsOf(players, [SPREAD_TANK, SPREAD_OTHER, AMP], t, end).filter((h) => life.hitAlive(h.p, h.e.timestamp));
    for (const g of clusterByGap(coneHits, (h) => h.e.timestamp, 1000)) {
      const inmates = g.filter((h) => isInmate(h.p, h.e.timestamp));
      const tankCone = g.filter((h) => h.e.abilityId === SPREAD_TANK);
      const aimer = tankCone.find((h) => h.p.role === "Tank" && !isInmate(h.p, h.e.timestamp))?.p;
      for (const h of inmates) {
        const died = life.diedFrom(h.p, h.e.timestamp);
        if (h.e.abilityId === SPREAD_TANK && aimer) {
          errors.push(playerError(aimer, {
            ruleId: VF_CELL_CONE_RULE_ID, severity: "Major", name: "Ultrasonic Cone Hit an Inmate",
            description: `Their tank Ultrasonic Spread cone hit ${h.p.name} inside a Charnel Cell (${kFmt(h.e.amount ?? 0)})${died ? `, and ${h.p.name} died` : ""}. The outside tank aims the cone by standing in the gap between the two far-apart towers, away from the cells.`,
            timestamp: h.e.timestamp, abilityId: SPREAD_TANK, abilityName: "Ultrasonic Spread",
          }));
        } else {
          errors.push(playerlessMinor(VF_CELL_CONE_RULE_ID, "Ultrasonic Cone Hit an Inmate",
            `${h.e.abilityName} hit ${h.p.name} inside a Charnel Cell (${kFmt(h.e.amount ?? 0)})${died ? ", who died" : ""}; the aimer can't be told from the log.`,
            h.e.timestamp, h.e.abilityId, h.e.abilityName));
        }
      }
      // The tank cone on an outside non-tank: the tank aims it by standing in
      // the gap between the two far-apart towers, so it's the tank's
      // position (user ruling, P3 +6:57). One who skipped their tower was
      // only outside because of that (already flagged).
      const strays = tankCone.filter((x) => x.p.role !== "Tank" && !isInmate(x.p, x.e.timestamp) && !absent.includes(x.p));
      if (strays.length && aimer) {
        const killed = strays.filter((h) => life.diedFrom(h.p, h.e.timestamp)).map((h) => h.p);
        errors.push(playerError(aimer, {
          ruleId: VF_CELL_CONE_RULE_ID, severity: "Major", name: "Ultrasonic Cone Hit the Party",
          description: `Their tank Ultrasonic Spread cone hit ${namesOf(strays.map((h) => h.p))}${killed.length ? ` (${namesOf(killed)} died)` : ""}. The outside tank aims the cone by standing in the gap between the two far-apart towers; they weren't there.`,
          timestamp: strays[0].e.timestamp, abilityId: SPREAD_TANK, abilityName: "Ultrasonic Spread",
        }));
      } else if (strays.length) {
        errors.push(playerlessMinor(VF_CELL_CONE_RULE_ID, "Ultrasonic Cone Hit the Party",
          `The tank Ultrasonic Spread cone hit ${namesOf(strays.map((h) => h.p))}; no living outside tank to name.`,
          strays[0].e.timestamp, SPREAD_TANK, "Ultrasonic Spread"));
      }
    }
  });
  for (const { p, e } of hitsOf(players, LAST_LASH)) {
    errors.push(playerError(p, {
      ruleId: VF_LAST_LASH_RULE_ID, severity: "Major", name: "Didn't Break Out of the Cell",
      description: `Their Charnel Cell wasn't destroyed in time and finished Last Lash on them (${kFmt(e.amount ?? 0)})${diedText(life.diedFrom(p, e.timestamp))}. Only the player inside can damage their own cell, so each inmate has to break out on their own before it casts.`,
      timestamp: e.timestamp, abilityId: LAST_LASH, abilityName: "Last Lash",
    }));
  }
  return errors;
}

// ── Undead Deathmatch towers ────────────────────────────────────────────────

function detectDeathmatch(players: PlayerInfo[], life: Life, casts: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const c of castsOf(casts, UNDEAD_DEATHMATCH)) {
    const hits = hitsOf(players, DEATHMATCH_TOWER, c.timestamp, c.timestamp + 3000);
    if (hits.length === 0) continue;
    const soakers = uniq(hits.map((h) => h.p));
    const t = hits[0].e.timestamp;
    const killed = soakers.filter((p) => life.diedFrom(p, t));
    for (const p of players.filter((x) => !soakers.includes(x) && life.hitAlive(x, t))) {
      errors.push(playerError(p, {
        ruleId: VF_DEATHMATCH_TOWER_RULE_ID, severity: "Major", name: "Missed an Undead Deathmatch Tower",
        description: `Alive but soaked neither Undead Deathmatch tower (${soakers.length} soaked${killed.length ? `; ${namesOf(killed)} died in an under-soaked tower` : ""}). Both towers need four players each: group 1 north/west, group 2 south/east.`,
        timestamp: t, abilityId: DEATHMATCH_TOWER, abilityName: "Bloody Bondage",
      }));
    }
  }
  return errors;
}

// ── entry point ─────────────────────────────────────────────────────────────

/**
 * Vamp Fatale (M9S) errors. Self-gates on Killer Voice + Vamp Stomp, which
 * no other fight in the sample set casts.
 */
export function detectVampFataleErrors(players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[]): PullError[] {
  if (!enemyCasts.some((c) => c.abilityId === KILLER_VOICE) && !enemyCasts.some((c) => c.abilityId === VAMP_STOMP)) return [];
  const life = buildLife(players, deathEvents);
  const explosions = stompExplosions(players, life);
  const drops = aetherDrops(players);
  const slots = resolveSlots(players, explosions, drops);

  const errors = [
    ...detectStomp(players, life, explosions, slots),
    ...detectAvoidable(players, life),
    ...detectSaws(players, life, deathEvents),
    ...detectHardcore(players, life),
    ...detectRain(players, life, deathEvents),
    ...detectAetherletting(players, life, enemyCasts, drops, slots),
    ...detectAdds(players, life, enemyCasts, deathEvents),
    ...detectCells(players, life, enemyCasts, slots),
    ...detectDeathmatch(players, life, enemyCasts),
  ];

  const firstRaid = () => Math.min(...errors.filter((e) => e.severity === "Raid").map((e) => e.timestamp));
  const enrage = castsOf(enemyCasts, FINALE_ENRAGE)[0];
  if (enrage && enrage.timestamp < firstRaid()) {
    errors.push(raidMarker(VF_ENRAGE_RULE_ID, "Finale Fatale (Enrage)",
      "The final Crowd Kill left Vamp Fatale More Than Satisfied and Finale Fatale killed everyone — the hard enrage. The DPS check wasn't met.",
      enrage.timestamp, enrage.abilityId, "Finale Fatale"));
  }
  // Pull-over marker: the first moment 5 are dead at once, when the pull
  // ended soon after and no mechanic cutoff came first.
  const pullEnd = Math.max(0, ...players.flatMap((p) => [...p.damageTaken, ...p.casts].map((e) => e.timestamp)), ...deathEvents.map((d) => d.timestamp));
  const outAt = (t: number) => players.filter((p) => !life.alive(p, t));
  const collapseT = life.outIntervals.map((w) => w.start).sort((a, b) => a - b)
    .find((t) => outAt(t).length >= COLLAPSE_DEAD_COUNT);
  if (collapseT !== undefined && collapseT < firstRaid() && pullEnd - collapseT <= COLLAPSE_END_MS) {
    const who = outAt(collapseT).map((p) => p.name);
    errors.push(raidMarker(VF_COLLAPSE_RULE_ID, "Party Collapse",
      `${who.length} players were dead at once (${joinNames(who)}) — no pull recovered from that. Treated as the cutoff point.`,
      collapseT + DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
