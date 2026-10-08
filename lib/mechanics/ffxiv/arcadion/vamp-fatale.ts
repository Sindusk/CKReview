// lib/mechanics/ffxiv/arcadion/vamp-fatale.ts
//
// -- GUIDE-DERIVED MODEL: VAMP FATALE (M9S) --
// AAC Heavyweight M1 (Savage), Arcadion, patch 7.4; Savage only.
// Research stage, checked 2026-10-08. Comments only; no detection registered.
// No report was supplied or analyzed. ALL log signals below are hypotheses,
// including failures described as lethal; none are observed-log findings.
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
