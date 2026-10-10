// lib/mechanics/ffxiv/fru/roomates.ts
//
// -- GUIDE-DERIVED MODEL: ROOMMATES (FRU PHASE 4) --
// Filename preserves user's roomates.ts spelling. Futures Rewritten
// (Ultimate), patch 7.11 origin; checked 2026-10-09. Comments only.
// No report analyzed: every log signal/attribution/tolerance is a hypothesis.
// Shared severity/roles: fatebreaker.ts. P2 owns necklace prerequisite;
// this module owns Fragment of Fate and both bosses until pandora.ts.
// Damage Down/Mark of Mortality from a proven player's mistake is Major;
// terminal loss is Raid. Victim identity alone does not establish fault.
//
// -- SOURCES, BASELINE AND DISAGREEMENTS --
// [N] Original NAUR mechanics by Tvnariea Reksane, current prose inspected:
//     https://naurffxiv.com/ultimate/fru/guide/p4
// [D] Original NAUR Darklit presentation, all 22 slides inspected:
//     https://tinyurl.com/lesbin-darklit
// [CT] Original NAUR Early Pop CT presentation, all 25 slides inspected:
//      https://tinyurl.com/lesbin-ct
// [W] Current board: NAUR, P4 Akh Morn 7-1 (Default):
//     https://wtfdig.info/ultimates/fru#naur
// [L] LPDU assignments sourced from Fijou:
//     https://lpdu.net/fru/p4/
// [LD] Mami Darklit original linked plan:
//      https://raidplan.io/plan/scWeh81_SDmJyOsn
// [LC] LPDU Fast Dragon original linked plan:
//      https://raidplan.io/plan/PPZ2sl43DYxq2vZ8
// [MD] MUR lineup Darklit original plan:
//      https://raidplan.io/plan/pcrbL0iqrAYMKFV3
// [MC] Em's MUR Crystallize Time original plan:
//      https://raidplan.io/plan/GIXItxnLI2MJma73
// [I] Tor's original explanation, 2024-12-11:
//     https://www.icy-veins.com/ffxiv/futures-rewritten-ultimate-guide-for-phase-4-enter-the-dragon
// [C] Original Cactbot timeline; candidate ACT IDs, not verified FFLogs:
//     https://github.com/OverlayPlugin/cactbot/blob/main/ui/raidboss/data/07-dt/ultimate/futures_rewritten.txt
// [CS] Original status mapping:
//      https://github.com/OverlayPlugin/cactbot/blob/main/ui/raidboss/data/07-dt/ultimate/futures_rewritten.ts
// [T] Original timeline by A'rhaeda Vhil:
//     https://thaliak.com/ultimates/fru/
// No confirmed mechanic-changing hotfix found. N/D say four Akh Morn hits;
// I says four then five; C labels BOTH five. Keep this count discrepancy
// explicit pending logs; a guide's count is not a missing-hit error rule.
// Enrage is called Ice Age by N, Absolute Zero by I/C; verify actual name/ID.
//
// -- SHAPE, CLOCK, CRYSTAL AND HP GATE [N, D] --
// P3 Memory's End success starts Shiva N/S opposite Gaia's prior side.
// Materialization creates northern Fragment of Fate; Hraesvelgr transform
// then Gaia returns. Two sequences: Darklit uptime, CT downtime; Akh Morn/
// Morn Afah after each. Approximate relative damage anchors [T]:
// 00:08 Materialization; 00:21 Akh Rhai; 00:34 Darklit; 01:09 Akh Morn;
// 01:20 Afah; 01:35 CT; 02:18/23 rewind wings; 02:32 Akh Morn;
// 02:42 Afah; 02:55 simultaneous enrages. Cast starts precede effects.
// Both bosses must reach defeat/1 HP transition before enrage; early
// individual HP depletion is held until scripted final Afah unlocks it.
// HP need only be within FIVE percentage points at each Afah resolution;
// imbalance between those checks is normal, final kills can be either order.
// Crystal is unhealable and intentionally takes scripted damage. Avoidable
// attacks hitting it destroy it and lock bad ending, even if players live.
// Four Edge of Oblivion pulses are expected; Depths of Oblivion instead
// indicates P2 necklace was lost. Crystal survival AND P2 fragment saved
// are needed for true P5. Bad ending Guardian of Eden uses Paradise Lost.
// Failure: crystal struck -> LOG: extra Fragment damage/death, possibly
//   from player-targeted attack; FAULT: drop/aim controller if proven;
//   CONSEQUENCE: Major plus Raid for clear objective at irreversible loss.
// No new blame to final Paradise Lost victims or later prog mistakes after
// an already-known clear-route failure. Scripted crystal pulses are normal.
//
// -- DUAL AUTOS AND AKH RHAI [D, N] --
// Shiva attacks two highest enmity targets after transform: MT first, OT
// second. OT stance/Shirk timing keeps both above party without stealing
// MT's later stack. Gaia enmity is independent after she appears.
// Akh Rhai snapshots all eight positions at wings sprouting, then ten
// rapid repeated puddle pulses at fixed locations. Stack center/true west
// clear of crystal, dodge once toward assigned lineup; no need to spread.
// Failure: bad bait/late exit -> LOG: Akh Rhai repeat damage/penalty/death
//   or crystal damage; FAULT: misplaced dropper/mover if snapshot known;
//   CONSEQUENCE: Minor without penalty, Major death, Raid on crystal loss.
// Failure: non-tank dual auto -> LOG: auto death on non-tank top-two target;
//   FAULT: assigned enmity controller if trace proves it; CONSEQUENCE: Major.
// Not errors: initial bait, tank autos, early damage focus on Gaia to catch
// up HP. A raw HP difference outside Afah is not itself an error.
//
// -- DARKLIT: CHAINS, TOWERS AND CONES [D, MD, N] --
// Raidwide from SHIVA; one tank, one healer, two DPS tethered in random
// order. Two 19s Water marks: exactly one chained, one unchained. Everyone
// starts three Lightsteeped; two N/S towers require TWO each. Four nearest
// non-tethers bait The Path of Light cones simultaneously, one stack each.
// Refulgent Chain ~7s activates Refulgent Fate ~14s. Unlike P2, both TOO
// SHORT and TOO LONG explode. Bowtie satisfies range at towers; five
// Lightsteeped from tower+cone overlap is also failure.
// NAUR/MUR: H NW, T NE, R SW, M SE; within each pair G1 left/G2 right.
// Bowtie already formed -> stay. Hourglass -> west DPS and tank exchange;
// box -> east DPS and tank exchange. Two tethers per N/S tower.
// NAUR unchained healer W, tank E; if both remaining DPS share role, G1
// changes side. DPS tethered to healer goes S, other N. Balance Water by
// vertically swapping unchained players on same E/W side during cone cast.
// MUR uses same broad bowtie/vertical-Water logic; its diagrams may assign
// individual slots differently when doubled DPS roles require a choice.
// Failure: tower missing -> LOG: Bright Hunger penalty/raid Damage Down;
//   FAULT: missing assigned chained soaker when demand proven;
//   CONSEQUENCE: Major, Raid if output/deaths preclude recovery.
// Failure: chained cone bait -> LOG: fifth Lightsteeped/explosion or missing
//   cone on assigned bait; FAULT: too-close chained player/bad bait position
//   if geometry establishes it; CONSEQUENCE: Major/Raid.
// Failure: chain range -> LOG: Refulgent Fate explosion; FAULT: offending
//   endpoint if adjacency/positions known, otherwise player-less Raid.
// Removal: Chain expiry ACTIVATES Fate, Fate expiry releases distance
// constraint around Dance. Death/early removal effects unverified; later
// compulsory movement can be a cascade from a prior broken chain.
// Not errors: four tower soaks + four initial cones, valid crossed bowtie.
//
// -- LPDU MAMI DARKLIT VARIANT [LD] --
// Initial healer pair N near center, tanks W, DPS S/E without a rigid role
// lineup. Tethered healer stays N; tethered tank goes S. Of tethered DPS,
// healer-connected DPS goes S, other N, making bowtie by connection.
// Unchained healer/tank bait W and two DPS E. If both Waters same N/S,
// unchained pair swaps vertically; preferably before cones, but after
// Spirit Taker is documented too. Northern four/southern four remain stack
// groups. This differs from NAUR intercardinal role construction and is
// valid; DPS initial location is chosen for readability, not pass/fail.
// Candidate signature: chained tank consistently S, healer N, unchained
// supports W; meaningful only over successful patterns with tether evidence.
// A single matching allocation cannot prove Mami vs regional label.
//
// -- SPIRIT TAKER, WATER/WINGS AND SOMBER DANCE [D, I] --
// Spread for random Spirit Taker; tethered use intercards, unchained DPS
// near hitbox and supports farther out. Keep crystal clear and chain range.
// Shiva half-room Hallowed Wings, two four-player Waters on safe N/S side;
// north group stays far enough south/sideways to avoid the memory crystal.
// Wait for Water before tank arcs out for Somber Dance: farthest buster,
// then nearest buster. NAUR MT far, OT close; one tank invulning both also
// valid. Distance decides targets, Provoke does not. Save PLD invuln for P5;
// other tank can solo both if group's cooldown plan allows it.
// Failure: extra Spirit hit -> LOG: non-target damage/knockback/death;
//   FAULT: bad spread controller if assignments prove it; CONSEQUENCE: Major.
// Failure: Water/wing clip -> LOG: doubled Water/Mark or wing damage/penalty;
//   FAULT: carrier/helper or mover if geometry proves it; CONSEQUENCE: Major,
//   Raid if crystal struck or group lost. Wing cue may be animation-only.
// Failure: wrong distance buster -> LOG: Somber Dance on non-tank/overlap;
//   FAULT: bait controller or competing closer/farther player if known;
//   CONSEQUENCE: Major. Two hits on a protected tank are not an error.
// Not errors: four-player Waters, tank Dance and following crystal pulse.
//
// -- AKH MORN AND MORN AFAH, TWICE [D, L, N] --
// Separate bosses target their top enmity player. Light's Design and
// Darkness's Design ~4s punish cross-hits; no swapping targets/groups during
// volley. These attacks pierce invulnerability but respect mitigation.
// NAUR W default 7-1: seven center, heavily mitigated solo tank away from
// group/crystal; tanks alternate solo between sequences. Decide first tank
// in plan; MT owns Shiva, OT Gaia. Sole mitigation cannot be inferred from
// invuln button, since invuln alone does not protect these hits.
// NAUR alternate/MUR 4-4: G1 N, G2 S, one boss per tank. LPDU default G1
// under Ryne/G2 under Gaia; 7-1 is documented recovery if announced.
// Afah is eight-player stack on SHIVA's top-enmity player, NOT raidwide.
// More than 5% HP imbalance makes the targeted stack lethal; an isolated
// Shiva tank can intentionally sacrifice to save party and be raised.
// That recovery is not automatically a positioning error. Neither invuln
// nor moving away from the OTHER boss replaces HP balancing.
// Failure: wrong aggro/group -> LOG: both boss volleys on same players,
//   hits under opposite Design/death; FAULT: enmity/group controller if
//   established; CONSEQUENCE: Major/Raid. A correct solo tank is normal.
// Failure: Afah imbalance -> LOG: lethal Afah with HP gap at completion;
//   FAULT: unknown without agreed damage assignment; CONSEQUENCE: Raid if
//   whole stack lost. Intentional tank sacrifice is recoverable.
// Not errors: split volleys, mitigated solo, full stack, HP tether warning
// that is corrected before completion, scripted final crystal pulse.
//
// -- CRYSTALLIZE TIME: DEBUFFS AND DRAGON LIFECYCLE [I, N, MC] --
// Raidwide from GAIA; both untargetable. Random role assignment:
// two red Ice: 17s Wyrmclaw + 14s Blizzard;
// two red Aero: 40s Wyrmclaw + 14s Aero;
// four blue: 40s Wyrmfang plus one each Water12/Eruption14/Blizzard14/
// Unholy17. All waiting Return33; three players Quietus31 raidwides.
// Two Drachen Wanderers start north, one CW/one CCW. Red contact cleanses
// claw, creates large Longing of the Lost AoE and one-use blue beacon;
// first contact shrinks head, second destroys it. Four reds -> four beacons
// -> four blue cleanses. Head surviving full lap wipes; claw/fang deadline
// kills holder. Blue cannot take unmade/already-consumed beacon successfully.
// Red pops too near north can destroy crystal. Their large AoEs are not
// merely personal cleanses. No healer dispel substitutes for head/beacon.
// Failure: missed/wrong intercept -> LOG: persistent claw at death or head
//   lap penalty; FAULT: assigned red if living/route known; CONSEQUENCE:
//   Major and Raid if remaining mechanic/clear route becomes impossible.
// Failure: wrong/missing beacon -> LOG: persistent fang or another player's
//   cleanse at assigned spot; FAULT: taker/missing assigned blue when proven;
//   CONSEQUENCE: Major, not automatic blame if earlier red never popped.
// Removal: successful contact clears aura; expiry kills. Death removal is
// not cleanse evidence. Beacon lifetime and dead-carrier effects unverified.
// Candidate CS game status hex: CBF claw, CC0 fang, 99E waiting Blizzard,
// 99F waiting Aero, 99D waiting Water, 996 waiting Unholy, 99C Eruption.
// These are game statuses; FFLogs may use a different numeric namespace.
//
// -- CT POSITION ASSIGNMENTS AND FIRST RESOLUTIONS [CT, LC, MC, L] --
// NAUR/LPDU reds supports W, DPS E; duplicate same-role Ice/Aero flex using
// MT>OT>H1>H2 / M1>M2>R1>R2. MUR sorts each red combo with full lineup
// H1,R1,M1,MT,OT,M2,R2,H2 W->E. Two-DPS red Ice can yield different sides
// from role-first solve; both valid. Blue positions depend on debuff only.
// Six Sorrow's Hourglass: fast N/S, slow NE/SW or NW/SE, other pair normal.
// Maelstrom covers floor circle. North slow-side intercard Eruption alone;
// south slow-side intercard Water/blueIce/Unholy plus that side's Aero.
// Other Aero opposite south intercard; red Ice at E/W intercepts near its
// cardinal. First fast explosions with Water; party of four correctly
// soaks. Move toward cleared petal; Ice/Aero/Eruption resolve ~2s later.
// Party close to Aero INSIDE blue donut, gets knocked across to Eruption.
// Aero holder is not knocked. North Ice joins -> five/six Unholy; far Ice
// may dash across in LPDU variant or wait south then join north safely.
// Aeros pop second head near SE/SW after normal Maelstrom clears, then
// avoid slow circles. CT title says Early Pop; its prose distinguishes
// party-Aero moving after KB from solo-Aero waiting for second explosion.
// LPDU/MUR call their plans Fast Dragons; names alone do not establish a
// different pop timing. Actual Longing timestamps/positions are the evidence.
// Failure: wrong Aero aim/movement -> LOG: knockback wall/ice death or small
//   Unholy; FAULT: Aero controller or misplaced helper if snapshot proven;
//   CONSEQUENCE: Major/Raid. Expected travel/hits are not errors.
// Failure: wrong first elemental solve -> LOG: doubled hits under magic
//   vuln, missing stack Mark, Eruption/Longing on crystal;
//   FAULT: carrier/assigned helper if established; CONSEQUENCE: Major/Raid.
//
// -- CT TIDAL LIGHT, CLEANSES, QUIETUS AND REWINDS [CT, MC, N] --
// Tidal Light first E/W then N/S: four moving line pulses per axis, each
// ~quarter diameter wide, roughly 2s apart. Dodge into resolved strip.
// Remember BOTH origins: their intersection corner is rewind destination.
// Standard blue beacon mapping all three presets: Unholy E/B, Water SE/3,
// Eruption W/D, Ice SW/4. Near-axis beacons easy, far ones follow moving
// waves then return; valid cleanse timing varies with pattern.
// Quietus three raid pulses at ~31s; waiting Return snapshots at ~33s,
// actual Return7 expires ~40s -> 9s Stun. Spirit Taker spreads at ~37s,
// then forced return. Avoid crystal during spread; pulse+Quietus is normal.
// NAUR/LPDU/MUR corner layout G1 left/G2 right facing wall, each party at
// marker corners, tanks several steps farther wallward/near other group.
// First Hallowed Wings originates first tidal cardinal, then second axis;
// these are wild-charge knockbacks, NOT Darklit's half-room cleave.
// Damage is proximity-ranked, not split, even when someone is dead. First
// four receive 6s magic vuln; second front four must be opposite group,
// tank foremost both times. Correct snapshots determine rank while stunned.
// Failure: Tidal/Maelstrom clip -> LOG: damage/penalty/death; FAULT: mover
//   if assigned safe trajectory exists; CONSEQUENCE: Major on penalty/death.
// Failure: wrong snapshot/rank -> LOG: non-tank leading damage or double
//   front-four under magic vuln, wall death; FAULT: snapshot placer if
//   positions/source/rank establish it; CONSEQUENCE: Major/Raid.
// Not errors: intended ranked hits, knockbacks/Stun, Quietus and successful
// blue cleanses. Knockback immunity recovery can alter landing; button
// absence/presence alone cannot establish whether snapshot was wrong.
//
// -- STRATEGY OBSERVABILITY AND OPEN LOG-VERIFICATION QUESTIONS --
// Candidate C damage hex: 9D31 Longing, 9D6B Maelstrom, 9D8C rewind Wings.
// Joyless Dragonsong 9D32/33 and Memory Paradox 9D45 are unplaced candidate
// penalties; their names alone do not prove head/crystal failure semantics.
// 1. Can chained tank/healer placement and non-tether baits distinguish
//    Mami from lineup Darklit? Do adjacency endpoints exist? Some patterns
//    coincide. How are doubled DPS roles assigned by MD in successful pulls?
// 2. Do Akh Morn damage recipients establish 7-1 vs 4-4 independently each
//    volley, including announced recovery? Can Strategy label a mixed plan
//    without treating recovery as a different fight-wide regional preset?
// 3. Can CT red pair sorting, beacon recipients and Longing positions/times
//    distinguish role vs full-lineup and early/late pop? Shared blue spots
//    cannot distinguish regions. Retain unknown/compatible labels.
// 4. Verify Akh Morn counts, split/ranked damage, invuln bypass, HP gate
//    thresholds, death/removal effects, status durations, penalty names and
//    enrage identity. Does every fifth Lightsteeped produce same penalty?
// 5. Which events expose Fragment HP, extra damage, death and necklace
//    preservation? Are crystal hits attributable to bait controller or
//    only victim? Mark clear-route loss at its cause, not final bad ending.
// 6. Measure head/beacon paths, pop radii, beacon lifetime, rewind corner
//    offsets, rank snapshot, facing and forced-movement immunity behavior.
//    Confirm intentional tank sacrifice/prog reset signatures from VOD.
